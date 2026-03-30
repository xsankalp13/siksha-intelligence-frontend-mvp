import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { TimetableGrid } from './TimetableGrid';
import { setSubjectToCell, setTeacherToCell, resetGrid, setSelectedClass, setSelectedSection } from '../store/timetableSlice';
import type { RootState } from '@/store/store';
import { useGetEditorContext, useGetRooms } from '../queries/useTimetableQueries';
import { ArrowLeft, Printer, Share2, Download } from 'lucide-react';

const normalizeTime = (time: string) => {
    if (!time) return '';
    const parts = time.split(':');
    const hours = parts[0].trim().padStart(2, '0');
    const minutes = (parts[1] || '0').trim().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const DAYS_LIST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function TimetableReader() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { sectionId, classId } = useParams();
    const { selectedClass, selectedSection } = useSelector(
        (state: RootState) => state.timetable
    );
    const sectionIdToUse = selectedSection?._id || sectionId;

    const { data: context, isLoading } = useGetEditorContext(sectionIdToUse);
    const { data: rooms = [] } = useGetRooms();
    const [hydratedSectionId, setHydratedSectionId] = useState<string | null>(null);

    // ─── Hydrate Redux selection from URL if missing ─────────────────────────
    useEffect(() => {
        if (context?.section && (!selectedSection || !selectedClass)) {
            dispatch(setSelectedClass({ _id: classId || '', name: context.section.className }));
            dispatch(setSelectedSection({ _id: sectionId || '', name: context.section.sectionName, defaultRoom: context.section.defaultRoom }));
        }
    }, [context?.section, selectedSection, selectedClass, dispatch, classId, sectionId]);

    useEffect(() => {
        if (context && sectionIdToUse && hydratedSectionId !== sectionIdToUse) {
            dispatch(resetGrid());
            setHydratedSectionId(sectionIdToUse);
            
            // 1. Mark BREAKS and NON-TEACHING SLOTS as locked
            context.timeslots.forEach(ts => {
                const isLabelBreak = ts.slotLabel?.toLowerCase().includes('lunch') || ts.slotLabel?.toLowerCase().includes('break');
                const isNonTeaching = ts.isNonTeachingSlot || ts.slotLabel?.toLowerCase().includes('assembly') || ts.slotLabel?.toLowerCase().includes('office');

                if (ts.isBreak || isLabelBreak || ts.isNonTeachingSlot || isNonTeaching) {
                    const dayName = DAYS_LIST[ts.dayOfWeek - 1] || 'Monday';
                    const timeStr = normalizeTime(ts.startTime);
                    const cellKey = `${dayName}_${timeStr}`;

                    let label = ts.slotLabel;
                    if (ts.isBreak || isLabelBreak) {
                        label = ts.slotLabel?.toLowerCase().includes('lunch') ? 'Lunch' : 'Break';
                    }

                    const color = (ts.isBreak || isLabelBreak) 
                        ? 'bg-orange-50 text-orange-600 border-orange-200' 
                        : 'bg-slate-100 text-slate-500 border-slate-200';

                    dispatch(setSubjectToCell({ 
                        cellKey, 
                        subject: { _id: 'break', name: label, code: 'LOCKED', color: color } as any 
                    }));
                    dispatch(setTeacherToCell({ cellKey, teacher: { _id: 'break-sys', name: label } as any }));
                }
            });

            // 2. Hydrate grid with read-only data
            context.existingSchedule.forEach((entry) => {
                let cellKey = null;
                
                // Priority 1: Map by timeslot UUID (most accurate)
                if (entry.timeslotId) {
                    const ts = context.timeslots.find(t => t.uuid === entry.timeslotId);
                    if (ts) {
                        const dayName = DAYS_LIST[ts.dayOfWeek - 1] || 'Monday';
                        const timeStr = normalizeTime(ts.startTime);
                        cellKey = `${dayName}_${timeStr}`;
                    }
                }
                
                // Priority 2: Use direct slotLabel if UUID lookup failed
                if (!cellKey) cellKey = entry.slotLabel;

                const subject = context.availableSubjects.find(s => s.uuid === entry.subjectId);
                const teacher = context.teachers.find(t => t.id === entry.teacherId);

                if (cellKey && subject && teacher) {
                    dispatch(setSubjectToCell({ 
                        cellKey, 
                        subject: { 
                            _id: subject.uuid, 
                            name: subject.name, 
                            code: subject.subjectCode,
                            color: subject.color 
                        } as any,
                        roomId: entry.roomId || null
                    }));
                    
                    dispatch(setTeacherToCell({ 
                        cellKey, 
                        teacher: {
                            _id: teacher.id,
                            name: teacher.name
                        } as any 
                    }));
                }
            });
        }
    }, [context, sectionIdToUse, hydratedSectionId, dispatch]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <header className="bg-card rounded-xl border border-border shadow-sm print:hidden">
                <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/dashboard/admin/timetable')}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold">{selectedClass?.name} - {selectedSection?.name}</h1>
                            <p className="text-sm text-muted-foreground">Weekly Academic Schedule</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
                            <Printer className="w-4 h-4" /> Print
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" /> Export
                        </Button>
                        <Button size="sm" className="gap-2">
                            <Share2 className="w-4 h-4" /> Share
                        </Button>
                    </div>
                </div>
            </header>

            {/* Grid Container */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-auto p-1">
                <TimetableGrid readOnly rooms={rooms} />
            </div>

            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { size: landscape; margin: 0; }
                    html, body { 
                        margin: 0; 
                        padding: 0; 
                        width: 100%; 
                        height: 100%; 
                        background: white !important;
                    }
                    
                    /* HIDE EVERYTHING AND SHOW ONLY THE PRINT AREA */
                    body * { visibility: hidden !important; }
                    
                    #timetable-print-area, #timetable-print-area * { 
                        visibility: visible !important; 
                    }
                    
                    #timetable-print-area { 
                        display: flex !important;
                        flex-direction: column !important;
                        position: fixed; 
                        top: 0;
                        left: 0;
                        width: 297mm; /* A4 Landscape Width approx */
                        height: 210mm; /* A4 Landscape Height approx */
                        padding: 5mm;
                        background: white !important;
                        z-index: 9999;
                        visibility: visible !important;
                        transform: scale(0.8);
                        transform-origin: top center;
                    }

                    /* Ensure background colors/borders print */
                    #timetable-print-area { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            ` }} />
            
            <div id="timetable-print-area" className="hidden print:flex flex-col bg-white">
                 <div className="mb-4 text-center">
                    <h1 className="text-2xl font-black text-slate-900 leading-none">
                        {selectedClass?.name} — {selectedSection?.name}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">
                        Academic Timetable — Made by Shiksha Intelligence
                    </p>
                 </div>
                 <div className="flex-1 w-full scale-[0.98] origin-top">
                    <TimetableGrid readOnly rooms={rooms} />
                 </div>
            </div>
        </div>
    );
}
