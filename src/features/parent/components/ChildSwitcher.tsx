import { useMemo } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useParentChildren } from "../queries/useParentQueries";
import { useChildStore } from "../stores/useChildStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";

export function ChildSwitcher() {
  const { data: children, isLoading } = useParentChildren();
  const { selectedChildId, setSelectedChild } = useChildStore();

  const activeChild = useMemo(() => {
    if (!children || children.length === 0) return null;
    return children.find(c => c.childId === selectedChildId) || children[0];
  }, [children, selectedChildId]);

  // Set default selection if none selected but children exist
  useMemo(() => {
    if (children && children.length > 0 && !selectedChildId) {
      setTimeout(() => setSelectedChild(children[0]), 0);
    }
  }, [children, selectedChildId, setSelectedChild]);

  if (isLoading) {
    return (
      <div className="flex h-10 w-[200px] items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 opacity-70">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!children || children.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex h-10 items-center justify-between gap-3 min-w-[200px] max-w-[260px] rounded-lg border border-border bg-card px-2.5 outline-none transition-all hover:bg-accent focus:ring-2 focus:ring-primary/20 data-[state=open]:bg-accent shadow-sm">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <UserAvatar
            name={activeChild?.fullName}
            profileUrl={activeChild?.profileUrl}
            className="h-6 w-6 text-[10px]"
          />
          <div className="flex flex-col items-start overflow-hidden text-left">
            <span className="truncate text-sm font-semibold text-foreground leading-tight">
              {activeChild?.firstName}
            </span>
            <span className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
              {activeChild?.className} • {activeChild?.section}
            </span>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px] rounded-xl p-2 shadow-lg">
        <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground">
          Switch Child
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {children.map((child) => (
          <DropdownMenuItem
            key={child.childId}
            onClick={() => setSelectedChild(child)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg p-2.5 focus:bg-primary/10",
              selectedChildId === child.childId && "bg-primary/5 shadow-sm"
            )}
          >
            <UserAvatar
              name={child.fullName}
              profileUrl={child.profileUrl}
              className="h-8 w-8"
            />
            <div className="flex flex-col">
              <span className={cn(
                "text-sm font-medium",
                selectedChildId === child.childId ? "text-primary" : "text-foreground"
              )}>
                {child.fullName}
              </span>
              <span className="text-xs text-muted-foreground">
                {child.className} {child.section} • Roll {child.rollNumber}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
