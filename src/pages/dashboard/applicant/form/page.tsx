import { useState, useEffect } from "react";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import StudentBasicDetailsForm from "./steps/StudentBasicDetailsForm";
import AddressContactForm from "./steps/AddressContactForm";
import ParentGuardianForm from "./steps/ParentGuardianForm";
import AcademicInfoForm from "./steps/AcademicInfoForm";
import DocumentUploadsForm from "./steps/DocumentUploadsForm";
import AdmissionDetailsForm from "./steps/AdmissionDetailsForm";
import MedicalInformationForm from "./steps/MedicalInformationForm";
import TransportDetailsForm from "./steps/TransportDetailsForm";
import DeclarationForm from "./steps/DeclarationForm";

const STEPS = [
  "Basic Details",
  "Address & Contact",
  "Parents/Guardian",
  "Academic Info",
  "Uploads",
  "Admission Info",
  "Medical Info",
  "Transport",
  "Declaration"
];

export default function AdmissionFormPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchApplication();
  }, []);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/admission/applications/mine");
      setData(response.data);
      setCurrentStep(response.data.currentSection || 1);
    } catch (error) {
      toast.error("Failed to load application data.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admission Application</h1>
            <p className="text-muted-foreground">Complete all sections to submit your application.</p>
          </div>
          <div className="text-sm font-medium">
            Step {currentStep} of {STEPS.length}
          </div>
        </div>
        <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
        
        {/* Step Indicator */}
        <div className="hidden md:flex justify-between px-2">
          {STEPS.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            
            return (
              <div key={label} className="flex flex-col items-center space-y-1 w-20 text-center">
                <div className={`rounded-full p-1 ${isCompleted ? 'text-primary' : isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className={`h-5 w-5 ${isActive ? 'fill-primary text-primary' : ''}`} />}
                </div>
                <span className={`text-[10px] font-medium leading-tight ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="border shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">{STEPS[currentStep - 1]}</CardTitle>
          <CardDescription>Section {currentStep} - Save your progress as you go.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[400px]">
             {currentStep === 1 && <StudentBasicDetailsForm initialData={data?.studentBasicDetails} onNext={handleNext} />}
             {currentStep === 2 && <AddressContactForm initialData={data?.addressContactDetails} onNext={handleNext} onBack={handleBack} />}
             {currentStep === 3 && <ParentGuardianForm initialData={data?.parentGuardianDetails} onNext={handleNext} onBack={handleBack} />}
             {currentStep === 4 && <AcademicInfoForm initialData={data?.academicInformation} onNext={handleNext} onBack={handleBack} />}
             {currentStep === 5 && <DocumentUploadsForm initialData={data?.documentUploads} onNext={handleNext} onBack={handleBack} />}
             {currentStep === 6 && <AdmissionDetailsForm initialData={data?.admissionDetails} onNext={handleNext} onBack={handleBack} />}
             {currentStep === 7 && <MedicalInformationForm initialData={data?.medicalInformation} onNext={handleNext} onBack={handleBack} />}
             {currentStep === 8 && <TransportDetailsForm initialData={data?.transportDetails} onNext={handleNext} onBack={handleBack} />}
             {currentStep === 9 && <DeclarationForm initialData={data?.declarationSection} onBack={handleBack} />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
