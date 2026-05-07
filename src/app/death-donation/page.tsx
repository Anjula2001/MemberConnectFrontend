"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
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
import { Eye } from "lucide-react";

interface DeathDonationRequest {
  id: string;
  requestId: string;
  reqDate: string;
  deceased: string;
  member: string;
  status: "SUBMITTED_APPROVAL" | "DISTRICT_COMMITTEE" | "P_AND_D_COMMITTEE";
}

type StatusFilter = "all" | "SUBMITTED_APPROVAL" | "DISTRICT_COMMITTEE" | "P_AND_D_COMMITTEE";

export default function DeathDonationPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Sample data - replace with actual data from your API
  const requests: DeathDonationRequest[] = [
    {
      id: "1",
      requestId: "DD-2026-001",
      reqDate: "2026-02-01",
      deceased: "John Doe Sr.",
      member: "Johnathan Doe",
      status: "SUBMITTED_APPROVAL",
    },
    {
      id: "2",
      requestId: "DD-2026-002",
      reqDate: "2026-02-05",
      deceased: "Jane Smith (Spouse)",
      member: "Jane Smith",
      status: "DISTRICT_COMMITTEE",
    },
    {
      id: "3",
      requestId: "DD-2026-003",
      reqDate: "2026-01-15",
      deceased: "Child Perera",
      member: "Ranil Perera",
      status: "P_AND_D_COMMITTEE",
    },
  ];

  // Filter requests based on status and search query
  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      request.deceased.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.member.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: DeathDonationRequest["status"]) => {
    switch (status) {
      case "SUBMITTED_APPROVAL":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
            SUBMITTED_APPROVAL
          </Badge>
        );
      case "DISTRICT_COMMITTEE":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            DISTRICT_COMMITTEE
          </Badge>
        );
      case "P_AND_D_COMMITTEE":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            P_AND_D_COMMITTEE
          </Badge>
        );
    }
  };

  const handleViewRequest = (requestId: string) => {
    console.log("View request:", requestId);
    // Navigate to request detail page or open modal
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold text-[#8B4513]">Death Donation Requests</h1>

      <Card>
        <CardContent className="p-6">
          {/* Search Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Search</h2>
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="SUBMITTED_APPROVAL">Submitted Approval</SelectItem>
                    <SelectItem value="DISTRICT_COMMITTEE">District Committee</SelectItem>
                    <SelectItem value="P_AND_D_COMMITTEE">P&D Committee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-64">
                <Input
                  type="text"
                  placeholder="Search Deceased Name, Cert No, Member..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Request ID</TableHead>
                  <TableHead className="font-semibold">Req. Date</TableHead>
                  <TableHead className="font-semibold">Deceased</TableHead>
                  <TableHead className="font-semibold">Member</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.requestId}</TableCell>
                      <TableCell>{request.reqDate}</TableCell>
                      <TableCell>{request.deceased}</TableCell>
                      <TableCell>{request.member}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRequest(request.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No requests found. Try adjusting your search criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredRequests.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredRequests.length} of {requests.length} requests
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
