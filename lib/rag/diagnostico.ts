/**
 * lib/rag/diagnostico.ts
 *
 * Contrato do diagnóstico da recuperação semântica, A.30.
 *
 * Existe para separar quatro condições que hoje chegam ao chamador como a mesma
 * lista vazia: recuperação desabilitada, consulta com resultados, consulta vazia e
 * erro. Separa também a ETAPA, o estado de cada uma das duas dependências, e o
 * status HTTP quando houve resposta.
 *
 * ⚠ **Diagnóstico não é apresentação.** Nada aqui decide o que a interface mostra
 * nem o que acontece com a geração degradada. São decisões próprias.
 */

/** Versão do contrato dos metadados semânticos, para distinguir registros antigos. */
export const VERSAO_CONTRATO_SEMANTICO = 2;

/** As duas etapas da recuperação, na ordem em que rodam. */
export type Etapa = 'embed' | 'querySimilar';

/** Estado do embedding. `nao_executado` não ocorre hoje: ele é a primeira etapa. */
export type EstadoEmbedding = 'concluido' | 'erro' | 'nao_executado';

/**
 * Estado da consulta ao índice.
 * ⚠ `nao_executado` é o caso em que o `embed` falhou: a consulta **não chegou a
 * ser tentada**, e isso é diferente de ter falhado.
 */
export type EstadoConsulta = 'com_resultados' | 'vazio' | 'erro' | 'nao_executado';

/**
 * Classificação da falha. ⚠ Só é afirmada quando o código que a observa SABE onde
 * ela ocorreu. O envoltório do Upstash sabe, porque controla o transporte inteiro;
 * o da Voyage não sabe o que acontece depois da resposta, e usa
 * `posterior_a_resposta_nao_classificada`.
 */
export type ClassificacaoFalha =
  | 'transporte'
  | 'http_nao_exitoso'
  | 'leitura_ou_parsing'
  | 'posterior_a_resposta_nao_classificada'
  | 'nao_classificada';

/**
 * Uma tentativa HTTP. ⚠ **Unidade própria:** tentativas não se somam a consultas,
 * e uma consulta pode gerar várias tentativas.
 */
export interface TentativaHttp {
  /** Ordem dentro da consulta, começando em 1. */
  numero: number;
  /** ⚠ AUSENTE quando não houve resposta. Nunca inventado. */
  status?: number;
  /**
   * Bytes efetivamente LIDOS do corpo. `0` significa leitura concluída com corpo
   * vazio. ⚠ **Ausente quando a leitura não concluiu**, e ausente quando o corpo
   * não é lido por decisão, como no envoltório da Voyage.
   */
  bytes?: number;
  /** Classificação da falha desta tentativa, quando houve. */
  falha?: ClassificacaoFalha;
}

/** Erro sanitizado. ⚠ Sem credencial, sem URL completa e sem corpo arbitrário. */
export interface ErroDiagnosticado {
  /** `name` quando o valor lançado é `Error`; rótulo do tipo quando não é. */
  nome: string;
  /** Mensagem sanitizada, truncada. */
  mensagem: string;
  classificacao: ClassificacaoFalha;
}

/** Diagnóstico de UMA consulta semântica, da ponta a ponta. */
export interface DiagnosticoConsulta {
  /** Posição da consulta na execução, começando em 0. */
  indice: number;
  /** Etapa em que a consulta parou. `null` quando nenhuma falhou. */
  etapa: Etapa | null;
  embedding: EstadoEmbedding;
  consulta: EstadoConsulta;
  /** Tentativas HTTP da consulta ao índice, numeradas. */
  tentativas: TentativaHttp[];
  erro?: ErroDiagnosticado;
}

const LIMITE_MENSAGEM = 300;

/**
 * Sanitiza um valor lançado, seja ele `Error` ou não.
 *
 * ⚠ **Nome e mensagem são complementares, não a base da classificação.** Quem chama
 * informa a classificação, porque só o chamador sabe onde a falha ocorreu.
 */
export function sanitizarErro(valor: unknown, classificacao: ClassificacaoFalha): ErroDiagnosticado {
  if (valor instanceof Error) {
    return {
      nome: valor.name,
      mensagem: String(valor.message).slice(0, LIMITE_MENSAGEM),
      classificacao,
    };
  }
  // ⚠ Valor lançado que não é `Error`: registra o tipo, sem supor `name`.
  const tipo = valor === null ? 'null' : typeof valor;
  let mensagem: string;
  try {
    mensagem = typeof valor === 'object' ? JSON.stringify(valor) ?? String(valor) : String(valor);
  } catch {
    mensagem = '[valor não serializável]';
  }
  return {
    nome: `NaoErro(${tipo})`,
    mensagem: mensagem.slice(0, LIMITE_MENSAGEM),
    classificacao,
  };
}

/** Diagnóstico de uma consulta que nem chegou a rodar o `embed`. */
export function diagnosticoNaoIniciado(indice: number): DiagnosticoConsulta {
  return {
    indice,
    etapa: null,
    embedding: 'nao_executado',
    consulta: 'nao_executado',
    tentativas: [],
  };
}
