export {};

/**
 * A.12, estatísticas por dimensão BOCR, SAÍDA A: o consumidor LATENTE dos totais (o antigo quarto ramo
 * de `route.ts:855-864`), com INSTRUMENTO DECLARADO.
 *
 * ⚠ **O que este arquivo NÃO é.** Ele NÃO é a execução de um caminho alcançável pela API. O ramo que
 * somava as quatro dimensões de `individualStats` **não é alcançado hoje**, e as duas evidências disso
 * não têm o mesmo alcance:
 *
 * - **cobertura observada** (medida): 0 de 32 combinações de presença de campos na Fase 1, e 0 execuções
 *   de `:856` e de `:861` pela suíte existente;
 * - **leitura das condições** (lida, e é ela que sustenta a afirmação GERAL): pedido elegível implica
 *   coerência V3 concluída (`avaliacao-qualidade.ts:765-793`, `:693-698`, `:497-503`), V3 exige
 *   `qualityAnalysis.statistics.byStatus` (`:497-503`), e com `byStatus` presente o ramo tomado é o
 *   primeiro (`route.ts:704-705`, `:840`). A contagem observada é apoio, e não prova.
 *
 * ⚠ **O instrumento.** A ELEGIBILIDADE é FORÇADA por um duplo de teste declarado (`jest.mock` de
 * `elegivelParaClassificacao`), de modo que o código real dos totais execute com `avaliada` verdadeira e
 * SEM `byStatus`, `summary` nem `overallStats`. É a única exceção à regra de que os ensaios de
 * apresentação passam pelo caminho real, e existe porque, sem ela, o ensaio seria vazio: um teste do
 * percurso atual passa mesmo que a soma indevida permaneça.
 *
 * ⚠ **O que ele guarda.** Que a Taxa de Validade Geral NÃO dependa dos quocientes por dimensão. No
 * código de `35a1506`, com a elegibilidade forçada e só o `individualStats`, a Taxa saía 0.0%, 100.0% ou
 * 70.0% conforme o caso, **todos derivados** dos quatro valores por dimensão (medido na Fase 1). Sem
 * base, a Taxa é "não calculada", e nunca 0.0%. **Falha se a dependência for restabelecida.**
 *
 * ⚠ A correção ali PREVINE um defeito latente. Ela não é apresentada como correção de defeito ativo.
 */

process.env.ANTHROPIC_API_KEY = 'chave-anthropic-falsa-do-processo-de-teste';
delete process.env.USE_RAG_SEMANTIC;

// ⚠ DUPLO DE TESTE, declarado: a ELEGIBILIDADE é forçada, para que o código REAL dos totais execute.
jest.mock('@/lib/ai-reviewer/avaliacao-qualidade', () => {
  const real = jest.requireActual('@/lib/ai-reviewer/avaliacao-qualidade');
  return { ...real, elegivelParaClassificacao: () => ({ elegivel: true, causa: null, motivo: null, rotulo: null }) };
});

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

let silencios: jest.SpyInstance[] = [];
beforeAll(() => {
  silencios = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
});
afterAll(() => silencios.forEach((s) => s.mockRestore()));
jest.setTimeout(60000);

const FRASE_DO_BLOCO_AVALIADA =
  '⚠️ Contagem por dimensão BOCR: não disponível nesta requisição (respostas totais, válidas, warning e críticas por dimensão). ' +
  'Os totais deste contexto são agregados e não identificam a dimensão: nenhuma contagem por dimensão é apresentada, e nenhuma deve ser derivada deles.';
const TAXA_SEM_BASE = '**Taxa de Validade Geral:** não calculada — nenhuma das contagens agregadas recebidas nesta requisição (por status, resumo ou totais gerais) traz total positivo.';
const TAXA_NAO_AVALIADA = '**Taxa de Validade Geral:** não calculada — qualidade individual não avaliada.';

async function executar(payload: any): Promise<string> {
  captura.contexto = '';
  const antes = captura.chamadas;
  const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
  await res.json();
  // ⚠ CONTROLE de captura NÃO VAZIA
  expect(captura.chamadas).toBe(antes + 1);
  expect(captura.contexto).toContain('## Pesos Finais da Hierarquia de Controle');
  return captura.contexto;
}

const item = (id: string, cr: number) => ({
  respondentId: id,
  id,
  name: `R ${id}`,
  cr,
  metrics: { avgCR: cr },
  status: cr <= 0.1 ? 'CONFIÁVEL' : cr <= 0.15 ? 'REVISAR' : cr <= 0.2 ? 'SUSPEITO' : 'CRÍTICO',
});

/** Pedido com a avaliação DECLARADA disponível e SÓ a lista de respondentes: sem `byStatus`, `summary` nem `overallStats`. */
const pedido = (n: number, individualStats: any) => ({
  avaliacaoDeQualidade: { estado: 'disponivel', motivo: null, fonte: 'declarada' },
  projectName: 'P',
  bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
  bocrConsistency: { cr: 0.01, lambda: 4.03 },
  responseCount: n,
  finalScores: [{ code: 'A1', name: 'A1', score: 0.6 }, { code: 'A2', name: 'A2', score: 0.4 }],
  qualityAnalysis: { respondents: Array.from({ length: n }, (_, i) => item(`r${i + 1}`, 0.05)) },
  individualStats,
});

const linhaDaTaxa = (c: string): string => {
  const linhas = c.split('\n').filter((l) => l.startsWith('**Taxa de Validade Geral:**'));
  expect(linhas.length).toBe(1);
  return linhas[0];
};

const trechoDoBloco = (c: string): string => {
  const cab = '## Estatísticas por Dimensão BOCR';
  expect(c.split(cab).length - 1).toBe(1);
  const i = c.indexOf(cab) + cab.length;
  const j = c.indexOf('## Pesos Finais da Hierarquia de Controle', i);
  expect(j).toBeGreaterThan(i);
  return c.slice(i, j).trim();
};

/** Cada forma de `individualStats`, com o que o código de `35a1506` imprimia como Taxa (medido na Fase 1, no mesmo instrumento). */
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

describe('consumidor LATENTE de `:855-864` (INSTRUMENTO DECLARADO: elegibilidade FORÇADA; o ramo NÃO é alcançado hoje, e este arquivo NÃO executa caminho alcançável)', () => {
  test.each(FORMAS)('Taxa SEM base, %s: "não calculada", nunca um percentual derivado do `individualStats`', async (_rotulo, n, individualStats, taxaQueOCodigoAnteriorImprimia) => {
    const contexto = await executar(pedido(n, individualStats));
    const taxa = linhaDaTaxa(contexto);
    // o controle de que a elegibilidade FOI forçada: `avaliada` é verdadeira, e a Taxa não é a do pedido não avaliado
    expect(taxa).not.toBe(TAXA_NAO_AVALIADA);
    // o que se guarda: sem base, "não calculada", e nenhum percentual, derivado ou não
    expect(taxa).toBe(TAXA_SEM_BASE);
    expect(taxa).not.toMatch(/%/);
    // e o número que o código de `35a1506` imprimia (derivado do `individualStats`) NÃO aparece como Taxa
    expect(taxa).not.toContain(taxaQueOCodigoAnteriorImprimia);
  });

  test.each(FORMAS)('bloco por dimensão, %s: a frase própria, sem dígito, e sem o `individualStats` recebido', async (_rotulo, n, individualStats) => {
    const contexto = await executar(pedido(n, individualStats));
    const trecho = trechoDoBloco(contexto);
    expect(trecho).toBe(FRASE_DO_BLOCO_AVALIADA);
    expect(/\d/.test(trecho)).toBe(false);
    expect(contexto).not.toMatch(/^- Respostas totais: \d+$/m);
    expect(contexto).not.toContain('CR médio da dimensão');
  });

  test('o mesmo pedido, com base MEDIDA (`byStatus`), volta a ter a Taxa medida: a base é o que decide, e não o `individualStats`', async () => {
    const p: any = pedido(5, { valid: 2, warning: 1, critical: 2, total: 5, avgCR: 0.136 });
    p.qualityAnalysis.statistics = { byStatus: { 'CONFIÁVEL': 2, 'REVISAR': 0, 'SUSPEITO': 1, 'CRÍTICO': 2 }, total: 5, avgCR: 0.136 };
    const comBase = await executar(p);
    expect(linhaDaTaxa(comBase)).toBe('**Taxa de Validade Geral:** 40.0% das respostas com CR ≤ 0.10');
    // e a Taxa medida NÃO muda se o `individualStats` mudar: ele não é lido
    p.individualStats = undefined;
    const semAgregado = await executar(p);
    expect(linhaDaTaxa(semAgregado)).toBe('**Taxa de Validade Geral:** 40.0% das respostas com CR ≤ 0.10');
    // ⚠ "válidas iguais a zero sobre base positiva" é RESULTADO, e fica: 0.0% medido não é "sem base"
    p.qualityAnalysis.statistics = { byStatus: { 'CONFIÁVEL': 0, 'REVISAR': 0, 'SUSPEITO': 2, 'CRÍTICO': 3 }, total: 5, avgCR: 0.3 };
    const zeroMedido = await executar(p);
    expect(linhaDaTaxa(zeroMedido)).toBe('**Taxa de Validade Geral:** 0.0% das respostas com CR ≤ 0.10');
  });
});
