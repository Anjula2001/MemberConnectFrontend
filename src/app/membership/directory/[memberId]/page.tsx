"use client";

import { use } from "react";
import { ChevronDown, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";

import ImageDropzoneCard from "@/src/components/membership/ImageDropzoneCard";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { Separator } from "@/src/components/ui/separator";

type MemberProfile = {
	memberId: string;
	fullName: string;
	nameWithInitials: string;
	nic: string;
	dateOfBirth: string;
	gender: string;
	preferredLanguage: string;
	joinedDate: string;
	mobile: string;
	email: string;
	privateTel: string;
	officeTel: string;
	permanentAddress: string;
	designation: string;
	workingLocationType: string;
	workingLocation: string;
	district: string;
	zone: string;
	salaryPayingOffice: string;
	nameInPayroll: string;
	computerNoInPayslip: string;
	nomineeName: string;
	nomineeRelationship: string;
	nomineeId: string;
	nomineeAddress: string;
};

const memberProfiles: Record<string, MemberProfile> = {
	"MB-2023001": {
		memberId: "MB-2023001",
		fullName: "Johnathan Doe",
		nameWithInitials: "J. Doe",
		nic: "851401234V",
		dateOfBirth: "1985-05-20",
		gender: "Male",
		preferredLanguage: "-",
		joinedDate: "2015-01-01",
		mobile: "0771234567",
		email: "john.doe@example.com",
		privateTel: "-",
		officeTel: "-",
		permanentAddress: "123, Galle Road, Colombo 03",
		designation: "Teacher",
		workingLocationType: "SCHOOL",
		workingLocation: "Royal College",
		district: "Colombo",
		zone: "Colombo South",
		salaryPayingOffice: "Zonal Education Office",
		nameInPayroll: "J. Doe",
		computerNoInPayslip: "PAY-001",
		nomineeName: "-",
		nomineeRelationship: "-",
		nomineeId: "-",
		nomineeAddress: "-",
	},
	"MB-2023002": {
		memberId: "MB-2023002",
		fullName: "John Smith",
		nameWithInitials: "J. Smith",
		nic: "905581234V",
		dateOfBirth: "1990-06-15",
		gender: "Male",
		preferredLanguage: "English",
		joinedDate: "2023-10-25",
		mobile: "0714567890",
		email: "john.smith@example.com",
		privateTel: "0112456789",
		officeTel: "0112765432",
		permanentAddress: "45, Peradeniya Road, Kandy",
		designation: "Instructor",
		workingLocationType: "SCHOOL",
		workingLocation: "Kandy Model School",
		district: "Kandy",
		zone: "Kandy",
		salaryPayingOffice: "Kandy Education Office",
		nameInPayroll: "J. Smith",
		computerNoInPayslip: "PAY-245",
		nomineeName: "-",
		nomineeRelationship: "-",
		nomineeId: "-",
		nomineeAddress: "-",
	},
};

const detailTabs = [
	"Profile Details",
	"Documents",
	"Remittance & Savings",
	"Loans",
	"Scholarships",
	"Progress",
];

const actionGroups = {
	profileRequests: [
		"Basic Profile Changes",
		"Change Name",
		"Change Remittance",
		"Change Nominee",
		"Grade 5 Scholarship",
		"University Scholarship",
	],
	secondary: ["Death Donation Request", "Add Documents"],
};

function Field({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<p className="text-[11px] text-neutral-500">{label}</p>
			<p className="text-sm font-medium text-neutral-800">{value}</p>
		</div>
	);
}

function SectionTitle({ title }: { title: string }) {
	return <p className="text-sm font-semibold text-[#b2410f]">{title}</p>;
}

export default function MemberProfilePage({
	params,
}: {
	params: Promise<{ memberId: string }>;
}) {
	const router = useRouter();
	const { memberId } = use(params);
	const profile = memberProfiles[decodeURIComponent(memberId)];

	if (!profile) {
		notFound();
	}

	const handleActionClick = (action: string) => {
		const routeMap: Record<string, string> = {
			"Basic Profile Changes": "/membership/directory/basic-profile-change-request",
			"Change Name": "/membership/directory/change-name",
			"Change Remittance": "/membership/directory/change-remittance",
			"Change Nominee": "/membership/directory/change-nominee",
			"Grade 5 Scholarship": "/membership/directory/grade-5-scholarship",
			"University Scholarship": "/membership/directory/university-scholarship",
			"Request Termination": "/membership/directory/request-termination",
			"Death Donation Request": "/membership/directory/death-donation-request",
			"Add Documents": "/membership/directory/add-documents",
		};

		const route = routeMap[action];
		if (route) {
			router.push(route);
		}
	};

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
			<div className="rounded-xl border border-neutral-200 bg-white">
				<div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 p-4">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
							<User className="h-6 w-6" />
						</div>
						<div>
							<h1 className="text-2xl font-semibold text-[#9d3602]">{profile.fullName}</h1>
							<p className="text-xs text-neutral-500">
								{profile.memberId} <span className="mx-2">•</span> {profile.designation}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<details className="group relative">
							<summary className="flex h-9 min-w-[120px] cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 [&::-webkit-details-marker]:hidden">
								Actions
								<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
							</summary>

							<div className="absolute top-11 right-0 z-50 w-[340px] rounded-xl border border-neutral-300 bg-white shadow-xl">
								<div className="border-b border-neutral-300 px-5 py-3">
									<p className="text-2xl font-semibold text-neutral-800">Profile Requests</p>
								</div>

								<div className="border-b border-neutral-300 px-5 py-2 space-y-1">
									{actionGroups.profileRequests.map((item) => (
										<button
											key={item}
											type="button"
											onClick={() => handleActionClick(item)}
											className="block w-full px-3 py-2.5 text-left text-base font-medium whitespace-nowrap text-neutral-700 rounded-lg transition-colors hover:bg-[rgb(250,250,250)] hover:text-[#9d3602]"
										>
											{item}
										</button>
									))}
								</div>

								<div className="border-b border-neutral-300 px-5 py-2">
									<button
										type="button"
										onClick={() => handleActionClick("Request Termination")}
										className="block w-full px-3 py-2.5 text-left text-base font-medium whitespace-nowrap text-red-600 rounded-lg transition-colors hover:bg-red-200 hover:text-red-700"
									>
										Request Termination
									</button>
								</div>

								<div className="px-5 py-2 space-y-1">
									{actionGroups.secondary.map((item) => (
										<button
											key={item}
											onClick={() => handleActionClick(item)}
											type="button"
											className="block w-full px-3 py-2.5 text-left text-base font-medium whitespace-nowrap text-neutral-700 rounded-lg transition-colors hover:bg-[rgb(250,250,250)] hover:text-[#9d3602]"
										>
											{item}
										</button>
									))}
								</div>
							</div>
						</details>
						<Badge className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-600">
							ACTIVE
						</Badge>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2">
					{detailTabs.map((tab, index) => (
						<button
							key={tab}
							type="button"
							className={
								index === 0
									? "rounded-sm border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700"
									: "rounded-sm px-2.5 py-1 text-xs font-medium text-neutral-500"
							}
						>
							{tab}
						</button>
					))}
				</div>

				<div className="p-4">
					<Card className="rounded-xl border-neutral-200 py-0 shadow-none">
						<CardContent className="space-y-5 p-4">
							<div>
								<h2 className="text-3xl font-semibold leading-none text-[#9d3602] sm:text-2xl">
									Member Information
								</h2>
								<p className="mt-1 text-xs text-neutral-500">Personal and official details</p>
							</div>

							<SectionTitle title="Personal Information" />
							<div className="grid gap-4 md:grid-cols-4">
								<Field label="Full Name" value={profile.fullName} />
								<Field label="Name with Initials" value={profile.nameWithInitials} />
								<Field label="NIC" value={profile.nic} />
								<Field label="Date of Birth" value={profile.dateOfBirth} />
								<Field label="Gender" value={profile.gender} />
								<Field label="Preferred Language" value={profile.preferredLanguage} />
								<Field label="Joined Date" value={profile.joinedDate} />
							</div>

							<Separator />
							<SectionTitle title="Contact Information" />
							<div className="grid gap-4 md:grid-cols-4">
								<Field label="Mobile" value={profile.mobile} />
								<Field label="Email" value={profile.email} />
								<Field label="Private Tel" value={profile.privateTel} />
								<Field label="Office Tel" value={profile.officeTel} />
								<div className="md:col-span-4">
									<Field label="Permanent Address" value={profile.permanentAddress} />
								</div>
							</div>

							<Separator />
							<SectionTitle title="Employment Details" />
							<div className="grid gap-4 md:grid-cols-4">
								<Field label="Designation" value={profile.designation} />
								<Field label="Working Location Type" value={profile.workingLocationType} />
								<Field label="Working Location" value={profile.workingLocation} />
								<Field label="District" value={profile.district} />
								<Field label="Zone" value={profile.zone} />
								<Field label="Salary Paying Office" value={profile.salaryPayingOffice} />
								<Field label="Name in Payroll" value={profile.nameInPayroll} />
								<Field label="Computer No. in Payslip" value={profile.computerNoInPayslip} />
							</div>

							<Separator />
							<SectionTitle title="Nominee Details" />
							<div className="grid gap-4 md:grid-cols-4">
								<Field label="Nominee Name" value={profile.nomineeName} />
								<Field label="Relationship" value={profile.nomineeRelationship} />
								<Field label="Nominee ID" value={profile.nomineeId} />
								<div className="md:col-span-4">
									<Field label="Address" value={profile.nomineeAddress} />
								</div>
							</div>

							<div className="grid gap-4 pt-2 md:grid-cols-2">
								<ImageDropzoneCard title="Profile Picture" buttonLabel="Add Profile Image" />
								<ImageDropzoneCard title="Signature" buttonLabel="Add Signature Image" />
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
