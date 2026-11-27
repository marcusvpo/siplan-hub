import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Defina SUPABASE_URL (ou VITE_SUPABASE_URL) e SUPABASE_SECRET_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) no ambiente.");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

async function testRegex() {
  const { data, error } = await sb.storage.from("assistant-oriontn-doc").download("OrionTN pos.md");
  if (error) {
    console.error("Storage download error:", error);
    return;
  }
  const rawContent = await data.text();
  console.log("Raw length:", rawContent.length, "bytes");

  const articleRegex = /(?:^|\r?\n)---\s*\r?\n(id:\s*[\s\S]*?)\r?\n---\s*\r?\n([\s\S]*?)(?=(?:\r?\n---\s*\r?\nid:)|$)/g;
  let count = 0;
  let firstId = null;
  let lastId = null;
  let match;

  while ((match = articleRegex.exec(rawContent)) !== null) {
    count++;
    const idMatch = match[1].match(/^id:\s*(.+)$/m);
    const id = idMatch ? idMatch[1].trim() : `unknown-${count}`;
    if (!firstId) firstId = id;
    lastId = id;
  }

  console.log("Captured articles:", count);
  console.log("First article ID:", firstId);
  console.log("Last article ID:", lastId);
}

testRegex();
