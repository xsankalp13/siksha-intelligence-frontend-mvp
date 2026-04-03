import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Printer,
  Users,
  GraduationCap,
  Loader2,
  Download,
  ChevronRight,
  Palette,
  Shield,
  QrCode,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { classesService } from "@/services/classes";
import {
  idCardService,
  triggerBlobDownload,
  ID_CARD_TEMPLATES,
  type IdCardTemplate,
} from "@/services/idCard";
import { IdCardTemplatePreview } from "@/features/uis/id-card/IdCardTemplatePreview";

// ── Animation variants ───────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

// ── Main Page Component ──────────────────────────────────────────────

export default function IdCardsPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<IdCardTemplate>("classic");
  const [activeTab, setActiveTab] = useState<"students" | "staff">("students");

  // Student batch state
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");

  // Fetch classes
  const { data: classes, isLoading: loadingClasses } = useQuery({
    queryKey: ["all-classes-idcard"],
    queryFn: () => classesService.getClasses().then((r) => r.data),
  });

  const sections = useMemo(() => {
    if (!selectedClassId || !classes) return [];
    const cls = classes.find(
      (c) => c.classId === selectedClassId || (c as any).uuid === selectedClassId
    );
    return cls?.sections || [];
  }, [selectedClassId, classes]);

  // Student batch mutation
  const studentBatchMutation = useMutation({
    mutationFn: async () => {
      // Find the class and section names to construct a descriptive filename
      const cls = classes?.find((c) => c.classId === selectedClassId || (c as any).uuid === selectedClassId);
      const sec = cls?.sections?.find((s) => s.uuid === selectedSectionId || (s as any).sectionId === selectedSectionId);
      const className = cls ? cls.name.replace(/\s+/g, "-") : "Class";
      const sectionName = sec ? (sec.sectionName || (sec as any).name || "Section").replace(/\s+/g, "-") : "Section";
      const explicitFilename = `Student-IDs-${className}-${sectionName}-${selectedTemplate}.pdf`;

      const blob = await idCardService.downloadBatchStudentIdCards(selectedSectionId, selectedTemplate);
      triggerBlobDownload(blob.data, explicitFilename);
    },
    onSuccess: () => toast.success("Student ID cards generated successfully!"),
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg?.includes("not found") ? "No students found in this section" : "Failed to generate ID cards");
    },
  });

  // Staff batch mutation
  const staffBatchMutation = useMutation({
    mutationFn: async () => {
      const blob = await idCardService.downloadBatchStaffIdCards(selectedTemplate);
      triggerBlobDownload(blob.data, `staff-ids-${selectedTemplate}.pdf`);
    },
    onSuccess: () => toast.success("Staff ID cards generated successfully!"),
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to generate staff ID cards");
    },
  });

  // Set Master Template mutation
  const masterTemplateMutation = useMutation({
    mutationFn: async (template: IdCardTemplate) => {
      await idCardService.setMasterTemplate(template);
    },
    onSuccess: () => toast.success("Master template updated successfully! Students and staff will now see this default."),
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update master template"),
  });

  return (
    <motion.div
      className="space-y-8 p-6"
      initial="initial"
      animate="animate"
      variants={stagger}
    >
      {/* ── Page Header ──────────────────────────────── */}
      <motion.div variants={fadeIn} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            ID Card Management
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Generate premium ID cards for students and staff with multiple template styles
          </p>
        </div>
      </motion.div>

      {/* ── Features Strip ────────────────────────────── */}
      <motion.div variants={fadeIn} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Palette, label: "3 Templates", desc: "Classic, Modern, Minimal" },
          { icon: QrCode, label: "vCard QR Code", desc: "Rich scannable data" },
          { icon: BarChart3, label: "Barcode", desc: "Enrollment / Employee ID" },
          { icon: Shield, label: "Emergency Contact", desc: "Guardian info on back" },
        ].map((feat, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <feat.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground">{feat.label}</div>
              <div className="text-[10px] text-muted-foreground truncate">{feat.desc}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Template Selection ────────────────────────── */}
      <motion.div variants={fadeIn}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Choose Template
          </h2>
          <Button
            variant="outline"
            size="sm"
            disabled={masterTemplateMutation.isPending}
            onClick={() => masterTemplateMutation.mutate(selectedTemplate)}
            className="border-primary/20 hover:bg-primary/5 text-primary"
          >
            {masterTemplateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Save as Default Template
          </Button>
        </div>
        <div className="flex flex-wrap gap-6 justify-center md:justify-start">
          {ID_CARD_TEMPLATES.map((tmpl) => (
            <IdCardTemplatePreview
              key={tmpl.value}
              style={tmpl.value as any}
              selected={selectedTemplate === tmpl.value}
              onClick={() => setSelectedTemplate(tmpl.value)}
              label={tmpl.label}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Tab Selector ──────────────────────────────── */}
      <motion.div variants={fadeIn}>
        <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-xl w-fit">
          {[
            { key: "students" as const, icon: GraduationCap, label: "Student IDs" },
            { key: "staff" as const, icon: Users, label: "Staff IDs" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Content Area ──────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === "students" ? (
          <motion.div
            key="students"
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Batch Student ID Cards</h3>
                <p className="text-xs text-muted-foreground">Select a class and section to generate a printable A4 PDF</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Class</label>
                <select
                  className="flex h-11 w-full items-center rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedClassId}
                  onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSectionId(""); }}
                  disabled={loadingClasses}
                >
                  <option value="">Select Class...</option>
                  {classes?.map((c) => (
                    <option key={c.classId || (c as any).uuid} value={c.classId || (c as any).uuid}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Section</label>
                <select
                  className="flex h-11 w-full items-center rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  disabled={!selectedClassId}
                >
                  <option value="">Select Section...</option>
                  {sections.map((s) => (
                    <option key={s.uuid} value={s.uuid}>
                      {s.sectionName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              size="lg"
              disabled={!selectedSectionId || studentBatchMutation.isPending}
              onClick={() => studentBatchMutation.mutate()}
              className="gap-2.5 min-w-[200px] h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/25 transition-all duration-300"
            >
              {studentBatchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {studentBatchMutation.isPending ? "Generating..." : "Generate Student IDs"}
              {!studentBatchMutation.isPending && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="staff"
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Batch Staff ID Cards</h3>
                <p className="text-xs text-muted-foreground">
                  Generate ID cards for all active staff members on A4 pages
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 mb-6">
              <Printer className="h-5 w-5 text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This will generate individual ID cards for <strong>all active staff members</strong> in the system.
                Each card includes both front and back designs using the <strong>{ID_CARD_TEMPLATES.find(t => t.value === selectedTemplate)?.label}</strong> template.
              </p>
            </div>

            <Button
              size="lg"
              disabled={staffBatchMutation.isPending}
              onClick={() => staffBatchMutation.mutate()}
              className="gap-2.5 min-w-[200px] h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all duration-300"
            >
              {staffBatchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {staffBatchMutation.isPending ? "Generating..." : "Generate Staff IDs"}
              {!staffBatchMutation.isPending && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
