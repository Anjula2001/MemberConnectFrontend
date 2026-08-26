'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';

import { apiClient } from '@/lib/api/client';
import { resolveMember } from '@/lib/api/member';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import {
  hasRole,
  PROFILE_CHANGE_DIRECT_APPROVAL_ROLES,
  PROFILE_CHANGE_EDIT_ROLES,
} from '@/lib/permissions';

/**
 * Remittance Amount Change Request Entry (Requirement 02, MMC14–MMC17).
 *
 * The screen is driven entirely by the backend's line rows: one per editable account,
 * each carrying the amount that stood when the request was raised and the amount being
 * asked for. It used to render two hardcoded arrays of demo accounts, let the user add
 * and remove rows freely, and then flatten the lot into a single amount and a single
 * account type on submit — so the per-account detail the SRS is about never reached the
 * server.
 *
 * Accounts are fixed rows here rather than a free list, because MMC14 says the New Value
 * section is "the editable remittance accounts created for the Member" — the member does
 * not invent accounts, they revise the amounts on the ones they hold.
 */

type Line = {
  accountCode: string;
  accountName: string;
  oldAmount: number | null;
  newAmount: number | null;
  minimumAmount: number | null;
  mandatory: boolean | null;
};

type RequestDTO = {
  id?: number;
  requestNo?: string | null;
  memberId?: string | null;
  status?: string | null;
  requestedDate?: string | null;
  rejectReason?: string | null;
  submissionLocation?: string | null;
  processedBy?: string | null;
  memberFullName?: string | null;
  memberNameWithInitials?: string | null;
  memberNic?: string | null;
  lines?: Line[];
};

const money = (v: number | null | undefined) =>
  v == null ? '—' : `Rs. ${Number(v).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

export default function RemittanceChangePage({
  editId,
  memberId,
}: {
  editId?: string;
  memberId?: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const { user } = useAuth();

  const isEditMode = Boolean(editId);

  // MMC17's approval authority, and the client's edit rule: District Office raises a
  // remittance change but neither decides nor revises one.
  const canDecide = hasRole(user?.role, PROFILE_CHANGE_DIRECT_APPROVAL_ROLES);
  const canEdit = hasRole(user?.role, PROFILE_CHANGE_EDIT_ROLES);

  const [request, setRequest] = useState<RequestDTO | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const status = request?.status ?? null;
  const isLocked = isEditMode && !isEditing;
  const isPending =
    status === 'SUBMITTED_FOR_APPROVAL' || status === 'ADDED_TO_BOARD_APPROVAL_LIST';

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    /**
     * The memberId prop is whichever identifier the caller had - the profile Actions
     * menu passes the membership number (MEM-2026-001), older links passed the numeric
     * primary key - so resolveMember picks the right lookup. Every request API is keyed
     * by the membership number, so the member is resolved first and its memberId used.
     * Passing the route param straight through produced "No member found with
     * membership number 1".
     */
    const load = async (): Promise<RequestDTO> => {
      if (editId) {
        const res = await apiClient.get(`/api4/remitance/getRemitanceById/${editId}`);
        return res.data?.data ?? res.data;
      }

      if (!memberId) {
        throw new Error('No member or request was specified.');
      }

      const member = await resolveMember(memberId);
      if (!member?.memberId) {
        throw new Error('This member has no membership number yet.');
      }

      const res = await apiClient.get(
        `/api4/remitance/new/${encodeURIComponent(member.memberId)}`
      );
      return res.data?.data ?? res.data;
    };

    load()
      .then((data) => {
        if (cancelled) return;
        setRequest(data);
        setLines(data.lines ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Could not load the remittance details.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editId, memberId]);

  const setAmount = (code: string, raw: string) => {
    const value = raw === '' ? null : Number(raw);
    setLines((prev) =>
      prev.map((l) => (l.accountCode === code ? { ...l, newAmount: value } : l))
    );
  };

  /**
   * The same minimum the backend enforces on submit, shown inline so the user is told
   * before the round trip. The server check is the one that counts.
   */
  const problemFor = useCallback((line: Line): string | null => {
    if (line.newAmount == null) return 'Enter an amount.';
    if (Number.isNaN(line.newAmount)) return 'Enter a number.';
    if (line.newAmount < 0) return 'Cannot be negative.';
    if (line.minimumAmount != null && line.newAmount < line.minimumAmount) {
      return `Minimum is ${money(line.minimumAmount)}.`;
    }
    return null;
  }, []);

  const hasProblems = lines.some((l) => problemFor(l) !== null);

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (hasProblems) {
      addToast('Correct the highlighted amounts before submitting.', 'destructive');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      memberId: request?.memberId,
      submissionLocation: request?.submissionLocation,
      lines: lines.map((l) => ({ accountCode: l.accountCode, newAmount: l.newAmount })),
    };

    try {
      const res = isEditMode
        ? await apiClient.put(`/api4/remitance/updateRemitance/${editId}`, payload)
        : await apiClient.post('/api4/remitance/saveRemitance', payload);

      const saved: RequestDTO = res.data?.data ?? res.data;
      setRequest(saved);
      setLines(saved.lines ?? lines);
      setIsEditing(false);
      addToast(
        isEditMode
          ? 'Request updated and sent back for approval.'
          : `Remittance change request ${saved.requestNo ?? ''} submitted.`.trim()
      );
      router.push('/membership/profile-changes');
    } catch (err: unknown) {
      addToast(
        err instanceof Error ? err.message : 'Could not submit the request.',
        'destructive'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Decide (MMC17) ──────────────────────────────────────────────────────
  const decide = async (decision: 'APPROVE' | 'REJECT', reason?: string) => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.put(`/api4/remitance/requests/${editId}/decision`, {
        decision,
        rejectReason: reason,
      });
      const saved: RequestDTO = res.data?.data ?? res.data;
      setRequest(saved);
      setLines(saved.lines ?? lines);
      addToast(
        decision === 'APPROVE'
          ? 'Approved. The member’s remittance amounts have been updated.'
          : 'Request rejected.'
      );
      router.push('/membership/profile-changes');
    } catch (err: unknown) {
      addToast(
        err instanceof Error ? err.message : 'Could not record the decision.',
        'destructive'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {loadError}
      </div>
    );
  }

  const totalOld = lines.reduce((s, l) => s + (l.oldAmount ?? 0), 0);
  const totalNew = lines.reduce((s, l) => s + (l.newAmount ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Member details (MMC14) */}
      <div className="mb-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Member ID</p>
          <p className="font-mono font-medium text-gray-800">{request?.memberId ?? '—'}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Name with Initials
          </p>
          <p className="font-medium text-gray-800">
            {request?.memberNameWithInitials ?? request?.memberFullName ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">NIC</p>
          <p className="font-medium text-gray-800">{request?.memberNic ?? '—'}</p>
        </div>
      </div>

      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Back"
            onClick={() =>
              router.push(
                isEditMode
                  ? '/membership/profile-changes'
                  : memberId
                    ? `/membership/directory/${memberId}`
                    : '/membership/directory'
              )
            }
            className="rounded-full border border-slate-200 bg-white p-2 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-[#953002]">
              {isEditMode
                ? `Remittance Amount Change ${request?.requestNo ?? ''}`.trim()
                : 'New Remittance Amount Change'}
            </h1>
            {request?.requestedDate && (
              <span className="mt-1 inline-block rounded bg-gray-200 px-2 py-0.5 font-mono text-[12px] text-gray-600">
                Requested {request.requestedDate}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {status && (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-900">
              {status.replace(/_/g, ' ')}
            </span>
          )}

          {isEditMode && !isEditing && canEdit && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              disabled={isSubmitting}
              className="rounded-lg border border-[#953002] px-4 py-2 text-sm font-medium text-[#953002] transition-all hover:bg-[#953002]/5 disabled:opacity-60"
            >
              ✏️ Edit
            </button>
          )}

          {isEditMode && isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700"
            >
              Cancel
            </button>
          )}

          {(!isEditMode || isEditing) && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-[#953002] px-6 py-2 font-bold text-white transition-all hover:bg-[#722904] disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              💾 Submit
            </button>
          )}

          {isEditMode && !isEditing && isPending && canDecide && (
            <>
              <button
                type="button"
                onClick={() => decide('APPROVE')}
                disabled={isSubmitting}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-700 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={isSubmitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:opacity-60"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </header>

      {request?.rejectReason && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span className="font-semibold">Reject reason:</span> {request.rejectReason}
          {request.processedBy && (
            <span className="ml-2 text-red-600">— {request.processedBy}</span>
          )}
        </div>
      )}

      {/* Amounts */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-[#953002]">Remittance Amounts</h2>
        <p className="mb-6 text-sm font-medium text-gray-500">
          Only the accounts this member may change are listed. Each amount is checked
          against its configured minimum on submit.
        </p>

        {lines.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 text-center text-sm text-gray-500">
            This member has no editable remittance accounts.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Account</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase text-right">Current Value</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase text-right">New Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const problem = problemFor(line);
                  return (
                    <TableRow key={line.accountCode} className="hover:bg-neutral-50">
                      <TableCell className="px-4 py-4">
                        <span className="font-medium text-neutral-800">{line.accountName}</span>
                        {line.minimumAmount != null && (
                          <span className="block text-[11px] text-neutral-500">
                            Minimum {money(line.minimumAmount)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right tabular-nums text-neutral-700">
                        {money(line.oldAmount)}
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.newAmount ?? ''}
                          disabled={isLocked}
                          onChange={(e) => setAmount(line.accountCode, e.target.value)}
                          className={`w-40 rounded-lg border px-3 py-2 text-right tabular-nums ${
                            problem && !isLocked
                              ? 'border-red-400 bg-red-50'
                              : 'border-gray-300 bg-white'
                          } ${isLocked ? 'bg-gray-100 text-gray-600' : ''}`}
                        />
                        {problem && !isLocked && (
                          <span className="mt-1 block text-[11px] text-red-600">{problem}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-[#fafafa] font-semibold hover:bg-[#fafafa]">
                  <TableCell className="px-4 py-4 text-neutral-800">Total</TableCell>
                  <TableCell className="px-4 py-4 text-right tabular-nums text-neutral-700">
                    {money(totalOld)}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-right tabular-nums text-neutral-900">
                    {money(totalNew)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Reject reason (MMC17) */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Reject this request</h3>
            <p className="mt-1 text-sm text-gray-600">
              The reason is sent to the member and stored against the request.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              autoFocus
              className="mt-4 w-full rounded-lg border border-gray-300 p-3 text-sm"
              placeholder="Why is this being rejected?"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || isSubmitting}
                onClick={() => {
                  setShowRejectModal(false);
                  void decide('REJECT', rejectReason.trim());
                  setRejectReason('');
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
