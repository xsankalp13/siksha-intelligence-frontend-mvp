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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const schema = z.object({
  classApplyingFor: z.string().min(1, "Applying for class is required"),
  academicYear: z.string().min(4, "Academic year is required"),
  stream: z.string().optional(),
  secondLanguagePreference: z.string().optional(),
  thirdLanguagePreference: z.string().optional(),
  transportRequired: z.boolean().default(false),
  hostelRequired: z.boolean().default(false),
});

export default function AdmissionDetailsForm({ initialData, onNext, onBack }: any) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      classApplyingFor: "",
      academicYear: "2024-25",
      stream: "",
      secondLanguagePreference: "",
      thirdLanguagePreference: "",
      transportRequired: false,
      hostelRequired: false,
    },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      await axios.put("/admission/applications/sections/6", values);
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
          <FormField control={form.control} name="classApplyingFor" render={({ field }) => (
            <FormItem><FormLabel>Applying for Class</FormLabel><FormControl><Input placeholder="e.g. Nursery, Grade 1" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="academicYear" render={({ field }) => (
            <FormItem><FormLabel>Academic Year</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="stream" render={({ field }) => (
            <FormItem><FormLabel>Stream (for senior grades)</FormLabel><FormControl><Input placeholder="e.g. Science, Commerce" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="secondLanguagePreference" render={({ field }) => (
            <FormItem><FormLabel>Second Language Preference</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
          <div className="flex items-center justify-between">
            <Label htmlFor="transport">School Transport Required?</Label>
            <FormField control={form.control} name="transportRequired" render={({ field }) => (
              <Switch id="transport" checked={field.value} onCheckedChange={field.onChange} />
            )} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="hostel">Hostel Accommodation Required?</Label>
            <FormField control={form.control} name="hostelRequired" render={({ field }) => (
              <Switch id="hostel" checked={field.value} onCheckedChange={field.onChange} />
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
