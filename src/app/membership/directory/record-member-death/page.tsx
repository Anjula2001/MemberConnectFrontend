"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { ArrowLeft, Upload, X } from "lucide-react";

export default function RecordMemberDeathPage() {
  const router = useRouter();

  // Header
  const [recordId, setRecordId] = useState("NEW");
  const [status, setStatus] = useState("NEW");
  // Member (mock - should come from backend)
  const member = {
    id: "MEM001245",
    name: "Perera A.B.",
    nic: "902345678V",
  };

  // Nominee (mock - should come from backend)
  const nominee = {
    name: "Fernando S.K.",
    relationship: "Spouse",
    address: "Colombo 10",
    idType: "NIC",
    idNumber: "876543210V",
  };

  // Death Info
  const [form, setForm] = useState({
    informedDate: "",
    deceasedDate: "",
    causeOfDeath: "",
    comment: "",
    concerns: "",
    mobile: "",
    email: "",
    bank: "",
    branch: "",
    accountNo: "",
  });
  const [minorAccounts, setMinorAccounts] = useState([
  {
    accountNumber: "MIN001",
    holderName: "Child A",
    disbursementBank: "",
    branch: "",
    accountNo: "",
  },
  {
    accountNumber: "MIN002",
    holderName: "Child B",
    disbursementBank: "",
    branch: "",
    accountNo: "",
  },
]);
  const [documents, setDocuments] = useState([
    {
      type: "Death Certificate",
      mandatory: true,
      files: [] as Array<{ name: string; type: string; uploadedAt: string }>,
    },
    {
      type: "Nominee ID Copy",
      mandatory: true,
      files: [] as Array<{ name: string; type: string; uploadedAt: string }>,
    },
    {
      type: "Other Documents",
      mandatory: false,
      files: [] as Array<{ name: string; type: string; uploadedAt: string }>,
    },
  ]);

  // Disbursement
  const [disbursementBank, setDisbursementBank] = useState("");
  const [disbursementBranch, setDisbursementBranch] = useState("");
  const [disbursementAccount, setDisbursementAccount] = useState("");

  const [files, setFiles] = useState<File[]>([]);  const isSubmitted = status !== "NEW";

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)]);
    }
  };
  const handleDocumentUpload = (index: number, file: File) => {
    const updated = [...documents];
    updated[index].files.push({
      name: file.name,
      type: file.type,
      uploadedAt: new Date().toLocaleString(),
    });
    setDocuments(updated);
  };

  const handleDeleteFile = (index: number) => {
    const updated = [...files];
    updated.splice(index, 1);
    setFiles(updated);
  };

  const handleDeleteDocumentFile = (docIndex: number, fileIndex: number) => {
    const updated = [...documents];
    updated[docIndex].files.splice(fileIndex, 1);
    setDocuments(updated);
  };

  const handleSave = () => {
    setRecordId("MD-0001");
    setStatus("NEW");
    alert("Saved successfully");
  };  const handleSubmit = () => {
    if (!form.informedDate || !form.deceasedDate || !form.causeOfDeath || !form.mobile || !form.bank) {
      alert("Please fill all mandatory fields");
      return;
    }

    setStatus("SUBMITTED_FOR_APPROVAL");
    alert("Submitted for approval");
  };

  const handleIncomplete = () => {
    setStatus("INCOMPLETE");
  };
  const getStatusBadgeColor = (statusValue: string) => {
    switch (statusValue) {
      case "NEW":
        return "bg-blue-100 text-blue-800";
      case "SUBMITTED_FOR_APPROVAL":
        return "bg-yellow-100 text-yellow-800";
      case "INCOMPLETE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const validateForm = () => {
    if (!form.informedDate || !form.deceasedDate || !form.causeOfDeath) {
      alert("Please fill all required death details");
      return false;
    }

    if (!form.mobile || !form.bank || !form.branch || !form.accountNo) {
      alert("Please fill all required nominee details");
      return false;
    }

    // date validation
    if (new Date(form.deceasedDate) > new Date(form.informedDate)) {
      alert("Deceased date cannot be after informed date");
      return false;
    }

    // mandatory documents
    const missingDocs = documents.some(
      (doc) => doc.mandatory && doc.files.length === 0
    );

    if (missingDocs) {
      alert("Please upload all mandatory documents");
      return false;
    }

    // minor accounts validation
    for (let acc of minorAccounts) {
      if (!acc.disbursementBank || !acc.branch || !acc.accountNo) {
        alert("Please complete all minor account details");
        return false;
      }
    }

    return true;
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center bg-white rounded-xl p-5 shadow-sm border border-gray-200">
        {/* Left */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-[#8B4513]">
              Record Member Death
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage member death records
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <Badge className={`${getStatusBadgeColor(status)} px-3 py-1`}>
            {status}
          </Badge>
        </div>
      </div>      {/* Member Details */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
        {/* Section Title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-6 bg-[#8B4513] rounded-sm"></div>
          <h2 className="text-lg font-semibold text-gray-800">
            Member Details
          </h2>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Member ID */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600">
              Member ID
            </label>
            <Input
              value={member?.id || ""}
              disabled
              className="mt-1 bg-gray-50 font-medium"
            />
          </div>

          {/* Member Name */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600">
              Member Name
            </label>
            <Input
              value={member?.name || ""}
              disabled
              className="mt-1 bg-gray-50 font-medium"
            />
          </div>

          {/* NIC */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-600">
              NIC Number
            </label>
            <Input
              value={member?.nic || ""}
              disabled
              className="mt-1 bg-gray-50 font-medium"
            />
          </div>
        </div>
      </div>

{/* Death Information */}
<div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 mt-5">
  
  {/* Section Title */}
  <div className="flex items-center gap-2 mb-4">
    <div className="w-2 h-6 bg-[#8B4513] rounded-sm"></div>
    <h2 className="text-lg font-semibold text-gray-800">
      Death Information
    </h2>
  </div>

  {/* Content */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

    {/* Informed Date */}
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-600">
        Informed Date <span className="text-red-500">*</span>
      </label>
      <Input
        type="date"
        value={form.informedDate}
        onChange={(e) =>
          setForm({ ...form, informedDate: e.target.value })
        }
        className="mt-1"
      />
    </div>

    {/* Deceased Date */}
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-600">
        Deceased Date <span className="text-red-500">*</span>
      </label>
      <Input
        type="date"
        value={form.deceasedDate}
        onChange={(e) =>
          setForm({ ...form, deceasedDate: e.target.value })
        }
        className="mt-1"
      />
    </div>

    {/* Cause of Death */}
    <div className="flex flex-col md:col-span-2">
      <label className="text-sm font-medium text-gray-600">
        Cause of Death <span className="text-red-500">*</span>
      </label>
      <select
        value={form.causeOfDeath}
        onChange={(e) =>
          setForm({ ...form, causeOfDeath: e.target.value })
        }
        className="mt-1 h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
      >
        <option value="">Select cause</option>
        <option value="natural">Natural Causes</option>
        <option value="accident">Accident</option>
        <option value="illness">Illness</option>
        <option value="other">Other</option>
      </select>
    </div>

    {/* Comment */}
    <div className="flex flex-col md:col-span-2">
      <label className="text-sm font-medium text-gray-600">
        Comment
      </label>
      <textarea
        value={form.comment}
        onChange={(e) =>
          setForm({ ...form, comment: e.target.value })
        }
        rows={3}
        className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
      />
    </div>

    {/* Concerns */}
    <div className="flex flex-col md:col-span-2">
      <label className="text-sm font-medium text-gray-600">
        Concerns Identified
      </label>
      <textarea
        value={form.concerns}
        onChange={(e) =>
          setForm({ ...form, concerns: e.target.value })
        }
        rows={3}
        className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
      />
    </div>

  </div>
</div>

{/* Nominee Details */}
<div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 mt-5">
  
  {/* Title */}
  <div className="flex items-center gap-2 mb-4">
    <div className="w-2 h-6 bg-[#8B4513] rounded-sm"></div>
    <h2 className="text-lg font-semibold text-gray-800">
      Nominee Details
    </h2>
  </div>

  {/* 🔒 Read-only Info */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

    <div className="flex flex-col">
      <label className="text-sm text-gray-600">Full Name</label>
      <Input value={nominee?.name || ""} disabled className="mt-1 bg-gray-50" />
    </div>

    <div className="flex flex-col">
      <label className="text-sm text-gray-600">Relationship</label>
      <Input value={nominee?.relationship || ""} disabled className="mt-1 bg-gray-50" />
    </div>

    <div className="flex flex-col md:col-span-2">
      <label className="text-sm text-gray-600">Address</label>
      <Input value={nominee?.address || ""} disabled className="mt-1 bg-gray-50" />
    </div>

    <div className="flex flex-col">
      <label className="text-sm text-gray-600">Identification Type</label>
      <Input value={nominee?.idType || ""} disabled className="mt-1 bg-gray-50" />
    </div>

    <div className="flex flex-col">
      <label className="text-sm text-gray-600">Identification Number</label>
      <Input value={nominee?.idNumber || ""} disabled className="mt-1 bg-gray-50" />
    </div>

  </div>

  


  {/* ✏️ Editable Inputs */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

    {/* Mobile */}
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-600">
        Mobile Number <span className="text-red-500">*</span>
      </label>
      <Input
        value={form.mobile}
        onChange={(e) =>
          setForm({ ...form, mobile: e.target.value })
        }
        placeholder="07XXXXXXXX"
        className="mt-1"
      />
    </div>

    {/* Email */}
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-600">
        Email Address
      </label>
      <Input
        type="email"
        value={form.email}
        onChange={(e) =>
          setForm({ ...form, email: e.target.value })
        }
        className="mt-1"
      />
    </div>

    {/* Bank */}
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-600">
        Bank <span className="text-red-500">*</span>
      </label>
      <select
        value={form.bank}
        onChange={(e) =>
          setForm({ ...form, bank: e.target.value })
        }
        className="mt-1 h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B4513]"
      >
        <option value="">Select Bank</option>
        <option value="boc">Bank of Ceylon</option>
        <option value="peoples">People's Bank</option>
        <option value="hnb">HNB</option>
      </select>
    </div>

    {/* Branch */}
    <div className="flex flex-col">
      <label className="text-sm font-medium text-gray-600">
        Bank Branch <span className="text-red-500">*</span>
      </label>
      <Input
        value={form.branch}
        onChange={(e) =>
          setForm({ ...form, branch: e.target.value })
        }
        className="mt-1"
      />
    </div>

    {/* Account No */}
    <div className="flex flex-col md:col-span-2">
      <label className="text-sm font-medium text-gray-600">
        Account Number <span className="text-red-500">*</span>
      </label>
      <Input
        value={form.accountNo}
        onChange={(e) =>
          setForm({ ...form, accountNo: e.target.value })
        }
        className="mt-1"
      />
    </div>

  </div>
</div>      {/* Bank */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-white border-b border-gray-200">
          <CardTitle className="text-lg font-bold text-gray-900">Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Bank <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-300 rounded-md p-2 mt-2 bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                disabled={isSubmitted}
                value={form.bank}
                onChange={(e) => setForm({ ...form, bank: e.target.value })}
              >
                <option value="">Select Bank</option>
                <option>BOC</option>
                <option>Peoples Bank</option>
                <option>Commercial Bank</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">
                Branch <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Branch name"
                disabled={isSubmitted}
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">
                Account No <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Account number"
                disabled={isSubmitted}
                value={form.accountNo}
                onChange={(e) => setForm({ ...form, accountNo: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Minor Savings Accounts */}
{minorAccounts.length > 0 && (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 mt-5">
    
    {/* Title */}
    <div className="flex items-center gap-2 mb-4">
      <div className="w-2 h-6 bg-[#8B4513] rounded-sm"></div>
      <h2 className="text-lg font-semibold text-gray-800">
        Minor Savings Accounts
      </h2>
    </div>

    {/* List */}
    <div className="space-y-6">
      {minorAccounts.map((acc, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg p-4"
        >
          {/* Read-only Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            
            <div>
              <label className="text-sm text-gray-600">
                Account Number
              </label>
              <Input
                value={acc.accountNumber}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                Account Holder Name
              </label>
              <Input
                value={acc.holderName}
                disabled
                className="mt-1 bg-gray-50"
              />
            </div>

          </div>

          {/* Editable Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Bank */}
            <div>
              <label className="text-sm font-medium text-gray-600">
                Disbursement Bank <span className="text-red-500">*</span>
              </label>
              <select
                value={acc.disbursementBank}
                onChange={(e) => {
                  const updated = [...minorAccounts];
                  updated[index].disbursementBank = e.target.value;
                  setMinorAccounts(updated);
                }}
                className="mt-1 h-10 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-[#8B4513]"
              >
                <option value="">Select Bank</option>
                <option value="boc">Bank of Ceylon</option>
                <option value="peoples">People's Bank</option>
                <option value="hnb">HNB</option>
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="text-sm font-medium text-gray-600">
                Branch <span className="text-red-500">*</span>
              </label>
              <Input
                value={acc.branch}
                onChange={(e) => {
                  const updated = [...minorAccounts];
                  updated[index].branch = e.target.value;
                  setMinorAccounts(updated);
                }}
                className="mt-1"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="text-sm font-medium text-gray-600">
                Account Number <span className="text-red-500">*</span>
              </label>
              <Input
                value={acc.accountNo}
                onChange={(e) => {
                  const updated = [...minorAccounts];
                  updated[index].accountNo = e.target.value;
                  setMinorAccounts(updated);
                }}
                className="mt-1"
              />
            </div>

          </div>
        </div>
      ))}
    </div>
  </div>
)}


{/* Required Documents */}
<div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 mt-5">
  
  {/* Title */}
  <div className="flex items-center gap-2 mb-4">
    <div className="w-2 h-6 bg-[#8B4513] rounded-sm"></div>
    <h2 className="text-lg font-semibold text-gray-800">
      Required Documents
    </h2>
  </div>

  <div className="space-y-5">
    {documents.map((doc, index) => (
      <div key={index} className="border border-gray-200 rounded-lg p-4">

        {/* Document Type Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">
              {doc.type}
            </span>
            {doc.mandatory && (
              <span className="text-xs text-red-500 font-semibold">
                * Mandatory
              </span>
            )}
          </div>          {/* Upload Button */}
          <label className="cursor-pointer bg-[#8B4513] text-white px-3 py-1 rounded-md text-sm hover:opacity-90">
            Add
            <input
              type="file"
              className="hidden"
              onChange={(e) =>
                e.target.files && handleDocumentUpload(index, e.target.files[0])
              }
            />
          </label>
        </div>

        {/* Uploaded Files */}
        {doc.files.length > 0 ? (
          <div className="space-y-2">
            {doc.files.map((file, fileIndex) => (
              <div
                key={fileIndex}
                className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
              >
                <div className="text-sm">
                  <p className="font-medium text-gray-700">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {file.type} • {file.uploadedAt}
                  </p>
                </div>                {/* Delete */}
                <button
                  onClick={() => handleDeleteDocumentFile(index, fileIndex)}
                  className="text-red-500 text-sm hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            No files uploaded
          </p>
        )}

      </div>
    ))}
  </div>
</div>      {/* Action Buttons */}
<div className="flex justify-end gap-3 mt-6">
  
  {/* Save */}
  <Button
    onClick={handleSave}
    className="bg-gray-600 hover:bg-gray-700 text-white"
  >
    Save
  </Button>

  {/* Incomplete */}
  <Button
    onClick={handleIncomplete}
    variant="outline"
    className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
  >
    Incomplete
  </Button>

  {/* Submit */}
  <Button
    onClick={handleSubmit}
    className="bg-[#8B4513] hover:opacity-90 text-white"
  >
    Submit
  </Button>

</div>
    </div>
  );
}