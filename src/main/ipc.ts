import { app, ipcMain, Notification, BrowserWindow, dialog, shell } from 'electron'
import { basename, join } from 'path'
import { caminhoBanco, pastaBackups, pastaDados } from './paths'
import * as conn from './db/connection'
import * as leads from './db/leads'
import * as tags from './db/tags'
import * as interacoes from './db/interacoes'
import { obterPainel } from './db/painel'
import * as tarefas from './db/tarefas'
import * as aplicacoes from './db/aplicacoes'
import { obterAgenda, resumoLembretes } from './db/agenda'
import * as sync from './sync'
import * as posvenda from './db/posvenda'
import * as backup from './backup'
import { salvarCsv } from './exportar'
import type { FiltrosLeads } from '@shared/types'
import * as config from './db/configuracoes'
import { gerarLeadsFicticios } from './db/seed'
import type { AppInfo, AuthStatus, Resultado } from '@shared/types'

/** Registra um handler que devolve { ok, data } ou { ok: false, erro } com mensagem legível. */
function handle<A extends unknown[], R>(canal: string, fn: (...args: A) => R): void {
  ipcMain.handle(canal, async (_e, ...args): Promise<Resultado<Awaited<R>>> => {
    try {
      return { ok: true, data: await fn(...(args as A)) }
    } catch (e) {
      const erro = e instanceof Error ? e.message : String(e)
      console.error(`[ipc:${canal}]`, e)
      return { ok: false, erro }
    }
  })
}

const CONFIGS_EDITAVEIS = ['dias_lead_parado']

function validarSenha(senha: string): void {
  if (typeof senha !== 'string' || senha.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.')
}

export function registrarIpc(): void {
  // App e autenticação
  handle('app:info', (): AppInfo => ({ versao: app.getVersion(), dev: !app.isPackaged, pastaDados: pastaDados() }))
  handle('auth:status', (): AuthStatus => ({
    bancoExiste: conn.bancoExiste(caminhoBanco()),
    desbloqueado: conn.estaDesbloqueado(),
    caminhoBanco: caminhoBanco()
  }))
  handle('auth:criar', (senha: string) => {
    validarSenha(senha)
    conn.criarBanco(caminhoBanco(), senha)
  })
  handle('auth:desbloquear', (senha: string) => conn.desbloquear(caminhoBanco(), senha))
  handle('auth:trocarSenha', (atual: string, nova: string) => {
    validarSenha(nova)
    conn.trocarSenha(atual, nova, caminhoBanco())
  })
  handle('auth:bloquear', () => conn.fecharBanco())

  // Leads
  handle('leads:listar', leads.listarLeads)
  handle('leads:obter', leads.obterLead)
  handle('leads:criar', leads.criarLead)
  handle('leads:atualizar', leads.atualizarLead)
  handle('leads:excluir', leads.excluirLead)
  handle('leads:buscarPorNome', leads.buscarLeadsPorNome)
  handle('leads:contar', leads.contarLeads)
  handle('leads:moverEtapa', leads.moverEtapa)
  handle('leads:historicoEtapas', leads.historicoEtapas)

  // Interações
  handle('interacoes:listar', interacoes.listarInteracoes)
  handle('interacoes:criar', interacoes.criarInteracao)
  handle('interacoes:atualizar', interacoes.atualizarInteracao)
  handle('interacoes:excluir', interacoes.excluirInteracao)

  // Tags
  handle('tags:listar', tags.listarTags)
  handle('tags:criar', tags.criarTag)
  handle('tags:atualizar', tags.atualizarTag)
  handle('tags:excluir', tags.excluirTag)

  // Tarefas
  handle('tarefas:listar', tarefas.listarTarefas)
  handle('tarefas:criar', tarefas.criarTarefa)
  handle('tarefas:atualizar', tarefas.atualizarTarefa)
  handle('tarefas:concluir', tarefas.concluirTarefa)
  handle('tarefas:excluir', tarefas.excluirTarefa)

  // Aplicações (sensível: só local)
  handle('aplicacoes:listar', aplicacoes.listarAplicacoes)
  handle('aplicacoes:criar', aplicacoes.criarAplicacao)
  handle('aplicacoes:atualizar', aplicacoes.atualizarAplicacao)
  handle('aplicacoes:excluir', aplicacoes.excluirAplicacao)

  // Início e lembretes
  handle('agenda:obter', obterAgenda)
  handle('lembretes:resumo', resumoLembretes)
  handle('lembretes:notificar', () => notificarLembretes())

  // Sincronização com Google Planilhas
  handle('sync:obterConfig', sync.obterConfigSync)
  handle('sync:salvarConfig', sync.salvarConfigSync)
  handle('sync:testar', sync.testarConexao)
  handle('sync:executar', sync.sincronizar)
  handle('sync:historico', sync.historicoSync)
  handle('sync:conflitos', sync.listarConflitos)
  handle('sync:resolverConflito', sync.resolverConflito)
  handle('sync:resolverTodos', sync.resolverTodosConflitos)

  // Pós-venda
  handle('posvenda:revisoes', posvenda.listarRevisoes)
  handle('posvenda:criarRevisao', posvenda.criarRevisao)
  handle('posvenda:atualizarRevisao', posvenda.atualizarRevisao)
  handle('posvenda:excluirRevisao', posvenda.excluirRevisao)
  handle('posvenda:nps', posvenda.listarNps)
  handle('posvenda:criarNps', posvenda.criarNps)
  handle('posvenda:excluirNps', posvenda.excluirNps)
  handle('posvenda:resumoNps', posvenda.resumoNps)
  handle('posvenda:indicacoes', posvenda.indicacoesRecebidas)

  // Backup e restauração
  handle('backup:listar', backup.listarBackups)
  handle('backup:fazer', backup.fazerBackup)
  handle('backup:restaurar', (arquivo: string) => {
    // Só aceita arquivos da pasta de backups (pelo nome), nunca um caminho arbitrário vindo da interface.
    if (basename(arquivo) !== arquivo) throw new Error('Arquivo inválido.')
    backup.restaurarBackup(join(pastaBackups(), arquivo))
  })
  handle('backup:restaurarArquivo', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const r = await dialog.showOpenDialog(win, {
      title: 'Restaurar backup do CRM',
      defaultPath: pastaBackups(),
      filters: [{ name: 'Banco do CRM', extensions: ['db'] }],
      properties: ['openFile']
    })
    if (r.canceled || !r.filePaths[0]) return false
    backup.restaurarBackup(r.filePaths[0])
    return true
  })
  handle('backup:abrirPasta', () => shell.openPath(pastaBackups()))

  // Exportação
  handle('exportar:leadsCsv', async (filtros: FiltrosLeads, incluirSensiveis: boolean) => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const hoje = new Date().toISOString().slice(0, 10)
    const r = await dialog.showSaveDialog(win, {
      title: 'Exportar leads (CSV)',
      defaultPath: join(app.getPath('documents'), `leads-${hoje}.csv`),
      filters: [{ name: 'CSV (Excel)', extensions: ['csv'] }]
    })
    if (r.canceled || !r.filePath) return null
    const total = salvarCsv(r.filePath, filtros ?? {}, !!incluirSensiveis)
    return { total, caminho: r.filePath }
  })

  // Painel
  handle('painel:obter', obterPainel)

  // Configurações
  handle('config:obter', () => {
    // O token da planilha nunca vai para a interface.
    const { sync_token: _token, ...resto } = config.obterConfiguracoes()
    return resto
  })
  handle('config:salvar', (chave: string, valor: string) => {
    if (!CONFIGS_EDITAVEIS.includes(chave)) throw new Error('Configuração não editável.')
    config.salvarConfiguracao(chave, valor)
  })

  // Desenvolvimento
  handle('dev:gerarLeads', (qtd?: number) => {
    if (app.isPackaged) throw new Error('Disponível apenas em modo de desenvolvimento.')
    return gerarLeadsFicticios(qtd ?? 50)
  })
}

/** Notificação nativa do sistema com o resumo do dia (chamada ao desbloquear o app). */
function notificarLembretes(): boolean {
  if (!Notification.isSupported()) return false
  const r = resumoLembretes()
  const partes: string[] = []
  if (r.atrasadas) partes.push(`${r.atrasadas} tarefa(s) atrasada(s)`)
  if (r.hoje) partes.push(`${r.hoje} tarefa(s) para hoje`)
  if (r.aniversariosHoje) partes.push(`${r.aniversariosHoje} aniversariante(s) hoje`)
  if (r.vencimentos7dias) partes.push(`${r.vencimentos7dias} vencimento(s) nos próximos 7 dias`)
  if (!partes.length) return false
  const n = new Notification({ title: 'CRM Assessor — sua agenda', body: partes.join(' · ') })
  n.on('click', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
      win.webContents.send('navegar', '/inicio')
    }
  })
  n.show()
  return true
}
