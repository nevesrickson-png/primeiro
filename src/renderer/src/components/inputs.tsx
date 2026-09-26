import { useEffect, useState } from 'react'
import { data as formatarData, dataParaISO, mascaraData, telefone } from '../lib/format'

/** Telefone com máscara BR. O valor enviado é só dígitos. */
export function TelefoneInput({ value, onChange, placeholder = '(00) 00000-0000' }: {
  value: string | null
  onChange: (v: string | null) => void
  placeholder?: string
}) {
  return (
    <input
      className="input tabular-nums"
      value={telefone(value)}
      placeholder={placeholder}
      inputMode="tel"
      onChange={(e) => {
        const d = e.target.value.replace(/\D/g, '').slice(0, 11)
        onChange(d || null)
      }}
    />
  )
}

/** Data dd/mm/aaaa. O valor enviado é AAAA-MM-DD (ou null). */
export function DataInput({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [texto, setTexto] = useState(formatarData(value))
  useEffect(() => {
    // Sincroniza quando o valor muda de fora (ex.: carregou outro lead).
    if (dataParaISO(texto) !== value) setTexto(formatarData(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const invalida = texto.length === 10 && !dataParaISO(texto)
  return (
    <input
      className={'input tabular-nums ' + (invalida ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : '')}
      value={texto}
      placeholder="dd/mm/aaaa"
      inputMode="numeric"
      onChange={(e) => {
        const t = mascaraData(e.target.value)
        setTexto(t)
        if (t === '') onChange(null)
        else {
          const iso = dataParaISO(t)
          if (iso) onChange(iso)
        }
      }}
      onBlur={() => {
        if (texto && !dataParaISO(texto)) {
          setTexto(formatarData(value))
        }
      }}
    />
  )
}

const fmtNumero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Valor em R$: digita-se como numa calculadora (centavos entram pela direita). */
export function MoedaInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">R$</span>
      <input
        className="input pl-9 text-right tabular-nums"
        inputMode="numeric"
        placeholder="0,00"
        value={value === null ? '' : fmtNumero.format(value)}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '').slice(0, 15)
          onChange(d ? Number(d) / 100 : null)
        }}
      />
    </div>
  )
}
