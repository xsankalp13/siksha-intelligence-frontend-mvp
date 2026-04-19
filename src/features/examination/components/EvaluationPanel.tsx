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
        
        if (q.type === "INTERNAL_CHOICE" && q.options) {
          let maxOptMark = 0;
          q.options.forEach(opt => {
            const val = parseFloat(marks[`${sIdx}-${q.qNo}-${opt}`]);
            if (!isNaN(val) && val > maxOptMark) {
              maxOptMark = val;
            }
          });
          currentM += maxOptMark;
        } else {
          const val = parseFloat(marks[`${sIdx}-${q.qNo}`]);
          if (!isNaN(val)) {
            currentM += val;
          }
        }
      });
    });

    return { totalQuestions: totalQ, totalMarks: totalM, currentMarks: currentM };
  }, [structure, marks]);

  const handleMarkChange = (key: string, maxMarks: number, value: string) => {
    let val = value;
    if (val !== "") {
      const num = parseFloat(val);
      if (num < 0) val = "0";
      if (num > maxMarks) val = maxMarks.toString();
    }
    setMarks({ ...marks, [key]: val });
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
        {structure.sections.map((section, sIdx) => {
          const isOptional = section.sectionType === "OPTIONAL";
          return (
            <motion.div 
              key={`${sIdx}-${section.name}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sIdx * 0.1 }}
              className="rounded-xl border border-border/50 bg-card overflow-hidden"
            >
              <div className="bg-muted/40 p-3 px-4 border-b border-border/50 flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <span className="bg-primary/10 text-primary w-6 h-6 rounded-md flex items-center justify-center text-xs">
                      {String.fromCharCode(65 + sIdx)}
                    </span>
                    Section {section.name}
                    {isOptional && section.attemptQuestions && (
                      <span className="text-[10px] font-normal text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/50 shadow-sm ml-2">
                        Attempt any {section.attemptQuestions} out of {section.totalQuestions || section.questions.length}
                      </span>
                    )}
                  </h4>
                  {section.helperText && (
                    <p className="text-[10px] text-muted-foreground mt-1 ml-9 italic">
                      {section.helperText}
                    </p>
                  )}
                </div>
                <span className="text-xs font-medium bg-background px-2 py-1 rounded-md border border-border/50 shrink-0 mt-0.5">
                  {section.questions.length} questions
                </span>
              </div>

              <div className="p-5 grid grid-cols-1 gap-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-5">
                  {section.questions.map((q) => {
                    if (q.type === "INTERNAL_CHOICE" && q.options) {
                      return (
                        <div key={q.qNo} className="col-span-full rounded-md border border-border/50 p-3 space-y-3 bg-muted/5">
                          <label className="text-xs font-semibold text-foreground flex justify-between bg-muted/30 px-2.5 py-1.5 rounded">
                            <span className="flex items-center gap-2">
                              Q{q.qNo} 
                              <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 rounded-[3px] text-[9px] uppercase tracking-wider">Attempt any ONE</span>
                            </span>
                            <span className="opacity-70">/{q.maxMarks}</span>
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pl-1">
                            {q.options.map((opt) => {
                              const key = `${sIdx}-${q.qNo}-${opt}`;
                              const val = marks[key] || "";
                              return (
                                <div key={opt} className="flex flex-col gap-1.5">
                                  <label className="text-[11px] font-medium text-muted-foreground flex justify-between items-center bg-background px-1.5 rounded-sm">
                                    <span>({opt})</span>
                                    <span className="opacity-50">/{q.maxMarks}</span>
                                  </label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={q.maxMarks}
                                    step={0.5}
                                    placeholder="-"
                                    className="h-9 text-center font-medium bg-muted/20 focus:bg-background transition-colors placeholder:text-muted-foreground/40"
                                    value={val}
                                    onChange={(e) => handleMarkChange(key, q.maxMarks, e.target.value)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // NORMAL TYPE
                    const markKey = `${sIdx}-${q.qNo}`;
                    const val = marks[markKey] || "";
                    
                    return (
                      <div key={q.qNo} className="flex flex-col gap-1.5 relative group">
                        <label className="text-xs font-medium text-muted-foreground flex justify-between">
                          <span>Q{q.qNo}</span>
                          <span className="opacity-60">/{q.maxMarks}</span>
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={q.maxMarks}
                          step={0.5}
                          placeholder="-"
                          className="h-10 text-center font-medium bg-muted/20 focus:bg-background transition-colors placeholder:text-muted-foreground/40"
                          value={val}
                          onChange={(e) => handleMarkChange(markKey, q.maxMarks, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
