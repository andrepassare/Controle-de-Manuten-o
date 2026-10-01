import { ASSET_IMPORT_SCHEMA_V1 } from './schema-v1.js'

const clean = (value) => (value == null ? '' : String(value).trim())
const keyFor = (value) => clean(value).normalize('NFKC').toLocaleLowerCase('pt-BR')
const blocking = (code, message, details = {}) => ({
  code,
  message,
  severity: 'blocking',
  ...details,
})
const notice = (code, message, details = {}) => ({ code, message, severity: 'info', ...details })

function headerIndex(header, required, schema) {
  const positions = new Map()
  const issues = []
  if (header.length > schema.limits.maxColumnsPerSheet) {
    issues.push(
      blocking(
        'COLUMN_LIMIT_EXCEEDED',
        `A aba excede ${schema.limits.maxColumnsPerSheet} colunas.`,
      ),
    )
  }
  header.forEach((value, column) => {
    const key = keyFor(value)
    if (!key) return
    if (positions.has(key))
      issues.push(
        blocking('DUPLICATE_HEADER', `Cabeçalho duplicado: ${clean(value)}`, {
          column: column + 1,
        }),
      )
    else positions.set(key, column)
  })
  for (const name of required) {
    if (!positions.has(keyFor(name)))
      issues.push(
        blocking('MISSING_REQUIRED_HEADER', `Coluna obrigatória ausente: ${name}`, {
          columnName: name,
        }),
      )
  }
  return { positions, issues }
}

function value(row, positions, name) {
  const index = positions.get(keyFor(name))
  return index === undefined ? null : (row[index] ?? null)
}

function locationsFrom(rows, fileName, schema) {
  const entries = new Map()
  const issues = []
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      entries,
      issues: [
        blocking(
          'MISSING_LOCATION_SHEET',
          `Aba obrigatória ausente: ${schema.source.locationSheet}`,
        ),
      ],
    }
  }
  if (rows.length > schema.limits.maxRowsPerSheet + 1) {
    return {
      entries,
      issues: [
        blocking(
          'ROW_LIMIT_EXCEEDED',
          `A aba ${schema.source.locationSheet} excede ${schema.limits.maxRowsPerSheet} linhas.`,
        ),
      ],
    }
  }
  const indexed = headerIndex(rows[0] || [], schema.source.locationRequiredHeaders, schema)
  if (indexed.issues.length) return { entries, issues: indexed.issues }
  const tagColumn = indexed.positions.get(keyFor('TAG'))
  const descriptionColumn = indexed.positions.get(keyFor('Descrição'))
  for (let index = 1; index < rows.length; index += 1) {
    const tag = clean(rows[index]?.[tagColumn])
    if (!tag) continue
    if (entries.has(tag)) {
      issues.push(
        blocking('DUPLICATE_LOCATION_TAG', `TAG de localização duplicada: ${tag}`, {
          source: { file: fileName, sheet: schema.source.locationSheet, row: index + 1 },
        }),
      )
      continue
    }
    entries.set(tag, { description: clean(rows[index]?.[descriptionColumn]) || null, assets: [] })
  }
  return { entries, issues }
}

function mapRecord(row, positions, source, rowNumber, sensorRequirements) {
  const tag = clean(value(row, positions, 'TAG'))
  const code = clean(value(row, positions, 'Código'))
  const description = clean(value(row, positions, 'Descrição do MIS'))
  const status = clean(value(row, positions, 'Status')).toUpperCase()
  const kind = status === 'ATIVO' ? 'asset' : status === '' ? 'component' : 'unclassified'
  const assetClass = clean(value(row, positions, 'Classe')) || null
  const criticality = clean(value(row, positions, 'Criticidade')).toUpperCase()
  const sensorText = clean(value(row, positions, 'Sensores'))
  const sensors = sensorText
    ? sensorText
        .split(/[;,|]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : []
  const record = {
    kind,
    identity: null,
    source: { file: source.fileName, sheet: source.sheetName, row: rowNumber },
    sourceCode: code || null,
    sourceEquipmentCode: clean(value(row, positions, 'Código Equipamento')) || null,
    sourceMisCode: clean(value(row, positions, 'Código do MIS')) || null,
    sourceTag: tag || null,
    description: description || null,
    familyCode: clean(value(row, positions, 'Código da Família')) || null,
    familyDescription: clean(value(row, positions, 'Descrição da Família')) || null,
    sourceStatus: status || null,
    assetClass,
    responsible: clean(value(row, positions, 'Responsável')) || null,
    criticality: ['A', 'B', 'C'].includes(criticality) ? criticality : null,
    locationTag: tag || null,
    locationDescription: null,
    parentLocationTag: null,
    parentAssetCode: null,
    componentPath: null,
    sensors,
    coverageState: 'unknown',
    operationalStatus: null,
    exclusionRequested: clean(value(row, positions, 'Exclusão solicitada')).toUpperCase() === 'SIM',
    exclusionReason: clean(value(row, positions, 'Justificativa da exclusão')) || null,
    exclusionApprover: clean(value(row, positions, 'Aprovador da exclusão')) || null,
    exclusionApprovedAt: clean(value(row, positions, 'Data da aprovação')) || null,
    eligibility: 'blocked',
    issues: [],
  }

  if (kind === 'asset') {
    record.identity = code ? `asset:${code}` : null
    if (!code)
      record.issues.push(
        blocking('MISSING_ASSET_CODE', 'Ativo sem Código; identidade não pode ser inferida.', {
          field: 'Código',
        }),
      )
    if (!tag)
      record.issues.push(
        blocking('MISSING_LOCATION_TAG', 'Ativo sem TAG de localização.', { field: 'TAG' }),
      )
    if (!description)
      record.issues.push(
        blocking('MISSING_DESCRIPTION', 'Ativo sem descrição.', { field: 'Descrição do MIS' }),
      )
    if (!assetClass)
      record.issues.push(
        blocking('MISSING_ASSET_CLASS', 'Classe ausente; não inferida pela família.', {
          field: 'Classe',
        }),
      )
    if (!record.criticality)
      record.issues.push(
        blocking(
          'MISSING_CRITICALITY',
          'Criticidade vazia ou fora de A/B/C; PCM deve classificar.',
          { field: 'Criticidade' },
        ),
      )
    if (!record.responsible)
      record.issues.push(
        blocking('MISSING_RESPONSIBLE', 'Responsável do ativo não informado.', {
          field: 'Responsável',
        }),
      )
    const location = tag ? source.locationEntries.get(tag) : null
    if (tag && !location)
      record.issues.push(
        blocking('UNKNOWN_LOCATION_TAG', 'TAG não localizada na aba TAG Localização.', {
          field: 'TAG',
          value: tag,
        }),
      )
    else if (location) {
      record.locationDescription = location.description
      location.assets.push(record)
    }
    const requiredCount = Number(sensorRequirements[assetClass] || 0)
    if (!assetClass || requiredCount <= 0) {
      record.coverageState = 'unknown'
      record.issues.push(
        blocking(
          'SENSOR_REQUIREMENT_UNDEFINED',
          'Requisito de sensor por classe ainda não homologado; cobertura desconhecida e homologação bloqueada.',
          { field: 'Sensores', assetClass },
        ),
      )
    } else if (sensors.length < requiredCount) {
      record.coverageState = 'uncovered'
      record.issues.push(
        blocking(
          'MISSING_REQUIRED_SENSOR',
          `A classe exige ${requiredCount} sensor(es); há ${sensors.length}.`,
          { field: 'Sensores', requiredCount, actualCount: sensors.length, assetClass },
        ),
      )
    } else record.coverageState = 'covered'
    if (record.exclusionRequested) {
      if (!record.exclusionReason || !record.exclusionApprover || !record.exclusionApprovedAt) {
        record.issues.push(
          blocking(
            'EXCLUSION_NOT_APPROVED',
            'Exclusão só é aceita com justificativa, aprovador e data; registro continua visível e no denominador.',
            { field: 'Exclusão solicitada' },
          ),
        )
      } else
        record.issues.push(
          notice(
            'APPROVED_EXCLUSION_VISIBLE',
            'Exclusão aprovada mantida visível para auditoria e denominador original.',
          ),
        )
    }
  } else if (kind === 'component') {
    record.identity = `component:${source.fileName}:${source.sheetName}:${rowNumber}`
    if (!tag)
      record.issues.push(
        blocking(
          'MISSING_COMPONENT_TAG',
          'Componente sem TAG composta; precisa de revisão do PCM.',
          { field: 'TAG' },
        ),
      )
    if (!description)
      record.issues.push(
        blocking('MISSING_DESCRIPTION', 'Componente sem descrição.', { field: 'Descrição do MIS' }),
      )
    if (code)
      record.issues.push(
        notice(
          'NON_UNIQUE_COMPONENT_CODE',
          'Código do componente preservado como atributo, não usado como chave única.',
          { field: 'Código', value: code },
        ),
      )
  } else {
    record.identity = `unclassified:${source.fileName}:${source.sheetName}:${rowNumber}`
    record.issues.push(
      blocking(
        'UNRECOGNIZED_STATUS',
        'Status não é ATIVO nem vazio; registro fica não classificado. Nenhum status operacional é inferido.',
        { field: 'Status', value: status },
      ),
    )
  }
  return record
}

export function validateAssetImport({
  sheetName,
  rows,
  locationRows = [],
  fileName = 'upload.xlsx',
  schema = ASSET_IMPORT_SCHEMA_V1,
  requiredSensorsByClass = {},
}) {
  const report = {
    schemaId: schema.id,
    schemaVersion: schema.version,
    fileName,
    sheetName,
    summary: {
      rowsSeen: Array.isArray(rows) ? rows.length : 0,
      candidateRows: 0,
      recordsAccepted: 0,
      blockingRecords: 0,
      ignoredRows: 0,
    },
    records: [],
    issues: [],
    homologationBlocked: true,
    persisted: false,
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    report.issues.push(blocking('EMPTY_SHEET', 'A aba está vazia.'))
    report.summary.blockingRecords = 1
    return report
  }
  if (rows.length > schema.limits.maxRowsPerSheet + 1) {
    report.issues.push(
      blocking('ROW_LIMIT_EXCEEDED', `A aba excede ${schema.limits.maxRowsPerSheet} linhas.`),
    )
    report.summary.blockingRecords = 1
    return report
  }
  if (sheetName !== schema.source.primarySheet) {
    report.issues.push(blocking('UNEXPECTED_SHEET', `Aba principal não reconhecida: ${sheetName}`))
    report.summary.blockingRecords = 1
    return report
  }
  const indexed = headerIndex(rows[0] || [], schema.source.primaryRequiredHeaders, schema)
  report.issues.push(...indexed.issues)
  if (indexed.issues.length) {
    report.summary.blockingRecords = Math.max(1, indexed.issues.length)
    return report
  }
  const location = locationsFrom(locationRows, fileName, schema)
  report.issues.push(...location.issues)
  const source = { fileName, sheetName, locationEntries: location.entries }
  const records = []
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] || []
    const meaningful = schema.source.primaryRequiredHeaders.some(
      (name) => clean(value(row, indexed.positions, name)) !== '',
    )
    if (!meaningful) {
      report.summary.ignoredRows += 1
      continue
    }
    records.push(mapRecord(row, indexed.positions, source, index + 1, requiredSensorsByClass))
  }
  report.summary.candidateRows = records.length

  const assetCodes = new Map()
  const componentTags = new Map()
  for (const record of records) {
    if (record.kind === 'asset' && record.sourceCode) {
      const previous = assetCodes.get(record.sourceCode)
      if (previous) {
        const conflict = blocking(
          'DUPLICATE_ASSET_CODE',
          `Código de ativo duplicado: ${record.sourceCode}`,
          {
            field: 'Código',
            value: record.sourceCode,
            conflictingRows: [previous.source.row, record.source.row],
          },
        )
        record.issues.push(conflict)
        previous.issues.push(conflict)
      } else assetCodes.set(record.sourceCode, record)
    }
    if (record.kind === 'component' && record.sourceTag) {
      const previous = componentTags.get(record.sourceTag)
      if (previous) {
        const conflict = blocking(
          'DUPLICATE_COMPONENT_TAG',
          `TAG de componente duplicada: ${record.sourceTag}`,
          {
            field: 'TAG',
            value: record.sourceTag,
            conflictingRows: [previous.source.row, record.source.row],
          },
        )
        record.issues.push(conflict)
        previous.issues.push(conflict)
      } else componentTags.set(record.sourceTag, record)
    }
  }

  const knownLocations = [...location.entries.keys()].sort((a, b) => b.length - a.length)
  for (const record of records) {
    if (record.kind !== 'component' || !record.sourceTag) continue
    const locationTag = knownLocations.find((tag) => record.sourceTag.startsWith(`${tag}-`))
    if (!locationTag) {
      record.issues.push(
        blocking(
          'MALFORMED_COMPONENT_TAG',
          'TAG composta sem prefixo correspondente à aba TAG Localização.',
          { field: 'TAG', value: record.sourceTag },
        ),
      )
      continue
    }
    record.parentLocationTag = locationTag
    const remainder = record.sourceTag.slice(locationTag.length + 1)
    const candidates = location.entries
      .get(locationTag)
      .assets.filter(
        (asset) =>
          asset.sourceCode &&
          (remainder === asset.sourceCode || remainder.startsWith(`${asset.sourceCode}-`)),
      )
    const longestCode = candidates.sort((a, b) => b.sourceCode.length - a.sourceCode.length)[0]
      ?.sourceCode
    const parents = longestCode
      ? candidates.filter((asset) => asset.sourceCode === longestCode)
      : []
    record.parentCandidates = parents.map((asset) => asset.sourceCode)
    if (parents.length !== 1) {
      record.issues.push(
        blocking(
          'PARENT_ASSET_UNRESOLVED',
          parents.length
            ? 'Há mais de um ativo pai possível; resolver no PCM.'
            : 'Código do ativo pai não encontrado nessa localização.',
          { parentLocationTag: locationTag, candidates: record.parentCandidates },
        ),
      )
    } else {
      record.parentAssetCode = parents[0].sourceCode
      record.componentPath =
        remainder === record.parentAssetCode
          ? ''
          : remainder.slice(record.parentAssetCode.length + 1)
    }
  }

  for (const record of records) {
    record.eligibility = record.issues.some((item) => item.severity === 'blocking')
      ? 'blocked'
      : 'review'
    if (record.eligibility === 'blocked') report.summary.blockingRecords += 1
    else report.summary.recordsAccepted += 1
    report.issues.push(
      ...record.issues.map((item) => ({ ...item, source: record.source, kind: record.kind })),
    )
  }
  report.records = records
  report.homologationBlocked = report.issues.some((item) => item.severity === 'blocking')
  return report
}

export function createRedProofFixture() {
  const headers = [
    'Coluna1',
    'TAG',
    'Descrição do MIS',
    'APAGAR',
    'Código',
    'Código Equipamento',
    'Código do MIS',
    'Código da Família',
    'Descrição da Família',
    'Status',
    'Criticidade',
    'Classe',
    'Responsável',
    'Sensores',
    'Exclusão solicitada',
    'Justificativa da exclusão',
    'Aprovador da exclusão',
    'Data da aprovação',
  ]
  const asset = (seq, tag, code, description, criticality = 'C', sensors = `VIB-${code}`) => [
    seq,
    tag,
    description,
    'IGNORAR',
    code,
    null,
    code,
    'AT',
    'ATIVOS',
    'ATIVO',
    criticality,
    'ROTATIVO',
    `PCM ${code}`,
    sensors,
    'NÃO',
    '',
    '',
    '',
  ]
  const baseRows = [
    headers,
    asset(1, 'L-01', 'AT01', 'Ativo completo', 'A', 'VIB-AT01'),
    asset(2, 'L-02', 'AT02', 'Ativo sem sensor obrigatório', 'B', ''),
    asset(3, 'L-03', 'AT03', 'Exclusão sem aprovação', 'C', 'VIB-AT03'),
    asset(4, 'L-04', 'AT04', 'Criticidade vazia', '', 'VIB-AT04'),
    asset(5, 'L-05', 'AT05', 'Primeiro ativo na localização compartilhada'),
    asset(6, 'L-05', 'AT06', 'Segundo ativo na localização compartilhada'),
    asset(7, 'L-07', 'AT07', 'Ativo de apoio 7'),
    asset(8, 'L-08', 'AT08', 'Ativo de apoio 8'),
    asset(9, 'L-09', 'AT09', 'Ativo de apoio 9'),
    asset(10, 'L-10', 'AT10', 'Ativo de apoio 10'),
    asset(11, 'L-11', 'AT10', 'Código de ativo repetido'),
    [
      12,
      'L-01-AT01-1-1',
      'Motor principal',
      'IGNORAR',
      'MEL001',
      'MEL001',
      'MEL001',
      null,
      null,
      null,
      'A',
    ],
    [
      13,
      'L-01-AT01-1-2',
      'Redutor principal',
      'IGNORAR',
      'RED001',
      'RED001',
      'RED001',
      null,
      null,
      null,
      'B',
    ],
    [
      14,
      'L-01-AT01-2-1',
      'Mesmo código em outra TAG',
      'IGNORAR',
      'MEL001',
      'MEL001',
      'MEL001',
      null,
      null,
      null,
      'C',
    ],
    [
      15,
      'L-01-AT01-1-1',
      'TAG composta duplicada',
      'IGNORAR',
      'MEL002',
      'MEL002',
      'MEL002',
      null,
      null,
      null,
      'C',
    ],
    [
      16,
      'L-05-AT06-1-1',
      'Pai resolvido sem fundir TAGs',
      'IGNORAR',
      'BBA001',
      'BBA001',
      'BBA001',
      null,
      null,
      null,
      'B',
    ],
    [17, '', 'Componente sem TAG', 'IGNORAR', null, null, null, null, null, null, 'C'],
    [
      18,
      'L-01-AT01-3-1',
      'Status não mapeado',
      'IGNORAR',
      'UN01',
      null,
      'UN01',
      null,
      null,
      'PERMANENTE',
      'C',
    ],
  ]
  baseRows[3][14] = 'SIM'
  const locationRows = [
    ['SEQ', 'TAG', 'Descrição', 'Modalidade'],
    [1, 'L-01', 'Local um', 'DIVISAO'],
    [2, 'L-02', 'Local dois', 'DIVISAO'],
    [3, 'L-03', 'Local três', 'DIVISAO'],
    [4, 'L-04', 'Local quatro', 'DIVISAO'],
    [5, 'L-05', 'Local cinco', 'DIVISAO'],
    [6, 'L-07', 'Local sete', 'DIVISAO'],
    [7, 'L-08', 'Local oito', 'DIVISAO'],
    [8, 'L-09', 'Local nove', 'DIVISAO'],
    [9, 'L-10', 'Local dez', 'DIVISAO'],
    [10, 'L-11', 'Local onze', 'DIVISAO'],
  ]
  const report = validateAssetImport({
    sheetName: schemaSheet(),
    rows: baseRows,
    locationRows,
    fileName: 'fixture-red-sintetica.xlsx',
    requiredSensorsByClass: { ROTATIVO: 1 },
  })
  return { baseRows, locationRows, report }
}

function schemaSheet() {
  return ASSET_IMPORT_SCHEMA_V1.source.primarySheet
}
