import { useState, useMemo } from 'react';
import { Search, Plus, BookOpen, Check, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

interface SubjectOption {
    uuid: string;
    name: string;
    subjectCode: string;
    color?: string;
}

export interface SelectedSubjectEntry {
    subjectId: string;
    subjectName: string;
    periodsPerWeek: number;
}

interface AddSubjectDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    existingSubjectIds: string[];
    onAdd: (entries: SelectedSubjectEntry[]) => void;
    isAdding: boolean;
}

export function AddSubjectDialog({ open, onOpenChange, existingSubjectIds, onAdd, isAdding }: AddSubjectDialogProps) {
    const [search, setSearch] = useState('');
    const [selections, setSelections] = useState<Map<string, SelectedSubjectEntry>>(new Map());

    const { data: allSubjects = [], isLoading } = useQuery<SubjectOption[]>({
        queryKey: ['subjects', 'all'],
        queryFn: async () => {
            const res = await api.get('/auth/subjects');
            return res.data;
        },
        staleTime: 10 * 60 * 1000,
        enabled: open,
    });

    const available = useMemo(() =>
        allSubjects.filter(s =>
            !existingSubjectIds.includes(s.uuid) &&
            (s.name.toLowerCase().includes(search.toLowerCase()) ||
             s.subjectCode.toLowerCase().includes(search.toLowerCase()))
        ),
        [allSubjects, existingSubjectIds, search]
    );

    const handleToggle = (subject: SubjectOption) => {
        setSelections(prev => {
            const next = new Map(prev);
            if (next.has(subject.uuid)) {
                next.delete(subject.uuid);
            } else {
                next.set(subject.uuid, { subjectId: subject.uuid, subjectName: subject.name, periodsPerWeek: 5 });
            }
            return next;
        });
    };

    const handlePeriodChange = (subjectId: string, value: number) => {
        setSelections(prev => {
            const next = new Map(prev);
            const entry = next.get(subjectId);
            if (entry) next.set(subjectId, { ...entry, periodsPerWeek: value });
            return next;
        });
    };

    const handleSubmit = () => {
        if (selections.size === 0) return;
        onAdd(Array.from(selections.values()));
        setSelections(new Map());
        setSearch('');
    };

    const handleClose = (v: boolean) => {
        if (!v) {
            setSelections(new Map());
            setSearch('');
        }
        onOpenChange(v);
    };

    const selectedList = Array.from(selections.values());

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Add Subject to Curriculum
                    </DialogTitle>
                    <DialogDescription>
                        Select one or more subjects and set their weekly period count.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search subjects..."
                            className="pl-9"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Selection count badge */}
                    {selections.size > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge className="rounded-full px-2 py-0.5 text-xs bg-primary/10 text-primary border-0">
                                {selections.size} selected
                            </Badge>
                            <button
                                type="button"
                                onClick={() => setSelections(new Map())}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                    )}

                    {/* Subject List */}
                    <div className="max-h-52 overflow-y-auto space-y-0.5 rounded-lg border border-border/60 p-1">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full rounded-lg" />
                            ))
                        ) : available.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-8">
                                {search ? 'No matching subjects found.' : 'All subjects already added.'}
                            </div>
                        ) : (
                            available.map(s => {
                                const dotColor = s.color?.startsWith('#') ? s.color : '#6366f1';
                                const isSelected = selections.has(s.uuid);

                                return (
                                    <button
                                        key={s.uuid}
                                        onClick={() => handleToggle(s)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                                            isSelected
                                                ? 'bg-primary/10 text-primary border border-primary/30'
                                                : 'hover:bg-muted text-foreground border border-transparent'
                                        }`}
                                    >
                                        {/* Checkbox indicator */}
                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${
                                            isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                                        }`}>
                                            {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground stroke-[3]" />}
                                        </span>
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: dotColor }}
                                        />
                                        <span className="font-medium flex-1 text-left">{s.name}</span>
                                        <span className="text-xs font-mono text-muted-foreground">{s.subjectCode}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Per-subject periods configuration */}
                    {selectedList.length > 0 && (
                        <div className="space-y-2 pt-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Periods per week
                            </p>
                            <div className="rounded-lg border border-border/60 divide-y divide-border/60 max-h-44 overflow-y-auto">
                                {selectedList.map(entry => (
                                    <div key={entry.subjectId} className="flex items-center gap-3 px-3 py-2.5">
                                        <span className="text-sm font-medium flex-1 truncate">{entry.subjectName}</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handlePeriodChange(entry.subjectId, Math.max(0, entry.periodsPerWeek - 1))}
                                                className="h-6 w-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors text-base leading-none"
                                            >
                                                −
                                            </button>
                                            <span className="w-7 text-center text-sm font-semibold tabular-nums">
                                                {entry.periodsPerWeek}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handlePeriodChange(entry.subjectId, Math.min(40, entry.periodsPerWeek + 1))}
                                                className="h-6 w-6 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors text-base leading-none"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleToggle({ uuid: entry.subjectId, name: entry.subjectName, subjectCode: '' })}
                                            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={selections.size === 0 || isAdding} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {isAdding
                            ? 'Adding…'
                            : selections.size > 1
                            ? `Add ${selections.size} Subjects`
                            : 'Add to Curriculum'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
