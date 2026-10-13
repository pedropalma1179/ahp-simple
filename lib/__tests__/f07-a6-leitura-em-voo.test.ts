/**
 * lib/__tests__/f07-a6-leitura-em-voo.test.ts
 *
 * F07, entrega A6, V5: uma leitura em voo de «Exibir» ou de «Carregar a referência atual» não pode apresentar
 * depois de a tela ter passado a apresentar outra coisa por QUALQUER caminho (o recálculo inclusive), nem depois
 * de o painel que a pediu ter sido DESMONTADO.
 *
 * O defeito: a ordem de cliques de A5 ordena cliques nos dois botões. Uma apresentação vinda de outro lugar não
 * tira o bilhete, e a leitura iniciada antes voltava vigente. No recálculo há ainda o desmonte: `loading` liga, a
 * página troca o painel pelo indicador de carga, e a leitura iniciada antes volta com o fecho da instância ANTIGA,
 * que ainda alcança a apresentação da página e ainda vê a ordem antiga (onde o seu bilhete segue o mais novo). E
 * na janela entre o desmonte e a apresentação do resultado novo (a ida ao servidor) NADA avançou ainda.
 *
 * Exercita as funções REAIS: `exibirExecucaoDaLista` e `carregarReferenciaAtual` (lib/fluxos-da-referencia.ts), a
 * composição `acompanharLeitura` + `leituraSuperada`, o registro REAL de `lib/apresentacao-corrente.ts`, e
 * `recalcularResultados` e `exibirExecucaoEscolhida` REAIS de `lib/fluxos-da-tela.ts` (a ordem medida:
 * `setLoading(true)`, depois `await executar(...)`, e só então `registro.apresentar`). O desmonte do painel é
 * simulado por `setLoading(true)` desligar a bandeira `montada` do painel.
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** Que a página montada funcione: nenhuma tela é montada por teste algum.
 * Os auxiliares `abrirPainel`, `clicarExibir` e `clicarCarregar` repetem a FIAÇÃO que o componente faz (pegar o
 * bilhete e o par no clique; passar `vigente` e `interrompida`); a lógica sob teste é a REAL, e a fiação repetida
 * é conferida contra o componente e a página, por LEITURA, no último bloco. O efeito de montagem/limpeza que
 * mantém `montadaRef` e o LIMITE dele (entre o pedido de desmonte e o commit do React a referência ainda diz
 * «montada») não são demonstráveis por teste de módulo.
 */

export {};

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const par = require('@/lib/apresentacao-corrente');
const refs = require('@/lib/fluxos-da-referencia');
const telaFluxos = require('@/lib/fluxos-da-tela');
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;

function adiado<T>() {
  let resolver!: (v: T) => void;
  let rejeitar!: (e: unknown) => void;
  const promessa = new Promise<T>((res, rej) => { resolver = res; rejeitar = rej; });
  return { promessa, resolver, rejeitar };
}
type Leitura = ReturnType<typeof adiado<Record<string, any> | null>>;
const novaLeitura = (): Leitura => adiado<Record<string, any> | null>();
const esvaziar = () => new Promise<void>(r => setImmediate(r));

const doc = (executionId: string) => ({ executionId, responseCount: 12, metadata: { excludedRespondentIds: [] as string[] } });
const refDe = (executionId: string, revision: number) => ({ projectId: 'p', executionId, revision, operationId: `op-${revision}` });

/** A tela de resultados: o armazém que os setters da página escrevem, com o registro REAL da apresentação. */
function criarPagina() {
  const registro = par.criarRegistroDaApresentacao();
  const estado: Record<string, any> = { calculation: null, avisosDaPagina: [] as string[], loading: false };
  const paineis: Painel[] = [];
  const acoes = {
    setCalculation: (d: any) => { estado.calculation = d; },
    setExibicao: () => undefined,
    setExcludedIds: () => undefined,
    setAiReview: () => undefined,
    // F07 A7: os dois membros novos de `AcoesDaTela` (V3). O banco só os aceita; nenhuma asserção deste arquivo os examina.
    setExecucaoDoParecer: () => undefined,
    setAiReviewLoading: () => undefined,
    setAudit: () => undefined,
    setExecucaoRecemCalculada: () => undefined,
    setError: () => undefined,
    setIsRecalculating: () => undefined,
    // ⚠ o desmonte: `loading` liga, a página troca o painel pelo indicador de carga (resultados/page.tsx:2845)
    setLoading: (b: boolean) => { estado.loading = b; if (b) paineis.forEach(p => { p.montada = false; }); },
    acrescentarAviso: (t: string) => { estado.avisosDaPagina.push(t); },
  };
  const enviarAuditoria = async () => ({ success: true, audit: 'auditoria' });
  /** O que a página faz com `onExibir(documento)`: `exibirExecucaoEscolhida` com o MESMO registro. */
  const exibirExecucao = (documento: Record<string, any>) => telaFluxos.exibirExecucaoEscolhida({ documento, registro, acoes, enviarAuditoria });
  return { registro, estado, acoes, paineis, enviarAuditoria, exibirExecucao };
}
type Pagina = ReturnType<typeof criarPagina>;

interface Painel {
  montada: boolean;
  ordem: ReturnType<typeof refs.criarOrdemDeCliques>;
  eventos: string[];
  avisos: string[];
  /** `apresentar` que, se chamado, FALHA o teste que o proíbe */
  apresentarProibido: boolean;
}

/** Monta uma instância do painel: ordem de cliques NOVA, `montada` verdadeira. */
function abrirPainel(pagina: Pagina): Painel {
  const p: Painel = { montada: true, ordem: refs.criarOrdemDeCliques(), eventos: [], avisos: [], apresentarProibido: false };
  pagina.paineis.push(p);
  return p;
}

/** O clique em «Exibir», com a FIAÇÃO do componente depois de A6. */
function clicarExibir(pagina: Pagina, painel: Painel, executionId: string, leitura: Leitura) {
  const bilhete = painel.ordem.novo();
  const acompanhamento = refs.acompanharLeitura({ montada: () => painel.montada, apresentacao: pagina.registro });
  return refs.exibirExecucaoDaLista({
    executionId,
    acoes: {
      lerExecucao: () => leitura.promessa,
      apresentar: (d: Record<string, any>) => {
        if (painel.apresentarProibido) throw new Error('`apresentar` foi chamado por uma leitura que não podia apresentar');
        painel.eventos.push(`apresentar:${d.executionId}`);
        void pagina.exibirExecucao(d);
      },
      acrescentarAviso: (t: string) => { painel.avisos.push(t); },
      vigente: () => painel.ordem.vigente(bilhete),
      interrompida: acompanhamento.interrompida,
    },
  });
}

/** O clique em "Carregar a referência atual", com a fiação do componente depois de A6. */
function clicarCarregar(pagina: Pagina, painel: Painel, referencia: ReturnType<typeof refDe>, leitura: Leitura) {
  const bilhete = painel.ordem.novo();
  const acompanhamento = refs.acompanharLeitura({ montada: () => painel.montada, apresentacao: pagina.registro });
  return refs.carregarReferenciaAtual({
    referencia,
    revisaoCarregada: 1,
    acoes: {
      lerExecucao: () => leitura.promessa,
      apresentar: (d: Record<string, any>) => {
        if (painel.apresentarProibido) throw new Error('`apresentar` foi chamado por uma leitura que não podia apresentar');
        painel.eventos.push(`apresentar:${d.executionId}`);
        void pagina.exibirExecucao(d);
      },
      avancarReferenciaCarregada: (r: { executionId: string; revision: number } | null) => { painel.eventos.push(`avancar:${r?.executionId}@${r?.revision}`); },
      acrescentarAviso: (t: string) => { painel.avisos.push(t); },
      vigente: () => painel.ordem.vigente(bilhete),
      interrompida: acompanhamento.interrompida,
    },
  });
}

/** O recálculo REAL, com `executar` controlado; devolve a promessa do desfecho e o controle da ida ao servidor. */
function iniciarRecalculo(pagina: Pagina, novoDoc: Record<string, any>) {
  const ida = adiado<any>();
  const recalculo = telaFluxos.recalcularResultados({
    projectId: 'p', exclusoes: [], exclusoesApresentadas: [],
    executar: () => ida.promessa, registro: pagina.registro, acoes: pagina.acoes, enviarAuditoria: pagina.enviarAuditoria,
  });
  const concluir = () => ida.resolver({
    desfecho: {
      situacao: 'confirmada',
      intencao: { tipo: 'calculo', id: 'req-1', projectId: 'p', excludedRespondentIds: [], criadaEm: 'z' },
      resposta: { status: 200, corpo: { success: true, executionId: novoDoc.executionId, recuperada: false, calculation: novoDoc } },
    },
    persistida: true,
  });
  return { recalculo, concluir };
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

/** Prepara a página apresentando A, abre o painel, e devolve ambos. */
async function paginaApresentandoA() {
  const pagina = criarPagina();
  await pagina.exibirExecucao(doc('exec-A'));
  const painel = abrirPainel(pagina);
  return { pagina, painel };
}

describe('A6.V5: a leitura em voo e uma apresentação vinda de OUTRO caminho (o painel continua montado)', () => {
  test('(critério 1) «Exibir» em X; o recálculo apresenta Y; a leitura volta: a tela CONTINUA em Y, X não é apresentada, nenhum aviso', async () => {
    const { pagina, painel } = await paginaApresentandoA();
    const leitura = novaLeitura();
    const clique = clicarExibir(pagina, painel, 'exec-X', leitura);
    await esvaziar();
    // o recálculo apresenta Y sem desmontar o painel: isola a pergunta «a apresentação ainda é a da tela?»
    pagina.acoes.setLoading = (b: boolean) => { pagina.estado.loading = b; };
    const rec = iniciarRecalculo(pagina, doc('exec-Y'));
    await esvaziar();
    rec.concluir();
    expect(await rec.recalculo).toBe('concluido');
    expect(pagina.estado.calculation.executionId).toBe('exec-Y');
    leitura.resolver(doc('exec-X'));
    expect(await clique).toBe('superada');
    expect(pagina.estado.calculation.executionId).toBe('exec-Y'); // continua em Y
    expect(painel.eventos).toEqual([]); // X nunca foi apresentada
    expect(painel.avisos).toEqual([]);
  });

  test('(critério 2) o mesmo com «Carregar a referência atual»: nada apresentado, nenhum aviso, a revisão carregada não muda', async () => {
    const { pagina, painel } = await paginaApresentandoA();
    const leitura = novaLeitura();
    const clique = clicarCarregar(pagina, painel, refDe('exec-X', 5), leitura);
    await esvaziar();
    pagina.acoes.setLoading = (b: boolean) => { pagina.estado.loading = b; };
    const rec = iniciarRecalculo(pagina, doc('exec-Y'));
    await esvaziar();
    rec.concluir();
    await rec.recalculo;
    leitura.resolver(doc('exec-X'));
    expect(await clique).toBe('superada');
    expect(pagina.estado.calculation.executionId).toBe('exec-Y');
    expect(painel.eventos).toEqual([]); // sem `apresentar:` e sem `avancar:`
    expect(painel.avisos).toEqual([]);
  });

  test('(critério 3) a leitura LANÇA depois de Y ter sido apresentada: nenhum aviso (é o ramo que o mutante A5-M4d encontrou vazio), em «Exibir» e em «Carregar»', async () => {
    for (const botao of ['exibir', 'carregar'] as const) {
      const { pagina, painel } = await paginaApresentandoA();
      const leitura = novaLeitura();
      const clique = botao === 'exibir' ? clicarExibir(pagina, painel, 'exec-X', leitura) : clicarCarregar(pagina, painel, refDe('exec-X', 5), leitura);
      await esvaziar();
      await pagina.exibirExecucao(doc('exec-Y')); // outra apresentação, por outro caminho, com o painel montado
      leitura.rejeitar(new Error('rede caiu'));
      expect([botao, await clique]).toEqual([botao, 'superada']);
      expect([botao, painel.avisos, painel.eventos]).toEqual([botao, [], []]);
    }
  });

  test('(critério 4) a leitura devolve `null` depois de Y ter sido apresentada: nenhum aviso, em «Exibir» e em «Carregar»', async () => {
    for (const botao of ['exibir', 'carregar'] as const) {
      const { pagina, painel } = await paginaApresentandoA();
      const leitura = novaLeitura();
      const clique = botao === 'exibir' ? clicarExibir(pagina, painel, 'exec-X', leitura) : clicarCarregar(pagina, painel, refDe('exec-X', 5), leitura);
      await esvaziar();
      await pagina.exibirExecucao(doc('exec-Y'));
      leitura.resolver(null);
      expect([botao, await clique]).toEqual([botao, 'superada']);
      expect([botao, painel.avisos, painel.eventos]).toEqual([botao, [], []]);
    }
  });

  test('a apresentação que ia ser feita nunca é chamada: o `apresentar` que lançaria (o quarto desfecho) não é invocado', async () => {
    const { pagina, painel } = await paginaApresentandoA();
    painel.apresentarProibido = true;
    const leitura = novaLeitura();
    const clique = clicarExibir(pagina, painel, 'exec-X', leitura);
    await esvaziar();
    await pagina.exibirExecucao(doc('exec-Y'));
    leitura.resolver(doc('exec-X'));
    expect(await clique).toBe('superada'); // se `apresentar` fosse chamado, lançaria e o desfecho seria `falhou`
    expect(painel.avisos).toEqual([]);
  });
});

describe('A6.V5: o painel é DESMONTADO com a leitura pendente (o recálculo troca a página pelo indicador de carga)', () => {
  const RETORNOS: [string, (l: Leitura) => void][] = [
    ['documento lido', l => l.resolver(doc('exec-X'))],
    ['null', l => l.resolver(null)],
    ['exceção', l => l.rejeitar(new Error('rede caiu'))],
  ];

  for (const botao of ['exibir', 'carregar'] as const) {
    for (const [rotulo, devolver] of RETORNOS) {
      test(`(critérios 5 e 7) «${botao}»: o recálculo desmonta o painel e fica na ida ao servidor; a leitura volta NESSA janela (${rotulo}) com a apresentação ainda INALTERADA: inerte`, async () => {
        const { pagina, painel } = await paginaApresentandoA();
        painel.apresentarProibido = true;
        const leitura = novaLeitura();
        const clique = botao === 'exibir' ? clicarExibir(pagina, painel, 'exec-X', leitura) : clicarCarregar(pagina, painel, refDe('exec-X', 5), leitura);
        await esvaziar();
        const parAntes = pagina.registro.capturar();
        const rec = iniciarRecalculo(pagina, doc('exec-Y'));
        await esvaziar();
        // a janela: o painel foi desmontado, e Y ainda NÃO foi apresentada
        expect(painel.montada).toBe(false);
        expect(pagina.estado.loading).toBe(true);
        expect(pagina.registro.capturar()).toBe(parAntes);
        // a premissa que torna este o critério difícil: contra a apresentação corrente, o par AINDA confere
        // (uma conferência só contra a apresentação, sozinha, deixaria esta leitura passar)
        expect(pagina.registro.conferir(parAntes).aceita).toBe(true);
        // e a ordem antiga ainda acha que este clique é o mais novo
        expect(painel.ordem.vigente(1)).toBe(true);
        devolver(leitura);
        expect([botao, rotulo, await clique]).toEqual([botao, rotulo, 'superada']);
        expect(painel.eventos).toEqual([]);
        expect(painel.avisos).toEqual([]);
        expect(pagina.registro.capturar()).toBe(parAntes); // continua sem apresentação nova
        rec.concluir();
        await rec.recalculo;
        expect(pagina.estado.calculation.executionId).toBe('exec-Y'); // o recálculo apresenta Y, como hoje
      });
    }
  }

  test('(critério 6) a leitura volta DEPOIS de o painel ser remontado e Y apresentada: a ordem antiga e a nova coexistem, e a antiga é inerte; a nova funciona', async () => {
    const { pagina, painel: antigo } = await paginaApresentandoA();
    antigo.apresentarProibido = true;
    const leituraAntiga = novaLeitura();
    const cliqueAntigo = clicarExibir(pagina, antigo, 'exec-X', leituraAntiga);
    await esvaziar();
    const rec = iniciarRecalculo(pagina, doc('exec-Y'));
    await esvaziar();
    rec.concluir();
    await rec.recalculo;
    const novo = abrirPainel(pagina); // o remonte: ordem de cliques NOVA, registro da PÁGINA (o mesmo)
    expect(pagina.estado.calculation.executionId).toBe('exec-Y');
    expect(antigo.montada).toBe(false);
    expect(novo.montada).toBe(true);
    expect(novo.ordem).not.toBe(antigo.ordem);
    // a premissa do critério: na ordem antiga o bilhete do clique antigo ainda é o mais novo
    expect(antigo.ordem.vigente(1)).toBe(true);
    // um clique do painel NOVO, em voo, convive com a leitura antiga
    const leituraNova = novaLeitura();
    const cliqueNovo = clicarExibir(pagina, novo, 'exec-Z', leituraNova);
    await esvaziar();
    leituraAntiga.resolver(doc('exec-X'));
    expect(await cliqueAntigo).toBe('superada');
    expect(antigo.eventos).toEqual([]);
    expect(antigo.avisos).toEqual([]);
    expect(pagina.estado.calculation.executionId).toBe('exec-Y'); // o retorno antigo não apresentou
    leituraNova.resolver(doc('exec-Z'));
    expect(await cliqueNovo).toBe('apresentada'); // o painel novo não foi prejudicado
    expect(novo.eventos).toEqual(['apresentar:exec-Z']);
    expect(pagina.estado.calculation.executionId).toBe('exec-Z');
  });

  test('(critério 7) o mesmo cenário do critério 6 com «Carregar a referência atual»: nada apresentado, nenhum aviso, nenhum avanço de revisão', async () => {
    const { pagina, painel: antigo } = await paginaApresentandoA();
    antigo.apresentarProibido = true;
    const leitura = novaLeitura();
    const clique = clicarCarregar(pagina, antigo, refDe('exec-X', 5), leitura);
    await esvaziar();
    const rec = iniciarRecalculo(pagina, doc('exec-Y'));
    await esvaziar();
    rec.concluir();
    await rec.recalculo;
    abrirPainel(pagina);
    leitura.resolver(doc('exec-X'));
    expect(await clique).toBe('superada');
    expect(antigo.eventos).toEqual([]); // nem `apresentar:` nem `avancar:`
    expect(antigo.avisos).toEqual([]);
  });

  test('um recálculo que FALHA também desmonta o painel: a leitura antiga continua inerte (o retorno de uma instância desmontada é inerte de todo modo)', async () => {
    const { pagina, painel } = await paginaApresentandoA();
    painel.apresentarProibido = true;
    const leitura = novaLeitura();
    const clique = clicarExibir(pagina, painel, 'exec-X', leitura);
    await esvaziar();
    const ida = adiado<any>();
    const rec = telaFluxos.recalcularResultados({
      projectId: 'p', exclusoes: [], exclusoesApresentadas: [], executar: () => ida.promessa,
      registro: pagina.registro, acoes: pagina.acoes, enviarAuditoria: pagina.enviarAuditoria,
    });
    await esvaziar();
    ida.rejeitar(new Error('rede caiu'));
    expect(await rec).toBe('falhou');
    expect(pagina.estado.calculation.executionId).toBe('exec-A'); // nada de novo foi apresentado
    leitura.resolver(doc('exec-X'));
    expect(await clique).toBe('superada'); // mesmo sem apresentação nova, o painel que pediu já não existe
    expect(painel.eventos).toEqual([]);
  });
});

describe('A6.V5: o que NÃO muda (critérios 8, 9 e 10)', () => {
  test('(critério 8) clique único, sem nada competindo: X é apresentada; e «Carregar» avança a revisão', async () => {
    const { pagina, painel } = await paginaApresentandoA();
    const l1 = novaLeitura();
    const c1 = clicarExibir(pagina, painel, 'exec-X', l1);
    l1.resolver(doc('exec-X'));
    expect(await c1).toBe('apresentada');
    expect(pagina.estado.calculation.executionId).toBe('exec-X');
    const l2 = novaLeitura();
    const c2 = clicarCarregar(pagina, painel, refDe('exec-W', 7), l2);
    l2.resolver(doc('exec-W'));
    expect(await c2).toBe('carregada');
    expect(painel.eventos).toEqual(['apresentar:exec-X', 'apresentar:exec-W', 'avancar:exec-W@7']);
    expect(painel.avisos).toEqual([]);
  });

  test('(critério 9) a ordem entre cliques de A5 vale com a fiação de A6: o último clique vence, nas duas ordens de resolução', async () => {
    for (const ultimoResolvePrimeiro of [true, false]) {
      const { pagina, painel } = await paginaApresentandoA();
      const lX = novaLeitura();
      const lY = novaLeitura();
      const cX = clicarExibir(pagina, painel, 'exec-X', lX);
      const cY = clicarExibir(pagina, painel, 'exec-Y', lY);
      if (ultimoResolvePrimeiro) { lY.resolver(doc('exec-Y')); await esvaziar(); lX.resolver(doc('exec-X')); }
      else { lX.resolver(doc('exec-X')); await esvaziar(); lY.resolver(doc('exec-Y')); }
      expect([await cX, await cY]).toEqual(['superada', 'apresentada']);
      expect(painel.eventos).toEqual(['apresentar:exec-Y']);
      expect(pagina.estado.calculation.executionId).toBe('exec-Y');
    }
  });

  test('(critério 10) o recálculo sem leitura em voo apresenta Y, como hoje; e um clique feito DEPOIS de Y funciona (o par é o de depois)', async () => {
    const { pagina, painel } = await paginaApresentandoA();
    const rec = iniciarRecalculo(pagina, doc('exec-Y'));
    await esvaziar();
    rec.concluir();
    expect(await rec.recalculo).toBe('concluido');
    expect(pagina.estado.calculation.executionId).toBe('exec-Y');
    const novo = abrirPainel(pagina);
    const l = novaLeitura();
    const c = clicarExibir(pagina, novo, 'exec-Z', l);
    l.resolver(doc('exec-Z'));
    expect(await c).toBe('apresentada');
    expect(pagina.estado.calculation.executionId).toBe('exec-Z');
    expect(painel.eventos).toEqual([]);
  });

  test('o par é capturado NO CLIQUE e conferido NO RETORNO: `capturar` uma vez antes do `await`, `conferir` só depois', async () => {
    const chamadas: string[] = [];
    const registro = par.criarRegistroDaApresentacao();
    registro.apresentar(doc('exec-A'));
    const espiado = {
      capturar: () => { chamadas.push('capturar'); return registro.capturar(); },
      conferir: (p: any) => { chamadas.push('conferir'); return registro.conferir(p); },
    };
    const pagina = criarPagina();
    const painel = abrirPainel(pagina);
    const leitura = novaLeitura();
    const acompanhamento = refs.acompanharLeitura({ montada: () => painel.montada, apresentacao: espiado });
    expect(chamadas).toEqual(['capturar']); // no clique
    const clique = refs.exibirExecucaoDaLista({
      executionId: 'exec-X',
      acoes: { lerExecucao: () => leitura.promessa, apresentar: () => undefined, acrescentarAviso: () => undefined, interrompida: acompanhamento.interrompida },
    });
    await esvaziar();
    expect(chamadas).toEqual(['capturar']); // a leitura ainda em voo: nada conferido
    leitura.resolver(doc('exec-X'));
    await clique;
    expect(chamadas).toEqual(['capturar', 'conferir']); // no retorno
  });
});

describe('A6.V5: as duas perguntas, e a composição com a ordem', () => {
  test('`acompanharLeitura`: interrompida se a instância foi desmontada, ou se o par deixou de conferir, ou as duas; não interrompida se nada mudou', () => {
    const registro = par.criarRegistroDaApresentacao();
    registro.apresentar(doc('exec-A'));
    let montada = true;
    const a = refs.acompanharLeitura({ montada: () => montada, apresentacao: registro });
    expect(a.interrompida()).toBe(false);
    montada = false;
    expect(a.interrompida()).toBe(true); // desmontada, apresentação inalterada
    montada = true;
    expect(a.interrompida()).toBe(false);
    registro.apresentar(doc('exec-Y'));
    expect(a.interrompida()).toBe(true); // montada, mas a apresentação mudou
    montada = false;
    expect(a.interrompida()).toBe(true); // as duas
    // o par é o do CLIQUE: uma leitura iniciada depois não é interrompida pela apresentação anterior
    montada = true;
    const depois = refs.acompanharLeitura({ montada: () => montada, apresentacao: registro });
    expect(depois.interrompida()).toBe(false);
    // a mesma execução apresentada de novo é outra apresentação (A, B, A): interrompe
    registro.apresentar(doc('exec-Y'));
    expect(depois.interrompida()).toBe(true);
  });

  test('`leituraSuperada`: a ordem E a interrupção, independentes; ausentes, não supera (o comportamento de A4 e de A5)', () => {
    expect(refs.leituraSuperada({})).toBe(false);
    expect(refs.leituraSuperada({ vigente: () => true })).toBe(false);
    expect(refs.leituraSuperada({ vigente: () => false })).toBe(true); // só a ordem (A5)
    expect(refs.leituraSuperada({ interrompida: () => false })).toBe(false);
    expect(refs.leituraSuperada({ interrompida: () => true })).toBe(true); // só a interrupção (A6)
    expect(refs.leituraSuperada({ vigente: () => true, interrompida: () => false })).toBe(false);
    expect(refs.leituraSuperada({ vigente: () => false, interrompida: () => true })).toBe(true);
  });

  test('as duas propriedades ao mesmo tempo: entre dois cliques, o último vence; e uma apresentação de fora supera a leitura em voo', async () => {
    const { pagina, painel } = await paginaApresentandoA();
    const lX = novaLeitura();
    const lY = novaLeitura();
    const cX = clicarExibir(pagina, painel, 'exec-X', lX);
    const cY = clicarExibir(pagina, painel, 'exec-Y', lY);
    await pagina.exibirExecucao(doc('exec-W')); // apresentação vinda de fora dos botões
    lY.resolver(doc('exec-Y'));
    lX.resolver(doc('exec-X'));
    expect([await cX, await cY]).toEqual(['superada', 'superada']); // X pela ordem, Y pela apresentação de fora
    expect(pagina.estado.calculation.executionId).toBe('exec-W');
    expect(painel.eventos).toEqual([]);
  });
});

describe('A6.V5: a ligação ao componente e à página, por LEITURA do fonte (nenhuma tela é montada)', () => {
  const COMPONENTE = ler('components/ReferenciaDoProjeto.tsx');
  const PAGINA = ler('app/decisor/resultados/[projectId]/page.tsx');
  const MODULO = ler('lib/fluxos-da-referencia.ts');
  const corpoDe = (inicio: string) => {
    const i = COMPONENTE.indexOf(inicio);
    expect(i).toBeGreaterThan(-1);
    return COMPONENTE.slice(i, COMPONENTE.indexOf('\n  };\n', i));
  };

  test('em «Exibir» e em «Carregar», o par é capturado NO CLIQUE (depois do bilhete, antes do `await`) e `interrompida` vai nos argumentos de `acoes`', () => {
    for (const [inicio, chamada] of [
      ['const exibir = async (executionId: string) => {', 'await exibirExecucaoDaLista({'],
      ['const carregarReferencia = async () => {', 'await carregarReferenciaAtual({'],
    ]) {
      const corpo = corpoDe(inicio);
      const iBilhete = corpo.indexOf('const bilhete = ordemDeCliques.novo();');
      const iLeitura = corpo.indexOf('const leitura = acompanharLeitura({ montada: () => montadaRef.current, apresentacao: registroDaApresentacao });');
      const iChamada = corpo.indexOf(chamada);
      expect(iBilhete).toBeGreaterThan(-1);
      expect(iLeitura).toBeGreaterThan(iBilhete);
      expect(iChamada).toBeGreaterThan(iLeitura);
      expect(corpo.slice(0, iLeitura).replace(/\/\/.*$/gm, '')).not.toContain('await'); // sem `await` no CÓDIGO antes (o comentário do bilhete cita a palavra)
      expect(corpo.slice(iChamada)).toContain('interrompida: leitura.interrompida,');
      expect(corpo.slice(iChamada)).toContain('vigente: () => ordemDeCliques.vigente(bilhete),'); // a ordem de A5, intacta
    }
    expect(ocorrencias(COMPONENTE, 'acompanharLeitura({')).toBe(2);
    expect(ocorrencias(COMPONENTE, 'interrompida: leitura.interrompida,')).toBe(2);
  });

  test('`montadaRef`: começa verdadeira, é ligada na montagem e DESLIGADA na limpeza de um efeito sem dependências', () => {
    expect(ocorrencias(COMPONENTE, 'const montadaRef = useRef(true);')).toBe(1);
    expect(ocorrencias(COMPONENTE, 'montadaRef.current =')).toBe(2);
    const m = COMPONENTE.match(/useEffect\(\(\) => \{\n    montadaRef\.current = true;\n    return \(\) => \{ montadaRef\.current = false; \};\n  \}, \[\]\);/);
    expect(m).not.toBeNull();
    expect(ocorrencias(COMPONENTE, 'montada: () => montadaRef.current')).toBe(2);
  });

  test('o painel recebe `registroDaApresentacao` como interface nova, só de consulta, e a PÁGINA o passa em uma linha, com o MESMO registro que o recálculo e a exibição usam', () => {
    expect(COMPONENTE).toContain('registroDaApresentacao: ConsultaDaApresentacao;');
    expect(COMPONENTE).toContain('onExibir, registroDaApresentacao,');
    expect(ocorrencias(PAGINA, 'registroDaApresentacao={registroDaApresentacao}')).toBe(1);
    const iPainel = PAGINA.indexOf('<ReferenciaDoProjeto');
    const bloco = PAGINA.slice(iPainel, PAGINA.indexOf('/>', iPainel));
    expect(bloco).toContain('registroDaApresentacao={registroDaApresentacao}');
    // um único registro na página (o `useRef` que sobrevive ao remonte), usado pela exibição e pelo recálculo
    expect(ocorrencias(PAGINA, 'criarRegistroDaApresentacao()')).toBe(1);
    expect(ocorrencias(PAGINA, 'registro: registroDaApresentacao')).toBeGreaterThanOrEqual(2);
    // o tipo de consulta não oferece `apresentar` ao painel
    expect(MODULO).toMatch(/export interface ConsultaDaApresentacao<P = unknown> \{\n  capturar\(\): P;\n  conferir\(par: P\): \{ aceita: boolean \};\n\}/);
  });

  test('nos dois fluxos a pergunta é a MESMA e única: `leituraSuperada(acoes)`, que soma a ordem de A5 e a interrupção', () => {
    expect(ocorrencias(MODULO, 'const superada = () => leituraSuperada(acoes);')).toBe(2);
    expect(MODULO).toContain('return (acoes.vigente !== undefined && !acoes.vigente()) || (acoes.interrompida !== undefined && acoes.interrompida());');
    expect(MODULO).toContain('return !args.montada() || !args.apresentacao.conferir(parDoClique).aceita;');
    // os dois membros continuam OPCIONAIS (os testes de A4 e de A5 seguem sem eles)
    expect(ocorrencias(MODULO, '  interrompida?(): boolean;')).toBe(2);
    expect(ocorrencias(MODULO, '  vigente?(): boolean;')).toBe(2);
  });
});
