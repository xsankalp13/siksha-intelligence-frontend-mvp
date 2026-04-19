import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, ShieldCheck, ArrowLeft } from "lucide-react";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function AdmissionPaymentPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [app, setApp] = useState<any>(null);

  useEffect(() => {
    fetchApplication();
  }, []);

  const fetchApplication = async () => {
    try {
      const response = await axios.get("/admission/applications/mine");
      setApp(response.data);
    } catch (error) {
      toast.error("Failed to load application details.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error("Razorpay SDK failed to load. Please check your connection.");
        setProcessing(false);
        return;
      }

      const { data: orderData } = await axios.post(`/admission/payment/create-order/${app.uuid}`);
      
      const options = {
        key: orderData.clientSecret, // Backend maps Key ID to clientSecret for Razorpay consistency
        amount: app.formFee * 100, // Amount in paise
        currency: "INR",
        name: "Shiksha Intelligence",
        description: "Admission Application Fee",
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            setProcessing(true);
            await axios.post("/admission/payment/verify", {
              gatewayTransactionId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              signature: response.razorpay_signature,
              applicationUuid: app.uuid
            });
            toast.success("Admission fee paid successfully!");
            navigate("/dashboard/applicant");
          } catch (err) {
            toast.error("Payment verification failed. If amount was deducted, please contact support.");
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: app.studentBasicDetails?.fullName || "Applicant",
          email: app.email,
          contact: app.primaryMobile
        },
        theme: {
          color: "#0f172a" // Professional Dark Slate matching the premium design
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to initiate payment.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-6">
      <Button variant="ghost" onClick={() => navigate("/dashboard/applicant")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <Card className="border shadow-2xl bg-white/50 backdrop-blur-sm overflow-hidden border-slate-200">
        <div className="bg-slate-900 text-white p-8 text-center space-y-2">
           <CardTitle className="text-3xl font-bold italic tracking-tighter">SHIKSHA INTELLIGENCE</CardTitle>
           <p className="text-slate-400 text-sm uppercase tracking-widest font-semibold">Admission Fee Payment</p>
        </div>
        <CardHeader className="pt-8">
          <CardDescription className="text-center text-lg">
            Finalize your application for <span className="font-bold text-slate-900">{app?.admissionDetails?.academicYear}</span> session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-10">
          <div className="space-y-4 rounded-xl border p-6 bg-slate-50">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Applicant</span>
              <span className="font-bold text-slate-900">{app?.studentBasicDetails?.fullName}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-muted-foreground text-sm uppercase font-bold tracking-wider">Application ID</span>
              <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded">{app?.uuid?.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-bold">Total Payable</span>
              <span className="text-3xl font-black text-slate-900">₹{app?.formFee?.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground bg-slate-100 py-2 rounded-full">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span className="uppercase tracking-widest font-bold">Bank-Grade 256-bit Secure Payment</span>
          </div>
        </CardContent>
        <CardFooter className="px-10 pb-10">
          <Button 
            className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]" 
            onClick={handlePayment} 
            disabled={processing || !app?.formFee}
          >
            {processing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CreditCard className="mr-2 h-6 w-6" />}
            Pay Admission Fee
          </Button>
        </CardFooter>
      </Card>

      <div className="flex justify-center items-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
         <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg" alt="Razorpay" className="h-4" />
         <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo.png" alt="UPI" className="h-4" />
         <img src="https://upload.wikimedia.org/wikipedia/commons/d/d1/Visa_2021.svg" alt="Visa" className="h-4" />
         <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4" />
      </div>
    </div>
  );
}

