
import { format, differenceInDays } from "date-fns";
import { useAppSelector } from "@/store/hooks";
import { ProfileImageUploader } from "@/components/shared/ProfileImageUploader";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Receipt, Bell, Clock, CalendarClock, TrendingUp, Trophy, AlertCircle, FileText } from "lucide-react";
import type {
  StudentProfileDTO,
  KpiOverviewDTO,
  TodayScheduleDTO,
  PendingAssignmentDTO,
  PerformanceTrendDTO,
  RecentAnnouncementDTO
} from "@/services/types/studentIntelligence";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

// ────────────────────────────────────────────────────────────
// 1. KPI Ribbon & Greeting Widget
// ────────────────────────────────────────────────────────────
export function KpiRibbonWidget({ profile, kpis }: { profile?: StudentProfileDTO; kpis?: KpiOverviewDTO }) {
  const user = useAppSelector((s) => s.auth.user);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile?.fullName?.split(" ")[0] || user?.username?.split(" ")[0] || "Student";
  const hasUpdatePermission = user?.roles?.includes("ROLE_ADMIN") || user?.roles?.includes("ROLE_STUDENT");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Greeting Card */}
      <Card className="lg:col-span-2 border-border/50 shadow-xl bg-card/40 backdrop-blur-xl overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none transition-all duration-700 group-hover:scale-110" />
        <CardContent className="p-8 flex items-center gap-8 relative z-10">
          <div className="relative">
            {hasUpdatePermission ? (
              <ProfileImageUploader
                currentProfileUrl={profile?.profileUrl || user?.profileUrl}
                name={profile?.fullName || user?.username}
                className="w-20 h-20 sm:w-24 sm:h-24 text-3xl border-4 border-background/50 shadow-2xl shrink-0 ring-4 ring-primary/10"
              />
            ) : (
              <UserAvatar
                profileUrl={profile?.profileUrl || user?.profileUrl}
                name={profile?.fullName || user?.username}
                className="w-20 h-20 sm:w-24 sm:h-24 text-3xl border-4 border-background/50 shadow-2xl shrink-0 ring-4 ring-primary/10"
              />
            )}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full border-4 border-background flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>

          <div className="space-y-2 w-full">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">
              {format(new Date(), "EEEE, MMMM do yyyy")}
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter leading-tight">
              {greeting}, <br className="sm:hidden" /><span className="text-primary">{firstName}</span>.
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="outline" className="font-bold text-[10px] tracking-widest uppercase bg-primary/5 border-primary/20 text-primary px-3 py-1">
                {profile?.courseOrClass || "Scholar"}
              </Badge>
              <Badge variant="outline" className="font-bold text-[10px] tracking-widest uppercase bg-muted/50 border-border/40 text-muted-foreground px-3 py-1">
                ID: {profile?.enrollmentNumber || "TBD"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance KPI */}
      <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 flex flex-col justify-between relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
        <div className="absolute right-[-10%] top-[-10%] opacity-5 transition-opacity group-hover:opacity-10 scale-150">
          <CalendarClock className="w-32 h-32" />
        </div>
        <CardContent className="p-8 flex flex-col h-full">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-emerald-500" /> ACADEMIC PULSE
          </p>
          <div className="flex-1 space-y-2">
            <h3 className="text-5xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">
              {kpis?.attendancePercentage ?? 0}<span className="text-2xl ml-0.5 opacity-40">%</span>
            </h3>
            <p className="text-xs font-bold text-muted-foreground">Attendance Standing</p>
          </div>
          <div className="mt-6 w-full bg-muted h-2.5 rounded-full overflow-hidden p-0.5 border border-border/20 shadow-inner">
            <div
              className={`h-full rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${(kpis?.attendancePercentage ?? 0) < 75 ? 'bg-gradient-to-r from-rose-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Finance KPI */}
      <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 flex flex-col justify-between relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
        <div className="absolute right-[-10%] top-[-10%] opacity-5 transition-opacity group-hover:opacity-10 scale-150">
          <Receipt className="w-32 h-32" />
        </div>
        <CardContent className="p-8 flex flex-col h-full">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <Receipt className="w-3 h-3 text-amber-500" /> FINANCE OVERVIEW
          </p>
          <div className="flex-1 space-y-1">
            <h3 className={`text-5xl font-black tracking-tighter transition-colors ${(kpis?.totalOverdueFees ?? 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              ₹{(kpis?.totalOverdueFees ?? 0).toLocaleString()}
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {(kpis?.totalOverdueFees ?? 0) > 0 ? 'Outstanding Dues' : 'Fees Cleared'}
            </p>
          </div>
          <div className="mt-6">
            {(kpis?.totalOverdueFees ?? 0) > 0 ? (
              <Button size="sm" className="w-full text-[10px] font-black tracking-widest uppercase bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/20">Pay Fees Now</Button>
            ) : (
              <div className="w-full flex items-center justify-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black tracking-widest uppercase">
                <Trophy className="w-3 h-3 mr-2" /> All Clear
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 2. Daily Routine Timeline Widget
// ────────────────────────────────────────────────────────────
export function DailyRoutineTimelineWidget({ schedule }: { schedule?: TodayScheduleDTO[] }) {
  if (!schedule || schedule.length === 0) {
    return (
      <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" /> Today's Routine
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6 border-2 border-dashed border-border/50">
            <CalendarClock className="w-8 h-8 opacity-20" />
          </div>
          <p className="text-base font-bold text-foreground tracking-tight">Academic Break</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Your schedule for today is currently clear. Use this time for research or project work.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden flex flex-col">
      <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" /> Daily Schedule
          </CardTitle>
          <Badge variant="outline" className="text-[10px] font-black tracking-widest border-primary/20 bg-primary/5 text-primary">
            {schedule.length} SESSIONS ACTIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-8 flex-1 overflow-y-auto custom-scrollbar min-h-[400px]">
        <div className="relative border-l-2 border-muted/30 ml-3 space-y-10 pb-4">
          {schedule.map((session, i) => {
            const isLive = session.status === 'LIVE';
            const isDone = session.status === 'COMPLETED';
            return (
              <div key={session.id || i} className="relative pl-8 group">
                {/* Timeline Dot */}
                <div className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full border-4 border-background shadow-xl transition-all duration-300 group-hover:scale-125
                  ${isLive ? 'bg-primary ring-4 ring-primary/20 animate-pulse' : isDone ? 'bg-muted-foreground opacity-50' : 'bg-muted'}
                `} />

                {/* Content Card */}
                <div className={`
                  relative p-4 rounded-2xl border transition-all duration-300
                  ${isLive
                    ? 'bg-primary/5 border-primary/30 shadow-md ring-1 ring-primary/20 translate-x-1'
                    : isDone
                      ? 'bg-muted/10 border-border/30 opacity-60 grayscale-[0.5]'
                      : 'bg-card/20 border-border/40 hover:border-border/60 hover:translate-x-1'
                  }
                `}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-[10px] font-black tracking-widest uppercase flex items-center gap-2 ${isLive ? 'text-primary' : 'text-muted-foreground'}`}>
                      <Clock className="w-3 h-3" />
                      {format(new Date(session.startTime), "h:mm a")} – {format(new Date(session.endTime), "h:mm a")}
                    </p>
                    {isLive && (
                      <div className="flex items-center gap-2 bg-primary/20 px-2 py-0.5 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                        <span className="text-[9px] font-black text-primary tracking-widest">LIVE SESSION</span>
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-black text-foreground tracking-tight leading-none group-hover:text-primary transition-colors">{session.subject}</h4>
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold">R</div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase">{session.room}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserAvatar name={session.teacher} className="w-6 h-6 border-none text-[8px]" />
                      <p className="text-[11px] font-bold text-foreground">Prof. {session.teacher.split(' ')[0]}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
// 3. Pending Tasks / Assignments Widget
// ────────────────────────────────────────────────────────────
export function PendingTasksWidget({ assignments }: { assignments?: PendingAssignmentDTO[] }) {
  if (!assignments || assignments.length === 0) {
    return (
      <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Active Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <Trophy className="w-8 h-8 text-emerald-500 opacity-60" />
          </div>
          <p className="text-base font-bold text-foreground tracking-tight">Zero Deadlines</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Strategic success! All your pending submissions and goals are currently up to date.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden flex flex-col">
      <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Academic Deadlines
          </CardTitle>
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500 text-[10px] font-black text-white shadow-lg shadow-rose-900/20">
            {assignments.length}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 flex-1 overflow-y-auto custom-scrollbar shadow-inner bg-muted/5">
        <div className="space-y-4">
          {assignments.map((task) => {
            const daysLeft = differenceInDays(new Date(task.dueDate), new Date());
            const isUrgent = daysLeft <= 2 || task.priority === 'HIGH';

            return (
              <div
                className={`
                  group flex items-start gap-4 p-5 rounded-2xl border transition-all duration-300
                  ${isUrgent
                    ? 'bg-rose-500/5 border-rose-500/30 shadow-sm shadow-rose-900/5'
                    : 'bg-card/40 border-border/40 hover:border-primary/40 hover:bg-muted/80'
                  }
                `}
              >
                <div className={`
                  mt-0.5 shrink-0 flex items-center justify-center w-12 h-12 rounded-xl shadow-inner transition-transform group-hover:scale-110
                  ${isUrgent ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}
                `}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isUrgent ? 'text-rose-500' : 'text-primary'}`}>
                      {task.subject}
                    </p>
                    <Badge variant="outline" className={`text-[9px] font-black tracking-widest uppercase px-2 py-0 h-5 border-none ${isUrgent ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                      {isUrgent ? 'CRITICAL' : 'PLANNED'}
                    </Badge>
                  </div>
                  <h4 className="text-base font-black text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors mb-2.5">
                    {task.title}
                  </h4>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase opacity-70 leading-none">
                      <Clock className="w-3 h-3" />
                      Due {format(new Date(task.dueDate), "MMM do")}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${isUrgent ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                      {daysLeft <= 0 ? 'Due Today' : `${daysLeft}d remaining`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
// 4. Performance Trend Widget (Recharts)
// ────────────────────────────────────────────────────────────
export function PerformanceChartWidget({ trends }: { trends?: PerformanceTrendDTO[] }) {
  if (!trends || trends.length === 0) {
    return (
      <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Growth Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground bg-muted/5">
          <p className="text-sm font-bold opacity-30 tracking-widest uppercase italic">Accumulating historical data...</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = trends.map(t => ({
    name: t.term.length > 8 ? t.term.substring(0, 8) : t.term,
    CGPA: t.score
  }));

  const minScore = Math.floor(Math.min(...trends.map(t => t.score)) - 1);


  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden flex flex-col">
      <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Performance Matrix
            </CardTitle>
            <CardDescription className="text-xs font-medium">Historical CGPA progression and growth trends</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" opacity={0.2} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} dy={10} />
            <YAxis domain={[Math.max(0, minScore), 10]} stroke="hsl(var(--muted-foreground))" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(var(--background), 0.8)', backdropFilter: 'blur(8px)', borderColor: 'hsl(var(--border))', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', border: '1px solid hsl(var(--border) / 0.5)' }}
              itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 900, fontSize: '14px' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
              cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2, strokeDasharray: '5 5' }}
            />
            <Area type="monotone" dataKey="CGPA" stroke="hsl(var(--primary))" strokeWidth={4} fillOpacity={1} fill="url(#colorCgpa)" activeDot={{ r: 8, strokeWidth: 0, fill: 'hsl(var(--primary))' }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────
// 5. Notice Board Widget
// ────────────────────────────────────────────────────────────
export function NoticeBoardWidget({ notices }: { notices?: RecentAnnouncementDTO[] }) {
  if (!notices || notices.length === 0) {
    return (
      <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Notice Board
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12 text-center text-muted-foreground min-h-[400px] flex items-center justify-center bg-muted/5">
          <p className="text-[10px] font-black tracking-[0.2em] uppercase opacity-40">No news is good news</p>
        </CardContent>
      </Card>
    );
  }

  const getNoticeConfig = (type: string) => {
    switch (type) {
      case 'ALERT': return { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/15' };
      case 'ACADEMIC': return { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/15' };
      default: return { icon: Bell, color: 'text-amber-500', bg: 'bg-amber-500/15' };
    }
  };

  return (
    <Card className="shadow-xl bg-card/40 backdrop-blur-xl border-border/50 h-full overflow-hidden flex flex-col">
      <CardHeader className="pb-4 border-b border-border/10 bg-muted/5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" /> Notice Board
            </CardTitle>
            <CardDescription className="text-xs font-medium">Broadcasts from the administrative matrix</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 flex-1 overflow-y-auto custom-scrollbar shadow-inner bg-muted/5 min-h-[400px]">
        <div className="space-y-3">
          {notices.map((notice) => {
            const { icon: Icon, color, bg } = getNoticeConfig(notice.type);
            return (
              <div key={notice.id} className="flex items-start gap-4 p-4 rounded-2xl bg-card/40 border border-border/40 hover:bg-muted/80 hover:border-border/60 transition-all group cursor-default">
                <div className={`shrink-0 p-3 rounded-xl shadow-inner transition-transform group-hover:scale-110 ${bg} ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-foreground leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">{notice.title}</h4>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/50 border border-border/50">
                      <p className="text-[9px] font-black text-muted-foreground uppercase opacity-80">{format(new Date(notice.date), "MMM d")}</p>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">{format(new Date(notice.date), "h:mm a")}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
