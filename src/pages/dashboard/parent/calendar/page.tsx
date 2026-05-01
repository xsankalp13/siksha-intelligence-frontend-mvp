import { Calendar as CalendarIcon, MapPin, Clock, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CalendarPage() {
  const events = [
    { id: 1, title: "Annual Science Exhibition", type: "EVENT", date: "April 15, 2026", time: "09:00 AM - 02:00 PM", location: "Main Auditorium", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
    { id: 2, title: "Parent-Teacher Meeting (PTM)", type: "MEETING", date: "April 20, 2026", time: "10:00 AM - 12:30 PM", location: "Classroom 10A", color: "bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200" },
    { id: 3, title: "Mid-Term Examinations Begin", type: "ACADEMIC", date: "May 05, 2026", time: "08:30 AM", location: "Examination Hall", color: "bg-rose-500/10 text-rose-600 border-rose-200" },
    { id: 4, title: "Summer Break Starts", type: "HOLIDAY", date: "May 25, 2026", time: "All Day", location: "School Wide", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            School Calendar
          </h1>
          <p className="text-muted-foreground mt-1">Upcoming events, holidays, and academic schedules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 lg:col-span-3 space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Event Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> School Events</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-fuchsia-500"></div> Meetings</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div> Academics & Exams</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Holidays</div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-8 lg:col-span-9 space-y-4">
          {events.map((evt) => (
            <Card key={evt.id} className="p-0 overflow-hidden flex flex-col sm:flex-row shadow-sm hover:shadow-md transition-shadow group">
              <div className="bg-muted p-4 sm:w-40 flex flex-col justify-center items-center text-center border-b sm:border-b-0 sm:border-r">
                <span className="text-sm font-bold text-muted-foreground uppercase">{evt.date.split(' ')[0]}</span>
                <span className="text-3xl font-black text-foreground">{evt.date.split(' ')[1].replace(',', '')}</span>
                <span className="text-xs font-medium text-muted-foreground mt-1">{evt.date.split(' ')[2]}</span>
              </div>
              <div className="p-5 flex-1 relative">
                <Badge variant="outline" className={`mb-2 ${evt.color}`}>{evt.type}</Badge>
                <h3 className="text-xl font-bold text-foreground mb-3">{evt.title}</h3>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {evt.time}</div>
                  <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {evt.location}</div>
                </div>
                
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-muted-foreground hover:text-primary"><Info className="w-5 h-5" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
