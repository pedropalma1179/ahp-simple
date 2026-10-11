/**
 * lib/__tests__/f07-a1-execucoes.test.ts
 *
 * F07, entrega A1: cada cálculo cria uma EXECUÇÃO, com idempotência por pedido.
 *
 * Exercita o handler REAL de `app/api/calculate/route.ts`, o módulo real `lib/execucoes.ts` e o
 * módulo real `lib/intencoes.ts` (o lado do navegador, com armazenamento e envio injetados). O
 * Firestore é o DUPLO COMPARTILHADO (`helpers/firestore-duplo.ts`), que reproduz `runTransaction`
 * com controle otimista. Dados sintéticos: o painel é a fixture `panel-2026.json`. Nenhum teste
 * acessa produção, rede ou dado de respondente.
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.**
 *   - Comportamento do Firestore real sob contenção. O duplo reproduz o protocolo (versões lidas,
 *     repetição, leituras antes das escritas), e não o serviço. As regras de segurança propostas
 *     NÃO são executadas aqui; o teste de forma confere só as chaves e os tipos que elas exigem.
 *   - As telas. `jest` roda com `testEnvironment: node` e `roots: ['lib']`: nenhum componente React
 *     é montado. A fiação das duas páginas é conferida por LEITURA do fonte (último bloco), e a
 *     leitura não prova o comportamento no navegador.
 */

import crypto from 'node:crypto';
import fixture from './fixtures/panel-2026.json';

jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));
jest.mock('firebase/firestore', () => require('./helpers/firestore-duplo').moduloFirestoreSimulado());

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const { duplo } = require('./helpers/firestore-duplo');
const { POST } = require('@/app/api/calculate/route');
const execucoes = require('@/lib/execucoes');
const intencoes = require('@/lib/intencoes');
const { ENGINE_VERSION } = require('@/lib/engine-version');
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const PROJETO = 'projeto-f07-a1';
const OUTRO_PROJETO = 'projeto-f07-a1-outro';
const RESPOSTAS = (fixture as any).responses as { id: string; judgments: any[] }[];
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

function semearProjeto(id: string, extra: Record<string, unknown> = {}) {
  duplo.semear('projects', id, {
    name: `Painel ${id}`,
    description: 'fixture',
    alternatives: [
      { code: 'A1', name: 'Gêmeo Digital', description: '' },
      { code: 'A2', name: 'IA Temperatura', description: '' },
    ],
    ...extra,
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

const idsDoPainel = (projeto: string) => RESPOSTAS.map(r => `${projeto}__${r.id}`);

function pedir(corpo: Record<string, unknown>) {
  return POST({ json: async () => corpo } as any);
}

async function chamar(corpo: Record<string, unknown>) {
  const res = await pedir(corpo);
  return { status: res.status as number, corpo: await res.json() };
}

const REQ_A = 'req-f07-aaaaaaaa';
const REQ_B = 'req-f07-bbbbbbbb';

let uuidsGerados: string[] = [];
let spyUuid: jest.SpyInstance;

beforeEach(() => {
  duplo.reset();
  semearProjeto(PROJETO, { updatedAt: '2026-06-01T10:00:00.000Z' });
  uuidsGerados = [];
  const original = crypto.randomUUID.bind(crypto);
  spyUuid = jest.spyOn(crypto, 'randomUUID').mockImplementation((() => {
    const u = original();
    uuidsGerados.push(u);
    return u;
  }) as any);
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  spyUuid.mockRestore();
  jest.restoreAllMocks();
  delete process.env.VERCEL_GIT_COMMIT_SHA;
});

const paramsDigestDe = (projectId: string, excluidos: string[]) =>
  crypto.createHash('sha256').update(JSON.stringify({ projectId, excludedRespondentIds: [...excluidos].sort() }), 'utf8').digest('hex');

// ===========================================================================================
// Os seis testes exigidos por A1
// ===========================================================================================

describe('A1.1: duas chamadas SIMULTÂNEAS com o mesmo requestId criam UMA execução', () => {
  test('a corrida é forçada (as duas chegam à transação sem ter confirmado) e a perdedora devolve a registrada', async () => {
    // Barreira: nenhuma das duas transações confirma antes de a outra ter terminado a função, então
    // as duas leem o pedido AUSENTE (versão 0). A primeira a prosseguir confirma; a segunda vê a
    // versão mudada e REPETE, e a releitura enxerga o pedido.
    let chegadas = 0;
    let liberar!: () => void;
    const porta = new Promise<void>(r => (liberar = r));
    duplo.antesDaConfirmacao = async ({ tentativa }: { tentativa: number }) => {
      if (tentativa !== 1) return;
      if (++chegadas === 2) liberar();
      await porta;
    };

    const corpo = { projectId: PROJETO, requestId: REQ_A };
    const [r1, r2] = await Promise.all([chamar(corpo), chamar(corpo)]);

    // MEDIDA da corrida (e não suposição): as duas leram o pedido ausente antes da confirmação.
    expect(chegadas).toBe(2);
    expect(duplo.tentativas.filter((t: any) => t.desfecho === 'repetida-por-contencao')).toHaveLength(1);
    expect(duplo.tentativas.filter((t: any) => t.desfecho === 'confirmada')).toHaveLength(2);

    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect(r1.corpo.success && r2.corpo.success).toBe(true);
    // UMA execução e UM pedido
    expect(duplo.quantos('executions')).toBe(1);
    expect(duplo.quantos('executionRequests')).toBe(1);
    // as duas respostas apontam para a MESMA execução, e exatamente uma delas é a "recuperada"
    expect(r1.corpo.executionId).toBe(r2.corpo.executionId);
    expect([r1.corpo.recuperada, r2.corpo.recuperada].sort()).toEqual([false, true]);
    // o resultado da perdedora foi DESCARTADO: foram gerados dois identificadores de execução, e só
    // um deles existe no banco
    expect(uuidsGerados).toHaveLength(2);
    const guardada = duplo.todos('executions')[0].id;
    expect(uuidsGerados.filter(u => u === guardada)).toHaveLength(1);
    expect(uuidsGerados.filter(u => u !== guardada).every(u => duplo.ler('executions', u) === undefined)).toBe(true);
    // as duas respostas trazem a execução como foi gravada
    expect(r1.corpo.calculation).toEqual(r2.corpo.calculation);
    expect(r1.corpo.calculation).toEqual(duplo.ler('executions', guardada));
  });

  test('o pedido aparece na janela ENTRE a leitura inicial e a transação: a rota descarta o próprio resultado', async () => {
    // Sem barreira: o gancho cria o pedido (de OUTRA chamada) logo depois da leitura inicial, que
    // já devolveu "ausente". A rota calcula, entra na transação e a releitura o encontra.
    const execucaoAlheia = { projectId: PROJETO, requestId: REQ_A, executionId: 'exec-alheia-0001', engineVersion: 'x', calculatedAt: 'y', includedRespondents: [], judgmentsDigest: {} };
    let semeou = false;
    duplo.depoisDeLer = async (l: any) => {
      if (semeou || l.col !== 'executionRequests' || l.id !== REQ_A) return;
      semeou = true;
      duplo.semear('executions', 'exec-alheia-0001', execucaoAlheia);
      duplo.semear('executionRequests', REQ_A, {
        projectId: PROJETO,
        executionId: 'exec-alheia-0001',
        paramsDigest: paramsDigestDe(PROJETO, []),
        createdAt: '2026-06-01T00:00:00.000Z',
      });
    };
    const r = await chamar({ projectId: PROJETO, requestId: REQ_A });
    expect(semeou).toBe(true);
    expect(r.status).toBe(200);
    expect(r.corpo.executionId).toBe('exec-alheia-0001');
    expect(r.corpo.recuperada).toBe(true);
    expect(r.corpo.calculation).toEqual(execucaoAlheia);
    // a rota CALCULOU (gerou o seu próprio executionId) e NÃO gravou nada
    expect(uuidsGerados).toHaveLength(1);
    expect(duplo.escritas).toEqual([]);
    expect(duplo.quantos('executions')).toBe(1);
  });
});

describe('A1.2: o mesmo requestId com parâmetros DIFERENTES é recusado', () => {
  async function primeira() {
    const r = await chamar({ projectId: PROJETO, requestId: REQ_A });
    expect(r.status).toBe(200);
    return r;
  }

  test('lista de exclusões diferente: 409 requestId-reutilizado, sem escrita e sem devolver a execução de outro pedido', async () => {
    const original = await primeira();
    const escritasAntes = duplo.escritas.length;
    const r = await chamar({ projectId: PROJETO, requestId: REQ_A, excludedRespondentIds: [idsDoPainel(PROJETO)[2]] });
    expect(r.status).toBe(409);
    expect(r.corpo.codigo).toBe('requestId-reutilizado');
    expect(r.corpo.success).toBe(false);
    expect(r.corpo.calculation).toBeUndefined();
    expect(r.corpo.executionId).not.toBe(original.corpo.executionId);
    expect(duplo.escritas.length).toBe(escritasAntes);
  });

  test('outro projeto: 409, e a execução do primeiro não é devolvida', async () => {
    semearProjeto(OUTRO_PROJETO);
    await primeira();
    const r = await chamar({ projectId: OUTRO_PROJETO, requestId: REQ_A });
    expect(r.status).toBe(409);
    expect(r.corpo.codigo).toBe('requestId-reutilizado');
    expect(duplo.quantos('executions')).toBe(1);
  });

  test('a MESMA lista em outra ordem é o mesmo pedido (a ordem não entra no resumo)', async () => {
    const [a, b] = idsDoPainel(PROJETO);
    const p1 = await chamar({ projectId: PROJETO, requestId: REQ_A, excludedRespondentIds: [a, b] });
    expect(p1.status).toBe(200);
    const p2 = await chamar({ projectId: PROJETO, requestId: REQ_A, excludedRespondentIds: [b, a] });
    expect(p2.status).toBe(200);
    expect(p2.corpo.recuperada).toBe(true);
    expect(p2.corpo.executionId).toBe(p1.corpo.executionId);
    expect(duplo.quantos('executions')).toBe(1);
  });

  test('a SEGUNDA conferência: o pedido conflitante aparece depois da leitura inicial e a transação o recusa', async () => {
    // O gancho cria, na janela, um pedido com o mesmo requestId e OUTROS parâmetros. A leitura
    // inicial já viu "ausente"; só a releitura da transação pode recusar. Sem a segunda
    // conferência a rota devolveria a execução de outro pedido.
    let semeou = false;
    duplo.depoisDeLer = async (l: any) => {
      if (semeou || l.col !== 'executionRequests' || l.id !== REQ_A) return;
      semeou = true;
      duplo.semear('executions', 'exec-de-outro-pedido', {
        projectId: PROJETO, requestId: REQ_A, executionId: 'exec-de-outro-pedido', engineVersion: 'x', calculatedAt: 'y', includedRespondents: [], judgmentsDigest: {},
      });
      duplo.semear('executionRequests', REQ_A, {
        projectId: PROJETO,
        executionId: 'exec-de-outro-pedido',
        paramsDigest: paramsDigestDe(PROJETO, ['alguem']),
        createdAt: '2026-06-01T00:00:00.000Z',
      });
    };
    const r = await chamar({ projectId: PROJETO, requestId: REQ_A });
    expect(semeou).toBe(true);
    expect(r.status).toBe(409);
    expect(r.corpo.codigo).toBe('requestId-reutilizado');
    expect(r.corpo.calculation).toBeUndefined();
    expect(duplo.escritas).toEqual([]);
  });
});

/** Armazenamento do navegador em memória, com a interface de `Storage`. */
function armazenamentoEmMemoria() {
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

/** O envio de verdade para a rota real. */
async function enviarParaARota(intencao: any) {
  const res = await pedir({
    projectId: intencao.projectId,
    excludedRespondentIds: intencao.excludedRespondentIds,
    requestId: intencao.id,
  });
  return { status: res.status as number, corpo: await res.json() };
}

/** A resposta se perde no caminho: o servidor processou, a tela nunca soube. */
function enviarPerdendoAResposta(registro: any[]) {
  return async (intencao: any) => {
    const r = await enviarParaARota(intencao);
    registro.push({ requestId: intencao.id, ...r });
    throw new Error('rede caiu antes da resposta chegar');
  };
}

function sequenciaDeIds(...ids: string[]) {
  let i = 0;
  return () => ids[i++] ?? `req-extra-${i}`;
}

describe('A1.3: recuperação depois de resposta perdida, sem segunda execução', () => {
  test('o pedido chegou, a resposta se perdeu, e a retomada devolve a MESMA execução sem calcular', async () => {
    const arm = armazenamentoEmMemoria();
    const vistas: any[] = [];
    const deps = { armazenamento: arm, enviar: enviarPerdendoAResposta(vistas), gerarId: sequenciaDeIds('req-cliente-0001') };

    const nova = await intencoes.executarCalculo(deps, { projectId: PROJETO });
    expect(nova.desfecho.situacao).toBe('pendente');
    expect(nova.persistida).toBe(true);
    // a execução EXISTE no servidor, e a tela não sabe
    expect(duplo.quantos('executions')).toBe(1);
    expect(arm.mapa.size).toBe(1);

    const leiturasDeCalculoAntes = duplo.quantasLeituras('responses') + duplo.quantasLeituras('respondents');
    const relato = await intencoes.retomarPendentes({ armazenamento: arm, enviar: enviarParaARota, gerarId: sequenciaDeIds() }, { tipo: 'calculo', projectId: PROJETO });

    expect(relato.desfechos).toHaveLength(1);
    expect(relato.desfechos[0].situacao).toBe('confirmada');
    const corpo = relato.desfechos[0].resposta.corpo;
    expect(corpo.recuperada).toBe(true);
    expect(corpo.executionId).toBe(vistas[0].corpo.executionId);
    // SEM segunda execução, e SEM recalcular: nenhuma leitura de respondentes ou respostas
    expect(duplo.quantos('executions')).toBe(1);
    expect(duplo.quantos('executionRequests')).toBe(1);
    expect(duplo.quantasLeituras('responses') + duplo.quantasLeituras('respondents')).toBe(leiturasDeCalculoAntes);
    expect(uuidsGerados).toHaveLength(1);
    // só a intenção confirmada saiu
    expect(arm.mapa.size).toBe(0);
  });

  test('o pedido NUNCA chegou: a retomada calcula uma vez, e diz que o cálculo foi feito na retomada', async () => {
    const arm = armazenamentoEmMemoria();
    const deps = {
      armazenamento: arm,
      enviar: async () => { throw new Error('sem rede'); },
      gerarId: sequenciaDeIds('req-cliente-0002'),
    };
    const nova = await intencoes.executarCalculo(deps, { projectId: PROJETO });
    expect(nova.desfecho.situacao).toBe('pendente');
    expect(duplo.quantos('executions')).toBe(0);

    const relato = await intencoes.retomarPendentes({ armazenamento: arm, enviar: enviarParaARota, gerarId: sequenciaDeIds() }, { tipo: 'calculo' });
    expect(relato.desfechos[0].situacao).toBe('confirmada');
    expect(relato.desfechos[0].resposta.corpo.recuperada).toBe(false);
    expect(duplo.quantos('executions')).toBe(1);
    const aviso = intencoes.resumirRetomada(relato);
    expect(aviso.linhas[0]).toMatch(/não havia chegado ao servidor/);
    expect(arm.mapa.size).toBe(0);
  });

  test('erro 5xx e recusa 4xx: o 5xx MANTÉM a intenção, a recusa definitiva a remove', async () => {
    const arm = armazenamentoEmMemoria();
    const cinco = await intencoes.executarCalculo(
      { armazenamento: arm, enviar: async () => ({ status: 503, corpo: { success: false, error: 'indisponível' } }), gerarId: sequenciaDeIds('req-cliente-5xx0') },
      { projectId: PROJETO }
    );
    expect(cinco.desfecho.situacao).toBe('pendente');
    expect(arm.mapa.size).toBe(1);

    const quatro = await intencoes.executarCalculo(
      { armazenamento: arm, enviar: enviarParaARota, gerarId: sequenciaDeIds('req-cliente-4xx0') },
      { projectId: 'projeto-que-nao-existe' }
    );
    expect(quatro.desfecho.situacao).toBe('recusada');
    expect(quatro.desfecho.resposta.status).toBe(404);
    // a recusa removeu SÓ a própria entrada
    expect([...arm.mapa.keys()]).toEqual([intencoes.chaveDaIntencao('calculo', 'req-cliente-5xx0')]);
  });
});

describe('A1.4: a mesma recuperação DEPOIS DE RECARREGAR e com DUAS intenções pendentes no mesmo projeto', () => {
  test('a segunda intenção não apaga a primeira; a retomada consulta cada uma; só a confirmada sai', async () => {
    const arm = armazenamentoEmMemoria();
    const excluido = idsDoPainel(PROJETO)[2];
    const vistas: any[] = [];

    // 1) duas ações, as duas com a resposta perdida
    const a = await intencoes.executarCalculo(
      { armazenamento: arm, enviar: enviarPerdendoAResposta(vistas), gerarId: sequenciaDeIds('req-cliente-pend-A') },
      { projectId: PROJETO }
    );
    expect(arm.mapa.size).toBe(1);
    const b = await intencoes.executarCalculo(
      { armazenamento: arm, enviar: enviarPerdendoAResposta(vistas), gerarId: sequenciaDeIds('req-cliente-pend-B') },
      { projectId: PROJETO, excludedRespondentIds: [excluido] }
    );
    expect(a.desfecho.situacao).toBe('pendente');
    expect(b.desfecho.situacao).toBe('pendente');
    // registrar a SEGUNDA não apagou a PRIMEIRA
    expect(arm.mapa.size).toBe(2);
    expect(duplo.quantos('executions')).toBe(2);

    // a entrada guarda projeto e parâmetros, inclusive a lista de exclusões
    const guardadaB = JSON.parse(arm.mapa.get(intencoes.chaveDaIntencao('calculo', 'req-cliente-pend-B')) as string);
    expect(guardadaB).toMatchObject({ tipo: 'calculo', id: 'req-cliente-pend-B', projectId: PROJETO, excludedRespondentIds: [excluido] });

    // 2) RECARGA: um módulo NOVO (nenhum estado em memória sobrevive), o mesmo armazenamento
    let fresco: any;
    jest.isolateModules(() => { fresco = require('@/lib/intencoes'); });
    expect(fresco).not.toBe(intencoes);
    expect(fresco.listarIntencoes(arm, { projectId: PROJETO }).intencoes.map((i: any) => i.id).sort()).toEqual(['req-cliente-pend-A', 'req-cliente-pend-B']);

    const leiturasAntes = duplo.quantasLeituras('responses') + duplo.quantasLeituras('respondents');
    const enviados: string[] = [];
    // a primeira consulta: a A responde, a B recebe 503
    const relato1 = await fresco.retomarPendentes(
      {
        armazenamento: arm,
        enviar: async (i: any) => {
          enviados.push(i.id);
          if (i.id === 'req-cliente-pend-B') return { status: 503, corpo: null };
          return enviarParaARota(i);
        },
        gerarId: sequenciaDeIds(),
      },
      { tipo: 'calculo', projectId: PROJETO }
    );
    expect(enviados).toEqual(['req-cliente-pend-A', 'req-cliente-pend-B']);
    expect(relato1.desfechos.map((d: any) => d.situacao)).toEqual(['confirmada', 'pendente']);
    // só a A saiu, e a B continua guardada, com os parâmetros
    expect([...arm.mapa.keys()]).toEqual([intencoes.chaveDaIntencao('calculo', 'req-cliente-pend-B')]);

    // 3) outra recarga: a B, agora, responde
    const relato2 = await intencoes.retomarPendentes({ armazenamento: arm, enviar: enviarParaARota, gerarId: sequenciaDeIds() }, { tipo: 'calculo', projectId: PROJETO });
    expect(relato2.desfechos.map((d: any) => d.situacao)).toEqual(['confirmada']);
    expect(arm.mapa.size).toBe(0);

    // as DUAS execuções originais foram recuperadas, nenhuma terceira foi criada, nada foi recalculado
    const idsOriginais = vistas.map(v => v.corpo.executionId);
    expect(relato1.desfechos[0].resposta.corpo.executionId).toBe(idsOriginais[0]);
    expect(relato2.desfechos[0].resposta.corpo.executionId).toBe(idsOriginais[1]);
    expect(relato1.desfechos[0].resposta.corpo.recuperada).toBe(true);
    expect(relato2.desfechos[0].resposta.corpo.recuperada).toBe(true);
    expect(duplo.quantos('executions')).toBe(2);
    expect(duplo.quantos('executionRequests')).toBe(2);
    expect(duplo.quantasLeituras('responses') + duplo.quantasLeituras('respondents')).toBe(leiturasAntes);
  });

  test('intenção de OUTRO projeto não é tocada pela retomada do projeto', async () => {
    const arm = armazenamentoEmMemoria();
    semearProjeto(OUTRO_PROJETO);
    await intencoes.executarCalculo({ armazenamento: arm, enviar: async () => { throw new Error('x'); }, gerarId: sequenciaDeIds('req-cliente-outro-1') }, { projectId: OUTRO_PROJETO });
    await intencoes.executarCalculo({ armazenamento: arm, enviar: async () => { throw new Error('x'); }, gerarId: sequenciaDeIds('req-cliente-este-01') }, { projectId: PROJETO });
    const relato = await intencoes.retomarPendentes({ armazenamento: arm, enviar: enviarParaARota, gerarId: sequenciaDeIds() }, { tipo: 'calculo', projectId: PROJETO });
    expect(relato.desfechos).toHaveLength(1);
    expect([...arm.mapa.keys()]).toEqual([intencoes.chaveDaIntencao('calculo', 'req-cliente-outro-1')]);
  });
});

describe('A1.5: requestId DISTINTOS produzem DUAS execuções', () => {
  test('mesmos parâmetros, dois pedidos, duas execuções e dois pedidos registrados', async () => {
    const r1 = await chamar({ projectId: PROJETO, requestId: REQ_A });
    const r2 = await chamar({ projectId: PROJETO, requestId: REQ_B });
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect(r1.corpo.executionId).not.toBe(r2.corpo.executionId);
    expect([r1.corpo.recuperada, r2.corpo.recuperada]).toEqual([false, false]);
    expect(duplo.quantos('executions')).toBe(2);
    expect(duplo.quantos('executionRequests')).toBe(2);
    // o segundo cálculo NÃO sobrescreve o primeiro: o primeiro documento segue como foi gravado
    expect(duplo.ler('executions', r1.corpo.executionId)).toEqual(r1.corpo.calculation);
    expect(duplo.ler('executions', r2.corpo.executionId)).toEqual(r2.corpo.calculation);
  });
});

describe('A1.6: pedido SEM requestId é recusado', () => {
  test.each([
    ['ausente', { projectId: PROJETO }],
    ['vazio', { projectId: PROJETO, requestId: '' }],
    ['curto demais', { projectId: PROJETO, requestId: 'curto' }],
    ['com barra (viraria caminho)', { projectId: PROJETO, requestId: 'req/../outro-documento' }],
    ['não é texto', { projectId: PROJETO, requestId: 12345678 }],
    ['grande demais', { projectId: PROJETO, requestId: 'a'.repeat(129) }],
  ])('%s: 400, mensagem de recarregar a página, nada lido além do necessário e nada escrito', async (_nome, corpo) => {
    const r = await chamar(corpo as any);
    expect(r.status).toBe(400);
    expect(r.corpo.success).toBe(false);
    expect(r.corpo.codigo).toBe('request-id-ausente-ou-invalido');
    expect(r.corpo.error).toMatch(/Recarregue a página/);
    expect(duplo.escritas).toEqual([]);
    // recusado ANTES de calcular: nenhuma leitura de respondentes, respostas, nem do pedido
    expect(duplo.leituras).toEqual([]);
    expect(uuidsGerados).toEqual([]);
  });
});

// ===========================================================================================
// O documento de execução e o pedido
// ===========================================================================================

describe('o documento de execução e o pedido', () => {
  test('a execução preserva o resultado e acrescenta SÓ os campos de identificação', async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = 'f07a1c0de000000000000000000000000000abcd';
    const r = await chamar({ projectId: PROJETO, requestId: REQ_A });
    const gravada = duplo.ler('executions', r.corpo.executionId);
    expect(gravada).toEqual(r.corpo.calculation);

    expect(gravada.requestId).toBe(REQ_A);
    expect(gravada.engineVersion).toBe(ENGINE_VERSION);
    expect(gravada.codeRevision).toBe('f07a1c0de000000000000000000000000000abcd');
    expect(gravada.projectUpdatedAt).toBe('2026-06-01T10:00:00.000Z');
    // `includedRespondents` e `judgmentsDigest` no topo são o MESMO valor que `metadata` traz
    expect(gravada.includedRespondents).toEqual(gravada.metadata.includedRespondents);
    expect(gravada.judgmentsDigest).toEqual(gravada.metadata.judgmentsDigest);
    expect(gravada.metadata.includedRespondents).toHaveLength(12);
    // os campos do resultado seguem onde estavam
    expect(gravada.executionId).toBe(r.corpo.executionId);
    expect(gravada.responseCount).toBe(12);
    expect(typeof gravada.calculatedAt).toBe('string');
  });

  test('AUSENTE é gravado como ausente (null), nunca preenchido: sem VERCEL_GIT_COMMIT_SHA e sem updatedAt do projeto', async () => {
    duplo.reset();
    semearProjeto(PROJETO); // sem updatedAt
    const r = await chamar({ projectId: PROJETO, requestId: REQ_A });
    const gravada = duplo.ler('executions', r.corpo.executionId);
    expect(gravada.codeRevision).toBeNull();
    expect(gravada.projectUpdatedAt).toBeNull();
    // e a variável vazia ou o campo não textual também são ausência
    expect(execucoes.montarDocumentoDeExecucao({ metadata: {} }, { requestId: REQ_A, codeRevision: '', projectUpdatedAt: 12345 })).toMatchObject({ codeRevision: null, projectUpdatedAt: null });
  });

  test('o campo `projectUpdatedAt` vem do objeto de projeto lido na chamada, sem segunda leitura do projeto', async () => {
    await chamar({ projectId: PROJETO, requestId: REQ_A });
    expect(duplo.leituras.filter((l: any) => l.col === 'projects')).toHaveLength(1);
  });

  test('o pedido guarda projectId, paramsDigest, executionId, createdAt e as exclusões ORDENADAS; NÃO guarda requestedBy', async () => {
    const [a, b, c] = idsDoPainel(PROJETO);
    const r = await chamar({ projectId: PROJETO, requestId: REQ_A, excludedRespondentIds: [c, a] });
    expect(r.status).toBe(200);
    const pedido = duplo.ler('executionRequests', REQ_A);
    expect(Object.keys(pedido).sort()).toEqual(['createdAt', 'excludedRespondentIds', 'executionId', 'paramsDigest', 'projectId']);
    expect(pedido.projectId).toBe(PROJETO);
    expect(pedido.executionId).toBe(r.corpo.executionId);
    expect(pedido.excludedRespondentIds).toEqual([a, c]);
    expect(pedido.paramsDigest).toBe(paramsDigestDe(PROJETO, [c, a]));
    expect(pedido.paramsDigest).toBe(paramsDigestDe(PROJETO, [a, c]));
    expect(pedido.paramsDigest).not.toBe(paramsDigestDe(PROJETO, [a, b]));
    expect('requestedBy' in pedido).toBe(false);
    // a ordem do que a EXECUÇÃO guarda é a recebida, e não a ordenada
    expect(duplo.ler('executions', r.corpo.executionId).metadata.excludedRespondentIds).toEqual([c, a]);
  });

  test('um segundo cálculo NÃO sobrescreve a primeira execução e NÃO toca `calculations`', async () => {
    const legado = { projectId: PROJETO, calculatedAt: 'legado', marcador: 'documento antigo, anterior a F07' };
    duplo.semear('calculations', PROJETO, legado);
    const versaoDoLegado = duplo.versao('calculations', PROJETO);
    const r1 = await chamar({ projectId: PROJETO, requestId: REQ_A });
    const primeiraComoGravada = JSON.stringify(duplo.ler('executions', r1.corpo.executionId));
    await chamar({ projectId: PROJETO, requestId: REQ_B, excludedRespondentIds: [idsDoPainel(PROJETO)[0]] });
    expect(JSON.stringify(duplo.ler('executions', r1.corpo.executionId))).toBe(primeiraComoGravada);
    expect(duplo.ler('calculations', PROJETO)).toEqual(legado);
    expect(duplo.escritas.some((e: any) => e.col === 'calculations')).toBe(false);
    expect(duplo.versao('calculations', PROJETO)).toBe(versaoDoLegado);
  });

  test('recusa de cálculo NÃO cria pedido: o mesmo requestId pode ser usado depois que os dados forem corrigidos', async () => {
    for (const d of duplo.todos('responses')) duplo.semear('responses', d.id, { ...d.data, completedAt: '' });
    const recusada = await chamar({ projectId: PROJETO, requestId: REQ_A });
    expect(recusada.status).toBe(400);
    expect(duplo.quantos('executionRequests')).toBe(0);
    expect(duplo.escritas).toEqual([]);
    // dados corrigidos, MESMO requestId
    RESPOSTAS.forEach((r, i) =>
      duplo.semear('responses', `${PROJETO}__resp-${i}`, {
        projectId: PROJETO, respondentId: `${PROJETO}__${r.id}`, judgments: copia(r.judgments), completedAt: '2026-05-01T12:00:00.000Z',
      })
    );
    const certa = await chamar({ projectId: PROJETO, requestId: REQ_A });
    expect(certa.status).toBe(200);
    expect(certa.corpo.recuperada).toBe(false);
  });

  test('pedido que aponta para execução INEXISTENTE: 500 pedido-inconsistente, sem recalcular e sem criar', async () => {
    duplo.semear('executionRequests', REQ_A, { projectId: PROJETO, executionId: 'exec-que-nao-existe', paramsDigest: paramsDigestDe(PROJETO, []), createdAt: 'z' });
    const r = await chamar({ projectId: PROJETO, requestId: REQ_A });
    expect(r.status).toBe(500);
    expect(r.corpo.codigo).toBe('pedido-inconsistente');
    expect(duplo.escritas).toEqual([]);
    expect(uuidsGerados).toEqual([]);
  });

  test('excludedRespondentIds que não é lista de textos: 400', async () => {
    const r = await chamar({ projectId: PROJETO, requestId: REQ_A, excludedRespondentIds: 'R01' });
    expect(r.status).toBe(400);
    const s = await chamar({ projectId: PROJETO, requestId: REQ_B, excludedRespondentIds: [1, 2] });
    expect(s.status).toBe(400);
    expect(duplo.escritas).toEqual([]);
  });

  test('os dois documentos nascem JUNTOS ou nenhum nasce: um valor inválido na execução impede também o pedido', async () => {
    const execucao = { projectId: PROJETO, requestId: REQ_A, executionId: 'exec-invalida-01', campoInvalido: undefined };
    await expect(
      execucoes.registrarExecucao({ __mock: true }, {
        requestId: REQ_A, projectId: PROJETO, paramsDigest: paramsDigestDe(PROJETO, []), excludedRespondentIds: [], execucao,
      })
    ).rejects.toThrow(/undefined/);
    expect(duplo.quantos('executions')).toBe(0);
    expect(duplo.quantos('executionRequests')).toBe(0);
    expect(duplo.escritas).toEqual([]);
  });

  test('o documento da execução e o do pedido têm a FORMA que as regras propostas exigem (chaves e tipos)', async () => {
    const r = await chamar({ projectId: PROJETO, requestId: REQ_A });
    const e = duplo.ler('executions', r.corpo.executionId);
    const p = duplo.ler('executionRequests', REQ_A);
    // `firestore-regras/firestore.rules`, bloco `executions`
    for (const k of ['projectId', 'requestId', 'executionId', 'engineVersion', 'calculatedAt', 'includedRespondents', 'judgmentsDigest']) expect(k in e).toBe(true);
    for (const k of ['projectId', 'requestId', 'executionId', 'engineVersion', 'calculatedAt']) {
      expect(typeof e[k]).toBe('string');
      expect(e[k].length).toBeGreaterThan(0);
    }
    expect(e.executionId).toBe(r.corpo.executionId); // a regra exige `executionId == id do documento`
    expect(Array.isArray(e.includedRespondents)).toBe(true);
    expect(e.judgmentsDigest !== null && typeof e.judgmentsDigest === 'object' && !Array.isArray(e.judgmentsDigest)).toBe(true);
    // bloco `executionRequests`
    for (const k of ['projectId', 'executionId', 'paramsDigest', 'createdAt']) {
      expect(typeof p[k]).toBe('string');
      expect(p[k].length).toBeGreaterThan(0);
    }
    // vínculo cruzado que as regras conferem com `getAfter`
    expect(p.executionId).toBe(e.executionId);
    expect(p.projectId).toBe(e.projectId);
    expect(e.requestId).toBe(REQ_A);
  });

  test('a constante da versão do motor é texto não vazio e a regra de atualização está no cabeçalho do módulo', () => {
    expect(typeof ENGINE_VERSION).toBe('string');
    expect(ENGINE_VERSION.length).toBeGreaterThan(0);
    const fonte = fs.readFileSync(path.join(RAIZ, 'lib', 'engine-version.ts'), 'utf8');
    expect(fonte).toMatch(/REGRA DE ATUALIZAÇÃO/);
    expect(fonte).toMatch(/CONVENÇÃO/);
  });
});

describe('o arquivo de regras proposto (firestore-regras/firestore.rules)', () => {
  const REGRAS = path.join(RAIZ, 'firestore-regras', 'firestore.rules');
  // O conjunto COMPLETO ensaiado no emulador (pacote `f07-regras-teste`, rodada final).
  const SHA256_ENSAIADO = 'c886655c2116dcd4c3d15d14887f66cd58e4b4bb75ba27c836778429c22242a9';

  test('está no repositório byte a byte igual ao conjunto ensaiado', () => {
    const bytes = fs.readFileSync(REGRAS);
    expect(bytes.length).toBe(8118);
    expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(SHA256_ENSAIADO);
  });

  test('ESTÁ NO REPOSITÓRIO COMO ARQUIVO, E SÓ: nenhuma configuração de publicação o referencia', () => {
    // Sem firebase.json nem .firebaserc, a CLI do Firebase não tem o que publicar a partir daqui.
    expect(fs.existsSync(path.join(RAIZ, 'firebase.json'))).toBe(false);
    expect(fs.existsSync(path.join(RAIZ, '.firebaserc'))).toBe(false);
    const pacote = fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8');
    expect(pacote).not.toMatch(/firestore\.rules|firebase deploy|firestore-regras/);
    const fluxos = path.join(RAIZ, '.github', 'workflows');
    if (fs.existsSync(fluxos)) {
      for (const f of fs.readdirSync(fluxos)) {
        expect(fs.readFileSync(path.join(fluxos, f), 'utf8')).not.toMatch(/firestore\.rules|firebase deploy|firestore-regras/);
      }
    }
  });

  test('as regras exigem, para executions e executionRequests, as chaves que a rota grava', () => {
    const regras = fs.readFileSync(REGRAS, 'utf8');
    const exec = regras.slice(regras.indexOf('match /executions/'), regras.indexOf('match /executionRequests/'));
    const ped = regras.slice(regras.indexOf('match /executionRequests/'), regras.indexOf('match /referenceChanges/'));
    const chaves = (trecho: string) => [...(trecho.match(/hasAll\(\[([^\]]*)\]\)/)?.[1] ?? '').matchAll(/'([^']+)'/g)].map(m => m[1]);
    expect(chaves(exec).sort()).toEqual(['calculatedAt', 'engineVersion', 'executionId', 'includedRespondents', 'judgmentsDigest', 'projectId', 'requestId']);
    expect(chaves(ped).sort()).toEqual(['createdAt', 'executionId', 'paramsDigest', 'projectId']);
  });
});

// ===========================================================================================
// O módulo de intenções
// ===========================================================================================

describe('lib/intencoes.ts', () => {
  const intencaoDe = (id: string, projectId = PROJETO) => ({ tipo: 'calculo', id, projectId, excludedRespondentIds: [], criadaEm: '2026-10-11T00:00:00.000Z' });

  test('classificarResposta: sucesso confirma; 4xx definitivo recusa; 408, 429, 5xx e corpo ilegível ficam pendentes', () => {
    const c = intencoes.classificarResposta;
    expect(c({ status: 200, corpo: { success: true } })).toBe('confirmada');
    expect(c({ status: 200, corpo: { success: false } })).toBe('pendente');
    expect(c({ status: 400, corpo: { success: false } })).toBe('recusada');
    expect(c({ status: 404, corpo: { success: false } })).toBe('recusada');
    expect(c({ status: 409, corpo: { success: false } })).toBe('recusada');
    expect(c({ status: 408, corpo: { success: false } })).toBe('pendente');
    expect(c({ status: 429, corpo: { success: false } })).toBe('pendente');
    expect(c({ status: 500, corpo: { success: false } })).toBe('pendente');
    expect(c({ status: 502, corpo: null })).toBe('pendente');
    expect(c({ status: 404, corpo: null })).toBe('pendente'); // página de erro que não é JSON
  });

  test('uma entrada por intenção, com o identificador na chave; registrar outra não apaga a primeira', () => {
    const arm = armazenamentoEmMemoria();
    expect(intencoes.registrarIntencao(arm, intencaoDe('req-aaaa-0001'))).toBe(true);
    expect(intencoes.registrarIntencao(arm, intencaoDe('req-aaaa-0002'))).toBe(true);
    expect([...arm.mapa.keys()].sort()).toEqual([
      'ahp:intencao:calculo:req-aaaa-0001',
      'ahp:intencao:calculo:req-aaaa-0002',
    ]);
    intencoes.removerIntencao(arm, 'calculo', 'req-aaaa-0001');
    expect([...arm.mapa.keys()]).toEqual(['ahp:intencao:calculo:req-aaaa-0002']);
  });

  test('sem armazenamento: registrar devolve false, e listar diz que NÃO foi possível verificar (vazio não prova ausência)', async () => {
    expect(intencoes.registrarIntencao(null, intencaoDe('req-aaaa-0001'))).toBe(false);
    const lista = intencoes.listarIntencoes(null);
    expect(lista).toEqual({ intencoes: [], ilegiveis: [], verificavel: false });
    const r = await intencoes.executarCalculo({ armazenamento: null, enviar: enviarParaARota, gerarId: sequenciaDeIds('req-sem-armazem') }, { projectId: PROJETO });
    expect(r.persistida).toBe(false);
    expect(r.desfecho.situacao).toBe('confirmada'); // a ação segue
    const aviso = intencoes.resumirRetomada({ desfechos: [], ilegiveis: [], verificavel: false });
    expect(aviso.linhas.join(' ')).toMatch(/não foi possível verificar/);
    // e o caso verificável e vazio NÃO diz isso
    expect(intencoes.resumirRetomada({ desfechos: [], ilegiveis: [], verificavel: true }).linhas).toEqual([]);
  });

  test('armazenamento que LANÇA ao gravar: registrar devolve false, sem propagar', () => {
    const quebrado = { ...armazenamentoEmMemoria(), setItem: () => { throw new Error('quota'); } };
    expect(intencoes.registrarIntencao(quebrado, intencaoDe('req-aaaa-0001'))).toBe(false);
  });

  test('entrada ILEGÍVEL é relatada e MANTIDA, e não derruba a varredura das outras', async () => {
    const arm = armazenamentoEmMemoria();
    arm.setItem('ahp:intencao:calculo:req-quebrada-1', '{nao-e-json');
    arm.setItem('ahp:intencao:calculo:req-forma-ruim', JSON.stringify({ tipo: 'calculo', id: 'req-forma-ruim' }));
    arm.setItem('ahp:intencao:calculo:req-chave-nao-bate', JSON.stringify(intencaoDe('req-outro-id-aaa')));
    intencoes.registrarIntencao(arm, intencaoDe('req-boa-00001'));
    arm.setItem('outra-coisa', 'não é intenção');
    const relato = await intencoes.retomarPendentes({ armazenamento: arm, enviar: enviarParaARota, gerarId: sequenciaDeIds() });
    expect(relato.desfechos).toHaveLength(1);
    expect(relato.ilegiveis.sort()).toEqual([
      'ahp:intencao:calculo:req-chave-nao-bate',
      'ahp:intencao:calculo:req-forma-ruim',
      'ahp:intencao:calculo:req-quebrada-1',
    ]);
    expect(arm.mapa.has('ahp:intencao:calculo:req-quebrada-1')).toBe(true);
    expect(arm.mapa.has('outra-coisa')).toBe(true);
    expect(intencoes.resumirRetomada(relato).linhas.join(' ')).toMatch(/3 registro\(s\)/);
  });

  test('a retomada reenvia o MESMO requestId e os MESMOS parâmetros que a ação gravou', async () => {
    const arm = armazenamentoEmMemoria();
    const excl = [idsDoPainel(PROJETO)[1]];
    await intencoes.executarCalculo({ armazenamento: arm, enviar: async () => { throw new Error('x'); }, gerarId: sequenciaDeIds('req-reenvio-001') }, { projectId: PROJETO, excludedRespondentIds: excl });
    const enviados: any[] = [];
    await intencoes.retomarPendentes({ armazenamento: arm, enviar: async (i: any) => { enviados.push(copia(i)); return enviarParaARota(i); }, gerarId: sequenciaDeIds() });
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({ id: 'req-reenvio-001', projectId: PROJETO, excludedRespondentIds: excl });
    expect(duplo.ler('executionRequests', 'req-reenvio-001').excludedRespondentIds).toEqual(excl);
  });
});

// ===========================================================================================
// Fiação das telas, por LEITURA do fonte
// ===========================================================================================

describe('fiação das telas, por LEITURA (nenhuma tela é executada por teste algum)', () => {
  const ler = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const ocorrencias = (t: string, a: string) => t.split(a).length - 1;
  const PAGINAS = ['app/decisor/projetos/page.tsx', 'app/decisor/resultados/[projectId]/page.tsx'];

  test.each(PAGINAS)('%s: nenhum fetch direto a /api/calculate, e o cálculo passa por executarCalculo', rel => {
    const f = ler(rel);
    expect(ocorrencias(f, "'/api/calculate'")).toBe(0);
    // ⚠ F07 A4: o corpo do recálculo da página de resultados MOVEU para `lib/fluxos-da-tela.ts`
    //   (`recalcularResultados`), e a página lhe entrega `executarCalculo` como a função `executar`. A
    //   chamada deixou de ser `await executarCalculo(` nela; o que este teste exige (o cálculo passa por
    //   `executarCalculo`, uma vez) é conferido nas duas formas.
    if (rel.includes('resultados')) {
      expect(ocorrencias(f, 'await executarCalculo(')).toBe(0);
      expect(ocorrencias(f, 'executar: parametros => executarCalculo(dependenciasDoNavegador(), parametros),')).toBe(1);
      const fluxos = ler('lib/fluxos-da-tela.ts');
      expect(ocorrencias(fluxos, "'/api/calculate'")).toBe(0);
      expect(ocorrencias(fluxos, 'await args.executar(')).toBe(1);
    } else {
      expect(ocorrencias(f, 'await executarCalculo(')).toBe(1);
    }
    expect(ocorrencias(f, 'retomarPendentes(')).toBe(1);
  });

  test('o único envio ao servidor está em lib/intencoes.ts e leva o requestId da intenção', () => {
    const f = ler('lib/intencoes.ts');
    expect(ocorrencias(f, "'/api/calculate'")).toBe(1);
    expect(f).toMatch(/requestId: intencao\.id/);
  });

  test('a rota não importa mais setDoc e não escreve em calculations', () => {
    const f = ler('app/api/calculate/route.ts');
    expect(/\bsetDoc\b/.test(f.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))).toBe(false);
    expect(/doc\(\s*db\s*,\s*['"]calculations['"]/.test(f.replace(/\/\/.*$/gm, ''))).toBe(false);
  });
});
