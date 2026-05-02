import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ShieldCheck, TrendingUp, BookMarked, PiggyBank,
  AlertTriangle, CheckCircle2, XCircle, ClipboardList,
  ArrowUpRight, ArrowDownRight, Scale, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  AdminDashboardSummaryDTO,
  InvoiceResponseDTO,
  PaymentResponseDTO,
} from "@/services/types/finance";
import { formatINR, formatINRCompact, computeCollectionRate, groupByMonth } from "../finance/utils/financeUtils";

interface AuditorDashboardProps {
  summary: AdminDashboardSummaryDTO | null;
  invoices: InvoiceResponseDTO[];
  payments: PaymentResponseDTO[];
  loading: boolean;
}

const CHART_COLORS = {
  blue:    "hsl(217, 91%, 60%)",
  emerald: "hsl(160, 84%, 39%)",
  amber:   "hsl(38, 92%, 50%)",
  rose:    "hsl(351, 83%, 61%)",
  violet:  "hsl(258, 90%, 66%)",
  slate:   "hsl(220, 13%, 50%)",
};

const CustomTooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    fontSize: "12px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  },
  labelStyle: { color: "hsl(var(--foreground))", fontWeight: 700 },
};

function ComplianceKpiCard({
  title, value, subtitle, icon: Icon, iconBg, iconColor, trend, trendLabel, loading,
}: {
  title: string; value: string; subtitle: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  trend?: "up" | "down" | "neutral"; trendLabel?: string; loading: boolean;
}) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          {trend && trendLabel && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
              trend === "up"   ? "text-emerald-600 bg-emerald-500/10" :
              trend === "down" ? "text-rose-600 bg-rose-500/10" :
                                "text-muted-foreground bg-muted"
            }`}>
              {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : null}
              {trendLabel}
            </div>
          )}
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded-lg bg-muted mb-1" />
          ) : (
            <p className="text-2xl font-black tracking-tight text-foreground">{value}</p>
          )}
          <p className="mt-0.5 text-sm font-semibold text-foreground/80">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 rounded-xl bg-blue-500/10">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
      <div>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function AuditorDashboard({ summary, invoices, payments, loading }: AuditorDashboardProps) {

  // ── Derived metrics ─────────────────────────────────────────────────────────

  const totalBilled = useMemo(() =>
    invoices.filter(i => i.status !== "CANCELLED").reduce((a, i) => a + Number(i.totalAmount), 0),
    [invoices]
  );

  const totalCollected = Number(summary?.totalCollected ?? 0);
  const totalOutstanding = Number(summary?.totalOutstanding ?? 0);
  const totalOverdue = Number(summary?.totalOverdue ?? 0);
  const collectionRate = useMemo(() => computeCollectionRate(totalCollected, totalBilled), [totalCollected, totalBilled]);

  // Monthly Collected vs Outstanding trend
  const monthlyTrend = useMemo(() => {
    const invoicesByMonth = groupByMonth(invoices, "issueDate", 6);
    const paymentsByMonth = groupByMonth(payments as any, "paymentDate", 6);
    return Object.entries(invoicesByMonth).map(([month, invs]) => ({
      month,
      billed:    invs.filter(i => i.status !== "CANCELLED").reduce((a, i) => a + Number(i.totalAmount), 0),
      collected: (paymentsByMonth[month] ?? []).reduce((a: number, p: any) => a + Number(p.amountPaid), 0),
      overdue:   invs.filter(i => i.status === "OVERDUE").reduce((a, i) => a + Number(i.totalAmount), 0),
    }));
  }, [invoices, payments]);

  // Invoice status health
  const statusCounts = useMemo(() => {
    const c = { PAID: 0, PENDING: 0, OVERDUE: 0, CANCELLED: 0, DRAFT: 0 };
    invoices.forEach(i => { (c as any)[i.status] = ((c as any)[i.status] || 0) + 1; });
    return c;
  }, [invoices]);

  const invoiceHealth = useMemo(() => [
    { label: "Paid",      count: statusCounts.PAID,      fill: CHART_COLORS.emerald },
    { label: "Pending",   count: statusCounts.PENDING,   fill: CHART_COLORS.amber },
    { label: "Overdue",   count: statusCounts.OVERDUE,   fill: CHART_COLORS.rose },
    { label: "Cancelled", count: statusCounts.CANCELLED, fill: CHART_COLORS.slate },
    { label: "Draft",     count: statusCounts.DRAFT,     fill: CHART_COLORS.blue },
  ].filter(r => r.count > 0), [statusCounts]);

  // Payment method compliance breakdown
  const paymentMethodBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach(p => {
      const m = p.paymentMethod.replace("_", " ");
      map[m] = (map[m] || 0) + Number(p.amountPaid);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [payments]);

  // Overdue trend — detect rising/falling risk
  const overdueCount = statusCounts.OVERDUE;
  const overdueRatio = invoices.length > 0 ? Math.round((overdueCount / invoices.length) * 100) : 0;

  // Financial health score (0–100) — simplified heuristic
  const healthScore = useMemo(() => {
    let score = 100;
    if (collectionRate < 80) score -= (80 - collectionRate) * 0.5;
    if (overdueRatio > 10)   score -= overdueRatio * 0.8;
    if (totalOverdue > 0 && totalBilled > 0) score -= (totalOverdue / totalBilled) * 30;
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [collectionRate, overdueRatio, totalOverdue, totalBilled]);

  const healthColor = healthScore >= 80 ? "emerald" : healthScore >= 60 ? "amber" : "rose";
  const healthLabel = healthScore >= 80 ? "HEALTHY" : healthScore >= 60 ? "MODERATE RISK" : "HIGH RISK";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* ── Header Banner ─────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-blue-200" />
              <span className="text-xs font-bold tracking-widest uppercase text-blue-200">Auditor View — Read Only</span>
            </div>
            <h2 className="text-2xl font-black">Compliance Dashboard</h2>
            <p className="text-sm text-blue-200 mt-1">Financial health, budget variance &amp; ledger integrity for {new Date().getFullYear()}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-black ${
              healthColor === "emerald" ? "bg-emerald-500/20 text-emerald-300" :
              healthColor === "amber"   ? "bg-amber-500/20 text-amber-300" :
                                          "bg-rose-500/20 text-rose-300"
            }`}>
              {healthScore >= 80 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {healthLabel}
            </div>
            <p className="text-3xl font-black mt-2 text-white">{healthScore}<span className="text-lg text-blue-200">/100</span></p>
            <p className="text-xs text-blue-300">Financial Health Score</p>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ComplianceKpiCard
          title="Total Revenue Billed"  value={loading ? "—" : formatINRCompact(totalBilled)}
          subtitle="All active invoices"  icon={ClipboardList}
          iconBg="bg-blue-500/10" iconColor="text-blue-600" loading={loading}
        />
        <ComplianceKpiCard
          title="Collected"  value={loading ? "—" : formatINRCompact(totalCollected)}
          subtitle={`${collectionRate}% collection rate`}  icon={CheckCircle2}
          iconBg="bg-emerald-500/10" iconColor="text-emerald-600"
          trend="up" trendLabel={`${collectionRate}%`} loading={loading}
        />
        <ComplianceKpiCard
          title="Outstanding"  value={loading ? "—" : formatINRCompact(totalOutstanding)}
          subtitle="Pending collection"  icon={Scale}
          iconBg="bg-amber-500/10" iconColor="text-amber-600"
          trend="neutral" trendLabel="Pending" loading={loading}
        />
        <ComplianceKpiCard
          title="Overdue (At-Risk)"  value={loading ? "—" : formatINRCompact(totalOverdue)}
          subtitle={`${overdueRatio}% of total invoices`}  icon={AlertTriangle}
          iconBg="bg-rose-500/10" iconColor="text-rose-600"
          trend={totalOverdue > 0 ? "down" : "up"} trendLabel={totalOverdue > 0 ? "Action needed" : "All clear"} loading={loading}
        />
      </div>

      {/* ── Collection Efficiency Bar ─────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-bold">Collection Efficiency</span>
              <Badge variant="outline" className={`text-[10px] font-black ${
                collectionRate >= 80 ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5" :
                collectionRate >= 60 ? "text-amber-600 border-amber-500/30 bg-amber-500/5" :
                                        "text-rose-600 border-rose-500/30 bg-rose-500/5"
              }`}>
                {collectionRate >= 80 ? "COMPLIANT" : collectionRate >= 60 ? "MODERATE" : "NON-COMPLIANT"}
              </Badge>
            </div>
            <span className="text-sm font-black text-foreground">{collectionRate}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${collectionRate}%` }}
              transition={{ duration: 1.2, ease: "circOut" }}
              className={`h-full rounded-full ${
                collectionRate >= 80 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                collectionRate >= 60 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                                        "bg-gradient-to-r from-rose-500 to-rose-400"
              }`}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
            <span>Compliance Threshold: 80%</span>
            <span>Billed: {loading ? "—" : formatINRCompact(totalBilled)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Charts Row ─────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Revenue vs. Overdue Area Trend */}
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <SectionHeader icon={TrendingUp} title="Revenue Trend vs. Overdue Risk" subtitle="6-month collection pattern for audit review" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 animate-pulse rounded-xl bg-muted" />
            ) : monthlyTrend.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="auditorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="auditorOverdue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.rose} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.rose} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip {...CustomTooltipStyle} formatter={(v: number) => formatINR(v)} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke={CHART_COLORS.blue} fill="url(#auditorCollected)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="overdue"   name="Overdue"   stroke={CHART_COLORS.rose} fill="url(#auditorOverdue)"    strokeWidth={2}   dot={false} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Invoice Status Compliance */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <SectionHeader icon={BookMarked} title="Invoice Status Health" subtitle="Compliance snapshot by invoice state" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : invoiceHealth.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No invoices to audit</div>
            ) : (
              <div className="space-y-3 mt-2">
                {invoiceHealth.map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.fill }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-foreground">{row.label}</span>
                        <span className="text-xs font-black text-foreground">{row.count}</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${invoices.length > 0 ? (row.count / invoices.length) * 100 : 0}%` }}
                          transition={{ duration: 1, ease: "circOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: row.fill }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium w-8 text-right">
                      {invoices.length > 0 ? Math.round((row.count / invoices.length) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Payment Method Audit + Overdue Risk ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Payment Channel Compliance */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <SectionHeader icon={PiggyBank} title="Payment Channel Breakdown" subtitle="Collection source compliance for GL verification" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 animate-pulse rounded-xl bg-muted" />
            ) : paymentMethodBreakdown.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No payments to audit</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={paymentMethodBreakdown} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip {...CustomTooltipStyle} formatter={(v: number) => formatINR(v)} />
                  <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
                    {paymentMethodBreakdown.map((_, i) => (
                      <Cell key={i} fill={[CHART_COLORS.blue, CHART_COLORS.emerald, CHART_COLORS.violet, CHART_COLORS.amber][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Audit Compliance Checklist */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <SectionHeader icon={ShieldCheck} title="Compliance Checklist" subtitle="Automated audit checks based on current data" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : (
              <div className="space-y-2.5">
                {[
                  {
                    label: "Collection rate ≥ 80%",
                    pass:  collectionRate >= 80,
                    detail: `Current: ${collectionRate}%`,
                  },
                  {
                    label: "Overdue invoices < 10% of total",
                    pass:  overdueRatio < 10,
                    detail: `Current: ${overdueRatio}%`,
                  },
                  {
                    label: "No unresolved overdue amount",
                    pass:  totalOverdue === 0,
                    detail: totalOverdue === 0 ? "All clear" : `At risk: ${formatINRCompact(totalOverdue)}`,
                  },
                  {
                    label: "Outstanding < 30% of total billed",
                    pass:  totalBilled === 0 || (totalOutstanding / totalBilled) < 0.3,
                    detail: totalBilled === 0 ? "N/A" : `${Math.round((totalOutstanding / totalBilled) * 100)}% outstanding`,
                  },
                  {
                    label: "Payments recorded in system",
                    pass:  payments.length > 0,
                    detail: `${payments.length} payments on record`,
                  },
                ].map((check, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background/40"
                  >
                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                      check.pass ? "bg-emerald-500/10" : "bg-rose-500/10"
                    }`}>
                      {check.pass
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        : <XCircle     className="h-4 w-4 text-rose-600"    />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{check.label}</p>
                      <p className="text-[10px] text-muted-foreground">{check.detail}</p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] font-black ${
                      check.pass
                        ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5"
                        : "text-rose-600 border-rose-500/30 bg-rose-500/5"
                    }`}>
                      {check.pass ? "PASS" : "FAIL"}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </motion.div>
  );
}
