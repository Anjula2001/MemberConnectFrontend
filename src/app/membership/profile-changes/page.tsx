import ProfileChangeRequests from "@/src/components/SearchRequest/page";

export default function ProfileChangesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold">All Member Profile Changes</h1>
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4">
        <ProfileChangeRequests/>
      </div>
    </div>
  );
}
