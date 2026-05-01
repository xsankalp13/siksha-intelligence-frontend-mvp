import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Award, Building2, Calendar, CheckCircle2, Clock, FolderOpen, IndianRupee, Loader2, Pencil, TrendingUp, Users, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { cn } from "@/lib/utils";
import CategoryBadge from "./components/CategoryBadge";
import StatusTimeline from "./components/StatusTimeline";

/**
 * Normalise attendance codes from the backend into a canonical status.
 * The backend returns shortCodes (P, A, HD, L, LV, H) from attendanceType.shortCode.
 */
function normalizeAttendanceStatus(raw: string): string {
  const upper = (raw ?? "").toUpperCase().trim();
  // Short code → canonical
  if (upper === "P") return "PRESENT";
  if (upper === "A") return "ABSENT";
  if (upper === "HD" || upper === "H") return "HALF_DAY";
  if (upper === "L" || upper === "LV" || upper === "SL" || upper === "CL" || upper === "EL") return "ON_LEAVE";
  if (upper === "HOLIDAY" || upper === "HOL") return "HOLIDAY";
  // Already a full name — pass through
  if (["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY", "UNMARKED"].includes(upper)) return upper;
  return "UNMARKED";
}



export default function Staff360ProfilePage() {
  const { staffRef } = useParams();
  const navigate = useNavigate();
  const { formatDate, formatCurrency, formatNumber } = useHrmsFormatters();

  const { data, isLoading } = useQuery({
    queryKey: ["hrms", "staff360", staffRef],
    queryFn: () => hrmsService.getStaff360Profile(staffRef!).then((r) => r.data),
    enabled: !!staffRef,
  });

  const { data: bankStatus, isLoading: bankLoading } = useQuery({
    queryKey: ["hrms", "bank-details", staffRef],
    queryFn: () => hrmsService.getStaffBankDetails(staffRef!).then((r) => r.data),
    enabled: !!staffRef,
  });

  // Designation management state
  const queryClient = useQueryClient();
  const [designationEditOpen, setDesignationEditOpen] = useState(false);
  const [selectedDesignationRef, setSelectedDesignationRef] = useState<string>("");
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const { data: allDesignations } = useQuery({
    queryKey: ["hrms", "designations", "active"],
    queryFn: () => hrmsService.listDesignations({ active: true }).then((r) => r.data),
    enabled: designationEditOpen,
  });

  const assignMutation = useMutation({
    mutationFn: (desRef: string) =>
      hrmsService.bulkAssignStaffToDesignation(desRef, { staffRefs: [staffRef!] }),
    onSuccess: (res) => {
      const d = res.data;
      if (d.successCount > 0) {
        toast.success(`Designation updated to ${d.designationName}`);
      } else {
        toast.error(d.errors?.[0] ?? "Failed to assign designation");
      }
      queryClient.invalidateQueries({ queryKey: ["hrms", "staff360", staffRef] });
      setDesignationEditOpen(false);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const unassignMutation = useMutation({
    mutationFn: () =>
      hrmsService.bulkUnassignStaffFromDesignation({ staffRefs: [staffRef!] }),
    onSuccess: () => {
      toast.success("Designation removed");
      queryClient.invalidateQueries({ queryKey: ["hrms", "staff360", staffRef] });
      setRemoveConfirmOpen(false);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  if (isLoading || !data || bankLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
      </div>
    );
  }

  const profile = data;
  const { personal, currentGrade, currentDesignation, salaryStructure, leaveBalance, attendanceSummary, recentPayslips, promotionHistory, loans, overtimes } = profile;
  const fullName = [personal?.firstName, personal?.middleName, personal?.lastName].filter(Boolean).join(" ") || "Unknown Staff";

  const promotionSteps = (promotionHistory || []).map((p, i) => ({
    label: p.proposedDesignationName,
    date: p.effectiveDate,
    status: (p.status === "APPROVED" ? "completed" : i === 0 ? "current" : "pending") as "completed" | "current" | "pending",
    actor: p.approvedByName,
    remarks: p.remarks,
  }));

  return (
    <div className="space-y-6">
      {/* Identity hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl font-bold shadow-inner border border-white/30">
              {(personal?.firstName?.[0] ?? "") + (personal?.lastName?.[0] ?? "")}
            </div>
            <span className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-indigo-700",
              personal?.active ? "bg-emerald-400" : "bg-gray-400"
            )} />
          </div>
          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold truncate">{fullName}</h1>
              {personal?.active && (
                <span className="text-[10px] font-bold bg-emerald-400/20 border border-emerald-300/40 px-2 py-0.5 rounded-full">● Active</span>
              )}
              {personal?.category && <CategoryBadge category={personal.category} />}
            </div>
            <p className="text-sm text-white/70 mt-0.5">
              {currentDesignation?.designationName ?? personal?.jobTitle ?? "—"}&nbsp;·&nbsp;{personal?.employeeId ?? "—"}
              {personal?.department && <>&nbsp;·&nbsp;{personal.department}</>}
            </p>
          </div>
          {/* Actions */}
          <Link to={`/dashboard/admin/hrms/documents?staffRef=${staffRef}`}>
            <Button className="bg-white/20 border border-white/30 text-white hover:bg-white/30 gap-2 backdrop-blur-sm">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
              <span className="text-white/60">({profile.documentCount})</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Grade", value: currentGrade?.gradeName ?? "—", icon: Award },
          { label: "Department", value: personal?.department ?? "—", icon: Building2 },
          { label: "Hire Date", value: personal?.hireDate ? formatDate(personal.hireDate) : "—", icon: Calendar },
          {
            label: "Net Pay",
            value: salaryStructure ? formatCurrency(salaryStructure.netPay) : "—",
            icon: IndianRupee,
          },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="py-4 flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="promotions">Career</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-5">

          {/* Hero profile card */}
          <Card className="overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" />
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                    {(personal?.firstName?.[0] ?? "") + (personal?.lastName?.[0] ?? "")}
                  </div>
                  <span className={cn("absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background", personal?.active ? "bg-emerald-500" : "bg-gray-400")} />
                </div>
                {/* Identity */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold">{fullName}</h2>
                    {personal?.category && <CategoryBadge category={personal.category} />}
                    {personal?.staffType && <Badge variant="outline" className="text-xs">{personal.staffType}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentDesignation?.designationName ?? personal?.jobTitle ?? "—"} &nbsp;·&nbsp;
                    {personal?.employeeId ?? "—"}
                    {personal?.email && <>&nbsp;·&nbsp; {personal.email}</>}
                  </p>
                  {/* Quick pills row */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {[
                      { label: "Hire Date", value: personal?.hireDate ? formatDate(personal.hireDate) : "—" },
                      { label: "Grade", value: currentGrade?.gradeName ?? "—" },
                      { label: "Dept", value: personal?.department ?? "—" },
                      { label: "Net Pay", value: salaryStructure ? formatCurrency(salaryStructure.netPay) : "—" },
                      { label: "Loans", value: String(profile.activeLoans ?? 0) },
                      { label: "Onboarding", value: profile.onboardingStatus ?? "—" },
                    ].map(({ label, value }) => (
                      <span key={label} className="inline-flex items-center gap-1.5 text-xs bg-muted rounded-full px-3 py-1">
                        <span className="text-muted-foreground">{label}:</span>
                        <span className="font-semibold">{value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Personal details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center text-xs">👤</span>
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Gender", value: personal?.gender },
                  { label: "Date of Birth", value: personal?.dateOfBirth ? formatDate(personal.dateOfBirth) : undefined },
                  { label: "Employee ID", value: personal?.employeeId },
                  { label: "Email", value: personal?.email },
                  { label: "Office", value: personal?.officeLocation },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-right">{value ?? "—"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Employment details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center text-xs">🏢</span>
                  Employment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Designation — special row with edit/remove */}
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">Designation</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-right">
                      {currentDesignation?.designationName ?? "—"}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                      title="Edit Designation"
                      onClick={() => {
                        setSelectedDesignationRef(currentDesignation?.uuid ?? "");
                        setDesignationEditOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {currentDesignation && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Remove Designation"
                        onClick={() => setRemoveConfirmOpen(true)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {/* Remaining employment fields */}
                {[
                  { label: "Grade", value: currentGrade?.gradeName },
                  { label: "Department", value: personal?.department },
                  { label: "Staff Type", value: personal?.staffType },
                  { label: "Hire Date", value: personal?.hireDate ? formatDate(personal.hireDate) : undefined },
                  { label: "Onboarding", value: profile.onboardingStatus },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-2 text-sm">
                    <span className="text-muted-foreground shrink-0">{label}</span>
                    <span className="font-medium text-right">{value ?? "—"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">📊</span>
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "CTC (Monthly)", value: salaryStructure ? formatCurrency(salaryStructure.grossPay) : "—", color: "text-blue-600" },
                  { label: "Net Pay", value: salaryStructure ? formatCurrency(salaryStructure.netPay) : "—", color: "text-emerald-600" },
                  { label: "Attendance %", value: attendanceSummary ? `${Number(attendanceSummary.attendancePercentage).toFixed(1)}%` : "—", color: "text-violet-600" },
                  { label: "Leave Balance", value: leaveBalance?.length ? `${leaveBalance.length} types` : "—", color: "" },
                  { label: "Active Loans", value: String(profile.activeLoans ?? 0), color: profile.activeLoans > 0 ? "text-amber-600" : "" },
                  { label: "Documents", value: String(profile.documentCount ?? 0), color: "" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cn("font-bold", color)}>{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Bank Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-rose-100 text-rose-600 flex items-center justify-center text-xs">💳</span>
                  Bank Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!bankStatus?.hasBankDetails && !bankStatus?.hasIfsc ? (
                  <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200">
                    No bank details found.
                  </div>
                ) : (
                  <>
                    {[
                      { label: "Holder", value: bankStatus.accountHolderName },
                      { label: "Bank", value: bankStatus.bankName },
                      { label: "A/C No", value: bankStatus.maskedAccountNumber },
                      { label: "IFSC", value: bankStatus.ifscCode },
                      { label: "Type", value: bankStatus.accountType },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-right font-mono truncate">{value ?? "—"}</span>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Payslips */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-6 w-6 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center text-xs">💰</span>
                  Recent Payslips
                </CardTitle>
                {(recentPayslips || []).length > 0 && (
                  <span className="text-xs text-muted-foreground">Last {recentPayslips.length} months</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {(recentPayslips || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed">
                  <IndianRupee className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">No payslips generated yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Payslips will appear once payroll is processed</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(recentPayslips || []).map((p) => {
                    const statusBg: Record<string, string> = {
                      GENERATED: "bg-emerald-100 text-emerald-700 border-emerald-300",
                      PAID: "bg-blue-100 text-blue-700 border-blue-300",
                      PENDING: "bg-amber-100 text-amber-700 border-amber-300",
                    };
                    return (
                      <div key={p.uuid} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-semibold">{p.payYear}–{String(p.payMonth).padStart(2, "0")}</p>
                          <p className="text-xs text-muted-foreground">Gross: {formatCurrency(p.grossPay)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-emerald-600">{formatCurrency(p.netPay)}</p>
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusBg[p.status] ?? "bg-gray-100 text-gray-600 border-gray-200")}>{p.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>


        {/* Attendance */}
        <TabsContent value="attendance" className="mt-4">
          {attendanceSummary ? (
            <div className="space-y-4">
              {/* KPI strip */}
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Present", value: attendanceSummary.presentDays, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
                  { label: "Absent", value: attendanceSummary.absentDays, color: "text-red-600", bg: "bg-red-50 border-red-200", icon: Users },
                  { label: "On Leave", value: attendanceSummary.leaveDays, color: "text-violet-600", bg: "bg-violet-50 border-violet-200", icon: Calendar },
                  { label: "Attendance %", value: `${Number(attendanceSummary.attendancePercentage).toFixed(1)}%`, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: TrendingUp },
                ].map(({ label, value, color, bg, icon: Icon }) => (
                  <Card key={label} className={`border ${bg}`}>
                    <CardContent className="py-4 flex items-center gap-3">
                      <div className={`rounded-full p-2 ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className={cn("text-2xl font-bold", color)}>{value}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Attendance distribution chart */}
              {(attendanceSummary.presentDays + attendanceSummary.absentDays + attendanceSummary.leaveDays) > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance Distribution</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Present", value: attendanceSummary.presentDays, fill: "#10b981" },
                                { name: "Absent", value: attendanceSummary.absentDays, fill: "#ef4444" },
                                { name: "On Leave", value: attendanceSummary.leaveDays, fill: "#8b5cf6" },
                              ].filter(d => d.value > 0)}
                              cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                              paddingAngle={3} dataKey="value"
                            >
                              {["#10b981","#ef4444","#8b5cf6"].map((c, i) => <Cell key={i} fill={c} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Work Hours (Last 30 Days)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={(() => {
                              const recordMap = new Map<string, string>();
                              (attendanceSummary.dailyRecords || []).forEach(r => {
                                recordMap.set(r.date.slice(0, 10), normalizeAttendanceStatus(r.status));
                              });
                              const days = [];
                              const now = new Date();
                              for (let i = 29; i >= 0; i--) {
                                const d = new Date(now);
                                d.setDate(now.getDate() - i);
                                const key = d.toISOString().slice(0, 10);
                                const status = recordMap.get(key) ?? "UNMARKED";
                                days.push({
                                  date: d.getDate(),
                                  hours: status === "PRESENT" ? 8 : status === "HALF_DAY" ? 4 : 0,
                                  fill: status === "PRESENT" ? "#3b82f6" : status === "HALF_DAY" ? "#f59e0b" : "#e5e7eb",
                                });
                              }
                              return days;
                            })()}
                            margin={{ top: 4, right: 8, left: -28, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} interval={4} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} domain={[0, 10]} />
                            <Tooltip
                              formatter={(v: number) => [`${v}h`, "Hours"]}
                              contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                            />
                            <Bar dataKey="hours" radius={[3, 3, 0, 0]} name="Hours">
                              {(() => {
                                const recordMap = new Map<string, string>();
                                (attendanceSummary.dailyRecords || []).forEach(r => recordMap.set(r.date.slice(0, 10), normalizeAttendanceStatus(r.status)));
                                const cells = [];
                                const now = new Date();
                                for (let i = 29; i >= 0; i--) {
                                  const d = new Date(now);
                                  d.setDate(now.getDate() - i);
                                  const key = d.toISOString().slice(0, 10);
                                  const status = recordMap.get(key) ?? "UNMARKED";
                                  const fill = status === "PRESENT" ? "#3b82f6" : status === "HALF_DAY" ? "#f59e0b" : "#e5e7eb";
                                  cells.push(<Cell key={key} fill={fill} />);
                                }
                                return cells;
                              })()}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center">
                        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />Full Day (8h)</span>
                        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />Half Day (4h)</span>
                        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-gray-200 border" />Absent / Unmarked</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Heatmap calendar */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Attendance Heatmap — {attendanceSummary.periodLabel}</CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {[{c:"bg-emerald-500",l:"Present"},{c:"bg-red-400",l:"Absent"},{c:"bg-violet-400",l:"Leave"},{c:"bg-amber-400",l:"Half Day"},{c:"bg-gray-200",l:"Unmarked"}].map(({c,l}) => (
                        <span key={l} className="flex items-center gap-1"><span className={`inline-block h-3 w-3 rounded-sm ${c}`}/>{l}</span>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      // Build a lookup map: "YYYY-MM-DD" -> status
                      const statusMap = new Map<string, string>();
                      (attendanceSummary.dailyRecords || []).forEach(r => {
                        const key = r.date.slice(0, 10); // normalize to YYYY-MM-DD
                        statusMap.set(key, normalizeAttendanceStatus(r.status));
                      });
                      // Generate all 30 days in reverse (oldest → newest)
                      const days: { dateStr: string; date: Date; status: string }[] = [];
                      const today = new Date();
                      for (let i = 29; i >= 0; i--) {
                        const d = new Date(today);
                        d.setDate(today.getDate() - i);
                        const key = d.toISOString().slice(0, 10);
                        days.push({ dateStr: key, date: d, status: statusMap.get(key) ?? "UNMARKED" });
                      }
                      return days.map(({ dateStr, date, status }) => (
                        <div key={dateStr} className="flex flex-col items-center gap-0.5">
                          <div
                            title={`${dateStr}: ${status}`}
                            className={cn(
                              "h-8 w-8 rounded-md flex items-center justify-center text-[10px] font-semibold cursor-default transition-transform hover:scale-110 shadow-sm",
                              status === "PRESENT" ? "bg-emerald-500 text-white" :
                              status === "ABSENT" ? "bg-red-400 text-white" :
                              status === "ON_LEAVE" ? "bg-violet-400 text-white" :
                              status === "HALF_DAY" ? "bg-amber-400 text-white" :
                              status === "HOLIDAY" ? "bg-blue-300 text-white" :
                              "bg-gray-100 text-gray-400 border border-gray-200"
                            )}
                          >
                            {date.getDate()}
                          </div>
                          <span className="text-[8px] text-muted-foreground">{["Su","Mo","Tu","We","Th","Fr","Sa"][date.getDay()]}</span>
                        </div>
                      ));
                    })()}
                  </div>
                  {(attendanceSummary.dailyRecords || []).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">No attendance recorded yet</p>
                      <p className="text-xs text-muted-foreground">Records will appear here once attendance is marked</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
              <Calendar className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-base font-semibold text-muted-foreground">No Attendance Data</p>
              <p className="text-sm text-muted-foreground mt-1">Attendance records haven't been set up for this staff member yet.</p>
            </div>
          )}
        </TabsContent>

        {/* Leaves */}
        <TabsContent value="leaves" className="mt-4">
          {(leaveBalance || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No leave balance data.</p>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Leave Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={(leaveBalance || []).map(b => ({
                          name: b.leaveTypeCode || b.leaveTypeName,
                          Used: b.used,
                          Remaining: b.remaining,
                          Quota: b.totalQuota
                        }))}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                        <Tooltip 
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
                          contentStyle={{ backgroundColor: "hsl(var(--background))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                        <Bar dataKey="Used" stackId="a" fill="#f59e0b" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="Remaining" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(leaveBalance || []).map((b) => (
                  <Card key={b.balanceId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{b.leaveTypeName}</CardTitle>
                      <p className="text-xs text-muted-foreground">{b.academicYear}</p>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Quota</span>
                        <span>{formatNumber(b.totalQuota)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Used</span>
                        <span className="text-amber-600">{formatNumber(b.used)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-muted-foreground font-medium">Remaining</span>
                        <span className="font-bold text-green-600">{formatNumber(b.remaining)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Salary */}
        <TabsContent value="salary" className="mt-4">
          {salaryStructure ? (
            <div className="space-y-4">
              {/* KPI strip */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "CTC (Annual)", value: formatCurrency((salaryStructure.grossPay ?? 0) * 12), color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
                  { label: "Gross Pay", value: formatCurrency(salaryStructure.grossPay), color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
                  { label: "Total Deductions", value: formatCurrency(salaryStructure.totalDeductions), color: "text-red-600", bg: "bg-red-50 border-red-200" },
                  { label: "Net Pay / Month", value: formatCurrency(salaryStructure.netPay), color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
                ].map(({ label, value, color, bg }) => (
                  <Card key={label} className={`border ${bg}`}>
                    <CardContent className="py-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={cn("text-xl font-bold mt-1", color)}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts + breakdown */}
              <div className="grid gap-4 md:grid-cols-5">
                {/* Salary pie */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Pay Composition</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Net Pay", value: salaryStructure.netPay, fill: "#7c3aed" },
                              { name: "Deductions", value: salaryStructure.totalDeductions, fill: "#ef4444" },
                            ]}
                            cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                            paddingAngle={3} dataKey="value"
                          >
                            <Cell fill="#7c3aed" />
                            <Cell fill="#ef4444" />
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Earnings + Deductions breakdown */}
                <div className="md:col-span-3 grid gap-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-emerald-600">Earnings</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {(salaryStructure.earnings || []).map((e) => (
                        <div key={e.componentCode}>
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="text-muted-foreground">{e.componentName}</span>
                            <span className="font-medium">{formatCurrency(e.computedAmount)}</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(100, (e.computedAmount / (salaryStructure.grossPay || 1)) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between font-semibold text-sm">
                        <span>Gross Pay</span>
                        <span className="text-emerald-600">{formatCurrency(salaryStructure.grossPay)}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm text-red-600">Deductions</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {(salaryStructure.deductions || []).map((d) => (
                        <div key={d.componentCode}>
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="text-muted-foreground">{d.componentName}</span>
                            <span className="font-medium text-red-600">{formatCurrency(d.computedAmount)}</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, (d.computedAmount / (salaryStructure.grossPay || 1)) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between font-bold text-sm">
                        <span>Total Deductions</span>
                        <span className="text-red-600">{formatCurrency(salaryStructure.totalDeductions)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Payslip history chart */}
              {(recentPayslips || []).length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Net Pay History</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[...(recentPayslips || [])].reverse().map(p => ({
                            month: `${p.payYear}-${String(p.payMonth).padStart(2, "0")}`,
                            netPay: p.netPay,
                            grossPay: p.grossPay,
                          }))}
                          margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                          <Bar dataKey="grossPay" fill="#10b981" radius={[3, 3, 0, 0]} name="Gross" />
                          <Bar dataKey="netPay" fill="#7c3aed" radius={[3, 3, 0, 0]} name="Net" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
              <IndianRupee className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-base font-semibold text-muted-foreground">No Salary Mapping Found</p>
              <p className="text-sm text-muted-foreground mt-1">This staff member hasn't been assigned a salary template yet.</p>
            </div>
          )}
        </TabsContent>

        {/* Career / Promotions */}
        <TabsContent value="promotions" className="mt-4">
          {promotionSteps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
              <Award className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-base font-semibold text-muted-foreground">No Promotion History</p>
              <p className="text-sm text-muted-foreground mt-1">This staff member hasn't had any promotions recorded yet.</p>
            </div>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-sm">Promotion History</CardTitle></CardHeader>
              <CardContent>
                <StatusTimeline steps={promotionSteps} direction="vertical" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Loans */}
        <TabsContent value="loans" className="mt-4">
          {(loans || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
              <IndianRupee className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-base font-semibold text-muted-foreground">No Loan Records</p>
              <p className="text-sm text-muted-foreground mt-1">This staff member has no loan history on record.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Aggregate KPI strip */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Total Borrowed",
                    value: formatCurrency(loans.reduce((s, l) => s + (l.principalAmount ?? 0), 0)),
                    color: "text-blue-600", bg: "bg-blue-50 border-blue-200",
                  },
                  {
                    label: "Active Loans",
                    value: String(loans.filter(l => l.status === "ACTIVE" || l.status === "APPROVED").length),
                    color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200",
                  },
                  {
                    label: "Monthly EMI Outflow",
                    value: formatCurrency(loans.filter(l => l.status === "ACTIVE").reduce((s, l) => s + (l.emiAmount ?? 0), 0)),
                    color: "text-amber-600", bg: "bg-amber-50 border-amber-200",
                  },
                  {
                    label: "Closed / Settled",
                    value: String(loans.filter(l => l.status === "CLOSED").length),
                    color: "text-gray-600", bg: "bg-gray-50 border-gray-200",
                  },
                ].map(({ label, value, color, bg }) => (
                  <Card key={label} className={`border ${bg}`}>
                    <CardContent className="py-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={cn("text-xl font-bold mt-1", color)}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Individual loan cards */}
              {(loans || []).map((loan) => {
                const emisPaid = (loan.emiCount ?? 0) - (loan.remainingEmis ?? 0);
                const paidPct = loan.emiCount ? Math.round((emisPaid / loan.emiCount) * 100) : 0;
                const loanOutstanding = (loan.approvedAmount ?? loan.principalAmount) - (emisPaid * (loan.emiAmount ?? 0));
                const statusStyles: Record<string, string> = {
                  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-300",
                  APPROVED: "bg-blue-100 text-blue-700 border-blue-300",
                  CLOSED: "bg-gray-100 text-gray-600 border-gray-200",
                  PENDING: "bg-amber-100 text-amber-700 border-amber-300",
                  REJECTED: "bg-red-100 text-red-700 border-red-300",
                  CANCELLED: "bg-red-100 text-red-700 border-red-300",
                };
                const badgeCls = statusStyles[loan.status] ?? "bg-gray-100 text-gray-600";
                const barColor = loan.status === "CLOSED" ? "bg-gray-400" : paidPct >= 75 ? "bg-emerald-500" : paidPct >= 40 ? "bg-amber-500" : "bg-red-400";

                return (
                  <Card key={loan.uuid} className="overflow-hidden">
                    {/* Coloured top accent bar */}
                    <div className={cn("h-1", loan.status === "ACTIVE" ? "bg-emerald-500" : loan.status === "APPROVED" ? "bg-blue-500" : loan.status === "CLOSED" ? "bg-gray-300" : "bg-amber-400")} />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{loan.loanType}</CardTitle>
                          {loan.disbursedAt && <p className="text-xs text-muted-foreground mt-0.5">Disbursed on {formatDate(loan.disbursedAt)}</p>}
                        </div>
                        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeCls}`}>{loan.status}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Metrics grid */}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: "Principal", value: formatCurrency(loan.principalAmount), highlight: "" },
                          { label: "Approved Amount", value: loan.approvedAmount != null ? formatCurrency(loan.approvedAmount) : "—", highlight: "" },
                          { label: "EMI / Month", value: loan.emiAmount != null ? formatCurrency(loan.emiAmount) : "—", highlight: "text-amber-600" },
                          { label: "Interest Rate", value: `${loan.interestRate}% p.a.`, highlight: "" },
                          { label: "Total EMIs", value: String(loan.emiCount ?? "—"), highlight: "" },
                          { label: "EMIs Paid", value: String(emisPaid), highlight: "text-emerald-600" },
                          { label: "EMIs Remaining", value: String(loan.remainingEmis ?? "—"), highlight: "text-rose-600" },
                          { label: "Outstanding Balance", value: loanOutstanding > 0 ? formatCurrency(Math.max(0, loanOutstanding)) : "—", highlight: "text-rose-600" },
                        ].map(({ label, value, highlight }) => (
                          <div key={label} className="bg-muted/40 rounded-lg p-3">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                            <p className={cn("text-sm font-bold mt-0.5", highlight)}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* EMI repayment progress */}
                      {loan.emiCount && loan.emiCount > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium">Repayment Progress</span>
                            <span className={cn("font-bold", paidPct >= 75 ? "text-emerald-600" : paidPct >= 40 ? "text-amber-600" : "text-rose-600")}>{paidPct}% complete</span>
                          </div>
                          <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", barColor)}
                              style={{ width: `${paidPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{emisPaid} paid</span>
                            <span>{loan.remainingEmis ?? 0} remaining</span>
                          </div>
                        </div>
                      )}

                      {/* EMI donut + remarks row */}
                      {loan.emiCount && loan.emiCount > 0 && (
                        <div className="flex items-center gap-4">
                          <div className="w-[100px] h-[100px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={[
                                  { name: "Paid", value: emisPaid, fill: "#10b981" },
                                  { name: "Remaining", value: loan.remainingEmis ?? 0, fill: "#e5e7eb" },
                                ]} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>
                                  <Cell fill="#10b981" />
                                  <Cell fill="#e5e7eb" />
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 text-sm space-y-1">
                            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" /><span className="text-muted-foreground">{emisPaid} EMIs paid</span></div>
                            <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-gray-200 border border-gray-300 shrink-0" /><span className="text-muted-foreground">{loan.remainingEmis ?? 0} EMIs remaining</span></div>
                            {loan.remarks && <p className="text-xs text-muted-foreground pt-1 border-t">{loan.remarks}</p>}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Overtime */}
        <TabsContent value="overtime" className="mt-4">
          {(overtimes || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
              <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-base font-semibold text-muted-foreground">No Overtime Records</p>
              <p className="text-sm text-muted-foreground mt-1">No overtime has been recorded in the last 12 months.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* KPI strip */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total Entries", value: String(overtimes.length), color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
                  { label: "Total Hours", value: `${overtimes.reduce((s, o) => s + (o.hoursWorked ?? 0), 0).toFixed(1)}h`, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
                  { label: "Approved Payout", value: formatCurrency(overtimes.filter(o => o.status === "APPROVED" || o.status === "PAID").reduce((s, o) => s + (o.approvedAmount ?? 0), 0)), color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
                  { label: "Pending Approval", value: String(overtimes.filter(o => o.status === "PENDING").length), color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
                ].map(({ label, value, color, bg }) => (
                  <Card key={label} className={`border ${bg}`}>
                    <CardContent className="py-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={cn("text-xl font-bold mt-1", color)}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Status breakdown pie */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Status Breakdown</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "Approved", value: overtimes.filter(o => o.status === "APPROVED").length, fill: "#10b981" },
                              { name: "Pending", value: overtimes.filter(o => o.status === "PENDING").length, fill: "#f59e0b" },
                              { name: "Paid", value: overtimes.filter(o => o.status === "PAID").length, fill: "#3b82f6" },
                              { name: "Rejected", value: overtimes.filter(o => o.status === "REJECTED").length, fill: "#ef4444" },
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                          >
                            {["#10b981","#f59e0b","#3b82f6","#ef4444"].map((c, i) => <Cell key={i} fill={c} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Hours bar chart */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Hours Worked Over Time</CardTitle></CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={overtimes.slice(-12).map(o => ({
                            date: new Date(o.workDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
                            hours: o.hoursWorked,
                            payout: o.approvedAmount ?? 0,
                          }))}
                          margin={{ top: 4, right: 8, left: -28, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                          <Bar dataKey="hours" fill="#7c3aed" radius={[3, 3, 0, 0]} name="Hours" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Individual overtime records */}
              <div className="space-y-2">
                {(overtimes || []).map((o) => {
                  const badgeStyles: Record<string, string> = {
                    APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-300",
                    PENDING: "bg-amber-100 text-amber-700 border-amber-300",
                    REJECTED: "bg-red-100 text-red-700 border-red-300",
                    PAID: "bg-blue-100 text-blue-700 border-blue-300",
                  };
                  const badge = badgeStyles[o.status] ?? "bg-gray-100 text-gray-600";
                  const accentLine = o.status === "APPROVED" ? "border-l-emerald-500" : o.status === "PAID" ? "border-l-blue-500" : o.status === "REJECTED" ? "border-l-red-400" : "border-l-amber-400";

                  return (
                    <Card key={o.uuid} className={cn("border-l-4", accentLine)}>
                      <CardContent className="py-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Work Date</p>
                              <p className="font-semibold">{formatDate(o.workDate)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Hours</p>
                              <p className="font-semibold">{o.hoursWorked}h</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Type</p>
                              <p className="font-semibold">{o.compensationType}</p>
                            </div>
                            {o.multiplier != null && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Multiplier</p>
                                <p className="font-semibold text-violet-600">{o.multiplier}×</p>
                              </div>
                            )}
                            {o.approvedAmount != null && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Payout</p>
                                <p className="font-semibold text-emerald-600">{formatCurrency(o.approvedAmount)}</p>
                              </div>
                            )}
                            {o.approvedAt && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Approved On</p>
                                <p className="font-semibold">{formatDate(o.approvedAt)}</p>
                              </div>
                            )}
                            {o.reason && (
                              <div className="sm:col-span-4">
                                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reason</p>
                                <p className="text-xs text-muted-foreground">{o.reason}</p>
                              </div>
                            )}
                          </div>
                          <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${badge}`}>{o.status}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Edit Designation Dialog ── */}
      <Dialog open={designationEditOpen} onOpenChange={setDesignationEditOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="relative bg-gradient-to-r from-violet-500 to-purple-600 px-6 pt-6 pb-5 text-white">
            <div className="pointer-events-none absolute -top-8 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-white text-lg flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                Change Designation
              </DialogTitle>
              <DialogDescription className="text-white/75 text-sm">
                Select a new designation for <strong>{fullName}</strong>. If the designation has a default salary template and this staff has no existing salary, it will be auto-provisioned.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Designation</label>
              <Select
                value={selectedDesignationRef}
                onValueChange={setSelectedDesignationRef}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a designation…" />
                </SelectTrigger>
                <SelectContent>
                  {(allDesignations ?? []).map((d) => (
                    <SelectItem key={d.uuid} value={d.uuid!}>
                      <div className="flex items-center gap-2">
                        <span>{d.designationName}</span>
                        <span className="text-muted-foreground text-xs">({d.designationCode})</span>
                        {d.defaultSalaryTemplateName && (
                          <Badge variant="outline" className="text-[9px] h-[16px] ml-1 text-emerald-600 border-emerald-300">
                            <IndianRupee className="h-2 w-2 mr-0.5" />
                            {d.defaultSalaryTemplateName}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="px-6 pb-5 pt-0">
            <Button variant="outline" onClick={() => setDesignationEditOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedDesignationRef || assignMutation.isPending}
              onClick={() => assignMutation.mutate(selectedDesignationRef)}
              className="gap-1.5 shadow-md"
            >
              {assignMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Update Designation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Designation Confirmation ── */}
      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
          <div className="relative bg-gradient-to-r from-red-500 to-rose-600 px-6 pt-6 pb-5 text-white">
            <div className="pointer-events-none absolute -top-8 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-white text-lg">Remove Designation</DialogTitle>
              <DialogDescription className="text-white/75 text-sm">
                Are you sure you want to remove <strong>{currentDesignation?.designationName}</strong> from <strong>{fullName}</strong>?
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-4 text-sm text-muted-foreground">
            <p>
              The job title will revert to the staff type. <strong className="text-foreground">Existing salary mappings will be preserved.</strong>
            </p>
          </div>
          <DialogFooter className="px-6 pb-5 pt-0">
            <Button variant="outline" onClick={() => setRemoveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={unassignMutation.isPending}
              onClick={() => unassignMutation.mutate()}
              className="gap-1.5"
            >
              {unassignMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
