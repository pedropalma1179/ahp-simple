/**
 * lib/__tests__/respondent-weights.test.ts
 *
 * Regressão do caminho migrado: o módulo novo, completo-apenas, tem de reproduzir
 * a tabela de `docs/referencia-cr-individuais.md`, computada em 09/09/2026 pelo
 * motor a partir dos 864 julgamentos do fixture.
 *
 * Os 30 casos de `characterization.test.ts` NÃO cobrem isto: eles provam que o
 * motor está preservado, e nunca passaram pelo `ahp-ipc` nem por este módulo.
 */

import { calculateRespondentWeights, buildCompletePCM, matrixWeights } from '../respondent-weights';
import { JudgmentItem } from '../types';
import fixture from './fixtures/panel-2026.json';

const RESPOSTAS = (fixture as any).responses as { id: string; judgments: JudgmentItem[] }[];
const ALTS = (fixture as any).alternatives as string[];

/** `docs/referencia-cr-individuais.md`, seção 2. Porcentagens com duas casas. */
const REFERENCIA: Record<
  string,
  { bocr: number; magn: number; b: number; o: number; c: number; r: number; medio: number; gov: number; matriz: string }
> = {
  R01: { bocr: 1.21, magn: 5.72, b: 8.45, o: 0.30, c: 11.39, r: 0.51, medio: 4.60, gov: 11.39, matriz: 'SUB-C' },
  R02: { bocr: 21.69, magn: 18.76, b: 9.07, o: 37.47, c: 37.47, r: 26.13, medio: 25.10, gov: 37.47, matriz: 'SUB-O' },
  R03: { bocr: 27.21, magn: 109.27, b: 7.18, o: 0.00, c: 13.11, r: 17.36, medio: 29.02, gov: 109.27, matriz: 'MAGNITUDE' },
  R04: { bocr: 48.02, magn: 59.03, b: 7.80, o: 9.44, c: 18.71, r: 10.35, medio: 25.56, gov: 59.03, matriz: 'MAGNITUDE' },
  R05: { bocr: 19.96, magn: 52.31, b: 46.58, o: 26.43, c: 63.59, r: 57.20, medio: 44.34, gov: 63.59, matriz: 'SUB-C' },
  R06: { bocr: 46.10, magn: 19.32, b: 17.23, o: 28.47, c: 30.08, r: 27.71, medio: 28.15, gov: 46.10, matriz: 'BOCR' },
  R07: { bocr: 9.36, magn: 25.19, b: 19.60, o: 12.08, c: 9.56, r: 15.85, medio: 15.28, gov: 25.19, matriz: 'MAGNITUDE' },
  R08: { bocr: 19.62, magn: 13.43, b: 22.09, o: 5.31, c: 23.44, r: 10.27, medio: 15.69, gov: 23.44, matriz: 'SUB-C' },
  R09: { bocr: 25.97, magn: 31.58, b: 0.00, o: 0.00, c: 9.68, r: 18.65, medio: 14.31, gov: 31.58, matriz: 'MAGNITUDE' },
  R10: { bocr: 18.00, magn: 21.99, b: 7.52, o: 8.80, c: 26.34, r: 3.08, medio: 14.29, gov: 26.34, matriz: 'SUB-C' },
  R11: { bocr: 8.45, magn: 14.41, b: 5.22, o: 11.14, c: 18.88, r: 24.02, medio: 13.68, gov: 24.02, matriz: 'SUB-R' },
  R12: { bocr: 6.94, magn: 6.25, b: 0.00, o: 3.23, c: 25.25, r: 13.11, medio: 9.13, gov: 25.25, matriz: 'SUB-C' }
};

/**
 * Porcentagem com duas casas, como na tabela de referência.
 *
 * ⚠ O `+ 0` normaliza o ZERO NEGATIVO, que o jest distingue de `0` em `toEqual`.
 * Ele não é artefato do teste: a seção 6 de `referencia-cr-individuais.md`
 * caracteriza o caso — R12 em SUB-B tem matriz perfeitamente consistente, o CR sai
 * -3,97e-16 em ponto flutuante, e a tabela registra `-0,00%`. O fenômeno tem teste
 * próprio abaixo, com a ressalva de que preservá-lo NÃO é requisito metodológico.
 */
const pct = (x: number) => Number((x * 100).toFixed(2)) + 0;

function julgamentosDe(id: string): JudgmentItem[] {
  const r = RESPOSTAS.find(x => x.id === id);
  if (!r) throw new Error(`respondente ${id} não está no fixture`);
  return JSON.parse(JSON.stringify(r.judgments));
}

describe('CRs por respondente contra a referência de 09/09/2026', () => {
  test.each(Object.keys(REFERENCIA))('%s reproduz as seis matrizes, o médio e o governante', id => {
    const esperado = REFERENCIA[id];
    const w = calculateRespondentWeights(julgamentosDe(id), ALTS);

    expect({
      bocr: pct(w.bocrWeights.cr),
      magn: pct(w.magnitudeWeights.cr),
      b: pct(w.subWeights.B.cr),
      o: pct(w.subWeights.O.cr),
      c: pct(w.subWeights.C.cr),
      r: pct(w.subWeights.R.cr)
    }).toEqual({
      bocr: esperado.bocr,
      magn: esperado.magn,
      b: esperado.b,
      o: esperado.o,
      c: esperado.c,
      r: esperado.r
    });

    expect(pct(w.maxCR)).toBe(esperado.gov);
    expect(w.governingMatrix).toBe(esperado.matriz);
    expect(pct(w.meanCR)).toBeCloseTo(esperado.medio, 1);
  });

  /**
   * ⚠ RESSALVA, e ela importa mais que o teste: **`-0` NÃO é requisito
   * metodológico.** É propriedade do último bit de um `double` numa matriz
   * perfeitamente consistente — duas classes com razão 3, B1=B2=B3 e B4=B5 —, onde
   * `lambdaMax` é exatamente `n` em aritmética real e 4,99999999999999822 em ponto
   * flutuante.
   *
   * **O critério metodológico continua sendo o CR dentro da tolerância numérica
   * definida.** Este teste existe para CARACTERIZAÇÃO: mostra que a migração
   * preserva o último bit, e não só o valor arredondado, o que é evidência de que o
   * caminho de cálculo não mudou. **Se uma mudança futura fizer este valor virar
   * `+0` ou `1e-17`, isso não é regressão metodológica** — é outra soma em ponto
   * flutuante, e o teste é que deve ser reescrito, com a nota correspondente na
   * seção 6 de `docs/referencia-cr-individuais.md`.
   */
  test('R12 em SUB-B reproduz o zero NEGATIVO da referência, seção 6', () => {
    const w = calculateRespondentWeights(julgamentosDe('R12'), ALTS);
    const cr = w.subWeights.B.cr;
    expect(cr).toBeLessThanOrEqual(0);
    expect(cr).toBeGreaterThan(-1e-15);
    expect(Object.is(Number((cr * 100).toFixed(2)), -0)).toBe(true);
    expect(w.subWeights.B.lambdaMax).toBeCloseTo(5, 12);
  });

  test('as vinte matrizes de alternativas são 2x2 com CR zero', () => {
    const w = calculateRespondentWeights(julgamentosDe('R01'), ALTS);
    const subs = Object.keys(w.altWeights);
    expect(subs).toHaveLength(20);
    for (const s of subs) {
      expect(w.altWeights[s].cr).toBe(0);
      expect(w.altWeights[s].weights).toHaveLength(2);
      expect(w.altWeights[s].weights[0] + w.altWeights[s].weights[1]).toBeCloseTo(1, 12);
    }
  });

  test('os pesos de cada matriz somam 1', () => {
    const w = calculateRespondentWeights(julgamentosDe('R06'), ALTS);
    const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    expect(soma(w.bocrWeights.weights)).toBeCloseTo(1, 12);
    expect(soma(w.magnitudeWeights.weights)).toBeCloseTo(1, 12);
    for (const m of ['B', 'O', 'C', 'R']) {
      expect(soma(w.subWeights[m].weights)).toBeCloseTo(1, 12);
    }
  });
});

describe('matriz incompleta não é calculável, e o erro sobe', () => {
  test('par faltante lança, em vez de devolver pesos uniformes', () => {
    const j = julgamentosDe('R01').filter(
      x => !(x.type === 'subcriteria' && x.group === 'C' && x.itemA === 'C1' && x.itemB === 'C2')
    );
    expect(() => calculateRespondentWeights(j, ALTS)).toThrow(/falta a comparação C1\|C2/);
  });

  test('julgamento pulado lança', () => {
    const j = julgamentosDe('R02');
    const alvo = j.find(x => x.type === 'bocr')!;
    alvo.skipped = true;
    alvo.saatyValue = null;
    expect(() => calculateRespondentWeights(j, ALTS)).toThrow(/sem valor/);
  });

  test('par duplicado lança', () => {
    const j = julgamentosDe('R03');
    const alvo = j.find(x => x.type === 'magnitude')!;
    j.push(JSON.parse(JSON.stringify(alvo)));
    expect(() => calculateRespondentWeights(j, ALTS)).toThrow(/mais de uma vez/);
  });

  test('grupo desconectado NÃO devolve pesos uniformes com CR zero', () => {
    // É o comportamento do `calcSafe` que este módulo não herda: um grupo sem
    // dado entrava no CR governante como consistência perfeita.
    const j = julgamentosDe('R04').filter(x => x.group !== 'MAGNITUDE');
    expect(() => calculateRespondentWeights(j, ALTS)).toThrow();
  });
});

describe('construção da PCM', () => {
  test('é recíproca e tem 1 na diagonal', () => {
    const pcm = buildCompletePCM(['B', 'O', 'C', 'R'], julgamentosDe('R01'), 'BOCR');
    for (let i = 0; i < 4; i++) {
      expect(pcm[i][i]).toBe(1);
      for (let k = 0; k < 4; k++) {
        expect(pcm[i][k] * pcm[k][i]).toBeCloseTo(1, 12);
      }
    }
  });

  test('a orientação segue `favors`, como o módulo antigo', () => {
    const j: JudgmentItem[] = [
      { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'O', saatyValue: 5, favors: 'A', rawSlider: -4 },
      { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'C', saatyValue: 3, favors: 'B', rawSlider: 2 },
      { type: 'bocr', group: 'BOCR', itemA: 'O', itemB: 'C', saatyValue: 7, favors: 'equal', rawSlider: 0 }
    ];
    const pcm = buildCompletePCM(['B', 'O', 'C'], j, 'BOCR');
    expect(pcm[0][1]).toBe(5); // B preferido a O
    expect(pcm[0][2]).toBeCloseTo(1 / 3, 12); // C preferido a B
    expect(pcm[1][2]).toBe(1); // iguais, valor ignorado
  });

  test('matrixWeights devolve o CR do motor para uma matriz consistente', () => {
    const j: JudgmentItem[] = [
      { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'O', saatyValue: 2, favors: 'A', rawSlider: -1 },
      { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'C', saatyValue: 4, favors: 'A', rawSlider: -3 },
      { type: 'bocr', group: 'BOCR', itemA: 'O', itemB: 'C', saatyValue: 2, favors: 'A', rawSlider: -1 }
    ];
    const w = matrixWeights(['B', 'O', 'C'], j, 'BOCR');
    // Matriz perfeitamente consistente: 4:2:1.
    expect(w.cr).toBeCloseTo(0, 9);
    expect(w.weights.map(x => Number(x.toFixed(4)))).toEqual([0.5714, 0.2857, 0.1429]);
  });
});
