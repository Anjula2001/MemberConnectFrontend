"use client";

import {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

interface Grade5FormProps {
  memberId: string;
  initialData?: Grade5InitialData | null;
  readOnly?: boolean;
}

export type Grade5InitialData = {
  requestedDate?: string;
  studentName?: string;
  birthCertificateNumber?: string;
  school?: string;
  district?: string;
  examYear?: number;
  districtCutOffMark?: number | string | null;
  marksObtained?: number;
  examinationNumber?: string;
};

export type Grade5SavedRequest = Grade5InitialData & {
  id?: number;
  requestNo?: string;
  status?: string;
  incompleteReason?: string;
};

type EligibilityValidationResponse = {
  eligible?: boolean;
  isEligible?: boolean;
  valid?: boolean;
  canCreate?: boolean;
  message?: string;
  reason?: string;
  error?: string;
  errors?: string[];
  memberActiveDuringExam?: boolean;
  activeDuringExam?: boolean;
  membershipPeriodValid?: boolean;
  membershipAgeValid?: boolean;
  scholarshipRemittedPreviousMonth?: boolean;
  previousMonthRemitted?: boolean;
  continuousScholarshipRemittanceValid?: boolean;
  continuousRemittanceValid?: boolean;
};

// For Validate Form
const grade5Schema = z.object({
  requestedDate: z
    .string()
    .min(1, "Requested date is required")
    .refine((dateStr) => {
      const selectedDate = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate <= today;
    }, "Requested date cannot be in the future"),

  studentName: z.string().min(1, "Student name is required"),

  birthCertificateNo: z
    .string()
    .min(1, "Birth certificate number is required")
    .min(8, "Birth Certificate number must be at least 8 characters"),

  school: z.string().min(1, "School is required"),

  schoolDistrict: z.string().min(1, "District is required"),

  examYear: z
  .number({
    message: "Exam year is required",
  })
  .min(2000, "Invalid exam year")
  .refine((year) => year <= new Date().getFullYear(), {
    message: "Exam year cannot be a future year",
  })
  .optional(),

  marksObtained: z
    .number({
      message: "Marks obtained is required",
    })
    .min(0, "Marks must be at least 0")
    .max(200, "Marks cannot exceed 200"),

  examinationNumber: z
    .string()
    .min(1, "Examination number is required")
    .min(8, "Examination number must be at least 8 characters"),

  districtCutOff: z.string().optional(),
  }).superRefine((data, ctx) => {
    const cutoffMark = data.districtCutOff
      ? Number(data.districtCutOff)
      : undefined;

    if (
      cutoffMark !== undefined &&
      !Number.isNaN(cutoffMark) &&
      data.marksObtained < cutoffMark
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["marksObtained"],
        message:
          "The Grade 5 Scholarship Request cannot be saved. The exam marks obtained by the student is less than the district cut-off mark.",
      });
    }
});

export type Grade5FormValues = z.infer<typeof grade5Schema>;

export interface Grade5FormRef {
  submitForm: () => Promise<Grade5SavedRequest | undefined>;
  getBirthCertificateNo: () => string;
}

const Grade5Form = forwardRef<Grade5FormRef, Grade5FormProps>(
  ({ memberId, initialData, readOnly = false  }, ref) => {
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    getValues,
    formState: { errors },
  } = useForm<Grade5FormValues>({
    resolver: zodResolver(grade5Schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      examYear: undefined,
      districtCutOff: "",
    },
  });

  /**
   * Watched values
   */
  const selectedDistrict = watch("schoolDistrict");
  const selectedYear = watch("examYear");
  const examinationNumber = watch("examinationNumber");

  useEffect(() => {
    setExamValidated(false);
    clearErrors("examinationNumber");
  }, [examinationNumber, clearErrors]);

  useEffect(() => {
  if (initialData) {
    setValue("requestedDate", initialData.requestedDate || "");
    setValue("studentName", initialData.studentName || "");
    setValue("birthCertificateNo", initialData.birthCertificateNumber || "");
    setValue("school", initialData.school || "");
    setValue(
        "schoolDistrict",
        initialData.district || initialData.district || ""
    );
    setValue("examYear", initialData.examYear || undefined);
    setValue(
      "districtCutOff",
      initialData.districtCutOffMark != null
        ? String(initialData.districtCutOffMark)
        : ""
    );
    setValue("marksObtained", initialData.marksObtained ?? 0);
    setValue("examinationNumber", initialData.examinationNumber || "");
  }
}, [initialData, setValue]);


const [checkingExamNo, setCheckingExamNo] = useState(false);

const [examValidated, setExamValidated] = useState(false);
const [eligibilityError, setEligibilityError] = useState("");

useEffect(() => {
  if (!selectedDistrict || !selectedYear) {
    setValue("districtCutOff", "");
    return;
  }

  const timeout = setTimeout(() => {
    const fetchCutoff = async () => {
      try {
        const res = await fetch(
          `http://localhost:8080/api/cutoff?district=${encodeURIComponent(
            selectedDistrict
          )}&year=${selectedYear}`
        );

        if (!res.ok) {
          setValue("districtCutOff", "");
          return;
        }

        const data = await res.json();

        if (data?.cutoffMarks !== undefined && data?.cutoffMarks !== null) {
          setValue("districtCutOff", data.cutoffMarks.toString());
        } else {
          setValue("districtCutOff", "");
        }
      } catch (error) {
        console.error("Error fetching cutoff:", error);
        setValue("districtCutOff", "");
      }
    };

    fetchCutoff();
  }, 300);

  return () => clearTimeout(timeout);
}, [selectedDistrict, selectedYear, setValue]);

  /**
   * Validate exam number duplication by calling backend
   */
  const validateExamNumber = async () => {
    const examNo = getValues("examinationNumber");

    if (!examNo?.trim()) {
      setError("examinationNumber", {
        type: "manual",
        message: "Examination number is required",
      });
      setExamValidated(false);
      return false;
    }

    try {
      setCheckingExamNo(true);

      const res = await fetch(
        `http://localhost:8080/api/grade5/exists?examNo=${encodeURIComponent(
          examNo
        )}`
      );

      if (!res.ok) {
        throw new Error("Failed to validate examination number");
      }

      const data: { exists: boolean } = await res.json();

      if (data.exists) {
        setError("examinationNumber", {
          type: "manual",
          message:
            "Entered Examination Number is duplicating with another Scholarship Request",
        });
        setExamValidated(false);
        return false;
      }

      clearErrors("examinationNumber");
      setExamValidated(true);
      return true;
    } catch (error) {
      console.error("Validation error:", error);
      setError("examinationNumber", {
        type: "manual",
        message: "Unable to validate examination number",
      });
      setExamValidated(false);
      return false;
    } finally {
      setCheckingExamNo(false);
    }
  };

  const buildEligibilityMessage = (data: EligibilityValidationResponse) => {
    if (data.message) return data.message;
    if (data.reason) return data.reason;
    if (data.error) return data.error;
    if (data.errors?.length) return data.errors.join(" ");

    if (
      data.memberActiveDuringExam === false ||
      data.activeDuringExam === false
    ) {
      return "The Grade 5 Scholarship Request cannot be saved. The Member is not Active during the selected Exam";
    }

    if (
      data.membershipPeriodValid === false ||
      data.membershipAgeValid === false
    ) {
      return "The required continues Membership period does not comply (36 months)";
    }

    if (
      data.continuousScholarshipRemittanceValid === false ||
      data.continuousRemittanceValid === false
    ) {
      return "Scholarship deduction was not continuously remitted from Member for the specific period (6 months)";
    }

    if (
      data.scholarshipRemittedPreviousMonth === false ||
      data.previousMonthRemitted === false
    ) {
      return "The Scholarship Account should be remitted on the previous month.";
    }

    return "The Grade 5 Scholarship Request cannot be saved. Member is not eligible to apply for a Grade 5 Scholarship.";
  };

  const validateMemberEligibility = async (data: Grade5FormValues) => {
    setEligibilityError("");

    if (!data.examYear) {
      setEligibilityError("Exam year is required to validate member eligibility.");
      return false;
    }

    try {
      const params = new URLSearchParams({
        memberId,
        examYear: String(data.examYear),
      });

      const res = await fetch(
        `http://localhost:8080/api/grade5/eligibility/validate?${params.toString()}`
      );

      if (!res.ok) {
        const errorText = await res.text();
        setEligibilityError(
          errorText ||
            "Unable to validate member eligibility for Grade 5 Scholarship."
        );
        return false;
      }

      const result = (await res.json()) as EligibilityValidationResponse;
      const eligible =
        result.eligible ?? result.isEligible ?? result.valid ?? result.canCreate;

      if (eligible === false) {
        setEligibilityError(buildEligibilityMessage(result));
        return false;
      }

      return true;
    } catch (error) {
      console.error("Eligibility validation error:", error);
      setEligibilityError(
        "Unable to validate member eligibility for Grade 5 Scholarship."
      );
      return false;
    }
  };

  
  const onValid = async (data: Grade5FormValues) => {
    const eligibilityOk = await validateMemberEligibility(data);
    if (!eligibilityOk) return;

    const examOk = await validateExamNumber();
    if (!examOk) return;

    
    const payload = {
      requestedDate: data.requestedDate,
      studentName: data.studentName,
      birthCertificateNumber: data.birthCertificateNo,
      studentSchool: data.school,
      schoolDistrict: data.schoolDistrict,
      examYear: data.examYear,
      examinationNumber: data.examinationNumber,
      districtCutOffMark: data.districtCutOff
        ? Number(data.districtCutOff)
        : null,
      marksObtained: data.marksObtained,
    };

    try {
     

      const res = await fetch(
        `http://localhost:8080/api/grade5/save?memberId=${encodeURIComponent(memberId)}`,
        {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();

        if (
          errorText.includes("Examination number already exists")
        ) {
          setError("examinationNumber", {
            type: "manual",
            message:
              "Entered Examination Number is duplicating with another Scholarship Request",
          });
          setExamValidated(false);
          return;
        }

        throw new Error(errorText || "Failed to save form");
      }

      const savedData = await res.json();
      console.log("Saved successfully:", savedData);
      alert("Form saved successfully");

      return savedData;
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save form");
    } 
  };

  /**
   * Called when frontend validation fails
   */
  const onInvalid = (formErrors: unknown) => {
    console.log("Validation Errors:", formErrors);
  };

  /**
   * Expose submit function to parent component
   * Parent page calls formRef.current?.submitForm()
   */
  useImperativeHandle(ref, () => ({
    submitForm: async () => {
      let savedRequest: Grade5SavedRequest | undefined;

      await handleSubmit(
        async (data) => {
          savedRequest = await onValid(data);
        },
        onInvalid
      )();

      return savedRequest;
    },
    getBirthCertificateNo: () => {
      return getValues("birthCertificateNo");
    },
  }));

  return (
    <form className="space-y-6">
      <p className="text-[#953002] text-xl font-bold">Request Details</p>

      {eligibilityError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {eligibilityError}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Requested Date */}
        <div>
          <label className="block font-medium mb-1">Requested Date</label>
          <Input
            type="date"
            {...register("requestedDate")}
            max={new Date().toISOString().split("T")[0]}
            disabled={readOnly}
          />
          {errors.requestedDate && (
            <p className="text-red-500 text-sm">
              {errors.requestedDate.message}
            </p>
          )}
        </div>

        {/* Student Name */}
        <div>
          <label className="block font-medium mb-1">Student Name</label>
          <Input {...register("studentName")} disabled={readOnly} />
          {errors.studentName && (
            <p className="text-red-500 text-sm">
              {errors.studentName.message}
            </p>
          )}
        </div>

        {/* Birth Certificate Number */}
        <div>
          <label className="block font-medium mb-1">
            Birth Certificate No
          </label>
          <Input {...register("birthCertificateNo")} disabled={readOnly} />
          {errors.birthCertificateNo && (
            <p className="text-red-500 text-sm">
              {errors.birthCertificateNo.message}
            </p>
          )}
        </div>

        {/* School */}
        <div>
          <label className="block font-medium mb-1">School</label>
          <Input {...register("school")} disabled={readOnly} />
          {errors.school && (
            <p className="text-red-500 text-sm">{errors.school.message}</p>
          )}
        </div>

        {/* School District */}
        <div>
          <label className="block font-medium mb-1">School District</label>
          <select
            className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
            {...register("schoolDistrict", {
              onChange: () => {
                setValue("examYear", undefined);
                setValue("districtCutOff", "");
                clearErrors(["examYear", "districtCutOff"]);
              },
            })}
            disabled={readOnly}
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
          <label className="block font-medium mb-1">Exam Year</label>
          <Input
            type="number"
            min={2000}
            max={new Date().getFullYear()}
            disabled={readOnly || !selectedDistrict}
            {...register("examYear", {
              setValueAs: (value) =>
                value === "" ? undefined : Number(value),
            })}
          />
          {errors.examYear && (
            <p className="text-red-500 text-sm">{errors.examYear.message}</p>
          )}
        </div>

        {/* District Cut-Off */}
        <div>
          <label className="block font-medium mb-1">District Cut-Off</label>
          <Input
            {...register("districtCutOff")}
            disabled={readOnly || !selectedDistrict || !selectedYear}
            
          />
        </div>

        {/* Marks Obtained */}
        <div>
          <label className="block font-medium mb-1">Marks Obtained</label>
          <Input
            type="number"
            {...register("marksObtained", {
              setValueAs: (value) =>
                value === "" ? undefined : Number(value),
            })}
            disabled={readOnly}
          />
          {errors.marksObtained && (
            <p className="text-red-500 text-sm">
              {errors.marksObtained.message}
            </p>
          )}
        </div>

        {/* Examination Number */}
        <div className="col-span-2">
          <label className="block font-medium mb-1">
            Examination Number
          </label>

          <div className="flex gap-6 items-start">
            <div className="w-1/2">
              <Input {...register("examinationNumber")} disabled={readOnly} />

              {errors.examinationNumber && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.examinationNumber.message}
                </p>
              )}

              {!errors.examinationNumber && examValidated && (
                <p className="text-green-600 text-sm mt-1">
                  Examination number is valid
                </p>
              )}
            </div>

            <Button
              type="button"
              onClick={validateExamNumber}
              className="bg-[#953002] text-white hover:bg-[#672102]"
              disabled={checkingExamNo}
            >
              {checkingExamNo ? "Checking..." : "Validate"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
});

Grade5Form.displayName = "Grade5Form";

export default Grade5Form;
