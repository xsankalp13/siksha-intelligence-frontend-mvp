import { useState, useEffect } from "react";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, MessageSquare, User, Calendar, Reply } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters long"),
  message: z.string().min(10, "Message must be at least 10 characters long"),
  classApplyingFor: z.string().optional(),
});

export default function AdmissionEnquiryPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { subject: "", message: "", classApplyingFor: "" },
  });

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const response = await axios.get("/admission/enquiries/mine");
      setEnquiries(response.data);
    } catch (error) {
      toast.error("Failed to load enquiries.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      await axios.post("/admission/enquiries", values);
      toast.success("Enquiry sent! We will get back to you soon.");
      form.reset();
      fetchEnquiries();
    } catch (error) {
      toast.error("Failed to send enquiry. Please check your inputs.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Admission Enquiry</h1>
        <p className="text-muted-foreground">Have questions about the admission process? Send us a message.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Enquiry Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg">New Enquiry</CardTitle>
              <CardDescription>Ask about fees, curriculum, or requirements.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Admission for Grade 1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="classApplyingFor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Grade 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Message</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Type your question in detail..." 
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Send Message
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Enquiry History */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="font-semibold text-lg flex items-center">
            <MessageSquare className="mr-2 h-5 w-5 text-primary" /> Your Message History
          </h3>
          
          {enquiries.length === 0 ? (
            <div className="text-center py-10 bg-muted/20 rounded-lg border-2 border-dashed">
              <p className="text-muted-foreground">No enquiries found yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enquiries.map((e) => (
                <Card key={e.uuid} className="overflow-hidden border-l-4 border-l-primary">
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm">{e.subject}</h4>
                        <div className="flex items-center space-x-2 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                          <Calendar className="h-3 w-3" />
                          <span>Sent: {new Date(e.createdAt).toLocaleDateString()}</span>
                          {e.classApplyingFor && <span>• Class: {e.classApplyingFor}</span>}
                        </div>
                      </div>
                      <Badge variant={e.status === 'REPLIED' ? 'default' : 'outline'} className={e.status === 'REPLIED' ? 'bg-green-600' : ''}>
                        {e.status}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-700">{e.message}</p>
                    
                    {e.adminReply && (
                      <div className="mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100 relative shadow-inner">
                        <Reply className="h-3 w-3 absolute -top-1 -left-1 text-blue-600 rotate-180" />
                        <div className="flex items-center space-x-2 mb-2">
                          <User className="h-4 w-4 text-blue-700 bg-blue-100 p-0.5 rounded-full" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Official Response</span>
                        </div>
                        <p className="text-sm text-slate-800 font-medium">{e.adminReply}</p>
                        <p className="text-[10px] text-muted-foreground mt-3 italic">
                          Replied on {new Date(e.adminRepliedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
