import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";

const schema = z.object({
  allergies: z.string().optional(),
  existingMedicalConditions: z.string().optional(),
  disabilities: z.string().optional(),
  emergencyContactPerson: z.string().min(2, "Emergency contact name is required"),
  emergencyContactNumber: z.string().min(10, "Number is required"),
});

export default function MedicalInformationForm({ initialData, onNext, onBack }: any) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      allergies: "None",
      existingMedicalConditions: "None",
      disabilities: "None",
      emergencyContactPerson: "",
      emergencyContactNumber: "",
    },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      await axios.put("/admission/applications/sections/7", values);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="allergies" render={({ field }) => (
            <FormItem><FormLabel>Allergies</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="existingMedicalConditions" render={({ field }) => (
            <FormItem><FormLabel>Existing Medical Conditions</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="disabilities" render={({ field }) => (
            <FormItem><FormLabel>Disabilities (if any)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="emergencyContactPerson" render={({ field }) => (
            <FormItem><FormLabel>Emergency Contact Person</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="emergencyContactNumber" render={({ field }) => (
            <FormItem><FormLabel>Emergency Contact Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
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
