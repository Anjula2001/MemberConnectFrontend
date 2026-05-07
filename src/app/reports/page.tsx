import { Download, FileText, Printer } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";

type ReportItem = {
  title: string;
  category: string;
  description: string;
};

const reportItems: ReportItem[] = [
  {
    title: "Death Donation Request List for Board Approval",
    category: "Death Donation",
    description:
      "List of death donation requests that have been processed by the committees and are ready for board approval.",
  },
  {
    title: "Inactivation Approval List for Dormant Members",
    category: "Membership",
    description:
      "Detailed list of dormant members selected for inactivation, ready for board review.",
  },
  {
    title: "Scholarship Deviation List",
    category: "Scholarships",
    description:
      "List of scholarship requests that require deviation approval.",
  },
  {
    title: "Monthly Termination Summary",
    category: "Termination",
    description:
      "Summary of all member terminations and retirements for the current month.",
  },
];

export default function ReportsPage() {
  return (
      <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 p-4 md:p-6">
        <div className="max-w-6xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-[#9f3b07]">Reports</h1>
            <p className="text-sm text-muted-foreground">Generate and print system reports.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {reportItems.map((report) => (
              <Card key={report.title} className="rounded-xl py-0">
                <CardContent className="space-y-4 p-5">
                  <div className="space-y-2">
                    <h2 className="flex items-start gap-2 text-base font-semibold text-[#b45309]">
                      <FileText className="mt-0.5 size-4 text-blue-500" />
                      <span>{report.title}</span>
                    </h2>
                    <p className="text-sm text-muted-foreground">{report.category}</p>
                    <p className="text-sm leading-6 text-muted-foreground">{report.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="h-8 px-3 text-sm">
                      <Printer className="size-4" />
                      Print
                    </Button>
                    <Button type="button" variant="outline" className="h-8 px-3 text-sm">
                      <Download className="size-4" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
  );
}
  