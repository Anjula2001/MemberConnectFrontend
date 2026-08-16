"use client";

import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useToast } from "@/lib/toast-context";
import { ArrowLeft, Loader2 } from "lucide-react";

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
  cutoffMarks: string; // Keep as string for editable inputs to handle empty/partially typed values easily
}

export default function Grade5ExamCutoffManagementPage() {
  const { addToast } = useToast();
  const currentYear = new Date().getFullYear();

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
    cutoffs?: Record<string, string>; // Maps district name to error message
  }>({});

  // Build the cutoff rows from the static DISTRICTS list,
  // overlaying any saved marks from the API response
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
    const newErrors: typeof errors = {};
    let isValid = true;

    // 1. Validate exam year
    if (!examYear) {
      newErrors.examYear = "Exam year is required.";
      isValid = false;
    } else if (examYear > currentYear) {
      newErrors.examYear = "Exam year cannot be a future year.";
      isValid = false;
    } else if (examYear < currentYear) {
      newErrors.examYear = "Exam year cannot be a past year.";
      isValid = false;
    }

    // 2. Validate exam date
    if (!examDate) {
      newErrors.examDate = "Exam date is required.";
      isValid = false;
    } else {
      const selectedDate = new Date(examDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Allow today's date

      if (selectedDate.getFullYear() !== examYear) {
        newErrors.examDate = `Exam date must belong to the selected exam year (${examYear}).`;
        isValid = false;
      } else if (selectedDate > today) {
        newErrors.examDate = "Exam date cannot be a future date.";
        isValid = false;
      }
    }

    // 3. Validate district cutoff marks
    const cutoffErrors: Record<string, string> = {};
    cutoffs.forEach((item) => {
      const valStr = item.cutoffMarks.trim();
      if (!valStr) {
        cutoffErrors[item.district] = "Cutoff is required.";
        isValid = false;
      } else {
        const valNum = Number(valStr);
        if (isNaN(valNum) || !Number.isInteger(valNum)) {
          cutoffErrors[item.district] = "Must be a valid integer.";
          isValid = false;
        } else if (valNum < 0 || valNum > 200) {
          cutoffErrors[item.district] = "Must be between 0 and 200.";
          isValid = false;
        }
      }
    });

    if (Object.keys(cutoffErrors).length > 0) {
      newErrors.cutoffs = cutoffErrors;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
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
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">District Name</th>
                      <th className="px-6 py-3 text-left font-semibold w-64">Cutoff Marks (0 - 200) <span className="text-red-500">*</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cutoffs.map((item) => {
                      const hasError = !!(errors.cutoffs && errors.cutoffs[item.district]);
                      const errorMsg = errors.cutoffs?.[item.district];

                      return (
                        <tr key={item.district} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-medium text-gray-800">
                            {item.district}
                          </td>
                          <td className="px-6 py-3">
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
                          </td>
                        </tr>
                      );
                    })}
                    {cutoffs.length === 0 && (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-gray-500 font-medium">
                          No educational districts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
