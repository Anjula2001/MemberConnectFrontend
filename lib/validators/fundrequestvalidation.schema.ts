import { z } from "zod";

const parseRequestedPeriod = (value: string) => {
  const match = value.trim().match(/^Year\s([1-5])\sSemester\s([1-2])$/);
  if (!match) return 0;

  const year = Number(match[1]);
  const semester = Number(match[2]);
  return (year - 1) * 2 + semester;
};

export const fundRequestSchema = (availableBalance: number, availablePeriod?: number | null) => z.object({
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

  requestedPeriod: z
    .string()
    .min(1, "Requested period is required")
    .refine((val) => {
      const regex = /^Year\s([1-5])\sSemester\s([1-2])$/;
      return regex.test(val.trim());
    }, {
      message: "Format must be: Year 1 Semester 1 (Year 1-5, Semester 1-2)",
    })
    .refine((val) => {
      if (!availablePeriod) return true;
      return parseRequestedPeriod(val) <= availablePeriod;
    }, {
      message: "Requested Period cannot be more than the Available Period",
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
      message: "Amount cannot be more than the Balance Amount",
    }),
});

export type FundRequestForm = z.infer<ReturnType<typeof fundRequestSchema>>;
