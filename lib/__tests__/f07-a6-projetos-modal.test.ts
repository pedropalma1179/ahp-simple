/**
 * lib/__tests__/f07-a6-projetos-modal.test.ts
 *
 * F07, entrega A6, V1: o resultado do cálculo pedido na lista de projetos aparecia no modal de OUTRO projeto.
 *
 * O defeito: `handleCalculate` (app/decisor/projetos/page.tsx) escrevia o desfecho em `calculateResult` depois do
 * `await`, sem conferir de qual projeto era o modal aberto no retorno. `calculateResult` é uma única variável
 * de estado da página. Quem iniciava o cálculo do projeto A, fechava o modal e abria o do projeto B via a
 * mensagem de A (com a execução de A no texto) no modal de B.
 *
 * Exercita a função REAL `calcularProjetoDaLista` de `lib/fluxos-dos-projetos.ts`, que a página chama com os seus
 * setters. O pedido ao servidor é uma promessa CONTROLADA, e o "modal aberto" é uma variável que o teste muda
 * (a página injeta uma referência atualizada a cada renderização).
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** Que a página montada funcione: nenhuma tela é montada por teste algum.
 * Os setters são um armazém simples, e não os de `useState`. Que a página chame `calcularProjetoDaLista` com
 * `modalAberto` lendo a referência (e não o fecho) é conferido por LEITURA do fonte, no último bloco, e a
 * leitura não prova o comportamento no navegador. O LIMITE dessa ligação (a referência atribuída no corpo da
 * renderização pode ficar adiante do que o React comprometeu, e atrás de um `setManagingProject` ainda não
 * renderizado) NÃO é demonstrável por teste de módulo; está declarado na página.
 */

export {};

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const fluxos = require('@/lib/fluxos-dos-projetos');
const retomada = require('@/lib/retomada-com-confirmacao');
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
const esvaziar = () => new Promise<void>(r => setImmediate(r));

/** A tela: o `calculateResult` (uma variável só, para qualquer modal), o indicador, e o modal aberto agora. */
function criarTela(modalInicial: string | null) {
  const t = {
    modal: modalInicial as string | null,
    resultado: 'nunca-escrito' as unknown,
    calculando: false,
    escritas: [] as unknown[],
    eventos: [] as string[],
    leiturasDoModal: 0,
  };
  const acoes = {
    setCalculating: (b: boolean) => { t.calculando = b; t.eventos.push(`calculating:${b}`); },
    setCalculateResult: (r: unknown) => { t.resultado = r; t.escritas.push(r); t.eventos.push(r === null ? 'resultado:null' : `resultado:${(r as any).type}`); },
  };
  const modalAberto = () => { t.leiturasDoModal += 1; return t.modal; };
  return { t, acoes, modalAberto };
}

const confirmada = (executionId: string, persistida = true, message = 'Cálculo concluído.') => ({
  desfecho: {
    situacao: 'confirmada',
    intencao: { tipo: 'calculo', id: 'req-1', projectId: 'x', excludedRespondentIds: [], criadaEm: 'z' },
    resposta: { status: 200, corpo: { success: true, message, executionId, recuperada: false } },
  },
  persistida,
});
const recusada = (error?: string, status = 400) => ({
  desfecho: { situacao: 'recusada', intencao: {}, resposta: { status, corpo: error === undefined ? {} : { error } } },
  persistida: true,
});
const semConfirmacao = (motivo = 'sem resposta do servidor: rede caiu', persistida = true) => ({
  desfecho: { situacao: 'pendente', intencao: {}, motivo },
  persistida,
});

type Desfechos = 'confirmada' | 'recusada' | 'sem-confirmacao' | 'lanca';
const FORMAS: Record<Desfechos, (d: ReturnType<typeof adiado>) => void> = {
  confirmada: d => d.resolver(confirmada('exec-DE-A')),
  recusada: d => d.resolver(recusada('Projeto sem respostas completas.')),
  'sem-confirmacao': d => d.resolver(semConfirmacao()),
  lanca: d => d.rejeitar(new Error('falha de rede em A')),
};

let log: jest.SpyInstance;
beforeEach(() => {
  log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('A6.V1: o desfecho do cálculo de A não é escrito se o modal aberto no retorno não é o de A', () => {
  const MODAIS: [string, string | null][] = [['o modal foi FECHADO (nenhum aberto)', null], ['o modal de OUTRO projeto (B) foi aberto', 'proj-B']];

  for (const forma of Object.keys(FORMAS) as Desfechos[]) {
    for (const [rotuloDoModal, modalNoRetorno] of MODAIS) {
      test(`(${forma}) iniciado no modal de A; ${rotuloDoModal} antes do retorno: nada é escrito, e calculating vai a falso`, async () => {
        const tela = criarTela('proj-A');
        const envio = adiado<any>();
        const emVoo = fluxos.calcularProjetoDaLista({ projectId: 'proj-A', bloqueado: false, executar: () => envio.promessa, modalAberto: tela.modalAberto, acoes: tela.acoes });
        await esvaziar();
        expect(tela.t.calculando).toBe(true); // em voo
        tela.t.modal = modalNoRetorno; // a pessoa fechou o modal de A (e talvez abriu o de B)
        FORMAS[forma](envio);
        expect(await emVoo).toBe('descartado');
        // a única escrita é a limpeza inicial; o modal de B (ou nenhum) NÃO recebe mensagem alguma sobre A
        expect(tela.t.escritas).toEqual([null]);
        expect(tela.t.resultado).toBeNull();
        expect(tela.t.calculando).toBe(false);
        expect(JSON.stringify(tela.t.escritas)).not.toContain('exec-DE-A');
        // o descarte fica no log, com texto que o distingue de uma falha
        expect(log.mock.calls.map(c => String(c[0])).filter(l => l.includes('DESCARTADO'))).toHaveLength(1);
        expect(String(log.mock.calls.find(c => String(c[0]).includes('DESCARTADO'))![0])).toContain('proj-A');
      });
    }
  }

  test('o modal de A FECHADO e REABERTO (o mesmo projeto) antes do retorno: o desfecho é de A, e é escrito', async () => {
    const tela = criarTela('proj-A');
    const envio = adiado<any>();
    const emVoo = fluxos.calcularProjetoDaLista({ projectId: 'proj-A', bloqueado: false, executar: () => envio.promessa, modalAberto: tela.modalAberto, acoes: tela.acoes });
    await esvaziar();
    tela.t.modal = null;
    tela.t.modal = 'proj-A';
    envio.resolver(confirmada('exec-DE-A'));
    expect(await emVoo).toBe('escrito');
    expect(tela.t.resultado).toEqual({ type: 'success', text: 'Cálculo concluído. Execução exec-DE-A.' });
  });

  test('a conferência é feita NO RETORNO: o modal não é lido antes de o pedido voltar, e é lido depois', async () => {
    const tela = criarTela('proj-A');
    const envio = adiado<any>();
    const emVoo = fluxos.calcularProjetoDaLista({ projectId: 'proj-A', bloqueado: false, executar: () => envio.promessa, modalAberto: tela.modalAberto, acoes: tela.acoes });
    await esvaziar();
    expect(tela.t.leiturasDoModal).toBe(0);
    // troca DEPOIS do início e ANTES do retorno: só uma leitura no retorno a enxerga
    tela.t.modal = 'proj-B';
    envio.resolver(confirmada('exec-DE-A'));
    await emVoo;
    expect(tela.t.leiturasDoModal).toBe(1);
    expect(tela.t.resultado).toBeNull();
  });

  test('um segundo cálculo, no modal de B, depois de o de A ter sido descartado, funciona normalmente', async () => {
    const tela = criarTela('proj-A');
    const envioA = adiado<any>();
    const a = fluxos.calcularProjetoDaLista({ projectId: 'proj-A', bloqueado: false, executar: () => envioA.promessa, modalAberto: tela.modalAberto, acoes: tela.acoes });
    await esvaziar();
    tela.t.modal = 'proj-B';
    envioA.resolver(confirmada('exec-DE-A'));
    expect(await a).toBe('descartado');
    const b = await fluxos.calcularProjetoDaLista({ projectId: 'proj-B', bloqueado: false, executar: async () => confirmada('exec-DE-B'), modalAberto: tela.modalAberto, acoes: tela.acoes });
    expect(b).toBe('escrito');
    expect(tela.t.resultado).toEqual({ type: 'success', text: 'Cálculo concluído. Execução exec-DE-B.' });
  });
});

describe('A6.V1: o caminho ordinário e o bloqueado, com os textos de hoje', () => {
  test('(critério 6) iniciado em A, o modal de A ainda aberto no retorno, confirmada: a mensagem aparece, com a execução, no texto de hoje', async () => {
    const tela = criarTela('proj-A');
    const desfecho = await fluxos.calcularProjetoDaLista({ projectId: 'proj-A', bloqueado: false, executar: async () => confirmada('exec-DE-A'), modalAberto: tela.modalAberto, acoes: tela.acoes });
    expect(desfecho).toBe('escrito');
    expect(tela.t.resultado).toEqual({ type: 'success', text: 'Cálculo concluído. Execução exec-DE-A.' });
    expect(tela.t.eventos).toEqual(['calculating:true', 'resultado:null', 'resultado:success', 'calculating:false']);
    expect(log).not.toHaveBeenCalled();
  });

  test('com o armazenamento indisponível, o aviso é acrescentado ao texto, byte a byte', async () => {
    const tela = criarTela('proj-A');
    await fluxos.calcularProjetoDaLista({ projectId: 'proj-A', bloqueado: false, executar: async () => confirmada('exec-DE-A', false), modalAberto: tela.modalAberto, acoes: tela.acoes });
    expect((tela.t.resultado as any).text).toBe(
      'Cálculo concluído. Execução exec-DE-A. Aviso: o armazenamento do navegador não está disponível, e uma recarga agora não permitiria recuperar este pedido.'
    );
  });

  test('recusada (com e sem `error`), sem confirmação (com e sem armazenamento) e exceção, com o modal de A aberto: os textos de hoje', async () => {
    const casos: [string, () => Promise<any>, unknown][] = [
      ['recusada com `error`', async () => recusada('Projeto sem respostas completas.', 422), { type: 'error', text: 'Projeto sem respostas completas.' }],
      ['recusada sem `error`', async () => recusada(undefined, 400), { type: 'error', text: 'Pedido recusado (status 400).' }],
      ['sem confirmação', async () => semConfirmacao('sem resposta do servidor: rede caiu'), {
        type: 'error',
        text: 'Sem confirmação do servidor (sem resposta do servidor: rede caiu). O pedido permanece guardado neste navegador: ao reabrir esta tela ele é consultado, e a execução, se foi criada, é recuperada sem novo cálculo.',
      }],
      ['sem confirmação e sem armazenamento', async () => semConfirmacao('resposta sem decisão (status 503)', false), {
        type: 'error',
        text: 'Sem confirmação do servidor (resposta sem decisão (status 503)). O pedido permanece guardado neste navegador: ao reabrir esta tela ele é consultado, e a execução, se foi criada, é recuperada sem novo cálculo. Aviso: o armazenamento do navegador não está disponível, e uma recarga agora não permitiria recuperar este pedido.',
      }],
      ['a chamada lança', async () => { throw new Error('falha de rede em A'); }, { type: 'error', text: 'falha de rede em A' }],
    ];
    for (const [rotulo, executar, esperado] of casos) {
      const tela = criarTela('proj-A');
      const desfecho = await fluxos.calcularProjetoDaLista({ projectId: 'proj-A', bloqueado: false, executar, modalAberto: tela.modalAberto, acoes: tela.acoes });
      expect([rotulo, desfecho, tela.t.resultado, tela.t.calculando]).toEqual([rotulo, 'escrito', esperado, false]);
    }
  });

  test('`executar` recebe `{ projectId }` do clique, e só ele', async () => {
    const tela = criarTela('proj-A');
    const recebidos: unknown[] = [];
    await fluxos.calcularProjetoDaLista({ projectId: 'proj-A', bloqueado: false, executar: async (p: unknown) => { recebidos.push(p); return confirmada('exec-DE-A'); }, modalAberto: tela.modalAberto, acoes: tela.acoes });
    expect(recebidos).toEqual([{ projectId: 'proj-A' }]);
  });

  test('(critério 7) bloqueado por pendência: escreve a mensagem de ação bloqueada, como hoje, não envia nada e não liga o indicador', async () => {
    const tela = criarTela(null); // nem precisa de modal: a escrita é anterior ao `await`
    let chamadas = 0;
    const desfecho = await fluxos.calcularProjetoDaLista({ projectId: 'proj-A', bloqueado: true, executar: async () => { chamadas += 1; return confirmada('x'); }, modalAberto: tela.modalAberto, acoes: tela.acoes });
    expect(desfecho).toBe('bloqueado');
    expect(chamadas).toBe(0);
    expect(tela.t.resultado).toEqual({ type: 'error', text: retomada.MENSAGEM_DE_ACAO_BLOQUEADA });
    expect(tela.t.eventos).toEqual(['resultado:error']);
    expect(tela.t.leiturasDoModal).toBe(0);
  });

  test('`calculating` desliga no `finally` também quando a chamada lança e quando o desfecho é descartado', async () => {
    const tela = criarTela('proj-A');
    const envio = adiado<any>();
    const emVoo = fluxos.calcularProjetoDaLista({ projectId: 'proj-A', bloqueado: false, executar: () => envio.promessa, modalAberto: tela.modalAberto, acoes: tela.acoes });
    await esvaziar();
    tela.t.modal = null;
    envio.rejeitar(new Error('x'));
    await emVoo;
    expect(tela.t.calculando).toBe(false);
    expect(tela.t.eventos[tela.t.eventos.length - 1]).toBe('calculating:false');
  });
});

describe('A6.V1: a ligação à página, por LEITURA do fonte (nenhuma tela é montada)', () => {
  const PAGINA = ler('app/decisor/projetos/page.tsx');
  const MODULO = ler('lib/fluxos-dos-projetos.ts');
  const i = PAGINA.indexOf('const handleCalculate = async (projectId: string) => {');
  const corpo = PAGINA.slice(i, PAGINA.indexOf('\n  };\n', i));

  test('`handleCalculate` chama `calcularProjetoDaLista({ projectId, bloqueado, executar, modalAberto, acoes })` uma vez, com os setters da página', () => {
    expect(i).toBeGreaterThan(-1);
    expect(ocorrencias(PAGINA, 'await calcularProjetoDaLista({')).toBe(1);
    for (const trecho of [
      'projectId,',
      'bloqueado: bloqueadoPorPendencia,',
      'executar: parametros => executarCalculo(dependenciasDoNavegador(), parametros),',
      'modalAberto: () => managingProjectRef.current?.id ?? null,',
      'acoes: { setCalculating, setCalculateResult },',
    ]) expect(corpo).toContain(trecho);
    expect(ocorrencias(PAGINA, 'onCalculate={() => handleCalculate(managingProject.id)}')).toBe(1);
  });

  test('o modal lido no retorno é uma REFERÊNCIA atualizada no corpo da renderização, e NÃO a propriedade do fecho', () => {
    expect(ocorrencias(PAGINA, 'const managingProjectRef = useRef(managingProject);')).toBe(1);
    expect(ocorrencias(PAGINA, '\n  managingProjectRef.current = managingProject;\n')).toBe(1);
    expect(ocorrencias(PAGINA, 'managingProjectRef.current =')).toBe(1); // nenhuma outra escrita (em efeito, em manipulador)
    for (const m of PAGINA.matchAll(/useEffect\(\(\) => \{[\s\S]*?\n  \}, \[[^\]]*\]\);/g)) expect(m[0]).not.toContain('managingProjectRef');
    expect(PAGINA).not.toMatch(/modalAberto:\s*\(\)\s*=>\s*managingProject\b(?!Ref)/);
    expect(ocorrencias(PAGINA, 'modalAberto:')).toBe(1);
  });

  test('a página já não escreve `calculateResult` nem `calculating` fora do módulo: o único `setCalculateResult(` direto é o do fechamento do modal', () => {
    expect(ocorrencias(PAGINA, 'setCalculating(')).toBe(0);
    expect(ocorrencias(PAGINA, 'setCalculateResult(')).toBe(1);
    expect(ocorrencias(PAGINA, 'onClose={() => { setManagingProject(null); setCalculateResult(null); }}')).toBe(1);
    expect(ocorrencias(PAGINA, 'calculateResult={calculateResult}')).toBe(1);
    expect(ocorrencias(PAGINA, 'calculating={calculating || retomando}')).toBe(1);
  });

  test('no módulo: a conferência do modal é a ÚNICA porta da escrita pós-`await`, nos dois ramos (retorno e exceção), e vem depois do `await`', () => {
    const iAwait = MODULO.indexOf('await executar(');
    expect(iAwait).toBeGreaterThan(-1);
    expect(ocorrencias(MODULO, 'modalAberto() !== projectId')).toBe(1);
    expect(ocorrencias(MODULO, 'desfechoDaEscrita = escreverSeOModalForDoProjeto(')).toBe(2);
    expect(MODULO.indexOf('desfechoDaEscrita = escreverSeOModalForDoProjeto(')).toBeGreaterThan(iAwait);
    expect(MODULO.lastIndexOf('desfechoDaEscrita = escreverSeOModalForDoProjeto(')).toBeGreaterThan(iAwait);
    // `setCalculateResult` com o resultado só aparece dentro dessa porta (mais as duas escritas anteriores ao `await`)
    expect(ocorrencias(MODULO, 'acoes.setCalculateResult(')).toBe(3);
    expect(MODULO).toContain('} finally {\n    acoes.setCalculating(false);\n  }');
  });
});
