import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts'
import { AlertTriangle, BarChart3, CheckCircle2, Table2, Users, Wallet, TrendingUp, Clock, ListTodo, Briefcase } from 'lucide-react'
import { ETAPAS, ORIGENS, rotulo } from '@shared/constants'
import type { DadosPainel, PeriodoPainel } from '@shared/types'
import { api, chamar } from '../lib/api'
import { data as formatarData, diasDesde, moeda, moedaCompacta } from '../lib/format'
import { useEscuro } from '../lib/useEscuro'
import { usePersistente } from '../lib/usePersistente'
import { EtapaBadge } from '../components/ui'
import { useToast } from '../components/toast'

const PERIODOS: { value: PeriodoPainel; label: string }[] = [
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
  { value: 180, label: '6 meses' },
  { value: 365, label: '12 meses' },
  { value: 0, label: 'Tudo' }
]
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const rotuloMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`
const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`)
const rotuloOrigem = (o: string) => (o === 'sem_origem' ? 'Sem origem' : rotulo(ORIGENS, o))

/** Cores dos gráficos (série única, azul validado para cada tema) e tinta dos eixos. */
function useCores() {
  const escuro = useEscuro()
  return escuro
    ? { serie: '#3987e5', grade: '#27272a', eixo: '#a1a1aa', texto: '#e4e4e7', cursor: 'rgba(255,255,255,0.04)' }
    : { serie: '#2a78d6', grade: '#f1f1f3', eixo: '#71717a', texto: '#3f3f46', cursor: 'rgba(0,0,0,0.035)' }
}

function Kpi({ icone, titulo, valor, sub, alerta, onClick }: {
  icone: ReactNode; titulo: string; valor: string; sub?: string; alerta?: boolean; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={clsx('card flex flex-col items-start p-4 text-left transition disabled:cursor-default', onClick && 'hover:border-zinc-300 dark:hover:border-zinc-700')}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        {icone} {titulo}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{valor}</div>
      {sub && (
        <div className={clsx('mt-0.5 flex items-center gap-1 text-xs', alerta ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400')}>
          {alerta && <AlertTriangle size={11} />}
          {sub}
        </div>
      )}
    </button>
  )
}

/** Cartão de gráfico com alternância para visão em tabela (acessibilidade e conferência de números). */
function CartaoGrafico({ titulo, descricao, tabela, children, altura = 280 }: {
  titulo: string
  descricao?: string
  tabela: { colunas: string[]; linhas: (string | number)[][] }
  children: ReactNode
  altura?: number
}) {
  const [verTabela, setVerTabela] = useState(false)
  return (
    <section className="card flex flex-col p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{titulo}</h2>
          {descricao && <p className="text-xs text-zinc-500">{descricao}</p>}
        </div>
        <button className="btn-ghost btn-sm" onClick={() => setVerTabela((v) => !v)} title={verTabela ? 'Ver gráfico' : 'Ver tabela'}>
          {verTabela ? <BarChart3 size={13} /> : <Table2 size={13} />}
        </button>
      </div>
      <div style={{ height: altura }}>
        {verTabela ? (
          <div className="h-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500">
                  {tabela.colunas.map((c, i) => (
                    <th key={c} className={clsx('border-b border-zinc-100 pb-1.5 font-medium dark:border-zinc-800', i > 0 && 'text-right')}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabela.linhas.map((l, i) => (
                  <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800/50">
                    {l.map((v, j) => (
                      <td key={j} className={clsx('py-1.5', j > 0 && 'text-right tabular-nums')}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  )
}

function Dica({ active, payload, render }: { active?: boolean; payload?: { payload: unknown }[]; render: (p: never) => ReactNode }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      {render(payload[0].payload as never)}
    </div>
  )
}

export function Painel() {
  const navigate = useNavigate()
  const avisar = useToast()
  const cores = useCores()
  const [estado, setEstado] = usePersistente<{ periodo: PeriodoPainel }>('painel', { periodo: 90 })
  const [dados, setDados] = useState<DadosPainel | null>(null)

  useEffect(() => {
    chamar(api.painel.obter(estado.periodo)).then(setDados).catch((e) => avisar(e.message, 'erro'))
  }, [estado.periodo, avisar])

  const conversao = useMemo(
    () =>
      (dados?.conversao ?? []).map((c, i, arr) => ({
        ...c,
        nome: rotulo(ETAPAS, c.etapa),
        doAnterior: i === 0 ? null : arr[i - 1].qtd ? c.qtd / arr[i - 1].qtd : null,
        doInicio: arr[0].qtd ? c.qtd / arr[0].qtd : null
      })),
    [dados]
  )
  const origens = useMemo(() => (dados?.porOrigem ?? []).map((o) => ({ ...o, nome: rotuloOrigem(o.origem) })), [dados])
  const potencial = useMemo(
    () => (dados?.potencialPorEtapa ?? []).filter((p) => p.etapa !== 'perdido').map((p) => ({ ...p, nome: rotulo(ETAPAS, p.etapa) })),
    [dados]
  )
  const meses = useMemo(() => (dados?.novosPorMes ?? []).map((m) => ({ ...m, nome: rotuloMes(m.mes) })), [dados])

  if (!dados) return null
  const k = dados.kpis
  // "nos últimos 90 dias" / "desde o início"
  const noPeriodo = estado.periodo ? `nos últimos ${PERIODOS.find((p) => p.value === estado.periodo)!.label}` : 'desde o início'
  const eixo = { fontSize: 11, fill: cores.eixo }

  return (
    <div className="h-full overflow-auto">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-zinc-200 bg-white/90 px-6 backdrop-blur dark:border-zinc-800 dark:bg-[#0b0d12]/90">
        <h1 className="text-base font-semibold">Painel</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Leads cadastrados em:</span>
          <div className="flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
            {PERIODOS.map((p) => (
              <button
                key={p.value}
                onClick={() => setEstado({ periodo: p.value })}
                className={clsx('h-7 rounded px-2.5 text-xs font-medium', estado.periodo === p.value ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-3 gap-3 xl:grid-cols-6">
          <Kpi icone={<Users size={13} />} titulo="Leads" valor={k.totalLeads.toLocaleString('pt-BR')} sub={`+${k.novosNoPeriodo} ${noPeriodo}`} onClick={() => navigate('/leads')} />
          <Kpi icone={<Briefcase size={13} />} titulo="Em negociação" valor={k.emNegociacao.toLocaleString('pt-BR')} sub="de Novo até Proposta" onClick={() => navigate('/funil')} />
          <Kpi icone={<Wallet size={13} />} titulo="Potencial no funil" valor={moedaCompacta(k.potencialFunil) || 'R$ 0'} sub={moeda(k.potencialFunil)} />
          <Kpi icone={<CheckCircle2 size={13} />} titulo="Clientes ativos" valor={k.clientesAtivos.toLocaleString('pt-BR')} />
          <Kpi icone={<TrendingUp size={13} />} titulo="Conversão" valor={pct(k.taxaConversao)} sub="chegaram a Conta aberta" />
          <Kpi icone={<Clock size={13} />} titulo="Leads parados" valor={k.parados.toLocaleString('pt-BR')} sub={`sem atividade há +${dados.diasParado} dias`} alerta={k.parados > 0} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <CartaoGrafico
            titulo="Conversão por etapa"
            descricao={`Leads cadastrados ${noPeriodo} que chegaram a cada etapa · ${dados.perdidos} perdidos`}
            tabela={{
              colunas: ['Etapa', 'Leads', '% da etapa anterior', '% do total'],
              linhas: conversao.map((c) => [c.nome, c.qtd, pct(c.doAnterior), pct(c.doInicio)])
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversao} layout="vertical" margin={{ top: 0, right: 110, bottom: 0, left: 0 }} barCategoryGap={6}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nome" width={120} tick={eixo} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: cores.cursor }}
                  content={<Dica render={(c: (typeof conversao)[number]) => (
                    <>
                      <div className="font-medium">{c.nome}</div>
                      <div className="text-zinc-500">{c.qtd} lead(s)</div>
                      {c.doAnterior !== null && <div className="text-zinc-500">{pct(c.doAnterior)} da etapa anterior</div>}
                      <div className="text-zinc-500">{pct(c.doInicio)} do total</div>
                    </>
                  )} />}
                />
                <Bar dataKey="qtd" fill={cores.serie} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  <LabelList
                    dataKey="qtd"
                    position="right"
                    content={(p) => {
                      const { x, y, width, height, index } = p as { x: number; y: number; width: number; height: number; index: number }
                      const c = conversao[index]
                      return (
                        <text x={x + width + 8} y={y + height / 2} dominantBaseline="central" fontSize={11} fill={cores.texto}>
                          <tspan fontWeight={600}>{c.qtd}</tspan>
                          {c.doAnterior !== null && <tspan fill={cores.eixo}>{`  ${pct(c.doAnterior)}`}</tspan>}
                        </text>
                      )
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CartaoGrafico>

          <CartaoGrafico
            titulo="Leads por origem"
            descricao={`Cadastrados ${noPeriodo}`}
            tabela={{
              colunas: ['Origem', 'Leads', 'Convertidos', 'Conversão'],
              linhas: origens.map((o) => [o.nome, o.qtd, o.convertidos, pct(o.qtd ? o.convertidos / o.qtd : null)])
            }}
          >
            {origens.length === 0 ? (
              <p className="pt-20 text-center text-sm text-zinc-500">Nenhum lead no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={origens} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }} barCategoryGap={6}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="nome" width={110} tick={eixo} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: cores.cursor }}
                    content={<Dica render={(o: (typeof origens)[number]) => (
                      <>
                        <div className="font-medium">{o.nome}</div>
                        <div className="text-zinc-500">{o.qtd} lead(s)</div>
                        <div className="text-zinc-500">{o.convertidos} convertido(s) · {pct(o.qtd ? o.convertidos / o.qtd : null)}</div>
                      </>
                    )} />}
                  />
                  <Bar dataKey="qtd" fill={cores.serie} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    <LabelList dataKey="qtd" position="right" fontSize={11} fill={cores.texto} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CartaoGrafico>

          <CartaoGrafico
            titulo="Potencial por etapa"
            descricao="Soma do valor potencial dos leads em cada etapa hoje"
            tabela={{
              colunas: ['Etapa', 'Leads', 'Valor potencial'],
              linhas: potencial.map((p) => [p.nome, p.qtd, moeda(p.valor)])
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={potencial} layout="vertical" margin={{ top: 0, right: 70, bottom: 0, left: 0 }} barCategoryGap={6}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nome" width={120} tick={eixo} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: cores.cursor }}
                  content={<Dica render={(p: (typeof potencial)[number]) => (
                    <>
                      <div className="font-medium">{p.nome}</div>
                      <div className="text-zinc-500">{moeda(p.valor)}</div>
                      <div className="text-zinc-500">{p.qtd} lead(s)</div>
                    </>
                  )} />}
                />
                <Bar dataKey="valor" fill={cores.serie} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  <LabelList dataKey="valor" position="right" fontSize={11} fill={cores.texto} formatter={(v) => moedaCompacta(Number(v))} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CartaoGrafico>

          <CartaoGrafico
            titulo="Novos leads por mês"
            descricao="Últimos 12 meses"
            tabela={{ colunas: ['Mês', 'Novos leads'], linhas: meses.map((m) => [m.nome, m.qtd]) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meses} margin={{ top: 20, right: 8, bottom: 0, left: -12 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke={cores.grade} />
                <XAxis dataKey="nome" tick={{ ...eixo, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={eixo} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: cores.cursor }}
                  content={<Dica render={(m: (typeof meses)[number]) => (
                    <>
                      <div className="font-medium">{m.nome}</div>
                      <div className="text-zinc-500">{m.qtd} novo(s) lead(s)</div>
                    </>
                  )} />}
                />
                <Bar dataKey="qtd" fill={cores.serie} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false}>
                  <LabelList dataKey="qtd" position="top" fontSize={10} fill={cores.texto} formatter={(v) => (Number(v) ? v : '')} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CartaoGrafico>

          <section className="card flex flex-col p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">Leads parados</h2>
              <p className="text-xs text-zinc-500">
                Sem edição, interação ou mudança de etapa há mais de {dados.diasParado} dias (ajuste em Configurações)
                {k.parados > dados.parados.length && ` · mostrando os ${dados.parados.length} mais antigos de ${k.parados}`}
              </p>
            </div>
            <div className="max-h-[280px] overflow-auto">
              {dados.parados.length === 0 ? (
                <p className="py-16 text-center text-sm text-zinc-500">Nenhum lead parado. 👏</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {dados.parados.map((l) => (
                      <tr key={l.id} onClick={() => navigate(`/leads/${l.id}`)} className="cursor-pointer border-b border-zinc-50 hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/40">
                        <td className="py-1.5 pr-2">
                          <div className="truncate font-medium">{l.nome}</div>
                          <div className="truncate text-xs text-zinc-500">{l.empresa}</div>
                        </td>
                        <td className="py-1.5 pr-2"><EtapaBadge etapa={l.etapa} /></td>
                        <td className="py-1.5 pr-2 text-right text-xs tabular-nums text-amber-600 dark:text-amber-400">{diasDesde(l.ultima_atividade)} dias</td>
                        <td className="py-1.5 text-right text-xs tabular-nums text-zinc-500">{moedaCompacta(l.valor_potencial)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="card flex flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Tarefas atrasadas</h2>
                <p className="text-xs text-zinc-500">Tarefas não concluídas com vencimento antes de hoje</p>
              </div>
              <span className={clsx('rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', k.tarefasAtrasadas ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800')}>
                {k.tarefasAtrasadas}
              </span>
            </div>
            <div className="max-h-[280px] overflow-auto">
              {dados.tarefasAtrasadas.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center text-sm text-zinc-500">
                  <ListTodo size={20} className="mb-2 text-zinc-400" />
                  Nenhuma tarefa atrasada.
                  <span className="mt-1 text-xs text-zinc-400">O cadastro de tarefas chega na Fase 4.</span>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {dados.tarefasAtrasadas.map((t) => (
                      <tr key={t.id} onClick={() => t.lead_id && navigate(`/leads/${t.lead_id}`)} className={clsx('border-b border-zinc-50 dark:border-zinc-800/50', t.lead_id && 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40')}>
                        <td className="py-1.5 pr-2">
                          <div className="truncate font-medium">{t.titulo}</div>
                          <div className="truncate text-xs text-zinc-500">{t.lead_nome}</div>
                        </td>
                        <td className="py-1.5 text-right text-xs tabular-nums text-red-600 dark:text-red-400">{formatarData(t.data_vencimento)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
