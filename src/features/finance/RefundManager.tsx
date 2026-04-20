import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RotateCcw, Plus, CheckCircle2, Clock, XCircle, Loader2,
  IndianRupee, Search, User, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { financeService } from "@/services/finance";
type RefundRecord = any;
import { formatINR } from "../finance/utils/financeUtils";

type RefundStatus = RefundRecord["status"];

const STATUS_CFG: Record<RefundStatus, { icon: React.ElementType; cls: string; bg: string; label: string }> = {
  REQUESTED: { icon: Clock, cls: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30", label: "Requested" },
  APPROVED: { icon: CheckCircle2, cls: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30", label: "Approved" },
  REJECTED: { icon: XCircle, cls: "text-rose-600", bg: "bg-rose-500/10 border-rose-500/30", label: "Rejected" },
  PROCESSED: { icon: CheckCircle2, cls: "text-violet-600", bg: "bg-violet-500/10 border-violet-500/30", label: "Processed" },
};

const METHOD_LABELS: Record<RefundRecord["refundMethod"], string> = {
  ORIGINAL_METHOD: "Original Method",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_NOTE: "Credit Note",
};

const PIPELINE_STEPS: RefundStatus[] = ["REQUESTED", "APPROVED", "PROCESSED"];

function RefundPipeline({ status }: { status: RefundStatus }) {
  const activeIdx = PIPELINE_STEPS.indexOf(status);
  const isRejected = status === "REJECTED";

  return (
    <div className="flex items-center gap-1">
      {PIPELINE_STEPS.map((step, i) => {
        const done = !isRejected && i <= activeIdx;
        const active = !isRejected && i === activeIdx;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full transition-all ${done ? "bg-emerald-500" : "bg-muted"
              } ${active ? "ring-2 ring-emerald-500/30" : ""}`} />
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={`h-0.5 w-5 rounded-full transition-all ${i < activeIdx && !isRejected ? "bg-emerald-500" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
      {isRejected && <span className="text-[9px] font-bold text-rose-600 ml-1">REJECTED</span>}
    </div>
  );
}

export function RefundManager() {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [processing, setProcessing] = useState<number | null>(null);
  const [form, setForm] = useState({
    studentId: "", studentName: "", paymentId: "", invoiceNumber: "",
    refundAmount: "", reason: "", refundMethod: "ORIGINAL_METHOD" as RefundRecord["refundMethod"],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await financeService.getRefunds();
      setRefunds(res.data);
    } catch (err) {
      toast.error("Failed to fetch refunds");
    } finally {
      setLoading(false);
    }
  };

  const statsMap = refunds.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalRefunded = refunds
    .filter((r) => r.status === "PROCESSED")
    .reduce((a, r) => a + r.refundAmount, 0);

  const filtered = refunds.filter((r) => {
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchSearch = !search ||
      r.studentName.toLowerCase().includes(search.toLowerCase()) ||
      String(r.studentId).includes(search) ||
      r.invoiceNumber.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleAction = async (id: number, action: "approve" | "reject" | "process") => {
    setProcessing(id);
    
    const statusMap: Record<string, string> = {
      approve: "APPROVED",
      reject: "REJECTED",
      process: "PROCESSED",
    };

    try {
      await financeService.updateRefundStatus(id, statusMap[action]);
      toast.success(`Refund ${action}d successfully`);
      fetchData();
    } catch (err) {
      toast.error(`Failed to ${action} refund`);
    } finally {
      setProcessing(null);
    }
  };

  const handleCreate = async () => {
    if (!form.studentId || !form.studentName || !form.refundAmount || !form.reason) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      const data = {
        studentId: Number(form.studentId),
        studentName: form.studentName,
        paymentId: form.paymentId ? Number(form.paymentId) : null,
        invoiceNumber: form.invoiceNumber,
        refundAmount: Number(form.refundAmount),
        reason: form.reason,
        refundMethod: form.refundMethod,
      };
      await financeService.requestRefund(data);
      toast.success("Refund request submitted");
      setIsDialogOpen(false);
      setForm({ studentId: "", studentName: "", paymentId: "", invoiceNumber: "", refundAmount: "", reason: "", refundMethod: "ORIGINAL_METHOD" });
      fetchData();
    } catch (err) {
      toast.error("Failed to request refund");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header + Stats */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h3 className="text-base font-bold">Refund Management</h3>
          <p className="text-xs text-muted-foreground">Track and process student fee refunds</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(["REQUESTED", "APPROVED", "PROCESSED"] as RefundStatus[]).map((s) => {
            const cfg = STATUS_CFG[s];
            const Icon = cfg.icon;
            return (
              <div key={s} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cfg.bg} text-xs font-bold ${cfg.cls}`}>
                <Icon className="h-3.5 w-3.5" />
                <span>{cfg.label}:</span>
                <span className="font-black">{statsMap[s] || 0}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-xs font-bold text-emerald-600">
            <IndianRupee className="h-3.5 w-3.5" />
            <span>Refunded:</span>
            <span className="font-black">{formatINR(totalRefunded)}</span>
          </div>
        </div>
      </div>

      {/* Filters + Action */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-8 h-9 w-52 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="REQUESTED">Requested</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="PROCESSED">Processed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-2 h-9">
          <Plus className="h-3.5 w-3.5" /> New Refund Request
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <RotateCcw className="mx-auto h-8 w-8 mb-2 opacity-20" />
                  No refund records match your filters.
                </TableCell>
              </TableRow>
            ) : filtered.map((r) => {
              const cfg = STATUS_CFG[r.status];
              const StatusIcon = cfg.icon;
              const isLoading = processing === r.id;
              return (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <div className="text-sm font-bold">#{r.studentId}</div>
                        <div className="text-[10px] text-muted-foreground">{r.studentName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-mono font-medium">{r.invoiceNumber || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-black text-sm">{formatINR(r.refundAmount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{METHOD_LABELS[r.refundMethod]}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{r.reason}</TableCell>
                  <TableCell><RefundPipeline status={r.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.requestedAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          {r.status === "REQUESTED" && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                onClick={() => handleAction(r.id, "approve")}>Approve</Button>
                              <Button variant="ghost" size="sm" className="h-7 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                                onClick={() => handleAction(r.id, "reject")}>Reject</Button>
                            </>
                          )}
                          {r.status === "APPROVED" && (
                            <Button variant="ghost" size="sm" className="h-7 text-[10px] text-violet-600 hover:text-violet-700 hover:bg-violet-500/10"
                              onClick={() => handleAction(r.id, "process")}>Mark Processed</Button>
                          )}
                          {(r.status === "PROCESSED" || r.status === "REJECTED") && (
                            <Badge variant="outline" className={`text-[9px] font-black border ${cfg.bg} ${cfg.cls}`}>
                              <StatusIcon className="h-3 w-3 mr-1" /> {cfg.label}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Refund Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Student ID *</label>
                <Input placeholder="1001" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Student Name *</label>
                <Input placeholder="Full name" value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Payment ID</label>
                <Input placeholder="5001" value={form.paymentId} onChange={(e) => setForm({ ...form, paymentId: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Invoice Number</label>
                <Input placeholder="INV-2024-0001" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Refund Amount (₹) *</label>
                <Input type="number" placeholder="5000" value={form.refundAmount} onChange={(e) => setForm({ ...form, refundAmount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Refund Method *</label>
                <Select value={form.refundMethod} onValueChange={(v) => setForm({ ...form, refundMethod: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ORIGINAL_METHOD">Original Method</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CREDIT_NOTE">Credit Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Reason *</label>
              <Input placeholder="Reason for refund" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Submit Request</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
