"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Eye, ArrowLeft, RefreshCw, X, Calendar, Hash, ClipboardList, Users, Trash2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getTerminationApprovalLists,
  deleteTerminationApprovalList,
  type TerminationApprovalListDTO,
} from "@/lib/api/terminationApprovalLists";

// ─── Status badge helper ───────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  CREATED:   { color: "bg-yellow-100 text-yellow-800 border border-yellow-300",  label: "Created" },
  SUBMITTED: { color: "bg-blue-100 text-blue-800 border border-blue-300",        label: "Submitted" },
  APPROVED:  { color: "bg-green-100 text-green-800 border border-green-300",     label: "Approved" },
  REJECTED:  { color: "bg-red-100 text-red-800 border border-red-300",           label: "Rejected" },
};

function StatusBadge({ status }: { status?: string }) {
  const key = (status ?? "").toUpperCase();
  const cfg = STATUS_CONFIG[key] ?? { color: "bg-gray-100 text-gray-700 border border-gray-300", label: status ?? "—" };
  return (
    <Badge variant="secondary" className={`${cfg.color} hover:${cfg.color} font-medium`}>
      {cfg.label}
    </Badge>
  );
}

// ─── Detail modal ──────────────────────────────────────────────────────────────
function ApprovalListDetailModal({
  list,
  onClose,
  onDelete,
}: {
  list: TerminationApprovalListDTO;
  onClose: () => void;
  onDelete: (list: TerminationApprovalListDTO) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-[600px] rounded-xl border bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-3 border-b">
          <div>
            <h2 className="text-xl font-bold text-[#8B4513]">
              Termination Approval List
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {list.listId ?? `List #${list.id}`}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-gray-500 h-8 w-8 p-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Hash size={12} /> List ID
              </span>
              <span className="text-sm font-medium text-gray-800">
                {list.listId ?? `#${list.id}`}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <ClipboardList size={12} /> Status
              </span>
              <StatusBadge status={list.status} />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Calendar size={12} /> Board Meeting Date
              </span>
              <span className="text-sm text-gray-700">
                {list.boardMeetingDate ?? "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Calendar size={12} /> Actual Meeting Date
              </span>
              <span className="text-sm text-gray-700">
                {list.actualMeetingDate ?? "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Users size={12} /> Termination Requests
              </span>
              <span className="text-sm font-semibold text-[#8B4513]">
                {list.terminationIds?.length ?? 0}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Created At
              </span>
              <span className="text-sm text-gray-700">
                {list.createdAt ? new Date(list.createdAt).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>

          {/* Decision / Remarks */}
          {list.decision && (
            <div className="rounded-lg bg-gray-50 border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Decision</span>
                <Badge
                  variant="secondary"
                  className={
                    list.decision === "Approve"
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-red-100 text-red-800 border border-red-300"
                  }
                >
                  {list.decision}
                </Badge>
              </div>
              {list.rejectReason && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reject Reason</span>
                  <p className="text-sm text-gray-700 mt-0.5">{list.rejectReason}</p>
                </div>
              )}
              {list.boardRemarks && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Board Remarks</span>
                  <p className="text-sm text-gray-700 mt-0.5">{list.boardRemarks}</p>
                </div>
              )}
              {list.processedBy && (
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Processed By</span>
                  <p className="text-sm text-gray-700 mt-0.5">{list.processedBy}</p>
                </div>
              )}
            </div>
          )}

          {/* Termination IDs */}
          {list.terminationIds && list.terminationIds.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Included Termination Request IDs
              </p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {list.terminationIds.map((tid) => (
                  <span
                    key={tid}
                    className="inline-block px-2 py-0.5 rounded-full bg-[#8B4513]/10 text-[#8B4513] text-xs font-medium border border-[#8B4513]/20"
                  >
                    {tid}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-5">
          <Button
            type="button"
            variant="ghost"
            className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(list)}
          >
            <Trash2 size={15} />
            Delete List
          </Button>
          <Button
            type="button"
            className="bg-[#8B4513] text-white hover:bg-[#A0522D]"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}


// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TerminationApprovalListsPage() {
  const router = useRouter();
  const [approvalLists, setApprovalLists] = useState<TerminationApprovalListDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<TerminationApprovalListDTO | null>(null);

  // ── Delete state ──────────────────────────────────────────────────────────
  const [pendingDeleteList, setPendingDeleteList] = useState<TerminationApprovalListDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const loadApprovalLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTerminationApprovalLists();
      setApprovalLists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load approval lists.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadApprovalLists();
  }, [loadApprovalLists]);

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3000);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // Opens the confirmation modal (can be called from the table row OR the detail modal)
  const handleRequestDelete = (list: TerminationApprovalListDTO) => {
    setSelectedList(null);          // close detail modal if open
    setPendingDeleteList(list);     // open confirmation
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteList?.listId) return;
    try {
      setIsDeleting(true);
      await deleteTerminationApprovalList(pendingDeleteList.listId);
      setApprovalLists((prev) =>
        prev.filter((l) => l.listId !== pendingDeleteList.listId)
      );
      setPendingDeleteList(null);
      setToastMessage({ text: "Termination approval list deleted successfully.", ok: true });
    } catch (err) {
      console.error(err);
      setToastMessage({ text: "Failed to delete termination approval list.", ok: false });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/membership/termination")}
            variant="ghost"
            size="sm"
            className="gap-2 text-[#8B4513] hover:text-[#A0522D] hover:bg-[#8B4513]/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-[#8B4513]">
            Termination Approval Lists
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-[#8B4513] text-[#8B4513] hover:bg-[#8B4513] hover:text-white"
          onClick={() => void loadApprovalLists()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">All Termination Approval Lists</h2>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {approvalLists.length} list{approvalLists.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-500 px-5">
                List ID
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-500">
                Board Meeting Date
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-500">
                No. of Requests
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-500">
                Created At
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-500">
                Status
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wide text-gray-500 text-center">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-[#8B4513]/50" />
                    <span>Loading approval lists…</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-red-600 font-medium">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#8B4513] text-[#8B4513] hover:bg-[#8B4513] hover:text-white"
                      onClick={() => void loadApprovalLists()}
                    >
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : approvalLists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No termination approval lists found.
                </TableCell>
              </TableRow>
            ) : (
              approvalLists.map((list) => (
                <TableRow key={list.id ?? list.listId} className="hover:bg-gray-50/60">
                  <TableCell className="px-5 font-medium text-[#8B4513]">
                    {list.listId ?? `#${list.id}`}
                  </TableCell>
                  <TableCell className="text-gray-700">
                    {list.boardMeetingDate ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 font-semibold text-gray-800">
                      <Users size={13} className="text-gray-400" />
                      {list.terminationIds?.length ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {list.createdAt ? new Date(list.createdAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={list.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedList(list)}
                        className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRequestDelete(list)}
                        className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail modal */}
      {selectedList && (
        <ApprovalListDetailModal
          list={selectedList}
          onClose={() => setSelectedList(null)}
          onDelete={handleRequestDelete}
        />
      )}

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      {pendingDeleteList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-xl border bg-white shadow-2xl">
            <div className="flex items-start justify-between px-6 pt-6">
              <div>
                <h2 className="text-2xl font-bold text-red-600">Delete List</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {pendingDeleteList.listId}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-500 h-8 w-8 p-0"
                onClick={() => setPendingDeleteList(null)}
                disabled={isDeleting}
                aria-label="Close"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="px-6 pb-6 pt-4">
              <p className="text-base leading-relaxed text-gray-600">
                Do you want to delete the selected Termination Approval List? All attached
                termination requests will be rolled back to their original status.
              </p>

              <div className="mt-7 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-gray-700"
                  onClick={() => setPendingDeleteList(null)}
                  disabled={isDeleting}
                >
                  No, Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 text-white hover:bg-red-700"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                >
                  {isDeleting ? "Deleting…" : "Yes, Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border bg-white px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <CheckCircle2
              size={16}
              className={toastMessage.ok ? "text-green-600" : "text-red-600"}
            />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

