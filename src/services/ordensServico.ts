import pb from '@/lib/pocketbase/client'
import { OrdemServico } from '@/types/pcm'

export const ordensServicoService = {
  async getAll(): Promise<OrdemServico[]> {
    return await pb.collection('ordens_servico').getFullList<OrdemServico>({
      sort: '-created',
      expand: 'equipamento_id,equipe_id',
    })
  },

  async getById(id: string): Promise<OrdemServico> {
    return await pb.collection('ordens_servico').getOne<OrdemServico>(id, {
      expand: 'equipamento_id,equipe_id',
    })
  },

  async create(data: Partial<OrdemServico>): Promise<OrdemServico> {
    // Generate order number if not provided
    if (!data.numero) {
      const year = new Date().getFullYear()
      const randomCode = Math.floor(100 + Math.random() * 900)
      data.numero = `OS-${year}-${randomCode}`
    }
    if (!data.data_abertura) {
      data.data_abertura = new Date().toISOString()
    }
    return await pb.collection('ordens_servico').create<OrdemServico>(data, {
      expand: 'equipamento_id,equipe_id',
    })
  },

  async update(id: string, data: Partial<OrdemServico>): Promise<OrdemServico> {
    return await pb.collection('ordens_servico').update<OrdemServico>(id, data, {
      expand: 'equipamento_id,equipe_id',
    })
  },

  async fecharOS(id: string, observacoes?: string, tempoHoras?: number): Promise<OrdemServico> {
    return await pb.collection('ordens_servico').update<OrdemServico>(
      id,
      {
        status: 'fechada',
        data_fechamento: new Date().toISOString(),
        observacoes_fechamento: observacoes,
        ...(tempoHoras !== undefined ? { tempo_execucao_horas: tempoHoras } : {}),
      },
      {
        expand: 'equipamento_id,equipe_id',
      },
    )
  },

  async reabrirOS(id: string): Promise<OrdemServico> {
    return await pb.collection('ordens_servico').update<OrdemServico>(
      id,
      {
        status: 'aberta',
        data_fechamento: null,
      },
      {
        expand: 'equipamento_id,equipe_id',
      },
    )
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('ordens_servico').delete(id)
  },
}
