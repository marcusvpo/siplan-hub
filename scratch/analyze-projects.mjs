import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://okvufcwkophaadttmjwa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdnVmY3drb3BoYWFkdHRtandhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDMyODgwMywiZXhwIjoyMDc5OTA0ODAzfQ.vBW6rUTeTXrzFa6AcYTv-ysw5m0A9YiNK4F3z5w8aP8'
);

async function main() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id, client_name, ticket_number, system_type, specialty, global_status,
      infra_status, adherence_status, environment_status, conversion_status,
      modelos_editor_status, implementation_status, post_status
    `)
    .eq('is_deleted', false);

  if (error) {
    console.error('Error fetching projects:', error);
    return;
  }

  console.log('Total projects found:', projects.length);
  const statusCounts = {};
  projects.forEach(p => {
    statusCounts[p.global_status] = (statusCounts[p.global_status] || 0) + 1;
  });
  console.log('Global status counts:', JSON.stringify(statusCounts, null, 2));

  console.log('\n--- In-progress projects (Em Andamento) ---');
  const inProgress = projects.filter(p => p.global_status === 'in-progress');
  console.log('Count:', inProgress.length);
  inProgress.forEach(p => {
    console.log(`- "${p.client_name}" | System: ${p.system_type} | Impl: ${p.implementation_status} | Post: ${p.post_status} | Ticket: ${p.ticket_number}`);
  });

  console.log('\n--- Done / Concluído projects ---');
  const doneProjects = projects.filter(p => p.global_status === 'done' || p.global_status === 'archived');
  console.log('Count:', doneProjects.length);
  doneProjects.forEach(p => {
    console.log(`- "${p.client_name}" | System: ${p.system_type} | Global: ${p.global_status}`);
  });
}

main();
