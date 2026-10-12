/**
 * lib/__tests__/f07-a5-validacao-externa.test.ts
 *
 * F07, entrega A5, ponto 2: a validação externa conservava o resultado da apresentação anterior.
 *
 * Causa: estado ou resposta de uma apresentação anterior aplicado à apresentação atual. Aqui, estado
 * ESCRITO para uma apresentação e NUNCA INVALIDADO: validar A, trocar para B e ficar deixava o resultado
 * de A na tela sob os números de B, e sem rótulo que o dissesse (o tipo `Apresentacao` não traz o
 * identificador da execução). Nenhuma captura de fecho está envolvida: uma varredura calibrada em
 * "valor capturado antes do await" não acharia este caso.
 *
 * Exercita as funções REAIS `trocarApresentacaoDaValidacao` e `pedirValidacaoDaApresentacao`, de
 * `lib/fluxos-da-tela.ts`, e o registro real de `lib/apresentacao-corrente.ts`, que são o que
 * `components/ExternalValidation.tsx` chama (a ligação está no último bloco, por leitura).
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** Que o componente montado funcione: nenhuma tela é montada por
 * teste algum (o componente é só RENDERIZADO NO SERVIDOR por `validacao-externa-fase2.test.ts`, onde
 * nem efeito nem manipulador rodam). Os setters aqui são um armazém simples.
 */

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

/** O armazém: o que a tela mostra (`apresentacao`) e o indicador (`loading`), com a ordem das escritas. */
function criarTela() {
  const estado: { apresentacao: string | null; loading: boolean } = { apresentacao: null, loading: false };
  const historico: string[] = [];
  const acoes = {
    setApresentacao: (v: string | null) => { estado.apresentacao = v; historico.push(`apresentacao=${v}`); },
    setLoading: (b: boolean) => { estado.loading = b; historico.push(`loading=${b}`); },
  };
  return { estado, historico, acoes };
}

/** Um produtor controlado: cada chamada vira um pedido cuja resposta o teste resolve. */
function produtorControlado() {
  const pedidos: Adiado<string>[] = [];
  const produzir = () => { const d = adiado<string>(); pedidos.push(d); return d.promessa; };
  return { produzir, pedidos };
}

const DOC_A = { executionId: 'exec-A', responseCount: 12 };
const DOC_B = { executionId: 'exec-B', responseCount: 12 };
const esvaziar = () => new Promise<void>(r => setImmediate(r));

describe('A5.2: a validação externa na troca da apresentação', () => {
  test('(critério 1) trocar a apresentação com um resultado de validação na tela: o resultado SAI', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_A, tela.acoes); // o efeito da montagem
    const prod = produtorControlado();
    const pedido = fluxos.pedirValidacaoDaApresentacao({ registro, produzir: prod.produzir, acoes: tela.acoes });
    await esvaziar();
    prod.pedidos[0].resolver('resultado-de-A');
    expect(await pedido).toBe('escrita');
    expect(tela.estado.apresentacao).toBe('resultado-de-A'); // o resultado está na tela
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_B, tela.acoes); // a pessoa trocou para B
    expect(tela.estado.apresentacao).toBeNull(); // e o resultado de A saiu
    expect(tela.estado.loading).toBe(false);
  });

  test('(critério 2, juntas) a resposta TARDIA da apresentação anterior chega DEPOIS da limpeza e NÃO é escrita: a limpeza e o par se completam', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_A, tela.acoes);
    const prod = produtorControlado();
    const pedidoDeA = fluxos.pedirValidacaoDaApresentacao({ registro, produzir: prod.produzir, acoes: tela.acoes });
    await esvaziar();
    expect(tela.estado.loading).toBe(true); // validando A
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_B, tela.acoes); // troca ENQUANTO o pedido de A está em voo
    expect(tela.estado.apresentacao).toBeNull();
    prod.pedidos[0].resolver('resultado-de-A'); // a resposta de A chega, tarde
    expect(await pedidoDeA).toBe('descartada');
    expect(tela.estado.apresentacao).toBeNull(); // NÃO foi escrita sobre B
    expect(tela.historico).not.toContain('apresentacao=resultado-de-A');
  });

  test('(critério 3) pedir a validação de novo na apresentação NOVA funciona normalmente', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_A, tela.acoes);
    const prod = produtorControlado();
    const pedidoDeA = fluxos.pedirValidacaoDaApresentacao({ registro, produzir: prod.produzir, acoes: tela.acoes });
    await esvaziar();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_B, tela.acoes);
    // o indicador do pedido antigo NÃO trava a apresentação nova: dá para pedir de novo antes de A terminar
    expect(tela.estado.loading).toBe(false);
    const pedidoDeB = fluxos.pedirValidacaoDaApresentacao({ registro, produzir: prod.produzir, acoes: tela.acoes });
    await esvaziar();
    expect(tela.estado.loading).toBe(true);
    prod.pedidos[1].resolver('resultado-de-B');
    expect(await pedidoDeB).toBe('escrita');
    expect(tela.estado.apresentacao).toBe('resultado-de-B');
    expect(tela.estado.loading).toBe(false);
    // e o pedido de A, que terminou por último, não mexeu em nada
    prod.pedidos[0].resolver('resultado-de-A');
    expect(await pedidoDeA).toBe('descartada');
    expect(tela.estado.apresentacao).toBe('resultado-de-B');
  });

  test('o `finally` do pedido ANTIGO não desliga o indicador do pedido NOVO que ainda está em voo', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_A, tela.acoes);
    const prod = produtorControlado();
    const pedidoDeA = fluxos.pedirValidacaoDaApresentacao({ registro, produzir: prod.produzir, acoes: tela.acoes });
    await esvaziar();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_B, tela.acoes);
    const pedidoDeB = fluxos.pedirValidacaoDaApresentacao({ registro, produzir: prod.produzir, acoes: tela.acoes });
    await esvaziar();
    expect(tela.estado.loading).toBe(true); // validando B
    prod.pedidos[0].resolver('resultado-de-A'); // A termina primeiro
    await pedidoDeA;
    expect(tela.estado.loading).toBe(true); // B continua validando: o finally de A não o desligou
    prod.pedidos[1].resolver('resultado-de-B');
    await pedidoDeB;
    expect(tela.estado.loading).toBe(false);
  });

  test('A, B, A: voltar à MESMA execução é outra apresentação, e o resultado antigo não ressuscita', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_A, tela.acoes);
    const prod = produtorControlado();
    const pedido = fluxos.pedirValidacaoDaApresentacao({ registro, produzir: prod.produzir, acoes: tela.acoes });
    await esvaziar();
    prod.pedidos[0].resolver('resultado-de-A');
    await pedido;
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_B, tela.acoes);
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_A, tela.acoes); // o MESMO objeto de A
    expect(tela.estado.apresentacao).toBeNull();
  });

  test('a resposta tardia de A, que chega só depois de A, B, A, também é descartada (outra geração, mesma execução)', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_A, tela.acoes);
    const prod = produtorControlado();
    const pedido = fluxos.pedirValidacaoDaApresentacao({ registro, produzir: prod.produzir, acoes: tela.acoes });
    await esvaziar();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_B, tela.acoes);
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_A, tela.acoes);
    prod.pedidos[0].resolver('resultado-da-primeira-apresentacao-de-A');
    expect(await pedido).toBe('descartada');
    expect(tela.estado.apresentacao).toBeNull();
  });

  test('o pedido na mesma apresentação, sem troca: o resultado é escrito e o indicador desliga (comportamento de antes preservado)', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_A, tela.acoes);
    const prod = produtorControlado();
    const pedido = fluxos.pedirValidacaoDaApresentacao({ registro, produzir: prod.produzir, acoes: tela.acoes });
    await esvaziar();
    expect(tela.historico.slice(-2)).toEqual(['loading=true', 'apresentacao=null']); // liga e limpa, como o `runValidation` de antes
    prod.pedidos[0].resolver('r');
    expect(await pedido).toBe('escrita');
    expect(tela.historico.slice(-2)).toEqual(['apresentacao=r', 'loading=false']);
  });

  test('a exceção de `produzir` não é capturada (como em `escreverSeVigente`), mas o indicador desliga', async () => {
    const tela = criarTela();
    const registro = par.criarRegistroDaApresentacao();
    fluxos.trocarApresentacaoDaValidacao(registro, DOC_A, tela.acoes);
    await expect(fluxos.pedirValidacaoDaApresentacao({ registro, produzir: () => Promise.reject(new Error('x')), acoes: tela.acoes })).rejects.toThrow('x');
    expect(tela.estado.loading).toBe(false);
  });
});

describe('A5.2: a ligação ao componente, por LEITURA do fonte (nenhuma tela é montada)', () => {
  const COMPONENTE = ler('components/ExternalValidation.tsx');
  const MODULO = ler('lib/fluxos-da-tela.ts');

  test('o efeito do `calculation` chama `trocarApresentacaoDaValidacao(registro, calculation, { setApresentacao, setLoading })`, com `[calculation, registro]` como dependências', () => {
    const chamada = 'trocarApresentacaoDaValidacao(registro, calculation, { setApresentacao, setLoading });';
    expect(ocorrencias(COMPONENTE, chamada)).toBe(1);
    const i = COMPONENTE.indexOf(chamada);
    expect(COMPONENTE.slice(COMPONENTE.lastIndexOf('useEffect(', i), i)).toMatch(/^useEffect\(\(\) => \{\s*$/);
    expect(COMPONENTE.slice(i, i + 140)).toContain('}, [calculation, registro]);');
    // o componente não chama mais `registro.apresentar` direto: a troca passa pelo módulo
    expect(ocorrencias(COMPONENTE, 'registro.apresentar(')).toBe(0);
  });

  test('`runValidation` chama `pedirValidacaoDaApresentacao({ registro, produzir, acoes: { setApresentacao, setLoading } })` e `produzir` é `executarValidacao(calculation, …)`', () => {
    expect(ocorrencias(COMPONENTE, 'await pedirValidacaoDaApresentacao({')).toBe(1);
    const i = COMPONENTE.indexOf('await pedirValidacaoDaApresentacao({');
    const corpo = COMPONENTE.slice(i, COMPONENTE.indexOf('});', i) + 3);
    expect(corpo).toContain('registro,');
    expect(corpo).toContain('produzir: () => executarValidacao(calculation, (url, init) => fetch(url, init)),');
    expect(corpo).toContain('acoes: { setApresentacao, setLoading },');
  });

  test('o componente já não escreve `setApresentacao(null)`/`setLoading(` fora das duas chamadas do módulo (a escrita vive no módulo testado)', () => {
    expect(ocorrencias(COMPONENTE, 'setApresentacao(')).toBe(0);
    expect(ocorrencias(COMPONENTE, 'setLoading(')).toBe(0);
    expect(ocorrencias(COMPONENTE, 'escreverSeVigente(')).toBe(0);
  });

  test('o módulo: `pedirValidacaoDaApresentacao` captura o par ANTES de pedir, escreve por `escreverSeVigente`, e só desliga o indicador se o par ainda confere', () => {
    const i = MODULO.indexOf('export async function pedirValidacaoDaApresentacao');
    const corpo = MODULO.slice(i, MODULO.indexOf('\n}\n', i));
    expect(corpo.indexOf('const par = registro.capturar();')).toBeGreaterThan(0);
    expect(corpo.indexOf('const par = registro.capturar();')).toBeLessThan(corpo.indexOf('await escreverSeVigente(registro, par, produzir'));
    expect(corpo).toContain('if (registro.conferir(par).aceita) acoes.setLoading(false);');
  });

  test('o `fetch(` do componente continua sendo os dois conhecidos (a saúde do serviço e a validação): o levantamento de A4 vale', () => {
    expect(ocorrencias(COMPONENTE, 'fetch(')).toBe(2);
  });
});
