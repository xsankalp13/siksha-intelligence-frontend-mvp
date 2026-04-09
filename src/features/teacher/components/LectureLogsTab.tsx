import { useState } from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import WeekOverviewPanel from "@/features/teacher/components/WeekOverviewPanel";
import { useTeacherSchedule } from "@/features/teacher/queries/useTeacherQueries";
import type { TeacherScheduleEntry } from "@/services/types/teacher";
import LectureLogDialog from "./LectureLogDialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

export default function LectureLogsTab() {
  const current = new Date().toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const [day, setDay] = useState(DAYS.includes(current) ? current : "MONDAY");
  const [selectedSlot, setSelectedSlot] = useState<TeacherScheduleEntry | null>(null);

  const { data, isLoading } = useTeacherSchedule();

  const entries = (data?.entries ?? []).filter((entry) => entry.dayOfWeek === day);

  // Compute filled timeline, including free periods
  // Usually we assume an 8am to 4pm school day, but we can just list the entries ordered.
  const sortedEntries = [...entries].sort((a, b) => 
    (a.timeslot?.startTime || "").localeCompare(b.timeslot?.startTime || "")
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-4">
         <FileText className="h-5 w-5 text-primary" />
         <div>
            <h1 className="text-2xl font-bold">Lecture Logs</h1>
            <p className="text-sm text-muted-foreground">Select a teaching slot to register your lecture details and upload assignments.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">This Week</h3>
            <WeekOverviewPanel
              entries={data?.entries ?? []}
              selectedDay={day}
              onSelectDay={setDay}
            />
          </div>
        </div>

        <div className="lg:col-span-9">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">
              {day.charAt(0) + day.slice(1).toLowerCase()}&apos;s Classes
            </h3>

            {isLoading ? (
               <p className="text-muted-foreground text-sm">Loading schedule...</p>
            ) : sortedEntries.length === 0 ? (
               <div className="text-center p-10 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">No classes scheduled for {day}.</p>
                  <p className="text-xs text-muted-foreground mt-1">Enjoy your free day!</p>
               </div>
            ) : (
              <div className="space-y-3">
                {sortedEntries.map((entry) => (
                  <motion.div
                    key={entry.scheduleEntryUuid}
                    whileHover={entry.slotType === "TEACHING" ? { scale: 1.01 } : {}}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border transition-all",
                      entry.slotType === "TEACHING" 
                        ? "bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 hover:shadow-sm" 
                        : "bg-muted/30 border-dashed"
                    )}
                    onClick={() => {
                      if (entry.slotType === "TEACHING") {
                        setSelectedSlot(entry);
                      }
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {entry.timeslot?.startTime && entry.timeslot?.endTime 
                          ? `${format(new Date(`1970-01-01T${entry.timeslot.startTime}`), 'h:mm a')} - ${format(new Date(`1970-01-01T${entry.timeslot.endTime}`), 'h:mm a')}`
                          : 'Time TBD'
                        }
                      </span>
                      {entry.slotType === "TEACHING" ? (
                        <>
                           <h4 className="font-semibold text-base mt-1">{entry.subject?.subjectName || "Unknown Subject"}</h4>
                           <span className="text-sm text-muted-foreground">
                             Class: {entry.clazz?.className} {entry.section?.sectionName}
                           </span>
                        </>
                      ) : (
                        <h4 className="font-medium text-base mt-1 text-muted-foreground">Free Period / Break</h4>
                      )}
                    </div>
                    
                    {entry.slotType === "TEACHING" && (
                       <Button variant="outline" size="sm">Log details</Button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedSlot && (
        <LectureLogDialog 
           isOpen={!!selectedSlot} 
           onClose={() => setSelectedSlot(null)}
           scheduleEntry={selectedSlot}
        />
      )}
    </div>
  );
}
