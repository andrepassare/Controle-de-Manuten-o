import pb from '@/lib/pocketbase/client'
import { Equipe } from '@/types/pcm'

export const equipesService = {
  async getAll(): Promise<Equipe[]> {
    return await pb.collection('equipes').getFullList<Equipe>({
      sort: 'nome',
    })
  },

  async getById(id: string): Promise<Equipe> {
    return await pb.collection('equipes').getOne<Equipe>(id)
  },

  async create(data: Partial<Equipe>): Promise<Equipe> {
    return await pb.collection('equipes').create<Equipe>(data)
  },

  async update(id: string, data: Partial<Equipe>): Promise<Equipe> {
    return await pb.collection('equipes').update<Equipe>(id, data)
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('equipes').delete(id)
  },
}
