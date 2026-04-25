import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  SkipForward,
  Trash2,
  
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  AssignedParty,
  OnboardingRecordDTO,
  OnboardingStatus,
  OnboardingTemplateDTO,
  OnboardingTemplateTaskDTO,
  TaskRecordStatus,
} from "@/services/types/hrms";
import { adminService } from "@/services/admin";
import type { Department } from "@/services/types/admin";
import EmptyState from "@/features/hrms/components/EmptyState";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";

const STATUS_COLORS: Record<OnboardingStatus, string> = {
  IN_PROGRESS:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const TASK_STATUS_COLORS: Record<TaskRecordStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  DONE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  SKIPPED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const ASSIGNED_PARTY_LABELS: Record<AssignedParty, string> = {
  HR: "HR",
  STAFF: "Staff",
  BOTH: "HR & Staff",
};

interface TemplateFormState {
  templateName: string;
  description: string;
  tasks: OnboardingTemplateTaskDTO[];
}

const DEFAULT_TEMPLATE_FORM: TemplateFormState = {
  templateName: "",
  description: "",
  tasks: [
    {
      taskOrder: 1,
      taskTitle: "",
      description: "",
      dueAfterDays: 1,
      assignedParty: "HR",
    },
  ],
};

interface StartFormState {
  mode: "EXISTING" | "NEW_HIRE";
  staffRef: string | null;
  templateRef: string;
  startDate: string;
}

interface NewHireFormState {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  jobTitle: string;
  department: Department;
  designationCode: string;
  hireDate: string;
}

const DEFAULT_NEW_HIRE: NewHireFormState = {
  firstName: "",
  lastName: "",
  email: "",
  username: "",
  jobTitle: "",
  department: "ACADEMICS",
  designationCode: "TGT",
  hireDate: new Date().toISOString().substring(0, 10),
};

export default function OnboardingManagement() {
  const qc = useQueryClient();
  const { formatDate } = useHrmsFormatters();

  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<OnboardingTemplateDTO | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(
    DEFAULT_TEMPLATE_FORM
  );
  const [deleteTarget, setDeleteTarget] =
    useState<OnboardingTemplateDTO | null>(null);
  const [startFormOpen, setStartFormOpen] = useState(false);
  const [startForm, setStartForm] = useState<StartFormState>({
    mode: "EXISTING",
    staffRef: null,
    templateRef: "",
    startDate: new Date().toISOString().substring(0, 10),
  });
  const [newHireForm, setNewHireForm] = useState<NewHireFormState>(DEFAULT_NEW_HIRE);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["hrms", "onboarding-templates"],
    queryFn: () => hrmsService.listOnboardingTemplates().then((r) => r.data),
  });

  const { data: records = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["hrms", "onboarding-records"],
    queryFn: () => hrmsService.listOnboardingRecords().then((r) => r.data),
  });

  useEffect(() => {
    if (editingTemplate) {
      setTemplateForm({
        templateName: editingTemplate.templateName,
        description: editingTemplate.description ?? "",
        tasks: editingTemplate.tasks.map((t) => ({ ...t })),
      });
    } else {
      setTemplateForm(DEFAULT_TEMPLATE_FORM);
    }
  }, [editingTemplate, templateFormOpen]);

  const saveTemplateMutation = useMutation({
    mutationFn: () => {
      if (templateForm.tasks.some((t) => !t.taskTitle))
        throw new Error("All task titles are required.");
      const payload = {
        templateName: templateForm.templateName.trim(),
        description: templateForm.description || undefined,
        tasks: templateForm.tasks.map((t, i) => ({ ...t, taskOrder: i + 1 })),
      };
      return editingTemplate
        ? hrmsService.updateOnboardingTemplate(editingTemplate.uuid, payload)
        : hrmsService.createOnboardingTemplate(payload);
    },
    onSuccess: () => {
      toast.success(editingTemplate ? "Template updated" : "Template created");
      qc.invalidateQueries({ queryKey: ["hrms", "onboarding-templates"] });
      setTemplateFormOpen(false);
      setEditingTemplate(null);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (uuid: string) => hrmsService.deleteOnboardingTemplate(uuid),
    onSuccess: () => {
      toast.success("Template deleted");
      qc.invalidateQueries({ queryKey: ["hrms", "onboarding-templates"] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const startOnboardingMutation = useMutation({
    mutationFn: () => {
      if (!startForm.staffRef || !startForm.templateRef)
        throw new Error("Staff and template are required.");
      return hrmsService.startOnboarding({
        staffRef: startForm.staffRef,
        templateRef: startForm.templateRef,
        startDate: startForm.startDate,
      });
    },
    onSuccess: () => {
      toast.success("Onboarding started successfully");
      qc.invalidateQueries({ queryKey: ["hrms", "onboarding-records"] });
      setStartFormOpen(false);
      setStartForm((p) => ({ ...p, staffRef: null, templateRef: "" }));
      setNewHireForm(DEFAULT_NEW_HIRE);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const registerNewHireMutation = useMutation({
    mutationFn: async () => {
      if (!newHireForm.firstName || !newHireForm.lastName || !newHireForm.username || !newHireForm.email) {
        throw new Error("Basic information is required.");
      }
      
      // Step 1: Create the teacher
      await adminService.createTeacher({
        firstName: newHireForm.firstName,
        lastName: newHireForm.lastName,
        username: newHireForm.username,
        email: newHireForm.email,
        jobTitle: newHireForm.jobTitle,
        department: newHireForm.department,
        designationCode: newHireForm.designationCode,
        category: "TEACHING",
        hireDate: newHireForm.hireDate,
      });

      // Step 2: Fetch the UUID of the newly created staff member
      const res = await adminService.listStaff({ search: newHireForm.username });
      const createdStaff = res.data.content.find((s) => s.username === newHireForm.username);
      if (!createdStaff) {
        throw new Error("Staff created but could not be located to start onboarding.");
      }

      // Step 3: Automatically start onboarding for the new staff
      return hrmsService.startOnboarding({
        staffRef: createdStaff.uuid,
        templateRef: startForm.templateRef,
        startDate: startForm.startDate,
      });
    },
    onSuccess: () => {
      toast.success("New hire registered & onboarding started!");
      qc.invalidateQueries({ queryKey: ["hrms", "onboarding-records"] });
      setStartFormOpen(false);
      setStartForm((p) => ({ ...p, staffRef: null, templateRef: "" }));
      setNewHireForm(DEFAULT_NEW_HIRE);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({
      recordId,
      taskId,
    }: {
      recordId: string;
      taskId: string;
    }) => hrmsService.completeOnboardingTask(recordId, taskId),
    onSuccess: () => {
      toast.success("Task marked complete");
      qc.invalidateQueries({ queryKey: ["hrms", "onboarding-records"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const skipTaskMutation = useMutation({
    mutationFn: ({
      recordId,
      taskId,
    }: {
      recordId: string;
      taskId: string;
    }) => hrmsService.skipOnboardingTask(recordId, taskId),
    onSuccess: () => {
      toast.success("Task skipped");
      qc.invalidateQueries({ queryKey: ["hrms", "onboarding-records"] });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const addTask = () =>
    setTemplateForm((p) => ({
      ...p,
      tasks: [
        ...p.tasks,
        {
          taskOrder: p.tasks.length + 1,
          taskTitle: "",
          description: "",
          dueAfterDays: 1,
          assignedParty: "HR" as AssignedParty,
        },
      ],
    }));

  const removeTask = (idx: number) =>
    setTemplateForm((p) => ({
      ...p,
      tasks: p.tasks.filter((_, i) => i !== idx),
    }));

  const updateTask = <K extends keyof OnboardingTemplateTaskDTO>(
    idx: number,
    field: K,
    value: OnboardingTemplateTaskDTO[K]
  ) =>
    setTemplateForm((p) => {
      const tasks = [...p.tasks];
      tasks[idx] = { ...tasks[idx], [field]: value };
      return { ...p, tasks };
    });

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              🎓
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Onboarding Management</h2>
              <p className="text-sm text-white/70">Manage onboarding templates and track staff onboarding progress</p>
            </div>
          </div>
          <Button
            onClick={() => setStartFormOpen(true)}
            className="bg-white text-teal-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
          >
            👥 Start Onboarding
          </Button>
        </div>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Active Onboardings</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* ── Active Records ── */}
        <TabsContent value="records" className="mt-4 space-y-3">
          {loadingRecords ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No active onboardings"
              description="Start an onboarding process for a new hire."
              actionLabel="Start Onboarding"
              onAction={() => setStartFormOpen(true)}
            />
          ) : (
            records.map((rec: OnboardingRecordDTO) => (
              <Card key={rec.uuid}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{rec.staffName}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Template: {rec.templateName} · Started{" "}
                        {formatDate(rec.startedAt)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={STATUS_COLORS[rec.status]}
                        >
                          {rec.status.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Due: {formatDate(rec.targetCompletionDate)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedRecord((p) =>
                          p === rec.uuid ? null : rec.uuid
                        )
                      }
                    >
                      {expandedRecord === rec.uuid ? "Hide Tasks" : "View Tasks"}
                    </Button>
                  </div>
                  <Progress value={rec.completionPercentage} className="h-1.5" />
                  <p className="text-right text-xs text-muted-foreground">
                    {rec.completionPercentage}% complete
                  </p>
                </CardHeader>
                {expandedRecord === rec.uuid && (
                  <CardContent>
                    <Separator className="mb-3" />
                    <div className="space-y-2">
                      {rec.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start justify-between gap-3 rounded-md border p-2.5"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{task.taskTitle}</p>
                              <Badge
                                variant="secondary"
                                className={TASK_STATUS_COLORS[task.status]}
                              >
                                {task.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Assigned to: {ASSIGNED_PARTY_LABELS[task.assignedParty]} · Due:{" "}
                              {formatDate(task.dueDate)}
                            </p>
                            {task.completedByName && (
                              <p className="text-xs text-muted-foreground">
                                Completed by {task.completedByName} on{" "}
                                {formatDate(task.completedAt)}
                              </p>
                            )}
                          </div>
                          {task.status === "PENDING" && (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 border-green-300 text-green-700 hover:bg-green-50"
                                onClick={() =>
                                  completeTaskMutation.mutate({
                                    recordId: rec.uuid,
                                    taskId: task.id,
                                  })
                                }
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Done
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7"
                                onClick={() =>
                                  skipTaskMutation.mutate({
                                    recordId: rec.uuid,
                                    taskId: task.id,
                                  })
                                }
                              >
                                <SkipForward className="mr-1 h-3 w-3" />
                                Skip
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Templates ── */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setEditingTemplate(null);
                setTemplateFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
          {loadingTemplates ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No templates yet"
              description="Create an onboarding template with tasks for new hires."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {templates.map((tpl) => (
                <Card key={tpl.uuid}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{tpl.templateName}</CardTitle>
                        {tpl.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {tpl.description}
                          </p>
                        )}
                        <Badge
                          className="mt-1"
                          variant="secondary"
                          style={{ fontSize: "0.7rem" }}
                        >
                          {tpl.tasks.length} task{tpl.tasks.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingTemplate(tpl);
                            setTemplateFormOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(tpl)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {tpl.tasks.slice(0, 4).map((t) => (
                        <div key={t.taskOrder} className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-muted-foreground">
                            {t.taskOrder}.
                          </span>
                          <span>{t.taskTitle}</span>
                          <span className="text-muted-foreground">
                            ({ASSIGNED_PARTY_LABELS[t.assignedParty]}, Day {t.dueAfterDays})
                          </span>
                        </div>
                      ))}
                      {tpl.tasks.length > 4 && (
                        <p className="text-xs text-muted-foreground">
                          +{tpl.tasks.length - 4} more tasks...
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Start Onboarding Dialog */}
      <Dialog open={startFormOpen} onOpenChange={setStartFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Onboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs
              value={startForm.mode}
              onValueChange={(v) =>
                setStartForm((p) => ({ ...p, mode: v as any }))
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="EXISTING">Existing Staff</TabsTrigger>
                <TabsTrigger value="NEW_HIRE">Register New Hire</TabsTrigger>
              </TabsList>
              
              <TabsContent value="EXISTING" className="space-y-4 pt-4">
                <StaffSearchSelect
                  value={startForm.staffRef}
                  onChange={(uuid) =>
                    setStartForm((p) => ({ ...p, staffRef: uuid }))
                  }
                  label="Staff Member"
                />
              </TabsContent>

              <TabsContent value="NEW_HIRE" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>First Name <span className="text-destructive">*</span></Label>
                    <Input
                      value={newHireForm.firstName}
                      onChange={(e) => setNewHireForm(p => ({ ...p, firstName: e.target.value }))}
                      placeholder="Jane"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name <span className="text-destructive">*</span></Label>
                    <Input
                      value={newHireForm.lastName}
                      onChange={(e) => setNewHireForm(p => ({ ...p, lastName: e.target.value }))}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Email <span className="text-destructive">*</span></Label>
                    <Input
                      type="email"
                      value={newHireForm.email}
                      onChange={(e) => setNewHireForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="jane.doe@school.edu"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>ERP Username <span className="text-destructive">*</span></Label>
                    <Input
                      value={newHireForm.username}
                      onChange={(e) => setNewHireForm(p => ({ ...p, username: e.target.value }))}
                      placeholder="EMP001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Department</Label>
                    <Select
                      value={newHireForm.department}
                      onValueChange={(v) => setNewHireForm(p => ({ ...p, department: v as any }))}
                    >
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACADEMICS">Academics</SelectItem>
                        <SelectItem value="ADMINISTRATION">Administration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Designation Code</Label>
                    <Input
                      value={newHireForm.designationCode}
                      onChange={(e) => setNewHireForm(p => ({ ...p, designationCode: e.target.value.toUpperCase() }))}
                      placeholder="TGT"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Job Title</Label>
                  <Input
                    value={newHireForm.jobTitle}
                    onChange={(e) => setNewHireForm(p => ({ ...p, jobTitle: e.target.value }))}
                    placeholder="e.g. Senior Science Teacher"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="space-y-1.5">
              <Label>
                Template <span className="text-destructive">*</span>
              </Label>
              <Select
                value={startForm.templateRef}
                onValueChange={(v) =>
                  setStartForm((p) => ({ ...p, templateRef: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.uuid} value={t.uuid}>
                      {t.templateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startForm.startDate}
                onChange={(e) =>
                  setStartForm((p) => ({ ...p, startDate: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartFormOpen(false)}>
              Cancel
            </Button>
            {startForm.mode === "EXISTING" ? (
              <Button
                disabled={
                  startOnboardingMutation.isPending ||
                  !startForm.staffRef ||
                  !startForm.templateRef
                }
                onClick={() => startOnboardingMutation.mutate()}
              >
                {startOnboardingMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Start Onboarding
              </Button>
            ) : (
              <Button
                disabled={
                  registerNewHireMutation.isPending ||
                  !newHireForm.firstName ||
                  !newHireForm.lastName ||
                  !newHireForm.email ||
                  !newHireForm.username ||
                  !startForm.templateRef
                }
                onClick={() => registerNewHireMutation.mutate()}
              >
                {registerNewHireMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Register & Start
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Form Dialog */}
      <Dialog
        open={templateFormOpen}
        onOpenChange={(o) => {
          if (!o) { setTemplateFormOpen(false); setEditingTemplate(null); }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={templateForm.templateName}
                onChange={(e) =>
                  setTemplateForm((p) => ({ ...p, templateName: e.target.value }))
                }
                placeholder="e.g. Standard New Hire Onboarding"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={templateForm.description}
                onChange={(e) =>
                  setTemplateForm((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of this template..."
                rows={2}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tasks</Label>
                <Button variant="outline" size="sm" onClick={addTask}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Task
                </Button>
              </div>
              {templateForm.tasks.map((task, idx) => (
                <div key={idx} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-muted-foreground">
                      Task {idx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      disabled={templateForm.tasks.length === 1}
                      onClick={() => removeTask(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Task title *"
                    value={task.taskTitle}
                    onChange={(e) => updateTask(idx, "taskTitle", e.target.value)}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={task.description ?? ""}
                    onChange={(e) =>
                      updateTask(idx, "description", e.target.value)
                    }
                  />
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Assigned To</Label>
                      <Select
                        value={task.assignedParty}
                        onValueChange={(v) =>
                          updateTask(idx, "assignedParty", v as AssignedParty)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ASSIGNED_PARTY_LABELS).map(
                            ([k, v]) => (
                              <SelectItem key={k} value={k}>
                                {v}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32 space-y-1">
                      <Label className="text-xs">Due After (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={task.dueAfterDays}
                        onChange={(e) =>
                          updateTask(
                            idx,
                            "dueAfterDays",
                            parseInt(e.target.value) || 1
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTemplateFormOpen(false);
                setEditingTemplate(null);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={
                saveTemplateMutation.isPending || !templateForm.templateName
              }
              onClick={() => saveTemplateMutation.mutate()}
            >
              {saveTemplateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ReviewDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Template"
        description={`Delete template "${deleteTarget?.templateName}"? This cannot be undone.`}
        severity="danger"
        confirmLabel="Delete"
        onConfirm={() =>
          deleteTarget && deleteTemplateMutation.mutate(deleteTarget.uuid)
        }
        isPending={deleteTemplateMutation.isPending}
        requireCheckbox
        checkboxLabel="I confirm deletion of this template"
      >
        <div />
      </ReviewDialog>
    </div>
  );
}
