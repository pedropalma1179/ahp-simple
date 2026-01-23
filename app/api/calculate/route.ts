// app/api/calculate/route.ts
// API de Cálculo AHP-BOCR Completa - VERSÃO CORRIGIDA v3.0
// Baseado em: Saaty (1980), Wijnmalen (2007), Petrillo et al. (2023)
// 
// ✅ CORREÇÃO APLICADA: Agora extrai e usa julgamentos de MAGNITUDE
// para calcular rescaling weights (sb, so, sc, sr) conforme Wijnmalen (2007)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

// ============================================================
// CONSTANTES
// ============================================================

// Random Index (RI) - Saaty (1980)
const RI: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
};

// Estrutura BOCR
const MERITS = ['B', 'O', 'C', 'R'];
const SUBCRITERIA_PER_MERIT = 5;

// ============================================================
// FUNÇÕES MATEMÁTICAS
// ============================================================

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

// ============================================================
// INTERFACES
// ============================================================

interface Judgment {
  type: 'bocr' | 'magnitude' | 'subcriteria' | 'alternatives';  // ← 'magnitude' ADICIONADO
  group: string;
  itemA: string;
  itemB: string;
  saatyValue: number;
  favors: 'A' | 'B' | 'equal';
  rawSlider?: number;
}

interface ResponseData {
  judgments: Judgment[];
  completedAt?: string;
  projectId?: string;
  respondentId?: string;
}

// ============================================================
// AGREGAÇÃO DOS JULGAMENTOS
// ============================================================

function aggregateMatrix(
  responses: ResponseData[], 
  type: string, 
  group: string | null,
  items: string[]
): number[][] {
  const n = items.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));
  
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
        
        if (judgment) {
          let saatyValue = judgment.saatyValue || 1;
          
          // Ajustar baseado em quem é favorecido
          if (judgment.favors === 'equal') {
            saatyValue = 1;
          } else if (judgment.favors === 'B') {
            // Se B é favorecido, inverter se A está na posição i
            if (judgment.itemA === items[i]) {
              saatyValue = 1 / saatyValue;
            }
          } else if (judgment.favors === 'A') {
            // Se A é favorecido, inverter se A está na posição k
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
      }
    }
  }
  
  return matrix;
}

// ============================================================
// CÁLCULO DOS SCORES - CORRIGIDO COM RESCALING WEIGHTS
// ============================================================

interface AlternativeScore {
  code: string;
  name: string;
  B: number;
  O: number;
  C: number;
  R: number;
  // MÉTODOS CORRETOS (Wijnmalen 2007)
  scoreQuotientSums: number;           // Eq. 12 - RECOMENDADO
  scoreAdditiveSubtraction: number;    // Eq. 17
  scoreQuotientProducts: number;       // Eq. 9
  // Normalizados
  scoreQuotientSumsNorm: number;
  scoreAdditiveSubtractionNorm: number;
  scoreQuotientProductsNorm: number;
  // MÉTODOS LEGADOS (compatibilidade)
  scoreAdditive: number;
  scoreProbabilistic: number;
  scoreSubtractive: number;
  scoreSubtractiveNorm: number;
  scoreMultPowers: number;
  scoreMultPowersNorm: number;
  scoreMultSimple: number;
  scoreMultSimpleNorm: number;
}

function calculateAlternativeScores(
  alternatives: { code: string; name: string }[],
  bocrWeights: number[],              // Personal weights (vb, vo, vc, vr)
  rescalingWeights: number[],         // Magnitude-based (sb, so, sc, sr) ← NOVO!
  altScoresByMerit: Record<string, Record<string, number>>
): AlternativeScore[] {
  
  const [vb, vo, vc, vr] = bocrWeights;        // Personal weights
  const [sb, so, sc, sr] = rescalingWeights;  // Rescaling weights ← NOVO!
  const epsilon = 0.0001;
  
  const scores: AlternativeScore[] = alternatives.map(alt => {
    const B = altScoresByMerit['B']?.[alt.code] || 0;
    const O = altScoresByMerit['O']?.[alt.code] || 0;
    const C = altScoresByMerit['C']?.[alt.code] || 0;
    const R = altScoresByMerit['R']?.[alt.code] || 0;
    
    // ============================================================
    // MÉTODOS CORRETOS COM RESCALING (Wijnmalen 2007)
    // ============================================================
    
    // MÉTODO 1: Quotient of Sums (Eq. 12) - RECOMENDADO
    // Score = (sb×B + so×O) / (sc×C + sr×R)
    const numerator = (sb * B) + (so * O);
    const denominator = (sc * C) + (sr * R) + epsilon;
    const scoreQuotientSums = numerator / denominator;
    
    // MÉTODO 2: Additive with Subtraction (Eq. 17)
    // Score = vb×sb×B + vo×so×O - vc×sc×C - vr×sr×R
    const scoreAdditiveSubtraction = 
      (vb * sb * B) + (vo * so * O) - (vc * sc * C) - (vr * sr * R);
    
    // MÉTODO 3: Quotient of Products (Eq. 9) - NÃO RECOMENDADO
    // Score = (sb×B) × (so×O) / [(sc×C) × (sr×R)]
    const productNumerator = (sb * B) * (so * O);
    const productDenominator = (sc * C) * (sr * R) + epsilon;
    const scoreQuotientProducts = productNumerator / productDenominator;
    
    // ============================================================
    // MÉTODOS LEGADOS (manter para compatibilidade)
    // ============================================================
    
    const scoreAdditive = vb * B + vo * O + vc * (1 - C) + vr * (1 - R);
    const scoreProbabilistic = scoreAdditive;
    const scoreSubtractive = vb * B + vo * O - vc * C - vr * R;
    const scoreMultPowers = 
      (Math.pow(Math.max(B, epsilon), vb) * Math.pow(Math.max(O, epsilon), vo)) /
      (Math.pow(Math.max(C, epsilon), vc) * Math.pow(Math.max(R, epsilon), vr));
    const scoreMultSimple = (B * O + epsilon) / (C * R + epsilon);
    
    return {
      code: alt.code,
      name: alt.name,
      B, O, C, R,
      scoreQuotientSums,
      scoreAdditiveSubtraction,
      scoreQuotientProducts,
      scoreQuotientSumsNorm: 0,
      scoreAdditiveSubtractionNorm: 0,
      scoreQuotientProductsNorm: 0,
      scoreAdditive,
      scoreProbabilistic,
      scoreSubtractive,
      scoreSubtractiveNorm: 0,
      scoreMultPowers,
      scoreMultPowersNorm: 0,
      scoreMultSimple,
      scoreMultSimpleNorm: 0
    };
  });
  
  // Normalização
  const sumQuotientSums = scores.reduce((sum, s) => sum + s.scoreQuotientSums, 0) || 1;
  const valsAddSub = scores.map(s => s.scoreAdditiveSubtraction);
  const minAddSub = Math.min(...valsAddSub);
  const maxAddSub = Math.max(...valsAddSub);
  const rangeAddSub = maxAddSub - minAddSub || 1;
  const sumQuotientProducts = scores.reduce((sum, s) => sum + s.scoreQuotientProducts, 0) || 1;
  const minSubtractive = Math.min(...scores.map(s => s.scoreSubtractive));
  const maxSubtractive = Math.max(...scores.map(s => s.scoreSubtractive));
  const rangeSubtractive = maxSubtractive - minSubtractive || 1;
  const sumMultPowers = scores.reduce((sum, s) => sum + s.scoreMultPowers, 0) || 1;
  const sumMultSimple = scores.reduce((sum, s) => sum + s.scoreMultSimple, 0) || 1;
  
  scores.forEach(s => {
    s.scoreQuotientSumsNorm = s.scoreQuotientSums / sumQuotientSums;
    s.scoreAdditiveSubtractionNorm = (s.scoreAdditiveSubtraction - minAddSub) / rangeAddSub;
    s.scoreQuotientProductsNorm = s.scoreQuotientProducts / sumQuotientProducts;
    s.scoreSubtractiveNorm = (s.scoreSubtractive - minSubtractive) / rangeSubtractive;
    s.scoreMultPowersNorm = s.scoreMultPowers / sumMultPowers;
    s.scoreMultSimpleNorm = s.scoreMultSimple / sumMultSimple;
  });
  
  return scores;
}

// ============================================================
// ANÁLISE DE SENSIBILIDADE
// ============================================================

function calculateSensitivity(
  alternatives: { code: string; name: string }[],
  bocrWeights: number[],
  rescalingWeights: number[],  // ← ADICIONAR
  altScoresByMerit: Record<string, Record<string, number>>
): Record<string, number | null> {
  const inflections: Record<string, number | null> = {};
  
  MERITS.forEach((merit, meritIdx) => {
    let inflectionPoint: number | null = null;
    const currentScores = calculateAlternativeScores(alternatives, bocrWeights, rescalingWeights, altScoresByMerit);
    const currentRanking = [...currentScores].sort((a, b) => b.scoreQuotientSums - a.scoreQuotientSums);
    const currentWinner = currentRanking[0]?.code;
    
    for (let testWeight = 0; testWeight <= 100; testWeight += 1) {
      const testWeightDecimal = testWeight / 100;
      const remaining = 1 - testWeightDecimal;
      const otherWeightsSum = bocrWeights.reduce((sum, w, i) => i !== meritIdx ? sum + w : sum, 0) || 1;
      const testWeights = bocrWeights.map((w, i) => {
        if (i === meritIdx) return testWeightDecimal;
        return (w / otherWeightsSum) * remaining;
      });
      
      const testScores = calculateAlternativeScores(alternatives, testWeights, rescalingWeights, altScoresByMerit);
      const testRanking = [...testScores].sort((a, b) => b.scoreQuotientSums - a.scoreQuotientSums);
      const testWinner = testRanking[0]?.code;
      
      if (testWinner !== currentWinner && inflectionPoint === null) {
        inflectionPoint = testWeight;
        break;
      }
    }
    inflections[merit] = inflectionPoint;
  });
  
  return inflections;
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();
    if (!projectId) {
      return NextResponse.json({ success: false, error: 'projectId é obrigatório' }, { status: 400 });
    }
    
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      return NextResponse.json({ success: false, error: 'Projeto não encontrado' }, { status: 404 });
    }
    const project = projectDoc.data();
    const alternatives = project.alternatives || [];
    
    if (alternatives.length < 2) {
      return NextResponse.json({ success: false, error: 'Projeto precisa ter pelo menos 2 alternativas' }, { status: 400 });
    }
    
    const responsesQuery = query(collection(db, 'responses'), where('projectId', '==', projectId));
    const responsesSnapshot = await getDocs(responsesQuery);
    const completedResponses = responsesSnapshot.docs
      .map(docSnap => docSnap.data() as ResponseData)
      .filter(r => r.completedAt && r.judgments && r.judgments.length > 0);
    
    if (completedResponses.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nenhuma resposta completa encontrada. Aguarde os especialistas finalizarem.' 
      }, { status: 400 });
    }
    
    const responses = completedResponses;
    const responseCount = responses.length;
    console.log(`Processando ${responseCount} respostas para projeto ${projectId}`);
    
    // BOCR - Importância Relativa
    const bocrMatrix = aggregateMatrix(responses, 'bocr', 'BOCR', MERITS);
    const bocrEigenvector = calculateEigenvector(bocrMatrix);
    const bocrConsistency = calculateConsistency(bocrMatrix);
    console.log('Pesos BOCR (importância):', bocrEigenvector);
    console.log('CR BOCR:', bocrConsistency.cr);
    
    // 🆕 MAGNITUDE - Magnitude Absoluta
    const magnitudeMatrix = aggregateMatrix(responses, 'magnitude', 'MAGNITUDE', MERITS);
    const magnitudeEigenvector = calculateEigenvector(magnitudeMatrix);
    const magnitudeConsistency = calculateConsistency(magnitudeMatrix);
    console.log('Rescaling weights (magnitude):', magnitudeEigenvector);
    console.log('CR Magnitude:', magnitudeConsistency.cr);
    
    const rescalingWeights = magnitudeEigenvector;
    
    // Subcritérios
    const subWeights: Record<string, number[]> = {};
    const subConsistency: Record<string, { cr: number; lambda: number }> = {};
    for (const merit of MERITS) {
      const subItems = Array.from({ length: SUBCRITERIA_PER_MERIT }, (_, i) => `${merit}${i + 1}`);
      const subMatrix = aggregateMatrix(responses, 'subcriteria', merit, subItems);
      const subEigenvector = calculateEigenvector(subMatrix);
      const subCons = calculateConsistency(subMatrix);
      subWeights[merit] = subEigenvector;
      subConsistency[merit] = { cr: subCons.cr, lambda: subCons.lambda };
      console.log(`Pesos ${merit}:`, subEigenvector);
    }
    
    // Alternativas
    const altCodes = alternatives.map((a: any) => a.code);
    const altScores: Record<string, Record<string, number>> = {};
    const altScoresByMerit: Record<string, Record<string, number>> = { B: {}, O: {}, C: {}, R: {} };
    
    for (const merit of MERITS) {
      for (let subIdx = 0; subIdx < SUBCRITERIA_PER_MERIT; subIdx++) {
        const subCode = `${merit}${subIdx + 1}`;
        const altMatrix = aggregateMatrix(responses, 'alternatives', subCode, altCodes);
        const altEigenvector = calculateEigenvector(altMatrix);
        altScores[subCode] = {};
        alternatives.forEach((alt: any, i: number) => {
          altScores[subCode][alt.code] = altEigenvector[i] || 0;
        });
      }
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
    console.log('Scores por mérito:', altScoresByMerit);
    
    // Scores finais COM RESCALING
    const finalScores = calculateAlternativeScores(alternatives, bocrEigenvector, rescalingWeights, altScoresByMerit);
    console.log('Scores finais:', finalScores);
    
    // altMeritScores para compatibilidade
    const altMeritScores = alternatives.map((alt: any) => ({
      code: alt.code,
      name: alt.name,
      B: altScoresByMerit['B']?.[alt.code] || 0,
      O: altScoresByMerit['O']?.[alt.code] || 0,
      C: altScoresByMerit['C']?.[alt.code] || 0,
      R: altScoresByMerit['R']?.[alt.code] || 0
    }));
    
    // Sensibilidade
    const sensitivityInflections = calculateSensitivity(alternatives, bocrEigenvector, rescalingWeights, altScoresByMerit);
    
    // Resultado
    const calculationResult = {
      projectId,
      calculatedAt: new Date().toISOString(),
      responseCount,
      bocrWeights: bocrEigenvector,
      bocrConsistency: { cr: bocrConsistency.cr, ci: bocrConsistency.ci, lambda: bocrConsistency.lambda },
      rescalingWeights: { sb: rescalingWeights[0], so: rescalingWeights[1], sc: rescalingWeights[2], sr: rescalingWeights[3] },
      magnitudeConsistency: { cr: magnitudeConsistency.cr, ci: magnitudeConsistency.ci, lambda: magnitudeConsistency.lambda },
      subWeights,
      subConsistency,
      altScores,
      altMeritScores,
      finalScores,
      sensitivityInflections,
      metadata: {
        projectName: project.name,
        alternativesCount: alternatives.length,
        methodsCount: 8,
        version: '3.0',
        usesRescaling: true
      }
    };
    
    await setDoc(doc(db, 'calculations', projectId), calculationResult);
    console.log('Cálculo salvo com sucesso!');
    
    return NextResponse.json({
      success: true,
      message: `Cálculo concluído com ${responseCount} respostas (COM rescaling weights)`,
      calculation: calculationResult
    });
    
  } catch (error: any) {
    console.error('Erro no cálculo:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro interno no servidor' 
    }, { status: 500 });
  }
}
