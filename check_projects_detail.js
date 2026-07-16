import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function run() {
  const { data: allProjects, error } = await supabase
    .from('projects')
    .select('id, client_name, global_status, post_status, is_archived, is_deleted, client_id');
  if (error) {
    console.error(error);
    return;
  }

  console.log('--- ALL IN-PROGRESS / NOT POST / NOT DELETED ---');
  const activeCandidate = allProjects.filter(p => 
    p.global_status === 'in-progress' && 
    p.post_status !== 'in-progress' && 
    !p.is_deleted
  );
  console.log(`Candidate active projects: ${activeCandidate.length}`);
  
  const archivedActive = activeCandidate.filter(p => p.is_archived);
  console.log(`Candidate active projects but is_archived = true: ${archivedActive.length}`);

  const notArchivedActive = activeCandidate.filter(p => !p.is_archived);
  console.log(`Candidate active projects and is_archived = false: ${notArchivedActive.length}`);

  console.log('\n--- MATCH BY CLIENT ID VS CLIENT NAME ---');
  const { data: clients } = await supabase.from('clients').select('id, name');
  console.log(`Total clients: ${clients.length}`);

  let matchById = 0;
  let matchByNameFallback = 0;
  let noMatch = 0;

  notArchivedActive.forEach(p => {
    if (p.client_id) {
      matchById++;
    } else {
      const match = clients.find(c => c.name.toLowerCase().trim() === p.client_name?.toLowerCase().trim());
      if (match) {
        matchByNameFallback++;
      } else {
        noMatch++;
        console.log(`No match for project: "${p.client_name}" (id: ${p.id})`);
      }
    }
  });

  console.log(`Match by client_id: ${matchById}`);
  console.log(`Match by client_name fallback: ${matchByNameFallback}`);
  console.log(`No match: ${noMatch}`);
}

run();
