# PROMPT MESTRE AVANÇADO - Siplan Manager v2.0

## Reestruturação Completa para Enterprise-Grade

**Versão:** 2.0 (Enterprise)
**Objetivo:** Transformar Siplan Manager em plataforma robusta, equiparada ao Microsoft Lists, com dashboards inteligentes, filtros avançados, bulk operations, e gestão completa de projetos de implantação.

---

## SUMÁRIO EXECUTIVO

Esta versão 2.0 reestrutura completamente a plataforma com:

1. **Dashboard Principal (KPI)** - Indicadores agregados de toda a plataforma
2. **Dashboard por Projeto** - Indicadores específicos e visuais por projeto
3. **Seção "Dados do Projeto"** - Central de informações críticas do projeto
4. **Filtros Avançados** - Multidimensionais, persistentes, salvos
5. **Bulk Operations** - Edição em lote de múltiplos projetos
6. **Campos Expandidos** - Cobertura total de campos do Microsoft Lists
7. **Timeline Automática Completa** - Registro de TODAS as ações
8. **Visualizações Múltiplas** - Tabela, Kanban, Calendário, Gantt (roadmap)
9. **Exportação & Relatórios** - PDF, Excel, CSV
10. **Integração Lovable Cloud** - Sync, backup, auditoria

---

## ARQUITETURA DA PLATAFORMA V2.0

### Estrutura de Navegação

```text
Siplan Manager
├── 📊 Dashboard Geral (Home/Overview)
│   ├── KPIs Globais (Projetos Ativos, Críticos, Bloqueados, etc)
│   ├── Gráficos (Distribuição por Etapa, Timeline, Tendências)
│   ├── Filtros Globais & Filtros Salvos
│   └── Acesso Rápido (Projetos Críticos, Próximos Follow-ups)
│
├── 📋 Gerenciar Projetos (Main View)
│   ├── Visualização (Tabela Rica / Kanban / Calendário)
│   ├── Filtros Avançados (Multidimensionais, Salvos)
│   ├── Bulk Edit (Seleção múltipla + edição em lote)
│   ├── Busca Global (Busca por qualquer campo)
│   └── Exportar (PDF, Excel, CSV)
│
├── ➕ Novo Projeto (Modal)
│   └── Formulário com Validação Completa
│
├── 📁 Projeto Detalhado (Drawer)
│   ├── 1️⃣ TAB "Dados do Projeto" (NOVA SEÇÃO - Central de Infos)
│   │   ├── Informações Gerais
│   │   ├── Contatos & Responsáveis
│   │   ├── Datas Críticas
│   │   ├── Status Global & Health Score
│   │   └── Quick Actions
│   │
│   ├── 2️⃣ TAB "Etapas" (Accordion com 6 Cards)
│   │   ├── Análise de Infraestrutura
│   │   ├── Análise de Aderência
│   │   ├── Preparação de Ambiente
│   │   ├── Conversão de Dados
│   │   ├── Implantação (Instalação & Treinamento)
│   │   └── Pós-Implantação
│   │
│   ├── 3️⃣ TAB "Timeline" (Histórico Completo)
│   │   ├── Feed Automático de Eventos
│   │   ├── Comentários com Timestamps
│   │   ├── Upload de Arquivos
│   │   └── Filtros (Logs, Comentários, Uploads)
│   │
│   ├── 4️⃣ TAB "Arquivos" (Gerenciador)
│   │   ├── Upload/Download
│   │   ├── Categorização
│   │   └── Histórico de Versões
│   │
│   └── 5️⃣ TAB "Logs de Auditoria" (NOVO)
│       ├── Quem Editou O Quê
│       ├── Quando
│       └── Valores Anteriores vs Novos
│
└── ⚙️ Configurações (Settings)
    ├── Preferências de Visualização
    ├── Filtros Salvos
    ├── Exportações Agendadas
    └── Integrações
```

---

## 1. DASHBOARD GERAL (KPI / OVERVIEW)

### 1.1 Layout e Componentes

**Estrutura:**

```text
┌─────────────────────────────────────────────────────────────┐
│ Siplan Manager - Dashboard                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 KPIs GLOBAIS (Cards)                                    │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐        │
│  │ Total │ │Críti- │ │Bloque- │ │Próxim.│ │Taxa de│        │
│  │Projetos│ │ cos  │ │ados   │ │Follow-│ │Conclusão│      │
│  │   47   │ │  5   │ │  3    │ │   12  │ │  62%   │        │
│  │ 🟢    │ │ 🔴  │ │ 🔴   │ │ 🟡  │ │ 📈   │        │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘        │
│                                                              │
│  📈 GRÁFICOS & INDICADORES                                 │
│  ┌─────────────────────┐  ┌──────────────────────┐         │
│  │ Distribuição por    │  │ Projetos por Status  │         │
│  │ Etapa (Pie Chart)   │  │ (Timeline/Burndown)  │         │
│  └─────────────────────┘  └──────────────────────┘         │
│                                                              │
│  ⚠️  ALERTAS CRÍTICOS (List)                              │
│  • Projeto "X" bloqueado há 15 dias                        │
│  • 3 follow-ups vencidos                                    │
│  • 2 etapas sem atualização > 7 dias                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 KPIs Exibidos

- **Total de Projetos Ativos**
- **Projetos em Risco (🟡 Warning)**
- **Projetos Críticos (🔴 Critical)**
- **Projetos Bloqueados**
- **Próximos Follow-ups (< 3 dias)**
- **Taxa de Conclusão Global (%)**
- **Tempo Médio por Etapa**
- **Tempo Médio de Implantação (Total)**
- **Cartórios com Maior Atividade**
- **Última Atualização de Cada Etapa (global)**

### 1.3 Gráficos e Visualizações

1. **Pie Chart** - Distribuição de projetos por etapa (quantos em cada stage)
2. **Bar Chart** - Status dos projetos (Todo, Em Andamento, Finalizado, Bloqueado)
3. **Line Chart** - Tendência temporal (projetos criados vs finalizados por semana)
4. **Burndown Chart** - Projetos a cumprir vs Projetos finalizados
5. **Heatmap** - Atividade por dia da semana (identificar padrões)
6. **Table** - Top 10 Projetos por (Mais Antigos, Mais Atualizados, Maior Risco)

### 1.4 Filtros Globais e Filtros Salvos

**Filtros Disponíveis:**

- Por Sistema (Orion PRO, Orion TN, Orion REG, etc)
- Por Status Global (Crítico, Atenção, Em Dia)
- Por Etapa Atual (Infra, Aderência, Ambiente, Conversão, Implantação, Pós)
- Por Responsável Principal
- Por Data de Criação (Range)
- Por Data da Última Atualização (Range)
- Por Bloqueador (Sim/Não, Tipo de Bloqueador)
- Personalizado (Combinação de qualquer campo)

**Filtros Salvos:**

- Permitir salvar combinações de filtros com nome customizável
- "Meus Projetos Críticos", "Aguardando Dev", "Prontos para Implantação", etc
- Exibir como abas ou menu dropdown
- Permitir editar/deletar filtros salvos

---

## 2. SEÇÃO "DADOS DO PROJETO" (TAB 1 - NOVO)

Esta é a **central de informações críticas** do projeto. Deve ser a primeira aba ao abrir um projeto.

### 2.1 Campos Incluídos (Organizados por Grupo)

#### Grupo A: Informações Gerais

- **Nome do Cliente** (texto livre)
- **Nº Ticket SAC** (texto)
- **Sistema/Produto** (texto livre: Orion PRO, Orion TN, Orion REG, Custom)
- **Tipo de Implantação** (select: Novo Cliente, Migração Siplan, Migração Concorrente, Atualização)
- **Data de Criação** (date picker, read-only)
- **Status Global** (display automático: Crítico/Atenção/Em Dia)
- **Health Score** (display automático com badge)
- **Progresso Geral (%)** (calculado automaticamente: quantas etapas finalizadas / 6 * 100)

#### Grupo B: Contatos & Responsáveis

- **Líder do Projeto** (texto livre)
- **Contato Principal do Cliente** (texto livre: Nome + Email/Telefone)
- **Responsável por Infra** (texto livre)
- **Responsável por Aderência** (texto livre)
- **Responsável por Conversão** (texto livre)
- **Responsável por Implantação** (texto livre)
- **Responsável por Pós-Impl** (texto livre)

#### Grupo C: Datas Críticas

- **Data de Início Prevista** (date picker)
- **Data de Término Prevista** (date picker)
- **Data Real de Início** (date picker)
- **Data Real de Término** (date picker)
- **Próximo Follow-up** (date picker, destacado em vermelho se vencido)
- **Última Atualização** (datetime, read-only com nome do usuário)

#### Grupo D: Dados do Contrato / Negócio

- **Valor do Contrato** (currency field, opcional)
- **Forma de Pagamento** (select: À Vista, Parcelado, Outros)
- **Descrição do Projeto** (textarea longa: escopo, observações gerais)
- **Restrições/Considerações Especiais** (textarea: compatibilidades, ambiente, etc)

#### Grupo E: Pipeline Visual & Resumo

- **Pipeline Visual** (6 dots coloridos, não editável, automático)
- **Resumo de Status Atual** (card formatado com cada etapa e seu status)
- **Última Ação Registrada** (texto + data/hora, read-only)

### 2.2 Design & Interação

- **Cards por Grupo:** Cada grupo em um card colapsável/expandível
- **Edit Inline:** Clicar em campo para editar diretamente (sem modal)
- **Salvamento Automático:** Debounce de 1s, feedback visual "Salvando..." → "Salvo!"
- **Indicadores Visuais:**
  - Campos obrigatórios com asterisco *
  - Campo modificado com borda dourada por 2s
  - Campos críticos (follow-up vencido) com fundo vermelho suave
- **Quick Actions Button (Floating):**
  - "Duplicar Projeto", "Exportar Relatório", "Enviar para Revisão", "Marcar como Finalizado"

---

## 3. TABS DO PROJETO - ESTRUTURA COMPLETA

### 3.1 TAB "Etapas" (Anterior, Mantém Estrutura)

Accordion com 6 cards colapsáveis. **Cada card agora possui:**

#### Campos Base (Todos os Cards)

- **Status** (select: Não Iniciado, Em Andamento, Finalizado, Bloqueado)
- **Responsável** (texto livre)
- **Data de Início** (date picker)
- **Data de Término** (date picker)
- **Observações** (textarea)
- **Último Update By / Timestamp** (display read-only)

#### Card 1: Análise de Infraestrutura

- Status, Responsável, Datas, Observações (base)
- **Motivo de Bloqueio** (select condicional: "Aguardando Compra Servidor", "Upgrade SO Necessário", "Rede Instável", "Conflito com Sistema Legado", "Cliente não Disponibilizou Acesso", "Outro")
- **Servidor Atualmente em Uso** (texto)
- **Servidor Necessário** (texto: especificações)
- **Infraestrutura Aprovada?** (checkbox)
- **Observações Técnicas** (textarea adicional)

#### Card 2: Análise de Aderência

- Status, Responsável, Datas, Observações (base)
- **Gap de Produto Identificado?** (toggle Yes/No)
- **Descrição do Gap** (textarea, visível se toggle = Yes)
- **Ticket Dev** (texto, visível se toggle = Yes)
- **Prazo Estimado Dev** (date picker, visível se toggle = Yes)
- **Prioridade Gap** (select: Crítico, Alto, Médio, Baixo, visível se toggle = Yes)
- **Análise Completa?** (checkbox)
- **Conformidade com Padrões** (textarea: verificações realizadas)

#### Card 3: Preparação de Ambiente

- Status, Responsável, Datas, Observações (base)
- **Sistema Operacional** (texto livre: "Windows 2019, Ubuntu 20.04", etc)
- **Data Real de Disponibilização** (date picker)
- **Versão do SO** (texto adicional)
- **Aprovado pela Infraestrutura?** (checkbox)
- **Ambiente de Teste Disponível?** (checkbox)
- **Checklist de Preparação** (textarea: itens validados)

#### Card 4: Conversão de Dados

- Status, Responsável, Datas, Observações (base)
- **Sistema de Origem** (texto livre: "Siplan", "Control-M", "Argon", "Alkasoft", "SAP", "Custom")
- **Estimativa de Complexidade** (select: Baixa, Média, Alta, Muito Alta)
- **Quantidade de Registros** (number field)
- **Volume de Dados (GB)** (number field)
- **Ferramenta de Conversão Utilizada** (texto)
- **Homologação Concluída?** (checkbox)
- **Data Homologação** (date picker)
- **Desvios Identificados** (textarea)

#### Card 5: Implantação (Instalação e Treinamento)

- Status, Responsável, Datas, Observações (base)
- **Data de Instalação Remota** (date picker)
- **Tipo de Virada** (select: Fim de Semana, Dia Útil, Feriado, Custom)
- **Hora de Início Virada** (time picker)
- **Hora de Término Virada** (time picker)
- **Data de Início Treinamento** (date picker)
- **Data de Término Treinamento** (date picker)
- **Tipo de Treinamento** (select: Presencial, Remoto, Híbrido)
- **Local do Treinamento** (texto)
- **Quantidade de Participantes** (number)
- **Feedback do Cliente** (textarea)
- **Aceitação da Implantação** (select: Aprovado, Aprovado com Ressalvas, Rejeitado)

#### Card 6: Pós-Implantação

- Status, Responsável, Datas, Observações (base)
- **Período de Suporte (dias)** (number)
- **Data Fim Suporte** (date picker)
- **Principais Benefícios Entregues** (textarea)
- **Problemas/Desafios Encontrados** (textarea)
- **ROI Estimado** (texto)
- **Cliente Satisfeito?** (select: Muito Satisfeito, Satisfeito, Neutro, Insatisfeito)
- **Recomendações para Próximos Projetos** (textarea)
- **Follow-up Necessário?** (checkbox + date picker se sim)

### 3.2 TAB "Timeline" (Histórico Completo)

### Feed de Eventos Automáticos e Comentários

#### Tipos de Eventos Registrados Automaticamente

1. **Status Change:** "Status de Infraestrutura alterado de [X] para [Y] por [Usuário] em [Data/Hora]"
2. **Field Change:** "[Campo] alterado de [Valor Antigo] para [Valor Novo]"
3. **File Upload:** "[Arquivo.pdf] enviado por [Usuário] em [Data/Hora] - [Tamanho]"
4. **Comment Added:** Comentário do usuário com timestamp
5. **Project Created:** "Projeto criado por [Usuário] em [Data/Hora]"
6. **Project Status Changed:** "Status global mudou para [Status]"
7. **Bulk Edit:** "Mudança em lote: [X campos] alterados por [Usuário]"

#### Interface da Timeline

- **Filtros:** Logs, Comentários, Uploads (checkboxes)
- **Busca:** Buscar por palavra-chave no histórico
- **Ordenação:** Mais recentes, Mais antigos
- **Scroll Infinito:** Carregar mais eventos ao scrollar
- **Hover:** Mostrar tooltip com detalhes da mudança
- **Exportar Timeline:** Opção para exportar como PDF/CSV

#### Input de Comentário

- Textarea com suporte a markdown (bold, italics, links)
- @mentions de usuários (ex: @Bruno, @Alex)
- Upload de imagem/arquivo inline
- Botão "Enviar" ou Enter + Cmd/Ctrl para enviar

---

## 4. GERENCIAR PROJETOS - VISUALIZAÇÕES MÚLTIPLAS

### 4.1 Visualização "Tabela Rica" (Padrão)

**Colunas Customizáveis:**

- Cliente (nome + sistema)
- Pipeline Visual (6 dots)
- Status Global (🟢🟡🔴)
- Próximo Follow-up (data com destaque se vencido)
- Última Atualização (data + usuário)
- Etapa Atual (texto descritivo)
- Responsável Atual (texto)
- Progresso (%) (barra visual)
- Ações (botões: Editar, Duplicar, Deletar)

**Funcionalidades:**

- Ordenar por qualquer coluna (asc/desc)
- Redimensionar colunas
- Selecionar/Deselecionar colunas para exibir
- Salvar preferência de colunas (localStorage)
- Checkbox ao início de cada linha para seleção múltipla (Bulk Edit)

### 4.2 Visualização "Kanban" (Board View)

### Colunas = Etapas do Projeto

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   INFRA      │ │  ADERÊNCIA   │ │ CONVERSÃO    │ │ IMPLANTAÇÃO  │
│ (12 proj)    │ │  (8 proj)    │ │  (15 proj)   │ │  (6 proj)    │
│              │ │              │ │              │ │              │
│ [Card]       │ │ [Card]       │ │ [Card]       │ │ [Card]       │
│ Mogi-Mirim   │ │ Itu          │ │ Campinas     │ │ São Paulo    │
│ 🟢 Em Dia    │ │ 🟡 Atenção   │ │ 🟢 Em Dia    │ │ 🟢 Em Dia    │
│              │ │              │ │              │ │              │
│ [Card] ×N    │ │ [Card] ×N    │ │ [Card] ×N    │ │ [Card] ×N    │
│              │ │              │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

- Drag & drop para mover projetos entre etapas (atualiza status automaticamente + registra na timeline)
- Cards mostram: Cliente, Sistema, Health, Última Atualização
- Filtros aplicam-se também ao Kanban
- Cores: Verde (Ok), Amarelo (Atenção), Vermelho (Crítico)

### 4.3 Visualização "Calendário" (Calendar View)

**Exibe projetos por datas importantes:**

- Data de Criação (ponto cinza)
- Data de Início Prevista (ponto azul)
- Data de Término Prevista (ponto verde)
- Próximo Follow-up (ponto vermelho se vencido)

- Clicar em data para ver projetos daquele dia
- Month, Week, Day view
- Tooltip ao passar sobre evento

### 4.4 Visualização "Gantt" (Timeline/Roadmap)

### Mostra duração de cada etapa por projeto

```text
Mogi-Mirim    |████████|      |████|  |████████████|  |████|
Itu           |████|  |████|  |███████|  |████████|
Araçatuba     |████████████| BLOQUEADO |
São Paulo     |████|  |████|  |████|  |████████|  |████|  |████|
              Infra  Aderência  Ambiente  Conversão  Impl  Pós
```

- X axis = Etapas
- Y axis = Projetos
- Barra = Duração (cor por status: verde=ok, amarelo=atenção, vermelho=bloqueado)
- Hover para ver datas exatas

---

## 5. FILTROS AVANÇADOS (Multidimensionais)

### 5.1 Interface de Filtros

**Localização:** Sticky bar no topo, abaixo do título da página

```text
[+ Adicionar Filtro ▼] [X Filtros Ativos: 3] [Limpar Tudo]
┌────────────────────────────────────────────────────────────┐
│ ☑ Sistema = "Orion PRO"                              [X]  │
│ ☑ Status ∈ [Crítico, Atenção]                        [X]  │
│ ☑ Data Última Atualização >= 2025-11-20              [X]  │
└────────────────────────────────────────────────────────────┘
[Salvar como Filtro] [💾 Meus Filtros: Críticos | Dev | ...]
```

### 5.2 Operadores de Filtro

- **Igualdade:** = , ≠
- **Comparação Numérica:** >, <, >=, <=
- **Intervalo:** Entre [Data1] e [Data2]
- **Contains:** Contém texto
- **In List:** Selecionar múltiplos valores
- **Is Null / Is Not Null:** Campos vazios
- **Regex:** Expressão regular (avançado)

### 5.3 Campos Filtráveis

- Sistema
- Status Global
- Etapa Atual
- Responsável (qualquer)
- Data de Criação
- Última Atualização
- Próximo Follow-up
- Health Score
- Tipo de Implantação
- Bloqueador (Sim/Não)
- Tipo de Bloqueador
- Progresso (%)
- Ticket SAC
- Cliente (busca textual)

### 5.4 Filtros Salvos

- Permitir nomear filtro customizado
- Exibir em abas/menu
- Editar/Duplicar/Deletar
- Compartilhar filtro (futura integração multi-user)
- Exemplos pré-prontos: "Críticos", "Aguardando Dev", "Prontos para Implantação", "Sem Follow-up"

---

## 6. BULK OPERATIONS (Edição em Lote)

### 6.1 Interface

```text
[✓] 3 Projetos Selecionados

┌──────────────────────────────────────┐
│ AÇÕES EM LOTE                        │
├──────────────────────────────────────┤
│ ☐ Alterar Status para: [Select]      │
│ ☐ Alterar Responsável para: [Text]   │
│ ☐ Alterar Próximo Follow-up: [Date]  │
│ ☐ Adicionar Tag: [Text]              │
│ ☐ Alterar Etapa Atual: [Select]      │
│                                       │
│ [Aplicar] [Cancelar]                 │
└──────────────────────────────────────┘
```

### 6.2 Funcionalidades

- **Seleção Múltipla:** Checkbox em cada linha, ou "Select All" na tabela
- **Preview:** Mostrar preview das mudanças antes de confirmar
- **Undo:** Permitir desfazer operação em lote
- **Auditoria:** Registrar quem fez mudança em lote e quando
- **Validação:** Avisar se algum campo obrigatório não for preenchido

### 6.3 Campos que Suportam Bulk Edit

- Status
- Responsável (qualquer)
- Etapa Atual
- Próximo Follow-up
- Tags/Categorias
- Prioridade (se houver)
- Bloqueador (Ativar/Desativar)

---

## 7. BUSCA GLOBAL E BUSCA TEXTUAL

### 7.1 Busca Rápida

**Campo de busca:** No header, sempre visível

- Buscar por Cliente (nome)
- Buscar por Nº Ticket SAC
- Buscar por Sistema
- Buscar por Responsável
- Buscar por palavra-chave em observações
- Resultado em tempo real com autocomplete

### 7.2 Busca Avançada (Modal)

- Buscar em Timeline (comentários + logs)
- Buscar em Arquivos (nome)
- Buscar em Campos Específicos
- Expressão regular
- Resultado com contexto (matching snippet)

---

## 8. EXPORTAÇÃO E RELATÓRIOS

### 8.1 Formatos Suportados

1. **Excel (.xlsx)** - Com formatação, múltiplas abas
2. **PDF (.pdf)** - Relatório formatado com gráficos
3. **CSV (.csv)** - Para importação em outras ferramentas
4. **JSON** - Exportação de dados brutos

### 8.2 Conteúdo de Exportação

- **Listagem Completa:** Todos os projetos (visíveis com filtros aplicados)
- **Relatório por Projeto:** Incluindo timeline, histórico, campos
- **Dashboard Snapshot:** Gráficos e KPIs em momento X
- **Relatório Customizável:** Selecionar campos a incluir

### 8.3 Agendamento

- Permitir agendar exportação automática semanal/mensal
- Enviar por email
- Salvar em storage cloud (Lovable Cloud)

---

## 9. TIMELINE AUTOMÁTICA - REGISTRO COMPLETO

### 9.1 Eventos Registrados Automaticamente

Toda ação no sistema deve ser registrada:

```typescript
interface TimelineEvent {
  id: string;
  type: "field_change" | "status_change" | "file_upload" | "comment" | "bulk_edit" | "project_created" | "project_deleted";
  timestamp: datetime;
  author: string; // user id + name
  projectId: string;
  
  // Para field_change
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  
  // Para status_change
  statusStage?: string; // "infra", "adherence", etc
  oldStatus?: string;
  newStatus?: string;
  
  // Para file_upload
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  
  // Para comment
  message?: string;
  
  // Para bulk_edit
  affectedFields?: string[];
  affectedProjects?: number;
  
  visibility: "public" | "archived"; // soft delete
}
```

### 9.2 Campos para os Quais DEVE Registrar

- Qualquer mudança de Status (qualquer etapa)
- Qualquer mudança de Data (Início, Fim, Follow-up)
- Qualquer mudança de Responsável
- Qualquer mudança de Observações
- Qualquer mudança em campo toggle/checkbox
- Qualquer upload de arquivo
- Qualquer comentário
- Qualquer bulk edit

---

## 10. GESTÃO DE CAMPOS EXPANDIDA

### 10.1 Novos Campos (Além do Anterior)

#### Metadados do Projeto

- **ID Único do Projeto** (gerado automaticamente, imutável)
- **ID de Referência Externa** (para integração com sistemas)
- **Tags/Categorias** (múltiplas, para organização)
- **Prioridade** (select: Crítico, Alto, Normal, Baixo)
- **Tipo de Projeto** (select: Novo, Migração, Upgrade, Manutenção)

#### Rastreamento

- **Criado por** (user, datetime)
- **Última modificação por** (user, datetime)
- **Deletado?** (soft delete, com data)
- **Arquivado?** (soft archive, com data)

#### Customizações

- **Campos Customizados** (user-defined fields por projeto)
- **Checklist Customizado** (múltiplos itens de verificação)

### 10.2 Validações de Campo

- **Campos Obrigatórios:** Asterisco visual, validação antes de salvar
- **Formatos Esperados:** Data (dd/mm/aaaa), Email, Telefone, URL, Currency
- **Ranges:** Número entre X e Y, Data entre X e Y
- **Dependencies:** Se Campo A = Valor X, então Campo B é obrigatório

---

## 11. ESTRUTURA DE DADOS EXPANDIDA (TypeScript)

```typescript
// types/Project.ts

export interface Project {
  // Metadados Básicos
  id: string;
  externalId?: string;
  clientName: string;
  ticketNumber: string;
  
  // Tipos & Categoria
  systemType: "Orion PRO" | "Orion TN" | "Orion REG" | string;
  implantationType: "new" | "migration_siplan" | "migration_competitor" | "upgrade";
  tags: string[];
  priority: "critical" | "high" | "normal" | "low";
  projectType: "new" | "migration" | "upgrade" | "maintenance";
  
  // Status & Health
  healthScore: "ok" | "warning" | "critical";
  globalStatus: "todo" | "in-progress" | "done" | "blocked" | "archived";
  overallProgress: number; // 0-100, calculated
  
  // Informações Gerais (Dados do Projeto)
  description: string;
  specialConsiderations: string;
  contractValue?: number;
  paymentMethod?: string;
  
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
  
  // Datas
  createdAt: datetime;
  startDatePlanned?: datetime;
  endDatePlanned?: datetime;
  startDateActual?: datetime;
  endDateActual?: datetime;
  nextFollowUpDate?: datetime;
  lastUpdatedAt: datetime;
  lastUpdatedBy: string;
  
  // Estágios (anterior)
  stages: {
    infra: InfraStage;
    adherence: AdherenceStage;
    environment: EnvironmentStage;
    conversion: ConversionStage;
    implementation: ImplementationStage;
    post: PostStage;
  };
  
  // Timeline & Auditoria
  timeline: TimelineEvent[];
  auditLog: AuditEntry[];
  
  // Arquivos
  files: ProjectFile[];
  
  // Soft Deletes
  isDeleted: boolean;
  deletedAt?: datetime;
  deletedBy?: string;
  
  isArchived: boolean;
  archivedAt?: datetime;
  
  // Customização
  customFields?: Record<string, any>;
  checklist?: ChecklistItem[];
}

export interface InfraStage {
  status: "todo" | "in-progress" | "done" | "blocked";
  responsible: string;
  startDate?: datetime;
  endDate?: datetime;
  blockingReason?: "awaiting-purchase" | "os-upgrade" | "network-unstable" | "legacy-conflict" | "client-access" | "other";
  serverInUse?: string;
  serverNeeded?: string;
  approvedByInfra: boolean;
  technicalNotes?: string;
  observations: string;
  lastUpdatedAt: datetime;
  lastUpdatedBy: string;
}

// ... Continue estrutura similar para outras stages com TODOS os campos novos

export interface ProjectFile {
  id: string;
  projectId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: datetime;
  category?: string; // "contract", "design", "testing", "other"
  version?: number;
  isLatestVersion?: boolean;
  deletedAt?: datetime;
}

export interface TimelineEvent {
  id: string;
  projectId: string;
  type: "field_change" | "status_change" | "file_upload" | "comment" | "bulk_edit" | "project_created" | "project_deleted";
  timestamp: datetime;
  author: string; // user id
  authorName: string;
  
  // Field Change
  fieldName?: string;
  fieldType?: string;
  oldValue?: any;
  newValue?: any;
  
  // Status Change
  statusStage?: string;
  oldStatus?: string;
  newStatus?: string;
  
  // File
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  
  // Comment
  message?: string;
  
  // Bulk Edit
  affectedFields?: string[];
  affectedProjects?: number;
  
  visibility: "public" | "archived";
}

export interface AuditEntry {
  id: string;
  projectId: string;
  action: string;
  changedBy: string;
  changedAt: datetime;
  details: Record<string, any>;
  ipAddress?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: datetime;
  description?: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterCondition[];
  createdBy: string;
  createdAt: datetime;
  isPublic: boolean;
  usageCount: number;
}

export interface FilterCondition {
  field: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "in" | "between" | "regex" | "is_null";
  value: any;
}
```

---

## 12. MOCK DATA EXPANDIDO (5+ Projetos Realistas)

```typescript
// utils/mockData.ts - Exemplos de projetos com TODOS os campos

export const MOCK_PROJECTS_V2: Project[] = [
  {
    id: "proj-001",
    externalId: "EXT-696613",
    clientName: "Cartório Mogi-Mirim",
    ticketNumber: "696613",
    systemType: "Orion PRO",
    implantationType: "new",
    tags: ["São Paulo", "Prioritário", "Q4 2025"],
    priority: "critical",
    projectType: "new",
    
    healthScore: "warning",
    globalStatus: "in-progress",
    overallProgress: 35,
    
    description: "Implantação completa do Orion PRO para cartório de Mogi-Mirim...",
    specialConsiderations: "Cliente requer customização de módulo de Protesto",
    contractValue: 85000,
    paymentMethod: "installments",
    
    projectLeader: "Bruno Fernandes",
    clientPrimaryContact: "João Silva - Gerente",
    clientEmail: "joao@cartoriomm.com.br",
    clientPhone: "+55 19 98765-4321",
    responsibleInfra: "João Infra",
    responsibleAdherence: "Alex Silva",
    responsibleConversion: "Maria Conversão",
    responsibleImplementation: "Pedro Implantação",
    responsiblePost: "Ana Pós-Impl",
    
    createdAt: new Date("2025-11-01"),
    startDatePlanned: new Date("2025-11-10"),
    endDatePlanned: new Date("2026-02-15"),
    startDateActual: new Date("2025-11-12"),
    endDateActual: null,
    nextFollowUpDate: new Date("2025-11-26"),
    lastUpdatedAt: new Date("2025-11-25T14:30:00"),
    lastUpdatedBy: "Alex Silva",
    
    stages: {
      infra: {
        status: "done",
        responsible: "João Infra",
        startDate: new Date("2025-11-01"),
        endDate: new Date("2025-11-10"),
        blockingReason: undefined,
        serverInUse: "2008 Server",
        serverNeeded: "Windows 2022 / 8GB RAM / SSD",
        approvedByInfra: true,
        technicalNotes: "Upgrade completo realizado com sucesso",
        observations: "Servidor configurado e testado",
        lastUpdatedAt: new Date("2025-11-10T16:45:00"),
        lastUpdatedBy: "João Infra"
      },
      adherence: {
        status: "in-progress",
        responsible: "Alex Silva",
        startDate: new Date("2025-11-15"),
        endDate: null,
        hasProductGap: true,
        gapDescription: "Módulo de Protesto não presente na versão padrão",
        devTicket: "DEV-1234",
        devEstimatedDate: new Date("2025-12-02"),
        gapPriority: "high",
        analysisComplete: false,
        conformityStandards: "Verificação de módulos customizados realizadas",
        observations: "Gap encontrado em Protesto, em desenvolvimento",
        lastUpdatedAt: new Date("2025-11-18T15:00:00"),
        lastUpdatedBy: "Alex Silva"
      },
      // ... outras stages
    },
    
    timeline: [
      {
        id: "evt-001-1",
        projectId: "proj-001",
        type: "project_created",
        timestamp: new Date("2025-11-01T08:00:00"),
        author: "user-bruno",
        authorName: "Bruno Fernandes",
        message: "Projeto criado",
        visibility: "public"
      },
      {
        id: "evt-001-2",
        projectId: "proj-001",
        type: "field_change",
        timestamp: new Date("2025-11-15T10:30:00"),
        author: "user-alex",
        authorName: "Alex Silva",
        fieldName: "responsibleAdherence",
        oldValue: "",
        newValue: "Alex Silva",
        visibility: "public"
      },
      // ... mais eventos
    ],
    
    auditLog: [
      {
        id: "audit-001",
        projectId: "proj-001",
        action: "project_created",
        changedBy: "user-bruno",
        changedAt: new Date("2025-11-01T08:00:00"),
        details: { reason: "Novo cliente" }
      }
    ],
    
    files: [
      {
        id: "file-001",
        projectId: "proj-001",
        fileName: "contrato-mogi-mirim.pdf",
        fileSize: 2048000,
        fileType: "application/pdf",
        fileUrl: "s3://bucket/...contrato-mogi-mirim.pdf",
        uploadedBy: "Bruno Fernandes",
        uploadedAt: new Date("2025-11-01T09:00:00"),
        category: "contract",
        version: 1,
        isLatestVersion: true
      }
    ],
    
    isDeleted: false,
    isArchived: false,
    
    customFields: {
      "responsavel_comercial": "Carlos Vendas",
      "industry_type": "Cartório"
    },
    
    checklist: [
      {
        id: "check-001",
        label: "Infra aprovada",
        completed: true,
        completedBy: "João Infra",
        completedAt: new Date("2025-11-10T16:45:00")
      },
      {
        id: "check-002",
        label: "Aderência finalizada",
        completed: false
      }
    ]
  },
  
  // ... mais 4 projetos com mesma estrutura completa
];
```

---

## 13. DASHBOARD AVANÇADO (KPI + Visualizações)

### 13.1 Componentes de KPI

```typescript
interface KPICard {
  title: string;
  value: number | string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: number;
  icon: ReactNode;
  color: string; // cor baseada no valor
  onClick?: () => void; // para drill-down
}
```

### 13.2 KPIs Exibidos

```text
┌─────────┬──────────┬──────────┬──────────┬──────────┐
│ Total   │ Críticos │ Bloqueados│ Em Risco │ Completos│
│ 47      │ 5 (↑2)   │ 3        │ 12 (↓1)  │ 18 (↑3)  │
│ Projetos│ 🔴      │ 🔴       │ 🟡      │ 🟢       │
└─────────┴──────────┴──────────┴──────────┴──────────┘

┌─────────────────┬──────────────────┐
│ Taxa Conclusão  │ Tempo Médio Total │
│ 38%             │ 67 dias          │
│ 📈 +5% vs mês   │ ↑8 dias vs ano   │
└─────────────────┴──────────────────┘
```

### 13.3 Gráficos Inclusos

1. **Distribuição por Etapa** (Pie)
2. **Status Global** (Bar)
3. **Timeline de Projetos** (Gantt Simplificado)
4. **Tendência Semanal** (Line)
5. **Top 10 Cartórios** (Bar Horizontal)
6. **Heatmap de Atividade** (Semana/Dia)

---

## 14. INTEGRAÇÃO LOVABLE CLOUD

### 14.1 Recursos Sincronizados

- Sync automático a cada mudança (debounce 2s)
- Backup diário automático
- Versionamento de projetos
- Auditoria completa no backend
- Webhooks para eventos críticos

### 14.2 Configurações

```typescript
interface LovableCloudConfig {
  syncInterval: 2000; // ms
  autoBackup: true;
  backupFrequency: "daily";
  webhookUrl?: string; // para notificações externas
  enableAuditLog: true;
  retentionDays: 90; // para logs antigos
}
```

---

## 15. VALIDAÇÕES E REGRAS DE NEGÓCIO V2.0

### 15.1 Validações Obrigatórias

```typescript
const REQUIRED_FIELDS = {
  create: ["clientName", "ticketNumber", "systemType", "projectLeader"],
  edit: [], // nenhum field é obrigatório para edit após criação
  stages: {
    infra: ["status"],
    adherence: ["status"],
    environment: ["status"],
    conversion: ["status"],
    implementation: ["status"],
    post: ["status"]
  }
};
```

### 15.2 Regras de Negócio

1. **Próximo Follow-up Automático**
   - Novo projeto: hoje + 1 dia
   - Bloqueado: hoje + 3 dias
   - Finalizado: null (remover)
   - Sem atualização > 5 dias: automaticamente vencido (visual)

2. **Health Score Sensível ao Contexto**
   - Follow-up vencido: 🔴
   - Sem update > 5 dias: 🔴
   - Bloqueado sem resolução > 7 dias: 🔴
   - Bloqueado < 7 dias ou sem update 2-5 dias: 🟡
   - Tudo ok: 🟢

3. **Progress Calculation**
   - % = (etapas em "done" / 6) * 100
   - Recalcular ao cada mudança de status

4. **Bulk Edit Restrictions**
   - Avisar antes de editar > 5 projetos
   - Registrar quem fez e quando
   - Permitir undo (reverter para último estado bom)

---

## 16. ESTRUTURA DE COMPONENTES COMPLETA

```text
src/
├── components/
│   ├── Dashboard/
│   │   ├── DashboardOverview.tsx (novo - KPI geral)
│   │   ├── KPICard.tsx
│   │   ├── KPIChart.tsx
│   │   ├── AlertsSection.tsx (novo - alertas críticos)
│   │   └── QuickAccessPanel.tsx (novo)
│   │
│   ├── ProjectManagement/
│   │   ├── ProjectTable.tsx (tabela rica)
│   │   ├── ProjectKanban.tsx (novo - Kanban view)
│   │   ├── ProjectCalendar.tsx (novo - Calendar view)
│   │   ├── ProjectGantt.tsx (novo - Gantt view)
│   │   ├── FilterBar.tsx (expandido)
│   │   ├── SavedFilters.tsx (novo)
│   │   ├── BulkEditPanel.tsx (novo)
│   │   ├── SearchBar.tsx (novo - global search)
│   │   └── ExportMenu.tsx (novo)
│   │
│   ├── ProjectDrawer/
│   │   ├── ProjectDrawer.tsx
│   │   ├── TabsNavigation.tsx (novo - 5 tabs)
│   │   │
│   │   ├── Tabs/
│   │   │   ├── DataTab.tsx (novo - Dados do Projeto)
│   │   │   ├── StagesTab.tsx
│   │   │   ├── TimelineTab.tsx (expandido)
│   │   │   ├── FilesTab.tsx (expandido)
│   │   │   └── AuditTab.tsx (novo)
│   │   │
│   │   ├── DataTab/
│   │   │   ├── GeneralInfoGroup.tsx
│   │   │   ├── ContactsGroup.tsx
│   │   │   ├── CriticalDatesGroup.tsx
│   │   │   ├── ContractDataGroup.tsx
│   │   │   └── PipelineSummaryGroup.tsx
│   │   │
│   │   ├── Stages/
│   │   │   ├── InfraStageCard.tsx (expandido)
│   │   │   ├── AdherenceStageCard.tsx (expandido)
│   │   │   ├── EnvironmentStageCard.tsx (expandido)
│   │   │   ├── ConversionStageCard.tsx (expandido)
│   │   │   ├── ImplementationStageCard.tsx (expandido)
│   │   │   └── PostStageCard.tsx (expandido)
│   │   │
│   │   ├── Timeline/
│   │   │   ├── TimelinePanel.tsx (expandido)
│   │   │   ├── TimelineEvent.tsx
│   │   │   ├── TimelineFilters.tsx (novo)
│   │   │   ├── CommentInput.tsx (expandido)
│   │   │   └── TimelineSearch.tsx (novo)
│   │   │
│   │   ├── Files/
│   │   │   ├── FileManager.tsx (expandido)
│   │   │   ├── FileUpload.tsx
│   │   │   ├── FileList.tsx
│   │   │   └── FileVersionHistory.tsx (novo)
│   │   │
│   │   └── Audit/
│   │       ├── AuditLog.tsx
│   │       ├── AuditEntry.tsx
│   │       └── AuditFilters.tsx
│   │
│   ├── Forms/
│   │   ├── NewProjectForm.tsx (expandido)
│   │   └── FieldValidation.tsx (novo)
│   │
│   ├── Common/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx (novo - menu lateral)
│   │   ├── Toast.tsx
│   │   └── ConfirmDialog.tsx
│   │
│   └── UI/
│       └── [...componentes shadcn reutilizáveis]
│
├── hooks/
│   ├── useProjects.ts (expandido)
│   ├── useProjectDetails.ts (novo)
│   ├── useFilters.ts (novo)
│   ├── useBulkEdit.ts (novo)
│   ├── useTimeline.ts (expandido)
│   ├── useFileManager.ts (novo)
│   ├── useKPIs.ts (novo)
│   └── useAuditLog.ts (novo)
│
├── stores/
│   ├── projectStore.ts (expandido)
│   ├── filterStore.ts (novo)
│   ├── uiStore.ts (novo)
│   └── userStore.ts
│
├── types/
│   ├── Project.ts (expandido)
│   ├── Filter.ts (novo)
│   ├── Timeline.ts (expandido)
│   ├── File.ts (novo)
│   └── KPI.ts (novo)
│
├── utils/
│   ├── mockData.ts (expandido)
│   ├── validators.ts (expandido)
│   ├── calculations.ts (expandido)
│   ├── dateHelpers.ts
│   ├── exporters.ts (novo)
│   ├── filterHelpers.ts (novo)
│   └── bulkOperations.ts (novo)
│
├── services/
│   ├── api.ts (novo - para Lovable Cloud)
│   ├── storageService.ts (novo)
│   ├── auditService.ts (novo)
│   └── notificationService.ts (novo)
│
├── styles/
│   ├── globals.css
│   ├── variables.css
│   └── animations.css (novo)
│
├── App.tsx (expandido)
└── main.tsx
```

---

## 17. INSTRUÇÕES DE IMPLEMENTAÇÃO (FASE POR FASE)

### Fase 1: Core (1-2 sprints)

1. Expandir estrutura de dados (TypeScript types)
2. Criar Seção "Dados do Projeto"
3. Implementar 5 tabs no Drawer
4. Expandir campos em cada stage

### Fase 2: Advanced Features (2-3 sprints)

1. Dashboard com KPIs
2. Filtros Avançados & Salvos
3. Bulk Operations
4. Visualizações alternativas (Kanban, Calendário, Gantt)

### Fase 3: Polish & Integração (1-2 sprints)

1. Timeline Automática Completa
2. Auditoria & Logs
3. Exportação (Excel, PDF)
4. Integração Lovable Cloud

---

## 18. PROMPT PARA LOVABLE (COPIAR/COLAR)

```text
Você é um Expert em Full-Stack Development e UX/UI Design.

Sua tarefa é RECONSTRUIR completamente o Siplan Manager para v2.0 ENTERPRISE-GRADE.

OBRIGAÇÕES:
1. Estrutura de dados expandida (incluir TODOS os campos novos da v2.0)
2. Seção "Dados do Projeto" como TAB 1 (central de informações)
3. 5 TABS no Drawer: Dados | Etapas | Timeline | Arquivos | Auditoria
4. Dashboard com KPIs (gráficos, alertas, quick access)
5. Filtros avançados & multidimensionais (salvos)
6. Bulk operations (edição em lote)
7. 4 visualizações: Tabela | Kanban | Calendário | Gantt
8. Timeline automática completa (todos eventos)
9. Campos expandidos em TODAS as 6 etapas
10. Validações robustas
11. Exportação (Excel, PDF, CSV)
12. Autosave + debounce
13. Responsive design
14. Dark mode

STACK OBRIGATÓRIO:
- React + Vite
- TypeScript
- Tailwind CSS
- Shadcn UI
- Lucide React
- Zustand
- date-fns
- TanStack React Query
- ECharts ou Recharts (gráficos)

USE DATA STRUCTURE DA SEÇÃO 11 DO PROMPT.
USE MOCK DATA DA SEÇÃO 12 DO PROMPT.

GENERATE 100% FUNCIONAL & PRONTO PARA PRODUÇÃO.
```

---

## FIM DO PROMPT MASTER V2.0

Este documento é autossuficiente para reconstruir a plataforma completamente. 🚀
