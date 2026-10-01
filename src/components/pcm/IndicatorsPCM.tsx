import React, { useMemo } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  Layers,
  Wrench,
  Users2,
  Calendar,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart as PieIcon,
  ShieldCheck,
} from 'lucide-react'
import { OrdemServico, Equipamento, Equipe } from '@/types/pcm'

interface IndicatorsPCMProps {
  ordens: OrdemServico[]
  equipamentos: Equipamento[]
  equipes: Equipe[]
  onNavigateToOS: (filter?: string) => void
}

export default function IndicatorsPCM({
  ordens,
  equipamentos,
  equipes,
  onNavigateToOS,
}: IndicatorsPCMProps) {
  // KPI Calculations
  const stats = useMemo(() => {
    const total = ordens.length
    const abertas = ordens.filter((o) => o.status === 'aberta').length
    const emAndamento = ordens.filter((o) => o.status === 'em_andamento').length
    const fechadas = ordens.filter((o) => o.status === 'fechada').length
    const canceladas = ordens.filter((o) => o.status === 'cancelada').length
    const abertasTotal = abertas + emAndamento

    const taxaConclusao = total > 0 ? Math.round((fechadas / total) * 100) : 0

    // Por Categoria
    const categoriaCount: Record<string, { total: number; abertas: number; fechadas: number }> = {}
    ordens.forEach((o) => {
      const cat = o.categoria || 'Geral'
      if (!categoriaCount[cat]) {
        categoriaCount[cat] = { total: 0, abertas: 0, fechadas: 0 }
      }
      categoriaCount[cat].total++
      if (o.status === 'aberta' || o.status === 'em_andamento') {
        categoriaCount[cat].abertas++
      } else if (o.status === 'fechada') {
        categoriaCount[cat].fechadas++
      }
    })

    // Por Modalidade
    const modalidadeCount: Record<string, { total: number; abertas: number; fechadas: number }> = {}
    ordens.forEach((o) => {
      const mod = o.modalidade || 'Preventiva'
      if (!modalidadeCount[mod]) {
        modalidadeCount[mod] = { total: 0, abertas: 0, fechadas: 0 }
      }
      modalidadeCount[mod].total++
      if (o.status === 'aberta' || o.status === 'em_andamento') {
        modalidadeCount[mod].abertas++
      } else if (o.status === 'fechada') {
        modalidadeCount[mod].fechadas++
      }
    })

    // Por Equipamento
    const equipCount: Record<
      string,
      { nome: string; tag: string; total: number; abertas: number }
    > = {}
    ordens.forEach((o) => {
      const eqId = o.equipamento_id || 'sem_eq'
      const eq = equipamentos.find((e) => e.id === eqId) || o.expand?.equipamento_id
      const tag = eq ? eq.tag : 'Sem Tag'
      const nome = eq ? eq.nome : 'Equipamento Geral'
      if (!equipCount[eqId]) {
        equipCount[eqId] = { nome, tag, total: 0, abertas: 0 }
      }
      equipCount[eqId].total++
      if (o.status === 'aberta' || o.status === 'em_andamento') {
        equipCount[eqId].abertas++
      }
    })

    // Por Equipe
    const equipeCount: Record<
      string,
      { nome: string; especialidade: string; total: number; abertas: number }
    > = {}
    ordens.forEach((o) => {
      const eqpId = o.equipe_id || 'sem_eqp'
      const eqp = equipes.find((e) => e.id === eqpId) || o.expand?.equipe_id
      const nome = eqp ? eqp.nome : 'Geral / Terceirizado'
      const esp = eqp ? eqp.especialidade : 'Geral'
      if (!equipeCount[eqpId]) {
        equipeCount[eqpId] = { nome, especialidade: esp, total: 0, abertas: 0 }
      }
      equipeCount[eqpId].total++
      if (o.status === 'aberta' || o.status === 'em_andamento') {
        equipeCount[eqpId].abertas++
      }
    })

    // Status dos Equipamentos da Planta
    const totalEquips = equipamentos.length
    const equipOperacionais = equipamentos.filter((e) => e.status === 'Operacional').length
    const equipAlerta = equipamentos.filter((e) => e.status === 'Alerta').length
    const equipManutencao = equipamentos.filter((e) => e.status === 'Em Manutenção').length
    const equipParados = equipamentos.filter((e) => e.status === 'Parado').length
    const disponibilidadePlanta =
      totalEquips > 0 ? Math.round((equipOperacionais / totalEquips) * 100) : 100

    return {
      total,
      abertas,
      emAndamento,
      fechadas,
      canceladas,
      abertasTotal,
      taxaConclusao,
      categoriaCount,
      modalidadeCount,
      equipCount,
      equipeCount,
      totalEquips,
      equipOperacionais,
      equipAlerta,
      equipManutencao,
      equipParados,
      disponibilidadePlanta,
    }
  }, [ordens, equipamentos, equipes])

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-[#1E3A5F] tracking-tight">
            Dashboard de Indicadores PCM & Planta Industrial
          </h2>
          <p className="text-xs text-[#718096] mt-0.5">
            Monitoramento em tempo real do volume de ordens de serviço, saúde dos ativos e alocação
            de equipes técnicas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToOS()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#1E3A5F] text-white hover:bg-[#16304F] rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Ver Todas as OS</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: OS Abertas & Em Andamento */}
        <div
          onClick={() => onNavigateToOS('aberta')}
          className="bg-white p-5 rounded-xl border border-gray-200 hover:border-amber-400/80 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              OS Pendentes (Abertas)
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1B263B]">{stats.abertasTotal}</span>
            <span className="text-xs text-amber-600 font-medium">
              ({stats.abertas} abertas / {stats.emAndamento} em andamento)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">Aguardando ou em execução na planta</div>
        </div>

        {/* Card 2: OS Fechadas */}
        <div
          onClick={() => onNavigateToOS('fechada')}
          className="bg-white p-5 rounded-xl border border-gray-200 hover:border-emerald-400/80 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              OS Fechadas (Concluídas)
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1B263B]">{stats.fechadas}</span>
            <span className="text-xs text-emerald-600 font-medium">
              {stats.taxaConclusao}% de resolução
            </span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">Manutenções finalizadas e validadas</div>
        </div>

        {/* Card 3: Disponibilidade dos Ativos */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Disponibilidade da Planta
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#2A9D8F]/10 text-[#2A9D8F] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#1B263B]">
              {stats.disponibilidadePlanta}%
            </span>
            <span className="text-xs text-[#2A9D8F] font-medium">
              {stats.equipOperacionais} de {stats.totalEquips} operacionais
            </span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            {stats.equipAlerta + stats.equipManutencao + stats.equipParados} equipamentos com
            restrição
          </div>
        </div>

        {/* Card 4: Foco Preditivo */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Atuação Preditiva & Preventiva
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#1E3A5F]/10 text-[#1E3A5F] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {(() => {
              const preditivas =
                (stats.modalidadeCount['Preditiva']?.total || 0) +
                (stats.modalidadeCount['Preventiva']?.total || 0)
              const perc = stats.total > 0 ? Math.round((preditivas / stats.total) * 100) : 0
              return (
                <>
                  <span className="text-2xl font-bold text-[#1B263B]">{perc}%</span>
                  <span className="text-xs text-[#1E3A5F] font-medium">
                    {preditivas} intervenções pró-ativas
                  </span>
                </>
              )
            })()}
          </div>
          <div className="mt-2 text-[11px] text-gray-400">Redução de paradas não programadas</div>
        </div>
      </div>

      {/* Row: Status dos Equipamentos da Planta */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#1E3A5F]" />
            <h3 className="text-sm font-bold text-[#1E3A5F]">
              Estado Operacional da Planta de Equipamentos
            </h3>
          </div>
          <div className="text-xs text-gray-500">
            Total monitorado: <strong className="text-[#1B263B]">{stats.totalEquips} ativos</strong>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase">Operacional</div>
            <div className="text-xl font-bold text-emerald-700 mt-1">{stats.equipOperacionais}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Sem anomalias registradas</div>
          </div>

          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
            <div className="text-[11px] font-semibold text-amber-800 uppercase">
              Alerta Preditivo
            </div>
            <div className="text-xl font-bold text-amber-700 mt-1">{stats.equipAlerta}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Vibração / Termografia sob foco</div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
            <div className="text-[11px] font-semibold text-blue-800 uppercase">Em Manutenção</div>
            <div className="text-xl font-bold text-blue-700 mt-1">{stats.equipManutencao}</div>
            <div className="text-[10px] text-blue-600 mt-0.5">Equipe atuando em campo</div>
          </div>

          <div className="p-3 rounded-lg bg-red-50/70 border border-red-200">
            <div className="text-[11px] font-semibold text-red-800 uppercase">
              Parado / Indisponível
            </div>
            <div className="text-xl font-bold text-red-700 mt-1">{stats.equipParados}</div>
            <div className="text-[10px] text-red-600 mt-0.5">Impacto no fluxo produtivo</div>
          </div>
        </div>
      </div>

      {/* Row: Breakdown Charts by Modalidade and Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Modalidade de Manutenção */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#2A9D8F]" />
                <h3 className="text-sm font-bold text-[#1E3A5F]">
                  Ordens de Serviço por Modalidade
                </h3>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">Abertas vs Fechadas</span>
            </div>

            <div className="mt-4 space-y-3.5">
              {Object.entries(stats.modalidadeCount).map(([modalidade, item]) => {
                const total = stats.total > 0 ? stats.total : 1
                const percent = Math.round((item.total / total) * 100)
                const abertaPercent = item.total > 0 ? (item.abertas / item.total) * 100 : 0
                const fechadaPercent = item.total > 0 ? (item.fechadas / item.total) * 100 : 0

                return (
                  <div key={modalidade} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1B263B] flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            modalidade === 'Preditiva'
                              ? 'bg-[#2A9D8F]'
                              : modalidade === 'Preventiva'
                                ? 'bg-blue-600'
                                : modalidade.includes('Corretiva')
                                  ? 'bg-amber-500'
                                  : 'bg-purple-600'
                          }`}
                        />
                        {modalidade}
                      </span>
                      <div className="flex items-center gap-2 text-gray-600 text-[11px]">
                        <span className="text-amber-600 font-medium">{item.abertas} abertas</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-medium">
                          {item.fechadas} fechadas
                        </span>
                        <span className="font-bold text-[#1B263B]">({item.total} total)</span>
                      </div>
                    </div>

                    {/* Stacked bar */}
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(item.abertas / total) * 100}%` }}
                        className="bg-amber-400 hover:bg-amber-500 transition-all"
                        title={`${item.abertas} abertas`}
                      />
                      <div
                        style={{ width: `${(item.fechadas / total) * 100}%` }}
                        className="bg-emerald-500 hover:bg-emerald-600 transition-all"
                        title={`${item.fechadas} fechadas`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Aberta / Em
                Andamento
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Fechada /
                Concluída
              </span>
            </div>
            <span>Volume Total: {stats.total} OS</span>
          </div>
        </div>

        {/* Distribuição por Categoria Técnica */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1E3A5F]" />
                <h3 className="text-sm font-bold text-[#1E3A5F]">
                  Ordens de Serviço por Categoria Técnica
                </h3>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">Especialidade</span>
            </div>

            <div className="mt-4 space-y-3.5">
              {Object.entries(stats.categoriaCount).map(([categoria, item]) => {
                const total = stats.total > 0 ? stats.total : 1
                const percent = Math.round((item.total / total) * 100)

                return (
                  <div key={categoria} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#1B263B]">{categoria}</span>
                      <div className="flex items-center gap-2 text-gray-600 text-[11px]">
                        <span className="text-amber-600 font-medium">{item.abertas} abertas</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-medium">
                          {item.fechadas} fechadas
                        </span>
                        <span className="font-bold text-[#1B263B]">({item.total})</span>
                      </div>
                    </div>

                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${(item.abertas / total) * 100}%` }}
                        className="bg-amber-400"
                        title={`${item.abertas} abertas`}
                      />
                      <div
                        style={{ width: `${(item.fechadas / total) * 100}%` }}
                        className="bg-emerald-500"
                        title={`${item.fechadas} fechadas`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Mecânica e Elétrica representam a maior demanda</span>
            <button
              onClick={() => onNavigateToOS()}
              className="text-[#1E3A5F] hover:underline font-medium cursor-pointer"
            >
              Filtrar por categoria &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Row: Vínculo de Ordens de Serviço a Equipamentos e Equipes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Equipamentos com mais OS */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#1E3A5F]" />
              <h3 className="text-sm font-bold text-[#1E3A5F]">OS Vinculadas por Equipamento</h3>
            </div>
            <span className="text-[11px] text-gray-500">Criticidade</span>
          </div>

          <div className="mt-4 divide-y divide-gray-100">
            {Object.values(stats.equipCount).length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">
                Nenhum equipamento vinculado a ordens.
              </p>
            ) : (
              Object.values(stats.equipCount)
                .sort((a, b) => b.total - a.total)
                .slice(0, 5)
                .map((eq, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#1B263B] block leading-tight">
                        {eq.nome}
                      </span>
                      <span className="text-[11px] text-gray-500 font-mono">TAG: {eq.tag}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {eq.abertas > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {eq.abertas} aberta(s)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          100% resolvidas
                        </span>
                      )}
                      <span className="text-xs font-bold text-gray-700 w-12 text-right">
                        {eq.total} OS
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Carga de Ordens por Equipe Técnica */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-[#2A9D8F]" />
              <h3 className="text-sm font-bold text-[#1E3A5F]">
                OS Vinculadas por Equipe Responsável
              </h3>
            </div>
            <span className="text-[11px] text-gray-500">Carga de Trabalho</span>
          </div>

          <div className="mt-4 divide-y divide-gray-100">
            {Object.values(stats.equipeCount).length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">
                Nenhuma equipe vinculada a ordens.
              </p>
            ) : (
              Object.values(stats.equipeCount)
                .sort((a, b) => b.total - a.total)
                .map((eqp, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#1B263B] block leading-tight">
                        {eqp.nome}
                      </span>
                      <span className="text-[11px] text-gray-500">Área: {eqp.especialidade}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {eqp.abertas} em fila
                      </span>
                      <span className="text-xs font-bold text-gray-700 w-12 text-right">
                        {eqp.total} total
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
