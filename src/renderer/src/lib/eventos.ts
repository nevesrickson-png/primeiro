/** Aviso simples entre telas: quando tarefas mudam, o contador do menu é atualizado. */
const alvo = new EventTarget()

export function avisarTarefasAlteradas(): void {
  alvo.dispatchEvent(new Event('tarefas'))
}

export function aoAlterarTarefas(fn: () => void): () => void {
  alvo.addEventListener('tarefas', fn)
  return () => alvo.removeEventListener('tarefas', fn)
}
