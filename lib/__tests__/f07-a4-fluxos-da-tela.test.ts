/**
 * lib/__tests__/f07-a4-fluxos-da-tela.test.ts
 *
 * F07, entrega A4, itens 1 e 2: a quem pertence uma resposta assíncrona, e a falha da auditoria que
 * contaminava o estado de um cálculo já confirmado.
 *
 * O que se exercita de verdade: as funções REAIS de `lib/apresentacao-corrente.ts` e
 * `lib/fluxos-da-tela.ts`, que são as que `app/decisor/resultados/[projectId]/page.tsx` chama com os
 * seus setters. Os pedidos ao servidor são substituídos por promessas CONTROLADAS (a resposta chega
 * quando o teste manda), e os setters, por um armazém que registra cada escrita.
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** Que a página funcione: nenhuma tela é montada. Os fluxos
 * exercitados são os que a página chama; que ela os chama, e uma vez cada, é conferido por LEITURA do
 * fonte (último bloco), e a leitura não prova o comportamento no navegador. Os setters de teste são
 * armazéns simples, e não os de `useState`.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const par = require('@/lib/apresentacao-corrente');
const fluxos = require('@/lib/fluxos-da-tela');
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;

// ─────────────────────────────────────────────────────────────────────────────
// A bancada
// ─────────────────────────────────────────────────────────────────────────────

interface Adiado<T> {
  promessa: Promise<T>;
  resolver(v: T): void;
  rejeitar(e: unknown): void;
}
function adiado<T>(): Adiado<T> {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => {
    resolver = res;
    rejeitar = rej;
  });
  return { promessa, resolver, rejeitar };
}

/** O armazém de estado: cada setter grava e registra. */
function criarTela() {
  const estado: Record<string, any> = {
    calculation: 'sem-calculo',
    exibicao: null,
    excludedIds: ['inicial'],
    aiReview: 'parecer-inicial',
    audit: 'auditoria-inicial',
    execucaoRecemCalculada: null,
    error: '',
    isRecalculating: false,
    loading: false,
    avisos: [] as string[],
  };
  const historico: string[] = [];
  const marcar = (nome: string) => historico.push(nome);
  const acoes = {
    setCalculation: (d: any) => { estado.calculation = d; marcar('setCalculation'); },
    setExibicao: (e: any) => { estado.exibicao = e; marcar('setExibicao'); },
    setExcludedIds: (ids: string[]) => { estado.excludedIds = ids; marcar('setExcludedIds'); },
    setAiReview: (v: any) => { estado.aiReview = v; marcar('setAiReview'); },
    setAudit: (a: any) => { estado.audit = a; marcar('setAudit'); },
    setExecucaoRecemCalculada: (d: any) => { estado.execucaoRecemCalculada = d; marcar('setExecucaoRecemCalculada'); },
    setError: (m: string) => { estado.error = m; marcar('setError'); },
    setIsRecalculating: (b: boolean) => { estado.isRecalculating = b; marcar('setIsRecalculating'); },
    setLoading: (b: boolean) => { estado.loading = b; marcar('setLoading'); },
    acrescentarAviso: (t: string) => { estado.avisos.push(t); marcar('acrescentarAviso'); },
  };
  return { estado, historico, acoes };
}

/** Auditoria controlada: cada chamada de `enviar` vira um pedido cuja resposta o teste resolve. */
function auditoriaControlada() {
  const pedidos: { documento: any; d: Adiado<any> }[] = [];
  const enviar = (documento: any) => {
    const d = adiado<any>();
    pedidos.push({ documento, d });
    return d.promessa;
  };
  return { enviar, pedidos };
}
const respostaDeAuditoria = (rotulo: string) => ({ success: true, audit: rotulo });

const doc = (id: string | null, extra: Record<string, unknown> = {}) => ({
  ...(id === null ? {} : { executionId: id }),
  responseCount: 12,
  metadata: { excludedRespondentIds: id === null ? [] : [`excl-${id}`] },
  ...extra,
});
const DOC_A = doc('exec-A');
const DOC_B = doc('exec-B');

/** Deixa as promessas encadeadas correrem. */
const esvaziar = () => new Promise<void>(r => setImmediate(r));

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 1: o par (identidade, geração)
// ═════════════════════════════════════════════════════════════════════════════

describe('A4.1.0: o registro e a conferência do par', () => {
  test('a geração avança a CADA apresentação, inclusive quando a execução é a mesma de antes', () => {
    const r = par.criarRegistroDaApresentacao();
    expect(r.capturar()).toEqual({ executionId: null, geracao: 0 });
    const a1 = r.apresentar(DOC_A);
    const b = r.apresentar(DOC_B);
    const a2 = r.apresentar(DOC_A);
    const a3 = r.apresentar(DOC_A); // a MESMA execução, de novo
    expect([a1.geracao, b.geracao, a2.geracao, a3.geracao]).toEqual([1, 2, 3, 4]);
    expect([a1.executionId, b.executionId, a2.executionId, a3.executionId]).toEqual(['exec-A', 'exec-B', 'exec-A', 'exec-A']);
    expect(r.capturar()).toEqual(a3);
  });

  test('a conferência diz de que VÍNCULO ela se vale: par completo, ou só a geração (garantia mais fraca)', () => {
    const r = par.criarRegistroDaApresentacao();
    const a = r.apresentar(DOC_A);
    expect(r.conferir(a)).toMatchObject({ aceita: true, vinculo: 'identificador-e-geracao' });
    const legado = r.apresentar(doc(null));
    expect(r.conferir(legado)).toMatchObject({ aceita: true, vinculo: 'so-geracao' });
    // o par antigo, agora, não confere: a geração é outra
    expect(r.conferir(a)).toEqual({ aceita: false, vinculo: null, motivo: 'geracao-diferente' });
  });

  test('a AUSÊNCIA de identificador nunca é tratada como igualdade: a conferência declara que vale só a geração', () => {
    const c = par.conferirPar({ executionId: null, geracao: 7 }, { executionId: null, geracao: 7 });
    expect(c.aceita).toBe(true);
    expect(c.vinculo).toBe('so-geracao'); // e NÃO 'identificador-e-geracao'
    // identificador de um lado só: nada a comparar, e a conferência recusa
    expect(par.conferirPar({ executionId: null, geracao: 7 }, { executionId: 'exec-A', geracao: 7 })).toMatchObject({ aceita: false, motivo: 'identificador-presente-so-em-um-lado' });
    expect(par.conferirPar({ executionId: 'exec-A', geracao: 7 }, { executionId: null, geracao: 7 })).toMatchObject({ aceita: false, motivo: 'identificador-presente-so-em-um-lado' });
    // a geração decide antes: ausência dos dois lados, gerações diferentes
    expect(par.conferirPar({ executionId: null, geracao: 6 }, { executionId: null, geracao: 7 })).toMatchObject({ aceita: false, motivo: 'geracao-diferente' });
  });

  test('um identificador de texto vazio ou que não é texto conta como AUSENTE (vem de identificarExecucao)', () => {
    const r = par.criarRegistroDaApresentacao();
    expect(r.apresentar({ executionId: '' }).executionId).toBeNull();
    expect(r.apresentar({ executionId: 123 }).executionId).toBeNull();
    expect(r.apresentar(null).executionId).toBeNull();
    expect(r.apresentar(undefined).geracao).toBe(4);
  });

  test('a ordem de pedidos: só o último bilhete é vigente', () => {
    const o = par.criarOrdemDePedidos();
    const b1 = o.novo();
    const b2 = o.novo();
    expect([o.vigente(b1), o.vigente(b2)]).toEqual([false, true]);
  });
});

describe('A4.1: a auditoria só escreve se o par for o da apresentação corrente', () => {
  test('(critério 1) duas respostas FORA DE ORDEM sobre execuções distintas: o estado final carrega a auditoria da apresentação corrente', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const a = fluxos.exibirExecucaoEscolhida({ documento: DOC_A, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    const b = fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    await esvaziar();
    expect(aud.pedidos.map(p => p.documento.executionId)).toEqual(['exec-A', 'exec-B']);

    // a de B chega primeiro; a de A, TARDIA, chega depois (a "última resposta vence" escreveria A)
    aud.pedidos[1].d.resolver(respostaDeAuditoria('auditoria-de-B'));
    expect(await b).toBe('aplicada');
    aud.pedidos[0].d.resolver(respostaDeAuditoria('auditoria-de-A'));
    expect(await a).toBe('descartada');

    expect(tela.estado.calculation).toBe(DOC_B);
    expect(tela.estado.exibicao).toEqual({ tipo: 'execucao', executionId: 'exec-B' });
    expect(tela.estado.audit).toBe('auditoria-de-B'); // execução B COM a auditoria de B
  });

  test('(critério 1, outra ordem) a resposta de A chega ANTES da de B: A é descartada porque B já é a apresentação', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const a = fluxos.exibirExecucaoEscolhida({ documento: DOC_A, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    const b = fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    await esvaziar();
    aud.pedidos[0].d.resolver(respostaDeAuditoria('auditoria-de-A'));
    expect(await a).toBe('descartada');
    expect(tela.estado.audit).toBeNull(); // nada de A; a de B ainda não chegou e a limpeza de B permanece
    aud.pedidos[1].d.resolver(respostaDeAuditoria('auditoria-de-B'));
    expect(await b).toBe('aplicada');
    expect(tela.estado.audit).toBe('auditoria-de-B');
  });

  test('(critério 2) resposta tardia de uma execução que NÃO é mais a apresentada: nenhum estado escrito por ela', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const a = fluxos.exibirExecucaoEscolhida({ documento: DOC_A, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    const b = fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    await esvaziar();
    aud.pedidos[1].d.resolver(respostaDeAuditoria('auditoria-de-B'));
    await b;
    const antes = { historico: [...tela.historico], estado: JSON.stringify(tela.estado) };
    aud.pedidos[0].d.resolver(respostaDeAuditoria('auditoria-de-A'));
    await a;
    // ZERO escritas depois da chegada da resposta tardia, e o estado é byte a byte o de antes
    expect(tela.historico).toEqual(antes.historico);
    expect(JSON.stringify(tela.estado)).toBe(antes.estado);
  });

  test('(critério 3) A, B, A: a resposta pedida na PRIMEIRA apresentação de A é descartada quando chega na TERCEIRA', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const p1 = fluxos.exibirExecucaoEscolhida({ documento: DOC_A, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    const p2 = fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    const p3 = fluxos.exibirExecucaoEscolhida({ documento: DOC_A, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    await esvaziar();
    expect(aud.pedidos.map(p => p.documento.executionId)).toEqual(['exec-A', 'exec-B', 'exec-A']);
    // A TERCEIRA apresentação limpou a auditoria de propósito (setAudit(null))
    expect(tela.estado.audit).toBeNull();

    // chega a resposta da PRIMEIRA apresentação de A, durante a terceira. O identificador sozinho a aceitaria
    // (exec-A == exec-A) e ressuscitaria o estado apagado; o par a descarta.
    aud.pedidos[0].d.resolver(respostaDeAuditoria('auditoria-da-primeira-apresentacao-de-A'));
    expect(await p1).toBe('descartada');
    expect(tela.estado.audit).toBeNull();

    // a prova de que é o PAR, e não o identificador, que decidiu: os dois identificadores são iguais
    const geracoes = [1, 2, 3];
    expect(aud.pedidos[0].documento.executionId).toBe(aud.pedidos[2].documento.executionId);
    expect(registro.capturar().geracao).toBe(geracoes[2]);
    expect(par.conferirPar({ executionId: 'exec-A', geracao: 1 }, registro.capturar())).toEqual({ aceita: false, vinculo: null, motivo: 'geracao-diferente' });

    aud.pedidos[1].d.resolver(respostaDeAuditoria('auditoria-de-B'));
    expect(await p2).toBe('descartada');
    aud.pedidos[2].d.resolver(respostaDeAuditoria('auditoria-da-terceira-apresentacao-de-A'));
    expect(await p3).toBe('aplicada');
    expect(tela.estado.audit).toBe('auditoria-da-terceira-apresentacao-de-A');
  });

  test('(critério 4) documento LEGADO sem executionId: a resposta de outra apresentação é descartada, e a dupla ausência não é igualdade', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const legado1 = doc(null, { marca: 'legado-1' });
    const legado2 = doc(null, { marca: 'legado-2' });
    const l1 = fluxos.exibirExecucaoEscolhida({ documento: legado1, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    const l2 = fluxos.exibirExecucaoEscolhida({ documento: legado2, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    await esvaziar();
    // os dois documentos NÃO têm identificador: comparar `null` com `null` aceitaria a resposta errada
    expect([registro.capturar().executionId, aud.pedidos[0].documento.executionId]).toEqual([null, undefined]);

    aud.pedidos[0].d.resolver(respostaDeAuditoria('auditoria-do-legado-1'));
    expect(await l1).toBe('descartada');
    expect(tela.estado.audit).toBeNull();

    aud.pedidos[1].d.resolver(respostaDeAuditoria('auditoria-do-legado-2'));
    expect(await l2).toBe('aplicada');
    expect(tela.estado.audit).toBe('auditoria-do-legado-2');

    // e a garantia dessa aceitação é DECLARADA como a mais fraca
    expect(registro.conferir(registro.capturar())).toMatchObject({ aceita: true, vinculo: 'so-geracao' });
  });

  test('a resposta que NÃO é sucesso, para a apresentação corrente, não escreve (como antes de A4); e o envio que lança é "indisponível"', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const p = fluxos.exibirExecucaoEscolhida({ documento: DOC_A, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    await esvaziar();
    aud.pedidos[0].d.resolver({ success: false, error: 'x' });
    expect(await p).toBe('sem-sucesso');
    expect(tela.estado.audit).toBeNull();

    const q = fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: () => Promise.reject(new Error('rede')) });
    expect(await q).toBe('indisponivel');
    expect(tela.estado.audit).toBeNull();
    expect(tela.estado.error).toBe(''); // a auditoria indisponível NÃO vira erro de tela
  });

  test('exibirExecucaoEscolhida: o estado da apresentação é completo e a geração avança ANTES das limpezas', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const p = fluxos.exibirExecucaoEscolhida({ documento: DOC_A, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    await esvaziar();
    expect(tela.estado).toMatchObject({ calculation: DOC_A, exibicao: { tipo: 'execucao', executionId: 'exec-A' }, excludedIds: ['excl-exec-A'], aiReview: null, audit: null });
    expect(tela.historico.slice(0, 5)).toEqual(['setCalculation', 'setExibicao', 'setExcludedIds', 'setAiReview', 'setAudit']);
    aud.pedidos[0].d.resolver(respostaDeAuditoria('ok'));
    await p;
  });

  test('a carga inicial: a auditoria dela também é conferida, e uma troca da pessoa a torna tardia', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const carga = fluxos.apresentarCargaInicial({ documento: DOC_A, exibicao: { tipo: 'execucao', executionId: 'exec-A' }, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    await esvaziar();
    expect(tela.estado.calculation).toBe(DOC_A);
    // antes que a auditoria da carga chegue, a pessoa escolhe B
    const escolha = fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    await esvaziar();
    aud.pedidos[1].d.resolver(respostaDeAuditoria('auditoria-de-B'));
    await escolha;
    aud.pedidos[0].d.resolver(respostaDeAuditoria('auditoria-da-carga-de-A'));
    expect(await carga).toBe('descartada');
    expect(tela.estado.audit).toBe('auditoria-de-B');
  });

  test('a carga inicial NÃO escreve `excludedIds`: a página o escreve, no texto de antes, porque a âncora A.33 fixa esse fragmento', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    await fluxos.apresentarCargaInicial({ documento: DOC_A, exibicao: { tipo: 'execucao', executionId: 'exec-A' }, registro, acoes: tela.acoes, enviarAuditoria: () => Promise.resolve({ success: true, audit: 'a' }) });
    expect(tela.historico).not.toContain('setExcludedIds');
    expect(tela.estado.excludedIds).toEqual(['inicial']);
    // a página: o fragmento verbatim, antes da chamada do fluxo, e uma única vez
    const pagina = ler('app/decisor/resultados/[projectId]/page.tsx');
    const fragmento = 'if (calcData.metadata?.excludedRespondentIds) {\n            setExcludedIds(calcData.metadata.excludedRespondentIds);\n          }';
    expect(ocorrencias(pagina, fragmento)).toBe(1);
    expect(pagina.indexOf(fragmento)).toBeLessThan(pagina.indexOf('await apresentarCargaInicial('));
  });

  test('o recálculo confirmado: a auditoria do cálculo ANTERIOR, chegando depois, é descartada', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    const aud = auditoriaControlada();
    const antiga = fluxos.exibirExecucaoEscolhida({ documento: DOC_A, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar });
    await esvaziar();
    const novo = doc('exec-NOVA');
    const rec = fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: ['excl-exec-A'],
      executar: confirmadoCom(novo), registro, acoes: tela.acoes, enviarAuditoria: aud.enviar,
    });
    await esvaziar();
    aud.pedidos[1].d.resolver(respostaDeAuditoria('auditoria-da-nova'));
    expect(await rec).toBe('concluido');
    aud.pedidos[0].d.resolver(respostaDeAuditoria('auditoria-antiga-de-A'));
    expect(await antiga).toBe('descartada');
    expect(tela.estado.calculation).toBe(novo);
    expect(tela.estado.audit).toBe('auditoria-da-nova');
  });
});

describe('A4.1: o Parecer IA tem o par, e a CONDUTA ainda é a de antes (decisão 5-B pendente)', () => {
  test('na mesma apresentação: escreve, e o par confere', () => {
    const r = par.criarRegistroDaApresentacao();
    const p = r.apresentar(DOC_A);
    const d = fluxos.decidirEscritaDoParecer(r, p);
    expect(d.escreve).toBe(true);
    expect(d.conferencia).toMatchObject({ aceita: true, vinculo: 'identificador-e-geracao' });
  });

  test('numa apresentação que a tela já deixou: o par NÃO confere, e a conduta vigente é ESCREVER (a de antes de A4), com aviso no log', () => {
    const r = par.criarRegistroDaApresentacao();
    const p = r.apresentar(DOC_A);
    r.apresentar(DOC_B);
    const d = fluxos.decidirEscritaDoParecer(r, p);
    expect(d.conferencia).toEqual({ aceita: false, vinculo: null, motivo: 'geracao-diferente' });
    expect(d.escreve).toBe(true); // ← é aqui que a decisão 5-B muda alguma coisa
    expect(fluxos.condutaDoParecerForaDoPar(d.conferencia)).toBe('aplicar');
    expect((console.warn as jest.Mock).mock.calls.some(c => String(c[0]).includes('decisão 5-B pendente'))).toBe(true);
  });

  test('A, B, A: o par do parecer pedido na primeira apresentação de A não confere na terceira', () => {
    const r = par.criarRegistroDaApresentacao();
    const p1 = r.apresentar(DOC_A);
    r.apresentar(DOC_B);
    r.apresentar(DOC_A);
    expect(fluxos.decidirEscritaDoParecer(r, p1).conferencia.aceita).toBe(false);
  });

  test('o ponto da decisão 5-B é UMA função, e as três escritas de `aiReview` da página passam por ela', () => {
    const pagina = ler('app/decisor/resultados/[projectId]/page.tsx');
    expect(ocorrencias(pagina, 'decidirEscritaDoParecer(registroDaApresentacao, parDoParecer)')).toBe(3);
    expect(ocorrencias(pagina, 'setAiReview({')).toBe(3);
    expect(ocorrencias(pagina, 'const parDoParecer = registroDaApresentacao.capturar();')).toBe(1);
    expect(ocorrencias(ler('lib/fluxos-da-tela.ts'), 'PONTO DO CÓDIGO ONDE ENTRA A DECISÃO 5-B')).toBe(1);
  });
});

describe('A4.1: a validação externa também só escreve se a apresentação for a mesma', () => {
  test('escreverSeVigente: escreve na mesma apresentação, descarta na que a tela deixou, e não captura a exceção', async () => {
    const r = par.criarRegistroDaApresentacao();
    const p = r.apresentar(DOC_A);
    const escritas: any[] = [];
    expect(await fluxos.escreverSeVigente(r, p, async () => 'resultado-de-A', (v: any) => escritas.push(v))).toBe('escrita');
    const lenta = adiado<string>();
    const emVoo = fluxos.escreverSeVigente(r, p, () => lenta.promessa, (v: any) => escritas.push(v));
    r.apresentar(DOC_B);
    lenta.resolver('resultado-tardio-de-A');
    expect(await emVoo).toBe('descartada');
    expect(escritas).toEqual(['resultado-de-A']);
    await expect(fluxos.escreverSeVigente(r, r.capturar(), () => Promise.reject(new Error('x')), () => undefined)).rejects.toThrow('x');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 2: a falha da auditoria não contamina o estado de um cálculo já confirmado
// ═════════════════════════════════════════════════════════════════════════════

/** O resultado de `executarCalculo` para um cálculo confirmado que trouxe `calculation`. */
const confirmadoCom = (calculation: any, persistida = true) => async () => ({
  desfecho: {
    situacao: 'confirmada',
    intencao: { tipo: 'calculo', id: 'req-teste-000', projectId: 'p', excludedRespondentIds: [], criadaEm: 'z' },
    resposta: { status: 200, corpo: { success: true, executionId: calculation.executionId, recuperada: false, calculation } },
  },
  persistida,
});

describe('A4.2: o recálculo', () => {
  const DOC_NOVO = doc('exec-NOVA');

  function cenario() {
    const tela = criarTela();
    tela.estado.calculation = DOC_A; // o que está apresentado: A
    tela.estado.excludedIds = ['excl-exec-A'];
    tela.estado.aiReview = 'parecer-de-A';
    tela.estado.audit = 'auditoria-de-A';
    const registro = par.criarRegistroDaApresentacao();
    registro.apresentar(DOC_A);
    return { tela, registro };
  }

  test('(critério 1) cálculo confirmado e auditoria que LANÇA: o estado tem o resultado novo, as exclusões do PEDIDO e nenhum parecer anterior; a mensagem não afirma falha de recálculo', async () => {
    const { tela, registro } = cenario();
    const r = await fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1', 'r2'], exclusoesApresentadas: ['excl-exec-A'],
      executar: confirmadoCom(DOC_NOVO), registro, acoes: tela.acoes,
      enviarAuditoria: () => Promise.reject(new Error('auditoria fora do ar')),
    });
    expect(r).toBe('concluido-sem-auditoria');
    expect(tela.estado.calculation).toBe(DOC_NOVO); // o resultado novo
    expect(tela.estado.exibicao).toEqual({ tipo: 'execucao', executionId: 'exec-NOVA' });
    expect(tela.estado.execucaoRecemCalculada).toBe(DOC_NOVO);
    expect(tela.estado.excludedIds).toEqual(['r1', 'r2']); // as exclusões do PEDIDO, e não as de A
    expect(tela.estado.aiReview).toBeNull(); // nenhum parecer anterior
    expect(tela.estado.audit).toBeNull(); // e nenhuma auditoria anterior sobrevive ao cálculo novo
    expect(tela.estado.error).toBe(''); // NÃO é erro de tela
    expect(tela.historico).not.toContain('setError');
    expect(tela.estado.avisos).toEqual([fluxos.MENSAGEM_DA_AUDITORIA_INDISPONIVEL]);
    expect(tela.estado.avisos[0]).toMatch(/auditoria não está disponível/);
    expect(tela.estado.avisos.join(' ')).not.toMatch(/recálculo|recalcular|conexão/i);
    expect([tela.estado.isRecalculating, tela.estado.loading]).toEqual([false, false]); // a trava da tela é solta
  });

  test('(critério 1, variante) a falha da auditoria na leitura do corpo (rejeição depois do envio) dá o mesmo resultado', async () => {
    const { tela, registro } = cenario();
    const r = await fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: ['excl-exec-A'],
      executar: confirmadoCom(DOC_NOVO), registro, acoes: tela.acoes,
      enviarAuditoria: async () => { throw new SyntaxError('Unexpected token < in JSON'); },
    });
    expect(r).toBe('concluido-sem-auditoria');
    expect(tela.estado.calculation).toBe(DOC_NOVO);
    expect(tela.estado.error).toBe('');
  });

  test('(critério 2) cálculo que FALHA por exceção: as exclusões voltam às do `calculation` apresentado, e a mensagem é de erro de recálculo', async () => {
    const { tela, registro } = cenario();
    const aud = auditoriaControlada();
    const r = await fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1', 'r2'], exclusoesApresentadas: ['excl-exec-A'],
      executar: async () => { throw new Error('rede caiu'); }, registro, acoes: tela.acoes, enviarAuditoria: aud.enviar,
    });
    expect(r).toBe('falhou');
    expect(tela.estado.error).toBe('Erro de conexão ao recalcular: rede caiu');
    expect(tela.estado.excludedIds).toEqual(['excl-exec-A']); // revertidas
    expect(tela.estado.calculation).toBe(DOC_A); // o cálculo não aconteceu: nada mudou
    expect(tela.estado.aiReview).toBe('parecer-de-A');
    expect(tela.estado.audit).toBe('auditoria-de-A');
    expect(aud.pedidos).toHaveLength(0); // sem cálculo, sem auditoria
    expect(tela.estado.avisos).toEqual([]);
    expect([tela.estado.isRecalculating, tela.estado.loading]).toEqual([false, false]);
  });

  test('(critério 2) cálculo RECUSADO pelo servidor: exclusões revertidas e a mensagem é a do servidor', async () => {
    const { tela, registro } = cenario();
    const r = await fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: ['excl-exec-A'],
      executar: async () => ({ desfecho: { situacao: 'recusada', intencao: {}, resposta: { status: 400, corpo: { success: false, error: 'Nenhuma resposta aceita' } } }, persistida: true }),
      registro, acoes: tela.acoes, enviarAuditoria: () => Promise.resolve(respostaDeAuditoria('x')),
    });
    expect(r).toBe('recusado');
    expect(tela.estado.error).toBe('Nenhuma resposta aceita');
    expect(tela.estado.excludedIds).toEqual(['excl-exec-A']);
    expect(tela.estado.calculation).toBe(DOC_A);
  });

  test('(critério 2) cálculo sem confirmação do servidor: exclusões revertidas e a mensagem diz que o pedido permanece guardado', async () => {
    const { tela, registro } = cenario();
    const r = await fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: ['excl-exec-A'],
      executar: async () => ({ desfecho: { situacao: 'pendente', intencao: {}, motivo: 'sem rede' }, persistida: true }),
      registro, acoes: tela.acoes, enviarAuditoria: () => Promise.resolve(respostaDeAuditoria('x')),
    });
    expect(r).toBe('pendente');
    expect(tela.estado.error).toMatch(/Sem confirmação do servidor \(sem rede\)/);
    expect(tela.estado.excludedIds).toEqual(['excl-exec-A']);
  });

  test('cálculo e auditoria bem-sucedidos: a auditoria da execução NOVA é a que fica', async () => {
    const { tela, registro } = cenario();
    const r = await fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: ['excl-exec-A'],
      executar: confirmadoCom(DOC_NOVO), registro, acoes: tela.acoes,
      enviarAuditoria: async (d: any) => respostaDeAuditoria(`auditoria-de-${d.executionId}`),
    });
    expect(r).toBe('concluido');
    expect(tela.estado.audit).toBe('auditoria-de-exec-NOVA');
    expect(tela.estado.avisos).toEqual([]);
  });

  test('o armazenamento do navegador indisponível acrescenta o aviso, sem erro de tela', async () => {
    const { tela, registro } = cenario();
    await fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: [],
      executar: confirmadoCom(DOC_NOVO, false), registro, acoes: tela.acoes,
      enviarAuditoria: async () => respostaDeAuditoria('ok'),
    });
    expect(tela.estado.avisos[0]).toMatch(/armazenamento do navegador não está disponível/);
    expect(tela.estado.error).toBe('');
  });

  test('o que a tela mostra ENQUANTO a auditoria está em voo já é completo (resultado, exibição, exclusões e parecer limpo)', async () => {
    const { tela, registro } = cenario();
    const aud = auditoriaControlada();
    const p = fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: ['excl-exec-A'],
      executar: confirmadoCom(DOC_NOVO), registro, acoes: tela.acoes, enviarAuditoria: aud.enviar,
    });
    await esvaziar();
    expect(aud.pedidos).toHaveLength(1);
    expect(tela.estado).toMatchObject({ calculation: DOC_NOVO, excludedIds: ['r1'], aiReview: null, audit: null, loading: true, isRecalculating: true });
    aud.pedidos[0].d.rejeitar(new Error('caiu'));
    expect(await p).toBe('concluido-sem-auditoria');
    expect(tela.estado).toMatchObject({ calculation: DOC_NOVO, excludedIds: ['r1'], aiReview: null, loading: false, isRecalculating: false, error: '' });
  });
});

describe('A4.2: as outras duas auditorias (exibirExecucao e a carga inicial) NÃO tinham a mistura', () => {
  test('a falha da auditoria em `exibirExecucaoEscolhida` e em `apresentarCargaInicial` só registra no log: o estado já estava completo, e nada é revertido', async () => {
    // `exibirExecucaoEscolhida` escreve as exclusões do documento; `apresentarCargaInicial` NÃO (a página as escreve)
    for (const [rodar, exclusoesEsperadas] of [
      [(tela: any, registro: any) => fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: () => Promise.reject(new Error('x')) }), ['excl-exec-B']],
      [(tela: any, registro: any) => fluxos.apresentarCargaInicial({ documento: DOC_B, exibicao: { tipo: 'execucao', executionId: 'exec-B' }, registro, acoes: tela.acoes, enviarAuditoria: () => Promise.reject(new Error('x')) }), ['inicial']],
    ] as [(tela: any, registro: any) => Promise<string>, string[]][]) {
      const tela = criarTela();
      const registro = par.criarRegistroDaApresentacao();
      expect(await rodar(tela, registro)).toBe('indisponivel');
      expect(tela.estado.calculation).toBe(DOC_B);
      expect(tela.estado.excludedIds).toEqual(exclusoesEsperadas);
      expect(tela.estado.error).toBe('');
      expect(tela.estado.avisos).toEqual([]);
      expect(tela.historico).not.toContain('setError');
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// A fiação da página, por LEITURA, e o levantamento dos pontos assíncronos
// ═════════════════════════════════════════════════════════════════════════════

describe('A4: a fiação da página e do componente, por LEITURA (nenhuma tela é montada)', () => {
  const PAGINA = 'app/decisor/resultados/[projectId]/page.tsx';
  const pagina = ler(PAGINA);

  test('a página chama os três fluxos UMA vez cada, com o mesmo registro, e não faz mais nenhum `fetch` de auditoria', () => {
    expect(ocorrencias(pagina, 'await exibirExecucaoEscolhida(')).toBe(1);
    expect(ocorrencias(pagina, 'await recalcularResultados(')).toBe(1);
    expect(ocorrencias(pagina, 'await apresentarCargaInicial(')).toBe(1);
    expect(ocorrencias(pagina, "'/api/audit-decision'")).toBe(0);
    expect(ocorrencias(ler('lib/fluxos-da-tela.ts'), "'/api/audit-decision'")).toBe(1);
    expect(ocorrencias(pagina, 'criarRegistroDaApresentacao()')).toBe(1);
    expect(ocorrencias(pagina, 'registro: registroDaApresentacao')).toBe(3);
  });

  test('os três caminhos que trocam o documento exibido escrevem `calculation` e passam por `registro.apresentar` antes', () => {
    const modulo = ler('lib/fluxos-da-tela.ts');
    for (const funcao of ['export async function exibirExecucaoEscolhida', 'export async function apresentarCargaInicial', 'export async function recalcularResultados']) {
      const i = modulo.indexOf(funcao);
      expect([funcao, i > 0]).toEqual([funcao, true]);
      const fim = modulo.indexOf('\n}\n', i);
      const corpo = modulo.slice(i, fim);
      expect([funcao, corpo.includes('registro.apresentar(')]).toEqual([funcao, true]);
      expect([funcao, corpo.indexOf('registro.apresentar(') < corpo.indexOf('acoes.setCalculation(')]).toEqual([funcao, true]);
    }
  });

  test('LEVANTAMENTO (padrão `fetch(` em app/ fora de app/api, e em components/): todo ponto assíncrono tem destino declarado, e um novo reprova', () => {
    // Padrão: ocorrências de `fetch(`, contadas por arquivo. Escopo: `app/` (sem `app/api/`) e `components/`.
    // Cada arquivo tem um destino. Um `fetch(` novo aparece como diferença e exige decisão.
    const achados: Record<string, number> = {};
    const varrer = (dir: string) => {
      for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) {
          if (rel === 'app/api' || e.name === 'node_modules' || e.name === '.next') continue;
          varrer(rel);
        } else if (/\.(ts|tsx)$/.test(e.name)) {
          const n = ocorrencias(ler(rel).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''), 'fetch(');
          if (n > 0) achados[rel] = n;
        }
      }
    };
    varrer('app');
    varrer('components');
    expect(achados).toEqual({
      // 3: `/api/response-quality` (2) e `/api/ai-reviewer` (1). A análise de qualidade é do PROJETO (as respostas), e não de uma execução:
      //    NÃO SE APLICA o par. O Parecer IA TEM o par implementado (decisão 5-B pendente quanto à conduta).
      [PAGINA]: 3,
      // 2: a verificação de saúde do serviço (`GET`, não vinculada a execução: NÃO SE APLICA) e a validação (`executarValidacao`, vinculada ao
      //    `calculation` recebido: TRATADA por `escreverSeVigente`).
      'components/ExternalValidation.tsx': 2,
    });
  });

  test('ExternalValidation: a validação passa por escreverSeVigente, com o par capturado ao pedir', () => {
    const f = ler('components/ExternalValidation.tsx');
    expect(ocorrencias(f, 'escreverSeVigente(registro, par, ')).toBe(1);
    expect(ocorrencias(f, 'const par = registro.capturar();')).toBe(1);
    expect(ocorrencias(f, 'registro.apresentar(calculation);')).toBe(1);
  });
});
