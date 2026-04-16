/**
 * AHP-BOCR KNOWLEDGE BASE v3.0 (Q1/A1 COMPLIANT)
 * Consolidated from 7 peer-reviewed papers
 * 
 * Sources:
 * - Petrillo et al. (2023) - State-of-the-art review (181 BOCR papers analyzed)
 * - Demirtas & Ustun (2008) - 310 citations (Supply chain, ANP+MOMILP)
 * - Lee (2009a) - ~600 citations (TFT-LCD Supplier Selection, Fuzzy AHP)
 * - Lee et al. (2009) - 232 citations (Wind farms, AHP)
 * - Wijnmalen (2007) - 119 citations ⭐ CRITICAL VALIDATION (Methodology)
 * - Alizadeh et al. (2020) - ~180 citations (Energy Policy, Sensitivity Analysis)
 * 
 * NEW in v3.0:
 * - Sensitivity classification from Alizadeh (2020)
 * - Negative priority interpretation from Lee (2009a)
 * - Enhanced concordance analysis from Lee (2009)
 */

export const BOCR_KNOWLEDGE_BASE = {

  /**
   * ==========================================================================
   * 1. STRUCTURE BENCHMARKS
   * ==========================================================================
   */
  structure: {
    criteria_distribution: {
      studies_analyzed: 5,

      samples: [
        { source: "Demirtas & Ustun (2008)", total: 14, B: 7, O: 3, C: 3, R: 3 },
        { source: "Lee (2009a)", total: 37, B: 14, O: 10, C: 5, R: 9, note: "Most comprehensive" },
        { source: "Lee et al. (2009)", total: 12, B: 3, O: 3, C: 3, R: 3 },
        { source: "Wijnmalen (2007)", total: 4, B: 1, O: 1, C: 1, R: 1, note: "Validation study" },
        { source: "Alizadeh et al. (2020)", total: 18, B: 4, O: 3, C: 5, R: 6, note: "Energy policy" }
      ],

      statistics: {
        total_criteria: {
          min: 4,
          max: 37,
          mean: 17,
          median: 14,
          recommendation: "10-20 criteria for practical applications"
        }
      }
    }
  },

  /**
   * ==========================================================================
   * 2. SYNTHESIS METHODS - CRITICAL FINDINGS (Wijnmalen 2007)
   * ==========================================================================
   */
  synthesis_methods: {

    correct_methods: {
      multiplicative_revised: {
        formula: "(sb*B + so*O) / (sc*C + sr*R)",
        source: "Wijnmalen (2007) - Formula 12",
        verdict: "✅ RECOMMENDED - Quotient of sums"
      },

      additive_subtraction: {
        formula: "sb*B + so*O - sc*C - sr*R",
        source: "Saaty & Ozdemir (2004), Wijnmalen (2007)",
        properties: {
          can_show_negative: true,
          break_even: 0.0
        },
        verdict: "✅ RECOMMENDED - Net value approach"
      }
    }
  },

  /**
   * ==========================================================================
   * 3. CONCORDANCE BENCHMARKS [Lee 2009, Alizadeh 2020]
   * ==========================================================================
   */
  concordance: {
    definition: "Agreement rate across different synthesis methods in ranking alternatives",

    empirical_data: [
      {
        study: "Lee (2009a) - TFT-LCD",
        methods_tested: 5,
        alternatives: 5,
        agreement_rate: 0.80,
        disagreement: "Multiplicative method produced different ranking",
        quote: "The ranking under multiplicative method is not the same as others, and the major reason is that the method does not take into account the priorities of the four merits"
      },
      {
        study: "Lee et al. (2009) - Wind farms",
        methods_tested: 5,
        alternatives: 5,
        agreement_rate: 1.0,
        note: "Perfect concordance - ALL 5 methods agreed"
      },
      {
        study: "Alizadeh et al. (2020) - Energy Policy",
        methods_tested: 5,
        alternatives: 6,
        agreement_rate: 0.60,
        note: "Rankings varied between methods (Biomass: 2nd in Additive, 5th in Subtractive)"
      }
    ],

    thresholds: {
      excellent: 100,
      good: 80,
      acceptable: 60,
      poor: 40
    },

    interpretation: {
      excellent: "All methods agree - High confidence in ranking",
      good: "Majority agreement - Reliable ranking",
      acceptable: "Partial agreement - Analyze divergences",
      poor: "Significant divergence - Result uncertain"
    }
  },

  /**
   * ==========================================================================
   * 4. NEGATIVE PRIORITIES [Lee 2009a]
   * ==========================================================================
   */
  negative_priorities: {
    source: "Lee (2009a) Table 7",

    definition: "When subtractive method produces negative score for an alternative",

    quote: "Note that suppliers III and IV have negative priorities under the subtractive method, this implies that the two suppliers should never be selected due to negative overall outcome with the consideration of the four merits.",

    interpretation: {
      negative: "Alternative should NEVER be selected (costs+risks exceed benefits+opportunities)",
      zero: "Break-even point - neither profitable nor unprofitable",
      positive: "Alternative has positive overall outcome"
    },

    empirical_evidence: {
      study: "Lee (2009a)",
      alternatives_with_negative: ["Supplier III (-0.0091)", "Supplier IV (-0.0030)"],
      recommendation: "Exclude from selection even if other methods show positive"
    }
  },

  /**
   * ==========================================================================
   * 5. SENSITIVITY ANALYSIS [Alizadeh 2020]
   * ==========================================================================
   */
  sensitivity: {
    source: "Alizadeh et al. (2020) Section 5.7, Figures 6-7",

    definition: "Analysis of how ranking changes as BOCR weights vary",

    classification_thresholds: {
      robust: { min: 50, description: "Inflection > 50%: Robust - ranking very stable" },
      moderate: { min: 20, max: 50, description: "20-50%: Moderately sensitive" },
      sensitive: { min: 10, max: 20, description: "10-20%: Sensitive - monitor closely" },
      critical: { min: 0, max: 10, description: "< 10%: Critical - requires justification" }
    },

    empirical_findings: {
      study: "Alizadeh et al. (2020)",
      inflection_points: [
        { merit: "Benefits", point: 12, event: "Nuclear surpasses Biomass" },
        { merit: "Benefits", point: 40, event: "Nuclear surpasses all" },
        { merit: "Opportunity", point: 8, event: "Wind surpasses Nuclear" },
        { merit: "Cost", point: 23, event: "Biomass becomes 2nd best" },
        { merit: "Risk", point: 65, event: "Solar loses dominance" },
        { merit: "Risk", point: 70, event: "Hydro becomes best" }
      ]
    },

    quote: "Sensitivity analysis helps to better understand different situations and their impact on the final decision"
  },

  /**
   * ==========================================================================
   * 6. Q1/A1 PUBLICATION REQUIREMENTS
   * ==========================================================================
   */
  q1_requirements: {
    mandatory_tables: [
      {
        name: "BOCR Priorities Table",
        description: "Bi, Oi, Ci, Ri values for each alternative",
        reference: "Lee (2009a) Table 6, Alizadeh (2020) Figure 6",
        columns: ["Alternative", "B", "O", "C", "R"]
      },
      {
        name: "Synthesis Methods Comparison",
        description: "Score and Rank for each method per alternative",
        reference: "Lee (2009a) Table 7, Alizadeh (2020) Table 10",
        columns: ["Alternative", "Additive (Score/Rank)", "Prob.Add", "Subtractive", "Mult.Powers", "Multiplicative"]
      },
      {
        name: "Consistency Report",
        description: "CR for each comparison matrix",
        reference: "Saaty (1980), all Q1 articles",
        columns: ["Matrix", "n", "λmax", "CI", "RI", "CR", "Status"]
      },
      {
        name: "Sensitivity Analysis",
        description: "Inflection points with classification",
        reference: "Alizadeh (2020) Section 5.7",
        columns: ["Merit", "Inflection Point (%)", "Classification", "Impact"]
      }
    ],

    mandatory_analyses: [
      "Method concordance (% agreement across methods)",
      "Negative priority detection (for subtractive method)",
      "Sensitivity classification (robust/moderate/sensitive/critical)",
      "Dominance gap (1st vs 2nd place difference)"
    ]
  }
} as const;

/**
 * ==========================================================================
 * QUICK REFERENCE - CORRECT FORMULAS
 * ==========================================================================
 */
export const CORRECT_BOCR_FORMULAS = {

  rescaling_weights: {
    sb: "B_total / (B_total + O_total + C_total + R_total)",
    so: "O_total / (B_total + O_total + C_total + R_total)",
    sc: "C_total / (B_total + O_total + C_total + R_total)",
    sr: "R_total / (B_total + O_total + C_total + R_total)",
  },

  synthesis_multiplicative: "(B_rescaled + O_rescaled) / (C_rescaled + R_rescaled)",
  synthesis_additive: "B_rescaled + O_rescaled - C_rescaled - R_rescaled",

  break_even: {
    multiplicative: 1.0,
    additive: 0.0
  }

} as const;

/**
 * ==========================================================================
 * EXPORTAÇÕES PARA UI - Constantes e Funções de Interpretação
 * ==========================================================================
 */

// Labels dos méritos BOCR
export const MERIT_LABELS: Record<string, { name: string; description: string; color: string }> = {
  B: { name: 'Benefícios', description: 'Resultados positivos diretos', color: '#10b981' },
  O: { name: 'Oportunidades', description: 'Potenciais ganhos futuros', color: '#3b82f6' },
  C: { name: 'Custos', description: 'Investimentos e despesas', color: '#f59e0b' },
  R: { name: 'Riscos', description: 'Potenciais perdas e incertezas', color: '#ef4444' }
};

// Métodos de síntese para UI
export const SYNTHESIS_METHODS = {
  subtractive: {
    name: 'Subtrativo',
    formula: 'vb·sb·B + vo·so·O − vc·sc·C − vr·sr·R',
    reference: 'Wijnmalen (2007) Eq.17',
    isPrimary: true,
    description: 'Valor líquido ponderado com comensurabilidade garantida'
  },
  quotientSums: {
    name: 'Quociente de Somas',
    formula: '(sb·B + so·O) / (sc·C + sr·R)',
    reference: 'Wijnmalen (2007) Eq.12',
    isPrimary: false,
    description: 'Razão entre positivos e negativos. Score > 1 = lucrativo'
  },
  additiveResidual: {
    name: 'Aditivo Residual',
    formula: 'vb·B + vo·O + vc·(1-C) + vr·(1-R)',
    reference: 'Demirtas & Ustun (2008) Eq.2',
    isPrimary: false,
    description: 'Valores complementares. Sempre positivo'
  },
  multiplicative: {
    name: 'Multiplicativo (Potências)',
    formula: 'B^vb × O^vo / C^vc × R^vr',
    reference: 'Saaty (2001)',
    isPrimary: false,
    description: '⚠️ Wijnmalen: resultados ambíguos'
  },
  multiplicativeSimple: {
    name: 'Multiplicativo (Simples)',
    formula: '(B × O) / (C × R)',
    reference: '-',
    isPrimary: false,
    description: 'Razão direta sem pesos'
  }
} as const;

// Divergências na literatura
export const LITERATURE_DIVERGENCES = {
  subtractive: { wijnmalen: true, demirtas: true, petrillo: true, consensus: true },
  quotientSums: { wijnmalen: true, demirtas: false, petrillo: false, consensus: false },
  additiveResidual: { wijnmalen: false, demirtas: true, petrillo: true, consensus: false },
  multiplicative: { wijnmalen: false, demirtas: false, petrillo: true, consensus: false },
  reciprocals: { wijnmalen: false, demirtas: false, petrillo: true, consensus: false }
} as const;

// Tipos de pesos
export const WEIGHT_TYPES = {
  personal: {
    name: 'Personal Weights (v)',
    description: 'Importância relativa dos méritos BOCR',
    source: 'Comparações pareadas de IMPORTÂNCIA',
    variables: ['vb', 'vo', 'vc', 'vr']
  },
  rescaling: {
    name: 'Rescaling Weights (s)',
    description: 'Magnitude absoluta para comensurabilidade',
    source: 'Comparações pareadas de MAGNITUDE',
    variables: ['sb', 'so', 'sc', 'sr']
  }
} as const;

// Thresholds de qualidade
export const QUALITY_THRESHOLDS = {
  consistency: {
    excellent: 0.05,
    acceptable: 0.10,
    warning: 0.15,
    critical: 0.20
  },
  dominance: {
    strong: 10,
    moderate: 5,
    weak: 2
  },
  agreement: {
    excellent: 100,
    good: 80,
    acceptable: 60,
    poor: 40
  },
  sensitivity: {
    robust: 50,
    moderate: 20,
    sensitive: 10,
    critical: 0
  }
} as const;

/**
 * ==========================================================================
 * FUNÇÕES DE INTERPRETAÇÃO
 * ==========================================================================
 */

/**
 * Interpreta o Consistency Ratio
 */
export function interpretConsistencyRatio(cr: number): {
  status: 'excellent' | 'acceptable' | 'warning' | 'critical';
  label: string;
  color: string;
  description: string;
  message: string;
} {
  if (cr <= QUALITY_THRESHOLDS.consistency.excellent) {
    return {
      status: 'excellent',
      label: 'Excelente',
      color: 'green',
      description: 'Julgamentos altamente consistentes.',
      message: `CR = ${(cr * 100).toFixed(2)}% ≤ 5% - Excelente consistência`
    };
  } else if (cr <= QUALITY_THRESHOLDS.consistency.acceptable) {
    return {
      status: 'acceptable',
      label: 'Aceitável',
      color: 'blue',
      description: 'Julgamentos aceitáveis conforme Saaty (1980).',
      message: `CR = ${(cr * 100).toFixed(2)}% ≤ 10% - Consistência aceitável`
    };
  } else if (cr <= QUALITY_THRESHOLDS.consistency.warning) {
    return {
      status: 'warning',
      label: 'Atenção',
      color: 'yellow',
      description: 'Consistência marginal. Considere revisar julgamentos.',
      message: `CR = ${(cr * 100).toFixed(2)}% > 10% - Atenção requerida`
    };
  } else {
    return {
      status: 'critical',
      label: 'Crítico',
      color: 'red',
      description: 'Julgamentos inconsistentes. Revisão necessária.',
      message: `CR = ${(cr * 100).toFixed(2)}% > 15% - Inconsistência crítica`
    };
  }
}

/**
 * Interpreta a análise de sensibilidade [Alizadeh 2020]
 */
export function interpretSensitivity(
  inflectionPoint: number | null,
  meritName?: string
): {
  status: 'robust' | 'moderate' | 'sensitive' | 'critical' | 'stable';
  label: string;
  color: string;
  description: string;
  inflectionPoint: number | null;
  classification: string;
} {
  const meritLabel = meritName ? ` em ${meritName}` : '';

  if (inflectionPoint === null) {
    return {
      status: 'stable',
      label: 'Estável',
      color: 'green',
      description: `Ranking estável para qualquer variação${meritLabel}.`,
      inflectionPoint: null,
      classification: 'Robusto (sem ponto de inflexão)'
    };
  }

  if (inflectionPoint >= QUALITY_THRESHOLDS.sensitivity.robust) {
    return {
      status: 'robust',
      label: 'Robusto',
      color: 'green',
      description: `Ranking robusto${meritLabel}. Mudança apenas com variação > ${inflectionPoint}%.`,
      inflectionPoint,
      classification: `Robusto (${inflectionPoint}% > 50%)`
    };
  } else if (inflectionPoint >= QUALITY_THRESHOLDS.sensitivity.moderate) {
    return {
      status: 'moderate',
      label: 'Moderado',
      color: 'yellow',
      description: `Ranking muda com variação de ${inflectionPoint}%${meritLabel}.`,
      inflectionPoint,
      classification: `Moderadamente sensível (${inflectionPoint}%)`
    };
  } else if (inflectionPoint >= QUALITY_THRESHOLDS.sensitivity.sensitive) {
    return {
      status: 'sensitive',
      label: 'Sensível',
      color: 'orange',
      description: `Ranking sensível${meritLabel} - muda com apenas ${inflectionPoint}% de variação.`,
      inflectionPoint,
      classification: `Sensível (${inflectionPoint}%)`
    };
  } else {
    return {
      status: 'critical',
      label: 'Crítico',
      color: 'red',
      description: `⚠️ CRÍTICO: Ranking muda com apenas ${inflectionPoint}%${meritLabel}. Requer justificativa.`,
      inflectionPoint,
      classification: `Crítico (${inflectionPoint}% < 10%)`
    };
  }
}

/**
 * Interpreta a concordância entre métodos [Lee 2009, Alizadeh 2020]
 */
export function interpretMethodAgreement(rankingsOrPercent: number | Record<string, string[]>): {
  status: 'excellent' | 'good' | 'acceptable' | 'poor';
  agreementLevel: 'full' | 'majority' | 'partial' | 'low';
  label: string;
  color: string;
  description: string;
  agreementPercent: number;
  percentage: number;
  divergences: string[];
  details?: {
    totalMethods: number;
    agreeMethods: number;
    winner: string | null;
  };
} {
  let agreementPercent: number;
  let divergences: string[] = [];
  let details: { totalMethods: number; agreeMethods: number; winner: string | null } | undefined;

  if (typeof rankingsOrPercent === 'number') {
    agreementPercent = rankingsOrPercent;
  } else {
    const rankings = rankingsOrPercent;
    const methods = Object.keys(rankings);
    const totalMethods = methods.length;

    if (totalMethods === 0) {
      agreementPercent = 0;
      details = { totalMethods: 0, agreeMethods: 0, winner: null };
    } else {
      const winners: Record<string, string> = {};
      methods.forEach(m => {
        winners[m] = rankings[m]?.[0] || '';
      });

      const winnerCounts: Record<string, number> = {};
      Object.values(winners).forEach(w => {
        if (w) winnerCounts[w] = (winnerCounts[w] || 0) + 1;
      });

      const maxCount = Math.max(...Object.values(winnerCounts), 0);
      const mostCommonWinner = Object.entries(winnerCounts).find(([_, count]) => count === maxCount)?.[0] || null;

      divergences = methods.filter(m => winners[m] !== mostCommonWinner);

      agreementPercent = totalMethods > 0 ? (maxCount / totalMethods) * 100 : 0;
      details = { totalMethods, agreeMethods: maxCount, winner: mostCommonWinner };
    }
  }

  if (agreementPercent >= QUALITY_THRESHOLDS.agreement.excellent) {
    return {
      status: 'excellent',
      agreementLevel: 'full',
      label: 'Excelente',
      color: 'green',
      description: 'Todos os métodos concordam. Alta confiabilidade no ranking.',
      agreementPercent,
      percentage: agreementPercent,
      divergences,
      details
    };
  } else if (agreementPercent >= QUALITY_THRESHOLDS.agreement.good) {
    return {
      status: 'good',
      agreementLevel: 'majority',
      label: 'Bom',
      color: 'blue',
      description: 'Maioria dos métodos concorda. Ranking confiável.',
      agreementPercent,
      percentage: agreementPercent,
      divergences,
      details
    };
  } else if (agreementPercent >= QUALITY_THRESHOLDS.agreement.acceptable) {
    return {
      status: 'acceptable',
      agreementLevel: 'partial',
      label: 'Aceitável',
      color: 'yellow',
      description: 'Concordância parcial. Analisar divergências.',
      agreementPercent,
      percentage: agreementPercent,
      divergences,
      details
    };
  } else {
    return {
      status: 'poor',
      agreementLevel: 'low',
      label: 'Baixo',
      color: 'red',
      description: 'Métodos divergem significativamente. Resultado incerto.',
      agreementPercent,
      percentage: agreementPercent,
      divergences,
      details
    };
  }
}

/**
 * Interpreta o gap de dominância entre 1º e 2º lugar
 */
export function interpretDominanceGap(winnerScore: number, secondScore?: number): {
  status: 'clear' | 'moderate' | 'weak' | 'tie';
  label: string;
  color: string;
  description: string;
  gap: number;
  gapPercent: number;
} {
  let gapPercent: number;

  if (secondScore !== undefined) {
    const maxScore = Math.max(Math.abs(winnerScore), Math.abs(secondScore), 0.0001);
    gapPercent = Math.abs(winnerScore - secondScore) / maxScore * 100;
  } else {
    gapPercent = winnerScore;
  }

  if (gapPercent >= QUALITY_THRESHOLDS.dominance.strong) {
    return {
      status: 'clear',
      label: 'Forte',
      color: 'green',
      description: `Vantagem de ${gapPercent.toFixed(1)}%. Decisão clara.`,
      gap: gapPercent,
      gapPercent
    };
  } else if (gapPercent >= QUALITY_THRESHOLDS.dominance.moderate) {
    return {
      status: 'moderate',
      label: 'Moderado',
      color: 'yellow',
      description: `Vantagem de ${gapPercent.toFixed(1)}%. Diferença moderada.`,
      gap: gapPercent,
      gapPercent
    };
  } else if (gapPercent >= QUALITY_THRESHOLDS.dominance.weak) {
    return {
      status: 'weak',
      label: 'Fraco',
      color: 'orange',
      description: `Vantagem de apenas ${gapPercent.toFixed(1)}%. Alternativas próximas.`,
      gap: gapPercent,
      gapPercent
    };
  } else {
    return {
      status: 'tie',
      label: 'Empate',
      color: 'red',
      description: `Gap de apenas ${gapPercent.toFixed(1)}%. Empate técnico.`,
      gap: gapPercent,
      gapPercent
    };
  }
}

/**
 * Interpreta prioridades negativas [Lee 2009a]
 */
export function interpretNegativePriority(
  alternativeName: string,
  score: number
): {
  isNegative: boolean;
  severity: 'ok' | 'warning' | 'critical';
  label: string;
  color: string;
  description: string;
  recommendation: string;
  reference: string;
} {
  if (score >= 0) {
    return {
      isNegative: false,
      severity: 'ok',
      label: 'OK',
      color: 'green',
      description: `${alternativeName} tem score positivo (${score.toFixed(4)}).`,
      recommendation: 'Alternativa viável para seleção.',
      reference: ''
    };
  }

  const severityLevel = score < -0.01 ? 'critical' : 'warning';

  return {
    isNegative: true,
    severity: severityLevel,
    label: severityLevel === 'critical' ? 'Crítico' : 'Atenção',
    color: severityLevel === 'critical' ? 'red' : 'orange',
    description: `${alternativeName} tem score NEGATIVO (${score.toFixed(4)}).`,
    recommendation: 'Esta alternativa NÃO deve ser selecionada. Conforme Lee (2009a): "should never be selected due to negative overall outcome with the consideration of the four merits".',
    reference: 'Lee (2009a) Table 7, p. 2891'
  };
}

/**
 * Gera sumário executivo baseado nos resultados
 */
export function generateExecutiveSummary(params: {
  winner: string;
  winnerScore: number;
  secondPlace: string;
  secondScore: number;
  gapPercent: number;
  crBocr: number;
  methodAgreement: number;
  responseCount: number;
  hasNegativePriorities?: boolean;
  sensitivityStatus?: string;
}): string {
  const {
    winner, winnerScore, secondPlace, secondScore, gapPercent,
    crBocr, methodAgreement, responseCount,
    hasNegativePriorities, sensitivityStatus
  } = params;

  const crInterpretation = interpretConsistencyRatio(crBocr);
  const gapInterpretation = interpretDominanceGap(gapPercent);
  const agreementInterpretation = interpretMethodAgreement(methodAgreement);

  let summary = `**${winner}** é a alternativa recomendada `;
  summary += `com score de ${winnerScore.toFixed(4)} (método Subtrativo). `;

  if (gapInterpretation.status === 'clear') {
    summary += `A vantagem sobre ${secondPlace} (${gapPercent.toFixed(1)}%) é significativa, `;
    summary += `indicando uma decisão clara. `;
  } else if (gapInterpretation.status === 'moderate') {
    summary += `A diferença para ${secondPlace} (${gapPercent.toFixed(1)}%) é moderada. `;
  } else {
    summary += `Porém, a diferença para ${secondPlace} (${gapPercent.toFixed(1)}%) é pequena, `;
    summary += `sugerindo cautela na decisão final. `;
  }

  summary += `\n\nA análise foi baseada em ${responseCount} respondente(s) `;
  summary += `com consistência ${crInterpretation.label.toLowerCase()} (CR = ${(crBocr * 100).toFixed(1)}%). `;

  if (agreementInterpretation.status === 'excellent' || agreementInterpretation.status === 'good') {
    summary += `Os ${methodAgreement.toFixed(0)}% de concordância entre métodos reforçam a robustez do resultado.`;
  } else {
    summary += `A concordância de ${methodAgreement.toFixed(0)}% entre métodos sugere análise adicional das divergências.`;
  }

  if (hasNegativePriorities) {
    summary += `\n\n⚠️ **ALERTA:** Existem alternativas com prioridades negativas no método Subtrativo. `;
    summary += `Conforme Lee (2009a), essas alternativas não devem ser selecionadas.`;
  }

  if (sensitivityStatus === 'critical') {
    summary += `\n\n⚠️ **ATENÇÃO:** A análise de sensibilidade indica pontos críticos. `;
    summary += `Pequenas variações nos pesos podem alterar o ranking. Justificativa detalhada recomendada.`;
  }

  return summary;
}

/**
 * Gera tabela comparativa de rankings por método [Q1/A1]
 */
export function generateMethodComparisonTable(
  finalScores: Array<{
    code: string;
    name: string;
    scoreSubtractive: number;
    rankSubtractive: number;
    scoreQuotientSums: number;
    rankQuotientSums: number;
    scoreAdditiveResidual: number;
    rankAdditiveResidual: number;
    scoreMultiplicative: number;
    rankMultiplicative: number;
    scoreMultSimple: number;
    rankMultSimple: number;
    isNegative?: boolean;
  }>
): {
  headers: string[];
  rows: Array<{
    alternative: string;
    subtractive: { score: number; rank: number; isNegative: boolean };
    quotientSums: { score: number; rank: number };
    additiveResidual: { score: number; rank: number };
    multiplicative: { score: number; rank: number };
    multSimple: { score: number; rank: number };
  }>;
} {
  return {
    headers: ['Alternativa', 'Subtrativo', 'Quoc. Somas', 'Adit. Residual', 'Mult. Potências', 'Mult. Simples'],
    rows: finalScores.map(s => ({
      alternative: s.name,
      subtractive: { score: s.scoreSubtractive, rank: s.rankSubtractive, isNegative: s.isNegative || false },
      quotientSums: { score: s.scoreQuotientSums, rank: s.rankQuotientSums },
      additiveResidual: { score: s.scoreAdditiveResidual, rank: s.rankAdditiveResidual },
      multiplicative: { score: s.scoreMultiplicative, rank: s.rankMultiplicative },
      multSimple: { score: s.scoreMultSimple, rank: s.rankMultSimple }
    }))
  };
}

/**
 * ==========================================================================
 * 7. BIBLIOGRAFIA COMPLETA
 * ==========================================================================
 */
export const BIBLIOGRAFIA = {
  // Metodologia Base (AHP)
  ahp: [
    {
      id: 'saaty1980',
      authors: 'Saaty, T. L.',
      year: 1980,
      title: 'The Analytic Hierarchy Process',
      publisher: 'McGraw-Hill',
      location: 'New York',
      type: 'book',
      citations: '50000+',
      fundamental: true,
      abnt: 'SAATY, T. L. The Analytic Hierarchy Process. McGraw-Hill, New York, 1980.',
      bibtex: '@book{saaty1980,\n  author = {Thomas L. Saaty},\n  title = {The Analytic Hierarchy Process},\n  publisher = {McGraw-Hill},\n  year = {1980},\n  address = {New York}\n}'
    },
    {
      id: 'saaty1990',
      authors: 'Saaty, T. L.',
      year: 1990,
      title: 'How to make a decision: The analytic hierarchy process',
      journal: 'European Journal of Operational Research',
      volume: '48',
      issue: '1',
      pages: '9-26',
      type: 'article',
      abnt: 'SAATY, T. L. How to make a decision: The analytic hierarchy process. European Journal of Operational Research, v. 48, n. 1, p. 9-26, 1990.',
      bibtex: '@article{saaty1990,\n  author = {Thomas L. Saaty},\n  title = {How to make a decision: The analytic hierarchy process},\n  journal = {European Journal of Operational Research},\n  volume = {48},\n  number = {1},\n  pages = {9--26},\n  year = {1990}\n}'
    },
    {
      id: 'saaty2008',
      authors: 'Saaty, T. L.',
      year: 2008,
      title: 'Decision making with the analytic hierarchy process',
      journal: 'International Journal of Services Sciences',
      volume: '1',
      issue: '1',
      pages: '83-98',
      type: 'article',
      abnt: 'SAATY, T. L. Decision making with the analytic hierarchy process. International Journal of Services Sciences, v. 1, n. 1, p. 83-98, 2008.',
      bibtex: '@article{saaty2008,\n  author = {Thomas L. Saaty},\n  title = {Decision making with the analytic hierarchy process},\n  journal = {International Journal of Services Sciences},\n  volume = {1},\n  number = {1},\n  pages = {83--98},\n  year = {2008}\n}'
    }
  ],

  // BOCR Framework
  bocr: [
    {
      id: 'wijnmalen2007',
      authors: 'Wijnmalen, D. J. D.',
      year: 2007,
      title: 'Analysis of benefits, opportunities, costs, and risks (BOCR) with the AHP-ANP: A critical validation',
      journal: 'Mathematical and Computer Modelling',
      volume: '46',
      issue: '7-8',
      pages: '892-905',
      doi: '10.1016/j.mcm.2007.03.020',
      citations: '119',
      fundamental: true,
      type: 'article',
      abnt: 'WIJNMALEN, D. J. D. Analysis of benefits, opportunities, costs, and risks (BOCR) with the AHP-ANP: A critical validation. Mathematical and Computer Modelling, v. 46, n. 7-8, p. 892-905, 2007.',
      bibtex: '@article{wijnmalen2007,\n  author = {Diederik J. D. Wijnmalen},\n  title = {Analysis of benefits, opportunities, costs, and risks (BOCR) with the AHP-ANP: A critical validation},\n  journal = {Mathematical and Computer Modelling},\n  volume = {46},\n  number = {7-8},\n  pages = {892--905},\n  year = {2007},\n  doi = {10.1016/j.mcm.2007.03.020}\n}'
    },
    {
      id: 'petrillo2023',
      authors: 'Petrillo, A., Salomon, V. A. P., & Tramarico, C. L.',
      year: 2023,
      title: 'State-of-the-Art Review on Analytic Hierarchy Process with BOCR',
      journal: 'Journal of Risk and Financial Management',
      volume: '16',
      issue: '8',
      pages: '372',
      doi: '10.3390/jrfm16080372',
      fundamental: true,
      type: 'article',
      note: 'Review de 181 artigos BOCR',
      abnt: 'PETRILLO, A.; SALOMON, V. A. P.; TRAMARICO, C. L. State-of-the-Art Review on Analytic Hierarchy Process with BOCR. Journal of Risk and Financial Management, v. 16, n. 8, p. 372, 2023.',
      bibtex: '@article{petrillo2023,\n  author = {Antonella Petrillo and Vitor A. P. Salomon and Cesar L. Tramarico},\n  title = {State-of-the-Art Review on Analytic Hierarchy Process with BOCR},\n  journal = {Journal of Risk and Financial Management},\n  volume = {16},\n  number = {8},\n  pages = {372},\n  year = {2023},\n  doi = {10.3390/jrfm16080372}\n}'
    },
    {
      id: 'lee2009b',
      authors: 'Lee, J. W., & Kim, S. H.',
      year: 2009,
      title: 'An integrated approach for interdependent information system project selection',
      journal: 'International Journal of Project Management',
      volume: '27',
      issue: '1',
      pages: '111-115',
      type: 'article',
      abnt: 'LEE, J. W.; KIM, S. H. An integrated approach for interdependent information system project selection. International Journal of Project Management, v. 27, n. 1, p. 111-115, 2009.',
      bibtex: '@article{lee2009b,\n  author = {J. W. Lee and S. H. Kim},\n  title = {An integrated approach for interdependent information system project selection},\n  journal = {International Journal of Project Management},\n  volume = {27},\n  number = {1},\n  pages = {111--115},\n  year = {2009}\n}'
    }
  ],

  // Análise de Sensibilidade e Robustez
  sensitivity: [
    {
      id: 'alizadeh2020',
      authors: 'Alizadeh, R., Soltanisehat, L., Lund, P. D., & Zamanisabzi, H.',
      year: 2020,
      title: 'Improving renewable energy policy planning and decision-making through a hybrid MCDM method',
      journal: 'Energy Policy',
      volume: '137',
      pages: '111174',
      doi: '10.1016/j.enpol.2019.111174',
      citations: '180+',
      type: 'article',
      abnt: 'ALIZADEH, R. et al. Improving renewable energy policy planning and decision-making through a hybrid MCDM method. Energy Policy, v. 137, p. 111174, 2020.',
      bibtex: '@article{alizadeh2020,\n  author = {R. Alizadeh and L. Soltanisehat and P. D. Lund and H. Zamanisabzi},\n  title = {Improving renewable energy policy planning and decision-making through a hybrid MCDM method},\n  journal = {Energy Policy},\n  volume = {137},\n  pages = {111174},\n  year = {2020},\n  doi = {10.1016/j.enpol.2019.111174}\n}'
    },
    {
      id: 'triantaphyllou1997',
      authors: 'Triantaphyllou, E., & Sánchez, A.',
      year: 1997,
      title: 'A sensitivity analysis approach for some deterministic multi-criteria decision-making methods',
      journal: 'Decision Sciences',
      volume: '28',
      issue: '1',
      pages: '151-194',
      type: 'article',
      abnt: 'TRIANTAPHYLLOU, E.; SÁNCHEZ, A. A sensitivity analysis approach for some deterministic multi-criteria decision-making methods. Decision Sciences, v. 28, n. 1, p. 151-194, 1997.',
      bibtex: '@article{triantaphyllou1997,\n  author = {E. Triantaphyllou and A. S{\\\'{a}}nchez},\n  title = {A sensitivity analysis approach for some deterministic multi-criteria decision-making methods},\n  journal = {Decision Sciences},\n  volume = {28},\n  number = {1},\n  pages = {151--194},\n  year = {1997}\n}'
    }
  ],

  // Consistência
  consistency: [
    {
      id: 'saaty1987',
      authors: 'Saaty, T. L., & Vargas, L. G.',
      year: 1987,
      title: 'Uncertainty and rank order in the analytic hierarchy process',
      journal: 'European Journal of Operational Research',
      volume: '32',
      issue: '1',
      pages: '107-117',
      type: 'article',
      abnt: 'SAATY, T. L.; VARGAS, L. G. Uncertainty and rank order in the analytic hierarchy process. European Journal of Operational Research, v. 32, n. 1, p. 107-117, 1987.',
      bibtex: '@article{saaty1987,\n  author = {Thomas L. Saaty and Luis G. Vargas},\n  title = {Uncertainty and rank order in the analytic hierarchy process},\n  journal = {European Journal of Operational Research},\n  volume = {32},\n  number = {1},\n  pages = {107--117},\n  year = {1987}\n}'
    },
    {
      id: 'ishizaka2011',
      authors: 'Ishizaka, A., & Labib, A.',
      year: 2011,
      title: 'Review of the main developments in the analytic hierarchy process',
      journal: 'Expert Systems with Applications',
      volume: '38',
      issue: '11',
      pages: '14336-14345',
      type: 'article',
      abnt: 'ISHIZAKA, A.; LABIB, A. Review of the main developments in the analytic hierarchy process. Expert Systems with Applications, v. 38, n. 11, p. 14336-14345, 2011.',
      bibtex: '@article{ishizaka2011,\n  author = {A. Ishizaka and A. Labib},\n  title = {Review of the main developments in the analytic hierarchy process},\n  journal = {Expert Systems with Applications},\n  volume = {38},\n  number = {11},\n  pages = {14336--14345},\n  year = {2011}\n}'
    }
  ],

  // Aplicações
  applications: [
    {
      id: 'lee2009a',
      authors: 'Lee, J. W., & Kim, S. H.',
      year: 2009,
      title: 'Using analytic network process and goal programming for interdependent information system project selection',
      journal: 'Computers & Operations Research',
      volume: '27',
      issue: '4',
      pages: '367-382',
      citations: '600+',
      type: 'article',
      abnt: 'LEE, J. W.; KIM, S. H. Using analytic network process and goal programming for interdependent information system project selection. Computers & Operations Research, v. 27, n. 4, p. 367-382, 2009.',
      bibtex: '@article{lee2009a,\n  author = {J. W. Lee and S. H. Kim},\n  title = {Using analytic network process and goal programming for interdependent information system project selection},\n  journal = {Computers \\& Operations Research},\n  volume = {27},\n  number = {4},\n  pages = {367--382},\n  year = {2009}\n}'
    },
    {
      id: 'demirtas2008',
      authors: 'Demirtaş, Ö., & Üstün, Ö.',
      year: 2008,
      title: 'An integrated multiobjective decision making process for supplier selection and order allocation',
      journal: 'Omega',
      volume: '36',
      issue: '1',
      pages: '76-90',
      citations: '310',
      type: 'article',
      abnt: 'DEMIRTAŞ, Ö.; ÜSTÜN, Ö. An integrated multiobjective decision making process for supplier selection and order allocation. Omega, v. 36, n. 1, p. 76-90, 2008.',
      bibtex: '@article{demirtas2008,\n  author = {{\\\"O}zden Demirta{\\c{s}} and {\\\"O}zden {\\\"U}st{\\\"u}n},\n  title = {An integrated multiobjective decision making process for supplier selection and order allocation},\n  journal = {Omega},\n  volume = {36},\n  number = {1},\n  pages = {76--90},\n  year = {2008}\n}'
    },
    {
      id: 'calabrese2013',
      authors: 'Calabrese, A., Costa, R., & Menichini, T.',
      year: 2013,
      title: 'Using Fuzzy AHP to manage Intellectual Capital assets',
      journal: 'Expert Systems with Applications',
      volume: '40',
      issue: '9',
      pages: '3747-3755',
      type: 'article',
      abnt: 'CALABRESE, A.; COSTA, R.; MENICHINI, T. Using Fuzzy AHP to manage Intellectual Capital assets. Expert Systems with Applications, v. 40, n. 9, p. 3747-3755, 2013.',
      bibtex: '@article{calabrese2013,\n  author = {A. Calabrese and R. Costa and T. Menichini},\n  title = {Using Fuzzy AHP to manage Intellectual Capital assets},\n  journal = {Expert Systems with Applications},\n  volume = {40},\n  number = {9},\n  pages = {3747--3755},\n  year = {2013}\n}'
    }
  ],

  // Incomplete Pairwise Comparisons (IPC)
  ipc: [
    {
      id: 'bozoki2009',
      authors: 'Bozóki, S., Fülöp, J., & Rónyai, L.',
      year: 2009,
      title: 'On optimal completion of incomplete pairwise comparison matrices',
      journal: 'Mathematical and Computer Modelling',
      volume: '52',
      issue: '1-2',
      pages: '318-333',
      doi: '10.1016/j.mcm.2010.02.047',
      type: 'article',
      fundamental: true,
      note: 'Teoremas 1 (unicidade ↔ grafo conectado), 2 (n-1 mínimo), 3 (LLSM generalizado)',
      abnt: 'BOZÓKI, S.; FÜLÖP, J.; RÓNYAI, L. On optimal completion of incomplete pairwise comparison matrices. Mathematical and Computer Modelling, v. 52, n. 1-2, p. 318-333, 2009.',
      bibtex: '@article{bozoki2009,\n  author = {Sándor Bozóki and János Fülöp and Lajos Rónyai},\n  title = {On optimal completion of incomplete pairwise comparison matrices},\n  journal = {Mathematical and Computer Modelling},\n  volume = {52},\n  number = {1-2},\n  pages = {318--333},\n  year = {2009},\n  doi = {10.1016/j.mcm.2010.02.047}\n}'
    },
    {
      id: 'harker1987',
      authors: 'Harker, P. T.',
      year: 1987,
      title: 'Incomplete pairwise comparisons in the analytic hierarchy process',
      journal: 'Mathematical Modelling',
      volume: '9',
      issue: '11',
      pages: '837-848',
      type: 'article',
      fundamental: true,
      note: 'Primeiro tratamento formal de comparações incompletas no AHP',
      abnt: 'HARKER, P. T. Incomplete pairwise comparisons in the analytic hierarchy process. Mathematical Modelling, v. 9, n. 11, p. 837-848, 1987.',
      bibtex: '@article{harker1987,\n  author = {Patrick T. Harker},\n  title = {Incomplete pairwise comparisons in the analytic hierarchy process},\n  journal = {Mathematical Modelling},\n  volume = {9},\n  number = {11},\n  pages = {837--848},\n  year = {1987}\n}'
    },
    {
      id: 'shiraishi1998',
      authors: 'Shiraishi, S., Obata, T., & Daigo, M.',
      year: 1998,
      title: 'Properties of a positive reciprocal matrix and their application to AHP',
      journal: 'Journal of the Operations Research Society of Japan',
      volume: '41',
      issue: '3',
      pages: '404-414',
      type: 'article',
      note: 'Propriedades de matrizes recíprocas incompletas',
      abnt: 'SHIRAISHI, S.; OBATA, T.; DAIGO, M. Properties of a positive reciprocal matrix and their application to AHP. Journal of the Operations Research Society of Japan, v. 41, n. 3, p. 404-414, 1998.',
      bibtex: '@article{shiraishi1998,\n  author = {Shunsuke Shiraishi and Tsuneshi Obata and Motomasa Daigo},\n  title = {Properties of a positive reciprocal matrix and their application to AHP},\n  journal = {Journal of the Operations Research Society of Japan},\n  volume = {41},\n  number = {3},\n  pages = {404--414},\n  year = {1998}\n}'
    },
    {
      id: 'kwiesielewicz1996',
      authors: 'Kwiesielewicz, M.',
      year: 1996,
      title: 'The logarithmic least squares and the generalized pseudoinverse in estimating ratios',
      journal: 'European Journal of Operational Research',
      volume: '93',
      issue: '3',
      pages: '611-619',
      type: 'article',
      note: 'LLSM para matrizes incompletas via pseudoinversa generalizada',
      abnt: 'KWIESIELEWICZ, M. The logarithmic least squares and the generalized pseudoinverse in estimating ratios. European Journal of Operational Research, v. 93, n. 3, p. 611-619, 1996.',
      bibtex: '@article{kwiesielewicz1996,\n  author = {Mirosław Kwiesielewicz},\n  title = {The logarithmic least squares and the generalized pseudoinverse in estimating ratios},\n  journal = {European Journal of Operational Research},\n  volume = {93},\n  number = {3},\n  pages = {611--619},\n  year = {1996}\n}'
    },
    {
      id: 'bozoki2010',
      authors: 'Bozóki, S., Fülöp, J., & Koczkodaj, W. W.',
      year: 2010,
      title: 'An LP-based inconsistency monitoring of pairwise comparison matrices',
      journal: 'Mathematical and Computer Modelling',
      volume: '54',
      issue: '1-2',
      pages: '789-793',
      type: 'article',
      note: 'Monitoramento de inconsistência via programação linear para IPC',
      abnt: 'BOZÓKI, S.; FÜLÖP, J.; KOCZKODAJ, W. W. An LP-based inconsistency monitoring of pairwise comparison matrices. Mathematical and Computer Modelling, v. 54, n. 1-2, p. 789-793, 2010.',
      bibtex: '@article{bozoki2010,\n  author = {Sándor Bozóki and János Fülöp and Waldemar W. Koczkodaj},\n  title = {An LP-based inconsistency monitoring of pairwise comparison matrices},\n  journal = {Mathematical and Computer Modelling},\n  volume = {54},\n  number = {1-2},\n  pages = {789--793},\n  year = {2010}\n}'
    },
    {
      id: 'crawford1985',
      authors: 'Crawford, G., & Williams, C.',
      year: 1985,
      title: 'A note on the analysis of subjective judgment matrices',
      journal: 'Journal of Mathematical Psychology',
      volume: '29',
      issue: '4',
      pages: '387-405',
      type: 'article',
      note: 'LLSM original — fundamento do método usado em Bozóki (2009)',
      abnt: 'CRAWFORD, G.; WILLIAMS, C. A note on the analysis of subjective judgment matrices. Journal of Mathematical Psychology, v. 29, n. 4, p. 387-405, 1985.',
      bibtex: '@article{crawford1985,\n  author = {Gordon Crawford and Cindy Williams},\n  title = {A note on the analysis of subjective judgment matrices},\n  journal = {Journal of Mathematical Psychology},\n  volume = {29},\n  number = {4},\n  pages = {387--405},\n  year = {1985}\n}'
    },
    {
      id: 'saaty2003',
      authors: 'Saaty, T. L., & Ozdemir, M. S.',
      year: 2003,
      title: 'Why the magic number seven plus or minus two',
      journal: 'Mathematical and Computer Modelling',
      volume: '38',
      issue: '3-4',
      pages: '233-244',
      type: 'article',
      note: 'Fadiga cognitiva em comparações pareadas — justificativa para IPC',
      abnt: 'SAATY, T. L.; OZDEMIR, M. S. Why the magic number seven plus or minus two. Mathematical and Computer Modelling, v. 38, n. 3-4, p. 233-244, 2003.',
      bibtex: '@article{saaty2003,\n  author = {Thomas L. Saaty and Müjgan S. Ozdemir},\n  title = {Why the magic number seven plus or minus two},\n  journal = {Mathematical and Computer Modelling},\n  volume = {38},\n  number = {3-4},\n  pages = {233--244},\n  year = {2003}\n}'
    }
  ]
};

/**
 * Retorna todas as referências em formato específico
 */
export function getAllReferences(format: 'abnt' | 'bibtex' = 'abnt'): string[] {
  const allRefs: any[] = [
    ...BIBLIOGRAFIA.ahp,
    ...BIBLIOGRAFIA.bocr,
    ...BIBLIOGRAFIA.sensitivity,
    ...BIBLIOGRAFIA.consistency,
    ...BIBLIOGRAFIA.applications,
    ...BIBLIOGRAFIA.ipc
  ];

  return allRefs.map(ref => ref[format]);
}

/**
 * Retorna apenas as referências marcadas como fundamentais
 */
export function getFundamentalReferences() {
  const allRefs = [
    ...BIBLIOGRAFIA.ahp,
    ...BIBLIOGRAFIA.bocr,
    ...BIBLIOGRAFIA.sensitivity,
    ...BIBLIOGRAFIA.consistency,
    ...BIBLIOGRAFIA.applications,
    ...BIBLIOGRAFIA.ipc
  ];

  return allRefs.filter((ref: any) => ref.fundamental === true);
}

/**
 * Retorna referências por categoria
 */
export function getReferencesByCategory(category: keyof typeof BIBLIOGRAFIA) {
  return BIBLIOGRAFIA[category];
}

export type BOCRKnowledgeBase = typeof BOCR_KNOWLEDGE_BASE;
export type CorrectFormulas = typeof CORRECT_BOCR_FORMULAS;
