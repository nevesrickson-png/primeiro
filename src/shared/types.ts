import type {
  Etapa, TipoInteracao, TipoTarefa, FaixaPatrimonio, FaixaRenda, Horizonte, Objetivo, Origem, Produto, Suitability
} from './constants'

/** Campos editáveis de um lead (o que a ficha envia para criar/atualizar). */
export interface LeadInput {
  nome: string
  telefone: string | null
  whatsapp: string | null
  email: string | null
  cidade: string | null
  estado: string | null
  profissao: string | null
  empresa: string | null
  cargo: string | null
  data_nascimento: string | null
  estado_civil: string | null
  conjuge: string | null
  filhos: string | null
  instagram: string | null
  linkedin: string | null
  outras_redes: string | null
  faixa_patrimonio: FaixaPatrimonio | null
  faixa_renda: FaixaRenda | null
  suitability: Suitability
  data_suitability: string | null
  objetivos: Objetivo[]
  horizonte: Horizonte | null
  sucessao_notas: string | null
  produtos_interesse: Produto[]
  hobbies_rapport: string | null
  origem: Origem | null
  origem_detalhe: string | null
  indicado_por: string | null
  etapa: Etapa
  motivo_perda: string | null
  valor_potencial: number | null
  consentimento_lgpd: boolean
  data_consentimento: string | null
  base_legal: string | null
  observacoes: string | null
  tag_ids: string[]
}

export interface Lead extends Omit<LeadInput, 'tag_ids'> {
  id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  responsavel_id: string | null
  created_by: string | null
  tags: Tag[]
  indicado_por_nome: string | null
}

/** Linha enxuta usada na lista virtualizada. */
export interface LeadResumo {
  id: string
  nome: string
  telefone: string | null
  whatsapp: string | null
  email: string | null
  cidade: string | null
  estado: string | null
  empresa: string | null
  etapa: Etapa
  origem: Origem | null
  faixa_patrimonio: FaixaPatrimonio | null
  suitability: Suitability
  valor_potencial: number | null
  created_at: string
  updated_at: string
  tag_ids: string[]
  /** Quando o lead entrou na etapa atual (último registro em historico_etapas). */
  etapa_desde: string | null
  ultima_interacao: string | null
}

export type OrdenacaoLeads =
  | 'nome' | 'created_at' | 'updated_at' | 'valor_potencial' | 'etapa' | 'patrimonio' | 'ultima_interacao'

export interface FiltrosLeads {
  busca?: string
  etapas?: Etapa[]
  origens?: Origem[]
  faixas_patrimonio?: FaixaPatrimonio[]
  suitability?: Suitability[]
  tag_id?: string | null
  produto?: Produto | null
  ordenacao?: OrdenacaoLeads
  direcao?: 'asc' | 'desc'
}

export interface Tag {
  id: string
  nome: string
  cor: string
}

export interface AuthStatus {
  bancoExiste: boolean
  desbloqueado: boolean
  caminhoBanco: string
}

export interface AppInfo {
  versao: string
  dev: boolean
  pastaDados: string
}

/** Resultado padrão das chamadas IPC: erros viram mensagens em português. */
export type Resultado<T> = { ok: true; data: T } | { ok: false; erro: string }

export interface HistoricoEtapa {
  id: string
  lead_id: string
  etapa_de: Etapa | null
  etapa_para: Etapa
  data: string
}

export interface InteracaoInput {
  lead_id: string
  tipo: TipoInteracao
  /** Timestamp ISO (UTC). */
  data: string
  resumo: string | null
  proximo_passo: string | null
}

export interface Interacao extends InteracaoInput {
  id: string
  created_at: string
  updated_at: string
}

export interface LeadParado {
  id: string
  nome: string
  empresa: string | null
  etapa: Etapa
  valor_potencial: number | null
  ultima_atividade: string
}

export interface TarefaAtrasada {
  id: string
  titulo: string
  data_vencimento: string
  lead_id: string | null
  lead_nome: string | null
}

/** Período do painel em dias (0 = desde o início). */
export type PeriodoPainel = 30 | 90 | 180 | 365 | 0

export interface DadosPainel {
  periodo: PeriodoPainel
  diasParado: number
  kpis: {
    totalLeads: number
    novosNoPeriodo: number
    emNegociacao: number
    potencialFunil: number
    clientesAtivos: number
    /** Leads do período que chegaram a "conta aberta" ou além, sobre os leads do período (0–1). */
    taxaConversao: number | null
    parados: number
    tarefasAtrasadas: number
  }
  porOrigem: { origem: string; qtd: number; convertidos: number }[]
  /** Leads do período que alcançaram cada etapa (ou uma posterior). */
  conversao: { etapa: Etapa; qtd: number }[]
  perdidos: number
  potencialPorEtapa: { etapa: Etapa; qtd: number; valor: number }[]
  novosPorMes: { mes: string; qtd: number }[]
  parados: LeadParado[]
  tarefasAtrasadas: TarefaAtrasada[]
}

export interface TarefaInput {
  lead_id: string | null
  titulo: string
  /** AAAA-MM-DD */
  data_vencimento: string | null
  tipo: TipoTarefa
}

export interface Tarefa extends TarefaInput {
  id: string
  concluida: boolean
  concluida_em: string | null
  created_at: string
  updated_at: string
  lead_nome: string | null
}

export type FiltroTarefas = 'pendentes' | 'atrasadas' | 'hoje' | 'proximas' | 'sem_data' | 'concluidas'

export interface AplicacaoInput {
  lead_id: string
  produto: string
  valor: number | null
  /** AAAA-MM-DD */
  data_vencimento: string | null
}

export interface Aplicacao extends AplicacaoInput {
  id: string
  created_at: string
  updated_at: string
}

export interface Aniversariante {
  id: string
  nome: string
  data_nascimento: string
  /** Próximo aniversário (AAAA-MM-DD) e idade que vai completar. */
  proximo: string
  idade: number
  dias: number
  whatsapp: string | null
}

export interface Vencimento {
  tipo: 'aplicacao' | 'revisao'
  id: string
  lead_id: string
  lead_nome: string
  descricao: string
  valor: number | null
  data: string
  dias: number
}

export interface Agenda {
  hoje: string
  diasParado: number
  tarefasAtrasadas: Tarefa[]
  tarefasHoje: Tarefa[]
  tarefasProximas: Tarefa[]
  aniversariantes: Aniversariante[]
  vencimentos: Vencimento[]
  parados: { total: number; leads: LeadParado[] }
}

export interface ResumoLembretes {
  atrasadas: number
  hoje: number
  aniversariosHoje: number
  vencimentos7dias: number
}

export interface ResultadoSync {
  enviados: number
  recebidos: number
  criadosDaPlanilha: number
  removidosNaPlanilha: number
  importadosForms: number
  duplicadosForms: number
  conflitos: number
  avisos: string[]
}

export interface ConfigSync {
  url: string
  tokenDefinido: boolean
  ultima: string | null
  conflitosPendentes: number
}

export interface RegistroSync {
  id: string
  iniciado_em: string
  finalizado_em: string | null
  status: 'em_andamento' | 'sucesso' | 'parcial' | 'erro'
  enviados: number
  recebidos: number
  importados_forms: number
  conflitos: number
  mensagem: string | null
}

export interface ConflitoSync {
  id: string
  lead_id: string
  lead_nome: string | null
  campo: string
  campo_titulo: string
  valor_local: string
  valor_planilha: string
  updated_at_local: string
  updated_at_planilha: string
  vencedor: 'local' | 'planilha'
  created_at: string
}

export interface RevisaoInput {
  lead_id: string
  /** AAAA-MM-DD */
  data: string
  notas: string | null
  proxima_revisao: string | null
}
export interface Revisao extends RevisaoInput {
  id: string
  created_at: string
  updated_at: string
}

export interface NpsInput {
  lead_id: string
  data: string
  nota: number
  comentario: string | null
}
export interface Nps extends NpsInput {
  id: string
  created_at: string
  updated_at: string
}

export interface Indicacao {
  id: string
  nome: string
  etapa: Etapa
  valor_potencial: number | null
  created_at: string
}

export interface Backup {
  arquivo: string
  caminho: string
  tamanho: number
  data: string
}
