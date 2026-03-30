"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { Eye, Trash2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface ApprovalList {
  id: string;
  listId: string;
  meeting: string;
  type: "RETIREMENT" | "TERMINATION";
  requests: number;
  status: "CREATED" | "SUBMITTED" | "APPROVED" | "REJECTED";
}

export default function TerminationApprovalListsPage() {
  const router = useRouter();
  
  // Sample data - replace with actual data from your API
  const [approvalLists] = useState<ApprovalList[]>([
    {
      id: "1",
      listId: "TAL-2026-001",
      meeting: "108 (2026-02-28)",
      type: "RETIREMENT",
      requests: 1,
      status: "CREATED",
    },
  ]);

  const getStatusBadge = (status: ApprovalList["status"]) => {
    const config = {
      CREATED: { color: "bg-yellow-100 text-yellow-800", label: "CREATED" },
      SUBMITTED: { color: "bg-blue-100 text-blue-800", label: "SUBMITTED" },
      APPROVED: { color: "bg-green-100 text-green-800", label: "APPROVED" },
      REJECTED: { color: "bg-red-100 text-red-800", label: "REJECTED" },
    };

    const { color, label } = config[status];
    return (
      <Badge variant="secondary" className={`${color} hover:${color}`}>
        {label}
      </Badge>
    );
  };

  const handleViewList = (listId: string) => {
    console.log("View approval list:", listId);
    // Navigate to approval list detail page or open modal
  };

  const handleDeleteList = (listId: string) => {
    console.log("Delete approval list:", listId);
    // Show confirmation dialog and delete
  };

  const handleBack = () => {
    router.push("/membership/termination");
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center gap-4">
        <Button
          onClick={handleBack}
          variant="ghost"
          size="sm"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-[#8B4513]">Termination Approval Lists</h1>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Approval Lists</h2>
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">List ID</TableHead>
                <TableHead className="font-semibold">Meeting</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Requests</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvalLists.length > 0 ? (
                approvalLists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{list.listId}</TableCell>
                    <TableCell>{list.meeting}</TableCell>
                    <TableCell>{list.type}</TableCell>
                    <TableCell>{list.requests}</TableCell>
                    <TableCell>{getStatusBadge(list.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewList(list.id)}
                          className="gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteList(list.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No approval lists found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
