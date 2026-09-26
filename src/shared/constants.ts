// Listas de opções compartilhadas entre o processo principal e a interface.
// O valor gravado no banco é o `value`; o `label` é o texto exibido.

export interface Opcao<T extends string = string> {
  value: T
  label: string
}

export const ETAPAS = [
  { value: 'novo', label: 'Novo' },
  { value: 'primeiro_contato', label: 'Primeiro contato' },
  { value: 'reuniao_agendada', label: 'Reunião agendada' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'proposta', label: 'Proposta' },
  { value: 'conta_aberta', label: 'Conta aberta' },
  { value: 'cliente_ativo', label: 'Cliente ativo' },
  { value: 'perdido', label: 'Perdido' }
] as const satisfies readonly Opcao[]
export type Etapa = (typeof ETAPAS)[number]['value']

export const ORIGENS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'site', label: 'Site' },
  { value: 'google_forms', label: 'Google Forms' },
  { value: 'outro', label: 'Outro' }
] as const satisfies readonly Opcao[]
export type Origem = (typeof ORIGENS)[number]['value']

export const FAIXAS_PATRIMONIO = [
  { value: 'ate_100k', label: 'Até R$ 100 mil' },
  { value: '100k_300k', label: 'R$ 100–300 mil' },
  { value: '300k_1m', label: 'R$ 300 mil–1 mi' },
  { value: '1m_3m', label: 'R$ 1–3 mi' },
  { value: '3m_10m', label: 'R$ 3–10 mi' },
  { value: 'acima_10m', label: 'Acima de R$ 10 mi' }
] as const satisfies readonly Opcao[]
export type FaixaPatrimonio = (typeof FAIXAS_PATRIMONIO)[number]['value']

export const FAIXAS_RENDA = [
  { value: 'ate_5k', label: 'Até R$ 5 mil/mês' },
  { value: '5k_15k', label: 'R$ 5–15 mil/mês' },
  { value: '15k_30k', label: 'R$ 15–30 mil/mês' },
  { value: '30k_60k', label: 'R$ 30–60 mil/mês' },
  { value: '60k_150k', label: 'R$ 60–150 mil/mês' },
  { value: 'acima_150k', label: 'Acima de R$ 150 mil/mês' }
] as const satisfies readonly Opcao[]
export type FaixaRenda = (typeof FAIXAS_RENDA)[number]['value']

export const SUITABILITY = [
  { value: 'nao_avaliado', label: 'Não avaliado' },
  { value: 'conservador', label: 'Conservador' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'arrojado', label: 'Arrojado' }
] as const satisfies readonly Opcao[]
export type Suitability = (typeof SUITABILITY)[number]['value']

export const OBJETIVOS = [
  { value: 'aposentadoria', label: 'Aposentadoria' },
  { value: 'reserva', label: 'Reserva de emergência' },
  { value: 'imovel', label: 'Imóvel' },
  { value: 'educacao_filhos', label: 'Educação dos filhos' },
  { value: 'sucessao', label: 'Sucessão' },
  { value: 'renda_passiva', label: 'Renda passiva' },
  { value: 'outro', label: 'Outro' }
] as const satisfies readonly Opcao[]
export type Objetivo = (typeof OBJETIVOS)[number]['value']

export const HORIZONTES = [
  { value: 'curto', label: 'Curto prazo' },
  { value: 'medio', label: 'Médio prazo' },
  { value: 'longo', label: 'Longo prazo' }
] as const satisfies readonly Opcao[]
export type Horizonte = (typeof HORIZONTES)[number]['value']

export const PRODUTOS = [
  { value: 'renda_fixa', label: 'Renda fixa' },
  { value: 'fundos', label: 'Fundos' },
  { value: 'fiis', label: 'FIIs' },
  { value: 'acoes', label: 'Ações' },
  { value: 'previdencia', label: 'Previdência' },
  { value: 'offshore', label: 'Offshore' },
  { value: 'seguros', label: 'Seguros' },
  { value: 'cambio', label: 'Câmbio' },
  { value: 'coe', label: 'COE' }
] as const satisfies readonly Opcao[]
export type Produto = (typeof PRODUTOS)[number]['value']

export const ESTADOS_CIVIS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'uniao_estavel', label: 'União estável' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' }
] as const satisfies readonly Opcao[]

export const BASES_LEGAIS = [
  { value: 'consentimento', label: 'Consentimento' },
  { value: 'execucao_contrato', label: 'Execução de contrato' },
  { value: 'legitimo_interesse', label: 'Legítimo interesse' },
  { value: 'obrigacao_legal', label: 'Obrigação legal' }
] as const satisfies readonly Opcao[]

export const TIPOS_INTERACAO = [
  { value: 'ligacao', label: 'Ligação' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'evento', label: 'Evento' },
  { value: 'outro', label: 'Outro' }
] as const satisfies readonly Opcao[]
export type TipoInteracao = (typeof TIPOS_INTERACAO)[number]['value']

export const TIPOS_TAREFA = [
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'revisao', label: 'Revisão' },
  { value: 'outro', label: 'Outro' }
] as const satisfies readonly Opcao[]
export type TipoTarefa = (typeof TIPOS_TAREFA)[number]['value']

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const

export const CORES_TAG = [
  '#64748b', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
] as const

export function rotulo(lista: readonly Opcao[], value: string | null | undefined): string {
  if (!value) return ''
  return lista.find((o) => o.value === value)?.label ?? value
}
