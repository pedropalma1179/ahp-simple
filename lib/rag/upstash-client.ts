/**
 * Wrapper Upstash Vector para Fase 6.3 RAG vetorial.
 * Stack congelada por docs/RAG_DECISIONS.md v2 §2.1 e §3.1.
 *
 * - Index: ahp-bocr-rag
 * - Distance: COSINE
 * - Dimensions: 1024 (Voyage-3)
 * - Singleton de Index para evitar reinstanciar
 * - upsertChunk e querySimilar com guards de dimensão
 * - deleteAll utilitário (uso APENAS em scripts de teste)
 */

import { Index } from '@upstash/vector';

const EXPECTED_DIMS = 1024;

/**
 * Lazy singleton do Index Upstash. Mesma justificativa de embed.ts:
 * env lido em tempo de chamada, não em tempo de import.
 */
let _index: Index | null = null;

function getIndex(): Index {
  if (_index) return _index;

  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      '[rag/upstash-client] UPSTASH_VECTOR_REST_URL e/ou UPSTASH_VECTOR_REST_TOKEN ausentes.'
    );
  }

  _index = new Index({ url, token });
  return _index;
}

/**
 * Metadata de um chunk indexado. Espelho do schema de docs/RAG_DECISIONS.md v2 §3.1.
 * Tipo `chunk_type` segue a enumeração da §3.
 */
export interface ChunkMetadata {
  article_id: string;
  article_year: number;
  article_type: string;
  chunk_type: 'claim' | 'formula' | 'threshold' | 'table_figure' | 'recommendation';
  chunk_index: number;
  text: string;
  verbatim_quote: string | null;
  page: number | null;
  locator_type: string | null;
  locator_id: string | null;
  usable_as: string | null;
}

/**
 * Resultado retornado por querySimilar. Inclui score de similaridade (0..1, COSINE).
 */
export interface RetrievedChunk {
  id: string;
  score: number;
  metadata: ChunkMetadata;
}

/**
 * Insere ou atualiza um chunk no index `ahp-bocr-rag`.
 *
 * @throws Error se vetor não tem 1024 dims
 */
export async function upsertChunk(
  id: string,
  vector: number[],
  metadata: ChunkMetadata
): Promise<void> {
  if (!id || id.trim().length === 0) {
    throw new Error('[rag/upstash-client] upsertChunk: id vazio.');
  }
  if (vector.length !== EXPECTED_DIMS) {
    throw new Error(
      `[rag/upstash-client] upsertChunk: vetor com ${vector.length} dims, esperado ${EXPECTED_DIMS}.`
    );
  }

  const index = getIndex();
  await index.upsert({
    id,
    vector,
    metadata: metadata as unknown as Record<string, unknown>,
  });
}

/**
 * Recupera os topK chunks mais similares ao vetor da query.
 *
 * @returns Array ordenado por score decrescente (mais similar primeiro)
 * @throws Error se vetor não tem 1024 dims, ou topK < 1
 */
export async function querySimilar(
  vector: number[],
  topK: number
): Promise<RetrievedChunk[]> {
  if (vector.length !== EXPECTED_DIMS) {
    throw new Error(
      `[rag/upstash-client] querySimilar: vetor com ${vector.length} dims, esperado ${EXPECTED_DIMS}.`
    );
  }
  if (topK < 1) {
    throw new Error('[rag/upstash-client] querySimilar: topK deve ser >= 1.');
  }

  const index = getIndex();
  const results = await index.query({
    vector,
    topK,
    includeMetadata: true,
  });

  return results.map((r) => ({
    id: String(r.id),
    score: r.score,
    metadata: r.metadata as unknown as ChunkMetadata,
  }));
}

/**
 * Apaga TODOS os vetores do index. Uso APENAS em scripts de teste e em scripts/ingest-rag.ts.
 * NÃO chamar em código de produção.
 */
export async function deleteAll(): Promise<void> {
  const index = getIndex();
  await index.reset();
}
