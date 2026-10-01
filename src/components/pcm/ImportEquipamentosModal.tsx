import React, { useState, useRef, useMemo } from 'react'
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  PlusCircle,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react'
import { Equipamento } from '@/types/pcm'
import { parseEquipamentosFile, ParsedSheetResult } from '@/lib/assetImport/parseEquipamentosFile'
import { equipamentosService, ImportProgress } from '@/services/equipamentos'

interface ImportEquipamentosModalProps {
  isOpen: boolean
  onClose: () => void
  equipamentosExistentes: Equipamento[]
  onSuccess: () => void
}

export default function ImportEquipamentosModal({
  isOpen,
  onClose,
  equipamentosExistentes,
  onSuccess,
}: ImportEquipamentosModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseResult, setParseResult] = useState<ParsedSheetResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  // Modo selecionado
  const [importMode, setImportMode] = useState<'replace' | 'upsert'>('replace')

  // Estado de execução do import
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [importDone, setImportDone] = useState(false)
  const [finalResult, setFinalResult] = useState<{
    successCount: number
    errorCount: number
    errors: Array<{ rowNumber?: number; tag?: string; message: string }>
  } | null>(null)

  // OS vinculadas
  const [linkedOSCount, setLinkedOSCount] = useState<number>(0)
  const [checkingOS, setCheckingOS] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Resumo de TAGs novas vs existentes
  const comparison = useMemo(() => {
    if (!parseResult) {
      return { totalNovos: 0, totalExistentes: 0, tagsNovas: 0, tagsExistentes: 0 }
    }

    const existingTags = new Set(
      equipamentosExistentes.map((eq) => (eq.tag || '').trim().toUpperCase()),
    )

    let tagsNovas = 0
    let tagsExistentes = 0

    parseResult.items.forEach((item) => {
      const tagNorm = (item.tag || '').trim().toUpperCase()
      if (existingTags.has(tagNorm)) {
        tagsExistentes++
      } else {
        tagsNovas++
      }
    })

    return {
      totalNovos: parseResult.validRowCount,
      totalExistentes: equipamentosExistentes.length,
      tagsNovas,
      tagsExistentes,
    }
  }, [parseResult, equipamentosExistentes])

  // Checar OS vinculadas ao abrir ou alterar modo
  const checkLinkedOS = async () => {
    setCheckingOS(true)
    try {
      const res = await equipamentosService.getLinkedOSCount()
      setLinkedOSCount(res.totalOSWithEquip)
    } finally {
      setCheckingOS(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setParseError(null)
    setParseResult(null)
    setImportDone(false)
    setFinalResult(null)
    setParsing(true)

    try {
      const res = await parseEquipamentosFile(selected)
      setParseResult(res)
      await checkLinkedOS()
    } catch (err: any) {
      setParseError(err.message || 'Falha ao processar o arquivo selecionado.')
    } finally {
      setParsing(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setParseResult(null)
    setParseError(null)
    setImporting(false)
    setProgress(null)
    setImportDone(false)
    setFinalResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleExecuteImport = async () => {
    if (!parseResult || parseResult.items.length === 0) return

    if (
      importMode === 'replace' &&
      linkedOSCount > 0 &&
      !window.confirm(
        `ATENÇÃO: Existem ${linkedOSCount} Ordens de Serviço vinculadas a equipamentos atuais. ` +
          `Ao substituir a base, essas OS serão desvinculadas com segurança (equipamento_id = null) ` +
          `para não quebrar o banco de dados. Deseja continuar?`,
      )
    ) {
      return
    }

    setImporting(true)
    setProgress({
      current: 0,
      total: parseResult.items.length,
      stage: 'preparing',
      statusText: 'Iniciando importação...',
      successCount: 0,
      errorCount: 0,
      errors: [],
    })

    try {
      const result = await equipamentosService.importBatch(parseResult.items, importMode, (p) =>
        setProgress({ ...p }),
      )
      setFinalResult(result)
      setImportDone(true)
      onSuccess()
    } catch (err: any) {
      setParseError(err?.message || 'Ocorreu um erro durante a gravação no banco de dados.')
    } finally {
      setImporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-fade-in border border-gray-100">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0D1B2A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2A9D8F]/20 text-[#2A9D8F] flex items-center justify-center border border-[#2A9D8F]/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-white">
                Importação de Equipamentos via Planilha (XLSX / CSV)
              </h3>
              <p className="text-[11px] text-slate-300">
                Substitua a base de testes pela base oficial completa ou atualize por TAG.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* File Picker if not chosen */}
          {!file && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-[#2A9D8F] bg-gray-50/70 hover:bg-[#2A9D8F]/5 rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#1E3A5F]">
                  Clique para selecionar a planilha (.xlsx, .xls ou .csv)
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Compatível com planilhas de equipamentos e montagem industrial (ex.: aba
                  &quot;Base Montagem&quot; ou primeira aba).
                </p>
                <p className="text-[11px] text-gray-400 mt-3">
                  Colunas mapeadas: TAG, Descrição do MIS, Código Equipamento, Código do MIS, Código
                  da Família, Descrição da Família, Criticidade, Sensores, Responsável.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Importação segura e em tempo de execução:</strong> os registros da sua
                  planilha são lidos no navegador e gravados diretamente no banco de dados
                  PocketBase / Skip Cloud, alimentando instantaneamente o painel e os gráficos.
                </div>
              </div>
            </div>
          )}

          {/* Parsing State */}
          {parsing && (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#2A9D8F] animate-spin" />
              <p className="text-xs font-semibold text-gray-700">
                Lendo e validando colunas da planilha no navegador...
              </p>
              <p className="text-[11px] text-gray-400">
                Detectando aba &quot;Base Montagem&quot; e mapeando TAGs e atributos técnicos...
              </p>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Erro ao processar planilha</span>
              </div>
              <p>{parseError}</p>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-md font-semibold text-[11px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar outro arquivo
              </button>
            </div>
          )}

          {/* Parse Success & Pre-Import Summary */}
          {parseResult && !importing && !importDone && (
            <div className="space-y-4">
              {/* File Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {parseResult.fileName}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Aba: <strong className="text-slate-700">{parseResult.sheetName}</strong> •{' '}
                      {parseResult.validRowCount} equipamentos detectados
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-600 hover:text-slate-900 underline"
                >
                  Trocar arquivo
                </button>
              </div>

              {/* KPI Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white border border-gray-200 p-3 rounded-lg text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">
                    Linhas Válidas
                  </span>
                  <span className="text-lg font-bold text-[#1E3A5F]">
                    {parseResult.validRowCount}
                  </span>
                </div>
                <div className="bg-white border border-gray-200 p-3 rounded-lg text-center">
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">
                    Base Atual
                  </span>
                  <span className="text-lg font-bold text-gray-700">
                    {comparison.totalExistentes}
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
                  <span className="text-[10px] text-emerald-700 uppercase font-bold block">
                    TAGs Novas
                  </span>
                  <span className="text-lg font-bold text-emerald-800">{comparison.tagsNovas}</span>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
                  <span className="text-[10px] text-amber-700 uppercase font-bold block">
                    TAGs Coincidentes
                  </span>
                  <span className="text-lg font-bold text-amber-800">
                    {comparison.tagsExistentes}
                  </span>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-gray-800 block">
                  Escolha o modo de importação:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Mode 1: Replace */}
                  <div
                    onClick={() => setImportMode('replace')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      importMode === 'replace'
                        ? 'border-[#2A9D8F] bg-[#2A9D8F]/5 text-gray-900 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#1E3A5F] flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4 text-[#2A9D8F]" />
                          Substituir base atual
                        </span>
                        {importMode === 'replace' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2A9D8F]" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Apaga os equipamentos de teste atuais e grava exclusivamente a base nova
                        desta planilha. Recomendado para o pedido do usuário.
                      </p>
                    </div>

                    {linkedOSCount > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-amber-200/60 text-[10px] text-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          {linkedOSCount} OS vinculadas serão desvinculadas com segurança.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mode 2: Upsert */}
                  <div
                    onClick={() => setImportMode('upsert')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      importMode === 'upsert'
                        ? 'border-[#2A9D8F] bg-[#2A9D8F]/5 text-gray-900 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#1E3A5F] flex items-center gap-1.5">
                          <PlusCircle className="w-4 h-4 text-[#2A9D8F]" />
                          Atualizar / adicionar por TAG
                        </span>
                        {importMode === 'upsert' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2A9D8F]" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Upsert: atualiza os dados dos equipamentos com mesma TAG e cadastra as novas
                        TAGs sem apagar nenhum registro existente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pre-Import Sample Table */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-700 block">
                  Amostra dos primeiros 5 itens a importar:
                </span>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-2.5 py-1.5">TAG</th>
                        <th className="px-2.5 py-1.5">Descrição (MIS)</th>
                        <th className="px-2.5 py-1.5">Cód. Equip</th>
                        <th className="px-2.5 py-1.5">Família</th>
                        <th className="px-2.5 py-1.5">Crit.</th>
                        <th className="px-2.5 py-1.5">Sensores</th>
                        <th className="px-2.5 py-1.5">Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono text-[10px]">
                      {parseResult.items.slice(0, 5).map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-2.5 py-1.5 font-bold text-[#1E3A5F]">{item.tag}</td>
                          <td className="px-2.5 py-1.5 font-sans truncate max-w-[150px]">
                            {item.descricao || '—'}
                          </td>
                          <td className="px-2.5 py-1.5">{item.codigo_equipamento || '—'}</td>
                          <td className="px-2.5 py-1.5 font-sans">
                            {item.familia_descricao || item.familia_codigo || '—'}
                          </td>
                          <td className="px-2.5 py-1.5">
                            <span
                              className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                item.criticidade === 'A'
                                  ? 'bg-red-100 text-red-700'
                                  : item.criticidade === 'B'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {item.criticidade || 'C'}
                            </span>
                          </td>
                          <td className="px-2.5 py-1.5 font-sans">
                            {item.sensores ? (
                              <span className="text-emerald-700 font-bold">Sim</span>
                            ) : (
                              <span className="text-gray-400">Não</span>
                            )}
                          </td>
                          <td className="px-2.5 py-1.5 font-sans">{item.responsavel || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Execution Progress State */}
          {importing && progress && (
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#2A9D8F]/10 text-[#2A9D8F] flex items-center justify-center animate-pulse">
                <Database className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-[#1E3A5F]">{progress.statusText}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  Gravando em lotes assíncronos no Skip Cloud para manter a interface responsiva.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-[#2A9D8F] h-3 transition-all duration-300"
                  style={{
                    width: `${
                      progress.total > 0
                        ? Math.min(100, Math.round((progress.current / progress.total) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                <span>
                  {progress.current} de {progress.total} processados
                </span>
                <span className="text-emerald-700 font-bold">
                  {progress.successCount} gravados com sucesso
                </span>
              </div>
            </div>
          )}

          {/* Import Complete Summary */}
          {importDone && finalResult && (
            <div className="space-y-4 text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-[#1E3A5F]">Importação Finalizada!</h4>
                <p className="text-xs text-gray-600 mt-1">
                  Os dados foram persistidos no Skip Cloud e a lista de equipamentos foi atualizada.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">
                    Importados
                  </span>
                  <span className="text-xl font-bold text-emerald-800">
                    {finalResult.successCount}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">
                    Com Erro / Ignorados
                  </span>
                  <span className="text-xl font-bold text-slate-700">{finalResult.errorCount}</span>
                </div>
              </div>

              {finalResult.errors.length > 0 && (
                <div className="text-left bg-amber-50 border border-amber-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <span className="text-xs font-bold text-amber-900 block mb-1">
                    Linhas problemáticas ({finalResult.errors.length}):
                  </span>
                  <ul className="text-[11px] text-amber-800 space-y-1">
                    {finalResult.errors.map((err, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="font-mono font-bold">L{err.rowNumber || '?'}:</span>
                        <span>
                          {err.tag ? `[TAG: ${err.tag}] ` : ''}
                          {err.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            {importDone ? 'Fechar' : 'Cancelar'}
          </button>

          {!importDone && parseResult && (
            <button
              type="button"
              disabled={importing || parseResult.items.length === 0}
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#2A9D8F] text-white hover:bg-[#238276] rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {importing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <span>
                    {importMode === 'replace'
                      ? 'Substituir Base Atual Agora'
                      : 'Executar Upsert por TAG'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}

          {importDone && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#1E3A5F] text-white hover:bg-[#16304F] rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              Concluir e Ver Ativos
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
