/**
 * CommandPalette
 * -------------
 * Global Cmd-K command palette for the Admin Dashboard.
 * Provides fast-navigation to all major admin routes + quick-action shortcuts.
 * Built on the cmdk library with Radix Dialog for accessibility.
 */
import { useState, useEffect, useCallback } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Users,
  IndianRupee,
  FileText,
  BarChart2,
  Settings,
  Calendar,
  BookOpen,
  Bus,
  ClipboardCheck,
  Layers,
  ArrowRightLeft,
  TimerOff,
  Banknote,
  UserPlus,
  Search,

} from "lucide-react";

interface CommandGroup {
  label: string;
  items: CommandItem[];
}

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  keywords?: string;
}

function buildGroups(navigate: ReturnType<typeof useNavigate>): CommandGroup[] {
  const go = (path: string) => () => navigate(path);

  return [
    {
      label: "Quick Actions",
      items: [
        {
          id: "enroll-student",
          label: "Enroll New Student",
          icon: GraduationCap,
          action: go("/dashboard/admin/students"),
          keywords: "add student admission enroll",
        },
        {
          id: "onboard-staff",
          label: "Onboard Staff Member",
          icon: UserPlus,
          action: go("/dashboard/admin/staff"),
          keywords: "add staff hire onboard",
        },
        {
          id: "run-payroll",
          label: "Run Payroll",
          icon: Banknote,
          action: go("/dashboard/admin/hrms/payroll"),
          keywords: "payroll salary process run",
        },
        {
          id: "approve-leaves",
          label: "Review Leave Requests",
          icon: FileText,
          action: go("/dashboard/admin/hrms"),
          keywords: "leave approve reject pending",
        },
        {
          id: "assign-proxy",
          label: "Assign Proxy Teacher",
          icon: ArrowRightLeft,
          action: go("/dashboard/admin/proxy"),
          keywords: "proxy teacher substitute cover",
        },
        {
          id: "late-clockin",
          label: "Review Late Clock-Ins",
          icon: TimerOff,
          action: go("/dashboard/admin/hrms"),
          keywords: "late clockin review staff",
        },
      ],
    },
    {
      label: "Navigate",
      items: [
        {
          id: "nav-finance",
          label: "Finance & Fees",
          description: "Invoices, payments, reports",
          icon: IndianRupee,
          action: go("/dashboard/admin/finance"),
          keywords: "finance fee invoice payment",
        },
        {
          id: "nav-students",
          label: "Students",
          description: "Student list, profiles",
          icon: GraduationCap,
          action: go("/dashboard/admin/students"),
          keywords: "students list directory",
        },
        {
          id: "nav-staff",
          label: "Staff Directory",
          description: "Manage teaching & support staff",
          icon: Users,
          action: go("/dashboard/admin/staff"),
          keywords: "staff directory teachers",
        },
        {
          id: "nav-hrms",
          label: "HRMS",
          description: "HR management dashboard",
          icon: ClipboardCheck,
          action: go("/dashboard/admin/hrms"),
          keywords: "hrms hr attendance leave payroll",
        },
        {
          id: "nav-timetable",
          label: "Timetable",
          description: "View and edit class schedule",
          icon: Calendar,
          action: go("/dashboard/admin/timetable"),
          keywords: "timetable schedule class",
        },
        {
          id: "nav-exams",
          label: "Examinations",
          description: "Exam controller & scheduling",
          icon: BookOpen,
          action: go("/dashboard/admin/examinations"),
          keywords: "exams test assessment result",
        },
        {
          id: "nav-transport",
          label: "Transport",
          description: "Bus fleet management",
          icon: Bus,
          action: go("/dashboard/admin/transport"),
          keywords: "transport bus route",
        },
        {
          id: "nav-analytics",
          label: "Reports & Analytics",
          description: "Finance reports, trends",
          icon: BarChart2,
          action: go("/dashboard/admin/finance"),
          keywords: "reports analytics data export",
        },
        {
          id: "nav-curriculum",
          label: "Curriculum",
          icon: Layers,
          action: go("/dashboard/admin/curriculum"),
          keywords: "curriculum subjects syllabus",
        },
        {
          id: "nav-settings",
          label: "Settings",
          description: "System configuration",
          icon: Settings,
          action: go("/dashboard/admin/settings"),
          keywords: "settings config admin",
        },
      ],
    },
  ];
}

// ── Main Palette Component ────────────────────────────────────────────
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const groups = buildGroups(navigate);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      onOpenChange(false);
      setSearch("");
      if (item.action) {
        // Tiny delay so the palette closes before navigating (better UX)
        requestAnimationFrame(() => item.action!());
      }
    },
    [onOpenChange]
  );

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Palette */}
          <motion.div
            key="palette-panel"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed left-1/2 top-[15vh] z-50 w-full max-w-lg -translate-x-1/2"
          >
            <Command
              className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              loop
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search actions, modules, or navigate…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[min(60vh,400px)] overflow-y-auto p-2 custom-scrollbar">
                <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                  No matching actions found.
                </Command.Empty>

                {groups.map((group) => (
                  <Command.Group
                    key={group.label}
                    heading={group.label}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
                  >
                    {group.items.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.keywords ?? ""}`}
                        onSelect={() => handleSelect(item)}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground transition-colors"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <item.icon className="h-4 w-4 text-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{item.label}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          )}
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer hint */}
              <div className="border-t border-border px-4 py-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[10px]">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[10px]">↵</kbd>
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="inline-flex h-4 items-center rounded border border-border bg-muted px-1 font-mono text-[10px]">ESC</kbd>
                  close
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Hook: Cmd-K global shortcut ───────────────────────────────────────
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
