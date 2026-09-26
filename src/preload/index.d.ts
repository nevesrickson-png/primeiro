import type { Etapa } from '../shared/constants'
import type {
  Agenda, Aplicacao, AplicacaoInput, AppInfo, AuthStatus, DadosPainel, FiltroTarefas, ResumoLembretes, Tarefa, TarefaInput, FiltrosLeads, PeriodoPainel, HistoricoEtapa, Interacao, InteracaoInput, Lead, LeadInput, LeadResumo,
  Resultado, Tag
} from '../shared/types'

type P<T> = Promise<Resultado<T>>

export interface Api {
  app: { info(): P<AppInfo> }
  auth: {
    status(): P<AuthStatus>
    criar(senha: string): P<void>
    desbloquear(senha: string): P<void>
    trocarSenha(atual: string, nova: string): P<void>
    bloquear(): P<void>
  }
  leads: {
    listar(filtros: FiltrosLeads): P<LeadResumo[]>
    obter(id: string): P<Lead | null>
    criar(dados: LeadInput): P<Lead>
    atualizar(id: string, dados: LeadInput): P<Lead>
    excluir(id: string): P<void>
    buscarPorNome(texto: string, excluirId?: string): P<{ id: string; nome: string; cidade: string | null }[]>
    contar(): P<number>
    moverEtapa(id: string, etapa: Etapa, motivoPerda?: string | null): P<void>
    historicoEtapas(leadId: string): P<HistoricoEtapa[]>
  }
  interacoes: {
    listar(leadId: string): P<Interacao[]>
    criar(dados: InteracaoInput): P<Interacao>
    atualizar(id: string, dados: InteracaoInput): P<Interacao>
    excluir(id: string): P<void>
  }
  tags: {
    listar(): P<(Tag & { total: number })[]>
    criar(nome: string, cor: string): P<Tag>
    atualizar(id: string, nome: string, cor: string): P<void>
    excluir(id: string): P<void>
  }
  painel: { obter(periodo: PeriodoPainel): P<DadosPainel> }
  tarefas: {
    listar(opcoes: { filtro?: FiltroTarefas; lead_id?: string; limite?: number }): P<Tarefa[]>
    criar(dados: TarefaInput): P<Tarefa>
    atualizar(id: string, dados: TarefaInput): P<Tarefa>
    concluir(id: string, concluida: boolean): P<Tarefa>
    excluir(id: string): P<void>
  }
  aplicacoes: {
    listar(leadId: string): P<Aplicacao[]>
    criar(dados: AplicacaoInput): P<Aplicacao>
    atualizar(id: string, dados: AplicacaoInput): P<Aplicacao>
    excluir(id: string): P<void>
  }
  agenda: { obter(): P<Agenda> }
  lembretes: {
    resumo(): P<ResumoLembretes>
    notificar(): P<boolean>
  }
  aoNavegar(fn: (rota: string) => void): () => void
  config: {
    obter(): P<Record<string, string>>
    salvar(chave: string, valor: string): P<void>
  }
  dev: { gerarLeads(qtd?: number): P<number> }
}

declare global {
  interface Window {
    api: Api
  }
}
