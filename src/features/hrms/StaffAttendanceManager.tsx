import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2, Clock3, UserX, Users, Search, CalendarDays,
  Filter, UserCheck, ChevronDown, ChevronUp, MapPin, Clock, ChevronLeft, ChevronRight, AlertTriangle,
  UserMinus, Timer
} from "lucide-react";
import AttendanceStatusBadge from "@/components/shared/AttendanceStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { attendanceService } from "@/services/attendance";
import { hrmsService } from "@/services/hrms";
import { getLocalDateString } from "@/lib/dateUtils";

function calculateHours(timeIn?: string, timeOut?: string): string | null {
  if (!timeIn || !timeOut) return null;
  const inParts = timeIn.toString().split(":").map(Number);
  const outParts = timeOut.toString().split(":").map(Number);
  
  const inDate = new Date(0, 0, 0, inParts[0] || 0, inParts[1] || 0);
  const outDate = new Date(0, 0, 0, outParts[0] || 0, outParts[1] || 0);
  
  let diffMs = outDate.getTime() - inDate.getTime();
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // Handle overnight shift
  
  const totalHrs = diffMs / (1000 * 60 * 60);
  return totalHrs.toFixed(1);
}



type StatusKey = "PRESENT" | "ABSENT" | "LATE" | "ON_LEAVE" | "HALF_DAY" | "NOT_MARKED";

function toStatus(shortCode?: string): StatusKey {
  if (!shortCode) return "NOT_MARKED";
  const code = shortCode.toUpperCase();
  if (code === "P") return "PRESENT";
  if (code === "A") return "ABSENT";
  if (code === "L") return "LATE";
  if (code === "LV") return "ON_LEAVE";
  if (code === "HD") return "HALF_DAY";
  return "NOT_MARKED";
}

function toShortCode(status: StatusKey): string | undefined {
  if (status === "PRESENT") return "P";
  if (status === "ABSENT") return "A";
  if (status === "LATE") return "L";
  if (status === "ON_LEAVE") return "LV";
  if (status === "HALF_DAY") return "HD";
  return undefined;
}

const STATUS_COLORS: Record<StatusKey, { bg: string; border: string; text: string; dot: string }> = {
  PRESENT: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500" },
  ABSENT: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", dot: "bg-red-500" },
  LATE: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-500" },
  ON_LEAVE: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-500" },
  HALF_DAY: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", dot: "bg-orange-500" },
  NOT_MARKED: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500", dot: "bg-gray-400" },
};

type StatusFilter = "ALL" | StatusKey;

export default function StaffAttendanceManager() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      if (search) setPage(0);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const handleStatusFilterChange = (v: StatusFilter) => {
    setStatusFilter(v);
    setPage(0);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["ams", "staff", "attendance", selectedDate, page, pageSize, statusFilter, debouncedSearch],
    queryFn: () =>
      attendanceService
        .listStaffAttendance({ 
          fromDate: selectedDate, 
          toDate: selectedDate, 
          page, 
          size: pageSize,
          status: statusFilter === "ALL" ? undefined : toShortCode(statusFilter),
          search: debouncedSearch || undefined
        })
        .then((r) => r.data),
  });

  const { data: unmarked } = useQuery({
    queryKey: ["ams", "staff", "unmarked", selectedDate],
    queryFn: () => attendanceService.getUnmarkedStaff(selectedDate).then((r) => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ["ams", "staff", "stats", selectedDate],
    queryFn: () => attendanceService.getDailyStaffStats(selectedDate).then((r) => r.data),
  });

  const { data: calendarEvents } = useQuery({
    queryKey: ["hrms", "calendar", "events", selectedDate],
    queryFn: () => {
      const d = new Date(selectedDate);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const ay = m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
      return hrmsService.listCalendarEvents({ month: m, academicYear: ay, fromDate: selectedDate, toDate: selectedDate }).then(r => r.data);
    },
  });

  const holidayEvent = useMemo(() => {
    return calendarEvents?.find(e => (e.dayType === "HOLIDAY" || e.dayType === "VACATION") && e.date === selectedDate);
  }, [calendarEvents, selectedDate]);

  const isHoliday = !!holidayEvent;

  const rows = useMemo(() => data?.content ?? [], [data?.content]);

  const stats = useMemo(() => {
    if (statsData) {
      return {
        total: statsData.totalMarked,
        present: statsData.present,
        absent: statsData.absent,
        late: statsData.late,
        halfDay: statsData.halfDay ?? 0,
        leave: statsData.onLeave,
        unmarked: statsData.unmarkedCount,
      };
    }
    return { total: 0, present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, unmarked: unmarked?.length ?? 0 };
  }, [statsData, unmarked]);

  const isFutureDate = selectedDate > getLocalDateString();

  const markAllPresentMut = useMutation({
    mutationFn: () => attendanceService.markAllPresent(selectedDate, testMode).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Marked ${data.marked} staff as Present (leave-holders skipped).`);
      queryClient.invalidateQueries({ queryKey: ["ams", "staff"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to mark all as present");
    },
  });

  const markAllAbsentMut = useMutation({
    mutationFn: () => attendanceService.markAllAbsent(selectedDate, testMode).then(r => r.data),
    onSuccess: (data) => {
      toast.success(`Marked ${data.marked} staff as Absent (leave-holders skipped).`);
      queryClient.invalidateQueries({ queryKey: ["ams", "staff"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to mark all as absent");
    },
  });

  const isBulkBusy = markAllPresentMut.isPending || markAllAbsentMut.isPending;
  const canBulkMark = !isBulkBusy && (unmarked?.length ?? 0) > 0 && !isHoliday && (!isFutureDate || testMode);

  const attendanceRate = stats.total > 0
    ? Math.round(((stats.present + stats.late) / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Staff Attendance</h2>
            <p className="text-sm text-muted-foreground">
              {stats.total} marked • {stats.unmarked} unmarked
            </p>
          </div>
        </div>
      </div>

      {isHoliday && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3">
          <CalendarDays className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Holiday: {holidayEvent?.title || "Non-Working Day"}</p>
            <p className="text-xs mt-0.5 text-amber-700">Attendance calculations and manual bulk-marking are paused for this date.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => { setSelectedDate(e.target.value); setPage(0); }}
            className="w-[160px] h-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => handleStatusFilterChange(v as StatusFilter)}>
          <SelectTrigger className="w-[150px] h-9">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PRESENT">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
            </SelectItem>
            <SelectItem value="ABSENT">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" /> Absent</span>
            </SelectItem>
            <SelectItem value="LATE">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> Late</span>
            </SelectItem>
            <SelectItem value="HALF_DAY">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" /> Half Day</span>
            </SelectItem>
            <SelectItem value="ON_LEAVE">
              <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500" /> On Leave</span>
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button 
          variant="default"
          size="sm" 
          className="h-9 bg-emerald-600 hover:bg-emerald-700" 
          disabled={!canBulkMark}
          onClick={() => markAllPresentMut.mutate()}
        >
          <UserCheck className="mr-1.5 h-3.5 w-3.5" />
          {markAllPresentMut.isPending ? "Marking..." : "Mark All Present"}
        </Button>

        <Button 
          variant="destructive"
          size="sm" 
          className="h-9" 
          disabled={!canBulkMark}
          onClick={() => markAllAbsentMut.mutate()}
        >
          <UserMinus className="mr-1.5 h-3.5 w-3.5" />
          {markAllAbsentMut.isPending ? "Marking..." : "Mark All Absent"}
        </Button>

        {(unmarked?.length ?? 0) > 0 && (
          <span className="text-xs text-muted-foreground">
            {unmarked?.length} unmarked staff • leave-holders auto-skipped
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="test-mode-toggle" className="text-xs text-muted-foreground cursor-pointer">Test Mode</label>
          <Switch
            id="test-mode-toggle"
            checked={testMode}
            onCheckedChange={setTestMode}
            className="data-[state=checked]:bg-amber-500"
          />
          {testMode && (
            <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 bg-amber-50">
              Future dates allowed
            </Badge>
          )}
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-500" />
            <div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3 flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-xl font-bold text-emerald-600">{stats.present}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Present</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3 flex items-center gap-3">
            <UserX className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Absent</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-xl font-bold text-amber-600">{stats.late}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Late</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3 flex items-center gap-3">
            <Timer className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-xl font-bold text-orange-600">{stats.halfDay}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Half Day</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-3 flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-violet-500" />
            <div>
              <p className="text-xl font-bold text-violet-600">{stats.leave}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Leave</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold text-primary">{attendanceRate}%</p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm">Loading attendance...</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground min-h-[400px]">
              <Users className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No records found</p>
              <p className="text-xs mt-1">
                {statusFilter !== "ALL" ? "Try changing the status filter." : "No attendance marked for this date yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[55vh] relative custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-muted shadow-sm">
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-[30%]">Staff</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Time In</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Time Out</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Hours</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Source</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Geo</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const status = toStatus(row.shortCode);
                    const colors = STATUS_COLORS[status];
                    const isExpanded = expandedRow === row.uuid;

                    return (
                      <tr
                        key={row.uuid ?? `${row.staffUuid}-${row.attendanceDate}`}
                        className={`transition-colors hover:bg-muted/20 cursor-pointer ${colors.bg}`}
                        onClick={() => setExpandedRow(isExpanded ? null : (row.uuid ?? null))}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${colors.border} ${colors.bg}`}>
                              <span className={`text-xs font-bold ${colors.text}`}>
                                {(row.staffName ?? "?")[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{row.staffName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground truncate">{row.jobTitle || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <AttendanceStatusBadge status={status} size="sm" />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {row.timeIn ? row.timeIn.toString().slice(0, 5) : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {row.timeOut ? row.timeOut.toString().slice(0, 5) : "—"}
                          {row.earlyLeave && row.earlyOutMinutes && (
                            <div className="mt-1">
                               <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-sans font-bold px-1.5 py-0.5 rounded inline-flex items-center tracking-tight">
                                 <AlertTriangle size={8} className="mr-1" />
                                 Early -{Math.floor(row.earlyOutMinutes / 60) > 0 ? `${Math.floor(row.earlyOutMinutes / 60)}h ` : ""}{row.earlyOutMinutes % 60 > 0 ? `${row.earlyOutMinutes % 60}m` : ""}
                               </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {row.totalHours ? `${row.totalHours}h` : 
                            (row.timeIn && row.timeOut) ? `${calculateHours(row.timeIn.toString(), row.timeOut.toString())}h` : "—"
                          }
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] font-mono">{row.source}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {row.geoVerified ? (
                            <MapPin className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-muted/10">
              <div className="text-xs text-muted-foreground">
                Showing {(data.number * data.size) + 1} to {Math.min((data.number + 1) * data.size, data.totalElements)} of {data.totalElements} results
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={data.first}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs font-medium px-3">
                  Page {data.number + 1} of {data.totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setPage(p => p + 1)}
                  disabled={data.last}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unmarked staff section */}
      {(unmarked?.length ?? 0) > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">Unmarked Staff ({unmarked?.length ?? 0})</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {(unmarked ?? []).slice(0, 20).map((s) => (
                <Badge
                  key={s.uuid ?? s.staffId}
                  variant="outline"
                  className="bg-white border-amber-200 text-amber-700 text-xs py-1"
                >
                  {s.firstName} {s.lastName}
                </Badge>
              ))}
              {(unmarked?.length ?? 0) > 20 && (
                <Badge variant="secondary" className="text-xs">
                  +{(unmarked?.length ?? 0) - 20} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
