/**
 * lib/__tests__/helpers/consistencia-de-ensaio.ts
 *
 * Blocos `consistenciaIndividual` de ENSAIO para os testes que montam pedidos ao Parecer IA à mão.
 *
 * ⚠ **Isto não é medição.** O bloco real vem do motor, a partir de julgamentos (`lib/consistencia-individual.ts`). Estes
 * blocos servem a testes que precisam de um respondente «com CR por matriz recalculado» ou «sem CR» para exercitar o que a
 * rota faz com ele (disponibilidade, vínculo, texto, registro). O resumo (média, máximo, governante) é DERIVADO das seis
 * matrizes aqui, para o bloco ser coerente (V6); testes que querem a incoerência a fabricam de propósito.
 */

import {
  ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL,
  MATRIZES_NAO_TRIVIAIS,
  type ConsistenciaIndividual,
  type CondicaoDosJulgamentos,
  type MatrizNaoTrivial,
} from '../../consistencia-individual';

/**
 * Um bloco recalculado com as seis matrizes dadas. O resumo é derivado delas na MESMA ordem e com a mesma regra do motor
 * (média = soma/6; governante = a primeira de maior CR).
 */
export function blocoRecalculado(crs: Record<MatrizNaoTrivial, number>): ConsistenciaIndividual {
  const seis = MATRIZES_NAO_TRIVIAIS.map(m => crs[m]);
  let governante: MatrizNaoTrivial = MATRIZES_NAO_TRIVIAIS[0];
  for (const m of MATRIZES_NAO_TRIVIAIS) if (crs[m] > crs[governante]) governante = m;
  return {
    esquema: ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL,
    fonte: 'recalculado_dos_julgamentos',
    condicao: 'validos_completos',
    detalhe: null,
    defeitos: null,
    crPorMatriz: { ...crs },
    media: seis.reduce((a, b) => a + b, 0) / seis.length,
    maximo: crs[governante],
    matrizGovernante: governante,
    matrizesComCR: 6,
    matrizesEsperadas: 6,
  };
}

/** Um bloco recalculado cujo CR GOVERNANTE (o máximo) é `maximo`: BOCR vale `maximo`, e as outras cinco, a metade. */
export function blocoComMaximo(maximo: number): ConsistenciaIndividual {
  const metade = maximo / 2;
  return blocoRecalculado({ BOCR: maximo, MAGNITUDE: metade, 'SUB-B': metade, 'SUB-O': metade, 'SUB-C': metade, 'SUB-R': metade });
}

/** Um bloco SEM CR, com a condição dos julgamentos nomeada. Nenhum valor, e nenhum zero. */
export function blocoIndisponivel(
  condicao: Exclude<CondicaoDosJulgamentos, 'validos_completos'> = 'incompletos',
  detalhe = 'ensaio: julgamentos sem CR calculável'
): ConsistenciaIndividual {
  return {
    esquema: ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL,
    fonte: 'indisponivel',
    condicao,
    detalhe,
    defeitos: null,
    crPorMatriz: { BOCR: null, MAGNITUDE: null, 'SUB-B': null, 'SUB-O': null, 'SUB-C': null, 'SUB-R': null },
    media: null,
    maximo: null,
    matrizGovernante: null,
    matrizesComCR: 0,
    matrizesEsperadas: 6,
  };
}

/** O bloco de um respondente que o teste descreve por um único número: o CR governante, ou `null` para «sem CR». */
export function blocoDoMaximo(maximo: number | null | undefined): ConsistenciaIndividual {
  return typeof maximo === 'number' ? blocoComMaximo(maximo) : blocoIndisponivel();
}
