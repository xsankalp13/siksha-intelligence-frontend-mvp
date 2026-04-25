import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Paperclip,  Receipt, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/features/hrms/components/EmptyState";
import { useHrmsFormatters } from "@/features/hrms/hooks/useHrmsFormatters";
import { executeMediaUpload } from "@/lib/mediaUploadAdapter";
import { hrmsService, normalizeHrmsError } from "@/services/hrms";
import type { ExpenseCategory, ExpenseClaimStatus } from "@/services/types/hrms";

const STATUS_COLORS: Record<ExpenseClaimStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  APPROVED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

const DEFAULT_CATEGORY: ExpenseCategory = "TRAVEL";

export default function TeacherMyExpenses() {
  const qc = useQueryClient();
  const { formatCurrency, formatDate } = useHrmsFormatters();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
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
    setTitle("");
    setDescription("");
    setAmount("");
    setItemDescription("");
    setExpenseDate(new Date().toISOString().substring(0, 10));
    setCategory(DEFAULT_CATEGORY);
    setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title || !amount) throw new Error("Title and amount are required.");

      let receiptUrl: string | undefined;
      if (receiptFile) {
        const instruction = await hrmsService
          .expenseReceiptUploadInit({
            fileName: receiptFile.name,
            contentType: receiptFile.type || "application/octet-stream",
            sizeBytes: receiptFile.size,
          })
          .then((r) => r.data);
        const result = await executeMediaUpload(receiptFile, instruction);
        receiptUrl = result.secureUrl;
      }

      const claim = await hrmsService.createMyExpenseClaim({ title, description: description || undefined });
      await hrmsService.addMyExpenseItem(claim.data.uuid, {
        category,
        description: itemDescription || title,
        amount: parseFloat(amount),
        expenseDate,
        receiptUrl,
      });
      return hrmsService.submitMyExpenseClaim(claim.data.uuid);
    },
    onSuccess: () => {
      toast.success("Expense claim submitted");
      qc.invalidateQueries({ queryKey: ["hrms", "self", "expense-claims"] });
      setOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(normalizeHrmsError(err).message),
  });

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl shadow-inner">
              🧭
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

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : claims.length === 0 ? (
        <EmptyState icon={Receipt} title="No expense claims" description="Create and submit expense reimbursement claims." />
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <Card key={claim.uuid}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{claim.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{claim.submittedAt ? `Submitted ${formatDate(claim.submittedAt)}` : "Draft"}</p>
                  </div>
                  <Badge variant="secondary" className={STATUS_COLORS[claim.status]}>{claim.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-sm">{formatCurrency(claim.totalAmount)}</p>
                {claim.items.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{claim.items.length} item(s)</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Expense Claim</DialogTitle></DialogHeader>
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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">₹</span>
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
              {receiptFile ? (
                <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-xs">{receiptFile.name}</span>
                  <button
                    type="button"
                    onClick={() => { setReceiptFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="rounded-sm text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="mr-2 h-4 w-4" />
                  Attach Receipt
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
