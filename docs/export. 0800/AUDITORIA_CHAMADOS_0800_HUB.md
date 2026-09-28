# Levantamento Executivo e Auditoria Pericial de Chamados 0800 x Siplan HUB (/projects)

**Data de Conclusão da Auditoria:** 26 de Setembro de 2026  
**Interface Web Interativa:** [`docs/export. 0800/relatorio-levantamento-chamados-siplan.html`](./relatorio-levantamento-chamados-siplan.html)  
**Total de Planilhas Auditadas:** 5 (SGA, LCW, Orion GED, Conversão, Implantação e Treinamento)  
**Total de Ocorrências Consolidadas:** 295 ocorrências ativas no 0800 (279 chamados únicos)  
**Total de Serventias Únicas Mapeadas:** 68 cartórios  
**Base do Siplan HUB:** 82 projetos cadastrados no Supabase (39 *Done*, 41 *In-Progress*, 2 *Blocked*)  
**Base Histórica Analisada no Banco Oficial (Postgres Supabase):** 160.116 chamados e 92.055 trâmites auditados via scripts periciais

---

## 1. Visão Geral da Interface e Recursos Desenvolvidos

A visualização foi aprimorada com foco estritamente **operacional, limpo e profissional**, alinhado ao Design System do **Siplan HUB**:
- **Design System Siplan:** Fundo claro/off-white (`#ffffff`, `#f8fafc`), bordas sutis (`#e2e8f0`), tipografia `Plus Jakarta Sans` e cor primária institucional em **Vermelho Vinho / Bordô (`#800020`, `hsl(346, 84%, 45%)`)**.
- **Nova Hierarquia Visual do Card:**
  1. **Topo:** Nome do Cartório em destaque visual de primeiro nível, tags do chamado `#000000`, produto, status 0800, indicador de chamado principal vs secundário, status do projeto no HUB (`🚨 HUB Concluído` ou `🔄 HUB Em Andamento`), dias em aberto e botão de trâmites.
  2. **Meio:** Título da OP / Assunto, atendente responsável, data de abertura, último trâmite e descrição retrátil.
  3. **Parte Inferior:** Bloco de **Diagnóstico da IA e Evidência Documental**, com o veredito, a citação literal com aspas do trâmite do chamado principal (core), autor, data e Ação Recomendada.
  4. **Rodapé de Decisão do Auditor:** Seletor de status com cores + campo de parecer/anotações com autosave no `localStorage`.
- **Três Modos de Exibição no Topo:**
  - 🗂️ **Modo Cards:** Visão detalhada chamado a chamado com timeline de evidências.
  - 🏛️ **Modo Por Cartório (Visão 360º):** Agrupa todos os chamados pela serventia/cliente em gavetas estruturadas, separando chamados principais (Core) de chamados secundários (LCW, SGA, GED, Conversão), com botão de ação em lote por cartório.
  - 📋 **Modo Tabela Compacta:** Tabela de alta densidade estilo planilha com selects e inputs inline, eliminando a rolagem vertical para auditorias rápidas.
- **Exportação Nativa para Excel (.XLSX) Multi-Abas:**
  - Gera diretamente no navegador uma pasta de trabalho `.xlsx` com formatação de larguras e 5 abas operacionais (sem valores financeiros):
    1. *Baixa Imediata (Homologados)*
    2. *Validar c/ Consultor*
    3. *Backoffice em Andamento*
    4. *Chamados Fantasmas*
    5. *Consolidado Geral (295)*
- **Modo de Impressão Executiva (PDF Limpo para Diretoria):**
  - Botão *"Imprimir / PDF"* configurado com `@media print` para ocultar controles web e gerar um documento formal com cabeçalho institucional, indicadores em caixas elegantes, sem quebra indevida de páginas e com textos limpos no lugar de formulários editáveis.

---

## 2. A Descoberta Operacional: Tratativas Centralizadas no Chamado Core

### 2.1. O Mecanismo dos Chamados Secundários
Durante a auditoria forense dos 92.055 trâmites no banco de dados, confirmou-se a regra operacional informada:
1. **Chamados Secundários (LCW = Livro Caixa Web, SGA = Sistema de Gestão de Atendimento, Orion GED e Conversão):**
   - Na abertura da Ordem de Produção (OP), o sistema 0800 gera automaticamente um chamado para cada produto contratado.
   - **Prática de Campo:** Os implantadores (Rodrigo Brites, Bruno Matos, Alex Silva, Rodrigo Mizuno, etc.) realizam o treinamento e a configuração de campo de todos os produtos durante a mesma visita técnica presencial ou remota.
   - **Registro das Atividades:** O implantador registra o diário de bordo e a ata de treinamento exclusivamente nos trâmites do **chamado do sistema principal** (Orion TN, Orion PRO ou Orion REG).
   - **A Consequência:** O chamado secundário de LCW, SGA ou GED permanece no 0800 com status *"Não iniciado"* ou *"Em andamento"*, parecendo abandonado há 90, 180 ou até 960 dias, quando na realidade o serviço já foi concluído há meses!

---

## 3. O Caso Emblemático: Miguelópolis (Tabelionato de Notas e Protesto)

O caso de **Miguelópolis** é a representação perfeita dessa dinâmica:
- **No Siplan HUB (/projects):**
  - Projeto Orion TN (`#742699`) com status **Concluído (`done`)**.
  - Projeto Orion PRO (`#742696`) com status **Concluído (`done`)**.
- **No 0800 (Fila de Chamados):**
  - Chamado **#742700 (LCW - Livro Caixa Web)**: Aberto há 96 dias como *"Não iniciado"*.
  - Chamado **#742696 (Orion PRO)**: Aberto há 96 dias.
  - Chamado **#757439 (Conversão de Dados)**: Aberto há 11 dias.
- **Evidência Pericial Encontrada no Chamado Principal (`#742699`):**
  - **Trâmite Nº 20** (20/08/2026 às 21:19, por **Rodrigo Brites - Siplan**):
    > *"...e setor de escrituras. -Conferência no Livro caixa e repasse no treinamento de escrituração usando o Livro Caixa Web, importação do movimento do protesto no OrionTN para unificar os relatórios..."*
  - **Trâmite Nº 23** (27/08/2026 às 21:57, por **Luciane Lima - Siplan**):
    > *"...Brites homologou com a cliente, subimos em produção e com isso encerramos todas as pendências de conversão desse cliente. Finalizado a conversão."*
- **Diagnóstico da IA:**
  - O Livro Caixa Web e a Conversão foram **comprovadamente implantados, testados e homologados**.
  - **Ação Imediata:** Realizar a baixa dos chamados `#742700` e `#757439` no 0800 como *"Concluído / Resolvido"* e comunicar a conclusão formal da implantação ao setor Administrativo.

---

## 4. Matriz dos 4 Vereditos do Diagnóstico da IA

O motor de IA categorizou todos os chamados auditados em 4 quadrantes operacionais:

| Veredito da IA | Significado Operacional | Volume | Ação Recomendada |
| :--- | :--- | :---: | :--- |
| 🟢 **EVIDENCIA_ENTREGA_CONFIRMADA** | Evidência documental explícita nos trâmites do core comprovando entrega do produto/serviço. | **40 chamados** | **Finalizar e baixar imediatamente no 0800**; comunicar encerramento de entrega ao setor Administrativo. |
| 🟡 **CONTATAR_IMPLANTADOR** | Projeto principal concluído (`done`) no HUB, mas o produto secundário não foi citado nos trâmites do core. | **15 chamados** | **Fazer contato com o implantador responsável antes da baixa** para averiguar se o produto foi instalado ou se houve recusa/pendência de hardware. |
| 🔵 **BACKOFFICE_EM_ANDAMENTO** | Projeto principal está ativamente em execução (`in-progress`) no HUB. | **54 chamados** | **Manter em andamento legítimo**; o chamado secundário aguarda a virada oficial do sistema principal. |
| 🟣 **CHAMADO_FANTASMA_BAIXAR** | Trâmites registram devolução de totem, cancelamento de contrato ou container Docker reiniciado. | **33 chamados** | **Encerrar sumariamente no 0800** por perda de objeto ou resolução técnica já efetuada. |
| ⏳ **CLIENTE_LEGADO_SUPORTE** | Chamados operacionais fora do HUB (dúvidas contábeis de LCW, conciliação XML, suporte rotineiro). | **153 chamados** | Triagem pelo Suporte N1/N2 para encerramento de chamados sem interação há mais de 90 dias. |

---

## 5. Casos Periciais Críticos: Onde Baixar e Onde Não Baixar às Cegas

#### 🟢 Casos de Baixa Imediata por Entrega Comprovada:
- **Miguelópolis (`#742700` LCW e `#757439` Conversão):** Trâmites 20 (Rodrigo Brites) e 23 (Luciane Lima) comprovam treinamento e encerramento de conversão.
- **Santos - 2º Tabelionato de Notas (`#717614` e `#717626` - Orion GED):** Abertos há 247 dias. Bruno Matos atestou download de imagens e inicialização dos containers Docker. Baixa imediata!
- **Salto - 2º Tabelionato de Notas (`#679686` - Conversão):** Aberto há 465 dias. Luciane Lima atestou: *"- Finalizado a conversão dos documentos apresentados... Com essa etapa finalizamos a conversão Siplan TN para Orion TN"*. Baixa imediata!
- **São Caetano do Sul - 4º Notas (`#747695` e `#745688` - Conversão):** Carga concluída de 3.999 imagens e migração do Escriba homologada. Baixa imediata!
- **Catanduva - 1º Notas e Protesto (`#737081`):** Rodrigo Brites e equipe confirmaram conversão de escrituras/procurações e emissão de RPS da prefeitura. Baixa imediata!
- **São Bernardo do Campo - 4º Notas (`#679456` e `#679465`):** Abertos há 467 dias. Retidos apenas por pesquisa de satisfação telefônica sem resposta. Baixa imediata!
- **Americana RI (`#718622`) e Ourinhos RI (`#705051`):** Despachos formais de encerramento emitidos em 09/09/2026 arquivados nos trâmites. Baixa imediata!

#### 🟡 Casos Onde NÃO se Deve Baixar às Cegas (Contatar Implantador):
- **Catanduva - 1º Registro de Imóveis (`#724462`):** O Orion REG virou, mas a consultora Soraya Molina alertou que o cartório **não adquiriu os totens/TVs do SGA**. Portanto, o SGA **não foi instalado**. **Não baixar!** Validar com o coordenador Bruno Fernandes.
- **Mogi das Cruzes - 2º Notas (`#725487`):** O implantador Rodrigo Mizuno treinou apenas Protesto. Nos 29 trâmites do core não há menção de LCW. Consultar Mizuno antes de dar baixa.
- **Mogi-Mirim - 1º Notas (`#591364` - LCW):** Aberto há 962 dias. Chamado core encerrado em 2024 sem menção de LCW. Validar se o cliente efetivamente usa o produto.

---

## 6. O Backoffice Legítimo: Projetos Em Andamento (`in-progress`) no HUB (54 Chamados)

Para os cartórios que ainda estão em fase de implantação ativa no HUB, os chamados secundários **não devem ser encerrados**, pois sua conclusão depende do cronograma do sistema principal:
- **São José dos Campos - 1º Tabelionato de Notas (OP 12131/2026):**
  - Orion TN `#755241` (Core) em andamento (25 dias).
  - Chamados Secundários: LCW `#755245` (25d), SGA `#755250` (25d), GED `#755258` (25d) estão aguardando legitimamente a virada oficial do Orion TN.
- **Guarulhos - 1º Tabelionato de Protesto (OP 12141/2026):**
  - Orion PRO `#756884` (Core) em andamento (16 dias).
  - LCW `#757271` (13d) aguarda o encerramento do Orion PRO.
- **Carapicuíba - Registro de Imóveis e TD/PJ:**
  - Orion REG `#697717` em andamento.
  - LCW `#757518` (12d) aguarda a virada do RI.
- **Demais Projetos em Andamento:** Jandira, Campo Grande/Campinas, Franca 2º RI, Embu das Artes, Indaiatuba, Olímpia, Araraquara, Jundiaí, Taubaté, Itu, São Paulo 26º TN, Praia Grande e Peruíbe.

---

## 7. Instruções Operacionais de Uso da Interface

1. **Acessar o Relatório Interativo:**
   - Abra [`docs/export. 0800/relatorio-levantamento-chamados-siplan.html`](./relatorio-levantamento-chamados-siplan.html) em qualquer navegador web.
2. **Alternar Modos de Visão:**
   - Clique em **🏛️ Por Cartório (360º)** para visualizar os chamados agrupados por comarca/cliente e usar o botão *"Baixar Todos"* em bloco.
   - Clique em **📋 Tabela Compacta** para ter uma visão tabular ultra-rápida estilo planilha.
3. **Exportar a Pasta de Trabalho Excel:**
   - Clique no botão verde **"Exportar Excel (.XLSX)"** no topo direito. O arquivo será gerado imediatamente no formato `.xlsx` nativo com as 5 abas operacionais prontas para distribuição entre as equipes.
4. **Gerar PDF Limpo para Diretoria:**
   - Clique no botão preto **"Imprimir / PDF"** (ou aperte `Ctrl + P`). A interface se ajusta instantaneamente, ocultando formulários e exibindo o cabeçalho executivo institucional para você salvar em PDF ou imprimir em folha A4.
