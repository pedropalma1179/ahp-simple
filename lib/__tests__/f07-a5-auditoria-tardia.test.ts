/**
 * lib/__tests__/f07-a5-auditoria-tardia.test.ts
 *
 * F07, entrega A5, ponto 3: a falha TARDIA da auditoria escapava da conferência do par.
 *
 * Causa: estado ou resposta de uma apresentação anterior aplicado à apresentação atual. Aqui o que era
 * aplicado era o AVISO: `solicitarAuditoria` devolvia `'indisponivel'` no `catch`, ANTES da conferência
 * do par, e `recalcularResultados` escrevia `MENSAGEM_DA_AUDITORIA_INDISPONIVEL` («o cálculo foi
 * concluído e está apresentado») numa tela que podia já apresentar outra coisa.
 *
 * Exercita as funções REAIS de `lib/fluxos-da-tela.ts` e `lib/apresentacao-corrente.ts`, as que
 * `app/decisor/resultados/[projectId]/page.tsx` chama (a ligação está no último bloco, por leitura).
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** Que a página funcione: nenhuma tela é montada. Os setters são
 * um armazém simples, e não os de `useState`.
 */

// ⚠ Este arquivo é um MÓDULO (`export {}`): sem isso, os `const` de topo entram no escopo GLOBAL do `tsc` e colidem com os
// de outros arquivos de teste que também usam `require` (TS6200).
export {};

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const par = require('@/lib/apresentacao-corrente');
const fluxos = require('@/lib/fluxos-da-tela');
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;

interface Adiado<T> { promessa: Promise<T>; resolver(v: T): void; rejeitar(e: unknown): void }
function adiado<T>(): Adiado<T> {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => { resolver = res; rejeitar = rej; });
  return { promessa, resolver, rejeitar };
}

function criarTela() {
  const estado: Record<string, any> = { calculation: null, excludedIds: ['inicial'], aiReview: 'parecer', audit: 'auditoria', error: '', avisos: [] as string[] };
  const historico: string[] = [];
  const m = (n: string) => historico.push(n);
  const acoes = {
    setCalculation: (d: any) => { estado.calculation = d; m('setCalculation'); },
    setExibicao: () => m('setExibicao'),
    setExcludedIds: (ids: string[]) => { estado.excludedIds = ids; m('setExcludedIds'); },
    setAiReview: (v: any) => { estado.aiReview = v; m('setAiReview'); },
    setAudit: (a: any) => { estado.audit = a; m('setAudit'); },
    setExecucaoRecemCalculada: () => m('setExecucaoRecemCalculada'),
    setError: (t: string) => { estado.error = t; m('setError'); },
    setIsRecalculating: () => m('setIsRecalculating'),
    setLoading: () => m('setLoading'),
    acrescentarAviso: (t: string) => { estado.avisos.push(t); m('acrescentarAviso'); },
  };
  return { estado, historico, acoes };
}

function auditoriaControlada() {
  const pedidos: { documento: any; d: Adiado<any> }[] = [];
  const enviar = (documento: any) => { const d = adiado<any>(); pedidos.push({ documento, d }); return d.promessa; };
  return { enviar, pedidos };
}

const doc = (id: string) => ({ executionId: id, responseCount: 12, metadata: { excludedRespondentIds: [`excl-${id}`] } });
const DOC_A = doc('exec-A');
const DOC_B = doc('exec-B');
const esvaziar = () => new Promise<void>(r => setImmediate(r));
const confirmadoCom = (calculation: any) => async () => ({
  desfecho: {
    situacao: 'confirmada',
    intencao: { tipo: 'calculo', id: 'req-a5-000', projectId: 'p', excludedRespondentIds: [], criadaEm: 'z' },
    resposta: { status: 200, corpo: { success: true, executionId: calculation.executionId, recuperada: false, calculation } },
  },
  persistida: true,
});

let log: jest.SpyInstance;
const linhasDoLog = (): string[] => log.mock.calls.map(c => String(c[0]));
beforeEach(() => {
  log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

const TEXTO_DO_LOG_CORRENTE = 'Auditoria não disponível';
const TEXTO_DO_LOG_TARDIO = 'de uma apresentação que a tela já deixou';

describe('A5.3: a falha da auditoria, dentro e fora do par', () => {
  test('(critério 1) falha da auditoria na apresentação CORRENTE: aviso na tela, como hoje, e o desfecho é "indisponivel"', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const rec = fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: [], executar: confirmadoCom(doc('exec-NOVA')),
      registro, acoes: tela.acoes, enviarAuditoria: aud.enviar,
    });
    await esvaziar();
    aud.pedidos[0].d.rejeitar(new Error('rede caiu'));
    expect(await rec).toBe('concluido-sem-auditoria');
    expect(tela.estado.avisos).toEqual([fluxos.MENSAGEM_DA_AUDITORIA_INDISPONIVEL]);
    expect(tela.estado.error).toBe('');
    expect(linhasDoLog()).toContain(TEXTO_DO_LOG_CORRENTE);
    expect(linhasDoLog().some(l => l.includes(TEXTO_DO_LOG_TARDIO))).toBe(false);
  });

  test('(critério 2) falha da auditoria de uma apresentação que a tela JÁ DEIXOU: NENHUM aviso, e o registro no log', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const rec = fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: [], executar: confirmadoCom(doc('exec-NOVA')),
      registro, acoes: tela.acoes, enviarAuditoria: aud.enviar,
    });
    await esvaziar();
    // a auditoria da execução NOVA está em voo; a pessoa troca para B
    registro.apresentar(DOC_B);
    aud.pedidos[0].d.rejeitar(new Error('rede caiu'));
    const desfecho = await rec;
    expect(tela.estado.avisos).toEqual([]);
    expect(tela.historico).not.toContain('acrescentarAviso');
    expect(tela.estado.error).toBe('');
    expect(desfecho).toBe('concluido'); // o cálculo foi concluído; nada a dizer sobre a tela de agora
    expect(linhasDoLog().some(l => l.includes(TEXTO_DO_LOG_TARDIO))).toBe(true);
    expect(linhasDoLog()).not.toContain(TEXTO_DO_LOG_CORRENTE); // o texto da falha corrente não é usado para a tardia
  });

  test('o DESFECHO distingue as duas, e a informação de que houve falha NÃO se perde (a forma preferida no pedido)', async () => {
    const registro = par.criarRegistroDaApresentacao();
    const pAtual = registro.apresentar(DOC_A);
    const rejeita = () => Promise.reject(new Error('x'));
    // dentro do par
    expect(await fluxos.solicitarAuditoria({ documento: DOC_A, par: pAtual, registro, enviar: rejeita, aplicar: () => undefined })).toBe('indisponivel');
    // fora do par: a tela passou a B
    registro.apresentar(DOC_B);
    expect(await fluxos.solicitarAuditoria({ documento: DOC_A, par: pAtual, registro, enviar: rejeita, aplicar: () => undefined })).toBe('indisponivel-tardia');
  });

  test('a conferência é feita NO RETORNO da falha: a troca que acontece ENQUANTO o pedido está em voo vale', async () => {
    const registro = par.criarRegistroDaApresentacao();
    const p = registro.apresentar(DOC_A);
    const d = adiado<any>();
    const emVoo = fluxos.solicitarAuditoria({ documento: DOC_A, par: p, registro, enviar: () => d.promessa, aplicar: () => undefined });
    registro.apresentar(DOC_B); // troca ANTES de a falha chegar
    d.rejeitar(new Error('x'));
    expect(await emVoo).toBe('indisponivel-tardia');
  });

  test('a mesma execução apresentada de novo (A, B, A) é OUTRA apresentação: a falha de uma auditoria pedida na primeira é tardia na terceira', async () => {
    const registro = par.criarRegistroDaApresentacao();
    const primeira = registro.apresentar(DOC_A);
    registro.apresentar(DOC_B);
    registro.apresentar(DOC_A);
    expect(await fluxos.solicitarAuditoria({ documento: DOC_A, par: primeira, registro, enviar: () => Promise.reject(new Error('x')), aplicar: () => undefined })).toBe('indisponivel-tardia');
  });

  test('(critério 3) os DOIS chamadores que só registravam continuam SÓ registrando: nenhum aviso, nenhum erro, nada revertido', async () => {
    for (const [nome, rodar] of [
      ['exibirExecucaoEscolhida', (tela: any, registro: any, enviar: any) => fluxos.exibirExecucaoEscolhida({ documento: DOC_A, registro, acoes: tela.acoes, enviarAuditoria: enviar })],
      ['apresentarCargaInicial', (tela: any, registro: any, enviar: any) => fluxos.apresentarCargaInicial({ documento: DOC_A, exibicao: { tipo: 'execucao', executionId: 'exec-A' }, registro, acoes: tela.acoes, enviarAuditoria: enviar })],
    ] as [string, (t: any, r: any, e: any) => Promise<string>][]) {
      // falha na apresentação corrente
      let tela = criarTela();
      let registro = par.criarRegistroDaApresentacao();
      expect([nome, await rodar(tela, registro, () => Promise.reject(new Error('x')))]).toEqual([nome, 'indisponivel']);
      expect([nome, tela.estado.avisos, tela.estado.error, tela.historico.includes('acrescentarAviso'), tela.historico.includes('setError')]).toEqual([nome, [], '', false, false]);
      expect(linhasDoLog()).toContain(TEXTO_DO_LOG_CORRENTE);
      // falha tardia
      log.mockClear();
      tela = criarTela();
      registro = par.criarRegistroDaApresentacao();
      const aud = auditoriaControlada();
      const emVoo = rodar(tela, registro, aud.enviar);
      await esvaziar();
      registro.apresentar(DOC_B);
      aud.pedidos[0].d.rejeitar(new Error('x'));
      expect([nome, await emVoo]).toEqual([nome, 'indisponivel-tardia']);
      expect([nome, tela.estado.avisos, tela.estado.error, tela.historico.includes('acrescentarAviso'), tela.historico.includes('setError')]).toEqual([nome, [], '', false, false]);
      expect(linhasDoLog().some(l => l.includes(TEXTO_DO_LOG_TARDIO))).toBe(true);
    }
  });

  test('`escreverSeVigente` NÃO captura a exceção de `produzir`, de propósito: não compartilha o defeito e não foi unificado com `solicitarAuditoria`', async () => {
    const registro = par.criarRegistroDaApresentacao();
    const p = registro.apresentar(DOC_A);
    await expect(fluxos.escreverSeVigente(registro, p, () => Promise.reject(new Error('quem chama decide')), () => undefined)).rejects.toThrow('quem chama decide');
    // e a escrita só acontece dentro do par
    const escritos: string[] = [];
    expect(await fluxos.escreverSeVigente(registro, p, async () => 'v', v => escritos.push(v))).toBe('escrita');
    registro.apresentar(DOC_B);
    expect(await fluxos.escreverSeVigente(registro, p, async () => 'v2', v => escritos.push(v))).toBe('descartada');
    expect(escritos).toEqual(['v']);
  });
});

describe('A5.3: a ligação, por LEITURA do fonte (nenhuma tela é montada)', () => {
  const FLUXOS = ler('lib/fluxos-da-tela.ts');
  const PAGINA = ler('app/decisor/resultados/[projectId]/page.tsx');

  test('os três chamadores de `solicitarAuditoria` tratam o desfecho por `registrarFalhaDaAuditoria`, e só o recálculo escreve o aviso', () => {
    expect(ocorrencias(FLUXOS, 'await solicitarAuditoria({')).toBe(3);
    expect(ocorrencias(FLUXOS, 'registrarFalhaDaAuditoria(r);')).toBe(3);
    expect(ocorrencias(FLUXOS, 'acoes.acrescentarAviso(MENSAGEM_DA_AUDITORIA_INDISPONIVEL)')).toBe(1);
    // o aviso fica DENTRO do ramo `r === 'indisponivel'` (e não do 'indisponivel-tardia')
    const i = FLUXOS.indexOf("if (r === 'indisponivel') {");
    const j = FLUXOS.indexOf('acoes.acrescentarAviso(MENSAGEM_DA_AUDITORIA_INDISPONIVEL)');
    expect(i).toBeGreaterThan(0);
    expect(j).toBeGreaterThan(i);
    expect(ocorrencias(FLUXOS, "r === 'indisponivel-tardia'")).toBe(0);
  });

  test('a página chama os três fluxos uma vez cada, e não tem `fetch` da auditoria (a ligação de A4, preservada)', () => {
    for (const chamada of ['await exibirExecucaoEscolhida(', 'await apresentarCargaInicial(', 'await recalcularResultados(']) expect([chamada, ocorrencias(PAGINA, chamada)]).toEqual([chamada, 1]);
    expect(ocorrencias(PAGINA, '/api/audit-decision')).toBe(0);
  });
});
