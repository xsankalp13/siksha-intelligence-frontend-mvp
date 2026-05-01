import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Award,
  FileCheck,
  Archive,
  User,
  CreditCard,
  Flame,
  Zap,
  CalendarCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hourglass,
  BookOpen,
  ChevronRight,
  Sparkles,
  Target,
  TrendingUp,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KpiOverviewDTO, PendingAssignmentDTO, TodayScheduleDTO } from "@/services/types/studentIntelligence";
import { format } from "date-fns";
import { UserAvatar } from "@/components/shared/UserAvatar";

// ─────────────────────────────────────────────────────────────────────
// 1. Interactive Quick-Access Bento
// ─────────────────────────────────────────────────────────────────────

interface QuickTile {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  path: string;
  gradient: string;
  iconBg: string;
  badge?: string;
  badgeColor?: string;
  pulse?: boolean;
}

const QUICK_TILES: QuickTile[] = [
  {
    id: "timetable",
    label: "Timetable",
    description: "Your weekly schedule",
    icon: CalendarDays,
    path: "/dashboard/student/timetable",
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    iconBg: "bg-blue-500/10 text-blue-500",
  },
  {
    id: "results",
    label: "My Results",
    description: "Grade cards & marks",
    icon: Award,
    path: "/dashboard/student/results",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    iconBg: "bg-emerald-500/10 text-emerald-500",
  },
  {
    id: "admit-cards",
    label: "Admit Cards",
    description: "Exam hall tickets",
    icon: FileCheck,
    path: "/dashboard/student/admit-cards",
    gradient: "from-violet-500/20 via-violet-500/5 to-transparent",
    iconBg: "bg-violet-500/10 text-violet-500",
    badge: "Active",
    badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    pulse: true,
  },
  {
    id: "past-papers",
    label: "Past Papers",
    description: "Archive & practice",
    icon: Archive,
    path: "/dashboard/student/past-papers",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    iconBg: "bg-amber-500/10 text-amber-500",
  },
  {
    id: "profile",
    label: "My Profile",
    description: "Personal settings",
    icon: User,
    path: "/dashboard/student/profile",
    gradient: "from-rose-500/20 via-rose-500/5 to-transparent",
    iconBg: "bg-rose-500/10 text-rose-500",
  },
  {
    id: "digital-id",
    label: "Digital ID",
    description: "Student identity",
    icon: CreditCard,
    path: "/dashboard/student/profile",
    gradient: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    iconBg: "bg-cyan-500/10 text-cyan-500",
  },
];

export function InteractiveQuickAccessBento() {
  const navigate = useNavigate();
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 overflow-hidden">
      <CardHeader className="pb-6 border-b border-border/10 bg-muted/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              Quick Access
            </CardTitle>
            <CardDescription className="text-sm font-medium">Jump to your most-used campus sections</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_TILES.map((tile) => {
            const Icon = tile.icon;
            const isHovered = hoveredTile === tile.id;
            return (
              <motion.button
                key={tile.id}
                onClick={() => navigate(tile.path)}
                onMouseEnter={() => setHoveredTile(tile.id)}
                onMouseLeave={() => setHoveredTile(null)}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  relative flex flex-col items-start gap-4 p-5 rounded-2xl border transition-all duration-300 text-left
                  overflow-hidden group cursor-pointer
                  ${isHovered
                    ? "bg-muted/80 border-border shadow-lg"
                    : "bg-card/30 border-border/40 hover:border-border/60"
                  }
                `}
              >
                {/* Background Accent Gradient */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${tile.gradient} opacity-40 blur-2xl -mr-12 -mt-12 transition-opacity duration-300 ${isHovered ? "opacity-70" : "opacity-30"}`} />

                {/* Status Indicator */}
                {tile.pulse && (
                  <span className="absolute top-4 right-4 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
                  </span>
                )}

                <div className="flex items-start justify-between w-full">
                  <div className={`p-3 rounded-xl ${tile.iconBg} shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {tile.badge && (
                    <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${tile.badgeColor}`}>
                      {tile.badge}
                    </Badge>
                  )}
                </div>

                <div className="relative z-10 w-full mt-2">
                  <h4 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{tile.label}</h4>
                  <p className="text-xs font-medium text-muted-foreground mt-1 line-clamp-1">{tile.description}</p>
                </div>

                {/* Subtle Arrow */}
                <div className={`mt-2 flex items-center text-[10px] font-bold text-primary opacity-0 transition-all duration-300 translate-x-[-10px] ${isHovered ? "opacity-100 translate-x-0" : ""}`}>
                  Go to section <ChevronRight className="ml-1 w-3 h-3" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type PulseStatus = "PRESENT" | "ABSENT" | "UPCOMING";

const PULSE_CONFIG: Record<PulseStatus, { label: string; className: string }> = {
  PRESENT: { label: "P", className: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" },
  ABSENT: { label: "A", className: "bg-rose-500/20 text-rose-500 border-rose-500/30" },
  UPCOMING: { label: "•", className: "bg-muted text-muted-foreground border-border/50" },
};

function deriveWeeklyPulse(attendancePercent: number): PulseStatus[] {
  // Mock logic: generate a representative week based on overall percentage
  const seed = attendancePercent / 100;
  return Array.from({ length: 7 }, (_, i) => {
    if (i >= 5) return "UPCOMING"; // Weekend/Upcoming
    return Math.random() < seed ? "PRESENT" : "ABSENT";
  });
}

export function AttendanceInsightWidget({ kpis }: any) {
  const attendancePercent = kpis?.attendancePercentage ?? 0;
  const threshold = 75;

  const safeToSkip = Math.max(0, Math.floor((attendancePercent - threshold) * 0.4));
  const classesNeeded = attendancePercent < threshold ? Math.ceil((threshold - attendancePercent) * 0.5) : 0;

  const weekPulse = deriveWeeklyPulse(attendancePercent);

  const statusColor =
    attendancePercent >= 85 ? "text-emerald-500" :
      attendancePercent >= threshold ? "text-amber-500" :
        "text-rose-500";

  const statusBg =
    attendancePercent >= 85 ? "from-emerald-500/10" :
      attendancePercent >= threshold ? "from-amber-500/10" :
        "from-rose-500/10";

  const statusLabel =
    attendancePercent >= 85 ? "Excellent Standing" :
      attendancePercent >= threshold ? "At Minimum Level" :
        "Action Required";

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" /> Attendance Pulse
        </CardTitle>
        <CardDescription className="text-sm font-medium">Real-time attendance analysis & projections</CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Main Stat Card */}
        <div className={`relative flex items-center justify-between p-5 rounded-2xl bg-gradient-to-br ${statusBg} to-transparent border border-border/30 overflow-hidden group`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16" />
          </div>

          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">AGGREGATE PERCENTAGE</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-5xl font-black tracking-tighter ${statusColor}`}>
                {attendancePercent.toFixed(1)}
              </span>
              <span className={`text-xl font-bold ${statusColor}`}>%</span>
            </div>
            <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-background/50 border border-border/50 ${statusColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusColor.replace('text', 'bg')}`} />
              {statusLabel}
            </div>
          </div>

          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90 pointer-events-none" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeOpacity="0.2" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${(attendancePercent / 100) * 263.89} 263.89`}
                strokeLinecap="round"
                className={`${statusColor} transition-all duration-1000 ease-out`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground">MIN</span>
              <span className="text-sm font-black text-foreground">{threshold}%</span>
            </div>
          </div>
        </div>

        {/* Weekly Timeline */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">WEEKLY ENGAGEMENT PULSE</p>
          <div className="flex items-center gap-2">
            {weekPulse.map((day, i) => {
              const cfg = PULSE_CONFIG[day];
              return (
                <div key={i} className="flex flex-col items-center gap-2 flex-1 group/day">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`
                      w-full h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ring-2 ring-transparent
                      transition-all duration-300 group-hover/day:scale-110 group-hover/day:ring-primary/20
                      ${cfg.className}
                    `}
                  >
                    {cfg.label}
                  </motion.div>
                  <span className="text-[10px] font-bold text-muted-foreground group-hover/day:text-foreground transition-colors">{DAYS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Insight Box */}
        <div className="relative p-4 rounded-2xl border border-primary/20 bg-primary/5 group overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/20">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-bold text-foreground tracking-tight">AI Attendance Strategy</p>
          </div>

          {attendancePercent >= threshold ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                You have a healthy buffer. You can safely miss up to{" "}
                <span className="font-bold text-foreground bg-emerald-500/10 px-1 rounded">{safeToSkip} classes</span> and still maintain your {threshold}% eligibility status.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                Critical warning: Below minimum. You need to attend the next{" "}
                <span className="font-bold text-rose-500 bg-rose-500/10 px-1 rounded">{classesNeeded} sessions</span> without fail to restore your target standing.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 3. Exam Countdown + Schedule Sneak-Peek Widget
// ─────────────────────────────────────────────────────────────────────

interface ExamCountdownWidgetProps {
  assignments?: PendingAssignmentDTO[];
}

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function update() {
      const now = new Date();
      if (targetDate <= now) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const totalSeconds = Math.floor((targetDate.getTime() - now.getTime()) / 1000);
      setTimeLeft({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={value}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-2xl font-black text-foreground tabular-nums"
            >
              {String(value).padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1.5">{label}</span>
    </div>
  );
}

export function ExamCountdownWidget({ assignments }: ExamCountdownWidgetProps) {
  const nextExam = assignments
    ?.filter((a) => new Date(a.dueDate) > new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const targetDate = nextExam ? new Date(nextExam.dueDate) : new Date(Date.now() + 86400000 * 5);
  const countdown = useCountdown(targetDate);

  if (!nextExam) {
    return (
      <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Exam Countdown
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[220px] text-muted-foreground text-center p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60" />
          </div>
          <p className="text-base font-bold text-foreground tracking-tight">Academic Peace</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">No upcoming examinations or major deadlines detected.</p>
        </CardContent>
      </Card>
    );
  }

  const urgency = countdown.days <= 1 ? "critical" : countdown.days <= 3 ? "warning" : "normal";
  const urgencyColors = {
    critical: { ring: "border-rose-500/30 bg-rose-500/10", dot: "bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]", text: "text-rose-500", label: "URGENT PREPARATION" },
    warning: { ring: "border-amber-500/30 bg-amber-500/10", dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]", text: "text-amber-500", label: "UPCOMING TEST" },
    normal: { ring: "border-primary/20 bg-primary/5", dot: "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]", text: "text-primary", label: "SCHEDULING ACTIVE" },
  };
  const colors = urgencyColors[urgency];

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Examination Focus
          </CardTitle>
          <Badge variant="outline" className={`text-[10px] font-black tracking-widest ${colors.text} border-current/20 bg-background/50`}>
            {colors.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Exam Identity */}
        <div className={`p-4 rounded-2xl border ${colors.ring.split(' ')[0]} ${colors.ring.split(' ')[1]} flex items-start gap-4 relative overflow-hidden group`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <div className="shrink-0">
            <div className={`w-12 h-12 rounded-xl bg-background/80 shadow-inner flex items-center justify-center`}>
              <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-0.5">{nextExam.subject}</p>
            <h4 className="text-base font-black text-foreground tracking-tight line-clamp-1">{nextExam.title}</h4>
            <div className="flex items-center gap-1.5 mt-1.5">
              <CalendarDays className="w-3 h-3 text-muted-foreground" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(nextExam.dueDate), "MMM do, yyyy")}</p>
            </div>
          </div>
        </div>

        {/* Time Tracking GRID */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">T-MINUS COUNTDOWN</p>
          <div className="grid grid-cols-4 gap-2">
            <CountdownUnit value={countdown.days} label="Days" />
            <CountdownUnit value={countdown.hours} label="Hours" />
            <CountdownUnit value={countdown.minutes} label="Mins" />
            <CountdownUnit value={countdown.seconds} label="Secs" />
          </div>
        </div>

        {/* Readiness Selector */}
        <PrepLevelSelector subject={nextExam.subject} />
      </CardContent>
    </Card>
  );
}

// Internal: Prep Level Selector
function PrepLevelSelector({ subject }: { subject: string }) {
  const [level, setLevel] = useState<number | null>(null);
  const levels = [
    { val: 1, emoji: "😰", label: "Not Started" },
    { val: 2, emoji: "📖", label: "In Progress" },
    { val: 3, emoji: "💪", label: "Almost Ready" },
    { val: 4, emoji: "🎯", label: "Fully Prepared" },
  ];

  return (
    <div className="rounded-xl border border-dashed border-border p-3.5 space-y-2.5">
      <div className="flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-semibold text-muted-foreground">
          How prepared are you for {subject}?
        </p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {levels.map((l) => (
          <button
            key={l.val}
            onClick={() => setLevel(l.val)}
            className={`
              flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all duration-150
              ${level === l.val
                ? "border-primary bg-primary/10 text-primary scale-105 shadow-sm"
                : "border-border/50 hover:border-border hover:bg-muted/50 text-muted-foreground"
              }
            `}
          >
            <span className="text-lg">{l.emoji}</span>
            <span className="text-[9px] text-center leading-tight">{l.label}</span>
          </button>
        ))}
      </div>
      {level && (
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-center text-muted-foreground font-medium"
        >
          {level <= 2 ? "💡 Try asking Shiksha AI for study tips!" : "🌟 Great work! Keep it up!"}
        </motion.p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 4. Leave Status Widget
// ─────────────────────────────────────────────────────────────────────

type LeaveStatus = "Approved" | "Pending" | "Rejected";

interface MockLeave {
  id: string;
  type: string;
  dates: string;
  status: LeaveStatus;
}

const LEAVE_STATUS_CONFIG: Record<LeaveStatus, { icon: React.ElementType; className: string; bg: string }> = {
  Approved: { icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  Pending: { icon: Hourglass, className: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  Rejected: { icon: XCircle, className: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
};

// Mock leave data — real data would come from backend when leave module is built
const MOCK_LEAVES: MockLeave[] = [
  { id: "1", type: "Medical Leave", dates: "Apr 10 – Apr 11", status: "Approved" },
  { id: "2", type: "Personal Leave", dates: "Apr 18", status: "Pending" },
];

export function LeaveStatusWidget() {
  const [showForm, setShowForm] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleApply() {
    if (!leaveReason.trim()) return;
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setShowForm(false); setLeaveReason(""); }, 2500);
  }

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" /> Compliance & Leave
            </CardTitle>
            <CardDescription className="text-xs font-medium">History and quick-application system</CardDescription>
          </div>
          {!showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
              className="text-[10px] font-bold tracking-widest uppercase border-dashed h-7 px-3 bg-background/50"
            >
              Request
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Quick Apply Form (Top-Priority UI) */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative overflow-hidden p-4 rounded-2xl border border-primary/20 bg-primary/5 shadow-inner"
            >
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-4 gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-black text-foreground">APPLICATION SENT</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Waiting for verification</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Instant Leave Request</p>
                  </div>
                  <input
                    type="text"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    placeholder="Brief reason (e.g. Medical Checkup)"
                    className="w-full text-sm bg-background/80 border border-border/60 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleApply} className="flex-1 text-[10px] font-bold uppercase rounded-lg">File Leave</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-[10px] font-bold uppercase rounded-lg">Cancel</Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Records */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">RECENT ACTIVITY</p>
          {MOCK_LEAVES.map((leave) => {
            const cfg = LEAVE_STATUS_CONFIG[leave.status];
            const StatusIcon = cfg.icon;
            return (
              <div key={leave.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/30 hover:bg-muted/30 transition-all group">
                <div className={`p-2.5 rounded-xl ${cfg.bg} shrink-0 transition-transform group-hover:scale-105`}>
                  <StatusIcon className={`w-4 h-4 ${cfg.className}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground tracking-tight">{leave.type}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60 tracking-wider mt-0.5">{leave.dates}</p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border border-current/10 ${cfg.bg} ${cfg.className}`}>
                  {leave.status}
                </div>
              </div>
            );
          })}
        </div>

        {MOCK_LEAVES.length === 0 && !showForm && (
          <div className="text-center py-10 opacity-30 grayscale pointer-events-none">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" />
            <p className="text-[10px] font-black tracking-widest uppercase">No Active Requests</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 5. Streak & Achievements Badge Widget
// ─────────────────────────────────────────────────────────────────────

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  earned: boolean;
  color: string;
  iconBg: string;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "consistent",
    title: "Consistent Scholar",
    description: "Present 10 days straight",
    emoji: "🏆",
    earned: true,
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-500/15",
  },
  {
    id: "early-bird",
    title: "Early Bird",
    description: "Arrived before 8AM for a week",
    emoji: "🌅",
    earned: true,
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/15",
  },
  {
    id: "submission-streak",
    title: "On-Time Warrior",
    description: "5 assignments submitted early",
    emoji: "⚡",
    earned: false,
    color: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-500/15",
  },
  {
    id: "star-student",
    title: "Academic Star",
    description: "CGPA improved this term",
    emoji: "⭐",
    earned: false,
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/15",
  },
];

interface StreakBadgeWidgetProps {
  kpis?: KpiOverviewDTO;
}

export function StreakBadgeWidget({ kpis }: StreakBadgeWidgetProps) {
  const attendancePercent = kpis?.attendancePercentage ?? 0;
  const estimatedStreak = Math.min(Math.floor((attendancePercent / 100) * 14), 14);
  const earnedCount = ACHIEVEMENTS.filter((a) => a.earned).length;

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" /> Milestones & Badges
            </CardTitle>
            <CardDescription className="text-xs font-medium">Rewarding campus consistency</CardDescription>
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1.5 shadow-inner"
          >
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-black text-orange-500 tracking-tighter">{estimatedStreak} DAYS</span>
          </motion.div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Progress System */}
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-background/50 to-transparent border border-border/40 shadow-inner group">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-black text-foreground tracking-tight">PROGRESS TO LEGEND</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-primary">{earnedCount}</span>
              <span className="text-xs font-bold text-muted-foreground ml-1">/{ACHIEVEMENTS.length}</span>
            </div>
          </div>
          <div className="w-full bg-muted h-3 rounded-full overflow-hidden shadow-inner p-0.5 border border-border/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(earnedCount / ACHIEVEMENTS.length) * 100}%` }}
              transition={{ duration: 1.5, ease: "circOut" }}
              className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)]"
            />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground mt-3 uppercase tracking-widest text-center opacity-70">
            Keep it up! 2 more milestones to reach <span className="text-primary font-black">MASTER LEVEL</span>
          </p>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((badge) => (
            <motion.div
              key={badge.id}
              whileHover={badge.earned ? { scale: 1.02, y: -2 } : {}}
              className={`
                relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300
                ${badge.earned
                  ? "border-border/60 bg-card/60 shadow-sm hover:shadow-md cursor-default"
                  : "border-dashed border-border/30 bg-muted/10 opacity-40"
                }
              `}
            >
              <div className={`w-12 h-12 rounded-2xl ${badge.iconBg} flex items-center justify-center text-2xl shadow-inner shrink-0`}>
                {badge.emoji}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-black tracking-tight leading-tight ${badge.earned ? "text-foreground" : "text-muted-foreground"}`}>
                  {badge.title}
                </p>
                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase line-clamp-1">{badge.description}</p>
              </div>
              {badge.earned && (
                <div className={`absolute top-2 right-2 p-1 rounded-full bg-emerald-500/10`}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
// 6. Teacher Connect / Quick Chat Context Widget
// ─────────────────────────────────────────────────────────────────────

interface TeacherConnectWidgetProps {
  schedule?: TodayScheduleDTO[];
}

export function TeacherConnectWidget({ schedule }: TeacherConnectWidgetProps) {
  const teachers = schedule
    ? Array.from(new Set(schedule.map((s) => s.teacher)))
      .slice(0, 5)
      .map((name) => ({
        name,
        subject: schedule.find((s) => s.teacher === name)?.subject ?? "Specialist",
      }))
    : [];

  if (teachers.length === 0) return null;

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Active Educators
            </CardTitle>
            <CardDescription className="text-xs font-medium">Connect with session leaders for real-time guidance</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {teachers.map((t) => (
            <motion.div
              key={t.name}
              whileHover={{ y: -4, scale: 1.02 }}
              className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-border/40 bg-card/40 hover:bg-muted/80 hover:border-primary/40 transition-all cursor-pointer"
            >
              <div className="absolute top-2 right-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="relative mb-3">
                <UserAvatar name={t.name} className="w-14 h-14 border-2 border-background shadow-lg" />
                <div className="absolute -bottom-1 -right-1 bg-primary text-white p-1 rounded-full shadow-lg">
                  <MessageSquare size={10} strokeWidth={3} />
                </div>
              </div>
              <h4 className="text-sm font-black text-foreground tracking-tight leading-tight mb-1 truncate w-full">
                Prof. {t.name.split(' ')[0]}
              </h4>
              <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase border-primary/20 bg-primary/5 text-primary px-2 py-0 border-none">
                {t.subject}
              </Badge>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
