"use client";

import React, { useState, useEffect } from 'react';
import { Search, Loader2, Edit3, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { createBoardApprovalList } from '@/lib/api/boardApprovalLists';
import { getBoardMeetings, type BoardMeetingDTO } from '@/lib/api/boardMeeting';
import { getMemberApplications, type MemberApplicationDTO } from '@/lib/api/memberApplications';

interface RequestData {
  newnomineeNIC: string | undefined;
  newNomineeName: string;
  id?: number;
  Id?: number;
  ID?: number;
  nameChangeRequestID?: string;
  nomineeChangeID?: string;
  nommineChangeId?: string;
  applicationId?: string | number;
  applicationID?: string | number;
  appId?: string | number;
  appID?: string | number;
  memberApplicationId?: string | number;
  memberApplicationID?: string | number;
  memberId?: string | number;
  memberID?: string | number;
  newNIC?: string;
  newEmailAddress?: string;
  status?: string;
  newStatus?: string;
  newFullName?: string;
  newNameInPayroll?: string;
  newNameAsInPayroll?: string;
  newNameWithInitials?: string;
  newnommineName?: string;
  relationship?: string;
  newRelationship?: string;
  nic?: string;
  newNomineeNIC?: string;
  address?: string;
  newNomineeAddress?: string;
  newRemittanceAmount?: string;
  newRemittanceCurrency?: string;
}

export default function ProfileChangeRequests() {
  const router = useRouter(); // Initialize router
  const [mounted, setMounted] = useState(false);
  const [requestType, setRequestType] = useState('Basic Profile Changes');
  const [statusFilter, setStatusFilter] = useState('Submitted for Approval');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [showBoardMeetingModal, setShowBoardMeetingModal] = useState(false);
  const [selectedBoardMeeting, setSelectedBoardMeeting] = useState('');
  const [boardMeetings, setBoardMeetings] = useState<BoardMeetingDTO[]>([]);
  const [isSavingBoardApprovalList, setIsSavingBoardApprovalList] = useState(false);
  const [createdBoardApprovalList, setCreatedBoardApprovalList] = useState<any>(null);
  const [showCreationConfirmModal, setShowCreationConfirmModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadBoardMeetings = async () => {
      try {
        const meetings = await getBoardMeetings();
        setBoardMeetings(meetings);
      } catch (error) {
        console.error('Failed to load board meetings', error);
      }
    };

    void loadBoardMeetings();
  }, []);

  const getRequestId = (row: RequestData) => row.id || row.Id || row.ID || row.nameChangeRequestID || row.nomineeChangeID || row.nommineChangeId;
  const getRequestStatus = (row: RequestData) => (row.status || row.newStatus || '').toString().trim().toLowerCase();
  const getSelectionKey = (row: RequestData) => {
    const applicationId = [
      row.applicationId,
      row.applicationID,
      row.appId,
      row.appID,
      row.memberApplicationId,
      row.memberApplicationID,
      row.memberId,
      row.memberID,
    ].find((value) => value !== undefined && value !== null && String(value).trim() !== '');

    return applicationId !== undefined ? String(applicationId).trim() : String(getRequestId(row) ?? '').trim();
  };
  const formatApiDate = (value?: string) => {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    try {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
    } catch {
      // fall through to a simple string fallback
    }

    return trimmed.slice(0, 10);
  };
  const isSelectableForBoardApproval = (row: RequestData) => {
    const status = getRequestStatus(row);
    return requestType === 'Name Changes' && status !== 'approved' && status !== 'approvedforapproval';
  };
  const displayedResults = results.filter((row) => {
    const status = getRequestStatus(row);
    if (statusFilter === 'Approved') {
      return status.includes('approved');
    }
    return status.includes('submitted') || status.includes('pending') || status.includes('new') || status === '';
  });

  const toggleRequestSelection = (requestId: string) => {
    setSelectedRequestIds((prev) =>
      prev.includes(requestId) ? prev.filter((id) => id !== requestId) : [...prev, requestId]
    );
  };

  const toggleAllRequests = (checked: boolean) => {
    if (!checked) {
      setSelectedRequestIds([]);
      return;
    }

    const selectableIds = displayedResults
      .filter((row) => isSelectableForBoardApproval(row))
      .map((row) => getSelectionKey(row))
      .filter(Boolean);

    setSelectedRequestIds(selectableIds);
  };

  const resolveApplicationIds = async (selectedValues: string[]) => {
    const applications = await getMemberApplications();
    const normalizeValue = (value?: string | number | null) =>
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    return selectedValues
      .map((value) => {
        const trimmedValue = String(value).trim();
        if (!trimmedValue) return null;

        const existingApplication = applications.find(
          (app) =>
            normalizeValue(app.applicationID) === normalizeValue(trimmedValue) ||
            normalizeValue(app.id) === normalizeValue(trimmedValue)
        );

        if (existingApplication?.applicationID) return String(existingApplication.applicationID);
        if (existingApplication?.id !== undefined) return String(existingApplication.id);

        const row = results.find((entry) => getSelectionKey(entry) === trimmedValue);
        const rowCandidates = [row?.newFullName, row?.newNameAsInPayroll, row?.newNameWithInitials, row?.newNameInPayroll]
          .filter((candidate): candidate is string => Boolean(candidate))
          .map((candidate) => normalizeValue(candidate));

        if (rowCandidates.length === 0) return null;

        const bestMatch = applications.reduce<{ app: MemberApplicationDTO; score: number } | null>((closestMatch, app) => {
          const applicationCandidates = [
            app.fullName,
            app.nameAsInPayroll,
            app.nameWithInitials,
            app.nicNumber,
          ]
            .filter((candidate): candidate is string => Boolean(candidate))
            .map((candidate) => normalizeValue(candidate));

          if (applicationCandidates.length === 0) return closestMatch;

          let score = 0;
          for (const rowCandidate of rowCandidates) {
            if (!rowCandidate) continue;

            const directMatch = applicationCandidates.some(
              (candidate) => candidate === rowCandidate || candidate.includes(rowCandidate) || rowCandidate.includes(candidate)
            );
            if (directMatch) score += 3;

            const tokenMatch = applicationCandidates.some((candidate) =>
              candidate.split(' ').some((token) => rowCandidate.split(' ').includes(token))
            );
            if (tokenMatch) score += 1;
          }

          if (score > 0 && (!closestMatch || score > closestMatch.score)) {
            return { app, score };
          }

          return closestMatch;
        }, null);

        if (!bestMatch) return null;
        if (bestMatch.app.applicationID) return String(bestMatch.app.applicationID);
        if (bestMatch.app.id !== undefined) return String(bestMatch.app.id);
        return null;
      })
      .filter((value): value is string => Boolean(value));
  };

  const handleOpenBoardMeetingModal = () => {
    if (selectedRequestIds.length === 0) return;
    setShowBoardMeetingModal(true);
  };

  const handleCloseBoardMeetingModal = () => {
    setShowBoardMeetingModal(false);
    setSelectedBoardMeeting('');
  };

  const handleSaveBoardMeeting = async () => {
    if (!selectedBoardMeeting) return;

    const meetingId = Number(selectedBoardMeeting);
    const meeting = boardMeetings.find((item) => item.id === meetingId);

    if (!meeting || !meeting.id || !meeting.scheduledDate) {
      alert('Selected board meeting is not available.');
      return;
    }

    try {
      setIsSavingBoardApprovalList(true);
      const boardMeetingDate = formatApiDate(meeting.scheduledDate);
      if (!boardMeetingDate) {
        alert('Selected board meeting date is invalid.');
        return;
      }

      const normalizedRequestIds = selectedRequestIds
        .map((id) => String(id).trim())
        .filter(Boolean);

      if (normalizedRequestIds.length === 0) {
        alert('Please select at least one request.');
        return;
      }

      let payload: any = {
        boardMeetingId: Number(meeting.id),
        boardMeetingDate,
      };

      if (requestType === 'Name Changes') {
        // Build nameChangeRequestIds from selected rows (use request id keys)
        const nameChangeRequestIds = normalizedRequestIds
          .map((sel) => {
            const row = results.find((r) => getSelectionKey(r) === sel);
            const id = row ? getRequestId(row) : undefined;
            const n = typeof id === 'string' ? Number(id) : id;
            return Number.isFinite(n) ? n : undefined;
          })
          .filter((v): v is number => v !== undefined);

        if (nameChangeRequestIds.length === 0) {
          alert('The selected rows could not be resolved to name change request IDs.');
          return;
        }

        payload.nameChangeRequestIds = nameChangeRequestIds;
      } else {
        const resolvedApplicationIds = await resolveApplicationIds(normalizedRequestIds);

        if (resolvedApplicationIds.length === 0) {
          alert('The selected rows could not be matched to any existing member application ID.');
          return;
        }

        payload.applicationIds = resolvedApplicationIds;
      }

      console.log('Board approval payload', payload);

      const createdList = await createBoardApprovalList(payload);

      setCreatedBoardApprovalList({
        ...createdList,
        selectedCount:
          (createdList?.applicationIds?.length ?? (createdList as any)?.nameChangeRequestIds?.length) ?? 0,
      });
      setSelectedRequestIds([]);
      setShowBoardMeetingModal(false);
      setSelectedBoardMeeting('');
      setShowCreationConfirmModal(true);
    } catch (error: unknown) {
      console.error('Failed to create board approval list', error);
      const backendMessage =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.message ||
          (error as { response?: { data?: { message?: string; error?: string } } }).response?.data?.error
          : undefined;
      const fallbackMessage = error instanceof Error ? error.message : 'Failed to create board approval list';
      alert(backendMessage || fallbackMessage || 'Failed to create board approval list');
    } finally {
      setIsSavingBoardApprovalList(false);
    }
  };

  const handleCloseCreationConfirmModal = () => {
    setShowCreationConfirmModal(false);
    setCreatedBoardApprovalList(null);
  };

  const handleViewCreatedList = () => {
    setShowCreationConfirmModal(false);
    if (createdBoardApprovalList?.listId) {
      router.push(`/membership/board-approvals?listId=${encodeURIComponent(createdBoardApprovalList.listId)}`);
    } else {
      router.push('/membership/board-approvals');
    }
  };

  const handleRetrieve = async () => {
    setLoading(true);
    setResults([]);
    setSelectedRequestIds([]);
    try {
      if (requestType === 'Basic Profile Changes') {
        const response = await axios.get('http://localhost:8080/api/v2/getRequests', {
          params: { sortBy: 'id', direction: 'desc' }
        });
        setResults(response.data);
        setHasSearched(true);
      } else if (requestType === 'Name Changes') {
        const response = await axios.get('http://localhost:8080/api5/namechange/getnamechange', {
          params: { sortBy: 'id', direction: 'desc' }
        });
        setResults(response.data);
        setHasSearched(true);
      } else if (requestType === 'Nomminne Changes') {
        const response = await axios.get('http://localhost:8080/api/v3/getnommine', {
          params: { sortBy: 'id', direction: 'desc' }
        });
        setResults(response.data);
        setHasSearched(true);
      } else if (requestType === 'Remittance Amount Changes') {
        const response = await axios.get('http://localhost:8080/api4/remitance/getRemitance', {
          params: { sortBy: 'id', direction: 'desc' }
        });
        setResults(response.data);
        setHasSearched(true);
      } else {
        alert("This request type is not yet connected to the backend.");
        setHasSearched(false);
      }
    } catch (error: unknown) {
      console.error("API Error:", error);
      alert("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: any) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this request?")) return;

    try {
      if (requestType === 'Basic Profile Changes') {
        await axios.delete(`http://localhost:8080/api/v2/deletRequest/${id}`);
      } else if (requestType === 'Name Changes') {
        await axios.delete(`http://localhost:8080/api5/namechange/deletnameChange/${id}`);
      } else if (requestType === 'Nomminne Changes') {
        await axios.delete(`http://localhost:8080/api/v3/deleteNommine/${id}`);
      } else if (requestType === 'Remittance Amount Changes') {
        await axios.delete(`http://localhost:8080/api4/remitance/deleteRemitance/${id}`);
      }


      setResults(prev => prev.filter(row => {
        const rowId = row.id || row.Id || row.ID || row.nameChangeRequestID || row.nomineeChangeID || row.nommineChangeId;
        return rowId !== id;
      }));
      alert("Request deleted successfully.");
    } catch (error: unknown) {
      console.error("API Error during deletion:", error);
      alert("Failed to delete the request. Please ensure the backend delete endpoints are configured correctly.");
    }
  };

  // Redirect function
  const handleEdit = (id: any) => {
    if (!id) return;
    if (requestType === 'Name Changes') {
      router.push(`/membership/name-changes/${id}`);
    } else if (requestType === 'Nomminne Changes') {
      router.push(`/membership/nommine-changes/${id}`);
    } else if (requestType === 'Remittance Amount Changes') {
      router.push(`/membership/directory/change-remittance?editId=${id}`);
    } else {
      router.push(`/membership/profile-changes/${id}`);
    }
  };

  if (!mounted) return null;

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen">
      <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-[#8B3205]">All Member Profile Change Requests</h1>
      </div>

      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h2 className="text-xl font-bold text-[#8B3205] mb-6">Search & Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Request Type</label>
            <select value={requestType} onChange={(e) => { setRequestType(e.target.value); setHasSearched(false); }} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white">
              <option>Basic Profile Changes</option>
              <option>Name Changes</option>
              <option>Nomminne Changes</option>
              <option>Remmitance Amount Changes</option>
              <option>Member Transfer</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white">
              <option>Submitted for Approval</option>
              <option>Approved</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Search Member</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input type="text" placeholder="NIC or ID..." className="w-full pl-10 pr-4 p-2.5 border border-gray-300 rounded-lg" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          {requestType === 'Name Changes' && hasSearched && (
            <button
              onClick={handleOpenBoardMeetingModal}
              disabled={selectedRequestIds.length === 0 || loading}
              className="bg-[#EAB308] text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 disabled:opacity-60"
            >
              Create Board Approval List {selectedRequestIds.length > 0 ? `(${selectedRequestIds.length})` : ''}
            </button>
          )}
          <button onClick={handleRetrieve} disabled={loading} className="bg-[#8B3205] text-white px-10 py-2.5 rounded-lg font-bold flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Retrieve"}
          </button>
        </div>
      </div>

      {hasSearched && (
        <div className="max-w-7xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#FDFDFD] border-b border-gray-100 text-gray-500 text-sm">
              <tr>
                {requestType === 'Name Changes' && <th className="p-4 w-10"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[#8B3205] focus:ring-[#8B3205]" checked={displayedResults.filter((row) => isSelectableForBoardApproval(row)).length > 0 && displayedResults.filter((row) => isSelectableForBoardApproval(row)).every((row) => selectedRequestIds.includes(String(getRequestId(row) ?? '')))} onChange={(e) => toggleAllRequests(e.target.checked)} /></th>}
                <th className="p-4">Request ID</th>
                {requestType === 'Name Changes' ? (
                  <>
                    <th className="p-4">New Full Name</th>
                    <th className="p-4">Name in Payroll</th>
                  </>
                ) : requestType === 'Nomminne Changes' ? (
                  <>
                    <th className="p-4">New Nominee Name</th>
                    <th className="p-4">Relationship</th>
                    <th className="p-4">NIC</th>
                    <th className="p-4">Address</th>
                  </>
                ) : requestType === 'Remittance Amount Changes' ? (
                  <>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Currency</th>
                  </>
                ) : (
                  <>
                    <th className="p-4">NIC Number</th>
                    <th className="p-4">Proposed Email</th>
                  </>
                )}
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayedResults.map((row) => {
                const rowId = getRequestId(row);
                const rowIdString = rowId ? String(rowId) : '';
                const statusStr = row.status || row.newStatus || 'SUBMITTED';
                return (
                  <tr key={rowIdString || Math.random()} className="hover:bg-gray-50">
                    {requestType === 'Name Changes' && (
                      <td className="p-4">
                        {isSelectableForBoardApproval(row) ? (
                          <input
                            type="checkbox"
                            checked={selectedRequestIds.includes(getSelectionKey(row))}
                            onChange={() => toggleRequestSelection(getSelectionKey(row))}
                            className="h-4 w-4 rounded border-gray-300 text-[#8B3205] focus:ring-[#8B3205]"
                          />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    )}
                    <td className="p-4">
                      <button onClick={() => rowId !== undefined && handleEdit(rowId)} className="text-blue-600 font-bold hover:underline">
                        {requestType === 'Name Changes' ? 'NCR' : requestType === 'Nomminne Changes' ? 'NMR' : 'PCR'}-2026-{rowId ? rowId.toString().padStart(3, '0') : '000'}
                      </button>
                    </td>
                    {requestType === 'Name Changes' ? (
                      <>
                        <td className="p-4 font-bold">{row.newFullName || '-'}</td>
                        <td className="p-4 text-gray-600">{row.newNameAsInPayroll || row.newNameInPayroll || '-'}</td>
                      </>
                    ) : requestType === 'Nomminne Changes' ? (
                      <>
                        <td className="p-4 font-bold">{row.newNomineeName || '-'}</td>
                        <td className="p-4 text-gray-600">{row.newRelationship || row.relationship || '-'}</td>
                        <td className="p-4 text-gray-600">{row.newnomineeNIC || row.nic || '-'}</td>
                        <td className="p-4 text-gray-600 truncate max-w-[150px]" title={row.newNomineeAddress || row.address || ''}>
                          {row.newNomineeAddress || row.address || '-'}
                        </td>
                      </>
                    ) : requestType === 'Remittance Amount Changes' ? (
                      <>
                        <td className="p-4 font-bold">{row.newRemittanceAmount || '-'}</td>
                        <td className="p-4 text-gray-600">{row.newRemittanceCurrency || 'LKR'}</td>
                      </>
                    ) : (
                      <>
                        <td className="p-4 font-bold">{row.newNIC || '-'}</td>
                        <td className="p-4 text-gray-600">{row.newEmailAddress || '-'}</td>
                      </>
                    )}
                    <td className="p-4 text-center">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full text-white ${statusStr === 'APPROVED' ? 'bg-green-500' : 'bg-[#EAB308]'}`}>
                        {statusStr}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => rowId !== undefined && handleDelete(rowId)} className="text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                        <button onClick={() => rowId !== undefined && handleEdit(rowId)} className="text-gray-600 hover:text-[#8B3205] flex items-center gap-1 transition-colors">
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayedResults.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No requests found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showBoardMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[520px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <div>
                <h2 className="text-[24px] font-semibold text-[#8B3205]">Select Board Meeting</h2>
                <p className="text-sm text-muted-foreground">Select the meeting date for these {selectedRequestIds.length} name change requests.</p>
              </div>
              <button type="button" onClick={handleCloseBoardMeetingModal} className="text-gray-500">✕</button>
            </div>
            <div className="px-5 pb-5 pt-6">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Meeting Date</label>
                <select value={selectedBoardMeeting} onChange={(e) => setSelectedBoardMeeting(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white">
                  <option value="">Select Meeting</option>
                  {boardMeetings.map((meeting) => (
                    <option key={meeting.id} value={String(meeting.id)}>
                      {meeting.scheduledDate} {meeting.boardMeetingId ? `(${meeting.boardMeetingId})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-7 flex items-center justify-end gap-2">
                <button type="button" onClick={handleCloseBoardMeetingModal} className="px-4 py-2 text-gray-700">Cancel</button>
                <button type="button" onClick={handleSaveBoardMeeting} disabled={!selectedBoardMeeting || isSavingBoardApprovalList} className="bg-[#8B3205] text-white px-4 py-2 rounded-lg disabled:opacity-60">
                  {isSavingBoardApprovalList ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreationConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-lg border bg-white shadow-xl">
            <div className="flex items-start justify-between px-5 pt-5">
              <h2 className="text-2xl font-semibold text-[#8B3205]">Confirmation</h2>
              <button type="button" onClick={handleCloseCreationConfirmModal} className="text-gray-500">✕</button>
            </div>
            <div className="px-5 pb-5 pt-1">
              <p className="text-lg leading-relaxed text-gray-600">
                {createdBoardApprovalList?.listId
                  ? `The Board Approval List ${createdBoardApprovalList.listId} for ${createdBoardApprovalList.selectedCount ?? 0} requests has been created. Do you want to view the list?`
                  : 'The Board Approval List has been created. Do you want to view the list?'}
              </p>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button type="button" onClick={handleCloseCreationConfirmModal} className="bg-[#EAB308] text-white px-4 py-2 rounded-lg">No</button>
                <button type="button" onClick={handleViewCreatedList} className="bg-[#8B3205] text-white px-4 py-2 rounded-lg">Yes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}