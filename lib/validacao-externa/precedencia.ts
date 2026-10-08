/**
 * lib/validacao-externa/precedencia.ts
 *
 * A MÁQUINA DE ESTADOS P1 a P9 da validação externa (especificação da Fase 2, seção 7). Recebe o envio
 * (`prepararEnvio`) e a resposta obtida, e devolve a APRESENTAÇÃO: manchete, as TRÊS PROPRIEDADES sempre
 * nomeadas (cobertura, resultado informado e veredito), a presença do selo e os detalhes. O componente
 * só apresenta o que este módulo devolve.
 *
 * A manchete é a PRIMEIRA condição aplicável desta ordem:
 *
 *   P1  matrizes persistidas presentes e nenhuma utilizável
 *   P2  nada enviado por outro motivo
 *   P3  nenhuma resposta obtida (exceção, ou status não-OK)
 *   P4  resposta sem nenhuma entrada ao menos parcialmente utilizável
 *   P5  envelope inválido, `all_valid` não booleano, ou contradição exata de 6.4
 *   P6  origem reconstruída (só na ausência total)
 *   P7  cobertura incompleta, ou entrada sem resultado utilizável, com origem persistida
 *   P8  aprovação relatada pelo serviço  <- ÚNICA condição com selo
 *   P9  reprovação relatada pelo serviço
 *
 * ⚠ O SELO (rótulo, ícone e cor do bloco de veredito) existe somente em P8. Reprovação existe somente em
 * P9: um `false` recebido em P4 a P7 NÃO é reprovação.
 *
 * ⚠ Nenhum texto daqui afirma que o serviço EXECUTOU a comparação, nem precisão da implementação. O que
 * se afirma é "resultado informado pelo serviço", atribuído a ele.
 *
 * ⚠ Nenhum texto daqui prescreve ação sobre os dados do projeto.
 *
 * ⚠ LIMITE DE EXIBIÇÃO NÃO É INVALIDADE. Um número finito cujo produto por 100 deixa de ser finito aparece
 * como "magnitude fora da faixa de exibição", sem cor e sem avaliação visual. O campo continua válido pelo
 * contrato, continua contando como resultado informado e NÃO muda, por isso, a classificação P1 a P9.
 *
 * Módulo puro. A única função com E/S é `executarValidacao`, e o `fetch` é INJETADO, de modo que a
 * orquestração seja testável sem rede. `executarValidacao` não lança no domínio demonstrado em
 * `matriz-utilizavel.ts`, e o erro lançado por `buscar` ou pela serialização do corpo vira P3 com a origem
 * dita como tal, seja qual for o tipo do erro (inclusive objeto sem `toString`). A falha de serialização
 * não afirma que algo foi enviado. EXCLUSÃO: `text()` deve resolver em string (contrato de `RespostaHttp`);
 * isso NÃO é verificado aqui, e uma resposta não-OK cujo `text()` devolva um objeto de conversão que lança
 * faz a orquestração lançar.
 */

import {
  TOTAL_DE_IDENTIDADES,
  DECLARACAO_DO_CONJUNTO,
  identidadePorId,
  identidadePorRotulo,
} from './conjunto-esperado';
import {
  avaliarRetorno,
  type Contradicao,
  type EntradaAvaliada,
  type RetornoAvaliado,
} from './contrato-retorno';
import {
  haEnvio,
  mensagemDoErro,
  prepararEnvio,
  TEXTO_DA_RAZAO,
  type Envio,
  type ProcedenciaDoCR,
} from './matriz-utilizavel';

// ---------------------------------------------------------------------------------------------
// Tipos da apresentação
// ---------------------------------------------------------------------------------------------

export type CodigoDeEstado = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8' | 'P9';
export type Tom = 'neutro' | 'aviso' | 'erro' | 'reprovado' | 'aprovado';
export type FaixaVisual = 'verde' | 'azul' | 'ambar';

/**
 * Os limiares de cor da tabela são CRITÉRIO VISUAL desta tela. NÃO são tolerância do serviço (que não é
 * informada) e NÃO são veredito.
 */
export const LIMIARES_VISUAIS = { verde: 0.001, azul: 0.01 } as const;

export interface Propriedade {
  nome: 'Cobertura' | 'Resultado informado' | 'Veredito';
  situacao: string;
  detalhes: string[];
}

export interface Celula {
  texto: string;
  avaliado: boolean;
  faixa?: FaixaVisual;
  nota?: string;
}

export interface LinhaDaTabela {
  chave: string;
  n: string;
  crSistema: Celula;
  crServico: Celula;
  deltaCR: Celula;
  deltaPesos: Celula;
  veredito: { texto: string; valor: 'sim' | 'nao' | 'nao_confirmado' };
  notas: string[];
}

export interface DescricaoDaOrigem {
  rotulo: string;
  descricao: string;
  detalhes: string[];
}

export interface Apresentacao {
  codigo: CodigoDeEstado;
  manchete: string;
  descricao: string;
  tom: Tom;
  /** Verdadeiro SOMENTE em P8. */
  selo: boolean;
  origem: DescricaoDaOrigem;
  /** Sempre as três, nesta ordem, em todos os nove estados. */
  propriedades: [Propriedade, Propriedade, Propriedade];
  causas: string[];
  contradicoes: Contradicao[];
  linhas: LinhaDaTabela[];
  semEvidencia: { chave: string; motivos: string[] }[];
  maximos: {
    resumoPesos: string;
    resumoCR: string;
    entradasPesos: string;
    entradasCR: string;
  } | null;
  resumoDoServico: string[] | null;
  pontosDeAtencao: string[] | null;
  biblioteca: string | null;
  notas: string[];
}

// ---------------------------------------------------------------------------------------------
// Resposta obtida
// ---------------------------------------------------------------------------------------------

export interface OrigemDaFalha {
  /** `serializacao`: o corpo da requisição NÃO foi gerado, e portanto nada foi enviado ao serviço. */
  natureza: 'status_http' | 'excecao' | 'corpo_ilegivel' | 'serializacao';
  status?: number;
  erro?: string;
  detalhes?: string;
  detalhesTruncado?: boolean;
}

export type RespostaObtida =
  | { tipo: 'falha'; origem: OrigemDaFalha }
  | { tipo: 'corpo'; corpo: unknown };

const LIMITE_DOS_DETALHES = 300;

/** A origem de uma resposta não-OK: o status e, quando a rota os devolveu, `error` e `details`. */
export function origemDaFalhaHttp(status: number, textoDoCorpo: string): OrigemDaFalha {
  const origem: OrigemDaFalha = { natureza: 'status_http', status };
  let detalhes: string | undefined;
  try {
    const j = JSON.parse(textoDoCorpo);
    if (j !== null && typeof j === 'object' && !Array.isArray(j)) {
      if (typeof j.error === 'string') origem.erro = j.error;
      if (typeof j.details === 'string') detalhes = j.details;
    } else if (textoDoCorpo) {
      detalhes = textoDoCorpo;
    }
  } catch {
    if (textoDoCorpo) detalhes = textoDoCorpo;
  }
  if (detalhes !== undefined) {
    origem.detalhesTruncado = detalhes.length > LIMITE_DOS_DETALHES;
    origem.detalhes = origem.detalhesTruncado ? detalhes.slice(0, LIMITE_DOS_DETALHES) : detalhes;
  }
  return origem;
}

/**
 * ⚠ NENHUMA conversão de `err` fora de proteção. O erro lançado pode ser qualquer coisa, inclusive um objeto
 * sem `toString` (`Object.create(null)`) ou um `message` cuja conversão lança; esta função roda DENTRO do
 * tratamento de uma falha, e uma conversão sem proteção aqui faria o tratamento lançar de novo. Por isso toda
 * natureza passa por `mensagemDoErro`, que protege, trunca e tem o caso de erro sem mensagem legível.
 */
export function origemDaExcecao(
  err: unknown,
  natureza: 'excecao' | 'corpo_ilegivel' | 'serializacao' = 'excecao'
): OrigemDaFalha {
  return { natureza, erro: mensagemDoErro(err) };
}

function textoDaOrigemDaFalha(o: OrigemDaFalha): string {
  if (o.natureza === 'status_http') {
    return (
      `O serviço respondeu com status HTTP ${o.status}.` +
      (o.erro ? ` Erro informado: ${o.erro}.` : '') +
      (o.detalhes ? ` Detalhes informados: ${o.detalhes}${o.detalhesTruncado ? '… (truncado)' : ''}` : '')
    );
  }
  if (o.natureza === 'corpo_ilegivel') {
    return `A resposta foi recebida, mas o corpo não pôde ser lido como JSON: ${o.erro ?? 'sem mensagem'}.`;
  }
  if (o.natureza === 'serializacao') {
    return `Falha de serialização: o corpo da requisição não pôde ser gerado (${o.erro ?? 'sem mensagem'}). Nada foi enviado ao serviço.`;
  }
  return `A chamada falhou antes de haver resposta: ${o.erro ?? 'sem mensagem'}.`;
}

// ---------------------------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------------------------

const NAO_AVALIADO = 'não avaliado';
export const TEXTO_FORA_DA_FAIXA = 'magnitude fora da faixa de exibição';

/**
 * Percentual para exibição. A multiplicação por 100 ocorre ANTES da formatação, então a finitude que
 * importa é a do PRODUTO: um número finito suficientemente grande transborda e `toFixed` devolveria
 * "Infinity". Produto não finito vira o texto de magnitude fora da faixa, e `exibivel` é falso.
 */
function percentual(v: number, casas: number): { texto: string; exibivel: boolean } {
  const p = v * 100;
  return Number.isFinite(p)
    ? { texto: `${p.toFixed(casas)}%`, exibivel: true }
    : { texto: TEXTO_FORA_DA_FAIXA, exibivel: false };
}

function faixaDe(v: number): FaixaVisual {
  return v < LIMIARES_VISUAIS.verde ? 'verde' : v < LIMIARES_VISUAIS.azul ? 'azul' : 'ambar';
}

/**
 * A célula de um número finito já validado pelo contrato. Fora da faixa de exibição a célula não tem
 * cor nem avaliação visual, e a nota registra que o valor é finito e foi informado.
 */
function celulaPercentual(
  v: number,
  casas: number,
  opcoes: { avaliavel: boolean; comFaixa: boolean; nota?: string }
): Celula {
  const p = percentual(v, casas);
  if (!p.exibivel) {
    const aviso = `valor finito informado pelo serviço (${v}), cujo produto por 100 não é finito`;
    return { texto: p.texto, avaliado: false, nota: opcoes.nota ? `${opcoes.nota}; ${aviso}` : aviso };
  }
  const celula: Celula = { texto: p.texto, avaliado: opcoes.avaliavel };
  if (opcoes.comFaixa && opcoes.avaliavel) celula.faixa = faixaDe(v);
  if (opcoes.nota) celula.nota = opcoes.nota;
  return celula;
}

const rotulos = (envio: Envio) => envio.enviadas.map(id => identidadePorId(id).rotulo);

// ---------------------------------------------------------------------------------------------
// Origem (M3: aparece em todos os blocos que descrevem o resultado)
// ---------------------------------------------------------------------------------------------

function detalhesDosDescartes(envio: Envio): string[] {
  return envio.descartes.map(d => `${d.rotulo}: ${TEXTO_DA_RAZAO[d.razao]} (${d.detalhe})`);
}

export function descreverOrigem(envio: Envio): DescricaoDaOrigem {
  const detalhes = detalhesDosDescartes(envio);
  const extras = envio.inesperadas.length
    ? [`Chaves persistidas fora do conjunto esperado (ignoradas): ${envio.inesperadas.join(', ')}`]
    : [];
  switch (envio.condicao) {
    case 'sem_calculo':
      return {
        rotulo: 'Sem cálculo carregado',
        descricao: 'Nenhum cálculo está carregado nesta tela; não há matrizes.',
        detalhes,
      };
    case 'persistida_completa':
      return {
        rotulo: 'Matrizes persistidas, completas',
        descricao:
          'As seis matrizes agregadas persistidas (BOCR, magnitude e subcritérios B, O, C e R) são utilizáveis e foram enviadas. São as matrizes gravadas no cálculo pelo produtor.',
        detalhes: [...detalhes, ...extras],
      };
    case 'persistida_parcial':
      return {
        rotulo: 'Matrizes persistidas, parciais',
        descricao: `${envio.enviadas.length} das ${TOTAL_DE_IDENTIDADES} matrizes persistidas são utilizáveis e foram enviadas. As demais foram descartadas, com a razão de cada uma abaixo. Não houve reconstrução.`,
        detalhes: [...detalhes, ...extras],
      };
    case 'presente_invalida':
      return {
        rotulo: 'Matrizes persistidas presentes e inválidas',
        descricao:
          'O cálculo traz chaves de matrizes persistidas (inclusive com valor ou contêiner nulo), mas nenhuma matriz é utilizável. Nada foi enviado e nada foi reconstruído em substituição.',
        detalhes: [...detalhes, ...extras],
      };
    default:
      return envio.reconstruida
        ? {
            rotulo: 'Matrizes reconstruídas dos pesos',
            descricao:
              'O cálculo não traz matrizes persistidas. As matrizes enviadas foram reconstruídas como razões entre pesos (peso i dividido por peso j). Não são as matrizes de julgamentos agregados do painel. Nessa construção, a concordância dos pesos é esperada por ela mesma e não é evidência sobre os julgamentos originais.',
            detalhes,
          }
        : {
            rotulo: 'Sem matrizes persistidas e sem reconstrução possível',
            descricao: 'O cálculo não traz matrizes persistidas e os pesos disponíveis não produziram nenhuma matriz utilizável.',
            detalhes,
          };
  }
}

// ---------------------------------------------------------------------------------------------
// Peças de apresentação
// ---------------------------------------------------------------------------------------------

function notasDaTabela(): string[] {
  return [
    'Tolerância aplicada pelo serviço: não informada. As cores da tabela usam os limiares de 0,1% e de 1% como critério visual desta tela; não são tolerância nem veredito.',
    'Campos presentes, finitos e correspondentes mostram retorno estruturalmente válido e resultado informado pelo serviço. Não mostram que o serviço executou a comparação; o significado dos campos do serviço não é verificável aqui.',
    'Reciprocidade e diagonal unitária das matrizes enviadas não foram verificadas.',
    DECLARACAO_DO_CONJUNTO,
  ];
}

const procedenciaDe = (envio: Envio, chave: string) => {
  const id = identidadePorRotulo(chave)?.id;
  return id ? envio.procedenciaCR[id] ?? null : null;
};

/** O CR tem resultado utilizável quando o retorno é completo para CR E o CR local é presente e válido. */
function crUtilizavel(e: EntradaAvaliada, envio: Envio): boolean {
  return e.dimensaoCR && procedenciaDe(envio, e.chave)?.estado === 'presente_valido';
}

/**
 * O que o corpo da requisição carrega no campo `your_cr` (a camada 3 do CR local). Nunca afirma que o
 * serviço recebeu um JSON que não foi gerado.
 */
function oQueOCorpoCarrega(proc: ProcedenciaDoCR): string {
  if (proc.serializacao === 'gerada') {
    const infinito = typeof proc.enviado === 'number' && !Number.isFinite(proc.enviado);
    return `o corpo da requisição carrega ${proc.enviadoJson}${infinito ? ' (o JSON não representa infinito)' : ''}`;
  }
  if (proc.serializacao === 'omitida') return 'o campo your_cr foi omitido do corpo da requisição';
  return `falha de serialização (${proc.erroDeSerializacao}): o corpo da requisição não foi gerado`;
}

/**
 * A nota do CR local ausente ou inválido, nas TRÊS camadas e nesta ordem: o estado do valor local; o
 * efeito da coerção `|| 0` (substituiu ou preservou); e o que o corpo serializado carrega. Só a segunda
 * camada pode dizer "valor substituto", e só quando a coerção de fato trocou o valor.
 */
function notaDoCRLocal(proc: ProcedenciaDoCR): string {
  const local = proc.estado === 'ausente' ? 'CR local ausente' : `CR local inválido (${proc.descricao})`;
  const coercao =
    proc.coercao === 'substituido'
      ? 'a coerção (|| 0) substituiu o valor: o valor substituto é 0'
      : 'a coerção (|| 0) preservou o valor';
  return `${local}; ${coercao}; ${oQueOCorpoCarrega(proc)}`;
}

/** A nota do Δ CR: calculado pelo serviço sobre o que ele recebeu, e nunca sobre um CR local medido válido. */
function notaDoDeltaCR(proc: ProcedenciaDoCR): string {
  if (proc.coercao === 'substituido') {
    return `diferença calculada contra valor substituto (${proc.enviadoJson}), não contra um CR local medido`;
  }
  if (proc.serializacao === 'falha') return `diferença não interpretável: ${oQueOCorpoCarrega(proc)}`;
  return `diferença informada pelo serviço sobre o que ele recebeu, e não sobre um CR local medido válido; ${oQueOCorpoCarrega(proc)}`;
}

function linhaDa(e: EntradaAvaliada, envio: Envio): LinhaDaTabela {
  const proc = procedenciaDe(envio, e.chave);
  const notas: string[] = [];

  let crSistema: Celula;
  // Verdadeiro quando o CR local é ausente ou inválido: o Δ CR do serviço não é contra um CR medido válido.
  let contraValorNaoMedido = false;
  if (proc?.estado === 'ausente') {
    contraValorNaoMedido = true;
    crSistema = { texto: NAO_AVALIADO, avaliado: false, nota: notaDoCRLocal(proc) };
  } else if (proc?.estado === 'presente_invalido') {
    contraValorNaoMedido = true;
    crSistema = { texto: 'inválido', avaliado: false, nota: notaDoCRLocal(proc) };
  } else {
    crSistema =
      e.your_cr.estado === 'valido'
        ? celulaPercentual(e.your_cr.valor as number, 2, { avaliavel: true, comFaixa: false })
        : {
            texto: NAO_AVALIADO,
            avaliado: false,
            nota:
              proc?.valorLocal !== null && proc?.valorLocal !== undefined
                ? `o serviço não devolveu your_cr utilizável; CR local registrado: ${percentual(proc.valorLocal, 2).texto}`
                : undefined,
          };
  }

  const crServico: Celula =
    e.sdk_cr.estado === 'valido'
      ? celulaPercentual(e.sdk_cr.valor as number, 2, { avaliavel: true, comFaixa: false })
      : { texto: NAO_AVALIADO, avaliado: false };

  const deltaCR: Celula =
    e.cr_diff.estado === 'valido'
      ? celulaPercentual(e.cr_diff.valor as number, 3, {
          avaliavel: !contraValorNaoMedido,
          comFaixa: true,
          nota: contraValorNaoMedido && proc ? notaDoDeltaCR(proc) : undefined,
        })
      : { texto: NAO_AVALIADO, avaliado: false };

  const deltaPesos: Celula =
    e.max_weight_diff.estado === 'valido'
      ? celulaPercentual(e.max_weight_diff.valor as number, 3, { avaliavel: true, comFaixa: true })
      : { texto: NAO_AVALIADO, avaliado: false };

  if (e.estado === 'parcial') notas.push(...e.motivos);

  return {
    chave: e.chave,
    n: String(e.n.valor),
    crSistema,
    crServico,
    deltaCR,
    deltaPesos,
    veredito:
      e.valid === 'verdadeiro'
        ? { texto: 'sim (informado pelo serviço)', valor: 'sim' }
        : e.valid === 'falso'
          ? { texto: 'não (informado pelo serviço)', valor: 'nao' }
          : { texto: 'não confirmado', valor: 'nao_confirmado' },
    notas,
  };
}

function maximosDe(ret: RetornoAvaliado) {
  const env = ret.envelope;
  const f = (c: { estado: string; valor: number | null }, casas = 3) =>
    c.estado === 'valido' ? percentual(c.valor as number, casas).texto : NAO_AVALIADO;
  return {
    resumoPesos: f(env.max_weight_diff),
    resumoCR: f(env.max_cr_diff),
    entradasPesos: ret.maximosDasEntradas.pesos === null ? NAO_AVALIADO : percentual(ret.maximosDasEntradas.pesos, 3).texto,
    entradasCR: ret.maximosDasEntradas.cr === null ? NAO_AVALIADO : percentual(ret.maximosDasEntradas.cr, 3).texto,
  };
}

function resumoDe(ret: RetornoAvaliado): string[] {
  const env = ret.envelope;
  const f = (c: { estado: string; valor: number | null }) => (c.estado === 'valido' ? String(c.valor) : NAO_AVALIADO);
  return [
    `summary.valid_matrices (informado pelo serviço): ${f(env.valid_matrices)}`,
    `summary.total_matrices (informado pelo serviço): ${f(env.total_matrices)}`,
  ];
}

function causasDe(ret: RetornoAvaliado): string[] {
  return [
    ...ret.envelope.defeitos.map(d => `Envelope: ${d}`),
    ...ret.contradicoes.map(
      c => `Contradição ${c.codigo}: ${c.enunciado}. ${c.a.fonte}: ${c.a.valor}. ${c.b.fonte}: ${c.b.valor}.`
    ),
  ];
}

function veredictoPorEntrada(ret: RetornoAvaliado): string[] {
  return ret.entradas
    .filter(e => e.esperada)
    .map(
      e =>
        `${e.chave}: ` +
        (e.valid === 'verdadeiro'
          ? 'valid = true (informado pelo serviço)'
          : e.valid === 'falso'
            ? 'valid = false (informado pelo serviço)'
            : 'valid não confirmado (não é booleano explícito)')
    );
}

function coberturaComResposta(envio: Envio, ret: RetornoAvaliado): Propriedade {
  const enviadas = rotulos(envio);
  const cobertas = enviadas.filter(r => ret.chavesDevolvidas.includes(r));
  const completa = envio.enviadas.length === TOTAL_DE_IDENTIDADES && ret.chavesAusentes.length === 0;
  const situacao = envio.reconstruida
    ? `Cobertura das seis identidades não satisfeita: a reconstrução cobre no máximo cinco, sem a magnitude. ${cobertas.length} identidade(s) reconstruída(s) enviada(s) e devolvida(s).`
    : completa
      ? 'Completa: as seis identidades foram enviadas e devolvidas.'
      : `Incompleta: ${cobertas.length} de ${TOTAL_DE_IDENTIDADES} identidades enviadas e devolvidas.`;
  const detalhes = [
    `Enviadas: ${enviadas.join(', ') || 'nenhuma'}`,
    `Devolvidas e correspondentes: ${cobertas.join(', ') || 'nenhuma'}`,
    ...envio.descartes.map(d => `Não enviada: ${d.rotulo}, ${TEXTO_DA_RAZAO[d.razao]} (${d.detalhe})`),
    ...ret.chavesAusentes.map(c => `Enviada e não devolvida (ausente na resposta): ${c}`),
    ...ret.chavesInesperadas.map(c => `Devolvida e não enviada (inesperada, sem cobertura): ${c}`),
  ];
  return { nome: 'Cobertura', situacao, detalhes };
}

function resultadoPorEntrada(envio: Envio, ret: RetornoAvaliado, origemReconstruida: boolean): Propriedade {
  const aprov = ret.entradas.filter(e => e.esperada && e.estado !== 'sem_evidencia');
  const linhas = aprov.map(e => {
    const pesos = e.dimensaoPesos ? 'pesos informados' : 'pesos sem resultado utilizável';
    const proc = procedenciaDe(envio, e.chave);
    const cr = crUtilizavel(e, envio)
      ? 'CR informado'
      : e.dimensaoCR && proc
        ? `CR sem resultado utilizável (CR local ${proc.estado === 'ausente' ? 'ausente' : 'inválido'})`
        : 'CR sem resultado utilizável';
    return `${e.chave}: ${pesos}; ${cr}${e.estado === 'completa' ? '' : ' (entrada parcialmente utilizável)'}`;
  });
  const sem = ret.entradas.filter(e => e.esperada && e.estado === 'sem_evidencia');
  const todosOk = aprov.length > 0 && aprov.every(e => e.dimensaoPesos && crUtilizavel(e, envio)) && sem.length === 0;
  return {
    nome: 'Resultado informado',
    situacao: origemReconstruida
      ? 'Por entrada, sobre matrizes reconstruídas dos pesos, e não sobre os julgamentos originais.'
      : todosOk
        ? 'Pesos e CR informados e estruturalmente válidos em todas as entradas.'
        : 'Há dimensão sem resultado utilizável; os campos válidos são exibidos e os demais aparecem como "não avaliado".',
    detalhes: [
      ...linhas,
      ...sem.map(e => `${e.chave}: sem evidência utilizável (${e.motivos.join('; ')})`),
    ],
  };
}

function propriedadeVeredito(situacao: string, detalhes: string[] = []): Propriedade {
  return { nome: 'Veredito', situacao, detalhes };
}

function base(
  codigo: CodigoDeEstado,
  envio: Envio,
  campos: Omit<
    Apresentacao,
    | 'codigo'
    | 'selo'
    | 'origem'
    | 'causas'
    | 'contradicoes'
    | 'linhas'
    | 'semEvidencia'
    | 'maximos'
    | 'resumoDoServico'
    | 'pontosDeAtencao'
    | 'biblioteca'
    | 'notas'
  > &
    Partial<Apresentacao>
): Apresentacao {
  return {
    codigo,
    // ⚠ O selo existe SOMENTE em P8, e só aqui.
    selo: codigo === 'P8',
    origem: descreverOrigem(envio),
    causas: [],
    contradicoes: [],
    linhas: [],
    semEvidencia: [],
    maximos: null,
    resumoDoServico: null,
    pontosDeAtencao: null,
    biblioteca: null,
    notas: [],
    ...campos,
  };
}

// ---------------------------------------------------------------------------------------------
// A classificação
// ---------------------------------------------------------------------------------------------

export function classificarEstado(entrada: { envio: Envio; resposta: RespostaObtida | null }): Apresentacao {
  const { envio, resposta } = entrada;

  // P1 e P2: nada foi enviado.
  if (!haEnvio(envio)) {
    const razoes = detalhesDosDescartes(envio);
    if (envio.condicao === 'presente_invalida') {
      return base('P1', envio, {
        manchete: 'Matrizes persistidas inválidas',
        descricao:
          'O cálculo traz chaves de matrizes persistidas (inclusive com valor ou contêiner nulo), mas nenhuma matriz é utilizável. Nada foi enviado ao serviço e nada foi reconstruído em substituição.',
        tom: 'erro',
        propriedades: [
          {
            nome: 'Cobertura',
            situacao: `Nenhuma das ${TOTAL_DE_IDENTIDADES} identidades foi enviada. O motivo de cada descarte está abaixo.`,
            detalhes: razoes,
          },
          {
            nome: 'Resultado informado',
            situacao: 'Ausente por não haver envio. Não é resultado vazio.',
            detalhes: [],
          },
          propriedadeVeredito('Não exibido: não aplicável, pois não houve comparação.'),
        ],
        notas: [DECLARACAO_DO_CONJUNTO, 'Reciprocidade e diagonal unitária das matrizes não foram verificadas.'],
      });
    }
    const porQue =
      envio.motivoDeNaoEnvio === 'sem_calculo'
        ? 'Nenhum cálculo está carregado nesta tela; nada foi enviado.'
        : envio.motivoDeNaoEnvio === 'reconstrucao_sem_matriz_utilizavel'
          ? 'O cálculo não traz matrizes persistidas, e os pesos não produziram nenhuma matriz reconstruída utilizável; nada foi enviado.'
          : 'O cálculo não traz matrizes persistidas nem pesos que permitam reconstruir matrizes; nada foi enviado.';
    return base('P2', envio, {
      manchete: 'Comparação não executada',
      descricao: porQue,
      tom: 'neutro',
      propriedades: [
        {
          nome: 'Cobertura',
          situacao: `Nenhuma identidade enviada. As ${TOTAL_DE_IDENTIDADES} esperadas estão abaixo, com a razão de cada ausência.`,
          detalhes: razoes,
        },
        {
          nome: 'Resultado informado',
          situacao: 'Ausente por não haver envio.',
          detalhes: [],
        },
        propriedadeVeredito('Não exibido: não aplicável, pois não houve comparação.'),
      ],
      notas: [DECLARACAO_DO_CONJUNTO],
    });
  }

  // P3: nenhuma resposta obtida.
  if (!resposta || resposta.tipo === 'falha') {
    const origemDaFalha: OrigemDaFalha =
      resposta && resposta.tipo === 'falha'
        ? resposta.origem
        : { natureza: 'excecao', erro: 'nenhuma resposta foi registrada para a classificação' };
    // Falha de serialização: o corpo NÃO foi gerado, então NADA foi enviado. O texto não pode dizer o contrário.
    const naoEnviado = origemDaFalha.natureza === 'serializacao';
    return base('P3', envio, {
      manchete: 'Falha ao obter a comparação',
      descricao: naoEnviado
        ? `Nada foi enviado ao serviço, e nenhuma resposta foi obtida. ${textoDaOrigemDaFalha(origemDaFalha)}`
        : `Nenhuma resposta utilizável foi obtida do serviço. ${textoDaOrigemDaFalha(origemDaFalha)}`,
      tom: 'erro',
      propriedades: [
        {
          nome: 'Cobertura',
          situacao: naoEnviado
            ? `Preparado para envio: ${rotulos(envio).length} de ${TOTAL_DE_IDENTIDADES} identidades. O corpo da requisição não foi gerado; nada foi enviado e nenhuma devolução foi obtida.`
            : `Enviado: ${rotulos(envio).length} de ${TOTAL_DE_IDENTIDADES} identidades. Nenhuma devolução obtida.`,
          detalhes: [
            ...rotulos(envio).map(r => (naoEnviado ? `Preparada, não enviada: ${r}` : `Enviada: ${r}`)),
            ...envio.descartes.map(d => `Não enviada: ${d.rotulo}, ${TEXTO_DA_RAZAO[d.razao]} (${d.detalhe})`),
          ],
        },
        { nome: 'Resultado informado', situacao: 'Ausente por não haver resposta.', detalhes: [] },
        propriedadeVeredito('Não obtido.'),
      ],
      notas: [DECLARACAO_DO_CONJUNTO],
    });
  }

  const ret = avaliarRetorno(resposta.corpo, envio.ordemEnviada);
  const linhas = ret.entradas
    .filter(e => e.esperada && e.estado !== 'sem_evidencia')
    .map(e => linhaDa(e, envio));
  const semEvidencia = ret.entradas
    .filter(e => e.esperada && e.estado === 'sem_evidencia')
    .map(e => ({ chave: e.chave, motivos: e.motivos }));
  const ver = ret.envelope.allValid;
  const comum = {
    linhas,
    semEvidencia,
    maximos: maximosDe(ret),
    resumoDoServico: resumoDe(ret),
    pontosDeAtencao: ret.envelope.issues.estado === 'valido' ? ret.envelope.issues.textos : null,
    biblioteca: ret.envelope.library,
    contradicoes: ret.contradicoes,
    causas: causasDe(ret),
    notas: notasDaTabela(),
  };

  // P4: nenhuma entrada ao menos parcialmente utilizável.
  if (!ret.haEntradaAproveitavel) {
    return base('P4', envio, {
      manchete: 'Resposta inválida',
      descricao:
        'A resposta não traz nenhuma entrada ao menos parcialmente utilizável para as matrizes enviadas. Nenhum número da resposta é exibido como evidência.',
      tom: 'erro',
      ...comum,
      linhas: [],
      maximos: null,
      resumoDoServico: null,
      propriedades: [
        {
          nome: 'Cobertura',
          situacao: `Enviado: ${rotulos(envio).length} identidade(s). Devolvido: sem entrada utilizável.`,
          detalhes: [
            ...rotulos(envio).map(r =>
              ret.chavesAusentes.includes(r)
                ? `${r}: chave ausente na resposta`
                : `${r}: chave presente e inaproveitável (${ret.entradas.find(e => e.chave === r)?.motivos.join('; ') ?? 'sem detalhe'})`
            ),
            ...ret.chavesInesperadas.map(c => `Devolvida e não enviada (inesperada, sem cobertura): ${c}`),
          ],
        },
        {
          nome: 'Resultado informado',
          situacao: 'Sem nenhuma entrada ao menos parcialmente utilizável.',
          detalhes: ret.envelope.defeitos,
        },
        propriedadeVeredito('Não confirmado: a resposta não permite atribuir veredito a nenhuma matriz.'),
      ],
    });
  }

  // P5: envelope inválido, all_valid não booleano ou contradição exata.
  if (!ret.envelope.valido || ver.estado !== 'booleano' || ret.contradicoes.length > 0) {
    return base('P5', envio, {
      manchete: 'Veredito global não confirmado',
      descricao:
        'O envelope da resposta tem defeito, ou o resumo contradiz os resultados. O veredito global do serviço não é confirmado e não há selo. As entradas aproveitáveis permanecem visíveis abaixo.',
      tom: 'aviso',
      ...comum,
      propriedades: [
        coberturaComResposta(envio, ret),
        resultadoPorEntrada(envio, ret, envio.reconstruida),
        propriedadeVeredito('Global não confirmado.', [
          ...(ver.estado === 'booleano'
            ? [`all_valid informado pelo serviço: ${ver.valor}`]
            : [`all_valid: ${ver.descricao}`]),
          ...veredictoPorEntrada(ret),
        ]),
      ],
    });
  }

  const restricaoDoVeredito = (restricao: string) =>
    ver.valor
      ? `O serviço informou all_valid = true, restrito ${restricao}. Isso não é aprovação do conjunto completo nem dos julgamentos originais.`
      : `O serviço informou all_valid = false, restrito ${restricao}. Isso não é reprovação do conjunto completo nem dos julgamentos originais.`;

  // P6: origem reconstruída.
  if (envio.reconstruida) {
    return base('P6', envio, {
      manchete: 'Comparação de matrizes reconstruídas',
      descricao:
        'As matrizes enviadas foram reconstruídas dos pesos. O resultado vale para essas matrizes reconstruídas, e não para os julgamentos originais. Esta tela não afirma valor de CR para elas.',
      tom: 'neutro',
      ...comum,
      propriedades: [
        coberturaComResposta(envio, ret),
        resultadoPorEntrada(envio, ret, true),
        propriedadeVeredito(
          restricaoDoVeredito('às matrizes reconstruídas dos pesos'),
          veredictoPorEntrada(ret)
        ),
      ],
    });
  }

  // P7: cobertura incompleta, ou dimensão sem resultado utilizável, com origem persistida.
  const aproveitaveis = ret.entradas.filter(e => e.esperada && e.estado !== 'sem_evidencia');
  const coberturaCompleta = envio.enviadas.length === TOTAL_DE_IDENTIDADES && ret.chavesAusentes.length === 0;
  const resultadoCompleto =
    semEvidencia.length === 0 &&
    aproveitaveis.every(e => e.estado === 'completa' && e.dimensaoPesos && crUtilizavel(e, envio));
  if (!coberturaCompleta || !resultadoCompleto) {
    const falta: string[] = [
      ...envio.descartes.map(d => `identidade não enviada: ${d.rotulo}`),
      ...ret.chavesAusentes.map(c => `entrada não devolvida: ${c}`),
      ...semEvidencia.map(s => `entrada sem evidência utilizável: ${s.chave}`),
      ...aproveitaveis
        .filter(e => e.estado !== 'completa')
        .map(e => `${e.chave}: entrada parcialmente utilizável (${e.motivos.join('; ')})`),
      ...aproveitaveis.flatMap(e => [
        ...(e.dimensaoPesos ? [] : [`${e.chave}: dimensão pesos sem resultado utilizável`]),
        ...(crUtilizavel(e, envio) ? [] : [`${e.chave}: dimensão CR sem resultado utilizável`]),
      ]),
    ];
    return base('P7', envio, {
      manchete: 'Comparação incompleta',
      descricao: `Falta: ${falta.join('; ')}.`,
      tom: 'aviso',
      ...comum,
      propriedades: [
        coberturaComResposta(envio, ret),
        resultadoPorEntrada(envio, ret, false),
        propriedadeVeredito(
          restricaoDoVeredito('ao que foi devolvido e é utilizável'),
          veredictoPorEntrada(ret)
        ),
      ],
    });
  }

  // P8 e P9: cobertura completa, envelope válido, resultado utilizável nas duas dimensões, origem persistida.
  const comumFinal = {
    ...comum,
    propriedades: [
      coberturaComResposta(envio, ret),
      resultadoPorEntrada(envio, ret, false),
    ],
  };
  if (ver.valor === true) {
    return base('P8', envio, {
      manchete: 'Aprovação relatada pelo serviço',
      descricao:
        'O serviço informou all_valid = true. O envelope é válido, as seis identidades foram enviadas e devolvidas, pesos e CR foram informados e são estruturalmente válidos em todas as entradas, e a origem das matrizes é persistida. A aprovação é atribuída ao serviço; esta tela não verifica que ele executou a comparação nem a tolerância que aplicou.',
      tom: 'aprovado',
      ...comumFinal,
      propriedades: [
        comumFinal.propriedades[0],
        comumFinal.propriedades[1],
        propriedadeVeredito('Aprovado, atribuído ao serviço (all_valid = true).', veredictoPorEntrada(ret)),
      ],
    });
  }
  return base('P9', envio, {
    manchete: 'Reprovação relatada pelo serviço',
    descricao:
      'O serviço informou all_valid = false, com envelope válido, as seis identidades enviadas e devolvidas, e pesos e CR informados e estruturalmente válidos em todas as entradas. A reprovação é atribuída ao serviço e não é ressalva. Uma divergência exige análise e, sozinha, não determina qual implementação está correta nem invalida a decisão gerencial; esta tela não bloqueia ranking, exportação nem decisão.',
    tom: 'reprovado',
    ...comumFinal,
    propriedades: [
      comumFinal.propriedades[0],
      comumFinal.propriedades[1],
      propriedadeVeredito('Reprovado, atribuído ao serviço (all_valid = false).', veredictoPorEntrada(ret)),
    ],
  });
}

// ---------------------------------------------------------------------------------------------
// Orquestração (única função com E/S; o `fetch` é injetado)
// ---------------------------------------------------------------------------------------------

export interface RespostaHttp {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type Buscar = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<RespostaHttp>;

/**
 * Prepara o envio, chama o serviço por `buscar` (SOMENTE se houver matriz utilizável), lê o corpo de uma
 * resposta não-OK antes de desistir (para a origem de P3) e classifica. No domínio demonstrado em
 * `matriz-utilizavel.ts`, e para erros lançados por `buscar` ou pela serialização do corpo, a falha vira P3
 * com a origem; a falha de serialização é dita como tal. A exclusão sobre `text()` está no cabeçalho.
 */
export async function executarValidacao(calculation: unknown, buscar: Buscar): Promise<Apresentacao> {
  const envio = prepararEnvio(calculation);
  if (!haEnvio(envio)) return classificarEstado({ envio, resposta: null });

  // A geração do corpo é um passo PRÓPRIO. Sua falha (BigInt ou estrutura circular no CR bruto) não é
  // falha da chamada: nada foi enviado, e o serviço não é chamado.
  let corpoDaRequisicao: string;
  try {
    corpoDaRequisicao = JSON.stringify({ action: 'validate-project', matrices: envio.matrices });
  } catch (err) {
    return classificarEstado({ envio, resposta: { tipo: 'falha', origem: origemDaExcecao(err, 'serializacao') } });
  }

  let resposta: RespostaObtida;
  try {
    const r = await buscar('/api/validate-external', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: corpoDaRequisicao,
    });
    let texto = '';
    try {
      texto = await r.text();
    } catch {
      texto = '';
    }
    if (!r.ok) {
      resposta = { tipo: 'falha', origem: origemDaFalhaHttp(r.status, texto) };
    } else {
      try {
        resposta = { tipo: 'corpo', corpo: JSON.parse(texto) };
      } catch (e) {
        resposta = { tipo: 'falha', origem: origemDaExcecao(e, 'corpo_ilegivel') };
      }
    }
  } catch (err) {
    resposta = { tipo: 'falha', origem: origemDaExcecao(err) };
  }
  return classificarEstado({ envio, resposta });
}
