import { z } from "zod";

export const universityScholarshipSchema = z.object({
  requestDate: z
    .string()
    .min(1, "Request date is required")
    .transform((val) => new Date(val))
    .refine((date) => {
      const today = new Date();

      const inputDate = new Date(date);
      inputDate.setHours(0, 0, 0, 0);

      const currentDate = new Date(today);
      currentDate.setHours(0, 0, 0, 0);

      return inputDate.getTime() <= currentDate.getTime();
    }, {
      message: "Request date cannot be a future date",
    }),

  studentName: z
    .string()
    .min(3, "Student name must be at least 3 characters"),

  nic: z
    .string()
    .min(1, "NIC is required")
    .refine((val) => {
      const trimmed = val.trim().toUpperCase();
      const oldNicPattern = /^\d{9}[V]$/;     // 123456789V
      const newNicPattern = /^\d{12}$/;       // 200012345678
      return oldNicPattern.test(trimmed) || newNicPattern.test(trimmed);
    }, {
      message: "NIC must be 12 digits or 9 digits followed by V",
    }),

  bcNo: z
    .string()
    .regex(/^\d{8}$/, "Birth Certificate Number must be exactly 8 digits"),

  address: z
    .string()
    .min(1, "Address is required"),

  isSchoolApplicant: z.boolean().optional(),

  mobile: z
    .string()
    .min(1, "Mobile number is required")
    .refine((val) => {
      const trimmed = val.trim();
      const patterns = [
        /^07\d{8}$/,            // 0771234567
        /^\+947\d{8}$/,         // +94771234567
      ];
      return patterns.some((pattern) => pattern.test(trimmed));
    }, {
      message: "Enter a valid mobile number (e.g. 0771234567, +94771234567)",
    }),

  examYear: z
    .string()
    .min(1, "Exam year is required")
    .regex(/^\d{4}$/, "Exam year must be exactly 4 digits")
    .refine((val) => {
      const year = Number(val);
      const currentYear = new Date().getFullYear();
      return year >= 1950 && year <= currentYear;
    }, {
      message: `Exam year must be between 1950 and ${new Date().getFullYear()}`,
    }),

  examNo: z
    .string()
    .regex(/^\d{8}$/, "Exam number must be exactly 8 digits"),

  zscore: z
    .string()
    .min(1, "Z-Score is required")
    .regex(/^\d+\.\d{4}$/, "Z-Score must be in format like 1.4909"),

  university: z
    .string()
    .min(1, "University is required"),

  program: z
    .string()
    .min(1, "Program is required"),

  duration: z
    .string()
    .optional(),

  accountNo: z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z
      .string()
      .regex(/^\d{8,}$/, "Account number must be at least 8 digits")
      .optional(),
  ),

  bank: z
    .string()
    .optional(),

  branch: z
    .string()
    .optional(),

  hasMinorAccount: z
    .string()
    .optional(),

  minorAccountMonths: z
    .string()
    .optional(),

  specialDegree: z
    .boolean()
    .optional(),
});
