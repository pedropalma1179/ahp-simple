/**
 * lib/ai-reviewer/registro-da-execucao.ts
 *
 * **Monta o registro de execução do Parecer IA** (contrato em `registro-da-execucao-contrato.ts`). ⚠ **SÓ SERVIDOR**:
 * importa `node:crypto` para os resumos SHA-256, e é chamado por `app/api/ai-reviewer/route.ts`. O navegador usa
 * `exportar-registro.ts`, que não importa Node.
 *
 * ⚠ **Este módulo NÃO decide nada sobre o parecer.** Não altera o que o modelo recebe, não valida, não classifica e não
 * libera texto. Recebe o que a rota CAPTUROU no ponto da chamada real (os parâmetros passados ao SDK, a resposta, o
 * contexto incorporado, a validação original) e o COPIA, sem reconstruir nenhuma aproximação.
 *
 * ⚠ **Snapshot.** Toda parte do registro é cópia JSON profunda (`clonarParaRegistro`): alterar depois o objeto de origem
 * (estado da tela, `data` normalizado, `semanticStats`) não altera o registro concluído. A cópia JSON é também a base
 * da serialização canônica dos resumos, de modo que quem lê o arquivo exportado recalcula o mesmo valor.
 *
 * ⚠ **Resumo SHA-256 não substitui o conteúdo**, e prova coerência com o resumo, não autenticidade (quem altera o
 * conteúdo pode recalcular os resumos). A documentação da serialização viaja DENTRO do registro (`integridade`).
 */

import { createHash } from 'node:crypto';
import { decideReviewPresentation } from './review-validation-contract';
import {
  ESQUEMA_DO_REGISTRO,
  RETENCAO,
  VERSAO_DO_ESQUEMA_DO_REGISTRO,
  type AusenciaDoRegistro,
  type BlocoDeConteudoRecebido,
  type EstadoDaRecuperacaoSemantica,
  type RegistroDaExecucao,
  type ResumoDeIntegridade,
} from './registro-da-execucao-contrato';

// ============================================================
// CÓPIA, SERIALIZAÇÃO CANÔNICA E RESUMOS
// ============================================================

/**
 * Cópia profunda por JSON. ⚠ Normaliza como o arquivo exportado normaliza: `undefined` e funções somem, `NaN` e
 * `Infinity` viram `null`, `Date` vira texto ISO. Lança em estrutura circular ou `BigInt`.
 */
export function clonarParaRegistro<T>(valor: T): T {
  if (valor === undefined) return undefined as T;
  return JSON.parse(JSON.stringify(valor)) as T;
}

/** Cópia que NÃO derruba o chamador: devolve o motivo no lugar da cópia quando ela não é possível. */
export function copiaSegura(valor: unknown): { copia: unknown; falha: string | null } {
  try {
    return { copia: clonarParaRegistro(valor), falha: null };
  } catch (erro) {
    return { copia: null, falha: erro instanceof Error ? erro.message : String(erro) };
  }
}

/**
 * Serialização canônica de um valor LIDO DE JSON: JSON compacto, chaves de objeto em ordem crescente por unidade de
 * código UTF-16 (a ordem padrão de `Array.prototype.sort`), arrays na ordem original, escalares como em
 * `JSON.stringify`. Chaves com valor `undefined` não existem (como em `JSON.stringify`).
 */
export function serializacaoCanonica(valor: unknown): string {
  if (valor === null || typeof valor !== 'object') {
    // `JSON.stringify(undefined)` devolve `undefined`; um escalar inexistente não é um valor JSON.
    const texto = JSON.stringify(valor);
    if (texto === undefined) throw new Error('valor sem representação JSON na serialização canônica');
    return texto;
  }
  if (Array.isArray(valor)) {
    return `[${valor.map((item) => (item === undefined ? 'null' : serializacaoCanonica(item))).join(',')}]`;
  }
  const objeto = valor as Record<string, unknown>;
  const partes = Object.keys(objeto)
    .filter((chave) => objeto[chave] !== undefined)
    .sort()
    .map((chave) => `${JSON.stringify(chave)}:${serializacaoCanonica(objeto[chave])}`);
  return `{${partes.join(',')}}`;
}

/** SHA-256 em hexadecimal minúsculo dos bytes UTF-8 do texto, sem normalização. */
export function sha256DoTexto(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

export function sha256CanonicoDoObjeto(valor: unknown): string {
  return sha256DoTexto(serializacaoCanonica(valor));
}

/** Os campos resumidos, com o tratamento de cada um. A ordem é a do arquivo. */
const CAMPOS_RESUMIDOS: ReadonlyArray<{ campo: string; tratamento: 'texto' | 'objeto-canonico' }> = [
  { campo: 'entrada.recebidaPelaApi', tratamento: 'objeto-canonico' },
  { campo: 'entrada.normalizada', tratamento: 'objeto-canonico' },
  { campo: 'modelo.parametrosEnviados', tratamento: 'objeto-canonico' },
  { campo: 'prompts.system', tratamento: 'texto' },
  { campo: 'prompts.mensagens', tratamento: 'objeto-canonico' },
  { campo: 'saida.texto', tratamento: 'texto' },
  { campo: '$', tratamento: 'objeto-canonico' },
];

function valorNoCaminho(registro: Record<string, unknown>, campo: string): unknown {
  if (campo === '$') {
    const { integridade: _integridade, ...semIntegridade } = registro;
    return semIntegridade;
  }
  let atual: unknown = registro;
  for (const passo of campo.split('.')) {
    if (atual === null || typeof atual !== 'object') return undefined;
    atual = (atual as Record<string, unknown>)[passo];
  }
  return atual;
}

function resumir(registro: Record<string, unknown>, campo: string, tratamento: 'texto' | 'objeto-canonico'): ResumoDeIntegridade {
  const valor = valorNoCaminho(registro, campo);
  if (tratamento === 'texto') {
    if (typeof valor !== 'string') throw new Error(`resumo de texto sobre valor que não é texto: ${campo}`);
    return { campo, tratamento, sha256: sha256DoTexto(valor) };
  }
  return { campo, tratamento, sha256: sha256CanonicoDoObjeto(valor) };
}

/**
 * Recalcula os resumos de um registro (já lido do JSON) e compara com os declarados em `integridade.resumos`.
 * ⚠ Verifica COERÊNCIA entre conteúdo e resumo. Não verifica a origem do arquivo.
 */
export function verificarIntegridadeDoRegistro(registro: unknown): { ok: boolean; divergencias: string[] } {
  const divergencias: string[] = [];
  if (registro === null || typeof registro !== 'object') {
    return { ok: false, divergencias: ['o registro não é um objeto'] };
  }
  const r = registro as Record<string, unknown>;
  const declarados = (r.integridade as { resumos?: unknown } | undefined)?.resumos;
  if (!Array.isArray(declarados)) {
    return { ok: false, divergencias: ['integridade.resumos ausente'] };
  }
  for (const declarado of declarados as ResumoDeIntegridade[]) {
    try {
      const recalculado = resumir(r, declarado.campo, declarado.tratamento);
      if (recalculado.sha256 !== declarado.sha256) {
        divergencias.push(`${declarado.campo}: declarado ${declarado.sha256}, recalculado ${recalculado.sha256}`);
      }
    } catch (erro) {
      divergencias.push(`${declarado.campo}: ${erro instanceof Error ? erro.message : String(erro)}`);
    }
  }
  return { ok: divergencias.length === 0, divergencias };
}

// ============================================================
// RESPOSTA DO PROVEDOR E ESTADO DA RECUPERAÇÃO SEMÂNTICA
// ============================================================

const textoOuNull = (x: unknown): string | null => (typeof x === 'string' && x !== '' ? x : null);

export interface RespostaResumidaDoProvedor {
  id: string | null;
  modelo: string | null;
  usage: Record<string, unknown> | null;
  stopReason: string | null;
  stopSequence: string | null;
  blocos: BlocoDeConteudoRecebido[] | null;
}

/**
 * Resume a resposta do provedor SEM o conteúdo de raciocínio: dos blocos de conteúdo guarda o tipo (e o tamanho, só do
 * bloco de texto). ⚠ Campo ausente fica `null`, e o chamador declara a ausência; nada é preenchido.
 */
export function resumirRespostaDoProvedor(resposta: unknown): RespostaResumidaDoProvedor {
  const m = (resposta !== null && typeof resposta === 'object' ? resposta : {}) as Record<string, unknown>;
  const usage = m.usage !== null && typeof m.usage === 'object' ? (clonarParaRegistro(m.usage) as Record<string, unknown>) : null;
  const blocos = Array.isArray(m.content)
    ? (m.content as unknown[]).map((bloco, indice): BlocoDeConteudoRecebido => {
        const b = (bloco !== null && typeof bloco === 'object' ? bloco : {}) as Record<string, unknown>;
        const tipo = textoOuNull(b.type);
        return tipo === 'text' && typeof b.text === 'string'
          ? { indice, tipo, caracteres: b.text.length }
          : { indice, tipo };
      })
    : null;
  return {
    id: textoOuNull(m.id),
    modelo: textoOuNull(m.model),
    usage,
    stopReason: textoOuNull(m.stop_reason),
    stopSequence: textoOuNull(m.stop_sequence),
    blocos,
  };
}

export interface EstatisticasSemanticasDoRegistro {
  enabled: boolean;
  queriesRan: number;
  withResults: number;
  emptyOk: number;
  errored: number;
  /** Diagnóstico por consulta (`DiagnosticoConsulta`), na ordem de disparo. */
  queries?: Array<{ indice?: number }>;
}

/**
 * O estado da recuperação semântica, lido das contagens (`withResults`, `emptyOk` e `errored` são disjuntas e somam
 * `queriesRan`). ⚠ Contagens que não fecham dão `indeterminado`: ausência de coerência não vira nenhum dos outros
 * estados.
 */
export function estadoDaRecuperacaoSemantica(s: EstatisticasSemanticasDoRegistro): EstadoDaRecuperacaoSemantica {
  if (s.enabled !== true) return 'desabilitada';
  const numeros = [s.queriesRan, s.withResults, s.emptyOk, s.errored];
  if (numeros.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n < 0)) return 'indeterminado';
  if (s.queriesRan === 0 || s.withResults + s.emptyOk + s.errored !== s.queriesRan) return 'indeterminado';
  if (s.errored === s.queriesRan) return 'falha_em_todas_as_consultas';
  if (s.errored > 0) return 'falha_parcial';
  if (s.withResults === 0) return 'sem_resultados';
  return 'com_resultados';
}

// ============================================================
// MONTAGEM
// ============================================================

export interface ContextoCapturado {
  estatico: {
    consistencia: unknown[];
    bocr: unknown[];
    sensibilidade: unknown[];
    criticasAdicionais: unknown[];
    limiaresPublicados: string;
    formulasBocr: string;
    benchmarks: string;
  };
  semantico: {
    consultasConfiguradas: string[];
    parametros: { topKPorConsulta: number; maximoPorArtigo: number; totalFinal: number };
    estatisticas: EstatisticasSemanticasDoRegistro;
    trechos: Array<{ id: string; score: number; metadata: Record<string, unknown> }>;
    textoInjetadoNoPrompt: string;
  };
}

/**
 * O que a rota captura NO PONTO DA CHAMADA REAL e entrega ao montador. ⚠ `parametros` é a cópia do objeto que o SDK
 * recebeu, tirada antes da chamada; `respostaDoProvedor` é a mensagem devolvida pelo SDK, sem alteração.
 */
export interface CapturaDaGeracao {
  inicioDaChamada: Date;
  terminoDaChamada: Date;
  parametros: EntradaParaMontarORegistro['chamada']['parametros'];
  respostaDoProvedor: unknown;
  contexto: ContextoCapturado;
}

/**
 * O corpo da resposta da rota, no que o registro lê dele. ⚠ É o PRÓPRIO objeto que a rota devolve: texto, validação e
 * metadados do registro são, por construção, os desta mesma resposta.
 */
export interface RespostaDaRotaParaORegistro {
  review: string;
  validation: unknown;
  nota: unknown;
  veredicto: unknown;
  notaSuspensa: unknown;
  mensagemDaExtracao: unknown;
  estadoDoVinculo: unknown;
  metadata: { estadoDaExtracao?: unknown };
}

export interface EntradaParaMontarORegistro {
  idDaGeracao: string;
  versaoDaApi: string;
  ambiente: { commit: unknown; idDaImplantacao: unknown; ambienteDaImplantacao: unknown };
  /**
   * Cópias já tiradas pela rota logo após receber e normalizar a requisição (ver `copiaSegura`). ⚠ O id do projeto e o id do
   * cálculo são lidos da cópia da entrada RECEBIDA (`projectId` e `vinculoDaExecucao.executionId`): o registro não os infere
   * de outro lugar.
   */
  entradaRecebida: unknown;
  entradaNormalizada: unknown;
  falhasDeSnapshot?: AusenciaDoRegistro[];
  chamada: {
    provedor: string;
    inicio: Date;
    termino: Date;
    /** O objeto passado ao SDK, copiado ANTES da chamada. */
    parametros: { model: string; max_tokens: number; thinking?: unknown; system: string; messages: Array<{ role: string; content: string }> };
    /** A resposta do provedor, tal como o SDK a devolveu. */
    resposta: unknown;
  };
  contexto: ContextoCapturado;
  respostaDaRota: RespostaDaRotaParaORegistro;
  montadoEm?: Date;
}

const LEITURA_DO_REGISTRO = [
  'Este arquivo documenta UMA geração do Parecer IA: identificação, configuração efetivamente enviada ao provedor, entradas, prompts finais, contexto bibliográfico incorporado, saída observada e o resultado original da validação automática.',
  'Não garante reprodução exata: uma nova chamada com os mesmos insumos pode produzir texto diferente.',
  'Chamada concluída NÃO é parecer aprovado: a decisão sobre o texto está em avaliacaoAutomatica (estado, aprovada, apresentacao).',
  'Os resumos SHA-256 (integridade) servem para detectar alteração do conteúdo depois da montagem; não substituem o conteúdo.',
  'Entradas e prompts podem conter dados dos respondentes (identificadores, e-mails) que foram enviados ao modelo. Revise antes de compartilhar: o sistema não envia este arquivo a nenhum repositório.',
];

const INTEGRIDADE = {
  algoritmo: 'SHA-256' as const,
  formatoDoResumo: 'Hexadecimal minúsculo, 64 caracteres.',
  tratamentoDeTexto:
    'Tratamento "texto": SHA-256 dos bytes UTF-8 do próprio texto, sem normalização Unicode e sem alteração de quebras de linha.',
  serializacaoCanonica:
    'Tratamento "objeto-canonico": SHA-256 dos bytes UTF-8 da serialização canônica do valor lido deste arquivo JSON: JSON compacto, sem espaços nem quebras de linha entre símbolos; chaves de objeto em ordem crescente por unidade de código UTF-16 (a ordem padrão de Array.prototype.sort do JavaScript); arrays na ordem original; strings, números, booleanos e null como em JSON.stringify do ECMAScript; chaves com valor indefinido não existem. O campo "$" é a raiz do registro sem a chave "integridade".',
  observacao:
    'O resumo prova coerência entre o conteúdo e o resumo, não a autenticidade da origem: quem altera o conteúdo pode recalcular os resumos. Não substitui o conteúdo.',
};

const OBSERVACAO_DO_INTERVALO =
  'inicioDaChamadaAoModelo e terminoDaChamadaAoModelo delimitam a invocação do SDK e podem incluir novas tentativas automáticas do cliente; tentativas individuais não são registradas.';

const PARAMETROS_NAO_ENVIADOS =
  'Parâmetros opcionais da API (por exemplo temperature, top_p, top_k, stop_sequences, tools) não foram enviados; seus valores padrão no provedor não estão registrados aqui.';

const OBSERVACAO_DA_AVALIACAO =
  'validacao é o resultado ORIGINAL, devolvido sem alteração. Nota e veredicto extraídos do texto só são apresentados na tela quando a apresentação é "aprovado" e a classificação não está suspensa. sha256DoTextoValidado liga a validação ao texto de saida.texto.';

const OBSERVACAO_SEMANTICA =
  'textoInjetadoNoPrompt é a referência do que a seção de evidências semânticas levou ao modelo. Campos de metadata dos trechos que não aparecem naquele texto constam aqui apenas para auditoria e não foram enviados ao modelo. A recuperação é aditiva: falha ou ausência de resultados não interrompe a geração, e estado e diagnósticos por consulta dizem o que ocorreu.';

const lerCaminho = (raiz: unknown, ...passos: string[]): unknown =>
  passos.reduce<unknown>((atual, passo) => (atual !== null && typeof atual === 'object' ? (atual as Record<string, unknown>)[passo] : undefined), raiz);

export function montarRegistroDaExecucao(e: EntradaParaMontarORegistro): RegistroDaExecucao {
  const ausencias: AusenciaDoRegistro[] = [...(e.falhasDeSnapshot ?? [])];
  const ausente = (campo: string, motivo: string) => ausencias.push({ campo, motivo });

  const saidaTexto = typeof e.respostaDaRota.review === 'string' ? e.respostaDaRota.review : '';
  const validacao = e.respostaDaRota.validation;

  const projectId = textoOuNull(lerCaminho(e.entradaRecebida, 'projectId'));
  if (projectId === null) {
    ausente('identificacao.projectId', 'A requisição não trouxe projectId (cliente anterior a esta versão, ou chamada direta à API).');
  }
  const idDoCalculo = textoOuNull(lerCaminho(e.entradaRecebida, 'vinculoDaExecucao', 'executionId'));
  if (idDoCalculo === null) {
    ausente('identificacao.idDoCalculo', 'A requisição não trouxe vinculoDaExecucao com executionId.');
  }
  const commit = textoOuNull(e.ambiente.commit);
  if (commit === null) {
    ausente(
      'identificacao.implantacao.commit',
      'A variável de ambiente VERCEL_GIT_COMMIT_SHA não estava definida neste processo (esperado fora da Vercel, ou em implantação sem vínculo com o Git). A versão da API é um rótulo fixo no código e NÃO substitui o commit.'
    );
  }
  const idDaImplantacao = textoOuNull(e.ambiente.idDaImplantacao);
  if (idDaImplantacao === null) {
    ausente('identificacao.implantacao.idDaImplantacao', 'A variável de ambiente VERCEL_DEPLOYMENT_ID não estava definida neste processo (esperado fora da Vercel).');
  }
  const ambienteDaImplantacao = textoOuNull(e.ambiente.ambienteDaImplantacao);
  if (ambienteDaImplantacao === null) {
    ausente('identificacao.implantacao.ambienteDaImplantacao', 'A variável de ambiente VERCEL_ENV não estava definida neste processo (esperado fora da Vercel).');
  }

  const resposta = resumirRespostaDoProvedor(e.chamada.resposta);
  if (resposta.modelo === null) ausente('modelo.identificadoNaResposta', 'A resposta do provedor não trouxe o campo model.');
  if (resposta.id === null) ausente('modelo.idDaRespostaDoProvedor', 'A resposta do provedor não trouxe o campo id.');
  if (resposta.usage === null) ausente('modelo.consumoDeTokens', 'A resposta do provedor não trouxe o campo usage.');
  if (resposta.stopReason === null) ausente('modelo.motivoDeEncerramento', 'A resposta do provedor não trouxe o campo stop_reason.');
  if (resposta.blocos === null) ausente('saida.blocosDeConteudoRecebidos', 'A resposta do provedor não trouxe a lista content.');
  if (saidaTexto === '') ausente('saida.texto', 'A resposta do provedor não trouxe bloco de texto, ou o texto veio vazio.');

  const { system, messages, ...parametrosEnviados } = e.chamada.parametros;
  const inicioMs = e.chamada.inicio.getTime();
  const terminoMs = e.chamada.termino.getTime();

  const estatisticas = e.contexto.semantico.estatisticas;
  const estado = estadoDaRecuperacaoSemantica(estatisticas);
  const habilitada = estatisticas.enabled === true;
  const consultasConfiguradas = e.contexto.semantico.consultasConfiguradas;
  const consultasExecutadas = habilitada && Array.isArray(estatisticas.queries)
    ? estatisticas.queries.map((q) => ({
        texto: typeof q.indice === 'number' ? consultasConfiguradas[q.indice] ?? null : null,
        ...q,
      }))
    : [];

  const apresentacao = decideReviewPresentation(validacao);

  const semIntegridade = clonarParaRegistro({
    esquema: ESQUEMA_DO_REGISTRO,
    versaoDoEsquema: VERSAO_DO_ESQUEMA_DO_REGISTRO,
    leituraDoRegistro: LEITURA_DO_REGISTRO,
    retencao: RETENCAO,
    identificacao: {
      idDaGeracao: e.idDaGeracao,
      projectId,
      idDoCalculo,
      inicioDaChamadaAoModelo: e.chamada.inicio.toISOString(),
      terminoDaChamadaAoModelo: e.chamada.termino.toISOString(),
      duracaoDaChamadaMs: terminoMs - inicioMs,
      registroMontadoEm: (e.montadoEm ?? new Date()).toISOString(),
      fusoHorario: 'UTC (sufixo Z, ISO 8601)',
      versaoDaApi: e.versaoDaApi,
      implantacao: { commit, idDaImplantacao, ambienteDaImplantacao },
    },
    modelo: {
      provedor: e.chamada.provedor,
      chamadaConcluida: true,
      solicitado: parametrosEnviados.model,
      identificadoNaResposta: resposta.modelo,
      idDaRespostaDoProvedor: resposta.id,
      parametrosEnviados,
      parametrosNaoEnviados: PARAMETROS_NAO_ENVIADOS,
      consumoDeTokens: resposta.usage,
      motivoDeEncerramento: resposta.stopReason,
      sequenciaDeParada: resposta.stopSequence,
      observacaoDoIntervalo: OBSERVACAO_DO_INTERVALO,
    },
    entrada: {
      recebidaPelaApi: e.entradaRecebida,
      normalizada: e.entradaNormalizada,
    },
    prompts: { system, mensagens: messages },
    contextoBibliografico: {
      referenciasEstaticas: {
        origem: 'app/api/ai-reviewer/knowledge.ts (base local compilada com a implantação); inseridas no prompt em toda execução.',
        ...e.contexto.estatico,
      },
      recuperacaoSemantica: {
        habilitada,
        origemDaHabilitacao: "Variável de ambiente USE_RAG_SEMANTIC lida na inicialização do módulo da rota; habilita somente com o valor exato 'true'.",
        estado,
        consultasConfiguradas,
        parametros: e.contexto.semantico.parametros,
        consultasExecutadas,
        estatisticas,
        trechosIncorporados: e.contexto.semantico.trechos.map((t, i) => ({
          posicaoNoPrompt: i + 1,
          id: t.id,
          score: t.score,
          metadata: t.metadata,
        })),
        textoInjetadoNoPrompt: e.contexto.semantico.textoInjetadoNoPrompt,
        observacao: OBSERVACAO_SEMANTICA,
      },
    },
    saida: {
      texto: saidaTexto,
      caracteres: saidaTexto.length,
      blocosDeConteudoRecebidos: resposta.blocos,
      indiceDoBlocoDeTextoUsado: resposta.blocos === null ? null : resposta.blocos.find((b) => b.tipo === 'text')?.indice ?? null,
    },
    avaliacaoAutomatica: {
      validacao,
      sha256DoTextoValidado: sha256DoTexto(saidaTexto),
      apresentacao,
      aprovada: apresentacao.estado === 'aprovado',
      extracaoDeNotaEVeredicto: {
        estadoDaExtracao: e.respostaDaRota.metadata?.estadoDaExtracao ?? null,
        nota: e.respostaDaRota.nota,
        veredicto: e.respostaDaRota.veredicto,
        mensagemDaExtracao: e.respostaDaRota.mensagemDaExtracao,
        notaSuspensa: e.respostaDaRota.notaSuspensa,
        estadoDoVinculo: e.respostaDaRota.estadoDoVinculo,
      },
      observacao: OBSERVACAO_DA_AVALIACAO,
    },
    completude: { completo: ausencias.length === 0, ausencias },
  });

  const resumos = CAMPOS_RESUMIDOS.map(({ campo, tratamento }) => resumir(semIntegridade as Record<string, unknown>, campo, tratamento));

  return { ...semIntegridade, integridade: { ...INTEGRIDADE, resumos } } as unknown as RegistroDaExecucao;
}
