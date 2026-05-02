import { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClassTeacherOverviewCards } from './ClassTeacherOverviewCards';
import { ClassTeacherMappingTable } from './ClassTeacherMappingTable';
import { AssignClassTeacherDialog } from './AssignClassTeacherDialog';
import {
  useAssignClassTeacher,
  useGetClassTeacherMappings,
  useGetTeacherOptions,
  useRemoveClassTeacher,
} from '../queries/useClassTeacherQueries';
import type { ClassTeacherMappingRow } from '../types';

export function ClassTeacherMappingPanel() {
  const [search, setSearch] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ClassTeacherMappingRow | null>(null);
  const [pendingRemoveSection, setPendingRemoveSection] = useState<ClassTeacherMappingRow | null>(null);

  const { data: mappings = [], isLoading: isMappingsLoading } = useGetClassTeacherMappings();
  const { data: teachers = [], isLoading: isTeachersLoading } = useGetTeacherOptions();

  const assignMutation = useAssignClassTeacher();
  const removeMutation = useRemoveClassTeacher();

  const stats = useMemo(() => {
    const totalSections = mappings.length;
    const assignedSections = mappings.filter((mapping) => !!mapping.classTeacherUuid).length;
    const unassignedSections = totalSections - assignedSections;
    const assignmentRate = totalSections ? (assignedSections / totalSections) * 100 : 0;

    return {
      totalSections,
      assignedSections,
      unassignedSections,
      assignmentRate,
    };
  }, [mappings]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return mappings.filter((row) => {
      const matchesSearch =
        !query ||
        row.className.toLowerCase().includes(query) ||
        row.sectionName.toLowerCase().includes(query) ||
        (row.classTeacherName ?? '').toLowerCase().includes(query);

      const matchesTeacher =
        teacherFilter === 'all' ||
        (teacherFilter === 'unassigned'
          ? !row.classTeacherUuid
          : row.classTeacherUuid === teacherFilter);

      const matchesUnassignedToggle = !showUnassignedOnly || !row.classTeacherUuid;

      return matchesSearch && matchesTeacher && matchesUnassignedToggle;
    });
  }, [mappings, search, teacherFilter, showUnassignedOnly]);

  const handleOpenAssignDialog = (row: ClassTeacherMappingRow) => {
    setSelectedSection(row);
    setDialogOpen(true);
  };

  const handleAssign = (teacherUuid: string) => {
    if (!selectedSection) {
      return;
    }

    assignMutation.mutate(
      {
        sectionId: selectedSection.sectionId,
        sectionName: selectedSection.sectionName,
        classTeacherUuid: teacherUuid,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setSelectedSection(null);
        },
      }
    );
  };

  const handleRemoveRequest = (row: ClassTeacherMappingRow) => {
    setPendingRemoveSection(row);
  };

  const handleConfirmRemove = () => {
    if (!pendingRemoveSection) {
      return;
    }

    removeMutation.mutate({
      sectionId: pendingRemoveSection.sectionId,
      sectionName: pendingRemoveSection.sectionName,
    }, {
      onSuccess: () => {
        setPendingRemoveSection(null);
      },
    });
  };

  if (isMappingsLoading || isTeachersLoading) {
    return (
      <div className="h-[500px] flex items-center justify-center flex-col gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p>Loading class teacher mappings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ClassTeacherOverviewCards stats={stats} />

      <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by class, section, or teacher"
              className="pl-9"
            />
          </div>

          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="w-full md:w-[240px]">
              <SelectValue placeholder="Filter by teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teachers</SelectItem>
              <SelectItem value="unassigned">Unassigned only</SelectItem>
              {teachers.map((teacher) => {
                const teacherName = `${teacher.firstName ?? ''} ${teacher.lastName ?? ''}`.trim();
                return (
                  <SelectItem key={teacher.uuid} value={teacher.uuid}>
                    {teacherName || teacher.employeeId}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button
            variant={showUnassignedOnly ? 'default' : 'outline'}
            onClick={() => setShowUnassignedOnly((current) => !current)}
          >
            {showUnassignedOnly ? 'Showing Unassigned' : 'Show Unassigned'}
          </Button>
        </div>

        <ClassTeacherMappingTable
          rows={filteredRows}
          onAssign={handleOpenAssignDialog}
          onRemove={handleRemoveRequest}
          isRemoving={removeMutation.isPending}
        />
      </div>

      <AssignClassTeacherDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelectedSection(null);
          }
        }}
        section={selectedSection}
        teachers={teachers.filter((teacher) => {
          // Allow the teacher currently assigned to THIS section
          if (selectedSection?.classTeacherUuid === teacher.uuid) return true;
          // Exclude teachers already assigned as classteacher in any other section
          return !mappings.some(
            (row) =>
              row.classTeacherUuid === teacher.uuid &&
              row.sectionId !== selectedSection?.sectionId
          );
        })}
        isSaving={assignMutation.isPending}
        onAssign={handleAssign}
      />

      <AlertDialog
        open={!!pendingRemoveSection}
        onOpenChange={(open) => {
          if (!open) {
            setPendingRemoveSection(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove class teacher assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoveSection
                ? `This will unassign ${pendingRemoveSection.classTeacherName ?? 'the selected teacher'} from ${pendingRemoveSection.className} - Section ${pendingRemoveSection.sectionName}.`
                : 'This will unassign the current class teacher for this section.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove assignment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
