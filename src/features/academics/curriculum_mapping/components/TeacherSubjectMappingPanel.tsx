import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Building,
  MapPin,
  Search,
  Users,
  BookOpen,
  GraduationCap,
  X,
  Loader2
} from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { api } from "@/lib/axios"
import { adminService } from "@/services/admin"
import type { StaffSummaryDTO, PageResponse } from "@/services/admin"
import type { TeacherSubjectDTO } from "@/services/types/profile"

import { AssignTeachersToSubjectDialog, TEACHER_MAPPING_QUERY_KEY } from "./AssignTeachersToSubjectDialog"
import { AssignSubjectsToTeacherDialog } from "./AssignSubjectsToTeacherDialog"

export function TeacherSubjectMappingPanel() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<"by-subject" | "by-teacher">("by-subject")

  // Fetch all subjects
  const { data: allSubjects = [], isLoading: isLoadingSubjects } = useQuery<TeacherSubjectDTO[]>({
    queryKey: ["subjects", "all"],
    queryFn: async () => (await api.get("/auth/subjects")).data,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch all staff with teachableSubjectIds now included from backend
  const { data: staffData, isLoading: isLoadingStaff } = useQuery<PageResponse<StaffSummaryDTO>>({
    queryKey: TEACHER_MAPPING_QUERY_KEY,
    queryFn: async () => (await adminService.listStaff({ size: 1000, staffType: "TEACHER" })).data,
    staleTime: 10 * 60 * 1000,
  })
  const teachers = useMemo(() => (staffData?.content ?? []).filter(s => s.active), [staffData])

  // Selection state
  const [subjectSearch, setSubjectSearch] = useState("")
  const [teacherSearch, setTeacherSearch] = useState("")
  const [selectedSubject, setSelectedSubject] = useState<TeacherSubjectDTO | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<StaffSummaryDTO | null>(null)

  // Assignment dialogs
  const [assignTeachersOpen, setAssignTeachersOpen] = useState(false)
  const [assignSubjectsOpen, setAssignSubjectsOpen] = useState(false)

  // Auto-select first item when data loads and nothing is selected
  useEffect(() => {
    if (viewMode === "by-subject") {
      if (!selectedSubject && allSubjects.length > 0) {
        setSelectedSubject(allSubjects[0])
      }
    } else {
      if (!selectedTeacher && teachers.length > 0) {
        setSelectedTeacher(teachers[0])
      }
    }
  }, [viewMode, allSubjects, teachers, selectedSubject, selectedTeacher])

  // Confirm-remove dialog
  const [pendingUnmap, setPendingUnmap] = useState<{
    teacher: StaffSummaryDTO
    subjectUuid: string
    subjectName: string
  } | null>(null)

  // Derived filtered lists
  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.toLowerCase()
    return allSubjects.filter(s =>
      s.name.toLowerCase().includes(q) || s.subjectCode.toLowerCase().includes(q)
    )
  }, [allSubjects, subjectSearch])

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.toLowerCase()
    return teachers.filter(t => {
      const s = `${t.firstName || ""} ${t.lastName || ""} ${t.employeeId || ""} ${t.jobTitle || ""}`.toLowerCase()
      return s.includes(q)
    })
  }, [teachers, teacherSearch])

  const teachersMappedToSubject = useMemo(() => {
    if (!selectedSubject) return []
    return teachers.filter(t => t.teachableSubjectIds?.includes(selectedSubject.uuid))
  }, [selectedSubject, teachers])

  const subjectsForSelectedTeacher = useMemo(() => {
    if (!selectedTeacher?.teachableSubjectIds) return []
    return allSubjects.filter(s => selectedTeacher.teachableSubjectIds!.includes(s.uuid))
  }, [selectedTeacher, allSubjects])

  // Remove a teacher-subject mapping
  const unmapMutation = useMutation({
    mutationFn: async ({ teacher, subjectUuid }: { teacher: StaffSummaryDTO; subjectUuid: string }) => {
      const newIds = (teacher.teachableSubjectIds || []).filter(id => id !== subjectUuid)
      return adminService.updateStaff(teacher.uuid, { teachableSubjectIds: newIds })
    },
    onSuccess: (_, { teacher, subjectUuid }) => {
      // Patch the local cache immediately — do NOT invalidate TEACHER_MAPPING_QUERY_KEY
      // (the listStaff refetch is now backed by real backend data, but we patch for
      // zero-latency UX; the next refetch will confirm the real state)
      queryClient.setQueryData<PageResponse<StaffSummaryDTO>>(
        TEACHER_MAPPING_QUERY_KEY,
        old => {
          if (!old) return old
          return {
            ...old,
            content: old.content.map(t =>
              t.staffId === teacher.staffId
                ? { ...t, teachableSubjectIds: (t.teachableSubjectIds ?? []).filter(id => id !== subjectUuid) }
                : t
            ),
          }
        }
      )
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      queryClient.invalidateQueries({ queryKey: ["timetable"] })
      toast.success("Mapping removed successfully")
    },
    onError: () => toast.error("Failed to remove mapping")
  })

  const isLoading = isLoadingSubjects || isLoadingStaff

  if (isLoading) {
    return (
      <div className="h-[600px] flex items-center justify-center flex-col gap-4 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p>Loading teacher-subject competencies...</p>
      </div>
    )
  }

  const teacherDisplayName = (t: StaffSummaryDTO) => {
    const full = [t.firstName, t.lastName].filter(Boolean).join(" ")
    return full || `Staff #${t.employeeId || t.staffId}`
  }

  return (
    <div className="flex flex-col h-full bg-background rounded-xl border overflow-hidden shadow-sm">
      {/* Header Banner */}
      <div className="border-b bg-card/50 p-4 px-6 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Teacher-Subject Competencies
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Map institution subjects to capable teaching staff
          </p>
        </div>

        <div className="flex bg-muted/50 border rounded-lg p-1">
          <button
            onClick={() => { setViewMode("by-subject"); setSelectedSubject(null); setSelectedTeacher(null) }}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "by-subject" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <BookOpen className="w-4 h-4" /> By Subject
          </button>
          <button
            onClick={() => { setViewMode("by-teacher"); setSelectedSubject(null); setSelectedTeacher(null) }}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === "by-teacher" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Users className="w-4 h-4" /> By Teacher
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANE */}
        <div className="w-[300px] shrink-0 border-r bg-muted/20 flex-col hidden md:flex">
          <div className="p-3 border-b bg-card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={viewMode === "by-subject" ? "Search subjects..." : "Search teachers..."}
                value={viewMode === "by-subject" ? subjectSearch : teacherSearch}
                onChange={(e) => viewMode === "by-subject" ? setSubjectSearch(e.target.value) : setTeacherSearch(e.target.value)}
                className="pl-9 bg-background h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {viewMode === "by-subject" ? (
              filteredSubjects.length === 0 ? (
                <p className="text-center p-4 text-sm text-muted-foreground">No subjects found</p>
              ) : (
                filteredSubjects.map(subject => {
                  const mappedCount = teachers.filter(t => t.teachableSubjectIds?.includes(subject.uuid)).length
                  return (
                    <button
                      key={subject.uuid}
                      onClick={() => setSelectedSubject(subject)}
                      className={`w-full text-left p-2.5 rounded-lg transition-all border ${
                        selectedSubject?.uuid === subject.uuid
                          ? "bg-primary/5 border-primary/30 shadow-sm"
                          : "bg-card border-transparent hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-2 h-8 rounded-full shrink-0"
                          style={{ backgroundColor: subject.color || "#94a3b8" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{subject.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{subject.subjectCode}</p>
                        </div>
                        <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                          {mappedCount}
                        </span>
                      </div>
                    </button>
                  )
                })
              )
            ) : (
              filteredTeachers.length === 0 ? (
                <p className="text-center p-4 text-sm text-muted-foreground">No teachers found</p>
              ) : (
                filteredTeachers.map(teacher => (
                  <button
                    key={teacher.staffId}
                    onClick={() => setSelectedTeacher(teacher)}
                    className={`w-full text-left p-2.5 rounded-lg transition-all border ${
                      selectedTeacher?.staffId === teacher.staffId
                        ? "bg-primary/5 border-primary/30 shadow-sm"
                        : "bg-card border-transparent hover:border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                        {(teacher.firstName?.[0] || "T")}{(teacher.lastName?.[0] || "")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{teacherDisplayName(teacher)}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{teacher.jobTitle || "Teacher"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                        {teacher.teachableSubjectIds?.length || 0}
                      </span>
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        {/* RIGHT PANE */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          {viewMode === "by-subject" ? (
            !selectedSubject ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-3 text-muted-foreground bg-muted/5">
                <BookOpen className="w-12 h-12 opacity-15" />
                <p className="text-sm">Select a subject to view its teacher mappings</p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="p-5 border-b bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selectedSubject.color || "#94a3b8" }}
                        />
                        <h3 className="text-xl font-bold">{selectedSubject.name}</h3>
                      </div>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                        {selectedSubject.subjectCode}
                      </code>
                    </div>
                    <Button onClick={() => setAssignTeachersOpen(true)} size="sm" className="gap-1.5 shadow-sm">
                      <Users className="w-3.5 h-3.5" />
                      Assign Teachers
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 bg-muted/5">
                  <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Mapped Teachers ({teachersMappedToSubject.length})
                  </p>

                  {teachersMappedToSubject.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No teachers mapped to this subject</p>
                      <Button variant="link" size="sm" onClick={() => setAssignTeachersOpen(true)}>
                        Assign teachers now
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {teachersMappedToSubject.map(teacher => (
                        <div
                          key={teacher.staffId}
                          className="flex items-center justify-between p-3.5 bg-card border rounded-xl hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {(teacher.firstName?.[0] || "T")}{(teacher.lastName?.[0] || "")}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{teacherDisplayName(teacher)}</p>
                              <p className="text-xs text-muted-foreground">{teacher.jobTitle || "Teacher"}</p>
                            </div>
                          </div>

                          <Button
                            variant="ghost" size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setPendingUnmap({
                              teacher,
                              subjectUuid: selectedSubject.uuid,
                              subjectName: selectedSubject.name,
                            })}
                            disabled={unmapMutation.isPending}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            !selectedTeacher ? (
              <div className="flex-1 flex items-center justify-center flex-col gap-3 text-muted-foreground bg-muted/5">
                <Users className="w-12 h-12 opacity-15" />
                <p className="text-sm">Select a teacher to view their subject competencies</p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="p-5 border-b bg-card">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg font-bold text-primary border border-primary/20">
                        {(selectedTeacher.firstName?.[0] || "T")}{(selectedTeacher.lastName?.[0] || "")}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-1">{teacherDisplayName(selectedTeacher)}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {selectedTeacher.department && (
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3" /> {selectedTeacher.department}
                            </span>
                          )}
                          {selectedTeacher.officeLocation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {selectedTeacher.officeLocation}
                            </span>
                          )}
                          <Badge variant="secondary" className="text-[10px]">
                            {selectedTeacher.employeeId}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => setAssignSubjectsOpen(true)} size="sm" className="gap-1.5 shadow-sm">
                      <BookOpen className="w-3.5 h-3.5" />
                      Manage Subjects
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 bg-muted/5">
                  <p className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Core Competencies ({subjectsForSelectedTeacher.length})
                  </p>

                  {subjectsForSelectedTeacher.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed">
                      <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No subjects mapped to this teacher</p>
                      <Button variant="link" size="sm" onClick={() => setAssignSubjectsOpen(true)}>
                        Assign subjects now
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {subjectsForSelectedTeacher.map(subject => (
                        <div
                          key={subject.uuid}
                          className="flex items-center justify-between p-3.5 bg-card border rounded-xl hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-1 h-9 rounded-full"
                              style={{ backgroundColor: subject.color || "#94a3b8" }}
                            />
                            <div>
                              <p className="text-sm font-semibold">{subject.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{subject.subjectCode}</p>
                            </div>
                          </div>

                          <Button
                            variant="ghost" size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setPendingUnmap({
                              teacher: selectedTeacher,
                              subjectUuid: subject.uuid,
                              subjectName: subject.name,
                            })}
                            disabled={unmapMutation.isPending}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Assign Dialogs ── */}
      <AssignTeachersToSubjectDialog
        open={assignTeachersOpen}
        onOpenChange={setAssignTeachersOpen}
        subject={selectedSubject}
      />

      <AssignSubjectsToTeacherDialog
        open={assignSubjectsOpen}
        onOpenChange={setAssignSubjectsOpen}
        teacher={selectedTeacher}
      />

      {/* ── Confirm Remove Mapping ── */}
      <AlertDialog
        open={!!pendingUnmap}
        onOpenChange={(open) => { if (!open) setPendingUnmap(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Mapping?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{pendingUnmap ? teacherDisplayName(pendingUnmap.teacher) : ""}</strong> from{" "}
              <strong>{pendingUnmap?.subjectName}</strong>? This teacher will no longer be eligible to
              teach this subject in the Timetable Editor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingUnmap) {
                  unmapMutation.mutate({
                    teacher: pendingUnmap.teacher,
                    subjectUuid: pendingUnmap.subjectUuid,
                  })
                  setPendingUnmap(null)
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
