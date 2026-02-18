"use client";

import React, { useState } from 'react';
import { Search, Eye } from 'lucide-react';

// Types for our data
interface RequestData {
  id: string;
  date: string;
  memberId: string;
  name: string;
  status: string;
  type: string;
}

const DUMMY_DATA: RequestData[] = [
  { id: "PCR-2026-001", date: "2026-02-08", memberId: "200203302803", name: "Johnathan Doe", status: "SUBMITTED", type: "Basic Profile Changes" },
  { id: "PCR-2026-002", date: "2026-02-10", memberId: "MB-2023045", name: "Jane Smith", status: "APPROVED", type: "Name Changes" },
  { id: "PCR-2026-003", date: "2026-02-12", memberId: "MB-2023099", name: "Ali Khan", status: "REJECTED", type: "Basic Profile Changes" },
];

export default function ProfileChangeRequests() {
  const [requestType, setRequestType] = useState('Basic Profile Changes');
  const [status, setStatus] = useState('Submitted for Approval');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<RequestData[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleRetrieve = () => {
    // Basic filter logic
    const filtered = DUMMY_DATA.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.memberId.includes(searchQuery) || 
                            item.id.includes(searchQuery);
      return matchesSearch; 
      // Note: In a real app, you'd filter by dropdowns here too
    });
    setResults(filtered);
    setHasSearched(true);
  };

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen">
      {/* Header Row */}
      <div className="flex justify-between items-center mb-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-[#8B3205]">All Member Profile Change Requests</h1>
        <button className="px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
          View Approval Lists
        </button>
      </div>

      {/* Search & Filter Card */}
      <div className="max-w-7xl mx-auto bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
        <h2 className="text-xl font-bold text-[#8B3205] mb-6">Search & Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Request Type</label>
            <select 
              value={requestType} 
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#8B3205]"
            >
              <option>Basic Profile Changes</option>
              <option>Name Changes</option>
              <option>Remittance Amount Changes</option>
              <option>Tranfers</option>
              <option>Nominee Changes</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Status</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#8B3205]"
            >
              <option>Submitted for Approval</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600">Search Member</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Name, NIC, ID..." 
                className="w-full pl-10 pr-4 p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-[#8B3205]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button 
            onClick={handleRetrieve}
            className="bg-[#8B3205] hover:bg-[#722904] text-white px-10 py-2.5 rounded-lg font-bold transition-all"
          >
            Retrieve
          </button>
        </div>
      </div>

      {/* Results Table */}
      {hasSearched && (
        <div className="max-w-7xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#FDFDFD] border-b border-gray-100">
              <tr>
                <th className="p-4 w-12"><input type="checkbox" className="rounded text-[#8B3205]" /></th>
                <th className="p-4 text-sm font-semibold text-gray-500">Request ID</th>
                <th className="p-4 text-sm font-semibold text-gray-500">Requested Date</th>
                <th className="p-4 text-sm font-semibold text-gray-500">Member ID</th>
                <th className="p-4 text-sm font-semibold text-gray-500">Name</th>
                <th className="p-4 text-sm font-semibold text-gray-500 text-center">Status</th>
                <th className="p-4 text-sm font-semibold text-gray-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4"><input type="checkbox" className="rounded" /></td>
                  <td className="p-4 text-sm text-gray-600 font-medium">{row.id}</td>
                  <td className="p-4 text-sm text-gray-600">{row.date}</td>
                  <td className="p-4 text-sm font-bold text-gray-800">{row.memberId}</td>
                  <td className="p-4 text-sm text-gray-600">{row.name}</td>
                  <td className="p-4 text-center">
                    <span className="bg-[#EAB308] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="inline-flex items-center gap-2 text-sm text-gray-600 font-medium hover:text-black">
                      <Eye className="w-4 h-4" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}