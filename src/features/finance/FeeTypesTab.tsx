import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

import { financeService } from "@/services/finance";
import type { FeeTypeResponseDTO, FeeTypeCreateUpdateDTO } from "@/services/types/finance";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const typeSchema = z.object({
  typeName: z.string().min(1, "Type name is required").max(50, "Name too long"),
  description: z.string().optional(),
});

interface FeeTypesTabProps {
  feeTypes: FeeTypeResponseDTO[];
  loading: boolean;
  onRefresh: () => void;
}

export function FeeTypesTab({ feeTypes, loading, onRefresh }: FeeTypesTabProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<FeeTypeResponseDTO | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const form = useForm<FeeTypeCreateUpdateDTO>({
    resolver: zodResolver(typeSchema),
    defaultValues: {
      typeName: "",
      description: "",
    },
  });

  const handleEdit = (type: FeeTypeResponseDTO) => {
    setEditingType(type);
    form.reset({
      typeName: type.typeName,
      description: type.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingType(null);
    form.reset({ typeName: "", description: "" });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: FeeTypeCreateUpdateDTO) => {
    try {
      if (editingType) {
        await financeService.updateFeeType(editingType.feeTypeId, values);
        toast.success("Fee type updated successfully");
      } else {
        await financeService.createFeeType(values);
        toast.success("New fee type created");
      }
      setIsDialogOpen(false);
      onRefresh();
    } catch (err) {
      toast.error("Operation failed. Please check inputs.");
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await financeService.deleteFeeType(deletingId);
      toast.success("Fee type deleted");
      setDeletingId(null);
      onRefresh();
    } catch (err) {
      toast.error("Cannot delete fee type if it is linked to any structure.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex justify-between items-center bg-card/50 backdrop-blur-sm p-4 rounded-xl border border-border/50 shadow-sm">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Fee Categories
          </h3>
          <p className="text-sm text-muted-foreground">Define base categories like Tuition, Bus, or Exams.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate} className="nice-shadow">
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editingType ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingType ? "Edit Fee Category" : "New Fee Category"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="typeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Tuition Fee" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Scope or details of this fee..." className="resize-none" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full">
                    {editingType ? "Update Category" : "Create Category"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {feeTypes.map((type) => (
            <motion.div
              layout
              key={type.feeTypeId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="hover:border-primary/50 transition-all nice-shadow group">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-semibold">{type.typeName}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(type)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingId(type.feeTypeId)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {type.description || "No description provided for this category."}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && feeTypes.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-border/60 rounded-3xl bg-muted/20">
            <div className="p-4 bg-background rounded-full shadow-inner ring-1 ring-border">
              <Tag className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">No Categories Found</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                You need to create categories like "Tuition" or "Transport" before creating structure bundles.
              </p>
            </div>
            <Button variant="outline" onClick={handleCreate} className="mt-2 ring-offset-background">
              <Plus className="mr-2 h-4 w-4" /> Create First Category
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This category will be permanently removed. You cannot delete categories that are currently linked to existing Fee Structures.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
