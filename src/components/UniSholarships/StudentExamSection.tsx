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
  academicYearStart?: string;
  accountNo?: string;
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
    resolver: zodResolver(universityScholarshipSchema) as any,
    mode: "onChange",
  });

  const onSubmit = (data: FormData) => {
    console.log("FORM SUBMITTED:", data);
  };

  const handleMarkIncomplete = (reason: string) => {
    console.log("FORM MARKED AS INCOMPLETE");
    console.log("Reason:", reason);
    setShowIncompleteModal(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

            <Button type="button" variant="outline">
              Save
            </Button>

            <Button
              type="submit"
              disabled={!isValid}
              className="bg-[#953002] text-white hover:bg-[#7a2500] disabled:opacity-50"
            >
              Submit
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Student & Exam
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="requestDate"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Request Date <span className="text-red-500">*</span>
                </label>
                <Input id="requestDate" type="date" {...register("requestDate")} />
                {errors.requestDate && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.requestDate.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="studentName"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Student Name <span className="text-red-500">*</span>
                </label>
                <Input id="studentName" {...register("studentName")} />
                {errors.studentName && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.studentName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="nic"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Student NIC <span className="text-red-500">*</span>
                </label>
                <Input id="nic" {...register("nic")} />
                {errors.nic && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.nic.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="bcNo"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Birth Certificate Number <span className="text-red-500">*</span>
                </label>
                <Input id="bcNo" {...register("bcNo")} />
                {errors.bcNo && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.bcNo.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="address"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Permanent Address <span className="text-red-500">*</span>
                </label>
                <Input id="address" {...register("address")} />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="mobile"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <Input id="mobile" {...register("mobile")} />
                {errors.mobile && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.mobile.message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                id="isSchoolApplicant"
                type="checkbox"
                {...register("isSchoolApplicant")}
                className="h-4 w-4 accent-[#953002]"
              />
              <label
                htmlFor="isSchoolApplicant"
                className="text-sm font-medium text-gray-700"
              >
                A/L Exam as School Applicant
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="examYear"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Exam Year <span className="text-red-500">*</span>
                </label>
                <Input id="examYear" {...register("examYear")} />
                {errors.examYear && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.examYear.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="examNo"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Examination Number <span className="text-red-500">*</span>
                </label>
                <Input id="examNo" {...register("examNo")} />
                {errors.examNo && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.examNo.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="zScore"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Z-Score <span className="text-red-500">*</span>
                </label>
                <Input id="zScore" {...register("zScore")} />
                {errors.zScore && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.zScore.message}
                  </p>
                )}
              </div>

              <div className="flex items-end justify-end">
                <Button type="button" variant="outline">
                  Validate
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              University & Program
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="university"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  University <span className="text-red-500">*</span>
                </label>
                <select
                  id="university"
                  {...register("university")}
                  className="h-10 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Select University</option>
                  <option value="uom">University of Moratuwa</option>
                  <option value="uop">University of Peradeniya</option>
                  <option value="uoc">University of Colombo</option>
                </select>
                {errors.university && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.university.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="program"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Program <span className="text-red-500">*</span>
                </label>
                <select
                  id="program"
                  {...register("program")}
                  disabled={!watch("university")}
                  className="h-10 w-full rounded-md border px-3 text-sm disabled:bg-gray-100"
                >
                  <option value="">Select Program</option>
                  <option value="it">Information Technology</option>
                  <option value="eng">Engineering</option>
                  <option value="bs">Business Science</option>
                </select>
                {errors.program && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.program.message}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="duration"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Program Duration
                </label>
                <Input id="duration" {...register("duration")} disabled />
              </div>

              <div>
                <label
                  htmlFor="academicYearStart"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Academic Year Start Date
                </label>
                <Input
                  id="academicYearStart"
                  type="date"
                  {...register("academicYearStart")}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="mb-4 text-xl font-bold text-[#953002]">
                Minor Account Status
              </h3>
              <Button
                type="button"
                variant="outline"
                className="bg-gray text-black hover:bg-gray-200"
                onClick={() => {
                  console.log("Refreshing minor account status...");
                }}
              >
                Refresh
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Minor Account Availability
                </label>
                <Input value="Not loaded yet" readOnly />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Remitted Months
                </label>
                <Input value="Not loaded yet" readOnly />
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Bank Details
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="accountNo"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Bank Account Number 
                </label>
                <Input id="accountNo" {...register("accountNo")} />
                {errors.accountNo && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.accountNo.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="bank"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Bank
                </label>
                <Input id="bank" {...register("bank")} />
              </div>

              <div>
                <label
                  htmlFor="branch"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Bank Branch
                </label>
                <Input id="branch" {...register("branch")} />
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-xl font-bold text-[#953002]">
              Documents
            </h3>

            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
              <Document />
            </div>
          </section>
        </div>
      </form>

      <MarkIncompleteModal
        open={showIncompleteModal}
        onClose={() => setShowIncompleteModal(false)}
        onConfirm={handleMarkIncomplete}
      />
    </>
  );
}