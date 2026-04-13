import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Bell, CalendarDays } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logoutUser } from "@/store/slices/authSlice";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
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
  teacher: "Teacher",
  schedule: "Schedule",
  classes: "My Classes",
  attendance: "Attendance",
  profile: "Profile",
};

export default function TeacherTopbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const notifCount = 0;

  // Build breadcrumbs from path
  const segments = location.pathname
    .split("/")
    .filter(Boolean)
    .filter((s) => s !== "dashboard" && s !== "teacher");

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login", { replace: true });
    toast.success("Logged out successfully");
  };

  // Format today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      {/* Left — Date + Breadcrumbs */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{formattedDate}</span>
        </div>

        <div className="hidden md:block h-5 w-px bg-border" />

        <nav className="flex items-center gap-1.5 text-sm">
          <span className="font-medium text-foreground">Teacher</span>
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
              <span className="font-medium text-foreground">Dashboard</span>
            </>
          )}
        </nav>
      </div>

      {/* Right — Notification + User + Logout */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {notifCount}
            </span>
          )}
        </Button>

        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-foreground leading-tight">
            {user?.username ?? "Teacher"}
          </p>
          <p className="text-xs text-muted-foreground">
            {user?.roles?.[0]?.replace("ROLE_", "") ?? "TEACHER"}
          </p>
        </div>

        {/* Avatar */}
        <UserAvatar
          name={user?.username}
          profileUrl={user?.profileUrl}
          className="h-9 w-9 ring-2 ring-primary/20"
        />

        {/* Logout */}
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
    </header>
  );
}
