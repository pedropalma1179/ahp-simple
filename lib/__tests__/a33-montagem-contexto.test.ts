/**
 * lib/__tests__/a33-montagem-contexto.test.ts
 *
 * VERIFICAÇÃO DE MONTAGEM do contexto, A.33.
 *
 * ⚠ **Isto verifica MONTAGEM, e NÃO a predição.** O cliente do LLM é simulado, então
 * **nenhuma redação é gerada**, e nada aqui diz o que o parecer escreveria. A
 * predição de A.33 é sobre o texto produzido, e só a etapa 4, com pareceres
 * realmente gerados, pode testá-la. **Não apresente este arquivo como verificação da
 * predição.**
 *
 * O que ele responde é uma pergunta menor e necessária: **o que chega ao modelo**.
 *
 * ⚠ **Nenhuma requisição real e nenhuma escrita no índice:** os três clientes
 * externos são duplos, e as chaves são fictícias.
 */

export {};

const DIMS = 1024;
const CHAVES_FALSAS: Record<string, string> = {
  VOYAGE_API_KEY: 'chave-voyage-falsa-do-processo-de-teste',
  UPSTASH_VECTOR_REST_URL: 'https://indice-simulado.exemplo',
  UPSTASH_VECTOR_REST_TOKEN: 'token-upstash-falso-do-processo-de-teste',
  ANTHROPIC_API_KEY: 'chave-anthropic-falsa-do-processo-de-teste',
};
const NOMES_ENV = [...Object.keys(CHAVES_FALSAS), 'USE_RAG_SEMANTIC'];
let envOriginal: Record<string, string | undefined> = {};

function restaurarEnv(nome: string, anterior: string | undefined) {
  if (anterior === undefined) delete process.env[nome];
  else process.env[nome] = anterior;
}

type Chunk = { id: string; score: number; metadata: Record<string, unknown> };

/**
 * Chunk COM página preenchida, de propósito.
 *
 * ⚠ **O contrato mantém `page`, e é justamente por isso que o ensaio a preenche:**
 * se a formatação voltasse a interpolá-la, este valor apareceria no contexto. Um
 * chunk sem página não distinguiria retirada de ausência.
 */
function chunkComPagina(id: string, artigo: string): Chunk {
  return {
    id,
    score: 0.9,
    metadata: {
      article_id: artigo,
      article_year: 2020,
      article_type: 'paper',
      chunk_type: 'claim',
      chunk_index: 1,
      text: 'texto do ' + id,
      verbatim_quote: 'verbatim do ' + id,
      page: 248,
      locator_type: null,
      locator_id: 'loc-' + id,
      usable_as: null,
    },
  };
}

function payload() {
  const balde = { total: 4, valid: 4, warning: 0, critical: 0, avgCR: 0.03 };
  return {
    projectName: 'Projeto de ensaio A.33',
    alternatives: [
      { code: 'A1', name: 'Alternativa 1' },
      { code: 'A2', name: 'Alternativa 2' },
    ],
    finalScores: [
      { code: 'A1', name: 'Alternativa 1', score: 0.62 },
      { code: 'A2', name: 'Alternativa 2', score: 0.38 },
    ],
    individualStats: { Benefits: balde, Opportunities: balde, Costs: balde, Risks: balde },
    bocrWeights: { Benefits: 0.37, Opportunities: 0.15, Costs: 0.2, Risks: 0.28 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    overallStats: { total: 4, valid: 4, warning: 0, critical: 0 },
  };
}

/** Monta o contexto pelo handler REAL, com os três clientes externos simulados. */
async function montar(porConsulta: Array<Chunk[]>): Promise<{ system: string; messages: string }> {
  jest.resetModules();
  for (const [n, v] of Object.entries(CHAVES_FALSAS)) process.env[n] = v;
  process.env.USE_RAG_SEMANTIC = 'true';

  const system: string[] = [];
  const messages: Array<Array<{ role: string; content: string }>> = [];
  let i = 0;

  jest.doMock('voyageai', () => ({
    VoyageAIClient: class {
      async embed() {
        return { data: [{ embedding: new Array(DIMS).fill(0.1) }] };
      }
    },
  }));
  jest.doMock('@upstash/vector', () => ({
    Index: class {
      async query() {
        const r = porConsulta[i] ?? [];
        i += 1;
        return r;
      }
    },
  }));
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { POST } = require('@/app/api/ai-reviewer/route');
    const req = { json: async () => payload() } as unknown as Parameters<typeof POST>[0];
    await POST(req);
    return { system: system[0] ?? '', messages: JSON.stringify(messages[0] ?? []) };
  } finally {
    l.mockRestore();
    w.mockRestore();
    e.mockRestore();
  }
}

/**
 * Localizador de página na forma ABNT.
 *
 * ⚠ **Conferido à mão antes de virar critério**, que é a regra da seção 3 do
 * `CLAUDE.md` para instrumento novo: antes da retirada, este padrão casava
 * `p. 248` no `system` e no `messages`; depois, zero nos dois. O controle positivo
 * abaixo mantém essa demonstração viva no arquivo.
 */
const PADRAO_PAGINA = /\bp\.\s*\d+/gi;

const cinco = (c: Chunk[]) => [c, c, c, c, c];

beforeAll(() => {
  for (const n of NOMES_ENV) envOriginal[n] = process.env[n];
});
afterAll(() => {
  for (const n of NOMES_ENV) restaurarEnv(n, envOriginal[n]);
});

describe('A.33, montagem do contexto: nenhuma página chega ao modelo', () => {
  it('CONTROLE POSITIVO: o padrão de página casa quando há página no texto', () => {
    const exemplo = 'Saaty (1977, p. 248) propõe o limiar.';
    expect(exemplo.match(PADRAO_PAGINA)).toEqual(['p. 248']);
    // CONTROLE NEGATIVO: a forma nova, sem página, não casa.
    expect('Saaty (1977) propõe o limiar.'.match(PADRAO_PAGINA)).toBeNull();
  });

  it('COM chunks, e os chunks TÊM página: zero páginas no system e nos messages', async () => {
    const { system, messages } = await montar(cinco([chunkComPagina('k1', 'artigo_alfa')]));

    // ⚠ O chunk carrega `page: 248`, então o zero abaixo é retirada e não ausência.
    expect(system.match(PADRAO_PAGINA)).toBeNull();
    expect(messages.match(PADRAO_PAGINA)).toBeNull();
    // CONTROLE: o bloco de chunks realmente foi montado.
    expect(messages).toContain('Evid');
    expect(messages).toContain('artigo_alfa');
  });

  it('SEM chunks: zero páginas no system e nos messages', async () => {
    const { system, messages } = await montar(cinco([]));

    expect(system.match(PADRAO_PAGINA)).toBeNull();
    expect(messages.match(PADRAO_PAGINA)).toBeNull();
    expect(messages).toContain('nenhum chunk sem');
  });

  it('MISTO, três com chunk e duas vazias: zero páginas no system e nos messages', async () => {
    const comPagina = [chunkComPagina('k1', 'artigo_alfa')];
    const { system, messages } = await montar([comPagina, [], comPagina, [], comPagina]);

    expect(system.match(PADRAO_PAGINA)).toBeNull();
    expect(messages.match(PADRAO_PAGINA)).toBeNull();
    expect(messages).toContain('artigo_alfa');
  });
});

describe('A.33, montagem do contexto: nenhuma EXIGÊNCIA de verbatim nas instruções', () => {
  it('o system não pede verbatim, não pede citação direta e não pede página', async () => {
    const { system } = await montar(cinco([]));

    // A palavra sumiu das instruções junto com a regra que a exigia.
    expect(system.toLowerCase()).not.toContain('verbatim');
    expect(system).not.toContain('página é obrigatória');
    expect(system).not.toContain('Página obrigatória');
    // E a regra nova está lá, para que o zero acima não seja o prompt vazio.
    expect(system).toContain('PARÁFRASE');
    expect(system).toContain('paráfrase');
  });

  it('as duas referências normativas erradas saíram', async () => {
    const { system } = await montar(cinco([]));

    // ⚠ Saíram junto com as regras que sustentavam, e NÃO foram substituídas por
    // outro número: a norma não foi consultada nesta sessão, então afirmar outra
    // seção seria trocar um localizador não conferido por outro.
    expect(system).not.toContain('NBR 10520 §5.3');
    expect(system).not.toContain('NBR 10520 §5.1');
    expect(system).not.toContain('§5.3');
    expect(system).not.toContain('§5.1');
  });

  it('REGISTRO, e NÃO é asserção de conformidade: o rótulo Verbatim segue no contexto', async () => {
    const { system, messages } = await montar(cinco([chunkComPagina('k1', 'artigo_alfa')]));

    // ⚠ **Isto documenta uma pendência, e o teste afirma o estado ATUAL.**
    // `formatSemanticChunks` continua rotulando `*Verbatim:* "..."`, e os quatro
    // templates continuam entregando `evidence.quote` como `Fundamento`. **Retirar a
    // exigência das instruções NÃO retira a transcrição do contexto**, e essa
    // combinação é a ameaça registrada à predição de A.33. Alterar isso altera o que
    // o modelo recebe, exige predição própria, e está FORA desta tarefa.
    expect(messages).toContain('*Verbatim:*');
    // A instrução, essa sim, não pede mais verbatim.
    expect(system.toLowerCase()).not.toContain('verbatim');
  });
});
