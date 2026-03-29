import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  Download,
  ShieldCheck,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";

import type { BulkImportUserType, BulkImportReportDTO, ParsedSheetData } from "./types";
import { USER_TYPE_OPTIONS } from "./types";
import { parseExcelFile } from "./utils/parseExcel";
import { fetchSse } from "./utils/fetchSse";
import { submitBulkImport, buildSseUrl } from "./services/bulkUploadApi";
import { validateCsvData } from "./utils/csvValidation";
import { downloadStudentsTemplate, downloadStaffTemplate } from "./utils/csvTemplateGuardian";
import DataPreviewTable from "./components/DataPreviewTable";
import UploadingProgress, { type RowStatus } from "./components/UploadingProgress";

// ─── Upload phases ───────────────────────────────────────────────────────────
type Phase = "idle" | "validating" | "ready" | "uploading" | "success" | "error";


interface BulkDataUploadProps {
  defaultUserType?: BulkImportUserType;
  hideTypeSelector?: boolean;
  onUploadComplete?: (report: BulkImportReportDTO) => void;
}

// ─── Compact file picker card ─────────────────────────────────────────────────
interface FilePickerCardProps {
  id: string;
  userType: BulkImportUserType;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onDownloadTemplate: () => void;
  disabled?: boolean;
  validationError?: string | null;
}

function FilePickerCard({
  id,
  userType,
  file,
  onFileChange,
  onDownloadTemplate,
  disabled = false,
  validationError,
}: FilePickerCardProps) {
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
        <span className="text-sm font-semibold text-foreground">
          {userType === "students" ? "Students CSV" : "Staff CSV"}
          <span className="ml-1 text-destructive">*</span>
        </span>
        <button
          type="button"
          onClick={onDownloadTemplate}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3 w-3" />
          Download Template
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
          "relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200",
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
            <p className="max-w-[220px] truncate text-xs font-semibold text-foreground">
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
              Drop CSV / Excel here or <span className="text-primary underline">browse</span>
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
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BulkDataUpload({
  defaultUserType,
  hideTypeSelector = false,
  onUploadComplete,
}: BulkDataUploadProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
  const [report, setReport] = useState<BulkImportReportDTO | null>(null);
  const [userType, setUserType] = useState<BulkImportUserType>(defaultUserType ?? "students");
  const accessToken = useAppSelector((s) => s.auth.accessToken);

  // Legacy state kept for the UploadingProgress component
  const [rowProgress, setRowProgress] = useState<Map<number, RowStatus>>(new Map());
  const [activeRowNumber, setActiveRowNumber] = useState(1);
  const sseCtrlRef = useRef<AbortController | null>(null);

  // ── File change ──────────────────────────────────────────────────────────
  const handleFileChange = useCallback((f: File | null) => {
    setFile(f);
    setFileError(null);
    if (phase === "ready") setPhase("idle");
  }, [phase]);

  // ── Validate ──────────────────────────────────────────────────────────────
  const handleValidate = useCallback(async () => {
    if (!file) {
      setFileError("Please select a CSV or Excel file first.");
      return;
    }

    setPhase("validating");
    setFileError(null);

    try {
      const parsed = await parseExcelFile(file);
      const error = validateCsvData(userType, parsed);
      if (error) {
        setFileError(error);
        setPhase("idle");
        toast.error("Validation Failed", { description: error });
        return;
      }
      setParsedData(parsed);
      setPhase("ready");
      toast.success("File validated", { description: "Looks good — ready to import!" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error during validation.";
      setFileError(message);
      setPhase("idle");
      toast.error("Validation Failed", { description: message });
    }
  }, [file, userType]);

  // ── Submit (upload) ───────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!file) return;

    const sessionId = crypto.randomUUID();
    setRowProgress(new Map());
    setActiveRowNumber(1);

    // Open SSE before upload
    const sseUrl = buildSseUrl(sessionId);
    const sseCtrl = fetchSse(
      sseUrl,
      accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      {
        onEvent: (eventType, data) => {
          try {
            if (eventType === "ROW_SUCCESS") {
              const d = JSON.parse(data) as { rowNumber: number; identifier: string };
              setRowProgress((prev) => { const next = new Map(prev); next.set(d.rowNumber, { kind: "success" }); return next; });
              setActiveRowNumber(d.rowNumber + 1);
            } else if (eventType === "ROW_FAILURE") {
              const d = JSON.parse(data) as { rowNumber: number; identifier: string; errorMessage: string };
              setRowProgress((prev) => { const next = new Map(prev); next.set(d.rowNumber, { kind: "failure", error: d.errorMessage }); return next; });
              setActiveRowNumber(d.rowNumber + 1);
            } else if (eventType === "JOB_COMPLETE") {
              sseCtrlRef.current = null;
              try {
                const d = JSON.parse(data) as { successCount: number; failureCount: number; totalRows: number };
                const r: BulkImportReportDTO = { status: d.failureCount === 0 ? "SUCCESS" : "PARTIAL", totalRows: d.totalRows, successCount: d.successCount, failureCount: d.failureCount, errorMessages: [] };
                setReport(r);
                setPhase("success");
                if (d.failureCount === 0) {
                  toast.success("Import Successful", { description: `${d.successCount} of ${d.totalRows} records imported.` });
                } else {
                  toast.warning("Import Completed with Errors", { description: `${d.successCount} succeeded, ${d.failureCount} failed.` });
                }
                onUploadComplete?.(r);
              } catch { setPhase("success"); }
            } else if (eventType === "JOB_FAILED") {
              sseCtrlRef.current = null;
              let message = "Import aborted by the server.";
              try { const d = JSON.parse(data) as { errorMessage?: string }; if (d.errorMessage) message = d.errorMessage; } catch {/* ignore */}
              setFileError(message);
              setPhase("error");
              toast.error("Import Failed", { description: message });
            }
          } catch {/* ignore json parse errors */}
        },
        onError: (err) => { console.warn("SSE error:", err.message); sseCtrlRef.current = null; },
        onDone: () => { sseCtrlRef.current = null; },
      }
    );
    sseCtrlRef.current = sseCtrl;
    setPhase("uploading");

    try {
      const r = await submitBulkImport(file, userType, sessionId);
      setReport(r);
      setPhase((prev) => {
        if (prev !== "uploading") return prev;
        if (r.failureCount === 0) {
          toast.success("Import Successful", { description: `${r.successCount} of ${r.totalRows} records imported.` });
        } else {
          toast.warning("Import Completed with Errors", { description: `${r.successCount} succeeded, ${r.failureCount} failed.` });
        }
        onUploadComplete?.(r);
        return "success";
      });
    } catch (error) {
      setPhase((prev) => {
        if (prev !== "uploading") return prev;
        const message = error instanceof Error ? error.message : "Upload failed. Please try again.";
        toast.error("Import Failed", { description: message });
        setFileError(message);
        return "error";
      });
    } finally {
      if (sseCtrlRef.current) { sseCtrlRef.current.abort(); sseCtrlRef.current = null; }
    }
  }, [file, userType, accessToken, onUploadComplete]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    if (sseCtrlRef.current) { sseCtrlRef.current.abort(); sseCtrlRef.current = null; }
    setPhase("idle");
    setFile(null);
    setFileError(null);
    setParsedData(null);
    setReport(null);
    setRowProgress(new Map());
    setActiveRowNumber(1);
  }, []);

  const isValidating = phase === "validating";
  const canValidate = !!file && phase !== "uploading" && phase !== "validating";
  const canSubmit = phase === "ready" && !!file;
  const selectedTypeLabel = USER_TYPE_OPTIONS.find((opt) => opt.value === userType)?.label ?? "Users";

  const handleDownloadTemplate = useCallback(() => {
    if (userType === "staff") downloadStaffTemplate();
    else downloadStudentsTemplate();
  }, [userType]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Bulk {selectedTypeLabel} Import
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a CSV matching the template. Download the template first if you haven&apos;t.
          </p>
        </div>

        {/* User type selector (when not hidden) */}
        {!hideTypeSelector && (
          <div className="relative">
            <label
              htmlFor="bulk-upload-user-type"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Import as
            </label>
            <div className="relative">
              <select
                id="bulk-upload-user-type"
                value={userType}
                onChange={(e) => {
                  setUserType(e.target.value as BulkImportUserType);
                  handleReset();
                }}
                disabled={phase === "uploading" || phase === "validating"}
                className={cn(
                  "h-9 w-44 appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm font-medium text-foreground shadow-sm",
                  "transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                {USER_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* ── Phase: idle / validating / ready ── */}
      <AnimatePresence mode="wait">
        {(phase === "idle" || phase === "validating" || phase === "ready") && (
          <motion.div
            key="file-picker"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* File picker card */}
            <FilePickerCard
              id="bulk-import-file-input"
              userType={userType}
              file={file}
              onFileChange={handleFileChange}
              onDownloadTemplate={handleDownloadTemplate}
              disabled={isValidating}
              validationError={fileError}
            />

            {/* Validated & ready banner */}
            {phase === "ready" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-400">
                  <ShieldCheck className="h-4 w-4" />
                  File validated — ready to import
                </div>

                {/* Preview */}
                {parsedData && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      Preview ({parsedData.rows.length} rows)
                    </p>
                    <DataPreviewTable data={parsedData} />
                  </div>
                )}
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
                {isValidating ? "Validating…" : "Validate File"}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Start Import ({selectedTypeLabel})
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── UPLOADING — SSE progress ── */}
        {phase === "uploading" && parsedData && (
          <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UploadingProgress
              data={parsedData}
              typeLabel={selectedTypeLabel}
              rowProgress={rowProgress}
              activeRowNumber={activeRowNumber}
            />
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {phase === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 w-full text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Import Complete</p>
              {report ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{report.successCount}</span>
                    {" "}of{" "}
                    <span className="font-semibold text-foreground">{report.totalRows}</span>
                    {" "}records imported successfully.
                  </p>
                  {report.failureCount > 0 && (
                    <p className="text-sm text-destructive">
                      {report.failureCount} record{report.failureCount !== 1 ? "s" : ""} failed to import.
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Records have been successfully imported.</p>
              )}
            </div>

            {/* Row-by-row report */}
            {parsedData?.rows && parsedData.rows.length > 0 && (
              <div className="mt-4 w-full max-h-[350px] overflow-auto rounded-lg border bg-background text-left shadow-sm">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur text-muted-foreground w-full shadow-sm">
                    <tr>
                      <th className="px-4 py-2.5 font-medium w-16 text-center border-b">Row</th>
                      <th className="px-4 py-2.5 font-medium border-b">Record Identifier</th>
                      <th className="px-4 py-2.5 font-medium w-32 border-b">Status</th>
                      <th className="px-4 py-2.5 font-medium border-b w-1/2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {parsedData.rows.map((r, i) => {
                      const rowNum = i + 1;
                      const status = rowProgress.get(rowNum);
                      const fallbackError = Array.isArray(report?.errorMessages)
                        ? report.errorMessages.find(
                            (msg) => msg.startsWith(`Row ${rowNum}:`) || msg.startsWith(`Row ${rowNum} `)
                          )
                        : undefined;
                      const errorText = status?.kind === "failure" ? status.error : fallbackError;
                      const isSuccess = !errorText;
                      const identifier = r[0] ? `${r[0]} ${r[1] ?? ""}`.trim() : `Row ${rowNum}`;

                      return (
                        <tr key={rowNum} className={isSuccess ? "bg-green-500/5 hover:bg-green-500/10 transition-colors" : "bg-destructive/5 hover:bg-destructive/10 transition-colors"}>
                          <td className="px-4 py-3 text-center text-muted-foreground">{rowNum}</td>
                          <td className="px-4 py-3 font-medium truncate max-w-[200px]" title={identifier}>{identifier}</td>
                          <td className="px-4 py-3">
                            {isSuccess ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-2.5 py-0.5 text-xs font-medium text-destructive">
                                <AlertTriangle className="h-3 w-3" />
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {errorText || "Imported successfully."}
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
              Upload Another File
            </Button>
          </motion.div>
        )}

        {/* ── ERROR ── */}
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
              <p className="text-lg font-semibold text-foreground">Something went wrong</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{fileError}</p>
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
