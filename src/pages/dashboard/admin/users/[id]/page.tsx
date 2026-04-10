// Force Vite to re-analyze imports after installing date-fns
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion, type Variants } from "framer-motion"
import { format } from "date-fns"
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  MapPin, 
  Briefcase, 
  Phone, 
  User, 
  IdCard,
  Building,
  GraduationCap,
  BookOpen
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import TeacherMyAttendance from "@/features/hrms/TeacherMyAttendance"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { adminService } from "@/services/admin"
import type { 
  ComprehensiveUserProfileResponseDTO, 
  AddressDTO, 
  StudentGuardianDTO,
  StudentKpiMetricsDTO,
  StaffKpiMetricsDTO
} from "@/services/types/profile"
import { GuardianFormDialog, LinkGuardianDialog } from "./components/GuardianDialogs"
import { EditTeachableSubjectsDialog } from "./components/EditTeachableSubjectsDialog"
import { toast } from "sonner"

export default function UserDetailsPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  
  const [profileData, setProfileData] = useState<ComprehensiveUserProfileResponseDTO | null>(null)
  const [studentKpi, setStudentKpi] = useState<StudentKpiMetricsDTO | null>(null)
  const [staffKpi, setStaffKpi] = useState<StaffKpiMetricsDTO | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [guardians, setGuardians] = useState<StudentGuardianDTO[]>([])
  const [isCreateGuardianOpen, setIsCreateGuardianOpen] = useState(false)
  const [isLinkGuardianOpen, setIsLinkGuardianOpen] = useState(false)
  const [editingGuardian, setEditingGuardian] = useState<StudentGuardianDTO | null>(null)
  const [guardianToUnlink, setGuardianToUnlink] = useState<StudentGuardianDTO | null>(null)
  const [isUnlinking, setIsUnlinking] = useState(false)

  // Teacher specific state
  const [isEditSubjectsOpen, setIsEditSubjectsOpen] = useState(false)

  const fetchDetails = async () => {
    if (!id || !type) return
    
    setIsLoading(true)
    setError(null)
    try {
      if (type === "student") {
        const [detailsResp, guardiansResp, kpiResp] = await Promise.all([
          adminService.getStudentFullDetails(id),
          adminService.getStudentGuardians(id),
          adminService.getStudentKpiMetrics(id).catch(() => null) // Fallback silently
        ])
        setProfileData(detailsResp.data)
        setGuardians(guardiansResp.data)
        if (kpiResp?.data) {
          setStudentKpi(kpiResp.data)
        }
      } else if (type === "staff") {
        const [detailsResp, kpiResp] = await Promise.all([
          adminService.getStaffFullDetails(id),
          adminService.getStaffKpiMetrics(id).catch(() => null)
        ])
        setProfileData(detailsResp.data)
        if (kpiResp?.data) {
          setStaffKpi(kpiResp.data)
        }
      } else {
        throw new Error("Invalid user type specified in URL")
      }
    } catch (err: any) {
      console.error("Failed to fetch user details:", err)
      setError(err.response?.data?.message || "Failed to load user details.")
      toast.error("Failed to load user profile.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [id, type])

  if (isLoading) {
    return <UserDetailsSkeleton />
  }

  if (error || !profileData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <User className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground mb-6 max-w-[400px]">
          {error || "We couldn't find the profile you were looking for. It may have been removed or the link is incorrect."}
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    )
  }

  const { basicProfile, addresses, studentDetails, staffDetails } = profileData
  
  // Format dates safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "PPP")
    } catch {
      return dateString
    }
  }

  // Derived properties
  const isStaff = type === "staff"
  const isStudent = type === "student"
  const fullName = [basicProfile.firstName, basicProfile.middleName, basicProfile.lastName]
    .filter(Boolean)
    .join(" ")

  // Determine active status nicely
  let isActive = false
  
  if (isStaff && staffDetails) {
    isActive = staffDetails.active
  } else if (isStudent && studentDetails) {
    isActive = studentDetails.enrollmentStatus === "ACTIVE"
  }

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }
  
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Directory
        </Button>
      </div>

      <GuardianFormDialog 
        studentId={id!} 
        isOpen={isCreateGuardianOpen || !!editingGuardian} 
        onClose={() => { setIsCreateGuardianOpen(false); setEditingGuardian(null); }}
        onSuccess={fetchDetails}
        initialData={editingGuardian}
      />
      <LinkGuardianDialog 
        studentId={id!} 
        isOpen={isLinkGuardianOpen} 
        onClose={() => setIsLinkGuardianOpen(false)}
        onSuccess={fetchDetails}
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Profile Header Card — Side-by-side layout */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden border border-border/60 shadow-sm bg-card">
            <div className="flex flex-col md:flex-row">
              
              {/* ── Left column: Avatar + contact info ── */}
              <div className="relative md:w-[280px] lg:w-[320px] shrink-0 flex flex-col items-center md:items-start p-8 pb-6 md:border-r border-border/40">
                {/* Subtle decorative gradient behind avatar area */}
                <div className="absolute inset-0 bg-gradient-to-b from-muted/40 via-transparent to-transparent pointer-events-none" />
                
                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                  className="relative z-10"
                >
                  <div className="relative group">
                    <UserAvatar 
                      name={fullName} 
                      profileUrl={profileData.basicProfile.profileUrl} 
                      className="h-36 w-36 lg:h-44 lg:w-44 border-4 border-background shadow-xl ring-1 ring-border/30"
                      fallbackClassName="text-4xl lg:text-5xl font-bold"
                    />
                    {/* Active indicator */}
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                      className={`absolute bottom-2 right-2 h-5 w-5 rounded-full border-[3px] border-background shadow-sm ${
                        isActive ? "bg-green-500" : "bg-red-400"
                      }`}
                    />
                  </div>
                </motion.div>

                {/* Contact details listed vertically — below avatar */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.4 }}
                  className="relative z-10 mt-6 w-full space-y-3"
                >
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                    <span className="truncate">{basicProfile.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <User className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                    <span>@{basicProfile.username}</span>
                  </div>
                  {isStudent && studentDetails?.enrollmentNo && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <IdCard className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                      <span>{studentDetails.enrollmentNo}</span>
                    </div>
                  )}
                  {isStaff && staffDetails && (
                    <>
                      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <Briefcase className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                        <span>{staffDetails.jobTitle || "—"}</span>
                      </div>
                      {staffDetails.department && (
                        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                          <Building className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                          <span>{staffDetails.department}</span>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </div>

              {/* ── Right column: Name, role, bio, action ── */}
              <div className="flex-1 p-8 flex flex-col justify-between min-w-0">
                {/* Top section: Name + badge + action */}
                <div>
                  <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.4 }}
                    className="flex items-start justify-between gap-4 flex-wrap mb-3"
                  >
                    <div className="space-y-1.5">
                      <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
                        {fullName}
                      </h1>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Role tag */}
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {isStudent ? (
                            <><GraduationCap className="w-3.5 h-3.5" /> Student</>
                          ) : (
                            <><Briefcase className="w-3.5 h-3.5" /> {staffDetails?.staffType?.replace(/_/g, " ") || "Staff"}</>
                          )}
                        </span>
                        {/* Status badge */}
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] tracking-widest font-semibold px-2.5 py-1 border-0 ${
                            isActive 
                              ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                              : "bg-red-500/10 text-red-700 dark:text-red-400"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isActive ? "bg-green-500" : "bg-red-400"}`} />
                          {isActive ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </div>
                    </div>

                    {/* Action button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant={isActive ? "destructive" : "outline"} 
                          size="sm"
                          className="shrink-0"
                        >
                          {isActive ? "Block User" : "Activate User"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {isActive 
                              ? "This will suspend the user's account and block all system access immediately."
                              : "This will lift the suspension and restore the user's account access."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                const newStatus = !isActive;
                                if (isStudent) {
                                  await adminService.toggleStudentActivation(id!, newStatus)
                                } else {
                                  await adminService.toggleStaffActivation(id!, newStatus)
                                }
                                toast.success(`User ${newStatus ? 'activated' : 'blocked'} successfully`)
                                
                                setProfileData({
                                  ...profileData,
                                  staffDetails: profileData.staffDetails ? { ...profileData.staffDetails, active: newStatus } : undefined,
                                  studentDetails: profileData.studentDetails ? { ...profileData.studentDetails, enrollmentStatus: newStatus ? 'ACTIVE' : 'INACTIVE' } : undefined
                                } as any)
                              } catch (err: any) {
                                toast.error(err.response?.data?.message || "Failed to update user status")
                              }
                            }}
                            className={isActive ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
                          >
                            {isActive ? "Block User" : "Activate User"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </motion.div>

                  {/* Horizontal divider */}
                  <Separator className="my-5" />

                  {/* Quick stats row — KPI Dashboard */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                  >
                    {isStudent && studentKpi && (
                      <>
                        <div className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Current Class</p>
                          <p className="text-sm font-bold text-foreground">{studentKpi.currentGrade} {studentKpi.currentSection}</p>
                        </div>
                        <div className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Academic Standing</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {studentKpi.gpa} GPA ({studentKpi.academicStanding})
                          </p>
                        </div>
                        <div className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Attendance Rate</p>
                          <p className="text-sm font-bold text-foreground">{studentKpi.attendanceRatePercentage}%</p>
                        </div>
                        <div className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Disciplinary</p>
                          <p className="text-sm font-bold text-foreground">{studentKpi.openDisciplinaryIncidents} Open</p>
                        </div>
                      </>
                    )}
                    {isStaff && staffKpi && (
                      <>
                        <div className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Performance Rating</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{staffKpi.performanceRating} / 5.0</p>
                        </div>
                        <div className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Active Workload</p>
                          <p className="text-sm font-bold text-foreground">{staffKpi.totalClassesAssigned} Classes</p>
                        </div>
                        <div className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Weekly Hours</p>
                          <p className="text-sm font-bold text-foreground">{staffKpi.weeklyHoursAssigned} hrs</p>
                        </div>
                        <div className="rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Attendance Rate</p>
                          <p className="text-sm font-bold text-foreground">{staffKpi.attendanceRatePercentage}%</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                </div>

                {/* Bio section — at bottom */}
                {basicProfile.bio && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6 rounded-lg bg-muted/20 border border-border/30 px-5 py-4"
                  >
                    <p className="text-sm text-muted-foreground italic leading-relaxed">"{basicProfile.bio}"</p>
                  </motion.div>
                )}

                {basicProfile.preferredName && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="mt-3 text-xs text-muted-foreground"
                  >
                    ✨ Goes by <span className="font-semibold text-foreground">{basicProfile.preferredName}</span>
                  </motion.p>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <Tabs defaultValue="overview" className="w-full">
          <div className="flex justify-start mb-6 border-b border-border/40 pb-2">
            <TabsList className="bg-transparent space-x-2">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-full px-5"
              >
                Profile Overview
              </TabsTrigger>
              {isStaff && (
                <TabsTrigger 
                  value="attendance" 
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-full px-5"
                >
                  Attendance History
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column (Main Specs) */}
              <div className="md:col-span-2 space-y-6">
            
            {/* Role Specific Details Card */}
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {isStaff ? <Briefcase className="w-5 h-5 text-primary" /> : <GraduationCap className="w-5 h-5 text-primary" />}
                    {isStaff ? "Employment Details" : "Academic Details"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  {isStaff && staffDetails && (
                    <>
                      <InfoItem label="Staff ID" value={basicProfile.username} icon={<IdCard />} />
                      <InfoItem label="Staff Type" value={staffDetails.staffType?.replace(/_/g, " ")} />
                      <InfoItem label="Job Title" value={staffDetails.jobTitle} />
                      <InfoItem label="Department" value={staffDetails.department} icon={<Building />} />
                      <InfoItem label="Hire Date" value={formatDate(staffDetails.hireDate)} icon={<Calendar />} />
                      {staffDetails.terminationDate && (
                        <InfoItem label="Termination Date" value={formatDate(staffDetails.terminationDate)} />
                      )}
                      <InfoItem label="Office Location" value={staffDetails.officeLocation} icon={<MapPin />} />
                      <InfoItem label="Manager" value={staffDetails.managerName || "None"} />
                    </>
                  )}
                  {isStudent && studentDetails && (
                    <>
                      <InfoItem label="Enrollment Number" value={studentDetails.enrollmentNo || "Pending"} icon={<IdCard />} />
                      <InfoItem label="Enrollment Status" value={studentDetails.enrollmentStatus} />
                      <InfoItem label="Admission Date" value={formatDate(studentDetails.admissionDate)} icon={<Calendar />} />
                      <InfoItem label="Graduation Year" value={studentDetails.expectedGraduationYear} icon={<GraduationCap />} />
                      <InfoItem label="Assigned Counselor" value={studentDetails.counselorName || "Unassigned"} icon={<User />} />
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Medical / Additional Info (Left Column lower) */}
            {isStudent && studentDetails?.medicalRecord && (
              <motion.div variants={itemVariants}>
                <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Medical Record</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoItem label="Primary Physician" value={studentDetails.medicalRecord.physicianName} />
                      <InfoItem label="Physician Phone" value={studentDetails.medicalRecord.physicianPhone} icon={<Phone />} />
                      <InfoItem label="Emergency Contact" value={studentDetails.medicalRecord.emergencyContactName} />
                      <InfoItem label="Emergency Phone" value={studentDetails.medicalRecord.emergencyContactPhone} icon={<Phone />} />
                    </div>
                    {studentDetails.medicalRecord.allergies && studentDetails.medicalRecord.allergies.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Allergies</p>
                        <div className="flex flex-wrap gap-2">
                          {studentDetails.medicalRecord.allergies.map((a, i) => (
                            <Badge key={i} variant={a.severity === 'HIGH' ? "destructive" : "secondary"}>
                              {a.allergy} {a.severity && `(${a.severity})`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Guardian Info (Left Column lower) */}
            {isStudent && (
              <motion.div variants={itemVariants}>
                <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Guardian Details
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          Manage Guardians
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingGuardian(null); setIsCreateGuardianOpen(true); }}>
                          <User className="w-4 h-4 mr-2" /> Create New Guardian
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsLinkGuardianOpen(true)}>
                          <Briefcase className="w-4 h-4 mr-2" /> Link Existing Guardian
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {guardians && guardians.length > 0 ? (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {guardians.map((guardian) => (
                          <div key={guardian.guardianUuid} className="relative bg-background border border-border shadow-sm p-4 rounded-xl flex flex-col">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8">
                                  <span className="sr-only">Open menu</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical h-4 w-4"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingGuardian(guardian)}>
                                  Edit Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive" 
                                  onClick={() => setGuardianToUnlink(guardian)}
                                >
                                  Unlink Guardian
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="flex items-center gap-3 mb-3">
                              <UserAvatar 
                                name={guardian.name}
                                profileUrl={guardian.profileUrl}
                                className="h-10 w-10 border bg-muted"
                                fallbackClassName="text-xs font-semibold"
                              />
                              <div>
                                <p className="font-semibold text-sm leading-tight">
                                  {guardian.name || `Guardian (ID: ${guardian.guardianUuid})`}
                                </p>
                                <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                                  {guardian.relation ? guardian.relation.replace('_', ' ') : 'Guardian'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground mb-4">
                              {guardian.phoneNumber && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {guardian.phoneNumber}</p>}
                              {guardian.occupation && <p className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5" /> {guardian.occupation}</p>}
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 mt-auto">
                              {guardian.primaryContact && <Badge variant="default" className="text-[10px] uppercase h-5 text-white bg-blue-600 hover:bg-blue-700">Primary Contact</Badge>}
                              {guardian.canPickup && <Badge variant="secondary" className="text-[10px] uppercase h-5">Can Pickup</Badge>}
                              {guardian.financialContact && <Badge variant="secondary" className="text-[10px] uppercase h-5 text-emerald-700 bg-emerald-100 hover:bg-emerald-200">Financial Contact</Badge>}
                              {guardian.canViewGrades && <Badge variant="secondary" className="text-[10px] uppercase h-5">View Grades</Badge>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border flex flex-col items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm font-medium text-foreground">No Guardians Linked</p>
                        <p className="text-xs text-muted-foreground mt-1 mb-4">This student does not have any guardians attached to their profile.</p>
                        <Button variant="outline" size="sm" onClick={() => setIsCreateGuardianOpen(true)}>
                          Add Guardian
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Teacher Details Info */}
            {isStaff && staffDetails?.teacherDetails && (
               <motion.div variants={itemVariants}>
                <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm mt-6">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg">Teacher Info</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8"
                      onClick={() => setIsEditSubjectsOpen(true)}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Manage Subjects
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                      <InfoItem label="Years of Experience" value={staffDetails.teacherDetails.yearsOfExperience} />
                      <InfoItem label="Education Level" value={staffDetails.teacherDetails.educationLevel} icon={<GraduationCap />} />
                      <InfoItem label="State License" value={staffDetails.teacherDetails.stateLicenseNumber} icon={<IdCard />} />
                    </div>
                    
                    {parseJsonArray(staffDetails.teacherDetails.specializations).length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Specializations</p>
                        <div className="flex flex-wrap gap-2">
                          {parseJsonArray(staffDetails.teacherDetails.specializations).map((spec, i) => (
                            <Badge key={i} variant="secondary">{spec}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {parseJsonArray(staffDetails.teacherDetails.certifications).length > 0 && (
                      <div className="pt-2">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Certifications</p>
                        <div className="flex flex-wrap gap-2">
                          {parseJsonArray(staffDetails.teacherDetails.certifications).map((cert, i) => (
                            <Badge key={i} variant="outline" className="border-primary/20 text-primary">{cert}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teachable Subjects */}
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center justify-between">
                        Teachable Subjects
                        <span className="text-xs font-normal opacity-60">
                          {staffDetails.teacherDetails.teachableSubjects?.length || 0} mapped
                        </span>
                      </p>
                      {staffDetails.teacherDetails.teachableSubjects && staffDetails.teacherDetails.teachableSubjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {staffDetails.teacherDetails.teachableSubjects.map((subject) => (
                            <Badge key={subject.uuid} variant="secondary" className="pl-1.5 pr-2.5 py-1 gap-1.5 border border-border/50">
                              <span 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: subject.color || "#6366f1" }} 
                              />
                              {subject.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground/80 bg-muted/30 p-3 rounded-md text-center border border-dashed">
                          No subjects assigned. Use "Manage Subjects" to assign.
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </div>

          {/* Right Column (Personal Specs) */}
          <div className="space-y-6">
            
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                    <InfoItem label="Date of Birth" value={formatDate(basicProfile.dateOfBirth)} icon={<Calendar />} />
                    <InfoItem label="Gender" value={basicProfile.gender} icon={<User />} />
                    <InfoItem label="Primary Language" value={basicProfile.primaryLanguage || "English"} />
                    <InfoItem label="Blood Group" value={basicProfile.bloodGroup || "Unknown"} />
                  </div>
                  <Separator />
                  <InfoItem label="Account Created" value={formatDate(basicProfile.createdAt)} isSmall />
                  <InfoItem label="Last Updated" value={formatDate(basicProfile.updatedAt)} isSmall />
                </CardContent>
              </Card>
            </motion.div>

            {/* Addresses Card */}
            <motion.div variants={itemVariants}>
              <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Addresses</CardTitle>
                  <CardDescription>Saved locations for this user</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {addresses && addresses.length > 0 ? (
                    addresses.map((address: AddressDTO, idx) => (
                      <div key={idx} className="bg-muted/30 rounded-md p-3 border border-border/50 text-sm relative">
                        <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] uppercase">
                          {address.addressType}
                        </Badge>
                        <p className="font-medium">{address.addressLine1}</p>
                        {address.addressLine2 && <p>{address.addressLine2}</p>}
                        <p className="text-muted-foreground mt-1">
                          {[address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
                        </p>
                        {address.country && <p className="text-muted-foreground">{address.country}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-muted/20 rounded-md">No addresses on file.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

          </div>
        </div>
        </TabsContent>

        {isStaff && (
          <TabsContent value="attendance" className="mt-0 outline-none animate-in fade-in-50">
            <TeacherMyAttendance staffUuid={id} />
          </TabsContent>
        )}
      </Tabs>
      </motion.div>

      {/* Unlink Guardian Confirmation Dialog */}
      <AlertDialog open={!!guardianToUnlink} onOpenChange={(open) => !open && !isUnlinking && setGuardianToUnlink(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will unlink the guardian "{guardianToUnlink?.name || `ID: ${guardianToUnlink?.guardianUuid}`}" from this student. Features like emergency contact and parent portals will be disabled for them concerning this student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnlinking}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              disabled={isUnlinking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!guardianToUnlink || !id) return;
                try {
                  setIsUnlinking(true);
                  await adminService.unlinkGuardian(id, guardianToUnlink.guardianUuid);
                  toast.success("Guardian unlinked successfully");
                  setGuardianToUnlink(null);
                  fetchDetails();
                } catch (err: any) {
                  toast.error(err.response?.data?.message || err.message || "Failed to unlink guardian");
                } finally {
                  setIsUnlinking(false);
                }
              }}
            >
              {isUnlinking ? "Unlinking..." : "Unlink Guardian"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Teachable Subjects Dialog */}
      {isStaff && profileData && (
        <EditTeachableSubjectsDialog 
          open={isEditSubjectsOpen}
          onOpenChange={setIsEditSubjectsOpen}
          staffId={id!}
          profileData={profileData}
          onSuccess={fetchDetails}
        />
      )}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────

function parseJsonArray(str?: string | null): string[] {
  if (!str) return [];
  try {
    let parsed = JSON.parse(str);
    while (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        break;
      }
    }
    if (Array.isArray(parsed)) {
      return parsed.flatMap(item => {
        if (typeof item === 'string') {
          try {
            const inner = JSON.parse(item);
            if (Array.isArray(inner)) return inner;
          } catch {}
        }
        return item;
      }).filter(Boolean).map(String);
    }
    return [String(parsed)];
  } catch {
    return [str.replace(/[\[\]"\\]/g, '')];
  }
}

function InfoItem({  
  label, 
  value, 
  icon,
  isSmall = false
}: { 
  label: string, 
  value?: string | number | null, 
  icon?: React.ReactNode,
  isSmall?: boolean 
}) {
  return (
    <div className={`flex flex-col gap-1 ${isSmall ? 'text-sm' : ''}`}>
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
        {icon && <span className="text-primary/70 [&>svg]:w-3 [&>svg]:h-3">{icon}</span>}
        {label}
      </span>
      <span className="font-medium text-foreground">{value || "—"}</span>
    </div>
  )
}

function UserDetailsSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 w-full">
      <Skeleton className="h-8 w-32 mb-4" />
      
      <Card className="overflow-hidden border border-border/60 shadow-sm">
        <div className="flex flex-col md:flex-row">
          <div className="md:w-[280px] lg:w-[320px] shrink-0 flex flex-col items-center md:items-start p-8 pb-6 md:border-r border-border/40">
            <Skeleton className="h-36 w-36 lg:h-44 lg:w-44 rounded-full" />
            <div className="mt-6 w-full space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="flex-1 p-8 space-y-5">
            <Skeleton className="h-10 w-72" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <Skeleton className="h-px w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-none"><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        </div>
        <div className="space-y-6">
          <Card className="shadow-sm border-none"><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          <Card className="shadow-sm border-none"><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
        </div>
      </div>
    </div>
  )
}
