#!/usr/bin/env node
/**
 * Executa a migration que permite leitura de public_leads para usuários autenticados.
 * 
 * Necessário: Adicione DATABASE_URL no .env
 * Obtenha em: Supabase Dashboard > Settings > Database > Connection string (URI)
 * Use a "Session mode" (porta 5432) para migrations.
 */

import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const sql = `-- Allow authenticated users to read public_leads (for Disparos page - numbers with code not connected)
CREATE POLICY "Authenticated can read public_leads" ON public.public_leads
  FOR SELECT TO authenticated
  USING (true);`;

async function run() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error('\n❌ DATABASE_URL não encontrada no .env');
    console.error('\nAdicione no .env:');
    console.error('  DATABASE_URL="postgresql://postgres.[seu-project-ref]:[sua-senha]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"');
    console.error('\nObtenha em: Supabase Dashboard > Project Settings > Database > Connection string (URI)\n');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Migration aplicada com sucesso!');
  } catch (err) {
    if (err.message?.includes('already exists')) {
      console.log('✅ Policy já existe. Nada a fazer.');
    } else {
      console.error('❌ Erro:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

run();
