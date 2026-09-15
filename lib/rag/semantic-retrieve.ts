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
  descreverFalha,
  type ClassificacaoFalha,
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
 *
 * ⚠ **Cada etapa tem o SEU array de tentativas.** Um array único atribuía à consulta
 * ao índice o status da resposta do embedding, e o aviso chegava a dizer falha em
 * `querySimilar` com status 200 e uma tentativa quando nenhuma requisição ao índice
 * havia saído.
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

  const tentativasEmbed: TentativaHttp[] = [];
  const tentativasConsulta: TentativaHttp[] = [];
  const diagnostico: DiagnosticoConsulta = {
    indice,
    etapa: null,
    embedding: 'nao_executado',
    consulta: 'nao_executado',
    tentativasEmbed,
    tentativasConsulta,
  };

  // Etapa 1, embedding. Falhando aqui, a etapa 2 fica NÃO EXECUTADA.
  let vector: number[];
  try {
    vector = await embedDiagnosticado(query, 'query', tentativasEmbed);
    diagnostico.embedding = 'concluido';
  } catch {
    diagnostico.embedding = 'erro';
    diagnostico.etapa = 'embed';
    // ⚠ A classificação vem de ONDE a falha ocorreu, e a exceção não é consultada:
    // nem `name`, nem mensagem, nem serialização do valor lançado.
    diagnostico.erro = descreverFalha(classificarEtapa(tentativasEmbed, 'embed'));
    avisar(indice, diagnostico, tentativasEmbed);
    return { chunks: [], diagnostico };
  }

  // Etapa 2, consulta ao índice. O transporte próprio classifica com certeza.
  try {
    const { chunks } = await consultarIndice(vector, topK, tentativasConsulta);
    diagnostico.consulta = chunks.length > 0 ? 'com_resultados' : 'vazio';
    return { chunks, diagnostico };
  } catch {
    diagnostico.consulta = 'erro';
    diagnostico.etapa = 'querySimilar';
    diagnostico.erro = descreverFalha(classificarEtapa(tentativasConsulta, 'querySimilar'));
    avisar(indice, diagnostico, tentativasConsulta);
    return { chunks: [], diagnostico };
  }
}

/**
 * Classifica a falha de uma etapa pelo HISTÓRICO DELA, e só dele.
 *
 * ⚠ **São TRÊS condições, e não duas.** Nenhuma tentativa registrada significa que a
 * etapa abortou antes de a requisição sair, e chamar isso de transporte atribui a ele
 * uma falha que nunca o tocou: credencial ausente e vetor com dimensão errada caem
 * aí. Só há transporte quando houve tentativa e nenhuma resposta voltou.
 *
 * ⚠ **A tentativa relevante é a ÚLTIMA, e não qualquer uma.** Uma busca por
 * "houve alguma resposta no histórico" classificava como posterior à resposta um caso
 * em que a primeira tentativa respondeu 503 e a última nem chegou a responder.
 *
 * ⚠ **A diferença entre as duas etapas é o quanto cada envoltório SABE.** O do
 * índice controla o transporte inteiro e marca a própria tentativa; o da Voyage vê até
 * a resposta, e o que acontece depois dela fica dito como não classificado.
 */
function classificarEtapa(
  tentativas: TentativaHttp[],
  etapa: 'embed' | 'querySimilar'
): ClassificacaoFalha {
  const ultima = tentativas[tentativas.length - 1];
  if (!ultima) return 'anterior_a_chamada';
  if (etapa === 'querySimilar') return ultima.falha ?? 'nao_classificada';
  return ultima.status === undefined ? 'transporte' : 'posterior_a_resposta_nao_classificada';
}

/**
 * Aviso por consulta, com a ETAPA e o STATUS quando houve resposta.
 *
 * ⚠ **Nada da exceção entra aqui:** a mensagem é a pública, fixa por classificação.
 * Antes, a mensagem da dependência era repassada, e ela já foi medida carregando URL
 * e credencial.
 *
 * ⚠ **O histórico consultado é o DA ETAPA QUE FALHOU**, recebido por parâmetro. Com
 * um array único, o status da resposta do embedding aparecia num aviso de falha na
 * consulta ao índice.
 */
function avisar(indice: number, d: DiagnosticoConsulta, daEtapa: TentativaHttp[]): void {
  const ultima = daEtapa[daEtapa.length - 1];
  const status = ultima?.status === undefined ? 'sem resposta' : `status ${ultima.status}`;
  const tentativas = `${daEtapa.length} tentativa(s)`;
  console.warn(
    `[rag/semantic-retrieve] consulta ${indice} falhou na etapa ${d.etapa} ` +
      `(${status}, ${tentativas}, ${d.erro?.classificacao}): ${d.erro?.mensagem}`
  );
}
