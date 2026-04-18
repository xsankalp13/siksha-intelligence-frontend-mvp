import { MessageSquare, Search, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useChildStore } from "@/features/parent/stores/useChildStore";
import { Badge } from "@/components/ui/badge";

export default function CommunicationPage() {
  const { selectedChildId } = useChildStore();

  if (!selectedChildId) {
    return <div className="p-6 text-center text-muted-foreground">Select a child to view communications.</div>;
  }

  // Mock data for communication threads
  const threads = [
    { id: 1, name: "Mr. Gupta", role: "Math Teacher", avatar: "", unread: 2, lastMessage: "Aarav has been doing great in Algebra.", time: "10:30 AM" },
    { id: 2, name: "Ms. Verma", role: "Science Teacher", avatar: "", unread: 0, lastMessage: "Please ensure the lab manual is submitted tomorrow.", time: "Yesterday" },
    { id: 3, name: "School Admin", role: "Administration", avatar: "", unread: 0, lastMessage: "The school will remain closed on Friday due to...", time: "Mon" },
  ];

  return (
    <div className="max-w-[1600px] h-[calc(100vh-120px)] mx-auto flex flex-col md:flex-row gap-6 pb-6">
      {/* Threads Sidebar */}
      <Card className="w-full md:w-80 lg:w-96 flex flex-col h-full border-r-0 md:border-r border-r-border/50 shadow-sm rounded-2xl md:rounded-r-none md:rounded-l-2xl">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Inbox
            </h2>
            <Button size="icon" variant="ghost" className="rounded-full">
              <Edit className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 bg-muted/50 border-none" placeholder="Search messages..." />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {threads.map((thread) => (
            <div key={thread.id} className="p-4 border-b hover:bg-muted/30 cursor-pointer transition-colors flex items-start gap-3">
              <UserAvatar name={thread.name} className="w-10 h-10 border border-primary/10" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h4 className="font-semibold text-sm truncate pr-2">{thread.name}</h4>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{thread.time}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{thread.role}</p>
                <p className="text-sm text-foreground/80 truncate">{thread.lastMessage}</p>
              </div>
              {thread.unread > 0 && (
                <div className="bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-2">
                  {thread.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 hidden md:flex flex-col h-full shadow-sm rounded-none rounded-r-2xl border-l-0">
        <div className="p-4 border-b flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-3">
            <UserAvatar name="Mr. Gupta" className="w-10 h-10 border border-primary/20" />
            <div>
              <h3 className="font-bold text-foreground">Mr. Gupta</h3>
              <p className="text-xs text-muted-foreground">Class Teacher • Online</p>
            </div>
          </div>
          <Button variant="outline" size="sm">Schedule Meeting</Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-br from-background to-muted/10">
          <div className="flex justify-center">
            <Badge variant="outline" className="bg-background text-muted-foreground text-xs font-normal">Today</Badge>
          </div>
          
          <div className="flex items-start gap-3 max-w-[80%]">
            <UserAvatar name="Mr. Gupta" className="w-8 h-8 shrink-0" />
            <div className="bg-muted text-foreground p-3 rounded-2xl rounded-tl-sm text-sm">
              <p>Hello! Just wanted to share that Aarav has been doing great in Algebra this week. He scored the highest in the surprise quiz.</p>
              <span className="text-[10px] text-muted-foreground mt-1 block">10:28 AM</span>
            </div>
          </div>
          
          <div className="flex items-start gap-3 max-w-[80%] ml-auto flex-row-reverse">
            <UserAvatar name="Parent" className="w-8 h-8 shrink-0 bg-primary/20 text-primary" />
            <div className="bg-primary text-primary-foreground p-3 rounded-2xl rounded-tr-sm text-sm">
              <p>That is wonderful news, Mr. Gupta! Thank you for letting me know. We will make sure he keeps practicing at home.</p>
              <span className="text-[10px] text-primary-foreground/70 mt-1 block text-right">10:30 AM</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input placeholder="Type a message..." className="bg-muted/30" />
            <Button>Send</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
