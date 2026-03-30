import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, UserCheck, AlertTriangle, Minimize2 } from "lucide-react";
import type { ParsedSheetData } from "../types";

// ── Types shared with BulkDataUpload ────────────────────────────────

export type RowStatus =
  | { kind: "pending" }
  | { kind: "active" }
  | { kind: "success" }
  | { kind: "failure"; error: string };

export interface RowProgress {
  rowNumber: number;   // 1-indexed, matches SSE rowNumber
  label: string;
  status: RowStatus;
}

interface UploadingProgressProps {
  data: ParsedSheetData;
  typeLabel: string;
  /** Live row progress received from SSE — keyed by 1-based rowNumber */
  rowProgress: Map<number, RowStatus>;
  /** The 1-based index of the row currently being processed */
  activeRowNumber: number;
  /** Optional callback — when provided, a Minimize button is shown */
  onMinimize?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function buildRowLabel(headers: string[], row: string[]): string {
  const get = (key: string): string => {
    const idx = headers.indexOf(key);
    return idx >= 0 ? (row[idx] ?? "").trim() : "";
  };

  const firstName = get("firstName");
  const lastName = get("lastName");
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";

  const className = get("className");
  const sectionName = get("sectionName");
  if (className && sectionName) return `${fullName} · ${className} ${sectionName}`;

  const jobTitle = get("jobTitle");
  if (jobTitle) return `${fullName} · ${jobTitle}`;

  return fullName;
}

// ── Component ────────────────────────────────────────────────────────

export default function UploadingProgress({
  data,
  typeLabel,
  rowProgress,
  activeRowNumber,
  onMinimize,
}: UploadingProgressProps) {
  const { headers, rows } = data;
  const total = rows.length;

  // Build display rows from data + live SSE progress map
  const displayRows = useMemo<RowProgress[]>(() => {
    return rows.map((row, i) => {
      const rowNum = i + 1; // 1-indexed
      const status: RowStatus = rowProgress.get(rowNum) ?? (
        rowNum < activeRowNumber
          ? { kind: "success" }       // assume done if passed and no explicit status
          : rowNum === activeRowNumber
          ? { kind: "active" }
          : { kind: "pending" }
      );
      return {
        rowNumber: rowNum,
        label: buildRowLabel(headers, row),
        status,
      };
    });
  }, [rows, headers, rowProgress, activeRowNumber]);

  // Counts
  const successCount = displayRows.filter((r) => r.status.kind === "success").length;
  const failureCount = displayRows.filter((r) => r.status.kind === "failure").length;
  const doneCount = successCount + failureCount;

  // Sliding window centred on the active row
  const activeIdx = Math.max(0, activeRowNumber - 1);
  const windowSize = 7;
  const start = Math.max(0, activeIdx - 3);
  const windowRows = displayRows.slice(start, start + windowSize);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Registering {typeLabel}…
          </p>
          <p className="text-xs text-muted-foreground">
            {doneCount} / {total} processed
            {failureCount > 0 && (
              <span className="ml-2 text-destructive">· {failureCount} failed</span>
            )}
          </p>
        </div>
        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {doneCount} / {total}
        </span>
        {onMinimize && (
          <button
            type="button"
            onClick={onMinimize}
            title="Minimize to toast"
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Progress bar — split green / red */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted flex">
        <motion.div
          className="h-full rounded-l-full bg-green-500"
          animate={{ width: `${(successCount / total) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
        <motion.div
          className="h-full bg-destructive"
          animate={{ width: `${(failureCount / total) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Rows list */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <AnimatePresence initial={false} mode="popLayout">
          {windowRows.map((item) => {
            const isDone = item.status.kind === "success" || item.status.kind === "failure";
            const isFailed = item.status.kind === "failure";
            const isActive = item.status.kind === "active";
            const isPending = item.status.kind === "pending";

            return (
              <motion.div
                key={item.rowNumber}
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22 }}
                className={`
                  relative flex items-center gap-3 border-b border-border/50 px-4 py-3 last:border-0
                  ${isActive ? "bg-primary/5" : ""}
                  ${isDone ? "opacity-60" : ""}
                  ${isFailed ? "bg-destructive/5 opacity-80" : ""}
                `}
              >
                {/* Icon */}
                <div className={`
                  flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                  ${item.status.kind === "success" ? "bg-green-500/15 text-green-600 dark:text-green-400" : ""}
                  ${isFailed ? "bg-destructive/15 text-destructive" : ""}
                  ${isActive ? "bg-primary/15 text-primary" : ""}
                  ${isPending ? "bg-muted text-muted-foreground" : ""}
                `}>
                  {item.status.kind === "success" && <UserCheck className="h-3.5 w-3.5" />}
                  {isFailed && <AlertTriangle className="h-3.5 w-3.5" />}
                  {(isActive || isPending) && <span>{item.rowNumber}</span>}
                </div>

                {/* Label + error */}
                <div className="min-w-0 flex-1">
                  <span className={`text-sm ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {!isDone && (
                      <span className="mr-1.5 text-xs font-normal text-muted-foreground">
                        {isActive ? "Registering —" : "Waiting —"}
                      </span>
                    )}
                    {item.label}
                  </span>
                  {isFailed && (item.status as { kind: "failure"; error: string }).error && (
                    <p className="mt-0.5 truncate text-xs text-destructive">
                      {(item.status as { kind: "failure"; error: string }).error}
                    </p>
                  )}
                </div>

                {/* Right badge */}
                {item.status.kind === "success" && (
                  <span className="ml-auto shrink-0 text-xs text-green-600 dark:text-green-400">✓ done</span>
                )}
                {isFailed && (
                  <span className="ml-auto shrink-0 text-xs text-destructive">✗ failed</span>
                )}
                {isActive && (
                  <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                )}

                {/* Shimmer sweep on active row */}
                {isActive && (
                  <motion.div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
