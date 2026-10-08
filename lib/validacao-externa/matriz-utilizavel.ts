/**
 * lib/validacao-externa/matriz-utilizavel.ts
 *
 * O LADO DO ENVIO da validação externa (especificação da Fase 2, seções 4.2, 5 e 10):
 *
 *   1. a GUARDA dos seis critérios de "matriz utilizável", que devolve, por identidade, a matriz
 *      utilizável OU a razão nomeada do descarte;
 *   2. a decisão da ORIGEM das matrizes, em quatro condições (persistida completa, persistida
 *      parcial, presente e inválida, ausência total), com reconstrução SOMENTE na ausência total;
 *   3. o REGISTRO LOCAL da procedência do CR (presente e válido, ausente, presente e inválido),
 *      feito antes da substituição por zero, em TRÊS CAMADAS: o valor local, o efeito da coerção
 *      `|| 0` (substituiu ou preservou) e o que o corpo serializado da requisição carrega.
 *
 * Módulo puro: sem rede, sem Firestore. NÃO lê nem escreve documento algum de `calculations`; recebe
 * o objeto já carregado e devolve valores novos, sem alterá-lo.
 *
 * ⚠ PRESENÇA é EXISTÊNCIA DA CHAVE, conferida separadamente do valor. Chave existente com valor nulo é
 * presente e inválida (razão `valor_nulo`) e NUNCA abre a reconstrução. Contêiner (`aggregatedMatrices`
 * ou `subcriteria`) existente e nulo tem diagnóstico próprio (`conteiner_nulo`), e o malformado também
 * (`formato_inesperado`): nenhum dos dois é ausência, e nenhum abre a reconstrução. Contêiner válido mas
 * vazio não demonstra, sozinho, a existência de uma matriz. Ausência total exige que NENHUMA das seis
 * chaves de matriz exista e que nenhum contêiner esteja nulo ou malformado. `undefined` explícito conta
 * como valor nulo de chave existente (interpretação declarada: a existência é a da chave).
 *
 * ⚠ LIMITE DECLARADO: reciprocidade e diagonal unitária das matrizes NÃO são verificadas (escolha de
 * escopo da fase). A guarda afirma "utilizável por estes seis critérios", e nada além disso.
 *
 * ⚠ O VALOR ENVIADO COMO `your_cr` NÃO MUDA: continua `<cr bruto> || 0`, a expressão que o componente
 * já usava. O registro de procedência é local, e é ele que preserva a distinção entre zero medido,
 * ausência e invalidade, que a coerção para zero apaga no que o serviço recebe.
 *
 * ⚠ DOMÍNIO DEMONSTRADO EM QUE `prepararEnvio` NÃO LANÇA: documento de arranjos comuns, sem sobrescrita
 * dos métodos utilizados, e de objetos cujo acesso a propriedades não lança. Dentro dele, o que os testes
 * exercitam é o CR bruto BigInt, circular, função, símbolo, NaN, infinito, negativo e texto; BigInt,
 * circular, função e símbolo nos pesos, nas matrizes persistidas e nos contêineres; e a sobrescrita, uma de
 * cada vez, de métodos de objeto e de arranjo em cada objeto do documento (lista no teste). Isso é o que
 * está demonstrado, e nada além.
 * FICAM FORA do domínio, e NÃO são garantidos:
 *   - objetos exóticos cujo ACESSO a uma propriedade lança (Proxy ou acessor que lança);
 *   - arranjos e objetos com MÉTODO PRÓPRIO SOBRESCRITO, seja por função que lança, seja por valor NÃO
 *     CHAMÁVEL. O código chama `map` nos pesos do documento (`bocrWeights` e `subWeights`) ao reconstruir
 *     matrizes, e um `map` próprio que lança ou que não é função faz `prepararEnvio` lançar. Isso vale
 *     além do acesso a propriedade, que o item anterior já cobre.
 */

import {
  IDENTIDADES_ESPERADAS,
  MERITS,
  type IdentidadeEsperada,
  type IdentidadeId,
} from './conjunto-esperado';

// ---------------------------------------------------------------------------------------------
// Razões nomeadas do descarte
// ---------------------------------------------------------------------------------------------

export type RazaoDeDescarte =
  | 'chave_ausente'
  | 'json_invalido'
  | 'formato_inesperado'
  | 'nao_quadrada'
  | 'ordem_inesperada'
  | 'valor_nao_finito'
  | 'valor_nao_positivo'
  | 'itens_comprimento_divergente'
  | 'pesos_ausentes'
  | 'pesos_comprimento_divergente'
  | 'peso_nao_finito'
  | 'peso_nao_positivo'
  | 'sem_calculo'
  | 'nao_reconstruivel'
  | 'valor_nulo'
  | 'conteiner_nulo';

export const TEXTO_DA_RAZAO: Record<RazaoDeDescarte, string> = {
  chave_ausente: 'chave ausente no documento',
  valor_nulo: 'chave existente com valor nulo',
  conteiner_nulo: 'contêiner persistido existente com valor nulo',
  json_invalido: 'JSON inválido',
  formato_inesperado: 'não decodifica em arranjo de arranjos de números',
  nao_quadrada: 'matriz não quadrada',
  ordem_inesperada: 'ordem diferente da esperada para esta identidade',
  valor_nao_finito: 'valor não finito',
  valor_nao_positivo: 'valor não positivo',
  itens_comprimento_divergente: 'comprimento de items diferente da ordem',
  pesos_ausentes: 'pesos ausentes',
  pesos_comprimento_divergente: 'comprimento dos pesos diferente da ordem',
  peso_nao_finito: 'peso não finito',
  peso_nao_positivo: 'peso não positivo',
  sem_calculo: 'sem cálculo carregado',
  nao_reconstruivel: 'sem reconstrução para esta identidade',
};

export interface DescarteNomeado {
  id: IdentidadeId;
  rotulo: string;
  razao: RazaoDeDescarte;
  detalhe: string;
}

/** Um número descrito em texto; valor não finito nunca é impresso como `NaN` nem como `Infinity`. */
export function descreverNumero(v: number): string {
  if (Number.isFinite(v)) return String(v);
  return Number.isNaN(v) ? 'não numérico' : v > 0 ? 'infinito positivo' : 'infinito negativo';
}

/** Um valor qualquer descrito em texto curto, para os detalhes dos descartes. */
export function descreverValor(v: unknown): string {
  if (v === undefined) return 'ausente';
  if (v === null) return 'null';
  if (typeof v === 'number') return descreverNumero(v);
  if (typeof v === 'string') return JSON.stringify(v.length > 40 ? `${v.slice(0, 40)}…` : v);
  if (typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `arranjo de ${v.length}`;
  return typeof v;
}

// ---------------------------------------------------------------------------------------------
// A guarda dos seis critérios
// ---------------------------------------------------------------------------------------------

/**
 * Interface plana (e não união discriminada por booleano): o `tsconfig` do projeto é `strict: false`, e nesse
 * modo o TypeScript não estreita uniões discriminadas por `true`/`false`. `utilizavel` é a única fonte da
 * verdade: quando verdadeiro, `matriz` está presente; quando falso, `razao` e `detalhe` estão.
 */
export interface ResultadoDaGuarda {
  utilizavel: boolean;
  matriz?: number[][];
  razao?: RazaoDeDescarte;
  detalhe?: string;
}

/** Critério 6, isolado: comprimento e valores dos pesos. `null` quando os pesos servem. */
export function razaoDosPesos(
  pesos: unknown,
  ordem: number
): { razao: RazaoDeDescarte; detalhe: string } | null {
  if (!Array.isArray(pesos)) {
    return { razao: 'pesos_ausentes', detalhe: `pesos: ${descreverValor(pesos)}, não é arranjo` };
  }
  if (pesos.length !== ordem) {
    return {
      razao: 'pesos_comprimento_divergente',
      detalhe: `${pesos.length} pesos para ordem ${ordem}`,
    };
  }
  for (let i = 0; i < pesos.length; i++) {
    const w = pesos[i];
    if (w === undefined || w === null) {
      return { razao: 'pesos_ausentes', detalhe: `peso ${i + 1} ausente` };
    }
    if (typeof w !== 'number' || !Number.isFinite(w)) {
      return { razao: 'peso_nao_finito', detalhe: `peso ${i + 1} = ${descreverValor(w)}` };
    }
    if (w <= 0) {
      return { razao: 'peso_nao_positivo', detalhe: `peso ${i + 1} = ${descreverNumero(w)}` };
    }
  }
  return null;
}

/**
 * Os seis critérios, nesta ordem, parando no PRIMEIRO que falha (a razão devolvida é a desse):
 *   1. decodifica em arranjo de arranjos de números;
 *   2. é quadrada;
 *   3. a ordem corresponde à esperada;
 *   4. todas as entradas são finitas e positivas;
 *   5. `items` tem comprimento igual à ordem;
 *   6. `your_weights` tem comprimento igual à ordem e pesos finitos e positivos.
 */
export function guardaDosSeisCriterios(
  entrada: { matrizBruta: unknown; itens: unknown; pesos: unknown },
  ordemEsperada: number
): ResultadoDaGuarda {
  const { matrizBruta, itens, pesos } = entrada;

  // 1. decodificação
  let candidata: unknown = matrizBruta;
  if (typeof matrizBruta === 'string') {
    try {
      candidata = JSON.parse(matrizBruta);
    } catch (e: any) {
      return { utilizavel: false, razao: 'json_invalido', detalhe: String(e?.message ?? e) };
    }
  }
  if (!Array.isArray(candidata)) {
    return {
      utilizavel: false,
      razao: 'formato_inesperado',
      detalhe: `decodificou em ${descreverValor(candidata)}`,
    };
  }
  for (let i = 0; i < candidata.length; i++) {
    const linha = candidata[i];
    if (!Array.isArray(linha)) {
      return {
        utilizavel: false,
        razao: 'formato_inesperado',
        detalhe: `linha ${i + 1} é ${descreverValor(linha)}`,
      };
    }
    for (let j = 0; j < linha.length; j++) {
      if (typeof linha[j] !== 'number') {
        return {
          utilizavel: false,
          razao: 'formato_inesperado',
          detalhe: `entrada [${i + 1}][${j + 1}] é ${descreverValor(linha[j])}`,
        };
      }
    }
  }
  const matriz = candidata as number[][];

  // 2. quadrada
  for (let i = 0; i < matriz.length; i++) {
    if (matriz[i].length !== matriz.length) {
      return {
        utilizavel: false,
        razao: 'nao_quadrada',
        detalhe: `${matriz.length} linhas, mas a linha ${i + 1} tem ${matriz[i].length} colunas`,
      };
    }
  }

  // 3. ordem esperada
  if (matriz.length !== ordemEsperada) {
    return {
      utilizavel: false,
      razao: 'ordem_inesperada',
      detalhe: `ordem ${matriz.length}, esperada ${ordemEsperada}`,
    };
  }

  // 4. finitas e positivas
  for (let i = 0; i < matriz.length; i++) {
    for (let j = 0; j < matriz.length; j++) {
      if (!Number.isFinite(matriz[i][j])) {
        return {
          utilizavel: false,
          razao: 'valor_nao_finito',
          detalhe: `entrada [${i + 1}][${j + 1}] = ${descreverNumero(matriz[i][j])}`,
        };
      }
    }
  }
  for (let i = 0; i < matriz.length; i++) {
    for (let j = 0; j < matriz.length; j++) {
      if (!(matriz[i][j] > 0)) {
        return {
          utilizavel: false,
          razao: 'valor_nao_positivo',
          detalhe: `entrada [${i + 1}][${j + 1}] = ${descreverNumero(matriz[i][j])}`,
        };
      }
    }
  }

  // 5. items
  if (!Array.isArray(itens) || itens.length !== matriz.length) {
    return {
      utilizavel: false,
      razao: 'itens_comprimento_divergente',
      detalhe: `${Array.isArray(itens) ? itens.length : descreverValor(itens)} items para ordem ${matriz.length}`,
    };
  }

  // 6. pesos
  const defeitoDosPesos = razaoDosPesos(pesos, matriz.length);
  if (defeitoDosPesos) {
    return { utilizavel: false, razao: defeitoDosPesos.razao, detalhe: defeitoDosPesos.detalhe };
  }

  return { utilizavel: true, matriz };
}

// ---------------------------------------------------------------------------------------------
// Procedência do CR (seção 10): três estados, mutuamente exclusivos e exaustivos
// ---------------------------------------------------------------------------------------------

export type EstadoDoCR = 'presente_valido' | 'ausente' | 'presente_invalido';

/** Camada 2: o que a coerção `<bruto> || 0` fez com o valor local. */
export type EfeitoDaCoercao = 'substituido' | 'preservado';

/**
 * Camada 3: o que o JSON da requisição carrega no campo `your_cr`.
 *  - `gerada`: o campo vai no corpo, com o JSON de `enviadoJson` (infinito vira `null`);
 *  - `omitida`: função ou símbolo; a serialização termina normalmente e a chave NÃO vai no corpo;
 *  - `falha`: BigInt ou estrutura circular; a serialização lança e o corpo NÃO é gerado.
 */
export type SerializacaoDoCampo = 'gerada' | 'omitida' | 'falha';

export interface ProcedenciaDoCR {
  estado: EstadoDoCR;
  /** O valor local, quando presente e válido (zero finito incluído). */
  valorLocal: number | null;
  /** O que o campo continha, em texto. */
  descricao: string;
  /** Camada 2: a coerção `|| 0` trocou o valor por zero (`substituido`) ou o manteve (`preservado`). */
  coercao: EfeitoDaCoercao;
  /** O resultado da coerção: o que o objeto da requisição recebe. É `<bruto> || 0`, preservado. */
  enviado: unknown;
  /** Camada 3: a serialização do campo. */
  serializacao: SerializacaoDoCampo;
  /** O JSON do campo quando `serializacao === 'gerada'`; `null` quando omitido ou quando a geração falhou. */
  enviadoJson: string | null;
  /** A primeira linha da mensagem do erro, quando `serializacao === 'falha'`; `null` nos demais casos. */
  erroDeSerializacao: string | null;
}

/** A primeira linha da mensagem de um erro, limitada, para exibição em tela. */
export function mensagemDoErro(err: unknown): string {
  let texto: string;
  try {
    texto = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : String(err);
  } catch {
    texto = 'erro sem mensagem legível';
  }
  const linha = texto.split('\n')[0];
  return linha.length > 160 ? `${linha.slice(0, 160)}…` : linha;
}

/** Serializa o campo `your_cr` como o objeto da requisição o faria, sem nunca lançar. */
function serializarCampo(enviado: unknown): Pick<ProcedenciaDoCR, 'serializacao' | 'enviadoJson' | 'erroDeSerializacao'> {
  try {
    const lido = JSON.parse(JSON.stringify({ your_cr: enviado }));
    if (!Object.prototype.hasOwnProperty.call(lido, 'your_cr')) {
      return { serializacao: 'omitida', enviadoJson: null, erroDeSerializacao: null };
    }
    return { serializacao: 'gerada', enviadoJson: JSON.stringify(lido.your_cr), erroDeSerializacao: null };
  } catch (err) {
    return { serializacao: 'falha', enviadoJson: null, erroDeSerializacao: mensagemDoErro(err) };
  }
}

/**
 * Classifica o CR local ANTES da substituição:
 *  - presente e válido: número finito e não negativo, inclusive zero;
 *  - ausente: campo inexistente, `undefined` ou `null`;
 *  - presente e inválido: qualquer outro valor (negativo, NaN, infinito, tipo incorreto).
 *
 * E registra as outras duas camadas, que NÃO se confundem com o estado do valor local:
 *  - a coerção `|| 0` SUBSTITUI todo valor falsy exceto o próprio zero (ausente, `null`, NaN, `false`,
 *    texto vazio) e PRESERVA o resto (negativo, infinito, texto não vazio, objeto). Zero finito não é
 *    substituído: `0 || 0` não muda nada, e o CR medido igual a zero é presente e válido;
 *  - o corpo serializado carrega o que o JSON representa: infinito vira `null`, função e símbolo são
 *    omitidos, BigInt e estrutura circular fazem a geração do corpo FALHAR. `NaN` não chega aqui como
 *    `null`: a coerção já o trocou por 0 antes da serialização.
 */
export function registrarProcedenciaDoCR(bruto: unknown): ProcedenciaDoCR {
  const coercao: EfeitoDaCoercao = !bruto && bruto !== 0 ? 'substituido' : 'preservado';
  const enviado = (bruto as any) || 0;
  const campo = serializarCampo(enviado);
  if (bruto === undefined || bruto === null) {
    return { estado: 'ausente', valorLocal: null, descricao: 'campo ausente', coercao, enviado, ...campo };
  }
  if (typeof bruto === 'number' && Number.isFinite(bruto) && bruto >= 0) {
    return { estado: 'presente_valido', valorLocal: bruto, descricao: String(bruto), coercao, enviado, ...campo };
  }
  return {
    estado: 'presente_invalido',
    valorLocal: null,
    descricao: `${descreverValor(bruto)}${typeof bruto === 'number' && Number.isFinite(bruto) && bruto < 0 ? ' (negativo)' : ''}`,
    coercao,
    enviado,
    ...campo,
  };
}

// ---------------------------------------------------------------------------------------------
// Origem das matrizes e montagem do envio
// ---------------------------------------------------------------------------------------------

export type CondicaoDasMatrizes =
  | 'sem_calculo'
  | 'persistida_completa'
  | 'persistida_parcial'
  | 'presente_invalida'
  | 'ausencia_total';

export type MotivoDeNaoEnvio =
  | 'sem_calculo'
  | 'ausencia_total_sem_pesos'
  | 'reconstrucao_sem_matriz_utilizavel';

/** O objeto de uma matriz no corpo da requisição ao serviço (forma preservada). */
export interface EntradaDeEnvio {
  matrix: number[][];
  items: string[];
  your_weights: number[];
  your_cr: number;
}

export interface Envio {
  condicao: CondicaoDasMatrizes;
  /** Verdadeiro SOMENTE na ausência total, com ao menos uma matriz reconstruída utilizável. */
  reconstruida: boolean;
  /** O corpo `matrices` da requisição: só matrizes utilizáveis, por rótulo. */
  matrices: Record<string, EntradaDeEnvio>;
  /** Identidades enviadas, na ordem do conjunto esperado. */
  enviadas: IdentidadeId[];
  /** Identidades NÃO enviadas, com a razão de cada uma. */
  descartes: DescarteNomeado[];
  /** Chaves persistidas presentes que não pertencem ao conjunto esperado (ignoradas, mas presentes). */
  inesperadas: string[];
  /** Procedência local do CR, por identidade enviada. */
  procedenciaCR: Partial<Record<IdentidadeId, ProcedenciaDoCR>>;
  motivoDeNaoEnvio: MotivoDeNaoEnvio | null;
  /** Ordem de cada matriz enviada, por rótulo (para conferir o `n` devolvido). */
  ordemEnviada: Record<string, number>;
}

export function haEnvio(envio: Envio): boolean {
  return Object.keys(envio.matrices).length > 0;
}

function crBrutoDe(id: IdentidadeId, calculation: any): unknown {
  if (id === 'bocr') return calculation?.bocrConsistency?.cr;
  if (id === 'magnitude') return calculation?.magnitudeConsistency?.cr;
  return calculation?.subConsistency?.[id.slice(4)]?.cr;
}

function pesosBrutosDe(id: IdentidadeId, calculation: any): unknown {
  if (id === 'bocr') return calculation?.bocrWeights;
  if (id === 'magnitude') {
    const rw = calculation?.rescalingWeights;
    if (rw === undefined || rw === null) return undefined;
    return [rw.sb, rw.so, rw.sc, rw.sr];
  }
  return calculation?.subWeights?.[id.slice(4)];
}

interface Persistida {
  /** A CHAVE da matriz existe no contêiner. Existência, e NÃO validade do valor. */
  existe: boolean;
  bruto: unknown;
  /**
   * Descarte já decidido, sem passar pela guarda: o valor da chave é nulo, ou o contêiner existe e é
   * nulo ou malformado. Em qualquer dos casos a identidade conta como PRESENTE (não abre reconstrução).
   */
  descarte?: { razao: RazaoDeDescarte; detalhe: string };
}

/** Existência da chave própria. Primitivos e `null` não têm chaves. */
function temChave(objeto: unknown, chave: string): boolean {
  return objeto !== null && typeof objeto === 'object' && Object.prototype.hasOwnProperty.call(objeto, chave);
}

const nomeDoNulo = (v: unknown) => (v === null ? 'null' : 'undefined');

/** Contêiner EXISTENTE: nulo e malformado têm diagnóstico próprio; o objeto válido (mesmo vazio) não tem. */
function diagnosticoDoConteiner(nome: string, v: unknown): Persistida['descarte'] | null {
  if (v === null || v === undefined) {
    return { razao: 'conteiner_nulo', detalhe: `${nome} existe com valor ${nomeDoNulo(v)}` };
  }
  if (typeof v !== 'object' || Array.isArray(v)) {
    return { razao: 'formato_inesperado', detalhe: `${nome} não é objeto` };
  }
  return null;
}

function persistidaDaChave(conteiner: any, chave: string): Persistida {
  if (!temChave(conteiner, chave)) return { existe: false, bruto: undefined };
  const v = conteiner[chave];
  if (v === null || v === undefined) {
    return {
      existe: true,
      bruto: v,
      descarte: { razao: 'valor_nulo', detalhe: `chave ${chave} existe com valor ${nomeDoNulo(v)}` },
    };
  }
  return { existe: true, bruto: v };
}

function persistidaDe(id: IdentidadeId, calculation: any): Persistida {
  if (!temChave(calculation, 'aggregatedMatrices')) return { existe: false, bruto: undefined };
  const agg = calculation.aggregatedMatrices;
  const doAgg = diagnosticoDoConteiner('aggregatedMatrices', agg);
  if (doAgg) return { existe: true, bruto: agg, descarte: doAgg };
  if (id === 'bocr' || id === 'magnitude') return persistidaDaChave(agg, id);
  if (!temChave(agg, 'subcriteria')) return { existe: false, bruto: undefined };
  const sub = agg.subcriteria;
  const doSub = diagnosticoDoConteiner('subcriteria', sub);
  if (doSub) return { existe: true, bruto: sub, descarte: doSub };
  return persistidaDaChave(sub, id.slice(4));
}

function chavesInesperadasDe(calculation: any): string[] {
  const sub = calculation?.aggregatedMatrices?.subcriteria;
  if (sub === undefined || sub === null || typeof sub !== 'object' || Array.isArray(sub)) return [];
  return Object.keys(sub).filter(
    k => !(MERITS as readonly string[]).includes(k) && sub[k] !== undefined && sub[k] !== null
  );
}

function montarEntrada(
  identidade: IdentidadeEsperada,
  matriz: number[][],
  pesos: unknown,
  calculation: any
): EntradaDeEnvio {
  return {
    matrix: matriz,
    items: [...identidade.itens],
    your_weights: pesos as number[],
    // ⚠ A expressão que o componente já usava, preservada: o valor ENVIADO não muda.
    your_cr: crBrutoDe(identidade.id, calculation) || 0,
  } as EntradaDeEnvio;
}

function vazio(condicao: CondicaoDasMatrizes, motivo: MotivoDeNaoEnvio | null): Envio {
  return {
    condicao,
    reconstruida: false,
    matrices: {},
    enviadas: [],
    descartes: [],
    inesperadas: [],
    procedenciaCR: {},
    motivoDeNaoEnvio: motivo,
    ordemEnviada: {},
  };
}

/**
 * Decide a origem e monta o corpo `matrices` da requisição.
 *
 *  - Persistida completa:  as seis utilizáveis.
 *  - Persistida parcial:   ao menos uma utilizável, nem todas. Envia as utilizáveis, NOMEIA as demais
 *                          e a razão de cada uma. SEM reconstrução.
 *  - Presente e inválida:  ao menos uma chave persistida EXISTENTE (valor nulo incluído) ou um contêiner
 *                          existente e nulo ou malformado, e NENHUMA matriz utilizável. Nada é enviado
 *                          e NADA é reconstruído (diagnóstico de invalidade).
 *  - Ausência total:       nenhuma das seis chaves de matriz existe e nenhum contêiner está nulo ou
 *                          malformado. ÚNICA condição com reconstrução, e só se os pesos permitirem.
 *
 * Não lança no domínio demonstrado no cabeçalho do arquivo.
 */
export function prepararEnvio(calculation: any): Envio {
  if (!calculation) {
    const e = vazio('sem_calculo', 'sem_calculo');
    e.descartes = IDENTIDADES_ESPERADAS.map(i => ({
      id: i.id,
      rotulo: i.rotulo,
      razao: 'sem_calculo' as RazaoDeDescarte,
      detalhe: 'nenhum cálculo carregado',
    }));
    return e;
  }

  const inesperadas = chavesInesperadasDe(calculation);
  const matrices: Record<string, EntradaDeEnvio> = {};
  const enviadas: IdentidadeId[] = [];
  const descartes: DescarteNomeado[] = [];
  const procedenciaCR: Partial<Record<IdentidadeId, ProcedenciaDoCR>> = {};
  const ordemEnviada: Record<string, number> = {};
  let presentes = inesperadas.length;

  for (const identidade of IDENTIDADES_ESPERADAS) {
    const p = persistidaDe(identidade.id, calculation);
    if (!p.existe) {
      descartes.push({
        id: identidade.id,
        rotulo: identidade.rotulo,
        razao: 'chave_ausente',
        detalhe: 'sem matriz persistida para esta identidade',
      });
      continue;
    }
    presentes++;
    if (p.descarte) {
      descartes.push({
        id: identidade.id,
        rotulo: identidade.rotulo,
        razao: p.descarte.razao,
        detalhe: p.descarte.detalhe,
      });
      continue;
    }
    const pesos = pesosBrutosDe(identidade.id, calculation);
    const g = guardaDosSeisCriterios(
      { matrizBruta: p.bruto, itens: identidade.itens, pesos },
      identidade.ordem
    );
    if (!g.utilizavel) {
      descartes.push({
        id: identidade.id,
        rotulo: identidade.rotulo,
        razao: g.razao as RazaoDeDescarte,
        detalhe: g.detalhe as string,
      });
      continue;
    }
    matrices[identidade.rotulo] = montarEntrada(identidade, g.matriz as number[][], pesos, calculation);
    enviadas.push(identidade.id);
    ordemEnviada[identidade.rotulo] = identidade.ordem;
    procedenciaCR[identidade.id] = registrarProcedenciaDoCR(crBrutoDe(identidade.id, calculation));
  }

  if (presentes > 0) {
    const condicao: CondicaoDasMatrizes =
      enviadas.length === 0
        ? 'presente_invalida'
        : enviadas.length === IDENTIDADES_ESPERADAS.length
          ? 'persistida_completa'
          : 'persistida_parcial';
    return {
      condicao,
      reconstruida: false,
      matrices,
      enviadas,
      descartes,
      inesperadas,
      procedenciaCR,
      motivoDeNaoEnvio: null,
      ordemEnviada,
    };
  }

  return reconstruir(calculation);
}

/** Ausência total: reconstrução das razões entre pesos, SOMENTE para bocr e os quatro subcritérios. */
function reconstruir(calculation: any): Envio {
  const matrices: Record<string, EntradaDeEnvio> = {};
  const enviadas: IdentidadeId[] = [];
  const descartes: DescarteNomeado[] = [];
  const procedenciaCR: Partial<Record<IdentidadeId, ProcedenciaDoCR>> = {};
  const ordemEnviada: Record<string, number> = {};
  let houveCandidata = false;

  for (const identidade of IDENTIDADES_ESPERADAS) {
    if (identidade.id === 'magnitude') {
      descartes.push({
        id: identidade.id,
        rotulo: identidade.rotulo,
        razao: 'nao_reconstruivel',
        detalhe: 'não há ramo de reconstrução para a magnitude',
      });
      continue;
    }
    const pesos = pesosBrutosDe(identidade.id, calculation);
    if (pesos === undefined || pesos === null) {
      descartes.push({
        id: identidade.id,
        rotulo: identidade.rotulo,
        razao: 'chave_ausente',
        detalhe: 'sem matriz persistida e sem pesos para reconstruir',
      });
      continue;
    }
    houveCandidata = true;
    const defeito = razaoDosPesos(pesos, identidade.ordem);
    if (defeito) {
      descartes.push({
        id: identidade.id,
        rotulo: identidade.rotulo,
        razao: defeito.razao,
        detalhe: `reconstrução: ${defeito.detalhe}`,
      });
      continue;
    }
    const w = pesos as number[];
    const matriz = w.map(wi => w.map(wj => wi / wj));
    const g = guardaDosSeisCriterios(
      { matrizBruta: matriz, itens: identidade.itens, pesos: w },
      identidade.ordem
    );
    if (!g.utilizavel) {
      descartes.push({
        id: identidade.id,
        rotulo: identidade.rotulo,
        razao: g.razao as RazaoDeDescarte,
        detalhe: `reconstrução: ${g.detalhe}`,
      });
      continue;
    }
    matrices[identidade.rotulo] = montarEntrada(identidade, g.matriz as number[][], w, calculation);
    enviadas.push(identidade.id);
    ordemEnviada[identidade.rotulo] = identidade.ordem;
    procedenciaCR[identidade.id] = registrarProcedenciaDoCR(crBrutoDe(identidade.id, calculation));
  }

  if (enviadas.length === 0) {
    return {
      condicao: 'ausencia_total',
      reconstruida: false,
      matrices: {},
      enviadas: [],
      descartes,
      inesperadas: [],
      procedenciaCR: {},
      motivoDeNaoEnvio: houveCandidata
        ? 'reconstrucao_sem_matriz_utilizavel'
        : 'ausencia_total_sem_pesos',
      ordemEnviada: {},
    };
  }

  return {
    condicao: 'ausencia_total',
    reconstruida: true,
    matrices,
    enviadas,
    descartes,
    inesperadas: [],
    procedenciaCR,
    motivoDeNaoEnvio: null,
    ordemEnviada,
  };
}
