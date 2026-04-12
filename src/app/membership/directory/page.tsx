"use client";

import { useEffect, useRef, useState } from "react";

import {
	ChevronDown,
	ChevronsUpDown,
	Filter,
	ListFilter,
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

type MemberRow = {
	memberId: string;
	nameWithInitials: string;
	nic: string;
	status: "ACTIVE";
	joinedDate: string;
	location: string;
};

const memberRows: MemberRow[] = [
	{
		memberId: "MB-2023001",
		nameWithInitials: "J. Doe",
		nic: "851401234V",
		status: "ACTIVE",
		joinedDate: "2015-01-01",
		location: "Colombo",
	},
	{
		memberId: "MB-2023002",
		nameWithInitials: "J. Smith",
		nic: "905581234V",
		status: "ACTIVE",
		joinedDate: "2023-10-25",
		location: "Kandy",
	},
];

type MultiSelectOption = {
	value: string;
	label: string;
};

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
				: [...selected, value]
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
									className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-[26px] text-neutral-700 hover:bg-neutral-100"
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

export default function MemberDirectoryPage() {
	const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
	const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["ACTIVE"]);
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
	const [workingLocationType, setWorkingLocationType] = useState("all-types");
	const [educationalZone, setEducationalZone] = useState("all-zones");

	const locationOptions: MultiSelectOption[] = [
		{ value: "Colombo", label: "Colombo" },
		{ value: "Kandy", label: "Kandy" },
		{ value: "Galle", label: "Galle" },
		{ value: "Matara", label: "Matara" },
		{ value: "Jaffna", label: "Jaffna" },
	];

	const statusOptions: MultiSelectOption[] = [
		{ value: "ACTIVE", label: "ACTIVE" },
		{ value: "INACTIVE", label: "INACTIVE" },
		{ value: "RESIGNED", label: "RESIGNED" },
		{ value: "TERMINATED", label: "TERMINATED" },
		{ value: "DECEASED", label: "DECEASED" },
	];

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
			<h1 className="text-3xl font-bold text-[#9d3602]">Membership Profile Search</h1>

			<Card className="rounded-xl border-neutral-300 py-0 shadow-none">
				<CardHeader className="px-5 pt-5 pb-3">
					<CardTitle className="text-[34px] font-semibold leading-none text-[#9d3602] sm:text-3xl">
						Search Criteria
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-5 px-5 pb-5">
					<div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
						<MultiSelectDropdown
							label="Location"
							options={locationOptions}
							selected={selectedLocations}
							onChange={setSelectedLocations}
							triggerText={
								selectedLocations.length === 0 ? "All Locations" : `${selectedLocations.length} Selected`
							}
						/>

						<MultiSelectDropdown
							label="Status"
							options={statusOptions}
							selected={selectedStatuses}
							onChange={setSelectedStatuses}
							triggerText={`${selectedStatuses.length} Selected`}
						/>

						<div className="space-y-1.5">
							<p className="text-xs font-semibold text-transparent select-none">Filters</p>
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

					<div className="border-t border-neutral-200 pt-5">
						{showAdvancedFilters ? (
							<>
								<div className="grid gap-3 md:grid-cols-2">
									<div className="space-y-1.5">
										<p className="text-xs font-semibold text-neutral-600">Working Location Type</p>
										<Select value={workingLocationType} onValueChange={setWorkingLocationType}>
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
										<p className="text-xs font-semibold text-neutral-600">Educational Zone</p>
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
									<div className="space-y-1.5">
										<p className="text-xs font-semibold text-neutral-600">Search</p>
										<div className="grid gap-2 md:grid-cols-[1fr_170px_36px_96px_40px]">
											<div className="relative">
												<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
												<Input
													placeholder="Search by Name, NIC, or Member ID..."
													className="h-9 border-neutral-300 bg-white pl-9"
												/>
											</div>

											<Select defaultValue="membership-date">
												<SelectTrigger className="w-full border-neutral-300 bg-white">
													<SelectValue placeholder="Membership Date" />
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
												className="h-9 w-9 border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
											>
												<ChevronsUpDown className="h-4 w-4" />
											</Button>

											<Button type="button" className="h-9 bg-[#9e3600] text-white hover:bg-[#8b2f00]">
												Retrieve
											</Button>

											<Button
												type="button"
												variant="outline"
												size="icon"
												className="h-9 w-9 border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
											>
												<Printer className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>
							</>
						) : (
							<div className="space-y-1.5">
								<p className="text-xs font-semibold text-neutral-600">Search</p>
								<div className="grid gap-2 md:grid-cols-[1fr_170px_36px_96px_40px]">
									<div className="relative">
										<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
										<Input
											placeholder="Search by Name, NIC, or Member ID..."
											className="h-9 border-neutral-300 bg-white pl-9"
										/>
									</div>

									<Select defaultValue="membership-date">
										<SelectTrigger className="w-full border-neutral-300 bg-white">
											<SelectValue placeholder="Membership Date" />
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
										className="h-9 w-9 border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
									>
										<ChevronsUpDown className="h-4 w-4" />
									</Button>

									<Button type="button" className="h-9 bg-[#9e3600] text-white hover:bg-[#8b2f00]">
										Retrieve
									</Button>

									<Button
										type="button"
										variant="outline"
										size="icon"
										className="h-9 w-9 border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100"
									>
										<Printer className="h-4 w-4" />
									</Button>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card className="overflow-hidden rounded-xl border-neutral-300 py-0 shadow-none">
				<CardContent className="px-0">
					<Table className="border-collapse">
						<TableHeader>
							<TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
								<TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
									Member ID
								</TableHead>
								<TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
									Name with Initials
								</TableHead>
								<TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
									NIC
								</TableHead>
								<TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
									Status
								</TableHead>
								<TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
									Joined Date
								</TableHead>
								<TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
									Location
								</TableHead>
								<TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
									Action
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{memberRows.map((row) => (
								<TableRow key={row.memberId} className="hover:bg-neutral-50">
									<TableCell className="px-4 py-4 font-medium text-[#9d3602]">
										{row.memberId}
									</TableCell>
									<TableCell className="px-4 py-4 text-neutral-700">{row.nameWithInitials}</TableCell>
									<TableCell className="px-4 py-4 text-neutral-700">{row.nic}</TableCell>
									<TableCell className="px-4 py-4">
										<Badge className="bg-green-600 px-2.5 py-0.5 text-[11px] font-semibold text-white hover:bg-green-600">
											{row.status}
										</Badge>
									</TableCell>
									<TableCell className="px-4 py-4 text-neutral-700">{row.joinedDate}</TableCell>
									<TableCell className="px-4 py-4 text-neutral-700">{row.location}</TableCell>
									<TableCell className="px-4 py-4">
										<Button variant="ghost" className="h-8 px-2 text-neutral-700 hover:bg-neutral-100">
											<ListFilter className="h-4 w-4" />
											View
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
