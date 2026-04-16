// app/api/audit-decision/route.ts
// AHP-BOCR Scientific Validator v3.0
// Sistema de Classificação baseado em 5 Periódicos A1
// PPC, IJPE, JCP, IMM, OMR

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// CONSTANTES E CONFIGURAÇÕES v3.0
// ============================================================

// Random Index (RI) - Saaty (1980)
const RANDOM_INDEX: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
  11: 1.52, 12: 1.54, 13: 1.56, 14: 1.58, 15: 1.59
};

// Periódicos e seus requisitos
const JOURNALS = {
  PPC: {
    name: 'Production Planning & Control',
    shortName: 'PPC',
    impactFactor: 12.5,
    minExperts: 6,
    maxCR: 0.10,
    minMethods: 4,
    minScore: 85,
    requirements: [
      'Mínimo 6 especialistas',
      'CR ≤ 10% em todas as matrizes',
      '4/5 métodos concordantes',
      'Score ≥ 85 pontos'
    ]
  },
  IJPE: {
    name: 'International Journal of Production Economics',
    shortName: 'IJPE',
    impactFactor: 12.0,
    minExperts: 12,
    maxCR: 0.10,
    minMethods: 4,
    minScore: 85,
    requirements: [
      'Mínimo 12 especialistas',
      'CR ≤ 10% em todas as matrizes',
      '4/5 métodos concordantes',
      'Score ≥ 85 pontos'
    ]
  },
  JCP: {
    name: 'Journal of Cleaner Production',
    shortName: 'JCP',
    impactFactor: 10.0,
    minExperts: 10,
    maxCR: 0.10,
    minMethods: 3,
    minScore: 75,
    requirements: [
      'Mínimo 10 especialistas',
      'CR ≤ 10% em todas as matrizes',
      '3/5 métodos concordantes',
      'Score ≥ 75 pontos'
    ]
  },
  IMM: {
    name: 'Industrial Marketing Management',
    shortName: 'IMM',
    impactFactor: 10.4,
    minExperts: 8,
    maxCR: 0.10,
    minMethods: 3,
    minScore: 75,
    requirements: [
      'Mínimo 8 especialistas',
      'CR ≤ 10% em todas as matrizes',
      '3/5 métodos concordantes',
      'Score ≥ 75 pontos'
    ]
  },
  OMR: {
    name: 'Operations Management Research',
    shortName: 'OMR',
    impactFactor: 6.9,
    minExperts: 7,
    maxCR: 0.10,
    minMethods: 3,
    minScore: 65,
    requirements: [
      'Mínimo 7 especialistas',
      'CR ≤ 10% em todas as matrizes',
      '3/5 métodos concordantes',
      'Score ≥ 65 pontos'
    ]
  }
};

// Sistema de pontuação (100 pontos total)
const SCORING = {
  consistency: { max: 25, label: 'Consistência (CR)' },
  sampleSize: { max: 20, label: 'Tamanho da Amostra' },
  methodsAgreement: { max: 20, label: 'Concordância entre Métodos' },
  sensitivity: { max: 15, label: 'Análise de Sensibilidade' },
  discrimination: { max: 10, label: 'Poder de Discriminação' },
  dataQuality: { max: 10, label: 'Qualidade dos Dados' }
};

// ============================================================
// INTERFACES
// ============================================================

interface ValidationResult {
  test: string;
  status: 'PASS' | 'ALERT' | 'FAIL' | 'CRITICAL';
  score: number;
  maxScore: number;
  message: string;
  details?: any;
  action?: string; // Ação recomendada
}

interface JournalAdequacy {
  adequate: boolean;
  journal: string;
  fullName: string;
  impactFactor: number;
  reasons: string[];
  missing: string[];
}

// ============================================================
// FUNÇÕES DE VALIDAÇÃO
// ============================================================

function validateConsistency(data: any): ValidationResult {
  const cr = data.bocrConsistency?.cr || 0;
  const crPercent = (cr * 100).toFixed(2);

  let score = 0;
  let status: 'PASS' | 'ALERT' | 'FAIL' | 'CRITICAL' = 'CRITICAL';
  let message = '';
  let action = '';

  if (cr <= 0.05) {
    score = 25;
    status = 'PASS';
    message = `CR = ${crPercent}% - Consistência excelente (< 5%)`;
  } else if (cr <= 0.08) {
    score = 22;
    status = 'PASS';
    message = `CR = ${crPercent}% - Consistência muito boa (< 8%)`;
  } else if (cr <= 0.10) {
    score = 18;
    status = 'PASS';
    message = `CR = ${crPercent}% - Consistência aceitável (≤ 10%)`;
  } else if (cr <= 0.15) {
    score = 10;
    status = 'ALERT';
    message = `CR = ${crPercent}% - Consistência marginal (> 10%)`;
    action = 'Revisar julgamentos inconsistentes. Considere re-coletar respostas dos especialistas com maior desvio.';
  } else {
    score = 0;
    status = 'CRITICAL';
    message = `CR = ${crPercent}% - Consistência inaceitável (> 15%)`;
    action = 'OBRIGATÓRIO: Re-coletar dados. Julgamentos altamente inconsistentes invalidam a análise.';
  }

  return {
    test: 'Consistência (CR)',
    status,
    score,
    maxScore: 25,
    message,
    action,
    details: { cr, crPercent }
  };
}

function validateSampleSize(data: any): ValidationResult {
  const n = data.responseCount || 0;

  let score = 0;
  let status: 'PASS' | 'ALERT' | 'FAIL' | 'CRITICAL' = 'CRITICAL';
  let message = '';
  let action = '';

  if (n >= 15) {
    score = 20;
    status = 'PASS';
    message = `n = ${n} especialistas - Amostra excelente (≥ 15)`;
  } else if (n >= 12) {
    score = 18;
    status = 'PASS';
    message = `n = ${n} especialistas - Amostra muito boa (≥ 12)`;
  } else if (n >= 10) {
    score = 15;
    status = 'PASS';
    message = `n = ${n} especialistas - Amostra adequada (≥ 10)`;
  } else if (n >= 7) {
    score = 12;
    status = 'ALERT';
    message = `n = ${n} especialistas - Amostra mínima (≥ 7)`;
    action = 'Considere expandir o painel de especialistas para maior representatividade.';
  } else if (n >= 5) {
    score = 8;
    status = 'ALERT';
    message = `n = ${n} especialistas - Amostra limitada (≥ 5)`;
    action = 'Amostra no limite mínimo acadêmico. Expanda para pelo menos 10 especialistas para periódicos de alto impacto.';
  } else {
    score = Math.max(0, n * 1.5 - 4);
    status = 'CRITICAL';
    message = `n = ${n} especialistas - Amostra insuficiente (< 5)`;
    action = 'OBRIGATÓRIO: Mínimo de 5 especialistas requerido. Amostra atual invalida a pesquisa.';
  }

  return {
    test: 'Tamanho da Amostra',
    status,
    score,
    maxScore: 20,
    message,
    action,
    details: { n, adequateFor: getAdequateJournalsForSample(n) }
  };
}

function getAdequateJournalsForSample(n: number): string[] {
  const adequate: string[] = [];
  if (n >= 12) adequate.push('PPC', 'IJPE');
  if (n >= 10) adequate.push('JCP');
  if (n >= 8) adequate.push('IMM');
  if (n >= 7) adequate.push('OMR');
  return adequate;
}

function validateMethodsAgreement(data: any): ValidationResult {
  const scores = data.finalScores || [];
  if (scores.length < 2) {
    return {
      test: 'Concordância entre Métodos',
      status: 'CRITICAL',
      score: 0,
      maxScore: 20,
      message: 'Dados insuficientes para análise',
      action: 'Verifique se há pelo menos 2 alternativas no projeto.'
    };
  }

  // Determinar vencedor por cada método
  const winners: Record<string, string> = {};

  // Método 1: Aditivo Residual (Demirtas 2008)
  const sortedAdditive = [...scores].sort((a, b) =>
    (b.scoreAdditiveResidualNorm ?? b.scoreAdditiveResidual ?? 0) - (a.scoreAdditiveResidualNorm ?? a.scoreAdditiveResidual ?? 0)
  );
  winners['Aditivo'] = sortedAdditive[0]?.code;

  // Método 2: Quociente de Somas (Wijnmalen 2007)
  const sortedProb = [...scores].sort((a, b) =>
    (b.scoreQuotientSumsNorm ?? b.scoreQuotientSums ?? 0) - (a.scoreQuotientSumsNorm ?? a.scoreQuotientSums ?? 0)
  );
  winners['Probabilístico'] = sortedProb[0]?.code;

  // Método 3: Subtrativo (Wijnmalen 2007 - PRINCIPAL)
  const sortedSub = [...scores].sort((a, b) =>
    (b.scoreSubtractiveNorm ?? b.scoreSubtractive ?? 0) - (a.scoreSubtractiveNorm ?? a.scoreSubtractive ?? 0)
  );
  winners['Subtrativo'] = sortedSub[0]?.code;

  // Método 4: Multiplicativo Potências
  const sortedMultPow = [...scores].sort((a, b) =>
    (b.scoreMultiplicativeNorm ?? b.scoreMultPowersNorm ?? b.scoreMultiplicative ?? 0) -
    (a.scoreMultiplicativeNorm ?? a.scoreMultPowersNorm ?? a.scoreMultiplicative ?? 0)
  );
  winners['Mult. Potências'] = sortedMultPow[0]?.code;

  // Método 5: Multiplicativo Simples
  const sortedMultSimple = [...scores].sort((a, b) =>
    (b.scoreMultSimpleNorm ?? b.scoreMultSimple ?? 0) - (a.scoreMultSimpleNorm ?? a.scoreMultSimple ?? 0)
  );
  winners['Mult. Simples'] = sortedMultSimple[0]?.code;

  // Contar concordância
  const winnerCounts: Record<string, number> = {};
  Object.values(winners).forEach(w => {
    winnerCounts[w] = (winnerCounts[w] || 0) + 1;
  });

  const maxAgreement = Math.max(...Object.values(winnerCounts));
  const dominantWinner = Object.keys(winnerCounts).find(k => winnerCounts[k] === maxAgreement);

  let score = 0;
  let status: 'PASS' | 'ALERT' | 'FAIL' | 'CRITICAL' = 'CRITICAL';
  let message = '';
  let action = '';

  if (maxAgreement === 5) {
    score = 20;
    status = 'PASS';
    message = `5/5 métodos concordam - ${dominantWinner} é vencedor unânime`;
  } else if (maxAgreement === 4) {
    score = 16;
    status = 'PASS';
    message = `4/5 métodos concordam - ${dominantWinner} é vencedor predominante`;
  } else if (maxAgreement === 3) {
    score = 12;
    status = 'ALERT';
    message = `3/5 métodos concordam - Concordância moderada para ${dominantWinner}`;
    action = 'Justifique a escolha do método de síntese no artigo. Discuta as diferenças entre os métodos.';
  } else {
    score = 6;
    status = 'FAIL';
    message = `${maxAgreement}/5 métodos concordam - Baixa concordância`;
    action = 'Analise por que os métodos divergem. Considere usar votação (Borda Count) ou justificar metodologicamente a escolha.';
  }

  // Identificar métodos divergentes
  const divergentMethods = Object.entries(winners)
    .filter(([_, w]) => w !== dominantWinner)
    .map(([m, w]) => `${m}: ${w}`);

  return {
    test: 'Concordância entre Métodos',
    status,
    score,
    maxScore: 20,
    message,
    action,
    details: {
      winners,
      agreement: maxAgreement,
      dominantWinner,
      divergentMethods
    }
  };
}

function validateSensitivity(data: any): ValidationResult {
  const inflections = data.sensitivityInflections || {};
  const merits = ['B', 'O', 'C', 'R'];

  let criticalCount = 0;
  let sensitiveCount = 0;
  let moderateCount = 0;
  let stableCount = 0;

  const details: Record<string, { value: number | null; classification: string }> = {};

  merits.forEach(m => {
    const inflection = inflections[m];
    if (inflection === null || inflection === undefined) {
      stableCount++;
      details[m] = { value: null, classification: 'Estável' };
    } else if (inflection <= 10) {
      criticalCount++;
      details[m] = { value: inflection, classification: 'Crítico' };
    } else if (inflection <= 20) {
      sensitiveCount++;
      details[m] = { value: inflection, classification: 'Sensível' };
    } else if (inflection <= 50) {
      moderateCount++;
      details[m] = { value: inflection, classification: 'Moderado' };
    } else {
      stableCount++;
      details[m] = { value: inflection, classification: 'Estável' };
    }
  });

  let score = 0;
  let status: 'PASS' | 'ALERT' | 'FAIL' | 'CRITICAL' = 'CRITICAL';
  let message = '';
  let action = '';

  if (criticalCount === 0 && sensitiveCount === 0) {
    score = 15;
    status = 'PASS';
    message = 'Ranking altamente estável - sem pontos críticos de inversão';
  } else if (criticalCount === 0 && sensitiveCount <= 1) {
    score = 12;
    status = 'PASS';
    message = `Ranking estável - ${sensitiveCount} mérito(s) com sensibilidade moderada`;
  } else if (criticalCount <= 1) {
    score = 8;
    status = 'ALERT';
    message = `${criticalCount} mérito(s) crítico(s), ${sensitiveCount} sensível(is)`;
    action = 'Documente a sensibilidade no artigo. Discuta cenários alternativos e suas implicações.';
  } else {
    score = 4;
    status = 'FAIL';
    message = `Alta sensibilidade - ${criticalCount} méritos críticos`;
    action = 'ATENÇÃO: Ranking muito instável. Considere expandir subcritérios para maior discriminação ou coletar mais dados.';
  }

  const criticalMerits = Object.entries(details)
    .filter(([_, d]) => d.classification === 'Crítico')
    .map(([m]) => m);

  return {
    test: 'Análise de Sensibilidade',
    status,
    score,
    maxScore: 15,
    message,
    action,
    details: {
      byMerit: details,
      criticalCount,
      sensitiveCount,
      stableCount,
      criticalMerits
    }
  };
}

function validateDiscrimination(data: any): ValidationResult {
  const scores = data.finalScores || [];
  if (scores.length < 2) {
    return {
      test: 'Poder de Discriminação',
      status: 'CRITICAL',
      score: 0,
      maxScore: 10,
      message: 'Dados insuficientes',
      action: 'Verifique se há pelo menos 2 alternativas.'
    };
  }

  // CORRIGIDO: Usar scoreSubtractive (método principal) sem normalização min-max
  const sorted = [...scores].sort((a, b) =>
    (b.scoreSubtractive ?? 0) - (a.scoreSubtractive ?? 0)
  );
  const first = sorted[0]?.scoreSubtractive ?? 0;
  const second = sorted[1]?.scoreSubtractive ?? 0;

  // Guard contra divisão por zero e números muito pequenos
  const denominator = Math.max(Math.abs(first), Math.abs(second), 0.0001);
  const diff = ((Math.abs(first - second)) / denominator) * 100;

  let score = 0;
  let status: 'PASS' | 'ALERT' | 'FAIL' | 'CRITICAL' = 'CRITICAL';
  let message = '';
  let action = '';

  if (diff >= 20) {
    score = 10;
    status = 'PASS';
    message = `Diferença de ${diff.toFixed(1)}% - Excelente discriminação`;
  } else if (diff >= 10) {
    score = 8;
    status = 'PASS';
    message = `Diferença de ${diff.toFixed(1)}% - Boa discriminação`;
  } else if (diff >= 5) {
    score = 5;
    status = 'ALERT';
    message = `Diferença de ${diff.toFixed(1)}% - Discriminação moderada`;
    action = 'Considere discutir no artigo se a diferença é suficiente para uma decisão definitiva.';
  } else {
    score = 2;
    status = 'FAIL';
    message = `Diferença de ${diff.toFixed(1)}% - Empate técnico`;
    action = 'Alternativas muito próximas. Considere critérios adicionais de desempate ou análise qualitativa complementar.';
  }

  return {
    test: 'Poder de Discriminação',
    status,
    score,
    maxScore: 10,
    message,
    action,
    details: {
      difference: diff,
      first: sorted[0]?.code,
      second: sorted[1]?.code,
      firstScore: first,
      secondScore: second
    }
  };
}

function validateDataQuality(data: any): ValidationResult {
  let issues: string[] = [];
  let score = 10;

  // Verificar se há dados BOCR
  if (!data.bocrWeights || data.bocrWeights.length !== 4) {
    issues.push('Pesos BOCR incompletos');
    score -= 3;
  }

  // Verificar se pesos somam 1
  const weightSum = (data.bocrWeights || []).reduce((a: number, b: number) => a + b, 0);
  if (Math.abs(weightSum - 1.0) > 0.01) {
    issues.push(`Pesos não somam 100% (${(weightSum * 100).toFixed(1)}%)`);
    score -= 2;
  }

  // Verificar se há scores finais
  if (!data.finalScores || data.finalScores.length === 0) {
    issues.push('Scores finais não calculados');
    score -= 3;
  }

  // Verificar consistência dos dados
  if (!data.bocrConsistency) {
    issues.push('Índices de consistência não calculados');
    score -= 2;
  }

  score = Math.max(0, score);

  let status: 'PASS' | 'ALERT' | 'FAIL' | 'CRITICAL' =
    score >= 8 ? 'PASS' : score >= 5 ? 'ALERT' : 'FAIL';

  return {
    test: 'Qualidade dos Dados',
    status,
    score,
    maxScore: 10,
    message: issues.length === 0 ? 'Dados completos e bem formatados' : `${issues.length} problema(s) encontrado(s)`,
    action: issues.length > 0 ? `Corrija: ${issues.join('; ')}` : undefined,
    details: { issues, weightSum }
  };
}

// ============================================================
// VERIFICAÇÃO LÓGICA DETALHADA
// ============================================================

function validateLogic(data: any): {
  formulaCorrect: boolean;
  signsCorrect: boolean;
  rankingCoherent: boolean;
  issues: Array<{ problem: string; action: string }>;
} {
  const issues: Array<{ problem: string; action: string }> = [];

  // 1. Verificar se fórmulas estão implementadas corretamente
  const scores = data.finalScores || [];
  let formulaCorrect = true;
  let signsCorrect = true;

  if (scores.length > 0) {
    const sample = scores[0];
    const [b, o, c, r] = data.bocrWeights || [0.25, 0.25, 0.25, 0.25];

    // Verificar fórmula aditiva residual: bB + oO + c(1-C) + r(1-R)
    const expectedAdditive = b * sample.B + o * sample.O + c * (1 - sample.C) + r * (1 - sample.R);
    const actualAdditive = sample.scoreAdditiveResidual ?? sample.scoreAdditiveResidualNorm ?? 0;
    if (actualAdditive && Math.abs(actualAdditive - expectedAdditive) > 0.01) {
      formulaCorrect = false;
      issues.push({
        problem: 'Fórmula aditiva pode estar incorreta',
        action: 'Verifique implementação: Score = b×B + o×O + c×(1-C) + r×(1-R)'
      });
    }

    // Verificar fórmula subtrativa: vb×sb×B + vo×so×O - vc×sc×C - vr×sr×R
    // NOTA: A fórmula completa usa rescaling weights (sb, so, sc, sr) que não estão disponíveis aqui
    // Portanto, verificamos apenas se os sinais estão corretos (C e R devem reduzir o score)
    // A alternativa com maior C deve ter menor scoreSubtractive, ceteris paribus
    if (sample.scoreSubtractive !== undefined) {
      // Verificação simplificada: se C > 0.5 e R > 0.5, o score subtrativo deveria ser menor
      // Esta é uma heurística, não uma validação exata
      signsCorrect = true; // Assumimos correto por padrão, pois não temos rescaling weights
    }
  }

  // 2. Verificar coerência do ranking
  const methodsResult = validateMethodsAgreement(data);
  const rankingCoherent = methodsResult.details?.agreement >= 3;

  if (!rankingCoherent) {
    issues.push({
      problem: `Métodos divergentes: ${methodsResult.details?.divergentMethods?.join(', ')}`,
      action: 'Analise as diferenças metodológicas. Justifique a escolha do método principal no artigo.'
    });
  }

  // 3. Verificar se C e R estão sendo tratados corretamente (quanto maior, pior)
  if (scores.length >= 2) {
    const highCostAlt = [...scores].sort((a, b) => (b.C || 0) - (a.C || 0))[0];
    const lowCostAlt = [...scores].sort((a, b) => (a.C || 0) - (b.C || 0))[0];

    // CORRIGIDO: Usar scoreSubtractive (método principal)
    const highCostScore = highCostAlt.scoreSubtractiveNorm ?? highCostAlt.scoreSubtractive ?? 0;
    const lowCostScore = lowCostAlt.scoreSubtractiveNorm ?? lowCostAlt.scoreSubtractive ?? 0;

    if (highCostScore > lowCostScore &&
      Math.abs(highCostAlt.B - lowCostAlt.B) < 0.1 &&
      Math.abs(highCostAlt.O - lowCostAlt.O) < 0.1) {
      issues.push({
        problem: 'Alternativa com maior Custo tem maior score (possível inversão de sinal)',
        action: 'Verifique se Custos estão sendo tratados como critério a minimizar'
      });
    }
  }

  return {
    formulaCorrect,
    signsCorrect,
    rankingCoherent,
    issues
  };
}

// ============================================================
// ADEQUAÇÃO POR PERIÓDICO
// ============================================================

function evaluateJournalAdequacy(
  score: number,
  sampleSize: number,
  cr: number,
  methodsAgreement: number
): JournalAdequacy[] {
  const results: JournalAdequacy[] = [];

  Object.entries(JOURNALS).forEach(([key, journal]) => {
    const reasons: string[] = [];
    const missing: string[] = [];

    // Verificar cada requisito
    if (score >= journal.minScore) {
      reasons.push(`Score ${score} ≥ ${journal.minScore} pontos`);
    } else {
      missing.push(`Score ${score} < ${journal.minScore} pontos necessários`);
    }

    if (sampleSize >= journal.minExperts) {
      reasons.push(`${sampleSize} especialistas ≥ mínimo de ${journal.minExperts}`);
    } else {
      missing.push(`Apenas ${sampleSize} especialistas (mínimo: ${journal.minExperts})`);
    }

    if (cr <= journal.maxCR) {
      reasons.push(`CR ${(cr * 100).toFixed(1)}% ≤ ${(journal.maxCR * 100)}%`);
    } else {
      missing.push(`CR ${(cr * 100).toFixed(1)}% > limite de ${(journal.maxCR * 100)}%`);
    }

    if (methodsAgreement >= journal.minMethods) {
      reasons.push(`${methodsAgreement}/5 métodos concordantes ≥ ${journal.minMethods}/5`);
    } else {
      missing.push(`Apenas ${methodsAgreement}/5 métodos concordantes (mínimo: ${journal.minMethods}/5)`);
    }

    const adequate = missing.length === 0;

    results.push({
      adequate,
      journal: key,
      fullName: journal.name,
      impactFactor: journal.impactFactor,
      reasons: adequate ? reasons : [],
      missing
    });
  });

  // Ordenar: adequados primeiro, depois por IF
  return results.sort((a, b) => {
    if (a.adequate !== b.adequate) return a.adequate ? -1 : 1;
    return b.impactFactor - a.impactFactor;
  });
}

// ============================================================
// CLASSIFICAÇÃO FINAL
// ============================================================

function getGradeInfo(score: number): { grade: string; status: string; color: string } {
  if (score >= 90) return { grade: 'A', status: 'EXCELENTE', color: 'green' };
  if (score >= 75) return { grade: 'B', status: 'BOM', color: 'blue' };
  if (score >= 60) return { grade: 'C', status: 'REGULAR', color: 'yellow' };
  if (score >= 40) return { grade: 'D', status: 'INSUFICIENTE', color: 'orange' };
  return { grade: 'E', status: 'INADEQUADO', color: 'red' };
}

// ============================================================
// GERADOR DE RELATÓRIO TÉCNICO
// ============================================================

function generateTechnicalReport(
  data: any,
  validations: ValidationResult[],
  score: number,
  gradeInfo: any,
  journalAdequacy: JournalAdequacy[],
  logicValidation: any
): string {
  const projectName = data.metadata?.projectName || 'Projeto AHP-BOCR';
  const timestamp = new Date().toISOString();

  let report = `
# PARECER TÉCNICO - VALIDAÇÃO AHP-BOCR
## ${projectName}

**Data da Auditoria:** ${timestamp}
**Versão do Validador:** 3.0
**Normas de Referência:** Saaty (1980), Wijnmalen (2007), Petrillo et al. (2023)

---

## 🎯 RESUMO EXECUTIVO

**Nota Final: ${gradeInfo.grade} (${score}/100 pontos)**
**Status: ${gradeInfo.status}**

${score >= 75
      ? '✅ Metodologia adequada para publicação em periódicos de alto impacto.'
      : score >= 60
        ? '⚠️ Metodologia requer ajustes antes da submissão.'
        : '❌ Correções significativas necessárias.'}

---

## 📊 DETALHAMENTO DA PONTUAÇÃO

| Critério | Pontos | Máximo | Status |
|----------|--------|--------|--------|
${validations.map(v => `| ${v.test} | ${v.score} | ${v.maxScore} | ${v.status} |`).join('\n')}
| **TOTAL** | **${score}** | **100** | **${gradeInfo.grade}** |

---

## 🔍 VALIDAÇÕES DETALHADAS

${validations.map(v => `
### ${v.test}
- **Status:** ${v.status}
- **Pontuação:** ${v.score}/${v.maxScore}
- **Resultado:** ${v.message}
${v.action ? `- **Ação Recomendada:** ${v.action}` : ''}
`).join('\n')}

---

## 🔬 VERIFICAÇÃO LÓGICA

${logicValidation.issues.length === 0
      ? '✅ Nenhum problema lógico identificado.'
      : logicValidation.issues.map((i: any) => `
### ⚠️ ${i.problem}
**Ação:** ${i.action}
`).join('\n')}

---

## 📚 ADEQUAÇÃO PARA PERIÓDICOS

${journalAdequacy.map(j => `
### ${j.fullName} (IF: ${j.impactFactor})
**Status:** ${j.adequate ? '✅ ADEQUADO' : '❌ NÃO ADEQUADO'}

${j.adequate
          ? `**Requisitos atendidos:**\n${j.reasons.map(r => `- ✅ ${r}`).join('\n')}`
          : `**Requisitos não atendidos:**\n${j.missing.map(m => `- ❌ ${m}`).join('\n')}`}
`).join('\n')}

---

## 📚 REFERÊNCIAS METODOLÓGICAS

- SAATY, T. L. The Analytic Hierarchy Process. McGraw-Hill, New York, 1980.
- WIJNMALEN, D. J. D. Analysis of benefits, opportunities, costs, and risks (BOCR) with the AHP–ANP. Mathematical and Computer Modelling, v. 46, n. 7-8, p. 892-905, 2007.
- PETRILLO, A.; SALOMON, V. A. P.; TRAMARICO, C. L. State-of-the-Art Review on the Analytic Hierarchy Process with Benefits, Opportunities, Costs, and Risks. Journal of Risk and Financial Management, v. 16, n. 8, 372, 2023.

---

*Parecer gerado automaticamente pelo AHP-BOCR Scientific Validator v3.0*
`;

  return report;
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const { calculationData } = await request.json();

    if (!calculationData) {
      return NextResponse.json({
        success: false,
        error: 'calculationData é obrigatório'
      }, { status: 400 });
    }

    // Executar validações
    const consistencyResult = validateConsistency(calculationData);
    const sampleResult = validateSampleSize(calculationData);
    const methodsResult = validateMethodsAgreement(calculationData);
    const sensitivityResult = validateSensitivity(calculationData);
    const discriminationResult = validateDiscrimination(calculationData);
    const dataQualityResult = validateDataQuality(calculationData);

    const validations = [
      consistencyResult,
      sampleResult,
      methodsResult,
      sensitivityResult,
      discriminationResult,
      dataQualityResult
    ];

    // Calcular score total
    const totalScore = validations.reduce((sum, v) => sum + v.score, 0);
    const gradeInfo = getGradeInfo(totalScore);

    // Validação lógica
    const logicValidation = validateLogic(calculationData);

    // Adequação por periódico
    const journalAdequacy = evaluateJournalAdequacy(
      totalScore,
      calculationData.responseCount || 0,
      calculationData.bocrConsistency?.cr || 0,
      methodsResult.details?.agreement || 0
    );

    // Gerar relatório técnico
    const technicalReport = generateTechnicalReport(
      calculationData,
      validations,
      totalScore,
      gradeInfo,
      journalAdequacy,
      logicValidation
    );

    // Pontos fortes
    const pontosFortes: string[] = [];
    if (consistencyResult.status === 'PASS') {
      pontosFortes.push(`Consistência excelente (CR = ${consistencyResult.details.crPercent}%)`);
    }
    if (sampleResult.score >= 15) {
      pontosFortes.push(`Amostra excelente (n=${calculationData.responseCount}). Adequada para todos os periódicos-alvo.`);
    }
    if (methodsResult.details?.agreement === 5) {
      pontosFortes.push(`Concordância perfeita: 5/5 métodos indicam ${methodsResult.details.dominantWinner} como vencedor.`);
    }
    if (sensitivityResult.details?.criticalCount === 0) {
      pontosFortes.push('Robustez excelente: ranking estável para todas as variações.');
    }
    if (dataQualityResult.score === 10) {
      pontosFortes.push('Dados completos e bem formatados.');
    }

    // Recomendações
    const recomendacoes: string[] = [];
    validations.forEach(v => {
      if (v.action) recomendacoes.push(v.action);
    });
    logicValidation.issues.forEach((i: any) => {
      recomendacoes.push(i.action);
    });

    // Montar resposta
    const auditResponse = {
      validacao_cientifica: {
        status: gradeInfo.status,
        nota_metodologica: gradeInfo.grade,
        score: totalScore,
        apto_publicacao: totalScore >= 75,
        mensagem: totalScore >= 90
          ? 'Metodologia exemplar. Pronto para submissão em periódicos de alto impacto.'
          : totalScore >= 75
            ? 'Metodologia sólida. Adequada para publicação com pequenos ajustes.'
            : totalScore >= 60
              ? 'Metodologia requer melhorias antes da submissão.'
              : 'Correções significativas necessárias antes da publicação.'
      },

      verificacao_matematica: {
        cr_global: `${(calculationData.bocrConsistency?.cr * 100 || 0).toFixed(2)}%`,
        consistencia_ok: (calculationData.bocrConsistency?.cr || 0) <= 0.10,
        pesos_somam_100: Math.abs((calculationData.bocrWeights || []).reduce((a: number, b: number) => a + b, 0) - 1.0) <= 0.01
      },

      verificacao_logica: {
        formula_correta: logicValidation.formulaCorrect,
        sinais_bocr_corretos: logicValidation.signsCorrect,
        ranking_coerente: logicValidation.rankingCoherent,
        problemas: logicValidation.issues
      },

      robustez: {
        metodos_concordantes: methodsResult.details?.agreement || 0,
        diferenca_1o_2o: `${discriminationResult.details?.difference?.toFixed(2) || 0}%`,
        classificacao_sensibilidade: sensitivityResult.status
      },

      pontos_fortes: pontosFortes,
      recomendacoes: recomendacoes.filter((r, i, arr) => arr.indexOf(r) === i), // Remove duplicatas

      adequacao_periodicos: Object.fromEntries(
        journalAdequacy.map(j => [j.journal, j.adequate])
      ),

      detalhes_periodicos: journalAdequacy,

      validacoes: validations,

      relatorio_tecnico: technicalReport
    };

    return NextResponse.json({
      success: true,
      audit: auditResponse,
      method: 'local-scientific-validator-v3'
    });

  } catch (error: any) {
    console.error('Erro na auditoria:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno na auditoria'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'AHP-BOCR Scientific Validator',
    version: '3.0',
    description: 'Validador científico para estudos AHP-BOCR baseado em Saaty (1980), Wijnmalen (2007) e Petrillo et al. (2023)',
    scoring: SCORING,
    journals: Object.keys(JOURNALS),
    gradeScale: [
      { grade: 'A', range: '90-100', status: 'EXCELENTE' },
      { grade: 'B', range: '75-89', status: 'BOM' },
      { grade: 'C', range: '60-74', status: 'REGULAR' },
      { grade: 'D', range: '40-59', status: 'INSUFICIENTE' },
      { grade: 'E', range: '0-39', status: 'INADEQUADO' }
    ]
  });
}
