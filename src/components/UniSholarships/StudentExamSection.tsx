"use client";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import Document from "./Document";

export default function UniversityScholarshipForm() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#953002]">
          New University Scholarship
        </h2>

        <div className="flex gap-2">
          <Button variant="outline">Save</Button>
          <Button className="bg-[#953002] hover:bg-[#7a2601] text-white" disabled>
            Submit
          </Button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT SECTION */}
        <div className="lg:col-span-2 space-y-6">

          {/* Student & Exam */}
          <section className="rounded-lg border p-4 bg-white">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Student & Exam
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="date"/>
              <Input placeholder="Student Name" />
              <Input placeholder="BC No" />
              <Input placeholder="Address" />
              <Input placeholder="Student NIC" />
              <Input placeholder="Mobile" />
            </div><br/>

            <div className="mb-4 flex items-center gap-2">
            <input
                type="checkbox"
                id="ApplicantType"
                className="h-4 w-4 accent-[#953002]"
            />
            <label
                htmlFor="ApplicantType"
                className="text-sm font-medium text-gray"
            >
                School Applicant
            </label>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Exam Year" />
              <Input placeholder="Exam No" />
              <Input placeholder="Z-Score" />
            </div>
          </section>

          {/* University & Program */}
          <section className="rounded-lg border p-4 bg-white">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              University & Program
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="University" />
              <Input placeholder="Program" />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Duration" disabled />
              <Input placeholder="Academic Year - Start Date" />
            </div>
          </section>

          {/* Minor Account */}
          <section className="rounded-lg border p-4 bg-white">
            <div className="flex gap-75">
                <h3 className="mb-4 text-xl font-bold text-[#953002]">
                    Minor Account Status
                </h3>

                <Button variant="outline" className="text-black bg-gray hover:bg-gray-200">
                    Refresh
                </Button>
            </div>
          </section>

          {/* Bank Details */}
          <section className="rounded-lg border p-4 bg-white">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Bank Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input placeholder="Account Holder Name" />
              <Input placeholder="Bank" />
              <Input placeholder="Branch" />
            </div>

            <div className="mt-4">
              <Input placeholder="Account No" />
            </div>
          </section>

        </div>

        {/* RIGHT SECTION – DOCUMENTS */}
        <div className="lg:col-span-1">
          <section className="rounded-lg border p-4 h-half bg-white">
            <Document/>
          </section>
        </div>

      </div>
    </div>
  );
}
