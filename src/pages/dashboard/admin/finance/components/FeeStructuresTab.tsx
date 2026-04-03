import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Plus, X, Layers, Power, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { financeService } from "@/services/finance";
import type { FeeStructureResponseDTO, FeeTypeResponseDTO } from "@/services/types/finance";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const structureSchema = z.object({
  name: z.string().min(1, "Name required"),
  academicYear: z.string().min(1, "Year required (e.g., 2024-25)"),
  description: z.string().optional(),
  particulars: z.array(
    z.object({
      feeTypeId: z.coerce.number().min(1, "Fee type is required"),
      name: z.string().min(1, "Particular name required"),
      amount: z.coerce.number().min(0, "Invalid amount"),
      frequency: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "ANNUAL"]),
    })
  ).min(1, "At least one particular required"),
});

interface FeeStructuresTabProps {
  structures: FeeStructureResponseDTO[];
  feeTypes: FeeTypeResponseDTO[];
  loading: boolean;
  onRefresh: () => void;
}

export function FeeStructuresTab({ structures, feeTypes, loading, onRefresh }: FeeStructuresTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form Hooks
  const structureForm = useForm<z.input<typeof structureSchema>>({
    resolver: zodResolver(structureSchema),
    defaultValues: {
      name: "",
      academicYear: "2024-25",
      description: "",
      particulars: [{ feeTypeId: 0, name: "", amount: 0, frequency: "MONTHLY" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: structureForm.control,
    name: "particulars",
  });

  const handleToggleActive = async (s: FeeStructureResponseDTO) => {
    try {
      // We send a PUT request with the updated 'active' status
      await financeService.updateFeeStructure(s.structureId, {
        name: s.name,
        academicYear: s.academicYear,
        description: s.description || "",
        active: !s.active, // Flip the status
      });

      toast.success(`Fee structure ${!s.active ? "activated" : "deactivated"}!`);
      onRefresh(); // Refresh the data to update the UI
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const onSubmitStructure = async (values: z.infer<typeof structureSchema>) => {
    try {
      await financeService.createFeeStructure(values as any);
      toast.success("Fee structure successfully created!");
      setIsDialogOpen(false);
      structureForm.reset();
      onRefresh();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create fee structure");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Configured Fee Structures</h3>
          <p className="text-sm text-muted-foreground">Groups of fee particulars assigned to students.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Create Structure</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Fee Structure Builder</DialogTitle>
            </DialogHeader>
            <Form {...structureForm}>
              <form
                onSubmit={structureForm.handleSubmit((data) => onSubmitStructure(data as any), (errors) => {
                  console.error("Form Validation Errors:", errors);
                  toast.error("Please fix the errors in the form before saving.");
                })}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={structureForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Structure Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Grade 10 Standard" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={structureForm.control}
                    name="academicYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Academic Year</FormLabel>
                        <FormControl><Input placeholder="2024-25" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Fee Particulars</h4>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => append({ feeTypeId: 0, name: "", amount: 0, frequency: "MONTHLY" })}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="flex flex-col gap-1">
                        <div className="flex items-start gap-2 bg-muted/30 p-3 rounded-lg border border-border">
                          <div className="grid grid-cols-3 gap-2 flex-1">
                            <FormField
                              control={structureForm.control}
                              name={`particulars.${index}.feeTypeId`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select
                                    onValueChange={(val) => {
                                      field.onChange(val);
                                      const selectedType = feeTypes.find(t => t.feeTypeId.toString() === val);
                                      if (selectedType) {
                                        // Update the hidden name field and trigger validation
                                        structureForm.setValue(`particulars.${index}.name`, selectedType.typeName, {
                                          shouldValidate: true,
                                          shouldDirty: true,
                                          shouldTouch: true
                                        });
                                      }
                                    }}
                                    value={field.value?.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="bg-background"><SelectValue placeholder="Fee Type" /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {feeTypes.map((t) => (
                                        <SelectItem key={t.feeTypeId} value={t.feeTypeId.toString()}>{t.typeName}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />

                            {/* Hidden field to ensure 'name' is tracked and validated */}
                            <FormField
                              control={structureForm.control}
                              name={`particulars.${index}.name`}
                              render={({ field }) => <input type="hidden" {...field} />}
                            />
                            <FormField
                              control={structureForm.control}
                              name={`particulars.${index}.amount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl><Input type="number" placeholder="Amount" {...field} value={field.value as number} className="bg-background" /></FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={structureForm.control}
                              name={`particulars.${index}.frequency`}
                              render={({ field }) => (
                                <FormItem>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                      <SelectItem value="ANNUAL">Annual</SelectItem>
                                      <SelectItem value="ONE_TIME">One Time</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="shrink-0 text-muted-foreground hover:text-destructive">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {structureForm.formState.errors.particulars?.[index] && (
                          <div className="text-[0.75rem] font-medium text-destructive px-3 py-1 bg-destructive/5 rounded-md border border-destructive/10">
                            {structureForm.formState.errors.particulars[index]?.feeTypeId ? "Select a fee type. " : ""}
                            {structureForm.formState.errors.particulars[index]?.amount ? "Valid amount required. " : ""}
                            {structureForm.formState.errors.particulars[index]?.name ? "Category name missing. " : ""}
                          </div>
                        )}
                      </div>
                    ))}
                    {fields.length === 0 && <p className="text-xs text-red-500">Add at least one particular.</p>}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit">Save Fee Structure</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {structures.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-xl">
            <Layers className="mx-auto h-8 w-8 mb-2 opacity-20" />
            <p>No fee structures defined yet.</p>
          </div>
        )}
        {structures.map((s) => (
          <Card key={s.structureId} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <CardDescription>{s.academicYear}</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant={s.active ? "success" : "secondary" as any}>
                    {s.active ? "Active" : "Inactive"}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(s)}
                    className={`h-8 w-8 ${s.active ? "text-emerald-600" : "text-muted-foreground"}`}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p className="text-muted-foreground">{s.particulars?.length || 0} particulars bundled.</p>
              <div className="space-y-1">
                {s.particulars?.slice(0, 3).map((p) => (
                  <div key={p.particularId} className="flex justify-between text-xs">
                    <span>{p.name} ({p.frequency})</span>
                    <span className="font-medium">{formatINR(p.amount)}</span>
                  </div>
                ))}
                {(s.particulars?.length || 0) > 3 && (
                  <p className="text-xs text-primary mt-1">+ {(s.particulars?.length || 0) - 3} more...</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}
