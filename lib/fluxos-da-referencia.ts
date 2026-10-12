/**
 * lib/fluxos-da-referencia.ts
 *
 * **F07, A4, item 3: "Carregar a referência atual" só AVANÇA a revisão carregada depois de a execução
 * ter sido APRESENTADA.** Módulo PURO: sem React, sem Firestore, sem rede. O componente
 * (`components/ReferenciaDoProjeto.tsx`, `'use client'`, não montável por teste algum) lhe entrega os
 * seus setters, e o teste exercita ESTA função, que é a que o componente chama.
 *
 * O defeito de antes: `carregarReferencia` fazia `setReferenciaCarregada(referencia)` e SÓ ENTÃO lia e
 * exibia a execução. Se a leitura devolvesse `null` (execução não encontrada) ou lançasse, a revisão
 * já tinha avançado: o aviso de mudança da referência SUMIA (`compararReferencia(carregada, corrente)`
 * passa a dar "não mudou"), a tela continuava exibindo a execução ANTIGA, e a escolha seguinte
 * (`expectedRevision: referenciaCarregada?.revision`) passava a usar uma revisão que a tela nunca
 * apresentou. A garantia da revisão esperada (o servidor recusa se a referência mudou desde que a
 * tela a viu) ficava desarmada justamente depois de uma falha.
 *
 * ⚠ **Regra que NÃO muda:** a escolha continua usando a revisão que a tela CARREGOU, e não a mais
 * recente vista pela assinatura.
 *
 * ⚠ **Nada aqui troca sozinho o que a tela exibe.** A função só roda por clique em "Carregar a
 * referência atual".
 */

import type { ReferenciaDoProjeto } from '@/lib/referencia-do-projeto';

export interface AcoesDaCargaDaReferencia {
  /** Lê o documento da execução. `null` = não existe. PODE LANÇAR (rede, permissão). */
  lerExecucao(executionId: string): Promise<Record<string, any> | null>;
  /**
   * Entrega o documento à tela, que o apresenta (`onExibir`). Quando retorna, a parte SÍNCRONA da
   * apresentação (os setters) já rodou; a auditoria que a tela pede depois continua em voo e NÃO é
   * aguardada aqui. Se lançar, a apresentação não aconteceu.
   */
  apresentar(documento: Record<string, any>): void | Promise<unknown>;
  /** Avança a revisão que a tela carregou. SÓ é chamada depois de `apresentar` retornar. */
  avancarReferenciaCarregada(referencia: ReferenciaDoProjeto | null): void;
  /** Acrescenta uma linha à faixa de avisos do painel. Não substitui o painel. */
  acrescentarAviso(texto: string): void;
  /**
   * F07 A5, ponto 4: `false` se este clique já foi SUPERADO por um clique mais novo em "Exibir" ou em
   * "Carregar a referência atual" (ver `criarOrdemDeCliques`). Omitido = sempre vigente (o comportamento de
   * A4, que os testes de A4 continuam exercitando sem este membro).
   */
  vigente?(): boolean;
}

export type DesfechoDaCargaDaReferencia =
  /** Apresentada, e a revisão avançou. */
  | 'carregada'
  /** Não há referência a apresentar: a revisão carregada passa a ser `null` (comportamento de antes). */
  | 'sem-referencia'
  /** A leitura devolveu `null`: nada foi apresentado, a revisão NÃO avançou. */
  | 'nao-encontrada'
  /** A leitura ou a apresentação lançou: a revisão NÃO avançou, e a exceção NÃO escapa. */
  | 'falhou'
  /** F07 A5: um clique mais novo superou este antes de a leitura voltar. Nada foi apresentado, a revisão NÃO avançou e NÃO há aviso. */
  | 'superada';

/** A linha de aviso quando a referência não pôde ser carregada. Diz o que a tela MANTÉM. */
export function mensagemDeFalhaDaCarga(
  referencia: ReferenciaDoProjeto,
  motivo: string,
  revisaoCarregada: number | null
): string {
  const mantida = revisaoCarregada === null ? 'sem revisão carregada' : `com a revisão ${revisaoCarregada} carregada`;
  return (
    `A referência atual (revisão ${referencia.revision}, execução ${referencia.executionId}) não pôde ser carregada: ${motivo}. ` +
    `A tela continua ${mantida}, o aviso de mudança da referência permanece, e a execução exibida não foi trocada.`
  );
}

const textoDoErro = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * @param referencia a referência VISTA no instante do clique; é ela (e não outra, que a assinatura
 *   traga durante a leitura) que a tela apresenta e que passa a ser a carregada.
 * @param revisaoCarregada a revisão carregada ANTES do clique, só para a mensagem de falha.
 */
export async function carregarReferenciaAtual(args: {
  referencia: ReferenciaDoProjeto | null;
  revisaoCarregada: number | null;
  acoes: AcoesDaCargaDaReferencia;
}): Promise<DesfechoDaCargaDaReferencia> {
  const { referencia, revisaoCarregada, acoes } = args;
  if (referencia === null) {
    // Não há execução a apresentar: nada pode falhar, e a tela passa a saber que não há referência.
    acoes.avancarReferenciaCarregada(null);
    return 'sem-referencia';
  }

  // F07 A5, ponto 4: a leitura é aguardada, e a tela pode ter apresentado OUTRA coisa por um clique mais novo
  // enquanto isso. Um clique superado não tem efeito algum: nem apresenta, nem avança a revisão, nem avisa.
  const superada = () => acoes.vigente !== undefined && !acoes.vigente();

  let documento: Record<string, any> | null;
  try {
    documento = await acoes.lerExecucao(referencia.executionId);
  } catch (e) {
    if (superada()) return 'superada';
    acoes.acrescentarAviso(mensagemDeFalhaDaCarga(referencia, `falha ao ler a execução (${textoDoErro(e)})`, revisaoCarregada));
    return 'falhou';
  }
  if (superada()) return 'superada';
  if (documento === null) {
    acoes.acrescentarAviso(mensagemDeFalhaDaCarga(referencia, `a execução ${referencia.executionId} não foi encontrada`, revisaoCarregada));
    return 'nao-encontrada';
  }

  try {
    acoes.apresentar(documento);
  } catch (e) {
    acoes.acrescentarAviso(mensagemDeFalhaDaCarga(referencia, `falha ao apresentar a execução (${textoDoErro(e)})`, revisaoCarregada));
    return 'falhou';
  }

  // ⚠ SÓ AQUI: depois de apresentar. Antes de F07 A4 esta linha vinha antes da leitura.
  acoes.avancarReferenciaCarregada(referencia);
  return 'carregada';
}

// ─────────────────────────────────────────────────────────────────────────────
// F07 A5, ponto 5: "Exibir" na lista de execuções. A falha de leitura não escapa do manipulador.
// ─────────────────────────────────────────────────────────────────────────────

export interface AcoesDaExibicao {
  /** O documento da execução (o que a tela já tem, ou a leitura). `null` = não existe. PODE LANÇAR. */
  lerExecucao(executionId: string): Promise<Record<string, any> | null>;
  /** Entrega o documento à tela, que o apresenta (`onExibir`). Se lançar, a apresentação não aconteceu. */
  apresentar(documento: Record<string, any>): void | Promise<unknown>;
  /** Acrescenta uma linha à faixa de avisos do painel. */
  acrescentarAviso(texto: string): void;
  /** F07 A5, ponto 4: `false` se este clique já foi SUPERADO por um mais novo. Omitido = sempre vigente. */
  vigente?(): boolean;
}

export type DesfechoDaExibicao =
  /** O documento foi entregue à tela. */
  | 'apresentada'
  /** A leitura devolveu `null`: aviso «não foi encontrada», nada foi apresentado. */
  | 'nao-encontrada'
  /** A leitura ou a apresentação lançou: aviso distinto, nada mudou na tela, e a exceção NÃO escapa. */
  | 'falhou'
  /** F07 A5: um clique mais novo superou este antes de a leitura voltar. Nada foi apresentado e NÃO há aviso. */
  | 'superada';

/** A linha de aviso do documento ausente. É o texto de antes de A5, sem alteração. */
export const avisoDeExecucaoNaoEncontrada = (executionId: string): string => `A execução ${executionId} não foi encontrada.`;

/** A linha de aviso quando a leitura LANÇOU. Distinta da de ausente: a execução pode existir. */
export const avisoDeExecucaoNaoLida = (executionId: string, motivo: string): string =>
  `A execução ${executionId} não pôde ser lida: ${motivo}. A tela continua exibindo o que exibia; tente exibir de novo.`;

/** A linha de aviso quando a leitura deu certo e a apresentação lançou. */
export const avisoDeExecucaoNaoApresentada = (executionId: string, motivo: string): string =>
  `A execução ${executionId} foi lida, mas não pôde ser apresentada: ${motivo}. A tela continua exibindo o que exibia.`;

/**
 * O clique em "Exibir" de uma execução da lista. Antes de A5, `exibir` não tinha `try`: uma leitura que
 * lançava (`lerExecucao` faz `getDoc` sem tratamento próprio) deixava a exceção escapar do manipulador, sem
 * aviso algum. Agora a leitura e a apresentação que lançam viram aviso, e a tela não muda.
 *
 * ⚠ Este é o caminho de "Exibir". O de "Carregar a referência atual" é `carregarReferenciaAtual` (A4,
 * item 3), que NÃO foi alterado por este ponto e não foi unificado com este: ele tem a regra própria de
 * avançar a revisão carregada só depois de apresentar.
 */
export async function exibirExecucaoDaLista(args: { executionId: string; acoes: AcoesDaExibicao }): Promise<DesfechoDaExibicao> {
  const { executionId, acoes } = args;
  const superada = () => acoes.vigente !== undefined && !acoes.vigente();
  let documento: Record<string, any> | null;
  try {
    documento = await acoes.lerExecucao(executionId);
  } catch (e) {
    if (superada()) return 'superada'; // a falha é de um clique que a tela já deixou: nada a avisar sobre a tela de agora
    acoes.acrescentarAviso(avisoDeExecucaoNaoLida(executionId, textoDoErro(e)));
    return 'falhou';
  }
  if (superada()) return 'superada';
  if (documento === null) {
    acoes.acrescentarAviso(avisoDeExecucaoNaoEncontrada(executionId));
    return 'nao-encontrada';
  }
  try {
    acoes.apresentar(documento);
  } catch (e) {
    acoes.acrescentarAviso(avisoDeExecucaoNaoApresentada(executionId, textoDoErro(e)));
    return 'falhou';
  }
  return 'apresentada';
}

// ─────────────────────────────────────────────────────────────────────────────
// F07 A5, ponto 4: a corrida entre dois cliques. O ÚLTIMO clique vence.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A ordem dos cliques que apresentam uma execução da lista ("Exibir" e "Carregar a referência atual" são do
 * MESMO conjunto). Cada clique pega um bilhete NO INSTANTE DO CLIQUE (antes de qualquer `await`), e só o
 * bilhete mais novo é vigente quando a leitura volta.
 *
 * Por que isto não é o par de `lib/apresentacao-corrente.ts`: o par é avançado por `registro.apresentar`, NO
 * MOMENTO DA APRESENTAÇÃO, isto é, depois de a leitura voltar. Dois cliques em voo ainda não apresentaram
 * nada, então o par não tem como saber que a leitura de um deles é de um clique anterior ao outro.
 * (`criarOrdemDePedidos`, retirada em A4 por não ter chamador, voltou como esta, agora com dois chamadores.)
 */
export interface OrdemDeCliques {
  /** Pega o bilhete do clique que ACABA de acontecer; o anterior deixa de ser vigente. */
  novo(): number;
  /** `true` só para o bilhete mais novo. */
  vigente(bilhete: number): boolean;
}

export function criarOrdemDeCliques(): OrdemDeCliques {
  let ultimo = 0;
  return {
    novo() {
      ultimo += 1;
      return ultimo;
    },
    vigente(bilhete) {
      return bilhete === ultimo;
    },
  };
}
