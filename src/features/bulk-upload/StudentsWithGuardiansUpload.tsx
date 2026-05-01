import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Users,
  GraduationCap,
  Info,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

import type {
  BulkImportReportDTO,
  SseRowSuccessPayload,
  SseRowFailurePayload,
  SseJobCompletePayload,
  ParsedSheetData,
} from "./types";
import { parseExcelFile } from "./utils/parseExcel";
import { fetchSse } from "./utils/fetchSse";
import { submitStudentsWithGuardiansImport, buildSseUrl } from "./services/bulkUploadApi";
import { validateCsvData, validateGuardianCsvData } from "./utils/csvValidation";
import { downloadStudentsTemplate, downloadGuardiansTemplate } from "./utils/csvTemplateGuardian";
import DataPreviewTable from "./components/DataPreviewTable";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type UploadPhase = "idle" | "validating" | "ready" | "uploading" | "success" | "error";

interface RowStatus {
  kind: "pending" | "active" | "success" | "failure";
  error?: string;
  guardianUsernames?: string[];
  guardiansCreated?: number;
  guardiansLinked?: number;
}

interface SseRowEntry {
  rowNumber: number;
  identifier: string;
  status: RowStatus;
}

/** Which files the upload flow deals with */
export type BulkUploadMode = "students-with-guardians" | "students-only" | "guardians-only";

interface StudentsWithGuardiansUploadProps {
  mode?: BulkUploadMode;
  onUploadComplete?: (report: BulkImportReportDTO) => void;
}

function ErrorCell({ message, maxLength = 120 }: { message: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!message) return null;
  const needsTruncation = message.length > maxLength;
  const displayMessage = expanded || !needsTruncation ? message : message.slice(0, maxLength) + "...";

  return (
    <div className="flex flex-col items-start gap-1 w-full max-w-[350px]">
      <span className="whitespace-pre-wrap break-words">{displayMessage}</span>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] uppercase tracking-wider font-semibold text-primary hover:underline focus:outline-none"
        >
          {expanded ? "Show Less" : "Show More"}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini FileCard — a compact file selector card
// ─────────────────────────────────────────────────────────────────────────────

interface FileCardProps {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  required?: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onDownloadTemplate: () => void;
  disabled?: boolean;
  validationError?: string | null;
}

function FileCard({
  id,
  label,
  hint,
  icon,
  required = false,
  file,
  onFileChange,
  onDownloadTemplate,
  disabled = false,
  validationError,
}: FileCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const f = e.dataTransfer.files[0];
    if (f) onFileChange(f);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-foreground">
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
            {!required && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Optional
              </span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={onDownloadTemplate}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3 w-3" />
          Template
        </button>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        className={cn(
          "relative flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200",
          isDragOver
            ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
            : file
            ? validationError
              ? "border-destructive/50 bg-destructive/5"
              : "border-green-500/50 bg-green-500/5"
            : "border-border bg-card hover:border-muted-foreground/40 hover:bg-accent/40",
          disabled && "pointer-events-none opacity-40"
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }}
          className="hidden"
        />

        {file ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-1.5"
          >
            <FileSpreadsheet
              className={cn(
                "h-6 w-6",
                validationError ? "text-destructive" : "text-green-600 dark:text-green-400"
              )}
            />
            <p className="max-w-[180px] truncate text-xs font-semibold text-foreground">
              {file.name}
            </p>
            <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="mt-0.5 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-2.5 w-2.5" /> Remove
            </button>
          </motion.div>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Drop CSV here or <span className="text-primary underline">browse</span>
            </p>
          </>
        )}
      </div>

      {/* Validation error */}
      {validationError && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-1.5 text-[11px] text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {validationError}
        </motion.p>
      )}

      {/* Hint */}
      {!validationError && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function StudentsWithGuardiansUpload({
  mode = "students-with-guardians",
  onUploadComplete,
}: StudentsWithGuardiansUploadProps) {
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  // Derived booleans from mode
  const showStudentsCard = mode !== "guardians-only";
  const showGuardiansCard = mode !== "students-only";
  const guardiansRequired = mode === "guardians-only";
  const studentsRequired = mode !== "guardians-only";

  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [studentsFile, setStudentsFile] = useState<File | null>(null);
  const [guardiansFile, setGuardiansFile] = useState<File | null>(null);
  const [studentsFileError, setStudentsFileError] = useState<string | null>(null);
  const [guardiansFileError, setGuardiansFileError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [report, setReport] = useState<BulkImportReportDTO | null>(null);

  // Parsed preview data
  const [studentsData, setStudentsData] = useState<ParsedSheetData | null>(null);
  const [guardiansData, setGuardiansData] = useState<ParsedSheetData | null>(null);

  // SSE live state
  const [sseRows, setSseRows] = useState<Map<number, SseRowEntry>>(new Map());
  const [totalRows, setTotalRows] = useState(0);
  const sseCtrlRef = useRef<AbortController | null>(null);

  // ── File handlers ──────────────────────────────────────────────────────────

  const handleStudentsFileChange = useCallback((file: File | null) => {
    setStudentsFile(file);
    setStudentsFileError(null);
    if (phase === "ready") setPhase("idle");
  }, [phase]);

  const handleGuardiansFileChange = useCallback((file: File | null) => {
    setGuardiansFile(file);
    setGuardiansFileError(null);
    if (phase === "ready") setPhase("idle");
  }, [phase]);

  // ── Validate files ─────────────────────────────────────────────────────────

  const handleValidate = useCallback(async () => {
    // Determine which files are needed for the current mode
    if (studentsRequired && !studentsFile) {
      setStudentsFileError("Please select the students CSV file.");
      return;
    }
    if (guardiansRequired && !guardiansFile) {
      setGuardiansFileError("Please select the guardians CSV file.");
      return;
    }

    setPhase("validating");
    setStudentsFileError(null);
    setGuardiansFileError(null);
    setGeneralError(null);

    try {
      // Parse & validate students file (skip in guardians-only mode)
      let studentRowCount = 0;
      let parsedStudents: ParsedSheetData | null = null;
      if (studentsFile) {
        parsedStudents = await parseExcelFile(studentsFile);
        const studentsErr = validateCsvData("students", parsedStudents);
        if (studentsErr) {
          setStudentsFileError(studentsErr);
          setPhase("idle");
          return;
        }
        studentRowCount = parsedStudents.rows.length;
      }

      // Parse & validate guardians file (if provided or required)
      let guardianRowCount = 0;
      let parsedGuardians: ParsedSheetData | null = null;
      if (guardiansFile) {
        parsedGuardians = await parseExcelFile(guardiansFile);
        const guardiansErr = validateGuardianCsvData(parsedGuardians);
        if (guardiansErr) {
          setGuardiansFileError(guardiansErr);
          setPhase("idle");
          return;
        }
        guardianRowCount = parsedGuardians.rows.length;
      }

      setStudentsData(parsedStudents);
      setGuardiansData(parsedGuardians);

      // In guardians-only mode the total "rows" to watch is the guardian row count
      setTotalRows(mode === "guardians-only" ? guardianRowCount : studentRowCount);

      setPhase("ready");
      toast.success("Files validated", { description: "File(s) look good — ready to import." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error during validation.";
      setGeneralError(message);
      setPhase("idle");
      toast.error("Validation Failed", { description: message });
    }
  }, [studentsFile, guardiansFile, studentsRequired, guardiansRequired, mode]);

  // ── Submit import ──────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    // In guardians-only mode we generate an empty students CSV in-memory
    // so the multipart endpoint always receives both fields.
    let effectiveStudentsFile = studentsFile;
    if (mode === "guardians-only") {
      if (!guardiansFile) return;
      const STUDENTS_HEADER = "firstName,lastName,middleName,email,dateOfBirth,rollNo,gender,enrollmentNumber,enrollmentDate,className,sectionName\r\n";
      const emptyBlob = new Blob([STUDENTS_HEADER], { type: "text/csv" });
      effectiveStudentsFile = new File([emptyBlob], "students_empty.csv", { type: "text/csv" });
    } else {
      if (!studentsFile) return;
    }

    const sessionId = crypto.randomUUID();

    // Reset SSE state
    setSseRows(new Map());

    // Subscribe to SSE before firing upload
    const sseUrl = buildSseUrl(sessionId);
    const sseCtrl = fetchSse(
      sseUrl,
      accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      {
        onEvent: (eventType, data) => {
          try {
            if (eventType === "ROW_SUCCESS") {
              const d = JSON.parse(data) as SseRowSuccessPayload;
              setSseRows((prev) => {
                const next = new Map(prev);
                next.set(d.rowNumber, {
                  rowNumber: d.rowNumber,
                  identifier: d.studentEnrollmentNumber ?? d.identifier,
                  status: {
                    kind: "success",
                    guardianUsernames: d.guardianUsernames,
                    guardiansCreated: d.guardiansCreated,
                    guardiansLinked: d.guardiansLinked,
                  },
                });
                return next;
              });
            } else if (eventType === "ROW_FAILURE") {
              const d = JSON.parse(data) as SseRowFailurePayload;
              setSseRows((prev) => {
                const next = new Map(prev);
                next.set(d.rowNumber, {
                  rowNumber: d.rowNumber,
                  identifier: d.studentEnrollmentNumber ?? d.identifier,
                  status: { kind: "failure", error: d.errorMessage },
                });
                return next;
              });
            } else if (eventType === "JOB_COMPLETE") {
              sseCtrlRef.current = null;
              const d = JSON.parse(data) as SseJobCompletePayload;
              const finalReport: BulkImportReportDTO = {
                status: d.failureCount === 0 ? "SUCCESS" : "PARTIAL",
                totalRows: d.totalRows,
                successCount: d.successCount,
                failureCount: d.failureCount,
                errorMessages: [],
                guardiansCreated: d.guardiansCreated,
                guardiansLinked: d.guardiansLinked,
              };
              setReport(finalReport);
              setPhase("success");
              if (d.failureCount === 0) {
                toast.success("Import Complete", {
                  description: `${d.successCount} student(s) imported successfully.`,
                });
              } else {
                toast.warning("Import Completed with Errors", {
                  description: `${d.successCount} succeeded, ${d.failureCount} failed.`,
                });
              }
              onUploadComplete?.(finalReport);
            } else if (eventType === "JOB_FAILED") {
              sseCtrlRef.current = null;
              let message = "Import aborted by the server.";
              try {
                const d = JSON.parse(data) as { errorMessage?: string };
                if (d.errorMessage) message = d.errorMessage;
              } catch {/* ignore */}
              setGeneralError(message);
              setPhase("error");
              toast.error("Import Failed", { description: message });
            }
          } catch {/* ignore json parse errors */}
        },
        onError: (err) => {
          console.warn("SSE error (falling back to HTTP response):", err.message);
          sseCtrlRef.current = null;
        },
        onDone: () => { sseCtrlRef.current = null; },
      }
    );
    sseCtrlRef.current = sseCtrl;

    setPhase("uploading");

    try {
      const result = await submitStudentsWithGuardiansImport(effectiveStudentsFile!, guardiansFile, sessionId);
      // Always update the report with the HTTP response — it carries `errorMessages`
      // that the SSE JOB_COMPLETE event does not include.
      setReport(result);
      // Transition phase only if SSE hasn't already done it
      setPhase((prev) => {
        if (prev !== "uploading") return prev;
        if (result.failureCount === 0) {
          toast.success("Import Complete", {
            description: `${result.successCount} of ${result.totalRows} records imported.`,
          });
        } else {
          toast.warning("Import Completed with Errors", {
            description: `${result.successCount} succeeded, ${result.failureCount} failed.`,
          });
        }
        onUploadComplete?.(result);
        return "success";
      });
    } catch (err) {
      setPhase((prev) => {
        if (prev !== "uploading") return prev;
        const message = err instanceof Error ? err.message : "Upload failed. Please try again.";
        setGeneralError(message);
        toast.error("Import Failed", { description: message });
        return "error";
      });
    } finally {
      if (sseCtrlRef.current) {
        sseCtrlRef.current.abort();
        sseCtrlRef.current = null;
      }
    }
  }, [studentsFile, guardiansFile, mode, accessToken, onUploadComplete]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    if (sseCtrlRef.current) { sseCtrlRef.current.abort(); sseCtrlRef.current = null; }
    setPhase("idle");
    setStudentsFile(null);
    setGuardiansFile(null);
    setStudentsFileError(null);
    setGuardiansFileError(null);
    setGeneralError(null);
    setReport(null);
    setSseRows(new Map());
    setTotalRows(0);
  }, []);

  // ── Computed values ────────────────────────────────────────────────────────

  const sseRowsArray = Array.from(sseRows.values()).sort((a, b) => a.rowNumber - b.rowNumber);
  const successCount = sseRowsArray.filter((r) => r.status.kind === "success").length;
  const failureCount = sseRowsArray.filter((r) => r.status.kind === "failure").length;
  const doneCount = successCount + failureCount;
  const effectiveTotal = totalRows || sseRowsArray.length || 1;

  const canValidate =
    phase !== "uploading" && phase !== "validating" &&
    (studentsRequired ? !!studentsFile : true) &&
    (guardiansRequired ? !!guardiansFile : true);
  const canSubmit = phase === "ready" && (studentsRequired ? !!studentsFile : true) && (guardiansRequired ? !!guardiansFile : true);
  const isValidating = phase === "validating";

  // Human-friendly labels for the current mode
  const modeLabel =
    mode === "guardians-only" ? "Guardians" :
    mode === "students-only" ? "Students" :
    guardiansFile ? "Students + Guardians" : "Students";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-5">
      {/* ── File selectors (always visible unless uploading/success/error) ── */}
      <AnimatePresence mode="wait">
        {(phase === "idle" || phase === "validating" || phase === "ready") && (
          <motion.div
            key="file-pickers"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Info banner — adapts to mode */}
            <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                {mode === "guardians-only" ? (
                  <p>
                    <span className="font-semibold text-foreground">Guardians-only import.</span>{" "}
                    Upload a guardians CSV referencing existing students by <code className="rounded bg-muted px-1 font-mono">enrollmentNumber</code>.
                    Students must already exist in the system.
                  </p>
                ) : mode === "students-only" ? (
                  <p>
                    <span className="font-semibold text-foreground">Students file is required.</span>{" "}
                    Import students without guardian data.
                  </p>
                ) : (
                  <>
                    <p>
                      <span className="font-semibold text-foreground">Students file is required.</span>{" "}
                      The guardians file is optional — skip it to import students without guardian data.
                    </p>
                    <p>
                      Guardian reuse: if a phone or email already exists, the guardian is linked instead of created.
                      Conflicting phone ↔ email across different accounts will fail that row.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* File cards — shown based on mode */}
            <div className={`grid gap-4 ${showStudentsCard && showGuardiansCard ? "sm:grid-cols-2" : ""}`}>
              {showStudentsCard && (
                <FileCard
                  id="students-csv-input"
                  label="Students CSV"
                  hint="Columns: firstName, lastName, email, enrollmentNumber, className, sectionName, and more."
                  icon={<GraduationCap className="h-4 w-4 text-primary" />}
                  required={studentsRequired}
                  file={studentsFile}
                  onFileChange={handleStudentsFileChange}
                  onDownloadTemplate={downloadStudentsTemplate}
                  disabled={isValidating}
                  validationError={studentsFileError}
                />
              )}
              {showGuardiansCard && (
                <FileCard
                  id="guardians-csv-input"
                  label="Guardians CSV"
                  hint={
                    mode === "guardians-only"
                      ? "studentEnrollmentNumber must match an existing student's enrollmentNumber. phoneNumber and email are required per row."
                      : "studentEnrollmentNumber must match enrollmentNumber in students file. " +
                        "phoneNumber and email are required per row. Multiple guardians per student are supported."
                  }
                  icon={<Users className="h-4 w-4 text-amber-500" />}
                  required={guardiansRequired}
                  file={guardiansFile}
                  onFileChange={handleGuardiansFileChange}
                  onDownloadTemplate={downloadGuardiansTemplate}
                  disabled={isValidating}
                  validationError={guardiansFileError}
                />
              )}
            </div>

            {/* Backend rules reminder — only show when guardians are involved */}
            {showGuardiansCard && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed space-y-1">
                <p className="font-semibold text-foreground text-xs">Guardian linking rules</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Guardian matched by phone OR email → reused & linked (upsert)</li>
                  <li>No match → new guardian account created (username = phone number)</li>
                  <li>Phone maps to one account & email maps to another → row fails (conflict)</li>
                  <li>Same guardian can be linked to multiple students in one import</li>
                </ul>
              </div>
            )}

            {/* General validation error */}
            {generalError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {generalError}
              </motion.div>
            )}

            {/* Confirmed valid */}
            {phase === "ready" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-400">
                  <ShieldCheck className="h-4 w-4" />
                  Files validated — ready to import
                </div>

                {/* Previews */}
                <div className="flex flex-col gap-6">
                  {studentsData && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        Students Preview
                      </p>
                      <DataPreviewTable data={studentsData} />
                    </div>
                  )}

                  {guardiansData && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-amber-500" />
                        Guardians Preview
                      </p>
                      <DataPreviewTable data={guardiansData} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                variant="outline"
                onClick={handleValidate}
                disabled={!canValidate || isValidating}
                className="gap-2"
              >
                {isValidating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {isValidating ? "Validating…" : "Validate Files"}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Start Import ({modeLabel})
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── UPLOADING — Live SSE progress ─────────────────────────────── */}
        {phase === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Importing {modeLabel}…
                </p>
                <p className="text-xs text-muted-foreground">
                  {doneCount} / {effectiveTotal} processed
                  {failureCount > 0 && (
                    <span className="ml-2 text-destructive">· {failureCount} failed</span>
                  )}
                </p>
              </div>
              <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {doneCount} / {effectiveTotal}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted flex">
              <motion.div
                className="h-full rounded-l-full bg-green-500"
                animate={{ width: `${(successCount / effectiveTotal) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
              <motion.div
                className="h-full bg-destructive"
                animate={{ width: `${(failureCount / effectiveTotal) * 100}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>

            {/* Live row feed */}
            <div className="max-h-[300px] overflow-auto rounded-xl border border-border bg-card divide-y divide-border/50">
              <AnimatePresence initial={false}>
                {sseRowsArray.length === 0 && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiting for server…
                  </div>
                )}
                {sseRowsArray.map((row) => {
                  const isSuccess = row.status.kind === "success";
                  const isFailed = row.status.kind === "failure";
                  const guardians = row.status.guardianUsernames ?? [];
                  const gCreated = row.status.guardiansCreated ?? 0;
                  const gLinked = row.status.guardiansLinked ?? 0;

                  return (
                    <motion.div
                      key={row.rowNumber}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        "px-4 py-3",
                        isSuccess && "bg-green-500/5",
                        isFailed && "bg-destructive/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            isSuccess && "bg-green-500/15 text-green-600 dark:text-green-400",
                            isFailed && "bg-destructive/15 text-destructive"
                          )}
                        >
                          {isSuccess && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {isFailed && <AlertTriangle className="h-3.5 w-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-foreground">
                              Row {row.rowNumber}
                            </span>
                            {row.identifier && (
                              <span className="truncate text-xs text-muted-foreground">
                                · {row.identifier}
                              </span>
                            )}
                            {isSuccess && (gCreated > 0 || gLinked > 0) && (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                {gCreated > 0 && `${gCreated} guardian${gCreated !== 1 ? "s" : ""} created`}
                                {gCreated > 0 && gLinked > 0 && " · "}
                                {gLinked > 0 && `${gLinked} linked`}
                              </span>
                            )}
                          </div>
                          {isSuccess && guardians.length > 0 && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              Guardians: {guardians.join(", ")}
                            </p>
                          )}
                          {isFailed && row.status.error && (
                            <p className="mt-0.5 text-xs text-destructive">{row.status.error}</p>
                          )}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            isSuccess && "text-green-600 dark:text-green-400",
                            isFailed && "text-destructive"
                          )}
                        >
                          {isSuccess ? "✓" : "✗"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── SUCCESS ──────────────────────────────────────────────────────── */}
        {phase === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 rounded-xl border border-border bg-card p-6 text-center"
          >
            {/* Icon — warning if 0 successes, check if any succeeded */}
            {report && report.successCount === 0 && report.failureCount > 0 ? (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
                <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
            )}

            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">Import Complete</p>
              {report && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{report.successCount}</span>
                  {" "}of{" "}
                  <span className="font-semibold text-foreground">{report.totalRows}</span>
                  {" "}students imported.
                  {report.failureCount > 0 && (
                    <span className="ml-1 text-destructive">
                      {report.failureCount} failed.
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Error messages — shown when backend reports job-level errors
                (e.g. guardian references unknown student) with no per-row SSE events */}
            {report && report.errorMessages && report.errorMessages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-left"
              >
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Import errors
                </p>
                <ul className="space-y-1 pl-1">
                  {report.errorMessages.map((msg, i) => (
                    <li key={i} className="text-xs text-destructive/90">{msg}</li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Fallback: failures but no errorMessages and no SSE rows */}
            {report && report.failureCount > 0 &&
              (!report.errorMessages || report.errorMessages.length === 0) &&
              sseRowsArray.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left"
              >
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {report.failureCount} row(s) failed — check that enrollment numbers and phone numbers are correct.
                </p>
              </motion.div>
            )}

            {/* Guardian summary */}
            {report && (report.guardiansCreated !== undefined || report.guardiansLinked !== undefined) && (
              <div className="flex gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {report.guardiansCreated ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Guardians Created</p>
                </div>
                <div className="w-px bg-border" />
                <div className="text-center">
                  <p className="text-xl font-bold text-primary">
                    {report.guardiansLinked ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Guardians Linked</p>
                </div>
              </div>
            )}

            {/* Row-level report table */}
            {sseRowsArray.length > 0 && (
              <div className="mt-2 w-full max-h-[320px] overflow-auto rounded-lg border bg-background text-left shadow-sm">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur shadow-sm">
                    <tr>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground border-b w-16">Row</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground border-b">Enrollment #</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground border-b w-28">Status</th>
                      <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground border-b">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sseRowsArray.map((row) => {
                      const isSuccess = row.status.kind === "success";
                      const guardianDetails =
                        isSuccess && (row.status.guardiansCreated !== undefined || row.status.guardiansLinked !== undefined)
                          ? [
                              row.status.guardiansCreated ? `${row.status.guardiansCreated} created` : "",
                              row.status.guardiansLinked ? `${row.status.guardiansLinked} linked` : "",
                            ]
                              .filter(Boolean)
                              .join(", ")
                          : "";

                      return (
                        <tr
                          key={row.rowNumber}
                          className={
                            isSuccess
                              ? "bg-green-500/5 hover:bg-green-500/10 transition-colors"
                              : "bg-destructive/5 hover:bg-destructive/10 transition-colors"
                          }
                        >
                          <td className="px-4 py-3 text-center text-xs text-muted-foreground">{row.rowNumber}</td>
                          <td className="px-4 py-3 text-xs font-medium text-foreground">{row.identifier || "—"}</td>
                          <td className="px-4 py-3">
                            {isSuccess ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3" /> Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-2.5 py-0.5 text-xs font-medium text-destructive">
                                <AlertTriangle className="h-3 w-3" /> Failed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground align-top">
                            {isSuccess
                              ? guardianDetails
                                ? `Guardians: ${guardianDetails}`
                                : "Imported successfully."
                              : <ErrorCell message={row.status.error ?? "Unknown error"} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Import Again
            </Button>
          </motion.div>
        )}

        {/* ── ERROR ────────────────────────────────────────────────────────── */}
        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-10 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Import Failed</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{generalError}</p>
            </div>
            <Button variant="outline" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
