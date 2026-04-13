import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Layers,
  Lock,
  GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

import {
  useGetAllTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from "../hooks/useExaminationQueries";
import type {
  ExamTemplateRequestDTO,
  ExamTemplateResponseDTO,
  TemplateSectionDTO,
} from "@/services/types/examTemplate";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const emptySection: TemplateSectionDTO = {
  sectionName: "",
  sectionOrder: 1,
  questionCount: 0,
  marksPerQuestion: 1,
  isObjective: true,
  isSubjective: false,
};

const SortableSectionRow = ({
  section,
  index,
  updateSection,
  removeSection,
  canRemove
}: {
  section: TemplateSectionDTO;
  index: number;
  updateSection: (index: number, field: keyof TemplateSectionDTO, value: any) => void;
  removeSection: (index: number) => void;
  canRemove: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `section-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[auto_2fr_1fr_1fr_auto_auto_auto] gap-2 items-center bg-muted/20 p-2 rounded-lg border border-border/50"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="w-4 h-4" />
      </div>
      <Input
        value={section.sectionName}
        onChange={(e) => updateSection(index, "sectionName", e.target.value)}
        placeholder="Section A"
        className="h-8 text-sm"
      />
      <Input
        type="number"
        min={1}
        value={section.questionCount || ""}
        onChange={(e) => updateSection(index, "questionCount", parseInt(e.target.value) || 0)}
        placeholder="Q Count"
        className="h-8 text-sm"
      />
      <Input
        type="number"
        min={1}
        value={section.marksPerQuestion || ""}
        onChange={(e) => updateSection(index, "marksPerQuestion", parseFloat(e.target.value) || 0)}
        placeholder="Marks/Q"
        className="h-8 text-sm"
      />
      <div className="flex items-center gap-1.5 justify-center" title="Objective">
        <Switch
          checked={section.isObjective ?? false}
          onCheckedChange={(checked) => updateSection(index, "isObjective", checked)}
          className="scale-75"
        />
        <span className="text-[10px] text-muted-foreground">OBJ</span>
      </div>
      <div className="flex items-center gap-1.5 justify-center" title="Subjective">
        <Switch
          checked={section.isSubjective ?? false}
          onCheckedChange={(checked) => updateSection(index, "isSubjective", checked)}
          className="scale-75"
        />
        <span className="text-[10px] text-muted-foreground">SUB</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-destructive"
        onClick={() => removeSection(index)}
        disabled={!canRemove}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

export default function ExamTemplatePanel() {
  const { data: templates = [], isLoading } = useGetAllTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExamTemplateResponseDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamTemplateResponseDTO | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [sections, setSections] = useState<TemplateSectionDTO[]>([{ ...emptySection }]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = parseInt(active.id.split('-')[1]);
        const newIndex = parseInt(over.id.split('-')[1]);
        return arrayMove(items, oldIndex, newIndex).map((s, idx) => ({ ...s, sectionOrder: idx + 1 }));
      });
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setName("");
    setSections([{ ...emptySection }]);
    setDialogOpen(true);
  };

  const openEdit = (template: ExamTemplateResponseDTO) => {
    if (template.inUse) return; // Guard
    setEditingTemplate(template);
    setName(template.name);
    setSections(template.sections.map((s, idx) => ({
      sectionName: s.sectionName,
      sectionOrder: s.sectionOrder || idx + 1,
      questionCount: s.questionCount,
      marksPerQuestion: s.marksPerQuestion,
      isObjective: s.isObjective ?? true,
      isSubjective: s.isSubjective ?? false,
    })));
    setDialogOpen(true);
  };

  const addSection = () => {
    setSections([...sections, { ...emptySection, sectionOrder: sections.length + 1 }]);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    setSections(sections.filter((_, i) => i !== index).map((s, idx) => ({ ...s, sectionOrder: idx + 1 })));
  };

  const updateSection = (index: number, field: keyof TemplateSectionDTO, value: any) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);
  };

  const currentTotalMarks = sections.reduce((acc, curr) => acc + (curr.questionCount * curr.marksPerQuestion), 0);
  const currentTotalQuestions = sections.reduce((acc, curr) => acc + curr.questionCount, 0);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (sections.some(s => !s.sectionName.trim() || s.questionCount <= 0 || s.marksPerQuestion <= 0)) {
      toast.error("All sections must have a name, positive question count, and marks");
      return;
    }

    const data: ExamTemplateRequestDTO = {
      name: name.trim(),
      sections: sections.map((s, idx) => ({ ...s, sectionOrder: idx + 1 }))
    };

    if (editingTemplate) {
      updateTemplate.mutate(
        { id: editingTemplate.id, data },
        {
          onSuccess: () => {
            toast.success("Template updated");
            setDialogOpen(false);
          },
          onError: () => toast.error("Failed to update template")
        }
      );
    } else {
      createTemplate.mutate(data, {
        onSuccess: () => {
          toast.success("Template created");
          setDialogOpen(false);
        },
        onError: () => toast.error("Failed to create template")
      });
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteTemplate.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteTarget(null);
      },
      onError: () => toast.error("Failed to delete template")
    });
  };

  const getSectionTypeLabel = (s: TemplateSectionDTO) => {
    if (s.isObjective && s.isSubjective) return "Mixed";
    if (s.isObjective) return "Objective";
    if (s.isSubjective) return "Subjective";
    return "—";
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
          {templates.length} template{templates.length !== 1 ? "s" : ""} available
        </p>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          New Template
        </Button>
      </div>

      {/* List */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
          <div className="p-4 rounded-full bg-muted">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No templates yet</p>
          <p className="text-sm text-muted-foreground">
            Create templates to define exam structures and enable dynamic evaluations
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {templates.map((template, i) => {
              const isExpanded = expandedId === template.id;
              return (
                <motion.div
                  key={template.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border/60 bg-card overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground">
                            {template.name}
                          </h4>
                          {template.inUse && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 pl-1">
                              <Lock className="w-3 h-3" /> In Use (Locked)
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                           <span>Total Questions: <strong className="text-foreground">{template.totalQuestions}</strong></span>
                           <span>Total Marks: <strong className="text-foreground">{template.totalMarks}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Layers className="w-3 h-3 mr-1" />
                        {template.sections.length} sections
                      </Badge>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(template);
                                }}
                                disabled={template.inUse}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {template.inUse && (
                            <TooltipContent>Cannot edit an active template</TooltipContent>
                          )}
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-block">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(template);
                                }}
                                disabled={template.inUse}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {template.inUse && (
                            <TooltipContent>Cannot delete an active template</TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Sections View */}
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
                          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                            <span>Section</span>
                            <span>Questions</span>
                            <span>Marks/Q</span>
                            <span>Type</span>
                          </div>
                          <div className="space-y-1.5">
                            {[...template.sections].sort((a, b) => (a.sectionOrder ?? 0) - (b.sectionOrder ?? 0)).map((s) => (
                              <div key={s.id || s.sectionName} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 items-center bg-muted/30 px-3 py-2 text-sm rounded-lg">
                                <span className="font-medium text-foreground">{s.sectionName}</span>
                                <span>{s.questionCount}</span>
                                <span>{s.marksPerQuestion}</span>
                                <span>
                                  <Badge variant="outline" className="text-[10px] font-normal">{getSectionTypeLabel(s)}</Badge>
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Exam Template" : "Create Exam Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Template Name <span className="text-destructive">*</span></label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mid-Term Type-A"
              />
            </div>

            {/* Sections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Exam Sections <span className="text-destructive">*</span></label>
                <div className="flex items-center gap-4 text-xs font-medium bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                  <span className="text-muted-foreground">Preview:</span>
                  <span>Q's: <strong className="text-foreground">{currentTotalQuestions}</strong></span>
                  <span>Marks: <strong className="text-foreground">{currentTotalMarks}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-[auto_2fr_1fr_1fr_auto_auto_auto] gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
                <span className="w-4"></span>
                <span>Name</span>
                <span>Q Count</span>
                <span>Marks/Q</span>
                <span>OBJ</span>
                <span>SUB</span>
                <span></span>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sections.map((_, i) => `section-${i}`)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {sections.map((section, idx) => (
                      <SortableSectionRow
                        key={`section-${idx}`}
                        section={section}
                        index={idx}
                        updateSection={updateSection}
                        removeSection={removeSection}
                        canRemove={sections.length > 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 gap-1 border-dashed"
                onClick={addSection}
              >
                <Plus className="w-3 h-3" /> Add Section
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createTemplate.isPending || updateTemplate.isPending}>
                {(createTemplate.isPending || updateTemplate.isPending) && (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                )}
                {editingTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{deleteTarget?.name}" template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {deleteTemplate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
