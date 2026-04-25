import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";

export default function RoleSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRoles = useAppSelector((s) => s.auth.user?.roles || []);

  const hasTeacher = userRoles.some(r => r.replace("ROLE_", "") === "TEACHER");
  const hasController = userRoles.some(r => r.replace("ROLE_", "") === "EXAM_CONTROLLER");

  const isTeacherView = location.pathname.startsWith("/dashboard/teacher");
  const isControllerView = location.pathname.startsWith("/dashboard/exam-controller");

  if (!hasTeacher || !hasController) {
    return null; // Don't show switcher if they don't have both roles
  }

  if (isTeacherView) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="hidden sm:flex items-center gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
        onClick={() => navigate("/dashboard/exam-controller")}
      >
        <ArrowLeftRight className="h-4 w-4" />
        Switch to Exam Controller
      </Button>
    );
  }

  if (isControllerView) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="hidden sm:flex items-center gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
        onClick={() => navigate("/dashboard/teacher")}
      >
        <ArrowLeftRight className="h-4 w-4" />
        Switch to Teacher Dashboard
      </Button>
    );
  }

  return null;
}
