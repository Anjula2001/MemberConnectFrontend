"use client";

import React, { useState } from 'react';
import { Search, Eye, Loader2, Edit3, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Added for navigation
import axios from 'axios';

interface RequestData {
  id?: number;
  Id?: number;
  ID?: number;
  nameChangeRequestID?: string;
  nomineeChangeID?: string;
  nommineChangeId?: string;
  newNIC?: string;
  newEmailAddress?: string;
  status?: string;
  newStatus?: string;
  newFullName?: string;
  newNameInPayroll?: string;
  newNameAsInPayroll?: string;
  newnommineName?: string;
  relationship?: string;
  newRelationship?: string;
  nic?: string;
  newNomineeNIC?: string;
  address?: string;
  newNomineeAddress?: string;
}

export default function ProfileChangeRequests() {
  const router = useRouter(); // Initialize router
  const [requestType, setRequestType] = useState('Basic Profile Changes');
  const [statusFilter, setStatusFilter] = useState('Submitted for Approval');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleRetrieve = async () => {
    setLoading(true);
    setResults([]); // Clear previous results
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
      } else {
        alert("This request type is not yet connected to the backend.");
        setHasSearched(false);
      }
    } catch (error: any) {
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
      }


      setResults(prev => prev.filter(row => {
        const rowId = row.id || row.Id || row.ID || row.nameChangeRequestID || row.nomineeChangeID || row.nommineChangeId;
        return rowId !== id;
      }));
      alert("Request deleted successfully.");
    } catch (error: any) {
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
    } else {
      router.push(`/membership/profile-changes/${id}`);
    }
  };

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
        <div className="mt-6 flex justify-end">
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
              {results.map((row) => {
                const rowId = row.id || row.Id || row.ID || row.nameChangeRequestID || row.nomineeChangeID || row.nommineChangeId;
                const statusStr = row.status || row.newStatus || 'SUBMITTED';
                return (
                  <tr key={rowId || Math.random()} className="hover:bg-gray-50">
                    <td className="p-4">
                      <button onClick={() => { console.log("Editing row:", row); handleEdit(rowId); }} className="text-blue-600 font-bold hover:underline">
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
                        <td className="p-4 font-bold">{row.newnommineName || '-'}</td>
                        <td className="p-4 text-gray-600">{row.newRelationship || row.relationship || '-'}</td>
                        <td className="p-4 text-gray-600">{row.newNomineeNIC || row.nic || '-'}</td>
                        <td className="p-4 text-gray-600 truncate max-w-[150px]" title={row.newNomineeAddress || row.address || ''}>
                          {row.newNomineeAddress || row.address || '-'}
                        </td>
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
                        <button onClick={() => handleDelete(rowId)} className="text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                        <button onClick={() => { console.log("Editing row:", row); handleEdit(rowId); }} className="text-gray-600 hover:text-[#8B3205] flex items-center gap-1 transition-colors">
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {results.length === 0 && (
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
    </div>
  );
}