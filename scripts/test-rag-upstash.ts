/**
 * Teste isolado de lib/rag/upstash-client.ts.
 * Roda via: npx tsx scripts/test-rag-upstash.ts
 *
 * Critérios de sucesso:
 * 1. upsertChunk não lança
 * 2. querySimilar retorna ≥ 1 resultado
 * 3. O resultado top-1 tem o mesmo id que foi inserido
 * 4. score do top-1 > 0.99 (similaridade self é ~1.0)
 * 5. metadata round-trip: campos preservados
 *
 * Cleanup: deleta o chunk de teste no final (deleta por id, não reset global).
 */

import { config } from 'dotenv';
config({ path: '.env.local' }); // Next.js usa .env.local por convenção; dotenv vanilla precisa de path explícito
import { upsertChunk, querySimilar, type ChunkMetadata } from '../lib/rag/upstash-client';
import { Index } from '@upstash/vector';

const TEST_ID = '__phase631_test__::self_similarity::1';

function makeRandomVector(dims: number): number[] {
  // Vetor unitário aleatório (para casar com COSINE bem comportado)
  const v = Array.from({ length: dims }, () => Math.random() - 0.5);
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  return v.map((x) => x / norm);
}

async function cleanup() {
  // Deleta apenas o chunk de teste, não usa deleteAll
  const url = process.env.UPSTASH_VECTOR_REST_URL!;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN!;
  const index = new Index({ url, token });
  try {
    await index.delete(TEST_ID);
    console.log(`[test-rag-upstash] cleanup: ${TEST_ID} removido`);
  } catch (e) {
    console.warn('[test-rag-upstash] cleanup falhou (pode ser ok):', e);
  }
}

async function main() {
  console.log('[test-rag-upstash] iniciando...');

  const vector = makeRandomVector(1024);
  const metadata: ChunkMetadata = {
    article_id: '__phase631_test__',
    article_year: 2026,
    article_type: 'test',
    chunk_type: 'claim',
    chunk_index: 1,
    text: 'Test chunk for Phase 6.3.1 self-similarity validation.',
    verbatim_quote: 'Test verbatim',
    page: null,
    locator_type: null,
    locator_id: null,
    usable_as: null,
  };

  console.log('[test-rag-upstash] upsert...');
  const t0 = Date.now();
  await upsertChunk(TEST_ID, vector, metadata);
  console.log(`[test-rag-upstash] upsert OK em ${Date.now() - t0}ms`);

  // Upstash precisa de pequeno delay para indexar (eventual consistency em alguns planos)
  await new Promise((r) => setTimeout(r, 1000));

  console.log('[test-rag-upstash] query...');
  const t1 = Date.now();
  const results = await querySimilar(vector, 1);
  console.log(`[test-rag-upstash] query retornou ${results.length} em ${Date.now() - t1}ms`);

  if (results.length === 0) {
    console.error('FAIL: querySimilar retornou 0 resultados');
    await cleanup();
    process.exit(1);
  }

  const top = results[0];
  console.log(`[test-rag-upstash] top-1 id: ${top.id}, score: ${top.score.toFixed(4)}`);

  if (top.id !== TEST_ID) {
    console.error(`FAIL: id esperado ${TEST_ID}, obtido ${top.id}`);
    await cleanup();
    process.exit(1);
  }

  if (top.score < 0.99) {
    console.error(`FAIL: score self esperado >0.99, obtido ${top.score}`);
    await cleanup();
    process.exit(1);
  }

  // Round-trip de metadata
  if (top.metadata.article_id !== metadata.article_id || top.metadata.chunk_type !== metadata.chunk_type) {
    console.error('FAIL: metadata não preservou round-trip');
    console.error('Esperado:', metadata);
    console.error('Obtido:', top.metadata);
    await cleanup();
    process.exit(1);
  }

  console.log('[test-rag-upstash] cleanup...');
  await cleanup();

  console.log('[test-rag-upstash] PASS');
}

main().catch(async (err) => {
  console.error('[test-rag-upstash] FAIL com erro:', err);
  try {
    await cleanup();
  } catch {}
  process.exit(1);
});
