"use client";

import UniversityScholarshipForm from "@/src/components/UniSholarships/StudentExamSection";

export default function UniversityScholarshipPage() {
  return (
	<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
	  <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4">
		<div className="max-w-5xl mx-auto p-6">
		  <UniversityScholarshipForm />
		</div>
	  </div>
	</div>
  );
}
