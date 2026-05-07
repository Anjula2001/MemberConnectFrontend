"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default function CreateDeathDonationPage() {
  const router = useRouter();

  // Header state
  const [requestId, setRequestId] = useState("NEW");
  const [status, setStatus] = useState("NEW");

//form state

	const [form, setForm] = useState({
  relationship: "",
  requestedDate: "",
  isMember: "NO",
  deceasedMemberId: "",
  deceasedName: "",
  certificateNo: "",
  deceasedDate: "",
  concerns: "",
});


// Close relatives grid state
const [relatives, setRelatives] = useState<
  {
    memberId: string;
    relationship: string;
    isAuto: boolean; // true = from system (cannot delete)
  }[]
>([]);

//add support state and function

const [newMemberId, setNewMemberId] = useState("");
const [newRelationship, setNewRelationship] = useState("");

const handleAddRelative = () => {
  if (!newMemberId || !newRelationship) {
    alert("Enter member and relationship");
    return;
  }

  setRelatives([
    ...relatives,
    {
      memberId: newMemberId,
      relationship: newRelationship,
      isAuto: false,
    },
  ]);

  setNewMemberId("");
  setNewRelationship("");
};

//remove logic

const handleRemoveRelative = (index: number) => {
  const updated = [...relatives];
  updated.splice(index, 1);
  setRelatives(updated);
};


//refresh logic

const handleRefresh = () => {
  if (!form.certificateNo) {
    alert("Enter Death Certificate Number first");
    return;
  }

  // Simulated backend result
  const autoMembers = [
    {
      memberId: "MEM999",
      relationship: "Brother",
      isAuto: true,
    },
  ];

  setRelatives([...relatives, ...autoMembers]);
};


// Document types
const [documents, setDocuments] = useState([
  {
    type: "Death Certificate",
    mandatory: true,
    files: [] as {
      name: string;
      type: string;
      uploadedAt: string;
    }[],
  },
  {
    type: "NIC Copy",
    mandatory: true,
    files: [] as any[],
  },
  {
    type: "Other Documents",
    mandatory: false,
    files: [] as any[],
  },
]);

//upload function

const handleUpload = (docIndex: number, file: File) => {
  const updated = [...documents];

  updated[docIndex].files.push({
    name: file.name,
    type: file.type,
    uploadedAt: new Date().toLocaleString(),
  });

  setDocuments(updated);
};

//delete file function

const handleDeleteFile = (docIndex: number, fileIndex: number) => {
  const updated = [...documents];
  updated[docIndex].files.splice(fileIndex, 1);
  setDocuments(updated);
};

// // Mandatory document check
// const missingDocs = documents.some(
//   (doc) => doc.mandatory && doc.files.length === 0
// );

// if (missingDocs) {
//   alert("Please upload all mandatory documents");
//   return false;
// }

  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border">
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div>
            <h1 className="text-2xl font-bold text-[#8B4513]">
              Create Death Donation Request
            </h1>
            <p className="text-sm text-gray-500">
              MMD01 - Death Donation Request Entry
            </p>
          </div>
        </div>

        <Badge className="bg-blue-100 text-blue-800">
          {status}
        </Badge>
      </div>

	  {/* Member Details */}
<div className="bg-white p-5 rounded-xl shadow-sm border">

  <div className="flex items-center gap-2 mb-4">
    <div className="w-2 h-6 bg-[#8B4513]"></div>
    <h2 className="font-semibold text-gray-800">Member Details</h2>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    
    <Input value="MEM001245" disabled />
    <Input value="Perera A.B." disabled />
    <Input value="902345678V" disabled />

  </div>
</div>


{/* Request Details */}
<div className="bg-white p-5 rounded-xl shadow-sm border">

  <div className="flex items-center gap-2 mb-4">
    <div className="w-2 h-6 bg-[#8B4513]"></div>
    <h2 className="font-semibold text-gray-800">Request Details</h2>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

    {/* Relationship */}
    <div>
      <label className="text-sm">Relationship *</label>
      <select
        value={form.relationship}
        onChange={(e) =>
          setForm({ ...form, relationship: e.target.value })
        }
        className="w-full border rounded-md h-10 px-2"
      >
        <option value="">Select</option>
        <option>Father</option>
        <option>Mother</option>
        <option>Spouse</option>
      </select>
    </div>

    {/* Requested Date */}
    <div>
      <label className="text-sm">Requested Date *</label>
      <Input
        type="date"
        value={form.requestedDate}
        onChange={(e) =>
          setForm({ ...form, requestedDate: e.target.value })
        }
      />
    </div>

    {/* Is Member */}
    <div>
      <label className="text-sm">Is Deceased a Member *</label>
      <select
        value={form.isMember}
        onChange={(e) =>
          setForm({ ...form, isMember: e.target.value })
        }
        className="w-full border rounded-md h-10 px-2"
      >
        <option value="NO">No</option>
        <option value="YES">Yes</option>
      </select>
    </div>

    {/* Conditional Member ID */}
    {form.isMember === "YES" && (
      <div>
        <label className="text-sm">Member ID</label>
        <Input
          value={form.deceasedMemberId}
          onChange={(e) =>
            setForm({ ...form, deceasedMemberId: e.target.value })
          }
        />
      </div>
    )}

    {/* Name */}
    <div className="md:col-span-2">
      <label className="text-sm">Deceased Name *</label>
      <Input
        value={form.deceasedName}
        onChange={(e) =>
          setForm({ ...form, deceasedName: e.target.value })
        }
      />
    </div>

    {/* Death Date */}
    <div>
      <label className="text-sm">Deceased Date *</label>
      <Input
        type="date"
        value={form.deceasedDate}
        onChange={(e) =>
          setForm({ ...form, deceasedDate: e.target.value })
        }
      />
    </div>

    {/* Certificate */}
    <div>
      <label className="text-sm">Death Certificate No *</label>
      <Input
        value={form.certificateNo}
        onChange={(e) =>
          setForm({ ...form, certificateNo: e.target.value })
        }
      />
    </div>

    {/* Concerns */}
    <div className="md:col-span-2">
      <label className="text-sm">Concerns Identified</label>
      <textarea
        value={form.concerns}
        onChange={(e) =>
          setForm({ ...form, concerns: e.target.value })
        }
        className="w-full border rounded-md p-2"
      />
    </div>

  </div>
</div>

{/* Add New Relative */}
<div className="bg-white p-5 rounded-xl shadow-sm border">

  <div className="flex items-center gap-2 mb-4">
    <div className="w-2 h-6 bg-[#8B4513]"></div>
    <h2 className="font-semibold text-gray-800">Add Close Relative</h2>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

    <Input
      placeholder="Member ID"
      value={newMemberId}
      onChange={(e) => setNewMemberId(e.target.value)}
    />

    <select
      value={newRelationship}
      onChange={(e) => setNewRelationship(e.target.value)}
      className="border rounded-md h-10 px-2"
    >
      <option value="">Relationship</option>
      <option>Brother</option>
      <option>Sister</option>
      <option>Spouse</option>
    </select>

    <Button onClick={handleAddRelative}>
      Add
    </Button>

  </div>
</div>



{/*Close Relatives Grid*/}
<div className="bg-white p-5 rounded-xl shadow-sm border">

  <div className="flex justify-between items-center mb-4">
    <h2 className="font-semibold text-gray-800">
      Members who are close relatives
    </h2>

    <Button onClick={handleRefresh}>
      Refresh
    </Button>
  </div>

  <table className="w-full border text-sm">
    <thead className="bg-gray-100">
      <tr>
        <th className="p-2">Member ID</th>
        <th className="p-2">Relationship</th>
        <th className="p-2">Source</th>
        <th className="p-2">Action</th>
      </tr>
    </thead>

    <tbody>
      {relatives.map((r, i) => (
        <tr key={i} className="border-t">
          <td className="p-2">{r.memberId}</td>
          <td className="p-2">{r.relationship}</td>

          <td className="p-2">
            {r.isAuto ? (
              <span className="text-green-600 font-medium">Auto</span>
            ) : (
              <span className="text-gray-500">Manual</span>
            )}
          </td>

          <td className="p-2">
            {!r.isAuto && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleRemoveRelative(i)}
              >
                Remove
              </Button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

/* Required Documents */
<div className="bg-white p-5 rounded-xl shadow-sm border">

  <div className="flex items-center gap-2 mb-4">
    <div className="w-2 h-6 bg-[#8B4513]"></div>
    <h2 className="font-semibold text-gray-800">Required Documents</h2>
  </div>

  <div className="space-y-5">
    {documents.map((doc, index) => (
      <div key={index} className="border rounded-lg p-4">

        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="font-medium">{doc.type}</span>

            {doc.mandatory && (
              <span className="text-red-500 text-xs ml-2">
                * Mandatory
              </span>
            )}
          </div>

          {/* Upload */}
          <label className="bg-[#8B4513] text-white px-3 py-1 rounded cursor-pointer text-sm">
            Add
            <input
              type="file"
              className="hidden"
              onChange={(e) =>
                e.target.files &&
                handleUpload(index, e.target.files[0])
              }
            />
          </label>
        </div>

        {/* Files */}
        {doc.files.length > 0 ? (
          <div className="space-y-2">
            {doc.files.map((file, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-gray-50 p-2 rounded"
              >
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {file.type} • {file.uploadedAt}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteFile(index, i)}
                >
                  Delete
                </Button>
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
</div>

<div className="flex justify-end gap-3">

  <Button variant="outline">
    Incomplete
  </Button>

  <Button className="bg-gray-600 text-white">
    Save
  </Button>

  <Button className="bg-[#8B4513] text-white">
    Submit
  </Button>

</div>

    </div>
  );
}