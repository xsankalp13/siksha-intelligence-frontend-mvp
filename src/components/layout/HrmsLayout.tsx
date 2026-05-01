import { Outlet, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Award, ClipboardCheck, TrendingUp, Clock,
  CalendarDays, BookOpen, CheckSquare, BarChart3, Wallet, Users, CreditCard,
  ArrowUpCircle, ShieldCheck, FolderOpen, UserPlus, LogOut, Target,
  GraduationCap, DollarSign, Receipt, Timer, FileBarChart2, Settings,
  AlignLeft, Scale, AlarmClock,
} from "lucide-react";

const BASE = "/dashboard/admin/hrms";

interface NavItemDef {
  label: string;
  icon: React.ElementType;
  path: string;
  exact?: boolean;
}

const NAV_GROUPS: { group: string; items: NavItemDef[] }[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: `${BASE}/dashboard`, exact: true },
    ],
  },
  {
    group: "Workforce",
    items: [
      { label: "Designations", icon: Building2, path: `${BASE}/people/designations` },
      { label: "Grades", icon: Award, path: `${BASE}/people/grades` },
    ],
  },
  {
    group: "Attendance",
    items: [
      { label: "Daily", icon: ClipboardCheck, path: `${BASE}/attendance`, exact: true },
      { label: "Trends", icon: TrendingUp, path: `${BASE}/attendance/trends` },
      { label: "Shifts", icon: Clock, path: `${BASE}/attendance/shifts` },
      { label: "Late Clock-In", icon: AlarmClock, path: `${BASE}/attendance/late-clockin` },
    ],
  },
  {
    group: "Leave",
    items: [
      { label: "Calendar", icon: CalendarDays, path: `${BASE}/leaves/calendar` },
      { label: "Leave Types", icon: AlignLeft, path: `${BASE}/leaves/types` },
      { label: "Templates", icon: BookOpen, path: `${BASE}/leaves/templates` },
      { label: "Applications", icon: CheckSquare, path: `${BASE}/leaves/applications` },
      { label: "Balances", icon: Scale, path: `${BASE}/leaves/balances` },
    ],
  },
  {
    group: "Compensation",
    items: [
      { label: "Components", icon: Wallet, path: `${BASE}/compensation/components` },
      { label: "Templates", icon: BarChart3, path: `${BASE}/compensation/templates` },
      { label: "Mappings", icon: Users, path: `${BASE}/compensation/mappings` },
    ],
  },
  {
    group: "Payroll",
    items: [
      { label: "Payroll Runs", icon: CreditCard, path: `${BASE}/payroll` },
      { label: "Bank Details", icon: Building2, path: `${BASE}/bank-details` },
    ],
  },
  {
    group: "Career",
    items: [
      { label: "Promotions", icon: ArrowUpCircle, path: `${BASE}/promotions` },
      { label: "Approvals", icon: ShieldCheck, path: `${BASE}/approvals`, exact: true },
    ],
  },
  {
    group: "Lifecycle",
    items: [
      { label: "Documents", icon: FolderOpen, path: `${BASE}/documents` },
      { label: "Onboarding", icon: UserPlus, path: `${BASE}/onboarding` },
      { label: "Exit & FnF", icon: LogOut, path: `${BASE}/exit` },
    ],
  },
  {
    group: "Growth",
    items: [
      { label: "Performance", icon: Target, path: `${BASE}/performance` },
      { label: "Training", icon: GraduationCap, path: `${BASE}/training` },
    ],
  },
  {
    group: "Benefits",
    items: [
      { label: "Loans", icon: DollarSign, path: `${BASE}/loans` },
      { label: "Expenses", icon: Receipt, path: `${BASE}/expenses` },
      { label: "Overtime", icon: Timer, path: `${BASE}/overtime` },
    ],
  },
  {
    group: "Compliance",
    items: [
      { label: "Reports", icon: FileBarChart2, path: `${BASE}/reports` },
      { label: "Statutory Setup", icon: Settings, path: `${BASE}/settings` },
    ],
  },
];

export default function HrmsLayout() {
  const location = useLocation();

  return (
    <div className="flex -m-6 h-[calc(100vh-4rem)]">
      {/* HRMS sub-sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-border bg-card/50 flex flex-col overflow-y-auto">
        <div className="px-4 py-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">HRMS</h2>
          <p className="text-xs text-muted-foreground">Human Resource Management</p>
        </div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.group} className="mb-1">
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.group}
              </p>
              {group.items.map((item) => {
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-1.5 text-sm transition-colors",
                      isActive
                        ? "text-primary font-medium bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </div>
    </div>
  );
}
