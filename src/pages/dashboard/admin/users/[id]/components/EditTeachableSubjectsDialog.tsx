import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookOpen, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/axios";

import { adminService } from "@/services/admin";
import type { TeacherSubjectDTO } from "@/services/types/profile";
import type { ComprehensiveUserProfileResponseDTO } from "@/services/types/profile";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface EditTeachableSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffId: string;
  profileData: ComprehensiveUserProfileResponseDTO;
  onSuccess?: () => void;
}

export function EditTeachableSubjectsDialog({
  open,
  onOpenChange,
  staffId,
  profileData,
  onSuccess,
}: EditTeachableSubjectsDialogProps) {
  const queryClient = useQueryClient();
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize selected subjects from profileData when the dialog opens
  useEffect(() => {
    if (open && profileData?.staffDetails?.teacherDetails?.teachableSubjects) {
      const initialIds = profileData.staffDetails.teacherDetails.teachableSubjects.map(s => s.uuid);
      setSelectedSubjectIds(new Set(initialIds));
      setSearchQuery("");
    }
  }, [open, profileData]);

  // Fetch all available subjects from library
  const { data: allSubjects = [], isLoading } = useQuery<TeacherSubjectDTO[]>({
    queryKey: ["subjects", "all"],
    queryFn: async () => (await api.get("/auth/subjects")).data,
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const filteredSubjects = allSubjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subjectCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSubject = (uuid: string) => {
    const newSet = new Set(selectedSubjectIds);
    if (newSet.has(uuid)) newSet.delete(uuid);
    else newSet.add(uuid);
    setSelectedSubjectIds(newSet);
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      // Re-construct the update payload keeping existing basics intact
      // We only want to update the teachableSubjectIds. The backend accepts partial updates
      // for other fields (we just send the basics along with our new subject IDs).
      const updatePayload = {
        firstName: profileData.basicProfile.firstName,
        lastName: profileData.basicProfile.lastName,
        middleName: profileData.basicProfile.middleName,
        teachableSubjectIds: Array.from(selectedSubjectIds),
      };
      
      return adminService.updateStaff(staffId, updatePayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] }); // Refetches everywhere
      queryClient.invalidateQueries({ queryKey: ["timetable"] }); // Also update editor context
      
      toast.success("Teachable subjects updated successfully.");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || "Failed to update teachable subjects.";
      toast.error(msg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="w-5 h-5 text-primary" />
            Manage Teachable Subjects
          </DialogTitle>
          <DialogDescription>
            Select the subjects this teacher is certified or competent to teach. 
            Selected subjects determine their availability in the Timetable Editor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4 min-h-[300px]">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading subject library...
            </div>
          ) : (
            <>
              <Input
                placeholder="Search subjects by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
              
              <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
                {filteredSubjects.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No subjects found matching your search.
                  </div>
                ) : (
                  filteredSubjects.map((subject) => {
                    const isSelected = selectedSubjectIds.has(subject.uuid);
                    return (
                      <div
                        key={subject.uuid}
                        onClick={() => toggleSubject(subject.uuid)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? "bg-primary/5 border-primary/40" 
                            : "bg-card border-border hover:bg-muted/50 hover:border-border/80"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                            isSelected ? "bg-primary border-primary" : "border-input bg-background"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {subject.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {subject.subjectCode}
                          </p>
                        </div>
                        
                        <Badge 
                          variant="outline" 
                          className="shrink-0 font-mono text-[10px] w-4 h-4 rounded-full p-0 flex items-center justify-center opacity-70"
                          style={{ backgroundColor: subject.color || "transparent" }}
                        />
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="text-sm text-muted-foreground pt-2 border-t mt-auto flex justify-between items-center">
                <span>Selected: <strong className="text-foreground">{selectedSubjectIds.size}</strong> subjects</span>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
