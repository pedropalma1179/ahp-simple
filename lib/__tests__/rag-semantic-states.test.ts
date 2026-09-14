/**
 * lib/__tests__/rag-semantic-states.test.ts
 *
 * Caracteriza os ESTADOS da recuperação semântica pelo HANDLER REAL de
 * `app/api/ai-reviewer/route.ts`, com os clientes externos simulados.
 *
 * ⚠ **A simulação entra nos CLIENTES EXTERNOS, nunca em `getRAGSemantic`.**
 * Substituir `getRAGSemantic` por uma lista vazia pularia justamente o tratamento
 * interno das falhas que esta caracterização mede: o `try` único de
 * `semantic-retrieve.ts:44` a 51 continua rodando, e `querySimilar` de
 * `upstash-client.ts:99` também.
 *
 * ⚠ **`USE_RAG_SEMANTIC` é fixado no processo isolado do teste ANTES do `require`**,
 * porque `route.ts:40` faz `process.env.USE_RAG_SEMANTIC === 'true'` na importação,
 * comparação estrita de string. O ambiente é restaurado ao fim, **inclusive quando a
 * variável já estava ausente**.
 *
 * ⚠ **Isto é caracterização, não correção.** Cada teste afirma o que o código faz
 * hoje, e o comentário de uma linha diz se aquilo é comportamento correto ou defeito.
 *
 * ⚠ **Nenhuma escrita no índice, e nenhuma requisição real:** os três clientes
 * externos são duplos, e as chaves são fictícias.
 *
 * **A captura de `system` e `messages` aqui é LINHA DE BASE**, e serve à verificação
 * posterior de preservação do contexto.
 */

// ⚠ Marca o arquivo como MÓDULO. Sem isto o TypeScript o trata como script
// global, e os nomes de topo colidem com os dos outros arquivos de teste.
export {};

const DIMS = 1024;
const CHAVES_FALSAS = {
  VOYAGE_API_KEY: 'chave-voyage-falsa-do-processo-de-teste',
  UPSTASH_VECTOR_REST_URL: 'https://indice-simulado.exemplo',
  UPSTASH_VECTOR_REST_TOKEN: 'token-upstash-falso-do-processo-de-teste',
  ANTHROPIC_API_KEY: 'chave-anthropic-falsa-do-processo-de-teste',
};
const NOMES_ENV = [...Object.keys(CHAVES_FALSAS), 'USE_RAG_SEMANTIC'];

type ChunkSimulado = { id: string; score: number; metadata: Record<string, unknown> };
type Desfecho = ChunkSimulado[] | 'lanca';

type Captura = {
  status: number;
  corpo: Record<string, unknown>;
  semantic: Record<string, unknown>;
  avisos: string[];
  system: string;
  messages: Array<{ role: string; content: string }>;
  consultasAoIndice: number;
  consultasAoEmbed: number;
};

let envOriginal: Record<string, string | undefined> = {};

/** Restaura uma variável ao estado anterior, INCLUSIVE quando estava ausente. */
function restaurarEnv(nome: string, anterior: string | undefined) {
  if (anterior === undefined) delete process.env[nome];
  else process.env[nome] = anterior;
}

function chunk(id: string, artigo: string, score: number): ChunkSimulado {
  return {
    id,
    score,
    metadata: {
      article_id: artigo,
      article_year: 2020,
      article_type: 'paper',
      chunk_type: 'claim',
      chunk_index: 1,
      text: 'texto do ' + id,
      verbatim_quote: 'verbatim do ' + id,
      page: 10,
      locator_type: null,
      locator_id: 'loc-' + id,
      usable_as: null,
    },
  };
}

/** Payload mínimo que o handler aceita. */
function payload() {
  const balde = { total: 4, valid: 4, warning: 0, critical: 0, avgCR: 0.03 };
  return {
    projectName: 'Projeto de ensaio A.30',
    alternatives: [
      { code: 'A1', name: 'Alternativa 1' },
      { code: 'A2', name: 'Alternativa 2' },
    ],
    finalScores: [
      { code: 'A1', name: 'Alternativa 1', score: 0.62 },
      { code: 'A2', name: 'Alternativa 2', score: 0.38 },
    ],
    individualStats: {
      Benefits: balde,
      Opportunities: balde,
      Costs: balde,
      Risks: balde,
    },
    bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    overallStats: { total: 4, valid: 4, warning: 0, critical: 0 },
  };
}

/**
 * Executa o handler real com os clientes externos simulados.
 *
 * @param habilitado valor textual de `USE_RAG_SEMANTIC`, ou `undefined` para ausente
 * @param embedFalha se o cliente Voyage deve lançar
 * @param porConsulta desfecho de cada uma das cinco consultas ao índice
 */
async function executar(
  habilitado: string | undefined,
  embedFalha: boolean,
  porConsulta: Desfecho[]
): Promise<Captura> {
  jest.resetModules();

  for (const [nome, valor] of Object.entries(CHAVES_FALSAS)) process.env[nome] = valor;
  restaurarEnv('USE_RAG_SEMANTIC', habilitado);

  let consultasAoIndice = 0;
  let consultasAoEmbed = 0;
  const system: string[] = [];
  const messages: Array<Array<{ role: string; content: string }>> = [];

  jest.doMock('voyageai', () => ({
    VoyageAIClient: class {
      async embed() {
        consultasAoEmbed += 1;
        if (embedFalha) throw new Error('voyage indisponivel no ensaio');
        return { data: [{ embedding: new Array(DIMS).fill(0.1) }] };
      }
    },
  }));

  jest.doMock('@upstash/vector', () => ({
    Index: class {
      async query() {
        const desfecho = porConsulta[consultasAoIndice];
        consultasAoIndice += 1;
        if (desfecho === 'lanca') throw new Error('indice indisponivel no ensaio');
        return desfecho ?? [];
      }
    },
  }));

  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: class {
      messages = {
        create: async (args: { system: string; messages: Array<{ role: string; content: string }> }) => {
          system.push(args.system);
          messages.push(args.messages);
          return { content: [{ type: 'text', text: 'PARECER DE ENSAIO' }] };
        },
      };
    },
  }));

  const avisos: string[] = [];
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => {
    avisos.push(a.map(String).join(' '));
  });
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { POST } = require('@/app/api/ai-reviewer/route');
    const req = { json: async () => payload() } as unknown as Parameters<typeof POST>[0];
    const res = await POST(req);
    const corpo = (await res.json()) as Record<string, unknown>;
    const metadata = (corpo.metadata ?? {}) as Record<string, unknown>;
    const kb = (metadata.knowledgeBase ?? {}) as Record<string, unknown>;

    return {
      status: res.status,
      corpo,
      semantic: (kb.semantic ?? {}) as Record<string, unknown>,
      avisos,
      system: system[0] ?? '',
      messages: messages[0] ?? [],
      consultasAoIndice,
      consultasAoEmbed,
    };
  } finally {
    warnSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  }
}

/** Resumo criptográfico, para comparar contexto inteiro sem transcrevê-lo. */
function resumo(texto: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('crypto').createHash('sha256').update(texto).digest('hex');
}

/** Quatro chunks do mesmo artigo e um de outro, para o teto de 3 por artigo morder. */
const cincoChunks: ChunkSimulado[] = [
  chunk('k1', 'artigo_alfa', 0.95),
  chunk('k2', 'artigo_alfa', 0.94),
  chunk('k3', 'artigo_alfa', 0.93),
  chunk('k4', 'artigo_alfa', 0.92),
  chunk('k5', 'artigo_beta', 0.91),
];

beforeAll(() => {
  for (const nome of NOMES_ENV) envOriginal[nome] = process.env[nome];
});

afterAll(() => {
  // ⚠ As cinco voltam ao estado anterior, inclusive as que estavam ausentes.
  for (const nome of NOMES_ENV) restaurarEnv(nome, envOriginal[nome]);
});

describe('os quatro estados da recuperação semântica, pelo handler real', () => {
  it('desabilitada: estatísticas vazias e NENHUMA consulta sai: CORRETO', async () => {
    const r = await executar(undefined, false, []);

    expect(r.status).toBe(200);
    expect(r.semantic.enabled).toBe(false);
    expect(r.semantic.queriesRan).toBe(0);
    expect(r.semantic.failedQueries).toBe(0);
    expect(r.consultasAoEmbed).toBe(0);
    expect(r.consultasAoIndice).toBe(0);
    expect(r.avisos).toHaveLength(0);
  });

  it('a flag é comparação estrita de string: "TRUE" NÃO habilita: CORRETO', async () => {
    const r = await executar('TRUE', false, []);

    // `route.ts:40` compara com 'true' minúsculo, então 'TRUE' deixa desabilitado.
    expect(r.semantic.enabled).toBe(false);
    expect(r.consultasAoIndice).toBe(0);
  });

  it('cinco com resultados: contagens e failedQueries em zero: CORRETO', async () => {
    const r = await executar('true', false, Array(5).fill(cincoChunks));

    expect(r.semantic.enabled).toBe(true);
    expect(r.semantic.queriesRan).toBe(5);
    expect(r.consultasAoIndice).toBe(5);
    expect(r.semantic.rawChunks).toBe(25); // cinco consultas por cinco resultados
    expect(r.semantic.uniqueChunks).toBe(5); // as cinco devolvem os mesmos ids
    expect(r.semantic.finalChunks).toBe(4); // teto de 3 por artigo corta o quarto do alfa
    expect(r.semantic.uniqueArticles).toBe(2);
    expect(r.semantic.failedQueries).toBe(0);
    expect(r.avisos).toHaveLength(0);
    // Os chunks chegam ao prompt do modelo, na seção semântica.
    expect(r.messages[0].content).toContain('Evidências Semânticas Recuperadas');
    expect(r.messages[0].content).toContain('artigo_alfa');
  });

  it('cinco vazias SEM erro: contadas como emptyOk, e failedQueries em zero: CORRIGIDO', async () => {
    const r = await executar('true', false, Array(5).fill([]));

    expect(r.semantic.queriesRan).toBe(5);
    // ⚠ EXPECTATIVA ALTERADA pelo contrato novo, e a razão é o que o eixo corrige.
    // Antes: `failedQueries` era 5, porque contava `r.length === 0` e reunia vazio
    // legítimo com erro. Agora: `emptyOk` 5 e `errored` 0, e `failedQueries` deriva
    // de `errored`.
    expect(r.semantic.emptyOk).toBe(5);
    expect(r.semantic.withResults).toBe(0);
    expect(r.semantic.errored).toBe(0);
    expect(r.semantic.failedQueries).toBe(0);
    expect(r.semantic.rawChunks).toBe(0);
    expect(r.avisos).toHaveLength(0); // sem erro, sem aviso
    expect(r.messages[0].content).toContain('nenhum chunk semântico recuperado');
  });

  it('falha de EMBEDDING: consulta ao índice registrada como NÃO EXECUTADA: CORRIGIDO', async () => {
    const r = await executar('true', true, Array(5).fill(cincoChunks));

    expect(r.semantic.errored).toBe(5);
    expect(r.semantic.failedQueries).toBe(5); // derivado de errored
    expect(r.consultasAoEmbed).toBe(5);
    // Zero chamadas ao cliente do índice: `querySimilar` NÃO executou.
    expect(r.consultasAoIndice).toBe(0);
    expect(r.avisos).toHaveLength(5);
    expect(r.avisos[0]).toContain('voyage indisponivel no ensaio');

    // ⚠ O contrato novo registra a diferença, em vez de a perder:
    const d = (r.semantic.queries as Array<Record<string, unknown>>)[0];
    expect(d.etapa).toBe('embed');
    expect(d.embedding).toBe('erro');
    expect(d.consulta).toBe('nao_executado'); // NÃO é 'erro'
    // Nenhuma tentativa fictícia: o duplo da Voyage nem chega ao transporte.
    expect(d.tentativas).toEqual([]);
  });

  it('falha de CONSULTA: DISTINGUÍVEL da falha de embedding pela etapa: CORRIGIDO', async () => {
    const porConsulta = await executar('true', false, Array(5).fill('lanca'));
    const porEmbed = await executar('true', true, Array(5).fill(cincoChunks));

    expect(porConsulta.semantic.errored).toBe(5);
    expect(porConsulta.consultasAoIndice).toBe(5);
    expect(porConsulta.avisos).toHaveLength(5);
    expect(porConsulta.avisos[0]).toContain('indice indisponivel no ensaio');

    // ⚠ As duas falhas tinham contagens IDÊNTICAS antes deste eixo. Agora diferem
    // na etapa e nos dois estados, que é exatamente o que se queria separar.
    const dConsulta = (porConsulta.semantic.queries as Array<Record<string, unknown>>)[0];
    const dEmbed = (porEmbed.semantic.queries as Array<Record<string, unknown>>)[0];
    expect(dConsulta.etapa).toBe('querySimilar');
    expect(dEmbed.etapa).toBe('embed');
    expect(dConsulta.embedding).toBe('concluido');
    expect(dEmbed.embedding).toBe('erro');
    expect(dConsulta.consulta).toBe('erro');
    expect(dEmbed.consulta).toBe('nao_executado');
  });

  it('as quatro condições sem chunks entregam o MESMO prompt: COMPORTAMENTO ATUAL', async () => {
    const porEmbed = await executar('true', true, Array(5).fill(cincoChunks));
    const porConsulta = await executar('true', false, Array(5).fill('lanca'));
    const vazioLegitimo = await executar('true', false, Array(5).fill([]));
    const desabilitada = await executar(undefined, false, []);

    // ⚠ Quatro condições distintas, UM único texto de usuário, byte a byte.
    expect(porConsulta.messages[0].content).toBe(porEmbed.messages[0].content);
    expect(vazioLegitimo.messages[0].content).toBe(porEmbed.messages[0].content);
    expect(desabilitada.messages[0].content).toBe(porEmbed.messages[0].content);
    // E o `system` é o mesmo nas QUATRO, o vazio legítimo inclusive.
    expect(porConsulta.system).toBe(porEmbed.system);
    expect(vazioLegitimo.system).toBe(porEmbed.system);
    expect(desabilitada.system).toBe(porEmbed.system);

    // ⚠ Isto registra COMPORTAMENTO ATUAL. Informar essas condições ao modelo é
    // decisão própria, que não está tomada, e a identidade dos prompts não está
    // classificada aqui como defeito cuja correção esteja decidida.
  });

  it('CONTEXTO preservado: system e messages idênticos aos da referência d658e50', async () => {
    // ⚠ **Estes resumos NÃO foram recalculados com o candidato.** Vieram de uma
    // execução do handler de `d658e50`, em checkout separado, com as MESMAS entradas
    // e as MESMAS respostas simuladas, e estão fixados aqui como referência.
    // Cobrem o `system` e os `messages` COMPLETOS, e não tamanho, título ou
    // contagem de chunks.
    const REFERENCIA: Record<string, { system: string; messages: string }> = {
      comResultados: {
        system: 'b7c391360e8c3b51f3fbcb8464f7ed23db80042d25ceda7bb177277988e67ef3',
        messages: '4e5d45c171ac17e3050df93636623620321db76f6f2485ad11672585f89b8b95',
      },
      vazio: {
        system: 'b7c391360e8c3b51f3fbcb8464f7ed23db80042d25ceda7bb177277988e67ef3',
        messages: 'a3c60c056c3a9f541c22dcde519c1ead964f48a17a3577444595a4bdfe668459',
      },
      erro: {
        system: 'b7c391360e8c3b51f3fbcb8464f7ed23db80042d25ceda7bb177277988e67ef3',
        messages: 'a3c60c056c3a9f541c22dcde519c1ead964f48a17a3577444595a4bdfe668459',
      },
      misto: {
        system: 'b7c391360e8c3b51f3fbcb8464f7ed23db80042d25ceda7bb177277988e67ef3',
        messages: '4e5d45c171ac17e3050df93636623620321db76f6f2485ad11672585f89b8b95',
      },
    };

    const casos: Record<string, Desfecho[]> = {
      comResultados: Array(5).fill(cincoChunks),
      vazio: Array(5).fill([]),
      erro: Array(5).fill('lanca'),
      misto: [cincoChunks, [], 'lanca', [], 'lanca'],
    };

    for (const [nome, desfechos] of Object.entries(casos)) {
      const r = await executar('true', false, desfechos);
      expect(resumo(r.system)).toBe(REFERENCIA[nome].system);
      expect(resumo(JSON.stringify(r.messages))).toBe(REFERENCIA[nome].messages);
    }
  });

  it('execução MISTA: uma categoria só não representa a execução: DEFEITO', async () => {
    const r = await executar('true', false, [cincoChunks, [], 'lanca', [], 'lanca']);

    expect(r.consultasAoIndice).toBe(5);
    // ⚠ EXPECTATIVA ALTERADA pelo contrato novo. Antes: `failedQueries` 4, porque
    // reunia os dois vazios legítimos com os dois erros, e divergia dos dois avisos.
    // Agora as três categorias descrevem a execução mista SEM colapsá-la:
    expect(r.semantic.withResults).toBe(1);
    expect(r.semantic.emptyOk).toBe(2);
    expect(r.semantic.errored).toBe(2);
    expect(r.semantic.failedQueries).toBe(2); // derivado de errored
    // Disjuntas e somando queriesRan.
    expect(
      (r.semantic.withResults as number) + (r.semantic.emptyOk as number) + (r.semantic.errored as number)
    ).toBe(r.semantic.queriesRan);
    // Os avisos agora CONFEREM com `errored`, e não divergem mais.
    expect(r.avisos).toHaveLength(2);
    expect(r.semantic.rawChunks).toBe(5); // só a consulta bem sucedida contribui
    expect(r.semantic.finalChunks).toBe(4); // teto de 3 por artigo corta o quarto do alfa
    // O diagnóstico por consulta permite recompor a execução inteira.
    const porConsulta = r.semantic.queries as Array<Record<string, unknown>>;
    expect(porConsulta.map((d) => d.consulta)).toEqual([
      'com_resultados',
      'vazio',
      'erro',
      'vazio',
      'erro',
    ]);
    expect(Object.keys(r.semantic).sort()).toEqual([
      'contractVersion',
      'emptyOk',
      'enabled',
      'errored',
      'failedQueries',
      'finalChunks',
      'httpAttempts',
      'queries',
      'queriesRan',
      'rawChunks',
      'topScore',
      'uniqueArticles',
      'uniqueChunks',
      'withResults',
    ]);
  });
});
