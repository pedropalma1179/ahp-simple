// components/q1-features/index.ts
// Exportações de todos os componentes Q1/A1 Compliant
// Para uso na página de resultados

export { default as BOCRPrioritiesTable } from '../BOCRPrioritiesTable';
export { default as MethodComparisonTable } from '../MethodComparisonTable';
export { default as SensitivityAnalysisPanel } from '../SensitivityAnalysisPanel';
export { default as NegativePriorityAlert } from '../NegativePriorityAlert';

// Types para usar nos componentes
export interface BOCRPriority {
  code: string;
  name: string;
  B: number;
  O: number;
  C: number;
  R: number;
  C_reciprocal: number;
  R_reciprocal: number;
}

export interface AlternativeScore {
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

export interface MethodConcordance {
  totalMethods: number;
  agreeMethods: number;
  agreementPercent: number;
  consensusWinner: string | null;
  divergentMethods: string[];
  rankingsByMethod: Record<string, string[]>;
  robustnessLevel: 'excellent' | 'good' | 'acceptable' | 'poor';
  robustnessLabel: string;
}

export interface SensitivityItem {
  merit: string;
  meritName: string;
  inflectionPoint: number | null;
  classification: 'robust' | 'moderate' | 'sensitive' | 'critical' | 'stable';
  classificationLabel: string;
  currentWinner: string;
  newWinner: string | null;
  changeDescription: string;
}

export interface NegativeAlternative {
  code: string;
  name: string;
  score: number;
  message: string;
}

export interface Q1Alerts {
  hasNegativePriorities: boolean;
  negativeAlternatives: NegativeAlternative[];
  sensitivityCritical: SensitivityItem[];
  lowConcordance: boolean;
}
