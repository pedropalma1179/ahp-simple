/**
 * lib/fluxos-dos-projetos.ts
 *
 * **F07, A6, V1: o desfecho do cálculo pedido na lista de projetos só é escrito na mensagem do modal se
 * o modal aberto NO RETORNO ainda é o do projeto que originou o pedido.** Módulo PURO: sem React, sem
 * Firestore, sem rede. A página (`app/decisor/projetos/page.tsx`, `'use client'`, não montável por teste
 * algum) lhe entrega os seus setters, e o teste exercita ESTA função, que é a que a página chama.
 *
 * O defeito de antes: `handleCalculate` escrevia o desfecho em `calculateResult` DEPOIS do `await`, sem
 * conferir de qual projeto era o modal aberto no retorno. `calculateResult` é uma única variável de estado da
 * página, entregue a qualquer modal. Quem iniciava o cálculo do projeto A, fechava o modal e abria o do
 * projeto B via, no modal de B, a mensagem do cálculo de A, com o identificador da execução de A no texto. É a
 * causa dos cinco pontos de A5 (estado ou resposta de uma apresentação anterior aplicado à apresentação
 * atual); aqui a apresentação é o modal.
 *
 * ⚠ **O que NÃO muda.**
 *   - os textos das quatro mensagens (confirmada, recusada, sem confirmação, exceção), byte a byte;
 *   - o caminho bloqueado por pendência continua escrevendo a mensagem de ação bloqueada, porque é ANTERIOR
 *     ao `await`;
 *   - o `finally` continua desligando `calculating`: a bandeira é da página e desabilita o único gatilho
 *     (`disabled={calculating || ...}`), então só há um pedido em voo por vez, e deixá-la ligada bloquearia a
 *     tela. (É o raciocínio do ponto 2 de A5, invertido: ali o indicador de um pedido antigo não podia
 *     desligar o do novo; aqui não há pedido novo concorrente.)
 *
 * ⚠ **O desfecho descartado é DESCARTADO.** Não é levado a outra superfície da tela (isso seria mudança de
 * produto) nem guardado. Fica só uma linha em `console.log`, com texto que distingue o descarte da falha; o
 * log do navegador não é uma superfície da tela e não sobrevive à aba.
 *
 * ⚠ **A conferência é lida NO RETORNO.** `modalAberto` é chamada no instante da escrita; um valor capturado
 * no início de `handleCalculate` seria o do início, e conferi-lo reintroduziria o defeito.
 */

import type { ResultadoDeNovaAcao } from '@/lib/intencoes';
import { MENSAGEM_DE_ACAO_BLOQUEADA } from '@/lib/retomada-com-confirmacao';

/** A mensagem que o modal mostra. */
export interface ResultadoDoCalculoNaLista {
  type: 'success' | 'error';
  text: string;
}

export interface AcoesDoCalculoNaLista {
  setCalculating(valor: boolean): void;
  setCalculateResult(resultado: ResultadoDoCalculoNaLista | null): void;
}

export type DesfechoDoCalculoNaLista =
  /** Havia pendência sem decisão: a mensagem de ação bloqueada foi escrita, e nada foi enviado. */
  | 'bloqueado'
  /** O modal aberto no retorno era o do projeto: a mensagem foi escrita. */
  | 'escrito'
  /** O modal aberto no retorno NÃO era o do projeto (ou não havia modal): nada foi escrito. */
  | 'descartado';

/**
 * O texto do desfecho de `executarCalculo`. Os quatro textos são os de antes de A6, sem alteração.
 */
export function resultadoDoDesfecho(
  desfecho: ResultadoDeNovaAcao['desfecho'],
  persistida: boolean
): ResultadoDoCalculoNaLista {
  const aviso = persistida
    ? ''
    : ' Aviso: o armazenamento do navegador não está disponível, e uma recarga agora não permitiria recuperar este pedido.';
  if (desfecho.situacao === 'confirmada') {
    const data = desfecho.resposta.corpo;
    return { type: 'success', text: `${data.message} Execução ${data.executionId}.${aviso}` };
  }
  if (desfecho.situacao === 'recusada') {
    return { type: 'error', text: desfecho.resposta.corpo?.error ?? `Pedido recusado (status ${desfecho.resposta.status}).` };
  }
  return {
    type: 'error',
    text: `Sem confirmação do servidor (${desfecho.motivo}). O pedido permanece guardado neste navegador: ao reabrir esta tela ele é consultado, e a execução, se foi criada, é recuperada sem novo cálculo.${aviso}`,
  };
}

/**
 * O registro no LOG de um desfecho descartado. Só registra; o texto distingue o descarte de uma falha de
 * cálculo, e não afirma que o desfecho foi guardado em algum lugar.
 */
export function registrarDescarteDoResultadoDoCalculo(projectId: string, resultado: ResultadoDoCalculoNaLista): void {
  console.log(
    `Resultado do cálculo do projeto ${projectId} DESCARTADO (o modal aberto no retorno não é o desse projeto; nada foi escrito na tela): [${resultado.type}] ${resultado.text}`
  );
}

/**
 * O clique em «Calcular Resultados» no modal do projeto `projectId`.
 *
 * @param bloqueado `bloqueadoPorPendencia` no instante do clique (como antes de A6).
 * @param executar `executarCalculo(dependenciasDoNavegador(), …)`; PODE LANÇAR.
 * @param modalAberto o `id` do projeto cujo modal está aberto **AGORA** (no instante da chamada), ou `null`
 *   se não há modal. ⚠ Tem de ser uma leitura do estado de agora, e não um valor capturado no início.
 */
export async function calcularProjetoDaLista(args: {
  projectId: string;
  bloqueado: boolean;
  executar(parametros: { projectId: string }): Promise<ResultadoDeNovaAcao>;
  modalAberto(): string | null;
  acoes: AcoesDoCalculoNaLista;
}): Promise<DesfechoDoCalculoNaLista> {
  const { projectId, bloqueado, executar, modalAberto, acoes } = args;
  if (bloqueado) {
    acoes.setCalculateResult({ type: 'error', text: MENSAGEM_DE_ACAO_BLOQUEADA });
    return 'bloqueado';
  }

  // Escreve SE o modal aberto agora é o do projeto do pedido. A leitura de `modalAberto` é feita AQUI,
  // no retorno, e não no início.
  const escreverSeOModalForDoProjeto = (resultado: ResultadoDoCalculoNaLista): DesfechoDoCalculoNaLista => {
    if (modalAberto() !== projectId) {
      registrarDescarteDoResultadoDoCalculo(projectId, resultado);
      return 'descartado';
    }
    acoes.setCalculateResult(resultado);
    return 'escrito';
  };

  acoes.setCalculating(true);
  acoes.setCalculateResult(null);
  let desfechoDaEscrita: DesfechoDoCalculoNaLista;
  try {
    // F07 A1: o pedido tem `requestId`, e a intenção fica guardada no navegador até o servidor
    // confirmar; uma recarga no meio do envio é retomada ao montar a tela, sem segunda execução.
    const { desfecho, persistida } = await executar({ projectId });
    desfechoDaEscrita = escreverSeOModalForDoProjeto(resultadoDoDesfecho(desfecho, persistida));
  } catch (error: any) {
    desfechoDaEscrita = escreverSeOModalForDoProjeto({ type: 'error', text: error.message });
  } finally {
    acoes.setCalculating(false);
  }
  return desfechoDaEscrita;
}
