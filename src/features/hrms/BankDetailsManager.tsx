import { useState, useMemo, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserX,
  X,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Edit2,
  AlertCircle,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { StaffBankStatusDTO, BankDetailsUpdateDTO, BankDetailsBulkImportResultDTO } from "@/services/types/hrms";
import { parseExcelFile } from "@/features/bulk-upload/utils/parseExcel";
import DataPreviewTable from "@/features/bulk-upload/components/DataPreviewTable";
import type { ParsedSheetData } from "@/features/bulk-upload/types";

// ─────────────────────────────────────────────────────────────────────────────
// IFSC Lookup hook
// ─────────────────────────────────────────────────────────────────────────────
interface IfscInfo {
  BANK: string;
  BRANCH: string;
  CITY: string;
  STATE: string;
  ADDRESS: string;
}

function useIfscLookup() {
  const [ifscInfo, setIfscInfo] = useState<IfscInfo | null>(null);
  const [ifscLoading, setIfscLoading] = useState(false);
  const [ifscError, setIfscError] = useState<string | null>(null);

  const lookup = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clean)) {
      setIfscInfo(null);
      setIfscError(null);
      return;
    }
    setIfscLoading(true);
    setIfscError(null);
    try {
      const res = await fetch(`https://ifsc.razorpay.com/${clean}`);
      if (!res.ok) throw new Error("IFSC not found");
      const data: IfscInfo = await res.json();
      setIfscInfo(data);
      setIfscError(null);
    } catch {
      setIfscInfo(null);
      setIfscError("IFSC code not found. Please verify and try again.");
    } finally {
      setIfscLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIfscInfo(null);
    setIfscError(null);
  }, []);

  return { ifscInfo, ifscLoading, ifscError, lookup, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// IFSC Lookup Input Component
// ─────────────────────────────────────────────────────────────────────────────
interface IfscLookupInputProps {
  value: string;
  onChange: (v: string) => void;
  onBankNameResolved?: (name: string) => void;
  disabled?: boolean;
}
function IfscLookupInput({ value, onChange, onBankNameResolved, disabled }: IfscLookupInputProps) {
  const { ifscInfo, ifscLoading, ifscError, lookup, reset } = useIfscLookup();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    onChange(v);
    reset();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lookup(v).then(() => {});
    }, 400);
  };

  // When lookup succeeds, propagate bank name
  const prevIfscInfo = useRef<IfscInfo | null>(null);
  if (ifscInfo && ifscInfo !== prevIfscInfo.current) {
    prevIfscInfo.current = ifscInfo;
    onBankNameResolved?.(ifscInfo.BANK);
  }

  const isValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id="ifsc-input"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="e.g. HDFC0001234"
          maxLength={11}
          className={cn(
            "pr-10 font-mono tracking-wider",
            isValid && ifscInfo && "border-emerald-500 focus-visible:ring-emerald-400",
            ifscError && "border-destructive focus-visible:ring-destructive"
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {ifscLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!ifscLoading && isValid && ifscInfo && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          {!ifscLoading && ifscError && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>

      {/* Bank info card */}
      {ifscInfo && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 p-3 flex gap-3 items-start">
          <Building2 className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-emerald-800 dark:text-emerald-300">{ifscInfo.BANK}</p>
            <p className="text-muted-foreground">{ifscInfo.BRANCH} · {ifscInfo.CITY}, {ifscInfo.STATE}</p>
          </div>
        </div>
      )}

      {ifscError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {ifscError}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bank Details Form (Manual CRUD)
// ─────────────────────────────────────────────────────────────────────────────
interface BankFormState {
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  bankName: string;
  accountType: "SAVINGS" | "CURRENT";
}

const EMPTY_FORM: BankFormState = {
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifscCode: "",
  bankName: "",
  accountType: "SAVINGS",
};

interface BankDetailsFormErrors {
  accountHolderName?: string;
  accountNumber?: string;
  confirmAccountNumber?: string;
  ifscCode?: string;
}

function validateBankForm(form: BankFormState): BankDetailsFormErrors {
  const errors: BankDetailsFormErrors = {};
  if (!form.accountHolderName.trim()) errors.accountHolderName = "Account holder name is required";
  if (!form.accountNumber.trim()) errors.accountNumber = "Account number is required";
  if (form.accountNumber !== form.confirmAccountNumber) errors.confirmAccountNumber = "Account numbers do not match";
  if (!form.ifscCode.trim()) {
    errors.ifscCode = "IFSC code is required";
  } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode)) {
    errors.ifscCode = "Invalid IFSC format (e.g. HDFC0001234)";
  }
  return errors;
}

interface BankDetailsDialogProps {
  open: boolean;
  staffRow: StaffBankStatusDTO | null;
  onClose: () => void;
  onSuccess: () => void;
}

function BankDetailsDialog({ open, staffRow, onClose, onSuccess }: BankDetailsDialogProps) {
  const [form, setForm] = useState<BankFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<BankDetailsFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Pre-fill when dialog opens for edit
  const prevOpen = useRef(false);
  if (open && !prevOpen.current && staffRow) {
    prevOpen.current = true;
    setForm({
      accountHolderName: staffRow.accountHolderName ?? "",
      accountNumber: "",
      confirmAccountNumber: "",
      ifscCode: staffRow.ifscCode ?? "",
      bankName: staffRow.bankName ?? "",
      accountType: staffRow.accountType ?? "SAVINGS",
    });
    setErrors({});
    setServerError(null);
  }
  if (!open && prevOpen.current) prevOpen.current = false;

  const qc = useQueryClient();
  const upsertMut = useMutation({
    mutationFn: (dto: BankDetailsUpdateDTO) =>
      hrmsService.upsertBankDetails(staffRow!.uuid, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bank-details"] });
      onSuccess();
      onClose();
    },
    onError: (err) => setServerError(normalizeHrmsError(err).message),
  });

  const setField = <K extends keyof BankFormState>(key: K, value: BankFormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateBankForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    upsertMut.mutate({
      accountHolderName: form.accountHolderName.trim(),
      accountNumber: form.accountNumber.trim(),
      ifscCode: form.ifscCode.trim(),
      bankName: form.bankName.trim() || undefined,
      accountType: form.accountType,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-violet-600" />
            {staffRow?.hasBankDetails ? "Edit" : "Add"} Bank Details
          </DialogTitle>
          <DialogDescription>
            {staffRow?.staffName} · {staffRow?.employeeId}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Account Holder Name */}
          <div className="space-y-1.5">
            <Label htmlFor="holder">Account Holder Name *</Label>
            <Input
              id="holder"
              value={form.accountHolderName}
              onChange={(e) => setField("accountHolderName", e.target.value)}
              placeholder="As printed on cheque"
            />
            {errors.accountHolderName && (
              <p className="text-xs text-destructive">{errors.accountHolderName}</p>
            )}
          </div>

          {/* IFSC */}
          <div className="space-y-1.5">
            <Label htmlFor="ifsc-input">IFSC Code *</Label>
            <IfscLookupInput
              value={form.ifscCode}
              onChange={(v) => setField("ifscCode", v)}
              onBankNameResolved={(name) => setField("bankName", name)}
            />
            {errors.ifscCode && !form.ifscCode && (
              <p className="text-xs text-destructive">{errors.ifscCode}</p>
            )}
          </div>

          {/* Account Number + Confirm */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="accno">Account Number *</Label>
              <Input
                id="accno"
                type="password"
                value={form.accountNumber}
                onChange={(e) => setField("accountNumber", e.target.value)}
                placeholder="Enter account number"
                className={cn(errors.accountNumber && "border-destructive")}
              />
              {errors.accountNumber && (
                <p className="text-xs text-destructive">{errors.accountNumber}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-accno">Confirm Account No. *</Label>
              <Input
                id="confirm-accno"
                value={form.confirmAccountNumber}
                onChange={(e) => setField("confirmAccountNumber", e.target.value)}
                placeholder="Re-enter account number"
                className={cn(errors.confirmAccountNumber && "border-destructive")}
              />
              {errors.confirmAccountNumber && (
                <p className="text-xs text-destructive">{errors.confirmAccountNumber}</p>
              )}
            </div>
          </div>

          {/* Account Type */}
          <div className="space-y-1.5">
            <Label>Account Type</Label>
            <div className="flex gap-3">
              {(["SAVINGS", "CURRENT"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setField("accountType", t)}
                  className={cn(
                    "flex-1 rounded-lg border-2 py-2.5 text-sm font-medium transition-all",
                    form.accountType === t
                      ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400"
                      : "border-border text-muted-foreground hover:border-violet-300"
                  )}
                >
                  {t === "SAVINGS" ? "🏷 Savings" : "💼 Current"}
                </button>
              ))}
            </div>
          </div>

          {serverError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive flex gap-2 items-center">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}
        </form>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={upsertMut.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={upsertMut.isPending}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {upsertMut.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</>
            ) : "Save Bank Details"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status chip
// ─────────────────────────────────────────────────────────────────────────────
function BankStatusBadge({ row }: { row: StaffBankStatusDTO }) {
  if (row.hasBankDetails && row.hasIfsc)
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">✓ Complete</Badge>;
  if (row.hasBankDetails && !row.hasIfsc)
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">⚠ No IFSC</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400">✗ Missing</Badge>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff Row Card
// ─────────────────────────────────────────────────────────────────────────────
function StaffBankRow({
  row,
  onEdit,
  onClear,
  clearing,
}: {
  row: StaffBankStatusDTO;
  onEdit: () => void;
  onClear: () => void;
  clearing: boolean;
}) {
  const initials = row.staffName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 hover:border-violet-200 hover:shadow-sm transition-all">
      {/* Avatar */}
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{row.staffName}</span>
          <span className="text-xs text-muted-foreground font-mono">{row.employeeId}</span>
          <BankStatusBadge row={row} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
          {row.designation && <span>{row.designation}</span>}
          {row.bankName && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{row.bankName}</span>}
          {row.maskedAccountNumber && <span className="font-mono">{row.maskedAccountNumber}</span>}
          {row.ifscCode && <span className="font-mono">{row.ifscCode}</span>}
          {row.accountType && (
            <Badge variant="outline" className="h-4 text-[10px] px-1">{row.accountType}</Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" onClick={onEdit} id={`edit-bank-${row.employeeId}`}>
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        {row.hasBankDetails && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onClear}
            disabled={clearing}
            id={`clear-bank-${row.employeeId}`}
          >
            {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Import Wizard
// ─────────────────────────────────────────────────────────────────────────────
const IMPORT_STEPS = ["Download Template", "Upload & Preview", "Review Results"] as const;

function BulkImportWizard() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<BankDetailsBulkImportResultDTO | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const downloadMut = useMutation({
    mutationFn: () => hrmsService.downloadBankDetailsTemplate(),
    onSuccess: (res) => {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bank-details-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const importMut = useMutation({
    mutationFn: () => hrmsService.bulkImportBankDetails(file!),
    onSuccess: (res) => {
      setResult(res.data);
      setStep(2);
      qc.invalidateQueries({ queryKey: ["bank-details"] });
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setParsedData(null); setStep(1); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setParsedData(null); setStep(1); }
  };

  const handleValidate = async () => {
    if (!file) return;
    setIsValidating(true);
    try {
      const data = await parseExcelFile(file);
      setParsedData(data);
      toast.success("File validated successfully", { description: `${data.rows.length} rows found.` });
    } catch (err: any) {
      toast.error("Validation Error", { description: err.message || "Failed to parse file." });
      setFile(null);
    } finally {
      setIsValidating(false);
    }
  };

  const reset = () => { setFile(null); setParsedData(null); setResult(null); setStep(0); };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {IMPORT_STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
              step === i ? "border-violet-500 bg-violet-500 text-white"
                : step > i ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-border text-muted-foreground"
            )}>
              {step > i ? "✓" : i + 1}
            </div>
            <span className={cn(
              "text-sm font-medium hidden sm:block",
              step === i ? "text-foreground" : "text-muted-foreground"
            )}>
              {label}
            </span>
            {i < IMPORT_STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 0 — Download */}
      {step === 0 && (
        <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/50 dark:bg-violet-950/10 p-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="h-7 w-7 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Step 1: Download the Template</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Download the pre-filled CSV with all active staff (Employee ID + Name already filled).
              Fill in the bank details columns and save.
            </p>
          </div>
          <div className="bg-white dark:bg-card rounded-lg border p-3 text-xs font-mono text-left max-w-lg mx-auto overflow-x-auto">
            <span className="text-muted-foreground">employeeId,staffName,</span>
            <span className="text-violet-600">accountHolderName,accountNumber,ifscCode,bankName,accountType</span>
            <br />
            <span className="text-muted-foreground">EMP001,John Smith,John Smith,12345678901,HDFC0001234,HDFC Bank,SAVINGS</span>
          </div>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => downloadMut.mutate()}
              disabled={downloadMut.isPending}
              className="bg-violet-600 hover:bg-violet-700"
              id="download-bank-template"
            >
              {downloadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Download Template CSV
            </Button>
            <Button variant="outline" onClick={() => setStep(1)} id="skip-to-upload">
              Already have the file? Upload →
            </Button>
          </div>
        </div>
      )}

      {/* Step 1 — Upload & Preview */}
      {(step === 1 || step === 0) && step >= 1 && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
            className={cn(
              "rounded-xl border-2 border-dashed p-10 text-center transition-all",
              !file && "cursor-pointer hover:border-violet-300 hover:bg-muted/30",
              dragOver && "border-violet-500 bg-violet-50 dark:bg-violet-950/20 scale-[1.01]",
              file && !parsedData && "border-amber-400 bg-amber-50 dark:bg-amber-950/10",
              file && parsedData && "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/10"
            )}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} />
            {file ? (
              <div className="space-y-1 relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute -right-4 -top-4 rounded-full bg-background border"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setParsedData(null); }}
                >
                  <X className="h-4 w-4" />
                </Button>
                {parsedData ? (
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                ) : (
                  <FileSpreadsheet className="h-10 w-10 text-amber-500 mx-auto" />
                )}
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                {!parsedData && (
                  <p className="text-sm text-amber-600 mt-2">File needs validation before import.</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="font-medium">Drop CSV/Excel file here or click to browse</p>
                <p className="text-xs text-muted-foreground">Accepted formats: .csv, .xlsx, .xls</p>
              </div>
            )}
          </div>

          {parsedData && (
            <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/50">
               <DataPreviewTable data={parsedData} />
            </div>
          )}

          {file && (
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
              {!parsedData ? (
                <Button
                  onClick={(e) => { e.stopPropagation(); handleValidate(); }}
                  disabled={isValidating}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isValidating ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Validating…</>
                  ) : (
                    <><ShieldCheck className="h-4 w-4 mr-2" />Validate File</>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => importMut.mutate()}
                  disabled={importMut.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  id="confirm-bulk-import"
                >
                  {importMut.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importing…</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" />Start Import</>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Results */}
      {step === 2 && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Rows", value: result.totalRows, color: "text-foreground" },
              { label: "Imported", value: result.successCount, color: "text-emerald-600" },
              { label: "Skipped", value: result.skippedCount, color: "text-amber-600" },
              { label: "Errors", value: result.errorCount, color: "text-red-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {result.errors.length} row(s) failed to import
              </p>
              <div className="space-y-1 max-h-48 overflow-auto">
                {result.errors.map((e) => (
                  <div key={`${e.rowNumber}-${e.employeeId}`} className="text-xs flex gap-2 text-muted-foreground">
                    <span className="font-mono text-destructive">Row {e.rowNumber}</span>
                    <span className="font-medium">{e.employeeId}</span>
                    <span>—</span>
                    <span>{e.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.successCount > 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {result.successCount} staff member(s) bank details updated successfully.
            </div>
          )}

          <Button variant="outline" onClick={reset} id="import-again">
            <RefreshCw className="h-4 w-4 mr-2" />Import Another File
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function BankDetailsManager() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [filterStatus, setFilterStatus] = useState<"all" | "complete" | "missing">("all");
  const [editRow, setEditRow] = useState<StaffBankStatusDTO | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  const qc = useQueryClient();

  // All staff paginated
  const { data: allData, isLoading, refetch } = useQuery({
    queryKey: ["bank-details", "all"],
    queryFn: () => hrmsService.listBankDetails({ page: 0, size: 200 }),
    select: (r) => r.data.content,
  });

  const chartData = useMemo(() => {
    if (!allData) return [];
    let complete = 0, noIfsc = 0, missing = 0;
    allData.forEach(r => {
      if (r.hasBankDetails && r.hasIfsc) complete++;
      else if (r.hasBankDetails && !r.hasIfsc) noIfsc++;
      else missing++;
    });
    return [
      { name: "Complete", value: complete, color: "#10b981" },
      { name: "No IFSC", value: noIfsc, color: "#f59e0b" },
      { name: "Missing", value: missing, color: "#ef4444" },
    ].filter(d => d.value > 0);
  }, [allData]);

  // Missing only
  const { data: missingData, isLoading: missingLoading } = useQuery({
    queryKey: ["bank-details", "missing"],
    queryFn: () => hrmsService.listMissingBankDetails(),
    select: (r) => r.data,
  });

  const clearMut = useMutation({
    mutationFn: (uuid: string) => hrmsService.clearBankDetails(uuid),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bank-details"] }); setClearingId(null); },
    onError: () => setClearingId(null),
  });

  const downloadMut = useMutation({
    mutationFn: () => hrmsService.downloadBankDetailsTemplate(),
    onSuccess: (res) => {
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bank-details-template.csv";
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const filteredRows = useMemo(() => {
    if (!allData) return [];
    let rows = allData;
    if (filterStatus === "complete") rows = rows.filter((r) => r.hasBankDetails && r.hasIfsc);
    if (filterStatus === "missing") rows = rows.filter((r) => !r.hasBankDetails || !r.hasIfsc);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.staffName.toLowerCase().includes(q) ||
          r.employeeId.toLowerCase().includes(q) ||
          (r.bankName ?? "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allData, filterStatus, search]);

  const missingCount = useMemo(
    () => (allData ? allData.filter((r) => !r.hasBankDetails || !r.hasIfsc).length : (missingData?.length ?? 0)),
    [allData, missingData]
  );

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              💳
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Bank Details</h2>
              <p className="text-sm text-white/70">Manage staff bank accounts for salary disbursement</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {missingCount > 0 && (
              <div className="flex items-center gap-2 bg-white/20 border border-white/30 rounded-xl px-3 py-1.5 text-white text-sm font-medium backdrop-blur-sm">
                <AlertTriangle className="h-4 w-4 text-amber-300" />
                <span>{missingCount} missing</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm gap-1.5"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="overview" id="tab-bank-overview">Overview</TabsTrigger>
          <TabsTrigger value="import" id="tab-bank-import">Bulk Import</TabsTrigger>
          <TabsTrigger value="missing" id="tab-bank-missing" className="relative">
            Missing
            {missingCount > 0 && (
              <span className="ml-1.5 h-4 min-w-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {missingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ───────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          
          {/* Dashboard Metrics */}
          {allData && allData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
              <div className="md:col-span-1 rounded-2xl border bg-card p-4 shadow-sm flex flex-col justify-between items-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-background to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="font-semibold text-sm w-full text-left text-muted-foreground uppercase tracking-wider mb-2">Status Breakdown</h3>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={54}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px -2px rgb(0 0 0 / 0.15)', padding: '6px 12px' }}
                        itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {chartData.map(d => (
                  <div key={d.name} className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden transition-all hover:border-border/80 hover:shadow-md">
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full" style={{ backgroundColor: d.color }} />
                    <span className="text-4xl font-extrabold tracking-tight" style={{ color: d.color }}>{d.value}</span>
                    <span className="text-xs font-semibold text-muted-foreground mt-2 uppercase tracking-wide">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="bank-search"
                placeholder="Search by name, employee ID, or bank…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "complete", "missing"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filterStatus === f ? "default" : "outline"}
                  onClick={() => setFilterStatus(f)}
                  id={`filter-bank-${f}`}
                  className={cn("rounded-lg h-10 px-4", filterStatus === f && "bg-violet-600 hover:bg-violet-700")}
                >
                  {f === "all" ? "All" : f === "complete" ? "✓ Complete" : "⚠ Missing"}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadMut.mutate()}
              disabled={downloadMut.isPending}
              id="download-template-overview"
              className="h-10 rounded-lg whitespace-nowrap"
            >
              {downloadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="ml-1.5 hidden sm:inline">Export CSV</span>
            </Button>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-16 space-y-2 rounded-2xl border bg-card shadow-sm">
              <UserX className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
              <p className="text-muted-foreground font-medium">No staff found matching your filters</p>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col bg-gradient-to-b from-transparent to-muted/10">
              <div className="bg-muted/40 px-5 py-3 border-b flex justify-between items-center backdrop-blur-sm">
                 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{filteredRows.length} STAFF RECORDS</p>
              </div>
              <div className="max-h-[500px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {filteredRows.map((row) => (
                  <StaffBankRow
                    key={row.uuid}
                    row={row}
                    onEdit={() => setEditRow(row)}
                    onClear={() => { setClearingId(row.uuid); clearMut.mutate(row.uuid); }}
                    clearing={clearingId === row.uuid && clearMut.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Bulk Import Tab ────────────────────────────────────── */}
        <TabsContent value="import" className="mt-4">
          <BulkImportWizard />
        </TabsContent>

        {/* ── Missing Tab ────────────────────────────────────────── */}
        <TabsContent value="missing" className="space-y-4 mt-4">
          {missingLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !missingData || missingData.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-12 text-center space-y-3 shadow-sm">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <p className="font-bold text-lg text-emerald-700 dark:text-emerald-400 tracking-tight">All staff have bank details!</p>
              <p className="text-sm text-emerald-600/80 dark:text-emerald-500 max-w-sm mx-auto">You're all caught up. No missing bank accounts or IFSC codes were found.</p>
            </div>
          ) : (
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col bg-gradient-to-b from-transparent to-muted/10">
              <div className="bg-amber-50/50 dark:bg-amber-950/20 px-5 py-3 border-b flex justify-between items-center backdrop-blur-sm">
                 <p className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest flex items-center gap-2">
                   <AlertTriangle className="h-3.5 w-3.5" />
                   {missingData.length} ACTION REQUIRED
                 </p>
                 <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setActiveTab("import"); }}
                  id="go-to-bulk-import"
                  className="h-7 text-xs border-amber-200 hover:bg-amber-100 dark:border-amber-900 dark:hover:bg-amber-900/50"
                >
                  <Upload className="h-3 w-3 mr-1.5" />
                  Bulk Import
                </Button>
              </div>
              <div className="max-h-[500px] overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {missingData.map((row) => (
                  <StaffBankRow
                    key={row.uuid}
                    row={row}
                    onEdit={() => setEditRow(row)}
                    onClear={() => { setClearingId(row.uuid); clearMut.mutate(row.uuid); }}
                    clearing={clearingId === row.uuid && clearMut.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <BankDetailsDialog
        open={!!editRow}
        staffRow={editRow}
        onClose={() => setEditRow(null)}
        onSuccess={() => setEditRow(null)}
      />
    </div>
  );
}
