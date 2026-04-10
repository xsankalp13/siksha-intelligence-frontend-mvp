import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Bus,
  MapPin,
  Users,
  GraduationCap,
  RefreshCw,
  Radio,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  MOCK_VEHICLES,
  MOCK_ROUTES,
  MOCK_DRIVERS,
  MOCK_STUDENT_ASSIGNMENTS,
} from "@/services/transportMock";
import type { Vehicle, Route, Driver, StudentAssignment } from "@/services/transportMock";

import { TransportOverview } from "./components/TransportOverview";
import { FleetTab } from "./components/FleetTab";
import { RoutesTab } from "./components/RoutesTab";
import { DriversTab } from "./components/DriversTab";
import { StudentAssignmentTab } from "./components/StudentAssignmentTab";
import { LiveTrackingTab } from "./components/LiveTrackingTab";

type TransportTab = "overview" | "fleet" | "routes" | "drivers" | "students" | "tracking";

function TabItem({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300
        ${active
          ? "bg-background text-primary shadow-sm ring-1 ring-border/50"
          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
}

export default function AdminTransportPage() {
  const [activeTab, setActiveTab] = useState<TransportTab>("overview");

  // State — all mocked, no backend
  const [vehicles, setVehicles]       = useState<Vehicle[]>(MOCK_VEHICLES);
  const [routes, setRoutes]           = useState<Route[]>(MOCK_ROUTES);
  const [drivers, setDrivers]         = useState<Driver[]>(MOCK_DRIVERS);
  const [assignments, setAssignments] = useState<StudentAssignment[]>(MOCK_STUDENT_ASSIGNMENTS);

  const handleSync = () => {
    // In a real app this would re-fetch — for mock, just reset to seed data
    setVehicles([...MOCK_VEHICLES]);
    setRoutes([...MOCK_ROUTES]);
    setDrivers([...MOCK_DRIVERS]);
    setAssignments([...MOCK_STUDENT_ASSIGNMENTS]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto space-y-8 pb-10"
    >
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transport Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage fleet, routes, drivers, and student bus assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSync} variant="outline" size="sm" className="h-9 gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync Data
          </Button>
        </div>
      </div>

      {/* Tab Bar */}
      <Card className="p-1.5 border-border/50 bg-muted/20 backdrop-blur-sm">
        <div className="flex flex-wrap gap-1">
          <TabItem
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
          />
          <TabItem
            active={activeTab === "fleet"}
            onClick={() => setActiveTab("fleet")}
            icon={<Bus className="w-4 h-4" />}
            label="Fleet Management"
          />
          <TabItem
            active={activeTab === "routes"}
            onClick={() => setActiveTab("routes")}
            icon={<MapPin className="w-4 h-4" />}
            label="Routes & Stops"
          />
          <TabItem
            active={activeTab === "drivers"}
            onClick={() => setActiveTab("drivers")}
            icon={<Users className="w-4 h-4" />}
            label="Drivers & Staff"
          />
          <TabItem
            active={activeTab === "tracking"}
            onClick={() => setActiveTab("tracking")}
            icon={<Radio className="w-4 h-4" />}
            label="Live Tracking"
          />
          <TabItem
            active={activeTab === "students"}
            onClick={() => setActiveTab("students")}
            icon={<GraduationCap className="w-4 h-4" />}
            label="Student Assignment"
          />
        </div>
      </Card>

      {/* Tab Content */}
      <div className="mt-8 transition-all duration-300">
        {activeTab === "overview" && (
          <TransportOverview
            vehicles={vehicles}
            routes={routes}
            drivers={drivers}
            assignments={assignments}
          />
        )}
        {activeTab === "fleet" && (
          <FleetTab vehicles={vehicles} onVehiclesChange={setVehicles} />
        )}
        {activeTab === "routes" && (
          <RoutesTab routes={routes} onRoutesChange={setRoutes} />
        )}
        {activeTab === "drivers" && (
          <DriversTab drivers={drivers} onDriversChange={setDrivers} />
        )}
        {activeTab === "students" && (
          <StudentAssignmentTab
            assignments={assignments}
            routes={routes}
            onAssignmentsChange={setAssignments}
          />
        )}
        {activeTab === "tracking" && (
          <LiveTrackingTab
            vehicles={vehicles}
            routes={routes}
            drivers={drivers}
          />
        )}
      </div>
    </motion.div>
  );
}
