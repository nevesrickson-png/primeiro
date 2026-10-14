/**
 * Envio dos formulários do site para a ponte do Google Apps Script (aba "Entradas" → CRM).
 * O Apps Script não devolve CORS, então o envio é "no-cors": se a requisição sai, consideramos
 * enviado. Validação básica é feita aqui e repetida no Apps Script.
 */
const ENDPOINT: string = import.meta.env.PUBLIC_FORM_ENDPOINT ?? ''
const CAMPOS = ['nome', 'email', 'whatsapp', 'cidade', 'profissao', 'empresa', 'perfil', 'mensagem', 'como_conheceu', 'site_web']

function status(form: HTMLFormElement, tipo: 'ok' | 'erro' | '', texto: string) {
  const el = form.querySelector<HTMLElement>('[data-status]')
  if (!el) return
  el.dataset.tipo = tipo
  el.textContent = texto
}

async function enviar(form: HTMLFormElement) {
  const fd = new FormData(form)
  const dados: Record<string, unknown> = {}
  for (const c of CAMPOS) {
    const v = fd.get(c)
    if (typeof v === 'string' && v.trim()) dados[c] = v.trim()
  }
  dados.lgpd = fd.get('lgpd') === 'on'
  if (!dados.lgpd) return status(form, 'erro', 'Para enviar, marque a autorização de uso dos dados.')

  if (!ENDPOINT) {
    console.warn('PUBLIC_FORM_ENDPOINT não configurado; dados não enviados:', dados)
    return status(form, 'erro', 'Formulário ainda não conectado. Escreva para contato@ricksonmessias.com.')
  }

  const botao = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const rotulo = botao?.innerHTML
  if (botao) {
    botao.disabled = true
    botao.textContent = 'Enviando…'
  }
  status(form, '', '')
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ acao: 'formularioSite', formulario: form.dataset.formulario, dados })
    })
    const destino = form.dataset.sucesso
    if (destino) {
      location.href = destino
      return
    }
    form.reset()
    status(form, 'ok', form.dataset.mensagemOk ?? 'Pronto. Recebido.')
  } catch {
    status(form, 'erro', 'Não foi possível enviar agora. Tente de novo em instantes, escreva para contato@ricksonmessias.com ou chame no WhatsApp (21) 99205-3248.')
  } finally {
    if (botao && rotulo !== undefined) {
      botao.disabled = false
      botao.innerHTML = rotulo
    }
  }
}

document.querySelectorAll<HTMLFormElement>('form[data-formulario]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (!form.reportValidity()) return
    void enviar(form)
  })
})
