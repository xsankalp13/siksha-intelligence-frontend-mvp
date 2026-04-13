import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Users } from "lucide-react";
import type { TeacherStudentResponseDto } from "@/services/types/teacher";

type LocalCode = "P" | "A" | "L";

interface StudentAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: TeacherStudentResponseDto[];
  onSubmit: (state: Record<string, LocalCode>) => Promise<void>;
  initialState?: Record<string, LocalCode>;
}

const order: LocalCode[] = ["P", "A", "L"];

const STATUS_CONFIG: Record<LocalCode, { label: string; bg: string; border: string; text: string; ring: string; icon: typeof CheckCircle2 }> = {
  P: {
    label: "Present",
    bg: "bg-emerald-500",
    border: "border-emerald-400",
    text: "text-white",
    ring: "ring-emerald-300",
    icon: CheckCircle2,
  },
  A: {
    label: "Absent",
    bg: "bg-red-500",
    border: "border-red-400",
    text: "text-white",
    ring: "ring-red-300",
    icon: XCircle,
  },
  L: {
    label: "Late",
    bg: "bg-amber-500",
    border: "border-amber-400",
    text: "text-white",
    ring: "ring-amber-300",
    icon: Clock,
  },
};

export default function StudentAttendanceModal({
  open,
  onOpenChange,
  students,
  onSubmit,
  initialState,
}: StudentAttendanceModalProps) {
  const [state, setState] = useState<Record<string, LocalCode>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const next: Record<string, LocalCode> = {};
    students.forEach((s) => {
      next[s.uuid] = initialState?.[s.uuid] ?? "P";
    });
    setState(next);
  }, [students, initialState]);

  const summary = useMemo(() => {
    const values = Object.values(state);
    return {
      P: values.filter((v) => v === "P").length,
      A: values.filter((v) => v === "A").length,
      L: values.filter((v) => v === "L").length,
    };
  }, [state]);

  const cycle = (uuid: string) => {
    setState((prev) => {
      const curr = prev[uuid] ?? "P";
      const next = order[(order.indexOf(curr) + 1) % order.length];
      return { ...prev, [uuid]: next };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] max-w-[95vw] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogHeader className="flex-1">
            <DialogTitle className="text-xl font-bold">Student Attendance</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Tap a card to cycle through Present → Absent → Late
            </p>
          </DialogHeader>

          {/* Summary badges */}
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> {summary.P}
            </Badge>
            <Badge className="bg-red-100 text-red-700 border-red-200 gap-1.5 px-3 py-1">
              <XCircle className="h-3.5 w-3.5" /> {summary.A}
            </Badge>
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5 px-3 py-1">
              <Clock className="h-3.5 w-3.5" /> {summary.L}
            </Badge>
            <Badge variant="outline" className="gap-1.5 px-3 py-1">
              <Users className="h-3.5 w-3.5" /> {students.length}
            </Badge>
          </div>
        </div>

        {/* Grid — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {students.map((student) => {
              const code = state[student.uuid] ?? "P";
              const cfg = STATUS_CONFIG[code];
              const Icon = cfg.icon;
              const initials = `${student.firstName?.[0] ?? ""}${student.lastName?.[0] ?? ""}`;

              return (
                <motion.button
                  key={student.uuid}
                  type="button"
                  layout
                  onClick={() => cycle(student.uuid)}
                  whileTap={{ scale: 0.97 }}
                  className={`group rounded-2xl border-2 ${cfg.border} bg-card overflow-hidden transition-all duration-200 text-left hover:shadow-lg focus:outline-none focus:ring-2 ${cfg.ring} focus:ring-offset-2`}
                >
                  {/* Profile picture — compact */}
                  <div className="relative w-full aspect-square bg-muted overflow-hidden">
                    {student.profileUrl ? (
                      <img
                        src={student.profileUrl}
                        alt={`${student.firstName} ${student.lastName}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    {/* Fallback initials — always rendered, hidden when image loads */}
                    <div
                      className={`${student.profileUrl ? "hidden" : ""} absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5`}
                    >
                      <span className="text-2xl font-bold text-primary/60">{initials}</span>
                    </div>

                    {/* Status icon overlay */}
                    <div className={`absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full shadow-lg ${cfg.bg}`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>

                    {/* Roll number pill */}
                    <div className="absolute bottom-1.5 left-1.5">
                      <span className="bg-black/50 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        #{student.rollNumber}
                      </span>
                    </div>
                  </div>

                  {/* Name + status bar */}
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {student.firstName} {student.lastName}
                    </p>
                    <div className={`mt-1.5 w-full py-1 rounded-md text-center text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Footer — sticky */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-border bg-background shrink-0">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-emerald-600">{summary.P}</span> Present
            {" • "}
            <span className="font-semibold text-red-600">{summary.A}</span> Absent
            {" • "}
            <span className="font-semibold text-amber-600">{summary.L}</span> Late
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setSubmitting(true);
                try {
                  await onSubmit(state);
                  onOpenChange(false);
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
              className="min-w-[140px]"
            >
              {submitting ? "Submitting..." : "Submit Attendance"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
