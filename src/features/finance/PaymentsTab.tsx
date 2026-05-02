import { format } from "date-fns";
import { motion } from "framer-motion";
import { Receipt, Download, Search, Landmark, Wallet, CreditCard, Banknote } from "lucide-react";
import { financeService } from "@/services/finance";
import type { PaymentResponseDTO } from "@/services/types/finance";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function PaymentMethodIcon({ method }: { method: string }) {
  const map: Record<string, { icon: any; color: string }> = {
    CASH: { icon: Banknote, color: "text-emerald-600" },
    CHECK: { icon: Landmark, color: "text-blue-600" },
    BANK_TRANSFER: { icon: CreditCard, color: "text-indigo-600" },
    ONLINE: { icon: Wallet, color: "text-amber-600" },
  };
  const cfg = map[method] ?? map["CASH"];
  const Icon = cfg.icon;
  return <Icon className={`h-4 w-4 ${cfg.color}`} />;
}

interface PaymentsTabProps {
  loading: boolean;
}

// In a real app, this would fetch its own data on mount
import { useState, useEffect } from "react";

export function PaymentsTab({ loading: parentLoading }: PaymentsTabProps) {
  const [payments, setPayments] = useState<PaymentResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await financeService.getAllPayments({ page: 0, size: 50 });
      setPayments(res.data.content);
    } catch (e) {
      // toast error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const filtered = payments.filter(p => 
    p.transactionId?.toLowerCase().includes(search.toLowerCase()) ||
    p.studentId.toString().includes(search) ||
    p.studentName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Payment History</h3>
          <p className="text-sm text-muted-foreground">Audit trail of all collected fees and transactions.</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search Name, TXN or ID..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt / Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>TXN / Ref #</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || parentLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading payments...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Receipt className="mx-auto h-8 w-8 mb-2 opacity-20" />
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.paymentId}>
                    <TableCell>
                      <div className="font-medium">#{p.paymentId}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(p.paymentDate), "MMM dd, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{p.studentName || "Unknown Student"}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">ID: {p.studentId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <PaymentMethodIcon method={p.paymentMethod} />
                        <span className="text-xs font-medium">{p.paymentMethod.replace("_", " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.transactionId || "—"}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600">
                      {formatINR(p.amountPaid)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 gap-2">
                        <Download className="h-4 w-4" /> Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
