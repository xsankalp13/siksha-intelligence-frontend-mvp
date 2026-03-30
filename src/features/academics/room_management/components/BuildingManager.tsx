import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useGetBuildings, useCreateBuilding, useUpdateBuilding, useDeleteBuilding } from '../queries/useBuildingQueries';
import { ConfirmDialog } from '../../timetable_management/components/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import type { BuildingResponseDto } from '@/services/types/academics';

export function BuildingManager() {
    const { data: buildings = [], isLoading } = useGetBuildings();
    const createBuilding = useCreateBuilding();
    const updateBuilding = useUpdateBuilding();
    const deleteBuilding = useDeleteBuilding();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<BuildingResponseDto | null>(null);
    const [formData, setFormData] = useState({ name: '', code: '', totalFloors: 1 });

    const handleOpenAdd = () => {
        setSelectedBuilding(null);
        setFormData({ name: '', code: '', totalFloors: 1 });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (building: BuildingResponseDto) => {
        setSelectedBuilding(building);
        setFormData({
            name: building.name,
            code: building.code || '',
            totalFloors: building.totalFloors || 1,
        });
        setIsDialogOpen(true);
    };

    const handleOpenDelete = (building: BuildingResponseDto) => {
        setSelectedBuilding(building);
        setIsConfirmDeleteOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: formData.name,
            code: formData.code || undefined,
            totalFloors: formData.totalFloors || undefined,
        };
        if (selectedBuilding) {
            await updateBuilding.mutateAsync({ buildingId: selectedBuilding.uuid, data: payload });
        } else {
            await createBuilding.mutateAsync(payload);
        }
        setIsDialogOpen(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-base font-semibold text-foreground">Campus Buildings</h3>
                    <p className="text-sm text-muted-foreground">Configure buildings before assigning rooms to them.</p>
                </div>
                <Button onClick={handleOpenAdd} size="sm" variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Building
                </Button>
            </div>

            {buildings.length === 0 ? (
                <div className="py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border flex flex-col items-center justify-center">
                    <Building2 className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-medium text-foreground">No Buildings Configured</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">Add your campus buildings to get started.</p>
                    <Button variant="outline" size="sm" onClick={handleOpenAdd}>Add First Building</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <AnimatePresence mode="popLayout">
                        {buildings.map((building, idx) => (
                            <motion.div
                                key={building.uuid}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.03 }}
                                className="group relative bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">{building.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {building.code && (
                                                    <Badge variant="secondary" className="text-[10px] h-5">{building.code}</Badge>
                                                )}
                                                {building.totalFloors && (
                                                    <span className="text-xs text-muted-foreground">{building.totalFloors} floor{building.totalFloors > 1 ? 's' : ''}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(building)}>
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleOpenDelete(building)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedBuilding ? 'Edit Building' : 'Add Building'}</DialogTitle>
                        <DialogDescription>
                            {selectedBuilding ? 'Update the building details.' : 'Add a new campus building.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Building Name *</label>
                            <Input
                                placeholder="e.g. Block A, Main Building"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Short Code</label>
                                <Input
                                    placeholder="e.g. BLK-A"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    maxLength={20}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Total Floors</label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={formData.totalFloors}
                                    onChange={(e) => setFormData({ ...formData, totalFloors: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createBuilding.isPending || updateBuilding.isPending}>
                                {selectedBuilding ? 'Update' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={() => {
                    if (selectedBuilding) deleteBuilding.mutate(selectedBuilding.uuid);
                    setIsConfirmDeleteOpen(false);
                }}
                title="Delete Building"
                description={`Are you sure you want to delete "${selectedBuilding?.name}"? This will fail if rooms are still assigned to it.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
            />
        </div>
    );
}
