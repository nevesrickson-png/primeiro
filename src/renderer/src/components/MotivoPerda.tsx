import { useEffect, useState } from 'react'
import { Modal } from './ui'

const SUGESTOES = [
  'Preferiu ficar com o gerente do banco',
  'Sem patrimônio disponível no momento',
  'Achou as taxas altas',
  'Parou de responder',
  'Fechou com outro assessor'
]

/** Pergunta o motivo ao mover um lead para "Perdido". */
export function MotivoPerda({ aberto, nome, onConfirmar, onCancelar }: {
  aberto: boolean
  nome?: string
  onConfirmar: (motivo: string | null) => void
  onCancelar: () => void
}) {
  const [motivo, setMotivo] = useState('')
  useEffect(() => {
    if (aberto) setMotivo('')
  }, [aberto])
  return (
    <Modal
      aberto={aberto}
      onFechar={onCancelar}
      titulo="Marcar como perdido"
      rodape={
        <>
          <button className="btn-secondary" onClick={onCancelar}>Cancelar</button>
          <button className="btn-danger" onClick={() => onConfirmar(motivo.trim() || null)}>Marcar como perdido</button>
        </>
      }
    >
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
        Qual o motivo da perda{nome ? <> de <strong>{nome}</strong></> : ''}? (opcional)
      </p>
      <input
        autoFocus
        className="input"
        value={motivo}
        placeholder="Descreva o motivo…"
        onChange={(e) => setMotivo(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onConfirmar(motivo.trim() || null)}
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SUGESTOES.map((s) => (
          <button key={s} type="button" onClick={() => setMotivo(s)} className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
            {s}
          </button>
        ))}
      </div>
    </Modal>
  )
}
