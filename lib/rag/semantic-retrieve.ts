/**
 * lib/rag/semantic-retrieve.ts — Phase 6.3.3 (RAG_DECISIONS v3 §2.5)
 *
 * Retrieval semântico aditivo: complementa o getKnowledgeContext keyword-based
 * em app/api/ai-reviewer/route.ts via embedding Voyage-3 + Upstash Vector.
 *
 * Princípio crítico: o sistema NUNCA falha por causa do RAG vetorial.
 * - Validation errors (query vazia, topK inválido) → throw (programmer error)
 * - Runtime errors (Voyage/Upstash down, 429, timeout) → return [] + warn (silent failover)
 *
 * A integração no route.ts (merge keyword ∪ semantic, dedupe, top 20) fica
 * para a Phase 6.3.4. Esta camada apenas entrega os chunks ordenados.
 */

import { embed } from './embed';
import { querySimilar, type RetrievedChunk } from './upstash-client';

/**
 * Top-K default conforme RAG_DECISIONS v3 §2.5.
 */
const DEFAULT_TOP_K = 5;

/**
 * Recupera os chunks mais similares à query via Voyage-3 + Upstash Vector.
 *
 * @param query Texto da consulta em linguagem natural
 * @param topK Número de chunks a recuperar (default 5, deve ser inteiro positivo)
 * @returns Array de chunks ordenados por similarity decrescente (vazio em failover)
 */
export async function getRAGSemantic(
  query: string,
  topK: number = DEFAULT_TOP_K
): Promise<RetrievedChunk[]> {
  // Programmer-error validation: throw early, ruidosamente.
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('[rag/semantic-retrieve] query must be a non-empty string');
  }
  if (!Number.isFinite(topK) || !Number.isInteger(topK) || topK < 1) {
    throw new Error('[rag/semantic-retrieve] topK must be a positive integer');
  }

  // Runtime retrieval: silent failover para garantir que o RAG vetorial NUNCA
  // derrube a geração do Parecer.
  try {
    const vector = await embed(query, 'query');
    return await querySimilar(vector, topK);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[rag/semantic-retrieve] retrieval failed (silent failover): ${msg}`);
    return [];
  }
}
