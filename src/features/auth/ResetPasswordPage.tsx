import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { useSearchParams, Link } from 'react-router-dom'
import { KeyRound, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { authService } from '@/services/auth'
import './LoginPage.css'

const resetSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetFormValues = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onChange',
  })

  const watchPassword = form.watch('password') || ''

  const requirements = [
    { id: 'length', text: 'At least 8 characters', met: watchPassword.length >= 8 },
    { id: 'uppercase', text: 'One uppercase letter', met: /[A-Z]/.test(watchPassword) },
    { id: 'lowercase', text: 'One lowercase letter', met: /[a-z]/.test(watchPassword) },
    { id: 'number', text: 'One number', met: /[0-9]/.test(watchPassword) },
    { id: 'special', text: 'One special character', met: /[^A-Za-z0-9]/.test(watchPassword) },
  ]

  const allRequirementsMet = requirements.every(req => req.met)

  const onSubmit = async (values: ResetFormValues) => {
    if (!token) {
      toast.error('Invalid or missing reset token')
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword({ token, newPassword: values.password })
      setSuccess(true)
      toast.success('Password reset successfully')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password. The token might be expired.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="login-page flex items-center justify-center min-h-screen">
        <div className="bg-card p-8 rounded-3xl shadow-xl max-w-md w-full border text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold">Invalid Token</h2>
          <p className="text-muted-foreground">The password reset link is invalid or has expired.</p>
          <Link to="/login">
            <Button className="mt-4 w-full">Back to Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page flex items-center justify-center min-h-screen">
      <div className="bg-card p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] max-w-md w-full border relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-500"></div>

        {success ? (
          <div className="text-center space-y-6 py-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-foreground mb-2">Password Reset!</h2>
              <p className="text-sm text-muted-foreground">Your password has been successfully updated. You can now sign in with your new credentials.</p>
            </div>
            <Link to="/login" className="block">
              <Button className="w-full h-12 text-base shadow-md">
                Proceed to Login
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <KeyRound size={32} />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Create New Password</h2>
              <p className="text-sm text-muted-foreground mt-1">Please enter your new password below.</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">New Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>

                  {/* Floating Password Requirements Popover */}
                  <AnimatePresence>
                    {watchPassword.length > 0 && !allRequirementsMet && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-[115%] left-0 w-full z-50 origin-top"
                      >
                        <div className="bg-popover p-4 rounded-xl border shadow-xl space-y-3 relative before:absolute before:-top-2 before:left-6 before:w-4 before:h-4 before:bg-popover before:border-t before:border-l before:rotate-45">
                          <p className="text-xs font-semibold text-foreground relative z-10">Password Requirements:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-1 relative z-10">
                            {requirements.map((req) => (
                              <div key={req.id} className="flex items-center gap-2">
                                <div className="relative flex items-center justify-center w-4 h-4">
                                  <AnimatePresence>
                                    {req.met ? (
                                      <motion.div
                                        key="check"
                                        initial={{ scale: 0, opacity: 0, rotate: -180 }}
                                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                        exit={{ scale: 0, opacity: 0, rotate: 180 }}
                                        transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                                        className="absolute text-emerald-500"
                                      >
                                        <CheckCircle2 size={15} className="stroke-[2.5]" />
                                      </motion.div>
                                    ) : (
                                      <motion.div
                                        key="cross"
                                        initial={{ scale: 0, opacity: 0, rotate: 180 }}
                                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                        exit={{ scale: 0, opacity: 0, rotate: -180 }}
                                        transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                                        className="absolute text-destructive/60"
                                      >
                                        <XCircle size={15} className="stroke-[2.5]" />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                                <span
                                  className={`text-[11px] transition-colors duration-300 ${
                                    req.met ? 'text-emerald-600 font-medium' : 'text-muted-foreground'
                                  }`}
                                >
                                  {req.text}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock size={18} />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    disabled={loading}
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    {...form.register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-base font-semibold shadow-md gap-2"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
                {!loading && <ArrowRight size={18} />}
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
