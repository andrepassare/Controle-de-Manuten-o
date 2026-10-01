import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Activity,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { convitesService } from '@/services/users'
import { Convite } from '@/types/pcm'

export default function CadastroConvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [isLoadingToken, setIsLoadingToken] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [convite, setConvite] = useState<Convite | null>(null)

  // Form inputs
  const [emailConfirm, setEmailConfirm] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [senhaConfirm, setSenhaConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Validation / submission state
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    let isMounted = true

    const validateToken = async () => {
      if (!token) {
        setTokenError('Token de convite não fornecido.')
        setIsLoadingToken(false)
        return
      }

      try {
        const found = await convitesService.getByToken(token)
        if (!isMounted) return

        if (!found) {
          setTokenError(
            'Link de convite inválido ou inexistente. Solicite um novo convite ao administrador.',
          )
          setIsLoadingToken(false)
          return
        }

        if (found.usado) {
          setTokenError('Este convite já foi utilizado para criar uma conta na plataforma.')
          setIsLoadingToken(false)
          return
        }

        const expDate = new Date(found.expira_em)
        if (expDate.getTime() < Date.now()) {
          setTokenError(
            'Este convite expirou. Por motivos de segurança, os convites são válidos por 7 dias. Solicite um novo envio ao administrador.',
          )
          setIsLoadingToken(false)
          return
        }

        setConvite(found)
        setIsLoadingToken(false)
      } catch (err) {
        if (!isMounted) return
        setTokenError(
          'Não foi possível verificar a validade do convite. Tente novamente mais tarde.',
        )
        setIsLoadingToken(false)
      }
    }

    validateToken()

    return () => {
      isMounted = false
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!convite) return

    // 1. Validation: Name
    if (!nome.trim() || nome.trim().length < 3) {
      setFormError('Por favor, informe seu nome completo (mínimo de 3 caracteres).')
      return
    }

    // 2. Validation: Email confirmation
    if (emailConfirm.trim().toLowerCase() !== convite.email.toLowerCase()) {
      setFormError('A confirmação do e-mail não confere com o e-mail do convite.')
      return
    }

    // 3. Validation: Phone
    const cleanPhone = telefone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setFormError(
        'Por favor, informe um número de telefone/celular válido com DDD (mínimo 10 dígitos).',
      )
      return
    }

    // 4. Validation: Password
    if (senha.length < 8) {
      setFormError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (senha !== senhaConfirm) {
      setFormError('As senhas digitadas não coincidem.')
      return
    }

    setSubmitting(true)

    try {
      // 1. Create user in PocketBase
      const newUser = await pb.collection('users').create({
        email: convite.email,
        password: senha,
        passwordConfirm: senhaConfirm,
        name: nome.trim(),
        phone: telefone.trim(),
        role: convite.role || 'operador',
      })

      // 2. Mark invite as used
      try {
        await convitesService.markAsUsed(convite.id)
      } catch (markErr) {
        console.warn('Erro ao marcar convite como usado:', markErr)
      }

      // 3. Authenticate user directly
      try {
        await pb.collection('users').authWithPassword(convite.email, senha)
      } catch (authErr) {
        console.warn('Autologin falhou, redirecionando para login:', authErr)
      }

      setIsSuccess(true)
      setTimeout(() => {
        navigate('/painel')
      }, 2000)
    } catch (err: unknown) {
      setSubmitting(false)
      const message = (err as { message?: string })?.message || ''
      if (message.includes('email') || message.includes('already exists')) {
        setFormError('Já existe uma conta cadastrada com este endereço de e-mail.')
      } else {
        setFormError(
          'Ocorreu um erro ao processar o cadastro. Verifique os dados e tente novamente.',
        )
      }
    }
  }

  // Loading state
  if (isLoadingToken) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <Loader2 className="w-10 h-10 text-[#2A9D8F] animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-[#1B263B]">Validando Convite...</h2>
          <p className="text-sm text-[#6C757D]">
            Verificando autenticidade do link de acesso seguro.
          </p>
        </div>
      </div>
    )
  }

  // Invalid or expired token
  if (tokenError || !convite) {
    return (
      <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-red-100">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#1B263B]">Acesso Não Autorizado</h2>
            <p className="text-sm text-[#6C757D] leading-relaxed">{tokenError}</p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full h-11 rounded-lg bg-[#1E3A5F] hover:bg-[#16304F] text-white font-medium text-sm transition-colors"
            >
              Ir para tela de Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D1B2A] flex items-center justify-center p-4 sm:p-6 select-none font-sans relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, #1B263B 0%, #0D1B2A 70%), linear-gradient(180deg, #1B263B 0%, #0D1B2A 50%, #415A77 150%)',
        }}
      />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#2A9D8F]/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#1E3A5F]/40 blur-[110px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[500px] mx-auto py-8">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-[#1E3A5F] flex items-center justify-center border border-[#2A9D8F]/40 shadow-lg mb-3">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Controle Preditiva</h1>
          <p className="text-xs text-[#A0AEC0] mt-1">
            Cadastro de Novo Usuário via Convite Oficial
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-[#E9ECEF] p-6 sm:p-8 shadow-2xl">
          {isSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-[#1B263B]">Cadastro Realizado com Sucesso!</h2>
              <p className="text-sm text-[#6C757D]">
                Sua conta foi criada e ativada. Você está sendo redirecionado para o painel
                principal...
              </p>
              <div className="flex justify-center pt-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#2A9D8F]" />
              </div>
            </div>
          ) : (
            <>
              {/* Invite info badge */}
              <div className="mb-6 p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-lg flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <p className="font-semibold text-emerald-800">Convite Autorizado</p>
                  <p className="mt-0.5">
                    Este formulário foi liberado pelo administrador para o e-mail{' '}
                    <strong className="text-emerald-900 font-medium">{convite.email}</strong> com
                    permissão de{' '}
                    <strong className="text-emerald-900 font-medium">
                      {convite.role === 'admin' ? 'Administrador' : 'Operador'}
                    </strong>
                    .
                  </p>
                </div>
              </div>

              {formError && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="flex-1">{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Email (Pre-filled and disabled) */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#1B263B]">
                    Endereço de e-mail{' '}
                    <span className="text-xs font-normal text-[#6C757D]">
                      (vinculado ao convite)
                    </span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6C757D]">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      value={convite.email}
                      disabled
                      className="w-full rounded-lg bg-gray-100 pl-10 pr-3.5 py-2.5 text-sm text-[#1B263B] font-medium border border-gray-300 cursor-not-allowed select-all"
                    />
                  </div>
                </div>

                {/* Email Confirmation */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#1B263B]">
                    Confirmação do endereço de e-mail <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6C757D]">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={emailConfirm}
                      onChange={(e) => setEmailConfirm(e.target.value)}
                      placeholder="Repita o seu e-mail do convite"
                      className="w-full rounded-lg bg-[#F8F9FA] pl-10 pr-3.5 py-2.5 text-sm text-[#1B263B] placeholder-gray-400 border border-[#DEE2E6] focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#1B263B]">
                    Nome completo <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6C757D]">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="ex.: Carlos da Silva"
                      className="w-full rounded-lg bg-[#F8F9FA] pl-10 pr-3.5 py-2.5 text-sm text-[#1B263B] placeholder-gray-400 border border-[#DEE2E6] focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#1B263B]">
                    Telefone / Celular (com DDD) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6C757D]">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(18) 99876-5432"
                      className="w-full rounded-lg bg-[#F8F9FA] pl-10 pr-3.5 py-2.5 text-sm text-[#1B263B] placeholder-gray-400 border border-[#DEE2E6] focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#1B263B]">
                    Senha{' '}
                    <span className="text-xs font-normal text-[#6C757D]">
                      (mínimo 8 caracteres)
                    </span>{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6C757D]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg bg-[#F8F9FA] pl-10 pr-10 py-2.5 text-sm text-[#1B263B] placeholder-gray-400 border border-[#DEE2E6] focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6C757D] hover:text-[#1B263B]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-semibold text-[#1B263B]">
                    Confirmação de senha <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6C757D]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={senhaConfirm}
                      onChange={(e) => setSenhaConfirm(e.target.value)}
                      placeholder="Repita a senha criada"
                      className="w-full rounded-lg bg-[#F8F9FA] pl-10 pr-10 py-2.5 text-sm text-[#1B263B] placeholder-gray-400 border border-[#DEE2E6] focus:border-[#1E3A5F] focus:ring-2 focus:ring-[#1E3A5F]/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6C757D] hover:text-[#1B263B]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-lg bg-[#1E3A5F] hover:bg-[#16304F] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Criando conta e ativando credenciais...</span>
                      </>
                    ) : (
                      <>
                        <span>Concluir Cadastro e Acessar Plataforma</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-[#A0AEC0] hover:text-white transition-colors">
            Já possui acesso ativo? Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  )
}
