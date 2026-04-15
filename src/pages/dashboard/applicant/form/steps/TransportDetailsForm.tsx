import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";

const schema = z.object({
  pickupLocation: z.string().optional(),
  routeOrStop: z.string().optional(),
  distanceFromSchool: z.string().optional(),
});

export default function TransportDetailsForm({ initialData, onNext, onBack }: any) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      pickupLocation: "",
      routeOrStop: "",
      distanceFromSchool: "",
    },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      await axios.put("/admission/applications/sections/8", values);
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
          <FormField control={form.control} name="pickupLocation" render={({ field }) => (
            <FormItem><FormLabel>Preferred Pickup Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="routeOrStop" render={({ field }) => (
            <FormItem><FormLabel>Preferred Route / Stop</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="distanceFromSchool" render={({ field }) => (
            <FormItem><FormLabel>Approx Distance from School (km)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
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
