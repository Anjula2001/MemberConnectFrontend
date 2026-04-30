"use client";
import { useEffect, useState } from "react";
import { ChevronDown, User, Loader2, ArrowLeft, FileText, Download, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";

import ImageDropzoneCard from "@/src/components/membership/ImageDropzoneCard";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { Separator } from "@/src/components/ui/separator";

import { getMemberById, type MemberDTO } from "@/lib/api/member";
import { getDocumentsByApplication, type UploadDocumentResponseDTO } from "@/lib/api/documents";

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
	secondary: ["Death Donation Request", "Add Documents", "Record Member Death"],
};

function Field({ label, value }: { label: string; value: string | undefined | null }) {
	return (
		<div className="space-y-1">
			<p className="text-[11px] text-neutral-500">{label}</p>
			<p className="text-sm font-medium text-neutral-800">{value || "—"}</p>
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
	const [memberIdParam, setMemberIdParam] = useState<string | null>(null);
	const [profile, setProfile] = useState<MemberDTO | null>(null);
	const [documents, setDocuments] = useState<UploadDocumentResponseDTO[]>([]);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState("Profile Details");
	const [selectedDocType, setSelectedDocType] = useState<string | null>(null);

	const uniqueDocTypes = Array.from(new Set(documents.map(d => d.documentType)));

	useEffect(() => {
		params.then((p) => setMemberIdParam(p.memberId));
	}, [params]);

	useEffect(() => {
		if (!memberIdParam) return;

		async function loadMember() {
			try {
				const data = await getMemberById(Number(memberIdParam));
				setProfile(data);
				if (data.applicationId) {
					const docs = await getDocumentsByApplication(data.applicationId);
					setDocuments(docs);
				}
			} catch (err) {
				console.error("Failed to fetch member", err);
			} finally {
				setLoading(false);
			}
		}

		loadMember();
	}, [memberIdParam]);


	if (error || !profile) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
				<div className="rounded-xl border border-red-200 bg-red-50 p-4">
					<div className="flex items-center gap-3">
						<AlertCircle className="h-6 w-6 text-red-600" />
						<div>
							<h3 className="font-semibold text-red-900">Error Loading Profile</h3>
							<p className="text-sm text-red-700">{error || "Member profile not found."}</p>
						</div>
					</div>
				</div>
			</div>
		);
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
			"Record Member Death": "/membership/directory/record-member-death",
		};

		const route = routeMap[action];
		if (route) {
			// Pass memberId as a query parameter for secondary actions
			const secondaryActions = ["Death Donation Request", "Add Documents", "Record Member Death"];
			if (secondaryActions.includes(action)) {
				router.push(`${route}?memberId=${memberId}`);
			} else {
				router.push(route);
			}
		}
	};

	if (loading) {
		return (
			<div className="flex h-[50vh] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-[#9d3602]" />
			</div>
		);
	}

	if (!profile) {
		notFound();
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
			<div className="flex items-center">
				<Link
					href="/membership/directory"
					className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-[#9d3602]"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to List
				</Link>
			</div>
			<div className="rounded-xl border border-neutral-200 bg-white">
				<div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 p-4">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 overflow-hidden">
							{profile.profilePictureUrl ? (
								<img src={profile.profilePictureUrl} alt={profile.fullName} className="h-full w-full object-cover" />
							) : (
								<User className="h-6 w-6" />
							)}
						</div>
						<div>
							<h1 className="text-2xl font-semibold text-[#9d3602]">{profile.fullName || profile.nameWithInitials}</h1>
							<p className="text-xs text-neutral-500">
								{profile.memberId} <span className="mx-2">•</span> {profile.designation || "—"}
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
						<Badge className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${profile.status === 'ACTIVE' ? 'bg-green-600 hover:bg-green-600' : profile.status === 'INACTIVE' ? 'bg-gray-500 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-600'}`}>
							{profile.status}
						</Badge>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2">
					{detailTabs.map((tab) => (
						<button
							key={tab}
							type="button"
							onClick={() => setActiveTab(tab)}
							className={
								activeTab === tab
									? "rounded-sm border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm"
									: "rounded-sm px-2.5 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-200/50 hover:text-neutral-700"
							}
						>
							{tab}
						</button>
					))}
				</div>

				<div className="p-4">
					{activeTab === "Profile Details" && (
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
									<Field label="NIC" value={profile.nic || profile.nicNumber} />
									<Field label="Date of Birth" value={profile.dateOfBirth} />
									<Field label="Gender" value={profile.gender} />
									<Field label="Preferred Language" value={profile.preferredLanguage} />
									<Field label="Joined Date" value={profile.membershipStartDate} />
								</div>

								<Separator />
								<SectionTitle title="Contact Information" />
								<div className="grid gap-4 md:grid-cols-4">
									<Field label="Mobile" value={profile.mobileNumber} />
									<Field label="Email" value={profile.emailAddress} />
									<Field label="Private Tel" value={profile.privateTelephone} />
									<Field label="Office Tel" value={profile.officeTelephone} />
									<div className="md:col-span-4">
										<Field label="Permanent Address" value={profile.permanentPrivateAddress} />
									</div>
								</div>

								<Separator />
								<SectionTitle title="Employment Details" />
								<div className="grid gap-4 md:grid-cols-4">
									<Field label="Designation" value={profile.designation} />
									<Field label="Working Location Type" value={profile.workingLocationType} />
									<Field label="Working Location" value={profile.workingLocation} />
									<Field label="District" value={profile.educationalDistrict} />
									<Field label="Zone" value={profile.educationalZone} />
									<Field label="Salary Paying Office" value={profile.salaryPayingOffice} />
									<Field label="Name in Payroll" value={profile.nameAsInPayroll} />
									<Field label="Computer No. in Payslip" value={profile.computerNoInPayslip} />
								</div>

								<Separator />
								<SectionTitle title="Nominee Details" />
								<div className="grid gap-4 md:grid-cols-4">
									<Field label="Nominee Name" value={profile.nomineeFullName} />
									<Field label="Relationship" value={profile.nomineeRelationship} />
									<Field label="Nominee Identification" value={`${profile.identification ?? ""} ${profile.identificationNumber ?? ""}`} />
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
					)}

					{activeTab === "Documents" && (
						<Card className="rounded-xl border-neutral-200 py-0 shadow-none">
							<CardContent className="space-y-5 p-4">
								<div>
									<h2 className="text-3xl font-semibold leading-none text-[#9d3602] sm:text-2xl">
										Uploaded Documents
									</h2>
									<p className="mt-1 text-xs text-neutral-500">Documents submitted during registration and later updates</p>
								</div>

								{documents.length === 0 ? (
									<div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-500">
										<FileText className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
										<p>No documents found for this member.</p>
									</div>
								) : !selectedDocType ? (
									<div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
										{uniqueDocTypes.map((type) => {
											const count = documents.filter((d) => d.documentType === type).length;
											return (
												<button
													key={type}
													type="button"
													onClick={() => setSelectedDocType(type)}
													className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white p-6 transition-all hover:border-[#b2410f]/30 hover:shadow-sm"
												>
													<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#b2410f]/10 text-[#b2410f]">
														<Folder className="h-6 w-6" />
													</div>
													<div className="text-center">
														<p className="text-sm font-semibold text-neutral-700">
															{type.replace(/_/g, " ")}
														</p>
														<p className="mt-1 text-xs text-neutral-500">{count} Files</p>
													</div>
												</button>
											);
										})}
									</div>
								) : (
									<div className="space-y-4">
										<button
											type="button"
											onClick={() => setSelectedDocType(null)}
											className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-[#9d3602]"
										>
											<ArrowLeft className="h-4 w-4" />
											Back to Document Types
										</button>

										<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
											{documents
												.filter((d) => d.documentType === selectedDocType)
												.map((doc) => (
													<div key={doc.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-[#b2410f]/30 hover:shadow-sm">
														<div className="flex items-start justify-between gap-2">
															<Badge className="bg-neutral-100 text-neutral-600 hover:bg-neutral-200" variant="outline">
																{doc.documentType.replace(/_/g, ' ')}
															</Badge>
															<span className="shrink-0 text-xs text-neutral-400">
																{new Date(doc.uploadedAt).toLocaleDateString()}
															</span>
														</div>
														<div className="flex items-center gap-2">
															<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#b2410f]/10 text-[#b2410f]">
																<FileText className="h-4 w-4" />
															</div>
															<div className="flex-1 overflow-hidden">
																<p className="truncate text-sm font-medium text-neutral-800" title={doc.fileName}>
																	{doc.fileName}
																</p>
																<p className="text-[10px] text-neutral-500">
																	{doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB` : "File"} • {doc.fileType}
																</p>
															</div>
														</div>
														{doc.storagePath && (
															<a
																href={doc.storagePath}
																target="_blank"
																rel="noreferrer"
																download={doc.fileName}
																className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-100"
															>
																<Download className="h-3 w-3" />
																Download
															</a>
														)}
													</div>
												))}
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{activeTab !== "Profile Details" && activeTab !== "Documents" && (
						<div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500">
							<p>This tab is currently under construction.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
