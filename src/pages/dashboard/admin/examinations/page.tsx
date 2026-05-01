import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  LayoutDashboard,
  Calendar,
  Award,
  HelpCircle,
  BookOpen,
  Shield,
  Armchair,
  FileText,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ExamDashboardPanel from "@/features/examination/components/ExamDashboardPanel";
import ExamTemplatePanel from "@/features/examination/components/ExamTemplatePanel";
import ExamListPanel from "@/features/examination/components/ExamListPanel";
import ExamSchedulePanel from "@/features/examination/components/ExamSchedulePanel";
import GradeSystemPanel from "@/features/examination/components/GradeSystemPanel";
import MarksEntryPanel from "@/features/examination/components/MarksEntryPanel";
import QuestionBankPanel from "@/features/examination/components/QuestionBankPanel";
import PastPapersPanel from "@/features/examination/components/PastPapersPanel";
import InvigilationPanel from "@/features/examination/components/InvigilationPanel";
import SeatingPlanPanel from "@/features/examination/components/SeatingPlanPanel";
import EvaluationAssignmentsPanel from "@/features/examination/components/EvaluationAssignmentsPanel";
import ResultsApprovalPanel from "@/features/examination/components/ResultsApprovalPanel";

import AdmitCardBatchPanel from "@/features/examination/components/AdmitCardBatchPanel";
import {
  useGetAllGradeSystems,
  useGetAllQuestions,
  useGetAllPastPapers,
} from "@/features/examination/hooks/useExaminationQueries";
import type {
  ExamResponseDTO,
  ExamScheduleResponseDTO,
} from "@/services/types/examination";

type ActiveTab = "dashboard" | "exams" | "templates" | "grades" | "questions" | "papers" | "invigilation" | "seating" | "admitCards" | "evaluation" | "results";


// Sub-view management for drill-down navigation
type SubView =
  | { kind: "list" }
  | { kind: "schedules"; exam: ExamResponseDTO }
  | {
      kind: "marks";
      exam: ExamResponseDTO;
      schedule: ExamScheduleResponseDTO;
    };

const NAV_GROUPS: {
  group: string;
  items: { id: ActiveTab; label: string; icon: React.ElementType }[];
}[] = [
  {
    group: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Planning",
    items: [
      { id: "exams", label: "Exams & Schedules", icon: Calendar },
      { id: "templates", label: "Exam Templates", icon: FileText },
    ],
  },
  {
    group: "Conduct",
    items: [
      { id: "seating", label: "Seating Plan", icon: Armchair },
      { id: "invigilation", label: "Invigilation", icon: Shield },
      { id: "admitCards", label: "Admit Cards", icon: FileText },
    ],
  },
  {
    group: "Assessment",
    items: [
      { id: "evaluation", label: "Evaluation", icon: FileCheck },
      { id: "results", label: "Results", icon: Award },
      { id: "grades", label: "Grade Systems", icon: Award },
    ],
  },
  {
    group: "Resources",
    items: [
      { id: "papers", label: "Past Papers", icon: BookOpen },
      { id: "questions", label: "Question Bank", icon: HelpCircle },
    ],
  },
];

export default function ExaminationsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [subView, setSubView] = useState<SubView>({ kind: "list" });


  // Counts for the dashboard
  const { data: gradeSystems = [] } = useGetAllGradeSystems();
  const { data: questions = [] } = useGetAllQuestions();
  const { data: pastPapers = [] } = useGetAllPastPapers();

  const handleViewSchedules = (exam: ExamResponseDTO) => {
    setActiveTab("exams");
    setSubView({ kind: "schedules", exam });
  };

  const handleEnterMarks = (
    exam: ExamResponseDTO,
    schedule: ExamScheduleResponseDTO
  ) => {
    setSubView({ kind: "marks", exam, schedule });
  };

  const handleBackToList = () => setSubView({ kind: "list" });
  const handleBackToSchedules = (exam: ExamResponseDTO) =>
    setSubView({ kind: "schedules", exam });

  // Reset sub-view when switching tabs
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSubView({ kind: "list" });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-8 min-h-screen">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between print:hidden"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Examination Management
            </h1>
          </div>
          <p className="text-muted-foreground text-sm ml-11">
            Create exams, manage schedules, enter marks, and configure grading
          </p>
        </div>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-8 flex-1">
        {/* Left Sidebar Menu */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col w-full md:w-52 shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r border-border/40 pb-4 md:pb-0 print:hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.group} className="mb-1">
              <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.group}
              </p>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-4 py-1.5 text-sm w-full text-left transition-colors",
                      isActive
                        ? "text-primary font-medium bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </motion.div>

        {/* Tab Content Area */}
        <div className="flex-1 min-w-0 relative">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ExamDashboardPanel
                onNavigateToExams={() => handleTabChange("exams")}
                onNavigateToSchedules={() => handleTabChange("exams")}
                onNavigateToGrades={() => handleTabChange("grades")}
                onNavigateToQuestions={() => handleTabChange("questions")}
                onNavigateToPapers={() => handleTabChange("papers")}
                onViewExamSchedules={handleViewSchedules}
                questionCount={questions.length}
                gradeSystemCount={gradeSystems.length}
                pastPaperCount={pastPapers.length}
              />
            </motion.div>
          )}

          {activeTab === "exams" && (
            <motion.div
              key="exams"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {subView.kind === "list" && (
                <ExamListPanel onViewSchedules={handleViewSchedules} />
              )}
              {subView.kind === "schedules" && (
                <ExamSchedulePanel
                  exam={subView.exam}
                  onBack={handleBackToList}
                  onEnterMarks={(schedule) =>
                    handleEnterMarks(subView.exam, schedule)
                  }
                  onNavigateToTemplates={() => handleTabChange("templates")}
                />
              )}
              {subView.kind === "marks" && (
                <MarksEntryPanel
                  exam={subView.exam}
                  schedule={subView.schedule}
                  onBack={() => handleBackToSchedules(subView.exam)}
                />
              )}
            </motion.div>
          )}

          {activeTab === "templates" && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ExamTemplatePanel />
            </motion.div>
          )}

          {activeTab === "grades" && (
            <motion.div
              key="grades"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <GradeSystemPanel />
            </motion.div>
          )}

          {activeTab === "questions" && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <QuestionBankPanel />
            </motion.div>
          )}

          {activeTab === "papers" && (
            <motion.div
              key="papers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <PastPapersPanel />
            </motion.div>
          )}

          {activeTab === "invigilation" && (
            <motion.div
              key="invigilation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <InvigilationPanel />
            </motion.div>
          )}

          {activeTab === "seating" && (
            <motion.div
              key="seating"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SeatingPlanPanel />
            </motion.div>
          )}

          {activeTab === "admitCards" && (
            <motion.div
              key="admitCards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <AdmitCardBatchPanel />
            </motion.div>
          )}

          {activeTab === "evaluation" && (
            <motion.div
              key="evaluation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <EvaluationAssignmentsPanel />
            </motion.div>
          )}

          {activeTab === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ResultsApprovalPanel />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
