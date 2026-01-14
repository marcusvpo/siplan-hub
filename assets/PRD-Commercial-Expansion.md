# PRD - Expansão Comercial: Acompanhamento de Implantação

## 1. Princípios Gerais

### 1.1 Foco em Acompanhamento (Não Financeiro)

- O objetivo é **Sucesso do Cliente** e **Pós-Venda**.
- **Excluídos**: Contratos, Valores, Oportunidades, Pipeline de Vendas, Probabilidades.
- **Foco**: Bloqueios, Prazos, Satisfação, Interlocutores.

### 1.2 Visão Centrada no Cliente

- A hierarquia muda de `Projeto` para `Cliente > Projetos`.
- O Comercial busca "Como está o Cliente X?" e vê todos os projetos (Orion PRO, Migrações, Chamados Especiais) aglutinados.

### 1.3 Reaproveitamento de Dados

- Não haverá duplicidade de dados de status.
- O Comercial visualiza os mesmos dados que a Implantação gera (Infra, Aderência, etc.), mas com uma lente de "Gestão de Relacionamento".
- Bloqueios da Implantação são projetados na visão Comercial.

---

## 2. Novos Conceitos e Entidades

### 2.1 Modelo: Cliente (`clients`)

Entidade raiz para o agrupamento comercial.

- **Campos**:
  - `id`: UUID (PK)
  - `name`: String (Nome do Cartório/Empresa) - Chave de unicidade lógica.
  - `document`: String (CNPJ/CPF) - Opcional.
  - `notes`: Text (Notas gerais do relacionamento comercial, ex: "Cliente sensível a prazos").
  - `health_status`: Enum/String (Derivado dos projetos: 'ok', 'warning', 'critical').
  - `created_at`, `updated_at`.

### 2.2 Modelo: Contato (`client_contacts`)

Agenda de contatos unificada por cliente.

- **Campos**:
  - `id`: UUID
  - `client_id`: UUID (FK)
  - `name`: String
  - `role`: String (Cargo/Papel - ex: "Tabelião", "TI", "Gerente")
  - `email`, `phone`: String
  - `is_primary`: Boolean (Contato focal?)
  - `notes`: Text (Observações específicas sobre a pessoa, ex: "Prefere contato via WhatsApp").

### 2.3 Relacionamento Cliente ↔ Projetos

- Adição de `client_id` na tabela `projects`.
- Migração dos dados existentes: Agrupamento pelo campo string `client_name` atual para criar os registros na tabela `clients`.

### 2.4 Bloqueios Relevantes (`ProjectBlocker` View)

- Não é uma nova tabela, mas uma query filtrada/view.
- **Definição**: Projetos onde `status` de qualquer etapa é 'blocked' OU `health_score` é 'critical'.
- **Classificação Comercial**:
  - *Aguardando Cliente*: Infra pendente, Dúvida de regra de negócio.
  - *Críticos*: Bloqueios com duração > 5 dias.

---

## 3. Interfaces (UX/UI)

### 3.1 Tela 1: Acompanhamento de Bloqueios (`/commercial/blockers`)

**Objetivo**: Painel de "Ação Necessária". Lista plana de impedimentos.

- **Layout**: DataGrid otimizado.
- **Colunas**:
  - **Cliente**: Nome + Link para Visão Geral.
  - **Projeto**: Nome do Sistema (ex: Orion PRO).
  - **Bloqueio**: Etapa (ex: Infra) + Motivo (ex: Aguardando Servidor).
  - **Tempo**: Dias bloqueado (Badge: Amarelo < 3 dias, Vermelho > 3 dias).
  - **Responsável Implantação**: Avatar/Nome.
  - **Ações**: Botão "Assumir/Tratar" (Adicionar comentário comercial).
- **Filtros**:
  - "Meus Clientes" (se houver carteira), Status (Crítico/Atenção).

### 3.2 Tela 2: Gestão de Contatos (`/commercial/contacts`)

**Objetivo**: Catálogo telefônico inteligente integrado aos projetos.

- **Layout**:
  - Esquerda: Lista de Clientes (Busca rápida).
  - Direita: Grid de Cards de Contatos do cliente selecionado.
- **Card de Contato**:
  - Nome, Cargo (destaque).
  - Botões rápidos: Copiar Email, Link WhatsApp.
  - Tags de contexto: "Decisor", "Técnico", "Financeiro".
  - Indica em quais projetos ele está envolvido (se houver link direto futuramento).
- **CRUD**: Adicionar/Editar contatos via Modal Lateral (Drawer).

### 3.3 Tela 3: Visão Geral do Cliente (`/commercial/client/:id`)

**Objetivo**: A "Home" do Cliente.

- **Header**:
  - Nome do Cliente, Badges de Tags, Saúde Geral.
  - Destaque para Contato Principal (Card mini).
- **Seção A: Projetos Ativos**
  - Lista de cards horizontais.
  - Resumo: Sistema | Fase Atual | Health Score | Prazo Estimado.
  - Barra de Progresso visual das etapas (reaproveitando componente do Dashboard de Implantação).
- **Seção B: Bloqueios Ativos**
  - Lista filtrada apenas deste cliente.
- **Seção C: Timeline Comercial**
  - Feed unificado de eventos de TODOS os projetos deste cliente.
  - Filtro automático para esconder logs técnicos irrelevantes (ex: "update de os_version").
  - Foco em: Mudanças de etapa, Bloqueios, Comentários.
- **Seção D: Notas Globais**
  - Textarea rich de anotações persistentes sobre o relacionamento.

---

## 4. Estratégia de Implementação (Roadmap Técnico)

1. **Database**: Executar migração SQL (criar `clients`, `client_contacts`, popular dados).
2. **Backend/Types**: Atualizar definições TypeScript do Supabase.
3. **Layout**: Criar `CommercialLayout` com Sidebar específica.
4. **Components**:
   - Abstrair `ProjectStagePills` e `HealthBadge` para reuso.
   - Criar `ContactCard` e `BlockerRow`.
5. **Pages**:
   - Implementar Rotas (`/commercial/*`).
   - Conectar com Supabase.
