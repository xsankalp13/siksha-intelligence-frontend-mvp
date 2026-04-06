import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StaffSummaryDTO } from '@/services/admin';
import type { ClassTeacherMappingRow } from '../types';

interface AssignClassTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: ClassTeacherMappingRow | null;
  teachers: StaffSummaryDTO[];
  isSaving: boolean;
  onAssign: (teacherUuid: string) => void;
}

export function AssignClassTeacherDialog({
  open,
  onOpenChange,
  section,
  teachers,
  isSaving,
  onAssign,
}: AssignClassTeacherDialogProps) {
  const [teacherUuid, setTeacherUuid] = useState('');

  useEffect(() => {
    if (open && section?.classTeacherUuid) {
      setTeacherUuid(section.classTeacherUuid);
      return;
    }
    if (open) {
      setTeacherUuid('');
    }
  }, [open, section]);

  const selectedTeacherName = useMemo(() => {
    const selectedTeacher = teachers.find((teacher) => teacher.uuid === teacherUuid);
    if (!selectedTeacher) {
      return null;
    }

    const teacherName = `${selectedTeacher.firstName ?? ''} ${selectedTeacher.lastName ?? ''}`.trim();
    return teacherName || selectedTeacher.employeeId;
  }, [teacherUuid, teachers]);

  const handleSave = () => {
    if (!teacherUuid) {
      return;
    }
    onAssign(teacherUuid);
  };

  if (!section) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Class Teacher</DialogTitle>
          <DialogDescription>
            {section.className} - Section {section.sectionName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm font-medium">Teacher</label>
          <Select value={teacherUuid} onValueChange={setTeacherUuid}>
            <SelectTrigger>
              <SelectValue placeholder="Select a teacher" />
            </SelectTrigger>
            <SelectContent>
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
          {selectedTeacherName ? (
            <p className="text-xs text-muted-foreground">
              Selected: {selectedTeacherName}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !teacherUuid}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
