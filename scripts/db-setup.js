#!/usr/bin/env node
/**
 * Abre o SQL Editor do Supabase e copia o SQL da migration para a área de transferência.
 * Cole e execute no editor.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '20260312120000_allow_read_public_leads.sql'), 'utf8');

const projectId = 'bbfxwizfafnoklhjnyus';
const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectId}/sql/new`;

try {
  execSync('pbcopy', { input: sql, stdio: ['pipe', 'inherit', 'inherit'] });
  console.log('✅ SQL copiado para a área de transferência!');
  console.log('\n📋 Abrindo o SQL Editor do Supabase...');
  execSync(`open "${sqlEditorUrl}"`);
  console.log('\n👉 Cole o SQL (Cmd+V) e clique em Run.\n');
} catch (e) {
  console.log('SQL para copiar manualmente:\n');
  console.log(sql);
  console.log('\nCole no SQL Editor:', sqlEditorUrl);
}
