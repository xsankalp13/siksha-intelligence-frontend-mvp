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
import AdmitCardPanel from "@/features/examination/components/AdmitCardPanel";
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
type AdmitCardSubTab = "management" | "batch";

// Sub-view management for drill-down navigation
type SubView =
  | { kind: "list" }
  | { kind: "schedules"; exam: ExamResponseDTO }
  | {
      kind: "marks";
      exam: ExamResponseDTO;
      schedule: ExamScheduleResponseDTO;
    };

const tabs: {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "exams",
    label: "Exams & Schedules",
    icon: Calendar,
  },
  {
    id: "templates",
    label: "Exam Templates",
    icon: FileText,
  },
  {
    id: "seating",
    label: "Seating Plan",
    icon: Armchair,
  },
  {
    id: "invigilation",
    label: "Invigilation",
    icon: Shield,
  },
  {
    id: "admitCards",
    label: "Admit Cards",
    icon: FileText,
  },
  {
    id: "evaluation",
    label: "Evaluation",
    icon: FileCheck,
  },
  {
    id: "results",
    label: "Results",
    icon: Award,
  },
  {
    id: "papers",
    label: "Past Papers",
    icon: BookOpen,
  },
  {
    id: "questions",
    label: "Question Bank",
    icon: HelpCircle,
  },
  {
    id: "grades",
    label: "Grade Systems",
    icon: Award,
  },
];

export default function ExaminationsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [subView, setSubView] = useState<SubView>({ kind: "list" });
  const [admitCardSubTab, setAdmitCardSubTab] = useState<AdmitCardSubTab>("batch");

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
          className="flex flex-row md:flex-col gap-1 w-full md:w-64 shrink-0 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r border-border/40 pb-4 md:pb-0 md:pr-4 print:hidden scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full shrink-0 text-left ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
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
