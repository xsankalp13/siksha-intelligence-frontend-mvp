import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Download, Filter, BarChart3, TrendingUp, TrendingDown, FileSpreadsheet,
  CheckCircle2, Clock, AlertTriangle, X, FileText, CreditCard
} from "lucide-react";
import { toast } from "sonner";

import type { InvoiceResponseDTO, PaymentResponseDTO, AdminDashboardSummaryDTO } from "@/services/types/finance";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReportsTabProps {
  invoices: InvoiceResponseDTO[];
  payments: PaymentResponseDTO[];
  summary: AdminDashboardSummaryDTO | null;
  loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PAID: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-700", icon: CheckCircle2 },
  PENDING: { label: "Pending", cls: "bg-amber-500/10 text-amber-700", icon: Clock },
  OVERDUE: { label: "Overdue", cls: "bg-red-500/10 text-red-700", icon: AlertTriangle },
  CANCELLED: { label: "Cancelled", cls: "bg-muted text-muted-foreground", icon: X },
  DRAFT: { label: "Draft", cls: "bg-blue-500/10 text-blue-700", icon: FileText },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META["DRAFT"];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

// ─── CSV Utility ──────────────────────────────────────────────────────────────

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (val: string | number) => {
    const str = String(val ?? "");
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportsTab({ invoices, payments, summary, loading }: ReportsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // ── Filtered Invoices ──
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchStatus = statusFilter === "ALL" || inv.status === statusFilter;
      const matchSearch =
        !searchTerm ||
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(inv.studentId).includes(searchTerm);
      const invoiceDate = new Date(inv.issueDate);
      const matchFrom = !dateFrom || invoiceDate >= new Date(dateFrom);
      const matchTo = !dateTo || invoiceDate <= new Date(dateTo);
      return matchStatus && matchSearch && matchFrom && matchTo;
    });
  }, [invoices, statusFilter, searchTerm, dateFrom, dateTo]);

  // ── Computed Stats ──
  const filteredCollected = useMemo(
    () => filteredInvoices
      .filter((i) => i.status === "PAID")
      .reduce((acc, i) => acc + Number(i.totalAmount), 0),
    [filteredInvoices]
  );
  const filteredOutstanding = useMemo(
    () => filteredInvoices
      .filter((i) => i.status === "PENDING" || i.status === "OVERDUE")
      .reduce((acc, i) => acc + Number(i.totalAmount), 0),
    [filteredInvoices]
  );

  // ── Export Invoice CSV ──
  const exportInvoiceCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export with current filters");
      return;
    }
    const headers = [
      "Invoice Number", "Student ID", "Total Amount (₹)", "Paid Amount (₹)",
      "Late Fee (₹)", "Status", "Issue Date", "Due Date"
    ];
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNumber,
      inv.studentId,
      inv.totalAmount,
      inv.paidAmount ?? 0,
      inv.lateFeeAmount ?? 0,
      inv.status,
      inv.issueDate,
      inv.dueDate,
    ]);
    const ts = format(new Date(), "yyyy-MM-dd");
    downloadCSV(`edusync-invoices-${ts}.csv`, headers, rows);
    toast.success(`Exported ${filteredInvoices.length} invoice records`);
  };

  // ── Export Payments CSV ──
  const exportPaymentsCSV = () => {
    if (payments.length === 0) {
      toast.error("No payment records to export");
      return;
    }
    const headers = [
      "Payment ID", "Invoice ID", "Student ID", "Amount Paid (₹)",
      "Method", "Status", "Transaction Ref", "Payment Date", "Notes"
    ];
    const rows = payments.map((p) => [
      p.paymentId,
      p.invoiceId,
      p.studentId,
      p.amountPaid,
      p.paymentMethod,
      p.status,
      p.transactionId ?? "",
      p.paymentDate ? format(new Date(p.paymentDate), "yyyy-MM-dd HH:mm") : "",
      p.notes ?? "",
    ]);
    const ts = format(new Date(), "yyyy-MM-dd");
    downloadCSV(`edusync-payments-${ts}.csv`, headers, rows);
    toast.success(`Exported ${payments.length} payment records`);
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilter = statusFilter !== "ALL" || searchTerm || dateFrom || dateTo;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/50 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-sm">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Financial Reports & Export
          </h3>
          <p className="text-sm text-muted-foreground">
            Filter, analyze, and export financial data as CSV.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPaymentsCSV} className="gap-2">
            <CreditCard className="h-4 w-4" /> Export Payments
          </Button>
          <Button onClick={exportInvoiceCSV} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Export Invoices
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {summary ? formatINR(Number(summary.totalCollected)) : "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">Total Collected</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {summary ? formatINR(Number(summary.totalOutstanding)) : "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">Outstanding</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {summary ? formatINR(Number(summary.totalOverdue)) : "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">Overdue</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{filteredInvoices.length}</p>
                <p className="text-sm text-muted-foreground mt-0.5">Filtered Invoices</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtered summary */}
      {hasActiveFilter && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20 text-sm">
          <Filter className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1">
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filter Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Search by Invoice# or Student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
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
              <label className="text-xs text-muted-foreground">From Date</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To Date</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Invoice Records</CardTitle>
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
                <TableHead>Student ID</TableHead>
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
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-20" />
                    No invoices match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((inv) => (
                  <TableRow key={inv.invoiceId} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-sm font-medium">#{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-mono text-sm">#{inv.studentId}</TableCell>
                    <TableCell className="font-semibold">{formatINR(Number(inv.totalAmount))}</TableCell>
                    <TableCell className="text-emerald-600 font-medium">
                      {formatINR(Number(inv.paidAmount ?? 0))}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {Number(inv.lateFeeAmount ?? 0) > 0
                        ? formatINR(Number(inv.lateFeeAmount))
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(inv.issueDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(inv.dueDate), "dd MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
