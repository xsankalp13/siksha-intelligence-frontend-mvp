import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, Plus, Search, CheckCircle2,
  XCircle, Clock, IndianRupee, Users, Award, Percent,} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { financeService } from "@/services/finance";
import { formatINR, formatINRCompact } from "../finance/utils/financeUtils";

type ScholarshipType = any;
type ScholarshipAssignment = any;

const STATUS_CONFIG: Record<ScholarshipAssignment["status"], { label: string; icon: React.ElementType; cls: string; bg: string }> = {
  ACTIVE: { label: "Active", icon: CheckCircle2, cls: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" },
  EXPIRED: { label: "Expired", icon: Clock, cls: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30" },
  REVOKED: { label: "Revoked", icon: XCircle, cls: "text-rose-600", bg: "bg-rose-500/10 border-rose-500/30" },
};

function SummaryCard({ icon: Icon, iconBg, iconColor, label, value }: {
  icon: React.ElementType; iconBg: string; iconColor: string; label: string; value: string;
}) {
  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
      <CardContent className="pt-5 pb-4">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <p className="text-xl font-black text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

export function ScholarshipManager() {
  const [types, setTypes] = useState<ScholarshipType[]>([]);
  const [assignments, setAssignments] = useState<ScholarshipAssignment[]>([]);
  const [_loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  // new type form state
  const [form, setForm] = useState({
    name: "", description: "", discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    discountValue: "", eligibilityCriteria: "", maxRecipients: "",
  });

  // new assignment form state
  const [assignForm, setAssignForm] = useState({
    studentId: "", studentName: "", scholarshipId: "", reason: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resTypes, resAss] = await Promise.all([
        financeService.getScholarshipTypes(),
        financeService.getScholarshipAssignments()
      ]);
      setTypes(resTypes.data);
      setAssignments(resAss.data);
    } catch (err) {
      toast.error("Failed to fetch scholarship data");
    } finally {
      setLoading(false);
    }
  };

  const totalDiscountIssued = types.reduce((a, t) => a + t.totalDiscountIssued, 0);
  const totalActiveRecipients = types.reduce((a, t) => a + t.activeCount, 0);

  const filteredAssignments = assignments.filter((a) => {
    const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
    const matchSearch = !search ||
      a.studentName.toLowerCase().includes(search.toLowerCase()) ||
      String(a.studentId).includes(search) ||
      a.scholarshipName.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleAddType = async () => {
    if (!form.name || !form.discountValue || !form.eligibilityCriteria) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const data = {
        name: form.name,
        description: form.description,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        eligibilityCriteria: form.eligibilityCriteria,
        maxRecipients: form.maxRecipients ? Number(form.maxRecipients) : null,
      };
      await financeService.createScholarshipType(data);
      toast.success(`Scholarship type "${form.name}" created!`);
      setIsTypeDialogOpen(false);
      setForm({ name: "", description: "", discountType: "PERCENTAGE", discountValue: "", eligibilityCriteria: "", maxRecipients: "" });
      fetchData();
    } catch (err) {
      toast.error("Failed to create scholarship type");
    }
  };

  const handleAssign = async () => {
    if (!assignForm.studentId || !assignForm.studentName || !assignForm.scholarshipId || !assignForm.reason) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const data = {
        studentId: Number(assignForm.studentId),
        studentName: assignForm.studentName,
        scholarshipId: Number(assignForm.scholarshipId),
        reason: assignForm.reason
      };
      await financeService.assignScholarship(data);
      toast.success(`Scholarship assigned to ${assignForm.studentName}`);
      setIsAssignDialogOpen(false);
      setAssignForm({ studentId: "", studentName: "", scholarshipId: "", reason: "" });
      fetchData();
    } catch (err) {
      toast.error("Failed to assign scholarship");
    }
  };

  const handleRevoke = async (id: number, name: string) => {
    try {
      await financeService.revokeScholarshipAssignment(id);
      toast.success(`Scholarship revoked for ${name}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to revoke scholarship");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={Award} iconBg="bg-violet-500/10" iconColor="text-violet-600" label="Scholarship Types" value={String(types.length)} />
        <SummaryCard icon={Users} iconBg="bg-blue-500/10" iconColor="text-blue-600" label="Active Recipients" value={String(totalActiveRecipients)} />
        <SummaryCard icon={IndianRupee} iconBg="bg-emerald-500/10" iconColor="text-emerald-600" label="Total Discount Issued" value={formatINRCompact(totalDiscountIssued)} />
        <SummaryCard icon={GraduationCap} iconBg="bg-amber-500/10" iconColor="text-amber-600" label="Assignments Total" value={String(assignments.length)} />
      </div>

      <Tabs defaultValue="types">
        <TabsList className="h-auto flex flex-wrap justify-start gap-1 bg-muted/60 p-1.5 rounded-xl mb-5">
          <TabsTrigger value="types" className="gap-1.5 text-xs"><Award className="h-3.5 w-3.5" />Scholarship Types</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Assigned Students</TabsTrigger>
        </TabsList>

        {/* ── Types Tab ──────────────────────────────────────────────────────── */}
        <TabsContent value="types" className="mt-0 space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold">Scholarship & Concession Types</h3>
              <p className="text-xs text-muted-foreground">Define reusable scholarship categories</p>
            </div>
            <Button onClick={() => setIsTypeDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New Type
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {types.map((type) => (
              <motion.div key={type.id} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                <Card className="border-border/50 bg-card/60 backdrop-blur-sm hover:shadow-md transition-all group overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500" />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-bold">{type.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">{type.description}</CardDescription>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px] font-black">
                        {type.discountType === "PERCENTAGE" ? (
                          <span className="text-violet-600">{type.discountValue}% OFF</span>
                        ) : (
                          <span className="text-emerald-600">₹{type.discountValue} OFF</span>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0 space-y-3">
                    <p className="text-[10px] text-muted-foreground font-medium bg-muted/50 rounded-lg px-3 py-2">
                      <span className="font-bold text-foreground">Eligibility:</span> {type.eligibilityCriteria}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/30 rounded-xl p-3 text-center">
                        <p className="text-lg font-black text-primary">{type.activeCount}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Recipients</p>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-3 text-center">
                        <p className="text-lg font-black text-emerald-600">{formatINRCompact(type.totalDiscountIssued)}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Issued</p>
                      </div>
                    </div>
                    {type.maxRecipients && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                          <span>Capacity</span>
                          <span className="font-bold text-foreground">{type.activeCount}/{type.maxRecipients}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (type.activeCount / type.maxRecipients) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ── Assignments Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="assignments" className="mt-0 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold">Student Scholarship Assignments</h3>
              <p className="text-xs text-muted-foreground">{filteredAssignments.length} assignments found</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search student..." className="pl-8 h-9 w-52 text-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="REVOKED">Revoked</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setIsAssignDialogOpen(true)} size="sm" className="gap-2 h-9">
                <Plus className="h-3.5 w-3.5" /> Assign
              </Button>
            </div>
          </div>

          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Scholarship</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <GraduationCap className="mx-auto h-8 w-8 mb-2 opacity-20" />
                      No assignments found.
                    </TableCell>
                  </TableRow>
                ) : filteredAssignments.map((a) => {
                  const cfg = STATUS_CONFIG[a.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow key={a.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-semibold text-sm">#{a.studentId}</div>
                        <div className="text-xs text-muted-foreground">{a.studentName}</div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{a.scholarshipName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-black gap-1">
                          {a.discountType === "PERCENTAGE" ? (
                            <><Percent className="h-3 w-3" />{a.discountValue}%</>
                          ) : (
                            <><IndianRupee className="h-3 w-3" />{formatINR(a.discountValue)}</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.effectiveFrom}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{a.reason}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${cfg.bg} ${cfg.cls}`}>
                          <StatusIcon className="h-3 w-3" /> {cfg.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {a.status === "ACTIVE" && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-600 hover:text-rose-700"
                            onClick={() => handleRevoke(a.id, a.studentName)}>
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Create Type Dialog ──────────────────────────────────────────────── */}
      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Scholarship Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Name *</label>
              <Input placeholder="e.g. Merit Scholarship" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Description</label>
              <Input placeholder="Brief description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Discount Type *</label>
                <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Value *</label>
                <Input type="number" placeholder={form.discountType === "PERCENTAGE" ? "50 (%)" : "5000 (₹)"}
                  value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Eligibility Criteria *</label>
              <Input placeholder="Who qualifies?" value={form.eligibilityCriteria} onChange={(e) => setForm({ ...form, eligibilityCriteria: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Max Recipients (optional)</label>
              <Input type="number" placeholder="Leave blank for unlimited" value={form.maxRecipients} onChange={(e) => setForm({ ...form, maxRecipients: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsTypeDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddType}>Create Scholarship Type</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Assign Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Scholarship to Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Student ID *</label>
                <Input placeholder="e.g. 1001" value={assignForm.studentId} onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Student Name *</label>
                <Input placeholder="Full name" value={assignForm.studentName} onChange={(e) => setAssignForm({ ...assignForm, studentName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Scholarship *</label>
              <Select value={assignForm.scholarshipId} onValueChange={(v) => setAssignForm({ ...assignForm, scholarshipId: v })}>
                <SelectTrigger><SelectValue placeholder="Select scholarship" /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} — {t.discountType === "PERCENTAGE" ? `${t.discountValue}%` : formatINR(t.discountValue)} off
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Reason *</label>
              <Input placeholder="Reason for granting scholarship" value={assignForm.reason} onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAssign}>Assign Scholarship</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
