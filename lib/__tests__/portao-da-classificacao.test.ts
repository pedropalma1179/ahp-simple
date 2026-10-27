export {};

/**
 * lib/__tests__/portao-da-classificacao.test.ts
 *
 * **Ajuste 1, segunda etapa (predições P-GR-1 e P-GR-2, `docs/imprecisoes-parecer-ia.md`): o portão `calculateGrade` ainda BLOQUEIA para dado ausente,
 * incompleto, inválido, duplicado e contraditório?** `calculateGrade` deixou de pontuar e virou só o portão (`elegivelParaClassificacao`). Esta suíte
 * exercita a ROTA REAL (`POST /api/ai-reviewer`), com o provedor do modelo substituído por um duplo cujo texto TEM uma decisão editorial reconhecível
 * («REVISÕES MAIORES»). Assim, se o portão deixasse passar um pedido que deveria bloquear, o texto do modelo produziria uma nota (C) na resposta, e o teste
 * reprovaria. Para cada condição, o que se mede é o campo que a tela lê: `nota`, `veredicto`, `notaSuspensa` (causa e motivo) e `estadoDaExtracao`.
 *
 * ⚠ **O que isto NÃO demonstra:** o que o modelo escreveria. O texto do duplo é fixo. É teste do PORTÃO, e não de saída.
 *
 * ⚠ **Por que a decisão do duplo importa.** Na rota, a nota e o veredicto só saem do TEXTO do modelo (`extractGradeFromReview`), e só quando `calculateGrade` não suspende.
 * Um texto COM decisão reconhecível transforma um portão aberto por engano em uma nota C visível na resposta; com o portão fechado, a resposta traz `nota` e
 * `veredicto` nulos. ⚠ O valor numérico que o `calculateGrade` de `bcb6bdb` calculava (medido: D, score 60, sobre a requisição de agora) NUNCA chegou à resposta, só
 * ao log; por isso uma mutação que o devolvesse não é detectada aqui, e a guarda contra ele é a do fonte, em `a12-nota-veredicto-fase2.test.ts`.
 * As mutações que desligam o portão (cinco, com o número de reprovações) estão no registro, e não neste arquivo.
 */

process.env.ANTHROPIC_API_KEY = 'chave-anthropic-falsa-do-processo-de-teste';
delete process.env.USE_RAG_SEMANTIC;

const modelo: { texto: string; chamadas: number; mensagens: string } = { texto: '', chamadas: 0, mensagens: '' };
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: class {
    messages = {
      create: async (a: { messages?: Array<{ content: string }> }) => {
        modelo.chamadas += 1;
        modelo.mensagens = (a.messages ?? []).map((m) => m.content).join('\n');
        return { content: [{ type: 'text', text: modelo.texto }] };
      },
    };
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('@/app/api/ai-reviewer/route');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { blocoDoMaximo, blocoComMaximo, blocoRecalculado, blocoIndisponivel } = require('./helpers/consistencia-de-ensaio');

let silencios: jest.SpyInstance[] = [];
beforeAll(() => {
  silencios = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
});
afterAll(() => silencios.forEach((s) => s.mockRestore()));
jest.setTimeout(60000);

const CORPO_NEUTRO = 'Parecer de ensaio. Análise dos dados sem rótulo de resultado. '.repeat(3);
/** Um parecer COM decisão editorial reconhecível: sem portão, a rota extrairia dele a nota C. */
const COM_DECISAO = `${CORPO_NEUTRO}\n## 🎯 DECISÃO EDITORIAL\nREVISÕES MAIORES\n\nTexto final de ensaio.\n`;
/** Um parecer SEM nenhuma decisão reconhecível. */
const SEM_DECISAO = `${CORPO_NEUTRO}\n## 🎯 DECISÃO EDITORIAL\nA categoria fica a critério do comitê, sem rótulo declarado.\n`;

const item = (id: string, bloco: unknown) => ({ respondentId: id, id, name: `R ${id}`, consistenciaIndividual: bloco });
const painel = (n: number, bloco: () => unknown = () => blocoDoMaximo(0.05)) =>
  Array.from({ length: n }, (_, i) => item(`r${i + 1}`, bloco()));

/** O pedido-base: elegível (4 respondentes com o bloco recalculado e coerente). Cada condição o altera de um jeito só. */
const base = (qualityAnalysis: unknown): any => ({
  projectName: 'P',
  bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
  bocrConsistency: { cr: 0.01, lambda: 4.03 },
  responseCount: 4,
  finalScores: [{ code: 'A1', name: 'A1', score: 0.6 }, { code: 'A2', name: 'A2', score: 0.4 }],
  ...(qualityAnalysis === undefined ? {} : { qualityAnalysis }),
});

async function executar(payload: any, texto: string): Promise<any> {
  modelo.texto = texto;
  const antes = modelo.chamadas;
  const res = await POST({ json: async () => JSON.parse(JSON.stringify(payload)) } as any);
  const corpo = await res.json();
  // ⚠ CONTROLE de captura NÃO VAZIA: o modelo FOI chamado UMA vez. Suspender a classificação não impede o parecer; impede a NOTA.
  expect(modelo.chamadas).toBe(antes + 1);
  expect(corpo.success).toBe(true);
  return corpo;
}

// ---------------------------------------------------------------------------------------------------------------------------
// CONTROLES: o portão não bloqueia o que não deve
// ---------------------------------------------------------------------------------------------------------------------------
describe('controles: o painel completo e coerente NÃO é bloqueado, e a nota continua vindo SÓ do texto do modelo', () => {
  test('4 respondentes com o bloco recalculado e coerente, texto COM decisão: nota C do texto, sem suspensão', async () => {
    const c = await executar(base({ respondents: painel(4) }), COM_DECISAO);
    expect(c.notaSuspensa).toBeNull();
    expect([c.nota, c.veredicto, c.metadata.estadoDaExtracao]).toEqual(['C', 'REVISÕES MAIORES', 'padrao_reconhecido']);
    expect(c.metadata.avaliacaoDeQualidade.estado).toBe('disponivel');
  });

  test('o MESMO painel com texto SEM decisão: nota e veredicto NULOS, e nenhum valor automático substituto', async () => {
    const c = await executar(base({ respondents: painel(4) }), SEM_DECISAO);
    expect(c.notaSuspensa).toBeNull();
    expect([c.nota, c.veredicto, c.metadata.estadoDaExtracao]).toEqual([null, null, 'nenhum_padrao_reconhecido']);
    expect(c.mensagemDaExtracao).toEqual(expect.any(String));
  });

  test('CR calculado ZERO nas seis matrizes é resultado válido, e não ausência: não bloqueia', async () => {
    const zero = () => blocoRecalculado({ BOCR: 0, MAGNITUDE: 0, 'SUB-B': 0, 'SUB-O': 0, 'SUB-C': 0, 'SUB-R': 0 });
    const c = await executar(base({ respondents: painel(4, zero) }), COM_DECISAO);
    expect(c.notaSuspensa).toBeNull();
    expect(c.nota).toBe('C');
  });

  test('pedido MISTO: o bloco recalculado em todos MAIS campos do formato anterior CONTRADITÓRIOS (status, cr, byStatus, summary, overallStats): não bloqueia, e nada do formato anterior chega ao modelo', async () => {
    const legado = {
      respondents: painel(4).map((r) => ({ ...r, status: 'CRÍTICO', cr: 0.9, metrics: { avgCR: 0.9 }, overallScore: 12, recommendation: 'EXCLUIR' })),
      statistics: { byStatus: { 'CRÍTICO': 4 }, total: 4, avgCR: 0.9 },
      summary: { total: 4, ok: 0, suspicious: 0, critical: 4 },
    };
    const payload = { ...base(legado), overallStats: { total: 4, valid: 0, warning: 0, critical: 4 }, individualStats: { total: 4, valid: 0, warning: 0, critical: 4, avgCR: 0.9 } };
    const c = await executar(payload, COM_DECISAO);
    // a lista branca descarta o formato anterior; a coerência é decidida pelo ramo P4 (bloco), que não examina os agregados antigos
    expect(c.notaSuspensa).toBeNull();
    expect([c.nota, c.veredicto, c.metadata.avaliacaoDeQualidade.estado]).toEqual(['C', 'REVISÕES MAIORES', 'disponivel']);
    for (const t of ['CRÍTIC', 'CRITIC', 'Status:', 'EXCLUIR', 'Taxa de Validade', 'overallScore']) {
      expect({ t, noContexto: modelo.mensagens.includes(t) }).toEqual({ t, noContexto: false });
    }
    // CONTROLE de não-vacuidade: o contexto traz, sim, o CR por matriz do bloco
    expect(modelo.mensagens).toContain('CR por matriz (recalculado dos julgamentos)');
  });

  test('CR alto (acima de 0,10 nas seis) NÃO bloqueia: consistência ruim é dado, e o portão não é critério de exclusão', async () => {
    const alto = () => blocoRecalculado({ BOCR: 0.5, MAGNITUDE: 1.09, 'SUB-B': 0.4, 'SUB-O': 0.3, 'SUB-C': 0.6, 'SUB-R': 0.5 });
    const c = await executar(base({ respondents: painel(4, alto) }), COM_DECISAO);
    expect(c.notaSuspensa).toBeNull();
    expect(c.nota).toBe('C');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------
// BLOQUEIOS: dado ausente, incompleto, inválido, duplicado, em formato desconhecido e contraditório
// ---------------------------------------------------------------------------------------------------------------------------
type Caso = { rotulo: string; payload: () => any; causa: 'disponibilidade' | 'contradicao'; estado: 'ausente' | 'incompleta' | 'disponivel'; motivoContem: string };

const CASOS: Caso[] = [
  // ----- ausente
  { rotulo: '(a) sem `qualityAnalysis`', payload: () => base(undefined), causa: 'disponibilidade', estado: 'ausente', motivoContem: 'não traz avaliação por respondente' },
  { rotulo: '(b) `qualityAnalysis` sem a lista de respondentes', payload: () => base({}), causa: 'disponibilidade', estado: 'ausente', motivoContem: 'não traz avaliação por respondente' },
  { rotulo: '(c) lista de respondentes VAZIA', payload: () => base({ respondents: [] }), causa: 'disponibilidade', estado: 'ausente', motivoContem: 'não traz avaliação por respondente' },
  // ----- incompleto
  {
    rotulo: '(d) UM respondente sem o bloco, entre quatro',
    payload: () => base({ respondents: [...painel(3), { respondentId: 'r4', id: 'r4', name: 'R r4' }] }),
    causa: 'disponibilidade', estado: 'incompleta', motivoContem: 'Medido: 3 de 4 respondentes com CR',
  },
  ...(['ausentes', 'incompletos', 'invalidos', 'duplicados', 'mistos', 'nao_calculavel'] as const).map((cond): Caso => ({
    rotulo: `(e) UM respondente com o bloco INDISPONÍVEL, condição «${cond}»`,
    payload: () => base({ respondents: [...painel(3), item('r4', blocoIndisponivel(cond, `ensaio: ${cond}`))] }),
    causa: 'disponibilidade', estado: 'incompleta', motivoContem: 'Medido: 3 de 4 respondentes com CR',
  })),
  {
    rotulo: '(e2) TODOS os respondentes com o bloco indisponível',
    payload: () => base({ respondents: painel(4, () => blocoIndisponivel('ausentes')) }),
    causa: 'disponibilidade', estado: 'incompleta', motivoContem: 'Medido: 0 de 4 respondentes com CR',
  },
  // ----- formato não reconhecido
  {
    rotulo: '(f1) UM bloco com esquema desconhecido',
    payload: () => base({ respondents: [...painel(3), item('r4', { ...blocoDoMaximo(0.05), esquema: 'outro-v9' })] }),
    causa: 'disponibilidade', estado: 'incompleta', motivoContem: 'Medido: 3 de 4 respondentes com CR',
  },
  {
    rotulo: '(f2) UM bloco «recalculado» que deixa a matriz BOCR sem valor',
    payload: () => {
      const b: any = blocoDoMaximo(0.05);
      b.crPorMatriz.BOCR = null;
      return base({ respondents: [...painel(3), item('r4', b)] });
    },
    causa: 'disponibilidade', estado: 'incompleta', motivoContem: 'Medido: 3 de 4 respondentes com CR',
  },
  // ----- cache legado FAVORÁVEL, sem o bloco recalculado: o cache não vale como medição
  {
    rotulo: '(h) cache legado favorável em TODOS (cr, status, byStatus, overallStats, summary), SEM o bloco recalculado',
    payload: () =>
      base({
        respondents: Array.from({ length: 4 }, (_, i) => ({ respondentId: `r${i + 1}`, id: `r${i + 1}`, name: `R r${i + 1}`, cr: 0.02, status: 'CONFIÁVEL', metrics: { avgCR: 0.02 } })),
        statistics: { byStatus: { 'CONFIÁVEL': 4 }, total: 4, avgCR: 0.02 },
        summary: { total: 4, ok: 4, suspicious: 0, critical: 0 },
      }),
    causa: 'disponibilidade', estado: 'incompleta', motivoContem: 'Medido: 0 de 4 respondentes com CR',
  },
  {
    rotulo: '(i) declarada «disponível» pelo cliente, mas sem o bloco em um respondente: a declaração é CONFERIDA',
    payload: () => ({
      ...base({ respondents: [...painel(3), { respondentId: 'r4', id: 'r4', name: 'R r4', cr: 0.02 }] }),
      avaliacaoDeQualidade: { estado: 'disponivel', motivo: null, fonte: 'declarada pelo cliente' },
    }),
    causa: 'disponibilidade', estado: 'incompleta', motivoContem: 'não traz CR por matriz recalculado dos julgamentos para todos os respondentes enviados',
  },
  {
    rotulo: '(i2) declarada «disponível» pelo cliente, SEM lista de respondentes',
    payload: () => ({ ...base(undefined), avaliacaoDeQualidade: { estado: 'disponivel', motivo: null, fonte: 'declarada pelo cliente' } }),
    causa: 'disponibilidade', estado: 'incompleta', motivoContem: 'não traz CR por matriz recalculado dos julgamentos para todos os respondentes enviados',
  },
  {
    rotulo: '(i3) declarada «ausente» pelo cliente, mesmo com o bloco em todos: a declaração de ausência vale',
    payload: () => ({
      ...base({ respondents: painel(4) }),
      avaliacaoDeQualidade: { estado: 'ausente', motivo: null, fonte: 'declarada pelo cliente' },
    }),
    causa: 'disponibilidade', estado: 'ausente', motivoContem: 'não traz avaliação por respondente',
  },
  // ----- contraditório: o resumo declarado do bloco não confere com as suas seis matrizes (V6)
  ...([
    ['a média adulterada', (b: any) => ({ ...b, media: 0.9 })],
    ['o máximo adulterado', (b: any) => ({ ...b, maximo: 0.4 })],
    ['a matriz governante adulterada', (b: any) => ({ ...b, matrizGovernante: 'SUB-R' })],
    ['a média ausente', (b: any) => ({ ...b, media: undefined })],
  ] as Array<[string, (b: any) => any]>).map(([nome, adulterar]): Caso => ({
    rotulo: `(g) UM bloco contraditório: ${nome}`,
    payload: () => base({ respondents: [...painel(3), item('r4', adulterar(blocoComMaximo(0.05)))] }),
    causa: 'contradicao', estado: 'disponivel', motivoContem: '',
  })),
];

describe('bloqueios: a classificação fica SUSPENSA, o texto do modelo NÃO restabelece nota nem veredicto, e o motivo é dito', () => {
  test('a tabela tem os casos da predição P-GR-1: ausente 3, incompleto 1+6+1, formato 2, cache 1, declarada 3, contraditório 4', () => {
    const por = (p: (c: Caso) => boolean) => CASOS.filter(p).length;
    expect(CASOS).toHaveLength(21);
    expect([por((c) => c.rotulo.startsWith('(a')) + por((c) => c.rotulo.startsWith('(b')) + por((c) => c.rotulo.startsWith('(c')), por((c) => c.rotulo.startsWith('(d')), por((c) => c.rotulo.startsWith('(e')), por((c) => c.rotulo.startsWith('(f')), por((c) => c.rotulo.startsWith('(h')), por((c) => c.rotulo.startsWith('(i')), por((c) => c.rotulo.startsWith('(g'))]).toEqual([3, 1, 7, 2, 1, 3, 4]);
  });

  test.each(CASOS.map((c) => [c.rotulo, c] as [string, Caso]))('%s', async (_rotulo, caso) => {
    const c = await executar(caso.payload(), COM_DECISAO);
    // o texto do modelo TEM decisão; com o portão fechado, ela NÃO vira nota
    expect([c.nota, c.veredicto]).toEqual([null, null]);
    expect(c.metadata.estadoDaExtracao).toBe('nao_executada_por_suspensao');
    expect(c.notaSuspensa).not.toBeNull();
    expect(c.notaSuspensa.suspensa).toBe(true);
    expect(c.notaSuspensa.causa).toBe(caso.causa);
    expect(typeof c.notaSuspensa.motivo).toBe('string');
    expect(c.notaSuspensa.motivo.length).toBeGreaterThan(20);
    if (caso.motivoContem) expect(c.notaSuspensa.motivo).toContain(caso.motivoContem);
    expect(c.metadata.avaliacaoDeQualidade.estado).toBe(caso.estado);
    // o rótulo da tela é o da CAUSA: contradição não se apresenta como «qualidade não avaliada»
    expect(c.notaSuspensa.rotulo).toContain(caso.causa === 'contradicao' ? 'contradição' : 'qualidade individual não avaliada');
  });

  test('a mesma tabela com texto SEM decisão: também suspensa, e a extração NÃO corre (estado «nao_executada_por_suspensao», sem aviso de padrão)', async () => {
    for (const caso of CASOS) {
      const c = await executar(caso.payload(), SEM_DECISAO);
      expect({ r: caso.rotulo, s: c.notaSuspensa?.suspensa, e: c.metadata.estadoDaExtracao, m: c.mensagemDaExtracao }).toEqual({
        r: caso.rotulo, s: true, e: 'nao_executada_por_suspensao', m: null,
      });
    }
  });
});
