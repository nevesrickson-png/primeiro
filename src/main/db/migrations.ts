import type Database from 'better-sqlite3-multiple-ciphers'

/**
 * Migrations em ordem. A versão aplicada fica em PRAGMA user_version.
 * NUNCA edite uma migration já distribuída: crie uma nova no final da lista.
 */
const colunasPadrao = `
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT`

export const migrations: { versao: number; descricao: string; sql: string }[] = [
  {
    versao: 1,
    descricao: 'Esquema inicial',
    sql: `
      CREATE TABLE usuarios (${colunasPadrao},
        nome TEXT NOT NULL,
        email TEXT,
        papel TEXT NOT NULL DEFAULT 'titular'   -- titular | assistente (futuro)
      );

      CREATE TABLE configuracoes (
        chave TEXT PRIMARY KEY NOT NULL,
        valor TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE leads (${colunasPadrao},
        nome TEXT NOT NULL,
        telefone TEXT,
        whatsapp TEXT,
        email TEXT,
        cidade TEXT,
        estado TEXT,
        profissao TEXT,
        empresa TEXT,
        cargo TEXT,
        data_nascimento TEXT,
        estado_civil TEXT,
        conjuge TEXT,
        filhos TEXT,
        instagram TEXT,
        linkedin TEXT,
        outras_redes TEXT,
        faixa_patrimonio TEXT,
        faixa_renda TEXT,
        suitability TEXT NOT NULL DEFAULT 'nao_avaliado',
        data_suitability TEXT,
        objetivos TEXT NOT NULL DEFAULT '[]',
        horizonte TEXT,
        sucessao_notas TEXT,
        produtos_interesse TEXT NOT NULL DEFAULT '[]',
        hobbies_rapport TEXT,
        origem TEXT,
        origem_detalhe TEXT,
        indicado_por TEXT REFERENCES leads(id) ON DELETE SET NULL,
        etapa TEXT NOT NULL DEFAULT 'novo',
        motivo_perda TEXT,
        valor_potencial REAL,
        consentimento_lgpd INTEGER NOT NULL DEFAULT 0,
        data_consentimento TEXT,
        base_legal TEXT,
        observacoes TEXT,
        responsavel_id TEXT REFERENCES usuarios(id),
        created_by TEXT REFERENCES usuarios(id)
      );
      CREATE INDEX idx_leads_deleted ON leads(deleted_at);
      CREATE INDEX idx_leads_etapa ON leads(etapa) WHERE deleted_at IS NULL;
      CREATE INDEX idx_leads_origem ON leads(origem) WHERE deleted_at IS NULL;
      CREATE INDEX idx_leads_patrimonio ON leads(faixa_patrimonio) WHERE deleted_at IS NULL;
      CREATE INDEX idx_leads_suitability ON leads(suitability) WHERE deleted_at IS NULL;
      CREATE INDEX idx_leads_updated ON leads(updated_at);
      CREATE INDEX idx_leads_created ON leads(created_at);
      CREATE INDEX idx_leads_nome ON leads(nome COLLATE NOCASE);
      CREATE INDEX idx_leads_indicado ON leads(indicado_por);
      CREATE INDEX idx_leads_nascimento ON leads(substr(data_nascimento, 6, 5));
      CREATE INDEX idx_leads_responsavel ON leads(responsavel_id);

      -- Busca textual. Guarda cópia própria dos campos (5.000 leads = poucos KB) e
      -- é mantida pelos triggers abaixo.
      CREATE VIRTUAL TABLE leads_fts USING fts5(
        lead_id UNINDEXED, nome, email, telefone, empresa, observacoes,
        tokenize = 'unicode61 remove_diacritics 2'
      );
      CREATE TRIGGER leads_fts_ai AFTER INSERT ON leads BEGIN
        INSERT INTO leads_fts(lead_id, nome, email, telefone, empresa, observacoes)
        VALUES (new.id, new.nome, new.email,
                trim(coalesce(new.telefone, '') || ' ' || coalesce(new.whatsapp, '')),
                new.empresa, new.observacoes);
      END;
      CREATE TRIGGER leads_fts_au AFTER UPDATE OF nome, email, telefone, whatsapp, empresa, observacoes ON leads BEGIN
        DELETE FROM leads_fts WHERE lead_id = old.id;
        INSERT INTO leads_fts(lead_id, nome, email, telefone, empresa, observacoes)
        VALUES (new.id, new.nome, new.email,
                trim(coalesce(new.telefone, '') || ' ' || coalesce(new.whatsapp, '')),
                new.empresa, new.observacoes);
      END;
      CREATE TRIGGER leads_fts_ad AFTER DELETE ON leads BEGIN
        DELETE FROM leads_fts WHERE lead_id = old.id;
      END;

      CREATE TABLE tags (${colunasPadrao},
        nome TEXT NOT NULL,
        cor TEXT NOT NULL DEFAULT '#64748b'
      );
      CREATE UNIQUE INDEX idx_tags_nome ON tags(nome COLLATE NOCASE) WHERE deleted_at IS NULL;

      CREATE TABLE lead_tags (${colunasPadrao},
        lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE
      );
      CREATE UNIQUE INDEX idx_lead_tags_par ON lead_tags(lead_id, tag_id);
      CREATE INDEX idx_lead_tags_tag ON lead_tags(tag_id);

      CREATE TABLE interacoes (${colunasPadrao},
        lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,               -- ligacao | whatsapp | email | reuniao | evento | outro
        data TEXT NOT NULL,
        resumo TEXT,
        proximo_passo TEXT,
        usuario_id TEXT REFERENCES usuarios(id)
      );
      CREATE INDEX idx_interacoes_lead ON interacoes(lead_id, data);

      CREATE TABLE tarefas (${colunasPadrao},
        lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
        titulo TEXT NOT NULL,
        data_vencimento TEXT,
        concluida INTEGER NOT NULL DEFAULT 0,
        concluida_em TEXT,
        tipo TEXT NOT NULL DEFAULT 'follow_up',  -- follow_up | revisao | outro
        responsavel_id TEXT REFERENCES usuarios(id)
      );
      CREATE INDEX idx_tarefas_lead ON tarefas(lead_id);
      CREATE INDEX idx_tarefas_venc ON tarefas(concluida, data_vencimento);

      CREATE TABLE aplicacoes (${colunasPadrao},
        lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        produto TEXT NOT NULL,
        valor REAL,
        data_vencimento TEXT
      );
      CREATE INDEX idx_aplicacoes_lead ON aplicacoes(lead_id);
      CREATE INDEX idx_aplicacoes_venc ON aplicacoes(data_vencimento);

      CREATE TABLE revisoes_carteira (${colunasPadrao},
        lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        notas TEXT,
        proxima_revisao TEXT
      );
      CREATE INDEX idx_revisoes_lead ON revisoes_carteira(lead_id);
      CREATE INDEX idx_revisoes_proxima ON revisoes_carteira(proxima_revisao);

      CREATE TABLE nps (${colunasPadrao},
        lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        nota INTEGER NOT NULL CHECK (nota BETWEEN 0 AND 10),
        comentario TEXT
      );
      CREATE INDEX idx_nps_lead ON nps(lead_id);

      CREATE TABLE historico_etapas (${colunasPadrao},
        lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        etapa_de TEXT,
        etapa_para TEXT NOT NULL,
        data TEXT NOT NULL,
        usuario_id TEXT REFERENCES usuarios(id)
      );
      CREATE INDEX idx_hist_lead ON historico_etapas(lead_id, data);
      CREATE INDEX idx_hist_para ON historico_etapas(etapa_para, data);

      CREATE TABLE sync_log (${colunasPadrao},
        iniciado_em TEXT NOT NULL,
        finalizado_em TEXT,
        status TEXT NOT NULL,             -- sucesso | erro | parcial
        enviados INTEGER NOT NULL DEFAULT 0,
        recebidos INTEGER NOT NULL DEFAULT 0,
        importados_forms INTEGER NOT NULL DEFAULT 0,
        conflitos INTEGER NOT NULL DEFAULT 0,
        mensagem TEXT
      );

      CREATE TABLE sync_conflitos (${colunasPadrao},
        sync_log_id TEXT REFERENCES sync_log(id) ON DELETE SET NULL,
        lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
        campo TEXT,
        valor_local TEXT,
        valor_planilha TEXT,
        updated_at_local TEXT,
        updated_at_planilha TEXT,
        vencedor TEXT NOT NULL,           -- local | planilha
        resolvido INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_conflitos_resolvido ON sync_conflitos(resolvido);
    `
  },
  {
    versao: 2,
    descricao: 'Base da sincronização por lead',
    sql: `
      -- Últimos updated_at (local e da planilha) vistos na última sincronização de cada lead.
      -- Serve para saber quem mudou desde então e detectar edição dos dois lados.
      CREATE TABLE sync_leads (${colunasPadrao},
        lead_id TEXT NOT NULL UNIQUE,
        local_updated_at TEXT,
        planilha_updated_at TEXT
      );
      CREATE INDEX idx_conflitos_lead ON sync_conflitos(lead_id);
      CREATE INDEX idx_sync_log_inicio ON sync_log(iniciado_em);
    `
  }
]

export function aplicarMigrations(db: Database.Database): void {
  const atual = db.pragma('user_version', { simple: true }) as number
  for (const m of migrations) {
    if (m.versao <= atual) continue
    db.transaction(() => {
      db.exec(m.sql)
      db.pragma(`user_version = ${m.versao}`)
    })()
  }
}
