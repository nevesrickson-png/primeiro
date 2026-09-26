/**
 * CRM Assessor — ponte entre o app desktop e esta planilha Google.
 *
 * Publicado como App da Web, recebe chamadas POST do app (autenticadas por token)
 * para ler/gravar a aba "Leads" e importar as respostas do Google Forms da aba "Entradas".
 *
 * Instalação passo a passo: veja apps-script/LEIA-ME.md
 *
 * Funções para rodar pelo editor (menu "Executar"):
 *   instalar()          → cria as abas, gera o token secreto e mostra o token
 *   criarFormulario()   → cria o Google Forms de captura (com aceite LGPD) ligado à aba "Entradas"
 *   mostrarToken()      → mostra o token atual
 *   gerarNovoToken()    → troca o token (o antigo deixa de funcionar)
 */

var ABA_LEADS = 'Leads';
var ABA_ENTRADAS = 'Entradas';
var COL_IMPORTADO = 'Importado pelo CRM';
var COL_ID = 'id';
var COL_CRIADO = 'created_at';
var COL_ATUALIZADO = 'updated_at';
var COL_EXCLUIDO = 'deleted_at';

// ---------------------------------------------------------------------------
// Entrada HTTP
// ---------------------------------------------------------------------------

function doGet() {
  return ContentService.createTextOutput('CRM Assessor: ponte ativa. Use o app para sincronizar.');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (!token) return json_({ ok: false, erro: 'Token não configurado. Rode a função instalar() no editor do Apps Script.' });
    if (req.token !== token) return json_({ ok: false, erro: 'Token inválido.' });

    switch (req.acao) {
      case 'ping':
        return json_({ ok: true, planilha: SpreadsheetApp.getActiveSpreadsheet().getName(), versao: 1 });
      case 'lerLeads':
        return json_({ ok: true, dados: lerLeads_() });
      case 'gravarLeads':
        return json_({ ok: true, dados: gravarLeads_(req.cabecalho || [], req.linhas || []) });
      case 'lerEntradas':
        return json_({ ok: true, dados: lerEntradas_() });
      case 'marcarImportadas':
        return json_({ ok: true, dados: marcarImportadas_(req.itens || []) });
      default:
        return json_({ ok: false, erro: 'Ação desconhecida: ' + req.acao });
    }
  } catch (err) {
    return json_({ ok: false, erro: String((err && err.message) || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* ignora */ }
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Aba "Leads" (espelho bidirecional)
// ---------------------------------------------------------------------------

function abaLeads_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(ABA_LEADS) || ss.insertSheet(ABA_LEADS);
}

function linhaVazia_(linha) {
  for (var i = 0; i < linha.length; i++) if (String(linha[i]).trim() !== '') return false;
  return true;
}

function agoraISO_() {
  return new Date().toISOString();
}

/** Lê a aba Leads como objetos {cabeçalho: valor}. Linhas criadas à mão sem id recebem id e updated_at. */
function lerLeads_() {
  var aba = abaLeads_();
  var ultimaLinha = aba.getLastRow();
  var ultimaCol = aba.getLastColumn();
  if (ultimaLinha < 1 || ultimaCol < 1) return { cabecalho: [], linhas: [] };
  var valores = aba.getRange(1, 1, ultimaLinha, ultimaCol).getDisplayValues();
  var cab = valores[0];
  var iId = cab.indexOf(COL_ID), iAt = cab.indexOf(COL_ATUALIZADO), iCr = cab.indexOf(COL_CRIADO);
  var linhas = [];
  for (var r = 1; r < valores.length; r++) {
    var linha = valores[r];
    if (linhaVazia_(linha)) continue;
    if (iId >= 0 && !linha[iId]) {
      linha[iId] = Utilities.getUuid();
      aba.getRange(r + 1, iId + 1, 1, 1).setNumberFormat('@').setValues([[linha[iId]]]);
    }
    if (iAt >= 0 && !linha[iAt]) {
      linha[iAt] = agoraISO_();
      aba.getRange(r + 1, iAt + 1, 1, 1).setNumberFormat('@').setValues([[linha[iAt]]]);
    }
    if (iCr >= 0 && !linha[iCr]) {
      linha[iCr] = linha[iAt] || agoraISO_();
      aba.getRange(r + 1, iCr + 1, 1, 1).setNumberFormat('@').setValues([[linha[iCr]]]);
    }
    var obj = {};
    for (var c = 0; c < cab.length; c++) if (cab[c]) obj[cab[c]] = linha[c];
    linhas.push(obj);
  }
  return { cabecalho: cab, linhas: linhas };
}

/**
 * Insere/atualiza linhas pelo id. Linhas com deleted_at preenchido são removidas da planilha.
 * Colunas extras criadas pelo usuário são preservadas.
 */
function gravarLeads_(cabecalhoApp, linhasApp) {
  var aba = abaLeads_();
  var ultimaLinha = aba.getLastRow();
  var ultimaCol = aba.getLastColumn();
  var dados = ultimaLinha >= 1 && ultimaCol >= 1 ? aba.getRange(1, 1, ultimaLinha, ultimaCol).getDisplayValues() : [];
  var cab = dados.length ? dados[0].slice() : [];
  var corpo = dados.slice(1);

  // Garante as colunas enviadas pelo app (novas colunas vão para o final).
  for (var i = 0; i < cabecalhoApp.length; i++) {
    if (cab.indexOf(cabecalhoApp[i]) < 0) cab.push(cabecalhoApp[i]);
  }
  var nCol = cab.length;
  for (var r = 0; r < corpo.length; r++) while (corpo[r].length < nCol) corpo[r].push('');

  var iId = cab.indexOf(COL_ID);
  var porId = {};
  for (var r2 = 0; r2 < corpo.length; r2++) {
    var id = corpo[r2][iId];
    if (id) porId[id] = r2;
  }

  var excluir = {};
  var inseridos = 0, atualizados = 0, removidos = 0;
  for (var k = 0; k < linhasApp.length; k++) {
    var obj = linhasApp[k];
    var alvo = porId.hasOwnProperty(obj[COL_ID]) ? porId[obj[COL_ID]] : -1;
    if (obj[COL_EXCLUIDO]) {
      if (alvo >= 0) { excluir[alvo] = true; removidos++; }
      continue;
    }
    var linha;
    if (alvo >= 0) {
      linha = corpo[alvo];
      atualizados++;
    } else {
      linha = [];
      for (var c = 0; c < nCol; c++) linha.push('');
      corpo.push(linha);
      porId[obj[COL_ID]] = corpo.length - 1;
      inseridos++;
    }
    for (var c2 = 0; c2 < nCol; c2++) {
      if (obj.hasOwnProperty(cab[c2])) linha[c2] = obj[cab[c2]] === null || obj[cab[c2]] === undefined ? '' : String(obj[cab[c2]]);
    }
  }

  var novoCorpo = [];
  for (var r3 = 0; r3 < corpo.length; r3++) if (!excluir[r3]) novoCorpo.push(corpo[r3]);

  // Reescreve a aba inteira em uma operação, tudo como texto (evita conversões automáticas de data/número).
  var totalLinhas = Math.max(dados.length, novoCorpo.length + 1);
  if (totalLinhas > 0 && nCol > 0) {
    var faixa = aba.getRange(1, 1, totalLinhas, nCol);
    faixa.clearContent();
    faixa.setNumberFormat('@');
    var saida = [cab].concat(novoCorpo);
    aba.getRange(1, 1, saida.length, nCol).setValues(saida);
    aba.getRange(1, 1, 1, nCol).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return { inseridos: inseridos, atualizados: atualizados, removidos: removidos, total: novoCorpo.length };
}

/** Gatilho simples: quando alguém edita a aba Leads à mão, carimba updated_at (e cria id se for linha nova). */
function onEdit(e) {
  try {
    var faixa = e && e.range;
    if (!faixa) return;
    var aba = faixa.getSheet();
    if (aba.getName() !== ABA_LEADS || faixa.getRow() + faixa.getNumRows() - 1 < 2) return;
    var ultimaCol = aba.getLastColumn();
    var cab = aba.getRange(1, 1, 1, ultimaCol).getDisplayValues()[0];
    var iId = cab.indexOf(COL_ID), iAt = cab.indexOf(COL_ATUALIZADO), iCr = cab.indexOf(COL_CRIADO);
    if (iAt < 0) return;
    // Ignora quando só as colunas técnicas foram editadas.
    var c1 = faixa.getColumn() - 1, c2 = c1 + faixa.getNumColumns() - 1;
    var soTecnicas = true;
    for (var c = c1; c <= c2; c++) if (c !== iAt && c !== iId && c !== iCr) soTecnicas = false;
    if (soTecnicas) return;
    var agora = agoraISO_();
    var inicio = Math.max(2, faixa.getRow());
    var fim = faixa.getRow() + faixa.getNumRows() - 1;
    for (var r = inicio; r <= fim; r++) {
      var linha = aba.getRange(r, 1, 1, ultimaCol).getDisplayValues()[0];
      if (linhaVazia_(linha)) continue;
      aba.getRange(r, iAt + 1, 1, 1).setNumberFormat('@').setValues([[agora]]);
      if (iId >= 0 && !linha[iId]) aba.getRange(r, iId + 1, 1, 1).setNumberFormat('@').setValues([[Utilities.getUuid()]]);
      if (iCr >= 0 && !linha[iCr]) aba.getRange(r, iCr + 1, 1, 1).setNumberFormat('@').setValues([[agora]]);
    }
  } catch (err) {
    // Gatilho simples não deve interromper a edição do usuário.
  }
}

// ---------------------------------------------------------------------------
// Aba "Entradas" (respostas do Google Forms)
// ---------------------------------------------------------------------------

function lerEntradas_() {
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_ENTRADAS);
  if (!aba) return { existe: false, cabecalho: [], linhas: [] };
  var ultimaLinha = aba.getLastRow();
  var ultimaCol = aba.getLastColumn();
  if (ultimaLinha < 1 || ultimaCol < 1) return { existe: true, cabecalho: [], linhas: [] };
  var valores = aba.getRange(1, 1, ultimaLinha, ultimaCol).getDisplayValues();
  var cab = valores[0];
  var iImp = cab.indexOf(COL_IMPORTADO);
  if (iImp < 0) {
    iImp = ultimaCol;
    aba.getRange(1, iImp + 1, 1, 1).setValues([[COL_IMPORTADO]]);
    cab.push(COL_IMPORTADO);
  }
  var linhas = [];
  for (var r = 1; r < valores.length; r++) {
    var linha = valores[r];
    if (linhaVazia_(linha) || (linha[iImp] && String(linha[iImp]).trim() !== '')) continue;
    var obj = {};
    for (var c = 0; c < cab.length; c++) if (cab[c] && c !== iImp) obj[cab[c]] = linha[c] === undefined ? '' : linha[c];
    linhas.push({ linha: r + 1, conferencia: linha[0], valores: obj });
  }
  return { existe: true, cabecalho: cab, linhas: linhas };
}

/** Marca as linhas como importadas. `conferencia` (1ª coluna) evita marcar a linha errada se a aba mudou. */
function marcarImportadas_(itens) {
  var aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_ENTRADAS);
  if (!aba) return { marcadas: 0 };
  var ultimaCol = aba.getLastColumn();
  var cab = aba.getRange(1, 1, 1, ultimaCol).getDisplayValues()[0];
  var iImp = cab.indexOf(COL_IMPORTADO);
  if (iImp < 0) return { marcadas: 0 };
  var marcadas = 0;
  var quando = formatarDataHora_(new Date());
  for (var i = 0; i < itens.length; i++) {
    var it = itens[i];
    if (!it.linha || it.linha < 2 || it.linha > aba.getLastRow()) continue;
    var primeira = aba.getRange(it.linha, 1, 1, 1).getDisplayValues()[0][0];
    if (String(primeira) !== String(it.conferencia)) continue;
    aba.getRange(it.linha, iImp + 1, 1, 1).setValues([['Sim — ' + quando + (it.lead_id ? ' — ' + it.lead_id : '')]]);
    marcadas++;
  }
  return { marcadas: marcadas };
}

function formatarDataHora_(d) {
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

// ---------------------------------------------------------------------------
// Instalação (rodar pelo editor)
// ---------------------------------------------------------------------------

function instalar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  abaLeads_();
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TOKEN')) props.setProperty('TOKEN', novoToken_());
  mostrarToken();
  return ss.getName();
}

function novoToken_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

function gerarNovoToken() {
  PropertiesService.getScriptProperties().setProperty('TOKEN', novoToken_());
  mostrarToken();
}

function mostrarToken() {
  var token = PropertiesService.getScriptProperties().getProperty('TOKEN');
  var msg = 'Token secreto do CRM Assessor (cole em Configurações → Sincronização no app):\n\n' + token;
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* sem interface ao rodar pelo editor: veja o Registro de execução */ }
}

/** Cria o formulário de captura com aceite LGPD e liga as respostas à aba "Entradas". */
function criarFormulario() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var form = FormApp.create('Quero falar com um assessor de investimentos');
  form.setDescription('Preencha seus dados e entraremos em contato.');
  form.addTextItem().setTitle('Nome completo').setRequired(true);
  form.addTextItem().setTitle('WhatsApp (com DDD)').setRequired(true);
  var email = form.addTextItem().setTitle('E-mail');
  email.setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
  form.addTextItem().setTitle('Cidade');
  form.addTextItem().setTitle('Estado (UF)');
  form.addTextItem().setTitle('Profissão');
  form.addMultipleChoiceItem().setTitle('Como nos conheceu?')
    .setChoiceValues(['Instagram', 'YouTube', 'LinkedIn', 'Indicação', 'Eventos', 'Site', 'Outro']);
  form.addParagraphTextItem().setTitle('Mensagem (opcional)');
  form.addCheckboxItem().setTitle('Aceite LGPD')
    .setChoiceValues(['Li e concordo com o tratamento dos meus dados pessoais para fins de contato comercial, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).'])
    .setRequired(true);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();

  // A aba de respostas é criada pelo Google com outro nome: renomeia para "Entradas".
  var abas = ss.getSheets();
  for (var i = 0; i < abas.length; i++) {
    var url = abas[i].getFormUrl && abas[i].getFormUrl();
    if (url && url.indexOf(form.getId()) >= 0) {
      if (!ss.getSheetByName(ABA_ENTRADAS)) abas[i].setName(ABA_ENTRADAS);
      break;
    }
  }
  var msg = 'Formulário criado!\n\nLink para divulgar:\n' + form.getPublishedUrl() + '\n\nEditar o formulário:\n' + form.getEditUrl();
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* ver Registro de execução */ }
}
