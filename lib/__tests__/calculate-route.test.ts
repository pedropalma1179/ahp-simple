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
 * equivalentes. Ele confere a da rota contra a Tabela 12 **no caso de referência** —
 * um painel, doze respondentes, duas alternativas. **A diferença entre as duas está
 * medida:** a cópia da rota tem cinco clamps `EPS_GUARD = 1e-12` e o
 * `synthesizeBOCR` do motor não tem nenhum, o que divergiria justamente na borda,
 * com mérito de peso nulo. **A pendência de unificação da seção 2.4 continua de pé,
 * e este teste não a reduz.**
 *
 * O Firestore entra por mock, com os documentos montados do fixture do painel de
 * 2026, e o `setDoc` é espionado — é o que permite afirmar "nenhuma escrita".
 */

import fixture from './fixtures/panel-2026.json';

// ---------------------------------------------------------------------------
// Firestore simulado
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
    const found = store[ref.__col]?.find(d => d.id === ref.__id);
    return {
      exists: () => Boolean(found),
      id: ref.__id,
      data: () => found?.data
    };
  },
  getDocs: async (ref: { __col: string }) => {
    const docs = (store[ref.__col] ?? []).map(d => ({ id: d.id, data: () => d.data }));
    return { docs, size: docs.length };
  },
  setDoc: (...args: unknown[]) => {
    setDocSpy(...args);
    return Promise.resolve();
  }
}));

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
  store.projects = [
    {
      id: PROJECT_ID,
      data: {
        name: 'Painel de 2026',
        description: 'fixture',
        alternatives: [
          { code: 'A1', name: 'Gêmeo Digital', description: '' },
          { code: 'A2', name: 'IA Temperatura', description: '' }
        ]
      }
    }
  ];
  store.respondents = respostas.map(r => ({ id: r.id, data: { projectId: PROJECT_ID } }));
  store.responses = respostas.map((r, i) => ({
    id: `resp-${i}`,
    data: {
      projectId: PROJECT_ID,
      respondentId: r.id,
      judgments: r.judgments,
      completedAt: r.completedAt ?? `2026-05-0${(i % 9) + 1}T12:00:00.000Z`
    }
  }));
}

function pedir(body: Record<string, unknown> = { projectId: PROJECT_ID }) {
  return POST({ json: async () => body } as any);
}

const q4 = (x: number) => Number(x.toFixed(4));
const q2 = (x: number) => Number(x.toFixed(2));

beforeEach(() => {
  setDocSpy.mockClear();
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

    // Gravou uma vez, no documento do projeto
    expect(setDocSpy).toHaveBeenCalledTimes(1);
    expect(setDocSpy.mock.calls[0][0]).toEqual({ __col: 'calculations', __id: PROJECT_ID });
  });

  test('o documento gravado não carrega mais ipcMetadata', async () => {
    // A.21: o campo saiu por consequência da remoção do IPC — é o resíduo `c` do
    // âncora, que não exige script: a próxima recomputação grava sem ele.
    const res = await pedir();
    const body = await res.json();
    const c = body.calculation ?? body.data ?? body;
    const gravado = setDocSpy.mock.calls[0][1] as any;
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
    const gravado = setDocSpy.mock.calls[0][1] as any;

    expect(gravado.metadata.rejectedIncomplete).toEqual([
      { respondentId: 'R05', matrizes: ['O: 1 comparação(ões) sem resposta'] }
    ]);
    expect(gravado.responseCount).toBe(11);
  });

  test('painel misto: só as respostas válidas participam, e o resultado muda', async () => {
    const completo = await pedir();
    const refBody = await completo.json();
    const refCalc = refBody.calculation ?? refBody.data ?? refBody;
    setDocSpy.mockClear();

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
    const gravado = setDocSpy.mock.calls[0][1] as any;
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
    // O resultado anterior não é sobrescrito.
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  test('painel completo grava rejectedIncomplete vazio, que é o valor esperado hoje', async () => {
    await pedir();
    const gravado = setDocSpy.mock.calls[0][1] as any;
    expect(gravado.metadata.rejectedIncomplete).toEqual([]);
  });
});

describe('handler real de /api/calculate — guardas que já existem', () => {
  test('sem projectId devolve 400 e não escreve', async () => {
    const res = await pedir({} as any);
    expect(res.status).toBe(400);
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  test('projeto inexistente devolve 404 e não escreve', async () => {
    const res = await pedir({ projectId: 'nao-existe' });
    expect(res.status).toBe(404);
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  test('nenhuma resposta com completedAt devolve 400 e não escreve', async () => {
    store.responses = store.responses.map(d => ({
      ...d,
      data: { ...d.data, completedAt: '' }
    }));
    const res = await pedir();
    expect(res.status).toBe(400);
    expect(setDocSpy).not.toHaveBeenCalled();
  });
});
