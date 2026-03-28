import {
  LayoutDashboard,
  GraduationCap,
  Users,
  Settings,
  BookOpen,
  CalendarCheck,
  FileText,
  Receipt,
  Bell,
  User,
  CalendarDays,
  Map,
  Clock,
  DoorOpen
} from "lucide-react";

export type NavItem = {
  label: string;
  path: string;
  icon: React.ElementType;
  end?: boolean;
};

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard/admin",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Students",
    path: "/dashboard/admin/students",
    icon: GraduationCap,
  },
  { label: "Staff", path: "/dashboard/admin/staff", icon: Users },
  { label: "Timetable", path: "/dashboard/admin/timetable", icon: CalendarDays },
  { label: "Timeslots", path: "/dashboard/admin/timeslots", icon: Clock },
  { label: "Curriculum", path: "/dashboard/admin/curriculum", icon: Map },
  { label: "Rooms", path: "/dashboard/admin/rooms", icon: DoorOpen },
  { label: "Settings", path: "/dashboard/admin/settings", icon: Settings },
];

export const STUDENT_NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    path: "/dashboard/student",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "My Profile",
    path: "/dashboard/student/profile",
    icon: User,
  },
  {
    label: "Academics",
    path: "/dashboard/student/academics",
    icon: BookOpen,
  },
  {
    label: "Attendance",
    path: "/dashboard/student/attendance",
    icon: CalendarCheck,
  },
  {
    label: "Assignments",
    path: "/dashboard/student/assignments",
    icon: FileText,
  },
  {
    label: "Finances",
    path: "/dashboard/student/finances",
    icon: Receipt,
  },
  {
    label: "Notice Board",
    path: "/dashboard/student/notices",
    icon: Bell,
  },
];
