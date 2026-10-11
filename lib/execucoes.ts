/**
 * lib/execucoes.ts
 *
 * **F07, A1: cada cálculo cria uma EXECUÇÃO, com idempotência por pedido.**
 *
 * ⚠ **SÓ SERVIDOR.** Importa `node:crypto` e é usado pela rota `app/api/calculate/route.ts`. O que a
 * tela precisa para ler uma execução está em `lib/identificacao-da-execucao.ts`, que não importa nada
 * de Node.
 *
 * O que este módulo faz, e o que a rota faz:
 *
 *   rota:   valida o corpo; CONSULTA o pedido; se existir, devolve a execução sem calcular; senão
 *           CALCULA, fora de transação; e então chama `registrarExecucao`.
 *   módulo: `registrarExecucao` abre UMA transação, RELÊ o pedido e decide: se agora existir,
 *           DESCARTA o resultado recém-calculado e devolve o registrado; senão cria
 *           `executions/{executionId}` e `executionRequests/{requestId}` JUNTOS.
 *
 * ⚠ **O pedido é conferido nas DUAS leituras, a inicial e a da transação**, contra `projectId` e
 * `paramsDigest`. Conferir só na primeira deixaria a janela em que o registro aparece entre elas:
 * um pedido com o mesmo `requestId` e outros parâmetros receberia a execução de outro pedido.
 *
 * ⚠ **O QUE ISTO NÃO FAZ.** Não identifica quem pediu (`requestedBy` não existe: F07 não introduz
 * autoria verificada). Não impede que dois pedidos com `requestId` DIFERENTES e os mesmos parâmetros
 * produzam duas execuções, e isso é o comportamento declarado ("`requestId` distintos produzem duas
 * execuções"). A idempotência é por PEDIDO, e não por parâmetros.
 *
 * ⚠ **O formato de `executions` obedece às regras propostas** (`firestore-regras/firestore.rules`):
 * `projectId`, `requestId`, `executionId`, `engineVersion` e `calculatedAt` em texto não vazio,
 * `includedRespondents` em lista e `judgmentsDigest` em mapa, NO TOPO do documento. Esses dois
 * últimos já existem em `metadata` do `calculationResult`; o documento de execução os repete no topo
 * com o MESMO valor (a mesma referência), e `metadata` segue intacto. Nenhum campo do
 * `calculationResult` é recalculado, reordenado, preenchido ou omitido.
 */

import crypto from 'node:crypto';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { ENGINE_VERSION } from '@/lib/engine-version';

export const COLECAO_EXECUCOES = 'executions';
export const COLECAO_PEDIDOS = 'executionRequests';

/**
 * Identificador de pedido ou de operação. Vira id de documento do Firestore, que não pode conter
 * `/`, nem ser `.` ou `..`, e tem limite de tamanho; o formato abaixo cobre UUID e é restritivo de
 * propósito.
 */
export const FORMATO_DO_IDENTIFICADOR = /^[A-Za-z0-9_-]{8,128}$/;

export function identificadorValido(x: unknown): x is string {
  return typeof x === 'string' && FORMATO_DO_IDENTIFICADOR.test(x);
}

/**
 * Resumo dos parâmetros do pedido. ⚠ `excludedRespondentIds` entra ORDENADO: a mesma lista em outra
 * ordem é o mesmo pedido. A ordem dos ELEMENTOS DO DOCUMENTO de execução (`metadata.excludedRespondentIds`)
 * NÃO é alterada: o que se ordena é uma cópia, só para o resumo.
 */
export function calcularParamsDigest(projectId: string, excludedRespondentIds: readonly string[]): string {
  const ordenados = [...excludedRespondentIds].sort();
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ projectId, excludedRespondentIds: ordenados }), 'utf8')
    .digest('hex');
}

const textoOuNull = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);

/** Os campos que F07 acrescenta no topo do documento de execução, além dos do `calculationResult`. */
export const CAMPOS_DE_ENVELOPE = [
  'requestId',
  'engineVersion',
  'codeRevision',
  'projectUpdatedAt',
  'includedRespondents',
  'judgmentsDigest',
] as const;

/**
 * Monta o documento de execução a partir do `calculationResult` que a rota já monta.
 *
 * ⚠ **`codeRevision` e `projectUpdatedAt` AUSENTES são gravados como `null`, e nunca preenchidos.**
 * `null` aqui significa "não havia valor": a variável `VERCEL_GIT_COMMIT_SHA` não estava definida,
 * ou o projeto não tinha `updatedAt` em texto. As telas e as exportações apresentam `null` como
 * ausência.
 */
export function montarDocumentoDeExecucao(
  calculationResult: Record<string, any>,
  extras: { requestId: string; codeRevision: unknown; projectUpdatedAt: unknown }
): Record<string, any> {
  for (const campo of CAMPOS_DE_ENVELOPE) {
    if (campo in calculationResult) {
      throw new Error(`campo do calculationResult colide com o envelope da execução: ${campo}`);
    }
  }
  const meta = calculationResult.metadata ?? {};
  return {
    ...calculationResult,
    requestId: extras.requestId,
    engineVersion: ENGINE_VERSION,
    codeRevision: textoOuNull(extras.codeRevision),
    projectUpdatedAt: textoOuNull(extras.projectUpdatedAt),
    includedRespondents: meta.includedRespondents,
    judgmentsDigest: meta.judgmentsDigest,
  };
}

export type ConsultaDoPedido =
  | { tipo: 'ausente' }
  | { tipo: 'divergente' }
  | { tipo: 'inconsistente'; motivo: string }
  | { tipo: 'registrado'; executionId: string; execucao: Record<string, any> };

/**
 * A leitura INICIAL do pedido, fora de transação. Existindo e conferindo, devolve a execução
 * registrada; o chamador NÃO calcula.
 */
export async function consultarPedido(
  db: unknown,
  requestId: string,
  esperado: { projectId: string; paramsDigest: string }
): Promise<ConsultaDoPedido> {
  const snap = await getDoc(doc(db as any, COLECAO_PEDIDOS, requestId));
  if (!snap.exists()) return { tipo: 'ausente' };
  const pedido = snap.data() as Record<string, any>;
  if (pedido.projectId !== esperado.projectId || pedido.paramsDigest !== esperado.paramsDigest) {
    return { tipo: 'divergente' };
  }
  const execSnap = await getDoc(doc(db as any, COLECAO_EXECUCOES, String(pedido.executionId)));
  if (!execSnap.exists()) {
    return { tipo: 'inconsistente', motivo: `o pedido ${requestId} aponta para a execução ${pedido.executionId}, que não existe` };
  }
  return { tipo: 'registrado', executionId: String(pedido.executionId), execucao: execSnap.data() as Record<string, any> };
}

export type DesfechoDoRegistro =
  | { tipo: 'criada' }
  | { tipo: 'ja-registrada'; executionId: string; execucao: Record<string, any> }
  | { tipo: 'divergente' }
  | { tipo: 'inconsistente'; motivo: string };

/**
 * A transação: relê o pedido e decide. Cria os DOIS documentos juntos, ou nenhum.
 *
 * ⚠ As leituras vêm antes das escritas (o serviço exige), e a transação é repetida pelo SDK em caso
 * de contenção: na repetição, a releitura enxerga o pedido que outra chamada acabou de criar.
 */
export async function registrarExecucao(
  db: unknown,
  entrada: {
    requestId: string;
    projectId: string;
    paramsDigest: string;
    excludedRespondentIds: readonly string[];
    execucao: Record<string, any>;
  }
): Promise<DesfechoDoRegistro> {
  const { requestId, projectId, paramsDigest, excludedRespondentIds, execucao } = entrada;
  const executionId = String(execucao.executionId);

  return runTransaction(db as any, async (tx: any): Promise<DesfechoDoRegistro> => {
    const refPedido = doc(db as any, COLECAO_PEDIDOS, requestId);
    const snap = await tx.get(refPedido);

    if (snap.exists()) {
      const existente = snap.data() as Record<string, any>;
      // ⚠ A SEGUNDA conferência de parâmetros: a da leitura inicial não vale aqui.
      if (existente.projectId !== projectId || existente.paramsDigest !== paramsDigest) {
        return { tipo: 'divergente' };
      }
      const execSnap = await tx.get(doc(db as any, COLECAO_EXECUCOES, String(existente.executionId)));
      if (!execSnap.exists()) {
        return { tipo: 'inconsistente', motivo: `o pedido ${requestId} aponta para a execução ${existente.executionId}, que não existe` };
      }
      return { tipo: 'ja-registrada', executionId: String(existente.executionId), execucao: execSnap.data() as Record<string, any> };
    }

    // ⚠ Os dois `tx.set` citam a coleção na própria chamada (e não por uma referência guardada em
    //   variável): é a forma que o censo de gravadores (`engine-census.test.ts`) reconhece. Na
    //   primeira medição o padrão não casou com `tx.set(refPedido, ...)`.
    tx.set(doc(db as any, COLECAO_EXECUCOES, executionId), execucao);
    tx.set(doc(db as any, COLECAO_PEDIDOS, requestId), {
      projectId,
      executionId,
      paramsDigest,
      // ⚠ Sem `requestedBy`: F07 não introduz autoria verificada.
      excludedRespondentIds: [...excludedRespondentIds].sort(),
      createdAt: new Date().toISOString(),
    });
    return { tipo: 'criada' };
  });
}
