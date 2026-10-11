/**
 * lib/referencia-do-projeto.ts
 *
 * **F07, A2: o que a tela diz sobre a REFERÊNCIA do projeto e sobre a execução que ela exibe.**
 * Módulo PURO: sem Firestore, sem Node, sem React. A leitura do banco está em
 * `lib/referencia-leitura.ts`; a apresentação, em `components/ReferenciaDoProjeto.tsx`.
 *
 * Três coisas independentes moram aqui:
 *
 *   1. **Os três estados da apresentação**, sempre nomeados, nunca omitidos:
 *        - `referencia-escolhida`            a tela exibe a execução que é a referência;
 *        - `resultado-anterior-sem-referencia`  a tela exibe o documento anterior a F07
 *                                            (`calculations/{projectId}`) e o projeto não tem referência;
 *        - `outra-execucao`                  a tela exibe algo que NÃO é a referência (uma execução da lista,
 *                                            uma execução recém-calculada, ou o documento anterior enquanto
 *                                            já existe uma referência).
 *   2. **A atualidade em relação ao projeto**, em quatro estados, comparando os MARCADORES `updatedAt`.
 *   3. **A mudança da referência com a tela aberta**: a tela AVISA e não troca o que foi apresentado.
 *
 * ⚠ **A ATUALIDADE É COMPARAÇÃO DE MARCADORES, E NÃO DE CONTEÚDO.** Por LEITURA do código versionado
 * (e não por medição sobre produção), o `updatedAt` do projeto é gravado só ao CRIAR o projeto e ao
 * SALVAR a edição dele (`app/decisor/projetos/page.tsx`, `addDoc` e `updateDoc` sobre `projects`).
 * O envio de resposta grava o `updatedAt` da RESPOSTA, e não o do projeto; a mudança de status e de
 * dados demográficos de um respondente (`app/avaliacao`, `app/perfil`) também não o grava. Portanto
 * "sem alteração identificada pelo marcador" NÃO quer dizer "sem alteração nas respostas ou nos
 * respondentes", e esta tela nunca afirma isso. Nenhum dos quatro estados se chama "atual". Escritas
 * por fora do código versionado (console do Firebase, scripts) não são alcançadas por esta leitura.
 */

export type EstadoDaApresentacao = 'referencia-escolhida' | 'resultado-anterior-sem-referencia' | 'outra-execucao';

export type EstadoDeAtualidade = 'sem-alteracao-identificada' | 'projeto-posterior' | 'marcadores-fora-de-ordem' | 'nao-verificavel';

/** O que `projectReference/{projectId}` guarda. */
export interface ReferenciaDoProjeto {
  executionId: string;
  revision: number;
  operationId: string;
  chosenAt: string;
  justification: string;
  authorship: string;
}

/** O que `referenceChanges/{operationId}` guarda. */
export interface RegistroDeEscolha extends ReferenciaDoProjeto {
  projectId: string;
  expectedRevision: number;
}

/** Os campos de uma execução que a lista mostra. Ausente é `null`, e nunca é preenchido. */
export interface ResumoDeExecucao {
  executionId: string;
  calculatedAt: string | null;
  responseCount: number | null;
  engineVersion: string | null;
  codeRevision: string | null;
  projectUpdatedAt: string | null;
  excludedCount: number | null;
}

export const TEXTO_DE_AUTORIA =
  'Autoria não autenticada: o histórico registra a justificativa e o instante de cada escolha, mas o sistema não verifica quem a fez.';

export const TEXTO_DO_LIMITE_DO_MARCADOR =
  'O marcador de atualização do projeto não registra mudanças nas respostas nem nos respondentes, e esta tela não afirma que elas não ocorreram.';

const textoOuNull = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);
const numeroOuNull = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/** Resume uma execução (ou o documento anterior a F07) SEM preencher nada que falte. */
export function resumirExecucao(executionId: string, documento: Record<string, any> | null | undefined): ResumoDeExecucao {
  const d = documento ?? {};
  return {
    executionId,
    calculatedAt: textoOuNull(d.calculatedAt),
    responseCount: numeroOuNull(d.responseCount),
    engineVersion: textoOuNull(d.engineVersion),
    codeRevision: textoOuNull(d.codeRevision),
    projectUpdatedAt: textoOuNull(d.projectUpdatedAt),
    excludedCount: Array.isArray(d.metadata?.excludedRespondentIds) ? d.metadata.excludedRespondentIds.length : null,
  };
}

/**
 * Mais recente primeiro, por `calculatedAt` (instante). Sem instante legível, vai para o fim; o
 * desempate é o `executionId`, para a ordem ser determinística.
 */
export function ordenarExecucoes(lista: readonly ResumoDeExecucao[]): ResumoDeExecucao[] {
  const instante = (r: ResumoDeExecucao) => {
    const t = r.calculatedAt === null ? NaN : Date.parse(r.calculatedAt);
    return Number.isFinite(t) ? t : -Infinity;
  };
  return [...lista].sort((a, b) => {
    const d = instante(b) - instante(a);
    if (d !== 0 && !Number.isNaN(d)) return d;
    return a.executionId < b.executionId ? -1 : a.executionId > b.executionId ? 1 : 0;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Os três estados da apresentação
// ─────────────────────────────────────────────────────────────────────────────

/** O que a tela está exibindo agora. */
export type Exibicao = { tipo: 'execucao'; executionId: string } | { tipo: 'anterior-a-f07' };

export interface Apresentacao {
  estado: EstadoDaApresentacao;
  /** A frase que a tela mostra, sempre. */
  texto: string;
}

export function estadoDaApresentacao(referencia: ReferenciaDoProjeto | null, exibicao: Exibicao): Apresentacao {
  if (exibicao.tipo === 'execucao' && referencia !== null && referencia.executionId === exibicao.executionId) {
    return {
      estado: 'referencia-escolhida',
      texto: `Referência escolhida do projeto: execução ${exibicao.executionId} (revisão ${referencia.revision}).`,
    };
  }
  if (exibicao.tipo === 'anterior-a-f07' && referencia === null) {
    return {
      estado: 'resultado-anterior-sem-referencia',
      texto: 'Resultado anterior, sem referência escolhida: este é o documento calculado antes da preservação das execuções, e o projeto ainda não tem referência.',
    };
  }
  if (exibicao.tipo === 'anterior-a-f07') {
    return {
      estado: 'outra-execucao',
      texto: `Exibindo outro resultado, que NÃO é a referência escolhida (execução ${referencia!.executionId}, revisão ${referencia!.revision}): o documento calculado antes da preservação das execuções.`,
    };
  }
  if (referencia === null) {
    return {
      estado: 'outra-execucao',
      texto: `Exibindo a execução ${exibicao.executionId}. O projeto ainda não tem referência escolhida.`,
    };
  }
  return {
    estado: 'outra-execucao',
    texto: `Exibindo outra execução (${exibicao.executionId}), que NÃO é a referência escolhida (execução ${referencia.executionId}, revisão ${referencia.revision}).`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. A atualidade em relação ao projeto
// ─────────────────────────────────────────────────────────────────────────────

export interface Atualidade {
  estado: EstadoDeAtualidade;
  texto: string;
  /** O marcador gravado na execução, como estava (`null` se ausente). */
  marcadorDaExecucao: string | null;
  /** O marcador atual do projeto, como estava (`null` se ausente). */
  marcadorDoProjeto: string | null;
  limite: string;
}

const instanteOuNull = (x: unknown): number | null => {
  if (typeof x !== 'string' || x === '') return null;
  const t = Date.parse(x);
  return Number.isFinite(t) ? t : null;
};

/**
 * Compara, em ORDEM TEMPORAL (e não por texto), o `projectUpdatedAt` gravado na execução com o
 * `updatedAt` atual do projeto.
 *
 * @param sujeito  o que está sendo qualificado: `'referência'` quando a execução é a referência, e
 *                 `'execução exibida'` nos demais casos.
 */
export function atualidadeDoProjeto(
  projectUpdatedAtDaExecucao: unknown,
  updatedAtAtualDoProjeto: unknown,
  sujeito: 'referência' | 'execução exibida' = 'referência'
): Atualidade {
  const nExec = instanteOuNull(projectUpdatedAtDaExecucao);
  const nProj = instanteOuNull(updatedAtAtualDoProjeto);
  const mExec = typeof projectUpdatedAtDaExecucao === 'string' && projectUpdatedAtDaExecucao !== '' ? projectUpdatedAtDaExecucao : null;
  const mProj = typeof updatedAtAtualDoProjeto === 'string' && updatedAtAtualDoProjeto !== '' ? updatedAtAtualDoProjeto : null;
  const base = { marcadorDaExecucao: mExec, marcadorDoProjeto: mProj, limite: TEXTO_DO_LIMITE_DO_MARCADOR };

  if (nExec === null || nProj === null) {
    const quem =
      nExec === null && nProj === null
        ? 'os dois marcadores estão ausentes ou ilegíveis'
        : nExec === null
          ? 'o marcador da execução está ausente ou ilegível'
          : 'o marcador atual do projeto está ausente ou ilegível';
    return { estado: 'nao-verificavel', texto: `atualidade não verificável (${quem})`, ...base };
  }
  const datas = `marcador da execução: ${mExec}; marcador atual do projeto: ${mProj}`;
  if (nExec === nProj) {
    return { estado: 'sem-alteracao-identificada', texto: 'sem alteração identificada pelo marcador de atualização do projeto', ...base };
  }
  if (nProj > nExec) {
    return { estado: 'projeto-posterior', texto: `${sujeito} desatualizada em relação ao projeto (${datas})`, ...base };
  }
  return { estado: 'marcadores-fora-de-ordem', texto: `marcadores em ordem inesperada (${datas})`, ...base };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. A referência mudou com a tela aberta
// ─────────────────────────────────────────────────────────────────────────────

export interface MudancaDeReferencia {
  mudou: boolean;
  /** Vazio quando não mudou. A tela AVISA com este texto e NÃO troca o que exibe. */
  texto: string;
}

/**
 * Compara a referência que a tela CARREGOU com a corrente. Mudou se a presença, a revisão ou a
 * operação diferem. ⚠ Só avisa: quem decide carregar a nova referência é a pessoa.
 */
export function compararReferencia(carregada: ReferenciaDoProjeto | null, corrente: ReferenciaDoProjeto | null): MudancaDeReferencia {
  if (carregada === null && corrente === null) return { mudou: false, texto: '' };
  if (carregada === null && corrente !== null) {
    return {
      mudou: true,
      texto: `O projeto passou a ter uma referência escolhida (execução ${corrente.executionId}, revisão ${corrente.revision}) enquanto esta tela estava aberta. A tela continua exibindo o que exibia.`,
    };
  }
  if (carregada !== null && corrente === null) {
    return {
      mudou: true,
      texto: `A referência que esta tela carregou (revisão ${carregada.revision}) não foi encontrada na leitura mais recente. A tela continua exibindo o que exibia.`,
    };
  }
  const a = carregada as ReferenciaDoProjeto;
  const b = corrente as ReferenciaDoProjeto;
  if (a.revision === b.revision && a.operationId === b.operationId && a.executionId === b.executionId) {
    return { mudou: false, texto: '' };
  }
  return {
    mudou: true,
    texto: `A referência do projeto mudou enquanto esta tela estava aberta: da revisão ${a.revision} (execução ${a.executionId}) para a revisão ${b.revision} (execução ${b.executionId}). A tela continua exibindo o que exibia.`,
  };
}

/** Texto de ausência: o que a tela escreve no lugar de um campo que a execução não tem. */
export const AUSENTE = 'ausente';

export const comoTexto = (x: string | number | null | undefined): string => (x === null || x === undefined ? AUSENTE : String(x));
