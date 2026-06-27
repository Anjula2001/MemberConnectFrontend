"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { ArrowLeft, ChevronDown, ChevronUp, Eye, FileText } from "lucide-react";

type RequestRow = {
  id: number;
  requestId?: string;
  studentName: string;
  memberName?: string;
  memberId?: string;
  universityName?: string;
  status?: string;
  nic?: string;
  boardMeetingId?: number;
  boardMeetingName?: string;
};

type GroupedList = {
  boardMeetingId: number;
  boardMeetingName: string;
  requests: RequestRow[];
};

export default function ApprovalsPage() {
  const router = useRouter();
  const [groupedLists, setGroupedLists] = useState<GroupedList[]>([]);
  const [expandedMeetingId, setExpandedMeetingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("http://localhost:8080/api/university-scholarships");
      if (!res.ok) {
        throw new Error("Failed to fetch scholarship requests");
      }
      const data: RequestRow[] = await res.json();

      // Filter requests that are attached to a Board Meeting and have the appropriate status
      const attachedRequests = data.filter(
        (r) => r.boardMeetingId && (r.status === "ADDED_TO_NORMAL_BOARD_APPROVAL_LIST" || r.status === "Added to Normal Approval List")
      );

      // Group by boardMeetingId
      const groups: Record<number, GroupedList> = {};
      attachedRequests.forEach((req) => {
        const meetingId = req.boardMeetingId!;
        if (!groups[meetingId]) {
          groups[meetingId] = {
            boardMeetingId: meetingId,
            boardMeetingName: req.boardMeetingName || `Meeting #${meetingId}`,
            requests: [],
          };
        }
        groups[meetingId].requests.push(req);
      });

      setGroupedLists(Object.values(groups));
    } catch (error) {
      console.error("Error fetching approval lists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (meetingId: number) => {
    setExpandedMeetingId((prev) => (prev === meetingId ? null : meetingId));
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/scholarships/university">
          <Button variant="ghost" size="icon" className="text-[#953002] hover:bg-[#fff6f2]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-[#953002]">
          University Scholarship Normal Approval Lists
        </h1>
      </div>

      <Card className="rounded-xl shadow-sm overflow-hidden py-0">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-lg text-[#953002]">Created Approval Lists</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Retrieving approval lists...</div>
          ) : groupedLists.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No University Scholarship Normal Approval Lists created yet.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="font-semibold text-gray-700">List ID / Meeting ID</TableHead>
                    <TableHead className="font-semibold text-gray-700">Scheduled Meeting Date</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center">No. of Requests</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedLists.map((list) => {
                    const isExpanded = expandedMeetingId === list.boardMeetingId;
                    return (
                      <>
                        <TableRow
                          key={list.boardMeetingId}
                          className="hover:bg-gray-50 cursor-pointer border-t"
                          onClick={() => toggleExpand(list.boardMeetingId)}
                        >
                          <TableCell className="p-4 text-center">
                            {isExpanded ? (
                              <ChevronUp size={16} className="text-gray-500" />
                            ) : (
                              <ChevronDown size={16} className="text-gray-500" />
                            )}
                          </TableCell>
                          <TableCell className="p-4 font-medium text-gray-800">
                            {list.boardMeetingName}
                          </TableCell>
                          <TableCell className="p-4 text-gray-600">
                            Meeting Record #{list.boardMeetingId}
                          </TableCell>
                          <TableCell className="p-4 text-center text-gray-800 font-semibold">
                            {list.requests.length} Requests
                          </TableCell>
                          <TableCell className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#953002] hover:bg-[#fff6f2] gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(list.boardMeetingId);
                              }}
                            >
                              <Eye size={14} />
                              {isExpanded ? "Hide Details" : "View Details"}
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="bg-[#fffdfb]">
                            <TableCell colSpan={5} className="p-0">
                              <div className="px-8 py-4 border-b border-t">
                                <h4 className="text-sm font-bold text-[#7a2700] mb-3 flex items-center gap-1.5">
                                  <FileText size={16} />
                                  Attached Scholarship Requests
                                </h4>
                                <div className="border rounded-md overflow-hidden bg-white">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-gray-50/50">
                                        <TableHead className="font-semibold text-xs text-gray-600">Request ID</TableHead>
                                        <TableHead className="font-semibold text-xs text-gray-600">Student Name</TableHead>
                                        <TableHead className="font-semibold text-xs text-gray-600">NIC</TableHead>
                                        <TableHead className="font-semibold text-xs text-gray-600">Member Name</TableHead>
                                        <TableHead className="font-semibold text-xs text-gray-600">University</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {list.requests.map((req) => (
                                        <TableRow key={req.id} className="hover:bg-gray-50/30 text-xs">
                                          <TableCell className="p-3 font-semibold text-[#953002]">
                                            <Link
                                              href={`/membership/directory/university-scholarship?requestId=${encodeURIComponent(req.requestId || String(req.id))}&mode=view`}
                                              className="hover:underline"
                                            >
                                              {req.requestId}
                                            </Link>
                                          </TableCell>
                                          <TableCell className="p-3 text-gray-700">{req.studentName}</TableCell>
                                          <TableCell className="p-3 text-gray-500">{req.nic || "-"}</TableCell>
                                          <TableCell className="p-3 text-gray-700">{req.memberName || "-"}</TableCell>
                                          <TableCell className="p-3 text-gray-600">{req.universityName || "-"}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
