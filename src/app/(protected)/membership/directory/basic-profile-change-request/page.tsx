"use client";

import { useSearchParams } from "next/navigation";
import BasicDetailChange from "@/src/components/BasicDetailChange/page";
import { id } from "zod/locales";
export default function NewRegistrationsPage() {
  const searchParams = useSearchParams();
  const memberId = searchParams.get("memberId") ?? undefined;
  const editId = searchParams.get("editId") ?? undefined;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold">New Registrations</h1>
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4">
        <BasicDetailChange memberId={memberId} editId={editId} />
      </div>
    </div>
  );
}