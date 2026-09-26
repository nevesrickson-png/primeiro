import { app, ipcMain } from 'electron'
import { caminhoBanco, pastaDados } from './paths'
import * as conn from './db/connection'
import * as leads from './db/leads'
import * as tags from './db/tags'
import * as interacoes from './db/interacoes'
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

  // Configurações
  handle('config:obter', config.obterConfiguracoes)
  handle('config:salvar', config.salvarConfiguracao)

  // Desenvolvimento
  handle('dev:gerarLeads', (qtd?: number) => {
    if (app.isPackaged) throw new Error('Disponível apenas em modo de desenvolvimento.')
    return gerarLeadsFicticios(qtd ?? 50)
  })
}
