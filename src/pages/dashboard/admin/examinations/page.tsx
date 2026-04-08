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
import {
  useGetAllGradeSystems,
  useGetAllQuestions,
  useGetAllPastPapers,
} from "@/features/examination/hooks/useExaminationQueries";
import type {
  ExamResponseDTO,
  ExamScheduleResponseDTO,
} from "@/services/types/examination";

type ActiveTab = "dashboard" | "exams" | "templates" | "grades" | "questions" | "papers" | "invigilation" | "seating" | "evaluation";

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
    id: "grades",
    label: "Grade Systems",
    icon: Award,
  },
  {
    id: "questions",
    label: "Question Bank",
    icon: HelpCircle,
  },
  {
    id: "papers",
    label: "Past Papers",
    icon: BookOpen,
  },
  {
    id: "invigilation",
    label: "Invigilation",
    icon: Shield,
  },
  {
    id: "seating",
    label: "Seating Plan",
    icon: Armchair,
  },
  {
    id: "evaluation",
    label: "Evaluation",
    icon: FileCheck,
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
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-8">
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

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/40 w-fit overflow-x-auto print:hidden"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? "bg-background text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${isActive ? "text-primary" : ""}`}
              />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Tab Content */}
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
    </div>
  );
}
