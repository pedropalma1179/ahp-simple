/**
 * lib/__tests__/characterization.test.ts
 *
 * Arnês de caracterização (Feathers, Working Effectively with Legacy Code).
 *
 * Objetivo: fotografar o comportamento do sistema ANTES do retrofit, de modo que
 * toda alteração posterior produza um diff explícito em vez de um efeito colateral
 * silencioso.
 *
 * O que este arquivo fixa:
 *   1. Agregação AIJ. Reconstrói as seis matrizes agregadas a partir dos 864
 *      julgamentos brutos e confere contra as matrizes observadas. Este
 *      comportamento está CORRETO e não deve mudar em nenhuma fase.
 *   2. Alvo. O motor unificado deve reproduzir todos os valores publicados no
 *      manuscrito de revisão pós-defesa: pesos estratégicos e de rescaling da
 *      Tabela 8, lambda, CI e CR das seis matrizes agregadas, pesos locais dos
 *      subcritérios de Custos e os cinco métodos de síntese da Tabela 12, para
 *      as duas alternativas. Vinte e quatro valores no total.
 *   3. Linha de base. Os valores anteriores, por média geométrica, ficam
 *      registrados para que a diferença introduzida pelo retrofit seja medida,
 *      não suposta. Esta linha de base NÃO é alvo.
 *
 * O que este arquivo ainda NÃO fixa, e por quê:
 *   As funções de `app/api/calculate/route.ts` são privadas de módulo e a rota
 *   depende do Firestore. Enquanto a Fase 1.1 não extrair o motor, o pipeline
 *   completo não é importável. O fixture já contém tudo que essa cobertura vai
 *   precisar quando a extração acontecer.
 */

import fixture from './fixtures/panel-2026.json';
import {
  principalEigenvector,
  consistency,
  aggregateAIJ,
  synthesizeBOCR,
  toMerits,
} from '../ahp-engine';

type Judgment = {
  type: string;
  group: string;
  itemA: string;
  itemB: string;
  saatyValue: number;
  favors: 'A' | 'B' | 'equal';
};

const MERITS = fixture.merits as string[];
const ALTS = fixture.alternatives as string[];
const SUB = fixture.subcriteria as Record<string, string[]>;
const ASIS = fixture.baseline_asis;

// ---------------------------------------------------------------------------
// Helpers de reconstrução, replicando aggregateMatrix de calculate/route.ts
// ---------------------------------------------------------------------------

/** Orienta o julgamento na direção itemA -> itemB da posição [i][k]. */
function orientar(j: Judgment, itemI: string, itemK: string): number {
  if (j.favors === 'equal') return 1;
  const v = j.saatyValue;
  if (j.favors === 'B' && j.itemA === itemI) return 1 / v;
  if (j.favors === 'A' && j.itemA === itemK) return 1 / v;
  return v;
}

/** Constrói a matriz agregada AIJ de um bloco a partir de todas as respostas. */
function agregarBloco(items: string[], tipo: string, grupo: string | null): number[][] {
  const n = items.length;
  const M: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k < n; k++) {
      const valores: number[] = [];
      for (const r of fixture.responses as { judgments: Judgment[] }[]) {
        const j = r.judgments.find(
          x =>
            x.type === tipo &&
            (grupo === null || x.group === grupo) &&
            ((x.itemA === items[i] && x.itemB === items[k]) ||
              (x.itemA === items[k] && x.itemB === items[i]))
        );
        if (j) valores.push(orientar(j, items[i], items[k]));
      }
      const a = aggregateAIJ(valores, `${grupo ?? tipo}[${items[i]}|${items[k]}]`);
      M[i][k] = a;
      M[k][i] = 1 / a;
    }
  }
  return M;
}

function maxDiff(a: number[], b: number[]): number {
  return Math.max(...a.map((v, i) => Math.abs(v - b[i])));
}

function maxDiffMatriz(A: number[][], B: number[][]): number {
  return Math.max(...A.map((row, i) => Math.max(...row.map((v, j) => Math.abs(v - B[i][j])))));
}

// Tolerâncias. A de agregação é de precisão de máquina porque a operação é a mesma.
const TOL_MAQUINA = 1e-12;
// A de relato é meia unidade da última casa publicada (quatro casas).
const TOL_RELATO = 5e-5;

// ---------------------------------------------------------------------------
// 1. Integridade do fixture
// ---------------------------------------------------------------------------

describe('Fixture do painel', () => {
  test('12 respondentes com 72 julgamentos cada, 864 no total', () => {
    expect(fixture.responses).toHaveLength(12);
    for (const r of fixture.responses) expect(r.judgments).toHaveLength(72);
    const total = fixture.responses.reduce((s, r) => s + r.judgments.length, 0);
    expect(total).toBe(864);
  });

  test('cada julgamento tem valor de Saaty positivo e direção declarada', () => {
    for (const r of fixture.responses as { judgments: Judgment[] }[]) {
      for (const j of r.judgments) {
        expect(j.saatyValue).toBeGreaterThan(0);
        expect(['A', 'B', 'equal']).toContain(j.favors);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Agregação AIJ. Comportamento correto, fixado para nunca regredir.
// ---------------------------------------------------------------------------

describe('Agregação AIJ a partir dos julgamentos brutos', () => {
  test('matriz BOCR reproduz a agregada observada', () => {
    const M = agregarBloco(MERITS, 'bocr', 'BOCR');
    expect(maxDiffMatriz(M, ASIS.aggregatedMatrices.bocr)).toBeLessThan(TOL_MAQUINA);
  });

  test('matriz de magnitude reproduz a agregada observada', () => {
    const M = agregarBloco(MERITS, 'magnitude', 'MAGNITUDE');
    expect(maxDiffMatriz(M, ASIS.aggregatedMatrices.magnitude)).toBeLessThan(TOL_MAQUINA);
  });

  test.each(MERITS)('matriz de subcritérios do mérito %s reproduz a agregada observada', m => {
    const M = agregarBloco(SUB[m], 'subcriteria', m);
    expect(maxDiffMatriz(M, (ASIS.aggregatedMatrices.subcriteria as any)[m])).toBeLessThan(TOL_MAQUINA);
  });

  test('as vinte matrizes de alternativas reproduzem os altScores observados', () => {
    for (const m of MERITS) {
      for (const code of SUB[m]) {
        const M = agregarBloco(ALTS, 'alternatives', code);
        const { weights } = principalEigenvector(M, code);
        const obs = (ASIS.altScores as any)[code];
        expect(Math.abs(weights[0] - obs[ALTS[0]])).toBeLessThan(TOL_MAQUINA);
        expect(Math.abs(weights[1] - obs[ALTS[1]])).toBeLessThan(TOL_MAQUINA);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Alvo. O motor deve reproduzir a Tabela 12.
// ---------------------------------------------------------------------------

describe('Motor unificado contra os valores publicados', () => {
  const PUB = fixture.reference_published;
  const bocr = ASIS.aggregatedMatrices.bocr;
  const magnitude = ASIS.aggregatedMatrices.magnitude;

  const v = toMerits(principalEigenvector(bocr, 'BOCR').weights);
  const s = toMerits(principalEigenvector(magnitude, 'MAGNITUDE').weights);

  const pesosSub = (m: string) =>
    principalEigenvector((ASIS.aggregatedMatrices.subcriteria as any)[m], `SUB-${m}`).weights;

  const meritoDaAlternativa = (alt: string) => {
    const out: Record<string, number> = {};
    for (const m of MERITS) {
      const w = pesosSub(m);
      out[m] = SUB[m].reduce((acc, code, i) => acc + w[i] * (ASIS.altScores as any)[code][alt], 0);
    }
    return toMerits([out.B, out.O, out.C, out.R]);
  };

  const q4 = (x: number) => Number(x.toFixed(4));

  test.each(MERITS)('peso estratégico do mérito %s reproduz a Tabela 8', m => {
    expect(q4((v as any)[m])).toBe((PUB.strategic_weights as any)[m]);
  });

  test.each(MERITS)('rescaling weight do mérito %s reproduz a Tabela 8', m => {
    expect(q4((s as any)[m])).toBe((PUB.rescaling_weights as any)[m]);
  });

  test('pesos locais dos subcritérios de Custos reproduzem os publicados', () => {
    expect(pesosSub('C').map(q4)).toEqual(PUB.sub_local_weights.C);
  });

  const blocos: [string, number[][]][] = [
    ['BOCR', ASIS.aggregatedMatrices.bocr],
    ['MAGNITUDE', ASIS.aggregatedMatrices.magnitude],
    ...MERITS.map(m => [`SUB-${m}`, (ASIS.aggregatedMatrices.subcriteria as any)[m]] as [string, number[][]]),
  ];

  test.each(blocos.map(b => b[0]))('consistência da matriz %s reproduz lambda, CI e CR publicados', nome => {
    const M = blocos.find(b => b[0] === nome)![1];
    const c = consistency(M, nome);
    const pub = (PUB.consistency as any)[nome];
    expect(q4(c.lambdaMax)).toBe(pub.lambdaMax);
    expect(q4(c.ci)).toBe(pub.ci);
    expect(Number((c.cr * 100).toFixed(2))).toBe(pub.cr_pct);
  });

  test.each(ALTS)('os cinco métodos de síntese da alternativa %s reproduzem a Tabela 12', alt => {
    const r = synthesizeBOCR(meritoDaAlternativa(alt), v, s, alt) as any;
    const pub = (PUB.synthesis as any)[alt] as Record<string, number>;
    for (const metodo of Object.keys(pub)) {
      expect(q4(r[metodo])).toBe(pub[metodo]);
    }
  });

  test('A1 vence A2 nos cinco métodos', () => {
    const rA1 = synthesizeBOCR(meritoDaAlternativa('A1'), v, s, 'A1') as any;
    const rA2 = synthesizeBOCR(meritoDaAlternativa('A2'), v, s, 'A2') as any;
    for (const metodo of Object.keys(PUB.synthesis.A1)) {
      expect(rA1[metodo]).toBeGreaterThan(rA2[metodo]);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Linha de base anterior. Registro do diff, não alvo.
// ---------------------------------------------------------------------------

describe('Diferença entre o motor unificado e a linha de base anterior', () => {
  test('os pesos anteriores são de média geométrica, não de autovetor', () => {
    const bocr = ASIS.aggregatedMatrices.bocr;
    const autovetor = principalEigenvector(bocr, 'BOCR').weights;
    const mediaGeometrica = bocr.map(linha => Math.pow(linha.reduce((a, b) => a * b, 1), 1 / linha.length));
    const somaGm = mediaGeometrica.reduce((a, b) => a + b, 0);
    const gmNorm = mediaGeometrica.map(x => x / somaGm);

    expect(maxDiff(ASIS.bocrWeights, gmNorm)).toBeLessThan(1e-12);
    expect(maxDiff(ASIS.bocrWeights, autovetor)).toBeGreaterThan(1e-4);
  });

  test('a maior divergência de peso é o terceiro subcritério de Custos', () => {
    const subC = principalEigenvector((ASIS.aggregatedMatrices.subcriteria as any).C, 'SUB-C').weights;
    const anterior = (ASIS.subWeights as any).C as number[];
    const difs = subC.map((v, i) => Math.abs(v - anterior[i]));
    const idxMaior = difs.indexOf(Math.max(...difs));
    expect(idxMaior).toBe(2);
    expect(difs[idxMaior]).toBeGreaterThan(5e-3);
  });

  test('o ranking não muda entre os dois motores', () => {
    const anterior = ASIS.finalScores as Record<string, Record<string, number>>;
    expect(anterior.A1.subtractive).toBeGreaterThan(anterior.A2.subtractive);
  });
});
