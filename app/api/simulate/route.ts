// app/api/simulate/route.ts
// API de Simulação e QA Completo para Sistema AHP-BOCR
// Versão 6.0: ⭐ CR REALISTA baseado em literatura empírica (BPMSG, Lukinskiy, Frish, Ishizaka)

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { SUBCRITERIA, generateAllComparisons } from '@/lib/data';

// ============================================================
// CONSTANTES E TIPOS
// ============================================================

const EPSILON = 1e-10;
const RI: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
};

type SynthesisMethod = 'additive' | 'probabilistic' | 'subtractive' | 'multiplicative_power' | 'multiplicative_simple' | 'reciprocal';
type ResponsePattern = 'consistent' | 'random' | 'biased_benefits' | 'biased_costs' | 'moderate' | 'extreme';

// ⭐ NOVO: Tipo para modo de consistência (CR Realista)
type ModoConsistenciaCR = 'pessimista' | 'moderado' | 'especialista';

interface BOCRScores {
  B: number;
  O: number;
  C: number;
  R: number;
}

interface BOCRWeights {
  b: number;
  o: number;
  c: number;
  r: number;
}

interface ValidationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  expected?: any;
  actual?: any;
  message: string;
}

// ============================================================
// ⭐ NOVO: CONFIGURAÇÃO CR REALISTA (Baseado em Literatura Empírica)
// ============================================================
// Referências:
// - BPMSG (Goepel): ~100 respondentes, mediana CR=16%
// - Lukinskiy et al. (2021): 292 matrizes, distribuição Weibull
// - Frish et al. (2025): 21 oficiais seniores, mediana CR=8.6%
// - Ishizaka & Siraj (2018): 50 participantes, 18% aprovação

interface ParametrosWeibull {
  k: number;      // shape (forma)
  lambda: number; // scale (escala)
  crMax: number;  // CR máximo permitido (cap)
}

interface ConfiguracaoModoCR {
  nome: string;
  parametros: ParametrosWeibull;
  taxaAprovacaoEsperada: number;
  noiseLevel: number;      // Nível de ruído para perturbação
  inversionChance: number; // Probabilidade de inversão
}

const CONFIGURACAO_MODOS_CR: Record<ModoConsistenciaCR, ConfiguracaoModoCR> = {
  pessimista: {
    nome: 'Realista Pessimista (Não-Treinados)',
    parametros: {
      k: 1.35,      // shape - baseado em Lukinskiy et al.
      lambda: 0.216, // scale - calibrado para mediana ~16%
      crMax: 0.55   // Cap em 55%
    },
    taxaAprovacaoEsperada: 0.25,
    noiseLevel: 0.40,      // Alto ruído
    inversionChance: 0.15, // 15% chance de inversão
  },
  moderado: {
    nome: 'Realista Moderado (Orientados)',
    parametros: {
      k: 1.40,
      lambda: 0.142,
      crMax: 0.40
    },
    taxaAprovacaoEsperada: 0.45,
    noiseLevel: 0.25,      // Ruído moderado
    inversionChance: 0.08, // 8% chance de inversão
  },
  especialista: {
    nome: 'Especialistas Treinados',
    parametros: {
      k: 1.50,
      lambda: 0.092,
      crMax: 0.25
    },
    taxaAprovacaoEsperada: 0.65,
    noiseLevel: 0.12,      // Baixo ruído
    inversionChance: 0.03, // 3% chance de inversão
  }
};

// ⭐ Gera um valor aleatório seguindo distribuição Weibull
// Fórmula: X = λ * (-ln(U))^(1/k) onde U ~ Uniform(0,1)
function gerarWeibull(k: number, lambda: number): number {
  const u = Math.random();
  const uSafe = Math.max(u, 1e-10); // Evitar log(0)
  return lambda * Math.pow(-Math.log(uSafe), 1 / k);
}

// ⭐ Gera um CR realista baseado no modo de simulação
function gerarCRRealista(modo: ModoConsistenciaCR): number {
  const config = CONFIGURACAO_MODOS_CR[modo];
  const { k, lambda, crMax } = config.parametros;

  let cr = gerarWeibull(k, lambda);

  // Aplicar cap máximo
  cr = Math.min(cr, crMax);

  // Garantir valor mínimo positivo
  cr = Math.max(cr, 0.001);

  return cr;
}

// ⭐ Converter CR para fator de consistência interno (0-1)
// Mapeia CR para um fator que controla o ruído na geração de julgamentos
function crParaFatorConsistencia(cr: number): number {
  // CR baixo (0-5%) → alta consistência (0.95-1.0)
  // CR médio (5-15%) → consistência moderada (0.75-0.95)
  // CR alto (15-30%) → baixa consistência (0.50-0.75)
  // CR muito alto (>30%) → consistência muito baixa (0.30-0.50)

  if (cr <= 0.05) return 0.95 + (0.05 - cr) * 1.0;
  if (cr <= 0.15) return 0.75 + (0.15 - cr) * 2.0;
  if (cr <= 0.30) return 0.50 + (0.30 - cr) * 1.67;
  return Math.max(0.30, 0.50 - (cr - 0.30) * 1.0);
}

// ============================================================
// DADOS PARA GERAÇÃO DE PERFIS
// ============================================================

const NOMES_MASCULINOS = ['Carlos', 'João', 'Pedro', 'Lucas', 'Marcos', 'Rafael', 'André', 'Fernando', 'Ricardo', 'Bruno'];
const NOMES_FEMININOS = ['Ana', 'Maria', 'Juliana', 'Fernanda', 'Camila', 'Patricia', 'Luciana', 'Adriana', 'Renata', 'Carla'];
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes'];

const DISTRIBUICOES = {
  genero: { masculino: 0.78, feminino: 0.22 },
  idade: { menos_30: 0.12, '31_40': 0.38, '41_50': 0.35, mais_50: 0.15 },
  formacao: { superior: 0.25, especializacao: 0.38, mestrado: 0.28, doutorado: 0.09 },
  areaFormacao: { administracao: 0.12, engenharias: 0.58, logistica: 0.08, ti_sistemas: 0.12, ciencias_exatas: 0.07, outra: 0.03 },
  tempoTrabalho: { menos_10: 0.22, '11_20': 0.38, '21_30': 0.28, mais_30: 0.12 },
  tempoGestor: { nao_atua: 0.15, menos_10: 0.42, '11_20': 0.28, '21_30': 0.12, mais_30: 0.03 },
  areaAtuacao: { manufatura: 0.47, operacoes: 0.22, financeiro: 0.08, qualidade: 0.15, otimizacao_custos: 0.05, outro: 0.03 },
  funcao: { c_level: 0.05, diretor: 0.12, gerente: 0.60, supervisor: 0.23 },
};

// ============================================================
// FUNÇÕES MATEMÁTICAS AHP
// ============================================================

function calculateEigenvector(matrix: number[][]): number[] {
  const n = matrix.length;
  if (n === 0) return [];

  const geometricMeans = matrix.map(row => {
    const product = row.reduce((acc, val) => acc * Math.max(val, EPSILON), 1);
    return Math.pow(product, 1 / n);
  });

  const sum = geometricMeans.reduce((acc, val) => acc + val, 0);
  return geometricMeans.map(val => val / Math.max(sum, EPSILON));
}

function calculateConsistencyRatio(matrix: number[][]): { cr: number; lambda: number; ci: number } {
  const n = matrix.length;
  if (n <= 2) return { cr: 0, lambda: n, ci: 0 };

  const weights = calculateEigenvector(matrix);

  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    let rowSum = 0;
    for (let j = 0; j < n; j++) {
      rowSum += matrix[i][j] * weights[j];
    }
    if (weights[i] > EPSILON) {
      lambdaMax += rowSum / weights[i];
    }
  }
  lambdaMax /= n;

  const ci = (lambdaMax - n) / Math.max(n - 1, 1);
  const cr = ci / (RI[n] || 1.49);

  return { cr: Math.max(0, cr), lambda: lambdaMax, ci };
}

function buildMatrixFromJudgments(
  judgments: any[],
  type: string,
  group: string | null,
  items: string[]
): number[][] {
  const n = items.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));

  const itemIndex: Record<string, number> = {};
  items.forEach((item, idx) => { itemIndex[item] = idx; });

  const relevantJudgments = judgments.filter(j => {
    if (j.type !== type) return false;
    if (group !== null && j.group !== group) return false;
    return true;
  });

  relevantJudgments.forEach(j => {
    const i = itemIndex[j.itemA];
    const k = itemIndex[j.itemB];
    if (i === undefined || k === undefined) return;

    let value = j.saatyValue || 1;
    if (j.favors === 'B') value = 1 / value;

    matrix[i][k] = value;
    matrix[k][i] = 1 / value;
  });

  return matrix;
}

// Agregação por média geométrica (método padrão para grupos AHP)
function aggregateMatrices(matrices: number[][][]): number[][] {
  if (matrices.length === 0) return [];
  const n = matrices[0].length;
  const result: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let product = 1;
      matrices.forEach(m => { product *= m[i][j]; });
      result[i][j] = Math.pow(product, 1 / matrices.length);
    }
  }

  return result;
}

// ============================================================
// 5 FÓRMULAS DE SÍNTESE
// ============================================================

function calculateScore(scores: BOCRScores, weights: BOCRWeights, method: SynthesisMethod): number {
  const { B, O, C, R } = scores;
  const { b, o, c, r } = weights;

  switch (method) {
    // ============================================================
    // MÉTODOS DE SÍNTESE BOCR - Petrillo et al. (2023)
    // Ref: J. Risk Financial Manag. 2023, 16(8), 372
    // ============================================================

    // ⭐ PRINCIPAL - Subtrativo (Wijnmalen, 2007)
    // Score = b·B + o·O − c·C − r·R
    // Único com consenso total na literatura. Permite valores negativos.
    case 'subtractive':
      return b * B + o * O - c * C - r * R;

    // Eq.3 - Aditivo Residual (Demirtas & Ustun, 2008)
    // Score = b·B + o·O + c·(1−C) + r·(1−R)
    // Interpreta (1-C) como "benefício residual" de baixo custo
    case 'additive':
      return b * B + o * O + c * (1 - C) + r * (1 - R);

    // Eq.4 - Multiplicativo Potências (Saaty, 2001)
    // Score = B^b · O^o / C^c · R^r
    // Tradeoff exponencial entre positivos e negativos
    case 'multiplicative_power':
      const numerator = Math.pow(Math.max(B, EPSILON), b) * Math.pow(Math.max(O, EPSILON), o);
      const denominator = Math.pow(Math.max(C, EPSILON), c) * Math.pow(Math.max(R, EPSILON), r);
      return numerator / Math.max(denominator, EPSILON);

    // Eq.2 - Recíprocos (Saaty, 2001; Petrillo 2023)
    // Score = b·B + o·O + c·(1/C) + r·(1/R)
    // Usa inversão para transformar custos/riscos em "benefícios"
    case 'reciprocal':
      const invC = 1 / Math.max(C, EPSILON);
      const invR = 1 / Math.max(R, EPSILON);
      return b * B + o * O + c * invC + r * invR;

    // Probabilístico (normalizado) - variante do Aditivo
    case 'probabilistic':
      const totalWeight = b + o + c + r;
      const bn = b / totalWeight;
      const on = o / totalWeight;
      const cn = c / totalWeight;
      const rn = r / totalWeight;
      return bn * B + on * O + cn * (1 - C) + rn * (1 - R);

    // Multiplicativo Simples (razão direta sem pesos)
    // Score = (B · O) / (C · R)
    case 'multiplicative_simple':
      return (Math.max(B, EPSILON) * Math.max(O, EPSILON)) /
        (Math.max(C, EPSILON) * Math.max(R, EPSILON));

    default:
      return 0;
  }
}

// ============================================================
// GERAÇÃO DE DADOS SIMULADOS
// ============================================================

function selectByDistribution(distribution: Record<string, number>): string {
  const rand = Math.random();
  let cumulative = 0;
  for (const [key, prob] of Object.entries(distribution)) {
    cumulative += prob;
    if (rand <= cumulative) return key;
  }
  return Object.keys(distribution)[0];
}

function generateName(genero: string): string {
  const nomes = genero === 'feminino' ? NOMES_FEMININOS : NOMES_MASCULINOS;
  const nome = nomes[Math.floor(Math.random() * nomes.length)];
  const sobrenome1 = SOBRENOMES[Math.floor(Math.random() * SOBRENOMES.length)];
  const sobrenome2 = SOBRENOMES[Math.floor(Math.random() * SOBRENOMES.length)];
  return `${nome} ${sobrenome1} ${sobrenome2}`;
}

function generateAccessCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateVisitorId(): string {
  return Math.random().toString(36).substring(2, 14);
}

function generateRespondentProfile(index: number, projectId: string) {
  const genero = selectByDistribution(DISTRIBUICOES.genero);
  const nome = generateName(genero);
  const email = `simulado${index + 1}@teste.local`;
  const visitorId = generateVisitorId();

  const demographics = {
    nome,
    idade: selectByDistribution(DISTRIBUICOES.idade),
    genero: genero,
    formacao: selectByDistribution(DISTRIBUICOES.formacao),
    areaFormacao: selectByDistribution(DISTRIBUICOES.areaFormacao),
    tempoTrabalho: selectByDistribution(DISTRIBUICOES.tempoTrabalho),
    tempoGestor: selectByDistribution(DISTRIBUICOES.tempoGestor),
    areaAtuacao: selectByDistribution(DISTRIBUICOES.areaAtuacao),
    funcao: selectByDistribution(DISTRIBUICOES.funcao),
    submittedAt: new Date().toISOString(),
  };

  return {
    projectId,
    visitorId,
    email,
    accessCode: generateAccessCode(),
    status: 'completed',
    nome,
    demographics,
    invitedAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    isSimulated: true,
  };
}

// ============================================================
// GERADOR DE PESOS CONSISTENTES (Garante transitividade AHP)
// ============================================================

function generateConsistentWeights(
  pattern: ResponsePattern,
  alternatives: { code: string; name: string }[]
): Record<string, number[]> {

  const weights: Record<string, number[]> = {};

  const generateWeightVector = (size: number, bias?: 'first' | 'last' | 'uniform'): number[] => {
    let raw: number[];
    const baseExp = 3.0 + Math.random() * 0.5;

    switch (bias) {
      case 'first':
        raw = Array(size).fill(0).map((_, i) => {
          const base = Math.pow(baseExp, size - i - 1);
          const noise = (Math.random() - 0.3) * base * 0.5;
          return Math.max(0.5, base + noise);
        });
        break;
      case 'last':
        raw = Array(size).fill(0).map((_, i) => {
          const base = Math.pow(baseExp, i);
          const noise = (Math.random() - 0.3) * base * 0.5;
          return Math.max(0.5, base + noise);
        });
        break;
      case 'uniform':
        raw = Array(size).fill(0).map((_, i) => {
          const base = size - i + 1;
          const noise = (Math.random() - 0.5) * 2;
          return Math.max(1, base + noise);
        });
        break;
      default:
        raw = Array(size).fill(0).map(() => 1 + Math.random() * 8);
    }

    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map(w => w / sum);
  };

  // 1. Pesos BOCR (4 elementos: B, O, C, R)
  switch (pattern) {
    case 'biased_benefits':
      weights['bocr'] = generateWeightVector(4, 'first');
      break;
    case 'biased_costs':
      weights['bocr'] = generateWeightVector(4, 'last');
      break;
    case 'consistent':
      weights['bocr'] = generateWeightVector(4, 'first');
      break;
    case 'moderate':
      weights['bocr'] = generateWeightVector(4, 'uniform');
      break;
    default:
      weights['bocr'] = generateWeightVector(4);
  }

  // 1.5. Pesos MAGNITUDE
  switch (pattern) {
    case 'biased_benefits':
      weights['magnitude'] = generateWeightVector(4, 'first');
      break;
    case 'biased_costs':
      weights['magnitude'] = generateWeightVector(4, 'last');
      break;
    case 'consistent':
      const magnitudeRaw = [
        4 + Math.random() * 3,
        2 + Math.random() * 2,
        3 + Math.random() * 2,
        1 + Math.random() * 1.5
      ];
      const magnitudeSum = magnitudeRaw.reduce((a, b) => a + b, 0);
      weights['magnitude'] = magnitudeRaw.map(w => w / magnitudeSum);
      break;
    case 'moderate':
      weights['magnitude'] = generateWeightVector(4, 'uniform');
      break;
    default:
      weights['magnitude'] = generateWeightVector(4);
  }

  // 2. Pesos dos subcritérios (5 elementos cada: X1, X2, X3, X4, X5)
  ['B', 'O', 'C', 'R'].forEach(group => {
    if (pattern === 'consistent' || pattern === 'moderate') {
      weights[`sub_${group}`] = generateWeightVector(5, 'first');
    } else {
      weights[`sub_${group}`] = generateWeightVector(5);
    }
  });

  // 3. Pesos das alternativas (por subcritério)
  const numAlts = alternatives.length;
  if (numAlts >= 2) {
    SUBCRITERIA.forEach((sub, idx) => {
      const favorsFirst = (idx % 3 !== 0) ? Math.random() > 0.4 : Math.random() > 0.6;
      const intensityRandom = Math.random();
      let altWeights: number[];

      if (intensityRandom < 0.3) {
        altWeights = favorsFirst
          ? [5 + Math.random() * 2, 1]
          : [1, 5 + Math.random() * 2];
      } else if (intensityRandom < 0.7) {
        altWeights = favorsFirst
          ? [2 + Math.random() * 2, 1]
          : [1, 2 + Math.random() * 2];
      } else {
        altWeights = favorsFirst
          ? [1.2 + Math.random() * 0.8, 1]
          : [1, 1.2 + Math.random() * 0.8];
      }

      const sum = altWeights.reduce((a, b) => a + b, 0);
      const normalizedWeights = altWeights.map(w => w / sum);

      if (sub.group === 'C' || sub.group === 'R') {
        weights[`alt_${sub.code}`] = normalizedWeights.reverse();
      } else {
        weights[`alt_${sub.code}`] = normalizedWeights;
      }
    });
  }

  return weights;
}

// ⭐ MODIFICADO: generateJudgment agora aceita configuração de modo CR
function generateJudgment(
  comparison: { type: string; group: string; itemA: string; itemB: string },
  pattern: ResponsePattern,
  modoConfig: ConfiguracaoModoCR,  // ⭐ NOVO: Recebe configuração do modo
  precomputedWeights?: Record<string, number[]>
): { saatyValue: number; favors: 'A' | 'B' | 'equal'; rawSlider: number } {

  // Usar noiseLevel e inversionChance do modo de consistência
  const { noiseLevel, inversionChance } = modoConfig;

  if (precomputedWeights) {
    const key = comparison.type === 'bocr' ? 'bocr' :
      comparison.type === 'magnitude' ? 'magnitude' :
        comparison.type === 'subcriteria' ? `sub_${comparison.group}` :
          `alt_${comparison.group}`;

    const weights = precomputedWeights[key];
    if (weights) {
      let idxA = -1;
      let idxB = -1;

      if (comparison.type === 'bocr' || comparison.type === 'magnitude') {
        const bocrItems = ['B', 'O', 'C', 'R'];
        idxA = bocrItems.indexOf(comparison.itemA);
        idxB = bocrItems.indexOf(comparison.itemB);
      } else if (comparison.type === 'subcriteria') {
        const subItems = ['1', '2', '3', '4', '5'].map(n => comparison.group + n);
        idxA = subItems.indexOf(comparison.itemA);
        idxB = subItems.indexOf(comparison.itemB);
      } else {
        const extractIndex = (item: string): number => {
          const num = parseInt(item.replace(/\D/g, ''));
          if (!isNaN(num) && num > 0) return num - 1;
          const match = item.match(/[A-Za-z]$/);
          if (match) {
            const letter = match[0].toUpperCase();
            return letter.charCodeAt(0) - 'A'.charCodeAt(0);
          }
          return 0;
        };

        idxA = extractIndex(comparison.itemA);
        idxB = extractIndex(comparison.itemB);

        if (idxA >= weights.length) idxA = 0;
        if (idxB >= weights.length) idxB = Math.min(1, weights.length - 1);
      }

      if (idxA >= 0 && idxB >= 0 && idxA < weights.length && idxB < weights.length && weights[idxA] && weights[idxB]) {
        const ratio = weights[idxA] / weights[idxB];

        let saatyValue: number;
        let favorA: boolean;

        if (ratio >= 1) {
          favorA = true;
          saatyValue = Math.round(ratio);
        } else {
          favorA = false;
          saatyValue = Math.round(1 / ratio);
        }

        // ⭐ MODIFICADO: Usar noiseLevel do modo de consistência
        // Ajustar também baseado no padrão de resposta
        const patternNoiseMod = pattern === 'consistent' ? 0.3 :
          pattern === 'moderate' ? 0.6 :
            pattern === 'random' ? 2.5 : 1.0;

        const effectiveNoiseLevel = noiseLevel * patternNoiseMod;
        const noise = (Math.random() - 0.5) * effectiveNoiseLevel * saatyValue;
        saatyValue = Math.max(1, Math.min(9, Math.round(saatyValue + noise)));

        // ⭐ MODIFICADO: Usar inversionChance do modo de consistência
        const patternInversionMod = pattern === 'consistent' ? 0.2 :
          pattern === 'moderate' ? 0.6 :
            pattern === 'extreme' ? 1.5 :
              pattern === 'random' ? 6.0 : 1.0;

        const effectiveInversionChance = inversionChance * patternInversionMod;

        if (Math.random() < effectiveInversionChance) {
          favorA = !favorA;
        }

        if (saatyValue === 1) {
          return { saatyValue: 1, favors: 'equal', rawSlider: 0 };
        }

        const rawSlider = favorA ? saatyValue - 1 : -(saatyValue - 1);
        return { saatyValue, favors: favorA ? 'A' : 'B', rawSlider };
      }
    }
  }

  // Fallback para lógica original
  let baseValue: number;
  let favorA: boolean;

  switch (pattern) {
    case 'consistent':
      if (comparison.type === 'bocr') {
        const bocrOrder = { B: 4, O: 3, C: 2, R: 1 };
        const orderA = bocrOrder[comparison.itemA as keyof typeof bocrOrder] || 0;
        const orderB = bocrOrder[comparison.itemB as keyof typeof bocrOrder] || 0;
        favorA = orderA > orderB;
        baseValue = Math.abs(orderA - orderB) * 2 + 1;
      } else if (comparison.type === 'subcriteria') {
        const numA = parseInt(comparison.itemA.slice(1)) || 0;
        const numB = parseInt(comparison.itemB.slice(1)) || 0;
        favorA = numA < numB;
        baseValue = Math.abs(numA - numB) + 1;
      } else {
        let altA = parseInt(comparison.itemA.replace(/\D/g, '')) || 0;
        let altB = parseInt(comparison.itemB.replace(/\D/g, '')) || 0;

        if (altA === 0 && altB === 0) {
          altA = comparison.itemA.localeCompare(comparison.itemB);
          altB = 0;
        }

        const subGroup = SUBCRITERIA.find(s => s.code === comparison.group)?.group;
        const invertido = subGroup === 'C' || subGroup === 'R';

        if (altA === altB) {
          favorA = comparison.itemA < comparison.itemB;
          baseValue = 2 + Math.floor(Math.random() * 3);
        } else {
          favorA = invertido ? altA > altB : altA < altB;
          baseValue = Math.abs(altA - altB) * 2 + 1;
        }
      }
      baseValue = Math.max(1, Math.min(9, baseValue + Math.floor(Math.random() * 3) - 1));
      break;

    case 'random':
      baseValue = Math.floor(Math.random() * 9) + 1;
      favorA = Math.random() > 0.5;
      break;

    case 'biased_benefits':
      if (comparison.type === 'bocr') {
        favorA = comparison.itemA === 'B' || comparison.itemA === 'O';
        baseValue = favorA ? 7 : 3;
      } else {
        baseValue = Math.floor(Math.random() * 5) + 3;
        favorA = Math.random() > 0.5;
      }
      break;

    case 'biased_costs':
      if (comparison.type === 'bocr') {
        favorA = comparison.itemA === 'C' || comparison.itemA === 'R';
        baseValue = favorA ? 7 : 3;
      } else {
        baseValue = Math.floor(Math.random() * 5) + 3;
        favorA = Math.random() > 0.5;
      }
      break;

    case 'moderate':
      baseValue = Math.floor(Math.random() * 3) + 1;
      favorA = Math.random() > 0.5;
      break;

    case 'extreme':
      baseValue = Math.floor(Math.random() * 3) + 7;
      favorA = Math.random() > 0.5;
      break;

    default:
      baseValue = 1;
      favorA = true;
  }

  // ⭐ MODIFICADO: Usar inversionChance do modo
  if (Math.random() < inversionChance && pattern !== 'random') {
    favorA = !favorA;
  }

  const saatyValue = Math.max(1, Math.min(9, baseValue));

  if (saatyValue === 1) {
    return { saatyValue: 1, favors: 'equal', rawSlider: 0 };
  }

  const rawSlider = favorA ? saatyValue - 1 : -(saatyValue - 1);

  return {
    saatyValue,
    favors: favorA ? 'A' : 'B',
    rawSlider,
  };
}

// ============================================================
// ⭐ CALCULAR CRs INDIVIDUAIS DO RESPONDENTE
// ============================================================

function calculateIndividualCRs(judgments: any[]): {
  bocrConsistency: { cr: number; lambda: number; ci: number };
  subConsistency: Record<string, { cr: number; lambda: number; ci: number }>;
  bocrWeights: number[];
  subWeights: Record<string, number[]>;
} {
  // 1. Matriz BOCR do respondente
  const bocrMatrix = buildMatrixFromJudgments(judgments, 'bocr', null, ['B', 'O', 'C', 'R']);
  const bocrConsistency = calculateConsistencyRatio(bocrMatrix);
  const bocrWeights = calculateEigenvector(bocrMatrix);

  // 2. Matrizes de subcritérios do respondente
  const subConsistency: Record<string, { cr: number; lambda: number; ci: number }> = {};
  const subWeights: Record<string, number[]> = {};

  ['B', 'O', 'C', 'R'].forEach(merit => {
    const subs = SUBCRITERIA.filter(s => s.group === merit).map(s => s.code);
    if (subs.length > 1) {
      const subMatrix = buildMatrixFromJudgments(judgments, 'subcriteria', merit, subs);
      const { cr, lambda, ci } = calculateConsistencyRatio(subMatrix);
      subConsistency[merit] = { cr, lambda, ci };
      subWeights[merit] = calculateEigenvector(subMatrix);
    } else {
      subConsistency[merit] = { cr: 0, lambda: 1, ci: 0 };
      subWeights[merit] = [1];
    }
  });

  return { bocrConsistency, subConsistency, bocrWeights, subWeights };
}

// ============================================================
// ⭐ MODIFICADO: generateResponse agora usa modo de consistência
// ============================================================

function generateResponse(
  respondentId: string,
  visitorId: string,
  projectId: string,
  alternatives: { code: string; name: string; description?: string }[],
  pattern: ResponsePattern,
  modoConsistencia: ModoConsistenciaCR  // ⭐ MODIFICADO: Recebe modo ao invés de consistencyFactor
) {
  const modoConfig = CONFIGURACAO_MODOS_CR[modoConsistencia];

  const altsWithDesc = alternatives.map(a => ({
    code: a.code,
    name: a.name,
    description: a.description || '',
  }));
  const comparisons = generateAllComparisons(altsWithDesc);

  const precomputedWeights = pattern !== 'random'
    ? generateConsistentWeights(pattern, alternatives)
    : undefined;

  // ⭐ MODIFICADO: Passa modoConfig ao invés de consistencyFactor
  const judgments = comparisons.map(comp => ({
    ...comp,
    ...generateJudgment(comp, pattern, modoConfig, precomputedWeights),
  }));

  // Calcular CRs individuais deste respondente
  const { bocrConsistency, subConsistency, bocrWeights, subWeights } = calculateIndividualCRs(judgments);

  // Calcular CR médio (média dos CRs de todas as 5 matrizes)
  const allCRs = [
    bocrConsistency.cr,
    subConsistency.B?.cr || 0,
    subConsistency.O?.cr || 0,
    subConsistency.C?.cr || 0,
    subConsistency.R?.cr || 0,
  ];
  const validCRs = allCRs.filter(cr => cr >= 0);
  const avgCR = validCRs.length > 0 ? validCRs.reduce((a, b) => a + b, 0) / validCRs.length : 0;

  // Gerar tempo de resposta simulado (5-25 minutos)
  const duration = Math.floor(300 + Math.random() * 1200);

  return {
    projectId,
    respondentId,
    visitorId,
    judgments,
    currentIndex: comparisons.length,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    duration,
    isSimulated: true,
    modoConsistencia, // ⭐ NOVO: Salvar modo usado

    // Estrutura responses igual a respondente real
    responses: {
      bocrConsistency: {
        cr: bocrConsistency.cr,
        lambda: bocrConsistency.lambda,
        ci: bocrConsistency.ci,
      },
      subConsistency: {
        B: { cr: subConsistency.B?.cr || 0, lambda: subConsistency.B?.lambda || 0 },
        O: { cr: subConsistency.O?.cr || 0, lambda: subConsistency.O?.lambda || 0 },
        C: { cr: subConsistency.C?.cr || 0, lambda: subConsistency.C?.lambda || 0 },
        R: { cr: subConsistency.R?.cr || 0, lambda: subConsistency.R?.lambda || 0 },
      },
      bocrWeights,
      subWeights,
      avgCR,
    },
  };
}

// ============================================================
// CÁLCULO COMPLETO AHP-BOCR (agregado de todos os respondentes)
// ============================================================

function performFullAHPCalculation(
  allJudgments: any[][],
  alternatives: { code: string; name: string }[]
): {
  bocrWeights: number[];
  bocrConsistency: { cr: number; lambda: number; ci: number };
  subWeights: Record<string, number[]>;
  subConsistency: Record<string, { cr: number; lambda: number }>;
  altScores: Record<string, Record<string, number>>;
  finalScores: {
    code: string;
    name: string;
    B: number;
    O: number;
    C: number;
    R: number;
    // Métodos principais - Petrillo et al. (2023)
    scoreSubtractive: number;        // Wijnmalen (2007) - CONSENSO
    scoreAdditive: number;           // Eq.3 - Aditivo Residual
    scoreMultPowers: number;         // Eq.4 - Multiplicativo Potências
    scoreReciprocal: number;         // Eq.2 - Recíprocos
    // Aliases e compatibilidade
    scoreAdditiveResidual: number;   // Alias para scoreAdditive
    scoreProbabilistic: number;      // Mantido para compatibilidade
    scoreMultSimple: number;         // Mantido para compatibilidade
    // Normalizados
    scoreSubtractiveNorm: number;
    scoreAdditiveResidualNorm: number;
    scoreMultPowersNorm: number;
    scoreReciprocalNorm: number;
    scoreMultSimpleNorm: number;
    scores: Record<string, number>;
  }[];
  sensitivityInflections: Record<string, number | null>;
} {
  // 1. Agregar matrizes BOCR
  const bocrMatrices = allJudgments.map(j => buildMatrixFromJudgments(j, 'bocr', null, ['B', 'O', 'C', 'R']));
  const aggregatedBOCR = aggregateMatrices(bocrMatrices);
  const bocrWeights = calculateEigenvector(aggregatedBOCR);
  const bocrConsistency = calculateConsistencyRatio(aggregatedBOCR);

  // 2. Calcular pesos dos subcritérios
  const subWeights: Record<string, number[]> = {};
  const subConsistency: Record<string, { cr: number; lambda: number }> = {};

  ['B', 'O', 'C', 'R'].forEach(merit => {
    const subs = SUBCRITERIA.filter(s => s.group === merit).map(s => s.code);
    if (subs.length > 1) {
      const subMatrices = allJudgments.map(j => buildMatrixFromJudgments(j, 'subcriteria', merit, subs));
      const aggregatedSub = aggregateMatrices(subMatrices);
      subWeights[merit] = calculateEigenvector(aggregatedSub);
      const { cr, lambda } = calculateConsistencyRatio(aggregatedSub);
      subConsistency[merit] = { cr, lambda };
    } else {
      subWeights[merit] = [1];
      subConsistency[merit] = { cr: 0, lambda: 1 };
    }
  });

  // 3. Calcular scores das alternativas
  const altScores: Record<string, Record<string, number>> = {};
  const altCodes = alternatives.map(a => a.code);

  SUBCRITERIA.forEach(sub => {
    const altMatrices = allJudgments.map(j => buildMatrixFromJudgments(j, 'alternatives', sub.code, altCodes));
    const aggregatedAlt = aggregateMatrices(altMatrices);
    const scores = calculateEigenvector(aggregatedAlt);
    altScores[sub.code] = {};
    altCodes.forEach((code, idx) => {
      altScores[sub.code][code] = scores[idx] || 0;
    });
  });

  // 4. Calcular scores finais BOCR
  const finalScores = alternatives.map(alt => {
    let B = 0, O = 0, C = 0, R = 0;

    ['B', 'O', 'C', 'R'].forEach((merit, mIdx) => {
      const subs = SUBCRITERIA.filter(s => s.group === merit);
      let meritScore = 0;

      subs.forEach((sub, sIdx) => {
        const localWeight = subWeights[merit]?.[sIdx] || 0;
        const altScore = altScores[sub.code]?.[alt.code] || 0;
        meritScore += localWeight * altScore;
      });

      if (merit === 'B') B = meritScore;
      if (merit === 'O') O = meritScore;
      if (merit === 'C') C = meritScore;
      if (merit === 'R') R = meritScore;
    });

    const bocrScores: BOCRScores = { B, O, C, R };
    const bocrW: BOCRWeights = {
      b: bocrWeights[0] || 0,
      o: bocrWeights[1] || 0,
      c: bocrWeights[2] || 0,
      r: bocrWeights[3] || 0
    };

    // ============================================================
    // MÉTODOS DE SÍNTESE BOCR - Petrillo et al. (2023)
    // Ref: J. Risk Financial Manag. 2023, 16(8), 372
    // ============================================================

    // ⭐ PRINCIPAL - Subtrativo (Wijnmalen, 2007)
    const scoreSubtractive = calculateScore(bocrScores, bocrW, 'subtractive');

    // Eq.3 - Aditivo Residual (Demirtas & Ustun, 2008)
    const scoreAdditive = calculateScore(bocrScores, bocrW, 'additive');

    // Eq.4 - Multiplicativo Potências (Saaty, 2001)
    const scoreMultPowers = calculateScore(bocrScores, bocrW, 'multiplicative_power');

    // Eq.2 - Recíprocos (Saaty, 2001)
    const scoreReciprocal = calculateScore(bocrScores, bocrW, 'reciprocal');

    // Métodos auxiliares (para compatibilidade)
    const scoreProbabilistic = calculateScore(bocrScores, bocrW, 'probabilistic');
    const scoreMultSimple = calculateScore(bocrScores, bocrW, 'multiplicative_simple');

    return {
      code: alt.code,
      name: alt.name,
      B, O, C, R,
      // ============================================================
      // SCORES DOS 4 MÉTODOS PRINCIPAIS (Petrillo et al., 2023)
      // ============================================================
      scoreSubtractive,           // ⭐ PRINCIPAL - Wijnmalen (2007)
      scoreAdditiveResidual: scoreAdditive, // Eq.3 - Demirtas & Ustun (2008)
      scoreMultPowers,            // Eq.4 - Saaty (2001)
      scoreReciprocal,            // Eq.2 - Saaty (2001)

      // Valores para normalização
      scoreAdditive,
      scoreProbabilistic,
      scoreSubtractiveNorm: scoreSubtractive,
      scoreAdditiveResidualNorm: scoreAdditive,
      scoreMultPowersNorm: scoreMultPowers,
      scoreReciprocalNorm: scoreReciprocal,
      scoreMultSimple,
      scoreMultSimpleNorm: scoreMultSimple,

      scores: {
        subtractive: scoreSubtractive,
        additive: scoreAdditive,
        additiveResidual: scoreAdditive,
        multiplicative_power: scoreMultPowers,
        reciprocal: scoreReciprocal,
        probabilistic: scoreProbabilistic,
        multiplicative_simple: scoreMultSimple,
      }
    };
  });

  // ============================================================
  // 5. NORMALIZAÇÃO DOS SCORES
  // ============================================================
  // - Subtrativo: Min-Max [0,1] (pode ser negativo)
  // - Demais: Modo Distributivo (Σ=1)
  // ============================================================

  const sumAdditive = finalScores.reduce((s, f) => s + f.scoreAdditive, 0);
  const sumProbabilistic = finalScores.reduce((s, f) => s + f.scoreProbabilistic, 0);
  const sumMultPowers = finalScores.reduce((s, f) => s + f.scoreMultPowersNorm, 0);
  const sumReciprocal = finalScores.reduce((s, f) => s + (f.scoreReciprocal || 0), 0);
  const sumMultSimple = finalScores.reduce((s, f) => s + f.scoreMultSimpleNorm, 0);

  // Min-Max para Subtrativo (único que pode ser negativo)
  const subtractiveValues = finalScores.map(f => f.scores.subtractive);
  const minSub = Math.min(...subtractiveValues);
  const maxSub = Math.max(...subtractiveValues);
  const rangeSub = maxSub - minSub || 1;

  finalScores.forEach(f => {
    // Normalização distributiva (Σ=1)
    if (sumAdditive > 0) f.scoreAdditive /= sumAdditive;
    if (sumProbabilistic > 0) f.scoreProbabilistic /= sumProbabilistic;
    if (sumMultPowers > 0) f.scoreMultPowersNorm /= sumMultPowers;
    if (sumReciprocal > 0) f.scoreReciprocalNorm = (f.scoreReciprocal || 0) / sumReciprocal;
    if (sumMultSimple > 0) f.scoreMultSimpleNorm /= sumMultSimple;

    // Min-Max para Subtrativo (mantém valor bruto também)
    f.scoreSubtractiveNorm = (f.scores.subtractive - minSub) / rangeSub;

    // Atualizar sinônimos normalizados
    f.scores.additive = f.scoreAdditive;
    f.scores.probabilistic = f.scoreProbabilistic;
    f.scoreAdditiveResidual = f.scoreAdditive;
    f.scoreAdditiveResidualNorm = f.scoreAdditive;
  });

  // ============================================================
  // ANÁLISE DE SENSIBILIDADE - VARREDURA COMPLETA
  // Usa o método SUBTRATIVO como base (consenso na literatura)
  // Varre de 0% a 100% para encontrar QUALQUER inversão
  // ============================================================

  const MERITS = ['B', 'O', 'C', 'R'];
  const sensitivityInflections: Record<string, number | null> = {};

  // Função para calcular score subtrativo com pesos personalizados
  const calcSubtractiveScore = (alt: typeof finalScores[0], weights: number[]) => {
    return weights[0] * alt.B + weights[1] * alt.O - weights[2] * alt.C - weights[3] * alt.R;
  };

  // Função para encontrar vencedor com determinados pesos
  const getWinner = (weights: number[]): string => {
    let maxScore = -Infinity;
    let winner = '';
    finalScores.forEach(alt => {
      const score = calcSubtractiveScore(alt, weights);
      if (score > maxScore) {
        maxScore = score;
        winner = alt.code;
      }
    });
    return winner;
  };

  // Função para criar pesos de teste mantendo proporcionalidade
  const makeTestWeights = (meritIdx: number, targetWeight: number): number[] => {
    const remaining = 1 - targetWeight;
    const otherWeightsSum = bocrWeights.reduce(
      (sum, w, i) => i !== meritIdx ? sum + w : sum, 0
    ) || 0.0001;

    return bocrWeights.map((w, i) => {
      if (i === meritIdx) return targetWeight;
      return remaining > 0 ? (w / otherWeightsSum) * remaining : 0;
    });
  };

  // Calcular ponto de inflexão para cada mérito - VARREDURA COMPLETA
  MERITS.forEach((merit, meritIdx) => {
    const currentWinner = getWinner(bocrWeights);
    let inflectionPoint: number | null = null;

    // Varredura de 0% a 100% em passos de 1%
    for (let testWeight = 0; testWeight <= 100; testWeight += 1) {
      const testWeights = makeTestWeights(meritIdx, testWeight / 100);
      const testWinner = getWinner(testWeights);

      // Encontrar primeiro ponto onde o vencedor muda
      if (testWinner !== currentWinner) {
        inflectionPoint = testWeight;
        break;
      }
    }

    sensitivityInflections[merit] = inflectionPoint;
  });

  return {
    bocrWeights,
    bocrConsistency,
    subWeights,
    subConsistency,
    altScores,
    finalScores,
    sensitivityInflections,
  };
}

// ============================================================
// VALIDAÇÃO MATEMÁTICA
// ============================================================

function runValidationTests(calculation: ReturnType<typeof performFullAHPCalculation>): ValidationResult[] {
  const results: ValidationResult[] = [];

  // 1. Soma dos pesos BOCR
  const sumBOCR = calculation.bocrWeights.reduce((a, b) => a + b, 0);
  results.push({
    test: 'Soma dos pesos BOCR = 1',
    status: Math.abs(sumBOCR - 1) < 0.001 ? 'PASS' : 'FAIL',
    expected: 1,
    actual: sumBOCR.toFixed(6),
    message: `Soma = ${sumBOCR.toFixed(6)}`,
  });

  // 2. CR BOCR ≤ 10%
  results.push({
    test: 'CR BOCR ≤ 10%',
    status: calculation.bocrConsistency.cr <= 0.10 ? 'PASS' : calculation.bocrConsistency.cr <= 0.15 ? 'WARN' : 'FAIL',
    expected: '≤ 10%',
    actual: (calculation.bocrConsistency.cr * 100).toFixed(2) + '%',
    message: `CR = ${(calculation.bocrConsistency.cr * 100).toFixed(2)}%`,
  });

  // 3. Pesos positivos
  const allPositive = calculation.bocrWeights.every(w => w >= 0);
  results.push({
    test: 'Pesos BOCR positivos',
    status: allPositive ? 'PASS' : 'FAIL',
    expected: 'Todos ≥ 0',
    actual: calculation.bocrWeights.map(w => w.toFixed(4)).join(', '),
    message: allPositive ? 'Todos positivos' : 'Pesos negativos encontrados',
  });

  // 4. Soma pesos subcritérios
  ['B', 'O', 'C', 'R'].forEach(merit => {
    const sum = calculation.subWeights[merit]?.reduce((a, b) => a + b, 0) || 0;
    results.push({
      test: `Soma pesos ${merit} = 1`,
      status: Math.abs(sum - 1) < 0.001 ? 'PASS' : 'FAIL',
      expected: 1,
      actual: sum.toFixed(6),
      message: `Soma = ${sum.toFixed(6)}`,
    });
  });

  // 5. CR subcritérios
  ['B', 'O', 'C', 'R'].forEach(merit => {
    const cr = calculation.subConsistency[merit]?.cr || 0;
    results.push({
      test: `CR ${merit} ≤ 10%`,
      status: cr <= 0.10 ? 'PASS' : cr <= 0.15 ? 'WARN' : 'FAIL',
      expected: '≤ 10%',
      actual: (cr * 100).toFixed(2) + '%',
      message: `CR = ${(cr * 100).toFixed(2)}%`,
    });
  });

  // 6. Soma scores alternativas
  const sumScores = calculation.finalScores.reduce((s, f) => s + f.scoreAdditive, 0);
  results.push({
    test: 'Soma scores alternativas (Aditivo) = 1',
    status: Math.abs(sumScores - 1) < 0.01 ? 'PASS' : 'WARN',
    expected: 1,
    actual: sumScores.toFixed(6),
    message: `Soma = ${sumScores.toFixed(6)}`,
  });

  return results;
}

// ============================================================
// POST - EXECUTAR SIMULAÇÃO
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const {
      projectId,
      count = 10,
      pattern = 'mixed',
      modoConsistencia = 'moderado', // ⭐ NOVO: Modo de consistência baseado em literatura
      consistencyFactor,              // ⭐ DEPRECATED: Mantido para retrocompatibilidade
      runValidation = true,
      clearExisting = false,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 });
    }

    // ⭐ Validar modo de consistência
    const modoValido: ModoConsistenciaCR = ['pessimista', 'moderado', 'especialista'].includes(modoConsistencia)
      ? modoConsistencia
      : 'moderado';

    const modoConfig = CONFIGURACAO_MODOS_CR[modoValido];

    const numResponses = Math.min(Math.max(1, count), 100);

    // Buscar projeto
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    const alternatives = projectData.alternatives || [];

    if (alternatives.length < 2) {
      return NextResponse.json({ error: 'Projeto precisa de pelo menos 2 alternativas' }, { status: 400 });
    }

    // Limpar dados existentes se solicitado
    if (clearExisting) {
      const existingResponses = await getDocs(query(collection(db, 'responses'), where('projectId', '==', projectId)));
      const existingRespondents = await getDocs(query(collection(db, 'respondents'), where('projectId', '==', projectId)));

      const deletePromises: Promise<void>[] = [];
      existingResponses.forEach(doc => deletePromises.push(deleteDoc(doc.ref)));
      existingRespondents.forEach(doc => deletePromises.push(deleteDoc(doc.ref)));
      await Promise.all(deletePromises);
    }

    // Inicializar resultados
    const results = {
      respondentsCreated: 0,
      responsesCreated: 0,
      patternDistribution: {} as Record<string, number>,
      demographicsGenerated: 0,
      // Rastrear CRs individuais
      individualCRs: [] as { id: string; avgCR: number; crBOCR: number; crB: number; crO: number; crC: number; crR: number; status: string }[],
    };

    const allJudgments: any[][] = [];

    // ============================================================
    // FASE 1: GERAR DADOS SIMULADOS
    // ============================================================

    for (let i = 0; i < numResponses; i++) {
      const profile = generateRespondentProfile(i, projectId);
      const respondentRef = await addDoc(collection(db, 'respondents'), profile);
      results.respondentsCreated++;
      results.demographicsGenerated++;

      let responsePattern: ResponsePattern;
      if (pattern === 'mixed') {
        const rand = Math.random();
        if (rand < 0.40) responsePattern = 'consistent';
        else if (rand < 0.55) responsePattern = 'moderate';
        else if (rand < 0.70) responsePattern = 'biased_benefits';
        else if (rand < 0.80) responsePattern = 'biased_costs';
        else if (rand < 0.90) responsePattern = 'extreme';
        else responsePattern = 'random';
      } else {
        responsePattern = pattern as ResponsePattern;
      }

      results.patternDistribution[responsePattern] = (results.patternDistribution[responsePattern] || 0) + 1;

      // ⭐ MODIFICADO: Passa modoConsistencia ao invés de consistencyFactor
      const response = generateResponse(
        respondentRef.id,
        profile.visitorId,
        projectId,
        alternatives,
        responsePattern,
        modoValido  // ⭐ NOVO: Usa modo validado
      );

      await addDoc(collection(db, 'responses'), response);
      results.responsesCreated++;
      allJudgments.push(response.judgments);

      // Rastrear CRs individuais
      const avgCR = response.responses.avgCR;
      let status = 'CONFIÁVEL';
      if (avgCR > 0.20) status = 'CRÍTICO';
      else if (avgCR > 0.15) status = 'SUSPEITO';
      else if (avgCR > 0.10) status = 'REVISAR';

      results.individualCRs.push({
        id: respondentRef.id.slice(0, 10) + '...',
        avgCR: Math.round(avgCR * 10000) / 100,
        crBOCR: Math.round(response.responses.bocrConsistency.cr * 10000) / 100,
        crB: Math.round((response.responses.subConsistency.B?.cr || 0) * 10000) / 100,
        crO: Math.round((response.responses.subConsistency.O?.cr || 0) * 10000) / 100,
        crC: Math.round((response.responses.subConsistency.C?.cr || 0) * 10000) / 100,
        crR: Math.round((response.responses.subConsistency.R?.cr || 0) * 10000) / 100,
        status,
      });
    }

    // ============================================================
    // FASE 2: EXECUTAR CÁLCULO COMPLETO AHP-BOCR
    // ============================================================

    const calculation = performFullAHPCalculation(allJudgments, alternatives);

    // ============================================================
    // FASE 3: SALVAR CÁLCULO NO FIREBASE
    // ============================================================

    await setDoc(doc(db, 'calculations', projectId), {
      ...calculation,
      calculatedAt: new Date().toISOString(),
      responseCount: numResponses,
      isSimulated: true,
      modoConsistencia: modoValido, // ⭐ NOVO: Salvar modo usado
    });

    // Atualizar projeto
    await updateDoc(doc(db, 'projects', projectId), {
      responseCount: (projectData.responseCount || 0) + results.responsesCreated,
      status: 'calculated',
      calculatedAt: new Date().toISOString(),
    });

    // ============================================================
    // FASE 4: VALIDAÇÃO MATEMÁTICA
    // ============================================================

    let validation: ValidationResult[] = [];
    let qaReport = null;

    if (runValidation) {
      validation = runValidationTests(calculation);

      const passed = validation.filter(v => v.status === 'PASS').length;
      const failed = validation.filter(v => v.status === 'FAIL').length;
      const warned = validation.filter(v => v.status === 'WARN').length;

      qaReport = {
        summary: {
          total: validation.length,
          passed,
          failed,
          warned,
          status: failed === 0 ? (warned === 0 ? '✅ TODOS OS TESTES PASSARAM' : '⚠️ PASSOU COM AVISOS') : '❌ FALHAS DETECTADAS'
        },
        tests: validation,
      };
    }

    // ============================================================
    // FASE 5: GERAR RELATÓRIO DE ROBUSTEZ
    // ============================================================

    const methods: SynthesisMethod[] = ['subtractive', 'additive', 'multiplicative_power', 'reciprocal'];
    const robustnessReport: any = {
      rankings: {},
      winners: {},
      winCounts: {},
      convergenceMatrix: {},
    };

    alternatives.forEach((alt: any) => {
      robustnessReport.winCounts[alt.code] = 0;
      robustnessReport.convergenceMatrix[alt.code] = {};
    });

    methods.forEach(method => {
      const sorted = [...calculation.finalScores].sort((a, b) => (b.scores?.[method] || 0) - (a.scores?.[method] || 0));
      robustnessReport.rankings[method] = sorted.map(s => ({
        code: s.code,
        name: s.name,
        score: (s.scores?.[method] || 0).toFixed(4)
      }));

      const winner = sorted[0].code;
      robustnessReport.winners[method] = winner;
      robustnessReport.winCounts[winner]++;

      alternatives.forEach((alt: any) => {
        robustnessReport.convergenceMatrix[alt.code][method] = alt.code === winner;
      });
    });

    let maxWins = 0;
    let consensusWinner = null;
    Object.entries(robustnessReport.winCounts).forEach(([code, wins]) => {
      if ((wins as number) > maxWins) {
        maxWins = wins as number;
        consensusWinner = code;
      }
    });
    robustnessReport.consensusWinner = maxWins >= 3 ? consensusWinner : null;

    const executionTime = Date.now() - startTime;

    // ⭐ NOVO: Estatísticas de qualidade com informações do modo
    const allAvgCRs = results.individualCRs.map(r => r.avgCR / 100); // Converter de % para decimal
    const sortedCRs = [...allAvgCRs].sort((a, b) => a - b);
    const n = sortedCRs.length;

    const qualityStats = {
      modo: modoValido,
      modoNome: modoConfig.nome,
      taxaAprovacaoEsperada: `${(modoConfig.taxaAprovacaoEsperada * 100).toFixed(0)}%`,
      avgCR: results.individualCRs.reduce((s, r) => s + r.avgCR, 0) / results.individualCRs.length,
      medianCR: n > 0 ? (n % 2 === 0 ? (sortedCRs[n / 2 - 1] + sortedCRs[n / 2]) / 2 : sortedCRs[Math.floor(n / 2)]) * 100 : 0,
      minCR: Math.min(...results.individualCRs.map(r => r.avgCR)),
      maxCR: Math.max(...results.individualCRs.map(r => r.avgCR)),
      taxaAprovacao: (results.individualCRs.filter(r => r.avgCR <= 10).length / results.individualCRs.length * 100).toFixed(1) + '%',
      byStatus: {
        CONFIÁVEL: results.individualCRs.filter(r => r.status === 'CONFIÁVEL').length,
        REVISAR: results.individualCRs.filter(r => r.status === 'REVISAR').length,
        SUSPEITO: results.individualCRs.filter(r => r.status === 'SUSPEITO').length,
        CRÍTICO: results.individualCRs.filter(r => r.status === 'CRÍTICO').length,
      },
    };

    return NextResponse.json({
      success: true,
      message: `Simulação v6.0 completa: ${numResponses} respondentes com CR "${modoConfig.nome}"`,
      results: {
        respondentsCreated: results.respondentsCreated,
        responsesCreated: results.responsesCreated,
        patternDistribution: results.patternDistribution,
        demographicsGenerated: results.demographicsGenerated,
        // ⭐ NOVO: Estatísticas de distribuição de CR
        crDistribution: {
          modo: modoConfig.nome,
          mediaCR: `${qualityStats.avgCR.toFixed(1)}%`,
          medianaCR: `${qualityStats.medianCR.toFixed(1)}%`,
          taxaAprovacao: qualityStats.taxaAprovacao,
          minCR: `${qualityStats.minCR.toFixed(1)}%`,
          maxCR: `${qualityStats.maxCR.toFixed(1)}%`,
        },
      },
      // Estatísticas de qualidade
      qualityStats,
      individualCRs: results.individualCRs.slice(0, 15), // Amostra dos primeiros 15
      calculation: {
        bocrWeights: calculation.bocrWeights.map(w => w.toFixed(4)),
        bocrConsistency: {
          cr: calculation.bocrConsistency.cr.toFixed(4),
          crPercent: (calculation.bocrConsistency.cr * 100).toFixed(2) + '%',
          status: calculation.bocrConsistency.cr <= 0.10 ? 'VÁLIDO' : 'INCONSISTENTE'
        },
        finalRanking: (() => {
          const sorted = [...calculation.finalScores].sort((a, b) => (b.scores?.subtractive || 0) - (a.scores?.subtractive || 0));
          let currentRank = 1;
          return sorted.map((s, idx) => {
            if (idx > 0) {
              const prevScore = sorted[idx - 1].scores?.subtractive || 0;
              const currScore = s.scores?.subtractive || 0;
              if (Math.abs(prevScore - currScore) >= 0.0001) {
                currentRank = idx + 1;
              }
            }
            return {
              rank: currentRank,
              code: s.code,
              name: s.name,
              scoreSubtractive: (s.scores?.subtractive || 0).toFixed(4),
              isTied: idx > 0 && Math.abs((sorted[idx - 1].scores?.subtractive || 0) - (s.scores?.subtractive || 0)) < 0.0001,
            };
          });
        })(),
      },
      robustnessReport,
      qaReport,
      metrics: {
        executionTimeMs: executionTime,
        avgTimePerRespondent: Math.round(executionTime / numResponses),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Erro na simulação:', error);
    return NextResponse.json({
      error: 'Erro ao executar simulação',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Documentação
export async function GET() {
  return NextResponse.json({
    description: 'API de Simulação e QA Completo para Sistema AHP-BOCR',
    version: '6.0 - CR Realista baseado em Literatura Empírica',
    features: [
      '✅ Geração de respondentes com perfil demográfico',
      '✅ Geração de julgamentos por padrão',
      '✅ Cálculo de CR individual por respondente',
      '✅ CRs por mérito (BOCR, B, O, C, R) armazenados',
      '✅ Estrutura responses igual a respondente real',
      '✅ Cálculo completo AHP-BOCR (mesmo da produção)',
      '✅ 5 Fórmulas de Síntese implementadas',
      '✅ Validação matemática automatizada',
      '✅ Relatório de Robustez com convergência',
      '✅ Salva cálculo no Firebase (testa integração)',
      '⭐ NOVO: CR Realista com distribuição Weibull',
      '⭐ NOVO: 3 modos baseados em literatura empírica',
    ],
    newInV6: [
      'Parâmetro modoConsistencia substitui consistencyFactor',
      'Distribuição Weibull calibrada com dados de 400+ matrizes',
      'Modos: pessimista (25% aprovação), moderado (45%), especialista (65%)',
      'Baseado em BPMSG, Lukinskiy et al., Frish et al., Ishizaka & Siraj',
    ],
    references: [
      'BPMSG (Goepel): ~100 respondentes, mediana CR=16%',
      'Lukinskiy et al. (2021): 292 matrizes, IFIP APMS',
      'Frish et al. (2025): 21 oficiais seniores, MethodsX',
      'Ishizaka & Siraj (2018): 50 participantes, EJOR',
    ],
    validationTests: [
      'Soma dos pesos BOCR = 1',
      'CR BOCR ≤ 10%',
      'Pesos positivos',
      'Soma pesos subcritérios = 1',
      'Soma scores alternativas = 1',
      'Consenso entre métodos de síntese',
    ],
    usage: {
      method: 'POST',
      body: {
        projectId: 'ID do projeto (obrigatório)',
        count: 'Número de respondentes (1-100, padrão: 10)',
        pattern: 'consistent | random | biased_benefits | biased_costs | moderate | extreme | mixed',
        modoConsistencia: 'pessimista | moderado | especialista (padrão: moderado) ⭐ NOVO',
        runValidation: 'Executar testes de QA (padrão: true)',
        clearExisting: 'Limpar dados existentes antes de simular (padrão: false)',
      },
    },
    modos: {
      pessimista: {
        descricao: 'Decisores não-treinados',
        taxaAprovacao: '~25%',
        medianaCR: '~16%',
        fonte: 'BPMSG + Ishizaka & Siraj (2018)',
      },
      moderado: {
        descricao: 'Decisores orientados',
        taxaAprovacao: '~45%',
        medianaCR: '~11%',
        fonte: 'Lukinskiy et al. (2021)',
      },
      especialista: {
        descricao: 'Especialistas treinados em AHP',
        taxaAprovacao: '~65%',
        medianaCR: '~7%',
        fonte: 'Frish et al. (2025)',
      },
    },
  });
}
