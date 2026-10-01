import React, { useState, useMemo } from 'react'
import {
  Users2,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  AlertCircle,
  Briefcase,
  UserCheck,
  Clock,
} from 'lucide-react'
import { Equipe, EquipeEspecialidade } from '@/types/pcm'
import { equipesService } from '@/services/equipes'

interface EquipesManagerProps {
  equipes: Equipe[]
  onRefresh: () => void
}

export default function EquipesManager({ equipes, onRefresh }: EquipesManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [especialidadeFilter, setEspecialidadeFilter] = useState('todas')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null)

  // Form Fields
  const [formNome, setFormNome] = useState('')
  const [formEspecialidade, setFormEspecialidade] = useState<EquipeEspecialidade>('Preditiva')
  const [formLider, setFormLider] = useState('')
  const [formIntegrantes, setFormIntegrantes] = useState('')
  const [formTurno, setFormTurno] = useState('Turno A (Manhã)')
  const [formDescricao, setFormDescricao] = useState('')

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const filteredEquipes = useMemo(() => {
    return equipes.filter((eqp) => {
      const search = searchTerm.toLowerCase()
      const matchesSearch =
        eqp.nome.toLowerCase().includes(search) ||
        (eqp.lider || '').toLowerCase().includes(search) ||
        (eqp.integrantes || '').toLowerCase().includes(search)

      if (!matchesSearch) return false
      if (especialidadeFilter !== 'todas' && eqp.especialidade !== especialidadeFilter) return false

      return true
    })
  }, [equipes, searchTerm, especialidadeFilter])

  const handleOpenCreate = () => {
    setEditingEquipe(null)
    setFormNome('')
    setFormEspecialidade('Preditiva')
    setFormLider('')
    setFormIntegrantes('')
    setFormTurno('Turno A (Manhã)')
    setFormDescricao('')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (eqp: Equipe) => {
    setEditingEquipe(eqp)
    setFormNome(eqp.nome)
    setFormEspecialidade(eqp.especialidade)
    setFormLider(eqp.lider || '')
    setFormIntegrantes(eqp.integrantes || '')
    setFormTurno(eqp.turno || 'Turno A (Manhã)')
    setFormDescricao(eqp.descricao || '')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formNome.trim()) {
      setFormError('O nome da equipe é obrigatório.')
      return
    }

    setSaving(true)
    try {
      const payload: Partial<Equipe> = {
        nome: formNome.trim(),
        especialidade: formEspecialidade,
        lider: formLider.trim() || undefined,
        integrantes: formIntegrantes.trim() || undefined,
        turno: formTurno || undefined,
        descricao: formDescricao.trim() || undefined,
      }

      if (editingEquipe) {
        await equipesService.update(editingEquipe.id, payload)
      } else {
        await equipesService.create(payload)
      }

      setIsModalOpen(false)
      onRefresh()
    } catch {
      setFormError('Erro ao gravar equipe.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (eqp: Equipe) => {
    if (window.confirm(`Deseja realmente remover a equipe ${eqp.nome}?`)) {
      try {
        await equipesService.delete(eqp.id)
        onRefresh()
      } catch {
        alert('Não foi possível excluir a equipe. Verifique se há ordens vinculadas.')
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-[#1E3A5F] tracking-tight">
            Gestão de Equipes Técnicas & Especialistas
          </h2>
          <p className="text-xs text-[#718096] mt-0.5">
            Organização de turnos, líderes técnicos e especialidades operacionais.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#2A9D8F] text-white hover:bg-[#238276] rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Equipe</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome da equipe, líder técnico ou integrante..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F] focus:bg-white"
          />
        </div>

        <select
          value={especialidadeFilter}
          onChange={(e) => setEspecialidadeFilter(e.target.value)}
          className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-[#1E3A5F]"
        >
          <option value="todas">Todas as Especialidades</option>
          <option value="Preditiva">Preditiva</option>
          <option value="Mecânica">Mecânica</option>
          <option value="Elétrica">Elétrica</option>
          <option value="Instrumentação">Instrumentação</option>
          <option value="Lubrificação">Lubrificação</option>
          <option value="Caldeiraria">Caldeiraria</option>
          <option value="Geral">Geral</option>
        </select>
      </div>

      {/* Grid of Teams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEquipes.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200">
            Nenhuma equipe técnica encontrada.
          </div>
        ) : (
          filteredEquipes.map((eqp) => (
            <div
              key={eqp.id}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between hover:border-gray-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#1E3A5F]/10 text-[#1E3A5F] flex items-center justify-center font-bold">
                      <Users2 className="w-5 h-5 text-[#2A9D8F]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1B263B] leading-tight">{eqp.nome}</h3>
                      <span className="text-[11px] font-semibold text-[#2A9D8F] bg-[#2A9D8F]/10 px-2 py-0.5 rounded-sm inline-block mt-0.5">
                        {eqp.especialidade}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(eqp)}
                      className="p-1.5 text-gray-400 hover:text-[#1E3A5F] hover:bg-gray-100 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(eqp)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  {eqp.lider && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <UserCheck className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>
                        <strong className="text-gray-900">Líder:</strong> {eqp.lider}
                      </span>
                    </div>
                  )}

                  {eqp.turno && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      <span>
                        <strong className="text-gray-900">Turno:</strong> {eqp.turno}
                      </span>
                    </div>
                  )}

                  {eqp.integrantes && (
                    <div className="pt-1">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        Integrantes da Equipe
                      </p>
                      <p className="text-xs text-gray-700 mt-0.5 leading-relaxed bg-gray-50 p-2 rounded border border-gray-100">
                        {eqp.integrantes}
                      </p>
                    </div>
                  )}

                  {eqp.descricao && (
                    <p className="text-[11px] text-gray-500 italic mt-2">{eqp.descricao}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Create / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 sm:p-5 bg-[#0D1B2A] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-tight text-white">
                  {editingEquipe ? `Editar Equipe: ${editingEquipe.nome}` : 'Nova Equipe Técnica'}
                </h3>
                <p className="text-[11px] text-[#A0AEC0]">
                  Dados da equipe e técnicos vinculados às ordens de manutenção.
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

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Nome da Equipe *</label>
                <input
                  type="text"
                  required
                  placeholder="ex.: Equipe Preditiva & Diagnóstico"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Especialidade</label>
                  <select
                    value={formEspecialidade}
                    onChange={(e) => setFormEspecialidade(e.target.value as EquipeEspecialidade)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="Preditiva">Preditiva</option>
                    <option value="Mecânica">Mecânica</option>
                    <option value="Elétrica">Elétrica</option>
                    <option value="Instrumentação">Instrumentação</option>
                    <option value="Lubrificação">Lubrificação</option>
                    <option value="Caldeiraria">Caldeiraria</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Turno de Trabalho</label>
                  <select
                    value={formTurno}
                    onChange={(e) => setFormTurno(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                  >
                    <option value="Turno A (Manhã)">Turno A (Manhã)</option>
                    <option value="Turno B (Tarde)">Turno B (Tarde)</option>
                    <option value="Turno C (Noite)">Turno C (Noite)</option>
                    <option value="Administrativo">Administrativo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Líder Técnico / Responsável
                </label>
                <input
                  type="text"
                  placeholder="ex.: Eng. Carlos Eduardo"
                  value={formLider}
                  onChange={(e) => setFormLider(e.target.value)}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Integrantes / Técnicos (separados por vírgula)
                </label>
                <textarea
                  rows={2}
                  placeholder="ex.: Carlos Eduardo, Marcos Rocha, Aline Souza, Felipe Santos"
                  value={formIntegrantes}
                  onChange={(e) => setFormIntegrantes(e.target.value)}
                  className="w-full text-xs p-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-[#1E3A5F]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Descrição / Escopo de Atuação
                </label>
                <textarea
                  rows={2}
                  placeholder="Rotas de inspeção, análise espectral, ensaios não destrutivos..."
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
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
                  {saving ? 'Gravando...' : editingEquipe ? 'Atualizar Equipe' : 'Salvar Equipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
