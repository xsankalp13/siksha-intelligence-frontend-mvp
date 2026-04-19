import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Bell } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logoutUser } from "@/store/slices/authSlice";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ChildSwitcher } from "@/features/parent/components/ChildSwitcher";
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
} from "@/components/ui/alert-dialog";

const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard",
  parent: "Parent Portal",
  academics: "Academics",
  attendance: "Attendance",
  homework: "Homework",
  fees: "Fees & Payments",
  communication: "Communication",
  calendar: "Calendar",
  transport: "Transport",
  health: "Health",
  documents: "Documents",
  notifications: "Notifications",
  profile: "Profile",
};

export default function ParentTopbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);

  // Build breadcrumbs from path
  const segments = location.pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => s !== "dashboard" && s !== "parent");

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login", { replace: true });
    toast.success("Logged out successfully");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      {/* Left side: Breadcrumbs & Context */}
      <div className="flex items-center gap-6">
        <nav className="hidden items-center gap-1.5 text-sm md:flex">
          <span className="font-medium text-foreground">Parent</span>
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
          {segments.length === 0 && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">Overview</span>
            </>
          )}
        </nav>
      </div>

      {/* Right side: Switcher, Notifications, Profile */}
      <div className="flex items-center gap-4">
        {/* Important: The Child Switcher */}
        <ChildSwitcher />

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => navigate("/dashboard/parent/notifications")}>
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        </Button>

        {/* User area */}
        <div className="flex items-center gap-3 border-l border-border pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">
              {user?.username ?? "Parent"}
            </p>
            <p className="text-xs text-muted-foreground">Guardian</p>
          </div>

          <div 
            className="cursor-pointer" 
            onClick={() => navigate("/dashboard/parent/profile")}
          >
            <UserAvatar 
              name={user?.username} 
              profileUrl={user?.profileUrl} 
              className="h-9 w-9 ring-2 ring-primary/20" 
            />
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ready to leave?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be securely logged out and your current session will end immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Log Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </header>
  );
}
