import { z } from "zod";

export const memberTransferSchema = z.object({
  designationNew: z.string().min(1, "New designation is required"),

  natureOfOccupationNew: z
    .string()
    .min(1, "New nature of occupation is required"),

  workingLocationTypeNew: z
    .string()
    .min(1, "New working location type is required"),

  workingLocationNew: z
    .string()
    .min(1, "New working location is required"),

  educationalZoneNew: z
    .string()
    .min(1, "New educational zone is required"),

  educationalDistrictNew: z
    .string()
    .min(1, "New educational district is required"),

  computerNoNameNew: z
    .string()
    .min(1, "New computer number in payslip is required"),

  salaryPayingOfficeNew: z
    .string()
    .min(1, "New salary paying office is required"),
});

export type MemberTransferFormData = z.infer<typeof memberTransferSchema>;