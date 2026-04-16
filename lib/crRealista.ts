// lib/crRealista.ts
// Módulo para geração de CR realista baseado em literatura empírica AHP
// Referências: BPMSG, Lukinskiy et al. (2021), Frish et al. (2025), Ishizaka & Siraj (2018)

// ============================================
// TIPOS
// ============================================

export type ModoConsistenciaCR = 'pessimista' | 'moderado' | 'especialista';

interface ParametrosWeibull {
  k: number;      // shape (forma)
  lambda: number; // scale (escala)
  crMax: number;  // CR máximo permitido (cap)
}

interface ConfiguracaoModo {
  nome: string;
  parametros: ParametrosWeibull;
  taxaAprovacaoEsperada: number;
}

// ============================================
// CONFIGURAÇÃO DOS MODOS (Calibrados com Literatura)
// ============================================

export const CONFIGURACAO_MODOS_CR: Record<ModoConsistenciaCR, ConfiguracaoModo> = {
  pessimista: {
    nome: 'Realista Pessimista',
    parametros: {
      k: 1.35,      // shape - baseado em Lukinskiy et al.
      lambda: 0.216, // scale - calibrado para mediana ~16%
      crMax: 0.55   // Cap em 55%
    },
    taxaAprovacaoEsperada: 0.25
  },
  moderado: {
    nome: 'Realista Moderado',
    parametros: {
      k: 1.40,
      lambda: 0.142,
      crMax: 0.40
    },
    taxaAprovacaoEsperada: 0.45
  },
  especialista: {
    nome: 'Especialistas Treinados',
    parametros: {
      k: 1.50,
      lambda: 0.092,
      crMax: 0.25
    },
    taxaAprovacaoEsperada: 0.65
  }
};

// ============================================
// TABELA RI DE SAATY
// ============================================

const TABELA_RI: Record<number, number> = {
  1: 0.00,
  2: 0.00,
  3: 0.52,
  4: 0.89,
  5: 1.11,
  6: 1.25,
  7: 1.35,
  8: 1.40,
  9: 1.45,
  10: 1.49,
  11: 1.52,
  12: 1.54,
  13: 1.56,
  14: 1.58,
  15: 1.59
};

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Calcula RI usando tabela de Saaty ou polinômio de Yang para n > 15
 */
export function calcularRI(n: number): number {
  if (n <= 2) return 0;
  if (TABELA_RI[n] !== undefined) {
    return TABELA_RI[n];
  }
  // Polinômio de Yang et al. (2022) para n > 15
  return 0.001311 * Math.pow(n, 3) 
       - 0.045332 * Math.pow(n, 2) 
       + 0.533262 * n 
       - 0.615824;
}

/**
 * Gera um valor aleatório seguindo distribuição Weibull
 * Fórmula: X = λ * (-ln(U))^(1/k) onde U ~ Uniform(0,1)
 */
function gerarWeibull(k: number, lambda: number): number {
  const u = Math.random();
  const uSafe = Math.max(u, 1e-10); // Evitar log(0)
  return lambda * Math.pow(-Math.log(uSafe), 1 / k);
}

/**
 * Gera um CR realista baseado no modo de simulação
 * @param modo - modo de simulação ('pessimista' | 'moderado' | 'especialista')
 * @returns CR gerado seguindo distribuição Weibull calibrada
 */
export function gerarCRRealista(modo: ModoConsistenciaCR): number {
  const config = CONFIGURACAO_MODOS_CR[modo];
  const { k, lambda, crMax } = config.parametros;
  
  let cr = gerarWeibull(k, lambda);
  
  // Aplicar cap máximo
  cr = Math.min(cr, crMax);
  
  // Garantir valor mínimo positivo
  cr = Math.max(cr, 0.001);
  
  return cr;
}

/**
 * Gera múltiplos CRs e retorna estatísticas
 */
export function gerarLoteCR(modo: ModoConsistenciaCR, quantidade: number): {
  crs: number[];
  estatisticas: {
    media: number;
    mediana: number;
    taxaAprovacao: number;
    minimo: number;
    maximo: number;
  };
} {
  const crs: number[] = [];
  
  for (let i = 0; i < quantidade; i++) {
    crs.push(gerarCRRealista(modo));
  }
  
  const sorted = [...crs].sort((a, b) => a - b);
  const n = crs.length;
  
  const media = crs.reduce((a, b) => a + b, 0) / n;
  const mediana = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];
  const taxaAprovacao = crs.filter(cr => cr <= 0.10).length / n;
  
  return {
    crs,
    estatisticas: {
      media,
      mediana,
      taxaAprovacao,
      minimo: sorted[0],
      maximo: sorted[n - 1]
    }
  };
}

/**
 * Formata CR para exibição
 */
export function formatarCR(cr: number): string {
  return `${(cr * 100).toFixed(1)}%`;
}

/**
 * Classifica CR em categorias
 */
export function classificarCR(cr: number): 'excelente' | 'aceitavel' | 'toleravel' | 'questionavel' | 'inconsistente' {
  if (cr <= 0.05) return 'excelente';
  if (cr <= 0.10) return 'aceitavel';
  if (cr <= 0.15) return 'toleravel';
  if (cr <= 0.25) return 'questionavel';
  return 'inconsistente';
}

/**
 * Gera matriz de comparação pareada com CR alvo aproximado
 * Usa perturbação controlada a partir de matriz consistente
 */
export function gerarMatrizComCRAlvo(n: number, crAlvo: number): {
  matriz: number[][];
  crObtido: number;
  pesos: number[];
} {
  // Passo 1: Gerar pesos aleatórios normalizados
  const pesosRaw = Array.from({ length: n }, () => Math.random() + 0.1);
  const somaPesos = pesosRaw.reduce((a, b) => a + b, 0);
  const pesos = pesosRaw.map(p => p / somaPesos);
  
  // Passo 2: Construir matriz perfeitamente consistente
  const matriz: number[][] = Array.from({ length: n }, () => Array(n).fill(1));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const ratio = pesos[i] / pesos[j];
        // Arredondar para escala Saaty mais próxima
        matriz[i][j] = arredondarParaSaaty(ratio);
        matriz[j][i] = 1 / matriz[i][j];
      }
    }
  }
  
  // Passo 3: Introduzir perturbação para atingir CR alvo
  const ri = calcularRI(n);
  if (ri === 0 || crAlvo < 0.01) {
    return { matriz, crObtido: 0, pesos };
  }
  
  // Calcular quantas perturbações são necessárias
  const numPerturbacoes = Math.ceil(crAlvo * 10); // Heurística
  
  for (let p = 0; p < numPerturbacoes; p++) {
    // Escolher posição aleatória (apenas triângulo superior)
    const i = Math.floor(Math.random() * (n - 1));
    const j = i + 1 + Math.floor(Math.random() * (n - i - 1));
    
    if (i < n && j < n && i !== j) {
      // Perturbar para valor Saaty adjacente
      const valorAtual = matriz[i][j];
      const perturbacao = Math.random() > 0.5 ? 1 : -1;
      const novoValor = perturbarSaaty(valorAtual, perturbacao);
      
      matriz[i][j] = novoValor;
      matriz[j][i] = 1 / novoValor;
    }
  }
  
  // Calcular CR obtido
  const crObtido = calcularCRMatriz(matriz, n);
  
  return { matriz, crObtido, pesos };
}

/**
 * Arredonda um ratio para o valor mais próximo na escala Saaty
 */
function arredondarParaSaaty(ratio: number): number {
  const escalaSaaty = [1/9, 1/8, 1/7, 1/6, 1/5, 1/4, 1/3, 1/2, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  let melhor = 1;
  let melhorDist = Math.abs(ratio - 1);
  
  for (const valor of escalaSaaty) {
    const dist = Math.abs(ratio - valor);
    if (dist < melhorDist) {
      melhorDist = dist;
      melhor = valor;
    }
  }
  
  return melhor;
}

/**
 * Perturba um valor Saaty para o adjacente
 */
function perturbarSaaty(valor: number, direcao: number): number {
  const escalaSaaty = [1/9, 1/8, 1/7, 1/6, 1/5, 1/4, 1/3, 1/2, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  // Encontrar índice atual
  let idx = escalaSaaty.findIndex(v => Math.abs(v - valor) < 0.01);
  if (idx === -1) idx = 8; // Default para 1
  
  // Mover na direção indicada
  const novoIdx = Math.max(0, Math.min(escalaSaaty.length - 1, idx + direcao));
  
  return escalaSaaty[novoIdx];
}

/**
 * Calcula CR de uma matriz de comparação pareada
 */
export function calcularCRMatriz(matriz: number[][], n: number): number {
  if (n <= 2) return 0;
  
  // Calcular autovetor principal (método das potências simplificado)
  let pesos = Array(n).fill(1 / n);
  
  for (let iter = 0; iter < 100; iter++) {
    const novosPesos = Array(n).fill(0);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        novosPesos[i] += matriz[i][j] * pesos[j];
      }
    }
    
    const soma = novosPesos.reduce((a, b) => a + b, 0);
    pesos = novosPesos.map(p => p / soma);
  }
  
  // Calcular λmax
  let lambdaMax = 0;
  for (let i = 0; i < n; i++) {
    let soma = 0;
    for (let j = 0; j < n; j++) {
      soma += matriz[i][j] * pesos[j];
    }
    lambdaMax += soma / pesos[i];
  }
  lambdaMax /= n;
  
  // Calcular CI e CR
  const ci = (lambdaMax - n) / (n - 1);
  const ri = calcularRI(n);
  
  if (ri === 0) return 0;
  
  return ci / ri;
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CONFIGURACAO_MODOS_CR,
  calcularRI,
  gerarCRRealista,
  gerarLoteCR,
  formatarCR,
  classificarCR,
  gerarMatrizComCRAlvo,
  calcularCRMatriz
};
