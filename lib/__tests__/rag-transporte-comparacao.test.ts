/**
 * lib/__tests__/rag-transporte-comparacao.test.ts
 *
 * Compara o transporte de REFERÊNCIA com o CANDIDATO, nas mesmas entradas e com as
 * mesmas respostas simuladas.
 *
 * ⚠ **A referência não é recalculada com o candidato.** Ela é o `@upstash/vector`
 * REAL construído como `d658e50` o construía, `new Index({ url, token })`, que é o
 * caminho que o `querySimilar` daquele commit usava. O candidato é o `Requester`
 * próprio, exercitado pelo `consultarIndice` desta árvore. **Os dois rodam no mesmo
 * processo, contra o mesmo duplo de `fetch`.**
 *
 * ⚠ **`@upstash/vector` NÃO é simulado**, nos dois lados: simulá-lo retiraria o que
 * está em comparação.
 *
 * ⚠ **O que tem de ser EQUIVALENTE:** requisição, repetições e resultado entregue.
 * **O que muda por decisão:** o diagnóstico, que a referência não tem.
 */

import { Index } from '@upstash/vector';
import type { TentativaHttp } from '@/lib/rag/diagnostico';

const URL_FALSA = 'https://transporte-simulado.exemplo';
const TOKEN_FALSO = 'token-falso-do-processo-de-teste';
const DIMS = 1024;

type Registro = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  keepalive?: boolean;
  cache?: string;
};

type Lado = {
  registros: Registro[];
  atrasos: number[];
  resultado?: unknown;
  erroNome?: string;
  erroMensagem?: string;
  propriasDoErro?: string[];
};

let fetchOriginal: typeof globalThis.fetch;
let envOriginal: { url?: string; token?: string };

function vetor(marcador: number): number[] {
  const v = new Array(DIMS).fill(0);
  v[0] = marcador;
  return v;
}

function respostaOk(ids: string[]): Response {
  return new Response(
    JSON.stringify({
      result: ids.map((id, i) => ({
        id,
        score: 0.9 - i * 0.01,
        metadata: { article_id: 'artigo_' + id, text: 'texto ' + id },
      })),
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );
}

/** Roda um dos dois lados, capturando requisição, intervalos e desfecho. */
async function rodar(
  lado: 'referencia' | 'candidato',
  responder: (ordem: number) => Promise<Response>,
  marcador = 1,
  comTemporizadorFalso = false
): Promise<Lado> {
  const registros: Registro[] = [];
  const atrasos: number[] = [];

  globalThis.fetch = (async (entrada: RequestInfo | URL, init?: RequestInit) => {
    registros.push({
      url: String(entrada),
      method: init?.method ?? 'GET',
      headers: { ...((init?.headers ?? {}) as Record<string, string>) },
      body: typeof init?.body === 'string' ? init.body : '',
      keepalive: init?.keepalive,
      cache: init?.cache,
    });
    return responder(registros.length - 1);
  }) as typeof globalThis.fetch;

  let espiao: jest.SpyInstance | null = null;
  if (comTemporizadorFalso) {
    jest.useFakeTimers();
    const fakeSetTimeout = globalThis.setTimeout;
    // ⚠ Espião do jest, e não reatribuição do global: o `mockRestore` devolve o
    // `setTimeout` original, e reatribuir à mão já apagou o global numa tentativa.
    espiao = jest
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation(((fn: (...a: unknown[]) => void, ms?: number, ...resto: unknown[]) => {
        if (typeof ms === 'number') atrasos.push(ms);
        return (fakeSetTimeout as unknown as (...a: unknown[]) => unknown)(fn, ms, ...resto);
      }) as unknown as typeof globalThis.setTimeout);
  }

  const saida: Lado = { registros, atrasos };
  try {
    const promessa =
      lado === 'referencia'
        ? // Construção de `d658e50`: SDK com url e token, sem Requester próprio.
          new Index({ url: URL_FALSA, token: TOKEN_FALSO })
            .query({ vector: vetor(marcador), topK: 5, includeMetadata: true })
            .then((r) =>
              (r as Array<{ id: unknown; score: number; metadata: unknown }>).map((x) => ({
                id: String(x.id),
                score: x.score,
                metadata: x.metadata,
              }))
            )
        : // Candidato: o `consultarIndice` desta árvore, com o Requester próprio.
          (async () => {
            process.env.UPSTASH_VECTOR_REST_URL = URL_FALSA;
            process.env.UPSTASH_VECTOR_REST_TOKEN = TOKEN_FALSO;
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mod = require('@/lib/rag/upstash-client') as typeof import('@/lib/rag/upstash-client');
            const tentativas: TentativaHttp[] = [];
            // ⚠ Atribuído ANTES do await: no caminho de exceção o array é o mesmo,
            // por referência, e atribuir depois o perderia.
            (saida as Lado & { tentativas?: TentativaHttp[] }).tentativas = tentativas;
            const r = await mod.consultarIndice(vetor(marcador), 5, tentativas);
            return r.chunks;
          })();

    // Sem união discriminada: `strict: false` no tsconfig do projeto não estreita
    // por discriminante, e o typecheck reprovava.
    let resultado: unknown;
    let erro: unknown;
    let houveErro = false;
    const capturada = promessa.then(
      (r) => {
        resultado = r as unknown;
      },
      (e) => {
        houveErro = true;
        erro = e as unknown;
      }
    );
    if (comTemporizadorFalso) await jest.runAllTimersAsync();
    await capturada;

    if (houveErro) {
      const err = erro as Error;
      saida.erroNome = err?.name;
      saida.erroMensagem = err?.message;
      saida.propriasDoErro = Object.getOwnPropertyNames(err ?? {}).sort();
    } else {
      saida.resultado = resultado;
    }
  } finally {
    if (comTemporizadorFalso) {
      espiao?.mockRestore();
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  }
  return saida;
}

/** Compara os dois lados nas dimensões que têm de ser equivalentes. */
function equivalentes(ref: Lado, cand: Lado) {
  // Requisição: método, caminho, cabeçalhos aplicáveis e corpo.
  expect(cand.registros).toHaveLength(ref.registros.length);
  ref.registros.forEach((r, i) => {
    const c = cand.registros[i];
    expect(c.url).toBe(r.url);
    expect(c.method).toBe(r.method);
    expect(c.body).toBe(r.body);
    expect(c.keepalive).toBe(r.keepalive);
    expect(c.cache).toBe(r.cache);
    // Cabeçalhos, com o token fictício INTEIRO.
    const normaliza = (h: Record<string, string>) =>
      Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));
    expect(normaliza(c.headers)).toEqual(normaliza(r.headers));
    expect(normaliza(c.headers).authorization).toBe('Bearer ' + TOKEN_FALSO);
  });
  // Resultado, ou desfecho de erro.
  expect(cand.resultado).toEqual(ref.resultado);
  expect(cand.erroNome).toBe(ref.erroNome);
  expect(cand.erroMensagem).toBe(ref.erroMensagem);
  expect(cand.propriasDoErro).toEqual(ref.propriasDoErro);
}

beforeEach(() => {
  jest.resetModules();
  fetchOriginal = globalThis.fetch;
  envOriginal = {
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  };
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  if (envOriginal.url === undefined) delete process.env.UPSTASH_VECTOR_REST_URL;
  else process.env.UPSTASH_VECTOR_REST_URL = envOriginal.url;
  if (envOriginal.token === undefined) delete process.env.UPSTASH_VECTOR_REST_TOKEN;
  else process.env.UPSTASH_VECTOR_REST_TOKEN = envOriginal.token;
});

describe('referência contra candidato, transporte do índice', () => {
  it('sucesso com resultados: requisição e resultado equivalentes', async () => {
    const r = (o: number) => Promise.resolve(respostaOk(['c1', 'c2']));
    equivalentes(await rodar('referencia', r), await rodar('candidato', r));
  });

  it('sucesso vazio: requisição e resultado equivalentes', async () => {
    const r = () =>
      Promise.resolve(
        new Response(JSON.stringify({ result: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
    equivalentes(await rodar('referencia', r), await rodar('candidato', r));
  });

  it('HTTP não exitoso com JSON válido: mesma exceção, sem status em nenhum dos dois', async () => {
    const r = () =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'index not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        })
      );
    const ref = await rodar('referencia', r);
    const cand = await rodar('candidato', r);
    equivalentes(ref, cand);
    expect(cand.erroNome).toBe('UpstashError');
    // ⚠ A exceção continua SEM status, nos dois. O status vive no diagnóstico.
    expect(cand.propriasDoErro).toEqual(['message', 'name', 'stack']);
  });

  it('corpo vazio: mesma exceção, e o candidato PRESERVA o status no diagnóstico', async () => {
    const r = () => Promise.resolve(new Response(null, { status: 404 }));
    const ref = await rodar('referencia', r);
    const cand = await rodar('candidato', r);
    equivalentes(ref, cand);
    expect(cand.erroNome).toBe('SyntaxError');

    const t = (cand as Lado & { tentativas?: TentativaHttp[] }).tentativas ?? [];
    expect(t).toHaveLength(1);
    // ⚠ Onde a referência perde tudo, o candidato guarda status E a falha de
    // parsing, que COEXISTEM: 404 e leitura ou parsing na mesma tentativa.
    expect(t[0].status).toBe(404);
    expect(t[0].falha).toBe('leitura_ou_parsing');
    // Leitura CONCLUIU com corpo vazio, então bytes é 0 e não ausente.
    expect(t[0].bytes).toBe(0);
  });

  it('JSON inválido em 200: mesma exceção, e o status 200 sobrevive no diagnóstico', async () => {
    const r = () =>
      Promise.resolve(
        new Response('{"result":', { status: 200, headers: { 'content-type': 'application/json' } })
      );
    const ref = await rodar('referencia', r);
    const cand = await rodar('candidato', r);
    equivalentes(ref, cand);

    const t = (cand as Lado & { tentativas?: TentativaHttp[] }).tentativas ?? [];
    expect(t[0].status).toBe(200);
    expect(t[0].falha).toBe('leitura_ou_parsing');
    expect(t[0].bytes).toBe(10); // bytes LIDOS, medidos, não comprimento de string
  });

  it('falha SEM resposta: mesma exceção, e NENHUM status inventado', async () => {
    const r = () => Promise.reject(new TypeError('fetch failed'));
    const ref = await rodar('referencia', r, 1, true);
    const cand = await rodar('candidato', r, 1, true);
    equivalentes(ref, cand);
    expect(cand.erroNome).toBe('TypeError');

    const t = (cand as Lado & { tentativas?: TentativaHttp[] }).tentativas ?? [];
    expect(t).toHaveLength(6);
    expect(t.every((x) => x.status === undefined)).toBe(true); // status AUSENTE
    expect(t.every((x) => x.bytes === undefined)).toBe(true); // leitura não concluiu
    expect(t.map((x) => x.numero)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('esgotamento das tentativas: mesma quantidade, sequência e intervalos', async () => {
    const r = () => Promise.reject(new TypeError('fetch failed'));
    const ref = await rodar('referencia', r, 1, true);
    const cand = await rodar('candidato', r, 1, true);
    equivalentes(ref, cand);
    expect(ref.registros).toHaveLength(6);
    expect(cand.atrasos).toEqual(ref.atrasos);
    expect(cand.atrasos).toHaveLength(5);
    cand.atrasos.forEach((ms, i) => expect(ms).toBeCloseTo(Math.exp(i) * 50, 6));
  });

  it('falha seguida de sucesso: mesma sequência e mesmo resultado', async () => {
    const r = (ordem: number) =>
      ordem === 0 ? Promise.reject(new TypeError('fetch failed')) : Promise.resolve(respostaOk(['c1']));
    const ref = await rodar('referencia', r, 1, true);
    const cand = await rodar('candidato', r, 1, true);
    equivalentes(ref, cand);
    expect(cand.registros).toHaveLength(2);
    expect(cand.atrasos).toEqual(ref.atrasos);

    const t = (cand as Lado & { tentativas?: TentativaHttp[] }).tentativas ?? [];
    expect(t).toHaveLength(2);
    expect(t[0]).toEqual({ numero: 1, falha: 'transporte' }); // sem status
    expect(t[1].numero).toBe(2);
    expect(t[1].status).toBe(200);
  });

  it('falha de LEITURA depois da resposta: status preservado e bytes AUSENTE', async () => {
    // Corpo que rejeita na leitura, e não no parsing. Só o candidato distingue.
    const corpoQueFalha = new ReadableStream({
      start(controller) {
        controller.error(new Error('falha de leitura no ensaio'));
      },
    });
    const r = () =>
      Promise.resolve(
        new Response(corpoQueFalha, { status: 502, headers: { 'content-type': 'application/json' } })
      );
    const cand = await rodar('candidato', r);

    const t = (cand as Lado & { tentativas?: TentativaHttp[] }).tentativas ?? [];
    expect(t).toHaveLength(1);
    expect(t[0].status).toBe(502); // status capturado ANTES da leitura
    expect(t[0].falha).toBe('leitura_ou_parsing');
    expect(t[0].bytes).toBeUndefined(); // leitura NÃO concluiu
  });

  it('consultas concorrentes com desfechos diferentes: cada diagnóstico na sua consulta', async () => {
    process.env.UPSTASH_VECTOR_REST_URL = URL_FALSA;
    process.env.UPSTASH_VECTOR_REST_TOKEN = TOKEN_FALSO;
    const falhasPorMarcador: Record<number, number> = { 1: 0, 2: 1, 3: 0, 4: 2, 5: 0 };
    const vistas: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    globalThis.fetch = (async (_e: RequestInfo | URL, init?: RequestInit) => {
      const corpo = JSON.parse(String(init?.body));
      const m = corpo.vector[0] as number;
      vistas[m] += 1;
      if (vistas[m] <= falhasPorMarcador[m]) throw new TypeError('fetch failed');
      await new Promise((r) => setTimeout(r, (6 - m) * 3));
      if (m === 3) {
        return new Response(JSON.stringify({ result: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return respostaOk(['chunk-da-consulta-' + m]);
    }) as typeof globalThis.fetch;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@/lib/rag/upstash-client') as typeof import('@/lib/rag/upstash-client');
    const diags = [1, 2, 3, 4, 5].map(() => [] as TentativaHttp[]);
    const saidas = await Promise.all(
      [1, 2, 3, 4, 5].map((m, i) => mod.consultarIndice(vetor(m), 5, diags[i]))
    );

    // Resultado na consulta certa.
    expect(saidas.map((s) => s.chunks[0]?.id ?? null)).toEqual([
      'chunk-da-consulta-1',
      'chunk-da-consulta-2',
      null,
      'chunk-da-consulta-4',
      'chunk-da-consulta-5',
    ]);
    // Tentativas na consulta certa: 1, 2, 1, 3 e 1.
    expect(diags.map((d) => d.length)).toEqual([1, 2, 1, 3, 1]);
    expect(diags[3].map((t) => t.falha)).toEqual(['transporte', 'transporte', undefined]);
    expect(diags[3][2].status).toBe(200);
    expect(diags.every((d) => d.map((t) => t.numero).every((n, i) => n === i + 1))).toBe(true);
  });
});
