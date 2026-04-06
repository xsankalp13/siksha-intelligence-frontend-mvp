import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StaffCategory } from "@/services/types/hrms";

const STYLES: Record<string, { bg: string; label: string }> = {
  TEACHING: { bg: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300", label: "Teaching" },
  NON_TEACHING_ADMIN: { bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", label: "Admin" },
  NON_TEACHING_SUPPORT: { bg: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", label: "Support" },
};

interface CategoryBadgeProps {
  category: StaffCategory | null | undefined;
  size?: "sm" | "default";
  className?: string;
}

export default function CategoryBadge({ category, size = "default", className }: CategoryBadgeProps) {
  if (!category) return <span className="text-xs text-muted-foreground">-</span>;
  const style = STYLES[category];
  if (!style) return <Badge variant="outline">{category}</Badge>;
  return (
    <Badge variant="outline" className={cn(style.bg, size === "sm" && "px-1.5 py-0 text-[10px]", className)}>
      {style.label}
    </Badge>
  );
}
