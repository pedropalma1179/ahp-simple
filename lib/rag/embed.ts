/**
 * Wrapper Voyage-3 para Fase 6.3 RAG vetorial.
 * Stack congelada por docs/RAG_DECISIONS.md v2 §2.2.
 *
 * - Modelo: voyage-3 (1024 dims)
 * - inputType diferenciado: 'document' (ingestão) vs 'query' (retrieval)
 * - Singleton de cliente para evitar reinstanciar a cada chamada
 * - Erros explícitos: dimensão errada, resposta vazia, env var ausente
 */

import { VoyageAIClient } from 'voyageai';

const VOYAGE_MODEL = 'voyage-3' as const;
const EXPECTED_DIMS = 1024;

/**
 * Lazy singleton do cliente Voyage. Env é lido na 1ª chamada (não no import),
 * permitindo que mecanismos de bootstrap de env (dotenv em scripts standalone,
 * Next.js em runtime, --env-file em CI) rodem antes da leitura.
 */
let _client: VoyageAIClient | null = null;

function getClient(): VoyageAIClient {
  if (_client) return _client;

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      '[rag/embed] VOYAGE_API_KEY não definida. Verifique .env.local (dev) ou env do Vercel (prod/preview).'
    );
  }

  _client = new VoyageAIClient({ apiKey });
  return _client;
}

export type VoyageInputType = 'document' | 'query';

/**
 * Embeda um único texto em um vetor de 1024 floats via Voyage-3.
 *
 * @param text Texto a embeddar (não pode ser vazio)
 * @param type 'document' para ingestão, 'query' para consulta de retrieval
 * @returns Array de 1024 números (embedding)
 * @throws Error se texto vazio, resposta inválida, ou dimensão diferente de 1024
 */
export async function embed(text: string, type: VoyageInputType): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('[rag/embed] texto vazio.');
  }

  const client = getClient();
  const response = await client.embed({
    input: [text],
    model: VOYAGE_MODEL,
    inputType: type,
  });

  if (!response.data || response.data.length === 0) {
    throw new Error('[rag/embed] resposta da Voyage sem campo data.');
  }

  const vector = response.data[0].embedding;

  if (!vector || !Array.isArray(vector)) {
    throw new Error('[rag/embed] embedding ausente na resposta.');
  }

  if (vector.length !== EXPECTED_DIMS) {
    throw new Error(
      `[rag/embed] dimensão inesperada ${vector.length}, esperado ${EXPECTED_DIMS}.`
    );
  }

  return vector;
}
