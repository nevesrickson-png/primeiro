/**
 * Cálculos das ferramentas do site. Tudo roda no navegador do visitante: nenhum dado sai do computador dele.
 * Convenções: taxas em fração (0,1 = 10%), valores em reais, prazos em anos ou dias.
 */

export const mensalDeAnual = (anual: number): number => Math.pow(1 + anual, 1 / 12) - 1
export const realDeNominal = (nominal: number, inflacao: number): number => (1 + nominal) / (1 + inflacao) - 1

export interface PontoAno {
  ano: number
  aportado: number
  saldo: number
  juros: number
}

/** Acumulação mês a mês: aporte no fim de cada mês, aporte reajustado uma vez por ano. */
export function simularAcumulacao(p: {
  inicial: number
  mensal: number
  taxaAnual: number
  anos: number
  reajusteAnualAporte?: number
}): PontoAno[] {
  const i = mensalDeAnual(p.taxaAnual)
  let saldo = p.inicial
  let aportado = p.inicial
  let aporte = p.mensal
  const pontos: PontoAno[] = [{ ano: 0, aportado, saldo, juros: 0 }]
  for (let ano = 1; ano <= p.anos; ano++) {
    for (let m = 0; m < 12; m++) {
      saldo = saldo * (1 + i) + aporte
      aportado += aporte
    }
    pontos.push({ ano, aportado, saldo, juros: saldo - aportado })
    aporte *= 1 + (p.reajusteAnualAporte ?? 0)
  }
  return pontos
}

/** Valor futuro de um valor presente. */
export const valorFuturo = (vp: number, taxaMensal: number, meses: number): number => vp * Math.pow(1 + taxaMensal, meses)

/** Aporte mensal (fim do mês) para sair de `atual` e chegar a `meta` em `meses`. */
export function aporteNecessario(meta: number, atual: number, taxaMensal: number, meses: number): number {
  if (meses <= 0) return Math.max(0, meta - atual)
  const falta = meta - valorFuturo(atual, taxaMensal, meses)
  if (falta <= 0) return 0
  if (taxaMensal === 0) return falta / meses
  return (falta * taxaMensal) / (Math.pow(1 + taxaMensal, meses) - 1)
}

/** Valor presente de uma renda mensal por `meses` (consumindo o patrimônio). */
export function valorPresenteRenda(renda: number, taxaMensal: number, meses: number): number {
  if (taxaMensal === 0) return renda * meses
  return (renda * (1 - Math.pow(1 + taxaMensal, -meses))) / taxaMensal
}

export interface PlanoAposentadoria {
  meses: number
  metaPerpetua: number
  metaConsumo: number
  aportePerpetuo: number
  aporteConsumo: number
  projecaoAtual: number
}

/**
 * Independência financeira em valores de hoje (taxa real, acima da inflação).
 * metaPerpetua: viver só do rendimento real, preservando o patrimônio.
 * metaConsumo: consumir o patrimônio até a idade final.
 */
export function planejarAposentadoria(p: {
  idadeAtual: number
  idadeAposentar: number
  idadeFinal: number
  rendaMensal: number
  patrimonioAtual: number
  taxaRealAcumulacao: number
  taxaRealRetirada: number
}): PlanoAposentadoria {
  const meses = Math.max(0, Math.round((p.idadeAposentar - p.idadeAtual) * 12))
  const iAc = mensalDeAnual(p.taxaRealAcumulacao)
  const iRet = mensalDeAnual(p.taxaRealRetirada)
  const metaPerpetua = iRet > 0 ? p.rendaMensal / iRet : Infinity
  const mesesRetirada = Math.max(0, Math.round((p.idadeFinal - p.idadeAposentar) * 12))
  const metaConsumo = valorPresenteRenda(p.rendaMensal, iRet, mesesRetirada)
  return {
    meses,
    metaPerpetua,
    metaConsumo,
    aportePerpetuo: aporteNecessario(metaPerpetua, p.patrimonioAtual, iAc, meses),
    aporteConsumo: aporteNecessario(metaConsumo, p.patrimonioAtual, iAc, meses),
    projecaoAtual: valorFuturo(p.patrimonioAtual, iAc, meses)
  }
}

/** Mesma carteira com duas taxas de administração diferentes. */
export function compararTaxas(p: { inicial: number; mensal: number; retornoBruto: number; taxaA: number; taxaB: number; anos: number }) {
  const a = simularAcumulacao({ inicial: p.inicial, mensal: p.mensal, taxaAnual: p.retornoBruto - p.taxaA, anos: p.anos })
  const b = simularAcumulacao({ inicial: p.inicial, mensal: p.mensal, taxaAnual: p.retornoBruto - p.taxaB, anos: p.anos })
  const finalA = a[a.length - 1].saldo
  const finalB = b[b.length - 1].saldo
  return { a, b, diferenca: finalA - finalB, perdaPct: finalA > 0 ? (finalA - finalB) / finalA : 0 }
}

/** Tabela regressiva do IR sobre renda fixa (pessoa física). */
export function aliquotaIR(dias: number): number {
  if (dias <= 180) return 0.225
  if (dias <= 360) return 0.2
  if (dias <= 720) return 0.175
  return 0.15
}

/** % do CDI que um CDB precisa pagar para empatar com uma LCI/LCA isenta, no mesmo prazo. */
export const cdbEquivalente = (pctIsento: number, dias: number): number => pctIsento / (1 - aliquotaIR(dias))

export interface ResultadoRendaFixa {
  bruto: number
  ir: number
  liquido: number
  rentLiquidaPeriodo: number
  rentLiquidaAnual: number
}

/** Rendimento de um título pós-fixado em % do CDI (ou isento), em dias corridos. */
export function rendaFixa(p: { valor: number; dias: number; cdiAnual: number; pctCdi: number; isento: boolean }): ResultadoRendaFixa {
  const taxa = p.cdiAnual * p.pctCdi
  const bruto = p.valor * (Math.pow(1 + taxa, p.dias / 365) - 1)
  const ir = p.isento ? 0 : bruto * aliquotaIR(p.dias)
  const liquido = bruto - ir
  const rentLiquidaPeriodo = liquido / p.valor
  return { bruto, ir, liquido, rentLiquidaPeriodo, rentLiquidaAnual: Math.pow(1 + rentLiquidaPeriodo, 365 / p.dias) - 1 }
}

/** Meses para juntar `meta` com aporte mensal fixo. */
export function mesesParaMeta(meta: number, atual: number, aporte: number, taxaMensal: number): number {
  if (atual >= meta) return 0
  if (aporte <= 0 && taxaMensal <= 0) return Infinity
  let saldo = atual
  for (let m = 1; m <= 1200; m++) {
    saldo = saldo * (1 + taxaMensal) + aporte
    if (saldo >= meta) return m
  }
  return Infinity
}

// ---------- Formatação pt-BR ----------
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brlCent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const reais = (v: number): string => (Number.isFinite(v) ? brl.format(v) : '—')
export const reaisCentavos = (v: number): string => (Number.isFinite(v) ? brlCent.format(v) : '—')
export const pct = (v: number, casas = 1): string =>
  Number.isFinite(v) ? `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%` : '—'
export function reaisCurto(v: number): string {
  const a = Math.abs(v)
  if (a >= 1e6) return `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (a >= 1e3) return `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`
  return reais(v)
}
/** Aceita "1.234,56", "1234.56", "R$ 1.000" e "12%". */
export function numeroBR(texto: string): number {
  let t = String(texto ?? '').replace(/[R$\s%]/g, '')
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}
