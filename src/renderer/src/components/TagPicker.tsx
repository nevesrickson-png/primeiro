import { useEffect, useState } from 'react'
import { Plus, Tag as TagIcon } from 'lucide-react'
import clsx from 'clsx'
import { CORES_TAG } from '@shared/constants'
import type { Tag } from '@shared/types'
import { api, chamar } from '../lib/api'
import { TagChip, useClickFora } from './ui'
import { useToast } from './toast'

/** Seleciona tags do lead e permite criar novas na hora. */
export function TagPicker({ selecionadas, onChange }: { selecionadas: string[]; onChange: (ids: string[]) => void }) {
  const [tags, setTags] = useState<Tag[]>([])
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [cor, setCor] = useState<string>(CORES_TAG[6])
  const ref = useClickFora<HTMLDivElement>(aberto, () => setAberto(false))
  const avisar = useToast()

  const carregar = () => chamar(api.tags.listar()).then(setTags).catch((e) => avisar(e.message, 'erro'))
  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtradas = tags.filter((t) => t.nome.toLowerCase().includes(texto.trim().toLowerCase()))
  const existeExato = tags.some((t) => t.nome.toLowerCase() === texto.trim().toLowerCase())

  async function criar() {
    try {
      const t = await chamar(api.tags.criar(texto, cor))
      await carregar()
      onChange([...selecionadas, t.id])
      setTexto('')
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5">
        {selecionadas.map((id) => {
          const t = tags.find((x) => x.id === id)
          return t ? <TagChip key={id} nome={t.nome} cor={t.cor} onRemove={() => onChange(selecionadas.filter((s) => s !== id))} /> : null
        })}
        <button type="button" className="btn-ghost btn-sm" onClick={() => setAberto((a) => !a)}>
          <TagIcon size={12} /> Adicionar tag
        </button>
      </div>
      {aberto && (
        <div className="absolute left-0 top-10 z-30 w-72 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <input
            autoFocus
            className="input h-8"
            placeholder="Buscar ou criar tag…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (texto.trim() && !existeExato) criar()
              }
            }}
          />
          <div className="mt-2 max-h-52 overflow-auto">
            {filtradas.map((t) => {
              const sel = selecionadas.includes(t.id)
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => onChange(sel ? selecionadas.filter((s) => s !== t.id) : [...selecionadas, t.id])}
                  className={clsx('flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800', sel && 'bg-zinc-50 dark:bg-zinc-800/60')}
                >
                  <TagChip nome={t.nome} cor={t.cor} />
                  {sel && <span className="text-xs text-brand-600">✓</span>}
                </button>
              )
            })}
          </div>
          {texto.trim() && !existeExato && (
            <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <div className="mb-2 flex gap-1">
                {CORES_TAG.map((c) => (
                  <button key={c} type="button" onClick={() => setCor(c)} className={clsx('h-5 w-5 rounded-full ring-offset-2 dark:ring-offset-zinc-900', cor === c && 'ring-2 ring-zinc-400')} style={{ backgroundColor: c }} />
                ))}
              </div>
              <button type="button" onClick={criar} className="btn-secondary btn-sm w-full">
                <Plus size={12} /> Criar tag “{texto.trim()}”
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
