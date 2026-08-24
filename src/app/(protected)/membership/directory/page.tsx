"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import {
	ArrowDownWideNarrow,
	ArrowUpNarrowWide,
	Filter,
	ListFilter,
	Loader2,
	Lock,
	Printer,
	Search,
	SlidersHorizontal,
} from "lucide-react";

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
import {
	TablePagination,
	clampPage,
	pageSlice,
} from "@/src/components/ui/table-pagination";

import { type MemberDTO, type MemberStatus, searchMembers } from "@/lib/api/member";
import { StatusBadge } from "@/src/components/ui/status-badge";
import {
	getEducationalDistricts,
	getEducationalZonesByDistrict,
} from "@/lib/api/education";
import { getWorkingLocationTypes } from "@/lib/api/masters";
import { useAuth } from "@/lib/auth-context";

/**
 * Every value of the backend MemberStatus enum, with a readable label.
 *
 * The filter previously offered five of the fifteen. The ten it omitted were not
 * unused states - a third of the membership sat in them (dormant, termination and
 * retirement requests, recorded deaths), and those members could not be filtered
 * for at all. Anything the server can store has to be selectable here, so this list
 * is kept exhaustive rather than curated.
 */
const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
	ACTIVE: "Active",
	INACTIVE: "Inactive",
	RESIGNED: "Resigned",
	TERMINATION_REQUESTED: "Termination Requested",
	TERMINATION_APPROVED: "Termination Approved",
	TERMINATED: "Terminated",
	RETIREMENT_REQUESTED: "Retirement Requested",
	RETIREMENT_APPROVED: "Retirement Approved",
	RETIRED: "Retired",
	MEMBER_DEATH_RECORDED: "Death Recorded",
	MEMBER_DEATH_APPROVED: "Death Approved",
	DECEASED: "Deceased",
	SELECTED_FOR_DORMANT: "Selected for Dormant",
	SENT_FOR_DORMANT_APPROVAL: "Sent for Dormant Approval",
	INACTIVE_DORMANT: "Inactive (Dormant)",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
	const { user } = useAuth();
	const isDistrictOfficer = user?.role === "DISTRICT_OFFICE";

	// ---- filter state ----
	const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
	const [workingLocationType, setWorkingLocationType] = useState("all-types");
	const [educationalZone, setEducationalZone] = useState("all-zones");
	const [educationalDistrict, setEducationalDistrict] = useState("all-districts");
	const [membershipStartFrom, setMembershipStartFrom] = useState("");
	const [membershipStartTo, setMembershipStartTo] = useState("");
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("membership-date");
	const [sortAsc, setSortAsc] = useState(true);
	const [districtOptions, setDistrictOptions] = useState<string[]>([]);
	const [zoneOptions, setZoneOptions] = useState<string[]>([]);
	const [workingLocationTypeOptions, setWorkingLocationTypeOptions] = useState<string[]>([]);

	// Load the real District Office location master (replaces a hardcoded sample list),
	// and lock District Office users to their own assigned district — they shouldn't be
	// able to browse other branches' membership profiles.
	useEffect(() => {
		let isCancelled = false;
		getEducationalDistricts()
			.then((districts) => {
				if (isCancelled) return;
				setDistrictOptions(districts);
			})
			.catch(() => {
				/* leave empty on failure — filter simply shows no options */
			});
		return () => {
			isCancelled = true;
		};
	}, []);

	// The real Working Location Type master. These were hard-coded as
	// "School / Office / University"; the master actually holds "Government School",
	// "National School", "Zonal Education Office" and so on, and the server matches
	// the stored name, so none of the three ever selected a member.
	useEffect(() => {
		let isCancelled = false;
		getWorkingLocationTypes()
			.then((types) => {
				if (isCancelled) return;
				setWorkingLocationTypeOptions(types.map((t) => t.name));
			})
			.catch(() => {
				/* leave empty on failure - filter simply shows no options */
			});
		return () => {
			isCancelled = true;
		};
	}, []);

	// Zones belong to a district in the master, so the zone list follows the chosen
	// Educational District - the same cascade the registration form uses. The old
	// list was three invented slugs ("colombo-zone"), which matched nothing.
	useEffect(() => {
		if (educationalDistrict === "all-districts") {
			setZoneOptions([]);
			return;
		}
		let isCancelled = false;
		getEducationalZonesByDistrict(educationalDistrict)
			.then((zones) => {
				if (isCancelled) return;
				setZoneOptions(zones);
			})
			.catch(() => {
				if (!isCancelled) setZoneOptions([]);
			});
		return () => {
			isCancelled = true;
		};
	}, [educationalDistrict]);

	useEffect(() => {
		if (isDistrictOfficer && user?.assignedDistrict) {
			setSelectedLocations([user.assignedDistrict]);
		}
	}, [isDistrictOfficer, user?.assignedDistrict]);

	// ---- data state ----
	const [members, setMembers] = useState<MemberDTO[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasFetched, setHasFetched] = useState(false);
	const [page, setPage] = useState(1);

	// ---------------------------------------------------------------------------
	// Fetch helpers
	// ---------------------------------------------------------------------------

	// Carries the current filters into the report so the printed output matches the
	// screen exactly (spec 5.4), and stays shareable rather than relying on state.
	const buildReportUrl = () => {
		const p = new URLSearchParams();
		if (searchQuery) p.set("query", searchQuery);
		selectedStatuses.forEach((v) => p.append("statuses", v));
		selectedLocations.forEach((v) => p.append("locations", v));
		if (workingLocationType !== "all-types") p.set("workingLocationType", workingLocationType);
		if (educationalZone !== "all-zones") p.set("educationalZone", educationalZone);
		if (educationalDistrict !== "all-districts") p.set("educationalDistrict", educationalDistrict);
		if (membershipStartFrom) p.set("membershipStartFrom", membershipStartFrom);
		if (membershipStartTo) p.set("membershipStartTo", membershipStartTo);
		p.set("sortBy", sortBy);
		p.set("sortDirection", sortAsc ? "asc" : "desc");
		return `/membership/directory/report?${p.toString()}`;
	};

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
				educationalDistrict:
					educationalDistrict !== "all-districts" ? educationalDistrict : undefined,
				membershipStartFrom: membershipStartFrom || undefined,
				membershipStartTo: membershipStartTo || undefined,
			});

			// Client-side sort, honouring the ascending/descending toggle.
			const sorted = [...data].sort((a, b) => {
				let cmp = 0;
				if (sortBy === "membership-date") {
					cmp = (a.membershipStartDate ?? "").localeCompare(b.membershipStartDate ?? "");
				} else if (sortBy === "memberID") {
					cmp = (a.memberId ?? "").localeCompare(b.memberId ?? "");
				} else if (sortBy === "status") {
					cmp = (a.status ?? "").localeCompare(b.status ?? "");
				}
				return sortAsc ? cmp : -cmp;
			});

			setMembers(sorted);
			setPage(1);
			setHasFetched(true);
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Failed to fetch members.");
		} finally {
			setLoading(false);
		}
	}, [searchQuery, selectedStatuses, selectedLocations, workingLocationType, educationalZone,
		educationalDistrict, membershipStartFrom, membershipStartTo, sortBy, sortAsc]);

	// Deliberately no fetch on mount. Opening the Directory shows the filters and an
	// empty table until the user clicks Retrieve — the same pattern the other list
	// screens follow, and what the "Click Retrieve to load members." empty state below
	// has always described. Auto-loading also meant every visit pulled the full
	// membership before the user had chosen any filter.

	// ---------------------------------------------------------------------------
	// Paging
	// ---------------------------------------------------------------------------

	const safePage = clampPage(page, members.length);
	const pagedMembers = useMemo(() => pageSlice(members, page), [members, page]);

	// ---------------------------------------------------------------------------
	// Options
	// ---------------------------------------------------------------------------

	const locationOptions: MultiSelectOption[] = districtOptions.map((district) => ({
		value: district,
		label: district,
	}));

	const statusOptions: MultiSelectOption[] = (
		Object.keys(MEMBER_STATUS_LABELS) as MemberStatus[]
	).map((value) => ({ value, label: MEMBER_STATUS_LABELS[value] }));

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
						title={sortAsc ? "Sorted ascending — click for descending" : "Sorted descending — click for ascending"}
						aria-label="Toggle sort direction"
						onClick={() => setSortAsc((prev) => !prev)}
						className="h-9 w-9 border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
					>
						{sortAsc ? <ArrowUpNarrowWide className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
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
						title="Print the retrieved membership records"
						onClick={() => window.open(buildReportUrl(), "_blank")}
						disabled={members.length === 0}
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
						{isDistrictOfficer ? (
							<div className="space-y-1.5">
								<p className="text-xs font-semibold text-neutral-600 flex items-center justify-between">
									<span>Location</span>
									<span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
										<Lock size={10} /> Locked to Branch
									</span>
								</p>
								<div className="flex h-9 w-full items-center justify-between rounded-md border border-neutral-300 bg-neutral-100 px-3 text-sm text-neutral-800 cursor-not-allowed">
									<span className="font-semibold">{user?.assignedDistrict}</span>
									<Lock size={13} className="text-neutral-400" />
								</div>
							</div>
						) : (
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
						)}

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
												{workingLocationTypeOptions.map((type) => (
													<SelectItem key={type} value={type}>
														{type}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-1.5">
										<p className="text-xs font-semibold text-neutral-600">
											Educational Zone
										</p>
										<Select
											value={educationalZone}
											onValueChange={setEducationalZone}
											disabled={educationalDistrict === "all-districts"}
										>
											<SelectTrigger className="w-full border-neutral-300 bg-white">
												<SelectValue
													placeholder={
														educationalDistrict === "all-districts"
															? "Select a district first"
															: "All Zones"
													}
												/>
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all-zones">All Zones</SelectItem>
												{zoneOptions.map((zone) => (
													<SelectItem key={zone} value={zone}>
														{zone}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									{/* Educational District — the member's WORKING district, distinct
									    from the Location filter above (the District Office branch). */}
									<div className="space-y-1.5">
										<p className="text-xs font-semibold text-neutral-600">
											Educational District
										</p>
										<Select
											value={educationalDistrict}
											onValueChange={(next) => {
												setEducationalDistrict(next);
												// The selected zone belongs to the district being replaced, so
												// keeping it would filter on a zone the new district does not have.
												setEducationalZone("all-zones");
											}}
										>
											<SelectTrigger className="w-full border-neutral-300 bg-white">
												<SelectValue placeholder="All Districts" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all-districts">All Districts</SelectItem>
												{districtOptions.map((d) => (
													<SelectItem key={d} value={d}>
														{d}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-1.5">
										<p className="text-xs font-semibold text-neutral-600">
											Membership Start Date Period
										</p>
										<div className="grid grid-cols-2 gap-2">
											<Input
												type="date"
												value={membershipStartFrom}
												max={membershipStartTo || undefined}
												onChange={(e) => setMembershipStartFrom(e.target.value)}
												className="h-9 border-neutral-300 bg-white"
												aria-label="Membership start date from"
											/>
											<Input
												type="date"
												value={membershipStartTo}
												min={membershipStartFrom || undefined}
												onChange={(e) => setMembershipStartTo(e.target.value)}
												className="h-9 border-neutral-300 bg-white"
												aria-label="Membership start date to"
											/>
										</div>
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
								pagedMembers.map((member) => (
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
											<StatusBadge status={member.status} vocabulary="member" />
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>

					{/* Result count + paging footer */}
					{hasFetched && !loading && !error && (
						<TablePagination
							page={safePage}
							total={members.length}
							onPageChange={setPage}
						/>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
