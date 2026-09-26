import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { api, chamar } from '../lib/api'
import { useClickFora } from './ui'

/** Autocompletar de lead (usado em "Indicado por"). */
export function LeadPicker({ value, nome, excluirId, onChange }: {
  value: string | null
  nome: string | null
  excluirId?: string
  onChange: (id: string | null, nome: string | null) => void
}) {
  const [texto, setTexto] = useState('')
  const [resultados, setResultados] = useState<{ id: string; nome: string; cidade: string | null }[]>([])
  const [aberto, setAberto] = useState(false)
  const ref = useClickFora<HTMLDivElement>(aberto, () => setAberto(false))

  useEffect(() => {
    if (!texto.trim()) {
      setResultados([])
      return
    }
    const t = setTimeout(() => {
      chamar(api.leads.buscarPorNome(texto, excluirId)).then(setResultados).catch(() => setResultados([]))
    }, 120)
    return () => clearTimeout(t)
  }, [texto, excluirId])

  if (value) {
    return (
      <div className="input flex items-center justify-between">
        <span className="truncate">{nome ?? 'Lead selecionado'}</span>
        <button type="button" onClick={() => onChange(null, null)} className="text-zinc-400 hover:text-zinc-600" title="Remover">
          <X size={14} />
        </button>
      </div>
    )
  }
  return (
    <div className="relative" ref={ref}>
      <input
        className="input"
        placeholder="Buscar lead que indicou…"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
      />
      {aberto && resultados.length > 0 && (
        <div className="absolute left-0 right-0 top-10 z-30 max-h-60 overflow-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {resultados.map((r) => (
            <button
              type="button"
              key={r.id}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => {
                onChange(r.id, r.nome)
                setTexto('')
                setAberto(false)
              }}
            >
              <span>{r.nome}</span>
              <span className="text-xs text-zinc-400">{r.cidade}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
