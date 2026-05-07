import { z } from "zod";

const identificationTypeValues = [
  "NIC",
  "Passport",
  "DrivingLicense",
  "BirthCertificate",
] as const;

export const memberRegistrationSchema = z.object({
  // Application Information
  applicationDate: z.string().min(1, "Application date is required"),
  statusOverride: z.string().optional(),

  // Personal Information
  title: z.string().min(1, "Title is required"),
  fullName: z.string().min(1, "Full name is required"),
  nameAsInPayroll: z.string().min(1, "Name as in payroll is required"),
  nameWithInitials: z.string().min(1, "Name with initials is required"),
  nicNumber: z.string().min(1, "NIC number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().min(1, "Gender is required"),
  preferredLanguage: z.string().min(1, "Preferred language is required"),
  permanentAddress: z.string().optional(),

  // Employment Information
  workingLocationType: z.string().min(1, "Working location type is required"),
  designation: z.string().min(1, "Designation is required"),
  natureOfOccupation: z.string().min(1, "Nature of occupation is required"),
  educationalDistrict: z.string().min(1, "Educational district is required"),
  educationalZone: z.string().optional(),
  workingLocation: z.string().optional(),
  workingLocationAddress: z.string().optional(),
  salaryPayingOffice: z.string().optional(),
  computerNoInPayroll: z.string().optional(),
  appointmentDate: z.string().optional(),
  officePhone: z.string().optional(),
  privatePhone: z.string().optional(),

  // Contact Information
  mobileNumber: z.string().min(1, "Mobile number is required"),
  emailAddress: z.string().email("Invalid email address"),

  // Remittance Details
  shareAccount: z.string().optional(),
  specialDepositAccount: z.string().optional(),
  fixedDepositAccount: z.string().optional(),
  scholarshipDeathDonationPension: z.string().optional(),

  // Nominee Details
  nomineeFullName: z.string().min(1, "Nominee full name is required"),
  nomineeRelationship: z.string().min(1, "Relationship is required"),
  identificationTypes: z
    .array(z.enum(identificationTypeValues))
    .min(1, "At least one identification type is required"),
  identificationNumbers: z.record(
    z.string(),
    z.string().min(1, "Identification number is required")
  ),
  identification: z.string().optional(),
  identificationNumber: z.string().optional(),
  identificationDetails: z.string().optional(),
  nomineeAddress: z.string().optional(),
});

export type MemberRegistration = z.infer<typeof memberRegistrationSchema>;
