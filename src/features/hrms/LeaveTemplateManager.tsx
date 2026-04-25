import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarDays, Clock, Edit2, LayoutTemplate, Loader2, Plus, SlidersHorizontal, Tag, Trash2,  } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  LeaveTemplateResponseDTO,
  LeaveTemplateCreateDTO,
  LeaveTemplateItemDTO,
  StaffLeaveTemplateMappingResponseDTO,
} from "@/services/types/hrms";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const PREV_YEAR = new Date().getFullYear() - 1;
const CURRENT_YEAR = new Date().getFullYear();
const NEXT_YEAR = new Date().getFullYear() + 1;

const ACADEMIC_YEARS = [
  `${PREV_YEAR}-${CURRENT_YEAR}`,
  `${CURRENT_YEAR}-${NEXT_YEAR}`,
  `${NEXT_YEAR}-${NEXT_YEAR + 1}`
];

export default function LeaveTemplateManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("templates");
  
  // Modals & State for Manage
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveTemplateResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveTemplateResponseDTO | null>(null);
  const [form, setForm] = useState<LeaveTemplateCreateDTO>({
    templateName: "",
    academicYear: ACADEMIC_YEARS[1],
    description: "",
    applicableCategory: undefined,
    items: [],
  });

  // State for Assign
  const [selectedDesignation, setSelectedDesignation] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedYear, setSelectedYear] = useState(ACADEMIC_YEARS[1]);

  // State for Per-Staff assignment
  const [staffRef, setStaffRef] = useState<string | null>(null);
  const [staffYear, setStaffYear] = useState(ACADEMIC_YEARS[1]);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  // Track which allocation rows have their filter panel expanded
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [staffAddTemplateRef, setStaffAddTemplateRef] = useState("");

  // Queries
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["hrms", "leave-templates"],
    queryFn: () => hrmsService.listLeaveTemplates().then(res => res.data),
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["hrms", "leave-types"],
    queryFn: () => hrmsService.listLeaveTypes().then(res => res.data),
  });

  const { data: designations = [] } = useQuery({
    queryKey: ["hrms", "designations"],
    queryFn: () => hrmsService.listDesignations().then(res => res.data),
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: LeaveTemplateCreateDTO) => 
      editing 
        ? hrmsService.updateLeaveTemplate(editing.uuid, payload)
        : hrmsService.createLeaveTemplate(payload),
    onSuccess: () => {
      toast.success(editing ? "Template updated" : "Template created");
      closeForm();
      queryClient.invalidateQueries({ queryKey: ["hrms", "leave-templates"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (uuid: string) => hrmsService.deleteLeaveTemplate(uuid),
    onSuccess: () => {
      toast.success("Template deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["hrms", "leave-templates"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const assignMutation = useMutation({
    // Template ref goes in the path; designationRef + academicYear in body
    mutationFn: () =>
      hrmsService.bulkAssignTemplates(selectedTemplate, {
        designationRef: selectedDesignation,
        academicYear: selectedYear,
      }),
    onSuccess: (res) => {
      const data = res.data;
      if (data.failedCount > 0) {
        toast.warning(`Assigned ${data.successCount}, Failed ${data.failedCount}.`);
      } else {
        toast.success(`Assigned to ${data.successCount} staff members`);
      }
      setSelectedDesignation("");
      setSelectedTemplate("");
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  // Per-staff: query existing template mappings when staff is selected
  const staffMappingsQuery = useQuery({
    queryKey: ["hrms", "leave-templates", "staff", staffRef],
    queryFn: () =>
      staffRef ? hrmsService.getStaffTemplateMappings(staffRef).then((r) => r.data) : [],
    enabled: !!staffRef,
  });

  const assignToStaffMutation = useMutation({
    mutationFn: () =>
      hrmsService.assignTemplateToStaff(staffAddTemplateRef, {
        staffRef: staffRef!,
        academicYear: staffYear,
      }),
    onSuccess: () => {
      toast.success("Template assigned to staff");
      queryClient.invalidateQueries({
        queryKey: ["hrms", "leave-templates", "staff", staffRef],
      });
      setAddTemplateOpen(false);
      setStaffAddTemplateRef("");
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  // Handlers
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setExpandedItems(new Set());
    setForm({
      templateName: "",
      academicYear: ACADEMIC_YEARS[1],
      description: "",
      applicableCategory: undefined,
      items: [],
    });
  };

  const openEdit = (t: LeaveTemplateResponseDTO) => {
    setEditing(t);
    setExpandedItems(new Set());
    setForm({
      templateName: t.templateName,
      academicYear: t.academicYear,
      description: t.description ?? "",
      applicableCategory: t.applicableCategory,
      items: t.items.map(i => {
         const matchedType = leaveTypes.find(lt => lt.leaveCode === i.leaveTypeCode);
         return {
           ...i,
           leaveTypeRef: matchedType ? matchedType.uuid : String(i.leaveTypeId),
           genderRestriction: i.genderRestriction ?? "ANY",
           minServiceMonths: i.minServiceMonths ?? 0,
           employmentTypeRestriction: i.employmentTypeRestriction ?? "ANY",
           encashmentOverride: i.encashmentOverride ?? "SYSTEM_DEFAULT",
         };
      }),
    });
    setFormOpen(true);
  };

  const addItemRow = () => {
    const defaultType = leaveTypes.find(lt => !form.items.some(i => i.leaveTypeRef === lt.uuid));
    if (!defaultType) return toast.warning("All available leave types added");
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          leaveTypeRef: defaultType.uuid,
          customQuota: defaultType.annualQuota,
          genderRestriction: "ANY" as const,
          minServiceMonths: 0,
          employmentTypeRestriction: "ANY" as const,
          encashmentOverride: "SYSTEM_DEFAULT" as const,
        },
      ],
    }));
  };

  const updateItem = (index: number, updates: Partial<LeaveTemplateItemDTO>) => {
    setForm(prev => {
      const newItems = [...prev.items];
      if (updates.leaveTypeRef !== undefined) {
        if (newItems.some((i, idx) => idx !== index && i.leaveTypeRef === updates.leaveTypeRef)) {
          toast.error("You cannot add duplicate leave types");
          return prev;
        }
        const lt = leaveTypes.find(l => l.uuid === updates.leaveTypeRef);
        newItems[index] = {
          ...newItems[index],
          ...updates,
          customQuota: lt ? lt.annualQuota : newItems[index].customQuota,
        };
      } else {
        newItems[index] = { ...newItems[index], ...updates };
      }
      return { ...prev, items: newItems };
    });
  };

  const removeItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  // ── Leave type colour coding ──────────────────────────────────────────
  const leaveTypeColors: Record<string, { bg: string; text: string; border: string }> = {
    CL:  { bg: "bg-blue-50",    text: "text-blue-700",   border: "border-blue-200" },
    SL:  { bg: "bg-red-50",     text: "text-red-700",    border: "border-red-200" },
    EL:  { bg: "bg-emerald-50", text: "text-emerald-700",border: "border-emerald-200" },
    ML:  { bg: "bg-pink-50",    text: "text-pink-700",   border: "border-pink-200" },
    PL:  { bg: "bg-indigo-50",  text: "text-indigo-700", border: "border-indigo-200" },
    HD:  { bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200" },
    LOP: { bg: "bg-gray-100",   text: "text-gray-700",   border: "border-gray-300" },
    CO:  { bg: "bg-violet-50",  text: "text-violet-700", border: "border-violet-200" },
  };
  const getLeaveChipStyle = (code: string) =>
    leaveTypeColors[code] ?? { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };

  return (
    <div className="space-y-6">
      {/* ── Premium Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-emerald-50 via-background to-teal-50 p-6 shadow-sm">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-100/50 blur-2xl" />
        <div className="absolute -bottom-4 -left-6 h-24 w-24 rounded-full bg-teal-100/50 blur-xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                <LayoutTemplate className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Leave Templates</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure academic-year leave templates and assign them to staff — multiple templates per staff are supported.
            </p>
          </div>
          {activeTab === "templates" && (
            <Button
              size="sm"
              onClick={() => setFormOpen(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md gap-1.5"
            >
              ➕ Create Template
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
          <TabsTrigger value="templates" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm">
            📋 Templates
          </TabsTrigger>
          <TabsTrigger value="assign" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm">
            👥 By Designation
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5 text-xs rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-sm">
            👤 By Staff
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Templates ── */}
        <TabsContent value="templates" className="space-y-4 m-0">
          {templatesLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-base font-semibold text-muted-foreground">No Templates Yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first leave template to get started</p>
              <Button className="mt-4" size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {templates.map((t) => (
                <div key={t.uuid} className="group relative rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden">
                  {/* Top gradient bar */}
                  <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

                  <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base truncate">{t.templateName}</h3>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEdit(t)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(t)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Meta pills */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CalendarDays className="h-3 w-3" /> {t.academicYear}
                      </span>
                      {t.applicableCategory && (
                        <span className="text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                          {t.applicableCategory.replace(/_/g, " ")}
                        </span>
                      )}
                      <span className="text-[11px] font-medium bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full">
                        {t.items.length} leave type{t.items.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Leave type chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {t.items.slice(0, 6).map((item, idx) => {
                        const style = getLeaveChipStyle(item.leaveTypeCode ?? "");
                        const hasFilters =
                          (item.genderRestriction && item.genderRestriction !== "ANY") ||
                          (item.minServiceMonths != null && item.minServiceMonths > 0) ||
                          (item.employmentTypeRestriction && item.employmentTypeRestriction !== "ANY") ||
                          item.maxCarryForwardOverride != null;
                        return (
                          <div key={idx} className={cn("flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg border", style.bg, style.text, style.border)}>
                            <Tag className="h-2.5 w-2.5" />
                            {item.leaveTypeCode}: {item.customQuota}d
                            {hasFilters && (
                              <SlidersHorizontal className="h-2.5 w-2.5 opacity-60" aria-label="Has eligibility filters" />
                            )}
                          </div>
                        );
                      })}
                      {t.items.length > 6 && (
                        <span className="text-[11px] text-muted-foreground px-1 self-center">+{t.items.length - 6} more</span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(t.updatedAt), "MMM d, yyyy")}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(t)}>
                          ✏️ Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-rose-600 hover:bg-rose-50" onClick={() => setDeleteTarget(t)}>
                          🗑️ Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: By Designation (Bulk Assign) ── */}
        <TabsContent value="assign" className="m-0">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle>Bulk Assign by Designation</CardTitle>
              <CardDescription>
                Assign a leave template to all staff members under a designation. Staff can
                have multiple templates — this adds to existing assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template to Assign <span className="text-destructive">*</span></Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.uuid} value={t.uuid}>
                        {t.templateName}
                        <span className="ml-1 text-muted-foreground text-xs">({t.academicYear})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Designation <span className="text-destructive">*</span></Label>
                <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations.map((d) => (
                      <SelectItem key={d.uuid} value={d.uuid}>
                        {d.designationName}
                        <span className="ml-1 text-muted-foreground text-xs">({d.category})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Academic Year <span className="text-destructive">*</span></Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                This will assign the selected template to <strong>all active staff</strong> under the
                chosen designation for {selectedYear || "the selected year"}. Existing template
                assignments are not removed.
              </div>

              <Button
                className="w-full"
                disabled={!selectedDesignation || !selectedTemplate || !selectedYear || assignMutation.isPending}
                onClick={() => assignMutation.mutate()}
              >
                {assignMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning...</>
                ) : (
                  "Run Bulk Assignment"
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: By Staff (Individual + Many-to-One) ── */}
        <TabsContent value="staff" className="m-0 space-y-4">
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Staff Leave Policy Manager</CardTitle>
              <CardDescription>
                View and manage leave templates for individual staff. A staff member can
                hold multiple templates simultaneously (additive model).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <StaffSearchSelect
                    value={staffRef}
                    onChange={(uuid) => setStaffRef(uuid)}
                    label="Search Staff Member"
                    placeholder="Type name or ID..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Academic Year</Label>
                  <Select value={staffYear} onValueChange={setStaffYear}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACADEMIC_YEARS.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {staffRef && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Assigned Templates</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setStaffAddTemplateRef("");
                          setAddTemplateOpen(true);
                        }}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Add Template
                      </Button>
                    </div>

                    {staffMappingsQuery.isLoading && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    {!staffMappingsQuery.isLoading && (staffMappingsQuery.data ?? []).length === 0 && (
                      <div className="rounded-lg border border-dashed p-6 text-center">
                        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No templates assigned yet.</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Click "Add Template" to assign leave policies to this staff member.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {(staffMappingsQuery.data ?? [])
                        .filter((m: StaffLeaveTemplateMappingResponseDTO) => m.active)
                        .map((mapping: StaffLeaveTemplateMappingResponseDTO) => {
                          const template = templates.find((t) => t.uuid === mapping.templateUuid);
                          return (
                            <div
                              key={mapping.uuid}
                              className="flex items-center justify-between rounded-lg border bg-white dark:bg-card p-3"
                            >
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium">{mapping.templateName}</p>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-1.5">
                                    {mapping.academicYear}
                                  </Badge>
                                  {template?.items && template.items.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      {template.items.length} leave type{template.items.length > 1 ? "s" : ""}
                                    </span>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    · Active since {format(new Date(mapping.createdAt), "MMM d, yyyy")}
                                  </span>
                                </div>
                                {template?.items && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {template.items.slice(0, 4).map((item, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground"
                                      >
                                        {item.leaveTypeName ?? item.leaveTypeCode}: {item.customQuota}d
                                      </span>
                                    ))}
                                    {(template?.items?.length ?? 0) > 4 && (
                                      <span className="text-[10px] text-muted-foreground px-1">
                                        +{(template?.items?.length ?? 0) - 4} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                                Active
                              </Badge>
                            </div>
                          );
                        })}
                    </div>

                    {/* Inactive mappings */}
                    {(staffMappingsQuery.data ?? []).some((m: StaffLeaveTemplateMappingResponseDTO) => !m.active) && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">
                          Show inactive assignments (
                          {(staffMappingsQuery.data ?? []).filter((m: StaffLeaveTemplateMappingResponseDTO) => !m.active).length}
                          )
                        </summary>
                        <div className="mt-2 space-y-1">
                          {(staffMappingsQuery.data ?? [])
                            .filter((m: StaffLeaveTemplateMappingResponseDTO) => !m.active)
                            .map((mapping: StaffLeaveTemplateMappingResponseDTO) => (
                              <div key={mapping.uuid} className="flex items-center justify-between rounded border p-2 bg-muted/30">
                                <span className="line-through text-muted-foreground">{mapping.templateName}</span>
                                <Badge className="bg-gray-100 text-gray-500 border border-gray-200 text-[10px]">Inactive</Badge>
                              </div>
                            ))}
                        </div>
                      </details>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* CREATE/EDIT MODAL */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) closeForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
              <DialogTitle>{editing ? "Edit Template" : "Create Leave Template"}</DialogTitle>
              <DialogDescription>Define a leave allowance ruleset tied to an academic year.</DialogDescription>
           </DialogHeader>

           <div className="grid gap-4 py-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label>Template Name <span className="text-destructive">*</span></Label>
                     <Input 
                        placeholder="e.g. TGT Staff Leave Template" 
                        value={form.templateName}
                        onChange={e => setForm(f => ({ ...f, templateName: e.target.value }))}
                     />
                  </div>
                  <div className="space-y-2">
                     <Label>Academic Year <span className="text-destructive">*</span></Label>
                     <Select value={form.academicYear} onValueChange={v => setForm(f => ({...f, academicYear: v}))}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                           {ACADEMIC_YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label>Staff Category (Optional)</Label>
                      <Select 
                        value={form.applicableCategory || "ALL"} 
                        onValueChange={v => setForm(f => ({...f, applicableCategory: v === "ALL" ? undefined : v as any}))}
                      >
                         <SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="ALL">All Categories</SelectItem>
                            <SelectItem value="TEACHING">Teaching Staff</SelectItem>
                            <SelectItem value="NON_TEACHING_ADMIN">Admin Staff</SelectItem>
                            <SelectItem value="NON_TEACHING_SUPPORT">Support Staff</SelectItem>
                         </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                     {/* Placeholder for future alignment */}
                  </div>
               </div>

               <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                     placeholder="Optional details about this ruleset..."
                     value={form.description}
                     onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
               </div>

               <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                     <div>
                       <Label>Leave Allocations</Label>
                       <p className="text-[11px] text-muted-foreground mt-0.5">Click <SlidersHorizontal className="inline h-3 w-3 mx-0.5" /> on any rule to set eligibility filters</p>
                     </div>
                     <Button size="sm" variant="outline" onClick={addItemRow}>
                        <Plus className="w-4 h-4 mr-1" /> Add Rule
                     </Button>
                  </div>

                  {form.items.length === 0 ? (
                     <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground bg-muted/20">
                        No leave types added yet. Default global quotas will apply for unconfigured leave types.
                     </div>
                  ) : (
                     <div className="space-y-2">
                        {form.items.map((item, index) => {
                           const isExpanded = expandedItems.has(index);
                           const hasFilters =
                             (item.genderRestriction && item.genderRestriction !== "ANY") ||
                             (item.minServiceMonths != null && item.minServiceMonths > 0) ||
                             (item.employmentTypeRestriction && item.employmentTypeRestriction !== "ANY") ||
                             item.maxCarryForwardOverride != null ||
                             (item.encashmentOverride && item.encashmentOverride !== "SYSTEM_DEFAULT");

                           return (
                             <div
                               key={index}
                               className={cn(
                                 "border rounded-lg overflow-hidden transition-all duration-150",
                                 isExpanded ? "border-primary/50 shadow-sm" : ""
                               )}
                             >
                               {/* ── Main Row ── */}
                               <div className={cn("flex items-end gap-2 p-3", isExpanded ? "bg-primary/5" : "bg-muted/30")}>
                                 <div className="flex-1 space-y-1.5 text-sm">
                                   <Label className="text-xs">Leave Type</Label>
                                   <Select
                                     value={item.leaveTypeRef}
                                     onValueChange={v => updateItem(index, { leaveTypeRef: v })}
                                   >
                                     <SelectTrigger><SelectValue /></SelectTrigger>
                                     <SelectContent>
                                       {leaveTypes.map(lt => (
                                         <SelectItem key={lt.uuid} value={lt.uuid}>
                                           {lt.displayName} ({lt.leaveCode})
                                         </SelectItem>
                                       ))}
                                     </SelectContent>
                                   </Select>
                                 </div>

                                 <div className="w-28 space-y-1.5 text-sm shrink-0">
                                   <Label className="text-xs">Quota (Days)</Label>
                                   <Input
                                     type="number"
                                     min="0"
                                     step="0.5"
                                     value={item.customQuota ?? ""}
                                     onChange={e => updateItem(index, { customQuota: parseFloat(e.target.value) || 0 })}
                                   />
                                 </div>

                                 {/* Filter summary chips */}
                                 <div className="flex items-center gap-1 pb-0.5 shrink-0">
                                   {hasFilters && !isExpanded && (
                                     <div className="flex flex-wrap gap-1 max-w-[140px]">
                                       {item.genderRestriction === "FEMALE_ONLY" && (
                                         <span className="text-[9px] bg-pink-100 text-pink-700 border border-pink-200 px-1.5 py-0.5 rounded-full font-semibold">♀ Female</span>
                                       )}
                                       {item.genderRestriction === "MALE_ONLY" && (
                                         <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full font-semibold">♂ Male</span>
                                       )}
                                       {item.minServiceMonths != null && item.minServiceMonths > 0 && (
                                         <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">{item.minServiceMonths}m svc</span>
                                       )}
                                       {item.employmentTypeRestriction && item.employmentTypeRestriction !== "ANY" && (
                                         <span className="text-[9px] bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full font-semibold">{item.employmentTypeRestriction.slice(0, 4)}</span>
                                       )}
                                     </div>
                                   )}

                                   {/* Toggle filter panel */}
                                   <button
                                     type="button"
                                     title="Eligibility filters"
                                     onClick={() =>
                                       setExpandedItems(prev => {
                                         const next = new Set(prev);
                                         if (next.has(index)) next.delete(index);
                                         else next.add(index);
                                         return next;
                                       })
                                     }
                                     className={cn(
                                       "h-8 w-8 flex items-center justify-center rounded-md transition-colors",
                                       isExpanded
                                         ? "bg-primary text-primary-foreground"
                                         : hasFilters
                                         ? "text-orange-600 bg-orange-50 border border-orange-200"
                                         : "text-muted-foreground hover:bg-muted"
                                     )}
                                   >
                                     <SlidersHorizontal className="w-3.5 h-3.5" />
                                   </button>

                                   <button
                                     type="button"
                                     onClick={() => removeItem(index)}
                                     className="h-8 w-8 flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                               </div>

                               {/* ── Expanded Filter Panel ── */}
                               {isExpanded && (
                                 <div className="border-t border-primary/20 p-4 bg-background space-y-4">
                                   <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-1.5">
                                     <SlidersHorizontal className="h-3 w-3" /> Eligibility Filters
                                   </p>

                                   <div className="grid grid-cols-3 gap-3">
                                     {/* Gender Restriction */}
                                     <div className="space-y-1.5">
                                       <Label className="text-xs font-medium">Gender Restriction</Label>
                                       <Select
                                         value={item.genderRestriction ?? "ANY"}
                                         onValueChange={v => updateItem(index, { genderRestriction: v as any })}
                                       >
                                         <SelectTrigger className="h-8 text-xs">
                                           <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent>
                                           <SelectItem value="ANY">Any Gender</SelectItem>
                                           <SelectItem value="FEMALE_ONLY">♀ Female Only — Maternity</SelectItem>
                                           <SelectItem value="MALE_ONLY">♂ Male Only — Paternity</SelectItem>
                                         </SelectContent>
                                       </Select>
                                     </div>

                                     {/* Min Service Months */}
                                     <div className="space-y-1.5">
                                       <Label className="text-xs font-medium">Min. Service (Months)</Label>
                                       <Input
                                         type="number"
                                         min="0"
                                         className="h-8 text-xs"
                                         placeholder="0 = no restriction"
                                         value={item.minServiceMonths ?? 0}
                                         onChange={e => updateItem(index, { minServiceMonths: parseInt(e.target.value) || 0 })}
                                       />
                                       <p className="text-[10px] text-muted-foreground">e.g. 6 = eligible after 6 months</p>
                                     </div>

                                     {/* Employment Type */}
                                     <div className="space-y-1.5">
                                       <Label className="text-xs font-medium">Employment Type</Label>
                                       <Select
                                         value={item.employmentTypeRestriction ?? "ANY"}
                                         onValueChange={v => updateItem(index, { employmentTypeRestriction: v as any })}
                                       >
                                         <SelectTrigger className="h-8 text-xs">
                                           <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent>
                                           <SelectItem value="ANY">Any Type</SelectItem>
                                           <SelectItem value="PERMANENT">Permanent Only</SelectItem>
                                           <SelectItem value="PROBATION">Probation Period</SelectItem>
                                           <SelectItem value="CONTRACT">Contract Staff</SelectItem>
                                         </SelectContent>
                                       </Select>
                                     </div>
                                   </div>

                                   <div className="grid grid-cols-2 gap-3">
                                     {/* Max Carry Forward Override */}
                                     <div className="space-y-1.5">
                                       <Label className="text-xs font-medium">Max Carry Forward Override (Days)</Label>
                                       <Input
                                         type="number"
                                         min="0"
                                         className="h-8 text-xs"
                                         placeholder="Blank = use global setting"
                                         value={item.maxCarryForwardOverride ?? ""}
                                         onChange={e =>
                                           updateItem(index, {
                                             maxCarryForwardOverride: e.target.value === "" ? undefined : parseInt(e.target.value),
                                           })
                                         }
                                       />
                                       <p className="text-[10px] text-muted-foreground">Overrides the global carry-forward cap for this leave type</p>
                                     </div>

                                     {/* Encashment Override */}
                                     <div className="space-y-1.5">
                                       <Label className="text-xs font-medium">Encashment Policy</Label>
                                       <Select
                                         value={item.encashmentOverride ?? "SYSTEM_DEFAULT"}
                                         onValueChange={v => updateItem(index, { encashmentOverride: v as any })}
                                       >
                                         <SelectTrigger className="h-8 text-xs">
                                           <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent>
                                           <SelectItem value="SYSTEM_DEFAULT">Use System Default</SelectItem>
                                           <SelectItem value="ALLOWED">Allow Encashment</SelectItem>
                                           <SelectItem value="DISALLOWED">Disallow Encashment</SelectItem>
                                         </SelectContent>
                                       </Select>
                                       <p className="text-[10px] text-muted-foreground">Override global encashment setting for this leave</p>
                                     </div>
                                   </div>
                                 </div>
                               )}
                             </div>
                           );
                        })}
                     </div>
                  )}
               </div>
           </div>
           <DialogFooter>
               <Button variant="outline" onClick={closeForm}>Cancel</Button>
               <Button 
                  disabled={!form.templateName || !form.academicYear || saveMutation.isPending}
                  onClick={() => saveMutation.mutate(form)}
               >
                 {saveMutation.isPending ? "Saving..." : "Save Template"}
               </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD TEMPLATE TO INDIVIDUAL STAFF DIALOG */}
      <Dialog open={addTemplateOpen} onOpenChange={(o) => { if (!o) setAddTemplateOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Template to Staff</DialogTitle>
            <DialogDescription>
              Select a template and academic year. The staff member can hold multiple templates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template <span className="text-destructive">*</span></Label>
              <Select value={staffAddTemplateRef} onValueChange={setStaffAddTemplateRef}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.uuid} value={t.uuid}>
                      {t.templateName}
                      <span className="ml-1 text-muted-foreground text-xs">({t.academicYear})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Academic Year <span className="text-destructive">*</span></Label>
              <Select value={staffYear} onValueChange={setStaffYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACADEMIC_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTemplateOpen(false)}>Cancel</Button>
            <Button
              disabled={!staffAddTemplateRef || !staffYear || !staffRef || assignToStaffMutation.isPending}
              onClick={() => assignToStaffMutation.mutate()}
            >
              {assignToStaffMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Assigning…</>
              ) : "Assign Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog 
         open={Boolean(deleteTarget)}
         onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
         title="Delete Template"
         description={`Are you sure you want to delete '${deleteTarget?.templateName}'? Existing assigned staff mappings using this template will be affected.`}
         confirmLabel="Delete"
         onConfirm={() => {
            if (deleteTarget) deleteMutation.mutate(deleteTarget.uuid);
         }}
         loading={deleteMutation.isPending}
      />
    </div>
  );
}
