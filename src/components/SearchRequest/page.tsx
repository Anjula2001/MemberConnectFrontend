"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Loader2, FileCheck2, ListChecks, Trash2, ArrowUp, RotateCcw } from 'lucide-react';

import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { humanStatus } from '@/lib/statusBadge';
import { StatusBadge } from '@/src/components/ui/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import {
  TablePagination,
  clampPage,
  pageSlice,
} from '@/src/components/ui/table-pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { useRouter } from 'next/navigation';

import { apiClient } from '@/lib/api/client';
import { getEducationalDistricts } from '@/lib/api/education';
import MultiSelect from './MultiSelect';
import ConfirmDialog from '@/src/components/membership/ConfirmDialog';
import { useAuth } from '@/lib/auth-context';
import {
  canSelectAllLocations,
  hasRole,
  PROFILE_CHANGE_APPROVAL_LIST_ROLES,
  PROFILE_CHANGE_DELETE_ROLES,
} from '@/lib/permissions';
import { createBoardApprovalList } from '@/lib/api/boardApprovalLists';
import { getBoardMeetings, type BoardMeetingDTO } from '@/lib/api/boardMeeting';
import {
  isListable,
  searchProfileChanges,
  statusOptionsFor,
  type ProfileChangeListItem,
  type ProfileChangeSortBy,
  type ProfileChangeStatus,
  type ProfileChangeType,
  type RequestReceivedOn,
} from '@/lib/api/profileChanges';

/**
 * "All Member Profile Change Requests List" — Requirement 02, MMC02 / MMC06 / MMC15 /
 * MMC19.
 *
 * One screen across all request types, served by a single backend query: Type, Request
 * Received On, multi-select Status (including All), a search over the member's names /
 * number / NIC, and Sort with a direction.
 *
 * Location is a multi-select that follows MMC02: auto-selected and disabled for a user
 * with access to a single district, enabled and defaulted to "All" for a user with
 * national access. An earlier version of this screen had no Location control at all.
 *
 * The previous version called each type's "get all" endpoint and filtered the results
 * in the browser, which is why Location, Received On and Sort did not exist, Status was
 * a single select defaulting to ALL, and the search box was bound to state that nothing
 * ever read.
 */

const TYPE_OPTIONS: { value: ProfileChangeType; label: string }[] = [
  { value: 'BASIC_PROFILE', label: 'Basic Profile Changes' },
  { value: 'NAME', label: 'Name Changes' },
  { value: 'REMITTANCE', label: 'Remittance Amount Changes' },
  { value: 'NOMINEE', label: 'Nominee Changes' },
  { value: 'MEMBER_TRANSFER', label: 'Member Transfers' },
];

const RECEIVED_ON_OPTIONS: { value: RequestReceivedOn; label: string }[] = [
  { value: 'ALL_DAYS', label: 'All Days' },
  { value: 'THIS_MONTH', label: 'This Month' },
  { value: 'THIS_AND_LAST_MONTH', label: 'This and last month' },
  { value: 'DATE_PERIOD', label: 'Date Period' },
];

const SORT_OPTIONS: { value: ProfileChangeSortBy; label: string }[] = [
  { value: 'REQUESTED_DATE', label: 'Requested Date' },
  { value: 'STATUS', label: 'Status' },
  { value: 'MEMBER_ID', label: 'Member ID' },
];

/** Sentinel for the Status filter's "All" entry — sending no statuses means all. */
const ALL_STATUSES = 'ALL';

/** Same idea for Location: "All" means send no location filter at all. */
const ALL_LOCATIONS = 'ALL';


export default function ProfileChangeRequests() {
  const router = useRouter();
  const { user } = useAuth();
  // Deleting a request is open to everyone who works the module, District Office
  // included; building a board approval list is Head Office / Board Secretary work.
  const canDelete = hasRole(user?.role, PROFILE_CHANGE_DELETE_ROLES);
  const canBuildApprovalList = hasRole(user?.role, PROFILE_CHANGE_APPROVAL_LIST_ROLES);
  const [mounted, setMounted] = useState(false);
  const [boardMeetings, setBoardMeetings] = useState<BoardMeetingDTO[]>([]);

  // Filter defaults are the SRS's: All Days, Submitted for Approval, Requested Date
  // ascending.
  const [requestType, setRequestType] = useState<ProfileChangeType>('BASIC_PROFILE');
  const [statusFilter, setStatusFilter] = useState<string[]>(['SUBMITTED_FOR_APPROVAL']);
  // MMC02's Location filter, restored to the SRS wording on 2026-08-27: a user with
  // access to a single district gets that district auto-selected and the control
  // disabled, while a user with national access (Head Office, Board Secretary, Accounts,
  // Scholarship Officer, Super Admin) keeps it enabled and defaults to "All".
  //
  // "All" is the initial value for everyone; the effect below narrows it once the user
  // has loaded, which is the same shape the University Scholarship screen uses.
  //
  // This is a default and a UX affordance, not enforcement: ProfileChangeController
  // deliberately applies no district lock server-side, so a District Office caller can
  // still widen the query by calling the API directly. See the note at the foot of that
  // controller for why the server-side lock was removed.
  const [locationFilter, setLocationFilter] = useState<string[]>([ALL_LOCATIONS]);
  const [locations, setLocations] = useState<string[]>([]);
  const canSelectAllLocationOptions = canSelectAllLocations(user?.role);
  const [receivedOn, setReceivedOn] = useState<RequestReceivedOn>('ALL_DAYS');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ProfileChangeSortBy>('REQUESTED_DATE');
  const [descending, setDescending] = useState(false);

  const [results, setResults] = useState<ProfileChangeListItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState('');
  const [savingList, setSavingList] = useState(false);
  const [createdList, setCreatedList] = useState<{ listId?: string; count: number } | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProfileChangeListItem | null>(null);

  const supportsApprovalList = requestType === 'NAME' || requestType === 'NOMINEE';

  // Member Transfers do not show Location. Every other type is filed at the office that
  // raised it, so the column tells them apart; a transfer is always about the member's
  // own administering office, which the Location filter above has already pinned, so the
  // column only ever repeats it down the page.
  const showLocationColumn = requestType !== 'MEMBER_TRANSFER';

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    getBoardMeetings()
      .then(setBoardMeetings)
      .catch(() => setBoardMeetings([]));
  }, []);

  useEffect(() => {
    // An empty list just leaves the filter showing "All locations"; it is a convenience,
    // not something the screen depends on.
    getEducationalDistricts()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  // MMC02: pin a single-district user to their own location once the account has
  // loaded. Runs on the user rather than on mount because useAuth resolves
  // asynchronously — on the first render assignedDistrict is still undefined, and
  // pinning then would leave the filter stuck on "All".
  useEffect(() => {
    if (!canSelectAllLocationOptions && user?.assignedDistrict) {
      setLocationFilter([user.assignedDistrict]);
    }
  }, [canSelectAllLocationOptions, user?.assignedDistrict]);

  // The available statuses depend on the type: only Name and Nominee pass through a
  // board approval list, so only they can sit on "Added to Board Approval List".
  const availableStatuses = useMemo(
    () => statusOptionsFor(requestType),
    [requestType]
  );

  useEffect(() => {
    setStatusFilter((prev) => {
      if (prev.includes(ALL_STATUSES)) return prev;
      const kept = prev.filter((s) => availableStatuses.includes(s as ProfileChangeStatus));
      return kept.length > 0 ? kept : ['SUBMITTED_FOR_APPROVAL'];
    });
    setHasSearched(false);
    setResults([]);
    setPage(1);
    setSelectedKeys([]);
  }, [availableStatuses]);

  const rowKey = (row: ProfileChangeListItem) => `${row.type}:${row.requestId}`;

  const handleRetrieve = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedKeys([]);

    try {
      const selectedStatuses = statusFilter.includes(ALL_STATUSES)
        ? undefined
        : (statusFilter as ProfileChangeStatus[]);

      const selectedLocations = locationFilter.includes(ALL_LOCATIONS)
        ? undefined
        : locationFilter;

      const data = await searchProfileChanges({
        types: [requestType],
        statuses: selectedStatuses && selectedStatuses.length > 0 ? selectedStatuses : undefined,
        locations: selectedLocations && selectedLocations.length > 0 ? selectedLocations : undefined,
        receivedOn,
        from: receivedOn === 'DATE_PERIOD' && fromDate ? fromDate : undefined,
        to: receivedOn === 'DATE_PERIOD' && toDate ? toDate : undefined,
        search: searchQuery.trim() || undefined,
        sortBy,
        descending,
      });
      setResults(data);
      setPage(1);
      setHasSearched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not retrieve profile change requests.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [
    requestType,
    statusFilter,
    locationFilter,
    receivedOn,
    fromDate,
    toDate,
    searchQuery,
    sortBy,
    descending,
  ]);

  const selectableRows = useMemo(() => results.filter(isListable), [results]);

  /**
   * Deleting the last row of the last page would otherwise leave the table blank on a
   * page that no longer exists, so the page number is clamped against the current
   * result count on every render rather than only when the user pages.
   */
  const safePage = clampPage(page, results.length);
  const pagedResults = useMemo(() => pageSlice(results, safePage), [results, safePage]);

  /**
   * Six fixed columns, plus Status and Action, plus the select box when listable — less
   * Location on Member Transfers. Kept in step with the header and body below, since it
   * is the colSpan the empty and loading rows stretch across.
   */
  const columnCount = (supportsApprovalList ? 9 : 8) - (showLocationColumn ? 0 : 1);

  const toggleRow = (key: string) =>
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const toggleAll = (checked: boolean) =>
    setSelectedKeys(checked ? selectableRows.map(rowKey) : []);

  /** MMC03 / MMC07 / MMC16 / MMC20: records are opened from the Member ID. */
  const openRecord = (row: ProfileChangeListItem) => {
    if (row.requestId == null) return;
    switch (row.type) {
      case 'NAME':
        router.push(`/membership/name-changes/${row.requestId}`);
        break;
      case 'NOMINEE':
        router.push(`/membership/nommine-changes/${row.requestId}`);
        break;
      case 'REMITTANCE':
        router.push(`/membership/directory/change-remittance?editId=${row.requestId}`);
        break;
      case 'MEMBER_TRANSFER':
        // The transfer form opens read-only when given a requestId, which is what MMC29
        // asks for; omitting mode=edit is what keeps it in View Mode.
        router.push(`/membership/directory/change-memberTransfer?requestId=${row.requestId}`);
        break;
      default:
        router.push(`/membership/profile-changes/${row.requestId}`);
    }
  };

  /**
   * MEMBER_TRANSFER is deliberately absent: MemberTransferController exposes no delete,
   * so the action is hidden for transfers rather than pointed at an endpoint that would
   * 404. Partial, not Record, so adding a type cannot silently produce an undefined URL.
   */
  const DELETE_PATHS: Partial<Record<ProfileChangeType, string>> = {
    BASIC_PROFILE: '/api/v2/deletRequest',
    NAME: '/api5/namechange/deletnameChange',
    NOMINEE: '/api/v3/deleteNommine',
    REMITTANCE: '/api4/remitance/deleteRemitance',
  };

  const canDeleteRow = (row: ProfileChangeListItem) =>
    canDelete && Boolean(DELETE_PATHS[row.type]);

  const canOpenRow = (row: ProfileChangeListItem) => row.requestId != null;

  const handleDelete = async (row: ProfileChangeListItem) => {
    const path = DELETE_PATHS[row.type];
    if (row.requestId == null || !path) return;
    const label = row.requestNo ?? 'this request';

    setDeletingKey(rowKey(row));
    setError(null);
    try {
      await apiClient.delete(`${path}/${row.requestId}`);
      setResults((prev) => prev.filter((r) => rowKey(r) !== rowKey(row)));
      setSelectedKeys((prev) => prev.filter((k) => k !== rowKey(row)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Could not delete ${label}.`);
    } finally {
      setDeletingKey(null);
    }
  };

  const handleCreateApprovalList = async () => {
    if (!selectedMeeting) return;

    const meeting = boardMeetings.find((m) => m.id === Number(selectedMeeting));
    if (!meeting?.id || !meeting.scheduledDate) {
      setError('The selected board meeting is no longer available.');
      return;
    }

    const ids = results
      .filter((row) => selectedKeys.includes(rowKey(row)))
      .map((row) => row.requestId)
      .filter((id): id is number => id != null);

    if (ids.length === 0) return;

    setSavingList(true);
    setError(null);
    try {
      const created = await createBoardApprovalList({
        boardMeetingId: Number(meeting.id),
        boardMeetingDate: meeting.scheduledDate.slice(0, 10),
        ...(requestType === 'NAME'
          ? { nameChangeRequestIds: ids }
          : { nomineeChangeRequestIds: ids }),
      });

      setCreatedList({ listId: created?.listId, count: ids.length });
      setSelectedKeys([]);
      setShowMeetingModal(false);
      setSelectedMeeting('');
      await handleRetrieve();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create the approval list.');
    } finally {
      setSavingList(false);
    }
  };

  if (!mounted) return null;

  const typeLabel = TYPE_OPTIONS.find((t) => t.value === requestType)?.label ?? '';

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-7xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-[#953002]">All Member Profile Change Requests</h1>
      </div>

      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-[#953002] mb-6">Search Criteria</h2>

        {/* Laid out like the Member Transfer screen this replaced, which is the shape the
            rest of the app uses: the four filters the SRS names across one row (what,
            where, when, which status), the date pair only when a period is chosen, then
            search with sort and Retrieve. */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MultiSelect
              label="Location (District)"
              allValue={ALL_LOCATIONS}
              allLabel="All Locations"
              options={locations.map((d) => ({ value: d, label: d }))}
              selected={locationFilter}
              onChange={setLocationFilter}
              disabled={!canSelectAllLocationOptions}
              emptyText="No districts configured"
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Type</label>
              <Select
                value={requestType}
                onValueChange={(value) => setRequestType(value as ProfileChangeType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Request Received On</label>
              <Select
                value={receivedOn}
                onValueChange={(value) => setReceivedOn(value as RequestReceivedOn)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECEIVED_ON_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <MultiSelect
              label="Status"
              allValue={ALL_STATUSES}
              allLabel="All Statuses"
              options={availableStatuses.map((st) => ({ value: st, label: humanStatus(st) }))}
              selected={statusFilter}
              onChange={setStatusFilter}
              emptyText="Pick a type first"
            />
          </div>

          {receivedOn === 'DATE_PERIOD' && (
            /* Four columns, matching the filter row above, so From and To line up under
               the first two filters rather than sitting at a wider pitch of their own. */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">From Date</label>
                <Input
                  type="date"
                  aria-label="From date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">To Date</label>
                <Input
                  type="date"
                  aria-label="To date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-gray-600">
                Search (Member Name / Member ID / NIC)
              </label>
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleRetrieve();
                  }}
                  placeholder="Name, Member No. or NIC…"
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Sort By</label>
              <div className="flex items-center gap-2">
                <Select
                  value={sortBy}
                  onValueChange={(value) => setSortBy(value as ProfileChangeSortBy)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Toggle sort direction"
                  title={descending ? 'Sorted descending' : 'Sorted ascending'}
                  onClick={() => setDescending((prev) => !prev)}
                >
                  <ArrowUp size={16} className={descending ? 'rotate-180' : ''} />
                </Button>
                <Button
                  onClick={() => void handleRetrieve()}
                  disabled={loading}
                  className="whitespace-nowrap bg-[#7a2700] text-white hover:bg-[#953002]"
                >
                  <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Retrieving...' : 'Retrieve'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          {supportsApprovalList && hasSearched && canBuildApprovalList && (
            <button
              onClick={() => setShowMeetingModal(true)}
              disabled={selectedKeys.length === 0 || loading}
              className="bg-[#EAB308] text-white px-6 py-2.5 rounded-lg font-bold disabled:opacity-60"
            >
              Create {typeLabel.replace(' Changes', '')} Change Approval List
              {selectedKeys.length > 0 ? ` (${selectedKeys.length})` : ''}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-4 rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Results - shadcn Table, styled to match the Membership Directory. This screen
          previously hand-rolled a <table> with its own header grey, its own paddings and
          a padded <span> for the status, which wrapped into two broken half-pills on
          long statuses like SUBMITTED FOR APPROVAL. */}
      {hasSearched && (
        <Card className="mx-auto max-w-7xl overflow-hidden rounded-xl border-neutral-300 py-0 shadow-none">
          <CardContent className="overflow-x-auto px-0">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                  {supportsApprovalList && (
                    <TableHead className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all eligible requests"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={
                          selectableRows.length > 0 &&
                          selectableRows.every((r) => selectedKeys.includes(rowKey(r)))
                        }
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    </TableHead>
                  )}
                  {[
                    'Request ID',
                    'Member ID',
                    'Member Name',
                    'NIC',
                    'Requested Date',
                    ...(showLocationColumn ? ['Location'] : []),
                  ].map(
                    (h) => (
                      <TableHead
                        key={h}
                        className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase"
                      >
                        {h}
                      </TableHead>
                    ),
                  )}
                  <TableHead className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Status
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columnCount} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-neutral-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading requests…</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columnCount} className="py-10 text-center text-neutral-500">
                      No requests found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedResults.map((row) => {
                    const key = rowKey(row);
                    const listable = isListable(row);
                    return (
                      <TableRow key={key} className="hover:bg-neutral-50">
                        {supportsApprovalList && (
                          <TableCell className="px-4 py-4">
                            {listable ? (
                              <input
                                type="checkbox"
                                aria-label={`Select ${row.requestNo ?? 'request'}`}
                                checked={selectedKeys.includes(key)}
                                onChange={() => toggleRow(key)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            ) : (
                              <span className="text-neutral-300">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="px-4 py-4 font-mono text-neutral-700">
                          <span className="inline-flex items-center gap-1.5">
                            {/* MMC02: icons mark submitted requests and those already on a list. */}
                            {row.status === 'SUBMITTED_FOR_APPROVAL' && (
                              <FileCheck2
                                className="h-4 w-4 text-[#EAB308]"
                                aria-label="Submitted for approval"
                              />
                            )}
                            {row.status === 'ADDED_TO_BOARD_APPROVAL_LIST' && (
                              <ListChecks
                                className="h-4 w-4 text-blue-600"
                                aria-label="Added to approval list"
                              />
                            )}
                            {row.requestNo ?? 'NEW'}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-4 font-medium">
                          {canOpenRow(row) ? (
                            <button
                              onClick={() => openRecord(row)}
                              className="text-[#953002] hover:underline"
                            >
                              {row.memberId ?? '—'}
                            </button>
                          ) : (
                            <span
                              className="text-neutral-700"
                              title="No detail view exists for this request type yet"
                            >
                              {row.memberId ?? '—'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-neutral-700">
                          {row.fullName ?? row.nameWithInitials ?? '—'}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-neutral-700">{row.nic ?? '—'}</TableCell>
                        <TableCell className="px-4 py-4 text-neutral-700 tabular-nums">
                          {row.requestedDate ?? '—'}
                        </TableCell>
                        {showLocationColumn && (
                          <TableCell className="px-4 py-4 text-neutral-700">
                            {row.submissionLocation ?? '—'}
                          </TableCell>
                        )}
                        <TableCell className="px-4 py-4 text-left">
                          <StatusBadge status={row.status} vocabulary="request" />
                        </TableCell>
                        <TableCell className="px-4 py-4 text-right">
                          {canDeleteRow(row) && (
                            <button
                              onClick={() => setPendingDelete(row)}
                              disabled={deletingKey === key}
                              title={`Delete ${row.requestNo ?? 'request'}`}
                              className="inline-flex items-center gap-2 text-sm text-red-600 transition-colors hover:text-red-800 disabled:opacity-50"
                            >
                              {deletingKey === key ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              Delete
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {!loading && results.length > 0 && (
              <TablePagination
                page={safePage}
                total={results.length}
                onPageChange={setPage}
                itemLabel="request"
              />
            )}
          </CardContent>
        </Card>
      )}

      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[520px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h2 className="text-2xl font-semibold text-[#953002]">Select Board Meeting</h2>
                <p className="text-sm text-gray-500">
                  Select the meeting date for these {selectedKeys.length} requests.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMeetingModal(false)}
                className="text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="px-5 pb-5 pt-6">
              <label className="text-sm font-medium text-gray-700">Meeting Date</label>
              <select
                value={selectedMeeting}
                onChange={(e) => setSelectedMeeting(e.target.value)}
                className="mt-1.5 w-full p-2.5 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">Select meeting</option>
                {boardMeetings.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.scheduledDate}
                    {m.boardMeetingId ? ` (${m.boardMeetingId})` : ''}
                  </option>
                ))}
              </select>
              <div className="mt-7 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="px-4 py-2 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateApprovalList()}
                  disabled={!selectedMeeting || savingList}
                  className="bg-[#953002] text-white px-4 py-2 rounded-lg disabled:opacity-60"
                >
                  {savingList ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {createdList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <h2 className="text-2xl font-semibold text-[#953002]">Confirmation</h2>
              <button type="button" onClick={() => setCreatedList(null)} className="text-gray-500">
                ✕
              </button>
            </div>
            <div className="px-5 pb-5 pt-1">
              <p className="text-base leading-relaxed text-gray-600">
                {createdList.listId
                  ? `The approval list ${createdList.listId} for ${createdList.count} requests has been created. Do you want to view the list?`
                  : 'The approval list has been created. Do you want to view the list?'}
              </p>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreatedList(null)}
                  className="bg-[#EAB308] text-white px-4 py-2 rounded-lg"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const listId = createdList.listId;
                    setCreatedList(null);
                    router.push(
                      listId
                        ? `/membership/board-approvals?listId=${encodeURIComponent(listId)}`
                        : '/membership/board-approvals'
                    );
                  }}
                  className="bg-[#953002] text-white px-4 py-2 rounded-lg"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    
      <ConfirmDialog
        open={pendingDelete !== null}
        destructive
        busy={deletingKey !== null}
        title="Delete this request?"
        message={
          <>
            <span className="font-medium text-gray-900">
              {pendingDelete?.requestNo ?? 'This request'}
            </span>{' '}
            for {pendingDelete?.fullName ?? 'this member'} will be removed permanently.
            An audit record is kept, but the request itself cannot be recovered.
          </>
        }
        confirmLabel="Delete request"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const row = pendingDelete;
          setPendingDelete(null);
          if (row) void handleDelete(row);
        }}
      />
</div>
  );
}
