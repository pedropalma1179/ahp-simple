/**
 * lib/__tests__/f07-a3-identificacao.test.ts
 *
 * F07, entrega A3: a EXECUÇÃO identificada em tudo o que sai da tela (CSV, LaTeX, planilha, imagem do
 * gráfico, texto copiado do Parecer, faixa da tela e relatórios).
 *
 * O que se exercita de verdade: as funções puras de `lib/identificacao-da-execucao.ts` (valores,
 * ausência, formatos), a faixa renderizada (`renderToStaticMarkup`) e o manipulador REAL de cópia do
 * `ParecerAISection` (chamado diretamente, com `navigator.clipboard.writeText` simulado).
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** As exportações e o envoltório do gráfico moram DENTRO do
 * componente da página (não exportados), e nenhuma tela é montada por teste algum: a presença da
 * identificação em cada saída é conferida por LEITURA do fonte, com localização e ordem, e a leitura
 * não prova o conteúdo do arquivo que o navegador baixa. Os formatos, por sua vez, são exercitados
 * nas funções que a página chama.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const id = require('@/lib/identificacao-da-execucao');
const { ENGINE_VERSION } = require('@/lib/engine-version');
const FaixaDeIdentificacao = require('@/components/IdentificacaoDaExecucao').default;
const ParecerAISection = require('@/components/ParecerAISection').default;
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;
const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const PAGINA = 'app/decisor/resultados/[projectId]/page.tsx';
const EXPORT_REPORTS = 'app/decisor/resultados/[projectId]/components/ExportReports.tsx';

const COMPLETO = {
  executionId: 'exec-0001-aaaa',
  engineVersion: 'motor-de-teste-9.9',
  codeRevision: 'abc123def4567890',
  calculatedAt: '2026-07-01T10:00:00.000Z',
  projectUpdatedAt: '2026-06-30T09:00:00.000Z',
  responseCount: 12,
  bocrWeights: [0.25, 0.25, 0.25, 0.25],
};

// ===========================================================================================
// A origem dos valores: a execução lida, nunca a constante do código
// ===========================================================================================

describe('A3.1: os valores vêm da execução LIDA', () => {
  test('o documento completo é identificado campo a campo, sem tocar nos outros', () => {
    expect(id.identificarExecucao(COMPLETO)).toEqual({
      executionId: 'exec-0001-aaaa',
      engineVersion: 'motor-de-teste-9.9',
      codeRevision: 'abc123def4567890',
      calculatedAt: '2026-07-01T10:00:00.000Z',
      projectUpdatedAt: '2026-06-30T09:00:00.000Z',
    });
  });

  test('a versão do motor mostrada é a da EXECUÇÃO, e não a constante do código: valores diferentes ficam diferentes', () => {
    expect(COMPLETO.engineVersion).not.toBe(ENGINE_VERSION); // as duas existem e DIFEREM
    const texto = [id.legendaDeImagem(id.identificarExecucao(COMPLETO)), id.rodapeDeCopia(id.identificarExecucao(COMPLETO)), id.comentarioLatex(id.identificarExecucao(COMPLETO)), id.linhasCsv(id.identificarExecucao(COMPLETO))].join('\n');
    expect(texto).toContain('motor-de-teste-9.9');
    expect(texto).not.toContain(ENGINE_VERSION);
  });

  test('execução SEM engineVersion: sai "ausente", mesmo existindo a constante no código (nunca preenchido)', () => {
    const semMotor = { ...COMPLETO } as any;
    delete semMotor.engineVersion;
    const i = id.identificarExecucao(semMotor);
    expect(i.engineVersion).toBeNull();
    const texto = id.rodapeDeCopia(i) + id.legendaDeImagem(i) + id.comentarioLatex(i) + id.linhasCsv(i);
    expect(texto).toContain('ausente');
    expect(texto).not.toContain(ENGINE_VERSION);
  });

  test.each([
    ['documento nulo', null],
    ['documento indefinido', undefined],
    ['documento vazio', {}],
    ['documento anterior a F07 (só executionId)', { executionId: 'so-o-id-1234', responseCount: 12 }],
    ['campos vazios', { executionId: '', engineVersion: '', codeRevision: '', calculatedAt: '', projectUpdatedAt: '' }],
    ['campos que não são texto', { executionId: 12345, engineVersion: 5, codeRevision: false, calculatedAt: {}, projectUpdatedAt: [] }],
  ])('%s: o que falta é null, e nada é inventado', (_nome, doc) => {
    const i = id.identificarExecucao(doc as any);
    const esperadoDoId = doc && typeof (doc as any).executionId === 'string' && (doc as any).executionId !== '' ? (doc as any).executionId : null;
    expect(i).toEqual({ executionId: esperadoDoId, engineVersion: null, codeRevision: null, calculatedAt: null, projectUpdatedAt: null });
    for (const [, valor] of id.linhasDeIdentificacao(i).slice(1)) expect(valor).toBe('ausente');
  });

  test('NENHUM arquivo que apresenta a identificação lê a constante de versão do motor do código', () => {
    for (const arquivo of [
      'lib/identificacao-da-execucao.ts',
      'components/IdentificacaoDaExecucao.tsx',
      'components/PainelDaReferencia.tsx',
      'components/ReferenciaDoProjeto.tsx',
      'components/ParecerAISection.tsx',
      'lib/referencia-do-projeto.ts',
      'lib/referencia-leitura.ts',
      PAGINA,
      EXPORT_REPORTS,
    ]) {
      const codigo = semComentarios(ler(arquivo));
      expect([arquivo, /ENGINE_VERSION|engine-version/.test(codigo)]).toEqual([arquivo, false]);
    }
  });
});

// ===========================================================================================
// Os formatos
// ===========================================================================================

describe('A3.2: os formatos de cada saída', () => {
  const completo = id.identificarExecucao(COMPLETO);
  const vazio = id.identificarExecucao(null);

  test('as cinco linhas, na mesma ordem e com os mesmos rótulos, em todas as saídas', () => {
    const linhas = id.linhasDeIdentificacao(completo);
    expect(linhas.map(([r]: [string, string]) => r)).toEqual([
      'Execução',
      'Motor de cálculo (gravado na execução)',
      'Código implantado (gravado na execução)',
      'Calculada em',
      'Marcador de atualização do projeto na execução',
    ]);
    expect(linhas.map(([, v]: [string, string]) => v)).toEqual(['exec-0001-aaaa', 'motor-de-teste-9.9', 'abc123def4567890', '2026-07-01T10:00:00.000Z', '2026-06-30T09:00:00.000Z']);
    // sem identificação, as MESMAS cinco linhas, com "ausente" em todas
    const sem = id.linhasDeIdentificacao(vazio);
    expect(sem.map(([r]: [string, string]) => r)).toEqual(linhas.map(([r]: [string, string]) => r));
    expect(sem.every(([, v]: [string, string]) => v === 'ausente')).toBe(true);
    // `null` e `undefined` se comportam como "sem identificação"
    expect(id.linhasDeIdentificacao(null)).toEqual(sem);
    expect(id.linhasDeIdentificacao(undefined)).toEqual(sem);
  });

  test('LaTeX: só linhas de comentário (`% `), cada uma com LF, e a nota do rótulo de software', () => {
    const t = id.comentarioLatex(completo);
    const linhas = t.split('\n');
    expect(linhas.pop()).toBe(''); // termina em LF
    expect(linhas).toHaveLength(6);
    expect(linhas.every((l: string) => l.startsWith('% '))).toBe(true);
    expect(linhas[0]).toBe('% Execução: exec-0001-aaaa');
    expect(linhas[5]).toBe(`% ${id.NOTA_DO_ROTULO_DE_SOFTWARE}`);
    // um valor com quebra de linha não escapa do comentário
    const perigoso = id.comentarioLatex({ ...completo, codeRevision: 'a\n\\input{x}' });
    expect(perigoso.split('\n').filter((l: string) => l !== '').every((l: string) => l.startsWith('% '))).toBe(true);
  });

  test('CSV: "Rótulo:,valor" por linha, com aspas quando o valor tem vírgula, aspas ou quebra', () => {
    const t = id.linhasCsv(completo);
    const linhas = t.split('\n');
    expect(linhas.pop()).toBe('');
    expect(linhas).toHaveLength(6);
    expect(linhas[0]).toBe('Execução:,exec-0001-aaaa');
    expect(linhas[2]).toBe('Código implantado (gravado na execução):,abc123def4567890');
    expect(linhas[5].startsWith('Nota:,"')).toBe(true); // a nota tem vírgula e ponto e vírgula
    const aspas = id.linhasCsv({ ...completo, engineVersion: 'v1,2 "beta"' });
    expect(aspas).toContain('Motor de cálculo (gravado na execução):,"v1,2 ""beta"""');
    // ausente
    expect(id.linhasCsv(vazio).split('\n')[1]).toBe('Motor de cálculo (gravado na execução):,ausente');
  });

  test('planilha: pares [rótulo + ":", valor] e a nota; todas as células são texto', () => {
    const l = id.linhasXlsx(completo);
    expect(l).toHaveLength(6);
    expect(l[0]).toEqual(['Execução:', 'exec-0001-aaaa']);
    expect(l[5]).toEqual(['Nota:', id.NOTA_DO_ROTULO_DE_SOFTWARE]);
    expect(l.flat().every((c: unknown) => typeof c === 'string')).toBe(true);
    expect(id.linhasXlsx(vazio)[1]).toEqual(['Motor de cálculo (gravado na execução):', 'ausente']);
  });

  test('legenda da imagem: uma linha com execução, motor, código e instante', () => {
    expect(id.legendaDeImagem(completo)).toBe('Execução exec-0001-aaaa · motor motor-de-teste-9.9 · código abc123def4567890 · calculada em 2026-07-01T10:00:00.000Z');
    expect(id.legendaDeImagem(vazio)).toBe('Execução ausente · motor ausente · código ausente · calculada em ausente');
    expect(id.legendaDeImagem(null)).toBe(id.legendaDeImagem(vazio));
  });

  test('rodapé da cópia: texto exato, com e sem identificação', () => {
    expect(id.rodapeDeCopia(completo)).toBe(
      '\n\n---\n\n[Informação do sistema — não integra o texto gerado do parecer] Execução analisada: exec-0001-aaaa; motor de cálculo: motor-de-teste-9.9; código implantado: abc123def4567890; calculada em: 2026-07-01T10:00:00.000Z.\n'
    );
    expect(id.rodapeDeCopia(undefined)).toBe(
      '\n\n---\n\n[Informação do sistema — não integra o texto gerado do parecer] Execução analisada: ausente; motor de cálculo: ausente; código implantado: ausente; calculada em: ausente.\n'
    );
  });

  test('JSON: as cinco chaves SEMPRE presentes, null quando ausente (e não omitidas)', () => {
    const o = id.objetoJson(vazio);
    expect(Object.keys(o).sort()).toEqual(['calculatedAt', 'codeRevision', 'engineVersion', 'executionId', 'observacao', 'projectUpdatedAt']);
    expect([o.executionId, o.engineVersion, o.codeRevision, o.calculatedAt, o.projectUpdatedAt]).toEqual([null, null, null, null, null]);
    expect(id.objetoJson(completo).engineVersion).toBe('motor-de-teste-9.9');
    expect(o.observacao).toMatch(/null significa ausente/);
  });
});

// ===========================================================================================
// A faixa da tela
// ===========================================================================================

describe('A3.3: a faixa da tela', () => {
  test('mostra os cinco campos, e marca os ausentes', () => {
    const html = renderToStaticMarkup(React.createElement(FaixaDeIdentificacao, { identificacao: id.identificarExecucao({ ...COMPLETO, codeRevision: undefined }) }));
    expect(html).toContain('data-identificacao="execucao"');
    expect(html).toContain('exec-0001-aaaa');
    expect(html).toContain('motor-de-teste-9.9');
    expect((html.match(/data-ausente="sim"/g) ?? []).length).toBe(1);
    expect((html.match(/data-ausente="nao"/g) ?? []).length).toBe(4);
    expect(html).toContain('Código implantado (gravado na execução)');
  });

  test('sem identificação nenhuma: os cinco campos aparecem como ausente', () => {
    const html = renderToStaticMarkup(React.createElement(FaixaDeIdentificacao, { identificacao: null }));
    expect((html.match(/data-ausente="sim"/g) ?? []).length).toBe(5);
    expect((html.match(/>ausente</g) ?? []).length).toBe(5);
  });
});

// ===========================================================================================
// O texto copiado do Parecer (manipulador REAL)
// ===========================================================================================

describe('A3.4: o texto copiado do Parecer termina com o rodapé da execução', () => {
  type No = any;
  const filhos = (n: No): No[] => {
    const c = n?.props?.children;
    return c === undefined || c === null ? [] : Array.isArray(c) ? (c as any[]).flat(Infinity) : [c];
  };
  function achar(n: No, pred: (x: No) => boolean, acc: No[] = []): No[] {
    if (n && typeof n === 'object' && !Array.isArray(n)) {
      if (pred(n)) acc.push(n);
      for (const f of filhos(n)) achar(f, pred, acc);
    } else if (Array.isArray(n)) {
      for (const f of (n as any[]).flat(Infinity)) achar(f, pred, acc);
    }
    return acc;
  }

  async function copiar(aiReview: any, execucaoAnalisada?: unknown): Promise<string[]> {
    const espiaoEstado = jest.spyOn(React, 'useState').mockReturnValue([false, jest.fn()] as any);
    let arvore: No;
    try {
      arvore = (ParecerAISection as any)({ aiReview, loading: false, onExecute: () => undefined, ...(execucaoAnalisada === undefined ? {} : { execucaoAnalisada }) });
    } finally {
      espiaoEstado.mockRestore();
    }
    const botoes = achar(arvore, (n: No) => n.type === 'button' && n.props?.title === 'Copiar parecer em markdown');
    expect(botoes).toHaveLength(1);
    const chamadas: string[] = [];
    const antes = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async (t: string) => { chamadas.push(t); } } }, configurable: true, writable: true });
    const espiaoTimeout = jest.spyOn(globalThis, 'setTimeout').mockImplementation(((_f: any) => 0 as any) as any);
    try {
      await botoes[0].props.onClick();
    } finally {
      espiaoTimeout.mockRestore();
      if (antes) Object.defineProperty(globalThis, 'navigator', antes); else delete (globalThis as any).navigator;
    }
    return chamadas;
  }

  const PARECER = '## Parecer de ensaio\n\nTexto do parecer, com acentuação: ação, raciocínio.\n';
  const comParecer = (estadoDoVinculo: string | null) => ({ nota: 'A', veredicto: 'ACEITO', review: PARECER, estadoDoVinculo, validation: undefined });
  const PREFIXO = '[Informação do sistema — não integra o texto gerado do parecer] Vínculo com a execução do cálculo ausente nesta requisição. A relação entre os respondentes apresentados e os incluídos no cálculo não foi comparada nesta requisição.\n\n---\n\n';

  test('com identificação: parecer + rodapé com os valores da execução; sem prefixo fora da classe A', async () => {
    const c = await copiar(comParecer('vinculado'), id.identificarExecucao(COMPLETO));
    expect(c).toEqual([PARECER + id.rodapeDeCopia(id.identificarExecucao(COMPLETO))]);
    expect(c[0]).toContain('exec-0001-aaaa');
    expect(c[0].startsWith(PARECER)).toBe(true); // o parecer segue INTEIRO e na mesma posição
  });

  test('na classe A do vínculo: PREFIXO, depois o parecer inteiro, depois o rodapé (o rodapé não toma o lugar do prefixo)', async () => {
    const i = id.identificarExecucao(COMPLETO);
    for (const estado of ['ausente_no_payload', 'nulo_explicito']) {
      const c = await copiar(comParecer(estado), i);
      expect(c).toEqual([PREFIXO + PARECER + id.rodapeDeCopia(i)]);
      expect(c[0].indexOf(PREFIXO)).toBe(0);
      expect(c[0].indexOf(PARECER)).toBe(PREFIXO.length);
      expect(c[0].indexOf('Execução analisada')).toBeGreaterThan(c[0].indexOf(PARECER) + PARECER.length - 1);
    }
  });

  test('SEM identificação (prop ausente ou null): o rodapé EXISTE e diz "ausente" em cada campo, e nunca é omitido', async () => {
    for (const prop of [undefined, null]) {
      const c = await copiar(comParecer(null), prop as any);
      expect(c).toEqual([PARECER + id.rodapeDeCopia(null)]);
      expect(c[0]).toContain('Execução analisada: ausente; motor de cálculo: ausente; código implantado: ausente; calculada em: ausente.');
    }
  });

  test('identificação PARCIAL: só o que falta sai "ausente"', async () => {
    const c = await copiar(comParecer(null), id.identificarExecucao({ executionId: 'so-o-id-1234' }));
    expect(c[0]).toContain('Execução analisada: so-o-id-1234; motor de cálculo: ausente; código implantado: ausente; calculada em: ausente.');
  });

  test('sem parecer não há cópia (o retorno antecipado segue valendo)', async () => {
    const espiaoEstado = jest.spyOn(React, 'useState').mockReturnValue([false, jest.fn()] as any);
    let arvore: No;
    try {
      arvore = (ParecerAISection as any)({ aiReview: { nota: 'A', review: '' }, loading: false, onExecute: () => undefined, execucaoAnalisada: id.identificarExecucao(COMPLETO) });
    } finally {
      espiaoEstado.mockRestore();
    }
    const botoes = achar(arvore, (n: No) => n.type === 'button' && n.props?.title === 'Copiar parecer em markdown');
    expect(botoes).toHaveLength(0);
  });
});

// ===========================================================================================
// As saídas da página, por LEITURA
// ===========================================================================================

describe('A3.5: onde a identificação entra em cada saída da página, por LEITURA (nenhuma tela é executada por teste algum)', () => {
  const pagina = ler(PAGINA);

  test('o literal "AHP-BOCR Decision Support System v5.0" tem QUATRO ocorrências, na ordem LaTeX, CSV, planilha, planilha, cada uma seguida da sua identificação', () => {
    const LITERAL = 'AHP-BOCR Decision Support System v5.0';
    expect(ocorrencias(pagina, LITERAL)).toBe(4);
    const indices: number[] = [];
    for (let i = pagina.indexOf(LITERAL); i >= 0; i = pagina.indexOf(LITERAL, i + 1)) indices.push(i);
    const esperado = ['comentarioLatex(idDaExecucao)', 'linhasCsv(idDaExecucao)', 'linhasXlsx(idDaExecucao)', 'linhasXlsx(idDaExecucao)'];
    indices.forEach((i, n) => {
      const janela = pagina.slice(i, i + 400);
      expect([n, janela.includes(esperado[n])]).toEqual([n, true]);
    });
    // e cada literal está dentro da função certa
    const inicioCsv = pagina.indexOf('const exportCSV = () => {');
    const inicioLatex = pagina.indexOf('const exportLatex = () => {');
    const inicioXlsx = pagina.indexOf('const exportXLSX = () => {');
    expect([inicioLatex, inicioCsv, inicioXlsx].every(i => i > 0)).toBe(true);
    expect(indices[0]).toBeGreaterThan(inicioLatex);
    expect(indices[0]).toBeLessThan(inicioCsv);
    expect(indices[1]).toBeGreaterThan(inicioCsv);
    expect(indices[1]).toBeLessThan(inicioXlsx);
    expect(indices[2]).toBeGreaterThan(inicioXlsx);
    expect(indices[3]).toBeGreaterThan(indices[2]);
  });

  test('o rótulo de INTERFACE "Sistema AHP-BOCR v5.0" não foi tocado', () => {
    expect(ocorrencias(pagina, '<p>Sistema AHP-BOCR v5.0</p>')).toBe(1);
  });

  test('as três exportações leem a identificação do documento EXIBIDO, não de outra fonte', () => {
    expect(ocorrencias(pagina, 'const idDaExecucao = identificarExecucao(calculation as any);')).toBe(3);
    for (const funcao of ['const exportLatex = () => {', 'const exportCSV = () => {', 'const exportXLSX = () => {']) {
      const i = pagina.indexOf(funcao);
      expect(pagina.slice(i, i + 500)).toContain('identificarExecucao(calculation as any)');
    }
  });

  test('a imagem do gráfico: legenda DENTRO do elemento capturado, ligada antes da captura e desligada depois', () => {
    const inicio = pagina.indexOf('function ChartDownloadWrapper(');
    const fim = pagina.indexOf('// ============================================================', inicio + 10);
    const wrapper = pagina.slice(inicio, fim > 0 ? fim : inicio + 6000);
    expect(ocorrencias(wrapper, 'useContext(ContextoDaIdentificacao)')).toBe(1);
    // a legenda está dentro do `div` que recebe `ref={chartRef}`, que é o que a biblioteca fotografa
    const abre = wrapper.indexOf('<div ref={chartRef}');
    const fecha = wrapper.indexOf('</div>', wrapper.indexOf('{children}', abre));
    const dentro = wrapper.slice(abre, fecha);
    expect(dentro).toContain('legendaDeImagem(identificacao)');
    expect(dentro).toContain('{comLegenda && (');
    // ordem no manipulador: liga, espera pintar, captura (png e jpeg), desliga
    const ligar = wrapper.indexOf('setComLegenda(true)');
    const esperar = wrapper.indexOf('requestAnimationFrame');
    const capturaJpeg = wrapper.indexOf('await toJpeg(');
    const capturaPng = wrapper.indexOf('await toPng(');
    const desligar = wrapper.indexOf('setComLegenda(false)');
    expect(ligar).toBeGreaterThan(0);
    expect(esperar).toBeGreaterThan(ligar);
    expect(capturaJpeg).toBeGreaterThan(esperar);
    expect(capturaPng).toBeGreaterThan(esperar);
    expect(desligar).toBeGreaterThan(Math.max(capturaJpeg, capturaPng));
  });

  test('a tela: faixa e provedor do contexto alimentados pelo mesmo documento exibido (carga, escolha na lista e recálculo passam por `calculation`)', () => {
    expect(ocorrencias(pagina, 'const identificacaoExibida = identificarExecucao(calculation as any);')).toBe(1);
    expect(ocorrencias(pagina, '<FaixaDeIdentificacao identificacao={identificacaoExibida} />')).toBe(1);
    expect(ocorrencias(pagina, '<ContextoDaIdentificacao.Provider value={identificacaoExibida}>')).toBe(1);
    expect(ocorrencias(pagina, '</ContextoDaIdentificacao.Provider>')).toBe(1);
    // os três caminhos que trocam o documento exibido chamam `setCalculation` (a faixa segue o estado)
    expect(ocorrencias(pagina, 'setCalculation(calcData);')).toBe(1); // carga
    expect(ocorrencias(pagina, 'setCalculation(data.calculation);')).toBe(1); // resultado do recálculo
    expect(ocorrencias(pagina, 'setCalculation(documento as CalculationResult);')).toBe(1); // escolha na lista
  });

  test('o Parecer: a execução é capturada ao PEDIR o parecer, vai ao componente como propriedade, e NÃO entra no que o modelo recebe', () => {
    const i = pagina.indexOf('const runAiReview = async () => {');
    const fetchModelo = pagina.indexOf("const response = await fetch('/api/ai-reviewer', {", i);
    const captura = pagina.indexOf('setExecucaoDoParecer(identificarExecucao(calculation as any));', i);
    expect(captura).toBeGreaterThan(i);
    expect(captura).toBeLessThan(fetchModelo);
    expect(ocorrencias(pagina, 'execucaoAnalisada={execucaoDoParecer}')).toBe(1);
    // a região que monta e envia o payload não cita nenhum campo de identificação da execução
    const regiao = pagina.slice(i, fetchModelo);
    for (const campo of ['engineVersion', 'codeRevision', 'projectUpdatedAt', 'execucaoDoParecer']) expect([campo, regiao.includes(campo)]).toEqual([campo, false]);
    // e o objeto de `setAiReview` (lido e executado por outros testes) não ganhou campo
    const corpoDoSet = pagina.slice(pagina.indexOf('setAiReview({\n          nota: data.nota'), pagina.indexOf('} else {', pagina.indexOf('setAiReview({\n          nota: data.nota')));
    expect(corpoDoSet).not.toMatch(/execuc|identific/i);
  });

  test('ExportReports: as QUATRO saídas levam a identificação (e o componente NÃO é importado por nenhum arquivo)', () => {
    const f = ler(EXPORT_REPORTS);
    for (const funcao of ['function exportExcelComplete()', 'function exportExcelByRespondent()', 'function exportCSV_BOCR()', 'function exportJSON()']) {
      const i = f.indexOf(funcao);
      expect([funcao, i > 0]).toEqual([funcao, true]);
      const proxima = f.indexOf('\n  function ', i + 10);
      const corpo = f.slice(i, proxima > 0 ? proxima : f.indexOf('const exports = ['));
      expect([funcao, corpo.includes('identificarExecucao(calculation)')]).toEqual([funcao, true]);
    }
    expect(ocorrencias(f, 'identificarExecucao(calculation)')).toBe(4);
    // MEDIDA do estado atual (não promessa): nenhum arquivo importa o componente. Se alguém passar a importá-lo, este teste avisa
    // que as quatro saídas dele deixam de ser inalcançáveis, e que ele lê campos (`bocr_weights`, `sub_weights`, `final_scores_normalized`)
    // que o documento de execução NÃO tem.
    const importadores: string[] = [];
    const varrer = (dir: string) => {
      for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (e.isDirectory()) {
          if (!['node_modules', '.next', '__tests__'].includes(e.name)) varrer(rel);
        } else if (/\.(ts|tsx)$/.test(e.name) && rel !== EXPORT_REPORTS && /ExportReports/.test(semComentarios(ler(rel)))) {
          importadores.push(rel);
        }
      }
    };
    for (const d of ['app', 'lib', 'components']) varrer(d);
    expect(importadores).toEqual([]);
    expect(f).toMatch(/calculation\?\.bocr_weights/);
    const documentoReal = ler('app/api/calculate/route.ts');
    expect(documentoReal).not.toMatch(/\bbocr_weights\b/);
  });
});
