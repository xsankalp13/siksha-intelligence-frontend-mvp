import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapContainer, TileLayer, Circle, Marker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { settingsService } from "@/features/super-admin/services/superAdminService";
import { attendanceService } from "@/services/attendance";
import { hrmsService } from "@/services/hrms";
import { shiftService } from "@/services/shiftService";
import { haversineMeters } from "@/lib/geo";
import { useTeacherSchedule, useTeacherDashboardSummary } from "@/features/teacher/queries/useTeacherQueries";
import { handleAttendanceError } from "@/features/attendance/utils/attendanceError";
import { getLocalDateString } from "@/lib/dateUtils";
import { MapPin, Clock, LogIn, LogOut, CheckCircle2, Lock, AlertTriangle } from "lucide-react";

// Fix vector icon bug in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
  });
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

export default function StaffSelfCheckIn() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("");
  const { data: schedule } = useTeacherSchedule();
  const { data: summary } = useTeacherDashboardSummary();
  const today = getLocalDateString();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionType, setActionType] = useState<"IN" | "OUT" | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceToSchool, setDistanceToSchool] = useState<number | null>(null);
  const [earlyMinutesEst, setEarlyMinutesEst] = useState<number | null>(null);

  const { data: attendanceSettings, isError: settingsError } = useQuery({
    queryKey: ["super", "settings", "attendance"],
    queryFn: () => settingsService.getSettings("ATTENDANCE").then((res) => res.data),
    staleTime: 5 * 60 * 1000,
    retry: false, // Fail open quickly on 403
  });

  const { data: todayRecord, isLoading: recordLoading } = useQuery({
    queryKey: ["ams", "staff", "my-attendance", "today", schedule?.staffUuid],
    queryFn: () => attendanceService.listStaffAttendance({
      staffUuid: schedule?.staffUuid,
      fromDate: today,
      toDate: today,
      size: 1
    }).then(r => r.data.content[0]),
    enabled: !!schedule?.staffUuid
  });

  const { data: calendarEvents } = useQuery({
    queryKey: ["hrms", "calendar", "events", today],
    queryFn: () => {
      const d = new Date(today);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const ay = m >= 4 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
      return hrmsService.listCalendarEvents({ month: m, academicYear: ay, fromDate: today, toDate: today }).then(r => r.data);
    },
  });


  const holidayEvent = useMemo(() => {
    return calendarEvents?.find(e => (e.dayType === "HOLIDAY" || e.dayType === "VACATION") && e.date === today);
  }, [calendarEvents, today]);

  const isHoliday = !!holidayEvent;

  const { data: shiftMapping } = useQuery({
    queryKey: ["ams", "shifts", "mappings", "staff", schedule?.staffUuid],
    queryFn: () => shiftService.getStaffShiftMapping(schedule!.staffUuid).then((r: any) => r.data),
    enabled: !!schedule?.staffUuid,
  });

  const geo = useMemo(() => {
    if (settingsError) return { enabled: false, latitude: 0, longitude: 0, radiusMeters: 200 };
    const settings = (attendanceSettings as Record<string, { key: string; value: string }[]> | undefined)?.ATTENDANCE ?? [];
    const getNum = (key: string, fallback: number) => {
      const value = settings.find((s) => s.key === key)?.value;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };
    return {
      enabled: settings.find((s) => s.key === "attendance.geofence.enabled")?.value !== "false",
      latitude: getNum("attendance.geofence.latitude", 0),
      longitude: getNum("attendance.geofence.longitude", 0),
      radiusMeters: getNum("attendance.geofence.radius.meters", 200),
    };
  }, [attendanceSettings, settingsError]);

  const initiateAction = async (type: "IN" | "OUT") => {
    setActionType(type);
    setStatus("Acquiring GPS location...");
    try {
      const pos = await getCurrentPosition();
      const { latitude, longitude } = pos.coords;
      setUserPos({ lat: latitude, lng: longitude });

      if (geo.enabled && geo.latitude && geo.longitude) {
        const dist = haversineMeters(latitude, longitude, geo.latitude, geo.longitude);
        setDistanceToSchool(dist);
        if (dist > geo.radiusMeters) {
          toast.error(`You are ${Math.round(dist)}m away from school. Allowed radius is ${geo.radiusMeters}m.`);
          setStatus("Out of bounds");
          return;
        }
      } else {
        setDistanceToSchool(null);
      }
      
      if (type === "OUT" && shiftMapping?.shiftEndTime) {
        const currentTime = new Date().toTimeString().slice(0, 8);
        if (currentTime < shiftMapping.shiftEndTime) {
          const outParts = currentTime.split(":").map(Number);
          const endParts = shiftMapping.shiftEndTime.split(":").map(Number);
          const outMins = outParts[0] * 60 + outParts[1];
          const endMins = endParts[0] * 60 + endParts[1];
          setEarlyMinutesEst(Math.max(0, endMins - outMins));
        } else {
          setEarlyMinutesEst(null);
        }
      } else {
        setEarlyMinutesEst(null);
      }
      
      setConfirmOpen(true);
      setStatus("Ready to confirm");
    } catch (e: any) {
      setStatus("GPS failed");
      toast.error(e.message || "Failed to get location");
    }
  };

  const processAction = useMutation({
    mutationFn: async () => {
      if (!schedule?.staffUuid || !userPos) throw new Error("Missing staff info or location");
      
      const currentTime = new Date().toTimeString().slice(0, 8);
      
      if (actionType === "IN") {
        return attendanceService.createStaffAttendance({
          staffUuid: schedule.staffUuid,
          attendanceDate: today,
          attendanceShortCode: "P",
          source: "SELF_CAPTURE",
          timeIn: currentTime,
          latitude: userPos.lat,
          longitude: userPos.lng,
        });
      } else if (actionType === "OUT" && todayRecord?.uuid) {
        return attendanceService.updateStaffAttendance(todayRecord.uuid, {
          staffUuid: schedule.staffUuid,
          attendanceDate: today,
          attendanceShortCode: todayRecord.shortCode || "P",
          source: "SELF_CAPTURE",
          timeIn: todayRecord.timeIn,
          timeOut: currentTime,
          notes: todayRecord.notes,
          latitude: userPos.lat,
          longitude: userPos.lng,
        });
      }
    },
    onSuccess: (response) => {
      setStatus(actionType === "IN" ? "Checked in successfully" : "Checked out successfully");
      toast.success(actionType === "IN" ? "Check-In Recorded" : "Check-Out Recorded");

      // Optimistically set the local query cache with the response data
      // so the button state updates immediately without waiting for refetch
      const record = response?.data;
      if (record) {
        qc.setQueryData(
          ["ams", "staff", "my-attendance", "today", schedule?.staffUuid],
          record
        );
      }

      // Invalidate all related attendance queries so admin dashboards refresh too
      qc.invalidateQueries({ queryKey: ["ams", "staff"] });
      setConfirmOpen(false);
    },
    onError: (error: unknown) => {
      setStatus("Action failed");
      handleAttendanceError(error, `Failed to check ${actionType?.toLowerCase()}`);
    },
  });

  if (recordLoading) return <div className="rounded-2xl border border-border bg-card p-6 min-h-[300px] flex items-center justify-center text-sm text-muted-foreground">Loading attendance status...</div>;

  const isCheckedIn = !!todayRecord?.timeIn;
  const isCheckedOut = !!todayRecord?.timeOut;
  const isOnLeaveToday = summary?.isOnLeaveToday;

  return (
    <>
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 p-6 shadow-sm flex flex-col justify-between overflow-hidden relative">
        <div className="absolute -right-10 -top-10 text-primary/5 opacity-50 z-0">
          <MapPin size={160} />
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold tracking-tight text-foreground">Self Check-In</h3>
            {todayRecord?.geoVerified && (
              <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                <CheckCircle2 size={14} className="mr-1" /> Geo-Verified
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-background rounded-xl p-4 border border-border/50 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
              <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center"><LogIn size={14} className="mr-1" /> Clock In</p>
              <p className={`text-2xl font-bold ${todayRecord?.timeIn ? "text-foreground" : "text-muted-foreground/30"}`}>
                {todayRecord?.timeIn ? todayRecord.timeIn.slice(0, 5) : "--:--"}
              </p>
            </div>
            <div className="bg-background rounded-xl p-4 border border-border/50 shadow-sm relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
              <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center"><LogOut size={14} className="mr-1" /> Clock Out</p>
              <p className={`text-2xl font-bold ${todayRecord?.timeOut ? "text-foreground" : "text-muted-foreground/30"}`}>
                {todayRecord?.timeOut ? todayRecord.timeOut.slice(0, 5) : "--:--"}
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {isOnLeaveToday ? (
              <div className="w-full bg-rose-50 text-rose-700 py-4 px-3 rounded-xl flex flex-col items-center justify-center border border-rose-100/50 font-medium shadow-sm text-center">
                <Lock className="mb-2 text-rose-500" size={24} />
                <span className="text-sm">Check-In Disabled</span>
                <span className="text-xs font-normal opacity-80">You are currently out on an approved leave today.</span>
              </div>
            ) : isHoliday ? (
              <div className="w-full bg-amber-50 text-amber-700 py-4 px-3 rounded-xl flex flex-col items-center justify-center border border-amber-100/50 font-medium shadow-sm text-center">
                <Lock className="mb-2 text-amber-500" size={24} />
                <span className="text-sm">Holiday Today</span>
                <span className="text-xs font-normal opacity-80">{holidayEvent?.title || "Non-Working Day"}</span>
              </div>
            ) : !isCheckedIn ? (
              <Button 
                className="w-full text-base py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-[0.98]" 
                onClick={() => initiateAction("IN")}
                disabled={status === "Acquiring GPS location..."}
              >
                <LogIn className="mr-2" /> 
                {status === "Acquiring GPS location..." ? "Acquiring GPS..." : "Record Check-In"}
              </Button>
            ) : !isCheckedOut ? (
              <Button 
                className="w-full text-base py-6 bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all active:scale-[0.98]" 
                onClick={() => initiateAction("OUT")}
                disabled={status === "Acquiring GPS location..."}
              >
                <LogOut className="mr-2" /> 
                {status === "Acquiring GPS location..." ? "Acquiring GPS..." : "Record Check-Out"}
              </Button>
            ) : (
              <div className="w-full bg-emerald-50 text-emerald-700 py-4 rounded-xl flex flex-col items-center justify-center border border-emerald-100 font-medium shadow-sm">
                <CheckCircle2 className="mb-2" size={24} />
                Shift Complete
              </div>
            )}
            
            {status && !confirmOpen && !isOnLeaveToday && (
              <p className="text-xs text-center text-muted-foreground animate-pulse">{status}</p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(open) => !processAction.isPending && setConfirmOpen(open)}>
        <DialogContent className="sm:max-w-md max-w-[95vw] p-0 overflow-hidden border-0 shadow-2xl">
          <div className="h-56 w-full relative bg-muted">
            {userPos && (
              <MapContainer 
                center={[userPos.lat, userPos.lng]} 
                zoom={geo.enabled && geo.latitude ? 16 : 14} 
                zoomControl={false}
                style={{ height: "100%", width: "100%", zIndex: 10 }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[userPos.lat, userPos.lng]} />
                {geo.enabled && geo.latitude !== 0 && (
                  <>
                    <Circle 
                      center={[geo.latitude, geo.longitude]} 
                      radius={geo.radiusMeters} 
                      pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }} 
                    />
                    <RecenterMap lat={userPos.lat} lng={userPos.lng} />
                  </>
                )}
              </MapContainer>
            )}
            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 pointer-events-none z-20" />
          </div>
          
          <div className="p-6 pt-5 bg-background">
            <DialogHeader className="mb-5">
              <DialogTitle className="text-xl inline-flex items-center gap-2">
                {actionType === "IN" ? <span className="text-primary"><LogIn /></span> : <span className="text-amber-500"><LogOut /></span>}
                Confirm {actionType === "IN" ? "Check-In" : "Check-Out"}
              </DialogTitle>
              <DialogDescription>
                {distanceToSchool !== null 
                  ? `You are ${Math.round(distanceToSchool)}m away from the school center. `
                  : "GPS location acquired successfully."}
                {distanceToSchool !== null && distanceToSchool <= geo.radiusMeters 
                  ? "You are within the allowed zone."
                  : ""}
              </DialogDescription>
            </DialogHeader>

            {earlyMinutesEst !== null && earlyMinutesEst > 0 && actionType === "OUT" && (
              <div className="mb-6 bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-200">
                <p className="font-bold text-sm flex items-center mb-1">
                  <AlertTriangle className="mr-2 h-4 w-4 text-rose-600" />
                  Early Check-Out Warning
                </p>
                <p className="text-xs">
                  Your shift ends at <strong>{shiftMapping?.shiftEndTime.slice(0,5)}</strong>. 
                  You are checking out <strong>{Math.floor(earlyMinutesEst / 60) > 0 ? `${Math.floor(earlyMinutesEst / 60)}h ` : ""}{earlyMinutesEst % 60 > 0 ? `${earlyMinutesEst % 60}m ` : ""}</strong> early. This will be flagged on your attendance report.
                </p>
              </div>
            )}
            
            <div className="flex bg-muted/40 rounded-xl p-4 mb-6 items-center justify-between border border-border/50">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border mr-3 shadow-sm">
                  <Clock className="text-muted-foreground" size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Time</p>
                  <p className="font-semibold text-foreground">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-between items-center sm:flex-row flex-col-reverse">
              <Button 
                variant="outline" 
                className="w-full sm:flex-1" 
                onClick={() => setConfirmOpen(false)}
                disabled={processAction.isPending}
              >
                Cancel
              </Button>
              <Button 
                className={`w-full sm:flex-1 ${actionType === "OUT" ? (earlyMinutesEst !== null && earlyMinutesEst > 0 ? "bg-rose-500 hover:bg-rose-600 focus:ring-rose-500" : "bg-amber-500 hover:bg-amber-600 focus:ring-amber-500") : ""}`}
                onClick={() => processAction.mutate()}
                disabled={processAction.isPending}
              >
                {processAction.isPending 
                  ? "Recording..." 
                  : earlyMinutesEst !== null && earlyMinutesEst > 0 ? "Confirm Early Leave" : `Confirm ${actionType === "IN" ? "Check-In" : "Check-Out"}`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
