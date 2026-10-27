// app/api/ai-reviewer/route.ts
// API de Revisão IA - PEER REVIEW ACADÊMICO A1/Q1
// Versão: ver constante API_VERSION abaixo
// Features: Análise Qualitativa Profunda + RAG + Anti-Alucinação

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import SYSTEM_PROMPT from './system-prompt';
import { getKnowledgeStats, getCriticalRefs, getRefsByTopic, getRAGThresholds, getRAGFormulas, getRAGBenchmarks } from './knowledge';
import { validateCitationsAgainstWhitelist } from '@/lib/rag/citation-whitelist';
import { getValidFinalScores, type ReviewRequest } from '@/lib/ai-reviewer/review-request';
import {
  classificarAvaliacaoRecebida,
  qualidadeDisponivel,
  avaliarCoerencia,
  elegivelParaClassificacao,
  motivoDaSuspensao,
  ROTULO_NOTA_SUSPENSA,
  DESCRICAO_SUSPENSAO_POR_CONTRADICAO,
  DESCRICAO_SUSPENSAO_POR_DISPONIBILIDADE,
  DESCRICAO_DA_SUSPENSAO,
  type AvaliacaoQualidade,
} from '@/lib/ai-reviewer/avaliacao-qualidade';
import {
  descreverVinculoParaContexto,
  estadoDoVinculoNaResposta,
  frasesDaListaComVinculo,
  identificarParaApresentacao,
  lerVinculoParaTexto,
  linhasDeExclusaoComVinculo,
  type FrasesDaLista,
  type IdentidadeApresentada,
} from '@/lib/ai-reviewer/vinculo-execucao';
import {
  blocoDeConsistenciaDoPainel,
  estatisticasPorMatriz,
  lerConsistenciaDoRespondente,
  resumirPainelDeConsistencia,
  trechoDaLinhaDoRespondente,
} from '@/lib/ai-reviewer/consistencia-individual-contexto';
import { validateReviewOutput } from '@/lib/ai-reviewer/validate-review';
import { toReviewValidationContract } from '@/lib/ai-reviewer/review-validation-contract';
import { getRAGSemanticDiagnosticado } from '@/lib/rag/semantic-retrieve';
import { VERSAO_CONTRATO_SEMANTICO, type DiagnosticoConsulta } from '@/lib/rag/diagnostico';
import type { RetrievedChunk } from '@/lib/rag/upstash-client';
import { randomUUID } from 'node:crypto';
import {
  clonarParaRegistro,
  copiaSegura,
  montarRegistroDaExecucao,
  type CapturaDaGeracao,
} from '@/lib/ai-reviewer/registro-da-execucao';

// ============================================================
// VERCEL FUNCTION CONFIG
// ============================================================
// Eleva limite de execução da função serverless para o máximo permitido no
// Vercel Pro tier (800s). Necessário porque o LLM Opus 4.6 com adaptive
// thinking + citation-enforced prompting (D1.4) pode exigir 2-5 minutos para
// gerar um Parecer completo com verbatim_quote em ~10-15 papers do RAG.
// Default do Vercel é 300s — insuficiente após Commit 4 (02b4b1d3).
export const maxDuration = 300;

// ============================================================
// VERSÃO E LOGGING (fonte única de verdade)
// ============================================================
const API_VERSION = '7.3.2';

// ============================================================
// PHASE 6.3.4 — RAG SEMÂNTICO (RAG_DECISIONS v3 §2.5)
// ============================================================
// Feature flag: por default OFF. Habilitar em produção via:
//   vercel env add USE_RAG_SEMANTIC true production
// E aguardar redeploy. Quando OFF, getSemanticChunks() é no-op imediato
// (zero custo, zero latência, zero risco de regressão).
const USE_RAG_SEMANTIC = process.env.USE_RAG_SEMANTIC === 'true';

// 5 queries fixas cobrindo os eixos estruturais do Parecer BOCR.
// Decisão A2 do plano da Phase 6.3.4 (RAG_DECISIONS v3 §2.5).
const RAG_SEMANTIC_QUERIES = [
  'consistência julgamentos AHP CR Saaty',
  'BOCR síntese fórmula subtrativa Wijnmalen comensurabilidade',
  'análise sensibilidade ranking AHP estabilidade',
  'agregação média geométrica AIJ Forman Saaty grupo',
  'viés cognitivo painel decisão MCDM',
] as const;

const RAG_SEMANTIC_TOPK_PER_QUERY = 5;
const RAG_SEMANTIC_MAX_PER_ARTICLE = 3; // Cap por paper (decisão A3)
const RAG_SEMANTIC_FINAL_TOPK = 20;     // Total injetado no prompt (decisão A4)

/**
 * Contrato dos metadados semânticos, A.30.
 *
 * ⚠ **`contractVersion` existe para distinguir registro antigo de novo.** Metadados
 * gravados antes desta versão não têm o campo, e nesses `failedQueries` significa
 * outra coisa: contava resultado VAZIO junto com erro.
 *
 * ⚠ **`withResults`, `emptyOk` e `errored` contam CONSULTAS EXECUTADAS**, são
 * disjuntas e somam `queriesRan`. **`httpAttempts` tem unidade própria**, tentativas
 * HTTP, e não se soma a consultas.
 */
interface SemanticStats {
  contractVersion: number;
  enabled: boolean;
  queriesRan: number;
  /** Consultas que voltaram com pelo menos um chunk. */
  withResults: number;
  /** Consultas que voltaram vazias SEM erro. */
  emptyOk: number;
  /** Consultas que falharam, em qualquer das duas etapas. */
  errored: number;
  rawChunks: number;
  uniqueChunks: number;
  finalChunks: number;
  uniqueArticles: number;
  topScore: number | null;
  /**
   * ⚠ **Campo de COMPATIBILIDADE, derivado de `errored`**, nunca atualizado
   * separadamente. **Mudou de significado:** antes contava `r.length === 0`, ou seja
   * vazio legítimo e erro na mesma contagem; agora conta somente erro.
   */
  failedQueries: number;
  /** Tentativas HTTP somadas, unidade própria. */
  httpAttempts: number;
  /** Diagnóstico por consulta, na ordem de disparo. */
  queries: DiagnosticoConsulta[];
}

const EMPTY_SEMANTIC_STATS: SemanticStats = {
  contractVersion: VERSAO_CONTRATO_SEMANTICO,
  enabled: false,
  queriesRan: 0,
  withResults: 0,
  emptyOk: 0,
  errored: 0,
  rawChunks: 0,
  uniqueChunks: 0,
  finalChunks: 0,
  uniqueArticles: 0,
  topScore: null,
  failedQueries: 0,
  httpAttempts: 0,
  queries: [],
};

/**
 * Executa 5 queries semânticas em paralelo, deduplica por chunk_id,
 * aplica cap de 3 por article_id, e retorna top 20 com estatísticas.
 *
 * Failover: getRAGSemantic já trata Voyage/Upstash down com silent failover
 * (retorna []). Mesmo se TODAS as queries falharem, esta função retorna
 * { chunks: [], stats: { failedQueries: 5 } } sem lançar exceção.
 *
 * Quando USE_RAG_SEMANTIC = false, retorna no-op imediato (zero custo).
 */
async function getSemanticChunks(): Promise<{ chunks: RetrievedChunk[]; stats: SemanticStats }> {
  if (!USE_RAG_SEMANTIC) {
    return { chunks: [], stats: EMPTY_SEMANTIC_STATS };
  }

  const resultados = await Promise.all(
    RAG_SEMANTIC_QUERIES.map((q, i) =>
      getRAGSemanticDiagnosticado(q, RAG_SEMANTIC_TOPK_PER_QUERY, i)
    )
  );

  // ⚠ Cada diagnóstico volta associado à SUA consulta, pelo índice de disparo, e
  // `Promise.all` preserva a ordem. Nenhuma tentativa é atribuída a outra consulta.
  const diagnosticos = resultados.map((r) => r.diagnostico);
  const results = resultados.map((r) => r.chunks);

  // As três categorias são disjuntas e somam `queriesRan`.
  const withResults = diagnosticos.filter((d) => d.consulta === 'com_resultados').length;
  const emptyOk = diagnosticos.filter((d) => d.consulta === 'vazio').length;
  const errored = diagnosticos.filter((d) => d.embedding === 'erro' || d.consulta === 'erro').length;
  // ⚠ Soma as tentativas das DUAS etapas. Elas vivem em arrays separados porque
  // tentativa pertence a uma etapa, e o total continua sendo o de tentativas HTTP.
  const httpAttempts = diagnosticos.reduce(
    (soma, d) => soma + d.tentativasEmbed.length + d.tentativasConsulta.length,
    0
  );
  const rawChunks = results.flat();

  // Dedupe por chunk_id, preservando a versão de maior score quando
  // o mesmo chunk_id aparece em múltiplas queries.
  const seen = new Set<string>();
  const deduped: RetrievedChunk[] = [];
  for (const chunk of [...rawChunks].sort((a, b) => b.score - a.score)) {
    if (!seen.has(chunk.id)) {
      seen.add(chunk.id);
      deduped.push(chunk);
    }
  }

  // Cap por article_id: máximo 3 chunks por paper (decisão A3).
  // Mantém ordem por score — first-come, first-served.
  const perArticleCount = new Map<string, number>();
  const capped: RetrievedChunk[] = [];
  for (const chunk of deduped) {
    const articleId = chunk.metadata.article_id;
    const count = perArticleCount.get(articleId) ?? 0;
    if (count < RAG_SEMANTIC_MAX_PER_ARTICLE) {
      perArticleCount.set(articleId, count + 1);
      capped.push(chunk);
    }
  }

  const finalChunks = capped.slice(0, RAG_SEMANTIC_FINAL_TOPK);

  const stats: SemanticStats = {
    contractVersion: VERSAO_CONTRATO_SEMANTICO,
    enabled: true,
    queriesRan: RAG_SEMANTIC_QUERIES.length,
    withResults,
    emptyOk,
    errored,
    rawChunks: rawChunks.length,
    uniqueChunks: deduped.length,
    finalChunks: finalChunks.length,
    uniqueArticles: new Set(finalChunks.map((c) => c.metadata.article_id)).size,
    topScore: finalChunks[0]?.score ?? null,
    // Derivado de `errored`, nunca atualizado separadamente.
    failedQueries: errored,
    httpAttempts,
    queries: diagnosticos,
  };

  return { chunks: finalChunks, stats };
}

/**
 * Formata os chunks para injeção no SYSTEM_PROMPT como bloco homogêneo
 * (decisão A5 — indistinguível do RAG keyword).
 */
function formatSemanticChunks(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '_(nenhum chunk semântico recuperado nesta execução)_';

  return chunks
    .map((c, idx) => {
      const m = c.metadata;
      // ⚠ **A página NÃO vai mais para o contexto, A.33.** `ChunkMetadata.page`
      // CONTINUA no contrato e no índice, para auditoria: o que muda é só o que a
      // formatação leva ao modelo. Este era o Único código que interpolava página no
      // prompt, medido percorrendo os blocos que o compõem.
      const locator = m.locator_id ? ` ${m.locator_id}` : '';
      const verbatim = m.verbatim_quote ?? 'N/A';
      return `**${idx + 1}. ${m.article_id}** (${m.chunk_type}${locator}) — score: ${c.score.toFixed(3)}
${m.text}
*Verbatim:* "${verbatim}"`;
    })
    .join('\n\n');
}
const LOG_PREFIX = `[AI-REVIEWER v${API_VERSION}]`;

// ============================================================
// SAFE FORMATTING HELPERS
// ============================================================

/**
 * Safe .toFixed() — retorna 'N/A' se o valor não for um número finito.
 * Evita TypeError quando dados opcionais vêm undefined do payload.
 */
function safeFixed(value: unknown, digits: number = 2, fallback: string = 'N/A'): string {
  if (typeof value !== 'number' || !isFinite(value)) return fallback;
  return value.toFixed(digits);
}

/**
 * Safe percentage — multiplica por 100 e formata com % no fim.
 */
function safePercent(value: unknown, digits: number = 1, fallback: string = 'N/A'): string {
  if (typeof value !== 'number' || !isFinite(value)) return fallback;
  return (value * 100).toFixed(digits) + '%';
}

/**
 * Normaliza pesos BOCR aceitando múltiplos formatos de chave:
 * - PascalCase: { Benefits, Opportunities, Costs, Risks }
 * - Abreviado minúsculo: { vb/sb, vo/so, vc/sc, vr/sr }
 * - Array: [B, O, C, R]
 * 
 * Retorna sempre PascalCase ou null se não for possível normalizar.
 */
function normalizeBOCRWeights(
  raw: any,
  prefix: 'v' | 's' = 'v'
): { Benefits: number; Opportunities: number; Costs: number; Risks: number } | null {
  if (!raw) return null;

  // Formato array
  if (Array.isArray(raw) && raw.length >= 4) {
    return {
      Benefits: Number(raw[0]),
      Opportunities: Number(raw[1]),
      Costs: Number(raw[2]),
      Risks: Number(raw[3]),
    };
  }

  if (typeof raw !== 'object') return null;

  // Formato PascalCase (já correto)
  if (typeof raw.Benefits === 'number') {
    return {
      Benefits: raw.Benefits,
      Opportunities: raw.Opportunities,
      Costs: raw.Costs,
      Risks: raw.Risks,
    };
  }

  // Formato abreviado minúsculo (vb/sb, vo/so, etc.)
  const keyB = `${prefix}b`;
  const keyO = `${prefix}o`;
  const keyC = `${prefix}c`;
  const keyR = `${prefix}r`;

  if (typeof raw[keyB] === 'number') {
    return {
      Benefits: raw[keyB],
      Opportunities: raw[keyO],
      Costs: raw[keyC],
      Risks: raw[keyR],
    };
  }

  return null;
}

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const MODEL_CONFIG = {
  id: 'claude-opus-4-6',
  maxTokens: 16000,  // Aumentado para análise mais profunda
  // Hotfix pós-Commit 4 (02b4b1d3): adaptive thinking expandia
  // indefinidamente com a regra D1.4 de verbatim_quote, causando 504 timeout.
  // Budget explícito de 5000 tokens limita o raciocínio interno, mantendo
  // qualidade (a regra D1.4 já estrutura os passos) e cabendo em <800s.
  thinking: { type: 'enabled' as const, budget_tokens: 5000 },
};

// ============================================================
// SISTEMA DE CLASSIFICAÇÃO AUTOMÁTICA
// ============================================================

/**
 * A.12: a classificação global só existe quando há avaliação de qualidade.
 *
 * ⚠ **Ausência não é resultado.** Sem avaliação, não há nota, letra nem veredicto de
 * mérito: a classificação fica SUSPENSA, com o motivo.
 *
 * ⚠ **Ajuste 1 (A.12, item (c)): NÃO HÁ MAIS CLASSIFICAÇÃO AUTOMÁTICA.** Esta função deixou de contar categorias de
 * pessoas (`byStatus`, `status`, `summary`, `overallStats`) e de subtrair pontos pela taxa delas: o transporte não as
 * leva mais, e o score que saía delas era o construto sem lastro que A.12 manda remover. Calcular um score só com a
 * homogeneidade dos pesos BOCR produziria um valor favorável por omissão, e por isso ele também saiu. O que resta é o
 * PORTÃO: avaliação disponível (CR por matriz recalculado dos julgamentos para todos os enviados) e coerente. A nota
 * e o veredicto que a tela mostra continuam vindo SÓ do texto do modelo (`extractGradeFromReview`), sob esse portão.
 */
type Classificacao =
  | { suspensa: false; nota: null; veredicto: null; score: null; motivo: null }
  | { suspensa: true; nota: null; veredicto: null; score: null; motivo: string };

function calculateGrade(data: ReviewRequest): Classificacao {
  // ⚠ ELEGIBILIDADE, e não disponibilidade: este ponto decide CLASSIFICAR. A regra
  //   exige avaliação disponível, nenhuma contradição não resolvida e conclusão
  //   satisfatória das verificações obrigatórias aplicáveis.
  const elegibilidade = elegivelParaClassificacao(data.avaliacaoDeQualidade, data.coerenciaDaQualidade);
  if (!elegibilidade.elegivel) {
    const motivo = elegibilidade.motivo || motivoDaSuspensao(data.avaliacaoDeQualidade);
    console.log(`${LOG_PREFIX} Classificação SUSPENSA: ${motivo}`);
    return { suspensa: true, nota: null, veredicto: null, score: null, motivo };
  }

  console.log(`${LOG_PREFIX} Classificação NÃO suspensa: avaliação disponível e coerente. Sem valor automático de nota (A.12, item (c)).`);
  return { suspensa: false, nota: null, veredicto: null, score: null, motivo: null };
}

// ============================================================
// EXTRAÇÃO DA NOTA DO TEXTO DA IA (FONTE ÚNICA AUTORITATIVA)
// Parseia a seção DECISÃO EDITORIAL do texto gerado pelo Claude
// Fallback: calculateGrade() se parsing falhar
// ============================================================

function extractGradeFromReview(reviewText: string): { nota: string; veredicto: string } | null {
  if (!reviewText || reviewText.length < 50) return null;

  const patterns: Array<{ pattern: RegExp; nota: string; veredicto: string }> = [
    // Ordem importa: mais específico primeiro
    { pattern: /\bACEITO\s+COM\s+REVIS(?:Õ|O)ES\s+MENORES\b/i, nota: 'A', veredicto: 'ACEITO COM REVISÕES MENORES' },
    { pattern: /\bREVIS(?:Õ|O)ES\s+MENORES\b/i, nota: 'B', veredicto: 'REVISÕES MENORES' },
    { pattern: /\bREVIS(?:Õ|O)ES\s+MAIORES\b/i, nota: 'C', veredicto: 'REVISÕES MAIORES' },
    { pattern: /\bRECONSIDERAR\b/i, nota: 'D', veredicto: 'RECONSIDERAR APÓS REVISÃO SUBSTANCIAL' },
    { pattern: /\bREJEITAR\b/i, nota: 'F', veredicto: 'REJEITAR' },
    { pattern: /\bACEITO\b/i, nota: 'A', veredicto: 'ACEITO' },
  ];

  // PRIORIDADE 1: Buscar na seção DECISÃO EDITORIAL (mais confiável)
  const editorialMatch = reviewText.match(/DECIS(?:Ã|A)O\s+EDITORIAL[^\n]*\n([\s\S]{0,500})/i);
  if (editorialMatch) {
    const editorialText = editorialMatch[1];
    for (const { pattern, nota, veredicto } of patterns) {
      if (pattern.test(editorialText)) {
        console.log(`[AI-REVIEWER] ✅ Grade extraída da DECISÃO EDITORIAL: ${nota} - ${veredicto}`);
        return { nota, veredicto };
      }
    }
  }

  // PRIORIDADE 2: Buscar no texto completo (fallback)
  for (const { pattern, nota, veredicto } of patterns) {
    if (pattern.test(reviewText)) {
      console.log(`[AI-REVIEWER] ⚠️ Grade extraída do texto completo (fallback): ${nota} - ${veredicto}`);
      return { nota, veredicto };
    }
  }

  console.log('[AI-REVIEWER] ❌ Não foi possível extrair grade do texto IA');
  return null;
}

// ============================================================
// NORMALIZAÇÃO (BACKWARDS COMPATIBILITY)
// ============================================================

/**
 * Ajuste 1 (A.12, item (c)): do `qualityAnalysis` recebido, SÓ a lista de respondentes passa, e de cada um só a
 * identidade e o bloco `consistenciaIndividual`. `statistics`, `overall`, `summary`, e em cada respondente `status`,
 * `overallScore`, `score`, `flags`, `recommendation`, `cr` e `metrics`, NÃO são copiados: não chegam ao contexto
 * nem à cópia normalizada que o registro de execução guarda. A cópia da entrada RECEBIDA continua íntegra no registro.
 */
function normalizarQualidade(bruto: any): ReviewRequest['qualityAnalysis'] {
  if (!bruto || typeof bruto !== 'object' || !Array.isArray(bruto.respondents)) return undefined;
  return {
    respondents: bruto.respondents.map((r: any) => ({
      ...(r?.respondentId !== undefined ? { respondentId: r.respondentId } : {}),
      ...(r?.id !== undefined ? { id: r.id } : {}),
      ...(r?.name !== undefined ? { name: r.name } : {}),
      ...(r?.email !== undefined ? { email: r.email } : {}),
      isSimulated: r?.isSimulated === true,
      ...(r?.consistenciaIndividual !== undefined ? { consistenciaIndividual: r.consistenciaIndividual } : {}),
    })),
  };
}

function normalizeRequest(rawData: any): ReviewRequest {
  // A.12: o estado da avaliação vem do contrato, e é conferido; `byStatus` sozinho
  // não é avaliação.
  const avaliacaoDeQualidade: AvaliacaoQualidade = classificarAvaliacaoRecebida(rawData);
  // A.12 etapa 1: a coerência interna é medida sobre a requisição RECEBIDA, e é
  // dimensão independente da disponibilidade.
  const coerenciaDaQualidade = avaliarCoerencia(rawData);
  // A.12, estatísticas por dimensão (saída A): `individualStats` e `criteriaStats` NÃO são lidos.
  // A tela envia o agregado ACHATADO (total, valid, warning, critical), sem separação por
  // dimensão, e a divisão dele por quatro atribuía a cada dimensão um quociente que nenhuma
  // medição sustenta. ⚠ Nada por dimensão é derivado do agregado, e nenhum padrão de zeros
  // substitui a ausência: o bloco declara a estatística por dimensão NÃO DISPONÍVEL nesta
  // requisição. Vale também para um `individualStats` já por dimensão: a saída A não distingue
  // a origem, e nenhum cliente conhecido o envia.

  // Normalizar bocrWeights - converter array em objeto
  let bocrWeights = rawData.bocrWeights || rawData.weights;

  if (Array.isArray(bocrWeights)) {
    console.log(`${LOG_PREFIX} bocrWeights é array, convertendo para objeto BOCR`);
    bocrWeights = {
      Benefits: bocrWeights[0] || 0.25,
      Opportunities: bocrWeights[1] || 0.25,
      Costs: bocrWeights[2] || 0.25,
      Risks: bocrWeights[3] || 0.25,
    };
  }

  if (!bocrWeights) {
    bocrWeights = {
      Benefits: 0.25,
      Opportunities: 0.25,
      Costs: 0.25,
      Risks: 0.25,
    };
  }

  return {
    avaliacaoDeQualidade,
    coerenciaDaQualidade,
    // A.12 etapa 3, estágio 1: COPIADO tal como veio. É esta linha, e não a declaração de
    // `ReviewRequest`, que faz o campo chegar ao contexto: interface não remove campo em execução.
    vinculoDaExecucao: rawData.vinculoDaExecucao,
    projectName: rawData.projectName || rawData.name || 'Projeto sem nome',
    projectDescription: rawData.projectDescription || rawData.description,
    bocrWeights,
    personalWeights: normalizeBOCRWeights(rawData.personalWeights, 'v') || undefined,
    rescalingWeights: normalizeBOCRWeights(rawData.rescalingWeights, 's') || undefined,
    qualityAnalysis: normalizarQualidade(rawData.qualityAnalysis),
    sensitivityInflections: rawData.sensitivityInflections,
    demographicsSummary: rawData.demographicsSummary,
    alternatives: rawData.alternatives || [],
    finalScores: rawData.finalScores || [],
    bocrConsistency: rawData.bocrConsistency || { cr: 0, lambda: 0 },
    subConsistency: rawData.subConsistency || {},
    subWeights: rawData.subWeights || {},
    exclusionInfo: rawData.exclusionInfo,
  };
}

// ============================================================
// SYSTEM PROMPT - PEER REVIEWER ACADÊMICO
// ============================================================

// SYSTEM_PROMPT extracted to ./system-prompt.ts (Phase 7 refactor)

async function generateReview(
  data: ReviewRequest
): Promise<{ review: string; semanticStats: SemanticStats; captura: CapturaDaGeracao }> {
  console.log('[AI-REVIEWER] sensitivityInflections recebido:', JSON.stringify(data.sensitivityInflections));

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // A.32: `getKnowledgeContext()` era calculado aqui e NUNCA interpolado no prompt.
  // A "BASE DE CONHECIMENTO CIENTÍFICO" é montada pelas quatro seções abaixo.
  // A função permanece em `./knowledge` — decidir o destino dela é outra tarefa.
  const criticalRefs = getCriticalRefs();
  // Registro de execução: as referências críticas que ENTRAM no prompt (as oito primeiras), numa variável só, para que o
  // texto interpolado e o conteúdo registrado saiam do mesmo valor.
  const criticalRefsInjetadas = criticalRefs.slice(0, 8);
  const crRefs = getRefsByTopic('consistência');
  const bocrRefs = getRefsByTopic('BOCR');
  const sensibilityRefs = getRefsByTopic('sensibilidade');

  // RAG INJECTION
  const ragThresholds = getRAGThresholds('CR');
  const ragBOCRFormulas = getRAGFormulas('bocr');
  const ragBenchmarks = getRAGBenchmarks();

  // PHASE 6.3.4 — RAG SEMÂNTICO ADITIVO
  // Feature flag USE_RAG_SEMANTIC controla execução real.
  // Quando OFF, retorna { chunks: [], stats: EMPTY_SEMANTIC_STATS } sem custo.
  const { chunks: semanticChunks, stats: semanticStats } = await getSemanticChunks();
  // Registro de execução: o bloco semântico formatado UMA vez; o prompt o interpola e o registro o guarda.
  const blocoSemantico = formatSemanticChunks(semanticChunks);
  if (semanticStats.enabled) {
    console.log(
      `[AI-REVIEWER] RAG semantic: ${semanticStats.queriesRan} queries -> ` +
      `${semanticStats.rawChunks} raw -> ${semanticStats.uniqueChunks} unique -> ` +
      `${semanticStats.finalChunks} final from ${semanticStats.uniqueArticles} papers ` +
      `(top score ${semanticStats.topScore?.toFixed(3) ?? 'N/A'}; ` +
      `${semanticStats.withResults} with results, ${semanticStats.emptyOk} empty ok, ` +
      `${semanticStats.errored} errored, over ${semanticStats.httpAttempts} http attempts)`
    );
  }

  // ⚠ ELEGIBILIDADE, e não disponibilidade: a classificação global só existe quando a avaliação está disponível e
  //   coerente. `qualidadeDisponivel` continua descrevendo só disponibilidade.
  const elegivel = elegivelParaClassificacao(data.avaliacaoDeQualidade, data.coerenciaDaQualidade);
  const avaliada = elegivel.elegivel;

  // Ajuste 1 (A.12, item (c)): o contexto de qualidade individual sai do CR POR MATRIZ, recalculado dos julgamentos e lido
  // do bloco `consistenciaIndividual` de cada respondente ENVIADO. NÃO há categoria de pessoa, score, taxa de validade nem
  // recomendação de exclusão: o formato anterior (`statistics.byStatus`, `summary`, `overallStats`, `status`) não é lido, e
  // `normalizeRequest` nem o copia. Todas as contagens saem da LISTA ENVIADA, e o texto diz a população.
  const listaEnviada: any[] = Array.isArray(data.qualityAnalysis?.respondents) ? (data.qualityAnalysis!.respondents as any[]) : [];
  const leituras = listaEnviada.map((r) => lerConsistenciaDoRespondente(r));
  const painel = resumirPainelDeConsistencia(leituras);

  // O estado da CLASSIFICAÇÃO GLOBAL (o portão), e nunca de uma pessoa. Elegível: nada a dizer além dos números.
  let respondentSummary = '';

  if (avaliada) {
    respondentSummary = '';
  }
  // A.12 etapa 1, C5: a avaliação EXISTE e a classificação está suspensa por CONTRADIÇÃO
  // INTERNA. ⚠ **Dizer aqui que a avaliação não está disponível, ou que os CRs não foram
  // avaliados, seria afirmar ao modelo algo que NÃO foi medido** — a classe de defeito que
  // A.12 existe para corrigir. Este ramo é PRÓPRIO, e não reaproveita o texto abaixo.
  else if (elegivel.causa === 'contradicao') {
    respondentSummary = `
**Qualidade dos Dados:**
⚠️ AVALIAÇÃO INDIVIDUAL DE QUALIDADE DISPONÍVEL, E CLASSIFICAÇÃO SUSPENSA POR CONTRADIÇÃO INTERNA — ${elegivel.motivo}
Os CRs individuais dos respondentes FORAM avaliados; o que não se resolveu foi a contradição entre os valores declarados na própria requisição.
Nenhum percentual de qualidade é apresentado, e a classificação global está SUSPENSA: ${DESCRICAO_SUSPENSAO_POR_CONTRADICAO}.
⚠️ A contradição NÃO é resultado favorável nem desfavorável, e não autoriza tratar nenhum dos valores em conflito como o correto.
Conforme Saaty (1977), a consistência individual é crítica para a validade dos resultados.
`;
  }
  // A.12 etapa 1, D1: a avaliação EXISTE e uma verificação de coerência NÃO CONCLUIU.
  // ⚠ **Não concluir NÃO é contradizer.** Anunciar contradição aqui seria afirmar ao
  // modelo algo que NÃO foi demonstrado, e este ramo é PRÓPRIO por isso.
  else if (elegivel.causa === 'coerencia_nao_concluida' || elegivel.causa === 'coerencia_nao_avaliada') {
    respondentSummary = `
**Qualidade dos Dados:**
⚠️ AVALIAÇÃO INDIVIDUAL DE QUALIDADE DISPONÍVEL, E CLASSIFICAÇÃO SUSPENSA POR VERIFICAÇÃO DE COERÊNCIA NÃO CONCLUÍDA — ${elegivel.motivo}
Os CRs individuais dos respondentes FORAM avaliados; a verificação de coerência não foi concluída, pelo motivo informado acima, e NENHUMA contradição foi demonstrada.
Nenhum percentual de qualidade é apresentado, e a classificação global está SUSPENSA: ${DESCRICAO_DA_SUSPENSAO[elegivel.causa]}.
⚠️ Verificação não concluída NÃO é resultado favorável nem desfavorável, e não autoriza tratar nenhum valor como conferido.
Conforme Saaty (1977), a consistência individual é crítica para a validade dos resultados.
`;
  }
  // Ajuste 1: a avaliação é INCOMPLETA quando há respondente enviado sem CR recalculado. ⚠ Os CRs dos que o têm ESTÃO na
  // lista acima, e dizer que «os CRs individuais NÃO foram avaliados» seria falso para eles; o texto do ramo AUSENTE,
  // abaixo, só é verdadeiro quando nenhum respondente tem CR.
  else if (data.avaliacaoDeQualidade?.estado === 'incompleta' && painel.recalculados > 0) {
    respondentSummary = `
**Qualidade dos Dados:**
⚠️ AVALIAÇÃO INDIVIDUAL DE QUALIDADE INCOMPLETA — ${elegivel.motivo || motivoDaSuspensao(data.avaliacaoDeQualidade)}
Os CRs por matriz dos ${painel.recalculados} respondente(s) que os têm estão na lista acima; cada um dos demais está marcado, um a um, com a condição dos seus julgamentos.
A classificação global está SUSPENSA: ${DESCRICAO_SUSPENSAO_POR_DISPONIBILIDADE}.
⚠️ A ausência de CR de alguns respondentes NÃO é resultado favorável nem desfavorável, e não deve ser tratada como zero.
Conforme Saaty (1977), a consistência individual é crítica para a validade dos resultados.
`;
  }
  // A.12: sem avaliação, nenhum percentual de qualidade é apresentado.
  // ⚠ Texto PRESERVADO palavra por palavra: para `ausente` e para `incompleta` sem nenhum CR as três
  //   afirmações abaixo são VERDADEIRAS.
  else {
    respondentSummary = `
**Qualidade dos Dados:**
⚠️ AVALIAÇÃO INDIVIDUAL DE QUALIDADE NÃO DISPONÍVEL — ${elegivel.motivo || motivoDaSuspensao(data.avaliacaoDeQualidade)}
O CR global agregado (via média geométrica) foi validado; os CRs individuais dos respondentes NÃO foram avaliados.
Nenhum percentual de qualidade é apresentado, e a classificação global está SUSPENSA: ${DESCRICAO_SUSPENSAO_POR_DISPONIBILIDADE}.
⚠️ A ausência de avaliação NÃO é resultado favorável nem desfavorável, e não deve ser tratada como zero por cento medido.
Conforme Saaty (1977), a consistência individual é crítica para a validade dos resultados.
`;
  }

  console.log(`[AI-REVIEWER] Consistência individual: ${painel.recalculados}/${painel.enviados} respondentes com CR recalculado; ${painel.matrizesAcimaDoLimiar}/${painel.matrizesAvaliadas} matrizes acima do limiar`);

  // Ajuste 1: a seção «Estatísticas por Dimensão BOCR» traz o CR POR MATRIZ sobre o painel enviado. O que a precedia dizia
  // que a contagem por dimensão não estava disponível, porque a única fonte era o agregado por categoria, dividido por
  // quatro (removido na saída A). ⚠ Nenhuma contagem por dimensão é derivada de agregado: cada número sai do CR de uma matriz.
  // ⚠ Sem nenhum respondente com CR recalculado, a frase EXISTENTE (a da saída A, para o pedido não avaliado) fica palavra por palavra.
  const blocoPorDimensao =
    painel.recalculados === 0
      ? '⚠️ Não disponíveis: a qualidade individual não foi avaliada. Nenhum percentual por dimensão é apresentado.'
      : estatisticasPorMatriz(painel);

  // A.12 etapa 3, estágio 1, correções antes do aceite: as frases AO REDOR do bloco do vínculo.
  // ⚠ A redação é a MESMA em toda requisição, também na SEM o campo (omitido, `undefined` ou `null`): já não há
  //   redação anterior a conservar. Cada contagem nomeia a população e a etapa, a exaustividade é só da lista
  //   enviada, a relação com o cálculo vem da COMPARAÇÃO das listas (e nunca do estado; sem o campo não há
  //   comparação, e nada se afirma sobre o cálculo), e a regra de menção distingue o participante da divergência
  //   registrada.
  const nEnviados = Array.isArray(data.qualityAnalysis?.respondents) ? data.qualityAnalysis.respondents.length : 0;

  // Contexto de exclusão de respondentes
  let exclusionContext = '';
  if (data.exclusionInfo && data.exclusionInfo.excludedCount > 0) {
    const exclusionRate = ((data.exclusionInfo.excludedCount / data.exclusionInfo.totalCollected) * 100).toFixed(1);
    const linhasDaExclusao = linhasDeExclusaoComVinculo(data.exclusionInfo, exclusionRate, nEnviados);
    exclusionContext = `
**⚠️ FILTRAGEM DE RESPONDENTES APLICADA:**
${linhasDaExclusao.amostra}
${linhasDaExclusao.restantes}
${linhasDaExclusao.excluidos}
- Critério de exclusão: CR > 0.10 (Saaty, 1977)
- Justificativa: A revisão individual dos julgamentos (Saaty, 2003) não foi viável após encerramento da coleta. Na AIJ por média geométrica, julgamentos individuais inconsistentes afetam a agregação do grupo (Forman & Peniwati, 1998). A exclusão foi aplicada ANTES da agregação.
${linhasDaExclusao.qualidade}

**INSTRUÇÃO PARA O REVISOR:** Você DEVE mencionar esta filtragem no RESUMO DA SUBMISSÃO e na seção de CONSISTÊNCIA, usando a cadeia de justificação: limiar (Saaty, 1977) + impossibilidade de revisão (Saaty, 2003) + impacto na agregação (Forman & Peniwati, 1998).
`;
  }

  // ============================================================
  // ANTI-ALUCINAÇÃO: Lista completa de respondentes
  // ============================================================
  let fullRespondentList = '';
  const respondentIds: string[] = [];
  // A.12 etapa 3, estágio 1, R4: as identidades da lista APRESENTADA, com a ORIGEM registrada na construção
  // do `displayId`. O bloco do vínculo compara ESTA lista, e não só as declaradas dentro do vínculo.
  const identidadesApresentadas: IdentidadeApresentada[] = [];

  if (data.qualityAnalysis?.respondents && data.qualityAnalysis.respondents.length > 0) {
    const respondents = data.qualityAnalysis.respondents;
    const lines = respondents.map((r: any, idx: number) => {
      // Sanitizar ID — NUNCA usar rótulo genérico. ⚠ R4: a expressão mora no módulo do vínculo, escrita UMA vez,
      // e devolve o valor E a origem (`respondentId`, `id` ou `posicional`): a origem é registrada AQUI, na
      // construção do `displayId`, e nunca inferida depois pela grafia.
      const identidade = identificarParaApresentacao(r, idx);
      identidadesApresentadas.push(identidade);
      const displayId = identidade.bruto;
      respondentIds.push(displayId);

      // Ajuste 1: o CR POR MATRIZ, recalculado dos julgamentos e lido do bloco do respondente. Nenhum CR solto e nenhum
      // rótulo de pessoa: o que antes saía aqui («CR: x% | Status: y») era o cache legado e uma categoria sem lastro.
      const email = r.email || r.name || '—';

      return `- ID: ${displayId} | Email: ${email} | ${trechoDaLinhaDoRespondente(leituras[idx])}`;
    });

    const frases: FrasesDaLista = frasesDaListaComVinculo(lerVinculoParaTexto(data.vinculoDaExecucao, identidadesApresentadas), respondents.length);

    fullRespondentList = `
${frases.cabecalho}

${lines.join('\n')}

${frases.total}

${frases.agregacao}

${blocoDeConsistenciaDoPainel(painel, frases.cabecalhoDasContagens)}

${frases.regraDeMencao}
`;

    console.log(`${LOG_PREFIX} Anti-alucinação: ${respondents.length} respondentes injetados nominalmente`);
  } else {
    fullRespondentList = `
## DADOS DO SISTEMA — RESPONDENTES
⚠️ Lista individual de respondentes não disponível. Use APENAS as estatísticas agregadas fornecidas.
NUNCA invente ou deduza respondentes individuais.
`;
  }

  // A.12 etapa 3, estágio 1: o vínculo da avaliação de qualidade com a execução do cálculo.
  // ⚠ Requisição SEM `vinculoDaExecucao` (omitido, `undefined` ou `null`) ganha o bloco de AUSÊNCIA, UMA vez, com o
  //   marcador único, no mesmo ponto do bloco do vínculo:
  //   `${exclusionContext}\n${blocoDoVinculo}\n${fullRespondentList}`. ⚠ O bloco declara estado, identificador,
  //   divergência e cobertura enviada (o de ausência declara só a ausência); NÃO emite veredito, NÃO classifica e NÃO
  //   suspende.
  // ⚠ R4: o bloco é montado DEPOIS da lista, porque compara a lista APRESENTADA.
  const textoDoVinculo = descreverVinculoParaContexto(data.vinculoDaExecucao, identidadesApresentadas);
  const blocoDoVinculo = textoDoVinculo === '' ? '' : `\n${textoDoVinculo}\n`;

  // ============================================================
  // ANTI-ALUCINAÇÃO: Fórmula completa com v e s
  // ============================================================
  let formulaSection = '';
  const pw = data.personalWeights;
  const rw = data.rescalingWeights;

  console.log(`${LOG_PREFIX} Pesos normalizados:`, {
    personalWeights: pw,
    rescalingWeights: rw,
    hasPW: !!pw,
    hasRW: !!rw,
    pwValid: pw && typeof pw.Benefits === 'number',
    rwValid: rw && typeof rw.Benefits === 'number',
  });

  if (pw && rw && typeof pw.Benefits === 'number' && typeof rw.Benefits === 'number') {
    formulaSection = `
## DADOS DO SISTEMA — FÓRMULA DE SÍNTESE

**Fórmula implementada (Wijnmalen, 2007, Eq. 17):**
Score_i = vb × sb × B_i + vo × so × O_i − vc × sc × C_i − vr × sr × R_i

**Pesos pessoais (v) — derivados da hierarquia de controle:**
- vb (Benefits) = ${safeFixed(pw.Benefits, 4)}
- vo (Opportunities) = ${safeFixed(pw.Opportunities, 4)}
- vc (Costs) = ${safeFixed(pw.Costs, 4)}
- vr (Risks) = ${safeFixed(pw.Risks, 4)}

**Rescaling weights (s) — para comensurabilidade entre dimensões:**
- sb (Benefits) = ${safeFixed(rw.Benefits, 4)}
- so (Opportunities) = ${safeFixed(rw.Opportunities, 4)}
- sc (Costs) = ${safeFixed(rw.Costs, 4)}
- sr (Risks) = ${safeFixed(rw.Risks, 4)}

⚠️ REGRA: Ao descrever a fórmula, use SEMPRE a forma completa com v E s. NUNCA simplifique.
`;
  } else {
    // Fallback: apenas bocrWeights disponíveis (v), sem rescaling (s)
    const bw = data.bocrWeights || { Benefits: 0.25, Opportunities: 0.25, Costs: 0.25, Risks: 0.25 };
    formulaSection = `
## DADOS DO SISTEMA — FÓRMULA DE SÍNTESE

**Fórmula implementada (baseada em Wijnmalen, 2007):**
Score_i = vb × sb × B_i + vo × so × O_i − vc × sc × C_i − vr × sr × R_i

**Pesos pessoais (v) — derivados da hierarquia de controle:**
- vb (Benefits) = ${safeFixed(bw.Benefits, 4)}
- vo (Opportunities) = ${safeFixed(bw.Opportunities, 4)}
- vc (Costs) = ${safeFixed(bw.Costs, 4)}
- vr (Risks) = ${safeFixed(bw.Risks, 4)}

**Rescaling weights (s):** Não fornecidos separadamente. Os pesos acima já incorporam o rescaling.

⚠️ REGRA: Ao descrever a fórmula, mencione que a síntese subtrativa de Wijnmalen (2007) foi utilizada com os pesos da hierarquia de controle.
`;
  }

  // ============================================================
  // ANTI-ALUCINAÇÃO: Ranking final das alternativas
  // ============================================================
  let finalScoresSection = '';
  const validScores = getValidFinalScores(data);

  console.log(`${LOG_PREFIX} finalScores diagnóstico:`, {
    rawCount: data.finalScores?.length || 0,
    validCount: validScores.length,
    firstRawKeys: data.finalScores?.[0] ? Object.keys(data.finalScores[0]) : [],
    firstValid: validScores[0] ? { code: validScores[0].code, score: validScores[0].score } : null,
  });

  if (validScores.length > 0) {
    finalScoresSection = `
## DADOS DO SISTEMA — RANKING FINAL DAS ALTERNATIVAS

${validScores.map((fs, idx) => `${idx + 1}º ${fs.code || 'N/A'} — ${fs.name || 'Sem nome'}: Score = ${fs.score.toFixed(6)}`).join('\n')}

⚠️ REGRA: Use APENAS estes scores. NUNCA recalcule ou reordene.
`;
  }

  const userPrompt = `
# MANUSCRITO SUBMETIDO

**Título do Projeto:** ${data.projectName}
${data.projectDescription ? `\n**Descrição:** ${data.projectDescription}\n` : ''}


---

# DADOS METODOLÓGICOS COLETADOS

## Especificações do Método
- **Escala de Julgamento:** Escala fundamental 1-9 de Saaty (1977, 1980)
- **Método de Agregação:** Média Geométrica (Saaty, 1990)
- **Cálculo do Eigenvector:** Método da Média Geométrica por linha
- **Limiar de Consistência:** CR ≤ 0.10 (Saaty, 1977)
- **CR Global Agregado:** ${typeof data.bocrConsistency?.cr === 'number' ? safePercent(data.bocrConsistency.cr, 2) : 'Não reportado'}
${data.subConsistency && Object.keys(data.subConsistency).length > 0 ? `
## Consistência das Matrizes Agregadas por Dimensão BOCR
${['B', 'O', 'C', 'R'].map(merit => {
    const cons = data.subConsistency?.[merit];
    const meritName: Record<string, string> = { B: 'Benefits', O: 'Opportunities', C: 'Costs', R: 'Risks' };
    if (cons && typeof cons.cr === 'number') {
      const crStr = safePercent(cons.cr, 2);
      const lambdaStr = safeFixed(cons.lambda, 4);
      const statusIcon = cons.cr <= 0.10 ? '✅' : '⚠️';
      return `- **${meritName[merit]}** (n=5): CR = ${crStr}, λmax = ${lambdaStr} ${statusIcon}`;
    }
    return `- **${meritName[merit]}**: Não disponível`;
  }).join('\n')}

Nota: Estes CRs referem-se às matrizes AGREGADAS por média geométrica (Saaty, 1990), não aos CRs individuais dos respondentes.
Os pesos BOCR (B=${safePercent(data.bocrWeights?.Benefits, 1)}, O=${safePercent(data.bocrWeights?.Opportunities, 1)}, C=${safePercent(data.bocrWeights?.Costs, 1)}, R=${safePercent(data.bocrWeights?.Risks, 1)}) foram derivados de comparações pareadas na hierarquia de controle, conforme Saaty (2003) e Lee (2009).
` : ''}

## Amostra e Qualidade Geral

${exclusionContext}
${blocoDoVinculo}
${fullRespondentList}

${formulaSection}

${finalScoresSection}


${respondentSummary}

## Estatísticas por Dimensão BOCR

${blocoPorDimensao}

## Pesos Finais da Hierarquia de Controle (Méritos BOCR)

- **Benefits (Benefícios):** ${safePercent(data.bocrWeights?.Benefits, 1)}
- **Opportunities (Oportunidades):** ${safePercent(data.bocrWeights?.Opportunities, 1)}
- **Costs (Custos):** ${safePercent(data.bocrWeights?.Costs, 1)}
- **Risks (Riscos):** ${safePercent(data.bocrWeights?.Risks, 1)}

**Ratio Máximo/Mínimo:** ${(() => {
      const weights = [data.bocrWeights?.Benefits, data.bocrWeights?.Opportunities, data.bocrWeights?.Costs, data.bocrWeights?.Risks]
        .filter((w): w is number => typeof w === 'number' && isFinite(w) && w > 0);
      if (weights.length < 2) return 'N/A';
      return (Math.max(...weights) / Math.min(...weights)).toFixed(2);
    })()}:1

---

# BASE DE CONHECIMENTO CIENTÍFICO

## Referências sobre Consistência e Validação de Dados

${crRefs.map(ref => `
**${ref.citation}** - *${ref.topic}*
Contexto: ${ref.context}
Fundamento: ${ref.rule}
`).join('\n')}

## Referências sobre Metodologia BOCR

${bocrRefs.map(ref => `
**${ref.citation}** - *${ref.topic}*
Contexto: ${ref.context}
Fundamento: ${ref.rule}
`).join('\n')}

## Referências sobre Análise de Sensibilidade e Robustez

${sensibilityRefs.map(ref => `
**${ref.citation}** - *${ref.topic}*
Contexto: ${ref.context}
Fundamento: ${ref.rule}
`).join('\n')}

## Referências Críticas Adicionais (Alta Prioridade)

${criticalRefsInjetadas.map(ref => `
**${ref.citation}** - *${ref.topic}*
Fundamento: ${ref.rule}
`).join('\n')}

## Limiares Publicados (RAG)

${ragThresholds}

## Fórmulas de Síntese BOCR Validadas (RAG)

${ragBOCRFormulas}

## Benchmarks Empíricos de Estudos Publicados

${ragBenchmarks}

## Evidências Semânticas Recuperadas (RAG Vetorial)

${blocoSemantico}

---

# RECURSOS DO SISTEMA DISPONÍVEIS

O sistema AHP-BOCR possui os seguintes recursos implementados:

## Análise de Sensibilidade
${(() => {
      const hasSensitivity = data.sensitivityInflections && Object.keys(data.sensitivityInflections).length > 0;
      if (hasSensitivity) {
        const rawDimensions = Object.keys(data.sensitivityInflections);

        // Mapear todas as variações de nomes para display
        const toDisplay: Record<string, string> = {
          'B': 'Benefits',
          'O': 'Opportunities',
          'C': 'Costs',
          'R': 'Risks',
          'Benefícios': 'Benefits',
          'Oportunidades': 'Opportunities',
          'Custos': 'Costs',
          'Riscos': 'Risks',
          'Benefits': 'Benefits',
          'Opportunities': 'Opportunities',
          'Costs': 'Costs',
          'Risks': 'Risks'
        };

        // null = estável (sem ponto de virada), number = tem ponto de virada
        const stableDimensions: string[] = [];
        const unstableDimensions: string[] = [];
        const inflectionDetails: string[] = [];

        rawDimensions.forEach(d => {
          const value = data.sensitivityInflections![d];
          const displayName = toDisplay[d] || d;

          if (value === null) {
            stableDimensions.push(displayName);
          } else if (typeof value === 'number') {
            unstableDimensions.push(displayName);
            // Valor já está em percentual (ex: 42, não 0.42)
            inflectionDetails.push(`  - ${displayName}: ponto de virada em ${value}%`);
          }
        });

        const dimensions = rawDimensions.map(d => toDisplay[d] || d);

        return `✅ **ANÁLISE DE SENSIBILIDADE EXECUTADA**
- Dimensões analisadas: ${dimensions.join(', ')}
- Dimensões estáveis (sem ponto de virada): ${stableDimensions.length > 0 ? stableDimensions.join(', ') : 'Nenhuma'}
- Dimensões com pontos de virada: ${unstableDimensions.length > 0 ? unstableDimensions.join(', ') : 'Nenhuma'}
${inflectionDetails.length > 0 ? `\nPontos de virada identificados:\n${inflectionDetails.join('\n')}` : ''}

**IMPORTANTE:** NÃO afirme que há "ausência" ou "falta" de análise de sensibilidade. A análise FOI executada.
**IMPORTANTE:** NÃO recomende "executar" ou "ativar" análise de sensibilidade - ela JÁ FOI executada.`;
      } else {
        return `⚠️ **ANÁLISE DE SENSIBILIDADE NÃO EXECUTADA**
O sistema possui a funcionalidade, mas não foi executada para este projeto.
Recomende ao pesquisador executar a análise de sensibilidade.`;
      }
    })()}

## Outros Recursos Disponíveis
- ✅ Cálculo automático de CR por respondente
- ✅ CR individual por matriz, recalculado dos julgamentos (BOCR, Magnitude e os quatro blocos de subcritérios)
- ✅ Agregação por média geométrica (Saaty, 1990)
- ✅ Validação externa com pyAHP
- ✅ **Fórmula de síntese BOCR ESPECIFICADA:** Síntese Subtrativa Completa (Wijnmalen, 2007, Eq. 17)
  - Score_i = vb × sb × B_i + vo × so × O_i − vc × sc × C_i − vr × sr × R_i
  - Onde v = pesos pessoais (hierarquia de controle) e s = rescaling weights (comensurabilidade)
  - Os valores exatos de v e s estão na seção DADOS DO SISTEMA — FÓRMULA DE SÍNTESE
  - NÃO afirme que a fórmula não está especificada
  - NÃO simplifique para bB + oO - cC - rR (esta forma omite os rescaling weights)
- ⚠️ Algoritmo de melhoria de consistência (disponível, requer ação do usuário)

## Verificação dos Axiomas de Saaty (1986)
- ✅ **Reciprocidade:** Garantida pela estrutura da matriz de comparações pareadas
- ✅ **Homogeneidade:** Escala 1-9 limita comparações a uma ordem de magnitude
- ✅ **Dependência:** Estrutura hierárquica BOCR respeita dependência funcional
- ✅ **Expectativas:** Ranking final reflete preferências agregadas dos especialistas

## Caracterização da Amostra (Dados Demográficos)
${(() => {
      if (data.demographicsSummary?.hasData && data.demographicsSummary.total > 0) {
        const fields = data.demographicsSummary.fields;
        let details = `✅ **CARACTERIZAÇÃO DA AMOSTRA DISPONÍVEL**
- Total de especialistas com dados demográficos: ${data.demographicsSummary.total}
`;
        if (fields?.formacao && fields.formacao.length > 0) {
          details += `- Níveis de formação: ${fields.formacao.join(', ')}\n`;
        }
        if (fields?.tempoTrabalho && fields.tempoTrabalho.length > 0) {
          details += `- Tempo de experiência: ${fields.tempoTrabalho.join(', ')}\n`;
        }
        if (fields?.funcao && fields.funcao.length > 0) {
          details += `- Funções/cargos: ${fields.funcao.join(', ')}\n`;
        }
        if (fields?.areaAtuacao && fields.areaAtuacao.length > 0) {
          details += `- Áreas de atuação: ${fields.areaAtuacao.join(', ')}\n`;
        }
        if (fields?.idade && fields.idade.length > 0) {
          details += `- Faixas etárias: ${fields.idade.join(', ')}\n`;
        }
        if (fields?.genero && fields.genero.length > 0) {
          details += `- Gênero: ${fields.genero.join(', ')}\n`;
        }
        details += `
**IMPORTANTE:** NÃO afirme que há "falta de caracterização da amostra" ou "ausência de informações sobre o perfil dos especialistas".
Os dados demográficos ESTÃO disponíveis e incluem formação, experiência, cargo e área de atuação.`;
        return details;
      } else {
        return `⚠️ **CARACTERIZAÇÃO DA AMOSTRA NÃO DISPONÍVEL**
Os dados demográficos dos especialistas não foram coletados neste projeto.
Recomende ao pesquisador incluir caracterização da amostra conforme Saaty & Ergu (2015).`;
      }
    })()}

---

# SUA TAREFA

Como **Validador Científico**, confronte CADA métrica apresentada acima com a literatura e produza a revisão seguindo RIGOROSAMENTE a estrutura do system prompt.

**PROTOCOLO DE VALIDAÇÃO:**
Para cada métrica, siga: DADO (valor observado) → REFERÊNCIA (o que a literatura define) → VEREDITO (atende/não atende) → MITIGAÇÃO (se não atende)

**LEMBRE-SE:**
1. Valide APENAS os dados que foram fornecidos — não sugira análises que o sistema não implementa
2. Cite SEMPRE a referência publicada para cada afirmação
3. Reconheça métricas que atendem aos padrões antes de apontar as que não atendem
4. Ações de mitigação devem ser REALIZÁVEIS com o sistema atual
5. **NÃO FAÇA AFIRMAÇÕES FALSAS** - verifique a seção "RECURSOS DO SISTEMA" antes de afirmar que algo está "ausente"

**AFIRMAÇÕES PROIBIDAS (são falsas se os recursos estiverem marcados como ✅):**
- ❌ "Falta de análise de sensibilidade" → A análise FOI executada
- ❌ "Ative/Execute a análise de sensibilidade" → Já está executada
- ❌ "Não especifica fórmula de síntese" → Usa síntese subtrativa completa (Wijnmalen, 2007, Eq. 17) com v e s
- ❌ "Ausência de verificação dos axiomas" → Garantidos pela estrutura do sistema
- ❌ "Implementar análise de sensibilidade" → Já implementada E executada
- ❌ "Falta de caracterização da amostra" → Dados demográficos disponíveis
- ❌ Sugerir integração com ANP, MOMILP, análise multi-período, comparação internacional ou qualquer extensão teórica
- ❌ Sugerir "expandir" ou "complementar" com análises não implementadas
- ❌ Sugerir limiares não publicados (como CR > 0.15)
- ❌ Gerar seções "Médio Prazo" ou "Longo Prazo" — a revisão contém APENAS "AÇÕES DE MITIGAÇÃO" para problemas concretos nos dados

Elabore agora a revisão de validação científica.`;

  // DEBUG: Log da seção de recursos do sistema
  console.log('[AI-REVIEWER] === RECURSOS DO SISTEMA NO PROMPT ===');
  console.log('[AI-REVIEWER] sensitivityInflections:', JSON.stringify(data.sensitivityInflections));
  console.log('[AI-REVIEWER] demographicsSummary:', JSON.stringify(data.demographicsSummary));

  // Verificar se as seções foram geradas corretamente
  if (userPrompt.includes('ANÁLISE DE SENSIBILIDADE EXECUTADA')) {
    console.log('[AI-REVIEWER] ✅ Seção de sensibilidade: EXECUTADA');
  } else if (userPrompt.includes('ANÁLISE DE SENSIBILIDADE NÃO EXECUTADA')) {
    console.log('[AI-REVIEWER] ⚠️ Seção de sensibilidade: NÃO EXECUTADA');
  }

  if (userPrompt.includes('CARACTERIZAÇÃO DA AMOSTRA DISPONÍVEL')) {
    console.log('[AI-REVIEWER] ✅ Seção de demographics: DISPONÍVEL');
  } else if (userPrompt.includes('CARACTERIZAÇÃO DA AMOSTRA NÃO DISPONÍVEL')) {
    console.log('[AI-REVIEWER] ⚠️ Seção de demographics: NÃO DISPONÍVEL');
  }

  // LLM upgrade Phase 6.3.0a (08/mai/2026): Sonnet 4.5 → Opus 4.6 + adaptive thinking
  // Ref: docs/RAG_DECISIONS.md v3 §2.3
  // Breaking changes do Opus 4.7 (temperature/top_p/top_k removidos, prompts mais literais)
  // inviáveis pré-defesa; Opus 4.6 é o sweet spot transitional model.
  const parametrosDaChamada: Anthropic.MessageCreateParamsNonStreaming = {
    model: MODEL_CONFIG.id,
    max_tokens: MODEL_CONFIG.maxTokens,
    thinking: MODEL_CONFIG.thinking,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  };
  // Registro de execução: cópia do objeto EXATO que o SDK recebe, tirada antes da chamada (o que se registra é o que foi
  // enviado, e não uma reconstrução), e o instante de início/término da invocação.
  const parametrosRegistrados = clonarParaRegistro(parametrosDaChamada);
  const inicioDaChamada = new Date();
  const message = await client.messages.create(parametrosDaChamada);
  const terminoDaChamada = new Date();

  const textContent = message.content.find((block) => block.type === 'text');
  const review = textContent && 'text' in textContent ? textContent.text : '';
  const captura: CapturaDaGeracao = {
    inicioDaChamada,
    terminoDaChamada,
    parametros: parametrosRegistrados as CapturaDaGeracao['parametros'],
    respostaDoProvedor: message,
    contexto: clonarParaRegistro({
      estatico: {
        consistencia: crRefs,
        bocr: bocrRefs,
        sensibilidade: sensibilityRefs,
        criticasAdicionais: criticalRefsInjetadas,
        limiaresPublicados: ragThresholds,
        formulasBocr: ragBOCRFormulas,
        benchmarks: ragBenchmarks,
      },
      semantico: {
        consultasConfiguradas: [...RAG_SEMANTIC_QUERIES],
        parametros: {
          topKPorConsulta: RAG_SEMANTIC_TOPK_PER_QUERY,
          maximoPorArtigo: RAG_SEMANTIC_MAX_PER_ARTICLE,
          totalFinal: RAG_SEMANTIC_FINAL_TOPK,
        },
        estatisticas: semanticStats,
        trechos: semanticChunks.map((c) => ({ id: c.id, score: c.score, metadata: { ...c.metadata } })),
        textoInjetadoNoPrompt: blocoSemantico,
      },
    }),
  };
  return { review, semanticStats, captura };
}

// ============================================================
// ENDPOINTS
// ============================================================

export async function GET() {
  const stats = getKnowledgeStats();

  return NextResponse.json({
    name: 'AI Reviewer API',
    version: API_VERSION,
    description: 'Peer Review Acadêmico A1/Q1',
    model: MODEL_CONFIG.id,
    features: [
      'Peer Review como revisor sênior A1/Q1',
      'Análise qualitativa profunda',
      'Identificação de pontos fortes e limitações',
      'Direcionamento específico para melhoria',
      `Fundamentação em ${stats.totalRefs} referências científicas de ${stats.uniqueArticles} artigos (RAG)`,
      'Tom educativo e construtivo',
      'Suporte a bocrWeights como array ou objeto',
      'Conversão automática de formatos',
    ],
    knowledgeBase: {
      totalRefs: stats.totalRefs,
      uniqueArticles: stats.uniqueArticles,
      categories: stats.categories,
    },
  });
}

/**
 * O estado da EXTRAÇÃO do resultado no texto do parecer simulado (`metadata.estadoDaExtracao`).
 *
 * ⚠ **Descreve o RESULTADO DO RECONHECIMENTO TEXTUAL**, e NÃO afirma que o texto não traga uma decisão: o texto
 * pode trazê-la numa forma que nenhum padrão reconhece.
 *
 * | Estado | Quando |
 * |---|---|
 * | `padrao_reconhecido` | classificação NÃO suspensa, e a extração reconheceu um padrão no texto |
 * | `nenhum_padrao_reconhecido` | classificação NÃO suspensa, e a extração NÃO reconheceu nenhum padrão: `nota` e `veredicto` ficam NULOS |
 * | `nao_executada_por_suspensao` | classificação SUSPENSA: a extração NÃO corre (R1) |
 */
type EstadoDaExtracao = 'padrao_reconhecido' | 'nenhum_padrao_reconhecido' | 'nao_executada_por_suspensao';

/**
 * O texto de `mensagemDaExtracao` quando NENHUM padrão é reconhecido (campo de nível principal da resposta).
 *
 * ⚠ Aviso DIAGNÓSTICO: sem letra, e sem veredito automático substituto.
 */
const MENSAGEM_DA_EXTRACAO_SEM_PADRAO = 'Veredito não identificado no texto do parecer simulado.';

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json();
    console.log(`${LOG_PREFIX} Payload recebido`);
    // Registro de execução: SOB PEDIDO da requisição (`incluirRegistroDaExecucao: true`, que a tela sempre envia). Sem o pedido a
    // resposta é a de antes, byte a byte. As cópias da entrada saem aqui, antes de qualquer normalização ou uso.
    const registroSolicitado = rawData?.incluirRegistroDaExecucao === true;
    const idDaGeracao = registroSolicitado ? randomUUID() : null;
    const entradaRecebida = registroSolicitado ? copiaSegura(rawData) : null;

    const data = normalizeRequest(rawData);
    // Registro de execução: cópia dos dados normalizados, tirada antes de a geração e a validação os usarem.
    const entradaNormalizada = registroSolicitado ? copiaSegura(data) : null;
    console.log(`${LOG_PREFIX} Avaliação de qualidade: ${data.avaliacaoDeQualidade?.estado} (${data.avaliacaoDeQualidade?.fonte})`);
    console.log(`${LOG_PREFIX} Dados normalizados - bocrWeights:`, JSON.stringify(data.bocrWeights));

    // DEBUG: Verificar dados recebidos
    const debugInfo = {
      sensitivityInflections: data.sensitivityInflections,
      hasSensitivity: !!(data.sensitivityInflections && Object.keys(data.sensitivityInflections).length > 0),
      demographicsSummary: data.demographicsSummary,
      hasDemographics: !!(data.demographicsSummary?.hasData && data.demographicsSummary.total > 0),
    };
    console.log(`${LOG_PREFIX} DEBUG INFO:`, JSON.stringify(debugInfo));

    const classification = calculateGrade(data);
    console.log(`${LOG_PREFIX} Classificação:`, classification);

    console.log(`${LOG_PREFIX} Iniciando chamada à API Anthropic...`);
    const { review, semanticStats, captura } = await generateReview(data);
    console.log(`${LOG_PREFIX} Revisão gerada com sucesso!`, review.substring(0, 100) + '...');

    // ANTI-ALUCINAÇÃO: Validação pós-geração
    const respondentIds = (data.qualityAnalysis?.respondents || []).map(
      (r: any, idx: number) => r.respondentId || r.id || `hash_${idx.toString().padStart(3, '0')}`
    );
    const validation = validateReviewOutput(review, respondentIds, data);

    if (validation.estado === 'reprovado') {
      console.error(`${LOG_PREFIX} ⚠️ VALIDAÇÃO REPROVADA:`, validation.issues);
    } else if (validation.estado === 'inconclusivo') {
      console.warn(`${LOG_PREFIX} ⚠️ VALIDAÇÃO INCONCLUSIVA:`, validation.inconclusivos);
    }
    if (validation.warnings.length > 0) {
      console.warn(`${LOG_PREFIX} ⚠️ Avisos de validação:`, validation.warnings);
    }

    // FONTE ÚNICA: o texto do parecer simulado. ⚠ SEM valor automático substituto: quando nenhum padrão é
    // reconhecido no texto, `nota` e `veredicto` ficam NULOS, e a mensagem vai em `mensagemDaExtracao`.
    // ⚠ A.12, R1: com a classificação SUSPENSA, a extração NÃO corre e NÃO restabelece nota nem
    // veredicto. O texto do modelo não supre avaliação de qualidade ausente ou contraditória.
    const aiGrade = classification.suspensa ? null : extractGradeFromReview(review);
    const finalNota = aiGrade ? aiGrade.nota : null;
    const finalVeredicto = aiGrade ? aiGrade.veredicto : null;
    const estadoDaExtracao: EstadoDaExtracao = classification.suspensa
      ? 'nao_executada_por_suspensao'
      : aiGrade
        ? 'padrao_reconhecido'
        : 'nenhum_padrao_reconhecido';
    // ⚠ Aviso DIAGNÓSTICO: o valor depende SÓ do estado da extração, e independe do estado de A.27.
    const mensagemDaExtracao = estadoDaExtracao === 'nenhum_padrao_reconhecido' ? MENSAGEM_DA_EXTRACAO_SEM_PADRAO : null;
    // ⚠ Aviso DIAGNÓSTICO do que a requisição trouxe em `vinculoDaExecucao`, lido do VALOR (e não de `modo`, que une `undefined` e
    //   `null`). Não é critério de nota, não suspende a classificação e NÃO chega à decisão: a elegibilidade e a nota não o recebem.
    const estadoDoVinculo = estadoDoVinculoNaResposta(data.vinculoDaExecucao);
    if (classification.suspensa) {
      console.log(`${LOG_PREFIX} Nota suspensa: ${classification.motivo}`);
    }

    if (aiGrade && !classification.suspensa) {
      console.log(`${LOG_PREFIX} ✅ Nota IA (autoritativa): ${aiGrade.nota} - ${aiGrade.veredicto}`);
    } else if (!classification.suspensa) {
      console.log(`${LOG_PREFIX} ⚠️ Nenhum padrão de nota ou veredicto reconhecido no texto do parecer simulado: nota e veredicto ficam nulos, sem valor automático substituto`);
    }

    const corpo = {
      success: true,
      nota: finalNota,
      veredicto: finalVeredicto,
      // A.12: a ausência de avaliação suspende a classificação, e diz por quê.
      // ⚠ C5: o rótulo é o da CAUSA. Com a avaliação disponível e contraditória, dizer
      //   "qualidade individual não avaliada" seria falso.
      // ⚠ D1: a CAUSA vai num campo próprio, para que a apresentação não precise
      //   inferi-la do texto, e para que contradição demonstrada e verificação não
      //   concluída nunca se confundam na saída.
      notaSuspensa: classification.suspensa
        ? (() => {
            const e = elegivelParaClassificacao(data.avaliacaoDeQualidade, data.coerenciaDaQualidade);
            return {
              suspensa: true,
              causa: e.causa,
              rotulo: e.rotulo || ROTULO_NOTA_SUSPENSA,
              motivo: classification.motivo,
              avaliacaoDeQualidade: data.avaliacaoDeQualidade,
            };
          })()
        : null,
      // ⚠ Aviso DIAGNÓSTICO da extração (campo de NÍVEL PRINCIPAL, e não de `metadata`): texto só quando
      //   `metadata.estadoDaExtracao` é `nenhum_padrao_reconhecido`, e `null` nos outros dois estados. O valor
      //   independe do estado de A.27.
      mensagemDaExtracao,
      // ⚠ Campo de NÍVEL PRINCIPAL, só nas respostas de sucesso com parecer: o `catch` não o traz, porque `data` é declarada dentro do `try`
      //   e a resposta de erro não o exige. Sem mensagem acompanhante: o texto ao gestor é composto na apresentação.
      estadoDoVinculo,
      review,
      // `success` informa que a geração terminou. A autorização para apresentar
      // o texto vem exclusivamente deste contrato versionado (A.27, eixo 2).
      validation: toReviewValidationContract(validation),
      metadata: {
        version: API_VERSION,
        model: MODEL_CONFIG.id,
        timestamp: new Date().toISOString(),
        estadoDaExtracao,
        avaliacaoDeQualidade: data.avaliacaoDeQualidade,
        knowledgeBase: {
          refsUsed: getKnowledgeStats().totalRefs,
          criticalRefs: getCriticalRefs().length,
          uniqueArticles: getKnowledgeStats().uniqueArticles,
          semantic: semanticStats,
        },
        debug: debugInfo
      },
    };

    // Registro de execução, SOB PEDIDO. ⚠ Montado a partir do que foi capturado no ponto da chamada real e do PRÓPRIO corpo que
    // sai (`corpo`): texto, validação e metadados do registro são os desta mesma resposta. Vai em `metadata`, que a tela já repassa
    // inteiro ao parecer apresentado. Falha ao montar NÃO derruba o parecer (já gerado e validado): a resposta declara o registro
    // indisponível e o motivo, e a tela mostra isso. Não há registro parcial silencioso.
    if (registroSolicitado && idDaGeracao !== null && entradaRecebida !== null && entradaNormalizada !== null) {
      try {
        const registro = montarRegistroDaExecucao({
          idDaGeracao,
          versaoDaApi: API_VERSION,
          ambiente: {
            commit: process.env.VERCEL_GIT_COMMIT_SHA,
            idDaImplantacao: process.env.VERCEL_DEPLOYMENT_ID,
            ambienteDaImplantacao: process.env.VERCEL_ENV,
          },
          entradaRecebida: entradaRecebida.copia,
          entradaNormalizada: entradaNormalizada.copia,
          falhasDeSnapshot: [
            ...(entradaRecebida.falha === null
              ? []
              : [{ campo: 'entrada.recebidaPelaApi', motivo: `A cópia da entrada recebida falhou: ${entradaRecebida.falha}` }]),
            ...(entradaNormalizada.falha === null
              ? []
              : [{ campo: 'entrada.normalizada', motivo: `A cópia dos dados normalizados falhou: ${entradaNormalizada.falha}` }]),
          ],
          chamada: {
            provedor: 'anthropic',
            inicio: captura.inicioDaChamada,
            termino: captura.terminoDaChamada,
            parametros: captura.parametros,
            resposta: captura.respostaDoProvedor,
          },
          contexto: captura.contexto,
          respostaDaRota: corpo,
        });
        Object.assign(corpo.metadata, { registroDaExecucao: registro });
        console.log(
          `${LOG_PREFIX} Registro da execução ${idDaGeracao} montado: ` +
          `${registro.completude.completo ? 'completo' : `incompleto (${registro.completude.ausencias.length} ausência(s))`}`
        );
      } catch (erroDoRegistro: any) {
        const motivo = `Falha ao montar o registro da execução ${idDaGeracao}: ${erroDoRegistro?.message ?? String(erroDoRegistro)}`;
        Object.assign(corpo.metadata, { registroDaExecucao: null, registroDaExecucaoIndisponivel: { motivo } });
        console.error(`${LOG_PREFIX} ${motivo}`);
      }
    }

    return NextResponse.json(corpo);

  } catch (error: any) {
    const stackLines = (error.stack || '').split('\n').slice(0, 20).join('\n');
    console.error(`${LOG_PREFIX} ERRO CRÍTICO:`, error.message);
    console.error(`${LOG_PREFIX} Stack:\n`, stackLines);
    return NextResponse.json(
      {
        error: 'Erro ao gerar revisão acadêmica',
        details: error.message,
        errorType: error.name,
      },
      { status: 500 }
    );
  }
}
