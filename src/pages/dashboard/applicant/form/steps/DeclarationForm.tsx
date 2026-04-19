import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";

export default function DeclarationForm({ initialData, onBack }: any) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(initialData?.informationCorrect && initialData?.agreesToRules || false);

  const onSubmit = async () => {
    if (!accepted) {
      toast.error("Please accept the declaration to proceed.");
      return;
    }

    setLoading(true);
    try {
      // 1. Save declaration using backend fields
      await axios.put("/admission/applications/sections/9", { 
        informationCorrect: true, 
        agreesToRules: true,
        declarationDate: new Date().toISOString().split('T')[0] 
      });
      // 2. Submit entire application
      await axios.post("/admission/applications/submit");
      toast.success("Application submitted successfully!");
      navigate("/dashboard/applicant");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-6 border rounded-lg bg-muted/20 space-y-4">
        <h3 className="text-lg font-bold">Declaration by Parent/Guardian</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          I hereby declare that the information provided in this admission form is true, complete and correct to the best of my knowledge and belief. I understand that any false or misleading information may result in the rejection of this application or subsequent dismissal of the student if admitted. I also agree to abide by the rules and regulations of the school.
        </p>
        
        <div className="flex items-center space-x-2 pt-4">
          <Checkbox 
            id="terms" 
            checked={accepted} 
            onCheckedChange={(checked) => setAccepted(checked === true)} 
          />
          <Label htmlFor="terms" className="text-sm cursor-pointer">
            I accept the terms and conditions of the admission process.
          </Label>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={loading || !accepted} className="bg-green-600 hover:bg-green-700 text-white">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Application
        </Button>
      </div>
    </div>
  );
}
