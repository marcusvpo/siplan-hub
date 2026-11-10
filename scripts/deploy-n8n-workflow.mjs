import fs from "node:fs";

const N8N_API_URL = "http://n8n.siplan.com.br:5678/api/v1";
const N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJiYTkxN2Q4OS03MWRjLTRlYmEtYTdkZi01NDkxNTM1NGIzNWUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiM2UyYzE5MTUtMGQ0OC00MmFiLWIzN2QtNmUxNDJkNjIzNTNlIiwiaWF0IjoxNzkzODA0ODcyfQ.tSzuchSumuBrmIh-cbS1Q_vrY72upYsAxovpz01CNJw";
const WORKFLOW_ID = "mNQ9HfJUls39FIVi";

async function main() {
  console.log(`Lendo workflow atualizado de scripts/refactored-workflow.json...`);
  const raw = fs.readFileSync("scripts/refactored-workflow.json", "utf8");
  const payload = JSON.parse(raw);

  console.log(`Enviando atualização para o n8n (${payload.nodes.length} nós)...`);
  
  const res = await fetch(`${N8N_API_URL}/workflows/${WORKFLOW_ID}`, {
    method: "PUT",
    headers: {
      "X-N8N-API-KEY": N8N_API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      name: payload.name,
      nodes: payload.nodes,
      connections: payload.connections,
      settings: {
        executionOrder: "v1"
      }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Falha ao atualizar workflow (HTTP ${res.status}):`, errorText);
    process.exit(1);
  }

  const result = await res.json();
  console.log("Sucesso! Workflow atualizado no n8n:");
  console.log(`- ID: ${result.id}`);
  console.log(`- Nome: ${result.name}`);
  console.log(`- Ativo: ${result.active}`);
  console.log(`- Total de Nós: ${result.nodes?.length}`);
  console.log(`- Atualizado em: ${result.updatedAt}`);

  // Se o workflow não estiver ativo, ativá-lo
  if (!result.active) {
    console.log("Ativando workflow...");
    const actRes = await fetch(`${N8N_API_URL}/workflows/${WORKFLOW_ID}/activate`, {
      method: "POST",
      headers: {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Accept": "application/json"
      }
    });
    if (actRes.ok) {
      console.log("Workflow ativado com sucesso!");
    } else {
      console.warn("Aviso ao ativar workflow:", await actRes.text());
    }
  }
}

main().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
