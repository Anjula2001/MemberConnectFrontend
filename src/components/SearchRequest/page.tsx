"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Loader2, FileCheck2, ListChecks, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { apiClient } from '@/lib/api/client';
import { getEducationalDistricts } from '@/lib/api/education';
import MultiSelect from './MultiSelect';
import ConfirmDialog from '@/src/components/membership/ConfirmDialog';
import { useAuth } from '@/lib/auth-context';
import {
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
 * There is no Location control: district users are confined to their own district by the
 * backend on every request, so the filter added nothing they could act on.
 *
 * The previous version called each type's "get all" endpoint and filtered the results
 * in the browser, which is why Location, Received On and Sort did not exist, Status was
 * a single select defaulting to ALL, and the search box was bound to state that nothing
 * ever read.
 */

const TYPE_OPTIONS: { value: ProfileChangeType | 'MEMBER_TRANSFER'; label: string }[] = [
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

const humanStatus = (status: string | null) => (status ?? '—').replace(/_/g, ' ');

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
  const [requestType, setRequestType] = useState<ProfileChangeType | 'MEMBER_TRANSFER'>('BASIC_PROFILE');
  const [statusFilter, setStatusFilter] = useState<string[]>(['SUBMITTED_FOR_APPROVAL']);
  // MMC02's Location filter. It is a plain filter for every role: the district lock was
  // removed at the client's direction, so a District Office user searches all locations
  // like everyone else and simply picks one when they want to narrow.
  const [locationFilter, setLocationFilter] = useState<string[]>([ALL_LOCATIONS]);
  const [locations, setLocations] = useState<string[]>([]);
  const [receivedOn, setReceivedOn] = useState<RequestReceivedOn>('ALL_DAYS');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ProfileChangeSortBy>('REQUESTED_DATE');
  const [descending, setDescending] = useState(false);

  const [results, setResults] = useState<ProfileChangeListItem[]>([]);
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

  const isSupportedType = requestType !== 'MEMBER_TRANSFER';
  const supportsApprovalList = requestType === 'NAME' || requestType === 'NOMINEE';

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

  // The available statuses depend on the type: only Name and Nominee pass through a
  // board approval list, so only they can sit on "Added to Board Approval List".
  const availableStatuses = useMemo(
    () => (isSupportedType ? statusOptionsFor(requestType) : []),
    [requestType, isSupportedType]
  );

  useEffect(() => {
    setStatusFilter((prev) => {
      if (prev.includes(ALL_STATUSES)) return prev;
      const kept = prev.filter((s) => availableStatuses.includes(s as ProfileChangeStatus));
      return kept.length > 0 ? kept : ['SUBMITTED_FOR_APPROVAL'];
    });
    setHasSearched(false);
    setResults([]);
    setSelectedKeys([]);
  }, [availableStatuses]);

  const rowKey = (row: ProfileChangeListItem) => `${row.type}:${row.requestId}`;

  const handleRetrieve = useCallback(async () => {
    if (!isSupportedType) {
      setError('Member Transfers have their own screen and are not listed here yet.');
      setResults([]);
      setHasSearched(false);
      return;
    }

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
      setHasSearched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not retrieve profile change requests.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [
    isSupportedType,
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
      default:
        router.push(`/membership/profile-changes/${row.requestId}`);
    }
  };

  const DELETE_PATHS: Record<ProfileChangeType, string> = {
    BASIC_PROFILE: '/api/v2/deletRequest',
    NAME: '/api5/namechange/deletnameChange',
    NOMINEE: '/api/v3/deleteNommine',
    REMITTANCE: '/api4/remitance/deleteRemitance',
  };

  const handleDelete = async (row: ProfileChangeListItem) => {
    if (row.requestId == null) return;
    const label = row.requestNo ?? 'this request';

    setDeletingKey(rowKey(row));
    setError(null);
    try {
      await apiClient.delete(`${DELETE_PATHS[row.type]}/${row.requestId}`);
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
        <h1 className="text-2xl font-bold text-[#8B3205]">All Member Profile Change Requests</h1>
      </div>

      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h2 className="text-lg font-bold text-[#8B3205] mb-6">Search &amp; Filter</h2>
        {/* Filters, in the order the SRS lists them: what, where, when, which status. */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Type</label>
            <select
              value={requestType}
              onChange={(e) =>
                setRequestType(e.target.value as ProfileChangeType | 'MEMBER_TRANSFER')
              }
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <MultiSelect
            label="Location"
            allValue={ALL_LOCATIONS}
            allLabel="All locations"
            options={locations.map((d) => ({ value: d, label: d }))}
            selected={locationFilter}
            onChange={setLocationFilter}
            emptyText="No districts configured"
          />

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Request Received On</label>
            <select
              value={receivedOn}
              onChange={(e) => setReceivedOn(e.target.value as RequestReceivedOn)}
              className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm"
            >
              {RECEIVED_ON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <MultiSelect
            label="Status"
            allValue={ALL_STATUSES}
            allLabel="All statuses"
            options={availableStatuses.map((st) => ({ value: st, label: humanStatus(st) }))}
            selected={statusFilter}
            onChange={setStatusFilter}
            disabled={!isSupportedType}
            emptyText="Pick a type first"
          />

          {/* Only shown for Date Period, so the row does not sit empty the rest of the time. */}
          {receivedOn === 'DATE_PERIOD' && (
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-600">Date range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="From date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
                <span className="text-sm text-gray-400">to</span>
                <input
                  type="date"
                  aria-label="To date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                />
              </div>
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-600">Search Member</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleRetrieve();
                }}
                placeholder="Name, Member No. or NIC…"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-gray-600">Sort By</label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ProfileChangeSortBy)}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Sort direction"
                value={descending ? 'desc' : 'asc'}
                onChange={(e) => setDescending(e.target.value === 'desc')}
                className="w-32 shrink-0 rounded-lg border border-gray-300 bg-white p-2.5 text-sm"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
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
          <button
            onClick={() => void handleRetrieve()}
            disabled={loading}
            className="bg-[#8B3205] text-white px-10 py-2.5 rounded-lg font-bold flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Retrieve'}
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-4 rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {hasSearched && (
        <div className="max-w-7xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#FDFDFD] border-b border-gray-100 text-gray-500 text-sm">
              <tr>
                {supportsApprovalList && (
                  <th className="p-4 w-10">
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
                  </th>
                )}
                <th className="p-4">Request ID</th>
                <th className="p-4">Member ID</th>
                <th className="p-4">Member Name</th>
                <th className="p-4">NIC</th>
                <th className="p-4">Requested Date</th>
                <th className="p-4">Location</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map((row) => {
                const key = rowKey(row);
                const listable = isListable(row);
                return (
                  <tr key={key} className="hover:bg-gray-50">
                    {supportsApprovalList && (
                      <td className="p-4">
                        {listable ? (
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.requestNo ?? 'request'}`}
                            checked={selectedKeys.includes(key)}
                            onChange={() => toggleRow(key)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    )}
                    <td className="p-4 font-mono text-sm text-gray-700">
                      <span className="inline-flex items-center gap-1.5">
                        {/* MMC02: icons mark submitted requests and those already on a list. */}
                        {row.status === 'SUBMITTED_FOR_APPROVAL' && (
                          <FileCheck2
                            className="w-4 h-4 text-[#EAB308]"
                            aria-label="Submitted for approval"
                          />
                        )}
                        {row.status === 'ADDED_TO_BOARD_APPROVAL_LIST' && (
                          <ListChecks
                            className="w-4 h-4 text-blue-600"
                            aria-label="Added to approval list"
                          />
                        )}
                        {row.requestNo ?? 'NEW'}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => openRecord(row)}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        {row.memberId ?? '—'}
                      </button>
                    </td>
                    <td className="p-4 text-gray-700">
                      {row.fullName ?? row.nameWithInitials ?? '—'}
                    </td>
                    <td className="p-4 text-gray-600">{row.nic ?? '—'}</td>
                    <td className="p-4 text-gray-600 tabular-nums">{row.requestedDate ?? '—'}</td>
                    <td className="p-4 text-gray-600">{row.submissionLocation ?? '—'}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-3 py-1 rounded-full text-white ${
                          row.status === 'APPROVED'
                            ? 'bg-green-600'
                            : row.status === 'REJECTED'
                              ? 'bg-red-600'
                              : row.status === 'INACTIVE'
                                ? 'bg-gray-400'
                                : 'bg-[#EAB308]'
                        }`}
                      >
                        {humanStatus(row.status)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {canDelete && (
                      <button
                        onClick={() => setPendingDelete(row)}
                        disabled={deletingKey === key}
                        title={`Delete ${row.requestNo ?? 'request'}`}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {deletingKey === key
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                        Delete
                      </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {results.length === 0 && (
                <tr>
                  <td
                    colSpan={supportsApprovalList ? 9 : 8}
                    className="p-8 text-center text-gray-500"
                  >
                    No requests found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[520px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h2 className="text-2xl font-semibold text-[#8B3205]">Select Board Meeting</h2>
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
                  className="bg-[#8B3205] text-white px-4 py-2 rounded-lg disabled:opacity-60"
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
              <h2 className="text-2xl font-semibold text-[#8B3205]">Confirmation</h2>
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
                  className="bg-[#8B3205] text-white px-4 py-2 rounded-lg"
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
