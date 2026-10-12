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

import { type Exibicao, type ReferenciaDoProjeto, type RegistroDeEscolha, estadoDaApresentacao } from '@/lib/referencia-do-projeto';
import type { ResultadoDeNovaAcao } from '@/lib/intencoes';

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

// ─────────────────────────────────────────────────────────────────────────────
// F07 A5, ponto 1: a escolha confirmada só AVANÇA a revisão carregada se a execução da referência devolvida é a
// que a tela APRESENTA NO RETORNO.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A referência devolvida corresponde à execução que a tela apresenta? É a MESMA condição com que a tela
 * rotula o estado `referencia-escolhida` (`estadoDaApresentacao`): a exibição é uma execução e é a da referência.
 * Sem referência (`null`) ou sem exibição conhecida, não corresponde.
 */
export function referenciaCorrespondeAApresentada(referencia: ReferenciaDoProjeto | null, exibicao: Exibicao | null): boolean {
  if (referencia === null) return false;
  return estadoDaApresentacao(referencia, exibicao ?? { tipo: 'anterior-a-f07' }).estado === 'referencia-escolhida';
}

/** O estado do envio da escolha, como o painel o mostra (a mesma forma de `EstadoDaEscolha`). */
export interface EstadoDoEnvioDaEscolha {
  emAndamento: boolean;
  mensagem: string | null;
  tipo: 'sucesso' | 'erro' | 'aviso' | null;
}

export interface AcoesDaEscolha {
  /** Registra a intenção e envia a escolha (`executarEscolha` de `lib/intencoes.ts`). PODE LANÇAR. */
  enviar(parametros: { executionId: string; expectedRevision: number; justification: string }): Promise<ResultadoDeNovaAcao>;
  setEscolha(estado: EstadoDoEnvioDaEscolha): void;
  /** A referência que o painel SABE (a mais recente vista). Atualiza `mudanca`; NÃO muda o que a tela carregou. */
  atualizarReferenciaConhecida(referencia: ReferenciaDoProjeto | null): void;
  /** Avança a revisão que a tela carregou (a base de `expectedRevision` da próxima escolha). */
  avancarReferenciaCarregada(referencia: ReferenciaDoProjeto | null): void;
  acrescentarEventoAoHistorico(evento: RegistroDeEscolha): void;
  /**
   * A exibição vigente **NO INSTANTE DA CHAMADA**. ⚠ Chamada DEPOIS do `await` do envio, e tem de devolver o que a
   * tela exibe AGORA. A propriedade `exibicao` que o manipulador capturou quando o pedido começou NÃO serve: é a
   * do início, e usá-la reintroduz o defeito em miniatura (a troca da exibição durante o envio passaria batida).
   */
  exibicaoVigente(): Exibicao | null;
}

export type DesfechoDaEscolha =
  /** Confirmada, e a execução da referência é a apresentada no retorno: a revisão carregada avançou. */
  | 'confirmada-carregada'
  /** Confirmada, mas a tela apresenta OUTRA coisa no retorno: só a referência conhecida foi atualizada. */
  | 'confirmada-sem-carregar'
  | 'recusada'
  | 'pendente'
  /** O envio, ou a aplicação da resposta, lançou. */
  | 'falhou';

const AVISO_DE_ARMAZENAMENTO_INDISPONIVEL =
  ' Aviso: o armazenamento do navegador não está disponível, e uma recarga durante o envio não permitiria recuperar este pedido.';

/**
 * O envio de uma escolha de referência (o corpo de `escolher` do componente, movido para cá sem alterar os textos
 * nem a ordem dos efeitos) e a aplicação da resposta.
 *
 * Antes de F07 A5, a resposta confirmada fazia `setReferenciaCarregada(corpo.referencia)` sem condição: escolher X
 * enquanto a tela apresentava Y avançava a revisão para uma referência de que nada foi apresentado, derrotando a
 * proteção da revisão esperada da escolha seguinte e calando o aviso de mudança. O caminho `recusada` já fazia o
 * certo (o painel passa a SABER a referência, mas não a "carrega"); agora o confirmado faz o mesmo quando a
 * execução devolvida não é a apresentada. A condição é uniforme: não distingue resposta recuperada (reenvio, que
 * devolve a referência de HOJE com o evento antigo) de resposta nova.
 *
 * @param referenciaCarregada a revisão que a tela carregou NO CLIQUE; é a base de `expectedRevision`.
 */
export async function enviarEscolhaDaReferencia(args: {
  executionId: string;
  justificativa: string;
  referenciaCarregada: ReferenciaDoProjeto | null;
  acoes: AcoesDaEscolha;
}): Promise<DesfechoDaEscolha> {
  const { executionId, justificativa, referenciaCarregada, acoes } = args;
  acoes.setEscolha({ emAndamento: true, mensagem: null, tipo: null });
  try {
    const { desfecho, persistida } = await acoes.enviar({
      executionId,
      expectedRevision: referenciaCarregada?.revision ?? 0,
      justification: justificativa,
    });
    const aviso = persistida ? '' : AVISO_DE_ARMAZENAMENTO_INDISPONIVEL;
    if (desfecho.situacao === 'confirmada') {
      const corpo = desfecho.resposta.corpo;
      const referencia: ReferenciaDoProjeto | null = corpo.referencia ?? null;
      acoes.atualizarReferenciaConhecida(referencia);
      // ⚠ A exibição é lida AQUI, depois do `await`: a do RETORNO, e não a do início do pedido.
      const apresentada = referenciaCorrespondeAApresentada(referencia, acoes.exibicaoVigente());
      if (apresentada) acoes.avancarReferenciaCarregada(referencia);
      if (corpo.evento && !corpo.recuperada) acoes.acrescentarEventoAoHistorico(corpo.evento);
      acoes.setEscolha({
        emAndamento: false,
        tipo: 'sucesso',
        mensagem: `Referência escolhida: revisão ${corpo.referencia?.revision ?? '?'}, execução ${executionId}.${aviso}`,
      });
      return apresentada ? 'confirmada-carregada' : 'confirmada-sem-carregar';
    }
    if (desfecho.situacao === 'recusada') {
      const corpo = desfecho.resposta.corpo;
      // O servidor devolve a referência corrente: o painel passa a sabê-la, mas NÃO a "carrega".
      if ('referencia' in corpo) acoes.atualizarReferenciaConhecida(corpo.referencia ?? null);
      acoes.setEscolha({ emAndamento: false, tipo: 'erro', mensagem: `Nada foi gravado. ${corpo.error ?? `Pedido recusado (status ${desfecho.resposta.status}).`}` });
      return 'recusada';
    }
    acoes.setEscolha({
      emAndamento: false,
      tipo: 'aviso',
      mensagem: `Sem confirmação do servidor (${desfecho.motivo}). A escolha permanece guardada neste navegador e será consultada ao reabrir esta tela.${aviso}`,
    });
    return 'pendente';
  } catch (e: any) {
    acoes.setEscolha({ emAndamento: false, tipo: 'erro', mensagem: e?.message ?? String(e) });
    return 'falhou';
  }
}
