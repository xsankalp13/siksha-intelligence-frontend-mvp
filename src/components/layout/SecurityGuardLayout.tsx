import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { cn } from "@/lib/utils";
import { SECURITY_GUARD_NAV_ITEMS } from "@/config/navigation";

export default function SecurityGuardLayout() {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} navItems={SECURITY_GUARD_NAV_ITEMS} />

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
