/**
 * lib/consistencia-individual.ts
 *
 * **A consistência individual de UM respondente, por matriz, recalculada dos julgamentos.**
 *
 * É o produtor único do CR individual que a API de qualidade (`app/api/response-quality/route.ts`) devolve e que
 * o Parecer IA transporta. Reutiliza o motor: o CR de cada matriz, a média das seis, o máximo e a matriz
 * governante são o que `calculateRespondentWeights` (`lib/respondent-weights.ts`) devolve. **Este módulo não
 * calcula autovetor nem CR**; ele (a) decide se os julgamentos são utilizáveis, pela MESMA validação de
 * completude do instrumento (`lib/completeness.ts`), (b) chama o motor e (c) nomeia o resultado.
 *
 * ⚠ **O universo é o das seis matrizes não triviais**: BOCR e Magnitude (4×4) e os quatro blocos de
 * subcritérios (5×5). As vinte matrizes de alternativas são 2×2, o CR delas é zero por construção, e incluí-las
 * puxaria qualquer média para baixo por artefato de dimensão (`docs/referencia-cr-individuais.md`, §1).
 *
 * ⚠ **Ausência não vira zero.** `null` em `crPorMatriz` significa «não calculado». `0` é um resultado válido do
 * motor (matriz perfeitamente consistente) e se conserva como número. Os resíduos numéricos do motor também se
 * conservam (R12/SUB-B sai −3,97e−16): a normalização do zero negativo é de APRESENTAÇÃO
 * (`formatarPercentualDoCR`), e o motor não recebe clamp (`docs/referencia-cr-individuais.md`, §6).
 *
 * ⚠ **O cache legado nunca prevalece.** `responses.avgCR` e os CRs gravados na coleta têm semânticas diferentes
 * conforme a data (média sobre as 26 matrizes nas respostas antigas, máximo das seis nas novas) e não são
 * recalculados. Quando os julgamentos são válidos, o cache não entra; quando não são, o resultado é
 * `indisponivel` com a condição nomeada, e o cache NÃO o substitui aqui. (A API de qualidade preserva o cache
 * legado nos campos antigos, com a fonte declarada, e não neste bloco.)
 *
 * ⚠ **Isto descreve matrizes de julgamento, e não a pessoa.** O limiar de 0,10 (Saaty, 1977) é critério de
 * aceitação POR MATRIZ. Contar matrizes acima dele é descritivo e não justifica excluir participantes.
 */

import { calculateRespondentWeights } from './respondent-weights';
import { checkResponseCompleteness, describeIncompleteness } from './completeness';
import type { Alternative } from './data';
import type { JudgmentItem } from './types';

export const ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL = 'consistencia-individual-v1' as const;

/** As seis matrizes não triviais, na ordem da Tabela 22 do Apêndice G. Os rótulos são os do motor (`governingMatrix`). */
export const MATRIZES_NAO_TRIVIAIS = ['BOCR', 'MAGNITUDE', 'SUB-B', 'SUB-O', 'SUB-C', 'SUB-R'] as const;
export type MatrizNaoTrivial = (typeof MATRIZES_NAO_TRIVIAIS)[number];

/** O limiar de aceitação por matriz, Saaty (1977). É o único que este módulo usa. */
export const LIMIAR_DE_ACEITACAO_POR_MATRIZ = 0.1;

export type FonteDoCR = 'recalculado_dos_julgamentos' | 'indisponivel';

export type CondicaoDosJulgamentos =
  | 'validos_completos'
  | 'ausentes'
  | 'incompletos'
  | 'invalidos'
  | 'duplicados'
  | 'mistos'
  | 'nao_calculavel';

/** Contagens dos defeitos que a validação de completude encontrou. `null` quando não houve julgamentos para validar. */
export interface DefeitosDosJulgamentos {
  paresFaltantes: number;
  paresPulados: number;
  matrizesAusentes: number;
  valoresInvalidos: number;
  foraDaEstrutura: number;
  paresDuplicados: number;
}

export interface ConsistenciaIndividual {
  esquema: typeof ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL;
  fonte: FonteDoCR;
  condicao: CondicaoDosJulgamentos;
  /** Por que os CRs não estão disponíveis, ou `null` quando estão. */
  detalhe: string | null;
  defeitos: DefeitosDosJulgamentos | null;
  /** CR de cada matriz. `null` é «não calculado», e NUNCA zero. */
  crPorMatriz: Record<MatrizNaoTrivial, number | null>;
  /** Média aritmética das seis matrizes, do motor. `null` quando indisponível. */
  media: number | null;
  /** O maior CR das seis matrizes, do motor. `null` quando indisponível. */
  maximo: number | null;
  /** A matriz em que o máximo ocorre, do motor. `null` quando indisponível. */
  matrizGovernante: MatrizNaoTrivial | null;
  /** Quantas das seis matrizes têm CR (0 ou 6 neste produtor). */
  matrizesComCR: number;
  matrizesEsperadas: 6;
}

const CRS_AUSENTES = (): Record<MatrizNaoTrivial, number | null> => ({
  BOCR: null,
  MAGNITUDE: null,
  'SUB-B': null,
  'SUB-O': null,
  'SUB-C': null,
  'SUB-R': null,
});

function indisponivel(
  condicao: Exclude<CondicaoDosJulgamentos, 'validos_completos'>,
  detalhe: string,
  defeitos: DefeitosDosJulgamentos | null
): ConsistenciaIndividual {
  return {
    esquema: ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL,
    fonte: 'indisponivel',
    condicao,
    detalhe,
    defeitos,
    crPorMatriz: CRS_AUSENTES(),
    media: null,
    maximo: null,
    matrizGovernante: null,
    matrizesComCR: 0,
    matrizesEsperadas: 6,
  };
}

const numeroOuNull = (v: unknown): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

const MAX_LINHAS_DE_DETALHE = 6;

function resumirDefeitos(d: DefeitosDosJulgamentos): string {
  const partes: string[] = [];
  if (d.matrizesAusentes > 0) partes.push(`${d.matrizesAusentes} matriz(es) sem nenhuma comparação`);
  if (d.paresFaltantes > 0) partes.push(`${d.paresFaltantes} par(es) sem julgamento`);
  if (d.paresPulados > 0) partes.push(`${d.paresPulados} par(es) pulado(s)`);
  if (d.valoresInvalidos > 0) partes.push(`${d.valoresInvalidos} valor(es) fora da escala de Saaty (inteiros de 1 a 9)`);
  if (d.foraDaEstrutura > 0) partes.push(`${d.foraDaEstrutura} julgamento(s) fora da estrutura do projeto`);
  if (d.paresDuplicados > 0) partes.push(`${d.paresDuplicados} par(es) respondido(s) mais de uma vez`);
  return partes.join('; ');
}

/**
 * Recalcula a consistência individual dos julgamentos de um respondente.
 *
 * `alternatives` são as alternativas do projeto: a estrutura esperada (quantas comparações, em que matrizes) vem
 * delas, pela mesma função que monta o questionário. Sem alternativas não há estrutura contra a qual validar, e o
 * resultado é `indisponivel`, `nao_calculavel`.
 */
export function consistenciaIndividualDeJulgamentos(
  judgments: unknown,
  alternatives: Alternative[] | null | undefined
): ConsistenciaIndividual {
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    return indisponivel(
      'nao_calculavel',
      'as alternativas do projeto não foram informadas, e sem elas não há estrutura contra a qual validar os julgamentos',
      null
    );
  }

  const lista = Array.isArray(judgments) ? (judgments as (JudgmentItem | null | undefined)[]) : null;
  const presentes = lista ? lista.filter(j => j !== null && j !== undefined) : [];
  if (lista === null || presentes.length === 0) {
    return indisponivel('ausentes', 'a resposta não traz julgamentos', null);
  }

  const relatorio = checkResponseCompleteness(lista, alternatives);
  if (!relatorio.isComplete) {
    const defeitos: DefeitosDosJulgamentos = {
      paresFaltantes: relatorio.defects.filter(d => d.kind === 'PAR_FALTANTE').length,
      paresPulados: relatorio.defects.filter(d => d.kind === 'PULADO').length,
      matrizesAusentes: relatorio.defects.filter(d => d.kind === 'MATRIZ_AUSENTE').length,
      valoresInvalidos: relatorio.defects.filter(d => d.kind === 'VALOR_INVALIDO').length,
      foraDaEstrutura: relatorio.defects.filter(d => d.kind === 'PAR_FORA_DA_MATRIZ').length,
      paresDuplicados: relatorio.defects.filter(d => d.kind === 'PAR_DUPLICADO').length,
    };
    const incompletos = defeitos.paresFaltantes + defeitos.paresPulados + defeitos.matrizesAusentes;
    const invalidos = defeitos.valoresInvalidos + defeitos.foraDaEstrutura;
    const duplicados = defeitos.paresDuplicados;
    const gruposComDefeito = [incompletos, invalidos, duplicados].filter(n => n > 0).length;
    const condicao: Exclude<CondicaoDosJulgamentos, 'validos_completos'> =
      gruposComDefeito > 1 ? 'mistos' : incompletos > 0 ? 'incompletos' : invalidos > 0 ? 'invalidos' : 'duplicados';
    const linhas = describeIncompleteness(relatorio);
    const linhasMostradas = linhas.slice(0, MAX_LINHAS_DE_DETALHE).join(' | ');
    const mais = linhas.length > MAX_LINHAS_DE_DETALHE ? ` | … e mais ${linhas.length - MAX_LINHAS_DE_DETALHE} matriz(es)` : '';
    return indisponivel(condicao, `${resumirDefeitos(defeitos)} [${linhasMostradas}${mais}]`, defeitos);
  }

  try {
    const w = calculateRespondentWeights(lista as JudgmentItem[], alternatives.map(a => a.code));
    const crPorMatriz: Record<MatrizNaoTrivial, number | null> = {
      BOCR: numeroOuNull(w.bocrWeights.cr),
      MAGNITUDE: numeroOuNull(w.magnitudeWeights.cr),
      'SUB-B': numeroOuNull(w.subWeights.B?.cr),
      'SUB-O': numeroOuNull(w.subWeights.O?.cr),
      'SUB-C': numeroOuNull(w.subWeights.C?.cr),
      'SUB-R': numeroOuNull(w.subWeights.R?.cr),
    };
    const comCR = MATRIZES_NAO_TRIVIAIS.filter(m => crPorMatriz[m] !== null).length;
    if (comCR !== MATRIZES_NAO_TRIVIAIS.length) {
      return indisponivel(
        'nao_calculavel',
        `o motor devolveu CR em ${comCR} das 6 matrizes não triviais; sem as seis, a média e o máximo não são comparáveis entre respondentes`,
        null
      );
    }
    const governante = (MATRIZES_NAO_TRIVIAIS as readonly string[]).includes(w.governingMatrix)
      ? (w.governingMatrix as MatrizNaoTrivial)
      : null;
    return {
      esquema: ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL,
      fonte: 'recalculado_dos_julgamentos',
      condicao: 'validos_completos',
      detalhe: null,
      defeitos: null,
      crPorMatriz,
      media: numeroOuNull(w.meanCR),
      maximo: numeroOuNull(w.maxCR),
      matrizGovernante: governante,
      matrizesComCR: comCR,
      matrizesEsperadas: 6,
    };
  } catch (e: any) {
    return indisponivel(
      'nao_calculavel',
      `o motor recusou os julgamentos que a validação de completude aprovou: ${e?.message ?? String(e)}`,
      null
    );
  }
}

/** As matrizes cujo CR está acima do limiar de aceitação por matriz (estritamente maior que 0,10). */
export function matrizesAcimaDoLimiar(c: Pick<ConsistenciaIndividual, 'crPorMatriz'>): MatrizNaoTrivial[] {
  return MATRIZES_NAO_TRIVIAIS.filter(m => {
    const v = c.crPorMatriz[m];
    return v !== null && v > LIMIAR_DE_ACEITACAO_POR_MATRIZ;
  });
}

/**
 * Percentual com duas casas para apresentação. ⚠ **Normaliza o zero negativo e o resíduo do último bit**
 * (R12/SUB-B, −3,97e−16, sai `0.00%`): é clamp de EXIBIÇÃO e não toca o valor transportado nem o motor.
 */
export function formatarPercentualDoCR(v: number): string {
  const p = Number((v * 100).toFixed(2));
  return `${(p === 0 ? 0 : p).toFixed(2)}%`;
}
