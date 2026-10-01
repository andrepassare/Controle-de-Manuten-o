import { ASSET_IMPORT_SCHEMA_V1 } from './schema-v1.js'
import { validateAssetImport } from './validate.js'

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const MAX_EOCD_SEARCH = 22 + 0xffff
const FORBIDDEN_PATH_PARTS = new Set(['.', '..'])

function bytesFrom(input) {
  if (input instanceof Uint8Array) return input
  if (ArrayBuffer.isView(input))
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  throw new Error('Arquivo XLSX inválido.')
}

async function getBytes(file) {
  if (file && typeof file.arrayBuffer === 'function')
    return new Uint8Array(await file.arrayBuffer())
  return bytesFrom(file)
}

function findEocd(bytes) {
  const lower = Math.max(0, bytes.length - MAX_EOCD_SEARCH)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let offset = bytes.length - 22; offset >= lower; offset -= 1) {
    if (view.getUint32(offset, true) !== EOCD_SIGNATURE) continue
    const commentLength = view.getUint16(offset + 20, true)
    if (offset + 22 + commentLength === bytes.length) return { offset, view }
  }
  throw new Error('Arquivo ZIP/XLSX inválido: diretório central ausente ou corrompido.')
}

export function inspectXlsxArchive(input, schema = ASSET_IMPORT_SCHEMA_V1) {
  const bytes = bytesFrom(input)
  const { offset: endOffset, view } = findEocd(bytes)
  const disk = view.getUint16(endOffset + 4, true)
  const centralDisk = view.getUint16(endOffset + 6, true)
  const diskEntries = view.getUint16(endOffset + 8, true)
  const entryCount = view.getUint16(endOffset + 10, true)
  const centralSize = view.getUint32(endOffset + 12, true)
  const centralOffset = view.getUint32(endOffset + 16, true)
  if (disk || centralDisk || diskEntries !== entryCount)
    throw new Error('XLSX multipart não é aceito.')
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff)
    throw new Error('XLSX ZIP64 não é aceito nesta prévia.')
  if (entryCount > schema.limits.maxZipEntries)
    throw new Error(`O arquivo contém mais de ${schema.limits.maxZipEntries} itens ZIP.`)
  if (centralOffset + centralSize > endOffset) throw new Error('Diretório central inconsistente.')

  const decoder = new TextDecoder('utf-8', { fatal: true })
  let cursor = centralOffset
  let uncompressedTotal = 0
  let hasWorkbook = false
  let hasRelationships = false
  let hasTypes = false
  let hasWorksheet = false
  let hasExternalLinks = false
  for (let index = 0; index < entryCount; index += 1) {
    if (
      cursor + 46 > centralOffset + centralSize ||
      view.getUint32(cursor, true) !== CENTRAL_SIGNATURE
    )
      throw new Error('Cabeçalho ZIP inválido.')
    const flags = view.getUint16(cursor + 8, true)
    const method = view.getUint16(cursor + 10, true)
    const compressed = view.getUint32(cursor + 20, true)
    const uncompressed = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const next = cursor + 46 + nameLength + extraLength + commentLength
    if (next > centralOffset + centralSize) throw new Error('Metadados ZIP truncados.')
    if (compressed === 0xffffffff || uncompressed === 0xffffffff)
      throw new Error('Entrada ZIP64 não é aceita nesta prévia.')
    let name
    try {
      name = decoder.decode(bytesFrom(bytes).subarray(cursor + 46, cursor + 46 + nameLength))
    } catch {
      throw new Error('Nome de arquivo inválido dentro do XLSX.')
    }
    const path = name.replace(/\\/g, '/')
    if (path.startsWith('/') || path.split('/').some((part) => FORBIDDEN_PATH_PARTS.has(part)))
      throw new Error('Caminho de arquivo inválido dentro do XLSX.')
    if ((flags & 0x0001) !== 0 || (flags & 0x0040) !== 0)
      throw new Error('XLSX criptografado não é aceito.')
    if (method !== 0 && method !== 8) throw new Error('Método de compressão ZIP não suportado.')
    if (compressed === 0 && uncompressed > 0) throw new Error('Tamanho ZIP inconsistente.')
    if (uncompressed / Math.max(1, compressed) > schema.limits.maxCompressionRatio)
      throw new Error('A taxa de expansão do XLSX excede o limite seguro.')
    if (uncompressed > schema.limits.maxEntryUncompressedBytes)
      throw new Error(
        `Um item excede ${schema.limits.maxEntryUncompressedBytes} bytes descompactados.`,
      )
    uncompressedTotal += uncompressed
    if (uncompressedTotal > schema.limits.maxUncompressedBytes)
      throw new Error('O conteúdo descompactado excede o limite seguro.')
    hasWorkbook ||= path === 'xl/workbook.xml'
    hasRelationships ||= path === 'xl/_rels/workbook.xml.rels'
    hasTypes ||= path === '[Content_Types].xml'
    hasWorksheet ||= /^xl\/worksheets\/sheet\d+\.xml$/.test(path)
    hasExternalLinks ||= path.startsWith('xl/externalLinks/')
    cursor = next
  }
  if (cursor !== centralOffset + centralSize)
    throw new Error('Comprimento do diretório central inválido.')
  if (!hasWorkbook || !hasRelationships || !hasTypes || !hasWorksheet)
    throw new Error('Estrutura XLSX incompleta.')
  return { entryCount, uncompressedTotal, hasExternalLinks }
}

export async function readAndValidateAssetWorkbook(file, options = {}) {
  const schema = options.schema || ASSET_IMPORT_SCHEMA_V1
  if (!file || typeof file !== 'object') throw new Error('Selecione um arquivo Excel .xlsx.')
  const fileName = typeof file.name === 'string' ? file.name : 'upload.xlsx'
  if (!fileName.toLocaleLowerCase('en-US').endsWith('.xlsx'))
    throw new Error('Formato não aceito. Selecione um arquivo .xlsx.')
  if (typeof file.size === 'number' && file.size > schema.limits.maxFileBytes)
    throw new Error('O arquivo excede o limite de 10 MB.')
  const bytes = await getBytes(file)
  if (!bytes.byteLength) throw new Error('O arquivo está vazio.')
  if (bytes.byteLength > schema.limits.maxFileBytes)
    throw new Error('O arquivo excede o limite de 10 MB.')
  const archive = inspectXlsxArchive(bytes, schema)
  const reader = options.readWorkbook || (await import('read-excel-file/browser')).default
  const sheets = await reader(bytes, { trim: true })
  if (!Array.isArray(sheets) || sheets.length === 0)
    throw new Error('Nenhuma aba foi encontrada no arquivo.')
  const byName = new Map(sheets.map((sheet) => [sheet.sheet, sheet.data]))
  const requiredSheets = [schema.source.primarySheet, schema.source.locationSheet]
  const missing = requiredSheets.filter((name) => !byName.has(name))
  if (missing.length) throw new Error(`Aba obrigatória ausente: ${missing.join(', ')}`)
  for (const name of requiredSheets) {
    if ((byName.get(name) || []).length > schema.limits.maxRowsPerSheet + 1)
      throw new Error(`A aba ${name} excede o limite de linhas.`)
  }
  const report = validateAssetImport({
    sheetName: schema.source.primarySheet,
    rows: byName.get(schema.source.primarySheet),
    locationRows: byName.get(schema.source.locationSheet),
    fileName,
    schema,
    requiredSensorsByClass: options.requiredSensorsByClass || {},
  })
  report.archive = {
    entryCount: archive.entryCount,
    uncompressedBytes: archive.uncompressedTotal,
    externalLinksDetected: archive.hasExternalLinks,
  }
  report.safety = {
    processingLocation: 'browser',
    persisted: false,
    writesToSkipCloud: false,
    ignoredColumns: schema.mapping.ignoredColumns,
    notices: archive.hasExternalLinks
      ? [
          'O arquivo contém vínculos externos; usa-se apenas o valor em cache, sem recalcular a origem.',
        ]
      : [],
  }
  report.summary.byKind = report.records.reduce((counts, record) => {
    counts[record.kind] = (counts[record.kind] || 0) + 1
    return counts
  }, {})
  report.homologationBlocked ||= report.summary.blockingRecords > 0
  return report
}
