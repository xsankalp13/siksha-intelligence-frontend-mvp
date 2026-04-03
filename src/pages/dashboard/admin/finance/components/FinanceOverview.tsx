import { motion } from "framer-motion";
import { IndianRupee, Clock, AlertTriangle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminDashboardSummaryDTO } from "@/services/types/finance";

const formatCompact = (n: number) => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
};

interface FinanceOverviewProps {
  summary: AdminDashboardSummaryDTO | null;
  loading: boolean;
}

export function FinanceOverview({ summary, loading }: FinanceOverviewProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <IndianRupee className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-4">
              {loading ? (
                <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {summary ? formatCompact(Number(summary.totalCollected)) : "—"}
                </p>
              )}
              <p className="mt-0.5 text-sm font-medium text-foreground">Total Collected</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Successful incoming transactions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="mt-4">
              {loading ? (
                <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {summary ? formatCompact(Number(summary.totalOutstanding)) : "—"}
                </p>
              )}
              <p className="mt-0.5 text-sm font-medium text-foreground">Outstanding Fee</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Across pending/overdue</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="mt-4">
              {loading ? (
                <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {summary ? formatCompact(Number(summary.totalOverdue)) : "—"}
                </p>
              )}
              <p className="mt-0.5 text-sm font-medium text-foreground">Overdue Amount</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Immediate action required</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="mt-4">
              {loading ? (
                <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {summary ? summary.pendingInvoicesCount : "—"}
                </p>
              )}
              <p className="mt-0.5 text-sm font-medium text-foreground">Pending Invoices</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Invoices awaiting payment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
