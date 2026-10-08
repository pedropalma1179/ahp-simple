/**
 * lib/validacao-externa/contrato-retorno.ts
 *
 * O LADO DO RETORNO da validação externa (especificação da Fase 2, seção 6): a verificação da FORMA do
 * que o serviço devolveu, ANTES de exibir.
 *
 *   - 6.1  o envelope (`all_valid`, `summary`, `results`);
 *   - 6.2  o contrato da entrada por matriz e os TRÊS ESTADOS da entrada (completa, parcialmente
 *          utilizável, sem evidência alguma);
 *   - 6.3  chaves inesperadas e ausentes;
 *   - 6.4  as CINCO comparações exatas entre resumo e resultados, conservando os dois valores e a fonte
 *          de cada um, e os dois máximos EXIBIDOS com a fonte, sem comparação numérica.
 *
 * ⚠ LIMITE DECLARADO (seção 14): campos presentes, finitos e correspondentes demonstram retorno
 * ESTRUTURALMENTE VÁLIDO e resultado INFORMADO pelo serviço. Eles NÃO demonstram que o serviço executou a
 * comparação, e o significado de `valid`, `all_valid`, `sdk_cr`, `cr_diff` e `max_weight_diff` no serviço
 * não é verificável aqui. Por isso este módulo nunca produz a expressão "comparação confirmada".
 *
 * ⚠ CLÁUSULA NÃO IMPLEMENTADA (exceção de escopo expressamente autorizada pelo autor em 08/10/2026).
 * A última linha da tabela de 6.2, "vetores de peso, se o retorno os trouxer: finitos, positivos, de
 * comprimento igual a `n`", NÃO está implementada, porque os nomes dos campos que carregariam esses
 * vetores não estão estabelecidos. Este módulo lê apenas `n`, `sdk_cr`, `cr_diff`, `max_weight_diff`,
 * `your_cr` e `valid` de cada entrada, e nada verifica sobre vetores devolvidos. Por isso este código NÃO
 * apresenta cumprimento integral de 6.2. Uma regra estrutural por forma (tratar como vetor todo arranjo
 * devolvido) está DESCARTADA: ela só alcançaria arranjos que já têm comprimento igual a `n` e nunca
 * detectaria comprimento divergente, que é uma das três propriedades exigidas. Estabelecer os nomes
 * examinando o microsserviço fica fora desta frente.
 *
 * ⚠ Só booleano EXPLÍCITO é interpretado como veredito, por matriz e no agregado. Nenhuma veracidade
 * (`if (x)`) é usada sobre campo do retorno.
 *
 * Módulo puro: sem rede, sem Firestore.
 */

export type EstadoDoCampo = 'valido' | 'ausente' | 'invalido';

export interface CampoNumerico {
  estado: EstadoDoCampo;
  valor: number | null;
  /** Texto do que o campo continha (para os detalhes). */
  descricao: string;
}

function descrever(v: unknown): string {
  if (v === undefined) return 'ausente';
  if (v === null) return 'null';
  if (typeof v === 'string') return JSON.stringify(v.length > 30 ? `${v.slice(0, 30)}…` : v);
  if (Array.isArray(v)) return `arranjo de ${v.length}`;
  if (typeof v === 'number') {
    return Number.isFinite(v) ? String(v) : Number.isNaN(v) ? 'não numérico' : v > 0 ? 'infinito positivo' : 'infinito negativo';
  }
  return String(typeof v === 'object' ? 'objeto' : v);
}

/** `undefined` e `null` são "ausente"; número finito é válido; qualquer outra coisa é inválida. */
export function avaliarNumero(v: unknown, opcoes: { naoNegativo?: boolean } = {}): CampoNumerico {
  if (v === undefined || v === null) return { estado: 'ausente', valor: null, descricao: descrever(v) };
  if (typeof v === 'number' && Number.isFinite(v) && (!opcoes.naoNegativo || v >= 0)) {
    return { estado: 'valido', valor: v, descricao: String(v) };
  }
  return { estado: 'invalido', valor: null, descricao: descrever(v) };
}

function avaliarInteiroNaoNegativo(v: unknown): CampoNumerico {
  const c = avaliarNumero(v);
  if (c.estado === 'valido' && !(Number.isInteger(c.valor) && (c.valor as number) >= 0)) {
    return { estado: 'invalido', valor: null, descricao: String(v) };
  }
  return c;
}

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

// ---------------------------------------------------------------------------------------------
// 6.1 Envelope
// ---------------------------------------------------------------------------------------------

export type AllValid =
  | { estado: 'booleano'; valor: boolean }
  | { estado: 'ausente' | 'nao_booleano'; descricao: string };

export interface EnvelopeAvaliado {
  /** O corpo é objeto (nem nulo, nem arranjo, nem primitivo). */
  corpoObjeto: boolean;
  allValid: AllValid;
  summaryPresente: boolean;
  total_matrices: CampoNumerico;
  valid_matrices: CampoNumerico;
  max_weight_diff: CampoNumerico;
  max_cr_diff: CampoNumerico;
  issues: { estado: EstadoDoCampo; textos: string[] };
  resultsObjeto: boolean;
  /** `result.library` é informado pelo próprio serviço e não é requisito do envelope. */
  library: string | null;
  /** Cada defeito nomeia o campo e o motivo. */
  defeitos: string[];
  /** Verdadeiro quando TODOS os requisitos de 6.1 valem. */
  valido: boolean;
}

export function avaliarEnvelope(corpo: unknown): EnvelopeAvaliado {
  const defeitos: string[] = [];
  const corpoObjeto = ehObjeto(corpo);
  const c: Record<string, unknown> = corpoObjeto ? (corpo as Record<string, unknown>) : {};
  if (!corpoObjeto) defeitos.push(`corpo da resposta: ${descrever(corpo)}, não é objeto`);

  let allValid: AllValid;
  if (c.all_valid === true || c.all_valid === false) {
    allValid = { estado: 'booleano', valor: c.all_valid };
  } else if (c.all_valid === undefined || c.all_valid === null) {
    allValid = { estado: 'ausente', descricao: descrever(c.all_valid) };
    if (corpoObjeto) defeitos.push('all_valid: ausente');
  } else {
    allValid = { estado: 'nao_booleano', descricao: descrever(c.all_valid) };
    defeitos.push(`all_valid: não booleano (${descrever(c.all_valid)})`);
  }

  const summaryPresente = ehObjeto(c.summary);
  const s: Record<string, unknown> = summaryPresente ? (c.summary as Record<string, unknown>) : {};
  if (corpoObjeto && !summaryPresente) defeitos.push(`summary: ${descrever(c.summary)}, não é objeto`);

  const total_matrices = avaliarInteiroNaoNegativo(s.total_matrices);
  const valid_matrices = avaliarInteiroNaoNegativo(s.valid_matrices);
  const max_weight_diff = avaliarNumero(s.max_weight_diff);
  const max_cr_diff = avaliarNumero(s.max_cr_diff);
  if (summaryPresente) {
    if (total_matrices.estado !== 'valido')
      defeitos.push(`summary.total_matrices: ${total_matrices.descricao}, não é inteiro não negativo`);
    if (valid_matrices.estado !== 'valido')
      defeitos.push(`summary.valid_matrices: ${valid_matrices.descricao}, não é inteiro não negativo`);
    if (max_weight_diff.estado !== 'valido')
      defeitos.push(`summary.max_weight_diff: ${max_weight_diff.descricao}, não é número finito`);
    if (max_cr_diff.estado !== 'valido')
      defeitos.push(`summary.max_cr_diff: ${max_cr_diff.descricao}, não é número finito`);
  }

  let issues: EnvelopeAvaliado['issues'];
  if (Array.isArray(s.issues) && (s.issues as unknown[]).every(t => typeof t === 'string')) {
    issues = { estado: 'valido', textos: s.issues as string[] };
  } else if (s.issues === undefined || s.issues === null) {
    issues = { estado: 'ausente', textos: [] };
    if (summaryPresente) defeitos.push('summary.issues: ausente');
  } else {
    issues = { estado: 'invalido', textos: [] };
    defeitos.push(`summary.issues: ${descrever(s.issues)}, não é arranjo de textos`);
  }

  const resultsObjeto = ehObjeto(c.results);
  if (corpoObjeto && !resultsObjeto) defeitos.push(`results: ${descrever(c.results)}, não é objeto`);

  const library = typeof c.library === 'string' ? c.library : null;

  return {
    corpoObjeto,
    allValid,
    summaryPresente,
    total_matrices,
    valid_matrices,
    max_weight_diff,
    max_cr_diff,
    issues,
    resultsObjeto,
    library,
    defeitos,
    valido: defeitos.length === 0,
  };
}

// ---------------------------------------------------------------------------------------------
// 6.2 Entrada por matriz
// ---------------------------------------------------------------------------------------------

export type EstadoDaEntrada = 'completa' | 'parcial' | 'sem_evidencia';
export type VeredictoDaEntrada = 'verdadeiro' | 'falso' | 'nao_confirmado';

export interface EntradaAvaliada {
  chave: string;
  /** A chave foi enviada nesta validação (pertence ao conjunto enviado). */
  esperada: boolean;
  ordemEnviada: number | null;
  n: CampoNumerico;
  nCorresponde: boolean;
  valid: VeredictoDaEntrada;
  sdk_cr: CampoNumerico;
  cr_diff: CampoNumerico;
  max_weight_diff: CampoNumerico;
  your_cr: CampoNumerico;
  estado: EstadoDaEntrada;
  /** Há resultado informado e estruturalmente válido para PESOS. */
  dimensaoPesos: boolean;
  /** Há resultado informado e estruturalmente válido para CR (sdk_cr e cr_diff). */
  dimensaoCR: boolean;
  motivos: string[];
}

export function avaliarEntrada(
  chave: string,
  bruto: unknown,
  ordemEnviada: number | null
): EntradaAvaliada {
  const r: Record<string, unknown> = ehObjeto(bruto) ? (bruto as Record<string, unknown>) : {};
  const n = avaliarNumero(r.n);
  const sdk_cr = avaliarNumero(r.sdk_cr);
  const cr_diff = avaliarNumero(r.cr_diff);
  const max_weight_diff = avaliarNumero(r.max_weight_diff);
  const your_cr = avaliarNumero(r.your_cr, { naoNegativo: true });
  const valid: VeredictoDaEntrada =
    r.valid === true ? 'verdadeiro' : r.valid === false ? 'falso' : 'nao_confirmado';
  const nCorresponde =
    ordemEnviada !== null &&
    n.estado === 'valido' &&
    Number.isInteger(n.valor) &&
    n.valor === ordemEnviada;

  const motivos: string[] = [];
  if (!ehObjeto(bruto)) motivos.push(`entrada: ${descrever(bruto)}, não é objeto`);
  if (ordemEnviada === null) {
    motivos.push('chave devolvida que não foi enviada: inesperada, sem cobertura');
  } else if (!nCorresponde) {
    motivos.push(
      n.estado === 'valido'
        ? `n = ${n.descricao}, divergente da ordem enviada (${ordemEnviada}): o serviço relatou sobre objeto de outra ordem`
        : `n: ${n.estado === 'ausente' ? 'ausente' : n.descricao}, não permite conferir a ordem enviada (${ordemEnviada})`
    );
  }
  const algumQuantitativo = [sdk_cr, cr_diff, max_weight_diff].some(c => c.estado === 'valido');
  if (ordemEnviada !== null && nCorresponde && !algumQuantitativo) {
    motivos.push('nenhum campo quantitativo finito (sdk_cr, cr_diff, max_weight_diff)');
  }

  let estado: EstadoDaEntrada;
  if (ordemEnviada === null || !nCorresponde || !algumQuantitativo) {
    estado = 'sem_evidencia';
  } else {
    const falhas: string[] = [];
    if (valid === 'nao_confirmado') falhas.push(`valid: ${descrever(r.valid)}, não é booleano explícito`);
    if (sdk_cr.estado !== 'valido') falhas.push(`sdk_cr: ${sdk_cr.estado === 'ausente' ? 'ausente' : sdk_cr.descricao}`);
    if (cr_diff.estado !== 'valido') falhas.push(`cr_diff: ${cr_diff.estado === 'ausente' ? 'ausente' : cr_diff.descricao}`);
    if (max_weight_diff.estado !== 'valido')
      falhas.push(`max_weight_diff: ${max_weight_diff.estado === 'ausente' ? 'ausente' : max_weight_diff.descricao}`);
    if (your_cr.estado === 'invalido') falhas.push(`your_cr: ${your_cr.descricao}, inválido no retorno`);
    estado = falhas.length === 0 ? 'completa' : 'parcial';
    motivos.push(...falhas);
  }

  return {
    chave,
    esperada: ordemEnviada !== null,
    ordemEnviada,
    n,
    nCorresponde,
    valid,
    sdk_cr,
    cr_diff,
    max_weight_diff,
    your_cr,
    estado,
    dimensaoPesos: nCorresponde && max_weight_diff.estado === 'valido',
    dimensaoCR:
      nCorresponde &&
      sdk_cr.estado === 'valido' &&
      cr_diff.estado === 'valido' &&
      your_cr.estado !== 'invalido',
    motivos,
  };
}

// ---------------------------------------------------------------------------------------------
// 6.4 Contradições exatas
// ---------------------------------------------------------------------------------------------

export interface LadoDaContradicao {
  fonte: string;
  valor: string;
}

export interface Contradicao {
  /** 1 a 5, conforme a numeração de 6.4. */
  codigo: 1 | 2 | 3 | 4 | 5;
  enunciado: string;
  /** Os DOIS valores e a fonte de cada um: a contradição não escolhe um deles em silêncio. */
  a: LadoDaContradicao;
  b: LadoDaContradicao;
}

const lista = (xs: string[]) => (xs.length ? `[${xs.join(', ')}]` : '[]');

// ---------------------------------------------------------------------------------------------
// Retorno inteiro
// ---------------------------------------------------------------------------------------------

export interface RetornoAvaliado {
  envelope: EnvelopeAvaliado;
  /** Chaves enviadas primeiro (na ordem do envio), depois as inesperadas. */
  entradas: EntradaAvaliada[];
  chavesEnviadas: string[];
  chavesDevolvidas: string[];
  /** Enviadas e não devolvidas. */
  chavesAusentes: string[];
  /** Devolvidas e não enviadas. */
  chavesInesperadas: string[];
  contradicoes: Contradicao[];
  /** Há ao menos uma entrada ENVIADA ao menos parcialmente utilizável. */
  haEntradaAproveitavel: boolean;
  /** Máximos das entradas aproveitáveis, calculados aqui, sem comparação com o resumo. */
  maximosDasEntradas: { pesos: number | null; cr: number | null };
}

export function avaliarRetorno(corpo: unknown, ordemEnviada: Record<string, number>): RetornoAvaliado {
  const envelope = avaliarEnvelope(corpo);
  const resultados: Record<string, unknown> = envelope.resultsObjeto
    ? ((corpo as Record<string, unknown>).results as Record<string, unknown>)
    : {};
  const chavesEnviadas = Object.keys(ordemEnviada);
  const chavesDevolvidas = Object.keys(resultados);
  const chavesAusentes = chavesEnviadas.filter(k => !chavesDevolvidas.includes(k));
  const chavesInesperadas = chavesDevolvidas.filter(k => !chavesEnviadas.includes(k));

  const entradas: EntradaAvaliada[] = [
    ...chavesEnviadas.filter(k => chavesDevolvidas.includes(k)),
    ...chavesInesperadas,
  ].map(k =>
    avaliarEntrada(
      k,
      resultados[k],
      Object.prototype.hasOwnProperty.call(ordemEnviada, k) ? ordemEnviada[k] : null
    )
  );

  // 6.4: as cinco comparações exatas
  const contradicoes: Contradicao[] = [];
  const mesmoConjunto =
    chavesAusentes.length === 0 && chavesInesperadas.length === 0;
  if (envelope.resultsObjeto && !mesmoConjunto) {
    contradicoes.push({
      codigo: 1,
      enunciado: 'o conjunto de chaves devolvidas difere do enviado',
      a: { fonte: 'chaves enviadas na requisição (matrices)', valor: lista(chavesEnviadas) },
      b: { fonte: 'chaves devolvidas em results (serviço)', valor: lista(chavesDevolvidas) },
    });
  }
  if (envelope.resultsObjeto && envelope.total_matrices.estado === 'valido' &&
      envelope.total_matrices.valor !== chavesDevolvidas.length) {
    contradicoes.push({
      codigo: 2,
      enunciado: 'summary.total_matrices difere do número de entradas',
      a: { fonte: 'summary.total_matrices (informado pelo serviço)', valor: String(envelope.total_matrices.valor) },
      b: { fonte: 'número de entradas em results (contado aqui)', valor: String(chavesDevolvidas.length) },
    });
  }
  const contagemValid = entradas.filter(e => e.valid === 'verdadeiro').length;
  if (envelope.resultsObjeto && envelope.valid_matrices.estado === 'valido' &&
      envelope.valid_matrices.valor !== contagemValid) {
    contradicoes.push({
      codigo: 3,
      enunciado: 'summary.valid_matrices difere da contagem de entradas com valid === true',
      a: { fonte: 'summary.valid_matrices (informado pelo serviço)', valor: String(envelope.valid_matrices.valor) },
      b: { fonte: 'entradas com valid === true (contadas aqui)', valor: String(contagemValid) },
    });
  }
  if (envelope.allValid.estado === 'booleano' && envelope.resultsObjeto) {
    const naoVerdadeiras = entradas.filter(e => e.valid !== 'verdadeiro').map(e => e.chave);
    if (envelope.allValid.valor === true && naoVerdadeiras.length > 0) {
      contradicoes.push({
        codigo: 4,
        enunciado: 'all_valid === true com entrada cujo valid não é true',
        a: { fonte: 'all_valid (informado pelo serviço)', valor: 'true' },
        b: { fonte: 'entradas com valid diferente de true (em results)', valor: lista(naoVerdadeiras) },
      });
    }
    if (envelope.allValid.valor === false && entradas.length > 0 && naoVerdadeiras.length === 0) {
      contradicoes.push({
        codigo: 5,
        enunciado: 'all_valid === false com todas as entradas válidas (valid === true)',
        a: { fonte: 'all_valid (informado pelo serviço)', valor: 'false' },
        b: { fonte: 'todas as entradas em results têm valid === true', valor: lista(entradas.map(e => e.chave)) },
      });
    }
  }

  const aproveitaveis = entradas.filter(e => e.esperada && e.estado !== 'sem_evidencia');
  const finitos = (pega: (e: EntradaAvaliada) => CampoNumerico) =>
    aproveitaveis.map(pega).filter(c => c.estado === 'valido').map(c => c.valor as number);
  const maximo = (xs: number[]) => (xs.length ? Math.max(...xs) : null);

  return {
    envelope,
    entradas,
    chavesEnviadas,
    chavesDevolvidas,
    chavesAusentes,
    chavesInesperadas,
    contradicoes,
    haEntradaAproveitavel: aproveitaveis.length > 0,
    maximosDasEntradas: {
      pesos: maximo(finitos(e => e.max_weight_diff)),
      cr: maximo(finitos(e => e.cr_diff)),
    },
  };
}
