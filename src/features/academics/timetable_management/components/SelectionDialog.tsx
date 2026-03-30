import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { CalendarDays, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { setSelectedClass, setSelectedSection } from '../store/timetableSlice';
import { useGetClasses, useGetSections } from '../hooks/useAcademicClassQueries';
import { Loader2 } from 'lucide-react';

interface SelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SelectionDialog({ open, onOpenChange }: SelectionDialogProps) {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedSectionId, setSelectedSectionId] = useState<string>('');

    const { data: classes = [], isLoading: isClassesLoading } = useGetClasses();
    const { data: sections = [], isLoading: isSectionsLoading } = useGetSections(selectedClassId);

    const handleProceed = () => {
        const selectedClassData = classes.find(c => c.uuid === selectedClassId);
        const selectedSectionData = sections.find(s => s.uuid === selectedSectionId);

        if (selectedClassData && selectedSectionData) {
            dispatch(setSelectedClass({ _id: selectedClassData.uuid, name: selectedClassData.name }));
            dispatch(setSelectedSection({ _id: selectedSectionData.uuid, name: selectedSectionData.sectionName, defaultRoom: selectedSectionData.defaultRoom }));
            onOpenChange(false); // Close dialog
            navigate(`/dashboard/admin/timetable/editor/${selectedClassData.uuid}/${selectedSectionData.uuid}`);
        }
    };

    const isFormValid = selectedClassId && selectedSectionId;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                        <CalendarDays className="w-8 h-8 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-bold tracking-tight text-center">
                        Select Scope
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Choose the class and section to manage its timetable.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="class-select" className="text-sm font-medium flex items-center gap-2">
                            Academic Class
                            {isClassesLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                        </Label>
                        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                            <SelectTrigger id="class-select" className="w-full h-11">
                                <SelectValue placeholder="Choose a class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map(classItem => (
                                    <SelectItem key={classItem.uuid} value={classItem.uuid}>
                                        {classItem.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="section-select" className="text-sm font-medium flex items-center gap-2">
                            Section
                            {isSectionsLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                        </Label>
                        <Select 
                            value={selectedSectionId} 
                            onValueChange={setSelectedSectionId}
                            disabled={!selectedClassId || isSectionsLoading}
                        >
                            <SelectTrigger id="section-select" className="w-full h-11">
                                <SelectValue placeholder={!selectedClassId ? "Select a class first" : "Choose a section"} />
                            </SelectTrigger>
                            <SelectContent>
                                {sections.map(section => (
                                    <SelectItem key={section.uuid} value={section.uuid}>
                                        {section.sectionName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="pt-2">
                        <Button
                            onClick={handleProceed}
                            disabled={!isFormValid}
                            className="w-full h-11 text-base font-semibold group"
                            size="lg"
                        >
                            Proceed to Editor
                            <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
