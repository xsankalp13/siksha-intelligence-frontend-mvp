
import {
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; value: number; color: string; payload?: any}>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-lg text-xs min-w-[140px] z-50">
      {label && <p className="mb-2 font-semibold text-foreground">{label}</p>}
      {payload.map((p, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full shadow-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-foreground">
            {typeof p.value === 'number' && p.name.includes("Amount") ? `₹${p.value.toLocaleString('en-IN')}` : p.value}
            {p.name.includes("%") ? "%" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Mini Sparkline for KPIs ─────────────────────────────────────────────
export function MiniSparkline({ data, datakey, color }: { data: any[]; datakey: string; color: string }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${datakey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.5} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={datakey} stroke={color} strokeWidth={2} fill={`url(#grad-${datakey})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Finance & Payroll Master Chart ──────────────────────────────────────
export function RevenuePayrollChart({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) return <div className="h-72 w-full animate-pulse rounded-xl bg-muted" />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} iconType="circle" />
        <Bar dataKey="expected" name="Expected Fee" fill="#f1f5f9" barSize={20} radius={[4, 4, 0, 0]} />
        <Area type="monotone" dataKey="collected" name="Revenue Collected" stroke="#10b981" fill="url(#revGrad)" strokeWidth={3} />
        <Line type="monotone" dataKey="payroll" name="Payroll Outflow" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444', strokeWidth: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── Live Attendance Trends (Staff vs Students) ────────────────────────
export function AttendanceTrendChart({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) return <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="studentAtt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="staffAtt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v) => `${v}%`} domain={['dataMin - 5', 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} iconType="circle" />
        <Area type="monotone" dataKey="student" name="Student %" stroke="#3b82f6" fill="url(#studentAtt)" strokeWidth={2} />
        <Area type="monotone" dataKey="staff" name="Staff %" stroke="#8b5cf6" fill="url(#staffAtt)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Demographics Pie Chart ────────────────────────────────────────────
export function DemographicsPieChart({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) return <div className="h-48 w-full animate-pulse rounded-full bg-muted" />;
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-semibold text-foreground ml-1">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
