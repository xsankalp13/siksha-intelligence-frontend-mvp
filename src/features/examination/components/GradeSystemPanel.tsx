import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Award,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useGetAllGradeSystems,
  useCreateGradeSystem,
  useUpdateGradeSystem,
  useDeleteGradeSystem,
} from "../hooks/useExaminationQueries";
import type {
  GradeSystemRequestDTO,
  GradeScaleRequestDTO,
  GradeSystemResponseDTO,
} from "@/services/types/examination";
import { toast } from "sonner";

const emptyScale: GradeScaleRequestDTO = {
  gradeName: "",
  minPercentage: 0,
  maxPercentage: 100,
  gradePoints: 0,
};

export default function GradeSystemPanel() {
  const { data: systems = [], isLoading } = useGetAllGradeSystems();
  const createSystem = useCreateGradeSystem();
  const updateSystem = useUpdateGradeSystem();
  const deleteSystem = useDeleteGradeSystem();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] =
    useState<GradeSystemResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<GradeSystemResponseDTO | null>(null);

  // Form
  const [systemName, setSystemName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [scales, setScales] = useState<GradeScaleRequestDTO[]>([
    { ...emptyScale },
  ]);

  const openCreate = () => {
    setEditingSystem(null);
    setSystemName("");
    setDescription("");
    setIsActive(true);
    setScales([
      { gradeName: "A+", minPercentage: 90, maxPercentage: 100, gradePoints: 10 },
      { gradeName: "A", minPercentage: 80, maxPercentage: 89, gradePoints: 9 },
      { gradeName: "B+", minPercentage: 70, maxPercentage: 79, gradePoints: 8 },
      { gradeName: "B", minPercentage: 60, maxPercentage: 69, gradePoints: 7 },
      { gradeName: "C", minPercentage: 50, maxPercentage: 59, gradePoints: 6 },
      { gradeName: "D", minPercentage: 33, maxPercentage: 49, gradePoints: 5 },
      { gradeName: "F", minPercentage: 0, maxPercentage: 32, gradePoints: 0 },
    ]);
    setDialogOpen(true);
  };

  const openEdit = (sys: GradeSystemResponseDTO) => {
    setEditingSystem(sys);
    setSystemName(sys.systemName);
    setDescription(sys.description || "");
    setIsActive(sys.active);
    setScales(
      sys.gradeScales.map((s) => ({
        gradeName: s.gradeName,
        minPercentage: s.minPercentage,
        maxPercentage: s.maxPercentage,
        gradePoints: s.gradePoints,
      }))
    );
    setDialogOpen(true);
  };

  const addScale = () => setScales([...scales, { ...emptyScale }]);

  const removeScale = (i: number) => {
    if (scales.length <= 1) return;
    setScales(scales.filter((_, idx) => idx !== i));
  };

  const updateScale = (
    i: number,
    key: keyof GradeScaleRequestDTO,
    val: string | number
  ) => {
    const updated = [...scales];
    updated[i] = {
      ...updated[i],
      [key]:
        key === "gradeName" ? val : Number(val),
    };
    setScales(updated);
  };

  const handleSubmit = () => {
    if (!systemName.trim()) {
      toast.error("System name is required");
      return;
    }
    if (scales.some((s) => !s.gradeName.trim())) {
      toast.error("All grade names are required");
      return;
    }

    const data: GradeSystemRequestDTO = {
      systemName: systemName.trim(),
      description: description.trim() || undefined,
      isActive: isActive,
      gradeScales: scales,
    };

    if (editingSystem) {
      updateSystem.mutate(
        { uuid: editingSystem.uuid, data },
        {
          onSuccess: () => {
            toast.success("Grade system updated");
            setDialogOpen(false);
          },
          onError: () => toast.error("Failed to update"),
        }
      );
    } else {
      createSystem.mutate(data, {
        onSuccess: () => {
          toast.success("Grade system created");
          setDialogOpen(false);
        },
        onError: () => toast.error("Failed to create"),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteSystem.mutate(deleteTarget.uuid, {
      onSuccess: () => {
        toast.success("Grade system deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {systems.length} grading system{systems.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Grade System
        </Button>
      </div>

      {/* Cards */}
      {systems.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <Award className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No grade systems</p>
          <p className="text-sm text-muted-foreground">
            Create a grading system (e.g. CBSE, ICSE) to auto-assign grades
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {systems.map((sys, i) => {
              const isExpanded = expandedId === sys.uuid;
              return (
                <motion.div
                  key={sys.uuid}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border/60 bg-card overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : sys.uuid)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Award className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">
                            {sys.systemName}
                          </h4>
                          <Badge
                            variant="outline"
                            className={
                              sys.active
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "text-muted-foreground"
                            }
                          >
                            {sys.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {sys.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {sys.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Layers className="w-3 h-3 mr-1" />
                        {sys.gradeScales.length} scales
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(sys);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(sys);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/40 p-4">
                          <div className="grid grid-cols-4 gap-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                            <span>Grade</span>
                            <span>Min %</span>
                            <span>Max %</span>
                            <span>Points</span>
                          </div>
                          <div className="space-y-1.5">
                            {sys.gradeScales.map((scale) => (
                              <div
                                key={scale.gradeScaleId}
                                className="grid grid-cols-4 gap-2 items-center rounded-lg bg-muted/30 px-3 py-2 text-sm"
                              >
                                <span className="font-semibold text-foreground">
                                  {scale.gradeName}
                                </span>
                                <span>{scale.minPercentage}%</span>
                                <span>{scale.maxPercentage}%</span>
                                <span>
                                  {scale.gradePoints ?? "—"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSystem ? "Edit Grade System" : "Create Grade System"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">
                System Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                placeholder="e.g. CBSE Grading System"
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <label className="text-sm font-medium">Active</label>
            </div>

            {/* Grade Scales */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Grade Scales <span className="text-destructive">*</span>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={addScale}
                >
                  <Plus className="w-3 h-3" />
                  Add Row
                </Button>
              </div>
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>Grade</span>
                <span>Min %</span>
                <span>Max %</span>
                <span>Points</span>
                <span></span>
              </div>
              <div className="space-y-2">
                {scales.map((scale, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center"
                  >
                    <Input
                      value={scale.gradeName}
                      onChange={(e) =>
                        updateScale(idx, "gradeName", e.target.value)
                      }
                      placeholder="A+"
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      value={scale.minPercentage}
                      onChange={(e) =>
                        updateScale(idx, "minPercentage", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      value={scale.maxPercentage}
                      onChange={(e) =>
                        updateScale(idx, "maxPercentage", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Input
                      type="number"
                      value={scale.gradePoints ?? 0}
                      onChange={(e) =>
                        updateScale(idx, "gradePoints", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => removeScale(idx)}
                      disabled={scales.length <= 1}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createSystem.isPending || updateSystem.isPending}
              >
                {(createSystem.isPending || updateSystem.isPending) && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                {editingSystem ? "Save Changes" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Grade System</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteTarget?.systemName}"? All associated grade scales
              will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSystem.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
