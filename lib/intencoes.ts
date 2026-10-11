/**
 * lib/intencoes.ts
 *
 * **F07: a INTENÇÃO de uma ação que cria registro no servidor, guardada no navegador até o servidor
 * confirmar.** Sem dependência de Node e sem acesso direto a `window`: o armazenamento e o envio
 * são injetados, e é por isso que o comportamento é testável sem navegador.
 *
 * O problema que isto resolve: o servidor pode ter criado a execução e a resposta se perdeu (rede
 * caiu, aba fechada, recarga). Se a tela só guardasse o pedido em memória, a próxima ação geraria
 * um `requestId` NOVO e criaria uma segunda execução. Guardar a intenção, com o próprio `requestId`,
 * permite RETOMAR: reenviar o MESMO pedido, e o servidor devolve a execução já registrada sem
 * calcular de novo.
 *
 * Tipos: `calculo` (A1, identificado pelo `requestId`) e `escolha` (A2, identificado pelo `operationId`).
 * As regras abaixo valem para os dois.
 *
 * Regras (A1):
 *   - **uma entrada por intenção**, com o próprio identificador na chave: duas intenções do mesmo
 *     projeto convivem, e registrar a segunda nunca apaga a primeira;
 *   - a entrada guarda `projectId` e os parâmetros (inclusive `excludedRespondentIds`), o bastante
 *     para reenviar o pedido sem depender do estado da tela;
 *   - **só a intenção CONFIRMADA é removida**, e só a dela: confirmada é resposta de sucesso, ou
 *     recusa definitiva do servidor (4xx, exceto 408 e 429). Erro de rede, 5xx, 408, 429 e resposta
 *     ilegível MANTÊM a entrada: o servidor pode ter criado o registro;
 *   - ao montar a tela, `retomarPendentes` consulta cada intenção do projeto e só então a tela libera
 *     nova ação.
 *
 * ⚠ **O QUE ISTO NÃO GARANTE.**
 *   - O armazenamento do navegador pode estar indisponível (janela privada, dados bloqueados) ou ser
 *     apagado. Nesse caso `registrarIntencao` devolve `false`, a ação segue, e a tela precisa dizer
 *     que a recuperação não está protegida. Sem a entrada, a recarga volta ao comportamento de
 *     antes: uma nova ação cria nova execução.
 *   - A entrada pertence a ESTE navegador. Outro dispositivo, ou o mesmo em outro perfil, não a vê.
 *   - Retomar uma intenção cujo pedido NUNCA chegou ao servidor calcula agora, com os dados de
 *     agora. A execução resultante traz o próprio `calculatedAt`, e a tela avisa que o cálculo foi
 *     feito na retomada (`recuperada: false`).
 */

export interface Armazenamento {
  readonly length: number;
  key(indice: number): string | null;
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

export const PREFIXO_DE_INTENCAO = 'ahp:intencao:';

export interface IntencaoDeCalculo {
  tipo: 'calculo';
  /** O `requestId` do pedido de cálculo. */
  id: string;
  projectId: string;
  excludedRespondentIds: string[];
  criadaEm: string;
}

/**
 * A2: a escolha da referência. O identificador é o `operationId`, que o servidor VINCULA ao conteúdo
 * (projeto, execução, revisão esperada, justificativa): reenviar a mesma intenção reenvia o mesmo
 * conteúdo, e é por isso que a entrada guarda tudo isso.
 */
export interface IntencaoDeEscolha {
  tipo: 'escolha';
  /** O `operationId` da escolha. */
  id: string;
  projectId: string;
  executionId: string;
  expectedRevision: number;
  justification: string;
  criadaEm: string;
}

export type Intencao = IntencaoDeCalculo | IntencaoDeEscolha;
export type TipoDeIntencao = Intencao['tipo'];

export function chaveDaIntencao(tipo: TipoDeIntencao, id: string): string {
  return `${PREFIXO_DE_INTENCAO}${tipo}:${id}`;
}

/** O navegador, ou `null` se o acesso lançar (alguns ambientes lançam só ao ler `localStorage`). */
export function armazenamentoDoNavegador(): Armazenamento | null {
  try {
    if (typeof window === 'undefined') return null;
    const a = window.localStorage;
    return a ?? null;
  } catch {
    return null;
  }
}

function eIntencao(x: any): x is Intencao {
  if (!x || typeof x !== 'object') return false;
  if (x.tipo === 'calculo') {
    return (
      typeof x.id === 'string' &&
      typeof x.projectId === 'string' &&
      Array.isArray(x.excludedRespondentIds) &&
      x.excludedRespondentIds.every((e: unknown) => typeof e === 'string') &&
      typeof x.criadaEm === 'string'
    );
  }
  if (x.tipo === 'escolha') {
    return (
      typeof x.id === 'string' &&
      typeof x.projectId === 'string' &&
      typeof x.executionId === 'string' &&
      Number.isInteger(x.expectedRevision) &&
      x.expectedRevision >= 0 &&
      typeof x.justification === 'string' &&
      typeof x.criadaEm === 'string'
    );
  }
  return false;
}

/** `true` se gravou; `false` se não há armazenamento ou a gravação falhou. */
export function registrarIntencao(arm: Armazenamento | null, intencao: Intencao): boolean {
  if (!arm) return false;
  try {
    arm.setItem(chaveDaIntencao(intencao.tipo, intencao.id), JSON.stringify(intencao));
    return true;
  } catch {
    return false;
  }
}

/** Remove SÓ a entrada nomeada. */
export function removerIntencao(arm: Armazenamento | null, tipo: TipoDeIntencao, id: string): void {
  if (!arm) return;
  try {
    arm.removeItem(chaveDaIntencao(tipo, id));
  } catch {
    /* sem armazenamento: nada a remover */
  }
}

export interface ListaDeIntencoes {
  intencoes: Intencao[];
  /** Chaves com prefixo de intenção cujo conteúdo não pôde ser lido. NÃO são removidas. */
  ilegiveis: string[];
  /** `false` se o armazenamento não pôde ser percorrido: a lista vazia NÃO prova ausência de pendentes. */
  verificavel: boolean;
}

/** Percorre o armazenamento. Entradas ilegíveis são relatadas, e não descartadas em silêncio. */
export function listarIntencoes(
  arm: Armazenamento | null,
  filtro: { tipo?: TipoDeIntencao; projectId?: string } = {}
): ListaDeIntencoes {
  if (!arm) return { intencoes: [], ilegiveis: [], verificavel: false };
  const intencoes: Intencao[] = [];
  const ilegiveis: string[] = [];
  try {
    const chaves: string[] = [];
    for (let i = 0; i < arm.length; i++) {
      const k = arm.key(i);
      if (k && k.startsWith(PREFIXO_DE_INTENCAO)) chaves.push(k);
    }
    for (const k of chaves.sort()) {
      let v: any;
      try {
        v = JSON.parse(arm.getItem(k) ?? 'null');
      } catch {
        ilegiveis.push(k);
        continue;
      }
      if (!eIntencao(v) || chaveDaIntencao(v.tipo, v.id) !== k) {
        ilegiveis.push(k);
        continue;
      }
      if (filtro.tipo !== undefined && v.tipo !== filtro.tipo) continue;
      if (filtro.projectId !== undefined && v.projectId !== filtro.projectId) continue;
      intencoes.push(v);
    }
  } catch {
    return { intencoes: [], ilegiveis: [], verificavel: false };
  }
  return { intencoes, ilegiveis, verificavel: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Envio
// ─────────────────────────────────────────────────────────────────────────────

/** O que o envio devolve: o status HTTP e o corpo já lido (`null` se ilegível). */
export interface RespostaDoServidor {
  status: number;
  corpo: any;
}

export interface DependenciasDeEnvio {
  armazenamento: Armazenamento | null;
  /** Envia o pedido e devolve a resposta; LANÇA se a resposta não chegou (rede). */
  enviar: (intencao: Intencao) => Promise<RespostaDoServidor>;
  gerarId: () => string;
  agora?: () => string;
}

export type DesfechoDaIntencao =
  | { situacao: 'confirmada'; intencao: Intencao; resposta: RespostaDoServidor }
  | { situacao: 'recusada'; intencao: Intencao; resposta: RespostaDoServidor }
  | { situacao: 'pendente'; intencao: Intencao; motivo: string };

/**
 * Classifica o que o servidor respondeu. Recusa DEFINITIVA é 4xx (a validação ocorre antes de
 * qualquer registro), exceto 408 e 429, que dizem "tente de novo". 5xx e resposta ilegível NÃO
 * decidem: o registro pode ter sido criado antes da falha.
 */
export function classificarResposta(r: RespostaDoServidor): 'confirmada' | 'recusada' | 'pendente' {
  if (r.corpo && r.corpo.success === true && r.status >= 200 && r.status < 300) return 'confirmada';
  if (r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429 && r.corpo && typeof r.corpo === 'object') {
    return 'recusada';
  }
  return 'pendente';
}

/** Envia uma intenção JÁ registrada e aplica a regra de remoção. */
export async function resolverIntencao(deps: DependenciasDeEnvio, intencao: Intencao): Promise<DesfechoDaIntencao> {
  let resposta: RespostaDoServidor;
  try {
    resposta = await deps.enviar(intencao);
  } catch (e: any) {
    return { situacao: 'pendente', intencao, motivo: `sem resposta do servidor: ${e?.message ?? String(e)}` };
  }
  const classe = classificarResposta(resposta);
  if (classe === 'pendente') {
    return { situacao: 'pendente', intencao, motivo: `resposta sem decisão (status ${resposta.status})` };
  }
  removerIntencao(deps.armazenamento, intencao.tipo, intencao.id);
  return { situacao: classe, intencao, resposta };
}

export interface ResultadoDeNovaAcao {
  desfecho: DesfechoDaIntencao;
  /** `false`: a intenção não pôde ser gravada; uma recarga agora perderia o vínculo com o pedido. */
  persistida: boolean;
}

/**
 * Nova ação de cálculo: gera o `requestId`, REGISTRA a intenção e só então envia. Registrar antes de
 * enviar é o que torna a retomada possível depois de uma recarga no meio do envio.
 */
export async function executarCalculo(
  deps: DependenciasDeEnvio,
  parametros: { projectId: string; excludedRespondentIds?: string[] }
): Promise<ResultadoDeNovaAcao> {
  const intencao: IntencaoDeCalculo = {
    tipo: 'calculo',
    id: deps.gerarId(),
    projectId: parametros.projectId,
    excludedRespondentIds: [...(parametros.excludedRespondentIds ?? [])],
    criadaEm: (deps.agora ?? (() => new Date().toISOString()))(),
  };
  const persistida = registrarIntencao(deps.armazenamento, intencao);
  const desfecho = await resolverIntencao(deps, intencao);
  return { desfecho, persistida };
}

/**
 * A2: nova escolha de referência. Mesma regra de `executarCalculo`: gera o `operationId`, REGISTRA a
 * intenção e só então envia.
 */
export async function executarEscolha(
  deps: DependenciasDeEnvio,
  parametros: { projectId: string; executionId: string; expectedRevision: number; justification: string }
): Promise<ResultadoDeNovaAcao> {
  const intencao: IntencaoDeEscolha = {
    tipo: 'escolha',
    id: deps.gerarId(),
    projectId: parametros.projectId,
    executionId: parametros.executionId,
    expectedRevision: parametros.expectedRevision,
    justification: parametros.justification,
    criadaEm: (deps.agora ?? (() => new Date().toISOString()))(),
  };
  const persistida = registrarIntencao(deps.armazenamento, intencao);
  const desfecho = await resolverIntencao(deps, intencao);
  return { desfecho, persistida };
}

export interface RelatoDaRetomada {
  desfechos: DesfechoDaIntencao[];
  ilegiveis: string[];
  /** `false`: o armazenamento não pôde ser percorrido, e a ausência de pendentes NÃO está provada. */
  verificavel: boolean;
}

/**
 * Consulta CADA intenção pendente (do projeto, se informado), uma a uma, na ordem das chaves. Uma
 * que continue sem decisão permanece guardada; nenhuma apaga outra. A tela libera nova ação quando
 * a promessa se resolve.
 */
export async function retomarPendentes(
  deps: DependenciasDeEnvio,
  filtro: { tipo?: TipoDeIntencao; projectId?: string } = {}
): Promise<RelatoDaRetomada> {
  const lista = listarIntencoes(deps.armazenamento, filtro);
  const desfechos: DesfechoDaIntencao[] = [];
  for (const intencao of lista.intencoes) {
    desfechos.push(await resolverIntencao(deps, intencao));
  }
  return { desfechos, ilegiveis: lista.ilegiveis, verificavel: lista.verificavel };
}

// ─────────────────────────────────────────────────────────────────────────────
// Texto da retomada
// ─────────────────────────────────────────────────────────────────────────────

export interface AvisoDaRetomada {
  /** Uma frase por fato; vazio se não há o que dizer. */
  linhas: string[];
  /** Quantas intenções continuam guardadas sem decisão. */
  pendentes: number;
  /** Execuções devolvidas (recuperadas ou criadas na retomada), na ordem da consulta. */
  execucoes: { executionId: string; recuperada: boolean; projectId: string }[];
}

/**
 * O que a tela diz depois de consultar as pendentes. ⚠ A lista vazia NÃO é dita como "nenhum pedido
 * pendente" quando o armazenamento não pôde ser percorrido: aí o texto diz que não foi possível
 * verificar.
 */
export function resumirRetomada(relato: RelatoDaRetomada): AvisoDaRetomada {
  const linhas: string[] = [];
  const execucoes: AvisoDaRetomada['execucoes'] = [];
  let pendentes = 0;
  for (const d of relato.desfechos) {
    if (d.intencao.tipo === 'escolha') {
      const corpo = d.situacao === 'pendente' ? {} : d.resposta.corpo ?? {};
      if (d.situacao === 'confirmada') {
        linhas.push(
          corpo.recuperada === true
            ? `Uma escolha de referência feita antes (projeto ${d.intencao.projectId}, execução ${d.intencao.executionId}) já estava registrada; nada foi gravado de novo. A referência corrente é a revisão ${corpo.referencia?.revision ?? 'desconhecida'}.`
            : `Uma escolha de referência feita antes (projeto ${d.intencao.projectId}, execução ${d.intencao.executionId}) não havia chegado ao servidor e foi registrada agora, como a revisão ${corpo.referencia?.revision ?? 'desconhecida'}.`
        );
      } else if (d.situacao === 'recusada') {
        linhas.push(
          `O servidor recusou uma escolha de referência feita antes (projeto ${d.intencao.projectId}, execução ${d.intencao.executionId}): ${corpo.error ?? `status ${d.resposta.status}`}`
        );
      } else {
        pendentes++;
        linhas.push(
          `Uma escolha de referência feita antes (projeto ${d.intencao.projectId}, execução ${d.intencao.executionId}) segue sem confirmação (${d.motivo}). Ela permanece guardada neste navegador e será consultada de novo ao abrir a tela.`
        );
      }
      continue;
    }
    if (d.situacao === 'confirmada') {
      const corpo = d.resposta.corpo ?? {};
      const executionId = String(corpo.executionId ?? 'sem identificador na resposta');
      const recuperada = corpo.recuperada === true;
      execucoes.push({ executionId, recuperada, projectId: d.intencao.projectId });
      linhas.push(
        recuperada
          ? `Um pedido de cálculo feito antes (projeto ${d.intencao.projectId}) já estava registrado: a execução ${executionId} foi recuperada, sem novo cálculo.`
          : `Um pedido de cálculo feito antes (projeto ${d.intencao.projectId}) não havia chegado ao servidor: o cálculo foi feito agora e registrado como a execução ${executionId}.`
      );
    } else if (d.situacao === 'recusada') {
      linhas.push(
        `O servidor recusou um pedido de cálculo feito antes (projeto ${d.intencao.projectId}): ${d.resposta.corpo?.error ?? `status ${d.resposta.status}`}`
      );
    } else {
      pendentes++;
      linhas.push(
        `Um pedido de cálculo feito antes (projeto ${d.intencao.projectId}) segue sem confirmação (${d.motivo}). Ele permanece guardado neste navegador e será consultado de novo ao abrir a tela.`
      );
    }
  }
  if (relato.ilegiveis.length > 0) {
    linhas.push(`${relato.ilegiveis.length} registro(s) de pedido anterior não puderam ser lidos e foram mantidos sem alteração.`);
  }
  if (!relato.verificavel) {
    linhas.push('O armazenamento do navegador não está disponível: não foi possível verificar se há pedido anterior sem confirmação.');
  }
  return { linhas, pendentes, execucoes };
}

// ─────────────────────────────────────────────────────────────────────────────
// Envio do navegador (fora dos testes de unidade)
// ─────────────────────────────────────────────────────────────────────────────

/** A rota e o corpo de cada tipo de intenção. O identificador da intenção é o do pedido. */
export function pedidoDaIntencao(intencao: Intencao): { rota: string; corpo: Record<string, unknown> } {
  if (intencao.tipo === 'escolha') {
    return {
      rota: '/api/project-reference',
      corpo: {
        projectId: intencao.projectId,
        executionId: intencao.executionId,
        expectedRevision: intencao.expectedRevision,
        operationId: intencao.id,
        justification: intencao.justification,
      },
    };
  }
  return {
    rota: '/api/calculate',
    corpo: {
      projectId: intencao.projectId,
      excludedRespondentIds: intencao.excludedRespondentIds,
      requestId: intencao.id,
    },
  };
}

/** O envio real: POST na rota do tipo da intenção, com o identificador dela. */
export async function enviarPeloNavegador(intencao: Intencao): Promise<RespostaDoServidor> {
  const { rota, corpo: corpoDoPedido } = pedidoDaIntencao(intencao);
  const resposta = await fetch(rota, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpoDoPedido),
  });
  let corpo: any = null;
  try {
    corpo = await resposta.json();
  } catch {
    corpo = null;
  }
  return { status: resposta.status, corpo };
}

export function dependenciasDoNavegador(): DependenciasDeEnvio {
  return {
    armazenamento: armazenamentoDoNavegador(),
    enviar: enviarPeloNavegador,
    gerarId: () => crypto.randomUUID(),
  };
}
