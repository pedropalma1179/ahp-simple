/**
 * lib/__tests__/f07-a2-referencia.test.ts
 *
 * F07, entrega A2: a escolha da REFERÊNCIA do projeto, com revisão e histórico, e a apresentação dela.
 *
 * Exercita o handler REAL de `app/api/project-reference/route.ts`, o módulo real
 * `lib/escolha-de-referencia.ts`, as leituras reais de `lib/referencia-leitura.ts`, as funções
 * puras de `lib/referencia-do-projeto.ts`, o módulo real `lib/intencoes.ts` e a renderização do
 * painel `components/PainelDaReferencia.tsx` (`renderToStaticMarkup`). O Firestore é o DUPLO
 * COMPARTILHADO (`helpers/firestore-duplo.ts`). Dados sintéticos: nenhum dado de respondente, nenhuma
 * rede, nenhuma produção.
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.**
 *   - Comportamento do Firestore real sob contenção, nem a execução das regras de segurança (o teste
 *     de forma confere só chaves, tipos e as igualdades que as regras pedem).
 *   - O contêiner `components/ReferenciaDoProjeto.tsx` e a página de resultados: nenhuma tela é
 *     montada. Conferidos por `tsc`, `build` e pela leitura do fonte (último bloco).
 *   - Que a assinatura de mudanças (`onSnapshot`) avise em tempo hábil: a DECISÃO de avisar
 *     (`compararReferencia`) é testada; a entrega do evento pelo SDK, não.
 */

import crypto from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));
jest.mock('firebase/firestore', () => require('./helpers/firestore-duplo').moduloFirestoreSimulado());

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const { duplo } = require('./helpers/firestore-duplo');
const { POST: POST_REFERENCIA } = require('@/app/api/project-reference/route');
const { POST: POST_CALCULO } = require('@/app/api/calculate/route');
const intencoes = require('@/lib/intencoes');
const referencia = require('@/lib/referencia-do-projeto');
const leitura = require('@/lib/referencia-leitura');
const PainelDaReferencia = require('@/components/PainelDaReferencia').default;
const fixture = require('./fixtures/panel-2026.json');
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const P1 = 'projeto-f07-a2';
const P2 = 'projeto-f07-a2-outro';
const EXEC_A = 'exec-a-0000000001';
const EXEC_B = 'exec-b-0000000002';
const EXEC_C = 'exec-c-0000000003';
const EXEC_DO_P2 = 'exec-p2-000000004';
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function semearExecucao(id: string, projectId: string, extra: Record<string, unknown> = {}) {
  duplo.semear('executions', id, {
    projectId,
    requestId: `req-${id}`,
    executionId: id,
    engineVersion: 'ahp-bocr-motor-5.0.0',
    calculatedAt: '2026-06-01T12:00:00.000Z',
    includedRespondents: [],
    judgmentsDigest: {},
    responseCount: 12,
    ...extra,
  });
}

beforeEach(() => {
  duplo.reset();
  duplo.semear('projects', P1, { name: 'P1', updatedAt: '2026-06-01T10:00:00.000Z', alternatives: [] });
  duplo.semear('projects', P2, { name: 'P2', alternatives: [] });
  semearExecucao(EXEC_A, P1, { calculatedAt: '2026-06-01T12:00:00.000Z' });
  semearExecucao(EXEC_B, P1, { calculatedAt: '2026-06-02T12:00:00.000Z' });
  semearExecucao(EXEC_C, P1, { calculatedAt: '2026-06-03T12:00:00.000Z' });
  semearExecucao(EXEC_DO_P2, P2);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

let contador = 0;
const novaOp = () => `op-f07-a2-${String(++contador).padStart(6, '0')}`;

async function escolher(corpo: Record<string, unknown>) {
  const res = await POST_REFERENCIA({ json: async () => corpo } as any);
  return { status: res.status as number, corpo: await res.json() };
}

const pedido = (executionId: string, expectedRevision: number, extra: Record<string, unknown> = {}) => ({
  projectId: P1,
  executionId,
  expectedRevision,
  operationId: novaOp(),
  justification: `justificativa para ${executionId} a partir da revisão ${expectedRevision}`,
  ...extra,
});

const referenciaGravada = (p = P1) => duplo.ler('projectReference', p);
const eventos = () => duplo.todos('referenceChanges').map((d: any) => d.data).sort((a: any, b: any) => a.revision - b.revision);

// ===========================================================================================
// A2: a escolha
// ===========================================================================================

describe('A2.1: primeira escolha e escolhas seguintes', () => {
  test('a primeira escolha grava revisão 1, e o evento e a referência nascem JUNTOS com o MESMO instante', async () => {
    const p = pedido(EXEC_A, 0);
    const r = await escolher(p);
    expect(r.status).toBe(200);
    expect(r.corpo.success).toBe(true);
    expect(r.corpo.recuperada).toBe(false);

    const ref = referenciaGravada();
    expect(ref.revision).toBe(1);
    expect(Object.keys(ref).sort()).toEqual(['authorship', 'chosenAt', 'executionId', 'justification', 'operationId', 'revision']);
    const [ev] = eventos();
    expect(Object.keys(ev).sort()).toEqual(['authorship', 'chosenAt', 'executionId', 'expectedRevision', 'justification', 'operationId', 'projectId', 'revision']);
    expect(ev.revision).toBe(1);
    expect(ev.expectedRevision).toBe(0);
    expect(ev.revision).toBe(ev.expectedRevision + 1); // a regra de `referenceChanges`
    expect(ev.chosenAt).toBe(ref.chosenAt);
    expect(ev.operationId).toBe(p.operationId);
    expect(ref.operationId).toBe(p.operationId);
    expect(ev.authorship).toBe('nao-autenticada');
    expect(ref.authorship).toBe('nao-autenticada');
    // as duas escritas saíram na MESMA transação: uma só confirmação, com as duas
    expect(duplo.tentativas.filter((t: any) => t.desfecho === 'confirmada')).toHaveLength(1);
    expect(duplo.escritas.map((e: any) => `${e.op} ${e.col}`).sort()).toEqual(['set projectReference', 'set referenceChanges']);
    // e a resposta traz o que foi gravado
    expect(r.corpo.referencia).toEqual(ref);
    expect(r.corpo.evento).toEqual(ev);
  });

  test('a escolha seguinte grava revisão 2 por ATUALIZAÇÃO, e o registro anterior segue intacto', async () => {
    await escolher(pedido(EXEC_A, 0));
    const primeiroEvento = copia(eventos()[0]);
    const r = await escolher(pedido(EXEC_B, 1));
    expect(r.status).toBe(200);
    expect(referenciaGravada().revision).toBe(2);
    expect(referenciaGravada().executionId).toBe(EXEC_B);
    expect(eventos().map((e: any) => e.revision)).toEqual([1, 2]);
    expect(eventos()[0]).toEqual(primeiroEvento);
    expect(eventos()[1].expectedRevision).toBe(1);
    // a segunda escolha foi uma atualização da referência e uma criação do histórico
    const ultimas = duplo.escritas.slice(-2).map((e: any) => `${e.op} ${e.col}`).sort();
    expect(ultimas).toEqual(['set referenceChanges', 'update projectReference']);
  });
});

describe('A2.2: A, depois B, depois A de novo, com revisão ANTIGA, é recusado', () => {
  test('a terceira escolha parte da revisão 1 que a tela ainda via: 409 referencia-mudou, com a referência atual devolvida, e nada gravado', async () => {
    await escolher(pedido(EXEC_A, 0)); // rev 1
    await escolher(pedido(EXEC_B, 1)); // rev 2
    const antes = { escritas: duplo.escritas.length, ref: copia(referenciaGravada()), eventos: copia(eventos()) };

    const velha = await escolher(pedido(EXEC_A, 1)); // volta para A, vendo a revisão 1
    expect(velha.status).toBe(409);
    expect(velha.corpo.codigo).toBe('referencia-mudou');
    expect(velha.corpo.referencia.revision).toBe(2);
    expect(velha.corpo.referencia.executionId).toBe(EXEC_B);
    expect(duplo.escritas.length).toBe(antes.escritas);
    expect(referenciaGravada()).toEqual(antes.ref);
    expect(eventos()).toEqual(antes.eventos);

    // com a revisão certa, a mesma troca vale, e vira a revisão 3
    const certa = await escolher(pedido(EXEC_A, 2));
    expect(certa.status).toBe(200);
    expect(referenciaGravada().revision).toBe(3);
    expect(referenciaGravada().executionId).toBe(EXEC_A);
    expect(eventos().map((e: any) => e.revision)).toEqual([1, 2, 3]);
  });

  test('sem referência, só expectedRevision 0 é aceito: outro valor devolve referencia-mudou com referencia null', async () => {
    const r = await escolher(pedido(EXEC_A, 3));
    expect(r.status).toBe(409);
    expect(r.corpo.codigo).toBe('referencia-mudou');
    expect(r.corpo.referencia).toBeNull();
    expect(duplo.escritas).toEqual([]);
  });

  test('com referência, expectedRevision 0 devolve referencia-ja-existe com a referência atual', async () => {
    await escolher(pedido(EXEC_A, 0));
    const antes = duplo.escritas.length;
    const r = await escolher(pedido(EXEC_B, 0));
    expect(r.status).toBe(409);
    expect(r.corpo.codigo).toBe('referencia-ja-existe');
    expect(r.corpo.referencia.revision).toBe(1);
    expect(duplo.escritas.length).toBe(antes);
  });
});

describe('A2.3: duas escolhas CONCORRENTES da mesma expectedRevision', () => {
  /** As duas transações leem o mesmo estado antes de qualquer confirmação. */
  function forcarCorrida() {
    let chegadas = 0;
    let liberar!: () => void;
    const porta = new Promise<void>(r => (liberar = r));
    duplo.antesDaConfirmacao = async ({ tentativa }: { tentativa: number }) => {
      if (tentativa !== 1) return;
      if (++chegadas === 2) liberar();
      await porta;
    };
    return () => chegadas;
  }

  test('a partir da revisão 1: uma é efetiva (revisão 2) e a outra volta referencia-mudou com a referência atual', async () => {
    await escolher(pedido(EXEC_A, 0));
    const chegou = forcarCorrida();
    const [r1, r2] = await Promise.all([escolher(pedido(EXEC_B, 1)), escolher(pedido(EXEC_C, 1))]);

    expect(chegou()).toBe(2); // MEDIDO: as duas leram o mesmo estado antes de confirmar
    expect(duplo.tentativas.filter((t: any) => t.desfecho === 'repetida-por-contencao')).toHaveLength(1);
    const efetiva = [r1, r2].filter(r => r.status === 200);
    const recusada = [r1, r2].filter(r => r.status === 409);
    expect(efetiva).toHaveLength(1);
    expect(recusada).toHaveLength(1);
    expect(efetiva[0].corpo.referencia.revision).toBe(2);
    expect(recusada[0].corpo.codigo).toBe('referencia-mudou');
    // a recusada devolve a referência ATUAL, que é a da vencedora
    expect(recusada[0].corpo.referencia).toEqual(efetiva[0].corpo.referencia);
    expect(referenciaGravada()).toEqual(efetiva[0].corpo.referencia);
    expect(eventos().map((e: any) => e.revision)).toEqual([1, 2]); // UMA entrada nova, e não duas
  });

  test('a PRIMEIRA escolha concorrente (as duas esperam 0): uma é efetiva (revisão 1), a outra volta referencia-ja-existe', async () => {
    const chegou = forcarCorrida();
    const [r1, r2] = await Promise.all([escolher(pedido(EXEC_A, 0)), escolher(pedido(EXEC_B, 0))]);
    expect(chegou()).toBe(2);
    expect(duplo.tentativas.filter((t: any) => t.desfecho === 'repetida-por-contencao')).toHaveLength(1);
    const efetiva = [r1, r2].filter(r => r.status === 200);
    const recusada = [r1, r2].filter(r => r.status === 409);
    expect(efetiva).toHaveLength(1);
    expect(recusada).toHaveLength(1);
    expect(recusada[0].corpo.codigo).toBe('referencia-ja-existe');
    expect(recusada[0].corpo.referencia).toEqual(efetiva[0].corpo.referencia);
    expect(referenciaGravada().revision).toBe(1);
    expect(eventos()).toHaveLength(1);
  });
});

describe('A2.4: NENHUMA escrita parcial em qualquer recusa', () => {
  async function estadoBase() {
    await escolher(pedido(EXEC_A, 0));
    await escolher(pedido(EXEC_B, 1));
  }
  const instantaneo = () => ({
    escritas: duplo.escritas.length,
    ref: JSON.stringify(referenciaGravada()),
    eventos: JSON.stringify(eventos()),
    versaoRef: duplo.versao('projectReference', P1),
  });

  test.each([
    ['referencia-mudou', 409, () => pedido(EXEC_C, 1)],
    ['referencia-ja-existe', 409, () => pedido(EXEC_C, 0)],
    ['execucao-inexistente', 404, () => pedido('exec-que-nao-existe', 2)],
    ['execucao-de-outro-projeto', 409, () => pedido(EXEC_DO_P2, 2)],
  ])('%s: status %i, e a referência, o histórico e as versões ficam como estavam', async (codigo, status, fazer) => {
    await estadoBase();
    const antes = instantaneo();
    const r = await escolher((fazer as any)());
    expect(r.status).toBe(status);
    expect(r.corpo.codigo).toBe(codigo);
    expect(instantaneo()).toEqual(antes);
  });

  test('operationId reutilizado com QUALQUER campo diferente: 409, e nada muda', async () => {
    await estadoBase();
    const original = eventos()[0];
    const base = {
      projectId: original.projectId,
      executionId: original.executionId,
      expectedRevision: original.expectedRevision,
      operationId: original.operationId,
      justification: original.justification,
    };
    const antes = instantaneo();
    const variacoes: [string, Record<string, unknown>][] = [
      ['projectId', { projectId: P2 }],
      ['executionId', { executionId: EXEC_C }],
      ['expectedRevision', { expectedRevision: 5 }],
      ['justification', { justification: original.justification + ' (alterada)' }],
    ];
    for (const [campo, mudanca] of variacoes) {
      const r = await escolher({ ...base, ...mudanca });
      expect([campo, r.status, r.corpo.codigo]).toEqual([campo, 409, 'operationId-reutilizado']);
    }
    expect(instantaneo()).toEqual(antes);
  });

  test.each([
    ['operationId ausente', { operationId: undefined }],
    ['operationId curto', { operationId: 'curto' }],
    ['operationId com barra', { operationId: 'op/../outro-doc' }],
    ['expectedRevision negativa', { expectedRevision: -1 }],
    ['expectedRevision fracionária', { expectedRevision: 1.5 }],
    ['expectedRevision em texto', { expectedRevision: '1' }],
    ['justificativa vazia', { justification: '' }],
    ['justificativa só de espaços', { justification: '    ' }],
    ['justificativa que não é texto', { justification: 42 }],
    ['projectId ausente', { projectId: undefined }],
    ['executionId ausente', { executionId: undefined }],
  ])('%s: 400, antes de tocar o banco', async (_nome, mudanca) => {
    await estadoBase();
    const antes = instantaneo();
    duplo.leituras.length = 0;
    const r = await escolher({ ...pedido(EXEC_C, 2), ...(mudanca as object) });
    expect(r.status).toBe(400);
    expect(r.corpo.success).toBe(false);
    expect(duplo.leituras).toEqual([]); // recusado na validação, sem ler o banco
    expect(instantaneo()).toEqual(antes);
  });
});

describe('A2.5: reenvio devolve o evento e a referência CORRENTE, sem segunda entrada', () => {
  test('o mesmo operationId com o mesmo conteúdo: 200 recuperada, o evento original e a referência lida na transação', async () => {
    const p = pedido(EXEC_A, 0);
    const primeira = await escolher(p);
    const escritasAntes = duplo.escritas.length;
    duplo.leituras.length = 0;

    const reenvio = await escolher(p);
    expect(reenvio.status).toBe(200);
    expect(reenvio.corpo.recuperada).toBe(true);
    expect(reenvio.corpo.evento).toEqual(primeira.corpo.evento);
    expect(reenvio.corpo.referencia).toEqual(referenciaGravada());
    expect(duplo.escritas.length).toBe(escritasAntes);
    expect(eventos()).toHaveLength(1);
    // a referência foi lida DENTRO da transação, e não por leitura fora dela
    expect(duplo.leituras.filter((l: any) => l.col === 'projectReference').map((l: any) => l.via)).toEqual(['transacao']);
    expect(duplo.leituras.filter((l: any) => l.col === 'referenceChanges').map((l: any) => l.via)).toEqual(['transacao']);
  });

  test('se OUTRA escolha veio depois, o reenvio devolve o evento antigo e a referência de HOJE', async () => {
    const p1 = pedido(EXEC_A, 0);
    const primeira = await escolher(p1);
    await escolher(pedido(EXEC_B, 1)); // a referência agora é a revisão 2
    const escritasAntes = duplo.escritas.length;

    const reenvio = await escolher(p1);
    expect(reenvio.status).toBe(200);
    expect(reenvio.corpo.recuperada).toBe(true);
    expect(reenvio.corpo.evento).toEqual(primeira.corpo.evento);
    expect(reenvio.corpo.evento.revision).toBe(1);
    expect(reenvio.corpo.referencia.revision).toBe(2);
    expect(reenvio.corpo.referencia.executionId).toBe(EXEC_B);
    expect(duplo.escritas.length).toBe(escritasAntes);
    expect(eventos()).toHaveLength(2);
  });

  test('a execução é lida do BANCO: o cliente não diz a que projeto ela pertence', async () => {
    // O corpo só carrega `projectId` e `executionId`. Mandar o projeto B com a execução do projeto A é recusado.
    const r = await escolher({ ...pedido(EXEC_A, 0), projectId: P2 });
    expect(r.status).toBe(409);
    expect(r.corpo.codigo).toBe('execucao-de-outro-projeto');
    expect(duplo.escritas).toEqual([]);
    // e o corpo aceito não tem campo para o projeto da execução
    const fonte = fs.readFileSync(path.join(RAIZ, 'app', 'api', 'project-reference', 'route.ts'), 'utf8');
    expect(fonte).not.toMatch(/executionProjectId|execucaoProjectId/);
  });
});

describe('A2.6: a persistência da intenção de escolha segue a regra de A1', () => {
  function armazenamento() {
    const m = new Map<string, string>();
    return {
      mapa: m,
      get length() { return m.size; },
      key: (i: number) => [...m.keys()][i] ?? null,
      getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
      setItem: (k: string, v: string) => { m.set(k, v); },
      removeItem: (k: string) => { m.delete(k); },
    };
  }
  const ids = (...x: string[]) => { let i = 0; return () => x[i++] ?? `op-extra-${i}`; };
  const enviarParaARota = async (i: any) => {
    const { rota, corpo } = intencoes.pedidoDaIntencao(i);
    expect(rota).toBe('/api/project-reference');
    const res = await POST_REFERENCIA({ json: async () => corpo } as any);
    return { status: res.status as number, corpo: await res.json() };
  };
  const perdendoAResposta = (registro: any[]) => async (i: any) => {
    registro.push(await enviarParaARota(i));
    throw new Error('rede caiu antes da resposta chegar');
  };

  test('resposta perdida: a retomada devolve a escolha já registrada, sem segunda entrada', async () => {
    const arm = armazenamento();
    const vistas: any[] = [];
    const nova = await intencoes.executarEscolha(
      { armazenamento: arm, enviar: perdendoAResposta(vistas), gerarId: ids('op-cliente-0001') },
      { projectId: P1, executionId: EXEC_A, expectedRevision: 0, justification: 'primeira escolha' }
    );
    expect(nova.desfecho.situacao).toBe('pendente');
    expect(eventos()).toHaveLength(1);
    expect(arm.mapa.size).toBe(1);
    const guardada = JSON.parse([...arm.mapa.values()][0]);
    expect(guardada).toMatchObject({ tipo: 'escolha', id: 'op-cliente-0001', projectId: P1, executionId: EXEC_A, expectedRevision: 0, justification: 'primeira escolha' });

    const escritasAntes = duplo.escritas.length;
    const relato = await intencoes.retomarPendentes({ armazenamento: arm, enviar: enviarParaARota, gerarId: ids() }, { tipo: 'escolha', projectId: P1 });
    expect(relato.desfechos.map((d: any) => d.situacao)).toEqual(['confirmada']);
    expect(relato.desfechos[0].resposta.corpo.recuperada).toBe(true);
    expect(relato.desfechos[0].resposta.corpo.evento).toEqual(vistas[0].corpo.evento);
    expect(duplo.escritas.length).toBe(escritasAntes);
    expect(eventos()).toHaveLength(1);
    expect(arm.mapa.size).toBe(0);
    expect(intencoes.resumirRetomada(relato).linhas[0]).toMatch(/já estava registrada/);
  });

  test('depois de RECARREGAR e com DUAS escolhas pendentes no mesmo projeto: a segunda não apaga a primeira, e cada uma é consultada', async () => {
    const arm = armazenamento();
    const vistas: any[] = [];
    await intencoes.executarEscolha({ armazenamento: arm, enviar: perdendoAResposta(vistas), gerarId: ids('op-cliente-pend-1') }, { projectId: P1, executionId: EXEC_A, expectedRevision: 0, justification: 'um' });
    await intencoes.executarEscolha({ armazenamento: arm, enviar: perdendoAResposta(vistas), gerarId: ids('op-cliente-pend-2') }, { projectId: P1, executionId: EXEC_B, expectedRevision: 1, justification: 'dois' });
    expect(arm.mapa.size).toBe(2);
    expect(eventos().map((e: any) => e.revision)).toEqual([1, 2]);

    let fresco: any;
    jest.isolateModules(() => { fresco = require('@/lib/intencoes'); });
    const escritasAntes = duplo.escritas.length;
    const relato = await fresco.retomarPendentes({ armazenamento: arm, enviar: enviarParaARota, gerarId: ids() }, { tipo: 'escolha', projectId: P1 });
    expect(relato.desfechos.map((d: any) => d.situacao)).toEqual(['confirmada', 'confirmada']);
    expect(relato.desfechos.map((d: any) => d.resposta.corpo.recuperada)).toEqual([true, true]);
    // as duas devolvem a referência CORRENTE, que é a revisão 2
    expect(relato.desfechos.map((d: any) => d.resposta.corpo.referencia.revision)).toEqual([2, 2]);
    expect(duplo.escritas.length).toBe(escritasAntes);
    expect(arm.mapa.size).toBe(0);
  });

  test('o pedido nunca chegou e a referência mudou nesse meio tempo: a retomada é RECUSADA (referencia-mudou), e a entrada sai', async () => {
    const arm = armazenamento();
    await intencoes.executarEscolha(
      { armazenamento: arm, enviar: async () => { throw new Error('sem rede'); }, gerarId: ids('op-cliente-nunca') },
      { projectId: P1, executionId: EXEC_B, expectedRevision: 0, justification: 'nunca chegou' }
    );
    expect(eventos()).toHaveLength(0);
    await escolher(pedido(EXEC_A, 0)); // outra pessoa escolheu enquanto isso
    const antes = { ref: copia(referenciaGravada()), eventos: copia(eventos()) };

    const relato = await intencoes.retomarPendentes({ armazenamento: arm, enviar: enviarParaARota, gerarId: ids() }, { tipo: 'escolha', projectId: P1 });
    expect(relato.desfechos.map((d: any) => d.situacao)).toEqual(['recusada']);
    expect(relato.desfechos[0].resposta.corpo.codigo).toBe('referencia-ja-existe');
    expect(referenciaGravada()).toEqual(antes.ref);
    expect(eventos()).toEqual(antes.eventos);
    expect(arm.mapa.size).toBe(0);
    expect(intencoes.resumirRetomada(relato).linhas[0]).toMatch(/recusou uma escolha de referência/);
  });

  test('5xx MANTÉM a intenção de escolha; 409 (recusa definitiva) a remove, e só a ela', async () => {
    const arm = armazenamento();
    const cinco = await intencoes.executarEscolha(
      { armazenamento: arm, enviar: async () => ({ status: 503, corpo: null }), gerarId: ids('op-cliente-5xx0') },
      { projectId: P1, executionId: EXEC_A, expectedRevision: 0, justification: 'j' }
    );
    expect(cinco.desfecho.situacao).toBe('pendente');
    expect(arm.mapa.size).toBe(1);
    await escolher(pedido(EXEC_B, 0)); // agora a referência existe, e a revisão esperada 0 é recusada
    const recusada = await intencoes.executarEscolha(
      { armazenamento: arm, enviar: enviarParaARota, gerarId: ids('op-cliente-409x') },
      { projectId: P1, executionId: EXEC_A, expectedRevision: 0, justification: 'j2' }
    );
    expect(recusada.desfecho.situacao).toBe('recusada');
    expect(recusada.desfecho.resposta.status).toBe(409);
    expect([...arm.mapa.keys()]).toEqual([intencoes.chaveDaIntencao('escolha', 'op-cliente-5xx0')]);
  });

  test('a retomada de cálculo NÃO toca a intenção de escolha, e vice-versa', async () => {
    const arm = armazenamento();
    const quebrado = async () => { throw new Error('x'); };
    await intencoes.executarEscolha({ armazenamento: arm, enviar: quebrado, gerarId: ids('op-cliente-iso1') }, { projectId: P1, executionId: EXEC_A, expectedRevision: 0, justification: 'j' });
    await intencoes.executarCalculo({ armazenamento: arm, enviar: quebrado, gerarId: ids('req-cliente-iso1') }, { projectId: P1 });
    expect(arm.mapa.size).toBe(2);
    const soCalculo = await intencoes.retomarPendentes({ armazenamento: arm, enviar: async () => { throw new Error('ainda sem rede'); }, gerarId: ids() }, { tipo: 'calculo' });
    expect(soCalculo.desfechos).toHaveLength(1);
    expect(soCalculo.desfechos[0].intencao.tipo).toBe('calculo');
    expect(arm.mapa.size).toBe(2);
  });
});

// ===========================================================================================
// A2: a forma que as regras propostas exigem
// ===========================================================================================

describe('A2.7: a forma que as regras propostas exigem', () => {
  test('referenceChanges e projectReference têm as chaves, os tipos e os vínculos que as regras conferem', async () => {
    const p = pedido(EXEC_A, 0);
    await escolher(p);
    await escolher(pedido(EXEC_B, 1));
    const regras = fs.readFileSync(path.join(RAIZ, 'firestore-regras', 'firestore.rules'), 'utf8');
    const bloco = (inicio: string, fim: string) => regras.slice(regras.indexOf(inicio), fim ? regras.indexOf(fim) : undefined);
    const chaves = (t: string) => [...(t.match(/hasAll\(\[([^\]]*)\]\)/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(m => m[1]);

    const historico = eventos();
    for (const e of historico) {
      for (const k of chaves(bloco('match /referenceChanges/', 'match /projectReference/'))) expect(k in e).toBe(true);
      expect(Number.isInteger(e.revision) && Number.isInteger(e.expectedRevision)).toBe(true);
      expect(e.revision).toBe(e.expectedRevision + 1);
      expect(e.justification.length).toBeGreaterThan(0);
      expect(e.chosenAt.length).toBeGreaterThan(0);
      expect(e.authorship).toBe('nao-autenticada');
    }
    const ref = referenciaGravada();
    for (const k of chaves(bloco('match /projectReference/', ''))) expect(k in ref).toBe(true);
    expect(Number.isInteger(ref.revision)).toBe(true);
    expect(ref.authorship).toBe('nao-autenticada');
    // os vínculos conferidos por `getAfter`: o histórico da última revisão casa com a referência
    const ultimo = historico[historico.length - 1];
    expect(ultimo.operationId).toBe(ref.operationId);
    expect(ultimo.executionId).toBe(ref.executionId);
    expect(ultimo.revision).toBe(ref.revision);
    expect(ultimo.chosenAt).toBe(ref.chosenAt);
    expect(ultimo.justification).toBe(ref.justification);
    // a execução existe e é deste projeto (`execucaoDesteProjeto`)
    expect(duplo.ler('executions', ref.executionId).projectId).toBe(P1);
  });
});

// ===========================================================================================
// A2: os três estados, a atualidade e a mudança da referência (funções puras)
// ===========================================================================================

const refDe = (executionId: string, revision = 1): any => ({
  executionId, revision, operationId: `op-${executionId}-${revision}`, chosenAt: '2026-06-04T00:00:00.000Z', justification: 'j', authorship: 'nao-autenticada',
});

describe('A2.8: os TRÊS estados da apresentação, sempre nomeados', () => {
  const e = referencia.estadoDaApresentacao;

  test('referência escolhida: a tela exibe a execução que é a referência', () => {
    const r = e(refDe(EXEC_A, 3), { tipo: 'execucao', executionId: EXEC_A });
    expect(r.estado).toBe('referencia-escolhida');
    expect(r.texto).toMatch(/Referência escolhida do projeto/);
    expect(r.texto).toContain('revisão 3');
  });

  test('resultado anterior sem referência escolhida: documento anterior a F07 e nenhuma referência', () => {
    const r = e(null, { tipo: 'anterior-a-f07' });
    expect(r.estado).toBe('resultado-anterior-sem-referencia');
    expect(r.texto).toMatch(/sem referência escolhida/);
  });

  test('exibindo outra execução: a exibida NÃO é a referência', () => {
    const r = e(refDe(EXEC_A), { tipo: 'execucao', executionId: EXEC_B });
    expect(r.estado).toBe('outra-execucao');
    expect(r.texto).toMatch(/NÃO é a referência/);
    expect(r.texto).toContain(EXEC_B);
    expect(r.texto).toContain(EXEC_A);
  });

  test('execução exibida sem NENHUMA referência: ainda é "outra execução", com o qualificador de que não há referência', () => {
    const r = e(null, { tipo: 'execucao', executionId: EXEC_B });
    expect(r.estado).toBe('outra-execucao');
    expect(r.texto).toMatch(/ainda não tem referência escolhida/);
  });

  test('o documento anterior enquanto JÁ existe referência: não se diz "sem referência"; é "outra execução"', () => {
    const r = e(refDe(EXEC_A), { tipo: 'anterior-a-f07' });
    expect(r.estado).toBe('outra-execucao');
    expect(r.texto).not.toMatch(/sem referência escolhida\b(?!\))/);
    expect(r.texto).toMatch(/NÃO é a referência/);
  });

  test('toda combinação possível cai em UM dos três estados, com texto não vazio', () => {
    const refs = [null, refDe(EXEC_A), refDe(EXEC_B, 2)];
    const exib = [{ tipo: 'execucao', executionId: EXEC_A }, { tipo: 'execucao', executionId: EXEC_C }, { tipo: 'anterior-a-f07' }];
    const vistos = new Set<string>();
    for (const r of refs) for (const x of exib) {
      const a = e(r, x);
      expect(['referencia-escolhida', 'resultado-anterior-sem-referencia', 'outra-execucao']).toContain(a.estado);
      expect(a.texto.length).toBeGreaterThan(20);
      vistos.add(a.estado);
    }
    expect([...vistos].sort()).toEqual(['outra-execucao', 'referencia-escolhida', 'resultado-anterior-sem-referencia']);
  });
});

describe('A2.9: a atualidade em relação ao projeto, nos QUATRO estados', () => {
  const a = referencia.atualidadeDoProjeto;
  const T1 = '2026-06-01T10:00:00.000Z';
  const T2 = '2026-06-05T10:00:00.000Z';

  test('marcadores iguais: sem alteração identificada pelo marcador, e sem afirmar nada sobre respostas ou respondentes', () => {
    const r = a(T1, T1);
    expect(r.estado).toBe('sem-alteracao-identificada');
    expect(r.texto).toBe('sem alteração identificada pelo marcador de atualização do projeto');
    expect(r.limite).toMatch(/não registra mudanças nas respostas nem nos respondentes/);
    expect(r.limite).toMatch(/não afirma que elas não ocorreram/);
  });

  test('projeto posterior à execução: referência desatualizada em relação ao projeto, com as DUAS datas', () => {
    const r = a(T1, T2, 'referência');
    expect(r.estado).toBe('projeto-posterior');
    expect(r.texto).toContain('referência desatualizada em relação ao projeto');
    expect(r.texto).toContain(T1);
    expect(r.texto).toContain(T2);
    expect(a(T1, T2, 'execução exibida').texto).toContain('execução exibida desatualizada em relação ao projeto');
  });

  test('projeto ANTERIOR à execução: marcadores em ordem inesperada, com as duas datas', () => {
    const r = a(T2, T1);
    expect(r.estado).toBe('marcadores-fora-de-ordem');
    expect(r.texto).toContain('marcadores em ordem inesperada');
    expect(r.texto).toContain(T1);
    expect(r.texto).toContain(T2);
  });

  test.each([
    ['marcador da execução ausente (null)', null, T1, /marcador da execução está ausente/],
    ['marcador da execução ausente (undefined)', undefined, T1, /marcador da execução está ausente/],
    ['marcador do projeto ausente', T1, null, /marcador atual do projeto está ausente/],
    ['os dois ausentes', null, undefined, /os dois marcadores estão ausentes/],
    ['marcador da execução ilegível', 'ontem à tarde', T1, /marcador da execução está ausente ou ilegível/],
    ['marcador do projeto que não é texto', T1, 1780000000000, /marcador atual do projeto está ausente ou ilegível/],
    ['marcador vazio', '', T1, /marcador da execução está ausente/],
  ])('qualquer marcador ausente ou ilegível (%s): atualidade não verificável, e NUNCA "atual"', (_n, exec, proj, motivo) => {
    const r = a(exec, proj);
    expect(r.estado).toBe('nao-verificavel');
    expect(r.texto).toMatch(/^atualidade não verificável/);
    expect(r.texto).toMatch(motivo as RegExp);
    expect(r.texto).not.toMatch(/\batual\b(?! do projeto)/);
  });

  test('a comparação é em ORDEM TEMPORAL, e não por texto: fusos diferentes e formatos equivalentes', () => {
    // 10:00+02:00 é 08:00Z. Por texto, "…T09:00:00Z" < "…T10:00:00+02:00" (ordem inesperada); por instante,
    // 09:00Z é POSTERIOR a 08:00Z (projeto posterior).
    const porInstante = a('2026-06-01T10:00:00+02:00', '2026-06-01T09:00:00Z');
    expect(porInstante.estado).toBe('projeto-posterior');
    // formatos diferentes do MESMO instante são iguais
    expect(a('2026-06-01T10:00:00Z', '2026-06-01T10:00:00.000Z').estado).toBe('sem-alteracao-identificada');
    expect(a('2026-06-01T10:00:00+02:00', '2026-06-01T08:00:00.000Z').estado).toBe('sem-alteracao-identificada');
  });

  test('nenhum dos quatro estados se chama "atual"', () => {
    const estados = new Set([a(T1, T1).estado, a(T1, T2).estado, a(T2, T1).estado, a(null, T1).estado]);
    expect([...estados].sort()).toEqual(['marcadores-fora-de-ordem', 'nao-verificavel', 'projeto-posterior', 'sem-alteracao-identificada']);
    expect(estados.has('atual' as any)).toBe(false);
  });
});

describe('A2.10: a referência mudou com a tela aberta', () => {
  const c = referencia.compararReferencia;
  test('sem mudança: nenhum aviso', () => {
    expect(c(null, null)).toEqual({ mudou: false, texto: '' });
    expect(c(refDe(EXEC_A, 2), refDe(EXEC_A, 2))).toEqual({ mudou: false, texto: '' });
  });
  test('mudou de revisão, de execução, ou passou a existir: AVISA e diz que a tela continua exibindo o que exibia', () => {
    for (const [carregada, corrente] of [
      [refDe(EXEC_A, 1), refDe(EXEC_B, 2)],
      [refDe(EXEC_A, 1), refDe(EXEC_A, 3)],
      [null, refDe(EXEC_A, 1)],
      [refDe(EXEC_A, 1), null],
    ] as any[]) {
      const r = c(carregada, corrente);
      expect(r.mudou).toBe(true);
      expect(r.texto).toMatch(/A tela continua exibindo o que exibia/);
    }
  });
});

describe('A2.11: resumo e ordem das execuções, sem preencher o que falta', () => {
  test('campo ausente fica null, e zero é zero', () => {
    const r = referencia.resumirExecucao('x', { responseCount: 0, calculatedAt: '2026-06-01T00:00:00.000Z', metadata: { excludedRespondentIds: [] } });
    expect(r).toEqual({
      executionId: 'x', calculatedAt: '2026-06-01T00:00:00.000Z', responseCount: 0,
      engineVersion: null, codeRevision: null, projectUpdatedAt: null, excludedCount: 0,
    });
    const vazio = referencia.resumirExecucao('y', undefined);
    expect(Object.values(vazio).filter(v => v === null)).toHaveLength(6);
  });
  test('mais recente primeiro por instante; sem data legível vai para o fim; empate por identificador', () => {
    const l = referencia.ordenarExecucoes([
      referencia.resumirExecucao('c', { calculatedAt: '2026-06-01T10:00:00+02:00' }), // 08:00Z
      referencia.resumirExecucao('a', { calculatedAt: '2026-06-01T09:00:00Z' }),
      referencia.resumirExecucao('z', { calculatedAt: 'sem data' }),
      referencia.resumirExecucao('b', { calculatedAt: '2026-06-01T09:00:00.000Z' }),
    ]);
    expect(l.map((x: any) => x.executionId)).toEqual(['a', 'b', 'c', 'z']);
  });
});

// ===========================================================================================
// A2: as leituras da tela de resultados
// ===========================================================================================

describe('A2.12: o que a tela carrega primeiro', () => {
  const anterior = (extra: Record<string, unknown> = {}) =>
    duplo.semear('calculations', P1, { projectId: P1, calculatedAt: '2026-06-02T00:00:00.000Z', marcador: 'documento anterior a F07', ...extra });

  test('há referência: exibe a execução da referência, e NÃO o documento anterior, mesmo existindo os dois', async () => {
    anterior();
    await escolher(pedido(EXEC_B, 0));
    const c = await leitura.carregarApresentacaoInicial({ __mock: true }, P1);
    expect(c.exibicao).toEqual({ tipo: 'execucao', executionId: EXEC_B });
    expect(c.documento.executionId).toBe(EXEC_B);
    expect(c.referencia.revision).toBe(1);
    expect(referencia.estadoDaApresentacao(c.referencia, c.exibicao).estado).toBe('referencia-escolhida');
    expect(c.resumos.map((r: any) => r.executionId)).toEqual([EXEC_C, EXEC_B, EXEC_A]);
  });

  test('sem referência, com o documento anterior: exibe-o, nomeado, e avisa das execuções POSTERIORES sem as exibir', async () => {
    anterior({ calculatedAt: '2026-06-02T00:00:00.000Z' }); // EXEC_B (06-02 12:00) e EXEC_C (06-03) são posteriores; EXEC_A (06-01) não
    const c = await leitura.carregarApresentacaoInicial({ __mock: true }, P1);
    expect(c.exibicao).toEqual({ tipo: 'anterior-a-f07' });
    expect(c.documento.marcador).toBe('documento anterior a F07');
    expect(referencia.estadoDaApresentacao(c.referencia, c.exibicao).estado).toBe('resultado-anterior-sem-referencia');
    expect(c.avisos).toHaveLength(1);
    expect(c.avisos[0]).toMatch(/Há 2 execução\(ões\) calculada\(s\) depois/);
    expect(c.avisos[0]).toContain(EXEC_C);
    expect(c.avisos[0]).toMatch(/não as exibe sozinha/);
  });

  test('sem referência, documento anterior MAIS NOVO que todas as execuções: nenhum aviso', async () => {
    anterior({ calculatedAt: '2026-07-01T00:00:00.000Z' });
    const c = await leitura.carregarApresentacaoInicial({ __mock: true }, P1);
    expect(c.avisos).toEqual([]);
  });

  test('documento anterior sem data legível E execuções existentes: o aviso diz que NÃO foi possível comparar', async () => {
    duplo.semear('calculations', P1, { projectId: P1, marcador: 'sem data' }); // sem `calculatedAt`
    const c = await leitura.carregarApresentacaoInicial({ __mock: true }, P1);
    expect(c.avisos[0]).toMatch(/não foi possível dizer se alguma é posterior/);
  });

  test('sem referência e sem documento anterior: a execução mais recente, NOMEADA como outra execução sem referência', async () => {
    const c = await leitura.carregarApresentacaoInicial({ __mock: true }, P1);
    expect(c.exibicao).toEqual({ tipo: 'execucao', executionId: EXEC_C });
    const ap = referencia.estadoDaApresentacao(c.referencia, c.exibicao);
    expect(ap.estado).toBe('outra-execucao');
    expect(ap.texto).toMatch(/ainda não tem referência escolhida/);
  });

  test('a referência aponta para uma execução que NÃO existe: avisa, e não finge que ela é a exibida', async () => {
    duplo.semear('projectReference', P1, refDe('exec-sumiu-000001', 4));
    anterior();
    const c = await leitura.carregarApresentacaoInicial({ __mock: true }, P1);
    expect(c.avisos[0]).toMatch(/aponta para a execução exec-sumiu-000001, que não foi encontrada/);
    expect(c.exibicao).toEqual({ tipo: 'anterior-a-f07' });
    expect(referencia.estadoDaApresentacao(c.referencia, c.exibicao).estado).toBe('outra-execucao'); // há referência, e ela NÃO é o que se vê
  });

  test('nada a exibir: exibicao null', async () => {
    const c = await leitura.carregarApresentacaoInicial({ __mock: true }, 'projeto-sem-nada');
    expect(c.exibicao).toBeNull();
    expect(c.documento).toBeNull();
  });

  test('o histórico vem da revisão mais alta para a mais baixa, e só do projeto', async () => {
    await escolher(pedido(EXEC_A, 0));
    await escolher(pedido(EXEC_B, 1));
    duplo.semear('referenceChanges', 'op-de-outro-projeto', { projectId: P2, executionId: EXEC_DO_P2, revision: 1, expectedRevision: 0, justification: 'j', chosenAt: 'z', authorship: 'nao-autenticada', operationId: 'op-de-outro-projeto' });
    const h = await leitura.listarHistorico({ __mock: true }, P1);
    expect(h.map((x: any) => x.revision)).toEqual([2, 1]);
    expect(h.every((x: any) => x.projectId === P1)).toBe(true);
  });

  test('de ponta a ponta com a rota REAL de cálculo: calcular duas vezes, escolher a primeira, e a tela abre nela', async () => {
    duplo.reset();
    duplo.semear('projects', P1, { name: 'P1', updatedAt: '2026-06-01T10:00:00.000Z', alternatives: [{ code: 'A1', name: 'x', description: '' }, { code: 'A2', name: 'y', description: '' }] });
    (fixture as any).responses.forEach((r: any, i: number) => {
      duplo.semear('respondents', `${P1}__${r.id}`, { projectId: P1 });
      duplo.semear('responses', `${P1}__resp-${i}`, { projectId: P1, respondentId: `${P1}__${r.id}`, judgments: copia(r.judgments), completedAt: `2026-05-0${(i % 9) + 1}T12:00:00.000Z` });
    });
    const calc = async (requestId: string, excl: string[] = []) =>
      (await (await POST_CALCULO({ json: async () => ({ projectId: P1, requestId, excludedRespondentIds: excl }) } as any)).json());
    const c1 = await calc('req-ponta-a-ponta-1');
    const c2 = await calc('req-ponta-a-ponta-2', [`${P1}__R01`]);
    expect([c1.success, c2.success]).toEqual([true, true]);

    // sem referência: a mais recente (ou a primeira, se o instante empatar), nomeada
    const semRef = await leitura.carregarApresentacaoInicial({ __mock: true }, P1);
    expect(semRef.referencia).toBeNull();
    expect(referencia.estadoDaApresentacao(null, semRef.exibicao).estado).toBe('outra-execucao');

    const e = await escolher({ projectId: P1, executionId: c1.executionId, expectedRevision: 0, operationId: novaOp(), justification: 'a primeira, com todos os respondentes' });
    expect(e.status).toBe(200);
    const comRef = await leitura.carregarApresentacaoInicial({ __mock: true }, P1);
    expect(comRef.exibicao).toEqual({ tipo: 'execucao', executionId: c1.executionId });
    expect(comRef.documento.responseCount).toBe(12);
    expect(referencia.estadoDaApresentacao(comRef.referencia, comRef.exibicao).estado).toBe('referencia-escolhida');
    // a execução marcada tem o marcador do projeto gravado no cálculo
    expect(comRef.documento.projectUpdatedAt).toBe('2026-06-01T10:00:00.000Z');
    expect(referencia.atualidadeDoProjeto(comRef.documento.projectUpdatedAt, '2026-06-01T10:00:00.000Z').estado).toBe('sem-alteracao-identificada');
    expect(referencia.atualidadeDoProjeto(comRef.documento.projectUpdatedAt, '2026-06-09T10:00:00.000Z').estado).toBe('projeto-posterior');
  });
});

// ===========================================================================================
// A2: o painel renderizado
// ===========================================================================================

describe('A2.13: o painel mostra o estado por nome, a atualidade, o limite da autoria e a ausência', () => {
  const resumo = (id: string, extra: Record<string, unknown> = {}) =>
    referencia.resumirExecucao(id, { calculatedAt: '2026-06-01T10:00:00.000Z', responseCount: 12, engineVersion: 'ahp-bocr-motor-5.0.0', ...extra });

  function render(props: Record<string, unknown> = {}) {
    const ref = (props.referencia === undefined ? refDe(EXEC_A, 2) : props.referencia) as any;
    const exib = (props.exibicao ?? { tipo: 'execucao', executionId: EXEC_A }) as any;
    return renderToStaticMarkup(
      React.createElement(PainelDaReferencia, {
        apresentacao: referencia.estadoDaApresentacao(ref, exib),
        atualidade: referencia.atualidadeDoProjeto('2026-06-01T10:00:00.000Z', '2026-06-01T10:00:00.000Z'),
        referencia: ref,
        execucoes: [resumo(EXEC_A), resumo(EXEC_B, { codeRevision: 'abc123def456' })],
        historico: [],
        exibidaId: exib.tipo === 'execucao' ? exib.executionId : null,
        ...props,
      } as any)
    );
  }

  test.each([
    ['referencia-escolhida', 'Referência escolhida', { referencia: refDe(EXEC_A, 2), exibicao: { tipo: 'execucao', executionId: EXEC_A } }],
    ['resultado-anterior-sem-referencia', 'Resultado anterior, sem referência escolhida', { referencia: null, exibicao: { tipo: 'anterior-a-f07' } }],
    ['outra-execucao', 'Exibindo outra execução', { referencia: refDe(EXEC_A, 2), exibicao: { tipo: 'execucao', executionId: EXEC_B } }],
  ])('estado %s: o rótulo "%s" aparece, com o atributo de estado', (estado, rotulo, props) => {
    const html = render(props as any);
    expect(html).toContain(`data-estado="${estado}"`);
    expect(html).toContain(rotulo);
  });

  test('o limite da autoria aparece SEMPRE, inclusive sem histórico', () => {
    for (const props of [{}, { referencia: null, exibicao: { tipo: 'anterior-a-f07' } }]) {
      const html = render(props as any);
      expect(html).toContain('data-limite="autoria"');
      expect(html).toContain('Autoria não autenticada');
      expect(html).toContain('o sistema não verifica quem a fez');
    }
  });

  test('o histórico mostra cada revisão com a autoria "não autenticada"', () => {
    const html = render({
      historico: [
        { ...refDe(EXEC_B, 2), projectId: P1, expectedRevision: 1, justification: 'segunda' },
        { ...refDe(EXEC_A, 1), projectId: P1, expectedRevision: 0, justification: 'primeira' },
      ],
    });
    expect(html).toContain('Histórico de escolhas (2)');
    expect(html).toContain('Revisão 2');
    expect(html).toContain('Revisão 1');
    expect((html.match(/Autoria: não autenticada/g) ?? []).length).toBe(2);
  });

  test('a atualidade aparece com o texto do estado e o limite do marcador; nunca "atual" como estado', () => {
    for (const [exec, proj, estado] of [
      ['2026-06-01T10:00:00.000Z', '2026-06-01T10:00:00.000Z', 'sem-alteracao-identificada'],
      ['2026-06-01T10:00:00.000Z', '2026-06-09T10:00:00.000Z', 'projeto-posterior'],
      ['2026-06-09T10:00:00.000Z', '2026-06-01T10:00:00.000Z', 'marcadores-fora-de-ordem'],
      [null, '2026-06-01T10:00:00.000Z', 'nao-verificavel'],
    ] as const) {
      const at = referencia.atualidadeDoProjeto(exec, proj);
      const html = render({ atualidade: at });
      expect(html).toContain(`data-atualidade="${estado}"`);
      expect(html).toContain(at.texto.replace(/&/g, '&amp;'));
      expect(html).toContain('não registra mudanças nas respostas nem nos respondentes');
      expect(html).not.toContain('data-atualidade="atual"');
    }
  });

  test('identificação ausente aparece como "ausente", e a presente aparece como é', () => {
    const html = render();
    // EXEC_A: sem codeRevision nem projectUpdatedAt; EXEC_B: com codeRevision
    const linhaA = html.slice(html.indexOf(`data-execucao="${EXEC_A}"`), html.indexOf(`data-execucao="${EXEC_B}"`));
    const linhaB = html.slice(html.indexOf(`data-execucao="${EXEC_B}"`));
    expect((linhaA.match(/ausente/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(linhaA).toContain('ahp-bocr-motor-5.0.0');
    expect(linhaB).toContain('abc123def456');
  });

  test('a mudança da referência com a tela aberta vira AVISO com botão, e só com mudança', () => {
    const sem = render({ mudanca: { mudou: false, texto: '' }, onCarregarReferencia: () => undefined });
    expect(sem).not.toContain('data-aviso="referencia-mudou"');
    const com = render({ mudanca: referencia.compararReferencia(refDe(EXEC_A, 1), refDe(EXEC_B, 2)), onCarregarReferencia: () => undefined });
    expect(com).toContain('data-aviso="referencia-mudou"');
    expect(com).toContain('A tela continua exibindo o que exibia');
    expect(com).toContain('Carregar a referência atual');
    // o estado exibido NÃO foi trocado pelo aviso
    expect(com).toContain('data-estado="referencia-escolhida"');
  });

  test('a lista marca a referência e a exibida, tem as duas ações, e a pergunta da escolha exige justificativa', () => {
    const html = render({ referencia: refDe(EXEC_A, 2), exibicao: { tipo: 'execucao', executionId: EXEC_B } });
    expect(html).toContain('(referência)');
    expect(html).toContain('(exibida)');
    expect(html).toContain('Exibir');
    expect(html).toContain('Escolher como referência');
  });

  test('enquanto consulta escolhas pendentes, nenhuma ação é liberada (todos os botões da lista saem desabilitados)', () => {
    const html = render({ consultandoPendentes: true });
    // ⚠ O atributo é ` disabled=""`; a classe `disabled:opacity-40` também contém "disabled", e um
    //   `includes('disabled')` aprovaria qualquer botão. Primeira versão deste teste: vácuo.
    const desabilitado = (b: string) => / disabled=""/.test(b);
    const botoes = html.match(/<button[^>]*>(Exibir|Escolher como referência)<\/button>/g) ?? [];
    expect(botoes).toHaveLength(4);
    expect(botoes.every(desabilitado)).toBe(true);
    const livre = render({ consultandoPendentes: false, referencia: null, exibicao: { tipo: 'anterior-a-f07' } });
    const livres = livre.match(/<button[^>]*>(Exibir|Escolher como referência)<\/button>/g) ?? [];
    expect(livres).toHaveLength(4);
    expect(livres.some(desabilitado)).toBe(false);
    // CONTROLE: com a execução EXIBIDA e a REFERÊNCIA marcadas, exatamente dois botões saem desabilitados
    const parcial = render({ consultandoPendentes: false });
    const parciais = parcial.match(/<button[^>]*>(Exibir|Escolher como referência)<\/button>/g) ?? [];
    expect(parciais.filter(desabilitado)).toHaveLength(2);
  });

  test('a mensagem da escolha aparece com o tipo', () => {
    const html = render({ escolha: { emAndamento: false, tipo: 'erro', mensagem: 'Nada foi gravado. A referência mudou.' } });
    expect(html).toContain('data-escolha="erro"');
    expect(html).toContain('Nada foi gravado. A referência mudou.');
  });
});

// ===========================================================================================
// A2: fiação da página e do contêiner, por LEITURA
// ===========================================================================================

describe('A2.14: fiação, por LEITURA (nenhuma tela é executada por teste algum)', () => {
  const ler = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const ocorrencias = (t: string, a: string) => t.split(a).length - 1;
  const PAGINA = 'app/decisor/resultados/[projectId]/page.tsx';

  test('a página lê pela referência: uma chamada de carregarApresentacaoInicial, nenhuma leitura direta de calculations', () => {
    const f = ler(PAGINA);
    expect(ocorrencias(f, 'carregarApresentacaoInicial(')).toBe(1);
    expect(f).not.toMatch(/doc\(db,\s*['"]calculations['"]/);
    expect(ocorrencias(f, '<ReferenciaDoProjeto')).toBe(1);
  });

  test('a página NUNCA troca sozinha o que exibe: exibirExecucao só é passada como callback, sem chamada direta', () => {
    const f = ler(PAGINA);
    expect(ocorrencias(f, 'exibirExecucao(')).toBe(0);
    expect(ocorrencias(f, 'onExibir={exibirExecucao}')).toBe(1);
  });

  test('o contêiner assina a referência e o projeto, usa a revisão CARREGADA na escolha e consulta as pendentes antes de liberar', () => {
    const f = ler('components/ReferenciaDoProjeto.tsx');
    expect(ocorrencias(f, 'onSnapshot(')).toBe(2);
    expect(f).toMatch(/expectedRevision: referenciaCarregada\?\.revision \?\? 0/);
    expect(f).toMatch(/retomarPendentes\(dependenciasDoNavegador\(\), \{ tipo: 'escolha', projectId \}\)/);
    expect(f).toMatch(/useState\(true\)/); // consultandoPendentes começa ligado
    // o aviso de mudança NÃO chama onExibir: só o clique em "Exibir" (`exibir`) e o clique em "Carregar a
    // referência atual" (`carregarReferencia`).
    // ⚠ F07 A4 (item 3): `carregarReferencia` deixou de passar por `exibir` e entrega o documento por
    //   `acoes.apresentar` (lib/fluxos-da-referencia.ts), então `onExibir(documento)` aparece em DUAS
    //   funções de clique, e não em uma. O que este teste exigia (nenhuma chamada fora de clique) é
    //   conferido por posição: as duas ocorrências estão depois de `const exibir` e dentro de `exibir` ou
    //   de `carregarReferencia`, e nenhum `useEffect` do componente a contém.
    expect(ocorrencias(f, 'onExibir(documento)')).toBe(2);
    const iExibir = f.indexOf('const exibir = async');
    const iCarregar = f.indexOf('const carregarReferencia = async');
    const iFimCarregar = f.indexOf('\n  };\n', iCarregar);
    const dentroDeExibir = f.slice(iExibir, f.indexOf('\n  };\n', iExibir));
    const dentroDeCarregar = f.slice(iCarregar, iFimCarregar);
    expect([iExibir > 0, iCarregar > iExibir]).toEqual([true, true]);
    expect([ocorrencias(dentroDeExibir, 'onExibir(documento)'), ocorrencias(dentroDeCarregar, 'onExibir(documento)')]).toEqual([1, 1]);
    for (const m of f.matchAll(/useEffect\(\(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\);/g)) expect(m[0].includes('onExibir(')).toBe(false);
  });

  test('a rota de escolha não importa Node além do necessário e não grava nada fora do módulo de escolha', () => {
    const f = ler('app/api/project-reference/route.ts');
    expect(f).not.toMatch(/setDoc|updateDoc|addDoc|deleteDoc|runTransaction/);
    expect(f).toMatch(/escolherReferencia\(db,/);
  });
});
