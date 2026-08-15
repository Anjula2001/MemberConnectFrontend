import { z } from "zod";

export const parseRequestedPeriod = (value: string): number => {
  if (!value) return 0;
  const trimmed = value.trim();

  const semMatch = trimmed.match(/^Semester\s+([1-9][0-9]*)$/i);
  if (semMatch) {
    return Number(semMatch[1]);
  }

  const yearSemMatch = trimmed.match(/^Year\s+([1-5])\s+Semester\s+([1-2])$/i);
  if (yearSemMatch) {
    const year = Number(yearSemMatch[1]);
    const semester = Number(yearSemMatch[2]);
    return (year - 1) * 2 + semester;
  }

  return 0;
};

export type ExistingFundRequestItem = {
  id?: string | number;
  requestId?: string;
  requestedPeriod?: string;
  status?: string;
};

export const fundRequestSchema = (
  availableBalance: number,
  totalSemesters?: number | null,
  existingFundRequests?: ExistingFundRequestItem[] | null,
  currentRequestId?: string | number | null
) =>
  z.object({
    requestDate: z
      .string()
      .min(1, "Request date is required")
      .transform((val) => new Date(val))
      .refine(
        (date) => {
          const today = new Date();

          const inputDate = new Date(date);
          inputDate.setHours(0, 0, 0, 0);

          const currentDate = new Date(today);
          currentDate.setHours(0, 0, 0, 0);

          return inputDate.getTime() <= currentDate.getTime();
        },
        {
          message: "Request date cannot be a future date",
        }
      ),

    requestedPeriod: z
      .string()
      .min(1, "Requested period is required")
      .refine(
        (val) => {
          const trimmed = val.trim();
          const isSemesterFormat = /^Semester\s+([1-9][0-9]*)$/i.test(trimmed);
          const isLegacyFormat = /^Year\s+([1-5])\s+Semester\s+([1-2])$/i.test(trimmed);
          return isSemesterFormat || isLegacyFormat;
        },
        {
          message: "Format must be: Semester 1 (e.g. Semester 1, Semester 2, ...)",
        }
      )
      .refine(
        (val) => {
          const periodNum = parseRequestedPeriod(val);
          if (!totalSemesters || totalSemesters <= 0) return true;
          return periodNum > 0 && periodNum <= totalSemesters;
        },
        {
          message: totalSemesters
            ? `Requested period cannot exceed total course semesters (Semester ${totalSemesters})`
            : "Invalid semester period",
        }
      )
      .refine(
        (val) => {
          if (!existingFundRequests || existingFundRequests.length === 0) return true;

          const requestedSemNum = parseRequestedPeriod(val);
          if (requestedSemNum <= 0) return true;

          const duplicate = existingFundRequests.some((req) => {
            if (
              currentRequestId &&
              ((req.id && String(req.id) === String(currentRequestId)) ||
                (req.requestId && req.requestId === String(currentRequestId)))
            ) {
              return false;
            }

            const reqStatus = (req.status || "").toUpperCase();
            if (reqStatus === "REJECTED" || reqStatus === "INACTIVE") {
              return false;
            }

            const existingSemNum = parseRequestedPeriod(req.requestedPeriod || "");
            return existingSemNum === requestedSemNum;
          });

          return !duplicate;
        },
        {
          message: "A fund request for this semester already exists for this scholarship",
        }
      ),

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
