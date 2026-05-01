import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Timer, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { financeService } from "@/services/finance";
import type { 
  LateFeeRuleResponseDTO 
} from "@/services/types/finance";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";

const ruleSchema = z.object({
  ruleName: z.string().min(1, "Name required"),
  daysAfterDue: z.coerce.number().min(1, "Must be at least 1 day"),
  fineType: z.enum(["FIXED", "PERCENTAGE"]),
  fineValue: z.coerce.number().min(1, "Value required"),
  active: z.boolean().default(true),
  structureId: z.number().optional(),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

export function LateFeeRulesTab({ loading: parentLoading }: { loading: boolean }) {
  const [rules, setRules] = useState<LateFeeRuleResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LateFeeRuleResponseDTO | null>(null);

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema) as any,
    defaultValues: {
      ruleName: "",
      daysAfterDue: 1,
      fineType: "FIXED",
      fineValue: 0,
      active: true,
    },
  });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await financeService.getAllLateFeeRules();
      setRules(res.data);
    } catch (e) {
      // toast error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const onSubmit = async (values: RuleFormValues) => {
    try {
      if (editingRule) {
        await financeService.updateLateFeeRule(editingRule.ruleId, values as any);
        toast.success("Rule updated successfully");
      } else {
        await financeService.createLateFeeRule(values as any);
        toast.success("New late fee rule established");
      }
      setIsDialogOpen(false);
      fetchRules();
    } catch (err) {
      toast.error("Operation failed.");
    }
  };

  const handleEdit = (rule: LateFeeRuleResponseDTO) => {
    setEditingRule(rule);
    form.reset({
      ruleName: rule.ruleName,
      daysAfterDue: rule.daysAfterDue,
      fineType: rule.fineType as any,
      fineValue: rule.fineValue,
      active: rule.active,
    });
    setIsDialogOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Timer className="h-5 w-5 text-amber-600" />
            Late Fee Policies
          </h3>
          <p className="text-sm text-muted-foreground">Define fines for payments received after the due date.</p>
        </div>
        <Button onClick={() => { setEditingRule(null); form.reset({ ruleName: "", daysAfterDue: 1, fineType: "FIXED", fineValue: 0, active: true }); setIsDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Add Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading || parentLoading ? (
           <div className="col-span-full py-12 flex justify-center">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-border/60 rounded-3xl bg-muted/20">
            <AlertCircle className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-muted-foreground">No late fee rules defined yet.</p>
          </div>
        ) : (
          <AnimatePresence>
            {rules.map((rule) => (
              <motion.div key={rule.ruleId} layout>
                <Card className="hover:border-amber-500/50 transition-colors nice-shadow relative overflow-hidden">
                  {!rule.active && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
                      <Badge variant="outline" className="bg-background">Inactive</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base font-semibold">{rule.ruleName}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-8 w-8 z-20" onClick={() => handleEdit(rule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>Applied {rule.daysAfterDue} day(s) after due date</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-amber-600">
                        {rule.fineType === "FIXED" ? `₹${rule.fineValue}` : `${rule.fineValue}%`}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {rule.fineType === "FIXED" ? "Flat Fine" : "Percentage"}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      {rule.active ? (
                        <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-emerald-600">
                          <CheckCircle className="h-3 w-3" /> System Enforcing
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-muted-foreground">
                          <XCircle className="h-3 w-3" /> Manually Disabled
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Late Fee Rule" : "Create Late Fee Rule"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="ruleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Name</FormLabel>
                    <FormControl><Input placeholder="e.g. Standard Late Penalty" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="daysAfterDue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days Grace</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fineType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Penalty Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXED">Flat (₹)</SelectItem>
                          <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="fineValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Penalty Value</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full">
                  {editingRule ? "Save Changes" : "Activate Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
