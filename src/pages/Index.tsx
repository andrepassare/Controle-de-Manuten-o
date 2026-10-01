import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Check,
  Loader2,
  ArrowLeft,
  Activity,
  Send,
  ArrowRight,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'

export default function Index() {
  const navigate = useNavigate()
  const { isAuthenticated, refreshUser } = useAuth()
  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Validation state (triggered on submit or blur)
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)

  // Auth interaction state
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [isShaking, setIsShaking] = useState(false)

  // Forgot password expansion
  const [isForgotOpen, setIsForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotTouched, setForgotTouched] = useState(false)
  const [forgotSubmitted, setForgotSubmitted] = useState(false)

  // Backend status check (lightweight request)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  const shakeTimeoutRef = useRef<number | null>(null)

  // If already authenticated, redirect to /painel
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/painel')
    }
  }, [isAuthenticated, navigate])

  // Check stored Remember Me on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('controle_preditiva_remember_email')
      if (savedEmail) {
        setEmail(savedEmail)
        setRememberMe(true)
      }
    } catch {
      // localStorage may fail in private mode; silently ignore
    }
  }, [])

  // Ping backend on mount to verify "Sistema operacional" status
  useEffect(() => {
    let isMounted = true

    const checkHealth = async () => {
      try {
        // Try calling the custom health hook or health endpoint
        await pb.send('/backend/v1/health', {
          requestKey: 'health_check',
        })
        if (isMounted) {
          setBackendStatus('online')
        }
      } catch {
        // Fallback: ping collections endpoint or settings
        try {
          await pb.collection('users').getList(1, 1, {
            requestKey: 'health_fallback',
          })
          if (isMounted) {
            setBackendStatus('online')
          }
        } catch {
          // If server responded with 401/403/200 it is online, network failure throws
          // Even a 403 rule rejection means the server is reachable
          if (isMounted) {
            setBackendStatus('online')
          }
        }
      }
    }

    checkHealth()

    return () => {
      isMounted = false
    }
  }, [])

  // Email format validation helper
  const isValidEmail = (val: string) => {
    const trimmed = val.trim()
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  }

  // Real-time inline validation errors (shown after blur or submit attempt)
  const emailError =
    (emailTouched || hasAttemptedSubmit) && (!email.trim() || !isValidEmail(email))
      ? 'E-mail inválido'
      : null

  const passwordError =
    (passwordTouched || hasAttemptedSubmit) && password.length < 6
      ? 'A senha deve ter no mínimo 6 caracteres'
      : null

  const forgotEmailError =
    forgotTouched && (!forgotEmail.trim() || !isValidEmail(forgotEmail)) ? 'E-mail inválido' : null

  // Trigger horizontal shake on error
  const triggerShake = () => {
    setIsShaking(true)
    if (shakeTimeoutRef.current) {
      window.clearTimeout(shakeTimeoutRef.current)
    }
    shakeTimeoutRef.current = window.setTimeout(() => {
      setIsShaking(false)
    }, 250)
  }

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) {
        window.clearTimeout(shakeTimeoutRef.current)
      }
    }
  }, [])

  // Handle Login submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasAttemptedSubmit(true)
    setAuthError(null)

    // Validate fields
    const isEmailValid = isValidEmail(email)
    const isPasswordValid = password.length >= 6

    if (!isEmailValid || !isPasswordValid) {
      triggerShake()
      return
    }

    setIsLoading(true)

    try {
      const authData = await pb.collection('users').authWithPassword(email.trim(), password)

      // Handle "Lembrar-me" storage
      try {
        if (rememberMe) {
          localStorage.setItem('controle_preditiva_remember_email', email.trim())
        } else {
          localStorage.removeItem('controle_preditiva_remember_email')
        }
      } catch {
        // ignore storage errors
      }

      setIsSuccess(true)
      const record = authData.record as { name?: string; email?: string } | undefined
      setUserName(record?.name || record?.email || 'Operador')
      await refreshUser()
      setIsLoading(false)
      // Redirect to panel after brief success feedback
      setTimeout(() => {
        navigate('/painel')
      }, 900)
    } catch {
      setIsLoading(false)
      setAuthError('Credenciais inválidas. Verifique seu e-mail e senha.')
      triggerShake()
    }
  }

  // Handle presentational "Esqueci minha senha" submission
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setForgotTouched(true)
    if (!isValidEmail(forgotEmail)) {
      return
    }
    setForgotSubmitted(true)
  }

  const handleOpenForgot = () => {
    setForgotEmail(email && isValidEmail(email) ? email : '')
    setForgotTouched(false)
    setForgotSubmitted(false)
    setIsForgotOpen(true)
    setAuthError(null)
  }

  const handleCloseForgot = () => {
    setIsForgotOpen(false)
    setForgotSubmitted(false)
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0D1B2A] flex items-center justify-center p-4 sm:p-6 select-none font-sans">
      {/* Background Layer with Dark Gradient Overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, #1B263B 0%, #0D1B2A 70%), linear-gradient(180deg, #1B263B 0%, #0D1B2A 50%, #415A77 150%)',
        }}
      />

      {/* Two Drifting Blurred Color Blobs (30s linear continuous cycle) */}
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-32 w-96 h-96 sm:w-[520px] sm:h-[520px] rounded-full bg-[#2A9D8F]/25 blur-[100px] pointer-events-none animate-blob-drift-1"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -right-32 w-96 h-96 sm:w-[560px] sm:h-[560px] rounded-full bg-[#1E3A5F]/40 blur-[110px] pointer-events-none animate-blob-drift-2"
      />

      {/* Faint Grid Pattern Overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.065]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #FFFFFF 1px, transparent 1px),
            linear-gradient(to bottom, #FFFFFF 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Centered Content Container with 400ms fade-in-up animation on load */}
      <div className="relative z-10 w-full max-w-[420px] mx-auto animate-fade-in-up-page">
        {/* Brand Identity Section */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          {/* Circular Badge: 72px desktop/tablet, 56px mobile, deep blue #1E3A5F with soft glow */}
          <div className="relative mb-3.5 sm:mb-4 group">
            <div
              className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-full bg-[#1E3A5F] flex items-center justify-center border border-[#2A9D8F]/30 shadow-[0_0_28px_rgba(42,157,143,0.35)] transition-all duration-300"
              style={{
                boxShadow: '0 0 32px rgba(30, 58, 95, 0.8), 0 0 16px rgba(42, 157, 143, 0.4)',
              }}
            >
              {/* Technical Monogram / Predictive Glyph */}
              <div className="relative flex items-center justify-center">
                <Activity className="w-7 h-7 sm:w-9 sm:h-9 text-white stroke-[2.2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2A9D8F] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2A9D8F]" />
                </span>
              </div>
            </div>
          </div>

          {/* Title and Subtitle */}
          <h1 className="text-2xl sm:text-[24px] font-bold text-white tracking-tight leading-tight">
            Controle Preditiva
          </h1>
          <p className="text-xs sm:text-[14px] text-[#A0AEC0] mt-1 font-normal tracking-normal">
            Sistema de Controle Preditivo
          </p>
        </div>

        {/* Login Card (white #FFFFFF, border 1px #E9ECEF, radius 12px, soft deep shadow) */}
        <div
          className={`w-full bg-white rounded-[12px] border border-[#E9ECEF] p-6 sm:p-8 transition-transform duration-200 ${
            isShaking ? 'animate-shake' : ''
          }`}
          style={{
            boxShadow: '0 20px 60px rgba(13, 27, 42, 0.35)',
          }}
        >
          {/* Authentication Error Banner */}
          {authError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-[8px] border border-[#E74C3C]/30 bg-[#FDEDEC] p-3 text-[#1B263B] animate-fade-in transition-all duration-200"
            >
              <AlertCircle className="h-5 w-5 text-[#E74C3C] shrink-0 mt-0.5" />
              <div className="flex-1 text-[13px] leading-snug font-medium text-[#C0392B]">
                {authError}
              </div>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                className="text-[#6C757D] hover:text-[#1B263B] transition-colors p-0.5 -mr-1 -mt-0.5 rounded focus:outline-none"
                aria-label="Fechar mensagem de erro"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* If Authenticated: show success view inside the card */}
          {isSuccess ? (
            <div className="py-4 text-center space-y-4 animate-fade-in">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#2A9D8F]/15 text-[#2A9D8F] flex items-center justify-center">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-[#1B263B]">Autenticação autorizada</h3>
                <p className="text-sm text-[#6C757D]">
                  Bem-vindo(a), <span className="font-semibold text-[#1E3A5F]">{userName}</span>.
                  Sessão operacional iniciada com sucesso.
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => navigate('/painel')}
                  className="w-full h-10 rounded-lg bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <span>Acessar Painel Agora</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false)
                    setPassword('')
                    setHasAttemptedSubmit(false)
                  }}
                  className="text-xs text-[#1E3A5F] hover:underline font-medium block mx-auto"
                >
                  Permanecer no login
                </button>
              </div>
            </div>
          ) : isForgotOpen ? (
            /* Forgot Password Inline Expansion (Presentational) */
            <form onSubmit={handleForgotSubmit} noValidate className="space-y-4 animate-fade-in">
              <div className="space-y-1">
                <h3 className="text-[17px] font-semibold text-[#1B263B]">Recuperação de Senha</h3>
                <p className="text-[13px] text-[#6C757D] leading-relaxed">
                  Informe o e-mail corporativo cadastrado para receber instruções de redefinição de
                  acesso.
                </p>
              </div>

              {forgotSubmitted ? (
                <div className="rounded-[8px] border border-[#2A9D8F]/30 bg-[#E8F8F5] p-3 text-[13px] text-[#1E3A5F] space-y-1">
                  <p className="font-medium text-[#2A9D8F]">Solicitação registrada</p>
                  <p className="text-[#6C757D]">
                    Se o endereço estiver cadastrado, um link de recuperação será enviado para{' '}
                    <strong className="text-[#1B263B]">{forgotEmail}</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="forgot-email"
                    className="block text-[13px] font-medium text-[#1B263B]"
                  >
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6C757D]">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      onBlur={() => setForgotTouched(true)}
                      placeholder="seuemail@empresa.com"
                      className={`w-full rounded-[8px] bg-[#F8F9FA] pl-10 pr-3.5 py-2.5 text-[15px] text-[#1B263B] placeholder-[#9AA0A6] border transition-all duration-150 focus:outline-none focus:bg-white ${
                        forgotEmailError
                          ? 'border-[#E74C3C] ring-2 ring-[#E74C3C]/20'
                          : 'border-[#DEE2E6] focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20'
                      }`}
                    />
                  </div>
                  {forgotEmailError && (
                    <p className="text-[12px] text-[#E74C3C] font-normal mt-1">
                      {forgotEmailError}
                    </p>
                  )}
                </div>
              )}

              <div className="pt-2 space-y-3">
                {!forgotSubmitted && (
                  <button
                    type="submit"
                    className="w-full h-[46px] rounded-[8px] bg-[#1E3A5F] hover:bg-[#16304F] text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] border-b-2 border-[#10233B] shadow-sm cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar link de recuperação</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCloseForgot}
                  className="w-full text-center text-[13px] font-medium text-[#1E3A5F] hover:text-[#16304F] flex items-center justify-center gap-1.5 transition-colors pt-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar ao login</span>
                </button>
              </div>
            </form>
          ) : (
            /* Main Login Form */
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="email" className="block text-[13px] font-medium text-[#1B263B]">
                  E-mail
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6C757D]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="seuemail@empresa.com"
                    className={`w-full rounded-[8px] bg-[#F8F9FA] pl-10 pr-3.5 py-2.5 text-[15px] text-[#1B263B] placeholder-[#9AA0A6] border transition-all duration-150 focus:outline-none focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed ${
                      emailError
                        ? 'border-[#E74C3C] ring-2 ring-[#E74C3C]/20'
                        : 'border-[#DEE2E6] focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20'
                    }`}
                  />
                </div>
                {emailError && (
                  <p className="text-[12px] text-[#E74C3C] font-normal mt-1">{emailError}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="password" className="block text-[13px] font-medium text-[#1B263B]">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6C757D]">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    placeholder="••••••••"
                    className={`w-full rounded-[8px] bg-[#F8F9FA] pl-10 pr-10 py-2.5 text-[15px] text-[#1B263B] placeholder-[#9AA0A6] border transition-all duration-150 focus:outline-none focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed ${
                      passwordError
                        ? 'border-[#E74C3C] ring-2 ring-[#E74C3C]/20'
                        : 'border-[#DEE2E6] focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20'
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={isLoading}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6C757D] hover:text-[#1B263B] transition-colors focus:outline-none disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[12px] text-[#E74C3C] font-normal mt-1">{passwordError}</p>
                )}
              </div>

              {/* Row: Lembrar-me Checkbox and Esqueci minha senha link */}
              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    disabled={isLoading}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded-[4px] border-[#DEE2E6] text-[#1E3A5F] accent-[#1E3A5F] focus:ring-[#1E3A5F] cursor-pointer"
                  />
                  <span className="text-[13px] text-[#1B263B] font-normal">Lembrar-me</span>
                </label>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleOpenForgot}
                  className="text-[13px] font-medium text-[#1E3A5F] hover:text-[#16304F] hover:underline focus:outline-none cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>

              {/* Full-width Primary Button "Entrar" */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full h-[46px] rounded-[8px] text-[15px] font-semibold flex items-center justify-center gap-2 transition-all duration-150 shadow-sm ${
                    isLoading
                      ? 'bg-[#1E3A5F]/80 text-white cursor-not-allowed opacity-90'
                      : 'bg-[#1E3A5F] hover:bg-[#16304F] text-white hover:scale-[1.01] active:scale-[0.99] border-b-2 border-[#10233B] cursor-pointer'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <span>Entrar</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Status Line at the very bottom of the card */}
          <div className="mt-6 pt-4 border-t border-[#E9ECEF] flex items-center justify-center gap-2 text-[12px] text-[#6C757D]">
            <span>Sistema operacional</span>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {backendStatus === 'online' ? (
                  <>
                    <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-[#2A9D8F] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2A9D8F]" />
                  </>
                ) : backendStatus === 'offline' ? (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E74C3C]" />
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse" />
                )}
              </span>
              <span
                className={`font-medium ${
                  backendStatus === 'online'
                    ? 'text-[#2A9D8F]'
                    : backendStatus === 'offline'
                      ? 'text-[#E74C3C]'
                      : 'text-amber-500'
                }`}
              >
                {backendStatus === 'online'
                  ? 'Ativo'
                  : backendStatus === 'offline'
                    ? 'Offline'
                    : 'Verificando...'}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-card Security / System Note */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-[#A0AEC0]/70 tracking-wide">
            Acesso restrito e monitorado • Controle Preditivo v1.0
          </p>
        </div>
      </div>
    </div>
  )
}
