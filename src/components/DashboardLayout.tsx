import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Activity,
  LayoutDashboard,
  ClipboardList,
  Wrench,
  Users2,
  UserCog,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  User as UserIcon,
  Bell,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface DashboardLayoutProps {
  children: React.ReactNode
  currentTab: 'dashboard' | 'os' | 'equipamentos' | 'equipes' | 'usuarios'
  onTabChange: (tab: 'dashboard' | 'os' | 'equipamentos' | 'equipes' | 'usuarios') => void
}

export default function DashboardLayout({
  children,
  currentTab,
  onTabChange,
}: DashboardLayoutProps) {
  const { user, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Indicadores PCM',
      icon: LayoutDashboard,
      badge: 'Geral',
    },
    {
      id: 'os' as const,
      label: 'Ordens de Serviço',
      icon: ClipboardList,
      badge: 'OS',
    },
    {
      id: 'equipamentos' as const,
      label: 'Equipamentos',
      icon: Wrench,
    },
    {
      id: 'equipes' as const,
      label: 'Equipes & Técnicos',
      icon: Users2,
    },
    ...(isAdmin
      ? [
          {
            id: 'usuarios' as const,
            label: 'Gestão de Usuários',
            icon: UserCog,
            adminOnly: true,
          },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col md:flex-row font-sans text-[#1B263B]">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-[#0D1B2A] text-white px-4 py-3 flex items-center justify-between border-b border-[#1E3A5F] sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1E3A5F] flex items-center justify-center border border-[#2A9D8F]/40 shadow-sm">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block leading-tight">
              Controle Preditiva
            </span>
            <span className="text-[10px] text-[#A0AEC0]">Gestão PCM & Planta</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-md hover:bg-[#1E3A5F] text-[#A0AEC0] hover:text-white transition-colors"
          aria-label="Abrir menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#0D1B2A] text-white flex flex-col z-50 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1E3A5F]/70 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center border border-[#2A9D8F]/40 shadow-[0_0_12px_rgba(42,157,143,0.3)] shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-[15px] tracking-tight leading-snug truncate text-white">
              Controle Preditiva
            </h1>
            <p className="text-[11px] text-[#A0AEC0] truncate">PCM • Monitoramento Planta</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#718096]">
            Módulos da Plataforma
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id)
                  setMobileMenuOpen(false)
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#1E3A5F] text-white shadow-sm border border-[#2A9D8F]/50 font-semibold'
                    : 'text-[#A0AEC0] hover:text-white hover:bg-[#1B263B]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#2A9D8F]' : 'text-[#718096]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.adminOnly && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Admin
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Current User Card & Logout */}
        <div className="p-3 border-t border-[#1E3A5F]/60 bg-[#09131D]/80">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-[#152335]/70 border border-[#1E3A5F]/40">
            <div className="w-8 h-8 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white shrink-0 font-bold text-xs border border-[#2A9D8F]/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="overflow-hidden flex-1 text-left">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {user?.name || 'Operador'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    isAdmin ? 'bg-amber-400' : 'bg-[#2A9D8F]'
                  }`}
                />
                <span className="text-[10px] text-[#A0AEC0] capitalize truncate">
                  {isAdmin ? 'Administrador' : 'Operador PCM'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-300 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top bar on Desktop */}
        <header className="hidden md:flex h-16 bg-white border-b border-[#E2E8F0] px-6 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#718096] font-medium">Controle Preditiva</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-[#1E3A5F] capitalize">
              {currentTab === 'dashboard'
                ? 'Painel Geral de Indicadores PCM & Planta'
                : currentTab === 'os'
                  ? 'Ordens de Serviço de Manutenção'
                  : currentTab === 'equipamentos'
                    ? 'Cadastro & Monitoramento de Equipamentos'
                    : currentTab === 'equipes'
                      ? 'Equipes Técnicas & Turnos'
                      : 'Gestão de Usuários & Convites'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">Planta Conectada</span>
            </div>

            <div className="h-6 w-[1px] bg-gray-200" />

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold text-[#1B263B] leading-tight">
                  {user?.name || user?.email}
                </p>
                <p className="text-[10px] text-[#718096]">
                  {isAdmin ? 'Acesso Administrativo' : 'Acesso Operador'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-xs font-bold border border-[#2A9D8F]/40 shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
