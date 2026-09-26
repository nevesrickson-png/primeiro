import { contextBridge, ipcRenderer } from 'electron'

const inv = (canal: string) => (...args: unknown[]) => ipcRenderer.invoke(canal, ...args)

// Ponte exposta ao renderer. Os tipos ficam em index.d.ts.
const api = {
  app: { info: inv('app:info') },
  auth: {
    status: inv('auth:status'),
    criar: inv('auth:criar'),
    desbloquear: inv('auth:desbloquear'),
    trocarSenha: inv('auth:trocarSenha'),
    bloquear: inv('auth:bloquear')
  },
  leads: {
    listar: inv('leads:listar'),
    obter: inv('leads:obter'),
    criar: inv('leads:criar'),
    atualizar: inv('leads:atualizar'),
    excluir: inv('leads:excluir'),
    buscarPorNome: inv('leads:buscarPorNome'),
    contar: inv('leads:contar'),
    moverEtapa: inv('leads:moverEtapa'),
    historicoEtapas: inv('leads:historicoEtapas')
  },
  interacoes: {
    listar: inv('interacoes:listar'),
    criar: inv('interacoes:criar'),
    atualizar: inv('interacoes:atualizar'),
    excluir: inv('interacoes:excluir')
  },
  tags: {
    listar: inv('tags:listar'),
    criar: inv('tags:criar'),
    atualizar: inv('tags:atualizar'),
    excluir: inv('tags:excluir')
  },
  painel: { obter: inv('painel:obter') },
  tarefas: {
    listar: inv('tarefas:listar'),
    criar: inv('tarefas:criar'),
    atualizar: inv('tarefas:atualizar'),
    concluir: inv('tarefas:concluir'),
    excluir: inv('tarefas:excluir')
  },
  aplicacoes: {
    listar: inv('aplicacoes:listar'),
    criar: inv('aplicacoes:criar'),
    atualizar: inv('aplicacoes:atualizar'),
    excluir: inv('aplicacoes:excluir')
  },
  agenda: { obter: inv('agenda:obter') },
  posvenda: {
    revisoes: inv('posvenda:revisoes'),
    criarRevisao: inv('posvenda:criarRevisao'),
    atualizarRevisao: inv('posvenda:atualizarRevisao'),
    excluirRevisao: inv('posvenda:excluirRevisao'),
    nps: inv('posvenda:nps'),
    criarNps: inv('posvenda:criarNps'),
    excluirNps: inv('posvenda:excluirNps'),
    resumoNps: inv('posvenda:resumoNps'),
    indicacoes: inv('posvenda:indicacoes')
  },
  backup: {
    listar: inv('backup:listar'),
    fazer: inv('backup:fazer'),
    restaurar: inv('backup:restaurar'),
    restaurarArquivo: inv('backup:restaurarArquivo'),
    abrirPasta: inv('backup:abrirPasta')
  },
  exportar: { leadsCsv: inv('exportar:leadsCsv') },
  email: {
    obterConfig: inv('email:obterConfig'),
    salvarConfig: inv('email:salvarConfig'),
    testarConexao: inv('email:testarConexao'),
    enviadosHoje: inv('email:enviadosHoje'),
    escolherAnexos: inv('email:escolherAnexos')
  },
  campanhas: {
    listar: inv('campanhas:listar'),
    obter: inv('campanhas:obter'),
    salvar: inv('campanhas:salvar'),
    duplicar: inv('campanhas:duplicar'),
    excluir: inv('campanhas:excluir'),
    previa: inv('campanhas:previa'),
    enviarTeste: inv('campanhas:enviarTeste'),
    iniciar: inv('campanhas:iniciar'),
    pausar: inv('campanhas:pausar'),
    retomar: inv('campanhas:retomar'),
    cancelar: inv('campanhas:cancelar'),
    envios: inv('campanhas:envios'),
    emAndamento: inv('campanhas:emAndamento'),
    /** Progresso do envio em tempo real. */
    aoProgredir: (fn: (p: unknown) => void) => {
      const h = (_e: unknown, p: unknown) => fn(p)
      ipcRenderer.on('campanha:progresso', h)
      return () => ipcRenderer.removeListener('campanha:progresso', h)
    }
  },
  descadastro: {
    definir: inv('descadastro:definir'),
    emails: inv('descadastro:emails'),
    listar: inv('descadastro:listar')
  },
  sync: {
    obterConfig: inv('sync:obterConfig'),
    salvarConfig: inv('sync:salvarConfig'),
    testar: inv('sync:testar'),
    executar: inv('sync:executar'),
    historico: inv('sync:historico'),
    conflitos: inv('sync:conflitos'),
    resolverConflito: inv('sync:resolverConflito'),
    resolverTodos: inv('sync:resolverTodos')
  },
  lembretes: {
    resumo: inv('lembretes:resumo'),
    notificar: inv('lembretes:notificar')
  },
  /** Recebe pedidos de navegação do processo principal (ex.: clique na notificação). */
  aoNavegar: (fn: (rota: string) => void) => {
    const h = (_e: unknown, rota: string) => fn(rota)
    ipcRenderer.on('navegar', h)
    return () => ipcRenderer.removeListener('navegar', h)
  },
  config: {
    obter: inv('config:obter'),
    salvar: inv('config:salvar')
  },
  dev: { gerarLeads: inv('dev:gerarLeads') }
}

contextBridge.exposeInMainWorld('api', api)
