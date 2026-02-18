"use client";

import { useState, useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Badge } from "@/src/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Input } from "@/src/components/ui/input";

interface DormantMember {
  id: string;
  name: string;
  memberNumber: string;
  lastActivity: string;
  selectedDate: string; // Date when member was selected for dormant
  obligation?: string;
}

type DateFilter = "all" | "thisMonth" | "thisAndLastMonth" | "datePeriod";

export default function DormantMembersPage() {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [dormantMembers, setDormantMembers] = useState<DormantMember[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRunProcess, setHasRunProcess] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const handleSelectMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };
  const handleSelectAll = () => {
    if (selectedMembers.length === filteredDormantMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredDormantMembers.map((member) => member.id));
    }
  };
  const handleRunNotificationProcess = async () => {
    setIsProcessing(true);
    setHasRunProcess(false);
    setDormantMembers([]);
    setSelectedMembers([]);
    
    try {
      // Simulate API call to identify dormant members
      // Replace this with your actual API endpoint
      // const response = await fetch('/api/members/identify-dormant');
      // const data = await response.json();
      
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
        // Mock data - replace with actual API response
      const identifiedMembers: DormantMember[] = [
        {
          id: "1",
          name: "Suresh Kumar",
          memberNumber: "MC-001234",
          lastActivity: "2024-01-01",
          selectedDate: "2026-02-18", // Today
        },
        {
          id: "2",
          name: "Johnathan Doe",
          memberNumber: "MC-001235",
          lastActivity: "2023-07-01",
          selectedDate: "2026-01-15", // Last month
        },
        {
          id: "3",
          name: "Maria Garcia",
          memberNumber: "MC-001236",
          lastActivity: "2023-12-15",
          selectedDate: "2025-12-20", // Two months ago
        },
      ];
      
      setDormantMembers(identifiedMembers);
      setHasRunProcess(true);
      
      // Auto-select all identified members
      setSelectedMembers(identifiedMembers.map(m => m.id));
      
    } catch (error) {
      console.error("Error identifying dormant members:", error);
      alert("Failed to identify dormant members. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateApprovalList = async () => {
    if (selectedMembers.length === 0) {
      alert("Please select at least one member to create an approval list.");
      return;
    }

    try {
      // Get selected member details
      const selectedMemberDetails = dormantMembers.filter((member) =>
        selectedMembers.includes(member.id)
      );

      // Here you would call your API to create the approval list
      // Example: await fetch('/api/dormant/create-approval-list', {
      //   method: 'POST',
      //   body: JSON.stringify({ members: selectedMemberDetails })
      // });

      console.log("Creating approval list for:", selectedMemberDetails);
      
      // Show success message
      alert(
        `Approval list created successfully!\n\n${selectedMembers.length} member(s) added:\n${selectedMemberDetails.map(m => `- ${m.name} (${m.memberNumber})`).join('\n')}`
      );

      // Optionally clear the list after creating approval
      // setDormantMembers([]);
      // setSelectedMembers([]);
      
    } catch (error) {      console.error("Error creating approval list:", error);
      alert("Failed to create approval list. Please try again.");
    }
  };

  // Filter dormant members based on selected date filter
  const filteredDormantMembers = useMemo(() => {
    if (dormantMembers.length === 0) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (dateFilter) {
      case "all":
        return dormantMembers;

      case "thisMonth": {
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
        return dormantMembers.filter((member) => {
          const selectedDate = new Date(member.selectedDate);
          return selectedDate >= startOfMonth && selectedDate <= endOfMonth;
        });
      }

      case "thisAndLastMonth": {
        const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
        return dormantMembers.filter((member) => {
          const selectedDate = new Date(member.selectedDate);
          return selectedDate >= startOfLastMonth && selectedDate <= endOfMonth;
        });
      }

      case "datePeriod": {
        if (!fromDate || !toDate) return dormantMembers;
        const from = new Date(fromDate);
        const to = new Date(toDate);
        return dormantMembers.filter((member) => {
          const selectedDate = new Date(member.selectedDate);
          return selectedDate >= from && selectedDate <= to;
        });
      }

      default:
        return dormantMembers;
    }
  }, [dormantMembers, dateFilter, fromDate, toDate]);

  // Update selected members when filter changes
  useMemo(() => {
    const filteredIds = filteredDormantMembers.map((m) => m.id);
    setSelectedMembers((prev) => prev.filter((id) => filteredIds.includes(id)));
  }, [filteredDormantMembers]);
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#8B4513]">Dormant Members</h1>
        <Button
          onClick={handleRunNotificationProcess}
          disabled={isProcessing}
          className="bg-[#8B4513] hover:bg-[#A0522D] text-white disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Identifying Members...
            </>
          ) : (
            "Run Identification Process"
          )}
        </Button>
      </div>      <Card className="border-2 border-[#ffffff]">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-[#8B4513]">
              Selected for Dormant
            </CardTitle>
            {dormantMembers.length > 0 && (
              <Button
                onClick={handleCreateApprovalList}
                disabled={selectedMembers.length === 0}
                className="bg-[#8B4513] hover:bg-[#A0522D] text-white disabled:opacity-50"
                size="sm"
              >
                Create Approval List
                {selectedMembers.length > 0 && ` (${selectedMembers.length})`}
              </Button>
            )}
          </div>          {/* Date Filter Section */}
          {dormantMembers.length > 0 && (
            <div className="mt-4 flex flex-wrap items-end gap-4">
              <div className="w-64">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Filter by Date Period
                </label>
                <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select date filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Days</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="thisAndLastMonth">This and Last Month</SelectItem>
                    <SelectItem value="datePeriod">Date Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilter === "datePeriod" && (
                <>
                  <div className="w-48">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="w-48">
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              <div className="text-sm text-muted-foreground ml-auto">
                Showing {filteredDormantMembers.length} of {dormantMembers.length} members
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectedMembers.length === filteredDormantMembers.length &&
                      filteredDormantMembers.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={filteredDormantMembers.length === 0}
                  />
                </TableHead>
                <TableHead className="font-semibold">Member</TableHead>
                <TableHead className="font-semibold">Last Activity</TableHead>
                <TableHead className="font-semibold">Selected Date</TableHead>
                <TableHead className="font-semibold">Obligation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isProcessing ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        className="animate-spin h-12 w-12 text-[#8B4513]"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>                      <p className="text-muted-foreground font-medium">
                        Running identification process...
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDormantMembers.length > 0 ? (
                filteredDormantMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => handleSelectMember(member.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {member.memberNumber}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{member.lastActivity}</TableCell>
                    <TableCell>{member.selectedDate}</TableCell>
                    <TableCell>
                      {member.obligation && (
                        <Badge variant="secondary">{member.obligation}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : dormantMembers.length > 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <p className="font-medium">
                        No members found for the selected date period.
                      </p>
                      <p className="text-sm">
                        Try adjusting your date filter.                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <svg
                        className="w-16 h-16 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <p className="font-semibold text-base">
                        {hasRunProcess
                          ? `Process Complete: Identified ${dormantMembers.length} dormant members.`
                          : "No dormant members identified yet"}
                      </p>
                      <p className="text-sm">
                        {!hasRunProcess && "Click 'Run Identification Process' to find dormant members"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
