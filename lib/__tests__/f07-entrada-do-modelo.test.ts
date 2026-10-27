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
 * ⚠ **O QUE É REAL E O QUE É ESPELHO.** (Ajuste 1: o ESPELHO deixou de existir.)
 *   - REAL: a rota de cálculo; a montagem do pedido (`montarPedidoDoParecer`, em
 *     `lib/ai-reviewer/montagem-do-pedido.ts`, a função pura para onde o bloco "Preparar payload" de
 *     `runAiReview` foi movido, e que a tela chama); `prepararVinculoDaTela` e
 *     `classificarAvaliacaoDaTela`; o CR por matriz de cada respondente, calculado pelo motor
 *     (`consistenciaIndividualDeJulgamentos`) sobre os julgamentos carregados; o handler de
 *     `/api/ai-reviewer`, que monta o contexto.
 *   - ÂNCORA: a TELA só chama a montagem e envia o corpo. As duas linhas dela de que o ensaio
 *     depende têm âncora de texto (mais abaixo). ⚠ É ancoragem por LEITURA da tela, que é
 *     `'use client'` e nenhum teste executa.
 *   - FORA DO ESCOPO: a demografia, que vem das respostas e não do documento de cálculo.
 *
 * ⚠ **AJUSTE 1 (A.12 item (c)): o que mudou de propósito em relação à referência.** A referência
 * foi capturada com a qualidade individual do formato ANTERIOR (categorias de pessoa a partir do
 * `cr` em cache). O pedido ATUAL leva, por respondente, o CR por matriz recalculado dos julgamentos,
 * e o contexto muda por isso. Por isso:
 *   - o `system` continua com o MESMO SHA-256 da referência (o prompt de sistema não foi tocado);
 *   - o payload é igual ao da referência em TODOS os campos exceto os de qualidade
 *     (`qualityAnalysis`, e `avaliacaoDeQualidade` quando o seu texto declara a fonte), que são
 *     conferidos à parte, e os dois campos do registro da execução que a tela já enviava e o espelho
 *     antigo omitia (`projectId`, `incluirRegistroDaExecucao`);
 *   - o `messages` TEM hash novo, medido nesta execução e com o hash da referência nomeado abaixo.
 *     ⚠ Hash novo prova que mudou, e não que mudou só no que devia: a conferência de que o que
 *     mudou é só a qualidade individual está em `consistencia-individual-pedido.test.ts` e no
 *     registro do Ajuste 1.
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
const MONTAGEM = path.join(RAIZ, 'lib', 'ai-reviewer', 'montagem-do-pedido.ts');
const REFERENCIA = path.join(__dirname, 'fixtures', 'f07-entrada-antes.json');
const CAPTURAR = process.env.F07_CAPTURAR === '1';

jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));
jest.mock('firebase/firestore', () => require('./helpers/firestore-duplo').moduloFirestoreSimulado());

/* eslint-disable @typescript-eslint/no-var-requires */
const { duplo } = require('./helpers/firestore-duplo');
const { POST: CALCULAR } = require('@/app/api/calculate/route');
const { montarPedidoDoParecer } = require('@/lib/ai-reviewer/montagem-do-pedido');
const { consistenciaIndividualDeJulgamentos } = require('@/lib/consistencia-individual');
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

const ANCORAS_DA_MONTAGEM: [string, number][] = [
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
  // ⚠ DUAS ocorrências de cada uma, medidas: o campo do corpo e o retorno da função (`vinculo: vinculoDaExecucao,` e
  //   `avaliacaoDeQualidade,`, que devolvem a avaliação e o vínculo ao log da tela).
  ['avaliacaoDeQualidade,', 2],
  ['vinculoDaExecucao,', 2],
];

// A TELA: chama a montagem real e envia o corpo. Nada mais do bloco antigo mora nela.
const ANCORAS_DA_TELA: [string, number][] = [
  ['montarPedidoDoParecer(', 1],
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
 * A montagem REAL do pedido (Ajuste 1: o espelho antigo foi substituído pela função pura que a tela chama). Entram o
 * documento de cálculo, o projeto e as respostas carregadas; o CR por matriz de cada respondente sai do MOTOR, sobre os
 * julgamentos, e nunca de um `cr` fixo (o espelho antigo punha `cr: 0.05` em todos).
 */
function montarPayloadComoATela(calculation: any, project: any) {
  const carregadas = carregarComoATela();
  const respondentesDaAnalise = carregadas.map((r: any) => ({
    respondentId: r.respondentId,
    consistenciaIndividual: consistenciaIndividualDeJulgamentos(r.judgments, project.alternatives),
  }));
  const pedido = montarPedidoDoParecer({
    calculation,
    project,
    projectId: PROJETO,
    qualityAnalysis: { respondents: respondentesDaAnalise },
    projectResponses: carregadas,
    excludedIds: [],
    demographics: [],
  });
  return { payload: pedido.corpo };
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

  test('âncoras: as linhas da montagem e da tela de que o ensaio depende estão presentes, na contagem medida', () => {
    const montagem = fs.readFileSync(MONTAGEM, 'utf8');
    for (const [literal, n] of ANCORAS_DA_MONTAGEM) {
      expect({ literal, n: ocorrencias(montagem, literal) }).toEqual({ literal, n });
    }
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

  /**
   * ⚠ O que o payload ATUAL tem a mais ou a menos que a referência, e é DECLARADO aqui, campo a campo:
   *   - `projectId` e `incluirRegistroDaExecucao`: a tela já os enviava (registro da execução do Parecer IA) e o espelho antigo
   *     os omitia. Não vêm do Ajuste 1 nem de F07.
   *   - `qualityAnalysis`: o Ajuste 1 troca o objeto da API de qualidade (CR em cache, `status`, `overallScore`, `flags`,
   *     `recommendation`) pelo bloco `consistenciaIndividual`. Conferido no teste seguinte.
   * Todo o resto, `avaliacaoDeQualidade` inclusive, é comparado campo a campo.
   */
  const CAMPOS_FORA_DA_COMPARACAO = ['projectId', 'incluirRegistroDaExecucao', 'qualityAnalysis'];

  test('o payload que a tela monta é igual ao da referência em tudo o que não é a qualidade individual, campo a campo', () => {
    const atual = arredondar(copia(entrada.payload));
    const ref = copia(referencia().payload);
    for (const k of CAMPOS_FORA_DA_COMPARACAO) {
      delete atual[k];
      delete ref[k];
    }
    expect(diferencas(atual, ref)).toEqual([]);
    // a comparação cobre campos de verdade (um laço sobre vazio passaria por vacuidade)
    expect(Object.keys(ref).length).toBeGreaterThanOrEqual(14);
    expect(atual.avaliacaoDeQualidade.estado).toBe('disponivel');
  });

  test('Ajuste 1: a qualidade individual do payload é só identidade e CR por matriz recalculado, para os 12', () => {
    const lista = entrada.payload.qualityAnalysis.respondents;
    expect(Object.keys(entrada.payload.qualityAnalysis)).toEqual(['respondents']);
    expect(lista).toHaveLength(12);
    for (const r of lista) {
      expect(Object.keys(r).sort()).toEqual(['consistenciaIndividual', 'isSimulated', 'respondentId']);
      const b = r.consistenciaIndividual;
      expect(b.fonte).toBe('recalculado_dos_julgamentos');
      expect(b.matrizesComCR).toBe(6);
      expect(Object.keys(b.crPorMatriz)).toEqual(['BOCR', 'MAGNITUDE', 'SUB-B', 'SUB-O', 'SUB-C', 'SUB-R']);
      for (const v of Object.values(b.crPorMatriz)) expect(Number.isFinite(v)).toBe(true);
    }
    // o que a referência levava por respondente e o pedido atual NÃO leva. ⚠ `"cr"` aparece legitimamente em
    // `bocrConsistency` (o CR das matrizes AGREGADAS), então a conferência dos campos por pessoa é sobre `qualityAnalysis`.
    const textoDaQualidade = JSON.stringify(entrada.payload.qualityAnalysis);
    for (const campo of ['"cr"', '"status"', '"overallScore"', '"flags"', '"recommendation"', '"metrics"', '"byStatus"', '"overallStats"', '"individualStats"']) {
      expect({ campo, presente: textoDaQualidade.includes(campo) }).toEqual({ campo, presente: false });
    }
    // e os agregados por categoria não viajam em canal nenhum do payload
    const textoTodo = JSON.stringify(entrada.payload);
    for (const campo of ['"byStatus"', '"overallStats"', '"individualStats"', '"overallScore"', '"recommendation"']) {
      expect({ campo, presente: textoTodo.includes(campo) }).toEqual({ campo, presente: false });
    }
  });

  test('NENHUM campo de F07 chega ao payload', () => {
    const texto = JSON.stringify(entrada.payload);
    for (const campo of ['requestId', 'engineVersion', 'codeRevision', 'projectUpdatedAt', 'paramsDigest']) {
      expect(texto).not.toContain(`"${campo}"`);
    }
  });

  /**
   * ⚠ HASH NOVO, MEDIDO NESTA EXECUÇÃO (Ajuste 1). O `messages` da referência (`3f2b6380…`, capturado em `317767a`) levava a
   * qualidade individual do formato anterior; o atual leva o CR por matriz recalculado. A constante abaixo é o que a rota
   * produz agora para o caso fixo, e vale como «convenção de atualização por medição» (o valor sai da execução, não de
   * predição). ⚠ Ela prova que o contexto é ESTE e que é determinístico; não prova que o que mudou é só a qualidade.
   */
  const MESSAGES_APOS_O_AJUSTE_1 = { sha256: 'bfd0ab36e8664ec6fe8f68a183c8b8107eccd74e40d9f47ca476bc313b65cb03', bytes: 80678 };

  test('o system é o da referência (prompt de sistema intocado) e o messages é o medido após o Ajuste 1, distinto da referência', () => {
    const ref = referencia();
    // o prompt de sistema NÃO mudou: mesmo SHA-256 e mesmos bytes
    expect(sha256(entrada.system)).toBe(ref.sha256.system);
    expect(Buffer.byteLength(entrada.system, 'utf8')).toBe(ref.bytes.system);
    // o messages MUDOU, e o hash antigo fica nomeado: o teste reprova se alguém restaurar o contexto anterior
    expect(sha256(entrada.messages)).not.toBe(ref.sha256.messages);
    expect({ sha256: sha256(entrada.messages), bytes: Buffer.byteLength(entrada.messages, 'utf8') }).toEqual(MESSAGES_APOS_O_AJUSTE_1);
  });

  test('Ajuste 1: o contexto do caso fixo traz as contagens da referência por matriz, com a população escrita (47 de 72, 12 de 12)', () => {
    // Valores de docs/referencia-cr-individuais.md, conferidos à mão: 12 respondentes x 6 matrizes não triviais = 72, e 47 delas
    // acima de 0.10, em 12 de 12 respondentes. ⚠ São denominadores do PAINEL ENVIADO, e não do painel da pesquisa.
    for (const trecho of [
      'Respondentes enviados: 12. Com CR recalculado dos julgamentos nas 6 matrizes: 12. Sem CR: 0.',
      'Matrizes avaliadas: 72 (12 respondentes × 6 matrizes não triviais: BOCR, MAGNITUDE, SUB-B, SUB-O, SUB-C, SUB-R)',
      'Matrizes com CR > 0.10 (limiar de aceitação por matriz, Saaty, 1977): 47 de 72 (65.3%).',
      'Respondentes com ao menos uma matriz com CR > 0.10: 12 de 12.',
      'o CR descreve uma matriz de julgamentos, e não classifica a pessoa',
      'não é critério de exclusão de participantes',
    ]) {
      expect({ trecho, presente: entrada.messages.includes(trecho) }).toEqual({ trecho, presente: true });
    }
    // e nenhuma categoria de pessoa nem taxa em canal nenhum do contexto. ⚠ Cada texto abaixo EXISTIA no contexto anterior (medido
    // na captura de antes, 1 a 4 ocorrências cada), então a negativa não passa por vacuidade.
    for (const removido of ['Respostas CONFIÁVEIS', 'Respostas SUSPEITAS', 'Respostas CRÍTICAS', 'Taxa de Validade', 'Distribuição de Qualidade dos Respondentes', 'REVISAR']) {
      expect({ removido, presente: entrada.messages.includes(removido) }).toEqual({ removido, presente: false });
    }
  });

  test('o executionId do contexto é o do documento lido, e o bloco do vínculo o transporta', () => {
    expect(entrada.payload.vinculoDaExecucao.executionId).toBe(documento.executionId);
    expect(entrada.messages).toContain(documento.executionId);
  });

  test('CONTROLE NEGATIVO: o contexto mudaria se o executionId mudasse (o ensaio discrimina)', async () => {
    const outro = copia(entrada.payload);
    outro.vinculoDaExecucao.executionId = '11111111-1111-4111-8111-111111111111';
    const { messages } = await contextoEnviadoAoModelo(outro);
    // ⚠ Contra o contexto ATUAL, e não contra a referência: contra a referência o controle passaria por vacuidade (os dois já diferem).
    expect(sha256(messages)).not.toBe(sha256(entrada.messages));
  });
});
