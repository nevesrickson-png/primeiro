/** Liga cada ferramenta da página ao seu cálculo. */
import { ligarFerramenta, grafico, num, taxa, texto } from './ferramentas'
import * as f from '../lib/financas'
import { PERGUNTAS_GOLPE, PESO_MAXIMO } from '../lib/golpes'

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
    document.getElementById('r-sinais')!.innerHTML = sinais.map((s) => `<li>${s}</li>`).join('')
  }
}

document.querySelectorAll<HTMLFormElement>('form[data-ferramenta]').forEach((form) => {
  const calc = calculos[form.dataset.ferramenta!]
  if (calc) ligarFerramenta(form, () => calc(form))
})
