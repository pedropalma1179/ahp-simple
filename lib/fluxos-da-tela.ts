/**
 * lib/fluxos-da-tela.ts
 *
 * **F07, A4: os fluxos assíncronos da tela de resultados, FORA do componente.** Os corpos de
 * `exibirExecucao`, do recálculo e da auditoria da carga inicial moravam dentro de
 * `app/decisor/resultados/[projectId]/page.tsx`, que é `'use client'`, tem milhares de linhas e não
 * pode ser montada por teste algum. Moveram-se para cá SEM mudar o que fazem, a não ser o que A4
 * manda, e a página os chama com os SEUS setters. Assim o teste exercita a função que a página chama,
 * e não uma cópia dela.
 *
 * ⚠ **O que isto NÃO demonstra:** que a página funcione. A página continua sem teste de montagem; os
 * testes exercitam estes módulos, e a fiação da página (que ela chama estas funções, uma vez cada) é
 * conferida por leitura do fonte.
 *
 * Três regras valem aqui, vindas dos itens de A4:
 *
 *   1. **Resposta assíncrona só escreve estado se o PAR for o da apresentação corrente** (ver
 *      `lib/apresentacao-corrente.ts`). Resposta fora do par é descartada, sem aviso: a auditoria da
 *      apresentação corrente ou já está na tela, ou continua sendo buscada.
 *   2. **O cálculo confirmado conclui o próprio estado ANTES de a auditoria ser pedida**, e a falha da
 *      auditoria tem tratamento de erro PRÓPRIO: não reverte o cálculo, não troca exclusões e não
 *      anuncia falha de recálculo.
 *   3. **O Parecer IA tem o par implementado e a CONDUTA ainda por decidir** (decisão 5-B): ver
 *      `condutaDoParecerForaDoPar`.
 */

import type { Exibicao } from '@/lib/referencia-do-projeto';
import type { ParDaApresentacao, RegistroDaApresentacao, ConferenciaDoPar } from '@/lib/apresentacao-corrente';
import type { ResultadoDeNovaAcao } from '@/lib/intencoes';
import { MENSAGEM_DE_ACAO_BLOQUEADA } from '@/lib/retomada-com-confirmacao';

/** Os setters que os fluxos usam. A página passa os de `useState`; o teste passa um armazém simples. */
export interface AcoesDaTela {
  setCalculation(documento: any): void;
  setExibicao(exibicao: Exibicao | null): void;
  setExcludedIds(ids: string[]): void;
  setAiReview(valor: any): void;
  setAudit(auditoria: any): void;
  setExecucaoRecemCalculada(documento: any): void;
  /** O erro que SUBSTITUI a tela inteira por uma tela de erro (`if (error) return …`). */
  setError(mensagem: string): void;
  setIsRecalculating(b: boolean): void;
  setLoading(b: boolean): void;
  /** O aviso NÃO bloqueante (faixa amarela da tela); não substitui a tela. */
  acrescentarAviso(texto: string): void;
}

export type EnviarAuditoria = (documento: Record<string, any>) => Promise<any>;

/** O envio real: o mesmo `POST` que a página fazia. Lança em falha de rede ou de leitura do corpo. */
export const enviarAuditoriaPeloNavegador: EnviarAuditoria = async documento => {
  const resposta = await fetch('/api/audit-decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ calculationData: documento }),
  });
  return resposta.json();
};

export type DesfechoDaAuditoria = 'aplicada' | 'descartada' | 'sem-sucesso' | 'indisponivel';

/**
 * Pede a auditoria de UMA apresentação e escreve a resposta SE o par ainda for o da apresentação
 * corrente.
 *
 *   - `indisponivel`: o envio ou a leitura do corpo lançou. Nada é escrito, e quem chamou decide o
 *     que dizer;
 *   - `descartada`: a resposta chegou, mas a tela já apresenta outra coisa. Nada é escrito;
 *   - `sem-sucesso`: a resposta chegou para a apresentação corrente com `success` falso. Nada é
 *     escrito (como antes de A4);
 *   - `aplicada`: escreveu.
 */
export async function solicitarAuditoria(args: {
  documento: Record<string, any>;
  par: ParDaApresentacao;
  registro: RegistroDaApresentacao;
  enviar: EnviarAuditoria;
  aplicar: (auditoria: any) => void;
}): Promise<DesfechoDaAuditoria> {
  let corpo: any;
  try {
    corpo = await args.enviar(args.documento);
  } catch {
    return 'indisponivel';
  }
  // ⚠ A conferência é feita NO RETORNO, contra a apresentação de AGORA.
  if (!args.registro.conferir(args.par).aceita) return 'descartada';
  if (corpo && corpo.success) {
    args.aplicar(corpo.audit);
    return 'aplicada';
  }
  return 'sem-sucesso';
}

/**
 * A pessoa escolheu uma execução na lista (ou clicou em "Carregar a referência atual").
 * ⚠ Só roda por AÇÃO da pessoa: a tela nunca troca sozinha o que apresenta.
 *
 * A geração avança ANTES das limpezas, e a auditoria é pedida para o par DESTA apresentação.
 */
export async function exibirExecucaoEscolhida(args: {
  documento: Record<string, any>;
  registro: RegistroDaApresentacao;
  acoes: AcoesDaTela;
  enviarAuditoria: EnviarAuditoria;
}): Promise<DesfechoDaAuditoria> {
  const { documento, registro, acoes } = args;
  const par = registro.apresentar(documento);
  acoes.setCalculation(documento);
  if (typeof documento.executionId === 'string') acoes.setExibicao({ tipo: 'execucao', executionId: documento.executionId });
  acoes.setExcludedIds(documento.metadata?.excludedRespondentIds || []);
  acoes.setAiReview(null);
  acoes.setAudit(null);
  const r = await solicitarAuditoria({ documento, par, registro, enviar: args.enviarAuditoria, aplicar: acoes.setAudit });
  if (r === 'indisponivel') console.log('Auditoria não disponível');
  return r;
}

/**
 * A apresentação da carga inicial: o documento que `carregarApresentacaoInicial` escolheu, e a
 * auditoria dele. (O restante da carga, projeto, respondentes e demografia, segue na página.)
 */
export async function apresentarCargaInicial(args: {
  documento: Record<string, any>;
  exibicao: Exibicao;
  registro: RegistroDaApresentacao;
  acoes: AcoesDaTela;
  enviarAuditoria: EnviarAuditoria;
}): Promise<DesfechoDaAuditoria> {
  const { documento, registro, acoes } = args;
  const par = registro.apresentar(documento);
  acoes.setCalculation(documento);
  acoes.setExibicao(args.exibicao);
  // ⚠ As exclusões da carga inicial NÃO são escritas aqui: a página as escreve, no texto de antes, porque
  //   a âncora A.33 (`scripts/a33-payload-referencia.cjs`) fixa esse fragmento da tela.
  const r = await solicitarAuditoria({ documento, par, registro, enviar: args.enviarAuditoria, aplicar: acoes.setAudit });
  if (r === 'indisponivel') console.log('Auditoria não disponível');
  return r;
}

/**
 * O caso geral: produz uma resposta assíncrona sobre a apresentação do par `par` e a escreve SE o par
 * ainda for o da apresentação corrente. Usado onde a resposta não tem os desfechos da auditoria (a
 * validação externa). A exceção de `produzir` NÃO é capturada aqui: quem chama decide.
 */
export async function escreverSeVigente<T>(
  registro: RegistroDaApresentacao,
  par: ParDaApresentacao,
  produzir: () => Promise<T>,
  escrever: (valor: T) => void
): Promise<'escrita' | 'descartada'> {
  const valor = await produzir();
  if (!registro.conferir(par).aceita) return 'descartada';
  escrever(valor);
  return 'escrita';
}

export const MENSAGEM_DA_AUDITORIA_INDISPONIVEL =
  'A auditoria não está disponível para este cálculo. O cálculo foi concluído e está apresentado; a auditoria não foi atualizada.';

export type DesfechoDoRecalculo = 'concluido' | 'concluido-sem-auditoria' | 'pendente' | 'recusado' | 'falhou' | 'bloqueado';

/**
 * O recálculo com exclusões.
 *
 * ⚠ **Dois tratamentos de erro, de propósito separados.**
 *   - o do CÁLCULO (`catch` interno): o cálculo não aconteceu ou o seu estado não pôde ser escrito, e o
 *     estado local TEM de voltar (exclusões do que está apresentado) e a mensagem é de erro de
 *     recálculo;
 *   - o da AUDITORIA (depois do cálculo concluído): o cálculo já foi confirmado e já está apresentado;
 *     a falha da auditoria NÃO reverte nada e só acrescenta o aviso de que a auditoria não está
 *     disponível. Antes de A4 (e antes de F07, em `317767a`) os dois estavam no mesmo `try`: uma
 *     falha da auditoria deixava a tela com o resultado novo, as exclusões e o parecer ANTIGOS, e
 *     "Erro de conexão ao recalcular".
 */
export async function recalcularResultados(args: {
  projectId: string;
  /** As exclusões do PEDIDO. */
  exclusoes: string[];
  /** As exclusões do documento que está apresentado AGORA (para onde voltar se o cálculo falhar). */
  exclusoesApresentadas: string[];
  executar: (parametros: { projectId: string; excludedRespondentIds: string[] }) => Promise<ResultadoDeNovaAcao>;
  /**
   * F07 A4, item 4: `false` enquanto houver pedido de cálculo anterior SEM DECISÃO da pessoa
   * (`lib/retomada-com-confirmacao.ts`). Nesse caso nenhum cálculo novo é pedido. Omitido = liberado.
   */
  liberado?: () => boolean;
  registro: RegistroDaApresentacao;
  acoes: AcoesDaTela;
  enviarAuditoria: EnviarAuditoria;
}): Promise<DesfechoDoRecalculo> {
  const { projectId, exclusoes, exclusoesApresentadas, registro, acoes } = args;
  if (args.liberado && !args.liberado()) {
    acoes.setExcludedIds(exclusoesApresentadas); // o chamador já trocou as exclusões locais: voltam
    acoes.acrescentarAviso(MENSAGEM_DE_ACAO_BLOQUEADA);
    return 'bloqueado';
  }
  acoes.setIsRecalculating(true);
  acoes.setLoading(true); // Bloquear UI geral
  try {
    let documentoNovo: Record<string, any>;
    let par: ParDaApresentacao;
    try {
      // F07 A1: o pedido tem `requestId`, e a intenção fica guardada no navegador até o servidor
      // confirmar. `data.calculation` é a EXECUÇÃO registrada (`executions/{executionId}`).
      const { desfecho, persistida } = await args.executar({ projectId, excludedRespondentIds: exclusoes });

      if (desfecho.situacao === 'pendente') {
        acoes.setError(
          `Sem confirmação do servidor (${desfecho.motivo}). O pedido permanece guardado neste navegador: ao reabrir esta página ele é consultado, e a execução, se foi criada, é recuperada sem novo cálculo.`
        );
        acoes.setExcludedIds(exclusoesApresentadas);
        return 'pendente';
      }
      const data = desfecho.resposta.corpo;

      if (desfecho.situacao !== 'confirmada') {
        acoes.setError(data.error || 'Erro ao recalcular');
        // Reverter estado local em caso de erro
        acoes.setExcludedIds(exclusoesApresentadas);
        return 'recusado';
      }

      if (!persistida) {
        acoes.acrescentarAviso(
          'O armazenamento do navegador não está disponível: se esta página fosse recarregada durante o pedido, a execução não poderia ser recuperada.'
        );
      }

      // ── O ESTADO DO CÁLCULO CONFIRMADO, completo, ANTES da auditoria ──────────────────────────
      documentoNovo = data.calculation;
      par = registro.apresentar(documentoNovo);
      acoes.setCalculation(documentoNovo);
      // F07 A2: a execução nova é a EXIBIDA, e entra na lista. ⚠ Isso não a torna a referência.
      if (typeof documentoNovo?.executionId === 'string') {
        acoes.setExibicao({ tipo: 'execucao', executionId: documentoNovo.executionId });
        acoes.setExecucaoRecemCalculada(documentoNovo);
      }
      acoes.setExcludedIds(exclusoes); // as exclusões do PEDIDO
      // Limpar o parecer anterior e a auditoria anterior pois os dados mudaram (a auditoria anterior
      // é de OUTRA execução e não pode sobreviver a uma falha da nova)
      acoes.setAiReview(null);
      acoes.setAudit(null);
    } catch (e: any) {
      // ⚠ Só chega aqui falha do CÁLCULO (ou da escrita do seu estado). A auditoria NÃO está neste `try`.
      console.error('Erro no recálculo:', e);
      acoes.setError('Erro de conexão ao recalcular: ' + e.message);
      acoes.setExcludedIds(exclusoesApresentadas);
      return 'falhou';
    }

    // ── A AUDITORIA, com tratamento de erro PRÓPRIO ───────────────────────────────────────────
    const r = await solicitarAuditoria({ documento: documentoNovo, par, registro, enviar: args.enviarAuditoria, aplicar: acoes.setAudit });
    if (r === 'indisponivel') {
      console.log('Auditoria não disponível');
      acoes.acrescentarAviso(MENSAGEM_DA_AUDITORIA_INDISPONIVEL);
      return 'concluido-sem-auditoria';
    }
    return 'concluido';
  } finally {
    acoes.setIsRecalculating(false);
    acoes.setLoading(false);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// O Parecer IA: o par está implementado; a CONDUTA ainda é a de antes (decisão 5-B)
// ─────────────────────────────────────────────────────────────────────────────

export type CondutaDoParecerTardio = 'aplicar' | 'descartar';

/**
 * ⚠⚠ **PONTO DO CÓDIGO ONDE ENTRA A DECISÃO 5-B** (a resposta tardia do Parecer IA).
 *
 * Uma resposta do Parecer IA fora do par é aquela cujo pedido foi feito numa apresentação que a tela
 * já deixou. Há duas condutas defensáveis, e levam a telas diferentes:
 *
 *   1. `'descartar'`: nada é escrito. Custo: trabalho perdido e uma chamada paga ao modelo jogada fora,
 *      sem que a pessoa saiba que existiu;
 *   2. manter em quarentena visível, pelo desenho de A.27. Custo: um parecer sobre outros números
 *      convive na tela com os números apresentados, e a leitura depende do qualificador. (Não
 *      implementada: exigiria um estado novo.)
 *
 * **Nesta etapa a função devolve `'aplicar'`, que é a conduta de ANTES de A4:** a resposta é escrita
 * mesmo fora do par. Isso é deliberado: a entrega manda NÃO alterar a conduta do Parecer tardio antes
 * da decisão do autor. A conferência do par já é feita e registrada (`console.warn`); só a conduta
 * falta. Quando a decisão 5-B for tomada, é ESTA função que muda.
 */
export function condutaDoParecerForaDoPar(_conferencia: ConferenciaDoPar): CondutaDoParecerTardio {
  return 'aplicar';
}

export interface DecisaoDeEscritaDoParecer {
  escreve: boolean;
  conferencia: ConferenciaDoPar;
}

/** Chamada pelos três pontos em que `runAiReview` escreve `aiReview` (sucesso, erro do servidor e exceção). */
export function decidirEscritaDoParecer(registro: RegistroDaApresentacao, parDoPedido: ParDaApresentacao): DecisaoDeEscritaDoParecer {
  const conferencia = registro.conferir(parDoPedido);
  if (conferencia.aceita) return { escreve: true, conferencia };
  const conduta = condutaDoParecerForaDoPar(conferencia);
  console.warn(
    `[AI-REVIEW] Resposta fora do par da apresentação corrente (${conferencia.motivo}). Conduta ${conduta === 'aplicar' ? 'ainda vigente de antes de A4: a resposta É escrita (decisão 5-B pendente)' : 'descartar'}.`
  );
  return { escreve: conduta === 'aplicar', conferencia };
}
