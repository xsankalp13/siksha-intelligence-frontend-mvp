import { useExamControllerStore } from '@/features/examination/stores/examControllerStore';
import { useControllerClassViewQuery, useDefaulterDecisionMutation } from '@/features/examination/hooks/useExamControllerQueries';
import { useGetAllExams } from '@/features/examination/hooks/useExaminationQueries';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ExamControllerClassPage() {
  const { selectedExamId, setSelectedExamId } = useExamControllerStore();
  const { data: allExams } = useGetAllExams();
  
  // No polling for class view (Tweak #1/3)
  const { data: classViewData, isLoading, isError, refetch } = useControllerClassViewQuery(selectedExamId);
  const defaulterMutation = useDefaulterDecisionMutation();

  const handleToggleEntry = (studentId: number, scheduleId: number, allowed: boolean) => {
    defaulterMutation.mutate({
      examId: selectedExamId!,
      roomId: -1, // Doesn't matter for this view update
      examScheduleId: scheduleId,
      studentId,
      allowed,
      reason: 'Controller class view override'
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class View</h1>
          <p className="text-muted-foreground">Manage student exam entry permissions grouped by class.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            value={selectedExamId?.toString() || ''}
            onValueChange={(val) => setSelectedExamId(Number(val))}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select Exam" />
            </SelectTrigger>
            <SelectContent>
              {allExams?.map((exam) => (
                <SelectItem key={exam.id} value={exam.id.toString()}>
                  {exam.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : isError ? (
        <div className="text-center py-20 border rounded-lg bg-red-50/50">
          <AlertCircle className="mx-auto h-10 w-10 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-800">Failed to load class view</h3>
          <p className="text-red-600 mb-4">Please check your permissions or network connection.</p>
        </div>
      ) : !classViewData?.classes.length ? (
        <div className="text-center py-20 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">No students allocated for this exam yet.</p>
        </div>
      ) : (
        <Accordion type="multiple" className="w-full space-y-4">
          {classViewData.classes.map((cls, idx) => (
            <AccordionItem key={idx} value={`class-${idx}`} className="border rounded-lg bg-card px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-lg">{cls.className}</span>
                  <Badge variant="secondary">{cls.students.length} Students</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">Roll No</th>
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Assignment</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Entry Allowed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cls.students.map(student => {
                        // Assuming 1 room per student per exam in this specific view for simplicity,
                        // or we show multiple rows if multiple rooms. Map over rooms:
                        return student.rooms.map((room, rIdx) => (
                          <tr key={`${student.studentId}-${rIdx}`} className="bg-background hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium">{student.rollNo}</td>
                            <td className="px-4 py-3">{student.studentName}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium">{room.subjectName}</div>
                              <div className="text-xs text-muted-foreground">{room.roomName} • {room.seatNumber}</div>
                            </td>
                            <td className="px-4 py-3">
                              {room.attendanceStatus ? (
                                <Badge variant="outline" className={
                                  room.attendanceStatus === 'PRESENT' ? 'bg-green-50 text-green-700' :
                                  room.attendanceStatus === 'ABSENT' ? 'bg-red-50 text-red-700' : ''
                                }>
                                  {room.attendanceStatus}
                                </Badge>
                              ) : <span className="text-muted-foreground text-xs">Unmarked</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Switch 
                                checked={room.entryAllowed}
                                onCheckedChange={(c) => handleToggleEntry(student.studentId, room.examScheduleId, c)}
                              />
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
