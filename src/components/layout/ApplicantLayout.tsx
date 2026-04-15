import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { APPLICANT_NAV_ITEMS } from "@/config/navigation";

export default function ApplicantLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar 
        navItems={APPLICANT_NAV_ITEMS} 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(!collapsed)} 
      />
      <div className="flex-1 flex flex-col overflow-hidden pl-0 transition-all duration-300 ease-in-out">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 ml-[68px]" style={{ marginLeft: collapsed ? '68px' : '260px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
