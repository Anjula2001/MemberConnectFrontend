"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/src/components/ui/select";
import { Badge } from "@/src/components/ui/badge";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

export default function RequestTerminationPage() {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [requestedDate, setRequestedDate] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    console.log("Save termination request", { reason, requestedDate, effectiveDate, notes });
    alert("Saved (mock)");
  };
  const handleMarkIncomplete = () => {
    console.log("Mark incomplete");
    alert("Marked incomplete (mock)");
  };
  const handleSubmit = () => {
    console.log("Submit for approval", { reason, requestedDate, effectiveDate, notes });
    alert("Submitted for approval (mock)");
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#8B4513]">Termination Request: TR-2026-003</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-muted-foreground">Member: Jane Smith (MB-2023002)</span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">Status: NEW</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} className="border-[#8B4513] text-[#8B4513] hover:bg-[#8B4513] hover:text-white">
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
          <Button variant="destructive" onClick={handleMarkIncomplete} className="bg-red-600 hover:bg-red-700 text-white">
            <AlertCircle className="mr-2 h-4 w-4" /> Mark Incomplete
          </Button>
          <Button onClick={handleSubmit} className="bg-[#8B4513] hover:bg-[#A0522D] text-white">
            Submit for Approval
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Termination Reason</label>
                  <Select onValueChange={(v) => setReason(v)} value={reason}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resignation">Resignation From Post</SelectItem>
                      <SelectItem value="disciplinary">Disciplinary Action</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Requested Date</label>
                  <Input type="date" value={requestedDate} onChange={(e) => setRequestedDate((e.target as HTMLInputElement).value)} />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Effective Date</label>
                  <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate((e.target as HTMLInputElement).value)} />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Notes</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border px-3 py-2 min-h-[120px]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Minor Savings Disbursement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Enter disbursement details for any minor savings accounts</p>
                <Button size="sm" onClick={() => alert('Add account (mock)')} className="bg-[#8B4513] hover:bg-[#A0522D] text-white">+ Add Account</Button>
              </div>

              <div className="mt-4 text-sm text-muted-foreground">No minor savings accounts added.</div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-6 text-center text-muted-foreground">
                <p>No files attached (Mock)</p>
                <Button variant="ghost" size="sm" className="mt-4">Upload</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}