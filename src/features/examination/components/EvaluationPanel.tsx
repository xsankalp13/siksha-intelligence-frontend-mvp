import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, FileCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetEvaluationStructure } from "../hooks/useExaminationQueries";

interface EvaluationPanelProps {
  scheduleId: number;
  onBack?: () => void;
  // studentId would be passed here typically
}

export default function EvaluationPanel({ scheduleId, onBack }: EvaluationPanelProps) {
  const { data: structure, isLoading, isError } = useGetEvaluationStructure(scheduleId);
  const [marks, setMarks] = useState<Record<string, string>>({}); // sectionIndex-questionNo: mark
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive template summary dynamically 
  const summary = useMemo(() => {
    if (!structure?.sections) return { totalQuestions: 0, totalMarks: 0, currentMarks: 0 };
    
    let totalQ = 0;
    let totalM = 0;
    let currentM = 0;

    structure.sections.forEach((section, sIdx) => {
      section.questions.forEach((q) => {
        totalQ++;
        totalM += q.maxMarks;
        const entered = parseFloat(marks[`${sIdx}-${q.qNo}`]);
        if (!isNaN(entered)) {
          currentM += entered;
        }
      });
    });

    return { totalQuestions: totalQ, totalMarks: totalM, currentMarks: currentM };
  }, [structure, marks]);

  const handleMarkChange = (sIdx: number, qNo: number, maxMarks: number, value: string) => {
    // Basic validation
    let val = value;
    if (val !== "") {
      const num = parseFloat(val);
      if (num < 0) val = "0";
      if (num > maxMarks) val = maxMarks.toString();
    }
    setMarks({ ...marks, [`${sIdx}-${qNo}`]: val });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // TODO: Send marks to backend
    // Typically: api.post(/auth/examination/marks/...)
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulating API call
    console.log("Submitted marks:", marks);
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading evaluation structure...</p>
      </div>
    );
  }

  if (isError || !structure || !structure.sections || structure.sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[250px] rounded-2xl border-2 border-dashed border-border/60 gap-3 text-center bg-card">
        <div className="p-4 rounded-full bg-destructive/10">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <p className="font-semibold text-foreground">No Evaluation Structure Found</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          It looks like the exam schedule does not have a template snapshot, or the template has no sections.
        </p>
        {onBack && (
          <Button variant="outline" className="mt-2" onClick={onBack}>
            Go Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Sticky Summary */}
      <div className="sticky top-0 z-10 p-4 rounded-xl border border-border/60 bg-card/95 backdrop-blur shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <FileCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold">Digital Evaluation </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Please enter marks for each question
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
             <span className="text-xs text-muted-foreground">Total Score</span>
             <span className="text-lg font-bold">
               <span className="text-primary">{summary.currentMarks}</span> 
               <span className="text-muted-foreground text-sm font-normal"> / {summary.totalMarks}</span>
             </span>
           </div>
           {onBack && <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>}
           <Button size="sm" className="gap-1.5" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
             Submit Marks
           </Button>
        </div>
      </div>

      {/* Sections Grid */}
      <div className="space-y-8 pb-10">
        {structure.sections.map((section, sIdx) => (
          <motion.div 
            key={`${sIdx}-${section.name}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sIdx * 0.1 }}
            className="rounded-xl border border-border/50 bg-card overflow-hidden"
          >
            <div className="bg-muted/40 p-3 px-4 border-b border-border/50 flex justify-between items-center">
               <h4 className="font-semibold text-foreground flex items-center gap-2">
                 <span className="bg-primary/10 text-primary w-6 h-6 rounded-md flex items-center justify-center text-xs">
                   {String.fromCharCode(65 + sIdx)}
                 </span>
                 Section {section.name}
               </h4>
               <span className="text-xs font-medium bg-background px-2 py-1 rounded-md border border-border/50">
                 {section.questions.length} questions
               </span>
            </div>

            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-5">
              {section.questions.map((q) => {
                const markKey = `${sIdx}-${q.qNo}`;
                const val = marks[markKey] || "";
                
                return (
                  <div key={q.qNo} className="flex flex-col gap-1.5 relative group">
                    <label className="text-xs font-medium text-muted-foreground flex justify-between">
                      <span>Q{q.qNo}</span>
                      <span className="opacity-60">/{q.maxMarks}</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={q.maxMarks}
                        step={0.5}
                        placeholder="-"
                        className="h-10 text-center font-medium bg-muted/20 focus:bg-background transition-colors placeholder:text-muted-foreground/40"
                        value={val}
                        onChange={(e) => handleMarkChange(sIdx, q.qNo, q.maxMarks, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
