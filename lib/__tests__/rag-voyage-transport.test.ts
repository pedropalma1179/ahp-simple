/**
 * lib/__tests__/rag-voyage-transport.test.ts
 *
 * Caracteriza o COMPORTAMENTO ATUAL do cliente Voyage, com o `voyageai` REAL e o
 * `fetch` injetado.
 *
 * ⚠ **`voyageai` NÃO é simulado aqui, e é deliberado**, pela mesma razão do
 * `@upstash/vector` em `rag-transport.test.ts`: simular o pacote retiraria o código
 * em avaliação, que é o laço de repetição e o tratamento da resposta.
 *
 * ⚠ **A opção `fetch` é afordância do próprio SDK, não parâmetro novo.**
 * Estabelecido por LEITURA, e é o que estes testes transformam em medição:
 * `dist/cjs/BaseClient.d.ts:15` declara `fetch?: typeof fetch`;
 * `dist/cjs/Client.js:92` repassa `fetchFn: this._options?.fetch`; e
 * `dist/cjs/core/fetcher/Fetcher.js:194` o usa com fallback para o global.
 *
 * ⚠ **O cliente é construído como `embed.ts:33` o constrói hoje**, ou seja só com
 * `apiKey`, mais o `fetch` injetado. **Nenhum parâmetro de repetição é alterado**,
 * então vale o padrão: `maxRetries` 2, em `BaseClient.d.ts:13`.
 *
 * ⚠ **Isto é caracterização, não correção.** Cada teste afirma o que o código faz
 * hoje, e o comentário de uma linha diz se aquilo é comportamento correto ou defeito.
 *
 * ⚠ **Nenhuma requisição sai da máquina:** o `fetch` do cliente é o duplo. A chave
 * é fictícia e vive só neste processo.
 */

import { VoyageAIClient } from 'voyageai';

const CHAVE_FALSA = 'chave-falsa-do-processo-de-teste';
const DIMS = 1024;

type ChamadaVoyage = { url: string; method: string; body: string };

let chamadas: ChamadaVoyage[] = [];

/** Corpo de resposta no formato que `embed.ts:59` a 73 espera. */
function corpoOk(dims = DIMS) {
  return { data: [{ embedding: new Array(dims).fill(0.1) }], model: 'voyage-3' };
}

function respostaJson(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Duplo de `fetch`, registrado, para injetar no cliente real. */
function fetchDuplo(responder: (ordem: number) => Promise<Response>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    chamadas.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? init.body : '',
    });
    return responder(chamadas.length - 1);
  }) as typeof fetch;
}

/** Cliente com as MESMAS opções de `embed.ts`, mais o `fetch` injetado. */
function clienteComFetch(responder: (ordem: number) => Promise<Response>) {
  return new VoyageAIClient({ apiKey: CHAVE_FALSA, fetch: fetchDuplo(responder) });
}

beforeEach(() => {
  chamadas = [];
});

describe('cliente Voyage, comportamento atual', () => {
  it('o SDK real HONRA o fetch injetado: leitura virou medição: CORRETO', async () => {
    const cliente = clienteComFetch(async () => respostaJson(corpoOk()));

    const r = await cliente.embed({ input: ['texto de ensaio'], model: 'voyage-3', inputType: 'query' });

    // Se a opção fosse ignorada, nenhuma chamada teria sido registrada aqui.
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].method).toBe('POST');
    expect(r.data?.[0]?.embedding).toHaveLength(DIMS);
  });

  it('o corpo enviado carrega input, model e input_type: CORRETO, é o contrato', async () => {
    const cliente = clienteComFetch(async () => respostaJson(corpoOk()));

    await cliente.embed({ input: ['texto de ensaio'], model: 'voyage-3', inputType: 'query' });

    const enviado = JSON.parse(chamadas[0].body);
    expect(enviado.input).toEqual(['texto de ensaio']);
    expect(enviado.model).toBe('voyage-3');
    expect(enviado.input_type).toBe('query');
  });

  it('status 500: repete até o limite padrão, TRÊS tentativas no total: CORRETO', async () => {
    // maxRetries padrão 2, e o laço faz uma chamada antes de entrar: 1 + 2 = 3.
    jest.useFakeTimers();
    const atrasos: number[] = [];
    const setTimeoutFalso = globalThis.setTimeout;
    (globalThis as unknown as Record<string, unknown>).setTimeout = ((
      fn: (...a: unknown[]) => void,
      ms?: number,
      ...resto: unknown[]
    ) => {
      if (typeof ms === 'number') atrasos.push(ms);
      return (setTimeoutFalso as unknown as (...a: unknown[]) => unknown)(fn, ms, ...resto);
    }) as unknown as typeof globalThis.setTimeout;

    try {
      const cliente = clienteComFetch(async () => respostaJson({ erro: 'servidor' }, 500));

      const capturada = cliente
        .embed({ input: ['t'], model: 'voyage-3', inputType: 'query' })
        .then(() => 'sem erro')
        .catch((e) => e);
      await jest.runAllTimersAsync();
      const desfecho = await capturada;

      expect(chamadas).toHaveLength(3);

      // ⚠ Dois tipos de temporizador, e a primeira asserção que escrevi confundiu
      // os dois. Medido: um temporizador de TEMPO LIMITE por tentativa, de 60000 ms,
      // que é o padrão de `Client.js:89`, `timeoutInSeconds` 60 vezes 1000, armado em
      // `signals.js:8`; e, entre tentativas, o intervalo de repetição.
      const limites = atrasos.filter((ms) => ms === 60_000);
      const intervalos = atrasos.filter((ms) => ms !== 60_000);
      expect(limites).toHaveLength(3); // um por tentativa
      expect(atrasos).toEqual([60_000, intervalos[0], 60_000, intervalos[1], 60_000]);

      // Dois intervalos, `1000 * 2^i` com jitter simétrico de 20 por cento,
      // ou seja de 0,9 a 1,1 vezes o valor nominal.
      expect(intervalos).toHaveLength(2);
      expect(intervalos[0]).toBeGreaterThanOrEqual(900);
      expect(intervalos[0]).toBeLessThanOrEqual(1100);
      expect(intervalos[1]).toBeGreaterThanOrEqual(1800);
      expect(intervalos[1]).toBeLessThanOrEqual(2200);

      // O que chega ao chamador: erro do SDK, e NÃO o corpo da resposta.
      expect(desfecho).not.toBe('sem erro');
      expect((desfecho as Error).message).toEqual(expect.any(String));
    } finally {
      (globalThis as unknown as Record<string, unknown>).setTimeout = setTimeoutFalso;
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('status 401: NÃO repete, porque a repetição é por status e 401 está fora: CORRETO', async () => {
    const cliente = clienteComFetch(async () => respostaJson({ detail: 'nao autorizado' }, 401));

    await cliente
      .embed({ input: ['t'], model: 'voyage-3', inputType: 'query' })
      .then(() => null)
      .catch((e) => e);

    // Só 408, 429 e status maior ou igual a 500 entram no laço de repetição.
    expect(chamadas).toHaveLength(1);
  });

  it('fetch LANÇANDO: NÃO repete, e o temporizador de tempo limite VAZA: DEFEITO do SDK', async () => {
    // ⚠ Contraste medido entre os dois clientes, e ele importa para a comparação:
    // o Upstash repete quando o fetch LANÇA e ignora o status; a Voyage repete por
    // STATUS e não repete quando o fetch lança.
    jest.useFakeTimers();
    try {
      const cliente = clienteComFetch(async () => {
        throw new TypeError('fetch failed');
      });

      const desfecho = await cliente
        .embed({ input: ['t'], model: 'voyage-3', inputType: 'query' })
        .then(() => 'sem erro')
        .catch((e) => e);

      expect(chamadas).toHaveLength(1);
      expect(desfecho).not.toBe('sem erro');

      // ⚠ Achado desta rodada, e ele apareceu porque a suíte passou a demorar um
      // minuto de relógio: `makeRequest.js:35` a 37 só chama `clearTimeout` DEPOIS
      // que o `fetch` resolve, sem `finally`. Com o `fetch` lançando, o temporizador
      // de 60000 ms fica PENDENTE. Aqui ele é falso e some no `clearAllTimers`;
      // em produção, prenderia o processo por um minuto a cada falha de rede.
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('sucesso depois de um 500: duas tentativas e resultado entregue: CORRETO', async () => {
    jest.useFakeTimers();
    try {
      const cliente = clienteComFetch(async (ordem) =>
        ordem === 0 ? respostaJson({ erro: 'servidor' }, 500) : respostaJson(corpoOk())
      );

      const capturada = cliente.embed({ input: ['t'], model: 'voyage-3', inputType: 'query' });
      await jest.runAllTimersAsync();
      const r = await capturada;

      expect(chamadas).toHaveLength(2);
      expect(r.data?.[0]?.embedding).toHaveLength(DIMS);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});

describe('o que embed.ts faz com a resposta, comportamento atual', () => {
  let envOriginal: string | undefined;

  beforeEach(() => {
    jest.resetModules(); // zera o singleton _client de embed.ts:21
    envOriginal = process.env.VOYAGE_API_KEY;
    process.env.VOYAGE_API_KEY = CHAVE_FALSA;
  });

  afterEach(() => {
    // ⚠ Volta ao estado anterior, inclusive quando já estava AUSENTE.
    if (envOriginal === undefined) delete process.env.VOYAGE_API_KEY;
    else process.env.VOYAGE_API_KEY = envOriginal;
  });

  /**
   * `embed.ts:33` não passa `fetch`, então o SDK cai no fallback de
   * `Fetcher.js:194`, que é o `fetch` global. É por ali que o duplo entra, sem
   * simular o pacote e sem alterar `embed.ts`.
   */
  function carregarEmbed(responder: (ordem: number) => Promise<Response>) {
    globalThis.fetch = fetchDuplo(responder) as typeof globalThis.fetch;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@/lib/rag/embed') as typeof import('@/lib/rag/embed');
  }

  let fetchOriginal: typeof globalThis.fetch;
  beforeEach(() => {
    fetchOriginal = globalThis.fetch;
  });
  afterEach(() => {
    globalThis.fetch = fetchOriginal;
  });

  it('o fallback para o fetch global também é honrado: CORRETO', async () => {
    const { embed } = carregarEmbed(async () => respostaJson(corpoOk()));

    const v = await embed('consulta de ensaio', 'query');

    expect(chamadas).toHaveLength(1);
    expect(v).toHaveLength(DIMS);
  });

  it('dimensão diferente de 1024 vira erro explícito do wrapper: CORRETO', async () => {
    const { embed } = carregarEmbed(async () => respostaJson(corpoOk(512)));

    await expect(embed('consulta de ensaio', 'query')).rejects.toThrow(/dimens/i);
  });

  it('resposta sem data vira erro explícito do wrapper: CORRETO', async () => {
    const { embed } = carregarEmbed(async () => respostaJson({ model: 'voyage-3' }));

    await expect(embed('consulta de ensaio', 'query')).rejects.toThrow(/sem campo data/i);
  });
});
