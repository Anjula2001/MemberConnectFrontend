"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { StatusBadge } from "@/src/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { TablePagination, clampPage, pageSlice } from "@/src/components/ui/table-pagination";
import { AlertCircle, CheckCircle2, Loader2, Pencil } from "lucide-react";
import { authFetch } from "@/lib/api/authFetch";
import { useAuth } from "@/lib/auth-context";
import AccessRestricted from "@/src/components/AccessRestricted";
import { getEducationalDistricts } from "@/lib/api/education";
import { SRI_LANKAN_DISTRICTS } from "@/lib/districts";
import {
  canAccessGrade5,
  canSelectAllLocations,
  hasPermission,
} from "@/lib/permissions";

const API_BASE_URL = "http://localhost:8080";

const filterSchema = z
  .object({
    receivedOn: z.string(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.receivedOn !== "DATE_PERIOD") return;

    const today = new Date();

    if (!data.fromDate) {
      ctx.addIssue({
        code: "custom",
        path: ["fromDate"],
        message: "From Date is required",
      });
    }

    if (!data.toDate) {
      ctx.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "To Date is required",
      });
    }

    if (data.fromDate && new Date(data.fromDate) > today) {
      ctx.addIssue({
        code: "custom",
        path: ["fromDate"],
        message: "From Date cannot be a future date",
      });
    }

    if (data.toDate && new Date(data.toDate) > today) {
      ctx.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "To Date cannot be a future date",
      });
    }

    if (
      data.fromDate &&
      data.toDate &&
      new Date(data.fromDate) > new Date(data.toDate)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fromDate"],
        message: "From Date must be less than or equal to To Date",
      });
    }
  });

interface Grade5RequestRow {
  id: number;
  requestNo: string;
  memberId: string;
  memberFullName: string;
  nameWithInitials: string;
  nic: string;
  requestedDate: string;
  studentName: string;
  examinationNumber: string;
  examYear: number;
  status: string;
  location?: string;
  hasDeviation: boolean;
}

interface MultiSelectOption {
  value: string;
  label: string;
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  disabled = false,
}: {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleValue = (value: string) => {
    if (value === "ALL") {
      onChange(["ALL"]);
      return;
    }

    const withoutAll = selected.filter((item) => item !== "ALL");

    if (withoutAll.includes(value)) {
      onChange(withoutAll.filter((item) => item !== value));
    } else {
      onChange([...withoutAll, value]);
    }
  };

  const displayText =
    selected.includes("ALL")
      ? "All"
      : selected.length === 0
        ? "Select"
        : selected.length === 1
          ? options.find((option) => option.value === selected[0])?.label ||
          "Select"
          : `${selected.length} selected`;

  return (
    <div className="relative flex flex-col gap-1" ref={dropdownRef}>
      <label className="text-xs font-medium text-gray-600">{label}</label>

      {/* h-9 so this lines up with the selects and inputs beside it, which the old
          px-3 py-2 with no fixed height did not. */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-9 w-full items-center rounded-md border bg-white px-3 text-left text-sm disabled:bg-gray-100"
      >
        {displayText}
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto p-2">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-gray-50 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggleValue(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Location options are loaded from the District Office master at runtime (see the
// effect in the component) rather than hardcoded here. The previous inline list used
// synthetic UPPERCASE codes such as "NUWARA_ELIYA", which never matched the district
// names actually stored against a member, so the filter could not have worked.


const statusOptions = [
  { value: "NEW", label: "New" },
  { value: "INCOMPLETE", label: "Incomplete" },
  {
    value: "SUBMITTED_FOR_NORMAL_APPROVAL",
    label: "Submitted for Normal Approval",
  },
  {
    value: "SUBMITTED_FOR_DEVIATION_APPROVAL",
    label: "Submitted for Deviation Approval",
  },
  {
    value: "ADDED_TO_SCHOLARSHIP_NORMAL_APPROVAL_LIST",
    label: "Added to Scholarship Normal Approval List",
  },
  {
    value: "ADDED_TO_SCHOLARSHIP_DEVIATION_APPROVAL_LIST",
    label: "Added to Scholarship Deviation Approval List",
  },
  { value: "REJECTED", label: "Rejected" },
  { value: "APPROVED", label: "Approved" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function Grade5ScholarshipRequestsListPage() {
  const { user } = useAuth();

  // Capability flags, replacing the hardcoded `true`s this page used to run on.
  // The page itself is shared between two audiences — District Office searching
  // their own requests and Head Office assembling approval lists — so the page
  // guard only asks "may you see Grade 5 at all", and each control is gated
  // separately below.
  const canViewPage = canAccessGrade5(user?.role);
  const loggedUserCanEdit = hasPermission(user?.role, "G5_REQUEST_EDIT");
  const canCreateApprovalLists = hasPermission(user?.role, "G5_LIST_CREATE");
  const canViewApprovalLists = hasPermission(user?.role, "G5_LIST_VIEW");
  const canManageExamMaster = hasPermission(user?.role, "G5_EXAM_MASTER_MANAGE");
  const userHasMultipleLocations = canSelectAllLocations(user?.role);

  const [locations, setLocations] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [receivedOn, setReceivedOn] = useState("ALL_DAYS");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("REQUESTED_DATE");
  const [sortDirection, setSortDirection] = useState("ASC");

  const [requests, setRequests] = useState<Grade5RequestRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [yearOptions, setYearOptions] = useState<MultiSelectOption[]>([]);
  const [locationOptions, setLocationOptions] = useState<MultiSelectOption[]>([]);

  // Board list creation states
  const [selectedRequestNos, setSelectedRequestNos] = useState<string[]>([]);
  const [boardMeetings, setBoardMeetings] = useState<any[]>([]);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [selectedBoardMeetingId, setSelectedBoardMeetingId] = useState<string>("");
  const [approvalListType, setApprovalListType] = useState<"NORMAL" | "DEVIATION">("NORMAL");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [createdListId, setCreatedListId] = useState("");
  const [createdCount, setCreatedCount] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  // Same District Office master the Member Directory filters on, so a location
  // selected here matches the value actually stored against a request.
  useEffect(() => {
    let cancelled = false;
    /*
     * Merged with the canonical district list rather than taken from the master alone.
     * Brought over from origin/dev: a sparse or unreachable Educational Districts master
     * used to leave the filter with no options at all, which reads as a broken screen.
     */
    const buildOptions = (districts: string[]) => {
      const merged = Array.from(
        new Set([...SRI_LANKAN_DISTRICTS, ...districts])
      ).sort((a, b) => a.localeCompare(b));

      setLocationOptions([
        { value: "ALL", label: "All" },
        ...merged.map((district) => ({ value: district, label: district })),
      ]);
    };

    getEducationalDistricts()
      .then((districts) => {
        if (cancelled) return;
        buildOptions(districts);
      })
      .catch(() => {
        if (cancelled) return;
        buildOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A location-restricted user (District Office) is pinned to their own branch and
  // the dropdown is disabled. The backend re-pins them regardless of what is sent,
  // so this only keeps the filter honest on screen.
  useEffect(() => {
    if (!userHasMultipleLocations && user?.assignedDistrict) {
      setLocations([user.assignedDistrict]);
    }
  }, [userHasMultipleLocations, user?.assignedDistrict]);

  // Retrieve board meetings
  const fetchBoardMeetings = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/api/board-meetings/getAllBoardMeetings`);
      if (res.ok) {
        const data = await res.json();

        /*
         * Today or later only, soonest first. Brought over from origin/dev — a list
         * that offers last year's meetings invites attaching a request to one that
         * has already happened. Built from local date parts rather than
         * toISOString(), which in Asia/Colombo (UTC+5:30) returns yesterday for any
         * moment before 05:30.
         */
        const now = new Date();
        const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
          now.getDate()
        ).padStart(2, "0")}`;

        const upcoming = (Array.isArray(data) ? data : [])
          .filter(
            (bm: { scheduledDate?: string }) => bm?.scheduledDate && bm.scheduledDate >= todayIso
          )
          .sort((a: { scheduledDate?: string }, b: { scheduledDate?: string }) =>
            String(a.scheduledDate).localeCompare(String(b.scheduledDate))
          );

        setBoardMeetings(upcoming);
        setSelectedBoardMeetingId(
          upcoming.length > 0 ? String(upcoming[0].id) : ""
        );
      }
    } catch (error) {
      console.error("Failed to load board meetings", error);
    }
  };

  useEffect(() => {
    fetchBoardMeetings();
  }, []);

  useEffect(() => {
    const fetchExamYears = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/grade5/exam-years`);
        const data = await res.json();

        const yearsArray = Array.isArray(data)
          ? data
          : data.data || data.years || [];

        setYearOptions(
          yearsArray.map((year: number) => ({
            value: String(year),
            label: String(year),
          }))
        );
      } catch (error) {
        console.error("Failed to load exam years", error);
      }
    };

    fetchExamYears();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      locations.forEach((location) => params.append("locations", location));
      years.forEach((year) => params.append("years", year));
      statuses.forEach((status) => params.append("statuses", status));

      params.append("receivedOn", receivedOn);
      params.append("sortBy", sortBy);
      params.append("sortDirection", sortDirection);

      if (search.trim()) {
        params.append("search", search.trim());
      }

      if (receivedOn === "DATE_PERIOD") {
        params.append("fromDate", fromDate);
        params.append("toDate", toDate);
      }

      const res = await authFetch(
        `${API_BASE_URL}/api/grade5/requests/search?${params.toString()}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        setError(
          errorData.message || "Failed to retrieve scholarship requests."
        );
        return;
      }

      const data = await res.json();
      setRequests(data);
      setPage(1);
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve scholarship requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRetrieve = () => {
    const result = filterSchema.safeParse({
      receivedOn,
      fromDate,
      toDate,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};

      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      });

      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    fetchRequests();
  };

  const isSubmitted = (status: string) =>
    status === "SUBMITTED_FOR_NORMAL_APPROVAL" ||
    status === "SUBMITTED_FOR_DEVIATION_APPROVAL" ||
    status === "ADDED_TO_SCHOLARSHIP_NORMAL_APPROVAL_LIST" ||
    status === "ADDED_TO_SCHOLARSHIP_DEVIATION_APPROVAL_LIST" ||
    status === "APPROVED" ||
    status === "REJECTED";


  const handleView = (memberId: string, requestNo: string) => {
    window.location.href = `/membership/directory/grade5-scholarship?memberId=${encodeURIComponent(
      memberId
    )}&requestId=${encodeURIComponent(requestNo)}&mode=view`;
  };

  const handleEdit = (memberId: string, requestNo: string) => {
    window.location.href = `/membership/directory/grade5-scholarship?memberId=${encodeURIComponent(
      memberId
    )}&requestId=${encodeURIComponent(requestNo)}&mode=edit`;
  };

  const isSelectable = (row: Grade5RequestRow) =>
    row.status === "SUBMITTED_FOR_NORMAL_APPROVAL" ||
    row.status === "SUBMITTED_FOR_DEVIATION_APPROVAL" ||
    row.status === "REJECTED";

  const selectableRequests = requests.filter(isSelectable);
  const allSelectableSelected = selectableRequests.length > 0 && selectableRequests.every((r) => selectedRequestNos.includes(r.requestNo));

  // Clamped every render: a fresh Retrieve can return fewer rows than the page the user
  // was on, which would otherwise render an empty table on a page that no longer exists.
  const safePage = clampPage(page, requests.length);
  const pagedRequests = pageSlice(requests, safePage);

  const handleSelectAllToggle = () => {
    if (allSelectableSelected) {
      setSelectedRequestNos((prev) => prev.filter((no) => !selectableRequests.some((r) => r.requestNo === no)));
    } else {
      const nosToSelect = selectableRequests.map((r) => r.requestNo);
      setSelectedRequestNos((prev) => Array.from(new Set([...prev, ...nosToSelect])));
    }
  };

  const handleSelectRowToggle = (requestNo: string) => {
    setSelectedRequestNos((prev) =>
      prev.includes(requestNo) ? prev.filter((no) => no !== requestNo) : [...prev, requestNo]
    );
  };

  const selectedRows = requests.filter((r) => selectedRequestNos.includes(r.requestNo));

  // Eligibility to show Normal list button
  // All selected rows must be SUBMITTED_FOR_NORMAL_APPROVAL (or REJECTED with no deviation)
  const canCreateNormalList =
    canCreateApprovalLists &&
    selectedRows.length > 0 &&
    selectedRows.every(
      (r) => r.status === "SUBMITTED_FOR_NORMAL_APPROVAL" || (!r.hasDeviation && r.status === "REJECTED")
    );

  // Eligibility to show Deviation list button
  // All selected rows must be SUBMITTED_FOR_DEVIATION_APPROVAL (or REJECTED with deviation)
  const canCreateDeviationList =
    canCreateApprovalLists &&
    selectedRows.length > 0 &&
    selectedRows.every(
      (r) => r.status === "SUBMITTED_FOR_DEVIATION_APPROVAL" || (r.hasDeviation && r.status === "REJECTED")
    );

  const handleOpenBoardModal = (type: "NORMAL" | "DEVIATION") => {
    setApprovalListType(type);
    setIsBoardModalOpen(true);
  };

  const handleSaveApprovalList = async () => {
    if (!selectedBoardMeetingId) {
      alert("Please select a board meeting");
      return;
    }

    try {
      const reqNos = selectedRows
        .filter((r) => (approvalListType === "DEVIATION" ? r.hasDeviation : !r.hasDeviation))
        .map((r) => r.requestNo);

      const res = await authFetch(`${API_BASE_URL}/api/grade5/approval-lists/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardMeetingId: Number(selectedBoardMeetingId),
          type: approvalListType,
          requestNos: reqNos,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Failed to create approval list");
        return;
      }

      const createdList = await res.json();
      setCreatedListId(createdList.listId);
      setCreatedCount(reqNos.length);
      setIsBoardModalOpen(false);
      setSelectedRequestNos([]);
      setIsConfirmModalOpen(true);
      fetchRequests();
    } catch (error) {
      console.error(error);
      alert("Error creating board approval list");
    }
  };

  // Allow-list: a role reaches this page only by holding a Grade 5 right explicitly.
  // Waits for `user` to load so the guard does not flash before auth resolves.
  if (user && !canViewPage) {
    return (
      <AccessRestricted message="Grade 5 Scholarships are restricted to District Office, Head Office and Scholarship personnel." />
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#953002]">
          Grade 5 Scholarship Requests
        </h1>

        <div className="flex gap-3">
          {/* Create Normal List */}
          {canCreateNormalList && (
            <Button
              className="bg-[#953002] text-white hover:bg-[#7d2802] px-5"
              onClick={() => handleOpenBoardModal("NORMAL")}
            >
              Create Grade 5 Scholarship Normal Approval List
            </Button>
          )}

          {/* Create Deviation List */}
          {canCreateDeviationList && (
            <Button
              className="bg-[#953002] text-white hover:bg-[#7d2802] px-5"
              onClick={() => handleOpenBoardModal("DEVIATION")}
            >
              Create Grade 5 Scholarship Deviation Approval List
            </Button>
          )}

          {/* View Approval Lists */}
          {canViewApprovalLists && (
            <Button
              className="bg-[#953002] text-white hover:bg-[#7d2802] px-5"
              onClick={() => {
                window.location.href = "/scholarships/grade-5/approval-lists";
              }}
            >
              View Approval Lists
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="mb-6 text-lg font-bold text-[#8B3205]">Search Criteria</h2>

        {/* Same arrangement as the Termination, Dormant, Death Donation and Profile
            Changes screens: the four filters on one row, the date pair on its own row
            only when a period is chosen, then search with sort and Retrieve.

            Previously one flat grid held everything, so choosing Date Period inserted
            From/To mid-flow and shunted Search, Sort and Order into different columns. */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MultiSelectDropdown
              label="Location"
              options={locationOptions}
              selected={locations}
              onChange={setLocations}
              disabled={!userHasMultipleLocations}
            />

            <MultiSelectDropdown
              label="Year of Examination"
              options={yearOptions}
              selected={years}
              onChange={setYears}
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Request Received On</label>
              <select
                value={receivedOn}
                onChange={(e) => {
                  setReceivedOn(e.target.value);
                  setFieldErrors({});
                }}
                className="h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="ALL_DAYS">All Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="THIS_AND_LAST_MONTH">This and Last Month</option>
                <option value="DATE_PERIOD">Date Period</option>
              </select>
            </div>

            <MultiSelectDropdown
              label="Status"
              options={statusOptions}
              selected={statuses}
              onChange={setStatuses}
            />
          </div>

          {receivedOn === "DATE_PERIOD" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  max={today}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, fromDate: "" }));
                  }}
                  className="h-9 w-full rounded-md border px-3 text-sm"
                />
                {fieldErrors.fromDate && (
                  <p className="text-xs text-red-500">{fieldErrors.fromDate}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  max={today}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, toDate: "" }));
                  }}
                  className="h-9 w-full rounded-md border px-3 text-sm"
                />
                {fieldErrors.toDate && (
                  <p className="text-xs text-red-500">{fieldErrors.toDate}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Search Member / Exam</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Member name, member ID, NIC, student name, examination number..."
                className="h-9 w-full rounded-md border px-3 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="REQUESTED_DATE">Requested Date</option>
                <option value="STATUS">Status</option>
                <option value="MEMBER_ID">Member ID</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Order</label>
              <div className="flex items-center gap-2">
                <select
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value)}
                  className="h-9 flex-1 rounded-md border px-3 text-sm"
                >
                  <option value="ASC">Ascending</option>
                  <option value="DESC">Descending</option>
                </select>
                <Button
                  onClick={handleRetrieve}
                  className="whitespace-nowrap bg-[#953002] text-white hover:bg-[#672102]"
                >
                  Retrieve
                </Button>
              </div>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* Results - shadcn Table, matching the Membership Directory. */}
      <Card className="overflow-hidden rounded-xl border-neutral-300 py-0 shadow-none">
        <CardContent className="overflow-x-auto px-0">
          <Table className="border-collapse">
            <TableHeader>
              <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                <TableHead className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all eligible requests"
                    checked={allSelectableSelected}
                    onChange={handleSelectAllToggle}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
                {["Request ID", "Requested Date", "Member ID", "Exam No", "Indicators", "Status"].map((h) => (
                  <TableHead
                    key={h}
                    className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                  >
                    {h}
                  </TableHead>
                ))}
                <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-neutral-500">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading requests…</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-neutral-500">
                    No scholarship requests found.
                  </TableCell>
                </TableRow>
              ) : (
                pagedRequests.map((row) => {
                  const submitted = isSubmitted(row.status);
                  const selectable = isSelectable(row);

                  return (
                    <TableRow key={row.id} className="hover:bg-neutral-50">
                      <TableCell className="px-4 py-4">
                        {selectable && (
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.requestNo}`}
                            checked={selectedRequestNos.includes(row.requestNo)}
                            onChange={() => handleSelectRowToggle(row.requestNo)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-4 font-medium whitespace-nowrap">
                        <button
                          onClick={() => handleView(row.memberId, row.requestNo)}
                          className="text-[#9d3602] hover:underline"
                        >
                          {row.requestNo}
                        </button>
                      </TableCell>

                      {/* Requested Date — column brought over from origin/dev. */}
                      <TableCell className="px-4 py-4 whitespace-nowrap text-neutral-700 tabular-nums">
                        {row.requestedDate || "-"}
                      </TableCell>

                      <TableCell className="px-4 py-4 whitespace-nowrap text-neutral-700">
                        {row.memberId}
                      </TableCell>

                      <TableCell className="px-4 py-4 text-neutral-700">
                        {row.examinationNumber || "-"}
                      </TableCell>

                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          {row.status !== "NEW" &&
                            row.status !== "INCOMPLETE" &&
                            row.status !== "INACTIVE" && (
                              row.hasDeviation || row.status?.includes("DEVIATION") ? (
                                <span
                                  title="Deviation Scholarship"
                                  className="inline-flex cursor-help items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                                >
                                  <AlertCircle size={12} />
                                  Deviation
                                </span>
                              ) : (
                                <span
                                  title="Normal Scholarship"
                                  className="inline-flex cursor-help items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                                >
                                  <CheckCircle2 size={12} />
                                  Normal
                                </span>
                              )
                            )}
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-4">
                        <StatusBadge status={row.status} vocabulary="scholarship" />
                      </TableCell>

                      <TableCell className="px-4 py-4 text-right">
                        {!submitted && loggedUserCanEdit && (
                          <button
                            onClick={() => handleEdit(row.memberId, row.requestNo)}
                            className="inline-flex text-[#9d3602] transition-colors hover:text-[#c44515]"
                            title="Edit"
                            aria-label="Edit request"
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {!loading && requests.length > 0 && (
            <TablePagination
              page={safePage}
              total={requests.length}
              onPageChange={setPage}
              itemLabel="request"
            />
          )}
        </CardContent>
      </Card>

      {/* Board Meeting Selection Modal */}
      {isBoardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold text-[#953002] mb-4">
              Select Board Meeting Record
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Choose the Board Meeting Record to attach the selected requests to.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Board Meeting Date
              </label>
              <select
                value={selectedBoardMeetingId}
                onChange={(e) => setSelectedBoardMeetingId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                {boardMeetings.map((bm) => (
                  <option key={bm.id} value={bm.id}>
                    Board Meeting - {bm.scheduledDate} ({bm.boardMeetingId})
                  </option>
                ))}
                {boardMeetings.length === 0 && (
                  <option value="">No board meetings available</option>
                )}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setIsBoardModalOpen(false)}
                className="bg-white text-black hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveApprovalList}
                disabled={!selectedBoardMeetingId}
                className="bg-[#953002] text-white hover:bg-[#7d2802]"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List Created Confirmation Dialog */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold text-[#953002] mb-3">
              List Created Successfully
            </h3>
            <p className="text-sm text-gray-700 mb-6">
              The Grade 5 Scholarship {approvalListType === "DEVIATION" ? "Deviation" : "Normal"} Approval List for {createdCount} requests has been created. Do you want to view the list?
            </p>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setIsConfirmModalOpen(false)}
                className="bg-white text-black hover:bg-gray-100 px-4"
              >
                No
              </Button>
              <Button
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  window.location.href = `/scholarships/grade-5/approval-lists?listId=${createdListId}`;
                }}
                className="bg-[#953002] text-white hover:bg-[#7d2802] px-4"
              >
                Yes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
