"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  RotateCcw,
  Plus,
  ArrowUp,
  Pencil,
  FileText,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

// ── Multi-select dropdown ─────────────────────────────────────────────────────
interface MultiSelectProps {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
}: MultiSelectProps) {
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
// ─────────────────────────────────────────────────────────────────────────────

type RegistrationStatus = "DRAFT" | "PENDING_BOARD" | "SUBMITTED";

interface Registration {
  appId: string;
  fullName: string;
  nic: string;
  appliedDate: string | null;
  district: string;
  zone: string;
  status: RegistrationStatus;
  hasWarning?: boolean;
  selectable: boolean;
}

const mockData: Registration[] = [
  {
    appId: "APP-2026-002",
    fullName: "Second User",
    nic: "199588877766",
    appliedDate: null,
    district: "Kandy",
    zone: "Kandy",
    status: "DRAFT",
    selectable: false,
  },
  {
    appId: "APP-2026-003",
    fullName: "Rejoining Member",
    nic: "198844433322",
    appliedDate: "2026-01-25",
    district: "Nuwara Eliya",
    zone: "Nuwara Eliya",
    status: "PENDING_BOARD",
    hasWarning: true,
    selectable: false,
  },
  {
    appId: "APP-2026-001",
    fullName: "New User One",
    nic: "200012345678",
    appliedDate: "2026-02-05",
    district: "Colombo",
    zone: "Colombo South",
    status: "SUBMITTED",
    selectable: true,
  },
];

const statusBadgeClass: Record<RegistrationStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-100",
  PENDING_BOARD: "bg-amber-500 text-white border-transparent hover:bg-amber-500",
  SUBMITTED: "bg-amber-700 text-white border-transparent hover:bg-amber-700",
};

export default function NewRegistrationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const locationOptions = [
    { value: "colombo", label: "Colombo" },
    { value: "kandy", label: "Kandy" },
    { value: "galle", label: "Galle" },
    { value: "nuwara-eliya", label: "Nuwara Eliya" },
    { value: "matara", label: "Matara" },
    { value: "jaffna", label: "Jaffna" },
  ];

  const statusOptions = [
    { value: "new", label: "New" },
    { value: "submitted", label: "Submitted for Approval" },
    { value: "board", label: "Added to Board Approval List" },
    { value: "rejected", label: "Rejected" },
    { value: "inactive", label: "Inactive" },
  ];

  const toggleRow = (appId: string) => {
    setSelectedRows((prev) =>
      prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId]
    );
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#953002]">
          New Member Registration Search
        </h1>
        <Button className="bg-[#7a2700] hover:bg-[#953002] text-white">
          <Plus />
          Create New Registration
        </Button>
      </div>

      {/* Search Criteria Card */}
      <Card className="rounded-xl shadow-sm py-0">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base text-[#953002]">
            Search Criteria
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 flex flex-col gap-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Location (District) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Location (District)
              </label>
              <MultiSelect
                options={locationOptions}
                selected={selectedLocations}
                onChange={setSelectedLocations}
                placeholder="Select Locations"
              />
            </div>

            {/* Application Received On */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Application Received On
              </label>
              <Select>
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

            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Status
              </label>
              <MultiSelect
                options={statusOptions}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
                placeholder="Select Status"
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Search Name / NIC */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-gray-600">
                Search (Name / NIC)
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Applicant Name, Initials or NIC..."
                  className="pl-8"
                />
              </div>
            </div>

            {/* Sort By + Retrieve */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">
                Sort By
              </label>
              <div className="flex items-center gap-2">
                <Select>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Applied Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied-date">Applied Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="district">District</SelectItem>
                    <SelectItem value="zone">Zone</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <ArrowUp size={16} />
                </Button>
                <Button className="bg-[#7a2700] hover:bg-[#953002] text-white whitespace-nowrap">
                  <RotateCcw size={14} />
                  Retrieve
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="rounded-xl shadow-sm overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-10 px-4" />
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                App ID
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Full Name
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                NIC
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Applied Date
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                District
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Zone
              </TableHead>
              <TableHead className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </TableHead>
              <TableHead className="px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockData.map((row) => (
              <TableRow key={row.appId}>
                {/* Checkbox */}
                <TableCell className="px-4">
                  {row.selectable ? (
                    <Checkbox
                      checked={selectedRows.includes(row.appId)}
                      onCheckedChange={() => toggleRow(row.appId)}
                      className="data-[state=checked]:bg-[#953002] data-[state=checked]:border-[#953002]"
                    />
                  ) : (
                    <span className="size-4 block" />
                  )}
                </TableCell>

                {/* App ID */}
                <TableCell className="px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#953002] font-medium hover:underline cursor-pointer">
                      {row.appId}
                    </span>
                    {row.hasWarning && (
                      <AlertCircle size={14} className="text-amber-500" />
                    )}
                  </div>
                </TableCell>

                <TableCell className="px-4 text-gray-700">
                  {row.fullName}
                </TableCell>
                <TableCell className="px-4 text-gray-700">{row.nic}</TableCell>
                <TableCell className="px-4 text-gray-500">
                  {row.appliedDate ?? "-"}
                </TableCell>
                <TableCell className="px-4 text-gray-700">
                  {row.district}
                </TableCell>
                <TableCell className="px-4 text-gray-700">{row.zone}</TableCell>

                {/* Status Badge */}
                <TableCell className="px-4">
                  <Badge className={statusBadgeClass[row.status]}>
                    {row.status}
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell className="px-4 text-right">
                  <Button variant="ghost" size="icon-sm" className="text-gray-400 hover:text-gray-600">
                    {row.status === "DRAFT" ? (
                      <Pencil size={16} />
                    ) : (
                      <FileText size={16} />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
