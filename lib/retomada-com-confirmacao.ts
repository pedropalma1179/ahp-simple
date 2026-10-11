/**
 * lib/retomada-com-confirmacao.ts
 *
 * **F07, A4, item 4: o estado e o texto da CONFIRMAÇÃO antes de reenviar um pedido de cálculo
 * guardado.** Módulo PURO: sem React, sem Firestore, sem rede. As duas telas (`app/decisor/projetos` e
 * `app/decisor/resultados/[projectId]`) guardam o `EstadoDaRetomada` em `useState`, chamam estas
 * funções e renderizam `components/ConfirmacaoDeRetomada.tsx`. O teste exercita estas funções, que são
 * as que as telas chamam; nenhuma tela é montada.
 *
 * Por que existe: `retomarPendentes` (lib/intencoes.ts) reenviava o pedido de cálculo na MONTAGEM da
 * tela, sem a pessoa saber. Se o pedido nunca tinha chegado ao servidor, o cálculo era feito ali, com
 * os dados de agora. Agora `retomarPendentes` não envia intenção de cálculo; ela fica aqui,
 * `aguardando-decisao`, até a pessoa reenviar ou manter pendente.
 *
 * ⚠ **LIMITAÇÃO CONHECIDA E DECIDIDA (a mesma de `retomarPendentes`):** a confirmação cobre TODA
 * retomada de cálculo pelo endpoint atual, porque não existe consulta somente-leitura que diga se o
 * pedido chegou. A tela não sabe, antes de enviar, qual dos dois casos é o seu; por isso o texto
 * descreve os dois. Não se cria outro endpoint nesta entrega.
 *
 * ⚠ **A tela não libera ação nova de cálculo enquanto houver pendência SEM DECISÃO** (comportamento de
 * antes, preservado): `acaoNovaLiberada`. Uma pendência que a pessoa decidiu MANTER (não reenviar
 * agora) é uma decisão: continua guardada e continua dita como pendente, mas não trava a tela. Esta
 * leitura de "sem decisão" é interpretação desta entrega e está declarada no relato.
 */

import {
  confirmarReenvio,
  type DependenciasDeEnvio,
  type DesfechoDaIntencao,
  type IntencaoDeCalculo,
  resumirRetomada,
} from '@/lib/intencoes';

export type SituacaoDaPendencia =
  /** Encontrada e NÃO enviada. A pessoa ainda não decidiu. */
  | 'aguardando-decisao'
  /** A pessoa confirmou; o envio está em voo. */
  | 'enviando'
  /** A pessoa NÃO quis reenviar agora, ou o reenvio não obteve decisão do servidor: segue guardada. */
  | 'mantida'
  /** O servidor confirmou ou recusou em definitivo; a entrada foi removida. */
  | 'resolvida';

export interface Pendencia {
  intencao: IntencaoDeCalculo;
  situacao: SituacaoDaPendencia;
  /** O desfecho do reenvio, quando houve. */
  desfecho?: DesfechoDaIntencao;
}

export interface EstadoDaRetomada {
  pendencias: Pendencia[];
}

export function estadoInicialDaRetomada(aguardando: IntencaoDeCalculo[]): EstadoDaRetomada {
  return { pendencias: aguardando.map(intencao => ({ intencao, situacao: 'aguardando-decisao' as const })) };
}

const trocar = (estado: EstadoDaRetomada, id: string, de: SituacaoDaPendencia, para: Partial<Pendencia> & { situacao: SituacaoDaPendencia }): EstadoDaRetomada => ({
  pendencias: estado.pendencias.map(p => (p.intencao.id === id && p.situacao === de ? { ...p, ...para } : p)),
});

/** A pessoa confirmou: `aguardando-decisao` passa a `enviando`. Qualquer outra situação não muda. */
export const comecarEnvio = (estado: EstadoDaRetomada, id: string): EstadoDaRetomada => trocar(estado, id, 'aguardando-decisao', { situacao: 'enviando' });

/** A pessoa recusou reenviar agora: a entrada continua guardada (NADA é removido nem enviado). */
export const manterPendente = (estado: EstadoDaRetomada, id: string): EstadoDaRetomada => trocar(estado, id, 'aguardando-decisao', { situacao: 'mantida' });

/** O desfecho do reenvio: confirmada ou recusada em definitivo resolvem; sem decisão do servidor, mantém. */
export const concluirEnvio = (estado: EstadoDaRetomada, id: string, desfecho: DesfechoDaIntencao): EstadoDaRetomada =>
  trocar(estado, id, 'enviando', { situacao: desfecho.situacao === 'pendente' ? 'mantida' : 'resolvida', desfecho });

/**
 * ⚠ A ação nova de cálculo só é liberada quando nenhuma pendência está sem decisão (`aguardando-decisao`)
 * nem em envio (`enviando`).
 */
export function acaoNovaLiberada(estado: EstadoDaRetomada): boolean {
  return estado.pendencias.every(p => p.situacao !== 'aguardando-decisao' && p.situacao !== 'enviando');
}

export const MENSAGEM_DE_ACAO_BLOQUEADA =
  'Há um pedido de cálculo anterior esperando a sua decisão (reenviar ou manter pendente). Decida antes de fazer um novo cálculo.';

/** A frase que a confirmação tem de dizer. Fixa: um teste a procura. */
export const FRASE_DOS_DADOS_DE_AGORA =
  'Se o servidor já tinha recebido este pedido, a execução registrada é recuperada, sem novo cálculo. ' +
  'Se o pedido nunca chegou ao servidor, o cálculo, ao ser reenviado, usará os dados de agora, e não os do momento em que foi pedido.';

export interface TextoDaConfirmacao {
  titulo: string;
  /** Projeto, quando criada, exclusões, e a frase dos dados de agora. */
  linhas: string[];
}

/** O que a tela mostra para cada pendência `aguardando-decisao`. */
export function textoDaConfirmacao(intencao: IntencaoDeCalculo, nomeDoProjeto?: string | null): TextoDaConfirmacao {
  const ex = intencao.excludedRespondentIds;
  return {
    titulo: 'Pedido de cálculo anterior sem confirmação do servidor',
    linhas: [
      `Projeto: ${nomeDoProjeto ? `${nomeDoProjeto} (${intencao.projectId})` : intencao.projectId}.`,
      `Pedido criado em: ${intencao.criadaEm}.`,
      ex.length === 0
        ? 'Respondentes excluídos neste pedido: nenhum.'
        : `Respondentes excluídos neste pedido: ${ex.length} (${ex.join(', ')}).`,
      FRASE_DOS_DADOS_DE_AGORA,
    ],
  };
}

/** O que a tela diz de uma pendência que a pessoa decidiu MANTER, ou cujo reenvio seguiu sem decisão. */
export function linhaDaPendenciaMantida(p: Pendencia): string {
  const projeto = p.intencao.projectId;
  return p.desfecho && p.desfecho.situacao === 'pendente'
    ? `O reenvio do pedido de cálculo (projeto ${projeto}) segue sem confirmação (${p.desfecho.motivo}). Ele continua pendente, guardado neste navegador, e será oferecido de novo ao abrir a tela.`
    : `O pedido de cálculo (projeto ${projeto}), criado em ${p.intencao.criadaEm}, continua pendente: não foi reenviado e permanece guardado neste navegador. Ele será oferecido de novo ao abrir a tela.`;
}

/**
 * A confirmação por AÇÃO da pessoa. Marca o envio, reenvia (mesmo `requestId`, mesmos parâmetros) e
 * registra o desfecho. `ajustar` recebe uma função de estado (o `setState` da tela, com atualizador).
 * Devolve as linhas do desfecho para a faixa de avisos da tela.
 */
export async function reenviarPorConfirmacao(args: {
  deps: DependenciasDeEnvio;
  intencao: IntencaoDeCalculo;
  ajustar: (f: (e: EstadoDaRetomada) => EstadoDaRetomada) => void;
}): Promise<{ desfecho: DesfechoDaIntencao; linhas: string[] }> {
  const { deps, intencao, ajustar } = args;
  ajustar(e => comecarEnvio(e, intencao.id));
  let desfecho: DesfechoDaIntencao;
  try {
    desfecho = await confirmarReenvio(deps, intencao);
  } catch (e: any) {
    desfecho = { situacao: 'pendente', intencao, motivo: `falha ao reenviar: ${e?.message ?? String(e)}` };
  }
  ajustar(e => concluirEnvio(e, intencao.id, desfecho));
  return { desfecho, linhas: resumirRetomada({ desfechos: [desfecho], ilegiveis: [], verificavel: true }).linhas };
}

/** A recusa por AÇÃO da pessoa: nada é enviado, nada é removido. Devolve a linha que a tela diz. */
export function recusarReenvio(args: {
  intencao: IntencaoDeCalculo;
  ajustar: (f: (e: EstadoDaRetomada) => EstadoDaRetomada) => void;
}): string {
  args.ajustar(e => manterPendente(e, args.intencao.id));
  return linhaDaPendenciaMantida({ intencao: args.intencao, situacao: 'mantida' });
}
