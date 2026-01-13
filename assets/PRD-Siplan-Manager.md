# PRD - Siplan Manager

## Plataforma de Gestão de Implantação de Softwares

**Versão:** 1.0 (Vibe Coding Definition)  
**Data:** Novembro 2025  
**Status:** Especificação para Desenvolvimento  

---

## ÍNDICE

1. [Contexto e Problema](#1-contexto-e-problema)
2. [Visão do Produto](#2-visão-do-produto)
3. [Personas e Stakeholders](#3-personas-e-stakeholders)
4. [Requisitos Funcionais](#4-requisitos-funcionais)
5. [Arquitetura de Dados](#5-arquitetura-de-dados)
6. [Fluxos de Negócio](#6-fluxos-de-negócio)
7. [Especificações de Interface](#7-especificações-de-interface)
8. [Lógica de Negócio Detalhada](#8-lógica-de-negócio-detalhada)
9. [Critérios de Aceitação](#9-critérios-de-aceitação)
10. [Roadmap de Implementação](#10-roadmap-de-implementação)

---

## 1. CONTEXTO E PROBLEMA

### 1.1 Situação Atual

A Siplan, empresa brasileira fundada em 1983 e ampliada com a fusão com Control-M em 2011, gerencia aproximadamente **550 cartórios** (90% em São Paulo, 10% distribuídos em outros 10 estados) através de uma carteira diversificada de produtos de gestão operacional, financeira e estratégica.

O processo de implantação de softwares é **complexo, multidisciplinar e crítico** para o sucesso comercial. Atualmente, é gerenciado através do **Microsoft SharePoint Lists**, que funciona como um repositório de dados bruto sem inteligência de gestão visual.

### 1.2 Dores Operacionais Identificadas

#### a) **Falta de Visibilidade Centralizada**

- Cada projeto é uma "linha" em uma tabela.
- Para saber o status real, o gestor precisa **abrir item por item**, expandir o formulário e ler manualmente as observações.
- A última atualização é documentada em um campo de texto gigante no padrão manual: "**UAT. 25/11/2025, por Marcus Ortiz**", empilhando observações sem estrutura.

#### b) **Impedimento de Rastreabilidade e Follow-up**

- Não há registro automático de quando cada etapa começou/terminou.
- O gestor depende de **lembrança humana** para cobrar a equipe (ex: solicitou análise de aderência ao Alex no dia 19, mas só descobriu no dia 25 que ainda não havia retorno).
- Sem alertas automáticos, pendências **passam despercebidas**.

#### c) **Poluição Visual de Campos**

- O formulário atual contém campos **completamente desnecessários** (% de conclusão, datas de previsão genéricas, campos legados).
- Usuários se perdem identificando quais campos importam para o seu papel.
- Isso aumenta o **tempo de entrada de dados** e a **margem de erro**.

#### d) **Inexistência de Gestão por Exceção**

- Não há indicadores visuais que sinalizem automaticamente quais projetos estão "críticos" ou "parados".
- O gestor precisa fazer um **scan manual** semanal de todos os projetos.

#### e) **Processo de Implantação Complexo e Não-Linear**

- O fluxo Siplan é: Contrato → Levantamento Infra → Análise Aderência → Análise Ambiente → Conversão Dados → Homologação → Agendamento → Instalação Remota → Treinamento Presencial → Virada para Produção → Pós-Implantação.
- As fases **não são estritamente sequenciais**. A análise de aderência pode ocorrer enquanto a infra está sendo adequada.
- **Bloqueadores** podem aparecer em qualquer ponto (ex: infra inadequada retorna ao Comercial, conversão de dados falha na homologação).
- O sistema atual não captura essa **complexidade de dependências e desvios**.

---

## 2. VISÃO DO PRODUTO

### 2.1 Objetivo Principal

Criar uma **plataforma web moderna (SPA)** que transforme a gestão manual e reativa do Microsoft Lists em um **painel inteligente, visual e proativo** de gestão de implantações. O foco é:

1. **Visibilidade Instantânea:** Ao abrir a plataforma, o gestor identifica projetos parados, em risco ou críticos em **segundos** sem abrir nenhum item.
2. **Rastreabilidade Automática:** Todo evento (mudança de status, comentário) é registrado com data/hora e autor automaticamente.
3. **Redução de Cliques:** Interface modular que permite atualização rápida sem "formulários linguiça".
4. **Gestão por Exceção:** Alertas visuais apontam o que realmente precisa de atenção.

### 2.2 Princípios de Design

- **Limpeza Visual:** Apenas campos essenciais são exibidos. Dados secundários ficam em histórico/timeline.
- **Modularidade:** Cada etapa do fluxo é um "card" independente que pode ser editado sem impactar outros.
- **Não-Bloqueante:** Usuários podem editar qualquer card em qualquer momento (refletindo a realidade do fluxo paralelo).
- **Inteligência Calculada:** O sistema calcula automaticamente "saúde" dos projetos, dias sem atualização, prioridade de follow-up.
- **Clareza Hierárquica:** Informações críticas sempre visíveis. Detalhes secundários colapsáveis.

### 2.3 Escopo v1.0

**Funcionalidades Incluídas:**

- Dashboard principal com visão de torre de controle.
- Drawer de detalhes com formulário modular.
- Timeline automática de eventos.
- Sistema de alertas visuais baseado em regras de negócio.
- Suporte para múltiplos usuários com permissões básicas (Gestor vs Técnico).

**Funcionalidades Futuras (v2.0+):**

- Integração com SAC 0800 da Siplan para devoluções automáticas.
- Notificações por email/Slack para alertas críticos.
- Relatórios e BI (quantidade de projetos por estágio, tempo médio de implantação, gargalos recorrentes).
- Mobile app para follow-ups rápidos.
- Integração com n8n para automação de workflows.

---

## 3. PERSONAS E STAKEHOLDERS

### 3.1 Persona Primária: Bruno Fernandes (Gestor de Implantação)

**Perfil:**

- Responsável por orquestrar todo o fluxo de implantação de ~50-70 projetos ativos simultaneamente.
- Interage com múltiplos times (Infra, Aderência, Conversão, Implantação).
- Precisa prestar contas para a direção sobre cronogramas e gargalos.
- Usuário diário da plataforma (~6-8 horas/dia).

**Necessidades:**

- Visão macro instantânea: quais projetos estão em risco?
- Capacidade de cobrar a equipe com dados: "Alex, o projeto X está parado há 6 dias em Aderência."
- Histórico auditável para justificar atrasos.
- Relatórios rápidos para reuniões de gestão.

**Comportamento:**

- Acessa a plataforma pela manhã para fazer seu "scan diário".
- Clica em projetos específicos para investigar gargalos.
- Adiciona comentários contextuais ("Cliente confirmou servidor para amanhã").

---

### 3.2 Persona Secundária: Alex Silva (Analista de Implantação)

**Perfil:**

- Responsável por executar análises (Aderência, Ambiente) e treinamentos.
- Usuário ocasional da plataforma (~1-2 horas/dia).
- Precisa de um formulário simples para atualizar seu status rapidamente.

**Necessidades:**

- Entender claramente o que ele precisa fazer agora.
- Poder editar apenas os campos que o afetam.
- Não quer preencher "% Conclusão" ou campos irrelevantes.

**Comportamento:**

- Acessa quando recebe um "chamado" do gestor.
- Atualiza o status rapidamente.
- Deixa um comentário explicando a situação atual.

---

### 3.3 Persona Terciária: Equipe de Infraestrutura

**Perfil:**

- Responsável pelo Levantamento de Infraestrutura e Instalação Remota do Sistema.
- Usuário esporádico (~menos de 1 hora/semana por projeto).
- Trabalha com tickets no SAC 0800.

**Necessidades:**

- Ver claramente quando uma infraestrutura foi "Devolvida ao Comercial" (bloqueio).
- Atualizar o status quando a instalação remota estiver completa.

---

## 4. REQUISITOS FUNCIONAIS

### 4.1 RF-01: Dashboard Principal (Torre de Controle)

**Descrição:**
A tela inicial da plataforma exibe uma visão centralizada de todos os projetos de implantação ativa.

**Componentes Visuais:**

#### Tabela Rica (Rich Data Grid)

- **Não é uma tabela HTML simples.** Usa componentes visuais para criar "linhas interativas" com densidade visual controlada.
- **Seletor de Filtros (Sticky no topo):**
  - Filtro por Status Geral (Andamento, Risco, Crítico, Finalizado).
  - Filtro por Sistema (Orion PRO, Orion TN, etc.).
  - Filtro por Etapa Atual (Infra, Aderência, Conversão, etc.).
  - Campo de busca por Cliente/Ticket.

#### Colunas Exibidas

1. **Cliente / Sistema**
   - Nome do cartório (ex: "Mogi-Mirim").
   - Subtexto: Sistema em implantação (ex: "Orion PRO").
   - Ícone colorido indicando tipo de implantação (novo cliente, migração Siplan, migração concorrente).

2. **Indicadores de Etapa (Pipeline Visual)**
   - Exibir 6 pequenos "pills" ou "dots" horizontais, cada um representando uma etapa:
     - [Infra] [Aderência] [Ambiente] [Conversão] [Implantação] [Pós]
   - Cores:
     - 🟢 Verde: Finalizado.
     - 🟡 Amarelo: Em Andamento.
     - 🔴 Vermelho: Bloqueado/Impedimento.
     - ⚪ Cinza: Não Iniciado / Aguardando.
   - Hover: Mostrar tooltip com status detalhado (ex: "Infra: Reprovado em 20/11, aguardando Comercial").

3. **Health Score (Indicador de Saúde)**
   - Um badge visual:
     - 🟢 **Verde:** Projeto em dia (última atualização < 2 dias).
     - 🟡 **Amarelo:** Projeto em atenção (última atualização 2-5 dias).
     - 🔴 **Vermelho:** Projeto crítico (última atualização > 5 dias OU próximo follow-up vencido).
   - Hover: Mostrar motivo (ex: "Sem atualização há 7 dias").

4. **Próximo Follow-up**
   - Data formatada (ex: "25/11 (Hoje)").
   - Cor: Se data ≤ hoje, destacar em laranja.
   - Se vencido, mostrar "⚠️ Vencido".

5. **Última Ação**
   - Ex: "Há 2 horas por Bruno" ou "Há 1 dia por Alex".
   - Ajuda a identificar quem foi o último a mexer no projeto.

6. **Botão de Ação**
   - "Ver Detalhes" (abre o Drawer).
   - Disponível em todos os estados.

**Comportamento:**
- Ao carregar, exibir todos os projetos **ordenados por prioridade** (Críticos no topo).
- Linhas clicáveis: clicar em qualquer lugar da linha (exceto botões) abre o Drawer.
- Suporte a múltiplas ordenações: por Cliente, por Última Atualização, por Follow-up.

---

### 4.2 RF-02: Drawer de Detalhes (Smart Form)

**Descrição:**
Ao clicar em um projeto no dashboard, um painel lateral desliza da direita (85% da tela) exibindo os detalhes completos.

**Layout (Split View):**

#### Lado Esquerdo (70%) - Formulário Modular

**Cabeçalho Fixo (Sticky Top):**
- **Linha 1:** Cliente, Nº Ticket SAC, Líder do Projeto.
- **Linha 2:** Sistema (Orion PRO/TN), Status Geral Calculado, Botão "Exportar Relatório".

**Cards de Etapas (Colapsáveis Accordion):**

Cada card representa uma etapa do fluxo. Por padrão, abrem os cards que estão "Em Andamento". Outros vêm colapsados.

##### Card 1: Análise de Infraestrutura

- **Campos:**
  - Status (Select): Não Iniciado | Em Andamento | Finalizado | Reprovado.
  - Responsável (Select, busca de usuários).
  - Data Início (Date picker).
  - Data Fim (Date picker).
  - Motivo de Bloqueio (Select, só aparece se Status = Reprovado):
    - "Aguardando Compra de Servidor"
    - "Upgrade SO Necessário"
    - "Rede Instável"
    - "Outros"
  - Observações (Textarea).

- **Validações:**
  - Se Status = "Finalizado", Data Fim é obrigatória.
  - Se Status = "Reprovado", Motivo de Bloqueio é obrigatório.

- **Visual:** Se Status = Reprovado, card tem borda esquerda **vermelha** (4px).

---

##### Card 2: Análise de Aderência

- **Campos:**
  - Status (Select): Não Iniciado | Em Andamento | Finalizado | Impedimento.
  - Responsável (Select).
  - Data Início, Data Fim (Date pickers).
  - **Pendência de Produto? (Toggle Sim/Não):**
    - Se Sim, exibir (com transição suave):
      - Ticket Dev (Text input): Número do chamado de desenvolvimento.
      - Prazo Estimado Dev (Date picker).
  - Observações (Textarea).

- **Visual:** Se "Pendência de Produto?" estiver ativa, borda esquerda **amarela**.

---

##### Card 3: Criação/Configuração de Ambiente

- **Campos:**
  - Status (Select).
  - Responsável (Select).
  - Data Real (Date picker).
  - Sistema Operacional (Select): Windows 2016 | Windows 2019 | Windows 2022 | Linux.
  - Aprovado pela Infra? (Checkbox).
  - Observações (Textarea).

---

##### Card 4: Conversão de Dados

- **Campos:**
  - Status (Select): Não Iniciado | Análise | Desenvolvendo Conversor | Homologação | Finalizado.
  - Responsável (Select).
  - Sistema de Origem (Select): Siplan | Control-M | Argon | Alkasoft | [Outro].
  - Observações (Textarea).

- **Lógica Especial:**
  - Se Sistema de Origem = "Siplan" ou "Control-M", exibir label informativo: "⚡ Conversão esperada em 2-3 dias (sistema conhecido)".
  - Se Sistema de Origem = "Outro", exibir: "⏳ Conversão pode levar 1-2 meses (novo sistema, requer desenvolvimento de motor)".

---

##### Card 5: Implantação (Fase 1 e 2)

- **Campos:**
  - Status (Select).
  - Responsável (Select).
  - **Data de Instalação Remota (Date picker):** Quando a Equipe de Infra vai instalar o sistema remotamente.
  - **Data de Início de Treinamento (Date picker):** Quando o analista começa o treinamento presencial/remoto.
  - **Data de Término de Treinamento (Date picker):** Fim do treinamento.
  - Tipo de Virada (Select): Fim de Semana | Dia Útil (auxilia na coordenação).
  - Observações (Textarea).

---

##### Card 6: Pós-Implantação

- **Campos:**
  - Status (Select): Não Iniciado | Em Andamento | Finalizado.
  - Responsável (Select).
  - Data Início, Data Fim (Date pickers).
  - Observações (Textarea).

---

##### Botões de Ação (Footer do Formulário)

- "Salvar Alterações" (primário).
- "Descartar Alterações" (secundário).

---

#### Lado Direito (30%) - Timeline Inteligente

**Feed de Atividades:**
Uma lista vertical mostrando o histórico completo do projeto.

##### Tipos de Eventos

1. **Log Automático (🤖 System Log):**
   - Ex: "Status de Infra atualizado para 'Finalizado' em 25/11 às 14:30".
   - Ex: "Data Fim de Aderência preenchida em 24/11 às 10:15".
   - Cor de fundo: Cinza muito claro.
   - Sem ação do usuário.

2. **Comentário de Usuário (👤 User Comment):**
   - Ex: "Bruno adicionou comentário: 'Cliente confirmou servidor para amanhã'".
   - Mostra avatar do usuário, nome, timestamp, texto.
   - Cor de fundo: Branco/Mais destaque.

3. **Evento Manual (Criação do Projeto):**
   - Ex: "Projeto criado em 10/11 por Marcus Ortiz".

##### Input de Comentário (Bottom da Timeline)

- Textarea: "Escreva uma atualização...".
- Botão Enviar (com ícone de paper plane).
- Ao enviar, o comentário aparece imediatamente no topo da timeline com o avatar do usuário autenticado.

##### Scrolling

- Timeline tem scroll interno independente.
- Agenda mais antiga aparece no topo (ordem cronológica de cima para baixo).

---

### 4.3 RF-03: Lógica de Health Score (Calculado Automaticamente)

**Fórmula:**

```javascript
healthScore = calcular_score({
  diasSemUpdate = hoje - dataUltimaAlteracao,
  proximoFollowUpVencido = proximoFollowUpDate < hoje,
  hasBlockers = project.contains(status = "Bloqueado" ou "Reprovado"),
  daysInConversion = se conversao.status = "Desenvolvendo Conversor", contar dias
})

Se:
  - diasSemUpdate > 5 OR proximoFollowUpVencido = true → "critical" (🔴)
  - diasSemUpdate > 2 AND diasSemUpdate <= 5 → "warning" (🟡)
  - diasSemUpdate <= 2 AND NOT proximoFollowUpVencido → "ok" (🟢)
```

**Observação:** A lógica é **sensível ao contexto.** Se a Conversão está em "Desenvolvendo Conversor" há 45 dias (esperado), não marcar como crítico. Se a Infraestrutura está "Em Reprovado" há 30 dias (crítico), marcar em vermelho.

---

### 4.4 RF-04: Sistema de Comentários e Timeline Automática

**Requisito:**
O sistema deve substituir completamente o campo de texto manual "Observações Gerais" do lists.

**Comportamento:**

1. **Cada alteração gera um log automático:**
   - Mudança de Status → Log: "Status alterado de X para Y".
   - Preenchimento de Data → Log: "Data Fim preenchida em DD/MM".
   - Mudança de Responsável → Log: "Responsável alterado de X para Y".

2. **Usuários podem adicionar contexto:**
   - Via input de comentário na Timeline.
   - Ex: "Aguardando retorno do cliente sobre especificação do equipamento".

3. **Auditoria Completa:**
   - Todos os eventos têm timestamp, autor e mudanças específicas.
   - Permite rastrear "Por que o projeto está parado?"

---

### 4.5 RF-05: Gestão de Permissões Básicas

**Papéis:**

- **Gestor de Implantação:** Acesso total (ler, criar, editar, deletar projetos, adicionar comentários).
- **Analista/Técnico:** Acesso limitado (ler todos os projetos, editar apenas os campos de seu módulo, adicionar comentários).
- **Visualizador:** Apenas leitura.

**Implementação:**
- Campo `role` no usuário: "admin" | "analyst" | "viewer".
- No Drawer, desabilitar inputs de edição para usuários sem permissão.

---

## 5. ARQUITETURA DE DADOS

### 5.1 Schema Principal

```json
{
  "project": {
    "id": "uuid",
    "clientName": "string",
    "ticketNumber": "string (SAC 0800)",
    "systemType": "enum: 'Orion PRO' | 'Orion TN' | 'Orion REG'",
    "projectLeader": "string (name)",
    "createdAt": "datetime",
    "updatedAt": "datetime",
    "lastUpdateBy": "string (user id)",
    "nextFollowUpDate": "date (nullable)",
    "healthScore": "enum: 'ok' | 'warning' | 'critical' (calculated)",
    
    "stages": {
      "infra": {
        "status": "enum: 'todo' | 'in-progress' | 'done' | 'blocked'",
        "responsible": "string (user id)",
        "startDate": "date (nullable)",
        "endDate": "date (nullable)",
        "blockingReason": "string (nullable, só se status = 'blocked')",
        "observations": "text (nullable)"
      },
      "adherence": {
        "status": "enum: 'todo' | 'in-progress' | 'done' | 'blocked'",
        "responsible": "string (user id)",
        "startDate": "date (nullable)",
        "endDate": "date (nullable)",
        "hasProductGap": "boolean",
        "devTicket": "string (nullable)",
        "devEstimatedDate": "date (nullable)",
        "observations": "text (nullable)"
      },
      "environment": {
        "status": "enum: 'todo' | 'in-progress' | 'done' | 'blocked'",
        "responsible": "string (user id)",
        "realDate": "date (nullable)",
        "osVersion": "enum: 'Windows 2016' | 'Windows 2019' | 'Windows 2022' | 'Linux'",
        "approvedByInfra": "boolean (default: false)",
        "observations": "text (nullable)"
      },
      "conversion": {
        "status": "enum: 'todo' | 'analysis' | 'dev-converter' | 'homolog' | 'done'",
        "responsible": "string (user id)",
        "sourceSystem": "enum: 'Siplan' | 'Control-M' | 'Argon' | 'Alkasoft' | 'other'",
        "observations": "text (nullable)"
      },
      "implementation": {
        "status": "enum: 'todo' | 'in-progress' | 'done'",
        "responsible": "string (user id)",
        "remoteInstallDate": "date (nullable)",
        "trainingStartDate": "date (nullable)",
        "trainingEndDate": "date (nullable)",
        "switchType": "enum: 'weekend' | 'business-day'",
        "observations": "text (nullable)"
      },
      "post": {
        "status": "enum: 'todo' | 'in-progress' | 'done'",
        "responsible": "string (user id)",
        "startDate": "date (nullable)",
        "endDate": "date (nullable)",
        "observations": "text (nullable)"
      }
    },

    "timeline": [
      {
        "id": "uuid",
        "type": "enum: 'auto' | 'comment'",
        "author": "string (user id)",
        "message": "string",
        "timestamp": "datetime",
        "metadata": "object (payload da mudança, ex: {field: 'status', oldValue: 'todo', newValue: 'done'})"
      }
    ]
  }
}
```

### 5.2 Schema de Usuário

```json
{
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string (unique)",
    "role": "enum: 'admin' | 'analyst' | 'viewer'",
    "avatar": "string (url image)",
    "createdAt": "datetime"
  }
}
```

---

## 6. FLUXOS DE NEGÓCIO

### 6.1 Fluxo Principal: Criação e Gestão de Projeto

```text
[1. Novo Projeto Criado]
    ↓
[2. Dashboard: Exibir em status "todo", health "ok"]
    ↓
[3. Gestor Abre Drawer, preenche: Cliente, Ticket, Líder, Sistema]
    ↓
[4. Designa Responsável por Infra → Sistema gera log automático]
    ↓
[5. Responsável por Infra acessa, preenche: Status, Datas, Obs → Log automático]
    ↓
[6. Gestor vê no Dashboard: Infra agora "in-progress" (🟡)]
    ↓
[Se Infra = "Reprovado"]
    → Card fica com borda vermelha
    → Próximo Follow-up é automático para "hoje + 3 dias"
    → Aviso visual "⚠️ Aguardando Comercial"
    ↓
[Se Infra = "done"]
    → Prosseguir para Aderência
    → Sistema pode sugerir próximo responsible (baseado em padrão)
    ↓
[Continuidade...]
```

### 6.2 Fluxo de Exceção: Bloqueio por Impedimento

```text
[Análise de Aderência identifica Gap de Produto]
    ↓
[Analista ativa "Pendência de Produto?" = Sim]
    ↓
[Sistema exibe campos: Ticket Dev + Prazo]
    ↓
[Card fica com borda AMARELA (alerta, não crítico)]
    ↓
[Timeline loga: "Pendência de Produto identificada: Ticket #1234"]
    ↓
[No Dashboard, o projeto continua "in-progress" (não bloqueado)]
    ↓
[Quando Dev termina o ticket]
    → Analista atualiza: "Pendência de Produto?" = Não
    → Card volta ao visual normal
    → Pode prosseguir com Aderência
```

### 6.3 Fluxo de Rastreabilidade: Descobrindo Por Que Parou

```text
[Gestor vê projeto em "critical" (vermelho)]
    ↓
[Clica "Ver Detalhes"]
    ↓
[Abre Drawer, vê Timeline]
    ↓
[Lê últimos eventos: "Infra reprovado em 20/11 por João → Motivo: Aguardando Compra Servidor"]
    ↓
[Conclusão imediata: "O problema é externo (Comercial), não é culpa da Implantação"]
    ↓
[Pode enviar comentário: "Vou cobrar Comercial hoje sobre a compra"]
```

---

## 7. ESPECIFICAÇÕES DE INTERFACE

### 7.1 Design System

**Paleta de Cores:**

- **Primária:** Roxo/Violeta (#7C3AED ou similar, referência Siplan).
- **Secundária:** Azul suave.
- **Fundo Principal:** #F8F9FA (cinza muito claro).
- **Cards:** Branco (#FFFFFF) com shadow-sm.
- **Status Verde:** #22C55E (sucesso).
- **Status Amarelo:** #EAB308 (atenção).
- **Status Vermelho:** #EF4444 (crítico/erro).
- **Status Cinza:** #A3A3A3 (não iniciado).

**Tipografia:**

- **Font Family:** Inter, sans-serif.
- **Headlines:** Bold, tamanho 16-24px.
- **Corpo:** Regular 14px.
- **Labels:** Semibold 12px.

**Componentes Base:**

- Usar **Shadcn UI** para componentes padrão (Button, Select, Input, Card, etc.).
- Usar **Lucide React** para ícones.
- Layout responsivo com Tailwind CSS.

### 7.2 Responsividade

- **Desktop (1200px+):** Layout full split-view (Drawer com 2 colunas).
- **Tablet (768px - 1199px):** Drawer com colunas empilhadas (formulário em cima, timeline em baixo).
- **Mobile (< 768px):** Drawer full-screen, tab-based (abas: "Form" vs "Timeline").

---

## 8. LÓGICA DE NEGÓCIO DETALHADA

### 8.1 Cálculo Automático de `lastUpdateDate`

Sempre que qualquer campo de um projeto é alterado (status, data, responsável, comentário), o sistema automaticamente atualiza `lastUpdateDate = agora`.

**Usada para:**

- Calcular "Dias sem Atualização" no Dashboard.
- Determinar Health Score.

### 8.2 Regra de Health Score Sensível ao Contexto

**Cenários:**

1. **Projeto em "Conversão" há 45 dias em status "dev-converter":**
   - Esperado para sistemas novos.
   - **Não marcar como crítico.**
   - Health: 🟡 (warning) se não houver comentários nos últimos 7 dias.

2. **Projeto em "Infra" há 10 dias com status "blocked":**
   - Crítico.
   - **Marcar como 🔴 crítico.**

3. **Projeto com "Pendência de Produto?" = Sim há 20 dias:**
   - Development geralmente leva tempo.
   - **Marcar como 🟡 warning, não crítico.**
   - Mas se o dev ticket tem data de prazo vencida, marcar 🔴.

### 8.3 Próximo Follow-up Automático

Quando um projeto é criado ou atinge certos estados, o sistema pode sugerir automaticamente um `nextFollowUpDate`:

- Projeto novo: "Hoje + 1 dia".
- Projeto bloqueado retorna ao Comercial: "Hoje + 3 dias".
- Projeto em Conversão há > 20 dias: "Hoje".

O gestor pode **override** essa sugestão manualmente.

### 8.4 Notificações e Alertas (MVP)

No dashboard, highlighting automático:

- Se `nextFollowUpDate <= hoje` e projeto não está "done": **borda laranja ou ícone ⚠️**.
- Se `diasSemUpdate > 5`: **borda vermelha**.
- Se projeto tem um card com "Pendência de Produto?" = Sim: **borda amarela do card**.

### 8.5 Permissões de Edição por Papel

| Campo / Ação | Admin | Analyst | Viewer |
| --- | --- | --- | --- |
| Criar Novo Projeto | ✅ | ❌ | ❌ |
| Editar Dados Gerais | ✅ | ❌ | ❌ |
| Editar Card de seu módulo | ✅ | ✅ (se assigned) | ❌ |
| Editar Card de outro módulo | ✅ | ❌ | ❌ |
| Adicionar Comentário | ✅ | ✅ | ❌ |
| Ver Timeline | ✅ | ✅ | ✅ |
| Deletar Projeto | ✅ | ❌ | ❌ |

---

## 9. CRITÉRIOS DE ACEITAÇÃO

### 9.1 Teste de Negócio: Gestor identifica gargalo em < 10 segundos

**Cenário:**
Gestor abre o dashboard pela manhã. Há 15 projetos ativos. Sem clicker em nenhum, ele deve ser capaz de identificar que o projeto "Mogi-Mirim" (Orion PRO) está há 7 dias sem atualização.

**Critério de Aceitação:**

- Dashboard renderiza com visibilidade de health score.
- "Mogi-Mirim" aparece com borde laranja ou badge 🔴 "Crítico".
- Coluna "Última Atualização" exibe "7 dias atrás".

---

### 9.2 Teste de Negócio: Rastreabilidade completa

**Cenário:**
Gestor abre o projeto de Mogi-Mirim, clica no Drawer, vê a Timeline. A partir dela, consegue contar a história inteira do projeto (quando começou, quem mexeu em quê, por quê parou).

**Critério de Aceitação:**

- Timeline exibe mínimo 10 eventos (logs automáticos + comentários).
- Cada log mostra: "Status alterado de X para Y em DD/MM às HH:MM por NOME".
- Comentários de usuários mostram avatar, nome, timestamp, texto.
- Gestor consegue, em <= 2 minutos, entender completamente o status do projeto.

---

### 9.3 Teste de Usabilidade: Responsável preenche campo em < 1 minuto

**Cenário:**
Analista recebe um chamado do gestor: "Atualize o status de Aderência para Finalizado". Abre o Drawer, encontra o Card de Aderência, atualiza o status.

**Critério de Aceitação:**

- Encontra o Card em < 10 segundos.
- Consegue mudar o status sem preencher campos irrelevantes.
- Após clicar "Salvar", recebe feedback visual (toast/snackbar) confirmando a mudança.
- Logout automático adicionado: O log aparece imediatamente na Timeline.

---

### 9.4 Teste de Validação de Dados

**Cenário:**
Usuário tenta salvar um projeto com Status de Infra = "done" mas Data Fim vazia.

**Critério de Aceitação:**

- Sistema exibe mensagem de erro: "Data Fim é obrigatória quando Status = Finalizado".
- Campo é destacado em vermelho.
- Botão "Salvar" desabilitado até que o campo seja preenchido.

---

## 10. ROADMAP DE IMPLEMENTAÇÃO

### Fase 1 (Sprint 1-2): MVP - Dashboard + Drawer Básico

- ✅ Dashboard com tabela de projetos.
- ✅ Drawer com formulário modular.
- ✅ Timeline com logs automáticos e comentários.
- ✅ Health Score calculado.
- ✅ Permissões básicas (Admin vs Analyst).

### Fase 2 (Sprint 3-4): Refinamento e Alertas

- ✅ Sistema de alertas visuais (destacar projetos em risco).
- ✅ Notificações (badge no menu, lista de "próximos follow-ups").
- ✅ Exportar relatório em PDF.

### Fase 3 (Sprint 5+): Avançados

- ✅ Integração com SAC 0800 (devolução automática de chamados ao Comercial).
- ✅ Dashboard de BI (gráficos, tempo médio por etapa, gargalos).
- ✅ Notificações via Slack/Email.
- ✅ Mobile App.
- ✅ Integração com n8n para automação.

---

FIM DO DOCUMENTO PRD
