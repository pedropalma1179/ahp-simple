// lib/ai-reviewer/vinculo-execucao.ts
/**
 * **A.12 etapa 3, estágio 1: o vínculo da avaliação de qualidade com a execução.**
 *
 * ⚠ **Módulo próprio, e não `avaliacao-qualidade.ts`.** Aquele é o contrato fechado da etapa
 * 1, e o vínculo é concern próprio. A justificativa é essa, e **não** a testabilidade.
 *
 * ⚠ **Este estágio REPRESENTA o vínculo, e NÃO decide o que a divergência faz com a
 * classificação.** Nada aqui acrescenta causa de suspensão a `elegivelParaClassificacao`,
 * nem altera `calculateGrade`. O bloco que vai ao modelo não emite veredito.
 *
 * ⚠ **Por que a decisão mora aqui, e não na tela.** A tela é `'use client'` e nenhum teste
 * a executa: não há `jsdom` nem `@testing-library` no repositório. Toda decisão fica neste
 * módulo puro, exercitado por execução; a fiação na tela é verificada por LEITURA, `tsc` e
 * `build`. Isso é um limite declarado, e não uma equivalência com execução.
 *
 * ⚠ **O que `vinculado` significa:** correspondência de identificadores segundo as regras
 * declaradas abaixo. **Não** comprova que os CRs foram calculados sobre as versões
 * registradas, e nenhum resumo é verificado aqui.
 *
 * ⚠ **Este módulo NÃO importa `lib/julgamentos-resumo.ts`**, que depende de `node:crypto` e
 * `Buffer` e não pode ir ao navegador, e não reimplementa a serialização: duas
 * implementações da mesma versão são duas versões. O que o módulo faz com os resumos é
 * TRANSPORTÁ-LOS, como texto, sem recalcular.
 */

export type EstadoDoVinculo = 'indisponivel' | 'invalido' | 'vinculado' | 'divergente';

export type OrigemDaLista = 'analiseDeQualidade' | 'fallbackSobreRespostas' | 'nenhuma';

/**
 * A EXPRESSÃO que produziu o identificador, ou o motivo de ele não existir.
 * `vazio` e `posicao` são identidade AUSENTE.
 */
export type CampoDoIdentificador = 'respondentId' | 'id' | 'visitorId' | 'vazio' | 'posicao';

export type MotivoDeSobra =
  | 'identidade-ausente-vazia'
  | 'identidade-ausente-por-posicao'
  | 'fora-do-documento';

export interface ElementoAvaliado {
  /** `null` quando a identidade é ausente. */
  identificador: string | null;
  campo: CampoDoIdentificador;
  /**
   * ⚠ LOCALIZADOR no registro, e NÃO identidade. Existe porque um elemento de identidade
   * ausente não tem outro modo de ser apontado. Nada aqui reconstrói identidade por posição.
   */
  posicaoNaLista: number;
}

export interface SobraNaAvaliacao extends ElementoAvaliado {
  motivo: MotivoDeSobra;
}

export interface RepetidoNaAvaliacao {
  identificador: string;
  ocorrencias: number;
  posicoesNaLista: number[];
}

export interface EntradaDoMapa {
  responseDocId: string | null;
  judgmentsSha256: string | null;
  judgmentsUnavailableReason: string | null;
}

export interface ResumoDoPainel {
  serialization: string;
  algorithm: string;
  panel: string | null;
  unavailableReason: string | null;
}

export interface ResumoDoConteudo {
  /** ⚠ Sempre `false`: os resumos são TRANSPORTADOS, e nunca verificados por este módulo. */
  verificado: false;
  /** ⚠ O resumo do painel e o mapa cobrem o conjunto do DOCUMENTO, e não o enviado. */
  cobre: 'incluidosNoDocumento';
  /** `null`: ausente ou malformado no documento, ou estado `indisponivel`. */
  painel: ResumoDoPainel | null;
  motivoSemPainel: string | null;
  /** Chaveado por `respondentId`, e NUNCA por posição. `null`: o mapa não viaja. */
  mapaPorRespondentId: Record<string, EntradaDoMapa> | null;
  /**
   * ⚠ TRÊS listas que não se confundem. Regra de valor: comparação NÃO realizada produz
   * `null`; realizada sem ocorrência produz `[]`.
   */
  enviadosSemEntradaNoMapa: string[] | null;
  enviadosComResumoIndisponivel: { respondentId: string; motivo: string }[] | null;
  entradasDeNaoEnviados: string[] | null;
}

export interface VinculoDaExecucao {
  estado: EstadoDoVinculo;
  motivo: string;
  /** `invalido`: TODAS as regras violadas, sem escolher uma em silêncio. Nos demais: `null`. */
  violacoes: string[] | null;
  executionId: string | null;
  origemDaListaAvaliada: OrigemDaLista;
  /** Por elemento, ANTES de qualquer restrição, com a expressão que produziu o identificador. */
  avaliadosAntesDaRestricao: ElementoAvaliado[];
  /** `null`: comparação não realizada. */
  incluidosNoDocumento: string[] | null;
  divergencia: {
    sobraNoDocumento: string[] | null;
    sobraNaAvaliacao: SobraNaAvaliacao[] | null;
    repetidosNaAvaliacao: RepetidoNaAvaliacao[] | null;
  };
  /** Os identificadores DEPOIS da restrição, na ordem da lista. */
  enviados: (string | null)[];
  cobertura: {
    restringiu: boolean;
    avaliadosAntesDaRestricao: number;
    enviados: number;
    incluidosNoDocumento: number | null;
    enviadosDiferemDosAvaliados: boolean;
    /** `null`: comparação não realizada. */
    enviadosIguaisAoDocumento: boolean | null;
  };
  resumoDoConteudo: ResumoDoConteudo;
}

// ======================================================================================
// A IDENTIDADE DE CADA ELEMENTO DA LISTA AVALIADA
// ======================================================================================

/**
 * ⚠ A expressão do ramo `fallbackSobreRespostas`, PALAVRA POR PALAVRA, e ela é a que a tela
 * usa em `id:` (`page.tsx`, montagem de `respondentesComCR`). A tela chama ESTA função, para
 * que o identificador enviado e o identificador comparado saiam do MESMO código. Devolve o
 * valor CRU da expressão, sem coerção, como a linha original devolvia.
 *
 * ⚠ A ordem difere da dos outros quatro sítios: aqui `visitorId` vem antes de `id`. A mesma
 * resposta pode receber identificador diferente conforme o ramo que rodou. **Não se unifica
 * nesta rodada:** seria mudança de comportamento.
 */
export function idDoElementoNoFallback(resposta: any, indice: number): any {
  return resposta.visitorId || resposta.id || `resp-${indice + 1}`;
}

/**
 * ⚠ A expressão do ramo `analiseDeQualidade`: a MESMA que o filtro de excluídos usa em
 * `page.tsx` (`r.respondentId || r.id || r.visitorId || ''`). Fica escrita aqui uma vez, e
 * um teste ancora por leitura que as duas ocorrências da tela seguem sendo essa expressão.
 */
export function idDoElementoNaAnalise(elemento: any): any {
  return elemento.respondentId || elemento.id || elemento.visitorId || '';
}

const comoObjeto = (x: unknown): any => (x !== null && x !== undefined ? x : {});

export function identificarNaAnalise(elemento: unknown, posicaoNaLista: number): ElementoAvaliado {
  const o = comoObjeto(elemento);
  const valor = idDoElementoNaAnalise(o);
  if (valor === '') return { identificador: null, campo: 'vazio', posicaoNaLista };
  const campo: CampoDoIdentificador =
    valor === o.respondentId ? 'respondentId' : valor === o.id ? 'id' : 'visitorId';
  return { identificador: String(valor), campo, posicaoNaLista };
}

export function identificarNoFallback(elemento: unknown, posicaoNaLista: number): ElementoAvaliado {
  const o = comoObjeto(elemento);
  const valor = idDoElementoNoFallback(o, posicaoNaLista);
  // ⚠ Elemento cuja identidade veio de `resp-${idx + 1}` é IDENTIDADE POR POSIÇÃO, e por
  //   isso ausente: nunca corresponde a ninguém.
  if (valor !== o.visitorId && valor !== o.id) {
    return { identificador: null, campo: 'posicao', posicaoNaLista };
  }
  return {
    identificador: String(valor),
    campo: valor === o.visitorId ? 'visitorId' : 'id',
    posicaoNaLista,
  };
}

// ======================================================================================
// A LEITURA DO DOCUMENTO DE CÁLCULO
// ======================================================================================

/** O que a tela lê de `calculation`. Tudo `unknown`: o documento vem do Firestore. */
export interface DocumentoDeCalculo {
  executionId?: unknown;
  metadata?: {
    includedRespondents?: unknown;
    judgmentsDigest?: unknown;
  } | null;
}

interface ItemValido {
  respondentId: string;
  entrada: EntradaDoMapa;
}

type DocumentoLido =
  | {
      situacao: 'indisponivel';
      motivo: string;
      executionId: string | null;
      painel: ResumoDoPainel | null;
      motivoSemPainel: string | null;
    }
  | {
      situacao: 'invalido';
      motivo: string;
      violacoes: string[];
      executionId: string | null;
      painel: ResumoDoPainel | null;
      motivoSemPainel: string | null;
    }
  | {
      situacao: 'valido';
      executionId: string;
      itens: ItemValido[];
      painel: ResumoDoPainel | null;
      motivoSemPainel: string | null;
    };

/**
 * ⚠ AUSENTE é `undefined` ou `null`. Ausente, vazio e malformado são TRÊS coisas: um campo
 * que nunca foi gravado não se confunde com uma lista gravada vazia nem com uma gravada
 * errada.
 */
const ausente = (x: unknown): boolean => x === undefined || x === null;

const stringNaoVazia = (x: unknown): x is string => typeof x === 'string' && x !== '';

/**
 * O resumo do painel, quando BEM FORMADO. Bem formado: objeto; `serialization` e
 * `algorithm` strings não vazias; `panel` string não vazia ou `null`; `unavailableReason`
 * `null` ou string; e `panel` nulo exige motivo. Fora disso o resumo NÃO viaja, e o motivo
 * diz por quê. ⚠ Nunca vira string vazia, zero ou resumo de outra coisa.
 */
function lerPainel(d: unknown): { painel: ResumoDoPainel | null; motivo: string | null } {
  if (ausente(d)) return { painel: null, motivo: 'judgmentsDigest ausente no documento de cálculo' };
  if (typeof d !== 'object' || Array.isArray(d)) {
    return { painel: null, motivo: 'judgmentsDigest malformado: não é objeto' };
  }
  const o = d as Record<string, unknown>;
  if (!stringNaoVazia(o.serialization)) {
    return { painel: null, motivo: 'judgmentsDigest malformado: serialization não é string não vazia' };
  }
  if (!stringNaoVazia(o.algorithm)) {
    return { painel: null, motivo: 'judgmentsDigest malformado: algorithm não é string não vazia' };
  }
  if (!(o.panel === null || stringNaoVazia(o.panel))) {
    return { painel: null, motivo: 'judgmentsDigest malformado: panel não é string não vazia nem null' };
  }
  if (!ausente(o.unavailableReason) && typeof o.unavailableReason !== 'string') {
    return { painel: null, motivo: 'judgmentsDigest malformado: unavailableReason não é string' };
  }
  if (o.panel === null && !stringNaoVazia(o.unavailableReason)) {
    return { painel: null, motivo: 'judgmentsDigest malformado: resumo do painel nulo sem motivo' };
  }
  return {
    painel: {
      serialization: o.serialization,
      algorithm: o.algorithm,
      panel: o.panel as string | null,
      unavailableReason: typeof o.unavailableReason === 'string' ? o.unavailableReason : null,
    },
    motivo: null,
  };
}

/**
 * A entrada do mapa a partir de um item do documento. ⚠ Resumo ausente ou malformado fica
 * `null` COM motivo, e NUNCA vira string vazia, zero ou resumo de outra pessoa. Se o
 * documento traz resumo E motivo, os DOIS se conservam: contradição não se resolve em silêncio.
 */
function entradaDoMapa(item: Record<string, unknown>): EntradaDoMapa {
  const sha = stringNaoVazia(item.judgmentsSha256) ? item.judgmentsSha256 : null;
  let motivo = stringNaoVazia(item.judgmentsUnavailableReason) ? item.judgmentsUnavailableReason : null;
  if (sha === null && motivo === null) {
    motivo = 'resumo individual ausente ou malformado no documento de cálculo';
  }
  return {
    responseDocId: typeof item.responseDocId === 'string' ? item.responseDocId : null,
    judgmentsSha256: sha,
    judgmentsUnavailableReason: motivo,
  };
}

/**
 * ⚠ AS REGRAS DE BOA FORMAÇÃO, cada uma com motivo próprio, e avaliadas todas: o estado
 * `invalido` conserva TODAS as violações, e o `motivo` nomeia a primeira, na ordem da
 * especificação. Nada se escolhe em silêncio.
 */
function lerDocumento(calculo: DocumentoDeCalculo | null | undefined): DocumentoLido {
  const md = calculo?.metadata ?? null;
  const inc = md?.includedRespondents;
  const eid = calculo?.executionId;
  const { painel, motivo: motivoSemPainel } = lerPainel(md?.judgmentsDigest);
  const executionId = stringNaoVazia(eid) ? eid : null;

  // 1. INDISPONÍVEL: includedRespondents ausente OU executionId ausente.
  const faltam: string[] = [];
  if (ausente(inc)) faltam.push('metadata.includedRespondents');
  if (ausente(eid)) faltam.push('executionId');
  if (faltam.length > 0) {
    return {
      situacao: 'indisponivel',
      motivo:
        `Vínculo indisponível: ${faltam.join(' e ')} ausente(s) no documento de cálculo. ` +
        'É o estado esperado de um documento gravado antes da etapa 2 de A.12. ' +
        'Nenhuma comparação foi feita, e nenhuma restrição foi aplicada ao conjunto avaliado.',
      executionId,
      painel: null,
      motivoSemPainel: 'vínculo indisponível: nenhum resumo viaja',
    };
  }

  // 2. INVÁLIDO: presentes, mas inutilizáveis.
  const violacoes: string[] = [];
  const itens: ItemValido[] = [];
  if (!Array.isArray(inc)) {
    violacoes.push('includedRespondents não é array');
  } else if (inc.length === 0) {
    violacoes.push('includedRespondents está vazio: lista vazia não é vínculo');
  } else {
    const vistos = new Map<string, number>();
    inc.forEach((item: unknown, i: number) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item) || ausente((item as any).respondentId)) {
        violacoes.push(`item ${i} de includedRespondents sem respondentId`);
        return;
      }
      const rid = (item as any).respondentId;
      if (typeof rid !== 'string') {
        violacoes.push(`item ${i} de includedRespondents com respondentId que não é string`);
        return;
      }
      if (rid === '') {
        violacoes.push(`item ${i} de includedRespondents com respondentId vazio`);
        return;
      }
      vistos.set(rid, (vistos.get(rid) ?? 0) + 1);
      itens.push({ respondentId: rid, entrada: entradaDoMapa(item as Record<string, unknown>) });
    });
    for (const [rid, n] of vistos) {
      if (n > 1) violacoes.push(`respondentId repetido em includedRespondents: "${rid}" (${n} ocorrências)`);
    }
  }
  if (!stringNaoVazia(eid)) violacoes.push('executionId não é string não vazia');

  if (violacoes.length > 0) {
    const resto = violacoes.length > 1 ? ` (mais ${violacoes.length - 1} violação(ões) conservada(s))` : '';
    return {
      situacao: 'invalido',
      motivo:
        `Vínculo inválido: ${violacoes[0]}${resto}. ` +
        'Nenhuma comparação foi feita, e nenhuma restrição foi aplicada ao conjunto avaliado.',
      violacoes,
      executionId,
      painel,
      motivoSemPainel,
    };
  }

  return { situacao: 'valido', executionId: eid as string, itens, painel, motivoSemPainel };
}

// ======================================================================================
// A COMPARAÇÃO
// ======================================================================================

export interface ResultadoDaComparacao {
  sobraNoDocumento: string[];
  sobraNaAvaliacao: SobraNaAvaliacao[];
  repetidosNaAvaliacao: RepetidoNaAvaliacao[];
  /** Elementos de identidade presente e pertencente ao documento, NA ORDEM DA LISTA. */
  correspondem: ElementoAvaliado[];
}

/**
 * ⚠ **A comparação preserva MULTIPLICIDADE.** Converter as listas em conjuntos apagaria
 * duplicidade em silêncio, e duplicidade é achado, não ruído. Identificador repetido no lado
 * da avaliação conserva TODAS as ocorrências: **nenhum desempate por ordem, por posição ou
 * por recência.**
 *
 * ⚠ Identidade AUSENTE (vazia ou por posição) nunca corresponde a ninguém: entra na sobra do
 * seu lado, com motivo próprio.
 *
 * ⚠ **Esta função é chamada sobre `avaliadosAntesDaRestricao`, ANTES da restrição.** Chamá-la
 * sobre os enviados apagaria por construção a sobra do lado da avaliação, e o ensaio do
 * rejeitado por incompletude deixaria de registrar exatamente o que deve.
 */
export function compararIdentificadores(
  avaliados: ElementoAvaliado[],
  idsDoDocumento: string[]
): ResultadoDaComparacao {
  const noDocumento = new Set(idsDoDocumento);
  const presentes = new Set<string>();
  const posicoes = new Map<string, number[]>();
  const sobraNaAvaliacao: SobraNaAvaliacao[] = [];
  const correspondem: ElementoAvaliado[] = [];

  for (const e of avaliados) {
    if (e.identificador === null) {
      sobraNaAvaliacao.push({
        ...e,
        motivo: e.campo === 'posicao' ? 'identidade-ausente-por-posicao' : 'identidade-ausente-vazia',
      });
      continue;
    }
    presentes.add(e.identificador);
    posicoes.set(e.identificador, [...(posicoes.get(e.identificador) ?? []), e.posicaoNaLista]);
    if (noDocumento.has(e.identificador)) correspondem.push(e);
    else sobraNaAvaliacao.push({ ...e, motivo: 'fora-do-documento' });
  }

  const repetidosNaAvaliacao: RepetidoNaAvaliacao[] = [];
  for (const [identificador, pos] of posicoes) {
    if (pos.length > 1) {
      repetidosNaAvaliacao.push({ identificador, ocorrencias: pos.length, posicoesNaLista: pos });
    }
  }

  return {
    sobraNoDocumento: idsDoDocumento.filter((id) => !presentes.has(id)),
    sobraNaAvaliacao,
    repetidosNaAvaliacao,
    correspondem,
  };
}

// ======================================================================================
// O QUE A TELA CHAMA
// ======================================================================================

export interface PreparacaoDoVinculo {
  /** O que viaja em `vinculoDaExecucao`. */
  vinculo: VinculoDaExecucao;
  /** Substitui `activeRespondents` nas duas cadeias de estatística e no classificador. */
  respondentesEnviados: any[];
  /** Substitui `activeProjectResponses` nas duas cadeias e no classificador. */
  respostasEnviadas: any[];
  /** `true`: `enviados` difere de `avaliadosAntesDaRestricao`, e `overall` NÃO deve ir. */
  omitirOverall: boolean;
}

const unicos = (xs: string[]): string[] => [...new Set(xs)];

/**
 * ⚠ **A ORDEM DAS OPERAÇÕES, e ela é a regra:**
 *
 * 1. a origem da lista é SELECIONADA depois das exclusões que a tela já aplica
 *    (`respondentesAtivos`, `respostasAtivas`) e ANTES da restrição por incluídos;
 * 2. cada elemento registra o identificador e o CAMPO efetivamente escolhido;
 * 3. a comparação é feita sobre `avaliadosAntesDaRestricao`;
 * 4. só então a lista é restringida.
 *
 * ⚠ **Se a restrição esvaziar a lista selecionada, o fallback NÃO é acionado de novo:** a
 * lista enviada é sempre um subconjunto da selecionada. Por isso, com restrição, a lista da
 * OUTRA origem volta VAZIA, e não a original.
 *
 * ⚠ Sem restrição (`indisponivel`, `invalido`), as DUAS listas voltam como vieram, a mesma
 * referência: o comportamento atual da tela é preservado.
 */
export function prepararVinculoDaTela(entrada: {
  calculo: DocumentoDeCalculo | null | undefined;
  respondentesAtivos: any[];
  respostasAtivas: any[];
}): PreparacaoDoVinculo {
  const respondentesAtivos = Array.isArray(entrada.respondentesAtivos) ? entrada.respondentesAtivos : [];
  const respostasAtivas = Array.isArray(entrada.respostasAtivas) ? entrada.respostasAtivas : [];

  const origem: OrigemDaLista =
    respondentesAtivos.length > 0
      ? 'analiseDeQualidade'
      : respostasAtivas.length > 0
        ? 'fallbackSobreRespostas'
        : 'nenhuma';
  const selecionada: any[] =
    origem === 'analiseDeQualidade' ? respondentesAtivos : origem === 'fallbackSobreRespostas' ? respostasAtivas : [];

  const avaliados: ElementoAvaliado[] = selecionada.map((el, i) =>
    origem === 'analiseDeQualidade' ? identificarNaAnalise(el, i) : identificarNoFallback(el, i)
  );

  const doc = lerDocumento(entrada.calculo);

  // ---- Sem conjunto utilizável: NÃO há o que restringir, e a comparação NÃO foi feita.
  if (doc.situacao !== 'valido') {
    const vinculo: VinculoDaExecucao = {
      estado: doc.situacao,
      motivo: doc.motivo,
      violacoes: doc.situacao === 'invalido' ? doc.violacoes : null,
      executionId: doc.executionId,
      origemDaListaAvaliada: origem,
      avaliadosAntesDaRestricao: avaliados,
      incluidosNoDocumento: null,
      // ⚠ `null`, e NÃO `[]`: vazio afirmaria comparação sem sobra, e a comparação não foi feita.
      divergencia: { sobraNoDocumento: null, sobraNaAvaliacao: null, repetidosNaAvaliacao: null },
      enviados: avaliados.map((e) => e.identificador),
      cobertura: {
        restringiu: false,
        avaliadosAntesDaRestricao: avaliados.length,
        enviados: avaliados.length,
        incluidosNoDocumento: null,
        enviadosDiferemDosAvaliados: false,
        enviadosIguaisAoDocumento: null,
      },
      resumoDoConteudo: {
        verificado: false,
        cobre: 'incluidosNoDocumento',
        painel: doc.painel,
        motivoSemPainel: doc.motivoSemPainel,
        // ⚠ O mapa NÃO viaja, e as três listas ficam `null`: a verificação não pode parecer realizada.
        mapaPorRespondentId: null,
        enviadosSemEntradaNoMapa: null,
        enviadosComResumoIndisponivel: null,
        entradasDeNaoEnviados: null,
      },
    };
    return { vinculo, respondentesEnviados: respondentesAtivos, respostasEnviadas: respostasAtivas, omitirOverall: false };
  }

  // ---- Conjunto utilizável: compara ANTES de restringir.
  const ids = doc.itens.map((i) => i.respondentId);
  const cmp = compararIdentificadores(avaliados, ids);
  const estado: EstadoDoVinculo =
    cmp.sobraNoDocumento.length === 0 && cmp.sobraNaAvaliacao.length === 0 && cmp.repetidosNaAvaliacao.length === 0
      ? 'vinculado'
      : 'divergente';

  const mantidas = new Set(cmp.correspondem.map((e) => e.posicaoNaLista));
  const restrita = selecionada.filter((_, i) => mantidas.has(i));
  const enviadosIds = cmp.correspondem.map((e) => e.identificador as string);
  const enviadosSet = new Set(enviadosIds);
  const chavesDoMapa = new Set(ids);

  const enviadosDiferemDosAvaliados = enviadosIds.length !== avaliados.length;
  const enviadosIguaisAoDocumento =
    enviadosIds.length === ids.length && enviadosSet.size === enviadosIds.length && ids.every((id) => enviadosSet.has(id));

  const motivo =
    estado === 'vinculado'
      ? `Os ${ids.length} identificadores dos incluídos no documento de cálculo correspondem um a um aos ` +
        `${avaliados.length} respondentes avaliados. É correspondência de identificadores segundo as regras ` +
        'declaradas, e não comprova que os CRs foram calculados sobre as versões registradas.'
      : `Divergência: ${cmp.sobraNoDocumento.length} no documento e não na avaliação; ` +
        `${cmp.sobraNaAvaliacao.length} na avaliação e não no documento (contadas as de identidade ausente); ` +
        `${cmp.repetidosNaAvaliacao.length} identificador(es) repetido(s) na avaliação. ` +
        `Enviados a você: ${enviadosIds.length} de ${avaliados.length} avaliados.`;

  const vinculo: VinculoDaExecucao = {
    estado,
    motivo,
    violacoes: null,
    executionId: doc.executionId,
    origemDaListaAvaliada: origem,
    avaliadosAntesDaRestricao: avaliados,
    incluidosNoDocumento: ids,
    divergencia: {
      sobraNoDocumento: cmp.sobraNoDocumento,
      sobraNaAvaliacao: cmp.sobraNaAvaliacao,
      repetidosNaAvaliacao: cmp.repetidosNaAvaliacao,
    },
    enviados: enviadosIds,
    cobertura: {
      restringiu: true,
      avaliadosAntesDaRestricao: avaliados.length,
      enviados: enviadosIds.length,
      incluidosNoDocumento: ids.length,
      enviadosDiferemDosAvaliados,
      enviadosIguaisAoDocumento,
    },
    resumoDoConteudo: {
      verificado: false,
      cobre: 'incluidosNoDocumento',
      painel: doc.painel,
      motivoSemPainel: doc.motivoSemPainel,
      // ⚠ Chaveado por `respondentId`. `Object.fromEntries` cria propriedade própria mesmo
      //   para uma chave como `__proto__`, o que a atribuição por colchetes não faria.
      mapaPorRespondentId: Object.fromEntries(doc.itens.map((i) => [i.respondentId, i.entrada])),
      // ⚠ TRÊS listas que não se confundem. Com a restrição de P1 a primeira é vazia por
      //   construção; é CALCULADA, e não presumida, para valer também sem a restrição.
      enviadosSemEntradaNoMapa: unicos(enviadosIds.filter((id) => !chavesDoMapa.has(id))),
      enviadosComResumoIndisponivel: doc.itens
        .filter((i) => enviadosSet.has(i.respondentId) && i.entrada.judgmentsSha256 === null)
        .map((i) => ({
          respondentId: i.respondentId,
          motivo: i.entrada.judgmentsUnavailableReason ?? 'motivo não informado',
        })),
      entradasDeNaoEnviados: ids.filter((id) => !enviadosSet.has(id)),
    },
  };

  return {
    vinculo,
    respondentesEnviados: origem === 'analiseDeQualidade' ? restrita : [],
    // ⚠ A restrição NÃO reabre o fallback: com origem `analiseDeQualidade`, esta volta VAZIA.
    respostasEnviadas: origem === 'fallbackSobreRespostas' ? restrita : [],
    omitirOverall: enviadosDiferemDosAvaliados,
  };
}

// ======================================================================================
// O BLOCO QUE VAI AO MODELO
// ======================================================================================

export const MARCADOR_DO_BLOCO_DO_VINCULO =
  '## DADOS DO SISTEMA — VÍNCULO DA AVALIAÇÃO DE QUALIDADE COM A EXECUÇÃO DO CÁLCULO';

/**
 * ⚠ A frase de limite, e ela é a ÚNICA do bloco que contém palavras de verificação, sempre
 * negadas. Um teste a remove do bloco e exige que o resto não afirme conferência alguma.
 */
export const LIMITE_DO_VINCULO =
  '⚠ Limites: este bloco transporta registros, e nada nele conferiu conteúdo. Nenhum resumo foi ' +
  'recalculado nem verificado por este sistema nesta etapa. "vinculado" significa correspondência de ' +
  'identificadores segundo regras declaradas, e NÃO comprova que os CRs foram calculados sobre as ' +
  'versões registradas. O bloco não é critério de nota e não suspende a classificação.';

const ESTADOS_RECONHECIDOS: string[] = ['indisponivel', 'invalido', 'vinculado', 'divergente'];

const comoRegistro = (x: unknown): Record<string, any> | null =>
  x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, any>) : null;

/** ⚠ O identificador vem do cliente: sem quebra de linha, e com teto de tamanho. */
const seguro = (x: unknown, max = 120): string => String(x).replace(/[\r\n\t]+/g, ' ').slice(0, max);

const numero = (x: unknown): string =>
  typeof x === 'number' && Number.isFinite(x) ? String(x) : 'não informado';

/**
 * ⚠ Regra de valor: `null`/ausente = comparação NÃO realizada; `[]` = realizada, sem
 * ocorrência. As duas nunca se confundem no texto.
 */
function listar(x: unknown, formatar: (item: unknown) => string, vazio: string): string {
  if (x === null || x === undefined) return 'comparação NÃO realizada';
  if (!Array.isArray(x)) return 'formato não reconhecido';
  if (x.length === 0) return vazio;
  return x.map(formatar).join('; ');
}

const NENHUM = 'nenhum (comparação realizada)';

/**
 * O texto do bloco, ou `''` quando a requisição NÃO traz o campo.
 *
 * ⚠ **Requisição sem `vinculoDaExecucao` não ganha bloco algum**, e o contexto sai byte a
 * byte o que era: é de um chamador anterior a este estágio.
 * ⚠ **Requisição COM o campo ganha UM bloco**, mesmo quando o formato não é reconhecido.
 * ⚠ O bloco declara estado, identificador, divergência e cobertura enviada. **Não emite
 * veredito, não classifica e não suspende.**
 */
export function descreverVinculoParaContexto(raw: unknown): string {
  if (raw === undefined || raw === null) return '';

  const v = comoRegistro(raw);
  if (!v || typeof v.estado !== 'string' || !ESTADOS_RECONHECIDOS.includes(v.estado)) {
    return [
      MARCADOR_DO_BLOCO_DO_VINCULO,
      '- Vínculo recebido em formato NÃO reconhecido: nada dele foi usado.',
      LIMITE_DO_VINCULO,
    ].join('\n');
  }

  const cob = comoRegistro(v.cobertura);
  const div = comoRegistro(v.divergencia);
  const rc = comoRegistro(v.resumoDoConteudo);
  const linhas: string[] = [MARCADOR_DO_BLOCO_DO_VINCULO];

  linhas.push(`- Estado do vínculo: **${v.estado}** — ${seguro(v.motivo ?? 'sem motivo informado', 700)}`);
  linhas.push(
    `- Execução do cálculo (identificador opaco): ${
      typeof v.executionId === 'string' && v.executionId !== '' ? seguro(v.executionId) : 'não informada'
    }`
  );
  linhas.push(`- Origem da lista de respondentes avaliados: ${seguro(v.origemDaListaAvaliada ?? 'não informada')}`);
  linhas.push(
    '- Contagens: incluídos no documento de cálculo: ' +
      (cob?.incluidosNoDocumento === null || cob?.incluidosNoDocumento === undefined
        ? 'não comparado'
        : numero(cob.incluidosNoDocumento)) +
      `; avaliados antes de qualquer restrição: ${numero(cob?.avaliadosAntesDaRestricao)}` +
      `; enviados a você: ${numero(cob?.enviados)}`
  );

  // ---- a divergência ENCONTRADA
  linhas.push(
    `- No documento de cálculo e NÃO na avaliação: ${listar(div?.sobraNoDocumento, (i) => `"${seguro(i)}"`, NENHUM)}`
  );
  linhas.push(
    '- Na avaliação e NÃO no documento de cálculo: ' +
      listar(
        div?.sobraNaAvaliacao,
        (s) => {
          const o = comoRegistro(s) ?? {};
          const id =
            typeof o.identificador === 'string'
              ? `"${seguro(o.identificador)}"`
              : `(sem identidade; posição ${numero(o.posicaoNaLista)} na lista)`;
          return `${id} [${seguro(o.motivo ?? 'motivo não informado')}; campo ${seguro(o.campo ?? 'não informado')}]`;
        },
        NENHUM
      )
  );
  linhas.push(
    '- Identificadores repetidos na avaliação: ' +
      listar(
        div?.repetidosNaAvaliacao,
        (r) => {
          const o = comoRegistro(r) ?? {};
          return `"${seguro(o.identificador ?? 'não informado')}" (${numero(o.ocorrencias)} ocorrências)`;
        },
        NENHUM
      )
  );

  // ---- a cobertura ENVIADA, que é outra coisa
  linhas.push(
    cob?.restringiu === true
      ? `- Cobertura enviada: o conjunto avaliado foi RESTRINGIDO aos identificadores presentes no documento de cálculo, e a lista de respondentes que segue é a dos ${numero(cob?.enviados)} enviados.`
      : '- Cobertura enviada: nenhuma restrição foi aplicada; o conjunto enviado é o avaliado.'
  );

  // ---- os resumos, transportados
  const painel = comoRegistro(rc?.painel);
  if (!painel) {
    linhas.push(`- Resumo do painel: não informado (${seguro(rc?.motivoSemPainel ?? 'motivo não informado', 300)})`);
  } else {
    const conteudo =
      typeof painel.panel === 'string'
        ? seguro(painel.panel, 80)
        : `indisponível (${seguro(painel.unavailableReason ?? 'motivo não informado', 300)})`;
    linhas.push(
      `- Resumo do painel (algoritmo ${seguro(painel.algorithm ?? 'não informado')}, ` +
        `serialização ${seguro(painel.serialization ?? 'não informada')}): ${conteudo}`
    );
    const iguais = cob?.enviadosIguaisAoDocumento;
    linhas.push(
      '  - Cobre o conjunto do DOCUMENTO de cálculo; identifica, e não verifica.' +
        (iguais === false
          ? ' ⚠ NÃO descreve o conjunto enviado a você, que difere do conjunto do documento.'
          : iguais === true
            ? ' O conjunto enviado coincide com o do documento.'
            : ' Não se sabe se descreve o conjunto enviado (comparação NÃO realizada).')
    );
  }

  const mapa = comoRegistro(rc?.mapaPorRespondentId);
  if (!mapa) {
    linhas.push('- Resumos individuais: não viajam neste estado, e a checagem de quem tem resumo NÃO foi realizada.');
  } else {
    const entradas = Object.values(mapa);
    const comResumo = entradas.filter((e) => typeof comoRegistro(e)?.judgmentsSha256 === 'string').length;
    linhas.push(`- Resumos individuais transportados: ${comResumo} de ${entradas.length} entradas com resumo.`);
    linhas.push(
      `  - Enviados sem entrada no mapa: ${listar(rc?.enviadosSemEntradaNoMapa, (i) => `"${seguro(i)}"`, 'nenhum (checagem realizada)')}`
    );
    linhas.push(
      '  - Enviados com resumo individual indisponível: ' +
        listar(
          rc?.enviadosComResumoIndisponivel,
          (e) => {
            const o = comoRegistro(e) ?? {};
            return `"${seguro(o.respondentId ?? 'não informado')}" (${seguro(o.motivo ?? 'motivo não informado', 200)})`;
          },
          'nenhum (checagem realizada)'
        )
    );
    linhas.push(
      `  - Entradas de respondentes NÃO enviados: ${listar(rc?.entradasDeNaoEnviados, (i) => `"${seguro(i)}"`, 'nenhuma (checagem realizada)')}`
    );
  }

  linhas.push(LIMITE_DO_VINCULO);
  return linhas.join('\n');
}
