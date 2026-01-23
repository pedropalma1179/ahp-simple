// lib/ahp.ts

// Construir matriz de comparação a partir dos julgamentos
export function buildMatrix(items: string[], judgments: any[]): number[][] {
  const n = items.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));
  
  judgments.forEach(j => {
    const i = items.indexOf(j.itemA);
    const k = items.indexOf(j.itemB);
    if (i === -1 || k === -1) return;
    
    let value = j.saatyValue;
    if (j.favors === 'B') {
      matrix[i][k] = 1 / value;
      matrix[k][i] = value;
    } else if (j.favors === 'A') {
      matrix[i][k] = value;
      matrix[k][i] = 1 / value;
    } else {
      matrix[i][k] = 1;
      matrix[k][i] = 1;
    }
  });
  
  return matrix;
}

// Calcular vetor de prioridades usando método da potência
export function calculatePriorityVector(matrix: number[][]): number[] {
  const n = matrix.length;
  let vector = Array(n).fill(1 / n);
  
  for (let iter = 0; iter < 100; iter++) {
    const newVector = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        newVector[i] += matrix[i][j] * vector[j];
      }
    }
    const sum = newVector.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) newVector[i] /= sum;
    
    let diff = 0;
    for (let i = 0; i < n; i++) diff += Math.abs(newVector[i] - vector[i]);
    vector = newVector;
    if (diff < 0.0001) break;
  }
  
  return vector;
}

// Calcular índice de consistência
export function calculateConsistency(matrix: number[][]): { ci: number; cr: number; lambda: number } {
  const n = matrix.length;
  const weights = calculatePriorityVector(matrix);
  
  let lambda = 0;
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += matrix[i][j] * weights[j];
    }
    lambda += sum / weights[i];
  }
  lambda /= n;
  
  const ci = (lambda - n) / (n - 1);
  const RI = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49, 1.51, 1.54, 1.56, 1.57, 1.59];
  const ri = RI[n] || 1.59;
  const cr = ri === 0 ? 0 : ci / ri;
  
  return { ci, cr, lambda };
}

// Agregar matrizes usando média geométrica
export function aggregateMatrices(matrices: number[][][]): number[][] {
  if (matrices.length === 0) return [];
  if (matrices.length === 1) return matrices[0];
  
  const n = matrices[0].length;
  const result: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let product = 1;
      let count = 0;
      for (const matrix of matrices) {
        if (matrix[i] && matrix[i][j] && matrix[i][j] > 0) {
          product *= matrix[i][j];
          count++;
        }
      }
      result[i][j] = count > 0 ? Math.pow(product, 1 / count) : 1;
    }
  }
  
  return result;
}

// Calcular score global usando fórmula aditiva BOCR: (B+O) - (C+R)
export function calculateGlobalScore(
  bocrWeights: number[],
  subWeights: Record<string, number[]>,
  altScores: Record<string, Record<string, number[]>>,
  alternatives: { code: string; name: string }[]
): { code: string; score: number; B: number; O: number; C: number; R: number }[] {
  const results: { code: string; score: number; B: number; O: number; C: number; R: number }[] = [];
  
  alternatives.forEach((alt, altIdx) => {
    let B = 0, O = 0, C = 0, R = 0;
    
    ['B', 'O', 'C', 'R'].forEach((group, groupIdx) => {
      const groupWeight = bocrWeights[groupIdx];
      const subW = subWeights[group] || [];
      const subScores = altScores[group] || {};
      
      let groupScore = 0;
      Object.keys(subScores).forEach((subCode, subIdx) => {
        const localWeight = subW[subIdx] || 0;
        const altScore = subScores[subCode]?.[altIdx] || 0;
        groupScore += localWeight * altScore;
      });
      
      if (group === 'B') B = groupScore;
      else if (group === 'O') O = groupScore;
      else if (group === 'C') C = groupScore;
      else if (group === 'R') R = groupScore;
    });
    
    // Fórmula aditiva: (wB*B + wO*O) - (wC*C + wR*R)
    const score = (bocrWeights[0] * B + bocrWeights[1] * O) - (bocrWeights[2] * C + bocrWeights[3] * R);
    
    results.push({ code: alt.code, score, B, O, C, R });
  });
  
  return results;
}
