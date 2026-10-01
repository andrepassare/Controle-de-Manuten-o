import pb from '@/lib/pocketbase/client'
import { Equipamento, OrdemServico } from '@/types/pcm'

export interface ImportItemInput {
  tag: string
  descricao?: string
  codigo_equipamento?: string
  codigo_mis?: string
  familia_codigo?: string
  familia_descricao?: string
  criticidade?: 'A' | 'B' | 'C'
  sensores?: boolean
  responsavel?: string
  nome?: string
  setor?: string
  tipo?: any
  status?: any
  observacoes?: string
}

export interface ImportProgress {
  current: number
  total: number
  stage: 'preparing' | 'deleting' | 'unlinking_os' | 'saving' | 'done' | 'error'
  statusText: string
  successCount: number
  errorCount: number
  errors: Array<{ rowNumber?: number; tag?: string; message: string }>
}

export const equipamentosService = {
  async getAll(): Promise<Equipamento[]> {
    return await pb.collection('equipamentos').getFullList<Equipamento>({
      sort: 'tag',
    })
  },

  async getById(id: string): Promise<Equipamento> {
    return await pb.collection('equipamentos').getOne<Equipamento>(id)
  },

  async create(data: Partial<Equipamento>): Promise<Equipamento> {
    return await pb.collection('equipamentos').create<Equipamento>(data)
  },

  async update(id: string, data: Partial<Equipamento>): Promise<Equipamento> {
    return await pb.collection('equipamentos').update<Equipamento>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('equipamentos').delete(id)
  },

  /**
   * Verifica quantas ordens de serviço estão vinculadas a equipamentos existentes
   */
  async getLinkedOSCount(): Promise<{ totalOSWithEquip: number; affectedEquipIds: Set<string> }> {
    try {
      const ordens = await pb.collection('ordens_servico').getFullList<OrdemServico>({
        filter: "equipamento_id != ''",
        fields: 'id,equipamento_id',
      })
      const affectedEquipIds = new Set<string>()
      ordens.forEach((o) => {
        if (o.equipamento_id) affectedEquipIds.add(o.equipamento_id)
      })
      return {
        totalOSWithEquip: ordens.length,
        affectedEquipIds,
      }
    } catch (err) {
      console.warn('Erro ao verificar OS vinculadas:', err)
      return { totalOSWithEquip: 0, affectedEquipIds: new Set() }
    }
  },

  /**
   * Desvincula com segurança as ordens de serviço vinculadas a equipamentos que serão removidos
   */
  async unlinkAllEquipamentoOS(
    onProgress?: (count: number, total: number) => void,
  ): Promise<number> {
    const ordens = await pb.collection('ordens_servico').getFullList<OrdemServico>({
      filter: "equipamento_id != ''",
      fields: 'id,equipamento_id',
    })
    const total = ordens.length
    let unlinked = 0

    // Processar em pequenos lotes paralelos
    const BATCH_SIZE = 10
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const slice = ordens.slice(i, i + BATCH_SIZE)
      await Promise.all(
        slice.map(async (os) => {
          try {
            await pb.collection('ordens_servico').update(os.id, {
              equipamento_id: null,
            })
            unlinked++
            onProgress?.(unlinked, total)
          } catch (e) {
            console.error(`Falha ao desvincular OS ${os.id}:`, e)
          }
        }),
      )
    }

    return unlinked
  },

  /**
   * Importação em lote: modo "Substituir base atual" ou "Atualizar/adicionar por TAG"
   */
  async importBatch(
    items: ImportItemInput[],
    mode: 'replace' | 'upsert',
    onProgress?: (progress: ImportProgress) => void,
  ): Promise<{
    successCount: number
    errorCount: number
    errors: Array<{ rowNumber?: number; tag?: string; message: string }>
  }> {
    const errors: Array<{ rowNumber?: number; tag?: string; message: string }> = []
    let successCount = 0
    let errorCount = 0

    // 1. Carregar equipamentos existentes
    const existing = await this.getAll()
    const existingByTag = new Map<string, Equipamento>()
    existing.forEach((eq) => {
      const normalized = (eq.tag || '').trim().toUpperCase()
      if (normalized && !existingByTag.has(normalized)) {
        existingByTag.set(normalized, eq)
      }
    })

    if (mode === 'replace') {
      // 1.1 Desvincular OS de equipamentos existentes para integridade referencial
      onProgress?.({
        current: 0,
        total: existing.length,
        stage: 'unlinking_os',
        statusText: 'Desvinculando ordens de serviço para segurança de integridade...',
        successCount: 0,
        errorCount: 0,
        errors: [],
      })

      await this.unlinkAllEquipamentoOS()

      // 1.2 Apagar equipamentos existentes em lotes
      const toDelete = existing
      const deleteTotal = toDelete.length
      onProgress?.({
        current: 0,
        total: deleteTotal,
        stage: 'deleting',
        statusText: `Removendo ${deleteTotal} equipamentos da base atual...`,
        successCount: 0,
        errorCount: 0,
        errors: [],
      })

      const DELETE_CHUNK = 10
      for (let i = 0; i < deleteTotal; i += DELETE_CHUNK) {
        const chunk = toDelete.slice(i, i + DELETE_CHUNK)
        await Promise.all(
          chunk.map(async (eq) => {
            try {
              await pb.collection('equipamentos').delete(eq.id)
            } catch (err) {
              console.warn(`Falha ao excluir equipamento ${eq.tag}:`, err)
            }
          }),
        )
        onProgress?.({
          current: Math.min(i + DELETE_CHUNK, deleteTotal),
          total: deleteTotal,
          stage: 'deleting',
          statusText: `Removendo equipamentos: ${Math.min(i + DELETE_CHUNK, deleteTotal)} de ${deleteTotal}...`,
          successCount: 0,
          errorCount: 0,
          errors: [],
        })
      }

      // Limpar mapa local após exclusão
      existingByTag.clear()
    }

    // 2. Gravar novos itens em lotes
    const totalItems = items.length
    onProgress?.({
      current: 0,
      total: totalItems,
      stage: 'saving',
      statusText: `Gravando novos equipamentos no Skip Cloud (0/${totalItems})...`,
      successCount: 0,
      errorCount: 0,
      errors: [],
    })

    const BATCH_SIZE = 8
    for (let i = 0; i < totalItems; i += BATCH_SIZE) {
      const chunk = items.slice(i, i + BATCH_SIZE)

      await Promise.all(
        chunk.map(async (item, chunkIndex) => {
          const rowNumber = i + chunkIndex + 1
          const tag = (item.tag || '').trim()

          if (!tag) {
            errorCount++
            errors.push({
              rowNumber,
              tag: 'Vazio',
              message: 'TAG ausente ou vazia.',
            })
            return
          }

          // Se criticidade vier inválida ou diferente de A/B/C
          let criticidade: 'A' | 'B' | 'C' | undefined = undefined
          if (item.criticidade) {
            const critUpper = String(item.criticidade).trim().toUpperCase()
            if (['A', 'B', 'C'].includes(critUpper)) {
              criticidade = critUpper as 'A' | 'B' | 'C'
            } else {
              errorCount++
              errors.push({
                rowNumber,
                tag,
                message: `Criticidade inválida "${item.criticidade}" (esperado A, B ou C).`,
              })
              return
            }
          }

          const payload: Partial<Equipamento> = {
            tag,
            nome: item.nome || item.descricao || tag,
            descricao: item.descricao || undefined,
            codigo_equipamento: item.codigo_equipamento || undefined,
            codigo_mis: item.codigo_mis || undefined,
            familia_codigo: item.familia_codigo || undefined,
            familia_descricao: item.familia_descricao || undefined,
            criticidade: criticidade || undefined,
            sensores: Boolean(item.sensores),
            responsavel: item.responsavel || undefined,
            setor: item.setor || (item.familia_descricao ? item.familia_descricao : 'Geral'),
            status: item.status || 'Operacional',
            tipo: item.tipo || 'Mecânico',
          }

          try {
            const existingEq = existingByTag.get(tag.toUpperCase())
            if (existingEq) {
              await pb.collection('equipamentos').update(existingEq.id, payload)
            } else {
              const created = await pb.collection('equipamentos').create<Equipamento>(payload)
              existingByTag.set(tag.toUpperCase(), created)
            }
            successCount++
          } catch (err: any) {
            errorCount++
            const msg =
              err?.data?.message || err?.message || 'Erro ao persistir equipamento no banco.'
            errors.push({
              rowNumber,
              tag,
              message: msg,
            })
          }
        }),
      )

      onProgress?.({
        current: Math.min(i + BATCH_SIZE, totalItems),
        total: totalItems,
        stage: 'saving',
        statusText: `Processando equipamentos: ${Math.min(i + BATCH_SIZE, totalItems)} de ${totalItems}...`,
        successCount,
        errorCount,
        errors,
      })

      // Pequeno respiro para não travar o loop de render
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    onProgress?.({
      current: totalItems,
      total: totalItems,
      stage: 'done',
      statusText: 'Importação concluída com sucesso!',
      successCount,
      errorCount,
      errors,
    })

    return {
      successCount,
      errorCount,
      errors,
    }
  },
}
