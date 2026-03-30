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
import type { RoomResponseDto } from '@/services/types/academics';

interface SectionSettingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sectionId: string;
    sectionName: string;
    currentDefaultRoomId?: string;
    rooms: RoomResponseDto[];
    onSuccessUpdate?: (updatedRoom: RoomResponseDto | undefined) => void;
}

export function SectionSettingsModal({ open, onOpenChange, sectionId, sectionName, currentDefaultRoomId, rooms, onSuccessUpdate }: SectionSettingsModalProps) {
    const [roomId, setRoomId] = useState<string>(currentDefaultRoomId || 'none');
    const updateSectionMutation = useUpdateSection();

    useEffect(() => {
        if (open) {
            setRoomId(currentDefaultRoomId || 'none');
        }
    }, [open, currentDefaultRoomId]);

    const handleSave = () => {
        const defaultRoomId = roomId === 'none' ? undefined : roomId;
        
        updateSectionMutation.mutate(
            { sectionId, data: { sectionName, defaultRoomId } },
            {
                onSuccess: () => {
                    toast.success('Section settings updated successfully');
                    
                    if (onSuccessUpdate) {
                        const roomObj = defaultRoomId ? rooms.find(r => r.uuid === defaultRoomId) : undefined;
                        onSuccessUpdate(roomObj);
                    }
                    
                    onOpenChange(false);
                },
                onError: (err: any) => {
                    toast.error(err?.response?.data?.message || 'Failed to update section');
                }
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Section Settings</DialogTitle>
                    <DialogDescription>
                        Configure the default properties for this section.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Default Room (Home Room)</Label>
                        <Select value={roomId} onValueChange={setRoomId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a classroom" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- No Default Room --</SelectItem>
                                {rooms.map((rm) => (
                                    <SelectItem key={rm.uuid} value={rm.uuid}>
                                        {rm.name} {rm.roomType ? `- ${rm.roomType.replace('_', ' ')}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            When generating timetables or assigning periods, slots implicitly assigned to this section will take place in this room.
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
