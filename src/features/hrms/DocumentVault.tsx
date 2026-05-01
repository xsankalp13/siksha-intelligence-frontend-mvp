import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  Download,
  FileText,
  Loader2,
  
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { DocumentCategory, StaffDocumentDTO } from "@/services/types/hrms";
import { executeMediaUpload } from "@/lib/mediaUploadAdapter";
import EmptyState from "@/features/hrms/components/EmptyState";
import ReviewDialog from "@/features/hrms/components/ReviewDialog";
import StaffSearchSelect from "@/features/hrms/components/StaffSearchSelect";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  OFFER_LETTER: "Offer Letter",
  APPOINTMENT_LETTER: "Appointment Letter",
  CONTRACT: "Contract",
  ID_PROOF: "ID Proof",
  PAN_CARD: "PAN Card",
  AADHAR_CARD: "Aadhar Card",
  EDUCATIONAL_CERTIFICATE: "Educational Certificate",
  EXPERIENCE_LETTER: "Experience Letter",
  RESIGNATION_LETTER: "Resignation Letter",
  OTHER: "Other",
};

const CATEGORY_COLORS: Record<DocumentCategory, string> = {
  OFFER_LETTER: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  APPOINTMENT_LETTER: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  CONTRACT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  ID_PROOF: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  PAN_CARD: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  AADHAR_CARD: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  EDUCATIONAL_CERTIFICATE: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  EXPERIENCE_LETTER: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  RESIGNATION_LETTER: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadFormState {
  file: File | null;
  category: DocumentCategory | "";
  displayName: string;
  expiryDate: string;
}

export default function DocumentVault() {
  const qc = useQueryClient();
  const { formatDate } = useHrmsFormatters();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffDocumentDTO | null>(null);
  const [form, setForm] = useState<UploadFormState>({
    file: null,
    category: "",
    displayName: "",
    expiryDate: "",
  });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["hrms", "documents", selectedStaff],
    queryFn: () =>
      selectedStaff
        ? hrmsService.listDocuments(selectedStaff).then((r) => r.data)
        : Promise.resolve([] as StaffDocumentDTO[]),
    enabled: !!selectedStaff,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!form.file || !form.category || !form.displayName || !selectedStaff) {
        throw new Error("Please fill all required fields and select a file.");
      }
      const initResp = await hrmsService.documentUploadInit(selectedStaff, {
        fileName: form.file.name,
        contentType: form.file.type || "application/octet-stream",
        sizeBytes: form.file.size,
        category: form.category as DocumentCategory,
        displayName: form.displayName,
        expiryDate: form.expiryDate || undefined,
      });
      const instruction = initResp.data;
      const uploadResult = await executeMediaUpload(form.file, instruction);
      await hrmsService.documentUploadComplete(selectedStaff, {
        objectKey: uploadResult.objectKey,
        storageUrl: uploadResult.secureUrl,
        contentType: form.file.type || "application/octet-stream",
        sizeBytes: form.file.size,
        etag: uploadResult.etag,
        category: form.category as DocumentCategory,
        displayName: form.displayName,
        expiryDate: form.expiryDate || undefined,
        originalFileName: form.file.name,
      });
    },
    onSuccess: () => {
      toast.success("Document uploaded successfully");
      qc.invalidateQueries({ queryKey: ["hrms", "documents", selectedStaff] });
      setUploadOpen(false);
      setForm({ file: null, category: "", displayName: "", expiryDate: "" });
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const deleteMutation = useMutation({
    mutationFn: (doc: StaffDocumentDTO) =>
      hrmsService.deleteDocument(doc.staffRef, doc.uuid),
    onSuccess: () => {
      toast.success("Document deleted");
      qc.invalidateQueries({ queryKey: ["hrms", "documents", selectedStaff] });
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const handleDownload = async (doc: StaffDocumentDTO) => {
    try {
      const resp = await hrmsService.getDocumentDownloadUrl(doc.staffRef, doc.uuid);
      window.open(resp.data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(normalizeHrmsError(err).message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => ({
      ...prev,
      file,
      displayName: prev.displayName || (file ? file.name.replace(/\.[^.]+$/, "") : ""),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              🗄️
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Document Vault</h2>
              <p className="text-sm text-white/70">Securely store and manage staff documents</p>
            </div>
          </div>
          {selectedStaff && (
            <Button onClick={() => setUploadOpen(true)} className="bg-white text-purple-700 hover:bg-white/90 font-semibold shadow-sm gap-1.5">
              ⬆️ Upload Document
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <StaffSearchSelect
            value={selectedStaff}
            onChange={(uuid) => setSelectedStaff(uuid)}
            label="Filter by Staff Member"
            placeholder="Search and select a staff member..."
          />
        </CardContent>
      </Card>

      {!selectedStaff ? (
        <EmptyState
          icon={Archive}
          title="No staff selected"
          description="Search for a staff member above to view their documents."
        />
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="Upload the first document for this staff member."
          actionLabel="Upload Document"
          onAction={() => setUploadOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <Card key={doc.uuid} className="group relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <CardTitle className="truncate text-sm font-medium">
                      {doc.displayName}
                    </CardTitle>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(doc)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge
                  variant="secondary"
                  className={CATEGORY_COLORS[doc.category]}
                >
                  {CATEGORY_LABELS[doc.category]}
                </Badge>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatBytes(doc.sizeBytes)}</span>
                  <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                </div>
                {doc.expiryDate && (
                  <p
                    className={`text-xs font-medium ${
                      doc.isExpired ? "text-destructive" : "text-amber-600"
                    }`}
                  >
                    {doc.isExpired ? "Expired" : "Expires"}: {formatDate(doc.expiryDate)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                File <span className="text-destructive">*</span>
              </Label>
              <div
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 transition-colors hover:border-primary/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {form.file ? form.file.name : "Click to select a file"}
                </p>
                {form.file && (
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(form.file.size)}
                  </p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, category: v as DocumentCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.displayName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, displayName: e.target.value }))
                }
                placeholder="e.g. Joining Agreement 2024"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Expiry Date (optional)</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, expiryDate: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                uploadMutation.isPending ||
                !form.file ||
                !form.category ||
                !form.displayName
              }
              onClick={() => uploadMutation.mutate()}
            >
              {uploadMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ReviewDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete Document"
        description={`Are you sure you want to permanently delete "${deleteTarget?.displayName}"? This action cannot be undone.`}
        severity="danger"
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        isPending={deleteMutation.isPending}
        requireCheckbox
        checkboxLabel="I understand this action is irreversible"
      >
        <div />
      </ReviewDialog>
    </div>
  );
}
