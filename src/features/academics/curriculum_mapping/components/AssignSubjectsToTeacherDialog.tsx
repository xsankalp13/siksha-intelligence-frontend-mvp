import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { BookOpen, Check, Search, Loader2 } from "lucide-react"

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

import { api } from "@/lib/axios"
import { adminService } from "@/services/admin"
import type { StaffSummaryDTO, PageResponse } from "@/services/admin"
import type { TeacherSubjectDTO } from "@/services/types/profile"

import { TEACHER_MAPPING_QUERY_KEY } from "./AssignTeachersToSubjectDialog"

interface AssignSubjectsToTeacherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacher: StaffSummaryDTO | null
}

export function AssignSubjectsToTeacherDialog({
  open,
  onOpenChange,
  teacher,
}: AssignSubjectsToTeacherDialogProps) {
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set())

  const { data: allSubjects = [], isLoading } = useQuery<TeacherSubjectDTO[]>({
    queryKey: ["subjects", "all"],
    queryFn: async () => (await api.get("/auth/subjects")).data,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  })

  useEffect(() => {
    if (open && teacher) {
      setSelectedSubjectIds(new Set(teacher.teachableSubjectIds ?? []))
      setSearchQuery("")
    }
  }, [open, teacher])

  const filteredSubjects = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return allSubjects.filter(s =>
      s.name.toLowerCase().includes(q) || s.subjectCode.toLowerCase().includes(q)
    )
  }, [allSubjects, searchQuery])

  const toggleSubject = (uuid: string) => {
    const newSet = new Set(selectedSubjectIds)
    if (newSet.has(uuid)) newSet.delete(uuid)
    else newSet.add(uuid)
    setSelectedSubjectIds(newSet)
  }

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!teacher?.uuid) throw new Error("Invalid teacher UUID")
      return adminService.updateStaff(teacher.uuid, {
        teachableSubjectIds: Array.from(selectedSubjectIds),
      })
    },
    onSuccess: () => {
      toast.success("Competencies updated successfully")
      
      // Manually patch the shared mapping cache — do NOT invalidate it
      // because listStaff never returns teachableSubjectIds from the backend
      queryClient.setQueryData<PageResponse<StaffSummaryDTO>>(
        TEACHER_MAPPING_QUERY_KEY,
        old => {
          if (!old || !teacher) return old
          const newIds = Array.from(selectedSubjectIds)
          return {
            ...old,
            content: old.content.map(t =>
              t.staffId === teacher.staffId
                ? { ...t, teachableSubjectIds: newIds }
                : t
            ),
          }
        }
      )

      queryClient.invalidateQueries({ queryKey: ["staff"] })
      queryClient.invalidateQueries({ queryKey: ["timetable"] })
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update subjects")
    },
  })

  if (!teacher) return null

  const teacherName = [teacher.firstName, teacher.lastName].filter(Boolean).join(" ")
    || `Staff #${teacher.employeeId}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-5 h-5 text-primary" />
            Manage Competencies
          </DialogTitle>
          <DialogDescription>
            Assign or remove subjects for <strong>{teacherName}</strong>.
            Changes will update their timetable eligibility.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4 min-h-[300px]">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading subject library...
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
                {filteredSubjects.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">No subjects found.</p>
                ) : (
                  filteredSubjects.map(subject => {
                    const isSelected = selectedSubjectIds.has(subject.uuid)
                    return (
                      <div
                        key={subject.uuid}
                        onClick={() => toggleSubject(subject.uuid)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-primary/5 border-primary/40"
                            : "bg-card border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-primary border-primary" : "border-input bg-background"}`}>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>

                        <div
                          className="w-1 h-8 rounded-full shrink-0"
                          style={{ backgroundColor: subject.color || "#94a3b8" }}
                        />

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{subject.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{subject.subjectCode}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="text-sm text-muted-foreground pt-2 border-t">
                <strong className="text-foreground">{selectedSubjectIds.size}</strong> subject(s) selected
              </div>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="gap-2">
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
