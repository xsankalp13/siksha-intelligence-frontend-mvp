import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  AlertTriangle,
  Briefcase,
  Building,
  Calendar,
  Clock,
  CreditCard,
  GraduationCap,
  Globe,
  Heart,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Shield,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { useTeacherProfileData } from "@/features/teacher/queries/useTeacherProfileData";
import { IdCardPreview } from "@/features/uis/id-card/IdCardPreview";
import { idCardService, triggerBlobDownload } from "@/services/idCard";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TeacherScheduleEntry } from "@/services/types/teacher";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function computeTenure(hireDateStr: string) {
  const hire = new Date(hireDateStr);
  const now = new Date();
  const diffMs = now.getTime() - hire.getTime();
  const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years}y ${months}m`;
}

function formatSerializedList(value?: string | null): string | undefined {
  if (!value) return undefined;

  const normalize = (input: unknown): string[] => {
    if (Array.isArray(input)) {
      return input.flatMap((item) => normalize(item));
    }

    if (typeof input !== "string") return [];

    const raw = input.trim();
    if (!raw) return [];

    // Handles payloads like ["[\"PhD\"]"] or "[\"Physics\"]" recursively.
    if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("\"") && raw.endsWith("\""))) {
      try {
        return normalize(JSON.parse(raw));
      } catch {
        // Fall through to cleaning as plain text.
      }
    }

    const cleaned = raw
      .replace(/\\"/g, '"')
      .replace(/^[[\]"'`\s]+|[[\]"'`\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned ? [cleaned] : [];
  };

  const deduped = [...new Set(normalize(value))];
  return deduped.length > 0 ? deduped.join(", ") : undefined;
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const SUBJECT_COLORS = [
  "hsl(220, 70%, 55%)",
  "hsl(152, 57%, 50%)",
  "hsl(35, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(190, 70%, 50%)",
];

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

type WeeklyBarPoint = {
  day: string;
  value: number;
  isToday: boolean;
};

function ServiceUnreachableState() {
  return (
    <div className="h-full min-h-[220px] rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 text-center">
      <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-rose-600" />
      <p className="text-sm text-muted-foreground">This widget is currently unavailable.</p>
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { label: string; value: number } }> }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow">
      <p>{`${point.label}: ${point.value} period${point.value === 1 ? "" : "s"}`}</p>
    </div>
  );
}

function WeeklyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs shadow">
      <p>{`${label}: ${Number(payload[0]?.value ?? 0).toFixed(1)}h`}</p>
    </div>
  );
}

export default function TeacherProfilePage() {
  const queryClient = useQueryClient();
  const reduce = useReducedMotion();
  const { profile, classes, schedule, leaveBalance, attendance, isLoading, isError } = useTeacherProfileData();

  const bp = profile?.basicProfile;
  const staff = profile?.staffDetails;
  const teacher = staff?.teacherDetails;
  const sensitiveInfo = profile?.sensitiveInfo;
  const addresses = profile?.addresses ?? [];

  const fullName =
    [bp?.firstName, bp?.middleName, bp?.lastName].filter(Boolean).join(" ") || bp?.username || "Teacher";

  const profileUrl = bp?.profileUrl ?? staff?.profileUrl;

  const weeklyTeachingHours = useMemo(() => {
    if (!schedule?.entries) return 0;
    return schedule.entries
      .filter((entry: TeacherScheduleEntry) => entry.slotType === "TEACHING")
      .reduce(
        (sum: number, entry: TeacherScheduleEntry) =>
          sum + (toMinutes(entry.timeslot.endTime) - toMinutes(entry.timeslot.startTime)) / 60,
        0,
      );
  }, [schedule?.entries]);

  const totalStudents = useMemo(
    () => classes.reduce((sum, c) => sum + (c.studentCount ?? 0), 0),
    [classes],
  );

  const teachingEntries = useMemo(
    () => (schedule?.entries ?? []).filter((entry: TeacherScheduleEntry) => entry.slotType === "TEACHING"),
    [schedule?.entries],
  );

  const subjectData = useMemo(() => {
    const map = new Map<string, number>();
    teachingEntries.forEach((entry: TeacherScheduleEntry) => {
      const name = entry.subject?.subjectName ?? "Unassigned";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [teachingEntries]);

  const weeklyBarData = useMemo<WeeklyBarPoint[]>(() => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return DAY_ORDER.map((day, index) => {
      const value = teachingEntries
        .filter((entry: TeacherScheduleEntry) => entry.dayOfWeek === day)
        .reduce(
          (sum: number, entry: TeacherScheduleEntry) =>
            sum + Math.max(0, (toMinutes(entry.timeslot.endTime) - toMinutes(entry.timeslot.startTime)) / 60),
          0,
        );
      return {
        day: labels[index],
        value: Number(value.toFixed(2)),
        isToday: day === today,
      };
    });
  }, [teachingEntries]);

  const hasSensitiveIds = Boolean(
    sensitiveInfo?.aadhaarNumber ||
      sensitiveInfo?.panNumber ||
      sensitiveInfo?.passportNumber ||
      sensitiveInfo?.apaarId,
  );

  const hasBankInfo = Boolean(sensitiveInfo?.bankName || sensitiveInfo?.bankAccountNumber);
  const hasEmergencyContact = Boolean(sensitiveInfo?.emergencyContactName);
  const formattedSpecializations = formatSerializedList(teacher?.specializations);
  const formattedCertifications = formatSerializedList(teacher?.certifications);

  const insights = useMemo(() => {
    const items: string[] = [];
    if (schedule?.entries) {
      const teachingOnly = schedule.entries.filter((entry: TeacherScheduleEntry) => entry.slotType === "TEACHING");
      const uniqueClasses = new Set(
        teachingOnly
          .map((entry: TeacherScheduleEntry) =>
            entry.clazz?.className && entry.section?.sectionName
              ? `${entry.clazz.className}-${entry.section.sectionName}`
              : null,
          )
          .filter(Boolean),
      );
      items.push(`You teach ${teachingOnly.length} periods across ${uniqueClasses.size} class sections this week`);

      const dayMap = new Map<string, number>();
      teachingOnly.forEach((entry: TeacherScheduleEntry) => {
        dayMap.set(entry.dayOfWeek, (dayMap.get(entry.dayOfWeek) ?? 0) + 1);
      });
      const busiest = [...dayMap.entries()].sort((a, b) => b[1] - a[1])[0];
      if (busiest) {
        items.push(
          `Your busiest day is ${busiest[0].charAt(0) + busiest[0].slice(1).toLowerCase()} with ${busiest[1]} periods`,
        );
      }
    }
    if (classes.length > 0) {
      items.push(
        `You are assigned to ${classes.length} class${classes.length > 1 ? "es" : ""} with ${totalStudents} total students`,
      );
    }
    if (leaveBalance.length > 0) {
      const remaining = leaveBalance.reduce((sum, item) => sum + Number(item.remaining ?? 0), 0);
      items.push(`You currently have ${remaining} leave day${remaining === 1 ? "" : "s"} remaining`);
    }
    return items;
  }, [schedule, classes, totalStudents, leaveBalance]);

  const quickStats = [
    {
      label: "Weekly Hours",
      value: `${weeklyTeachingHours.toFixed(1)}h`,
      icon: Clock,
      iconClass: "text-primary",
    },
    {
      label: "Classes",
      value: String(classes.length),
      icon: GraduationCap,
      iconClass: "text-indigo-600",
    },
    {
      label: "Students",
      value: String(totalStudents),
      icon: User,
      iconClass: "text-amber-600",
    },
    {
      label: "Attendance",
      value: attendance?.attendancePercentage != null ? `${attendance.attendancePercentage.toFixed(1)}%` : "N/A",
      icon: Calendar,
      iconClass: "text-emerald-600",
    },
  ];

  const retry = async () => {
    await queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 pb-10">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="mb-3 h-10 w-10 text-rose-600" />
        <h2 className="text-xl font-semibold">Unable to load profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">Please retry. Other modules are unaffected.</p>
        <Button className="mt-4" onClick={retry}>
          <RotateCcw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10 pt-2">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={reduce ? {} : { opacity: 1, y: 0 }}
        transition={reduce ? undefined : { duration: 0.25 }}
        className="relative overflow-hidden rounded-2xl border border-slate-700/40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-7 text-white shadow-lg"
      >
        <div className="pointer-events-none absolute -top-20 -right-12 h-52 w-52 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-indigo-300/10 blur-3xl" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <UserAvatar name={fullName} profileUrl={profileUrl} className="h-24 w-24 ring-4 ring-white/20" />
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-300">Teacher Profile</p>
                <h1 className="truncate text-3xl font-semibold tracking-tight">{fullName}</h1>
                {bp?.preferredName ? <p className="text-sm text-slate-300">Also known as {bp.preferredName}</p> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {staff?.staffType ? (
                  <Badge className="border border-white/15 bg-white/10 text-slate-100 hover:bg-white/15">
                    {staff.staffType.replace(/_/g, " ")}
                  </Badge>
                ) : null}
                {staff?.designationName ? (
                  <Badge className="border border-white/15 bg-white/10 text-slate-100 hover:bg-white/15">
                    {staff.designationName}
                  </Badge>
                ) : null}
                {staff?.category ? (
                  <Badge className="border border-white/15 bg-white/10 text-slate-100 hover:bg-white/15">
                    {staff.category.replace(/_/g, " ")}
                  </Badge>
                ) : null}
                <Badge className={staff?.active ? "border border-emerald-300/25 bg-emerald-500/20 text-emerald-100" : "border border-red-300/25 bg-red-500/20 text-red-100"}>
                  {staff?.active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-200">
                  <Shield className="h-3.5 w-3.5" />
                  Employee ID: {staff?.employeeId || "Not provided"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-200">
                  <Calendar className="h-3.5 w-3.5" />
                  Tenure: {staff?.hireDate ? computeTenure(staff.hireDate) : "Not provided"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-200">
                  <Briefcase className="h-3.5 w-3.5" />
                  Experience: {teacher?.yearsOfExperience != null ? `${teacher.yearsOfExperience} years` : "Not provided"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-slate-200 sm:col-span-2 xl:col-span-3">
                  <Mail className="h-3.5 w-3.5" />
                  {bp?.email || "Not provided"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={reduce ? {} : { opacity: 1, y: 0 }}
        transition={reduce ? undefined : { duration: 0.28, delay: 0.04 }}
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? {} : { opacity: 1, y: 0 }}
              transition={reduce ? undefined : { duration: 0.22, delay: 0.06 + index * 0.04 }}
            >
              <Card className="rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardContent className="p-4">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
                    <Icon className={cn("h-5 w-5", stat.iconClass)} />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {teachingEntries.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ErrorBoundary fallback={<ServiceUnreachableState />}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subject Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={subjectData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={75}
                      strokeWidth={0}
                    >
                      {subjectData.map((_, idx) => (
                        <Cell key={`subject-${idx}`} fill={SUBJECT_COLORS[idx % SUBJECT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-bold">
                      {teachingEntries.length}
                    </text>
                    <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">
                      periods
                    </text>
                  </PieChart>
                </ResponsiveContainer>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {subjectData.map((item, idx) => (
                    <div key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SUBJECT_COLORS[idx % SUBJECT_COLORS.length] }} />
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span>({item.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ErrorBoundary>

          <ErrorBoundary fallback={<ServiceUnreachableState />}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyBarData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      width={35}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <Tooltip content={<WeeklyTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {weeklyBarData.map((entry) => (
                        <Cell
                          key={`day-${entry.day}`}
                          fill={entry.isToday ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.65)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </ErrorBoundary>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InfoCard title="Personal Information" icon={User}>
          <InfoRow icon={User} label="Username" value={bp?.username || undefined} />
          <InfoRow icon={Mail} label="Email" value={bp?.email || undefined} />
          <InfoRow icon={Calendar} label="Date of Birth" value={bp?.dateOfBirth ? formatDate(bp.dateOfBirth) : undefined} />
          <InfoRow icon={User} label="Gender" value={bp?.gender || undefined} />
          <InfoRow icon={Heart} label="Blood Group" value={bp?.bloodGroup || undefined} />
          <InfoRow icon={Globe} label="Primary Language" value={bp?.primaryLanguage || undefined} />
          <InfoRow icon={Calendar} label="Account Since" value={bp?.createdAt ? formatDate(bp.createdAt) : undefined} />
        </InfoCard>

        <InfoCard title="Employment Details" icon={Briefcase}>
          <InfoRow icon={Shield} label="Employee ID" value={staff?.employeeId || undefined} />
          <InfoRow icon={Building} label="Department" value={staff?.department || undefined} />
          <InfoRow icon={Briefcase} label="Job Title" value={staff?.jobTitle || undefined} />
          <InfoRow icon={Briefcase} label="Designation" value={staff?.designationName || undefined} />
          <InfoRow icon={Building} label="Category" value={staff?.category?.replace(/_/g, " ") || undefined} />
          <InfoRow
            icon={Calendar}
            label="Hire Date + Tenure"
            value={staff?.hireDate ? `${formatDate(staff.hireDate)} (${computeTenure(staff.hireDate)})` : undefined}
          />
          <InfoRow icon={MapPin} label="Office Location" value={staff?.officeLocation || undefined} />
          <InfoRow icon={User} label="Reports To" value={staff?.managerName || undefined} />
        </InfoCard>

        <InfoCard title="ID Card" icon={CreditCard}>
          <div className="flex items-center justify-center py-2">
            <IdCardPreview
              onDownload={async () => {
                const response = await idCardService.downloadMyIdCard();
                triggerBlobDownload(response.data, "my-id-card.pdf");
              }}
            />
          </div>
        </InfoCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teacher ? (
          <InfoCard title="Teaching Credentials" icon={GraduationCap}>
            <InfoRow icon={GraduationCap} label="Education Level" value={teacher.educationLevel || undefined} />
            <InfoRow
              icon={Briefcase}
              label="Experience"
              value={teacher.yearsOfExperience != null ? `${teacher.yearsOfExperience} years` : undefined}
            />
            <InfoRow icon={Shield} label="Certifications" value={formattedCertifications} />
            <InfoRow icon={Star} label="Specializations" value={formattedSpecializations} />
            <InfoRow icon={Shield} label="State License Number" value={teacher.stateLicenseNumber || undefined} />
          </InfoCard>
        ) : null}

        {insights.length > 0 ? (
          <div className="xl:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Activity Feed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Insights generated from your current teaching profile and schedule.
                </div>
                <ul className="space-y-2 text-sm text-foreground">
                  {insights.map((item, index) => (
                    <li key={index} className="rounded-lg border bg-muted/30 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

        {hasSensitiveIds ? (
          <InfoCard title="Official IDs" icon={Shield}>
            <InfoRow icon={Shield} label="Aadhaar Number" value={sensitiveInfo?.aadhaarNumber || undefined} />
            <InfoRow icon={Shield} label="PAN Number" value={sensitiveInfo?.panNumber || undefined} />
            <InfoRow icon={Shield} label="Passport Number" value={sensitiveInfo?.passportNumber || undefined} />
            <InfoRow icon={Shield} label="APAAR ID" value={sensitiveInfo?.apaarId || undefined} />
          </InfoCard>
        ) : null}

        {hasBankInfo ? (
          <InfoCard title="Bank Details" icon={CreditCard}>
            <InfoRow icon={Building} label="Bank Name" value={sensitiveInfo?.bankName || undefined} />
            <InfoRow icon={CreditCard} label="Account Number" value={sensitiveInfo?.bankAccountNumber || undefined} />
            <InfoRow icon={Shield} label="IFSC Code" value={sensitiveInfo?.bankIfscCode || undefined} />
          </InfoCard>
        ) : null}

        {hasEmergencyContact ? (
          <InfoCard title="Emergency Contact" icon={Phone}>
            <InfoRow icon={User} label="Contact Name" value={sensitiveInfo?.emergencyContactName || undefined} />
            <InfoRow icon={Phone} label="Phone Number" value={sensitiveInfo?.emergencyContactPhone || undefined} />
            <InfoRow icon={Heart} label="Relation" value={sensitiveInfo?.emergencyContactRelation || undefined} />
          </InfoCard>
        ) : null}

        {teacher?.teachableSubjects?.length ? (
          <InfoCard title="Subjects & Skills" icon={Star}>
            <div className="flex flex-wrap gap-1.5">
              {teacher.teachableSubjects.map((sub) => (
                <Badge
                  key={sub.uuid}
                  variant="secondary"
                  className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                >
                  {sub.name} ({sub.subjectCode})
                </Badge>
              ))}
            </div>
            <Separator className="my-2" />
            <p className="text-xs text-muted-foreground">Specializations</p>
            <p className={formattedSpecializations ? "font-medium text-foreground" : "text-sm italic text-muted-foreground/60"}>
              {formattedSpecializations || "Not provided"}
            </p>
          </InfoCard>
        ) : null}

        {addresses.length > 0 ? (
          <InfoCard title="Address" icon={MapPin}>
            {addresses.map((addr, index) => (
              <div key={`${addr.addressType ?? "addr"}-${index}`}>
                {addr.addressType ? (
                  <Badge variant="outline" className="mb-1.5 text-[10px]">
                    {addr.addressType}
                  </Badge>
                ) : null}
                <p className={[
                  addr.addressLine1,
                  addr.addressLine2,
                  addr.city,
                  addr.state,
                  addr.postalCode,
                  addr.country,
                ].filter(Boolean).length > 0 ? "font-medium text-foreground" : "text-sm italic text-muted-foreground/60"}>
                  {[
                    addr.addressLine1,
                    addr.addressLine2,
                    addr.city,
                    addr.state,
                    addr.postalCode,
                    addr.country,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not provided"}
                </p>
                {index < addresses.length - 1 ? <Separator className="my-3" /> : null}
              </div>
            ))}
          </InfoCard>
        ) : null}

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:col-span-2 xl:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Bio</p>
          </div>
          <p className={bp?.bio ? "text-sm leading-relaxed text-foreground" : "text-sm italic text-muted-foreground/60"}>
            {bp?.bio || "No bio provided. Add a short introduction about yourself."}
          </p>
        </div>
      </div>

      <div className="sr-only" aria-live="polite">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="space-y-2.5 text-sm">{children}</div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={value ? "font-medium text-foreground" : "text-sm italic text-muted-foreground/60"}>
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}
