export type UserRole = 'admin' | 'operador'

export interface User {
  id: string
  email: string
  name?: string
  role?: UserRole
  phone?: string
  avatar?: string
  created: string
  updated: string
}

export type EquipamentoTipo =
  | 'Mecânico'
  | 'Elétrico'
  | 'Hidráulico'
  | 'Pneumático'
  | 'Instrumentação'
  | 'Automação'
  | 'Outro'

export type EquipamentoStatus = 'Operacional' | 'Em Manutenção' | 'Alerta' | 'Parado'
export type EquipamentoCriticidade = 'A' | 'B' | 'C'

export interface Equipamento {
  id: string
  nome?: string
  tag: string
  setor?: string
  tipo?: EquipamentoTipo
  status?: EquipamentoStatus
  criticidade?: EquipamentoCriticidade
  fabricante?: string
  modelo?: string
  observacoes?: string
  descricao?: string
  codigo_equipamento?: string
  codigo_mis?: string
  familia_codigo?: string
  familia_descricao?: string
  sensores?: boolean
  responsavel?: string
  created: string
  updated: string
}

export type EquipeEspecialidade =
  | 'Mecânica'
  | 'Elétrica'
  | 'Preditiva'
  | 'Instrumentação'
  | 'Caldeiraria'
  | 'Lubrificação'
  | 'Geral'

export interface Equipe {
  id: string
  nome: string
  especialidade: EquipeEspecialidade
  lider?: string
  integrantes?: string
  turno?: string
  descricao?: string
  created: string
  updated: string
}

export type OSStatus = 'aberta' | 'em_andamento' | 'fechada' | 'cancelada'
export type OSCategoria =
  | 'Mecânica'
  | 'Elétrica'
  | 'Instrumentação'
  | 'Lubrificação'
  | 'Caldeiraria'
  | 'Civil'
  | 'Automação'
  | 'Geral'

export type OSModalidade =
  | 'Preditiva'
  | 'Preventiva'
  | 'Corretiva Programada'
  | 'Corretiva Emergencial'
  | 'Melhoria'
  | 'Inspeção'

export type OSPrioridade = 'Baixa' | 'Média' | 'Alta' | 'Urgente'

export interface OrdemServico {
  id: string
  numero: string
  titulo: string
  descricao?: string
  status: OSStatus
  categoria: OSCategoria
  modalidade: OSModalidade
  prioridade?: OSPrioridade
  equipamento_id?: string
  equipe_id?: string
  responsavel?: string
  data_abertura?: string
  data_fechamento?: string
  tempo_execucao_horas?: number
  custo_estimado?: number
  observacoes_fechamento?: string
  created: string
  updated: string
  expand?: {
    equipamento_id?: Equipamento
    equipe_id?: Equipe
  }
}

export interface Convite {
  id: string
  email: string
  token: string
  role?: UserRole
  expira_em: string
  usado?: boolean
  usado_em?: string
  criado_por?: string
  created: string
  updated: string
}
