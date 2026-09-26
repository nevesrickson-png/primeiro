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
