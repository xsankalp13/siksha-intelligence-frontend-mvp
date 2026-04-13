import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

interface AnimatedCounterProps {
  value: number;
  label: string;
  icon: React.ReactNode;
  color: string;
  showPercentage?: boolean;
  total?: number;
}

export default function AnimatedCounter({
  value,
  label,
  icon,
  color,
  showPercentage = false,
  total,
}: AnimatedCounterProps) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.5, ease: "easeOut" });
    return () => controls.stop();
  }, [count, value]);

  const percent = showPercentage && total && total > 0 ? Math.round((value / total) * 100) : null;

  return (
    <motion.div
      layout
      className="rounded-xl border border-border bg-card p-4 shadow-sm"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md" style={{ backgroundColor: `${color}1a`, color }}>
          {icon}
        </span>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <motion.span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {rounded}
        </motion.span>
        {percent !== null ? <span className="text-xs text-muted-foreground">{percent}%</span> : null}
      </div>
    </motion.div>
  );
}
