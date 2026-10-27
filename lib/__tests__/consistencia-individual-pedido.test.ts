export {};

/**
 * lib/__tests__/consistencia-individual-pedido.test.ts
 *
 * **Ajuste 1 (A.12 item (c)): a MONTAGEM do pedido que a tela envia a `/api/ai-reviewer`** (`lib/ai-reviewer/montagem-do-pedido.ts`), executada de
 * verdade. A tela é `'use client'` e nenhum teste a executa; a montagem foi extraída para uma função pura, e é ela que se exercita aqui, sobre a
 * saída REAL de `/api/response-quality` para o painel de 2026.
 *
 * O que se confere: (i) por respondente vai SÓ a identidade e o bloco `consistenciaIndividual`, sem categoria de pessoa, score, flag nem
 * recomendação; (ii) nada do formato anterior (`statistics`, `overall`, `summary`, `overallStats`, `individualStats`) viaja em canal algum; (iii) o
 * cache legado, mesmo adverso, não chega ao pedido; (iv) a lista enviada é a do vínculo (exclusões do gestor e restrição pelo documento de cálculo), e
 * o painel reduzido é reduzido na lista; (v) sem análise de qualidade, o CR sai dos julgamentos das respostas, pelo MESMO módulo, nunca do cache;
 * (vi) o que não é qualidade individual não mudou: pesos, consistência agregada, ranking, sensibilidade, demografia, exclusões e vínculo.
 *
 * ⚠ **O que NÃO se demonstra:** a tela em execução. A fiação da tela é conferida por leitura (`vinculo-execucao-fiacao.test.ts`), `tsc` e `build`.
 */

import { montarPedidoDoParecer } from '@/lib/ai-reviewer/montagem-do-pedido';
import { consistenciaIndividualDeJulgamentos } from '@/lib/consistencia-individual';
import { POST as QUALIDADE } from '@/app/api/response-quality/route';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fixture = require('./fixtures/panel-2026.json');
const ALTERNATIVAS = fixture.alternatives.map((c: string) => ({ code: c, name: c, description: '' }));
const IDS: string[] = fixture.responses.map((r: any) => r.id);
const julgamentosDe = (id: string): any[] => fixture.responses.find((r: any) => r.id === id).judgments;

let silencios: jest.SpyInstance[] = [];
beforeAll(() => {
  silencios = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
});
afterAll(() => silencios.forEach((s) => s.mockRestore()));

/** As respostas como a tela as carrega: com cache legado FAVORÁVEL, para provar que ele não chega ao pedido. */
const respostas = (cache = true) =>
  IDS.map((id) => ({
    // ⚠ `id` = `respondentId`: o vínculo compara os identificadores da resposta com os do documento de cálculo (`includedRespondents[].respondentId`), e
    //   na tela as respostas carregadas têm o MESMO identificador dos dois lados. Com `id` diferente, o vínculo restringiria o fallback a ZERO respostas.
    id,
    respondentId: id,
    judgments: julgamentosDe(id),
    ...(cache ? { responses: { avgCR: 0.02, bocrConsistency: { cr: 0.01 } } } : {}),
  }));

/** A `analysis` REAL de `/api/response-quality`, como a tela a recebe. */
async function analiseReal(rs: any[]): Promise<any> {
  const res: any = await QUALIDADE({ json: async () => JSON.parse(JSON.stringify({ responses: rs, alternatives: ALTERNATIVAS })) } as any);
  const corpo = await res.json();
  expect(corpo.success).toBe(true);
  return corpo.analysis;
}

const HEX = 'b'.repeat(64);
const shaDe = (id: string) => id.padEnd(64, '0').replace(/[^0-9a-f]/g, 'c');
/** O documento de cálculo apresentado, com `ids` como incluídos (ou sem a lista, se `undefined`). */
function calculo(ids?: string[]): any {
  const metadata: any = { judgmentsDigest: { algorithm: 'sha256', serialization: 'a12-julgamentos-v1', panel: HEX, unavailableReason: null } };
  if (ids) {
    metadata.includedRespondents = ids.map((id) => ({
      respondentId: id, responseDocId: `doc-${id}`, identifierSource: 'respondentId', judgmentsSha256: shaDe(id), judgmentsUnavailableReason: null,
    }));
  }
  return {
    executionId: 'exec-pedido-0001',
    metadata,
    bocrWeights: [0.37, 0.15, 0.2, 0.28],
    rescalingWeights: { sb: 0.3, so: 0.2, sc: 0.25, sr: 0.25 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    subWeights: { B: [0.2, 0.2, 0.2, 0.2, 0.2] },
    subConsistency: { B: { cr: 0.05 } },
    finalScores: [{ code: 'A1', name: 'Alternativa 1', score: 0.62 }, { code: 'A2', name: 'Alternativa 2', score: 0.38 }],
    responseCount: 12,
    sensitivityInflections: { x: 1 },
  };
}
const projeto = () => ({ name: 'Painel de 2026', description: 'fixture', alternatives: ALTERNATIVAS });

/** Todas as chaves que aparecem em qualquer profundidade do objeto. */
function chaves(x: any, acc = new Set<string>()): Set<string> {
  if (Array.isArray(x)) x.forEach((e) => chaves(e, acc));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) { acc.add(k); chaves(v, acc); }
  return acc;
}

/** Os agregados do formato anterior: não podem estar em chave alguma do corpo. */
const AGREGADOS_DO_FORMATO_ANTERIOR = ['statistics', 'byStatus', 'overall', 'overallStats', 'individualStats', 'summary', 'qualityScore'];
/** Os campos por pessoa do formato anterior: não podem estar dentro de `qualityAnalysis`. (`score` e `status` existem fora dela, em `finalScores`, por exemplo.) */
const CAMPOS_POR_PESSOA_DO_FORMATO_ANTERIOR = ['status', 'overallScore', 'score', 'flags', 'recommendation', 'cr', 'metrics', 'avgCR', 'cacheLegado', 'fonteDoCR'];

describe('por respondente vai SÓ a identidade e o bloco de consistência individual', () => {
  test('o pedido do painel inteiro: 12 respondentes, cada um com identidade, isSimulated e o bloco do MOTOR; nada do formato anterior em chave alguma', async () => {
    const rs = respostas();
    const analise = await analiseReal(rs);
    const { corpo, avaliacaoDeQualidade, contagens } = montarPedidoDoParecer({
      calculation: calculo(IDS), project: projeto(), projectId: 'P1', qualityAnalysis: analise, projectResponses: rs, excludedIds: [], demographics: [],
    });
    expect(Object.keys(corpo.qualityAnalysis)).toEqual(['respondents']);
    expect(corpo.qualityAnalysis.respondents).toHaveLength(12);
    for (const r of corpo.qualityAnalysis.respondents) {
      expect(Object.keys(r).sort()).toEqual(['consistenciaIndividual', 'isSimulated', 'respondentId']);
      expect(r.isSimulated).toBe(false);
      // o bloco é o do módulo sobre os julgamentos, igual ao que a API devolveu
      expect(r.consistenciaIndividual).toEqual(consistenciaIndividualDeJulgamentos(julgamentosDe(r.respondentId), ALTERNATIVAS));
    }
    const todas = chaves(corpo);
    for (const k of AGREGADOS_DO_FORMATO_ANTERIOR) expect({ k, presente: todas.has(k) }).toEqual({ k, presente: false });
    // `cr` aparece, legitimamente, em `bocrConsistency` e `subConsistency` (o CR das matrizes AGREGADAS), e `score` em `finalScores`: nunca dentro de `qualityAnalysis`
    const dentro = chaves(corpo.qualityAnalysis);
    for (const k of CAMPOS_POR_PESSOA_DO_FORMATO_ANTERIOR) expect({ k, presente: dentro.has(k) }).toEqual({ k, presente: false });
    expect(todas.has('cr')).toBe(true); // o controle: `cr` EXISTE no corpo (agregado), então a negativa acima não passa por vacuidade
    expect(avaliacaoDeQualidade.estado).toBe('disponivel');
    expect([contagens.ativosDaAnalise, contagens.enviadosAoModelo]).toEqual([12, 12]);
  });

  test('o cache legado FAVORÁVEL das respostas, e o da própria API, não chegam ao pedido: nem o valor 0.02, nem o CR do cache', async () => {
    const rs = respostas(true);
    const analise = await analiseReal(rs);
    // a API conserva o cache À PARTE (a tela o usa), mas a montagem não o repassa
    expect(analise.respondents[0].cacheLegado.avgCR).toBe(0.02);
    const { corpo } = montarPedidoDoParecer({
      calculation: calculo(IDS), project: projeto(), projectId: 'P1', qualityAnalysis: analise, projectResponses: rs, excludedIds: [], demographics: [],
    });
    expect(JSON.stringify(corpo.qualityAnalysis)).not.toContain('"avgCR"');
    expect(JSON.stringify(corpo.qualityAnalysis)).not.toContain('cacheLegado');
    // e os CRs do pedido são os recalculados: o de R03 na Magnitude é 109,27%, e não 0,01
    const r03 = corpo.qualityAnalysis.respondents.find((r: any) => r.respondentId === 'R03');
    expect(Number((r03.consistenciaIndividual.crPorMatriz.MAGNITUDE * 100).toFixed(2))).toBe(109.27);
  });

  test('o MESMO pedido com e sem cache nas respostas: o `qualityAnalysis` enviado é idêntico', async () => {
    const com = respostas(true);
    const sem = respostas(false);
    const a = montarPedidoDoParecer({ calculation: calculo(IDS), project: projeto(), projectId: 'P1', qualityAnalysis: await analiseReal(com), projectResponses: com, excludedIds: [], demographics: [] });
    const b = montarPedidoDoParecer({ calculation: calculo(IDS), project: projeto(), projectId: 'P1', qualityAnalysis: await analiseReal(sem), projectResponses: sem, excludedIds: [], demographics: [] });
    expect(a.corpo.qualityAnalysis).toEqual(b.corpo.qualityAnalysis);
  });

  test('um bloco que a API deixou de trazer NÃO é inventado pela montagem: o respondente vai sem bloco, e a avaliação fica incompleta', async () => {
    const rs = respostas(false);
    const analise = await analiseReal(rs);
    delete analise.respondents[2].consistenciaIndividual;
    const { corpo, avaliacaoDeQualidade } = montarPedidoDoParecer({
      calculation: calculo(IDS), project: projeto(), projectId: 'P1', qualityAnalysis: analise, projectResponses: rs, excludedIds: [], demographics: [],
    });
    expect('consistenciaIndividual' in corpo.qualityAnalysis.respondents[2]).toBe(false);
    expect(avaliacaoDeQualidade.estado).toBe('incompleta');
    expect(avaliacaoDeQualidade.motivo).toContain('Medido: 11 de 12 respondentes com CR.');
  });
});

describe('a lista ENVIADA é a do vínculo: o painel reduzido é reduzido NA LISTA', () => {
  test('exclusão do gestor (R03 e R06): 10 enviados, e a exclusão aparece no pedido com a população certa', async () => {
    const rs = respostas(false);
    const analise = await analiseReal(rs);
    const { corpo, contagens, vinculo } = montarPedidoDoParecer({
      calculation: calculo(IDS.filter((i) => !['R03', 'R06'].includes(i))), project: projeto(), projectId: 'P1', qualityAnalysis: analise, projectResponses: rs,
      excludedIds: ['R03', 'R06'], demographics: [],
    });
    const enviados = corpo.qualityAnalysis.respondents.map((r: any) => r.respondentId);
    expect(enviados).toHaveLength(10);
    expect(enviados).not.toContain('R03');
    expect(enviados).not.toContain('R06');
    // `enviadasDasRespostas` é ZERO por desenho do vínculo: com a análise de qualidade como origem da lista, as respostas não são a lista enviada
    // (só são, no fallback). A origem é uma só, e o vínculo a registra.
    expect(contagens).toEqual({ ativosDaAnalise: 10, ativasDasRespostas: 10, enviadosDaAnalise: 10, enviadasDasRespostas: 0, enviadosAoModelo: 10 });
    expect(vinculo.origemDaListaAvaliada).toBe('analiseDeQualidade');
    expect(corpo.exclusionInfo).toEqual({ totalCollected: 12, activeCount: 10, excludedCount: 2, reason: 'Filtragem por consistência (CR > 0.10, Saaty 1977)' });
    expect(vinculo.estado).toBe('vinculado');
  });

  test('restrição pelo documento de cálculo: a análise avaliou 12, o documento incluiu 10, e SÓ os 10 vão ao modelo (o vínculo registra a divergência anterior à restrição)', async () => {
    const rs = respostas(false);
    const analise = await analiseReal(rs);
    const { corpo, contagens, vinculo } = montarPedidoDoParecer({
      calculation: calculo(IDS.filter((i) => !['R03', 'R06'].includes(i))), project: projeto(), projectId: 'P1', qualityAnalysis: analise, projectResponses: rs,
      excludedIds: [], demographics: [],
    });
    expect(corpo.qualityAnalysis.respondents).toHaveLength(10);
    expect(contagens.ativosDaAnalise).toBe(12); // o conjunto ANTES da restrição
    expect(contagens.enviadosDaAnalise).toBe(10);
    expect(vinculo.estado).toBe('divergente'); // 2 na avaliação e fora do documento
    expect(vinculo.cobertura.avaliadosAntesDaRestricao).toBe(12);
    expect(vinculo.cobertura.enviados).toBe(10);
    // `responseCount` segue descrevendo o documento de cálculo, e não a restrição
    expect(corpo.responseCount).toBe(12);
  });
});

describe('sem análise de qualidade: o CR sai dos julgamentos das respostas, pelo MESMO módulo, e nunca do cache', () => {
  test('respostas com cache favorável e julgamentos ruins: o pedido leva os CRs RECALCULADOS (R03/MAGNITUDE 109,27%), com a identidade do fallback', () => {
    const rs = respostas(true);
    const { corpo, avaliacaoDeQualidade } = montarPedidoDoParecer({
      calculation: calculo(IDS), project: projeto(), projectId: 'P1', qualityAnalysis: null, projectResponses: rs, excludedIds: [], demographics: [],
    });
    expect(corpo.qualityAnalysis.respondents).toHaveLength(12);
    for (const [i, r] of corpo.qualityAnalysis.respondents.entries()) {
      expect(Object.keys(r).sort()).toEqual(['consistenciaIndividual', 'id', 'isSimulated', 'name']);
      // `visitorId` antes de `id`, e `resp-N` por posição: a expressão de antes. As respostas têm `id` `Rxx`.
      expect(r.id).toBe(IDS[i]);
      expect(r.name).toBe(`Respondente ${i + 1}`);
      expect(r.consistenciaIndividual).toEqual(consistenciaIndividualDeJulgamentos(rs[i].judgments, ALTERNATIVAS));
    }
    const r03 = corpo.qualityAnalysis.respondents.find((r: any) => r.id === 'R03');
    expect(Number((r03.consistenciaIndividual.crPorMatriz.MAGNITUDE * 100).toFixed(2))).toBe(109.27);
    expect(JSON.stringify(corpo.qualityAnalysis)).not.toContain('0.02');
    expect(avaliacaoDeQualidade.estado).toBe('disponivel');
  });

  test('respostas com julgamentos incompletos: o bloco é «indisponivel» (condição nomeada) e a avaliação é incompleta; o cache NÃO preenche o buraco', () => {
    const rs = respostas(true);
    rs[1] = { ...rs[1], judgments: rs[1].judgments.slice(5) };
    const { corpo, avaliacaoDeQualidade } = montarPedidoDoParecer({
      calculation: calculo(IDS), project: projeto(), projectId: 'P1', qualityAnalysis: null, projectResponses: rs, excludedIds: [], demographics: [],
    });
    const r = corpo.qualityAnalysis.respondents[1];
    expect(r.consistenciaIndividual.fonte).toBe('indisponivel');
    expect(r.consistenciaIndividual.condicao).toBe('incompletos');
    expect(Object.values(r.consistenciaIndividual.crPorMatriz)).toEqual([null, null, null, null, null, null]);
    expect(avaliacaoDeQualidade.estado).toBe('incompleta');
    expect(avaliacaoDeQualidade.motivo).toContain('Medido: 11 de 12 respondentes com CR.');
  });

  test('sem análise e sem respostas: lista vazia, avaliação AUSENTE, nenhum respondente inventado', () => {
    const { corpo, avaliacaoDeQualidade, contagens } = montarPedidoDoParecer({
      calculation: calculo(), project: projeto(), projectId: 'P1', qualityAnalysis: null, projectResponses: [], excludedIds: [], demographics: [],
    });
    expect(corpo.qualityAnalysis).toEqual({ respondents: [] });
    expect(avaliacaoDeQualidade.estado).toBe('ausente');
    expect(contagens.enviadosAoModelo).toBe(0);
  });

  test('sem as alternativas do projeto o CR do fallback é «nao_calculavel» (nunca zero), e o pedido segue', () => {
    const rs = respostas(false);
    const { corpo, avaliacaoDeQualidade } = montarPedidoDoParecer({
      calculation: calculo(IDS), project: { name: 'P', description: '' }, projectId: 'P1', qualityAnalysis: null, projectResponses: rs, excludedIds: [], demographics: [],
    });
    for (const r of corpo.qualityAnalysis.respondents) expect([r.consistenciaIndividual.fonte, r.consistenciaIndividual.condicao]).toEqual(['indisponivel', 'nao_calculavel']);
    expect(avaliacaoDeQualidade.estado).toBe('incompleta');
    expect(corpo.alternatives).toEqual([]);
  });
});

describe('o que NÃO é qualidade individual não mudou', () => {
  test('pesos, consistência agregada, ranking, sensibilidade, vínculo, projeto e as duas marcas do registro saem como a tela os montava', async () => {
    const rs = respostas(false);
    const calc = calculo(IDS);
    const { corpo } = montarPedidoDoParecer({
      calculation: calc, project: projeto(), projectId: 'P-REG', qualityAnalysis: await analiseReal(rs), projectResponses: rs, excludedIds: [], demographics: [],
    });
    expect(corpo.projectName).toBe('Painel de 2026');
    expect(corpo.projectDescription).toBe('fixture');
    expect(corpo.alternatives).toEqual(ALTERNATIVAS);
    expect(corpo.bocrWeights).toEqual(calc.bocrWeights);
    expect(corpo.personalWeights).toEqual({ Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 });
    expect(corpo.rescalingWeights).toEqual({ Benefits: 0.3, Opportunities: 0.2, Costs: 0.25, Risks: 0.25 });
    expect(corpo.bocrConsistency).toEqual(calc.bocrConsistency);
    expect(corpo.subWeights).toEqual(calc.subWeights);
    expect(corpo.subConsistency).toEqual(calc.subConsistency);
    expect(corpo.finalScores).toEqual(calc.finalScores);
    expect(corpo.responseCount).toBe(12);
    expect(corpo.sensitivityInflections).toEqual(calc.sensitivityInflections);
    expect(corpo.vinculoDaExecucao.executionId).toBe('exec-pedido-0001');
    expect([corpo.projectId, corpo.incluirRegistroDaExecucao]).toEqual(['P-REG', true]);
    expect(corpo.exclusionInfo).toBeUndefined(); // sem exclusão, a chave nem existe no corpo enviado
    expect('exclusionInfo' in corpo).toBe(false);
    expect(corpo.demographicsSummary).toEqual({ total: 0, hasData: false });
  });

  test('a demografia sai deduplicada por campo, como a tela a montava; e `responseCount` cai para as respostas ativas quando o documento não o traz', () => {
    const rs = respostas(false);
    const calc = calculo(IDS);
    delete calc.responseCount;
    const { corpo } = montarPedidoDoParecer({
      calculation: calc, project: projeto(), projectId: 'P1', qualityAnalysis: null, projectResponses: rs, excludedIds: [],
      demographics: [
        { idade: '30-39', genero: 'F', formacao: 'Doutorado', tempoTrabalho: '10+', funcao: 'Gerente', areaAtuacao: 'TI' },
        { idade: '30-39', genero: 'M', formacao: 'Doutorado', tempoTrabalho: '5-10', funcao: 'Analista', areaAtuacao: 'TI' },
      ],
    });
    expect(corpo.responseCount).toBe(12);
    expect(corpo.demographicsSummary).toEqual({
      total: 2,
      hasData: true,
      fields: { idade: ['30-39'], genero: ['F', 'M'], formacao: ['Doutorado'], tempoTrabalho: ['10+', '5-10'], funcao: ['Gerente', 'Analista'], areaAtuacao: ['TI'] },
    });
  });

  test('o corpo é o que o `fetch` entrega: sem `undefined`, e estável ao ser serializado', async () => {
    const rs = respostas(false);
    const { corpo } = montarPedidoDoParecer({
      calculation: calculo(IDS), project: projeto(), projectId: 'P1', qualityAnalysis: await analiseReal(rs), projectResponses: rs, excludedIds: ['R03'], demographics: [],
    });
    expect(JSON.parse(JSON.stringify(corpo))).toEqual(corpo);
    expect(JSON.stringify(corpo)).not.toContain('undefined');
  });
});
