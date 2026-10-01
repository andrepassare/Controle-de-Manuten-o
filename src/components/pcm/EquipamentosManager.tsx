import React, { useState, useMemo } from 'react'
import {
  Wrench,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  AlertCircle,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react'
import {
  Equipamento,
  EquipamentoTipo,
  EquipamentoStatus,
  EquipamentoCriticidade,
} from '@/types/pcm'
import { equipamentosService } from '@/services/equipamentos'

interface EquipamentosManagerProps {
  equipamentos: Equipamento[]
  onRefresh: () => void
  onOpenImport?: () => void
}

export default function EquipamentosManager({
  equipamentos,
  onRefresh,
  onOpenImport,
}: EquipamentosManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [criticidadeFilter, setCriticidadeFilter] = useState('todos')
  const [sensoresFilter, setSensoresFilter] = useState('todos')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null)

  // Form Fields
  const [formNome, setFormNome] = useState('')
  const [formTag, setFormTag] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formCodigoEquip, setFormCodigoEquip] = useState('')
  const [formCodigoMis, setFormCodigoMis] = useState('')
  const [formFamiliaCodigo, setFormFamiliaCodigo] = useState('')
  const [formFamiliaDescricao, setFormFamiliaDescricao] = useState('')
  const [formSensores, setFormSensores] = useState(false)
  const [formResponsavel, setFormResponsavel] = useState('')
  const [formSetor, setFormSetor] = useState('')
  const [formTipo, setFormTipo] = useState<EquipamentoTipo>('Mecânico')
  const [formStatus, setFormStatus] = useState<EquipamentoStatus>('Operacional')
  const [formCriticidade, setFormCriticidade] = useState<EquipamentoCriticidade>('C')
  const [formFabricante, setFormFabricante] = useState('')
  const [formModelo, setFormModelo] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const filteredEquipamentos = useMemo(() => {
    return equipamentos.filter((eq) => {
      const search = searchTerm.toLowerCase()
      const matchesSearch =
        (eq.nome || '').toLowerCase().includes(search) ||
        (eq.tag || '').toLowerCase().includes(search) ||
        (eq.descricao || '').toLowerCase().includes(search) ||
        (eq.codigo_equipamento || '').toLowerCase().includes(search) ||
        (eq.codigo_mis || '').toLowerCase().includes(search) ||
        (eq.familia_codigo || '').toLowerCase().includes(search) ||
        (eq.familia_descricao || '').toLowerCase().includes(search) ||
        (eq.responsavel || '').toLowerCase().includes(search) ||
        (eq.setor || '').toLowerCase().includes(search) ||
        (eq.fabricante || '').toLowerCase().includes(search)

      if (!matchesSearch) return false
      if (statusFilter !== 'todos' && eq.status !== statusFilter) return false
      if (tipoFilter !== 'todos' && eq.tipo !== tipoFilter) return false
      if (criticidadeFilter !== 'todos' && eq.criticidade !== criticidadeFilter) return false
      if (sensoresFilter === 'sim' && !eq.sensores) return false
      if (sensoresFilter === 'nao' && eq.sensores) return false

      return true
    })
  }, [equipamentos, searchTerm, statusFilter, tipoFilter, criticidadeFilter, sensoresFilter])

  const handleOpenCreate = () => {
    setEditingEquip(null)
    setFormNome('')
    setFormTag('')
    setFormDescricao('')
    setFormCodigoEquip('')
    setFormCodigoMis('')
    setFormFamiliaCodigo('')
    setFormFamiliaDescricao('')
    setFormSensores(false)
    setFormResponsavel('')
    setFormSetor('')
    setFormTipo('Mecânico')
    setFormStatus('Operacional')
    setFormCriticidade('C')
    setFormFabricante('')
    setFormModelo('')
    setFormObservacoes('')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (eq: Equipamento) => {
    setEditingEquip(eq)
    setFormNome(eq.nome || '')
    setFormTag(eq.tag || '')
    setFormDescricao(eq.descricao || '')
    setFormCodigoEquip(eq.codigo_equipamento || '')
    setFormCodigoMis(eq.codigo_mis || '')
    setFormFamiliaCodigo(eq.familia_codigo || '')
    setFormFamiliaDescricao(eq.familia_descricao || '')
    setFormSensores(Boolean(eq.sensores))
    setFormResponsavel(eq.responsavel || '')
    setFormSetor(eq.setor || '')
    setFormTipo(eq.tipo || 'Mecânico')
    setFormStatus(eq.status || 'Operacional')
    setFormCriticidade(eq.criticidade || 'C')
    setFormFabricante(eq.fabricante || '')
    setFormModelo(eq.modelo || '')
    setFormObservacoes(eq.observacoes || '')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formTag.trim()) {
      setFormError('A TAG do equipamento é obrigatória.')
      return
    }

    setSaving(true)
    try {
      const payload: Partial<Equipamento> = {
        tag: formTag.trim(),
        nome: formNome.trim() || formDescricao.trim() || formTag.trim(),
        descricao: formDescricao.trim() || undefined,
        codigo_equipamento: formCodigoEquip.trim() || undefined,
        codigo_mis: formCodigoMis.trim() || undefined,
        familia_codigo: formFamiliaCodigo.trim() || undefined,
        familia_descricao: formFamiliaDescricao.trim() || undefined,
        sensores: formSensores,
        responsavel: formResponsavel.trim() || undefined,
        setor: formSetor.trim() || formFamiliaDescricao.trim() || 'Geral',
        tipo: formTipo,
        status: formStatus,
        criticidade: formCriticidade,
        fabricante: formFabricante.trim() || undefined,
        modelo: formModelo.trim() || undefined,
        observacoes: formObservacoes.trim() || undefined,
      }

      if (editingEquip) {
        await equipamentosService.update(editingEquip.id, payload)
      } else {
        await equipamentosService.create(payload)
      }

      setIsModalOpen(false)
      onRefresh()
    } catch {
      setFormError('Erro ao gravar equipamento. Verifique se a TAG já está cadastrada.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (eq: Equipamento) => {
    if (window.confirm(`Deseja realmente excluir o equipamento ${eq.tag} (${eq.nome})?`)) {
      try {
        await equipamentosService.delete(eq.id)
        onRefresh()
      } catch {
        alert('Não foi possível excluir o equipamento. Verifique se há OS vinculadas a ele.')
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-[#1E3A5F] tracking-tight">
            Gestão de Equipamentos da Planta
          </h2>
          <p className="text-xs text-[#718096] mt-0.5">
            Cadastro de ativos industriais, monitoramento de saúde operacional e criticidade.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#1E3A5F] text-white hover:bg-[#16304F] rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <Layers className="w-4 h-4 text-[#2A9D8F]" />
              <span>Importar planilha (XLSX)</span>
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#2A9D8F] text-white hover:bg-[#238276] rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Equipamento</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por TAG, Descrição MIS, Cód. Equipamento, Família ou Responsável..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F] focus:bg-white"
          />
        </div>

        <select
          value={criticidadeFilter}
          onChange={(e) => setCriticidadeFilter(e.target.value)}
          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-[#1E3A5F]"
        >
          <option value="todos">Todas Criticidades</option>
          <option value="A">Criticidade A</option>
          <option value="B">Criticidade B</option>
          <option value="C">Criticidade C</option>
        </select>

        <select
          value={sensoresFilter}
          onChange={(e) => setSensoresFilter(e.target.value)}
          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-[#1E3A5F]"
        >
          <option value="todos">Sensores (Todos)</option>
          <option value="sim">Com Sensores (Sim)</option>
          <option value="nao">Sem Sensores (Não)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-[#1E3A5F]"
        >
          <option value="todos">Todos os Status</option>
          <option value="Operacional">Operacional</option>
          <option value="Alerta">Alerta</option>
          <option value="Em Manutenção">Em Manutenção</option>
          <option value="Parado">Parado</option>
        </select>
      </div>

      {/* Equipment Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0D1B2A] text-white uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">TAG / Descrição do MIS</th>
                <th className="px-4 py-3 font-semibold">Códigos & Família</th>
                <th className="px-4 py-3 font-semibold">Criticidade & Sensores</th>
                <th className="px-4 py-3 font-semibold">Responsável / Setor</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEquipamentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Nenhum equipamento localizado.
                  </td>
                </tr>
              ) : (
                filteredEquipamentos.map((eq) => (
                  <tr key={eq.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-[#1E3A5F] text-[11px] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#2A9D8F]" />
                        <span>{eq.tag}</span>
                      </div>
                      <div className="font-semibold text-gray-900 mt-0.5">
                        {eq.descricao || eq.nome || eq.tag}
                      </div>
                      {eq.observacoes && (
                        <div className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                          {eq.observacoes}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-gray-800">
                        {eq.codigo_equipamento && (
                          <span className="font-mono font-semibold text-xs block text-slate-800">
                            Equip: {eq.codigo_equipamento}
                          </span>
                        )}
                        {eq.codigo_mis && (
                          <span className="font-mono text-[11px] text-slate-600 block">
                            MIS: {eq.codigo_mis}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 block">
                          {eq.familia_descricao || eq.familia_codigo ? (
                            <>Família: {eq.familia_descricao || eq.familia_codigo}</>
                          ) : (
                            eq.tipo || 'Geral'
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            eq.criticidade === 'A'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : eq.criticidade === 'B'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}
                        >
                          Criticidade {eq.criticidade || 'C'}
                        </span>

                        {eq.sensores ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Com Sensores
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Sem sensores</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800 block">
                        {eq.responsavel || '—'}
                      </span>
                      <span className="text-[11px] text-gray-500">{eq.setor || 'Geral'}</span>
                    </td>

                    <td className="px-4 py-3">
                      {eq.status === 'Operacional' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Operacional</span>
                        </span>
                      ) : eq.status === 'Alerta' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>Alerta Preditivo</span>
                        </span>
                      ) : eq.status === 'Em Manutenção' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Activity className="w-3 h-3 text-blue-600" />
                          <span>Em Manutenção</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <Radio className="w-3 h-3 text-red-600" />
                          <span>Parado</span>
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(eq)}
                          className="p-1.5 text-gray-500 hover:text-[#1E3A5F] hover:bg-gray-100 rounded transition-colors"
                          title="Editar Equipamento"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(eq)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir Equipamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 bg-[#0D1B2A] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-tight text-white">
                  {editingEquip ? `Editar Ativo: ${editingEquip.tag}` : 'Novo Equipamento'}
                </h3>
                <p className="text-[11px] text-[#A0AEC0]">
                  Informações técnicas e localização na planta.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">TAG (Código) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex.: BOM-0101"
                    value={formTag}
                    onChange={(e) => setFormTag(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F] font-mono font-bold uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Status Operacional</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as EquipamentoStatus)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="Operacional">Operacional</option>
                    <option value="Alerta">Alerta</option>
                    <option value="Em Manutenção">Em Manutenção</option>
                    <option value="Parado">Parado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Descrição do MIS / Nome
                </label>
                <input
                  type="text"
                  placeholder="ex.: Motor Acionamento / Redutor / Bomba"
                  value={formDescricao}
                  onChange={(e) => {
                    setFormDescricao(e.target.value)
                    if (!formNome) setFormNome(e.target.value)
                  }}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Cód. Equipamento</label>
                  <input
                    type="text"
                    placeholder="ex.: EQ-01"
                    value={formCodigoEquip}
                    onChange={(e) => setFormCodigoEquip(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Código do MIS</label>
                  <input
                    type="text"
                    placeholder="ex.: MC-01"
                    value={formCodigoMis}
                    onChange={(e) => setFormCodigoMis(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Cód. Família</label>
                  <input
                    type="text"
                    placeholder="ex.: MT"
                    value={formFamiliaCodigo}
                    onChange={(e) => setFormFamiliaCodigo(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Descrição Família</label>
                  <input
                    type="text"
                    placeholder="ex.: Motores Elétricos"
                    value={formFamiliaDescricao}
                    onChange={(e) => setFormFamiliaDescricao(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Responsável</label>
                  <input
                    type="text"
                    placeholder="ex.: Nome do Responsável"
                    value={formResponsavel}
                    onChange={(e) => setFormResponsavel(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1 flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={formSensores}
                      onChange={(e) => setFormSensores(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2A9D8F] focus:ring-[#2A9D8F]"
                    />
                    <span>Equipamento possui Sensores Preditivos</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Setor / Área *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex.: Moenda / Caldeiras"
                    value={formSetor}
                    onChange={(e) => setFormSetor(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Tipo</label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as EquipamentoTipo)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="Mecânico">Mecânico</option>
                    <option value="Elétrico">Elétrico</option>
                    <option value="Hidráulico">Hidráulico</option>
                    <option value="Pneumático">Pneumático</option>
                    <option value="Instrumentação">Instrumentação</option>
                    <option value="Automação">Automação</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Criticidade</label>
                  <select
                    value={formCriticidade}
                    onChange={(e) => setFormCriticidade(e.target.value as EquipamentoCriticidade)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="A">A (Vital / Parada de Fábrica)</option>
                    <option value="B">B (Importante / Restrição)</option>
                    <option value="C">C (Secundário)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Fabricante</label>
                  <input
                    type="text"
                    placeholder="ex.: WEG, KSB, Siemens"
                    value={formFabricante}
                    onChange={(e) => setFormFabricante(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Modelo</label>
                  <input
                    type="text"
                    placeholder="ex.: SST-300"
                    value={formModelo}
                    onChange={(e) => setFormModelo(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Observações Técnicas / Sensores Preditivos
                </label>
                <textarea
                  rows={2}
                  placeholder="Sensores instalados, histórico de falhas, pontos de medição..."
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-[#1E3A5F] hover:bg-[#16304F] text-white rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Gravando...' : editingEquip ? 'Atualizar Ativo' : 'Salvar Ativo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
