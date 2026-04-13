import { z } from "zod";

export const universityScholarshipSchema = z.object({
  requestDate: z
  .string()
  .min(1, "Request date is required")
  .transform((val) => new Date(val))
  .refine((date) => {
    const today = new Date();

    // Compare only the date part
    const inputDate = new Date(date);
    inputDate.setHours(0, 0, 0, 0);

    const currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    return inputDate.getTime() <= currentDate.getTime();
  }, {
    message: "Request date cannot be a future date"
  }),

  studentName: z.string().min(1, "Student name is required"),
  nic: z.string().min(10, "NIC is required"),
  bcNo: z.string().min(1, "BC No is required"),
  address: z.string().min(1, "Address is required"),
  isSchoolApplicant: z.boolean().optional(),
  mobile: z.string().min(10, "Mobile number is required"),
  examYear: z.string().min(4, "Exam year is required"),
  examNo: z.string().min(1, "Exam number is required"),
  zScore: z.string().min(1, "Z-Score is required"),
  university: z.string().min(1, "University is required"),
  program: z.string().min(1, "Program is required"),
  duration: z.string().optional(),
  accountNo: z.string().min(1, "Account number is required"),
  bank: z.string().optional(),
  branch: z.string().optional(),
});
