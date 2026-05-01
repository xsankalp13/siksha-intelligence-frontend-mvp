import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Pencil,
  
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type {
  CourseEnrollmentDTO,
  EnrollmentStatus,
  TrainingCourseDTO,
} from "@/services/types/hrms";
import EmptyState from "@/features/hrms/components/EmptyState";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";

const ENROLLMENT_STATUS_COLORS: Record<EnrollmentStatus, string> = {
  ENROLLED:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  IN_PROGRESS:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  DROPPED:
    "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

interface CourseFormState {
  title: string;
  description: string;
  category: string;
  durationHours: number;
  isMandatory: boolean;
}

const DEFAULT_COURSE_FORM: CourseFormState = {
  title: "",
  description: "",
  category: "",
  durationHours: 1,
  isMandatory: false,
};

interface EnrollFormState {
  courseId: string;
  staffRef: string | null;
}

export default function TrainingCatalog() {
  const qc = useQueryClient();
  const { formatDate } = useHrmsFormatters();

  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourseDTO | null>(null);
  const [courseForm, setCourseForm] = useState<CourseFormState>(DEFAULT_COURSE_FORM);
  const [deleteTarget, setDeleteTarget] = useState<TrainingCourseDTO | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState<EnrollFormState>({ courseId: "", staffRef: null });
  const [completingEnrollment, setCompletingEnrollment] = useState<CourseEnrollmentDTO | null>(null);
  const [completionScore, setCompletionScore] = useState<string>("");

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["hrms", "training", "courses"],
    queryFn: () => hrmsService.listCourses().then((r) => r.data),
  });

  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ["hrms", "training", "enrollments", courses.map((course) => course.uuid).join(",")],
    queryFn: async () => {
      if (courses.length === 0) return [];
      const responses = await Promise.all(
        courses.map((course) => hrmsService.listEnrollments(course.uuid).then((r) => r.data.content))
      );
      return responses.flat();
    },
    enabled: courses.length > 0,
  });

  const saveCourseMutation = useMutation({
    mutationFn: () => {
      if (!courseForm.title.trim()) throw new Error("Course title is required.");
      const payload = {
        title: courseForm.title.trim(),
        description: courseForm.description || undefined,
        category: courseForm.category || undefined,
        durationHours: courseForm.durationHours,
        isMandatory: courseForm.isMandatory,
      };
      return editingCourse
        ? hrmsService.updateCourse(editingCourse.uuid, payload)
        : hrmsService.createCourse(payload);
    },
    onSuccess: () => {
      toast.success(editingCourse ? "Course updated" : "Course created");
      qc.invalidateQueries({ queryKey: ["hrms", "training", "courses"] });
      setCourseFormOpen(false);
      setEditingCourse(null);
      setCourseForm(DEFAULT_COURSE_FORM);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (uuid: string) => hrmsService.deleteCourse(uuid),
    onSuccess: () => {
      toast.success("Course deleted");
      qc.invalidateQueries({ queryKey: ["hrms", "training", "courses"] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const enrollMutation = useMutation({
    mutationFn: () => {
      if (!enrollForm.courseId || !enrollForm.staffRef)
        throw new Error("Course and staff are required.");
      return hrmsService.enrollStaff(enrollForm.courseId, enrollForm.staffRef);
    },
    onSuccess: () => {
      toast.success("Staff enrolled successfully");
      qc.invalidateQueries({ queryKey: ["hrms", "training", "enrollments"] });
      setEnrollOpen(false);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const completeMutation = useMutation({
    mutationFn: ({ courseId, enrollmentId, score }: { courseId: string; enrollmentId: string; score?: number }) =>
      hrmsService.completeEnrollment(courseId, enrollmentId, score),
    onSuccess: () => {
      toast.success("Enrollment marked complete");
      qc.invalidateQueries({ queryKey: ["hrms", "training", "enrollments"] });
      setCompletingEnrollment(null);
      setCompletionScore("");
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const openCreate = () => {
    setEditingCourse(null);
    setCourseForm(DEFAULT_COURSE_FORM);
    setCourseFormOpen(true);
  };

  const openEdit = (course: TrainingCourseDTO) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description ?? "",
      category: course.category ?? "",
      durationHours: course.durationHours,
      isMandatory: course.isMandatory,
    });
    setCourseFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              📚
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Training Catalog</h2>
              <p className="text-sm text-white/70">Manage courses and track staff training progress</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEnrollOpen(true)} className="bg-white/20 border-white/30 text-white hover:bg-white/30">
              🎓 Enroll Staff
            </Button>
            <Button onClick={openCreate} className="bg-white text-indigo-700 hover:bg-white/90 font-semibold shadow-sm">
              ➕ New Course
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Course Catalog</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
        </TabsList>

        {/* ── Courses ── */}
        <TabsContent value="courses" className="mt-4">
          {loadingCourses ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses yet"
              description="Add courses to the catalog to start training your staff."
              actionLabel="New Course"
              onAction={openCreate}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course: TrainingCourseDTO) => (
                <Card key={course.uuid} className="group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">
                        {course.title}
                      </CardTitle>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(course)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(course)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {course.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {course.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {course.category && (
                        <Badge variant="outline" className="text-xs">
                          {course.category}
                        </Badge>
                      )}
                      {course.isMandatory && (
                        <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs dark:bg-red-950 dark:text-red-300">
                          Mandatory
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{course.durationHours}h duration</span>
                      {course.enrollmentCount != null && (
                        <span>{course.enrollmentCount} enrolled</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Enrollments ── */}
        <TabsContent value="enrollments" className="mt-4 space-y-3">
          {loadingEnrollments ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : enrollments.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No enrollments"
              description="Enroll staff in courses to track their training progress."
              actionLabel="Enroll Staff"
              onAction={() => setEnrollOpen(true)}
            />
          ) : (
            enrollments.map((enr: CourseEnrollmentDTO) => (
              <Card key={enr.uuid}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{enr.staffName}</p>
                    <p className="text-xs text-muted-foreground">
                      {enr.courseTitle} · Enrolled {formatDate(enr.enrolledAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {enr.score != null && (
                      <span className="text-sm font-medium">{enr.score}%</span>
                    )}
                    <Badge variant="secondary" className={ENROLLMENT_STATUS_COLORS[enr.status]}>
                      {enr.status.replace("_", " ")}
                    </Badge>
                    {(enr.status === "ENROLLED" || enr.status === "IN_PROGRESS") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => setCompletingEnrollment(enr)}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Course Dialog */}
      <Dialog open={courseFormOpen} onOpenChange={(o) => { if (!o) { setCourseFormOpen(false); setEditingCourse(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Course" : "New Course"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={courseForm.title}
                onChange={(e) => setCourseForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Child Safeguarding Training"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={courseForm.description}
                onChange={(e) => setCourseForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  value={courseForm.category}
                  onChange={(e) => setCourseForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="e.g. Compliance"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (hours)</Label>
                <Input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={courseForm.durationHours}
                  onChange={(e) =>
                    setCourseForm((p) => ({ ...p, durationHours: parseFloat(e.target.value) || 1 }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="mandatory">Mandatory</Label>
              <Switch
                id="mandatory"
                checked={courseForm.isMandatory}
                onCheckedChange={(v) => setCourseForm((p) => ({ ...p, isMandatory: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCourseFormOpen(false); setEditingCourse(null); }}>Cancel</Button>
            <Button disabled={saveCourseMutation.isPending || !courseForm.title} onClick={() => saveCourseMutation.mutate()}>
              {saveCourseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCourse ? "Save Changes" : "Create Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll Staff Dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Staff in Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Course <span className="text-destructive">*</span></Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={enrollForm.courseId}
                onChange={(e) => setEnrollForm((p) => ({ ...p, courseId: e.target.value }))}
              >
                <option value="">Select course...</option>
                {courses.map((c) => (
                  <option key={c.uuid} value={c.uuid}>{c.title}</option>
                ))}
              </select>
            </div>
            <StaffSearchSelect
              value={enrollForm.staffRef}
              onChange={(uuid) => setEnrollForm((p) => ({ ...p, staffRef: uuid }))}
              label="Staff Member"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>Cancel</Button>
            <Button
              disabled={enrollMutation.isPending || !enrollForm.courseId || !enrollForm.staffRef}
              onClick={() => enrollMutation.mutate()}
            >
              {enrollMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Enrollment Dialog */}
      <Dialog open={!!completingEnrollment} onOpenChange={(o) => !o && setCompletingEnrollment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Enrollment Complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {completingEnrollment?.staffName} · {completingEnrollment?.courseTitle}
            </p>
            <div className="space-y-1.5">
              <Label>Score (optional, 0–100)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={completionScore}
                onChange={(e) => setCompletionScore(e.target.value)}
                placeholder="e.g. 85"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingEnrollment(null)}>Cancel</Button>
            <Button
              disabled={completeMutation.isPending}
              onClick={() =>
                completingEnrollment &&
                completeMutation.mutate({
                  courseId: completingEnrollment.courseId,
                  enrollmentId: completingEnrollment.uuid,
                  score: completionScore ? parseFloat(completionScore) : undefined,
                })
              }
            >
              {completeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Course Confirm */}
      <ReviewDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Course"
        description={`Delete "${deleteTarget?.title}"? All enrollment records for this course will also be removed.`}
        severity="danger"
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteCourseMutation.mutate(deleteTarget.uuid)}
        isPending={deleteCourseMutation.isPending}
        requireCheckbox
        checkboxLabel="I understand this will delete all associated enrollments"
      >
        <div />
      </ReviewDialog>
    </div>
  );
}
