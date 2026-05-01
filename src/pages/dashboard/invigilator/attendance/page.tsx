import { useNavigate } from 'react-router-dom';
import { useInvigilatorRoomsQuery } from '@/features/examination/hooks/useExamAttendanceQueries';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, DoorOpen, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function InvigilatorRoomsPage() {
    const navigate = useNavigate();
    const { data: rooms, isLoading, isError } = useInvigilatorRoomsQuery();

    if (isError) {
        return (
            <div className="p-6">
                <div className="text-red-500 font-medium">Failed to load assigned rooms. Please try again later.</div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Invigilation Duties</h1>
                    <p className="text-muted-foreground">Select a room to mark or view exam attendance.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="h-[200px]">
                            <CardHeader>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : rooms?.length === 0 ? (
                <div className="text-center py-20 border rounded-lg bg-muted/20">
                    <DoorOpen className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-lg font-medium">No duties assigned</h3>
                    <p className="text-sm text-muted-foreground">You do not have any invigilation duties scheduled.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rooms?.map((room) => {
                        return (
                            <Card key={`${room.examScheduleId}-${room.roomId}`} className="hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                <DoorOpen className="h-5 w-5 text-primary" />
                                                {room.roomName}
                                            </CardTitle>
                                            <CardDescription className="mt-1 font-medium text-foreground">
                                                {room.className} - {room.subjectName}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center text-muted-foreground">
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {room.examDate ? (
                                                <span suppressHydrationWarning>
                                                    {(() => {
                                                        try {
                                                            return format(parseISO(String(room.examDate)), 'PPP');
                                                        } catch(e) {
                                                            return String(room.examDate);
                                                        }
                                                    })()}
                                                </span>
                                            ) : 'Date TBD'}
                                        </div>
                                        <div className="flex items-center text-muted-foreground">
                                            <Clock className="mr-2 h-4 w-4" />
                                            {room.startTime} - {room.endTime}
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={() => navigate(`/dashboard/invigilator/attendance/${room.examScheduleId}/${room.roomId}`)}
                                        className="w-full"
                                    >
                                        Manage Attendance
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
