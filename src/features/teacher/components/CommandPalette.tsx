import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COMMANDS = [
  { label: "Mark Attendance", path: "/dashboard/teacher/attendance", shortcut: "attend" },
  { label: "View Schedule", path: "/dashboard/teacher/schedule", shortcut: "sched" },
  { label: "My Class", path: "/dashboard/teacher/my-class", shortcut: "class" },
  { label: "My Classes", path: "/dashboard/teacher/classes", shortcut: "classes" },
  { label: "My Profile", path: "/dashboard/teacher/profile", shortcut: "prof" },
  { label: "My HR", path: "/dashboard/teacher/my-hr", shortcut: "hr" },
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const execute = (path: string) => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    navigate(path);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(
    () =>
      COMMANDS.filter((c) => {
        const q = query.toLowerCase();
        return c.label.toLowerCase().includes(q) || c.shortcut.toLowerCase().includes(q);
      }),
    [query]
  );

  useEffect(() => {
    if (!open) return;
    const onPaletteKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
      if (event.key === "Enter") {
        const active = filtered[activeIndex];
        if (active) {
          event.preventDefault();
          execute(active.path);
        }
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onPaletteKey);
    return () => window.removeEventListener("keydown", onPaletteKey);
  }, [activeIndex, filtered, open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a command..." className="pl-9" />
          </div>
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">No commands found.</p>
            ) : null}
            {filtered.map((cmd, index) => (
              <Button
                key={cmd.path}
                variant="ghost"
                className={`w-full justify-between ${index === activeIndex ? "bg-accent" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => execute(cmd.path)}
              >
                <span>{cmd.label}</span>
                <span className="text-xs text-muted-foreground">/{cmd.shortcut}</span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Use ↑ ↓ to navigate, Enter to run, Esc to close.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
