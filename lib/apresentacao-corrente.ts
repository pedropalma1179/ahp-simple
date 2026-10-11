/**
 * lib/apresentacao-corrente.ts
 *
 * **F07, A4: a que APRESENTAÇÃO pertence uma resposta assíncrona.** Módulo PURO: sem React, sem
 * Firestore, sem rede.
 *
 * O problema que isto resolve: a tela de resultados pede coisas ao servidor sobre a execução que ela
 * apresenta (a auditoria, o Parecer IA) e escreve a resposta no estado. Se a pessoa troca a execução
 * apresentada enquanto o pedido está em voo, a resposta tardia escreve estado de OUTRA execução sobre
 * a tela de agora: a tela passa a mostrar os números de uma execução com a auditoria de outra.
 *
 * **O vínculo é um PAR: (identidade da execução, geração da apresentação).**
 *
 *   - a **geração** é um inteiro que avança a CADA troca do que a tela apresenta, inclusive quando a
 *     execução apresentada é a mesma de antes (A, B, A são três gerações, e não duas). Ela demonstra
 *     de qual APRESENTAÇÃO a resposta é. Sem ela, uma resposta pedida na primeira apresentação de A
 *     seria aceita na terceira e ressuscitaria estado que as limpezas do meio apagaram de propósito;
 *   - o **identificador** (`executionId`) demonstra de qual EXECUÇÃO a resposta trata. É propriedade
 *     de auditoria e de registro; ver "Redundância" abaixo.
 *
 * ⚠ **O contador não substitui o identificador, e o identificador não substitui o contador.**
 *
 * ⚠ **A AUSÊNCIA DE IDENTIFICADOR NUNCA CONTA COMO IGUALDADE.** O documento legado
 * (`calculations/{projectId}`) anterior ao commit `6aea771` não tem `executionId`, e
 * `identificarExecucao` devolve `null` para ele. Comparar duas ausências aceitaria uma resposta sem
 * vínculo demonstrado. Aqui, quando o identificador falta de um lado ou dos dois, ele NÃO é comparado:
 * a conferência diz `vinculo: 'so-geracao'`, isto é, a geração é o ÚNICO vínculo, e a garantia é MAIS
 * FRACA. Ela é declarada no resultado, e não escondida por um `null === null`.
 *
 * ⚠ **Redundância.** Pelo registro abaixo, cada geração identifica uma única apresentação, e cada
 * apresentação tem um único identificador; portanto duas respostas da MESMA geração têm sempre o
 * mesmo identificador, e a comparação do identificador não muda a decisão aceitar/descartar. Ela não
 * é decorativa (registra de qual execução a resposta trata, e é o que `vinculo` informa), mas é
 * REDUNDANTE em comportamento. Ver o registro dos mutantes em `docs/imprecisoes-parecer-ia.md`.
 *
 * ⚠ **Nada aqui troca a execução exibida.** A regra de A2 vale: a tela nunca troca sozinha o que
 * apresenta. Uma resposta fora do par é DESCARTADA (ou tratada pela conduta declarada de cada fluxo), e
 * nunca passa a definir o que a tela mostra.
 */

import { identificarExecucao } from '@/lib/identificacao-da-execucao';

export interface ParDaApresentacao {
  /** A execução apresentada; `null` quando o documento apresentado não tem identificador. */
  readonly executionId: string | null;
  /** Avança a cada troca do que a tela apresenta. */
  readonly geracao: number;
}

/** O que sustenta a aceitação: o par completo, ou só a geração (garantia mais fraca). */
export type VinculoDaConferencia = 'identificador-e-geracao' | 'so-geracao';

export type MotivoDaRecusa = 'geracao-diferente' | 'identificador-diferente' | 'identificador-presente-so-em-um-lado';

export type ConferenciaDoPar =
  | { aceita: true; vinculo: VinculoDaConferencia; motivo: string }
  | { aceita: false; vinculo: null; motivo: MotivoDaRecusa };

/**
 * Compara o par do PEDIDO com o par da apresentação CORRENTE.
 *
 * Ordem: a geração decide primeiro. Com a mesma geração, dois identificadores presentes têm de ser
 * iguais. Se algum falta, o identificador não é comparado (nem igualado): vale a geração, e o
 * resultado diz `so-geracao`.
 */
export function conferirPar(doPedido: ParDaApresentacao, corrente: ParDaApresentacao): ConferenciaDoPar {
  if (doPedido.geracao !== corrente.geracao) return { aceita: false, vinculo: null, motivo: 'geracao-diferente' };
  const a = doPedido.executionId;
  const b = corrente.executionId;
  if (a !== null && b !== null) {
    return a === b
      ? { aceita: true, vinculo: 'identificador-e-geracao', motivo: 'mesma geração e mesmo executionId' }
      : { aceita: false, vinculo: null, motivo: 'identificador-diferente' };
  }
  if (a === null && b === null) {
    // ⚠ NÃO é igualdade de identificador: o documento apresentado não tem `executionId`, e a geração
    //   é o único vínculo. Garantia mais fraca, declarada.
    return { aceita: true, vinculo: 'so-geracao', motivo: 'sem executionId nos dois lados; vale só a geração' };
  }
  return { aceita: false, vinculo: null, motivo: 'identificador-presente-so-em-um-lado' };
}

export interface RegistroDaApresentacao {
  /** Registra uma NOVA apresentação (avança a geração, sempre) e devolve o par dela. */
  apresentar(documento: Record<string, any> | null | undefined): ParDaApresentacao;
  /** O par da apresentação corrente. É o que um pedido guarda ao ser feito. */
  capturar(): ParDaApresentacao;
  /** Confere o par guardado por um pedido contra a apresentação corrente. */
  conferir(par: ParDaApresentacao): ConferenciaDoPar;
}

/**
 * Um registro por tela. Guarda a apresentação corrente em variável do módulo (e não em estado de
 * componente), para que a conferência feita NO RETORNO de uma chamada assíncrona veja a apresentação
 * de agora, e não a do instante em que o fecho foi criado.
 */
export function criarRegistroDaApresentacao(): RegistroDaApresentacao {
  let atual: ParDaApresentacao = Object.freeze({ executionId: null, geracao: 0 });
  return {
    apresentar(documento) {
      atual = Object.freeze({ executionId: identificarExecucao(documento).executionId, geracao: atual.geracao + 1 });
      return atual;
    },
    capturar() {
      return atual;
    },
    conferir(par) {
      return conferirPar(par, atual);
    },
  };
}

/**
 * Ordem de pedidos do MESMO tipo: o último pedido vence. Serve a quem apresenta o resultado de uma
 * leitura assíncrona (por exemplo, "Exibir" na lista de execuções): se dois cliques estão em voo, só
 * o último pode apresentar.
 */
export interface OrdemDePedidos {
  novo(): number;
  vigente(bilhete: number): boolean;
}

export function criarOrdemDePedidos(): OrdemDePedidos {
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
