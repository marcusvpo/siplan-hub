import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Carrega variáveis do arquivo .env manualmente para evitar dependência do pacote 'dotenv'
let connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString && fs.existsSync('.env')) {
  const envLines = fs.readFileSync('.env', 'utf-8').split('\n');
  for (const line of envLines) {
    if (line.trim().startsWith('SUPABASE_DB_URL=')) {
      connectionString = line.split('SUPABASE_DB_URL=')[1].trim();
      // Remove possíveis aspas simples ou duplas ao redor do valor
      if ((connectionString.startsWith('"') && connectionString.endsWith('"')) ||
          (connectionString.startsWith("'") && connectionString.endsWith("'"))) {
        connectionString = connectionString.slice(1, -1);
      }
      break;
    }
  }
}

if (!connectionString) {
  console.error("Erro: A variável SUPABASE_DB_URL não está definida no arquivo .env");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  await client.connect();
  console.log("Conectado com sucesso ao banco remoto do Supabase!");

  const migrationPath = path.resolve('supabase/migrations/20260806103000_create_chamados_processo_venda.sql');
  if (!fs.existsSync(migrationPath)) {
    console.error(`Erro: Arquivo de migração não encontrado em ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log("Aplicando migração para criar a tabela chamados_processo_venda...");
  await client.query(sql);
  console.log("Tabela criada e políticas de segurança (RLS) aplicadas com sucesso!");

  await client.end();
}

run().catch(err => {
  console.error("Erro durante a execução da migração:", err);
  process.exit(1);
});
