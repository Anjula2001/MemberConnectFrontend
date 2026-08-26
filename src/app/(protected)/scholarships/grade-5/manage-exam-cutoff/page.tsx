"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/src/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useToast } from "@/lib/toast-context";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { hasPermission } from "@/lib/permissions";
import AccessRestricted from "@/src/components/AccessRestricted";

const API_BASE_URL = "http://localhost:8080";

// District names defined on the frontend — single source of truth for the table rows
const DISTRICTS = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];

interface CutoffDetail {
  district: string;
  cutoffMarks: string; 
}

// Cutoff issues are raised against ["cutoffs", <district name>] so each message maps
// straight back onto its own table row.
const examMasterSchema = z
  .object({
    examYear: z.number(),
    examDate: z.string(),
    cutoffs: z.array(
      z.object({
        district: z.string(),
        cutoffMarks: z.string(),
      })
    ),
  })
  .superRefine((data, ctx) => {
    const currentYear = new Date().getFullYear();

    // 1. Validate exam year
    if (!data.examYear) {
      ctx.addIssue({
        code: "custom",
        path: ["examYear"],
        message: "Exam year is required.",
      });
    } else if (data.examYear > currentYear) {
      ctx.addIssue({
        code: "custom",
        path: ["examYear"],
        message: "Exam year cannot be a future year.",
      });
    } else if (data.examYear < currentYear) {
      ctx.addIssue({
        code: "custom",
        path: ["examYear"],
        message: "Exam year cannot be a past year.",
      });
    }

    // 2. Validate exam date
    if (!data.examDate) {
      ctx.addIssue({
        code: "custom",
        path: ["examDate"],
        message: "Exam date is required.",
      });
    } else {
      const selectedDate = new Date(data.examDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Allow today's date

      if (selectedDate.getFullYear() !== data.examYear) {
        ctx.addIssue({
          code: "custom",
          path: ["examDate"],
          message: `Exam date must belong to the selected exam year (${data.examYear}).`,
        });
      } else if (selectedDate > today) {
        ctx.addIssue({
          code: "custom",
          path: ["examDate"],
          message: "Exam date cannot be a future date.",
        });
      }
    }

    // 3. Validate district cutoff marks
    data.cutoffs.forEach((item) => {
      const valStr = item.cutoffMarks.trim();

      if (!valStr) {
        ctx.addIssue({
          code: "custom",
          path: ["cutoffs", item.district],
          message: "Cutoff is required.",
        });
        return;
      }

      const valNum = Number(valStr);

      if (isNaN(valNum) || !Number.isInteger(valNum)) {
        ctx.addIssue({
          code: "custom",
          path: ["cutoffs", item.district],
          message: "Must be a valid integer.",
        });
      } else if (valNum < 0 || valNum > 200) {
        ctx.addIssue({
          code: "custom",
          path: ["cutoffs", item.district],
          message: "Must be between 0 and 200.",
        });
      }
    });
  });

export default function Grade5ExamCutoffManagementPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const currentYear = new Date().getFullYear();

  // Exam dates and cut-off marks decide the outcome of every eligibility check in the
  // module, so write access is held far more narrowly than the rest of Grade 5.
  const canManageExamMaster = hasPermission(user?.role, "G5_EXAM_MASTER_MANAGE");

  // Form states
  const [examYear, setExamYear] = useState<number>(currentYear);
  const [examDate, setExamDate] = useState<string>("");
  const [cutoffs, setCutoffs] = useState<CutoffDetail[]>([]);

  // UI/API States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    examYear?: string;
    examDate?: string;
    cutoffs?: Record<string, string>; 
  }>({});


  const buildCutoffs = (
    apiCutoffs: { district: string; cutoffMarks: number | null }[]
  ): CutoffDetail[] => {
    const apiMap = new Map(
      apiCutoffs.map((c) => [c.district.trim().toLowerCase(), c.cutoffMarks])
    );
    return DISTRICTS.map((name) => {
      const saved = apiMap.get(name.trim().toLowerCase());
      return {
        district: name,
        cutoffMarks:
          saved !== null && saved !== undefined ? String(saved) : "",
      };
    });
  };

  // Fetch current data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE_URL}/api/grade5/exam-management/current?year=${currentYear}`
        );

        if (!res.ok) {
          throw new Error("Failed to load exam cutoff configuration.");
        }

        const data = (await res.json()) as {
          examYear?: number;
          examDate?: string;
          cutoffs?: { district: string; cutoffMarks: number | null }[];
        };

        if (data) {
          setExamYear(data.examYear || currentYear);
          setExamDate(data.examDate || "");
          setCutoffs(buildCutoffs(data.cutoffs ?? []));
        }
      } catch (err: unknown) {
        console.error(err);
        const errorMsg =
          err instanceof Error ? err.message : "Error loading configuration";
        addToast(errorMsg, "destructive");
        // Even on error, show all districts with empty cutoff marks
        setCutoffs(buildCutoffs([]));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYear, addToast]);

  // Handle input change for cutoffs
  const handleCutoffChange = (districtName: string, value: string) => {
    setCutoffs((prev) =>
      prev.map((item) =>
        item.district === districtName ? { ...item, cutoffMarks: value } : item
      )
    );

    // Clear inline error if user modifies the value
    if (errors.cutoffs && errors.cutoffs[districtName]) {
      setErrors((prev) => {
        const newCutoffsErr = { ...prev.cutoffs };
        delete newCutoffsErr[districtName];
        return { ...prev, cutoffs: newCutoffsErr };
      });
    }
  };

  // Perform client-side validations
  const validateForm = (): boolean => {
    const result = examMasterSchema.safeParse({ examYear, examDate, cutoffs });

    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: typeof errors = {};
    const cutoffErrors: Record<string, string> = {};

    result.error.issues.forEach((issue) => {
      const [field, district] = issue.path;

      if (field === "cutoffs" && typeof district === "string") {
        cutoffErrors[district] = cutoffErrors[district] ?? issue.message;
        return;
      }

      if (field === "examYear" || field === "examDate") {
        newErrors[field] = newErrors[field] ?? issue.message;
      }
    });

    if (Object.keys(cutoffErrors).length > 0) {
      newErrors.cutoffs = cutoffErrors;
    }

    setErrors(newErrors);
    return false;
  };

  // Trigger Save action
  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsConfirmOpen(true);
    } else {
      addToast("Please correct the validation errors before saving.", "destructive");
    }
  };

  // Perform API save operation
  const confirmSave = async () => {
    setIsConfirmOpen(false);
    setSaving(true);

    try {
      const payload = {
        examYear,
        examDate,
        cutoffs: cutoffs.map((item) => ({
          district: item.district,
          cutoffMarks: parseInt(item.cutoffMarks, 10),
        })),
      };

      const res = await fetch(`${API_BASE_URL}/api/grade5/exam-management/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await res.json()) as { message?: string };

      if (!res.ok) {
        throw new Error(result.message || "Failed to save configurations.");
      }

      addToast("Grade 5 Exam configurations and district cutoffs saved successfully!", "default");
    } catch (err: unknown) {
      console.error(err);
      const errorMsg = err instanceof Error ? err.message : "An error occurred while saving.";
      addToast(errorMsg, "destructive");
    } finally {
      setSaving(false);
    }
  };

  if (user && !canManageExamMaster) {
    return (
      <AccessRestricted
        message="Managing Grade 5 exam dates and district cut-off marks is restricted to Scholarship personnel."
        fallbackHref="/scholarships/grade-5"
        fallbackLabel="Back to Grade 5 Requests"
      />
    );
  }

  return (
    <div className="w-full px-6 py-6 space-y-6">
      {/* Header & Back Button */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/scholarships/grade-5";
            }}
            className="text-[#953002] hover:text-[#7a2700] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-7 w-7" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#953002]">
              Grade 5 Exam & District Cutoffs
            </h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#953002]" />
          <p className="text-sm text-gray-500 font-medium">Loading configuration data...</p>
        </div>
      ) : (
        <form onSubmit={handleSaveClick} className="space-y-6">
          <Card className="shadow-sm border-gray-200 bg-white">
            <CardHeader className="border-b bg-gray-50/50 py-4">
              <CardTitle className="text-base font-semibold text-[#953002]">
                Exam Master Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Exam Year */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Exam Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={examYear}
                    min={currentYear}
                    max={currentYear}
                    onChange={(e) => {
                      setExamYear(parseInt(e.target.value, 10) || 0);
                      setErrors((prev) => ({ ...prev, examYear: undefined }));
                    }}
                    placeholder={String(currentYear)}
                    className={`w-full rounded-md border px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#953002] focus:border-[#953002] ${errors.examYear ? "border-red-500" : "border-gray-300"
                      }`}
                  />
                  {errors.examYear && (
                    <p className="text-xs text-red-500 font-medium">{errors.examYear}</p>
                  )}
                </div>

                {/* Exam Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Exam Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    min={`${examYear}-01-01`}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => {
                      setExamDate(e.target.value);
                      setErrors((prev) => ({ ...prev, examDate: undefined }));
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#953002] focus:border-[#953002] ${errors.examDate ? "border-red-500" : "border-gray-300"
                      }`}
                  />
                  {errors.examDate && (
                    <p className="text-xs text-red-500 font-medium">{errors.examDate}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-200 bg-white">
            <CardHeader className="border-b bg-gray-50/50 py-4">
              <CardTitle className="text-base font-semibold text-[#953002]">
                District Cutoff Marks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="border-collapse">
                  <TableHeader>
                    <TableRow className="bg-[#fafafa] hover:bg-[#fafafa]">
                      <TableHead className="px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                        District Name
                      </TableHead>
                      <TableHead className="w-64 px-4 py-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                        Cutoff Marks (0 - 200) <span className="text-red-500">*</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cutoffs.map((item) => {
                      const hasError = !!(errors.cutoffs && errors.cutoffs[item.district]);
                      const errorMsg = errors.cutoffs?.[item.district];

                      return (
                        <TableRow key={item.district} className="hover:bg-neutral-50">
                          <TableCell className="px-4 py-4 font-medium">
                            {item.district}
                          </TableCell>
                          <TableCell className="px-4 py-4">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={item.cutoffMarks}
                                onChange={(e) => handleCutoffChange(item.district, e.target.value)}
                                placeholder="Enter cutoff mark"
                                className={`w-full max-w-[180px] rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#953002] focus:border-[#953002] ${hasError ? "border-red-500 bg-red-50/10" : "border-gray-300 bg-white"
                                  }`}
                              />
                              {hasError && (
                                <p className="text-xs text-red-500 font-medium">{errorMsg}</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {cutoffs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-10 text-center text-neutral-500">
                          No educational districts found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={() => {
                window.location.href = "/scholarships/grade-5";
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#953002] text-white hover:bg-[#7d2802] gap-2 flex items-center px-6"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Confirmation Dialog Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold text-[#953002] mb-3">
              Confirm Save Configurations
            </h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to save the Grade 5 Exam year, date, and all district-wise cutoff marks? This will update any existing cutoff records for the year <span className="font-semibold">{examYear}</span>.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => setIsConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-[#953002] text-white hover:bg-[#7d2802]"
                onClick={confirmSave}
              >
                Yes, Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
