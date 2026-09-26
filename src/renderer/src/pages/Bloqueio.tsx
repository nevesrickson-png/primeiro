import { FormEvent, useState } from 'react'
import { Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import type { AuthStatus } from '@shared/types'
import { api, chamar } from '../lib/api'

export function Bloqueio({ status, onDesbloqueado }: { status: AuthStatus; onDesbloqueado: () => void }) {
  const criando = !status.bancoExiste
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (criando) {
      if (senha.length < 6) return setErro('A senha deve ter pelo menos 6 caracteres.')
      if (senha !== confirmacao) return setErro('As senhas não conferem.')
    }
    setCarregando(true)
    try {
      await chamar(criando ? api.auth.criar(senha) : api.auth.desbloquear(senha))
      onDesbloqueado()
    } catch (e) {
      setErro((e as Error).message)
      setSenha('')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-b from-zinc-50 to-white p-6 dark:from-zinc-950 dark:to-[#0b0d12]">
      <form onSubmit={enviar} className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            {criando ? <ShieldCheck size={22} /> : <Lock size={22} />}
          </div>
          <h1 className="text-xl font-semibold">{criando ? 'Bem-vindo ao CRM Assessor' : 'CRM Assessor'}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {criando
              ? 'Crie uma senha para criptografar seu banco de dados. Guarde-a bem: sem ela não é possível recuperar os dados.'
              : 'Digite sua senha para abrir o banco de dados.'}
          </p>
        </div>
        <div className="card space-y-3 p-5 shadow-sm">
          <div>
            <span className="label">{criando ? 'Nova senha' : 'Senha'}</span>
            <div className="relative">
              <input
                autoFocus
                type={mostrar ? 'text' : 'password'}
                className="input pr-9"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <button type="button" tabIndex={-1} onClick={() => setMostrar((m) => !m)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {mostrar ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {criando && (
            <div>
              <span className="label">Confirmar senha</span>
              <input type={mostrar ? 'text' : 'password'} className="input" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
            </div>
          )}
          {erro && <p className="text-sm text-red-600 dark:text-red-400">{erro}</p>}
          <button type="submit" className="btn-primary w-full" disabled={carregando || !senha}>
            {carregando ? 'Abrindo…' : criando ? 'Criar banco criptografado' : 'Desbloquear'}
          </button>
        </div>
        <p className="mt-4 truncate text-center text-[11px] text-zinc-400" title={status.caminhoBanco}>
          {status.caminhoBanco}
        </p>
      </form>
    </div>
  )
}
