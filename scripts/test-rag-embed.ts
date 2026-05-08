/**
 * Teste isolado de lib/rag/embed.ts.
 * Roda via: npx tsx scripts/test-rag-embed.ts
 *
 * Critérios de sucesso:
 * 1. embed("...", "query") retorna number[]
 * 2. length === 1024
 * 3. Todos os elementos são finitos (não NaN, não Infinity)
 * 4. Norma L2 ~ 1 (Voyage retorna vetores normalizados — verificar)
 */

import { config } from 'dotenv';
config({ path: '.env.local' }); // Next.js usa .env.local por convenção; dotenv vanilla precisa de path explícito
import { embed } from '../lib/rag/embed';

async function main() {
  console.log('[test-rag-embed] iniciando...');

  const text = 'Saaty consistency ratio threshold for AHP pairwise comparison matrices.';
  const t0 = Date.now();
  const vector = await embed(text, 'query');
  const dt = Date.now() - t0;

  console.log(`[test-rag-embed] latência: ${dt}ms`);
  console.log(`[test-rag-embed] dimensão: ${vector.length}`);
  console.log(`[test-rag-embed] primeiros 5 valores: [${vector.slice(0, 5).map((v) => v.toFixed(4)).join(', ')}]`);

  if (vector.length !== 1024) {
    console.error(`FAIL: dimensão esperada 1024, obtido ${vector.length}`);
    process.exit(1);
  }

  const allFinite = vector.every((v) => Number.isFinite(v));
  if (!allFinite) {
    console.error('FAIL: vetor contém NaN ou Infinity');
    process.exit(1);
  }

  const normSq = vector.reduce((acc, v) => acc + v * v, 0);
  const norm = Math.sqrt(normSq);
  console.log(`[test-rag-embed] norma L2: ${norm.toFixed(4)} (esperado ~1.0 se normalizado)`);

  console.log('[test-rag-embed] PASS');
}

main().catch((err) => {
  console.error('[test-rag-embed] FAIL com erro:', err);
  process.exit(1);
});
