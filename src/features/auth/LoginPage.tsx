import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, GraduationCap } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { login } from '@/store/slices/authSlice'
import './LoginPage.css'

const loginSchema = z.object({
  username: z.string().min(1, 'Email is required'),
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
    return '/dashboard/student' // Default fallback
  }

  // Helper to normalize role (strip ROLE_ prefix if present)
  const normalizeRole = (role: string): string => {
    const upper = role.toUpperCase().trim()
    return upper.startsWith('ROLE_') ? upper.substring(5) : upper
  }

  // Check roles in priority order (highest privilege first)
  for (const role of roles) {
    const normalized = normalizeRole(role)
    const path = roleToPathMap[normalized]
    if (path) return path
  }

  // Fallback to student dashboard
  return '/dashboard/student'
}

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const loading = useAppSelector((s) => s.auth.loading)

  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: true,
    },
    mode: 'onSubmit',
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const result = await dispatch(login(values)).unwrap()
      // Get dashboard path based on user roles
      const dashboardPath = getDashboardPath(result.user.roles)
      navigate(dashboardPath, { replace: true })
    } catch (err) {
      toast.error(typeof err === 'string' ? err : 'Login failed')
    }
  }

  return (
    <div className="login-page">
      {/* Full-screen white-themed background with AI education illustration */}
      <div className="login-background">
        <div className="bg-pattern"></div>
      </div>

      {/* Centered glassmorphic container */}
      <div className="login-container">
        <div className="login-card">
          {/* Left Section: Glassmorphic Illustration Panel */}
          <div className="illustration-panel">
            {/* Branding at top-left */}
            <div className="branding">
              <div className="logo-wrapper">
                <GraduationCap className="logo-icon" />
              </div>
              <span className="brand-text">Shiksha Intelligence</span>
            </div>

            {/* Illustration Area */}
            <div className="illustration-area">
              <div className="illustration-placeholder">
                <img 
                  src="/login-illustration.png" 
                  alt="Students using AI and smart technology for education" 
                  className="main-illustration"
                />
              </div>
            </div>

            {/* Caption at bottom */}
            <div className="caption">
              <p>Empowering education through intelligent technology</p>
            </div>
          </div>

          {/* Right Section: Login Form */}
          <div className="form-panel">
            <div className="form-wrapper">
              {/* Title - center-aligned */}
              <div className="form-header">
                <h1 className="form-title">Login</h1>
                <div className="title-underline"></div>
              </div>

              {/* Login Form */}
              <form onSubmit={form.handleSubmit(onSubmit)} className="login-form">
                {/* Email Field */}
                <div className="form-group">
                  <label htmlFor="username" className="form-label">Username</label>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    disabled={loading}
                    aria-invalid={Boolean(form.formState.errors.username)}
                    className="form-input"
                    {...form.register('username')}
                  />
                  {form.formState.errors.username?.message && (
                    <p className="error-message">{form.formState.errors.username.message}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="form-group">
                  <label htmlFor="password" className="form-label">Password</label>
                  <div className="password-wrapper">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      disabled={loading}
                      aria-invalid={Boolean(form.formState.errors.password)}
                      className="form-input password-input"
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="password-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="icon" /> : <Eye className="icon" />}
                    </button>
                  </div>
                  {form.formState.errors.password?.message && (
                    <p className="error-message">{form.formState.errors.password.message}</p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}
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
                  <a href="#" className="forgot-password">Forgot password?</a>
                </div>

                {/* Sign In Button */}
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="sign-in-button"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>

                {/* Sign Up Link */}
                <div className="sign-up-prompt">
                  <span>Don't have an account? </span>
                  <a href="#" className="sign-up-link">Sign up</a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
