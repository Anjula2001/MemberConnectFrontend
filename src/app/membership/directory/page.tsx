"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
	ChevronsUpDown,
	Filter,
	ListFilter,
	Loader2,
	Printer,
	Search,
	SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/src/components/ui/table";

import { type MemberDTO, type MemberStatus, searchMembers } from "@/lib/api/member";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_BADGE_CLASSES: Record<string, string> = {
	ACTIVE: "bg-green-600 hover:bg-green-600 text-white",
	INACTIVE: "bg-gray-500 hover:bg-gray-500 text-white",
	RESIGNED: "bg-yellow-600 hover:bg-yellow-600 text-white",
	TERMINATED: "bg-red-600 hover:bg-red-600 text-white",
	DECEASED: "bg-neutral-700 hover:bg-neutral-700 text-white",
};

function statusBadgeClass(status?: string) {
	return STATUS_BADGE_CLASSES[status ?? ""] ?? "bg-gray-400 hover:bg-gray-400 text-white";
}

// ---------------------------------------------------------------------------
// MultiSelectDropdown
// ---------------------------------------------------------------------------

type MultiSelectOption = { value: string; label: string };

function MultiSelectDropdown({
	label,
	options,
	selected,
	onChange,
	triggerText,
}: {
	label: string;
	options: MultiSelectOption[];
	selected: string[];
	onChange: (next: string[]) => void;
	triggerText: string;
}) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onOutsideClick = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onOutsideClick);
		return () => document.removeEventListener("mousedown", onOutsideClick);
	}, []);

	const toggleOption = (value: string) => {
		onChange(
			selected.includes(value)
				? selected.filter((item) => item !== value)
				: [...selected, value],
		);
	};

	return (
		<div className="space-y-1.5" ref={containerRef}>
			<p className="text-xs font-semibold text-neutral-600">{label}</p>
			<div className="relative">
				<button
					type="button"
					onClick={() => setOpen((prev) => !prev)}
					className="flex h-9 w-full items-center justify-between rounded-md border border-neutral-300 bg-white px-3 text-left text-[26px] text-neutral-700 shadow-xs outline-none transition-[color,box-shadow] hover:bg-neutral-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
				>
					<span className="text-sm">{triggerText}</span>
					<Filter className="h-4 w-4 text-neutral-400" />
				</button>

				{open ? (
					<div className="absolute top-full left-0 z-50 mt-1 w-[230px] rounded-md border border-neutral-300 bg-white p-2 shadow-md">
						<div className="space-y-1">
							{options.map((option) => (
								<label
									key={option.value}
									className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-neutral-700 hover:bg-neutral-100"
								>
									<Checkbox
										checked={selected.includes(option.value)}
										onCheckedChange={() => toggleOption(option.value)}
										className="h-4 w-4 border-[#c6581f] data-[state=checked]:border-[#9e3600] data-[state=checked]:bg-[#9e3600]"
									/>
									<span className="text-sm">{option.label}</span>
								</label>
							))}
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MemberDirectoryPage() {
	// ---- filter state ----
	const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
	const [workingLocationType, setWorkingLocationType] = useState("all-types");
	const [educationalZone, setEducationalZone] = useState("all-zones");
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("membership-date");

	// ---- data state ----
	const [members, setMembers] = useState<MemberDTO[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasFetched, setHasFetched] = useState(false);

	// ---------------------------------------------------------------------------
	// Fetch helpers
	// ---------------------------------------------------------------------------

	const fetchMembers = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await searchMembers({
				query: searchQuery || undefined,
				statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
				locations: selectedLocations.length > 0 ? selectedLocations : undefined,
				workingLocationType:
					workingLocationType !== "all-types" ? workingLocationType : undefined,
				educationalZone:
					educationalZone !== "all-zones" ? educationalZone : undefined,
			});

			// Client-side sort
			const sorted = [...data].sort((a, b) => {
				if (sortBy === "membership-date") {
					return (
						(a.membershipStartDate ?? "").localeCompare(b.membershipStartDate ?? "")
					);
				}
				if (sortBy === "memberID") {
					return (a.memberId ?? "").localeCompare(b.memberId ?? "");
				}
				if (sortBy === "status") {
					return (a.status ?? "").localeCompare(b.status ?? "");
				}
				return 0;
			});

			setMembers(sorted);
			setHasFetched(true);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to fetch members.");
		} finally {
			setLoading(false);
		}
	}, [searchQuery, selectedStatuses, selectedLocations, workingLocationType, educationalZone, sortBy]);

	// Fetch automatically on first render so the table isn't empty
	useEffect(() => {
		fetchMembers();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// ---------------------------------------------------------------------------
	// Options
	// ---------------------------------------------------------------------------

	const locationOptions: MultiSelectOption[] = [
		{ value: "Colombo", label: "Colombo" },
		{ value: "Kandy", label: "Kandy" },
		{ value: "Galle", label: "Galle" },
		{ value: "Matara", label: "Matara" },
		{ value: "Jaffna", label: "Jaffna" },
	];

	const statusOptions: MultiSelectOption[] = [
		{ value: "ACTIVE", label: "Active" },
		{ value: "INACTIVE", label: "Inactive" },
		{ value: "RESIGNED", label: "Resigned" },
		{ value: "TERMINATED", label: "Terminated" },
		{ value: "DECEASED", label: "Deceased" },
	];

	// ---------------------------------------------------------------------------
	// Render helpers
	// ---------------------------------------------------------------------------

	function renderSearchBar(withAdvanced: boolean) {
		return (
			<div className="space-y-1.5">
				<p className="text-xs font-semibold text-neutral-600">Search</p>
				<div className="grid gap-2 md:grid-cols-[1fr_170px_36px_96px_40px]">
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
						<Input
							id="member-search-input"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && fetchMembers()}
							placeholder="Search by Name, NIC, or Member ID..."
							className="h-9 border-neutral-300 bg-white pl-9"
						/>
					</div>

					<Select value={sortBy} onValueChange={setSortBy}>
						<SelectTrigger className="w-full border-neutral-300 bg-white">
							<SelectValue placeholder="Sort By" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="membership-date">Membership Date</SelectItem>
							<SelectItem value="memberID">Member ID</SelectItem>
							<SelectItem value="status">Status</SelectItem>
							<SelectItem value="district">District</SelectItem>
						</SelectContent>
					</Select>

					<Button
						type="button"
						variant="outline"
						size="icon"
						title="Toggle sort direction"
						className="h-9 w-9 border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
					>
						<ChevronsUpDown className="h-4 w-4" />
					</Button>

					<Button
						id="retrieve-members-btn"
						type="button"
						onClick={fetchMembers}
						disabled={loading}
						className="h-9 bg-[#9e3600] text-white hover:bg-[#8b2f00] disabled:opacity-60"
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"Retrieve"
						)}
					</Button>

					<Button
						type="button"
						variant="outline"
						size="icon"
						title="Print"
						className="h-9 w-9 border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
					>
						<Printer className="h-4 w-4" />
					</Button>
				</div>
			</div>
		);
	}

	// ---------------------------------------------------------------------------
	// JSX
	// ---------------------------------------------------------------------------

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
			<h1 className="text-3xl font-bold text-[#9d3602]">Membership Profile Search</h1>

			{/* ── Search Criteria Card ── */}
			<Card className="rounded-xl border-neutral-300 py-0 shadow-none">
				<CardHeader className="px-5 pt-5 pb-3">
					<CardTitle className="text-[34px] font-semibold leading-none text-[#9d3602] sm:text-3xl">
						Search Criteria
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-5 px-5 pb-5">
					{/* Top filters row */}
					<div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
						<MultiSelectDropdown
							label="Location"
							options={locationOptions}
							selected={selectedLocations}
							onChange={setSelectedLocations}
							triggerText={
								selectedLocations.length === 0
									? "All Locations"
									: `${selectedLocations.length} Selected`
							}
						/>

						<MultiSelectDropdown
							label="Status"
							options={statusOptions}
							selected={selectedStatuses}
							onChange={setSelectedStatuses}
							triggerText={
								selectedStatuses.length === 0
									? "All Statuses"
									: `${selectedStatuses.length} Selected`
							}
						/>

						<div className="space-y-1.5">
							<p className="select-none text-xs font-semibold text-transparent">
								Filters
							</p>
							<Button
								type="button"
								variant="outline"
								onClick={() => setShowAdvancedFilters((prev) => !prev)}
								className="h-9 w-full border-dashed border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 md:min-w-[230px]"
							>
								<SlidersHorizontal className="h-4 w-4" />
								{showAdvancedFilters ? "Hide Advanced Filters" : "Show Advanced Filters"}
							</Button>
						</div>
					</div>

					{/* Divider + search / advanced filters */}
					<div className="border-t border-neutral-200 pt-5">
						{showAdvancedFilters ? (
							<>
								<div className="grid gap-3 md:grid-cols-2">
									<div className="space-y-1.5">
										<p className="text-xs font-semibold text-neutral-600">
											Working Location Type
										</p>
										<Select
											value={workingLocationType}
											onValueChange={setWorkingLocationType}
										>
											<SelectTrigger className="w-full border-neutral-300 bg-white">
												<SelectValue placeholder="All Types" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all-types">All Types</SelectItem>
												<SelectItem value="school">School</SelectItem>
												<SelectItem value="office">Office</SelectItem>
												<SelectItem value="university">University</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-1.5">
										<p className="text-xs font-semibold text-neutral-600">
											Educational Zone
										</p>
										<Select value={educationalZone} onValueChange={setEducationalZone}>
											<SelectTrigger className="w-full border-neutral-300 bg-white">
												<SelectValue placeholder="All Zones" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all-zones">All Zones</SelectItem>
												<SelectItem value="colombo-zone">Colombo Zone</SelectItem>
												<SelectItem value="kandy-zone">Kandy Zone</SelectItem>
												<SelectItem value="galle-zone">Galle Zone</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>

								<div className="mt-5 border-t border-neutral-200 pt-5">
									{renderSearchBar(true)}
								</div>
							</>
						) : (
							renderSearchBar(false)
						)}
					</div>
				</CardContent>
			</Card>

			{/* ── Results Table Card ── */}
			<Card className="overflow-hidden rounded-xl border-neutral-300 py-0 shadow-none">
				<CardContent className="px-0">
					<Table className="border-collapse">
						<TableHeader>
							<TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
								{["Member ID", "Name with Initials", "NIC", "Joined Date", "Location", "Status"].map(
									(h) => (
										<TableHead
											key={h}
											className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase"
										>
											{h}
										</TableHead>
									),
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={6} className="py-12 text-center">
										<div className="flex items-center justify-center gap-2 text-neutral-500">
											<Loader2 className="h-5 w-5 animate-spin" />
											<span>Loading members…</span>
										</div>
									</TableCell>
								</TableRow>
							) : error ? (
								<TableRow>
									<TableCell colSpan={6} className="py-10 text-center text-red-600">
										{error}
									</TableCell>
								</TableRow>
							) : !hasFetched || members.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="py-10 text-center text-neutral-500">
										{hasFetched
											? "No members found matching your search criteria."
											: "Click Retrieve to load members."}
									</TableCell>
								</TableRow>
							) : (
								members.map((member) => (
									<TableRow
										key={member.id ?? member.memberId}
										className="hover:bg-neutral-50"
									>
										<TableCell className="px-4 py-4 font-medium">
											{member.memberId || member.id ? (
												<Link 
													href={`/membership/directory/${member.id}`}
													className="text-[#9d3602] hover:underline"
												>
													{member.memberId ?? "—"}
												</Link>
											) : (
												<span className="text-neutral-500">—</span>
											)}
										</TableCell>
										<TableCell className="px-4 py-4 text-neutral-700">
											{member.nameWithInitials ?? member.fullName ?? "—"}
										</TableCell>
										<TableCell className="px-4 py-4 text-neutral-700">
											{member.nic ?? member.nicNumber ?? "—"}
										</TableCell>
										<TableCell className="px-4 py-4 text-neutral-700">
											{member.membershipStartDate ?? "—"}
										</TableCell>
										<TableCell className="px-4 py-4 text-neutral-700">
											{member.workingLocation ?? member.educationalDistrict ?? "—"}
										</TableCell>
										<TableCell className="px-4 py-4">
											<Badge
												className={`px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeClass(member.status)}`}
											>
												{member.status ?? "—"}
											</Badge>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>

					{/* Result count footer */}
					{hasFetched && !loading && !error && (
						<div className="border-t border-neutral-200 px-4 py-2 text-xs text-neutral-500">
							{members.length} member{members.length !== 1 ? "s" : ""} found
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
