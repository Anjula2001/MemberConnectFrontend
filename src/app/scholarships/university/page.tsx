"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Search, RotateCcw, ArrowUp, ChevronDown } from "lucide-react";

type RequestRow = {
  id: number;
  requestId: string;
  studentName: string;
  memberName: string;
  universityName: string;
  status: string;
};

export default function Page() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [displayed, setDisplayed] = useState<RequestRow[]>([]);

  // Search/filter state (copied from New Registrations UI)
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [applicationReceivedOn, setApplicationReceivedOn] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("request-id");
  const [sortAsc, setSortAsc] = useState(true);
  const [hasRetrieved, setHasRetrieved] = useState(false);

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

  const statusOptions = [
    { value: "new", label: "New" },
    { value: "incomplete", label: "Incomplete" },
    { value: "submittedforcommitteeapproval", label: "Submitted for Committee Approval" },
    { value: "submittedfornormalboardapproval", label: "Submitted for Normal Board Approval" },
    { value: "submittedfordeviationboardapproval", label: "Submitted for Deviation Board Approval" },
    { value: "addedtonormalboardapprovallist", label: "Added to Normal Board Approval List" },
    { value: "addedtodeviationboardapprovallist", label: "Added to Deviation Board Approval List" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch("http://localhost:8080/api/university-scholarships");
        const data = await res.json();

        console.log("API data:", data);

        if (Array.isArray(data)) {
          setRequests(data);
          setDisplayed(data);
        } else {
          setRequests([]);
          setDisplayed([]);
        }
      } catch (error) {
        console.error("Failed to fetch requests:", error);
        setRequests([]);
        setDisplayed([]);
      }
    };

    fetchRequests();
  }, []);

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
          className="border-input flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={selected.length === 0 ? "text-muted-foreground" : ""}>
            {label}
          </span>
          <ChevronDown size={14} className="text-muted-foreground shrink-0" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full min-w-[8rem] rounded-md border border-border bg-popover shadow-md">
            <div className="p-1 flex flex-col gap-0.5">
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

  const handleRetrieve = () => {
    let filtered = [...requests];

    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((r) => selectedStatuses.includes(r.status.toLowerCase()));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.studentName.toLowerCase().includes(q) ||
          r.memberName.toLowerCase().includes(q) ||
          r.universityName.toLowerCase().includes(q) ||
          r.requestId.toLowerCase().includes(q)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "student") cmp = a.studentName.localeCompare(b.studentName);
      else if (sortBy === "member") cmp = a.memberName.localeCompare(b.memberName);
      else if (sortBy === "university") cmp = a.universityName.localeCompare(b.universityName);
      else cmp = a.requestId.localeCompare(b.requestId);
      return sortAsc ? cmp : -cmp;
    });

    setDisplayed(filtered);
    setHasRetrieved(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#953002]">
          University Scholarships
        </h1>

        <div className="flex gap-2">
          <Link href="/scholarships/university/new">
            <Button className="bg-[#D4183D] text-white hover:bg-[#a3152f]">
              + New Application
            </Button>
          </Link>

          <Link href="/scholarships/university/approvals">
            <Button variant="outline">Approval Lists</Button>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="text-xs font-medium text-gray-600">Application Received On</label>
              <Select value={applicationReceivedOn} onValueChange={setApplicationReceivedOn}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="thisAndLastMonth">This and Last Month</SelectItem>
                  <SelectItem value="DatePeriod">Date Period</SelectItem>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Search (Name / NIC / Request)</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Student, Member, University or Request ID..."
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Sort By</label>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Request ID" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="request-id">Request ID</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="university">University</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setSortAsc((v) => !v)}>
                  <ArrowUp size={16} className={sortAsc ? "" : "rotate-180"} />
                </Button>
                <Button className="bg-[#7a2700] hover:bg-[#953002] text-white whitespace-nowrap" onClick={handleRetrieve}>
                  <RotateCcw size={14} />
                  Retrieve
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                    <tr className="text-sm text-gray bold">
                        <th className="py-4 px-4 font-medium">Request ID</th>
                        <th className="py-4 px-4 font-medium">Student</th>
                        <th className="py-4 px-4 font-medium">Member</th>
                        <th className="py-4 px-4 font-medium">University</th>
                        <th className="py-4 px-4 font-medium">Status</th>
                        <th className="py-4 px-4 font-medium">Action</th>
                    </tr>
                    </thead>

                    <tbody>
                    {displayed.length === 0 ? (
                        <tr>
                      <td colSpan={6} className="text-center py-4 text-gray-500">
                        No data available
                      </td>
                        </tr>
                    ) : (
                      displayed.map((item) => (
                        <tr key={item.id} className="border-t text-small text-gray-600">
                            <td className="py-4 px-4 text-gray-600">{item.requestId}</td>
                            <td className="py-4 px-4 text-gray-600">{item.studentName}</td>
                            <td className="py-4 px-4 text-gray-600">{item.memberName}</td>
                            <td className="py-4 px-4 text-gray-600">{item.universityName}</td>
                            <td className="py-4 px-4">
                            <span className="px-2 py-1 rounded-full bg-white border border-gray-300 text-sm text-gray-600">
                                {item.status}
                            </span>
                            </td>
                            <td className="py-4 px-4">
                                <Link
                                    href={`/scholarships/university/${item.id}`}
                                    className="text-[#953002] hover:underline font-medium"
                                >
                                    View
                                </Link>
                                </td>
                        </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
            </div>
        </div>
    </div>
  );
}