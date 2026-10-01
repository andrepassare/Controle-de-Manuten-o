import test from 'node:test'
import assert from 'node:assert/strict'
import { zipSync, strToU8 } from 'fflate'
import { ASSET_IMPORT_SCHEMA_V1 } from './schema-v1.js'
import { createRedProofFixture, validateAssetImport } from './validate.js'
import { inspectXlsxArchive, readAndValidateAssetWorkbook } from './readWorkbook.js'

const fixture = createRedProofFixture()
const codes = (report, kind) =>
  new Set(report.issues.filter((item) => !kind || item.kind === kind).map((item) => item.code))

function minimalXlsx(extra = {}) {
  return zipSync(
    {
      '[Content_Types].xml': strToU8('<Types/>'),
      'xl/workbook.xml': strToU8('<workbook/>'),
      'xl/_rels/workbook.xml.rels': strToU8('<Relationships/>'),
      'xl/worksheets/sheet1.xml': strToU8('<worksheet/>'),
      ...extra,
    },
    { level: 0 },
  )
}

function fileFrom(bytes, name = 'ativos.xlsx') {
  return {
    name,
    size: bytes.length,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  }
}

const fixtureReader = async () => [
  { sheet: 'Base Montagem', data: fixture.baseRows },
  { sheet: 'TAG Localização', data: fixture.locationRows },
]

test('RED fixture covers at least 10 assets and blocks homologation', () => {
  assert.ok(fixture.report.records.filter((record) => record.kind === 'asset').length >= 10)
  assert.equal(fixture.report.homologationBlocked, true)
  assert.equal(fixture.report.persisted, false)
  for (const code of [
    'MISSING_REQUIRED_SENSOR',
    'DUPLICATE_COMPONENT_TAG',
    'EXCLUSION_NOT_APPROVED',
    'MISSING_CRITICALITY',
    'UNRECOGNIZED_STATUS',
  ])
    assert.ok(codes(fixture.report).has(code), code)
})

test('asset Code is the key; duplicate location tags do not merge assets and duplicate Code blocks', () => {
  const atSameLocation = fixture.report.records.filter((record) =>
    ['AT05', 'AT06'].includes(record.sourceCode),
  )
  assert.equal(atSameLocation.length, 2)
  assert.equal(atSameLocation[0].locationTag, atSameLocation[1].locationTag)
  assert.ok(
    atSameLocation.every(
      (record) => !record.issues.some((item) => item.code === 'DUPLICATE_ASSET_CODE'),
    ),
  )
  assert.ok(codes(fixture.report, 'asset').has('DUPLICATE_ASSET_CODE'))
})

test('component Code may repeat; component TAG conflicts block and source row is preserved', () => {
  const sameCode = fixture.report.records.filter(
    (record) => record.kind === 'component' && record.sourceCode === 'MEL001',
  )
  assert.equal(sameCode.length, 2)
  assert.ok(
    sameCode.every((record) => record.source.row > 1 && record.source.sheet === 'Base Montagem'),
  )
  assert.ok(codes(fixture.report, 'component').has('DUPLICATE_COMPONENT_TAG'))
  assert.ok(sameCode.some((record) => record.eligibility === 'review'))
})

test('component parent is resolved from location plus active Code, not guessed from repeated location', () => {
  const child = fixture.report.records.find((record) => record.sourceTag === 'L-05-AT06-1-1')
  assert.equal(child.parentLocationTag, 'L-05')
  assert.equal(child.parentAssetCode, 'AT06')
  assert.equal(child.operationalStatus, null)
})

test('APAGAR is ignored and provenance is recorded', () => {
  const asset = fixture.report.records.find((record) => record.sourceCode === 'AT01')
  assert.deepEqual(ASSET_IMPORT_SCHEMA_V1.mapping.ignoredColumns, ['Coluna1', 'APAGAR'])
  assert.deepEqual(asset.source, {
    file: 'fixture-red-sintetica.xlsx',
    sheet: 'Base Montagem',
    row: 2,
  })
})

test('approved exclusion remains present in the original denominator', () => {
  const rows = fixture.baseRows.map((row) => [...row])
  const excluded = rows.find((row) => row[4] === 'AT03')
  excluded[15] = 'Fora do escopo aprovado'
  excluded[16] = 'Gestão Industrial'
  excluded[17] = '2026-10-01'
  const report = validateAssetImport({
    sheetName: 'Base Montagem',
    rows,
    locationRows: fixture.locationRows,
    requiredSensorsByClass: { ROTATIVO: 1 },
  })
  const record = report.records.find((item) => item.sourceCode === 'AT03')
  assert.ok(record)
  assert.ok(record.issues.some((item) => item.code === 'APPROVED_EXCLUSION_VISIBLE'))
})

test('blank input, missing sheets or headers, oversized row set all block', () => {
  assert.ok(
    codes(
      validateAssetImport({
        sheetName: 'Base Montagem',
        rows: [],
        locationRows: fixture.locationRows,
      }),
    ).has('EMPTY_SHEET'),
  )
  assert.ok(
    codes(validateAssetImport({ sheetName: 'Base Montagem', rows: fixture.baseRows })).has(
      'MISSING_LOCATION_SHEET',
    ),
  )
  assert.ok(
    codes(
      validateAssetImport({
        sheetName: 'Base Montagem',
        rows: [['TAG']],
        locationRows: fixture.locationRows,
      }),
    ).has('MISSING_REQUIRED_HEADER'),
  )
  const tooMany = Array.from(
    { length: ASSET_IMPORT_SCHEMA_V1.limits.maxRowsPerSheet + 2 },
    () => [],
  )
  assert.ok(
    codes(
      validateAssetImport({
        sheetName: 'Base Montagem',
        rows: tooMany,
        locationRows: fixture.locationRows,
      }),
    ).has('ROW_LIMIT_EXCEEDED'),
  )
})

test('ZIP preflight accepts XLSX shape, rejects path traversal and high expansion ratio', () => {
  const good = minimalXlsx()
  assert.equal(inspectXlsxArchive(good).entryCount, 4)
  assert.throws(
    () => inspectXlsxArchive(minimalXlsx({ '../evil.xml': strToU8('x') })),
    /caminho de arquivo inválido/i,
  )
  const bomb = minimalXlsx()
  const view = new DataView(bomb.buffer, bomb.byteOffset, bomb.byteLength)
  let offset = -1
  for (let index = 0; index < bomb.length - 46; index += 1)
    if (view.getUint32(index, true) === 0x02014b50) {
      offset = index
      break
    }
  assert.ok(offset >= 0)
  view.setUint32(offset + 24, Math.max(1, view.getUint32(offset + 20, true)) * 101, true)
  assert.throws(() => inspectXlsxArchive(bomb), /taxa de expansão/i)
})

test('file type and size are checked before parsing', async () => {
  await assert.rejects(
    readAndValidateAssetWorkbook(fileFrom(minimalXlsx(), 'ativos.xls')),
    /\.xlsx/i,
  )
  const tooBig = new Uint8Array(ASSET_IMPORT_SCHEMA_V1.limits.maxFileBytes + 1)
  await assert.rejects(readAndValidateAssetWorkbook(fileFrom(tooBig)), /limite de 10 MB/i)
})

test('preview detects external links and explicitly does not persist or call Skip Cloud', async () => {
  const bytes = minimalXlsx({ 'xl/externalLinks/externalLink1.xml': strToU8('<externalLink/>') })
  const report = await readAndValidateAssetWorkbook(fileFrom(bytes), {
    readWorkbook: fixtureReader,
    requiredSensorsByClass: { ROTATIVO: 1 },
  })
  assert.equal(report.safety.processingLocation, 'browser')
  assert.equal(report.safety.persisted, false)
  assert.equal(report.safety.writesToSkipCloud, false)
  assert.equal(report.archive.externalLinksDetected, true)
  assert.equal(report.homologationBlocked, true)
})
