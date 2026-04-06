import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { cn } from "@/lib/utils";
import { TEACHER_NAV_ITEMS } from "@/config/navigation";
import CommandPalette from "@/features/teacher/components/CommandPalette";
import { useTeacherHomeroom } from "@/features/teacher/queries/useTeacherQueries";

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(true);
  const { data: homeroom } = useTeacherHomeroom();

  const navItems = homeroom?.classTeacher
    ? TEACHER_NAV_ITEMS
    : TEACHER_NAV_ITEMS.filter(
        (item) =>
          item.path !== "/dashboard/teacher/my-class" &&
          item.path !== "/dashboard/teacher/attendance"
      );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <CommandPalette />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} navItems={navItems} />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300 ease-in-out",
          collapsed ? "ml-[68px]" : "ml-[260px]"
        )}
      >
        <Topbar />

        <main className="flex-1 overflow-x-hidden p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
