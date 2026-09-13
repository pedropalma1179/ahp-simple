// app/api/ai-reviewer/bias-detection.ts
// ============================================================
// MÓDULO DE DETECÇÃO DE VIÉS EM JULGAMENTOS AHP-BOCR v2.0
// ============================================================
//
// FUNDAMENTAÇÃO CIENTÍFICA — Cada limiar usado neste módulo é
// rastreável a uma publicação. Nenhum valor arbitrário é utilizado.
//
// [1] Saaty, T.L. (1977). A scaling method for priorities in
//     hierarchical structures. J. Math. Psychol., 15(3), 234-281.
//     → CR ≤ 0.10 como limiar de aceitabilidade (p. 248)
//
// [2] Saaty, T.L. (1980). The Analytic Hierarchy Process.
//     McGraw-Hill, New York.
//     → Valores de RCI (Random Consistency Index) por dimensão
//     → Limiar CR ≤ 0.05 para n=3, CR ≤ 0.08 para n=4 (p. 21)
//
// [3] Dodevska, Z., Radovanović, S., Petrović, A. & Delibašić, B.
//     (2023). When Fairness Meets Consistency in AHP Pairwise
//     Comparisons. Mathematics, 11(3), 604.
//     → Disparate Impact (DI) em matrizes de comparação pareada
//     → Eq. 14: DI_aft ≥ 0.80 (limite inferior)
//     → Eq. 15: DI_aft ≤ 1.25 (limite superior simétrico)
//
// [4] Feldman, M., Friedler, S.A., Moeller, J., Scheidegger, C.
//     & Venkatasubramanian, S. (2015). Certifying and removing
//     disparate impact. KDD 2015, pp. 259-268.
//     → "80% rule": DI ≥ 0.80 para ausência de impacto díspar
//
// ============================================================

// ============================================================
// TIPOS EXPORTADOS
// ============================================================

export interface BiasIndicator {
  type:
  | 'CR_INDIVIDUAL_VIOLATION'   // Respondente individual com CR > 0.10
  | 'CR_COLLECTIVE_PATTERN'     // Padrão coletivo de violações de CR
  | 'DISPARATE_IMPACT_BELOW'    // DI < 0.80 (impacto díspar)
  | 'DISPARATE_IMPACT_ABOVE'    // DI > 1.25 (discriminação reversa)
  | 'DI_COMPLIANT'              // DI dentro dos limites
  | 'DI_NOT_CONFIGURED'         // Análise DI disponível mas não configurada
  | 'IPC_DISCONNECTED_GRAPH'    // Grafo desconectado (crítico)
  | 'IPC_LOW_COMPLETENESS'      // Completude < 60%
  | 'IPC_MINIMAL_COMPARISONS'   // Apenas n-1 comparações
  | 'IPC_METHOD_USED';          // LLSM-IPC utilizado
  severity: 'INFO' | 'CRITICAL';
  // Rastreabilidade científica:
  source: string;    // Referência bibliográfica
  threshold: string; // Limiar publicado
  observedValue: string; // Valor observado
  // Detalhes:
  respondentId?: string;
  respondentName?: string;
  description: string;
  evidence: string;
  recommendation: string;
}

export interface BiasAnalysisResult {
  overallRiskLevel: 'LOW' | 'MODERATE' | 'CRITICAL';
  // Nota: 'HIGH' não é usado pois não há limiar publicado que
  // justifique a distinção entre MODERATE e HIGH para proporções
  // de respondentes inconsistentes.

  crComplianceRate: number;  // % respondentes com CR ≤ 0.10 (métrica factual)
  disparateImpact: number | null; // Valor DI calculado, ou null se não configurado
  totalIndicators: number;
  criticalCount: number;
  infoCount: number;
  indicators: BiasIndicator[];
  summary: string;
  academicNote: string;

  // Mantidos para compatibilidade com BiasAnalysisCard
  overallScore: number;    // = crComplianceRate * 100
  warningCount: number;    // = 0 (sem categoria WARNING — ver nota acima)
}

// ============================================================
// TIPOS INTERNOS
// ============================================================

interface RespondentInput {
  id: string;
  name?: string;
  cr: number;
  status: string;
  isSimulated?: boolean;
  metrics?: {
    avgCR?: number;
    maxCR?: number;
  };
}

interface AlternativeScore {
  code: string;
  name: string;
  score: number; // Score final da síntese BOCR (maior = melhor)
}

/**
 * Agrupamento de alternativas por atributo sensível.
 * Necessário para o cálculo de Disparate Impact (Dodevska et al., 2023).
 *
 * Exemplo para investimentos I4.0:
 *   {
 *     attribute: "Maturidade Tecnológica",
 *     discriminated: ['ALT3', 'ALT5'],
 *     privileged: ['ALT1', 'ALT2', 'ALT4']
 *   }
 *
 * O atributo sensível (s) é definido pelo pesquisador conforme o contexto:
 * - Tipo de tecnologia (emergente vs. estabelecida)
 * - Custo de implementação (alto vs. baixo CAPEX)
 * - Maturidade tecnológica (TRL baixo vs. alto)
 */
export interface SensitiveGrouping {
  attribute: string;         // Nome do atributo sensível
  discriminated: string[];   // Códigos das alternativas (s=1)
  privileged: string[];      // Códigos das alternativas (s=0)
}

// ============================================================
// CONSTANTES — TODOS OS LIMIARES SÃO PUBLICADOS
// ============================================================

/** Saaty (1977, p. 248): "require the ratio to be very small; e.g., of the order of 0.1." */
const CR_THRESHOLD = 0.10;

/**
 * Feldman et al. (2015): "80% rule" — DI ≥ 0.80 indica ausência de
 * impacto díspar. Adotado em Dodevska et al. (2023), Eq. 14.
 */
const DI_LOWER_BOUND = 0.80;

/**
 * Dodevska et al. (2023), Eq. 15: DI ≤ 1/0.80 = 1.25.
 * Limite superior simétrico para prevenir discriminação reversa.
 */
const DI_UPPER_BOUND = 1.25;

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

/**
 * Analisa viés nos julgamentos AHP-BOCR usando exclusivamente
 * métricas com limiares publicados na literatura científica.
 *
 * Duas análises são realizadas:
 * A) Análise de Consistência (Saaty, 1977): CR individual por respondente
 * B) Análise de Disparate Impact (Dodevska et al., 2023): se configurada
 */
export function analyzeBias(params: {
  respondents: RespondentInput[];
  finalScores?: AlternativeScore[];
  sensitiveGroups?: SensitiveGrouping;
}): BiasAnalysisResult {
  const { respondents, finalScores, sensitiveGroups } = params;

  const indicators: BiasIndicator[] = [];

  // Analisar todos os respondentes. Se todos forem simulados,
  // a análise permanece válida — os julgamentos simulados seguem
  // as mesmas propriedades matemáticas (CR, DI) dos reais.
  const realRespondents = respondents;

  if (realRespondents.length === 0) {
    return buildEmptyResult('Nenhum respondente real disponível para análise de viés.');
  }

  // ============================================================
  // ANÁLISE A: Consistência Individual (Saaty, 1977)
  // ============================================================
  const crAnalysis = analyzeConsistency(realRespondents);
  indicators.push(...crAnalysis.indicators);

  // ============================================================
  // ANÁLISE B: Disparate Impact (Dodevska et al., 2023)
  // ============================================================
  const diAnalysis = analyzeDisparateImpact(finalScores, sensitiveGroups);
  indicators.push(...diAnalysis.indicators);

  // ============================================================
  // AGREGAÇÃO
  //
  // Regras de classificação (transparentes e documentadas):
  // CRITICAL = violação de limiar publicado de DI (Feldman, 2015;
  //            Dodevska, 2023) OU nenhum respondente atende CR ≤ 0.10
  // MODERATE = ao menos uma violação de CR presente, sem violação de DI
  // LOW      = todos os limiares publicados atendidos
  // ============================================================
  const criticalCount = indicators.filter(i => i.severity === 'CRITICAL').length;
  const infoCount = indicators.filter(i => i.severity === 'INFO').length;
  const hasDIViolation = diAnalysis.diValue !== null && (
    diAnalysis.diValue < DI_LOWER_BOUND || diAnalysis.diValue > DI_UPPER_BOUND
  );
  let overallRiskLevel: 'LOW' | 'MODERATE' | 'CRITICAL';

  // A.21: `hasIPCCritical` saiu daqui. Ele vinha de `analyzeIPC(ipcMetadata)`, e o
  // dashboard nunca enviou `ipcMetadata` — medido em 12/09/2026, zero ocorrências
  // do campo no payload montado em `resultados/page.tsx`. A função devolvia sempre
  // `[]`, então a condição era sempre falsa e a classificação não muda.
  if (hasDIViolation || crAnalysis.complianceRate === 0) {
    overallRiskLevel = 'CRITICAL';
  } else if (crAnalysis.complianceRate < 1.0) {
    overallRiskLevel = 'MODERATE';
  } else {
    overallRiskLevel = 'LOW';
  }

  const summary = generateSummary(crAnalysis, diAnalysis);
  const academicNote = generateAcademicNote(crAnalysis, diAnalysis);

  return {
    overallRiskLevel,
    crComplianceRate: crAnalysis.complianceRate,
    disparateImpact: diAnalysis.diValue,
    totalIndicators: indicators.length,
    criticalCount,
    infoCount,
    indicators,
    summary,
    academicNote,
    // Compatibilidade com BiasAnalysisCard
    overallScore: Math.round(crAnalysis.complianceRate * 100),
    warningCount: 0,
  };
}

// ============================================================
// ANÁLISE A: CONSISTÊNCIA (Saaty, 1977)
// ============================================================

interface CRAnalysisResult {
  complianceRate: number;
  compliantCount: number;
  violationCount: number;
  respondentsWithCR: number;
  indicators: BiasIndicator[];
}

function analyzeConsistency(respondents: RespondentInput[]): CRAnalysisResult {
  const indicators: BiasIndicator[] = [];
  let compliantCount = 0;
  let violationCount = 0;

  for (const r of respondents) {
    const cr = extractCR(r);

    if (cr === null) continue; // CR não disponível

    if (cr > CR_THRESHOLD) {
      violationCount++;
      indicators.push({
        type: 'CR_INDIVIDUAL_VIOLATION',
        severity: 'CRITICAL',
        source: 'Saaty, T.L. (1977). J. Math. Psychol., 15(3), 234-281.',
        threshold: `CR ≤ ${CR_THRESHOLD}`,
        observedValue: `CR = ${(cr * 100).toFixed(1)}%`,
        respondentId: r.id,
        respondentName: r.name,
        description: `Respondente ${r.name || r.id}: CR = ${(cr * 100).toFixed(1)}% excede o limiar de ${(CR_THRESHOLD * 100).toFixed(0)}%.`,
        evidence: `CR observado = ${(cr * 100).toFixed(1)}%, limiar = ${(CR_THRESHOLD * 100).toFixed(0)}% (Saaty, 1977).`,
        recommendation: 'Revisar julgamentos deste respondente. CR > 10% indica violação da transitividade nas comparações pareadas (Saaty, 1977).',
      });
    } else {
      compliantCount++;
    }
  }

  const respondentsWithCR = compliantCount + violationCount;
  const complianceRate = respondentsWithCR > 0 ? compliantCount / respondentsWithCR : 1;

  // Indicador coletivo (apenas se há violações)
  if (respondentsWithCR > 0 && violationCount > 0) {
    indicators.push({
      type: 'CR_COLLECTIVE_PATTERN',
      severity: complianceRate === 0 ? 'CRITICAL' : 'INFO',
      source: 'Saaty, T.L. (1977). J. Math. Psychol., 15(3), 234-281.',
      threshold: `CR ≤ ${CR_THRESHOLD} por respondente`,
      observedValue: `${compliantCount}/${respondentsWithCR} conformes (${(complianceRate * 100).toFixed(1)}%)`,
      description: `${violationCount} de ${respondentsWithCR} respondentes (${((violationCount / respondentsWithCR) * 100).toFixed(1)}%) excedem CR > ${(CR_THRESHOLD * 100).toFixed(0)}%.`,
      evidence: `Taxa de conformidade com Saaty (1977): ${(complianceRate * 100).toFixed(1)}%.`,
      recommendation: complianceRate === 0
        ? 'Nenhum respondente atende o limiar de Saaty (1977). Recomenda-se novo ciclo de coleta com treinamento prévio dos especialistas.'
        : 'Avaliar impacto na agregação. Saaty (1990) recomenda média geométrica para decisão grupal, que atenua julgamentos discrepantes.',
    });
  }

  return { complianceRate, compliantCount, violationCount, respondentsWithCR, indicators };
}

// ============================================================
// ANÁLISE B: DISPARATE IMPACT (Dodevska et al., 2023)
// ============================================================

interface DIAnalysisResult {
  diValue: number | null;
  indicators: BiasIndicator[];
}

/**
 * Calcula Disparate Impact conforme Dodevska et al. (2023), Eq. 10, 14, 15.
 *
 * Adaptação: Dodevska usa rankings (menor posição = melhor), aqui usamos
 * scores da síntese BOCR (maior = melhor). A fórmula adaptada:
 *   DI = avg_score[discriminated] / avg_score[privileged]
 * mantém a interpretação: DI < 0.80 = impacto díspar contra discriminados.
 *
 * Limiares publicados:
 *   DI ≥ 0.80 (Feldman et al., 2015 — "80% rule")
 *   DI ≤ 1.25 (Dodevska et al., 2023, Eq. 15)
 */
function analyzeDisparateImpact(
  finalScores?: AlternativeScore[],
  sensitiveGroups?: SensitiveGrouping,
): DIAnalysisResult {
  const indicators: BiasIndicator[] = [];

  if (!finalScores || finalScores.length === 0) {
    return { diValue: null, indicators: [] };
  }

  if (!sensitiveGroups) {
    indicators.push({
      type: 'DI_NOT_CONFIGURED',
      severity: 'INFO',
      source: 'Dodevska, Z. et al. (2023). Mathematics, 11(3), 604.',
      threshold: `${DI_LOWER_BOUND} ≤ DI ≤ ${DI_UPPER_BOUND} (Eq. 14-15)`,
      observedValue: 'Não calculado — agrupamento sensível não definido',
      description: 'A análise de Disparate Impact (Dodevska et al., 2023) requer que o pesquisador defina o atributo sensível e os grupos de alternativas (privilegiado s=0, discriminado s=1).',
      evidence: 'Infraestrutura disponível. Configuração pendente.',
      recommendation: 'Definir atributo sensível relevante ao contexto (ex.: maturidade tecnológica, intensidade de capital) e classificar cada alternativa.',
    });
    return { diValue: null, indicators };
  }

  const discScores = finalScores
    .filter(a => sensitiveGroups.discriminated.includes(a.code))
    .map(a => a.score);

  const privScores = finalScores
    .filter(a => sensitiveGroups.privileged.includes(a.code))
    .map(a => a.score);

  if (discScores.length === 0 || privScores.length === 0) {
    indicators.push({
      type: 'DI_NOT_CONFIGURED',
      severity: 'INFO',
      source: 'Dodevska, Z. et al. (2023). Mathematics, 11(3), 604.',
      threshold: `${DI_LOWER_BOUND} ≤ DI ≤ ${DI_UPPER_BOUND}`,
      observedValue: 'Grupo(s) vazio(s)',
      description: 'Um ou ambos os grupos estão vazios. Verificar códigos das alternativas.',
      evidence: `Discriminado: ${discScores.length} alt. Privilegiado: ${privScores.length} alt.`,
      recommendation: 'Revisar configuração de SensitiveGrouping.',
    });
    return { diValue: null, indicators };
  }

  const avgDisc = discScores.reduce((a, b) => a + b, 0) / discScores.length;
  const avgPriv = privScores.reduce((a, b) => a + b, 0) / privScores.length;

  if (avgPriv === 0) return { diValue: null, indicators: [] };

  const di = avgDisc / avgPriv;

  if (di < DI_LOWER_BOUND) {
    indicators.push({
      type: 'DISPARATE_IMPACT_BELOW',
      severity: 'CRITICAL',
      source: 'Feldman et al. (2015). KDD 2015. Adotado por Dodevska et al. (2023), Eq. 14.',
      threshold: `DI ≥ ${DI_LOWER_BOUND} ("80% rule")`,
      observedValue: `DI = ${di.toFixed(4)}`,
      description: `Impacto díspar detectado (atributo: "${sensitiveGroups.attribute}"): grupo discriminado alcança ${(di * 100).toFixed(1)}% do score médio do grupo privilegiado.`,
      evidence: `Média discriminado = ${avgDisc.toFixed(4)}, Média privilegiado = ${avgPriv.toFixed(4)}. DI = ${di.toFixed(4)} < ${DI_LOWER_BOUND}.`,
      recommendation: 'Investigar se critérios ou subcritérios contêm viés implícito. Dodevska et al. (2023) demonstram que é possível corrigir a PCM mantendo CR ≤ 0.10 com mínima alteração nos julgamentos.',
    });
  } else if (di > DI_UPPER_BOUND) {
    indicators.push({
      type: 'DISPARATE_IMPACT_ABOVE',
      severity: 'CRITICAL',
      source: 'Dodevska, Z. et al. (2023). Mathematics, 11(3), 604, Eq. 15.',
      threshold: `DI ≤ ${DI_UPPER_BOUND}`,
      observedValue: `DI = ${di.toFixed(4)}`,
      description: `Discriminação reversa: grupo privilegiado é desfavorecido. DI = ${di.toFixed(4)} > ${DI_UPPER_BOUND}.`,
      evidence: `Média discriminado = ${avgDisc.toFixed(4)}, Média privilegiado = ${avgPriv.toFixed(4)}. DI = ${di.toFixed(4)} > ${DI_UPPER_BOUND}.`,
      recommendation: 'Revisar definição dos grupos ou investigar viés nos critérios. O limite superior simétrico (Dodevska et al., 2023) previne que correções prejudiquem o grupo privilegiado.',
    });
  } else {
    indicators.push({
      type: 'DI_COMPLIANT',
      severity: 'INFO',
      source: 'Feldman et al. (2015); Dodevska et al. (2023), Eq. 14-15.',
      threshold: `${DI_LOWER_BOUND} ≤ DI ≤ ${DI_UPPER_BOUND}`,
      observedValue: `DI = ${di.toFixed(4)}`,
      description: `Disparate Impact dentro dos limites publicados (atributo: "${sensitiveGroups.attribute}"). Sem evidência de impacto díspar.`,
      evidence: `DI = ${di.toFixed(4)} ∈ [${DI_LOWER_BOUND}, ${DI_UPPER_BOUND}].`,
      recommendation: 'Resultado satisfatório conforme Feldman et al. (2015) e Dodevska et al. (2023).',
    });
  }

  return { diValue: di, indicators };
}


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function extractCR(r: RespondentInput): number | null {
  // CR = 0 é válido (consistência perfeita). Apenas NaN/undefined/negativo são inválidos.
  if (typeof r.cr === 'number' && !isNaN(r.cr) && r.cr >= 0) return r.cr;
  if (r.metrics?.avgCR !== undefined && typeof r.metrics.avgCR === 'number' && !isNaN(r.metrics.avgCR) && r.metrics.avgCR >= 0) {
    return r.metrics.avgCR;
  }
  return null;
}

function buildEmptyResult(message: string): BiasAnalysisResult {
  return {
    overallRiskLevel: 'LOW',
    crComplianceRate: 1,
    disparateImpact: null,
    totalIndicators: 0,
    criticalCount: 0,
    infoCount: 0,
    indicators: [],
    summary: message,
    academicNote: '',
    overallScore: 100,
    warningCount: 0,
  };
}

// ============================================================
// GERAÇÃO DE TEXTO
// ============================================================

function generateSummary(cr: CRAnalysisResult, di: DIAnalysisResult): string {
  const parts: string[] = [];

  if (cr.violationCount === 0 && cr.compliantCount > 0) {
    parts.push(
      `Todos os ${cr.compliantCount} respondentes apresentam CR ≤ 0.10, ` +
      `atendendo o limiar de Saaty (1977).`
    );
  } else if (cr.violationCount > 0) {
    parts.push(
      `${cr.violationCount} de ${cr.respondentsWithCR} respondentes ` +
      `(${((cr.violationCount / cr.respondentsWithCR) * 100).toFixed(1)}%) ` +
      `excedem CR > 0.10 (Saaty, 1977). ` +
      `Conformidade: ${(cr.complianceRate * 100).toFixed(1)}%.`
    );
  }

  if (di.diValue !== null) {
    const ok = di.diValue >= DI_LOWER_BOUND && di.diValue <= DI_UPPER_BOUND;
    if (ok) {
      parts.push(
        `DI = ${di.diValue.toFixed(4)} ∈ [0.80, 1.25]: sem impacto díspar ` +
        `(Feldman et al., 2015; Dodevska et al., 2023).`
      );
    } else if (di.diValue < DI_LOWER_BOUND) {
      parts.push(
        `DI = ${di.diValue.toFixed(4)} < 0.80: impacto díspar detectado ` +
        `contra grupo discriminado (Feldman et al., 2015; Dodevska et al., 2023).`
      );
    } else {
      parts.push(
        `DI = ${di.diValue.toFixed(4)} > 1.25: discriminação reversa ` +
        `detectada (Dodevska et al., 2023).`
      );
    }
  } else {
    const notConfigured = di.indicators.some(i => i.type === 'DI_NOT_CONFIGURED');
    if (notConfigured) {
      parts.push(
        `Análise de Disparate Impact disponível mas não configurada ` +
        `(requer definição de atributo sensível — Dodevska et al., 2023).`
      );
    }
  }

  return parts.join(' ');
}

function generateAcademicNote(cr: CRAnalysisResult, di: DIAnalysisResult): string {
  const parts: string[] = [];

  parts.push(
    'A análise de viés utiliza exclusivamente métricas com limiares ' +
    'publicados na literatura científica.'
  );

  parts.push(
    'A consistência individual segue CR ≤ 0.10 (Saaty, 1977).'
  );

  if (di.diValue !== null) {
    parts.push(
      `O Disparate Impact (DI = ${di.diValue.toFixed(4)}) foi calculado conforme ` +
      `Dodevska et al. (2023), com limites 0.80 ≤ DI ≤ 1.25 ` +
      `(Feldman et al., 2015; Dodevska et al., 2023, Eq. 14-15).`
    );
  } else {
    parts.push(
      'A infraestrutura para Disparate Impact (Dodevska et al., 2023) está ' +
      'disponível. Requer definição de atributo sensível pelo pesquisador.'
    );
  }

  return parts.join(' ');
}

// ============================================================
// FORMATAÇÃO PARA PROMPT DO LLM
// ============================================================

export function formatBiasForPrompt(analysis: BiasAnalysisResult): string {
  if (analysis.totalIndicators === 0) {
    return 'Nenhum indicador de viés detectado.';
  }

  const lines: string[] = [];

  lines.push(`**Nível de Risco:** ${analysis.overallRiskLevel}`);
  lines.push(`**Conformidade CR (Saaty, 1977):** ${(analysis.crComplianceRate * 100).toFixed(1)}%`);

  if (analysis.disparateImpact !== null) {
    lines.push(`**Disparate Impact (Dodevska et al., 2023):** DI = ${analysis.disparateImpact.toFixed(4)} [limites: 0.80–1.25]`);
  }

  lines.push('');

  const critical = analysis.indicators.filter(i => i.severity === 'CRITICAL');
  const info = analysis.indicators.filter(i => i.severity === 'INFO');

  if (critical.length > 0) {
    lines.push(`**Violações de limiares publicados (${critical.length}):**`);
    const crViolations = critical.filter(i => i.type === 'CR_INDIVIDUAL_VIOLATION');
    const diViolations = critical.filter(i => i.type !== 'CR_INDIVIDUAL_VIOLATION' && i.type !== 'CR_COLLECTIVE_PATTERN');
    const crCollective = critical.filter(i => i.type === 'CR_COLLECTIVE_PATTERN');

    if (crViolations.length > 0) {
      lines.push(`- ${crViolations.length} respondente(s) com CR > 0.10 [Saaty, 1977]`);
      crViolations.slice(0, 5).forEach(i => {
        lines.push(`  • ${i.respondentName || i.respondentId}: ${i.observedValue}`);
      });
      if (crViolations.length > 5) {
        lines.push(`  • ... e mais ${crViolations.length - 5}`);
      }
    }

    crCollective.forEach(i => lines.push(`- ${i.description}`));
    diViolations.forEach(i => lines.push(`- ${i.description}`));

    // IPC Critical
    const ipcCritical = critical.filter(i => i.type.startsWith('IPC_'));
    ipcCritical.forEach(i => lines.push(`- ${i.description} [${i.source}]`));
  }

  if (info.length > 0) {
    lines.push('');
    lines.push(`**Observações (${info.length}):**`);
    info.forEach(i => lines.push(`- ${i.description}`));

    // IPC Info
    // (IPC_METHOD_USED já está em info, mas podemos destacar se quisermos)
  }

  lines.push('');
  lines.push(`**Resumo:** ${analysis.summary}`);

  return lines.join('\n');
}
