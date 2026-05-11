/**
 * scripts/test-rag-semantic.ts — Phase 6.3.3 test harness
 *
 * Valida 4 cenários:
 *   1. Happy path: query válida com Upstash populado retorna >=1 chunk
 *   2. Validation: query vazia lança throw
 *   3. Validation: topK = 0 lança throw
 *   4. Validation: topK não-inteiro lança throw
 *
 * Pré-condição: Phase 6.3.2 já ingestou 473 chunks no Upstash (commit fe57bcf).
 * Exit code: 0 se todos passam, 1 se algum falha.
 */

import { config as loadEnv } from 'dotenv';
import { getRAGSemantic } from '../lib/rag/semantic-retrieve';

// Bootstrap env: .env.local primeiro (dev), depois .env como fallback.
loadEnv({ path: '.env.local' });
loadEnv();

let passed = 0;
let failed = 0;

function pass(name: string, info: string = '') {
  const suffix = info ? ` (${info})` : '';
  console.log(`  PASS ${name}${suffix}`);
  passed++;
}

function fail(name: string, reason: string) {
  console.error(`  FAIL ${name}: ${reason}`);
  failed++;
}

async function main() {
  console.log('=== test-rag-semantic.ts (Phase 6.3.3) ===\n');

  // ============================================================
  // Test 1: Happy path
  // ============================================================
  console.log('Test 1: Happy path - query valida + Upstash populado');
  try {
    const results = await getRAGSemantic('consistency ratio Saaty AHP threshold', 5);

    if (!Array.isArray(results)) {
      fail('Test 1', `expected array, got ${typeof results}`);
    } else if (results.length === 0) {
      fail('Test 1', 'expected at least 1 chunk, got 0');
    } else if (results.length > 5) {
      fail('Test 1', `expected at most 5 chunks, got ${results.length}`);
    } else if (typeof results[0].score !== 'number' || results[0].score <= 0 || results[0].score > 1) {
      fail('Test 1', `score out of (0, 1]: ${results[0].score}`);
    } else if (!results[0].metadata || !results[0].metadata.article_id) {
      fail('Test 1', 'metadata.article_id missing');
    } else {
      pass('Test 1', `${results.length} chunks, top: ${results[0].metadata.article_id} (score ${results[0].score.toFixed(4)})`);
    }
  } catch (err) {
    fail('Test 1', err instanceof Error ? err.message : String(err));
  }

  // ============================================================
  // Test 2: Empty query throws
  // ============================================================
  console.log('\nTest 2: query vazia -> throw esperado');
  try {
    await getRAGSemantic('', 5);
    fail('Test 2', 'expected throw, got success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('non-empty string')) {
      pass('Test 2');
    } else {
      fail('Test 2', `wrong error message: ${msg}`);
    }
  }

  // ============================================================
  // Test 3: topK = 0 throws
  // ============================================================
  console.log('\nTest 3: topK = 0 -> throw esperado');
  try {
    await getRAGSemantic('hello', 0);
    fail('Test 3', 'expected throw, got success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('positive integer')) {
      pass('Test 3');
    } else {
      fail('Test 3', `wrong error message: ${msg}`);
    }
  }

  // ============================================================
  // Test 4: topK non-integer throws
  // ============================================================
  console.log('\nTest 4: topK = 3.5 -> throw esperado');
  try {
    await getRAGSemantic('hello', 3.5);
    fail('Test 4', 'expected throw, got success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('positive integer')) {
      pass('Test 4');
    } else {
      fail('Test 4', `wrong error message: ${msg}`);
    }
  }

  // ============================================================
  // Summary
  // ============================================================
  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}/4`);
  console.log(`Failed: ${failed}/4`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
