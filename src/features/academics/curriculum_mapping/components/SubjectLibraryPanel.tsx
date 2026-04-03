import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, FlaskConical, Search, BookOpen } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SubjectDto {
    uuid: string;
    name: string;
    subjectCode: string;
    requiresSpecialRoomType?: string;
    color?: string;
}

interface SubjectFormData {
    name: string;
    subjectCode: string;
    requiresSpecialRoomType: string;
    color: string;
}

const SUBJECT_COLOR_PRESETS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#06b6d4', '#84cc16', '#a78bfa',
];

const QUERY_KEY = ['subjects', 'all'];

function SubjectFormDialog({
    open,
    onOpenChange,
    initial,
    onSubmit,
    isSubmitting,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    initial?: SubjectDto | null;
    onSubmit: (data: SubjectFormData) => void;
    isSubmitting: boolean;
}) {
    const [form, setForm] = useState<SubjectFormData>({
        name: initial?.name ?? '',
        subjectCode: initial?.subjectCode ?? '',
        requiresSpecialRoomType: initial?.requiresSpecialRoomType ?? '',
        color: initial?.color ?? '#6366f1',
    });

    // Sync when target changes (open/close)
    const handleOpen = (v: boolean) => {
        if (v) {
            setForm({
                name: initial?.name ?? '',
                subjectCode: initial?.subjectCode ?? '',
                requiresSpecialRoomType: initial?.requiresSpecialRoomType ?? '',
                color: initial?.color ?? '#6366f1',
            });
        }
        onOpenChange(v);
    };

    const isEdit = !!initial;

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        {isEdit ? 'Edit Subject' : 'Create New Subject'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEdit ? 'Update the subject details below.' : 'Add a new subject to your institution\'s subject library.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Subject Name <span className="text-destructive">*</span></Label>
                        <Input
                            placeholder="e.g., Mathematics"
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Subject Code <span className="text-destructive">*</span></Label>
                        <Input
                            placeholder="e.g., MATH101"
                            value={form.subjectCode}
                            onChange={e => setForm(f => ({ ...f, subjectCode: e.target.value.toUpperCase() }))}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Special Room Requirement <span className="text-muted-foreground text-xs">(optional)</span></Label>
                        <Input
                            placeholder="e.g., LAB, MUSIC_ROOM, GYM"
                            value={form.requiresSpecialRoomType}
                            onChange={e => setForm(f => ({ ...f, requiresSpecialRoomType: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Subject Color</Label>
                        <div className="flex flex-wrap gap-2">
                            {SUBJECT_COLOR_PRESETS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, color: c }))}
                                    className="w-7 h-7 rounded-full border-2 transition-all duration-150 hover:scale-110"
                                    style={{
                                        backgroundColor: c,
                                        borderColor: form.color === c ? 'white' : 'transparent',
                                        boxShadow: form.color === c ? `0 0 0 2px ${c}` : undefined,
                                    }}
                                />
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: form.color }} />
                            <Input
                                type="text"
                                value={form.color}
                                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                className="w-28 font-mono text-xs"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => onSubmit(form)}
                        disabled={!form.name.trim() || !form.subjectCode.trim() || isSubmitting}
                        className="gap-2"
                    >
                        {isSubmitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Subject')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function SubjectLibraryPanel() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<SubjectDto | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SubjectDto | null>(null);

    const { data: subjects = [], isLoading } = useQuery<SubjectDto[]>({
        queryKey: QUERY_KEY,
        queryFn: async () => (await api.get('/auth/subjects')).data,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: (data: SubjectFormData) => api.post('/auth/subjects', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            setCreateOpen(false);
            toast.success('Subject created successfully.');
        },
        onError: () => toast.error('Failed to create subject. Code may already be in use.'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: SubjectFormData }) =>
            api.put(`/auth/subjects/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            setEditTarget(null);
            toast.success('Subject updated.');
        },
        onError: () => toast.error('Failed to update subject.'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/auth/subjects/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            setDeleteTarget(null);
            toast.success('Subject removed from library.');
        },
        onError: () => toast.error('Failed to delete subject.'),
    });

    const filtered = subjects.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.subjectCode.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <>
            <Card className="border-border/60">
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary" />
                                Subject Library
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {subjects.length} subjects in the system
                            </p>
                        </div>
                        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0">
                            <Plus className="w-4 h-4" />
                            New Subject
                        </Button>
                    </div>

                    <div className="relative mt-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search subjects..."
                            className="pl-9"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 rounded-xl" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                            <div className="p-4 rounded-full bg-muted">
                                <BookOpen className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">
                                    {search ? 'No subjects found' : 'No subjects yet'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {search ? 'Try a different search term.' : 'Create your first subject to get started.'}
                                </p>
                            </div>
                            {!search && (
                                <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 mt-1">
                                    <Plus className="w-4 h-4" />
                                    Create First Subject
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            <AnimatePresence mode="popLayout">
                                {filtered.map((subject, i) => {
                                    const dotColor = subject.color?.startsWith('#') ? subject.color : '#6366f1';
                                    return (
                                        <motion.div
                                            key={subject.uuid}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="group relative flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                                        >
                                            {/* Color swatch */}
                                            <div
                                                className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center"
                                                style={{ backgroundColor: `${dotColor}20`, border: `2px solid ${dotColor}40` }}
                                            >
                                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dotColor }} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-foreground truncate">{subject.name}</p>
                                                <p className="text-xs font-mono text-muted-foreground">{subject.subjectCode}</p>
                                                {subject.requiresSpecialRoomType && (
                                                    <span className="inline-flex items-center gap-1 text-xs mt-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                                        <FlaskConical className="w-2.5 h-2.5" />
                                                        {subject.requiresSpecialRoomType}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Actions — show on hover */}
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7"
                                                    onClick={() => setEditTarget(subject)}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleteTarget(subject)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <SubjectFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                initial={null}
                onSubmit={data => createMutation.mutate(data)}
                isSubmitting={createMutation.isPending}
            />

            {/* Edit Dialog */}
            <SubjectFormDialog
                open={!!editTarget}
                onOpenChange={v => !v && setEditTarget(null)}
                initial={editTarget}
                onSubmit={data => editTarget && updateMutation.mutate({ id: editTarget.uuid, data })}
                isSubmitting={updateMutation.isPending}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
                        <AlertDialogDescription>
                            <strong>{deleteTarget?.name}</strong> will be permanently removed from the subject library.
                            Any existing curriculum mappings using this subject will also be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.uuid)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
