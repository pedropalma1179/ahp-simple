// app/api/ai-reviewer/route.ts
// API de Revisão IA - PEER REVIEW ACADÊMICO A1/Q1
// Versão: ver constante API_VERSION abaixo
// Features: Análise Qualitativa Profunda + RAG + Detecção de Viés (Dodevska et al., 2023) + Anti-Alucinação

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getKnowledgeContext, getKnowledgeStats, getCriticalRefs, getRefsByTopic, getRAGThresholds, getRAGFormulas, getRAGBenchmarks } from './knowledge';
import { analyzeBias, formatBiasForPrompt, BiasAnalysisResult } from './bias-detection';
import { analyzeDominance, buildDominancePromptSection } from '@/lib/analysis/dominanceAnalyzer';
import { validateCitationsAgainstWhitelist } from '@/lib/rag/citation-whitelist';

// ============================================================
// VERSÃO E LOGGING (fonte única de verdade)
// ============================================================
const API_VERSION = '7.2.0';
const API_TAG = 'dominance-analysis';
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

/**
 * Retorna apenas os finalScores com valores válidos e ordenados descendentemente.
 * Única fonte de scores válidos no arquivo — evita TypeError em .toFixed() 
 * quando o payload contém itens com score undefined/null/NaN.
 * 
 * Aceita múltiplas nomenclaturas de campo de score (ordem de prioridade):
 * 1. score — padrão unificado
 * 2. scoreSubtractive — fórmula subtrativa de Wijnmalen (2007, Eq. 17), retornado por /api/calculate
 * 3. finalScore — nomenclatura alternativa legada
 * 
 * A saída é sempre normalizada para { code, name, score: number, ... }.
 */
function getValidFinalScores(
  data: { finalScores?: Array<{ [key: string]: any }> }
): Array<{ code: string; name: string; score: number;[key: string]: any }> {
  if (!data.finalScores || !Array.isArray(data.finalScores) || data.finalScores.length === 0) {
    return [];
  }

  return (data.finalScores
    .map((fs: any) => {
      // Resolver o score priorizando nomenclaturas mais específicas
      let resolvedScore: number | undefined;
      if (typeof fs?.score === 'number') resolvedScore = fs.score;
      else if (typeof fs?.scoreSubtractive === 'number') resolvedScore = fs.scoreSubtractive;
      else if (typeof fs?.finalScore === 'number') resolvedScore = fs.finalScore;

      return {
        ...fs,
        score: resolvedScore, // sobrescreve ou cria o campo score
      };
    })
    .filter((fs: any) => 
      fs && 
      typeof fs.score === 'number' && 
      !isNaN(fs.score) && 
      isFinite(fs.score)
    )
    .sort((a: any, b: any) => b.score - a.score) as unknown) as Array<{ code: string; name: string; score: number;[key: string]: any }>;
}

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const MODEL_CONFIG = {
  id: 'claude-opus-4-6',
  maxTokens: 16000,  // Aumentado para análise mais profunda
  thinking: { type: 'adaptive' as const },
};

// ============================================================
// TIPOS
// ============================================================

interface IndividualStats {
  total: number;
  valid: number;
  warning: number;
  critical: number;
  avgCR?: number;
}

interface RespondentData {
  id: string;
  name?: string;
  avgCR: number;
  status: 'OK' | 'SUSPEITO' | 'CRÍTICO';
}

interface ReviewRequest {
  projectName: string;
  projectDescription?: string;
  sensitivityInflections?: Record<string, number | null>;
  alternatives?: Array<{ code: string; name: string; description?: string }>;
  ipcMetadata?: {
    bocr: { method: string; completeness: any };
    magnitude: { method: string; completeness: any };
    subcriteria: Record<string, { method: string; completeness: any }>;
    hasIncompleteGroups: boolean;
  };
  finalScores?: Array<{ code: string; name: string; score: number;[key: string]: any }>;
  demographicsSummary?: {
    total: number;
    hasData: boolean;
    fields?: {
      idade?: string[];
      genero?: string[];
      formacao?: string[];
      tempoTrabalho?: string[];
      funcao?: string[];
      areaAtuacao?: string[];
    };
  };
  exclusionInfo?: {
    totalCollected: number;
    activeCount: number;
    excludedCount: number;
    reason: string;
  };
  individualStats: {
    Benefits: IndividualStats;
    Opportunities: IndividualStats;
    Costs: IndividualStats;
    Risks: IndividualStats;
  };
  bocrWeights: {
    Benefits: number;
    Opportunities: number;
    Costs: number;
    Risks: number;
  };
  personalWeights?: {
    Benefits: number;
    Opportunities: number;
    Costs: number;
    Risks: number;
  };
  rescalingWeights?: {
    Benefits: number;
    Opportunities: number;
    Costs: number;
    Risks: number;
  };
  bocrConsistency?: {
    cr: number;
    lambda: number;
  };
  subConsistency?: Record<string, { cr: number; lambda: number }>;
  subWeights?: Record<string, number[]>;
  qualityAnalysis?: {
    respondents: RespondentData[];
    // Formato da API response-quality
    statistics?: {
      total: number;
      byStatus: {
        'CONFIÁVEL'?: number;
        'CONFIAVEL'?: number;
        'REVISAR'?: number;
        'SUSPEITO'?: number;
        'CRÍTICO'?: number;
        'CRITICO'?: number;
        'DESCONHECIDO'?: number;
      };
      avgCR?: number;
      avgScore?: number;
      knownCRCount?: number;
    };
    overall?: {
      status: string;
      qualityScore: number;
      recommendation: string;
    };
    summary?: {
      total: number;
      ok: number;
      suspicious: number;
      critical: number;
    };
  };
  overallStats?: {
    total: number;
    valid: number;
    warning: number;
    critical: number;
  };
}

// ============================================================
// SISTEMA DE CLASSIFICAÇÃO AUTOMÁTICA
// ============================================================

function calculateGrade(data: ReviewRequest): { nota: string; veredicto: string; score: number } {
  const stats = data.individualStats;
  const weights = data.bocrWeights;

  let score = 100;

  // ============================================================
  // AVALIAÇÃO DE QUALIDADE DOS DADOS (40 pontos)
  // Baseado em Saaty (1977, 1980): CR individual é crítico
  // ============================================================

  let totalRespondents = 0;
  let validCount = 0; // CR ≤ 0.10
  let warningCount = 0; // 0.10 < CR ≤ 0.20
  let criticalCount = 0; // CR > 0.20
  let unknownCount = 0; // CR não disponível

  // PRIORIDADE 1: Usar qualityAnalysis.statistics.byStatus (da API response-quality)
  if (data.qualityAnalysis?.statistics?.byStatus) {
    const byStatus = data.qualityAnalysis.statistics.byStatus;
    validCount = (byStatus['CONFIÁVEL'] || byStatus['CONFIAVEL'] || 0);
    warningCount = (byStatus['REVISAR'] || 0);
    criticalCount = (byStatus['SUSPEITO'] || 0) + (byStatus['CRÍTICO'] || byStatus['CRITICO'] || 0);
    unknownCount = byStatus['DESCONHECIDO'] || 0;
    totalRespondents = data.qualityAnalysis.statistics.total || (validCount + warningCount + criticalCount + unknownCount);
    console.log(`${LOG_PREFIX} Usando statistics.byStatus: ${validCount}✅ ${warningCount}⚠️ ${criticalCount}❌ ${unknownCount}❓`);
  }
  // PRIORIDADE 2: Contar dos respondents array
  else if (data.qualityAnalysis?.respondents && data.qualityAnalysis.respondents.length > 0) {
    data.qualityAnalysis.respondents.forEach((r: any) => {
      const status = r.status;
      if (status === 'CONFIÁVEL' || status === 'CONFIAVEL') validCount++;
      else if (status === 'REVISAR') warningCount++;
      else if (status === 'SUSPEITO' || status === 'CRÍTICO' || status === 'CRITICO') criticalCount++;
      else if (status === 'DESCONHECIDO') unknownCount++;
    });
    totalRespondents = data.qualityAnalysis.respondents.length;
    console.log(`${LOG_PREFIX} Contando respondents: ${validCount}✅ ${warningCount}⚠️ ${criticalCount}❌ ${unknownCount}❓`);
  }
  // PRIORIDADE 3: Usar overallStats
  else if (data.overallStats && data.overallStats.total > 0) {
    totalRespondents = data.overallStats.total;
    validCount = data.overallStats.valid;
    warningCount = data.overallStats.warning || 0;
    criticalCount = data.overallStats.critical || 0;
    console.log(`${LOG_PREFIX} Usando overallStats: ${validCount}✅ ${warningCount}⚠️ ${criticalCount}❌`);
  }
  // PRIORIDADE 4: Usar qualityAnalysis.summary
  else if (data.qualityAnalysis?.summary && data.qualityAnalysis.summary.total > 0) {
    totalRespondents = data.qualityAnalysis.summary.total;
    validCount = data.qualityAnalysis.summary.ok || 0;
    warningCount = data.qualityAnalysis.summary.suspicious || 0;
    criticalCount = data.qualityAnalysis.summary.critical || 0;
    console.log(`${LOG_PREFIX} Usando qualityAnalysis.summary: ${validCount}✅ ${warningCount}⚠️ ${criticalCount}❌`);
  }
  // FALLBACK: Sem dados de qualidade
  else {
    console.log(`${LOG_PREFIX} ⚠️ Sem dados de qualidade individual disponíveis`);
    // Penalizar por falta de dados (não podemos assumir qualidade)
    score -= 15;
  }

  // Calcular taxa de validade
  const validPercent = totalRespondents > 0
    ? (validCount / totalRespondents) * 100
    : 0;

  const problematicPercent = totalRespondents > 0
    ? ((warningCount + criticalCount) / totalRespondents) * 100
    : 0;

  console.log(`${LOG_PREFIX} Validade: ${validPercent.toFixed(1)}%, Problemáticos: ${problematicPercent.toFixed(1)}%`);

  // Penalizações por qualidade individual (Saaty, 1977)
  // Escala proporcional: penalização reflete a gravidade real
  if (validPercent < 30) {
    score -= 40; // Menos de 30% válidos = catastrófico
    console.log(`${LOG_PREFIX} Penalidade: -40 (validPercent < 30%)`);
  } else if (validPercent < 50) {
    score -= 30; // 30-50% válidos = crítico
    console.log(`${LOG_PREFIX} Penalidade: -30 (validPercent < 50%)`);
  } else if (validPercent < 70) {
    score -= 20; // 50-70% válidos = problemático
    console.log(`${LOG_PREFIX} Penalidade: -20 (validPercent < 70%)`);
  } else if (validPercent < 85) {
    score -= 10; // 70-85% válidos = aceitável com ressalvas
    console.log(`${LOG_PREFIX} Penalidade: -10 (validPercent < 85%)`);
  }

  // Penalização adicional por respondentes críticos (CR > 0.20)
  const criticalPercent = totalRespondents > 0 ? (criticalCount / totalRespondents) * 100 : 0;
  if (criticalPercent > 30) {
    score -= 15;
    console.log(`${LOG_PREFIX} Penalidade: -15 (criticalPercent > 30%)`);
  } else if (criticalPercent > 20) {
    score -= 10;
    console.log(`${LOG_PREFIX} Penalidade: -10 (criticalPercent > 20%)`);
  } else if (criticalPercent > 10) {
    score -= 5;
    console.log(`${LOG_PREFIX} Penalidade: -5 (criticalPercent > 10%)`);
  }

  // ============================================================
  // HOMOGENEIDADE BOCR (20 pontos)
  // ============================================================
  const maxWeight = Math.max(weights.Benefits, weights.Opportunities, weights.Costs, weights.Risks);
  const minWeight = Math.min(weights.Benefits, weights.Opportunities, weights.Costs, weights.Risks);
  const weightRatio = maxWeight / minWeight;

  if (weightRatio > 10) {
    score -= 20;
    console.log(`${LOG_PREFIX} Penalidade: -20 (weightRatio > 10)`);
  } else if (weightRatio > 5) {
    score -= 10;
    console.log(`${LOG_PREFIX} Penalidade: -10 (weightRatio > 5)`);
  }

  // Penalidade se Riscos muito baixo (pode indicar viés)
  if (weights.Risks < 0.10) {
    score -= 5;
    console.log(`${LOG_PREFIX} Penalidade: -5 (Risks < 10%)`);
  }

  console.log(`${LOG_PREFIX} Score final: ${score}/100`);

  // ============================================================
  // CLASSIFICAÇÃO FINAL
  // ============================================================
  let nota: string;
  let veredicto: string;

  if (score >= 90) {
    nota = 'A';
    veredicto = 'ACEITO';
  } else if (score >= 80) {
    nota = 'B';
    veredicto = 'ACEITO COM REVISÕES MENORES';
  } else if (score >= 70) {
    nota = 'C';
    veredicto = 'REVISÕES MAIORES NECESSÁRIAS';
  } else if (score >= 60) {
    nota = 'D';
    veredicto = 'RECONSIDERAR APÓS REVISÃO SUBSTANCIAL';
  } else {
    nota = 'F';
    veredicto = 'REJEITAR';
  }

  console.log(`${LOG_PREFIX} Resultado: ${nota} (${score}/100) - ${veredicto}`);

  return { nota, veredicto, score };
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

function normalizeRequest(rawData: any): ReviewRequest {
  // Detectar se individualStats está no formato agregado (sem dimensões)
  let individualStats = rawData.individualStats || rawData.criteriaStats;

  // Se individualStats não tem as dimensões BOCR, criar com valores agregados
  if (individualStats && !individualStats.Benefits) {
    console.log(`${LOG_PREFIX} Formato agregado detectado, distribuindo para dimensões BOCR`);
    const aggregated = individualStats;
    individualStats = {
      Benefits: {
        total: Math.floor(aggregated.total / 4) || 0,
        valid: Math.floor(aggregated.valid / 4) || 0,
        warning: Math.floor(aggregated.warning / 4) || 0,
        critical: Math.floor(aggregated.critical / 4) || 0,
      },
      Opportunities: {
        total: Math.floor(aggregated.total / 4) || 0,
        valid: Math.floor(aggregated.valid / 4) || 0,
        warning: Math.floor(aggregated.warning / 4) || 0,
        critical: Math.floor(aggregated.critical / 4) || 0,
      },
      Costs: {
        total: Math.floor(aggregated.total / 4) || 0,
        valid: Math.floor(aggregated.valid / 4) || 0,
        warning: Math.floor(aggregated.warning / 4) || 0,
        critical: Math.floor(aggregated.critical / 4) || 0,
      },
      Risks: {
        total: Math.floor(aggregated.total / 4) || 0,
        valid: Math.floor(aggregated.valid / 4) || 0,
        warning: Math.floor(aggregated.warning / 4) || 0,
        critical: Math.floor(aggregated.critical / 4) || 0,
      },
    };
  }

  // Se ainda não tem, usar valores padrão
  if (!individualStats) {
    individualStats = {
      Benefits: { total: 0, valid: 0, warning: 0, critical: 0 },
      Opportunities: { total: 0, valid: 0, warning: 0, critical: 0 },
      Costs: { total: 0, valid: 0, warning: 0, critical: 0 },
      Risks: { total: 0, valid: 0, warning: 0, critical: 0 },
    };
  }

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
    projectName: rawData.projectName || rawData.name || 'Projeto sem nome',
    projectDescription: rawData.projectDescription || rawData.description,
    individualStats,
    bocrWeights,
    personalWeights: normalizeBOCRWeights(rawData.personalWeights, 'v') || undefined,
    rescalingWeights: normalizeBOCRWeights(rawData.rescalingWeights, 's') || undefined,
    qualityAnalysis: rawData.qualityAnalysis,
    overallStats: rawData.overallStats || rawData.qualityMetrics,
    sensitivityInflections: rawData.sensitivityInflections,
    demographicsSummary: rawData.demographicsSummary,
    ipcMetadata: rawData.ipcMetadata,
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

const SYSTEM_PROMPT = `Você é um **Validador Científico** especializado em AHP-BOCR, com a função de confrontar os dados computacionais do sistema com a literatura científica publicada.

**SUA MISSÃO:**
Para cada métrica gerada pelo sistema (CR, pesos BOCR, sensibilidade, viés), verificar:
1. O que o DADO mostra
2. O que a LITERATURA diz sobre esse valor
3. Como MITIGAR se o valor estiver fora dos padrões publicados

Você NÃO sugere análises que o sistema não implementa. Você valida o que já foi calculado.

**TOM DE COMUNICAÇÃO:**
- Terceira pessoa impessoal: "O estudo apresenta...", "Observa-se que..."
- Baseado em evidências: CADA afirmação cita a referência publicada
- Construtivo: toda crítica acompanha ação de mitigação
- Equilibrado: reconheça métricas que atendem aos padrões antes de apontar as que não atendem

**REGRA CRÍTICA — REFERÊNCIAS:**
Use SOMENTE estas referências autorizadas (sincronizadas com os 35 articles do RAG). NUNCA invente autores ou anos:

Fundamentos AHP — Saaty:
- Saaty (1977) — CR ≤ 0.10, escala 1-9, RCI original (Tabela 2), fadiga cognitiva 7±2 (citando Miller, 1956)
- Saaty (1986) — Axiomas do AHP (reciprocidade, homogeneidade, dependência, expectativas)
- Saaty (1987) — Visão geral do AHP, propriedades recíprocas
- Saaty (1990) — Agregação por média geométrica em grupo
- Saaty (2003) — Eigenvector method, algoritmo de correção da entrada mais inconsistente da PCM
- Saaty & Ozdemir (2003) — Negative Priorities, BOCR (Aditivo Residual / Multiplicativo / Subtrativo)
- Saaty & Vargas (1984) — Preservação de rank, transitividade ordinal
- Saaty & Vargas (2012) — Modelos, métodos e aplicações AHP (livro)
- Saaty & Ergu (2015) — Confiabilidade em MCDM, CR > 0.20 não confiável

Síntese BOCR e Hierarquia de Controle:
- Wijnmalen (2007) — Fórmulas de síntese BOCR, comensurabilidade, Eq. 17
- Lee (2009) — Hierarquia de controle BOCR
- Mu (2016) — Distinção certeza/incerteza em BOCR (MECE)
- Petrillo et al. (2023) — Estado da arte BOCR, princípio MECE
- Demirtas & Ustun (2008) — ANP-BOCR com MOMILP

Agregação, Consistência e IPC:
- Forman & Peniwati (1998) — AIJ vs AIP em grupo
- Aull-Hyde et al. (2006) — Adequação de N respondentes em AIJ via média geométrica
- Escobar (2004) — CR_grupo ≤ max(CR_individual) na agregação por média geométrica
- Ossadnik et al. (2016) — Efeito compensatório da média geométrica
- Salomon (2024) — Consistency como medida primária de qualidade dos dados em AHP
- Xu (2000) — Convergência da consistência em AIJ
- Bozóki, Fülöp & Rónyai (2010) — Matrizes incompletas: unicidade, LLSM, grafo conectado
- Harker (1987) — Primeiro tratamento formal de IPC no AHP

Aplicações e Sensibilidade:
- Kabak (2014) — Benchmarks AHP-BOCR no setor energético
- Ishizaka & Labib (2011) — Análise de sensibilidade em AHP
- Tavana et al. (2023) — Revisão AHP, guidance sobre dimensão de painéis

Fairness e Viés Profissional:
- Dodevska et al. (2023) — Fairness e Disparate Impact em AHP (regra dos 80% via Eq. 10 e 15)
- Neely, Lovelace, Cowen & Hiller (2020) — Metacritiques of Upper Echelons Theory: cognitive black box (field of vision, selective perception, interpretation), managerial discretion, contingencies
- Saiyed, Tatoglu, Ali & Dutta (2023) — CEO power and cognitive bias in volatile/emerging market contexts, double-edged sword of upper echelons factors
- Ayan, Abacıoğlu & Basilio (2023) — Weighting methods in MCDM: subjective vs. objective vs. combinative; bounded rationality; weight distributions are method- and panel-dependent

Se precisar mencionar conceitos de outras áreas (ex: viés cognitivo), use "conforme a literatura de [área]" SEM inventar autor. EXCEÇÃO: para viés profissional em painéis MCDM, pode citar diretamente Neely et al. (2020), Saiyed et al. (2023) e Ayan et al. (2023), que estão no RAG e são autorizados.

**REGRAS DE ATRIBUIÇÃO DESAMBIGUADAS (PVB):**
- "Saaty (2003)" SEM coautor refere-se EXCLUSIVAMENTE ao paper Eigenvector / correção de PCM
- Para fórmulas BOCR (Aditivo Residual, Multiplicativo, Subtrativo), cite "Saaty & Ozdemir (2003)" — NÃO use "Saaty (2003)" sozinho
- "Saaty (2012)" SEM coautor é PROIBIDO. Use SEMPRE "Saaty & Vargas (2012)" — o livro é coautorado
- "Saaty (1980)" como fonte é PROIBIDO — não está no RAG. Para escala 1-9 e CR ≤ 0.10, use "Saaty (1977)"
- "Feldman et al. (2015)" como fonte é PROIBIDO — não está no RAG. Para regra dos 80%, use "Dodevska et al. (2023, Eq. 10)"
- "Saaty & Vargas (2007)" e "Crawford & Williams (1985)" são PROIBIDOS — não estão no RAG

**REGRA CRÍTICA — LIMIARES:**
Use APENAS limiares publicados:
- CR ≤ 0.10: aceitabilidade (Saaty, 1977, p. 271)
- DI ≥ 0.80: regra dos 80% (Dodevska et al., 2023, Eq. 10)
- DI ≤ 1.25: limite superior (Dodevska et al., 2023, Eq. 15)
NUNCA sugira limiares inventados (como CR > 0.15).

**REGRA CRÍTICA — ATRIBUIÇÃO DE CONCEITOS:**
- CR alto = inconsistência lógica (violação de transitividade) → citar Saaty (1977)
- Disparate Impact = fairness em rankings → citar Dodevska et al. (2023, Eq. 10 e 15)
- Viés cognitivo (ancoragem, confirmação) → citar "conforme a literatura de psicologia cognitiva", NUNCA atribuir a Dodevska

**REGRA CRÍTICA — EXCLUSÃO DE RESPONDENTES:**
Se o manuscrito indica que respondentes foram excluídos por inconsistência (CR > 0.10), você DEVE:
1. No RESUMO: Mencionar "N especialistas incluídos na análise (de M coletados, após filtragem por consistência)"
2. Na seção CONSISTÊNCIA: Descrever a filtragem como procedimento metodológico, explicando a cadeia de justificação:
   a) Saaty (1977) estabelece CR ≤ 0.10 como limiar de aceitabilidade
   b) Saaty (2003) recomenda identificar e corrigir a entrada mais inconsistente da PCM — porém, quando a revisão pelos respondentes não é viável (coleta já encerrada, pesquisa retrospectiva), a alternativa prática é a exclusão
   c) Forman & Peniwati (1998) demonstram que na AIJ (Aggregation of Individual Judgments via média geométrica), a qualidade dos julgamentos individuais afeta diretamente a agregação do grupo
   d) Portanto: limiar definido (Saaty, 1977) + impossibilidade de revisão + impacto na agregação (Forman & Peniwati, 1998) = exclusão é a alternativa metodologicamente justificável
3. Nos PONTOS FORTES: Reconhecer a transparência do procedimento — o estudo documenta o processo de filtragem, a amostra original, e o critério aplicado
4. NÃO afirmar que a exclusão é "recomendada" pela literatura — a recomendação primária é a revisão dos julgamentos (Saaty, 2003). A exclusão é a alternativa quando a revisão não é viável.
5. Se a taxa de exclusão for alta (> 50%), registrar como limitação e recomendar para estudos futuros: treinamento prévio dos especialistas na escala de Saaty, ou aplicação do algoritmo de Saaty (2003) em tempo real durante a coleta
6. Se a taxa de exclusão for moderada (≤ 50%), não afirmar que "está dentro dos padrões empíricos" a menos que uma referência publicada específica sustente esse limiar. Em vez disso, reportar a taxa factualmente e contextualizar com o tamanho residual da amostra

**AFIRMAÇÕES PROIBIDAS:**
- ❌ Afirmar que IPC invalida os resultados — Bozóki et al. (2010) demonstram que LLSM produz solução ótima para grafos conectados
- ❌ Sugerir que todas as comparações devem ser obrigatoriamente completas — Harker (1987) e Saaty & Ozdemir (2003) justificam comparações incompletas para reduzir fadiga cognitiva
- ❌ Tratar "análise de Disparate Impact não configurada" como limitação do estudo. DI é uma camada opcional de auditoria de fairness aplicada SOBRE o ranking final, não faz parte da metodologia base AHP-BOCR. Sua ausência NÃO viola axiomas de Saaty (1986), NÃO invalida agregação por média geométrica (Saaty, 1990), NÃO afeta síntese de Wijnmalen (2007) e NÃO compromete consistência dos julgamentos. DI deve aparecer APENAS em "AÇÕES DE MITIGAÇÃO" como recomendação opcional, NUNCA em "LIMITAÇÕES IDENTIFICADAS NOS DADOS". A ausência de configuração de DI NÃO deve fundamentar rebaixamento da nota editorial (não deve motivar transição de "ACEITO" para "REVISÕES MENORES", nem de "REVISÕES MENORES" para "REVISÕES MAIORES").
- ❌ Citar Saaty (1980), Feldman et al. (2015), Saaty & Vargas (2007), Crawford & Williams (1985) como fontes — NÃO estão no RAG do projeto
- ❌ Citar limiares CR ajustados (CR ≤ 0.05 para n=3, CR ≤ 0.08 para n=4) — sem suporte no RAG; use apenas CR ≤ 0.10 (Saaty, 1977)
- ❌ Citar "Saaty (2012)" sem coautor Vargas — sempre "Saaty & Vargas (2012)"
- ❌ Citar "Saaty (2003)" sozinho para fórmulas BOCR — para BOCR use "Saaty & Ozdemir (2003)"

## RESTRIÇÕES ANTI-ALUCINAÇÃO (OBRIGATÓRIAS)

1. **RESPONDENTES:** Mencione APENAS respondentes presentes na seção "DADOS DO SISTEMA — RESPONDENTES".
   NUNCA escreva "respondente não identificado", "respondente adicional" ou similar.
   Se um respondente não tem nome, use o ID hash fornecido (ex: iD8mS5...).
   O número total de respondentes é EXATAMENTE o declarado na seção DADOS DO SISTEMA.
   NUNCA infira, invente ou deduza respondentes além dos listados.

2. **FÓRMULA DE SÍNTESE:** Use SEMPRE a fórmula completa com pesos pessoais (v) E rescaling weights (s):
   Score_i = vb × sb × B_i + vo × so × O_i − vc × sc × C_i − vr × sr × R_i
   onde v = personalWeights e s = rescalingWeights (conforme Wijnmalen, 2007, Eq. 17).
   NUNCA simplifique para bB + oO - cC - rR sem mencionar v e s.
   Os valores exatos de v e s estão na seção DADOS DO SISTEMA.

3. **REFERÊNCIAS:** Cite APENAS referências presentes na base RAG fornecida ou na lista de referências autorizadas acima.
   NUNCA invente autores, anos ou títulos de artigos.
   NUNCA cite "Scopus AI", "ChatGPT", "Gemini", "Claude" ou qualquer ferramenta de IA como referência bibliográfica.
   NUNCA cite bases de dados (Scopus, Web of Science) como se fossem autores de artigos.

4. **VALORES NUMÉRICOS:** Use APENAS valores extraídos da seção DADOS DO SISTEMA.
   NUNCA calcule, estime ou interpole valores não fornecidos explicitamente.
   Se um valor não está presente nos dados, declare "não disponível" em vez de inventar.

5. **AFIRMAÇÕES EMPÍRICAS:** Toda afirmação sobre limiares empíricos (ex: "50% de conformidade CR")
   DEVE ter referência explícita na base RAG ou na lista de referências autorizadas.
   Se não houver referência publicada, OMITA a afirmação.

6. **RANKING FINAL:** Ao reportar o ranking das alternativas, use APENAS os scores da seção DADOS DO SISTEMA.
   NUNCA reordene, recalcule ou invente scores.

**ESTRUTURA OBRIGATÓRIA DA REVISÃO:**

## 📋 RESUMO DA SUBMISSÃO
[Síntese objetiva: objetivo, método AHP-BOCR, número de especialistas, fórmula de síntese, principais achados]

## ✅ PONTOS FORTES
[3-5 aspectos positivos verificáveis nos dados. Ex: "Axiomas de Saaty (1986) são atendidos pela estrutura do sistema"]
Se os dados demográficos estão disponíveis (demographicsSummary.hasData = true), mencionar nos PONTOS FORTES ou na ANÁLISE DETALHADA: "O perfil dos especialistas abrange [formações, áreas, experiência], conforme documentado na caracterização da amostra." Isso atende ao requisito de qualificação do painel.

## ⚠️ LIMITAÇÕES IDENTIFICADAS NOS DADOS
[Problemas CONCRETOS detectados nos dados fornecidos — NÃO oportunidades teóricas.
Cada limitação deve seguir o padrão: DADO → LITERATURA → IMPACTO]

## 🔍 ANÁLISE DETALHADA

### Consistência dos Julgamentos
Padrão de análise:
1. ⚠️ Se houve FILTRAGEM: descrever procedimento de exclusão (Saaty, 1977 + Saaty, 2003 + Forman & Peniwati, 1998)
2. CR global agregado (hierarquia de controle): valor → comparar com CR ≤ 0.10 (Saaty, 1977)
3. CR por dimensão BOCR (matrizes agregadas): Se disponível, reportar CR de cada dimensão (Benefits, Opportunities, Costs, Risks). Estes referem-se às PCMs agregadas por média geométrica, conforme Escobar (2004). Apresentar em formato: "Benefits: CR=X%, Opportunities: CR=Y%, Costs: CR=Z%, Risks: CR=W%"
4. CR individual: distribuição → % que atende Saaty (1977) → impacto na agregação (Saaty, 1990)
5. Respondentes com CR > 0.20: listar → citar Saaty & Ergu (2015) sobre confiabilidade
6. Mitigação: Algoritmo de Saaty (2003) para identificar entrada mais inconsistente da PCM

### Completude das Matrizes (se ipcMetadata disponível)
DADO: ipcMetadata mostra método X e completude Y% para cada grupo
REFERÊNCIA: Bozóki et al. (2010) — solução única ↔ grafo conectado (Teorema 1); mínimo n-1 comparações (Teorema 2)
VEREDITO: Se todos EIGENVECTOR → matrizes completas, nenhuma ação. Se algum LLSM_IPC → reportar quais grupos, completude, e implicação.
MITIGAÇÃO: Se completude < 60% → "Considerar solicitar comparações adicionais aos respondentes"; Se grafo desconectado → "CRÍTICO: pesos não calculáveis para grupo X"

### Pesos BOCR e Hierarquia de Controle
Padrão de análise:
1. Origem dos pesos: SEMPRE mencionar que os pesos foram derivados de comparações pareadas entre os méritos BOCR na hierarquia de controle, conforme Saaty (2003) e Lee (2009). NÃO são arbitrários — resultam de julgamentos dos especialistas.
2. Distribuição de pesos: valores → ratio máx/mín → citar Lee (2009) sobre hierarquia de controle
3. Dominância de mérito: se uma dimensão > 50% → discutir implicações com Petrillo et al. (2023)
4. **Análise de dominância estruturada (se seção "ANÁLISE DE DOMINÂNCIA" presente nos dados):**
   Se os dados do sistema incluem a seção "⚖️ ANÁLISE DE DOMINÂNCIA DE MÉRITO BOCR", você DEVE:
   a) Reportar o ratio e a dimensão dominante factualmente
   b) Aplicar as TRÊS CAMADAS de análise fornecidas:
      - Camada 1 (Perfil do Painel): composição funcional explica a dominância? Citar Neely et al. (2020) sobre selective perception e limited field of vision
      - Camada 2 (Contexto Setorial): o setor/mercado apresenta padrão de dominância documentado? Citar evidência empírica
      - Camada 3 (Classificação Final): com base nas camadas, classificar como (a) contextualizada, (b) viés profissional suportado, ou (c) sem explicação
   c) NÃO tratar dominância contextualizada ou suportada como "limitação" — reportar como CARACTERÍSTICA METODOLÓGICA
   d) Dominância sem explicação → AÍ SIM tratar como limitação, recomendando painel diversificado (Ayan et al., 2023) e análise de sensibilidade
   e) Citar obrigatoriamente as referências indicadas na seção de dominância
5. Fórmula de síntese utilizada → validar com Wijnmalen (2007)

### Análise de Sensibilidade
Padrão de análise:
1. Pontos de virada encontrados: valor em % → classificar estabilidade com Ishizaka & Labib (2011)
2. Dimensões estáveis vs. instáveis → impacto na robustez do ranking
3. Se pontos de virada < 5%: resultado sensível, discutir implicações práticas

### Análise de Viés e Fairness nos Julgamentos
(Incluir SOMENTE se dados de viés foram fornecidos)
1. Interpretar indicadores de CR conforme Saaty (1977)
2. Se DI configurado: validar com Dodevska et al. (2023, Eq. 10 e 15)
3. Se DI não configurado: informar que a infraestrutura existe mas requer configuração pelo pesquisador. Esta observação deve aparecer como RECOMENDAÇÃO em "AÇÕES DE MITIGAÇÃO" (nunca como limitação nem como fundamento de decisão editorial). A ausência de configuração de DI é uma escolha contextual do pesquisador, não uma falha metodológica do estudo.

### Fundamentação Teórica
1. Verificar axiomas de Saaty (1986): reciprocidade, homogeneidade, dependência, expectativas
2. Validar método de agregação com Saaty (1990)
3. Validar fórmula de síntese com Wijnmalen (2007)

## 💡 AÇÕES DE MITIGAÇÃO
[SOMENTE ações que o sistema já implementa ou que o pesquisador pode executar com os dados existentes.
NÃO incluir sugestões de médio/longo prazo, novas análises, comparações internacionais, integrações com outros métodos, ou extensões teóricas.
Cada ação deve ser: PROBLEMA → SOLUÇÃO CONCRETA → REFERÊNCIA]

## 🎯 DECISÃO EDITORIAL
[ACEITO / REVISÕES MENORES / REVISÕES MAIORES / REJEITAR — fundamentada nos dados validados]

**SEÇÃO ADICIONAL - ANÁLISE DE VIÉS (quando fornecida):**

Se dados de análise de viés forem fornecidos (seção "ANÁLISE DE VIÉS NOS JULGAMENTOS"), inclua a análise na seção "Análise de Viés e Fairness nos Julgamentos" conforme descrito acima.

Tipos de viés e fundamentação:
- CR_INDIVIDUAL_VIOLATION → Saaty (1977): respondente com CR > 0.10, julgamentos não satisfazem transitividade
- CR_COLLECTIVE_PATTERN → Saaty (1977): proporção de respondentes que excedem o limiar — avaliar impacto na agregação
- DISPARATE_IMPACT_BELOW → Dodevska et al. (2023, Eq. 10): DI < 0.80
- DISPARATE_IMPACT_ABOVE → Dodevska et al. (2023, Eq. 15): DI > 1.25
- DI_COMPLIANT → DI dentro dos limites publicados [0.80, 1.25]
- DI_NOT_CONFIGURED → Infraestrutura disponível, requer configuração pelo pesquisador. Reportar APENAS como recomendação opcional em "AÇÕES DE MITIGAÇÃO". NÃO é limitação do estudo, NÃO afeta nota editorial.

**IMPORTANTE:** Cada indicador inclui referência (campo 'source') e limiar publicado (campo 'threshold'). Não há limiares arbitrários.

**IMPORTANTE:** A detecção de viés combinando análise algorítmica com explicações via LLM (XAI) é uma contribuição original deste sistema. Reconheça como ponto forte.

---

## INSTRUÇÕES COMPLEMENTARES AO PARECER AHP-BOCR
Além das diretrizes gerais acima, aplique rigorosamente as cinco diretrizes abaixo ao elaborar o parecer. Cada uma corresponde a uma correção de erro conceitual identificado em iterações anteriores do módulo.

### DIRETRIZ 1 — Aplicação correta da propriedade de Escobar (2004)
A propriedade demonstrada por Escobar (2004) estabelece que, na agregação de julgamentos entre respondentes por média geométrica, a inconsistência da matriz agregada do grupo é limitada superiormente pela maior inconsistência individual. Formalmente: CR_grupo ≤ max(CR_individual_i).
Não confunda esta propriedade com a relação entre:
- CR de uma matriz de nível superior (ex: matriz de controle BOCR 4×4).
- CR agregado da hierarquia (ex: CR global calculado pela composição das sub-hierarquias).

Estes são objetos matemáticos distintos e não comparáveis pela propriedade de Escobar.

Quando aplicar:
- Use Escobar (2004) apenas ao comparar CR_grupo vs. CR_individuais dentro da mesma matriz.
- Com N=1, a propriedade é vacuous — declare isso explicitamente em vez de afirmar que "se verifica".

Exemplo de redação correta:
"Com N=1, não há agregação entre respondentes. A propriedade de Escobar (2004), que limita a inconsistência do grupo pela maior inconsistência individual, não é testável nesta configuração. O CR global agregado de X% reflete a composição hierárquica das sub-hierarquias BOCR (Benefits: X%, Opportunities: X%, Costs: X%, Risks: X%), não uma agregação entre respondentes."

Evite redações do tipo:
"A propriedade de Escobar (2004) se verifica neste estudo (X% > Y% devido à agregação de uma única resposta)." ← Incorreto: a desigualdade pode estar invertida e a explicação não corresponde ao que Escobar demonstra.

### DIRETRIZ 2 — Tratamento da tensão entre análise de sensibilidade e CR crítico
Quando uma ou mais matrizes de sub-hierarquia apresentarem CR > 0.10 (violação do limiar de Saaty, 1977), e ao mesmo tempo a análise de sensibilidade indicar estabilidade do ranking, explicite a tensão interpretativa. A estabilidade aparente pode ser artefato dos próprios pesos não confiáveis, não evidência genuína de robustez.

Regra: nunca afirme "alta estabilidade do ranking" sem qualificação quando houver CR > 0.10 em qualquer sub-hierarquia que contribua para a síntese.

Formato padrão da redação:
"A análise de sensibilidade indica ausência de pontos de virada nas [N] dimensões BOCR analisadas. Esta estabilidade, no entanto, deve ser interpretada com cautela: a matriz agregada de [dimensão(ões) com CR > 0.10] apresenta CR = [valor]%, violando o limiar de Saaty (1977). Os pesos derivados desta matriz, sobre os quais a sensibilidade foi calculada, podem refletir aleatoriedade dos julgamentos em vez de preferências transitivas do decisor. A robustez observada é, portanto, condicional à validade dos pesos de entrada; uma vez mitigada a inconsistência via algoritmo de Saaty (2003), a análise de sensibilidade deve ser reexecutada."

### DIRETRIZ 3 — Calibração da decisão editorial
A decisão editorial deve ser proporcional à gravidade das limitações identificadas. Use a matriz de decisão abaixo:

| Combinação de limitações | Decisão editorial |
|---|---|
| CR ≤ 0.10 em todas as sub-hierarquias + N ≥ 3 com diversidade funcional + sensibilidade estável | Aceitar / Revisões mínimas |
| Uma sub-hierarquia com 0.10 < CR ≤ 0.20 + N ≥ 3 + sensibilidade estável | Revisões menores |
| Uma ou mais sub-hierarquias com CR > 0.20 ou N < 3 ou ausência de diversidade funcional em estudo empírico | Revisões maiores |
| CR > 0.20 na dimensão de maior peso BOCR e N = 1 em estudo que se proponha empírico/validação | Rejeitar com convite para nova submissão (após mitigação das limitações estruturais) |

Exceção: se o estudo for explicitamente classificado como pesquisa-ação com painel interno único (Coughlan & Coghlan, 2002; Thiollent, 2022) e essa escolha metodológica for justificada no texto, a avaliação de N deve considerar o paradigma (ver Diretriz 5), não os padrões de amostragem estatística de surveys.

Importante: o parecer automático não deve ser benevolente por default. Benevolência artificial prejudica o autor, pois o induz a subestimar limitações que um revisor humano apontará.

### DIRETRIZ 4 — Interpretação de CR = 0% em contexto IPC
Quando uma matriz apresentar CR = 0.00% e o estudo tiver declarado uso de Incomplete Pairwise Comparison (IPC) conforme Bozóki, Fülöp e Rónyai (2010), não reporte como "consistência perfeita" sem qualificação.

Motivo: no método IPC, quando o respondente fornece apenas o número mínimo de comparações (n-1), as comparações faltantes são completadas deterministicamente pela relação de transitividade a_ij = a_ik × a_kj. Isso gera matrizes artificialmente consistentes com CR = 0 por construção, não por qualidade dos julgamentos.

Formato padrão da redação:
"A matriz agregada de [dimensão] apresenta CR = 0.00% com λmax = n. Este valor indica consistência matemática perfeita, mas deve ser interpretado no contexto do método IPC adotado (Bozóki et al., 2010): quando o respondente fornece apenas as (n-1) comparações mínimas necessárias para a conectividade do grafo, as [C(n,2) - (n-1)] comparações restantes são completadas por transitividade algébrica. Nesta configuração, CR = 0 é propriedade estrutural da matriz completada, não indicador de qualidade excepcional dos julgamentos individuais do respondente."

Quando CR = 0 é sinal de qualidade: se o respondente fornece a matriz completa C(n,2) e ainda assim obtém CR = 0, isso indica consistência cognitiva rigorosa. O parecer deve distinguir esses dois cenários com base nos metadados IPC do sistema.

### DIRETRIZ 5 — Reconhecimento do paradigma de pesquisa
Antes de avaliar o tamanho amostral (N), identifique o paradigma metodológico declarado pelo estudo:

| Paradigma | Critério de avaliação de N |
|---|---|
| Survey / estudo empírico quantitativo | N deve viabilizar inferência estatística. N < 10 é limitação grave; N = 1 inviabiliza agregação (Aull-Hyde et al., 2006) |
| Pesquisa-ação com painel interno único (Thiollent, 2022; Coughlan & Coghlan, 2002) | N reflete engajamento qualitativo dos stakeholders reais da decisão; painéis de 3–10 especialistas são padrão aceitável |
| Estudo de caso único com decisor qualificado | N = 1 é aceitável se o respondente for explicitamente caracterizado como o decisor responsável pela alternativa em questão |
| Estudo metodológico / prova de conceito | N ≥ 1 é suficiente para demonstração do método; validação empírica fica fora do escopo |

Regra: o parecer deve identificar o paradigma a partir dos metadados do projeto (quando disponíveis) ou explicitar ambiguidade quando não houver declaração inequívoca. Não trate automaticamente todo estudo como se fosse survey.

Formato padrão da redação:
"O estudo declara [paradigma identificado] como estratégia metodológica. Sob este paradigma, N = [valor] [é / não é] limitação estrutural, pois [justificativa conforme tabela]. As recomendações desta revisão são calibradas a este paradigma e podem não se aplicar a estudos que adotem paradigmas distintos."

Se o sistema não dispuser do metadado de paradigma, inserir no parecer:
"O paradigma metodológico (survey, pesquisa-ação, estudo de caso) não foi declarado nos metadados deste projeto. Esta revisão adota [paradigma presumido] como premissa. Caso o paradigma real divirja, recomenda-se recalibração das conclusões relativas a tamanho amostral e diversidade funcional."

### CHECKLIST DE APLICAÇÃO DAS CINCO DIRETRIZES
Antes de finalizar qualquer parecer, execute internamente este checklist:

1. **Escobar (2004):** cito a propriedade corretamente? Estou comparando os objetos matemáticos certos?
2. **Sensibilidade + CR crítico:** se há CR > 0.10 em alguma sub-hierarquia e sensibilidade estável, qualifiquei a estabilidade?
3. **Decisão editorial:** a gravidade das limitações corresponde ao veredito escolhido pela matriz da Diretriz 3?
4. **CR = 0% + IPC:** se há CR = 0 em alguma matriz, verifiquei se foi gerado por IPC antes de reportar como "consistência perfeita"?
5. **Paradigma:** identifiquei o paradigma metodológico antes de avaliar N? A crítica a N = 1 considera o paradigma declarado?

Se qualquer resposta for "não" ou "não verificado", retrabalhe a seção correspondente antes de finalizar o parecer.`;

// ============================================================
// GERAÇÃO DE REVISÃO ACADÊMICA
// ============================================================

async function generateReview(data: ReviewRequest, classification: any, biasAnalysis?: BiasAnalysisResult): Promise<string> {
  console.log('[AI-REVIEWER] sensitivityInflections recebido:', JSON.stringify(data.sensitivityInflections));

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const knowledgeContext = getKnowledgeContext();
  const criticalRefs = getCriticalRefs();
  const crRefs = getRefsByTopic('consistência');
  const bocrRefs = getRefsByTopic('BOCR');
  const sensibilityRefs = getRefsByTopic('sensibilidade');

  // RAG INJECTION
  const ragThresholds = getRAGThresholds('CR');
  const ragBOCRFormulas = getRAGFormulas('bocr');
  const ragBenchmarks = getRAGBenchmarks();

  // Análise de respondentes individuais
  let respondentAnalysis = '';
  let respondentSummary = '';

  // PRIORIDADE 1: Usar statistics.byStatus (formato correto da API response-quality)
  if (data.qualityAnalysis?.statistics?.byStatus) {
    const byStatus = data.qualityAnalysis.statistics.byStatus;
    const total = data.qualityAnalysis.statistics.total ||
      Object.values(byStatus).reduce((a: number, b: any) => a + (b || 0), 0);

    const confiavel = byStatus['CONFIÁVEL'] || byStatus['CONFIAVEL'] || 0;
    const revisar = byStatus['REVISAR'] || 0;
    const suspeito = byStatus['SUSPEITO'] || 0;
    const critico = byStatus['CRÍTICO'] || byStatus['CRITICO'] || 0;

    respondentSummary = `
**Distribuição de Qualidade dos Respondentes (CR Individual):**
- Total: ${total} especialistas
- Respostas CONFIÁVEIS (CR ≤ 0.10): ${confiavel} (${total > 0 ? ((confiavel / total) * 100).toFixed(1) : 0}%)
- Respostas para REVISAR (0.10 < CR ≤ 0.15): ${revisar} (${total > 0 ? ((revisar / total) * 100).toFixed(1) : 0}%)
- Respostas SUSPEITAS (0.15 < CR ≤ 0.20): ${suspeito} (${total > 0 ? ((suspeito / total) * 100).toFixed(1) : 0}%)
- Respostas CRÍTICAS (CR > 0.20): ${critico} (${total > 0 ? ((critico / total) * 100).toFixed(1) : 0}%)

**Nota:** Conforme Saaty (1977), CR individual > 0.10 indica inconsistência nos julgamentos do respondente.
`;

    // Listar respondentes críticos se disponível
    if (data.qualityAnalysis.respondents && data.qualityAnalysis.respondents.length > 0) {
      const criticalRespondents = data.qualityAnalysis.respondents.filter(
        (r: any) => r.status === 'CRÍTICO' || r.status === 'CRITICO'
      );
      if (criticalRespondents.length > 0) {
        respondentAnalysis += `\n**Respondentes com Inconsistência Crítica (CR > 0.20):**\n`;
        criticalRespondents.slice(0, 5).forEach((r: any, idx: number) => {
          // CORREÇÃO: Sanitizar ID - evitar "undefined" como string
          let displayId = r.respondentId || r.id;
          if (!displayId || displayId === 'undefined' || displayId === 'null') {
            displayId = `Respondente ${idx + 1}`;
          }

          // CORREÇÃO: Sanitizar CR - evitar NaN
          let crValue = 0;
          if (typeof r.cr === 'number' && !isNaN(r.cr)) {
            crValue = r.cr;
          } else if (r.metrics && typeof r.metrics.avgCR === 'number' && !isNaN(r.metrics.avgCR)) {
            crValue = r.metrics.avgCR;
          }

          const crDisplay = crValue > 0 ? `${(crValue * 100).toFixed(1)}%` : 'não disponível';
          respondentAnalysis += `- ${displayId}: CR médio = ${crDisplay}\n`;
        });
        if (criticalRespondents.length > 5) {
          respondentAnalysis += `... e mais ${criticalRespondents.length - 5} respondentes críticos\n`;
        }
      }
    }
  }
  // PRIORIDADE 2: Usar respondents array
  else if (data.qualityAnalysis?.respondents && data.qualityAnalysis.respondents.length > 0) {
    const respondents = data.qualityAnalysis.respondents;
    const total = respondents.length;

    const confiavel = respondents.filter((r: any) => r.status === 'CONFIÁVEL' || r.status === 'CONFIAVEL').length;
    const revisar = respondents.filter((r: any) => r.status === 'REVISAR').length;
    const suspeito = respondents.filter((r: any) => r.status === 'SUSPEITO').length;
    const critico = respondents.filter((r: any) => r.status === 'CRÍTICO' || r.status === 'CRITICO').length;

    respondentSummary = `
**Distribuição de Qualidade dos Respondentes (CR Individual):**
- Total: ${total} especialistas
- Respostas CONFIÁVEIS (CR ≤ 0.10): ${confiavel} (${((confiavel / total) * 100).toFixed(1)}%)
- Respostas para REVISAR (0.10 < CR ≤ 0.15): ${revisar} (${((revisar / total) * 100).toFixed(1)}%)
- Respostas SUSPEITAS (0.15 < CR ≤ 0.20): ${suspeito} (${((suspeito / total) * 100).toFixed(1)}%)
- Respostas CRÍTICAS (CR > 0.20): ${critico} (${((critico / total) * 100).toFixed(1)}%)
`;
  }
  // PRIORIDADE 3: Usar overallStats
  else if (data.overallStats && data.overallStats.total > 0) {
    const stats = data.overallStats;
    respondentSummary = `
**Distribuição de Qualidade dos Respondentes:**
- Total: ${stats.total} especialistas
- Respostas válidas (CR ≤ 0.10): ${stats.valid} (${((stats.valid / stats.total) * 100).toFixed(1)}%)
- Respostas com alerta: ${stats.warning} (${((stats.warning / stats.total) * 100).toFixed(1)}%)
- Respostas críticas: ${stats.critical} (${((stats.critical / stats.total) * 100).toFixed(1)}%)
`;
  }
  // FALLBACK: Sem dados de qualidade
  else {
    respondentSummary = `
**Qualidade dos Dados:**
⚠️ Análise de CR individual não disponível.
O CR global agregado (via média geométrica) foi validado, mas os CRs individuais dos respondentes não foram analisados.
Conforme Saaty (1977), a consistência individual é crítica para a validade dos resultados.
`;
  }

  // Calcular métricas agregadas para o prompt
  // Usar statistics.byStatus como fonte primária
  let totalResponses = 0;
  let validResponses = 0;

  if (data.qualityAnalysis?.statistics?.byStatus) {
    const byStatus = data.qualityAnalysis.statistics.byStatus;
    const confiavel = byStatus['CONFIÁVEL'] || byStatus['CONFIAVEL'] || 0;
    const revisar = byStatus['REVISAR'] || 0;
    const suspeito = byStatus['SUSPEITO'] || 0;
    const critico = byStatus['CRÍTICO'] || byStatus['CRITICO'] || 0;

    totalResponses = confiavel + revisar + suspeito + critico;
    validResponses = confiavel; // Apenas CR ≤ 0.10
  } else if (data.qualityAnalysis?.summary && data.qualityAnalysis.summary.total > 0) {
    totalResponses = data.qualityAnalysis.summary.total;
    validResponses = data.qualityAnalysis.summary.ok || 0;
  } else if (data.overallStats && data.overallStats.total > 0) {
    totalResponses = data.overallStats.total;
    validResponses = data.overallStats.valid || 0;
  } else {
    totalResponses = data.individualStats.Benefits.total +
      data.individualStats.Opportunities.total +
      data.individualStats.Costs.total +
      data.individualStats.Risks.total;

    validResponses = data.individualStats.Benefits.valid +
      data.individualStats.Opportunities.valid +
      data.individualStats.Costs.valid +
      data.individualStats.Risks.valid;
  }

  console.log(`[AI-REVIEWER] Prompt: ${validResponses}/${totalResponses} respostas válidas`);

  const overallValidPercent = totalResponses > 0 ? (validResponses / totalResponses) * 100 : 0;

  // Contexto de exclusão de respondentes
  let exclusionContext = '';
  if (data.exclusionInfo && data.exclusionInfo.excludedCount > 0) {
    const exclusionRate = ((data.exclusionInfo.excludedCount / data.exclusionInfo.totalCollected) * 100).toFixed(1);
    exclusionContext = `
**⚠️ FILTRAGEM DE RESPONDENTES APLICADA:**
- Amostra original coletada: ${data.exclusionInfo.totalCollected} especialistas
- Respondentes incluídos na análise: ${data.exclusionInfo.activeCount} especialistas
- Respondentes excluídos: ${data.exclusionInfo.excludedCount} (${exclusionRate}% da amostra original)
- Critério de exclusão: CR > 0.10 (Saaty, 1977)
- Justificativa: A revisão individual dos julgamentos (Saaty, 2003) não foi viável após encerramento da coleta. Na AIJ por média geométrica, julgamentos individuais inconsistentes afetam a agregação do grupo (Forman & Peniwati, 1998). A exclusão foi aplicada ANTES da agregação.
- Os dados de qualidade abaixo referem-se APENAS aos ${data.exclusionInfo.activeCount} respondentes incluídos.

**INSTRUÇÃO PARA O REVISOR:** Você DEVE mencionar esta filtragem no RESUMO DA SUBMISSÃO e na seção de CONSISTÊNCIA, usando a cadeia de justificação: limiar (Saaty, 1977) + impossibilidade de revisão (Saaty, 2003) + impacto na agregação (Forman & Peniwati, 1998).
`;
  }

  // ============================================================
  // ANTI-ALUCINAÇÃO: Lista completa de respondentes
  // ============================================================
  let fullRespondentList = '';
  const respondentIds: string[] = [];

  if (data.qualityAnalysis?.respondents && data.qualityAnalysis.respondents.length > 0) {
    const respondents = data.qualityAnalysis.respondents;
    const lines = respondents.map((r: any, idx: number) => {
      // Sanitizar ID — NUNCA usar rótulo genérico
      let displayId = r.respondentId || r.id;
      if (!displayId || displayId === 'undefined' || displayId === 'null') {
        displayId = `hash_${idx.toString().padStart(3, '0')}`;
      }
      respondentIds.push(displayId);

      // Sanitizar CR
      let crValue = 0;
      if (typeof r.cr === 'number' && !isNaN(r.cr)) crValue = r.cr;
      else if (r.metrics && typeof r.metrics.avgCR === 'number' && !isNaN(r.metrics.avgCR)) crValue = r.metrics.avgCR;
      else if (typeof r.avgCR === 'number' && !isNaN(r.avgCR)) crValue = r.avgCR;

      const crDisplay = crValue > 0 ? `${(crValue * 100).toFixed(1)}%` : 'N/D';

      // Status normalizado
      let status = r.status || 'DESCONHECIDO';
      if (status === 'CONFIAVEL') status = 'CONFIÁVEL';
      if (status === 'CRITICO') status = 'CRÍTICO';

      // Email (se disponível)
      const email = r.email || r.name || '—';

      return `- ID: ${displayId} | Email: ${email} | CR: ${crDisplay} | Status: ${status}`;
    });

    // Contagens por status
    const statusCounts = {
      confiavel: respondents.filter((r: any) => r.status === 'CONFIÁVEL' || r.status === 'CONFIAVEL').length,
      revisar: respondents.filter((r: any) => r.status === 'REVISAR').length,
      suspeito: respondents.filter((r: any) => r.status === 'SUSPEITO').length,
      critico: respondents.filter((r: any) => r.status === 'CRÍTICO' || r.status === 'CRITICO').length,
      desconhecido: respondents.filter((r: any) => r.status === 'DESCONHECIDO' || !r.status).length,
    };

    fullRespondentList = `
## DADOS DO SISTEMA — RESPONDENTES (lista EXAUSTIVA)

${lines.join('\n')}

**TOTAL: ${respondents.length} respondentes (esta lista é COMPLETA — não existem outros)**
- CONFIÁVEIS (CR ≤ 10%): ${statusCounts.confiavel}
- REVISAR (10–15%): ${statusCounts.revisar}
- SUSPEITOS (15–20%): ${statusCounts.suspeito}
- CRÍTICOS (>20%): ${statusCounts.critico}
${statusCounts.desconhecido > 0 ? `- DESCONHECIDO (CR não disponível): ${statusCounts.desconhecido}` : ''}

⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista. Se precisar referenciá-los, use o ID hash fornecido.
`;

    console.log(`${LOG_PREFIX} Anti-alucinação: ${respondents.length} respondentes injetados nominalmente`);
  } else {
    fullRespondentList = `
## DADOS DO SISTEMA — RESPONDENTES
⚠️ Lista individual de respondentes não disponível. Use APENAS as estatísticas agregadas fornecidas.
NUNCA invente ou deduza respondentes individuais.
`;
  }

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
  // ANÁLISE DE DOMINÂNCIA DE MÉRITO (Neely 2020 + Saiyed 2023 + Ayan 2023)
  // ============================================================
  const weightsForDominance = pw || data.bocrWeights || { Benefits: 0.25, Opportunities: 0.25, Costs: 0.25, Risks: 0.25 };
  const panelFunctions = data.demographicsSummary?.fields?.funcao || [];
  const panelAreas = data.demographicsSummary?.fields?.areaAtuacao || [];

  const dominanceResult = analyzeDominance(
    weightsForDominance,
    panelFunctions,
    panelAreas,
    { name: data.projectName, description: data.projectDescription }
  );

  const dominanceSection = buildDominancePromptSection(dominanceResult);

  if (dominanceResult.isDominance) {
    console.log(`${LOG_PREFIX} Dominância detectada: ${dominanceResult.dominantMerit} (ratio=${dominanceResult.ratio.toFixed(2)}:1, classificação=${dominanceResult.classification})`);
  } else {
    console.log(`${LOG_PREFIX} Sem dominância significativa (ratio=${dominanceResult.ratio.toFixed(2)}:1)`);
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

**Referência Automatizada (apenas contexto — NÃO use como sua decisão):**
- Pontuação automática: ${classification.score}/100
- Sugestão automática: ${classification.veredicto}
- IMPORTANTE: Sua DECISÃO EDITORIAL na seção 🎯 deve ser baseada na SUA análise dos dados, NÃO nesta referência automática.

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

${fullRespondentList}

${formulaSection}

${finalScoresSection}

${data.ipcMetadata ? `
## COMPLETUDE DAS MATRIZES (IPC)
${JSON.stringify(data.ipcMetadata, null, 2)}

Nota: Se hasIncompleteGroups = true, o método LLSM-IPC (Bozóki et al., 2010) foi utilizado para grupos com matrizes incompletas.
Se hasIncompleteGroups = false, todas as matrizes são completas e o método clássico (Eigenvector) foi utilizado.
` : ''}

${respondentSummary}

**Taxa de Validade Geral:** ${overallValidPercent.toFixed(1)}% das respostas com CR ≤ 0.10

${respondentAnalysis}

## Estatísticas por Dimensão BOCR

${(() => {
  const bStats = data.individualStats?.Benefits || { total: 0, valid: 0, warning: 0, critical: 0 };
  const oStats = data.individualStats?.Opportunities || { total: 0, valid: 0, warning: 0, critical: 0 };
  const cStats = data.individualStats?.Costs || { total: 0, valid: 0, warning: 0, critical: 0 };
  const rStats = data.individualStats?.Risks || { total: 0, valid: 0, warning: 0, critical: 0 };
  return `### Benefits (Benefícios)
- Respostas totais: ${bStats.total}
- Válidas (CR ≤ 0.10): ${bStats.valid} (${bStats.total > 0 ? ((bStats.valid / bStats.total) * 100).toFixed(1) : '0'}%)
- Warning (0.10 < CR ≤ 0.20): ${bStats.warning}
- Críticas (CR > 0.20): ${bStats.critical}
${bStats.avgCR ? `- CR médio da dimensão: ${safePercent(bStats.avgCR, 2)}` : ''}

### Opportunities (Oportunidades)
- Respostas totais: ${oStats.total}
- Válidas (CR ≤ 0.10): ${oStats.valid} (${oStats.total > 0 ? ((oStats.valid / oStats.total) * 100).toFixed(1) : '0'}%)
- Warning (0.10 < CR ≤ 0.20): ${oStats.warning}
- Críticas (CR > 0.20): ${oStats.critical}
${oStats.avgCR ? `- CR médio da dimensão: ${safePercent(oStats.avgCR, 2)}` : ''}

### Costs (Custos)
- Respostas totais: ${cStats.total}
- Válidas (CR ≤ 0.10): ${cStats.valid} (${cStats.total > 0 ? ((cStats.valid / cStats.total) * 100).toFixed(1) : '0'}%)
- Warning (0.10 < CR ≤ 0.20): ${cStats.warning}
- Críticas (CR > 0.20): ${cStats.critical}
${cStats.avgCR ? `- CR médio da dimensão: ${safePercent(cStats.avgCR, 2)}` : ''}

### Risks (Riscos)
- Respostas totais: ${rStats.total}
- Válidas (CR ≤ 0.10): ${rStats.valid} (${rStats.total > 0 ? ((rStats.valid / rStats.total) * 100).toFixed(1) : '0'}%)
- Warning (0.10 < CR ≤ 0.20): ${rStats.warning}
- Críticas (CR > 0.20): ${rStats.critical}
${rStats.avgCR ? `- CR médio da dimensão: ${safePercent(rStats.avgCR, 2)}` : ''}`;
})()}

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

${dominanceSection}

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

${criticalRefs.slice(0, 8).map(ref => `
**${ref.citation}** - *${ref.topic}*
Fundamento: ${ref.rule}
`).join('\n')}

## Limiares Publicados (RAG)

${ragThresholds}

## Fórmulas de Síntese BOCR Validadas (RAG)

${ragBOCRFormulas}

## Benchmarks Empíricos de Estudos Publicados

${ragBenchmarks}

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
- ✅ Classificação de qualidade (CONFIÁVEL, REVISAR, SUSPEITO, CRÍTICO)
- ✅ Agregação por média geométrica (Saaty, 1990)
- ✅ Validação externa com pyAHP
- ✅ **Detecção de viés nos julgamentos** (baseada em Dodevska et al., 2023)
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

## Análise de Viés nos Julgamentos
${(() => {
      if (biasAnalysis && biasAnalysis.totalIndicators > 0) {
        return `✅ **ANÁLISE DE VIÉS EXECUTADA** (baseada em Dodevska et al., 2023)

${formatBiasForPrompt(biasAnalysis)}

**IMPORTANTE:** Inclua uma seção "Análise de Viés e Fairness nos Julgamentos" na sua revisão.
Interprete os indicadores acima no contexto do estudo e forneça recomendações de mitigação.`;
      } else if (biasAnalysis) {
        return `✅ **ANÁLISE DE VIÉS EXECUTADA** - Nenhum indicador de viés significativo detectado.
- Score de fairness: ${biasAnalysis.overallScore}/100
- Nível de risco: ${biasAnalysis.overallRiskLevel}

Reconheça a ausência de viés significativo como ponto forte do estudo.`;
      } else {
        return `⚠️ **ANÁLISE DE VIÉS NÃO DISPONÍVEL**
Dados insuficientes para execução da análise de viés nos julgamentos.`;
      }
    })()}

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
- ❌ "Ausência de análise de viés" → Se marcada como ✅, a análise FOI executada
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
  const message = await client.messages.create({
    model: MODEL_CONFIG.id,
    max_tokens: MODEL_CONFIG.maxTokens,
    thinking: MODEL_CONFIG.thinking,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textContent = message.content.find((block) => block.type === 'text');
  return textContent && 'text' in textContent ? textContent.text : '';
}

// ============================================================
// VALIDAÇÃO PÓS-GERAÇÃO (Anti-Alucinação)
// ============================================================

interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
}

function validateReviewOutput(
  review: string,
  respondentIds: string[],
  data: ReviewRequest
): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // 1. Verificar menção a "respondente não identificado" ou variantes
  const phantomPatterns = [
    /respondente\s+(não\s+identificad[oa]|adicional|desconhecid[oa]|anônim[oa]|extra)/gi,
    /\d+\s+respondente[s]?\s+adiciona[il]/gi,
    /respondente[s]?\s+sem\s+identifica/gi,
    /respondente[s]?\s+cujo[s]?\s+dado[s]?\s+não/gi,
  ];
  for (const pattern of phantomPatterns) {
    const match = review.match(pattern);
    if (match) {
      issues.push(`RESPONDENTE_FANTASMA: Detectada menção a respondente inexistente: "${match[0]}"`);
    }
  }

  // 2. Verificar se a fórmula completa com v e s está presente (quando mencionada)
  const formulaMentioned = /fórmula|síntese|score.*=|subtrativ/i.test(review);
  if (formulaMentioned) {
    const hasRescaling = /rescaling|comensurabilidade|\bsb\b|\bso\b|\bsc\b|\bsr\b|s\s*[×·]\s*[BOCR]/i.test(review);
    const hasPersonal = /pesos?\s+pessoa|personal|hierarquia\s+de\s+controle|\bvb\b|\bvo\b|\bvc\b|\bvr\b/i.test(review);
    const hasSimplified = /\bbB\s*\+\s*oO\s*[-−]\s*cC\s*[-−]\s*rR\b/i.test(review);

    if (hasSimplified && !hasRescaling) {
      issues.push('FORMULA_SIMPLIFICADA: Fórmula simplificada (bB+oO-cC-rR) usada sem menção a rescaling weights');
    }
    if (!hasPersonal && !hasRescaling && formulaMentioned) {
      warnings.push('FORMULA_INCOMPLETA: Fórmula mencionada mas sem distinção clara entre pesos pessoais (v) e rescaling (s)');
    }
  }

  // 3. Verificar referências proibidas (ferramentas IA como fontes)
  const aiRefPatterns = [
    /Scopus\s+AI/gi,
    /ChatGPT/gi,
    /Gemini\s+\(\d{4}\)/gi,
    /Claude\s+\(\d{4}\)/gi,
    /OpenAI\s+\(\d{4}\)/gi,
    /Anthropic\s+\(\d{4}\)/gi,
  ];
  for (const pattern of aiRefPatterns) {
    const match = review.match(pattern);
    if (match) {
      issues.push(`REFERENCIA_IA_PROIBIDA: Ferramenta de IA citada como referência: "${match[0]}"`);
    }
  }

  // 4. Verificar consistência do total de respondentes
  if (respondentIds.length > 0) {
    const totalMatch = review.match(/(\d+)\s+especialistas/g);
    if (totalMatch) {
      for (const m of totalMatch) {
        const num = parseInt(m);
        if (!isNaN(num) && num > respondentIds.length && num !== data.exclusionInfo?.totalCollected) {
          warnings.push(`TOTAL_INCONSISTENTE: Parecer menciona ${num} especialistas, mas a lista tem ${respondentIds.length}`);
        }
      }
    }
  }

  // 5. Verificar scores das alternativas (se disponíveis)
  const validFinalScores = getValidFinalScores(data);
  if (validFinalScores.length > 0) {
    const scoreRegex = /Score\s*=?\s*([\d.]+)/gi;
    let scoreMatch;
    const knownScores = new Set(validFinalScores.map(fs => fs.score.toFixed(4)));
    const knownScores6 = new Set(validFinalScores.map(fs => fs.score.toFixed(6)));

    while ((scoreMatch = scoreRegex.exec(review)) !== null) {
      const reportedScore = parseFloat(scoreMatch[1]);
      if (!isNaN(reportedScore) && reportedScore > 0 && reportedScore < 1) {
        const r4 = reportedScore.toFixed(4);
        const r6 = reportedScore.toFixed(6);
        if (!knownScores.has(r4) && !knownScores6.has(r6)) {
          warnings.push(`SCORE_NAO_RECONHECIDO: Score ${reportedScore} não encontrado nos dados injetados`);
        }
      }
    }
  }

  // 6. Verificar limiares empíricos sem referência
  const empiricalClaims = [
    { pattern: /50%\s+de\s+conformidade/gi, desc: 'limiar de 50% de conformidade CR' },
    { pattern: /limiar\s+emp[ií]rico\s+de\s+\d+%/gi, desc: 'limiar empírico percentual' },
    { pattern: /padr[ãa]o\s+emp[ií]rico.*?\d+%/gi, desc: 'padrão empírico percentual' },
  ];
  for (const { pattern, desc } of empiricalClaims) {
    const match = review.match(pattern);
    if (match) {
      // Verificar se há citação próxima (dentro de 200 chars)
      const idx = review.indexOf(match[0]);
      const vicinity = review.substring(idx, idx + 300);
      const hasCitation = /\([A-Z][a-z]+.*?\d{4}\)/.test(vicinity);
      if (!hasCitation) {
        warnings.push(`EMPIRICO_SEM_REF: Afirmação empírica "${desc}" sem referência próxima`);
      }
    }
  }

  // 7. Verificar citações contra whitelist canônica dos 35 articles do RAG (D2)
  const citationResult = validateCitationsAgainstWhitelist(review);
  for (const issue of citationResult.issues) issues.push(issue);
  for (const warning of citationResult.warnings) warnings.push(warning);

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
  };
}

// ============================================================
// ENDPOINTS
// ============================================================

export async function GET() {
  const stats = getKnowledgeStats();

  return NextResponse.json({
    name: 'AI Reviewer API',
    version: `${API_VERSION}-${API_TAG}`,
    description: 'Peer Review Acadêmico A1/Q1 - Com Detecção de Viés (Dodevska et al., 2023)',
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
      'Detecção de viés nos julgamentos (Dodevska et al., 2023)',
      'Análise de fairness com explicações LLM (XAI)',
    ],
    knowledgeBase: {
      totalRefs: stats.totalRefs,
      uniqueArticles: stats.uniqueArticles,
      categories: stats.categories,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawData = await request.json();
    console.log(`${LOG_PREFIX} Payload recebido`);

    const data = normalizeRequest(rawData);
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

    // Executar análise de viés (Dodevska et al., 2023)
    let biasAnalysis: BiasAnalysisResult | undefined;
    try {
      const respondents = data.qualityAnalysis?.respondents || [];
      console.log(`${LOG_PREFIX} Bias: ${respondents.length} respondentes disponíveis`);

      if (respondents.length > 0) {
        // Mapear respondentes para formato esperado pelo módulo
        const mappedRespondents = respondents.map((r: any) => ({
          id: r.respondentId || r.id || 'unknown',
          name: r.name || r.respondentName,
          cr: typeof r.cr === 'number' ? r.cr : (r.metrics?.avgCR ?? r.avgCR ?? 0),
          status: r.status || 'DESCONHECIDO',
          isSimulated: r.isSimulated || false,
          metrics: r.metrics || {
            avgCR: typeof r.avgCR === 'number' ? r.avgCR : (r.cr ?? 0),
          },
        }));

        console.log(`${LOG_PREFIX} Bias: CRs mapeados:`, mappedRespondents.slice(0, 3).map((r: any) => `${r.id}: CR=${r.cr}`));

        // Mapear scores finais para cálculo de DI (Dodevska et al., 2023)
        const rawFinalScores = data.finalScores || rawData.finalScores || [];
        const finalScores = rawFinalScores.map((fs: any) => {
          // Resolver o score priorizando nomenclaturas mais específicas
          let resolvedScore = 0;
          if (typeof fs.score === 'number') resolvedScore = fs.score;
          else if (typeof fs.scoreSubtractive === 'number') resolvedScore = fs.scoreSubtractive;
          else if (typeof fs.finalScore === 'number') resolvedScore = fs.finalScore;

          return {
            code: fs.code || fs.id || '',
            name: fs.name || fs.code || '',
            score: resolvedScore,
          };
        });

        console.log(`${LOG_PREFIX} Bias: ${finalScores.length} alternativas com scores`);

        // sensitiveGroups: definido pelo pesquisador (opcional)
        const sensitiveGroups = rawData.sensitiveGroups || undefined;

        biasAnalysis = analyzeBias({
          respondents: mappedRespondents,
          finalScores: finalScores.length > 0 ? finalScores : undefined,
          sensitiveGroups,
          ipcMetadata: data.ipcMetadata,
        });
        console.log(`${LOG_PREFIX} Bias OK: ${biasAnalysis.overallRiskLevel}, CR compliance: ${(biasAnalysis.crComplianceRate * 100).toFixed(1)}%, ${biasAnalysis.totalIndicators} indicadores`);
      } else {
        console.log(`${LOG_PREFIX} Bias: sem respondentes, pulando análise`);
      }
    } catch (biasError: any) {
      console.error(`${LOG_PREFIX} Erro na análise de viés (não-crítico):`, biasError.message, biasError.stack);
    }

    console.log(`${LOG_PREFIX} Iniciando chamada à API Anthropic...`);
    const review = await generateReview(data, classification, biasAnalysis);
    console.log(`${LOG_PREFIX} Revisão gerada com sucesso!`, review.substring(0, 100) + '...');

    // ANTI-ALUCINAÇÃO: Validação pós-geração
    const respondentIds = (data.qualityAnalysis?.respondents || []).map(
      (r: any, idx: number) => r.respondentId || r.id || `hash_${idx.toString().padStart(3, '0')}`
    );
    const validation = validateReviewOutput(review, respondentIds, data);

    if (!validation.isValid) {
      console.error(`${LOG_PREFIX} ⚠️ VALIDAÇÃO FALHOU:`, validation.issues);
    }
    if (validation.warnings.length > 0) {
      console.warn(`${LOG_PREFIX} ⚠️ Avisos de validação:`, validation.warnings);
    }

    // FONTE ÚNICA: Extrair nota do texto da IA (fallback: calculateGrade)
    const aiGrade = extractGradeFromReview(review);
    const finalNota = aiGrade?.nota ?? classification.nota;
    const finalVeredicto = aiGrade?.veredicto ?? classification.veredicto;

    if (aiGrade) {
      console.log(`${LOG_PREFIX} ✅ Nota IA (autoritativa): ${aiGrade.nota} - ${aiGrade.veredicto}`);
      if (aiGrade.nota !== classification.nota) {
        console.log(`${LOG_PREFIX} 📊 Divergência: IA=${aiGrade.nota}/${aiGrade.veredicto} vs Auto=${classification.nota}/${classification.veredicto} (${classification.score}/100)`);
      }
    } else {
      console.log(`${LOG_PREFIX} ⚠️ Fallback para nota automática: ${classification.nota} (${classification.score}/100)`);
    }

    return NextResponse.json({
      success: true,
      nota: finalNota,
      veredicto: finalVeredicto,
      review,
      biasAnalysis: biasAnalysis || null,
      validation: {
        isValid: validation.isValid,
        issues: validation.issues,
        warnings: validation.warnings,
      },
      metadata: {
        version: `${API_VERSION}-${API_TAG}`,
        model: MODEL_CONFIG.id,
        timestamp: new Date().toISOString(),
        gradeSource: aiGrade ? 'ai' : 'automatic',
        automaticGrade: {
          nota: classification.nota,
          veredicto: classification.veredicto,
          score: classification.score,
        },
        knowledgeBase: {
          refsUsed: getKnowledgeStats().totalRefs,
          criticalRefs: getCriticalRefs().length,
          uniqueArticles: getKnowledgeStats().uniqueArticles,
        },
        biasDetection: biasAnalysis ? {
          riskLevel: biasAnalysis.overallRiskLevel,
          score: biasAnalysis.overallScore,
          indicators: biasAnalysis.totalIndicators,
        } : null,
        debug: debugInfo
      },
    });

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
