import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { cn } from "@/lib/utils";
import { ADMIN_NAV_ITEMS } from "@/config/navigation";
import { useAppSelector } from "@/store/hooks";
import { useFinanceRole } from "@/hooks/useFinanceRole";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(true);
  const { isFinanceAdmin, isAuditor } = useFinanceRole();
  const userRoles = useAppSelector(s => s.auth.user?.roles) || [];
  
  // Check if they are ONLY finance-related (don't have full admin roles)
  const isFullAdmin = userRoles.some(r => 
    ["ROLE_SUPER_ADMIN", "ROLE_SCHOOL_ADMIN", "ROLE_ADMIN"].includes(r.toUpperCase())
  );

  const navItems = (isFinanceAdmin || isAuditor) && !isFullAdmin
    ? ADMIN_NAV_ITEMS.filter(item => 
        item.label === "Dashboard" || item.label === "Finance"
      )
    : ADMIN_NAV_ITEMS;

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} navItems={navItems} />
      </div>

      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300 ease-in-out print:ml-0 print:block",
          collapsed ? "ml-[68px]" : "ml-[260px]"
        )}
      >
        <div className="print:hidden">
          <Topbar />
        </div>

        <main className="flex-1 overflow-y-auto p-6 print:p-0 print:overflow-visible text-foreground bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
