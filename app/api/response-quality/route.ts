// app/api/response-quality/route.ts
// Detector de Respostas Suspeitas - Análise de Qualidade dos Dados AHP
// Identifica respondentes com padrões suspeitos que podem comprometer a análise

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// TIPOS
// ============================================================

interface Judgment {
  type: string;
  group: string;
  itemA: string;
  itemB: string;
  saatyValue: number;
  favors: string;
}

interface Response {
  respondentId: string;
  projectId: string;
  judgments: Judgment[];
  completedAt?: string;
  updatedAt?: string;
  isSimulated?: boolean;
}

interface RespondentQuality {
  respondentId: string;
  isSimulated: boolean;
  overallScore: number; // 0-100
  status: 'CONFIÁVEL' | 'REVISAR' | 'SUSPEITO' | 'CRÍTICO';
  flags: QualityFlag[];
  metrics: {
    avgCR: number;
    maxCR: number;
    uniformityScore: number; // 0-1, quanto maior mais uniforme (suspeito)
    extremeValueRatio: number; // % de valores 1 ou 9
    contradictionCount: number;
    totalJudgments: number;
  };
  recommendation: string;
}

interface QualityFlag {
  type: 'CR_ALTO' | 'PADRAO_UNIFORME' | 'VALORES_EXTREMOS' | 'CONTRADICAO' | 'TUDO_IGUAL' | 'POUCOS_JULGAMENTOS';
  severity: 'INFO' | 'ALERTA' | 'GRAVE';
  message: string;
  details?: string;
}

// ============================================================
// CONSTANTES
// ============================================================

const RI_TABLE: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
};

const THRESHOLDS = {
  CR_WARNING: 0.12,      // CR > 12% = alerta (ajustado de 10% - arredondamento causa ~8-12% naturalmente)
  CR_CRITICAL: 0.20,     // CR > 20% = crítico
  UNIFORMITY_WARNING: 0.75, // > 75% uniformidade = suspeito (stdDev < 1.5)
  EXTREME_WARNING: 0.50, // > 50% valores extremos (1 ou 9) = suspeito
  EXTREME_CRITICAL: 0.80, // > 80% valores extremos = crítico
};

// ============================================================
// FUNÇÕES DE ANÁLISE
// ============================================================

/**
 * Constrói matriz de comparação a partir dos julgamentos
 */
function buildMatrix(judgments: Judgment[], type: string, group: string | null, items: string[]): number[][] {
  const n = items.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));
  
  const itemIndex: Record<string, number> = {};
  items.forEach((item, idx) => { itemIndex[item] = idx; });
  
  judgments.forEach(j => {
    if (j.type !== type) return;
    if (group !== null && j.group !== group) return;
    
    const i = itemIndex[j.itemA];
    const k = itemIndex[j.itemB];
    if (i === undefined || k === undefined) return;
    
    let value = j.saatyValue || 1;
    if (j.favors === 'B' || j.favors === j.itemB) {
      value = 1 / value;
    }
    
    matrix[i][k] = value;
    matrix[k][i] = 1 / value;
  });
  
  return matrix;
}

/**
 * Calcula autovetor usando média geométrica das linhas
 */
function calculateEigenvector(matrix: number[][]): number[] {
  const n = matrix.length;
  const weights: number[] = [];
  
  for (let i = 0; i < n; i++) {
    let product = 1;
    for (let j = 0; j < n; j++) {
      product *= matrix[i][j];
    }
    weights.push(Math.pow(product, 1/n));
  }
  
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

/**
 * Calcula Consistency Ratio (CR)
 */
function calculateCR(matrix: number[][]): number {
  const n = matrix.length;
  if (n < 3) return 0;
  
  const weights = calculateEigenvector(matrix);
  
  // Calcular λmax
  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += matrix[i][j] * weights[j];
    }
    lambdaMax += rowSum / weights[i];
  }
  lambdaMax /= n;
  
  const CI = (lambdaMax - n) / (n - 1);
  const RI = RI_TABLE[n] || 1.49;
  
  return RI > 0 ? CI / RI : 0;
}

/**
 * Analisa uniformidade dos valores (suspeito se muito uniforme)
 * Usa desvio padrão como métrica - valores AHP saudáveis devem ter variação
 */
function analyzeUniformity(judgments: Judgment[]): number {
  if (judgments.length === 0) return 0;
  
  const values = judgments.map(j => j.saatyValue);
  const uniqueValues = new Set(values);
  
  // Se todos os valores são exatamente iguais = 1.0 (máxima uniformidade)
  if (uniqueValues.size === 1) return 1.0;
  
  // Calcular desvio padrão
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Desvio padrão esperado para respostas AHP saudáveis: ~1.5 a ~3.0
  // stdDev < 0.5: Muito uniforme (suspeito) → uniformityScore = 0.95
  // stdDev 0.5-1.0: Uniforme (alerta) → uniformityScore = 0.85
  // stdDev 1.0-1.5: Baixa variação → uniformityScore = 0.70
  // stdDev 1.5-2.5: Normal → uniformityScore = 0.40
  // stdDev > 2.5: Boa variação → uniformityScore = 0.20
  
  if (stdDev < 0.5) return 0.95;
  if (stdDev < 1.0) return 0.85;
  if (stdDev < 1.5) return 0.70;
  if (stdDev < 2.0) return 0.50;
  if (stdDev < 2.5) return 0.35;
  return 0.20;
}

/**
 * Conta valores extremos (1 ou 9)
 */
function countExtremeValues(judgments: Judgment[]): number {
  if (judgments.length === 0) return 0;
  
  const extremeCount = judgments.filter(j => j.saatyValue === 1 || j.saatyValue === 9).length;
  return extremeCount / judgments.length;
}

/**
 * Detecta contradições lógicas (transitividade violada)
 * Ex: A > B, B > C, mas C > A
 */
function detectContradictions(judgments: Judgment[]): number {
  let contradictions = 0;
  
  // Agrupar por tipo de comparação
  const groupedJudgments: Record<string, Judgment[]> = {};
  judgments.forEach(j => {
    const key = `${j.type}-${j.group}`;
    if (!groupedJudgments[key]) groupedJudgments[key] = [];
    groupedJudgments[key].push(j);
  });
  
  // Para cada grupo, verificar transitividade
  Object.values(groupedJudgments).forEach(group => {
    // Construir grafo de preferências
    const preferences: Record<string, Record<string, number>> = {};
    
    group.forEach(j => {
      if (!preferences[j.itemA]) preferences[j.itemA] = {};
      if (!preferences[j.itemB]) preferences[j.itemB] = {};
      
      const value = j.favors === j.itemB ? 1 / j.saatyValue : j.saatyValue;
      preferences[j.itemA][j.itemB] = value;
      preferences[j.itemB][j.itemA] = 1 / value;
    });
    
    // Verificar ciclos de preferência forte
    const items = Object.keys(preferences);
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        for (let k = j + 1; k < items.length; k++) {
          const a = items[i], b = items[j], c = items[k];
          
          const ab = preferences[a]?.[b] || 1;
          const bc = preferences[b]?.[c] || 1;
          const ac = preferences[a]?.[c] || 1;
          
          // Se A >> B e B >> C, então A deveria ser >> C
          // Contradição se A >> B >> C mas C > A
          if (ab > 3 && bc > 3 && ac < 1/3) {
            contradictions++;
          }
          if (ab < 1/3 && bc < 1/3 && ac > 3) {
            contradictions++;
          }
        }
      }
    }
  });
  
  return contradictions;
}

/**
 * Analisa qualidade de um único respondente
 */
function analyzeRespondent(response: Response): RespondentQuality {
  const judgments = response.judgments || [];
  const flags: QualityFlag[] = [];
  
  // Verificar se há julgamentos suficientes
  if (judgments.length < 10) {
    flags.push({
      type: 'POUCOS_JULGAMENTOS',
      severity: 'ALERTA',
      message: `Apenas ${judgments.length} julgamentos registrados`,
      details: 'Resposta pode estar incompleta'
    });
  }
  
  // 1. Calcular CRs das matrizes
  const crs: number[] = [];
  
  // CR da matriz BOCR
  const bocrJudgments = judgments.filter(j => j.type === 'bocr');
  if (bocrJudgments.length >= 3) {
    const bocrMatrix = buildMatrix(judgments, 'bocr', null, ['B', 'O', 'C', 'R']);
    const cr = calculateCR(bocrMatrix);
    if (!isNaN(cr) && isFinite(cr)) crs.push(cr);
  }
  
  // CRs das matrizes de subcritérios
  ['B', 'O', 'C', 'R'].forEach(merit => {
    const subJudgments = judgments.filter(j => j.type === 'subcriteria' && j.group === merit);
    if (subJudgments.length >= 3) {
      const items = Array.from(new Set(subJudgments.flatMap(j => [j.itemA, j.itemB])));
      if (items.length >= 3) {
        const matrix = buildMatrix(judgments, 'subcriteria', merit, items);
        const cr = calculateCR(matrix);
        if (!isNaN(cr) && isFinite(cr)) crs.push(cr);
      }
    }
  });
  
  const avgCR = crs.length > 0 ? crs.reduce((a, b) => a + b, 0) / crs.length : 0;
  const maxCR = crs.length > 0 ? Math.max(...crs) : 0;
  
  // 2. Analisar uniformidade
  const uniformityScore = analyzeUniformity(judgments);
  
  // 3. Contar valores extremos
  const extremeValueRatio = countExtremeValues(judgments);
  
  // 4. Detectar contradições
  const contradictionCount = detectContradictions(judgments);
  
  // 5. Verificar se todos os valores são iguais
  const allSameValue = judgments.length > 0 && new Set(judgments.map(j => j.saatyValue)).size === 1;
  
  // ============================================================
  // GERAR FLAGS
  // ============================================================
  
  // Flag: CR alto
  if (maxCR > THRESHOLDS.CR_CRITICAL) {
    flags.push({
      type: 'CR_ALTO',
      severity: 'GRAVE',
      message: `CR máximo de ${(maxCR * 100).toFixed(1)}% (crítico > 20%)`,
      details: 'Indica julgamentos altamente inconsistentes, possível aleatoriedade'
    });
  } else if (maxCR > THRESHOLDS.CR_WARNING) {
    flags.push({
      type: 'CR_ALTO',
      severity: 'ALERTA',
      message: `CR máximo de ${(maxCR * 100).toFixed(1)}% (alerta > 12%)`,
      details: 'Inconsistência moderada nos julgamentos'
    });
  }
  
  // Flag: Todos valores iguais
  if (allSameValue && judgments.length > 5) {
    flags.push({
      type: 'TUDO_IGUAL',
      severity: 'GRAVE',
      message: `Todos os ${judgments.length} julgamentos têm o mesmo valor`,
      details: 'Padrão altamente improvável, sugere resposta automática ou desinteresse'
    });
  }
  
  // Flag: Padrão uniforme (stdDev baixo)
  if (uniformityScore > THRESHOLDS.UNIFORMITY_WARNING && !allSameValue) {
    flags.push({
      type: 'PADRAO_UNIFORME',
      severity: uniformityScore > 0.90 ? 'GRAVE' : 'ALERTA',
      message: `Baixa variação nos valores (stdDev baixo)`,
      details: 'Pouca diferenciação nas respostas, possível desatenção ou padrão robótico'
    });
  }
  
  // Flag: Valores extremos
  if (extremeValueRatio > THRESHOLDS.EXTREME_CRITICAL) {
    flags.push({
      type: 'VALORES_EXTREMOS',
      severity: 'GRAVE',
      message: `${(extremeValueRatio * 100).toFixed(0)}% dos valores são extremos (1 ou 9)`,
      details: 'Uso excessivo de extremos, falta de nuance nos julgamentos'
    });
  } else if (extremeValueRatio > THRESHOLDS.EXTREME_WARNING) {
    flags.push({
      type: 'VALORES_EXTREMOS',
      severity: 'ALERTA',
      message: `${(extremeValueRatio * 100).toFixed(0)}% dos valores são extremos (1 ou 9)`,
      details: 'Tendência a usar valores extremos'
    });
  }
  
  // Flag: Contradições
  if (contradictionCount > 3) {
    flags.push({
      type: 'CONTRADICAO',
      severity: 'GRAVE',
      message: `${contradictionCount} contradições lógicas detectadas`,
      details: 'Violações de transitividade (A>B>C mas C>A)'
    });
  } else if (contradictionCount > 0) {
    flags.push({
      type: 'CONTRADICAO',
      severity: 'ALERTA',
      message: `${contradictionCount} contradição(ões) lógica(s) detectada(s)`,
      details: 'Possíveis violações de transitividade'
    });
  }
  
  // ============================================================
  // CALCULAR SCORE E STATUS
  // ============================================================
  
  let score = 100;
  
  // Penalidades por flags (mais graduais)
  flags.forEach(flag => {
    if (flag.severity === 'GRAVE') score -= 25;
    else if (flag.severity === 'ALERTA') score -= 12;
    else score -= 3;
  });
  
  // Penalidade adicional por CR (mais gradual)
  // CR 12-15%: penalidade leve | CR 15-20%: moderada | CR > 20%: pesada
  if (avgCR > 0.12 && avgCR <= 0.15) score -= (avgCR - 0.12) * 100; // até -3
  else if (avgCR > 0.15 && avgCR <= 0.20) score -= 3 + (avgCR - 0.15) * 150; // até -10.5
  else if (avgCR > 0.20) score -= 11 + Math.min(20, (avgCR - 0.20) * 80); // até -31
  
  // Penalidade por uniformidade (stdDev baixo)
  // uniformityScore > 0.75 indica baixa variação
  if (uniformityScore > 0.85) score -= 15; // Muito uniforme
  else if (uniformityScore > 0.75) score -= 8; // Uniforme
  else if (uniformityScore > 0.60) score -= 3; // Levemente uniforme
  
  score = Math.max(0, Math.min(100, score));
  
  // Determinar status
  let status: RespondentQuality['status'];
  if (score >= 80) status = 'CONFIÁVEL';
  else if (score >= 60) status = 'REVISAR';
  else if (score >= 40) status = 'SUSPEITO';
  else status = 'CRÍTICO';
  
  // Gerar recomendação
  let recommendation: string;
  if (status === 'CONFIÁVEL') {
    recommendation = 'Respostas dentro dos parâmetros aceitáveis. Incluir na análise.';
  } else if (status === 'REVISAR') {
    recommendation = 'Revisar manualmente os julgamentos. Considerar inclusão condicional.';
  } else if (status === 'SUSPEITO') {
    recommendation = 'Alta probabilidade de respostas de baixa qualidade. Recomenda-se exclusão.';
  } else {
    recommendation = 'Respostas claramente problemáticas. Excluir da análise para preservar rigor científico.';
  }
  
  return {
    respondentId: response.respondentId,
    isSimulated: response.isSimulated || false,
    overallScore: Math.round(score),
    status,
    flags,
    metrics: {
      avgCR,
      maxCR,
      uniformityScore,
      extremeValueRatio,
      contradictionCount,
      totalJudgments: judgments.length
    },
    recommendation
  };
}

// ============================================================
// API ENDPOINT
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { responses, includeSimulated = true } = await request.json();
    
    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json({
        success: false,
        error: 'Array de respostas é obrigatório'
      }, { status: 400 });
    }
    
    // Filtrar simulados se necessário
    const filteredResponses = includeSimulated 
      ? responses 
      : responses.filter((r: Response) => !r.isSimulated);
    
    // Analisar cada respondente
    const analyses: RespondentQuality[] = filteredResponses.map((r: Response) => analyzeRespondent(r));
    
    // Estatísticas gerais
    const stats = {
      total: analyses.length,
      byStatus: {
        CONFIÁVEL: analyses.filter(a => a.status === 'CONFIÁVEL').length,
        REVISAR: analyses.filter(a => a.status === 'REVISAR').length,
        SUSPEITO: analyses.filter(a => a.status === 'SUSPEITO').length,
        CRÍTICO: analyses.filter(a => a.status === 'CRÍTICO').length
      },
      avgScore: analyses.length > 0 
        ? Math.round(analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length)
        : 0,
      avgCR: analyses.length > 0
        ? analyses.reduce((sum, a) => sum + a.metrics.avgCR, 0) / analyses.length
        : 0,
      flagCounts: {
        CR_ALTO: analyses.filter(a => a.flags.some(f => f.type === 'CR_ALTO')).length,
        TUDO_IGUAL: analyses.filter(a => a.flags.some(f => f.type === 'TUDO_IGUAL')).length,
        PADRAO_UNIFORME: analyses.filter(a => a.flags.some(f => f.type === 'PADRAO_UNIFORME')).length,
        VALORES_EXTREMOS: analyses.filter(a => a.flags.some(f => f.type === 'VALORES_EXTREMOS')).length,
        CONTRADICAO: analyses.filter(a => a.flags.some(f => f.type === 'CONTRADICAO')).length,
        POUCOS_JULGAMENTOS: analyses.filter(a => a.flags.some(f => f.type === 'POUCOS_JULGAMENTOS')).length
      }
    };
    
    // Recomendação geral
    // Considerar que REVISAR não é "problemático", apenas requer atenção
    const criticalCount = stats.byStatus.CRÍTICO;
    const suspectCount = stats.byStatus.SUSPEITO;
    const reliableCount = stats.byStatus.CONFIÁVEL + stats.byStatus.REVISAR;
    
    const criticalRatio = analyses.length > 0 ? criticalCount / analyses.length : 0;
    const suspectRatio = analyses.length > 0 ? suspectCount / analyses.length : 0;
    const reliableRatio = analyses.length > 0 ? reliableCount / analyses.length : 0;
    
    let overallRecommendation: string;
    let overallStatus: 'EXCELENTE' | 'BOA' | 'ACEITÁVEL' | 'PROBLEMÁTICA' | 'CRÍTICA';
    
    if (criticalRatio === 0 && suspectRatio === 0 && stats.avgScore >= 80) {
      overallStatus = 'EXCELENTE';
      overallRecommendation = 'Qualidade excelente dos dados. Todos os respondentes apresentam padrões confiáveis.';
    } else if (criticalRatio === 0 && suspectRatio < 0.15 && stats.avgScore >= 70) {
      overallStatus = 'BOA';
      overallRecommendation = 'Qualidade boa dos dados. Poucos respondentes requerem atenção.';
    } else if (criticalRatio < 0.10 && suspectRatio < 0.30 && stats.avgScore >= 55) {
      overallStatus = 'ACEITÁVEL';
      overallRecommendation = 'Qualidade aceitável. Recomenda-se revisar respondentes sinalizados antes da análise final.';
    } else if (criticalRatio < 0.20 && reliableRatio >= 0.40) {
      overallStatus = 'PROBLEMÁTICA';
      overallRecommendation = 'Qualidade problemática. Considere excluir respondentes críticos e suspeitos para preservar rigor científico.';
    } else {
      overallStatus = 'CRÍTICA';
      overallRecommendation = 'Qualidade crítica dos dados. A maioria dos respondentes apresenta padrões suspeitos. Recomenda-se nova coleta de dados.';
    }
    
    return NextResponse.json({
      success: true,
      analysis: {
        respondents: analyses.sort((a, b) => a.overallScore - b.overallScore), // Piores primeiro
        statistics: stats,
        overall: {
          status: overallStatus,
          recommendation: overallRecommendation,
          qualityScore: stats.avgScore,
          reliableCount: stats.byStatus.CONFIÁVEL,
          problematicCount: criticalCount + suspectCount
        }
      },
      metadata: {
        analyzedAt: new Date().toISOString(),
        version: '1.1',
        thresholds: THRESHOLDS
      }
    });
    
  } catch (error) {
    console.error('Erro na análise de qualidade:', error);
    return NextResponse.json({
      success: false,
      error: 'Erro ao analisar qualidade das respostas',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Documentação
export async function GET() {
  return NextResponse.json({
    description: 'API de Análise de Qualidade de Respostas AHP',
    version: '1.0',
    features: [
      'Calcula CR individual por respondente',
      'Detecta padrões uniformes suspeitos',
      'Identifica uso excessivo de valores extremos',
      'Detecta contradições lógicas (transitividade)',
      'Gera score de qualidade 0-100',
      'Classifica: CONFIÁVEL / REVISAR / SUSPEITO / CRÍTICO'
    ],
    thresholds: THRESHOLDS,
    usage: {
      method: 'POST',
      body: {
        responses: 'Array de objetos de resposta com judgments',
        includeSimulated: 'boolean (default: true)'
      }
    }
  });
}
