"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Eye, Pencil } from "lucide-react";

interface TerminationRequest {
  id: string;
  requestId: string;
  date: string;
  member: string;
  memberNumber: string;
  reason: string;
  status: "NEW" | "SUBMITTED_FOR_APPROVAL" | "ADDED_TO_APPROVAL_LIST" | "APPROVED" | "REJECTED" | "INCOMPLETE";
}

type RequestType = "termination" | "retirement" | "all";
type StatusType = "new" | "submitted_for_approval" | "added_to_approval_list" | "approved" | "rejected" | "incomplete" | "all";

export default function TerminationPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState<RequestType>("termination");
  const [statusFilter, setStatusFilter] = useState<StatusType>("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);

  // Sample data - replace with API data
  const requests: TerminationRequest[] = [
    {
      id: "1",
      requestId: "TR-2026-003",
      date: "2026-02-06",
      member: "Jane Smith",
      memberNumber: "MR-001002",
      reason: "Personal reasons",
      status: "NEW",
    },
  ];

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "all" || request.status.toLowerCase() === statusFilter;
      const matchesSearch =
        searchQuery === "" ||
        request.member.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.memberNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.requestId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = requestType === "all" || (requestType === "termination" ? true : true); // placeholder for real type filtering
      return matchesStatus && matchesSearch && matchesType;
    });
  }, [requests, statusFilter, searchQuery, requestType]);

  const handleSelectRequest = (requestId: string) => {
    setSelectedRequests((prev) =>
      prev.includes(requestId) ? prev.filter((id) => id !== requestId) : [...prev, requestId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map((req) => req.id));
    }
  };

  const getStatusBadge = (status: TerminationRequest["status"]) => {
    const config: Record<string, { color: string; label: string }> = {
      NEW: { color: "bg-blue-100 text-blue-800", label: "NEW" },
      SUBMITTED_FOR_APPROVAL: { color: "bg-purple-100 text-purple-800", label: "SUBMITTED FOR APPROVAL" },
      ADDED_TO_APPROVAL_LIST: { color: "bg-indigo-100 text-indigo-800", label: "ADDED TO APPROVAL LIST" },
      APPROVED: { color: "bg-green-100 text-green-800", label: "APPROVED" },
      REJECTED: { color: "bg-red-100 text-red-800", label: "REJECTED" },
      INCOMPLETE: { color: "bg-gray-100 text-gray-800", label: "INCOMPLETE" },
    };

    const { color, label } = config[status];
    return (
      <Badge variant="secondary" className={`${color} hover:${color}`}>
        {label}
      </Badge>
    );
  };

  const handleViewRequest = (requestId: string) => {
    console.log("View request:", requestId);
  };

  const handleEditRequest = (requestId: string) => {
    console.log("Edit request:", requestId);
  };

  const handleRetrieve = () => {
    console.log("Retrieving requests with filters:", { requestType, statusFilter, searchQuery });
  };

  const handleViewApprovalLists = () => {
    router.push("/membership/termination/approval-lists");
  };

  const handleCreateApprovalList = () => {
    if (selectedRequests.length === 0) {
      alert("Please select at least one request to create an approval list.");
      return;
    }
    console.log("Creating approval list with selected requests:", selectedRequests);
    // Implement creation flow or navigate to creation page
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#8B4513]">Termination & Retirement Requests</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleCreateApprovalList}
            disabled={selectedRequests.length === 0}
            className="bg-[#8B4513] hover:bg-[#A0522D] text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Approval List
          </Button>
          <Button
            onClick={handleViewApprovalLists}
            variant="outline"
            className="border-[#8B4513] text-[#8B4513] hover:bg-[#8B4513] hover:text-white"
          >
            View Approval Lists
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-52">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Request Type</label>
              <Select value={requestType} onValueChange={(value) => setRequestType(value as RequestType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="termination">Termination</SelectItem>
                  <SelectItem value="retirement">Retirement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-52">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="submitted_for_approval">Submitted for Approval</SelectItem>
                  <SelectItem value="added_to_approval_list">Added to Approval List</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-64">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Search Member</label>
              <Input
                type="text"
                placeholder="Name, NIC, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <Button onClick={handleRetrieve} className="bg-[#8B4513] hover:bg-[#A0522D] text-white">Retrieve</Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedRequests.length === filteredRequests.length &&
                    filteredRequests.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                  disabled={filteredRequests.length === 0}
                />
              </TableHead>
              <TableHead className="font-semibold">Request ID</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Member</TableHead>
              <TableHead className="font-semibold">Reason</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedRequests.includes(request.id)}
                      onCheckedChange={() => handleSelectRequest(request.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{request.requestId}</TableCell>
                  <TableCell>{request.date}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{request.member}</span>
                      <span className="text-sm text-muted-foreground">{request.memberNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell>{request.reason}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewRequest(request.id)} className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditRequest(request.id)} className="h-8 w-8 p-0">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No requests found. Try adjusting your search criteria.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredRequests.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredRequests.length} request(s){selectedRequests.length > 0 && ` • ${selectedRequests.length} selected`}
        </div>
      )}
    </div>
  );
}
