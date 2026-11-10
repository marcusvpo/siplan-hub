import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.VITE_SUPABASE_URL || "https://okvufcwkophaadttmjwa.supabase.co",
  process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdnVmY3drb3BoYWFkdHRtandhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNTQ5ODUsImV4cCI6MjA1NTkzMDk4NX0.eG8aG-xM6o55U5Z-s_2Y6Y9bT6rZ4j7J_j1G1T8vB4o"
);

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
