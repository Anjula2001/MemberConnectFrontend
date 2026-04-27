"use client";

import { useState } from "react";
import { z } from "zod";
import { Button } from "../../../../components/ui/button";

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

  if (data.fromDate) {
    const from = new Date(data.fromDate);
    if (from > today) {
      ctx.addIssue({
        code: "custom",
        path: ["fromDate"],
        message: "From Date cannot be a future date",
      });
    }
  }

  if (data.toDate) {
    const to = new Date(data.toDate);
    if (to > today) {
      ctx.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "To Date cannot be a future date",
      });
    }
  }

  if (data.fromDate && data.toDate) {
    const from = new Date(data.fromDate);
    const to = new Date(data.toDate);

    if (from > to) {
      ctx.addIssue({
        code: "custom",
        path: ["fromDate"],
        message: "From Date must be less than or equal to To Date",
      });
    }
  }
});

interface RequestRow {
  id: number;
  requestNo: string;
  memberId: string;
  memberFullName: string;
  nameWithInitials: string;
  nic: string;
  requestedDate: string;
  status: string;
  hasOutstandingLoans: boolean;
  hasLoanObligations: boolean;
  location?: string;
}

export default function TerminationRetirementRequestsPage() {
  const [location, setLocation] = useState("CURRENT_DISTRICT");
  const [type, setType] = useState("RETIREMENT");
  const [receivedOn, setReceivedOn] = useState("ALL_DAYS");
  const [status, setStatus] = useState("NEW");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("REQUESTED_DATE");
  const [sortDirection, setSortDirection] = useState("ASC");

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loggedUserCanEdit = true;
  const today = new Date().toISOString().split("T")[0];

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.append("type", type);
      params.append("location", location);
      params.append("receivedOn", receivedOn);
      params.append("status", status);
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
        `${API_BASE_URL}/api/retirement-requests/search?${params.toString()}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.message || "Failed to retrieve requests.");
        return;
      }

      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve requests.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleView = (memberId: string, requestId: number) => {
    window.location.href = `/membership/retirement?memberId=${memberId}&requestId=${requestId}&mode=view`;
  };

  const handleEdit = (memberId: string, requestId: number) => {
    window.location.href = `/membership/retirement?memberId=${memberId}&requestId=${requestId}&mode=edit`;
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#953002]">
            Termination & Retirement Requests
          </h1>

          <Button className="bg-white text-gray-700 border hover:bg-gray-100">
            View Approval Lists
          </Button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-[#953002] mb-4">
            Search & Filter
          </h2>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border rounded-md px-3 py-2 w-full"
              >
                <option value="ALL">All</option>
                <option value="CURRENT_DISTRICT">Current District</option>
                <option value="DISTRICT_01">District 01</option>
                <option value="DISTRICT_02">District 02</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="border rounded-md px-3 py-2 w-full"
              >
                <option value="TERMINATION">Termination</option>
                <option value="RETIREMENT">Retirement</option>
                <option value="MEMBER_DEATH">Member Deaths</option>
              </select>
            </div>

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
                <option value="THIS_AND_LAST_MONTH">This and Last Month</option>
                <option value="DATE_PERIOD">Date Period</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border rounded-md px-3 py-2 w-full"
              >
                <option value="NEW">New</option>
                <option value="SUBMITTED_FOR_APPROVAL">
                  Submitted for Approval
                </option>
                <option value="REJECTED">Rejected</option>
                <option value="APPROVED">Approved</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

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
                Search Member
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Member name, payroll name, initials, member ID, NIC..."
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
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">Request ID</th>
                <th className="px-4 py-3 text-left">Requested Date</th>
                <th className="px-4 py-3 text-left">Member ID</th>
                <th className="px-4 py-3 text-left">Member Name</th>
                <th className="px-4 py-3 text-left">NIC</th>
                <th className="px-4 py-3 text-left">Indicators</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    No requests found.
                  </td>
                </tr>
              ) : (
                requests.map((row) => {
                  const isSubmitted = row.status === "SUBMITTED_FOR_APPROVAL";

                  return (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3 font-medium">
                        {row.requestNo}
                      </td>

                      <td className="px-4 py-3">{row.requestedDate}</td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleView(row.memberId, row.id)}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {row.memberId}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        {row.memberFullName || row.nameWithInitials || "-"}
                      </td>

                      <td className="px-4 py-3">{row.nic || "-"}</td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {row.hasOutstandingLoans && (
                            <span
                              title="Has outstanding loan balance"
                              className="text-red-500"
                            >
                              ●
                            </span>
                          )}

                          {row.hasLoanObligations && (
                            <span
                              title="Has indirect loan obligation"
                              className="text-orange-500"
                            >
                              ●
                            </span>
                          )}

                          {isSubmitted && (
                            <span
                              title="Submitted for approval"
                              className="text-blue-600"
                            >
                              ●
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                          {row.status.replaceAll("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(row.memberId, row.id)}
                            className="text-gray-600 hover:text-[#953002]"
                            title="View"
                          >
                            👁
                          </button>

                          {!isSubmitted && loggedUserCanEdit && (
                            <button
                              onClick={() => handleEdit(row.memberId, row.id)}
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
      </div>
    </div>
  );
}