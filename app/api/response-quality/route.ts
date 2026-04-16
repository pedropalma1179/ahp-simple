// app/api/response-quality/route.ts
// API para análise de qualidade das respostas - v5.2 com fallback de cálculo
// Extrai CRs individuais de cada respondente corretamente
// Correções: IDs undefined, CR NaN, formatos variados, fallback para judgments brutos

import { NextRequest, NextResponse } from 'next/server';
import { calculateAllWeights } from '@/lib/ahp-ipc';
import type { Judgment } from '@/lib/ahp-ipc';

// ============================================================
// CONSTANTES AHP - Saaty (1980)
// ============================================================

const RANDOM_INDEX: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49
};

// ============================================================
// EXTRAÇÃO DE CRs DO RESPONDENTE - v5.1
// ============================================================

interface RespondentCRs {
  bocr: number;
  benefits: number;
  opportunities: number;
  costs: number;
  risks: number;
  avgCR: number;
}

/**
 * Extrai CRs de uma resposta individual
 * Suporta múltiplos formatos de dados (simulador v5, respondente real, etc.)
 * v5.1: Correção para evitar NaN e melhor extração
 */
function extractRespondentCRs(response: any): RespondentCRs {
  const crs: RespondentCRs = {
    bocr: 0,
    benefits: 0,
    opportunities: 0,
    costs: 0,
    risks: 0,
    avgCR: 0
  };
  
  // Helper para garantir número válido
  const safeNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };
  
  // ============================================================
  // FORMATO v5: response.responses.bocrConsistency
  // ============================================================
  if (response.responses) {
    // CR BOCR
    if (response.responses.bocrConsistency?.cr !== undefined) {
      crs.bocr = safeNumber(response.responses.bocrConsistency.cr);
    }
    
    // CRs dos subcritérios
    const subCons = response.responses.subConsistency;
    if (subCons) {
      if (subCons.B?.cr !== undefined) crs.benefits = safeNumber(subCons.B.cr);
      if (subCons.O?.cr !== undefined) crs.opportunities = safeNumber(subCons.O.cr);
      if (subCons.C?.cr !== undefined) crs.costs = safeNumber(subCons.C.cr);
      if (subCons.R?.cr !== undefined) crs.risks = safeNumber(subCons.R.cr);
      
      // Fallback: subcritérios com nomes completos
      if (subCons.Benefits?.cr !== undefined) crs.benefits = safeNumber(subCons.Benefits.cr);
      if (subCons.Opportunities?.cr !== undefined) crs.opportunities = safeNumber(subCons.Opportunities.cr);
      if (subCons.Costs?.cr !== undefined) crs.costs = safeNumber(subCons.Costs.cr);
      if (subCons.Risks?.cr !== undefined) crs.risks = safeNumber(subCons.Risks.cr);
    }
    
    // CR médio já calculado
    if (response.responses.avgCR !== undefined) {
      crs.avgCR = safeNumber(response.responses.avgCR);
      if (crs.avgCR > 0) return crs; // Já temos tudo!
    }
  }
  
  // ============================================================
  // FORMATO LEGADO: response.bocrConsistency direto
  // ============================================================
  if (response.bocrConsistency?.cr !== undefined) {
    crs.bocr = safeNumber(response.bocrConsistency.cr);
  }
  
  if (response.subConsistency) {
    if (response.subConsistency.B?.cr !== undefined) crs.benefits = safeNumber(response.subConsistency.B.cr);
    if (response.subConsistency.O?.cr !== undefined) crs.opportunities = safeNumber(response.subConsistency.O.cr);
    if (response.subConsistency.C?.cr !== undefined) crs.costs = safeNumber(response.subConsistency.C.cr);
    if (response.subConsistency.R?.cr !== undefined) crs.risks = safeNumber(response.subConsistency.R.cr);
  }
  
  // ============================================================
  // FORMATO metrics (fallback)
  // ============================================================
  if (response.metrics) {
    if (response.metrics.crBOCR !== undefined) crs.bocr = safeNumber(response.metrics.crBOCR);
    if (response.metrics.crBenefits !== undefined) crs.benefits = safeNumber(response.metrics.crBenefits);
    if (response.metrics.crOpportunities !== undefined) crs.opportunities = safeNumber(response.metrics.crOpportunities);
    if (response.metrics.crCosts !== undefined) crs.costs = safeNumber(response.metrics.crCosts);
    if (response.metrics.crRisks !== undefined) crs.risks = safeNumber(response.metrics.crRisks);
    if (response.metrics.avgCR !== undefined) {
      crs.avgCR = safeNumber(response.metrics.avgCR);
      if (crs.avgCR > 0) return crs;
    }
  }
  
  // ============================================================
  // FORMATO: CR direto na resposta (simulador simplificado)
  // ============================================================
  if (response.cr !== undefined) {
    crs.avgCR = safeNumber(response.cr);
    if (crs.avgCR > 0) return crs;
  }
  
  if (response.consistency?.cr !== undefined) {
    crs.avgCR = safeNumber(response.consistency.cr);
    if (crs.avgCR > 0) return crs;
  }
  
  // ============================================================
  // FORMATO: Dados aninhados em "data"
  // ============================================================
  if (response.data) {
    const data = response.data;
    if (data.bocrConsistency?.cr !== undefined) {
      crs.bocr = safeNumber(data.bocrConsistency.cr);
    }
    if (data.avgCR !== undefined) {
      crs.avgCR = safeNumber(data.avgCR);
      if (crs.avgCR > 0) return crs;
    }
  }
  
  // ============================================================
  // CALCULAR CR MÉDIO se não encontrado
  // ============================================================
  const validCRs = [crs.bocr, crs.benefits, crs.opportunities, crs.costs, crs.risks]
    .filter(cr => cr > 0);
  
  if (validCRs.length > 0) {
    crs.avgCR = validCRs.reduce((a, b) => a + b, 0) / validCRs.length;
  } else {
    // Se não encontrou nenhum CR, retornar 0 (será classificado como desconhecido)
    crs.avgCR = 0;
  }
  
  // Garantir que avgCR não é NaN
  if (isNaN(crs.avgCR)) {
    crs.avgCR = 0;
  }
  
  return crs;
}

/**
 * Fallback: calcula CRs a partir dos judgments brutos quando o campo responses não existe.
 * Usa calculateAllWeights da lib ahp-ipc (mesma lógica do frontend e simulador).
 */
function computeCRsFromJudgments(response: any): RespondentCRs | null {
  const judgments = response.judgments || response.responses?.judgments;
  if (!judgments || !Array.isArray(judgments) || judgments.length === 0) return null;

  // Extrair códigos de alternativas dos judgments de tipo 'alternatives'
  const altJudgments = judgments.filter((j: any) => j.type === 'alternatives');
  const altCodes = [...new Set(altJudgments.flatMap((j: any) => [j.itemA, j.itemB]).filter(Boolean))] as string[];
  if (altCodes.length === 0) {
    // Fallback: usar A1, A2 como default (projeto com 2 alternativas)
    altCodes.push('A1', 'A2');
  }

  try {
    const result = calculateAllWeights(judgments as Judgment[], altCodes);

    return {
      bocr: result.bocrWeights.cr,
      benefits: result.subWeights['B']?.cr || 0,
      opportunities: result.subWeights['O']?.cr || 0,
      costs: result.subWeights['C']?.cr || 0,
      risks: result.subWeights['R']?.cr || 0,
      avgCR: result.avgCR,
    };
  } catch (e) {
    console.warn('[QUALITY] Fallback CR computation failed:', e);
    return null;
  }
}

/**
 * Extrai ID do respondente de várias fontes possíveis
 */
function extractRespondentId(response: any, idx: number): string {
  // Tentar várias fontes de ID
  const possibleIds = [
    response.respondentId,
    response.visitorId,
    response.id,
    response.responses?.respondentId,
    response.responses?.visitorId,
    response.data?.respondentId,
    response.userId,
    response.email?.split('@')[0], // Usar parte do email como fallback
  ];
  
  for (const id of possibleIds) {
    if (id && id !== 'undefined' && id !== 'null') {
      return String(id);
    }
  }
  
  // Fallback: gerar ID baseado no índice
  return `respondente_${idx + 1}`;
}

// ============================================================
// CLASSIFICAÇÃO DE RESPONDENTE - Saaty (1980)
// ============================================================

function classifyRespondent(avgCR: number): { status: string; score: number } {
  // Se CR = 0 (não encontrado), classificar como desconhecido
  if (avgCR === 0) {
    return { status: 'DESCONHECIDO', score: 50 };
  }
  
  if (avgCR <= 0.05) {
    return { status: 'CONFIÁVEL', score: 100 };
  } else if (avgCR <= 0.10) {
    return { status: 'CONFIÁVEL', score: Math.round(95 - (avgCR - 0.05) * 140) };
  } else if (avgCR <= 0.15) {
    return { status: 'REVISAR', score: Math.round(87 - (avgCR - 0.10) * 340) };
  } else if (avgCR <= 0.20) {
    return { status: 'SUSPEITO', score: Math.round(69 - (avgCR - 0.15) * 380) };
  } else {
    return { status: 'CRÍTICO', score: Math.max(0, Math.round(49 - (avgCR - 0.20) * 200)) };
  }
}

// ============================================================
// DETECÇÃO DE PADRÕES SUSPEITOS
// ============================================================

interface Flag {
  type: string;
  severity: 'INFO' | 'ALERTA' | 'GRAVE';
  details: string;
}

function detectPatterns(response: any, crs: RespondentCRs): Flag[] {
  const flags: Flag[] = [];
  
  // 1. CR Alto (apenas se > 10%, conforme Saaty 1980)
  if (crs.avgCR > 0.20) {
    flags.push({
      type: 'CR_ALTO',
      severity: 'GRAVE',
      details: `CR médio de ${(crs.avgCR * 100).toFixed(1)}% está muito acima do limite de 10%`
    });
  } else if (crs.avgCR > 0.10) {
    flags.push({
      type: 'CR_ALTO',
      severity: 'ALERTA',
      details: `CR médio de ${(crs.avgCR * 100).toFixed(1)}% está acima do limite de 10%`
    });
  }
  
  // 2. CR = 0 (não foi possível extrair)
  if (crs.avgCR === 0) {
    flags.push({
      type: 'CR_DESCONHECIDO',
      severity: 'INFO',
      details: 'Não foi possível extrair CR individual desta resposta'
    });
  }
  
  // 3. Verificar padrões uniformes nos julgamentos
  const judgments = response.judgments || response.responses?.judgments || [];
  if (judgments.length > 0) {
    const values = judgments
      .map((j: any) => j.saatyValue || j.value)
      .filter((v: any) => v !== undefined);
    
    if (values.length > 0) {
      const uniqueValues = new Set(values);
      
      // Tudo igual
      if (uniqueValues.size === 1) {
        flags.push({
          type: 'TUDO_IGUAL',
          severity: 'GRAVE',
          details: `Todas as ${values.length} comparações têm o mesmo valor (${values[0]})`
        });
      }
      
      // Padrão muito uniforme
      else if (uniqueValues.size <= 2 && values.length > 10) {
        flags.push({
          type: 'PADRAO_UNIFORME',
          severity: 'ALERTA',
          details: `Apenas ${uniqueValues.size} valores diferentes em ${values.length} comparações`
        });
      }
      
      // 4. Uso excessivo de extremos
      const extremeCount = values.filter((v: number) => v === 1 || v === 9).length;
      const extremeRatio = extremeCount / values.length;
      if (extremeRatio > 0.7 && values.length > 5) {
        flags.push({
          type: 'VALORES_EXTREMOS',
          severity: 'ALERTA',
          details: `${(extremeRatio * 100).toFixed(0)}% das respostas são valores extremos (1 ou 9)`
        });
      }
    }
  }
  
  return flags;
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { responses, includeSimulated = true } = body;
    
    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetro "responses" é obrigatório e deve ser um array'
      }, { status: 400 });
    }
    
    console.log(`[QUALITY v5.1] Analisando ${responses.length} respostas`);
    
    // Filtrar respostas se necessário
    const filteredResponses = includeSimulated 
      ? responses 
      : responses.filter((r: any) => !r.isSimulated);
    
    // Analisar cada respondente
    const respondentAnalysis = filteredResponses.map((response: any, idx: number) => {
      // CORREÇÃO: Extrair ID de forma robusta
      const respondentId = extractRespondentId(response, idx);
      const isSimulated = response.isSimulated || false;
      
      // Extrair CRs individuais
      let crs = extractRespondentCRs(response);

      // Fallback: se avgCR === 0 (campo responses ausente), calcular a partir dos judgments brutos
      if (crs.avgCR === 0) {
        const fallbackCRs = computeCRsFromJudgments(response);
        if (fallbackCRs && fallbackCRs.avgCR > 0) {
          crs = fallbackCRs;
          console.log(`[QUALITY v5.2] Fallback: calculado CR de judgments para ${respondentId}`);
        }
      }

      // Log para debug
      console.log(`[QUALITY v5.2] Respondente ${respondentId}: avgCR = ${(crs.avgCR * 100).toFixed(2)}%`);
      
      // Classificar respondente
      const { status, score } = classifyRespondent(crs.avgCR);
      
      // Detectar padrões suspeitos
      const flags = detectPatterns(response, crs);
      
      // Gerar recomendação
      let recommendation = '';
      if (status === 'CONFIÁVEL') {
        recommendation = 'Respostas dentro dos parâmetros aceitáveis. Incluir na análise.';
      } else if (status === 'REVISAR') {
        recommendation = 'CR marginalmente alto. Revisar julgamentos antes de incluir.';
      } else if (status === 'SUSPEITO') {
        recommendation = 'Padrões suspeitos detectados. Considerar exclusão ou solicitar nova resposta.';
      } else if (status === 'DESCONHECIDO') {
        recommendation = 'CR individual não disponível. Verificar dados da resposta.';
      } else {
        recommendation = 'CR crítico ou padrões inválidos. Recomenda-se exclusão da análise.';
      }
      
      return {
        respondentId,
        isSimulated,
        status,
        overallScore: score,
        cr: crs.avgCR,
        metrics: {
          avgCR: crs.avgCR,
          crBOCR: crs.bocr,
          crBenefits: crs.benefits,
          crOpportunities: crs.opportunities,
          crCosts: crs.costs,
          crRisks: crs.risks
        },
        flags,
        recommendation
      };
    });
    
    // Calcular estatísticas gerais
    const total = respondentAnalysis.length;
    const byStatus = {
      'CONFIÁVEL': respondentAnalysis.filter((r: any) => r.status === 'CONFIÁVEL').length,
      'REVISAR': respondentAnalysis.filter((r: any) => r.status === 'REVISAR').length,
      'SUSPEITO': respondentAnalysis.filter((r: any) => r.status === 'SUSPEITO').length,
      'CRÍTICO': respondentAnalysis.filter((r: any) => r.status === 'CRÍTICO').length,
      'DESCONHECIDO': respondentAnalysis.filter((r: any) => r.status === 'DESCONHECIDO').length
    };
    
    // Calcular médias apenas de respondentes com CR conhecido
    const knownCRs = respondentAnalysis.filter((r: any) => r.cr > 0);
    const avgCR = knownCRs.length > 0 
      ? knownCRs.reduce((sum: number, r: any) => sum + r.cr, 0) / knownCRs.length 
      : 0;
    
    const avgScore = total > 0 
      ? respondentAnalysis.reduce((sum: number, r: any) => sum + r.overallScore, 0) / total 
      : 0;
    
    const statistics = {
      total,
      byStatus,
      avgCR,
      avgScore,
      knownCRCount: knownCRs.length,
      flagCounts: {
        CR_ALTO: respondentAnalysis.filter((r: any) => r.flags.some((f: Flag) => f.type === 'CR_ALTO')).length,
        TUDO_IGUAL: respondentAnalysis.filter((r: any) => r.flags.some((f: Flag) => f.type === 'TUDO_IGUAL')).length,
        PADRAO_UNIFORME: respondentAnalysis.filter((r: any) => r.flags.some((f: Flag) => f.type === 'PADRAO_UNIFORME')).length,
        VALORES_EXTREMOS: respondentAnalysis.filter((r: any) => r.flags.some((f: Flag) => f.type === 'VALORES_EXTREMOS')).length,
        CR_DESCONHECIDO: respondentAnalysis.filter((r: any) => r.flags.some((f: Flag) => f.type === 'CR_DESCONHECIDO')).length
      }
    };
    
    console.log(`[QUALITY v5.1] Resultado: ${byStatus['CONFIÁVEL']} confiáveis, ${byStatus['REVISAR']} revisar, ${byStatus['SUSPEITO']} suspeitos, ${byStatus['CRÍTICO']} críticos, ${byStatus['DESCONHECIDO']} desconhecidos`);
    
    // Determinar status geral
    const problematicRatio = (byStatus['SUSPEITO'] + byStatus['CRÍTICO']) / total;
    const unknownRatio = byStatus['DESCONHECIDO'] / total;
    
    let overallStatus = 'EXCELENTE';
    let overallRecommendation = 'Qualidade excelente. Todos os respondentes dentro dos parâmetros.';
    
    if (unknownRatio > 0.5) {
      overallStatus = 'DADOS INCOMPLETOS';
      overallRecommendation = 'Mais de 50% das respostas não possuem CR individual. Verificar formato dos dados.';
    } else if (problematicRatio > 0.3) {
      overallStatus = 'CRÍTICA';
      overallRecommendation = 'Mais de 30% dos respondentes apresentam problemas. Revisão urgente necessária.';
    } else if (problematicRatio > 0.2) {
      overallStatus = 'PROBLEMÁTICA';
      overallRecommendation = 'Mais de 20% dos respondentes apresentam problemas. Considere exclusões.';
    } else if (problematicRatio > 0.1) {
      overallStatus = 'ACEITÁVEL';
      overallRecommendation = 'Alguns respondentes requerem atenção, mas a maioria está dentro dos parâmetros.';
    } else if (byStatus['REVISAR'] > 0) {
      overallStatus = 'BOA';
      overallRecommendation = 'Qualidade boa. Alguns respondentes com CR marginal, mas aceitável.';
    }
    
    return NextResponse.json({
      success: true,
      analysis: {
        respondents: respondentAnalysis,
        statistics,
        overall: {
          status: overallStatus,
          qualityScore: Math.round(avgScore),
          recommendation: overallRecommendation
        }
      }
    });
    
  } catch (error: any) {
    console.error('Erro na análise de qualidade:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno ao analisar qualidade das respostas'
    }, { status: 500 });
  }
}
