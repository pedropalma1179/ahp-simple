/**
 * lib/__tests__/a12-rastreabilidade.test.ts
 *
 * **A.12 etapa 2: os controles do COMPORTAMENTO ATUAL da rota de cálculo.**
 *
 * ⚠ **Instrumento separado, de propósito.** A medição histórica de `a12-identidade` está
 * **congelada** em `docs/dados/a12-identidade/medicao-preservada-03c7d8b.json`, e aquele
 * arquivo passou a ler dela. **Aqui roda o código de hoje**, e é isto que mede o
 * comportamento atual.
 *
 * ⚠ **Cada controle tem caso que passa e CONTRAEXEMPLO que reprova.**
 *
 * ⚠ **O LIMITE, declarado.** Esta etapa registra **quem entrou**, **qual conteúdo foi
 * julgado** e **qual execução produziu o documento**. Ela **não** preserva execuções
 * anteriores, **não** preserva o conteúdo julgado, **não** vincula a avaliação de
 * qualidade aos incluídos, e **não** alcança o arquivo histórico de 13/07/2026.
 */

export {};

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const ARTEFATO = path.join(RAIZ, 'docs', 'dados', 'a12-rastreabilidade', 'medicao.json');
const GRAVAR = process.env.A12R_GRAVAR === '1';

const sha256 = (b: Buffer | string) =>
  crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : b).digest('hex');
const shaArquivo = (rel: string) => sha256(fs.readFileSync(path.join(RAIZ, rel)));

const ROTA_CALCULO = 'app/api/calculate/route.ts';
const MODULO_RESUMO = 'lib/julgamentos-resumo.ts';
const MODULO_IDENT = 'lib/identificador-respondente.ts';

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
const { aggregateMatrix } = require('@/lib/aggregation');
const {
  identificarRespondente,
  extractRespondentId,
} = require('@/lib/identificador-respondente');
const { resumirJulgamentos, resumirPainel, SERIALIZACAO_JULGAMENTOS } = require('@/lib/julgamentos-resumo');
const fixture = require('./fixtures/panel-2026.json');
/* eslint-enable @typescript-eslint/no-var-requires */

const PROJETO = 'projeto-a12-rastreabilidade';
const ALTERNATIVAS = [
  { code: 'A1', name: 'Alternativa um', description: '' },
  { code: 'A2', name: 'Alternativa dois', description: '' },
];
const JULGAMENTOS: any[][] = (fixture as any).responses.map((r: any) => r.judgments);

const idAlfa = (i: number) => `ident-alfa-${String(i).padStart(2, '0')}`;
const idBeta = (i: number) => `ident-beta-${String(i).padStart(2, '0')}`;
const copia = (x: any) => JSON.parse(JSON.stringify(x));

type Entrada = { docId: string; respondentId?: string; judgments: any[]; completedAt?: string; extra?: any };

function montarStore(cadastrados: string[], respostas: Entrada[]) {
  store.projects = [
    { id: PROJETO, data: { name: 'Painel de rastreabilidade', description: '', alternatives: ALTERNATIVAS } },
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

/** Um painel de dez respondentes com o prefixo dado. */
function painel(ident: (i: number) => string, n = 10): { cadastrados: string[]; respostas: Entrada[] } {
  const cadastrados = Array.from({ length: n }, (_, i) => ident(i + 1));
  const respostas = cadastrados.map((id, i) => ({
    docId: `doc-${id}`,
    respondentId: id,
    judgments: copia(JULGAMENTOS[i % JULGAMENTOS.length]),
    completedAt: `2026-09-01T0${i % 10}:00:00.000Z`,
  }));
  return { cadastrados, respostas };
}

/**
 * ⚠ **O julgamento que a agregação EFETIVAMENTE lê.** Medido: o primeiro `bocr` do
 * fixture é `B×O` com `favors: 'equal'`, e `lib/aggregation.ts` força `saatyValue = 1`
 * nesse ramo — alterar o valor dele **não muda o resultado**. Um controle que o
 * escolhesse não discriminaria, e foi o que aconteceu na primeira execução deste
 * instrumento. A escolha passa a ser **explícita e conferida**, e não posicional.
 */
function bocrQueAAgregacaoLe(judgments: any[]): any {
  const j = judgments.find(
    (x: any) => x.type === 'bocr' && x.favors !== 'equal' && !x.skipped && x.saatyValue != null
  );
  if (!j) throw new Error('nenhum julgamento bocr efetivamente lido pela agregacao');
  return j;
}

/** ⚠ Remove o que é do INSTANTE e o que é da EXECUÇÃO, e nada mais. */
const semInstanteNemExecucao = (d: any) => {
  const c = copia(d);
  delete c.calculatedAt;
  delete c.executionId;
  return JSON.stringify(c);
};

let MED: any;

// ============================================================ 1
test('1: paineis de identidades diferentes gravam documentos DIFERENTES, e a diferenca aparece', async () => {
  const a = painel(idAlfa);
  montarStore(a.cadastrados, a.respostas);
  const rA = await rodar();
  const b = painel(idBeta);
  montarStore(b.cadastrados, b.respostas);
  const rB = await rodar();

  expect(rA.gravado).toBeDefined();
  expect(rB.gravado).toBeDefined();
  // ⚠ A diferenca fora de calculatedAt e de executionId.
  expect(semInstanteNemExecucao(rA.gravado)).not.toBe(semInstanteNemExecucao(rB.gravado));
  // ⚠ E ela aparece NOS CAMPOS NOMEADOS, e nao em qualquer lugar.
  expect(rA.gravado.metadata.includedRespondents.map((i: any) => i.respondentId))
    .not.toEqual(rB.gravado.metadata.includedRespondents.map((i: any) => i.respondentId));
  expect(rA.gravado.metadata.judgmentsDigest.panel).not.toBe(rB.gravado.metadata.judgmentsDigest.panel);

  // ⚠ CONTRAEXEMPLO: o MESMO painel duas vezes gera documentos IGUAIS fora dos dois campos.
  montarStore(a.cadastrados, a.respostas);
  const rA2 = await rodar();
  expect(semInstanteNemExecucao(rA2.gravado)).toBe(semInstanteNemExecucao(rA.gravado));
  MED = { painelA: rA.gravado, painelB: rB.gravado, painelARepetido: rA2.gravado };
});

// ============================================================ 2
test('2: resposta sem respondentId, com documento cadastrado, registra response.id e o docId', async () => {
  const docId = 'doc-sem-respondentid';
  montarStore([docId, idAlfa(2)], [
    { docId, judgments: copia(JULGAMENTOS[0]), completedAt: '2026-09-01T00:00:00.000Z' },
    { docId: `doc-${idAlfa(2)}`, respondentId: idAlfa(2), judgments: copia(JULGAMENTOS[1]), completedAt: '2026-09-01T01:00:00.000Z' },
  ]);
  const { gravado } = await rodar();
  const item = gravado.metadata.includedRespondents.find((i: any) => i.respondentId === docId);
  expect(item).toBeDefined();
  expect(item.identifierSource).toBe('response.id');
  expect(item.responseDocId).toBe(docId);
  // ⚠ CONTROLE de que a assercao discrimina: quem TEM respondentId nao usa response.id.
  const outro = gravado.metadata.includedRespondents.find((i: any) => i.respondentId === idAlfa(2));
  expect(outro.identifierSource).toBe('respondentId');
  expect(outro.responseDocId).toBe(`doc-${idAlfa(2)}`);
});

// ============================================================ 3
test('3: identificadores das quatro etapas coincidem, e divergencia PARA e nomeia', async () => {
  // Caso que PASSA: painel normal, com as quatro etapas concordando para todo incluído.
  const a = painel(idAlfa, 3);
  montarStore(a.cadastrados, a.respostas);
  const ok = await rodar();
  expect(ok.status).toBe(200);
  expect(ok.gravado.metadata.includedRespondents).toHaveLength(3);

  // ⚠ CONTRAEXEMPLO CONSTRUÍDO: uma resposta cujo identificador vem do FALLBACK POR
  //   POSIÇÃO, atrás de uma órfã que cai na validação cruzada. O índice muda entre as
  //   etapas, e com ele o valor: `respondente_2` na validação cruzada e `respondente_1`
  //   na deduplicação.
  montarStore(['respondente_2'], [
    { docId: 'doc-orfa', respondentId: 'orfao-nao-cadastrado', judgments: copia(JULGAMENTOS[0]), completedAt: '2026-09-01T00:00:00.000Z' },
    { docId: 'doc-sem-id', judgments: copia(JULGAMENTOS[1]), completedAt: '2026-09-01T01:00:00.000Z', extra: { id: '' } },
  ]);
  const div = await rodar();
  expect(div.status).toBe(409);
  expect(div.corpo.success).toBe(false);
  expect(div.corpo.error).toMatch(/Identificador divergente entre as etapas/);
  // ⚠ NOMEIA a resposta, as etapas e os valores.
  expect(div.corpo.identificadorDivergente.responseDocId).toBe('doc-sem-id');
  const etapas = div.corpo.identificadorDivergente.etapas;
  expect(etapas.map((e: any) => e.etapa)).toEqual([
    'validacaoCruzada', 'deduplicacao', 'filtroDeExcluidos', 'portaoDeCompletude',
  ]);
  expect(etapas.find((e: any) => e.etapa === 'validacaoCruzada').valor).toBe('respondente_2');
  expect(etapas.find((e: any) => e.etapa === 'deduplicacao').valor).toBe('respondente_1');
  expect(div.corpo.identificadorDivergente.valoresDistintos.length).toBeGreaterThan(1);
  // ⚠ E NAO ESCREVE.
  expect(setDocSpy).not.toHaveBeenCalled();
});

// ============================================================ 4
test('4: orfa, duplicata, excluido e rejeitado NAO entram, e os dois ultimos ficam nos seus campos', async () => {
  const base = painel(idAlfa, 4);
  const mutilado = copia(JULGAMENTOS[0]);
  const i = mutilado.findIndex((x: any) => x.type === 'subcriteria' && x.group === 'O' && x.itemA === 'O1' && x.itemB === 'O2');
  mutilado.splice(i, 1);
  montarStore(base.cadastrados, [
    ...base.respostas,
    { docId: 'doc-orfa', respondentId: 'orfao-99', judgments: copia(JULGAMENTOS[0]), completedAt: '2026-09-01T05:00:00.000Z' },
    { docId: 'doc-dup', respondentId: idAlfa(1), judgments: copia(JULGAMENTOS[1]), completedAt: '2026-08-01T00:00:00.000Z' },
    { docId: 'doc-incompleto', respondentId: idAlfa(3), judgments: mutilado, completedAt: '2026-09-02T00:00:00.000Z' },
  ]);
  const { gravado } = await rodar({ projectId: PROJETO, excludedRespondentIds: [idAlfa(2)] });
  const ids = gravado.metadata.includedRespondents.map((n: any) => n.respondentId);

  expect(ids).not.toContain('orfao-99');
  expect(ids).not.toContain(idAlfa(2)); // excluído pelo gestor
  expect(ids).not.toContain(idAlfa(3)); // rejeitado por incompletude
  // ⚠ A duplicata nao vira respondente a mais: um item por identificador.
  expect(ids.filter((x: string) => x === idAlfa(1))).toHaveLength(1);
  // ⚠ E os dois ultimos continuam NOS SEUS CAMPOS, de proposito distinto.
  expect(gravado.metadata.excludedRespondentIds).toEqual([idAlfa(2)]);
  expect(gravado.metadata.rejectedIncomplete.map((r: any) => r.respondentId)).toContain(idAlfa(3));
  // ⚠ CONTROLE: os que ficaram ESTAO la, entao a ausencia acima nao e vacuidade.
  expect(ids).toContain(idAlfa(1));
  expect(ids).toContain(idAlfa(4));
  // ⚠ ORDEM DECLARADA: ascendente por respondentId.
  expect(ids).toEqual([...ids].sort());
});

// ============================================================ 5
test('5: judgmentsSha256 muda quando um julgamento muda, e e igual para conteudo igual', async () => {
  const a = painel(idAlfa, 2);
  montarStore(a.cadastrados, a.respostas);
  const r1 = await rodar();
  montarStore(a.cadastrados, a.respostas);
  const r2 = await rodar();
  const de = (g: any, id: string) => g.metadata.includedRespondents.find((i: any) => i.respondentId === id).judgmentsSha256;
  // Conteúdo igual em DUAS execuções: resumo igual.
  expect(de(r1.gravado, idAlfa(1))).toBe(de(r2.gravado, idAlfa(1)));

  for (const campo of ['saatyValue', 'favors'] as const) {
    const alterado = copia(a.respostas);
    const j = alterado[0].judgments.find((x: any) => x.type === 'bocr');
    j[campo] = campo === 'saatyValue' ? (j.saatyValue === 3 ? 5 : 3) : (j.favors === 'A' ? 'B' : 'A');
    montarStore(a.cadastrados, alterado);
    const r3 = await rodar();
    expect(de(r3.gravado, idAlfa(1))).not.toBe(de(r1.gravado, idAlfa(1)));
    // ⚠ CONTROLE: o OUTRO respondente, nao tocado, conserva o resumo.
    expect(de(r3.gravado, idAlfa(2))).toBe(de(r1.gravado, idAlfa(2)));
  }
});

// ============================================================ 6
test('6: rawSlider muda o resumo e NAO muda o resultado agregado, medido', async () => {
  const a = painel(idAlfa, 3);
  montarStore(a.cadastrados, a.respostas);
  const semRaw = await rodar();

  const comRaw = copia(a.respostas);
  comRaw[0].judgments.find((x: any) => x.type === 'bocr').rawSlider = 42;
  montarStore(a.cadastrados, comRaw);
  const raw = await rodar();

  const de = (g: any, id: string) => g.metadata.includedRespondents.find((i: any) => i.respondentId === id).judgmentsSha256;
  // O resumo MUDA.
  expect(de(raw.gravado, idAlfa(1))).not.toBe(de(semRaw.gravado, idAlfa(1)));
  expect(raw.gravado.metadata.judgmentsDigest.panel).not.toBe(semRaw.gravado.metadata.judgmentsDigest.panel);
  // ⚠ E o RESULTADO AGREGADO nao muda: `aggregateMatrix` nao le `rawSlider`.
  expect(raw.gravado.bocrWeights).toEqual(semRaw.gravado.bocrWeights);
  expect(raw.gravado.finalScores).toEqual(semRaw.gravado.finalScores);
  // ⚠ CONTROLE: mudar `saatyValue`, que a agregacao LE, muda os dois.
  const comSaaty = copia(a.respostas);
  const j = bocrQueAAgregacaoLe(comSaaty[0].judgments);
  expect(j.favors).not.toBe('equal'); // ⚠ o ramo `equal` ignora o valor
  j.saatyValue = j.saatyValue === 3 ? 7 : 3;
  montarStore(a.cadastrados, comSaaty);
  const saaty = await rodar();
  expect(de(saaty.gravado, idAlfa(1))).not.toBe(de(semRaw.gravado, idAlfa(1)));
  expect(saaty.gravado.bocrWeights).not.toEqual(semRaw.gravado.bocrWeights);
});

// ============================================================ 7
test('7: determinismo — ordem das chaves nao importa, ordem do array importa', () => {
  const j1 = { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'O', saatyValue: 3, favors: 'A' };
  const j2 = { favors: 'A', saatyValue: 3, itemB: 'O', itemA: 'B', group: 'BOCR', type: 'bocr' };
  expect(resumirJulgamentos([j1])).toBe(resumirJulgamentos([j2]));
  const outro = { ...j1, itemA: 'C' };
  expect(resumirJulgamentos([j1, outro])).not.toBe(resumirJulgamentos([outro, j1]));
  // ⚠ CONTROLE: a mesma ordem da o mesmo resumo.
  expect(resumirJulgamentos([j1, outro])).toBe(resumirJulgamentos([j1, outro]));
});

// ============================================================ 8
test('8: -0 e 0 dao o mesmo resumo, e NaN em rawSlider suspende o resumo SEM excluir ninguem', async () => {
  expect(resumirJulgamentos([{ v: -0 }])).toBe(resumirJulgamentos([{ v: 0 }]));

  const a = painel(idAlfa, 3);
  montarStore(a.cadastrados, a.respostas);
  const limpo = await rodar();

  // ⚠ NaN entra em `rawSlider`, e NAO em `saatyValue`: `isValidSaatyValue` exige
  //   Number.isInteger, que reprova NaN, entao `saatyValue: NaN` cairia no portao de
  //   completude e nunca chegaria a montagem — o ensaio nao exercitaria o que se quer.
  const comNaN = copia(a.respostas);
  comNaN[0].judgments.find((x: any) => x.type === 'bocr').rawSlider = NaN;
  montarStore(a.cadastrados, comNaN);
  const nan = await rodar();

  const item = nan.gravado.metadata.includedRespondents.find((i: any) => i.respondentId === idAlfa(1));
  // O respondente PERMANECE INCLUIDO: esta etapa e de rastreabilidade, e nao e portao.
  expect(item).toBeDefined();
  expect(nan.gravado.metadata.includedRespondents).toHaveLength(3);
  // O resultado agregado e IDENTICO ao do mesmo painel sem o NaN.
  expect(nan.gravado.bocrWeights).toEqual(limpo.gravado.bocrWeights);
  expect(nan.gravado.finalScores).toEqual(limpo.gravado.finalScores);
  // ⚠ nulo, motivo NOMEADO, e o painel nulo COM motivo. Nunca zero nem vazio.
  expect(item.judgmentsSha256).toBeNull();
  expect(item.judgmentsUnavailableReason).toMatch(/NaN/);
  expect(item.judgmentsUnavailableReason).toContain('rawSlider');
  expect(nan.gravado.metadata.judgmentsDigest.panel).toBeNull();
  expect(nan.gravado.metadata.judgmentsDigest.unavailableReason).toMatch(/resumo individual indisponivel/);
  // ⚠ CONTROLE: sem o NaN, os tres tem resumo e o painel tambem.
  for (const i of limpo.gravado.metadata.includedRespondents) {
    expect(i.judgmentsSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(i.judgmentsUnavailableReason).toBeNull();
  }
  expect(limpo.gravado.metadata.judgmentsDigest.panel).toMatch(/^[0-9a-f]{64}$/);
  expect(limpo.gravado.metadata.judgmentsDigest.serialization).toBe(SERIALIZACAO_JULGAMENTOS);
  expect(limpo.gravado.metadata.judgmentsDigest.algorithm).toBe('sha256');
});

// ============================================================ 9
test('9: o resumo do painel nao depende da ordem de retorno do Firestore, e muda com o conteudo', async () => {
  const a = painel(idAlfa, 4);
  montarStore(a.cadastrados, a.respostas);
  const direto = await rodar();
  montarStore(a.cadastrados, [...a.respostas].reverse());
  const invertido = await rodar();
  expect(invertido.gravado.metadata.judgmentsDigest.panel).toBe(direto.gravado.metadata.judgmentsDigest.panel);
  // ⚠ E a lista sai na MESMA ordem declarada, qualquer que seja a de retorno.
  expect(invertido.gravado.metadata.includedRespondents.map((i: any) => i.respondentId))
    .toEqual(direto.gravado.metadata.includedRespondents.map((i: any) => i.respondentId));

  // ⚠ CONTROLE: mudar o conteudo de UM respondente muda o resumo do painel.
  const mudado = copia(a.respostas);
  const j = mudado[1].judgments.find((x: any) => x.type === 'bocr');
  j.saatyValue = j.saatyValue === 3 ? 7 : 3;
  montarStore(a.cadastrados, mudado);
  const outro = await rodar();
  expect(outro.gravado.metadata.judgmentsDigest.panel).not.toBe(direto.gravado.metadata.judgmentsDigest.panel);
});

// ============================================================ 10
test('10: executionId difere entre execucoes, e esta no documento E no corpo da resposta', async () => {
  const a = painel(idAlfa, 2);
  montarStore(a.cadastrados, a.respostas);
  const r1 = await rodar();
  montarStore(a.cadastrados, a.respostas);
  const r2 = await rodar();

  expect(typeof r1.gravado.executionId).toBe('string');
  expect(r1.gravado.executionId.length).toBeGreaterThan(10);
  expect(r1.gravado.executionId).not.toBe(r2.gravado.executionId);
  expect(r1.corpo.calculation.executionId).toBe(r1.gravado.executionId);
  // ⚠ NAO deriva de calculatedAt: instante nao e identidade.
  expect(r1.gravado.executionId).not.toContain(r1.gravado.calculatedAt);
  // ⚠ CONTROLE: o resto do documento e IGUAL entre as duas, fora instante e execucao.
  expect(semInstanteNemExecucao(r1.gravado)).toBe(semInstanteNemExecucao(r2.gravado));
});

// ============================================================ 11
test('11: extractRespondentId preservado nos NOVE elos, sobre a funcao real do modulo', () => {
  const elos: [string, any, string][] = [
    ['respondentId', { respondentId: 'v1', visitorId: 'v2', id: 'v3' }, 'v1'],
    ['visitorId', { visitorId: 'v2', id: 'v3' }, 'v2'],
    ['response.id', { id: 'v3', responses: { respondentId: 'v4' } }, 'v3'],
    ['responses.respondentId', { responses: { respondentId: 'v4', visitorId: 'v5' } }, 'v4'],
    ['responses.visitorId', { responses: { visitorId: 'v5' } }, 'v5'],
    ['data.respondentId', { data: { respondentId: 'v6' } }, 'v6'],
    ['userId', { userId: 'v7' }, 'v7'],
    ['email', { email: 'v8@exemplo.org' }, 'v8'],
    ['fallbackPorIndice', {}, 'respondente_4'],
  ];
  for (const [fonte, entrada, esperado] of elos) {
    const r = identificarRespondente(entrada, 3);
    expect(r.fonte).toBe(fonte);
    expect(r.valor).toBe(esperado);
    // ⚠ E `extractRespondentId` devolve EXATAMENTE o mesmo valor, porque e reimplementado
    //   SOBRE a mesma cadeia, e nao ao lado dela.
    expect(extractRespondentId(entrada, 3)).toBe(esperado);
  }
  // ⚠ As sentinelas do codigo original continuam valendo: 'undefined' e 'null' como
  //   TEXTO nao servem de identidade, e a cadeia segue para o elo seguinte.
  expect(identificarRespondente({ respondentId: 'undefined', visitorId: 'bom' }, 0).fonte).toBe('visitorId');
  expect(identificarRespondente({ respondentId: 'null', visitorId: 'bom' }, 0).fonte).toBe('visitorId');
  expect(identificarRespondente({ respondentId: '', visitorId: 'bom' }, 0).fonte).toBe('visitorId');
  // ⚠ E o valor e SEMPRE string, inclusive de numero.
  expect(identificarRespondente({ respondentId: 7 }, 0).valor).toBe('7');
});

// ============================================================ controles migrados
test('MIGRADO: os quatro conjuntos continuam distinguidos, e o documento nomeia os incluidos', async () => {
  const base = painel(idAlfa, 4);
  montarStore([...base.cadastrados, 'orfao-nao'], [
    ...base.respostas,
    { docId: 'doc-orfa', respondentId: 'orfao-99', judgments: copia(JULGAMENTOS[0]), completedAt: '2026-09-01T05:00:00.000Z' },
  ]);
  const { gravado, corpo } = await rodar({ projectId: PROJETO, excludedRespondentIds: [idAlfa(2)] });
  expect(gravado.responseCount).toBe(3);
  expect(gravado.metadata.includedRespondents).toHaveLength(3);
  expect(gravado.metadata.excludedRespondentIds).toEqual([idAlfa(2)]);
  expect(gravado.metadata.rejectedIncomplete).toEqual([]);
  // ⚠ O que a etapa 2 muda: a identidade dos INCLUIDOS passa a existir no documento e no corpo.
  expect(corpo.calculation.metadata.includedRespondents).toHaveLength(3);
});

test('MIGRADO: orfa e duplicata caem no caminho, e agora o documento diz quem ficou', async () => {
  const base = painel(idAlfa, 3);
  montarStore(base.cadastrados, [
    ...base.respostas,
    { docId: 'doc-orfa', respondentId: 'orfao-99', judgments: copia(JULGAMENTOS[0]), completedAt: '2026-09-01T05:00:00.000Z' },
    { docId: 'doc-dup', respondentId: idAlfa(1), judgments: copia(JULGAMENTOS[2]), completedAt: '2026-08-01T00:00:00.000Z' },
  ]);
  const { gravado } = await rodar();
  const serializado = JSON.stringify(gravado);
  expect(serializado).not.toContain('orfao-99');
  expect(gravado.metadata.includedRespondents).toHaveLength(3);
  // ⚠ A duplicata mais recente prevalece, e o docId gravado e o dela.
  const um = gravado.metadata.includedRespondents.find((i: any) => i.respondentId === idAlfa(1));
  expect(um.responseDocId).toBe(`doc-${idAlfa(1)}`);
});

test('MIGRADO: a identidade cai na agregacao, e a saida so tem os quatro campos', () => {
  const rs = [0, 1].map(i => ({ respondentId: `x-${i}`, judgments: copia(JULGAMENTOS[i]) }));
  const agr = (x: any[]) => aggregateMatrix(x, 'bocr', 'BOCR', ['B', 'O', 'C', 'R']);
  const saida = agr(rs);
  expect(Object.keys(saida).sort()).toEqual(['filledCells', 'isComplete', 'matrix', 'totalCells']);
  // Trocar SO os identificadores nao muda a saida.
  const renomeados = rs.map((r, i) => ({ ...r, respondentId: `z-${i}` }));
  expect(agr(renomeados)).toEqual(saida);
  // ⚠ CONTROLE: mudar um julgamento muda, entao a igualdade acima nao e trivial.
  const alterado = copia(rs);
  const j = bocrQueAAgregacaoLe(alterado[0].judgments);
  expect(j.favors).not.toBe('equal');
  j.saatyValue = j.saatyValue === 3 ? 7 : 3;
  expect(agr(alterado)).not.toEqual(saida);
});

/**
 * ⚠ **MIGRADO: PARTICIPAÇÃO PARCIAL POR CÉLULA, e não remoção de respondente.** O painel
 * fica o mesmo, e **um único julgamento** passa a `skipped`. Comparar um respondente
 * contra dois mediria outra coisa — o efeito de retirar um respondente inteiro —, e **não
 * preservaria a cobertura original**.
 *
 * ⚠ **A célula é escolhida e CONFERIDA, e a conferência usa a própria `aggregateMatrix`:**
 * com um respondente só, a média geométrica de um valor **é** aquele valor, então a célula
 * de `agr([r0])` e a de `agr([r1])` são as duas contribuições **já orientadas**, depois da
 * inversão que a agregação faz conforme `favors` e a posição de `itemA`. ⚠ **Exigir
 * `favors !== 'equal'` NÃO bastaria:** se as contribuições orientadas coincidissem,
 * retirar uma não mudaria a média geométrica e o controle não discriminaria.
 */
test('MIGRADO: um julgamento pulado muda a celula, e a matriz continua completa', () => {
  const ITENS = ['B', 'O', 'C', 'R'];
  const iB = ITENS.indexOf('B');
  const iC = ITENS.indexOf('C');
  const agr = (x: any[]) => aggregateMatrix(x, 'bocr', 'BOCR', ITENS);
  const rs = [0, 1].map(i => ({ respondentId: `x-${i}`, judgments: copia(JULGAMENTOS[i]) }));

  // ⚠ PREMISSA CONFERIDA: as duas contribuicoes orientadas na celula (B,C) DIFEREM.
  const soA = agr([rs[0]]);
  const soB = agr([rs[1]]);
  expect(soA.matrix[iB][iC]).not.toBeNull();
  expect(soB.matrix[iB][iC]).not.toBeNull();
  expect(soA.matrix[iB][iC]).not.toBe(soB.matrix[iB][iC]);

  const semPulo = agr(rs);

  // O MESMO painel, com UM julgamento marcado como pulado.
  const comPulo = copia(rs);
  const alvo = comPulo[0].judgments.find(
    (j: any) => j.type === 'bocr' &&
      ((j.itemA === 'B' && j.itemB === 'C') || (j.itemA === 'C' && j.itemB === 'B'))
  );
  expect(alvo).toBeDefined();
  expect(alvo.favors).not.toBe('equal'); // ⚠ o ramo `equal` ignora o valor
  alvo.skipped = true;
  const depois = agr(comPulo);

  // A celula MUDA de valor.
  expect(depois.matrix[iB][iC]).not.toBe(semPulo.matrix[iB][iC]);
  // ⚠ E passa a valer a contribuicao do OUTRO respondente, sozinha.
  expect(depois.matrix[iB][iC]).toBe(soB.matrix[iB][iC]);
  // A matriz CONTINUA COMPLETA, porque o outro respondente preenche a celula.
  expect(depois.isComplete).toBe(true);
  expect(semPulo.isComplete).toBe(true);
  // E as celulas preenchidas dos dois lados PERMANECEM.
  expect(depois.filledCells).toBe(semPulo.filledCells);
  expect(depois.totalCells).toBe(semPulo.totalCells);
  // ⚠ A saida NAO registra quem contribuiu: os quatro campos nao trazem identidade.
  expect(Object.keys(depois).sort()).toEqual(['filledCells', 'isComplete', 'matrix', 'totalCells']);
  expect(JSON.stringify(depois)).not.toContain('x-0');
  expect(JSON.stringify(depois)).not.toContain('x-1');

  // ⚠ CONTROLE de que o ensaio DISCRIMINA: pular um julgamento numa celula cujas duas
  //   contribuicoes orientadas COINCIDEM nao muda a celula. Medido: (C,R) e essa celula.
  const iR = ITENS.indexOf('R');
  expect(agr([rs[0]]).matrix[iC][iR]).toBe(agr([rs[1]]).matrix[iC][iR]);
  const puloInocuo = copia(rs);
  const outro = puloInocuo[0].judgments.find(
    (j: any) => j.type === 'bocr' &&
      ((j.itemA === 'C' && j.itemB === 'R') || (j.itemA === 'R' && j.itemB === 'C'))
  );
  outro.skipped = true;
  expect(agr(puloInocuo).matrix[iC][iR]).toBe(semPulo.matrix[iC][iR]);
});

// ============================================================ o artefato
test('o artefato gravado coincide com a medicao atual', () => {
  const medicao = {
    rodada: 'A.12 etapa 2, rastreabilidade da execucao atual',
    natureza:
      'MEDE O COMPORTAMENTO DE HOJE. A medicao historica esta congelada em a12-identidade, e nao se confunde com esta.',
    identificacao: {
      codigo: Object.fromEntries([ROTA_CALCULO, MODULO_RESUMO, MODULO_IDENT].map(f => [f, shaArquivo(f)])),
      serializacao: SERIALIZACAO_JULGAMENTOS,
    },
    camposNovos: {
      topo: ['executionId'],
      metadata: ['includedRespondents', 'judgmentsDigest'],
      porIncluido: ['respondentId', 'responseDocId', 'identifierSource', 'judgmentsSha256', 'judgmentsUnavailableReason'],
    },
    ordemDeclarada: {
      includedRespondents: 'respondentId ascendente',
      paresDoPainel: 'respondentId ascendente',
    },
    etapaDeOrigemDoIdentificador: 'deduplicacao',
    etapasDaConcordancia: ['validacaoCruzada', 'deduplicacao', 'filtroDeExcluidos', 'portaoDeCompletude'],
    foraDaConcordancia: 'o log do fallback, que NAO e etapa de selecao',
    oQueIstoNaoResolve: [
      'NAO preserva execucoes anteriores: o documento e unico por projeto e e sobrescrito',
      'NAO preserva o conteudo julgado: o resumo IDENTIFICA e nao guarda',
      'NAO vincula a avaliacao de qualidade aos incluidos, que e a etapa 3',
      'NAO alcanca o arquivo historico de 13/07/2026',
    ],
    oQueOResumoDemonstra:
      'O resumo identifica a representacao canonica dos julgamentos segundo a versao declarada. Sua igualdade e evidencia de igualdade dessa representacao, sob a hipotese de ausencia de colisao SHA-256; nao demonstra identidade do objeto bruto nem de toda a entrada do calculo.',
  };

  if (GRAVAR) {
    fs.mkdirSync(path.dirname(ARTEFATO), { recursive: true });
    fs.writeFileSync(ARTEFATO, JSON.stringify(medicao, null, 2) + '\n', 'utf8');
  }
  expect(fs.existsSync(ARTEFATO)).toBe(true);
  const gravado = JSON.parse(fs.readFileSync(ARTEFATO, 'utf8'));
  for (const chave of ['camposNovos', 'ordemDeclarada', 'etapaDeOrigemDoIdentificador', 'etapasDaConcordancia', 'oQueIstoNaoResolve', 'oQueOResumoDemonstra']) {
    expect(gravado[chave]).toEqual((medicao as any)[chave]);
  }
  expect(gravado.identificacao).toEqual(medicao.identificacao);
  // ⚠ CONTROLE de que a medicao nao passou por vacuidade: o primeiro ensaio rodou.
  expect(MED?.painelA?.metadata?.includedRespondents?.length).toBe(10);
});
