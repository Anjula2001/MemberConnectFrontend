"use client";

import UniversityScholarshipForm from "@/src/components/UniSholarships/StudentExamSection";
import { useAuth } from "@/lib/auth-context";
import { canAccessUniversityScholarships } from "@/lib/permissions";
import AccessRestricted from "@/src/components/AccessRestricted";

export default function UniversityScholarshipPage() {
	const { user } = useAuth();

	// This screen is reached from the Member Directory, which several roles can open.
	// Being able to look up a member is not on its own permission to raise or review
	// their scholarship, so the module right is checked here rather than inherited.
	if (user && !canAccessUniversityScholarships(user.role)) {
		return (
			<AccessRestricted
				message="University Scholarships are restricted to District Office, Head Office and Scholarship personnel."
				fallbackHref="/membership/directory"
				fallbackLabel="Back to Member Directory"
			/>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-4 p-6 pt-0">
			<div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4">
				<div className="w-full max-w-7xl mx-auto p-4">
					<UniversityScholarshipForm />
				</div>
			</div>
		</div>
	);
}
