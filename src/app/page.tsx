import StatsCards from "@/src/components/Dashboard/StatsCards"
import BottomSection from "@/src/components/Dashboard/BottomSection"


export default function Home() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4">
      <h1 className="text-2xl font-bold text-[#953002]">Dashboard</h1>
        <div className="p-6 w-full">
          <StatsCards />
          <BottomSection />
        </div>
      </div>
    </div>
  );
}
