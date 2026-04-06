import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  User,
  MapPin,
  Mail,
  Phone,
  Calendar,
  HeartPlus,
  ShieldAlert,
  GraduationCap,
  AlertTriangle,
  RefreshCcw,
  Edit2,
  Plus,
  Users,
  Shield,
  Briefcase,
} from "lucide-react";

import { profileService } from "@/services/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileImageUploader } from "@/components/shared/ProfileImageUploader";
import { AddressEditorDialog } from "@/features/student/profile/components/AddressEditorDialog";
import { MedicalEditorDialog } from "@/features/student/profile/components/MedicalEditorDialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { GuardianProfileDTO } from "@/services/types/profile";
import { idCardService, triggerBlobDownload } from "@/services/idCard";
import { IdCardPreview } from "@/features/uis/id-card/IdCardPreview";

/* ── Animation Variants ─────────────────────────────────────────────── */
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

/* ── Skeleton ───────────────────────────────────────────────────────── */
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

/* ── Page Component ─────────────────────────────────────────────────── */
export default function StudentProfilePage() {
  useEffect(() => window.scrollTo(0, 0), []);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);

  // Profile data
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["student-profile", "me"],
    queryFn: async () => (await profileService.getMyProfile()).data,
    staleTime: 5 * 60 * 1000,
  });

  // Guardian data (dedicated endpoint)
  const { data: guardians } = useQuery({
    queryKey: ["student-profile", "guardians"],
    queryFn: async () => (await profileService.getMyGuardians()).data,
    staleTime: 5 * 60 * 1000,
  });

  // Medical data (dedicated endpoint)
  const { data: medicalRecord } = useQuery({
    queryKey: ["student-profile", "medical"],
    queryFn: async () => {
      try {
        const resp = await profileService.getMyMedicalRecord();
        return resp.data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
  


  if (isError) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4 opacity-70" />
        <h2 className="text-xl font-bold tracking-tight mb-2">Unable to Load Profile</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">There was an issue fetching your profile.</p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2"><RefreshCcw className="w-4 h-4" /> Try Again</Button>
      </motion.div>
    );
  }

  if (isLoading || !data) return <ProfileSkeleton />;

  const { basicProfile, studentDetails, addresses } = data;
  const fullName = [basicProfile.firstName, basicProfile.middleName, basicProfile.lastName].filter(Boolean).join(" ");
  const primaryAddress = addresses?.find((a) => a.addressType === "HOME") || addresses?.[0];

  const handleDownloadIdCard = async () => {
    try {
      const blob = await idCardService.downloadMyIdCard();
      triggerBlobDownload(blob.data, "my-id-card.pdf");
    } catch (error) {
      console.error("Failed to download ID card:", error);
    }
  };



  return (
    <motion.div
      className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto pb-12"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ═══════════════════════════════════════════════════════════════
          1. MINIMALISTIC HEADER BANNER — Avatar + Name + Meta inline
      ═══════════════════════════════════════════════════════════════ */}
      <motion.div variants={fadeUp}>
        <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {/* Subtle accent stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" />

            <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <ProfileImageUploader
                currentProfileUrl={basicProfile.profileUrl}
                name={fullName}
                className="w-20 h-20 text-2xl ring-2 ring-border/50 shadow-md shrink-0"
                onUploadSuccess={() => refetch()}
              />

              {/* Identity info */}
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

              {/* Quick meta pills — right side */}
              <div className="hidden md:flex flex-col items-end gap-1.5 text-right shrink-0">
                {basicProfile.dateOfBirth && (
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full">
                      <Calendar className="w-3 h-3" />
                      {new Date(basicProfile.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[11px] font-bold gap-1.5 px-3 rounded-full border-blue-100 hover:border-blue-200 hover:bg-blue-50/50 text-blue-600 shadow-sm"
                      onClick={() => setIsIdCardModalOpen(true)}
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      View ID Card
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════
          2. CONTENT GRID — Two-row design
      ═══════════════════════════════════════════════════════════════ */}

      {/* Row 1: Academic + Guardians side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Academic Profile — Compact */}
        <motion.div variants={fadeUp} className="lg:col-span-5">
          <Card className="border-border/40 shadow-sm rounded-2xl h-full">
            <CardHeader className="p-5 pb-3 border-b border-border/30">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" /> Academic Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-4">
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

        {/* Guardian Network (View Only) */}
        <motion.div variants={fadeUp} className="lg:col-span-7">
          <Card className="border-border/40 shadow-sm rounded-2xl h-full">
            <CardHeader className="p-5 pb-3 border-b border-border/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Connected Guardians
                </CardTitle>
                <Badge variant="outline" className="text-[10px] h-5 font-medium">View Only</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {guardians && guardians.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {guardians.map((g: GuardianProfileDTO) => (
                    <motion.div
                      key={g.guardianId || g.name}
                      whileHover={{ y: -2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/20 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center uppercase text-sm font-bold text-primary shrink-0">
                        {g.firstName?.charAt(0) || g.name?.charAt(0) || "G"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">{g.name || `${g.firstName || ""} ${g.lastName || ""}`.trim()}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] h-[18px] py-0 font-semibold tracking-wider">
                            {g.relation || g.relationshipType || "GUARDIAN"}
                          </Badge>
                          {g.primaryContact && (
                            <span className="text-emerald-500 text-[9px] font-bold uppercase flex items-center gap-0.5">
                              <Shield className="w-2.5 h-2.5" />Primary
                            </span>
                          )}
                        </div>
                      </div>
                      {g.phoneNumber && (
                        <div className="text-right hidden sm:block shrink-0">
                          <p className="text-[10px] text-muted-foreground font-medium">{g.phoneNumber}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="w-8 h-8 text-muted-foreground/15 mb-2" />
                  <p className="text-sm text-muted-foreground">No guardians linked to your account.</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Contact administration to resolve.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 2: Address + Medical side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Address */}
        <motion.div variants={fadeUp}>
          <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden group h-full">
            <CardHeader className="p-5 pb-3 border-b border-border/30 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Primary Address
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsAddressModalOpen(true)}
              >
                {primaryAddress ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </Button>
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
                <EmptyState icon={MapPin} text="No address registered." actionText="Add Address" onAction={() => setIsAddressModalOpen(true)} />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Medical & Emergency */}
        <motion.div variants={fadeUp}>
          <Card className="border-rose-500/15 shadow-sm rounded-2xl overflow-hidden group h-full bg-rose-500/[0.02]">
            <CardHeader className="p-5 pb-3 border-b border-rose-500/10 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-rose-500/10 rounded-lg">
                  <HeartPlus className="w-4 h-4 text-rose-500" />
                </div>
                <CardTitle className="text-sm font-semibold text-rose-900 dark:text-rose-400">Medical & Emergency</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                onClick={() => setIsMedicalModalOpen(true)}
              >
                {medicalRecord ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </Button>
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
                        {medicalRecord.allergies.map((a, i) => (
                          <Badge key={i} variant="destructive" className="bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/15 text-[10px] font-semibold">
                            {a.allergy}{a.severity && ` · ${a.severity}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState icon={ShieldAlert} text="No medical details found." actionText="Add Medical Info" onAction={() => setIsMedicalModalOpen(true)} rose />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* CRUD Dialogs */}
      <AddressEditorDialog isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} initialData={primaryAddress} />
      <MedicalEditorDialog isOpen={isMedicalModalOpen} onClose={() => setIsMedicalModalOpen(false)} initialData={medicalRecord} />

      {/* ID Card Modal */}
      <Dialog open={isIdCardModalOpen} onOpenChange={setIsIdCardModalOpen}>
        <DialogContent className="max-w-fit p-0 overflow-hidden border-none bg-transparent shadow-none">
           <div className="p-8">
            <IdCardPreview
              onDownload={handleDownloadIdCard}
            />
           </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

/* ── Reusable Sub-components ────────────────────────────────────────── */

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

function EmptyState({ icon: Icon, text, actionText, onAction, rose }: { icon: React.ElementType; text: string; actionText: string; onAction: () => void; rose?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className={`w-8 h-8 mb-2 ${rose ? "text-rose-500/20" : "text-muted-foreground/15"}`} />
      </motion.div>
      <p className={`text-xs ${rose ? "text-rose-900/50 dark:text-rose-400/50" : "text-muted-foreground"}`}>{text}</p>
      <Button variant="link" size="sm" className={`mt-1 text-xs h-auto p-0 ${rose ? "text-rose-600" : ""}`} onClick={onAction}>{actionText}</Button>
    </div>
  );
}