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
  expect(elegivel(r)).toEqual({ elegivel: true, motivo: null });
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

test('V1 sai INCOMPATIVEL quando as populacoes declaradas diferem, e isso NAO reprova o conjunto', () => {
  const r = coerente();
  r.overallStats.total = 9;
  r.overallStats.valid = 9;
  const v1 = estadoDe(r, 'V1');
  expect(v1.estado).toBe('incompativel');
  expect(v1.motivo).toContain('populacoes DIFERENTES');
  // ⚠ V2 e V3, o conjunto minimo de P1, seguem concluidas, e o conjunto e COERENTE.
  expect(avaliarCoerencia(r).conclusao).toBe('coerente');
  expect(elegivel(r).elegivel).toBe(true);
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

test('V4 sai INCOMPATIVEL com limiares divergentes, e isso sozinho NAO aprova nem reprova', () => {
  const r = coerente();
  // Só baldes de intervalo DEMONSTRADAMENTE diferente, sem o CONFIÁVEL comparável.
  r.qualityAnalysis.statistics.byStatus = { 'SUSPEITO': 0, 'CRÍTICO': 0, 'REVISAR': 4 };
  const v4 = estadoDe(r, 'V4');
  expect(v4.estado).toBe('incompativel');
  expect(v4.motivo).toContain('diferenca de significado DEMONSTRADA');
  expect(v4.motivo).toContain('intervalos divergentes');
  // ⚠ NAO REPROVA: V2 e V3, o conjunto minimo de P1, seguem concluidas e consistentes.
  expect(avaliarCoerencia(r).conclusao).toBe('coerente');
  expect(elegivel(r).elegivel).toBe(true);
  // ⚠ E NAO APROVA sozinho: com o conjunto minimo pendente, o veredito e nao_determinada.
  const s = coerente();
  s.qualityAnalysis.statistics.byStatus = { 'REVISAR': 4 };
  delete s.qualityAnalysis.statistics.total;
  expect(estadoDe(s, 'V4').estado).toBe('incompativel');
  expect(avaliarCoerencia(s).conclusao).toBe('nao_determinada');
  expect(elegivel(s).elegivel).toBe(false);
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
test('campo ausente produz NAO_DETERMINADA, e nao zero nem consistente, e SUSPENDE', () => {
  const r = coerente();
  delete r.qualityAnalysis.statistics.total;
  for (const id of ['V2', 'V3'] as IdComparacao[]) {
    const c = estadoDe(r, id);
    expect([id, c.estado]).toEqual([id, 'nao_determinada']);
    // ⚠ NAO virou zero: o lado ausente vale `null`.
    expect(c.lados.some((l) => l.valor === 0)).toBe(false);
    expect(c.motivo).toContain('Campo ausente NAO vale zero');
  }
  const c = avaliarCoerencia(r);
  expect(c.conclusao).toBe('nao_determinada');
  expect(c.conjuntoMinimoConcluido).toBe(false);
  const e = elegivel(r);
  expect(e.elegivel).toBe(false);
  expect(e.motivo).toContain('Verificação obrigatória de coerência não determinada');
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
  expect(corpo.notaSuspensa.motivo).toContain('V5: a particao de qualityAnalysis.summary soma 8 sobre total 4');

  const html = renderizar(corpo);
  expect(html).toContain('Nota não calculada: qualidade individual não avaliada');
  expect(html).toContain('soma 8 sobre total 4');
  expect(html).toContain('Os cálculos AHP-BOCR');
  // ⚠ CONTROLE de que a asserção discrimina: no caso coerente o cartão de suspensão NÃO sai.
  const corpoOk = await executar(coerente());
  expect(corpoOk.notaSuspensa).toBeNull();
  const htmlOk = renderizar(corpoOk);
  expect(htmlOk).not.toContain('Nota não calculada: qualidade individual não avaliada');
});
