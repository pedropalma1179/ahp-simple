/**
 * lib/completeness.ts
 *
 * Validação de COMPLETUDE INDIVIDUAL de uma resposta.
 *
 * Motivo de existir: o instrumento aceita somente respostas completas (A.21).
 * Antes desta validação, `handleFinalizeSurvey` exigia apenas grafo conectado por
 * bloco, e `calculate` filtrava por `completedAt` sem olhar conteúdo. Nos blocos de
 * alternativas, com duas alternativas, o mínimo de conectividade é UMA comparação
 * de cinco: a resposta podia ser finalizada com 16 dos 72 pares em branco.
 *
 * ⚠ CONTAGEM DE JULGAMENTOS NÃO É CRITÉRIO. Uma resposta com 72 julgamentos, um
 * par duplicado e um par faltante tem o total esperado e está incompleta. Medido:
 * o total permanece 72 e só a verificação par a par acusa. A validação aqui é
 * sempre por par, dentro de cada matriz.
 *
 * A matriz é identificada pela DUPLA `(type, group)`. Para alternativas, `group` é
 * o código do subcritério (`lib/data.ts`, em generateAllComparisons), de modo que
 * as vinte matrizes de alternativas são vinte grupos distintos, B1..R5.
 *
 * A lista de pares esperados vem de `generateAllComparisons`, a mesma função que
 * monta o questionário. Não há segunda geração de pares neste arquivo.
 */

import { Alternative, generateAllComparisons } from './data';
import { ComparisonItem, JudgmentItem } from './types';

/** Chave canônica de uma matriz: `type|group`. */
export type MatrixKey = string;

export function matrixKey(type: string, group: string): MatrixKey {
  return `${type}|${group}`;
}

/** Um par não ordenado, em forma canônica para comparação. */
function pairKey(itemA: string, itemB: string): string {
  return [itemA, itemB].sort().join('~');
}

export type MatrixDefectKind =
  | 'PAR_FALTANTE'
  | 'PAR_DUPLICADO'
  | 'PAR_FORA_DA_MATRIZ'
  | 'MATRIZ_AUSENTE'
  | 'VALOR_INVALIDO'
  | 'PULADO';

export interface MatrixDefect {
  /** `type|group` da matriz onde o defeito está. */
  matrix: MatrixKey;
  kind: MatrixDefectKind;
  /** Par envolvido, em ordem canônica. Ausente quando o defeito é da matriz. */
  pair?: [string, string];
  /** Quantas vezes o par apareceu, quando o defeito é duplicação. */
  count?: number;
}

export interface CompletenessReport {
  isComplete: boolean;
  /** Quantas matrizes a estrutura do projeto espera. */
  expectedMatrices: number;
  /** Quantos pares a estrutura do projeto espera, somando as matrizes. */
  expectedPairs: number;
  /** Pares válidos e únicos encontrados dentro das matrizes esperadas. */
  validPairs: number;
  defects: MatrixDefect[];
  /** Matrizes com pelo menos um defeito, em ordem de aparição da estrutura. */
  incompleteMatrices: MatrixKey[];
}

/**
 * Escala de Saaty: inteiros de 1 a 9. A UI grava o valor por
 * `SLIDER_TO_SAATY`; qualquer outra coisa é dado inválido, não julgamento.
 */
function isValidSaatyValue(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 9;
}

/** Agrupa os pares esperados por matriz, preservando a ordem da estrutura. */
export function expectedMatrices(alternatives?: Alternative[]): Map<MatrixKey, Set<string>> {
  const porMatriz = new Map<MatrixKey, Set<string>>();
  for (const c of generateAllComparisons(alternatives) as ComparisonItem[]) {
    const key = matrixKey(c.type, c.group);
    if (!porMatriz.has(key)) porMatriz.set(key, new Set());
    porMatriz.get(key)!.add(pairKey(c.itemA, c.itemB));
  }
  return porMatriz;
}

/**
 * Verifica uma resposta contra a estrutura do projeto.
 *
 * Aprova quando, em CADA matriz esperada, todos os pares esperados aparecem
 * EXATAMENTE UMA VEZ, com valor de Saaty válido e sem `skipped`. Julgamento fora
 * das matrizes esperadas é defeito, não é ignorado.
 */
export function checkResponseCompleteness(
  judgments: (JudgmentItem | null | undefined)[] | null | undefined,
  alternatives?: Alternative[]
): CompletenessReport {
  const esperadas = expectedMatrices(alternatives);
  const expectedPairs = Array.from(esperadas.values()).reduce((acc, s) => acc + s.size, 0);

  const defects: MatrixDefect[] = [];
  const comDefeito = new Set<MatrixKey>();
  const registrar = (d: MatrixDefect) => {
    defects.push(d);
    comDefeito.add(d.matrix);
  };

  // Contagem por matriz e par, sobre julgamentos utilizáveis.
  const vistos = new Map<MatrixKey, Map<string, number>>();
  // Pares que TÊM julgamento, mas ele foi rejeitado: pulado ou valor inválido.
  // Não voltam como PAR_FALTANTE — um defeito por par, o mais específico, senão a
  // contagem mostrada ao respondente conta o mesmo par duas vezes.
  const rejeitadosNoPar = new Map<MatrixKey, Set<string>>();
  const marcarRejeitado = (key: MatrixKey, par: string) => {
    if (!rejeitadosNoPar.has(key)) rejeitadosNoPar.set(key, new Set());
    rejeitadosNoPar.get(key)!.add(par);
  };
  for (const j of judgments ?? []) {
    if (!j) continue;
    const key = matrixKey(j.type, j.group);
    const par = pairKey(j.itemA, j.itemB);

    if (!esperadas.has(key)) {
      registrar({ matrix: key, kind: 'PAR_FORA_DA_MATRIZ', pair: [j.itemA, j.itemB] });
      continue;
    }
    if (!esperadas.get(key)!.has(par)) {
      registrar({ matrix: key, kind: 'PAR_FORA_DA_MATRIZ', pair: [j.itemA, j.itemB] });
      continue;
    }
    if (j.skipped) {
      registrar({ matrix: key, kind: 'PULADO', pair: [j.itemA, j.itemB] });
      marcarRejeitado(key, par);
      continue;
    }
    if (!isValidSaatyValue(j.saatyValue)) {
      registrar({ matrix: key, kind: 'VALOR_INVALIDO', pair: [j.itemA, j.itemB] });
      marcarRejeitado(key, par);
      continue;
    }

    if (!vistos.has(key)) vistos.set(key, new Map());
    const porPar = vistos.get(key)!;
    porPar.set(par, (porPar.get(par) ?? 0) + 1);
  }

  let validPairs = 0;
  for (const [key, paresEsperados] of esperadas) {
    const porPar = vistos.get(key);
    const rejeitados = rejeitadosNoPar.get(key);

    if ((!porPar || porPar.size === 0) && !rejeitados) {
      registrar({ matrix: key, kind: 'MATRIZ_AUSENTE' });
      continue;
    }

    for (const par of paresEsperados) {
      const n = porPar?.get(par) ?? 0;
      if (n === 0) {
        // Já houve defeito específico neste par; não conta duas vezes.
        if (rejeitados?.has(par)) continue;
        registrar({ matrix: key, kind: 'PAR_FALTANTE', pair: par.split('~') as [string, string] });
      } else if (n > 1) {
        registrar({
          matrix: key,
          kind: 'PAR_DUPLICADO',
          pair: par.split('~') as [string, string],
          count: n
        });
      } else {
        validPairs++;
      }
    }
  }

  const incompleteMatrices = Array.from(esperadas.keys()).filter(k => comDefeito.has(k));
  // Matriz fora da estrutura também conta como defeito, e não está em `esperadas`.
  for (const k of comDefeito) {
    if (!esperadas.has(k) && !incompleteMatrices.includes(k)) incompleteMatrices.push(k);
  }

  return {
    isComplete: defects.length === 0,
    expectedMatrices: esperadas.size,
    expectedPairs,
    validPairs,
    defects,
    incompleteMatrices
  };
}

/** Texto curto por matriz, para mostrar ao respondente o que falta. */
export function describeIncompleteness(report: CompletenessReport): string[] {
  const porMatriz = new Map<MatrixKey, MatrixDefect[]>();
  for (const d of report.defects) {
    if (!porMatriz.has(d.matrix)) porMatriz.set(d.matrix, []);
    porMatriz.get(d.matrix)!.push(d);
  }

  const linhas: string[] = [];
  for (const [matriz, defeitos] of porMatriz) {
    const [, group] = matriz.split('|');
    const faltantes = defeitos.filter(d => d.kind === 'PAR_FALTANTE' || d.kind === 'PULADO').length;
    const duplicados = defeitos.filter(d => d.kind === 'PAR_DUPLICADO').length;
    const invalidos = defeitos.filter(d => d.kind === 'VALOR_INVALIDO').length;
    const ausente = defeitos.some(d => d.kind === 'MATRIZ_AUSENTE');
    const fora = defeitos.filter(d => d.kind === 'PAR_FORA_DA_MATRIZ').length;

    const partes: string[] = [];
    if (ausente) partes.push('nenhuma comparação respondida');
    if (faltantes > 0) partes.push(`${faltantes} comparação(ões) sem resposta`);
    if (duplicados > 0) partes.push(`${duplicados} comparação(ões) respondida(s) mais de uma vez`);
    if (invalidos > 0) partes.push(`${invalidos} valor(es) inválido(s)`);
    if (fora > 0) partes.push(`${fora} julgamento(s) fora da estrutura do projeto`);

    linhas.push(`${group}: ${partes.join('; ')}`);
  }
  return linhas;
}
