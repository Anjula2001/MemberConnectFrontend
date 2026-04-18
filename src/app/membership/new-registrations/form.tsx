"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  memberRegistrationSchema,
  type MemberRegistration,
} from "@/lib/validators/memberRegistration.schema";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

export function NewMemberRegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberRegistration>({
    resolver: zodResolver(memberRegistrationSchema),
    defaultValues: {
      applicationDate: new Date().toISOString().split("T")[0],
      preferredLanguage: "English",
      gender: "Male",
      workingLocationType: "SCHOOL",
    },
  });

  const onSubmit = async (data: MemberRegistration) => {
    setIsSubmitting(true);
    try {
      console.log("Form data:", data);
      // TODO: Send data to API
      alert("Registration saved successfully!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const FormField = ({
    label,
    error,
    children,
    required = false,
  }: {
    label: string;
    error?: string;
    children: React.ReactNode;
    required?: boolean;
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#953002]">
            New Member Registration
          </h1>
          <p className="text-sm text-gray-500">Status: New</p>
        </div>
      </div>

      {/* Application Date */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base text-[#953002]">
            Application Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <FormField
            label="Application Date"
            error={errors.applicationDate?.message}
            required
          >
            <Input
              type="date"
              {...register("applicationDate")}
              className="w-full"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base text-[#953002]">
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {/* Row 1: Title and Full Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Title"
              error={errors.title?.message}
              required
            >
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Title" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr">Mr</SelectItem>
                      <SelectItem value="Mrs">Mrs</SelectItem>
                      <SelectItem value="Ms">Ms</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Full Name"
              error={errors.fullName?.message}
              required
            >
              <Input {...register("fullName")} placeholder="Full Name" />
            </FormField>
          </div>

          {/* Row 2: Name as in Payroll and Name with Initials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name as in Payroll"
              error={errors.nameAsInPayroll?.message}
              required
            >
              <Input
                {...register("nameAsInPayroll")}
                placeholder="Name as in Payroll"
              />
            </FormField>
            <FormField
              label="Name with Initials"
              error={errors.nameWithInitials?.message}
              required
            >
              <Input
                {...register("nameWithInitials")}
                placeholder="Name with Initials"
              />
            </FormField>
          </div>

          {/* Row 3: NIC, DOB, Gender, Preferred Language */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              label="NIC Number"
              error={errors.nicNumber?.message}
              required
            >
              <Input {...register("nicNumber")} placeholder="NIC Number" />
            </FormField>
            <FormField
              label="Date of Birth"
              error={errors.dateOfBirth?.message}
              required
            >
              <Input
                type="date"
                {...register("dateOfBirth")}
              />
            </FormField>
            <FormField
              label="Gender"
              error={errors.gender?.message}
              required
            >
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Preferred Language"
              error={errors.preferredLanguage?.message}
              required
            >
              <Controller
                name="preferredLanguage"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Sinhala">Sinhala</SelectItem>
                      <SelectItem value="Tamil">Tamil</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          {/* Row 4: Permanent Address */}
          <FormField
            label="Permanent Private Address"
            error={errors.permanentAddress?.message}
          >
            <Input
              {...register("permanentAddress")}
              placeholder="Permanent Address"
              className="w-full min-h-20"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base text-[#953002]">
            Employment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              label="Working Location Type"
              error={errors.workingLocationType?.message}
              required
            >
              <Controller
                name="workingLocationType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHOOL">School</SelectItem>
                      <SelectItem value="UNIVERSITY">University</SelectItem>
                      <SelectItem value="OFFICE">Office</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Designation"
              error={errors.designation?.message}
              required
            >
              <Input {...register("designation")} placeholder="Designation" />
            </FormField>
            <FormField
              label="Nature of Occupation"
              error={errors.natureOfOccupation?.message}
              required
            >
              <Input
                {...register("natureOfOccupation")}
                placeholder="Permanent"
              />
            </FormField>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Educational District"
              error={errors.educationalDistrict?.message}
              required
            >
              <Input
                {...register("educationalDistrict")}
                placeholder="Colombo"
              />
            </FormField>
            <FormField
              label="Educational Zone"
              error={errors.educationalZone?.message}
            >
              <Input
                {...register("educationalZone")}
                placeholder="Select Zone"
              />
            </FormField>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Working Location"
              error={errors.workingLocation?.message}
            >
              <Input
                {...register("workingLocation")}
                placeholder="Working Location"
              />
            </FormField>
            <FormField
              label="Working Location Address (Auto)"
              error={errors.workingLocationAddressAuto?.message}
            >
              <Input
                {...register("workingLocationAddressAuto")}
                placeholder="Auto"
                disabled
                className="bg-gray-100"
              />
            </FormField>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              label="Salary Paying Office"
              error={errors.salaryPayingOffice?.message}
            >
              <Input
                {...register("salaryPayingOffice")}
                placeholder="Office"
              />
            </FormField>
            <FormField
              label="Computer No. in Payroll"
              error={errors.computerNoInPayroll?.message}
            >
              <Input
                {...register("computerNoInPayroll")}
                placeholder="Computer No"
              />
            </FormField>
            <FormField
              label="Appointment Date"
              error={errors.appointmentDate?.message}
            >
              <Input
                type="date"
                {...register("appointmentDate")}
              />
            </FormField>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Office Telephone"
              error={errors.officePhone?.message}
            >
              <Input
                {...register("officePhone")}
                placeholder="Office Telephone"
              />
            </FormField>
            <FormField
              label="Private Telephone"
              error={errors.privatePhone?.message}
            >
              <Input
                {...register("privatePhone")}
                placeholder="Private Telephone"
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base text-[#953002]">
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Mobile Number"
              error={errors.mobileNumber?.message}
              required
            >
              <Input
                {...register("mobileNumber")}
                placeholder="Mobile Number"
              />
            </FormField>
            <FormField
              label="Email Address"
              error={errors.emailAddress?.message}
              required
            >
              <Input
                type="email"
                {...register("emailAddress")}
                placeholder="Email Address"
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Remittance Details */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base text-[#953002]">
            Remittance Details
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Share Account"
              error={errors.shareAccount?.message}
            >
              <Input
                {...register("shareAccount")}
                placeholder="1000"
              />
            </FormField>
            <FormField
              label="Special Deposit Account"
              error={errors.specialDepositAccount?.message}
            >
              <Input
                {...register("specialDepositAccount")}
                placeholder="500"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField
              label="Fixed Deposit Account"
              error={errors.fixedDepositAccount?.message}
            >
              <Input
                {...register("fixedDepositAccount")}
                placeholder="600"
              />
            </FormField>
            <FormField
              label="Scholarships/ Death Donation / Pension (Auto)"
              error={errors.scholarshipDeathDonationPension?.message}
            >
              <Input
                {...register("scholarshipDeathDonationPension")}
                placeholder="0"
                disabled
                className="bg-gray-100"
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Nominee Details */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="px-5 pt-5 pb-3">
          <CardTitle className="text-base text-[#953002]">
            Nominee Details
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Nominee Full Name"
              error={errors.nomineeFullName?.message}
              required
            >
              <Input
                {...register("nomineeFullName")}
                placeholder="Nominee Full Name"
              />
            </FormField>
            <FormField
              label="Relationship"
              error={errors.relationship?.message}
              required
            >
              <Input
                {...register("relationship")}
                placeholder="Relationship"
              />
            </FormField>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Identification Type"
              error={errors.identificationType?.message}
              required
            >
              <Controller
                name="identificationType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NIC">NIC</SelectItem>
                      <SelectItem value="PASSPORT">Passport</SelectItem>
                      <SelectItem value="DRIVING_LICENSE">
                        Driving License
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Identification Number"
              error={errors.identificationNumber?.message}
              required
            >
              <Input
                {...register("identificationNumber")}
                placeholder="Identification Number"
              />
            </FormField>
          </div>

          {/* Row 3: Address */}
          <FormField
            label="Nominee Address"
            error={errors.nomineeAddress?.message}
          >
            <Input
              {...register("nomineeAddress")}
              placeholder="Nominee Address"
              className="w-full min-h-20"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          type="button"
          variant="outline"
          className="border-gray-300 text-gray-700"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#953002] hover:bg-[#7a2700] text-white"
        >
          {isSubmitting ? "Saving..." : "Save Application"}
        </Button>
      </div>
    </form>
  );
}
