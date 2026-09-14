/**
 * lib/__tests__/rag-transport.test.ts
 *
 * Caracteriza o COMPORTAMENTO HTTP ATUAL do transporte do índice, com o
 * `@upstash/vector` REAL e o transporte HTTP simulado.
 *
 * ⚠ **`@upstash/vector` NÃO é simulado aqui, e é deliberado.** Simulá-lo retiraria
 * exatamente o código em avaliação: a montagem do endereço, o laço de repetição e a
 * ordem `res.json()` antes de `res.ok`. O duplo entra uma camada abaixo, em
 * `globalThis.fetch`, que é o que o cliente chama.
 *
 * ⚠ **Isto é caracterização, não correção.** Cada teste afirma o que o código faz
 * hoje, e o comentário de uma linha diz se aquilo é comportamento correto ou defeito.
 *
 * ⚠ **Ambiente do processo de teste.** `UPSTASH_VECTOR_REST_URL` e
 * `UPSTASH_VECTOR_REST_TOKEN` recebem valores falsos dentro deste processo, porque
 * `getIndex()` em `lib/rag/upstash-client.ts:29` lança sem eles. Nenhuma requisição
 * sai da máquina: o `fetch` está substituído. O ambiente é restaurado ao fim.
 *
 * ⚠ **Nenhuma escrita no índice.** Este arquivo não chama `upsertChunk` nem
 * `deleteAll`, e não haveria índice a escrever: o transporte é simulado.
 *
 * Localizadores do SDK citados abaixo são do build CommonJS `dist/nodejs.js`, que é
 * o que o ts-jest carrega, e cujo comportamento confere com o `dist/chunk-*.mjs`
 * lido na apuração.
 */

const URL_FALSA = 'https://transporte-simulado.exemplo';
const TOKEN_FALSO = 'token-falso-do-processo-de-teste';
const DIMS = 1024;

type Chamada = {
  url: string;
  method: string;
  headerNames: string[];
  authScheme: string | null;
  contentType: string | null;
  bodyBytes: number;
  body: string;
};

let chamadas: Chamada[] = [];
let fetchOriginal: typeof globalThis.fetch;
let envOriginal: { url?: string; token?: string };

/** Vetor de consulta com uma posição marcadora, para distinguir chamadas. */
function vetor(marcador: number): number[] {
  const v = new Array(DIMS).fill(0);
  v[0] = marcador;
  return v;
}

/** Resposta JSON bem formada, no formato que o SDK espera. */
function respostaOk(ids: string[]): Response {
  const result = ids.map((id, i) => ({
    id,
    score: 0.9 - i * 0.01,
    metadata: { article_id: 'artigo_' + id, text: 'texto ' + id },
  }));
  return new Response(JSON.stringify({ result }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Instala o transporte simulado. `responder` recebe a chamada registrada e devolve
 * uma Response, ou lança para simular falha de rede.
 */
function instalarTransporte(responder: (c: Chamada, ordem: number) => Promise<Response>) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === 'string' ? init.body : '';
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const auth = headers.authorization ?? headers.Authorization ?? null;
    const c: Chamada = {
      url: String(input),
      method: init?.method ?? 'GET',
      headerNames: Object.keys(headers).map((h) => h.toLowerCase()).sort(),
      authScheme: auth ? String(auth).split(' ')[0] : null,
      contentType: headers['Content-Type'] ?? headers['content-type'] ?? null,
      bodyBytes: Buffer.byteLength(body, 'utf8'),
      body,
    };
    chamadas.push(c);
    return responder(c, chamadas.length - 1);
  }) as typeof globalThis.fetch;
}

/** Carrega o cliente real depois que o ambiente do processo está posto. */
function carregarCliente() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/lib/rag/upstash-client') as typeof import('@/lib/rag/upstash-client');
}

beforeEach(() => {
  jest.resetModules(); // zera o singleton _index de upstash-client.ts:21
  chamadas = [];
  fetchOriginal = globalThis.fetch;
  envOriginal = {
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  };
  process.env.UPSTASH_VECTOR_REST_URL = URL_FALSA;
  process.env.UPSTASH_VECTOR_REST_TOKEN = TOKEN_FALSO;
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  if (envOriginal.url === undefined) delete process.env.UPSTASH_VECTOR_REST_URL;
  else process.env.UPSTASH_VECTOR_REST_URL = envOriginal.url;
  if (envOriginal.token === undefined) delete process.env.UPSTASH_VECTOR_REST_TOKEN;
  else process.env.UPSTASH_VECTOR_REST_TOKEN = envOriginal.token;
});

describe('transporte HTTP do índice, comportamento atual', () => {
  it('método, caminho, autenticação e corpo enviados: CORRETO, é o contrato do serviço', async () => {
    instalarTransporte(async () => respostaOk(['c1']));
    const { querySimilar } = carregarCliente();

    await querySimilar(vetor(1), 5);

    expect(chamadas).toHaveLength(1);
    const c = chamadas[0];
    expect(c.method).toBe('POST');
    expect(c.url).toBe(URL_FALSA + '/query');
    expect(c.authScheme).toBe('Bearer');
    expect(c.contentType).toBe('application/json');
    expect(c.headerNames).toEqual(
      expect.arrayContaining([
        'authorization',
        'content-type',
        'upstash-telemetry-platform',
        'upstash-telemetry-runtime',
        'upstash-telemetry-sdk',
      ])
    );
    const enviado = JSON.parse(c.body);
    expect(Object.keys(enviado).sort()).toEqual(['includeMetadata', 'topK', 'vector']);
    expect(enviado.vector).toHaveLength(DIMS);
    expect(enviado.topK).toBe(5);
    expect(enviado.includeMetadata).toBe(true);
  });

  it('barra final na URL é removida uma vez: CORRETO, é a normalização do SDK', async () => {
    process.env.UPSTASH_VECTOR_REST_URL = URL_FALSA + '/';
    instalarTransporte(async () => respostaOk(['c1']));
    const { querySimilar } = carregarCliente();

    await querySimilar(vetor(1), 5);

    expect(chamadas[0].url).toBe(URL_FALSA + '/query');
  });

  it('falha de rede seguida de sucesso: repete e entrega o resultado: CORRETO', async () => {
    instalarTransporte(async (_c, ordem) => {
      if (ordem === 0) throw new TypeError('fetch failed');
      return respostaOk(['c1', 'c2']);
    });
    const { querySimilar } = carregarCliente();

    const r = await querySimilar(vetor(1), 5);

    expect(chamadas).toHaveLength(2); // uma tentativa por falha, mais a bem sucedida
    expect(r.map((x) => x.id)).toEqual(['c1', 'c2']);
  });

  it('repete só quando o fetch LANÇA: resposta não exitosa encerra o laço: CORRETO', async () => {
    instalarTransporte(async () =>
      new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    );
    const { querySimilar } = carregarCliente();

    await expect(querySimilar(vetor(1), 5)).rejects.toThrow();
    expect(chamadas).toHaveLength(1); // nenhuma repetição em 404
  });

  it('HTTP não exitoso com JSON válido: UpstashError com a mensagem, SEM o status: DEFEITO', async () => {
    instalarTransporte(async () =>
      new Response(JSON.stringify({ error: 'index not found' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    );
    const { querySimilar } = carregarCliente();

    let capturado: unknown;
    try {
      await querySimilar(vetor(1), 5);
    } catch (e) {
      capturado = e;
    }
    const err = capturado as Error & { status?: unknown; statusCode?: unknown };
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('UpstashError');
    expect(err.message).toContain('index not found');
    // O status HTTP não sobrevive: nenhum campo o carrega.
    expect(err.status).toBeUndefined();
    expect(err.statusCode).toBeUndefined();
    // ⚠ `Object.getOwnPropertyNames`, e não `Object.keys`: o segundo lista só as
    // próprias ENUMERÁVEIS, e daria `['name']` sem excluir campo não enumerável.
    // Medido: `name` é própria enumerável, `message` e `stack` são próprias não
    // enumeráveis, e não há mais nenhuma. É o que permite afirmar que o status
    // não está em campo algum, enumerável ou não.
    const proprias = Object.getOwnPropertyNames(err);
    expect([...proprias].sort()).toEqual(['message', 'name', 'stack']);
    expect(proprias.some((nome) => /status/i.test(nome))).toBe(false);
  });

  it('HTTP não exitoso com CORPO VAZIO: SyntaxError, e o UpstashError nem é construído: DEFEITO', async () => {
    instalarTransporte(async () => new Response(null, { status: 404 }));
    const { querySimilar } = carregarCliente();

    let capturado: unknown;
    try {
      await querySimilar(vetor(1), 5);
    } catch (e) {
      capturado = e;
    }
    const err = capturado as Error;
    // res.json() roda ANTES de res.ok, então o parse falha e o 404 se perde.
    // ⚠ Identificado por `name`, e não por `instanceof`: dentro do ambiente de teste
    // do jest a exceção vem de outro realm, e `instanceof SyntaxError` dá falso ali.
    // Medido em Node puro, fora do jest, o mesmo `instanceof` dá verdadeiro. A
    // classificação por `name` vale nos dois.
    expect(err.name).toBe('SyntaxError');
    expect(err.constructor.name).toBe('SyntaxError');
    expect(err.message).toBe('Unexpected end of JSON input');
  });

  it('HTTP EXITOSO com JSON inválido: mesma exceção do corpo vazio, status diferente: DEFEITO', async () => {
    instalarTransporte(async () =>
      new Response('{"result":', { status: 200, headers: { 'content-type': 'application/json' } })
    );
    const { querySimilar } = carregarCliente();

    let capturado: unknown;
    try {
      await querySimilar(vetor(1), 5);
    } catch (e) {
      capturado = e;
    }
    const err = capturado as Error;
    // 200 e 404 produzem a MESMA frase: a mensagem não identifica o status.
    expect(err.name).toBe('SyntaxError');
    expect(err.message).toBe('Unexpected end of JSON input');
  });

  it('consultas concorrentes: cada resposta volta ao seu chamador: CORRETO', async () => {
    instalarTransporte(async (c) => {
      const enviado = JSON.parse(c.body);
      const marcador = enviado.vector[0] as number;
      // Atraso invertido, para que as respostas retornem fora da ordem de envio.
      await new Promise((r) => setTimeout(r, (6 - marcador) * 5));
      return respostaOk(['chunk-da-consulta-' + marcador]);
    });
    const { querySimilar } = carregarCliente();

    const resultados = await Promise.all([1, 2, 3, 4, 5].map((m) => querySimilar(vetor(m), 5)));

    expect(chamadas).toHaveLength(5);
    expect(resultados.map((r) => r[0].id)).toEqual([
      'chunk-da-consulta-1',
      'chunk-da-consulta-2',
      'chunk-da-consulta-3',
      'chunk-da-consulta-4',
      'chunk-da-consulta-5',
    ]);
  });

  it('as cinco consultas vão para o MESMO caminho: a URL não discrimina: DEFEITO para diagnóstico', async () => {
    instalarTransporte(async () => respostaOk(['c1']));
    const { querySimilar } = carregarCliente();

    await Promise.all([1, 2, 3, 4, 5].map((m) => querySimilar(vetor(m), 5)));

    const caminhos = new Set(chamadas.map((c) => c.url));
    // Um envoltório que só veja a URL não consegue dizer qual consulta foi qual.
    expect(caminhos.size).toBe(1);
    expect([...caminhos][0]).toBe(URL_FALSA + '/query');
  });
});

describe('o que o recuperador entrega, comportamento atual', () => {
  /** O Voyage é simulado; o `@upstash/vector` continua real. */
  function carregarRecuperador(embedFalha: boolean) {
    jest.doMock('voyageai', () => ({
      VoyageAIClient: class {
        async embed() {
          if (embedFalha) throw new Error('voyage indisponivel no ensaio');
          return { data: [{ embedding: new Array(DIMS).fill(0.1) }] };
        }
      },
    }));
    process.env.VOYAGE_API_KEY = 'chave-falsa-do-processo-de-teste';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@/lib/rag/semantic-retrieve') as typeof import('@/lib/rag/semantic-retrieve');
  }

  afterEach(() => {
    delete process.env.VOYAGE_API_KEY;
  });

  it('erro de transporte vira lista vazia, indistinguível de índice sem correspondência: DEFEITO', async () => {
    instalarTransporte(async () => new Response(null, { status: 404 }));
    const { getRAGSemantic } = carregarRecuperador(false);

    const comErro = await getRAGSemantic('consulta de ensaio', 5);

    expect(comErro).toEqual([]); // o chamador não tem como saber que houve erro
  });

  it('índice sem correspondência dá o MESMO resultado do erro: DEFEITO', async () => {
    instalarTransporte(async () =>
      new Response(JSON.stringify({ result: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    const { getRAGSemantic } = carregarRecuperador(false);

    const vazioLegitimo = await getRAGSemantic('consulta de ensaio', 5);

    expect(vazioLegitimo).toEqual([]); // idêntico ao caso de erro acima
  });

  it('falha no embed: a consulta ao índice NÃO chega a ser executada, e isso se perde: DEFEITO', async () => {
    instalarTransporte(async () => respostaOk(['c1']));
    const { getRAGSemantic } = carregarRecuperador(true);

    const r = await getRAGSemantic('consulta de ensaio', 5);

    expect(r).toEqual([]);
    // Nenhuma requisição HTTP saiu: a etapa de consulta é NÃO EXECUTADA, não "falhou".
    expect(chamadas).toHaveLength(0);
  });
});
