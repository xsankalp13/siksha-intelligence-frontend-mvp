import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useStaffList } from "@/features/hrms/hooks/useStaffList";
import type { StaffCategory, StaffSummaryDTO } from "@/services/types/hrms";

const CATEGORY_LABEL: Record<string, { label: string; className: string }> = {
  TEACHING: { label: "Teaching", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  NON_TEACHING_ADMIN: { label: "Admin", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  NON_TEACHING_SUPPORT: { label: "Support", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
};

interface StaffSearchSelectProps {
  value: string | null;
  onChange: (uuid: string | null, staff: StaffSummaryDTO | null) => void;
  placeholder?: string;
  label?: string;
  categoryFilter?: StaffCategory;
  excludeUuids?: string[];
  disabled?: boolean;
  error?: string;
}

export default function StaffSearchSelect({
  value,
  onChange,
  placeholder = "Search staff by name or employee ID...",
  label,
  categoryFilter,
  excludeUuids = [],
  disabled = false,
  error,
}: StaffSearchSelectProps) {
  const { data: allStaff = [], isLoading } = useStaffList();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = allStaff;
    if (categoryFilter) list = list.filter((s) => s.category === categoryFilter);
    if (excludeUuids.length > 0) {
      const excluded = new Set(excludeUuids);
      list = list.filter((s) => !excluded.has(s.uuid));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
          (s.employeeId ?? "").toLowerCase().includes(q) ||
          (s.designationName ?? "").toLowerCase().includes(q),
      );
    }
    return list.slice(0, 50);
  }, [allStaff, categoryFilter, excludeUuids, search]);

  const selected = useMemo(
    () => (value ? allStaff.find((s) => s.uuid === value) ?? null : null),
    [allStaff, value],
  );

  const displayLabel = selected
    ? `${selected.firstName} ${selected.lastName} (${selected.employeeId ?? "-"})`
    : null;

  return (
    <div className="grid gap-2">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between font-normal",
            !displayLabel && "text-muted-foreground",
            error && "border-destructive",
          )}
          onClick={() => setOpen(!open)}
        >
          <span className="truncate">{displayLabel ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
            <div className="flex items-center border-b border-border px-3 py-2">
              <Search className="mr-2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                autoFocus
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto p-1">
              {filtered.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading staff..." : "No staff found."}
                </p>
              )}
              {filtered.map((staff) => {
                const cat = CATEGORY_LABEL[staff.category ?? ""];
                return (
                  <button
                    key={staff.uuid}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-accent",
                      value === staff.uuid && "bg-accent",
                    )}
                    onClick={() => {
                      onChange(staff.uuid, staff);
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    {value === staff.uuid ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1 text-left">
                      <span className="font-medium">
                        {staff.firstName} {staff.lastName}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {staff.employeeId ?? "-"}
                      </span>
                      {staff.designationName && (
                        <span className="ml-1 text-muted-foreground">• {staff.designationName}</span>
                      )}
                    </div>
                    {cat && (
                      <Badge variant="outline" className={cn("text-xs", cat.className)}>
                        {cat.label}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
            {value && (
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  className="w-full rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                  onClick={() => {
                    onChange(null, null);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}

        {open && (
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
