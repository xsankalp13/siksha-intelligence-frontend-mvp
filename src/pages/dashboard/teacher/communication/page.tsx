import { useState, useRef, useEffect } from "react";
import { MessageCircle, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useTeacherStudents } from "@/features/teacher/queries/useTeacherQueries";
import { useChatGuardians, useConversation, useSendMessage, useMarkAsRead } from "@/features/messaging/queries/useMessagingQueries";
import { useAppSelector } from "@/store/hooks";

export default function TeacherCommunicationPage() {
  const user = useAppSelector((state) => state.auth.user); // Current logged in teacher
  
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedGuardianId, setSelectedGuardianId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.userId ? Number(user.userId) : null;

  const { data: studentsPage, isLoading: loadingStudents } = useTeacherStudents({});
  const students = studentsPage?.content || [];

  const { data: guardians, isLoading: loadingGuardians } = useChatGuardians(selectedStudentId);
  const { data: messages, isLoading: loadingMessages } = useConversation(selectedStudentId, selectedGuardianId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: markAsRead } = useMarkAsRead();

  const selectedStudent = students.find(s => s.studentId === selectedStudentId);
  const selectedGuardian = guardians?.find((g) => g.userId === selectedGuardianId);

  // Auto-select first guardian when student is selected
  useEffect(() => {
    if (guardians && guardians.length > 0) {
      setSelectedGuardianId(guardians[0].userId);
    } else {
      setSelectedGuardianId(null);
    }
  }, [guardians]);

  useEffect(() => {
    // Mark as read when conversation is opened or new messages arrive
    if (selectedStudentId && selectedGuardianId && messages && messages.length > 0) {
      const hasUnread = messages.some(m => !m.read && m.receiverUserId === currentUserId);
      if (hasUnread) {
        markAsRead({ studentId: selectedStudentId, otherUserId: selectedGuardianId });
      }
    }
    // Scroll to bottom when messages load
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedStudentId, selectedGuardianId, currentUserId, markAsRead]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedStudentId || !selectedGuardianId) return;

    sendMessage({
      studentId: selectedStudentId,
      receiverUserId: selectedGuardianId,
      content: messageText
    }, {
      onSuccess: () => {
        setMessageText("");
      }
    });
  };

  return (
    <div className="max-w-[1600px] h-[calc(100vh-120px)] mx-auto flex flex-col md:flex-row gap-6 pb-6">
      {/* Students Sidebar */}
      <Card className="w-full md:w-80 lg:w-96 flex flex-col h-full border-r-0 md:border-r border-r-border/50 shadow-sm rounded-2xl md:rounded-r-none md:rounded-l-2xl overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" /> Students
            </h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 bg-muted/50 border-none" placeholder="Search students..." />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loadingStudents ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">No students found.</div>
          ) : (
            students.map((student) => (
              <div 
                key={student.studentId || student.uuid} 
                onClick={() => setSelectedStudentId(student.studentId!)}
                className={`p-4 border-b hover:bg-muted/30 cursor-pointer transition-colors flex items-start gap-3 ${selectedStudentId === student.studentId ? 'bg-muted/50' : ''}`}
              >
                <UserAvatar name={`${student.firstName} ${student.lastName}`} className="w-10 h-10 border border-primary/10" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className="font-semibold text-sm truncate pr-2">{student.firstName} {student.lastName}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {student.className} {student.sectionName && `- Sec ${student.sectionName}`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 hidden md:flex flex-col h-full shadow-sm rounded-none rounded-r-2xl border-l-0 overflow-hidden">
        {selectedStudentId && selectedStudent ? (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-3">
                <UserAvatar name={selectedGuardian?.name || "Guardian"} className="w-10 h-10 border border-primary/20" />
                <div>
                  <h3 className="font-bold text-foreground">{selectedGuardian?.name || "Select a Guardian"}</h3>
                  <p className="text-xs text-muted-foreground">Guardian of {selectedStudent.firstName} {selectedStudent.lastName}</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-br from-background to-muted/10">
              {loadingGuardians || loadingMessages ? (
                 <div className="text-center text-muted-foreground text-sm py-4">Loading messages...</div>
              ) : !selectedGuardianId ? (
                 <div className="text-center text-muted-foreground text-sm py-4">No guardian linked to this student.</div>
              ) : messages?.length === 0 ? (
                 <div className="text-center text-muted-foreground text-sm py-4">No messages yet. Say hi!</div>
              ) : (
                messages?.map((msg) => {
                  const isMine = msg.senderUserId === currentUserId;
                  return (
                    <div key={msg.id} className={`flex items-start gap-3 max-w-[80%] ${isMine ? 'ml-auto flex-row-reverse' : ''}`}>
                      <UserAvatar name={isMine ? "Me" : selectedGuardian?.name || "Guardian"} className={`w-8 h-8 shrink-0 ${isMine ? 'bg-primary/20 text-primary' : ''}`} />
                      <div className={`p-3 rounded-2xl text-sm ${isMine ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className={`text-[10px] mt-1 block ${isMine ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'}`}>
                          {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <form onSubmit={handleSend} className="p-4 border-t bg-background flex gap-2">
              <Input 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..." 
                className="bg-muted/30" 
                disabled={!selectedGuardianId}
              />
              <Button type="submit" disabled={!messageText.trim() || isSending || !selectedGuardianId}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col">
            <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a student to message their guardian.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
