import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MODEL_SKILL_PARTS = ["skills", "criar-modelo-mesclado", "SKILL.md"];
const MODEL_SKILL_SOURCE = [".codex", ...MODEL_SKILL_PARTS] as const;

function buildManagedSkill(sourceRelativePath: string): string {
  return `---
name: criar-modelo-mesclado
description: Transformar documentos de clientes (DOCX, ODT, PDF, DOC ou RTF) em modelos Orion RTF/ODT e no modelo.json de importacao. Usar no gerador automatico do SiplanHUB e sempre que for preciso executar o fluxo criar-modelo-mesclado de forma autonoma.
---

# Criar modelo mesclado no Codex

Executar o fluxo completo sem intervencao humana quando o prompt declarar modo
headless, automatico ou autonomo.

## Fonte de verdade

1. Ler por completo, antes de agir, o arquivo
   \`${sourceRelativePath}\` da raiz do repositorio, incluindo as referencias que
   ele declarar obrigatorias.
2. Ler \`AGENTS.md\` e demais instrucoes de projeto existentes.
3. Seguir as fases, validadores, linters e scripts da skill fonte. Nao
   reimplementar empacotamento manualmente.

## Contrato headless obrigatorio

Estas regras substituem qualquer instrucao de perguntar ou aguardar confirmacao
existente na skill original:

- Nunca pedir entrada, confirmacao ou aprovacao durante o job.
- Escolher automaticamente a alternativa recomendada e mais provavel com base no
  documento, exemplos oficiais, lista de variaveis e modelos ja criados.
- Para escrituras e atos notariais, preferir Minuta 600 quando os artefatos do
  projeto confirmarem esse enquadramento.
- Em ambiguidade que possa mudar significado juridico e nao tenha evidencia
  suficiente, preservar alternativa autoral ou lacuna manual em vez de inventar
  dado, variavel ou clausula.
- Derivar slug, nome e descricao dos metadados fornecidos no prompt. Nao perguntar.
- Escolher sozinho o exemplo-base estruturalmente mais proximo.
- Nao parar em avisos corrigiveis: corrigir, revalidar e continuar.
- Parar somente em falha dura de ambiente ou quando nao existir exemplo oficial
  indispensavel. Explicar a causa exata na mensagem final de erro.

## Verificacao sem subagente obrigatorio

Na fase de verificacao definida pela skill fonte, ler por completo o verificador
indicado por ela e executar a auditoria na propria sessao. Rodar todos os
validadores deterministas exigidos, comparar o resultado com o documento do
cliente e corrigir ate obter aprovacao. Usar subagente apenas se estiver
disponivel e se isso nao interromper o modo headless; sua ausencia nunca bloqueia
o fluxo.

## Entrega ao worker

- Nao executar \`git add\`, \`git commit\` ou \`git push\` durante jobs do SiplanHUB.
- Gerar os tres artefatos finais com \`tools/empacotar_modelo.py\`.
- Validar que o JSON abre com parser JSON e contem o ODT empacotado esperado.
- Encerrar imprimindo exatamente uma linha no formato:
  \`JSON_GERADO=<caminho absoluto do modelo.json>\`.
`;
}

/**
 * Instala/atualiza a skill de compatibilidade Codex dentro do Orion.Modelos.
 * O conhecimento de dominio permanece na skill original; este wrapper adiciona
 * apenas descoberta pelo Codex e as regras do worker headless.
 */
export async function ensureCodexModelSkill(projectDir: string): Promise<string> {
  const source = path.join(projectDir, ...MODEL_SKILL_SOURCE);
  const sourceRelativePath = MODEL_SKILL_SOURCE.join("/");
  try {
    await readFile(source, "utf-8");
  } catch {
    throw new Error(
      `Skill criar-modelo-mesclado nao encontrada: ${source}`
    );
  }

  const targetDir = path.join(projectDir, ".agents", "skills", "criar-modelo-mesclado");
  const target = path.join(targetDir, "SKILL.md");
  const managedSkill = buildManagedSkill(sourceRelativePath);
  await mkdir(targetDir, { recursive: true });

  let current = "";
  try {
    current = await readFile(target, "utf-8");
  } catch {
    // Primeira instalacao.
  }
  if (current !== managedSkill) await writeFile(target, managedSkill, "utf-8");
  return target;
}

export const CODEX_MODEL_SKILL_CONTENT = buildManagedSkill(
  ".codex/skills/criar-modelo-mesclado/SKILL.md"
);
