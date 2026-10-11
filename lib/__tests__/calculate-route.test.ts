/**
 * lib/__tests__/calculate-route.test.ts
 *
 * Exercita o HANDLER REAL de `app/api/calculate/route.ts`, com Firestore simulado.
 *
 * Motivo de existir: até aqui **nenhum teste executava código de `app/`**. O
 * `characterization.test.ts` prova que o motor está preservado, mas **replica** o
 * `aggregateMatrix` em `orientar`/`agregarBloco` e confere os escores pelo
 * `synthesizeBOCR` do motor — e `synthesizeBOCR` tem zero ocorrências em `app/`.
 * Ou seja: aquele teste verifica componentes, não a integração da rota.
 *
 * Este arquivo fecha essa lacuna sem unificar a síntese: a rota continua usando o
 * `calculateAlternativeScores` próprio, que passa a ser **exercitado**. A
 * duplicação em relação ao `synthesizeBOCR` segue registrada como achado da seção
 * 2.4 do âncora, com tarefa própria.
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** Que as duas implementações da síntese são
 * equivalentes. Ele **roda a rota e confere contra a Tabela 12** — reproduz os
 * valores publicados no caso de referência, dentro das tolerâncias verificadas. Em
 * nenhum ponto ele compara a saída da rota com a do `synthesizeBOCR`, e equivalência
 * só caberia afirmar se comparasse as duas diretamente.
 *
 * **O que está medido é que as duas DIFEREM:** a cópia da rota tem **seis clamps
 * `EPS_GUARD = 1e-12`** — linha 307, 316 (dois), 317 (dois) e 321 — e o
 * `synthesizeBOCR` não tem nenhum. ⚠ **Diferença de implementação não é divergência
 * numérica demonstrada:** para afirmar divergência falta registrar a entrada
 * concreta, o método de síntese e as duas saídas, com eventual exceção. **A
 * pendência de unificação da seção 2.4 continua de pé, e este teste não a reduz.**
 *
 * O Firestore entra por mock, com os documentos montados do fixture do painel de
 * 2026. ⚠ **F07 A1 (adaptação deste arquivo):** o mock é o DUPLO COMPARTILHADO
 * (`helpers/firestore-duplo.ts`, que reproduz `runTransaction`), e o registro de escritas dele é o
 * que permite afirmar "nenhuma escrita". O que a adaptação passa a EXIGIR da rota:
 *   - o pedido traz `requestId` (sem ele a rota recusa; ver `f07-a1-execucoes.test.ts`);
 *   - o cálculo grava `executions/{executionId}` e `executionRequests/{requestId}`, e NADA em
 *     `calculations`;
 *   - o documento da execução contém o `calculationResult` que a rota devolve.
 * Antes, o teste exigia uma única chamada `setDoc` em `calculations/{projectId}`.
 */

import fixture from './fixtures/panel-2026.json';

// ---------------------------------------------------------------------------
// Firestore simulado
// ---------------------------------------------------------------------------

jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));
jest.mock('firebase/firestore', () => require('./helpers/firestore-duplo').moduloFirestoreSimulado());

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { duplo } = require('./helpers/firestore-duplo');

// O import tem de vir depois dos mocks.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('@/app/api/calculate/route');

// ---------------------------------------------------------------------------
// Dados
// ---------------------------------------------------------------------------

const PROJECT_ID = 'projeto-de-teste';
const PUB = (fixture as any).reference_published;
const RESPOSTAS = (fixture as any).responses as { id: string; judgments: any[] }[];

function montarStore(respostas: { id: string; judgments: any[]; completedAt?: string }[]) {
  duplo.reset();
  duplo.semear('projects', PROJECT_ID, {
    name: 'Painel de 2026',
    description: 'fixture',
    alternatives: [
      { code: 'A1', name: 'Gêmeo Digital', description: '' },
      { code: 'A2', name: 'IA Temperatura', description: '' }
    ]
  });
  respostas.forEach(r => duplo.semear('respondents', r.id, { projectId: PROJECT_ID }));
  respostas.forEach((r, i) =>
    duplo.semear('responses', `resp-${i}`, {
      projectId: PROJECT_ID,
      respondentId: r.id,
      judgments: r.judgments,
      completedAt: r.completedAt ?? `2026-05-0${(i % 9) + 1}T12:00:00.000Z`
    })
  );
}

/** Um `requestId` NOVO a cada pedido: dois pedidos no mesmo teste são dois pedidos distintos. */
let contadorDePedidos = 0;
function pedir(body: Record<string, unknown> = { projectId: PROJECT_ID }) {
  const comId = 'requestId' in body || !('projectId' in body) ? body : { ...body, requestId: `req-calc-${String(++contadorDePedidos).padStart(4, '0')}` };
  return POST({ json: async () => comId } as any);
}

/** O documento de execução gravado por uma resposta bem-sucedida. */
function execucaoGravada(body: any) {
  return duplo.ler('executions', body.executionId) as any;
}

const q4 = (x: number) => Number(x.toFixed(4));
const q2 = (x: number) => Number(x.toFixed(2));

beforeEach(() => {
  montarStore(JSON.parse(JSON.stringify(RESPOSTAS)));
});

// ---------------------------------------------------------------------------

describe('handler real de /api/calculate — painel completo', () => {
  test('os doze respondentes reproduzem os valores publicados', async () => {
    const res = await pedir();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const c = body.calculation ?? body.data ?? body;
    expect(c.responseCount).toBe(12);

    // Tabela 8 — pesos estratégicos dos méritos
    expect(c.bocrWeights.map(q4)).toEqual([
      PUB.strategic_weights.B,
      PUB.strategic_weights.O,
      PUB.strategic_weights.C,
      PUB.strategic_weights.R
    ]);

    // Tabela 8 — rescaling weights
    expect(q4(c.rescalingWeights.sb)).toBe(PUB.rescaling_weights.B);
    expect(q4(c.rescalingWeights.so)).toBe(PUB.rescaling_weights.O);
    expect(q4(c.rescalingWeights.sc)).toBe(PUB.rescaling_weights.C);
    expect(q4(c.rescalingWeights.sr)).toBe(PUB.rescaling_weights.R);

    // Consistência das seis matrizes agregadas
    expect(q4(c.bocrConsistency.lambda)).toBe(PUB.consistency.BOCR.lambdaMax);
    expect(q4(c.bocrConsistency.ci)).toBe(PUB.consistency.BOCR.ci);
    expect(q2(c.bocrConsistency.cr * 100)).toBe(PUB.consistency.BOCR.cr_pct);
    expect(q4(c.magnitudeConsistency.lambda)).toBe(PUB.consistency.MAGNITUDE.lambdaMax);
    expect(q2(c.magnitudeConsistency.cr * 100)).toBe(PUB.consistency.MAGNITUDE.cr_pct);
    for (const m of ['B', 'O', 'C', 'R']) {
      expect(q2(c.subConsistency[m].cr * 100)).toBe(PUB.consistency[`SUB-${m}`].cr_pct);
    }

    // Pesos locais dos subcritérios de Custos
    expect(c.subWeights.C.map(q4)).toEqual(PUB.sub_local_weights.C);

    // Tabela 12 — as cinco fórmulas de síntese, pelo código PRÓPRIO da rota
    const porCodigo: Record<string, any> = {};
    for (const s of c.finalScores) porCodigo[s.code] = s;
    for (const alt of ['A1', 'A2']) {
      const esperado = PUB.synthesis[alt];
      expect({
        subtractive: q4(porCodigo[alt].scoreSubtractive),
        quotientSums: q4(porCodigo[alt].scoreQuotientSums),
        additiveResidual: q4(porCodigo[alt].scoreAdditiveResidual),
        multiplicativePower: q4(porCodigo[alt].scoreMultiplicative),
        multiplicativeSimple: q4(porCodigo[alt].scoreMultSimple)
      }).toEqual(esperado);
    }

    // F07 A1: gravou a EXECUÇÃO e o PEDIDO, juntos, e nada em `calculations`
    expect(duplo.escritas.map((e: any) => `${e.col}/${e.id}`).sort()).toEqual(
      [`executions/${body.executionId}`, 'executionRequests/req-calc-0001'].sort()
    );
    expect(duplo.escritas.some((e: any) => e.col === 'calculations')).toBe(false);
  });

  test('o documento gravado não carrega mais ipcMetadata', async () => {
    // A.21: o campo saiu por consequência da remoção do IPC — é o resíduo `c` do
    // âncora, que não exige script: a próxima recomputação grava sem ele.
    const res = await pedir();
    const body = await res.json();
    const c = body.calculation ?? body.data ?? body;
    const gravado = execucaoGravada(body);
    expect(gravado.ipcMetadata).toBeUndefined();
    expect(c.ipcMetadata).toBeUndefined();
    expect(c.bocrConsistency.cr).toBeLessThan(0.1);
  });
});

describe('handler real de /api/calculate — portão de completude', () => {
  /** Remove um par de um respondente, mantendo `completedAt`. */
  function mutilar(respostas: any[], id: string) {
    const alvo = respostas.find(r => r.id === id)!;
    const i = alvo.judgments.findIndex(
      (j: any) => j.type === 'subcriteria' && j.group === 'O' && j.itemA === 'O1' && j.itemB === 'O2'
    );
    alvo.judgments.splice(i, 1);
    return alvo;
  }

  test('resposta incompleta COM completedAt é rejeitada e registrada', async () => {
    const respostas = JSON.parse(JSON.stringify(RESPOSTAS));
    mutilar(respostas, 'R05');
    montarStore(respostas);

    const res = await pedir();
    expect(res.status).toBe(200);
    const body = await res.json();
    const gravado = execucaoGravada(body);

    expect(gravado.metadata.rejectedIncomplete).toEqual([
      { respondentId: 'R05', matrizes: ['O: 1 comparação(ões) sem resposta'] }
    ]);
    expect(gravado.responseCount).toBe(11);
  });

  test('painel misto: só as respostas válidas participam, e o resultado muda', async () => {
    const completo = await pedir();
    const refBody = await completo.json();
    const refCalc = refBody.calculation ?? refBody.data ?? refBody;

    const respostas = JSON.parse(JSON.stringify(RESPOSTAS));
    mutilar(respostas, 'R05');
    montarStore(respostas);

    const res = await pedir();
    const body = await res.json();
    const c = body.calculation ?? body.data ?? body;

    expect(c.responseCount).toBe(11);
    // O respondente rejeitado não entra na agregação: com onze, os pesos mudam.
    expect(c.bocrWeights.map(q4)).not.toEqual(refCalc.bocrWeights.map(q4));
    // E a decisão do gestor continua num campo separado, vazia.
    const gravado = execucaoGravada(body);
    expect(gravado.metadata.excludedRespondentIds).toEqual([]);
    expect(gravado.metadata.rejectedIncomplete).toHaveLength(1);
  });

  test('painel inteiro inválido: 400, motivos no corpo, e NENHUMA escrita', async () => {
    const respostas = JSON.parse(JSON.stringify(RESPOSTAS));
    for (const r of respostas) mutilar(respostas, r.id);
    montarStore(respostas);

    const res = await pedir();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.rejectedIncomplete).toHaveLength(12);
    expect(body.rejectedIncomplete[0]).toEqual({
      respondentId: 'R01',
      matrizes: ['O: 1 comparação(ões) sem resposta']
    });
    // Nada é gravado: nem execução, nem pedido.
    expect(duplo.escritas).toEqual([]);
  });

  test('painel completo grava rejectedIncomplete vazio, que é o valor esperado hoje', async () => {
    const res = await pedir();
    const gravado = execucaoGravada(await res.json());
    expect(gravado.metadata.rejectedIncomplete).toEqual([]);
  });
});

describe('handler real de /api/calculate — guardas que já existem', () => {
  test('sem projectId devolve 400 e não escreve', async () => {
    const res = await pedir({} as any);
    expect(res.status).toBe(400);
    expect(duplo.escritas).toEqual([]);
  });

  test('projeto inexistente devolve 404 e não escreve', async () => {
    const res = await pedir({ projectId: 'nao-existe' });
    expect(res.status).toBe(404);
    expect(duplo.escritas).toEqual([]);
  });

  test('nenhuma resposta com completedAt devolve 400 e não escreve', async () => {
    for (const d of duplo.todos('responses')) duplo.semear('responses', d.id, { ...d.data, completedAt: '' });
    const res = await pedir();
    expect(res.status).toBe(400);
    expect(duplo.escritas).toEqual([]);
  });
});
