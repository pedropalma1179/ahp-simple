// app/api/simulate/route.ts
// API de Simulação e QA Completo para Sistema AHP-BOCR
// Versão 4.0: Validação matemática completa + Teste de integração

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { SUBCRITERIA, generateAllComparisons } from '@/lib/data';

// ============================================================
// CONSTANTES E TIPOS
// ============================================================

const EPSILON = 1e-10;
const RI = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];

type SynthesisMethod = 'additive' | 'probabilistic' | 'subtractive' | 'multiplicative_power' | 'multiplicative_simple';
type ResponsePattern = 'consistent' | 'random' | 'biased_benefits' | 'biased_costs' | 'moderate' | 'extreme';

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
  areaAtuacao: { producao: 0.22, eng_processos: 0.25, financas: 0.08, qualidade: 0.15, manutencao: 0.12, logistica: 0.10, ti: 0.08 },
  funcao: { c_level: 0.05, diretor: 0.12, gerente: 0.32, supervisor: 0.23, analista: 0.28 },
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
    case 'additive':
      return b * B + o * O + c * (1 - C) + r * (1 - R);

    case 'probabilistic':
      const totalWeight = b + o + c + r;
      const bn = b / totalWeight;
      const on = o / totalWeight;
      const cn = c / totalWeight;
      const rn = r / totalWeight;
      return bn * B + on * O + cn * (1 - C) + rn * (1 - R);

    case 'subtractive':
      return b * B + o * O - c * C - r * R;

    case 'multiplicative_power':
      const numerator = Math.pow(Math.max(B, EPSILON), b) * Math.pow(Math.max(O, EPSILON), o);
      const denominator = Math.pow(Math.max(C, EPSILON), c) * Math.pow(Math.max(R, EPSILON), r);
      return numerator / Math.max(denominator, EPSILON);

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

function generateRespondentProfile(index: number, projectId: string) {
  const genero = selectByDistribution(DISTRIBUICOES.genero);
  const nome = generateName(genero);
  const email = `simulado${index + 1}@teste.local`;

  const demographics = {
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

/**
 * Gera vetores de pesos para cada tipo de comparação.
 * Estes pesos são usados para derivar julgamentos transitivos.
 * 
 * @param pattern - Padrão de resposta que influencia a distribuição dos pesos
 * @param alternatives - Lista de alternativas do projeto
 * @returns Mapa de pesos por tipo de comparação
 */
function generateConsistentWeights(
  pattern: ResponsePattern,
  alternatives: { code: string; name: string }[]
): Record<string, number[]> {
  
  const weights: Record<string, number[]> = {};
  
  // Função auxiliar para gerar vetor de pesos normalizado
  // Gera pesos com diferenciação suficiente para produzir valores Saaty 2-9
  const generateWeightVector = (size: number, bias?: 'first' | 'last' | 'uniform'): number[] => {
    let raw: number[];
    
    // Base exponencial maior para criar diferenciação clara
    // Base 3.0 para 4 elementos: [27, 9, 3, 1] → ratios até 27x
    const baseExp = 3.0 + Math.random() * 0.5; // 3.0-3.5 para variação
    
    switch (bias) {
      case 'first':
        // Favorece primeiros elementos com forte diferenciação
        raw = Array(size).fill(0).map((_, i) => {
          const base = Math.pow(baseExp, size - i - 1);
          const noise = (Math.random() - 0.3) * base * 0.5; // Mais ruído
          return Math.max(0.5, base + noise);
        });
        break;
      case 'last':
        // Favorece últimos elementos
        raw = Array(size).fill(0).map((_, i) => {
          const base = Math.pow(baseExp, i);
          const noise = (Math.random() - 0.3) * base * 0.5;
          return Math.max(0.5, base + noise);
        });
        break;
      case 'uniform':
        // Distribuição mais equilibrada mas ainda com variação
        raw = Array(size).fill(0).map((_, i) => {
          // Criar variação suave: [5, 4, 3, 2, 1] com ruído
          const base = size - i + 1;
          const noise = (Math.random() - 0.5) * 2;
          return Math.max(1, base + noise);
        });
        break;
      default:
        // Distribuição aleatória com boa variação
        // Gera valores entre 1 e 9 (similar à escala Saaty)
        raw = Array(size).fill(0).map(() => 1 + Math.random() * 8);
    }
    
    // Normalizar para somar 1
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map(w => w / sum);
  };
  
  // 1. Pesos BOCR (4 elementos: B, O, C, R) - Importância Relativa
  switch (pattern) {
    case 'biased_benefits':
      weights['bocr'] = generateWeightVector(4, 'first'); // B, O mais altos
      break;
    case 'biased_costs':
      weights['bocr'] = generateWeightVector(4, 'last'); // C, R mais altos
      break;
    case 'consistent':
      weights['bocr'] = generateWeightVector(4, 'first'); // B > O > C > R típico
      break;
    case 'moderate':
      weights['bocr'] = generateWeightVector(4, 'uniform'); // Mais balanceado
      break;
    default:
      weights['bocr'] = generateWeightVector(4);
  }
  
  // 1.5. 🆕 Pesos MAGNITUDE (4 elementos: B, O, C, R) - Magnitude Absoluta
  // IMPORTANTE: Magnitude deve ser DIFERENTE de BOCR!
  // BOCR = importância relativa (valores pessoais)
  // MAGNITUDE = tamanho absoluto (valores objetivos)
  switch (pattern) {
    case 'biased_benefits':
      // Magnitude: Benefícios têm grande magnitude absoluta
      weights['magnitude'] = generateWeightVector(4, 'first'); // B muito maior
      break;
    case 'biased_costs':
      // Magnitude: Custos têm grande magnitude absoluta
      weights['magnitude'] = generateWeightVector(4, 'last'); // C, R maiores
      break;
    case 'consistent':
      // Magnitude típica: Benefícios > Custos > Oportunidades > Riscos
      // Gera distribuição diferente de BOCR para simular realismo
      const magnitudeRaw = [
        4 + Math.random() * 3,  // B: 4-7
        2 + Math.random() * 2,  // O: 2-4
        3 + Math.random() * 2,  // C: 3-5
        1 + Math.random() * 1.5 // R: 1-2.5
      ];
      const magnitudeSum = magnitudeRaw.reduce((a, b) => a + b, 0);
      weights['magnitude'] = magnitudeRaw.map(w => w / magnitudeSum);
      break;
    case 'moderate':
      // Magnitude balanceada mas ainda variada
      weights['magnitude'] = generateWeightVector(4, 'uniform');
      break;
    default:
      // Magnitude aleatória mas diferente de BOCR
      weights['magnitude'] = generateWeightVector(4);
  }
  
  // 2. Pesos dos subcritérios (5 elementos cada: X1, X2, X3, X4, X5)
  ['B', 'O', 'C', 'R'].forEach(group => {
    if (pattern === 'consistent' || pattern === 'moderate') {
      weights[`sub_${group}`] = generateWeightVector(5, 'first'); // Prioriza primeiros subcritérios
    } else {
      weights[`sub_${group}`] = generateWeightVector(5);
    }
  });
  
  // 3. Pesos das alternativas (por subcritério)
  const numAlts = alternatives.length;
  if (numAlts >= 2) {
    // Definir qual alternativa é "melhor" para cada subcritério
    // Variar intensidade da preferência para criar diversidade
    SUBCRITERIA.forEach((sub, idx) => {
      // Variar qual alternativa é favorecida por subcritério
      // Usar índice para criar padrão determinístico mas variado
      const favorsFirst = (idx % 3 !== 0) ? Math.random() > 0.4 : Math.random() > 0.6;
      
      // Gerar pesos com intensidade variável
      // Alguns subcritérios têm preferência forte, outros fraca
      const intensityRandom = Math.random();
      let altWeights: number[];
      
      if (intensityRandom < 0.3) {
        // 30%: Preferência forte (ratio ~5-7)
        altWeights = favorsFirst 
          ? [5 + Math.random() * 2, 1]
          : [1, 5 + Math.random() * 2];
      } else if (intensityRandom < 0.7) {
        // 40%: Preferência moderada (ratio ~2-4)
        altWeights = favorsFirst 
          ? [2 + Math.random() * 2, 1]
          : [1, 2 + Math.random() * 2];
      } else {
        // 30%: Preferência leve (ratio ~1-2)
        altWeights = favorsFirst
          ? [1.2 + Math.random() * 0.8, 1]
          : [1, 1.2 + Math.random() * 0.8];
      }
      
      // Normalizar
      const sum = altWeights.reduce((a, b) => a + b, 0);
      const normalizedWeights = altWeights.map(w => w / sum);
      
      // Para Custos e Riscos, inverter lógica (menor score = melhor alternativa)
      if (sub.group === 'C' || sub.group === 'R') {
        weights[`alt_${sub.code}`] = normalizedWeights.reverse();
      } else {
        weights[`alt_${sub.code}`] = normalizedWeights;
      }
    });
  }
  
  return weights;
}

function generateJudgment(
  comparison: { type: string; group: string; itemA: string; itemB: string },
  pattern: ResponsePattern,
  consistencyFactor: number = 0.8,
  precomputedWeights?: Record<string, number[]> // Pesos pré-calculados para garantir transitividade
): { saatyValue: number; favors: 'A' | 'B' | 'equal'; rawSlider: number } {

  // Se temos pesos pré-calculados, usar para derivar julgamento consistente
  if (precomputedWeights) {
    const key = comparison.type === 'bocr' ? 'bocr' : 
                comparison.type === 'magnitude' ? 'magnitude' :  // ← ADICIONADO
                comparison.type === 'subcriteria' ? `sub_${comparison.group}` :
                `alt_${comparison.group}`;
    
    const weights = precomputedWeights[key];
    if (weights) {
      let idxA = -1;
      let idxB = -1;
      
      if (comparison.type === 'bocr') {
        const bocrItems = ['B', 'O', 'C', 'R'];
        idxA = bocrItems.indexOf(comparison.itemA);
        idxB = bocrItems.indexOf(comparison.itemB);
      } else if (comparison.type === 'magnitude') {
        // Magnitude: comparações entre B, O, C, R (iguais ao BOCR mas pesos diferentes)
        const bocrItems = ['B', 'O', 'C', 'R'];
        idxA = bocrItems.indexOf(comparison.itemA);
        idxB = bocrItems.indexOf(comparison.itemB);
      } else if (comparison.type === 'subcriteria') {
        // Subcritérios: B1, B2, B3, B4, B5 etc.
        const subItems = ['1', '2', '3', '4', '5'].map(n => comparison.group + n);
        idxA = subItems.indexOf(comparison.itemA);
        idxB = subItems.indexOf(comparison.itemB);
      } else {
        // Alternativas: usar ordem do array de pesos (índices 0, 1, 2, ...)
        // Os items podem ser "Gas A", "Gas B" ou "A1", "A2"
        // O weights array tem tamanho igual ao número de alternativas
        // Precisamos mapear itemA e itemB para índices 0, 1, ...
        // Assumimos que itemA e itemB são os códigos/nomes das alternativas
        // O índice é determinado pela ordem no nome/código
        
        // Extrair número do código (ex: "Gas A" -> 0, "Gas B" -> 1, ou "A1" -> 0, "A2" -> 1)
        const extractIndex = (item: string): number => {
          // Tentar extrair número
          const num = parseInt(item.replace(/\D/g, ''));
          if (!isNaN(num) && num > 0) return num - 1; // A1 -> 0, A2 -> 1
          
          // Tentar letra final (A -> 0, B -> 1)
          const match = item.match(/[A-Za-z]$/);
          if (match) {
            const letter = match[0].toUpperCase();
            return letter.charCodeAt(0) - 'A'.charCodeAt(0);
          }
          
          // Fallback: ordem alfabética
          return 0;
        };
        
        idxA = extractIndex(comparison.itemA);
        idxB = extractIndex(comparison.itemB);
        
        // Garantir que os índices estão dentro do range
        if (idxA >= weights.length) idxA = 0;
        if (idxB >= weights.length) idxB = Math.min(1, weights.length - 1);
      }
      
      if (idxA >= 0 && idxB >= 0 && idxA < weights.length && idxB < weights.length && weights[idxA] && weights[idxB]) {
        const ratio = weights[idxA] / weights[idxB];
        
        // Converter ratio para escala Saaty com ruído
        let saatyValue: number;
        let favorA: boolean;
        
        if (ratio >= 1) {
          favorA = true;
          saatyValue = Math.round(ratio);
        } else {
          favorA = false;
          saatyValue = Math.round(1 / ratio);
        }
        
        // Adicionar ruído baseado no padrão (mais controlado)
        const noiseLevel = pattern === 'consistent' ? 0.05 : // Muito pouco ruído
                          pattern === 'moderate' ? 0.20 : 
                          pattern === 'random' ? 1.0 : 0.15;
        
        const noise = (Math.random() - 0.5) * noiseLevel * saatyValue;
        saatyValue = Math.max(1, Math.min(9, Math.round(saatyValue + noise)));
        
        // Chance de inverter baseada no padrão
        // consistent: 1% de chance de erro (quase perfeito)
        // moderate: 8% | extreme: 15% | random: 50%
        const inversionChance = pattern === 'consistent' ? 0.01 :
                               pattern === 'moderate' ? 0.08 :
                               pattern === 'extreme' ? 0.15 :
                               pattern === 'random' ? 0.50 : 0.05;
        
        if (Math.random() < inversionChance) {
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

  // Fallback para lógica original se não tiver pesos pré-calculados
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
        // Alternativas: usar índice do código ou extrair número
        // Suporta códigos como "A1", "A2" ou "Gas A", "Gas B", etc.
        let altA = parseInt(comparison.itemA.replace(/\D/g, '')) || 0;
        let altB = parseInt(comparison.itemB.replace(/\D/g, '')) || 0;
        
        // Se não conseguiu extrair número, usar ordem alfabética
        if (altA === 0 && altB === 0) {
          altA = comparison.itemA.localeCompare(comparison.itemB);
          altB = 0;
        }
        
        const subGroup = SUBCRITERIA.find(s => s.code === comparison.group)?.group;
        const invertido = subGroup === 'C' || subGroup === 'R';
        
        // Garantir diferença para evitar empates artificiais
        if (altA === altB) {
          favorA = comparison.itemA < comparison.itemB; // Ordem alfabética como fallback
          baseValue = 2 + Math.floor(Math.random() * 3); // 2-4 para diferença mínima
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

  if (Math.random() > consistencyFactor && pattern !== 'random') {
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

function generateResponse(
  respondentId: string,
  projectId: string,
  alternatives: { code: string; name: string; description?: string }[],
  pattern: ResponsePattern,
  consistencyFactor: number
) {
  const altsWithDesc = alternatives.map(a => ({
    code: a.code,
    name: a.name,
    description: a.description || '',
  }));
  const comparisons = generateAllComparisons(altsWithDesc);

  // Gerar pesos pré-calculados para garantir transitividade
  // Exceto para padrão 'random' que deve ser inconsistente por design
  const precomputedWeights = pattern !== 'random' 
    ? generateConsistentWeights(pattern, alternatives)
    : undefined;

  const judgments = comparisons.map(comp => ({
    ...comp,
    ...generateJudgment(comp, pattern, consistencyFactor, precomputedWeights),
  }));

  return {
    projectId,
    respondentId,
    judgments,
    currentIndex: comparisons.length,
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isSimulated: true,
  };
}

// ============================================================
// CÁLCULO COMPLETO AHP-BOCR (mesmo usado na página de resultados)
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
    scoreAdditive: number;
    scoreProbabilistic: number;
    scoreSubtractiveNorm: number;
    scoreMultPowersNorm: number;
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

  // 3. Calcular scores das alternativas para cada subcritério
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

  // 4. Calcular scores finais BOCR para cada alternativa
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

      const globalWeight = bocrWeights[mIdx] || 0;
      
      if (merit === 'B') B = meritScore;
      if (merit === 'O') O = meritScore;
      if (merit === 'C') C = meritScore;
      if (merit === 'R') R = meritScore;
    });

    // Calcular scores para todas as fórmulas
    const bocrScores: BOCRScores = { B, O, C, R };
    const bocrW: BOCRWeights = { 
      b: bocrWeights[0] || 0, 
      o: bocrWeights[1] || 0, 
      c: bocrWeights[2] || 0, 
      r: bocrWeights[3] || 0 
    };

    // Usar nomes de campos que a página de resultados espera
    const scoreAdditive = calculateScore(bocrScores, bocrW, 'additive');
    const scoreProbabilistic = calculateScore(bocrScores, bocrW, 'probabilistic');
    const scoreSubtractive = calculateScore(bocrScores, bocrW, 'subtractive');
    const scoreMultPowers = calculateScore(bocrScores, bocrW, 'multiplicative_power');
    const scoreMultSimple = calculateScore(bocrScores, bocrW, 'multiplicative_simple');

    // Normalizar scores para comparação (min-max normalization para subtrativo que pode ser negativo)
    return { 
      code: alt.code, 
      name: alt.name, 
      B, O, C, R,
      // Campos que a página de resultados espera
      scoreAdditive,
      scoreProbabilistic,
      scoreSubtractiveNorm: scoreSubtractive, // Será normalizado depois
      scoreMultPowersNorm: scoreMultPowers,
      scoreMultSimpleNorm: scoreMultSimple,
      // Manter scores originais também para compatibilidade
      scores: {
        additive: scoreAdditive,
        probabilistic: scoreProbabilistic,
        subtractive: scoreSubtractive,
        multiplicative_power: scoreMultPowers,
        multiplicative_simple: scoreMultSimple,
      }
    };
  });

  // ============================================================
  // NORMALIZAÇÃO DOS SCORES
  // Padrão Científico: Modo Distributivo (Soma = 1) para comparabilidade
  // Exceção: Subtrativo usa valores brutos (pode ser negativo)
  // Referência: Wijnmalen (2007), Saaty & Ozdemir (2003)
  // ============================================================

  // 1. ADITIVO: Modo Distributivo (soma = 1)
  const additiveScores = finalScores.map(s => s.scoreAdditive);
  const sumAdditive = additiveScores.reduce((a, b) => a + b, 0) || 1;
  
  finalScores.forEach(s => {
    s.scoreAdditive = s.scoreAdditive / sumAdditive;
  });

  // 2. PROBABILÍSTICO: Modo Distributivo (soma = 1)
  const probScores = finalScores.map(s => s.scoreProbabilistic);
  const sumProb = probScores.reduce((a, b) => a + b, 0) || 1;
  
  finalScores.forEach(s => {
    s.scoreProbabilistic = s.scoreProbabilistic / sumProb;
  });

  // 3. SUBTRATIVO: Valores Brutos (Raw Scores) - NÃO NORMALIZAR
  // Fórmula: bB + oO - cC - rR (pode ser negativo)
  // Crítico para mostrar "Prejuízo Líquido" quando Score < 0
  finalScores.forEach(s => {
    s.scoreSubtractiveNorm = s.scores.subtractive; // Valor bruto, sem normalização
  });

  // 4. MULTIPLICATIVO POTÊNCIAS: Modo Distributivo (soma = 1)
  const multPowersScores = finalScores.map(s => s.scores.multiplicative_power);
  const sumMultPow = multPowersScores.reduce((a, b) => a + b, 0) || 1;
  
  finalScores.forEach(s => {
    s.scoreMultPowersNorm = s.scores.multiplicative_power / sumMultPow;
  });

  // 5. MULTIPLICATIVO SIMPLES: Modo Distributivo (soma = 1)
  const multSimpleScores = finalScores.map(s => s.scores.multiplicative_simple);
  const sumMultSim = multSimpleScores.reduce((a, b) => a + b, 0) || 1;
  
  finalScores.forEach(s => {
    s.scoreMultSimpleNorm = s.scores.multiplicative_simple / sumMultSim;
  });

  // 5. Calcular pontos de inflexão para análise de sensibilidade
  const sensitivityInflections: Record<string, number | null> = {};
  
  ['B', 'O', 'C', 'R'].forEach((merit, mIdx) => {
    // Encontrar as duas melhores alternativas pelo método subtrativo
    const sortedBySubtractive = [...finalScores].sort((a, b) => 
      (b.scores?.subtractive || 0) - (a.scores?.subtractive || 0)
    );
    
    if (sortedBySubtractive.length < 2) {
      sensitivityInflections[merit] = null;
      return;
    }
    
    const winner = sortedBySubtractive[0];
    const runnerUp = sortedBySubtractive[1];
    
    // Calcular a diferença de contribuição do mérito entre winner e runner-up
    const winnerMeritScore = merit === 'B' ? winner.B : merit === 'O' ? winner.O : merit === 'C' ? winner.C : winner.R;
    const runnerUpMeritScore = merit === 'B' ? runnerUp.B : merit === 'O' ? runnerUp.O : merit === 'C' ? runnerUp.C : runnerUp.R;
    
    const diff = winnerMeritScore - runnerUpMeritScore;
    
    // Se a diferença for muito pequena ou zero, não há ponto de inflexão claro
    if (Math.abs(diff) < 0.01) {
      sensitivityInflections[merit] = null;
      return;
    }
    
    // Simular em que peso ocorreria inversão
    // Isso é uma aproximação simplificada
    const currentWeight = bocrWeights[mIdx] * 100;
    
    // Se winner perde neste mérito, inversão ocorre se aumentar o peso
    // Se winner ganha neste mérito, inversão ocorre se diminuir o peso
    if (diff > 0) {
      // Winner é melhor neste mérito - inversão se peso diminuir muito
      const inflectionPoint = Math.max(0, currentWeight - (currentWeight * 0.5));
      sensitivityInflections[merit] = inflectionPoint > 5 ? Math.round(inflectionPoint) : null;
    } else {
      // Winner é pior neste mérito - inversão se peso aumentar muito
      const inflectionPoint = Math.min(100, currentWeight + (currentWeight * 0.5));
      sensitivityInflections[merit] = inflectionPoint < 95 ? Math.round(inflectionPoint) : null;
    }
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

function runValidationTests(calculation: any): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Teste 1: Soma dos pesos BOCR = 1
  const bocrSum = calculation.bocrWeights.reduce((a: number, b: number) => a + b, 0);
  results.push({
    test: 'Soma dos Pesos BOCR',
    status: Math.abs(bocrSum - 1) < 0.001 ? 'PASS' : 'FAIL',
    expected: 1,
    actual: bocrSum.toFixed(4),
    message: `Soma dos pesos BOCR deve ser 1. Obtido: ${bocrSum.toFixed(4)}`
  });

  // Teste 2: CR BOCR ≤ 0.10
  results.push({
    test: 'Consistência BOCR (CR ≤ 10%)',
    status: calculation.bocrConsistency.cr <= 0.10 ? 'PASS' : 'WARN',
    expected: '≤ 0.10',
    actual: calculation.bocrConsistency.cr.toFixed(4),
    message: `CR BOCR: ${(calculation.bocrConsistency.cr * 100).toFixed(2)}%`
  });

  // Teste 3: Todos os pesos são positivos
  const allPositive = calculation.bocrWeights.every((w: number) => w > 0);
  results.push({
    test: 'Pesos BOCR Positivos',
    status: allPositive ? 'PASS' : 'FAIL',
    expected: 'Todos > 0',
    actual: calculation.bocrWeights.map((w: number) => w.toFixed(4)).join(', '),
    message: allPositive ? 'Todos os pesos são positivos' : 'Existem pesos não-positivos'
  });

  // Teste 4: Soma dos pesos de cada subcritério = 1
  ['B', 'O', 'C', 'R'].forEach(merit => {
    const weights = calculation.subWeights[merit] || [];
    if (weights.length > 0) {
      const sum = weights.reduce((a: number, b: number) => a + b, 0);
      results.push({
        test: `Soma Pesos Subcritérios ${merit}`,
        status: Math.abs(sum - 1) < 0.001 ? 'PASS' : 'FAIL',
        expected: 1,
        actual: sum.toFixed(4),
        message: `Soma dos pesos de ${merit}: ${sum.toFixed(4)}`
      });
    }
  });

  // Teste 5: Scores das alternativas somam 1 para cada subcritério
  Object.entries(calculation.altScores).forEach(([subCode, scores]: [string, any]) => {
    const sum = Object.values(scores).reduce((a: any, b: any) => a + b, 0) as number;
    results.push({
      test: `Soma Scores Alt. (${subCode})`,
      status: Math.abs(sum - 1) < 0.001 ? 'PASS' : 'FAIL',
      expected: 1,
      actual: sum.toFixed(4),
      message: `Soma dos scores em ${subCode}: ${sum.toFixed(4)}`
    });
  });

  // Teste 6: Ranking consistente entre métodos (warning se diverge muito)
  const rankings: Record<string, string[]> = {};
  const methods = ['additive', 'probabilistic', 'subtractive', 'multiplicative_power', 'multiplicative_simple'];
  
  methods.forEach(method => {
    const sorted = [...calculation.finalScores].sort((a: any, b: any) => (b.scores?.[method] || 0) - (a.scores?.[method] || 0));
    rankings[method] = sorted.map((s: any) => s.code);
  });

  const firstPlaceVotes: Record<string, number> = {};
  Object.values(rankings).forEach(ranking => {
    const winner = ranking[0];
    firstPlaceVotes[winner] = (firstPlaceVotes[winner] || 0) + 1;
  });

  const maxVotes = Math.max(...Object.values(firstPlaceVotes));
  const hasConsensus = maxVotes >= 3;
  
  results.push({
    test: 'Consenso entre Métodos',
    status: hasConsensus ? 'PASS' : 'WARN',
    expected: '≥ 3/5 métodos concordam',
    actual: `Máximo ${maxVotes}/5 métodos`,
    message: hasConsensus ? 'Há consenso no ranking' : 'Divergência significativa entre métodos'
  });

  return results;
}

// ============================================================
// API ENDPOINT
// ============================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const {
      projectId,
      count = 10,
      pattern = 'mixed',
      consistencyFactor = 0.8,
      runValidation = true,
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 });
    }

    if (count < 1 || count > 100) {
      return NextResponse.json({ error: 'count deve ser entre 1 e 100' }, { status: 400 });
    }

    // Buscar projeto
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }

    const projectData = projectDoc.data();
    const alternatives = projectData.alternatives || [];

    if (alternatives.length < 2) {
      return NextResponse.json({ error: 'Projeto precisa ter pelo menos 2 alternativas' }, { status: 400 });
    }

    const patterns: ResponsePattern[] = ['consistent', 'random', 'biased_benefits', 'biased_costs', 'moderate', 'extreme'];

    const results = {
      respondentsCreated: 0,
      responsesCreated: 0,
      patternDistribution: {} as Record<string, number>,
      demographicsGenerated: 0,
    };

    const allJudgments: any[][] = [];

    // ============================================================
    // FASE 1: GERAR DADOS SIMULADOS
    // ============================================================

    for (let i = 0; i < count; i++) {
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

      const response = generateResponse(
        respondentRef.id,
        projectId,
        alternatives,
        responsePattern,
        consistencyFactor
      );

      await addDoc(collection(db, 'responses'), response);
      results.responsesCreated++;
      allJudgments.push(response.judgments);
    }

    // ============================================================
    // FASE 2: EXECUTAR CÁLCULO COMPLETO AHP-BOCR
    // ============================================================

    const calculation = performFullAHPCalculation(allJudgments, alternatives);

    // ============================================================
    // FASE 3: SALVAR CÁLCULO NO FIREBASE (simula /api/calculate)
    // ============================================================

    await setDoc(doc(db, 'calculations', projectId), {
      ...calculation,
      calculatedAt: new Date().toISOString(),
      responseCount: count,
      isSimulated: true,
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

    const methods: SynthesisMethod[] = ['additive', 'probabilistic', 'subtractive', 'multiplicative_power', 'multiplicative_simple'];
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

    // Determinar consenso
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

    return NextResponse.json({
      success: true,
      message: `Simulação e QA completos: ${count} respondentes, cálculo executado, validação ${qaReport?.summary.status || 'OK'}`,
      results,
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
            // Detectar empate (diferença < 0.0001)
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
        avgTimePerRespondent: Math.round(executionTime / count),
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
    version: '4.0',
    features: [
      '✅ Geração de respondentes com perfil demográfico',
      '✅ Geração de julgamentos por padrão',
      '✅ Cálculo completo AHP-BOCR (mesmo da produção)',
      '✅ 5 Fórmulas de Síntese implementadas',
      '✅ Validação matemática automatizada',
      '✅ Relatório de Robustez com convergência',
      '✅ Salva cálculo no Firebase (testa integração)',
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
        consistencyFactor: 'Fator de consistência 0-1 (padrão: 0.8)',
        runValidation: 'Executar testes de QA (padrão: true)',
      },
    },
  });
}
