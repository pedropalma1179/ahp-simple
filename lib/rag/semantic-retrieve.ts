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

import { embed, embedDiagnosticado } from './embed';
import { querySimilar, consultarIndice, type RetrievedChunk } from './upstash-client';
import {
  sanitizarErro,
  type DiagnosticoConsulta,
  type TentativaHttp,
} from './diagnostico';

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

/** O que uma consulta semântica devolve, com o diagnóstico separado do resultado. */
export interface ResultadoSemantico {
  chunks: RetrievedChunk[];
  diagnostico: DiagnosticoConsulta;
}

/**
 * Mesma recuperação de `getRAGSemantic`, com as quatro condições SEPARADAS.
 *
 * ⚠ **O failover continua silencioso para o chamador**, e o resultado entregue é o
 * mesmo de antes: lista de chunks, vazia quando não há o que recuperar ou quando
 * algo falhou. **O que muda é que agora o diagnóstico acompanha o resultado**, em
 * vez de a informação se perder no `catch`.
 *
 * ⚠ **Falha no `embed` deixa a consulta ao índice como NÃO EXECUTADA**, sem
 * tentativa fictícia: o array de tentativas fica vazio, e não com um erro inventado.
 */
export async function getRAGSemanticDiagnosticado(
  query: string,
  topK: number = DEFAULT_TOP_K,
  indice = 0
): Promise<ResultadoSemantico> {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('[rag/semantic-retrieve] query must be a non-empty string');
  }
  if (!Number.isFinite(topK) || !Number.isInteger(topK) || topK < 1) {
    throw new Error('[rag/semantic-retrieve] topK must be a positive integer');
  }

  const tentativas: TentativaHttp[] = [];
  const diagnostico: DiagnosticoConsulta = {
    indice,
    etapa: null,
    embedding: 'nao_executado',
    consulta: 'nao_executado',
    tentativas,
  };

  // Etapa 1, embedding. Falhando aqui, a etapa 2 fica NÃO EXECUTADA.
  let vector: number[];
  try {
    vector = await embedDiagnosticado(query, 'query', tentativas);
    diagnostico.embedding = 'concluido';
  } catch (err) {
    diagnostico.embedding = 'erro';
    diagnostico.etapa = 'embed';
    // ⚠ A classificação vem de ONDE a falha ocorreu, e não do `name` nem da
    // mensagem. Aqui o envoltório do `fetch` só enxerga até a resposta: uma falha
    // posterior a ela não pode ser classificada com segurança, e fica assim dita.
    const houveResposta = tentativas.some((t) => t.status !== undefined);
    diagnostico.erro = sanitizarErro(
      err,
      houveResposta ? 'posterior_a_resposta_nao_classificada' : 'transporte'
    );
    avisar(indice, diagnostico);
    return { chunks: [], diagnostico };
  }

  // Etapa 2, consulta ao índice. O transporte próprio classifica com certeza.
  try {
    const { chunks } = await consultarIndice(vector, topK, tentativas);
    diagnostico.consulta = chunks.length > 0 ? 'com_resultados' : 'vazio';
    return { chunks, diagnostico };
  } catch (err) {
    diagnostico.consulta = 'erro';
    diagnostico.etapa = 'querySimilar';
    const ultima = tentativas[tentativas.length - 1];
    diagnostico.erro = sanitizarErro(err, ultima?.falha ?? 'nao_classificada');
    avisar(indice, diagnostico);
    return { chunks: [], diagnostico };
  }
}

/**
 * Aviso por consulta, com a ETAPA e o STATUS quando houve resposta.
 *
 * ⚠ **Mensagem sanitizada**, sem credencial, sem URL e sem corpo de resposta.
 */
function avisar(indice: number, d: DiagnosticoConsulta): void {
  const ultima = d.tentativas[d.tentativas.length - 1];
  const status = ultima?.status === undefined ? 'sem resposta' : `status ${ultima.status}`;
  const tentativas = `${d.tentativas.length} tentativa(s)`;
  console.warn(
    `[rag/semantic-retrieve] consulta ${indice} falhou na etapa ${d.etapa} ` +
      `(${status}, ${tentativas}, ${d.erro?.classificacao}): ${d.erro?.mensagem}`
  );
}
