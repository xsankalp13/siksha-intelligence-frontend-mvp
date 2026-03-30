import { useState, useMemo } from 'react';
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
    List,
    Upload,
    Projector,
    Wind,
    ClipboardList,
    Accessibility,
    Building2,
    ChevronDown,
    ChevronUp,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useGetRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from '../queries/useRoomQueries';
import { useGetBuildings } from '../queries/useBuildingQueries';
import { ConfirmDialog } from '../../timetable_management/components/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { BuildingManager } from './BuildingManager';
import { RoomBulkImportDialog } from './RoomBulkImportDialog';
import type { RoomResponseDto, RoomRequestDto } from '@/services/types/academics';
import { ROOM_TYPE_OPTIONS, SEATING_TYPE_OPTIONS } from '@/services/types/academics';

const ROOM_ICONS: Record<string, React.ElementType> = {
    CLASSROOM: DoorOpen,
    LABORATORY: FlaskConical,
    COMPUTER_LAB: Monitor,
    LIBRARY: BookOpen,
    OTHER: LayoutGrid,
};

const ROOM_COLORS: Record<string, string> = {
    CLASSROOM: 'bg-primary/10 text-primary',
    LABORATORY: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    COMPUTER_LAB: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    LIBRARY: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    OTHER: 'bg-muted text-muted-foreground',
};

interface RoomFormData {
    name: string;
    roomType: string;
    seatingType: string;
    rowCount: number;
    columnsPerRow: number;
    seatsPerUnit: number;
    floorNumber: number;
    buildingId: string;
    hasProjector: boolean;
    hasAC: boolean;
    hasWhiteboard: boolean;
    isAccessible: boolean;
    otherAmenities: string;
}

const DEFAULT_FORM: RoomFormData = {
    name: '',
    roomType: 'CLASSROOM',
    seatingType: 'BENCH',
    rowCount: 5,
    columnsPerRow: 4,
    seatsPerUnit: 3,
    floorNumber: 0,
    buildingId: '',
    hasProjector: false,
    hasAC: false,
    hasWhiteboard: true,
    isAccessible: false,
    otherAmenities: '',
};

export function RoomManagement() {
    const { data: rooms = [], isLoading } = useGetRooms();
    const { data: buildings = [] } = useGetBuildings();
    const createRoom = useCreateRoom();
    const updateRoom = useUpdateRoom();
    const deleteRoom = useDeleteRoom();

    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [showBuildingManager, setShowBuildingManager] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<RoomResponseDto | null>(null);
    const [formData, setFormData] = useState<RoomFormData>(DEFAULT_FORM);

    // Collapsible sections in dialog
    const [seatingOpen, setSeatingOpen] = useState(true);
    const [amenitiesOpen, setAmenitiesOpen] = useState(false);

    const filteredRooms = useMemo(() => rooms.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.roomType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.building?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    ), [rooms, searchQuery]);

    const calculatedCapacity = formData.rowCount * formData.columnsPerRow * formData.seatsPerUnit;

    const handleOpenAdd = () => {
        setSelectedRoom(null);
        setFormData({
            ...DEFAULT_FORM,
            buildingId: buildings.length > 0 ? buildings[0].uuid : '',
        });
        setSeatingOpen(true);
        setAmenitiesOpen(false);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (room: RoomResponseDto) => {
        setSelectedRoom(room);
        setFormData({
            name: room.name,
            roomType: room.roomType || 'CLASSROOM',
            seatingType: room.seatingType || 'BENCH',
            rowCount: room.rowCount || 5,
            columnsPerRow: room.columnsPerRow || 4,
            seatsPerUnit: room.seatsPerUnit || 3,
            floorNumber: room.floorNumber || 0,
            buildingId: room.building?.uuid || '',
            hasProjector: room.hasProjector || false,
            hasAC: room.hasAC || false,
            hasWhiteboard: room.hasWhiteboard ?? true,
            isAccessible: room.isAccessible || false,
            otherAmenities: room.otherAmenities || '',
        });
        setSeatingOpen(true);
        setAmenitiesOpen(true);
        setIsDialogOpen(true);
    };

    const handleOpenDelete = (room: RoomResponseDto) => {
        setSelectedRoom(room);
        setIsConfirmDeleteOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: RoomRequestDto = {
            name: formData.name,
            roomType: formData.roomType,
            seatingType: formData.seatingType,
            rowCount: formData.rowCount,
            columnsPerRow: formData.columnsPerRow,
            seatsPerUnit: formData.seatsPerUnit,
            floorNumber: formData.floorNumber,
            buildingId: formData.buildingId,
            hasProjector: formData.hasProjector,
            hasAC: formData.hasAC,
            hasWhiteboard: formData.hasWhiteboard,
            isAccessible: formData.isAccessible,
            otherAmenities: formData.otherAmenities || undefined,
        };
        if (selectedRoom) {
            await updateRoom.mutateAsync({ roomId: selectedRoom.uuid, data: payload });
        } else {
            await createRoom.mutateAsync(payload);
        }
        setIsDialogOpen(false);
    };

    const getRoomIcon = (type: string) => {
        const Icon = ROOM_ICONS[type] || ROOM_ICONS.CLASSROOM;
        return <Icon className="w-5 h-5" />;
    };

    const getAmenityIcons = (room: RoomResponseDto) => {
        const icons: { icon: React.ElementType; label: string; active: boolean }[] = [
            { icon: Projector, label: 'Projector', active: !!room.hasProjector },
            { icon: Wind, label: 'AC', active: !!room.hasAC },
            { icon: ClipboardList, label: 'Whiteboard', active: !!room.hasWhiteboard },
            { icon: Accessibility, label: 'Accessible', active: !!room.isAccessible },
        ];
        return icons.filter(i => i.active);
    };

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            {/* Header */}
            <header className="bg-card rounded-xl border border-border shadow-sm p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Room Management</h1>
                        <p className="text-muted-foreground">Define classrooms, labs, and other facilities with seating layout and amenities.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setIsBulkImportOpen(true)} className="gap-2">
                            <Upload className="w-4 h-4" /> Bulk Import
                        </Button>
                        <Button onClick={handleOpenAdd} className="bg-primary text-primary-foreground gap-2">
                            <Plus className="w-4 h-4" /> Add Room
                        </Button>
                    </div>
                </div>
            </header>

            {/* Building Manager (Collapsible) */}
            <Collapsible open={showBuildingManager} onOpenChange={setShowBuildingManager}>
                <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden">
                    <CollapsibleTrigger asChild>
                        <button className="flex items-center justify-between w-full px-6 py-4 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5 text-primary" />
                                <div className="text-left">
                                    <p className="text-sm font-semibold">Campus Buildings</p>
                                    <p className="text-xs text-muted-foreground">{buildings.length} building{buildings.length !== 1 ? 's' : ''} configured</p>
                                </div>
                            </div>
                            {showBuildingManager ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="px-6 pb-6 pt-2 border-t border-border/30">
                            <BuildingManager />
                        </div>
                    </CollapsibleContent>
                </div>
            </Collapsible>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/50 p-4 rounded-xl border border-border/50">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, type, or building..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{filteredRooms.length} room{filteredRooms.length !== 1 ? 's' : ''}</span>
                    <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/20">
                        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className="px-3">
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="px-3">
                            <List className="w-4 h-4" />
                        </Button>
                    </div>
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
                    {filteredRooms.map((room: RoomResponseDto, idx: number) => {
                        const amenities = getAmenityIcons(room);
                        return (
                            <motion.div
                                key={room.uuid}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.04 }}
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

                                    <div className="flex flex-col gap-3">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${ROOM_COLORS[room.roomType] || ROOM_COLORS.CLASSROOM}`}>
                                            {getRoomIcon(room.roomType)}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold truncate pr-6">{room.name}</h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {room.building?.name}{room.floorNumber != null ? `, Floor ${room.floorNumber}` : ''}
                                            </p>
                                        </div>

                                        {/* Capacity & Layout */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="secondary" className="gap-1 text-xs font-semibold">
                                                <Users className="w-3 h-3" />
                                                {room.totalCapacity} seats
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px] font-normal opacity-70">
                                                {room.rowCount}×{room.columnsPerRow} · {room.seatsPerUnit}/unit
                                            </Badge>
                                        </div>

                                        {/* Amenity icons */}
                                        {amenities.length > 0 && (
                                            <div className="flex items-center gap-2 pt-1">
                                                {amenities.map(({ icon: Icon, label }) => (
                                                    <span key={label} title={label} className="text-muted-foreground/60 hover:text-foreground transition-colors">
                                                        <Icon className="w-3.5 h-3.5" />
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                /* List View */
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border">
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Room</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Layout</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Capacity</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Building</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Floor</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredRooms.map((room: RoomResponseDto) => (
                                <tr key={room.uuid} className="hover:bg-muted/10 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`p-2 rounded-lg ${ROOM_COLORS[room.roomType] || ROOM_COLORS.CLASSROOM}`}>
                                                {getRoomIcon(room.roomType)}
                                            </span>
                                            <span className="font-semibold text-sm">{room.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="secondary" className="text-xs">
                                            {ROOM_TYPE_OPTIONS.find(t => t.value === room.roomType)?.label || room.roomType}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {room.rowCount}×{room.columnsPerRow} {SEATING_TYPE_OPTIONS.find(s => s.value === room.seatingType)?.label || room.seatingType}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-semibold text-sm">{room.totalCapacity}</span>
                                        <span className="text-xs text-muted-foreground ml-1">seats</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">{room.building?.name || '—'}</td>
                                    <td className="px-6 py-4 text-sm">{room.floorNumber ?? '—'}</td>
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

            {/* Add/Edit Room Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
                        <DialogDescription>
                            Configure the room's layout, location, and amenities.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-5 py-2">
                        {/* Section 1: Basic Info */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Room Name *</Label>
                                <Input
                                    placeholder="e.g. Room 101, Physics Lab"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Room Type *</Label>
                                    <Select value={formData.roomType} onValueChange={(v) => setFormData({ ...formData, roomType: v })}>
                                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                        <SelectContent>
                                            {ROOM_TYPE_OPTIONS.map(type => (
                                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Building *</Label>
                                    <Select value={formData.buildingId} onValueChange={(v) => setFormData({ ...formData, buildingId: v })}>
                                        <SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
                                        <SelectContent>
                                            {buildings.map(b => (
                                                <SelectItem key={b.uuid} value={b.uuid}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Floor Number *</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={formData.floorNumber}
                                    onChange={(e) => setFormData({ ...formData, floorNumber: Number(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Section 2: Seating Configuration */}
                        <Collapsible open={seatingOpen} onOpenChange={setSeatingOpen}>
                            <CollapsibleTrigger className="flex items-center justify-between w-full group">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4 text-primary" /> Seating Configuration
                                </h4>
                                {seatingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label>Seating Type *</Label>
                                    <Select value={formData.seatingType} onValueChange={(v) => setFormData({ ...formData, seatingType: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {SEATING_TYPE_OPTIONS.map(type => (
                                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-xs">Rows *</Label>
                                        <Input
                                            type="number" min={1}
                                            value={formData.rowCount}
                                            onChange={(e) => setFormData({ ...formData, rowCount: Number(e.target.value) || 1 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Columns/Row *</Label>
                                        <Input
                                            type="number" min={1}
                                            value={formData.columnsPerRow}
                                            onChange={(e) => setFormData({ ...formData, columnsPerRow: Number(e.target.value) || 1 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Seats/Unit *</Label>
                                        <Input
                                            type="number" min={1}
                                            value={formData.seatsPerUnit}
                                            onChange={(e) => setFormData({ ...formData, seatsPerUnit: Number(e.target.value) || 1 })}
                                        />
                                    </div>
                                </div>
                                {/* Live capacity preview */}
                                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-center">
                                    <p className="text-xs text-muted-foreground mb-1">Total Capacity</p>
                                    <p className="text-2xl font-bold text-primary">
                                        {calculatedCapacity}
                                        <span className="text-sm font-normal text-muted-foreground ml-2">seats</span>
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        {formData.rowCount} rows × {formData.columnsPerRow} units × {formData.seatsPerUnit} seats/unit
                                    </p>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <Separator />

                        {/* Section 3: Amenities */}
                        <Collapsible open={amenitiesOpen} onOpenChange={setAmenitiesOpen}>
                            <CollapsibleTrigger className="flex items-center justify-between w-full">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-primary" /> Amenities
                                </h4>
                                {amenitiesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <Checkbox
                                            checked={formData.hasProjector}
                                            onCheckedChange={(c) => setFormData({ ...formData, hasProjector: !!c })}
                                        />
                                        <div className="flex items-center gap-2 text-sm">
                                            <Projector className="w-4 h-4 text-muted-foreground" /> Projector
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <Checkbox
                                            checked={formData.hasAC}
                                            onCheckedChange={(c) => setFormData({ ...formData, hasAC: !!c })}
                                        />
                                        <div className="flex items-center gap-2 text-sm">
                                            <Wind className="w-4 h-4 text-muted-foreground" /> Air Conditioning
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <Checkbox
                                            checked={formData.hasWhiteboard}
                                            onCheckedChange={(c) => setFormData({ ...formData, hasWhiteboard: !!c })}
                                        />
                                        <div className="flex items-center gap-2 text-sm">
                                            <ClipboardList className="w-4 h-4 text-muted-foreground" /> Whiteboard
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <Checkbox
                                            checked={formData.isAccessible}
                                            onCheckedChange={(c) => setFormData({ ...formData, isAccessible: !!c })}
                                        />
                                        <div className="flex items-center gap-2 text-sm">
                                            <Accessibility className="w-4 h-4 text-muted-foreground" /> Wheelchair Accessible
                                        </div>
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Other Amenities</Label>
                                    <Textarea
                                        placeholder="e.g. Smart Board, Speaker System, Lab Equipment..."
                                        value={formData.otherAmenities}
                                        onChange={(e) => setFormData({ ...formData, otherAmenities: e.target.value })}
                                        rows={2}
                                        className="resize-none"
                                    />
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending || !formData.buildingId}>
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

            {/* Bulk Import Dialog */}
            <RoomBulkImportDialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen} />
        </div>
    );
}
