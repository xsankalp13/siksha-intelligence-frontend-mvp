import { useState } from "react";
import { motion } from "framer-motion";
import { 
  FileCheck, 
  Download, 
  CalendarDays, 
  MapPin, 
  Clock, 
  GraduationCap,
  Loader2,
  AlertCircle,
  BookOpen
} from "lucide-react";

import { useGetAllExams, useGetStudentAdmitCard } from "@/features/examination/hooks/useExaminationQueries";
import { examinationService } from "@/services/examination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import type { AdmitCardResponseDTO } from "@/services/types/examination";

// ── Sub-component: single admit card viewer ───────────────────────
function AdmitCardViewer({ examUuid }: { examUuid: string }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { data: admitCard, isLoading, isError } = useGetStudentAdmitCard(examUuid);
  
  if (isLoading) return null; // silently skip while loading
  if (isError || !admitCard) return null; // no card for this exam — skip

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      const response = await examinationService.downloadStudentAdmitCardPdf(examUuid);
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `AdmitCard_${admitCard.examName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Admit card PDF downloaded successfully.");
    } catch (err: any) {
      toast.error("Failed to download admit card PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-border shadow-md overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-bl-[100%] -z-10 pointer-events-none" />
        
        <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <Badge variant="outline" className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Official Document
              </Badge>
              <CardTitle className="text-xl text-foreground">
                {admitCard.examName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1.5">
                <GraduationCap className="w-4 h-4" />
                {admitCard.studentName} {admitCard.enrollmentNumber ? `• ${admitCard.enrollmentNumber}` : ''}
              </CardDescription>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 shadow-none border-0">
              Available
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h3 className="font-semibold tracking-tight text-sm text-muted-foreground uppercase pb-2 border-b border-border/40">
              Examination Schedule & Seating
            </h3>
            
            {admitCard.entries.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm border rounded-lg border-dashed">
                No scheduled subjects found on this admit card.
              </div>
            ) : (
              <div className="grid gap-3">
                {admitCard.entries.map((entry, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-border/40 bg-background/50 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{entry.subjectName}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {new Date(entry.examDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {entry.startTime.substring(0, 5)} - {entry.endTime.substring(0, 5)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 md:mt-0 flex items-center gap-2 text-sm">
                      <div className="px-2.5 py-1 rounded bg-muted flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">{entry.roomName || `Room ${entry.roomId}`}</span>
                      </div>
                      <div className="px-2.5 py-1 rounded bg-primary/10 text-primary font-medium text-sm">
                        Seat: {entry.seatLabel || `#${entry.seatId}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="bg-muted/10 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between p-4 gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Generated at {new Date(admitCard.generatedAt).toLocaleString()}
          </p>
          <Button 
            onClick={handleDownloadPdf}
            disabled={isDownloading || !admitCard.pdfUrl}
            className="w-full sm:w-auto shadow-sm gap-2"
          >
            {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isDownloading ? "Downloading..." : "Download PDF"}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────
export default function StudentAdmitCardsPage() {
  const { data: exams, isLoading: isLoadingExams } = useGetAllExams();

  // Show published exams — student will see all their admit cards
  const publishedExams = exams?.filter(e => e.published) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4 pb-12 animate-in fade-in duration-500 px-4 md:px-0">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-sky-500/10">
              <FileCheck className="w-6 h-6 text-sky-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              My Admit Cards
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-[3.25rem]">
            Your examination admit cards are shown below. Download the PDF for each exam.
          </p>
        </div>
      </div>

      {isLoadingExams ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
          <p>Loading your admit cards...</p>
        </div>
      ) : publishedExams.length === 0 ? (
        <Alert className="border-amber-500/30 bg-amber-500/5 py-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
          <AlertTitle className="text-lg font-semibold text-foreground">No Admit Cards Available</AlertTitle>
          <AlertDescription className="text-muted-foreground mt-2 max-w-sm">
            There are no examination admit cards issued for you at this time. Please check back later.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {publishedExams.map(exam => (
            <AdmitCardViewer key={exam.uuid} examUuid={exam.uuid} />
          ))}
        </div>
      )}
    </div>
  );
}
