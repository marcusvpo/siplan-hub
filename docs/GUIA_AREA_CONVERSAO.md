# 📘 Guia Completo: Área de Conversão

> Manual de uso do módulo de Conversão do Siplan HUB - Integração entre equipes de Implantação e Conversão

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Fluxo de Trabalho Completo](#fluxo-de-trabalho-completo)
3. [Para a Equipe de Implantação](#para-a-equipe-de-implantação)
4. [Para a Equipe de Conversão](#para-a-equipe-de-conversão)
5. [Para Administradores](#para-administradores)
6. [Sistema de Notificações](#sistema-de-notificações)
7. [FAQ - Perguntas Frequentes](#faq---perguntas-frequentes)

---

## 🎯 Visão Geral

A Área de Conversão foi criada para:
- **Separar responsabilidades** entre equipes de Implantação e Conversão
- **Criar uma fila de trabalho** organizada e priorizada
- **Melhorar a comunicação** com notificações automáticas
- **Dar visibilidade** sobre o status de cada conversão
- **Rastrear problemas** e mapeamentos de dados

### Estrutura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SIPLAN HUB                                    │
├───────────────────────┬─────────────────────┬───────────────────────┤
│   IMPLANTAÇÃO         │     CONVERSÃO       │    ADMINISTRAÇÃO      │
├───────────────────────┼─────────────────────┼───────────────────────┤
│ • Dashboard geral     │ • Dashboard próprio │ • Gerenciar áreas     │
│ • Projetos            │ • Fila de trabalho  │ • Atribuir membros    │
│ • Etapas do projeto   │ • Mapeamentos       │ • Configurações       │
│ • Enviar p/ conversão │ • Problemas         │                       │
└───────────────────────┴─────────────────────┴───────────────────────┘
```

---

## 🔄 Fluxo de Trabalho Completo

### Diagrama do Processo

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ IMPLANTAÇÃO  │────▶│  CONVERSÃO   │────▶│ HOMOLOGAÇÃO  │────▶│  CONCLUÍDO   │
│ envia projeto│     │  trabalha    │     │   cliente    │     │  volta p/    │
│              │     │              │     │   valida     │     │  implantação │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
      │                    │                    │                     │
      ▼                    ▼                    ▼                     ▼
  Notifica            Notifica se          Notifica se           Notifica
  Conversão           houver problema      aprovado/reprovado    Implantação
```

### Status da Fila de Conversão

| Status | Descrição | Próximo passo |
|--------|-----------|---------------|
| 🟡 **Pendente** | Aguardando alguém assumir | Membro assume o projeto |
| 🔵 **Em Andamento** | Conversão em execução | Trabalhar na conversão |
| 🟠 **Aguard. Cliente** | Dependência externa | Aguardar resposta |
| 🟣 **Homologação** | Cliente validando dados | Aguardar aprovação |
| 🟢 **Concluído** | Conversão finalizada | Volta para Implantação |

---

## 👷 Para a Equipe de Implantação

### Como Enviar um Projeto para Conversão

1. **Acesse o projeto** desejado clicando no card na lista de projetos

2. **Navegue até a aba "Etapas"** no painel lateral

3. **Localize a seção "Conversão"** (ícone de banco de dados roxo)

4. **Clique no botão "Enviar para Conversão"**
   - Um diálogo de confirmação aparecerá
   - Confirme o envio

5. **Pronto!** O projeto agora está na fila da equipe de Conversão

### O que acontece após o envio?

- ✅ O projeto entra na **fila de conversão** com status "Pendente"
- ✅ A **equipe de conversão é notificada** automaticamente
- ✅ O status da etapa de conversão muda para **"Em Andamento"**
- ✅ A data de envio é registrada automaticamente
- ✅ Um **badge roxo "Conversão"** aparece no card do projeto

### Como acompanhar o progresso?

1. **No card do projeto**: O badge roxo indica que está em conversão
2. **Na etapa de Conversão**: Mostra o status atual e responsável
3. **Nas notificações**: Você receberá alertas sobre mudanças de status

### Visualizando o status no projeto

Quando o projeto está na fila de conversão, você verá:

```
┌─────────────────────────────────────────┐
│ ✅ Na Fila de Conversão                 │
│                                          │
│ Status: Em Andamento                     │
│ Responsável: João Silva                  │
└─────────────────────────────────────────┘
```

---

## 🔧 Para a Equipe de Conversão

### Acessando o Dashboard de Conversão

1. No menu lateral, clique em **"Conversão"**
2. Escolha **"Dashboard"** para ver a visão geral

### Entendendo o Dashboard

O dashboard mostra:

#### KPIs (Cards no topo)
- 📋 **Pendentes**: Projetos aguardando atribuição
- 🔄 **Em Andamento**: Conversões ativas
- ⏳ **Aguard. Cliente**: Dependências externas
- 🔍 **Homologação**: Em validação
- ✅ **Finalizados (mês)**: Concluídos este mês
- 📊 **Dias na Fila**: Média de tempo

#### Fila de Trabalho (Tabela principal)

| Coluna | Descrição |
|--------|-----------|
| **Prioridade** | 1 (crítico) a 10 (baixa) |
| **Cliente** | Nome do cliente |
| **Sistema** | Tipo de sistema |
| **Origem** | Sistema legado |
| **Complexidade** | Alta/Média/Baixa |
| **Volume** | Tamanho em GB |
| **Status** | Estado atual |
| **Responsável** | Quem está trabalhando |
| **Na Fila** | Há quantos dias |
| **Ações** | Botões de ação |

### Assumindo um Projeto

1. **Encontre um projeto com status "Pendente"**
2. **Clique no botão "Assumir"** (ícone de usuário)
3. O projeto mudará para "Em Andamento" e será atribuído a você

### Atualizando o Status

Use os botões de ação para mudar o status:

| Botão | Ação |
|-------|------|
| 🔄 **Em Andamento** | Voltar a trabalhar |
| ⏳ **Aguard. Cliente** | Aguardando resposta |
| 🔍 **Homologação** | Enviar para validação |
| ✅ **Finalizar** | Marcar como concluído |

### Gerenciando Mapeamentos

Acesse **Conversão → Mapeamentos** para:

1. **Visualizar** mapeamentos por projeto
2. **Adicionar** novas tabelas e campos
3. **Documentar** scripts de conversão
4. **Buscar** mapeamentos existentes

#### Criando um Mapeamento

```
┌─────────────────────────────────────────┐
│ Novo Mapeamento                          │
├─────────────────────────────────────────┤
│ Projeto:     [Selecionar projeto]       │
│ Sistema Origem: [Ex: Domínio Sistemas]  │
│ Tabela Origem:  [Ex: TB_CLIENTES]       │
│ Tabela Destino: [Ex: clientes]          │
│ Campos:         [Mapear campos]         │
│ Script SQL:     [Código opcional]       │
└─────────────────────────────────────────┘
```

### Registrando Problemas

Acesse **Conversão → Problemas** para:

1. **Reportar** novos problemas encontrados
2. **Priorizar** por urgência (crítico/alto/médio/baixo)
3. **Acompanhar** resolução
4. **Documentar** soluções

#### Criando um Problema

```
┌─────────────────────────────────────────┐
│ Novo Problema                            │
├─────────────────────────────────────────┤
│ Projeto:     [Selecionar projeto]       │
│ Título:      [Descrição curta]          │
│ Prioridade:  [Crítico/Alto/Médio/Baixo] │
│ Descrição:   [Detalhes do problema]     │
└─────────────────────────────────────────┘
```

### Finalizando uma Conversão

1. Certifique-se de que **todos os dados foram convertidos**
2. Verifique se **não há problemas pendentes**
3. Clique em **"Finalizar"** na fila
4. A equipe de implantação será **notificada automaticamente**

---

## ⚙️ Para Administradores

### Gerenciando Áreas de Equipe

Acesse **Admin → Áreas** para atribuir membros às áreas:

1. Veja todos os **membros cadastrados**
2. Use o seletor para **mudar a área** de cada membro
3. Clique em **"Salvar Alterações"** para aplicar

#### Áreas Disponíveis

| Área | Descrição |
|------|-----------|
| 🔵 **Implantação** | Equipe de implementação |
| 🟣 **Conversão** | Equipe de conversão de dados |
| 🟢 **Comercial** | Equipe comercial |
| 🟡 **Suporte** | Equipe de suporte |

### Configurando Notificações

As notificações são enviadas automaticamente para a equipe correta baseado na área atribuída ao membro.

---

## 🔔 Sistema de Notificações

### Tipos de Notificação

| Tipo | Quem recebe | Quando |
|------|-------------|--------|
| **Nova Demanda** | Conversão | Projeto enviado para conversão |
| **Atribuição** | Membro específico | Projeto atribuído |
| **Mudança de Status** | Implantação | Status alterado |
| **Problema Reportado** | Implantação | Novo problema registrado |
| **Conversão Finalizada** | Implantação | Conversão concluída |

### Acessando Notificações

1. Clique no **ícone de sino** no cabeçalho
2. Veja a lista de **notificações não lidas**
3. Clique em uma notificação para **ir ao projeto**
4. Use **"Marcar todas como lidas"** para limpar

### Indicador de Notificações

- 🔴 **Badge vermelho**: Número de notificações não lidas
- O contador é atualizado **em tempo real**

---

## 📅 Um Dia Típico na Plataforma

### Manhã - Equipe de Implantação

```
09:00 │ Login no Siplan HUB
      │ ↓
09:05 │ Verificar notificações
      │ • "Conversão do Cliente ABC finalizada"
      │ ↓
09:10 │ Revisar projetos que voltaram da conversão
      │ ↓
09:30 │ Avançar etapa de Ambiente dos projetos prontos
      │ ↓
10:00 │ Enviar novos projetos para conversão
      │ • Projeto "Cliente XYZ" → Conversão
      │ • Projeto "Cliente DEF" → Conversão
```

### Manhã - Equipe de Conversão

```
09:00 │ Login no Siplan HUB
      │ ↓
09:05 │ Acessar Dashboard de Conversão
      │ ↓
09:10 │ Verificar fila
      │ • 3 projetos pendentes
      │ • 2 projetos em andamento
      │ ↓
09:15 │ Assumir projeto pendente mais crítico
      │ ↓
09:30 │ Iniciar conversão do projeto
      │ • Analisar estrutura do sistema legado
      │ • Criar mapeamentos de tabelas
      │ ↓
11:00 │ Reportar problema encontrado
      │ • "Campo CPF com formato inválido"
      │ ↓
11:30 │ Continuar conversão dos demais campos
```

### Tarde - Equipe de Conversão

```
14:00 │ Retomar trabalho
      │ ↓
14:30 │ Finalizar mapeamento do projeto
      │ ↓
15:00 │ Executar scripts de conversão
      │ ↓
16:00 │ Enviar para homologação do cliente
      │ • Status: "Homologação"
      │ ↓
17:00 │ Cliente aprova conversão
      │ ↓
17:15 │ Finalizar conversão
      │ • Status: "Concluído"
      │ • Implantação notificada
```

---

## ❓ FAQ - Perguntas Frequentes

### Geral

**P: Preciso sair do meu fluxo normal para usar a conversão?**
> R: Não! O botão "Enviar para Conversão" está dentro da etapa de Conversão do projeto. É apenas um clique adicional no seu fluxo atual.

**P: Posso cancelar um envio para conversão?**
> R: No momento, entre em contato com o administrador para remover um projeto da fila.

### Para Implantação

**P: Como sei quando a conversão foi finalizada?**
> R: Você receberá uma notificação automática. Também pode verificar o badge roxo no card do projeto.

**P: Posso ver o progresso da conversão?**
> R: Sim! Na aba Etapas do projeto, a seção Conversão mostra o status atual e responsável.

### Para Conversão

**P: Como priorizo os projetos?**
> R: Use a coluna de prioridade. Quanto menor o número, mais urgente (1 = crítico).

**P: Posso trabalhar em mais de um projeto?**
> R: Sim, você pode assumir quantos projetos conseguir gerenciar.

**P: O que faço se o cliente demora a responder?**
> R: Mude o status para "Aguardando Cliente" e registre o motivo nas notas.

### Para Administradores

**P: Como adiciono novos membros à área de conversão?**
> R: Acesse Admin → Áreas, encontre o membro e selecione "Conversão" na coluna de área.

**P: Posso criar novas áreas?**
> R: As áreas são fixas no momento: Implantação, Conversão, Comercial e Suporte.

---

## 📊 Métricas e KPIs

### Indicadores Monitorados

| KPI | Descrição | Meta sugerida |
|-----|-----------|---------------|
| **Tempo na Fila** | Média de dias até conclusão | < 5 dias |
| **Pendentes** | Projetos sem responsável | < 3 projetos |
| **Taxa de Problemas** | Problemas por conversão | < 2 por projeto |
| **Finalizados/Mês** | Conversões concluídas | Crescimento contínuo |

### Acessando Métricas

Os KPIs estão disponíveis no topo do Dashboard de Conversão com atualização em tempo real.

---

## 🚀 Próximos Passos

Após dominar o básico, explore:

1. **Mapeamentos reutilizáveis**: Salve mapeamentos para sistemas frequentes
2. **Filtros personalizados**: Filtre a fila por status, prioridade ou responsável
3. **Notas colaborativas**: Documente dicas e soluções para a equipe

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
- Consulte este manual
- Entre em contato com o administrador do sistema
- Reporte bugs através do sistema de tickets

---

*Documento criado em: 02/02/2026*
*Versão: 1.0*
