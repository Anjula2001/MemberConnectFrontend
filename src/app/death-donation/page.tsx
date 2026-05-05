"use client";

import { useState, useEffect } from "react";
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
import { Eye, Edit, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getAllDeathDonationRequests,
  type DeathDonationResponse,
  type DeathDonationStatus,
} from "@/lib/api/deathDonation";

type StatusFilter = "all" | DeathDonationStatus;

export default function DeathDonationPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [requests, setRequests] = useState<DeathDonationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllDeathDonationRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  // Filter requests based on status and search query
  const filteredRequests = requests.filter((request) => {
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      request.deceasedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.deathCertificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusColor: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-800",
    SUBMITTED_FOR_APPROVAL: "bg-yellow-100 text-yellow-800",
    DISTRICT_COMMITTEE: "bg-purple-100 text-purple-800",
    PD_COMMITTEE: "bg-orange-100 text-orange-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    INCOMPLETE: "bg-gray-200 text-gray-700",
  };

  const getStatusBadge = (status: DeathDonationStatus) => {
    const colorClass = statusColor[status] ?? "bg-gray-100 text-gray-800";
    return (
      <Badge variant="secondary" className={`${colorClass} hover:${colorClass}`}>
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  const handleViewRequest = (requestId: string) => {
    console.log("View request:", requestId);
    // Navigate to request detail page or open modal
    router.push(`/membership/directory/death-donation-request?id=${requestId}`);
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
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="SUBMITTED_FOR_APPROVAL">Submitted for Approval</SelectItem>
                    <SelectItem value="DISTRICT_COMMITTEE">District Committee</SelectItem>
                    <SelectItem value="PD_COMMITTEE">P&D Committee</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                    <SelectItem value="INCOMPLETE">Incomplete</SelectItem>
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
                  <TableHead className="font-semibold">Cert. No.</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex justify-center items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading requests...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-red-600 font-medium">
                      {error}
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium text-[#8B4513]">{request.requestId}</TableCell>
                      <TableCell>{request.requestedDate}</TableCell>
                      <TableCell>{request.deceasedName}</TableCell>
                      <TableCell>{request.memberName}</TableCell>
                      <TableCell>{request.deathCertificateNumber}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRequest(request.id.toString())}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          title={request.status === "NEW" || request.status === "INCOMPLETE" ? "Edit Request" : "View Request"}
                        >
                          {request.status === "NEW" || request.status === "INCOMPLETE" ? (
                            <Edit className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No requests found. Try adjusting your search criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {!loading && !error && filteredRequests.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredRequests.length} of {requests.length} requests
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
