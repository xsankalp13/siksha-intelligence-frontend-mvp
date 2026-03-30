import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
    CalendarDays, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Plus, 
    MoreVertical,
    Edit2,
    Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectTimetableScope } from "../hooks/useSelectTimetableScope";
import { SelectionDialog } from "./SelectionDialog";
import { useGetTimetableOverview } from "../queries/useTimetableQueries";
import type { TimetableOverviewDto } from "../types";



export function TimetableDashboard() {
    const navigate = useNavigate();
    const { selectScope } = useSelectTimetableScope();
    const { data: serverData, isLoading } = useGetTimetableOverview();
    const [isSelectionDialogOpen, setIsSelectionDialogOpen] = useState(false);

    const data = serverData || [];

    // Derived KPIs
    const totalClasses = data.length;
    const publishedCount = data.filter(d => d.scheduleStatus === "PUBLISHED").length;
    const draftCount = data.filter(d => d.scheduleStatus === "DRAFT").length;
    const missingCount = data.filter(d => d.scheduleStatus === "MISSING").length;

    const handleEditSchedule = (row: TimetableOverviewDto) => {
        // Here we hook into the Redux store seamlessly
        // We simulate having the detailed Class/Section objects or bypass to editor
        selectScope(row.classId, row.sectionId, row.className, row.sectionName);
        navigate(`/dashboard/admin/timetable/editor/${row.classId}/${row.sectionId}`);
    };

    const handleViewReader = (row: TimetableOverviewDto) => {
        selectScope(row.classId, row.sectionId, row.className, row.sectionName);
        navigate(`/dashboard/admin/timetable/reader/${row.classId}/${row.sectionId}`);
    };

    const getStatusBadge = (status: TimetableOverviewDto['scheduleStatus']) => {
        switch (status) {
            case "PUBLISHED":
                return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-emerald-500/20 border flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Published</Badge>;
            case "DRAFT":
                return <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/5 shadow-none flex items-center gap-1"><Clock className="w-3 h-3"/> Draft</Badge>;
            case "MISSING":
                return <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 shadow-none border-destructive/20 border flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Missing</Badge>;
        }
    };

    const formatDate = (isoString: string | null | undefined) => {
        if (!isoString) return "-";
        const d = new Date(isoString);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
    };

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 pb-8">
            {/* Header & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Timetable Command Center</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Monitor and manage class schedules across the entire institution.
                    </p>
                </div>
                {/* Action button toggles the generic scope selector dialog */}
                <Button onClick={() => setIsSelectionDialogOpen(true)} className="shadow-md group">
                    <Plus className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90" />
                    New Schedule
                </Button>
            </div>

            {/* KPI Ribbon */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Total Sections</p>
                                <p className="text-3xl font-bold">{totalClasses}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <CalendarDays className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Published</p>
                                <p className="text-3xl font-bold">{publishedCount}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Drafts</p>
                                <p className="text-3xl font-bold">{draftCount}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Missing Schedules</p>
                                <p className="text-3xl font-bold">{missingCount}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Class Matrix */}
            <Card className="shadow-sm border-border">
                <CardHeader>
                    <CardTitle className="text-xl">Class Matrix Overview</CardTitle>
                    <CardDescription>Real-time status of all integrated section timetables.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Section</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-center">Scheduled Periods</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                                            <TableCell className="text-center"><Skeleton className="h-4 w-[40px] mx-auto" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                            No timetables found in the system.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((row) => (
                                        <TableRow key={`${row.classId}-${row.sectionId}`} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium">{row.className}</TableCell>
                                            <TableCell>
                                                <div className="w-8 h-8 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                                                    {row.sectionName}
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(row.scheduleStatus)}</TableCell>
                                            <TableCell className="text-center text-muted-foreground">
                                                {row.totalPeriods} / 35
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {formatDate(row.lastUpdatedAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-[160px]">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleEditSchedule(row)} className="cursor-pointer">
                                                            <Edit2 className="mr-2 h-4 w-4 text-primary" />
                                                            Open Editor
                                                        </DropdownMenuItem>
                                                        {row.scheduleStatus !== "MISSING" && (
                                                            <DropdownMenuItem onClick={() => handleViewReader(row)} className="cursor-pointer">
                                                                <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                View Reader
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <SelectionDialog 
                open={isSelectionDialogOpen} 
                onOpenChange={setIsSelectionDialogOpen} 
            />
        </div>
    );
}
