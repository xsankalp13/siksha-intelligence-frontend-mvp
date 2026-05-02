import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Plus, Download, Receipt, DownloadCloud, CheckCircle2, Clock, AlertTriangle, X, FileText, MoreHorizontal, Ban, TimerReset, ChevronLeft, ChevronRight, Filter, History, LayoutList, Eye } from "lucide-react";
import { toast } from "sonner";

import { financeService } from "@/services/finance";
import type { InvoiceResponseDTO, PaymentResponseDTO } from "@/services/types/finance";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { academicClassService, type AcademicClassResponseDto } from "@/services/academicClass";
import { adminService } from "@/services/admin";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    PAID: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-700", icon: CheckCircle2 },
    PENDING: { label: "Pending", cls: "bg-amber-500/10 text-amber-700", icon: Clock },
    OVERDUE: { label: "Overdue", cls: "bg-red-500/10 text-red-700", icon: AlertTriangle },
    CANCELLED: { label: "Cancelled", cls: "bg-muted text-muted-foreground", icon: X },
    DRAFT: { label: "Draft", cls: "bg-blue-500/10 text-blue-700", icon: FileText },
  };
  const cfg = map[status] ?? map["DRAFT"];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

interface InvoicesTabProps {
  invoices: InvoiceResponseDTO[];
  loading: boolean;
  onRefresh: () => void;
}

export function InvoicesTab({ invoices, loading, onRefresh }: InvoicesTabProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponseDTO | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [invoicePayments, setInvoicePayments] = useState<PaymentResponseDTO[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [generateStudentId, setGenerateStudentId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [generationMode, setGenerationMode] = useState<"single" | "bulk">("single");
  const [isGenerating, setIsGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef(false);

  // Filter and Pagination State
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [classes, setClasses] = useState<AcademicClassResponseDto[]>([]);

  // BUG FIX 3: Move the class-fetch into a useEffect.
  // Calling an async API directly in the render body is a React anti-pattern:
  // it triggers on every render, causes memory-leak warnings, and can cause
  // an infinite re-render loop if the state update itself triggers a re-render.
  useEffect(() => {
    if (isInvoiceDialogOpen) {
      academicClassService.getAllClasses().then(setClasses).catch(() => {});
    }
  }, [isInvoiceDialogOpen]);

  const handleGenerateInvoice = async () => {
    if (generationMode === "single") {
      if (!generateStudentId) {
        toast.error("Please enter a Student ID");
        return;
      }
      try {
        setIsGenerating(true);
        await financeService.generateSingleInvoice(parseInt(generateStudentId, 10));
        toast.success(`Invoice generated successfully for student ${generateStudentId}`);
        setGenerateStudentId("");
        setIsInvoiceDialogOpen(false);
        onRefresh();
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        toast.error(error.response?.data?.message || "Failed to generate invoice");
      } finally {
        setIsGenerating(false);
      }
    } else {
      if (!selectedClassId) {
        toast.error("Please select a Class");
        return;
      }
      try {
        setIsGenerating(true);
        // Fetch students for the class (assume max 1000 for bulk)
        const response = await adminService.listStudents({ classId: selectedClassId, size: 1000 });
        const students = response.data.content;

        if (students.length === 0) {
          toast.error("No students found in the selected class.");
          setIsGenerating(false);
          return;
        }

        setBulkProgress({ current: 0, total: students.length });
        abortRef.current = false;

        let successCount = 0;
        let failCount = 0;

        for (const student of students) {
          if (abortRef.current) {
            toast.info("Bulk generation cancelled.");
            break;
          }
          try {
            if (student.studentId) {
              await financeService.generateSingleInvoice(student.studentId);
              successCount++;
            }
          } catch (e) {
            failCount++;
          }
          setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        toast.success(`Bulk generation complete. Success: ${successCount}, Failed: ${failCount}`);
        setGenerateStudentId("");
        setSelectedClassId("");
        setIsInvoiceDialogOpen(false);
        onRefresh();
      } catch (err: unknown) {
        toast.error("Failed to fetch students or perform bulk generation");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  const handleDownloadReceipt = async (invoiceId: number) => {
    try {
      const response = await financeService.getInvoiceReceipt(invoiceId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt_${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download receipt");
    }
  };

  const handleDownloadPaymentReceipt = async (paymentId: number) => {
    try {
      const response = await financeService.getPaymentReceipt(paymentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `payment_receipt_${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download transaction receipt");
    }
  };

  const handleCancelInvoice = async (invoiceId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await financeService.cancelInvoice(invoiceId);
      toast.success(`Invoice #${invoiceId} has been cancelled`);
      onRefresh();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to cancel invoice");
    }
  };

  const handleApplyLateFee = async (invoiceId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await financeService.applyLateFee(invoiceId);
      toast.success(`Late fee applied to Invoice #${invoiceId}`);
      onRefresh();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to apply late fee");
    }
  };

  const handlePayOnline = async (invoice: InvoiceResponseDTO) => {
    try {
      setIsGenerating(true);
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Please check your connection or turn off adblockers.");
        setIsGenerating(false);
        return;
      }

      const { data: orderData } = await financeService.initiatePayment({
        invoiceId: invoice.invoiceId,
        amount: invoice.totalAmount - (invoice.paidAmount || 0),
      });

      const options = {
        key: orderData.clientSecret, // Backend maps Key ID to clientSecret field
        // BUG FIX 4: Use Math.round() to produce a guaranteed integer number of
        // paise and prevent floating-point drift (e.g. 500.10 * 100 = 50009.999...).
        // Razorpay rejects non-integer amounts.
        amount: Math.round((invoice.totalAmount - (invoice.paidAmount || 0)) * 100),
        currency: "INR",
        name: "Shiksha Intelligence",
        description: `Fee Payment for Invoice #${invoice.invoiceNumber}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            setIsGenerating(true);
            await financeService.verifyPayment({
              orderId: response.razorpay_order_id,
              gatewayTransactionId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            toast.success("Payment Received Successfully!");
            onRefresh();
          } catch (err) {
            toast.error("Payment verification failed. Please contact administrator if amount was deducted.");
          } finally {
            setIsGenerating(false);
          }
        },
        prefill: {
          name: `Student ${invoice.studentId}`,
        },
        theme: {
          color: "#0369a1", // Deep sky blue matching professional theme
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not initiate online payment.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;
    try {
      setIsGenerating(true);
      await financeService.recordOfflinePayment({
        invoiceId: selectedInvoice.invoiceId,
        studentId: selectedInvoice.studentId,
        amountPaid: paymentAmount,
        paymentMethod: paymentMethod as any,
        transactionId: paymentRef,
        paymentDate: new Date().toISOString(),
      });
      toast.success(`Payment of ${formatINR(paymentAmount)} recorded for Invoice #${selectedInvoice.invoiceNumber}`);
      setIsPaymentDialogOpen(false);
      setSelectedInvoice(null);
      onRefresh();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to record payment");
    } finally {
      setIsGenerating(false);
    }
  };

  const openInvoiceDetails = (inv: InvoiceResponseDTO) => {
    setSelectedInvoice(inv);
    setIsViewDialogOpen(true);
  };

  useEffect(() => {
    if (selectedInvoice && isViewDialogOpen) {
      fetchInvoicePayments(selectedInvoice.invoiceId);
    }
  }, [selectedInvoice, isViewDialogOpen]);

  const fetchInvoicePayments = async (invoiceId: number) => {
    setLoadingPayments(true);
    try {
      const res = await financeService.getPaymentsByInvoiceId(invoiceId);
      setInvoicePayments(res.data);
    } catch (e) {
      console.error("Failed to fetch payments", e);
    } finally {
      setLoadingPayments(false);
    }
  };

  const openPaymentDialog = (inv: InvoiceResponseDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInvoice(inv);
    setPaymentAmount(inv.totalAmount);
    setPaymentMethod("CASH");
    setPaymentRef("");
    setIsPaymentDialogOpen(true);
  };

  // Logic: Filter and Paginate
  const filteredInvoices = invoices.filter(inv => 
    filterStatus === "ALL" ? true : inv.status === filterStatus
  );

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Invoices & Billing</h3>
          <p className="text-sm text-muted-foreground">Manage generated invoices and download receipts.</p>
        </div>
        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <Button onClick={() => setIsInvoiceDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Generate Invoice
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Automated Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Tabs value={generationMode} onValueChange={(v: string) => setGenerationMode(v as "single" | "bulk")}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="single">Single Student</TabsTrigger>
                  <TabsTrigger value="bulk">Bulk by Class</TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Student ID</label>
                    <Input
                      placeholder="Enter Student ID (e.g. 1001)"
                      value={generateStudentId}
                      onChange={(e) => setGenerateStudentId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      This will generate an invoice based on the assigned fee structure.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="bulk" className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Class</label>
                    <Select value={selectedClassId || undefined} onValueChange={setSelectedClassId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.classId} value={c.classId}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Invoices will be generated for all students enrolled in the selected class.
                    </p>

                    {isGenerating && bulkProgress.total > 0 && (
                      <div className="mt-4 p-3 bg-muted rounded-md text-sm text-center">
                        Processing... {bulkProgress.current} / {bulkProgress.total} records
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4">
                {isGenerating && generationMode === "bulk" && (
                  <Button variant="outline" onClick={() => (abortRef.current = true)}>
                    Cancel
                  </Button>
                )}
                <Button onClick={handleGenerateInvoice} disabled={isGenerating}>
                  {isGenerating ? "Processing..." : "Generate Now"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-muted/30 p-2 rounded-lg border border-border/50">
        <Tabs value={filterStatus} onValueChange={handleFilterChange} className="w-full md:w-auto">
          <TabsList className="bg-background/50">
            <TabsTrigger value="ALL" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="PENDING" className="text-xs px-3">Pending</TabsTrigger>
            <TabsTrigger value="PAID" className="text-xs px-3">Paid</TabsTrigger>
            <TabsTrigger value="OVERDUE" className="text-xs px-3 text-red-600 focus:text-red-600">Overdue</TabsTrigger>
            <TabsTrigger value="CANCELLED" className="text-xs px-3">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
          <Filter className="h-3 w-3" />
          <span>{filteredInvoices.length} results found</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading invoices...</TableCell>
                </TableRow>
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Receipt className="mx-auto h-8 w-8 mb-2 opacity-20" />
                    No {filterStatus.toLowerCase() !== "all" ? filterStatus.toLowerCase() : ""} invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvoices.map((inv) => (
                  <TableRow key={inv.invoiceId} className="cursor-pointer hover:bg-muted/50" onClick={() => openInvoiceDetails(inv)}>
                    <TableCell className="font-medium">#{inv.invoiceNumber}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{inv.studentName || "Unknown Student"}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">ID: {inv.studentId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <span className="font-bold">{formatINR(inv.totalAmount)}</span>
                        <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500" 
                            style={{ width: `${Math.min(100, ((inv.paidAmount || 0) / inv.totalAmount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-emerald-600 font-semibold">{formatINR(inv.paidAmount || 0)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-rose-600 font-bold">{formatINR(inv.totalAmount - (inv.paidAmount || 0))}</span>
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell>{format(new Date(inv.dueDate), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openInvoiceDetails(inv)} className="gap-2">
                            <Eye className="h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          {inv.status === "PENDING" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePayOnline(inv); }} className="gap-2 text-blue-600 font-medium">
                                <DownloadCloud className="h-4 w-4" /> Pay Online (Razorpay)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => openPaymentDialog(inv, e)} className="gap-2 text-emerald-600 font-medium">
                                <CheckCircle2 className="h-4 w-4" /> Collect Offline
                              </DropdownMenuItem>
                            </>
                          )}
                          {(inv.status === "PAID" || (inv.status === "PENDING" && (inv.paidAmount ?? 0) > 0)) && (
                            <DropdownMenuItem onClick={() => handleDownloadReceipt(inv.invoiceId)} className="gap-2">
                              <DownloadCloud className="h-4 w-4" /> Download Receipt
                            </DropdownMenuItem>
                          )}
                          {inv.status === "OVERDUE" && (
                            <DropdownMenuItem onClick={(e) => handleApplyLateFee(inv.invoiceId, e)} className="gap-2 text-amber-600 focus:text-amber-600">
                              <TimerReset className="h-4 w-4" /> Apply Late Fee
                            </DropdownMenuItem>
                          )}
                          {(inv.status === "PENDING" || inv.status === "DRAFT" || inv.status === "OVERDUE") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => handleCancelInvoice(inv.invoiceId, e)} className="gap-2 text-destructive focus:text-destructive">
                                <Ban className="h-4 w-4" /> Cancel Invoice
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {filteredInvoices.length > itemsPerPage && (
            <div className="flex items-center justify-between p-4 border-t bg-muted/10">
              <div className="text-xs text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} results
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-xs font-medium px-3">
                  Page {currentPage} of {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Offline Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount to Collect</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className={`font-semibold text-lg ${
                  selectedInvoice && paymentAmount > (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)) 
                  ? "border-destructive text-destructive focus-visible:ring-destructive" 
                  : ""
                }`}
              />
              {selectedInvoice && paymentAmount > (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)) && (
                <p className="text-[10px] font-bold text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Cannot exceed remaining balance of {formatINR(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0))}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CHECK">Cheque / DD</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</SelectItem>
                  <SelectItem value="ONLINE">Digital UPI / Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference Number (Optional)</label>
              <Input
                placeholder="Cheque # or TXN ID"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </div>
            <div className="bg-muted p-3 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span>Invoice Number:</span>
                <span className="font-medium text-foreground">#{selectedInvoice?.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Student:</span>
                <span className="font-medium text-foreground">{selectedInvoice?.studentName || "ID: " + selectedInvoice?.studentId}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleRecordPayment} 
              disabled={
                isGenerating || 
                paymentAmount <= 0 || 
                (selectedInvoice ? paymentAmount > (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)) : false)
              } 
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isGenerating ? "Processing..." : "Record Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-muted/30 p-4 rounded-xl border border-border/50">
                <div>
                  <p className="text-muted-foreground mb-0.5">Invoice Number</p>
                  <p className="font-bold text-sm">#{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Student</p>
                  <p className="font-bold text-sm truncate">{selectedInvoice.studentName || "ID: " + selectedInvoice.studentId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Total Amount</p>
                  <p className="font-bold text-sm">{formatINR(selectedInvoice.totalAmount)}</p>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <p className="text-muted-foreground mb-0.5">Status</p>
                  <InvoiceStatusBadge status={selectedInvoice.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Line Items */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                    <LayoutList className="h-4 w-4" /> Bill Breakdown
                  </h4>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                    {selectedInvoice.lineItems?.map((item) => (
                      <div key={item.lineItemId} className="flex justify-between items-center text-[13px] p-2 rounded-lg bg-muted/20 border border-transparent hover:border-border/40 transition-colors">
                        <span className="text-muted-foreground">{item.description}</span>
                        <span className="font-semibold">{formatINR(item.amount)}</span>
                      </div>
                    ))}
                    {(!selectedInvoice.lineItems || selectedInvoice.lineItems.length === 0) && (
                      <div className="text-sm text-muted-foreground italic py-4 text-center border rounded-lg">No line items detailed.</div>
                    )}
                  </div>
                  <div className="pt-2 border-t flex justify-between font-bold text-sm px-2">
                    <span>Total Billable</span>
                    <span>{formatINR(selectedInvoice.totalAmount)}</span>
                  </div>
                </div>

                {/* Right Side: Payment History Timeline */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                    <History className="h-4 w-4" /> Payment Timeline
                  </h4>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {loadingPayments ? (
                      <div className="text-center py-10 text-xs text-muted-foreground flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        Fetching payments...
                      </div>
                    ) : invoicePayments.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed rounded-xl text-xs text-muted-foreground bg-muted/10">
                        <Receipt className="h-6 w-6 mx-auto mb-2 opacity-20" />
                        No payments received yet.
                      </div>
                    ) : (
                      <div className="relative space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted/50">
                        {invoicePayments.map((p) => (
                          <div key={p.paymentId} className="relative pl-7 group">
                            <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
                            <div className="flex justify-between items-start p-2.5 rounded-xl border bg-card/50 hover:border-emerald-200 hover:shadow-sm transition-all duration-200">
                              <div className="space-y-0.5">
                                <div className="text-[13px] font-bold text-emerald-600">{formatINR(p.amountPaid)}</div>
                                <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                                  <span className="capitalize px-1.5 py-0.5 bg-muted rounded">{p.paymentMethod.toLowerCase()}</span>
                                  <span>{format(new Date(p.paymentDate), "MMM dd, HH:mm")}</span>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600 rounded-full"
                                onClick={() => handleDownloadPaymentReceipt(p.paymentId)}
                                title="Download Transaction Receipt"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t space-y-1 px-2">
                    <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                      <span>Received:</span>
                      <span className="text-emerald-600">{formatINR(selectedInvoice.paidAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span>Outstanding:</span>
                      <span className="text-rose-600">{formatINR(selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0))}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" className="h-9 text-xs" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                  <Button 
                    className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/10"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      openPaymentDialog(selectedInvoice, { stopPropagation: () => {} } as any);
                    }}
                  >
                    Collect Payment
                  </Button>
                )}
                {selectedInvoice.status === "PAID" && (
                  <Button className="h-9 text-xs gap-2" onClick={() => handleDownloadReceipt(selectedInvoice.invoiceId)}>
                    <DownloadCloud className="h-3.5 w-3.5" /> Full Invoice Receipt
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
