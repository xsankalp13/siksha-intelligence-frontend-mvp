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
import { classes, sections } from '../data/mockData';
import { CalendarDays, ArrowRight } from 'lucide-react';

export function SelectionPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedSectionId, setSelectedSectionId] = useState<string>('');

    const handleProceed = () => {
        const selectedClassData = classes.find(c => c._id === selectedClassId);
        const selectedSectionData = sections.find(s => s._id === selectedSectionId);

        if (selectedClassData && selectedSectionData) {
            dispatch(setSelectedClass(selectedClassData));
            dispatch(setSelectedSection(selectedSectionData));
            navigate('/timetable/editor');
        }
    };

    const isFormValid = selectedClassId && selectedSectionId;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
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
                            <Label htmlFor="class-select" className="text-sm font-medium">
                                Select Class
                            </Label>
                            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                                <SelectTrigger id="class-select" className="w-full h-11">
                                    <SelectValue placeholder="Choose a class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(classItem => (
                                        <SelectItem key={classItem._id} value={classItem._id}>
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
                            <Label htmlFor="section-select" className="text-sm font-medium">
                                Select Section
                            </Label>
                            <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                                <SelectTrigger id="section-select" className="w-full h-11">
                                    <SelectValue placeholder="Choose a section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.map(section => (
                                        <SelectItem key={section._id} value={section._id}>
                                            {section.name}
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
