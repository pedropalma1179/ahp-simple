/**
 * lib/escolha-de-referencia.ts
 *
 * **F07, A2: a escolha da REFERÊNCIA do projeto, com revisão e histórico.**
 *
 * ⚠ **SÓ SERVIDOR.** Usado pela rota `app/api/project-reference/route.ts`. O que a tela precisa ler
 * está em `lib/referencia-do-projeto.ts` e `lib/referencia-leitura.ts`.
 *
 * Uma escolha grava DOIS documentos na MESMA transação:
 *
 *   `projectReference/{projectId}`   a referência corrente, com `revision`
 *   `referenceChanges/{operationId}` o registro histórico dessa escolha
 *
 * Ordem das operações dentro da transação (as leituras vêm antes das escritas):
 *
 *   1. lê `referenceChanges/{operationId}`. Se existir com o MESMO conteúdo (`projectId`,
 *      `executionId`, `expectedRevision`, `justification`), é reenvio: lê `projectReference` DENTRO
 *      da transação e devolve o evento histórico e a referência CORRENTE (a lida na transação),
 *      SEM escrever. Com conteúdo diferente, recusa (`operationId-reutilizado`);
 *   2. lê `projectReference/{projectId}` e compara `expectedRevision` com a `revision` atual
 *      (sem referência, só `0` é aceito);
 *   3. lê `executions/{executionId}` e confere que pertence ao projeto. ⚠ O `projectId` da execução
 *      vem do BANCO, e nunca do corpo do pedido;
 *   4. grava a referência com `revision = atual + 1` (ou `1`) e o registro histórico.
 *
 * ⚠ **A revisão impede a troca às cegas.** A escolha A, depois B, depois A de novo, feita por quem
 * ainda via a revisão 1, é recusada (`referencia-mudou`) e devolve a referência corrente. A primeira
 * escolha concorrente (as duas esperam `0`) recusa a segunda com `referencia-ja-existe`.
 *
 * ⚠ **O QUE ISTO NÃO FAZ.** Não identifica quem escolheu: `authorship` é sempre
 * `'nao-autenticada'`, e o histórico registra a justificativa e o instante, e não a pessoa. As regras
 * propostas exigem esse valor. Não valida a justificativa além de ser texto não vazio. Não impede
 * que se escolha uma execução antiga ou desatualizada: isso é decisão de quem escolhe, e a tela
 * mostra os marcadores.
 */

import { doc, runTransaction } from 'firebase/firestore';
import { COLECAO_EXECUCOES } from '@/lib/execucoes';

export const COLECAO_REFERENCIA = 'projectReference';
export const COLECAO_HISTORICO = 'referenceChanges';
export const AUTORIA_NAO_AUTENTICADA = 'nao-autenticada';

export interface EntradaDeEscolha {
  projectId: string;
  executionId: string;
  expectedRevision: number;
  operationId: string;
  justification: string;
}

export interface EventoDeEscolha {
  operationId: string;
  projectId: string;
  executionId: string;
  revision: number;
  expectedRevision: number;
  justification: string;
  chosenAt: string;
  authorship: typeof AUTORIA_NAO_AUTENTICADA;
}

export interface ReferenciaGravada {
  executionId: string;
  revision: number;
  operationId: string;
  chosenAt: string;
  justification: string;
  authorship: typeof AUTORIA_NAO_AUTENTICADA;
}

export type DesfechoDaEscolha =
  | { tipo: 'efetivada'; evento: EventoDeEscolha; referencia: ReferenciaGravada }
  | { tipo: 'ja-registrada'; evento: EventoDeEscolha; referencia: ReferenciaGravada | null }
  | { tipo: 'operationId-reutilizado' }
  | { tipo: 'referencia-ja-existe'; referencia: ReferenciaGravada }
  | { tipo: 'referencia-mudou'; referencia: ReferenciaGravada | null }
  | { tipo: 'execucao-inexistente' }
  | { tipo: 'execucao-de-outro-projeto' };

const mesmoConteudo = (ev: Record<string, any>, e: EntradaDeEscolha) =>
  ev.projectId === e.projectId &&
  ev.executionId === e.executionId &&
  ev.expectedRevision === e.expectedRevision &&
  ev.justification === e.justification;

export async function escolherReferencia(db: unknown, entrada: EntradaDeEscolha): Promise<DesfechoDaEscolha> {
  const { projectId, executionId, expectedRevision, operationId, justification } = entrada;

  return runTransaction(db as any, async (tx: any): Promise<DesfechoDaEscolha> => {
    // 1. o registro histórico desta operação
    const snapHistorico = await tx.get(doc(db as any, COLECAO_HISTORICO, operationId));
    if (snapHistorico.exists()) {
      const existente = snapHistorico.data() as EventoDeEscolha;
      if (!mesmoConteudo(existente, entrada)) return { tipo: 'operationId-reutilizado' };
      // reenvio: a referência CORRENTE, lida nesta transação, e nenhuma escrita
      const lida = await tx.get(doc(db as any, COLECAO_REFERENCIA, projectId));
      return {
        tipo: 'ja-registrada',
        evento: existente,
        referencia: lida.exists() ? (lida.data() as ReferenciaGravada) : null,
      };
    }

    // 2. a referência corrente e a revisão esperada
    const snapReferencia = await tx.get(doc(db as any, COLECAO_REFERENCIA, projectId));
    const atual: ReferenciaGravada | null = snapReferencia.exists() ? (snapReferencia.data() as ReferenciaGravada) : null;
    if (atual === null && expectedRevision !== 0) return { tipo: 'referencia-mudou', referencia: null };
    if (atual !== null && expectedRevision === 0) return { tipo: 'referencia-ja-existe', referencia: atual };
    if (atual !== null && expectedRevision !== atual.revision) return { tipo: 'referencia-mudou', referencia: atual };

    // 3. a execução, lida do banco, e o projeto a que ela pertence
    const snapExecucao = await tx.get(doc(db as any, COLECAO_EXECUCOES, executionId));
    if (!snapExecucao.exists()) return { tipo: 'execucao-inexistente' };
    if ((snapExecucao.data() as Record<string, any>).projectId !== projectId) return { tipo: 'execucao-de-outro-projeto' };

    // 4. as duas escritas, juntas, com o MESMO instante
    const revision = (atual === null ? 0 : atual.revision) + 1;
    const chosenAt = new Date().toISOString();
    const evento: EventoDeEscolha = {
      operationId,
      projectId,
      executionId,
      revision,
      expectedRevision,
      justification,
      chosenAt,
      authorship: AUTORIA_NAO_AUTENTICADA,
    };
    const referencia: ReferenciaGravada = {
      executionId,
      revision,
      operationId,
      chosenAt,
      justification,
      authorship: AUTORIA_NAO_AUTENTICADA,
    };
    // ⚠ Os gravadores citam a coleção na própria chamada: é a forma que o censo reconhece.
    tx.set(doc(db as any, COLECAO_HISTORICO, operationId), evento);
    if (atual === null) {
      tx.set(doc(db as any, COLECAO_REFERENCIA, projectId), referencia); // primeira escolha
    } else {
      tx.update(doc(db as any, COLECAO_REFERENCIA, projectId), referencia); // escolhas seguintes
    }
    return { tipo: 'efetivada', evento, referencia };
  });
}
