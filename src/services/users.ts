import pb from '@/lib/pocketbase/client'
import { User, Convite, UserRole } from '@/types/pcm'

export interface CreateInviteResponse {
  success: boolean
  invite: {
    id: string
    email: string
    role: UserRole
    token: string
    expira_em: string
    inviteUrl: string
    emailSent: boolean
    emailError?: string | null
  }
}

export const usersService = {
  async getAll(): Promise<User[]> {
    return await pb.collection('users').getFullList<User>({
      sort: '-created',
    })
  },

  async updateRole(userId: string, role: UserRole): Promise<User> {
    return await pb.collection('users').update<User>(userId, {
      role: role,
    })
  },

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return await pb.collection('users').update<User>(userId, data)
  },

  async deleteUser(userId: string): Promise<boolean> {
    return await pb.collection('users').delete(userId)
  },
}

export const convitesService = {
  async getAll(): Promise<Convite[]> {
    return await pb.collection('convites').getFullList<Convite>({
      sort: '-created',
    })
  },

  async getByToken(token: string): Promise<Convite | null> {
    try {
      const records = await pb.collection('convites').getList<Convite>(1, 1, {
        filter: `token = '${token}'`,
      })
      if (records.items.length > 0) {
        return records.items[0]
      }
      return null
    } catch {
      return null
    }
  },

  async createInvite(email: string, role: UserRole = 'operador'): Promise<CreateInviteResponse> {
    try {
      // First try the backend hook endpoint
      const res = await pb.send<CreateInviteResponse>('/backend/v1/invites', {
        method: 'POST',
        body: { email, role },
      })
      return res
    } catch {
      // Client-side fallback if hook endpoint is unreachable
      const token =
        Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
      const expiraEm = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const currentAuth = pb.authStore.record as { name?: string; email?: string } | null
      const criadoPor = currentAuth?.name || currentAuth?.email || 'Administrador'

      const record = await pb.collection('convites').create<Convite>({
        email: email.toLowerCase().trim(),
        token,
        role,
        expira_em: expiraEm,
        usado: false,
        criado_por: criadoPor,
      })

      const inviteUrl = `${window.location.origin}/cadastro/${token}`

      return {
        success: true,
        invite: {
          id: record.id,
          email: record.email,
          role: record.role || 'operador',
          token: record.token,
          expira_em: record.expira_em,
          inviteUrl: inviteUrl,
          emailSent: false,
          emailError:
            'Servidor de e-mail não configurado. Copie o link abaixo para enviar ao usuário.',
        },
      }
    }
  },

  async markAsUsed(id: string): Promise<Convite> {
    return await pb.collection('convites').update<Convite>(id, {
      usado: true,
      usado_em: new Date().toISOString(),
    })
  },
}
