import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  BarChart3, Download, Filter, FileSpreadsheet, TrendingUp, TrendingDown,
  Clock, AlertTriangle, CheckCircle2, X, FileText, CreditCard, Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import type { InvoiceResponseDTO, PaymentResponseDTO, AdminDashboardSummaryDTO } from "@/services/types/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatINRCompact, groupByMonth } from "../finance/utils/financeUtils";

interface ReportsCenterProps {
  invoices: InvoiceResponseDTO[];
  payments: PaymentResponseDTO[];
  summary: AdminDashboardSummaryDTO | null;
  loading: boolean;
}

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PAID: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", icon: CheckCircle2 },
  PENDING: { label: "Pending", cls: "bg-amber-500/10 text-amber-700 border-amber-500/30", icon: Clock },
  OVERDUE: { label: "Overdue", cls: "bg-red-500/10 text-red-700 border-red-500/30", icon: AlertTriangle },
  CANCELLED: { label: "Cancelled", cls: "bg-muted text-muted-foreground border-border", icon: X },
  DRAFT: { label: "Draft", cls: "bg-blue-500/10 text-blue-700 border-blue-500/30", icon: FileText },
};

const REPORT_PRESETS = [
  { id: "fee-collection", label: "Fee Collection Summary", icon: TrendingUp, description: "Total billed, collected, and outstanding" },
  { id: "outstanding", label: "Outstanding Statement", icon: AlertTriangle, description: "All pending and overdue invoices" },
  { id: "payment-method", label: "Payment Method Report", icon: CreditCard, description: "Breakdown by cash, online, bank transfer" },
  { id: "late-fee", label: "Late Fee Impact Report", icon: Clock, description: "Revenue generated from late penalties" },
];

const CHART_COLORS = ["hsl(160,84%,39%)", "hsl(38,92%,50%)", "hsl(351,83%,61%)", "hsl(217,91%,60%)", "hsl(258,90%,66%)"];

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (val: string | number) => {
    const str = String(val ?? "");
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

const CustomTooltipStyle = {
  contentStyle: { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "10px", fontSize: "12px" },
  labelStyle: { color: "hsl(var(--foreground))", fontWeight: 700 },
};

export function ReportsCenter({ invoices, payments, summary, loading }: ReportsCenterProps) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchStatus = statusFilter === "ALL" || inv.status === statusFilter;
      const matchSearch = !searchTerm || inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || String(inv.studentId).includes(searchTerm);
      const invDate = new Date(inv.issueDate);
      const matchFrom = !dateFrom || invDate >= new Date(dateFrom);
      const matchTo = !dateTo || invDate <= new Date(dateTo);
      return matchStatus && matchSearch && matchFrom && matchTo;
    });
  }, [invoices, statusFilter, searchTerm, dateFrom, dateTo]);

  const filteredCollected = useMemo(() => filteredInvoices.filter((i) => i.status === "PAID").reduce((a, i) => a + Number(i.totalAmount), 0), [filteredInvoices]);
  const filteredOutstanding = useMemo(() => filteredInvoices.filter((i) => i.status === "PENDING" || i.status === "OVERDUE").reduce((a, i) => a + Number(i.totalAmount), 0), [filteredInvoices]);
  const filteredLateFees = useMemo(() => filteredInvoices.reduce((a, i) => a + Number(i.lateFeeAmount ?? 0), 0), [filteredInvoices]);

  // Monthly data for bar chart
  const monthlyBarData = useMemo(() => {
    const byMonth = groupByMonth(invoices, "issueDate", 6);
    return Object.entries(byMonth).map(([month, invs]) => ({
      month,
      Billed: invs.reduce((a, i) => a + Number(i.totalAmount), 0),
      Collected: invs.filter((i) => i.status === "PAID").reduce((a, i) => a + Number(i.totalAmount), 0),
      Overdue: invs.filter((i) => i.status === "OVERDUE").reduce((a, i) => a + Number(i.totalAmount), 0),
    }));
  }, [invoices]);

  // Payment method pie
  const paymentMethodPie = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p) => { map[p.paymentMethod] = (map[p.paymentMethod] || 0) + Number(p.amountPaid); });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace("_", " "), value }));
  }, [payments]);

  const hasActiveFilter = statusFilter !== "ALL" || searchTerm || dateFrom || dateTo;
  const clearFilters = () => { setStatusFilter("ALL"); setSearchTerm(""); setDateFrom(""); setDateTo(""); };

  const exportInvoiceCSV = () => {
    if (filteredInvoices.length === 0) { toast.error("No invoices to export"); return; }
    const headers = ["Invoice Number", "Student ID", "Total Amount (₹)", "Paid Amount (₹)", "Late Fee (₹)", "Status", "Issue Date", "Due Date"];
    const rows = filteredInvoices.map((inv) => [inv.invoiceNumber, inv.studentId, inv.totalAmount, inv.paidAmount ?? 0, inv.lateFeeAmount ?? 0, inv.status, inv.issueDate, inv.dueDate]);
    downloadCSV(`finance-invoices-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
    toast.success(`Exported ${filteredInvoices.length} invoice records`);
  };

  const exportPaymentsCSV = () => {
    if (payments.length === 0) { toast.error("No payments to export"); return; }
    const headers = ["Payment ID", "Invoice ID", "Student ID", "Amount Paid (₹)", "Method", "Status", "Transaction Ref", "Date", "Notes"];
    const rows = payments.map((p) => [p.paymentId, p.invoiceId, p.studentId, p.amountPaid, p.paymentMethod, p.status, p.transactionId ?? "", p.paymentDate ? format(new Date(p.paymentDate), "yyyy-MM-dd HH:mm") : "", p.notes ?? ""]);
    downloadCSV(`finance-payments-${format(new Date(), "yyyy-MM-dd")}.csv`, headers, rows);
    toast.success(`Exported ${payments.length} payment records`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Financial Reports Center
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Filter, analyze, and export financial data</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportPaymentsCSV} size="sm" className="gap-2 h-9">
            <CreditCard className="h-3.5 w-3.5" /> Export Payments
          </Button>
          <Button onClick={exportInvoiceCSV} size="sm" className="gap-2 h-9">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export Invoices
          </Button>
        </div>
      </div>

      {/* Report Presets */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Report Templates</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {REPORT_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isActive = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setActivePreset(isActive ? null : preset.id)}
                className={`flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all duration-200 hover:shadow-md
                  ${isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 bg-card/60 hover:border-border"}`}
              >
                <div className={`p-2 rounded-lg ${isActive ? "bg-primary/15" : "bg-muted/60"}`}>
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${isActive ? "text-primary" : "text-foreground"}`}>{preset.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{preset.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Collected", value: formatINR(Number(summary?.totalCollected ?? 0)), icon: TrendingUp, cls: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: "Outstanding", value: formatINR(Number(summary?.totalOutstanding ?? 0)), icon: Clock, cls: "text-amber-600", bg: "bg-amber-500/10" },
          { label: "Overdue", value: formatINR(Number(summary?.totalOverdue ?? 0)), icon: TrendingDown, cls: "text-rose-600", bg: "bg-rose-500/10" },
          { label: "Late Fees Earned", value: formatINR(filteredLateFees), icon: AlertTriangle, cls: "text-orange-600", bg: "bg-orange-500/10" },
        ].map(({ label, value, icon: Icon, cls, bg }) => (
          <Card key={label} className="border-border/50 bg-card/60 backdrop-blur-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xl font-black ${cls}`}>{loading ? "—" : value}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${bg}`}>
                  <Icon className={`h-5 w-5 ${cls}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Monthly Billing vs. Collection</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="h-48 animate-pulse rounded-xl bg-muted" /> : (
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={monthlyBarData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatINRCompact(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip {...CustomTooltipStyle} formatter={(v: number) => formatINR(v)} />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                  <Bar dataKey="Billed" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Collected" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Overdue" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Payment Channels</CardTitle>
          </CardHeader>
          <CardContent>
            {loading || paymentMethodPie.length === 0 ? (
              <div className="h-48 animate-pulse rounded-xl bg-muted" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={paymentMethodPie} cx="50%" cy="50%" outerRadius={60} paddingAngle={3} dataKey="value">
                      {paymentMethodPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...CustomTooltipStyle} formatter={(v: number) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {paymentMethodPie.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-bold">{formatINRCompact(d.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Filter Banner */}
      {hasActiveFilter && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20 text-sm">
          <Filter className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="flex-1 text-xs">
            Showing <strong>{filteredInvoices.length}</strong> of {invoices.length} invoices —
            Collected: <strong className="text-emerald-600">{formatINR(filteredCollected)}</strong> |
            Outstanding: <strong className="text-amber-600">{formatINR(filteredOutstanding)}</strong>
          </span>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
            <X className="h-3 w-3" /> Clear
          </Button>
        </div>
      )}

      {/* Filters */}
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Filter className="h-3.5 w-3.5" />Filter Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Invoice # or Student ID…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 text-xs" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground font-medium">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Invoice Records</CardTitle>
            <Button variant="outline" size="sm" onClick={exportInvoiceCSV} className="gap-2 h-8 text-xs">
              <Download className="h-3.5 w-3.5" /> Export {filteredInvoices.length} rows
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Late Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading records...</TableCell></TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-20" />
                    No invoices match the current filters.
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.map((inv) => {
                const meta = STATUS_META[inv.status] ?? STATUS_META["DRAFT"];
                const Icon = meta.icon;
                return (
                  <TableRow key={inv.invoiceId} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm font-bold">#{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">#{inv.studentId}</TableCell>
                    <TableCell className="font-bold">{formatINR(Number(inv.totalAmount))}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">{formatINR(Number(inv.paidAmount ?? 0))}</TableCell>
                    <TableCell className="text-rose-600">
                      {Number(inv.lateFeeAmount ?? 0) > 0 ? formatINR(Number(inv.lateFeeAmount)) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border ${meta.cls}`}>
                        <Icon className="h-3 w-3" /> {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.issueDate), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.dueDate), "dd MMM yyyy")}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </motion.div>
  );
}
