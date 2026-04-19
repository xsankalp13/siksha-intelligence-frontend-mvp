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
  previousSchoolName: z.string().optional(),
  board: z.string().optional(),
  lastClassAttended: z.string().optional(),
  marksOrGradeObtained: z.string().optional(),
  mediumOfInstruction: z.string().optional(),
  transferCertificateDetails: z.string().optional(),
});

export default function AcademicInfoForm({ initialData, onNext, onBack }: any) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      previousSchoolName: "",
      board: "",
      lastClassAttended: "",
      marksOrGradeObtained: "",
      mediumOfInstruction: "",
      transferCertificateDetails: "",
    },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      await axios.put("/admission/applications/sections/4", values);
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
          <FormField control={form.control} name="previousSchoolName" render={({ field }) => (
            <FormItem><FormLabel>Last School Attended</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="board" render={({ field }) => (
            <FormItem><FormLabel>Board (e.g. CBSE, ICSE)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="lastClassAttended" render={({ field }) => (
            <FormItem><FormLabel>Last Class Attended</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="marksOrGradeObtained" render={({ field }) => (
            <FormItem><FormLabel>Marks / Grade Obtained (%)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
