// app/api/calculate/route.ts
// ============================================================================
// API de Cálculo AHP-BOCR - VERSÃO 5.0 (Q1/A1 COMPLIANT) + IPC Addon
// Motor de Síntese com Funcionalidades de Publicação Q1/A1 + Incomplete Pairwise Comparisons
// ============================================================================
// 
// REFERÊNCIAS BIBLIOGRÁFICAS MANTIDAS (v5.0):
// [1] Saaty, T.L. (1980). The Analytic Hierarchy Process. McGraw-Hill.
// [2] Wijnmalen, D.J.D. (2007). Analysis of benefits, opportunities, costs, 
//     and risks (BOCR) with the AHP-ANP: A critical validation. 
//     Mathematical and Computer Modelling, 46(7-8), 892-905.
// ... (outras referências v5.0)
//
// REFERÊNCIAS ADICIONADAS (IPC):
// [8] Bozóki, S., Fülöp, J., & Rónyai, L. (2009). On optimal completion of 
//     incomplete pairwise comparison matrices. Mathematical and Computer Modelling.
//
// NOVIDADES IPC-1.0:
// - Suporte a matrizes incompletas (Skipped Comparisons)
// - Integração do método LLSM (Logarithmic Least Squares Method) para grafos conectados
// - Métricas de completude no metadata
//
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { checkConnectivity, buildGraphFromJudgments, getCompletenessMetrics, type ComparisonGraph } from '@/lib/graph-utils';
import { llsmIPC, buildPCM, calculateAllWeights, type Judgment as IPCJudgment } from '@/lib/ahp-ipc';

// ============================================================================
// CONSTANTES
// ============================================================================

// Random Index (RI) - Saaty (1977, 1980), Tabela 3.1
const RI: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
};

const MERITS = ['B', 'O', 'C', 'R'] as const;
const SUBCRITERIA_PER_MERIT = 5;

// Thresholds para classificação de sensibilidade [Alizadeh 2020]
const SENSITIVITY_THRESHOLDS = {
  robust: 50,      // > 50% = Robusto
  moderate: 20,    // 20-50% = Moderadamente sensível
  sensitive: 10,   // 10-20% = Sensível
  critical: 0      // < 10% = Crítico (requer justificativa)
};

// ============================================================================
// FUNÇÕES MATEMÁTICAS BASE
// ============================================================================

function geometricMean(values: number[]): number {
  if (values.length === 0) return 1;
  const product = values.reduce((acc, val) => acc * Math.max(val, 0.001), 1);
  return Math.pow(product, 1 / values.length);
}

function normalizeVector(vector: number[]): number[] {
  const sum = vector.reduce((a, b) => a + b, 0);
  if (sum === 0) return vector.map(() => 1 / vector.length);
  return vector.map(v => v / sum);
}

function calculateEigenvector(matrix: number[][]): number[] {
  const n = matrix.length;
  if (n === 0) return [];

  // Método da média geométrica das linhas - Saaty (1980)
  const rowProducts = matrix.map(row => {
    const product = row.reduce((acc, val) => acc * Math.max(val, 0.001), 1);
    return Math.pow(product, 1 / n);
  });

  return normalizeVector(rowProducts);
}

function calculateLambdaMax(matrix: number[][], eigenvector: number[]): number {
  const n = matrix.length;
  if (n === 0) return 0;

  let lambdaSum = 0;
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += matrix[i][j] * eigenvector[j];
    }
    if (eigenvector[i] > 0.0001) {
      lambdaSum += rowSum / eigenvector[i];
    }
  }

  return lambdaSum / n;
}

function calculateConsistency(matrix: number[][]): { cr: number; ci: number; lambda: number } {
  const n = matrix.length;
  if (n <= 2) return { cr: 0, ci: 0, lambda: n };

  const eigenvector = calculateEigenvector(matrix);
  const lambda = calculateLambdaMax(matrix, eigenvector);
  const ci = (lambda - n) / (n - 1);
  const ri = RI[n] || 1.49;
  const cr = ri > 0 ? ci / ri : 0;

  return {
    cr: Math.max(0, cr),
    ci: Math.max(0, ci),
    lambda: Math.max(n, lambda)
  };
}

/**
 * Completa uma PCM incompleta usando pesos calculados.
 * Para cada célula null, preenche com w_i/w_j.
 * Necessário para manter backward compatibility com código downstream
 * que espera number[][] (ex: serialização de aggregatedMatrices).
 */
function completePCM(
  partialMatrix: (number | null)[][],
  weights: number[]
): number[][] {
  const n = partialMatrix.length;
  const complete: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        complete[i][j] = 1;
      } else if (partialMatrix[i][j] !== null) {
        complete[i][j] = partialMatrix[i][j]!;
      } else {
        // Completar com wi/wj (Bozóki et al., 2009)
        complete[i][j] = weights[j] > 0.0001 ? weights[i] / weights[j] : 1;
      }
    }
  }

  return complete;
}

// ============================================================================
// INTERFACES
// ============================================================================

interface Judgment {
  type: 'bocr' | 'magnitude' | 'subcriteria' | 'alternatives';
  group: string;
  itemA: string;
  itemB: string;
  saatyValue: number | null;
  favors: 'A' | 'B' | 'equal';
  rawSlider?: number;
  skipped?: boolean;
}

interface ResponseData {
  judgments: Judgment[];
  completedAt?: string;
  projectId?: string;
  respondentId?: string;
}

interface BOCRPriorities {
  code: string;
  name: string;
  B: number;
  O: number;
  C: number;
  R: number;
  C_reciprocal: number;
  R_reciprocal: number;
}

interface AlternativeScore {
  code: string;
  name: string;
  B: number;
  O: number;
  C: number;
  R: number;
  C_reciprocal: number;
  R_reciprocal: number;
  scoreSubtractive: number;
  scoreSubtractiveNorm: number;
  rankSubtractive: number;
  isNegative: boolean;
  scoreQuotientSums: number;
  scoreQuotientSumsNorm: number;
  rankQuotientSums: number;
  scoreAdditiveResidual: number;
  scoreAdditiveResidualNorm: number;
  rankAdditiveResidual: number;
  scoreMultiplicative: number;
  scoreMultiplicativeNorm: number;
  rankMultiplicative: number;
  scoreMultSimple: number;
  scoreMultSimpleNorm: number;
  rankMultSimple: number;
}

interface MethodConcordance {
  totalMethods: number;
  agreeMethods: number;
  agreementPercent: number;
  consensusWinner: string | null;
  divergentMethods: string[];
  rankingsByMethod: Record<string, string[]>;
  robustnessLevel: 'excellent' | 'good' | 'acceptable' | 'poor';
  robustnessLabel: string;
}

interface SensitivityAnalysis {
  merit: string;
  meritName: string;
  inflectionPoint: number | null;
  classification: 'robust' | 'moderate' | 'sensitive' | 'critical';
  classificationLabel: string;
  currentWinner: string;
  newWinner: string | null;
  changeDescription: string;
  currentWeight: number;
}

export interface SensitivityTrajectoryPoint {
  weight: number;
  scores: Record<string, number>;
  winner: string;
  inflection: boolean;
}

export interface SensitivityTrajectory {
  merit: string;
  points: SensitivityTrajectoryPoint[];
}


/**
 * Extrai ID do respondente de várias fontes possíveis
 * (Mesma lógica de response-quality/route.ts para garantir consistência)
 */
function extractRespondentId(response: any, idx: number): string {
  // Tentar várias fontes de ID
  const possibleIds = [
    response.respondentId,
    response.visitorId,
    response.id,
    response.responses?.respondentId,
    response.responses?.visitorId,
    response.data?.respondentId,
    response.userId,
    response.email?.split('@')[0], // Usar parte do email como fallback
  ];

  for (const id of possibleIds) {
    if (id && id !== 'undefined' && id !== 'null') {
      return String(id);
    }
  }

  // Fallback: gerar ID baseado no índice
  return `respondente_${idx + 1}`;
}

// ============================================================================
// AGREGAÇÃO DOS JULGAMENTOS (IPC AWARE)
// ============================================================================

interface AggregationResult {
  /** Matriz agregada. null = nenhum respondente fez esta comparação */
  matrix: (number | null)[][];
  /** Todas as células foram preenchidas? */
  isComplete: boolean;
  /** Número de células preenchidas (excluindo diagonal) */
  filledCells: number;
  /** Total de células possíveis (excluindo diagonal) */
  totalCells: number;
}

function aggregateMatrix(
  responses: ResponseData[],
  type: string,
  group: string | null,
  items: string[]
): AggregationResult {
  const n = items.length;
  const matrix: (number | null)[][] = Array(n).fill(null).map((_, i) =>
    Array(n).fill(null).map((_, j) => (i === j ? 1 : null))
  );
  let filledCells = 0;
  const totalCells = n * (n - 1) / 2;

  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k < n; k++) {
      const values: number[] = [];

      for (const response of responses) {
        if (!response.judgments) continue;

        const judgment = response.judgments.find(jdg => {
          const typeMatch = jdg.type === type;
          const groupMatch = group === null || jdg.group === group;
          const pairMatch = (jdg.itemA === items[i] && jdg.itemB === items[k]) ||
            (jdg.itemA === items[k] && jdg.itemB === items[i]);
          return typeMatch && groupMatch && pairMatch;
        });

        // MUDANÇA IPC: ignorar judgments pulados
        if (judgment && !judgment.skipped && judgment.saatyValue != null) {
          let saatyValue = judgment.saatyValue;

          if (judgment.favors === 'equal') {
            saatyValue = 1;
          } else if (judgment.favors === 'B') {
            if (judgment.itemA === items[i]) {
              saatyValue = 1 / saatyValue;
            }
          } else if (judgment.favors === 'A') {
            if (judgment.itemA === items[k]) {
              saatyValue = 1 / saatyValue;
            }
          }

          values.push(saatyValue);
        }
      }

      if (values.length > 0) {
        const aggregated = geometricMean(values);
        matrix[i][k] = aggregated;
        matrix[k][i] = 1 / aggregated;
        filledCells++;
      }
      // Se values.length === 0: matrix[i][k] permanece null (IPC)
    }
  }

  return {
    matrix,
    isComplete: filledCells === totalCells,
    filledCells,
    totalCells
  };
}

/**
 * Calcula pesos a partir de uma PCM que pode ser incompleta.
 * Se completa: usa eigenvector clássico (resultado idêntico ao atual).
 * Se incompleta + conectada: usa LLSM-IPC (Bozóki et al., 2009).
 * Se incompleta + desconectada: lança erro.
 * 
 * @returns { weights, consistency, method, completeness }
 */
function calculateWeightsIPC(
  aggregation: AggregationResult,
  items: string[],
  groupLabel: string
): {
  weights: number[];
  consistency: { cr: number; ci: number; lambda: number };
  method: 'EIGENVECTOR' | 'LLSM_IPC';
  completeness: { ratio: number; given: number; possible: number; isComplete: boolean };
} {
  const n = items.length;

  if (aggregation.isComplete) {
    // Caminho clássico — 100% backward compatible
    const completeMatrix = aggregation.matrix as number[][];
    const weights = calculateEigenvector(completeMatrix);
    const consistency = calculateConsistency(completeMatrix);
    console.log(`[IPC] ${groupLabel}: COMPLETA (${aggregation.filledCells}/${aggregation.totalCells}), método EIGENVECTOR`);
    return {
      weights,
      consistency,
      method: 'EIGENVECTOR',
      completeness: {
        ratio: 1.0,
        given: aggregation.filledCells,
        possible: aggregation.totalCells,
        isComplete: true
      }
    };
  }

  // PCM incompleta — verificar conectividade
  console.log(`[IPC] ${groupLabel}: INCOMPLETA (${aggregation.filledCells}/${aggregation.totalCells}), verificando conectividade...`);

  // Construir grafo a partir da PCM agregada
  const edges: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (aggregation.matrix[i][j] !== null) {
        edges.push([i, j]);
      }
    }
  }
  const graph: ComparisonGraph = { n, edges };
  const connectivity = checkConnectivity(graph);

  if (!connectivity.isConnected) {
    const error = `[IPC] ERRO: PCM agregada para ${groupLabel} tem grafo DESCONECTADO ` +
      `(${connectivity.componentCount} componentes). Não é possível calcular pesos. ` +
      `Componentes: ${JSON.stringify(connectivity.components.map(c => c.map(idx => items[idx])))}`;
    console.error(error);
    throw new Error(error);
  }

  // Grafo conectado → usar LLSM-IPC
  const llsmResult = llsmIPC(aggregation.matrix, graph);
  console.log(`[IPC] ${groupLabel}: LLSM-IPC convergiu. Pesos: [${llsmResult.weights.map(w => w.toFixed(4)).join(', ')}], CR=${llsmResult.cr.toFixed(4)}`);

  return {
    weights: llsmResult.weights,
    consistency: {
      cr: llsmResult.cr,
      ci: llsmResult.cr * (RI[n] || 1.49), // CI = CR × RI
      lambda: llsmResult.lambdaMax
    },
    method: 'LLSM_IPC',
    completeness: {
      ratio: aggregation.filledCells / aggregation.totalCells,
      given: aggregation.filledCells,
      possible: aggregation.totalCells,
      isComplete: false
    }
  };
}

// ============================================================================
// CÁLCULO DOS SCORES - COM RANKINGS [Q1/A1]
// ============================================================================

function calculateAlternativeScores(
  alternatives: { code: string; name: string }[],
  personalWeights: number[],
  rescalingWeights: number[],
  altScoresByMerit: Record<string, Record<string, number>>
): AlternativeScore[] {

  const [vb, vo, vc, vr] = personalWeights;
  const [sb, so, sc, sr] = rescalingWeights;
  const epsilon = 0.0001;

  // PASSO 1: Calcular BOCR Priorities
  const bocrPriorities: Record<string, { B: number; O: number; C: number; R: number }> = {};

  alternatives.forEach(alt => {
    bocrPriorities[alt.code] = {
      B: altScoresByMerit['B']?.[alt.code] || 0,
      O: altScoresByMerit['O']?.[alt.code] || 0,
      C: altScoresByMerit['C']?.[alt.code] || 0,
      R: altScoresByMerit['R']?.[alt.code] || 0
    };
  });

  // PASSO 2: Calcular recíprocos normalizados
  const reciprocals = alternatives.map(alt => ({
    code: alt.code,
    C_recip: 1 / Math.max(bocrPriorities[alt.code].C, epsilon),
    R_recip: 1 / Math.max(bocrPriorities[alt.code].R, epsilon)
  }));

  const sumC_recip = reciprocals.reduce((sum, r) => sum + r.C_recip, 0);
  const sumR_recip = reciprocals.reduce((sum, r) => sum + r.R_recip, 0);

  const reciprocalsNorm: Record<string, { C: number; R: number }> = {};
  reciprocals.forEach(r => {
    reciprocalsNorm[r.code] = {
      C: r.C_recip / sumC_recip,
      R: r.R_recip / sumR_recip
    };
  });

  // PASSO 3: Calcular todos os scores
  const scores: AlternativeScore[] = alternatives.map(alt => {
    const B = bocrPriorities[alt.code].B;
    const O = bocrPriorities[alt.code].O;
    const C = bocrPriorities[alt.code].C;
    const R = bocrPriorities[alt.code].R;

    const C_reciprocal = reciprocalsNorm[alt.code].C;
    const R_reciprocal = reciprocalsNorm[alt.code].R;

    const scoreSubtractive = (vb * sb * B) + (vo * so * O) - (vc * sc * C) - (vr * sr * R);
    const positives = (sb * B) + (so * O);
    const negatives = (sc * C) + (sr * R) + epsilon;
    const scoreQuotientSums = positives / negatives;
    const scoreAdditiveResidual = (vb * B) + (vo * O) + (vc * (1 - C)) + (vr * (1 - R));
    const scoreMultiplicative =
      (Math.pow(Math.max(B, epsilon), vb) * Math.pow(Math.max(O, epsilon), vo)) /
      (Math.pow(Math.max(C, epsilon), vc) * Math.pow(Math.max(R, epsilon), vr));
    const scoreMultSimple = (B * O + epsilon) / (C * R + epsilon);

    return {
      code: alt.code,
      name: alt.name,
      B, O, C, R,
      C_reciprocal,
      R_reciprocal,
      scoreSubtractive,
      scoreSubtractiveNorm: 0,
      rankSubtractive: 0,
      isNegative: scoreSubtractive < 0,
      scoreQuotientSums,
      scoreQuotientSumsNorm: 0,
      rankQuotientSums: 0,
      scoreAdditiveResidual,
      scoreAdditiveResidualNorm: 0,
      rankAdditiveResidual: 0,
      scoreMultiplicative,
      scoreMultiplicativeNorm: 0,
      rankMultiplicative: 0,
      scoreMultSimple,
      scoreMultSimpleNorm: 0,
      rankMultSimple: 0
    };
  });

  // PASSO 4: Normalização e Rankings
  const subtractiveVals = scores.map(s => s.scoreSubtractive);
  const minSubtractive = Math.min(...subtractiveVals);
  const maxSubtractive = Math.max(...subtractiveVals);
  const rangeSubtractive = maxSubtractive - minSubtractive || 1;

  const sumQuotientSums = scores.reduce((sum, s) => sum + s.scoreQuotientSums, 0) || 1;
  const sumAdditiveResidual = scores.reduce((sum, s) => sum + s.scoreAdditiveResidual, 0) || 1;
  const sumMultiplicative = scores.reduce((sum, s) => sum + s.scoreMultiplicative, 0) || 1;
  const sumMultSimple = scores.reduce((sum, s) => sum + s.scoreMultSimple, 0) || 1;

  scores.forEach(s => {
    s.scoreSubtractiveNorm = (s.scoreSubtractive - minSubtractive) / rangeSubtractive;
    s.scoreQuotientSumsNorm = s.scoreQuotientSums / sumQuotientSums;
    s.scoreAdditiveResidualNorm = s.scoreAdditiveResidual / sumAdditiveResidual;
    s.scoreMultiplicativeNorm = s.scoreMultiplicative / sumMultiplicative;
    s.scoreMultSimpleNorm = s.scoreMultSimple / sumMultSimple;
  });

  const methods = [
    { key: 'scoreSubtractive', rankKey: 'rankSubtractive' },
    { key: 'scoreQuotientSums', rankKey: 'rankQuotientSums' },
    { key: 'scoreAdditiveResidual', rankKey: 'rankAdditiveResidual' },
    { key: 'scoreMultiplicative', rankKey: 'rankMultiplicative' },
    { key: 'scoreMultSimple', rankKey: 'rankMultSimple' }
  ];

  methods.forEach(({ key, rankKey }) => {
    const sorted = [...scores].sort((a, b) =>
      (b[key as keyof AlternativeScore] as number) - (a[key as keyof AlternativeScore] as number)
    );
    sorted.forEach((s, idx) => {
      const original = scores.find(sc => sc.code === s.code);
      if (original) {
        (original as any)[rankKey] = idx + 1;
      }
    });
  });

  return scores;
}

// ============================================================================
// ANÁLISE DE CONCORDÂNCIA
// ============================================================================

function analyzeMethodConcordance(scores: AlternativeScore[]): MethodConcordance {
  const methods = [
    { name: 'Subtractive', rankKey: 'rankSubtractive' },
    { name: 'QuotientSums', rankKey: 'rankQuotientSums' },
    { name: 'AdditiveResidual', rankKey: 'rankAdditiveResidual' },
    { name: 'Multiplicative', rankKey: 'rankMultiplicative' },
    { name: 'MultSimple', rankKey: 'rankMultSimple' }
  ];

  const rankingsByMethod: Record<string, string[]> = {};

  methods.forEach(({ name, rankKey }) => {
    const sorted = [...scores].sort((a, b) =>
      (a[rankKey as keyof AlternativeScore] as number) - (b[rankKey as keyof AlternativeScore] as number)
    );
    rankingsByMethod[name] = sorted.map(s => s.code);
  });

  const winners: Record<string, string> = {};
  methods.forEach(({ name }) => {
    winners[name] = rankingsByMethod[name][0];
  });

  const winnerCounts: Record<string, number> = {};
  Object.values(winners).forEach(w => {
    winnerCounts[w] = (winnerCounts[w] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(winnerCounts));
  const consensusWinner = Object.entries(winnerCounts)
    .find(([_, count]) => count === maxCount)?.[0] || null;

  const divergentMethods = methods
    .filter(({ name }) => winners[name] !== consensusWinner)
    .map(({ name }) => name);

  const agreementPercent = (maxCount / methods.length) * 100;

  let robustnessLevel: 'excellent' | 'good' | 'acceptable' | 'poor';
  let robustnessLabel: string;

  if (agreementPercent >= 100) {
    robustnessLevel = 'excellent';
    robustnessLabel = 'Excelente (5/5 métodos concordam)';
  } else if (agreementPercent >= 80) {
    robustnessLevel = 'good';
    robustnessLabel = `Bom (${maxCount}/5 métodos concordam)`;
  } else if (agreementPercent >= 60) {
    robustnessLevel = 'acceptable';
    robustnessLabel = `Aceitável (${maxCount}/5 métodos concordam)`;
  } else {
    robustnessLevel = 'poor';
    robustnessLabel = `Baixo (${maxCount}/5 métodos concordam)`;
  }

  return {
    totalMethods: methods.length,
    agreeMethods: maxCount,
    agreementPercent,
    consensusWinner,
    divergentMethods,
    rankingsByMethod,
    robustnessLevel,
    robustnessLabel
  };
}

// ============================================================================
// ANÁLISE DE SENSIBILIDADE
// ============================================================================

function calculateSensitivityWithClassification(
  alternatives: { code: string; name: string }[],
  personalWeights: number[],
  rescalingWeights: number[],
  altScoresByMerit: Record<string, Record<string, number>>
): SensitivityAnalysis[] {
  const meritNames = ['Benefícios', 'Oportunidades', 'Custos', 'Riscos'];
  const results: SensitivityAnalysis[] = [];

  const getWinner = (testWeights: number[]): string => {
    const scores = calculateAlternativeScores(
      alternatives, testWeights, rescalingWeights, altScoresByMerit
    );
    const sorted = [...scores].sort((a, b) => b.scoreSubtractive - a.scoreSubtractive);
    return sorted[0]?.code || '';
  };

  const currentWinner = getWinner(personalWeights);

  MERITS.forEach((merit, meritIdx) => {
    const makeTestWeights = (targetWeight: number): number[] => {
      const remaining = 1 - targetWeight;
      const otherWeightsSum = personalWeights.reduce((sum, w, i) =>
        i !== meritIdx ? sum + w : sum, 0
      ) || 1;

      return personalWeights.map((w, i) => {
        if (i === meritIdx) return targetWeight;
        return remaining > 0 ? (w / otherWeightsSum) * remaining : 0;
      });
    };

    const currentMeritWeight = personalWeights[meritIdx] || 0;
    const currentWeightPct = Math.round(currentMeritWeight * 100);

    let inflectionPoint: number | null = null;
    let newWinner: string | null = null;

    const winnerAt0 = getWinner(makeTestWeights(0));
    const winnerAt100 = getWinner(makeTestWeights(1));

    if (winnerAt0 !== currentWinner || winnerAt100 !== currentWinner) {
      let closestInflection: number | null = null;

      for (let w = currentWeightPct + 1; w <= 100; w++) {
        const testWinner = getWinner(makeTestWeights(w / 100));
        if (testWinner !== currentWinner) {
          closestInflection = w - currentWeightPct;
          newWinner = testWinner;
          break;
        }
      }

      for (let w = currentWeightPct - 1; w >= 0; w--) {
        const testWinner = getWinner(makeTestWeights(w / 100));
        if (testWinner !== currentWinner) {
          const distDown = currentWeightPct - w;
          if (closestInflection === null || distDown < closestInflection) {
            closestInflection = distDown;
            newWinner = testWinner;
          }
          break;
        }
      }

      inflectionPoint = closestInflection;
    }

    let classification: 'robust' | 'moderate' | 'sensitive' | 'critical';
    let classificationLabel: string;
    let changeDescription: string;

    if (inflectionPoint === null) {
      classification = 'robust';
      classificationLabel = 'Robusto';
      changeDescription = `Ranking estável para qualquer variação em ${meritNames[meritIdx]}`;
    } else if (inflectionPoint >= SENSITIVITY_THRESHOLDS.robust) {
      classification = 'robust';
      classificationLabel = 'Robusto';
      changeDescription = `Mudança apenas com variação > ${inflectionPoint}% em ${meritNames[meritIdx]}`;
    } else if (inflectionPoint >= SENSITIVITY_THRESHOLDS.moderate) {
      classification = 'moderate';
      classificationLabel = 'Moderadamente Sensível';
      changeDescription = `Ranking muda com ${inflectionPoint}% de variação em ${meritNames[meritIdx]}`;
    } else if (inflectionPoint >= SENSITIVITY_THRESHOLDS.sensitive) {
      classification = 'sensitive';
      classificationLabel = 'Sensível';
      changeDescription = `Ranking sensível: muda com apenas ${inflectionPoint}% de variação em ${meritNames[meritIdx]}`;
    } else {
      classification = 'critical';
      classificationLabel = 'Crítico';
      changeDescription = `⚠️ CRÍTICO: Ranking muda com apenas ${inflectionPoint}% de variação em ${meritNames[meritIdx]} - requer justificativa`;
    }

    results.push({
      merit,
      meritName: meritNames[meritIdx],
      inflectionPoint,
      classification,
      classificationLabel,
      currentWinner,
      newWinner,
      changeDescription,
      currentWeight: (personalWeights[meritIdx] || 0) * 100
    });
  });

  return results;
}

function calculateSensitivityTrajectoriesOnly(
  alternatives: { code: string; name: string }[],
  personalWeights: number[],
  rescalingWeights: number[],
  altScoresByMerit: Record<string, Record<string, number>>
): Record<string, SensitivityTrajectoryPoint[]> {
  const trajectories: Record<string, SensitivityTrajectoryPoint[]> = {};

  MERITS.forEach((merit, meritIdx) => {
    const points: SensitivityTrajectoryPoint[] = [];
    let previousWinner = '';

    for (let i = 0; i <= 20; i++) {
      const weight = i * 0.05;
      const remaining = 1 - weight;
      const otherWeightsSum = personalWeights.reduce((sum, w, idx) =>
        idx !== meritIdx ? sum + w : sum
        , 0) || 1;

      const testWeights = personalWeights.map((w, idx) => {
        if (idx === meritIdx) return weight;
        if (otherWeightsSum === 0) return 0;
        return (w / otherWeightsSum) * remaining;
      });

      const scores = calculateAlternativeScores(
        alternatives, testWeights, rescalingWeights, altScoresByMerit
      );

      const scoreMap: Record<string, number> = {};
      scores.forEach(s => {
        scoreMap[s.code] = s.scoreSubtractive;
      });

      const sorted = [...scores].sort((a, b) => b.scoreSubtractive - a.scoreSubtractive);
      const winner = sorted[0]?.code || '';

      const inflection = i > 0 && winner !== previousWinner;
      previousWinner = winner;

      points.push({
        weight: parseFloat((weight * 100).toFixed(1)),
        scores: scoreMap,
        winner,
        inflection
      });
    }
    trajectories[merit] = points;
  });
  return trajectories;
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { projectId, excludedRespondentIds = [] } = await request.json();

    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'projectId é obrigatório'
      }, { status: 400 });
    }

    // Buscar projeto
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Projeto não encontrado'
      }, { status: 404 });
    }

    const project = projectDoc.data();
    const alternatives = project.alternatives || [];

    if (alternatives.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Projeto precisa ter pelo menos 2 alternativas'
      }, { status: 400 });
    }

    // 1. Carregar todos os respondentIds válidos do projeto
    const respondentsQuery = query(
      collection(db, 'respondents'),
      where('projectId', '==', projectId)
    );
    const respondentsSnapshot = await getDocs(respondentsQuery);
    const validRespondentIds = new Set(respondentsSnapshot.docs.map(doc => doc.id));
    console.log(`[CALCULATE] Respondentes registrados no projeto: ${validRespondentIds.size}`);

    // 2. Buscar respostas
    const responsesQuery = query(
      collection(db, 'responses'),
      where('projectId', '==', projectId)
    );
    const responsesSnapshot = await getDocs(responsesQuery);

    // 3. Filtrar responses: apenas completedAt preenchido
    const allResponses = responsesSnapshot.docs.map(docSnap => ({ 
      id: docSnap.id, 
      ...(docSnap.data() as ResponseData) 
    }));
    
    const completedResponses = allResponses.filter(data => 
      data.completedAt != null && data.completedAt !== ''
    );

    // 4. Validação cruzada: respondentId deve existir em respondents (Elimina Órfãos)
    const validatedResponses = completedResponses.filter((data, idx) => {
      const rId = extractRespondentId(data, idx);
      if (!validRespondentIds.has(rId)) {
        console.warn(`[CALCULATE] Ignorando response órfã: respondentId ${rId} não existe em respondents`);
        return false;
      }
      return true;
    });

    if (validatedResponses.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma resposta completa e válida encontrada para calcular.',
        details: `Total em responses: ${responsesSnapshot.size}, Com completedAt: ${completedResponses.length}, Com respondent válido: 0`
      }, { status: 400 });
    }

    // 5. Deduplicação: Manter o mais recente por respondentId
    const uniqueMap = new Map<string, any>();
    validatedResponses.forEach((data, idx) => {
      const rId = extractRespondentId(data, idx);
      const existing = uniqueMap.get(rId);
      
      if (!existing || (data.completedAt > existing.completedAt)) {
        uniqueMap.set(rId, data);
      }
    });

    const finalResponses = Array.from(uniqueMap.values());

    // Filtrar respondentes excluídos
    const responses = finalResponses.filter((r, idx) => {
      const id = extractRespondentId(r, idx);
      return !excludedRespondentIds.includes(id);
    });

    // Fallback: calcular campo responses para responses que têm judgments mas não têm pesos pré-calculados
    const altCodesForCalc = alternatives.map((a: any) => a.code);
    responses.forEach(r => {
      if (r.judgments && r.judgments.length > 0 && (!r.responses || !r.responses.avgCR)) {
        try {
          const ipcResult = calculateAllWeights(r.judgments as IPCJudgment[], altCodesForCalc);
          r.responses = {
            avgCR: ipcResult.avgCR,
            bocrWeights: ipcResult.bocrWeights.weights,
            bocrConsistency: {
              cr: ipcResult.bocrWeights.cr,
              lambda: ipcResult.bocrWeights.lambdaMax,
              ci: ipcResult.bocrWeights.lambdaMax > 0
                ? (ipcResult.bocrWeights.lambdaMax - ipcResult.bocrWeights.items.length) / (ipcResult.bocrWeights.items.length - 1)
                : 0
            },
            magnitudeWeights: ipcResult.magnitudeWeights.weights,
            magnitudeConsistency: {
              cr: ipcResult.magnitudeWeights.cr,
              lambda: ipcResult.magnitudeWeights.lambdaMax
            },
            subWeights: Object.fromEntries(
              Object.entries(ipcResult.subWeights).map(([k, v]) => [k, v.weights])
            ),
            subConsistency: Object.fromEntries(
              Object.entries(ipcResult.subWeights).map(([k, v]) => [k, { cr: v.cr, lambda: v.lambdaMax }])
            ),
          };
          console.log(`[CALCULATE] Fallback: computed responses for ${extractRespondentId(r, 0)}, avgCR=${(ipcResult.avgCR * 100).toFixed(2)}%`);
        } catch (e) {
          console.warn(`[CALCULATE] Fallback CR computation failed for response:`, e);
        }
      }
    });

    // MUDANÇA 3 — Verificar cálculo de CR individual (n-1 para grafo conectado)
    // O número de nós (n) por grupo: BOCR = 4, Magnitudes = 4, Subcritérios = 5, Alternativas = projeto tem alternatives.length
    const altCount = (project as any)?.alternatives?.length || 0;

    responses.forEach(r => {
      if (!r.judgments) return;

      // Contar julgamentos preenchidos (que não sejam skip) por grupo
      const validJudgments = r.judgments.filter((j: any) => j && j.favors);
      
      const counts: Record<string, number> = {};
      validJudgments.forEach((j: any) => {
        counts[j.group] = (counts[j.group] || 0) + 1;
      });

      // Função auxiliar para anular CR se faltar n-1
      const invalidateCR = (obj: any, path: string[]) => {
        if (!obj) return;
        let curr = obj;
        for (let i = 0; i < path.length - 1; i++) {
          if (!curr[path[i]]) return;
          curr = curr[path[i]];
        }
        const last = path[path.length - 1];
        if (curr[last] !== undefined) {
           curr[last] = -1; // Marcador para N/A
        }
      };

      // BOCR (n=4 -> n-1=3)
      if ((counts['BOCR'] || 0) < 3) invalidateCR(r, ['responses', 'bocrConsistency', 'cr']);
      
      // Subcritérios B, O, C, R (n=5 -> n-1=4)
      if ((counts['B'] || 0) < 4) invalidateCR(r, ['responses', 'subConsistency', 'B', 'cr']);
      if ((counts['O'] || 0) < 4) invalidateCR(r, ['responses', 'subConsistency', 'O', 'cr']);
      if ((counts['C'] || 0) < 4) invalidateCR(r, ['responses', 'subConsistency', 'C', 'cr']);
      if ((counts['R'] || 0) < 4) invalidateCR(r, ['responses', 'subConsistency', 'R', 'cr']);

      // Alternativas (n=altCount -> n-1 = altCount - 1)
      if (altCount > 0) {
        const requiredExt = altCount - 1;
        // B1..B5, O1..O5, C1..C5, R1..R5
        ['B', 'O', 'C', 'R'].forEach(merit => {
          for (let i = 1; i <= 5; i++) {
             const grp = `${merit}${i}`;
             if ((counts[grp] || 0) < requiredExt) {
                // Not stored in response right now but good for future-proofing
             }
          }
        });
      }

      // Recalcular avgCR se os sub-CRs foram marcados como N/A
      if (r.responses) {
         const crs = [
           r.responses.bocrConsistency?.cr,
           r.responses.subConsistency?.B?.cr,
           r.responses.subConsistency?.O?.cr,
           r.responses.subConsistency?.C?.cr,
           r.responses.subConsistency?.R?.cr
         ].filter(val => val !== undefined && val !== null && val !== -1);
         
         if (crs.length > 0) {
            r.responses.avgCR = crs.reduce((a,b) => a+b, 0) / crs.length;
         } else {
            r.responses.avgCR = -1;
         }
      }
    });

    const responseCount = responses.length;
    const excludedCount = finalResponses.length - responses.length;
    console.log(`[BOCR v5.0] Processando ${responseCount} respostas (Excluídos: ${excludedCount})`);

    if (responseCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Todas as respostas completas foram excluídas. Impossível calcular.'
      }, { status: 400 });
    }

    // ══════════════════════════════════════════════════════════════════════
    // PASSO 1: PERSONAL WEIGHTS (Importância Relativa) - IPC AWARE
    // ══════════════════════════════════════════════════════════════════════

    const bocrAggregation = aggregateMatrix(responses, 'bocr', 'BOCR', [...MERITS]);
    const bocrResult = calculateWeightsIPC(bocrAggregation, [...MERITS], 'BOCR');
    const personalWeights = bocrResult.weights;
    const bocrConsistency = bocrResult.consistency;
    const bocrMatrix = bocrAggregation.isComplete
      ? bocrAggregation.matrix as number[][]
      : completePCM(bocrAggregation.matrix, personalWeights);
    console.log('[BOCR v5.0] Personal weights:', personalWeights, `(${bocrResult.method})`);

    // ══════════════════════════════════════════════════════════════════════
    // PASSO 2: RESCALING WEIGHTS (Magnitude Absoluta) - IPC AWARE
    // ══════════════════════════════════════════════════════════════════════

    const magnitudeAggregation = aggregateMatrix(responses, 'magnitude', 'MAGNITUDE', [...MERITS]);
    const magnitudeResult = calculateWeightsIPC(magnitudeAggregation, [...MERITS], 'MAGNITUDE');
    const rescalingWeights = magnitudeResult.weights;
    const magnitudeConsistency = magnitudeResult.consistency;
    const magnitudeMatrix = magnitudeAggregation.isComplete
      ? magnitudeAggregation.matrix as number[][]
      : completePCM(magnitudeAggregation.matrix, rescalingWeights);
    console.log('[BOCR v5.0] Rescaling weights:', rescalingWeights, `(${magnitudeResult.method})`);

    // ══════════════════════════════════════════════════════════════════════
    // PASSO 3: PESOS DOS SUBCRITÉRIOS - IPC AWARE
    // ══════════════════════════════════════════════════════════════════════

    const subWeights: Record<string, number[]> = {};
    const subConsistency: Record<string, { cr: number; lambda: number }> = {};
    const subMatrices: Record<string, number[][]> = {};
    const subMethods: Record<string, string> = {};
    const subCompleteness: Record<string, { ratio: number; given: number; possible: number; isComplete: boolean }> = {};

    for (const merit of MERITS) {
      const subItems = Array.from(
        { length: SUBCRITERIA_PER_MERIT },
        (_, i) => `${merit}${i + 1}`
      );
      const subAggregation = aggregateMatrix(responses, 'subcriteria', merit, subItems);
      const subResult = calculateWeightsIPC(subAggregation, subItems, `SUB-${merit}`);

      subWeights[merit] = subResult.weights;
      subConsistency[merit] = { cr: subResult.consistency.cr, lambda: subResult.consistency.lambda };
      subMatrices[merit] = subAggregation.isComplete
        ? subAggregation.matrix as number[][]
        : completePCM(subAggregation.matrix, subResult.weights);
      subMethods[merit] = subResult.method;
      subCompleteness[merit] = subResult.completeness;
    }

    // ══════════════════════════════════════════════════════════════════════
    // PASSO 4: SCORES DAS ALTERNATIVAS POR MÉRITO - IPC AWARE
    // ══════════════════════════════════════════════════════════════════════

    const altCodes = alternatives.map((a: any) => a.code);
    const altScores: Record<string, Record<string, number>> = {};
    const altScoresByMerit: Record<string, Record<string, number>> = {
      B: {}, O: {}, C: {}, R: {}
    };

    for (const merit of MERITS) {
      for (let subIdx = 0; subIdx < SUBCRITERIA_PER_MERIT; subIdx++) {
        const subCode = `${merit}${subIdx + 1}`;
        const altAggregation = aggregateMatrix(responses, 'alternatives', subCode, altCodes);
        const altResult = calculateWeightsIPC(altAggregation, altCodes, `ALT-${subCode}`);

        altScores[subCode] = {};
        alternatives.forEach((alt: any, i: number) => {
          altScores[subCode][alt.code] = altResult.weights[i] || 0;
        });
      }

      // Agregar scores por mérito
      alternatives.forEach((alt: any) => {
        let weightedSum = 0;
        for (let subIdx = 0; subIdx < SUBCRITERIA_PER_MERIT; subIdx++) {
          const subCode = `${merit}${subIdx + 1}`;
          const subWeight = subWeights[merit]?.[subIdx] || 0;
          const altScore = altScores[subCode]?.[alt.code] || 0;
          weightedSum += subWeight * altScore;
        }
        altScoresByMerit[merit][alt.code] = weightedSum;
      });
    }

    // ══════════════════════════════════════════════════════════════════════
    // PASSO 5: SÍNTESE FINAL - TODOS OS MÉTODOS COM RANKINGS
    // ══════════════════════════════════════════════════════════════════════

    const finalScores = calculateAlternativeScores(
      alternatives,
      personalWeights,
      rescalingWeights,
      altScoresByMerit
    );

    console.log('[BOCR v5.0] Scores finais:');
    finalScores.forEach(s => {
      console.log(`  ${s.code}: Subtr=${s.scoreSubtractive.toFixed(4)} (rank ${s.rankSubtractive})` +
        ` | Negative=${s.isNegative}`);
    });

    // ══════════════════════════════════════════════════════════════════════
    // PASSO 6: ANÁLISE DE CONCORDÂNCIA [Q1/A1]
    // ══════════════════════════════════════════════════════════════════════

    const concordance = analyzeMethodConcordance(finalScores);
    console.log(`[BOCR v5.0] Concordância: ${concordance.agreementPercent}% (${concordance.robustnessLabel})`);

    // ══════════════════════════════════════════════════════════════════════
    // PASSO 7: ANÁLISE DE SENSIBILIDADE COM CLASSIFICAÇÃO [Q1/A1]
    // ══════════════════════════════════════════════════════════════════════

    const sensitivityAnalysis = calculateSensitivityWithClassification(
      alternatives, personalWeights, rescalingWeights, altScoresByMerit
    );

    // Calcular trajetórias para gráficos de linha
    const sensitivityTrajectories = calculateSensitivityTrajectoriesOnly(
      alternatives, personalWeights, rescalingWeights, altScoresByMerit
    );

    console.log('[BOCR v5.0] Sensibilidade:');
    sensitivityAnalysis.forEach(s => {
      console.log(`  ${s.merit}: ${s.classificationLabel} (inflexão: ${s.inflectionPoint || 'N/A'}%)`);
    });

    // ══════════════════════════════════════════════════════════════════════
    // PASSO 8: TABELA BOCR PRIORITIES [Lee 2009, Alizadeh 2020]
    // ══════════════════════════════════════════════════════════════════════

    const bocrPrioritiesTable: BOCRPriorities[] = alternatives.map((alt: any) => ({
      code: alt.code,
      name: alt.name,
      B: finalScores.find(s => s.code === alt.code)?.B || 0,
      O: finalScores.find(s => s.code === alt.code)?.O || 0,
      C: finalScores.find(s => s.code === alt.code)?.C || 0,
      R: finalScores.find(s => s.code === alt.code)?.R || 0,
      C_reciprocal: finalScores.find(s => s.code === alt.code)?.C_reciprocal || 0,
      R_reciprocal: finalScores.find(s => s.code === alt.code)?.R_reciprocal || 0
    }));

    // Ranking pelo método principal
    const ranking = [...finalScores]
      .sort((a, b) => b.scoreSubtractive - a.scoreSubtractive)
      .map((s, i) => ({ position: i + 1, code: s.code, name: s.name }));

    // Verificar se há prioridades negativas
    const negativeAlternatives = finalScores.filter(s => s.isNegative);
    const hasNegativePriorities = negativeAlternatives.length > 0;

    // ══════════════════════════════════════════════════════════════════════
    // PASSO 9: MONTAR RESULTADO [Q1/A1 COMPLIANT]
    // ══════════════════════════════════════════════════════════════════════

    const calculationResult = {
      projectId,
      calculatedAt: new Date().toISOString(),
      responseCount,

      // Pesos
      bocrWeights: personalWeights,
      bocrConsistency: {
        cr: bocrConsistency.cr,
        ci: bocrConsistency.ci,
        lambda: bocrConsistency.lambda
      },
      rescalingWeights: {
        sb: rescalingWeights[0],
        so: rescalingWeights[1],
        sc: rescalingWeights[2],
        sr: rescalingWeights[3]
      },
      magnitudeConsistency: {
        cr: magnitudeConsistency.cr,
        ci: magnitudeConsistency.ci,
        lambda: magnitudeConsistency.lambda
      },

      // Subcritérios
      subWeights,
      subConsistency,

      // Matrizes pareadas agregadas (para validação externa via AhpAnpLib)
      // Serializadas como JSON strings (Firestore não suporta arrays aninhados)
      aggregatedMatrices: {
        bocr: JSON.stringify(bocrMatrix),
        magnitude: JSON.stringify(magnitudeMatrix),
        subcriteria: Object.fromEntries(
          Object.entries(subMatrices).map(([k, v]) => [k, JSON.stringify(v)])
        )
      },

      // === NOVIDADES Q1/A1 ===

      // Tabela BOCR Priorities [Lee 2009, Alizadeh 2020]
      bocrPrioritiesTable,

      // Scores com Rankings
      altScores,
      altMeritScores: alternatives.map((alt: any) => ({
        code: alt.code,
        name: alt.name,
        B: altScoresByMerit['B']?.[alt.code] || 0,
        O: altScoresByMerit['O']?.[alt.code] || 0,
        C: altScoresByMerit['C']?.[alt.code] || 0,
        R: altScoresByMerit['R']?.[alt.code] || 0
      })),
      finalScores,
      ranking,

      // Análise de Concordância [Lee 2009]
      methodConcordance: concordance,

      // Análise de Sensibilidade [Alizadeh 2020]
      sensitivityAnalysis,
      sensitivityInflections: Object.fromEntries(
        sensitivityAnalysis.map(s => [s.merit, s.inflectionPoint])
      ),
      sensitivityTrajectories,

      // Alertas Q1/A1
      alerts: {
        hasNegativePriorities,
        negativeAlternatives: negativeAlternatives.map(s => ({
          code: s.code,
          name: s.name,
          score: s.scoreSubtractive,
          message: `Alternativa ${s.name} tem score negativo (${s.scoreSubtractive.toFixed(4)}). Conforme Lee (2009a): "should never be selected due to negative overall outcome"`
        })),
        sensitivityCritical: sensitivityAnalysis.filter(s => s.classification === 'critical'),
        lowConcordance: concordance.agreementPercent < 60
      },

      // Metadados
      metadata: {
        projectName: project.name,
        alternativesCount: alternatives.length,
        methodsCount: 5,
        primaryMethod: 'Subtractive',
        version: '5.0',
        q1Features: [
          'BOCR Priorities Table (Lee 2009)',
          'Reciprocal Normalized Values (Lee 2009a)',
          'Negative Priority Detection (Lee 2009a)',
          'Method Concordance Analysis (Lee 2009, Alizadeh 2020)',
          'Sensitivity Classification (Alizadeh 2020)'
        ],
        references: {
          primary: 'Wijnmalen (2007) Eq.17: vb·sb·B + vo·so·O - vc·sc·C - vr·sr·R',
          alternative: 'Wijnmalen (2007) Eq.12: (sb·B + so·O) / (sc·C + sr·R)',
          demirtas: 'Demirtas & Ustun (2008) Eq.2: vb·B + vo·O + vc·(1-C) + vr·(1-R)',
          lee2009: 'Lee (2009) Wind farms: 5 synthesis methods comparison',
          lee2009a: 'Lee (2009a) Supplier selection: Negative priorities, concordance analysis',
          alizadeh2020: 'Alizadeh et al. (2020) Energy policy: Sensitivity classification'
        },
        excludedRespondentIds // Persistir lista de excluídos
      },

      // === IPC METADATA ===
      ipcMetadata: {
        bocr: {
          method: bocrResult.method,
          completeness: bocrResult.completeness
        },
        magnitude: {
          method: magnitudeResult.method,
          completeness: magnitudeResult.completeness
        },
        subcriteria: Object.fromEntries(
          MERITS.map(m => [m, {
            method: subMethods[m],
            completeness: subCompleteness[m]
          }])
        ),
        hasIncompleteGroups: [
          bocrResult.method,
          magnitudeResult.method,
          ...Object.values(subMethods)
        ].includes('LLSM_IPC'),
        version: 'IPC-1.0',
        reference: 'Bozóki, Fülöp & Rónyai (2009). On optimal completion of incomplete pairwise comparison matrices.'
      }
    };

    // Salvar no Firestore
    await setDoc(doc(db, 'calculations', projectId), calculationResult);
    console.log('[BOCR v5.0] Cálculo salvo com sucesso!');

    return NextResponse.json({
      success: true,
      message: `Cálculo Q1/A1 concluído com ${responseCount} respostas`,
      calculation: calculationResult
    });

  } catch (error: any) {
    console.error('[BOCR v5.0] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno no servidor'
    }, { status: 500 });
  }
}
