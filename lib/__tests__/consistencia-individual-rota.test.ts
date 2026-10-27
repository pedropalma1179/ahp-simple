export {};

/**
 * lib/__tests__/consistencia-individual-rota.test.ts
 *
 * **Ajuste 1 (A.12 item (c)): o CR individual, da origem ao SDK.** Percorre a cadeia REAL, sem mock de nenhum elo do nosso código:
 *
 *   julgamentos do painel de 2026 → `POST /api/response-quality` (o tratador real) → `montarPedidoDoParecer` (a montagem real que a tela chama) →
 *   `POST /api/ai-reviewer` (o tratador real) → SDK do provedor (INTERCEPTADO: o duplo captura `system`, `messages` e os parâmetros) → registro da execução.
 *
 * ⚠ **Só o provedor de modelo, o de embeddings e o índice vetorial são duplos.** Chaves falsas, nenhuma chamada de rede, nenhuma geração real: o texto que o
 * duplo devolve é fixo. **Isto é TESTE DE CONTEXTO** (o que o modelo RECEBERIA), e não teste de SAÍDA: nada aqui diz o que o modelo escreveria com este
 * contexto, e a próxima geração real, depois da implantação, é uma observação nova que exige registro novo (`docs/imprecisoes-parecer-ia.md`).
 *
 * ⚠ **Oráculo:** a tabela de `docs/referencia-cr-individuais.md` (`helpers/referencia-cr-individuais.ts`), copiada à mão.
 */

const crypto = require('node:crypto');

import { POST as QUALIDADE } from '@/app/api/response-quality/route';
import { montarPedidoDoParecer } from '@/lib/ai-reviewer/montagem-do-pedido';
import { verificarIntegridadeDoRegistro } from '@/lib/ai-reviewer/registro-da-execucao';
import { REFERENCIA } from './helpers/referencia-cr-individuais';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fixture = require('./fixtures/panel-2026.json');
const ALTERNATIVAS = fixture.alternatives.map((c: string) => ({ code: c, name: c, description: '' }));
const IDS: string[] = fixture.responses.map((r: any) => r.id);
const julgamentosDe = (id: string): any[] => fixture.responses.find((r: any) => r.id === id).judgments;
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;
const p2 = (v: number) => `${v.toFixed(2)}%`;

const CHAVES_FALSAS: Record<string, string> = {
  VOYAGE_API_KEY: 'chave-voyage-falsa-do-processo-de-teste',
  UPSTASH_VECTOR_REST_URL: 'https://indice-simulado.exemplo',
  UPSTASH_VECTOR_REST_TOKEN: 'token-upstash-falso-do-processo-de-teste',
  ANTHROPIC_API_KEY: 'chave-anthropic-falsa-do-processo-de-teste',
};
const NOMES_ENV = [...Object.keys(CHAVES_FALSAS), 'USE_RAG_SEMANTIC', 'VERCEL_GIT_COMMIT_SHA', 'VERCEL_DEPLOYMENT_ID', 'VERCEL_ENV'];
const envOriginal: Record<string, string | undefined> = {};
beforeAll(() => { for (const n of NOMES_ENV) envOriginal[n] = process.env[n]; });
afterAll(() => { for (const n of NOMES_ENV) { if (envOriginal[n] === undefined) delete process.env[n]; else process.env[n] = envOriginal[n]; } });

// ---------------------------------------------------------------------------------------------------------------------------
// A cadeia
// ---------------------------------------------------------------------------------------------------------------------------
const SEM_PADRAO = 'Parecer de ensaio, sem decisão editorial declarada no texto. '.repeat(3);
const HEX = 'b'.repeat(64);
const shaDe = (id: string) => id.padEnd(64, '0').replace(/[^0-9a-f]/g, 'c');

function calculo(ids: string[]): any {
  return {
    executionId: 'exec-rota-0001',
    metadata: {
      judgmentsDigest: { algorithm: 'sha256', serialization: 'a12-julgamentos-v1', panel: HEX, unavailableReason: null },
      includedRespondents: ids.map((id) => ({ respondentId: id, responseDocId: `doc-${id}`, identifierSource: 'respondentId', judgmentsSha256: shaDe(id), judgmentsUnavailableReason: null })),
    },
    bocrWeights: [0.37, 0.15, 0.2, 0.28],
    rescalingWeights: { sb: 0.3, so: 0.2, sc: 0.25, sr: 0.25 },
    bocrConsistency: { cr: 0.0106, lambda: 4.03 },
    subWeights: {},
    subConsistency: {},
    finalScores: [{ code: 'A1', name: 'Alternativa 1', score: 0.62 }, { code: 'A2', name: 'Alternativa 2', score: 0.38 }],
    responseCount: ids.length,
    sensitivityInflections: {},
  };
}

type Resposta = { id: string; respondentId: string; judgments: any; responses?: Record<string, unknown> };
/** As respostas como a tela as carrega. `cache` põe o cache legado FAVORÁVEL (`responses.avgCR` 0,02) em cada uma. */
const respostas = (cache: boolean, ajustar: (r: Resposta) => Resposta = (r) => r): Resposta[] =>
  IDS.map((id) => ajustar({ id, respondentId: id, judgments: julgamentosDe(id), ...(cache ? { responses: { avgCR: 0.02, bocrConsistency: { cr: 0.01 }, magnitudeConsistency: { cr: 0.01 } } } : {}) }));

interface Captura { system: string; messages: string; parametros: any; chamadas: number }

async function executarCadeia(
  rs: Resposta[],
  o: { excluidos?: string[]; incluidosNoDocumento?: string[]; texto?: string } = {}
): Promise<{ captura: Captura; corpo: any; pedido: any; analise: any }> {
  // 1. a API de qualidade REAL
  const resQ: any = await QUALIDADE({ json: async () => JSON.parse(JSON.stringify({ responses: rs, alternatives: ALTERNATIVAS })) } as any);
  const analise = (await resQ.json()).analysis;
  // 2. a montagem REAL do pedido
  const excluidos = o.excluidos ?? [];
  const pedido = montarPedidoDoParecer({
    calculation: calculo(o.incluidosNoDocumento ?? IDS.filter((i) => !excluidos.includes(i))),
    project: { name: 'Painel de 2026', description: 'fixture', alternatives: ALTERNATIVAS },
    projectId: 'proj-rota',
    qualityAnalysis: analise,
    projectResponses: rs,
    excludedIds: excluidos,
    demographics: [],
  });
  // 3. a rota REAL, com o provedor interceptado
  jest.resetModules();
  for (const [n, v] of Object.entries(CHAVES_FALSAS)) process.env[n] = v;
  for (const n of ['USE_RAG_SEMANTIC', 'VERCEL_GIT_COMMIT_SHA', 'VERCEL_DEPLOYMENT_ID', 'VERCEL_ENV']) delete process.env[n];
  const captura: Captura = { system: '', messages: '', parametros: null, chamadas: 0 };
  jest.doMock('voyageai', () => ({ VoyageAIClient: class { async embed() { return { data: [{ embedding: new Array(1024).fill(0.1) }] }; } } }));
  jest.doMock('@upstash/vector', () => ({ Index: class { async query() { return []; } } }));
  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: class {
      messages = {
        create: async (a: any) => {
          captura.chamadas += 1;
          captura.parametros = JSON.parse(JSON.stringify(a));
          captura.system = typeof a.system === 'string' ? a.system : JSON.stringify(a.system ?? '');
          captura.messages = (a.messages ?? []).map((m: any) => m.content).join('\n');
          return {
            id: 'msg_ENSAIO', type: 'message', role: 'assistant', model: 'claude-opus-4-6-ensaio',
            content: [{ type: 'text', text: o.texto ?? SEM_PADRAO }],
            stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
          };
        },
      };
    },
  }));
  const silencios = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
  try {
    const { POST } = require('@/app/api/ai-reviewer/route');
    const res = await POST({ json: async () => JSON.parse(JSON.stringify(pedido.corpo)) } as any);
    const corpo = await res.json();
    expect(res.status ?? 200).toBe(200);
    // ⚠ CONTROLE de captura NÃO VAZIA: o SDK foi chamado UMA vez, com o contexto montado
    expect(captura.chamadas).toBe(1);
    expect(captura.messages).toContain('## Pesos Finais da Hierarquia de Controle');
    return { captura, corpo, pedido, analise };
  } finally {
    silencios.forEach((s) => s.mockRestore());
  }
}

/** A linha do respondente no contexto: `- ID: <id> | Email: <...> | <trecho>`. */
const linhaDe = (messages: string, id: string): string => {
  const l = messages.split('\n').find((x) => x.startsWith(`- ID: ${id} |`));
  expect(l).toBeDefined();
  return l as string;
};
/** O trecho de CR por matriz que a tabela de referência prevê para o respondente. */
const trechoEsperado = (id: string): string => {
  const r = (REFERENCIA as any)[id];
  return (
    `CR por matriz (recalculado dos julgamentos): BOCR ${p2(r.BOCR)} | MAGNITUDE ${p2(r.MAGNITUDE)} | SUB-B ${p2(r['SUB-B'])} | SUB-O ${p2(r['SUB-O'])} | ` +
    `SUB-C ${p2(r['SUB-C'])} | SUB-R ${p2(r['SUB-R'])} | média das 6 matrizes: ${p2(r.medio)} | máximo: ${p2(r.governante)} (matriz governante: ${r.matriz})`
  );
};

// ===========================================================================================================================
describe('o que o SDK recebe: o CR por matriz recalculado dos julgamentos, com a Magnitude, a média e o máximo corretamente nomeados', () => {
  test.each(IDS.map((id) => [id] as [string]))('%s: a linha que chega ao SDK traz as seis matrizes, a média das seis, o máximo e a matriz governante da tabela de referência', async (id) => {
    const { captura } = await executarCadeia(respostas(true));
    expect(linhaDe(captura.messages, id)).toContain(trechoEsperado(id));
  });

  test('a MAGNITUDE chega ao SDK nos 12 respondentes (antes, o transporte não a levava), e R03 é governado por ela: 109.27%', async () => {
    const { captura } = await executarCadeia(respostas(true));
    for (const id of IDS) expect(linhaDe(captura.messages, id)).toContain(` | MAGNITUDE ${p2((REFERENCIA as any)[id].MAGNITUDE)} | `);
    expect(linhaDe(captura.messages, 'R03')).toContain('MAGNITUDE 109.27% |');
    expect(linhaDe(captura.messages, 'R03')).toContain('máximo: 109.27% (matriz governante: MAGNITUDE)');
    expect(ocorrencias(captura.messages, 'CR por matriz (recalculado dos julgamentos):')).toBe(12);
  });

  test('as contagens do painel e a seção por dimensão têm a população escrita: 12 respondentes, 72 matrizes, 47 de 72, 12 de 12', async () => {
    const { captura } = await executarCadeia(respostas(true));
    const m = captura.messages;
    expect(m).toContain('Consistência individual por matriz, sobre os ENVIADOS a você (etapa: envio):');
    expect(m).toContain('- Respondentes enviados: 12. Com CR recalculado dos julgamentos nas 6 matrizes: 12. Sem CR: 0.');
    expect(m).toContain('- Matrizes avaliadas: 72 (12 respondentes × 6 matrizes não triviais: BOCR, MAGNITUDE, SUB-B, SUB-O, SUB-C, SUB-R).');
    expect(m).toContain('- Matrizes com CR > 0.10 (limiar de aceitação por matriz, Saaty, 1977): 47 de 72 (65.3%).');
    expect(m).toContain('- Respondentes com ao menos uma matriz com CR > 0.10: 12 de 12.');
    expect(m).toContain('CR individual por matriz, sobre os 12 respondentes enviados com CR recalculado dos julgamentos (etapa: envio):');
    // média, máximo e CR agregado NÃO se confundem: o texto distingue «média das 6 matrizes» (de UM respondente), «média entre respondentes» (de UMA matriz)
    // e o CR das matrizes AGREGADAS por média geométrica
    expect(m).toContain('«Média das 6 matrizes» e «máximo» são de UM respondente; «média entre respondentes» é a média dos CRs de UMA matriz sobre os respondentes enviados.');
    expect(m).toContain('Nenhuma delas é o CR das matrizes AGREGADAS por média geométrica');
    expect(m).toContain('o CR descreve uma matriz de julgamentos, e não classifica a pessoa');
    expect(m).toContain('não é critério de exclusão de participantes');
    // o CR agregado continua na SUA seção, com o seu nome
    expect(m).toContain('- **CR Global Agregado:** 1.06%');
  });

  test('a avaliação é DISPONÍVEL e a classificação NÃO é suspensa; nota e veredicto só existem se o TEXTO do modelo os declara (aqui, não declara)', async () => {
    const { corpo } = await executarCadeia(respostas(true));
    expect(corpo.notaSuspensa).toBeNull();
    expect(corpo.metadata.avaliacaoDeQualidade.estado).toBe('disponivel');
    expect([corpo.nota, corpo.veredicto]).toEqual([null, null]);
    expect(corpo.metadata.estadoDaExtracao).toBe('nenhum_padrao_reconhecido');
    // e com um texto que declara a decisão, a nota sai DO TEXTO (e nunca de uma pontuação por categoria de pessoa)
    const com = await executarCadeia(respostas(true), { texto: '## 🎯 DECISÃO EDITORIAL\nREVISÕES MAIORES\n\nTexto final de ensaio, sem outros termos de resultado.\n'.padStart(200, 'x') });
    expect([com.corpo.nota, com.corpo.veredicto]).toEqual(['C', 'REVISÕES MAIORES']);
  });
});

describe('o cache legado CONFLITANTE não muda o que o SDK recebe nem os CRs transportados', () => {
  test('o MESMO painel, com e sem cache favorável nas respostas: `system` e `messages` idênticos, byte a byte', async () => {
    const sem = await executarCadeia(respostas(false));
    const com = await executarCadeia(respostas(true));
    expect(com.captura.messages === sem.captura.messages).toBe(true);
    expect(com.captura.system === sem.captura.system).toBe(true);
    expect(com.pedido.corpo.qualityAnalysis).toEqual(sem.pedido.corpo.qualityAnalysis);
    // e o CORPO inteiro que a tela enviaria tem os mesmos bytes (P-CR-3 do registro da predição)
    expect(JSON.stringify(com.pedido.corpo)).toBe(JSON.stringify(sem.pedido.corpo));
    expect(sha(com.captura.messages)).toBe(sha(sem.captura.messages));
    // o cache EXISTE na entrada (a API o conserva à parte), e o valor dele não chega ao SDK como CR
    expect(com.analise.respondents[0].cacheLegado.avgCR).toBe(0.02);
    expect(com.captura.messages).not.toContain('CR: 2.0%');
    expect(com.captura.messages).not.toContain('2.00%');
  });

  test('um cache ALTO, que diria «crítico» onde o recalculado diz outra coisa, também não muda nada (R01: recalculado 11.39% no governante)', async () => {
    const alto = await executarCadeia(respostas(false, (r) => ({ ...r, responses: { avgCR: 0.9, bocrConsistency: { cr: 0.9 } } })));
    const sem = await executarCadeia(respostas(false));
    expect(alto.captura.messages === sem.captura.messages).toBe(true);
    expect(linhaDe(alto.captura.messages, 'R01')).toContain(trechoEsperado('R01'));
  });
});

describe('os rótulos e os scores removidos NÃO reaparecem por outro canal do contexto', () => {
  // Cada um destes textos EXISTIA no contexto de antes do Ajuste 1 (medido na captura de `bcb6bdb`).
  const REMOVIDOS = [
    'Status: CONFIÁVEL',
    'Status: REVISAR',
    'Status: SUSPEITO',
    'Status: CRÍTICO',
    'Respostas CONFIÁVEIS',
    'Respostas para REVISAR',
    'Respostas SUSPEITAS',
    'Respostas CRÍTICAS',
    'Distribuição de Qualidade dos Respondentes',
    'Taxa de Validade',
    '(CONFIÁVEL, REVISAR, SUSPEITO, CRÍTICO)',
    'Pontuação automática',
    'Referência Automatizada',
    'Nota não calculada',
  ];

  test('em nenhum dos pedidos (completo, reduzido, com defeitos), o `messages` traz algum deles; o `system` também não', async () => {
    const pedidos: Array<[string, Resposta[], { excluidos?: string[] }]> = [
      ['completo, com cache favorável', respostas(true), {}],
      ['reduzido por exclusão do gestor', respostas(false), { excluidos: ['R03', 'R06'] }],
      ['com dois respondentes sem julgamentos', respostas(false, (r) => (['R01', 'R02'].includes(r.id) ? { ...r, judgments: undefined } : r)), {}],
    ];
    for (const [nome, rs, o] of pedidos) {
      const { captura } = await executarCadeia(rs, o);
      for (const t of REMOVIDOS) {
        expect({ pedido: nome, t, noMessages: captura.messages.includes(t), noSystem: captura.system.includes(t) }).toEqual({ pedido: nome, t, noMessages: false, noSystem: false });
      }
    }
  });
});

describe('P-CR-2, literal da predição: zero ocorrências dos rótulos, do score e da recomendação no `messages` e no corpo enviado', () => {
  // A lista é a da predição P-CR-2 (`docs/imprecisoes-parecer-ia.md`), escrita ANTES do código; mais `CONFIÁVEIS` (plural), que `CONFIÁVEL` não cobre.
  // ⚠ Controle de que a ausência não é vacuidade: no contexto de ANTES do Ajuste 1 (captura de `bcb6bdb`, fora do repositório) estes tokens ocorriam:
  //   CONFIÁVEL 12, REVISAR 4, SUSPEIT 3, CRÍTIC 3, Status: 12, Taxa de Validade 1 (medido). O valor medido está no registro do Ajuste 1.
  const TOKENS_DA_P_CR_2 = [
    'CONFIÁVEL', 'CONFIÁVEIS', 'CONFIAVEL', 'REVISAR', 'SUSPEIT', 'CRÍTIC', 'CRITIC', 'DESCONHECIDO',
    'Status:', 'Taxa de Validade', 'qualityScore', 'overallScore', 'avgScore', 'recommendation',
  ];
  test('painel completo, com cache favorável: nenhum token no `messages` do SDK nem no corpo que a tela enviaria; o `system` não muda', async () => {
    const { captura, pedido } = await executarCadeia(respostas(true));
    const corpoEnviado = JSON.stringify(pedido.corpo);
    for (const t of TOKENS_DA_P_CR_2) {
      expect({ t, noMessages: captura.messages.includes(t), noCorpo: corpoEnviado.includes(t) }).toEqual({ t, noMessages: false, noCorpo: false });
    }
    expect(sha(captura.system)).toBe('f3f2410c65c2919a477a5b2ee2c9b1628315effa85c906a71468ecf53eb36f98');
  });
});

describe('controles: ausente, incompleto, inválido, duplicado e painel reduzido, com os denominadores do ENVIADO e sem zero preenchido', () => {
  /** Um respondente (R05) com defeito, e os onze outros completos: 11 respondentes × 6 matrizes = 66. */
  const comDefeito = (fazer: (j: any[]) => any) => respostas(false, (r) => (r.id === 'R05' ? { ...r, judgments: fazer(r.judgments) } : r));

  test.each([
    ['ausente (sem julgamentos)', () => undefined, 'ausentes'],
    ['ausente (lista vazia)', () => [], 'ausentes'],
    ['incompleto (dois pares sem julgamento)', (j: any[]) => j.slice(2), 'incompletos'],
    ['inválido (valor 10 fora da escala)', (j: any[]) => j.map((x, i) => (i === 0 ? { ...x, saatyValue: 10 } : x)), 'inválidos'],
    ['duplicado (um par respondido duas vezes)', (j: any[]) => [...j, j[0]], 'com par respondido mais de uma vez'],
  ])('%s: 12 enviados, 11 com CR, 66 matrizes avaliadas; o 12º vai marcado SEM CR, com a condição, e a classificação fica suspensa', async (_r, fazer, rotulo) => {
    const { captura, corpo } = await executarCadeia(comDefeito(fazer as any));
    const m = captura.messages;
    expect(m).toContain(`- Respondentes enviados: 12. Com CR recalculado dos julgamentos nas 6 matrizes: 11. Sem CR: 1 (julgamentos ${rotulo}: 1).`);
    expect(m).toContain('- Matrizes avaliadas: 66 (11 respondentes × 6 matrizes não triviais');
    // o denominador é 66 e NÃO 72: o respondente sem CR não preenche matrizes com zero
    expect(m).not.toContain('de 72');
    expect(m).toContain('CR individual por matriz, sobre os 11 respondentes enviados com CR recalculado dos julgamentos');
    for (const mat of ['BOCR', 'MAGNITUDE', 'SUB-B', 'SUB-O', 'SUB-C', 'SUB-R']) expect([mat, m.includes(`- ${mat}: n = 11 respondentes com CR;`)]).toEqual([mat, true]);
    // a linha do respondente: marcada, com a condição, sem nenhum percentual
    const linha = linhaDe(m, 'R05');
    expect(linha).toContain(`CR por matriz: NÃO DISPONÍVEL — julgamentos ${rotulo}`);
    expect(linha).toContain('Nenhum valor é apresentado, e nenhum é preenchido com zero');
    expect(linha).not.toMatch(/\d+\.\d\d%/);
    // os outros onze conferem com a tabela
    for (const id of IDS.filter((i) => i !== 'R05')) expect(linhaDe(m, id)).toContain(trechoEsperado(id));
    // e a avaliação é INCOMPLETA: a classificação global fica suspensa, com o texto próprio (os CRs dos onze ESTÃO no contexto)
    expect(corpo.metadata.avaliacaoDeQualidade.estado).toBe('incompleta');
    expect(corpo.notaSuspensa).toMatchObject({ suspensa: true, causa: 'disponibilidade' });
    expect(m).toContain('⚠️ AVALIAÇÃO INDIVIDUAL DE QUALIDADE INCOMPLETA');
    expect(m).not.toContain('⚠️ AVALIAÇÃO INDIVIDUAL DE QUALIDADE NÃO DISPONÍVEL');
    expect(corpo.nota).toBeNull();
  });

  test('o ZERO CALCULADO chega ao SDK como resultado VÁLIDO: um respondente perfeitamente consistente (todas as comparações iguais a 1) conta nas 6 matrizes avaliadas e não fica acima do limiar', async () => {
    // R01 é substituído por um respondente de 72 julgamentos iguais a 1. Na tabela, R01 tem UMA matriz acima de 0,10 (SUB-C, 11,39%); sem ele, 46 de 72 e 11 de 12.
    const perfeito = respostas(false, (r) => (r.id === 'R01' ? { ...r, judgments: r.judgments.map((j: any) => ({ ...j, saatyValue: 1, favors: 'equal' })) } : r));
    const { captura, corpo } = await executarCadeia(perfeito);
    const m = captura.messages;
    const linha = linhaDe(m, 'R01');
    // as seis matrizes, a média e o máximo saem 0.00%: número válido, e não «NÃO DISPONÍVEL» nem ausência
    for (const mat of ['BOCR', 'MAGNITUDE', 'SUB-B', 'SUB-O', 'SUB-C', 'SUB-R']) expect([mat, linha.includes(`${mat} 0.00%`)]).toEqual([mat, true]);
    expect(linha).toContain('média das 6 matrizes: 0.00%');
    expect(linha).toContain('máximo: 0.00% (matriz governante:');
    expect(linha).not.toContain('NÃO DISPONÍVEL');
    expect(linha).not.toContain('-0.00%');
    // e conta: 12 respondentes com CR, 72 matrizes avaliadas, 46 acima do limiar (47 menos a SUB-C de R01), 11 de 12 respondentes com ao menos uma
    expect(m).toContain('- Respondentes enviados: 12. Com CR recalculado dos julgamentos nas 6 matrizes: 12. Sem CR: 0.');
    expect(m).toContain('- Matrizes avaliadas: 72 (12 respondentes × 6 matrizes não triviais');
    expect(m).toContain('(limiar de aceitação por matriz, Saaty, 1977): 46 de 72 (63.9%).');
    expect(m).toContain('- Respondentes com ao menos uma matriz com CR > 0.10: 11 de 12.');
    // a avaliação segue DISPONÍVEL: o zero calculado não é ausência
    expect(corpo.metadata.avaliacaoDeQualidade.estado).toBe('disponivel');
    expect(corpo.notaSuspensa).toBeNull();
  });

  // R03+R05 é o par da PREDIÇÃO P-CR-5; R03+R06 é outro par que dá os mesmos totais (4+6 e 6+4 matrizes acima do limiar na tabela: 47 − 10 = 37)
  test.each([[['R03', 'R05']], [['R03', 'R06']]])('o painel REDUZIDO (%s excluídos pelo gestor): 10 enviados, 60 matrizes, 37 de 60, 10 de 10; os números do painel completo NÃO viajam', async (excluidos) => {
    const { captura, pedido, corpo } = await executarCadeia(respostas(false), { excluidos });
    const m = captura.messages;
    expect(pedido.corpo.qualityAnalysis.respondents).toHaveLength(10);
    expect(m).toContain('- Respondentes enviados: 10. Com CR recalculado dos julgamentos nas 6 matrizes: 10. Sem CR: 0.');
    expect(m).toContain('- Matrizes avaliadas: 60 (10 respondentes × 6 matrizes não triviais');
    expect(m).toContain('- Matrizes com CR > 0.10 (limiar de aceitação por matriz, Saaty, 1977): 37 de 60 (61.7%).');
    expect(m).toContain('- Respondentes com ao menos uma matriz com CR > 0.10: 10 de 10.');
    for (const doCompleto of ['de 72', '47 de', 'enviados: 12', '12 de 12']) expect({ doCompleto, presente: m.includes(doCompleto) }).toEqual({ doCompleto, presente: false });
    // os excluídos não estão na lista, nem como linha, nem pelo CR do R03 (109.27% é, na tabela, um governante que só ele tem)
    for (const id of excluidos) expect(m).not.toContain(`- ID: ${id} |`);
    expect(m).not.toContain('109.27%');
    // a exclusão do gestor está dita, com as populações, e a avaliação do painel reduzido é disponível
    expect(m).toContain('- Os dados de qualidade abaixo referem-se APENAS aos 10 respondentes ENVIADOS a você');
    expect(corpo.metadata.avaliacaoDeQualidade.estado).toBe('disponivel');
    expect(corpo.notaSuspensa).toBeNull();
  });

  test('NENHUM respondente com CR (todos sem julgamentos): «Nenhum respondente enviado tem CR recalculado», sem contagem de matrizes, e a avaliação cai no texto de NÃO DISPONÍVEL', async () => {
    const { captura, corpo } = await executarCadeia(respostas(true, (r) => ({ ...r, judgments: undefined })));
    const m = captura.messages;
    expect(m).toContain('- Respondentes enviados: 12. Com CR recalculado dos julgamentos nas 6 matrizes: 0. Sem CR: 12 (julgamentos ausentes: 12).');
    expect(m).toContain('- Nenhum respondente enviado tem CR recalculado nas 6 matrizes: nenhuma contagem de matrizes é apresentada, e nenhum valor é preenchido com zero.');
    expect(m).toContain('⚠️ Não disponíveis: a qualidade individual não foi avaliada. Nenhum percentual por dimensão é apresentado.');
    expect(m).not.toContain('Matrizes avaliadas');
    expect(m).toContain('⚠️ AVALIAÇÃO INDIVIDUAL DE QUALIDADE NÃO DISPONÍVEL');
    // o cache favorável, que a API usaria na TELA, NÃO é CR para o modelo
    expect(m).not.toContain('2.0%');
    expect(corpo.notaSuspensa).toMatchObject({ suspensa: true, causa: 'disponibilidade' });
  });
});

describe('o registro da execução é o que FOI enviado ao SDK', () => {
  test('`prompts.system`, `prompts.mensagens` e os parâmetros do registro são iguais, byte a byte, ao que o duplo do SDK capturou', async () => {
    const { captura, corpo } = await executarCadeia(respostas(true));
    const reg = corpo.metadata.registroDaExecucao;
    expect(reg).toBeTruthy();
    expect(reg.prompts.system).toBe(captura.system);
    expect(reg.prompts.mensagens.map((m: any) => m.content).join('\n')).toBe(captura.messages);
    expect(reg.prompts.mensagens).toEqual(captura.parametros.messages);
    expect({ ...reg.modelo.parametrosEnviados, system: reg.prompts.system, messages: reg.prompts.mensagens }).toEqual(captura.parametros);
    // o resumo SHA-256 do registro é o do texto enviado
    const resumo = (campo: string) => reg.integridade.resumos.find((x: any) => x.campo === campo)?.sha256;
    expect(resumo('prompts.system')).toBe(sha(captura.system));
    expect(verificarIntegridadeDoRegistro(reg).ok).toBe(true);
  });

  test('a ENTRADA RECEBIDA registrada tem o que a tela enviou (os blocos), e a NORMALIZADA só o que a rota usa: nenhuma das duas tem os campos do formato anterior', async () => {
    const { corpo, pedido } = await executarCadeia(respostas(true));
    const { recebidaPelaApi, normalizada } = corpo.metadata.registroDaExecucao.entrada;
    // a recebida é a cópia do corpo que a montagem produziu
    expect(recebidaPelaApi.qualityAnalysis).toEqual(pedido.corpo.qualityAnalysis);
    expect(Object.keys(recebidaPelaApi.qualityAnalysis)).toEqual(['respondents']);
    expect(normalizada.qualityAnalysis.respondents).toHaveLength(12);
    for (const r of normalizada.qualityAnalysis.respondents) {
      expect(Object.keys(r).sort()).toEqual(['consistenciaIndividual', 'isSimulated', 'respondentId']);
      expect(r.consistenciaIndividual.fonte).toBe('recalculado_dos_julgamentos');
    }
    for (const copia of [recebidaPelaApi.qualityAnalysis, normalizada.qualityAnalysis]) {
      const t = JSON.stringify(copia);
      for (const k of ['"statistics"', '"byStatus"', '"overallScore"', '"recommendation"', '"flags"', '"status"', '"cacheLegado"', '"avgCR"']) expect({ k, presente: t.includes(k) }).toEqual({ k, presente: false });
    }
    // e o que o registro diz ter ENVIADO ao modelo tem os 12 CRs de MAGNITUDE da tabela
    const enviado: string = corpo.metadata.registroDaExecucao.prompts.mensagens[0].content;
    for (const id of IDS) expect(enviado).toContain(` | MAGNITUDE ${p2((REFERENCIA as any)[id].MAGNITUDE)} | `);
  });
});

describe('o que NÃO mudou: o `system` e o limite desta correção', () => {
  test('o `system` capturado tem o sha256 do `system` de antes do Ajuste 1 (o prompt de sistema não foi tocado)', async () => {
    const { captura } = await executarCadeia(respostas(true));
    expect(sha(captura.system)).toBe('f3f2410c65c2919a477a5b2ee2c9b1628315effa85c906a71468ecf53eb36f98');
  });

  test('LIMITE REGISTRADO (H-CR-S), caracterizado e NÃO aprovado: o exemplo «CORRETO» do `system` ainda afirma «CRs entre 1,1% e 9,6%, todos abaixo do limiar»', async () => {
    // ⚠ Este teste CARACTERIZA um defeito conhecido que esta correção NÃO conserta (o prompt de sistema não está no escopo): o exemplo ensina o formato de uma
    //   frase cujo conteúdo é o intervalo do cache diluído (1,1% a 9,6%), que o painel recalculado desmente (11,39% a 109,27% no governante). Ele existe para
    //   FORÇAR uma decisão consciente na tarefa que alterar o prompt de sistema: se este teste reprovar, o exemplo mudou, e a tarefa deve registrar a predição.
    const { captura } = await executarCadeia(respostas(true));
    expect(captura.system).toContain('Os 12 respondentes individuais apresentam CRs entre 1,1% e 9,6%, todos abaixo do limiar.');
    // e o CONTEXTO desta correção diz o contrário, com números: 47 das 72 matrizes acima do limiar
    expect(captura.messages).toContain('47 de 72');
  });
});
