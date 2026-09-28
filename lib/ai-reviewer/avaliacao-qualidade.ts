/**
 * lib/ai-reviewer/avaliacao-qualidade.ts
 *
 * A.12: distingue **avaliação de qualidade DISPONÍVEL** de **valor produzido por
 * fallback**, dos dois lados da requisição.
 *
 * ⚠ **A presença de `byStatus` NÃO é critério.** Era assim que o defeito passava: a
 * tela montava `byStatus` com `CONFIÁVEL` igual ao número de respostas quando não
 * havia análise nenhuma, e o backend recebia isso como avaliação existente.
 *
 * ⚠ **Ausência não autoriza resultado favorável nem desfavorável.** Quem decide o
 * que fazer com cada estado é quem consome: a rota suspende a classificação global
 * quando a avaliação não está disponível, e preserva o comportamento existente
 * quando está.
 *
 * ⚠ **Isto não é a validação do parecer, de A.27.** Aquela julga o TEXTO gerado;
 * esta descreve a disponibilidade da avaliação de qualidade dos DADOS.
 *
 * ---
 *
 * **A.12 etapa 1: coerência interna, como dimensão INDEPENDENTE da disponibilidade.**
 *
 * ⚠ **O LIMITE, e ele é do contrato e não só do registro:** esta etapa verifica
 * **coerência interna da requisição**. **Cobertura do universo real e vínculo com a
 * execução NÃO são demonstrados aqui.** Uma requisição internamente coerente pode
 * descrever um painel que não é o que respondeu, e nada aqui detecta isso.
 *
 * ⚠ **`qualidadeDisponivel` continua descrevendo APENAS disponibilidade.** A
 * elegibilidade para classificar é função própria, `elegivelParaClassificacao`, e
 * "nenhuma contradição detectada" **não** basta: é preciso que o conjunto mínimo de
 * verificações tenha sido **efetivamente concluído**.
 */

/** Os três estados da avaliação, e só estes. */
export type EstadoAvaliacaoQualidade = 'disponivel' | 'ausente' | 'incompleta';

export interface AvaliacaoQualidade {
  estado: EstadoAvaliacaoQualidade;
  /** Por que não está disponível, ou `null` quando está. */
  motivo: string | null;
  /** De onde a avaliação veio, ou de onde se concluiu a ausência. */
  fonte: string;
}

export const ESTADOS_AVALIACAO: EstadoAvaliacaoQualidade[] = ['disponivel', 'ausente', 'incompleta'];

export const MOTIVO_AUSENTE =
  'Qualidade individual não avaliada: a requisição não traz avaliação por respondente.';
export const MOTIVO_INCOMPLETA =
  'Avaliação de qualidade incompleta: há respondentes sem CR individual, e a distribuição não pode ser tratada como completa.';
export const MOTIVO_DECLARADA_SEM_DADOS =
  'Avaliação declarada disponível, mas a requisição não traz CR por respondente.';

/** O CR individual de um respondente, em qualquer das formas que o payload usa. */
function crDoRespondente(r: any): number | null {
  for (const valor of [r?.cr, r?.metrics?.avgCR, r?.avgCR, r?.consistency?.cr]) {
    if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  }
  return null;
}

/** Há CR individual para TODOS os respondentes listados? */
export function medicaoPorRespondente(respondentes: unknown): { total: number; comCR: number } {
  const lista = Array.isArray(respondentes) ? respondentes : [];
  return { total: lista.length, comCR: lista.filter((r) => crDoRespondente(r) !== null).length };
}

/**
 * Classifica a avaliação de uma requisição RECEBIDA pela rota.
 *
 * A declaração do cliente vale, e é **conferida**: declarar disponível sem CR por
 * respondente vira `incompleta`. Sem declaração, o legado é classificado pela
 * existência de CR individual — nunca por `byStatus`.
 */
export function classificarAvaliacaoRecebida(raw: any): AvaliacaoQualidade {
  const declarada = raw?.avaliacaoDeQualidade;
  const { total, comCR } = medicaoPorRespondente(raw?.qualityAnalysis?.respondents);
  const temMedicao = total > 0 && comCR === total;

  if (declarada && ESTADOS_AVALIACAO.includes(declarada.estado)) {
    if (declarada.estado !== 'disponivel') {
      return {
        estado: declarada.estado,
        motivo: declarada.motivo || (declarada.estado === 'ausente' ? MOTIVO_AUSENTE : MOTIVO_INCOMPLETA),
        fonte: 'declarada na requisição',
      };
    }
    if (temMedicao) return { estado: 'disponivel', motivo: null, fonte: 'declarada na requisição, com CR por respondente' };
    return { estado: 'incompleta', motivo: MOTIVO_DECLARADA_SEM_DADOS, fonte: 'declarada na requisição, conferida' };
  }

  // Legado: sem declaração.
  if (temMedicao) return { estado: 'disponivel', motivo: null, fonte: 'inferida: lista de respondentes com CR individual' };
  if (total > 0) {
    return {
      estado: 'incompleta',
      motivo: `${MOTIVO_INCOMPLETA} Medido: ${comCR} de ${total} respondentes com CR.`,
      fonte: 'inferida: lista de respondentes sem CR completo',
    };
  }
  return {
    estado: 'ausente',
    motivo: MOTIVO_AUSENTE,
    fonte: 'inferida: requisição sem lista de respondentes; byStatus sozinho não é avaliação',
  };
}

/**
 * Classifica o que a TELA tem antes de montar a requisição.
 *
 * ⚠ A tela deixa de fabricar distribuição: sem respondentes avaliados, o estado é
 * `ausente`; com respondentes sem CR, `incompleta`.
 */
export function classificarAvaliacaoDaTela(entrada: {
  respondentesAvaliados: unknown[];
  respostasAtivas: unknown[];
}): AvaliacaoQualidade {
  const analise = medicaoPorRespondente(entrada.respondentesAvaliados);
  if (analise.total > 0) {
    if (analise.comCR === analise.total) {
      return { estado: 'disponivel', motivo: null, fonte: 'análise de qualidade dos respondentes ativos' };
    }
    return {
      estado: 'incompleta',
      motivo: `${MOTIVO_INCOMPLETA} Medido: ${analise.comCR} de ${analise.total} respondentes com CR.`,
      fonte: 'análise de qualidade dos respondentes ativos, sem CR completo',
    };
  }

  // Sem análise de qualidade: vale o CR das próprias respostas, quando existe.
  const respostas = medicaoPorRespondente(entrada.respostasAtivas);
  if (respostas.total > 0 && respostas.comCR === respostas.total) {
    return { estado: 'disponivel', motivo: null, fonte: 'CR individual das respostas ativas' };
  }
  if (respostas.comCR > 0) {
    return {
      estado: 'incompleta',
      motivo: `${MOTIVO_INCOMPLETA} Medido: ${respostas.comCR} de ${respostas.total} respostas com CR.`,
      fonte: 'CR individual das respostas ativas, incompleto',
    };
  }
  return {
    estado: 'ausente',
    motivo: respostas.total > 0
      ? `${MOTIVO_AUSENTE} Há ${respostas.total} respostas sem análise individual de consistência.`
      : MOTIVO_AUSENTE,
    fonte: 'tela: nenhuma análise de qualidade individual disponível',
  };
}

/** Só `disponivel` autoriza classificação global. */
export function qualidadeDisponivel(avaliacao?: AvaliacaoQualidade | null): boolean {
  return avaliacao?.estado === 'disponivel';
}

/** O motivo a exibir e a registrar quando a classificação fica suspensa. */
export function motivoDaSuspensao(avaliacao?: AvaliacaoQualidade | null): string {
  if (!avaliacao) return MOTIVO_AUSENTE;
  return avaliacao.motivo || (avaliacao.estado === 'ausente' ? MOTIVO_AUSENTE : MOTIVO_INCOMPLETA);
}

/** O rótulo fixo da apresentação, quando a nota não é calculada. */
export const ROTULO_NOTA_SUSPENSA = 'Nota não calculada: qualidade individual não avaliada';

// ============================================================================
// A.12 etapa 1: COERÊNCIA INTERNA
// ============================================================================

/**
 * ⚠ **Os quatro estados de uma comparação, e a distinção que não pode ser confundida.**
 *
 * | Dimensão | Pergunta |
 * |---|---|
 * | **aplicabilidade** | as grandezas têm **significado comparável**? |
 * | **executabilidade** | os **dados necessários** estão presentes e válidos? |
 *
 * ⚠ **Campo necessário ausente, inválido, ou com significado não demonstrado, produz
 * `nao_determinada`, NUNCA `incompativel`, e NUNCA vira zero.** Só **diferença de
 * significado demonstrada** produz `incompativel`.
 *
 * ⚠ **Resultado por par não é conclusão global.** Um par `incompativel` caracteriza
 * aquela comparação: excluí-lo **não aprova nem reprova** o conjunto.
 */
export type EstadoComparacao = 'consistente' | 'contraditoria' | 'nao_determinada' | 'incompativel';

export type IdComparacao = 'V1' | 'V2' | 'V3' | 'V4' | 'V5';

/** Um lado da comparação, com o valor e a sua fonte. ⚠ Contradição conserva os DOIS. */
export interface LadoDaComparacao {
  fonte: string;
  valor: number | null;
}

export interface Comparacao {
  id: IdComparacao;
  /** População, categoria e condição, declaradas ANTES de comparar. */
  populacao: string;
  categoria: string;
  condicao: string;
  estado: EstadoComparacao;
  /** ⚠ Os dois valores e a fonte de cada um, conservados sem escolher um em silêncio. */
  lados: LadoDaComparacao[];
  /** ⚠ V3 e V5 NOMEIAM as chaves que compõem cada soma. */
  chavesSomadas: string[] | null;
  motivo: string;
}

/** O ramo do resumo de qualidade que o formato recebido seleciona, em `route.ts`. */
export type RamoDeQualidade = 'P1' | 'P2' | 'P3' | 'indeterminado';

export interface Coerencia {
  comparacoes: Comparacao[];
  ramo: RamoDeQualidade;
  /** ⚠ Declarado para o formato recebido, e não escolhido depois do resultado. */
  conjuntoMinimo: IdComparacao[];
  conjuntoMinimoConcluido: boolean;
  conclusao: 'coerente' | 'contraditoria' | 'nao_determinada';
  motivo: string | null;
}

/**
 * ⚠ **O CONJUNTO MÍNIMO DE VERIFICAÇÕES, por ramo, e o fundamento de cada um.**
 *
 * O conjunto mínimo é o das verificações que aferem **os dados que vão sustentar a
 * classificação apresentada**, e o ramo é escolhido pelo próprio formato recebido, nas
 * prioridades de `app/api/ai-reviewer/route.ts:685`, `:738` e `:757`.
 *
 * ⚠ **Não estabelecer o conjunto do ramo aplicável produz conclusão global
 * `nao_determinada`, com suspensão.** Sem isso, todas as comparações saindo
 * `incompativel` aprovaria por vacuidade.
 */
export const CONJUNTO_MINIMO: Record<RamoDeQualidade, IdComparacao[]> = {
  // O ramo calcula todo percentual sobre `statistics.total`, com queda para a soma de
  // `byStatus`: V2 afere esse total contra a população listada, V3 afere a soma.
  P1: ['V2', 'V3'],
  // Sem agregados, o único par com dois lados é o CR individual contra o `status` da
  // própria lista.
  P2: ['V4'],
  // É a única partição disponível.
  P3: ['V5'],
  indeterminado: [],
};

/**
 * ⚠ **Os intervalos dos DOIS produtores comparados, declarados, e é isto que delimita V4.**
 *
 * Medido em `app/decisor/resultados/[projectId]/page.tsx:1006-1018` e nos rótulos de
 * `app/api/ai-reviewer/route.ts:698-701`. **Só `CONFIÁVEL` coincide**; nas outras três a
 * diferença de significado é **demonstrada**, e o par sai `incompativel`.
 */
export const INTERVALOS_DECLARADOS = {
  'CONFIÁVEL': { tela: 'CR <= 0.10', rota: 'CR <= 0.10', coincidem: true },
  'REVISAR': { tela: 'fixo em 0', rota: '0.10 < CR <= 0.15', coincidem: false },
  'SUSPEITO': { tela: 'CR > 0.10, sem teto separado em 0.20', rota: '0.15 < CR <= 0.20', coincidem: false },
  'CRÍTICO': { tela: 'CR > 0.20 OU status em {SUSPEITO, CRÍTICO}', rota: 'CR > 0.20', coincidem: false },
} as const;

/** O limiar publicado de aceitabilidade, Saaty (1977), e o único que os dois lados partilham. */
export const LIMIAR_CONFIAVEL = 0.10;

/** ⚠ Os pares de alias que são o MESMO balde, medidos em `review-request.ts:104-112`. */
export const ALIASES_BY_STATUS: Array<[string, string]> = [
  ['CONFIÁVEL', 'CONFIAVEL'],
  ['CRÍTICO', 'CRITICO'],
];

/** As chaves de `byStatus` que são baldes mutuamente exclusivos, nomeadas. */
export const CHAVES_BY_STATUS = ['CONFIÁVEL', 'REVISAR', 'SUSPEITO', 'CRÍTICO', 'DESCONHECIDO'];

/** As chaves de cada partição de V5, nomeadas. ⚠ `total` fica FORA: é o total. */
export const CHAVES_PARTICAO = {
  summary: ['ok', 'suspicious', 'critical'],
  overallStats: ['valid', 'warning', 'critical'],
} as const;

export const MOTIVO_COERENCIA_NAO_DETERMINADA =
  'Verificação obrigatória de coerência não determinada: a classificação fica suspensa porque não foi possível concluí-la.';
export const MOTIVO_COERENCIA_CONTRADICAO =
  'Contradição interna não resolvida entre os dados da requisição: a classificação fica suspensa.';
export const MOTIVO_CONJUNTO_MINIMO_NAO_ESTABELECIDO =
  'Conjunto mínimo de verificações não estabelecido para o formato recebido: a classificação fica suspensa.';

const numeroFinito = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/**
 * Resolve um balde de `byStatus` respeitando os aliases.
 *
 * ⚠ **Aliases simultâneos com valores IGUAIS contam UMA vez.** ⚠ **Com valores
 * DIFERENTES nenhuma variante prevalece em silêncio:** devolve `divergem`, com os dois
 * valores e as suas fontes, para que a comparação registre contradição e suspenda.
 */
export function baldeComAlias(
  byStatus: any,
  chave: string
): { valor: number | null; divergem: boolean; lados: LadoDaComparacao[] } {
  const par = ALIASES_BY_STATUS.find(([a]) => a === chave);
  const nomes = par ? [par[0], par[1]] : [chave];
  const presentes = nomes
    .filter((n) => byStatus && Object.prototype.hasOwnProperty.call(byStatus, n))
    .map((n) => ({ fonte: `byStatus['${n}']`, valor: numeroFinito(byStatus[n]) }));
  if (presentes.length === 0) return { valor: null, divergem: false, lados: [] };
  if (presentes.length === 1) return { valor: presentes[0].valor, divergem: false, lados: presentes };
  const [x, y] = presentes;
  if (x.valor === null || y.valor === null) return { valor: null, divergem: false, lados: presentes };
  if (x.valor === y.valor) return { valor: x.valor, divergem: false, lados: presentes };
  return { valor: null, divergem: true, lados: presentes };
}

/** O ramo que o formato recebido seleciona, pelas prioridades da rota. */
export function ramoDeQualidade(raw: any): RamoDeQualidade {
  const qa = raw?.qualityAnalysis;
  if (qa?.statistics?.byStatus) return 'P1';
  if (Array.isArray(qa?.respondents) && qa.respondents.length > 0) return 'P2';
  if (raw?.overallStats && numeroFinito(raw.overallStats.total) !== null && raw.overallStats.total > 0) return 'P3';
  return 'indeterminado';
}

function comparar(
  base: Omit<Comparacao, 'estado' | 'motivo'>,
  a: LadoDaComparacao,
  b: LadoDaComparacao,
  rotulo: string
): Comparacao {
  if (a.valor === null || b.valor === null) {
    const qual = a.valor === null ? a.fonte : b.fonte;
    return {
      ...base,
      estado: 'nao_determinada',
      motivo: `${rotulo}: nao concluida porque ${qual} esta ausente ou nao e numero finito. Campo ausente NAO vale zero.`,
    };
  }
  if (a.valor === b.valor) {
    return { ...base, estado: 'consistente', motivo: `${rotulo}: ${a.fonte} e ${b.fonte} conferem em ${a.valor}.` };
  }
  return {
    ...base,
    estado: 'contraditoria',
    motivo: `${rotulo}: ${a.fonte} = ${a.valor} contra ${b.fonte} = ${b.valor}. Os dois valores e as suas fontes ficam conservados.`,
  };
}

/**
 * Avalia a coerência interna da requisição RECEBIDA, comparação por comparação.
 *
 * ⚠ **Nenhuma comparação decide o conjunto sozinha**, e nenhuma lê o significado de um
 * campo a partir do seu nome: cada uma declara população, categoria e condição.
 */
export function avaliarCoerencia(raw: any): Coerencia {
  const qa = raw?.qualityAnalysis;
  const st = qa?.statistics;
  const by = st?.byStatus;
  const sum = qa?.summary;
  const os = raw?.overallStats;
  const lista: any[] = Array.isArray(qa?.respondents) ? qa.respondents : [];
  const comparacoes: Comparacao[] = [];

  // ---------------------------------------------------------------- V1
  {
    const base = {
      id: 'V1' as IdComparacao,
      populacao: 'o painel avaliado, declarado por summary.total e por overallStats.total',
      categoria: 'respondente valido, isto é CR <= 0.10',
      condicao: 'as duas populacoes declaradas coincidem',
      lados: [
        { fonte: 'qualityAnalysis.summary.ok', valor: numeroFinito(sum?.ok) },
        { fonte: 'overallStats.valid', valor: numeroFinito(os?.valid) },
      ],
      chavesSomadas: null,
    };
    const tSum = numeroFinito(sum?.total);
    const tOs = numeroFinito(os?.total);
    if (tSum === null || tOs === null) {
      comparacoes.push({
        ...base,
        estado: 'nao_determinada',
        motivo: 'V1: a coincidencia das populacoes nao foi demonstrada, porque summary.total ou overallStats.total esta ausente.',
      });
    } else if (tSum !== tOs) {
      comparacoes.push({
        ...base,
        estado: 'incompativel',
        motivo: `V1: populacoes DIFERENTES, demonstrado: summary.total = ${tSum} contra overallStats.total = ${tOs}. O par nao entra no veredito.`,
      });
    } else {
      comparacoes.push(comparar(base, base.lados[0], base.lados[1], 'V1'));
    }
  }

  // ---------------------------------------------------------------- V2
  comparacoes.push(
    comparar(
      {
        id: 'V2',
        populacao: 'o painel avaliado: a lista de respondentes e o total declarado dela',
        categoria: 'contagem de respondentes, sem categoria de qualidade',
        condicao: 'as duas contam a mesma populacao, por contrato da requisicao',
        lados: [
          { fonte: 'qualityAnalysis.respondents.length', valor: Array.isArray(qa?.respondents) ? lista.length : null },
          { fonte: 'qualityAnalysis.statistics.total', valor: numeroFinito(st?.total) },
        ],
        chavesSomadas: null,
      },
      { fonte: 'qualityAnalysis.respondents.length', valor: Array.isArray(qa?.respondents) ? lista.length : null },
      { fonte: 'qualityAnalysis.statistics.total', valor: numeroFinito(st?.total) },
      'V2'
    )
  );

  // ---------------------------------------------------------------- V3
  {
    const base = {
      id: 'V3' as IdComparacao,
      populacao: 'o painel avaliado, pelos baldes de byStatus e pelo total declarado',
      categoria: 'baldes mutuamente exclusivos de byStatus',
      condicao: 'as chaves somadas formam a mesma populacao do total',
      chavesSomadas: [...CHAVES_BY_STATUS],
    };
    if (!by) {
      comparacoes.push({
        ...base,
        estado: 'nao_determinada',
        lados: [],
        motivo: 'V3: nao concluida porque qualityAnalysis.statistics.byStatus esta ausente.',
      });
    } else {
      const divergentes: LadoDaComparacao[] = [];
      let soma = 0;
      let indeterminada = false;
      for (const chave of CHAVES_BY_STATUS) {
        const r = baldeComAlias(by, chave);
        if (r.divergem) divergentes.push(...r.lados);
        else if (r.valor !== null) soma += r.valor;
        else if (r.lados.length > 0) indeterminada = true;
      }
      if (divergentes.length > 0) {
        comparacoes.push({
          ...base,
          estado: 'contraditoria',
          lados: divergentes,
          motivo:
            'V3: aliases simultaneos de byStatus com valores DIFERENTES, ' +
            divergentes.map((l) => `${l.fonte} = ${l.valor}`).join(' contra ') +
            '. Nenhuma variante prevalece, e a classificacao fica suspensa.',
        });
      } else if (indeterminada) {
        comparacoes.push({
          ...base,
          estado: 'nao_determinada',
          lados: [{ fonte: 'soma das chaves nomeadas de byStatus', valor: null }],
          motivo: 'V3: nao concluida porque um balde presente de byStatus nao e numero finito. Campo invalido NAO vale zero.',
        });
      } else {
        comparacoes.push(
          comparar(
            { ...base, lados: [] },
            { fonte: `soma de byStatus [${CHAVES_BY_STATUS.join(', ')}]`, valor: soma },
            { fonte: 'qualityAnalysis.statistics.total', valor: numeroFinito(st?.total) },
            'V3'
          )
        );
      }
    }
  }

  // ---------------------------------------------------------------- V4
  {
    const base = {
      id: 'V4' as IdComparacao,
      populacao: 'os respondentes listados, e a categoria agregada correspondente',
      categoria: `CONFIAVEL, isto e CR <= ${LIMIAR_CONFIAVEL}`,
      condicao: `intervalos declarados dos dois produtores: tela "${INTERVALOS_DECLARADOS['CONFIÁVEL'].tela}" e rota "${INTERVALOS_DECLARADOS['CONFIÁVEL'].rota}", que COINCIDEM`,
      chavesSomadas: null,
    };
    const crs = lista.map((r) => crDoRespondente(r));
    const semCR = crs.filter((c) => c === null).length;
    const derivada = crs.filter((c) => c !== null && (c as number) <= LIMIAR_CONFIAVEL).length;
    const agregada = by
      ? baldeComAlias(by, 'CONFIÁVEL')
      : {
          valor: lista.some((r) => typeof r?.status === 'string')
            ? lista.filter((r) => r?.status === 'CONFIÁVEL' || r?.status === 'CONFIAVEL').length
            : null,
          divergem: false,
          lados: [] as LadoDaComparacao[],
        };
    const fonteAgregada = by ? "byStatus['CONFIÁVEL']" : 'status CONFIAVEL na propria lista';
    // ⚠ **APLICABILIDADE antes de executabilidade.** Se o unico balde de significado
    //   comparavel, `CONFIÁVEL`, nao esta declarado, e ha outros baldes, entao o que
    //   sobra tem significado DEMONSTRADAMENTE diferente, pelos intervalos acima: o par
    //   e INCOMPATIVEL, e nao `nao_determinada`. ⚠ E um par incompativel NAO aprova nem
    //   reprova o conjunto: quem decide isso e o conjunto minimo do ramo.
    const outrosBaldes = by
      ? CHAVES_BY_STATUS.filter((k) => k !== 'CONFIÁVEL').filter((k) => baldeComAlias(by, k).lados.length > 0)
      : [];
    if (by && agregada.lados.length === 0 && outrosBaldes.length > 0) {
      const divergentes = outrosBaldes
        .filter((k) => (INTERVALOS_DECLARADOS as any)[k] && !(INTERVALOS_DECLARADOS as any)[k].coincidem)
        .map((k) => `${k}: tela "${(INTERVALOS_DECLARADOS as any)[k].tela}" contra rota "${(INTERVALOS_DECLARADOS as any)[k].rota}"`);
      comparacoes.push({
        ...base,
        estado: 'incompativel',
        lados: [
          { fonte: `contagem derivada dos CRs individuais, CR <= ${LIMIAR_CONFIAVEL}`, valor: derivada },
          { fonte: "byStatus['CONFIÁVEL']", valor: null },
        ],
        motivo: `V4: NAO APLICAVEL, por diferenca de significado DEMONSTRADA. O unico balde de intervalo coincidente, CONFIAVEL, nao esta declarado, e os presentes sao ${outrosBaldes.join(', ')}${divergentes.length ? `, com intervalos divergentes: ${divergentes.join('; ')}` : ''}. O par NAO entra no veredito, e nao aprova nem reprova o conjunto.`,
      });
    } else if (lista.length === 0 || semCR > 0) {
      comparacoes.push({
        ...base,
        estado: 'nao_determinada',
        lados: [
          { fonte: 'CR individual dos respondentes listados', valor: null },
          { fonte: fonteAgregada, valor: agregada.valor },
        ],
        motivo: `V4: nao concluida porque ${lista.length === 0 ? 'nao ha respondentes listados' : `${semCR} de ${lista.length} respondentes nao tem CR finito`}. Campo ausente NAO vale zero.`,
      });
    } else if (agregada.divergem) {
      comparacoes.push({
        ...base,
        estado: 'contraditoria',
        lados: agregada.lados,
        motivo:
          'V4: aliases simultaneos de CONFIAVEL com valores DIFERENTES, ' +
          agregada.lados.map((l) => `${l.fonte} = ${l.valor}`).join(' contra ') +
          '. Nenhuma variante prevalece.',
      });
    } else {
      comparacoes.push(
        comparar(
          { ...base, lados: [] },
          { fonte: `contagem derivada dos CRs individuais, CR <= ${LIMIAR_CONFIAVEL}`, valor: derivada },
          { fonte: fonteAgregada, valor: agregada.valor },
          'V4'
        )
      );
    }
  }

  // ---------------------------------------------------------------- V5
  {
    const base = {
      id: 'V5' as IdComparacao,
      populacao: 'a populacao do total de cada particao declarada',
      categoria: 'as categorias declaradas mutuamente exclusivas de cada particao',
      condicao: 'as categorias serem exclusivas e cobrirem a mesma populacao do total',
      chavesSomadas: [
        ...CHAVES_PARTICAO.summary.map((k) => `summary.${k}`),
        ...CHAVES_PARTICAO.overallStats.map((k) => `overallStats.${k}`),
      ],
    };
    const particoes: Array<{ nome: string; chaves: readonly string[]; obj: any }> = [];
    if (sum) particoes.push({ nome: 'qualityAnalysis.summary', chaves: CHAVES_PARTICAO.summary, obj: sum });
    if (os) particoes.push({ nome: 'overallStats', chaves: CHAVES_PARTICAO.overallStats, obj: os });

    let resultado: Comparacao | null = null;
    const naoDeterminadas: string[] = [];
    for (const p of particoes) {
      const valores = p.chaves.map((k) => ({ fonte: `${p.nome}.${k}`, valor: numeroFinito(p.obj[k]) }));
      const total = numeroFinito(p.obj.total);
      if (total === null || valores.some((v) => v.valor === null)) {
        naoDeterminadas.push(p.nome);
        continue;
      }
      const soma = valores.reduce((a, v) => a + (v.valor as number), 0);
      if (soma !== total) {
        resultado = {
          ...base,
          estado: 'contraditoria',
          lados: [
            { fonte: `soma de ${p.nome} [${p.chaves.join(', ')}]`, valor: soma },
            { fonte: `${p.nome}.total`, valor: total },
          ],
          motivo: `V5: a particao de ${p.nome} soma ${soma} sobre total ${total}, com as chaves ${p.chaves.join(', ')}. Os dois valores e as suas fontes ficam conservados.`,
        };
        break;
      }
      if (!resultado) {
        resultado = {
          ...base,
          estado: 'consistente',
          lados: [
            { fonte: `soma de ${p.nome} [${p.chaves.join(', ')}]`, valor: soma },
            { fonte: `${p.nome}.total`, valor: total },
          ],
          motivo: `V5: a particao de ${p.nome} fecha em ${total}.`,
        };
      }
    }
    if (!resultado) {
      comparacoes.push({
        ...base,
        estado: 'nao_determinada',
        lados: [],
        motivo: `V5: nao concluida porque nenhuma particao declarada esta completa${naoDeterminadas.length ? `, e ${naoDeterminadas.join(' e ')} tem campo ausente ou invalido` : ''}. Campo ausente NAO vale zero.`,
      });
    } else {
      comparacoes.push(resultado);
    }
  }

  // ---------------------------------------------------------------- conclusão
  const ramo = ramoDeQualidade(raw);
  const conjuntoMinimo = CONJUNTO_MINIMO[ramo];
  const porId = (id: IdComparacao) => comparacoes.find((c) => c.id === id)!;
  const contraditorias = comparacoes.filter((c) => c.estado === 'contraditoria');
  const minimoPendentes = conjuntoMinimo.filter((id) => {
    const e = porId(id).estado;
    return e !== 'consistente' && e !== 'contraditoria';
  });
  const conjuntoMinimoConcluido = ramo !== 'indeterminado' && minimoPendentes.length === 0;

  let conclusao: Coerencia['conclusao'] = 'coerente';
  let motivo: string | null = null;
  if (contraditorias.length > 0) {
    conclusao = 'contraditoria';
    motivo = `${MOTIVO_COERENCIA_CONTRADICAO} ${contraditorias.map((c) => c.motivo).join(' ')}`;
  } else if (ramo === 'indeterminado') {
    conclusao = 'nao_determinada';
    motivo = `${MOTIVO_CONJUNTO_MINIMO_NAO_ESTABELECIDO} Nenhum dos ramos P1, P2 ou P3 se aplica ao formato recebido.`;
  } else if (!conjuntoMinimoConcluido) {
    conclusao = 'nao_determinada';
    motivo = `${MOTIVO_COERENCIA_NAO_DETERMINADA} Ramo ${ramo}, conjunto minimo ${conjuntoMinimo.join(' e ')}. Pendentes: ${minimoPendentes.map((id) => porId(id).motivo).join(' ')}`;
  }

  return { comparacoes, ramo, conjuntoMinimo, conjuntoMinimoConcluido, conclusao, motivo };
}

/**
 * **A REGRA DE ELEGIBILIDADE, na forma literal.**
 *
 * > A classificação exige avaliação **disponível**, **nenhuma contradição relevante não
 * > resolvida** e **conclusão satisfatória de todas as verificações obrigatórias
 * > aplicáveis**. ⚠ **Verificação obrigatória não determinada suspende nota e veredicto**,
 * > com motivo explícito.
 *
 * ⚠ **PRECEDÊNCIA DECLARADA.** Avaliações `ausente` e `incompleta` **conservam as suas
 * razões de suspensão**, e a coerência acrescenta razões próprias **somente quando a
 * disponibilidade está satisfeita**. A coerência **não substitui nem reescreve** os
 * motivos anteriores.
 */
export function elegivelParaClassificacao(
  avaliacao?: AvaliacaoQualidade | null,
  coerencia?: Coerencia | null
): { elegivel: boolean; motivo: string | null } {
  // ⚠ PRECEDÊNCIA: a disponibilidade vem primeiro, e o seu motivo é conservado.
  if (!qualidadeDisponivel(avaliacao)) {
    return { elegivel: false, motivo: motivoDaSuspensao(avaliacao) };
  }
  if (!coerencia) {
    return {
      elegivel: false,
      motivo: `${MOTIVO_COERENCIA_NAO_DETERMINADA} A coerencia interna nao foi avaliada nesta requisicao.`,
    };
  }
  if (coerencia.conclusao !== 'coerente') {
    return { elegivel: false, motivo: coerencia.motivo };
  }
  return { elegivel: true, motivo: null };
}
