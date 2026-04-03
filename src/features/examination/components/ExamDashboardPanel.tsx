import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  FileEdit,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  BookOpen,
  Award,
  HelpCircle,
  Send,
  AlertCircle,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetAllExams } from "../hooks/useExaminationQueries";
import type { ExamResponseDTO } from "@/services/types/examination";

/* ── colour maps ───────────────────────────────────────────────────── */

const examTypeColors: Record<string, string> = {
  MIDTERM: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  FINAL: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  UNIT_TEST: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  FORMATIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  SUMMATIVE: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const daysUntil = (d: string) => {
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/* ── stat card ─────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  sub,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
  sub?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all hover:shadow-lg hover:border-primary/20"
    >
      {/* accent glow */}
      <div
        className={`absolute -top-6 -right-6 h-24 w-24 rounded-full blur-2xl opacity-20 ${accent}`}
      />
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${accent} bg-opacity-10`}>
          <Icon className="w-5 h-5" />
        </div>
        <TrendingUp className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground">
        {value}
      </p>
      <p className="text-sm font-medium text-muted-foreground mt-0.5">
        {label}
      </p>
      {sub && (
        <p className="text-xs text-muted-foreground/70 mt-1">{sub}</p>
      )}
    </motion.div>
  );
}

/* ── main component ────────────────────────────────────────────────── */

interface Props {
  onNavigateToExams: () => void;
  onNavigateToSchedules: () => void;
  onNavigateToGrades: () => void;
  onNavigateToQuestions: () => void;
  onNavigateToPapers: () => void;
  onViewExamSchedules: (exam: ExamResponseDTO) => void;
  /** Counts from sibling tabs, passed via parent */
  questionCount?: number;
  gradeSystemCount?: number;
  pastPaperCount?: number;
}

export default function ExamDashboardPanel({
  onNavigateToExams,
  onNavigateToSchedules,
  onNavigateToGrades,
  onNavigateToQuestions,
  onNavigateToPapers,
  onViewExamSchedules,
  questionCount = 0,
  gradeSystemCount = 0,
  pastPaperCount = 0,
}: Props) {
  const { data: exams = [] } = useGetAllExams();

  const { upcoming, drafts, published, totalExams } = useMemo(() => {
    const now = new Date();
    const uc: ExamResponseDTO[] = [];
    const dr: ExamResponseDTO[] = [];
    const pub: ExamResponseDTO[] = [];

    for (const e of exams) {
      if (e.published) pub.push(e);
      else dr.push(e);
      if (new Date(e.startDate) > now) uc.push(e);
    }

    // sort upcoming by nearest first
    uc.sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    return {
      upcoming: uc,
      drafts: dr,
      published: pub,
      totalExams: exams.length,
    };
  }, [exams]);

  return (
    <div className="space-y-6">
      {/* ── Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={BarChart3}
          label="Total Exams"
          value={totalExams}
          accent="bg-primary text-primary"
          delay={0}
        />
        <StatCard
          icon={CalendarClock}
          label="Upcoming"
          value={upcoming.length}
          accent="bg-blue-500 text-blue-500"
          sub={upcoming.length > 0 ? `Next: ${formatDate(upcoming[0].startDate)}` : undefined}
          delay={0.04}
        />
        <StatCard
          icon={FileEdit}
          label="Drafts"
          value={drafts.length}
          accent="bg-amber-500 text-amber-500"
          sub="Awaiting publish"
          delay={0.08}
        />
        <StatCard
          icon={CheckCircle2}
          label="Published"
          value={published.length}
          accent="bg-emerald-500 text-emerald-500"
          delay={0.12}
        />
        <StatCard
          icon={HelpCircle}
          label="Questions"
          value={questionCount}
          accent="bg-violet-500 text-violet-500"
          delay={0.16}
        />
      </div>

      {/* ── Two-Column Layout ────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* ── Upcoming Exams ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 rounded-2xl border border-border/50 bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <CalendarClock className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Upcoming Examinations
                </h3>
                <p className="text-xs text-muted-foreground">
                  Scheduled exams in the near future
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-primary"
              onClick={onNavigateToExams}
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <Calendar className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No upcoming exams scheduled
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {upcoming.slice(0, 5).map((exam, i) => {
                const days = daysUntil(exam.startDate);
                const urgent = days <= 7;
                return (
                  <motion.div
                    key={exam.uuid}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.04 }}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => onViewExamSchedules(exam)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          urgent ? "bg-red-500 animate-pulse" : "bg-blue-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {exam.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(exam.startDate)} —{" "}
                          {formatDate(exam.endDate)} · AY:{" "}
                          {exam.academicYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={examTypeColors[exam.examType] || ""}
                      >
                        {exam.examType.replace(/_/g, " ")}
                      </Badge>
                      {urgent && (
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-600 border-red-500/20 text-xs"
                        >
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {days <= 0 ? "Today!" : `${days}d left`}
                        </Badge>
                      )}
                      {!exam.published && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground text-xs"
                        >
                          Draft
                        </Badge>
                      )}
                      {exam.published && (
                        <Badge
                          className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs"
                        >
                          Published
                        </Badge>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Draft Exams ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/50 bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <FileEdit className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Draft Exams
                </h3>
                <p className="text-xs text-muted-foreground">
                  Not yet published
                </p>
              </div>
            </div>
          </div>

          {drafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-500/40" />
              <p className="text-sm text-muted-foreground">All exams published</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {drafts.slice(0, 6).map((exam, i) => (
                <motion.div
                  key={exam.uuid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 + i * 0.04 }}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {exam.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {exam.examType.replace(/_/g, " ")} ·{" "}
                      {exam.academicYear}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => onViewExamSchedules(exam)}
                  >
                    <Send className="w-3 h-3" />
                    Manage
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Published Exams ──────────────────────────────────────── */}
      {published.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="rounded-2xl border border-border/50 bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">
                  Published Exams
                </h3>
                <p className="text-xs text-muted-foreground">
                  {published.length} exam{published.length !== 1 ? "s" : ""} live
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-primary"
              onClick={onNavigateToExams}
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="divide-y divide-border/30">
            {published.slice(0, 8).map((exam, i) => (
              <motion.div
                key={exam.uuid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28 + i * 0.04 }}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors group cursor-pointer"
                onClick={() => onViewExamSchedules(exam)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0 bg-emerald-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {exam.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(exam.startDate)} — {formatDate(exam.endDate)} · AY: {exam.academicYear}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={examTypeColors[exam.examType] || ""}
                  >
                    {exam.examType.replace(/_/g, " ")}
                  </Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Published
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Quick Access Cards ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
      >
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Quick Access
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Calendar,
              label: "Exams & Schedules",
              desc: "Manage exams, schedules, and enter marks",
              accent: "bg-blue-500/10 text-blue-600",
              onClick: onNavigateToSchedules,
            },
            {
              icon: Award,
              label: "Grade Systems",
              desc: `${gradeSystemCount} grading system${gradeSystemCount !== 1 ? "s" : ""} configured`,
              accent: "bg-emerald-500/10 text-emerald-600",
              onClick: onNavigateToGrades,
            },
            {
              icon: HelpCircle,
              label: "Question Bank",
              desc: `${questionCount} question${questionCount !== 1 ? "s" : ""} in the bank`,
              accent: "bg-violet-500/10 text-violet-600",
              onClick: onNavigateToQuestions,
            },
            {
              icon: BookOpen,
              label: "Past Papers",
              desc: `${pastPaperCount} past paper${pastPaperCount !== 1 ? "s" : ""} uploaded`,
              accent: "bg-rose-500/10 text-rose-600",
              onClick: onNavigateToPapers,
            },
          ].map((card, i) => (
            <motion.button
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 + i * 0.04 }}
              onClick={card.onClick}
              className="group text-left rounded-2xl border border-border/50 bg-card p-5 hover:border-primary/25 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${card.accent}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="font-semibold text-foreground text-sm">
                {card.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {card.desc}
              </p>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
