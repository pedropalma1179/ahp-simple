/**
 * lib/__tests__/f07-entrada-do-modelo.test.ts
 *
 * **F07: a ENTRADA DO MODELO do Parecer IA, para um caso fixo, registrada ANTES do código de F07
 * e comparada DEPOIS.**
 *
 * O que este arquivo faz. Roda a rota REAL `app/api/calculate/route.ts` sobre o painel de 2026
 * (`fixtures/panel-2026.json`, 12 respondentes completos), com relógio e `randomUUID` fixos.
 * Pega o documento que a rota grava. Daí monta o que a tela envia a `/api/ai-reviewer` e passa
 * pelo handler REAL de `/api/ai-reviewer`, com os três clientes externos simulados, capturando o
 * `system` e o `messages` que chegariam ao modelo. A referência está em
 * `fixtures/f07-entrada-antes.json`, capturada no HEAD `317767a`, ANTES de qualquer alteração.
 *
 * ⚠ **O QUE É REAL E O QUE É ESPELHO.**
 *   - REAL: a rota de cálculo; `prepararVinculoDaTela` e `classificarAvaliacaoDaTela`; o handler de
 *     `/api/ai-reviewer`, que monta o contexto.
 *   - ESPELHO: a montagem do payload pela tela (`runAiReview`, bloco "Preparar payload", em
 *     `app/decisor/resultados/[projectId]/page.tsx`). A tela é `'use client'` e nenhum teste a
 *     executa. As linhas de que o espelho depende têm âncora de texto (mais abaixo): mudar uma
 *     delas reprova o ensaio e o espelho precisa ser revisto. ⚠ É ancoragem por LEITURA, e não
 *     equivalência com a execução da tela.
 *   - FORA DO ESCOPO: as estatísticas de qualidade (`qualityAnalysis.statistics`, `overallStats`,
 *     `individualStats`) e a demografia, que vêm da API de qualidade e das respostas, e não do
 *     documento de cálculo. F07 não as toca.
 *
 * ⚠ **O QUE NÃO SE DEMONSTRA.** Nenhuma redação é gerada: o cliente do modelo é simulado. Isto
 * verifica a ENTRADA, e não o que o parecer escreveria.
 *
 * ⚠ **Comparação por tolerância, e não por resumo de números.** Os números do documento passam por
 * `Number.prototype.toPrecision(12)` na referência e são comparados com tolerância relativa de
 * 1e-9, porque a comparação de resumos de conteúdo serializado com ponto flutuante já divergiu
 * entre ambientes neste repositório (`docs/dados/a12-rastreabilidade`, causa não determinada). O
 * `system` e o `messages` são comparados por SHA-256 do texto: neles os números já saem
 * formatados pelo código.
 *
 * Para regravar a referência (só em rodada autorizada, com a justificativa no commit):
 *   F07_CAPTURAR=1 npx jest --runInBand lib/__tests__/f07-entrada-do-modelo.test.ts
 */

export {};

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const TELA = path.join(RAIZ, 'app', 'decisor', 'resultados', '[projectId]', 'page.tsx');
const REFERENCIA = path.join(__dirname, 'fixtures', 'f07-entrada-antes.json');
const CAPTURAR = process.env.F07_CAPTURAR === '1';

jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));
jest.mock('firebase/firestore', () => require('./helpers/firestore-duplo').moduloFirestoreSimulado());

/* eslint-disable @typescript-eslint/no-var-requires */
const { duplo } = require('./helpers/firestore-duplo');
const { POST: CALCULAR } = require('@/app/api/calculate/route');
const { prepararVinculoDaTela } = require('@/lib/ai-reviewer/vinculo-execucao');
const { classificarAvaliacaoDaTela } = require('@/lib/ai-reviewer/avaliacao-qualidade');
const fixture = require('./fixtures/panel-2026.json');
/* eslint-enable @typescript-eslint/no-var-requires */

const PROJETO = 'projeto-f07-entrada';
const ID_FIXO = '00000000-0000-4000-8000-0000000f0700';
const INSTANTE_FIXO = new Date('2026-10-11T12:00:00.000Z');
const ALTERNATIVAS = [
  { code: 'A1', name: 'Gêmeo Digital', description: '' },
  { code: 'A2', name: 'IA Temperatura', description: '' },
];

const sha256 = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const copia = (x: any) => JSON.parse(JSON.stringify(x));

// ---------------------------------------------------------------------------
// Âncoras do espelho da tela. ⚠ LEITURA, e não execução.
// ---------------------------------------------------------------------------

const ANCORAS_DA_TELA: [string, number][] = [
  ["projectName: project.name || 'Projeto sem nome'", 1],
  ["projectDescription: project.description || ''", 1],
  ['alternatives: project.alternatives || []', 1],
  ['bocrWeights: calculation.bocrWeights || []', 1],
  ['Benefits: calculation.bocrWeights[0]', 1],
  ['Benefits: calculation.rescalingWeights.sb', 1],
  ['bocrConsistency: calculation.bocrConsistency || { cr: 0, lambda: 0 }', 1],
  ['subWeights: calculation.subWeights || {}', 1],
  ['subConsistency: calculation.subConsistency || {}', 1],
  ['finalScores: calculation.finalScores || []', 1],
  ['responseCount: calculation.responseCount || activeProjectResponses.length || 0', 1],
  ['sensitivityInflections: calculation.sensitivityInflections || {}', 1],
  ['avaliacaoDeQualidade,', 1],
  ['vinculoDaExecucao,', 1],
  ['body: JSON.stringify(finalPayload)', 1],
];

const ocorrencias = (texto: string, agulha: string) => texto.split(agulha).length - 1;

// ---------------------------------------------------------------------------
// O caso fixo
// ---------------------------------------------------------------------------

function montarStore() {
  duplo.reset();
  duplo.semear('projects', PROJETO, { name: 'Painel de 2026', description: 'fixture', alternatives: ALTERNATIVAS });
  (fixture as any).responses.forEach((r: any, i: number) => {
    duplo.semear('respondents', r.id, { projectId: PROJETO });
    duplo.semear('responses', `resp-${i}`, {
      projectId: PROJETO,
      respondentId: r.id,
      judgments: copia(r.judgments),
      completedAt: `2026-05-0${(i % 9) + 1}T12:00:00.000Z`,
    });
  });
}

/**
 * ⚠ Independe de qual versão da rota está instalada: o documento de cálculo está em
 * `calculations/{projectId}` (HEAD `317767a`) ou em `executions/{executionId}` (depois de A1). O
 * teste procura nos dois lugares, e falha se não achar em nenhum.
 */
function documentoDoCalculo(): Record<string, any> {
  const legado = duplo.ler('calculations', PROJETO);
  if (legado) return legado;
  const execucoes = duplo.todos('executions').filter((d: any) => d.data.projectId === PROJETO);
  if (execucoes.length === 1) return execucoes[0].data;
  throw new Error(`documento de cálculo não encontrado: ${execucoes.length} execuções`);
}

/** O que a tela carrega como respostas (modelo ancorado em `vinculo-execucao-calculo.test.ts`). */
function carregarComoATela(): any[] {
  const validos = new Set(duplo.todos('respondents').map((d: any) => d.id));
  const unicas = new Map<string, any>();
  for (const d of duplo.todos('responses')) {
    const x = d.data as any;
    if (x.completedAt == null || x.completedAt === '') continue;
    if (!validos.has(x.respondentId)) continue;
    const ex = unicas.get(x.respondentId);
    if (!ex || x.completedAt > ex.completedAt) unicas.set(x.respondentId, { id: d.id, ...x });
  }
  return Array.from(unicas.values());
}

/**
 * ⚠ ESPELHO do bloco "Preparar payload" de `runAiReview`, restrito ao que vem do documento de
 * cálculo e do vínculo. Cada linha corresponde a uma âncora acima.
 */
function montarPayloadComoATela(calculation: any, project: any) {
  const carregadas = carregarComoATela();
  const respondentesAtivos = carregadas.map((r: any) => ({ respondentId: r.respondentId, cr: 0.05 }));
  const preparo = prepararVinculoDaTela({ calculo: calculation, respondentesAtivos, respostasAtivas: carregadas });
  const respondentesEnviados = preparo.respondentesEnviados;
  const respostasEnviadas = preparo.respostasEnviadas;
  const avaliacaoDeQualidade = classificarAvaliacaoDaTela({ respondentesAvaliados: respondentesEnviados, respostasAtivas: respostasEnviadas });
  const respondentesComCR = respondentesEnviados.map((r: any) => ({ ...r, cr: typeof r.cr === 'number' ? r.cr : 0, isSimulated: false }));
  const payload = {
    avaliacaoDeQualidade,
    vinculoDaExecucao: preparo.vinculo,
    projectName: project.name || 'Projeto sem nome',
    projectDescription: project.description || '',
    alternatives: project.alternatives || [],
    bocrWeights: calculation.bocrWeights || [],
    personalWeights: Array.isArray(calculation.bocrWeights) && calculation.bocrWeights.length >= 4
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
    responseCount: calculation.responseCount || 0,
    sensitivityInflections: calculation.sensitivityInflections || {},
    qualityAnalysis: { respondents: respondentesComCR },
    demographicsSummary: { total: 0, hasData: false },
  };
  // Como `fetch` recebe o corpo: JSON.stringify, que descarta os `undefined`.
  return { payload: JSON.parse(JSON.stringify(payload)), omitirOverall: preparo.omitirOverall };
}

// ---------------------------------------------------------------------------
// O handler REAL de /api/ai-reviewer, com os três clientes externos simulados
// ---------------------------------------------------------------------------

const CHAVES_FALSAS: Record<string, string> = {
  VOYAGE_API_KEY: 'chave-voyage-falsa-do-processo-de-teste',
  UPSTASH_VECTOR_REST_URL: 'https://indice-simulado.exemplo',
  UPSTASH_VECTOR_REST_TOKEN: 'token-upstash-falso-do-processo-de-teste',
  ANTHROPIC_API_KEY: 'chave-anthropic-falsa-do-processo-de-teste',
};
const NOMES_ENV = [...Object.keys(CHAVES_FALSAS), 'USE_RAG_SEMANTIC'];
const envOriginal: Record<string, string | undefined> = {};

async function contextoEnviadoAoModelo(payload: any): Promise<{ system: string; messages: string }> {
  jest.resetModules();
  for (const [n, v] of Object.entries(CHAVES_FALSAS)) process.env[n] = v;
  process.env.USE_RAG_SEMANTIC = 'true';

  const system: string[] = [];
  const messages: Array<Array<{ role: string; content: string }>> = [];

  jest.doMock('voyageai', () => ({
    VoyageAIClient: class {
      async embed() { return { data: [{ embedding: new Array(1024).fill(0.1) }] }; }
    },
  }));
  jest.doMock('@upstash/vector', () => ({ Index: class { async query() { return []; } } }));
  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: class {
      messages = {
        create: async (a: { system: string; messages: Array<{ role: string; content: string }> }) => {
          system.push(a.system);
          messages.push(a.messages);
          return { content: [{ type: 'text', text: 'PARECER DE ENSAIO' }] };
        },
      };
    },
  }));

  const l = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const w = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const e = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    const { POST } = require('@/app/api/ai-reviewer/route');
    const res = await POST({ json: async () => payload } as any);
    expect(res.status ?? 200).toBe(200);
    return { system: system[0] ?? '', messages: JSON.stringify(messages[0] ?? []) };
  } finally {
    l.mockRestore();
    w.mockRestore();
    e.mockRestore();
  }
}

// ---------------------------------------------------------------------------
// Comparação por tolerância
// ---------------------------------------------------------------------------

/** Arredonda números a 12 algarismos significativos, recursivamente. */
function arredondar(x: any): any {
  if (typeof x === 'number') return Number.isFinite(x) ? Number(x.toPrecision(12)) : x;
  if (Array.isArray(x)) return x.map(arredondar);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, arredondar(v)]));
  return x;
}

/** Diferenças entre dois valores, com tolerância relativa nos números. Devolve os caminhos que diferem. */
function diferencas(a: any, b: any, caminho = '$', tol = 1e-9, acc: string[] = []): string[] {
  if (typeof a === 'number' && typeof b === 'number') {
    const escala = Math.max(1, Math.abs(a), Math.abs(b));
    if (!(Math.abs(a - b) <= tol * escala) && !(Number.isNaN(a) && Number.isNaN(b))) acc.push(`${caminho}: ${a} != ${b}`);
    return acc;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) acc.push(`${caminho}: tamanho ${a.length} != ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) diferencas(a[i], b[i], `${caminho}[${i}]`, tol, acc);
    return acc;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of [...chaves].sort()) {
      if (!(k in a)) acc.push(`${caminho}.${k}: ausente no atual`);
      else if (!(k in b)) acc.push(`${caminho}.${k}: ausente na referência`);
      else diferencas(a[k], b[k], `${caminho}.${k}`, tol, acc);
    }
    return acc;
  }
  if (a !== b) acc.push(`${caminho}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  return acc;
}

/**
 * Os campos que F07 ACRESCENTA ao documento de cálculo, no topo. ⚠ A lista é do que F07
 * introduz; a referência (capturada ANTES) não os tem, e a comparação os retira do documento
 * atual antes de comparar. Nada mais é retirado.
 */
const CAMPOS_ACRESCENTADOS_POR_F07 = [
  'requestId',
  'engineVersion',
  'codeRevision',
  'projectUpdatedAt',
  'includedRespondents',
  'judgmentsDigest',
];

// ---------------------------------------------------------------------------

beforeAll(() => {
  for (const n of NOMES_ENV) envOriginal[n] = process.env[n];
});
afterAll(() => {
  for (const n of NOMES_ENV) {
    if (envOriginal[n] === undefined) delete process.env[n];
    else process.env[n] = envOriginal[n];
  }
});

describe('F07: a entrada do modelo, caso fixo do painel de 2026', () => {
  let documento: Record<string, any>;
  let entrada: { payload: any; system: string; messages: string };

  beforeAll(async () => {
    jest.useFakeTimers({
      now: INSTANTE_FIXO,
      doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout',
        'queueMicrotask', 'hrtime', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback'],
    });
    jest.spyOn(crypto, 'randomUUID').mockReturnValue(ID_FIXO);
    montarStore();
    const l = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const w = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const res = await CALCULAR({ json: async () => ({ projectId: PROJETO, requestId: 'req-f07-entrada' }) } as any);
      expect(res.status ?? 200).toBe(200);
    } finally {
      l.mockRestore();
      w.mockRestore();
    }
    documento = documentoDoCalculo();

    const project = duplo.ler('projects', PROJETO);
    const { payload } = montarPayloadComoATela(documento, project);
    const { system, messages } = await contextoEnviadoAoModelo(payload);
    entrada = { payload, system, messages };

    if (CAPTURAR) {
      const atual = {
        _natureza: 'F07: entrada do modelo para o caso fixo, capturada no HEAD 317767a ANTES de qualquer alteração. Ver lib/__tests__/f07-entrada-do-modelo.test.ts.',
        documentoDeCalculo: arredondar(documento),
        payload: arredondar(payload),
        sha256: { system: sha256(system), messages: sha256(messages) },
        bytes: { system: Buffer.byteLength(system, 'utf8'), messages: Buffer.byteLength(messages, 'utf8') },
      };
      fs.writeFileSync(REFERENCIA, JSON.stringify(atual, null, 1) + '\n', 'utf8');
    }
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const referencia = () => JSON.parse(fs.readFileSync(REFERENCIA, 'utf8'));

  test('âncoras: as linhas da tela de que o espelho depende estão presentes, na contagem medida', () => {
    const tela = fs.readFileSync(TELA, 'utf8');
    for (const [literal, n] of ANCORAS_DA_TELA) {
      expect({ literal, n: ocorrencias(tela, literal) }).toEqual({ literal, n });
    }
  });

  test('o documento de cálculo: tudo o que a referência tinha continua igual, e só os campos de F07 foram acrescentados', () => {
    const ref = referencia().documentoDeCalculo;
    const atual = arredondar(copia(documento));
    const acrescentados = Object.keys(atual).filter(k => !(k in ref)).sort();
    // o que a referência tem, o atual TEM, e igual (executionId e calculatedAt incluídos: relógio e UUID fixos)
    for (const k of Object.keys(ref)) expect(k in atual).toBe(true);
    const semAcrescimos = Object.fromEntries(Object.entries(atual).filter(([k]) => k in ref));
    expect(diferencas(semAcrescimos, ref)).toEqual([]);
    // e só F07 acrescenta, e só dentro da lista declarada
    for (const k of acrescentados) expect(CAMPOS_ACRESCENTADOS_POR_F07).toContain(k);
  });

  test('o payload que a tela montaria é igual ao da referência, campo a campo', () => {
    expect(diferencas(arredondar(entrada.payload), referencia().payload)).toEqual([]);
  });

  test('NENHUM campo de F07 chega ao payload', () => {
    const texto = JSON.stringify(entrada.payload);
    for (const campo of ['requestId', 'engineVersion', 'codeRevision', 'projectUpdatedAt', 'paramsDigest']) {
      expect(texto).not.toContain(`"${campo}"`);
    }
  });

  test('o contexto enviado ao modelo é o da referência: mesmo SHA-256 do system e do messages', () => {
    const ref = referencia();
    expect({ system: sha256(entrada.system), messages: sha256(entrada.messages) }).toEqual(ref.sha256);
    expect({ system: Buffer.byteLength(entrada.system, 'utf8'), messages: Buffer.byteLength(entrada.messages, 'utf8') }).toEqual(ref.bytes);
  });

  test('o executionId do contexto é o do documento lido, e o bloco do vínculo o transporta', () => {
    expect(entrada.payload.vinculoDaExecucao.executionId).toBe(documento.executionId);
    expect(entrada.messages).toContain(documento.executionId);
  });

  test('CONTROLE NEGATIVO: o contexto mudaria se o executionId mudasse (o ensaio discrimina)', async () => {
    const outro = copia(entrada.payload);
    outro.vinculoDaExecucao.executionId = '11111111-1111-4111-8111-111111111111';
    const { messages } = await contextoEnviadoAoModelo(outro);
    expect(sha256(messages)).not.toBe(referencia().sha256.messages);
  });
});
