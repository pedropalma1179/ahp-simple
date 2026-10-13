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
 *   3. **O Parecer IA tem o par e a conduta decidida** (decisão 5-B, tomada pelo autor: a resposta tardia é
 *      DESCARTADA): ver `condutaDoParecerForaDoPar`. F07 A7: o indicador de "analisando" e a identificação
 *      do Parecer também pertencem à apresentação que a tela deixou: ver `concluirPedidoDoParecer`.
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
  /**
   * F07 A7, V3: a identificação da execução em que o Parecer FOI PEDIDO (`execucaoDoParecer` da página). Fica
   * fora do objeto `aiReview`, então `setAiReview(null)` não a retira: quem retira o Parecer retira também
   * esta.
   */
  setExecucaoDoParecer(identificacao: any): void;
  /**
   * F07 A7, V3: o indicador de "analisando" do Parecer. Pertence ao pedido da apresentação corrente; ao trocar
   * a apresentação, o do pedido antigo é desligado aqui (ver `concluirPedidoDoParecer`).
   */
  setAiReviewLoading(b: boolean): void;
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

export type DesfechoDaAuditoria = 'aplicada' | 'descartada' | 'sem-sucesso' | 'indisponivel' | 'indisponivel-tardia';

/**
 * Pede a auditoria de UMA apresentação e escreve a resposta SE o par ainda for o da apresentação
 * corrente.
 *
 *   - `indisponivel`: o envio ou a leitura do corpo lançou, e a apresentação que pediu a auditoria
 *     AINDA é a corrente. Nada é escrito, e quem chamou decide o que dizer (o recálculo avisa na tela);
 *   - `indisponivel-tardia` (F07 A5): o envio ou a leitura do corpo lançou, mas a tela JÁ deixou a
 *     apresentação que pediu a auditoria. Nada é escrito e NÃO há o que avisar sobre a tela de agora: o
 *     desfecho existe para preservar a informação de que houve falha (quem quiser, registra no log). A
 *     alternativa, conferir o par antes de devolver `indisponivel`, perderia essa informação;
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
    // ⚠ A5: a falha é da apresentação CORRENTE ou de uma que a tela já deixou? A conferência é feita AQUI,
    //   no retorno, contra a apresentação de agora, e o desfecho distingue as duas.
    return args.registro.conferir(args.par).aceita ? 'indisponivel' : 'indisponivel-tardia';
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
 * O registro no LOG de uma auditoria que falhou. Só registra: os dois chamadores que não têm onde avisar
 * (`exibirExecucaoEscolhida` e `apresentarCargaInicial`) continuam só registrando, como antes de A5. A
 * falha tardia tem texto próprio para que o log distinga as duas.
 */
export function registrarFalhaDaAuditoria(desfecho: DesfechoDaAuditoria): void {
  if (desfecho === 'indisponivel') console.log('Auditoria não disponível');
  else if (desfecho === 'indisponivel-tardia') console.log('Auditoria não disponível (de uma apresentação que a tela já deixou; sem aviso)');
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
  // F07 A7, V3: o Parecer retirado leva consigo a identificação, e o indicador do pedido antigo (se havia
  // um em voo) é desligado, porque a conclusão dele não o desligará mais (`concluirPedidoDoParecer`).
  acoes.setExecucaoDoParecer(null);
  acoes.setAiReviewLoading(false);
  const r = await solicitarAuditoria({ documento, par, registro, enviar: args.enviarAuditoria, aplicar: acoes.setAudit });
  registrarFalhaDaAuditoria(r);
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
  // F07 A7, V3: só o INDICADOR. Esta carga NÃO retira o Parecer (nem a identificação dele), como antes de A7:
  // o `aiReview` e a identificação formam um par, e retirá-los aqui seria mudar o que esta carga já fazia. O
  // indicador, ao contrário, ficaria ligado para sempre se um pedido em voo fosse deixado para trás, porque a
  // conclusão dele não o desliga mais quando o par não é o da apresentação corrente.
  acoes.setAiReviewLoading(false);
  // ⚠ As exclusões da carga inicial NÃO são escritas aqui: a página as escreve, no texto de antes, porque
  //   a âncora A.33 (`scripts/a33-payload-referencia.cjs`) fixa esse fragmento da tela.
  const r = await solicitarAuditoria({ documento, par, registro, enviar: args.enviarAuditoria, aplicar: acoes.setAudit });
  registrarFalhaDaAuditoria(r);
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

/** O que a validação externa escreve na tela. Genérico: o módulo não conhece o tipo do resultado. */
export interface AcoesDaValidacao<T> {
  setApresentacao(valor: T | null): void;
  setLoading(b: boolean): void;
}

/**
 * F07 A5, ponto 2: a tela passou a apresentar OUTRA coisa (outro `calculation`). Registra a nova
 * apresentação e RETIRA da tela o resultado da anterior, que seria mostrado sob os números de outra
 * execução e sem rótulo que o dissesse (o tipo do resultado não traz o identificador da execução).
 *
 * ⚠ O par (identidade, geração) de A4 protege a escrita FUTURA (`escreverSeVigente`); não protege o que
 * JÁ foi escrito. Esta função cuida do já escrito. As duas são necessárias e complementares: a limpeza
 * não impede a escrita tardia (que chega DEPOIS dela), e o par não retira o que já está na tela.
 *
 * `setLoading(false)`: o indicador de "validando" pertence ao pedido da apresentação que a tela deixou; se
 * ficasse ligado, a pessoa não poderia pedir a validação da apresentação nova até o pedido antigo
 * terminar. (A conclusão do pedido antigo não o desliga de novo: ver `pedirValidacaoDaApresentacao`.)
 */
export function trocarApresentacaoDaValidacao<T>(
  registro: RegistroDaApresentacao,
  documento: Record<string, any> | null | undefined,
  acoes: AcoesDaValidacao<T>
): ParDaApresentacao {
  const par = registro.apresentar(documento);
  acoes.setApresentacao(null);
  acoes.setLoading(false);
  return par;
}

/**
 * A pessoa pediu a validação da apresentação CORRENTE. O resultado só é escrito se a apresentação ainda
 * for a que originou o pedido (`escreverSeVigente`), e o indicador de "validando" só é desligado pelo
 * pedido que ainda é o da apresentação corrente: o `finally` de um pedido antigo não pode desligar o
 * indicador do pedido novo. A exceção de `produzir` NÃO é capturada aqui (como em `escreverSeVigente`).
 */
export async function pedirValidacaoDaApresentacao<T>(args: {
  registro: RegistroDaApresentacao;
  produzir: () => Promise<T>;
  acoes: AcoesDaValidacao<T>;
}): Promise<'escrita' | 'descartada'> {
  const { registro, produzir, acoes } = args;
  acoes.setLoading(true);
  acoes.setApresentacao(null);
  const par = registro.capturar();
  try {
    return await escreverSeVigente(registro, par, produzir, acoes.setApresentacao as (valor: T) => void);
  } finally {
    if (registro.conferir(par).aceita) acoes.setLoading(false);
  }
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
      // F07 A7, V3: ver `exibirExecucaoEscolhida`.
      acoes.setExecucaoDoParecer(null);
      acoes.setAiReviewLoading(false);
    } catch (e: any) {
      // ⚠ Só chega aqui falha do CÁLCULO (ou da escrita do seu estado). A auditoria NÃO está neste `try`.
      console.error('Erro no recálculo:', e);
      acoes.setError('Erro de conexão ao recalcular: ' + e.message);
      acoes.setExcludedIds(exclusoesApresentadas);
      return 'falhou';
    }

    // ── A AUDITORIA, com tratamento de erro PRÓPRIO ───────────────────────────────────────────
    const r = await solicitarAuditoria({ documento: documentoNovo, par, registro, enviar: args.enviarAuditoria, aplicar: acoes.setAudit });
    registrarFalhaDaAuditoria(r);
    if (r === 'indisponivel') {
      // ⚠ Só a falha da apresentação CORRENTE produz aviso: a mensagem afirma que o cálculo "está
      //   apresentado", o que seria falso para uma tela que já apresenta outra coisa (A5).
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
// O Parecer IA: o par, a conduta decidida (5-B: descartar) e o indicador (V3)
// ─────────────────────────────────────────────────────────────────────────────

export type CondutaDoParecerTardio = 'aplicar' | 'descartar';

/**
 * ⚠⚠ **PONTO DO CÓDIGO DA DECISÃO 5-B** (a resposta tardia do Parecer IA).
 *
 * Uma resposta do Parecer IA fora do par é aquela cujo pedido foi feito numa apresentação que a tela
 * já deixou. Havia duas condutas defensáveis, e levavam a telas diferentes:
 *
 *   1. `'descartar'`: nada é escrito. Custo: trabalho perdido e uma chamada paga ao modelo jogada fora,
 *      sem que a pessoa saiba que existiu;
 *   2. manter em quarentena visível, pelo desenho de A.27. Custo: um parecer sobre outros números
 *      convive na tela com os números apresentados, e a leitura depende do qualificador. (Exigiria um
 *      estado novo.)
 *
 * **O autor decidiu pela primeira (decisão 5-B): a resposta tardia é DESCARTADA.** Não há quarentena e
 * não há aviso novo na faixa; o descarte fica só no `console.warn` de `decidirEscritaDoParecer`. O custo
 * da conduta 1 (a chamada paga que se perde, sem a pessoa saber) foi aceito pelo autor ao decidir. O
 * valor `'aplicar'` continua no tipo apenas para que o texto do aviso dependa da conduta efetiva, e
 * nenhum caminho o devolve.
 */
export function condutaDoParecerForaDoPar(_conferencia: ConferenciaDoPar): CondutaDoParecerTardio {
  return 'descartar';
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
    `[AI-REVIEW] Resposta fora do par da apresentação corrente (${conferencia.motivo}). ${conduta === 'descartar' ? 'DESCARTADA (decisão 5-B): nada foi escrito na tela' : 'ESCRITA apesar de fora do par'}.`
  );
  return { escreve: conduta === 'aplicar', conferencia };
}

/**
 * F07 A7, V3 (propriedade 2): a CONCLUSÃO de um pedido do Parecer IA (o `finally` de `runAiReview`). O
 * indicador de "analisando" só é desligado pelo pedido que ainda é o da apresentação corrente.
 *
 * Por que isto é separado da decisão 5-B: descartar a resposta tardia (os três `return` de `runAiReview`)
 * NÃO impede o `finally` de rodar, porque um `return` dentro do `try` executa o `finally`. Sem esta
 * conferência, a conclusão de um pedido da apresentação X desligaria o indicador do pedido que a pessoa
 * fez depois, na apresentação Y (é o raciocínio de `pedirValidacaoDaApresentacao`, aplicado ao Parecer).
 *
 * O caso complementar é do outro lado: se a tela deixa X SEM que haja pedido novo, o indicador do pedido de
 * X não seria desligado por ninguém (a conclusão dele não o desliga mais). Quem o desliga é a troca de
 * apresentação (`exibirExecucaoEscolhida`, `apresentarCargaInicial` e `recalcularResultados`).
 *
 * ⚠ A conferência é lida AQUI, no retorno, contra a apresentação de agora; o par é o capturado ao clicar.
 *
 * @returns `true` se desligou o indicador; `false` se o pedido já não é o da apresentação corrente.
 */
export function concluirPedidoDoParecer(
  registro: RegistroDaApresentacao,
  parDoPedido: ParDaApresentacao,
  acoes: { setAiReviewLoading(b: boolean): void }
): boolean {
  if (!registro.conferir(parDoPedido).aceita) return false;
  acoes.setAiReviewLoading(false);
  return true;
}
