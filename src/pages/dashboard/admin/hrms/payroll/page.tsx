import { lazy, Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";

const PayrollProcessing = lazy(() => import("@/features/hrms/PayrollProcessing"));
const PayslipTable = lazy(() => import("@/features/hrms/PayslipTable"));

export default function HrmsPayrollPage() {
  return (
    <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">Loading payroll...</div>}>
      <div className="space-y-8">
        <PayrollProcessing />
        <Card>
          <CardContent className="py-6">
            <PayslipTable />
          </CardContent>
        </Card>
      </div>
    </Suspense>
  );
}
