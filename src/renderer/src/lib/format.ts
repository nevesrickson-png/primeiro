// Formatação e máscaras no padrão brasileiro.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlCompacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1
})

export function moeda(v: number | null | undefined): string {
  return v === null || v === undefined ? '' : brl.format(v)
}

export function moedaCompacta(v: number | null | undefined): string {
  return v === null || v === undefined ? '' : brlCompacto.format(v)
}

/** "AAAA-MM-DD" ou ISO completo → "dd/mm/aaaa". */
export function data(v: string | null | undefined): string {
  if (!v) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  if (!m) return v
  if (v.length > 10) {
    // Timestamp: converte para o fuso local.
    const d = new Date(v)
    return d.toLocaleDateString('pt-BR')
  }
  return `${m[3]}/${m[2]}/${m[1]}`
}

export function dataHora(v: string | null | undefined): string {
  if (!v) return ''
  const d = new Date(v)
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/** Aplica a máscara de data enquanto digita: "12031980" → "12/03/1980". */
export function mascaraData(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** "dd/mm/aaaa" → "AAAA-MM-DD" (ou null se incompleta/inválida). */
export function dataParaISO(v: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v)
  if (!m) return null
  const [, dd, mm, aaaa] = m
  const d = new Date(Number(aaaa), Number(mm) - 1, Number(dd))
  if (d.getFullYear() !== Number(aaaa) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) return null
  return `${aaaa}-${mm}-${dd}`
}

/** Telefone BR: (11) 91234-5678 ou (11) 1234-5678. Aceita +55 na frente. */
export function telefone(v: string | null | undefined): string {
  if (!v) return ''
  let d = v.replace(/\D/g, '')
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  d = d.slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function linkWhatsApp(numero: string | null | undefined): string | null {
  if (!numero) return null
  const d = numero.replace(/\D/g, '')
  if (d.length < 10) return null
  return `https://wa.me/${d.startsWith('55') && d.length > 11 ? d : '55' + d}`
}

/** Texto digitado em R$ → número. "1.234,56" → 1234.56 */
export function parseMoeda(v: string): number | null {
  const limpo = v.replace(/[^\d,]/g, '').replace(',', '.')
  if (!limpo) return null
  const n = Number(limpo)
  return isNaN(n) ? null : n
}

export function idade(nascimento: string | null | undefined): number | null {
  if (!nascimento) return null
  const n = new Date(nascimento + 'T00:00:00')
  const h = new Date()
  let i = h.getFullYear() - n.getFullYear()
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--
  return i
}

export function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}

export function tempoRelativo(iso: string): string {
  const dias = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const anos = Math.floor(meses / 12)
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`
}
