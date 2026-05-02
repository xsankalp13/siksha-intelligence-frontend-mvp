import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import EmptyState from "@/features/hrms/components/EmptyState";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { cn } from "@/lib/utils";
import type { OvertimeRecordDTO, OvertimeStatus, CompOffRecordDTO } from "@/services/types/hrms";

const OT_ACCENT: Record<OvertimeStatus, string> = {
  PENDING: "border-l-amber-400",
  APPROVED: "border-l-emerald-500",
  REJECTED: "border-l-red-400",
  PAID: "border-l-blue-500",
  INCLUDED_IN_PAYROLL: "border-l-violet-500",
};

const OT_BADGE: Record<OvertimeStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-300",
  REJECTED: "bg-red-100 text-red-700 border-red-300",
  PAID: "bg-blue-100 text-blue-700 border-blue-300",
  INCLUDED_IN_PAYROLL: "bg-violet-100 text-violet-700 border-violet-300",
};

const PIE_COLORS: Record<OvertimeStatus, string> = {
  APPROVED: "#10b981",
  PAID: "#3b82f6",
  PENDING: "#f59e0b",
  REJECTED: "#ef4444",
  INCLUDED_IN_PAYROLL: "#8b5cf6",
};

// ---- Detail Modal ----

function OvertimeDetailModal({
  record,
  onClose,
  formatCurrency,
  formatDate,
}: {
  record: OvertimeRecordDTO | null;
  onClose: () => void;
  formatCurrency: (n: number) => string;
  formatDate: (d: string) => string;
}) {
  if (!record) return null;
  const badgeCls = OT_BADGE[record.status] ?? "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Overtime Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Work Date", value: formatDate(record.workDate) },
              { label: "Status", value: <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", badgeCls)}>{record.status}</span> },
              { label: "Hours Worked", value: `${record.hoursWorked}h` },
              { label: "OT Type", value: record.compensationType },
              { label: "Multiplier", value: record.multiplier != null ? `${record.multiplier}x` : "—" },
              { label: "Approved Amount", value: record.approvedAmount != null ? formatCurrency(record.approvedAmount) : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-muted/40 p-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {record.reason && (
            <>
              <Separator />
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Reason</p>
                <p className="text-sm">{record.reason}</p>
              </div>
            </>
          )}
          {record.approvedAt && (
            <div>
              <p className="text-xs text-muted-foreground">Approved on {formatDate(record.approvedAt)}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main component ----

export default function TeacherMyOvertime() {
  const qc = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<OvertimeRecordDTO | null>(null);
  const [workDate, setWorkDate] = useState(new Date().toISOString().substring(0, 10));
  const [hours, setHours] = useState("");
  const [overtimeType, setOvertimeType] = useState<string>("HOLIDAY");
  const [reason, setReason] = useState("");

  const { data: overtime = [], isLoading: otLoading } = useQuery({
    queryKey: ["hrms", "self", "overtime"],
    queryFn: () => hrmsService.listMyOvertime().then((r) => r.data),
  });

  const { data: compoff = [], isLoading: coLoading } = useQuery({
    queryKey: ["hrms", "self", "compoff"],
    queryFn: () => hrmsService.listMyCompOff().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!workDate || !hours) throw new Error("Work date and hours are required.");
      return hrmsService.createMyOvertime({ workDate, hoursWorked: parseFloat(hours), compensationType: overtimeType, reason: reason || undefined });
    },
    onSuccess: () => {
      toast.success("Overtime request submitted");
      qc.invalidateQueries({ queryKey: ["hrms", "self", "overtime"] });
      setOpen(false); setWorkDate(new Date().toISOString().substring(0, 10));
      setHours(""); setReason(""); setOvertimeType("HOLIDAY");
    },
    onError: (err) => toast.error(normalizeHrmsError(err)?.message ?? "An unexpected error occurred"),
  });

  const totalHours = overtime.reduce((s: number, o: OvertimeRecordDTO) => s + (o.hoursWorked ?? 0), 0);
  const approvedPayout = overtime
    .filter((o: OvertimeRecordDTO) => o.status === "APPROVED" || o.status === "PAID")
    .reduce((s: number, o: OvertimeRecordDTO) => s + (o.approvedAmount ?? 0), 0);
  const pendingCount = overtime.filter((o: OvertimeRecordDTO) => o.status === "PENDING").length;

  const statusGroups = ["APPROVED", "PAID", "PENDING", "REJECTED"].map((status) => ({
    name: status,
    value: overtime.filter((o: OvertimeRecordDTO) => o.status === status).length,
  })).filter((g) => g.value > 0);

  const barData = overtime.slice(-12).map((o: OvertimeRecordDTO) => ({
    date: new Date(o.workDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    hours: o.hoursWorked ?? 0,
  }));

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              ⏱️
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">My Overtime</h2>
              <p className="text-sm text-white/70">Track overtime hours and comp-off entitlements</p>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="bg-white text-orange-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
          >
            ➕ Request Overtime
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      {overtime.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Entries", value: String(overtime.length), color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "Approved Payout", value: formatCurrency(approvedPayout), color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Pending Approval", value: String(pendingCount), color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
          ].map(({ label, value, color, bg }) => (
            <Card key={label} className={`border ${bg}`}>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("mt-1 text-xl font-bold", color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="overtime">
        <TabsList>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
          <TabsTrigger value="compoff">Comp-Off</TabsTrigger>
        </TabsList>

        <TabsContent value="overtime" className="mt-4 space-y-5">
          {otLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : overtime.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No overtime records"
              description="Submit an overtime request to get started."
              actionLabel="Request Overtime"
              onAction={() => setOpen(true)}
            />
          ) : (
            <>
              {/* Charts */}
              {overtime.length >= 2 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={statusGroups} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                            {statusGroups.map((entry) => (
                              <Cell key={entry.name} fill={PIE_COLORS[entry.name as OvertimeStatus] ?? "#94a3b8"} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Hours (Last 12 Entries)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="hours" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Records list */}
              <div className="space-y-2">
                {overtime.map((o: OvertimeRecordDTO) => {
                  const accentLine = OT_ACCENT[o.status] ?? "border-l-gray-300";
                  const badgeCls = OT_BADGE[o.status] ?? "bg-gray-100 text-gray-600 border-gray-200";
                  return (
                    <Card key={o.uuid} className={cn("border-l-4 cursor-pointer", accentLine)} onClick={() => setSelected(o)}>
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{formatDate(o.workDate)}</p>
                              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", badgeCls)}>{o.status}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {o.compensationType} · {o.hoursWorked}h
                              {o.multiplier != null ? ` · ${o.multiplier}x` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            {o.approvedAmount != null ? (
                              <p className="text-sm font-bold text-emerald-600">{formatCurrency(o.approvedAmount)}</p>
                            ) : null}
                            <Button size="sm" variant="outline" className="mt-1 border-blue-300 text-blue-700 hover:bg-blue-50 h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); setSelected(o); }}>
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="compoff" className="mt-4 space-y-3">
          {coLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : compoff.length === 0 ? (
            <EmptyState icon={Clock} title="No comp-off records" description="Comp-off entitlements will appear here." />
          ) : (
            compoff.map((c: CompOffRecordDTO) => (
              <Card key={c.uuid} className="border-l-4 border-l-blue-400">
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold">{formatDate(c.creditDate)}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.leaveTypeName ?? "Comp-Off"}
                        {c.expiryDate ? ` · Expires ${formatDate(c.expiryDate)}` : ""}
                      </p>
                      {c.remarks && (
                        <p className="text-xs text-muted-foreground italic">{c.remarks}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          c.credited
                            ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                            : "bg-amber-100 text-amber-700 border-amber-300",
                        )}
                      >
                        {c.credited ? "Credited" : "Pending"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Detail modal */}
      <OvertimeDetailModal
        record={selected}
        onClose={() => setSelected(null)}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      {/* Submit dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setWorkDate(new Date().toISOString().substring(0, 10)); setHours(""); setReason(""); setOvertimeType("HOLIDAY"); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Overtime</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Work Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hours Worked <span className="text-destructive">*</span></Label>
                <Input type="number" min={0.5} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Overtime Type</Label>
                <Select value={overtimeType} onValueChange={(v) => setOvertimeType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOLIDAY">Holiday</SelectItem>
                    <SelectItem value="WEEKEND">Weekend</SelectItem>
                    <SelectItem value="EXTENDED_HOURS">Extended Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
