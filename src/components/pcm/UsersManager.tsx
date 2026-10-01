import React, { useState, useEffect } from 'react'
import {
  UserCog,
  Mail,
  Send,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  User as UserIcon,
  Phone,
  Calendar,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink,
  Info,
} from 'lucide-react'
import { User, Convite, UserRole } from '@/types/pcm'
import { usersService, convitesService, CreateInviteResponse } from '@/services/users'
import { useAuth } from '@/contexts/AuthContext'

export default function UsersManager() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [loading, setLoading] = useState(true)

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('operador')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteResult, setInviteResult] = useState<CreateInviteResponse['invite'] | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Role modification feedback
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [allUsers, allConvites] = await Promise.all([
        usersService.getAll(),
        convitesService.getAll(),
      ])
      setUsers(allUsers)
      setConvites(allConvites)
    } catch (err) {
      console.error('Erro ao carregar usuários:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Send Invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setInviteResult(null)

    const cleanEmail = inviteEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setInviteError('Informe um endereço de e-mail válido para enviar o convite.')
      return
    }

    // Check if user already exists
    const exists = users.find((u) => u.email.toLowerCase() === cleanEmail)
    if (exists) {
      setInviteError(`O e-mail ${cleanEmail} já possui cadastro ativo na plataforma.`)
      return
    }

    setSendingInvite(true)
    try {
      const res = await convitesService.createInvite(cleanEmail, inviteRole)
      if (res.success) {
        setInviteResult(res.invite)
        setInviteEmail('')
        loadData()
      } else {
        setInviteError('Não foi possível gerar o convite.')
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Erro ao processar convite.'
      setInviteError(msg)
    } finally {
      setSendingInvite(false)
    }
  }

  // Copy Link to Clipboard
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Change User Role
  const handleChangeRole = async (targetUser: User, newRole: UserRole) => {
    if (targetUser.id === currentUser?.id) {
      if (
        !window.confirm(
          'Atenção: alterar o seu próprio papel de Administrador pode revogar o seu acesso a este módulo de Gestão de Usuários. Deseja prosseguir?',
        )
      ) {
        return
      }
    }

    setUpdatingRoleId(targetUser.id)
    try {
      await usersService.updateRole(targetUser.id, newRole)
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u)))
    } catch {
      alert('Erro ao atualizar permissão do usuário.')
    } finally {
      setUpdatingRoleId(null)
    }
  }

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#2A9D8F]" />
        <p className="text-xs text-gray-500">Carregando painel de usuários e convites...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="pb-2 border-b border-gray-200">
        <h2 className="text-xl font-bold text-[#1E3A5F] tracking-tight">
          Gestão de Usuários & Convites à Plataforma
        </h2>
        <p className="text-xs text-[#718096] mt-0.5">
          Controle central de permissões (Administrador vs. Operador) e geração de convites
          exclusivos por e-mail.
        </p>
      </div>

      {/* Invite Generation Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-[#2A9D8F]/10 text-[#2A9D8F] flex items-center justify-center font-bold">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1E3A5F]">
              Gerar & Enviar Convite de Acesso à Plataforma
            </h3>
            <p className="text-[11px] text-gray-500">
              O novo usuário só poderá criar sua conta utilizando o link seguro gerado para o e-mail
              informado.
            </p>
          </div>
        </div>

        <form onSubmit={handleSendInvite} className="mt-4 space-y-3">
          {inviteError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-7 space-y-1">
              <label className="text-xs font-semibold text-gray-700">
                Endereço de E-mail do Convidado <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="ex.: tecnico.pcm@empresa.com.br"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F] focus:bg-white"
                />
              </div>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-gray-700">Permissão Concedida</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
              >
                <option value="operador">Operador (Acesso aos indicadores e OS)</option>
                <option value="admin">Administrador (Acesso total + Usuários)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={sendingInvite}
                className="w-full h-9 rounded-lg bg-[#1E3A5F] hover:bg-[#16304F] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-60"
              >
                {sendingInvite ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Convite</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Invite Result Banner with Direct Link Copy */}
        {inviteResult && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-emerald-900">
                  Convite criado com sucesso para {inviteResult.email}!
                </span>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium">
                Válido por 7 dias (até{' '}
                {new Date(inviteResult.expira_em).toLocaleDateString('pt-BR')})
              </span>
            </div>

            <p className="text-[11px] text-emerald-800 leading-relaxed">
              {inviteResult.emailSent
                ? 'Um e-mail formal com o link de cadastro foi despachado para a caixa de entrada do usuário. Você também pode copiar o link direto abaixo caso necessário:'
                : 'O servidor gerou o token seguro exclusivo. Como o SMTP de envio direto pode requerer liberação de firewall externo, envie o link de ativação diretamente ao técnico:'}
            </p>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                readOnly
                value={inviteResult.inviteUrl}
                className="flex-1 bg-white text-xs font-mono p-2 rounded border border-emerald-300 text-gray-800 select-all"
              />
              <button
                onClick={() => handleCopyLink(inviteResult.inviteUrl)}
                className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-[#1E3A5F]" />
            <h3 className="text-sm font-bold text-[#1E3A5F]">
              Usuários Cadastrados na Plataforma ({users.length})
            </h3>
          </div>
          <span className="text-xs text-gray-500">Alteração de papéis em tempo real</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1B2A] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Nome / Identificação</th>
                <th className="px-4 py-3 font-semibold">E-mail Cadastrado</th>
                <th className="px-4 py-3 font-semibold">Telefone / Contato</th>
                <th className="px-4 py-3 font-semibold">Papel / Nível de Acesso</th>
                <th className="px-4 py-3 font-semibold text-right">Alterar Permissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const isCurrent = u.id === currentUser?.id
                const role: UserRole = (u.role as UserRole) || 'operador'

                return (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {u.name ? (
                            u.name.charAt(0).toUpperCase()
                          ) : (
                            <UserIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-800 block leading-tight">
                            {u.name || 'Sem nome informado'}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] text-[#2A9D8F] font-bold">
                              (Você — Sessão Atual)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-gray-700 font-medium">{u.email}</span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="text-gray-600">{u.phone || '—'}</span>
                    </td>

                    <td className="px-4 py-3">
                      {role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span>Administrador</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <span>Operador PCM</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {updatingRoleId === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#1E3A5F]" />
                        ) : (
                          <select
                            value={role}
                            onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                            className="text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:border-[#1E3A5F]"
                          >
                            <option value="operador">Definir como Operador</option>
                            <option value="admin">Definir como Administrador</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invites History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#2A9D8F]" />
            <h3 className="text-sm font-bold text-[#1E3A5F]">
              Histórico de Convites Emitidos ({convites.length})
            </h3>
          </div>
          <span className="text-xs text-gray-500">Controle de ativação e expiração</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1B2A] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">E-mail Convidado</th>
                <th className="px-4 py-3 font-semibold">Papel Previsto</th>
                <th className="px-4 py-3 font-semibold">Status do Convite</th>
                <th className="px-4 py-3 font-semibold">Expira Em</th>
                <th className="px-4 py-3 font-semibold text-right">Link de Cadastro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {convites.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    Nenhum convite emitido até o momento.
                  </td>
                </tr>
              ) : (
                convites.map((c) => {
                  const isExpired = new Date(c.expira_em).getTime() < Date.now()
                  const directUrl = `${window.location.origin}/cadastro/${c.token}`

                  return (
                    <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.email}</td>
                      <td className="px-4 py-3 capitalize font-semibold text-gray-700">
                        {c.role || 'operador'}
                      </td>
                      <td className="px-4 py-3">
                        {c.usado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check className="w-3 h-3" />
                            <span>Cadastro Realizado</span>
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                            <span>Expirado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <span>Aguardando Cadastro</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(c.expira_em).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!c.usado && !isExpired && (
                          <button
                            onClick={() => handleCopyLink(directUrl)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E3A5F] hover:text-[#2A9D8F] cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Link</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
