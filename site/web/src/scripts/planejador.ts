/**
 * Planejador com IA: envia a descrição para /api/planejar (Cloudflare Pages Function), recalcula os aportes
 * localmente e transforma o plano em metas, checklist de hábitos e celebração.
 */
import { aporteNecessario, mensalDeAnual, numeroBR, reais } from '../lib/financas'
import { celebrar, progresso } from './celebracao'

type Categoria = 'reserva' | 'dividas' | 'viagem' | 'carro' | 'casa' | 'educacao' | 'casamento' | 'negocio' | 'aposentadoria' | 'outro'
interface Meta { nome: string; categoria: Categoria; valor_hoje: number; ja_tem: number; prazo_meses: number; porque: string; primeiro_passo: string }
interface Plano { resumo: string; metas: Meta[]; habitos: string[]; atencao: string[]; frase: string }
interface Salvo { plano: Plano; guardaPorMes: number | null; feitos: boolean[]; exemplo: boolean }

const CHAVE = 'planejador:v1'
const ROTULO: Record<Categoria, string> = {
  reserva: 'Reserva de emergência', dividas: 'Dívidas', viagem: 'Viagem', carro: 'Carro', casa: 'Casa própria',
  educacao: 'Educação', casamento: 'Casamento', negocio: 'Negócio próprio', aposentadoria: 'Independência financeira', outro: 'Objetivo'
}
const OPCAO_OBJETIVO: Partial<Record<Categoria, string>> = {
  viagem: 'Viagem', carro: 'Carro', casa: 'Entrada da casa própria', educacao: 'Educação dos filhos', casamento: 'Casamento', negocio: 'Abrir um negócio'
}

const EXEMPLO: Plano = {
  resumo: 'Você tem três objetivos bons e uma pedra no sapato. Primeiro, sair do cartão e montar o colchão de segurança; depois, carro e apartamento andam juntos, cada um no seu ritmo.',
  metas: [
    { nome: 'Quitar o cartão', categoria: 'dividas', valor_hoje: 4500, ja_tem: 0, prazo_meses: 4, porque: 'Juros de cartão passam de 10% ao mês: nenhum investimento compensa.', primeiro_passo: 'Ligar para o banco e pedir a troca por um crédito pessoal mais barato.' },
    { nome: 'Reserva de emergência', categoria: 'reserva', valor_hoje: 30000, ja_tem: 8000, prazo_meses: 18, porque: 'Seis meses de custo de vida, estimados em R$ 5 mil. Ajuste ao seu número.', primeiro_passo: 'Abrir uma conta separada só para a reserva, com liquidez diária.' },
    { nome: 'Trocar de carro', categoria: 'carro', valor_hoje: 40000, ja_tem: 0, prazo_meses: 24, porque: 'Pagar à vista (ou quase) evita anos de juros do financiamento.', primeiro_passo: 'Definir o modelo e o valor máximo, e anotar na meta.' },
    { nome: 'Entrada do apartamento', categoria: 'casa', valor_hoje: 90000, ja_tem: 0, prazo_meses: 60, porque: 'Prazo mais longo: dá tempo de os juros trabalharem a seu favor.', primeiro_passo: 'Simular o financiamento em SAC para saber a entrada ideal.' }
  ],
  habitos: ['Agendar a transferência para o dia do salário', 'Anotar os gastos da semana em um só lugar', 'Cancelar uma assinatura que não usa', 'Revisar o plano no último domingo do mês'],
  atencao: ['Enquanto houver dívida no cartão, priorize quitá-la antes de investir.', 'Valores do carro e do apartamento são estimativas: troque pelos seus números.'],
  frase: 'Quem tem um plano não precisa de sorte; precisa de constância.'
}

const $ = <T extends Element = HTMLElement>(sel: string, raiz: ParentNode = document) => raiz.querySelector<T>(sel)!
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const taxaReal = (meses: number) => (meses <= 24 ? 0.02 : 0.04)
const aporteDe = (m: Meta) => aporteNecessario(m.valor_hoje, m.ja_tem, mensalDeAnual(taxaReal(m.prazo_meses)), m.prazo_meses)
const prazoTexto = (meses: number) => (meses < 12 ? `${meses} ${meses === 1 ? 'mês' : 'meses'}` : meses % 12 === 0 ? `${meses / 12} ${meses === 12 ? 'ano' : 'anos'}` : `${(meses / 12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} anos`)
const br = (n: number) => Math.round(n).toLocaleString('pt-BR')

function linkSimulador(m: Meta): string {
  if (m.categoria === 'reserva') return '/ferramentas/reserva-de-emergencia'
  if (m.categoria === 'aposentadoria') return '/ferramentas/independencia-financeira'
  const p = new URLSearchParams({
    objetivo: OPCAO_OBJETIVO[m.categoria] ?? 'Outro', meta: br(m.valor_hoje), prazo: String(m.prazo_meses),
    guardado: br(m.ja_tem), aporte: br(aporteDe(m)), taxa: String(taxaReal(m.prazo_meses) * 100 + 4)
  })
  return `/ferramentas/meus-objetivos?${p}`
}

function ler(): Salvo | null {
  try { return JSON.parse(localStorage.getItem(CHAVE) || 'null') } catch { return null }
}
function gravar(s: Salvo) {
  try { localStorage.setItem(CHAVE, JSON.stringify(s)) } catch { /* navegação privada */ }
}

const raiz = document.querySelector<HTMLElement>('[data-planejador]')
if (raiz) iniciar(raiz)

function iniciar(raiz: HTMLElement) {
  const form = $<HTMLFormElement>('form', raiz)
  const area = $<HTMLTextAreaElement>('textarea', form)
  const erroEl = $('.pia__erro', form)
  const pensando = $('.pia__pensando', raiz)
  const planoEl = $('.pia__plano', raiz)
  let atual: Salvo | null = null

  raiz.querySelectorAll<HTMLButtonElement>('[data-exemplo]').forEach((b) =>
    b.addEventListener('click', () => { area.value = b.dataset.exemplo!; area.focus() }))

  const mostrarErro = (msg: string) => { erroEl.textContent = msg; erroEl.hidden = !msg }

  function mostrar(s: Salvo, rolar = true) {
    atual = s
    const { plano } = s
    $('[data-origem]', planoEl).textContent = s.exemplo ? 'Plano de exemplo' : 'Seu plano'
    $('[data-resumo]', planoEl).textContent = plano.resumo
    const frase = $('[data-incentivo]', planoEl)
    frase.textContent = plano.frase; frase.hidden = !plano.frase

    $('[data-metas]', planoEl).innerHTML = plano.metas.map((m, k) => {
      const aporte = aporteDe(m)
      const feito = m.valor_hoje > 0 ? Math.min(1, m.ja_tem / m.valor_hoje) : 0
      return `<li class="meta" style="animation-delay:${k * 120}ms">
        <p class="meta__cat">${esc(ROTULO[m.categoria])}</p>
        <h3 class="meta__nome">${esc(m.nome)}</h3>
        <div class="meta__numeros">
          <div><span>Valor</span><b>${reais(m.valor_hoje)}</b></div>
          <div><span>Prazo</span><b>${prazoTexto(m.prazo_meses)}</b></div>
          <div class="meta__aporte"><span>Guardar por mês</span><b>${aporte > 0 ? reais(aporte) : 'Já tem o valor'}</b></div>
        </div>
        <div class="meta__barra" aria-label="${Math.round(feito * 100)}% já guardado"><i style="--p:${feito}"></i></div>
        ${m.porque ? `<p class="meta__porque">${esc(m.porque)}</p>` : ''}
        ${m.primeiro_passo ? `<p class="meta__passo"><b>Primeiro passo</b>${esc(m.primeiro_passo)}</p>` : ''}
        <a class="meta__simular link" href="${linkSimulador(m)}">Ajustar no simulador <span class="seta">→</span></a>
      </li>`
    }).join('')

    // Balanço: o plano cabe no que a pessoa consegue guardar?
    const total = plano.metas.reduce((t, m) => t + aporteDe(m), 0)
    const balanco = $('[data-balanco]', planoEl)
    const cabe = s.guardaPorMes !== null && total <= s.guardaPorMes
    balanco.classList.toggle('ok', cabe)
    balanco.innerHTML = s.guardaPorMes === null
      ? `<b class="grande">${reais(total)}</b><p>por mês, somando todas as metas nos prazos sugeridos. Se pesar, alongue os prazos das metas de menor prioridade.</p>`
      : cabe
        ? `<b class="grande">${reais(total)}</b><p><b>O plano cabe no seu mês.</b> Você consegue guardar ${reais(s.guardaPorMes)} e o plano pede ${reais(total)}. A sobra pode acelerar a primeira meta.</p>`
        : `<b class="grande">${reais(total - s.guardaPorMes)}</b><p>é o que falta por mês para fazer tudo nos prazos sugeridos (o plano pede ${reais(total)}; você consegue ${reais(s.guardaPorMes)}). Comece pelas primeiras metas e alongue as últimas: plano bom é plano possível.</p>`

    const ul = $('[data-habitos]', planoEl)
    s.feitos = plano.habitos.map((_, k) => Boolean(s.feitos?.[k]))
    ul.innerHTML = plano.habitos.map((h, k) =>
      `<li><label class="habito"><input type="checkbox" data-k="${k}"${s.feitos[k] ? ' checked' : ''} /><span>${esc(h)}</span></label></li>`).join('')
    ul.querySelectorAll<HTMLInputElement>('input').forEach((c) => c.addEventListener('change', () => {
      s.feitos[Number(c.dataset.k)] = c.checked
      gravar(s)
      atualizarHabitos(s, true)
    }))
    atualizarHabitos(s, false)

    const atencao = $('[data-atencao]', planoEl)
    atencao.innerHTML = plano.atencao.map((a) => `<li>${esc(a)}</li>`).join('')
    $('[data-atencao-bloco]', planoEl).hidden = !plano.atencao.length

    form.hidden = true
    pensando.hidden = true
    planoEl.hidden = false
    if (rolar) planoEl.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    if (rolar && cabe) setTimeout(() => celebrar('plano-cabe', 'Seu plano fecha', `Tudo cabe nos ${reais(s.guardaPorMes!)} que você guarda por mês. Agora é constância.`), 1200)
  }

  function atualizarHabitos(s: Salvo, interagiu: boolean) {
    const feitos = s.feitos.filter(Boolean).length
    const n = Math.max(1, s.feitos.length)
    progresso('habitos', feitos / n)
    if (interagiu && feitos === s.feitos.length && feitos > 0) celebrar('habitos', 'Semana completa', 'Todos os hábitos da semana em dia. É assim que patrimônio se constrói.')
  }

  function etapasPensando(): () => void {
    const itens = Array.from(pensando.querySelectorAll('li'))
    itens.forEach((li) => li.classList.remove('on'))
    let k = 0
    itens[0]?.classList.add('on')
    const t = setInterval(() => { k = Math.min(itens.length - 1, k + 1); itens[k].classList.add('on') }, 2600)
    return () => clearInterval(t)
  }

  const numeroOuNulo = (nome: string) => {
    const v = (form.elements.namedItem(nome) as HTMLInputElement).value.trim()
    return v ? numeroBR(v) : null
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    mostrarErro('')
    const descricao = area.value.trim()
    if (descricao.length < 15) return mostrarErro('Conte um pouco mais sobre os seus objetivos (pelo menos uma frase).')
    const guardaPorMes = numeroOuNulo('guardaPorMes')
    const corpo = {
      descricao, idade: numeroOuNulo('idade'), guardaPorMes, jaGuardado: numeroOuNulo('jaGuardado'),
      site_web: (form.elements.namedItem('site_web') as HTMLInputElement).value
    }
    form.hidden = true
    pensando.hidden = false
    pensando.scrollIntoView({ block: 'center' })
    const parar = etapasPensando()
    try {
      const r = await fetch('/api/planejar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
      const dados = await r.json().catch(() => null)
      if (!r.ok || !dados?.plano) {
        throw new Error(r.status === 404 || r.status === 405
          ? 'O planejador com IA ainda não está ativo nesta versão do site. Veja o plano de exemplo para conhecer a ferramenta.'
          : dados?.erro || 'Não foi possível montar o plano agora. Tente de novo em instantes.')
      }
      const salvo: Salvo = { plano: dados.plano, guardaPorMes, feitos: [], exemplo: false }
      gravar(salvo)
      mostrar(salvo)
    } catch (err) {
      form.hidden = false
      pensando.hidden = true
      mostrarErro(err instanceof TypeError ? 'Sem conexão com o servidor. Verifique a internet e tente de novo.' : (err as Error).message)
    } finally {
      parar()
    }
  })

  $('[data-exemplo-plano]', form).addEventListener('click', () => mostrar({ plano: EXEMPLO, guardaPorMes: 4000, feitos: [], exemplo: true }))
  $('[data-recomecar]', planoEl).addEventListener('click', () => {
    planoEl.hidden = true
    form.hidden = false
    area.focus()
  })
  $('[data-imprimir]', planoEl).addEventListener('click', () => print())

  const salvo = ler()
  if (salvo?.plano?.metas?.length && !salvo.exemplo) mostrar(salvo, false)
}
