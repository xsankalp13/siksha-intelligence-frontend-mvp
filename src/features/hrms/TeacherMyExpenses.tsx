import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Paperclip, Receipt, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/features/hrms/components/EmptyState";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { executeMediaUpload } from "@/lib/mediaUploadAdapter";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import { cn } from "@/lib/utils";
import type { ExpenseCategory, ExpenseClaimDTO, ExpenseClaimStatus } from "@/services/types/hrms";

const STATUS_BADGE: Record<ExpenseClaimStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600 border-gray-200",
  SUBMITTED: "bg-blue-100 text-blue-700 border-blue-300",
  APPROVED: "bg-amber-100 text-amber-700 border-amber-300",
  REJECTED: "bg-red-100 text-red-700 border-red-300",
  PAID: "bg-green-100 text-green-700 border-green-300",
};

const ACCENT_LINE: Record<ExpenseClaimStatus, string> = {
  SUBMITTED: "border-l-blue-500",
  APPROVED: "border-l-amber-500",
  PAID: "border-l-emerald-500",
  REJECTED: "border-l-red-400",
  DRAFT: "border-l-gray-300",
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRAVEL: "Travel",
  FOOD: "Food",
  ACCOMMODATION: "Accommodation",
  SUPPLIES: "Supplies",
  COMMUNICATION: "Communication",
  OTHER: "Other",
};

const DEFAULT_CATEGORY: ExpenseCategory = "TRAVEL";

// ---- Detail modal ----

function ExpenseDetailModal({
  claim,
  onClose,
}: {
  claim: ExpenseClaimDTO | null;
  onClose: () => void;
}) {
  const { formatCurrency, formatDate } = useHrmsFormatters();
  if (!claim) return null;
  const badgeCls = STATUS_BADGE[claim.status] ?? "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <Dialog open={!!claim} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-base">{claim.title}</DialogTitle>
              {claim.submittedAt && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Submitted on {formatDate(claim.submittedAt)}
                </p>
              )}
            </div>
            <span className={cn("shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border", badgeCls)}>
              {claim.status}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total amount highlight */}
          <div className="rounded-lg bg-muted/40 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Claimed</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(claim.totalAmount)}</p>
          </div>

          {/* Line items */}
          {claim.items.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-semibold">Expense Items</p>
                <div className="space-y-2">
                  {claim.items.map((item) => (
                    <div key={item.uuid} className="rounded-lg border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_LABELS[item.category]}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{item.description}</p>
                          {item.expenseDate && (
                            <p className="text-xs text-muted-foreground">{formatDate(item.expenseDate)}</p>
                          )}
                        </div>
                        <p className="shrink-0 text-sm font-bold">{formatCurrency(item.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between border-t pt-2 text-sm font-bold">
                <span>Total</span>
                <span className="text-emerald-600">{formatCurrency(claim.totalAmount)}</span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Main component ----

export default function TeacherMyExpenses() {
  const qc = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ExpenseClaimDTO | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().substring(0, 10));
  const [itemDescription, setItemDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>(DEFAULT_CATEGORY);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ["hrms", "self", "expense-claims"],
    queryFn: () => hrmsService.listMyExpenseClaims().then((r) => r.data),
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setAmount(""); setItemDescription("");
    setExpenseDate(new Date().toISOString().substring(0, 10));
    setCategory(DEFAULT_CATEGORY); setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title || !amount) throw new Error("Title and amount are required.");
      let receiptUrl: string | undefined;
      if (receiptFile) {
        const instruction = await hrmsService
          .expenseReceiptUploadInit({ fileName: receiptFile.name, contentType: receiptFile.type || "application/octet-stream", sizeBytes: receiptFile.size })
          .then((r) => r.data);
        const result = await executeMediaUpload(receiptFile, instruction);
        receiptUrl = result.secureUrl;
      }
      const claim = await hrmsService.createMyExpenseClaim({ title, description: description || undefined });
      await hrmsService.addMyExpenseItem(claim.data.uuid, {
        category, description: itemDescription || title,
        amount: parseFloat(amount), expenseDate, receiptUrl,
      });
      return hrmsService.submitMyExpenseClaim(claim.data.uuid);
    },
    onSuccess: () => {
      toast.success("Expense claim submitted");
      qc.invalidateQueries({ queryKey: ["hrms", "self", "expense-claims"] });
      setOpen(false); resetForm();
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  const submitted = claims.filter((c: ExpenseClaimDTO) => c.status === "SUBMITTED");
  const approved = claims.filter((c: ExpenseClaimDTO) => c.status === "APPROVED" || c.status === "PAID");
  const rejected = claims.filter((c: ExpenseClaimDTO) => c.status === "REJECTED" || c.status === "DRAFT");

  const totalApprovedAmt = approved.reduce((s: number, c: ExpenseClaimDTO) => s + (c.totalAmount ?? 0), 0);
  const totalSubmittedAmt = submitted.reduce((s: number, c: ExpenseClaimDTO) => s + (c.totalAmount ?? 0), 0);

  const renderClaim = (claim: ExpenseClaimDTO) => {
    const badgeCls = STATUS_BADGE[claim.status] ?? "bg-gray-100 text-gray-600 border-gray-200";
    const accentLine = ACCENT_LINE[claim.status] ?? "border-l-gray-300";
    return (
      <Card key={claim.uuid} className={cn("border-l-4", accentLine)}>
        <CardContent className="py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{claim.title}</p>
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", badgeCls)}>
                  {claim.status}
                </span>
              </div>
              {claim.submittedAt && (
                <p className="text-xs text-muted-foreground">Submitted {formatDate(claim.submittedAt)}</p>
              )}
              <div className="flex flex-wrap gap-1">
                {claim.items.map((item) => (
                  <Badge key={item.uuid} variant="outline" className="text-[10px]">
                    {CATEGORY_LABELS[item.category]}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <p className="text-sm font-bold text-emerald-600">{formatCurrency(claim.totalAmount)}</p>
              <Button
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 h-7 text-xs"
                onClick={() => setSelected(claim)}
              >
                View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              🧾
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">My Expense Claims</h2>
              <p className="text-sm text-white/70">Submit and track expense reimbursements</p>
            </div>
          </div>
          <Button
            onClick={() => setOpen(true)}
            className="bg-white text-emerald-700 hover:bg-white/90 font-semibold gap-1.5 shadow-sm"
          >
            ➕ New Expense Claim
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      {claims.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Claims", value: String(claims.length), color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { label: "Pending Review", value: String(submitted.length), color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "Approved / Paid Amount", value: formatCurrency(totalApprovedAmt), color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
            { label: "Submitted Amount", value: formatCurrency(totalSubmittedAmt), color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
          ].map(({ label, value, color, bg }) => (
            <Card key={label} className={`border ${bg}`}>
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("mt-1 text-xl font-bold", color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="submitted">
        <TabsList>
          <TabsTrigger value="submitted">
            Submitted
            {submitted.length > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5 text-xs" variant="secondary">
                {submitted.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approved / Paid</TabsTrigger>
          <TabsTrigger value="rejected">Rejected / Draft</TabsTrigger>
        </TabsList>

        <TabsContent value="submitted" className="mt-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : submitted.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No submitted claims"
              description="Create and submit expense reimbursement claims."
              actionLabel="New Expense Claim"
              onAction={() => setOpen(true)}
            />
          ) : submitted.map(renderClaim)}
        </TabsContent>

        <TabsContent value="approved" className="mt-4 space-y-3">
          {approved.length === 0 ? (
            <EmptyState icon={Receipt} title="No approved claims" description="Approved and paid claims will appear here." />
          ) : approved.map(renderClaim)}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4 space-y-3">
          {rejected.length === 0 ? (
            <EmptyState icon={Receipt} title="No rejected or draft claims" description="" />
          ) : rejected.map(renderClaim)}
        </TabsContent>
      </Tabs>

      {/* Detail modal */}
      <ExpenseDetailModal claim={selected} onClose={() => setSelected(null)} />

      {/* Submit dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Expense Claim</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRAVEL">Travel</SelectItem>
                    <SelectItem value="FOOD">Food</SelectItem>
                    <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                    <SelectItem value="SUPPLIES">Supplies</SelectItem>
                    <SelectItem value="COMMUNICATION">Communication</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                  <Input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-7" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Item Description</Label>
              <Input value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expense Date</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Receipt</Label>
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)} />
              {receiptFile ? (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-xs">{receiptFile.name}</span>
                  <button type="button" onClick={() => { setReceiptFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="rounded-sm text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="mr-2 h-4 w-4" />Attach Receipt
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
            <Button disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
