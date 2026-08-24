"use client";

import { forwardRef, useImperativeHandle, useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { authFetch } from "@/lib/api/authFetch";

interface Grade5FormProps {
  memberId: string;
  initialData?: Grade5InitialData | null;
  requestNo?: string;
  readOnly?: boolean;
  /** Fires whenever the form moves between pristine and edited. */
  onDirtyChange?: (dirty: boolean) => void;
}

export type Grade5InitialData = {
  requestedDate?: string;
  studentName?: string;
  birthCertificateNo?: string;
  birthCertificateNumber?: string;
  school?: string;
  studentSchool?: string;
  district?: string;
  schoolDistrict?: string;
  examYear?: number;
  districtCutOffMark?: number | string | null;
  marksObtained?: number;
  examinationNumber?: string;
  hasDeviation?: boolean;
};

export type Grade5SavedRequest = Grade5InitialData & {
  id?: number;
  requestNo?: string;
  status?: string;
  incompleteReason?: string;
  hasDeviation?: boolean;
};

const getTodayDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// For Validate Form
const grade5Schema = z.object({
  requestedDate: z
    .string()
    .min(1, "Requested date is required")
    .refine((dateStr) => {
      return dateStr <= getTodayDateStr();
    }, "Requested date cannot be in the future"),

  studentName: z.string().min(1, "Student name is required"),

  // Birth certificate number must be at least 8 characters long and contain at least two digits
  birthCertificateNo: z
    .string()
    .trim()
    .min(1, "Birth certificate number is required")
    .min(8, "Birth certificate number must be at least 8 characters")
    .refine(
      (value) => (value.match(/[0-9]/g) ?? []).length >= 2,
      "Birth certificate number must include at least 2 digits"
    ),

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
    .trim()
    .min(1, "Examination number is required")
    .regex(/^[0-9]+$/, "Examination number must contain digits only")
    .min(8, "Examination number must be at least 8 digits"),

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

type Grade5RequestPayload = {
  requestedDate: string;
  studentName: string;
  birthCertificateNumber: string;
  studentSchool: string;
  schoolDistrict: string;
  examYear?: number;
  examinationNumber: string;
  districtCutOffMark: number | null;
  marksObtained: number;
};

export interface Grade5FormRef {
  submitForm: (
    extraData?: Record<string, unknown>,
    requestNo?: string
  ) => Promise<Grade5SavedRequest | undefined>;
  validateAndGetData: () => Promise<Grade5RequestPayload | undefined>;
  getBirthCertificateNo: () => string;
  getExamYear: () => number | undefined;
}

const Grade5Form = forwardRef<Grade5FormRef, Grade5FormProps>(
  ({ memberId, initialData, readOnly = false, onDirtyChange }, ref) => {
    const memberIdRef = useRef(memberId);

    useEffect(() => {
      memberIdRef.current = memberId;
    }, [memberId]);

    const {
      register,
      handleSubmit,
      setValue,
      watch,
      setError,
      clearErrors,
      getValues,
      reset,
      formState: { errors, isDirty },
    } = useForm<Grade5FormValues>({
      resolver: zodResolver(grade5Schema),
      mode: "onChange",
      reValidateMode: "onChange",
      defaultValues: {
        examYear: undefined,
        districtCutOff: "",
      },
    });

    const selectedDistrict = watch("schoolDistrict");
    const selectedYear = watch("examYear");
    const examinationNumber = watch("examinationNumber");
    const [popupError, setPopupError] = useState("");

    useEffect(() => {
      setExamValidated(false);
      clearErrors("examinationNumber");
    }, [examinationNumber, clearErrors]);

    useEffect(() => {
      const fetchExamYears = async () => {
        try {
          const res = await authFetch("http://localhost:8080/api/grade5/exam-years");

          if (!res.ok) {
            throw new Error("Failed to load exam years");
          }

          const data: number[] = await res.json();
          setExamYears(data);
        } catch (error) {
          console.error(error);
          setPopupError("Failed to load exam years.");
        }
      };

      fetchExamYears();
    }, []);

    useEffect(() => {
      if (initialData) {
        reset({
          requestedDate: initialData.requestedDate || "",
          studentName: initialData.studentName || "",
          birthCertificateNo:
            initialData.birthCertificateNumber || initialData.birthCertificateNo || "",
          school: initialData.school || initialData.studentSchool || "",
          schoolDistrict: initialData.district || initialData.schoolDistrict || "",
          examYear: initialData.examYear || undefined,
          districtCutOff:
            initialData.districtCutOffMark != null
              ? String(initialData.districtCutOffMark)
              : "",
          marksObtained: initialData.marksObtained ?? 0,
          examinationNumber: initialData.examinationNumber || "",
        });
      }
    }, [initialData, reset]);

    // Report the pristine/edited flip upward so the page can decide whether Save is
    // worth offering. isDirty is only trustworthy because of the reset above.
    useEffect(() => {
      onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);


    const [checkingExamNo, setCheckingExamNo] = useState(false);
    const [checkingBirthCertNo, setCheckingBirthCertNo] = useState(false);
    const [examValidated, setExamValidated] = useState(false);
    const [examYears, setExamYears] = useState<number[]>([]);

    useEffect(() => {
      if (!selectedDistrict || !selectedYear) {
        setValue("districtCutOff", "");
        return;
      }

      // Fetch district cutoff marks when district and year are selected
      const timeout = setTimeout(() => {
        const fetchCutoff = async () => {
          try {
            const res = await authFetch(
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


    //Validate exam number duplication by calling backend
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

      // Shape first, duplicate check second: a number the schema would reject must
      // not come back from this button marked validated.
      if (!/^[0-9]{8,}$/.test(examNo.trim())) {
        setError("examinationNumber", {
          type: "manual",
          message: "Examination number must be at least 8 digits",
        });
        setExamValidated(false);
        return false;
      }

      try {
        setCheckingExamNo(true);

        const res = await authFetch(
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

    // Validate birth certificate number duplication by calling backend
    const validateBirthCertificateNumber = async () => {
      const birthCertNo = getValues("birthCertificateNo")?.trim();

      if (!birthCertNo) {
        setError("birthCertificateNo", {
          type: "manual",
          message: "Birth certificate number is required",
        });
        return false;
      }

      const ownedAlready =
        (initialData?.birthCertificateNumber ?? initialData?.birthCertificateNo)
          ?.trim() === birthCertNo;
      if (ownedAlready) {
        return true;
      }

      try {
        setCheckingBirthCertNo(true);

        const res = await fetch(
          `http://localhost:8080/api/grade5/exists-birth-certificate?birthCertificateNo=${encodeURIComponent(
            birthCertNo
          )}`
        );

        if (!res.ok) {
          console.warn(
            `[grade5] birth certificate duplicate check unavailable (HTTP ${res.status}) — deferring to the backend check on save`
          );
          return true;
        }

        const data: { exists: boolean } = await res.json();

        if (data.exists) {
          setError("birthCertificateNo", {
            type: "manual",
            message:
              "Entered Birth Certificate Number is duplicating with another Scholarship Request",
          });
          return false;
        }

        clearErrors("birthCertificateNo");
        return true;
      } catch (error) {
        console.warn(
          "[grade5] birth certificate duplicate check failed — deferring to the backend check on save",
          error
        );
        return true;
      } finally {
        setCheckingBirthCertNo(false);
      }
    };


    const buildPayload = (data: Grade5FormValues): Grade5RequestPayload => ({
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
    });

    
    const onValid = async (
      data: Grade5FormValues,
      extraData: Record<string, unknown> = {},
      requestNo?: string
    ) => {
      const payload = {
        ...buildPayload(data),
        ...extraData,
      };

      const isUpdate = !!requestNo;

      try {
        const res = await authFetch(
          isUpdate
            ? `http://localhost:8080/api/grade5/${requestNo}/update`
            : `http://localhost:8080/api/grade5/save?memberId=${encodeURIComponent(memberIdRef.current)}`,
          {
            method: isUpdate ? "PUT" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          const errorText = await res.text();
          let displayError = errorText;
          try {
            const parsed = JSON.parse(errorText);
            if (parsed && parsed.message) {
              displayError = parsed.message;
            }
          } catch (_) { }

          setPopupError(displayError || "Grade 5 Scholarship Request Cannot Be Created.");

          return;
        }

        const savedData = await res.json();
        return savedData;
      } catch (error: any) {
        console.error("Save error:", error);

        const message = error?.message || "Grade 5 Scholarship Request Cannot Be Created.Member Is Not ACTIVE";

        setPopupError(message);
      }
    };

    //Called when frontend validation fails
    const onInvalid = (formErrors: unknown) => {
      console.log("Validation Errors:", formErrors);
    };

    useImperativeHandle(ref, () => ({
      submitForm: async (extraData = {}, requestNo?: string) => {
        let savedRequest: Grade5SavedRequest | undefined;

        await handleSubmit(
          async (data) => {
            // The backend rejects a duplicate too, but only as a popup message —
            // checking here puts the error on the field the user has to fix.
            const birthCertOk = await validateBirthCertificateNumber();
            if (!birthCertOk) return;

            savedRequest = await onValid(data, extraData, requestNo);
          },
          onInvalid
        )();

        return savedRequest;
      },
      validateAndGetData: async () => {
        let payload: Grade5RequestPayload | undefined;

        await handleSubmit(
          async (data) => {

            const examOk =
              initialData?.examinationNumber === data.examinationNumber ||
              (await validateExamNumber());
            if (!examOk) return;

            const birthCertOk = await validateBirthCertificateNumber();
            if (!birthCertOk) return;

            payload = buildPayload(data);
          },
          onInvalid
        )();

        return payload;
      },
      getBirthCertificateNo: () => {
        return getValues("birthCertificateNo");
      },
      getExamYear: () => {
        return getValues("examYear");
      },
    }));

  return (
    <form className="space-y-6">
      {popupError && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white w-[450px] rounded-lg shadow-lg p-6 relative">
            <button
              type="button"
              onClick={() => setPopupError("")}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>

              <h2 className="text-lg font-semibold text-[#953002]">
                Cannot Create Request
              </h2>

              <p className="text-sm text-black-600 mt-4">
                {popupError}
              </p>

              <div className="flex justify-end mt-6">
                <Button
                  type="button"
                  onClick={() => setPopupError("")}
                  className="bg-[#953002] text-white hover:bg-[#672102]"
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        )}

        <p className="text-[#953002] text-xl font-bold">Request Details</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Requested Date</label>
            <Input
              type="date"
              {...register("requestedDate")}
              max={getTodayDateStr()}
              disabled={readOnly}
            />
            {errors.requestedDate && (
              <p className="text-red-500 text-sm">
                {errors.requestedDate.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium mb-1">Student Name</label>
            <Input {...register("studentName")} disabled={readOnly} />
            {errors.studentName && (
              <p className="text-red-500 text-sm">
                {errors.studentName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium mb-1">
              Birth Certificate No
            </label>
            <Input {...register("birthCertificateNo")} disabled={readOnly} />
            {checkingBirthCertNo && (
              <p className="text-gray-500 text-sm">
                Checking birth certificate number...
              </p>
            )}
            {errors.birthCertificateNo && (
              <p className="text-red-500 text-sm">
                {errors.birthCertificateNo.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium mb-1">School</label>
            <Input {...register("school")} disabled={readOnly} />
            {errors.school && (
              <p className="text-red-500 text-sm">{errors.school.message}</p>
            )}
          </div>

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
              <option>Kalutara</option>
              <option>Kegalle</option>
              <option>Kilinochchi</option>
              <option>Matale</option>
              <option>Mannar</option>
              <option>Polonnaruwa</option>
              <option>Puttalam</option>
              <option>Mullaitivu</option>
              <option>Vavuniya</option>
              <option>Ratnapura</option>
              <option>Monaragala</option>
              <option>Nuwara Eliya</option>
              <option>Trincomalee</option>
            </select>
            {errors.schoolDistrict && (
              <p className="text-red-500 text-sm">
                {errors.schoolDistrict.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium mb-1">Exam Year</label>

            <select
              disabled={readOnly || !selectedDistrict}
              {...register("examYear", {
                setValueAs: (value) =>
                  value === "" ? undefined : Number(value),
              })}
              className="border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            >
              <option value="">Select Exam Year</option>

              {examYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {errors.examYear && (
              <p className="text-red-500 text-sm">
                {errors.examYear.message}
              </p>
            )}
          </div>

          <div>
            <label className="block font-medium mb-1">District Cut-Off</label>
            {/*
              Always read-only. The mark comes from the district cut-off master via
              /api/cutoff and is the figure Marks Obtained is judged against, so letting
              it be typed over would let an operator move the pass line for a single
              request. It was only disabled until a district and exam year were chosen -
              which is precisely when it was populated, so from that moment on it was
              editable.

              readOnly rather than disabled: a disabled input is skipped by the browser
              on submit and reads as inactive, while this field always carries a value
              the reviewer needs to see.
            */}
            <Input
              {...register("districtCutOff")}
              readOnly
              tabIndex={-1}
              placeholder={
                !selectedDistrict || !selectedYear
                  ? "Select a school district and exam year"
                  : undefined
              }
              className="bg-gray-100 text-gray-700 cursor-not-allowed focus-visible:ring-0"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Marks Obtained</label>
            {/* Marks are typed in, never nudged: the spinner buttons, the scroll
                wheel and the arrow keys can all silently change a submitted mark by
                one, which is exactly the kind of edit nobody notices on review. */}
            <Input
              type="number"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0"
              onWheel={(e) => e.currentTarget.blur()}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault();
                }
              }}
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
                disabled={readOnly || checkingExamNo}
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
