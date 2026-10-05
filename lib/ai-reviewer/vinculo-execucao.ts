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

/**
 * ⚠ O bloco da requisição SEM `vinculoDaExecucao`: campo omitido, `undefined` ou `null` (o payload recebido não distingue
 * a omissão do `undefined`). O texto é o REGISTRADO em `docs/imprecisoes-parecer-ia.md` (bloco de 04/10/2026 do commit do
 * registro da decisão e da especificação), SEM mudança de palavra: 571 bytes, sem quebra de linha final, `sha256`
 * `267226e55d0e4d031b324c9a8e2961df9be74b50fa6e217cb70e15f39d99872f`. A primeira linha é o marcador do bloco do vínculo, e
 * ele ocorre UMA vez no contexto. ⚠ A linha de limites é PRÓPRIA: não reutiliza `LIMITE_DO_VINCULO`, que fala de "vinculado"
 * e de resumos que este bloco não traz.
 */
export const BLOCO_DE_AUSENCIA_DO_VINCULO = [
  MARCADOR_DO_BLOCO_DO_VINCULO,
  '- Situação do vínculo: AUSENTE nesta requisição. O campo não chegou, ou chegou nulo.',
  '- A relação entre o conjunto de respondentes ENVIADO a você e o conjunto INCLUÍDO no cálculo NÃO foi comparada nesta requisição.',
  '- Nada se afirma aqui sobre quantos respondentes entraram no cálculo.',
  '⚠ Limites: a ausência deste vínculo NÃO é critério de nota e NÃO suspende a classificação. Ela não autoriza inferir divergência nem coincidência entre os dois conjuntos.',
].join('\n');

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
 * ⚠ **A RETIRADA, lida SÓ dos campos declarados de `cobertura`, em quatro estados.** `restringiu` diz que o FILTRO
 * pelos identificadores do documento foi aplicado, e é `true` em todo vínculo comparado, mesmo quando o filtro não
 * retirou ninguém. Quem diz se a lista MUDOU são `enviadosDiferemDosAvaliados` e as duas contagens.
 *
 * ⚠ É conclusão DELIMITADA aos campos declarados: NÃO substitui a comparação das identidades (R4) e não se deduz do
 * estado do vínculo, porque `vinculado` e `divergente` podem ter retirada, ou não.
 * ⚠ No produtor real o booleano e as contagens saem dos MESMOS dois números (`prepararVinculoDaTela`), então a
 * conferência cruzada só pode discordar em objeto RECEBIDO. O quarto estado não acrescenta causa de suspensão, não
 * classifica e não emite veredito: declara que a retirada não se determina, com o motivo.
 */
type RetiradaDaCobertura =
  | { estado: 'nao-aplicado' }
  | { estado: 'sem-retirada' }
  | { estado: 'com-retirada' }
  | { estado: 'nao-determinada'; condicao: string };

/** Uma contagem é VÁLIDA quando é número inteiro finito e não negativo. */
const contagemValida = (x: unknown): boolean => typeof x === 'number' && Number.isInteger(x) && x >= 0;

function lerRetiradaDaCobertura(cob: Record<string, any> | null): RetiradaDaCobertura {
  if (cob?.restringiu !== true) return { estado: 'nao-aplicado' };
  const diferem = cob.enviadosDiferemDosAvaliados;
  const avaliados = cob.avaliadosAntesDaRestricao;
  const enviados = cob.enviados;
  const contagensValidas = contagemValida(avaliados) && contagemValida(enviados);
  if (typeof diferem === 'boolean' && contagensValidas) {
    if (diferem === false && enviados === avaliados) return { estado: 'sem-retirada' };
    if (diferem === true && enviados < avaliados) return { estado: 'com-retirada' };
  }
  // ⚠ A PRIMEIRA condição que se aplica, nesta ordem. A ordem é escolha declarada, e NÃO propriedade do dado: quando
  //   duas valem ao mesmo tempo só a primeira é nomeada, e isso não afirma que as demais continuem legíveis nos três
  //   campos exibidos (com valor não representável elas podem não ser recuperáveis).
  const condicao =
    contagensValidas && enviados > avaliados
      ? 'o vínculo declara mais enviados do que avaliados antes de qualquer restrição'
      : typeof diferem !== 'boolean'
        ? 'o vínculo não declara se a lista mudou'
        : !contagensValidas
          ? 'as contagens declaradas não permitem decidir'
          : 'o booleano e as contagens declarados discordam';
  return { estado: 'nao-determinada', condicao };
}

/**
 * ⚠ A linha "Cobertura enviada". Só as aberturas de `sem-retirada` e de `nao-determinada` são novas: a de
 * `nao-aplicado` e a de `com-retirada` são as de antes, palavra por palavra.
 */
function linhaDaCobertura(cob: Record<string, any> | null, leitura: LeituraDoVinculo): string {
  const retirada = lerRetiradaDaCobertura(cob);
  if (retirada.estado === 'nao-aplicado') {
    return '- Cobertura enviada: nenhuma restrição foi aplicada; o conjunto enviado é o avaliado.';
  }
  // ⚠ R4: se a lista APRESENTADA não corresponde aos enviados declarados, o bloco não afirma que corresponde. A
  //   cláusula é INDEPENDENTE da retirada: vale nas três aberturas que a usam.
  const clausula =
    leitura.conferencia !== null && !leitura.conferencia.correspondeAosEnviados
      ? `o vínculo declara que a lista de respondentes que segue é a dos ${numero(cob?.enviados)} enviados (a linha da lista APRESENTADA, abaixo, compara essa declaração com a lista).`
      : `a lista de respondentes que segue é a dos ${numero(cob?.enviados)} enviados.`;
  if (retirada.estado === 'com-retirada') {
    return `- Cobertura enviada: o conjunto avaliado foi RESTRINGIDO aos identificadores presentes no documento de cálculo, e ${clausula}`;
  }
  if (retirada.estado === 'sem-retirada') {
    return `- Cobertura enviada: o filtro pelos identificadores do documento foi aplicado; nenhum elemento da lista avaliada foi retirado, e ${clausula}`;
  }
  // ⚠ O motivo EXIBE os três campos segundo a representação definida (`não informado` para o que não é representável),
  //   e NÃO os preserva: `numero("4")`, `numero(null)` e `numero(NaN)` dão a mesma saída.
  const b = cob?.enviadosDiferemDosAvaliados;
  const lido =
    `enviadosDiferemDosAvaliados = ${b === true ? 'true' : b === false ? 'false' : 'não informado'}, ` +
    `avaliadosAntesDaRestricao = ${numero(cob?.avaliadosAntesDaRestricao)}, enviados = ${numero(cob?.enviados)}`;
  return `- Cobertura enviada: o filtro pelos identificadores do documento foi aplicado; NÃO se pode determinar se algum elemento da lista avaliada foi retirado (${retirada.condicao}; lido: ${lido}), e ${clausula}`;
}

/**
 * O texto do bloco do vínculo, que a rota insere UMA vez no contexto. Com o campo ausente
 * (omitido, `undefined` ou `null`) é `BLOCO_DE_AUSENCIA_DO_VINCULO`, e a função nunca devolve `''`.
 *
 * ⚠ **Requisição sem `vinculoDaExecucao` ganha o bloco de AUSÊNCIA.** Até a rodada 1
 * (05/10/2026) a função devolvia `''` para ela, e nenhum bloco entrava no contexto.
 * ⚠ **Requisição COM o campo ganha UM bloco**, mesmo quando o formato não é reconhecido.
 * ⚠ O bloco declara estado, identificador, divergência e cobertura enviada. **Não emite
 * veredito, não classifica e não suspende.**
 */
export function descreverVinculoParaContexto(raw: unknown, apresentada?: IdentidadeApresentada[]): string {
  if (raw === undefined || raw === null) return BLOCO_DE_AUSENCIA_DO_VINCULO;

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
  // ⚠ A relação entre enviados e incluídos vem da COMPARAÇÃO DAS DUAS LISTAS, com multiplicidade,
  //   e nunca do estado nem do booleano transportado.
  const leitura = lerVinculoParaTexto(raw, apresentada);

  linhas.push(`- Estado do vínculo: **${v.estado}** — ${seguro(v.motivo ?? 'sem motivo informado', 700)}`);
  linhas.push(
    `- Execução do cálculo (identificador opaco): ${
      typeof v.executionId === 'string' && v.executionId !== '' ? seguro(v.executionId) : 'não informada'
    }`
  );
  linhas.push(`- Origem da lista de respondentes avaliados: ${seguro(v.origemDaListaAvaliada ?? 'não informada')}`);
  linhas.push(...CHAVE_DE_LEITURA_DAS_CONTAGENS(leitura));
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
  // ⚠ `restringiu` diz que o filtro foi aplicado, e NÃO que algum elemento saiu: ver `lerRetiradaDaCobertura`.
  linhas.push(linhaDaCobertura(cob, leitura));
  linhas.push(LINHA_DA_RELACAO(leitura));
  if (leitura.conferencia !== null) linhas.push(LINHA_DA_LISTA_APRESENTADA(leitura));

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
    // ⚠ Da COMPARAÇÃO DAS LISTAS (`null` quando ela não se realizou), e não do booleano transportado.
    //   R4: com a lista APRESENTADA, "coincide" só sai quando os TRÊS conjuntos correspondem um a um.
    const c = leitura.conferencia;
    const cobertura: 'coincide' | 'difere' | 'nao-confirma' | 'nao-comparado' =
      c !== null
        ? c.todosCorrespondem
          ? 'coincide'
          : c.correspondeAosIncluidos
            ? 'nao-confirma'
            : 'difere'
        : leitura.relacao
          ? leitura.relacao.iguais
            ? 'coincide'
            : 'difere'
          : 'nao-comparado';
    linhas.push(
      '  - Cobre o conjunto do DOCUMENTO de cálculo; identifica, e não verifica.' +
        (cobertura === 'difere'
          ? ' ⚠ NÃO descreve o conjunto enviado a você, que difere do conjunto do documento.'
          : cobertura === 'coincide'
            ? ' O conjunto enviado coincide com o do documento.'
            : cobertura === 'nao-confirma'
              ? ' Não se pode afirmar que descreve o conjunto enviado a você: a lista apresentada tem os identificadores dos incluídos, mas difere dos enviados declarados (ver a linha da lista APRESENTADA, acima).'
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

  if (leitura.modo === 'comparado') linhas.push(LINHA_DO_PORTAO_DE_COMPLETUDE);
  linhas.push(LIMITE_DO_VINCULO);
  return linhas.join('\n');
}

// ======================================================================================
// A.12 etapa 3, estágio 1, correções antes do aceite: AS FRASES AO REDOR DO BLOCO
// ======================================================================================

/**
 * ⚠ **O que estas funções corrigem.** O contexto entregue ao modelo afirmava, em frases ao
 * redor do bloco, uma população que o próprio vínculo contradiz: a lista ENVIADA como
 * "COMPLETA — não existem outros", como a participação plena de todos, e como o N de TODAS as
 * matrizes agregadas; a contagem de restantes da exclusão do gestor como a dos "dados de
 * qualidade abaixo"; e a regra de menção proibindo citar quem o bloco nomeia.
 *
 * ⚠ **Escopo, declarado:** a redação nova vale em TODA requisição, também na SEM o campo (modo
 * `ausente`): não há redação anterior a conservar. Até a rodada 1 (05/10/2026) ela valia só
 * para a requisição que TRAZ o campo (modo `comparado` ou `sem-comparacao`).
 *
 * ⚠ **A relação entre enviados e incluídos é a COMPARAÇÃO DAS DUAS LISTAS**, com
 * multiplicidade, e nunca o estado: com o MESMO estado `divergente`, os enviados podem
 * coincidir com os incluídos (a sobra estava na avaliação, e a restrição a retirou) ou diferir
 * deles (a sobra estava no documento).
 */

export type ModoDoTexto = 'ausente' | 'sem-comparacao' | 'comparado';

export interface RelacaoEnviadosIncluidos {
  /** Multiplicidade preservada: os mesmos identificadores, o mesmo número de vezes cada um. */
  iguais: boolean;
  enviados: number;
  incluidos: number;
  /** Incluídos no documento e ausentes dos enviados (uma entrada por unidade de falta). */
  incluidosForaDosEnviados: string[];
  /** Enviados ausentes do documento (uma entrada por unidade de excesso). */
  enviadosForaDoDocumento: string[];
  /** Identificadores que se repetem nos enviados. */
  repetidosNosEnviados: { identificador: string; ocorrencias: number }[];
}

export interface LeituraDoVinculo {
  /**
   * `ausente`: o campo não veio. `sem-comparacao`: veio, mas não há conjunto de incluídos
   * utilizável (`indisponivel`, `invalido`, formato não reconhecido ou listas malformadas).
   * `comparado`: `vinculado` ou `divergente` com as duas listas bem formadas.
   */
  modo: ModoDoTexto;
  /** `null`: o campo não veio, ou o formato não é reconhecido. */
  estado: EstadoDoVinculo | null;
  reconhecido: boolean;
  /** Só em `comparado`; copiados como vieram, porque são a FONTE da comparação. */
  incluidos: string[] | null;
  enviados: string[] | null;
  relacao: RelacaoEnviadosIncluidos | null;
  /**
   * `cobertura.incluidosNoDocumento` e `cobertura.enviados` COMO O BLOCO OS IMPRIME: número
   * finito, ou `null`. ⚠ São contagens DECLARADAS, transportadas; a fonte da comparação são as
   * listas. Quando diferem da lista, o contexto conserva os dois valores.
   */
  incluidosDeclarados: number | null;
  enviadosDeclarados: number | null;
  /**
   * A conferência da lista APRESENTADA (a de `qualityAnalysis.respondents`, como a rota a exibe) contra os
   * enviados declarados e contra os incluídos. `null` quando o chamador não entregou a lista, ou fora do
   * modo `comparado`.
   */
  conferencia: ConferenciaDaListaApresentada | null;
}

const listaDeTexto = (x: unknown): string[] | null =>
  Array.isArray(x) && x.every((i) => typeof i === 'string' && i !== '') ? (x as string[]) : null;

/**
 * A comparação das duas listas, com multiplicidade. ⚠ Converter em conjuntos apagaria
 * duplicidade em silêncio: `[a, a, b]` contra `[a, b]` NÃO é coincidência.
 */
export function compararEnviadosComIncluidos(enviados: string[], incluidos: string[]): RelacaoEnviadosIncluidos {
  const contar = (xs: string[]) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const noEnviado = contar(enviados);
  const noDocumento = contar(incluidos);
  const incluidosForaDosEnviados: string[] = [];
  const enviadosForaDoDocumento: string[] = [];
  for (const [id, n] of noDocumento) {
    for (let k = noEnviado.get(id) ?? 0; k < n; k++) incluidosForaDosEnviados.push(id);
  }
  for (const [id, n] of noEnviado) {
    for (let k = noDocumento.get(id) ?? 0; k < n; k++) enviadosForaDoDocumento.push(id);
  }
  return {
    iguais: incluidosForaDosEnviados.length === 0 && enviadosForaDoDocumento.length === 0,
    enviados: enviados.length,
    incluidos: incluidos.length,
    incluidosForaDosEnviados,
    enviadosForaDoDocumento,
    repetidosNosEnviados: [...noEnviado]
      .filter(([, n]) => n > 1)
      .map(([identificador, ocorrencias]) => ({ identificador, ocorrencias })),
  };
}

// ======================================================================================
// A.12 etapa 3, estágio 1, R4: A COMPARAÇÃO USA A LISTA APRESENTADA
// ======================================================================================

/**
 * ⚠ **O defeito.** A comparação do texto usava as duas listas DECLARADAS dentro do vínculo
 * (`enviados` e `incluidosNoDocumento`), e a rota entregava às frases só o TAMANHO da lista que de
 * fato apresenta ao modelo: três respondentes podiam ser afirmados "um a um" com quatro.
 *
 * ⚠ **A correção compara os identificadores da lista APRESENTADA**, com multiplicidade, contra os
 * enviados declarados e contra os incluídos. Havendo discrepância, ela se conserva e a
 * coincidência não se afirma.
 *
 * ⚠ **A identidade que o modelo LÊ é o `displayId`**, e não o `respondentId` cru. Ela nasce numa
 * função pura escrita UMA vez, e a rota a chama onde construía o `displayId`. **A origem é
 * registrada na construção, e nunca inferida pela grafia**: um `hash_000` recebido em
 * `respondentId` ou `id` tem origem `respondentId` ou `id` e corresponde normalmente; um `hash_000`
 * GERADO pelo fallback posicional tem origem `posicional` e não corresponde a ninguém.
 */
export type OrigemDaIdentidade = 'respondentId' | 'id' | 'posicional';

export interface IdentidadeApresentada {
  /** O valor bruto de `displayId`, como a rota o interpola no contexto (pode não ser texto). */
  bruto: any;
  /** O que o modelo LÊ: `String(bruto)`. */
  valor: string;
  /** DE ONDE veio, decidido na CONSTRUÇÃO. */
  origem: OrigemDaIdentidade;
  /** Posição do elemento na lista apresentada, a partir de 0. */
  posicao: number;
}

/**
 * ⚠ **A mesma expressão que estava em `route.ts`** (`r.respondentId || r.id`, e `hash_NNN` pelo
 * índice quando o valor falta ou é a string "undefined" ou "null"), agora com a ORIGEM registrada
 * ao lado do valor. A rota chama esta função e não repete a expressão.
 */
export function identificarParaApresentacao(elemento: any, indice: number): IdentidadeApresentada {
  let bruto = elemento.respondentId || elemento.id;
  let origem: OrigemDaIdentidade = elemento.respondentId ? 'respondentId' : 'id';
  if (!bruto || bruto === 'undefined' || bruto === 'null') {
    bruto = `hash_${indice.toString().padStart(3, '0')}`;
    origem = 'posicional';
  }
  return { bruto, valor: String(bruto), origem, posicao: indice };
}

export interface DiferencaDeListas {
  /** Multiplicidade preservada: os mesmos identificadores, o mesmo número de vezes cada um. */
  iguais: boolean;
  /** Ocorrências a mais na lista apresentada (uma entrada por unidade de excesso). */
  soNaApresentada: string[];
  /** Ocorrências a mais no conjunto declarado (uma entrada por unidade de falta na apresentada). */
  soNoDeclarado: string[];
  /** Identificadores que se repetem na lista apresentada. */
  repetidosNaApresentada: { identificador: string; ocorrencias: number }[];
}

/** A mesma comparação com multiplicidade de `compararEnviadosComIncluidos`, com os nomes dos dois lados. */
export function compararListas(apresentados: string[], declarados: string[]): DiferencaDeListas {
  const r = compararEnviadosComIncluidos(apresentados, declarados);
  return {
    iguais: r.iguais,
    soNaApresentada: r.enviadosForaDoDocumento,
    soNoDeclarado: r.incluidosForaDosEnviados,
    repetidosNaApresentada: r.repetidosNosEnviados,
  };
}

export interface ConferenciaDaListaApresentada {
  /** A lista como o modelo a lê, na ordem, com a origem de cada identidade. */
  identidades: IdentidadeApresentada[];
  totalApresentado: number;
  /** As identidades GERADAS pelo fallback posicional: nunca correspondem a ninguém. */
  posicionais: IdentidadeApresentada[];
  contraEnviados: DiferencaDeListas;
  contraIncluidos: DiferencaDeListas;
  correspondeAosEnviados: boolean;
  correspondeAosIncluidos: boolean;
  /** Os três conjuntos correspondem um a um, com multiplicidade e sem identidade posicional. */
  todosCorrespondem: boolean;
  /** Identificadores da lista apresentada que não estão em NENHUM dos dois conjuntos declarados. */
  ausentesDeAmbos: string[];
}

/**
 * Confere a lista APRESENTADA contra os enviados declarados e contra os incluídos. ⚠ A identidade
 * de origem `posicional` sai da comparação: não corresponde a ninguém, mesmo que o mesmo texto
 * conste dos conjuntos declarados, e fica registrada à parte com o seu motivo.
 */
export function conferirListaApresentada(
  apresentada: IdentidadeApresentada[],
  enviados: string[],
  incluidos: string[]
): ConferenciaDaListaApresentada {
  const posicionais = apresentada.filter((i) => i.origem === 'posicional');
  const comparaveis = apresentada.filter((i) => i.origem !== 'posicional').map((i) => i.valor);
  const contraEnviados = compararListas(comparaveis, enviados);
  const contraIncluidos = compararListas(comparaveis, incluidos);
  const correspondeAosEnviados = posicionais.length === 0 && contraEnviados.iguais;
  const correspondeAosIncluidos = posicionais.length === 0 && contraIncluidos.iguais;
  const nosEnviados = new Set(enviados);
  const nosIncluidos = new Set(incluidos);
  return {
    identidades: apresentada,
    totalApresentado: apresentada.length,
    posicionais,
    contraEnviados,
    contraIncluidos,
    correspondeAosEnviados,
    correspondeAosIncluidos,
    todosCorrespondem: correspondeAosEnviados && correspondeAosIncluidos,
    ausentesDeAmbos: [...new Set(comparaveis.filter((v) => !nosEnviados.has(v) && !nosIncluidos.has(v)))],
  };
}

/**
 * Lê o que veio em `vinculoDaExecucao` para o TEXTO ao redor do bloco. Nunca lança, e nunca
 * afirma o que as listas não sustentam: sem as duas listas bem formadas não há comparação.
 * ⚠ Com `apresentada`, confere também a lista que a rota realmente apresenta (R4).
 */
export function lerVinculoParaTexto(raw: unknown, apresentada?: IdentidadeApresentada[]): LeituraDoVinculo {
  const vazio = {
    incluidos: null,
    enviados: null,
    relacao: null,
    incluidosDeclarados: null,
    enviadosDeclarados: null,
    conferencia: null,
  };
  if (raw === undefined || raw === null) {
    return { modo: 'ausente', estado: null, reconhecido: false, ...vazio };
  }
  const v = comoRegistro(raw);
  if (!v || typeof v.estado !== 'string' || !ESTADOS_RECONHECIDOS.includes(v.estado)) {
    return { modo: 'sem-comparacao', estado: null, reconhecido: false, ...vazio };
  }
  const estado = v.estado as EstadoDoVinculo;
  // ⚠ Os mesmos critérios com que o bloco imprime `Contagens`: número finito, ou nada.
  const cob = comoRegistro(v.cobertura);
  const declarado = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  const declarados = {
    incluidosDeclarados: declarado(cob?.incluidosNoDocumento),
    enviadosDeclarados: declarado(cob?.enviados),
  };
  if (estado === 'vinculado' || estado === 'divergente') {
    const incluidos = listaDeTexto(v.incluidosNoDocumento);
    const enviados = listaDeTexto(v.enviados);
    if (incluidos !== null && incluidos.length > 0 && enviados !== null) {
      return {
        modo: 'comparado',
        estado,
        reconhecido: true,
        incluidos,
        enviados,
        relacao: compararEnviadosComIncluidos(enviados, incluidos),
        conferencia: apresentada === undefined ? null : conferirListaApresentada(apresentada, enviados, incluidos),
        ...declarados,
      };
    }
  }
  return {
    modo: 'sem-comparacao',
    estado,
    reconhecido: true,
    incluidos: null,
    enviados: null,
    relacao: null,
    conferencia: null,
    ...declarados,
  };
}

// ---- as linhas novas DO BLOCO

/** ⚠ Define as populações e as etapas, e diz a que população se referem as distribuições. */
export const CHAVE_DE_LEITURA_DAS_CONTAGENS = (l: LeituraDoVinculo): string[] => [
  '- Chave de leitura das contagens deste contexto (cálculo, avaliação e envio NÃO são sinônimos):',
  '  - amostra coletada: as respostas carregadas pela tela (etapa: coleta);',
  '  - restantes após a exclusão do gestor (etapa: exclusão do gestor, anterior a qualquer restrição do vínculo);',
  l.modo === 'comparado'
    ? '  - incluídos no documento de cálculo (etapa: cálculo): a contagem registrada no documento;'
    : l.incluidosDeclarados !== null
      ? '  - incluídos no documento de cálculo (etapa: cálculo): contagem declarada no vínculo, SEM lista de incluídos utilizável para compará-la;'
      : '  - incluídos no documento de cálculo (etapa: cálculo): contagem NÃO disponível nesta requisição;',
  '  - avaliados antes de qualquer restrição (etapa: avaliação de qualidade);',
  '  - enviados a você (etapa: envio): a lista de respondentes, as contagens por status e as distribuições e taxas de qualidade deste contexto referem-se a eles;',
  '  - "Estatísticas por Dimensão" BOCR: nenhuma contagem por dimensão é apresentada neste contexto, e nenhuma deve ser derivada dos totais agregados, ' +
    'que NÃO são contagem por dimensão nem participação por dimensão nas matrizes.',
];

const PREFIXO_DA_RELACAO =
  '- Relação entre os ENVIADOS e os INCLUÍDOS no documento de cálculo (comparação dos dois conjuntos, com multiplicidade; não deduzida do estado): ';

export const LINHA_DA_RELACAO = (l: LeituraDoVinculo): string => {
  const r = l.relacao;
  if (l.modo !== 'comparado' || r === null) {
    return (
      `${PREFIXO_DA_RELACAO}comparação NÃO realizada (` +
      (l.incluidosDeclarados !== null
        ? 'não há lista de incluídos utilizável nesta requisição'
        : 'a contagem de incluídos no documento de cálculo não está disponível nesta requisição') +
      ').'
    );
  }
  // ⚠ O acréscimo sobre a divergência anterior à restrição depende de o vínculo tê-la REGISTRADO
  //   (estado `divergente`); a coincidência em si vem só da comparação das listas.
  const lembrete = l.estado === 'divergente' ? ' A divergência anterior à restrição, acima, permanece registrada.' : '';
  // ⚠ R4: quando a lista APRESENTADA não corresponde aos três conjuntos, o radical "coincid" não sai
  //   daqui: os dois conjuntos DECLARADOS podem ter os mesmos identificadores sem que a lista apresentada
  //   os tenha, e a correspondência dela está na linha seguinte.
  const soDeclarados = l.conferencia !== null && !l.conferencia.todosCorrespondem;
  if (r.iguais && soDeclarados) {
    return (
      `${PREFIXO_DA_RELACAO}os dois conjuntos DECLARADOS têm os mesmos identificadores, um a um (${r.enviados} enviados declarados, ${r.incluidos} incluídos); ` +
      'a correspondência da lista APRESENTADA a você está na linha seguinte.' +
      lembrete
    );
  }
  return r.iguais
    ? `${PREFIXO_DA_RELACAO}COINCIDEM, um a um (${r.enviados} enviados, ${r.incluidos} incluídos).` + lembrete
    : `${PREFIXO_DA_RELACAO}DIFEREM (${r.enviados} enviados, ${r.incluidos} incluídos): ${r.incluidosForaDosEnviados.length} incluído(s) no documento e ausente(s) dos enviados; ${r.enviadosForaDoDocumento.length} enviado(s) ausente(s) do documento; ${r.repetidosNosEnviados.length} identificador(es) repetido(s) nos enviados.` +
        // ⚠ R4: quando a lista APRESENTADA não corresponde aos enviados declarados, "enviados" aqui são os DECLARADOS.
        (l.conferencia !== null && !l.conferencia.correspondeAosEnviados
          ? ' Este é o confronto dos dois conjuntos DECLARADOS; a lista APRESENTADA a você está na linha seguinte.'
          : '');
};

const citar = (xs: string[], vazio: string): string =>
  xs.length === 0 ? vazio : `[${xs.map((x) => `"${seguro(x)}"`).join(', ')}]`;

const DESCRICAO_DA_LISTA_APRESENTADA = (n: number): string =>
  `- Lista de respondentes APRESENTADA a você (${n} identificador(es) lidos de respondentId ou id de cada elemento de qualityAnalysis.respondents, ` +
  'na forma em que a lista deste contexto os exibe; etapa: envio; comparados um a um, com multiplicidade, contra os enviados declarados e contra os incluídos): ';

/**
 * ⚠ A linha da lista APRESENTADA (R4). Só existe quando a rota entregou a lista. O radical "coincid"
 * só sai quando os TRÊS conjuntos correspondem um a um; na discrepância os três se conservam, cada um
 * com a sua origem, e a identidade GERADA por posição tem motivo próprio.
 */
export const LINHA_DA_LISTA_APRESENTADA = (l: LeituraDoVinculo): string => {
  const c = l.conferencia;
  if (c === null || l.enviados === null || l.incluidos === null) return '';
  const descricao = DESCRICAO_DA_LISTA_APRESENTADA(c.totalApresentado);
  if (c.todosCorrespondem) {
    return (
      `${descricao}COINCIDE, um a um, com os ${l.enviados.length} enviados declarados (etapa: envio) ` +
      `e com os ${l.incluidos.length} incluídos no documento de cálculo (etapa: cálculo).`
    );
  }
  const apresentados = c.identidades.map((i) =>
    i.origem === 'posicional' ? `"${seguro(i.valor)}" (gerado por posição)` : `"${seguro(i.valor)}"`
  );
  const repetidos = c.contraEnviados.repetidosNaApresentada;
  return (
    `${descricao}DIFERE do que o vínculo declara. Os três conjuntos se conservam, cada um com a sua origem: ` +
    `apresentada [${apresentados.join(', ')}] (${c.totalApresentado}; lida de respondentId ou id de cada elemento de qualityAnalysis.respondents; etapa: envio); ` +
    `enviados declarados ${citar(l.enviados, '[]')} (${l.enviados.length}; vinculoDaExecucao.enviados; etapa: envio); ` +
    `incluídos ${citar(l.incluidos, '[]')} (${l.incluidos.length}; vinculoDaExecucao.incluidosNoDocumento, de metadata.includedRespondents; etapa: cálculo). ` +
    `Contra os incluídos: ${c.contraIncluidos.soNoDeclarado.length} ocorrência(s) só nos incluídos ${citar(c.contraIncluidos.soNoDeclarado, '(nenhuma)')}; ` +
    `${c.contraIncluidos.soNaApresentada.length} ocorrência(s) só na lista apresentada ${citar(c.contraIncluidos.soNaApresentada, '(nenhuma)')}. ` +
    `Contra os enviados declarados: ${c.contraEnviados.soNoDeclarado.length} ocorrência(s) só nos enviados declarados ${citar(c.contraEnviados.soNoDeclarado, '(nenhuma)')}; ` +
    `${c.contraEnviados.soNaApresentada.length} ocorrência(s) só na lista apresentada ${citar(c.contraEnviados.soNaApresentada, '(nenhuma)')}. ` +
    `Repetidos na lista apresentada: ${
      repetidos.length === 0
        ? 'nenhum'
        : repetidos.map((r) => `"${seguro(r.identificador)}" (${r.ocorrencias} ocorrências)`).join('; ')
    }. ` +
    `Identidade por posição na lista apresentada: ${
      c.posicionais.length === 0
        ? 'nenhuma'
        : c.posicionais
            .map(
              (i) =>
                `"${seguro(i.valor)}" (posição ${i.posicao} da lista, contada a partir de 0), GERADA pelo fallback posicional: ` +
                'não corresponde a ninguém, mesmo que o mesmo texto conste dos conjuntos declarados'
            )
            .join('; ')
    }. ` +
    `Presentes na lista apresentada e ausentes de AMBOS os conjuntos declarados: ${citar(c.ausentesDeAmbos, 'nenhum')}.`
  );
};

/**
 * ⚠ O portão é PROPRIEDADE DO PERCURSO DE CÁLCULO EXAMINADO, e não conferência desta
 * execução: o vínculo de identificadores não verificou os julgamentos.
 */
export const LINHA_DO_PORTAO_DE_COMPLETUDE =
  '- Portão de completude de A.21, propriedade do PERCURSO DE CÁLCULO EXAMINADO (o código da rota de cálculo), e não conferência desta execução: ' +
  'esse código rejeita a resposta que tem algum par de alguma matriz sem julgamento válido, e agrega cada célula só com julgamento existente, não pulado e com valor. ' +
  'Este vínculo de identificadores NÃO verificou os julgamentos daquela execução.';

// ---- as frases DE FORA DO BLOCO, que a rota troca quando o campo veio

export interface LinhasDeExclusao {
  amostra: string;
  restantes: string;
  excluidos: string;
  qualidade: string;
}

/**
 * ⚠ As quatro linhas do bloco de exclusão que mudam. Cada contagem nomeia a população e a
 * etapa, e a última usa a população ENVIADA: a lista de respondentes, e não `activeCount`.
 */
export function linhasDeExclusaoComVinculo(
  info: { totalCollected: number; activeCount: number; excludedCount: number },
  taxaDeExclusao: string,
  nEnviados: number
): LinhasDeExclusao {
  return {
    amostra:
      `- Amostra original coletada (população: respostas carregadas pela tela, finalizadas, de respondentes cadastrados e uma por respondente; etapa: coleta): ` +
      `${info.totalCollected} especialistas`,
    restantes:
      `- Restantes após a exclusão do gestor (população: respondentes não excluídos; etapa: exclusão do gestor, anterior a qualquer restrição do vínculo): ` +
      `${info.activeCount} especialistas`,
    excluidos:
      `- Respondentes excluídos pelo gestor (população: excluídos; etapa: exclusão do gestor): ` +
      `${info.excludedCount} (${taxaDeExclusao}% da amostra original)`,
    // ⚠ Lista enviada VAZIA (a restrição a esvaziou): não há "lista abaixo" a que a contagem se refira.
    qualidade:
      nEnviados > 0
        ? `- Os dados de qualidade abaixo referem-se APENAS aos ${nEnviados} respondentes ENVIADOS a você ` +
          `(população: enviados; etapa: envio; contagem da lista de respondentes abaixo).`
        : '- Nenhum respondente foi ENVIADO a você (população: enviados; etapa: envio; contagem: 0): a lista de respondentes abaixo não existe.',
  };
}

export interface FrasesDaLista {
  cabecalho: string;
  total: string;
  /** Duas linhas, unidas por quebra de linha, como a redação anterior. */
  agregacao: string;
  /** Termina em quebra de linha, para preceder a primeira contagem por status. */
  cabecalhoDasContagens: string;
  regraDeMencao: string;
}

/**
 * ⚠ A exaustividade só é afirmada DA LISTA ENVIADA. A relação com o conjunto do cálculo vem da
 * comparação das listas (`l.relacao`), e sem ela nada se afirma sobre o cálculo.
 */
export function frasesDaListaComVinculo(l: LeituraDoVinculo, n: number): FrasesDaLista {
  const r = l.relacao;
  const abertura = `**TOTAL ENVIADO A VOCÊ: ${n} respondentes (etapa: envio; contagem desta lista). A lista é COMPLETA para o conjunto enviado`;
  const naoComparada = `${abertura}; a relação entre ele e o conjunto incluído no cálculo NÃO foi comparada.**`;

  let total: string;
  let agregacao: string;
  if (l.modo === 'comparado' && r !== null) {
    const c = l.conferencia;
    if (c === null) {
      // Sem a lista APRESENTADA (chamada direta): a comparação é a das duas listas declaradas.
      total = r.iguais
        ? `${abertura} e COINCIDE, um a um, com os ${r.incluidos} incluídos no documento de cálculo.**`
        : `${abertura}, mas DIFERE dos ${r.incluidos} incluídos no documento de cálculo: ${r.incluidosForaDosEnviados.length} incluído(s) no documento e ausente(s) desta lista, ${r.enviadosForaDoDocumento.length} enviado(s) ausente(s) do documento (identificadores no bloco do vínculo, acima).**`;
    } else if (c.todosCorrespondem) {
      total = `${abertura} e COINCIDE, um a um, com os ${r.incluidos} incluídos no documento de cálculo.**`;
    } else if (!c.correspondeAosIncluidos) {
      // ⚠ R4: a lista APRESENTADA difere dos incluídos. As identidades geradas por posição não correspondem a ninguém.
      total = `${abertura}, mas DIFERE dos ${r.incluidos} incluídos no documento de cálculo: ${c.contraIncluidos.soNoDeclarado.length} incluído(s) no documento e ausente(s) desta lista, ${c.contraIncluidos.soNaApresentada.length + c.posicionais.length} enviado(s) ausente(s) do documento (identificadores no bloco do vínculo, acima).**`;
      if (!c.correspondeAosEnviados) {
        total += `\n⚠ A lista também DIFERE dos ${r.enviados} enviados declarados no vínculo: ${c.contraEnviados.soNoDeclarado.length} enviado(s) declarado(s) ausente(s) desta lista, ${c.contraEnviados.soNaApresentada.length + c.posicionais.length} apresentado(s) ausente(s) dos enviados declarados (identificadores no bloco do vínculo, acima).`;
      }
    } else {
      // A lista APRESENTADA tem os identificadores dos incluídos, mas difere dos enviados declarados.
      total = `${abertura}; ela tem os mesmos identificadores dos ${r.incluidos} incluídos no documento de cálculo, mas DIFERE dos ${r.enviados} enviados declarados no vínculo: ${c.contraEnviados.soNoDeclarado.length} enviado(s) declarado(s) ausente(s) desta lista, ${c.contraEnviados.soNaApresentada.length} apresentado(s) ausente(s) dos enviados declarados (identificadores no bloco do vínculo, acima).**`;
    }
    agregacao =
      `**CÁLCULO — contagem registrada no documento de cálculo: ${r.incluidos} respondentes INCLUÍDOS (tamanho do conjunto incluído; etapa: cálculo).** ` +
      `⚠ Esta contagem NÃO é medição da participação em cada célula das matrizes agregadas (BOCR, MAGNITUDE e as quatro de subcritérios): não a apresente como o N de matriz alguma.\n` +
      `⚠ Esta requisição não traz divisão de respondentes por mérito, dimensão ou subcritério; não atribua um N diferente a cada matriz. ` +
      `O portão de completude de A.21 é propriedade do percurso de cálculo examinado (ver o bloco do vínculo, acima), e não conferência desta execução.`;
    // ⚠ A contagem declarada em `Contagens` pode diferir da LISTA de incluídos: os dois valores se conservam.
    if (l.incluidosDeclarados !== null && l.incluidosDeclarados !== r.incluidos) {
      agregacao += `\n⚠ O bloco declara ${l.incluidosDeclarados} incluídos em "Contagens", e a lista de incluídos do vínculo traz ${r.incluidos}: os dois valores se conservam.`;
    }
  } else if (l.incluidosDeclarados !== null) {
    // Há contagem DECLARADA (o bloco a imprime), mas nenhuma lista utilizável para compará-la.
    total = naoComparada;
    agregacao =
      `**CÁLCULO — o vínculo declara ${l.incluidosDeclarados} incluídos no documento de cálculo (contagem transportada; etapa: cálculo), mas SEM lista de incluídos utilizável para compará-la com os enviados.** ` +
      `⚠ Esta contagem NÃO é medição da participação em cada célula das matrizes agregadas: não a apresente como o N de matriz alguma.\n` +
      `⚠ Esta requisição não traz divisão de respondentes por mérito, dimensão ou subcritério; não atribua um N a nenhuma matriz.`;
  } else {
    total = naoComparada;
    agregacao =
      `**CÁLCULO — a contagem de incluídos no documento de cálculo NÃO está disponível nesta requisição.** ` +
      `Nada se afirma aqui sobre quantos respondentes entraram no cálculo, nem sobre a participação em cada célula das matrizes agregadas.\n` +
      `⚠ Esta requisição não traz divisão de respondentes por mérito, dimensão ou subcritério; não atribua um N a nenhuma matriz.`;
  }

  // ⚠ O que o vínculo declara como ENVIADOS (a lista de identificadores e a contagem de `Contagens`)
  //   pode diferir do que esta lista traz: cada valor se conserva, e nenhum é escolhido em silêncio.
  const declaradosDeEnviados = [
    ...new Set(
      [l.enviados !== null ? l.enviados.length : null, l.enviadosDeclarados].filter((x): x is number => x !== null && x !== n)
    ),
  ];
  if (declaradosDeEnviados.length > 0) {
    total +=
      `\n⚠ O vínculo declara ${declaradosDeEnviados.join(' e ')} enviados, e esta lista traz ${n}: ` +
      `${declaradosDeEnviados.length === 1 ? 'os dois valores se conservam' : 'os valores se conservam'}.`;
  }

  return {
    cabecalho: '## DADOS DO SISTEMA — RESPONDENTES ENVIADOS A VOCÊ (lista EXAUSTIVA do conjunto enviado)',
    total,
    agregacao,
    cabecalhoDasContagens: 'Contagens por status, sobre os ENVIADOS a você (etapa: envio):\n',
    regraDeMencao:
      '⚠️ REGRA: Você NÃO pode mencionar respondentes fora desta lista COMO PARTICIPANTES DA AVALIAÇÃO ENVIADA: nenhum deles contribuiu para os dados de qualidade acima, e para cada respondente da lista você usa o ID hash fornecido. ' +
      'Único caso permitido fora da lista: um identificador registrado no bloco do vínculo como DIVERGÊNCIA REGISTRADA (na avaliação e fora do documento, no documento e fora da avaliação, ou repetido) pode ser nomeado SOMENTE nesse papel, e nunca como quem contribuiu para os dados de qualidade.' +
      // ⚠ R4: o texto de R2 fica INTACTO como prefixo. Na discrepância o bloco nomeia identificadores declarados e
      //   ausentes da lista apresentada, e uma regra que não os cobrisse recriaria a contradição entre regra e bloco.
      (l.conferencia !== null && !l.conferencia.todosCorrespondem
        ? ' Também pode ser nomeado, SOMENTE nesse papel, um identificador que o vínculo declara (nos enviados declarados ou nos incluídos) e que está ausente da lista apresentada, como registrado na linha "Lista de respondentes APRESENTADA" do bloco do vínculo.'
        : ''),
  };
}
