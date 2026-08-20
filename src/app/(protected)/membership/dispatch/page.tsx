"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  History,
  Loader2,
  Lock,
  RotateCcw,
  Send,
  X,
} from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Checkbox } from "@/src/components/ui/checkbox";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

import type { MemberDTO } from "@/lib/api/member";
import {
  createDispatch,
  getDispatchCandidates,
  getDispatches,
  type MemberDocumentDispatchDTO,
} from "@/lib/api/membershipDocuments";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { DISPATCH_ROLES, hasRole } from "@/lib/permissions";

const formatDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * Membership Document Dispatch (MR18).
 *
 * The candidate list comes from the backend, which already applies the
 * "all required documentation printed" rule — that rule is a server-side
 * configuration setting, so it is deliberately not re-implemented here.
 */
export default function MemberDocumentationDispatchPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const canDispatch = hasRole(user?.role, DISPATCH_ROLES);

  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  // window.confirm() blocked synchronously; these hold what each dialog is asking about.
  const [confirmingDispatch, setConfirmingDispatch] = useState(false);
  /** Dispatch number whose report has just been offered, or null when nothing is offered. */
  const [reportOffer, setReportOffer] = useState<string | null>(null);
  const [hasRetrieved, setHasRetrieved] = useState(false);

  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<MemberDocumentDispatchDTO[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const retrieve = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDispatchCandidates(true);
      setMembers(data);
      setSelected([]);
      setHasRetrieved(true);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Failed to retrieve members",
        "destructive"
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (canDispatch) void retrieve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDispatch]);

  const openHistory = async () => {
    setShowHistory(true);
    setLoadingHistory(true);
    try {
      setHistory(await getDispatches());
      setHistoryPage(0);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Failed to load dispatch history",
        "destructive"
      );
    } finally {
      setLoadingHistory(false);
    }
  };

  /** Asks for confirmation; runDispatch does the work once the dialog is confirmed. */
  const handleDispatch = () => {
    if (selected.length === 0) return;
    setConfirmingDispatch(true);
  };

  const runDispatch = async () => {
    if (selected.length === 0) return;
    setDispatching(true);
    try {
      const dispatch = await createDispatch(selected);
      setConfirmingDispatch(false);
      addToast(`Dispatch ${dispatch.dispatchNo} recorded for ${dispatch.memberCount} member(s).`);

      // Offer the report through a dialog rather than a second confirm(). The refresh
      // below runs either way — the dispatch is recorded whether or not the report is
      // downloaded, so declining must not leave the list stale.
      if (dispatch.dispatchNo) {
        setReportOffer(dispatch.dispatchNo);
      }
      await retrieve();
    } catch (error) {
      setConfirmingDispatch(false);
      addToast(
        error instanceof Error ? error.message : "Failed to record dispatch",
        "destructive"
      );
    } finally {
      setDispatching(false);
    }
  };

  const openDispatchReport = (dispatchNo: string) => {
    setReportOffer(null);
    window.open(
      `/membership/dispatch/report/${encodeURIComponent(dispatchNo)}`,
      "_blank"
    );
  };

  const selectableIds = members.filter((m) => m.id).map((m) => m.id as number);
  const allChecked = selectableIds.length > 0 && selected.length === selectableIds.length;

  if (user && !canDispatch) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600">
          <Lock className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-neutral-800">Access Restricted</h2>
        <p className="mt-2 max-w-md text-sm text-neutral-500">
          Membership documentation dispatch is restricted to Head Office and District Office personnel.
        </p>
      </div>
    );
  }

  const pagedHistory = history.slice(historyPage * 10, historyPage * 10 + 10);

  return (
    <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4 md:p-6">
      <div className="max-w-6xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-[#9f3b07]">
              Member Documentation Dispatch
            </h1>
            <p className="text-sm text-muted-foreground">
              Confirm which members have had their membership documentation posted (MR18).
            </p>
          </div>
          <Button type="button" variant="outline" className="h-9" onClick={openHistory}>
            <History className="h-4 w-4" />
            View Previous Dispatch Details
          </Button>
        </div>

        <Card className="rounded-xl py-0">
          <CardHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-3">
            <CardTitle className="text-base text-[#953002]">
              Ready to Dispatch {hasRetrieved ? `(${members.length})` : ""}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="h-8 px-3" onClick={retrieve} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Retrieve
              </Button>
              <Button
                type="button"
                onClick={handleDispatch}
                disabled={selected.length === 0 || dispatching}
                className="h-8 bg-[#9e3600] px-3 text-white hover:bg-[#8b2f00]"
              >
                {dispatching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Update Dispatch {selected.length > 0 ? `(${selected.length})` : ""}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allChecked}
                        onCheckedChange={(c) => setSelected(c ? selectableIds : [])}
                        disabled={selectableIds.length === 0}
                        className="data-[state=checked]:border-[#9e3600] data-[state=checked]:bg-[#9e3600]"
                      />
                    </TableHead>
                    <TableHead>Member ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Documents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Checkbox
                          checked={selected.includes(m.id as number)}
                          onCheckedChange={(c) =>
                            setSelected((prev) =>
                              c ? [...prev, m.id as number] : prev.filter((x) => x !== m.id)
                            )
                          }
                          className="data-[state=checked]:border-[#9e3600] data-[state=checked]:bg-[#9e3600]"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{m.memberId ?? "—"}</TableCell>
                      <TableCell>{m.nameWithInitials || m.fullName || "—"}</TableCell>
                      <TableCell className="max-w-[280px] text-sm text-neutral-600">
                        {m.permanentPrivateAddress ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {[
                            ["Card", m.membershipCardPrintedAt],
                            ["Signature", m.signatureCardPrintedAt],
                            ["Passbook", m.passbookPrintedAt],
                          ].map(([label, at]) => (
                            <Badge
                              key={label as string}
                              className={
                                at
                                  ? "border border-green-300 bg-green-100 text-green-700 hover:bg-green-100"
                                  : "border border-neutral-300 bg-neutral-100 text-neutral-500 hover:bg-neutral-100"
                              }
                            >
                              {at ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
                              {label as string}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {hasRetrieved && members.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-sm text-neutral-500">
                        No members are ready to dispatch. Members appear here once their
                        membership documentation has been printed.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-base font-semibold text-[#953002]">Previous Dispatches</h2>
              <button type="button" onClick={() => setShowHistory(false)} aria-label="Close">
                <X className="h-4 w-4 text-neutral-500" />
              </button>
            </div>
            <div className="px-5 py-4">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                </div>
              ) : history.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-500">
                  No dispatches have been recorded yet.
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dispatch No</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead className="text-right">Report</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedHistory.map((d) => (
                        <TableRow key={d.dispatchNo}>
                          <TableCell className="font-medium">{d.dispatchNo}</TableCell>
                          <TableCell>{formatDate(d.dispatchDate)}</TableCell>
                          <TableCell>{d.memberCount ?? 0}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() =>
                                window.open(
                                  `/membership/dispatch/report/${encodeURIComponent(d.dispatchNo ?? "")}`,
                                  "_blank"
                                )
                              }
                            >
                              <Download className="h-3 w-3" />
                              Report
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {history.length > 10 && (
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={historyPage === 0}
                        onClick={() => setHistoryPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-neutral-500">
                        {historyPage * 10 + 1}–{Math.min((historyPage + 1) * 10, history.length)} of{" "}
                        {history.length}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={(historyPage + 1) * 10 >= history.length}
                        onClick={() => setHistoryPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDispatch}
        title="Record Dispatch"
        subtitle={`${selected.length} member${selected.length === 1 ? "" : "s"} selected`}
        message={`Mark membership documentation as dispatched for ${selected.length} member${selected.length === 1 ? "" : "s"}?`}
        confirmLabel="Yes, Dispatch"
        busy={dispatching}
        busyLabel="Recording..."
        onCancel={() => setConfirmingDispatch(false)}
        onConfirm={() => void runDispatch()}
      />

      <ConfirmDialog
        open={reportOffer !== null}
        title="Dispatch Recorded"
        subtitle={reportOffer ?? undefined}
        message="Download the Dispatch Report now?"
        confirmLabel="Download Report"
        cancelLabel="Not now"
        onCancel={() => setReportOffer(null)}
        onConfirm={() => {
          if (reportOffer) openDispatchReport(reportOffer);
        }}
      />
    </div>
  );
}
