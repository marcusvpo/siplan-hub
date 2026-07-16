// Generates the text output matching the tramite-passagem.txt template
export interface DeploymentFormData {
  client_name: string;
  ticket_number: string;
  contracted_system: string;
  contracted_system_other?: string;
  op_number?: string;
  sales_order_number?: string;
  order_date?: string;
  docusign_contract_number?: string;
  sales_rep?: string;
  module_lcw?: boolean;
  module_on_hand?: boolean;
  module_sga?: boolean;
  module_editor_modelos?: boolean;
  module_website?: boolean;
  module_other?: boolean;
  module_other_name?: string;
  hours_presencial?: string;
  hours_remote?: string;
  modality?: string;
  travel_paid_by_client?: boolean;
  accommodation_paid_by_client?: boolean;
  deployment_type?: string;
  legacy_system?: string;
  desired_date?: string;
  max_date?: string;
  schedule_restrictions?: string;
  official_name?: string;
  official_phone?: string;
  official_email?: string;
  it_name?: string;
  it_phone?: string;
  it_email?: string;
  operational_name?: string;
  operational_role?: string;
  operational_phone?: string;
  operational_email?: string;
  other_contacts?: string;
  editor_status?: string;
  editor_send_status?: string;
  editor_deadline?: string;
  special_conditions?: string;
  urgency_level?: string;
  urgency_justification?: string;
  filled_by?: string;
  filled_at?: string;
}

const check = (val?: boolean) => val ? '[x]' : '[ ]';
const yn = (val?: boolean) => val === true ? '[x] Sim  [ ] Não' : val === false ? '[ ] Sim  [x] Não' : '[ ] Sim  [ ] Não';
const v = (val?: string) => val || '';

export function generateDeploymentTemplate(d: DeploymentFormData): string {
  const isOrionTN = d.contracted_system === 'Orion TN';
  const sys = d.contracted_system;
  const filledDate = d.filled_at ? new Date(d.filled_at) : new Date();
  const dd = String(filledDate.getDate()).padStart(2,'0');
  const mm = String(filledDate.getMonth()+1).padStart(2,'0');
  const yyyy = filledDate.getFullYear();

  let text = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PASSAGEM DE PROJETO — COMERCIAL → IMPLANTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ DADOS ADMINISTRATIVOS
───────────────────────
N.º OP: ${v(d.op_number)}
N. Pedido de Venda: ${v(d.sales_order_number)}
Data do Pedido: ${v(d.order_date)}
N.º Contrato (DocuSign): ${v(d.docusign_contract_number)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ ESCOPO CONTRATADO
───────────────────────
Sistema principal: 
${check(sys==='Orion TN')} Orion TN   ${check(sys==='Orion PRO')} Orion PRO   ${check(sys==='Orion REG')} Orion REG   
${check(sys==='Outro')} Outro: ${sys==='Outro' ? v(d.contracted_system_other) : '___________'}

Sistemas / Módulos adicionais contratados:
${check(d.module_lcw)} LCW (Livro Caixa Web)
${check(d.module_on_hand)} On Hand (App Mobile)
${check(d.module_sga)} SGA (Sistema de Gestão de Atendimento)`;

  if (isOrionTN) {
    text += `\n${check(d.module_editor_modelos)} Editor de Modelos (minutas/escrituras)`;
  }

  text += `
${check(d.module_website)} Website
${check(d.module_other)} Outro: ${d.module_other ? v(d.module_other_name) : '___________'}

Horas vendidas — Implantação presencial: ${v(d.hours_presencial) || '_____'} h
Horas vendidas — Implantação remota/cortesia: ${v(d.hours_remote) || '_____'} h
Modalidade: ${check(d.modality==='Presencial')} Presencial   ${check(d.modality==='Remoto')} Remoto   ${check(d.modality==='Misto')} Misto

Deslocamento pago pelo cliente: ${yn(d.travel_paid_by_client)}
Hospedagem paga pelo cliente:   ${yn(d.accommodation_paid_by_client)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ PERFIL DO PROJETO
───────────────────────
Tipo de implantação:
${check(d.deployment_type==='migration_siplan')} Migração — sistema Siplan/ControlM legado
${check(d.deployment_type==='migration_competitor')} Migração — sistema de concorrente

Sistema atual do cartório (legado): ${v(d.legacy_system) || '___________'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ DATAS E AGENDA
───────────────────────
Data desejada pelo cliente: ${v(d.desired_date) || '___________'}
Data máxima (prazo limite): ${v(d.max_date) || '___________'}
Restrições de período informadas pelo cliente:
${v(d.schedule_restrictions) || '___________________________________________'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ CONTATOS DO CARTÓRIO
───────────────────────
${(d.official_name || d.official_phone || d.official_email) ? `Tabelião / Oficial responsável:
Nome: ${v(d.official_name) || '_____________________'}
Telefone: ${v(d.official_phone) || '_________________'}
E-mail: ${v(d.official_email) || '___________________'}

` : ''}${(d.it_name || d.it_phone || d.it_email) ? `Responsável pelo TI / Servidor do cartório:
Nome: ${v(d.it_name) || '_____________________'}
Telefone: ${v(d.it_phone) || '_________________'}
E-mail: ${v(d.it_email) || '___________________'}

` : ''}${(d.operational_name || d.operational_role || d.operational_phone || d.operational_email) ? `Responsável operacional (Substituto, Escrevente Chefe, etc):
Nome: ${v(d.operational_name) || '_____________________'}
Cargo: ${v(d.operational_role) || '____________________'}
Telefone: ${v(d.operational_phone) || '_________________'}
E-mail: ${v(d.operational_email) || '___________________'}

` : ''}Outros contatos relevantes:
${v(d.other_contacts) || '___________________________________________'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  if (isOrionTN) {
    text += `

■ EDITOR DE MODELOS (preencher se contratado)
───────────────────────
${check(d.editor_status==='not_applicable')} Não se aplica (Editor não contratado)

${check(d.editor_status==='contracted')} Contratado — status do envio dos modelos:
    ${check(d.editor_send_status==='not_oriented')} Cliente ainda não foi orientado a enviar
    ${check(d.editor_send_status==='oriented_waiting')} Cliente orientado — aguardando envio
    ${check(d.editor_send_status==='sent_to_team')} Modelos já enviados para equipe de modelos
    

Prazo combinado com o cliente para envio dos modelos: 
${v(d.editor_deadline) || '___________'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  text += `

■ CONDIÇÕES ESPECIAIS E OBSERVAÇÕES
───────────────────────
Alguma condição especial foi negociada com o cliente
que a equipe de Implantação precisa saber?

${v(d.special_conditions) || '___________________________________________\n___________________________________________\n___________________________________________'}

Nível de urgência deste projeto:
${check(d.urgency_level==='normal')} Normal — seguir fila padrão
${check(d.urgency_level==='high')} Alta — cliente com prazo apertado (justificar): 
    ${d.urgency_level==='high' ? v(d.urgency_justification) : '___________'}
${check(d.urgency_level==='critical')} Crítica — aprovada pela diretoria (justificar): 
    ${d.urgency_level==='critical' ? v(d.urgency_justification) : '___________'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Preenchido por: ${v(d.filled_by) || '_________________'} em: ${dd}/${mm}/${yyyy}

Ao final das tratativas administrativas, encaminhar 
este chamado a Implantação para início do projeto.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return text;
}
