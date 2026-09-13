/**
 * lib/ai-reviewer/review-request.ts
 *
 * Contrato da requisição do Parecer IA e o normalizador dos escores finais.
 * Movido de `app/api/ai-reviewer/route.ts` em A.27, eixo 1, commit 1a, SEM
 * alteração de comportamento: tipos, nomes e corpo da função são os mesmos.
 *
 * Está em `lib/` porque `lib/ai-reviewer/validate-review.ts` depende dele, e
 * dependência de `lib/` para `app/api/` inverteria a direção.
 *
 * Está em arquivo próprio, e não dentro de `validate-review.ts`, porque
 * `ReviewRequest` tem três consumidores que nada têm a ver com validação —
 * `calculateGrade`, `normalizeRequest` e `generateReview`, todos na rota — e
 * fazê-los importar de um arquivo com nome de validador seria dependência
 * enganosa.
 */

// ============================================================
// TIPOS DA REQUISIÇÃO
// ============================================================

export interface IndividualStats {
  total: number;
  valid: number;
  warning: number;
  critical: number;
  avgCR?: number;
}

export interface RespondentData {
  id: string;
  name?: string;
  avgCR: number;
  status: 'OK' | 'SUSPEITO' | 'CRÍTICO';
}

export interface ReviewRequest {
  projectName: string;
  projectDescription?: string;
  sensitivityInflections?: Record<string, number | null>;
  alternatives?: Array<{ code: string; name: string; description?: string }>;
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
export function getValidFinalScores(
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
