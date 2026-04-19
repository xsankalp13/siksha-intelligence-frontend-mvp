import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import ParentTopbar from "./ParentTopbar";
import { cn } from "@/lib/utils";
import { PARENT_NAV_ITEMS } from "@/config/navigation";

export default function ParentLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        navItems={PARENT_NAV_ITEMS}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300 ease-in-out",
          collapsed ? "pl-[68px]" : "pl-[260px]" // Use pl instead of ml to prevent layout jumping on some pages
        )}
      >
        <ParentTopbar />

        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
