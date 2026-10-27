/**
 * lib/ai-reviewer/montagem-do-pedido.ts
 *
 * **A montagem do pedido que a tela envia a `/api/ai-reviewer`**, movida de `runAiReview`
 * (`app/decisor/resultados/[projectId]/page.tsx`) para uma função PURA, para que os testes executem a montagem REAL
 * (a tela é `'use client'` e nenhum teste a executa). Quem chama continua sendo a tela, que lê o estado (documento de
 * cálculo, projeto, análise de qualidade, respostas, exclusões, demografia) e envia o corpo devolvido.
 *
 * ⚠ **Mudança estrutural com UMA mudança de comportamento declarada** (Ajuste 1, A.12 item (c)): a parte de
 * QUALIDADE INDIVIDUAL. Todo o resto — pesos, consistência agregada, ranking, sensibilidade, demografia, vínculo,
 * exclusões — é o que a tela montava, linha a linha, e a igualdade é conferida em `consistencia-individual-pedido.test.ts`.
 *
 * Na parte de qualidade, o pedido ANTERIOR levava, por respondente, o objeto inteiro da API de qualidade (`status`,
 * `overallScore`, `flags`, `recommendation`, `cr`, `metrics`) e, no painel, `statistics.byStatus` (com `REVISAR`
 * fixo em 0), `overall`, `summary`, `overallStats` e `individualStats`: categorias de pessoas e scores sem lastro,
 * classificados na própria tela pelo `cr` recebido, que era o cache legado. O pedido ATUAL leva, por respondente,
 * só a identidade e o bloco `consistenciaIndividual` (CR por matriz, recalculado dos julgamentos), e nada agregado.
 *
 * ⚠ **A lista enviada é a do vínculo**: as exclusões do gestor e a restrição pelo documento de cálculo são aplicadas
 * antes (`prepararVinculoDaTela`), e o resumo do painel que a rota monta sai dessa lista. Um resumo do painel completo
 * não viaja como o de um painel reduzido.
 */

import {
  idDoElementoNoFallback,
  prepararVinculoDaTela,
  type PreparacaoDoVinculo,
} from './vinculo-execucao';
import { classificarAvaliacaoDaTela, type AvaliacaoQualidade } from './avaliacao-qualidade';
import { consistenciaIndividualDeJulgamentos } from '../consistencia-individual';

export interface EntradaDaMontagem {
  /** O documento de cálculo apresentado (execução). */
  calculation: any;
  project: { name?: string; description?: string; alternatives?: any[] };
  projectId: string;
  /** `analysis` devolvida por `/api/response-quality`, ou `null` se a análise não existe. */
  qualityAnalysis: any | null;
  /** As respostas carregadas pela tela. */
  projectResponses: any[];
  /** Os identificadores que o gestor excluiu. */
  excludedIds: string[];
  /** A demografia carregada pela tela. */
  demographics: Array<Record<string, any>>;
}

export interface PedidoMontado {
  /** O corpo enviado, já como o `JSON.stringify` o entrega (sem `undefined`). */
  corpo: any;
  avaliacaoDeQualidade: AvaliacaoQualidade;
  vinculo: PreparacaoDoVinculo['vinculo'];
  /** Contagens para o log da tela. */
  contagens: { ativosDaAnalise: number; ativasDasRespostas: number; enviadosDaAnalise: number; enviadasDasRespostas: number; enviadosAoModelo: number };
}

/** Os campos de identidade que passam do respondente da API de qualidade para o pedido. Nenhum outro passa. */
const CAMPOS_DE_IDENTIDADE = ['respondentId', 'id', 'name', 'email'] as const;

function respondenteDaAnalise(r: any): Record<string, any> {
  const saida: Record<string, any> = {};
  for (const campo of CAMPOS_DE_IDENTIDADE) if (r?.[campo] !== undefined) saida[campo] = r[campo];
  saida.isSimulated = r?.isSimulated === true;
  // ⚠ Sem o bloco, nada é inventado aqui: a rota o lê como «não recebido» e a avaliação fica incompleta.
  if (r?.consistenciaIndividual !== undefined) saida.consistenciaIndividual = r.consistenciaIndividual;
  return saida;
}

export function montarPedidoDoParecer(e: EntradaDaMontagem): PedidoMontado {
  const { calculation, project, projectId, qualityAnalysis, projectResponses, excludedIds, demographics } = e;

  // ------------------------------------------------------------
  // Exclusões do gestor, ANTES de qualquer outra coisa (inalterado)
  // ------------------------------------------------------------
  const activeRespondents = qualityAnalysis?.respondents
    ? qualityAnalysis.respondents.filter((r: any) => {
        const id = r.respondentId || r.id || r.visitorId || '';
        return !excludedIds.includes(id);
      })
    : [];
  const activeProjectResponses = projectResponses.filter((r: any) => {
    const id = r.respondentId || r.id || r.visitorId || '';
    return !excludedIds.includes(id);
  });

  // ------------------------------------------------------------
  // O vínculo da avaliação com a execução do cálculo (inalterado)
  // ------------------------------------------------------------
  const preparoDoVinculo = prepararVinculoDaTela({
    calculo: calculation,
    respondentesAtivos: activeRespondents,
    respostasAtivas: activeProjectResponses,
  });
  const vinculoDaExecucao = preparoDoVinculo.vinculo;
  const respondentesEnviados = preparoDoVinculo.respondentesEnviados;
  const respostasEnviadas = preparoDoVinculo.respostasEnviadas;

  // ------------------------------------------------------------
  // Ajuste 1: a lista de respondentes ENVIADOS, só com a identidade e a consistência individual por matriz.
  // ------------------------------------------------------------
  let respondentesComConsistencia: any[] = [];
  if (respondentesEnviados.length > 0) {
    respondentesComConsistencia = respondentesEnviados.map(respondenteDaAnalise);
  } else if (respostasEnviadas.length > 0) {
    // Sem análise de qualidade: o CR sai dos julgamentos das próprias respostas, pelo MESMO módulo, e nunca do cache.
    respondentesComConsistencia = respostasEnviadas.map((response: any, idx: number) => ({
      // ⚠ A MESMA expressão de antes (`visitorId` antes de `id`, e `resp-N` por posição), escrita uma vez em
      //   `vinculo-execucao.ts`: o identificador enviado e o comparado saem do mesmo código.
      id: idDoElementoNoFallback(response, idx),
      name: response.respondentName || response.name || `Respondente ${idx + 1}`,
      isSimulated: response.isSimulated === true,
      consistenciaIndividual: consistenciaIndividualDeJulgamentos(
        response.judgments ?? response.responses?.judgments,
        project.alternatives
      ),
    }));
  }

  // ------------------------------------------------------------
  // A.12: a tela NÃO fabrica avaliação. Disponível só com o CR por matriz recalculado de TODOS os enviados.
  // ------------------------------------------------------------
  const avaliacaoDeQualidade = classificarAvaliacaoDaTela({
    respondentesAvaliados: respondentesComConsistencia,
    respostasAtivas: respostasEnviadas,
  });

  const payload = {
    avaliacaoDeQualidade,
    // A.12 etapa 3, estágio 1: separado de `avaliacaoDeQualidade`, que é contrato da etapa 1.
    vinculoDaExecucao,
    projectName: project.name || 'Projeto sem nome',
    projectDescription: project.description || '',
    alternatives: project.alternatives || [],
    bocrWeights: calculation.bocrWeights || [],
    // ANTI-ALUCINAÇÃO: pesos pessoais (v) e rescaling weights (s) para fórmula Wijnmalen (2007, Eq. 17)
    // O backend (normalizeBOCRWeights) aceita ambos os formatos: array [b,o,c,r] ou objeto {sb,so,sc,sr}
    personalWeights:
      Array.isArray(calculation.bocrWeights) && calculation.bocrWeights.length >= 4
        ? {
            Benefits: calculation.bocrWeights[0],
            Opportunities: calculation.bocrWeights[1],
            Costs: calculation.bocrWeights[2],
            Risks: calculation.bocrWeights[3],
          }
        : undefined,
    rescalingWeights: calculation.rescalingWeights
      ? {
          Benefits: calculation.rescalingWeights.sb,
          Opportunities: calculation.rescalingWeights.so,
          Costs: calculation.rescalingWeights.sc,
          Risks: calculation.rescalingWeights.sr,
        }
      : undefined,
    bocrConsistency: calculation.bocrConsistency || { cr: 0, lambda: 0 },
    subWeights: calculation.subWeights || {},
    subConsistency: calculation.subConsistency || {},
    finalScores: calculation.finalScores || [],
    responseCount: calculation.responseCount || activeProjectResponses.length || 0,
    sensitivityInflections: calculation.sensitivityInflections || {},
    // ⚠ A.12 item (c): SÓ a lista. Nada de `statistics.byStatus`, `overall`, `summary`, `overallStats`, `individualStats`.
    qualityAnalysis: { respondents: respondentesComConsistencia },
  };

  // Dados demográficos (inalterado, inclusive a forma do texto, que os testes de A.33 ancoram)
  const demographicsSummary = demographics.length > 0 ? {
    total: demographics.length,
    hasData: true,
    fields: {
      idade: [...new Set(demographics.map(d => d.idade).filter(Boolean))],
      genero: [...new Set(demographics.map(d => d.genero).filter(Boolean))],
      formacao: [...new Set(demographics.map(d => d.formacao).filter(Boolean))],
      tempoTrabalho: [...new Set(demographics.map(d => d.tempoTrabalho).filter(Boolean))],
      funcao: [...new Set(demographics.map(d => d.funcao).filter(Boolean))],
      areaAtuacao: [...new Set(demographics.map(d => d.areaAtuacao).filter(Boolean))]
    }
  } : { total: 0, hasData: false };

  const finalPayload = {
    ...payload,
    demographicsSummary,
    // Registro de execução do Parecer IA: a rota monta o registro SÓ sob este pedido, e o guarda com o id do projeto. ⚠ A
    //   montagem do contexto do modelo NÃO lê nenhum dos dois campos (`normalizeRequest` copia campo a campo): só a cópia da
    //   entrada recebida os guarda.
    projectId,
    incluirRegistroDaExecucao: true,
    // Informação de exclusão para contextualizar a IA (inalterado)
    exclusionInfo: excludedIds.length > 0 ? {
      totalCollected: projectResponses.length,
      activeCount: activeProjectResponses.length,
      excludedCount: excludedIds.length,
      reason: 'Filtragem por consistência (CR > 0.10, Saaty 1977)'
    } : undefined,
  };

  return {
    // Como `fetch` recebe o corpo: JSON.stringify, que descarta os `undefined`.
    corpo: JSON.parse(JSON.stringify(finalPayload)),
    avaliacaoDeQualidade,
    vinculo: vinculoDaExecucao,
    contagens: {
      ativosDaAnalise: activeRespondents.length,
      ativasDasRespostas: activeProjectResponses.length,
      enviadosDaAnalise: respondentesEnviados.length,
      enviadasDasRespostas: respostasEnviadas.length,
      enviadosAoModelo: respondentesComConsistencia.length,
    },
  };
}
