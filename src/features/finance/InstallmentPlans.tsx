import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarRange, Plus, CheckCircle2, Clock, AlertTriangle, Search,
  IndianRupee, Users, Layers, ChevronDown, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { financeService } from "@/services/finance";
import { formatINR, computeInstallmentSchedule, type InstallmentScheduleItem } from "../finance/utils/financeUtils";

type InstallmentPlan = any;
type InstallmentAssignment = any;

const ASSIGN_STATUS_CFG: Record<InstallmentAssignment["status"], { icon: React.ElementType; cls: string; bg: string }> = {
  ON_TRACK: { icon: CheckCircle2, cls: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" },
  OVERDUE: { icon: AlertTriangle, cls: "text-rose-600", bg: "bg-rose-500/10 border-rose-500/30" },
  COMPLETED: { icon: CheckCircle2, cls: "text-violet-600", bg: "bg-violet-500/10 border-violet-500/30" },
};

const EMI_STATUS_CFG: Record<InstallmentScheduleItem["status"], { cls: string; icon: React.ElementType }> = {
  PAID: { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  UPCOMING: { cls: "bg-muted text-muted-foreground border-border/50", icon: Clock },
  OVERDUE: { cls: "bg-rose-500/10 text-rose-600 border-rose-500/30", icon: AlertTriangle },
};

function EMITimeline({ totalAmount, plan }: { totalAmount: number; plan: InstallmentPlan }) {
  const schedule = computeInstallmentSchedule(totalAmount, plan.numberOfInstallments, new Date(), plan.intervalDays);
  return (
    <div className="flex gap-2 flex-wrap mt-3">
      {schedule.map((emi) => {
        const cfg = EMI_STATUS_CFG[emi.status];
        const Icon = cfg.icon;
        return (
          <div key={emi.installmentNo} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center min-w-[72px] ${cfg.cls}`}>
            <Icon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black">EMI {emi.installmentNo}</span>
            <span className="text-[10px] font-bold">{formatINR(emi.amount)}</span>
            <span className="text-[9px] opacity-70">{emi.dueDate}</span>
          </div>
        );
      })}
    </div>
  );
}

export function InstallmentPlans() {
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [assignments, setAssignments] = useState<InstallmentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const [planForm, setPlanForm] = useState({
    name: "", numberOfInstallments: "4", intervalDays: "90", description: "", gracePeriodDays: "7",
  });
  const [assignForm, setAssignForm] = useState({
    studentId: "", studentName: "", planId: "", totalAmount: "", nextDueDate: "",
  });

  const filteredAssignments = assignments.filter((a) =>
    !search ||
    a.studentName.toLowerCase().includes(search.toLowerCase()) ||
    String(a.studentId).includes(search)
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resPlans, resAss] = await Promise.all([
        financeService.getInstallmentPlans(),
        financeService.getInstallmentAssignments()
      ]);
      setPlans(resPlans.data);
      setAssignments(resAss.data);
    } catch (err) {
      toast.error("Failed to fetch installment data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!planForm.name) { toast.error("Plan name is required"); return; }
    try {
      const data = {
        name: planForm.name,
        numberOfInstallments: Number(planForm.numberOfInstallments),
        intervalDays: Number(planForm.intervalDays),
        description: planForm.description,
        gracePeriodDays: Number(planForm.gracePeriodDays),
      };
      await financeService.createInstallmentPlan(data);
      toast.success(`Installment plan "${planForm.name}" created!`);
      setIsPlanDialogOpen(false);
      setPlanForm({ name: "", numberOfInstallments: "4", intervalDays: "90", description: "", gracePeriodDays: "7" });
      fetchData();
    } catch (err) {
      toast.error("Failed to create installment plan");
    }
  };

  const handleAssign = async () => {
    if (!assignForm.studentId || !assignForm.planId || !assignForm.totalAmount || !assignForm.nextDueDate) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      const data = {
        studentId: Number(assignForm.studentId),
        studentName: assignForm.studentName || `Student #${assignForm.studentId}`,
        planId: Number(assignForm.planId),
        totalAmount: Number(assignForm.totalAmount),
        nextDueDate: assignForm.nextDueDate
      };
      await financeService.assignInstallmentPlan(data);
      toast.success(`Installment plan assigned to student`);
      setIsAssignDialogOpen(false);
      setAssignForm({ studentId: "", studentName: "", planId: "", totalAmount: "", nextDueDate: "" });
      fetchData();
    } catch (err) {
      toast.error("Failed to assign installment plan");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
              <Layers className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-xl font-black">{plans.length}</p>
            <p className="text-xs text-muted-foreground font-medium">Plan Templates</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black">{assignments.filter((a) => a.status === "ON_TRACK").length}</p>
            <p className="text-xs text-muted-foreground font-medium">On Track</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center mb-3">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-xl font-black">{assignments.filter((a) => a.status === "OVERDUE").length}</p>
            <p className="text-xs text-muted-foreground font-medium">Overdue EMIs</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardContent className="pt-5 pb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-4 w-4 text-violet-600" />
            </div>
            <p className="text-xl font-black">{assignments.filter((a) => a.status === "COMPLETED").length}</p>
            <p className="text-xs text-muted-foreground font-medium">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="h-auto flex flex-wrap justify-start gap-1 bg-muted/60 p-1.5 rounded-xl mb-5">
          <TabsTrigger value="plans" className="gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" />Plan Templates</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Student Assignments</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-0 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold">Installment Plan Templates</h3>
              <p className="text-xs text-muted-foreground">Reusable EMI configurations for student fee splitting</p>
            </div>
            <Button onClick={() => setIsPlanDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New Plan
            </Button>
          </div>

          <div className="space-y-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/20 transition-colors"
                  onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-lg font-black text-primary">{plan.numberOfInstallments}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:flex gap-5 text-center">
                      <div>
                        <p className="text-sm font-black">{plan.numberOfInstallments}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">EMIs</p>
                      </div>
                      <div>
                        <p className="text-sm font-black">{plan.intervalDays}d</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Interval</p>
                      </div>
                      <div>
                        <p className="text-sm font-black">{plan.gracePeriodDays}d</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Grace</p>
                      </div>
                      <div>
                        <p className="text-sm font-black text-primary">{plan.assignedStudents}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Students</p>
                      </div>
                    </div>
                    {expandedPlan === plan.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedPlan === plan.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 border-t border-border/30 pt-4">
                        <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Preview — ₹50,000 Total Fee Split</p>
                        <EMITimeline totalAmount={50000} plan={plan} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="mt-0 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Assigned Students</h3>
              <p className="text-xs text-muted-foreground">{filteredAssignments.length} installment plans active</p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search student..." className="pl-8 h-9 w-48 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Button onClick={() => setIsAssignDialogOpen(true)} size="sm" className="gap-2 h-9">
                <Plus className="h-3.5 w-3.5" /> Assign Plan
              </Button>
            </div>
          </div>

          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No installment assignments found.</TableCell>
                  </TableRow>
                ) : filteredAssignments.map((a) => {
                  const cfg = ASSIGN_STATUS_CFG[a.status];
                  const StatusIcon = cfg.icon;
                  const progress = (a.paidInstallments / a.totalInstallments) * 100;
                  return (
                    <TableRow key={a.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-bold text-sm">#{a.studentId}</div>
                        <div className="text-[10px] text-muted-foreground">{a.studentName}</div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{a.planName}</TableCell>
                      <TableCell className="font-black text-sm">{formatINR(a.totalAmount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-20">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                            {a.paidInstallments}/{a.totalInstallments}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{a.nextDueDate}</div>
                        {a.status !== "COMPLETED" && (
                          <div className="text-[10px] text-muted-foreground">{formatINR(a.nextDueAmount)}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${cfg.bg} ${cfg.cls}`}>
                          <StatusIcon className="h-3 w-3" /> {a.status.replace("_", " ")}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Plan Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Installment Plan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Plan Name *</label>
              <Input placeholder="e.g. Quarterly (4 EMIs)" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Description</label>
              <Input placeholder="Brief description" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">No. of EMIs *</label>
                <Input type="number" min="2" value={planForm.numberOfInstallments} onChange={(e) => setPlanForm({ ...planForm, numberOfInstallments: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Interval (days)</label>
                <Input type="number" min="1" value={planForm.intervalDays} onChange={(e) => setPlanForm({ ...planForm, intervalDays: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Grace (days)</label>
                <Input type="number" min="0" value={planForm.gracePeriodDays} onChange={(e) => setPlanForm({ ...planForm, gracePeriodDays: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreatePlan}>Create Plan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Installment Plan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Student ID *</label>
                <Input placeholder="1001" value={assignForm.studentId} onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Student Name</label>
                <Input placeholder="Full name" value={assignForm.studentName} onChange={(e) => setAssignForm({ ...assignForm, studentName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Installment Plan *</label>
              <Select value={assignForm.planId} onValueChange={(v) => setAssignForm({ ...assignForm, planId: v })}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Total Amount (₹) *</label>
                <Input type="number" placeholder="48000" value={assignForm.totalAmount} onChange={(e) => setAssignForm({ ...assignForm, totalAmount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">First EMI Due Date *</label>
                <Input type="date" value={assignForm.nextDueDate} onChange={(e) => setAssignForm({ ...assignForm, nextDueDate: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAssign}>Assign Plan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
