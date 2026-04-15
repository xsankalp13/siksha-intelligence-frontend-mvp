import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";

const schema = z.object({
  fatherName: z.string().min(2, "Father's name is required"),
  fatherOccupation: z.string().optional(),
  fatherQualification: z.string().optional(),
  fatherAnnualIncome: z.string().optional(),
  fatherMobile: z.string().min(10, "Father's mobile is required"),
  motherName: z.string().min(2, "Mother's name is required"),
  motherOccupation: z.string().optional(),
  motherQualification: z.string().optional(),
  motherAnnualIncome: z.string().optional(),
  motherMobile: z.string().min(10, "Mother's mobile is required"),
  guardianName: z.string().optional(),
  guardianRelationship: z.string().optional(),
  guardianContact: z.string().optional(),
});

export default function ParentGuardianForm({ initialData, onNext, onBack }: any) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      fatherName: "",
      fatherOccupation: "",
      fatherQualification: "",
      fatherAnnualIncome: "",
      fatherMobile: "",
      motherName: "",
      motherOccupation: "",
      motherQualification: "",
      motherAnnualIncome: "",
      motherMobile: "",
      guardianName: "",
      guardianRelationship: "",
      guardianContact: "",
    },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      await axios.put("/admission/applications/sections/3", values);
      toast.success("Progress saved!");
      onNext();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save section.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Father's Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="fatherName" render={({ field }) => (
              <FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="fatherMobile" render={({ field }) => (
              <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="fatherOccupation" render={({ field }) => (
              <FormItem><FormLabel>Occupation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="fatherAnnualIncome" render={({ field }) => (
              <FormItem><FormLabel>Annual Income</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Mother's Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="motherName" render={({ field }) => (
              <FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="motherMobile" render={({ field }) => (
              <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="motherOccupation" render={({ field }) => (
              <FormItem><FormLabel>Occupation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="motherAnnualIncome" render={({ field }) => (
              <FormItem><FormLabel>Annual Income</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Next
          </Button>
        </div>
      </form>
    </Form>
  );
}
