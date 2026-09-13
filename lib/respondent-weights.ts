/**
 * lib/respondent-weights.ts
 *
 * Pesos e consistência de UM respondente, por matriz, a partir dos julgamentos.
 *
 * Substitui o `calculateAllWeights` de `lib/ahp-ipc.ts`, que roteava entre
 * autovetor e LLSM. Aqui há um caminho só: **matriz completa, derivada pelo
 * motor**. Matriz incompleta é erro, não é caso de tratamento.
 *
 * Três coisas do módulo antigo NÃO vieram, e a ausência é o ponto:
 *
 * 1. **O ramo LLSM.** O instrumento aceita somente respostas completas (A.21).
 * 2. **O `calcSafe`**, que capturava erro de conectividade e devolvia
 *    `emptyResult` — pesos uniformes com `cr: 0`. Um grupo defeituoso entrava no
 *    CR governante como consistência perfeita. Aqui o erro sobe.
 * 3. **O `emptyResult`**, pela mesma razão.
 *
 * ⚠ **Sobre o CR governante:** é o **máximo** entre as seis matrizes não triviais,
 * e essa é a medida adotada neste projeto — está fixada em
 * `docs/referencia-cr-individuais.md`, com a justificativa: a aceitação no AHP é
 * por matriz (Saaty, 1977), então o respondente só é aceitável se todas ficam sob
 * 0,10. **Esta tarefa preserva a medida.** A discussão metodológica e a
 * apresentação das diferentes medidas são de A.25; renomear o campo `avgCR` no que
 * está persistido depende da revisão do contrato de dados.
 */

import { principalEigenvector, consistency, AhpEngineError } from './ahp-engine';
import { JudgmentItem } from './types';

export interface MatrixWeights {
  /** Pesos normalizados, na ordem de `items`. */
  weights: number[];
  items: string[];
  /** CR de Saaty. Zero por construção quando n <= 2. */
  cr: number;
  /** Índice de consistência. */
  ci: number;
  lambdaMax: number;
}

export interface RespondentWeights {
  bocrWeights: MatrixWeights;
  magnitudeWeights: MatrixWeights;
  /** Por mérito: B, O, C, R. */
  subWeights: Record<string, MatrixWeights>;
  /** Por subcritério: B1..R5. */
  altWeights: Record<string, MatrixWeights>;
  /**
   * CR governante: o MAIOR CR entre as seis matrizes não triviais — BOCR,
   * MAGNITUDE e os quatro blocos 5×5. As vinte matrizes de alternativas são 2×2,
   * com CR zero por construção, e entram na média por artefato de dimensão.
   */
  maxCR: number;
  /** Qual matriz governou o `maxCR`. */
  governingMatrix: string;
  /** Média aritmética sobre as mesmas seis matrizes, como em `referencia-cr-individuais.md`. */
  meanCR: number;
}

const MERITS = ['B', 'O', 'C', 'R'];

/**
 * Constrói a PCM completa de uma matriz. Lança se faltar qualquer par, se um par
 * aparecer duas vezes, ou se um julgamento estiver pulado ou sem valor.
 *
 * A validação de completude de uma resposta inteira é de `lib/completeness.ts`.
 * Esta guarda existe porque o motor exige matriz completa e recíproca, e porque
 * silenciar aqui recriaria o fallback que a tarefa remove.
 */
export function buildCompletePCM(
  items: string[],
  judgments: JudgmentItem[],
  group: string
): number[][] {
  const n = items.length;
  const indice = new Map(items.map((it, i) => [it, i]));
  const matrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
  const preenchido: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));

  for (const j of judgments) {
    if (j.group !== group) continue;
    const a = indice.get(j.itemA);
    const b = indice.get(j.itemB);
    if (a === undefined || b === undefined) continue;

    if (j.skipped || j.saatyValue == null) {
      throw new AhpEngineError(
        `[${group}] comparação ${j.itemA}|${j.itemB} sem valor: matriz incompleta não é calculável`
      );
    }
    if (preenchido[a][b]) {
      throw new AhpEngineError(
        `[${group}] comparação ${j.itemA}|${j.itemB} aparece mais de uma vez`
      );
    }

    // `favors` diz quem é preferido; a célula [a][b] recebe a razão itemA/itemB.
    let valor = j.saatyValue;
    if (j.favors === 'equal') valor = 1;
    else if (j.favors === 'B') valor = 1 / j.saatyValue;

    matrix[a][b] = valor;
    matrix[b][a] = 1 / valor;
    preenchido[a][b] = true;
    preenchido[b][a] = true;
  }

  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k < n; k++) {
      if (!preenchido[i][k]) {
        throw new AhpEngineError(
          `[${group}] falta a comparação ${items[i]}|${items[k]}: matriz incompleta não é calculável`
        );
      }
    }
  }

  return matrix;
}

/** Pesos e consistência de uma matriz completa, pelo motor. */
export function matrixWeights(
  items: string[],
  judgments: JudgmentItem[],
  group: string
): MatrixWeights {
  const pcm = buildCompletePCM(items, judgments, group);
  const eigen = principalEigenvector(pcm, group);
  const cons = consistency(pcm, group);
  return {
    weights: eigen.weights,
    items: [...items],
    cr: cons.cr,
    ci: cons.ci,
    lambdaMax: cons.lambdaMax
  };
}

/**
 * Percorre a hierarquia do respondente. Qualquer matriz incompleta interrompe o
 * cálculo: a resposta não deveria ter chegado aqui, e produzir número sobre dado
 * incompleto é o modo de falha que A.21 elimina.
 */
export function calculateRespondentWeights(
  judgments: JudgmentItem[],
  alternativeCodes: string[],
  subcriteriaPerMerit = 5
): RespondentWeights {
  const bocrWeights = matrixWeights(MERITS, judgments, 'BOCR');
  const magnitudeWeights = matrixWeights(MERITS, judgments, 'MAGNITUDE');

  const subWeights: Record<string, MatrixWeights> = {};
  for (const merit of MERITS) {
    const subs = Array.from({ length: subcriteriaPerMerit }, (_, i) => `${merit}${i + 1}`);
    subWeights[merit] = matrixWeights(subs, judgments, merit);
  }

  const altWeights: Record<string, MatrixWeights> = {};
  for (const merit of MERITS) {
    for (let i = 1; i <= subcriteriaPerMerit; i++) {
      const sub = `${merit}${i}`;
      altWeights[sub] = matrixWeights(alternativeCodes, judgments, sub);
    }
  }

  const naoTriviais: [string, number][] = [
    ['BOCR', bocrWeights.cr],
    ['MAGNITUDE', magnitudeWeights.cr],
    ...MERITS.map(m => [`SUB-${m}`, subWeights[m].cr] as [string, number])
  ];
  const definidos = naoTriviais.filter(([, cr]) => !Number.isNaN(cr));
  const maior = definidos.reduce((acc, cur) => (cur[1] > acc[1] ? cur : acc), definidos[0]);

  return {
    bocrWeights,
    magnitudeWeights,
    subWeights,
    altWeights,
    maxCR: maior ? maior[1] : 0,
    governingMatrix: maior ? maior[0] : '',
    meanCR: definidos.length > 0
      ? definidos.reduce((a, [, cr]) => a + cr, 0) / definidos.length
      : 0
  };
}
