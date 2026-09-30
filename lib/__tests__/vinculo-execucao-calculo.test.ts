/**
 * lib/__tests__/vinculo-execucao-calculo.test.ts
 *
 * **A.12 etapa 3, estágio 1: os ensaios 6 e 7, sobre a ROTA REAL de cálculo.**
 *
 * ⚠ **O que roda de verdade aqui.** A rota `app/api/calculate/route.ts` (o documento de
 * cálculo que ela grava, com `executionId`, `includedRespondents` e `judgmentsDigest`) e o
 * módulo `lib/ai-reviewer/vinculo-execucao.ts`. Isso é EXECUÇÃO.
 *
 * ⚠ **O que NÃO roda: a tela.** `page.tsx` é `'use client'` e nenhum teste a executa. O
 * carregamento das respostas que a tela faz é um MODELO (`carregarComoATela`), ancorado à
 * fonte da tela por LEITURA: se uma das linhas de que o modelo depende mudar, o ensaio de
 * ancoragem reprova e o modelo precisa ser revisto. Isso é um limite declarado, e não
 * equivalência com execução da tela.
 *
 * ⚠ **A lista avaliada** de cada caso é construída como a tela a construiria: um elemento
 * por resposta carregada, com `respondentId` (a API de qualidade devolve só `respondentId`,
 * por leitura de `app/api/response-quality/route.ts:194-215` e `:386-400`).
 *
 * ⚠ **Nada aqui corrige a divergência de identidade ou de conjunto.** Os ensaios 6 e 7
 * DOCUMENTAM o que a rota e a tela fazem hoje. Nenhuma cadeia de identificador foi
 * unificada, e o portão de completude não foi levado à tela.
 */

export {};

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..', '..');
const ROTA_CALCULO = path.join(RAIZ, 'app', 'api', 'calculate', 'route.ts');
const TELA = path.join(RAIZ, 'app', 'decisor', 'resultados', '[projectId]', 'page.tsx');
const SNAPSHOT_HISTORICO = path.join(RAIZ, 'docs', 'calculations-13jul2026.json');

// ---------------------------------------------------------------------------
// Firestore simulado. ⚠ É duplo de TESTE, e não caminho de produção.
// ---------------------------------------------------------------------------

type Doc = { id: string; data: Record<string, unknown> };
const store: Record<string, Doc[]> = { projects: [], respondents: [], responses: [] };
const setDocSpy = jest.fn();

jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));

jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __col: name }),
  query: (ref: unknown) => ref,
  where: (field: string, _op: string, value: unknown) => ({ field, value }),
  doc: (_db: unknown, col: string, id: string) => ({ __col: col, __id: id }),
  getDoc: async (ref: { __col: string; __id: string }) => {
    const achado = store[ref.__col]?.find(d => d.id === ref.__id);
    return { exists: () => Boolean(achado), id: ref.__id, data: () => achado?.data };
  },
  getDocs: async (ref: { __col: string }) => {
    const docs = (store[ref.__col] ?? []).map(d => ({ id: d.id, data: () => d.data }));
    return { docs, size: docs.length };
  },
  setDoc: (...args: unknown[]) => {
    setDocSpy(...args);
    return Promise.resolve();
  },
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const { POST } = require('@/app/api/calculate/route');
const { prepararVinculoDaTela } = require('@/lib/ai-reviewer/vinculo-execucao');
const { classificarAvaliacaoDaTela } = require('@/lib/ai-reviewer/avaliacao-qualidade');
const { compararIdentificadores } = require('@/lib/ai-reviewer/vinculo-execucao');
const fixture = require('./fixtures/panel-2026.json');
/* eslint-enable @typescript-eslint/no-var-requires */

const PROJETO = 'projeto-vinculo-execucao';
const ALTERNATIVAS = [
  { code: 'A1', name: 'Alternativa um', description: '' },
  { code: 'A2', name: 'Alternativa dois', description: '' },
];
const JULGAMENTOS: any[][] = (fixture as any).responses.map((r: any) => r.judgments);

const idAlfa = (i: number) => `ident-alfa-${String(i).padStart(2, '0')}`;
const copia = (x: any) => JSON.parse(JSON.stringify(x));

type Entrada = { docId: string; respondentId?: string; judgments: any[]; completedAt?: string; extra?: any };

function montarStore(cadastrados: string[], respostas: Entrada[]) {
  store.projects = [
    { id: PROJETO, data: { name: 'Painel do vinculo', description: '', alternatives: ALTERNATIVAS } },
  ];
  store.respondents = cadastrados.map(id => ({ id, data: { projectId: PROJETO } }));
  store.responses = respostas.map(r => ({
    id: r.docId,
    data: {
      projectId: PROJETO,
      ...(r.respondentId === undefined ? {} : { respondentId: r.respondentId }),
      judgments: r.judgments,
      ...(r.completedAt === undefined ? {} : { completedAt: r.completedAt }),
      ...(r.extra ?? {}),
    },
  }));
}

async function rodar(body: Record<string, unknown> = { projectId: PROJETO }) {
  setDocSpy.mockClear();
  const res = await POST({ json: async () => body } as any);
  const corpo = await res.json();
  return { status: res.status ?? 200, corpo, gravado: setDocSpy.mock.calls[0]?.[1] as any };
}

/** Um painel de `n` respondentes completos, cadastrados, com `respondentId` presente. */
function painel(n: number, extra?: any): { cadastrados: string[]; respostas: Entrada[] } {
  const cadastrados = Array.from({ length: n }, (_, i) => idAlfa(i + 1));
  const respostas = cadastrados.map((id, i) => ({
    docId: `doc-${id}`,
    respondentId: id,
    judgments: copia(JULGAMENTOS[i % JULGAMENTOS.length]),
    completedAt: `2026-09-01T0${i % 10}:00:00.000Z`,
    extra,
  }));
  return { cadastrados, respostas };
}

/** Remove uma comparação de `O1×O2`: a resposta passa a ser rejeitada pelo portão de completude. */
function mutilar(judgments: any[]): any[] {
  const m = copia(judgments);
  const i = m.findIndex((x: any) => x.type === 'subcriteria' && x.group === 'O' && x.itemA === 'O1' && x.itemB === 'O2');
  if (i < 0) throw new Error('comparacao O1×O2 nao encontrada na fixture');
  m.splice(i, 1);
  return m;
}

// ---------------------------------------------------------------------------
// O MODELO do carregamento da tela, e a sua ancoragem por LEITURA.
// ---------------------------------------------------------------------------

const ocorrencias = (texto: string, agulha: string) => texto.split(agulha).length - 1;

/**
 * ⚠ **MODELO, e não a tela.** Reproduz os três filtros de `page.tsx` ("5. Carregar respostas
 * para análise de qualidade (filtradas)"): finalizadas; `respondentId` deve existir em
 * `respondents`; deduplicação por `respondentId`, mantendo a mais recente. Cada resposta
 * carregada vira `{ id: doc.id, ...data }`, como na tela.
 */
function carregarComoATela(): any[] {
  const validRespondentIds = new Set(store.respondents.map(d => d.id));
  const completas = store.responses.filter(d => d.data.completedAt != null && d.data.completedAt !== '');
  const validadas = completas.filter(d => validRespondentIds.has(d.data.respondentId as string));
  const unicas = new Map<unknown, any>();
  validadas.forEach(d => {
    const existente = unicas.get(d.data.respondentId);
    if (!existente || (d.data.completedAt as string) > existente.completedAt) {
      unicas.set(d.data.respondentId, { id: d.id, ...d.data });
    }
  });
  return Array.from(unicas.values());
}

/** A lista que a API de qualidade devolve: um elemento por resposta carregada, só `respondentId`. */
const analiseDe = (carregadas: any[]) => carregadas.map(r => ({ respondentId: r.respondentId, cr: 0.05 }));

describe('ancoragem do modelo de carregamento à fonte da tela (LEITURA, e não execução)', () => {
  const tela = fs.readFileSync(TELA, 'utf8');

  test.each([
    ['filtro 1: finalizadas', "return data.completedAt != null && data.completedAt !== '';"],
    ['filtro 2: orfãs descartadas pelo respondentId', 'if (!validRespondentIds.has(data.respondentId)) {'],
    ['filtro 2: o conjunto válido são os ids da coleção respondents', 'validRespondentIds = new Set(respondentsSnapshot.docs.map(doc => doc.id));'],
    ['filtro 3: deduplicação lê data.respondentId', 'const existing = uniqueMap.get(data.respondentId);'],
    ['filtro 3: a mais recente vence', 'if (!existing || (data.completedAt > existing.completedAt)) {'],
    ['a resposta carregada é { id: doc.id, ...data }', 'uniqueMap.set(data.respondentId, { id: doc.id, ...data });'],
  ])('%s', (_nome, literal) => {
    expect(ocorrencias(tela, literal as string)).toBe(1);
  });

  test('a tela não tem portão de completude: só lê e exibe o que o documento registrou', () => {
    for (const chamada of ['checkResponseCompleteness(', 'describeIncompleteness(']) {
      expect(ocorrencias(tela, chamada)).toBe(0);
    }
    // CONTRAEXEMPLO de que o detector discrimina: a ROTA tem os dois
    const rota = fs.readFileSync(ROTA_CALCULO, 'utf8');
    expect(ocorrencias(rota, 'checkResponseCompleteness(')).toBeGreaterThan(0);
    expect(ocorrencias(rota, 'describeIncompleteness(')).toBeGreaterThan(0);
  });

  test('o modelo reproduz o que a tela faz com uma resposta órfã, uma duplicata e uma sem respondentId', () => {
    montarStore(['r1', 'r2', 'doc-sem-rid'], [
      { docId: 'd1', respondentId: 'r1', judgments: [], completedAt: '2026-09-01T00:00:00Z' },
      { docId: 'd1-nova', respondentId: 'r1', judgments: [], completedAt: '2026-09-02T00:00:00Z' },
      { docId: 'd-orfa', respondentId: 'nao-cadastrado', judgments: [], completedAt: '2026-09-01T00:00:00Z' },
      { docId: 'd-nao-final', respondentId: 'r2', judgments: [] },
      { docId: 'doc-sem-rid', judgments: [], completedAt: '2026-09-01T00:00:00Z' },
    ]);
    const carregadas = carregarComoATela();
    expect(carregadas.map(r => r.id)).toEqual(['d1-nova']);
    expect(carregadas[0].respondentId).toBe('r1');
  });
});

// ---------------------------------------------------------------------------
// O bloco observado, que alimenta o relato. ⚠ Só contagens, rótulos e estados.
// ---------------------------------------------------------------------------

const OBSERVADO: any = {};

// ============================================================ 6
describe('ensaio 6: rejeitado por incompletude, presente na avaliação e ausente do documento, é divergente', () => {
  test('o portão de completude de A.21 rejeita, a tela avalia, e o vínculo é divergente', async () => {
    const base = painel(5);
    base.respostas[4] = { ...base.respostas[4], judgments: mutilar(base.respostas[4].judgments) };
    montarStore(base.cadastrados, base.respostas);

    const { status, gravado } = await rodar();
    expect(status).toBe(200);
    const rejeitado = idAlfa(5);
    const incluidos = [1, 2, 3, 4].map(idAlfa);

    // ⚠ A ORIGEM da divergência: o portão de completude da rota. O documento registra quem ele
    //   rejeitou, e esse é o mesmo identificador que a avaliação tem a mais.
    expect(gravado.metadata.rejectedIncomplete.map((r: any) => r.respondentId)).toEqual([rejeitado]);
    expect(gravado.metadata.includedRespondents.map((i: any) => i.respondentId)).toEqual(incluidos);

    // a tela (modelo) carrega as CINCO: nenhum filtro dela olha completude
    const carregadas = carregarComoATela();
    expect(carregadas).toHaveLength(5);
    const ativos = analiseDe(carregadas);

    const r = prepararVinculoDaTela({ calculo: gravado, respondentesAtivos: ativos, respostasAtivas: carregadas });
    expect(r.vinculo.estado).toBe('divergente');
    expect(r.vinculo.origemDaListaAvaliada).toBe('analiseDeQualidade');
    expect(r.vinculo.divergencia.sobraNaAvaliacao).toEqual([
      { identificador: rejeitado, campo: 'respondentId', posicaoNaLista: 4, motivo: 'fora-do-documento' },
    ]);
    expect(r.vinculo.divergencia.sobraNoDocumento).toEqual([]);
    expect(r.vinculo.divergencia.sobraNaAvaliacao[0].identificador).toBe(gravado.metadata.rejectedIncomplete[0].respondentId);

    // a restrição (P1) retira o rejeitado do que vai ao modelo, e `overall` deixa de ir
    expect(r.vinculo.enviados).toEqual(incluidos);
    expect(r.respondentesEnviados.map((x: any) => x.respondentId)).toEqual(incluidos);
    expect(r.vinculo.cobertura).toMatchObject({ avaliadosAntesDaRestricao: 5, enviados: 4, incluidosNoDocumento: 4 });
    expect(r.omitirOverall).toBe(true);

    OBSERVADO.rejeitadoPorIncompletude = {
      estado: r.vinculo.estado,
      origem: r.vinculo.origemDaListaAvaliada,
      avaliados: r.vinculo.cobertura.avaliadosAntesDaRestricao,
      incluidos: r.vinculo.cobertura.incluidosNoDocumento,
      enviados: r.vinculo.cobertura.enviados,
      sobraNaAvaliacao: r.vinculo.divergencia.sobraNaAvaliacao.length,
      sobraNoDocumento: r.vinculo.divergencia.sobraNoDocumento.length,
      overallOmitido: r.omitirOverall,
    };
  });

  test('o ensaio NOMEIA o portão como origem, e o nome é conferido contra a fonte da rota (LEITURA)', () => {
    const linhas: string[] = fs.readFileSync(ROTA_CALCULO, 'utf8').split('\n');
    const inicio = linhas.findIndex(l => l.includes('const rejectedIncomplete:')) + 1;
    const fim = linhas.findIndex(l => l.includes('responses.push(...completeResponses);')) + 1;
    expect(inicio).toBeGreaterThan(0);
    expect(fim).toBeGreaterThan(inicio);
    const trecho = linhas.slice(inicio - 1, fim).join('\n');
    // o que o nome "portão de completude de A.21" promete
    expect(trecho).toContain('checkResponseCompleteness(');
    expect(trecho).toContain('rejectedIncomplete.push(');
    expect(trecho).toContain('responses.length = 0;');
    // ⚠ O localizador MEDIDO nesta base. O prompt cita `:734-748`: é o mesmo trecho, com o
    //   `responses.push(...)` uma linha depois. Registrado, e não asserido por número.
    OBSERVADO.localizadorDoPortao = { arquivo: 'app/api/calculate/route.ts', inicio, fim };
  });

  test('CONTRAEXEMPLO: o mesmo painel, com a quinta resposta COMPLETA, é vinculado', async () => {
    const base = painel(5);
    montarStore(base.cadastrados, base.respostas);
    const { gravado } = await rodar();
    expect(gravado.metadata.rejectedIncomplete).toEqual([]);
    const carregadas = carregarComoATela();
    const r = prepararVinculoDaTela({ calculo: gravado, respondentesAtivos: analiseDe(carregadas), respostasAtivas: carregadas });
    expect(r.vinculo.estado).toBe('vinculado');
    expect(r.vinculo.enviados).toHaveLength(5);
    expect(r.omitirOverall).toBe(false);
    expect(r.vinculo.divergencia).toEqual({ sobraNoDocumento: [], sobraNaAvaliacao: [], repetidosNaAvaliacao: [] });
  });

  test('CONTRAEXEMPLO EXECUTADO: comparar sobre `enviados` esconderia o rejeitado, e o estado sairia vinculado', async () => {
    const base = painel(5);
    base.respostas[4] = { ...base.respostas[4], judgments: mutilar(base.respostas[4].judgments) };
    montarStore(base.cadastrados, base.respostas);
    const { gravado } = await rodar();
    const carregadas = carregarComoATela();
    const r = prepararVinculoDaTela({ calculo: gravado, respondentesAtivos: analiseDe(carregadas), respostasAtivas: carregadas });

    const soOsEnviados = r.vinculo.avaliadosAntesDaRestricao.filter((e: any) => r.vinculo.enviados.includes(e.identificador));
    const mutante = compararIdentificadores(soOsEnviados, r.vinculo.incluidosNoDocumento);
    expect(mutante.sobraNaAvaliacao).toEqual([]);
    expect(mutante.sobraNoDocumento).toEqual([]);
    expect(r.vinculo.divergencia.sobraNaAvaliacao).toHaveLength(1);
    expect(r.vinculo.estado).toBe('divergente');
  });
});

// ============================================================ 7
describe('ensaio 7: resposta sem respondentId, com id de documento cadastrado — a tela a descarta, a rota a inclui', () => {
  const DOC_ID = 'doc-sem-respondentid';

  async function cenario() {
    montarStore([DOC_ID, idAlfa(2)], [
      { docId: DOC_ID, judgments: copia(JULGAMENTOS[0]), completedAt: '2026-09-01T00:00:00.000Z' },
      {
        docId: `doc-${idAlfa(2)}`,
        respondentId: idAlfa(2),
        judgments: copia(JULGAMENTOS[1]),
        completedAt: '2026-09-01T01:00:00.000Z',
      },
    ]);
    return rodar();
  }

  test('a rota inclui (fonte response.id), a tela descarta, e o resultado é divergente', async () => {
    const { gravado } = await cenario();

    // ROTA: inclui, e registra a fonte do identificador
    const item = gravado.metadata.includedRespondents.find((i: any) => i.respondentId === DOC_ID);
    expect(item).toBeDefined();
    expect(item.identifierSource).toBe('response.id');
    expect(item.responseDocId).toBe(DOC_ID);
    expect(gravado.metadata.includedRespondents.map((i: any) => i.respondentId)).toEqual([DOC_ID, idAlfa(2)]);

    // TELA (modelo ancorado): descarta, porque `validRespondentIds.has(undefined)` é falso
    const carregadas = carregarComoATela();
    expect(carregadas.map((r: any) => r.respondentId)).toEqual([idAlfa(2)]);

    const r = prepararVinculoDaTela({ calculo: gravado, respondentesAtivos: analiseDe(carregadas), respostasAtivas: carregadas });
    expect(r.vinculo.estado).toBe('divergente');
    expect(r.vinculo.divergencia.sobraNoDocumento).toEqual([DOC_ID]);
    expect(r.vinculo.divergencia.sobraNaAvaliacao).toEqual([]);
    expect(r.vinculo.enviados).toEqual([idAlfa(2)]);
    // ⚠ a restrição não retira ninguém aqui (a avaliação é subconjunto do documento), e `overall` fica
    expect(r.omitirOverall).toBe(false);
    expect(r.vinculo.cobertura).toMatchObject({
      avaliadosAntesDaRestricao: 1,
      enviados: 1,
      incluidosNoDocumento: 2,
      enviadosDiferemDosAvaliados: false,
      enviadosIguaisAoDocumento: false,
    });

    OBSERVADO.semRespondentIdComDocIdCadastrado = {
      estado: r.vinculo.estado,
      origem: r.vinculo.origemDaListaAvaliada,
      sobraNoDocumento: r.vinculo.divergencia.sobraNoDocumento.length,
      sobraNaAvaliacao: r.vinculo.divergencia.sobraNaAvaliacao.length,
      enviados: r.vinculo.cobertura.enviados,
      overallOmitido: r.omitirOverall,
    };
  });

  test('o ensaio DOCUMENTA a divergência de identidade, e NÃO a corrige: a tela ainda descarta pelo respondentId', () => {
    // ⚠ Se alguém unificar a identidade da tela com a da rota, este ensaio reprova e o
    //   modelo (e o contrato) precisam ser revistos DE PROPÓSITO. Nada foi unificado aqui.
    const tela = fs.readFileSync(TELA, 'utf8');
    expect(ocorrencias(tela, 'if (!validRespondentIds.has(data.respondentId)) {')).toBe(1);
    const rota = fs.readFileSync(ROTA_CALCULO, 'utf8');
    expect(ocorrencias(rota, "'response.id'")).toBeGreaterThan(0);
  });

  test('CONTRAEXEMPLO: com respondentId presente (igual ao id do documento), a tela mantém a resposta e o vínculo é vinculado', async () => {
    montarStore([DOC_ID, idAlfa(2)], [
      { docId: DOC_ID, respondentId: DOC_ID, judgments: copia(JULGAMENTOS[0]), completedAt: '2026-09-01T00:00:00.000Z' },
      { docId: `doc-${idAlfa(2)}`, respondentId: idAlfa(2), judgments: copia(JULGAMENTOS[1]), completedAt: '2026-09-01T01:00:00.000Z' },
    ]);
    const { gravado } = await rodar();
    const carregadas = carregarComoATela();
    expect(carregadas).toHaveLength(2);
    const r = prepararVinculoDaTela({ calculo: gravado, respondentesAtivos: analiseDe(carregadas), respostasAtivas: carregadas });
    expect(r.vinculo.estado).toBe('vinculado');
    expect(r.vinculo.divergencia.sobraNoDocumento).toEqual([]);
  });
});

// ============================================================ o observado nas referências
describe('o vínculo OBSERVADO sobre o documento que a rota grava: origem da lista e tratamento de overall', () => {
  test('painel de referência, origem análise de qualidade: vinculado, e `overall` inalterado', async () => {
    const n = JULGAMENTOS.length;
    const base = painel(n);
    montarStore(base.cadastrados, base.respostas);
    const { gravado } = await rodar();
    expect(gravado.metadata.includedRespondents).toHaveLength(n);

    const carregadas = carregarComoATela();
    const r = prepararVinculoDaTela({ calculo: gravado, respondentesAtivos: analiseDe(carregadas), respostasAtivas: carregadas });
    expect(r.vinculo.estado).toBe('vinculado');
    expect(r.vinculo.origemDaListaAvaliada).toBe('analiseDeQualidade');
    expect(r.vinculo.enviados).toHaveLength(n);
    expect(r.omitirOverall).toBe(false);
    // o resumo do painel viaja, e cobre o documento
    expect(r.vinculo.resumoDoConteudo.painel).toMatchObject({ serialization: 'a12-julgamentos-v1', algorithm: 'sha256' });
    expect(typeof r.vinculo.resumoDoConteudo.painel.panel).toBe('string');
    expect(r.vinculo.resumoDoConteudo.enviadosComResumoIndisponivel).toEqual([]);

    OBSERVADO.painelDeReferencia = {
      respondentes: n,
      estado: r.vinculo.estado,
      origem: r.vinculo.origemDaListaAvaliada,
      enviados: r.vinculo.cobertura.enviados,
      overallOmitido: r.omitirOverall,
      resumosIndividuais: Object.keys(r.vinculo.resumoDoConteudo.mapaPorRespondentId).length,
    };
  });

  test('ACHADO, nas condições OBSERVADAS: com o id do documento diferente do `respondentId`, sem `id` nem `visitorId` gravados no dado, o ramo do FALLBACK identifica pelo id do documento e o vínculo é divergente', async () => {
    // ⚠ Em `page.tsx`, o ramo do fallback identifica cada resposta por
    //   `response.visitorId || response.id || resp-N`, e a resposta carregada é
    //   `{ id: doc.id, ...data }`. ⚠ AS CONDIÇÕES sob as quais o identificador é o ID DO DOCUMENTO
    //   são TRÊS, e este teste as CONSTRÓI: (1) o id do documento não é o `respondentId`; (2) o dado
    //   gravado não tem o campo `id`; (3) o dado gravado não tem `visitorId`. Nenhuma delas está
    //   demonstrada para os documentos existentes, e os controles logo abaixo satisfazem cada uma
    //   e desfazem a divergência. `respondentId` não está na cadeia, e o documento de cálculo é
    //   chaveado por `respondentId`. Medido abaixo; NÃO corrigido (unificar cadeias é proibido).
    const n = 4;
    const base = painel(n, { consistency: { cr: 0.05 } });
    montarStore(base.cadastrados, base.respostas);
    // as três condições, verificadas sobre o que este teste construiu
    expect(store.responses.every(d => d.id !== d.data.respondentId)).toBe(true);
    expect(store.responses.every(d => !('id' in d.data))).toBe(true);
    expect(store.responses.every(d => !('visitorId' in d.data))).toBe(true);
    const { gravado } = await rodar();
    const carregadas = carregarComoATela();
    expect(carregadas.every((r: any) => r.visitorId === undefined)).toBe(true);
    expect(carregadas.map((r: any) => r.id)).toEqual(base.cadastrados.map(id => `doc-${id}`));

    const r = prepararVinculoDaTela({ calculo: gravado, respondentesAtivos: [], respostasAtivas: carregadas });
    expect(r.vinculo.origemDaListaAvaliada).toBe('fallbackSobreRespostas');
    expect(r.vinculo.avaliadosAntesDaRestricao.every((e: any) => e.campo === 'id')).toBe(true);
    expect(r.vinculo.avaliadosAntesDaRestricao.map((e: any) => e.identificador)).toEqual(base.cadastrados.map(id => `doc-${id}`));
    expect(r.vinculo.estado).toBe('divergente');
    expect(r.vinculo.divergencia.sobraNaAvaliacao).toHaveLength(n);
    expect(r.vinculo.divergencia.sobraNaAvaliacao.every((s: any) => s.motivo === 'fora-do-documento')).toBe(true);
    expect(r.vinculo.divergencia.sobraNoDocumento).toEqual(base.cadastrados);
    // a restrição (P1) esvazia a lista, e o fallback NÃO é reaberto
    expect(r.vinculo.enviados).toEqual([]);
    expect(r.respostasEnviadas).toEqual([]);
    expect(r.respondentesEnviados).toEqual([]);
    expect(r.omitirOverall).toBe(true);

    // EFEITO pelas regras da etapa 1, com a causa nomeada: sem restrição as respostas têm CR e a
    // avaliação é `disponivel`; com a restrição a lista fica vazia e a avaliação é `ausente`
    // (causa `disponibilidade`).
    const semRestricao = classificarAvaliacaoDaTela({ respondentesAvaliados: [], respostasAtivas: carregadas });
    const comRestricao = classificarAvaliacaoDaTela({
      respondentesAvaliados: r.respondentesEnviados,
      respostasAtivas: r.respostasEnviadas,
    });
    expect(semRestricao.estado).toBe('disponivel');
    expect(comRestricao.estado).toBe('ausente');

    // CONTRAEXEMPLO: se o identificador fosse o `respondentId`, o mesmo painel seria vinculado
    const comRespondentId = prepararVinculoDaTela({
      calculo: gravado,
      respondentesAtivos: [],
      respostasAtivas: carregadas.map((c: any) => ({ ...c, visitorId: c.respondentId })),
    });
    expect(comRespondentId.vinculo.estado).toBe('vinculado');

    OBSERVADO.fallbackSobreRespostas = {
      respostas: n,
      estado: r.vinculo.estado,
      origem: r.vinculo.origemDaListaAvaliada,
      campoDoIdentificador: [...new Set(r.vinculo.avaliadosAntesDaRestricao.map((e: any) => e.campo))],
      sobraNaAvaliacao: r.vinculo.divergencia.sobraNaAvaliacao.length,
      sobraNoDocumento: r.vinculo.divergencia.sobraNoDocumento.length,
      enviados: r.vinculo.cobertura.enviados,
      avaliacaoSemRestricao: semRestricao.estado,
      avaliacaoComRestricao: comRestricao.estado,
      overallOmitido: r.omitirOverall,
    };
  });

  describe('R3: as três condições NÃO demonstradas para os documentos existentes — cada uma, satisfeita, DESFAZ a divergência (controles executados)', () => {
    const n = 4;
    /** O painel de `n` respostas com `alterar` aplicado a cada uma, o documento gravado pela rota real e o vínculo do ramo do fallback. */
    async function fallbackCom(alterar: (e: Entrada) => Entrada) {
      const base = painel(n, { consistency: { cr: 0.05 } });
      montarStore(base.cadastrados, base.respostas.map(alterar));
      const { gravado } = await rodar();
      const carregadas = carregarComoATela();
      const r = prepararVinculoDaTela({ calculo: gravado, respondentesAtivos: [], respostasAtivas: carregadas });
      const semRestricao = classificarAvaliacaoDaTela({ respondentesAvaliados: [], respostasAtivas: carregadas });
      const comRestricao = classificarAvaliacaoDaTela({ respondentesAvaliados: r.respondentesEnviados, respostasAtivas: r.respostasEnviadas });
      return { r, carregadas, base, semRestricao, comRestricao };
    }

    test('CONTROLE 0 (as condições observadas): o mesmo painel, sem nenhuma das três, é divergente e a avaliação passa a ausente', async () => {
      const { r, base, semRestricao, comRestricao } = await fallbackCom(e => e);
      expect(r.vinculo.origemDaListaAvaliada).toBe('fallbackSobreRespostas');
      expect(r.vinculo.estado).toBe('divergente');
      expect(r.vinculo.avaliadosAntesDaRestricao.map((x: any) => x.identificador)).toEqual(base.cadastrados.map(id => `doc-${id}`));
      expect(r.vinculo.enviados).toEqual([]);
      expect(semRestricao.estado).toBe('disponivel');
      expect(comRestricao.estado).toBe('ausente');
    });

    test('CONDIÇÃO 1: o id do documento COINCIDE com o `respondentId` — o identificador vira o `respondentId` e o vínculo é vinculado', async () => {
      const { r, carregadas, base, semRestricao, comRestricao } = await fallbackCom(e => ({ ...e, docId: e.respondentId as string }));
      expect(carregadas.map((c: any) => c.id)).toEqual(base.cadastrados);
      expect(r.vinculo.origemDaListaAvaliada).toBe('fallbackSobreRespostas');
      expect(r.vinculo.avaliadosAntesDaRestricao.every((x: any) => x.campo === 'id')).toBe(true);
      expect(r.vinculo.estado).toBe('vinculado');
      expect(r.vinculo.enviados).toHaveLength(n);
      expect(r.omitirOverall).toBe(false);
      expect(semRestricao.estado).toBe('disponivel');
      expect(comRestricao.estado).toBe('disponivel'); // a lista NÃO é esvaziada, e a causa `disponibilidade` não aparece
    });

    test('CONDIÇÃO 2: um `id` gravado no dado SOBRESCREVE o id do documento no espalhamento — com `id` igual ao `respondentId` o vínculo é vinculado', async () => {
      const { r, carregadas, base, comRestricao } = await fallbackCom(e => ({ ...e, extra: { ...e.extra, id: e.respondentId } }));
      // `{ id: doc.id, ...data }`: o `id` do dado vem depois e vence o do documento
      expect(carregadas.map((c: any) => c.id)).toEqual(base.cadastrados);
      expect(store.responses.every(d => d.id !== d.data.respondentId)).toBe(true); // o id do DOCUMENTO continua diferente
      expect(r.vinculo.avaliadosAntesDaRestricao.every((x: any) => x.campo === 'id')).toBe(true);
      expect(r.vinculo.estado).toBe('vinculado');
      expect(comRestricao.estado).toBe('disponivel');
    });

    test('CONDIÇÃO 3: um `visitorId` gravado no dado vem PRIMEIRO na cadeia — com `visitorId` igual ao `respondentId` o vínculo é vinculado', async () => {
      const { r, carregadas, base, comRestricao } = await fallbackCom(e => ({ ...e, extra: { ...e.extra, visitorId: e.respondentId } }));
      expect(carregadas.map((c: any) => c.visitorId)).toEqual(base.cadastrados);
      expect(r.vinculo.avaliadosAntesDaRestricao.every((x: any) => x.campo === 'visitorId')).toBe(true);
      expect(r.vinculo.estado).toBe('vinculado');
      expect(comRestricao.estado).toBe('disponivel');
    });

    test('as condições, LIDAS nos escritores do repositório (leitura, e não medição sobre dados): dois `addDoc` de `responses`, nenhum grava `id` nem `visitorId`', () => {
      const avaliacao = fs.readFileSync(path.join(RAIZ, 'app', 'avaliacao', '[projectId]', 'page.tsx'), 'utf8');
      expect(ocorrencias(avaliacao, "addDoc(collection(db, 'responses'),")).toBe(2);
      for (const marca of ['const finalData = {', 'const progressData = {']) {
        const inicio = avaliacao.indexOf(marca);
        expect(inicio).toBeGreaterThan(-1);
        const corpo = avaliacao.slice(inicio, avaliacao.indexOf('};', inicio));
        expect(corpo.length).toBeGreaterThan(50);
        expect(corpo).not.toMatch(/(^|\n)\s*(id|visitorId)\s*[:,]/);
      }
      // nenhum ponto de app, lib, components ou scripts atribui ou declara `visitorId` como chave
      const achados: string[] = [];
      const varrer = (dir: string) => {
        for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
          const rel = `${dir}/${e.name}`;
          if (e.isDirectory()) {
            if (['node_modules', '.next', '.git', '__tests__'].includes(e.name)) continue;
            varrer(rel);
          } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(e.name)) {
            if (/visitorId\??\s*[:=]/.test(fs.readFileSync(path.join(RAIZ, rel), 'utf8'))) achados.push(rel);
          }
        }
      };
      for (const dir of ['app', 'lib', 'components', 'scripts']) if (fs.existsSync(path.join(RAIZ, dir))) varrer(dir);
      expect(achados).toEqual([]);
      // CONTRAEXEMPLO: o detector acusaria uma gravação de `visitorId`, e um `id` em `finalData`
      expect(/visitorId\??\s*[:=]/.test('const x = { visitorId: y };')).toBe(true);
      expect(/(^|\n)\s*(id|visitorId)\s*[:,]/.test('const finalData = {\n  id: algo,\n};')).toBe(true);
      // ⚠ Isto é leitura do CÓDIGO ATUAL: documentos gravados por versões anteriores, por importação ou à mão
      //   não são alcançados, e por isso as três condições seguem NÃO demonstradas.
    });
  });

  test('o snapshot versionado de 13/07/2026 (que NÃO é produção) produz indisponivel', () => {
    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_HISTORICO, 'utf8'));
    expect(snapshot.executionId).toBeUndefined();
    expect(snapshot.metadata.includedRespondents).toBeUndefined();

    const r = prepararVinculoDaTela({ calculo: snapshot, respondentesAtivos: [], respostasAtivas: [] });
    expect(r.vinculo.estado).toBe('indisponivel');
    expect(r.vinculo.motivo).toMatch(/metadata\.includedRespondents e executionId/);
    expect(r.vinculo.origemDaListaAvaliada).toBe('nenhuma'); // o arquivo não traz lista avaliada
    expect(r.vinculo.divergencia.sobraNoDocumento).toBeNull();
    expect(r.omitirOverall).toBe(false);

    OBSERVADO.snapshotHistorico = {
      arquivo: 'docs/calculations-13jul2026.json',
      estado: r.vinculo.estado,
      origem: r.vinculo.origemDaListaAvaliada,
      naoEProducao: true,
    };
  });

  test('CONTRAEXEMPLO: um documento que a rota grava hoje NÃO é indisponivel', async () => {
    const base = painel(3);
    montarStore(base.cadastrados, base.respostas);
    const { gravado } = await rodar();
    const carregadas = carregarComoATela();
    const r = prepararVinculoDaTela({ calculo: gravado, respondentesAtivos: analiseDe(carregadas), respostasAtivas: carregadas });
    expect(r.vinculo.estado).not.toBe('indisponivel');
    expect(typeof gravado.executionId).toBe('string');
  });
});

afterAll(() => {
  if (process.env.VINCULO_OBSERVADO) {
    fs.writeFileSync(process.env.VINCULO_OBSERVADO, JSON.stringify(OBSERVADO, null, 2));
  }
});
