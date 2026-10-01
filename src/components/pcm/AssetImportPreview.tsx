import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react'
import { readAndValidateAssetWorkbook } from '@/lib/assetImport/readWorkbook'
import { createRedProofFixture } from '@/lib/assetImport/validate'

export default function AssetImportPreview() {
  const [open, setOpen] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const records = useMemo(() => report?.records || [], [report])
  const counts = useMemo(
    () => ({
      assets: records.filter((record: any) => record.kind === 'asset').length,
      components: records.filter((record: any) => record.kind === 'component').length,
      unclassified: records.filter((record: any) => record.kind === 'unclassified').length,
      blocked: records.filter((record: any) => record.eligibility === 'blocked').length,
    }),
    [records],
  )
  const issueCounts = useMemo(() => {
    const result = new Map<string, number>()
    for (const item of report?.issues || []) result.set(item.code, (result.get(item.code) || 0) + 1)
    return [...result.entries()].sort((a, b) => b[1] - a[1])
  }, [report])

  const handleWorkbook = async (file?: File) => {
    if (!file) return
    setError('')
    setReport(null)
    setBusy(true)
    try {
      setReport(await readAndValidateAssetWorkbook(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler a planilha.')
    } finally {
      setBusy(false)
    }
  }

  const showRedFixture = () => {
    setError('')
    const fixture = createRedProofFixture()
    setReport({
      ...fixture.report,
      summary: {
        ...fixture.report.summary,
        byKind: fixture.report.records.reduce((counts: Record<string, number>, record: any) => {
          counts[record.kind] = (counts[record.kind] || 0) + 1
          return counts
        }, {}),
      },
      safety: {
        processingLocation: 'browser',
        persisted: false,
        writesToSkipCloud: false,
        ignoredColumns: ['Coluna1', 'APAGAR'],
        notices: ['Fixture RED sintética da T1.1; não é dado de produção.'],
      },
    })
  }

  const downloadReport = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `relatorio-importacao-t11-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2 text-[#1E3A5F] border border-blue-100">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[#1E3A5F]">Importação inicial — T1.1</h3>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Valida o Excel neste navegador e mostra uma prévia rastreável. Não grava equipamentos
              nem envia o arquivo ao Skip Cloud.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setError('')
          }}
          className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E3A5F] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#16304F] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Abrir prévia do Excel
        </button>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-3 sm:p-6"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-import-title"
            className="bg-white w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-2xl shadow-2xl"
          >
            <header className="sticky top-0 z-10 bg-[#0D1B2A] text-white px-5 py-4 flex items-start justify-between gap-4 rounded-t-2xl">
              <div>
                <h2 id="asset-import-title" className="font-bold text-base">
                  Prévia e validação do Excel — T1.1
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  Esquema v1.0.0 · chave dos ativos: Código · componentes: TAG + linha de origem
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Fechar prévia"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="p-5 space-y-5">
              <div
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2 text-xs text-emerald-900"
                role="status"
              >
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Somente prévia local.</strong> O arquivo é processado no navegador. Nada é
                  persistido no cadastro nem enviado ao backend. A aprovação e carga real são
                  posteriores e não fazem parte deste passo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <label className="block">
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Selecionar arquivo Excel (.xlsx, até 10 MB)
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    disabled={busy}
                    onChange={(event) => void handleWorkbook(event.currentTarget.files?.[0])}
                    className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={showRedFixture}
                  disabled={busy}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  Exercitar fixture RED
                </button>
              </div>

              {busy && (
                <div className="flex items-center gap-2 text-sm text-slate-600" role="status">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Lendo e validando localmente…
                </div>
              )}
              {error && (
                <div
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {report && (
                <div className="space-y-4">
                  <div
                    className={`rounded-lg border p-3 flex items-start gap-2 text-xs ${report.homologationBlocked ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-300 bg-emerald-50 text-emerald-950'}`}
                    role="status"
                  >
                    {report.homologationBlocked ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <strong>
                        {report.homologationBlocked
                          ? 'Homologação bloqueada por pendências.'
                          : 'Prévia sem bloqueio técnico.'}
                      </strong>
                      <p className="mt-1">
                        {report.fileName} · esquema {report.schemaVersion} · persistência: não ·
                        origem preservada por aba e linha.
                      </p>
                    </div>
                  </div>

                  {report.archive?.externalLinksDetected && (
                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-950">
                      O arquivo contém vínculos externos. A prévia usa somente valores armazenados
                      na planilha; ela não recalcula nem acessa a origem externa.
                    </div>
                  )}

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      ['Ativos', counts.assets],
                      ['Componentes', counts.components],
                      ['Não classificados', counts.unclassified],
                      ['Registros bloqueados', counts.blocked],
                    ].map(([label, number]) => (
                      <div
                        key={String(label)}
                        className="rounded-lg border border-slate-200 bg-white p-3"
                      >
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          {label}
                        </p>
                        <p className="mt-1 text-xl font-bold text-[#1E3A5F]">
                          {Number(number).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <h3 className="font-semibold text-sm text-slate-800">
                      Pendências encontradas ({report.issues?.length || 0})
                    </h3>
                    <button
                      type="button"
                      onClick={downloadReport}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Download className="w-4 h-4" /> Baixar relatório JSON
                    </button>
                  </div>
                  {issueCounts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {issueCounts.map(([code, number]) => (
                        <div
                          key={code}
                          className="rounded-md bg-slate-50 border border-slate-200 p-2 text-xs"
                        >
                          <span className="font-mono text-slate-800">{code}</span>
                          <span className="ml-2 text-slate-500">{number} ocorrência(s)</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Nenhuma pendência reportada.</p>
                  )}

                  <div>
                    <h3 className="font-semibold text-sm text-slate-800 mb-2">
                      Amostra rastreável (primeiros 20 registros)
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-3 py-2">Tipo</th>
                            <th className="px-3 py-2">Código</th>
                            <th className="px-3 py-2">TAG</th>
                            <th className="px-3 py-2">Descrição</th>
                            <th className="px-3 py-2">Linha</th>
                            <th className="px-3 py-2">Estado</th>
                            <th className="px-3 py-2">Motivos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {records.slice(0, 20).map((record: any, index: number) => (
                            <tr
                              key={`${record.source?.sheet}-${record.source?.row}-${index}`}
                              className="align-top"
                            >
                              <td className="px-3 py-2 whitespace-nowrap">
                                {record.kind === 'asset'
                                  ? 'Ativo'
                                  : record.kind === 'component'
                                    ? 'Componente'
                                    : 'Não classificado'}
                              </td>
                              <td className="px-3 py-2 font-mono">{record.sourceCode || '—'}</td>
                              <td className="px-3 py-2 font-mono">{record.sourceTag || '—'}</td>
                              <td className="px-3 py-2 min-w-48">{record.description || '—'}</td>
                              <td className="px-3 py-2">{record.source?.row ?? '—'}</td>
                              <td className="px-3 py-2">
                                {record.eligibility === 'blocked' ? (
                                  <span className="text-red-700 font-semibold">Bloqueado</span>
                                ) : (
                                  <span className="text-amber-700 font-semibold">Revisão</span>
                                )}
                              </td>
                              <td className="px-3 py-2 min-w-52">
                                {record.issues
                                  ?.filter((item: any) => item.severity === 'blocking')
                                  .map((item: any) => item.message)
                                  .join(' ') ||
                                  'Sem bloqueio de formato; ainda depende de homologação.'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
