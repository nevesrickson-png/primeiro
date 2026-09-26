import { randomUUID } from 'crypto'
import { getDb, usuarioAtualId } from './connection'
import { criarTag } from './tags'
import { ETAPAS, OBJETIVOS, PRODUTOS } from '@shared/constants'

// Gerador de leads fictícios realistas — usado APENAS em modo de desenvolvimento.

const NOMES_M = ['João', 'Pedro', 'Lucas', 'Gabriel', 'Rafael', 'Felipe', 'Bruno', 'Eduardo', 'Rodrigo', 'Marcelo', 'Ricardo', 'André', 'Thiago', 'Gustavo', 'Carlos', 'Fernando', 'Daniel', 'Leonardo', 'Vinícius', 'Henrique', 'Otávio', 'Sérgio', 'Márcio', 'Paulo', 'Roberto']
const NOMES_F = ['Maria', 'Ana', 'Juliana', 'Fernanda', 'Camila', 'Patrícia', 'Aline', 'Beatriz', 'Larissa', 'Mariana', 'Renata', 'Carolina', 'Letícia', 'Vanessa', 'Cristina', 'Luciana', 'Gabriela', 'Isabela', 'Priscila', 'Tatiane', 'Débora', 'Helena', 'Sílvia', 'Mônica', 'Cláudia']
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa', 'Rocha', 'Dias', 'Nascimento', 'Andrade', 'Moreira', 'Nunes', 'Marques', 'Machado', 'Mendes', 'Freitas', 'Cardoso', 'Teixeira', 'Azevedo', 'Guimarães', 'Brandão']
const CIDADES: [string, string, string][] = [
  ['São Paulo', 'SP', '11'], ['Campinas', 'SP', '19'], ['Ribeirão Preto', 'SP', '16'], ['Santos', 'SP', '13'],
  ['Rio de Janeiro', 'RJ', '21'], ['Niterói', 'RJ', '21'], ['Belo Horizonte', 'MG', '31'], ['Uberlândia', 'MG', '34'],
  ['Curitiba', 'PR', '41'], ['Londrina', 'PR', '43'], ['Porto Alegre', 'RS', '51'], ['Florianópolis', 'SC', '48'],
  ['Joinville', 'SC', '47'], ['Brasília', 'DF', '61'], ['Goiânia', 'GO', '62'], ['Salvador', 'BA', '71'],
  ['Recife', 'PE', '81'], ['Fortaleza', 'CE', '85'], ['Vitória', 'ES', '27'], ['Campo Grande', 'MS', '67']
]
const PROFISSOES: [string, string[], string[]][] = [
  ['Médico(a)', ['Hospital Albert Einstein', 'Hospital Sírio-Libanês', 'Clínica própria', 'Rede D\'Or', 'Unimed'], ['Cardiologista', 'Ortopedista', 'Dermatologista', 'Anestesista', 'Pediatra']],
  ['Advogado(a)', ['Escritório próprio', 'Pinheiro Neto Advogados', 'Mattos Filho', 'Machado Meyer'], ['Sócio(a)', 'Associado(a) sênior', 'Consultor(a) jurídico(a)']],
  ['Engenheiro(a)', ['Petrobras', 'Embraer', 'Vale', 'WEG', 'Construtora Tenda'], ['Engenheiro(a) de projetos', 'Gerente de engenharia', 'Coordenador(a)']],
  ['Empresário(a)', ['Rede de farmácias', 'Distribuidora de alimentos', 'Agência de marketing', 'Loja de materiais de construção', 'Transportadora'], ['Sócio(a)-fundador(a)', 'CEO', 'Diretor(a)']],
  ['Dentista', ['Consultório próprio', 'OdontoPrev', 'Clínica Sorridents'], ['Ortodontista', 'Implantodontista', 'Cirurgião(ã)-dentista']],
  ['Servidor(a) público(a)', ['Receita Federal', 'Banco Central', 'Tribunal de Justiça', 'Ministério Público'], ['Auditor(a) fiscal', 'Analista', 'Juiz(a)', 'Promotor(a)']],
  ['Executivo(a)', ['Itaú Unibanco', 'Ambev', 'Natura', 'Magazine Luiza', 'Mercado Livre', 'iFood'], ['Diretor(a) comercial', 'Gerente de TI', 'Head de produto', 'CFO']],
  ['Produtor(a) rural', ['Fazenda própria', 'Cooperativa Coamo', 'Agropecuária familiar'], ['Proprietário(a)', 'Gestor(a)']],
  ['Arquiteto(a)', ['Escritório próprio', 'Studio de arquitetura'], ['Arquiteto(a) titular', 'Sócio(a)']],
  ['Desenvolvedor(a) de software', ['Nubank', 'Stone', 'Totvs', 'CI&T', 'Startup'], ['Engenheiro(a) de software sênior', 'Tech lead', 'Staff engineer']],
  ['Aposentado(a)', ['—'], ['—']],
  ['Contador(a)', ['Escritório contábil próprio', 'Deloitte', 'KPMG'], ['Sócio(a)', 'Gerente de auditoria']]
]
const HOBBIES = ['Corrida de rua, já fez 3 maratonas', 'Torce para o Corinthians, vai a todos os jogos', 'Gosta de vinhos, coleciona rótulos portugueses', 'Pratica beach tennis aos fins de semana', 'Viaja todo ano para a Europa com a família', 'Pescaria no Pantanal', 'Ciclismo de estrada', 'Toca violão, fã de MPB', 'Churrasco com os amigos todo domingo', 'Golfe; sócio de clube', 'Leitura: biografias e história', 'Tem dois cachorros golden retriever', 'Yoga e meditação', 'Gosta de carros antigos', 'Cozinha muito bem; fã de gastronomia japonesa', 'Mergulho', 'Torce para o Flamengo', 'Fotografia de natureza']
const MOTIVOS_PERDA = ['Preferiu ficar com o gerente do banco', 'Sem patrimônio disponível no momento', 'Achou as taxas altas', 'Parou de responder', 'Fechou com outro assessor']
const OBS = ['Prefere contato por WhatsApp no fim da tarde.', 'Veio de uma live sobre previdência.', 'Tem recursos parados na poupança.', 'Quer diversificar para o exterior.', 'Recebeu herança recentemente.', 'Vai vender um imóvel no próximo semestre.', 'Insatisfeito com a rentabilidade atual.', 'Pediu material sobre FIIs.', 'Interessado em planejamento sucessório.', 'Empresa em crescimento; avaliar PGBL.', '']

/** Interações típicas ao chegar em cada etapa: [tipo, resumo, próximo passo]. */
const INTERACOES_POR_ETAPA: Record<string, [string, string, string | null][]> = {
  novo: [
    ['whatsapp', 'Lead chegou pelo formulário; mandei mensagem de boas-vindas.', 'Ligar para qualificar'],
    ['outro', 'Comentou num post pedindo mais informações sobre investimentos.', 'Chamar no direct']
  ],
  primeiro_contato: [
    ['ligacao', 'Primeira ligação: se apresentou, contou que investe só na poupança e no banco.', 'Agendar reunião de diagnóstico'],
    ['whatsapp', 'Conversa inicial pelo WhatsApp; demonstrou interesse em diversificar.', 'Enviar convite de reunião'],
    ['ligacao', 'Tentativa de contato, caiu na caixa postal. Deixei recado.', 'Tentar de novo amanhã à tarde']
  ],
  reuniao_agendada: [
    ['whatsapp', 'Reunião confirmada por videochamada.', 'Preparar pauta e questionário de perfil'],
    ['email', 'Enviei convite da reunião com link do Meet e questionário prévio.', 'Confirmar presença na véspera']
  ],
  diagnostico: [
    ['reuniao', 'Reunião de diagnóstico: mapeamos patrimônio, objetivos e horizonte. Carteira concentrada em renda fixa bancária.', 'Montar proposta de alocação'],
    ['reuniao', 'Diagnóstico com o casal; principal objetivo é aposentadoria e educação dos filhos.', 'Aplicar suitability e montar proposta']
  ],
  proposta: [
    ['reuniao', 'Apresentei a proposta de alocação. Gostou, mas quer comparar custos com o banco.', 'Enviar comparativo de taxas'],
    ['email', 'Enviei a proposta em PDF com a alocação sugerida e cenários.', 'Ligar em 3 dias para tirar dúvidas']
  ],
  conta_aberta: [
    ['whatsapp', 'Conta aberta! Ajudei com o envio dos documentos.', 'Acompanhar a transferência dos recursos'],
    ['ligacao', 'Cadastro aprovado. Combinamos a portabilidade dos investimentos do banco.', 'Solicitar portabilidade']
  ],
  cliente_ativo: [
    ['reuniao', 'Primeira alocação feita conforme a proposta. Cliente satisfeito.', 'Agendar revisão trimestral'],
    ['whatsapp', 'Recursos transferidos e aplicados. Mandei o resumo da carteira.', 'Revisão em 90 dias']
  ],
  perdido: [
    ['ligacao', 'Informou que decidiu não seguir no momento.', null],
    ['whatsapp', 'Sem resposta após várias tentativas; encerrando o contato por enquanto.', 'Retomar daqui a 6 meses']
  ]
}

const TAGS_SEED: [string, string][] = [['VIP', '#eab308'], ['Médicos', '#ef4444'], ['Quente', '#f97316'], ['Evento XP', '#6366f1'], ['Retomar em 2027', '#64748b'], ['Empresário', '#22c55e']]

let semente = 42
function rnd(): number {
  // PRNG determinístico simples (mulberry32) para resultados reprodutíveis.
  semente |= 0
  semente = (semente + 0x6d2b79f5) | 0
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]
const chance = (p: number): boolean => rnd() < p
const int = (a: number, b: number): number => a + Math.floor(rnd() * (b - a + 1))
function algunsDe<T>(a: readonly T[], min: number, max: number): T[] {
  const n = int(min, max)
  return [...a].sort(() => rnd() - 0.5).slice(0, n)
}
function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
const dataISO = (d: Date): string => d.toISOString().slice(0, 10)

/** Pesos das etapas finais para um funil realista. */
const DIST_ETAPAS: [string, number][] = [
  ['novo', 10], ['primeiro_contato', 9], ['reuniao_agendada', 6], ['diagnostico', 5],
  ['proposta', 5], ['conta_aberta', 3], ['cliente_ativo', 7], ['perdido', 5]
]
function etapaAleatoria(): string {
  const total = DIST_ETAPAS.reduce((s, [, p]) => s + p, 0)
  let r = rnd() * total
  for (const [e, p] of DIST_ETAPAS) {
    if ((r -= p) < 0) return e
  }
  return 'novo'
}

const FAIXAS: [string, string, number, number][] = [
  // patrimônio, renda compatível, valor potencial min/max
  ['ate_100k', 'ate_5k', 20_000, 90_000],
  ['100k_300k', '5k_15k', 100_000, 280_000],
  ['300k_1m', '15k_30k', 300_000, 900_000],
  ['1m_3m', '30k_60k', 1_000_000, 2_800_000],
  ['3m_10m', '60k_150k', 3_000_000, 9_000_000],
  ['acima_10m', 'acima_150k', 10_000_000, 25_000_000]
]

export function gerarLeadsFicticios(qtd = 50): number {
  const db = getDb()
  semente = Date.now() % 100000
  const tags = TAGS_SEED.map(([n, c]) => criarTag(n, c))
  const usuario = usuarioAtualId()
  const idsCriados: string[] = []
  const agora = Date.now()
  const ordemEtapas: string[] = ETAPAS.map((e) => e.value as string).filter((e) => e !== 'perdido')

  const insLead = db.prepare(`INSERT INTO leads (
      id, created_at, updated_at, nome, telefone, whatsapp, email, cidade, estado, profissao, empresa, cargo,
      data_nascimento, estado_civil, conjuge, filhos, instagram, linkedin, outras_redes, faixa_patrimonio,
      faixa_renda, suitability, data_suitability, objetivos, horizonte, sucessao_notas, produtos_interesse,
      hobbies_rapport, origem, origem_detalhe, indicado_por, etapa, motivo_perda, valor_potencial,
      consentimento_lgpd, data_consentimento, base_legal, observacoes, responsavel_id, created_by
    ) VALUES (${Array(40).fill('?').join(', ')})`)
  const insHist = db.prepare(`INSERT INTO historico_etapas (id, created_at, updated_at, lead_id, etapa_de, etapa_para, data, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
  const insInt = db.prepare(`INSERT INTO interacoes (id, created_at, updated_at, lead_id, tipo, data, resumo, proximo_passo, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const insTarefa = db.prepare(`INSERT INTO tarefas (id, created_at, updated_at, lead_id, titulo, data_vencimento, concluida, concluida_em, tipo, responsavel_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const insTag = db.prepare('INSERT OR IGNORE INTO lead_tags (id, created_at, updated_at, lead_id, tag_id) VALUES (?, ?, ?, ?, ?)')

  db.transaction(() => {
    for (let i = 0; i < qtd; i++) {
      const id = randomUUID()
      const feminino = chance(0.5)
      const primeiro = pick(feminino ? NOMES_F : NOMES_M)
      const sob1 = pick(SOBRENOMES)
      const sob2 = pick(SOBRENOMES.filter((s) => s !== sob1))
      const nome = `${primeiro} ${sob1} ${sob2}`
      const [cidade, uf, ddd] = pick(CIDADES)
      const celular = `${ddd}9${int(6000, 9999)}${int(1000, 9999)}`
      const [profissao, empresas, cargos] = pick(PROFISSOES)
      const idade = profissao === 'Aposentado(a)' ? int(60, 78) : int(26, 62)
      const nasc = new Date(new Date().getFullYear() - idade, int(0, 11), int(1, 28))
      const faixaIdx = Math.min(5, Math.max(0, Math.round(rnd() * 3 + (idade > 45 ? 1.2 : 0) + (chance(0.1) ? 1.5 : 0))))
      const [fp, fr, vmin, vmax] = FAIXAS[faixaIdx]
      const etapa = etapaAleatoria()
      const origem = pick(['instagram', 'instagram', 'youtube', 'linkedin', 'indicacao', 'indicacao', 'indicacao', 'eventos', 'site', 'google_forms', 'outro'])
      const casado = chance(0.6)
      // Leads nas primeiras etapas tendem a ser recentes; os demais se espalham pelo último ano.
      const diasAtras = etapa === 'novo' ? int(1, 25) : etapa === 'primeiro_contato' ? int(3, 60) : int(20, 330)
      const createdMs = agora - diasAtras * 86_400_000 - int(0, 86_000_000)
      const avaliado = ['diagnostico', 'proposta', 'conta_aberta', 'cliente_ativo'].includes(etapa) || chance(0.15)
      const lgpd = chance(0.85)
      const indicador = origem === 'indicacao' && idsCriados.length > 3 && chance(0.7) ? pick(idsCriados) : null
      const usuarioIg = semAcento(`${primeiro}.${sob1}`).replace(/\s/g, '')
      const createdISO = new Date(createdMs).toISOString()

      // Histórico de etapas coerente: percorre o funil até a etapa atual.
      const caminho: string[] = []
      if (etapa === 'perdido') {
        const ate = int(0, 4)
        caminho.push(...ordemEtapas.slice(0, ate + 1), 'perdido')
      } else {
        caminho.push(...ordemEtapas.slice(0, ordemEtapas.indexOf(etapa) + 1))
      }
      const passos: { de: string | null; para: string; data: string }[] = []
      let t = createdMs
      const intervalo = (agora - createdMs) / (caminho.length + 1)
      caminho.forEach((e, idx) => {
        if (idx > 0) t += intervalo * (0.4 + rnd())
        passos.push({ de: idx === 0 ? null : caminho[idx - 1], para: e, data: new Date(Math.min(t, agora - 3_600_000)).toISOString() })
      })
      // Alguns leads "parados": última alteração bem antiga.
      const ultimo = passos[passos.length - 1].data
      const updated = chance(0.25) ? ultimo : new Date(Math.min(agora, Date.parse(ultimo) + int(0, 20) * 86_400_000)).toISOString()

      insLead.run(
        id, createdISO, updated, nome, celular, chance(0.9) ? celular : null,
        `${semAcento(primeiro)}.${semAcento(sob1)}${chance(0.3) ? int(1, 99) : ''}@${pick(['gmail.com', 'gmail.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'yahoo.com.br'])}`,
        cidade, uf, profissao, pick(empresas) === '—' ? null : pick(empresas), pick(cargos) === '—' ? null : pick(cargos),
        dataISO(nasc), casado ? pick(['casado', 'uniao_estavel']) : pick(['solteiro', 'divorciado', 'viuvo']),
        casado ? `${pick(feminino ? NOMES_M : NOMES_F)} ${sob1}` : null,
        chance(0.55) ? `${int(1, 3)} filho(s): ${algunsDe([...NOMES_M, ...NOMES_F], 1, 2).join(' e ')}` : null,
        chance(0.7) ? `@${usuarioIg}` : null,
        chance(0.5) ? `linkedin.com/in/${usuarioIg.replace('.', '-')}` : null,
        null,
        chance(0.9) ? fp : null, chance(0.8) ? fr : null,
        avaliado ? pick(['conservador', 'moderado', 'moderado', 'arrojado']) : 'nao_avaliado',
        avaliado ? dataISO(new Date(createdMs + int(5, 60) * 86_400_000)) : null,
        JSON.stringify(algunsDe(OBJETIVOS.map((o) => o.value), 1, 3)),
        pick(['curto', 'medio', 'longo', 'longo']),
        faixaIdx >= 3 && chance(0.6) ? 'Tem holding familiar em estudo; avaliar previdência VGBL para sucessão.' : null,
        JSON.stringify(algunsDe(PRODUTOS.map((p) => p.value), 1, 4)),
        chance(0.8) ? pick(HOBBIES) : null,
        origem,
        origem === 'eventos' ? pick(['Expert XP 2026', 'Palestra no CRM-SP', 'Café com investidores']) : origem === 'youtube' ? 'Vídeo sobre renda passiva' : null,
        indicador, etapa, etapa === 'perdido' ? pick(MOTIVOS_PERDA) : null,
        Math.round((vmin + rnd() * (vmax - vmin)) / 1000) * 1000,
        lgpd ? 1 : 0, lgpd ? dataISO(new Date(createdMs)) : null, lgpd ? pick(['consentimento', 'consentimento', 'legitimo_interesse']) : null,
        pick(OBS) || null, usuario, usuario
      )
      for (const p of passos) {
        insHist.run(randomUUID(), p.data, p.data, id, p.de, p.para, p.data, usuario)
        // Uma interação por etapa percorrida (às vezes duas), pouco depois da mudança.
        const qtdInt = chance(0.8) ? 1 : chance(0.5) ? 2 : 0
        for (let k = 0; k < qtdInt; k++) {
          const [tipo, resumo, proximo] = pick(INTERACOES_POR_ETAPA[p.para])
          const d = new Date(Math.min(Date.parse(p.data) + int(1, 72) * 3_600_000 * (k + 1), agora - 60_000))
          d.setHours(int(8, 19), pick([0, 15, 30, 45]), 0, 0)
          const dIso = new Date(Math.min(d.getTime(), agora - 60_000)).toISOString()
          insInt.run(randomUUID(), dIso, dIso, id, tipo, dIso, resumo, proximo, usuario)
        }
      }
      // Tarefas de follow-up (algumas atrasadas, algumas concluídas) para leads em negociação.
      if (!['perdido', 'cliente_ativo'].includes(etapa) && chance(0.5)) {
        const venc = new Date(agora + int(-12, 15) * 86_400_000)
        const concluida = venc.getTime() < agora && chance(0.4)
        const titulo = pick(['Ligar para retomar conversa', 'Enviar proposta revisada', 'Confirmar reunião', 'Mandar material sobre previdência', 'Follow-up pós-reunião'])
        insTarefa.run(randomUUID(), createdISO, createdISO, id, titulo, dataISO(venc), concluida ? 1 : 0, concluida ? new Date(agora).toISOString() : null, 'follow_up', usuario)
      }
      if (etapa === 'cliente_ativo' && chance(0.5)) {
        insTarefa.run(randomUUID(), createdISO, createdISO, id, 'Revisão trimestral da carteira', dataISO(new Date(agora + int(-5, 60) * 86_400_000)), 0, null, 'revisao', usuario)
      }
      for (const tag of algunsDe(tags, 0, 2)) insTag.run(randomUUID(), createdISO, createdISO, id, tag.id)
      idsCriados.push(id)
    }
  })()
  return qtd
}
