import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bell, Plus, CheckCircle2, XCircle, Clock, Mail, MessageSquare,
  Smartphone, Zap
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { financeService } from "@/services/finance";

type ReminderTemplate = any;
type ReminderLog = any;
import { formatINR } from "../finance/utils/financeUtils";

const CHANNEL_CFG: Record<ReminderTemplate["channel"], { icon: React.ElementType; cls: string; bg: string }> = {
  EMAIL: { icon: Mail, cls: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/30" },
  SMS: { icon: MessageSquare, cls: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30" },
  PUSH: { icon: Smartphone, cls: "text-violet-600", bg: "bg-violet-500/10 border-violet-500/30" },
};

const TRIGGER_LABELS: Record<ReminderTemplate["trigger"], string> = {
  BEFORE_DUE: "Before Due",
  ON_DUE: "On Due Date",
  AFTER_DUE: "After Due",
};

const LOG_STATUS_CFG: Record<ReminderLog["status"], { icon: React.ElementType; cls: string }> = {
  SENT: { icon: CheckCircle2, cls: "text-emerald-600" },
  FAILED: { icon: XCircle, cls: "text-rose-600" },
  QUEUED: { icon: Clock, cls: "text-amber-600" },
};

export function FeeReminderCenter() {
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [_loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);

  const [form, setForm] = useState({
    name: "", subject: "", body: "",
    channel: "EMAIL" as ReminderTemplate["channel"],
    trigger: "BEFORE_DUE" as ReminderTemplate["trigger"],
    triggerDays: "7",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resTpl, resLogs] = await Promise.all([
        financeService.getReminderTemplates(),
        financeService.getReminderLogs()
      ]);
      setTemplates(resTpl.data);
      setLogs(resLogs.data);
    } catch (err) {
      toast.error("Failed to fetch reminders");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTemplate = async (id: number) => {
    try {
      await financeService.toggleReminderTemplate(id);
      fetchData();
    } catch (err) {
      toast.error("Failed to toggle template");
    }
  };

  const handleAddTemplate = async () => {
    if (!form.name || !form.subject || !form.body) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const data = {
        name: form.name,
        subject: form.subject,
        body: form.body,
        channel: form.channel,
        triggerType: form.trigger,
        triggerDays: Number(form.triggerDays),
      };
      await financeService.createReminderTemplate(data);
      toast.success(`Reminder template "${form.name}" created!`);
      setIsDialogOpen(false);
      setForm({ name: "", subject: "", body: "", channel: "EMAIL", trigger: "BEFORE_DUE", triggerDays: "7" });
      fetchData();
    } catch (err) {
      toast.error("Failed to create reminder template");
    }
  };

  const handleBulkReminder = async () => {
    setIsSendingBulk(true);
    try {
      await financeService.triggerBulkReminders();
      toast.success("Bulk reminder sent to all defaulters!");
      fetchData();
    } catch (err) {
      toast.error("Failed to send bulk reminders");
    } finally {
      setIsSendingBulk(false);
    }
  };

  const activeTemplates = templates.filter((t) => t.isActive).length;
  const sentCount = logs.filter((l) => l.status === "SENT").length;
  const failedCount = logs.filter((l) => l.status === "FAILED").length;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Summary + Quick Action */}
      <div className="flex flex-col md:flex-row justify-between gap-4 items-start p-4 rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Fee Reminder & Dunning Center
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Automate fee reminders and manage notification campaigns</p>
          <div className="flex gap-4 mt-3">
            <div className="text-center">
              <p className="text-lg font-black text-primary">{activeTemplates}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Active Rules</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-emerald-600">{sentCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Sent</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-rose-600">{failedCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Failed</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={handleBulkReminder}
            disabled={isSendingBulk}
            className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
            size="sm"
          >
            {isSendingBulk ? (
              <><Clock className="h-3.5 w-3.5 animate-spin" /> Sending...</>
            ) : (
              <><Zap className="h-3.5 w-3.5" /> Blast All Defaulters</>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="templates">
        <TabsList className="h-auto flex flex-wrap justify-start gap-1 bg-muted/60 p-1.5 rounded-xl mb-5">
          <TabsTrigger value="templates" className="gap-1.5 text-xs"><Bell className="h-3.5 w-3.5" />Templates & Rules</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" />Send History</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-0 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold">Dunning Schedule & Templates</h3>
              <p className="text-xs text-muted-foreground">Configure automated reminder triggers</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> New Template
            </Button>
          </div>

          <div className="space-y-3">
            {templates.map((tpl) => {
              const chCfg = CHANNEL_CFG[tpl.channel];
              const ChIcon = chCfg.icon;
              return (
                <Card key={tpl.id} className={`border-border/50 bg-card/60 backdrop-blur-sm transition-all ${!tpl.isActive ? "opacity-50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 rounded-xl border ${chCfg.bg} shrink-0`}>
                        <ChIcon className={`h-4 w-4 ${chCfg.cls}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold">{tpl.name}</p>
                          <Badge variant="outline" className={`text-[9px] font-black ${chCfg.cls} border-current/20 bg-transparent`}>
                            {tpl.channel}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] font-black">
                            {TRIGGER_LABELS[tpl.triggerType]}{tpl.triggerDays > 0 ? ` (${tpl.triggerDays}d)` : ""}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-foreground mt-1">{tpl.subject}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{tpl.body}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleTemplate(tpl.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${tpl.isActive ? "bg-emerald-500" : "bg-muted"}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm ${tpl.isActive ? "translate-x-4" : "translate-x-0.5"}`} />
                        </button>
                        <span className="text-[10px] font-bold text-muted-foreground">{tpl.isActive ? "ON" : "OFF"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="logs" className="mt-0">
          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Amount Due</TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No reminder logs yet.</TableCell>
                  </TableRow>
                ) : logs.map((log) => {
                  const cfg = LOG_STATUS_CFG[log.status];
                  const chCfg = CHANNEL_CFG[log.channel as ReminderTemplate["channel"]];
                  const ChIcon = chCfg?.icon ?? Mail;
                  const StatusIcon = cfg.icon;
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="text-sm font-bold">#{log.studentId}</div>
                        <div className="text-[10px] text-muted-foreground">{log.studentName}</div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">{log.templateName}</TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${chCfg?.bg} ${chCfg?.cls}`}>
                          <ChIcon className="h-3 w-3" /> {log.channel}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.invoiceNumber}</TableCell>
                      <TableCell className="font-bold text-sm">{formatINR(log.amountDue)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.sentAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${cfg.cls}`}>
                          <StatusIcon className="h-3.5 w-3.5" /> {log.status}
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

      {/* Create Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Reminder Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Template Name *</label>
              <Input placeholder="e.g. 7-Day Pre-Due Alert" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Channel</label>
                <Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="PUSH">Push</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Trigger</label>
                <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEFORE_DUE">Before Due</SelectItem>
                    <SelectItem value="ON_DUE">On Due Date</SelectItem>
                    <SelectItem value="AFTER_DUE">After Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Days</label>
                <Input type="number" min="0" value={form.triggerDays} onChange={(e) => setForm({ ...form, triggerDays: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Subject *</label>
              <Input placeholder="Use {{studentName}}, {{amount}}, {{dueDate}}" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Message Body *</label>
              <textarea
                className="w-full min-h-[100px] rounded-xl border border-border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Dear Parent, fee of {{amount}} for {{studentName}} is due on {{dueDate}}..."
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">Merge fields: {"{{studentName}}"}, {"{{amount}}"}, {"{{dueDate}}"}, {"{{invoiceNumber}}"}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddTemplate}>Create Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
