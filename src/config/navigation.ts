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
  Home,
  Map,
  ClipboardCheck,
  FileCheck,
  Award,
  Archive,

  Clock,
  DoorOpen,
  Shield,
  Activity,
  ClipboardList,
  Terminal,
  Settings2,
  Lock,
  CreditCard,
  Briefcase,
  QrCode,
  UserCheck,
  Bus,
  MessageSquare,
  ClipboardSignature,
  HeartPulse,
  Radio,
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

  { label: "Examinations", path: "/dashboard/admin/examinations", icon: ClipboardCheck },

  { label: "Rooms", path: "/dashboard/admin/rooms", icon: DoorOpen },
  {
    label: "HRMS",
    path: "/dashboard/admin/hrms",
    icon: Briefcase,
  },
  { label: "Finance", path: "/dashboard/admin/finance", icon: Receipt },

  { label: "Transport", path: "/dashboard/admin/transport", icon: Bus },
  { label: "Admission", path: "/dashboard/admin/admission", icon: ClipboardSignature },
  { label: "Discipline", path: "/dashboard/admin/discipline", icon: MessageSquare },
  { label: "Settings", path: "/dashboard/admin/settings", icon: Settings },
  { label: "ID Cards", path: "/dashboard/admin/id-cards", icon: CreditCard },
  { label: "Visitor Logs", path: "/dashboard/admin/visitor-logs", icon: ClipboardList },
  { label: "Pickup Logs", path: "/dashboard/admin/pickup-logs", icon: QrCode },
];

export const APPLICANT_NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    path: "/dashboard/applicant",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Admission Enquiry",
    path: "/dashboard/applicant/enquiry",
    icon: MessageSquare,
  },
  {
    label: "Admission Form",
    path: "/dashboard/applicant/form",
    icon: ClipboardSignature,
  },
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
    label: "Timetable",
    path: "/dashboard/student/timetable",
    icon: CalendarDays,
  },
  {
    label: "Pickup QR",
    path: "/dashboard/student/pickup",
    icon: QrCode,
  },
  {
    label: "Academics",
    path: "/dashboard/student/academics",
    icon: BookOpen,
  },
  {
    label: "My Results",
    path: "/dashboard/student/results",
    icon: Award,
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
  {
    label: "Discipline",
    path: "/dashboard/student/discipline",
    icon: MessageSquare,
  },
  {
    label: "Past Papers",
    path: "/dashboard/student/past-papers",
    icon: Archive,
  },
  {
    label: "My Admit Cards",
    path: "/dashboard/student/admit-cards",
    icon: FileCheck,
  },
];

export const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    path: "/dashboard/super-admin",
    icon: LayoutDashboard,
    end: true,
  },
  { label: "Users", path: "/dashboard/super-admin/users", icon: Users },
  { label: "Roles & RBAC", path: "/dashboard/super-admin/rbac", icon: Shield },
  { label: "System Health", path: "/dashboard/super-admin/health", icon: Activity },
  { label: "Audit Logs", path: "/dashboard/super-admin/audit-logs", icon: ClipboardList },
  { label: "App Logs", path: "/dashboard/super-admin/logs", icon: Terminal },
  { label: "Configuration", path: "/dashboard/super-admin/configuration", icon: Settings2 },
  { label: "Security", path: "/dashboard/super-admin/security", icon: Lock },
  { label: "Users", path: "/dashboard/super-admin/users", icon: Users },
  { label: "Roles & RBAC", path: "/dashboard/super-admin/rbac", icon: Shield },
  { label: "System Health", path: "/dashboard/super-admin/health", icon: Activity },
  { label: "Audit Logs", path: "/dashboard/super-admin/audit-logs", icon: ClipboardList },
  { label: "App Logs", path: "/dashboard/super-admin/logs", icon: Terminal },
  { label: "Configuration", path: "/dashboard/super-admin/configuration", icon: Settings2 },
  { label: "Security", path: "/dashboard/super-admin/security", icon: Lock },
];

export const TEACHER_NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    path: "/dashboard/teacher",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "My Class",
    path: "/dashboard/teacher/my-class",
    icon: Home,
  },
  {
    label: "Attendance",
    path: "/dashboard/teacher/self-attendance",
    icon: UserCheck,
  },
  {
    label: "Take Attendance",
    path: "/dashboard/teacher/attendance",
    icon: CalendarCheck,
  },
  {
    label: "Classes",
    path: "/dashboard/teacher/classes",
    icon: Users,
  },
  {
    label: "Profile",
    path: "/dashboard/teacher/profile",
    icon: User,
  },
  {
    label: "Lecture Logs",
    path: "/dashboard/teacher/lecture-logs",
    icon: FileText,
  },
  {
    label: "My HR",
    path: "/dashboard/teacher/my-hr",
    icon: Briefcase,

  },
  {
    label: "Evaluation",
    path: "/dashboard/teacher/evaluation",
    icon: FileCheck,
  },
  {
    label: "Discipline",
    path: "/dashboard/teacher/discipline",
    icon: MessageSquare,
  },
];

export const SECURITY_GUARD_NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    path: "/dashboard/security-guard",
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: "Visitor Management",
    path: "/dashboard/security-guard/visitor-management",
    icon: Shield,
  },
  {
    label: "Pickup Scanner",
    path: "/dashboard/security-guard/pickup-scanner",
    icon: QrCode,
  },
];

export const PARENT_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard/parent", icon: LayoutDashboard, end: true },
  { label: "Academics", path: "/dashboard/parent/academics", icon: BookOpen },
  { label: "Attendance", path: "/dashboard/parent/attendance", icon: CalendarCheck },
  { label: "Homework", path: "/dashboard/parent/homework", icon: FileText },
  { label: "Fees", path: "/dashboard/parent/fees", icon: Receipt },
  { label: "Communication", path: "/dashboard/parent/communication", icon: MessageSquare },
  { label: "Calendar", path: "/dashboard/parent/calendar", icon: CalendarDays },
  { label: "Transport", path: "/dashboard/parent/transport", icon: Bus },
  { label: "Health", path: "/dashboard/parent/health", icon: HeartPulse },
  { label: "Notifications", path: "/dashboard/parent/notifications", icon: Bell },
  { label: "Profile", path: "/dashboard/parent/profile", icon: User },
  {
    label: "Exam Attendance",
    path: "/dashboard/invigilator/attendance",
    icon: DoorOpen,
  },
];

export const EXAM_CONTROLLER_NAV_ITEMS: NavItem[] = [
  // ── Live Monitoring ──
  {
    label: "Control Tower",
    path: "/dashboard/exam-controller",
    icon: Radio,
    end: true,
  },
  {
    label: "Class View",
    path: "/dashboard/exam-controller/class",
    icon: Users,
  },
  // ── Exam Management ──
  {
    label: "Examinations",
    path: "/dashboard/exam-controller/examinations",
    icon: ClipboardCheck,
  },
];
