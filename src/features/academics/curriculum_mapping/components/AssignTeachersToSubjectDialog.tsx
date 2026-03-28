import { useState, useMemo, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Search, Users, Check, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

import { adminService } from "@/services/admin"
import type { StaffSummaryDTO, PageResponse } from "@/services/admin"
import type { TeacherSubjectDTO } from "@/services/types/profile"

// The shared query key used across all three mapping components
export const TEACHER_MAPPING_QUERY_KEY = ["teacher-subject-mappings"] as const

interface AssignTeachersToSubjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subject: TeacherSubjectDTO | null
}

export function AssignTeachersToSubjectDialog({
  open,
  onOpenChange,
  subject,
}: AssignTeachersToSubjectDialogProps) {
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<number>>(new Set())

  const { data: staffData, isLoading: isLoadingStaff } = useQuery<PageResponse<StaffSummaryDTO>>({
    queryKey: TEACHER_MAPPING_QUERY_KEY,
    queryFn: async () => (await adminService.listStaff({ size: 1000, staffType: "TEACHER" })).data,
    staleTime: 10 * 60 * 1000,
    enabled: open,
  })
  const allTeachers = useMemo(() => (staffData?.content ?? []).filter(t => t.active), [staffData])

  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setSelectedTeacherIds(new Set())
    }
  }, [open, subject])

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return allTeachers.filter(t => {
      const name = `${t.firstName || ""} ${t.lastName || ""} ${t.employeeId || ""} ${t.jobTitle || ""}`.toLowerCase()
      return name.includes(q)
    })
  }, [allTeachers, searchQuery])

  const toggleTeacher = (id: number) => {
    const newSet = new Set(selectedTeacherIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedTeacherIds(newSet)
  }

  const toggleAll = () => {
    if (selectedTeacherIds.size === filteredTeachers.length) {
      setSelectedTeacherIds(new Set())
    } else {
      setSelectedTeacherIds(new Set(filteredTeachers.map(t => t.staffId)))
    }
  }

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!subject) throw new Error("No subject selected")
      return adminService.bulkAssignSubjects({
        subjectId: subject.uuid,
        teacherIds: Array.from(selectedTeacherIds),
      })
    },
    onSuccess: () => {
      toast.success(`Assigned ${selectedTeacherIds.size} teacher(s) to ${subject?.name}`)

      // ── Manually patch the local cache so the right pane updates immediately.
      // We do NOT invalidate TEACHER_MAPPING_QUERY_KEY because listStaff never
      // returns teachableSubjectIds — a refetch would wipe our manual patch.
      queryClient.setQueryData<PageResponse<StaffSummaryDTO>>(
        TEACHER_MAPPING_QUERY_KEY,
        old => {
          if (!old || !subject) return old
          return {
            ...old,
            content: old.content.map(t => {
              if (!selectedTeacherIds.has(t.staffId)) return t
              const existing = t.teachableSubjectIds ?? []
              if (existing.includes(subject.uuid)) return t
              return { ...t, teachableSubjectIds: [...existing, subject.uuid] }
            }),
          }
        }
      )

      // Invalidate other caches that consume staff/timetable data
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      queryClient.invalidateQueries({ queryKey: ["timetable"] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to assign teachers")
    },
  })

  if (!subject) return null

  const teacherName = (t: StaffSummaryDTO) =>
    [t.firstName, t.lastName].filter(Boolean).join(" ") || `Staff #${t.employeeId}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: subject.color || "#94a3b8" }}
            />
            Assign Teachers to {subject.name}
          </DialogTitle>
          <DialogDescription>
            Select the teachers who can teach <strong>{subject.subjectCode}</strong>.
            This adds this subject to their competency profile.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4 min-h-[300px]">
          {isLoadingStaff ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading teachers...
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex justify-between items-center text-sm px-1">
                <span className="text-muted-foreground">
                  {filteredTeachers.length} teachers · {selectedTeacherIds.size} selected
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold" onClick={toggleAll}>
                  {selectedTeacherIds.size === filteredTeachers.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
                {filteredTeachers.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">No teachers found.</p>
                ) : (
                  filteredTeachers.map(teacher => {
                    const isSelected = selectedTeacherIds.has(teacher.staffId)
                    const alreadyMapped = teacher.teachableSubjectIds?.includes(subject.uuid) ?? false

                    return (
                      <div
                        key={teacher.staffId}
                        onClick={() => toggleTeacher(teacher.staffId)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/5 border-primary/40"
                            : alreadyMapped
                              ? "bg-muted/30 border-border/50 opacity-70"
                              : "bg-card border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : "border-input bg-background"}`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>

                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {(teacher.firstName?.[0] || "T")}{(teacher.lastName?.[0] || "")}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{teacherName(teacher)}</p>
                          <p className="text-xs text-muted-foreground">{teacher.jobTitle || "Teacher"} · {teacher.employeeId}</p>
                        </div>

                        {alreadyMapped && (
                          <Badge variant="secondary" className="text-[10px] h-5 shrink-0">Already Mapped</Badge>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={assignMutation.isPending || selectedTeacherIds.size === 0}
            className="gap-2"
          >
            {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <Users className="w-4 h-4" />
            Assign {selectedTeacherIds.size > 0 ? `(${selectedTeacherIds.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
