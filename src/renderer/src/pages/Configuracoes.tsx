import { FormEvent, ReactNode, useEffect, useState } from 'react'
import clsx from 'clsx'
import { KeyRound, Sparkles, Tag as TagIcon, Trash2, FolderOpen, Clock, Construction } from 'lucide-react'
import { CORES_TAG } from '@shared/constants'
import type { AppInfo, Tag } from '@shared/types'
import { api, chamar } from '../lib/api'
import { Confirmar, Field, TagChip } from '../components/ui'
import { useToast } from '../components/toast'

function Bloco({ icone, titulo, descricao, children }: { icone: ReactNode; titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-md bg-zinc-100 p-2 text-zinc-500 dark:bg-zinc-800">{icone}</div>
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          {descricao && <p className="text-xs text-zinc-500">{descricao}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function TrocarSenha() {
  const avisar = useToast()
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [conf, setConf] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (nova.length < 6) return avisar('A nova senha deve ter pelo menos 6 caracteres.', 'erro')
    if (nova !== conf) return avisar('A confirmação não confere.', 'erro')
    setSalvando(true)
    try {
      await chamar(api.auth.trocarSenha(atual, nova))
      avisar('Senha alterada. O banco foi recriptografado com a nova senha.')
      setAtual(''); setNova(''); setConf('')
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }
  return (
    <form onSubmit={enviar} className="grid grid-cols-3 gap-3">
      <Field label="Senha atual"><input type="password" className="input" value={atual} onChange={(e) => setAtual(e.target.value)} /></Field>
      <Field label="Nova senha"><input type="password" className="input" value={nova} onChange={(e) => setNova(e.target.value)} /></Field>
      <Field label="Confirmar nova senha"><input type="password" className="input" value={conf} onChange={(e) => setConf(e.target.value)} /></Field>
      <div className="col-span-3">
        <button className="btn-primary" disabled={salvando || !atual || !nova}>{salvando ? 'Alterando…' : 'Alterar senha'}</button>
      </div>
    </form>
  )
}

function GerenciarTags() {
  const avisar = useToast()
  const [tags, setTags] = useState<(Tag & { total: number })[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('')
  const [excluir, setExcluir] = useState<Tag | null>(null)

  const carregar = () => chamar(api.tags.listar()).then(setTags).catch((e) => avisar(e.message, 'erro'))
  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function salvar(id: string) {
    try {
      await chamar(api.tags.atualizar(id, nome, cor))
      setEditando(null)
      carregar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  if (!tags.length) return <p className="text-sm text-zinc-500">Nenhuma tag criada ainda. Crie tags pela ficha do lead.</p>
  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {tags.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 py-2">
          {editando === t.id ? (
            <div className="flex flex-1 items-center gap-2">
              <input className="input h-8 max-w-[200px]" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && salvar(t.id)} />
              <div className="flex gap-1">
                {CORES_TAG.map((c) => (
                  <button key={c} type="button" onClick={() => setCor(c)} className={clsx('h-5 w-5 rounded-full ring-offset-2 dark:ring-offset-zinc-900', cor === c && 'ring-2 ring-zinc-400')} style={{ backgroundColor: c }} />
                ))}
              </div>
              <button className="btn-primary btn-sm" onClick={() => salvar(t.id)}>Salvar</button>
              <button className="btn-ghost btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
            </div>
          ) : (
            <>
              <button className="flex items-center gap-2" onClick={() => { setEditando(t.id); setNome(t.nome); setCor(t.cor) }} title="Editar">
                <TagChip nome={t.nome} cor={t.cor} />
                <span className="text-xs text-zinc-400">{t.total} lead(s)</span>
              </button>
              <button className="btn-ghost btn-sm text-zinc-400 hover:text-red-600" onClick={() => setExcluir(t)} title="Excluir tag">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      ))}
      <Confirmar
        aberto={!!excluir}
        titulo="Excluir tag"
        mensagem={<>A tag <strong>{excluir?.nome}</strong> será removida de todos os leads.</>}
        textoConfirmar="Excluir"
        perigo
        onCancelar={() => setExcluir(null)}
        onConfirmar={async () => {
          await chamar(api.tags.excluir(excluir!.id)).catch((e) => avisar(e.message, 'erro'))
          setExcluir(null)
          carregar()
        }}
      />
    </div>
  )
}

export function Configuracoes() {
  const avisar = useToast()
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    chamar(api.app.info()).then(setInfo)
    chamar(api.config.obter()).then(setConfig)
  }, [])

  async function salvarDias(v: string) {
    const n = Math.max(1, Math.min(365, parseInt(v, 10) || 15))
    setConfig((c) => ({ ...c, dias_lead_parado: String(n) }))
    await chamar(api.config.salvar('dias_lead_parado', String(n))).catch((e) => avisar(e.message, 'erro'))
  }

  return (
    <div className="h-full overflow-auto">
      <header className="flex h-14 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
        <h1 className="text-base font-semibold">Configurações</h1>
      </header>
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Bloco icone={<KeyRound size={16} />} titulo="Senha do banco" descricao="A senha criptografa todo o arquivo crm.db. Não há como recuperá-la se for esquecida.">
          <TrocarSenha />
        </Bloco>

        <Bloco icone={<Clock size={16} />} titulo="Lead parado" descricao="Um lead é considerado parado quando fica sem atualização por esse número de dias (usado na tela Início e no Painel).">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={365}
              className="input w-24"
              value={config.dias_lead_parado ?? '15'}
              onChange={(e) => setConfig((c) => ({ ...c, dias_lead_parado: e.target.value }))}
              onBlur={(e) => salvarDias(e.target.value)}
            />
            <span className="text-sm text-zinc-500">dias</span>
          </div>
        </Bloco>

        <Bloco icone={<TagIcon size={16} />} titulo="Tags" descricao="Clique numa tag para renomear ou trocar a cor.">
          <GerenciarTags />
        </Bloco>

        <Bloco icone={<FolderOpen size={16} />} titulo="Pasta de dados" descricao="O banco e os backups ficam na mesma pasta do executável — leve a pasta inteira para trocar de computador.">
          <code className="block truncate rounded bg-zinc-100 px-2 py-1.5 text-xs dark:bg-zinc-800" title={info?.pastaDados}>{info?.pastaDados}</code>
        </Bloco>

        <Bloco icone={<Construction size={16} />} titulo="Em breve" descricao="Sincronização com Google Planilhas (Fase 5), backup/restauração e exportação CSV (Fase 6).">
          <p className="text-sm text-zinc-500">Essas opções aparecerão aqui nas próximas fases.</p>
        </Bloco>

        {info?.dev && (
          <Bloco icone={<Sparkles size={16} />} titulo="Desenvolvimento" descricao="Visível apenas em modo de desenvolvimento.">
            <button
              className="btn-secondary"
              disabled={gerando}
              onClick={async () => {
                setGerando(true)
                try {
                  const n = await chamar(api.dev.gerarLeads(50))
                  avisar(`${n} leads fictícios criados.`)
                } catch (e) {
                  avisar((e as Error).message, 'erro')
                } finally {
                  setGerando(false)
                }
              }}
            >
              <Sparkles size={14} /> {gerando ? 'Gerando…' : 'Gerar 50 leads fictícios'}
            </button>
          </Bloco>
        )}
      </div>
    </div>
  )
}
