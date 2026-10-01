import React, { useState, useMemo } from 'react'
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  Edit,
  Trash2,
  X,
  AlertCircle,
  Eye,
  Calendar,
  Layers,
  Wrench,
  Users2,
  Check,
  ChevronDown,
} from 'lucide-react'
import {
  OrdemServico,
  Equipamento,
  Equipe,
  OSStatus,
  OSCategoria,
  OSModalidade,
  OSPrioridade,
} from '@/types/pcm'
import { ordensServicoService } from '@/services/ordensServico'

interface OSManagerProps {
  ordens: OrdemServico[]
  equipamentos: Equipamento[]
  equipes: Equipe[]
  onRefresh: () => void
  initialStatusFilter?: string
}

export default function OSManager({
  ordens,
  equipamentos,
  equipes,
  onRefresh,
  initialStatusFilter,
}: OSManagerProps) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'todas')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas')
  const [modalidadeFilter, setModalidadeFilter] = useState<string>('todas')
  const [equipamentoFilter, setEquipamentoFilter] = useState<string>('todos')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOS, setEditingOS] = useState<OrdemServico | null>(null)
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false)
  const [osToClose, setOsToClose] = useState<OrdemServico | null>(null)
  const [closeNotes, setCloseNotes] = useState('')
  const [closeHours, setCloseHours] = useState<number | undefined>(undefined)

  // Form Fields for Create / Edit
  const [formNumero, setFormNumero] = useState('')
  const [formTitulo, setFormTitulo] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formStatus, setFormStatus] = useState<OSStatus>('aberta')
  const [formCategoria, setFormCategoria] = useState<OSCategoria>('Mecânica')
  const [formModalidade, setFormModalidade] = useState<OSModalidade>('Preditiva')
  const [formPrioridade, setFormPrioridade] = useState<OSPrioridade>('Média')
  const [formEquipamentoId, setFormEquipamentoId] = useState('')
  const [formEquipeId, setFormEquipeId] = useState('')
  const [formResponsavel, setFormResponsavel] = useState('')
  const [formTempoHoras, setFormTempoHoras] = useState<number | ''>('')
  const [formCustoEstimado, setFormCustoEstimado] = useState<number | ''>('')

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Filtered List
  const filteredOrdens = useMemo(() => {
    return ordens.filter((os) => {
      // Search
      const search = searchTerm.toLowerCase()
      const matchesSearch =
        os.numero.toLowerCase().includes(search) ||
        os.titulo.toLowerCase().includes(search) ||
        (os.descricao || '').toLowerCase().includes(search) ||
        (os.responsavel || '').toLowerCase().includes(search)

      if (!matchesSearch) return false

      // Status
      if (statusFilter !== 'todas') {
        if (statusFilter === 'aberta' && (os.status === 'aberta' || os.status === 'em_andamento')) {
          // match pending
        } else if (os.status !== statusFilter) {
          return false
        }
      }

      // Categoria
      if (categoriaFilter !== 'todas' && os.categoria !== categoriaFilter) {
        return false
      }

      // Modalidade
      if (modalidadeFilter !== 'todas' && os.modalidade !== modalidadeFilter) {
        return false
      }

      // Equipamento
      if (equipamentoFilter !== 'todos' && os.equipamento_id !== equipamentoFilter) {
        return false
      }

      return true
    })
  }, [ordens, searchTerm, statusFilter, categoriaFilter, modalidadeFilter, equipamentoFilter])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingOS(null)
    const year = new Date().getFullYear()
    const rnd = Math.floor(100 + Math.random() * 900)
    setFormNumero(`OS-${year}-${rnd}`)
    setFormTitulo('')
    setFormDescricao('')
    setFormStatus('aberta')
    setFormCategoria('Mecânica')
    setFormModalidade('Preditiva')
    setFormPrioridade('Média')
    setFormEquipamentoId(equipamentos[0]?.id || '')
    setFormEquipeId(equipes[0]?.id || '')
    setFormResponsavel('')
    setFormTempoHoras('')
    setFormCustoEstimado('')
    setFormError(null)
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (os: OrdemServico) => {
    setEditingOS(os)
    setFormNumero(os.numero)
    setFormTitulo(os.titulo)
    setFormDescricao(os.descricao || '')
    setFormStatus(os.status)
    setFormCategoria(os.categoria)
    setFormModalidade(os.modalidade)
    setFormPrioridade(os.prioridade || 'Média')
    setFormEquipamentoId(os.equipamento_id || '')
    setFormEquipeId(os.equipe_id || '')
    setFormResponsavel(os.responsavel || '')
    setFormTempoHoras(os.tempo_execucao_horas !== undefined ? os.tempo_execucao_horas : '')
    setFormCustoEstimado(os.custo_estimado !== undefined ? os.custo_estimado : '')
    setFormError(null)
    setIsModalOpen(true)
  }

  // Handle Save (Create or Update)
  const handleSaveOS = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formTitulo.trim()) {
      setFormError('O título da Ordem de Serviço é obrigatório.')
      return
    }

    setSaving(true)
    try {
      const payload: Partial<OrdemServico> = {
        numero: formNumero,
        titulo: formTitulo.trim(),
        descricao: formDescricao.trim(),
        status: formStatus,
        categoria: formCategoria,
        modalidade: formModalidade,
        prioridade: formPrioridade,
        equipamento_id: formEquipamentoId || undefined,
        equipe_id: formEquipeId || undefined,
        responsavel: formResponsavel.trim() || undefined,
        tempo_execucao_horas: formTempoHoras !== '' ? Number(formTempoHoras) : undefined,
        custo_estimado: formCustoEstimado !== '' ? Number(formCustoEstimado) : undefined,
      }

      if (editingOS) {
        await ordensServicoService.update(editingOS.id, payload)
      } else {
        await ordensServicoService.create(payload)
      }

      setIsModalOpen(false)
      onRefresh()
    } catch (err: unknown) {
      setFormError('Erro ao salvar Ordem de Serviço. Verifique os dados.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Fechar OS Dialog
  const handleTriggerCloseOS = (os: OrdemServico) => {
    setOsToClose(os)
    setCloseNotes(os.observacoes_fechamento || '')
    setCloseHours(os.tempo_execucao_horas || 2.5)
    setIsCloseModalOpen(true)
  }

  const handleConfirmCloseOS = async () => {
    if (!osToClose) return
    try {
      await ordensServicoService.fecharOS(osToClose.id, closeNotes, closeHours)
      setIsCloseModalOpen(false)
      setOsToClose(null)
      onRefresh()
    } catch (err) {
      alert('Erro ao fechar ordem de serviço.')
    }
  }

  // Handle Reabrir OS
  const handleReopenOS = async (os: OrdemServico) => {
    if (window.confirm(`Deseja reabrir a ${os.numero}?`)) {
      try {
        await ordensServicoService.reabrirOS(os.id)
        onRefresh()
      } catch (err) {
        alert('Erro ao reabrir ordem de serviço.')
      }
    }
  }

  // Handle Delete OS
  const handleDeleteOS = async (os: OrdemServico) => {
    if (window.confirm(`Tem certeza que deseja excluir a ${os.numero}?`)) {
      try {
        await ordensServicoService.delete(os.id)
        onRefresh()
      } catch (err) {
        alert('Erro ao excluir ordem de serviço.')
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-[#1E3A5F] tracking-tight">
            Gestão de Ordens de Serviço (OS)
          </h2>
          <p className="text-xs text-[#718096] mt-0.5">
            Abertura, acompanhamento, alocação de equipes e encerramento técnico de manutenções.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#2A9D8F] text-white hover:bg-[#238276] rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Ordem de Serviço</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por número (ex.: OS-2026-001), título, responsável..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F] focus:bg-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-[#1E3A5F]"
          >
            <option value="todas">Todos os Status</option>
            <option value="aberta">Abertas / Em Andamento</option>
            <option value="fechada">Fechadas (Concluídas)</option>
            <option value="cancelada">Canceladas</option>
          </select>

          {/* Modalidade Filter */}
          <select
            value={modalidadeFilter}
            onChange={(e) => setModalidadeFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-[#1E3A5F]"
          >
            <option value="todas">Todas as Modalidades</option>
            <option value="Preditiva">Preditiva</option>
            <option value="Preventiva">Preventiva</option>
            <option value="Corretiva Programada">Corretiva Programada</option>
            <option value="Corretiva Emergencial">Corretiva Emergencial</option>
            <option value="Melhoria">Melhoria</option>
            <option value="Inspeção">Inspeção</option>
          </select>

          {/* Categoria Filter */}
          <select
            value={categoriaFilter}
            onChange={(e) => setCategoriaFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-[#1E3A5F]"
          >
            <option value="todas">Todas as Categorias</option>
            <option value="Mecânica">Mecânica</option>
            <option value="Elétrica">Elétrica</option>
            <option value="Instrumentação">Instrumentação</option>
            <option value="Lubrificação">Lubrificação</option>
            <option value="Caldeiraria">Caldeiraria</option>
            <option value="Automação">Automação</option>
            <option value="Geral">Geral</option>
          </select>

          {/* Clear Filters */}
          {(searchTerm ||
            statusFilter !== 'todas' ||
            categoriaFilter !== 'todas' ||
            modalidadeFilter !== 'todas') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('todas')
                setCategoriaFilter('todas')
                setModalidadeFilter('todas')
                setEquipamentoFilter('todos')
              }}
              className="text-xs text-gray-500 hover:text-red-600 px-2 py-2 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1B2A] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Nº OS / Título</th>
                <th className="px-4 py-3 font-semibold">Equipamento (Tag)</th>
                <th className="px-4 py-3 font-semibold">Equipe / Técnico</th>
                <th className="px-4 py-3 font-semibold">Modalidade & Categoria</th>
                <th className="px-4 py-3 font-semibold">Prioridade</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrdens.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Nenhuma ordem de serviço encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredOrdens.map((os) => {
                  const equip =
                    equipamentos.find((e) => e.id === os.equipamento_id) ||
                    os.expand?.equipamento_id
                  const equipe = equipes.find((e) => e.id === os.equipe_id) || os.expand?.equipe_id

                  return (
                    <tr key={os.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* OS Number & Title */}
                      <td className="px-4 py-3 max-w-[280px]">
                        <div className="font-mono font-bold text-[#1E3A5F] text-[11px]">
                          {os.numero}
                        </div>
                        <div className="font-semibold text-gray-800 line-clamp-1 mt-0.5">
                          {os.titulo}
                        </div>
                        {os.descricao && (
                          <div className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                            {os.descricao}
                          </div>
                        )}
                      </td>

                      {/* Equipment */}
                      <td className="px-4 py-3">
                        {equip ? (
                          <div>
                            <span className="font-semibold text-gray-800 block leading-tight">
                              {equip.nome}
                            </span>
                            <span className="font-mono text-[10px] text-[#2A9D8F] font-bold">
                              {equip.tag}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Não vinculado</span>
                        )}
                      </td>

                      {/* Team / Resp */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {equipe?.nome || 'Equipe Geral'}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Resp: {os.responsavel || 'A definir'}
                        </div>
                      </td>

                      {/* Modalidade / Categoria */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            os.modalidade === 'Preditiva'
                              ? 'bg-[#2A9D8F]/15 text-[#2A9D8F]'
                              : os.modalidade === 'Preventiva'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {os.modalidade}
                        </span>
                        <span className="block text-[11px] text-gray-500 mt-0.5">
                          {os.categoria}
                        </span>
                      </td>

                      {/* Prioridade */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            os.prioridade === 'Urgente'
                              ? 'bg-red-100 text-red-700'
                              : os.prioridade === 'Alta'
                                ? 'bg-orange-100 text-orange-700'
                                : os.prioridade === 'Média'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {os.prioridade || 'Média'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {os.status === 'fechada' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Fechada</span>
                          </span>
                        ) : os.status === 'em_andamento' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600 animate-spin" />
                            <span>Em Andamento</span>
                          </span>
                        ) : os.status === 'cancelada' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            <span>Cancelada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Aberta</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {os.status === 'fechada' ? (
                            <button
                              onClick={() => handleReopenOS(os)}
                              title="Reabrir Ordem de Serviço"
                              className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTriggerCloseOS(os)}
                              title="Concluir / Fechar OS"
                              className="px-2 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Fechar OS</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(os)}
                            title="Editar OS"
                            className="p-1.5 text-gray-500 hover:text-[#1E3A5F] hover:bg-gray-100 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteOS(os)}
                            title="Excluir OS"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit OS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-[#0D1B2A] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-tight text-white">
                  {editingOS
                    ? `Editar Ordem de Serviço — ${editingOS.numero}`
                    : 'Abertura de Nova Ordem de Serviço'}
                </h3>
                <p className="text-[11px] text-[#A0AEC0]">
                  Preencha os dados técnicos e vincule ao equipamento e equipe responsável.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveOS} className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Number */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Número da OS</label>
                  <input
                    type="text"
                    required
                    value={formNumero}
                    onChange={(e) => setFormNumero(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F] font-mono font-bold"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as OSStatus)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="aberta">Aberta</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="fechada">Fechada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Título da Manutenção / Intervenção <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex.: Análise de vibração no mancais da Bomba BOM-0101"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Descrição Técnica do Problema ou Procedimento
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalhes dos sintomas observados, medições prévias, escopo de trabalho..."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                />
              </div>

              {/* Modalidade / Categoria / Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Modalidade</label>
                  <select
                    value={formModalidade}
                    onChange={(e) => setFormModalidade(e.target.value as OSModalidade)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="Preditiva">Preditiva</option>
                    <option value="Preventiva">Preventiva</option>
                    <option value="Corretiva Programada">Corretiva Programada</option>
                    <option value="Corretiva Emergencial">Corretiva Emergencial</option>
                    <option value="Melhoria">Melhoria</option>
                    <option value="Inspeção">Inspeção</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Categoria</label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value as OSCategoria)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="Mecânica">Mecânica</option>
                    <option value="Elétrica">Elétrica</option>
                    <option value="Instrumentação">Instrumentação</option>
                    <option value="Lubrificação">Lubrificação</option>
                    <option value="Caldeiraria">Caldeiraria</option>
                    <option value="Automação">Automação</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Prioridade</label>
                  <select
                    value={formPrioridade}
                    onChange={(e) => setFormPrioridade(e.target.value as OSPrioridade)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>

              {/* Vínculo Equipamento & Equipe */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Equipamento da Planta (Ativo)
                  </label>
                  <select
                    value={formEquipamentoId}
                    onChange={(e) => setFormEquipamentoId(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="">Nenhum (Geral / Infra)</option>
                    {equipamentos.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.tag} — {eq.nome} ({eq.setor})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Equipe Responsável</label>
                  <select
                    value={formEquipeId}
                    onChange={(e) => setFormEquipeId(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="">A definir</option>
                    {equipes.map((eqp) => (
                      <option key={eqp.id} value={eqp.id}>
                        {eqp.nome} ({eqp.especialidade})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Técnico Responsável & Custo/Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Técnico Líder / Resp.
                  </label>
                  <input
                    type="text"
                    placeholder="ex.: Carlos Eduardo"
                    value={formResponsavel}
                    onChange={(e) => setFormResponsavel(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Tempo Execução (Horas)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="ex.: 4.0"
                    value={formTempoHoras}
                    onChange={(e) =>
                      setFormTempoHoras(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Custo Estimado (R$)</label>
                  <input
                    type="number"
                    step="10"
                    placeholder="ex.: 1500"
                    value={formCustoEstimado}
                    onChange={(e) =>
                      setFormCustoEstimado(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-[#1E3A5F] hover:bg-[#16304F] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Gravando...' : editingOS ? 'Atualizar OS' : 'Criar Ordem de Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fechar OS */}
      {isCloseModalOpen && osToClose && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#1B263B]">
                  Encerrar Ordem de Serviço: {osToClose.numero}
                </h3>
                <p className="text-xs text-gray-500">{osToClose.titulo}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Tempo Real de Execução (Horas)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={closeHours || ''}
                  onChange={(e) => setCloseHours(Number(e.target.value))}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Parecer Técnico de Fechamento / Laudo
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva o procedimento realizado, ensaios de validação e estado final do equipamento..."
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseOS}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
