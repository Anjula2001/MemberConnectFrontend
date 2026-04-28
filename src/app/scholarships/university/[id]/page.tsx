"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { ArrowLeft } from "lucide-react";

type RequestDetail = {
  id: number;
  memberId?: string;
  requestId?: string;
  studentName: string;
  memberName?: string;
  universityName?: string;
  status?: string;
  nic?: string;
  birthCertificateNumber?: string;
  address?: string;
  mobile?: string;
  examNumber?: string;
  applicationReceivedOn?: string;
  applicantType?: string;
  examYear?: string;
  programName?: string;
  duration?: string;
  requestDate?: string;
  academicYearStartDate?: string;
  hasMinorAccount?: string;
  minorAccountMonths?: string;
  bankName?: string;
  branchName?: string;
  accountNumber?: string;
  incompleteReason?: string;
  zscore?: string;
};

export default function DetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const mode = searchParams.get("mode") || "view";

  const [record, setRecord] = useState<RequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setIsLoading(true);
        // Fetch all records and find the one matching the ID
        const response = await fetch(
          `http://localhost:8080/api/university-scholarships`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch records");
        }

        const allRecords: RequestDetail[] = await response.json();
        const foundRecord = allRecords.find((r) => r.id === parseInt(id));

        if (!foundRecord) {
          throw new Error("Record not found");
        }

        setRecord(foundRecord);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setRecord(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchRecord();
    }
  }, [id]);

  const renderField = (label: string, value: any) => {
    return (
      <div className="grid grid-cols-3 gap-4 py-3 border-b last:border-b-0">
        <div className="font-medium text-gray-700">{label}</div>
        <div className="col-span-2 text-gray-600">
          {value || <span className="text-gray-400">-</span>}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="text-center py-12">Loading record...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-700">{error}</div>
            <Link href="/scholarships/university" className="mt-4 inline-block">
              <Button variant="outline">Back to List</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-gray-600">Record not found</div>
            <Link href="/scholarships/university" className="mt-4 inline-block">
              <Button variant="outline">Back to List</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/scholarships/university">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            University Scholarship Request
          </h1>
        </div>
        <div className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
          {mode === "view" ? "VIEW MODE" : "EDIT MODE"}
        </div>
      </div>

      {/* Request Information */}
      <Card>
        <CardHeader>
          <CardTitle>Request Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderField("Request ID", record.requestId)}
          {renderField("Status", record.status)}
          {renderField("Request Date", record.requestDate)}
          {renderField("Application Received On", record.applicationReceivedOn)}
        </CardContent>
      </Card>

      {/* Student Information */}
      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderField("Student Name", record.studentName)}
          {renderField("NIC", record.nic)}
          {renderField("Birth Certificate Number", record.birthCertificateNumber)}
          {renderField("Mobile", record.mobile)}
          {renderField("Address", record.address)}
          {renderField("Applicant Type", record.applicantType)}
        </CardContent>
      </Card>

      {/* Member Information */}
      <Card>
        <CardHeader>
          <CardTitle>Member Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderField("Member ID", record.memberId)}
          {renderField("Member Name", record.memberName)}
        </CardContent>
      </Card>

      {/* Academic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderField("University", record.universityName)}
          {renderField("Program Name", record.programName)}
          {renderField("Exam Number", record.examNumber)}
          {renderField("Exam Year", record.examYear)}
          {renderField("Duration", record.duration)}
          {renderField("Z-Score", record.zscore)}
          {renderField("Academic Year Start Date", record.academicYearStartDate)}
        </CardContent>
      </Card>

      {/* Bank Information */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderField("Bank Name", record.bankName)}
          {renderField("Branch Name", record.branchName)}
          {renderField("Account Number", record.accountNumber)}
          {renderField("Has Minor Account", record.hasMinorAccount)}
          {renderField("Minor Account Months", record.minorAccountMonths)}
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {renderField("Incomplete Reason", record.incompleteReason)}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Link href="/scholarships/university">
          <Button variant="outline">Back to List</Button>
        </Link>
        {(record.status?.toUpperCase() === "NEW" ||
          record.status?.toUpperCase() === "INCOMPLETE") && (
          <Link href={`/scholarships/university/${record.id}?mode=edit`}>
            <Button className="bg-[#953002] hover:bg-[#c44515]">
              Edit Record
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
