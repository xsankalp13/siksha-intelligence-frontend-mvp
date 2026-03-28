import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Plus, 
    Search, 
    MoreVertical, 
    Edit2, 
    Trash2, 
    DoorOpen, 
    Monitor, 
    FlaskConical, 
    BookOpen,
    Loader2,
    LayoutGrid,
    List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useGetRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from '../queries/useRoomQueries';
import { ConfirmDialog } from '../../timetable_management/components/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { RoomResponseDto } from '@/services/types/academics';

const ROOM_TYPES = [
    { value: 'CLASSROOM', label: 'Classroom', icon: DoorOpen },
    { value: 'LABORATORY', label: 'Laboratory', icon: FlaskConical },
    { value: 'COMPUTER_LAB', label: 'Computer Lab', icon: Monitor },
    { value: 'LIBRARY', label: 'Library', icon: BookOpen },
    { value: 'OTHER', label: 'Other', icon: LayoutGrid },
];

export function RoomManagement() {
    const { data: rooms = [], isLoading } = useGetRooms();
    const createRoom = useCreateRoom();
    const updateRoom = useUpdateRoom();
    const deleteRoom = useDeleteRoom();

    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<RoomResponseDto | null>(null);
    const [formData, setFormData] = useState({ name: '', roomType: 'CLASSROOM' });

    const filteredRooms = rooms.filter(room => 
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.roomType?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenAdd = () => {
        setSelectedRoom(null);
        setFormData({ name: '', roomType: 'CLASSROOM' });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (room: RoomResponseDto) => {
        setSelectedRoom(room);
        setFormData({ name: room.name, roomType: room.roomType || 'CLASSROOM' });
        setIsDialogOpen(true);
    };

    const handleOpenDelete = (room: RoomResponseDto) => {
        setSelectedRoom(room);
        setIsConfirmDeleteOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedRoom) {
            await updateRoom.mutateAsync({ roomId: selectedRoom.uuid, data: formData });
        } else {
            await createRoom.mutateAsync(formData);
        }
        setIsDialogOpen(false);
    };

    const getRoomIcon = (type: string) => {
        const roomType = ROOM_TYPES.find(t => t.value === type) || ROOM_TYPES[0];
        const Icon = roomType.icon;
        return <Icon className="w-5 h-5" />;
    };

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            {/* Header */}
            <header className="bg-card rounded-xl border border-border shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Room Management</h1>
                        <p className="text-muted-foreground">Define and manage classrooms, labs, and other school facilities.</p>
                    </div>
                    <Button onClick={handleOpenAdd} className="bg-primary text-primary-foreground gap-2">
                        <Plus className="w-4 h-4" />
                        Add New Room
                    </Button>
                </div>
            </header>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/50">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name or type..." 
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/20">
                    <Button 
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setViewMode('grid')}
                        className="px-3"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button 
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setViewMode('list')}
                        className="px-3"
                    >
                        <List className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
                    <p className="text-muted-foreground animate-pulse">Loading facilities...</p>
                </div>
            ) : filteredRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-4 bg-card/30 rounded-2xl border border-dashed border-border">
                    <div className="p-4 rounded-full bg-accent">
                        <DoorOpen className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">No Rooms Found</h3>
                        <p className="text-muted-foreground max-w-xs mx-auto">
                            {searchQuery ? "Try searching for something else." : "Get started by adding your first classroom or laboratory."}
                        </p>
                    </div>
                    {!searchQuery && (
                        <Button onClick={handleOpenAdd} variant="outline">Add First Room</Button>
                    )}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredRooms.map((room: RoomResponseDto, idx: number) => (
                        <motion.div
                            key={room.uuid}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <Card className="group relative overflow-hidden p-5 hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
                                <div className="absolute top-0 right-0 p-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => handleOpenEdit(room)} className="gap-2">
                                                <Edit2 className="w-4 h-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleOpenDelete(room)} className="gap-2 text-destructive focus:text-destructive">
                                                <Trash2 className="w-4 h-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                        room.roomType === 'LABORATORY' ? 'bg-purple-100 text-purple-600' :
                                        room.roomType === 'COMPUTER_LAB' ? 'bg-blue-100 text-blue-600' :
                                        'bg-primary/10 text-primary'
                                    }`}>
                                        {getRoomIcon(room.roomType || 'CLASSROOM')}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold truncate pr-6">{room.name}</h3>
                                        <Badge variant="outline" className="mt-1 font-normal opacity-70">
                                            {ROOM_TYPES.find(t => t.value === room.roomType)?.label || 'Classroom'}
                                        </Badge>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border">
                                <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wider">Room Name</th>
                                <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredRooms.map((room: RoomResponseDto) => (
                                <tr key={room.uuid} className="hover:bg-muted/10 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="p-2 bg-primary/10 rounded-lg text-primary">
                                                {getRoomIcon(room.roomType || 'CLASSROOM')}
                                            </span>
                                            <span className="font-semibold">{room.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary">{room.roomType || 'CLASSROOM'}</Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(room)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(room)} className="text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
                        <DialogDescription>
                            Enter the details for the educational space.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Room Name / Number</label>
                            <Input 
                                placeholder="e.g. Room 101, Physics Lab" 
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Room Type</label>
                            <Select 
                                value={formData.roomType} 
                                onValueChange={(v) => setFormData({ ...formData, roomType: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROOM_TYPES.map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            <div className="flex items-center gap-2">
                                                <type.icon className="w-4 h-4" />
                                                {type.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending}>
                                {selectedRoom ? 'Update Room' : 'Create Room'}
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
                    if (selectedRoom) deleteRoom.mutate(selectedRoom.uuid);
                    setIsConfirmDeleteOpen(false);
                }}
                title="Delete Room"
                description={`Are you sure you want to delete ${selectedRoom?.name}? This action cannot be undone and may affect active schedules.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="destructive"
            />
        </div>
    );
}
