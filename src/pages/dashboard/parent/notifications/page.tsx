import { Bell, Search, CheckCircle2, AlertCircle, Info, Calendar, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/features/parent/queries/useNotificationQueries";
import { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const { data: serverNotifications, isLoading } = useNotifications();
  const [search, setSearch] = useState("");
  const [readIds, setReadIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("parent_read_notifications");
    if (saved) {
      const { ids, date } = JSON.parse(saved);
      // If saved date is not today, clear them (disappear next day)
      if (date !== new Date().toLocaleDateString()) {
        localStorage.removeItem("parent_read_notifications");
        return [];
      }
      return ids;
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("parent_read_notifications", JSON.stringify({
      ids: readIds,
      date: new Date().toLocaleDateString()
    }));
  }, [readIds]);

  const handleMarkAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      setReadIds([...readIds, id]);
    }
  };

  const handleMarkAllAsRead = () => {
    if (serverNotifications) {
      const allIds = serverNotifications.map((n: any) => String(n.id));
      setReadIds(allIds);
    }
  };

  const getIcon = (type: string) => {
    switch(type) {
      case "EVENT": return <Calendar className="w-5 h-5 text-blue-500" />;
      case "ALERT": return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case "ACADEMIC": return <Info className="w-5 h-5 text-emerald-500" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const filteredNotifications = serverNotifications?.filter((n: any) => 
    n.title.toLowerCase().includes(search.toLowerCase())
  ).filter((n: any) => !readIds.includes(String(n.id))) || [];

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">Stay updated with messages, assignments, and fee alerts.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleMarkAllAsRead}
          disabled={filteredNotifications.length === 0}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" /> Mark All as Read
        </Button>
      </div>

      <div className="flex gap-4 items-center border-b pb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            className="pl-9 bg-muted/30" 
            placeholder="Search notifications..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading your notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/10 rounded-xl border border-dashed">
            <Bell className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm">No new notifications for you right now.</p>
          </div>
        ) : (
          filteredNotifications.map((notif: any) => (
            <Card 
              key={notif.id} 
              onClick={() => handleMarkAsRead(String(notif.id))}
              className={cn(
                "p-0 overflow-hidden transition-all cursor-pointer group",
                "border-primary/30 ring-1 ring-primary/20 bg-primary/5 hover:bg-primary/10"
              )}
            >
              <div className="p-4 sm:p-6 flex items-start gap-4">
                <div className="p-3 rounded-full shrink-0 bg-background shadow-sm group-hover:scale-110 transition-transform">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="font-semibold text-lg text-foreground">
                      {notif.title}
                    </h3>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs font-normal shrink-0">{notif.type}</Badge>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(notif.date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/90 font-medium">
                    {notif.desc || "Click to view details"}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2"></div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
