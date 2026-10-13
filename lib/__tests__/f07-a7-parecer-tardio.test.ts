/**
 * lib/__tests__/f07-a7-parecer-tardio.test.ts
 *
 * F07, entrega A7, ponto 1: a decisão 5-B (a resposta TARDIA do Parecer IA é DESCARTADA) e V3 (o indicador de
 * "analisando" e a identificação do Parecer pertencem à apresentação que a tela deixou). Três propriedades do
 * mesmo caminho, independentes entre si:
 *
 *   1. a resposta fora do par não escreve `aiReview`, nos três ramos (sucesso, erro na resposta, exceção);
 *   2. a conclusão de um pedido da apresentação que a tela deixou NÃO desliga o indicador do pedido de agora
 *      (um `return` dentro do `try` também executa o `finally`: descartar não basta);
 *   3. a troca de apresentação retira a identificação do Parecer e desliga o indicador do pedido antigo.
 *
 * ⚠ **COMO ESTE ARQUIVO EXERCITA O CÓDIGO DA PÁGINA.** `runAiReview` mora em `app/decisor/resultados/[projectId]/
 * page.tsx` (`'use client'`, nenhuma tela é montada por teste algum). Em vez de repetir o `try/catch/finally` num
 * duplo, a bancada LÊ do fonte da página dois trechos e os EXECUTA (transpilados por `typescript`, em contexto
 * isolado, com os setters e as funções de `lib/fluxos-da-tela.ts` injetados): o PRÓLOGO (do `setAiReviewLoading(true)`
 * à captura do par) e a CAUDA (do `fetch('/api/ai-reviewer')` ao fim do `finally`). É o precedente de
 * `a12-vinculo-rodada2.test.ts`, que executa o objeto de `setAiReview({` lido da página.
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.**
 *   - o trecho ENTRE o prólogo e o `fetch` (a análise de qualidade e a montagem do payload, ~330 linhas) NÃO é
 *     executado: `meio` o substitui por uma promessa controlada, e NÃO é código da página;
 *   - o `fetch` e o `response.json()` são duplos controlados;
 *   - a página montada: o React não é executado, então não se demonstra que `setAiReviewLoading`/`setExecucaoDoParecer`
 *     da página (de `useState`) alcancem a tela; que a página os passa pelo objeto `acoesDaTela` é conferido por LEITURA;
 *   - os fluxos de apresentação são os REAIS (`exibirExecucaoEscolhida`, `apresentarCargaInicial`,
 *     `recalcularResultados`, e as funções de «Exibir»/«Carregar» de `lib/fluxos-da-referencia.ts`).
 */

export {};

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const par = require('@/lib/apresentacao-corrente');
const fluxos = require('@/lib/fluxos-da-tela');
const refs = require('@/lib/fluxos-da-referencia');
const ident = require('@/lib/identificacao-da-execucao');
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;
const PAGINA = 'app/decisor/resultados/[projectId]/page.tsx';
const esvaziar = () => new Promise<void>(r => setImmediate(r));

interface Adiado<T> { promessa: Promise<T>; resolver(v: T): void; rejeitar(e: unknown): void }
function adiado<T>(): Adiado<T> {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => { resolver = res; rejeitar = rej; });
  return { promessa, resolver, rejeitar };
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// A bancada
// ─────────────────────────────────────────────────────────────────────────────

/** O armazém dos setters. `escritasDeAiReview` guarda CADA valor escrito em `aiReview`, em ordem. */
function criarTela() {
  const estado: Record<string, any> = {
    calculation: null, exibicao: null, excludedIds: [] as string[], aiReview: null, audit: null,
    execucaoRecemCalculada: null, error: '', isRecalculating: false, loading: false, avisos: [] as string[],
    execucaoDoParecer: null, aiReviewLoading: false, escritasDeAiReview: [] as any[], escritasDoIndicador: [] as boolean[],
  };
  const historico: string[] = [];
  const m = (n: string) => historico.push(n);
  const acoes = {
    setCalculation: (d: any) => { estado.calculation = d; m('setCalculation'); },
    setExibicao: (e: any) => { estado.exibicao = e; m('setExibicao'); },
    setExcludedIds: (ids: string[]) => { estado.excludedIds = ids; m('setExcludedIds'); },
    setAiReview: (v: any) => { estado.aiReview = v; estado.escritasDeAiReview.push(v); m('setAiReview'); },
    setExecucaoDoParecer: (v: any) => { estado.execucaoDoParecer = v; m('setExecucaoDoParecer'); },
    setAiReviewLoading: (b: boolean) => { estado.aiReviewLoading = b; estado.escritasDoIndicador.push(b); m('setAiReviewLoading'); },
    setAudit: (a: any) => { estado.audit = a; m('setAudit'); },
    setExecucaoRecemCalculada: (d: any) => { estado.execucaoRecemCalculada = d; m('setExecucaoRecemCalculada'); },
    setError: (t: string) => { estado.error = t; m('setError'); },
    setIsRecalculating: (b: boolean) => { estado.isRecalculating = b; m('setIsRecalculating'); },
    setLoading: (b: boolean) => { estado.loading = b; m('setLoading'); },
    acrescentarAviso: (t: string) => { estado.avisos.push(t); m('acrescentarAviso'); },
  };
  return { estado, historico, acoes };
}
type Tela = ReturnType<typeof criarTela>;

const doc = (id: string, extra: Record<string, unknown> = {}) => ({
  executionId: id, engineVersion: 'motor-de-teste', responseCount: 12, metadata: { excludedRespondentIds: [`excl-${id}`] }, ...extra,
});
const DOC_A = doc('exec-A');
const DOC_B = doc('exec-B');
const DOC_C = doc('exec-C');
const auditoriaOk = async () => ({ success: true, audit: 'auditoria' });
const confirmadoCom = (calculation: any, persistida = true) => async () => ({
  desfecho: {
    situacao: 'confirmada',
    intencao: { tipo: 'calculo', id: 'req-a7-000', projectId: 'p', excludedRespondentIds: [], criadaEm: 'z' },
    resposta: { status: 200, corpo: { success: true, executionId: calculation.executionId, recuperada: false, calculation } },
  },
  persistida,
});

/**
 * O prólogo e a cauda de `runAiReview`, LIDOS da página e compilados. A composição é
 * `prólogo + try { const finalPayload = await meio(); + cauda }`: a cauda começa DENTRO do `try` da página e traz o
 * `catch` e o `finally` dela.
 */
function trechosDeRunAiReview(pagina: string) {
  const i = pagina.indexOf('const runAiReview = async () => {');
  const aPrologo = pagina.indexOf('setAiReviewLoading(true);', i);
  const marcaPar = 'const parDoParecer = registroDaApresentacao.capturar();';
  const bPrologo = pagina.indexOf(marcaPar, aPrologo) + marcaPar.length;
  const aCauda = pagina.indexOf("const response = await fetch('/api/ai-reviewer', {", bPrologo);
  const marcaFim = "console.log('🏁 [AI-REVIEW] Finalizando...');";
  const iFim = pagina.indexOf(marcaFim, aCauda);
  const bCauda = pagina.indexOf('\n  };\n', iFim);
  const achados = { i, aPrologo, bPrologo, aCauda, iFim, bCauda };
  for (const [nome, valor] of Object.entries(achados)) if (!(valor > 0)) throw new Error(`trecho de runAiReview não localizado: ${nome}`);
  if (!(aPrologo < bPrologo && bPrologo < aCauda && aCauda < iFim && iFim < bCauda)) throw new Error('trechos de runAiReview fora de ordem');
  return { prologo: pagina.slice(aPrologo, bPrologo), cauda: pagina.slice(aCauda, bCauda) };
}

function compilarRunAiReviewDaPagina(pagina: string): (...args: any[]) => Promise<void> {
  const { prologo, cauda } = trechosDeRunAiReview(pagina);
  const fonte =
    '(async function (fetch, calculation, identificarExecucao, registroDaApresentacao, decidirEscritaDoParecer, ' +
    'concluirPedidoDoParecer, setAiReviewLoading, setAiReview, setExecucaoDoParecer, meio, console) {\n' +
    `${prologo}\n    try {\n      const finalPayload = await meio();\n      ${cauda}\n})`;
  const js: string = ts.transpileModule(fonte, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return vm.runInNewContext(js, {});
}

/** `runAiReview` da página, com os setters da bancada e o registro REAL. Devolve o controle do pedido. */
function pedirParecer(rodar: (...args: any[]) => Promise<void>, tela: Tela, registro: any, documentoExibido: Record<string, any>) {
  const meio = adiado<unknown>();
  const rede = adiado<any>();
  const concluido = rodar(
    () => rede.promessa, documentoExibido, ident.identificarExecucao, registro, fluxos.decidirEscritaDoParecer,
    fluxos.concluirPedidoDoParecer, tela.acoes.setAiReviewLoading, tela.acoes.setAiReview, tela.acoes.setExecucaoDoParecer,
    () => meio.promessa, console
  );
  return {
    concluido,
    /** o corpo chega: o `fetch` resolve, `response.json()` devolve `corpo` */
    responder: async (corpo: unknown) => { meio.resolver({}); rede.resolver({ status: 200, json: async () => corpo }); await concluido; },
    /** o `fetch` rejeita */
    falharNaRede: async (erro: Error) => { meio.resolver({}); rede.rejeitar(erro); await concluido; },
    /** o `fetch` resolve e a leitura do corpo lança */
    corpoIlegivel: async (erro: Error) => { meio.resolver({}); rede.resolver({ status: 200, json: async () => { throw erro; } }); await concluido; },
  };
}
type Pedido = ReturnType<typeof pedirParecer>;

const CORPO_DE_SUCESSO = {
  success: true, review: 'texto do parecer', nota: 7, veredicto: 'veredicto', notaSuspensa: null, mensagemDaExtracao: null,
  estadoDoVinculo: 'vinculado', validation: { ok: true }, metadata: { origem: 'teste' },
};
const AIREVIEW_DE_SUCESSO = {
  nota: 7, veredicto: 'veredicto', notaSuspensa: null, mensagemDaExtracao: null, estadoDoVinculo: 'vinculado',
  review: 'texto do parecer', validation: { ok: true }, metadata: { origem: 'teste' },
};

type Ramo = 'sucesso' | 'erro-na-resposta' | 'excecao' | 'corpo-ilegivel';
const RAMOS: Ramo[] = ['sucesso', 'erro-na-resposta', 'excecao', 'corpo-ilegivel'];
async function concluirNoRamo(p: Pedido, ramo: Ramo) {
  if (ramo === 'sucesso') await p.responder(CORPO_DE_SUCESSO);
  else if (ramo === 'erro-na-resposta') await p.responder({ success: false, error: 'falha do servidor' });
  else if (ramo === 'excecao') await p.falharNaRede(new Error('rede caiu'));
  else await p.corpoIlegivel(new Error('corpo inválido'));
}

const PAGINA_LIDA = ler(PAGINA);
const rodarDaPagina = compilarRunAiReviewDaPagina(PAGINA_LIDA);

/** A tela apresenta X e a pessoa pede o Parecer: o pedido de X fica em voo. */
function pedidoEmX() {
  const tela = criarTela();
  const registro = par.criarRegistroDaApresentacao();
  registro.apresentar(DOC_A);
  tela.acoes.setCalculation(DOC_A);
  const x = pedirParecer(rodarDaPagina, tela, registro, DOC_A);
  return { tela, registro, x };
}

// ═════════════════════════════════════════════════════════════════════════════
// A conduta (decisão 5-B) e a conclusão do pedido, nos módulos
// ═════════════════════════════════════════════════════════════════════════════

describe('A7.5-B: a conduta e o texto do aviso', () => {
  test('a conduta é DESCARTAR para cada motivo de recusa do par, e a decisão não escreve', () => {
    const motivos: [string, () => any][] = [
      ['geracao-diferente', () => { const r = par.criarRegistroDaApresentacao(); const p = r.apresentar(DOC_A); r.apresentar(DOC_B); return { r, p }; }],
      ['identificador-diferente', () => {
        const r = par.criarRegistroDaApresentacao();
        const p = r.apresentar(DOC_A);
        // a MESMA geração com outro identificador não ocorre pelo registro; força o par do pedido
        return { r, p: { executionId: 'exec-OUTRA', geracao: p.geracao } };
      }],
      ['identificador-presente-so-em-um-lado', () => {
        const r = par.criarRegistroDaApresentacao();
        const p = r.apresentar(DOC_A);
        return { r, p: { executionId: null, geracao: p.geracao } };
      }],
    ];
    for (const [motivo, montar] of motivos) {
      const { r, p } = montar();
      const d = fluxos.decidirEscritaDoParecer(r, p);
      expect([motivo, d.conferencia.aceita, d.conferencia.motivo, d.escreve, fluxos.condutaDoParecerForaDoPar(d.conferencia)]).toEqual([motivo, false, motivo, false, 'descartar']);
    }
  });

  test('o aviso do log diz DESCARTADA com o motivo e não diz mais que a decisão está pendente; na mesma apresentação não há aviso', () => {
    const r = par.criarRegistroDaApresentacao();
    const p = r.apresentar(DOC_A);
    expect(fluxos.decidirEscritaDoParecer(r, p).escreve).toBe(true);
    expect((console.warn as jest.Mock).mock.calls).toEqual([]);
    r.apresentar(DOC_B);
    fluxos.decidirEscritaDoParecer(r, p);
    const textos = (console.warn as jest.Mock).mock.calls.map(c => String(c[0]));
    expect(textos).toHaveLength(1);
    expect(textos[0]).toContain('DESCARTADA (decisão 5-B): nada foi escrito na tela');
    expect(textos[0]).toContain('geracao-diferente');
    expect(textos[0]).not.toMatch(/pendente|ainda vigente|É escrita/);
  });
});

describe('A7.V3: concluirPedidoDoParecer (o `finally` de runAiReview)', () => {
  test('o pedido da apresentação corrente desliga o indicador, uma vez, e devolve true', () => {
    const r = par.criarRegistroDaApresentacao();
    const p = r.apresentar(DOC_A);
    const chamadas: boolean[] = [];
    expect(fluxos.concluirPedidoDoParecer(r, p, { setAiReviewLoading: (b: boolean) => chamadas.push(b) })).toBe(true);
    expect(chamadas).toEqual([false]);
  });

  test('o pedido de uma apresentação que a tela deixou NÃO toca o indicador e devolve false (A, B e A de novo também)', () => {
    const r = par.criarRegistroDaApresentacao();
    const p1 = r.apresentar(DOC_A);
    r.apresentar(DOC_B);
    const chamadas: boolean[] = [];
    const acoes = { setAiReviewLoading: (b: boolean) => chamadas.push(b) };
    expect(fluxos.concluirPedidoDoParecer(r, p1, acoes)).toBe(false);
    r.apresentar(DOC_A);
    expect(fluxos.concluirPedidoDoParecer(r, p1, acoes)).toBe(false);
    expect(chamadas).toEqual([]);
  });

  test('a conferência é lida NA CONCLUSÃO, e não no início: a troca entre o pedido e a conclusão é vista', () => {
    const r = par.criarRegistroDaApresentacao();
    const p = r.apresentar(DOC_A);
    const chamadas: boolean[] = [];
    const acoes = { setAiReviewLoading: (b: boolean) => chamadas.push(b) };
    // nenhuma troca ainda: o mesmo par ainda é o corrente
    expect(r.conferir(p).aceita).toBe(true);
    r.apresentar(DOC_B); // a tela troca DEPOIS do pedido
    expect(fluxos.concluirPedidoDoParecer(r, p, acoes)).toBe(false);
    expect(chamadas).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Propriedade 1 (critérios 1 a 3): a resposta tardia não escreve `aiReview`
// ═════════════════════════════════════════════════════════════════════════════

describe('A7.5-B (critérios 1 a 3): a resposta do pedido de X, com a tela em Y, não escreve `aiReview` nem avisa', () => {
  test.each(RAMOS)('ramo «%s» (executando o try/catch/finally da PÁGINA): nada escrito em `aiReview`, nenhum aviso na faixa', async ramo => {
    const { tela, registro, x } = pedidoEmX();
    await esvaziar();
    expect(tela.estado.aiReviewLoading).toBe(true); // o prólogo da página ligou o indicador
    // a pessoa escolhe Y (fluxo REAL): a limpeza de A4 e a de A7
    await fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: auditoriaOk });
    const escritasAntes = tela.estado.escritasDeAiReview.length;
    const historicoAntes = tela.historico.length;
    await concluirNoRamo(x, ramo);
    expect(tela.estado.escritasDeAiReview.length).toBe(escritasAntes); // NENHUMA escrita nova em aiReview
    expect(tela.estado.aiReview).toBeNull();
    expect(tela.historico.slice(historicoAntes)).not.toContain('setAiReview');
    expect(tela.historico).not.toContain('acrescentarAviso');
    expect(tela.estado.avisos).toEqual([]);
    expect(tela.estado.error).toBe('');
    // o descarte ficou no log (e só nele)
    expect((console.warn as jest.Mock).mock.calls.some(c => String(c[0]).includes('DESCARTADA (decisão 5-B)'))).toBe(true);
  });

  test('o MESMO pedido, sem troca de apresentação: as três respostas SÃO escritas (a conduta só vale fora do par)', async () => {
    for (const ramo of RAMOS) {
      const { tela, x } = pedidoEmX();
      await esvaziar();
      await concluirNoRamo(x, ramo);
      const escritas = tela.estado.escritasDeAiReview.slice(1); // a primeira é o `setAiReview(null)` do prólogo
      expect([ramo, escritas.length]).toEqual([ramo, 1]);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Propriedade 2 (critério 4): a conclusão tardia não desliga o indicador do pedido de agora
// ═════════════════════════════════════════════════════════════════════════════

describe('A7.V3 (critério 4): pedido em X, a tela vai a Y, a pessoa pede o Parecer em Y, e a conclusão de X chega', () => {
  test.each(RAMOS)('ramo «%s»: o indicador do pedido de Y CONTINUA ligado, a identificação continua a de Y, e a resposta de Y escreve e desliga', async ramo => {
    const { tela, registro, x } = pedidoEmX();
    await esvaziar();
    await fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: auditoriaOk });
    // o pedido de Y (execução do prólogo REAL da página)
    const y = pedirParecer(rodarDaPagina, tela, registro, DOC_B);
    await esvaziar();
    expect(tela.estado.aiReviewLoading).toBe(true);
    expect(tela.estado.execucaoDoParecer?.executionId).toBe('exec-B');

    await concluirNoRamo(x, ramo); // a conclusão (tardia) do pedido de X
    expect(tela.estado.aiReviewLoading).toBe(true); // ← o indicador de Y NÃO foi desligado por X
    expect(tela.estado.execucaoDoParecer?.executionId).toBe('exec-B');
    expect(tela.estado.aiReview).toBeNull();

    await y.responder(CORPO_DE_SUCESSO); // a resposta de Y, na apresentação corrente
    expect(tela.estado.aiReview).toEqual(AIREVIEW_DE_SUCESSO);
    expect(tela.estado.aiReviewLoading).toBe(false);
  });

  test('a ordem inversa: a resposta de Y chega ANTES da conclusão de X, e a de X não religa nem desliga nada', async () => {
    const { tela, registro, x } = pedidoEmX();
    await esvaziar();
    await fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: auditoriaOk });
    const y = pedirParecer(rodarDaPagina, tela, registro, DOC_B);
    await esvaziar();
    await y.responder(CORPO_DE_SUCESSO);
    expect(tela.estado.aiReviewLoading).toBe(false);
    const indicador = tela.estado.escritasDoIndicador.slice();
    await x.responder({ success: false, error: 'tardia' });
    expect(tela.estado.escritasDoIndicador).toEqual(indicador); // o indicador não foi escrito de novo
    expect(tela.estado.aiReview).toEqual(AIREVIEW_DE_SUCESSO); // e o Parecer de Y segue intacto
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Critérios 5 e 6: o caminho comum
// ═════════════════════════════════════════════════════════════════════════════

describe('A7 (critérios 5 e 6): o caminho comum, sem troca de apresentação, não mudou', () => {
  test('(critério 5) sucesso: `aiReview` com os MESMOS campos de antes, a identificação do pedido, e o indicador desliga', async () => {
    const { tela, x } = pedidoEmX();
    await esvaziar();
    expect(tela.estado.aiReviewLoading).toBe(true);
    expect(tela.estado.execucaoDoParecer).toEqual(ident.identificarExecucao(DOC_A));
    await x.responder(CORPO_DE_SUCESSO);
    expect(tela.estado.aiReview).toEqual(AIREVIEW_DE_SUCESSO);
    expect(tela.estado.aiReviewLoading).toBe(false);
    expect(tela.estado.execucaoDoParecer).toEqual(ident.identificarExecucao(DOC_A)); // a identificação fica com o Parecer
  });

  test('(critério 6) erro na resposta: a mensagem do servidor, ou o texto de antes quando não há; o indicador desliga', async () => {
    const a = pedidoEmX();
    await esvaziar();
    await a.x.responder({ success: false, error: 'falha do servidor' });
    expect(a.tela.estado.aiReview).toEqual({ error: true, message: 'falha do servidor' });
    expect(a.tela.estado.aiReviewLoading).toBe(false);
    const b = pedidoEmX();
    await esvaziar();
    await b.x.responder({ success: false });
    expect(b.tela.estado.aiReview).toEqual({ error: true, message: 'Erro ao executar revisão' });
    // `success: true` sem `review` também cai neste ramo, como antes
    const c = pedidoEmX();
    await esvaziar();
    await c.x.responder({ success: true });
    expect(c.tela.estado.aiReview).toEqual({ error: true, message: 'Erro ao executar revisão' });
  });

  test('(critério 6) exceção na rede e corpo ilegível: "Erro de conexão: " + a mensagem; o indicador desliga', async () => {
    const a = pedidoEmX();
    await esvaziar();
    await a.x.falharNaRede(new Error('rede caiu'));
    expect(a.tela.estado.aiReview).toEqual({ error: true, message: 'Erro de conexão: rede caiu' });
    expect(a.tela.estado.aiReviewLoading).toBe(false);
    const b = pedidoEmX();
    await esvaziar();
    await b.x.corpoIlegivel(new Error('corpo inválido'));
    expect(b.tela.estado.aiReview).toEqual({ error: true, message: 'Erro de conexão: corpo inválido' });
    expect(b.tela.estado.aiReviewLoading).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Propriedade 3 (critérios 7 e 8): a troca de apresentação retira a identificação e desliga o indicador
// ═════════════════════════════════════════════════════════════════════════════

describe('A7.V3 (critério 7): a troca de apresentação retira a identificação do Parecer', () => {
  /** Um Parecer pedido e CONCLUÍDO em X (com identificação), e depois um segundo pedido em voo. */
  async function parecerDeXNaTela() {
    const { tela, registro, x } = pedidoEmX();
    await esvaziar();
    await x.responder(CORPO_DE_SUCESSO);
    expect(tela.estado.execucaoDoParecer?.executionId).toBe('exec-A');
    expect(tela.estado.aiReview).toEqual(AIREVIEW_DE_SUCESSO);
    return { tela, registro };
  }

  test('«Exibir» (exibirExecucaoDaLista) e «Carregar a referência atual» (carregarReferenciaAtual), pelo fluxo REAL que a página passa a `onExibir`', async () => {
    for (const via of ['exibir', 'carregar']) {
      const { tela, registro } = await parecerDeXNaTela();
      // o que a página faz com `onExibir(documento)`: `exibirExecucaoEscolhida` com o registro e os setters DELA
      const apresentar = (documento: Record<string, any>) => {
        void fluxos.exibirExecucaoEscolhida({ documento, registro, acoes: tela.acoes, enviarAuditoria: auditoriaOk });
      };
      if (via === 'exibir') {
        const r = await refs.exibirExecucaoDaLista({ executionId: 'exec-B', acoes: { lerExecucao: async () => DOC_B, apresentar, acrescentarAviso: () => undefined } });
        expect([via, r]).toEqual([via, 'apresentada']);
      } else {
        const r = await refs.carregarReferenciaAtual({
          referencia: { projectId: 'p', executionId: 'exec-B', revision: 3, operationId: 'op-3' },
          revisaoCarregada: 2,
          acoes: { lerExecucao: async () => DOC_B, apresentar, avancarReferenciaCarregada: () => undefined, acrescentarAviso: () => undefined },
        });
        expect([via, r]).toEqual([via, 'carregada']);
      }
      expect([via, tela.estado.execucaoDoParecer]).toEqual([via, null]);
      expect([via, tela.estado.aiReview]).toEqual([via, null]);
      expect([via, tela.estado.aiReviewLoading]).toEqual([via, false]);
    }
  });

  test('o recálculo CONFIRMADO retira o Parecer, a identificação e o indicador', async () => {
    const { tela, registro } = await parecerDeXNaTela();
    const outro = pedirParecer(rodarDaPagina, tela, registro, DOC_A); // um segundo pedido, em voo
    await esvaziar();
    expect(tela.estado.aiReviewLoading).toBe(true);
    const r = await fluxos.recalcularResultados({
      projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: ['excl-exec-A'], executar: confirmadoCom(DOC_C),
      registro, acoes: tela.acoes, enviarAuditoria: auditoriaOk,
    });
    expect(r).toBe('concluido');
    expect(tela.estado.execucaoDoParecer).toBeNull();
    expect(tela.estado.aiReview).toBeNull();
    expect(tela.estado.aiReviewLoading).toBe(false);
    await outro.responder(CORPO_DE_SUCESSO); // a resposta do pedido em voo é tardia
    expect(tela.estado.aiReview).toBeNull();
  });

  test('o recálculo que NÃO apresenta nada (bloqueado, pendente, recusado, falhou) NÃO retira o Parecer, a identificação nem o indicador', async () => {
    const casos: [string, any][] = [
      ['bloqueado', { liberado: () => false, executar: confirmadoCom(DOC_C) }],
      ['pendente', { executar: async () => ({ desfecho: { situacao: 'pendente', motivo: 'sem rede' }, persistida: true }) }],
      ['recusado', { executar: async () => ({ desfecho: { situacao: 'recusada', resposta: { status: 409, corpo: { error: 'recusado' } } }, persistida: true }) }],
      ['falhou', { executar: async () => { throw new Error('quebrou'); } }],
    ];
    for (const [nome, extra] of casos) {
      const { tela, registro, x } = pedidoEmX();
      await esvaziar();
      await x.responder(CORPO_DE_SUCESSO);
      const emVoo = pedirParecer(rodarDaPagina, tela, registro, DOC_A); // indicador ligado, identificação de A
      await esvaziar();
      const antes = { ident: tela.estado.execucaoDoParecer, loading: tela.estado.aiReviewLoading };
      expect([nome, antes.loading, antes.ident?.executionId]).toEqual([nome, true, 'exec-A']);
      const r = await fluxos.recalcularResultados({
        projectId: 'p', exclusoes: ['r1'], exclusoesApresentadas: [], registro, acoes: tela.acoes, enviarAuditoria: auditoriaOk, ...extra,
      });
      expect([nome, r]).toEqual([nome, nome]);
      expect([nome, tela.estado.aiReviewLoading, tela.estado.execucaoDoParecer]).toEqual([nome, true, antes.ident]);
      // a apresentação não mudou: a resposta do pedido em voo ainda É escrita
      await emVoo.responder(CORPO_DE_SUCESSO);
      expect([nome, tela.estado.aiReview]).toEqual([nome, AIREVIEW_DE_SUCESSO]);
    }
  });
});

describe('A7.V3 (critério 8): trocar de apresentação SEM novo pedido não deixa o indicador antigo ligado para sempre', () => {
  test.each(RAMOS)('«Exibir» em Y; a conclusão de X (ramo «%s») chega depois: o indicador já estava desligado e permanece desligado', async ramo => {
    const { tela, registro, x } = pedidoEmX();
    await esvaziar();
    expect(tela.estado.aiReviewLoading).toBe(true);
    await fluxos.exibirExecucaoEscolhida({ documento: DOC_B, registro, acoes: tela.acoes, enviarAuditoria: auditoriaOk });
    expect(tela.estado.aiReviewLoading).toBe(false); // desligado NA TROCA
    await concluirNoRamo(x, ramo);
    expect(tela.estado.aiReviewLoading).toBe(false); // e a conclusão de X não o religa
    expect(tela.estado.aiReview).toBeNull();
  });

  test('a carga inicial desliga o indicador de um pedido deixado para trás, e NÃO retira o Parecer nem a identificação (como antes de A7)', async () => {
    const { tela, registro, x } = pedidoEmX();
    await esvaziar();
    await x.responder(CORPO_DE_SUCESSO);
    const outro = pedirParecer(rodarDaPagina, tela, registro, DOC_A);
    await esvaziar();
    expect(tela.estado.aiReviewLoading).toBe(true);
    const identificacaoAntes = tela.estado.execucaoDoParecer;
    // o prólogo faz `setAiReview(null)`; recoloca um Parecer visível para provar que a carga NÃO o retira
    tela.estado.aiReview = 'parecer-visivel';
    const historicoAntes = tela.historico.length;
    await fluxos.apresentarCargaInicial({ documento: DOC_B, exibicao: { tipo: 'execucao', executionId: 'exec-B' }, registro, acoes: tela.acoes, enviarAuditoria: auditoriaOk });
    expect(tela.estado.aiReviewLoading).toBe(false);
    expect(tela.estado.aiReview).toBe('parecer-visivel');
    expect(tela.estado.execucaoDoParecer).toBe(identificacaoAntes);
    const novos = tela.historico.slice(historicoAntes);
    expect(novos).not.toContain('setAiReview');
    expect(novos).not.toContain('setExecucaoDoParecer');
    await outro.responder(CORPO_DE_SUCESSO); // a conclusão do pedido deixado para trás: descartada
    expect(tela.estado.aiReview).toBe('parecer-visivel');
    expect(tela.estado.aiReviewLoading).toBe(false);
  });

  test('o recálculo confirmado, com o pedido de X em voo e nenhum pedido novo: o indicador não fica ligado', async () => {
    const { tela, registro, x } = pedidoEmX();
    await esvaziar();
    await fluxos.recalcularResultados({
      projectId: 'p', exclusoes: [], exclusoesApresentadas: [], executar: confirmadoCom(DOC_C), registro, acoes: tela.acoes, enviarAuditoria: auditoriaOk,
    });
    expect(tela.estado.aiReviewLoading).toBe(false);
    await x.responder(CORPO_DE_SUCESSO);
    expect(tela.estado.aiReviewLoading).toBe(false);
    expect(tela.estado.aiReview).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// A ligação da página, por LEITURA (nenhuma tela é montada)
// ═════════════════════════════════════════════════════════════════════════════

describe('A7: a fiação da página, conferida por LEITURA', () => {
  const pagina = PAGINA_LIDA;
  const modulo = ler('lib/fluxos-da-tela.ts');
  const inicioRun = pagina.indexOf('const runAiReview = async () => {');
  const fimRun = pagina.indexOf('\n  };\n', pagina.indexOf("console.log('🏁 [AI-REVIEW] Finalizando...');", inicioRun));
  const corpoRun = pagina.slice(inicioRun, fimRun);

  test('os trechos lidos existem e têm o tamanho de um trecho real (a bancada não executa um corpo vazio)', () => {
    const { prologo, cauda } = trechosDeRunAiReview(pagina);
    expect(prologo).toContain('setAiReviewLoading(true);');
    expect(prologo).toContain('setAiReview(null);');
    expect(prologo).toContain('setExecucaoDoParecer(identificarExecucao(calculation as any));');
    expect(cauda).toContain('} catch (e: any) {');
    expect(cauda).toContain('} finally {');
    expect(ocorrencias(cauda, 'decidirEscritaDoParecer(registroDaApresentacao, parDoParecer).escreve) return;')).toBe(3);
    expect(ocorrencias(cauda, 'setAiReview({')).toBe(3);
  });

  test('`runAiReview` conclui por `concluirPedidoDoParecer` (uma vez, no `finally`) e não desliga o indicador por conta própria', () => {
    expect(ocorrencias(pagina, 'concluirPedidoDoParecer(registroDaApresentacao, parDoParecer, { setAiReviewLoading });')).toBe(1);
    const iFinally = corpoRun.indexOf('} finally {');
    expect(iFinally).toBeGreaterThan(0);
    expect(corpoRun.slice(iFinally)).toContain('concluirPedidoDoParecer(registroDaApresentacao, parDoParecer, { setAiReviewLoading });');
    // o `setAiReviewLoading(false)` incondicional de antes não existe mais na função; só o `(true)` do prólogo
    expect(ocorrencias(corpoRun, 'setAiReviewLoading(false)')).toBe(0);
    expect(ocorrencias(corpoRun, 'setAiReviewLoading(true)')).toBe(1);
    expect(ocorrencias(pagina, 'setAiReviewLoading(false)')).toBe(0);
  });

  test('a página passa os DOIS membros novos pelo objeto `acoesDaTela`, uma vez cada, e importa `concluirPedidoDoParecer`', () => {
    const ini = pagina.indexOf('const acoesDaTela: AcoesDaTela = {');
    const fim = pagina.indexOf('\n  };\n', ini);
    const objeto = pagina.slice(ini, fim);
    expect(ocorrencias(objeto, '    setExecucaoDoParecer,\n')).toBe(1);
    expect(ocorrencias(objeto, '    setAiReviewLoading,\n')).toBe(1);
    expect(ocorrencias(pagina, '  concluirPedidoDoParecer,\n')).toBe(1);
  });

  test('o tipo `AcoesDaTela` declara os dois membros, e cada fluxo de apresentação os usa onde retira (ou não retira) o Parecer', () => {
    const tipo = modulo.slice(modulo.indexOf('export interface AcoesDaTela {'), modulo.indexOf('export type EnviarAuditoria'));
    expect(ocorrencias(tipo, '  setExecucaoDoParecer(identificacao: any): void;')).toBe(1);
    expect(ocorrencias(tipo, '  setAiReviewLoading(b: boolean): void;')).toBe(1);
    const corpoDe = (funcao: string) => {
      const i = modulo.indexOf(funcao);
      return modulo.slice(i, modulo.indexOf('\n}\n', i));
    };
    const exibir = corpoDe('export async function exibirExecucaoEscolhida');
    const carga = corpoDe('export async function apresentarCargaInicial');
    const recalculo = corpoDe('export async function recalcularResultados');
    expect([ocorrencias(exibir, 'acoes.setExecucaoDoParecer(null);'), ocorrencias(exibir, 'acoes.setAiReviewLoading(false);')]).toEqual([1, 1]);
    expect([ocorrencias(recalculo, 'acoes.setExecucaoDoParecer(null);'), ocorrencias(recalculo, 'acoes.setAiReviewLoading(false);')]).toEqual([1, 1]);
    expect([ocorrencias(carga, 'acoes.setExecucaoDoParecer('), ocorrencias(carga, 'acoes.setAiReviewLoading(false);'), ocorrencias(carga, 'acoes.setAiReview(')]).toEqual([0, 1, 0]);
    // a limpeza acontece ANTES do primeiro `await` de cada fluxo (a conclusão do pedido antigo não a antecede)
    expect(exibir.indexOf('acoes.setAiReviewLoading(false);')).toBeLessThan(exibir.indexOf('await '));
    expect(carga.indexOf('acoes.setAiReviewLoading(false);')).toBeLessThan(carga.indexOf('await '));
    expect(recalculo.indexOf('acoes.setAiReviewLoading(false);')).toBeGreaterThan(recalculo.indexOf('registro.apresentar(documentoNovo);'));
  });

  test('«Exibir» e «Carregar a referência atual» chegam ao fluxo que retira o Parecer: `onExibir(documento)` → `exibirExecucao` → `exibirExecucaoEscolhida`', () => {
    const painel = ler('components/ReferenciaDoProjeto.tsx');
    expect(ocorrencias(painel, 'apresentar: documento => { onExibir(documento); },')).toBe(2);
    expect(ocorrencias(pagina, 'onExibir={exibirExecucao}')).toBe(1);
    expect(ocorrencias(pagina, 'await exibirExecucaoEscolhida({ documento, registro: registroDaApresentacao, acoes: acoesDaTela, enviarAuditoria: enviarAuditoriaPeloNavegador });')).toBe(1);
  });

  test('a identificação e o indicador do Parecer continuam em `useState` da página, e o componente recebe os dois', () => {
    expect(ocorrencias(pagina, 'const [execucaoDoParecer, setExecucaoDoParecer] = useState<IdentificacaoDaExecucao | null>(null);')).toBe(1);
    expect(ocorrencias(pagina, 'const [aiReviewLoading, setAiReviewLoading] = useState(false);')).toBe(1);
    expect(ocorrencias(pagina, 'loading={aiReviewLoading}')).toBe(1);
    expect(ocorrencias(pagina, 'execucaoAnalisada={execucaoDoParecer}')).toBe(1);
  });
});
