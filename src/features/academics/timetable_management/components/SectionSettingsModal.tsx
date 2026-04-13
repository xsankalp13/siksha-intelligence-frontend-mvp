import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useUpdateSection } from '../hooks/useAcademicClassQueries';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';
import type { RoomResponseDto } from '@/services/types/academics';
import { GraduationCap, Home, AlertCircle } from 'lucide-react';

interface SectionSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sectionId: string;
    sectionName: string;
    currentDefaultRoomId?: string;
    currentClassTeacherUuid?: string;
    currentClassTeacherName?: string;
    rooms: RoomResponseDto[];
    onSuccessUpdate?: (updatedRoom: RoomResponseDto | undefined, classTeacherName?: string) => void;
}

export function SectionSettingsModal({
    open,
    onOpenChange,
    sectionId,
    sectionName,
    currentDefaultRoomId,
    currentClassTeacherUuid,
    currentClassTeacherName: _currentClassTeacherName,
    rooms,
    onSuccessUpdate,
}: SectionSettingsModalProps) {
    const [roomId, setRoomId] = useState<string>(currentDefaultRoomId || 'none');
    const [classTeacherUuid, setClassTeacherUuid] = useState<string>(currentClassTeacherUuid || 'none');
    const updateSectionMutation = useUpdateSection();

    // Fetch all TEACHER staff for the picker
    const { data: staffPage, isLoading: isLoadingStaff } = useQuery({
        queryKey: ['staff', 'TEACHER'],
        queryFn: () => adminService.listStaff({ staffType: 'TEACHER', size: 200 }),
        enabled: open,
        select: (res) => res.data.content,
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (open) {
            setRoomId(currentDefaultRoomId || 'none');
            setClassTeacherUuid(currentClassTeacherUuid || 'none');
        }
    }, [open, currentDefaultRoomId, currentClassTeacherUuid]);

    const handleSave = () => {
        const defaultRoomId = roomId === 'none' ? undefined : roomId;
        const pickedTeacherUuid = classTeacherUuid === 'none' ? undefined : classTeacherUuid;

        updateSectionMutation.mutate(
            {
                sectionId,
                data: {
                    sectionName,
                    defaultRoomId,
                    classTeacherUuid: pickedTeacherUuid ?? null,
                },
            },
            {
                onSuccess: () => {
                    const roomObj = defaultRoomId ? rooms.find(r => r.uuid === defaultRoomId) : undefined;
                    onSuccessUpdate?.(roomObj);
                    onOpenChange(false);
                },
                onError: (err: any) => {
                    toast.error(err?.response?.data?.message || 'Failed to update section');
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle>Section Settings — {sectionName}</DialogTitle>
                    <DialogDescription>
                        Configure the class teacher and home room for this section. The class teacher will be auto-assigned to the first period every day.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-4">
                    {/* Class Teacher Picker */}
                    <div className="grid gap-2">
                        <Label className="flex items-center gap-2 font-semibold">
                            <GraduationCap className="w-4 h-4 text-emerald-600" />
                            Class Teacher
                            <span className="text-[10px] uppercase tracking-wider text-rose-500 font-bold ml-1">Required</span>
                        </Label>
                        <Select value={classTeacherUuid} onValueChange={setClassTeacherUuid} disabled={isLoadingStaff}>
                            <SelectTrigger>
                                <SelectValue placeholder={isLoadingStaff ? 'Loading teachers...' : 'Select a class teacher'} />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                <SelectItem value="none">-- No Class Teacher --</SelectItem>
                                {(staffPage || []).map(staff => (
                                    <SelectItem key={staff.uuid} value={staff.uuid}>
                                        {staff.firstName} {staff.lastName}
                                        {staff.employeeId ? ` (${staff.employeeId})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {classTeacherUuid === 'none' && (
                            <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg mt-1">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800">
                                    A class teacher is <strong>required</strong> to save the timetable. The first period of every day will be auto-assigned to them.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Default Room Picker */}
                    <div className="grid gap-2">
                        <Label className="flex items-center gap-2 font-semibold">
                            <Home className="w-4 h-4 text-blue-600" />
                            Default Classroom
                        </Label>
                        <Select value={roomId} onValueChange={setRoomId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a classroom" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- No Default Room --</SelectItem>
                                {rooms.map(rm => (
                                    <SelectItem key={rm.uuid} value={rm.uuid}>
                                        {rm.name} {rm.roomType ? `— ${rm.roomType.replace('_', ' ')}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Slots for this section will default to this room when none is specified.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateSectionMutation.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={updateSectionMutation.isPending}>
                        {updateSectionMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
