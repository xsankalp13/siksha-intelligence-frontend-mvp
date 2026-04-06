import { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Info, LayoutGrid, BookOpen, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { OverviewHeader } from '@/features/academics/curriculum_mapping/components/OverviewHeader';
import { ClassCurriculumPanel } from '@/features/academics/curriculum_mapping/components/ClassCurriculumPanel';
import { AddSubjectDialog } from '@/features/academics/curriculum_mapping/components/AddSubjectDialog';
import type { SelectedSubjectEntry } from '@/features/academics/curriculum_mapping/components/AddSubjectDialog';
import { SubjectLibraryPanel } from '@/features/academics/curriculum_mapping/components/SubjectLibraryPanel';
import { TeacherSubjectMappingPanel } from '@/features/academics/curriculum_mapping/components/TeacherSubjectMappingPanel';
import { ClassTeacherMappingPanel } from '@/features/academics/class_teacher_mapping/components/ClassTeacherMappingPanel';
import {
    useGetCurriculumOverview,
    useGetClassCurriculum,
    useAddSubjectToClass,
    useUpdateCurriculumPeriods,
    useRemoveSubjectFromCurriculum,
} from '@/features/academics/curriculum_mapping/queries/useCurriculumQueries';
import type { CurriculumOverviewDto } from '@/features/academics/curriculum_mapping/types';
import { useMemo } from 'react';

interface AcademicClassDto {
    classId: string;
    name: string;
}

type ActiveTab = 'curriculum' | 'subjects' | 'teachers' | 'classTeacher';

export default function CurriculumPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('curriculum');
    const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    const { data: allClasses = [], isLoading: classesLoading } = useQuery<AcademicClassDto[]>({
        queryKey: ['classes', 'all'],
        queryFn: async () => (await api.get('/auth/classes')).data,
        staleTime: 10 * 60 * 1000,
    });

    const { data: overview = [] } = useGetCurriculumOverview();

    const mergedOverview: CurriculumOverviewDto[] = useMemo(() => {
        const overviewMap = new Map(overview.map(o => [o.classId, o]));
        return allClasses.map(cls => ({
            ...overviewMap.get(cls.classId) ?? {
                classId: cls.classId,
                className: cls.name,
                totalSubjects: 0,
                totalPeriodsPerWeek: 0,
                scheduledPeriods: 0,
                coveragePercent: 0,
            },
        }));
    }, [allClasses, overview]);

    const { data: classCurriculum = [], isLoading: curriculumLoading } = useGetClassCurriculum(selectedClass?.id);
    const { mutate: addSubject, isPending: isAdding } = useAddSubjectToClass();
    const { mutate: updatePeriods, isPending: isUpdating } = useUpdateCurriculumPeriods();
    const { mutate: removeSubject } = useRemoveSubjectFromCurriculum();

    const handleSelectClass = (classId: string, className: string) => {
        setSelectedClass({ id: classId, name: className });
    };

    const handleAddSubject = (entries: SelectedSubjectEntry[]) => {
        if (!selectedClass || entries.length === 0) return;
        // Fire one mutation per subject; close dialog after the last one
        entries.forEach((entry, idx) => {
            addSubject(
                { classId: selectedClass.id, body: { subjectId: entry.subjectId, periodsPerWeek: entry.periodsPerWeek } },
                { onSuccess: () => { if (idx === entries.length - 1) setAddDialogOpen(false); } }
            );
        });
    };

    const handleUpdatePeriods = (curriculumMapId: string, periodsPerWeek: number) => {
        if (!selectedClass) return;
        updatePeriods({ curriculumMapId, classId: selectedClass.id, body: { periodsPerWeek } });
    };

    const handleRemove = (curriculumMapId: string) => {
        if (!selectedClass) return;
        removeSubject({ curriculumMapId, classId: selectedClass.id });
    };

    const existingSubjectIds = classCurriculum.map(e => e.subjectId);

    const tabs: { id: ActiveTab; label: string; icon: React.ElementType; description: string }[] = [
        {
            id: 'curriculum',
            label: 'Class Curriculum',
            icon: LayoutGrid,
            description: 'Map subjects to classes with period counts',
        },
        {
            id: 'subjects',
            label: 'Subject Library',
            icon: BookOpen,
            description: 'Manage your institution\'s subject catalog',
        },
        {
            id: 'teachers',
            label: 'Teacher Mapping',
            icon: Users,
            description: 'Map subjects to capable teachers',
        },
        {
            id: 'classTeacher',
            label: 'Class Teacher Mapping',
            icon: Users,
            description: 'Assign one class teacher to each section',
        },
    ];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-8">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start justify-between"
            >
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <GraduationCap className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Curriculum Mapping
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm ml-11">
                        Define your subject catalog and map subjects to each class
                    </p>
                </div>
            </motion.div>

            {/* Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="flex gap-2 p-1 bg-muted/60 rounded-xl border border-border/40 w-fit"
            >
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                isActive
                                    ? 'bg-background text-foreground shadow-sm border border-border/50'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </motion.div>

            {/* Tab Content */}
            {activeTab === 'curriculum' && (
                <motion.div
                    key="curriculum"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-6"
                >
                    {/* Overview Cards */}
                    <OverviewHeader
                        data={mergedOverview}
                        isLoading={classesLoading}
                        selectedClassId={selectedClass?.id ?? null}
                        onSelectClass={handleSelectClass}
                    />

                    {/* Curriculum Editor or Empty Prompt */}
                    {selectedClass ? (
                        <ClassCurriculumPanel
                            className={selectedClass.name}
                            entries={classCurriculum}
                            isLoading={curriculumLoading}
                            onUpdatePeriods={handleUpdatePeriods}
                            onRemove={handleRemove}
                            onAddClick={() => setAddDialogOpen(true)}
                            isUpdating={isUpdating}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center">
                            <div className="p-4 rounded-full bg-muted">
                                <Info className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Select a class to begin</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Click any class card above to view and edit its curriculum
                                </p>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}

            {activeTab === 'subjects' && (
                <motion.div
                    key="subjects"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <SubjectLibraryPanel />
                </motion.div>
            )}

            {activeTab === 'teachers' && (
                <motion.div
                    key="teachers"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-[800px] flex flex-col"
                >
                    <TeacherSubjectMappingPanel />
                </motion.div>
            )}

            {activeTab === 'classTeacher' && (
                <motion.div
                    key="classTeacher"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col"
                >
                    <ClassTeacherMappingPanel />
                </motion.div>
            )}

            {/* Add Subject to Curriculum Dialog */}
            <AddSubjectDialog
                open={addDialogOpen}
                onOpenChange={setAddDialogOpen}
                existingSubjectIds={existingSubjectIds}
                onAdd={handleAddSubject}
                isAdding={isAdding}
            />
        </div>
    );
}
