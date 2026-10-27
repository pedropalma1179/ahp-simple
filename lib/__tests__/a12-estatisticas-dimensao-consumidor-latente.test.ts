export {};

/**
 * A.12, estatísticas por dimensão BOCR: o consumidor LATENTE dos totais por dimensão (o antigo quarto ramo de `route.ts:855-864`).
 *
 * ⚠ **REESCRITO NO AJUSTE 1 (consistência individual, A.12 item (c)).** A versão anterior forçava a elegibilidade com um duplo de
 * `elegivelParaClassificacao`, para que o ramo que SOMAVA as quatro dimensões de `individualStats` executasse sem `byStatus`, `summary`
 * nem `overallStats`, e guardava que a Taxa de Validade Geral NÃO dependesse dos quocientes por dimensão (no código de `35a1506`, com a
 * elegibilidade forçada, a Taxa saía 0.0%, 100.0% ou 70.0% conforme o caso, todos derivados dos quatro valores por dimensão).
 *
 * O ramo que somava as dimensões, a Taxa e o `individualStats` como entrada SAÍRAM do que a rota lê: a Taxa de Validade Geral é taxa de
 * pessoas e foi removida, e a rota nem lê o agregado. O duplo de elegibilidade deixou de ter função (a elegibilidade agora se obtém
 * naturalmente, com o CR por matriz recalculado de todos os respondentes enviados), e foi retirado.
 *
 * **Garantia que continua, na forma que ainda faz sentido:** a Taxa NÃO existe no contexto, e o contexto NÃO muda com o
 * `individualStats`, em nenhuma das seis formas que a versão anterior ensaiava. Se a dependência fosse restabelecida (a Taxa
 * reaparecer, ou o contexto variar com o agregado), este arquivo reprova. ⚠ A correção ali PREVENIA um defeito latente; a remoção
 * dele não é apresentada como correção de defeito ativo.
 */

process.env.ANTHROPIC_API_KEY = 'chave-anthropic-falsa-do-processo-de-teste';
delete process.env.USE_RAG_SEMANTIC;

const captura: { contexto: string; chamadas: number } = { contexto: '', chamadas: 0 };
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class {
    messages = {
      create: async (a: { messages: Array<{ content: string }> }) => {
        captura.chamadas += 1;
        captura.contexto = a.messages.map((m) => m.content).join('\n');
        return { content: [{ type: 'text', text: 'Parecer de ensaio, sem decisão editorial declarada no texto. '.repeat(3) }] };
      },
    };
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('@/app/api/ai-reviewer/route');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { blocoDoMaximo } = require('./helpers/consistencia-de-ensaio');

let silencios: jest.SpyInstance[] = [];
beforeAll(() => {
  silencios = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
});
afterAll(() => silencios.forEach((s) => s.mockRestore()));
jest.setTimeout(60000);

const FRASE_ANTIGA_DO_BLOCO_POR_DIMENSAO =
  '⚠️ Contagem por dimensão BOCR: não disponível nesta requisição (respostas totais, válidas, warning e críticas por dimensão). ' +
  'Os totais deste contexto são agregados e não identificam a dimensão: nenhuma contagem por dimensão é apresentada, e nenhuma deve ser derivada deles.';

async function executar(payload: any): Promise<{ contexto: string; corpo: any }> {
  captura.contexto = '';
  const antes = captura.chamadas;
  const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
  const corpo = await res.json();
  // ⚠ CONTROLE de captura NÃO VAZIA
  expect(captura.chamadas).toBe(antes + 1);
  expect(captura.contexto).toContain('## Pesos Finais da Hierarquia de Controle');
  return { contexto: captura.contexto, corpo };
}

const item = (id: string, cr: number) => ({
  respondentId: id,
  id,
  name: `R ${id}`,
  cr,
  metrics: { avgCR: cr },
  status: cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.15 ? 'REVISAR' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO',
  consistenciaIndividual: blocoDoMaximo(cr),
});

/** Pedido com a lista de respondentes COM o bloco recalculado, SEM `byStatus`, `summary` nem `overallStats`, e com o `individualStats` dado. */
const pedido = (n: number, individualStats: any) => ({
  projectName: 'P',
  bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
  bocrConsistency: { cr: 0.01, lambda: 4.03 },
  responseCount: n,
  finalScores: [{ code: 'A1', name: 'A1', score: 0.6 }, { code: 'A2', name: 'A2', score: 0.4 }],
  qualityAnalysis: { respondents: Array.from({ length: n }, (_, i) => item(`r${i + 1}`, 0.05)) },
  individualStats,
});

const trechoDoBloco = (c: string): string => {
  const cab = '## Estatísticas por Dimensão BOCR';
  expect(c.split(cab).length - 1).toBe(1);
  const i = c.indexOf(cab) + cab.length;
  const j = c.indexOf('## Pesos Finais da Hierarquia de Controle', i);
  expect(j).toBeGreaterThan(i);
  return c.slice(i, j).trim();
};

/** Cada forma de `individualStats` que a versão anterior ensaiava, com o que o código de `35a1506` imprimia como Taxa (medido na Fase 1). */
const FORMAS: Array<[string, number, any, string]> = [
  ['agregado achatado de 5: 2 válidas, 1 warning, 2 críticas', 5, { valid: 2, warning: 1, critical: 2, total: 5, avgCR: 0.136 }, '0.0%'],
  ['agregado achatado de 5, todas válidas', 5, { valid: 5, warning: 0, critical: 0, total: 5, avgCR: 0.05 }, '100.0%'],
  ['agregado achatado de 3, todas válidas', 3, { valid: 3, warning: 0, critical: 0, total: 3, avgCR: 0.05 }, '0.0%'],
  ['agregado achatado de 12, todas válidas', 12, { valid: 12, warning: 0, critical: 0, total: 12, avgCR: 0.05 }, '100.0%'],
  [
    'por dimensão, em pessoas (5 pessoas; válidas 5, 4, 3 e 2)',
    5,
    {
      Benefits: { total: 5, valid: 5, warning: 0, critical: 0 },
      Opportunities: { total: 5, valid: 4, warning: 1, critical: 0 },
      Costs: { total: 5, valid: 3, warning: 1, critical: 1 },
      Risks: { total: 5, valid: 2, warning: 2, critical: 1 },
    },
    '70.0%',
  ],
  ['sem `individualStats`', 5, undefined, '0.0%'],
];

describe('consumidor LATENTE dos totais por dimensão (AJUSTE 1: o ramo, a Taxa e o agregado saíram; a dependência não pode voltar)', () => {
  test.each(FORMAS)('Taxa AUSENTE, %s: o contexto não traz Taxa de Validade, derivada do `individualStats` ou não', async (_rotulo, n, individualStats, taxaQueOCodigoAnteriorImprimia) => {
    const { contexto, corpo } = await executar(pedido(n, individualStats));
    // o controle de que o pedido é ELEGÍVEL pelo caminho natural: sem duplo, com o bloco recalculado de todos os enviados
    expect(corpo.notaSuspensa).toBeNull();
    expect(contexto).not.toContain('Taxa de Validade');
    // e o número que o código de `35a1506` imprimia como Taxa (derivado do `individualStats`) NÃO aparece como Taxa em canal nenhum
    expect(contexto).not.toContain(`**Taxa de Validade Geral:** ${taxaQueOCodigoAnteriorImprimia}`);
    expect(contexto).not.toMatch(/das respostas com CR ≤ 0\.10/);
  });

  test.each(FORMAS)('bloco por dimensão, %s: o CR por matriz dos enviados, sem a frase antiga e sem o `individualStats` recebido', async (_rotulo, n, individualStats) => {
    const { contexto } = await executar(pedido(n, individualStats));
    const trecho = trechoDoBloco(contexto);
    expect(trecho).toContain(`CR individual por matriz, sobre os ${n} respondentes enviados com CR recalculado dos julgamentos`);
    expect(trecho).not.toBe(FRASE_ANTIGA_DO_BLOCO_POR_DIMENSAO);
    expect(contexto).not.toMatch(/^- Respostas totais: \d+$/m);
    expect(contexto).not.toContain('CR médio da dimensão');
  });

  test('o contexto de um mesmo painel é o MESMO, byte a byte, em qualquer forma de `individualStats` (a dependência não pode voltar)', async () => {
    const cinco = FORMAS.filter(([, n]) => n === 5);
    expect(cinco.length).toBe(4); // achatado de 5 (duas), por dimensão, e sem `individualStats`: quatro formas de 5
    const contextos: string[] = [];
    for (const [, n, individualStats] of FORMAS.filter(([, n]) => n === 5)) {
      contextos.push((await executar(pedido(n, individualStats))).contexto);
    }
    for (const c of contextos) expect(c === contextos[0]).toBe(true);
    // e o agregado de OUTRO tamanho muda o contexto só porque muda o painel (n de respondentes), nunca o agregado: o de 3 difere do de 5
    const tres = (await executar(pedido(3, FORMAS[2][2]))).contexto;
    expect(tres === contextos[0]).toBe(false);
  });

  test('CONTROLE: o mesmo pedido com `byStatus` e `summary` de qualquer valor tem o mesmo contexto: nem a base da Taxa antiga é lida', async () => {
    const p: any = pedido(5, { valid: 2, warning: 1, critical: 2, total: 5, avgCR: 0.136 });
    const semBase = (await executar(p)).contexto;
    p.qualityAnalysis.statistics = { byStatus: { 'CONFIÁVEL': 2, 'REVISAR': 0, 'SUSPEITO': 1, 'CRÍTICO': 2 }, total: 5, avgCR: 0.136 };
    p.qualityAnalysis.summary = { total: 5, ok: 2, suspicious: 1, critical: 2 };
    p.overallStats = { total: 5, valid: 2, warning: 1, critical: 2 };
    const comBase = (await executar(p)).contexto;
    expect(comBase === semBase).toBe(true);
    // «0 válidas sobre base positiva» também não muda nada: era RESULTADO na versão anterior (0.0%) e hoje não é lido
    p.qualityAnalysis.statistics = { byStatus: { 'CONFIÁVEL': 0, 'REVISAR': 0, 'SUSPEITO': 2, 'CRÍTICO': 3 }, total: 5, avgCR: 0.3 };
    const zeroMedido = (await executar(p)).contexto;
    expect(zeroMedido === semBase).toBe(true);
  });
});
