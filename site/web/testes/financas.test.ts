import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as f from '../src/lib/financas.ts'

const perto = (a: number, b: number, tol = 1) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`)

test('acumulação bate com a tabela do artigo (R$ 1.000/mês a 0,5% a.m.)', () => {
  const taxaAnual = Math.pow(1.005, 12) - 1
  const p = f.simularAcumulacao({ inicial: 0, mensal: 1000, taxaAnual, anos: 30 })
  perto(p[10].saldo, 163879); perto(p[20].saldo, 462041); perto(p[30].saldo, 1004515)
  assert.equal(p[30].aportado, 360000)
})
test('aporte necessário reproduz o valor futuro', () => {
  const i = 0.005, n = 240
  const pmt = f.aporteNecessario(462041, 0, i, n)
  perto(pmt, 1000, 0.5)
  assert.equal(f.aporteNecessario(100, 200, i, n), 0)
})
test('aposentadoria: meta perpétua = renda / taxa mensal', () => {
  const r = f.planejarAposentadoria({ idadeAtual: 30, idadeAposentar: 60, idadeFinal: 90, rendaMensal: 10000, patrimonioAtual: 0, taxaRealAcumulacao: 0.05, taxaRealRetirada: 0.04 })
  perto(r.metaPerpetua, 10000 / f.mensalDeAnual(0.04))
  assert.ok(r.metaConsumo < r.metaPerpetua)
  assert.equal(r.meses, 360)
})
test('IR regressivo e CDB equivalente', () => {
  assert.equal(f.aliquotaIR(180), 0.225); assert.equal(f.aliquotaIR(181), 0.2)
  assert.equal(f.aliquotaIR(720), 0.175); assert.equal(f.aliquotaIR(721), 0.15)
  perto(f.cdbEquivalente(0.9, 800), 0.9 / 0.85, 1e-9)
})
test('renda fixa: isento não paga IR', () => {
  const a = f.rendaFixa({ valor: 10000, dias: 365, cdiAnual: 0.1, pctCdi: 1, isento: true })
  perto(a.bruto, 1000, 0.01); assert.equal(a.ir, 0)
  const b = f.rendaFixa({ valor: 10000, dias: 365, cdiAnual: 0.1, pctCdi: 1, isento: false })
  perto(b.ir, 175, 0.01)
})
test('taxas: a mais cara termina com menos', () => {
  const r = f.compararTaxas({ inicial: 100000, mensal: 0, retornoBruto: 0.08, taxaA: 0.003, taxaB: 0.02, anos: 30 })
  assert.ok(r.diferenca > 0 && r.perdaPct > 0.3 && r.perdaPct < 0.5)
})
test('números em formato brasileiro', () => {
  assert.equal(f.numeroBR('1.234,56'), 1234.56); assert.equal(f.numeroBR('R$ 500.000'), 500000)
  assert.equal(f.numeroBR('12,5%'), 12.5); assert.equal(f.numeroBR('1234.5'), 1234.5)
  assert.equal(f.mesesParaMeta(1000, 0, 100, 0), 10)
})
