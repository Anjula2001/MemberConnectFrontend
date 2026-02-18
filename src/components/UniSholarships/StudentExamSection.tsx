"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { universityScholarshipSchema } from "@/lib/validators/universityscholarship.schema";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import Document from "./Document";
import { MarkIncompleteModal } from "./Incomplete";

type FormData = {
  requestDate: string;
  studentName: string;
  nic: string;
  bcNo: string;
  address: string;
  mobile: string;
  isSchoolApplicant?: boolean;
  examYear: string;
  examNo: string;
  zScore: string;
  university: string;
  program: string;
  duration?: string;
  accountNo: string;
  bank?: string;
  branch?: string;
};

export default function StudentExamSection() {
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(universityScholarshipSchema) as any, // Type assertion to bypass zod schema type issues
    mode: "onChange",
  });

  const onSubmit = (data: FormData) => {
    console.log("FORM SUBMITTED:", data);
  };

  const handleMarkIncomplete = (reason: string) => {
    console.log("FORM MARKED AS INCOMPLETE");
    console.log("Reason:", reason);

    // 🔹 You can call API here
    // await markAsIncomplete({ reason });

    setShowIncompleteModal(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#953002]">
            New University Scholarship
          </h2>

          <div className="flex gap-2">
            <Button
              type="button"
              className="bg-[#D4183D] text-white hover:bg-[#a3152f]"
              onClick={() => setShowIncompleteModal(true)}
            >
              Incomplete
            </Button>

            <Button variant="outline">Save</Button>

            <Button
              type="submit"
              disabled={!isValid}
              className="bg-[#953002] text-white hover:bg-[#7a2500] disabled:opacity-50"
            >
              Submit
            </Button>
          </div>
        </div>

        {/* FORM BODY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">

            {/* STUDENT & EXAM */}
            <section className="rounded-lg border p-4 bg-white">
              <h3 className="text-xl font-bold text-[#953002] mb-4">
                Student & Exam
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Input type="date" {...register("requestDate")} />
                  {errors.requestDate && (
                    <p className="text-red-500 text-sm">
                      {errors.requestDate.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input {...register("studentName")} placeholder="Student Name" />
                  {errors.studentName && (
                    <p className="text-red-500 text-sm">
                      {errors.studentName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input {...register("nic")} placeholder="Student NIC" />
                  {errors.nic && (
                    <p className="text-red-500 text-sm">
                      {errors.nic.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input {...register("bcNo")} placeholder="BC No" />
                  {errors.bcNo && (
                    <p className="text-red-500 text-sm">
                      {errors.bcNo.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input {...register("address")} placeholder="Address" />
                  {errors.address && (
                    <p className="text-red-500 text-sm">
                      {errors.address.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input {...register("mobile")} placeholder="Mobile" />
                  {errors.mobile && (
                    <p className="text-red-500 text-sm">
                      {errors.mobile.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register("isSchoolApplicant")}
                  className="h-4 w-4 accent-[#953002]"
                />
                <label className="text-sm font-medium text-gray-700">
                  School Applicant
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Input {...register("examYear")} placeholder="Exam Year" />
                  {errors.examYear && (
                    <p className="text-red-500 text-sm">
                      {errors.examYear.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input {...register("examNo")} placeholder="Exam No" />
                  {errors.examNo && (
                    <p className="text-red-500 text-sm">
                      {errors.examNo.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input {...register("zScore")} placeholder="Z-Score" />
                  {errors.zScore && (
                    <p className="text-red-500 text-sm">
                      {errors.zScore.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="outline">
                    Validate
                  </Button>
                </div>
              </div>
            </section>

            {/* UNIVERSITY */}
            <section className="rounded-lg border p-4 bg-white">
              <h3 className="text-xl font-bold text-[#953002] mb-4">
                University & Program
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <select
                    {...register("university")}
                    className="h-10 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Select University</option>
                    <option value="uom">University of Moratuwa</option>
                    <option value="uop">University of Peradeniya</option>
                    <option value="uoc">University of Colombo</option>
                  </select>
                  {errors.university && (
                    <p className="text-red-500 text-sm">
                      {errors.university.message}
                    </p>
                  )}
                </div>

                <div>
                  <select
                    {...register("program")}
                    disabled={!watch("university")}
                    className="h-10 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Select Program</option>
                    <option value="it">Information Technology</option>
                    <option value="eng">Engineering</option>
                    <option value="bs">Business Science</option>
                  </select>
                  {errors.program && (
                    <p className="text-red-500 text-sm">
                      {errors.program.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <Input {...register("duration")} placeholder="Duration" disabled />
                <Input placeholder="Academic Year Start" />
              </div>
            </section>

            {/* MINNOR ACCOUNT */}
            <section className="rounded-lg border p-4 bg-white"> 
                <div className="flex items-center justify-between"> 
                    <h3 className="mb-4 text-xl font-bold text-[#953002]"> 
                        Minor Account Status 
                    </h3> 
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="text-black bg-gray hover:bg-gray-200" 
                        onClick={() => { console.log("Refreshing minor account status..."); }}> 
                        Refresh 
                    </Button> 
                </div> 
            </section>

            {/* BANK */}
            <section className="rounded-lg border p-4 bg-white">
              <h3 className="text-xl font-bold text-[#953002] mb-4">
                Bank Details
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Input {...register("accountNo")} placeholder="Account No" />
                  {errors.accountNo && (
                    <p className="text-red-500 text-sm">
                      {errors.accountNo.message}
                    </p>
                  )}
                </div>

                <Input {...register("bank")} placeholder="Bank Name" />
                <Input {...register("branch")} placeholder="Branch" />
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <div className="lg:col-span-1">
            <section className="rounded-lg border p-4 bg-white">
              <Document />
            </section>
          </div>
        </div>
      </form>

      {/* INCOMPLETE MODAL */}
      <MarkIncompleteModal
        open={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        onConfirm={handleMarkIncomplete}
      />
    </>
  );
}

