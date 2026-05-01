import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ArrowRight, Calendar, CheckCircle2, ChevronRight, AlertCircle, FileText, Bell, Briefcase } from "lucide-react";
import type { ChildSummary, AttendanceSnapshot, PerformanceSnapshot, FeesSnapshot, HomeworkSnapshot, ParentNotification } from "@/services/types/parent";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// ─────────────────────────────────────────────────────────────────
// Child Summary Card
// ─────────────────────────────────────────────────────────────────
export function ChildSummaryCard({ child }: { child: ChildSummary }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border bg-gradient-to-br from-primary/5 to-primary/10 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <UserAvatar
          name={child.fullName}
          profileUrl={child.profileUrl}
          className="h-16 w-16 border-2 border-background ring-2 ring-primary/20"
        />
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{child.fullName}</h2>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="rounded-md bg-background/50 px-2 py-0.5 backdrop-blur-sm">
              {child.className} {child.section}
            </span>
            <span>•</span>
            <span>Roll {child.rollNumber}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <Button variant="outline" size="sm" className="bg-background/50 backdrop-blur-sm" asChild>
          <Link to="/dashboard/parent/student-profile">View Full Profile <ChevronRight className="ml-1.5 h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Attendance Summary Card
// ─────────────────────────────────────────────────────────────────
export function AttendanceSummaryCard({ attendance }: { attendance: AttendanceSnapshot }) {
  const isGood = attendance.attendancePercentage >= 80;
  
  const pieData = [
    { name: "Present", value: attendance.presentDays, color: "var(--primary)" },
    { name: "Absent", value: attendance.absentDays + attendance.lateDays, color: "var(--destructive)" },
  ];

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>Attendance</span>
        </div>
        <div className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
          attendance.todayStatus === "PRESENT" ? "bg-emerald-500/10 text-emerald-600" :
          attendance.todayStatus === "ABSENT" ? "bg-rose-500/10 text-rose-600" :
          "bg-muted text-muted-foreground"
        )}>
          Today: {attendance.todayStatus}
        </div>
      </div>

      <div className="flex flex-1 items-center gap-6">
        <div className="relative h-20 w-20 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                innerRadius={30}
                outerRadius={40}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold">{Math.round(attendance.attendancePercentage)}%</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-2xl font-bold">{attendance.presentDays} <span className="text-sm font-normal text-muted-foreground">/ {attendance.totalDays} days</span></p>
          <p className={cn(
            "text-sm font-medium",
            isGood ? "text-emerald-600" : "text-amber-600"
          )}>
            {isGood ? "On track" : "Needs attention"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Performance Summary Card
// ─────────────────────────────────────────────────────────────────
export function PerformanceSummaryCard({ performance }: { performance: PerformanceSnapshot }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <CheckCircle2 className="h-4 w-4" />
        <span>Performance GPA</span>
      </div>
      
      <div className="flex flex-1 flex-col justify-center">
        <div className="flex items-baseline gap-2">
          <h3 className="text-4xl font-black text-foreground">{performance.currentGpa.toFixed(1)}</h3>
          <span className="text-sm font-medium text-muted-foreground">/ {performance.maxGpa}</span>
        </div>
        
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="font-medium text-muted-foreground">Class Avg:</span>
          <span className="font-semibold">{performance.classAverage.toFixed(1)}</span>
        </div>
      </div>
      
      <Button variant="ghost" size="sm" className="mt-2 w-full justify-between" asChild>
        <Link to="/dashboard/parent/academics">
          View Report Card <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Fees Due Card
// ─────────────────────────────────────────────────────────────────
export function FeesDueCard({ fees }: { fees: FeesSnapshot }) {
  const isOverdue = new Date(fees.nextDueDate) < new Date();
  const hasDue = fees.totalDue > 0;

  return (
    <div className={cn(
      "flex h-full flex-col rounded-2xl border p-6 shadow-sm",
      isOverdue ? "border-rose-500/30 bg-rose-500/5" : hasDue ? "bg-card" : "bg-emerald-500/5 border-emerald-500/20"
    )}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Briefcase className="h-4 w-4" />
          <span>Fees & Payments</span>
        </div>
        {hasDue && (
          <span className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
            isOverdue ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"
          )}>
            {isOverdue ? "Overdue" : "Pending"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center py-2">
        {hasDue ? (
          <>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {fees.currency} {fees.totalDue.toLocaleString()}
            </p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Due by <span className={cn(isOverdue && "text-rose-600 font-semibold")}>
                {new Date(fees.nextDueDate).toLocaleDateString()}
              </span>
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-600">All fees paid</p>
          </div>
        )}
      </div>

      <Button 
        className={cn("mt-4 w-full", isOverdue && "bg-rose-600 hover:bg-rose-700 text-white")}
        variant={hasDue ? "default" : "outline"}
        asChild
      >
        <Link to="/dashboard/parent/fees">{hasDue ? "Pay Now" : "View History"}</Link>
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Homework Pending Card
// ─────────────────────────────────────────────────────────────────
export function HomeworkPendingCard({ homework }: { homework: HomeworkSnapshot }) {
  const navigate = useNavigate();
  const hasPending = homework.totalPending > 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Pending Tasks</span>
        </div>
        {homework.totalOverdue > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-semibold text-rose-600">
            <AlertCircle className="h-3 w-3" />
            {homework.totalOverdue} Overdue
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center">
        {hasPending ? (
          <div className="flex items-baseline gap-2">
            <h3 className="text-4xl font-black text-foreground">{homework.totalPending}</h3>
            <span className="text-sm font-medium text-muted-foreground">assignments due</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm font-medium">All caught up!</p>
          </div>
        )}
      </div>

      <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigate("/dashboard/parent/homework")}>
        View Assignments
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Recent Notifications List
// ─────────────────────────────────────────────────────────────────
export function RecentNotificationsList({ notifications }: { notifications: ParentNotification[] }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <Bell className="h-4 w-4 text-primary" />
          <h3>Recent Updates</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
          <Link to="/dashboard/parent/notifications">View All</Link>
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {notifications.length > 0 ? (
          <div className="space-y-1">
            {notifications.slice(0, 4).map((n) => (
              <div 
                key={n.notificationId} 
                className={cn(
                  "flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50 w-full text-left",
                  !n.isRead && "bg-primary/5"
                )}
              >
                <div className={cn(
                  "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                  !n.isRead ? "bg-primary" : "bg-transparent"
                )} />
                <div className="space-y-1">
                  <p className={cn("text-sm leading-tight", !n.isRead ? "font-semibold" : "font-medium text-foreground/90")}>
                    {n.title}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{n.message}</p>
                </div>
                <div className="ml-auto whitespace-nowrap text-[10px] text-muted-foreground">
                  {new Date(n.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <Bell className="mb-2 h-8 w-8 opacity-20" />
            <p className="text-sm">No recent updates</p>
          </div>
        )}
      </div>
    </div>
  );
}
