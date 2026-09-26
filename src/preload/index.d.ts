import type { Etapa } from '../shared/constants'
import type {
  Agenda, Anexo, Aplicacao, Campanha, CampanhaInput, ConfigEmail, ConfigEmailInput, EnvioCampanha, PreviaDestinatarios, ProgressoCampanha, Backup, Indicacao, Nps, NpsInput, Revisao, RevisaoInput, ConfigSync, ConflitoSync, RegistroSync, ResultadoSync, AplicacaoInput, AppInfo, AuthStatus, DadosPainel, FiltroTarefas, ResumoLembretes, Tarefa, TarefaInput, FiltrosLeads, PeriodoPainel, HistoricoEtapa, Interacao, InteracaoInput, Lead, LeadInput, LeadResumo,
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
  posvenda: {
    revisoes(leadId: string): P<Revisao[]>
    criarRevisao(dados: RevisaoInput): P<Revisao>
    atualizarRevisao(id: string, dados: RevisaoInput): P<Revisao>
    excluirRevisao(id: string): P<void>
    nps(leadId: string): P<Nps[]>
    criarNps(dados: NpsInput): P<Nps>
    excluirNps(id: string): P<void>
    resumoNps(): P<{ nps: number | null; respostas: number; promotores: number; neutros: number; detratores: number }>
    indicacoes(leadId: string): P<Indicacao[]>
  }
  backup: {
    listar(): P<Backup[]>
    fazer(): P<Backup>
    restaurar(arquivo: string): P<void>
    restaurarArquivo(): P<boolean>
    abrirPasta(): P<string>
  }
  email: {
    obterConfig(): P<ConfigEmail>
    salvarConfig(dados: ConfigEmailInput): P<void>
    testarConexao(): P<void>
    enviadosHoje(): P<number>
    escolherAnexos(): P<Anexo[]>
  }
  campanhas: {
    listar(): P<Campanha[]>
    obter(id: string): P<Campanha>
    salvar(id: string | null, dados: CampanhaInput): P<Campanha>
    duplicar(id: string): P<Campanha>
    excluir(id: string): P<void>
    previa(dados: Pick<CampanhaInput, 'publico' | 'filtros' | 'incluir_sem_consentimento'>): P<PreviaDestinatarios>
    enviarTeste(dados: CampanhaInput, para?: string): P<string>
    iniciar(id: string): P<Campanha>
    pausar(id: string): P<Campanha>
    retomar(id: string): P<Campanha>
    cancelar(id: string): P<Campanha>
    envios(id: string, status?: string): P<EnvioCampanha[]>
    emAndamento(): P<string | null>
    aoProgredir(fn: (p: ProgressoCampanha) => void): () => void
  }
  descadastro: {
    definir(leadId: string, descadastrado: boolean): P<void>
    emails(texto: string): P<{ marcados: number; naoEncontrados: string[] }>
    listar(): P<{ id: string; nome: string; email: string | null; email_descadastrado_em: string }[]>
  }
  exportar: { leadsCsv(filtros: FiltrosLeads, incluirSensiveis: boolean): P<{ total: number; caminho: string } | null> }
  sync: {
    obterConfig(): P<ConfigSync>
    salvarConfig(url: string, token?: string): P<void>
    testar(url?: string, token?: string): P<{ planilha: string }>
    executar(): P<ResultadoSync>
    historico(): P<RegistroSync[]>
    conflitos(): P<ConflitoSync[]>
    resolverConflito(id: string, acao: 'manter' | 'usar_outro'): P<void>
    resolverTodos(): P<number>
  }
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
