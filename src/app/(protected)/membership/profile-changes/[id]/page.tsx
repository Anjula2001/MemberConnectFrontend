import BasicDetailChange from "@/src/components/BasicDetailChange/page";

export default async function ProfileChangeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold">Edit Profile Change Request</h1>
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <BasicDetailChange editId={id} />
        </div>
      </div>
    </div>
  );
}
