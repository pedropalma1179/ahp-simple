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
// F07 A8: a PROCEDÊNCIA da regravação é conferida contra o git e contra a medição (ver o helper). O escritor RECUSA.
const P = require('./helpers/procedencia-da-regravacao');
const { exigirProcedenciaCorrespondente } = P;

const RAIZ = path.resolve(__dirname, '..', '..');
const ARTEFATO = path.join(RAIZ, 'docs', 'dados', 'a12-rastreabilidade', 'medicao.json');
const GRAVAR = process.env.A12R_GRAVAR === '1';

/**
 * ⚠ **F07 A8: A ÂNCORA DA VERSÃO ANTERIOR do artefato**, fixada aqui para que os testes que a usam NÃO dependam do git
 * em tempo de execução (o CI faz `actions/checkout@v4` sem `fetch-depth`: clone raso, e `git show` de um commit antigo
 * reprova lá; é o precedente de `a33-identidade-aplicada.test.ts`). Os dois resumos vêm do git, UMA vez, e foram
 * conferidos por uma segunda implementação, independente do helper:
 *
 *   - `sha256DoHistorico`: as primeiras `entradas` da lista, em serialização canônica (chaves ordenadas);
 *   - `sha256DosCaminhos`: o conjunto de CAMINHOS de folha do artefato, SEM as folhas das entradas de procedência de
 *     índice >= `entradas`. Se nada se perdeu, e nada entrou fora das entradas novas, é igual ao da versão anterior.
 *
 * ⚠ **Quem regravar de novo troca esta âncora** (`entradas` passa a contar a entrada acrescentada, e os dois resumos
 * são recalculados sobre a versão que então estiver no HEAD). O escritor, que lê o git, confere o resto na hora.
 */
const ANCORA_DA_VERSAO_ANTERIOR = {
  obtidaDe: 'git show 35f8535:docs/dados/a12-rastreabilidade/medicao.json',
  entradas: 3,
  sha256DoHistorico: 'fe3b1440dd4cbe3144ba38a9d7d2f288f44243a65f0e9a2d3771291c58ece5ca',
  sha256DosCaminhos: '58c78dba191e4266977bb061bc93cc271f025fe5ac66b53b47c37d951fd23115',
};
const COMANDO_DE_REGRAVACAO = 'A12R_GRAVAR=1 npx jest --runInBand lib/__tests__/a12-rastreabilidade.test.ts';
const CAMINHO_DA_LISTA = ['procedenciaDasRegravacoes'];

const sha256 = (b: Buffer | string) =>
  crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : b).digest('hex');
const shaArquivo = (rel: string) => sha256(fs.readFileSync(path.join(RAIZ, rel)));

const ROTA_CALCULO = 'app/api/calculate/route.ts';
const MODULO_RESUMO = 'lib/julgamentos-resumo.ts';
const MODULO_IDENT = 'lib/identificador-respondente.ts';

// ---------------------------------------------------------------------------
// Firestore simulado. ⚠ É duplo de TESTE, e não caminho de produção.
// ---------------------------------------------------------------------------

// ⚠ F07 A1 (adaptação): o Firestore simulado é o DUPLO COMPARTILHADO (`helpers/firestore-duplo.ts`),
// que reproduz `runTransaction`. O que a rota grava é lido de `executions/{executionId}` (antes,
// do `setDoc` em `calculations/{projectId}`), e "não escreve" passa a ser `duplo.escritas` vazio.
jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));
jest.mock('firebase/firestore', () => require('./helpers/firestore-duplo').moduloFirestoreSimulado());

/* eslint-disable @typescript-eslint/no-var-requires */
const { POST } = require('@/app/api/calculate/route');
const { aggregateMatrix } = require('@/lib/aggregation');
const {
  identificarRespondente,
  extractRespondentId,
} = require('@/lib/identificador-respondente');
const { resumirJulgamentos, resumirPainel, SERIALIZACAO_JULGAMENTOS } = require('@/lib/julgamentos-resumo');
const fixture = require('./fixtures/panel-2026.json');
const { duplo } = require('./helpers/firestore-duplo');
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
  duplo.reset();
  duplo.semear('projects', PROJETO, { name: 'Painel de rastreabilidade', description: '', alternatives: ALTERNATIVAS });
  for (const id of cadastrados) duplo.semear('respondents', id, { projectId: PROJETO });
  for (const r of respostas) {
    duplo.semear('responses', r.docId, {
      projectId: PROJETO,
      ...(r.respondentId === undefined ? {} : { respondentId: r.respondentId }),
      judgments: r.judgments,
      ...(r.completedAt === undefined ? {} : { completedAt: r.completedAt }),
      ...(r.extra ?? {}),
    });
  }
}

let contadorDePedidos = 0;
async function rodar(body: Record<string, unknown> = { projectId: PROJETO }) {
  // Um `requestId` novo a cada chamada: duas chamadas no mesmo teste são dois pedidos distintos.
  const comId = 'requestId' in body ? body : { ...body, requestId: `req-a12-${String(++contadorDePedidos).padStart(4, '0')}` };
  const res = await POST({ json: async () => comId } as any);
  const corpo = await res.json();
  // O que a rota gravou: o documento de EXECUÇÃO.
  const gravado = corpo?.executionId ? (duplo.ler('executions', corpo.executionId) as any) : undefined;
  return { status: res.status ?? 200, corpo, gravado };
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
  // ⚠ F07 A1 passa a exigir que o auxiliar ignore TAMBÉM `requestId`: é o identificador do PEDIDO, e
  //   cada execução nasce de um pedido distinto, como o `executionId`. Os demais campos que F07
  //   acrescenta (`engineVersion`, `codeRevision`, `projectUpdatedAt`, `includedRespondents`,
  //   `judgmentsDigest` no topo) NÃO são ignorados: são iguais entre duas execuções do mesmo painel.
  delete c.requestId;
  return JSON.stringify(c);
};

/**
 * ⚠ **O BLOCO OBSERVADO.** É preenchido pelos ensaios enquanto eles rodam, e entra no
 * artefato separado dos campos declarativos. **Só contagens, rótulos, códigos de estado
 * HTTP e resumos de fixtures fixas** — nada de ponto flutuante.
 */
const OBSERVADO: any = {};

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

  OBSERVADO.painelAlfa = {
    incluidos: rA.gravado.metadata.includedRespondents.length,
    identifierSourceDistintos: [...new Set(rA.gravado.metadata.includedRespondents.map((i: any) => i.identifierSource))].sort(),
    incluidosComResumo: rA.gravado.metadata.includedRespondents.filter((i: any) => i.judgmentsSha256 !== null).length,
    resumoDoPainel: rA.gravado.metadata.judgmentsDigest.panel,
    serializacao: rA.gravado.metadata.judgmentsDigest.serialization,
  };
  OBSERVADO.doisPaineisDeIdentidadesDiferentes = {
    documentosIguaisForaDeInstanteEExecucao: semInstanteNemExecucao(rA.gravado) === semInstanteNemExecucao(rB.gravado),
    resumosDePainelIguais: rA.gravado.metadata.judgmentsDigest.panel === rB.gravado.metadata.judgmentsDigest.panel,
    mesmoPainelRepetidoDaDocumentoIgual: semInstanteNemExecucao(rA2.gravado) === semInstanteNemExecucao(rA.gravado),
  };
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
  expect(duplo.escritas).toEqual([]);

  OBSERVADO.execucaoValida = { http: ok.status, incluidos: ok.gravado.metadata.includedRespondents.length };
  OBSERVADO.divergenciaDeIdentificador = {
    http: div.status,
    escreveu: duplo.escritas.length > 0,
    etapasNomeadas: etapas.map((e: any) => e.etapa),
    valoresDistintos: div.corpo.identificadorDivergente.valoresDistintos.length,
  };
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

  OBSERVADO.falhaDeResumoComNaN = {
    http: nan.status,
    incluidosAntes: limpo.gravado.metadata.includedRespondents.length,
    incluidosDepois: nan.gravado.metadata.includedRespondents.length,
    respondenteContinuouIncluido: Boolean(item),
    resultadoAgregadoIdentico: JSON.stringify(nan.gravado.finalScores) === JSON.stringify(limpo.gravado.finalScores),
    resumoIndividualNulo: item.judgmentsSha256 === null,
    resumoDoPainelNulo: nan.gravado.metadata.judgmentsDigest.panel === null,
    motivoNomeiaOCaminho: item.judgmentsUnavailableReason.includes('rawSlider'),
  };
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
/**
 * ⚠ **O QUE ESTE ARTEFATO É, e o que ele não é.** A única parte derivada de execução era
 * `identificacao.codigo`; todo o resto era **declarativo**. A `natureza` anterior dizia
 * "mede o comportamento de hoje", e **excedia o conteúdo**. Agora cada campo é marcado
 * como **declarativo** ou **observado**, e as observações das execuções entram em bloco
 * próprio.
 *
 * ⚠ **Sem ponto flutuante no bloco observado**, e a razão é medida: a comparação de
 * resumos de conteúdo serializado já divergiu entre ambientes nesta tarefa, em `8879360`,
 * com **causa específica não determinada** e valores divergentes não preservados. Entram
 * apenas contagens, rótulos, códigos de estado HTTP e resumos de **fixtures fixas** —
 * conferido que os julgamentos do fixture só têm inteiros e textos.
 */
/**
 * ⚠ F07 A8: a medição, como FUNÇÃO. O texto do objeto é o de sempre, na mesma ordem de chaves e com a mesma indentação;
 * só deixou de estar dentro do corpo de um único teste, para que os testes da procedência (mais abaixo) a examinem
 * sem repeti-la. O artefato gravado não muda por causa disto.
 */
function medirAgora() {
  const medicao = {
    rodada: 'A.12 etapa 2, rastreabilidade da execucao atual',
    natureza:
      'REGISTRA CONTRATO e IDENTIDADE DO CODIGO, mais um bloco de OBSERVACOES derivadas das execucoes desta suite. ⚠ NAO e medicao de resultados observados campo a campo: classificacaoDosCampos diz o que e cada um.',
    classificacaoDosCampos: {
      'identificacao.codigo': 'OBSERVADO: sha256 dos arquivos, recomputado nesta execucao',
      'identificacao.serializacao': 'DECLARATIVO',
      camposNovos: 'DECLARATIVO',
      ordemDeclarada: 'DECLARATIVO',
      etapaDeOrigemDoIdentificador: 'DECLARATIVO',
      etapasDaConcordancia: 'DECLARATIVO',
      foraDaConcordancia: 'DECLARATIVO',
      interrupcoesPorIdentidade: 'DECLARATIVO',
      falhaDeResumoNaoInterrompe: 'DECLARATIVO',
      oQueIstoNaoResolve: 'DECLARATIVO',
      oQueOResumoDemonstra: 'DECLARATIVO',
      observacoesDasExecucoes: 'OBSERVADO: derivado das execucoes desta suite',
      procedenciaDasRegravacoes: 'DECLARATIVO: a lista acumulativa das regravacoes',
    },
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
    // ⚠ D1: as DUAS interrupcoes por identidade, distintas entre si e da falha de resumo.
    interrupcoesPorIdentidade: [
      {
        onde: 'app/api/calculate/route.ts:802',
        quando: 'os identificadores das quatro etapas de selecao divergem para algum incluido',
        http: 409,
        escreve: false,
        nomeia: ['responseDocId', 'etapas com o valor de cada uma', 'valoresDistintos'],
      },
      {
        onde: 'app/api/calculate/route.ts:838',
        quando: 'aparece identificador repetido na lista montada DEPOIS da deduplicacao',
        http: 409,
        escreve: false,
        nomeia: ['identificadoresIncluidos'],
      },
    ],
    falhaDeResumoNaoInterrompe:
      '⚠ DISTINTA das duas acima: a falha de serializacao NAO interrompe, o respondente CONTINUA entrando no calculo, e o registro fica em judgmentsSha256 nulo com judgmentsUnavailableReason nomeando o motivo e o caminho.',
    oQueIstoNaoResolve: [
      'ANTES de F07 A1 (commit be213d1, 11/10/2026) NAO preservava execucoes anteriores: a rota gravava com setDoc um documento unico por projeto, calculations/{projectId}, e o sobrescrevia. DESDE F07 A1 a rota nao escreve mais em calculations: cada execucao e gravada em um documento proprio, executions/{executionId}, junto com o pedido em executionRequests/{requestId}',
      'NAO preserva o conteudo julgado: o resumo IDENTIFICA e nao guarda',
      'NAO vincula a avaliacao de qualidade aos incluidos, que e a etapa 3',
      'NAO alcanca o arquivo historico de 13/07/2026',
    ],
    oQueOResumoDemonstra:
      'O resumo identifica a representacao canonica dos julgamentos segundo a versao declarada. Sua igualdade e evidencia de igualdade dessa representacao, sob a hipotese de ausencia de colisao SHA-256; nao demonstra identidade do objeto bruto nem de toda a entrada do calculo.',
    procedenciaDasRegravacoes: [
      {
        ordem: 1,
        motivo: 'A.12 etapa 2, P1 e D4: correcao do serializador, posicao vazia de array recusada',
        commitDaBase: '6aea77127b8e4ee6072c0677d011848b9d2911c4',
        comando: 'A12R_GRAVAR=1 npx jest --runInBand lib/__tests__/a12-rastreabilidade.test.ts',
        ambiente: { plataforma: 'linux', arch: 'x64', node: 'v22.22.2' },
        camposRegravados: ['identificacao.codigo[lib/julgamentos-resumo.ts]'],
        camposPerdidos: 0,
      },
      {
        ordem: 2,
        motivo: 'A.12 etapa 2, P3, D1, D2 e D3: a natureza passa a corresponder ao conteudo, os campos ficam classificados, e entra o bloco observado',
        commitDaBase: '70773083f0977bc92c03e4050c702f238318633d',
        comando: 'A12R_GRAVAR=1 npx jest --runInBand lib/__tests__/a12-rastreabilidade.test.ts',
        ambiente: { plataforma: 'linux', arch: 'x64', node: 'v22.22.2' },
        camposRegravados: ['natureza', 'classificacaoDosCampos', 'interrupcoesPorIdentidade', 'falhaDeResumoNaoInterrompe', 'observacoesDasExecucoes', 'procedenciaDasRegravacoes'],
        camposPerdidos: 0,
      },
      {
        ordem: 3,
        motivo: 'Fase 2 da validacao externa: extracao de MERITS e SUBCRITERIA_PER_MERIT de app/api/calculate/route.ts para lib/validacao-externa/conjunto-esperado.ts, autorizada pelo autor',
        commitDaBase: '3f6c4b98725d9013cbe46a81e9d9f7a616e5de34',
        comando: 'A12R_GRAVAR=1 npx jest --runInBand lib/__tests__/a12-rastreabilidade.test.ts',
        ambiente: { plataforma: 'linux', arch: 'x64', node: 'v22.22.2' },
        camposRegravados: ['identificacao.codigo[app/api/calculate/route.ts]', 'procedenciaDasRegravacoes'],
        valorAnterior: { 'identificacao.codigo[app/api/calculate/route.ts]': 'b42118dd04164e0c00460ec36f0b958c5fe55d9e20b8dad72a590599ca772967' },
        valorNovo: { 'identificacao.codigo[app/api/calculate/route.ts]': '0ff4238fa9bc9418f3bb6375091a1f1993091736de0be1963917398553a3eae2' },
        camposPerdidos: 0,
      },
      {
        ordem: 4,
        motivo: 'F07 A8: (1) o resumo de app/api/calculate/route.ts estava DEFASADO e a defasagem NAO vem so de A7: ainda era o do conteudo de 104a44a e mudou por DOIS commits posteriores (be213d1 A1, a rota deixa de gravar calculations e passa a gravar a execucao e o pedido; 7c043ff A7 ponto 2, a versao do motor sai de uma origem unica); (2) oQueIstoNaoResolve[0], que dizia sem data que a rota NAO preserva execucoes anteriores, foi SITUADO antes de F07 A1 (be213d1) com o comportamento atual registrado, e nao apagado (o texto foi alterado em 13729a9, antes desta regravacao, por ser campo do artefato). Os resumos de julgamentos-resumo.ts e de identificador-respondente.ts NAO mudaram, e a guarda mediu 2 campos mudados, 0 novos e 0 perdidos contra a versao de 35f8535. O artefato nao foi regravado em A1 nem em A7, e por isso nenhum dos dois commits e atribuido sozinho a mudanca do resumo.',
        commitDaBase: '13729a9abc5e22ba889134cb63751ae49b3b703b',
        comando: 'A12R_GRAVAR=1 npx jest --runInBand lib/__tests__/a12-rastreabilidade.test.ts',
        ambiente: { plataforma: 'linux', arch: 'x64', node: 'v22.22.2' },
        artefato: 'docs/dados/a12-rastreabilidade/medicao.json',
        camposRegravados: ['identificacao.codigo[app/api/calculate/route.ts]', 'oQueIstoNaoResolve[0]'],
        valorAnterior: {
          'identificacao.codigo[app/api/calculate/route.ts]': '0ff4238fa9bc9418f3bb6375091a1f1993091736de0be1963917398553a3eae2',
          'oQueIstoNaoResolve[0]': 'NAO preserva execucoes anteriores: o documento e unico por projeto e e sobrescrito',
        },
        valorNovo: {
          'identificacao.codigo[app/api/calculate/route.ts]': '9a2ae0d8acbb4c8abed7422916c8209554e3a768c3e067ddbf656a80a773d444',
          'oQueIstoNaoResolve[0]': 'ANTES de F07 A1 (commit be213d1, 11/10/2026) NAO preservava execucoes anteriores: a rota gravava com setDoc um documento unico por projeto, calculations/{projectId}, e o sobrescrevia. DESDE F07 A1 a rota nao escreve mais em calculations: cada execucao e gravada em um documento proprio, executions/{executionId}, junto com o pedido em executionRequests/{requestId}',
        },
        camposPerdidos: 0,
      },
    ],
    // ⚠ OBSERVADO, e derivado das execucoes desta suite. Sem ponto flutuante.
    observacoesDasExecucoes: OBSERVADO,
  };
  return medicao;
}

test('o artefato gravado coincide com a medicao atual', () => {
  const medicao = medirAgora();

  if (GRAVAR) {
    // ⚠ F07 A8: o escritor RECUSA regravar sem procedência correspondente a ESTA regravação. A guarda lê o git
    //   (HEAD e a versão anterior do artefato) e lança com TODAS as violações; nada é escrito. Ver o helper.
    exigirProcedenciaCorrespondente({
      raiz: RAIZ,
      artefato: 'docs/dados/a12-rastreabilidade/medicao.json',
      novo: medicao,
      caminhoDaLista: ['procedenciaDasRegravacoes'],
      comando: 'A12R_GRAVAR=1 npx jest --runInBand lib/__tests__/a12-rastreabilidade.test.ts',
      caminhoDoCodigo: ['identificacao', 'codigo'],
    });
    fs.mkdirSync(path.dirname(ARTEFATO), { recursive: true });
    fs.writeFileSync(ARTEFATO, JSON.stringify(medicao, null, 2) + '\n', 'utf8');
  }
  expect(fs.existsSync(ARTEFATO)).toBe(true);
  const gravado = JSON.parse(fs.readFileSync(ARTEFATO, 'utf8'));
  for (const chave of Object.keys(medicao)) {
    expect(gravado[chave]).toEqual((medicao as any)[chave]);
  }
  // ⚠ CONTROLE de que o bloco observado NAO passou por vacuidade: ele so existe se os
  //   ensaios que o alimentam tiverem rodado.
  expect(OBSERVADO.painelAlfa.incluidos).toBe(10);
  expect(OBSERVADO.divergenciaDeIdentificador.http).toBe(409);
  // ⚠ E nenhum valor do bloco observado e de ponto flutuante.
  const naoInteiros: string[] = [];
  const andar = (o: any, p: string) => {
    if (o && typeof o === 'object') { for (const [k, v] of Object.entries(o)) andar(v, `${p}.${k}`); }
    else if (typeof o === 'number' && !Number.isInteger(o)) naoInteiros.push(p);
  };
  andar(OBSERVADO, 'observacoesDasExecucoes');
  expect(naoInteiros).toEqual([]);
});

// ============================================================ F07 A8: a procedência, conferida contra a medição
/**
 * ⚠ **Este artefato NÃO tinha teste de invariantes da lista de procedência.** O único exame era a comparação do objeto
 * de medição com o que ele mesmo escreveu (`o artefato gravado coincide com a medicao atual`), e a lista de procedência
 * dele sai da mesma mão do que a compara. Aqui entra o equivalente do que `a12-diagnostico.test.ts` tem, mais o que
 * faltava lá: o histórico contra a âncora tirada do git, o conjunto de caminhos contra a âncora, e a existência de cada
 * caminho citado.
 *
 * ⚠ **Vacuidade, declarada:** com a lista no tamanho da âncora (nenhuma entrada nova), os testes sobre as entradas NOVAS
 * não têm o que examinar. Que a conferência não é vazia como CÓDIGO está provado em `f07-a8-procedencia.test.ts`; que
 * examina entradas REAIS vale a partir da entrada 4.
 */
describe('A8: a procedencia das regravacoes, conferida contra a medicao e contra a ancora', () => {
  const gravado = () => JSON.parse(fs.readFileSync(ARTEFATO, 'utf8'));
  const listaGravada = () => gravado().procedenciaDasRegravacoes;
  const listaDaMedicao = () => medirAgora().procedenciaDasRegravacoes;
  const BASE_DA_PRIMEIRA = '6aea77127b8e4ee6072c0677d011848b9d2911c4';

  test.each([
    ['a lista da medicao (o que a PROXIMA regravacao escreveria)', listaDaMedicao],
    ['o artefato gravado', listaGravada],
  ])('a lista acumula, tem ordem sequencial e bases distintas: %s', (_n, lista: any) => {
    expect(P.violacoesDaLista(lista())).toEqual([]);
    expect(lista().length).toBeGreaterThanOrEqual(ANCORA_DA_VERSAO_ANTERIOR.entradas);
  });

  test.each([
    ['a lista da medicao', listaDaMedicao],
    ['o artefato gravado', listaGravada],
  ])('o HISTORICO anterior esta INTACTO: as primeiras entradas tem o resumo da ancora: %s', (_n, lista: any) => {
    expect(P.resumoDoHistorico(lista(), ANCORA_DA_VERSAO_ANTERIOR.entradas)).toBe(ANCORA_DA_VERSAO_ANTERIOR.sha256DoHistorico);
    expect(lista()[0].commitDaBase).toBe(BASE_DA_PRIMEIRA); // a base da PRIMEIRA regravacao fica
  });

  test('toda entrada ANTIGA cita caminhos que EXISTEM no artefato (os containers antigos continuam valendo)', () => {
    const g = gravado();
    listaDaMedicao().slice(0, ANCORA_DA_VERSAO_ANTERIOR.entradas).forEach((e: any) => {
      expect([e.ordem, P.violacoesDaEntrada(e, g, { comando: COMANDO_DE_REGRAVACAO, estrita: false })]).toEqual([e.ordem, []]);
    });
  });

  test.each([
    ['contra a MEDICAO desta execucao', () => medirAgora()],
    ['contra o artefato gravado', gravado],
  ])('cada entrada NOVA e bem formada e ESTRITA (folha exata, nao vazia, nao generica, valores anterior e novo): %s', (_n, alvo: any) => {
    const novas = listaDaMedicao().slice(ANCORA_DA_VERSAO_ANTERIOR.entradas);
    for (const e of novas) {
      expect([e.ordem, P.violacoesDaEntrada(e, alvo(), { comando: COMANDO_DE_REGRAVACAO, estrita: true })]).toEqual([e.ordem, []]);
    }
  });

  test.each([
    ['contra a MEDICAO desta execucao', () => medirAgora()],
    ['contra o artefato gravado', gravado],
  ])('camposPerdidos e ZERO medido: o conjunto de caminhos, tirado o das entradas novas, e o da versao anterior: %s', (_n, alvo: any) => {
    expect(P.resumoDosCaminhos(alvo(), CAMINHO_DA_LISTA.join('.'), ANCORA_DA_VERSAO_ANTERIOR.entradas)).toBe(ANCORA_DA_VERSAO_ANTERIOR.sha256DosCaminhos);
  });
});

// ============================================================ F07 A8: a afirmação sobre a sobrescrita, situada no tempo
/**
 * ⚠ **A primeira linha de `oQueIstoNaoResolve` dizia, sem data, que a rota NÃO preserva execuções anteriores.** Vale para o
 * período anterior a F07 A1 (`be213d1`, 11/10/2026): ali a rota gravava `setDoc(doc(db, 'calculations', projectId), …)`, um
 * documento por projeto, sobrescrito a cada cálculo (medido em `be213d1^:app/api/calculate/route.ts:1227`). Desde A1 a rota
 * não escreve mais em `calculations`; `calculate-route.test.ts` fixa as duas escritas (`executions/{executionId}` e
 * `executionRequests/{requestId}`) e a ausência de `calculations`. A afirmação foi SITUADA, e não apagada: o texto antigo
 * continua dizendo o que valia antes.
 *
 * ⚠ Estes testes examinam a MEDIÇÃO e o FONTE. O artefato gravado é coberto pela comparação de identidade, que o iguala à
 * medição.
 */
describe('A8: oQueIstoNaoResolve[0] esta situado antes de A1, e o comentario que apontava a divida saiu', () => {
  const linha = () => medirAgora().oQueIstoNaoResolve;

  test('a primeira linha diz ANTES de A1 o que valia, e DESDE A1 o que vale, com a base e as duas colecoes', () => {
    const primeira: string = linha()[0];
    expect(primeira.startsWith('ANTES de F07 A1 (commit be213d1, 11/10/2026) NAO preservava execucoes anteriores: ')).toBe(true);
    expect(primeira).toContain('calculations/{projectId}');
    expect(primeira).toContain('o sobrescrevia');
    expect(primeira).toContain('DESDE F07 A1 a rota nao escreve mais em calculations');
    expect(primeira).toContain('executions/{executionId}');
    expect(primeira).toContain('executionRequests/{requestId}');
    // a ordem importa: o que valia ANTES precede o que vale DESDE
    expect(primeira.indexOf('ANTES de F07 A1')).toBeLessThan(primeira.indexOf('DESDE F07 A1'));
  });

  test('a afirmacao NAO ficou sem data: nenhuma linha comeca no presente sem situar, e as outras tres seguem como estavam', () => {
    const l: string[] = linha();
    expect(l.length).toBe(4);
    expect(l.some(x => x.startsWith('NAO preserva execucoes anteriores'))).toBe(false);
    expect(l.slice(1)).toEqual([
      'NAO preserva o conteudo julgado: o resumo IDENTIFICA e nao guarda',
      'NAO vincula a avaliacao de qualidade aos incluidos, que e a etapa 3',
      'NAO alcanca o arquivo historico de 13/07/2026',
    ]);
  });

  test('o comentario que apontava a divida (F07 A1: a linha DEIXOU DE VALER) saiu do fonte; nenhum comentario sobrou no literal', () => {
    const fonte = fs.readFileSync(__filename, 'utf8').split('\n');
    const abre = fonte.findIndex(l => /^ {4}oQueIstoNaoResolve: \[$/.test(l));
    expect(abre).toBeGreaterThan(-1);
    const fecha = fonte.findIndex((l, i) => i > abre && /^ {4}\],$/.test(l));
    expect(fecha).toBeGreaterThan(abre);
    const corpo = fonte.slice(abre + 1, fecha);
    expect(corpo.length).toBe(4); // quatro linhas de texto, e nenhuma de comentario
    expect(corpo.filter(l => l.trim().startsWith('//'))).toEqual([]);
  });
});
