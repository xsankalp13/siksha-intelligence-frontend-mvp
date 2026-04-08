import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Link as LinkIcon, FilePlus } from "lucide-react";
import { lectureLogService } from "@/services/lectureLogs";
import type { TeacherScheduleEntry } from "@/services/types/teacher";

interface LectureLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleEntry: TeacherScheduleEntry;
}

export default function LectureLogDialog({ isOpen, onClose, scheduleEntry }: LectureLogDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hasTakenTest, setHasTakenTest] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [existingDocumentUrls, setExistingDocumentUrls] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && scheduleEntry?.scheduleEntryUuid) {
      setFetching(true);
      lectureLogService.getLectureLog(scheduleEntry.scheduleEntryUuid)
        .then((data) => {
          if (data) {
            setTitle(data.title);
            setDescription(data.description || "");
            setHasTakenTest(data.hasTakenTest);
            setExistingDocumentUrls(data.documentUrls || []);
          } else {
            setTitle("");
            setDescription("");
            setHasTakenTest(false);
            setExistingDocumentUrls([]);
          }
        })
        .catch((error) => console.error("Error fetching log", error))
        .finally(() => setFetching(false));
    }
  }, [isOpen, scheduleEntry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    try {
      let finalDocUrls = [...existingDocumentUrls];

      if (files.length > 0) {
        toast.loading("Uploading documents...", { id: "upload" });
        for (const file of files) {
          const initResponse = await lectureLogService.initDocumentUpload({
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          });

          const uploadedUrl = await lectureLogService.uploadDocumentDirectly(file, initResponse);
          finalDocUrls.push(uploadedUrl);
        }
        toast.success("Documents uploaded successfully", { id: "upload" });
      }

      await lectureLogService.saveLectureLog({
        scheduleUuid: scheduleEntry.scheduleEntryUuid as string,
        title,
        description,
        documentUrls: finalDocUrls,
        hasTakenTest
      });

      toast.success("Lecture log saved successfully!");
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save lecture log", { id: "upload" });
      setLoading(false);
    }
  };

  const isClassTitle = `${scheduleEntry.subject?.subjectName || "Subject"} - ${scheduleEntry.clazz?.className} ${scheduleEntry.section?.sectionName}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Lecture Details</DialogTitle>
          <DialogDescription>
            Record what was taught during {isClassTitle}
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Lecture Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="e.g. Introduction to Algebra"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea
                id="description"
                placeholder="Brief summary of topics covered..."
                className="resize-none h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Resource / Assignment Document</Label>
              
              {existingDocumentUrls.length > 0 && (
                <div className="space-y-2 mb-2">
                  {existingDocumentUrls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-md border border-primary/20 bg-primary/5 text-sm">
                       <LinkIcon className="h-4 w-4 text-primary" />
                       <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                          View document {idx + 1}
                       </a>
                       <Button 
                         type="button" 
                         variant="ghost" 
                         size="sm" 
                         className="ml-auto h-7 px-2 text-xs hover:text-destructive text-muted-foreground" 
                         onClick={() => setExistingDocumentUrls(existingDocumentUrls.filter((_, i) => i !== idx))}
                       >
                         Remove
                       </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Input
                  id="doc_file"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
                    }
                    e.target.value = '';
                  }}
                  disabled={loading}
                  className="cursor-pointer file:cursor-pointer"
                />
                
                {files.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {files.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-md border text-sm bg-muted/20">
                         <FilePlus className="h-4 w-4 text-muted-foreground" />
                         <span className="truncate flex-1">{f.name}</span>
                         <Button 
                           type="button" 
                           variant="ghost" 
                           size="sm" 
                           className="h-7 px-2 text-xs hover:text-destructive text-muted-foreground" 
                           onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                         >
                           Remove
                         </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Accepts PDF, DOCX, PPTX (Max 5MB)</p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="hasTest" 
                checked={hasTakenTest} 
                onCheckedChange={(c) => setHasTakenTest(!!c)} 
                disabled={loading} 
              />
              <Label htmlFor="hasTest" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                A pop quiz or test was conducted during this lecture
              </Label>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Saving..." : "Save Log"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
