import { z } from "zod";

export const fundRequestSchema = (availableBalance: number) => z.object({
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

  requestedPeriod: z
      .string()
      .min(1, "Requested period is required")
      .refine((val) => {
        const regex = /^Year\s([1-5])\sSemester\s([1-2])$/;
        return regex.test(val.trim());
      }, {
        message: "Format must be: Year 1 Semester 1 (Year 1–5, Semester 1–2)",
      }),

    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((val) => !isNaN(Number(val)), {
        message: "Amount must be a valid number",
      })
      .refine((val) => Number(val) > 0, {
        message: "Amount must be greater than 0",
      })
      .refine((val) => Number(val) <= availableBalance, {
        message: `Amount cannot exceed available balance (LKR ${availableBalance.toLocaleString()})`,
      }),
});

export type FundRequestForm = z.infer<ReturnType<typeof fundRequestSchema>>;