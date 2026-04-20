"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  FileText,
  Printer,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

type BoardMeeting = {
  id: number;
  date: string;
};

type BoardTab = "meetings" | "approval-lists";

type ApprovalListItem = {
  listId: string;
  status: "CREATED";
  meetingId: number;
  date: string;
};

type ApplicationDecision = "Approve" | "Reject";

type ApprovalApplication = {
  appId: string;
  name: string;
  hasWarning?: boolean;
};

function formatDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}-${month}-${day}`;
}

export default function BoardApprovalsPage() {
  const [activeTab, setActiveTab] = useState<BoardTab>("meetings");
  const [selectedDate, setSelectedDate] = useState("");
  const [createdMeetings, setCreatedMeetings] = useState<BoardMeeting[]>([]);
  const [dateFilter, setDateFilter] = useState("all");
  const [approvalLists, setApprovalLists] = useState<ApprovalListItem[]>([
    {
      listId: "BAL-2026-001",
      status: "CREATED",
      meetingId: 108,
      date: "2026-02-28",
    },
    {
      listId: "BAL-6892",
      status: "CREATED",
      meetingId: 108,
      date: "2026-02-28",
    },
  ]);
  const [selectedApprovalListId, setSelectedApprovalListId] = useState("");
  const [applicationsRetrieved, setApplicationsRetrieved] = useState(false);
  const [applicationDecision, setApplicationDecision] =
    useState<ApplicationDecision>("Approve");
  const [rejectReason, setRejectReason] = useState("");

  const applications: ApprovalApplication[] = [
    {
      appId: "APP-2026-003",
      name: "Rejoining Member",
      hasWarning: true,
    },
  ];

  const nextMeetingId = useMemo(() => {
    if (createdMeetings.length === 0) return 108;
    return Math.max(...createdMeetings.map((meeting) => meeting.id)) + 1;
  }, [createdMeetings]);

  const handleAddMeeting = () => {
    if (!selectedDate) return;

    const isDuplicateDate = createdMeetings.some(
      (meeting) => meeting.date === selectedDate
    );
    if (isDuplicateDate) return;

    setCreatedMeetings((prev) => [
      { id: nextMeetingId, date: selectedDate },
      ...prev,
    ]);
    setSelectedDate("");
  };

  const handleDeleteMeeting = (id: number) => {
    setCreatedMeetings((prev) => prev.filter((meeting) => meeting.id !== id));
  };

  const filteredApprovalLists = useMemo(() => {
    if (dateFilter === "all") return approvalLists;

    const now = new Date();
    return approvalLists.filter((item) => {
      const itemDate = new Date(item.date);
      if (dateFilter === "thisMonth") {
        return (
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth()
        );
      }

      if (dateFilter === "lastMonth") {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          itemDate.getFullYear() === lastMonthDate.getFullYear() &&
          itemDate.getMonth() === lastMonthDate.getMonth()
        );
      }

      return true;
    });
  }, [approvalLists, dateFilter]);

  const selectedApprovalList = useMemo(
    () =>
      filteredApprovalLists.find((item) => item.listId === selectedApprovalListId) ??
      null,
    [filteredApprovalLists, selectedApprovalListId]
  );

  const handleRetrieveApprovalLists = () => {
    const generated = createdMeetings.map((meeting, index) => ({
      listId: `BAL-${new Date(meeting.date).getFullYear()}-${String(meeting.id + index).padStart(3, "0")}`,
      status: "CREATED" as const,
      meetingId: meeting.id,
      date: meeting.date,
    }));

    if (generated.length > 0) {
      setApprovalLists((prev) => {
        const seen = new Set(prev.map((item) => item.listId));
        const newItems = generated.filter((item) => !seen.has(item.listId));
        return [...newItems, ...prev];
      });
    }

    setSelectedApprovalListId("");
    setApplicationsRetrieved(false);
  };

  const handleRetrieveApplications = () => {
    if (!selectedApprovalListId) return;
    setApplicationsRetrieved(true);
  };

  const handleDeleteSelectedList = () => {
    if (!selectedApprovalListId) return;

    setApprovalLists((prev) =>
      prev.filter((item) => item.listId !== selectedApprovalListId)
    );
    setSelectedApprovalListId("");
    setApplicationsRetrieved(false);
    setApplicationDecision("Approve");
    setRejectReason("");
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-3xl font-bold text-[#953002]">Board Administration</h1>

      <div className="inline-flex w-fit rounded-md border bg-muted p-1">
        <Button
          type="button"
          variant={activeTab === "meetings" ? "secondary" : "ghost"}
          className={`h-8 rounded-sm px-3 text-xs ${
            activeTab === "meetings"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-transparent"
          }`}
          onClick={() => setActiveTab("meetings")}
        >
          Board Meetings
        </Button>
        <Button
          type="button"
          variant={activeTab === "approval-lists" ? "secondary" : "ghost"}
          className={`h-8 rounded-sm px-3 text-xs ${
            activeTab === "approval-lists"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-transparent"
          }`}
          onClick={() => setActiveTab("approval-lists")}
        >
          Board Approval Lists
        </Button>
      </div>

      {activeTab === "meetings" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="rounded-xl py-0 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-4 font-bold text-[#953002]">
                Create Board Meeting
              </CardTitle>
              <p className="text-sm text-muted-foreground">Schedule new meetings</p>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <CalendarDays
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleAddMeeting}
                  disabled={!selectedDate}
                  className="bg-[#953002] text-white hover:bg-[#7a2700]"
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl py-0 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-4 font-bold text-[#953002]">
                Board Meetings Created
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {createdMeetings.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  No meetings added yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {createdMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded bg-[#f7ede8] p-1.5 text-[#953002]">
                          <CalendarDays size={14} />
                        </div>
                        <div className="leading-tight">
                          <p className="font-semibold text-foreground">{meeting.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDisplayDate(meeting.date)}
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        aria-label={`Delete meeting ${meeting.id}`}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <Card className="rounded-xl py-0 shadow-sm">
            <CardHeader className="px-5 pt-5 pb-3">
              <CardTitle className="text-4 font-bold text-[#953002]">
                Search Approval Lists
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex w-full flex-col gap-1 md:max-w-md">
                <label className="text-xs font-medium text-gray-600">Date Filter</label>
                <div className="flex items-center gap-2">
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="All Dates" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="lastMonth">Last Month</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    className="bg-[#953002] text-white hover:bg-[#7a2700]"
                    onClick={handleRetrieveApprovalLists}
                  >
                    <Search size={14} />
                    Retrieve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
            <Card className="rounded-xl py-0 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-4 font-bold text-[#953002]">Approval Lists</CardTitle>
                <p className="text-sm text-muted-foreground">Select a list to view details</p>
              </CardHeader>
              <CardContent className="px-0 pb-4">
                <div className="border-y text-sm">
                  <div className="grid grid-cols-[1fr_auto] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>List ID</span>
                    <span>Status</span>
                  </div>

                  {filteredApprovalLists.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No approval lists found.
                    </div>
                  ) : (
                    filteredApprovalLists.map((item) => (
                      <button
                        key={item.listId}
                        type="button"
                        onClick={() => {
                          setSelectedApprovalListId(item.listId);
                          setApplicationsRetrieved(false);
                          setApplicationDecision("Approve");
                          setRejectReason("");
                        }}
                        className={`grid w-full grid-cols-[1fr_auto] items-center border-t px-5 py-3 text-left transition-colors first:border-t-0 hover:bg-[#f6f6f6] ${
                          selectedApprovalListId === item.listId ? "bg-[#d9d9d9]" : ""
                        }`}
                      >
                        <div className="leading-tight">
                          <p className="text-sm font-medium text-gray-800">{item.listId}</p>
                          <p className="text-xs text-muted-foreground">{item.meetingId}</p>
                        </div>
                        <span className="rounded-full border border-gray-300 bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                          {item.status}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <div className="px-3 pt-3">
                  <Button
                    type="button"
                    className="h-9 w-full bg-[#953002] text-white hover:bg-[#7a2700]"
                    disabled={!selectedApprovalListId}
                    onClick={handleRetrieveApplications}
                  >
                    Retrieve Applications
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl py-0 shadow-sm">
              <CardHeader className="px-5 pt-5 pb-3">
                <CardTitle className="text-4 font-bold text-[#953002]">Applications</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {applicationsRetrieved && selectedApprovalListId
                    ? `Showing ${applications.length} applications`
                    : "Click 'Retrieve Applications' to view data"}
                </p>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {!selectedApprovalListId || !applicationsRetrieved ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center text-muted-foreground">
                    <FileText size={36} className="text-gray-300" />
                    <p>Select a list and click Retrieve Applications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button type="button" variant="outline" className="h-8 px-3">
                        <Printer size={14} />
                        Print
                      </Button>
                      <Button
                        type="button"
                        className="h-8 bg-rose-600 px-3 text-white hover:bg-rose-700"
                        onClick={handleDeleteSelectedList}
                        disabled={!selectedApprovalListId}
                      >
                        <Trash2 size={14} />
                        Delete List
                      </Button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-xs font-semibold text-gray-500">
                            <th className="pb-2 pr-3">App ID</th>
                            <th className="pb-2 pr-3">Name</th>
                            <th className="pb-2 pr-3">Decision</th>
                            <th className="pb-2">Reason (If Reject)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map((application) => (
                            <tr key={application.appId} className="align-top">
                              <td className="py-3 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-800">{application.appId}</span>
                                  {application.hasWarning && (
                                    <AlertCircle size={13} className="text-red-500" />
                                  )}
                                </div>
                              </td>
                              <td className="py-3 pr-3 text-gray-700">{application.name}</td>
                              <td className="py-3 pr-3">
                                <Select
                                  value={applicationDecision}
                                  onValueChange={(value) =>
                                    setApplicationDecision(value as ApplicationDecision)
                                  }
                                >
                                  <SelectTrigger className="h-8 min-w-[100px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Approve">Approve</SelectItem>
                                    <SelectItem value="Reject">Reject</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-3">
                                <Input
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  disabled={applicationDecision !== "Reject"}
                                  placeholder="Reason required..."
                                  className={
                                    applicationDecision === "Reject" && rejectReason.trim() === ""
                                      ? "border-red-400 focus-visible:border-red-400 focus-visible:ring-red-200"
                                      : ""
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className="min-w-[106px] bg-[#953002] text-white hover:bg-[#7a2700]"
                        disabled={
                          applicationDecision === "Reject" && rejectReason.trim() === ""
                        }
                      >
                        Proceed
                        <ArrowRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
