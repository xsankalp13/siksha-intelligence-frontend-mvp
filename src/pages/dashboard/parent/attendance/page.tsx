import { Calendar as CalendarIcon, CheckCircle2, XCircle, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { useChildAttendance, useApplyForLeave } from "@/features/parent/queries/useParentQueries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useChildStore } from "@/features/parent/stores/useChildStore";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export default function AttendancePage() {
  const { selectedChildId } = useChildStore();
  const { data: attendance, isLoading, isError } = useChildAttendance();
  const { mutate: applyForLeave, isPending } = useApplyForLeave();

  const [isOpen, setIsOpen] = useState(false);
  const [leaveData, setLeaveData] = useState({
    leaveType: "SICK",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChildId) return;

    applyForLeave(
      { childId: selectedChildId, payload: leaveData },
      {
        onSuccess: () => {
          toast.success("Leave application submitted successfully!");
          setIsOpen(false);
          setLeaveData({ leaveType: "SICK", fromDate: "", toDate: "", reason: "" });
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || "Failed to submit leave application.");
        }
      }
    );
  };

  if (!selectedChildId) {
    return <div className="p-6 text-center text-muted-foreground">Please select a child to view attendance records.</div>;
  }

  if (isLoading) {
    return <div className="p-6 animate-pulse space-y-6">
      <div className="h-40 bg-muted rounded-2xl w-full" />
      <div className="h-64 bg-muted rounded-2xl w-full" />
    </div>;
  }

  if (isError || !attendance) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl bg-rose-500/5 border-rose-500/20">
        <AlertTriangle className="h-10 w-10 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold">Failed to load attendance records</h3>
      </div>
    );
  }

  const isGood = attendance.attendancePercentage >= 80;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Attendance Ledger
          </h1>
          <p className="text-muted-foreground mt-1">Real-time attendance tracking and leave management.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Apply for Leave</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleApplyLeave} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select
                  value={leaveData.leaveType}
                  onValueChange={(val) => setLeaveData({ ...leaveData, leaveType: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SICK">Sick Leave</SelectItem>
                    <SelectItem value="CASUAL">Casual Leave</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input 
                    type="date" 
                    required 
                    value={leaveData.fromDate}
                    onChange={(e) => setLeaveData({ ...leaveData, fromDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input 
                    type="date" 
                    required 
                    value={leaveData.toDate}
                    onChange={(e) => setLeaveData({ ...leaveData, toDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea 
                  placeholder="Please state the reason for the leave" 
                  rows={4} 
                  required 
                  value={leaveData.reason}
                  onChange={(e) => setLeaveData({ ...leaveData, reason: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>{isPending ? 'Submitting...' : 'Submit Application'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-b-4 border-b-primary">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase">Present Days</p>
              <h2 className="text-3xl font-bold">{attendance.presentDays}</h2>
            </div>
          </div>
        </Card>
        
        <Card className="p-6 border-b-4 border-b-rose-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
              <XCircle className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase">Absent Days</p>
              <h2 className="text-3xl font-bold">{attendance.absentDays}</h2>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-b-4 border-b-amber-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
              <Clock className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase">Late Days</p>
              <h2 className="text-3xl font-bold">{attendance.lateDays}</h2>
            </div>
          </div>
        </Card>

        <Card className={cn("p-6 border-b-4", isGood ? "border-b-emerald-500" : "border-b-rose-500")}>
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", isGood ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
              <TrendingUp className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase">Overall %</p>
              <h2 className="text-3xl font-bold">{attendance.attendancePercentage.toFixed(1)}%</h2>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Monthly Breakdown</h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={attendance.monthlyBreakdown} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="present" name="Present" stackId="a" fill="var(--primary)" radius={[0, 0, 4, 4]} />
              <Bar dataKey="late" name="Late" stackId="a" fill="#f59e0b" />
              <Bar dataKey="absent" name="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
