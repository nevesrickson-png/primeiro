/** Utilitários de datas de calendário (AAAA-MM-DD) no fuso local. */

const p2 = (n: number): string => String(n).padStart(2, '0')

export function dataLocalISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  return dataLocalISO(new Date(a, m - 1, d + dias))
}

/** Diferença em dias entre duas datas AAAA-MM-DD (b - a). */
export function diasEntre(a: string, b: string): number {
  const [a1, m1, d1] = a.split('-').map(Number)
  const [a2, m2, d2] = b.split('-').map(Number)
  return Math.round((new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime()) / 86_400_000)
}
