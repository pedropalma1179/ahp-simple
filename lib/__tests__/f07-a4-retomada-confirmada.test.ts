/**
 * F07, A4, item 4: CONFIRMAÇÃO antes de toda retomada de cálculo.
 *
 * O que muda: `retomarPendentes` (lib/intencoes.ts) não envia mais a intenção de CÁLCULO; devolve-a em
 * `aguardandoConfirmacao`. Só `confirmarReenvio` (e, pelas telas, `reenviarPorConfirmacao`), chamada por
 * AÇÃO da pessoa, a reenvia. A intenção de ESCOLHA continua sendo retomada sem confirmação. A
 * limitação conhecida e decidida (a confirmação vale para toda retomada de cálculo pelo endpoint atual,
 * porque não há consulta somente-leitura) está declarada em `lib/intencoes.ts`, junto do portão.
 *
 * Exercita o handler REAL de `app/api/calculate/route.ts`, `lib/intencoes.ts`,
 * `lib/retomada-com-confirmacao.ts`, `lib/fluxos-da-tela.ts` e o componente `ConfirmacaoDeRetomada`
 * (`renderToStaticMarkup`), com o Firestore DUPLO. ⚠ NENHUMA TELA É MONTADA: a fiação das duas páginas é
 * conferida por LEITURA do fonte (último bloco), e a leitura não prova o comportamento no navegador.
 */

import fixture from './fixtures/panel-2026.json';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));
jest.mock('firebase/firestore', () => require('./helpers/firestore-duplo').moduloFirestoreSimulado());

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const { duplo } = require('./helpers/firestore-duplo');
const { POST } = require('@/app/api/calculate/route');
const intencoes = require('@/lib/intencoes');
const retomada = require('@/lib/retomada-com-confirmacao');
const fluxos = require('@/lib/fluxos-da-tela');
const apresentacao = require('@/lib/apresentacao-corrente');
const ConfirmacaoDeRetomada = require('@/components/ConfirmacaoDeRetomada').default;
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;
const PROJETO = 'projeto-f07-a4';
const OUTRO = 'projeto-f07-a4-outro';
const RESPOSTAS = (fixture as any).responses as { id: string; judgments: any[] }[];
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function semearProjeto(id: string) {
  duplo.semear('projects', id, {
    name: `Painel ${id}`,
    description: 'fixture',
    alternatives: [
      { code: 'A1', name: 'Gêmeo Digital', description: '' },
      { code: 'A2', name: 'IA Temperatura', description: '' },
    ],
    updatedAt: '2026-06-01T10:00:00.000Z',
  });
  RESPOSTAS.forEach((r, i) => {
    duplo.semear('respondents', `${id}__${r.id}`, { projectId: id });
    duplo.semear('responses', `${id}__resp-${i}`, {
      projectId: id,
      respondentId: `${id}__${r.id}`,
      judgments: copia(r.judgments),
      completedAt: `2026-05-0${(i % 9) + 1}T12:00:00.000Z`,
    });
  });
}

function armazenamentoEmMemoria() {
  const mapa = new Map<string, string>();
  return {
    mapa,
    get length() { return mapa.size; },
    key: (i: number) => [...mapa.keys()][i] ?? null,
    getItem: (k: string) => (mapa.has(k) ? (mapa.get(k) as string) : null),
    setItem: (k: string, v: string) => { mapa.set(k, v); },
    removeItem: (k: string) => { mapa.delete(k); },
  };
}

/** O envio ao servidor REAL (o handler da rota), com a lista de tudo que saiu. */
function enviarParaARota(lista: any[]) {
  return async (intencao: any) => {
    lista.push(copia(intencao));
    const { rota, corpo } = intencoes.pedidoDaIntencao(intencao);
    expect(rota).toBe(intencao.tipo === 'calculo' ? '/api/calculate' : '/api/project-reference');
    const res = await POST({ json: async () => corpo } as any);
    return { status: res.status as number, corpo: await res.json() };
  };
}

const ids = (...x: string[]) => { let i = 0; return () => x[i++] ?? `id-extra-${i}`; };
const semRede = async () => { throw new Error('sem rede'); };

beforeEach(() => {
  duplo.reset();
  semearProjeto(PROJETO);
  semearProjeto(OUTRO);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => { jest.restoreAllMocks(); });

/** Um pedido de cálculo que NUNCA chegou: a rede caiu antes de enviar. */
async function pedidoQueNaoChegou(arm: any, id: string, projeto = PROJETO, excluidos: string[] = []) {
  await intencoes.executarCalculo({ armazenamento: arm, enviar: semRede, gerarId: ids(id) }, { projectId: projeto, excludedRespondentIds: excluidos });
}

/** Um pedido de cálculo que CHEGOU e cuja resposta se perdeu. */
async function pedidoQueChegou(arm: any, id: string, projeto = PROJETO) {
  const lista: any[] = [];
  const deps = {
    armazenamento: arm,
    enviar: async (i: any) => { await enviarParaARota(lista)(i); throw new Error('a resposta se perdeu'); },
    gerarId: ids(id),
  };
  await intencoes.executarCalculo(deps, { projectId: projeto });
}

// ═════════════════════════════════════════════════════════════════════════════
// O portão em retomarPendentes
// ═════════════════════════════════════════════════════════════════════════════

describe('A4.4: nada é enviado antes da confirmação', () => {
  test('(critério 1) com pedidos de cálculo guardados, a consulta NÃO envia nada: a lista de envios fica VAZIA e o servidor não cria execução', async () => {
    const arm = armazenamentoEmMemoria();
    await pedidoQueNaoChegou(arm, 'req-nunca-0001');
    await pedidoQueNaoChegou(arm, 'req-nunca-0002', OUTRO, [`${OUTRO}__${RESPOSTAS[0].id}`]);
    expect(arm.mapa.size).toBe(2);
    const enviados: any[] = [];
    const relato = await intencoes.retomarPendentes({ armazenamento: arm, enviar: enviarParaARota(enviados), gerarId: ids() }, { tipo: 'calculo' });
    expect(enviados).toEqual([]); // o duplo de envio registrou ZERO saídas
    expect(duplo.quantos('executions')).toBe(0);
    expect(duplo.quantos('executionRequests')).toBe(0);
    expect(relato.desfechos).toEqual([]);
    expect(relato.aguardandoConfirmacao.map((i: any) => i.id)).toEqual(['req-nunca-0001', 'req-nunca-0002']);
    expect(arm.mapa.size).toBe(2); // e nenhuma entrada foi removida
  });

  test('o mesmo vale para o pedido que CHEGOU: a consulta também não o reenvia (a tela não sabe qual dos dois casos é o seu)', async () => {
    const arm = armazenamentoEmMemoria();
    await pedidoQueChegou(arm, 'req-chegou-0001');
    expect(duplo.quantos('executions')).toBe(1);
    const enviados: any[] = [];
    const relato = await intencoes.retomarPendentes({ armazenamento: arm, enviar: enviarParaARota(enviados), gerarId: ids() }, { tipo: 'calculo', projectId: PROJETO });
    expect(enviados).toEqual([]);
    expect(relato.aguardandoConfirmacao).toHaveLength(1);
    expect(duplo.quantos('executions')).toBe(1);
    expect(arm.mapa.size).toBe(1);
  });

  test('armazenamento SEM pedido de cálculo: a lista de envios e a de espera ficam vazias (o duplo vazio não é "algo foi enviado")', async () => {
    const enviados: any[] = [];
    const relato = await intencoes.retomarPendentes({ armazenamento: armazenamentoEmMemoria(), enviar: enviarParaARota(enviados), gerarId: ids() }, { tipo: 'calculo' });
    expect(enviados).toEqual([]);
    expect(relato).toMatchObject({ desfechos: [], aguardandoConfirmacao: [], verificavel: true });
  });

  test('(critério 2) a confirmação envia o MESMO requestId e os MESMOS parâmetros, e o servidor registra o pedido com eles', async () => {
    const arm = armazenamentoEmMemoria();
    const excluidos = [`${PROJETO}__${RESPOSTAS[1].id}`];
    await pedidoQueNaoChegou(arm, 'req-confirma-001', PROJETO, excluidos);
    const guardada = JSON.parse(arm.mapa.get(intencoes.chaveDaIntencao('calculo', 'req-confirma-001')) as string);
    const enviados: any[] = [];
    const deps = { armazenamento: arm, enviar: enviarParaARota(enviados), gerarId: ids() };
    const relato = await intencoes.retomarPendentes(deps, { tipo: 'calculo' });
    expect(enviados).toEqual([]);
    const desfecho = await intencoes.confirmarReenvio(deps, relato.aguardandoConfirmacao[0]);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toEqual(guardada); // a intenção enviada é, campo a campo, a que foi guardada
    expect(intencoes.pedidoDaIntencao(enviados[0]).corpo).toEqual({ projectId: PROJETO, excludedRespondentIds: excluidos, requestId: 'req-confirma-001' });
    expect(desfecho.situacao).toBe('confirmada');
    expect(duplo.ler('executionRequests', 'req-confirma-001').excludedRespondentIds).toEqual(excluidos);
    expect(duplo.quantos('executions')).toBe(1);
    expect(arm.mapa.size).toBe(0); // confirmada: só ela sai
  });

  test('a confirmação do pedido que CHEGOU recupera a MESMA execução, sem calcular de novo', async () => {
    const arm = armazenamentoEmMemoria();
    await pedidoQueChegou(arm, 'req-chegou-0002');
    const idDaExecucao = duplo.ler('executionRequests', 'req-chegou-0002').executionId;
    const deps = { armazenamento: arm, enviar: enviarParaARota([]), gerarId: ids() };
    const relato = await intencoes.retomarPendentes(deps, { tipo: 'calculo' });
    const desfecho = await intencoes.confirmarReenvio(deps, relato.aguardandoConfirmacao[0]);
    expect(desfecho.situacao).toBe('confirmada');
    expect(desfecho.resposta.corpo.recuperada).toBe(true);
    expect(desfecho.resposta.corpo.executionId).toBe(idDaExecucao);
    expect(duplo.quantos('executions')).toBe(1);
  });

  test('(critério 3) a recusa mantém a entrada guardada e NÃO envia; a tela diz que continua pendente', async () => {
    const arm = armazenamentoEmMemoria();
    await pedidoQueNaoChegou(arm, 'req-recusa-0001');
    const enviados: any[] = [];
    const deps = { armazenamento: arm, enviar: enviarParaARota(enviados), gerarId: ids() };
    const rel = await intencoes.retomarPendentes(deps, { tipo: 'calculo' });
    let estado = retomada.estadoInicialDaRetomada(rel.aguardandoConfirmacao);
    expect(retomada.acaoNovaLiberada(estado)).toBe(false); // sem decisão: bloqueada
    const linha = retomada.recusarReenvio({ intencao: rel.aguardandoConfirmacao[0], ajustar: (f: any) => { estado = f(estado); } });
    expect(estado.pendencias[0].situacao).toBe('mantida');
    expect(enviados).toEqual([]);
    expect(duplo.quantos('executions')).toBe(0);
    expect(arm.mapa.has(intencoes.chaveDaIntencao('calculo', 'req-recusa-0001'))).toBe(true);
    expect(linha).toMatch(/continua pendente/);
    expect(linha).toMatch(/não foi reenviado/);
    expect(linha).toContain('permanece guardado');
    // recusar é uma DECISÃO: a ação nova volta a ser liberada, e o pedido continua guardado e dito pendente
    expect(retomada.acaoNovaLiberada(estado)).toBe(true);
    // e na próxima abertura da tela ele é oferecido de novo
    const dePoisDeReabrir = await intencoes.retomarPendentes(deps, { tipo: 'calculo' });
    expect(dePoisDeReabrir.aguardandoConfirmacao.map((i: any) => i.id)).toEqual(['req-recusa-0001']);
  });

  test('(critério 4) A DIFERENÇA ENTRE OS TIPOS: a intenção de ESCOLHA é retomada SEM confirmação, a de CÁLCULO espera', async () => {
    const arm = armazenamentoEmMemoria();
    await intencoes.executarEscolha(
      { armazenamento: arm, enviar: semRede, gerarId: ids('op-escolha-0001') },
      { projectId: PROJETO, executionId: 'exec-x', expectedRevision: 0, justification: 'j' }
    );
    await pedidoQueNaoChegou(arm, 'req-calculo-0001');
    expect(arm.mapa.size).toBe(2);
    const enviados: any[] = [];
    const enviar = async (i: any) => {
      enviados.push(copia(i));
      return { status: 200, corpo: { success: true, referencia: { revision: 1 }, recuperada: false } };
    };
    // sem filtro de tipo: as DUAS estão na lista
    const relato = await intencoes.retomarPendentes({ armazenamento: arm, enviar, gerarId: ids() });
    // a escolha foi enviada sem que ninguém confirmasse; o cálculo NÃO
    expect(enviados.map(e => [e.tipo, e.id])).toEqual([['escolha', 'op-escolha-0001']]);
    expect(relato.desfechos.map((d: any) => d.intencao.tipo)).toEqual(['escolha']);
    expect(relato.desfechos[0].situacao).toBe('confirmada');
    expect(relato.aguardandoConfirmacao.map((i: any) => i.id)).toEqual(['req-calculo-0001']);
    expect([...arm.mapa.keys()]).toEqual([intencoes.chaveDaIntencao('calculo', 'req-calculo-0001')]);
    // e com o filtro de escolha (como o componente da referência chama) o resultado é o mesmo para ela
    const arm2 = armazenamentoEmMemoria();
    await intencoes.executarEscolha({ armazenamento: arm2, enviar: semRede, gerarId: ids('op-escolha-0002') }, { projectId: PROJETO, executionId: 'exec-x', expectedRevision: 0, justification: 'j' });
    const so = await intencoes.retomarPendentes({ armazenamento: arm2, enviar, gerarId: ids() }, { tipo: 'escolha', projectId: PROJETO });
    expect(so.aguardandoConfirmacao).toEqual([]);
    expect(so.desfechos).toHaveLength(1);
  });

  test('`confirmarReenvio` só reenvia intenção de CÁLCULO: uma de escolha é recusada com exceção, e nada sai', async () => {
    const enviados: any[] = [];
    const escolha = { tipo: 'escolha', id: 'op-x', projectId: PROJETO, executionId: 'e', expectedRevision: 0, justification: 'j', criadaEm: 'c' };
    await expect(intencoes.confirmarReenvio({ armazenamento: null, enviar: enviarParaARota(enviados), gerarId: ids() }, escolha)).rejects.toThrow(/só reenvia intenção de cálculo/);
    expect(enviados).toEqual([]);
  });

  test('a limitação conhecida está declarada JUNTO DO PORTÃO, em lib/intencoes.ts', () => {
    const f = ler('lib/intencoes.ts');
    const i = f.indexOf('export async function retomarPendentes(');
    const antes = f.slice(f.lastIndexOf('/**', i), i);
    expect(antes).toContain('LIMITAÇÃO CONHECIDA E DECIDIDA');
    expect(antes).toContain('TODA retomada de cálculo pelo endpoint');
    expect(antes).toContain('NÃO se cria outro endpoint');
    expect(antes).toContain('Fora do portão: a intenção de `escolha`');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// O estado e o texto da confirmação
// ═════════════════════════════════════════════════════════════════════════════

describe('A4.4: o estado da retomada e o texto da confirmação', () => {
  const intencao = (id: string, extra: Record<string, unknown> = {}) => ({
    tipo: 'calculo', id, projectId: PROJETO, excludedRespondentIds: [], criadaEm: '2026-06-01T09:30:00.000Z', ...extra,
  });

  test('o texto traz o projeto, QUANDO foi criado, as exclusões e a frase de que o cálculo usará os dados de agora', () => {
    const t = retomada.textoDaConfirmacao(intencao('r1', { excludedRespondentIds: ['a', 'b'] }), 'Painel Piloto');
    const texto = t.linhas.join('\n');
    expect(texto).toContain(`Painel Piloto (${PROJETO})`);
    expect(texto).toContain('2026-06-01T09:30:00.000Z');
    expect(texto).toContain('Respondentes excluídos neste pedido: 2 (a, b).');
    expect(texto).toContain('usará os dados de agora');
    expect(texto).toContain('nunca chegou');
    expect(texto).toContain('recuperada, sem novo cálculo');
    expect(retomada.textoDaConfirmacao(intencao('r2')).linhas.join('\n')).toContain('Respondentes excluídos neste pedido: nenhum.');
    expect(retomada.textoDaConfirmacao(intencao('r3')).linhas[0]).toBe(`Projeto: ${PROJETO}.`);
  });

  test('a ação nova NÃO é liberada com pendência sem decisão ou em envio, e é liberada com a lista vazia, mantida ou resolvida', () => {
    let e = retomada.estadoInicialDaRetomada([intencao('r1'), intencao('r2')]);
    expect(retomada.acaoNovaLiberada(e)).toBe(false);
    e = retomada.manterPendente(e, 'r1');
    expect(retomada.acaoNovaLiberada(e)).toBe(false); // r2 ainda sem decisão
    e = retomada.comecarEnvio(e, 'r2');
    expect(e.pendencias.map((p: any) => p.situacao)).toEqual(['mantida', 'enviando']);
    expect(retomada.acaoNovaLiberada(e)).toBe(false); // em envio
    e = retomada.concluirEnvio(e, 'r2', { situacao: 'confirmada', intencao: intencao('r2'), resposta: { status: 200, corpo: { success: true, executionId: 'x', recuperada: true } } });
    expect(e.pendencias.map((p: any) => p.situacao)).toEqual(['mantida', 'resolvida']);
    expect(retomada.acaoNovaLiberada(e)).toBe(true);
    expect(retomada.acaoNovaLiberada({ pendencias: [] })).toBe(true);
  });

  test('um reenvio que segue SEM decisão do servidor deixa a pendência mantida (continua guardada), e uma recusa definitiva a resolve', () => {
    let e = retomada.comecarEnvio(retomada.estadoInicialDaRetomada([intencao('r1')]), 'r1');
    e = retomada.concluirEnvio(e, 'r1', { situacao: 'pendente', intencao: intencao('r1'), motivo: 'sem resposta do servidor: x' });
    expect(e.pendencias[0].situacao).toBe('mantida');
    expect(retomada.linhaDaPendenciaMantida(e.pendencias[0])).toMatch(/segue sem confirmação \(sem resposta do servidor: x\)\. Ele continua pendente/);
    let f = retomada.comecarEnvio(retomada.estadoInicialDaRetomada([intencao('r1')]), 'r1');
    f = retomada.concluirEnvio(f, 'r1', { situacao: 'recusada', intencao: intencao('r1'), resposta: { status: 400, corpo: { error: 'x' } } });
    expect(f.pendencias[0].situacao).toBe('resolvida');
  });

  test('as transições só valem a partir da situação certa (um segundo clique não reabre nem reenvia a decisão)', () => {
    const base = retomada.estadoInicialDaRetomada([intencao('r1')]);
    const mantida = retomada.manterPendente(base, 'r1');
    expect(retomada.comecarEnvio(mantida, 'r1')).toEqual(mantida);
    expect(retomada.manterPendente(retomada.comecarEnvio(base, 'r1'), 'r1').pendencias[0].situacao).toBe('enviando');
  });

  test('`reenviarPorConfirmacao`: marca o envio, reenvia pelo envio injetado, e devolve as linhas do desfecho para a faixa de avisos', async () => {
    const arm = armazenamentoEmMemoria();
    await pedidoQueNaoChegou(arm, 'req-orquestra-01');
    const enviados: any[] = [];
    const deps = { armazenamento: arm, enviar: enviarParaARota(enviados), gerarId: ids() };
    const rel = await intencoes.retomarPendentes(deps, { tipo: 'calculo' });
    let estado = retomada.estadoInicialDaRetomada(rel.aguardandoConfirmacao);
    const vistos: string[] = [];
    const { desfecho, linhas } = await retomada.reenviarPorConfirmacao({
      deps, intencao: rel.aguardandoConfirmacao[0],
      ajustar: (f: any) => { estado = f(estado); vistos.push(estado.pendencias[0].situacao); },
    });
    expect(vistos).toEqual(['enviando', 'resolvida']);
    expect(desfecho.situacao).toBe('confirmada');
    expect(linhas[0]).toMatch(/não havia chegado ao servidor: o cálculo foi feito agora/);
    expect(enviados).toHaveLength(1);
    expect(retomada.acaoNovaLiberada(estado)).toBe(true);
  });

  test('`reenviarPorConfirmacao`: um envio que LANÇA vira pendência mantida, e a exceção não escapa', async () => {
    const arm = armazenamentoEmMemoria();
    await pedidoQueNaoChegou(arm, 'req-orquestra-02');
    const rel = await intencoes.retomarPendentes({ armazenamento: arm, enviar: semRede, gerarId: ids() }, { tipo: 'calculo' });
    let estado = retomada.estadoInicialDaRetomada(rel.aguardandoConfirmacao);
    const { desfecho } = await retomada.reenviarPorConfirmacao({
      deps: { armazenamento: arm, enviar: semRede, gerarId: ids() }, intencao: rel.aguardandoConfirmacao[0],
      ajustar: (f: any) => { estado = f(estado); },
    });
    expect(desfecho.situacao).toBe('pendente');
    expect(estado.pendencias[0].situacao).toBe('mantida');
    expect(arm.mapa.size).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// O recálculo da tela de resultados não é liberado com pendência sem decisão
// ═════════════════════════════════════════════════════════════════════════════

describe('A4.4: `recalcularResultados` com pendência sem decisão', () => {
  function tela() {
    const f = {
      setCalculation: jest.fn(), setExibicao: jest.fn(), setExcludedIds: jest.fn(), setAiReview: jest.fn(), setAudit: jest.fn(),
      setExecucaoRecemCalculada: jest.fn(), setError: jest.fn(), setIsRecalculating: jest.fn(), setLoading: jest.fn(), acrescentarAviso: jest.fn(),
    };
    return f;
  }

  test('não pede cálculo algum, devolve as exclusões ao que está apresentado e avisa', async () => {
    const acoes = tela();
    const executar = jest.fn();
    const r = await fluxos.recalcularResultados({
      projectId: PROJETO, exclusoes: ['r1', 'r2'], exclusoesApresentadas: ['r1'],
      executar, liberado: () => false, registro: apresentacao.criarRegistroDaApresentacao(), acoes,
      enviarAuditoria: jest.fn(),
    });
    expect(r).toBe('bloqueado');
    expect(executar).not.toHaveBeenCalled();
    expect(acoes.setExcludedIds).toHaveBeenCalledWith(['r1']);
    expect(acoes.acrescentarAviso).toHaveBeenCalledWith(retomada.MENSAGEM_DE_ACAO_BLOQUEADA);
    expect(acoes.setCalculation).not.toHaveBeenCalled();
    expect(acoes.setLoading).not.toHaveBeenCalled(); // nem chegou a ligar o carregamento
  });

  test('liberado (ou sem o argumento), segue como antes', async () => {
    const executar = jest.fn(async () => ({ desfecho: { situacao: 'pendente', intencao: {}, motivo: 'm' }, persistida: true }));
    for (const liberado of [undefined, () => true]) {
      const acoes = tela();
      const r = await fluxos.recalcularResultados({
        projectId: PROJETO, exclusoes: ['r1'], exclusoesApresentadas: [], executar, liberado,
        registro: apresentacao.criarRegistroDaApresentacao(), acoes, enviarAuditoria: jest.fn(),
      });
      expect(r).toBe('pendente');
    }
    expect(executar).toHaveBeenCalledTimes(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// O componente (renderToStaticMarkup)
// ═════════════════════════════════════════════════════════════════════════════

describe('A4.4: o componente ConfirmacaoDeRetomada', () => {
  const intencao = (id: string, excl: string[] = []) => ({ tipo: 'calculo', id, projectId: PROJETO, excludedRespondentIds: excl, criadaEm: '2026-06-01T09:30:00.000Z' });
  const html = (estado: any, nome?: (p: string) => string | undefined) =>
    renderToStaticMarkup(React.createElement(ConfirmacaoDeRetomada, { estado, nomeDoProjeto: nome, onReenviar: () => undefined, onManter: () => undefined }));

  test('sem decisão: mostra projeto, quando, exclusões, a frase dos dados de agora e os dois botões', () => {
    const m = html(retomada.estadoInicialDaRetomada([intencao('r1', ['x'])]), () => 'Painel Piloto');
    expect(m).toContain('Painel Piloto');
    expect(m).toContain('2026-06-01T09:30:00.000Z');
    expect(m).toContain('Respondentes excluídos neste pedido: 1 (x).');
    expect(m).toContain('usará os dados de agora');
    expect(m).toContain('Reenviar este pedido');
    expect(m).toContain('Não reenviar agora (manter pendente)');
    expect(m).toContain('Nenhum novo cálculo será pedido enquanto você não decidir.');
  });

  test('mantida: diz que continua pendente e não oferece os botões; resolvida: some; sem pendência: nada', () => {
    const mantida = html(retomada.manterPendente(retomada.estadoInicialDaRetomada([intencao('r1')]), 'r1'));
    expect(mantida).toContain('continua pendente');
    expect(mantida).not.toContain('Reenviar este pedido');
    const resolvida = retomada.concluirEnvio(retomada.comecarEnvio(retomada.estadoInicialDaRetomada([intencao('r1')]), 'r1'), 'r1', { situacao: 'confirmada', intencao: intencao('r1'), resposta: { status: 200, corpo: {} } });
    expect(html(resolvida)).toBe('');
    expect(html({ pendencias: [] })).toBe('');
  });

  test('em envio: os dois botões ficam desabilitados', () => {
    const m = html(retomada.comecarEnvio(retomada.estadoInicialDaRetomada([intencao('r1')]), 'r1'));
    expect(m).toContain('Reenviando...');
    expect(ocorrencias(m, 'disabled=""')).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// A fiação, por LEITURA, e o levantamento das chamadas de retomada
// ═════════════════════════════════════════════════════════════════════════════

describe('A4.4: a fiação das páginas, por LEITURA (nenhuma tela é montada)', () => {
  const PROJETOS = 'app/decisor/projetos/page.tsx';
  const RESULTADOS = 'app/decisor/resultados/[projectId]/page.tsx';
  const REFERENCIA = 'components/ReferenciaDoProjeto.tsx';

  test('LEVANTAMENTO de `retomarPendentes(` em app/ e components/: três chamadas, duas de cálculo (com a confirmação) e uma de escolha (sem)', () => {
    // padrão: `retomarPendentes(`; escopo: app/ e components/ (fora de lib/ e dos testes), conferido com git grep na entrega
    const achados = [PROJETOS, RESULTADOS, REFERENCIA].map(a => [a, ocorrencias(ler(a), 'retomarPendentes(')]);
    expect(achados).toEqual([[PROJETOS, 1], [RESULTADOS, 1], [REFERENCIA, 1]]);
    expect(ler(PROJETOS)).toContain("retomarPendentes(dependenciasDoNavegador(), { tipo: 'calculo' })");
    expect(ler(RESULTADOS)).toContain("retomarPendentes(dependenciasDoNavegador(), { tipo: 'calculo', projectId })");
    expect(ler(REFERENCIA)).toContain("retomarPendentes(dependenciasDoNavegador(), { tipo: 'escolha', projectId })");
  });

  test('as duas páginas de cálculo guardam as pendências, renderizam a confirmação e só reenviam por `reenviarPorConfirmacao`; nenhuma chama `confirmarReenvio` direto', () => {
    for (const a of [PROJETOS, RESULTADOS]) {
      const f = ler(a);
      expect([a, ocorrencias(f, '<ConfirmacaoDeRetomada')]).toEqual([a, 1]);
      expect([a, ocorrencias(f, 'setRetomada(estadoInicialDaRetomada(relato.aguardandoConfirmacao))')]).toEqual([a, 1]);
      expect([a, ocorrencias(f, 'await reenviarPorConfirmacao({')]).toEqual([a, 1]);
      expect([a, ocorrencias(f, 'recusarReenvio({ intencao, ajustar: setRetomada })')]).toEqual([a, 1]);
      expect([a, ocorrencias(f, 'confirmarReenvio(')]).toEqual([a, 0]);
      expect([a, ocorrencias(f, 'resolverIntencao(')]).toEqual([a, 0]);
    }
    // o contêiner da referência (escolha) NÃO tem a confirmação
    expect(ocorrencias(ler(REFERENCIA), 'ConfirmacaoDeRetomada')).toBe(0);
  });

  test('projetos: o cálculo fica bloqueado com pendência sem decisão (guarda no manipulador, e o modal desabilita o botão)', () => {
    const f = ler(PROJETOS);
    expect(f).toContain('const bloqueadoPorPendencia = !acaoNovaLiberada(retomada);');
    // ⚠ F07 A6 (V1): o corpo de `handleCalculate` MOVEU para `calcularProjetoDaLista` (lib/fluxos-dos-projetos.ts).
    //   A guarda era conferida no manipulador; agora a página entrega `bloqueado: bloqueadoPorPendencia` (o valor do
    //   clique) e a guarda mora no módulo, ANTES do `await` (a ordem é conferida). A propriedade que o teste
    //   verificava é a mesma: com pendência sem decisão, nenhum envio.
    const i = f.indexOf('const handleCalculate = async (projectId: string) => {');
    expect(f.slice(i, i + 400)).toContain('bloqueado: bloqueadoPorPendencia,');
    const modulo = ler('lib/fluxos-dos-projetos.ts');
    expect(ocorrencias(modulo, 'if (bloqueado) {')).toBe(1);
    expect(modulo.indexOf('if (bloqueado) {')).toBeLessThan(modulo.indexOf('await executar('));
    expect(ocorrencias(f, 'bloqueadoPorPendencia={bloqueadoPorPendencia}')).toBe(1);
    expect(ocorrencias(f, 'disabled={calculating || bloqueadoPorPendencia || completedCount === 0}')).toBe(1);
  });

  test('resultados: o recálculo fica bloqueado com pendência sem decisão (`liberado` no fluxo, e os três controles desabilitados)', () => {
    const f = ler(RESULTADOS);
    expect(f).toContain('const bloqueadoPorPendencia = !acaoNovaLiberada(retomada);');
    expect(ocorrencias(f, 'liberado: () => acaoNovaLiberada(retomadaRef.current),')).toBe(1);
    expect(ocorrencias(f, 'disabled={isRecalculating || bloqueadoPorPendencia}')).toBe(3);
    expect(ocorrencias(f, 'disabled={isRecalculating}')).toBe(0);
  });

  test('`confirmarReenvio` é a única via de reenvio de cálculo: nenhum arquivo de app/ ou components/ chama `resolverIntencao`, `confirmarReenvio` ou `enviarPeloNavegador` diretamente', () => {
    const percorrer = (dir: string, saida: string[] = []): string[] => {
      for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) percorrer(rel, saida);
        else if (/\.(ts|tsx)$/.test(e.name)) saida.push(rel);
      }
      return saida;
    };
    const arquivos = [...percorrer('app'), ...percorrer('components')];
    const achados = arquivos.filter(a => /\b(resolverIntencao|confirmarReenvio|enviarPeloNavegador)\(/.test(ler(a)));
    expect(achados).toEqual([]);
  });
});
