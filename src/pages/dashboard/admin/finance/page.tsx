import { useState, useEffect, lazy, Suspense } from "react";
import {
  RefreshCw, LayoutDashboard, FileText, Blocks, Settings2, Link2,
  GraduationCap, CalendarRange, CreditCard, RotateCcw, Bell, Timer, BarChart3,
} from "lucide-react";
import { toast } from "sonner";

import { financeService } from "@/services/finance";
import type {
  AdminDashboardSummaryDTO,
  InvoiceResponseDTO,
  PaymentResponseDTO,
  FeeStructureResponseDTO,
  FeeTypeResponseDTO,
  StudentFeeMapResponseDTO,
} from "@/services/types/finance";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { FinanceDashboard } from "@/features/finance/FinanceDashboard";
import { FeeStructuresTab } from "@/features/finance/FeeStructuresTab";
import { FeeTypesTab } from "@/features/finance/FeeTypesTab";
import { StudentFeeAssignmentTab } from "@/features/finance/StudentFeeAssignmentTab";
import { PaymentsTab } from "@/features/finance/PaymentsTab";
import { LateFeeRulesTab } from "@/features/finance/LateFeeRulesTab";
import { ScholarshipManager } from "@/features/finance/ScholarshipManager";
import { InstallmentPlans } from "@/features/finance/InstallmentPlans";
import { RefundManager } from "@/features/finance/RefundManager";
import { FeeReminderCenter } from "@/features/finance/FeeReminderCenter";
import { ReportsCenter } from "@/features/finance/ReportsCenter";

const InvoicesTab = lazy(() =>
  import("@/features/finance/InvoicesTab").then((m) => ({ default: m.InvoicesTab }))
);

const tabLoadingFallback = (
  <Card>
    <CardContent className="py-6 text-sm text-muted-foreground">Loading module...</CardContent>
  </Card>
);

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState<AdminDashboardSummaryDTO | null>(null);
  const [invoices, setInvoices] = useState<InvoiceResponseDTO[]>([]);
  const [payments, setPayments] = useState<PaymentResponseDTO[]>([]);
  const [structures, setStructures] = useState<FeeStructureResponseDTO[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeTypeResponseDTO[]>([]);
  const [studentFeeMaps, setStudentFeeMaps] = useState<StudentFeeMapResponseDTO[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, invRes, payRes, structRes, typeRes, mapRes] = await Promise.allSettled([
        financeService.getAdminDashboardSummary(),
        financeService.getAllInvoices({ page: 0, size: 200 }),
        financeService.getAllPayments({ page: 0, size: 200 }),
        financeService.getAllFeeStructures(),
        financeService.getAllFeeTypes(),
        financeService.getAllStudentFeeMaps(),
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
      if (invRes.status === "fulfilled") setInvoices(invRes.value.data.content);
      if (payRes.status === "fulfilled") setPayments(payRes.value.data.content);
      if (structRes.status === "fulfilled") setStructures(structRes.value.data);
      if (typeRes.status === "fulfilled") setFeeTypes(typeRes.value.data);
      if (mapRes.status === "fulfilled") setStudentFeeMaps(mapRes.value.data);
    } catch {
      toast.error("Failed to fetch finance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const NavItem = ({ value, label, icon: Icon }: { value: string, label: string, icon: any }) => {
    const isActive = activeTab === value;
    return (
      <button
        onClick={() => setActiveTab(value)}
        className={`w-full flex items-center gap-2.5 px-4 py-1.5 text-sm transition-colors text-left
  outline-none focus:outline-none 
  ring-0 focus:ring-0 hover:ring-0 
  focus-visible:ring-0 focus-visible:outline-none
  ${isActive
            ? "text-primary font-medium bg-primary/10 rounded-none"
            : "text-muted-foreground hover:text-foreground hover:bg-primary/5 bg-white"
          }`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </button>
    );
  };

  const NavSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-1">
      <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 text-left">
        {title}
      </p>
      {children}
    </div>
  );

  return (
    <div className="flex -m-6 h-[calc(100vh-4rem)]">
      {/* Finance Sub-Sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-border bg-card/50 flex flex-col overflow-y-auto">
        <div className="px-4 py-3 border-b border-border shrink-0 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Finance</h2>
            <p className="text-xs text-muted-foreground">Financial Operations</p>
          </div>
          <Button onClick={fetchData} variant="ghost" size="icon" className="h-6 w-6">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          <NavSection title="Overview">
            <NavItem value="dashboard" label="Dashboard" icon={LayoutDashboard} />
          </NavSection>

          <NavSection title="Fee Management">
            <NavItem value="structures" label="Fee Structures" icon={Blocks} />
            <NavItem value="types" label="Fee Types" icon={Settings2} />
            <NavItem value="assignments" label="Fee Assignments" icon={Link2} />
            <NavItem value="invoices" label="Invoices" icon={FileText} />
          </NavSection>

          <NavSection title="Concessions & Plans">
            <NavItem value="scholarships" label="Scholarships" icon={GraduationCap} />
            <NavItem value="installments" label="Installments" icon={CalendarRange} />
          </NavSection>

          <NavSection title="Operations">
            <NavItem value="payments" label="Payments" icon={CreditCard} />
            <NavItem value="refunds" label="Refunds" icon={RotateCcw} />
            <NavItem value="reminders" label="Reminders" icon={Bell} />
            <NavItem value="late-fees" label="Late Fees" icon={Timer} />
          </NavSection>

          <NavSection title="Analytics">
            <NavItem value="reports" label="Reports" icon={BarChart3} />
          </NavSection>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Financial Operations</h1>
          <p className="text-sm text-muted-foreground">
            Manage fees, invoices, payments, scholarships, and financial reporting.
          </p>
        </div>

        <div>
          {activeTab === "dashboard" && (
            <FinanceDashboard summary={summary} invoices={invoices} payments={payments} loading={loading} />
          )}

          {activeTab === "structures" && (
            <FeeStructuresTab structures={structures} feeTypes={feeTypes} loading={loading} onRefresh={fetchData} />
          )}

          {activeTab === "types" && (
            <FeeTypesTab feeTypes={feeTypes} loading={loading} onRefresh={fetchData} />
          )}

          {activeTab === "assignments" && (
            <StudentFeeAssignmentTab structures={structures} studentFeeMaps={studentFeeMaps} loading={loading} onRefresh={fetchData} />
          )}

          {activeTab === "invoices" && (
            <Suspense fallback={tabLoadingFallback}>
              <InvoicesTab invoices={invoices} loading={loading} onRefresh={fetchData} />
            </Suspense>
          )}

          {activeTab === "scholarships" && <ScholarshipManager />}

          {activeTab === "installments" && <InstallmentPlans />}

          {activeTab === "payments" && <PaymentsTab loading={loading} />}

          {activeTab === "refunds" && <RefundManager />}

          {activeTab === "reminders" && <FeeReminderCenter />}

          {activeTab === "late-fees" && <LateFeeRulesTab loading={loading} />}

          {activeTab === "reports" && (
            <ReportsCenter invoices={invoices} payments={payments} summary={summary} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}
