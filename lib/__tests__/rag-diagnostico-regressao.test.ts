/**
 * lib/__tests__/rag-diagnostico-regressao.test.ts
 *
 * Regressões dos cinco contraexemplos do diagnóstico, reproduzidos sobre `3be55b9`.
 *
 * ⚠ **Cada expectativa aqui FALHAVA antes da correção.** O arquivo existe para que
 * os cinco defeitos não voltem, e para que a diferença entre antes e depois fique
 * verificável, e não afirmada.
 *
 * ⚠ **Nenhuma escrita no índice e nenhuma requisição real.** As chaves são
 * fictícias e o transporte é simulado. **As sentinelas são fictícias**, e existem
 * justamente para que o vazamento apareça se voltar.
 */

import {
  descreverFalha,
  type ClassificacaoFalha,
  type DiagnosticoConsulta,
} from '@/lib/rag/diagnostico';

const DIMS = 1024;
const URL_FALSA = 'https://indice-simulado.exemplo';
const TOKEN_FALSO = 'token-upstash-falso-do-processo-de-teste';

/** Uma sentinela por vetor de vazamento. Nenhuma pode sobreviver na saída. */
const SENTINELAS = {
  token: 'FAKE_SECRET_SENTINEL_TOKEN',
  url: 'https://sentinela-url.exemplo/caminho-secreto',
  objeto: 'FAKE_SECRET_SENTINEL_OBJETO',
  corpo: 'FAKE_SECRET_SENTINEL_CORPO',
  nome: 'FAKE_SECRET_SENTINEL_NOME',
};
const TODAS_AS_SENTINELAS = Object.values(SENTINELAS);

const NOMES_ENV = [
  'VOYAGE_API_KEY',
  'UPSTASH_VECTOR_REST_URL',
  'UPSTASH_VECTOR_REST_TOKEN',
  'UPSTASH_DISABLE_TELEMETRY',
];
let envOriginal: Record<string, string | undefined> = {};
let fetchOriginal: typeof globalThis.fetch;

function restaurarEnv(nome: string, anterior: string | undefined) {
  if (anterior === undefined) delete process.env[nome];
  else process.env[nome] = anterior;
}

function vetor(): number[] {
  const v = new Array(DIMS).fill(0);
  v[0] = 1;
  return v;
}

/** Resposta de embedding que o `embed.ts` aceita. */
function respostaVoyage(status = 200): Response {
  return new Response(JSON.stringify({ data: [{ embedding: new Array(DIMS).fill(0.1) }] }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Instala um `fetch` que decide pela URL qual serviço está sendo chamado. */
function instalarFetch(
  porServico: (servico: 'voyage' | 'upstash', ordem: number) => Promise<Response>
) {
  const contagem = { voyage: 0, upstash: 0 };
  globalThis.fetch = (async (entrada: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(entrada);
    const servico: 'voyage' | 'upstash' = url.startsWith(URL_FALSA) ? 'upstash' : 'voyage';
    const ordem = contagem[servico];
    contagem[servico] += 1;
    return porServico(servico, ordem);
  }) as typeof globalThis.fetch;
  return contagem;
}

function carregarRecuperador() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/lib/rag/semantic-retrieve') as typeof import('@/lib/rag/semantic-retrieve');
}

/**
 * Roda uma consulta com TEMPORIZADOR FALSO.
 *
 * ⚠ **Duas razões, e as duas medidas.** O backoff do Upstash soma cerca de 4,5 s por
 * esgotamento, e são três casos que o esgotam. E o `fetch` da Voyage rejeitando deixa
 * PENDENTE o temporizador de tempo limite de 60 s, defeito do SDK caracterizado em
 * `rag-voyage-transport.test.ts` e **não corrigido neste eixo**: o `clearAllTimers`
 * daqui o recolhe dentro do ensaio, e nada se afirma sobre o efeito fora dele.
 */
async function comTemporizadorFalso<T>(f: () => Promise<T>): Promise<T> {
  jest.useFakeTimers();
  try {
    const p = f();
    await jest.runAllTimersAsync();
    return await p;
  } finally {
    jest.clearAllTimers();
    jest.useRealTimers();
  }
}

/** Todo o texto que sai do diagnóstico e dos avisos, para varrer sentinelas. */
function textoDeSaida(d: DiagnosticoConsulta, avisos: string[]): string {
  return JSON.stringify(d) + '\n' + avisos.join('\n');
}

beforeAll(() => {
  for (const n of NOMES_ENV) envOriginal[n] = process.env[n];
});

afterAll(() => {
  for (const n of NOMES_ENV) restaurarEnv(n, envOriginal[n]);
});

beforeEach(() => {
  jest.resetModules();
  fetchOriginal = globalThis.fetch;
  process.env.VOYAGE_API_KEY = 'chave-voyage-falsa-do-processo-de-teste';
  process.env.UPSTASH_VECTOR_REST_URL = URL_FALSA;
  process.env.UPSTASH_VECTOR_REST_TOKEN = TOKEN_FALSO;
  delete process.env.UPSTASH_DISABLE_TELEMETRY;
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

// ============================================================
// 1. Sanitização que não sanitiza
// ============================================================
describe('1. sanitização por categoria, e não cópia da dependência', () => {
  it('a mensagem é PÚBLICA e fixa por classificação, sem nada da exceção', () => {
    const classificacoes: ClassificacaoFalha[] = [
      'anterior_a_chamada',
      'transporte',
      'http_nao_exitoso',
      'leitura_ou_parsing',
      'posterior_a_resposta_nao_classificada',
      'nao_classificada',
    ];
    for (const c of classificacoes) {
      const d = descreverFalha(c);
      expect(d.classificacao).toBe(c);
      expect(typeof d.mensagem).toBe('string');
      expect(d.mensagem.length).toBeGreaterThan(0);
      // ⚠ Nenhum campo livre vindo da exceção: `nome` deixou de existir.
      expect(Object.keys(d).sort()).toEqual(['classificacao', 'mensagem']);
    }
  });

  it('erro com token e URL na MENSAGEM: nenhuma sentinela sobrevive', async () => {
    const avisos: string[] = [];
    const w = jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
      avisos.push(a.map(String).join(' '));
    });
    try {
      instalarFetch(async (servico) => {
        if (servico === 'voyage') return respostaVoyage();
        throw new TypeError(
          `connect falhou para ${SENTINELAS.url} com Authorization: Bearer ${SENTINELAS.token}`
        );
      });
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const { diagnostico } = await comTemporizadorFalso(() =>
        getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0)
      );

      const saida = textoDeSaida(diagnostico, avisos);
      for (const s of TODAS_AS_SENTINELAS) expect(saida).not.toContain(s);
      expect(diagnostico.erro?.classificacao).toBe('transporte');
    } finally {
      w.mockRestore();
    }
  });

  it('erro de PARSING com trecho do corpo: nenhuma sentinela sobrevive', async () => {
    const avisos: string[] = [];
    const w = jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
      avisos.push(a.map(String).join(' '));
    });
    try {
      instalarFetch(async (servico) => {
        if (servico === 'voyage') return respostaVoyage();
        // `JSON.parse` reproduz o início do corpo na mensagem do SyntaxError.
        return new Response(`<${SENTINELAS.corpo}>`, {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const { diagnostico } = await getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0);

      const saida = textoDeSaida(diagnostico, avisos);
      for (const s of TODAS_AS_SENTINELAS) expect(saida).not.toContain(s);
      expect(diagnostico.erro?.classificacao).toBe('leitura_ou_parsing');
      // O status sobrevive, que é o campo estruturado que interessa.
      expect(diagnostico.tentativasConsulta[0].status).toBe(200);
    } finally {
      w.mockRestore();
    }
  });

  it('valor lançado que NÃO é Error, com campo sensível: nada é serializado', async () => {
    const avisos: string[] = [];
    const w = jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
      avisos.push(a.map(String).join(' '));
    });
    try {
      instalarFetch(async (servico) => {
        if (servico === 'voyage') return respostaVoyage();
        // eslint-disable-next-line no-throw-literal
        throw { credencial: SENTINELAS.objeto, nome: SENTINELAS.nome };
      });
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const { diagnostico } = await comTemporizadorFalso(() =>
        getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0)
      );

      const saida = textoDeSaida(diagnostico, avisos);
      for (const s of TODAS_AS_SENTINELAS) expect(saida).not.toContain(s);
    } finally {
      w.mockRestore();
    }
  });

  it('erro cujo NOME carrega conteúdo sensível: o nome não sai', async () => {
    const avisos: string[] = [];
    const w = jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
      avisos.push(a.map(String).join(' '));
    });
    try {
      instalarFetch(async (servico) => {
        if (servico === 'voyage') return respostaVoyage();
        const e = new Error('mensagem qualquer');
        e.name = `Erro${SENTINELAS.nome}`;
        throw e;
      });
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const { diagnostico } = await comTemporizadorFalso(() =>
        getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0)
      );

      const saida = textoDeSaida(diagnostico, avisos);
      for (const s of TODAS_AS_SENTINELAS) expect(saida).not.toContain(s);
    } finally {
      w.mockRestore();
    }
  });
});

// ============================================================
// 2. Tentativas das duas etapas misturadas
// ============================================================
describe('2. tentativas separadas por etapa', () => {
  it('embedding com 200 e índice SEM token: consulta sem status e com ZERO tentativas', async () => {
    const avisos: string[] = [];
    const w = jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
      avisos.push(a.map(String).join(' '));
    });
    try {
      delete process.env.UPSTASH_VECTOR_REST_TOKEN;
      const contagem = instalarFetch(async () => respostaVoyage());
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const { diagnostico } = await getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0);

      // O 200 é da Voyage, e nenhuma consulta ao índice saiu.
      expect(contagem.voyage).toBe(1);
      expect(contagem.upstash).toBe(0);
      expect(diagnostico.embedding).toBe('concluido');
      expect(diagnostico.etapa).toBe('querySimilar');
      // ⚠ O contraexemplo: antes, o log dizia falha em querySimilar com status 200
      // e uma tentativa, e o 200 era da Voyage.
      expect(diagnostico.tentativasConsulta).toEqual([]);
      expect(diagnostico.tentativasEmbed).toHaveLength(1);
      expect(diagnostico.tentativasEmbed[0].status).toBe(200);
      expect(avisos.join('\n')).not.toContain('status 200');
      expect(avisos.join('\n')).toContain('sem resposta');
    } finally {
      w.mockRestore();
    }
  });

  it('sucesso nas duas etapas: cada tentativa atribuível ao seu serviço', async () => {
    instalarFetch(async (servico) => {
      if (servico === 'voyage') return respostaVoyage();
      return new Response(JSON.stringify({ result: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const { getRAGSemanticDiagnosticado } = carregarRecuperador();
    const { diagnostico } = await getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0);

    expect(diagnostico.tentativasEmbed).toHaveLength(1);
    expect(diagnostico.tentativasConsulta).toHaveLength(1);
    expect(diagnostico.embedding).toBe('concluido');
    expect(diagnostico.consulta).toBe('vazio');
  });
});

// ============================================================
// 3. Ausência de resposta classificada como transporte
// ============================================================
describe('3. três condições distintas, e não duas', () => {
  it('sem VOYAGE_API_KEY: ANTERIOR À CHAMADA, e não transporte', async () => {
    const w = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      delete process.env.VOYAGE_API_KEY;
      const contagem = instalarFetch(async () => respostaVoyage());
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const { diagnostico } = await getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0);

      expect(contagem.voyage).toBe(0); // nada saiu
      expect(diagnostico.tentativasEmbed).toEqual([]);
      // ⚠ O contraexemplo: antes era 'transporte' com zero tentativas.
      expect(diagnostico.erro?.classificacao).toBe('anterior_a_chamada');
    } finally {
      w.mockRestore();
    }
  });

  it('a chamada saiu e não houve resposta: TRANSPORTE observado', async () => {
    const w = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      instalarFetch(async () => {
        throw new TypeError('fetch failed');
      });
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const { diagnostico } = await comTemporizadorFalso(() =>
        getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0)
      );

      expect(diagnostico.tentativasEmbed.length).toBeGreaterThan(0);
      expect(diagnostico.erro?.classificacao).toBe('transporte');
    } finally {
      w.mockRestore();
    }
  });

  it('houve resposta e a falha veio depois: POSTERIOR À RESPOSTA', async () => {
    const w = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      // Resposta 200 da Voyage sem o campo `data`: o wrapper de embed.ts lança
      // DEPOIS da resposta, e o envoltório não sabe classificar o que veio depois.
      instalarFetch(async () =>
        new Response(JSON.stringify({ model: 'voyage-3' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const { diagnostico } = await getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0);

      expect(diagnostico.tentativasEmbed).toHaveLength(1);
      expect(diagnostico.tentativasEmbed[0].status).toBe(200);
      expect(diagnostico.erro?.classificacao).toBe('posterior_a_resposta_nao_classificada');
    } finally {
      w.mockRestore();
    }
  });

  it('resposta na tentativa 1 e falha de rede na 2: classifica a TENTATIVA RELEVANTE', async () => {
    jest.useFakeTimers();
    const w = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      instalarFetch(async (servico, ordem) => {
        if (servico === 'voyage') return respostaVoyage();
        // Tentativa 1 responde 503, que NÃO repete no Upstash. Para forçar a
        // repetição, a primeira rejeita e a segunda também: o histórico da
        // consulta tem status só na do embed.
        if (ordem === 0) {
          return new Response(JSON.stringify({ result: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        throw new TypeError('fetch failed');
      });
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const p = getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0);
      await jest.runAllTimersAsync();
      const { diagnostico } = await p;

      // A consulta teve sucesso na tentativa 1, então não há erro a classificar.
      expect(diagnostico.consulta).toBe('vazio');
      expect(diagnostico.erro).toBeUndefined();
    } finally {
      w.mockRestore();
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('repetição do embed: resposta na 1, rede falha na 2, classificação da 2', async () => {
    jest.useFakeTimers();
    const w = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      instalarFetch(async (servico, ordem) => {
        if (servico !== 'voyage') return respostaVoyage();
        // 503 na primeira faz a Voyage repetir; a segunda rejeita.
        if (ordem === 0) {
          return new Response(JSON.stringify({ erro: 'servidor' }), {
            status: 503,
            headers: { 'content-type': 'application/json' },
          });
        }
        throw new TypeError('fetch failed');
      });
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const p = getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0);
      await jest.runAllTimersAsync();
      const { diagnostico } = await p;

      expect(diagnostico.tentativasEmbed).toHaveLength(2);
      expect(diagnostico.tentativasEmbed[0].status).toBe(503);
      expect(diagnostico.tentativasEmbed[1].status).toBeUndefined();
      // ⚠ O contraexemplo: o `some` olhava QUALQUER resposta do histórico, e
      // classificaria como posterior à resposta. A relevante é a ÚLTIMA.
      expect(diagnostico.erro?.classificacao).toBe('transporte');
    } finally {
      w.mockRestore();
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});

// ============================================================
// 4. `bytes` retirado do contrato
// ============================================================
describe('4. o campo bytes saiu do contrato', () => {
  it('sucesso: nenhuma tentativa tem bytes', async () => {
    instalarFetch(async (servico) => {
      if (servico === 'voyage') return respostaVoyage();
      return new Response(JSON.stringify({ result: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const { getRAGSemanticDiagnosticado } = carregarRecuperador();
    const { diagnostico } = await getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0);

    const todas = [...diagnostico.tentativasEmbed, ...diagnostico.tentativasConsulta];
    expect(todas.length).toBeGreaterThan(0);
    for (const t of todas) expect(Object.keys(t)).not.toContain('bytes');
  });

  it('corpo com byte UTF-8 inválido: sem bytes, e o status sobrevive', async () => {
    const w = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      instalarFetch(async (servico) => {
        if (servico === 'voyage') return respostaVoyage();
        // ⚠ O contraexemplo: UM byte inválido virava TRÊS em `Buffer.byteLength`,
        // porque `res.text()` o substitui pelo caractere de reposição.
        return new Response(new Uint8Array([0xff]), { status: 404 });
      });
      const { getRAGSemanticDiagnosticado } = carregarRecuperador();
      const { diagnostico } = await getRAGSemanticDiagnosticado('consulta de ensaio', 5, 0);

      const t = diagnostico.tentativasConsulta;
      expect(t).toHaveLength(1);
      expect(Object.keys(t[0])).not.toContain('bytes');
      expect(t[0].status).toBe(404); // status continua obrigatório
    } finally {
      w.mockRestore();
    }
  });
});
