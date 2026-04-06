import { Check, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineStep {
  label: string;
  status: "completed" | "current" | "pending";
  date?: string;
  actor?: string;
  remarks?: string;
}

interface StatusTimelineProps {
  steps: TimelineStep[];
  direction?: "horizontal" | "vertical";
  className?: string;
}

const stepIcon = {
  completed: <Check className="h-3.5 w-3.5" />,
  current: <Clock className="h-3.5 w-3.5 animate-pulse" />,
  pending: <Circle className="h-3.5 w-3.5" />,
};

const stepColor = {
  completed: "bg-emerald-500 text-white",
  current: "bg-amber-500 text-white",
  pending: "bg-muted text-muted-foreground",
};

const lineColor = {
  completed: "bg-emerald-500",
  current: "bg-amber-300",
  pending: {
    // keep muted line for pending state
    background: "bg-muted",
  },
};

export default function StatusTimeline({ steps, direction = "horizontal", className }: StatusTimelineProps) {
  if (steps.length === 0) {
    return null;
  }

  if (direction === "vertical") {
    return (
      <div className={cn("space-y-0", className)}>
        {steps.map((step, i) => (
          <div key={`${step.label}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", stepColor[step.status])}>
                {stepIcon[step.status]}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-[24px]",
                    step.status === "pending" ? lineColor.pending.background : lineColor[step.status],
                  )}
                />
              )}
            </div>
            <div className="pb-4">
              <p className="text-sm font-medium">{step.label}</p>
              {step.date && <p className="text-xs text-muted-foreground">{step.date}</p>}
              {step.actor && <p className="text-xs text-muted-foreground">by {step.actor}</p>}
              {step.remarks && <p className="text-xs italic text-muted-foreground">"{step.remarks}"</p>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-0", className)}>
      {steps.map((step, i) => (
        <div key={`${step.label}-${i}`} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={cn("flex h-7 w-7 items-center justify-center rounded-full", stepColor[step.status])}>
              {stepIcon[step.status]}
            </div>
            <p className="max-w-[80px] text-center text-xs font-medium">{step.label}</p>
            {step.date && <p className="text-[10px] text-muted-foreground">{step.date}</p>}
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "mx-1 mt-[-20px] h-0.5 w-8",
                step.status === "pending" ? lineColor.pending.background : lineColor[step.status],
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
