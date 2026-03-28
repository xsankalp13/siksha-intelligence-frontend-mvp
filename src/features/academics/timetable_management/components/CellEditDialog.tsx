import { useState, useMemo, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { editCell, clearCell } from '../store/timetableSlice';
import type { GridCellData, Subject, Teacher } from '../types';
import { BookOpen, User, MapPin, Search, CheckCircle2, Trash2, Save, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Room {
    uuid: string;
    name: string;
    roomType?: string;
}

interface CellEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cellKey: string;
    cellData: GridCellData;
    subjects: Subject[];
    teachers: Teacher[];
    rooms: Room[];
    timeLabel?: string;
}

type EditStep = 'subject' | 'teacher' | 'room';

export function CellEditDialog({
    open,
    onOpenChange,
    cellKey,
    cellData,
    subjects,
    teachers,
    rooms,
    timeLabel,
}: CellEditDialogProps) {
    const dispatch = useDispatch();

    const [step, setStep] = useState<EditStep>('subject');
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [teacherSearch, setTeacherSearch] = useState('');

    // Initialize with current cell values when dialog opens
    useEffect(() => {
        if (open && cellData) {
            setSelectedSubject(cellData.subject);
            setSelectedTeacher(cellData.teacher);
            setSelectedRoomId(cellData.roomId ?? null);
            setStep('subject');
            setSubjectSearch('');
            setTeacherSearch('');
        }
    }, [open, cellData]);

    const filteredSubjects = useMemo(() =>
        subjects.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase())),
        [subjects, subjectSearch]
    );

    // Only show teachers who can teach the selected subject
    const eligibleTeachers = useMemo(() => {
        const base = selectedSubject
            ? teachers.filter(t => t.teachableSubjects.includes(selectedSubject._id))
            : teachers;
        return base.filter(t => t.name.toLowerCase().includes(teacherSearch.toLowerCase()));
    }, [teachers, selectedSubject, teacherSearch]);

    const [dayName, startTime] = cellKey.split('_');

    const handleSave = () => {
        if (!selectedSubject || !selectedTeacher) return;
        dispatch(editCell({
            cellKey,
            subject: selectedSubject,
            teacher: selectedTeacher,
            roomId: selectedRoomId,
        }));
        onOpenChange(false);
    };

    const handleClear = () => {
        dispatch(clearCell(cellKey));
        onOpenChange(false);
    };

    const canSave = selectedSubject && selectedTeacher;

    const stepConfig = [
        { key: 'subject' as EditStep, label: 'Subject', icon: BookOpen },
        { key: 'teacher' as EditStep, label: 'Teacher', icon: User },
        { key: 'room' as EditStep, label: 'Room', icon: MapPin },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[480px] p-0 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/5 via-card to-card">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-base">Edit Period</DialogTitle>
                            <DialogDescription className="text-xs mt-0.5">
                                {dayName} · {startTime} {timeLabel ? `(${timeLabel})` : ''}
                            </DialogDescription>
                        </div>
                    </div>

                    {/* Live Preview Card */}
                    <div className="mt-4 p-3 bg-card border border-border rounded-lg flex items-center gap-3 shadow-sm">
                        <div className={cn(
                            "flex-1 min-w-0 text-left",
                        )}>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Preview</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                {selectedSubject ? (
                                    <span className="text-sm font-semibold text-foreground truncate">{selectedSubject.name}</span>
                                ) : (
                                    <span className="text-sm text-muted-foreground italic">No subject</span>
                                )}
                                {selectedTeacher && (
                                    <>
                                        <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm text-muted-foreground truncate">{selectedTeacher.name}</span>
                                    </>
                                )}
                            </div>
                            {selectedRoomId && (
                                <div className="flex items-center gap-1 mt-1 text-violet-600">
                                    <MapPin className="w-3 h-3" />
                                    <span className="text-[11px] font-medium truncate uppercase tracking-tight">
                                        {rooms.find(r => r.uuid === selectedRoomId)?.name || 'Unknown room'}
                                    </span>
                                </div>
                            )}
                        </div>
                        {canSave && (
                            <div className="bg-emerald-50 p-1.5 rounded-full">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                            </div>
                        )}
                    </div>
                </DialogHeader>

                {/* Step Navigation */}
                <div className="flex border-b bg-muted/20">
                    {stepConfig.map((s) => {
                        const Icon = s.icon;
                        const isActive = step === s.key;
                        const isDone = (
                            (s.key === 'subject' && selectedSubject) ||
                            (s.key === 'teacher' && selectedTeacher) ||
                            (s.key === 'room' && selectedRoomId)
                        );
                        return (
                            <button
                                key={s.key}
                                onClick={() => setStep(s.key)}
                                className={cn(
                                    "flex-1 flex flex-col items-center gap-1 py-3 px-2 text-[11px] font-bold uppercase tracking-wider transition-all relative",
                                    isActive
                                        ? "text-primary bg-card"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    isActive ? "bg-primary/10" : isDone ? "bg-emerald-50" : "bg-transparent"
                                )}>
                                    <Icon className={cn(
                                        "w-4 h-4",
                                        isActive ? "text-primary" : isDone ? "text-emerald-600" : ""
                                    )} />
                                </div>
                                <span>{s.label}</span>
                                {isDone && !isActive && (
                                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                )}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeStepIndicator"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto px-4 py-4 min-h-[300px]">
                    <AnimatePresence mode="wait">

                        {/* ── Step 1: Subject ── */}
                        {step === 'subject' && (
                            <motion.div
                                key="subject"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-3"
                            >
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search subjects..."
                                        value={subjectSearch}
                                        onChange={e => setSubjectSearch(e.target.value)}
                                        className="pl-9 h-10 bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                                        autoFocus
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {filteredSubjects.map(subject => {
                                        const isSelected = selectedSubject?._id === subject._id;
                                        return (
                                            <motion.button
                                                key={subject._id}
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => {
                                                    setSelectedSubject(subject);
                                                    if (selectedSubject?._id !== subject._id) {
                                                        setSelectedTeacher(null);
                                                    }
                                                    setTimeout(() => setStep('teacher'), 150);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-border/60 hover:border-primary/40 hover:bg-muted/40 bg-card"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border",
                                                    subject.color || "bg-primary/10"
                                                )}>
                                                    <BookOpen className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">{subject.name}</p>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">{subject.code}</p>
                                                </div>
                                                {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                                            </motion.button>
                                        );
                                    })}
                                    {filteredSubjects.length === 0 && (
                                        <p className="text-center text-sm text-muted-foreground py-12">No subjects found</p>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step 2: Teacher ── */}
                        {step === 'teacher' && (
                            <motion.div
                                key="teacher"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-3"
                            >
                                {selectedSubject && (
                                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 mb-3 shadow-sm">
                                        <BookOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                        <span className="text-xs text-primary font-medium">
                                            Eligible for <strong>{selectedSubject.name}</strong>
                                        </span>
                                    </div>
                                )}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search teachers..."
                                        value={teacherSearch}
                                        onChange={e => setTeacherSearch(e.target.value)}
                                        className="pl-9 h-10 bg-muted/30 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                                        autoFocus
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {eligibleTeachers.map(teacher => {
                                        const isSelected = selectedTeacher?._id === teacher._id;
                                        return (
                                            <motion.button
                                                key={teacher._id}
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => {
                                                    setSelectedTeacher(teacher);
                                                    setTimeout(() => setStep('room'), 150);
                                                }}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-border/60 hover:border-primary/40 hover:bg-muted/40 bg-card"
                                                )}
                                            >
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center flex-shrink-0 border-2 border-primary/10">
                                                    <span className="text-sm font-bold text-primary">
                                                        {teacher.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">{teacher.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {teacher.teachableSubjects.length} Assigned subjects
                                                    </p>
                                                </div>
                                                {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                                            </motion.button>
                                        );
                                    })}
                                    {eligibleTeachers.length === 0 && selectedSubject && (
                                        <div className="py-12 text-center px-4">
                                            <User className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                                            <p className="text-sm font-medium text-foreground">No eligible teachers</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Update curriculum assignments to see teachers here.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ── Step 3: Room ── */}
                        {step === 'room' && (
                            <motion.div
                                key="room"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-4"
                            >
                                <div className="p-3 rounded-xl border-2 border-dashed border-border bg-muted/10">
                                    <p className="text-xs text-muted-foreground text-center">
                                        Assigning a specific room ensures students know exactly where to go. Useful for Labs and Halls.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setSelectedRoomId(null)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                                            !selectedRoomId
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border/60 hover:border-primary/40 hover:bg-muted/40 bg-card"
                                        )}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 border">
                                            <MapPin className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-foreground">Standard Classroom</p>
                                            <p className="text-xs text-muted-foreground">Default location</p>
                                        </div>
                                        {!selectedRoomId && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                                    </motion.button>

                                    {rooms.map(room => {
                                        const isSelected = selectedRoomId === room.uuid;
                                        const typeBadge = getRoomTypeBadgeInfo(room.roomType);
                                        return (
                                            <motion.button
                                                key={room.uuid}
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => setSelectedRoomId(room.uuid)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all",
                                                    isSelected
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-border/60 hover:border-primary/40 hover:bg-muted/40 bg-card"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border",
                                                    typeBadge.className
                                                )}>
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-foreground truncate">{room.name}</p>
                                                        {room.roomType && (
                                                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider", typeBadge.className)}>
                                                                {typeBadge.label}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">Select for this period</p>
                                                </div>
                                                {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 border-t bg-muted/20 flex-row items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="gap-2 text-destructive hover:bg-destructive/5 hover:text-destructive shrink-0"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear Period
                    </Button>
                    <div className="flex-1" />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="shrink-0"
                    >
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!canSave}
                        className="gap-2 min-w-[120px] shrink-0"
                    >
                        <Save className="w-4 h-4" />
                        Apply
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function getRoomTypeBadgeInfo(roomType?: string): { label: string; className: string } {
    const map: Record<string, { label: string; className: string }> = {
        LABORATORY: { label: 'Lab', className: 'bg-purple-100/50 text-purple-700 border-purple-200' },
        CLASSROOM: { label: 'Class', className: 'bg-blue-100/50 text-blue-700 border-blue-200' },
        LIBRARY: { label: 'Library', className: 'bg-amber-100/50 text-amber-700 border-amber-200' },
        AUDITORIUM: { label: 'Hall', className: 'bg-green-100/50 text-green-700 border-green-200' },
        GYM: { label: 'Gym', className: 'bg-rose-100/50 text-rose-700 border-rose-200' },
    };
    const key = (roomType || '').toUpperCase();
    return map[key] || { label: roomType || 'Room', className: 'bg-slate-100/50 text-slate-700 border-slate-200' };
}
