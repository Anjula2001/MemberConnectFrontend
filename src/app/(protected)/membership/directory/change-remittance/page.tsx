"use client";

"use client";

import { useSearchParams } from "next/navigation";
import RemittanceChangePage from "@/src/components/RemitanceAmountChange/page";

export default function ChangeRemittancePage() {
	const searchParams = useSearchParams();
	const editId = searchParams.get("editId") ?? undefined;
	const memberId = searchParams.get("memberId") ?? undefined;

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:p-6 md:pt-0">
			<h1 className="text-3xl font-bold text-[#9d3602]">Change Remittance</h1>
			<div className="rounded-xl border border-neutral-200 bg-white p-6">
				<div className="text-center text-neutral-600">
					<RemittanceChangePage editId={editId} memberId={memberId} />
				</div>
			</div>
		</div>
	);
}
