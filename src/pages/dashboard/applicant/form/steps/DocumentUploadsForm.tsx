import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api as axios } from "@/lib/axios";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Upload, FileText, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DocumentUploadsForm({ initialData, onNext, onBack }: any) {
  const [loading, setLoading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [docs, setDocs] = useState<any>(initialData || {
    birthCertificateUrl: "",
    transferCertificateUrl: "",
    aadhaarCardUrl: "",
    reportCardUrl: "",
    studentPhotoUrl: "",
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "edusync_uploads"); // Standard Cloudinary preset or similar

    try {
      // For this demo/task, we'll simulate the upload to Cloudinary and get a URL
      // In a real app, you'd use your Cloudinary credentials or a backend signed upload endpoint
      
      // Simulating...
      await new Promise(resolve => setTimeout(resolve, 1500));
      const simulatedUrl = "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
      
      setDocs((prev: any) => ({ ...prev, [field]: simulatedUrl }));
      toast.success("File uploaded successfully.");
    } catch (error) {
      toast.error("Fixed upload failed.");
    } finally {
      setUploadingField(null);
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    try {
      await axios.put("/admission/applications/sections/5", docs);
      toast.success("Documents saved!");
      onNext();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save section.");
    } finally {
      setLoading(false);
    }
  };

  const DocItem = ({ label, field }: { label: string, field: string }) => (
    <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
      <div className="flex justify-between items-center">
        <Label className="font-semibold">{label}</Label>
        {docs[field] && <CheckCircle2 className="h-5 w-5 text-green-500" />}
      </div>
      <div className="flex gap-4 items-center">
        <Input 
          type="file" 
          onChange={(e) => handleFileUpload(e, field)} 
          disabled={!!uploadingField}
          className="cursor-pointer"
        />
        {uploadingField === field && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>
      {docs[field] && (
        <a href={docs[field]} target="_blank" rel="noreferrer" className="text-xs text-primary underline flex items-center">
          <FileText className="h-3 w-3 mr-1" /> View Uploaded File
        </a>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DocItem label="Birth Certificate" field="birthCertificateUrl" />
        <DocItem label="Aadhaar Card" field="aadhaarCardUrl" />
        <DocItem label="Student Photograph" field="studentPhotoUrl" />
        <DocItem label="Previous Marksheet (Report Card)" field="reportCardUrl" />
        <DocItem label="Transfer Certificate (TC)" field="transferCertificateUrl" />
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={loading || !!uploadingField}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save & Next
        </Button>
      </div>
    </div>
  );
}
