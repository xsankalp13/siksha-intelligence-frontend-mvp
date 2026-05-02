import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Clock, 
    Calendar, 
    Trash2, 
    Edit2, 
    Coffee, 
    BookOpen,
    Search,
    ChevronRight,
    Loader2,
    Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { timeslotService } from '@/services/timeslot';
import { ConfirmDialog } from './ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useGetTimeslots, useCreateTimeslot, useUpdateTimeslot, useDeleteTimeslot } from '../hooks/useTimeslotQueries';
import type { TimeslotResponseDto, TimeslotRequestDto } from '../types';

const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function TimeslotManagement() {
    const { data: timeslots = [], isLoading } = useGetTimeslots();
    const createTimeslot = useCreateTimeslot();
    const updateTimeslot = useUpdateTimeslot();
    const deleteTimeslot = useDeleteTimeslot();

    const [selectedDay, setSelectedDay] = useState<string>('Monday');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTimeslot, setEditingTimeslot] = useState<TimeslotResponseDto | null>(null);
    const [targetCloneDay, setTargetCloneDay] = useState<string>('');
    const [isCloning, setIsCloning] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [isConfirmDeleteDayOpen, setIsConfirmDeleteDayOpen] = useState(false);
    const [isDeletingDay, setIsDeletingDay] = useState(false);

    // Form state
    const [formData, setFormData] = useState<TimeslotRequestDto>({
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '08:45',
        slotLabel: '',
        isBreak: false,
        isNonTeachingSlot: false
    });

    const filteredTimeslots = useMemo(() => {
        const dayIdx = DAYS_LIST.indexOf(selectedDay) + 1; // 1-indexed
        return timeslots
            .filter(ts => ts.dayOfWeek === dayIdx)
            .filter(ts => (ts.slotLabel?.toLowerCase() ?? '').includes(searchQuery.toLowerCase()) || 
                         ts.startTime.includes(searchQuery))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [timeslots, selectedDay, searchQuery]);

    const handleOpenAdd = () => {
        setEditingTimeslot(null);
        setFormData({
            dayOfWeek: DAYS_LIST.indexOf(selectedDay) + 1, // 1-indexed
            startTime: '08:00',
            endTime: '08:40',
            slotLabel: '',
            isBreak: false,
            isNonTeachingSlot: false
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (ts: TimeslotResponseDto) => {
        setEditingTimeslot(ts);
        setFormData({
            dayOfWeek: ts.dayOfWeek,
            startTime: ts.startTime.substring(0, 5),
            endTime: ts.endTime.substring(0, 5),
            slotLabel: ts.slotLabel,
            isBreak: ts.isBreak,
            isNonTeachingSlot: ts.isNonTeachingSlot
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async () => {
        // Validation: End time must be after Start time
        const start = formData.startTime;
        const end = formData.endTime;

        if (start && end) {
            const [sH, sM] = start.split(':').map(Number);
            const [eH, eM] = end.split(':').map(Number);

            const startTotalMinutes = sH * 60 + sM;
            const endTotalMinutes = eH * 60 + eM;

            if (endTotalMinutes <= startTotalMinutes) {
                toast.error("End time must be after the start time.");
                return;
            }
        }

        // Ensure slotLabel is not empty (backend requirement)
        const submissionData = {
            ...formData,
            slotLabel: formData.slotLabel.trim() || `${DAYS_LIST[formData.dayOfWeek - 1]}_${formData.startTime}`
        };

        try {
            if (editingTimeslot) {
                await updateTimeslot.mutateAsync({ id: editingTimeslot.uuid, data: submissionData });
            } else {
                await createTimeslot.mutateAsync(submissionData);
            }
            setIsDialogOpen(false);
        } catch (err) {
            // Error handled by mutation hook toasts
        }
    };

    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return 0;
        const [sH, sM] = start.split(':').map(Number);
        const [eH, eM] = end.split(':').map(Number);
        
        let diffInMinutes = (eH * 60 + eM) - (sH * 60 + sM);
        if (diffInMinutes < 0) diffInMinutes += 24 * 60; // Handle midnight wrap
        return diffInMinutes;
    };

    const queryClient = useQueryClient();

    const handleDelete = async (id: string) => {
        setConfirmDeleteId(id);
    };

    const confirmDelete = async () => {
        if (confirmDeleteId) {
            await deleteTimeslot.mutateAsync(confirmDeleteId);
            setConfirmDeleteId(null);
        }
    };

    const handleClearDay = async () => {
        if (filteredTimeslots.length === 0) return;
        
        setIsDeletingDay(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const slot of filteredTimeslots) {
                try {
                    await timeslotService.deleteTimeslot(slot.uuid);
                    successCount++;
                } catch (err) {
                    failCount++;
                }
            }
            
            if (successCount > 0) {
                queryClient.invalidateQueries({ queryKey: ['timeslots'] });
                toast.success(`Successfully cleared ${successCount} slots from ${selectedDay}.`);
                if (failCount > 0) {
                    toast.warning(`${failCount} slots failed to delete.`);
                }
            }
        } finally {
            setIsDeletingDay(false);
            setIsConfirmDeleteDayOpen(false);
        }
    };

    const handleClone = async () => {
        if (!targetCloneDay) return;
        const targetDayIdx = DAYS_LIST.indexOf(targetCloneDay) + 1;
        const currentDayIdx = DAYS_LIST.indexOf(selectedDay) + 1;

        if (targetDayIdx === currentDayIdx) {
            toast.error("Cannot clone to the same day.");
            return;
        }

        const currentSlots = timeslots.filter(ts => ts.dayOfWeek === currentDayIdx);
        if (currentSlots.length === 0) {
            toast.warning(`No timeslots found on ${selectedDay} to clone.`);
            return;
        }

        const targetSlots = timeslots.filter(ts => ts.dayOfWeek === targetDayIdx);
        const existingStartTimes = new Set(targetSlots.map(ts => ts.startTime.substring(0, 5)));

        const slotsToClone = currentSlots.filter(ts => !existingStartTimes.has(ts.startTime.substring(0, 5)));

        if (slotsToClone.length === 0) {
            toast.info(`All timeslots from ${selectedDay} already exist on ${targetCloneDay}.`);
            return;
        }

        setIsCloning(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const slot of slotsToClone) {
                try {
                    await timeslotService.createTimeslot({
                        dayOfWeek: targetDayIdx,
                        startTime: slot.startTime.substring(0, 5),
                        endTime: slot.endTime.substring(0, 5),
                        slotLabel: slot.slotLabel,
                        isBreak: !!slot.isBreak,
                        isNonTeachingSlot: !!slot.isNonTeachingSlot
                    });
                    successCount++;
                } catch (err) {
                    failCount++;
                }
            }
            
            if (successCount > 0) {
                // Manually invalidate since we called the service directly
                queryClient.invalidateQueries({ queryKey: ['timeslots'] });
                
                toast.success(`Successfully cloned ${successCount} slots to ${targetCloneDay}.`);
                if (failCount > 0) {
                    toast.warning(`${failCount} slots failed to clone.`);
                }
                setTargetCloneDay('');
            } else {
                toast.error("Failed to clone any slots.");
            }
        } finally {
            setIsCloning(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 min-h-screen">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        Timeslot Management
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Define school periods, breaks, and session timings.
                    </p>
                </div>
                <Button onClick={handleOpenAdd} size="lg" className="rounded-full shadow-lg hover:shadow-primary/25 transition-all group">
                    <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                    Add Timeslot
                </Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Day Selection Sidebar */}
                <aside className="lg:col-span-1 space-y-4">
                    <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Working Days
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <div className="flex flex-col gap-1">
                                {DAYS_LIST.map((day) => (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                            selectedDay === day 
                                            ? 'bg-primary text-primary-foreground shadow-md scale-[1.02]' 
                                            : 'hover:bg-accent text-muted-foreground'
                                        }`}
                                    >
                                        {day}
                                        {selectedDay === day && <ChevronRight className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </aside>

                {/* Main Content Area */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Search and Filters */}
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by label or time..." 
                                className="pl-10 h-12 rounded-2xl bg-card/50 backdrop-blur-sm border-none shadow-inner"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Clone Controls */}
                        <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm p-1.5 rounded-2xl border border-dashed border-border/50">
                            <Select value={targetCloneDay} onValueChange={setTargetCloneDay}>
                                <SelectTrigger className="w-[180px] h-9 rounded-xl border-none bg-transparent shadow-none focus:ring-0">
                                    <SelectValue placeholder="Clone to Day..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    {DAYS_LIST.filter(d => d !== selectedDay).map(day => (
                                        <SelectItem key={day} value={day}>{day}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button 
                                size="sm" 
                                variant={targetCloneDay ? "secondary" : "ghost"}
                                disabled={!targetCloneDay || isCloning}
                                onClick={handleClone}
                                className="rounded-xl h-9 px-4 gap-2 transition-all"
                            >
                                {isCloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                                Clone
                            </Button>
                        </div>

                        {/* Clear Day Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={filteredTimeslots.length === 0 || isDeletingDay}
                            onClick={() => setIsConfirmDeleteDayOpen(true)}
                            className="rounded-2xl h-12 px-6 gap-2 border-destructive/20 text-destructive hover:bg-destructive/5 hover:border-destructive transition-all"
                        >
                            {isDeletingDay ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Clear {selectedDay}
                        </Button>
                    </div>

                    {/* Timeslots Grid */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
                            <p className="text-muted-foreground font-medium animate-pulse">Loading schedules...</p>
                        </div>
                    ) : filteredTimeslots.length === 0 ? (
                        <Card className="border-dashed border-2 py-24 bg-transparent">
                            <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                                <div className="p-4 rounded-full bg-accent/50">
                                    <Clock className="w-12 h-12 text-muted-foreground" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold">No timeslots found</h3>
                                    <p className="text-muted-foreground max-w-xs">
                                        You haven't added any periods for {selectedDay} yet.
                                    </p>
                                </div>
                                <Button variant="outline" onClick={handleOpenAdd} className="rounded-full">
                                    Initialize Schedule
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AnimatePresence mode="popLayout">
                                {filteredTimeslots.map((ts) => (
                                    <motion.div
                                        key={ts.uuid}
                                        layout
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                    >
                                        <Card className={`group border-none shadow-lg hover:shadow-2xl transition-all duration-300 relative overflow-hidden ${
                                            ts.isBreak ? 'bg-orange-50/50 dark:bg-orange-950/20' : 'bg-card/80'
                                        }`}>
                                            {/* Decorative background circle - added pointer-events-none to avoid blocking clicks */}
                                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                                            
                                            <CardHeader className="pb-2 relative z-10">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl ${
                                                            ts.isBreak ? 'bg-orange-100 text-orange-600' : 
                                                            ts.isNonTeachingSlot ? 'bg-blue-100 text-blue-600' : 'bg-primary/10 text-primary'
                                                        }`}>
                                                            {ts.isBreak ? <Coffee className="w-5 h-5" /> : ts.isNonTeachingSlot ? <Clock className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-lg font-bold">{ts.slotLabel || (ts.isBreak ? 'Break' : 'Period')}</CardTitle>
                                                            <div className="flex items-center text-sm text-muted-foreground font-medium">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                {ts.startTime.substring(0, 5)} - {ts.endTime.substring(0, 5)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-20">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(ts)} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ts.uuid)} className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={ts.isBreak ? "outline" : ts.isNonTeachingSlot ? "outline" : "secondary"} className={`rounded-full ${
                                                        ts.isNonTeachingSlot ? 'border-blue-200 text-blue-600 bg-blue-50' : ''
                                                    }`}>
                                                        {ts.isBreak ? "Rest Interval" : ts.isNonTeachingSlot ? "Non-Teaching" : "Teaching Slot"}
                                                    </Badge>
                                                    {(!ts.isBreak && !ts.isNonTeachingSlot) && (
                                                        <Badge variant="outline" className="rounded-full border-primary/20 text-primary">
                                                            {calculateDuration(ts.startTime, ts.endTime)} Minutes
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 bg-card/95 backdrop-blur-xl border-border/50">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                            {editingTimeslot ? 'Edit Timeslot' : 'New Timeslot'}
                        </DialogTitle>
                        <DialogDescription>
                            Configure the timing and label for this schedule period.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="day" className="font-semibold px-1">Day of Week</Label>
                            <Select 
                                value={DAYS_LIST[formData.dayOfWeek - 1]} 
                                onValueChange={(val) => setFormData({ ...formData, dayOfWeek: DAYS_LIST.indexOf(val) + 1 })}
                            >
                                <SelectTrigger className="h-11 rounded-xl bg-accent/30 border-none shadow-inner">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    {DAYS_LIST.map(day => (
                                        <SelectItem key={day} value={day}>{day}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startTime" className="font-semibold px-1">Start Time</Label>
                                <Input 
                                    type="time" 
                                    id="startTime"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    className="h-11 rounded-xl bg-accent/30 border-none shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endTime" className="font-semibold px-1">End Time</Label>
                                <Input 
                                    type="time" 
                                    id="endTime"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                    className="h-11 rounded-xl bg-accent/30 border-none shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="label" className="font-semibold px-1">Slot Label (Optional)</Label>
                            <Input 
                                id="label"
                                placeholder="e.g. Monday_08:00, Lunch Break, etc."
                                value={formData.slotLabel}
                                onChange={(e) => setFormData({ ...formData, slotLabel: e.target.value })}
                                className="h-11 rounded-xl bg-accent/30 border-none shadow-inner"
                            />
                            <p className="text-[10px] text-muted-foreground px-1 italic">
                                Tip: Use "Day_HH:mm" format for auto-mapping in Timetable Editor.
                            </p>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                            <div className="space-y-0.5">
                                <Label className="font-bold flex items-center gap-2">
                                    <Coffee className="w-4 h-4 text-orange-500" />
                                    Mark as Break
                                </Label>
                                <p className="text-xs text-muted-foreground italic text-orange-600/70">Example: Lunch, Recess</p>
                            </div>
                            <Switch 
                                checked={formData.isBreak}
                                onCheckedChange={(checked) => setFormData({ ...formData, isBreak: checked, isNonTeachingSlot: checked ? false : formData.isNonTeachingSlot })}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                            <div className="space-y-0.5">
                                <Label className="font-bold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    Non-Teaching Slot
                                </Label>
                                <p className="text-xs text-muted-foreground italic text-blue-600/70">Example: Assembly, Staff Meeting</p>
                            </div>
                            <Switch 
                                checked={formData.isNonTeachingSlot}
                                onCheckedChange={(checked) => setFormData({ ...formData, isNonTeachingSlot: checked, isBreak: checked ? false : formData.isBreak })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl flex-1 h-12">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={createTimeslot.isPending || updateTimeslot.isPending}
                            className="rounded-xl flex-1 h-12 shadow-md hover:shadow-lg transition-all"
                        >
                            {(createTimeslot.isPending || updateTimeslot.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingTimeslot ? 'Save Changes' : 'Create Timeslot'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog 
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={confirmDelete}
                title="Delete Timeslot"
                description="Are you sure you want to delete this timeslot? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
            />

            {/* Clear Day Confirmation */}
            <ConfirmDialog 
                isOpen={isConfirmDeleteDayOpen}
                onClose={() => setIsConfirmDeleteDayOpen(false)}
                onConfirm={handleClearDay}
                title={`Clear all timeslots for ${selectedDay}?`}
                description={`This will permanently delete all ${filteredTimeslots.length} timeslots for ${selectedDay}. This action cannot be undone.`}
                confirmText="Clear Day"
                cancelText="Cancel"
                variant="destructive"
            />
        </div>
    );
}
