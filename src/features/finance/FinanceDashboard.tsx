import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  IndianRupee, TrendingUp, Clock, AlertTriangle,
  FileText, Percent, Users, ArrowUpRight, ArrowDownRight,
  BarChart3, Activity, Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AdminDashboardSummaryDTO, InvoiceResponseDTO, PaymentResponseDTO } from "@/services/types/finance";
import { formatINR, formatINRCompact, computeCollectionRate, groupByMonth } from "../finance/utils/financeUtils";
import { format, formatDistanceToNow } from "date-fns";

interface FinanceDashboardProps {
  summary: AdminDashboardSummaryDTO | null;
  invoices: InvoiceResponseDTO[];
  payments: PaymentResponseDTO[];
  loading: boolean;
}

const CHART_COLORS = {
  emerald: "hsl(160, 84%, 39%)",
  amber: "hsl(38, 92%, 50%)",
  rose: "hsl(351, 83%, 61%)",
  blue: "hsl(217, 91%, 60%)",
  violet: "hsl(258, 90%, 66%)",
  cyan: "hsl(187, 85%, 53%)",
};

const STATUS_COLORS: Record<string, string> = {
  PAID: CHART_COLORS.emerald,
  PENDING: CHART_COLORS.amber,
  OVERDUE: CHART_COLORS.rose,
  CANCELLED: "hsl(220, 9%, 46%)",
  DRAFT: CHART_COLORS.blue,
};

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  trendLabel,
  loading,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  loading: boolean;
}) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300 group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/2 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          {trend && trendLabel && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === "up" ? "text-emerald-600 bg-emerald-500/10" :
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
      <div className="p-2 rounded-xl bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

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

export function FinanceDashboard({ summary, invoices, payments, loading }: FinanceDashboardProps) {
  // ── Computed Analytics ──────────────────────────────────────────────────────

  const totalBilled = useMemo(() =>
    invoices
      .filter((inv) => inv.status !== "CANCELLED")
      .reduce((acc, inv) => acc + Number(inv.totalAmount), 0), [invoices]
  );

  const collectionRate = useMemo(() =>
    computeCollectionRate(Number(summary?.totalCollected ?? 0), totalBilled), [summary, totalBilled]
  );

  // Monthly collection trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const invoicesByMonth = groupByMonth(invoices, "issueDate", 6);
    const paymentsByMonth = groupByMonth(payments as any, "paymentDate", 6);

    return Object.entries(invoicesByMonth).map(([month, invs]) => ({
      month,
      billed: invs.filter((i) => i.status !== "CANCELLED").reduce((a, i) => a + Number(i.totalAmount), 0),
      collected: (paymentsByMonth[month] ?? []).reduce((a: number, p: any) => a + Number(p.amountPaid), 0),
    }));
  }, [invoices, payments]);

  // Payment method distribution
  const paymentMethodData = useMemo(() => {
    const counts: Record<string, number> = { ONLINE: 0, CASH: 0, CHECK: 0, BANK_TRANSFER: 0 };
    payments.forEach((p) => {
      counts[p.paymentMethod] = (counts[p.paymentMethod] || 0) + Number(p.amountPaid);
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [payments]);

  // Invoice status breakdown
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = { PAID: 0, PENDING: 0, OVERDUE: 0, CANCELLED: 0, DRAFT: 0 };
    invoices.forEach((inv) => { counts[inv.status] = (counts[inv.status] || 0) + 1; });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([status, count]) => ({ status, count, fill: STATUS_COLORS[status] }));
  }, [invoices]);

  // Top outstanding students
  const topDefaulters = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === "OVERDUE" || inv.status === "PENDING")
      .sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount))
      .slice(0, 8);
  }, [invoices]);

  // Recent payments feed
  const recentPayments = useMemo(() =>
    [...payments].sort((a, b) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    ).slice(0, 6), [payments]
  );

  const PIE_COLORS = [CHART_COLORS.blue, CHART_COLORS.emerald, CHART_COLORS.violet, CHART_COLORS.amber];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title="Total Billed"
          value={loading ? "—" : formatINRCompact(totalBilled)}
          subtitle="All invoices issued"
          icon={FileText}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600"
          loading={loading}
        />
        <KpiCard
          title="Total Collected"
          value={loading ? "—" : formatINRCompact(Number(summary?.totalCollected ?? 0))}
          subtitle="Successful payments"
          icon={IndianRupee}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600"
          trend="up"
          trendLabel="Incoming"
          loading={loading}
        />
        <KpiCard
          title="Outstanding"
          value={loading ? "—" : formatINRCompact(Number(summary?.totalOutstanding ?? 0))}
          subtitle="Pending collection"
          icon={Clock}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600"
          trend="neutral"
          trendLabel="Pending"
          loading={loading}
        />
        <KpiCard
          title="Overdue Amount"
          value={loading ? "—" : formatINRCompact(Number(summary?.totalOverdue ?? 0))}
          subtitle="Immediate action needed"
          icon={AlertTriangle}
          iconBg="bg-rose-500/10"
          iconColor="text-rose-600"
          trend="down"
          trendLabel="Critical"
          loading={loading}
        />
        <KpiCard
          title="Pending Invoices"
          value={loading ? "—" : String(summary?.pendingInvoicesCount ?? 0)}
          subtitle="Awaiting payment"
          icon={Users}
          iconBg="bg-violet-500/10"
          iconColor="text-violet-600"
          loading={loading}
        />
        <KpiCard
          title="Collection Rate"
          value={loading ? "—" : `${collectionRate}%`}
          subtitle="Collected vs. billed"
          icon={Percent}
          iconBg={collectionRate >= 80 ? "bg-emerald-500/10" : collectionRate >= 60 ? "bg-amber-500/10" : "bg-rose-500/10"}
          iconColor={collectionRate >= 80 ? "text-emerald-600" : collectionRate >= 60 ? "text-amber-600" : "text-rose-600"}
          trend={collectionRate >= 80 ? "up" : "down"}
          trendLabel={`${collectionRate}%`}
          loading={loading}
        />
      </div>

      {/* ── Collection Efficiency Bar ───────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Collection Efficiency</span>
              <Badge variant="outline" className={`text-[10px] font-black ${collectionRate >= 80 ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5" :
                  collectionRate >= 60 ? "text-amber-600 border-amber-500/30 bg-amber-500/5" :
                    "text-rose-600 border-rose-500/30 bg-rose-500/5"
                }`}>
                {collectionRate >= 80 ? "EXCELLENT" : collectionRate >= 60 ? "MODERATE" : "ACTION NEEDED"}
              </Badge>
            </div>
            <span className="text-sm font-black text-foreground">{collectionRate}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${collectionRate}%` }}
              transition={{ duration: 1.2, ease: "circOut" }}
              className={`h-full rounded-full ${collectionRate >= 80 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                  collectionRate >= 60 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                    "bg-gradient-to-r from-rose-500 to-rose-400"
                }`}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium">
            <span>₹0</span>
            <span>Billed: {loading ? "—" : formatINRCompact(totalBilled)}</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Charts Row ─────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Monthly Trend Area Chart */}
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <SectionHeader icon={TrendingUp} title="Monthly Collection Trend" subtitle="Billed vs. collected over the last 6 months" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 animate-pulse rounded-xl bg-muted" />
            ) : invoices.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No invoice data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip {...CustomTooltipStyle} formatter={(v: number) => formatINR(v)} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                  <Area type="monotone" dataKey="billed" name="Billed" stroke={CHART_COLORS.blue} fill="url(#billedGrad)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke={CHART_COLORS.emerald} fill="url(#collectedGrad)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Donut */}
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <SectionHeader icon={BarChart3} title="Payment Methods" subtitle="Revenue by collection channel" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 animate-pulse rounded-xl bg-muted" />
            ) : paymentMethodData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No payment data</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentMethodData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...CustomTooltipStyle} formatter={(v: number) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-1">
                  {paymentMethodData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground font-medium">{d.name}</span>
                      </div>
                      <span className="font-bold text-foreground">{formatINRCompact(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Invoice Status & Defaulters Row ─────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Invoice Status Bar Chart */}
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <SectionHeader icon={FileText} title="Invoice Status Breakdown" subtitle="Count by current invoice state" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 animate-pulse rounded-xl bg-muted" />
            ) : statusBreakdown.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">No invoices yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={statusBreakdown} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip {...CustomTooltipStyle} />
                  <Bar dataKey="count" name="Invoices" radius={[0, 6, 6, 0]}>
                    {statusBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Defaulters Table */}
        <Card className="lg:col-span-3 border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <SectionHeader icon={AlertTriangle} title="Outstanding — Top Defaulters" subtitle="Students with highest pending dues" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : topDefaulters.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-sm font-bold text-foreground">All Clear!</p>
                <p className="text-xs text-muted-foreground mt-1">No outstanding or overdue invoices.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topDefaulters.map((inv, i) => (
                  <motion.div
                    key={inv.invoiceId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background/40 hover:bg-muted/30 transition-colors"
                  >
                    <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                      <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                        {(inv.studentName || "ST").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{inv.studentName || `Student ${inv.studentId}`}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">STU-{inv.studentId} • #{inv.invoiceNumber}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-foreground">{formatINR(Number(inv.totalAmount))}</p>
                      <Badge variant="outline" className={`text-[9px] font-black ${inv.status === "OVERDUE"
                          ? "text-rose-600 border-rose-500/30 bg-rose-500/5"
                          : "text-amber-600 border-amber-500/30 bg-amber-500/5"
                        }`}>
                        {inv.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Activity Feed ─────────────────────────────────────────────── */}
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <SectionHeader icon={Zap} title="Recent Payment Activity" subtitle="Latest successful transactions" />
            <Badge variant="outline" className="text-[10px] font-black text-primary border-primary/30 bg-primary/5">
              LIVE FEED
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : recentPayments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No payments recorded yet.</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentPayments.map((p, i) => (
                <motion.div
                  key={p.paymentId}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-background/50 hover:bg-muted/30 transition-all group"
                >
                  <Avatar className="h-9 w-9 border border-border/50 shrink-0">
                    <AvatarFallback className="bg-emerald-500/5 text-emerald-600 text-[10px] font-bold">
                      {(p.studentName || "ST").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-foreground truncate">{p.studentName || `Student ${p.studentId}`}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      {p.paymentDate ? (
                        <span title={format(new Date(p.paymentDate), "dd MMM yyyy, HH:mm")}>
                          {formatDistanceToNow(new Date(p.paymentDate), { addSuffix: true })}
                        </span>
                      ) : "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-emerald-600">{formatINRCompact(p.amountPaid)}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">{p.paymentMethod.replace("_", " ")}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </motion.div>
  );
}
