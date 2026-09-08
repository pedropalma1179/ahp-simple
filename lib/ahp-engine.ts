/**
 * lib/ahp-engine.ts
 *
 * Motor determinístico único do AHP-BOCR.
 *
 * Autoridade: este módulo é a ÚNICA fonte de derivação de prioridades,
 * consistência, agregação AIJ e síntese BOCR do sistema. Nenhum outro arquivo
 * deve implementar essas operações.
 *
 * Referências verificadas na base:
 *   Saaty (1977), Saaty (1990)            autovetor principal, CI, CR, RI
 *   Aczél e Saaty (1983)                  agregação AIJ por média geométrica
 *   Forman e Peniwati (1998)              AIJ preserva reciprocidade
 *   Wijnmalen (2007) Eq. 17               síntese subtrativa
 *   Wijnmalen (2007) Eq. 12               quociente de somas
 *   Demirtas e Ustun (2008) Eq. 2         aditivo residual
 *   Lee (2009)                            comparação entre métodos de síntese
 *
 * Princípio de projeto: falhar alto. Entrada inválida gera AhpEngineError.
 * Nenhuma guarda numérica silenciosa, nenhum clamp, nenhum valor de substituição.
 * Guardas do tipo `+ epsilon` ou `Math.max(x, epsilon)` alteram o resultado
 * publicado na quarta casa decimal e estão proibidas neste módulo.
 */

export const ENGINE_VERSION = 'engine-1.0.0';

export class AhpEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AhpEngineError';
  }
}

/** Índice aleatório de Saaty (1977). Sem fallback: ordem fora da tabela é erro. */
export const RANDOM_INDEX: Readonly<Record<number, number>> = Object.freeze({
  1: 0,
  2: 0,
  3: 0.58,
  4: 0.90,
  5: 1.12,
  6: 1.24,
  7: 1.32,
  8: 1.41,
  9: 1.45,
  10: 1.49,
});

export function randomIndex(n: number): number {
  const ri = RANDOM_INDEX[n];
  if (ri === undefined) {
    throw new AhpEngineError(
      `Índice aleatório indefinido para ordem n=${n}. A tabela de Saaty (1977) ` +
      `implementada cobre n de 1 a 10. Estender a tabela com fonte verificada ` +
      `antes de processar matrizes de ordem maior.`
    );
  }
  return ri;
}

// ---------------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------------

const RECIPROCITY_TOLERANCE = 1e-9;

/**
 * Valida uma matriz de comparação pareada completa: quadrada, positiva,
 * diagonal unitária e recíproca.
 */
export function assertValidPCM(matrix: number[][], label = 'PCM'): void {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    throw new AhpEngineError(`${label}: matriz vazia ou não é um array.`);
  }
  const n = matrix.length;
  for (let i = 0; i < n; i++) {
    if (!Array.isArray(matrix[i]) || matrix[i].length !== n) {
      throw new AhpEngineError(`${label}: linha ${i} não tem ${n} elementos.`);
    }
    for (let j = 0; j < n; j++) {
      const v = matrix[i][j];
      if (!Number.isFinite(v) || v <= 0) {
        throw new AhpEngineError(
          `${label}: elemento [${i}][${j}] = ${v}. Todos os elementos devem ser ` +
          `finitos e estritamente positivos. Elemento ausente indica matriz ` +
          `incompleta, que deve ser tratada pelo caminho IPC, não por este.`
        );
      }
    }
    if (Math.abs(matrix[i][i] - 1) > RECIPROCITY_TOLERANCE) {
      throw new AhpEngineError(`${label}: diagonal [${i}][${i}] = ${matrix[i][i]}, esperado 1.`);
    }
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const produto = matrix[i][j] * matrix[j][i];
      if (Math.abs(produto - 1) > RECIPROCITY_TOLERANCE) {
        throw new AhpEngineError(
          `${label}: reciprocidade violada em [${i}][${j}]. ` +
          `a_ij * a_ji = ${produto}, esperado 1.`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Derivação de prioridades
// ---------------------------------------------------------------------------

export interface EigenResult {
  /** Vetor de prioridades, soma 1. */
  weights: number[];
  /** Autovalor principal, obtido como soma de (A·w) com w somando 1. */
  lambdaMax: number;
  iterations: number;
  /** Rótulo honesto do algoritmo executado, não do ramo tomado. */
  method: 'EIGENVECTOR';
}

const MAX_ITERATIONS = 1000;
const CONVERGENCE_TOLERANCE = 1e-12;

/**
 * Autovetor principal por iteração de potência (Saaty, 1977; 1990).
 *
 * Não usar média geométrica das linhas. A média geométrica é a solução do LLSM,
 * subestima o CR e pode reverter ranking em matrizes inconsistentes de ordem
 * maior que 3 (Saaty e Vargas, 1984).
 */
export function principalEigenvector(matrix: number[][], label = 'PCM'): EigenResult {
  assertValidPCM(matrix, label);
  const n = matrix.length;

  if (n === 1) {
    return { weights: [1], lambdaMax: 1, iterations: 0, method: 'EIGENVECTOR' };
  }

  let w: number[] = new Array(n).fill(1 / n);
  let iterations = 0;
  let converged = false;

  for (let iter = 1; iter <= MAX_ITERATIONS; iter++) {
    iterations = iter;
    const next = matrix.map(row => row.reduce((acc, a_ij, j) => acc + a_ij * w[j], 0));
    const soma = next.reduce((a, b) => a + b, 0);
    if (!Number.isFinite(soma) || soma <= 0) {
      throw new AhpEngineError(`${label}: iteração de potência divergiu na iteração ${iter}.`);
    }
    for (let i = 0; i < n; i++) next[i] /= soma;
    let delta = 0;
    for (let i = 0; i < n; i++) delta = Math.max(delta, Math.abs(next[i] - w[i]));
    w = next;
    if (delta < CONVERGENCE_TOLERANCE) {
      converged = true;
      break;
    }
  }

  if (!converged) {
    throw new AhpEngineError(
      `${label}: iteração de potência não convergiu em ${MAX_ITERATIONS} iterações ` +
      `com tolerância ${CONVERGENCE_TOLERANCE}.`
    );
  }

  // Na convergência, A·w = lambda·w e sum(w) = 1, logo lambda = sum(A·w).
  // Esta forma dispensa a divisão por w_i e portanto dispensa guarda para w_i pequeno.
  const Aw = matrix.map(row => row.reduce((acc, a_ij, j) => acc + a_ij * w[j], 0));
  const lambdaMax = Aw.reduce((a, b) => a + b, 0);

  return { weights: w, lambdaMax, iterations, method: 'EIGENVECTOR' };
}

// ---------------------------------------------------------------------------
// Consistência
// ---------------------------------------------------------------------------

export interface ConsistencyResult {
  n: number;
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
}

/**
 * Razão de consistência (Saaty, 1977).
 * CI = (lambda_max - n) / (n - 1), CR = CI / RI(n).
 * Para n <= 2 a matriz é consistente por construção e RI = 0, logo CR = 0.
 */
export function consistency(matrix: number[][], label = 'PCM'): ConsistencyResult {
  assertValidPCM(matrix, label);
  const n = matrix.length;
  if (n <= 2) {
    return { n, lambdaMax: n, ci: 0, ri: 0, cr: 0 };
  }
  const { lambdaMax } = principalEigenvector(matrix, label);
  const ci = (lambdaMax - n) / (n - 1);
  const ri = randomIndex(n);
  return { n, lambdaMax, ci, ri, cr: ci / ri };
}

// ---------------------------------------------------------------------------
// Agregação de julgamentos (AIJ)
// ---------------------------------------------------------------------------

/**
 * Média geométrica dos julgamentos individuais de um mesmo par (AIJ).
 * Aczél e Saaty (1983); Forman e Peniwati (1998).
 *
 * Sem clamp inferior. Valor não positivo é dado inválido e deve interromper
 * o cálculo, não ser substituído silenciosamente.
 */
export function aggregateAIJ(values: number[], label = 'par'): number {
  if (values.length === 0) {
    throw new AhpEngineError(`${label}: nenhum julgamento para agregar.`);
  }
  let logSoma = 0;
  for (const v of values) {
    if (!Number.isFinite(v) || v <= 0) {
      throw new AhpEngineError(`${label}: julgamento inválido (${v}). Esperado valor positivo finito.`);
    }
    logSoma += Math.log(v);
  }
  return Math.exp(logSoma / values.length);
}

// ---------------------------------------------------------------------------
// Síntese BOCR
// ---------------------------------------------------------------------------

export interface MeritPriorities {
  B: number;
  O: number;
  C: number;
  R: number;
}

export interface BocrSynthesisResult {
  /** Wijnmalen (2007) Eq. 17: vb·sb·B + vo·so·O - vc·sc·C - vr·sr·R */
  subtractive: number;
  /** Wijnmalen (2007) Eq. 12: (sb·B + so·O) / (sc·C + sr·R) */
  quotientSums: number;
  /** Demirtas e Ustun (2008) Eq. 2: vb·B + vo·O + vc·(1-C) + vr·(1-R) */
  additiveResidual: number;
  /** Multiplicativo com expoentes: (B^vb · O^vo) / (C^vc · R^vr) */
  multiplicativePower: number;
  /** Multiplicativo simples: (B·O) / (C·R) */
  multiplicativeSimple: number;
}

/**
 * Cinco fórmulas de síntese BOCR.
 *
 * Sem termos epsilon. Denominador não positivo interrompe o cálculo em vez de
 * ser deslocado, porque o deslocamento altera o resultado na quarta casa
 * decimal, que é a precisão de relato do estudo.
 *
 * @param merit   prioridades da alternativa em cada mérito
 * @param v       pesos dos méritos BOCR (vetor de prioridades estratégicas)
 * @param s       pesos de reescalonamento (magnitude de impacto)
 */
export function synthesizeBOCR(
  merit: MeritPriorities,
  v: MeritPriorities,
  s: MeritPriorities,
  label = 'alternativa'
): BocrSynthesisResult {
  const { B, O, C, R } = merit;

  for (const [nome, valor] of Object.entries({ B, O, C, R })) {
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new AhpEngineError(
        `${label}: prioridade do mérito ${nome} = ${valor}. Esperado positivo finito.`
      );
    }
  }

  const denominadorSomas = s.C * C + s.R * R;
  if (denominadorSomas <= 0) {
    throw new AhpEngineError(
      `${label}: denominador do quociente de somas = ${denominadorSomas}. ` +
      `Wijnmalen (2007) Eq. 12 não é definida com custos e riscos nulos.`
    );
  }

  const denominadorPotencia = Math.pow(C, v.C) * Math.pow(R, v.R);
  if (denominadorPotencia <= 0) {
    throw new AhpEngineError(`${label}: denominador do multiplicativo por potências = ${denominadorPotencia}.`);
  }

  const denominadorSimples = C * R;
  if (denominadorSimples <= 0) {
    throw new AhpEngineError(`${label}: denominador do multiplicativo simples = ${denominadorSimples}.`);
  }

  return {
    subtractive: v.B * s.B * B + v.O * s.O * O - v.C * s.C * C - v.R * s.R * R,
    quotientSums: (s.B * B + s.O * O) / denominadorSomas,
    additiveResidual: v.B * B + v.O * O + v.C * (1 - C) + v.R * (1 - R),
    multiplicativePower: (Math.pow(B, v.B) * Math.pow(O, v.O)) / denominadorPotencia,
    multiplicativeSimple: denominadorSimples > 0 ? (B * O) / denominadorSimples : NaN,
  };
}

/** Converte um vetor na ordem [B, O, C, R] para o objeto de méritos. */
export function toMerits(vetor: number[], label = 'vetor'): MeritPriorities {
  if (vetor.length !== 4) {
    throw new AhpEngineError(`${label}: esperados 4 elementos na ordem [B, O, C, R], recebidos ${vetor.length}.`);
  }
  const [B, O, C, R] = vetor;
  return { B, O, C, R };
}
