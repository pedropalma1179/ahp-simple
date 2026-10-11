/**
 * lib/referencia-leitura.ts
 *
 * **F07, A2: as LEITURAS do banco que a tela de resultados faz para saber o que exibir.** Roda no
 * navegador (usa só `firebase/firestore`, sem Node). A decisão de o que exibir fica aqui, e não no
 * componente, para ser exercitada por teste com o duplo do Firestore.
 *
 * Ordem da decisão ao carregar a tela:
 *
 *   1. há referência (`projectReference/{projectId}`) e a execução dela existe: exibe a execução da
 *      referência (estado `referencia-escolhida`);
 *   2. a referência aponta para uma execução que NÃO existe: avisa, e segue para 3 (não substitui a
 *      referência em silêncio);
 *   3. há o documento anterior a F07 (`calculations/{projectId}`): exibe-o. Sem referência, o estado é
 *      `resultado-anterior-sem-referencia`. Se há execuções calculadas DEPOIS dele, a tela avisa e
 *      não as exibe sozinha;
 *   4. não há documento anterior mas há execuções: exibe a mais recente, nomeada
 *      (`outra-execucao`, sem referência escolhida);
 *   5. nada: não há o que exibir.
 *
 * ⚠ **A listagem de execuções lê os DOCUMENTOS COMPLETOS.** O SDK web do Firestore não projeta
 * campos, e o documento de execução é grande (as trajetórias de sensibilidade, as matrizes
 * agregadas). Com muitas execuções a carga cresce com o número delas. É limite conhecido, e não foi
 * tratado em A2.
 */

import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import {
  type Exibicao,
  type ReferenciaDoProjeto,
  type RegistroDeEscolha,
  type ResumoDeExecucao,
  ordenarExecucoes,
  resumirExecucao,
} from '@/lib/referencia-do-projeto';

const COLECAO_EXECUCOES = 'executions';
const COLECAO_REFERENCIA = 'projectReference';
const COLECAO_HISTORICO = 'referenceChanges';

export async function lerReferencia(db: unknown, projectId: string): Promise<ReferenciaDoProjeto | null> {
  const snap = await getDoc(doc(db as any, COLECAO_REFERENCIA, projectId));
  return snap.exists() ? (snap.data() as ReferenciaDoProjeto) : null;
}

export async function lerExecucao(db: unknown, executionId: string): Promise<Record<string, any> | null> {
  const snap = await getDoc(doc(db as any, COLECAO_EXECUCOES, executionId));
  return snap.exists() ? (snap.data() as Record<string, any>) : null;
}

export interface ListaDeExecucoes {
  resumos: ResumoDeExecucao[];
  /** Os documentos completos, por `executionId`, para a tela não ler de novo o que vai exibir. */
  documentos: Map<string, Record<string, any>>;
}

export async function listarExecucoes(db: unknown, projectId: string): Promise<ListaDeExecucoes> {
  const snap = await getDocs(query(collection(db as any, COLECAO_EXECUCOES), where('projectId', '==', projectId)));
  const documentos = new Map<string, Record<string, any>>();
  const resumos: ResumoDeExecucao[] = [];
  for (const d of snap.docs) {
    const dados = d.data() as Record<string, any>;
    documentos.set(d.id, dados);
    resumos.push(resumirExecucao(d.id, dados));
  }
  return { resumos: ordenarExecucoes(resumos), documentos };
}

/** O histórico de escolhas do projeto, da revisão mais alta para a mais baixa. */
export async function listarHistorico(db: unknown, projectId: string): Promise<RegistroDeEscolha[]> {
  const snap = await getDocs(query(collection(db as any, COLECAO_HISTORICO), where('projectId', '==', projectId)));
  return snap.docs.map((d: any) => d.data() as RegistroDeEscolha).sort((a: RegistroDeEscolha, b: RegistroDeEscolha) => b.revision - a.revision);
}

export interface ApresentacaoInicial {
  referencia: ReferenciaDoProjeto | null;
  /** `null`: não há nada a exibir. */
  exibicao: Exibicao | null;
  /** O documento a exibir (a execução, ou o documento anterior a F07). */
  documento: Record<string, any> | null;
  resumos: ResumoDeExecucao[];
  documentos: Map<string, Record<string, any>>;
  /** Frases que a tela mostra junto da apresentação. */
  avisos: string[];
}

export async function carregarApresentacaoInicial(db: unknown, projectId: string): Promise<ApresentacaoInicial> {
  const avisos: string[] = [];
  const [referencia, lista] = await Promise.all([lerReferencia(db, projectId), listarExecucoes(db, projectId)]);
  const base = { referencia, resumos: lista.resumos, documentos: lista.documentos };

  // 1. a referência e a execução dela
  if (referencia !== null) {
    const doReferencia = lista.documentos.get(referencia.executionId) ?? (await lerExecucao(db, referencia.executionId));
    if (doReferencia !== null && doReferencia !== undefined) {
      return { ...base, exibicao: { tipo: 'execucao', executionId: referencia.executionId }, documento: doReferencia, avisos };
    }
    // 2. a referência aponta para o nada: não é substituída em silêncio
    avisos.push(
      `A referência escolhida (revisão ${referencia.revision}) aponta para a execução ${referencia.executionId}, que não foi encontrada. A tela exibe outro resultado, que NÃO é a referência.`
    );
  }

  // 3. o documento anterior a F07
  // ⚠ LEITURA do documento anterior a F07, com o nome da coleção LITERAL na chamada: é a forma que a
  //   categoria 3 do censo de gravadores (`engine-census.test.ts`) enxerga.
  const anteriorSnap = await getDoc(doc(db as any, 'calculations', projectId));
  if (anteriorSnap.exists()) {
    const anterior = anteriorSnap.data() as Record<string, any>;
    const instanteDoAnterior = typeof anterior.calculatedAt === 'string' ? Date.parse(anterior.calculatedAt) : NaN;
    if (lista.resumos.length > 0) {
      if (Number.isFinite(instanteDoAnterior)) {
        const posteriores = lista.resumos.filter(r => {
          const t = r.calculatedAt === null ? NaN : Date.parse(r.calculatedAt);
          return Number.isFinite(t) && t > instanteDoAnterior;
        });
        if (posteriores.length > 0) {
          const maisRecente = posteriores[0]; // a lista já vem da mais recente para a mais antiga
          avisos.push(
            `Há ${posteriores.length} execução(ões) calculada(s) depois deste resultado anterior; a mais recente é a ${maisRecente.executionId} (${maisRecente.calculatedAt}). A tela não as exibe sozinha: abra-as na lista.`
          );
        }
      } else {
        avisos.push(
          'Há execuções registradas para este projeto, mas o resultado anterior não traz uma data legível; não foi possível dizer se alguma é posterior a ele. Abra-as na lista.'
        );
      }
    }
    return { ...base, exibicao: { tipo: 'anterior-a-f07' }, documento: anterior, avisos };
  }

  // 4. sem documento anterior: a execução mais recente, nomeada
  if (lista.resumos.length > 0) {
    const maisRecente = lista.resumos[0];
    return {
      ...base,
      exibicao: { tipo: 'execucao', executionId: maisRecente.executionId },
      documento: lista.documentos.get(maisRecente.executionId) ?? null,
      avisos,
    };
  }

  // 5. nada
  return { ...base, exibicao: null, documento: null, avisos };
}
