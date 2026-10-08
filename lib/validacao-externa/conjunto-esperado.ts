/**
 * lib/validacao-externa/conjunto-esperado.ts
 *
 * A DEFINIÇÃO ÚNICA do conjunto de matrizes que a validação externa espera, por IDENTIDADE e
 * ORDEM (especificação da Fase 2, seção 4.1), e não por contagem.
 *
 * ⚠ ESTE CONJUNTO É REFLEXO DA ESTRUTURA ATUAL DO PRODUTOR (`app/api/calculate/route.ts`), e NÃO
 * é um limite imposto a qualquer documento recebido. As duas constantes abaixo foram EXTRAÍDAS,
 * sem mudança de valor, da rota que calcula, e a rota passou a importá-las daqui: o produtor e o
 * consumidor leem a MESMA declaração, em vez de duas que não se falam.
 *
 * ⚠ O alcance NÃO inclui as vinte matrizes de alternativas (5 subcritérios x 4 méritos), que são
 * calculadas e não persistidas.
 *
 * Módulo puro: sem rede, sem Firestore, sem importação do restante do sistema, de modo que a rota
 * (servidor) e o componente (cliente) possam importá-lo.
 */

/** Os quatro méritos BOCR. `as const`: preserva o tipo literal que a rota já usava. */
export const MERITS = ['B', 'O', 'C', 'R'] as const;

/** Subcritérios por mérito. Declaração literal `5`: preserva o tipo que a rota já usava. */
export const SUBCRITERIA_PER_MERIT = 5;

export type MeritKey = (typeof MERITS)[number];

/** Nome em inglês de cada mérito, como a requisição ao serviço já o enviava. */
export const ROTULO_DO_MERITO: Record<MeritKey, string> = {
  B: 'Benefits',
  O: 'Opportunities',
  C: 'Costs',
  R: 'Risks',
};

export type IdentidadeId = 'bocr' | 'magnitude' | 'sub:B' | 'sub:O' | 'sub:C' | 'sub:R';

export interface IdentidadeEsperada {
  id: IdentidadeId;
  /** A chave com que a matriz é enviada ao serviço e com que ele deve devolvê-la. */
  rotulo: string;
  /** Ordem esperada da matriz quadrada. */
  ordem: number;
  /** Nomes dos itens, na ordem das linhas. Têm de ter o comprimento da ordem. */
  itens: string[];
  /** De onde vem a expectativa, em texto (não é verificada por este módulo). */
  origemDaExpectativa: string;
}

const ITENS_DOS_MERITOS: string[] = MERITS.map(m => ROTULO_DO_MERITO[m]);

export const IDENTIDADES_ESPERADAS: readonly IdentidadeEsperada[] = [
  {
    id: 'bocr',
    rotulo: 'BOCR Méritos',
    ordem: MERITS.length,
    itens: [...ITENS_DOS_MERITOS],
    origemDaExpectativa: 'agregação BOCR do produtor, sobre os méritos de MERITS',
  },
  {
    id: 'magnitude',
    rotulo: 'Magnitude (Rescaling)',
    ordem: MERITS.length,
    itens: [...ITENS_DOS_MERITOS],
    origemDaExpectativa: 'agregação de magnitude do produtor, sobre os méritos de MERITS',
  },
  ...MERITS.map(
    (m): IdentidadeEsperada => ({
      id: `sub:${m}` as IdentidadeId,
      rotulo: `${ROTULO_DO_MERITO[m]} Subcritérios`,
      ordem: SUBCRITERIA_PER_MERIT,
      itens: Array.from({ length: SUBCRITERIA_PER_MERIT }, (_, i) => `${m}${i + 1}`),
      origemDaExpectativa: `agregação de subcritérios do mérito ${m}, com SUBCRITERIA_PER_MERIT itens`,
    })
  ),
];

/** Quantas identidades compõem a cobertura completa. */
export const TOTAL_DE_IDENTIDADES = IDENTIDADES_ESPERADAS.length;

export function identidadePorId(id: IdentidadeId): IdentidadeEsperada {
  const achada = IDENTIDADES_ESPERADAS.find(i => i.id === id);
  if (!achada) throw new Error(`identidade desconhecida: ${id}`);
  return achada;
}

/** `undefined` para chave que não pertence ao conjunto esperado. */
export function identidadePorRotulo(rotulo: string): IdentidadeEsperada | undefined {
  return IDENTIDADES_ESPERADAS.find(i => i.rotulo === rotulo);
}

/** A declaração de escopo, para ser exibida junto ao resultado. */
export const DECLARACAO_DO_CONJUNTO =
  'O conjunto esperado é o das seis matrizes agregadas persistidas da estrutura atual do produtor ' +
  '(BOCR, magnitude e subcritérios B, O, C e R). É reflexo dessa estrutura, e não um limite imposto a ' +
  'qualquer documento recebido. Não inclui as matrizes de alternativas, que são calculadas e não persistidas.';
