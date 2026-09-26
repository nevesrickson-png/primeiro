import { useCallback, useEffect, useState } from 'react'
import { DatabaseBackup, Download, FolderOpen, History, Upload } from 'lucide-react'
import type { Backup, FiltrosLeads } from '@shared/types'
import { api, chamar } from '../lib/api'
import { dataHora } from '../lib/format'
import { Confirmar, Modal, Toggle } from './ui'
import { useToast } from './toast'

const tamanho = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.ceil(b / 1024)} KB`)

function rotuloBackup(b: Backup): string {
  const m = /^crm-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})(-\d+)?\.db$/.exec(b.arquivo)
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`
  if (b.arquivo.includes('antes-restauracao')) return `Cópia antes de restaurar · ${dataHora(b.data)}`
  return b.arquivo
}

/** Configurações → Backup e restauração. */
export function ConfigBackup() {
  const avisar = useToast()
  const [backups, setBackups] = useState<Backup[]>([])
  const [restaurar, setRestaurar] = useState<Backup | null>(null)
  const [verTodos, setVerTodos] = useState(false)

  const carregar = useCallback(() => chamar(api.backup.listar()).then(setBackups).catch((e) => avisar(e.message, 'erro')), [avisar])
  useEffect(() => {
    carregar()
  }, [carregar])

  async function fazer() {
    try {
      const b = await chamar(api.backup.fazer())
      avisar(`Backup criado: ${b.arquivo}`)
      carregar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  // Depois de restaurar, o banco fica bloqueado: recarrega a interface para pedir a senha.
  const bloquearERecarregar = () => window.location.reload()

  async function restaurarDeArquivo() {
    try {
      if (await chamar(api.backup.restaurarArquivo())) bloquearERecarregar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  const visiveis = verTodos ? backups : backups.slice(0, 5)

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Um backup automático (criptografado, com a mesma senha) é feito toda vez que o app é fechado. São mantidos os 10 mais recentes na pasta <code>backups</code>, ao lado do banco.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={fazer}><DatabaseBackup size={14} /> Fazer backup agora</button>
        <button className="btn-secondary" onClick={restaurarDeArquivo}><Upload size={14} /> Restaurar de um arquivo…</button>
        <button className="btn-ghost" onClick={() => api.backup.abrirPasta()}><FolderOpen size={14} /> Abrir pasta</button>
      </div>
      {backups.length > 0 && (
        <div className="divide-y divide-zinc-100 rounded-md border border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800">
          {visiveis.map((b) => (
            <div key={b.arquivo} className="flex items-center gap-3 px-3 py-1.5 text-sm">
              <History size={14} className="shrink-0 text-zinc-400" />
              <span className="flex-1 tabular-nums">{rotuloBackup(b)}</span>
              <span className="text-xs text-zinc-400">{tamanho(b.tamanho)}</span>
              <button className="btn-ghost btn-sm" onClick={() => setRestaurar(b)}>Restaurar</button>
            </div>
          ))}
          {backups.length > 5 && (
            <button className="w-full px-3 py-1.5 text-left text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50" onClick={() => setVerTodos((v) => !v)}>
              {verTodos ? 'Mostrar menos' : `Ver todos (${backups.length})`}
            </button>
          )}
        </div>
      )}
      <Confirmar
        aberto={!!restaurar}
        titulo="Restaurar backup"
        textoConfirmar="Restaurar"
        perigo
        mensagem={
          <div className="space-y-2">
            <p>O banco atual será substituído pelo backup de <strong>{restaurar && rotuloBackup(restaurar)}</strong>. Uma cópia do banco atual é guardada antes, na pasta de backups.</p>
            <p>Depois o app pede a senha: use a senha que o banco tinha <strong>na data do backup</strong>.</p>
          </div>
        }
        onCancelar={() => setRestaurar(null)}
        onConfirmar={async () => {
          try {
            await chamar(api.backup.restaurar(restaurar!.arquivo))
            bloquearERecarregar()
          } catch (e) {
            avisar((e as Error).message, 'erro')
            setRestaurar(null)
          }
        }}
      />
    </div>
  )
}

/** Diálogo de exportação CSV (usado na lista de leads e em Configurações). */
export function ExportarCsv({ aberto, filtros, total, onFechar }: { aberto: boolean; filtros: FiltrosLeads; total?: number; onFechar: () => void }) {
  const avisar = useToast()
  const [sensiveis, setSensiveis] = useState(false)
  const [exportando, setExportando] = useState(false)
  useEffect(() => {
    if (aberto) setSensiveis(false)
  }, [aberto])

  async function exportar() {
    setExportando(true)
    try {
      const r = await chamar(api.exportar.leadsCsv(filtros, sensiveis))
      if (r) {
        avisar(`${r.total} lead(s) exportado(s) para ${r.caminho}`)
        onFechar()
      }
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setExportando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Exportar leads (CSV)"
      rodape={
        <>
          <button className="btn-secondary" onClick={onFechar}>Cancelar</button>
          <button className="btn-primary" onClick={exportar} disabled={exportando}><Download size={14} /> {exportando ? 'Exportando…' : 'Escolher local e exportar'}</button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-zinc-600 dark:text-zinc-300">
          {total !== undefined ? <>Serão exportados os <strong>{total.toLocaleString('pt-BR')}</strong> lead(s) da lista atual (com a busca e os filtros aplicados).</> : 'Serão exportados todos os leads.'}{' '}
          O arquivo abre direto no Excel.
        </p>
        <Toggle checked={sensiveis} onChange={setSensiveis} label="Incluir dados financeiros sensíveis" />
        {sensiveis && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            O CSV inclui patrimônio, renda, suitability e notas de sucessão <strong>sem criptografia</strong>. Guarde o arquivo em local seguro e apague quando não precisar mais.
          </p>
        )}
      </div>
    </Modal>
  )
}
