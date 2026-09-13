/**
 * lib/aggregation.ts
 *
 * Agregação dos julgamentos individuais em PCM de grupo, por média geométrica
 * (AIJ), conforme Escobar (2004) e Forman e Peniwati (1998).
 *
 * Motivo de existir: esta função era local de `app/api/calculate/route.ts` e por
 * isso **nenhum teste a executava** — o `characterization.test.ts` a replicava em
 * `orientar`/`agregarBloco`, e uma réplica não prova nada sobre o original. Foi
 * movida para cá, sem alteração de lógica, para que o handler da rota possa ser
 * exercitado em teste. É o que o comentário do `jest.config.js` chama de Fase 1.1.
 *
 * ⚠ A síntese BOCR NÃO veio junto. A rota implementa as cinco fórmulas em
 * `calculateAlternativeScores`, em código próprio, e isso é achado registrado na
 * seção 2.4 do âncora, com tarefa própria. Trazê-la para cá resolveria de passagem
 * um achado medido, e o registro perderia a medição.
 */

import { aggregateAIJ } from './ahp-engine';

/** Julgamento como a rota o consome. Igual ao `JudgmentItem`, com `rawSlider` opcional. */
export interface AggregationJudgment {
  type: 'bocr' | 'magnitude' | 'subcriteria' | 'alternatives';
  group: string;
  itemA: string;
  itemB: string;
  saatyValue: number | null;
  favors: 'A' | 'B' | 'equal';
  rawSlider?: number;
  skipped?: boolean;
}

export interface AggregationResponse {
  judgments: AggregationJudgment[];
  completedAt?: string;
  projectId?: string;
  respondentId?: string;
}

export interface AggregationResult {
  /** Matriz agregada. null = nenhum respondente fez esta comparação */
  matrix: (number | null)[][];
  /** Todas as células foram preenchidas? */
  isComplete: boolean;
  /** Número de células preenchidas (excluindo diagonal) */
  filledCells: number;
  /** Total de células possíveis (excluindo diagonal) */
  totalCells: number;
}

export function aggregateMatrix(
  responses: AggregationResponse[],
  type: string,
  group: string | null,
  items: string[]
): AggregationResult {
  const n = items.length;
  const matrix: (number | null)[][] = Array(n).fill(null).map((_, i) =>
    Array(n).fill(null).map((_, j) => (i === j ? 1 : null))
  );
  let filledCells = 0;
  const totalCells = n * (n - 1) / 2;

  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k < n; k++) {
      const values: number[] = [];

      for (const response of responses) {
        if (!response.judgments) continue;

        const judgment = response.judgments.find(jdg => {
          const typeMatch = jdg.type === type;
          const groupMatch = group === null || jdg.group === group;
          const pairMatch = (jdg.itemA === items[i] && jdg.itemB === items[k]) ||
            (jdg.itemA === items[k] && jdg.itemB === items[i]);
          return typeMatch && groupMatch && pairMatch;
        });

        // MUDANÇA IPC: ignorar judgments pulados
        if (judgment && !judgment.skipped && judgment.saatyValue != null) {
          let saatyValue = judgment.saatyValue;

          if (judgment.favors === 'equal') {
            saatyValue = 1;
          } else if (judgment.favors === 'B') {
            if (judgment.itemA === items[i]) {
              saatyValue = 1 / saatyValue;
            }
          } else if (judgment.favors === 'A') {
            if (judgment.itemA === items[k]) {
              saatyValue = 1 / saatyValue;
            }
          }

          values.push(saatyValue);
        }
      }

      if (values.length > 0) {
        const pairLabel = `${group ?? type}[${items[i]}|${items[k]}]`;
        const aggregated = aggregateAIJ(values, pairLabel);
        matrix[i][k] = aggregated;
        matrix[k][i] = 1 / aggregated;
        filledCells++;
      }
      // Se values.length === 0: matrix[i][k] permanece null (IPC)
    }
  }

  return {
    matrix,
    isComplete: filledCells === totalCells,
    filledCells,
    totalCells
  };
}
