import { useState, useEffect } from "react";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowRight, ClipboardList, MessageSquare, CreditCard, CheckCircle2, Clock, Search, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ApplicantOverviewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<any>(null);

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      const response = await axios.get("/admission/applications/mine");
      setApp(response.data);
    } catch (error) {
      toast.error("Failed to load application status.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!app?.uuid) return;
    try {
      const response = await axios.get(`/admission/payment/receipt/${app.uuid}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `admission_receipt_${app.uuid.substring(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Receipt downloaded successfully.");
    } catch (error) {
      toast.error("Failed to download receipt.");
    }
  };

  const statusMap: any = {
    'DRAFT': { color: 'bg-slate-500', label: 'Draft', icon: ClipboardList, desc: 'Your application is in progress.' },
    'SUBMITTED': { color: 'bg-yellow-500', label: 'Submitted', icon: Clock, desc: 'Application received and awaiting initial review.' },
    'UNDER_REVIEW': { color: 'bg-indigo-500', label: 'Under Review', icon: Search, desc: 'Our team is currently reviewing your documents.' },
    'APPROVED': { color: 'bg-blue-500', label: 'Approved', icon: CheckCircle2, desc: 'Approved! Please proceed to fee payment.' },
    'REJECTED': { color: 'bg-red-500', label: 'Rejected', icon: XCircle, desc: 'Your application has been rejected. Please contact support.' },
    'FEE_PAID': { color: 'bg-green-500', label: 'Application Fee Paid', icon: CheckCircle2, desc: 'Payment verified! Your application fee has been received.' },
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentStatus = statusMap[app?.status || 'DRAFT'];
  if (!currentStatus) return null;
  const progress = app?.status === 'FEE_PAID' ? 100 : ((app?.currentSection || 0) / 9) * 100;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Applicant Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here is the status of your admission process.</p>
        </div>
        <Badge className={`${currentStatus.color} text-white px-4 py-1 text-sm rounded-full`}>
          {currentStatus.label}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Application Status Card */}
        <Card className="md:col-span-2 border-primary/20 shadow-sm">
          <CardHeader className="flex flex-row items-center space-x-4 pb-2">
            <div className={`p-2 rounded-lg ${currentStatus.color} bg-opacity-10`}>
              <currentStatus.icon className={`h-6 w-6 ${currentStatus.color.replace('bg-', 'text-')}`} />
            </div>
            <div>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>{currentStatus.desc}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Completion Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mt-4 border-t pt-4">
              <div>
                <p className="text-muted-foreground">Application ID</p>
                <p className="font-mono font-medium">{app?.uuid?.substring(0, 8).toUpperCase() || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">{app?.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t flex justify-end p-4">
            {app?.status === 'DRAFT' && (
              <Button onClick={() => navigate("/dashboard/applicant/form")}>
                Continue Application <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {app?.status === 'APPROVED' && (
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate("/dashboard/applicant/payment")}>
                Pay Admission Fee <CreditCard className="ml-2 h-4 w-4" />
              </Button>
            )}
            {app?.status === 'FEE_PAID' && (
              <Button 
                variant="outline" 
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={handleDownloadReceipt}
              >
                Download Receipt <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Quick Links / Support */}
        <div className="space-y-6">
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-lg">Need Help?</CardTitle>
               <CardDescription>Our team is here to assist you.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
               <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/dashboard/applicant/enquiry")}>
                 <MessageSquare className="mr-2 h-4 w-4" /> Raise an Enquiry
               </Button>
               <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-100">
                 <p className="font-semibold text-blue-700 mb-1">Office Hours</p>
                 <p>Mon - Fri: 9:00 AM - 4:00 PM</p>
                 <p>Sat: 9:00 AM - 1:00 PM</p>
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
