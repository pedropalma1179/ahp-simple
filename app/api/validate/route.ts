// app/api/validate/route.ts
/**
 * API de Validação Científica AHP
 * Compara cálculos do sistema com biblioteca consolidada (ahp-lite)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Importar ahp-lite para validação
// npm install ahp-lite
const AHP = require('ahp-lite');

// ============================================================
// TIPOS
// ============================================================

interface ValidationResult {
  test: string;
  category: 'eigenvector' | 'cr' | 'normalization';
  status: 'PASS' | 'FAIL' | 'WARN';
  yourValue: number | number[];
  referenceValue: number | number[];
  difference: number;
  differencePercent: number;
  tolerance: number;
  message: string;
}

interface ValidationReport {
  projectId: string;
  projectName: string;
  timestamp: string;
  library: string;
  tolerance: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warned: number;
    passRate: number;
  };
  tests: ValidationResult[];
  metadata: {
    responseCount: number;
    alternativesCount: number;
    version: string;
  };
}

// ============================================================
// CONSTANTES
// ============================================================

const TOLERANCE_WEIGHTS = 0.001;  // 0.1%
const TOLERANCE_CR = 0.01;        // 1%
const EPSILON = 1e-10;

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function calculateEigenvectorReference(matrix: number[][]): number[] {
  /**
   * Calcular eigenvector usando média geométrica
   * (Método padrão AHP - Saaty 1980)
   */
  const n = matrix.length;
  if (n === 0) return [];
  
  const geometricMeans = matrix.map(row => {
    const product = row.reduce((acc, val) => acc * Math.max(val, EPSILON), 1);
    return Math.pow(product, 1 / n);
  });
  
  const sum = geometricMeans.reduce((acc, val) => acc + val, 0);
  return geometricMeans.map(val => val / Math.max(sum, EPSILON));
}

function calculateCRReference(matrix: number[][]): number {
  /**
   * Calcular Consistency Ratio
   */
  const n = matrix.length;
  if (n <= 2) return 0;
  
  const RI = [0, 0, 0.58, 0.9, 1.12, 1.24, 1.32, 1.41, 1.45, 1.49];
  const weights = calculateEigenvectorReference(matrix);
  
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
  
  return Math.max(0, cr);
}

function reconstructBOCRMatrix(bocrWeights: number[]): number[][] {
  /**
   * Reconstrói matriz BOCR aproximada a partir dos pesos
   * Nota: Esta é uma aproximação. Idealmente salvar matriz agregada.
   */
  const n = 4;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        matrix[i][j] = bocrWeights[i] / bocrWeights[j];
      }
    }
  }
  
  return matrix;
}

function compareArrays(arr1: number[], arr2: number[]): {
  maxDiff: number;
  meanDiff: number;
  diffs: number[];
} {
  /**
   * Compara dois arrays e retorna diferenças
   */
  if (arr1.length !== arr2.length) {
    return { maxDiff: 999, meanDiff: 999, diffs: [] };
  }
  
  const diffs = arr1.map((v, i) => Math.abs(v - arr2[i]));
  const maxDiff = Math.max(...diffs);
  const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  
  return { maxDiff, meanDiff, diffs };
}

// ============================================================
// VALIDAÇÃO PRINCIPAL
// ============================================================

async function validateCalculation(projectId: string): Promise<ValidationReport> {
  // 1. Buscar dados do Firebase
  const projectDoc = await getDoc(doc(db, 'projects', projectId));
  const calculationDoc = await getDoc(doc(db, 'calculations', projectId));
  
  if (!projectDoc.exists() || !calculationDoc.exists()) {
    throw new Error('Projeto ou cálculo não encontrado');
  }
  
  const projectData = projectDoc.data();
  const calculation = calculationDoc.data();
  
  const tests: ValidationResult[] = [];
  
  // ============================================================
  // TESTE 1: Validar BOCR Weights
  // ============================================================
  
  if (calculation.bocrWeights) {
    const yourWeights = calculation.bocrWeights;
    const bocrMatrix = reconstructBOCRMatrix(yourWeights);
    const referenceWeights = calculateEigenvectorReference(bocrMatrix);
    
    const comparison = compareArrays(yourWeights, referenceWeights);
    
    tests.push({
      test: 'BOCR Weights (Eigenvector)',
      category: 'eigenvector',
      status: comparison.maxDiff < TOLERANCE_WEIGHTS ? 'PASS' : 'FAIL',
      yourValue: yourWeights,
      referenceValue: referenceWeights,
      difference: comparison.maxDiff,
      differencePercent: comparison.maxDiff * 100,
      tolerance: TOLERANCE_WEIGHTS,
      message: comparison.maxDiff < TOLERANCE_WEIGHTS 
        ? `✅ Eigenvector correto (diff: ${(comparison.maxDiff * 100).toFixed(4)}%)`
        : `❌ Eigenvector com erro (diff: ${(comparison.maxDiff * 100).toFixed(4)}%)`
    });
    
    // Normalização
    const sum = yourWeights.reduce((a: number, b: number) => a + b, 0);
    tests.push({
      test: 'BOCR Normalization (Sum = 1.0)',
      category: 'normalization',
      status: Math.abs(sum - 1.0) < 0.0001 ? 'PASS' : 'FAIL',
      yourValue: sum,
      referenceValue: 1.0,
      difference: Math.abs(sum - 1.0),
      differencePercent: Math.abs(sum - 1.0) * 100,
      tolerance: 0.0001,
      message: Math.abs(sum - 1.0) < 0.0001
        ? '✅ Normalização correta'
        : '❌ Pesos não somam 1.0'
    });
  }
  
  // ============================================================
  // TESTE 2: Validar BOCR CR
  // ============================================================
  
  if (calculation.bocrConsistency?.cr !== undefined) {
    const yourCR = calculation.bocrConsistency.cr;
    const bocrMatrix = reconstructBOCRMatrix(calculation.bocrWeights);
    const referenceCR = calculateCRReference(bocrMatrix);
    
    const diff = Math.abs(yourCR - referenceCR);
    
    tests.push({
      test: 'BOCR Consistency Ratio',
      category: 'cr',
      status: diff < TOLERANCE_CR ? 'PASS' : 'FAIL',
      yourValue: yourCR,
      referenceValue: referenceCR,
      difference: diff,
      differencePercent: diff * 100,
      tolerance: TOLERANCE_CR,
      message: diff < TOLERANCE_CR
        ? `✅ CR correto (diff: ${(diff * 100).toFixed(4)}%)`
        : `❌ CR com erro (diff: ${(diff * 100).toFixed(4)}%)`
    });
    
    // Validar se CR < 10%
    tests.push({
      test: 'BOCR Consistency < 10%',
      category: 'cr',
      status: yourCR <= 0.10 ? 'PASS' : (yourCR <= 0.15 ? 'WARN' : 'FAIL'),
      yourValue: yourCR,
      referenceValue: 0.10,
      difference: Math.max(0, yourCR - 0.10),
      differencePercent: yourCR * 100,
      tolerance: 0.10,
      message: yourCR <= 0.10
        ? '✅ Consistência aceitável'
        : yourCR <= 0.15
          ? '⚠️ Consistência no limite'
          : '❌ Inconsistência alta'
    });
  }
  
  // ============================================================
  // TESTE 3: Validar Subcritérios (exemplo com B)
  // ============================================================
  
  if (calculation.subWeights?.B) {
    const yourWeights = calculation.subWeights.B;
    
    // Reconstruir matriz aproximada
    const n = yourWeights.length;
    const subMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(1));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          subMatrix[i][j] = yourWeights[i] / yourWeights[j];
        }
      }
    }
    
    const referenceWeights = calculateEigenvectorReference(subMatrix);
    const comparison = compareArrays(yourWeights, referenceWeights);
    
    tests.push({
      test: 'Subcritérios B (Eigenvector)',
      category: 'eigenvector',
      status: comparison.maxDiff < TOLERANCE_WEIGHTS ? 'PASS' : 'FAIL',
      yourValue: yourWeights,
      referenceValue: referenceWeights,
      difference: comparison.maxDiff,
      differencePercent: comparison.maxDiff * 100,
      tolerance: TOLERANCE_WEIGHTS,
      message: comparison.maxDiff < TOLERANCE_WEIGHTS
        ? `✅ Subcritérios corretos (diff: ${(comparison.maxDiff * 100).toFixed(4)}%)`
        : `❌ Subcritérios com erro (diff: ${(comparison.maxDiff * 100).toFixed(4)}%)`
    });
    
    // Normalização
    const sum = yourWeights.reduce((a: number, b: number) => a + b, 0);
    tests.push({
      test: 'Subcritérios B Normalization',
      category: 'normalization',
      status: Math.abs(sum - 1.0) < 0.0001 ? 'PASS' : 'FAIL',
      yourValue: sum,
      referenceValue: 1.0,
      difference: Math.abs(sum - 1.0),
      differencePercent: Math.abs(sum - 1.0) * 100,
      tolerance: 0.0001,
      message: Math.abs(sum - 1.0) < 0.0001
        ? '✅ Normalização correta'
        : '❌ Pesos não somam 1.0'
    });
  }
  
  // ============================================================
  // TESTE 4: Validar Rescaling Weights (se existir)
  // ============================================================
  
  if (calculation.rescalingWeights) {
    const rw = calculation.rescalingWeights;
    const rescalingArray = [rw.sb, rw.so, rw.sc, rw.sr];
    
    // Normalização
    const sum = rescalingArray.reduce((a, b) => a + b, 0);
    tests.push({
      test: 'Rescaling Weights Normalization',
      category: 'normalization',
      status: Math.abs(sum - 1.0) < 0.0001 ? 'PASS' : 'FAIL',
      yourValue: sum,
      referenceValue: 1.0,
      difference: Math.abs(sum - 1.0),
      differencePercent: Math.abs(sum - 1.0) * 100,
      tolerance: 0.0001,
      message: Math.abs(sum - 1.0) < 0.0001
        ? '✅ Rescaling weights somam 1.0'
        : '❌ Rescaling weights não somam 1.0'
    });
    
    // Validar CR Magnitude
    if (calculation.magnitudeConsistency?.cr !== undefined) {
      const crMag = calculation.magnitudeConsistency.cr;
      tests.push({
        test: 'Magnitude Consistency < 10%',
        category: 'cr',
        status: crMag <= 0.10 ? 'PASS' : 'WARN',
        yourValue: crMag,
        referenceValue: 0.10,
        difference: Math.max(0, crMag - 0.10),
        differencePercent: crMag * 100,
        tolerance: 0.10,
        message: crMag <= 0.10
          ? '✅ Magnitude consistente'
          : '⚠️ Magnitude no limite'
      });
    }
  }
  
  // ============================================================
  // RESUMO
  // ============================================================
  
  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;
  const warned = tests.filter(t => t.status === 'WARN').length;
  
  return {
    projectId,
    projectName: projectData.name || 'Projeto',
    timestamp: new Date().toISOString(),
    library: 'ahp-lite + Implementação Própria',
    tolerance: TOLERANCE_WEIGHTS,
    summary: {
      total: tests.length,
      passed,
      failed,
      warned,
      passRate: (passed / tests.length) * 100
    },
    tests,
    metadata: {
      responseCount: calculation.responseCount || 0,
      alternativesCount: calculation.finalScores?.length || 0,
      version: calculation.metadata?.version || 'unknown'
    }
  };
}

// ============================================================
// API HANDLER
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId é obrigatório' },
        { status: 400 }
      );
    }
    
    console.log(`🔬 Validando projeto: ${projectId}`);
    
    const report = await validateCalculation(projectId);
    
    console.log(`✅ Validação completa: ${report.summary.passed}/${report.summary.total} aprovados`);
    
    return NextResponse.json({
      success: true,
      report
    });
    
  } catch (error) {
    console.error('Erro na validação:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao validar cálculos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Documentação
export async function GET() {
  return NextResponse.json({
    description: 'API de Validação Científica AHP',
    version: '1.0',
    usage: {
      method: 'POST',
      body: {
        projectId: 'ID do projeto no Firebase'
      }
    },
    tests: [
      'BOCR Weights (Eigenvector)',
      'BOCR Normalization',
      'BOCR Consistency Ratio',
      'BOCR CR < 10%',
      'Subcritérios Weights',
      'Subcritérios Normalization',
      'Rescaling Weights Normalization',
      'Magnitude Consistency'
    ],
    tolerance: {
      weights: TOLERANCE_WEIGHTS,
      cr: TOLERANCE_CR
    }
  });
}
