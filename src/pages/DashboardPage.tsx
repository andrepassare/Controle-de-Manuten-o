import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import DashboardLayout from '@/components/DashboardLayout'
import IndicatorsPCM from '@/components/pcm/IndicatorsPCM'
import OSManager from '@/components/pcm/OSManager'
import EquipamentosManager from '@/components/pcm/EquipamentosManager'
import AssetImportPreview from '@/components/pcm/AssetImportPreview'
import EquipesManager from '@/components/pcm/EquipesManager'
import UsersManager from '@/components/pcm/UsersManager'
import { useAuth } from '@/contexts/AuthContext'
import { ordensServicoService } from '@/services/ordensServico'
import { equipamentosService } from '@/services/equipamentos'
import { equipesService } from '@/services/equipes'
import { OrdemServico, Equipamento, Equipe } from '@/types/pcm'

export default function DashboardPage() {
  const { isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'os' | 'equipamentos' | 'equipes' | 'usuarios'
  >('dashboard')
  const [osStatusFilter, setOsStatusFilter] = useState<string>('todas')

  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([])
  const [equipes, setEquipes] = useState<Equipe[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, isAuthLoading, navigate])

  // Sync tab with URL query if provided
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['dashboard', 'os', 'equipamentos', 'equipes', 'usuarios'].includes(tabParam)) {
      if (tabParam === 'usuarios' && !isAdmin) {
        setActiveTab('dashboard')
      } else {
        setActiveTab(tabParam as any)
      }
    }
  }, [searchParams, isAdmin])

  // Fetch all PCM data
  const fetchData = useCallback(async () => {
    try {
      const [ordensRes, equipRes, equipesRes] = await Promise.all([
        ordensServicoService.getAll(),
        equipamentosService.getAll(),
        equipesService.getAll(),
      ])
      setOrdens(ordensRes)
      setEquipamentos(equipRes)
      setEquipes(equipesRes)
    } catch (err) {
      console.error('Erro ao carregar dados do PCM:', err)
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, fetchData])

  const handleTabChange = (tab: 'dashboard' | 'os' | 'equipamentos' | 'equipes' | 'usuarios') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const handleNavigateToOS = (filter?: string) => {
    if (filter) {
      setOsStatusFilter(filter)
    } else {
      setOsStatusFilter('todas')
    }
    handleTabChange('os')
  }

  if (isAuthLoading || (isAuthenticated && loadingData)) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-[#2A9D8F] animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#1E3A5F]">
          Carregando indicadores do PCM e planta industrial...
        </p>
      </div>
    )
  }

  return (
    <DashboardLayout currentTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'dashboard' && (
        <IndicatorsPCM
          ordens={ordens}
          equipamentos={equipamentos}
          equipes={equipes}
          onNavigateToOS={handleNavigateToOS}
        />
      )}

      {activeTab === 'os' && (
        <OSManager
          ordens={ordens}
          equipamentos={equipamentos}
          equipes={equipes}
          onRefresh={fetchData}
          initialStatusFilter={osStatusFilter}
        />
      )}

      {activeTab === 'equipamentos' && (
        <>
          {isAdmin && (
            <div className="mb-5">
              <AssetImportPreview />
            </div>
          )}
          <EquipamentosManager equipamentos={equipamentos} onRefresh={fetchData} />
        </>
      )}

      {activeTab === 'equipes' && <EquipesManager equipes={equipes} onRefresh={fetchData} />}

      {activeTab === 'usuarios' && isAdmin && <UsersManager />}
    </DashboardLayout>
  )
}
