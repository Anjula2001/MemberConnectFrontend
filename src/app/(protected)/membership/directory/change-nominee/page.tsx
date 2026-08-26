"use client";

import { useSearchParams } from "next/navigation";
import NomineeChangeRequest from "@/src/components/NommineChangeRequest/page";

export default function ChangeNomineePage() {
	const searchParams = useSearchParams();
	const memberId = searchParams.get("memberId") ?? undefined;

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
			<h1 className="text-3xl font-bold text-[#953002]">Change Nominee</h1>
			<div className="rounded-xl border border-neutral-200 bg-white p-6">
				<div className="text-center text-neutral-600">
					<NomineeChangeRequest memberId={memberId} />
				</div>
			</div>
		</div>
	);
}
