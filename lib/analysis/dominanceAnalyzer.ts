/**
 * Dominance Analyzer for BOCR Merit Weights
 * 
 * Detects when one BOCR merit dimension (Benefits, Opportunities, Costs, Risks)
 * dominates others (ratio ≥ 3:1), then classifies the dominance using a 3-layer
 * framework: (1) panel profile, (2) industry/market context, (3) final classification.
 * 
 * References:
 * - Neely et al. (2020) — Upper Echelons Theory metacritiques, cognitive black box
 * - Saiyed et al. (2023) — CEO power & cognitive bias in volatile contexts
 * - Ayan et al. (2023) — Subjective weighting methods carry panel bias
 */

// ============================================================
// TYPES
// ============================================================

export type Merit = 'Benefits' | 'Opportunities' | 'Costs' | 'Risks';

export type DominanceClassification =
  | 'contextualized'              // Sector/market justifies the dominance
  | 'professional_bias_supported' // Panel composition aligns with dominance
  | 'unexplained'                 // Neither context nor panel explain it
  | 'no_dominance';               // Ratio < threshold

export interface DominanceAnalysis {
  isDominance: boolean;
  ratio: number;
  dominantMerit: Merit | null;
  dominantWeight: number;
  minMerit: Merit | null;
  minWeight: number;
  classification: DominanceClassification;
  panelInsight: string;
  contextInsight: string;
  reasoning: string;
  recommendedRefs: string[];
}

// ============================================================
// MERIT LABELS (PT-BR)
// ============================================================

const MERIT_LABELS: Record<Merit, string> = {
  Benefits: 'Benefits (Benefícios)',
  Opportunities: 'Opportunities (Oportunidades)',
  Costs: 'Costs (Custos)',
  Risks: 'Risks (Riscos)',
};

// ============================================================
// HEURISTIC MATCHERS
// ============================================================

const COST_FUNCTIONS = ['financ', 'controller', 'controlad', 'contábil', 'contabil', 'procurement', 'compras', 'supply', 'supriment', 'tesour', 'orçament'];
const RISK_FUNCTIONS = ['safety', 'segurança', 'seguranca', 'quality', 'qualidade', 'compliance', 'audit', 'risk', 'risco', 'manutenç', 'manutenc'];
const BENEFIT_FUNCTIONS = ['sales', 'vendas', 'commercial', 'comercial', 'marketing', 'product', 'produto', 'innovation', 'inovaç', 'inovac', 'p&d', 'r&d'];
const OPPORTUNITY_FUNCTIONS = ['strategy', 'estratég', 'estrateg', 'planning', 'planejament', 'development', 'desenvolviment', 'business dev'];

const COST_DOMINANT_INDUSTRIES = ['automotiv', 'automotive', 'manufactur', 'manufatur', 'industry 4', 'indústria 4', 'industria 4', 'paint shop', 'pintura', 'assembly', 'montagem', 'metalurg', 'siderurg'];

function matchesAny(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some(p => lower.includes(p));
}

// ============================================================
// MAIN ANALYZER
// ============================================================

const DOMINANCE_THRESHOLD = 3; // ratio ≥ 3:1 triggers analysis

export function analyzeDominance(
  weights: { Benefits: number; Opportunities: number; Costs: number; Risks: number },
  panelFunctions?: string[],
  panelAreas?: string[],
  projectContext?: { name?: string; description?: string }
): DominanceAnalysis {
  // Calculate ratio
  const entries = (Object.entries(weights) as [Merit, number][])
    .filter(([, v]) => typeof v === 'number' && isFinite(v) && v > 0);

  if (entries.length < 2) {
    return makeNoResult(0);
  }

  const maxEntry = entries.reduce((a, b) => b[1] > a[1] ? b : a);
  const minEntry = entries.reduce((a, b) => b[1] < a[1] ? b : a);
  const ratio = minEntry[1] > 0 ? maxEntry[1] / minEntry[1] : Infinity;

  if (!isFinite(ratio) || ratio < DOMINANCE_THRESHOLD) {
    return makeNoResult(ratio);
  }

  const dominant = maxEntry[0];
  const minor = minEntry[0];
  const recommendedRefs: string[] = [];
  let classification: DominanceClassification = 'unexplained';
  let panelInsight = 'Dados de composição do painel não disponíveis.';
  let contextInsight = 'Contexto setorial não determinado.';

  // ── Layer 1: Panel Profile ──
  const allPanelTerms = [...(panelFunctions || []), ...(panelAreas || [])].join(' ');

  if (allPanelTerms.length > 0) {
    const meritMatchMap: Record<Merit, string[]> = {
      Costs: COST_FUNCTIONS,
      Risks: RISK_FUNCTIONS,
      Benefits: BENEFIT_FUNCTIONS,
      Opportunities: OPPORTUNITY_FUNCTIONS,
    };

    const targetPatterns = meritMatchMap[dominant];
    if (targetPatterns && matchesAny(allPanelTerms, targetPatterns)) {
      classification = 'professional_bias_supported';
      panelInsight = `A composição funcional do painel (funções: ${(panelFunctions || []).join(', ')}) apresenta alinhamento com a dimensão dominante (${MERIT_LABELS[dominant]}). Conforme Upper Echelons Theory (Neely et al., 2020), especialistas filtram decisões pela lente de sua experiência profissional — o campo de visão limitado (limited field of vision) e a percepção seletiva (selective perception) direcionam naturalmente a priorização para a dimensão mais familiar à sua função. Saiyed et al. (2023) demonstraram empiricamente que este efeito é amplificado em contextos de alta volatilidade e incerteza.`;
      recommendedRefs.push('neely2020_upperEchelonsMetacritiques', 'saiyed2023_ceoPowerUET');
    } else {
      panelInsight = `A composição funcional do painel (funções: ${(panelFunctions || []).join(', ')}) não apresenta alinhamento direto com a dimensão dominante (${MERIT_LABELS[dominant]}). A dominância pode refletir prioridade estratégica genuína ou necessita de investigação adicional.`;
    }
  } else {
    recommendedRefs.push('ayan2023_weightingMethodsMCDM');
  }

  // ── Layer 2: Industry/Market Context ──
  const contextText = [projectContext?.name || '', projectContext?.description || ''].join(' ');

  if (dominant === 'Costs' && matchesAny(contextText, COST_DOMINANT_INDUSTRIES)) {
    if (classification === 'unexplained') classification = 'contextualized';
    contextInsight = `O contexto do projeto ("${projectContext?.name || 'N/A'}") pertence a um setor industrial (automotivo/manufatura/Indústria 4.0) onde a dominância de Custos é um padrão empírico recorrente documentado na literatura. Em estudos MCDM aplicados a este domínio, implementation cost emerge consistentemente como dimensão prioritária.`;
    if (!recommendedRefs.includes('neely2020_upperEchelonsMetacritiques')) {
      recommendedRefs.push('neely2020_upperEchelonsMetacritiques');
    }
  } else if (contextText.length > 5) {
    contextInsight = `O contexto do projeto ("${projectContext?.name || 'N/A'}") não apresenta indicadores claros que justifiquem a dominância de ${MERIT_LABELS[dominant]} por si só. A análise deve considerar fatores adicionais (composição do painel, momento estratégico da organização).`;
  }

  // ── Layer 3: Final reasoning ──
  let reasoning = `Dominância detectada: ${MERIT_LABELS[dominant]} (peso = ${maxEntry[1].toFixed(4)}) é ${ratio.toFixed(2)}× maior que ${MERIT_LABELS[minor]} (peso = ${minEntry[1].toFixed(4)}).`;

  if (classification === 'contextualized') {
    reasoning += ` Classificação: CONTEXTUALIZADA — o setor/mercado justifica esta distribuição. Deve ser reportada como característica do domínio, não como limitação metodológica.`;
  } else if (classification === 'professional_bias_supported') {
    reasoning += ` Classificação: VIÉS PROFISSIONAL SUPORTADO — a composição funcional do painel está alinhada com a dimensão dominante. Conforme Upper Echelons Theory (Neely et al., 2020; Saiyed et al., 2023), este padrão é esperado e documentado. Deve ser reportado como característica metodológica transparente, não como defeito.`;
  } else {
    reasoning += ` Classificação: SEM EXPLICAÇÃO CLARA — nem o contexto setorial nem a composição do painel justificam a dominância. Recomenda-se investigação adicional: validação com painel diversificado (Ayan et al., 2023) e análise de sensibilidade do ranking à variação dos pesos.`;
    if (!recommendedRefs.includes('ayan2023_weightingMethodsMCDM')) {
      recommendedRefs.push('ayan2023_weightingMethodsMCDM');
    }
  }

  return {
    isDominance: true,
    ratio,
    dominantMerit: dominant,
    dominantWeight: maxEntry[1],
    minMerit: minor,
    minWeight: minEntry[1],
    classification,
    panelInsight,
    contextInsight,
    reasoning,
    recommendedRefs,
  };
}

function makeNoResult(ratio: number): DominanceAnalysis {
  return {
    isDominance: false,
    ratio: isFinite(ratio) ? ratio : 0,
    dominantMerit: null,
    dominantWeight: 0,
    minMerit: null,
    minWeight: 0,
    classification: 'no_dominance',
    panelInsight: '',
    contextInsight: '',
    reasoning: '',
    recommendedRefs: [],
  };
}

// ============================================================
// PROMPT SECTION BUILDER
// ============================================================

export function buildDominancePromptSection(analysis: DominanceAnalysis): string {
  if (!analysis.isDominance || !analysis.dominantMerit) {
    return '';
  }

  const classLabel: Record<DominanceClassification, string> = {
    contextualized: '🟢 DOMINÂNCIA CONTEXTUALIZADA (setor/mercado justifica)',
    professional_bias_supported: '🟡 DOMINÂNCIA COM SUPORTE EM VIÉS PROFISSIONAL DOCUMENTADO',
    unexplained: '🔴 DOMINÂNCIA SEM EXPLICAÇÃO CLARA',
    no_dominance: '',
  };

  return `
## ⚖️ ANÁLISE DE DOMINÂNCIA DE MÉRITO BOCR (AUTOMÁTICA)

**ALERTA:** O sistema detectou dominância significativa entre os méritos BOCR. Você DEVE abordar esta análise no parecer, na seção "Pesos BOCR e Hierarquia de Controle".

**Dados:**
- Mérito dominante: **${MERIT_LABELS[analysis.dominantMerit]}** (peso = ${analysis.dominantWeight.toFixed(4)})
- Mérito mínimo: **${MERIT_LABELS[analysis.minMerit!]}** (peso = ${analysis.minWeight.toFixed(4)})
- Ratio: **${analysis.ratio.toFixed(2)}:1** (threshold de análise: ${DOMINANCE_THRESHOLD}:1)
- Classificação: **${classLabel[analysis.classification]}**

**Análise do Perfil do Painel (Camada 1):**
${analysis.panelInsight}

**Análise do Contexto Setorial (Camada 2):**
${analysis.contextInsight}

**Raciocínio Integrado (Camada 3):**
${analysis.reasoning}

**Referências RAG recomendadas para esta análise:**
${analysis.recommendedRefs.map(r => `- ${r}`).join('\n')}

**INSTRUÇÃO MANDATÓRIA:** NÃO classifique esta dominância automaticamente como "limitação metodológica". Aplique as três camadas e reporte conforme a classificação acima. Uma dominância contextualizada ou suportada por viés profissional documentado é uma CARACTERÍSTICA válida do estudo, NÃO um defeito.
`;
}
