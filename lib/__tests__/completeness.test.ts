/**
 * lib/__tests__/completeness.test.ts
 *
 * Cobre a tabela de aceite de A.21 na parte que é verificável em unidade: o que a
 * validação de completude individual aceita e o que rejeita.
 *
 * ⚠ O caso central é o do CONTROLE NEGATIVO: uma resposta com 72 julgamentos, um
 * par duplicado e um faltante, que tem o total esperado e está incompleta. Se este
 * teste passasse com uma verificação por contagem, a validação não serviria.
 */

import {
  checkResponseCompleteness,
  describeIncompleteness,
  expectedMatrices,
  matrixKey
} from '../completeness';
import { JudgmentItem } from '../types';
import fixture from './fixtures/panel-2026.json';

type Resposta = { id: string; judgments: JudgmentItem[] };
const RESPOSTAS = (fixture as any).responses as Resposta[];

/** Clona os julgamentos de um respondente real, para mutar sem afetar o fixture. */
function julgamentosDe(id: string): JudgmentItem[] {
  const r = RESPOSTAS.find(x => x.id === id);
  if (!r) throw new Error(`respondente ${id} não está no fixture`);
  return JSON.parse(JSON.stringify(r.judgments));
}

describe('estrutura esperada', () => {
  test('26 matrizes e 72 pares, com duas alternativas', () => {
    const esperadas = expectedMatrices();
    const pares = Array.from(esperadas.values()).reduce((a, s) => a + s.size, 0);
    expect(esperadas.size).toBe(26);
    expect(pares).toBe(72);
  });

  test('as vinte matrizes de alternativas são grupos distintos, um par cada', () => {
    const esperadas = expectedMatrices();
    const alternativas = Array.from(esperadas.entries()).filter(([k]) =>
      k.startsWith('alternatives|')
    );
    expect(alternativas).toHaveLength(20);
    for (const [, pares] of alternativas) expect(pares.size).toBe(1);
  });
});

describe('respostas reais do painel de 2026', () => {
  test('os doze respondentes são aceitos', () => {
    expect(RESPOSTAS).toHaveLength(12);
    for (const r of RESPOSTAS) {
      const rel = checkResponseCompleteness(r.judgments);
      expect({ id: r.id, ok: rel.isComplete, defeitos: rel.defects.length }).toEqual({
        id: r.id,
        ok: true,
        defeitos: 0
      });
      expect(rel.validPairs).toBe(72);
      expect(rel.expectedMatrices).toBe(26);
    }
  });
});

describe('rejeições', () => {
  test('par faltante é rejeitado e a matriz é nomeada', () => {
    const j = julgamentosDe('R01');
    const alvo = j.findIndex(x => x.type === 'subcriteria' && x.group === 'C');
    const removido = j.splice(alvo, 1)[0];

    const rel = checkResponseCompleteness(j);
    expect(rel.isComplete).toBe(false);
    expect(rel.validPairs).toBe(71);
    expect(rel.defects).toEqual([
      {
        matrix: matrixKey('subcriteria', 'C'),
        kind: 'PAR_FALTANTE',
        pair: [removido.itemA, removido.itemB].sort()
      }
    ]);
    expect(rel.incompleteMatrices).toEqual(['subcriteria|C']);
  });

  test('CONTROLE NEGATIVO: total de 72 preservado, um par duplicado e um faltante', () => {
    const j = julgamentosDe('R01');
    const daMatriz = j.filter(x => x.type === 'subcriteria' && x.group === 'B');
    const faltante = daMatriz[0];
    const duplicado = daMatriz[1];

    j.splice(j.indexOf(faltante), 1);
    j.push(JSON.parse(JSON.stringify(duplicado)));

    // A contagem não distingue: o total é o esperado.
    expect(j).toHaveLength(72);

    const rel = checkResponseCompleteness(j);
    expect(rel.isComplete).toBe(false);
    expect(rel.defects).toHaveLength(2);
    expect(rel.defects).toEqual(
      expect.arrayContaining([
        {
          matrix: 'subcriteria|B',
          kind: 'PAR_FALTANTE',
          pair: [faltante.itemA, faltante.itemB].sort()
        },
        {
          matrix: 'subcriteria|B',
          kind: 'PAR_DUPLICADO',
          pair: [duplicado.itemA, duplicado.itemB].sort(),
          count: 2
        }
      ])
    );
  });

  test('matriz de alternativas com o único par ausente é rejeitada', () => {
    // É o caso que a validação por conectividade deixava passar: com duas
    // alternativas, minRequired era 1 de 5 no bloco, e quatro matrizes ficavam
    // vazias sem impedir a finalização.
    const j = julgamentosDe('R02').filter(
      x => !(x.type === 'alternatives' && ['B2', 'B3', 'B4', 'B5'].includes(x.group))
    );
    expect(j).toHaveLength(68);

    const rel = checkResponseCompleteness(j);
    expect(rel.isComplete).toBe(false);
    expect(rel.defects.map(d => d.matrix).sort()).toEqual([
      'alternatives|B2',
      'alternatives|B3',
      'alternatives|B4',
      'alternatives|B5'
    ]);
    expect(rel.defects.every(d => d.kind === 'MATRIZ_AUSENTE')).toBe(true);
  });

  test('julgamento pulado é rejeitado, mesmo com o par presente', () => {
    const j = julgamentosDe('R03');
    const alvo = j.find(x => x.type === 'bocr')!;
    alvo.skipped = true;
    alvo.saatyValue = null;

    const rel = checkResponseCompleteness(j);
    expect(rel.isComplete).toBe(false);
    expect(rel.defects).toEqual([
      { matrix: 'bocr|BOCR', kind: 'PULADO', pair: [alvo.itemA, alvo.itemB].sort() }
    ]);
  });

  test.each([
    ['nulo', null],
    ['zero', 0],
    ['dez', 10],
    ['fracionário', 3.5],
    ['texto', '5' as unknown as number]
  ])('valor de Saaty %s é rejeitado', (_rotulo, valor) => {
    const j = julgamentosDe('R04');
    const alvo = j.find(x => x.type === 'magnitude')!;
    alvo.saatyValue = valor as number | null;

    const rel = checkResponseCompleteness(j);
    expect(rel.isComplete).toBe(false);
    expect(rel.defects).toEqual([
      { matrix: 'magnitude|MAGNITUDE', kind: 'VALOR_INVALIDO', pair: [alvo.itemA, alvo.itemB].sort() }
    ]);
  });

  test('item que não pertence à matriz é rejeitado, não ignorado', () => {
    const j = julgamentosDe('R05');
    const alvo = j.find(x => x.type === 'subcriteria' && x.group === 'O')!;
    alvo.itemB = 'R5';

    const rel = checkResponseCompleteness(j);
    expect(rel.isComplete).toBe(false);
    const kinds = rel.defects.map(d => d.kind).sort();
    // O par original passa a faltar, e o par inventado é registrado como fora.
    expect(kinds).toEqual(['PAR_FALTANTE', 'PAR_FORA_DA_MATRIZ']);
  });

  test('grupo inexistente é rejeitado', () => {
    const j = julgamentosDe('R06');
    j.push({ ...j[0], group: 'Z9' });

    const rel = checkResponseCompleteness(j);
    expect(rel.isComplete).toBe(false);
    expect(rel.defects).toEqual([
      { matrix: 'bocr|Z9', kind: 'PAR_FORA_DA_MATRIZ', pair: [j[0].itemA, j[0].itemB] }
    ]);
  });

  test('resposta vazia é rejeitada com as 26 matrizes ausentes', () => {
    const rel = checkResponseCompleteness([]);
    expect(rel.isComplete).toBe(false);
    expect(rel.validPairs).toBe(0);
    expect(rel.defects).toHaveLength(26);
    expect(rel.defects.every(d => d.kind === 'MATRIZ_AUSENTE')).toBe(true);
  });

  test('array esparso com buracos é rejeitado sem quebrar', () => {
    const j: (JudgmentItem | null)[] = julgamentosDe('R07');
    j[5] = null;
    j[40] = null;

    const rel = checkResponseCompleteness(j);
    expect(rel.isComplete).toBe(false);
    expect(rel.defects.every(d => d.kind === 'PAR_FALTANTE')).toBe(true);
    expect(rel.defects).toHaveLength(2);
  });
});

describe('parciais complementares entre participantes', () => {
  test('são rejeitadas individualmente, embora juntas cubram tudo', () => {
    // É a advertência de A.21: um respondente preenche o par que falta em outro, a
    // matriz agregada fecha, e cada comparação passa a ter N diferente.
    const base = julgamentosDe('R08');
    const metadeA = base.filter(x => !(x.type === 'subcriteria' && x.group === 'R'));
    const metadeB = base.filter(x => x.type === 'subcriteria' && x.group === 'R');

    const relA = checkResponseCompleteness(metadeA);
    const relB = checkResponseCompleteness(metadeB);
    expect(relA.isComplete).toBe(false);
    expect(relB.isComplete).toBe(false);

    // A união cobre a estrutura inteira — e isso não torna nenhuma das duas válida.
    const uniao = checkResponseCompleteness([...metadeA, ...metadeB]);
    expect(uniao.isComplete).toBe(true);
    expect(relA.defects.length + relB.defects.length).toBeGreaterThan(0);
  });
});

describe('texto para o respondente', () => {
  test('nomeia a matriz e o que falta nela', () => {
    const j = julgamentosDe('R09').filter(
      x => !(x.type === 'subcriteria' && x.group === 'B' && x.itemA === 'B1')
    );
    const rel = checkResponseCompleteness(j);
    const linhas = describeIncompleteness(rel);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toBe('B: 4 comparação(ões) sem resposta');
  });
});
