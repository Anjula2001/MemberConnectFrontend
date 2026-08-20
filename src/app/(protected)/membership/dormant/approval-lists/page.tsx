"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, Printer, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth-context";
import {
  DELETE_RIGHTS_ROLES,
  DORMANT_BOARD_ROLES,
  hasRole,
} from "@/lib/permissions";
import {
  DORMANT_STATUS_LABELS,
  deleteDormantApprovalList,
  formatDormantDate,
  getDormantApprovalLists,
  processDormantApprovalList,
  type DormantApprovalList,
  type DormantMember,
  type DormantMemberDecision,
} from "@/lib/api/dormant";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

type MeetingFilter = "all" | "thisMonth" | "lastMonth" | "datePeriod";

interface RowDecision {
  decision: "Approve" | "Reject";
  rejectReason: string;
}

function getErrorMessage(error: unknown): string {
  const axiosLike = error as { response?: { data?: { message?: string } | string } };
  const data = axiosLike?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object" && data.message) return data.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function DormantApprovalListsInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const canManageLists = hasRole(user?.role, DORMANT_BOARD_ROLES);
  const canDeleteList = hasRole(user?.role, DELETE_RIGHTS_ROLES);

  const [lists, setLists] = useState<DormantApprovalList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [meetingFilter, setMeetingFilter] = useState<MeetingFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // MMD17: every row starts at Approve, per the SRS. The reason field only
  // becomes relevant — and mandatory — when a row is flipped to Reject.
  const [decisions, setDecisions] = useState<Record<string, RowDecision>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [actualMeetingDate, setActualMeetingDate] = useState(todayIso());
  const [boardRemarks, setBoardRemarks] = useState("");
  const [signedSheet, setSignedSheet] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const showBanner = useCallback((type: "success" | "error", text: string) => {
    setBanner({ type, text });
    window.setTimeout(() => setBanner(null), 6000);
  }, []);

  const loadLists = useCallback(async () => {
    if (!canManageLists) return;
    setLoading(true);
    try {
      setLists(await getDormantApprovalLists());
    } catch (error) {
      showBanner("error", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [canManageLists, showBanner]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  // MMD13's "do you want to view the list?" lands here with ?listId=...
  useEffect(() => {
    const fromQuery = searchParams.get("listId");
    if (fromQuery) setSelectedListId(fromQuery);
  }, [searchParams]);

  const filteredLists = useMemo(() => {
    const now = new Date();
    return lists.filter((list) => {
      const raw = list.boardMeetingDate;
      if (meetingFilter === "all" || !raw) return meetingFilter === "all";
      const date = new Date(raw);

      if (meetingFilter === "thisMonth") {
        return (
          date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
        );
      }
      if (meetingFilter === "lastMonth") {
        const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          date.getMonth() === last.getMonth() && date.getFullYear() === last.getFullYear()
        );
      }
      if (!fromDate && !toDate) return true;
      if (fromDate && raw < fromDate) return false;
      if (toDate && raw > toDate) return false;
      return true;
    });
  }, [lists, meetingFilter, fromDate, toDate]);

  const selected = useMemo(
    () => lists.find((l) => l.listId === selectedListId) ?? null,
    [lists, selectedListId]
  );

  const isProcessed = selected?.status === "PROCESSED";

  // Reset the decision map whenever a different list is opened, so a verdict
  // typed against one meeting cannot leak into another.
  useEffect(() => {
    if (!selected || selected.status === "PROCESSED") {
      setDecisions({});
      return;
    }
    const seeded: Record<string, RowDecision> = {};
    selected.members.forEach((m) => {
      seeded[m.memberId] = { decision: "Approve", rejectReason: "" };
    });
    setDecisions(seeded);
    setActualMeetingDate(selected.boardMeetingDate?.slice(0, 10) ?? todayIso());
    setBoardRemarks("");
    setSignedSheet(null);
  }, [selected]);

  const setRow = (memberId: string, patch: Partial<RowDecision>) => {
    setDecisions((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] ?? { decision: "Approve", rejectReason: "" }), ...patch },
    }));
  };

  const approvedCount = useMemo(
    () => Object.values(decisions).filter((d) => d.decision === "Approve").length,
    [decisions]
  );
  const rejectedCount = useMemo(
    () => Object.values(decisions).filter((d) => d.decision === "Reject").length,
    [decisions]
  );

  /**
   * MMD17 makes the reason mandatory for every rejected record before the user
   * may proceed. The server enforces this too and refuses the whole list — this
   * is what stops the user finding that out after filling in a meeting.
   */
  const missingReasons = useMemo(
    () =>
      Object.entries(decisions)
        .filter(([, d]) => d.decision === "Reject" && !d.rejectReason.trim())
        .map(([memberId]) => memberId),
    [decisions]
  );

  const canProceed =
    !!selected &&
    !isProcessed &&
    selected.members.length > 0 &&
    missingReasons.length === 0 &&
    Object.keys(decisions).length === selected.members.length;

  const handleProcess = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      let approvedListDocument: string | undefined;

      if (signedSheet) {
        // Best effort: a failed upload must not lose the board's decisions, so
        // the filename is kept as a reference and the meeting still records.
        try {
          const form = new FormData();
          form.append("file", signedSheet);
          const { data } = await apiClient.post<{ fileName?: string; url?: string }>(
            "/api/file/upload",
            form
          );
          approvedListDocument = data?.url ?? data?.fileName ?? signedSheet.name;
        } catch {
          approvedListDocument = signedSheet.name;
        }
      }

      const memberDecisions: DormantMemberDecision[] = selected.members.map((m) => {
        const row = decisions[m.memberId];
        return {
          memberId: m.memberId,
          decision: row.decision,
          rejectReason: row.decision === "Reject" ? row.rejectReason.trim() : undefined,
        };
      });

      const result = await processDormantApprovalList(selected.listId, {
        actualMeetingDate,
        memberDecisions,
        boardRemarks: boardRemarks.trim() || undefined,
        approvedListDocument,
      });

      setShowConfirm(false);
      showBanner(
        "success",
        `Board decisions recorded for ${result.listId}: ${result.approvedCount ?? 0} inactivated, ${
          result.rejectedCount ?? 0
        } returned to Selected for Dormant.`
      );
      await loadLists();
    } catch (error) {
      setShowConfirm(false);
      showBanner("error", getErrorMessage(error));
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await deleteDormantApprovalList(selected.listId);
      setShowDelete(false);
      setSelectedListId(null);
      showBanner("success", `Inactivation Approval List ${selected.listId} deleted.`);
      await loadLists();
    } catch (error) {
      setShowDelete(false);
      showBanner("error", getErrorMessage(error));
    }
  };

  // Server-side @PreAuthorize is the real gate; this keeps a role that cannot
  // use the screen from being shown a page of failing requests.
  if (user && !canManageLists) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="h-8 w-8 text-[#8B4513]" />
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Inactivation Approval Lists are restricted to Head Office and Board
          Secretariat personnel.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-[#8B4513]">
          Inactivation Approval Lists for Dormant Members
        </h1>
        <Link href="/membership/dormant">
          <Button variant="outline" size="sm">
            Back to Dormant Members
          </Button>
        </Link>
      </div>

      {banner && (
        <div
          className={`rounded-md border px-4 py-2 text-sm ${
            banner.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* MMD14 — retrieve lists by board meeting date */}
      <Card className="border-2 border-[#ffffff]">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg text-[#8B4513]">Retrieve Approval Lists</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-56">
              <label className="mb-2 block text-sm font-medium text-muted-foreground">
                Board Meeting Date
              </label>
              <Select
                value={meetingFilter}
                onValueChange={(v) => setMeetingFilter(v as MeetingFilter)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="datePeriod">Date Period</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {meetingFilter === "datePeriod" && (
              <>
                <div className="w-44">
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    From
                  </label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="w-44">
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">
                    To
                  </label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </>
            )}

            <Button
              onClick={() => void loadLists()}
              disabled={loading}
              className="bg-[#8B4513] text-white hover:bg-[#A0522D]"
            >
              {loading ? "Retrieving..." : "Retrieve"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-[#ffffff]">
        <CardHeader className="bg-muted/30">
          <CardTitle className="text-lg text-[#8B4513]">
            Approval Lists ({filteredLists.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead>List ID</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Board Meeting</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLists.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No Inactivation Approval Lists found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLists.map((list) => (
                  <TableRow
                    key={list.listId}
                    className={list.listId === selectedListId ? "bg-amber-50" : undefined}
                  >
                    <TableCell className="font-medium">{list.listId}</TableCell>
                    <TableCell>{list.memberIds.length}</TableCell>
                    <TableCell>{formatDormantDate(list.boardMeetingDate)}</TableCell>
                    <TableCell>
                      {list.status === "PROCESSED" ? (
                        <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">
                          Processed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Created
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{list.decision ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="bg-[#8B4513] text-white hover:bg-[#A0522D]"
                        onClick={() => setSelectedListId(list.listId)}
                      >
                        Retrieve Dormant Members
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <Card className="border-2 border-[#ffffff]">
          <CardHeader className="bg-muted/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg text-[#8B4513]">
                {selected.listId} &mdash; {selected.members.length} Dormant Member(s)
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {/* MMD18: a processed list offers neither Print nor Process. */}
                {!isProcessed && (
                  <Link
                    href={`/membership/dormant/approval-lists/print/${selected.listId}`}
                    target="_blank"
                  >
                    <Button variant="outline" size="sm">
                      <Printer className="mr-1 h-4 w-4" />
                      Print
                    </Button>
                  </Link>
                )}
                {!isProcessed && canDeleteList && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => setShowDelete(true)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete List
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {/* MMD18 — read-only banner naming who processed it and when */}
            {isProcessed && (
              <div className="mb-4 flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-gray-500" />
                <div>
                  <p className="font-medium text-neutral-800">
                    This list was processed and can no longer be changed.
                  </p>
                  <p className="text-muted-foreground">
                    Processed by {selected.processedBy ?? "-"} on{" "}
                    {formatDormantDate(selected.processedAt)} &middot; Decision:{" "}
                    {selected.decision ?? "-"} &middot; Actual board meeting:{" "}
                    {formatDormantDate(selected.actualMeetingDate)}
                  </p>
                  {selected.boardRemarks && (
                    <p className="mt-1 text-muted-foreground">
                      Board remarks: {selected.boardRemarks}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead>Member ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>NIC</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40">Decision</TableHead>
                    <TableHead className="w-64">Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.members.map((m: DormantMember) => {
                    const row = decisions[m.memberId];
                    return (
                      <TableRow key={m.memberId}>
                        <TableCell>
                          <Link
                            href={`/membership/directory/${m.id}`}
                            className="font-medium text-[#8B4513] underline-offset-2 hover:underline"
                          >
                            {m.memberId}
                          </Link>
                          {/* The board should not inactivate somebody who has
                              transacted since the list was drawn up without at
                              least being told. */}
                          {m.activitySinceListing && (
                            <span className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
                              <AlertTriangle className="h-3 w-3" />
                              Activity since listing
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{m.nameWithInitials || m.fullName}</TableCell>
                        <TableCell>{m.nic}</TableCell>
                        <TableCell>{m.location}</TableCell>
                        <TableCell>{formatDormantDate(m.lastActivityDate)}</TableCell>
                        <TableCell>
                          {DORMANT_STATUS_LABELS[m.status] ?? m.status}
                        </TableCell>

                        <TableCell>
                          {isProcessed ? (
                            <Badge
                              className={
                                m.decision === "Reject"
                                  ? "bg-red-100 text-red-800 hover:bg-red-100"
                                  : "bg-green-100 text-green-800 hover:bg-green-100"
                              }
                            >
                              {m.decision ?? "-"}
                            </Badge>
                          ) : (
                            <Select
                              value={row?.decision ?? "Approve"}
                              onValueChange={(v) =>
                                setRow(m.memberId, { decision: v as "Approve" | "Reject" })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Approve">Approve</SelectItem>
                                <SelectItem value="Reject">Reject</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>

                        <TableCell>
                          {isProcessed ? (
                            <span className="text-sm text-muted-foreground">
                              {m.rejectReason ?? "-"}
                            </span>
                          ) : (
                            <Input
                              value={row?.rejectReason ?? ""}
                              disabled={row?.decision !== "Reject"}
                              placeholder={
                                row?.decision === "Reject" ? "Reason (required)" : "-"
                              }
                              onChange={(e) =>
                                setRow(m.memberId, { rejectReason: e.target.value })
                              }
                              className={
                                row?.decision === "Reject" && !row.rejectReason.trim()
                                  ? "border-red-300"
                                  : undefined
                              }
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {!isProcessed && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {approvedCount} to inactivate &middot; {rejectedCount} to return
                  {missingReasons.length > 0 && (
                    <span className="ml-2 font-medium text-red-600">
                      &mdash; a reason is required for every rejected member
                    </span>
                  )}
                </p>
                <Button
                  disabled={!canProceed}
                  onClick={() => setShowConfirm(true)}
                  className="bg-[#8B4513] text-white hover:bg-[#A0522D] disabled:opacity-50"
                >
                  Proceed
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MMD17 — confirmation popup */}
      {showConfirm && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#8B4513]">Confirm Board Decision</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selected.listId} &mdash; this cannot be undone once processed.
            </p>

            <div className="my-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xl font-bold">{selected.members.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="rounded-md border bg-green-50 p-3">
                <p className="text-xl font-bold text-green-700">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="rounded-md border bg-red-50 p-3">
                <p className="text-xl font-bold text-red-700">{rejectedCount}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                  Board Meeting Date
                </label>
                <Input value={formatDormantDate(selected.boardMeetingDate)} disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                  Actual Board Meeting Date
                </label>
                {/* The meeting may have been postponed; the date it actually sat
                    is the authority for the change. */}
                <Input
                  type="date"
                  max={todayIso()}
                  value={actualMeetingDate}
                  onChange={(e) => setActualMeetingDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                  Board Remarks (optional)
                </label>
                <Input
                  value={boardRemarks}
                  onChange={(e) => setBoardRemarks(e.target.value)}
                  placeholder="Any note recorded at the meeting"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                  Signed Approval Sheet (optional)
                </label>
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setSignedSheet(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleProcess()}
                disabled={processing}
                className="bg-[#8B4513] text-white hover:bg-[#A0522D]"
              >
                {processing ? "Processing..." : "Process"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MMD15 */}
      {showDelete && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#8B4513]">Delete Approval List</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Do you want to delete the selected Inactivation Approval List? The{" "}
              {selected.members.length} member(s) on it will return to &ldquo;Selected for
              Dormant&rdquo;.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDelete(false)}>
                No
              </Button>
              <Button
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => void handleDelete()}
              >
                Yes, delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DormantApprovalListsPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading...</div>}>
      <DormantApprovalListsInner />
    </Suspense>
  );
}
