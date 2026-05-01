import { User, Mail, Phone, MapPin, Edit, Shield, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { profileService } from "@/services/profile";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAppSelector } from "@/store/hooks";

export default function ProfilePage() {
  const { user: authUser } = useAppSelector(state => state.auth);
  const [isEditing, setIsEditing] = useState(false);

  const { data: profileResponse, isLoading, isError } = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const res = await profileService.getMyProfile();
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Loading profile...</p>
      </div>
    );
  }

  if (isError || !profileResponse) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center border rounded-2xl bg-rose-500/5 border-rose-500/20 max-w-xl mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold">Failed to load profile</h3>
        <p className="text-muted-foreground mt-2">Could not fetch your profile data from the server. Please try again later.</p>
      </div>
    );
  }

  const { basicProfile, addresses, guardianDetails } = profileResponse;
  
  // Extract values, preferring the complete ComprehensiveUserProfile over Redux
  const profileName = [basicProfile?.firstName, basicProfile?.middleName, basicProfile?.lastName].filter(Boolean).join(" ") || authUser?.username;
  const profileEmail = basicProfile?.email || authUser?.email || "No email registered";
  // Parent phone might be on guardianDetails or basicProfile
  const profilePhone = guardianDetails?.phoneNumber || basicProfile?.username || "No phone registered"; // Sometimes username is phone
  
  // Address formatting
  const primaryAddress = addresses?.find(a => a.addressType === "HOME") || addresses?.[0];
  const addressString = primaryAddress 
    ? [primaryAddress.addressLine1, primaryAddress.addressLine2, primaryAddress.city, primaryAddress.state, primaryAddress.postalCode].filter(Boolean).join(", ")
    : "No registered address found";

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <User className="h-8 w-8 text-primary" />
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1">Manage your personal details and app security.</p>
        </div>
        <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "outline" : "default"}>
          {isEditing ? "Cancel" : <><Edit className="w-4 h-4 mr-2" /> Edit Profile</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 md:col-span-1 flex flex-col items-center text-center space-y-4">
          <UserAvatar name={profileName} profileUrl={basicProfile?.profileUrl} className="w-32 h-32 text-4xl shadow-sm border-4 border-background ring-4 ring-primary/20" />
          <div>
            <h2 className="text-xl font-bold">{profileName || "Parent Profile"}</h2>
            <p className="text-muted-foreground">{profileEmail}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
              <Shield className="w-3 h-3" /> Guardian Account
            </div>
          </div>
        </Card>

        <Card className="p-6 md:col-span-2 space-y-6">
          <h3 className="font-bold border-b pb-4">Personal Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input disabled={!isEditing} defaultValue={profileName} className="pl-9" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input disabled={!isEditing} defaultValue={profileEmail} className="pl-9" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input disabled={!isEditing} defaultValue={profilePhone} className="pl-9" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Residential Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <textarea 
                  disabled={!isEditing} 
                  defaultValue={addressString} 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pl-9" 
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end pt-4 border-t">
              <Button>Save Changes</Button>
            </div>
          )}
        </Card>

        <Card className="p-6 md:col-span-3 border-rose-500/20 bg-rose-500/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-rose-600 flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5" /> Account Security
              </h3>
              <p className="text-sm text-muted-foreground">It is highly recommended to change your password regularly.</p>
            </div>
            <Button variant="outline" className="text-rose-600 border-rose-200 bg-background hover:bg-rose-50">Change Password</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
