/**
 * lib/__tests__/f07-a8-procedencia.test.ts
 *
 * F07, entrega A8: o ESCRITOR de um artefato de medição RECUSA regravar sem procedência correspondente.
 *
 * O que se exercita de verdade:
 *   - as funções REAIS de `lib/__tests__/helpers/procedencia-da-regravacao.ts` (a notação dos caminhos, as
 *     folhas, a diferença entre versões, os resumos que os testes fixam, as exigências de lista e de entrada);
 *   - a RECUSA (`exigirProcedenciaCorrespondente`) contra um repositório git DE VERDADE, criado em diretório
 *     temporário: sem entrada correspondente ela LANÇA; com entrada correspondente ela devolve a medição;
 *   - os BLOCOS `if (GRAVAR) { … }` dos dois escritores (`a12-diagnostico.test.ts`, `a12-rastreabilidade.test.ts`),
 *     LIDOS do fonte e EXECUTADOS (transpilados, em contexto isolado): sem entrada correspondente nada é escrito e
 *     o bloco lança; com entrada correspondente o arquivo é gravado; e sem a variável de ambiente o bloco não faz
 *     nada (nem chama a guarda).
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.**
 *   - que o `motivo` de uma entrada seja verdadeiro (é texto);
 *   - que a regravação REAL dos dois artefatos esteja certa: isso é a comparação campo a campo medida na entrega,
 *     e os testes de cada `a12-*.test.ts`;
 *   - os repositórios temporários têm artefatos SINTÉTICOS, no caminho e na forma que cada escritor espera (o
 *     artefato real tem centenas de folhas); o que se prova é o comportamento da guarda, e não o conteúdo real.
 */

export {};

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const P = require('./helpers/procedencia-da-regravacao');
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;
const sha = (b: string | Buffer) => crypto.createHash('sha256').update(b).digest('hex');
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// ═════════════════════════════════════════════════════════════════════════════
// A notação, as folhas e a diferença
// ═════════════════════════════════════════════════════════════════════════════

describe('A8: folhas e caminhos', () => {
  const doc = {
    a: { b: [10, 20, { c: 'x' }], 'k/com.ponto': 1, vazio: [], objVazio: {} },
    codigo: { 'app/decisor/[projectId]/page.tsx': 'h1', 'lib/a.ts': 'h2' },
    quatro: [{ n: 1, blocos: ['p', 'q', 'r', 's', 't', 'u'] }, { n: 2, blocos: ['v'] }],
  };

  test('as folhas usam a notação das entradas antigas, e container vazio também é folha', () => {
    const f = P.folhas(doc);
    expect([...f.keys()]).toEqual([
      'a.b[0]', 'a.b[1]', 'a.b[2].c', 'a[k/com.ponto]', 'a.vazio', 'a.objVazio',
      'codigo[app/decisor/[projectId]/page.tsx]', 'codigo[lib/a.ts]',
      'quatro[0].n', 'quatro[0].blocos[0]', 'quatro[0].blocos[1]', 'quatro[0].blocos[2]', 'quatro[0].blocos[3]', 'quatro[0].blocos[4]', 'quatro[0].blocos[5]',
      'quatro[1].n', 'quatro[1].blocos[0]',
    ]);
    expect(f.get('a.vazio')).toBe('[]');
    expect(f.get('a.objVazio')).toBe('{}');
    expect(f.get('a.b[2].c')).toBe('"x"');
  });

  test('os colchetes de uma chave podem conter colchetes balanceados', () => {
    expect(P.interpretar('codigo[app/decisor/[projectId]/page.tsx]')).toEqual([{ t: 'nome', s: 'codigo' }, { t: 'col', s: 'app/decisor/[projectId]/page.tsx' }]);
    expect(P.interpretar('a[b')).toBeNull();
    expect(P.interpretar('a..b')).toBeNull();
    expect(P.interpretar('a.')).toBeNull();
  });

  test.each([
    ['folha exata', 'a.b[2].c', { existe: true, exato: true, container: false, folhas: ['a.b[2].c'] }],
    ['chave com colchetes aninhados', 'codigo[app/decisor/[projectId]/page.tsx]', { existe: true, exato: true, container: false, folhas: ['codigo[app/decisor/[projectId]/page.tsx]'] }],
    ['chave com ponto e barra', 'a[k/com.ponto]', { existe: true, exato: true, container: false, folhas: ['a[k/com.ponto]'] }],
    ['container vazio é folha', 'a.vazio', { existe: true, exato: true, container: false, folhas: ['a.vazio'] }],
    ['CONTAINER (genérico)', 'codigo', { existe: true, exato: false, container: true, folhas: ['codigo[app/decisor/[projectId]/page.tsx]', 'codigo[lib/a.ts]'] }],
    ['a RAIZ de um bloco (genérico)', 'quatro[0]', { existe: true, exato: false, container: true, folhas: ['quatro[0].n', 'quatro[0].blocos[0]', 'quatro[0].blocos[1]', 'quatro[0].blocos[2]', 'quatro[0].blocos[3]', 'quatro[0].blocos[4]', 'quatro[0].blocos[5]'] }],
    ['abreviação [] (antiga)', 'quatro[].n', { existe: true, exato: false, container: false, folhas: ['quatro[0].n', 'quatro[1].n'] }],
    ['faixa [1..3] (antiga)', 'quatro[0].blocos[1..3]', { existe: true, exato: false, container: false, folhas: ['quatro[0].blocos[1]', 'quatro[0].blocos[2]', 'quatro[0].blocos[3]'] }],
    ['NAO existe: chave', 'codigo[lib/nao-existe.ts]', { existe: false, exato: false, container: false }],
    ['NAO existe: índice', 'a.b[7]', { existe: false, exato: false, container: false }],
    ['NAO existe: faixa além do fim', 'quatro[1].blocos[0..2]', { existe: false, exato: false, container: false }],
    ['fora da notação canônica: [identificador]', 'a[b][2].c', { existe: true, exato: false, container: false }],
  ])('resolver: %s', (_n, caminho, esperado: any) => {
    const r = P.resolver(doc, caminho);
    expect(r.valido).toBe(true);
    for (const k of Object.keys(esperado)) expect([k, r[k]]).toEqual([k, esperado[k]]);
  });

  test('caminho não interpretável é inválido, e vazio também', () => {
    expect(P.resolver(doc, 'a[b').valido).toBe(false);
    expect(P.resolver(doc, '').valido).toBe(false);
  });

  test('diferencaDeFolhas: mudadas, novas e perdidas, e o que está sob o prefixo ignorado não conta', () => {
    const antes = { x: 1, y: [1, 2], z: { w: 'a' }, lista: [{ n: 1 }] };
    const depois = { x: 2, y: [1, 2, 3], z: {}, lista: [{ n: 1 }, { n: 2 }] };
    // `z` virou objeto vazio: o objeto vazio é uma folha NOVA em `z`, e `z.w` foi perdida
    expect(P.diferencaDeFolhas(antes, depois)).toEqual({ mudadas: ['x'], novas: ['y[2]', 'z', 'lista[1].n'], perdidas: ['z.w'] });
    expect(P.diferencaDeFolhas(antes, depois, ['lista'])).toEqual({ mudadas: ['x'], novas: ['y[2]', 'z'], perdidas: ['z.w'] });
  });

  test('canonico independe da ordem das chaves, e o resumo do histórico muda com qualquer byte de uma entrada', () => {
    expect(P.canonico({ b: 1, a: [2, { d: 3, c: 4 }] })).toBe(P.canonico({ a: [2, { c: 4, d: 3 }], b: 1 }));
    const lista = [{ ordem: 1, motivo: 'a' }, { ordem: 2, motivo: 'b' }, { ordem: 3, motivo: 'c' }];
    const base = P.resumoDoHistorico(lista, 2);
    expect(P.resumoDoHistorico(lista, 2)).toBe(base);
    expect(P.resumoDoHistorico([lista[0], { ordem: 2, motivo: 'b ' }, lista[2]], 2)).not.toBe(base);
    expect(P.resumoDoHistorico([lista[0], lista[1], { ordem: 3, motivo: 'OUTRA' }], 2)).toBe(base); // depois de 2, não conta
    expect(P.resumoDoHistorico(lista, 3)).not.toBe(base);
  });

  test('resumoDosCaminhos ignora as entradas de índice >= apartirDe, e só elas', () => {
    const v1 = { campo: 1, lista: [{ o: 1 }, { o: 2 }] };
    const v2 = { campo: 9, lista: [{ o: 1 }, { o: 2 }, { o: 3, extra: 'x' }] };
    expect(P.resumoDosCaminhos(v2, 'lista', 2)).toBe(P.resumoDosCaminhos(v1, 'lista', 2)); // o valor de `campo` não está no conjunto de CAMINHOS
    const perdeu = { lista: [{ o: 1 }, { o: 2 }] };
    expect(P.resumoDosCaminhos(perdeu, 'lista', 2)).not.toBe(P.resumoDosCaminhos(v1, 'lista', 2)); // `campo` sumiu
    const ganhou = { campo: 1, novo: 1, lista: [{ o: 1 }, { o: 2 }] };
    expect(P.resumoDosCaminhos(ganhou, 'lista', 2)).not.toBe(P.resumoDosCaminhos(v1, 'lista', 2)); // `novo` apareceu fora das entradas
    const entradaAlterada = { campo: 1, lista: [{ o: 1 }, { o: 2, e: 1 }] };
    expect(P.resumoDosCaminhos(entradaAlterada, 'lista', 2)).not.toBe(P.resumoDosCaminhos(v1, 'lista', 2)); // entrada ANTIGA ganhou caminho
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Lista e entrada: cada exigência tem caso que passa e contraexemplo que reprova
// ═════════════════════════════════════════════════════════════════════════════

/** Um hash de 40 hexadecimais, determinístico, para cada número. */
const H = (n: number) => crypto.createHash('sha1').update(`base-${n}`).digest('hex');
const ORIGINAL = 'f964049b3f6639b874111356d8f84b5463793a34';
const COMANDO = 'A12_GRAVAR=1 npx jest --runInBand lib/__tests__/a12-diagnostico.test.ts';
const AMBIENTE = { plataforma: 'linux', arch: 'x64', node: 'v22.22.2' };
const entradaAntiga = (ordem: number, extra: Record<string, unknown> = {}) => ({
  ordem, motivo: `regravacao antiga numero ${ordem}, com motivo suficientemente descritivo`, commitDaBase: H(ordem), comando: COMANDO, ambiente: AMBIENTE,
  artefato: 'docs/dados/a12-diagnostico/medicao.json', camposRegravados: ['campo1.valor'], camposPerdidos: 0, ...extra,
});

describe('A8: violacoesDaLista', () => {
  const ok = [entradaAntiga(1), entradaAntiga(2), entradaAntiga(3)];
  test('uma lista boa passa', () => expect(P.violacoesDaLista(ok, { commitDaBaseOriginal: ORIGINAL })).toEqual([]));
  test.each([
    ['sobrescreveu em vez de acumular (uma entrada só)', [entradaAntiga(1)], /mínimo é 2/],
    ['ordem não sequencial', [entradaAntiga(1), entradaAntiga(3)], /ordem 3, e a sequência exige 2/],
    ['base repetida', [entradaAntiga(1), entradaAntiga(2, { commitDaBase: H(1) })], /commitDaBase repetido/],
    ['base que não é hash', [entradaAntiga(1), entradaAntiga(2, { commitDaBase: 'abc' })], /40 hexadecimais/],
    ['base de regravação igual ao commitDaBase histórico', [entradaAntiga(1), entradaAntiga(2, { commitDaBase: ORIGINAL })], /igual ao commitDaBase histórico/],
  ])('%s reprova', (_n, lista: any, padrao) => {
    expect(P.violacoesDaLista(lista, { commitDaBaseOriginal: ORIGINAL }).join('\n')).toMatch(padrao);
  });
});

describe('A8: violacoesDaEntrada', () => {
  const medicao = { campo1: { valor: 'novo' }, campo2: 'texto', codigo: { 'src/a.ts': 'h' }, grupo: { a: 1, b: 2 } };
  const boa = () => ({
    ...entradaAntiga(4), camposRegravados: ['campo1.valor'], valorAnterior: { 'campo1.valor': 'velho' }, valorNovo: { 'campo1.valor': 'novo' },
  });
  const checa = (e: any, estrita = true) => P.violacoesDaEntrada(e, medicao, { comando: COMANDO, estrita });
  test('uma entrada boa passa, estrita ou não', () => {
    expect(checa(boa())).toEqual([]);
    expect(checa(boa(), false)).toEqual([]);
  });
  test.each([
    ['camposRegravados VAZIO', (e: any) => { e.camposRegravados = []; }, /ausente ou vazio/],
    ['camposRegravados ausente', (e: any) => { delete e.camposRegravados; }, /ausente ou vazio/],
    ['GENÉRICO: um container', (e: any) => { e.camposRegravados = ['grupo']; e.valorNovo = { grupo: {} }; e.valorAnterior = {}; }, /é um container, isto é, genérico/],
    ['GENÉRICO: a raiz de um bloco', (e: any) => { e.camposRegravados = ['codigo']; e.valorNovo = { codigo: {} }; }, /é um container, isto é, genérico/],
    ['caminho INEXISTENTE', (e: any) => { e.camposRegravados = ['campo1.nao-existe']; }, /NÃO existe no artefato/],
    ['caminho com abreviação (só as antigas podem)', (e: any) => { e.camposRegravados = ['grupo[]']; }, /usa abreviação|container/],
    ['caminho repetido', (e: any) => { e.camposRegravados = ['campo1.valor', 'campo1.valor']; }, /repete caminho/],
    ['caminho que não é texto', (e: any) => { e.camposRegravados = [7]; }, /não é um caminho/],
    ['camposPerdidos diferente de zero', (e: any) => { e.camposPerdidos = 1; }, /camposPerdidos é 1/],
    ['camposPerdidos ausente', (e: any) => { delete e.camposPerdidos; }, /camposPerdidos é undefined/],
    ['motivo curto', (e: any) => { e.motivo = 'regravei'; }, /motivo está ausente ou é curto/],
    ['comando errado', (e: any) => { e.comando = 'npx jest'; }, /o comando "npx jest" não é/],
    ['ambiente incompleto', (e: any) => { e.ambiente = { plataforma: 'linux' }; }, /ambiente não traz/],
    ['base que não é hash', (e: any) => { e.commitDaBase = 'HEAD'; }, /40 hexadecimais/],
  ])('%s reprova', (_n, mutar: (e: any) => void, padrao) => {
    const e = boa();
    mutar(e);
    expect(checa(e).join('\n')).toMatch(padrao);
  });
  test('valorNovo que não coincide com a medição, e valorAnterior igual ao novo, reprovam; sem os dois, a entrada nova reprova', () => {
    const a = boa(); a.valorNovo = { 'campo1.valor': 'outro' };
    expect(checa(a).join('\n')).toMatch(/valorNovo de campo1.valor não coincide com a medição/);
    const b = boa(); b.valorAnterior = { 'campo1.valor': 'novo' };
    expect(checa(b).join('\n')).toMatch(/valorAnterior de campo1.valor é igual ao valor novo/);
    const c = boa(); delete c.valorAnterior; delete c.valorNovo;
    expect(checa(c).join('\n')).toMatch(/valorAnterior e valorNovo são obrigatórios/);
    expect(checa(c, false)).toEqual([]); // as antigas não os têm
  });
  test('uma entrada ANTIGA (não estrita) aceita abreviação e container, mas não caminho inexistente', () => {
    const e = boa(); e.camposRegravados = ['grupo']; delete e.valorAnterior; delete e.valorNovo;
    expect(checa(e, false)).toEqual([]);
    e.camposRegravados = ['grupo.nao-existe'];
    expect(checa(e, false).join('\n')).toMatch(/NÃO existe/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// A RECUSA, contra um repositório git de verdade
// ═════════════════════════════════════════════════════════════════════════════

const ARTEFATO_DIAG = 'docs/dados/a12-diagnostico/medicao.json';
const ARTEFATO_RASTR = 'docs/dados/a12-rastreabilidade/medicao.json';
const COMANDO_DIAG = 'A12_GRAVAR=1 npx jest --runInBand lib/__tests__/a12-diagnostico.test.ts';
const COMANDO_RASTR = 'A12R_GRAVAR=1 npx jest --runInBand lib/__tests__/a12-rastreabilidade.test.ts';

const temporarios: string[] = [];
afterAll(() => { for (const d of temporarios) fs.rmSync(d, { recursive: true, force: true }); });

const git = (dir: string, ...args: string[]) =>
  execFileSync('git', ['-C', dir, '-c', 'user.email=a8@exemplo.invalido', '-c', 'user.name=A8', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/**
 * Um repositório temporário com o artefato SINTÉTICO no caminho e na forma de cada escritor, e um arquivo de
 * "código" commitado. `forma` diz onde fica a lista (`diag`: identificacao.procedenciaDasRegravacoes; `rastr`: no topo).
 */
function repo(forma: 'diag' | 'rastr') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'f07-a8-'));
  temporarios.push(dir);
  git(dir, 'init', '-q');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src/a.ts'), 'export const a = 1;\n');
  const comando = forma === 'diag' ? COMANDO_DIAG : COMANDO_RASTR;
  const artefato = forma === 'diag' ? ARTEFATO_DIAG : ARTEFATO_RASTR;
  const entrada = (ordem: number) => ({ ...entradaAntiga(ordem), comando, artefato });
  const lista = [entrada(1), entrada(2)];
  const codigo = { 'src/a.ts': sha(fs.readFileSync(path.join(dir, 'src/a.ts'))) };
  const base: any = forma === 'diag'
    ? { identificacao: { commitDaBase: ORIGINAL, procedenciaDasRegravacoes: lista, codigo }, campo1: { valor: 1 }, campo2: 'texto', grupo: { a: 1, b: 2 } }
    : { identificacao: { codigo }, procedenciaDasRegravacoes: lista, campo1: { valor: 1 }, campo2: 'texto', grupo: { a: 1, b: 2 } };
  fs.mkdirSync(path.dirname(path.join(dir, artefato)), { recursive: true });
  fs.writeFileSync(path.join(dir, artefato), JSON.stringify(base, null, 2) + '\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base sintetica');
  const head = git(dir, 'rev-parse', 'HEAD').trim();
  const caminhoDaLista = forma === 'diag' ? ['identificacao', 'procedenciaDasRegravacoes'] : ['procedenciaDasRegravacoes'];
  const poeLista = (obj: any, l: any[]) => { if (forma === 'diag') obj.identificacao.procedenciaDasRegravacoes = l; else obj.procedenciaDasRegravacoes = l; };
  const doObjeto = (obj: any): any[] => (forma === 'diag' ? obj.identificacao.procedenciaDasRegravacoes : obj.procedenciaDasRegravacoes);
  /** A regravação CORRETA: `campo1.valor` de 1 para 2, com a entrada que a descreve. */
  const novoCorreto = () => {
    const n = copia(base);
    n.campo1.valor = 2;
    doObjeto(n).push({
      ...entrada(3), commitDaBase: head, camposRegravados: ['campo1.valor'], valorAnterior: { 'campo1.valor': 1 }, valorNovo: { 'campo1.valor': 2 },
    });
    return n;
  };
  const args = (novo: any) => ({
    raiz: dir, artefato, novo, caminhoDaLista, comando,
    ...(forma === 'diag' ? { commitDaBaseOriginal: ORIGINAL } : {}), caminhoDoCodigo: ['identificacao', 'codigo'],
  });
  return { dir, base, head, artefato, comando, caminhoDaLista, poeLista, doObjeto, novoCorreto, args, entrada };
}

describe.each(['diag', 'rastr'] as const)('A8: a recusa, repositório sintético na forma de «%s»', forma => {
  const r = repo(forma);
  const recusa = (novo: any) => { try { P.exigirProcedenciaCorrespondente(r.args(novo)); return null; } catch (e: any) { return String(e.message); } };

  test('a regravação com a entrada correspondente é ACEITA, e a medição devolvida diz o que mudou', () => {
    const m = P.exigirProcedenciaCorrespondente(r.args(r.novoCorreto()));
    expect(m.head).toBe(r.head);
    expect(m.diferenca).toEqual({ mudadas: ['campo1.valor'], novas: [], perdidas: [] });
    expect(m.violacoes).toEqual([]);
    expect(m.entradaNova.ordem).toBe(3);
  });

  test.each([
    ['SEM entrada nova: os valores de hoje sob a lista de ontem (o defeito que a guarda existe para fechar)', (n: any) => { n.campo1.valor = 2; r.poeLista(n, r.doObjeto(n).slice(0, 2)); }, /tem 2 entrada\(s\), e a regravação exige 3/],
    ['entrada nova com camposRegravados VAZIO', (n: any) => { r.doObjeto(n)[2].camposRegravados = []; }, /camposRegravados está ausente ou vazio/],
    ['entrada GENÉRICA (cita o container)', (n: any) => { r.doObjeto(n)[2].camposRegravados = ['campo1']; r.doObjeto(n)[2].valorNovo = { campo1: {} }; r.doObjeto(n)[2].valorAnterior = {}; }, /container, isto é, genérico/],
    ['caminho INEXISTENTE', (n: any) => { r.doObjeto(n)[2].camposRegravados = ['campo1.nao-existe']; }, /NÃO existe no artefato/],
    ['declara MENOS do que mudou', (n: any) => { n.grupo.a = 5; }, /campos que MUDARAM e a entrada não declara: grupo\.a/],
    ['declara MAIS do que mudou', (n: any) => { const e = r.doObjeto(n)[2]; e.camposRegravados = ['campo1.valor', 'campo2']; e.valorAnterior['campo2'] = 'texto'; e.valorNovo['campo2'] = 'texto'; }, /declara e que NÃO mudaram: campo2/],
    ['campo PERDIDO', (n: any) => { delete n.campo2; }, /campos PERDIDOS em relação ao HEAD: campo2/],
    ['histórico ALTERADO (entrada antiga reescrita)', (n: any) => { r.doObjeto(n)[0].motivo = 'motivo reescrito depois, com texto suficientemente longo'; }, /foi ALTERADA em relação ao HEAD/],
    ['base que NÃO é o HEAD', (n: any) => { r.doObjeto(n)[2].commitDaBase = H(9); }, /o HEAD é /],
    ['base repetida de entrada anterior', (n: any) => { r.doObjeto(n)[2].commitDaBase = H(1); }, /(repete a da entrada de ordem 1|o HEAD é )/],
    ['ordem errada', (n: any) => { r.doObjeto(n)[2].ordem = 7; }, /ordem 7, e a sequência exige 3/],
    ['comando errado', (n: any) => { r.doObjeto(n)[2].comando = 'npx jest'; }, /o comando "npx jest" não é/],
    ['valorAnterior que não é o do HEAD', (n: any) => { r.doObjeto(n)[2].valorAnterior = { 'campo1.valor': 99 }; }, /valorAnterior de campo1\.valor é 99, e o HEAD tem 1/],
    ['valorNovo que não é o medido', (n: any) => { r.doObjeto(n)[2].valorNovo = { 'campo1.valor': 99 }; }, /valorNovo de campo1\.valor não coincide com a medição/],
    ['camposPerdidos declarado diferente de zero', (n: any) => { r.doObjeto(n)[2].camposPerdidos = 3; }, /camposPerdidos é 3/],
    ['código medido com alteração NÃO commitada', (n: any) => { n.identificacao.codigo['src/a.ts'] = sha('conteudo diferente do HEAD'); }, /alteração NÃO commitada/],
  ])('RECUSA: %s', (_n, mutar: (n: any) => void, padrao) => {
    const n = r.novoCorreto();
    mutar(n);
    const msg = recusa(n);
    expect(msg).not.toBeNull();
    expect(msg).toMatch(/^REGRAVACAO RECUSADA/);
    expect(msg).toMatch(padrao);
    expect(msg).toMatch(/Nada foi escrito\.$/);
  });

  test('a recusa nomeia TODAS as violações de uma vez, e o que foi medido', () => {
    const n = r.novoCorreto();
    delete n.campo2;
    r.doObjeto(n)[2].commitDaBase = H(9);
    r.doObjeto(n)[2].camposRegravados = [];
    const msg = recusa(n) as string;
    expect(msg).toMatch(/PERDIDOS/);
    expect(msg).toMatch(/o HEAD é /);
    expect(msg).toMatch(/camposRegravados está ausente ou vazio/);
    expect(msg).toMatch(/Medido contra o HEAD [0-9a-f]{40}: 1 campo\(s\) mudado\(s\) \(campo1\.valor\), 0 novo\(s\), 1 perdido\(s\)\./);
  });

  test('FALHA FECHADA no ambiente: sem repositório, ou sem o artefato no HEAD, a guarda lança (não passa em silêncio)', () => {
    const semGit = fs.mkdtempSync(path.join(os.tmpdir(), 'f07-a8-sem-git-'));
    temporarios.push(semGit);
    expect(() => P.exigirProcedenciaCorrespondente({ ...r.args(r.novoCorreto()), raiz: semGit })).toThrow(/REGRAVACAO RECUSADA: não consegui ler o HEAD/);
    expect(() => P.exigirProcedenciaCorrespondente({ ...r.args(r.novoCorreto()), artefato: 'docs/dados/outro/medicao.json' })).toThrow(/não consegui ler docs\/dados\/outro\/medicao\.json no HEAD/);
  });

  test('a guarda NÃO escreve: o artefato em disco é o mesmo antes e depois, aceita ou recusada', () => {
    const antes = fs.readFileSync(path.join(r.dir, r.artefato));
    recusa(r.novoCorreto());
    const n = r.novoCorreto(); delete n.campo2; recusa(n);
    expect(fs.readFileSync(path.join(r.dir, r.artefato)).equals(antes)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Os BLOCOS DOS ESCRITORES, lidos do fonte e executados
// ═════════════════════════════════════════════════════════════════════════════

/** O bloco `if (GRAVAR) { … }` de um dos testes `a12-*`, do fonte. */
function blocoDoEscritor(rel: string): string {
  const fonte = ler(rel);
  const marca = '\n  if (GRAVAR) {\n';
  expect(ocorrencias(fonte, marca)).toBe(1);
  const i = fonte.indexOf(marca) + 1;
  const fim = fonte.indexOf('\n  }\n', i);
  expect(fim).toBeGreaterThan(i);
  return fonte.slice(i, fim + '\n  }'.length);
}

function compilarEscritor(bloco: string): (...args: any[]) => void {
  const js: string = ts.transpileModule(
    `(function (GRAVAR, fs, path, RAIZ, ARTEFATO, M, medicao, exigirProcedenciaCorrespondente) {\n${bloco}\n})`,
    { compilerOptions: { target: ts.ScriptTarget.ES2020 } }
  ).outputText;
  return vm.runInNewContext(js, {});
}

describe.each([
  ['a12-diagnostico', 'lib/__tests__/a12-diagnostico.test.ts', 'diag', 'M'],
  ['a12-rastreabilidade', 'lib/__tests__/a12-rastreabilidade.test.ts', 'rastr', 'medicao'],
] as const)('A8: o bloco do escritor de %s, executado', (_nome, rel, forma, nomeDoObjeto) => {
  const bloco = blocoDoEscritor(rel);
  const escritor = compilarEscritor(bloco);
  const executar = (r: ReturnType<typeof repo>, novo: any, gravar: boolean, guarda: any = P.exigirProcedenciaCorrespondente) => {
    const alvo = path.join(r.dir, r.artefato);
    escritor(gravar, fs, path, r.dir, alvo, nomeDoObjeto === 'M' ? novo : undefined, nomeDoObjeto === 'medicao' ? novo : undefined, guarda);
    return alvo;
  };

  test('o bloco lido tem a forma esperada: a guarda ANTES de escrever, uma vez, e a escrita de sempre', () => {
    expect(ocorrencias(bloco, 'exigirProcedenciaCorrespondente(')).toBe(1);
    expect(bloco.indexOf('exigirProcedenciaCorrespondente(')).toBeLessThan(bloco.indexOf('fs.writeFileSync('));
    expect(bloco.indexOf('exigirProcedenciaCorrespondente(')).toBeLessThan(bloco.indexOf('fs.mkdirSync('));
    expect(ocorrencias(bloco, 'fs.writeFileSync(')).toBe(1);
  });

  test('COM entrada correspondente o bloco ESCREVE o artefato (JSON de 2 espaços e quebra de linha final, como antes)', () => {
    const r = repo(forma);
    const novo = r.novoCorreto();
    const alvo = executar(r, novo, true);
    expect(fs.readFileSync(alvo, 'utf8')).toBe(JSON.stringify(novo, null, 2) + '\n');
  });

  test('SEM entrada correspondente o bloco LANÇA e NÃO escreve nada', () => {
    const r = repo(forma);
    const alvo = path.join(r.dir, r.artefato);
    const antes = fs.readFileSync(alvo);
    const novo = r.novoCorreto();
    r.poeLista(novo, r.doObjeto(novo).slice(0, 2)); // os valores de hoje, a lista de ontem
    expect(() => executar(r, novo, true)).toThrow(/REGRAVACAO RECUSADA/);
    expect(fs.readFileSync(alvo).equals(antes)).toBe(true);
  });

  test('SEM a variável de ambiente (GRAVAR falso) o bloco não faz NADA: nem chama a guarda, nem escreve', () => {
    const r = repo(forma);
    const alvo = path.join(r.dir, r.artefato);
    const antes = fs.readFileSync(alvo);
    let chamadas = 0;
    const novo = r.novoCorreto();
    r.poeLista(novo, r.doObjeto(novo).slice(0, 2));
    executar(r, novo, false, () => { chamadas++; });
    expect(chamadas).toBe(0);
    expect(fs.readFileSync(alvo).equals(antes)).toBe(true);
  });

  test('o bloco PASSA à guarda o caminho, a lista, o comando e o código do escritor (e não outros)', () => {
    const r = repo(forma);
    let recebido: any;
    executar(r, r.novoCorreto(), true, (a: any) => { recebido = a; });
    expect(recebido.raiz).toBe(r.dir);
    expect(recebido.artefato).toBe(r.artefato);
    expect(recebido.caminhoDaLista).toEqual(r.caminhoDaLista);
    expect(recebido.comando).toBe(r.comando);
    expect(recebido.caminhoDoCodigo).toEqual(['identificacao', 'codigo']);
    if (forma === 'diag') expect(recebido.commitDaBaseOriginal).toBe(ORIGINAL);
  });
});

describe('A8: a ligação dos escritores, por LEITURA', () => {
  test.each(['lib/__tests__/a12-diagnostico.test.ts', 'lib/__tests__/a12-rastreabilidade.test.ts'])('%s importa a guarda UMA vez, e só o bloco do escritor a chama', rel => {
    const f = ler(rel);
    expect(ocorrencias(f, "require('./helpers/procedencia-da-regravacao')")).toBe(1);
    expect(ocorrencias(f, 'exigirProcedenciaCorrespondente(')).toBe(1);
    const iGravar = f.indexOf('\n  if (GRAVAR) {\n');
    expect(f.indexOf('exigirProcedenciaCorrespondente(')).toBeGreaterThan(iGravar);
  });
});
