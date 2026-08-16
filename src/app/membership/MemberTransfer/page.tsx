"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, } from "@/src/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/src/components/ui/select";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Search, RotateCcw, ArrowUp, ChevronDown, Clock, Info } from "lucide-react";

type RequestRow = {
    id: number;
    requestId?: string;
    status?: string;
    requestedDate?: string;
    member?: any;
    memberName?: string;
    memberId?: string;
    nic?: string;
    newWorkingLocation?: any;
    newEducationalDistrict?: any;
    newEducationalZone?: any;
    newWorkingLocationType?: any;
    newWorkingLocationAddress?: string;
    newSalaryPayingOffice?: string;
    newComputerNoInPayslip?: string;
    newDesignation?: any;
    newNatureOfOccupation?: any;
};

export default function Page() {
    const [requests, setRequests] = useState<RequestRow[]>([]);
    const [displayed, setDisplayed] = useState<RequestRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(["submittedforapproval"]);
    const [requestType, setRequestType] = useState("membertransfers");
    const [applicationReceivedOn, setApplicationReceivedOn] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [dateError, setDateError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("requested-date");
    const [sortAsc, setSortAsc] = useState(true);
    const [hasRetrieved, setHasRetrieved] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Navigation views (no modals needed)

    // Convert a date string in YYYY-MM-DD format to a Date object 
    const parseYMD = (input?: string | null) => {
        if (!input) return null;
        const s = String(input);
        const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        const dt = new Date(y, mo, d);
        dt.setHours(0, 0, 0, 0);
        return dt;
    };

    const locationOptions = [
        { value: "colombo", label: "Colombo" },
        { value: "kandy", label: "Kandy" },
        { value: "galle", label: "Galle" },
        { value: "matara", label: "Matara" },
        { value: "jaffna", label: "Jaffna" },
        { value: "kilinochchi", label: "Kilinochchi" },
        { value: "mannar", label: "Mannar" },
        { value: "mullaitivu", label: "Mullaitivu" },
        { value: "vavuniya", label: "Vavuniya" },
        { value: "puttalam", label: "Puttalam" },
        { value: "kurunagala", label: "Kurunagala" },
        { value: "kaluthara", label: "Kaluthara" },
        { value: "Gampaha", label: "Gampaha" },
        { value: "anuradhapura", label: "Anuradhapura" },
        { value: "polonnaruwa", label: "Polonnaruwa" },
        { value: "mathale", label: "Mathale" },
        { value: "nuwaraeliya", label: "Nuwara Eliya" },
        { value: "kegalla", label: "Kegalla" },
        { value: "rathnapura", label: "Rathnapura" },
        { value: "Trincomalee", label: "Trincomalee" },
        { value: "batticaloa", label: "Batticaloa" },
        { value: "ampara", label: "Ampara" },
        { value: "badulla", label: "Badulla" },
        { value: "monaragala", label: "Monaragala" },
        { value: "hambantota", label: "Hambantota" }
    ];

    const typeOptions = [
        { value: "basicprofilechanges", label: "Basic Profile Changes" },
        { value: "namechanges", label: "Name Changes" },
        { value: "remittanceamountchanges", label: "Remittance Amount Changes" },
        { value: "nomineechanges", label: "Nominee Changes" },
        { value: "membertransfers", label: "Member Transfers" }
    ];

    const getStatusOptionsForType = (type: string) => {
        if (type === "membertransfers") {
            return [
                { value: "submittedforapproval", label: "Submitted for Approval" },
                { value: "rejected", label: "Rejected" },
                { value: "approved", label: "Approved" },
                { value: "inactive", label: "Inactive" },
            ];
        } else {
            return [
                { value: "submittedforapproval", label: "Submitted for Approval" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
            ];
        }
    };

    const statusOptions = getStatusOptionsForType(requestType);

    const getStatusColor = (status?: string) => {
        if (!status) return "bg-yellow-100 border-yellow-200 text-yellow-500";
        const statusLower = status.toLowerCase().replace(/[\s_]+/g, "");
        if (statusLower === "submittedforapproval" || statusLower === "submitted") {
            return "bg-amber-100 border-amber-200 text-amber-600";
        } else if (statusLower === "approved") {
            return "bg-green-100 border-green-200 text-green-500";
        } else if (statusLower === "rejected") {
            return "bg-red-100 border-red-200 text-red-500";
        } else if (statusLower === "inactive") {
            return "bg-slate-100 border-slate-200 text-slate-500";
        } else {
            return "bg-yellow-100 border-yellow-200 text-yellow-500";
        }
    };

    const formatStatusLabel = (status?: string) => {
        if (!status) return "";
        const statusUpper = status.toUpperCase().replace(/[\s_]+/g, "");
        switch (statusUpper) {
            case "SUBMITTEDFORAPPROVAL":
            case "SUBMITTED":
                return "Submitted for Approval";
            case "APPROVED":
                return "Approved";
            case "REJECTED":
                return "Rejected";
            case "INACTIVE":
                return "Inactive";
            default:
                return status.replace(/_/g, " ");
        }
    };

    // Real-time filtering as user changes filters
    useEffect(() => {
        if (requests.length === 0) return;

        let filtered = [...requests];

        // Filter by type
        if (requestType !== "membertransfers") {
            filtered = [];
        } else {
            // Filter by location (District name or member current/new educational district)
            if (selectedLocations.length > 0) {
                filtered = filtered.filter((r) => {
                    const districtName = (r.newEducationalDistrict?.name || "").toLowerCase().trim();
                    const memberDistrict = (r.member?.educationalDistrict || "").toLowerCase().trim();
                    return selectedLocations.some(loc =>
                        districtName === loc.toLowerCase().trim() ||
                        memberDistrict === loc.toLowerCase().trim()
                    );
                });
            }

            // Filter by status
            if (selectedStatuses.length > 0) {
                filtered = filtered.filter((r) => {
                    if (!r.status) return false;
                    const normalizedStatus = r.status.toLowerCase().replace(/[\s_]+/g, "");
                    return selectedStatuses.includes(normalizedStatus);
                });
            }

            // Filter by request received date
            if (applicationReceivedOn !== "all") {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                filtered = filtered.filter((r) => {
                    if (!r.requestedDate) return false;
                    const rDate = parseYMD(r.requestedDate);
                    if (!rDate) return false;

                    if (applicationReceivedOn === "thisMonth") {
                        return rDate.getMonth() === today.getMonth() && rDate.getFullYear() === today.getFullYear();
                    } else if (applicationReceivedOn === "thisAndLastMonth") {
                        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        lastMonth.setHours(0, 0, 0, 0);
                        return rDate >= lastMonth && rDate <= today;
                    } else if (applicationReceivedOn === "datePeriod") {
                        if (fromDate && toDate) {
                            const start = parseYMD(fromDate);
                            const end = parseYMD(toDate);
                            if (!start || !end) return false;
                            return rDate >= start && rDate <= end;
                        }
                        return true;
                    }
                    return true;
                });
            }

            // Filter by search query (searches Member Full name, payroll name, initials, Member ID, NIC)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                filtered = filtered.filter((r) => {
                    const member = r.member || {};
                    const fullName = (member.fullName || "").toLowerCase();
                    const nameAsInPayroll = (member.nameAsInPayroll || "").toLowerCase();
                    const nameWithInitials = (member.nameWithInitials || "").toLowerCase();
                    const memberId = (member.memberId || "").toLowerCase();
                    const nic = (r.nic || "").toLowerCase();

                    return (
                        fullName.includes(q) ||
                        nameAsInPayroll.includes(q) ||
                        nameWithInitials.includes(q) ||
                        memberId.includes(q) ||
                        nic.includes(q)
                    );
                });
            }
        }

        // Sort
        filtered.sort((a, b) => {
            let cmp = 0;
            if (sortBy === "member-id") {
                cmp = (a.memberId || "").localeCompare(b.memberId || "");
            } else if (sortBy === "status") {
                cmp = (a.status || "").localeCompare(b.status || "");
            } else {
                // "requested-date"
                cmp = (a.requestedDate || "").localeCompare(b.requestedDate || "");
            }
            return sortAsc ? cmp : -cmp;
        });

        setDisplayed(filtered);
    }, [requests, selectedLocations, selectedStatuses, applicationReceivedOn, fromDate, toDate, searchQuery, sortBy, sortAsc, requestType]);

    // MultiSelect component for location and status filters (matches exactly)
    function MultiSelect({
        options,
        selected,
        onChange,
        placeholder = "Select...",
    }: {
        options: { value: string; label: string }[];
        selected: string[];
        onChange: (values: string[]) => void;
        placeholder?: string;
    }) {
        const [open, setOpen] = useState(false);
        const ref = useRef<HTMLDivElement>(null);

        useEffect(() => {
            function handleClickOutside(e: MouseEvent) {
                if (ref.current && !ref.current.contains(e.target as Node)) {
                    setOpen(false);
                }
            }
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }, []);

        const toggle = (value: string) => {
            onChange(
                selected.includes(value)
                    ? selected.filter((v) => v !== value)
                    : [...selected, value]
            );
        };

        const label =
            selected.length === 0
                ? placeholder
                : selected.length === options.length
                    ? "All Selected"
                    : `${selected.length} Selected`;

        return (
            <div ref={ref} className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="border-input flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                    <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
                        {label}
                    </span>
                    <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                </button>

                {open && (
                    <div className="absolute z-50 mt-1 w-full min-w-[8rem] rounded-md border border-border bg-popover shadow-md">
                        <div className="p-1 flex flex-col gap-0.5 max-h-60 overflow-y-auto">
                            {options.map((opt) => (
                                <label
                                    key={opt.value}
                                    className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground select-none"
                                >
                                    <Checkbox
                                        checked={selected.includes(opt.value)}
                                        onCheckedChange={() => toggle(opt.value)}
                                        className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Validate date inputs
    const validateDates = () => {
        setDateError("");

        if (applicationReceivedOn === "datePeriod") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (!fromDate || !toDate) {
                setDateError("Both From Date and To Date are required.");
                return false;
            }

            const [startYear, startMonth, startDay] = fromDate.split('-').map(Number);
            const [endYear, endMonth, endDay] = toDate.split('-').map(Number);
            const start = new Date(startYear, startMonth - 1, startDay);
            const end = new Date(endYear, endMonth - 1, endDay);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            if (start > today) {
                setDateError("From Date must be a past date.");
                return false;
            }

            if (end > today) {
                setDateError("To Date must be a past date.");
                return false;
            }

            if (start >= end) {
                setDateError("From Date must be before To Date.");
                return false;
            }
        }

        return true;
    };

    const handleFromDateChange = (value: string) => {
        setFromDate(value);
        setDateError("");
    };

    const handleToDateChange = (value: string) => {
        setToDate(value);
        setDateError("");
    };

    const handleRetrieve = async () => {
        if (!validateDates()) {
            return;
        }
        try {
            setIsLoading(true);
            setApiError(null);

            const res = await fetch("http://localhost:8080/api/member-transfers");

            if (!res.ok) {
                throw new Error(`Server responded with status ${res.status}`);
            }

            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                const mapped: RequestRow[] = data.map((item: any) => ({
                    id: item.id,
                    requestId: item.requestId || `MTR-${item.id.toString().padStart(3, '0')}`,
                    status: item.status || "SUBMITTEDFORAPPROVAL",
                    requestedDate: item.requestedDate || "",
                    member: item.member,
                    memberName: item.member?.nameWithInitials || item.member?.fullName || "N/A",
                    memberId: item.member?.memberId || "N/A",
                    nic: item.member?.nic || "N/A",
                    newWorkingLocation: item.newWorkingLocation,
                    newEducationalDistrict: item.newEducationalDistrict,
                    newEducationalZone: item.newEducationalZone,
                    newWorkingLocationType: item.newWorkingLocationType,
                    newWorkingLocationAddress: item.newWorkingLocationAddress,
                    newSalaryPayingOffice: item.newSalaryPayingOffice,
                    newComputerNoInPayslip: item.newComputerNoInPayslip,
                    newDesignation: item.newDesignation,
                    newNatureOfOccupation: item.newNatureOfOccupation
                }));
                setRequests(mapped);
            } else {
                setRequests([]);
            }
            setHasRetrieved(true);
        } catch (error: any) {
            console.error("Failed to retrieve requests:", error);
            setRequests([]);
            setApiError(error?.message || "Failed to connect to the server. Please try again.");
            setHasRetrieved(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTypeChange = (value: string) => {
        setRequestType(value);
        if (value === "membertransfers") {
            setSelectedStatuses(["submittedforapproval"]);
        } else {
            setSelectedStatuses(["submittedforapproval"]);
        }
        setHasRetrieved(false); // Reset list view to prompt Retrieve click
    };

    return (
        <div className="p-6">
            {/* Header section matching style exactly */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-[#953002]">
                    All Member Profile Change Requests List
                </h1>

                <div className="flex gap-2">
                    <Link href="/membership/directory">
                        <Button className="bg-[#7a2700] text-white hover:bg-[#953002]">
                            Back to Directory
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="px-6">
                {/* Search Criteria Card */}
                <Card className="rounded-xl shadow-sm py-0 mb-4">
                    <CardHeader className="px-5 pt-5 pb-3">
                        <CardTitle className="text-base text-[#953002]">Search Criteria</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-600">Location (District)</label>
                                <MultiSelect
                                    options={locationOptions}
                                    selected={selectedLocations}
                                    onChange={setSelectedLocations}
                                    placeholder="Select Locations"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-600">Type</label>
                                <Select value={requestType} onValueChange={handleTypeChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Member Transfers" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {typeOptions.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-600">Request Received On</label>
                                <Select value={applicationReceivedOn} onValueChange={(value) => { setApplicationReceivedOn(value); setDateError(""); }}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="All Days" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Days</SelectItem>
                                        <SelectItem value="thisMonth">This Month</SelectItem>
                                        <SelectItem value="thisAndLastMonth">This and Last Month</SelectItem>
                                        <SelectItem value="datePeriod">Date Period</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-600">Status</label>
                                <MultiSelect
                                    options={statusOptions}
                                    selected={selectedStatuses}
                                    onChange={setSelectedStatuses}
                                    placeholder="Select Status"
                                />
                            </div>
                        </div>

                        {applicationReceivedOn === "datePeriod" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-600">From Date</label>
                                    <Input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => handleFromDateChange(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-gray-600">To Date</label>
                                    <Input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => handleToDateChange(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>
                        )}

                        {dateError && (
                            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                                {dateError}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <div className="flex flex-col gap-1 md:col-span-2">
                                <label className="text-xs font-medium text-gray-600">Search (MemberName / MemberID / NIC / RequestID)</label>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by MemberName, MemberID, NIC or Request ID..."
                                        className="pl-8"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-600">Sort By</label>
                                <div className="flex items-center gap-2">
                                    <Select value={sortBy} onValueChange={setSortBy}>
                                        <SelectTrigger className="flex-1">
                                            <SelectValue placeholder="Requested Date" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="requested-date">Requested Date</SelectItem>
                                            <SelectItem value="status">Status</SelectItem>
                                            <SelectItem value="member-id">Member ID</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="outline" size="icon" onClick={() => setSortAsc((v) => !v)} className="cursor-pointer">
                                        <ArrowUp size={16} className={sortAsc ? "" : "rotate-180"} />
                                    </Button>
                                    <Button className="bg-[#7a2700] hover:bg-[#953002] text-white whitespace-nowrap cursor-pointer" onClick={handleRetrieve} disabled={isLoading}>
                                        <RotateCcw size={14} className={isLoading ? "animate-spin" : ""} />
                                        {isLoading ? "Retrieving..." : "Retrieve"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results list table card */}
                <div className="rounded-lg border bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-sm text-gray bold">
                                    <th className="py-4 px-4 font-medium w-10">
                                        <Checkbox
                                            disabled
                                            className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                                        />
                                    </th>
                                    <th className="py-4 px-4 font-medium">Request ID</th>
                                    <th className="py-4 px-4 font-medium">Member ID</th>
                                    <th className="py-4 px-4 font-medium">Member Name</th>
                                    <th className="py-4 px-4 font-medium">NIC</th>
                                    <th className="py-4 px-4 font-medium">Requested Date</th>
                                    <th className="py-4 px-4 font-medium">Status</th>
                                    <th className="py-4 px-4 font-medium">Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {!hasRetrieved ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-8 text-gray-500">
                                            <div className="flex flex-col items-center justify-center gap-1">
                                                <Info size={18} className="text-gray-400" />
                                                <span>Adjust search criteria and click "Retrieve" to fetch requests.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : apiError ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-8">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 max-w-md text-center">
                                                    <strong>Error loading data:</strong> {apiError}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : displayed.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-8 text-gray-500">
                                            No records found matching your search criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    displayed.map((item) => {
                                        const requestKey = item.requestId || String(item.id);
                                        const statusNormalized = (item.status || "").toLowerCase().replace(/[\s_]+/g, "");
                                        const isSubmitted = statusNormalized === "submittedforapproval" || statusNormalized === "submitted";
                                        const isApproved = statusNormalized === "approved";

                                        return (
                                            <tr key={item.id} className="border-t text-sm text-gray-600 hover:bg-slate-50/50 transition-colors">
                                                <td className="py-4 px-4">
                                                    <Checkbox
                                                        disabled
                                                        className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                                                    />
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Link
                                                        href={`/membership/directory/change-memberTransfer?requestId=${encodeURIComponent(requestKey)}&memberId=${encodeURIComponent(item.memberId || "")}&mode=view`}
                                                        className="text-[#953002] hover:underline font-medium"
                                                    >
                                                        {requestKey}
                                                    </Link>
                                                </td>
                                                <td className="py-4 px-4 text-gray-600">
                                                    {item.memberId}
                                                </td>
                                                <td className="py-4 px-4 text-gray-600">{item.memberName}</td>
                                                <td className="py-4 px-4 text-gray-600">{item.nic}</td>
                                                <td className="py-4 px-4 text-gray-600">{item.requestedDate}</td>
                                                <td className="py-4 px-4">
                                                    <span className="inline-flex items-center gap-1">
                                                        {isSubmitted && (
                                                            <span title="Submitted for Approval - Review Required">
                                                                <Clock size={13} className="text-amber-500 animate-pulse" />
                                                            </span>
                                                        )}
                                                        <span className={`px-2 py-1 rounded-full border text-[11px] ${getStatusColor(item.status)}`}>
                                                            {formatStatusLabel(item.status)}
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Link
                                                        href={`/membership/directory/change-memberTransfer?requestId=${encodeURIComponent(requestKey)}&memberId=${encodeURIComponent(item.memberId || "")}&mode=view`}
                                                        className="text-[#953002] hover:underline font-medium"
                                                    >
                                                        Open
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
