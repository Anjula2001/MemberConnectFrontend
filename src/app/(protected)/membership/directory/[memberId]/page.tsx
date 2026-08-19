"use client";

import { useEffect, useState } from "react";
import { ChevronDown, User, Loader2, ArrowLeft, FileText, Download, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";

import ImageDropzoneCard from "@/src/components/membership/ImageDropzoneCard";
import ProgressTimeline from "@/src/components/membership/ProgressTimeline";
import RemittanceSavingsTab from "@/src/components/membership/RemittanceSavingsTab";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent } from "@/src/components/ui/card";
import { Separator } from "@/src/components/ui/separator";

import { getMemberById, searchMembers, updateMemberStatus, type MemberDTO } from "@/lib/api/member";
import { getDocumentsByApplication, uploadDocumentFile, deleteDocument, type UploadDocumentResponseDTO, type DocumentType } from "@/lib/api/documents";
import { useToast } from "@/lib/toast-context";
import { useAuth } from "@/lib/auth-context";
import { TESTING_ACTIVATE_ROLES, hasRole } from "@/lib/permissions";

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
		"Member Transfer",
	],
	scholarshipRequests: [
		"Grade 5 Scholarship",
		"University Scholarship",
	],
	secondary: ["Retirement", "Death Donation Request", "Add Documents", "Record Member Death", "Member Termination"],
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
	const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
	const [deletingDocType, setDeletingDocType] = useState<string | null>(null);
	const [isActivating, setIsActivating] = useState(false);
	const { addToast } = useToast();
	const { user } = useAuth();
	const canTestActivate = hasRole(user?.role, TESTING_ACTIVATE_ROLES);

	// Real activation is supposed to come from the Finance Module once the member's
	// accounts are created there (out of scope for this build). This button is a
	// clearly-labelled, Super-Admin-only stand-in so the rest of the flow (card/signature
	// card/passbook printing, dispatch — all of which require an Active member) can be
	// tested end-to-end until that integration exists. It must not be mistaken for the
	// real activation path.
	const handleTestActivate = async () => {
		if (!profile?.id) return;
		setIsActivating(true);
		try {
			const updated = await updateMemberStatus(profile.id, "ACTIVE");
			setProfile(updated);
			addToast("Member activated (testing override).");
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to activate member";
			addToast(message, "destructive");
		} finally {
			setIsActivating(false);
		}
	};

	const [loansData, setLoansData] = useState<{ loans: any[]; obligations: any[] } | null>(null);
	const [scholarship, setScholarship] = useState<any | null>(null);

	// Filter out orphaned old local files ("uploads/...") for ALL documents
	const validDocuments = documents.filter(d => !(d.storagePath || "").startsWith("uploads/"));

	// displayDocuments is used for the "Documents" tab. We want ALL valid documents to show up as folders.
	const displayDocuments = validDocuments;
	const uniqueDocTypes = Array.from(new Set(displayDocuments.map(d => d.documentType)));
	const sortedDocs = [...validDocuments].sort((a, b) => b.id - a.id); // Sort descending by ID
	const profilePhotoDoc = sortedDocs.find(d => d.documentType === "PROFILE_PHOTO");
	const signatureDoc = sortedDocs.find(d => d.documentType === "SIGNATURE");

	const isRetirementAvailable = profile?.status === "ACTIVE";

	const handleDocumentUpload = async (file: File, documentType: DocumentType) => {
		if (!profile?.applicationId) {
			addToast("No application ID found for this member", "destructive");
			return;
		}

		setUploadingDocType(documentType);
		try {
			// Find all existing documents of this type to replace
			const existingDocs = documents.filter(d => d.documentType === documentType);
			for (const existingDoc of existingDocs) {
				await deleteDocument(existingDoc.id).catch(e => console.error(e));
			}

			const uploaded = await uploadDocumentFile({
				applicationId: profile.applicationId,
				documentType,
				file,
			});

			setDocuments(prev => [
				...prev.filter(d => d.documentType !== documentType),
				uploaded
			]);
			addToast(`${documentType.replace(/_/g, " ")} saved successfully!`);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to upload document";
			addToast(message, "destructive");
		} finally {
			setUploadingDocType(null);
		}
	};

	const handleDocumentDelete = async (documentType: DocumentType) => {
		const doc = documents.find(d => d.documentType === documentType);
		if (!doc) return;

		setDeletingDocType(documentType);
		try {
			await deleteDocument(doc.id);
			setDocuments(prev => prev.filter(d => d.id !== doc.id));
			addToast(`${documentType.replace(/_/g, " ")} removed successfully!`);
		} catch (error) {
			addToast("Failed to delete document", "destructive");
		} finally {
			setDeletingDocType(null);
		}
	};

	useEffect(() => {
		params.then((p) => setMemberIdParam(p.memberId));
	}, [params]);

	useEffect(() => {
		if (!memberIdParam) return;

		const idParam = memberIdParam;

		async function loadMember() {
			try {
				const numericId = Number(idParam);
				// The route segment is normally the numeric primary key, but some links pass
				// the member number (e.g. "MEM-0012") or an undefined id — resolve those by search
				// instead of sending "NaN" to /getMemberById/{id}, which the backend rejects.
				const data = Number.isInteger(numericId) && numericId > 0
					? await getMemberById(numericId)
					: (await searchMembers({ query: idParam })).find(
						(m) => m.memberId === idParam
					);

				if (!data) {
					setProfile(null);
					return;
				}

				setProfile(data);
				if (data.applicationId) {
					const docs = await getDocumentsByApplication(data.applicationId);
					setDocuments(docs);
				}

				if (data.memberId) {
					// Load Grade 5 Scholarship request
					fetch(`http://localhost:8080/api/grade5/${data.memberId}/request`)
						.then(res => {
							if (!res.ok) return null;
							return res.text().then(text => {
								try {
									return text ? JSON.parse(text) : null;
								} catch (e) {
									return null;
								}
							});
						})
						.then(scholData => {
							if (scholData) setScholarship(scholData);
						})
						.catch(e => console.error("Error loading scholarship request", e));

					// Load Loans and Obligations
					fetch(`http://localhost:8080/api/members/${data.memberId}/loans`)
						.then(res => {
							if (!res.ok) return null;
							return res.text().then(text => {
								try {
									return text ? JSON.parse(text) : null;
								} catch (e) {
									return null;
								}
							});
						})
						.then(loansVal => {
							if (loansVal) setLoansData(loansVal);
						})
						.catch(e => console.error("Error loading loans", e));
				}
			} catch (err) {
				console.error("Failed to fetch member", err);
			} finally {
				setLoading(false);
			}
		}

		loadMember();
	}, [memberIdParam]);

	const handleActionClick = (action: string) => {
		if (!profile?.memberId) return;

		if (action === "Death Donation Request" && profile.status !== "ACTIVE") {
			return;
		}

		if (
			action === "Record Member Death" &&
			profile.status !== "ACTIVE" &&
			profile.status !== "MEMBER_DEATH_RECORDED"
		) {
			return;
		}

		// Requirement 02 gates every profile change request on an active membership.
		const activeOnlyActions = [
			"Basic Profile Changes",
			"Change Name",
			"Change Remittance",
			"Change Nominee",
		];
		if (activeOnlyActions.includes(action) && profile.status !== "ACTIVE") {
			return;
		}

		const memberIdQuery = `?memberId=${profile.memberId}`;

		const routeMap: Record<string, string> = {
			"Basic Profile Changes": `/membership/directory/basic-profile-change-request?memberId=${memberIdParam}`,
			"Change Name": `/membership/directory/change-name?memberId=${memberIdParam}`,
			"Change Remittance": `/membership/directory/change-remittance?memberId=${memberIdParam}`,
			"Change Nominee": `/membership/directory/change-nominee?memberId=${memberIdParam}`,
			"Member Transfer": `/membership/directory/change-memberTransfer${memberIdQuery}`,
			"Grade 5 Scholarship": `/membership/directory/grade5-scholarship${memberIdQuery}&mode=new`,
			"Grade 5 Scholarships": `/membership/directory/grade5-scholarship${memberIdQuery}&mode=new`,
			"University Scholarship": `/membership/directory/university-scholarship${memberIdQuery}`,
			"University Scholarships": `/membership/directory/university-scholarship${memberIdQuery}`,
			"Member Termination": `/membership/directory/termination-request${memberIdQuery}`,
			"Retirement": `/membership/directory/retirement${memberIdQuery}`,
			"Death Donation Request": `/membership/directory/death-donation-request${memberIdQuery}`,
			"Add Documents": `/membership/directory/add-documents${memberIdQuery}`,
			"Record Member Death": `/membership/directory/record-member-death${memberIdQuery}`,
		};

		const route = routeMap[action];
		if (route) {
			router.push(route);
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
						<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 overflow-hidden border border-neutral-200">
							{profilePhotoDoc?.storagePath ? (
								<img src={`/api/documents/file/${profilePhotoDoc.storagePath}`} alt={profile.fullName} className="h-full w-full object-cover" />
							) : profile.profilePictureUrl ? (
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
									<details className="group">
										<summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-left text-base font-medium whitespace-nowrap text-neutral-700 rounded-lg transition-colors hover:bg-[rgb(250,250,250)] hover:text-[#9d3602] [&::-webkit-details-marker]:hidden">
											<span>Scholarship</span>
											<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
										</summary>
										<div className="mt-1 space-y-1 pl-3">
											{actionGroups.scholarshipRequests.map((item) => (
												<button
													key={item}
													type="button"
													onClick={() => handleActionClick(item)}
													className="block w-full px-3 py-2 text-left text-sm font-medium whitespace-nowrap text-neutral-600 rounded-lg transition-colors hover:bg-[rgb(250,250,250)] hover:text-[#9d3602]"
												>
													{item}
												</button>
											))}
										</div>
									</details>
								</div>

								<div className="px-5 py-2 space-y-1">
									{actionGroups.secondary.map((item) => {
										const isRetirementItem = item === "Retirement";
										const isDeathDonation = item === "Death Donation Request";
										const isRecordMemberDeath = item === "Record Member Death";
										const isDisabled =
											(isDeathDonation && profile.status !== "ACTIVE") ||
											(isRecordMemberDeath &&
												profile.status !== "ACTIVE" &&
												profile.status !== "MEMBER_DEATH_RECORDED") || (isRetirementItem && !isRetirementAvailable);
										;

										return (
											<button
												key={item}
												onClick={() => handleActionClick(item)}
												type="button"
												disabled={isDisabled}
												className={
													item === "Member Termination"
														? "block w-full px-3 py-2.5 text-left text-base font-medium whitespace-nowrap text-red-600 rounded-lg transition-colors hover:bg-red-200 hover:text-red-700"
														: isDisabled
															? "block w-full cursor-not-allowed px-3 py-2.5 text-left text-base font-medium whitespace-nowrap rounded-lg text-neutral-400"
															: "block w-full px-3 py-2.5 text-left text-base font-medium whitespace-nowrap text-neutral-700 rounded-lg transition-colors hover:bg-[rgb(250,250,250)] hover:text-[#9d3602]"
												}
											>
												{item}
											</button>
										);
									})}
								</div>
							</div>
						</details>
						<Badge className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${profile.status === 'ACTIVE' ? 'bg-green-600 hover:bg-green-600' : profile.status === 'INACTIVE' ? 'bg-gray-500 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-600'}`}>
							{profile.status}
						</Badge>
						{canTestActivate && profile.status === "INACTIVE" && (
							<button
								type="button"
								onClick={handleTestActivate}
								disabled={isActivating}
								title="Finance Module isn't integrated yet — this manually flips the member to Active so printing/dispatch can be tested."
								className="ml-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
							>
								{isActivating ? "Activating…" : "Activate (Testing Only)"}
							</button>
						)}
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2">
					{detailTabs.map((tab) => {
						const hasActiveLoan = loansData?.loans?.some((loan: any) => loan.balance > 0);
						return (
							<button
								key={tab}
								type="button"
								onClick={() => setActiveTab(tab)}
								className={
									activeTab === tab
										? "rounded-sm border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 shadow-sm flex items-center gap-1.5"
										: "rounded-sm px-2.5 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-200/50 hover:text-neutral-700 flex items-center gap-1.5"
								}
							>
								<span>{tab}</span>
								{tab === "Loans" && hasActiveLoan && (
									<span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 border border-red-200 leading-none">
										Outstanding
									</span>
								)}
								{tab === "Scholarships" && scholarship && (
									<span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-semibold text-green-700 border border-green-200 leading-none">
										Active
									</span>
								)}
							</button>
						);
					})}
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
									<ImageDropzoneCard
										title="Profile Picture"
										buttonLabel="Save Profile Image"
										existingUrl={profilePhotoDoc?.storagePath ? `/api/documents/file/${profilePhotoDoc.storagePath}` : undefined}
										isUploading={uploadingDocType === "PROFILE_PHOTO"}
										isDeleting={deletingDocType === "PROFILE_PHOTO"}
										onFileSelected={(file) => handleDocumentUpload(file, "PROFILE_PHOTO")}
										onDelete={() => handleDocumentDelete("PROFILE_PHOTO")}
									/>
									<ImageDropzoneCard
										title="Signature"
										buttonLabel="Save Signature Image"
										existingUrl={signatureDoc?.storagePath ? `/api/documents/file/${signatureDoc.storagePath}` : undefined}
										isUploading={uploadingDocType === "SIGNATURE"}
										isDeleting={deletingDocType === "SIGNATURE"}
										onFileSelected={(file) => handleDocumentUpload(file, "SIGNATURE")}
										onDelete={() => handleDocumentDelete("SIGNATURE")}
									/>
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

								{displayDocuments.length === 0 ? (
									<div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-500">
										<FileText className="mx-auto mb-2 h-8 w-8 text-neutral-400" />
										<p>No documents found for this member.</p>
									</div>
								) : !selectedDocType ? (
									<div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
										{uniqueDocTypes.map((type) => {
											const count = displayDocuments.filter((d) => d.documentType === type).length;
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
											{displayDocuments
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
																href={`/api/documents/file/${doc.storagePath}`}
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

					{activeTab === "Loans" && (
						<Card className="rounded-xl border-neutral-200 py-0 shadow-none">
							<CardContent className="space-y-6 p-4">
								<div>
									<h2 className="text-xl font-semibold leading-none text-[#9d3602]">
										Loan Records
									</h2>
									<p className="mt-1 text-xs text-neutral-500">Member outstanding loans</p>
								</div>

								{/* Loans Section */}
								<div className="space-y-3">
									<p className="text-sm font-semibold text-[#b2410f]">Active Outstanding Loans</p>
									<div className="overflow-hidden rounded-lg border border-neutral-200">
										<table className="w-full text-left text-xs">
											<thead className="bg-neutral-50 text-neutral-700">
												<tr className="border-b border-neutral-200">
													<th className="px-4 py-3 font-semibold">Loan ID</th>
													<th className="px-4 py-3 font-semibold text-right">Outstanding Balance (LKR)</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-neutral-200">
												{loansData?.loans && loansData.loans.length > 0 ? (
													loansData.loans.map((loan: any) => (
														<tr key={loan.id} className="hover:bg-neutral-50/50">
															<td className="px-4 py-3 font-medium text-neutral-800">
																{loan.id}
															</td>
															<td className="px-4 py-3 text-right font-medium text-red-600">
																{loan.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
															</td>
														</tr>
													))
												) : (
													<tr>
														<td colSpan={2} className="px-4 py-6 text-center text-neutral-500">
															No active outstanding loans found.
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{activeTab === "Scholarships" && (
						<Card className="rounded-xl border-neutral-200 py-0 shadow-none">
							<CardContent className="space-y-6 p-4">
								<div>
									<h2 className="text-xl font-semibold leading-none text-[#9d3602]">
										Scholarship Details
									</h2>
									<p className="mt-1 text-xs text-neutral-500">Member scholarship request records</p>
								</div>

								{scholarship ? (
									<div className="grid grid-cols-3 gap-0 bg-neutral-50/50 rounded-xl border border-neutral-200 divide-x divide-neutral-200">
										<div className="space-y-1 p-4">
											<p className="text-[11px] text-neutral-500">Request ID</p>
											{scholarship.requestNo ? (
												<button
													type="button"
													onClick={() => router.push(`/membership/directory/grade5-scholarship?requestId=${scholarship.requestNo}&mode=view`)}
													className="text-sm font-medium text-[#9d3602] underline underline-offset-2 hover:text-[#7a2700] transition-colors cursor-pointer"
												>
													{scholarship.requestNo}
												</button>
											) : (
												<p className="text-sm font-medium text-neutral-800">—</p>
											)}
										</div>
										<div className="space-y-1 p-4">
											<p className="text-[11px] text-neutral-500">Birth Certificate No</p>
											<p className="text-sm font-medium text-neutral-800">{scholarship.birthCertificateNumber || "—"}</p>
										</div>
										<div className="space-y-1 p-4">
											<p className="text-[11px] text-neutral-500">Status</p>
											<Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${scholarship.status === 'APPROVED' ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-100' :
												scholarship.status === 'REJECTED' ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-100' :
													'bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'
												}`}>
												{scholarship.status?.replace(/_/g, ' ')}
											</Badge>
										</div>
									</div>
								) : (
									<div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500">
										<p>No Grade 5 scholarship record found for this member.</p>
									</div>
								)}
							</CardContent>
						</Card>
					)}

					{activeTab === "Remittance & Savings" && profile.id && (
						<RemittanceSavingsTab memberId={profile.id} />
					)}

					{activeTab === "Progress" && profile.id && (
						<ProgressTimeline memberId={profile.id} />
					)}

					{activeTab !== "Profile Details" && activeTab !== "Documents" && activeTab !== "Loans" && activeTab !== "Scholarships" && activeTab !== "Progress" && activeTab !== "Remittance & Savings" && (
						<div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500">
							<p>This tab is currently under construction.</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}