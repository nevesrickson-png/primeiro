import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react'
import type { Aplicacao, AplicacaoInput } from '@shared/types'
import { api, chamar } from '../lib/api'
import { data as formatarData, moeda } from '../lib/format'
import { DataInput, MoedaInput } from './inputs'
import { hojeISO, somarDiasISO } from './tarefas'
import { useToast } from './toast'

type Rascunho = Omit<AplicacaoInput, 'lead_id'>
const VAZIO: Rascunho = { produto: '', valor: null, data_vencimento: null }

/** Tabela editável de aplicações do lead (dados sensíveis, só locais). */
export function AplicacoesLead({ leadId }: { leadId: string }) {
  const avisar = useToast()
  const [itens, setItens] = useState<Aplicacao[]>([])
  const [editando, setEditando] = useState<string | 'nova' | null>(null)
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO)

  const carregar = useCallback(() => {
    chamar(api.aplicacoes.listar(leadId)).then(setItens).catch((e) => avisar(e.message, 'erro'))
  }, [leadId, avisar])
  useEffect(() => {
    carregar()
  }, [carregar])

  async function salvar() {
    try {
      const dados = { ...rascunho, lead_id: leadId }
      if (editando === 'nova') await chamar(api.aplicacoes.criar(dados))
      else if (editando) await chamar(api.aplicacoes.atualizar(editando, dados))
      setEditando(null)
      carregar()
    } catch (e) {
      avisar((e as Error).message, 'erro')
    }
  }

  async function excluir(id: string) {
    await chamar(api.aplicacoes.excluir(id)).catch((e) => avisar(e.message, 'erro'))
    carregar()
  }

  const total = itens.reduce((s, a) => s + (a.valor ?? 0), 0)
  const hoje = hojeISO()
  const em30 = somarDiasISO(hoje, 30)

  const linhaEdicao = (chave: string) => (
    <tr key={chave}>
      <td className="py-1.5 pr-2"><input autoFocus className="input h-8" placeholder="Ex.: CDB Banco X 2027" value={rascunho.produto} onChange={(e) => setRascunho((r) => ({ ...r, produto: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && salvar()} /></td>
      <td className="py-1.5 pr-2"><MoedaInput value={rascunho.valor} onChange={(v) => setRascunho((r) => ({ ...r, valor: v }))} /></td>
      <td className="py-1.5 pr-2"><DataInput value={rascunho.data_vencimento} onChange={(v) => setRascunho((r) => ({ ...r, data_vencimento: v }))} /></td>
      <td className="whitespace-nowrap py-1.5 text-right">
        <button className="btn-primary btn-sm" onClick={salvar} title="Salvar"><Check size={13} /></button>
        <button className="btn-ghost btn-sm" onClick={() => setEditando(null)} title="Cancelar"><X size={13} /></button>
      </td>
    </tr>
  )

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500">
            <th className="pb-1.5 font-medium">Produto</th>
            <th className="w-44 pb-1.5 font-medium">Valor</th>
            <th className="w-36 pb-1.5 font-medium">Vencimento</th>
            <th className="w-20" />
          </tr>
        </thead>
        <tbody>
          {itens.map((a) =>
            editando === a.id ? (
              linhaEdicao(a.id)
            ) : (
              <tr key={a.id} className="group border-t border-zinc-100 dark:border-zinc-800">
                <td className="py-2 pr-2">{a.produto}</td>
                <td className="py-2 pr-2 tabular-nums">{moeda(a.valor)}</td>
                <td className={clsx('py-2 pr-2 tabular-nums', a.data_vencimento && a.data_vencimento < hoje ? 'text-zinc-400 line-through' : a.data_vencimento && a.data_vencimento <= em30 ? 'font-medium text-amber-600 dark:text-amber-400' : '')}>
                  {formatarData(a.data_vencimento)}
                </td>
                <td className="whitespace-nowrap py-2 text-right opacity-0 group-hover:opacity-100">
                  <button className="btn-ghost btn-sm" title="Editar" onClick={() => { setEditando(a.id); setRascunho({ produto: a.produto, valor: a.valor, data_vencimento: a.data_vencimento }) }}><Pencil size={12} /></button>
                  <button className="btn-ghost btn-sm hover:text-red-600" title="Excluir" onClick={() => excluir(a.id)}><Trash2 size={12} /></button>
                </td>
              </tr>
            )
          )}
          {editando === 'nova' && linhaEdicao('nova')}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-between">
        <button className="btn-ghost btn-sm" onClick={() => { setEditando('nova'); setRascunho(VAZIO) }} disabled={editando !== null}>
          <Plus size={13} /> Adicionar aplicação
        </button>
        {itens.length > 0 && <span className="text-xs text-zinc-500">Total aplicado: <strong className="tabular-nums">{moeda(total)}</strong></span>}
      </div>
    </div>
  )
}
