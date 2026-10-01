import readXlsxBrowser from 'read-excel-file/browser'
import { ImportItemInput } from '@/services/equipamentos'

const readXlsx: any = readXlsxBrowser

export interface ParsedSheetResult {
  fileName: string
  sheetName: string
  headers: string[]
  items: ImportItemInput[]
  rawRowCount: number
  validRowCount: number
  invalidRowCount: number
  parseErrors: Array<{ rowNumber: number; message: string }>
}

// Normalização de cabeçalhos para mapeamento flexível
function normalizeHeader(h: any): string {
  if (h === null || h === undefined) return ''
  return String(h)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Faz parse de arquivo .xlsx, .xls ou .csv (via read-excel-file ou parser CSV simples)
 */
export async function parseEquipamentosFile(file: File): Promise<ParsedSheetResult> {
  const fileName = file.name
  const isCsv = fileName.toLowerCase().endsWith('.csv')

  let rows: any[][] = []
  let sheetName = 'Planilha'

  if (isCsv) {
    const text = await file.text()
    rows = parseCsvText(text)
    sheetName = 'CSV'
  } else {
    // Ler todas as abas se possível para encontrar 'Base Montagem' ou a primeira com cabeçalho TAG
    try {
      const allSheets = await readXlsx(file, { allSheets: true })
      if (Array.isArray(allSheets) && allSheets.length > 0) {
        // Procurar aba 'Base Montagem' (case-insensitive)
        const baseMontagemSheet = allSheets.find((s: any) => {
          const name = s?.sheet || s?.name || ''
          return String(name).trim().toLowerCase().includes('base montagem')
        })
        if (baseMontagemSheet && Array.isArray(baseMontagemSheet.data)) {
          sheetName = baseMontagemSheet.sheet || baseMontagemSheet.name || 'Base Montagem'
          rows = baseMontagemSheet.data
        } else {
          sheetName = allSheets[0].sheet || allSheets[0].name || 'Aba 1'
          rows = allSheets[0].data || []
        }
      } else {
        rows = (await readXlsx(file)) as any[][]
      }
    } catch {
      // Fallback para leitura simples da primeira aba
      rows = (await readXlsx(file)) as any[][]
    }
  }

  // Localizar linha de cabeçalho (que contenha 'TAG' ou similar)
  let headerIndex = -1
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] || []
    const hasTag = row.some((cell: any) => {
      const norm = normalizeHeader(cell)
      return norm === 'tag'
    })
    if (hasTag) {
      headerIndex = i
      break
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0 // Tentar usar a primeira linha
  }

  const rawHeaders = (rows[headerIndex] || []).map((c: any) =>
    c !== null && c !== undefined ? String(c).trim() : '',
  )
  const headerMap: Record<string, number> = {}

  rawHeaders.forEach((h, idx) => {
    const norm = normalizeHeader(h)
    if (!norm) return

    // Mapeamentos conhecidos da planilha do usuário:
    // "TAG" -> tag
    if (norm === 'tag') {
      headerMap['tag'] = idx
    }
    // "Descrição do MIS" -> descricao
    else if (
      norm.includes('descricaodomis') ||
      norm.includes('descricaomis') ||
      (norm.includes('descricao') && !norm.includes('familia'))
    ) {
      if (headerMap['descricao'] === undefined) headerMap['descricao'] = idx
    }
    // "Código Equipamento" -> codigo_equipamento
    else if (norm.includes('codigoequipamento') || norm.includes('codequip')) {
      headerMap['codigo_equipamento'] = idx
    }
    // "Código do MIS" -> codigo_mis
    else if (norm.includes('codigodomis') || norm.includes('codigomis')) {
      headerMap['codigo_mis'] = idx
    }
    // "Código da Família" -> familia_codigo
    else if (norm.includes('codigodafamilia') || norm.includes('codigofamilia')) {
      headerMap['familia_codigo'] = idx
    }
    // "Descrição da Família" -> familia_descricao
    else if (norm.includes('descricaodafamilia') || norm.includes('descricaofamilia')) {
      headerMap['familia_descricao'] = idx
    }
    // "Criticidade" -> criticidade
    else if (norm.includes('criticidade')) {
      headerMap['criticidade'] = idx
    }
    // "Sensores" -> sensores
    else if (norm.includes('sensor') || norm.includes('sensores')) {
      headerMap['sensores'] = idx
    }
    // "Responsável" -> responsavel
    else if (norm.includes('responsavel') || norm.includes('resp')) {
      headerMap['responsavel'] = idx
    }
  })

  if (headerMap['tag'] === undefined) {
    throw new Error(
      `Coluna obrigatória "TAG" não foi encontrada no cabeçalho da planilha. Cabeçalhos detectados: ${rawHeaders.filter(Boolean).join(', ')}`,
    )
  }

  const items: ImportItemInput[] = []
  const parseErrors: Array<{ rowNumber: number; message: string }> = []
  let rawRowCount = 0
  let validRowCount = 0
  let invalidRowCount = 0

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || row.every((c: any) => c === null || c === undefined || String(c).trim() === '')) {
      continue // Ignora linhas totalmente vazias
    }

    rawRowCount++
    const rowNumber = r + 1

    const getVal = (key: string): string => {
      const colIdx = headerMap[key]
      if (colIdx === undefined || colIdx >= row.length) return ''
      const cell = row[colIdx]
      if (cell === null || cell === undefined) return ''
      return String(cell).trim()
    }

    const tag = getVal('tag')
    if (!tag) {
      invalidRowCount++
      parseErrors.push({
        rowNumber,
        message: 'Linha sem TAG preenchida.',
      })
      continue
    }

    const descricao = getVal('descricao')
    const codigo_equipamento = getVal('codigo_equipamento')
    const codigo_mis = getVal('codigo_mis')
    const familia_codigo = getVal('familia_codigo')
    const familia_descricao = getVal('familia_descricao')
    const criticidadeRaw = getVal('criticidade').toUpperCase()
    const sensoresRaw = getVal('sensores').toLowerCase()
    const responsavel = getVal('responsavel')

    // Validar criticidade
    let criticidade: 'A' | 'B' | 'C' | undefined = undefined
    if (criticidadeRaw) {
      if (['A', 'B', 'C'].includes(criticidadeRaw)) {
        criticidade = criticidadeRaw as 'A' | 'B' | 'C'
      } else {
        invalidRowCount++
        parseErrors.push({
          rowNumber,
          message: `Criticidade inválida "${criticidadeRaw}" para TAG ${tag}. Esperado: A, B ou C.`,
        })
        continue
      }
    }

    // Parse Sensores (Sim / Não / True / 1)
    const sensores =
      sensoresRaw === 'sim' ||
      sensoresRaw === 's' ||
      sensoresRaw === 'true' ||
      sensoresRaw === '1' ||
      sensoresRaw.includes('sim')

    items.push({
      tag,
      nome: descricao || tag,
      descricao: descricao || undefined,
      codigo_equipamento: codigo_equipamento || undefined,
      codigo_mis: codigo_mis || undefined,
      familia_codigo: familia_codigo || undefined,
      familia_descricao: familia_descricao || undefined,
      criticidade: criticidade || undefined,
      sensores,
      responsavel: responsavel || undefined,
      setor: familia_descricao || 'Geral',
      status: 'Operacional',
      tipo: 'Mecânico',
    })

    validRowCount++
  }

  return {
    fileName,
    sheetName,
    headers: rawHeaders,
    items,
    rawRowCount,
    validRowCount,
    invalidRowCount,
    parseErrors,
  }
}

/**
 * Parser simples de texto CSV que suporta delimitador vírgula ou ponto-e-vírgula e aspas
 */
function parseCsvText(text: string): string[][] {
  const lines = text.split(/\r?\n/)
  if (lines.length === 0) return []

  // Detectar delimitador: ponto-e-vírgula é comum no Brasil
  const firstLine = lines[0] || ''
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const delimiter = semicolonCount > commaCount ? ';' : ','

  const rows: string[][] = []

  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let inQuotes = false
    let currentCell = ''

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === delimiter && !inQuotes) {
        cells.push(currentCell.trim())
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    cells.push(currentCell.trim())
    rows.push(cells)
  }

  return rows
}
