import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import { cn } from "@/lib/utils"
import { SUPER_ADMIN_NAV_ITEMS } from "@/config/navigation"
import { useLocation, useNavigate } from "react-router-dom"
import { ChevronRight, LogOut, ShieldCheck } from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { logoutUser } from "@/store/slices/authSlice"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/shared/UserAvatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard",
  "super-admin": "Super Admin",
  users: "Users",
  rbac: "Roles & RBAC",
  health: "System Health",
  "audit-logs": "Audit Logs",
  logs: "App Logs",
  configuration: "Configuration",
  security: "Security",
}

function SuperAdminTopbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)

  const segments = location.pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => s !== "dashboard" && s !== "super-admin")

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate("/login", { replace: true })
    toast.success("Logged out successfully")
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <ShieldCheck className="h-4 w-4 text-destructive" />
          Super Admin
        </span>
        {segments.map((seg, i) => (
          <span key={seg} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span
              className={cn(
                i === segments.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {breadcrumbMap[seg] ?? seg}
            </span>
          </span>
        ))}
      </nav>

      {/* User area */}
      <div className="flex items-center gap-3">
        {/* SuperAdmin badge */}
        <span className="hidden rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive sm:inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          SUPER ADMIN
        </span>

        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground leading-tight">
            {user?.username ?? "superadmin"}
          </p>
          <p className="text-xs text-muted-foreground">Technical Administrator</p>
        </div>

        <UserAvatar
          name={user?.username}
          profileUrl={undefined}
          className="h-9 w-9 ring-2 ring-destructive/30"
        />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End SuperAdmin session?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be securely logged out and your current session will end immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLogout}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Log Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  )
}

export default function SuperAdminLayout() {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        navItems={SUPER_ADMIN_NAV_ITEMS}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300 ease-in-out",
          collapsed ? "ml-[68px]" : "ml-[260px]"
        )}
      >
        <SuperAdminTopbar />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
