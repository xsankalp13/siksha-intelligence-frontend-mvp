import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, User, Search, Link2, Pencil, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { financeService } from "@/services/finance";
import { adminService } from "@/services/admin";
import { academicClassService, type AcademicClassResponseDto } from "@/services/academicClass";
import type {
  FeeStructureResponseDTO,
  StudentFeeMapResponseDTO,
  StudentFeeMapCreateDTO,
} from "@/services/types/finance";
import type { StudentSummaryDTO } from "@/services/admin";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const singleAssignSchema = z.object({
  studentId: z.coerce.number().min(1, "Student is required"),
  structureId: z.coerce.number().min(1, "Fee structure is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  notes: z.string().optional(),
});

const bulkAssignSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  structureId: z.coerce.number().min(1, "Fee structure is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  notes: z.string().optional(),
});

type SingleAssignForm = z.infer<typeof singleAssignSchema>;
type BulkAssignForm = z.infer<typeof bulkAssignSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface StudentFeeAssignmentTabProps {
  structures: FeeStructureResponseDTO[];
  studentFeeMaps: StudentFeeMapResponseDTO[];
  loading: boolean;
  onRefresh: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStructureName = (id: number, structures: FeeStructureResponseDTO[]) =>
  structures.find((s) => s.structureId === id)?.name ?? `Structure #${id}`;

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentFeeAssignmentTab({
  structures,
  studentFeeMaps,
  loading,
  onRefresh,
}: StudentFeeAssignmentTabProps) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<StudentFeeMapResponseDTO | null>(null);

  // Student search state
  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState<StudentSummaryDTO[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummaryDTO | null>(null);

  // Classes
  const [classes, setClasses] = useState<AcademicClassResponseDto[]>([]);

  // Bulk progress
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, running: false });

  // ── Data Fetching ──
  useEffect(() => {
    academicClassService.getAllClasses().then(setClasses).catch(() => {});
  }, []);

  const searchStudents = useCallback(async (q: string) => {
    if (!q.trim()) { setStudents([]); return; }
    setStudentLoading(true);
    try {
      const res = await adminService.listStudents({ search: q, size: 10 });
      setStudents(res.data.content);
    } catch {
      /* silent */
    } finally {
      setStudentLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchStudents(studentSearch), 350);
    return () => clearTimeout(timer);
  }, [studentSearch, searchStudents]);

  // ── Forms ──
  const singleForm = useForm<SingleAssignForm>({
    resolver: zodResolver(singleAssignSchema),
    defaultValues: { studentId: 0, structureId: 0, effectiveDate: format(new Date(), "yyyy-MM-dd"), notes: "" },
  });

  const bulkForm = useForm<BulkAssignForm>({
    resolver: zodResolver(bulkAssignSchema),
    defaultValues: { classId: "", structureId: 0, effectiveDate: format(new Date(), "yyyy-MM-dd"), notes: "" },
  });

  const openCreate = (m: "single" | "bulk") => {
    setMode(m);
    setEditingMap(null);
    setSelectedStudent(null);
    setStudentSearch("");
    setStudents([]);
    singleForm.reset({ studentId: 0, structureId: 0, effectiveDate: format(new Date(), "yyyy-MM-dd"), notes: "" });
    bulkForm.reset({ classId: "", structureId: 0, effectiveDate: format(new Date(), "yyyy-MM-dd"), notes: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (map: StudentFeeMapResponseDTO) => {
    setMode("single");
    setEditingMap(map);
    singleForm.reset({
      studentId: map.studentId,
      structureId: map.structureId,
      effectiveDate: map.effectiveDate,
      notes: map.notes ?? "",
    });
    setIsDialogOpen(true);
  };

  // ── Submit: Single ──
  const onSubmitSingle = async (values: SingleAssignForm) => {
    try {
      const payload: StudentFeeMapCreateDTO = {
        studentId: values.studentId,
        structureId: values.structureId,
        effectiveDate: values.effectiveDate,
        notes: values.notes,
      };
      if (editingMap) {
        await financeService.updateStudentFeeMap(editingMap.mapId, payload);
        toast.success("Fee assignment updated successfully");
      } else {
        await financeService.createStudentFeeMap(payload);
        toast.success("Fee structure assigned to student");
      }
      setIsDialogOpen(false);
      onRefresh();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to save assignment");
    }
  };

  // ── Submit: Bulk ──
  const onSubmitBulk = async (values: BulkAssignForm) => {
    try {
      const res = await adminService.listStudents({ classId: values.classId, size: 1000 });
      const classStudents = res.data.content;
      if (classStudents.length === 0) {
        toast.error("No students found in this class");
        return;
      }
      setBulkProgress({ current: 0, total: classStudents.length, running: true });
      let success = 0, failed = 0;
      for (const student of classStudents) {
        try {
          await financeService.createStudentFeeMap({
            studentId: student.studentId,
            structureId: values.structureId,
            effectiveDate: values.effectiveDate,
            notes: values.notes,
          });
          success++;
        } catch {
          failed++;
        }
        setBulkProgress((p) => ({ ...p, current: p.current + 1 }));
      }
      setBulkProgress({ current: 0, total: 0, running: false });
      toast.success(`Bulk assignment done — ${success} succeeded, ${failed} failed`);
      setIsDialogOpen(false);
      onRefresh();
    } catch {
      setBulkProgress({ current: 0, total: 0, running: false });
      toast.error("Failed to fetch class students");
    }
  };

  const activeStructures = structures.filter((s) => s.active);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/50 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-sm">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Fee Structure Assignments
          </h3>
          <p className="text-sm text-muted-foreground">
            Link students or entire classes to a fee structure.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate("bulk")} className="gap-2">
            <Users className="h-4 w-4" /> Assign by Class
          </Button>
          <Button onClick={() => openCreate("single")} className="gap-2">
            <Plus className="h-4 w-4" /> Assign Student
          </Button>
        </div>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Assignments</CardTitle>
          <CardDescription>{studentFeeMaps.length} student-structure mappings configured</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student ID</TableHead>
                <TableHead>Fee Structure</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : studentFeeMaps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-14 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <Link2 className="h-8 w-8 opacity-20" />
                      <p>No assignments yet. Assign a fee structure to begin.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                studentFeeMaps.map((map) => (
                  <TableRow key={map.mapId} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-sm">#{map.studentId}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {getStructureName(map.structureId, structures)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {map.effectiveDate}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {map.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(map)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!bulkProgress.running) setIsDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingMap ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingMap ? "Edit Assignment" : mode === "single" ? "Assign to Student" : "Assign to Entire Class"}
            </DialogTitle>
          </DialogHeader>

          {!editingMap && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "bulk")} className="mb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="single" className="gap-2"><User className="h-3.5 w-3.5" /> Individual</TabsTrigger>
                <TabsTrigger value="bulk" className="gap-2"><Users className="h-3.5 w-3.5" /> Entire Class</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <AnimatePresence mode="wait">
            {/* ── SINGLE MODE ── */}
            {(mode === "single") && (
              <motion.div key="single" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Form {...singleForm}>
                  <form onSubmit={singleForm.handleSubmit(onSubmitSingle)} className="space-y-4">
                    {/* Student Search */}
                    {!editingMap && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Search Student</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name or enrollment number..."
                            className="pl-9"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                          />
                        </div>
                        {studentLoading && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                          </p>
                        )}
                        {students.length > 0 && !selectedStudent && (
                          <div className="border rounded-lg divide-y max-h-40 overflow-y-auto bg-background shadow-lg">
                            {students.map((s) => (
                              <button
                                key={s.studentId}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between"
                                onClick={() => {
                                  setSelectedStudent(s);
                                  singleForm.setValue("studentId", s.studentId, { shouldValidate: true });
                                  setStudentSearch(`${s.firstName} ${s.lastName}`);
                                  setStudents([]);
                                }}
                              >
                                <span>{s.firstName} {s.lastName}</span>
                                <span className="text-muted-foreground text-xs">{s.enrollmentNumber}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {selectedStudent && (
                          <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                            <span className="text-muted-foreground ml-auto">ID: {selectedStudent.studentId}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {editingMap && (
                      <div className="px-3 py-2 bg-muted/50 rounded-lg text-sm">
                        <span className="text-muted-foreground">Student ID: </span>
                        <span className="font-mono font-medium">#{editingMap.studentId}</span>
                      </div>
                    )}

                    {/* Fee Structure */}
                    <FormField
                      control={singleForm.control}
                      name="structureId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fee Structure</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(parseInt(val))}
                            value={field.value > 0 ? field.value.toString() : undefined}
                          >
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select an active structure" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeStructures.map((s) => (
                                <SelectItem key={s.structureId} value={s.structureId.toString()}>
                                  {s.name} ({s.academicYear})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Effective Date */}
                    <FormField
                      control={singleForm.control}
                      name="effectiveDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Effective From</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notes */}
                    <FormField
                      control={singleForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Scholarship adjustment" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <DialogFooter className="pt-2">
                      <Button type="submit" className="w-full">
                        {editingMap ? "Update Assignment" : "Assign Structure"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* ── BULK MODE ── */}
            {mode === "bulk" && !editingMap && (
              <motion.div key="bulk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Form {...bulkForm}>
                  <form onSubmit={bulkForm.handleSubmit(onSubmitBulk)} className="space-y-4">
                    {/* Class */}
                    <FormField
                      control={bulkForm.control}
                      name="classId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Class</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {classes.map((c) => (
                                <SelectItem key={c.classId} value={c.classId}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Fee Structure */}
                    <FormField
                      control={bulkForm.control}
                      name="structureId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fee Structure</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(parseInt(val))}
                            value={field.value > 0 ? field.value.toString() : undefined}
                          >
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select an active structure" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activeStructures.map((s) => (
                                <SelectItem key={s.structureId} value={s.structureId.toString()}>
                                  {s.name} ({s.academicYear})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Effective Date */}
                    <FormField
                      control={bulkForm.control}
                      name="effectiveDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Effective From</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Notes */}
                    <FormField
                      control={bulkForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl><Input placeholder="e.g. Academic Year 2024-25 batch" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Bulk Progress */}
                    {bulkProgress.running && bulkProgress.total > 0 && (
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Assigning students...</span>
                          <span>{bulkProgress.current} / {bulkProgress.total}</span>
                        </div>
                        <Progress value={(bulkProgress.current / bulkProgress.total) * 100} />
                      </div>
                    )}

                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">
                        This will attempt to assign the selected structure to <strong>all students</strong> in the class. Students already assigned will result in a conflict error (skipped).
                      </p>
                    </div>

                    <DialogFooter className="pt-2">
                      <Button type="submit" disabled={bulkProgress.running} className="w-full gap-2">
                        {bulkProgress.running && <Loader2 className="h-4 w-4 animate-spin" />}
                        {bulkProgress.running ? "Processing..." : "Bulk Assign to Class"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
