import { createContext, ReactNode, useCallback, useContext, useState } from 'react'
import clsx from 'clsx'
import { CheckCircle2, AlertCircle } from 'lucide-react'

type Tipo = 'sucesso' | 'erro'
interface Toast { id: number; tipo: Tipo; texto: string }

const Ctx = createContext<(texto: string, tipo?: Tipo) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const avisar = useCallback((texto: string, tipo: Tipo = 'sucesso') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, tipo, texto }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === 'erro' ? 6000 : 3000)
  }, [])
  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm shadow-lg dark:bg-zinc-900',
              t.tipo === 'erro' ? 'border-red-200 dark:border-red-900' : 'border-zinc-200 dark:border-zinc-800'
            )}
          >
            {t.tipo === 'erro' ? <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />}
            <span>{t.texto}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
