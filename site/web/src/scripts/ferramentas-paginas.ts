/** Liga cada ferramenta da página ao seu cálculo. */
import { ligarFerramenta, grafico, num, taxa, texto } from './ferramentas'
import * as f from '../lib/financas'
import { PERGUNTAS_GOLPE, PESO_MAXIMO } from '../lib/golpes'
import { celebrar, rearmar, progresso } from './celebracao'

// Celebra só depois que a pessoa mexeu nos números e parou de digitar.
let interagiu = false
addEventListener('input', () => (interagiu = true), { capture: true })
addEventListener('change', () => (interagiu = true), { capture: true })
const timers = new Map<string, number>()
function talvezCelebrar(chave: string, condicao: boolean, titulo: string, texto: string) {
  clearTimeout(timers.get(chave))
  if (!condicao) return rearmar(chave)
  if (!interagiu) return
  timers.set(chave, window.setTimeout(() => celebrar(chave, titulo, texto), 900))
}
const marcos = (itens: { rotulo: string; detalhe: string; feito?: boolean }[]) =>
  itens.map((m) => `<li class="${m.feito ? 'feito' : ''}"><b>${m.rotulo}</b><span>${m.detalhe}</span></li>`).join('')

const AZUL = '#0B1A2C'
const OURO = '#7A6438'
const PEDRA = '#8C8F94'
const anos = (meses: number) => {
  if (!Number.isFinite(meses)) return 'mais de 100 anos'
  const a = Math.floor(meses / 12), m = meses % 12
  if (a === 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`
  return `${a} ${a === 1 ? 'ano' : 'anos'}${m ? ` e ${m} ${m === 1 ? 'mês' : 'meses'}` : ''}`
}
const html = (id: string, v: string) => { const el = document.getElementById(id); if (el) el.innerHTML = v }

const calculos: Record<string, (form: HTMLFormElement) => void> = {
  'independencia-financeira'(form) {
    const idade = num(form, 'idade'), aposentar = Math.max(num(form, 'aposentar'), idade)
    const p = f.planejarAposentadoria({
      idadeAtual: idade, idadeAposentar: aposentar, idadeFinal: Math.max(num(form, 'final'), aposentar + 1),
      rendaMensal: num(form, 'renda'), patrimonioAtual: num(form, 'patrimonio'),
      taxaRealAcumulacao: taxa(form, 'taxaAcum'), taxaRealRetirada: taxa(form, 'taxaRet')
    })
    const aporteAtual = num(form, 'aporte')
    const iAc = f.mensalDeAnual(taxa(form, 'taxaAcum'))
    const mesesAtual = f.mesesParaMeta(p.metaPerpetua, num(form, 'patrimonio'), aporteAtual, iAc)
    texto('r-meta', f.reais(p.metaPerpetua))
    texto('r-aporte', f.reais(p.aportePerpetuo))
    texto('r-aporte-nota', `por ${anos(p.meses)}, até os ${aposentar} anos`)
    texto('r-chega', Number.isFinite(mesesAtual) ? `aos ${Math.floor(idade + mesesAtual / 12)} anos` : 'não chega')
    texto('r-chega-nota', Number.isFinite(mesesAtual) ? `em ${anos(mesesAtual)}, investindo ${f.reais(aporteAtual)} por mês` : 'aumente o aporte ou o prazo')
    texto('t-meta1', f.reais(p.metaPerpetua)); texto('t-ap1', f.reais(p.aportePerpetuo))
    texto('t-meta2', f.reais(p.metaConsumo)); texto('t-ap2', f.reais(p.aporteConsumo))
    const n = Math.max(1, Math.round(aposentar - idade))
    const necessario = f.simularAcumulacao({ inicial: num(form, 'patrimonio'), mensal: p.aportePerpetuo, taxaAnual: taxa(form, 'taxaAcum'), anos: n })
    const atual = f.simularAcumulacao({ inicial: num(form, 'patrimonio'), mensal: aporteAtual, taxaAnual: taxa(form, 'taxaAcum'), anos: n })
    grafico(document.getElementById('grafico')!, [
      { nome: 'Com o aporte necessário', valores: necessario.map((x) => x.saldo), cor: AZUL, area: true },
      { nome: 'Com o seu aporte atual', valores: atual.map((x) => x.saldo), cor: OURO },
      { nome: 'Meta', valores: necessario.map(() => p.metaPerpetua), cor: PEDRA, tracejada: true }
    ], necessario.map((x) => `${Math.round(idade + x.ano)} anos`))
    const patr = num(form, 'patrimonio')
    progresso('indep', patr / p.metaPerpetua)
    html('r-marcos', marcos([0.25, 0.5, 0.75, 1].map((fr) => {
      const m = f.mesesParaMeta(p.metaPerpetua * fr, patr, aporteAtual, iAc)
      return { rotulo: `${fr * 100}%`, feito: m === 0, detalhe: m === 0 ? 'já alcançado' : Number.isFinite(m) ? `aos ${Math.floor(idade + m / 12)} anos` : 'aumente o aporte' }
    })))
    const chegaNoPrazo = Number.isFinite(mesesAtual) && idade + mesesAtual / 12 <= aposentar
    talvezCelebrar('indep', chegaNoPrazo, `Independência aos ${Math.floor(idade + mesesAtual / 12)} anos`, `No ritmo atual, você chega ao patrimônio que paga ${f.reais(num(form, 'renda'))} por mês antes da data que escolheu.`)
    const dif = p.aportePerpetuo - aporteAtual
    html('r-leitura', dif <= 0
      ? `Mantendo <b>${f.reais(aporteAtual)}</b> por mês, você chega ao patrimônio que paga <b>${f.reais(num(form, 'renda'))}</b> por mês antes dos ${aposentar} anos. Todos os valores estão em reais de hoje.`
      : `Para viver de renda aos ${aposentar} anos, faltam <b>${f.reais(dif)}</b> por mês além do que você já investe. Outras saídas: adiar a data, reduzir a renda desejada ou buscar uma rentabilidade real maior, que vem com mais risco.`)
  },

  'juros-compostos'(form) {
    const pts = f.simularAcumulacao({ inicial: num(form, 'inicial'), mensal: num(form, 'mensal'), taxaAnual: taxa(form, 'taxa'), anos: Math.max(1, Math.round(num(form, 'anos'))), reajusteAnualAporte: taxa(form, 'reajuste') })
    const fim = pts[pts.length - 1]
    const hoje = fim.saldo / Math.pow(1 + taxa(form, 'inflacao'), fim.ano)
    texto('r-final', f.reais(fim.saldo)); texto('r-hoje', `${f.reais(hoje)} em poder de compra de hoje`)
    texto('r-aportado', f.reais(fim.aportado)); texto('r-juros', f.reais(fim.juros))
    texto('r-juros-pct', `${f.pct(fim.juros / Math.max(1, fim.saldo), 0)} do saldo final`)
    grafico(document.getElementById('grafico')!, [
      { nome: 'Saldo', valores: pts.map((x) => x.saldo), cor: AZUL, area: true },
      { nome: 'Total aportado', valores: pts.map((x) => x.aportado), cor: OURO }
    ], pts.map((x) => `Ano ${x.ano}`))
    const virada = pts.find((x) => x.ano > 0 && x.juros > x.aportado)
    html('r-leitura', virada
      ? `No <b>ano ${virada.ano}</b>, os juros acumulados passam a ser maiores do que tudo o que você colocou. É a partir daí que o tempo trabalha mais do que o aporte.`
      : 'Nesse prazo, o aporte ainda pesa mais do que os juros. Com mais tempo, essa relação se inverte.')
    const primeiro = (v: number) => pts.find((x) => x.saldo >= v)
    html('r-marcos', marcos([100e3, 500e3, 1e6, 5e6].map((v) => {
      const x = primeiro(v)
      return { rotulo: f.reaisCurto(v), feito: !!x && x.ano === 0, detalhe: x ? (x.ano === 0 ? 'já tem' : `no ano ${x.ano}`) : 'fora do prazo' }
    })))
    const milhao = primeiro(1e6)
    talvezCelebrar('milhao', !!milhao && milhao.ano > 0, 'Seu primeiro milhão', `Nesse ritmo, o saldo passa de R$ 1 milhão no ano ${milhao?.ano}. Disciplina e tempo fazem o trabalho pesado.`)
    const corpo = document.getElementById('tabela')!
    corpo.innerHTML = pts.filter((x) => x.ano > 0 && (x.ano % 5 === 0 || x.ano === fim.ano)).map((x) =>
      `<tr><td>${x.ano}</td><td>${f.reais(x.aportado)}</td><td>${f.reais(x.juros)}</td><td>${f.reais(x.saldo)}</td></tr>`).join('')
  },

  'custo-das-taxas'(form) {
    const r = f.compararTaxas({ inicial: num(form, 'inicial'), mensal: num(form, 'mensal'), retornoBruto: taxa(form, 'retorno'), taxaA: taxa(form, 'taxaA'), taxaB: taxa(form, 'taxaB'), anos: Math.max(1, Math.round(num(form, 'anos'))) })
    texto('r-dif', f.reais(r.diferenca)); texto('r-pct', `${f.pct(r.perdaPct, 0)} do patrimônio fica pelo caminho`)
    texto('r-a', f.reais(r.a[r.a.length - 1].saldo)); texto('r-b', f.reais(r.b[r.b.length - 1].saldo))
    grafico(document.getElementById('grafico')!, [
      { nome: `Taxa de ${f.pct(taxa(form, 'taxaA'))}`, valores: r.a.map((x) => x.saldo), cor: AZUL, area: true },
      { nome: `Taxa de ${f.pct(taxa(form, 'taxaB'))}`, valores: r.b.map((x) => x.saldo), cor: OURO }
    ], r.a.map((x) => `Ano ${x.ano}`))
    html('r-leitura', `Uma diferença de <b>${f.pct(taxa(form, 'taxaB') - taxa(form, 'taxaA'))}</b> ao ano parece pequena. Em ${r.a.length - 1} anos, ela leva <b>${f.pct(r.perdaPct, 0)}</b> do resultado. Como dizia John Bogle, no investimento você recebe aquilo pelo que não paga.`)
  },

  'renda-fixa'(form) {
    const meses = Math.max(1, Math.round(num(form, 'meses')))
    const dias = Math.round((meses * 365) / 12)
    const base = { valor: num(form, 'valor'), dias, cdiAnual: taxa(form, 'cdi') }
    const c = f.rendaFixa({ ...base, pctCdi: taxa(form, 'cdb'), isento: false })
    const l = f.rendaFixa({ ...base, pctCdi: taxa(form, 'lci'), isento: true })
    const cdbGanha = c.liquido > l.liquido
    texto('r-venc', cdbGanha ? 'Tributado' : 'Isento')
    texto('r-venc-nota', `${f.reais(Math.abs(c.liquido - l.liquido))} a mais em ${meses} meses`)
    const eq = f.cdbEquivalente(taxa(form, 'lci'), dias)
    texto('r-eq', `${(eq * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do CDI`)
    texto('r-eq-nota', `é o que um CDB precisa pagar para empatar (IR de ${f.pct(f.aliquotaIR(dias))})`)
    texto('c-bruto', f.reais(c.bruto)); texto('l-bruto', f.reais(l.bruto))
    texto('c-ir', `− ${f.reais(c.ir)}`)
    texto('c-liq', f.reais(c.liquido)); texto('l-liq', f.reais(l.liquido))
    texto('c-fim', f.reais(base.valor + c.liquido)); texto('l-fim', f.reais(base.valor + l.liquido))
    texto('c-aa', f.pct(c.rentLiquidaAnual, 2)); texto('l-aa', f.pct(l.rentLiquidaAnual, 2))
    html('r-leitura', `Quanto mais longo o prazo, menor a alíquota do IR e menor a vantagem da isenção. Compare sempre no mesmo prazo, com o mesmo risco de crédito e a mesma liquidez.`)
    const faixas: [string, number][] = [['Até 6 meses', 180], ['De 6 a 12 meses', 360], ['De 12 a 24 meses', 720], ['Acima de 24 meses', 721]]
    document.getElementById('faixas')!.innerHTML = faixas.map(([r, d]) =>
      `<tr><td>${r}</td><td>${f.pct(f.aliquotaIR(d))}</td><td>${(f.cdbEquivalente(taxa(form, 'lci'), d) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do CDI</td></tr>`).join('')
  },

  'reserva-de-emergencia'(form) {
    const perfil = (form.querySelector('input[name=perfil]:checked') as HTMLInputElement)?.value ?? 'estavel'
    const mult = perfil === 'estavel' || perfil === 'aposentado' ? 6 : 12
    const meta = num(form, 'gastos') * mult
    const atual = num(form, 'atual')
    const i = f.mensalDeAnual(taxa(form, 'taxa'))
    const meses = f.mesesParaMeta(meta, atual, num(form, 'aporte'), i)
    texto('r-meta', f.reais(meta)); texto('r-meta-nota', `${mult} meses dos seus gastos`)
    progresso('reserva', atual / meta)
    talvezCelebrar('reserva', meta > 0 && atual >= meta, 'Reserva completa', 'Sua reserva de emergência está formada. Agora os próximos investimentos podem pensar no longo prazo.')
    texto('r-falta', f.reais(Math.max(0, meta - atual)))
    texto('r-tempo', meses === 0 ? 'Já chegou' : anos(meses))
    const n = Math.min(Number.isFinite(meses) ? meses : 120, 120)
    const serie: number[] = [atual]; let s = atual
    for (let m = 1; m <= Math.max(n, 1); m++) { s = s * (1 + i) + num(form, 'aporte'); serie.push(s) }
    grafico(document.getElementById('grafico')!, [
      { nome: 'Sua reserva', valores: serie, cor: AZUL, area: true },
      { nome: 'Meta', valores: serie.map(() => meta), cor: OURO, tracejada: true }
    ], serie.map((_, k) => `Mês ${k}`))
    html('r-leitura', perfil === 'empresario'
      ? 'Para empresários, a reserva pessoal deve ficar separada do caixa da empresa. Misturar os dois é o erro mais comum.'
      : 'A reserva vem antes de qualquer outro investimento. Ela precisa de liquidez diária e baixo risco, não de rentabilidade alta.')
  },

  'meus-objetivos'(form) {
    const obj = (form.elements.namedItem('objetivo') as HTMLSelectElement).value
    const meta = num(form, 'meta'), prazo = Math.max(1, Math.round(num(form, 'prazo'))), guardado = num(form, 'guardado'), aporte = num(form, 'aporte')
    const i = f.mensalDeAnual(taxa(form, 'taxa'))
    const necessario = f.aporteNecessario(meta, guardado, i, prazo)
    const meses = f.mesesParaMeta(meta, guardado, aporte, i)
    progresso('objetivo', guardado / Math.max(1, meta))
    texto('r-necessario', f.reais(necessario))
    texto('r-necessario-nota', `para chegar em ${anos(prazo)}`)
    const quando = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) }
    texto('r-data', meses === 0 ? 'Já chegou' : Number.isFinite(meses) ? quando(meses) : 'não chega')
    texto('r-data-nota', meses === 0 ? '' : Number.isFinite(meses) ? `em ${anos(meses)}` : 'aumente o valor mensal')
    const n = Math.min(Math.max(prazo, Number.isFinite(meses) ? meses : prazo), 480)
    const serie: number[] = [guardado]; let sd = guardado
    for (let m = 1; m <= n; m++) { sd = sd * (1 + i) + aporte; serie.push(sd) }
    grafico(document.getElementById('grafico')!, [
      { nome: 'Seu dinheiro', valores: serie, cor: AZUL, area: true },
      { nome: obj, valores: serie.map(() => meta), cor: OURO, tracejada: true }
    ], serie.map((_, k) => (k === 0 ? 'Hoje' : `Mês ${k}`)))
    const viavel = meses === 0 || (Number.isFinite(meses) && meses <= prazo)
    html('r-leitura', meses === 0
      ? `Você já tem o necessário para <b>${obj.toLowerCase()}</b>. Antes de usar, veja se a reserva de emergência continua intacta.`
      : viavel
        ? `Guardando <b>${f.reais(aporte)}</b> por mês, você realiza <b>${obj.toLowerCase()}</b> ${prazo - meses > 0 ? `<b>${anos(prazo - meses)} antes</b> do prazo` : 'no prazo'}. Automatize a transferência no dia do salário para não depender de força de vontade.`
        : `Faltam <b>${f.reais(Math.max(0, necessario - aporte))}</b> por mês para chegar no prazo. Outras saídas: estender o prazo, começar com uma meta menor ou rever gastos que não fazem falta.`)
    talvezCelebrar(`obj-${obj}`, viavel, meses === 0 ? `${obj}: objetivo alcançado` : `${obj} em ${quando(meses)}`, meses === 0 ? 'Você já tem o valor. Parabéns pela disciplina.' : `Seu plano fecha: guardando ${f.reais(aporte)} por mês, você chega lá ${prazo - meses > 0 ? `${anos(prazo - meses)} antes do prazo` : 'no prazo'}.`)
  },

  financiamento(form) {
    const valor = Math.max(0, num(form, 'bem') - num(form, 'entrada')), meses = Math.max(1, Math.round(num(form, 'meses')))
    const i = f.mensalDeAnual(taxa(form, 'taxa'))
    const sac = f.tabelaSAC(valor, i, meses), price = f.tabelaPrice(valor, i, meses)
    const tSac = f.totalPago(sac), tPrice = f.totalPago(price)
    texto('r-economia', f.reais(tPrice - tSac))
    texto('r-sac1', f.reais(sac[0].parcela)); texto('r-sacfim', `caindo até ${f.reais(sac[sac.length - 1].parcela)}`)
    texto('r-price', f.reais(price[0].parcela))
    texto('t-fin', f.reais(valor)); texto('t-fin2', f.reais(valor))
    texto('t-jsac', f.reais(tSac - valor)); texto('t-jprice', f.reais(tPrice - valor))
    texto('t-tsac', f.reais(tSac)); texto('t-tprice', f.reais(tPrice))
    const passo = Math.max(1, Math.round(meses / 60))
    const idx = sac.map((_, k) => k).filter((k) => k % passo === 0 || k === meses - 1)
    grafico(document.getElementById('grafico')!, [
      { nome: 'Parcela SAC', valores: idx.map((k) => sac[k].parcela), cor: AZUL },
      { nome: 'Parcela Price', valores: idx.map((k) => price[k].parcela), cor: OURO }
    ], idx.map((k) => `Mês ${k + 1}`))
    const cruz = sac.findIndex((p, k) => p.parcela <= price[k].parcela)
    html('r-leitura', `Na SAC a parcela começa mais alta e cai todo mês; ela fica menor que a da Price a partir do <b>mês ${cruz + 1}</b>. No total, a SAC paga <b>${f.reais(tPrice - tSac)}</b> a menos de juros. A Price cabe melhor no orçamento no começo. Amortizar antes do prazo reduz os juros nos dois sistemas.`)
  },

  'poupanca-ou-cdi'(form) {
    const valor = num(form, 'valor'), meses = Math.max(1, Math.round(num(form, 'meses')))
    const iPoup = f.poupancaMensal(taxa(form, 'selic'), taxa(form, 'tr'))
    const dias = Math.round((meses * 365) / 12)
    const cdb = f.rendaFixa({ valor, dias, cdiAnual: taxa(form, 'cdi'), pctCdi: taxa(form, 'pct'), isento: false })
    const poupRend = valor * (Math.pow(1 + iPoup, meses) - 1)
    const venc = cdb.liquido > poupRend ? 'CDB' : 'Poupança'
    texto('r-venc', venc); texto('r-venc-nota', `${f.reais(Math.abs(cdb.liquido - poupRend))} a mais em ${anos(meses)}`)
    texto('r-poup', f.reais(valor + poupRend)); texto('r-poup-aa', `${f.pct(Math.pow(1 + iPoup, 12) - 1, 2)} ao ano`)
    texto('r-cdb', f.reais(valor + cdb.liquido)); texto('r-cdb-aa', `${f.pct(cdb.rentLiquidaAnual, 2)} ao ano líquido`)
    const sP: number[] = [], sC: number[] = []
    for (let m = 0; m <= meses; m++) {
      sP.push(valor * Math.pow(1 + iPoup, m))
      const d = Math.max(1, Math.round((m * 365) / 12))
      sC.push(m === 0 ? valor : valor + f.rendaFixa({ valor, dias: d, cdiAnual: taxa(form, 'cdi'), pctCdi: taxa(form, 'pct'), isento: false }).liquido)
    }
    grafico(document.getElementById('grafico')!, [
      { nome: 'CDB após IR', valores: sC, cor: AZUL },
      { nome: 'Poupança', valores: sP, cor: OURO }
    ], sP.map((_, k) => `Mês ${k}`))
    html('r-leitura', `Com Selic acima de 8,5% ao ano, a poupança rende 0,5% ao mês mais TR. Compare sempre com o rendimento <b>depois do imposto</b>, no mesmo prazo. Para a reserva de emergência, o que importa é liquidez diária e segurança; a diferença de rendimento vem em segundo lugar.`)
  },

  'a-vista-ou-parcelado'(form) {
    const r = f.vistaOuParcelado({ preco: num(form, 'preco'), descontoVista: taxa(form, 'desconto'), parcelas: Math.max(1, Math.round(num(form, 'parcelas'))), rendMensal: f.mensalDeAnual(taxa(form, 'rend')), primeiraNoAto: (form.elements.namedItem('noato') as HTMLInputElement).checked })
    texto('r-melhor', r.melhor === 'vista' ? 'À vista' : 'Parcelado')
    texto('r-melhor-nota', `economia de ${f.reaisCentavos(r.economia)} em valores de hoje`)
    texto('r-empate', f.pct(Math.max(0, r.descontoEmpate), 1))
    texto('t-vista', f.reaisCentavos(r.vista)); texto('t-parcela', `${Math.round(num(form, 'parcelas'))} × ${f.reaisCentavos(r.parcela)}`); texto('t-vp', f.reaisCentavos(r.vpParcelado))
    html('r-leitura', r.melhor === 'vista'
      ? `O desconto de <b>${f.pct(taxa(form, 'desconto'))}</b> vale mais do que o rendimento que o dinheiro teria até a última parcela. Pague à vista, desde que isso não tire dinheiro da reserva de emergência.`
      : `Deixando o dinheiro rendendo e pagando as parcelas, você sai na frente. Só vale se o dinheiro realmente ficar aplicado, e não virar outra compra.`)
  },

  'poder-de-compra'(form) {
    const valor = num(form, 'valor'), inf = taxa(form, 'inflacao'), n = Math.max(1, Math.round(num(form, 'anos')))
    const r = f.poderDeCompra(valor, inf, n)
    texto('r-futuro', f.reais(r.equivalenteFuturo)); texto('r-futuro-nota', `daqui a ${n} anos`)
    texto('r-hoje', f.reais(r.poderHoje)); texto('r-perda', f.pct(r.perdaPct, 0))
    const lab: string[] = [], parado: number[] = [], corrigido: number[] = []
    for (let a = 0; a <= n; a++) { lab.push(`Ano ${a}`); parado.push(valor / Math.pow(1 + inf, a)); corrigido.push(valor) }
    grafico(document.getElementById('grafico')!, [
      { nome: 'Protegido da inflação', valores: corrigido, cor: AZUL },
      { nome: 'Parado, sem render', valores: parado, cor: OURO, area: true }
    ], lab)
    html('r-leitura', `Com inflação de ${f.pct(inf)} ao ano, o dinheiro parado perde <b>${f.pct(r.perdaPct, 0)}</b> do poder de compra em ${n} anos. O primeiro objetivo de qualquer investimento é empatar com a inflação; o patrimônio cresce de verdade só com o que vem acima dela.`)
  },

  'detector-de-golpes'(form) {
    let pontos = 0, respondidas = 0
    const sinais: string[] = []
    PERGUNTAS_GOLPE.forEach((q, k) => {
      const v = (form.querySelector(`input[name=q${k}]:checked`) as HTMLInputElement)?.value
      if (v !== '') respondidas++
      if (v === '1') { pontos += q.peso; sinais.push(q.sinal) }
    })
    const nivel = respondidas === 0 ? ['Responda às perguntas', 0, '#CBB27A']
      : pontos === 0 ? ['Nenhum sinal clássico', 0.04, '#7fb08f']
      : pontos <= 4 ? ['Atenção', pontos / PESO_MAXIMO, '#CBB27A']
      : pontos <= 9 ? ['Risco alto', pontos / PESO_MAXIMO, '#d9925b']
      : ['Risco muito alto', Math.min(1, pontos / PESO_MAXIMO + 0.15), '#e07a6a']
    texto('r-nivel', String(nivel[0]))
    const barra = document.getElementById('r-barra')!
    barra.style.width = `${Math.round(Number(nivel[1]) * 100)}%`; barra.style.background = String(nivel[2])
    texto('r-texto', respondidas === 0
      ? 'Quanto mais “sim”, mais a proposta se parece com os golpes que se repetem há um século.'
      : pontos === 0 ? 'Nenhum dos sinais clássicos apareceu. Mesmo assim, confira o registro da empresa antes de investir.'
      : pontos >= 10 ? 'Essa proposta reúne vários sinais de pirâmide ou fraude. Não transfira dinheiro.'
      : 'Há sinais que pedem cuidado. Confira cada um antes de decidir.')
    talvezCelebrar('golpe-limpo', respondidas === PERGUNTAS_GOLPE.length && pontos === 0, 'Nenhum sinal clássico de golpe', 'Ótimo sinal. Antes de investir, confirme o registro da empresa na CVM ou no Banco Central.')
    document.getElementById('r-sinais')!.innerHTML = sinais.map((s) => `<li>${s}</li>`).join('')
  }
}

document.querySelectorAll<HTMLFormElement>('form[data-ferramenta]').forEach((form) => {
  const calc = calculos[form.dataset.ferramenta!]
  if (calc) ligarFerramenta(form, () => calc(form))
})
