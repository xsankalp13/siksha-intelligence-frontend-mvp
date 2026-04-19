import { Bell, Search, CheckCircle2, AlertCircle, Info, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const notifications = [
    { id: 1, title: "Upcoming Parent-Teacher Meeting", desc: "PTM is scheduled for this Saturday at 10 AM. Please book your slot via the portal.", type: "EVENT", read: false, time: "2 hours ago" },
    { id: 2, title: "Quarter 1 Fees Overdue", desc: "Your Q1 tuition fees are past the due date. Please clear them to avoid late penalties.", type: "ALERT", read: false, time: "1 day ago" },
    { id: 3, title: "New Assignment Posted: Mathematics", desc: "Mr. Gupta has posted 'Algebra Worksheets'. Due this Friday.", type: "ACADEMIC", read: true, time: "2 days ago" },
    { id: 4, title: "School App Update", desc: "Welcome to the new Siksha Intelligence dashboard! We have updated the UI for better accessibility.", type: "SYSTEM", read: true, time: "1 week ago" },
  ];

  const getIcon = (type: string) => {
    switch(type) {
      case "EVENT": return <Calendar className="w-5 h-5 text-blue-500" />;
      case "ALERT": return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case "ACADEMIC": return <Info className="w-5 h-5 text-emerald-500" />;
      case "SYSTEM": return <Bell className="w-5 h-5 text-muted-foreground" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">Stay updated with the latest alerts and school announcements.</p>
        </div>
        <Button variant="outline"><CheckCircle2 className="w-4 h-4 mr-2" /> Mark All as Read</Button>
      </div>

      <div className="flex gap-4 items-center border-b pb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 bg-muted/30" placeholder="Search notifications..." />
        </div>
      </div>

      <div className="space-y-4">
        {notifications.map((notif) => (
          <Card key={notif.id} className={cn("p-0 overflow-hidden transition-colors hover:bg-muted/10", !notif.read && "border-primary/30 ring-1 ring-primary/20 bg-primary/5 hover:bg-primary/10")}>
            <div className="p-4 sm:p-6 flex items-start gap-4">
              <div className={cn("p-3 rounded-full shrink-0", !notif.read ? "bg-background shadow-sm" : "bg-muted/50")}>
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className={cn("font-semibold text-lg", !notif.read ? "text-foreground" : "text-foreground/80")}>
                    {notif.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-normal shrink-0">{notif.type}</Badge>
                    <span className="text-xs text-muted-foreground shrink-0">{notif.time}</span>
                  </div>
                </div>
                <p className={cn("text-sm", !notif.read ? "text-foreground/90 font-medium" : "text-muted-foreground")}>
                  {notif.desc}
                </p>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2"></div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
