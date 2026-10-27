export {};

/**
 * lib/__tests__/response-quality-consistencia.test.ts
 *
 * **Ajuste 1 (A.12 item (c), A.25): a ORIGEM do CR individual na API de qualidade (`POST /api/response-quality`).** Exercita o TRATADOR REAL, sem
 * mock, sobre os julgamentos do painel de 2026 (`fixtures/panel-2026.json`), e confere o que a API devolve por respondente: o bloco
 * `consistenciaIndividual` (CR por matriz recalculado), o `cr` e as `metrics` (com a Magnitude, a média das seis, o máximo e a matriz governante),
 * a `fonteDoCR`, e o cache legado conservado À PARTE.
 *
 * ⚠ **O cache legado é entrada ADVERSA nestes testes:** `responses.avgCR` favorável (0,02) e CRs por matriz do cache também baixos, contra
 * julgamentos cujo CR recalculado é de 4,6% a 109,3%. O que se confere é que o cache não muda o bloco, não muda o `cr`, não muda a classificação, e
 * só aparece nos campos que o rotulam como cache.
 *
 * ⚠ **O que NÃO se demonstra:** que a tela, a montagem do pedido ou o Parecer IA usem estes campos corretamente (isso é de
 * `consistencia-individual-pedido.test.ts` e de `consistencia-individual-rota.test.ts`).
 */

import { POST } from '@/app/api/response-quality/route';
import { consistenciaIndividualDeJulgamentos } from '@/lib/consistencia-individual';
import { REFERENCIA } from './helpers/referencia-cr-individuais';

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

async function analisar(body: Record<string, unknown>): Promise<{ status: number; corpo: any }> {
  const res: any = await POST({ json: async () => JSON.parse(JSON.stringify(body)) } as any);
  return { status: res.status ?? 200, corpo: await res.json() };
}

/** O CACHE LEGADO FAVORÁVEL: tudo baixo, no formato v5 (`responses.*`), como `avaliacao/page.tsx` o gravava. */
const cacheFavoravel = (avg = 0.02) => ({
  avgCR: avg,
  bocrConsistency: { cr: 0.01 },
  magnitudeConsistency: { cr: 0.01 },
  subConsistency: { B: { cr: 0.01 }, O: { cr: 0.01 }, C: { cr: 0.01 }, R: { cr: 0.01 } },
});
const resposta = (id: string, extra: Record<string, unknown> = {}) => ({ id, respondentId: id, judgments: julgamentosDe(id), ...extra });
const painel = (extra: (id: string) => Record<string, unknown> = () => ({})) => IDS.map((id) => resposta(id, extra(id)));
const doRespondente = (corpo: any, id: string) => corpo.analysis.respondents.find((r: any) => r.respondentId === id);
const arred2 = (v: number) => Number((v * 100).toFixed(2)) + 0;

describe('a recalculação prevalece: o cache favorável NÃO muda o que a API devolve nem o que o Parecer IA transportaria', () => {
  test('o MESMO painel, sem cache e com cache favorável: o bloco `consistenciaIndividual` é idêntico, respondente a respondente', async () => {
    const sem = await analisar({ responses: painel(), alternatives: ALTERNATIVAS });
    const com = await analisar({ responses: painel(() => ({ responses: cacheFavoravel() })), alternatives: ALTERNATIVAS });
    const outro = await analisar({ responses: painel(() => ({ avgCR: 0.001, cr: 0.001, consistency: { cr: 0.001 }, metrics: { avgCR: 0.001, crBOCR: 0.001 } })), alternatives: ALTERNATIVAS });
    expect([sem.status, com.status, outro.status]).toEqual([200, 200, 200]);
    for (const id of IDS) {
      const a = doRespondente(sem.corpo, id);
      expect(doRespondente(com.corpo, id).consistenciaIndividual).toEqual(a.consistenciaIndividual);
      expect(doRespondente(outro.corpo, id).consistenciaIndividual).toEqual(a.consistenciaIndividual);
      // e o bloco é o do módulo sobre os julgamentos
      expect(a.consistenciaIndividual).toEqual(consistenciaIndividualDeJulgamentos(julgamentosDe(id), ALTERNATIVAS));
      // o valor que a tela mostra e a classificação também não mudam com o cache
      for (const campo of ['cr', 'fonteDoCR', 'status', 'overallScore']) expect([id, campo, doRespondente(com.corpo, id)[campo]]).toEqual([id, campo, a[campo]]);
    }
  });

  test.each(IDS.map((id) => [id] as [string]))('%s: com cache favorável, `cr` é o MÁXIMO recalculado, a fonte é «recalculado_dos_julgamentos», e as métricas nomeiam a Magnitude, a média e a matriz governante', async (id) => {
    const { corpo } = await analisar({ responses: painel(() => ({ responses: cacheFavoravel() })), alternatives: ALTERNATIVAS });
    const r = doRespondente(corpo, id);
    const ref = (REFERENCIA as any)[id];
    expect(r.fonteDoCR).toBe('recalculado_dos_julgamentos');
    expect(arred2(r.cr)).toBe(ref.governante); // `cr` = o máximo (o CR governante), e NÃO o cache de 0,02
    expect(r.cr).toBe(r.metrics.avgCR);
    expect(r.cr).toBe(r.metrics.maxCR);
    expect(arred2(r.metrics.meanCR)).toBe(ref.medio);
    expect(r.metrics.governingMatrix).toBe(ref.matriz);
    // a MAGNITUDE chega às métricas (antes, o transporte não a levava)
    expect(arred2(r.metrics.crMagnitude)).toBe(ref.MAGNITUDE);
    expect(arred2(r.metrics.crBOCR)).toBe(ref.BOCR);
    expect(arred2(r.metrics.crBenefits)).toBe(ref['SUB-B']);
    expect(arred2(r.metrics.crOpportunities)).toBe(ref['SUB-O']);
    expect(arred2(r.metrics.crCosts)).toBe(ref['SUB-C']);
    expect(arred2(r.metrics.crRisks)).toBe(ref['SUB-R']);
    // o cache fica À PARTE, rotulado: presente, com o valor que trouxe, e nunca no bloco
    // 5 dos cinco CRs por matriz que o cache pode trazer (BOCR e os quatro blocos de subcritérios; a Magnitude só as respostas novas gravam)
    expect(r.cacheLegado).toEqual({ presente: true, avgCR: 0.02, camposPorMatriz: 5 });
    expect(JSON.stringify(r.consistenciaIndividual)).not.toContain('0.02');
    expect(r.consistenciaIndividual.fonte).toBe('recalculado_dos_julgamentos');
  });

  test('a classificação da TELA vem do CR recalculado, e não do cache: R03 (cache 0,02) é CRÍTICO, e R01 (11,39%) é REVISAR', async () => {
    const { corpo } = await analisar({ responses: painel(() => ({ responses: cacheFavoravel() })), alternatives: ALTERNATIVAS });
    expect(doRespondente(corpo, 'R03').status).toBe('CRÍTICO'); // 109,27% > 20%
    expect(doRespondente(corpo, 'R01').status).toBe('REVISAR'); // 11,39% em (10%, 15%]
    // a flag NOMEIA o que o número é: o máximo das seis matrizes e a matriz governante, e nunca «CR médio»
    const alto = doRespondente(corpo, 'R03').flags.find((f: any) => f.type === 'CR_ALTO');
    expect(alto.details).toBe('CR máximo entre as seis matrizes não triviais, 109.3% (matriz governante: MAGNITUDE) está muito acima do limite de 10%');
    expect(JSON.stringify(corpo)).not.toContain('CR médio');
    // nenhuma flag cita o cache quando o CR é recalculado
    for (const r of corpo.analysis.respondents) for (const f of r.flags) expect(f.details).not.toContain('cache legado');
  });

  test('o painel inteiro: `porFonteDoCR` diz 12 recalculados, 0 do cache, 0 indisponíveis', async () => {
    const { corpo } = await analisar({ responses: painel(() => ({ responses: cacheFavoravel() })), alternatives: ALTERNATIVAS });
    expect(corpo.analysis.statistics.porFonteDoCR).toEqual({ recalculado_dos_julgamentos: 12, cache_legado: 0, indisponivel: 0 });
    expect(corpo.analysis.statistics.knownCRCount).toBe(12);
  });
});

describe('o cache só serve à TELA quando os julgamentos não servem, com a fonte declarada, e NUNCA é apresentado como recalculado', () => {
  const incompleto = (id: string) => julgamentosDe(id).slice(3);

  test('julgamentos incompletos + cache presente: `cr` vem do cache e a fonte diz «cache_legado»; o bloco fica «indisponivel», sem NENHUM valor', async () => {
    const { corpo } = await analisar({
      responses: [{ id: 'X', respondentId: 'X', judgments: incompleto('R01'), responses: { avgCR: 0.07 } }],
      alternatives: ALTERNATIVAS,
    });
    const r = doRespondente(corpo, 'X');
    expect([r.fonteDoCR, r.cr, r.status]).toEqual(['cache_legado', 0.07, 'CONFIÁVEL']);
    // o bloco: indisponível, com a condição nomeada, e as seis matrizes NULAS (o cache não entra)
    expect(r.consistenciaIndividual.fonte).toBe('indisponivel');
    expect(r.consistenciaIndividual.condicao).toBe('incompletos');
    expect(Object.values(r.consistenciaIndividual.crPorMatriz)).toEqual([null, null, null, null, null, null]);
    expect([r.consistenciaIndividual.media, r.consistenciaIndividual.maximo, r.consistenciaIndividual.matrizGovernante]).toEqual([null, null, null]);
    expect(JSON.stringify(r.consistenciaIndividual)).not.toContain('0.07');
    // as métricas mostram o que há: sem recalculado, `meanCR`, `maxCR` e `governingMatrix` são nulos, e o cache aparece rotulado
    expect([r.metrics.meanCR, r.metrics.maxCR, r.metrics.governingMatrix]).toEqual([null, null, null]);
    expect(r.cacheLegado.avgCR).toBe(0.07);
    expect(corpo.analysis.statistics.porFonteDoCR).toEqual({ recalculado_dos_julgamentos: 0, cache_legado: 1, indisponivel: 0 });
  });

  test('julgamentos incompletos + cache ALTO: a flag cita «CR do cache legado» e diz o que é, e não «CR máximo entre as seis matrizes»', async () => {
    const { corpo } = await analisar({
      responses: [{ id: 'X', respondentId: 'X', judgments: incompleto('R01'), responses: { avgCR: 0.3 } }],
      alternatives: ALTERNATIVAS,
    });
    const alto = doRespondente(corpo, 'X').flags.find((f: any) => f.type === 'CR_ALTO');
    expect(alto.details).toContain('CR do cache legado, 30.0%');
    expect(alto.details).toContain('o cache não diz se é média sobre 26 matrizes ou máximo das seis');
    expect(alto.details).not.toContain('CR máximo entre as seis matrizes');
  });

  test('julgamentos incompletos SEM cache: «indisponivel», `cr` nulo (e NÃO zero), DESCONHECIDO, e a flag diz a condição dos julgamentos', async () => {
    const { corpo } = await analisar({ responses: [{ id: 'X', respondentId: 'X', judgments: incompleto('R01') }], alternatives: ALTERNATIVAS });
    const r = doRespondente(corpo, 'X');
    expect([r.fonteDoCR, r.cr, r.status]).toEqual(['indisponivel', null, 'DESCONHECIDO']);
    expect(r.metrics.avgCR).toBeNull();
    expect(r.cacheLegado).toEqual({ presente: false, avgCR: null, camposPorMatriz: 0 });
    const f = r.flags.find((x: any) => x.type === 'CR_DESCONHECIDO');
    expect(f.details).toBe('Não foi possível obter o CR individual desta resposta (julgamentos: incompletos; sem cache utilizável)');
    expect(corpo.analysis.statistics.knownCRCount).toBe(0);
    expect(corpo.analysis.statistics.avgCR).toBe(0); // média sobre ZERO respondentes com CR: a convenção de antes, que NÃO é um CR medido
    expect(corpo.analysis.statistics.porFonteDoCR).toEqual({ recalculado_dos_julgamentos: 0, cache_legado: 0, indisponivel: 1 });
  });

  test.each([
    ['sem julgamentos', 'ausentes', undefined],
    ['lista vazia', 'ausentes', []],
    ['valor fora da escala', 'invalidos', julgamentosDe('R01').map((j: any, i: number) => (i === 0 ? { ...j, saatyValue: 10 } : j))],
    ['par duplicado', 'duplicados', [...julgamentosDe('R01'), julgamentosDe('R01')[0]]],
  ])('%s: a condição «%s» é nomeada, sem CR e sem zero', async (_r, condicao, julgamentos) => {
    const { corpo } = await analisar({ responses: [{ id: 'X', respondentId: 'X', judgments: julgamentos }], alternatives: ALTERNATIVAS });
    const r = doRespondente(corpo, 'X');
    expect(r.consistenciaIndividual.condicao).toBe(condicao);
    expect(r.consistenciaIndividual.fonte).toBe('indisponivel');
    expect(r.cr).toBeNull();
    expect(r.status).toBe('DESCONHECIDO');
  });
});

describe('o zero CALCULADO é CR conhecido (consistência perfeita), e não ausência', () => {
  test('todas as comparações iguais a 1: `cr` é número (≈ 0), CONFIÁVEL, fonte recalculada; antes, o zero era confundido com «não encontrado»', async () => {
    const iguais = julgamentosDe('R01').map((j: any) => ({ ...j, saatyValue: 1, favors: 'equal' }));
    const { corpo } = await analisar({ responses: [{ id: 'P', respondentId: 'P', judgments: iguais }], alternatives: ALTERNATIVAS });
    const r = doRespondente(corpo, 'P');
    expect(r.fonteDoCR).toBe('recalculado_dos_julgamentos');
    expect(typeof r.cr).toBe('number');
    expect(Math.abs(r.cr)).toBeLessThan(1e-12);
    expect(r.status).toBe('CONFIÁVEL');
    expect(r.overallScore).toBe(100);
    expect(r.consistenciaIndividual.matrizesComCR).toBe(6);
    expect(corpo.analysis.statistics.knownCRCount).toBe(1);
    // a flag de «CR desconhecido» NÃO dispara para o zero calculado (só `TUDO_IGUAL`, que é outra observação sobre os julgamentos)
    expect(r.flags.map((f: any) => f.type)).not.toContain('CR_DESCONHECIDO');
    expect(r.flags.map((f: any) => f.type)).toContain('TUDO_IGUAL');
  });
});

describe('as alternativas: da requisição, ou inferidas dos próprios julgamentos de alternativas', () => {
  test('sem `alternatives` no corpo, a API infere as alternativas dos julgamentos e chega ao MESMO bloco', async () => {
    const com = await analisar({ responses: painel(), alternatives: ALTERNATIVAS });
    const sem = await analisar({ responses: painel() });
    for (const id of IDS) expect(doRespondente(sem.corpo, id).consistenciaIndividual).toEqual(doRespondente(com.corpo, id).consistenciaIndividual);
  });

  test('sem `alternatives` e sem julgamentos de alternativas: «nao_calculavel», porque não há estrutura contra a qual validar', async () => {
    const semAlternativas = julgamentosDe('R01').filter((j: any) => j.type !== 'alternatives');
    const { corpo } = await analisar({ responses: [{ id: 'X', respondentId: 'X', judgments: semAlternativas }] });
    const r = doRespondente(corpo, 'X');
    expect(r.consistenciaIndividual.condicao).toBe('nao_calculavel');
    expect(r.cr).toBeNull();
  });
});

describe('o contrato da API', () => {
  test('corpo sem `responses`: 400, com o erro de sempre', async () => {
    const { status, corpo } = await analisar({ alternatives: ALTERNATIVAS });
    expect(status).toBe(400);
    expect(corpo).toEqual({ success: false, error: 'Parâmetro "responses" é obrigatório e deve ser um array' });
  });

  test('o identificador sai do mesmo lugar de antes (respondentId antes de id), e a resposta mantém os campos da tela', async () => {
    const { corpo } = await analisar({ responses: [resposta('R01', { respondentId: 'ID-DO-RESPONDENTE' })], alternatives: ALTERNATIVAS });
    const r = corpo.analysis.respondents[0];
    expect(r.respondentId).toBe('ID-DO-RESPONDENTE');
    for (const campo of ['respondentId', 'isSimulated', 'status', 'overallScore', 'cr', 'fonteDoCR', 'consistenciaIndividual', 'cacheLegado', 'metrics', 'flags', 'recommendation']) {
      expect([campo, campo in r]).toEqual([campo, true]);
    }
    expect(Object.keys(r.metrics)).toEqual(['avgCR', 'crBOCR', 'crBenefits', 'crOpportunities', 'crCosts', 'crRisks', 'crMagnitude', 'meanCR', 'maxCR', 'governingMatrix']);
  });
});
