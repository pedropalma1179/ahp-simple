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
import type { TentativaHttp } from './diagnostico';

const VOYAGE_MODEL = 'voyage-3' as const;
const EXPECTED_DIMS = 1024;

// ============================================================
// A.30 — DIAGNÓSTICO DO EMBEDDING
// ============================================================
// ⚠ **Aqui o envoltório é só do `fetch` injetado no cliente**, que é afordância
// pública do SDK, declarada em `dist/cjs/BaseClient.d.ts:15`. **O `fetch` global NÃO
// é substituído.**
//
// ⚠ **A resposta é devolvida INTACTA:** o envoltório não lê o corpo, não o clona e
// não deixa leitura assíncrona pendente. Registra apenas a tentativa e o status.
//
// ⚠ **Parâmetros e política de repetição da Voyage são PRESERVADOS**, e a política
// do Upstash não é copiada para cá: a Voyage repete por status, com `maxRetries`
// padrão 2, e o Upstash repete quando o `fetch` lança.

/**
 * `fetch` que registra tentativa e status por consulta, e devolve a resposta original.
 *
 * ⚠ **O diagnóstico é ISOLADO POR CONSULTA**, porque o array vem de fora e o cliente
 * é criado por chamada. Sob `Promise.all`, cada consulta escreve no seu.
 */
function fetchDiagnosticado(tentativas: TentativaHttp[]): typeof fetch {
  return (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const numero = tentativas.length + 1;
    try {
      const res = await (globalThis.fetch as typeof fetch)(entrada as RequestInfo, init);
      // Status registrado SEM tocar no corpo. `bytes` fica ausente por decisão.
      tentativas.push({ numero, status: res.status });
      return res;
    } catch (erro) {
      // Sem resposta: `status` AUSENTE, nunca inventado. A rejeição é preservada.
      tentativas.push({ numero, falha: 'transporte' });
      throw erro;
    }
  }) as typeof fetch;
}

/**
 * Cliente Voyage com as MESMAS opções de antes, mais o `fetch` diagnosticado.
 *
 * ⚠ **Um cliente por chamada, e não mais um singleton**, porque o diagnóstico tem de
 * ser isolado por consulta. Nenhum parâmetro de requisição ou de repetição muda.
 */
function criarCliente(tentativas: TentativaHttp[]): VoyageAIClient {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      '[rag/embed] VOYAGE_API_KEY não definida. Verifique .env.local (dev) ou env do Vercel (prod/preview).'
    );
  }

  return new VoyageAIClient({ apiKey, fetch: fetchDiagnosticado(tentativas) });
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
  return embedDiagnosticado(text, type, []);
}

/**
 * Mesma função de `embed`, com o diagnóstico das tentativas preenchido.
 *
 * @throws o mesmo que `embed`, com `tentativas` já preenchido quando a exceção sobe
 */
export async function embedDiagnosticado(
  text: string,
  type: VoyageInputType,
  tentativas: TentativaHttp[]
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('[rag/embed] texto vazio.');
  }

  const client = criarCliente(tentativas);
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
