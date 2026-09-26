import { ReactNode, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, ChevronDown, X } from 'lucide-react'
import { ETAPAS, rotulo, type Etapa, type Opcao } from '@shared/constants'
import { COR_ETAPA } from '../lib/cores'

export function Field({ label, children, className, dica }: { label: string; children: ReactNode; className?: string; dica?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="label">{label}</span>
      {children}
      {dica && <span className="mt-1 block text-[11px] text-zinc-400">{dica}</span>}
    </label>
  )
}

export function Select({
  value, onChange, opcoes, vazio = 'Selecione…', className, permitirVazio = true
}: {
  value: string | null
  onChange: (v: string | null) => void
  opcoes: readonly Opcao[]
  vazio?: string
  className?: string
  permitirVazio?: boolean
}) {
  return (
    <select
      className={clsx('input pr-8', !value && 'text-zinc-400', className)}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      {permitirVazio && <option value="">{vazio}</option>}
      {opcoes.map((o) => (
        <option key={o.value} value={o.value} className="text-zinc-900 dark:text-zinc-100">
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** Seleção múltipla em "pílulas" clicáveis (objetivos, produtos). */
export function Chips<T extends string>({
  opcoes, valores, onChange
}: {
  opcoes: readonly Opcao<T>[]
  valores: T[]
  onChange: (v: T[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const ativo = valores.includes(o.value)
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(ativo ? valores.filter((v) => v !== o.value) : [...valores, o.value])}
            className={clsx(
              'inline-flex h-7 items-center gap-1 rounded-full border px-3 text-xs font-medium transition',
              ativo
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-500/15 dark:text-brand-300'
                : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
            )}
          >
            {ativo && <Check size={12} />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-sm">
      <span
        className={clsx(
          'relative h-5 w-9 rounded-full transition',
          checked ? 'bg-brand-600' : 'bg-zinc-300 dark:bg-zinc-700'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
            checked ? 'left-[18px]' : 'left-0.5'
          )}
        />
      </span>
      {label}
    </button>
  )
}

export function EtapaBadge({ etapa, className }: { etapa: Etapa; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', COR_ETAPA[etapa], className)}>
      {rotulo(ETAPAS, etapa)}
    </span>
  )
}

export function TagChip({ nome, cor, onRemove }: { nome: string; cor: string; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ backgroundColor: cor + '22', color: cor }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cor }} />
      {nome}
      {onRemove && (
        <button type="button" onClick={onRemove} className="opacity-60 hover:opacity-100" title="Remover">
          <X size={11} />
        </button>
      )}
    </span>
  )
}

/** Fecha ao clicar fora. */
export function useClickFora<T extends HTMLElement>(aberto: boolean, fechar: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!aberto) return
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar()
    }
    const k = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    document.addEventListener('mousedown', h)
    document.addEventListener('keydown', k)
    return () => {
      document.removeEventListener('mousedown', h)
      document.removeEventListener('keydown', k)
    }
  }, [aberto, fechar])
  return ref
}

/** Botão de filtro com menu de múltipla escolha. */
export function FiltroMulti<T extends string>({
  titulo, opcoes, valores, onChange
}: {
  titulo: string
  opcoes: readonly Opcao<T>[]
  valores: T[]
  onChange: (v: T[]) => void
}) {
  const [aberto, setAberto] = useState(false)
  const ref = useClickFora<HTMLDivElement>(aberto, () => setAberto(false))
  const ativo = valores.length > 0
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className={clsx(
          'btn btn-sm h-8 border',
          ativo
            ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
            : 'border-dashed border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800'
        )}
      >
        {titulo}
        {ativo && (
          <span className="rounded bg-brand-600 px-1 text-[10px] text-white">
            {valores.length === 1 ? rotulo(opcoes, valores[0]) : valores.length}
          </span>
        )}
        <ChevronDown size={13} />
      </button>
      {aberto && (
        <div className="absolute left-0 top-9 z-30 max-h-80 min-w-[220px] overflow-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {opcoes.map((o) => {
            const marcado = valores.includes(o.value)
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(marcado ? valores.filter((v) => v !== o.value) : [...valores, o.value])}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className={clsx('flex h-4 w-4 items-center justify-center rounded border', marcado ? 'border-brand-600 bg-brand-600 text-white' : 'border-zinc-300 dark:border-zinc-600')}>
                  {marcado && <Check size={11} />}
                </span>
                {o.label}
              </button>
            )
          })}
          {ativo && (
            <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded-md border-t border-zinc-100 px-2 py-1.5 text-left text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800">
              Limpar seleção
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Modal({ aberto, onFechar, titulo, children, rodape, largura = 'max-w-md' }: {
  aberto: boolean
  onFechar: () => void
  titulo: string
  children: ReactNode
  rodape?: ReactNode
  largura?: string
}) {
  useEffect(() => {
    if (!aberto) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [aberto, onFechar])
  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]" onMouseDown={onFechar}>
      <div className={clsx('w-full rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900', largura)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">{titulo}</h2>
          <button onClick={onFechar} className="btn-ghost btn-sm" title="Fechar">
            <X size={15} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {rodape && <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">{rodape}</div>}
      </div>
    </div>
  )
}

export function Confirmar({ aberto, titulo, mensagem, textoConfirmar = 'Confirmar', perigo, onConfirmar, onCancelar }: {
  aberto: boolean
  titulo: string
  mensagem: ReactNode
  textoConfirmar?: string
  perigo?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <Modal
      aberto={aberto}
      onFechar={onCancelar}
      titulo={titulo}
      rodape={
        <>
          <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
          <button className={perigo ? 'btn-danger' : 'btn-primary'} onClick={onConfirmar} autoFocus>{textoConfirmar}</button>
        </>
      }
    >
      <div className="text-sm text-zinc-600 dark:text-zinc-300">{mensagem}</div>
    </Modal>
  )
}

export function Vazio({ icone, titulo, texto, acao }: { icone: ReactNode; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-3 rounded-full bg-zinc-100 p-3 text-zinc-400 dark:bg-zinc-800">{icone}</div>
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {texto && <p className="mt-1 max-w-sm text-sm text-zinc-500">{texto}</p>}
      {acao && <div className="mt-4 flex gap-2">{acao}</div>}
    </div>
  )
}
