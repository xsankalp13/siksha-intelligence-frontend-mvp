import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  Clock,
  User,
  DoorOpen,
  FileText,
  Download,
  ExternalLink,
  ClipboardCheck,
  BookMarked,
  ScrollText,
} from 'lucide-react';
import { useScheduleLectureLog } from '../queries';

interface SlotInfo {
  scheduleUuid: string | null;
  subject: string;
  teacher: string;
  room: string;
  startTime: string;
  endTime: string;
  date: Date;
  isBreak?: boolean;
}

interface LectureLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: SlotInfo | null;
}

function getFileName(url: string): string {
  try {
    const decoded = decodeURIComponent(url);
    // Extract after last slash, strip query params
    const part = decoded.split('/').pop()?.split('?')[0] ?? url;
    // Remove cloudinary suffix patterns like v1234567890_ prefix
    return part.replace(/^v?\d+_/, '').replace(/_/g, ' ');
  } catch {
    return url;
  }
}

function getFileIcon(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.pdf')) return '📄';
  if (lower.includes('.doc') || lower.includes('.docx')) return '📝';
  if (lower.includes('.ppt') || lower.includes('.pptx')) return '📊';
  if (lower.includes('.xls') || lower.includes('.xlsx')) return '📈';
  if (lower.includes('.zip') || lower.includes('.rar')) return '🗜️';
  if (lower.match(/\.(png|jpg|jpeg|gif|webp|svg)/)) return '🖼️';
  return '📎';
}

function LogSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function LectureLogSheet({ open, onOpenChange, slot }: LectureLogSheetProps) {
  const { data: log, isLoading } = useScheduleLectureLog(
    open && slot?.scheduleUuid ? slot.scheduleUuid : null
  );

  if (!slot) return null;

  const isBreak = slot.isBreak;
  const timeStr = `${slot.startTime} – ${slot.endTime}`;
  const dateStr = format(slot.date, 'EEEE, MMM d, yyyy');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <SheetTitle className="text-xl font-bold leading-tight">{slot.subject}</SheetTitle>
          </div>
          <SheetDescription asChild>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{timeStr}</span>
                <span className="text-border">•</span>
                <span>{dateStr}</span>
              </div>
              <div className="flex flex-wrap gap-3 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {slot.teacher}
                </span>
                <span className="flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5" />
                  {slot.room}
                </span>
              </div>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="py-5 space-y-6">
          {/* Break slot — no log expected */}
          {isBreak ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <span className="text-4xl mb-3">☕</span>
              <p className="font-medium">Break Time</p>
              <p className="text-sm">No lecture log for break slots.</p>
            </div>
          ) : isLoading ? (
            <LogSkeleton />
          ) : !log ? (
            /* No log yet */
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ScrollText className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="font-semibold text-foreground mb-1">Lecture Not Yet Logged</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                The teacher hasn't added notes for this session yet. Check back later.
              </p>
            </div>
          ) : (
            /* Log found */
            <div className="space-y-6">
              {/* Title + test badge */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <h3 className="text-base font-bold text-foreground leading-snug">{log.title}</h3>
                  </div>
                  {log.hasTakenTest && (
                    <Badge className="shrink-0 gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                      <ClipboardCheck className="w-3 h-3" />
                      Test Taken
                    </Badge>
                  )}
                </div>
              </div>

              {/* Description */}
              {log.description && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Lecture Notes
                  </p>
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {log.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Documents */}
              {log.documentUrls && log.documentUrls.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Attachments ({log.documentUrls.length})
                  </p>
                  <div className="space-y-2">
                    {log.documentUrls.map((url, idx) => {
                      const fileName = getFileName(url);
                      const fileIcon = getFileIcon(url);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all group"
                        >
                          <span className="text-xl shrink-0">{fileIcon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
                            <p className="text-xs text-muted-foreground">Document</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity"
                              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = fileName;
                                a.target = '_blank';
                                a.rel = 'noopener';
                                a.click();
                              }}
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground border-t border-border/40 pt-4">
                Last updated {format(new Date(log.updatedAt), 'MMM d, yyyy \'at\' h:mm a')}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
