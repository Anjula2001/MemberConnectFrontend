"use client";

import { forwardRef, useImperativeHandle, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

const grade5Schema = z.object({
  requestedDate: z.string().min(1, "Requested date is required"),
  studentName: z.string().min(1, "Student name is required"),
  birthCertificateNo: z.string().min(1, "Birth certificate number is required"),
  school: z.string().min(1, "School is required"),
  schoolDistrict: z.string().min(1, "District is required"),
  examYear: z.number(),
  examinationNumber: z.string().min(1, "Examination number is required"),
  districtCutOff: z.string().optional(),
  marksObtained: z.number()
    .min(0, "Marks must be at least 0")
    .max(200, "Marks cannot exceed 200"),
});

export type Grade5FormValues = z.infer<typeof grade5Schema>;

export interface Grade5FormRef {
  submitForm: () => void;
}

const districtCutOffMapping: Record<string, Record<number, number>> = {
  Colombo: { 2025: 150, 2024: 145 },
  Kandy: { 2025: 140, 2024: 135 },
  Galle: { 2025: 130, 2024: 125 },
  Matara: { 2025: 170, 2024: 165 },
  Anuradhapura: { 2025: 155, 2024: 145 },
  Ampara: { 2025: 142, 2024: 135 },
  Badulla: { 2025: 139, 2024: 125 },
  Batticaloa: { 2025: 174, 2024: 165 },
  Gampaha: { 2025: 151, 2024: 145 },
  Hambantota: { 2025: 148, 2024: 135 },
  Jaffna: { 2025: 166, 2024: 125 },
  Kurunegala: { 2025: 171, 2024: 165 },
  Kaluthara: { 2025: 159, 2024: 145 },
  Kegalle: { 2025: 145, 2024: 135 },
  Kilinochchi: { 2025: 132, 2024: 125 },
  Mannar: { 2025: 174, 2024: 165 },
  Mathale: { 2025: 154, 2024: 145 },
  Polonnaruwa: { 2025: 143, 2024: 135 },
  Puttalama: { 2025: 138, 2024: 125 },
  Mullaitivu: { 2025: 171, 2024: 165 },
  Vavuniya: { 2025: 156, 2024: 145 },
  Rathnepura: { 2025: 147, 2024: 135 },
  Monaragala: { 2025: 133, 2024: 125 },
  NuvaraEliya: { 2025: 177, 2024: 165 },
  Trincomalee: { 2025: 179, 2024: 165 },
};

const Grade5Form = forwardRef<Grade5FormRef>((_, ref) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } =
    useForm<Grade5FormValues>({
      resolver: zodResolver(grade5Schema),
      defaultValues: { examYear: 2025 },
    });

  const selectedDistrict = watch("schoolDistrict");
  const selectedYear = watch("examYear");

  // ✅ Auto-calculate district cut-off
  useEffect(() => {
    if (selectedDistrict && selectedYear) {
      const cutoff = districtCutOffMapping[selectedDistrict]?.[selectedYear];
      if (cutoff !== undefined) {
        setValue("districtCutOff", cutoff.toString());
      }
    }
  }, [selectedDistrict, selectedYear, setValue]);

  const onValid = (data: Grade5FormValues) => {
    console.log("Validated Data:", data);
  };
  const onInvalid = (errors: any) => {
    console.log("Validation Errors:", errors);
  };


  /* Expose submit function to parent */
  useImperativeHandle(ref, () => ({
    submitForm: () => {
      handleSubmit(onValid, onInvalid)();
    },
  }));

  return (
    <form className="space-y-6">
      <p className="text-[#953002] text-xl font-bold">
        Request Details
      </p>

      <div className="grid grid-cols-2 gap-4">

        {/* Requested Date */}
        <div>
          <label className="block font-medium mb-1">
            Requested Date
          </label>
          <Input type="date" {...register("requestedDate")} />
          {errors.requestedDate && (
            <p className="text-red-500 text-sm">
              {errors.requestedDate.message}
            </p>
          )}
        </div>

        {/* Student Name */}
        <div>
          <label className="block font-medium mb-1">
            Student Name
          </label>
          <Input {...register("studentName")} />
          {errors.studentName && (
            <p className="text-red-500 text-sm">
              {errors.studentName.message}
            </p>
          )}
        </div>

        {/* Birth Certificate */}
        <div>
          <label className="block font-medium mb-1">
            Birth Certificate No
          </label>
          <Input {...register("birthCertificateNo")} />
          {errors.birthCertificateNo && (
            <p className="text-red-500 text-sm">
              {errors.birthCertificateNo.message}
            </p>
          )}
        </div>

        {/* School */}
        <div>
          <label className="block font-medium mb-1">
            School
          </label>
          <Input {...register("school")} />
          {errors.school && (
            <p className="text-red-500 text-sm">
              {errors.school.message}
            </p>
          )}
        </div>

        {/* District */}
        <div>
          <label className="block font-medium mb-1">
            School District
          </label>
          <select
            className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
            {...register("schoolDistrict")}
          >
            <option value="">Select District</option>
            <option>Colombo</option>
            <option>Kandy</option>
            <option>Galle</option>
            <option>Matara</option>
            <option>Anuradhapura</option>
            <option>Ampara</option>
            <option>Badulla</option>
            <option>Batticaloa</option>
            <option>Gampaha</option>
            <option>Hambantota</option>
            <option>Jaffna</option>
            <option>Kurunegala</option>
            <option>Kaluthara</option>
            <option>Kegalle</option>
            <option>Kilinochchi</option>
            <option>Mathale</option>
            <option>Mannar</option>
            <option>Polonnaruwa</option>
            <option>Puttalama</option>
            <option>Mullaitivu</option>
            <option>Vavuniya</option>
            <option>Rathnepura</option>
            <option>Monaragala</option>
            <option>NuvaraEliya</option>
            <option>Trincomalee</option>
          </select>
          {errors.schoolDistrict && (
            <p className="text-red-500 text-sm">
              {errors.schoolDistrict.message}
            </p>
          )}
        </div>

        {/* Exam Year */}
        <div>
          <label className="block font-medium mb-1">
            Exam Year
          </label>
          <Input type="number" {...register("examYear", { valueAsNumber: true })} />
          {errors.examYear && (
            <p className="text-red-500 text-sm">
              {errors.examYear.message}
            </p>
          )}
        </div>

        {/* District Cutoff */}
        <div>
          <label className="block font-medium mb-1">
            District Cut-Off
          </label>
          <Input {...register("districtCutOff")} />
        </div>

        {/* Examination Number */}
        <div>
          <label className="block font-medium mb-1">
            Marks Obtained
          </label>
          <Input
            type="number"
            {...register("marksObtained", { valueAsNumber: true })}
          />
          {errors.marksObtained && (
            <p className="text-red-500 text-sm">
              {errors.marksObtained.message}
            </p>
          )}
          
        </div>

        {/* Marks Obtained */}
        <div className="col-span-2">
          <label className="block font-medium mb-1">
            Examination Number
          </label>
          <div className="flex gap-6">
          <Input className="w-1/2"
          {...register("examinationNumber")} />
          {errors.examinationNumber && (
            <p className="text-red-500 text-sm">
              {errors.examinationNumber.message}
            </p>
          )}
          <Button 
                className="bg-[#953002] text-white hover:bg-[#672102]"
          >
                Validate
          </Button>
          </div>
        </div>
      </div>
    </form>
  );
});

export default Grade5Form;
