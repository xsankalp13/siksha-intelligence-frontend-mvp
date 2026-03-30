import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { setSelectedClass, setSelectedSection } from '../store/timetableSlice';
import { useGetClasses, useGetSections } from '../hooks/useAcademicClassQueries';
import { CalendarDays, ArrowRight, Loader2 } from 'lucide-react';

export function SelectionPage() {
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
            navigate(`/dashboard/admin/timetable/editor/${selectedClassData.uuid}/${selectedSectionData.uuid}`);
        }
    };

    const isFormValid = selectedClassId && selectedSectionId;

    return (
        <div className="w-full flex items-center justify-center p-4 min-h-[calc(100vh-10rem)] animate-in fade-in duration-500">
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            >
                <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm bg-card/95">
                    <CardHeader className="text-center pb-2">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="mx-auto mb-4 p-3 rounded-full bg-primary/10"
                        >
                            <CalendarDays className="w-8 h-8 text-primary" />
                        </motion.div>
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            Timetable Management
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Select class and section to create or edit timetable
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-4">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="space-y-2"
                        >
                            <Label htmlFor="class-select" className="text-sm font-medium flex items-center gap-2">
                                Select Class
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
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="space-y-2"
                        >
                            <Label htmlFor="section-select" className="text-sm font-medium flex items-center gap-2">
                                Select Section
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
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="pt-2"
                        >
                            <Button
                                onClick={handleProceed}
                                disabled={!isFormValid}
                                className="w-full h-12 text-base font-semibold group"
                                size="lg"
                            >
                                Proceed to Editor
                                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </motion.div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
