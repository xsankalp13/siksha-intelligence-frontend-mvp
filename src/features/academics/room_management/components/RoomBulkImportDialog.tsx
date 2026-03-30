import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    FileSpreadsheet,
    Download,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    AlertTriangle,
    X,
    Minimize2,
    Maximize2,
    ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── CSV Template ─────────────────────────────────────────────────────

const ROOM_CSV_HEADERS = [
    'name', 'roomType', 'seatingType', 'rowCount', 'columnsPerRow',
    'seatsPerUnit', 'floorNumber', 'building', 'hasProjector', 'hasAC',
    'hasWhiteboard', 'isAccessible', 'otherAmenities',
];

const VALID_ROOM_TYPES = ['CLASSROOM', 'LABORATORY', 'COMPUTER_LAB', 'LIBRARY', 'AUDITORIUM', 'GYM', 'OTHER'];
const VALID_SEATING_TYPES = ['BENCH', 'DESK_CHAIR', 'WORKSTATION', 'TERMINAL', 'THEATER'];

const SAMPLE_ROWS = [
    ['Room 101', 'CLASSROOM', 'BENCH', '5', '4', '3', '1', 'Block A', 'true', 'false', 'true', 'false', ''],
    ['Room 102', 'CLASSROOM', 'DESK_CHAIR', '6', '5', '1', '1', 'Block A', 'false', 'false', 'true', 'false', ''],
    ['Physics Lab', 'LABORATORY', 'WORKSTATION', '4', '6', '2', '0', 'Block B', 'true', 'true', 'true', 'true', 'Fume Hood'],
    ['Computer Lab 1', 'COMPUTER_LAB', 'TERMINAL', '5', '8', '1', '2', 'Block A', 'true', 'true', 'false', 'false', ''],
    ['Library', 'LIBRARY', 'DESK_CHAIR', '10', '6', '1', '0', 'Main Building', 'false', 'true', 'true', 'true', ''],
];

function escapeCsv(val: string): string {
    return `"${val.replace(/"/g, '""')}"`;
}

function downloadRoomTemplate() {
    const allRows = [ROOM_CSV_HEADERS, ...SAMPLE_ROWS];
    const csvText = allRows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rooms_bulk_import_template.csv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── SSE URL builder ──────────────────────────────────────────────────

function buildSseUrl(sessionId: string): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') ?? 'http://localhost:8080';
    const prefix = (import.meta.env.VITE_API_PREFIX ?? '/api').replace(/\/+$/, '');
    const version = (import.meta.env.VITE_API_VERSION ?? 'v1').replace(/^\/+/, '').replace(/\/+$/, '');
    return `${baseUrl}${prefix}/${version}/bulk-import/stream/${sessionId}`;
}

// ── CSV Parser ───────────────────────────────────────────────────────

interface ParsedRoomRow {
    rowNumber: number;
    data: Record<string, string>;
    errors: string[];
}

interface ParsedCsvResult {
    headers: string[];
    rows: ParsedRoomRow[];
    globalError?: string;
}

/** Correctly parses a single CSV line, handling quoted fields and escaped quotes */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote inside quoted field
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseCsvText(text: string): ParsedCsvResult {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [], globalError: 'CSV must have a header row and at least one data row.' };

    // Parse headers using the same robust parser
    const rawHeaders = parseCSVLine(lines[0]).map(h => h.toLowerCase());
    const missingHeaders = ROOM_CSV_HEADERS.filter(h => !rawHeaders.includes(h.toLowerCase()));
    if (missingHeaders.length > 0) {
        return { headers: rawHeaders, rows: [], globalError: `Missing required columns: ${missingHeaders.join(', ')}` };
    }

    const rows: ParsedRoomRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const rowData: Record<string, string> = {};
        rawHeaders.forEach((h, idx) => { rowData[h] = cols[idx] ?? ''; });

        const errors: string[] = [];

        // Required field checks
        if (!rowData['name']) errors.push('Room name is required');
        if (!rowData['roomtype']) errors.push('roomType is required');
        else if (!VALID_ROOM_TYPES.includes(rowData['roomtype'].toUpperCase())) errors.push(`Invalid roomType. Valid: ${VALID_ROOM_TYPES.join(', ')}`);
        if (!rowData['seatingtype']) errors.push('seatingType is required');
        else if (!VALID_SEATING_TYPES.includes(rowData['seatingtype'].toUpperCase())) errors.push(`Invalid seatingType. Valid: ${VALID_SEATING_TYPES.join(', ')}`);
        if (!rowData['building']) errors.push('building is required');

        // Numeric checks
        const numericFields = ['rowcount', 'columnsperrow', 'seatsperunit', 'floornumber'];
        for (const f of numericFields) {
            const val = rowData[f];
            if (val !== undefined && val !== '' && (isNaN(Number(val)) || Number(val) < 0)) {
                errors.push(`${f} must be a non-negative number`);
            }
        }

        // Boolean checks
        const boolFields = ['hasprojector', 'hasac', 'haswhiteboard', 'isaccessible'];
        for (const f of boolFields) {
            const val = (rowData[f] ?? '').toLowerCase();
            if (val !== '' && val !== 'true' && val !== 'false') {
                errors.push(`${f} must be true or false`);
            }
        }

        rows.push({ rowNumber: i, data: rowData, errors });
    }

    return { headers: rawHeaders, rows };
}

async function parseRoomFile(file: File): Promise<ParsedCsvResult> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            resolve(parseCsvText(text));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// ── Types ────────────────────────────────────────────────────────────

type Phase = 'idle' | 'validating' | 'ready' | 'uploading' | 'complete';

interface SseRowEvent {
    rowNumber: number;
    identifier: string;
    errorMessage?: string;
    totalCapacity?: number;
}

interface ImportResult {
    totalRows: number;
    successCount: number;
    failureCount: number;
    errors: string[];
    events: SseRowEvent[];
}

// ── Component ────────────────────────────────────────────────────────

interface RoomBulkImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function RoomBulkImportDialog({ open, onOpenChange }: RoomBulkImportDialogProps) {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const [phase, setPhase] = useState<Phase>('idle');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [parsedData, setParsedData] = useState<ParsedCsvResult | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const toastIdRef = useRef<string | number | null>(null);
    const [importResult, setImportResult] = useState<ImportResult>({
        totalRows: 0, successCount: 0, failureCount: 0, errors: [], events: [],
    });

    useEffect(() => {
        return () => { eventSourceRef.current?.close(); };
    }, []);

    const resetState = useCallback(() => {
        setSelectedFile(null);
        setPhase('idle');
        setFileError(null);
        setParsedData(null);
        setIsMinimized(false);
        if (toastIdRef.current) { toast.dismiss(toastIdRef.current); toastIdRef.current = null; }
        setImportResult({ totalRows: 0, successCount: 0, failureCount: 0, errors: [], events: [] });
        eventSourceRef.current?.close();
    }, []);

    const handleClose = () => {
        if (phase === 'uploading') return;
        resetState();
        onOpenChange(false);
    };

    // ── Toast progress renderer ────────────────────────────────────────────────
    const showProgressToast = useCallback((
        success: number, failed: number, total: number, onRestore: () => void
    ) => {
        const done = success + failed;
        const toastContent = (
            <div className="w-full">
                <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        Importing Rooms…
                    </p>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {success} ✓ {failed > 0 ? `· ${failed} ✗` : ''}
                    </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden flex mb-1.5">
                    <div className="h-full rounded-l-full bg-green-500 transition-all duration-300" style={{ width: `${total > 0 ? (success / total) * 100 : 0}%` }} />
                    <div className="h-full bg-destructive transition-all duration-300" style={{ width: `${total > 0 ? (failed / total) * 100 : 0}%` }} />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{done} rows processed</span>
                    <button type="button" onClick={onRestore} className="text-xs text-primary underline-offset-2 hover:underline">
                        View Full Progress
                    </button>
                </div>
            </div>
        );
        if (toastIdRef.current) {
            toast.custom(() => toastContent, { id: toastIdRef.current as string, duration: Infinity });
        } else {
            const id = toast.custom(() => toastContent, { duration: Infinity });
            toastIdRef.current = id;
        }
    }, []);

    const handleRestore = useCallback(() => {
        setIsMinimized(false);
        if (toastIdRef.current) { toast.dismiss(toastIdRef.current); toastIdRef.current = null; }
    }, []);

    // ── File select ──────────────────────────────────────────────────────────
    const handleFileSelect = (file: File) => {
        const isValid = file.name.endsWith('.csv') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.type === 'text/csv';
        if (!isValid) {
            toast.error('Please select a CSV file.');
            return;
        }
        setSelectedFile(file);
        setFileError(null);
        setParsedData(null);
        if (phase === 'ready') setPhase('idle');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
    };

    // ── Validate ──────────────────────────────────────────────────────────────
    const handleValidate = async () => {
        if (!selectedFile) return;
        setPhase('validating');
        setFileError(null);

        try {
            const result = await parseRoomFile(selectedFile);

            if (result.globalError) {
                setFileError(result.globalError);
                setPhase('idle');
                toast.error('Validation Failed', { description: result.globalError });
                return;
            }

            const rowsWithErrors = result.rows.filter(r => r.errors.length > 0);
            setParsedData(result);

            if (rowsWithErrors.length > 0) {
                setFileError(`${rowsWithErrors.length} row(s) have validation errors. Fix them before importing.`);
                setPhase('idle');
                toast.error('Validation Failed', { description: `${rowsWithErrors.length} row(s) need attention.` });
            } else {
                setPhase('ready');
                toast.success('File validated', { description: `${result.rows.length} rooms ready to import!` });
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to parse file.';
            setFileError(msg);
            setPhase('idle');
            toast.error('Validation Failed', { description: msg });
        }
    };

    // ── Upload ────────────────────────────────────────────────────────────────
    const handleUpload = async () => {
        if (!selectedFile) return;

        const sessionId = crypto.randomUUID();
        setImportResult({ totalRows: 0, successCount: 0, failureCount: 0, errors: [], events: [] });
        setPhase('uploading');

        const sseUrl = buildSseUrl(sessionId);
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.addEventListener('ROW_SUCCESS', (e) => {
            const data: SseRowEvent = JSON.parse(e.data);
            setImportResult(prev => {
                const next = { ...prev, successCount: prev.successCount + 1, events: [...prev.events, data] };
                if (isMinimized) showProgressToast(next.successCount, next.failureCount, next.totalRows, handleRestore);
                return next;
            });
        });

        eventSource.addEventListener('ROW_FAILURE', (e) => {
            const data: SseRowEvent = JSON.parse(e.data);
            setImportResult(prev => {
                const next = {
                    ...prev,
                    failureCount: prev.failureCount + 1,
                    errors: [...prev.errors, `Row ${data.rowNumber} (${data.identifier}): ${data.errorMessage}`],
                    events: [...prev.events, data],
                };
                if (isMinimized) showProgressToast(next.successCount, next.failureCount, next.totalRows, handleRestore);
                return next;
            });
        });

        eventSource.addEventListener('JOB_COMPLETE', (e) => {
            const data = JSON.parse(e.data);
            setImportResult(prev => ({ ...prev, status: 'complete', totalRows: data.totalRows, successCount: data.successCount, failureCount: data.failureCount }));
            eventSource.close();
            setPhase('complete');
            setIsMinimized(false);
            if (toastIdRef.current) { toast.dismiss(toastIdRef.current); toastIdRef.current = null; }
            queryClient.invalidateQueries({ queryKey: ['academics', 'rooms'] });
            if (data.failureCount === 0) {
                toast.success(`Successfully imported ${data.successCount} rooms!`);
            } else {
                toast.warning(`Imported ${data.successCount} rooms with ${data.failureCount} errors.`);
            }
        });

        eventSource.onerror = () => { eventSource.close(); };

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            await api.post('/auth/bulk-import/rooms', formData, {
                headers: { 'Content-Type': 'multipart/form-data', 'X-Session-Id': sessionId },
            });
        } catch (err: any) {
            eventSource.close();
            const msg = err?.response?.data?.message || 'Upload failed. Please check your CSV format.';
            setImportResult(prev => ({ ...prev, errors: [...prev.errors, msg] }));
            setPhase('complete');
            toast.error(msg);
        }
    };

    const progressPercent = importResult.totalRows > 0
        ? Math.round(((importResult.successCount + importResult.failureCount) / importResult.totalRows) * 100)
        : phase === 'uploading' ? undefined : 0;

    const isValidating = phase === 'validating';
    const canValidate = !!selectedFile && phase !== 'uploading' && phase !== 'validating';
    const canImport = phase === 'ready';
    const totalValidationErrors = parsedData?.rows.reduce((sum, r) => sum + r.errors.length, 0) ?? 0;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" />
                        Bulk Import Rooms
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to import multiple rooms at once. Validate first to catch errors before importing.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Download Template */}
                    <div className="flex items-center justify-between bg-muted/30 rounded-lg border border-border/50 p-3">
                        <div className="flex items-center gap-3">
                            <FileSpreadsheet className="w-4 h-4 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Download Template</p>
                                <p className="text-xs text-muted-foreground">Pre-filled CSV with sample data & all valid values</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={downloadRoomTemplate} className="gap-2">
                            <Download className="w-4 h-4" /> Template
                        </Button>
                    </div>

                    <AnimatePresence mode="wait">
                        {/* ── IDLE / VALIDATING / READY ── */}
                        {(phase === 'idle' || phase === 'validating' || phase === 'ready') && (
                            <motion.div
                                key="file-section"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="space-y-4"
                            >
                                {/* Drop zone */}
                                <div
                                    className={cn(
                                        'relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer',
                                        dragActive ? 'border-primary bg-primary/5' :
                                        selectedFile && !fileError ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' :
                                        selectedFile && fileError ? 'border-destructive/50 bg-destructive/5' :
                                        'border-border hover:border-primary/30 hover:bg-muted/20',
                                        isValidating && 'pointer-events-none opacity-60'
                                    )}
                                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                    onDragLeave={() => setDragActive(false)}
                                    onDrop={handleDrop}
                                    onClick={() => !isValidating && fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                    />
                                    {selectedFile ? (
                                        <div className="flex flex-col items-center gap-1.5">
                                            <FileSpreadsheet className={cn('w-7 h-7', fileError ? 'text-destructive' : 'text-green-600')} />
                                            <p className="text-sm font-semibold text-foreground">{selectedFile.name}</p>
                                            <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFileError(null); setParsedData(null); setPhase('idle'); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                className="mt-0.5 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                            >
                                                <X className="h-2.5 w-2.5" /> Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="w-7 h-7 text-muted-foreground/50" />
                                            <p className="text-sm font-medium">Drop CSV / Excel here or <span className="text-primary underline">browse</span></p>
                                            <p className="text-xs text-muted-foreground">Columns: name, roomType, seatingType, rowCount, building…</p>
                                        </div>
                                    )}
                                </div>

                                {/* File-level error */}
                                {fileError && (
                                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        {fileError}
                                    </motion.div>
                                )}

                                {/* Ready banner */}
                                {phase === 'ready' && (
                                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-2.5 text-sm font-medium text-green-700 dark:text-green-400">
                                        <ShieldCheck className="h-4 w-4" />
                                        File validated — {parsedData?.rows.length} rooms ready to import
                                    </motion.div>
                                )}

                                {/* Data Preview Table */}
                                {parsedData && parsedData.rows.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                                            Preview ({parsedData.rows.length} rows)
                                            {totalValidationErrors > 0 && (
                                                <Badge variant="destructive" className="ml-1 text-[10px]">{totalValidationErrors} error{totalValidationErrors !== 1 ? 's' : ''}</Badge>
                                            )}
                                        </p>
                                        <div className="max-h-60 overflow-auto rounded-lg border border-border bg-background text-left shadow-sm">
                                            <table className="w-full text-xs">
                                                <thead className="sticky top-0 bg-muted/95 backdrop-blur text-muted-foreground border-b">
                                                    <tr>
                                                        <th className="px-3 py-2 text-center w-10">#</th>
                                                        <th className="px-3 py-2">Name</th>
                                                        <th className="px-3 py-2">Room Type</th>
                                                        <th className="px-3 py-2">Seating</th>
                                                        <th className="px-3 py-2">Building</th>
                                                        <th className="px-3 py-2 text-center">Floor</th>
                                                        <th className="px-3 py-2">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/50">
                                                    {parsedData.rows.map((row) => {
                                                        const hasError = row.errors.length > 0;
                                                        return (
                                                            <tr key={row.rowNumber} className={cn('hover:bg-muted/30 transition-colors', hasError && 'bg-destructive/5')}>
                                                                <td className="px-3 py-2 text-center text-muted-foreground">{row.rowNumber}</td>
                                                                <td className="px-3 py-2 font-medium max-w-[120px] truncate" title={row.data['name']}>{row.data['name'] || <span className="text-destructive italic">missing</span>}</td>
                                                                <td className="px-3 py-2">
                                                                    <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                                                        {row.data['roomtype'] || '—'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-muted-foreground">{row.data['seatingtype'] || '—'}</td>
                                                                <td className="px-3 py-2 text-muted-foreground max-w-[100px] truncate">{row.data['building'] || <span className="text-destructive italic">missing</span>}</td>
                                                                <td className="px-3 py-2 text-center text-muted-foreground">{row.data['floornumber'] ?? '—'}</td>
                                                                <td className="px-3 py-2">
                                                                    {hasError ? (
                                                                        <div className="space-y-0.5">
                                                                            {row.errors.map((err, i) => (
                                                                                <p key={i} className="flex items-start gap-1 text-[10px] text-destructive">
                                                                                    <XCircle className="h-2.5 w-2.5 shrink-0 mt-0.5" />
                                                                                    {err}
                                                                                </p>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                                                                            <CheckCircle2 className="h-2.5 w-2.5" /> OK
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Action buttons */}
                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                    <Button variant="outline" onClick={handleValidate} disabled={!canValidate || isValidating} className="gap-2">
                                        {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                        {isValidating ? 'Validating…' : 'Validate File'}
                                    </Button>
                                    <Button onClick={handleUpload} disabled={!canImport} className="gap-2">
                                        <Upload className="h-4 w-4" />
                                        Start Import ({parsedData?.rows.length ?? 0} rooms)
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* ── UPLOADING ── */}
                        {phase === 'uploading' && (
                            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {isMinimized ? (
                                    <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            Import running in background…
                                        </div>
                                        <Button variant="outline" size="sm" onClick={handleRestore} className="gap-1.5 h-7 text-xs">
                                            <Maximize2 className="w-3.5 h-3.5" /> Show Progress
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                            <p className="text-sm font-medium flex-1">Importing rooms…</p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsMinimized(true);
                                                    showProgressToast(importResult.successCount, importResult.failureCount, importResult.totalRows, handleRestore);
                                                }}
                                                title="Minimize to toast"
                                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                            >
                                                <Minimize2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <Progress value={progressPercent} className="h-2" />
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-green-600 font-medium">{importResult.successCount} success</span>
                                            {importResult.failureCount > 0 && <span className="text-red-600 font-medium">{importResult.failureCount} failed</span>}
                                        </div>
                                        <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3 space-y-1.5">
                                            {importResult.events.map((evt, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs">
                                                    {evt.errorMessage ? <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                                                    <span className="text-muted-foreground">Row {evt.rowNumber}:</span>
                                                    <span className="font-medium truncate">{evt.identifier}</span>
                                                    {evt.errorMessage && <span className="text-red-500 truncate ml-auto">— {evt.errorMessage}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ── COMPLETE ── */}
                        {phase === 'complete' && (
                            <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <div className={cn('rounded-lg border p-4', importResult.failureCount === 0 ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800')}>
                                    <div className="flex items-center gap-3 mb-3">
                                        {importResult.failureCount === 0 ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <AlertCircle className="w-6 h-6 text-amber-600" />}
                                        <h4 className="font-semibold">{importResult.failureCount === 0 ? 'Import Complete!' : 'Import Completed with Errors'}</h4>
                                    </div>
                                    <div className="flex gap-3 flex-wrap">
                                        <Badge variant="secondary">Total: {importResult.totalRows}</Badge>
                                        <Badge className="bg-green-600 hover:bg-green-700 text-white">Success: {importResult.successCount}</Badge>
                                        {importResult.failureCount > 0 && <Badge variant="destructive">Failed: {importResult.failureCount}</Badge>}
                                    </div>
                                </div>

                                {importResult.errors.length > 0 && (
                                    <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-3 space-y-1.5">
                                        {importResult.errors.map((err, i) => (
                                            <div key={i} className="flex items-start gap-2 text-xs">
                                                <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-red-700 dark:text-red-400">{err}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Button variant="outline" className="w-full" onClick={resetState}>
                                    Import Another File
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
