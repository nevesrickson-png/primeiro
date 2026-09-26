import { Construction } from 'lucide-react'
import { Vazio } from '../components/ui'

export function EmBreve({ titulo, fase, texto }: { titulo: string; fase: number; texto: string }) {
  return (
    <div className="h-full overflow-auto">
      <header className="flex h-14 items-center border-b border-zinc-200 px-6 dark:border-zinc-800">
        <h1 className="text-base font-semibold">{titulo}</h1>
      </header>
      <Vazio icone={<Construction size={22} />} titulo={`Disponível na Fase ${fase}`} texto={texto} />
    </div>
  )
}
