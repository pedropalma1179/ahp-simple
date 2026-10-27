// app/api/response-quality/route.ts
// API para análise de qualidade das respostas - v5.3
//
// Ajuste 1 (A.12 item (c), A.25): a ORIGEM do CR individual.
//   - O CR individual é RECALCULADO dos julgamentos, pelo motor (`lib/consistencia-individual.ts`), e quando os
//     julgamentos são válidos o cache legado (`responses.avgCR` e afins) NÃO prevalece sobre ele.
//   - Ausência não vira zero: `cr` é `null` quando não há CR; `0` é um resultado calculado válido.
//   - As métricas trazem a Magnitude, a média das seis, o máximo e a matriz governante, com os nomes certos.
//   - O bloco `consistenciaIndividual` é o que o Parecer IA transporta. ⚠ Os campos antigos (`status`, `overallScore`,
//     `flags`, `recommendation`) continuam aqui PARA A TELA; o Parecer não os recebe (`lib/ai-reviewer/montagem-do-pedido.ts`).
// Histórico: v5.2 tinha fallback de cálculo; IDs undefined, CR NaN e formatos variados foram tratados antes.

import { NextRequest, NextResponse } from 'next/server';
import {
  consistenciaIndividualDeJulgamentos,
  type ConsistenciaIndividual,
} from '@/lib/consistencia-individual';
import type { Alternative } from '@/lib/data';

// ============================================================
// EXTRAÇÃO DO CR DO CACHE LEGADO
// ============================================================

/**
 * O que o cache legado da resposta traz. ⚠ **Cada campo é `null` quando o cache não o trouxe**, e nunca `0`.
 * O cache só serve de fallback para a TELA quando os julgamentos não são utilizáveis, e a fonte é declarada.
 */
interface CRsDoCache {
  bocr: number | null;
  benefits: number | null;
  opportunities: number | null;
  costs: number | null;
  risks: number | null;
  magnitude: number | null;
  /**
   * O `avgCR` gravado. ⚠ **Semântica heterogênea**: média sobre as 26 matrizes nas respostas coletadas em maio de
   * 2026 (inclui as vinte 2×2, de CR zero), e máximo das seis nas respostas gravadas depois de A.1. O cache não diz qual.
   */
  avgCR: number | null;
  /** Quantos dos cinco CRs por matriz o cache trouxe (sem Magnitude, que só as respostas novas gravam). */
  campos: number;
}

/** Número finito, ou `null`. `undefined`, `null` e NaN são AUSÊNCIA, e nunca viram zero. */
function lerNumero(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : num;
}

/**
 * Extrai o CR do cache de uma resposta individual, em qualquer dos formatos que o sistema já gravou
 * (simulador v5, respondente real, formatos legados). A cascata e as saídas antecipadas são as de antes.
 */
function extractCacheCRs(response: any): CRsDoCache {
  const c: CRsDoCache = {
    bocr: null, benefits: null, opportunities: null, costs: null, risks: null, magnitude: null, avgCR: null, campos: 0,
  };
  const fim = (): CRsDoCache => {
    c.campos = [c.bocr, c.benefits, c.opportunities, c.costs, c.risks].filter(x => x !== null).length;
    return c;
  };

  // FORMATO v5: response.responses.*
  if (response.responses) {
    const r = response.responses;
    const bocr = lerNumero(r.bocrConsistency?.cr);
    if (bocr !== null) c.bocr = bocr;
    const magnitude = lerNumero(r.magnitudeConsistency?.cr);
    if (magnitude !== null) c.magnitude = magnitude;

    const sub = r.subConsistency;
    if (sub) {
      const pares: Array<[keyof CRsDoCache, unknown, unknown]> = [
        ['benefits', sub.B?.cr, sub.Benefits?.cr],
        ['opportunities', sub.O?.cr, sub.Opportunities?.cr],
        ['costs', sub.C?.cr, sub.Costs?.cr],
        ['risks', sub.R?.cr, sub.Risks?.cr],
      ];
      for (const [campo, curto, longo] of pares) {
        const v = lerNumero(longo) ?? lerNumero(curto);
        if (v !== null) (c as any)[campo] = v;
      }
    }

    const media = lerNumero(r.avgCR);
    if (media !== null) {
      c.avgCR = media;
      if (media > 0) return fim(); // «Já temos tudo»: a saída antecipada de sempre
    }
  }

  // FORMATO LEGADO: response.bocrConsistency direto
  const legadoBocr = lerNumero(response.bocrConsistency?.cr);
  if (legadoBocr !== null) c.bocr = legadoBocr;
  if (response.subConsistency) {
    const s = response.subConsistency;
    const b = lerNumero(s.B?.cr); if (b !== null) c.benefits = b;
    const o = lerNumero(s.O?.cr); if (o !== null) c.opportunities = o;
    const k = lerNumero(s.C?.cr); if (k !== null) c.costs = k;
    const r2 = lerNumero(s.R?.cr); if (r2 !== null) c.risks = r2;
  }

  // FORMATO metrics (fallback)
  if (response.metrics) {
    const m = response.metrics;
    const set = (campo: keyof CRsDoCache, v: unknown) => { const n = lerNumero(v); if (n !== null) (c as any)[campo] = n; };
    set('bocr', m.crBOCR); set('benefits', m.crBenefits); set('opportunities', m.crOpportunities);
    set('costs', m.crCosts); set('risks', m.crRisks);
    const media = lerNumero(m.avgCR);
    if (media !== null) {
      c.avgCR = media;
      if (media > 0) return fim();
    }
  }

  // FORMATO: CR direto na resposta (simulador simplificado)
  for (const v of [response.cr, response.consistency?.cr]) {
    const n = lerNumero(v);
    if (n !== null) {
      c.avgCR = n;
      if (n > 0) return fim();
    }
  }

  // FORMATO: dados aninhados em "data"
  if (response.data) {
    const d = response.data;
    const bocr = lerNumero(d.bocrConsistency?.cr);
    if (bocr !== null) c.bocr = bocr;
    const media = lerNumero(d.avgCR);
    if (media !== null) {
      c.avgCR = media;
      if (media > 0) return fim();
    }
  }

  return fim();
}

/**
 * ⚠ **O que o cache pode dizer à tela quando os julgamentos não servem.** Um `avgCR` gravado vale como está; sem ele, a
 * média dos CRs por matriz que o cache trouxe, sobre os que trouxe (zero entra: é valor). Sem nenhum dos dois, `null`.
 */
function crDoCacheParaATela(c: CRsDoCache): { valor: number | null; descricao: string } {
  if (c.avgCR !== null && c.avgCR > 0) {
    return { valor: c.avgCR, descricao: 'avgCR gravado na coleta (o cache não diz se é média sobre 26 matrizes ou máximo das seis)' };
  }
  const presentes = [c.bocr, c.benefits, c.opportunities, c.costs, c.risks].filter((x): x is number => x !== null);
  if (presentes.length > 0) {
    return {
      valor: presentes.reduce((a, b) => a + b, 0) / presentes.length,
      descricao: `média dos ${presentes.length} CRs por matriz que o cache trouxe (de 5; sem Magnitude)`,
    };
  }
  if (c.avgCR !== null) return { valor: c.avgCR, descricao: 'avgCR gravado na coleta' };
  return { valor: null, descricao: '' };
}

/** As alternativas do pedido, quando a tela as envia; senão, as que os próprios julgamentos de alternativas nomeiam. */
function alternativasParaAResposta(declaradas: unknown, judgments: unknown): Alternative[] | null {
  if (Array.isArray(declaradas) && declaradas.length > 0 && declaradas.every((a: any) => a && typeof a.code === 'string')) {
    return declaradas.map((a: any) => ({ ...a, code: a.code, name: a.name ?? a.code, description: a.description ?? '' }));
  }
  if (!Array.isArray(judgments)) return null;
  const codigos = [
    ...new Set(
      judgments
        .filter((j: any) => j && j.type === 'alternatives')
        .flatMap((j: any) => [j.itemA, j.itemB])
        .filter((x: any) => typeof x === 'string' && x !== '')
    ),
  ] as string[];
  return codigos.length > 0 ? codigos.map(code => ({ code, name: code, description: '' })) : null;
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

/**
 * ⚠ `null` é AUSÊNCIA e dá `DESCONHECIDO`; `0` é CR calculado (consistência perfeita) e dá `CONFIÁVEL`. Antes, `0` era
 * os dois, e um respondente perfeitamente consistente saía como «não encontrado».
 */
function classifyRespondent(avgCR: number | null): { status: string; score: number } {
  if (avgCR === null) {
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

/** De onde vem o CR que a tela mostra e que as flags citam. */
type FonteDoCR = 'recalculado_dos_julgamentos' | 'cache_legado' | 'indisponivel';

function detectPatterns(
  response: any,
  cr: { valor: number | null; fonte: FonteDoCR; descricao: string; governante: string | null },
  condicaoDosJulgamentos: string
): Flag[] {
  const flags: Flag[] = [];

  // 1. CR alto (limites de Saaty, 1980: 10% e 20%). ⚠ O texto NOMEIA o que o número é: o máximo das seis matrizes
  //    quando recalculado, e o valor do cache quando não. «CR médio» para o máximo foi o defeito de A.25.
  if (cr.valor !== null && cr.valor > 0.10) {
    const quanto = cr.valor > 0.20 ? 'muito acima' : 'acima';
    const oQue =
      cr.fonte === 'recalculado_dos_julgamentos'
        ? `CR máximo entre as seis matrizes não triviais, ${(cr.valor * 100).toFixed(1)}% (matriz governante: ${cr.governante ?? 'não identificada'})`
        : `CR do cache legado, ${(cr.valor * 100).toFixed(1)}% (${cr.descricao})`;
    flags.push({
      type: 'CR_ALTO',
      severity: cr.valor > 0.20 ? 'GRAVE' : 'ALERTA',
      details: `${oQue} está ${quanto} do limite de 10%`,
    });
  }

  // 2. Sem CR: AUSÊNCIA, e a condição dos julgamentos dita o motivo. (Zero calculado NÃO cai aqui.)
  if (cr.valor === null) {
    flags.push({
      type: 'CR_DESCONHECIDO',
      severity: 'INFO',
      details: `Não foi possível obter o CR individual desta resposta (julgamentos: ${condicaoDosJulgamentos}; sem cache utilizável)`,
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
    const { responses, includeSimulated = true, alternatives } = body;

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json({
        success: false,
        error: 'Parâmetro "responses" é obrigatório e deve ser um array'
      }, { status: 400 });
    }

    console.log(`[QUALITY v5.3] Analisando ${responses.length} respostas`);

    // Filtrar respostas se necessário
    const filteredResponses = includeSimulated
      ? responses
      : responses.filter((r: any) => !r.isSimulated);

    // Analisar cada respondente
    const respondentAnalysis = filteredResponses.map((response: any, idx: number) => {
      // CORREÇÃO: Extrair ID de forma robusta
      const respondentId = extractRespondentId(response, idx);
      const isSimulated = response.isSimulated || false;

      // A ORIGEM: o CR individual é recalculado dos julgamentos. ⚠ O cache NÃO é consultado para decidir isso.
      const julgamentos = response.judgments || response.responses?.judgments;
      const consistenciaIndividual: ConsistenciaIndividual = consistenciaIndividualDeJulgamentos(
        julgamentos,
        alternativasParaAResposta(alternatives, julgamentos)
      );
      const recalculado = consistenciaIndividual.fonte === 'recalculado_dos_julgamentos';

      // O cache legado, lido e conservado À PARTE. Só a TELA o usa, e só quando os julgamentos não servem.
      const cache = extractCacheCRs(response);
      const doCache = crDoCacheParaATela(cache);

      let fonteDoCR: FonteDoCR;
      let valorDoCR: number | null;
      let descricaoDoCR = '';
      if (recalculado) {
        fonteDoCR = 'recalculado_dos_julgamentos';
        // Nome do campo é contrato com os consumidores (`avgCR`); a medida, desde A.1, é o CR GOVERNANTE (o máximo).
        valorDoCR = consistenciaIndividual.maximo;
      } else if (doCache.valor !== null) {
        fonteDoCR = 'cache_legado';
        valorDoCR = doCache.valor;
        descricaoDoCR = doCache.descricao;
      } else {
        fonteDoCR = 'indisponivel';
        valorDoCR = null;
      }

      console.log(`[QUALITY v5.3] Respondente ${respondentId}: CR = ${valorDoCR === null ? 'indisponível' : (valorDoCR * 100).toFixed(2) + '%'} (fonte: ${fonteDoCR})`);

      // Classificar respondente
      const { status, score } = classifyRespondent(valorDoCR);

      // Detectar padrões suspeitos
      const flags = detectPatterns(
        response,
        { valor: valorDoCR, fonte: fonteDoCR, descricao: descricaoDoCR, governante: consistenciaIndividual.matrizGovernante },
        consistenciaIndividual.condicao
      );

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

      const crs = consistenciaIndividual.crPorMatriz;
      return {
        respondentId,
        isSimulated,
        status,
        overallScore: score,
        cr: valorDoCR,
        // De onde vem `cr`. ⚠ `cr` e `metrics.avgCR` são, quando recalculados, o CR GOVERNANTE (o máximo das seis).
        fonteDoCR,
        // O bloco que o Parecer IA transporta: CR por matriz, recalculado dos julgamentos, ou a condição que o impediu.
        consistenciaIndividual,
        // O cache legado, conservado e rotulado; NUNCA misturado ao bloco acima.
        cacheLegado: {
          presente: cache.avgCR !== null || cache.campos > 0 || cache.magnitude !== null,
          avgCR: cache.avgCR,
          camposPorMatriz: cache.campos,
        },
        metrics: {
          avgCR: valorDoCR,
          crBOCR: crs.BOCR ?? cache.bocr,
          crBenefits: crs['SUB-B'] ?? cache.benefits,
          crOpportunities: crs['SUB-O'] ?? cache.opportunities,
          crCosts: crs['SUB-C'] ?? cache.costs,
          crRisks: crs['SUB-R'] ?? cache.risks,
          crMagnitude: crs.MAGNITUDE ?? cache.magnitude,
          meanCR: consistenciaIndividual.media,
          maxCR: consistenciaIndividual.maximo,
          governingMatrix: consistenciaIndividual.matrizGovernante,
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

    // Calcular médias apenas de respondentes com CR conhecido (zero calculado é CR conhecido)
    const knownCRs = respondentAnalysis.filter((r: any) => typeof r.cr === 'number');
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
      // De onde vieram os CRs que as estatísticas acima misturam. ⚠ Só `recalculado_dos_julgamentos` é CR por matriz.
      porFonteDoCR: {
        recalculado_dos_julgamentos: respondentAnalysis.filter((r: any) => r.fonteDoCR === 'recalculado_dos_julgamentos').length,
        cache_legado: respondentAnalysis.filter((r: any) => r.fonteDoCR === 'cache_legado').length,
        indisponivel: respondentAnalysis.filter((r: any) => r.fonteDoCR === 'indisponivel').length,
      },
      flagCounts: {
        CR_ALTO: respondentAnalysis.filter((r: any) => r.flags.some((f: Flag) => f.type === 'CR_ALTO')).length,
        TUDO_IGUAL: respondentAnalysis.filter((r: any) => r.flags.some((f: Flag) => f.type === 'TUDO_IGUAL')).length,
        PADRAO_UNIFORME: respondentAnalysis.filter((r: any) => r.flags.some((f: Flag) => f.type === 'PADRAO_UNIFORME')).length,
        VALORES_EXTREMOS: respondentAnalysis.filter((r: any) => r.flags.some((f: Flag) => f.type === 'VALORES_EXTREMOS')).length,
        CR_DESCONHECIDO: respondentAnalysis.filter((r: any) => r.flags.some((f: Flag) => f.type === 'CR_DESCONHECIDO')).length
      }
    };

    console.log(`[QUALITY v5.3] Resultado: ${byStatus['CONFIÁVEL']} confiáveis, ${byStatus['REVISAR']} revisar, ${byStatus['SUSPEITO']} suspeitos, ${byStatus['CRÍTICO']} críticos, ${byStatus['DESCONHECIDO']} desconhecidos`);

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
