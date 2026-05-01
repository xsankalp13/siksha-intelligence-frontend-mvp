import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { attendanceService } from '@/services/attendance';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Users, UserCheck, UserX, Clock, Loader2 } from 'lucide-react';

export default function AttendanceTrendDashboard() {
  const [days, setDays] = useState('14');
  const [type, setType] = useState('staff');
  
  const end = new Date();
  const start = subDays(end, parseInt(days) - 1);
  
  const fromDate = format(start, 'yyyy-MM-dd');
  const toDate = format(end, 'yyyy-MM-dd');
  const dateRange = eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));

  // Fetch Attendance Data
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['ams', 'staff', 'trends', fromDate, toDate],
    queryFn: () => attendanceService.listStaffAttendance({
      fromDate, toDate, size: 2000
    }).then(r => r.data.content),
    enabled: type === 'staff' || type === 'both'
  });

  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ['ams', 'student', 'trends', fromDate, toDate],
    queryFn: () => attendanceService.listStudentAttendance({
      fromDate, toDate, size: 5000
    }).then(r => r.data.content),
    enabled: type === 'student' || type === 'both'
  });

  const isLoading = (type === 'staff' && staffLoading) || 
                    (type === 'student' && studentLoading) || 
                    (type === 'both' && (staffLoading || studentLoading));

  const chartData = useMemo(() => {
    return dateRange.map(date => {
      const dayStaff = (staffData || []).filter(r => r.attendanceDate === date);
      const dayStudent = (studentData || []).filter(r => r.attendanceDate === date);
      
      return {
        name: format(new Date(date), 'MMM dd'),
        staffPresent: dayStaff.filter(r => r.shortCode === 'P').length,
        staffAbsent: dayStaff.filter(r => r.shortCode === 'A' || r.shortCode === 'LV').length,
        staffLate: dayStaff.filter(r => r.shortCode === 'L').length,
        studentPresent: dayStudent.filter(r => r.attendanceTypeShortCode === 'P').length,
        studentAbsent: dayStudent.filter(r => r.attendanceTypeShortCode === 'A' || r.attendanceTypeShortCode === 'LV').length,
        studentLate: dayStudent.filter(r => r.attendanceTypeShortCode === 'L').length,
      };
    });
  }, [dateRange, staffData, studentData]);

  // Summary stats
  const latestStaffPresent = chartData[chartData.length - 1]?.staffPresent || 0;
  const latestStudentPresent = chartData[chartData.length - 1]?.studentPresent || 0;
  const totalStaffAtEnd = latestStaffPresent + (chartData[chartData.length - 1]?.staffAbsent || 0) + (chartData[chartData.length - 1]?.staffLate || 0);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              📈
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Attendance Trends</h2>
              <p className="text-sm text-white/70">Monitor daily check-in patterns and absent rates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[150px] bg-white/20 border-white/30 text-white h-9 backdrop-blur-sm">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">All Entities</SelectItem>
                <SelectItem value="staff">Staff Only</SelectItem>
                <SelectItem value="student">Students Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="w-[140px] bg-white/20 border-white/30 text-white h-9 backdrop-blur-sm">
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 Days</SelectItem>
                <SelectItem value="14">Last 14 Days</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Card className="flex h-[400px] items-center justify-center border-dashed">
          <div className="flex flex-col items-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Aggregating attendance data...</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff Present (Today)</CardTitle>
                <div className="rounded-lg bg-emerald-50 p-1.5"><UserCheck className="h-4 w-4 text-emerald-500" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{latestStaffPresent}</div>
                <p className="text-xs text-muted-foreground mt-1">Out of {totalStaffAtEnd} active staff</p>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-rose-400 to-red-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff Absent (Today)</CardTitle>
                <div className="rounded-lg bg-rose-50 p-1.5"><UserX className="h-4 w-4 text-rose-500" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600">{chartData[chartData.length - 1]?.staffAbsent || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Includes on-leave staff</p>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Student Present</CardTitle>
                <div className="rounded-lg bg-blue-50 p-1.5"><Users className="h-4 w-4 text-blue-500" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{latestStudentPresent}</div>
                <p className="text-xs text-muted-foreground mt-1">Across all sections</p>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff Late (Avg)</CardTitle>
                <div className="rounded-lg bg-amber-50 p-1.5"><Clock className="h-4 w-4 text-amber-500" /></div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">
                  {Math.round(chartData.reduce((acc, curr) => acc + curr.staffLate, 0) / chartData.length) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Check-ins after threshold</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {(type === 'staff' || type === 'both') && (
              <Card>
                <CardHeader>
                  <CardTitle>Staff Attendance Trends</CardTitle>
                  <CardDescription>Present vs Absent across the last {days} days</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorStaffP" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorStaffA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Area type="monotone" name="Present" dataKey="staffPresent" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorStaffP)" />
                      <Area type="monotone" name="Absent/Leave" dataKey="staffAbsent" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorStaffA)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {(type === 'student' || type === 'both') && (
              <Card>
                <CardHeader>
                  <CardTitle>Student Attendance Trends</CardTitle>
                  <CardDescription>Present vs Absent/Late across the last {days} days</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f3f4f6' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar name="Present" dataKey="studentPresent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar name="Absent" dataKey="studentAbsent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar name="Late" dataKey="studentLate" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="empty" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
            
            {type === 'staff' && (
              <Card>
                <CardHeader>
                  <CardTitle>Staff Lateness Pattern</CardTitle>
                  <CardDescription>Number of late check-ins over time</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{ fill: '#f3f4f6' }} />
                      <Bar name="Late Staff" dataKey="staffLate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
