import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  ArrowRight,
  Users,
  BarChart3,
  ShieldCheck,
  Headphones,
  X,
  KeyRound,
  CheckCircle2,
} from 'lucide-react'
import { useState, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { login } from '@/store/slices/authSlice'
import { authService } from '@/services/auth'
import './LoginPage.css'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

// Role-based dashboard mapping
const roleToPathMap: Record<string, string> = {
  SUPER_ADMIN: '/dashboard/super-admin',
  ADMIN: '/dashboard/admin',
  TEACHER: '/dashboard/teacher',
  SECURITY_GUARD: '/dashboard/security-guard',
  STUDENT: '/dashboard/student',
  GUARDIAN: '/dashboard/parent',
  PARENT: '/dashboard/parent',
}

const getDashboardPath = (roles: string[] | null | undefined): string => {
  if (!Array.isArray(roles) || roles.length === 0) {
    return '/dashboard/student'
  }
  const normalizeRole = (role: string): string => {
    const upper = role.toUpperCase().trim()
    return upper.startsWith('ROLE_') ? upper.substring(5) : upper
  }
  for (const role of roles) {
    const normalized = normalizeRole(role)
    const path = roleToPathMap[normalized]
    if (path) return path
  }
  return '/dashboard/student'
}

// Features list for the left panel
const features = [
  {
    icon: Users,
    color: 'blue' as const,
    title: 'Unified Platform',
    desc: 'All your academic tools in one place',
  },
  {
    icon: BarChart3,
    color: 'red' as const,
    title: 'Real-time Insights',
    desc: 'Get data-driven insights instantly',
  },
  {
    icon: ShieldCheck,
    color: 'purple' as const,
    title: 'Secure & Reliable',
    desc: 'Enterprise-grade security for your data',
  },
  {
    icon: Headphones,
    color: 'orange' as const,
    title: '24/7 Support',
    desc: 'We are here to help you anytime',
  },
]

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const loading = useAppSelector((s) => s.auth.loading)

  const [showPassword, setShowPassword] = useState(false)

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: true },
    mode: 'onSubmit',
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await dispatch(login(values)).unwrap()
      const dashboardPath = getDashboardPath(result.user.roles)
      navigate(dashboardPath, { replace: true })
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Login failed')
    }
  }

  // Forgot password submit
  const handleForgotSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!forgotEmail.trim()) {
        toast.error('Please enter your email address')
        return
      }
      setForgotLoading(true)
      try {
        await authService.forgotPassword({ email: forgotEmail.trim() })
        setForgotSent(true)
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to send reset link'
        toast.error(msg)
      } finally {
        setForgotLoading(false)
      }
    },
    [forgotEmail]
  )

  const closeForgot = () => {
    setForgotOpen(false)
    setForgotEmail('')
    setForgotSent(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* ───── LEFT PANEL ───── */}
        <div className="left-panel">
          {/* Brand */}
          <div className="left-brand">
            <div className="left-brand-icon-wrap">
              <GraduationCap />
            </div>
            <span className="left-brand-name">Shiksha Intelligence</span>
          </div>

          {/* Headline */}
          <div className="left-headline">
            <h1>
              Smart Education.
              <br />
              <span className="accent">Stronger Future.</span>
            </h1>
            <p className="left-subtitle">
              Shiksha Intelligence is your all-in-one platform to manage
              academics, students, staff and more efficiently.
            </p>
          </div>

          {/* Features */}
          <div className="left-features">
            {features.map((f) => (
              <div className="feature-item" key={f.title}>
                <div className={`feature-icon-wrap ${f.color}`}>
                  <f.icon />
                </div>
                <div className="feature-text">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="left-quote">
            <div className="quote-mark">"</div>
            <blockquote>
              Education is the most powerful weapon which you can use to change
              the world.
            </blockquote>
            <p className="quote-author">– Nelson Mandela</p>
          </div>
        </div>

        {/* ───── RIGHT PANEL ───── */}
        <div className="right-panel">
          <div className="right-inner">
            {/* Brand icon */}
            <div className="form-brand-icon">
              <GraduationCap />
            </div>

            {/* Header */}
            <div className="form-header">
              <h1 className="form-title">Welcome Back!</h1>
              <p className="form-subtitle">
                Sign in to continue to Shiksha Intelligence
              </p>
            </div>

            {/* Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="login-form">
              {/* Username */}
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Email or Username
                </label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <Mail />
                  </span>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your email or username"
                    disabled={loading}
                    aria-invalid={Boolean(form.formState.errors.username)}
                    className="form-input"
                    {...form.register('username')}
                  />
                </div>
                {form.formState.errors.username?.message && (
                  <p className="error-message">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <Lock />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={loading}
                    aria-invalid={Boolean(form.formState.errors.password)}
                    className="form-input has-toggle"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="icon" />
                    ) : (
                      <Eye className="icon" />
                    )}
                  </button>
                </div>
                {form.formState.errors.password?.message && (
                  <p className="error-message">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="form-options">
                <label className="remember-me" htmlFor="rememberMe">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    disabled={loading}
                    {...form.register('rememberMe')}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => setForgotOpen(true)}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Sign In */}
              <Button
                type="submit"
                disabled={loading}
                className="sign-in-button"
              >
                {loading ? 'Signing in…' : 'Sign In'}
                {!loading && <ArrowRight className="btn-arrow" size={18} />}
              </Button>
            </form>

            {/* Divider */}
            <div className="login-divider">
              <span>or continue with</span>
            </div>

            {/* Footer */}
            <p className="login-footer-note">
              Don't have an account?{' '}
              <a href="mailto:admin@shikshaintelligence.com">
                Contact Administrator
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* ═══════ FORGOT PASSWORD MODAL ═══════ */}
      {forgotOpen && (
        <div className="forgot-overlay" onClick={closeForgot}>
          <div
            className="forgot-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="forgot-modal-close"
              onClick={closeForgot}
              aria-label="Close"
            >
              <X size={20} />
            </button>

            {!forgotSent ? (
              <>
                <div className="forgot-modal-icon">
                  <KeyRound />
                </div>
                <h2>Forgot Password?</h2>
                <p className="forgot-desc">
                  Enter your registered email address and we'll send you a link
                  to reset your password.
                </p>
                <form onSubmit={handleForgotSubmit}>
                  <div className="forgot-input-group">
                    <label htmlFor="forgotEmail">Email Address</label>
                    <div className="input-wrap">
                      <span className="input-icon">
                        <Mail />
                      </span>
                      <input
                        id="forgotEmail"
                        type="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        disabled={forgotLoading}
                        className="forgot-input"
                        autoFocus
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="forgot-submit"
                  >
                    {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            ) : (
              <div className="forgot-success">
                <div className="forgot-success-icon">
                  <CheckCircle2 />
                </div>
                <h3>Check your email</h3>
                <p>
                  We've sent a password reset link to{' '}
                  <strong>{forgotEmail}</strong>. Please check your inbox and
                  follow the instructions.
                </p>
                <button className="forgot-back-btn" onClick={closeForgot}>
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
