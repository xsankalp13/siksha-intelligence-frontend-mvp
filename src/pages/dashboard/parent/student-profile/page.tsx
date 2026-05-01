import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  User, MapPin, Mail, Phone, Calendar, HeartPlus, ShieldAlert, GraduationCap, AlertTriangle, RefreshCcw, Users
} from "lucide-react";

import { api } from "@/lib/axios";
import type { ComprehensiveUserProfileResponseDTO, StudentMedicalAllergyDTO, AddressDTO } from "@/services/types/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useChildStore } from "@/features/parent/stores/useChildStore";
import { UserAvatar } from "@/components/shared/UserAvatar";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-6 p-6 rounded-2xl bg-muted/30">
        <Skeleton className="w-20 h-20 rounded-full shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-5">
          <Skeleton className="h-[200px] rounded-2xl" />
          <Skeleton className="h-[200px] rounded-2xl" />
        </div>
        <div className="lg:col-span-8 space-y-5">
          <Skeleton className="h-[200px] rounded-2xl" />
          <Skeleton className="h-[200px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function ParentStudentProfilePage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const { selectedChildId } = useChildStore();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["child-profile", selectedChildId],
    queryFn: async () => {
      if (!selectedChildId) throw new Error("No child selected");
      // Calling the dedicated guardian endpoint for fetching a child's profile
      const res = await api.get<ComprehensiveUserProfileResponseDTO>(`/guardian/dashboard/profile/${selectedChildId}`);
      return res.data;
    },
    enabled: !!selectedChildId,
    staleTime: 5 * 60 * 1000,
  });

  if (!selectedChildId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Users className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-bold tracking-tight mb-2">No Child Selected</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">Please select a child from the top to view their profile.</p>
      </div>
    );
  }

  if (isError) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 opacity-70" />
        <h2 className="text-xl font-bold tracking-tight mb-2">Unable to Load Profile</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">There was an issue fetching the profile details. You may not have access or the record was not found.</p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2"><RefreshCcw className="w-4 h-4" /> Try Again</Button>
      </motion.div>
    );
  }

  if (isLoading || !data) return <ProfileSkeleton />;

  const { basicProfile, studentDetails, addresses } = data;
  const fullName = [basicProfile.firstName, basicProfile.middleName, basicProfile.lastName].filter(Boolean).join(" ");
  const primaryAddress = addresses?.find((a: AddressDTO) => a.addressType === "HOME") || addresses?.[0];
  const medicalRecord = studentDetails?.medicalRecord;

  return (
    <motion.div
      className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto pb-12"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={fadeUp}>
        <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" />
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <UserAvatar
                profileUrl={basicProfile.profileUrl}
                name={fullName}
                className="w-20 h-20 text-2xl ring-2 ring-border/50 shadow-md shrink-0"
              />
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{fullName}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 mt-1.5">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> @{basicProfile.username}
                  </span>
                  <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5" /> {studentDetails?.enrollmentNo || "N/A"}
                  </span>
                  <span className="text-muted-foreground/30 hidden sm:inline">•</span>
                  <Badge
                    variant={studentDetails?.enrollmentStatus === "ACTIVE" ? "default" : "secondary"}
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-none font-semibold text-[10px] h-5"
                  >
                    {studentDetails?.enrollmentStatus || "UNKNOWN"}
                  </Badge>
                </div>
                {basicProfile.email && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center sm:justify-start gap-1.5">
                    <Mail className="w-3 h-3" /> {basicProfile.email}
                  </p>
                )}
              </div>
              <div className="hidden md:flex flex-col items-end gap-1.5 text-right shrink-0">
                {basicProfile.dateOfBirth && (
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full">
                      <Calendar className="w-3 h-3" />
                      {new Date(basicProfile.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <motion.div variants={fadeUp} className="lg:col-span-12">
          <Card className="border-border/40 shadow-sm rounded-2xl h-full">
            <CardHeader className="p-5 pb-3 border-b border-border/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" /> Academic Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DataField label="First Name" value={basicProfile.firstName} />
                <DataField label="Last Name" value={basicProfile.lastName} />
                {basicProfile.middleName && <DataField label="Middle Name" value={basicProfile.middleName} />}
                <DataField label="Enrollment" value={studentDetails?.enrollmentNo || "N/A"} />
                <DataField label="Date of Birth" value={basicProfile.dateOfBirth ? new Date(basicProfile.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"} />
                <DataField label="Account Created" value={basicProfile.createdAt ? new Date(basicProfile.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div variants={fadeUp}>
          <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden group h-full">
            <CardHeader className="p-5 pb-3 border-b border-border/30 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Registered Address
              </CardTitle>
              <Badge variant="outline" className="text-[10px] h-5 font-medium">Read Only</Badge>
            </CardHeader>
            <CardContent className="p-5">
              {primaryAddress ? (
                <div className="space-y-3">
                  <DataField label="Street" value={primaryAddress.addressLine1} />
                  {primaryAddress.addressLine2 && <DataField label="Line 2" value={primaryAddress.addressLine2} />}
                  <div className="grid grid-cols-2 gap-4">
                    <DataField label="City / State" value={[primaryAddress.city, primaryAddress.state].filter(Boolean).join(", ") || "N/A"} />
                    <DataField label="Postal Code" value={primaryAddress.postalCode || "N/A"} />
                  </div>
                  {primaryAddress.country && <DataField label="Country" value={primaryAddress.country} />}
                </div>
              ) : (
                <EmptyState icon={MapPin} text="No address registered." />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border-rose-500/15 shadow-sm rounded-2xl overflow-hidden group h-full bg-rose-500/[0.02]">
            <CardHeader className="p-5 pb-3 border-b border-rose-500/10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-rose-500/10 rounded-lg">
                  <HeartPlus className="w-4 h-4 text-rose-500" />
                </div>
                <CardTitle className="text-sm font-semibold text-rose-900 dark:text-rose-400">Medical & Emergency</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] h-5 font-medium border-rose-500/20 text-rose-600 bg-rose-500/5">Read Only</Badge>
            </CardHeader>
            <CardContent className="p-5">
              {medicalRecord ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold text-rose-900/50 dark:text-rose-400/50 uppercase tracking-[0.06em] mb-1">Emergency Contact</p>
                      <p className="font-medium text-foreground text-sm">{medicalRecord.emergencyContactName || "—"}</p>
                      {medicalRecord.emergencyContactPhone && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> {medicalRecord.emergencyContactPhone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-rose-900/50 dark:text-rose-400/50 uppercase tracking-[0.06em] mb-1">Physician</p>
                      <p className="font-medium text-foreground text-sm">{medicalRecord.physicianName || "—"}</p>
                      {medicalRecord.physicianPhone && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> {medicalRecord.physicianPhone}</p>
                      )}
                    </div>
                  </div>
                  {medicalRecord.insuranceProvider && (
                    <div className="pt-2 border-t border-rose-500/10">
                      <div className="grid grid-cols-2 gap-4">
                        <DataField label="Insurance" value={medicalRecord.insuranceProvider} rose />
                        {medicalRecord.insurancePolicyNumber && <DataField label="Policy #" value={medicalRecord.insurancePolicyNumber} rose />}
                      </div>
                    </div>
                  )}
                  {medicalRecord.allergies && medicalRecord.allergies.length > 0 && (
                    <div className="pt-2 border-t border-rose-500/10">
                      <p className="text-[11px] font-semibold text-rose-900/50 dark:text-rose-400/50 uppercase tracking-[0.06em] mb-2 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> Allergies
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {medicalRecord.allergies.map((a: StudentMedicalAllergyDTO, i: number) => (
                          <Badge key={i} variant="destructive" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/15 text-[10px] font-semibold">
                            {a.allergy}{a.severity && ` · ${a.severity}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState icon={ShieldAlert} text="No medical details found." rose />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </motion.div>
  );
}

function DataField({ label, value, rose }: { label: string; value?: string; rose?: boolean }) {
  return (
    <div>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] mb-0.5 ${rose ? "text-rose-900/50 dark:text-rose-400/50" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="font-medium text-foreground text-sm">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text, rose }: { icon: React.ElementType; text: string; rose?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
        <Icon className={`w-8 h-8 mb-2 ${rose ? "text-rose-500/20" : "text-muted-foreground/15"}`} />
      </motion.div>
      <p className={`text-xs ${rose ? "text-rose-900/50 dark:text-rose-400/50" : "text-muted-foreground"}`}>{text}</p>
    </div>
  );
}