/**
 * ExportMenu
 * -----------
 * Dropdown for exporting dashboard data:
 *   - CSV export of Finance summary / Attendance trend
 *   - Print / save as PDF (browser print dialog, print-friendly styles)
 */
import { useState, useRef, useEffect } from "react";
import { Download, Printer, FileSpreadsheet, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { MasterAnalyticsResponseDTO } from "@/services/dashboard";

// ── CSV helpers ───────────────────────────────────────────────────────
function toCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
    ),
  ];
  return lines.join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ── Component ─────────────────────────────────────────────────────────
interface ExportMenuProps {
  financePayrollData: MasterAnalyticsResponseDTO["financePayrollTrend"];
  attendanceData: MasterAnalyticsResponseDTO["attendanceTrend"];
  revenueMtd?: number;
  outstandingMtd?: number;
  pendingInvoiceCount?: number;
}

export function ExportMenu({
  financePayrollData,
  attendanceData,
  revenueMtd,
  outstandingMtd,
  pendingInvoiceCount,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const exportFinanceCsv = () => {
    const rows = (financePayrollData ?? []).map((p) => ({
      Month: p.month ?? "",
      "Expected (₹)": p.expected ?? 0,
      "Collected (₹)": p.collected ?? 0,
      "Payroll Outflow (₹)": p.payroll ?? 0,
    }));
    downloadCsv(`finance-trend-${todayIso()}.csv`, toCsv(rows));
    setOpen(false);
  };

  const exportAttendanceCsv = () => {
    const rows = (attendanceData ?? []).map((d) => ({
      Date: d.day ?? "",
      "Student Present": d.student ?? 0,
      "Staff Present": d.staff ?? 0,
    }));
    downloadCsv(`attendance-trend-${todayIso()}.csv`, toCsv(rows));
    setOpen(false);
  };

  const exportKpiCsv = () => {
    const rows = [
      {
        Metric: "Revenue MTD (₹)",
        Value: revenueMtd ?? 0,
        "As of": todayIso(),
      },
      {
        Metric: "Outstanding MTD (₹)",
        Value: outstandingMtd ?? 0,
        "As of": todayIso(),
      },
      {
        Metric: "Pending Invoices",
        Value: pendingInvoiceCount ?? 0,
        "As of": todayIso(),
      },
    ];
    downloadCsv(`dashboard-kpis-${todayIso()}.csv`, toCsv(rows));
    setOpen(false);
  };

  const printDashboard = () => {
    setOpen(false);
    window.print();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Export dashboard data"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent/80 hover:shadow"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Export
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-border bg-popover shadow-xl overflow-hidden"
            role="menu"
            aria-label="Export options"
          >
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border">
              Export as CSV
            </div>
            {[
              { label: "KPI Summary", action: exportKpiCsv, icon: FileSpreadsheet },
              { label: "Finance & Payroll Trend", action: exportFinanceCsv, icon: FileSpreadsheet },
              { label: "Attendance Trend (14-day)", action: exportAttendanceCsv, icon: FileSpreadsheet },
            ].map(({ label, action, icon: Icon }) => (
              <button
                key={label}
                onClick={action}
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
            <div className="border-t border-border" />
            <button
              onClick={printDashboard}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              <Printer className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
              Print / Save as PDF
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
