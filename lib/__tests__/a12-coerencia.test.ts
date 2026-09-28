/**
 * lib/__tests__/a12-coerencia.test.ts
 *
 * **A.12 etapa 1: os controles da coerência interna, comparação por comparação.**
 *
 * ⚠ **Cada uma das cinco comparações tem, aqui, um caso que a faz REPROVAR e um que a
 * faz PASSAR.** Um controle que nunca reprova não demonstra nada.
 *
 * ⚠ **O LIMITE, declarado:** isto verifica **coerência interna da requisição**.
 * **Cobertura do universo real e vínculo com a execução NÃO são demonstrados aqui.**
 */
import {
  avaliarCoerencia,
  elegivelParaClassificacao,
  classificarAvaliacaoRecebida,
  ramoDeQualidade,
  CONJUNTO_MINIMO,
  INTERVALOS_DECLARADOS,
  MOTIVO_AUSENTE,
  MOTIVO_INCOMPLETA,
  type IdComparacao,
} from '@/lib/ai-reviewer/avaliacao-qualidade';

const CHAVE = 'chave-anthropic-falsa-do-processo-de-teste';

const respondente = (i: number, cr: number | null, status?: string) => ({
  id: `resp-${i}`,
  name: `Respondente ${i}`,
  ...(cr === null ? {} : { cr, metrics: { avgCR: cr } }),
  ...(status === undefined
    ? { status: cr === null ? 'DESCONHECIDO' : cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO' }
    : { status }),
});

/** Requisição COERENTE: quatro respondentes com CR 0.05, e os agregados de acordo. */
function coerente(): any {
  const rs = [1, 2, 3, 4].map((i) => respondente(i, 0.05));
  return {
    projectName: 'Projeto do controle de coerencia',
    bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    finalScores: [{ code: 'A1', name: 'Alternativa 1', score: 0.62 }],
    responseCount: 4,
    qualityAnalysis: {
      respondents: rs,
      statistics: { byStatus: { 'CONFIÁVEL': 4, 'REVISAR': 0, 'SUSPEITO': 0, 'CRÍTICO': 0 }, total: 4, avgCR: 0.05 },
      summary: { total: 4, ok: 4, suspicious: 0, critical: 0 },
    },
    overallStats: { total: 4, valid: 4, warning: 0, critical: 0 },
    individualStats: {
      Benefits: { total: 4, valid: 4, warning: 0, critical: 0, avgCR: 0.05 },
      Opportunities: { total: 4, valid: 4, warning: 0, critical: 0, avgCR: 0.05 },
      Costs: { total: 4, valid: 4, warning: 0, critical: 0, avgCR: 0.05 },
      Risks: { total: 4, valid: 4, warning: 0, critical: 0, avgCR: 0.05 },
    },
  };
}

const estadoDe = (raw: any, id: IdComparacao) =>
  avaliarCoerencia(raw).comparacoes.find((c) => c.id === id)!;

const elegivel = (raw: any) =>
  elegivelParaClassificacao(classificarAvaliacaoRecebida(raw), avaliarCoerencia(raw));

// ============================================================ o caso que passa
test('a requisicao coerente tem as cinco comparacoes concluidas, e e ELEGIVEL', () => {
  const r = coerente();
  expect(ramoDeQualidade(r)).toBe('P1');
  for (const id of ['V1', 'V2', 'V3', 'V4', 'V5'] as IdComparacao[]) {
    expect([id, estadoDe(r, id).estado]).toEqual([id, 'consistente']);
  }
  const c = avaliarCoerencia(r);
  expect(c.conclusao).toBe('coerente');
  expect(c.conjuntoMinimo).toEqual(CONJUNTO_MINIMO.P1);
  expect(c.conjuntoMinimoConcluido).toBe(true);
  expect(elegivel(r)).toEqual({ elegivel: true, causa: null, motivo: null, rotulo: null });
});

// ============================================================ V1
test('V1 reprova quando summary.ok divergir de overallStats.valid, e conserva os dois', () => {
  const r = coerente();
  r.qualityAnalysis.summary.ok = 3;
  const v1 = estadoDe(r, 'V1');
  expect(v1.estado).toBe('contraditoria');
  expect(v1.lados.map((l) => [l.fonte, l.valor])).toEqual([
    ['qualityAnalysis.summary.ok', 3],
    ['overallStats.valid', 4],
  ]);
  expect(v1.motivo).toContain('Os dois valores e as suas fontes ficam conservados');
  expect(elegivel(r).elegivel).toBe(false);
});

/**
 * ⚠ **C1: a divergencia NAO prova que as populacoes diferem.** Este teste consagrava o
 * defeito: exigia `incompativel` e elegibilidade onde ha contradicao a detectar.
 */
test('V1 DETECTA a contradicao quando os totais declarados divergem, em vez de excluir o par', () => {
  const r = coerente();
  r.overallStats.total = 9;
  r.overallStats.valid = 9;
  const v1 = estadoDe(r, 'V1');
  expect(v1.estado).toBe('contraditoria');
  expect(v1.motivo).toContain('grandezas da mesma populacao declarada');
  expect(v1.motivo).not.toContain('populacoes DIFERENTES');
  // ⚠ E os quatro lados ficam conservados: os dois totais e os dois valores comparados.
  expect(v1.lados.map((l) => [l.fonte, l.valor])).toEqual([
    ['qualityAnalysis.summary.total', 4],
    ['overallStats.total', 9],
    ['qualityAnalysis.summary.ok', 4],
    ['overallStats.valid', 9],
  ]);
  expect(avaliarCoerencia(r).conclusao).toBe('contraditoria');
  expect(elegivel(r).elegivel).toBe(false);
});

/**
 * ⚠ **D2: V1 NAO TEM HOJE VIA DE PRODUCAO PARA `incompativel`.**
 *
 * A versao anterior deste teste INJETAVA um campo `escopo` para exercitar aquele estado, e
 * o codigo o lia. ⚠ **A avaliacao opera sobre a requisicao BRUTA**, entao a ausencia de
 * `escopo` na interface TypeScript nao o tornava inalcancavel: o sistema reconhecia um
 * contrato de escopos que ninguem declarou, e qualquer produtor que enviasse o campo por
 * outra razao tiraria V1 do veredito EM SILENCIO. **A leitura saiu, e o teste que a
 * injetava saiu com ela.**
 *
 * ⚠ **O que fica conferido aqui e a AUSENCIA da via**, e nao um estado simulado.
 */
test('V1 nao tem via de producao para INCOMPATIVEL, e nenhum campo a cria', () => {
  const r = coerente();
  // Nenhuma combinacao de divergencia produz `incompativel` em V1.
  for (const mutar of [
    (x: any) => { x.overallStats.total = 9; },
    (x: any) => { x.qualityAnalysis.summary.total = 9; },
    (x: any) => { delete x.qualityAnalysis.summary.total; },
    (x: any) => { x.qualityAnalysis.summary.ok = 3; },
    (x: any) => { delete x.overallStats; },
    (x: any) => { x.qualityAnalysis.summary.total = 9; x.overallStats.total = 9; },
  ]) {
    const s = coerente();
    mutar(s);
    expect(estadoDe(s, 'V1').estado).not.toBe('incompativel');
  }
  // ⚠ CONTROLE de que o ensaio nao passa por vacuidade: a requisicao base produz V1
  //   CONSISTENTE, logo a comparacao esta sendo de fato executada.
  expect(estadoDe(r, 'V1').estado).toBe('consistente');
});

/**
 * ⚠ **MEDIDO, e declarado em vez de suposto: depois de C2 e D2, NENHUMA comparacao tem via
 * de producao para `incompativel`.** C2 retirou a via de V4, e D2 a de V1.
 *
 * ⚠ **O estado continua no VOCABULARIO**, e a sua utilizacao exige **diferenca de
 * significado demonstrada para o par efetivamente comparado**. Esta rodada **nao cria
 * caminhos artificiais para produzi-lo** nem amplia V4 para outras categorias.
 *
 * ⚠ **A base desta afirmação é a enumeração dos 28 pontos DE CÓDIGO que definem `estado`
 * no módulo**, classificados em declaração de tipo, indireção e literal, e **não** o
 * `git grep` pelo literal de atribuição do estado incompatível, que sai 0 em linha de
 * código. ⚠ **O padrão vai DESCRITO e não citado:** escrevê-lo aqui faria este comentário
 * casar com ele, e por isso as duas contagens se fazem sobre linhas de código. **Um grep
 * por literal é conferência de apoio, e não prova suficiente:** não alcança atribuição por
 * variável, por cast, por construção fora do módulo, nem variação de aspas ou de
 * espaçamento. Dos cinco casts do módulo, **nenhum** é sobre `estado`. O ensaio das oito
 * requisições é **controle complementar**, e mede apenas que o estado não apareceu
 * naqueles casos.
 */
test('nas oito requisicoes examinadas, nenhuma comparacao produz INCOMPATIVEL', () => {
  const requisicoes: any[] = [coerente()];
  for (const mutar of [
    (x: any) => { x.overallStats.total = 9; x.overallStats.valid = 9; },
    (x: any) => { delete x.qualityAnalysis.statistics.total; },
    (x: any) => { x.qualityAnalysis.statistics.byStatus = { 'REVISAR': 4 }; },
    (x: any) => { x.qualityAnalysis.statistics.byStatus = { 'SUSPEITO': 0, 'CRÍTICO': 4 }; },
    (x: any) => { x.qualityAnalysis.summary.critical = 4; },
    (x: any) => { delete x.overallStats; },
    (x: any) => { x.qualityAnalysis = { respondents: [1, 2].map((i) => ({ id: `r-${i}`, cr: 0.05 })) }; delete x.overallStats; },
  ]) {
    const s = coerente();
    mutar(s);
    requisicoes.push(s);
  }
  const estados = requisicoes.flatMap((s) => avaliarCoerencia(s).comparacoes.map((c) => c.estado));
  expect(estados.length).toBeGreaterThan(30);
  expect(estados).not.toContain('incompativel');
  // ⚠ E o ensaio DISCRIMINA: os outros tres estados aparecem todos.
  for (const e of ['consistente', 'contraditoria', 'nao_determinada']) expect(estados).toContain(e);
});

// ============================================================ V2
test('V2 reprova quando statistics.total divergir da lista, e passa quando coincide', () => {
  const r = coerente();
  r.qualityAnalysis.statistics.total = 9;
  const v2 = estadoDe(r, 'V2');
  expect(v2.estado).toBe('contraditoria');
  expect(v2.motivo).toContain('qualityAnalysis.respondents.length = 4 contra qualityAnalysis.statistics.total = 9');
  expect(elegivel(r).elegivel).toBe(false);
  expect(estadoDe(coerente(), 'V2').estado).toBe('consistente');
});

// ============================================================ V3
test('V3 reprova quando a soma das chaves NOMEADAS nao fechar no total', () => {
  const r = coerente();
  r.qualityAnalysis.statistics.byStatus['REVISAR'] = 1;
  const v3 = estadoDe(r, 'V3');
  expect(v3.estado).toBe('contraditoria');
  // ⚠ As chaves somadas estao NOMEADAS, e nao somadas indiscriminadamente.
  expect(v3.chavesSomadas).toEqual(['CONFIÁVEL', 'REVISAR', 'SUSPEITO', 'CRÍTICO', 'DESCONHECIDO']);
  expect(v3.motivo).toContain('= 5 contra');
  expect(elegivel(r).elegivel).toBe(false);
  expect(estadoDe(coerente(), 'V3').estado).toBe('consistente');
});

test('V3: alias com valores IGUAIS conta UMA vez', () => {
  const r = coerente();
  r.qualityAnalysis.statistics.byStatus['CONFIAVEL'] = 4;
  expect(estadoDe(r, 'V3').estado).toBe('consistente');
  expect(elegivel(r).elegivel).toBe(true);
});

test('V3: alias com valores DIFERENTES suspende, e nenhuma variante prevalece', () => {
  const r = coerente();
  r.qualityAnalysis.statistics.byStatus['CONFIAVEL'] = 3;
  const v3 = estadoDe(r, 'V3');
  expect(v3.estado).toBe('contraditoria');
  expect(v3.lados.map((l) => [l.fonte, l.valor])).toEqual([
    ["byStatus['CONFIÁVEL']", 4],
    ["byStatus['CONFIAVEL']", 3],
  ]);
  expect(v3.motivo).toContain('Nenhuma variante prevalece');
  expect(elegivel(r).elegivel).toBe(false);
});

// ============================================================ V4
test('V4 reprova quando a contagem derivada dos CRs divergir da categoria agregada', () => {
  const r = coerente();
  r.qualityAnalysis.statistics.byStatus['CONFIÁVEL'] = 0;
  r.qualityAnalysis.statistics.byStatus['DESCONHECIDO'] = 4;
  const v4 = estadoDe(r, 'V4');
  expect(v4.estado).toBe('contraditoria');
  expect(v4.motivo).toContain("byStatus['CONFIÁVEL'] = 0");
  // ⚠ V3 segue consistente: a soma ainda fecha em 4. O par que reprova e V4.
  expect(estadoDe(r, 'V3').estado).toBe('consistente');
  expect(elegivel(r).elegivel).toBe(false);
  expect(estadoDe(coerente(), 'V4').estado).toBe('consistente');
});

test('V4 declara os intervalos dos DOIS produtores, e so CONFIAVEL coincide', () => {
  expect(estadoDe(coerente(), 'V4').condicao).toContain('COINCIDEM');
  expect(INTERVALOS_DECLARADOS['CONFIÁVEL'].coincidem).toBe(true);
  for (const k of ['REVISAR', 'SUSPEITO', 'CRÍTICO'] as const) {
    expect([k, INTERVALOS_DECLARADOS[k].coincidem]).toEqual([k, false]);
    expect(INTERVALOS_DECLARADOS[k].tela).not.toBe(INTERVALOS_DECLARADOS[k].rota);
  }
});

/**
 * ⚠ **C2: campo AUSENTE nao vira incompatibilidade.** Este teste consagrava o defeito:
 * exigia `incompativel` onde falta o lado necessario a comparacao.
 */
test('V4 com CONFIAVEL ausente sai NAO_DETERMINADA, qualquer que seja o restante', () => {
  for (const by of [
    { 'SUSPEITO': 0, 'CRÍTICO': 0, 'REVISAR': 4 },
    { 'REVISAR': 4 },
    { 'DESCONHECIDO': 4 },
    {},
  ]) {
    const r = coerente();
    r.qualityAnalysis.statistics.byStatus = by as any;
    const v4 = estadoDe(r, 'V4');
    expect([JSON.stringify(by), v4.estado]).toEqual([JSON.stringify(by), 'nao_determinada']);
    expect(v4.motivo).toContain('Campo ausente NAO vale zero');
    // ⚠ A divergencia de intervalos das OUTRAS categorias nao torna ESTE par incompativel,
    //   e o motivo diz isso. ⚠ A asserção é sobre o ESTADO, e o estado já foi aferido acima.
    expect(v4.motivo).toContain('nao torna ESTE par incompativel');
    // ⚠ E os dois lados ficam registrados, com o ausente em `null` e a fonte nomeada.
    expect(v4.lados.map((l) => l.fonte)).toEqual([
      'contagem derivada dos CRs individuais, CR <= 0.1',
      "byStatus['CONFIÁVEL']",
    ]);
    expect(v4.lados[1].valor).toBeNull();
    // ⚠ E SUSPENDE, porque comparacao aplicavel nao concluida suspende.
    expect(elegivel(r).elegivel).toBe(false);
  }
});

// ============================================================ V5
test('V5 reprova quando a particao nao fechar, com as chaves NOMEADAS', () => {
  const r = coerente();
  r.qualityAnalysis.summary.critical = 4;
  const v5 = estadoDe(r, 'V5');
  expect(v5.estado).toBe('contraditoria');
  expect(v5.motivo).toContain('soma 8 sobre total 4');
  expect(v5.motivo).toContain('com as chaves ok, suspicious, critical');
  expect(v5.chavesSomadas).toEqual([
    'summary.ok', 'summary.suspicious', 'summary.critical',
    'overallStats.valid', 'overallStats.warning', 'overallStats.critical',
  ]);
  expect(elegivel(r).elegivel).toBe(false);
  expect(estadoDe(coerente(), 'V5').estado).toBe('consistente');
});

test('V5 tambem reprova na particao de overallStats', () => {
  const r = coerente();
  r.overallStats.critical = 4;
  expect(estadoDe(r, 'V5').estado).toBe('contraditoria');
  expect(estadoDe(r, 'V5').motivo).toContain('overallStats');
});

// ============================================================ não determinada
/**
 * ⚠ **C4: a versao anterior deste teste passava por VACUIDADE.** Ela exigia que nao
 * houvesse valor zero entre os lados, e um array VAZIO satisfaz isso sem demonstrar nada.
 * **Agora exige os DOIS lados presentes, com o ausente em `null` e a fonte NOMEADA.**
 */
test('campo ausente produz NAO_DETERMINADA, com os DOIS lados registrados, e SUSPENDE', () => {
  const r = coerente();
  delete r.qualityAnalysis.statistics.total;
  for (const id of ['V2', 'V3'] as IdComparacao[]) {
    const c = estadoDe(r, id);
    expect([id, c.estado]).toEqual([id, 'nao_determinada']);
    // ⚠ Os DOIS lados existem no registro ESTRUTURADO, e nao so no motivo textual.
    expect([id, c.lados.length]).toEqual([id, 2]);
    for (const l of c.lados) expect([id, typeof l.fonte, l.fonte.length > 0]).toEqual([id, 'string', true]);
    // ⚠ O lado ausente vale `null`, e NAO zero.
    const ausente = c.lados.find((l) => l.fonte === 'qualityAnalysis.statistics.total')!;
    expect([id, ausente.valor]).toEqual([id, null]);
    expect(c.lados.some((l) => l.valor === 0)).toBe(false);
    // ⚠ E o outro lado traz o valor MEDIDO, o que prova que o par foi montado.
    expect(c.lados.filter((l) => typeof l.valor === 'number').length).toBe(1);
    expect(c.motivo).toContain('Campo ausente NAO vale zero');
  }
  const c = avaliarCoerencia(r);
  expect(c.conclusao).toBe('nao_determinada');
  expect(c.conjuntoMinimoConcluido).toBe(false);
  const e = elegivel(r);
  expect(e.elegivel).toBe(false);
  expect(e.motivo).toContain('Verificação obrigatória de coerência não determinada');
});

/**
 * ⚠ **C3: o conjunto minimo e PISO, e nao teto.** Uma comparacao APLICAVEL que fique
 * `nao_determinada` FORA do conjunto minimo tambem suspende, porque a regra literal exige
 * conclusao satisfatoria de TODAS as verificacoes obrigatorias aplicaveis.
 */
test('pendente FORA do conjunto minimo tambem SUSPENDE', () => {
  const r = coerente();
  delete r.qualityAnalysis.summary.total;
  // O minimo de P1 e V2 e V3, e as duas seguem CONCLUIDAS e consistentes.
  expect(CONJUNTO_MINIMO.P1).toEqual(['V2', 'V3']);
  for (const id of ['V2', 'V3'] as IdComparacao[]) expect([id, estadoDe(r, id).estado]).toEqual([id, 'consistente']);
  expect(avaliarCoerencia(r).conjuntoMinimoConcluido).toBe(true);
  // ⚠ E V1 e V5, FORA do minimo, ficam nao_determinada: o conjunto SUSPENDE mesmo assim.
  for (const id of ['V1', 'V5'] as IdComparacao[]) expect([id, estadoDe(r, id).estado]).toEqual([id, 'nao_determinada']);
  const c = avaliarCoerencia(r);
  expect(c.conclusao).toBe('nao_determinada');
  expect(c.motivo).toContain('FORA do conjunto minimo, que tambem suspende');
  expect(elegivel(r).elegivel).toBe(false);
});

/**
 * ⚠ **C3, perda interna a V5: cada particao presente e verificacao PROPRIA.** Uma
 * particao completa nao pode deixar o resultado `consistente` com outra incompleta.
 */
test('V5: particao completa NAO salva o par quando outra particao presente esta incompleta', () => {
  const r = coerente();
  delete r.overallStats.warning;
  const v5 = estadoDe(r, 'V5');
  // A particao de `summary` fecha, e a de `overallStats` esta incompleta.
  expect(v5.estado).toBe('nao_determinada');
  expect(v5.motivo).toContain('cada particao presente e verificacao propria');
  expect(v5.lados.some((l) => l.fonte === 'overallStats.warning' && l.valor === null)).toBe(true);
  expect(elegivel(r).elegivel).toBe(false);
});

test('conjunto minimo de P2 nao estabelecido, sem status na lista, SUSPENDE', () => {
  const r = coerente();
  r.qualityAnalysis = { respondents: [1, 2, 3, 4].map((i) => ({ id: `r-${i}`, cr: 0.05 })) };
  delete r.overallStats;
  expect(ramoDeQualidade(r)).toBe('P2');
  expect(CONJUNTO_MINIMO.P2).toEqual(['V4']);
  expect(estadoDe(r, 'V4').estado).toBe('nao_determinada');
  expect(avaliarCoerencia(r).conclusao).toBe('nao_determinada');
  expect(elegivel(r).elegivel).toBe(false);
});

// ============================================================ precedência
test('PRECEDENCIA: ausente e incompleta conservam os motivos e as fontes anteriores', () => {
  const ausente = { ...coerente(), qualityAnalysis: { respondents: [] } };
  const a = classificarAvaliacaoRecebida(ausente);
  expect(a.estado).toBe('ausente');
  expect(elegivel(ausente).motivo).toBe(MOTIVO_AUSENTE);
  expect(elegivel(ausente).motivo).not.toContain('Contradição interna');

  const inc = coerente();
  inc.qualityAnalysis.respondents = [respondente(1, 0.05), respondente(2, null)];
  const i = classificarAvaliacaoRecebida(inc);
  expect(i.estado).toBe('incompleta');
  expect(elegivel(inc).motivo).toContain(MOTIVO_INCOMPLETA);
  // ⚠ A coerencia NAO substitui nem reescreve o motivo anterior.
  expect(elegivel(inc).motivo).not.toContain('Contradição interna');
  expect(elegivel(inc).motivo).toContain('Medido: 1 de 2 respondentes com CR.');
});

// ============================================================ a apresentação, EXERCITADA
/** Executa o tratador REAL e devolve o corpo da resposta. */
async function executar(payload: any) {
  jest.resetModules();
  const antes = { chave: process.env.ANTHROPIC_API_KEY, flag: process.env.USE_RAG_SEMANTIC };
  process.env.ANTHROPIC_API_KEY = CHAVE;
  delete process.env.USE_RAG_SEMANTIC;
  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: class {
      messages = {
        create: async () => ({ content: [{ type: 'text', text: 'Parecer simulado, sem nota.' }] }),
      };
    },
  }));
  const silencios = ['log', 'warn', 'error'].map((m) =>
    jest.spyOn(console, m as 'log').mockImplementation(() => undefined)
  );
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { POST } = require('@/app/api/ai-reviewer/route');
    const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
    return await res.json();
  } finally {
    silencios.forEach((s) => s.mockRestore());
    if (antes.chave === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = antes.chave;
    if (antes.flag === undefined) delete process.env.USE_RAG_SEMANTIC; else process.env.USE_RAG_SEMANTIC = antes.flag;
  }
}

/**
 * Renderiza o componente REAL sobre o corpo que a rota devolveu.
 *
 * ⚠ **React, `react-dom/server` e o componente são requeridos JUNTOS, aqui**, e não
 * importados no topo do arquivo: `executar` chama `jest.resetModules()`, e um React de
 * outro registro deixa o dispatcher nulo. **É defeito de arnês, não de produção.**
 */
function renderizar(corpo: any): string {
  /* eslint-disable @typescript-eslint/no-var-requires */
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const ParecerAISection = require('@/components/ParecerAISection').default;
  /* eslint-enable @typescript-eslint/no-var-requires */
  return renderToStaticMarkup(
    React.createElement(ParecerAISection, { aiReview: corpo, loading: false, onExecute: () => undefined })
  );
}

/**
 * ⚠ **A apresentação é EXERCITADA, e não lida:** o componente REAL é renderizado com
 * `renderToStaticMarkup`, sobre o corpo que a rota devolveu.
 */
test('apresentacao EXERCITADA: o rotulo e o motivo chegam a tela no caso que passa a suspender', async () => {
  const r = coerente();
  r.qualityAnalysis.summary.critical = 4; // a contradição medida: 4 + 4 sobre total 4
  const corpo = await executar(r);

  expect(corpo.nota).toBeNull();
  expect(corpo.veredicto).toBeNull();
  expect(corpo.notaSuspensa?.suspensa).toBe(true);
  expect(corpo.notaSuspensa.rotulo).toBe('Nota não calculada: contradição interna não resolvida na avaliação de qualidade');
  expect(corpo.notaSuspensa.motivo).toContain('V5: a particao de qualityAnalysis.summary soma 8 sobre total 4');

  const html = renderizar(corpo);
  // ⚠ C5: o rotulo e o PROPRIO do caso contraditorio, e o antigo NAO aparece.
  expect(html).toContain('Nota não calculada: contradição interna não resolvida na avaliação de qualidade');
  expect(html).not.toContain('Nota não calculada: qualidade individual não avaliada');
  expect(html).toContain('soma 8 sobre total 4');
  expect(html).toContain('Os cálculos AHP-BOCR');
  // ⚠ CONTROLE de que a asserção discrimina: no caso coerente o cartão de suspensão NÃO sai.
  const corpoOk = await executar(coerente());
  expect(corpoOk.notaSuspensa).toBeNull();
  const htmlOk = renderizar(corpoOk);
  expect(htmlOk).not.toContain('Nota não calculada: qualidade individual não avaliada');
  expect(htmlOk).not.toContain('Nota não calculada: contradição interna não resolvida na avaliação de qualidade');
  // ⚠ D1: e o caso contraditorio NAO usa a redacao da verificacao nao concluida.
  expect(corpo.notaSuspensa.causa).toBe('contradicao');
  expect(html).not.toContain('verificação de coerência não concluída');
});

/**
 * ⚠ **D1: a apresentação do caso NÃO CONCLUÍDO, também EXERCITADA.** Suspende igual, e
 * **não pode anunciar contradição**, porque nenhuma foi demonstrada.
 */
test('apresentacao EXERCITADA: verificacao NAO CONCLUIDA tem rotulo proprio, e nao afirma contradicao', async () => {
  const r = coerente();
  delete r.qualityAnalysis.statistics.total; // V2 e V3 ficam nao_determinada
  const corpo = await executar(r);

  expect(corpo.nota).toBeNull();
  expect(corpo.veredicto).toBeNull();
  expect(corpo.notaSuspensa?.suspensa).toBe(true);
  // ⚠ CAUSA, ROTULO e MOTIVO proprios, distintos dos da contradicao.
  expect(corpo.notaSuspensa.causa).toBe('coerencia_nao_concluida');
  expect(corpo.notaSuspensa.rotulo).toBe('Nota não calculada: verificação de coerência não concluída');
  expect(corpo.notaSuspensa.motivo).toContain('NENHUMA contradicao foi demonstrada');
  // ⚠ E NOMEIA a verificacao pendente.
  expect(corpo.notaSuspensa.motivo).toMatch(/V2:|V3:/);

  const html = renderizar(corpo);
  expect(html).toContain('Nota não calculada: verificação de coerência não concluída');
  // ⚠ NAO afirma contradicao, nem indisponibilidade, em lugar nenhum do markup.
  expect(html).not.toContain('contradição interna não resolvida');
  expect(html).not.toContain('Nota não calculada: qualidade individual não avaliada');
});

/**
 * ⚠ **D1: coerência NÃO AVALIADA não é apresentada como contradição.** É o terceiro caso
 * que antes colapsava na mesma causa.
 */
test('coerencia NAO AVALIADA tem causa e rotulo proprios, e nao afirma contradicao', () => {
  const av = classificarAvaliacaoRecebida(coerente());
  const e = elegivelParaClassificacao(av, null);
  expect(e.elegivel).toBe(false);
  expect(e.causa).toBe('coerencia_nao_avaliada');
  expect(e.rotulo).toBe('Nota não calculada: coerência interna não avaliada nesta requisição');
  expect(e.motivo).toContain('NENHUMA contradicao foi demonstrada');
  expect(e.motivo).not.toContain('Contradição interna não resolvida');
  // ⚠ E as tres causas de coerencia sao DISTINTAS entre si.
  const r = coerente();
  r.qualityAnalysis.summary.critical = 4;
  const contradicao = elegivel(r);
  const s = coerente();
  delete s.qualityAnalysis.statistics.total;
  const naoConcluida = elegivel(s);
  const causas = [e.causa, contradicao.causa, naoConcluida.causa];
  expect(causas).toEqual(['coerencia_nao_avaliada', 'contradicao', 'coerencia_nao_concluida']);
  expect(new Set([e.rotulo, contradicao.rotulo, naoConcluida.rotulo]).size).toBe(3);
  expect(naoConcluida.motivo).not.toContain('Contradição interna não resolvida');
});

// ============================================================ E1: o texto entregue
/**
 * Executa o tratador REAL e devolve o corpo MAIS o texto entregue ao modelo.
 *
 * ⚠ **Instrumento novo:** o achatamento abaixo percorre `system` e `messages` sem
 * `JSON.stringify`, que escaparia as quebras de linha e faria uma asserção de frase
 * passar ou reprovar por motivo errado. O teste confere um marcador conhecido antes de
 * afirmar qualquer ausência, para não passar por captura vazia.
 */
async function executarCapturando(payload: any): Promise<{ corpo: any; contexto: string }> {
  jest.resetModules();
  const antes = { chave: process.env.ANTHROPIC_API_KEY, flag: process.env.USE_RAG_SEMANTIC };
  process.env.ANTHROPIC_API_KEY = CHAVE;
  delete process.env.USE_RAG_SEMANTIC;
  const capturas: string[] = [];
  const achatar = (v: any): string =>
    typeof v === 'string'
      ? v
      : Array.isArray(v)
        ? v.map(achatar).join('\n')
        : v && typeof v === 'object'
          ? Object.values(v).map(achatar).join('\n')
          : '';
  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: class {
      messages = {
        create: async (params: any) => {
          capturas.push(achatar(params?.system) + '\n' + achatar(params?.messages));
          return { content: [{ type: 'text', text: 'Parecer simulado, sem nota.' }] };
        },
      };
    },
  }));
  const silencios = ['log', 'warn', 'error'].map((m) =>
    jest.spyOn(console, m as 'log').mockImplementation(() => undefined)
  );
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { POST } = require('@/app/api/ai-reviewer/route');
    const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
    return { corpo: await res.json(), contexto: capturas.join('\n') };
  } finally {
    silencios.forEach((s) => s.mockRestore());
    if (antes.chave === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = antes.chave;
    if (antes.flag === undefined) delete process.env.USE_RAG_SEMANTIC; else process.env.USE_RAG_SEMANTIC = antes.flag;
  }
}

/**
 * ⚠ **E1: o ramo compartilhado deixa de prometer um nome.** A frase anterior dizia que o
 * que não se concluiu "foi a verificação nomeada acima": exata em `coerencia_nao_concluida`,
 * onde o motivo nomeia V2 ou V3, e **falsa** em `coerencia_nao_avaliada`, onde o motivo diz
 * que a verificação não chegou a correr e **não nomeia nenhuma**.
 *
 * ⚠ **MEDIDO por leitura da cadeia de chamadas, e não das importações:** `avaliarCoerencia`
 * devolve `Coerencia` não anulável, e a rota a calcula sempre antes de montar o contexto,
 * então o braço `coerencia_nao_avaliada` do ramo **não tem caminho por esta API**. **O que
 * se exercita aqui é o braço alcançável**, e a correção retira a promessa de nome dos dois.
 */
test('E1: o texto entregue nao promete nome de verificacao, e o motivo segue nomeando', async () => {
  const r = coerente();
  delete r.qualityAnalysis.statistics.total; // V2 e V3 ficam nao_determinada
  const { corpo, contexto } = await executarCapturando(r);

  expect(corpo.notaSuspensa.causa).toBe('coerencia_nao_concluida');
  // ⚠ CONTROLE de captura NAO VAZIA: sem isto, toda ausencia passaria por vacuidade.
  expect(contexto).toContain('CLASSIFICAÇÃO SUSPENSA POR VERIFICAÇÃO DE COERÊNCIA NÃO CONCLUÍDA');
  // ⚠ A frase antiga SAIU do que o modelo recebe.
  expect(contexto).not.toContain('nomeada acima');
  expect(contexto).toContain(
    'a verificação de coerência não foi concluída, pelo motivo informado acima'
  );
  // ⚠ E o que NOMEIA a verificacao continua presente: e o MOTIVO, na linha anterior.
  expect(contexto).toMatch(/V2:|V3:/);

  // ⚠ CONTROLE de que a assercao DISCRIMINA: o ramo da contradicao nao recebeu a frase, e
  //   continua com a sua, palavra por palavra.
  const s = coerente();
  s.qualityAnalysis.summary.critical = 4;
  const outro = await executarCapturando(s);
  expect(outro.corpo.notaSuspensa.causa).toBe('contradicao');
  expect(outro.contexto).not.toContain('a verificação de coerência não foi concluída');
  expect(outro.contexto).toContain(
    'o que não se resolveu foi a contradição entre os valores declarados na própria requisição'
  );
});
