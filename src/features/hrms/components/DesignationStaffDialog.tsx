import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  IndianRupee,
  Loader2,
  Search,
  Sparkles,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { StaffDesignationResponseDTO } from "@/services/types/hrms";
import { cn } from "@/lib/utils";

interface DesignationStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  designation: StaffDesignationResponseDTO | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  TEACHING: "from-blue-500 to-indigo-600",
  NON_TEACHING_ADMIN: "from-violet-500 to-purple-600",
  NON_TEACHING_SUPPORT: "from-amber-500 to-orange-600",
};

const CATEGORY_BADGE_STYLES: Record<string, string> = {
  TEACHING: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  NON_TEACHING_ADMIN: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800",
  NON_TEACHING_SUPPORT: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
};

export default function DesignationStaffDialog({
  open,
  onOpenChange,
  designation,
}: DesignationStaffDialogProps) {
  const queryClient = useQueryClient();
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Fetch all active staff
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ["hrms", "staff-dropdown"],
    queryFn: () => hrmsService.listStaffForDropdown().then((r) => r.data?.content ?? []),
    enabled: open,
  });

  // Filter staff: show only those not already assigned to this designation
  const filteredStaff = useMemo(() => {
    if (!staffData || !designation) return [];
    const lowerSearch = search.toLowerCase();
    return staffData.filter((s) => {
      // Only show staff who DON'T already have this designation
      const alreadyMapped =
        s.designationCode === designation.designationCode ||
        s.designationName === designation.designationName;
      if (alreadyMapped) return false;

      if (!lowerSearch) return true;
      const fullName = [s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ").toLowerCase();
      return (
        fullName.includes(lowerSearch) ||
        (s.employeeId ?? "").toLowerCase().includes(lowerSearch) ||
        (s.email ?? "").toLowerCase().includes(lowerSearch)
      );
    });
  }, [staffData, designation, search]);

  // Staff already mapped to this designation
  const alreadyMappedStaff = useMemo(() => {
    if (!staffData || !designation) return [];
    return staffData.filter(
      (s) =>
        s.designationCode === designation.designationCode ||
        s.designationName === designation.designationName,
    );
  }, [staffData, designation]);

  const toggleStaff = (uuid: string) => {
    setSelectedStaff((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStaff.size === filteredStaff.length) {
      setSelectedStaff(new Set());
    } else {
      setSelectedStaff(new Set(filteredStaff.map((s) => s.uuid!)));
    }
  };

  const assignMutation = useMutation({
    mutationFn: () =>
      hrmsService.bulkAssignStaffToDesignation(designation!.uuid!, {
        staffRefs: Array.from(selectedStaff),
      }),
    onSuccess: (res) => {
      const data = res.data;
      if (data.failureCount === 0) {
        toast.success(`${data.successCount} staff assigned to ${data.designationName}`);
      } else {
        toast.warning(
          `${data.successCount} assigned, ${data.failureCount} failed`,
          { description: data.errors?.[0] },
        );
      }
      setSelectedStaff(new Set());
      setSearch("");
      queryClient.invalidateQueries({ queryKey: ["hrms", "designations"] });
      queryClient.invalidateQueries({ queryKey: ["hrms", "staff-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["hrms", "staff360"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const handleClose = () => {
    setSelectedStaff(new Set());
    setSearch("");
    onOpenChange(false);
  };

  if (!designation) return null;

  const gradientClass = CATEGORY_COLORS[designation.category] || "from-gray-500 to-gray-600";
  const hasSalaryTemplate = Boolean(designation.defaultSalaryTemplateName);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        {/* Premium header with gradient */}
        <div className={cn("relative bg-gradient-to-r px-6 pt-6 pb-5 text-white", gradientClass)}>
          <div className="pointer-events-none absolute -top-10 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 left-1/4 h-24 w-24 rounded-full bg-white/5 blur-xl" />

          <DialogHeader className="space-y-1.5 relative z-10">
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assign Staff to {designation.designationName}
            </DialogTitle>
            <DialogDescription className="text-white/75 text-sm">
              Select staff members to assign to this designation. Existing salary mappings are preserved.
            </DialogDescription>
          </DialogHeader>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2 mt-3 relative z-10">
            <Badge className="bg-white/20 text-white border-white/20 hover:bg-white/25 text-xs shadow-sm">
              {designation.designationCode}
            </Badge>
            <Badge className={cn("text-xs border shadow-sm", CATEGORY_BADGE_STYLES[designation.category] || "bg-gray-100 text-gray-700")}>
              {designation.category.replace(/_/g, " ")}
            </Badge>
            {hasSalaryTemplate && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 text-xs shadow-sm gap-1">
                <IndianRupee className="h-3 w-3" />
                {designation.defaultSalaryTemplateName}
              </Badge>
            )}
          </div>

          {/* Auto-provision notice */}
          {hasSalaryTemplate && (
            <div className="mt-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-2 text-xs text-white/90 flex items-start gap-2 relative z-10">
              <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-300" />
              <span>
                Staff without an existing salary mapping will automatically receive the{" "}
                <strong>{designation.defaultSalaryTemplateName}</strong> salary template.
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 pt-4 pb-2 space-y-3">
          {/* Already mapped badge */}
          {alreadyMappedStaff.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>
                <strong className="text-foreground">{alreadyMappedStaff.length}</strong> staff already assigned to this designation
              </span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, employee ID, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Select all / selected count */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <button
              type="button"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
              onClick={toggleAll}
            >
              <Checkbox
                checked={filteredStaff.length > 0 && selectedStaff.size === filteredStaff.length}
                className="h-3.5 w-3.5"
              />
              {selectedStaff.size === filteredStaff.length && filteredStaff.length > 0
                ? "Deselect All"
                : `Select All (${filteredStaff.length})`}
            </button>
            {selectedStaff.size > 0 && (
              <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary">
                {selectedStaff.size} selected
              </Badge>
            )}
          </div>

          {/* Staff list */}
          <div className="h-[280px] overflow-y-auto rounded-lg border border-border/50 bg-muted/20">
            {staffLoading ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading staff...
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <Users className="h-8 w-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground font-medium">No eligible staff found</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {search ? "Try a different search term" : "All staff may already be assigned"}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredStaff.map((staff) => {
                  const isSelected = selectedStaff.has(staff.uuid!);
                  const fullName = [staff.firstName, staff.middleName, staff.lastName].filter(Boolean).join(" ");
                  const initials = ((staff.firstName?.[0] ?? "") + (staff.lastName?.[0] ?? "")).toUpperCase();
                  const currentDesignation = staff.designationName || staff.designationCode;

                  return (
                    <button
                      key={staff.uuid}
                      type="button"
                      onClick={() => toggleStaff(staff.uuid!)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-150",
                        isSelected
                          ? "bg-primary/8 border border-primary/30 shadow-sm"
                          : "hover:bg-muted/60 border border-transparent",
                      )}
                    >
                      <Checkbox checked={isSelected} className="shrink-0" />

                      {/* Avatar */}
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {initials || "?"}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{fullName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {staff.employeeId}
                          </span>
                          {currentDesignation && (
                            <>
                              <span className="text-muted-foreground/30">•</span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {currentDesignation}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Category */}
                      {staff.category && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-[18px] shrink-0 font-medium"
                        >
                          {staff.category.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 pb-5 pt-2">
          <Button variant="outline" onClick={handleClose} className="gap-1.5">
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </Button>
          <Button
            disabled={selectedStaff.size === 0 || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
            className="gap-1.5 shadow-md"
          >
            {assignMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            Assign {selectedStaff.size > 0 ? `(${selectedStaff.size})` : ""} Staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
