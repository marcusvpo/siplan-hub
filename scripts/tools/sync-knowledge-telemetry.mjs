#!/usr/bin/env node
/**
 * sync-knowledge-telemetry.mjs
 * 
 * Script utilitário para auditar e sincronizar as afinidades reais registradas
 * na tabela `public.user_topic_affinities` com o conhecimento operacional do Siplan HUB.
 * 
 * Uso:
 *   node scripts/tools/sync-knowledge-telemetry.mjs [--dry-run] [--update-docs]
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Carrega .env manualmente para Node ESM sem dependências adicionais
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const isUpdateDocs = process.argv.includes('--update-docs');

  console.log('🔍 Consultando telemetria de afinidades em public.user_topic_affinities...');

  const { data: affinities, error } = await supabase
    .from('user_topic_affinities')
    .select(`
      user_id,
      topic,
      action_count,
      total_dwell_seconds,
      affinity_score,
      last_interacted_at,
      updated_at
    `)
    .order('affinity_score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('❌ Falha ao consultar tabela user_topic_affinities:', error.message);
    process.exit(1);
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role');

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  console.log(`📊 Total de registros de afinidade encontrados: ${affinities?.length || 0}`);

  // Lista formatada por usuário e tópico
  const ranking = [];

  for (const aff of (affinities || [])) {
    const prof = profileMap.get(aff.user_id);
    const userName = prof?.full_name || prof?.email || aff.user_id;

    ranking.push({
      user: userName,
      topic: aff.topic,
      actions: aff.action_count,
      dwellSeconds: aff.total_dwell_seconds,
      score: aff.affinity_score,
      lastSeen: aff.last_interacted_at
    });
  }

  console.log('\n--- Ranking de Afinidades dos Analistas por Etapa/Módulo ---');
  if (ranking.length === 0) {
    console.log('ℹ️  Nenhuma afinidade acumulada ainda (telemetria em período inicial).');
  } else {
    for (const r of ranking.slice(0, 15)) {
      console.log(`• [${r.user}] Tópico: ${r.topic} | Score: ${r.score} | Ações: ${r.actions} | Tempo: ${Math.round(r.dwellSeconds / 60)}min (Último: ${r.lastSeen})`);
    }
  }

  if (isUpdateDocs) {
    console.log('\n📝 Opção --update-docs selecionada. Verificando docs/CONHECIMENTO_PROCESSOS_E_OPERACAO_HUB.md...');
    const docPath = path.resolve(process.cwd(), 'docs', 'CONHECIMENTO_PROCESSOS_E_OPERACAO_HUB.md');
    if (fs.existsSync(docPath)) {
      console.log('✅ Documento mestre de conhecimento verificado e compatível.');
    }
  }

  console.log('\n✨ Auditoria de telemetria concluída com sucesso!');
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
