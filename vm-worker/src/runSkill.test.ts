import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SECRET_KEY ||= "test-secret";
process.env.OLLAMA_HOST = "http://127.0.0.1:1";

const { buildCodexChildEnv, parseCodexEvent, runSkill } = await import("./runSkill.js");
const { ensureCodexModelSkill } = await import("./codexModelSkill.js");
const { selectCopilotHistory } = await import("./copilotHistory.js");
const { detectCopilotQuestionContext } = await import("./copilotContext.js");
const { humanizeCopilotText } = await import("./copilotLanguage.js");

test("traduz a notacao interna do copiloto para linguagem de negocio", () => {
  assert.equal(
    humanizeCopilotText(
      "- Cartorio Exemplo :: pos=todo | implantacao=done(Joana Silva)[01/07-05/07] | ambiente=in-progress(Luciane Lima)[03/07]"
    ),
    "- Cartorio Exemplo — Pós-implantação: Não iniciado; Implantação e treinamento: Concluído (responsável: Joana Silva; período: 01/07 a 05/07); Preparação do ambiente: Em andamento (responsável: Luciane Lima; data: 03/07)"
  );
});

test("envia ao copiloto somente os blocos relacionados com a pergunta", () => {
  assert.deepEqual(
    detectCopilotQuestionContext("Quais projetos estao parados na implantacao?"),
    { stages: ["implementation"], includeConversionIssues: false, includeChamadosPos: false }
  );
  assert.deepEqual(
    detectCopilotQuestionContext("Quais bugs e chamados 0800 estao abertos no pos-implantacao?"),
    { stages: ["post"], includeConversionIssues: false, includeChamadosPos: true }
  );
  assert.equal(detectCopilotQuestionContext("Resuma o portfolio").stages.length, 7);
});

test("isola o historico do copiloto por sessao e prioriza as mensagens recentes", () => {
  const rows = [
    { question: "mais recente", result_text: "resposta recente", created_at: "2026-08-26T15:00:00Z" },
    { question: "anterior", result_text: "resposta anterior", created_at: "2026-08-26T14:55:00Z" },
    { question: "ModelosTN antigo", result_text: "resposta antiga", created_at: "2026-07-10T15:00:00Z" },
  ];

  assert.deepEqual(
    selectCopilotHistory(rows, { currentCreatedAt: "2026-08-26T15:05:00Z" }),
    [
      { question: "anterior", result_text: "resposta anterior" },
      { question: "mais recente", result_text: "resposta recente" },
    ]
  );

  assert.deepEqual(
    selectCopilotHistory(rows, {
      currentCreatedAt: "2026-08-26T15:05:00Z",
      maxChars: "mais recente".length + "resposta recente".length,
    }),
    [{ question: "mais recente", result_text: "resposta recente" }]
  );

  assert.deepEqual(
    selectCopilotHistory(rows, {
      currentCreatedAt: "2026-08-26T15:05:00Z",
      currentQuestion: "mais recente",
    }),
    [{ question: "anterior", result_text: "resposta anterior" }]
  );
});

test("parseia progresso, mensagem final e uso do Codex JSONL", () => {
  assert.equal(
    parseCodexEvent({ type: "thread.started", thread_id: "abc" }).progressKind,
    "system"
  );

  const command = parseCodexEvent({
    type: "item.started",
    item: { type: "command_execution", command: "python3 tools/validar_rtf.py modelo.rtf" },
  });
  assert.match(command.progress || "", /validar_rtf/);
  assert.equal(command.progressKind, "tool");

  const message = parseCodexEvent({
    type: "item.completed",
    item: { type: "agent_message", text: "JSON_GERADO=/tmp/modelo.json" },
  });
  assert.equal(message.resultText, "JSON_GERADO=/tmp/modelo.json");
  assert.match(message.transcriptText || "", /JSON_GERADO/);

  const completed = parseCodexEvent({
    type: "turn.completed",
    usage: { input_tokens: 120, cached_input_tokens: 80, output_tokens: 30 },
  });
  assert.deepEqual(completed.usage, {
    inputTokens: 120,
    outputTokens: 30,
    cacheReadTokens: 80,
  });
});

test("remove segredos operacionais do ambiente do Codex", () => {
  const env = buildCodexChildEnv({
    PATH: "/usr/bin",
    SUPABASE_SECRET_KEY: "supabase-secret",
    MSSQL_PASSWORD: "sql-secret",
    OPENAI_API_KEY: "openai-secret",
    CODEX_ACCESS_TOKEN: "codex-secret",
  });
  assert.equal(env.PATH, "/usr/bin");
  assert.equal(env.SUPABASE_SECRET_KEY, undefined);
  assert.equal(env.MSSQL_PASSWORD, undefined);
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.CODEX_ACCESS_TOKEN, undefined);
});

test("usa Ollama como fallback e preserva a falha original do Codex", async () => {
  const previousBin = process.env.CODEX_BIN;
  const previousWarn = console.warn;
  const progress: string[] = [];
  process.env.CODEX_BIN = path.join(os.tmpdir(), "codex-bin-inexistente");
  console.warn = () => {};
  try {
    const result = await runSkill(
      "Responda apenas OK.",
      (step) => progress.push(step.text),
      undefined,
      {
        provider: "codex",
        cwd: os.tmpdir(),
        allowOllamaFallback: true,
      }
    );
    assert.equal(result.code, 1);
    assert.ok(progress.some((text) => /Continuando com Ollama local/i.test(text)));
    assert.match(result.stderr, /Falha Codex:/);
    assert.match(result.stderr, /Falha Ollama:/);
  } finally {
    if (previousBin === undefined) delete process.env.CODEX_BIN;
    else process.env.CODEX_BIN = previousBin;
    console.warn = previousWarn;
  }
});

test("instala wrapper Codex apontando para a skill nativa em .codex", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "siplan-codex-skill-"));
  try {
    const originalDir = path.join(
      tempRoot,
      ".codex",
      "skills",
      "criar-modelo-mesclado"
    );
    await mkdir(originalDir, { recursive: true });
    await writeFile(path.join(originalDir, "SKILL.md"), "# Skill original\n", "utf-8");

    const installed = await ensureCodexModelSkill(tempRoot);
    const content = await readFile(installed, "utf-8");
    assert.match(content, /name: criar-modelo-mesclado/);
    assert.match(content, /\.codex\/skills\/criar-modelo-mesclado\/SKILL\.md/);
    assert.doesNotMatch(content, /\.claude\/skills\/criar-modelo-mesclado/);
    assert.match(content, /Nunca pedir entrada, confirmacao ou aprovacao/);

    assert.equal(await ensureCodexModelSkill(tempRoot), installed);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("mantem compatibilidade com a skill legada em .claude", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "siplan-claude-skill-"));
  try {
    const originalDir = path.join(
      tempRoot,
      ".claude",
      "skills",
      "criar-modelo-mesclado"
    );
    await mkdir(originalDir, { recursive: true });
    await writeFile(path.join(originalDir, "SKILL.md"), "# Skill legada\n", "utf-8");

    const installed = await ensureCodexModelSkill(tempRoot);
    const content = await readFile(installed, "utf-8");
    assert.match(content, /\.claude\/skills\/criar-modelo-mesclado\/SKILL\.md/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("informa todos os caminhos quando a skill do modelo nao existe", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "siplan-missing-skill-"));
  try {
    await assert.rejects(
      ensureCodexModelSkill(tempRoot),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /\.codex.*criar-modelo-mesclado.*SKILL\.md/);
        assert.match(error.message, /\.claude.*criar-modelo-mesclado.*SKILL\.md/);
        return true;
      }
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test(
  "executa smoke test real do Codex CLI",
  { skip: process.env.CODEX_SMOKE !== "1" },
  async () => {
    const result = await runSkill(
      "Responda exatamente CODEX_SMOKE_OK e nao execute ferramentas.",
      undefined,
      undefined,
      {
        provider: "codex",
        cwd: process.cwd(),
        reasoningEffort: "low",
        allowOllamaFallback: false,
      }
    );
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.resultText, /CODEX_SMOKE_OK/);
    assert.ok(result.inputTokens > 0);
  }
);
