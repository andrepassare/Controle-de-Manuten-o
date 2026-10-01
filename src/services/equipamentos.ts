import pb from '@/lib/pocketbase/client'
import { Equipamento } from '@/types/pcm'

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
}
