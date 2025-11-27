# PROMPT MESTRE V3.0 - Siplan Manager
## Reestruturação com Foco em Transparência, Visibilidade & Interatividade

**Versão:** 3.0 (Transparency-First)  
**Objetivo:** Redesenhar Siplan Manager como plataforma CENTRADA EM PROJETOS com máxima visibilidade, interatividade tipo Notion, autosave robusto, e detalhes individuais por projeto sempre à vista.

**Data:** 26/11/2025  
**Status:** Refactoring Completo

---

## SUMÁRIO EXECUTIVO V3

### Mudanças Estratégicas

✅ **Dashboard Centralizado & Maior**
- Drawer lateral REMOVIDO → Visualização Full-Width Centralized
- Projetos exibidos em cards amplos e informativos
- Pipeline Visual movido para card do projeto no dashboard

✅ **Foco em Transparência Visual**
- Cada projeto mostra indicadores principais sem necessidade de abrir
- Cores, badges, status visíveis imediatamente
- Menos cliques, mais informação à primeira vista

✅ **Autosave Robusto & Confiável**
- Implementação correta com debounce, retry logic, e feedback visual
- Sincronização real-time com Lovable Cloud
- Histórico de versões para cada alteração

✅ **Distinção Clara: Timeline vs Auditoria**
- **Timeline:** Feed de ações (comentários, uploads, observações editadas) - SOCIAL
- **Auditoria:** Log técnico (quem, o quê, quando, valores anteriores/novos) - COMPLIANCE

✅ **Interatividade Notion-like**
- Editor Rich Text para Observações
- Markdown + @mentions + Links
- Blocos customizáveis (cards, callouts, checklists)
- Drag & drop para reordenar

✅ **Remoção de Seções Redundantes**
- ❌ "Dados do Contrato / Negócio" (info nível MS Excel)
- ❌ "Datas Críticas" (disperso, consolidado em Pipeline)
- ✅ Consolidação em seção "Informações Gerais" única e clara

✅ **Robustez Visual por Projeto**
- Cards maiores (60-70% da tela quando em Kanban/Grid)
- Micro-indicadores de risco/atenção/ok
- Última atualização e responsável visíveis
- Quick actions (edit, archive, duplicate, delete)

---

## ARQUITETURA V3 - CENTRALIZADA

### Estrutura de Navegação

```
Siplan Manager (Full-Width Centered)
│
├── 📊 Dashboard (Overview - KPI Global)
│   ├── KPIs em Cards Compactos
│   ├── Gráficos & Tendências
│   └── Link para "Gerenciar Projetos"
│
├── 📋 Gerenciar Projetos (Main View - CENTRALIZADO)
│   ├── Visualização Ativa (Tabela | Kanban | Calendário | Gantt)
│   ├── Filtros Avançados & Salvos (Sticky Top)
│   ├── Bulk Operations
│   ├── Busca Global
│   │
│   ├── Cards de Projeto (NOVO LAYOUT)
│   │   ├── Header (Cliente, Sistema, Ticket)
│   │   ├── Pipeline Visual (6 dots coloridos)
│   │   ├── Status & Health Score
│   │   ├── Responsáveis Principais
│   │   ├── Última Atualização (data + user)
│   │   ├── Next Follow-up (destacado se vencido)
│   │   ├── Progresso Visual (barra %)
│   │   └── Quick Actions (⋯ menu)
│   │
│   └── Modal Expandido do Projeto (Full-Width, Não Sidebar)
│       ├── TAB 1: Informações Gerais (consolidado)
│       ├── TAB 2: Etapas (Accordion 6 cards)
│       ├── TAB 3: Timeline (SOCIAL - comentários, uploads)
│       ├── TAB 4: Arquivos (Upload/Download/Versions)
│       ├── TAB 5: Auditoria (LOG Técnico - quem editou o quê)
│       └── TAB 6: Observações Rich (Notion-like)
│
└── ➕ Novo Projeto (Modal Centralizado)
    └── Formulário com Validação
```

---

## 1. DASHBOARD GERAL (KPI / OVERVIEW) - V3

### 1.1 Layout Compacto

```
┌─────────────────────────────────────────────────────────┐
│ Siplan Manager - Dashboard                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 KPIs (Mini Cards - 2 Rows)                          │
│  ┌────────┬────────┬────────┬────────┬────────┐        │
│  │ Total  │Críticos│Bloque. │Em Risco│Taxa %  │        │
│  │  47    │  5     │  3     │  12    │  62%   │        │
│  └────────┴────────┴────────┴────────┴────────┘        │
│                                                          │
│  📈 Gráficos Rápidos (2 Cols)                          │
│  ┌──────────────────┐ ┌──────────────────┐             │
│  │Dist. por Etapa   │ │Status Global     │             │
│  └──────────────────┘ └──────────────────┘             │
│                                                          │
│  [Gerenciar Projetos] [Novo Projeto]                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Mudança:** Dashboard apenas VISUAL + NAVEGAÇÃO. Não tira foco dos projetos.

---

## 2. GERENCIAR PROJETOS - CENTRALIZADO

### 2.1 Novo Layout de Cards (Ampliado & Detalhado)

**Estrutura do Card:**

```
┌──────────────────────────────────────────────────────────┐
│ ☐                                              ⋯          │ ← Checkbox & Menu
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Cartório Mogi-Mirim                     🟡 ATENÇÃO     │ ← Nome & Health
│  Orion PRO • Ticket: 696613                             │
│                                                          │
│  Pipeline Visual:  🟢→🔵→⚪→⚪→⚪→⚪               │ ← Progresso visual
│  Progresso: ▓▓░░░░░░░░ 35% (2 de 6 etapas)            │ ← Barra %
│                                                          │
│  Responsáveis: Alex Silva (Aderência) • João Infra     │ ← Current leads
│  Última Atualização: 26/11/2025 por Alex Silva         │
│  Próximo Follow-up: 26/11/2025 (VENCIDO) 🔴           │ ← Destaque crítico
│                                                          │
│  [Abrir Projeto] [Duplicar] [Arquivar] [Deletar]      │ ← Actions
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Espaçamento:** Cards ocupam 45-50% da tela em Grid, permitindo 2 por linha em desktop.

### 2.2 Visualizações Mantidas (com melhorias)

**Tabela Rica** - Colunas com Pipeline Visual visível
**Kanban** - Cards amplos entre colunas (Etapas)
**Calendário** - Timeline de datas importantes
**Gantt** - Duração de etapas por projeto

---

## 3. MODAL DO PROJETO (NOVO LAYOUT FULL-WIDTH)

### 3.1 Estrutura Geral

```
┌────────────────────────────────────────────────────────────────┐
│ ✕                                                              │
├────────────────────────────────────────────────────────────────┤
│  cartorio teste                         Orion TN • #600000    │ ← Header Fixo
├────────────────────────────────────────────────────────────────┤
│ [Dados] [Etapas] [Timeline] [Arquivos] [Auditoria] [Notas]  │ ← Tabs
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Conteúdo da TAB Selecionada - 90% da tela]                │
│                                                                │
│                                                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Modal:** Toma 90% da tela (não 50% em sidebar), com scroll interno por tab.

---

## 4. TAB 1: INFORMAÇÕES GERAIS (CONSOLIDADO)

### 4.1 Estrutura Simplificada (Grupos Colapsáveis)

#### Grupo A: Básicas
- Nome do Cliente (texto)
- Nº Ticket SAC (texto)
- Sistema (texto)
- Tipo de Implantação (select)
- Data de Criação (read-only)

#### Grupo B: Status & Visibilidade
- **Status Global** (display automático: 🟢/🟡/🔴)
- **Health Score** (display com badge)
- **Progresso Geral (%)** (barra visual)
- **Pipeline Visual** (6 dots, não editável)
- **Última Atualização** (read-only com nome)

#### Grupo C: Pessoas (Responsáveis)
- Líder do Projeto (texto)
- Contato Principal do Cliente (texto + email/telefone)
- Resp. Infra (texto)
- Resp. Aderência (texto)
- Resp. Conversão (texto)
- Resp. Implantação (texto)
- Resp. Pós-Impl (texto)

#### Grupo D: Datas Importantes (CONSOLIDADO)
- Data Início Previsto ↔ Data Término Previsto (range picker)
- Data Início Real ↔ Data Término Real (range picker)
- Próximo Follow-up (destacado em vermelho se vencido)

### 4.2 Design & Interação

- **Edit Inline:** Clicar = editar direto (sem modal)
- **Autosave Robusto:** Debounce 1s, retry 3x, feedback visual "Salvando..." → "✓ Salvo"
- **Indicadores:**
  - ✓ Sucesso salvo
  - ⚠️ Erro (mostrar motivo)
  - 🔄 Sincronizando com cloud
- **Campos Críticos:** Follow-up vencido com fundo vermelho suave

---

## 5. TAB 2: ETAPAS (ACCORDION - 6 CARDS)

### 5.1 Campos Base (Todos os Cards)

- **Status** (select: Não Iniciado, Em Andamento, Finalizado, Bloqueado)
- **Responsável** (texto)
- **Data de Início** ↔ **Data de Término** (range picker)
- **Observações** (textarea simples ou rich)
- **Último Update** (read-only timestamp)

### 5.2 Card 1: Análise de Infraestrutura

- Status, Responsável, Datas, Observações (base)
- **Motivo de Bloqueio** (select condicional se Status = Bloqueado)
- **Servidor Atual** (texto)
- **Servidor Necessário** (texto)
- **Infra Aprovada?** (checkbox)
- **Observações Técnicas** (rich text)

### 5.3 Card 2: Análise de Aderência

- Status, Responsável, Datas, Observações (base)
- **Gap de Produto?** (toggle)
  - Se SIM:
    - Descrição do Gap (textarea)
    - Ticket Dev (texto)
    - Prazo Dev (date picker)
    - Prioridade (select: Crítico, Alto, Médio, Baixo)
- **Análise Completa?** (checkbox)
- **Conformidade** (rich text)

### 5.4 Card 3: Preparação de Ambiente

- Status, Responsável, Datas, Observações (base)
- **Sistema Operacional** (texto: "Windows 2022, Ubuntu 20.04")
- **Data Real Disponibilização** (date picker)
- **Versão SO** (texto)
- **Aprovado Infra?** (checkbox)
- **Ambiente Teste Disponível?** (checkbox)
- **Checklist Preparação** (rich text com bullets)

### 5.5 Card 4: Conversão de Dados

- Status, Responsável, Datas, Observações (base)
- **Sistema de Origem** (texto: "Siplan, Control-M, SAP, etc")
- **Complexidade** (select: Baixa, Média, Alta, Muito Alta)
- **Qtd Registros** (number)
- **Volume (GB)** (number)
- **Ferramenta Conversão** (texto)
- **Homologação Concluída?** (checkbox)
- **Data Homologação** (date picker)
- **Desvios** (rich text)

### 5.6 Card 5: Implantação (Instalação & Treinamento)

- Status, Responsável, Datas, Observações (base)
- **Data Instalação** (date picker)
- **Tipo de Virada** (select: Fim Semana, Dia Útil, Feriado)
- **Hora Início Virada** ↔ **Hora Fim Virada** (time picker)
- **Data Início Treinamento** ↔ **Data Fim** (date picker)
- **Tipo Treinamento** (select: Presencial, Remoto, Híbrido)
- **Local Treinamento** (texto)
- **Qty Participantes** (number)
- **Feedback Cliente** (rich text)
- **Aceitação** (select: Aprovado, Com Ressalvas, Rejeitado)

### 5.7 Card 6: Pós-Implantação

- Status, Responsável, Datas, Observações (base)
- **Período Suporte (dias)** (number)
- **Data Fim Suporte** (date picker)
- **Benefícios Entregues** (rich text)
- **Problemas/Desafios** (rich text)
- **ROI Estimado** (texto)
- **Cliente Satisfeito?** (select: Muito Sat., Sat., Neutro, Insat.)
- **Recomendações** (rich text)
- **Follow-up Necessário?** (checkbox + date picker)

---

## 6. TAB 3: TIMELINE (SOCIAL - Nova Aba de Feed)

### 6.1 O Que é Timeline

**Timeline = Feed social do projeto.** Registra:
- Comentários dos usuários (com @mentions)
- Uploads de arquivos
- Mudanças em observações (quando editadas)
- Atualizações de status (quando feitas manualmente)

**NÃO registra:** Cada clique individual ou mudança de valor automática.

### 6.2 Interface

```
┌────────────────────────────────────────┐
│ Histórico de Atividades                │
├────────────────────────────────────────┤
│ Filtros: ☑ Logs ☑ Comentários ☑ Files│
│ Busca: [_________]                     │
├────────────────────────────────────────┤
│                                        │
│ 26/11 14:30 - Alex Silva               │ ← Comentário
│ "Gap identificado no módulo X"         │
│ [responder] [pin] [delete]              │
│                                        │
│ 25/11 10:00 - Sistema                  │ ← Upload log
│ Arquivo contrato.pdf enviado (2.1MB)   │
│ [baixar] [visualizar]                   │
│                                        │
│ 24/11 08:00 - Alex Silva               │ ← Status change
│ Mudou status para "Em Andamento"        │
│                                        │
│ [Carregar mais...]                      │
│                                        │
├────────────────────────────────────────┤
│ [Novo Comentário]                      │
│ ┌──────────────────────────────────┐   │
│ │ Escreva comentário ou mencione.. │   │
│ │ @mentions, #hashtags              │   │
│ └──────────────────────────────────┘   │
│ [Enviar] [Upload Arquivo]              │
│                                        │
└────────────────────────────────────────┘
```

### 6.3 Funcionalidades

- **@mentions:** @Bruno, @Alex (notificações)
- **Rich Text:** Bold, italic, links, code blocks
- **Inline Uploads:** Drag & drop direto no input
- **Respostas:** Thread de comentários
- **Reações:** Emoji reactions (👍, 🎉, etc)
- **Busca:** Filtrar por palavra-chave

---

## 7. TAB 4: ARQUIVOS (Gerenciador)

### 7.1 Layout

```
┌────────────────────────────────────────┐
│ Arquivos do Projeto                    │
│ Limite: 100MB por arquivo              │
├────────────────────────────────────────┤
│ [⬆️ Upload Arquivo] [📁 Nova Pasta]    │
├────────────────────────────────────────┤
│                                        │
│ 📄 contrato.pdf (2.1MB)                │
│   Enviado por Bruno em 26/11 14:00     │
│   [👁️] [⬇️] [⋯ menu]                  │
│   Versões: v1, v2 (anterior), v3       │
│                                        │
│ 📊 planilha-dados.xlsx (456KB)        │
│   Enviado por Alex em 25/11 10:30      │
│   [👁️] [⬇️] [⋯ menu]                  │
│   Versões: v1                          │
│                                        │
│ 📸 foto-ambiente.jpg (1.2MB)           │
│   Enviado por João em 24/11 08:00      │
│   [👁️] [⬇️] [⋯ menu]                  │
│   Versões: v1, v2 (anterior)           │
│                                        │
│ [Nenhum arquivo enviado ainda] ← se vazio
│                                        │
└────────────────────────────────────────┘
```

### 7.2 Funcionalidades

- **Upload Drag & Drop**
- **Visualização Inline** (PDF, imagens)
- **Histórico de Versões** (com datas, quem, tamanho)
- **Download Direto**
- **Deletar com Confirmação**
- **Busca por Nome**
- **Categorização** (Contract, Design, Testing, Other)

---

## 8. TAB 5: AUDITORIA (LOG TÉCNICO)

### 8.1 O Que é Auditoria

**Auditoria = Log técnico de TODAS as mudanças.** Registra:
- Quem editou? (user)
- O quê foi editado? (field name)
- Quando? (timestamp exato)
- Valor anterior? (old value)
- Novo valor? (new value)
- Origem da mudança? (manual vs automation)

**SEPARADA de Timeline:** Timeline é social, Auditoria é compliance.

### 8.2 Interface

```
┌─────────────────────────────────────────────────┐
│ Logs de Auditoria                               │
│ (Histórico técnico de todas as alterações)      │
├─────────────────────────────────────────────────┤
│ Filtros: [Campo ▼] [Usuário ▼] [Data ▼]       │
│ Busca: [_______]                                │
├─────────────────────────────────────────────────┤
│                                                 │
│ 26/11 14:35:22 - Alex Silva                     │
│ status (Análise de Aderência)                   │
│ "Em Andamento" → "Finalizado"                  │
│ [ver detalhes]                                  │
│                                                 │
│ 26/11 14:30:15 - Bruno Fernandes               │
│ observations (Análise de Aderência)             │
│ "Gap encontrado..." → "Gap encontrado em..."   │
│ [comparar versões]                              │
│                                                 │
│ 25/11 10:00:00 - Sistema                        │
│ file_upload                                     │
│ contrato.pdf (2.1MB)                            │
│                                                 │
│ 24/11 08:15:44 - João Infra                     │
│ responsible (Infraestrutura)                    │
│ "Sem responsável" → "João Infra"               │
│                                                 │
│ [Carregar mais...]                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 8.3 Funcionalidades

- **Filtros Avançados:** Por campo, usuário, data range
- **Busca Textual:** Campo + valor
- **Comparação de Versões:** Ver antes/depois lado a lado
- **Exportar Log:** CSV/PDF para compliance
- **Rastreabilidade Completa:** IP, navegador (opcional)

---

## 9. TAB 6: OBSERVAÇÕES RICH (NOTION-LIKE)

### 9.1 O Que é Esta Aba

**Observações Rich = Bloco de anotações customizável tipo Notion.**

Permite:
- **Texto Rico** (Bold, Italic, Underline, Strikethrough)
- **Blocos:** Heading, Paragraph, Callout, Divider
- **Listas:** Bullets, Numbering, Checklist
- **Embeds:** Links, Imagens, Vídeos
- **Mentions:** @Bruno, @Alex
- **Hashtags:** #urgent, #client-feedback
- **Backlinks:** Link para outro projeto

### 9.2 Interface

```
┌─────────────────────────────────────────────────┐
│ Notas & Observações                             │
│ (Bloco de anotações tipo Notion)                │
├─────────────────────────────────────────────────┤
│                                                 │
│ [Toolbar] B I U S ~ ≡ • 1. H+ " | @ #          │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │ # Projeto cartório teste                   │ │
│ │                                             │ │
│ │ ## Resumo                                   │ │
│ │ Implantação do Orion PRO com customização. │ │
│ │                                             │ │
│ │ > ⚠️ IMPORTANTE: Cliente solicitou módulo  │ │
│ │ de Protesto customizado (@Bruno verifica)  │ │
│ │                                             │ │
│ │ ## Checklist de Pendências                 │ │
│ │ ☑ Infraestrutura aprovada                  │ │
│ │ ☐ Gap Dev em progresso (ETA: 02/12)       │ │
│ │ ☐ Ambiente pronto para testes              │ │
│ │                                             │ │
│ │ ### Última Ação                             │ │
│ │ 26/11: Alex iniciou Aderência e encontrou  │ │
│ │ gap no módulo X. Ticket criado (DEV-1234)  │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Última edição: 26/11 14:30 por Alex Silva      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 9.3 Funcionalidades

- **Toolbar** completa (texto, listas, embeds)
- **Markdown Support** (/bold, /italic, /heading)
- **Drag & Drop** para reordenar blocos
- **@mentions** com notificações
- **#hashtags** para categorizar notas
- **Versionamento** de anotações
- **Colaborativo** (múltiplos editores simultâneos)
- **AI Assist** (summarize, translate, expand)

---

## 10. AUTOSAVE ROBUSTO - IMPLEMENTAÇÃO CORRETA

### 10.1 Arquitetura

```typescript
// AutoSave Flow Correto

interface AutoSaveConfig {
  debounceMs: 1000;           // Aguarda 1s sem digitação
  maxRetries: 3;              // Tenta 3x em caso de erro
  retryDelayMs: 500;          // Aguarda 500ms entre tentativas
  offlineQueueing: true;      // Fila mudanças offline
  syncInterval: 5000;         // Sync cada 5s com Cloud
  conflictResolution: "latest-wins"; // Em caso de conflito
}

interface SaveState {
  status: "idle" | "saving" | "success" | "error" | "syncing";
  message?: string;           // "Salvando...", "Salvo ✓", "Erro: conexão"
  lastSavedAt?: datetime;
  nextSyncAt?: datetime;
  conflictDetected?: boolean;
}
```

### 10.2 Feedback Visual (Sempre Visível)

```
Campo sendo editado:
┌────────────────────────────────┐
│ [Campo editável]               │ → 🔄 Salvando...
└────────────────────────────────┘

Após debounce de 1s:
┌────────────────────────────────┐
│ [Salvo ✓ 26/11 14:35]          │ → Verde, timestamp
└────────────────────────────────┘

Em caso de erro:
┌────────────────────────────────┐
│ [⚠️ Erro: Sem conexão]         │ → Vermelho, motivo
│ [Tentar novamente] [Descartar] │ → Opções
└────────────────────────────────┘
```

### 10.3 Implementação

```typescript
// hooks/useAutoSave.ts

export function useAutoSave<T extends Record<string, any>>(
  initialData: T,
  onSave: (data: T) => Promise<void>,
  config: Partial<AutoSaveConfig> = {}
) {
  const [data, setData] = useState(initialData);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const debouncedSave = useCallback(
    debounce(async (newData: T) => {
      setSaveState({ status: "saving", message: "Salvando..." });
      
      let lastError: Error | null = null;
      for (let i = 0; i < config.maxRetries!; i++) {
        try {
          await onSave(newData);
          setSaveState({
            status: "success",
            message: `✓ Salvo em ${new Date().toLocaleTimeString()}`,
            lastSavedAt: new Date()
          });
          break;
        } catch (error) {
          lastError = error as Error;
          if (i < config.maxRetries! - 1) {
            await new Promise(r => setTimeout(r, config.retryDelayMs));
          }
        }
      }
      
      if (lastError) {
        setSaveState({
          status: "error",
          message: `⚠️ Erro: ${lastError.message}`
        });
      }
    }, config.debounceMs),
    [onSave, config]
  );

  const handleChange = (field: keyof T, value: any) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    debouncedSave(newData);
  };

  return { data, saveState, handleChange };
}
```

### 10.4 Casos de Sucesso

✅ Usuário digita → 1s depois salva automático
✅ Campo perde foco → salva imediatamente
✅ Offline → fila localmente, sincroniza quando online
✅ Erro de rede → retry 3x com backoff exponencial
✅ Conflito (edit simultâneo) → merge inteligente ou notificação
✅ Feedback visual → sempre mostra status atual

---

## 11. PIPELINE VISUAL NO CARD DO PROJETO

### 11.1 Localização

**Removido de:** TAB "Dados do Projeto" (redundante)
**Movido para:** Card do projeto em "Gerenciar Projetos"

### 11.2 Display

```
┌────────────────────────────────────┐
│ Cartório Mogi-Mirim        🟡 ATENÇÃO
│ Orion PRO • #696613
│
│ Pipeline Visual:
│ 🟢 Infra  →  🔵 Aderência  →  ⚪ Ambiente  →  ⚪ Conversão  →  ⚪ Impl  →  ⚪ Pós
│
│ Progresso: ▓▓░░░░░░░░ 35% (2 de 6)
│
│ Responsáveis: Alex Silva (Aderência) • João Infra
│ Última Atualização: 26/11 por Alex Silva
│ Próximo Follow-up: 26/11 🔴 VENCIDO
│
│ [Abrir] [Duplicar] [Arquivar]
│
└────────────────────────────────────┘
```

**Cores do Pipeline:**
- 🟢 Completo (Done)
- 🔵 Em Andamento (In Progress)
- 🟡 Aguardando (Blocked)
- ⚪ Não Iniciado (Todo)

---

## 12. REMOÇÃO DE SEÇÕES REDUNDANTES

### ❌ Removidas

1. **"Dados do Contrato / Negócio"**
   - Informação não essencial para gestão de implantação
   - Pode ser adicionada em notas customizadas se necessário
   - Reduz clutter visual

2. **"Datas Críticas" (Seção separada)**
   - Consolidada em "Informações Gerais"
   - Datas mostradas inline (Início ↔ Fim Previsto, Real)
   - Próximo Follow-up destacado no card principal

### ✅ Mantidas & Reorganizadas

- Informações Gerais (consolidado, sem redundância)
- Etapas (6 cards de acordo com necessidade)
- Timeline (social, feed de atividades)
- Arquivos (upload/download)
- Auditoria (compliance log)
- Observações Rich (Notion-like)

---

## 13. INDICADORES VISUAIS DE RISCO POR PROJETO

### 13.1 Micro-indicadores no Card

```
┌────────────────────────────────────┐
│ Cartório Mogi-Mirim       🟡 ATENÇÃO
│ Orion PRO • #696613
│
│ ⚠️ Follow-up Vencido (26/11)       ← Destaque em vermelho
│ 🔴 Bloqueado há 5 dias             ← Destaque em vermelho
│ 👤 Sem atualização há 3 dias       ← Destaque em amarelo
│
│ Pipeline: 🟢→🔵→⚪→⚪→⚪→⚪
│ Progresso: ▓▓░░░░░░░░ 35%
│
└────────────────────────────────────┘
```

### 13.2 Health Score

**Cálculo automático:**
- 🟢 OK: Progresso >50%, Follow-up não vencido, sem bloqueios > 7 dias
- 🟡 Atenção: Progresso 25-50% OU Follow-up vencido < 3 dias OU bloqueado < 7 dias
- 🔴 Crítico: Progresso <25% OU Follow-up vencido > 3 dias OU bloqueado > 7 dias

---

## 14. ESTRUTURA DE DADOS V3 SIMPLIFICADA

```typescript
// types/Project.ts V3

export interface Project {
  // Básicos
  id: string;
  clientName: string;
  ticketNumber: string;
  systemType: string;
  implantationType: "new" | "migration_siplan" | "migration_competitor" | "upgrade";
  
  // Status
  healthScore: "ok" | "warning" | "critical";
  globalStatus: "todo" | "in-progress" | "done" | "blocked" | "archived";
  overallProgress: number; // 0-100
  
  // Pessoas
  projectLeader: string;
  clientPrimaryContact: string;
  clientEmail?: string;
  clientPhone?: string;
  responsibleInfra: string;
  responsibleAdherence: string;
  responsibleConversion: string;
  responsibleImplementation: string;
  responsiblePost: string;
  
  // Datas (Consolidado)
  startDatePlanned?: datetime;
  endDatePlanned?: datetime;
  startDateActual?: datetime;
  endDateActual?: datetime;
  nextFollowUpDate?: datetime;
  createdAt: datetime;
  lastUpdatedAt: datetime;
  lastUpdatedBy: string;
  
  // Estágios
  stages: {
    infra: Stage;
    adherence: Stage;
    environment: Stage;
    conversion: Stage;
    implementation: Stage;
    post: Stage;
  };
  
  // Dados Sociais
  timeline: TimelineEvent[];
  auditLog: AuditEntry[];
  files: ProjectFile[];
  
  // Notas Rich
  notes: RichContent;
  
  // Metadados
  tags: string[];
  priority: "critical" | "high" | "normal" | "low";
  customFields?: Record<string, any>;
}

export interface Stage {
  status: "todo" | "in-progress" | "done" | "blocked";
  responsible: string;
  startDate?: datetime;
  endDate?: datetime;
  observations: string;
  lastUpdatedAt: datetime;
  lastUpdatedBy: string;
  // Campos específicos da etapa (via spreads)
  ...stageSpecificFields
}

export interface RichContent {
  id: string;
  projectId: string;
  blocks: ContentBlock[];
  lastEditedBy: string;
  lastEditedAt: datetime;
}

export interface ContentBlock {
  id: string;
  type: "heading" | "paragraph" | "list" | "callout" | "divider" | "checkbox" | "embed";
  content: string;
  metadata?: Record<string, any>;
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  type: "comment" | "file_upload" | "status_change" | "mention";
  author: string;
  authorName: string;
  message?: string;
  timestamp: datetime;
  visibility: "public" | "archived";
}

export interface AuditEntry {
  id: string;
  projectId: string;
  author: string;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: datetime;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: datetime;
  versions: FileVersion[];
}

export interface FileVersion {
  version: number;
  url: string;
  uploadedAt: datetime;
  uploadedBy: string;
}
```

---

## 15. IDEIAS AGREGADORAS PARA VISIBILIDADE & INTERATIVIDADE

### Sugestões de Features Avançadas


#### 2. **Quick Filters** (Sidebar Sticky)
- Botões rápidos: "Críticos", "Bloqueados", "Vencidos", "Meus Projetos"
- Salva estado ao trocar visualização
- Atalhos de teclado (C = críticos, B = bloqueados)

#### 3. **Smart Notifications**
- Follow-up vencido → notificação em tempo real
- Projeto bloqueado > 5 dias → reminder diário
- Novo comentário → @mention notification


#### 6. **Badges de Progresso**
- "🎉 Projeto 50% concluído!"
- "⚡ 5 dias sem atualização"
- "✨ Novo responsável atribuído"



---

## 16. MAPA DE NAVEGAÇÃO MENTAL V3

```
ENTRADA (Siplan Manager)
│
├─→ 📊 Dashboard (Visão Geral)
│   └─→ KPIs + Gráficos + Link para Gerenciar
│
├─→ 📋 Gerenciar Projetos (MAIN VIEW - CENTRALIZADO)
│   │
│   ├─→ Filtros + Busca + Bulk Edit (Top)
│   │
│   ├─→ Grid/Tabela/Kanban/Calendário (Centro)
│   │   └─→ Cards Amplos & Detalhados
│   │       ├─ Nome + Sistema + Ticket
│   │       ├─ Pipeline Visual (6 dots)
│   │       ├─ Health + Status
│   │       ├─ Responsáveis
│   │       ├─ Last Update + Follow-up
│   │       └─ Quick Actions
│   │
│   └─→ Click Card = Modal Full-Width
│       │
│       ├─→ TAB 1: Informações Gerais
│       │   └─ Básicas + Status + Pessoas + Datas
│       │
│       ├─→ TAB 2: Etapas (Accordion)
│       │   └─ 6 cards com campos específicos
│       │
│       ├─→ TAB 3: Timeline (SOCIAL)
│       │   └─ Comentários + Uploads + Mentions
│       │
│       ├─→ TAB 4: Arquivos (Upload/Download)
│       │   └─ Gerenciar arquivos + versões
│       │
│       ├─→ TAB 5: Auditoria (LOG TÉCNICO)
│       │   └─ Quem editou o quê, quando, valores
│       │
│       └─→ TAB 6: Observações Rich (NOTION-LIKE)
│           └─ Bloco de anotações customizável
│
└─→ ➕ Novo Projeto (Modal Centralizado)
    └─ Formulário com validação
```

---

## 17. CRITÉRIOS DE SUCESSO V3

✅ **Transparência**
- Cada projeto mostra status principal sem necessidade de abrir
- Pipeline, health, follow-up, responsáveis visíveis imediatamente
- Menos de 2 cliques para qualquer ação

✅ **Autosave Robusto**
- Feedback visual sempre presente
- Retry automático em erro
- Sincronização com cloud confiável
- Histórico completo em auditoria

✅ **Interatividade Notion-like**
- Rich text em observações
- Drag & drop entre blocos
- @mentions e #hashtags
- Checklist e callouts

✅ **Distinção Clara Timeline vs Auditoria**
- Timeline = social (comentários, uploads)
- Auditoria = técnico (todos os edits, valores anteriores/novos)

✅ **Visibilidade Máxima**
- Indicadores de risco visuais
- Nenhum projeto "invisível"
- Alertas para follow-ups vencidos
- Última atualização sempre visível

---

## 18. PROMPT PARA LOVABLE V3 (COPIAR/COLAR)

```
Você é um Expert em Full-Stack Development e UX/UI Design.

RECONSTRUIR Siplan Manager para v3.0 com FOCO EM TRANSPARÊNCIA & INTERATIVIDADE.

MUDANÇAS CRÍTICAS:
1. ❌ Remover sidebar (drawer lateral)
2. ✅ Visualização CENTRALIZADA & FULL-WIDTH
3. ✅ Cards de projeto AMPLOS (45-50% tela)
4. ✅ Pipeline Visual NO CARD (não em "Dados do Projeto")
5. ✅ Modal do projeto FULL-WIDTH (90% tela)
6. ✅ Autosave ROBUSTO com retry logic
7. ✅ Timeline ≠ Auditoria (social vs technical)
8. ✅ TAB 6: Observações Rich (tipo Notion)
9. ✅ Remover "Dados do Contrato" e "Datas Críticas" (consolidar)
10. ✅ Indicadores de risco visuais por projeto

TABS DO MODAL (6 total):
1. Informações Gerais (consolidado)
2. Etapas (6 cards accordion)
3. Timeline (SOCIAL - comentários, uploads)
4. Arquivos (upload, download, versions)
5. Auditoria (LOG TÉCNICO - mudanças, quem, quando, valores)
6. Observações Rich (Notion-like: text, bullets, checklists, embeds)

AUTOSAVE CORRETO:
- Debounce 1s
- Retry 3x em erro
- Feedback visual: "Salvando..." → "✓ Salvo" ou "⚠️ Erro"
- Sincronização com Lovable Cloud
- Versionamento completo

VISIBILIDADE:
- Pipeline visual em cada card
- Health score automático
- Follow-up destacado (vermelho se vencido)
- Última atualização + responsável sempre visíveis
- Indicadores de bloqueio/risco

INTERATIVIDADE:
- Rich text em observações (markdown, embeds, mentions)
- Drag & drop para reordenar blocos
- @mentions com notificações
- #hashtags para categorizar
- Checklist interativo

STACK:
- React + Vite + TypeScript
- Tailwind CSS + Shadcn UI
- Zustand (estado)
- TanStack Query (async)
- React Rich Text Editor (observações)
- date-fns (datas)
- Recharts (gráficos)

USE DATA STRUCTURE DA SEÇÃO 14 DO PROMPT V3.
GERAR 100% FUNCIONAL, PRODUCTION-READY.
```

---

## 19. MUDANÇAS VISUAIS ANTES & DEPOIS

### Antes (V2)

❌ Drawer lateral (50% tela)
❌ Pipeline só em "Dados do Projeto"
❌ Autosave intermitente
❌ Timeline misturada com Auditoria
❌ Sem diferença clara
❌ Observações são textareas simples
❌ Muitas seções redundantes
❌ Cards pequenos no dashboard

### Depois (V3)

✅ Modal centralizado (90% tela)
✅ Pipeline visível em cada card
✅ Autosave robusto com retry
✅ Timeline separada de Auditoria
✅ Timeline = social, Auditoria = técnico
✅ Observações Rich (Notion-like)
✅ Estrutura consolidada & clara
✅ Cards amplos e informativos

---

## 20. IMPLEMENTAÇÃO POR FASES

### Fase 1: UX Core (1 sprint)
1. Remover sidebar
2. Implementar grid/tabela centralizada
3. Novo design de cards
4. Pipeline visual em card

### Fase 2: Data & Autosave (1 sprint)
1. Refatorar estrutura de dados
2. Implementar autosave com retry
3. Consolidar seções redundantes
4. Separar Timeline vs Auditoria

### Fase 3: Interatividade (1-2 sprints)
1. Rich text editor para observações
2. @mentions e #hashtags
3. Drag & drop em notas
4. Notificações em tempo real

### Fase 4: Polish & Features (1 sprint)
1. Indicadores visuais avançados
2. Quick filters & atalhos
3. Exportação inteligente
4. AI Assist (opcional)

---

**FIM DO PROMPT MASTER V3.0**

Este documento redefine Siplan Manager como plataforma CENTRADA EM PROJETOS com máxima transparência e interatividade. 🚀
