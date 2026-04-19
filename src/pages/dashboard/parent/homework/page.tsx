import { useState } from "react";
import { FileText, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useChildHomework } from "@/features/parent/queries/useParentQueries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useChildStore } from "@/features/parent/stores/useChildStore";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function HomeworkPage() {
  const { selectedChildId } = useChildStore();
  const { data: homework, isLoading, isError } = useChildHomework();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'SUBMITTED'>('ALL');

  if (!selectedChildId) {
    return <div className="p-6 text-center text-muted-foreground">Please select a child to view homework assignments.</div>;
  }

  if (isLoading) {
    return <div className="p-6 animate-pulse space-y-6">
      <div className="h-40 bg-muted rounded-2xl w-full" />
      <div className="h-64 bg-muted rounded-2xl w-full" />
    </div>;
  }

  if (isError || !homework) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl bg-rose-500/5 border-rose-500/20">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold">Failed to load homework</h3>
      </div>
    );
  }

  const assignments = homework.assignments;

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Homework & Tasks
          </h1>
          <p className="text-muted-foreground mt-1">Monitor pending assignments and submission status.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 flex items-center gap-4 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="p-4 bg-primary/20 rounded-full">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{homework.totalPending + homework.totalSubmitted}</p>
            <p className="text-sm text-muted-foreground">Total Assigned</p>
          </div>
        </Card>
        
        <Card className="p-6 flex items-center gap-4 border-amber-500/20 bg-amber-500/5">
          <div className="p-4 bg-amber-500/20 rounded-full">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{homework.totalPending}</p>
            <p className="text-sm font-medium text-amber-600">Pending</p>
          </div>
        </Card>

        <Card className="p-6 flex items-center gap-4 border-emerald-500/20 bg-emerald-500/5">
          <div className="p-4 bg-emerald-500/20 rounded-full">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{homework.totalSubmitted}</p>
            <p className="text-sm font-medium text-emerald-600">Submitted</p>
          </div>
        </Card>
      </div>

      <div className="flex gap-2 border-b pb-4">
        <Button variant={filter === 'ALL' ? 'default' : 'ghost'} onClick={() => setFilter('ALL')} className="rounded-full">All Tasks</Button>
        <Button variant={filter === 'PENDING' ? 'default' : 'ghost'} onClick={() => setFilter('PENDING')} className="rounded-full">Pending</Button>
        <Button variant={filter === 'SUBMITTED' ? 'default' : 'ghost'} onClick={() => setFilter('SUBMITTED')} className="rounded-full">Submitted</Button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {filteredAssignments.map((assignment, i) => {
            const isPending = assignment.status === "PENDING";
            const isOverdue = isPending && new Date(assignment.dueDate) < new Date();
            
            return (
              <motion.div
                key={assignment.assignmentId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
              >
                <Card className={cn(
                  "p-6 border-l-4 transition-all hover:shadow-md",
                  !isPending ? "border-l-emerald-500" : isOverdue ? "border-l-rose-500 bg-rose-500/5" : "border-l-amber-500"
                )}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-background">{assignment.subject}</Badge>
                        {!assignment.seenByParent && isPending && (
                          <Badge variant="default" className="bg-primary text-primary-foreground">New</Badge>
                        )}
                        {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                      </div>
                      
                      <h3 className="text-xl font-bold">{assignment.title}</h3>
                      <p className="text-muted-foreground">{assignment.description}</p>
                      
                      <div className="flex items-center gap-4 text-sm font-medium mt-4">
                        <div className="flex items-center gap-1.5 opacity-80">
                          <Calendar className="h-4 w-4" />
                          <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-80">
                          <FileText className="h-4 w-4" />
                          <span>Given by: {assignment.teacherName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 min-w-[140px]">
                      {isPending ? (
                        <>
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 px-3 py-1 text-sm">
                            <Clock className="w-4 h-4 mr-1.5" /> Pending
                          </Badge>
                          {!assignment.seenByParent && (
                            <Button size="sm" variant="outline" className="w-full">Mark as Seen</Button>
                          )}
                        </>
                      ) : (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-3 py-1 text-sm">
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Submitted
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {filteredAssignments.length === 0 && (
          <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm">You've filtered down to nothing!</p>
          </div>
        )}
      </div>
    </div>
  );
}
