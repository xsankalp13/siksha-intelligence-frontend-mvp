import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HeartPulse, Activity, AlertTriangle, Syringe, Save, Edit, Loader2, User, Phone, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/axios";
import { useChildStore } from "@/features/parent/stores/useChildStore";
import type { ComprehensiveUserProfileResponseDTO } from "@/services/types/profile";

export default function HealthPage() {
  const { selectedChildId } = useChildStore();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [bloodGroup, setBloodGroup] = useState("");
  const [physicianName, setPhysicianName] = useState("");
  const [physicianPhone, setPhysicianPhone] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [allergiesText, setAllergiesText] = useState("");

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["child-profile", selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) return null;
      const res = await api.get<ComprehensiveUserProfileResponseDTO>(`/guardian/dashboard/profile/${selectedChildId}`);
      return res.data;
    },
    enabled: !!selectedChildId,
  });

  // Sync profile data to form state when data loads or editing begins
  useEffect(() => {
    if (profile) {
      setBloodGroup(profile.basicProfile?.bloodGroup || "");
      const med = profile.studentDetails?.medicalRecord;
      setPhysicianName(med?.physicianName || "");
      setPhysicianPhone(med?.physicianPhone || "");
      setInsuranceProvider(med?.insuranceProvider || "");
      setInsurancePolicy(med?.insurancePolicyNumber || "");
      setEmergencyName(med?.emergencyContactName || "");
      setEmergencyPhone(med?.emergencyContactPhone || "");
      
      const allergiesList = med?.allergies?.map(a => a.allergy).join(", ") || "";
      setAllergiesText(allergiesList);
    }
  }, [profile, isEditing]);

  const updateHealthMutation = useMutation({
    mutationFn: async (payload: any) => {
      // Assuming backend enables PUT at this endpoint for updates
      return api.put(`/guardian/dashboard/health/${selectedChildId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-profile", selectedChildId] });
      setIsEditing(false);
    }
  });

  const handleSave = () => {
    const payload = {
      bloodGroup: bloodGroup, // Handled either on basicProfile or medicalRecord top-level if custom mapped
      medicalRecord: {
        physicianName,
        physicianPhone,
        insuranceProvider,
        insurancePolicyNumber: insurancePolicy,
        emergencyContactName: emergencyName,
        emergencyContactPhone: emergencyPhone,
        allergies: allergiesText.split(',').map(a => ({ allergy: a.trim() })).filter(a => a.allergy !== "")
      }
    };
    updateHealthMutation.mutate(payload);
  };

  if (!selectedChildId) {
    return <div className="p-6 text-center text-muted-foreground">Please select a child to view health records.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Loading medical records...</p>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-2xl bg-rose-500/5 border-rose-500/20 max-w-xl mx-auto my-12">
        <AlertTriangle className="h-10 w-10 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold">Failed to load health records</h3>
      </div>
    );
  }

  const med = profile.studentDetails?.medicalRecord;
  const isUpdating = updateHealthMutation.isPending;

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HeartPulse className="h-8 w-8 text-rose-500" />
            Health & Well-being
          </h1>
          <p className="text-muted-foreground mt-1">Manage medical records, physician details, and emergencies.</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" /> Update Records
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isUpdating}>Cancel</Button>
            <Button onClick={handleSave} disabled={isUpdating} className="bg-emerald-600 hover:bg-emerald-700">
              {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 col-span-1 border-t-4 border-t-rose-500">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-rose-500" /> Vital Info
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Blood Group</Label>
              {isEditing ? (
                <Input value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} placeholder="e.g., O+, AB-" />
              ) : (
                <p className="text-xl font-bold text-foreground">{profile.basicProfile?.bloodGroup || "Not Provided"}</p>
              )}
            </div>
          </div>
          
          <div className="mt-8 space-y-2">
            <Label className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" /> Allergies
            </Label>
            {isEditing ? (
              <Input 
                value={allergiesText} 
                onChange={e => setAllergiesText(e.target.value)} 
                placeholder="Comma separated: Peanuts, Dust" 
              />
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {med?.allergies && med.allergies.length > 0 ? (
                  med.allergies.map((a, i) => (
                    <Badge key={i} variant="secondary" className="bg-amber-500/10 text-amber-600">
                      {a.allergy}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic">No known allergies</p>
                )}
              </div>
            )}
          </div>
        </Card>
        
        <Card className="p-6 col-span-1 border-t-4 border-t-blue-500">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-blue-600">
            <User className="w-5 h-5" /> Primary Physician
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Physician Name</Label>
              {isEditing ? (
                <Input value={physicianName} onChange={e => setPhysicianName(e.target.value)} placeholder="Dr. XYZ" />
              ) : (
                <p className="font-semibold text-foreground">{med?.physicianName || "Not Provided"}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Physician Phone</Label>
              {isEditing ? (
                <Input value={physicianPhone} onChange={e => setPhysicianPhone(e.target.value)} placeholder="+1 234 567 890" />
              ) : (
                <p className="font-semibold text-foreground">{med?.physicianPhone || "Not Provided"}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-rose-500/5 to-rose-500/10 border-rose-500/20 md:col-span-1">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-rose-600">
            <AlertTriangle className="w-5 h-5" /> Emergency Contact
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-rose-600">Contact Name</Label>
              {isEditing ? (
                <Input value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Emergency Contact Name" />
              ) : (
                <p className="text-lg font-bold">{med?.emergencyContactName || "Not Provided"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-rose-600">Emergency Phone</Label>
              {isEditing ? (
                <Input value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="Emergency Phone Number" />
              ) : (
                <p className="text-muted-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" /> {med?.emergencyContactPhone || "Not Provided"}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-1 border-t-4 border-emerald-500/50 bg-emerald-500/5">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-emerald-600">
            <Syringe className="w-5 h-5" /> Insurance Info
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-emerald-700">Provider Name</Label>
              {isEditing ? (
                <Input value={insuranceProvider} onChange={e => setInsuranceProvider(e.target.value)} placeholder="Insurance Provider" />
              ) : (
                <p className="font-semibold">{med?.insuranceProvider || "Not Provided"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-emerald-700">Policy Number</Label>
              {isEditing ? (
                <Input value={insurancePolicy} onChange={e => setInsurancePolicy(e.target.value)} placeholder="Policy Number" />
              ) : (
                <p className="font-semibold text-muted-foreground">{med?.insurancePolicyNumber || "Not Provided"}</p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
