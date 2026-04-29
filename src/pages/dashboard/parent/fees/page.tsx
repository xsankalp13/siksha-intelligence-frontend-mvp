import { useState } from "react";
import { CreditCard, IndianRupee, Clock, CheckCircle2, AlertTriangle, Receipt, Download, Loader2 } from "lucide-react";
import { useChildFees, parentKeys } from "@/features/parent/queries/useParentQueries";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useChildStore } from "@/features/parent/stores/useChildStore";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { financeService } from "@/services/finance";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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

export default function FeesPage() {
  const { selectedChildId } = useChildStore();
  const { data: fees, isLoading, isError } = useChildFees();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<number | null>(null); // invoiceId or -1 for total

  if (!selectedChildId) {
    return <div className="p-6 text-center text-muted-foreground">Please select a child to view fee records.</div>;
  }

  const handlePayment = async (invoiceId: number, amount: number) => {
    try {
      setProcessing(invoiceId);
      
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Payment security module failed to load. Check your connection.");
        return;
      }

      // 1. Initiate Payment
      const { data: orderData } = await financeService.initiatePayment({
        invoiceId,
        amount
      });

      if (!orderData.orderId) {
        throw new Error("Failed to initialize payment order.");
      }

      // 2. Open Razorpay Modal
      const options = {
        key: orderData.clientSecret, // Backend maps Key ID here
        amount: amount * 100, // paise
        currency: "INR",
        name: "Shiksha Intellegence",
        description: `Fee Payment for Invoice #${invoiceId}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            setProcessing(invoiceId);
            // 3. Verify Payment
            await financeService.verifyPayment({
              gatewayTransactionId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature
            });
            
            toast.success("Payment successful! Invoice status updated.");
            queryClient.invalidateQueries({ queryKey: parentKeys.fees(selectedChildId) });
            queryClient.invalidateQueries({ queryKey: parentKeys.dashboard(selectedChildId) });
          } catch (err: any) {
            toast.error(err.response?.data?.message || "Payment verification failed. Contact support if amount was deducted.");
          } finally {
            setProcessing(null);
          }
        },
        modal: {
            ondismiss: function() {
                setProcessing(null);
            }
        },
        theme: {
          color: "#0f172a"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to start payment process.");
      setProcessing(null);
    }
  };

  if (isLoading) {
    return <div className="p-6 animate-pulse space-y-6">
      <div className="h-40 bg-muted rounded-2xl w-full" />
      <div className="h-64 bg-muted rounded-2xl w-full" />
    </div>;
  }

  if (isError || !fees) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl bg-rose-500/5 border-rose-500/20">
        <AlertTriangle className="h-10 w-10 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold">Failed to load fee information</h3>
      </div>
    );
  }

  const hasDue = fees.totalDue > 0;
  const isOverdue = hasDue && new Date(fees.nextDueDate) < new Date();
  
  // Find oldest pending invoice for the "Pay Now" main button
  const oldestInvoice = fees.feeBreakdown
    .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Fee Management
          </h1>
          <p className="text-muted-foreground mt-1">Review pending dues and download historical receipts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={cn(
          "p-8 relative overflow-hidden",
          hasDue ? (isOverdue ? "bg-rose-500 text-white" : "bg-primary text-primary-foreground") : "bg-emerald-500 text-white"
        )}>
          <div className="absolute opacity-10 -right-10 -bottom-10">
            <IndianRupee className="w-64 h-64" />
          </div>
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium opacity-90 uppercase tracking-widest">
              Total Outstanding
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold opacity-80">{fees.currency}</span>
              <h2 className="text-6xl font-black tracking-tighter">
                {fees.totalDue.toLocaleString('en-IN')}
              </h2>
            </div>
            
            {hasDue ? (
              <div className="pt-4 flex items-center gap-4">
                <Button 
                    size="lg" 
                    variant="secondary" 
                    className="font-bold shadow-xl"
                    onClick={() => oldestInvoice && handlePayment(oldestInvoice.invoiceId, oldestInvoice.amount)}
                    disabled={processing !== null}
                >
                  {processing === (oldestInvoice?.invoiceId) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Pay Oldest Due"}
                </Button>
                <div className="text-sm font-medium opacity-90 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Due {new Date(fees.nextDueDate).toLocaleDateString()}
                  {isOverdue && <Badge variant="destructive" className="ml-2 border-none">OVERDUE</Badge>}
                </div>
              </div>
            ) : (
              <div className="pt-4 flex items-center gap-2 font-medium opacity-90">
                <CheckCircle2 className="w-5 h-5" /> All dues cleared for this term.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="h-full flex flex-col relative">
            <div className="px-6 py-4 border-b bg-muted/30">
              <h3 className="font-bold flex items-center gap-2">
                Pending Breakdown
              </h3>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              {hasDue ? (
                <div className="space-y-4">
                  {fees.feeBreakdown
                    .filter(item => item.status !== 'PAID')
                    .map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 gap-4">
                      <div className="flex-1">
                        <p className="font-semibold">{item.feeType}</p>
                        <p className="text-sm text-muted-foreground">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="font-bold">{fees.currency} {item.amount.toLocaleString('en-IN')}</p>
                          <p className={cn(
                            "text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded inline-block mt-1 border",
                            item.status === 'OVERDUE' ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-amber-50 border-amber-200 text-amber-600"
                          )}>
                            {item.status}
                          </p>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="font-bold border-primary text-primary hover:bg-primary hover:text-white"
                            onClick={() => handlePayment(item.invoiceId, item.amount)}
                            disabled={processing !== null}
                        >
                            {processing === item.invoiceId ? <Loader2 className="h-4 w-4 animate-spin" /> : "PAY"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                  <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-500 opacity-50" />
                  <p className="font-semibold">All Invoices Paid</p>
                  <p className="text-xs">No pending dues for this student.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="px-6 py-4 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" /> Payment History
          </h3>
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Export All</Button>
        </div>
        <div className="divide-y h-[400px] overflow-auto">
          {fees.recentPayments.length > 0 ? (
            fees.recentPayments.map((payment, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: i * 0.05 }}
                key={payment.paymentId} 
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold">Payment TXN: {payment.paymentId}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span>{new Date(payment.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{payment.method}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-xl font-black bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-200">
                    {fees.currency} {payment.amount.toLocaleString('en-IN')}
                  </span>
                  <Button variant="ghost" size="icon" title="Download Receipt">
                    <Download className="w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-dashed border-2 m-6 rounded-xl">
              <Clock className="h-8 w-8 mb-2 opacity-20" />
              <p className="font-medium">No historical payment records found.</p>
              <p className="text-xs">Once you make a payment, it will appear here.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

