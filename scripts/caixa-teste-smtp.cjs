/**
 * Caixa de e-mail de TESTE (servidor SMTP local) — apenas para desenvolvimento.
 * Recebe os e-mails das campanhas sem enviar nada para a internet.
 *
 *   node scripts/caixa-teste-smtp.cjs
 *
 * No app (modo dev), em Configurações → E-mail: provedor "Outro", servidor 127.0.0.1, porta 2525,
 * segurança "Nenhuma (só teste local)", usuário qualquer e-mail, senha: senha-de-app
 *
 * Ver as mensagens recebidas: http://127.0.0.1:2526/mensagens
 * Destinatários com "rejeitar" no endereço são recusados (simula caixa inexistente).
 */
const { SMTPServer } = require('smtp-server')
const { simpleParser } = require('mailparser')
const http = require('http')

const SENHA = 'senha-de-app'
const mensagens = []

const smtp = new SMTPServer({
  secure: false,
  authOptional: false,
  allowInsecureAuth: true,
  disabledCommands: ['STARTTLS'],
  onAuth(auth, _sessao, cb) {
    if (auth.password !== SENHA) return cb(new Error('Senha inválida (use senha-de-app)'))
    cb(null, { user: auth.username })
  },
  onRcptTo(endereco, _sessao, cb) {
    if (endereco.address.includes('rejeitar')) {
      const e = new Error('Caixa postal inexistente')
      e.responseCode = 550
      return cb(e)
    }
    cb()
  },
  onData(stream, sessao, cb) {
    simpleParser(stream)
      .then((m) => {
        mensagens.push({
          de: m.from?.text,
          para: m.to?.text,
          responderPara: m.replyTo?.text ?? null,
          assunto: m.subject,
          texto: m.text,
          html: m.html,
          anexos: (m.attachments || []).map((a) => ({ nome: a.filename, tamanho: a.size })),
          recebidoEm: new Date().toISOString()
        })
        console.log(`✉  ${m.to?.text} — ${m.subject}`)
        cb()
      })
      .catch(cb)
  }
})
smtp.on('error', (e) => console.error('SMTP:', e.message))
smtp.listen(2525, '127.0.0.1', () => console.log('Caixa de teste SMTP em 127.0.0.1:2525 (senha: senha-de-app)'))

http
  .createServer((req, res) => {
    if (req.url === '/limpar') mensagens.length = 0
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(mensagens, null, 2))
  })
  .listen(2526, '127.0.0.1', () => console.log('Mensagens recebidas: http://127.0.0.1:2526/mensagens'))
