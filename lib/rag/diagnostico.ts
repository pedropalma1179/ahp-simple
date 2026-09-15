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
 *
 * ⚠ **`anterior_a_chamada` e `transporte` são condições DIFERENTES**, e confundi-las
 * atribui ao transporte uma falha que nunca chegou a tocá-lo. Falta de credencial e
 * vetor com dimensão errada abortam ANTES de qualquer requisição sair; `transporte`
 * afirma que a chamada saiu e nenhuma resposta voltou. **Nunca se afirma transporte
 * sem tentativa registrada.**
 */
export type ClassificacaoFalha =
  | 'anterior_a_chamada'
  | 'transporte'
  | 'http_nao_exitoso'
  | 'leitura_ou_parsing'
  | 'posterior_a_resposta_nao_classificada'
  | 'nao_classificada';

/**
 * Uma tentativa HTTP. ⚠ **Unidade própria:** tentativas não se somam a consultas,
 * e uma consulta pode gerar várias tentativas.
 *
 * ⚠ **Tentativa pertence a UMA etapa.** O array em que ela vive é o que diz a qual,
 * e por isso `DiagnosticoConsulta` tem dois arrays e não um.
 */
export interface TentativaHttp {
  /** Ordem dentro da ETAPA, começando em 1. */
  numero: number;
  /** ⚠ AUSENTE quando não houve resposta. Nunca inventado. */
  status?: number;
  /** Classificação da falha desta tentativa, quando houve. */
  falha?: ClassificacaoFalha;
}

/**
 * Falha descrita para saída.
 *
 * ⚠ **Nada aqui vem da exceção.** Sem `name`, sem `message`, sem corpo de resposta e
 * sem serialização do valor lançado. A mensagem é FIXA por classificação, escolhida
 * neste arquivo, porque a exceção de uma dependência é texto que este projeto não
 * controla e que já foi medido carregando URL e credencial.
 */
export interface ErroDiagnosticado {
  /** Texto público, fixo por `classificacao`. Não é a mensagem da exceção. */
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
  /** Tentativas HTTP da etapa de embedding, numeradas a partir de 1. */
  tentativasEmbed: TentativaHttp[];
  /** Tentativas HTTP da consulta ao índice, numeradas a partir de 1. */
  tentativasConsulta: TentativaHttp[];
  erro?: ErroDiagnosticado;
}

/**
 * Mensagem pública de cada classificação. ⚠ **Descreve a CONDIÇÃO, não o incidente.**
 * Duas falhas da mesma classificação produzem exatamente o mesmo texto, e isso é
 * deliberado: o que distingue uma da outra são os campos estruturados.
 */
const MENSAGEM_POR_CLASSIFICACAO: Record<ClassificacaoFalha, string> = {
  anterior_a_chamada: 'a etapa abortou antes de qualquer requisição sair',
  transporte: 'a requisição saiu e nenhuma resposta chegou',
  http_nao_exitoso: 'a resposta chegou com status não exitoso',
  leitura_ou_parsing: 'a resposta chegou e não foi possível lê-la ou interpretá-la',
  posterior_a_resposta_nao_classificada:
    'a resposta chegou e a falha ocorreu depois dela, sem classificação segura',
  nao_classificada: 'falha sem classificação',
};

/**
 * Descreve a falha a partir da classificação, e SÓ dela.
 *
 * ⚠ **Não recebe o valor lançado**, de propósito: assim não há caminho por onde
 * texto de dependência chegue à saída. Quem chama informa a classificação, porque só
 * o chamador sabe onde a falha ocorreu.
 */
export function descreverFalha(classificacao: ClassificacaoFalha): ErroDiagnosticado {
  return { mensagem: MENSAGEM_POR_CLASSIFICACAO[classificacao], classificacao };
}

/** Diagnóstico de uma consulta que nem chegou a rodar o `embed`. */
export function diagnosticoNaoIniciado(indice: number): DiagnosticoConsulta {
  return {
    indice,
    etapa: null,
    embedding: 'nao_executado',
    consulta: 'nao_executado',
    tentativasEmbed: [],
    tentativasConsulta: [],
  };
}
