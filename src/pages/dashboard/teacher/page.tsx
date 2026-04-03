import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { logoutUser } from '@/store/slices/authSlice'
import { useNavigate } from 'react-router-dom'
import { LogOut, CreditCard, Download, User as UserIcon, Shield, Laptop, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { profileService } from '@/services/profile'
import { idCardService, triggerBlobDownload } from '@/services/idCard'
import { IdCardPreview } from '@/features/uis/id-card/IdCardPreview'
import { Button } from '@/components/ui/button'

export default function TeacherDashboard() {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => profileService.getMyProfile().then(res => res.data),
  })

  const handleLogout = async () => {
    await dispatch(logoutUser())
    navigate('/login', { replace: true })
    toast.success('Logged out successfully')
  }

  const handleDownloadId = async () => {
    if (!profile?.staffDetails?.staffId) return
    try {
      const res = await idCardService.downloadMyIdCard()
      triggerBlobDownload(res.data, `my-id-card.pdf`)
      toast.success('ID Card downloaded')
    } catch (e) {
      toast.error('Failed to download ID Card')
    }
  }

  // Map profile to IdCardData
  const idCardData = profile ? {
    name: `${profile.basicProfile.firstName} ${profile.basicProfile.lastName}`,
    photoUrl: profile.basicProfile.profileUrl || undefined,
    enrollmentNumber: profile.staffDetails?.staffSystemId || profile.basicProfile.username,
    schoolName: 'Siksha Intelligence', // basicProfile doesn't have schoolName, could be hardcoded or from another source
    staffId: profile.staffDetails?.staffSystemId,
    jobTitle: profile.staffDetails?.jobTitle,
    department: profile.staffDetails?.department,
  } : null

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans selection:bg-primary/10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">Teacher Portal</h1>
              <p className="text-slate-500 text-sm font-medium">Welcome back, {profile?.basicProfile.firstName || user?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Areas */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Stats / Tools */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Laptop className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Teaching Tools</h2>
                <ul className="space-y-2">
                  {['Class Management', 'Assignments', 'Grading', 'Attendance'].map(tool => (
                    <li key={tool} className="text-slate-600 flex items-center gap-2 text-sm">
                      <div className="h-1 w-1 rounded-full bg-slate-300" />
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UserIcon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">Profile Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm truncate">{profile?.basicProfile.email || user?.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">ID: {profile?.staffDetails?.staffSystemId || user?.userId}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Welcome Banner */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-8 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border border-primary/10 rounded-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Shield className="w-32 h-32 text-primary" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-slate-900">Academic Overview</h3>
                <p className="text-slate-600 text-sm mt-2 max-w-md">
                  Everything you need to manage your classes and follow student progress is available right at your fingertips.
                </p>
                <Button className="mt-4 rounded-xl px-6 bg-slate-900 hover:bg-slate-800 text-white border-none">
                  Get Started
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Sidebar - ID Card Section */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm sticky top-8 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900">Digital ID Card</h2>
                <CreditCard className="w-5 h-5 text-primary" />
              </div>

              <div className="flex flex-col items-center gap-6">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div 
                      key="loader"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full aspect-[1/1.58] bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200"
                    >
                      <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                    </motion.div>
                  ) : idCardData && (
                    <motion.div 
                      key="id-card"
                      initial={{ opacity: 0, scale: 0.9, rotateY: 90 }}
                      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className="w-full perspect-1000"
                    >
                      <IdCardPreview data={idCardData} type="staff" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="w-full space-y-3">
                  <Button 
                    onClick={handleDownloadId}
                    disabled={!profile}
                    className="w-full gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 h-11"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                  <p className="text-[10px] text-center text-slate-400 font-medium">
                    Official Institutional Identity Document
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)
