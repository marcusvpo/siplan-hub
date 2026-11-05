#!/usr/bin/env node

/**
 * n8n-manager.mjs - CLI Utilitário de Gestão de Automações do Siplan HUB
 * 
 * Permite listar, inspecionar, testar e sincronizar workflows e nós do n8n
 * diretamente via linha de comando ou automações.
 */

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://n8n.siplan.com.br:5678';
const N8N_API_URL = process.env.N8N_API_URL || `${N8N_BASE_URL}/api/v1`;
const N8N_API_KEY = process.env.N8N_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYTkxN2Q4OS03MWRjLTRlYmEtYTdkZi01NDkxNTM1NGIzNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UyYzE5MTUtMGQ0OC00MmFiLWIzN2QtNmUxNDJkNjIzNTNlIiwiaWF0IjoxNzkzODA0ODcyfQ.tSzuchSumuBrmIh-cbS1Q_vrY72upYsAxovpz01CNJw';

async function fetchN8n(path, options = {}) {
  const url = `${N8N_API_URL}${path.startsWith('/') ? path : '/' + path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro na API n8n (${response.status} ${response.statusText}): ${errorText}`);
  }

  return response.json();
}

async function testConnection() {
  console.log(`\n🔍 Testando conectividade com n8n Siplan HUB (${N8N_BASE_URL})...`);
  try {
    const res = await fetchN8n('/workflows?limit=100');
    const workflows = res.data || [];
    const activeCount = workflows.filter(w => w.active).length;
    console.log(`\n✅ Conexão estabelecida com sucesso!`);
    console.log(`- Base URL: ${N8N_BASE_URL}`);
    console.log(`- Total de Workflows: ${workflows.length}`);
    console.log(`- Workflows Ativos: ${activeCount}`);
    console.log(`- Workflows Inativos / Arquivados: ${workflows.length - activeCount}\n`);
    return true;
  } catch (err) {
    console.error(`\n❌ Falha de conexão: ${err.message}\n`);
    return false;
  }
}

async function listWorkflows() {
  console.log(`\n📋 Workflows cadastrados no n8n Siplan HUB:`);
  const res = await fetchN8n('/workflows?limit=100');
  const workflows = res.data || [];
  
  if (workflows.length === 0) {
    console.log('Nenhum workflow encontrado.');
    return;
  }

  console.log('-------------------------------------------------------------------------------------------------');
  console.log('| ID               | Status | Nome                                            | Nós  | Atualizado');
  console.log('-------------------------------------------------------------------------------------------------');
  for (const w of workflows) {
    const status = w.active ? '🟢 ATIVO ' : '⚪ INATIVO';
    const name = (w.name || 'Sem nome').padEnd(47).slice(0, 47);
    const nodeCount = String(w.nodes?.length || 0).padStart(4);
    const updated = (w.updatedAt || '').slice(0, 10);
    console.log(`| ${w.id.padEnd(16)} | ${status} | ${name} | ${nodeCount} | ${updated}`);
  }
  console.log('-------------------------------------------------------------------------------------------------\n');
}

async function getWorkflow(id) {
  if (!id) {
    console.error('ID do workflow é obrigatório.');
    process.exit(1);
  }
  console.log(`\n🔍 Buscando detalhes do workflow ${id}...`);
  const w = await fetchN8n(`/workflows/${id}`);
  console.log(`\nNome: ${w.name}`);
  console.log(`Status: ${w.active ? 'Ativo' : 'Inativo'}`);
  console.log(`Criado em: ${w.createdAt}`);
  console.log(`Atualizado em: ${w.updatedAt}`);
  console.log(`Quantidade de Nós: ${w.nodes?.length || 0}`);
  console.log('\nNós presentes no fluxo:');
  (w.nodes || []).forEach((n, idx) => {
    console.log(`  ${idx + 1}. [${n.type}] "${n.name}" (versão ${n.typeVersion || 1})`);
  });
  console.log('\n');
}

async function triggerWebhook(path, test = false, payload = {}) {
  if (!path) {
    console.error('Caminho do webhook é obrigatório.');
    process.exit(1);
  }
  const urlPrefix = test ? `${N8N_BASE_URL}/webhook-test` : `${N8N_BASE_URL}/webhook`;
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  const fullUrl = `${urlPrefix}${cleanPath}`;

  console.log(`\n🚀 Disparando webhook para teste: ${fullUrl}`);
  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log(`\nStatus HTTP: ${response.status} ${response.statusText}`);
  console.log(`Resposta: ${text}\n`);
}

async function main() {
  const [,, cmd, ...args] = process.argv;

  switch (cmd) {
    case 'test':
    case 'check':
      await testConnection();
      break;
    case 'list':
    case 'ls':
      await listWorkflows();
      break;
    case 'get':
      await getWorkflow(args[0]);
      break;
    case 'trigger':
      const isTest = args.includes('--test');
      const pathArg = args.find(a => a !== '--test');
      await triggerWebhook(pathArg, isTest, { triggeredBy: 'siplan-hub-cli', timestamp: new Date().toISOString() });
      break;
    default:
      console.log(`
Uso: node scripts/tools/n8n-manager.mjs <comando> [argumentos]

Comandos disponíveis:
  test / check             Testa a conexão com o n8n Siplan HUB
  list / ls                Lista todos os workflows com status e nós
  get <workflowId>         Exibe detalhes de um workflow específico
  trigger <path> [--test]  Dispara chamada HTTP para testar um nó Webhook
      `);
      break;
  }
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
