/**
 * Simulador local da ponte Google Apps Script — APENAS para desenvolvimento/testes.
 *
 * Executa o próprio apps-script/Code.gs em Node com uma planilha em memória e imita o
 * comportamento do Google (POST → 302 → GET com o resultado).
 *
 *   node scripts/simulador-planilha.cjs [porta]
 *
 * No app (modo dev), use a URL  http://127.0.0.1:<porta>/exec  e o token exibido no terminal.
 * Endpoints extras para testes:  GET /planilha (conteúdo das abas),  POST /admin (ver código).
 */
const http = require('http')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const crypto = require('crypto')

const PORTA = Number(process.argv[2] || process.env.PORTA || 8765)

// ---------- Planilha em memória ----------
class Aba {
  constructor(nome) { this.nome = nome; this.dados = [] }
  getName() { return this.nome }
  setName(n) { this.nome = n; return this }
  getFormUrl() { return null }
  setFrozenRows() { return this }
  getLastRow() {
    for (let r = this.dados.length - 1; r >= 0; r--) if ((this.dados[r] || []).some((v) => String(v ?? '') !== '')) return r + 1
    return 0
  }
  getLastColumn() {
    let max = 0
    for (const linha of this.dados) (linha || []).forEach((v, c) => { if (String(v ?? '') !== '' && c + 1 > max) max = c + 1 })
    return max
  }
  getRange(linha, coluna, nLinhas = 1, nColunas = 1) { return new Faixa(this, linha, coluna, nLinhas, nColunas) }
  celula(r, c) { return (this.dados[r] || [])[c] ?? '' }
  definir(r, c, v) { while (this.dados.length <= r) this.dados.push([]); const l = this.dados[r]; while (l.length <= c) l.push(''); l[c] = v === null || v === undefined ? '' : String(v) }
}
class Faixa {
  constructor(aba, l, c, nl, nc) { Object.assign(this, { aba, l, c, nl, nc }) }
  getSheet() { return this.aba }
  getRow() { return this.l }
  getColumn() { return this.c }
  getNumRows() { return this.nl }
  getNumColumns() { return this.nc }
  getDisplayValues() {
    const r = []
    for (let i = 0; i < this.nl; i++) { const linha = []; for (let j = 0; j < this.nc; j++) linha.push(this.aba.celula(this.l - 1 + i, this.c - 1 + j)); r.push(linha) }
    return r
  }
  getValues() { return this.getDisplayValues() }
  setValues(v) { v.forEach((linha, i) => linha.forEach((x, j) => this.aba.definir(this.l - 1 + i, this.c - 1 + j, x))); return this }
  clearContent() { for (let i = 0; i < this.nl; i++) for (let j = 0; j < this.nc; j++) if (this.aba.dados[this.l - 1 + i]) this.aba.definir(this.l - 1 + i, this.c - 1 + j, ''); return this }
  setNumberFormat() { return this }
  setFontWeight() { return this }
}
const abas = []
const planilha = {
  getName: () => 'Planilha simulada do CRM',
  getId: () => 'simulada',
  getSheets: () => abas,
  getSheetByName: (n) => abas.find((a) => a.getName() === n) || null,
  insertSheet: (n) => { const a = new Aba(n); abas.push(a); return a }
}
const props = {}

const contexto = vm.createContext({
  SpreadsheetApp: { getActiveSpreadsheet: () => planilha, flush: () => {}, getUi: () => { throw new Error('sem UI') } },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v } }) },
  Utilities: { getUuid: () => crypto.randomUUID() },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput: (s) => ({ conteudo: s, setMimeType() { return this } })
  },
  Logger: { log: (m) => console.log('[Apps Script]', m) },
  console
})
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), contexto, { filename: 'Code.gs' })
contexto.instalar()

// ---------- Utilitários de teste (simulam ações de pessoas na planilha) ----------
function admin(req) {
  switch (req.acao) {
    case 'editarCelula': {
      // Edição manual na aba Leads: localiza a linha pelo id e a coluna pelo título, e dispara onEdit.
      const aba = planilha.getSheetByName(req.aba || 'Leads')
      const cab = aba.dados[0]
      const c = cab.indexOf(req.coluna)
      const r = req.id ? aba.dados.findIndex((l) => l[cab.indexOf('id')] === req.id) : aba.getLastRow()
      if (c < 0 || r < 0) throw new Error('célula não encontrada')
      aba.definir(r, c, req.valor)
      contexto.onEdit({ range: aba.getRange(r + 1, c + 1, 1, 1) })
      return { linha: r + 1 }
    }
    case 'novaLinhaLeads': {
      const aba = planilha.getSheetByName('Leads')
      const cab = aba.dados[0]
      const r = aba.getLastRow()
      for (const [k, v] of Object.entries(req.valores)) aba.definir(r, cab.indexOf(k), v)
      contexto.onEdit({ range: aba.getRange(r + 1, 1, 1, cab.length) })
      return { linha: r + 1 }
    }
    case 'apagarLinhaLeads': {
      const aba = planilha.getSheetByName('Leads')
      const cab = aba.dados[0]
      aba.dados = aba.dados.filter((l, i) => i === 0 || l[cab.indexOf('id')] !== req.id)
      return {}
    }
    case 'respostaFormulario': {
      // Nova resposta do Google Forms na aba Entradas.
      let aba = planilha.getSheetByName('Entradas')
      if (!aba) { aba = planilha.insertSheet('Entradas'); aba.dados.push(['Carimbo de data/hora', ...Object.keys(req.valores)]) }
      const cab = aba.dados[0]
      const d = new Date(); const p = (n) => String(n).padStart(2, '0')
      const linha = cab.map((h, i) => (i === 0 ? `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` : req.valores[h] ?? ''))
      aba.dados.push(linha)
      return { linha: aba.dados.length }
    }
    default:
      throw new Error('ação de teste desconhecida')
  }
}

// ---------- Servidor HTTP (imita o redirecionamento do Google) ----------
const respostas = new Map()
http.createServer((req, res) => {
  let corpo = ''
  req.on('data', (c) => (corpo += c))
  req.on('end', () => {
    const url = new URL(req.url, 'http://x')
    try {
      if (req.method === 'POST' && url.pathname === '/exec') {
        const saida = contexto.doPost({ postData: { contents: corpo } })
        const chave = crypto.randomUUID()
        respostas.set(chave, saida.conteudo)
        res.writeHead(302, { Location: `/echo?k=${chave}` })
        return res.end()
      }
      if (req.method === 'GET' && url.pathname === '/echo') {
        const conteudo = respostas.get(url.searchParams.get('k'))
        respostas.delete(url.searchParams.get('k'))
        res.writeHead(conteudo ? 200 : 404, { 'Content-Type': 'application/json' })
        return res.end(conteudo || '{}')
      }
      if (req.method === 'GET' && url.pathname === '/exec') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        return res.end(contexto.doGet().conteudo)
      }
      if (req.method === 'GET' && url.pathname === '/planilha') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(Object.fromEntries(abas.map((a) => [a.getName(), a.dados.filter((l) => l.some((v) => v !== ''))]))))
      }
      if (req.method === 'POST' && url.pathname === '/admin') {
        const r = admin(JSON.parse(corpo))
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify(r))
      }
      res.writeHead(404)
      res.end()
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(String(e && e.stack || e))
    }
  })
}).listen(PORTA, '127.0.0.1', () => {
  console.log(`Simulador da planilha em http://127.0.0.1:${PORTA}/exec`)
  console.log(`Token: ${props.TOKEN}`)
})
