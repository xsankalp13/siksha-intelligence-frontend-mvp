import { useState, useEffect } from "react";
import { RefreshCw, LayoutDashboard, FileText, Blocks, Settings2, Link2 } from "lucide-react";
import { toast } from "sonner";

import { financeService } from "@/services/finance";
import type {
  AdminDashboardSummaryDTO,
  InvoiceResponseDTO,
  FeeStructureResponseDTO,
  FeeTypeResponseDTO,
  StudentFeeMapResponseDTO,
} from "@/services/types/finance";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { FinanceOverview } from "./components/FinanceOverview";
import { FeeStructuresTab } from "./components/FeeStructuresTab";
import { InvoicesTab } from "./components/InvoicesTab";
import { FeeTypesTab } from "./components/FeeTypesTab";
import { StudentFeeAssignmentTab } from "./components/StudentFeeAssignmentTab";
import { PaymentsTab } from "./components/PaymentsTab";
import { LateFeeRulesTab } from "./components/LateFeeRulesTab";

type FinanceTab = "overview" | "structures" | "invoices" | "types" | "assignments" | "history" | "late-fees";

export default function AdminFinancePage() {
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");
  const [loading, setLoading] = useState(true);
  
  const [summary, setSummary] = useState<AdminDashboardSummaryDTO | null>(null);
  const [invoices, setInvoices] = useState<InvoiceResponseDTO[]>([]);
  const [structures, setStructures] = useState<FeeStructureResponseDTO[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeTypeResponseDTO[]>([]);
  const [studentFeeMaps, setStudentFeeMaps] = useState<StudentFeeMapResponseDTO[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, invRes, structRes, typeRes, mapRes] = await Promise.allSettled([
        financeService.getAdminDashboardSummary(),
        financeService.getAllInvoices({ page: 0, size: 200 }),
        financeService.getAllFeeStructures(),
        financeService.getAllFeeTypes(),
        financeService.getAllStudentFeeMaps(),
      ]);

      if (sumRes.status === "fulfilled") setSummary(sumRes.value.data);
      if (invRes.status === "fulfilled") setInvoices(invRes.value.data.content);
      if (structRes.status === "fulfilled") setStructures(structRes.value.data);
      if (typeRes.status === "fulfilled") setFeeTypes(typeRes.value.data);
      if (mapRes.status === "fulfilled") setStudentFeeMaps(mapRes.value.data);
    } catch (e) {
      toast.error("Failed to fetch finance records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container mx-auto space-y-8 pb-10">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Operations</h1>
          <p className="text-muted-foreground text-sm mt-1">Design fee structures and automate invoicing.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" className="h-9 gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Sync Data
          </Button>
        </div>
      </div>

      <Card className="p-1.5 border-border/50 bg-muted/20 backdrop-blur-sm nice-shadow">
        <div className="flex flex-wrap gap-1">
          <TabItem 
            active={activeTab === "overview"} 
            onClick={() => setActiveTab("overview")} 
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard Overview" 
          />
          <TabItem 
            active={activeTab === "structures"} 
            onClick={() => setActiveTab("structures")} 
            icon={<Blocks className="w-4 h-4" />}
            label="Fee Structure Design" 
          />
          <TabItem 
            active={activeTab === "invoices"} 
            onClick={() => setActiveTab("invoices")} 
            icon={<FileText className="w-4 h-4" />}
            label="Invoice Automation" 
          />
          <TabItem 
            active={activeTab === "types"} 
            onClick={() => setActiveTab("types")} 
            icon={<Settings2 className="w-4 h-4" />}
            label="Fee Types Configuration" 
          />
          <TabItem 
            active={activeTab === "assignments"} 
            onClick={() => setActiveTab("assignments")} 
            icon={<Link2 className="w-4 h-4" />}
            label="Student Fee Assignment" 
          />
          <TabItem 
            active={activeTab === "history"} 
            onClick={() => setActiveTab("history")} 
            icon={<RefreshCw className="w-4 h-4" />}
            label="Payment History" 
          />
          <TabItem 
            active={activeTab === "late-fees"} 
            onClick={() => setActiveTab("late-fees")} 
            icon={<Settings2 className="w-4 h-4" />}
            label="Late Fee Policies" 
          />
        </div>
      </Card>

      <div className="mt-8 transition-all duration-300">
        {activeTab === "overview" && (
          <FinanceOverview summary={summary} loading={loading} />
        )}

        {activeTab === "structures" && (
          <FeeStructuresTab
            structures={structures}
            feeTypes={feeTypes}
            loading={loading}
            onRefresh={fetchData}
          />
        )}

        {activeTab === "invoices" && (
          <InvoicesTab
            invoices={invoices}
            loading={loading}
            onRefresh={fetchData}
          />
        )}

        {activeTab === "types" && (
          <FeeTypesTab
            feeTypes={feeTypes}
            loading={loading}
            onRefresh={fetchData}
          />
        )}

        {activeTab === "assignments" && (
          <StudentFeeAssignmentTab
            structures={structures}
            studentFeeMaps={studentFeeMaps}
            loading={loading}
            onRefresh={fetchData}
          />
        )}

        {activeTab === "history" && (
          <PaymentsTab loading={loading} />
        )}

        {activeTab === "late-fees" && (
          <LateFeeRulesTab loading={loading} />
        )}
      </div>
    </div>
  );
}

function TabItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300
        ${active 
          ? "bg-background text-primary shadow-sm ring-1 ring-border/50" 
          : "text-muted-foreground hover:text-foreground hover:bg-background/50"}
      `}
    >
      {icon}
      {label}
    </button>
  );
}
