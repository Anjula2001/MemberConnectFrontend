"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "../../../components/ui/button";

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
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1">{label}</label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="border rounded-md px-3 py-2 w-full text-left bg-white disabled:bg-gray-100"
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

const locationOptions = [
  { value: "ALL", label: "All" },
  { value: "AMPARA", label: "Ampara" },
  { value: "ANURADHAPURA", label: "Anuradhapura" },
  { value: "BADULLA", label: "Badulla" },
  { value: "BATTICALOA", label: "Batticaloa" },
  { value: "COLOMBO", label: "Colombo" },
  { value: "GALLE", label: "Galle" },
  { value: "GAMPAHA", label: "Gampaha" },
  { value: "HAMBANTOTA", label: "Hambantota" },
  { value: "JAFFNA", label: "Jaffna" },
  { value: "KALUTARA", label: "Kalutara" },
  { value: "KANDY", label: "Kandy" },
  { value: "KEGALLE", label: "Kegalle" },
  { value: "KILINOCHCHI", label: "Kilinochchi" },
  { value: "KURUNEGALA", label: "Kurunegala" },
  { value: "MANNAR", label: "Mannar" },
  { value: "MATALE", label: "Matale" },
  { value: "MATARA", label: "Matara" },
  { value: "MONARAGALA", label: "Monaragala" },
  { value: "MULLAITIVU", label: "Mullaitivu" },
  { value: "NUWARA_ELIYA", label: "Nuwara Eliya" },
  { value: "POLONNARUWA", label: "Polonnaruwa" },
  { value: "PUTTALAM", label: "Puttalam" },
  { value: "RATNAPURA", label: "Ratnapura" },
  { value: "TRINCOMALEE", label: "Trincomalee" },
  { value: "VAVUNIYA", label: "Vavuniya" },
];


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
  const [locations, setLocations] = useState<string[]>(["CURRENT_DISTRICT"]);
  const [years, setYears] = useState<string[]>([]);
  const [receivedOn, setReceivedOn] = useState("ALL_DAYS");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("REQUESTED_DATE");
  const [sortDirection, setSortDirection] = useState("ASC");

  const [requests, setRequests] = useState<Grade5RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [yearOptions, setYearOptions] = useState<MultiSelectOption[]>([]);

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

  const userHasMultipleLocations = true;
  const loggedUserCanEdit = true;

  // Retrieve board meetings
  const fetchBoardMeetings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/board-meetings/getAllBoardMeetings`);
      if (res.ok) {
        const data = await res.json();
        setBoardMeetings(data);
        if (data.length > 0) {
          setSelectedBoardMeetingId(String(data[0].id));
        }
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
        const res = await fetch(`${API_BASE_URL}/api/grade5/exam-years`);
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

      const res = await fetch(
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
    selectedRows.length > 0 &&
    selectedRows.every(
      (r) => r.status === "SUBMITTED_FOR_NORMAL_APPROVAL" || (!r.hasDeviation && r.status === "REJECTED")
    );

  // Eligibility to show Deviation list button
  // All selected rows must be SUBMITTED_FOR_DEVIATION_APPROVAL (or REJECTED with deviation)
  const canCreateDeviationList =
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

      const res = await fetch(`${API_BASE_URL}/api/grade5/approval-lists/create`, {
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-100 text-blue-700 border border-blue-200";
      case "INACTIVE":
        return "bg-gray-100 text-gray-600 border border-gray-200";
      case "REJECTED":
        return "bg-red-100 text-red-700 border border-red-200";
      case "APPROVED":
        return "bg-green-100 text-green-700 border border-green-200";
      case "SUBMITTED_FOR_NORMAL_APPROVAL":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      case "SUBMITTED_FOR_DEVIATION_APPROVAL":
        return "bg-purple-100 text-purple-700 border border-purple-200";
      default:
        return "bg-gray-100 text-gray-600 border border-gray-200";
    }
  };

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
          <Button
            className="bg-[#953002] text-white hover:bg-[#7d2802] px-5"
            onClick={() => {
              window.location.href = "/scholarships/grade-5/approval-lists";
            }}
          >
            View Approval Lists
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-[#953002] mb-4">
          Search & Filter
        </h2>

        <div className="grid grid-cols-4 gap-4">
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

          <div>
            <label className="block text-sm font-medium mb-1">
              Request Received On
            </label>
            <select
              value={receivedOn}
              onChange={(e) => {
                setReceivedOn(e.target.value);
                setFieldErrors({});
              }}
              className="border rounded-md px-3 py-2 w-full"
            >
              <option value="ALL_DAYS">All Days</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="THIS_AND_LAST_MONTH">
                This and Last Month
              </option>
              <option value="DATE_PERIOD">Date Period</option>
            </select>
          </div>

          <MultiSelectDropdown
            label="Status"
            options={statusOptions}
            selected={statuses}
            onChange={setStatuses}
          />

          {receivedOn === "DATE_PERIOD" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  max={today}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, fromDate: "" }));
                  }}
                  className="border rounded-md px-3 py-2 w-full"
                />
                {fieldErrors.fromDate && (
                  <p className="text-red-500 text-xs mt-1">
                    {fieldErrors.fromDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  max={today}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, toDate: "" }));
                  }}
                  className="border rounded-md px-3 py-2 w-full"
                />
                {fieldErrors.toDate && (
                  <p className="text-red-500 text-xs mt-1">
                    {fieldErrors.toDate}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">
              Search Member / Exam
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Member name, member ID, NIC, student name, examination number..."
              className="border rounded-md px-3 py-2 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-md px-3 py-2 w-full"
            >
              <option value="REQUESTED_DATE">Requested Date</option>
              <option value="STATUS">Status</option>
              <option value="MEMBER_ID">Member ID</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Order</label>
            <select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value)}
              className="border rounded-md px-3 py-2 w-full"
            >
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button
            onClick={handleRetrieve}
            className="bg-[#953002] text-white hover:bg-[#672102] px-6"
          >
            Retrieve
          </Button>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={allSelectableSelected}
                  onChange={handleSelectAllToggle}
                  className="rounded text-[#953002]"
                />
              </th>
              <th className="px-4 py-3 text-left">Request ID</th>
              <th className="px-4 py-3 text-left">Member ID</th>
              <th className="px-4 py-3 text-left">Exam No</th>
              <th className="px-4 py-3 text-left">Indicators</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  Loading...
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No scholarship requests found.
                </td>
              </tr>
            ) : (
              requests.map((row) => {
                const submitted = isSubmitted(row.status);
                const selectable = isSelectable(row);

                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">
                      {selectable && (
                        <input
                          type="checkbox"
                          checked={selectedRequestNos.includes(row.requestNo)}
                          onChange={() => handleSelectRowToggle(row.requestNo)}
                          className="rounded text-[#953002]"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      <button
                        onClick={() => handleView(row.memberId, row.requestNo)}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {row.requestNo}
                      </button>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">{row.memberId}</td>

                    <td className="px-4 py-3">
                      {row.examinationNumber || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {row.status !== "NEW" &&
                          row.status !== "INCOMPLETE" &&
                          row.status !== "INACTIVE" && (
                            row.hasDeviation || row.status?.includes("DEVIATION") ? (
                              <span
                                title="Deviation Scholarship"
                                className="font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-xs inline-block"
                              >
                                D
                              </span>
                            ) : (
                              <span
                                title="Normal Scholarship"
                                className="font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 text-xs inline-block"
                              >
                                N
                              </span>
                            )
                          )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(row.status)}`}>
                        {row.status?.replace(/_/g, " ") || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2 px-6">

                        {!submitted && loggedUserCanEdit && (
                          <button
                            onClick={() => handleEdit(row.memberId, row.requestNo)}
                            className="text-gray-600 hover:text-[#953002]"
                            title="Edit"
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Manage Exam Year & Cutoff Button */}
      <div className="flex justify-end mt-4 mb-8 pb-4">
        <Button
          className="bg-[#953002] text-white hover:bg-[#7d2802] px-5"
          onClick={() => {
            window.location.href = "/scholarships/grade-5/manage-exam-cutoff";
          }}
        >
          Manage Exam Year & Cutoff
        </Button>
      </div>

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
