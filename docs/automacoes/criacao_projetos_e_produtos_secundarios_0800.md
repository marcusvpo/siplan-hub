---
tipo: Manual
area: Siplan Hub
tags:
  - #manual
  - #automacao
  - #n8n
  - #0800
  - #produtos_secundarios
  - #implantacao
status_atual: #ativo
---

# 🚀 Guia Passo a Passo (Node por Node): Automação 0800 — Sistemas Principais + Produtos Secundários

Este manual explica **exatamente o que alterar manualmente em cada um dos 4 nós** do seu workflow atual no **n8n** (`Criação de Projetos Siplan HUB - 0800`) para que ele passe a capturar tanto os **Sistemas Principais** (`Orion TN`, `Orion PRO`, `Orion REG`, `WebRI`) quanto os **14 Produtos Secundários Oficiais** (`Livro Caixa Web`, `SGA`, `Library`, `Cartório On Hand`, `e-Recepção`, `CIAF`, `Image`, `Image PRO`, `e-Qualificação`, `Orion Caixa`, `Orion CartFLOW`, `Orion Connect`, `Orion Editor` e `Orion GED`), sem depender de importação de arquivo JSON.

> [!IMPORTANT]
> **Onde mora a inteligência?**
> Toda a classificação oficial do catálogo de 14 produtos, o bloqueio de vendas avulsas (cartórios sem projeto ativo ou apenas com projetos concluídos), a regra exclusiva do `Orion Editor ➔ Orion TN` e o espelhamento automático entre múltiplos sistemas principais (`Orion TN` + `Orion PRO`) **já estão rodando dentro da função `public.sync_0800_project` no Supabase**. No n8n você só precisa ajustar o SQL, o código JS e o lote sequencial do HTTP Request!

---

## 📋 Visão Geral dos 4 Nós do Fluxo

```mermaid
flowchart LR
    N1["1. Schedule Trigger (Diário 08h)"] --> N2["2. Microsoft SQL (Principais + Secundários)"]
    N2 --> N3["3. Code in JavaScript (Deduplica + Ordena Principais 1º)"]
    N3 --> N4["4. HTTP Request (POST RPC sync_0800_project)"]
```

---

## 🛠️ Passo a Passo Manual — Nó por Nó

### Nó 1: `Schedule Trigger` (Nenhuma alteração necessária)
- Mantenha exatamente como já está configurado hoje:
  - **Trigger Rules:** `Days` / `Trigger at Hour: 8` (`08:00` todos os dias).

---

### Nó 2: `Microsoft SQL` (`UNION ALL` unificando Collation SAP `CP850` + Ellevo `CP1`)
1. Abra o nó **`Microsoft SQL`** no seu workflow atual.
2. Mantenha sua credencial atual (`Microsoft SQL account`, com `Request Timeout` em `60000`) e **Operation:** `Execute Query`.
3. **Substitua todo o conteúdo do campo `Query`** pelo SQL abaixo:

```sql
WITH principais AS (
  SELECT 
    NomeCliente, 
    NumeroChamado, 
    Software, 
    NumeroPedidoVenda, 
    TituloChamado, 
    descricaotramite, 
    ResponsavelAtividade, 
    EtapasProjeto, 
    DataPedidoVenda,
    ROW_NUMBER() OVER (
      PARTITION BY NumeroChamado 
      ORDER BY DataPedidoVenda DESC
    ) AS rn
  FROM plataformaellevo..vw_2026_PROCESSO_VENDA_FATURAMENTO_ITEM_ATIVIDADES 
  WHERE DataPedidoVenda >= '2026-09-10 00:00:00' 
    AND Software IS NOT NULL 
    AND TituloChamado IS NOT NULL
    AND Software IN ('OrionTN', 'OrionPRO', 'OrionREG', 'Orion TN', 'Orion PRO', 'Orion REG', 'WEBRI', 'WEB RI', 'OrionREG (TDPJ)')
    AND TituloChamado LIKE '%Impla%Treinamento%'
),
secundarios AS (
  SELECT
    c.NomeCliente,
    c.NumeroChamado,
    c.Software,
    c.SolTitulo AS TituloChamado,
    c.ResponsavelChamado AS ResponsavelAtividade,
    c.StatusChamado AS EtapasProjeto,
    c.DataAberturaChamadoComHoras AS DataPedidoVenda,
    ROW_NUMBER() OVER (
      PARTITION BY c.NumeroChamado
      ORDER BY c.DataUltimaEdicaoTramite DESC
    ) AS rn
  FROM plataformaellevo.dbo.vw_ChamadosTodosStatus AS c WITH (NOLOCK)
  WHERE c.DataAberturaChamadoComHoras >= CONVERT(datetime, '2026-09-10T00:00:00', 126)
    AND c.Software IS NOT NULL
    AND c.SolTitulo IS NOT NULL
    AND LTRIM(RTRIM(c.Software)) IN (
      'LCW', 'Livro Caixa Web', 'LCX - Livro Caixa',
      'SGA',
      'Library',
      'Cartório On Hand', 'On Hand',
      'e-Recepção',
      'CIAF',
      'Image', 'IMG', 'ImagePRO', 'Image PRO',
      'e-Qualificação',
      'Caixa', 'Orion Caixa', 'OrionCaixa',
      'Orion CartFLOW', 'OrionCartFLOW', 'CartFLOW',
      'Orion Connect', 'OrionConnect',
      'Editor', 'Orion Editor', 'OrionEditor',
      'OrionGED', 'Orion GED'
    )
    AND (c.SolTitulo LIKE '%Impla%Treinamento%' OR c.SolTitulo LIKE '%Configura%Treinamento%')
)
SELECT
  CONVERT(nvarchar(400), NomeCliente) COLLATE SQL_Latin1_General_CP1_CI_AI AS NomeCliente,
  CONVERT(nvarchar(50), NumeroChamado) COLLATE SQL_Latin1_General_CP1_CI_AI AS NumeroChamado,
  CONVERT(nvarchar(150), Software) COLLATE SQL_Latin1_General_CP1_CI_AI AS Software,
  CONVERT(nvarchar(50), NumeroPedidoVenda) COLLATE SQL_Latin1_General_CP1_CI_AI AS NumeroPedidoVenda,
  CONVERT(nvarchar(500), TituloChamado) COLLATE SQL_Latin1_General_CP1_CI_AI AS TituloChamado,
  CONVERT(nvarchar(max), CONVERT(varchar(max), descricaotramite)) COLLATE SQL_Latin1_General_CP1_CI_AI AS descricaotramite,
  CONVERT(nvarchar(200), ResponsavelAtividade) COLLATE SQL_Latin1_General_CP1_CI_AI AS ResponsavelAtividade,
  CONVERT(nvarchar(200), EtapasProjeto) COLLATE SQL_Latin1_General_CP1_CI_AI AS EtapasProjeto,
  CONVERT(nvarchar(30), DataPedidoVenda, 120) COLLATE SQL_Latin1_General_CP1_CI_AI AS DataPedidoVenda
FROM principais
WHERE rn = 1

UNION ALL

SELECT
  CONVERT(nvarchar(400), NomeCliente) COLLATE SQL_Latin1_General_CP1_CI_AI AS NomeCliente,
  CONVERT(nvarchar(50), NumeroChamado) COLLATE SQL_Latin1_General_CP1_CI_AI AS NumeroChamado,
  CONVERT(nvarchar(150), Software) COLLATE SQL_Latin1_General_CP1_CI_AI AS Software,
  CAST(NULL AS nvarchar(50)) COLLATE SQL_Latin1_General_CP1_CI_AI AS NumeroPedidoVenda,
  CONVERT(nvarchar(500), TituloChamado) COLLATE SQL_Latin1_General_CP1_CI_AI AS TituloChamado,
  CAST(N'Sem descrição' AS nvarchar(max)) COLLATE SQL_Latin1_General_CP1_CI_AI AS descricaotramite,
  CONVERT(nvarchar(200), ResponsavelAtividade) COLLATE SQL_Latin1_General_CP1_CI_AI AS ResponsavelAtividade,
  CONVERT(nvarchar(200), EtapasProjeto) COLLATE SQL_Latin1_General_CP1_CI_AI AS EtapasProjeto,
  CONVERT(nvarchar(30), DataPedidoVenda, 120) COLLATE SQL_Latin1_General_CP1_CI_AI AS DataPedidoVenda
FROM secundarios
WHERE rn = 1;
```

**Por que cada detalhe acima existe?**
1. **Isolamento do erro `Conversion failed` do SAP (`Msg 245`):** a `vw_2026_PROCESSO_VENDA_FATURAMENTO_ITEM_ATIVIDADES` cruza campos texto do SAP contra `int` do Ellevo sem `TRY_CAST` e quebra ao ler produtos secundários. Mantemos `principais` intacto nela e lemos `secundarios` na `plataformaellevo.dbo.vw_ChamadosTodosStatus` (mesmo banco `plataformaellevo`).
2. **Unificação de Collation (`COLLATE SQL_Latin1_General_CP1_CI_AI` no `SELECT` externo):** a view de faturamento herda a collation `SQL_Latin1_General_CP850_CI_AS` do SAP, enquanto a `vw_ChamadosTodosStatus` usa `SQL_Latin1_General_CP1_CI_AI` do Ellevo. Aplicar `COLLATE SQL_Latin1_General_CP1_CI_AI` somente na saída final do `UNION ALL` (após `WHERE rn = 1`) resolve 100% o conflito de collation sem qualquer impacto de performance nos índices do `WHERE`.
3. **Blindagem em 4 Camadas contra Erros de Digitação e Nomenclatura (`20261029150000_secondary_products_typo_shield.sql`):**
   - **Camada 1 (Raiz morfológica `Impla...Treinamento`):** captura erros ortográficos como `"Implanmtação e Treinamento"`, `"Implatação"` ou omissão do `"e"`, bloqueando pós-implantação, rotinas, atualizações, período de teste e IA.
   - **Camada 2 (`Configura...Treinamento` exclusivo para Secundários):** aceita `"Configuração e Treinamento"` apenas para os **14 Produtos Secundários Oficiais** quando o cartório possui projeto principal ativo (`global_status <> 'done'`), barrando 100% treinamentos de rotina em sistemas principais (ex.: `"OrionTN 6.0 - Configuração de rotinas e Treinamento"`).
   - **Camada 3 (Dupla checagem `Título` + `Software`):** o título continua sendo a fonte primária, mas se o sufixo for omitido ou tiver grafia inédita, o classificador usa `Software` do Ellevo como *fallback* seguro.
   - **Camada 4 (Ponte SAP ↔ Ellevo):** cruza `OP`, `Pedido de Venda`, `client_name` e os espelhos `chamados_processo_venda` / `chamados_0800` para vincular mesmo quando o nome no SAP difere do nome abreviado no Ellevo e o título veio sem `OP`.
4. **Observação sobre permissão da credencial do n8n:** o fato de o SQL Server ter inspecionado as colunas e a collation da `plataformaellevo.dbo.vw_ChamadosTodosStatus` indica que ambas estão visíveis no mesmo banco `plataformaellevo`. Caso, ao executar, apareça especificamente `The SELECT permission was denied on the object 'vw_ChamadosTodosStatus'`, basta liberar `GRANT SELECT` nessa view para o usuário do n8n **ou** podemos mover a descoberta automática dos secundários diretamente para o `vm-worker` (que já lê a `vw_ChamadosTodosStatus` a cada 5 minutos), mantendo o n8n apenas com o SQL antigo dos principais.

---

### Nó 3: `Code in JavaScript` (Remover bloqueio JS antigo e ordenar Principais antes dos Secundários)
1. Abra o nó **`Code in JavaScript`**.
2. Confirme que **Mode** está em `Run Once for All Items` e **Language** em `JavaScript`.
3. **Apague todo o código antigo** e cole o código abaixo:

```javascript
const normalizeText = (val) =>
  String(val || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isLikelyPrimary = (tituloNorm, softwareNorm) => {
  const match = tituloNorm.match(/\bimpla[a-z]{2,10}\s+(?:e\s+|de\s+|configuracao\s+e\s+)?treinamento\b(.*)$/);
  if (!match) return false;
  const subject = (match[1] || '').trim() || tituloNorm;
  if (/\b(siplan\s*ia|inteligencia\s*artificial|bi\s*report|nfse|nfs\s*e|web\s*rc|modulo\s*ia|rotina)\b/.test(tituloNorm)) {
    return false;
  }
  if (/\b(orio?n\s*(tn|notas|tabelionato|pro|protesto|reg|registro)|web\s*ri)\b/.test(subject)) {
    return true;
  }
  if (!(match[1] || '').trim() && /\b(orion\s*(tn|pro|reg)|web\s*ri)\b/.test(softwareNorm)) {
    return true;
  }
  return false;
};

const itemsByTicket = new Map();

for (const item of $input.all()) {
  const dados = item.json;
  const rawTicket = dados.NumeroChamado ?? dados.numerochamado;
  if (!rawTicket) continue;

  const ticketNum = String(rawTicket).trim();
  if (!ticketNum || itemsByTicket.has(ticketNum)) continue;

  const titulo = String(dados.TituloChamado || dados.titulochamado || dados.TITULOCHAMADO || '').trim();
  const tituloNorm = normalizeText(titulo);
  if (!/\b(impla[a-z]{2,10}|configura[a-z]{2,10})\s+(?:e\s+|de\s+|configuracao\s+e\s+)?treinamento\b/.test(tituloNorm)) continue;
  if (/\bpos\s+impla/.test(tituloNorm)) continue;

  const rawSoftware = String(dados.Software || dados.software || '').trim();
  const softwareNorm = normalizeText(rawSoftware);

  let opNumber = null;
  const opMatch = titulo.match(/\bOP:?\s*([\d\/]+)/i);
  if (opMatch && opMatch[1]) {
    const cleanNumber = opMatch[1].replace(/\D/g, '');
    const parsedOp = parseInt(cleanNumber, 10);
    if (!Number.isNaN(parsedOp) && parsedOp > 0 && parsedOp <= 2147483647) {
      opNumber = parsedOp;
    }
  }

  let salesOrderNumber = null;
  if (dados.NumeroPedidoVenda) {
    const cleanSales = String(dados.NumeroPedidoVenda).replace(/\D/g, '');
    const parsedSales = parseInt(cleanSales, 10);
    if (!Number.isNaN(parsedSales) && parsedSales > 0 && parsedSales <= 2147483647) {
      salesOrderNumber = parsedSales;
    }
  }

  const tramiteDesc =
    dados.descricaotramite ||
    dados.DescricaoTramite ||
    dados.Descricaotramite ||
    'Sem descrição';
  const responsavel =
    dados.ResponsavelAtividade ||
    dados.responsavelatividade ||
    'Não atribuído';
  const etapas =
    dados.EtapasProjeto ||
    dados.etapasprojeto ||
    'Sem etapas definidas';

  const primaryPriority = isLikelyPrimary(tituloNorm, softwareNorm) ? 0 : 1;

  itemsByTicket.set(ticketNum, {
    _sortPriority: primaryPriority,
    payload: {
      p_ticket_number: ticketNum,
      p_client_name: String(dados.NomeCliente || dados.nomecliente || '').trim(),
      p_system_type: rawSoftware || 'Não informado',
      p_sales_order_number: salesOrderNumber,
      p_op_number: opNumber,
      p_titulo_chamado: titulo || 'Título não preenchido no 0800',
      p_descricao_tramite: String(tramiteDesc),
      p_responsavel_atividade: String(responsavel),
      p_etapas_projeto: String(etapas),
      p_project_leader: 'Bruno Fernandes'
    }
  });
}

return Array.from(itemsByTicket.values())
  .sort((a, b) => a._sortPriority - b._sortPriority)
  .map((entry) => ({ json: entry.payload }));
```

**O que mudou aqui e por quê?**
- Removemos o bloqueio antigo `isOrionTarget` que descartava `WebRI` e todos os produtos secundários.
- A extração de OP agora aceita tanto `OP: 12131/2026` quanto `OP 10612` (sem dois-pontos).
- **Ordenação Inteligente (`_sortPriority`):** coloca todos os chamados de **Sistemas Principais primeiro (`0`)** e todos os **Produtos Secundários depois (`1`)**. Assim, se um cartório abrir `Orion TN` + `LCW` + `SGA` no mesmo dia, o projeto principal é criado primeiro no Supabase e, milissegundos depois, `LCW` e `SGA` já encontram o projeto pai ativo e se vinculam na mesma execução!

---

### Nó 4: `HTTP Request` (Manter endpoint atual + ativar Batching sequencial)
1. Abra o nó **`HTTP Request`**.
2. **Não mexa nos seus Headers de autenticação atuais** (`apikey`, `Authorization: Bearer ...` e `Content-Type: application/json`) nem na URL:
   - **Method:** `POST`
   - **URL:** `https://okvufcwkophaadttmjwa.supabase.co/rest/v1/rpc/sync_0800_project`
   - **Send Body:** `true` | **Body Content Type:** `JSON` | **Specify Body:** `Using JSON`
   - **JSON:** `={{ $json }}`
3. Role até **Options** no final do nó, clique em **`Add Option` ➔ `Batching`** e configure:
   - **Items per Batch:** `1`
   - **Batch Interval (ms):** `50`
   *(Isso garante que o n8n envie 1 chamado por vez respeitando rigorosamente a fila Sistemas Principais ➔ Produtos Secundários, sem condição de corrida).*

---

## 🧪 Como Testar com Segurança no n8n

1. Com os 4 nós atualizados, clique em **`Test workflow`** (ou `Execute Workflow`).
2. Verifique:
   - No nó **Microsoft SQL**, a consulta concluirá rapidamente sem timeout, sem erro de conversão do SAP e sem conflito de collation.
   - No nó **Code in JavaScript**, os primeiros itens da saída serão os sistemas principais (`Orion TN`, `Orion PRO`, `Orion REG`, `WebRI`) e os seguintes serão os demais chamados `"Implantação e Treinamento"`.
   - No nó **HTTP Request**, todas as chamadas retornarão sucesso (`200`/`204`).
   - Abra o **Siplan HUB** em `/deployments/secondary-products` ou em `/projects`:
     - Apenas produtos secundários pertencentes aos **14 produtos oficiais** cujo cartório possua projeto principal ativo (`global_status <> 'done'`) terão entrado!
     - `Siplan IA`, `Siplan NFSe`, `BI Report`, `WebRC`, suporte/conversão e vendas avulsas terão sido **automaticamente ignorados**.
     - Em até ~5 minutos (ou clicando em **"Sincronizar 0800"** na tela), o `vm-worker` preencherá o **Status atual no Ellevo**, **Analista/Equipe atual no 0800** e o **Último Trâmite**.
3. Clique em **`Save`** no canto superior direito do n8n para gravar em produção!

---

## ➕ Como Adicionar um Novo Produto Secundário no Futuro

Como o catálogo oficial vive no banco (`public.secondary_product_catalog`), se o Administrativo lançar um 15º produto secundário no futuro:
1. Inclua o nome do `Software` correspondente no bloco `secundarios` (`LTRIM(RTRIM(c.Software)) IN (...)`) do **Nó 2 (`Microsoft SQL`)** no n8n (caso ainda não esteja coberto pelos nomes existentes).
2. Rode um `INSERT` no SQL Editor do Supabase (sem precisar fazer deploy de código):

```sql
INSERT INTO public.secondary_product_catalog (
  code, name, category, match_patterns, only_system_type, requires_orion_admin, priority, active
) VALUES (
  'novo_produto',
  'Nome Oficial do Produto',
  'secondary',
  ARRAY['\mnome\s*oficial\M', '\msigla\M'],
  NULL,  -- ou 'Orion TN' se depender exclusivamente de um sistema específico
  false, -- ou true se exigir criação de chave no Orion Admin
  65,
  true
);
```

Arquivo JSON de referência (com placeholder `<SUPABASE_SERVICE_ROLE_KEY>` por segurança):
[`docs/automacoes/n8n-workflow-projetos-e-produtos-secundarios-0800.json`](./n8n-workflow-projetos-e-produtos-secundarios-0800.json)
