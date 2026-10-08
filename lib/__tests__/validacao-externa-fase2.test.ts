/**
 * Validação externa, Fase 2: testes CONTROLADOS dos nove estados (P1 a P9).
 *
 * Especificação:  docs/validacao-externa-fase2-especificacao.md (e7411ac)
 * Predição:       docs/validacao-externa-fase2-predicao.md (3f6c4b9), o critério contra o qual isto é conferido.
 *
 * ⚠ O QUE ESTES TESTES SÃO. Entradas FABRICADAS, sem rede, sem Firestore, sem serviço externo, sem dado real,
 * sobre os módulos puros de `lib/validacao-externa/` e sobre a RENDERIZAÇÃO NO SERVIDOR do painel de resultado
 * (`renderToStaticMarkup` de `PainelDeResultado`, o mesmo recurso que outros testes do repositório já usam).
 * Verificam a CLASSIFICAÇÃO do estado e os DADOS e o HTML de apresentação que ele produz.
 *
 * ⚠ O QUE ESTES TESTES NÃO SÃO. Não são a aplicação em execução: não há navegador, clique, `fetch` real nem
 * efeito (`useState`/`useEffect` não rodam). A fiação do botão ao estado do componente
 * (`runValidation` -> `setApresentacao`) permanece CONFERÊNCIA POR LEITURA. A orquestração (preparar, chamar,
 * ler a falha, classificar) é testada por `executarValidacao`, com o `fetch` INJETADO e SIMULADO.
 * Alcançar cada estado no serviço real, e retorno malformado real do serviço, são tarefa própria.
 *
 * ⚠ Nenhum teste afirma igualdade numérica entre os máximos do resumo e os das entradas: a regra não existe.
 */

import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import ExternalValidation, { PainelDeResultado } from '@/components/ExternalValidation';
import {
  IDENTIDADES_ESPERADAS,
  MERITS,
  SUBCRITERIA_PER_MERIT,
  TOTAL_DE_IDENTIDADES,
} from '@/lib/validacao-externa/conjunto-esperado';
import {
  guardaDosSeisCriterios,
  haEnvio,
  prepararEnvio,
  registrarProcedenciaDoCR,
  type Envio,
} from '@/lib/validacao-externa/matriz-utilizavel';
import {
  avaliarEntrada,
  avaliarEnvelope,
  avaliarRetorno,
} from '@/lib/validacao-externa/contrato-retorno';
import {
  classificarEstado,
  executarValidacao,
  origemDaExcecao,
  origemDaFalhaHttp,
  TEXTO_FORA_DA_FAIXA,
  type Apresentacao,
  type Buscar,
} from '@/lib/validacao-externa/precedencia';

// ---------------------------------------------------------------------------------------------
// Fábricas de entrada
// ---------------------------------------------------------------------------------------------

const razoes = (w: number[]) => w.map(a => w.map(b => a / b));
const W4 = [0.4, 0.3, 0.2, 0.1];
const W5 = [0.35, 0.25, 0.2, 0.12, 0.08];

/** Um documento de cálculo com as seis matrizes persistidas (em JSON, como o produtor grava) e os pesos. */
function calculoCompleto(): any {
  return {
    aggregatedMatrices: {
      bocr: JSON.stringify(razoes(W4)),
      magnitude: JSON.stringify(razoes(W4)),
      subcriteria: {
        B: JSON.stringify(razoes(W5)),
        O: JSON.stringify(razoes(W5)),
        C: JSON.stringify(razoes(W5)),
        R: JSON.stringify(razoes(W5)),
      },
    },
    bocrWeights: W4,
    bocrConsistency: { cr: 0.02, lambda: 4.05, ci: 0.02 },
    rescalingWeights: { sb: 0.4, so: 0.3, sc: 0.2, sr: 0.1 },
    magnitudeConsistency: { cr: 0.01, lambda: 4.03 },
    subWeights: { B: W5, O: W5, C: W5, R: W5 },
    subConsistency: { B: { cr: 0.03 }, O: { cr: 0.04 }, C: { cr: 0 }, R: { cr: 0.05 } },
  };
}

/** Só pesos e CR: ausência total de matrizes persistidas. */
function calculoSoComPesos(): any {
  const c = calculoCompleto();
  delete c.aggregatedMatrices;
  return c;
}

/** Todas as seis chaves persistidas presentes, todas inválidas. */
function calculoPersistidoInvalido(): any {
  const c = calculoCompleto();
  c.aggregatedMatrices = {
    bocr: 'xx',
    magnitude: 'xx',
    subcriteria: { B: 'xx', O: 'xx', C: 'xx', R: 'xx' },
  };
  return c;
}

function entrada(n: number, sobre: any = {}): any {
  return { n, valid: true, your_cr: 0.02, sdk_cr: 0.02, cr_diff: 0.0001, max_weight_diff: 0.0002, ...sobre };
}

/** Uma resposta do serviço coerente com o que foi enviado. `sobre` sobrepõe campos do envelope. */
function retornoCompleto(envio: Envio, sobre: any = {}): any {
  const results: Record<string, any> = {};
  for (const rotulo of Object.keys(envio.matrices)) results[rotulo] = entrada(envio.ordemEnviada[rotulo]);
  const n = Object.keys(results).length;
  return {
    results,
    summary: { total_matrices: n, valid_matrices: n, max_weight_diff: 0.0002, max_cr_diff: 0.0001, issues: [] },
    all_valid: true,
    library: 'AhpAnpLib (simulada)',
    citation: 'campo nunca lido',
    ...sobre,
  };
}

function estado(calculo: any, corpo: (envio: Envio) => any): Apresentacao {
  const envio = prepararEnvio(calculo);
  return classificarEstado({ envio, resposta: { tipo: 'corpo', corpo: corpo(envio) } });
}

const html = (ap: Apresentacao) =>
  renderToStaticMarkup(React.createElement(PainelDeResultado, { apresentacao: ap }));

const seloDoHtml = (h: string) => /data-bloco="veredito"[^>]*data-selo="(sim|nao)"/.exec(h)?.[1];

function fetchSimulado(resposta: { ok: boolean; status: number; texto: string } | Error) {
  const chamadas: { url: string; init: any }[] = [];
  const buscar: Buscar = async (url, init) => {
    chamadas.push({ url, init });
    if (resposta instanceof Error) throw resposta;
    return { ok: resposta.ok, status: resposta.status, text: async () => resposta.texto };
  };
  return { buscar, chamadas };
}

/** O que o componente fazia ANTES, no caminho das matrizes reais, copiado como CONTROLE de preservação. */
function comoAntes(calculation: any): Record<string, any> {
  const matrices: Record<string, any> = {};
  const agg = calculation.aggregatedMatrices;
  const parse = (m: any) => (typeof m === 'string' ? JSON.parse(m) : Array.isArray(m) ? m : null);
  const b = parse(agg.bocr);
  if (b && b.length === 4)
    matrices['BOCR Méritos'] = {
      matrix: b,
      items: ['Benefits', 'Opportunities', 'Costs', 'Risks'],
      your_weights: calculation.bocrWeights,
      your_cr: calculation.bocrConsistency?.cr || 0,
    };
  const m = parse(agg.magnitude);
  if (m && m.length === 4)
    matrices['Magnitude (Rescaling)'] = {
      matrix: m,
      items: ['Benefits', 'Opportunities', 'Costs', 'Risks'],
      your_weights: [
        calculation.rescalingWeights?.sb || 0,
        calculation.rescalingWeights?.so || 0,
        calculation.rescalingWeights?.sc || 0,
        calculation.rescalingWeights?.sr || 0,
      ],
      your_cr: calculation.magnitudeConsistency?.cr || 0,
    };
  const nome: Record<string, string> = { B: 'Benefits', O: 'Opportunities', C: 'Costs', R: 'Risks' };
  for (const [key, raw] of Object.entries(agg.subcriteria)) {
    const matrix = parse(raw);
    if (matrix && matrix.length >= 2) {
      matrices[`${nome[key] || key} Subcritérios`] = {
        matrix,
        items: matrix.map((_: any, i: number) => `${key}${i + 1}`),
        your_weights: calculation.subWeights?.[key] || [],
        your_cr: calculation.subConsistency?.[key]?.cr || 0,
      };
    }
  }
  return matrices;
}

const NOVE_ESTADOS = (): Record<string, Apresentacao> => ({
  P1: classificarEstado({ envio: prepararEnvio(calculoPersistidoInvalido()), resposta: null }),
  P2: classificarEstado({ envio: prepararEnvio(null), resposta: null }),
  P3: classificarEstado({
    envio: prepararEnvio(calculoCompleto()),
    resposta: { tipo: 'falha', origem: { natureza: 'status_http', status: 502, erro: 'Validator returned 502' } },
  }),
  P4: estado(calculoCompleto(), () => ({})),
  P5: estado(calculoCompleto(), e => retornoCompleto(e, { all_valid: 'true' })),
  P6: estado(calculoSoComPesos(), e => retornoCompleto(e)),
  P7: estado(calculoCompleto(), e => {
    const r = retornoCompleto(e);
    delete r.results['Costs Subcritérios'].cr_diff;
    return r;
  }),
  P8: estado(calculoCompleto(), e => retornoCompleto(e)),
  P9: estado(calculoCompleto(), e => {
    const r = retornoCompleto(e, { all_valid: false });
    r.results['Risks Subcritérios'].valid = false;
    r.summary.valid_matrices = 5;
    return r;
  }),
});

// =============================================================================================
// 1. A definição única do conjunto esperado, e a extração das duas constantes
// =============================================================================================

describe('conjunto esperado: definição única, por identidade e ordem', () => {
  test('as seis identidades, na ordem, com os rótulos que a requisição já usava e as ordens 4, 4, 5, 5, 5, 5', () => {
    expect(IDENTIDADES_ESPERADAS.map(i => i.id)).toEqual(['bocr', 'magnitude', 'sub:B', 'sub:O', 'sub:C', 'sub:R']);
    expect(IDENTIDADES_ESPERADAS.map(i => i.rotulo)).toEqual([
      'BOCR Méritos',
      'Magnitude (Rescaling)',
      'Benefits Subcritérios',
      'Opportunities Subcritérios',
      'Costs Subcritérios',
      'Risks Subcritérios',
    ]);
    expect(IDENTIDADES_ESPERADAS.map(i => i.ordem)).toEqual([4, 4, 5, 5, 5, 5]);
    for (const i of IDENTIDADES_ESPERADAS) expect(i.itens).toHaveLength(i.ordem);
    expect(TOTAL_DE_IDENTIDADES).toBe(6);
  });

  test('os itens enviados por identidade são os que o componente já enviava', () => {
    const itens = Object.fromEntries(IDENTIDADES_ESPERADAS.map(i => [i.id, i.itens]));
    expect(itens['bocr']).toEqual(['Benefits', 'Opportunities', 'Costs', 'Risks']);
    expect(itens['magnitude']).toEqual(['Benefits', 'Opportunities', 'Costs', 'Risks']);
    expect(itens['sub:B']).toEqual(['B1', 'B2', 'B3', 'B4', 'B5']);
    expect(itens['sub:R']).toEqual(['R1', 'R2', 'R3', 'R4', 'R5']);
  });

  test('as duas constantes extraídas têm os MESMOS valores que tinham na rota', () => {
    expect([...MERITS]).toEqual(['B', 'O', 'C', 'R']);
    expect(SUBCRITERIA_PER_MERIT).toBe(5);
  });

  test('FONTE ÚNICA: a rota importa as constantes e não as declara mais; o módulo novo é a única declaração', () => {
    const raiz = join(__dirname, '..', '..');
    const rota = readFileSync(join(raiz, 'app/api/calculate/route.ts'), 'utf8');
    expect(rota).toContain("import { MERITS, SUBCRITERIA_PER_MERIT } from '@/lib/validacao-externa/conjunto-esperado';");
    expect(rota).not.toMatch(/^\s*(export\s+)?const\s+MERITS\b/m);
    expect(rota).not.toMatch(/^\s*(export\s+)?const\s+SUBCRITERIA_PER_MERIT\b/m);
    const modulo = readFileSync(join(raiz, 'lib/validacao-externa/conjunto-esperado.ts'), 'utf8');
    expect(modulo).toMatch(/^export const MERITS = \['B', 'O', 'C', 'R'\] as const;$/m);
    expect(modulo).toMatch(/^export const SUBCRITERIA_PER_MERIT = 5;$/m);
  });

  test('o conjunto declara ser reflexo da estrutura do produtor e não incluir as matrizes de alternativas', () => {
    const modulo = readFileSync(join(__dirname, '..', 'validacao-externa/conjunto-esperado.ts'), 'utf8');
    expect(modulo).toContain('REFLEXO DA ESTRUTURA ATUAL DO PRODUTOR');
    expect(modulo).toContain('NÃO inclui as vinte matrizes de alternativas');
  });
});

// =============================================================================================
// 2. A guarda dos seis critérios
// =============================================================================================

describe('guarda dos seis critérios de matriz utilizável', () => {
  const ok4 = () => razoes(W4);
  const g = (matrizBruta: unknown, over: any = {}) =>
    guardaDosSeisCriterios(
      {
        matrizBruta,
        // `in` e não `??`: `undefined` explícito é um caso a testar (pesos ausentes), e não "use o padrão"
        itens: 'itens' in over ? over.itens : ['a', 'b', 'c', 'd'],
        pesos: 'pesos' in over ? over.pesos : W4,
      },
      over.ordem ?? 4
    );

  test('positivo: matriz quadrada, da ordem esperada, finita e positiva, com itens e pesos coerentes', () => {
    expect(g(ok4()).utilizavel).toBe(true);
    expect(g(JSON.stringify(ok4())).utilizavel).toBe(true);
  });

  test.each([
    ['JSON inválido', 'nao e json', 'json_invalido'],
    ['decodifica em objeto', '{"a":1}', 'formato_inesperado'],
    ['decodifica em número', '7', 'formato_inesperado'],
    ['linha que não é arranjo', [[1, 2, 3, 4], 5, [1, 2, 3, 4], [1, 2, 3, 4]], 'formato_inesperado'],
    ['entrada que não é número', [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3, 'x'], [1, 2, 3, 4]], 'formato_inesperado'],
    ['null no lugar de número (o que JSON faz com NaN)', '[[1,2,3,4],[1,2,3,4],[1,2,3,null],[1,2,3,4]]', 'formato_inesperado'],
    ['não quadrada', [[1, 2, 3, 4], [1, 2, 3, 4], [1, 2, 3], [1, 2, 3, 4]], 'nao_quadrada'],
    ['ordem menor que a esperada', razoes([0.5, 0.3, 0.2]), 'ordem_inesperada'],
    ['ordem maior que a esperada', razoes(W5), 'ordem_inesperada'],
    ['valor NaN', (() => { const m = ok4(); m[1][2] = NaN; return m; })(), 'valor_nao_finito'],
    ['valor Infinity', (() => { const m = ok4(); m[0][3] = Infinity; return m; })(), 'valor_nao_finito'],
    ['valor zero', (() => { const m = ok4(); m[2][1] = 0; return m; })(), 'valor_nao_positivo'],
    ['valor negativo', (() => { const m = ok4(); m[3][0] = -2; return m; })(), 'valor_nao_positivo'],
  ])('descarte nomeado, critérios 1 a 4: %s', (_nome, bruta, razao) => {
    const r = g(bruta);
    expect(r.utilizavel).toBe(false);
    expect(r.razao).toBe(razao);
    expect(typeof r.detalhe).toBe('string');
  });

  test('critério 5: items com comprimento diferente da ordem', () => {
    expect(g(ok4(), { itens: ['a', 'b', 'c'] }).razao).toBe('itens_comprimento_divergente');
    expect(g(ok4(), { itens: undefined }).razao).toBe('itens_comprimento_divergente');
    const r = guardaDosSeisCriterios({ matrizBruta: ok4(), itens: 'abcd', pesos: W4 }, 4);
    expect(r.razao).toBe('itens_comprimento_divergente');
  });

  test.each([
    ['pesos ausentes (undefined)', undefined, 'pesos_ausentes'],
    ['pesos que não são arranjo', 'abc', 'pesos_ausentes'],
    ['comprimento diferente da ordem', [0.5, 0.5], 'pesos_comprimento_divergente'],
    ['um peso ausente (null)', [0.4, null, 0.2, 0.1], 'pesos_ausentes'],
    ['peso NaN', [0.4, NaN, 0.2, 0.1], 'peso_nao_finito'],
    ['peso Infinity', [0.4, Infinity, 0.2, 0.1], 'peso_nao_finito'],
    ['peso que não é número', [0.4, '0.3', 0.2, 0.1], 'peso_nao_finito'],
    ['peso zero', [0.4, 0, 0.2, 0.1], 'peso_nao_positivo'],
    ['peso negativo', [0.4, -0.3, 0.2, 0.1], 'peso_nao_positivo'],
  ])('critério 6: %s', (_nome, pesos, razao) => {
    const r = g(ok4(), { pesos });
    expect(r.utilizavel).toBe(false);
    expect(r.razao).toBe(razao);
  });

  test('a razão devolvida é a do PRIMEIRO critério que falha, na ordem 1 a 6', () => {
    const naoQuadradaComNaN = [[1, 2, 3, 4], [1, 2, NaN, 4], [1, 2, 3], [1, 2, 3, 4]];
    expect(g(naoQuadradaComNaN, { pesos: [NaN, 0, 0, 0] }).razao).toBe('nao_quadrada');
    const m = ok4();
    m[0][0] = -1;
    expect(g(m, { itens: ['a'], pesos: undefined }).razao).toBe('valor_nao_positivo');
    expect(g(ok4(), { itens: ['a'], pesos: undefined }).razao).toBe('itens_comprimento_divergente');
  });

  test('LIMITE declarado: reciprocidade e diagonal unitária NÃO são verificadas', () => {
    const naoReciproca = [
      [1, 2, 3, 4],
      [9, 1, 3, 4],
      [1, 2, 1, 4],
      [1, 2, 3, 7],
    ];
    expect(g(naoReciproca).utilizavel).toBe(true);
    const fonte = readFileSync(join(__dirname, '..', 'validacao-externa/matriz-utilizavel.ts'), 'utf8');
    expect(fonte).toContain('reciprocidade e diagonal unitária');
  });
});

// =============================================================================================
// 3. Origem das matrizes: quatro condições, e a reconstrução somente na ausência total
// =============================================================================================

describe('origem das matrizes e montagem do envio', () => {
  test('persistida completa: as seis, na ordem do conjunto esperado, origem persistida', () => {
    const e = prepararEnvio(calculoCompleto());
    expect(e.condicao).toBe('persistida_completa');
    expect(e.reconstruida).toBe(false);
    expect(Object.keys(e.matrices)).toEqual(IDENTIDADES_ESPERADAS.map(i => i.rotulo));
    expect(e.descartes).toEqual([]);
    expect(haEnvio(e)).toBe(true);
  });

  test('PRESERVAÇÃO: o corpo enviado das seis persistidas é IGUAL ao que o componente enviava antes', () => {
    const calc = calculoCompleto();
    expect(prepararEnvio(calc).matrices).toEqual(comoAntes(calc));
  });

  test('persistida parcial: ao menos uma utilizável, nem todas; NOMEIA as demais e SEM reconstrução', () => {
    const calc = calculoCompleto();
    delete calc.aggregatedMatrices.magnitude;
    calc.aggregatedMatrices.bocr = 'xx';
    const e = prepararEnvio(calc);
    expect(e.condicao).toBe('persistida_parcial');
    expect(e.reconstruida).toBe(false);
    expect(Object.keys(e.matrices)).toEqual([
      'Benefits Subcritérios',
      'Opportunities Subcritérios',
      'Costs Subcritérios',
      'Risks Subcritérios',
    ]);
    const porId = Object.fromEntries(e.descartes.map(d => [d.id, d.razao]));
    expect(porId).toEqual({ bocr: 'json_invalido', magnitude: 'chave_ausente' });
  });

  test('CONTRAEXEMPLO do defeito antigo: `bocr` persistida e `subcriteria` ausente NÃO derruba as persistidas utilizáveis para a reconstrução', () => {
    const calc = calculoCompleto();
    delete calc.aggregatedMatrices.subcriteria;
    const e = prepararEnvio(calc);
    expect(e.condicao).toBe('persistida_parcial');
    expect(e.reconstruida).toBe(false);
    expect(Object.keys(e.matrices)).toEqual(['BOCR Méritos', 'Magnitude (Rescaling)']);
    // as matrizes enviadas são as PERSISTIDAS, e não razões de pesos
    expect(e.matrices['BOCR Méritos'].matrix).toEqual(razoes(W4));
  });

  test('presente e inválida: as seis chaves presentes e nenhuma utilizável, SEM reconstrução, mesmo havendo pesos', () => {
    const e = prepararEnvio(calculoPersistidoInvalido());
    expect(e.condicao).toBe('presente_invalida');
    expect(e.reconstruida).toBe(false);
    expect(haEnvio(e)).toBe(false);
    expect(e.descartes.map(d => d.razao)).toEqual(Array(6).fill('json_invalido'));
  });

  test('UMA só chave persistida presente e inválida basta para o diagnóstico de invalidade, e não para a reconstrução', () => {
    const calc = calculoSoComPesos();
    calc.aggregatedMatrices = { bocr: 'xx' };
    const e = prepararEnvio(calc);
    expect(e.condicao).toBe('presente_invalida');
    expect(e.reconstruida).toBe(false);
    expect(e.descartes.find(d => d.id === 'bocr')?.razao).toBe('json_invalido');
    expect(e.descartes.find(d => d.id === 'magnitude')?.razao).toBe('chave_ausente');
  });

  test('chave `subcriteria` presente mas malformada (não é objeto): as quatro identidades presentes e inválidas, sem reconstrução', () => {
    const calc = calculoSoComPesos();
    calc.aggregatedMatrices = { subcriteria: 'xx' };
    const e = prepararEnvio(calc);
    expect(e.condicao).toBe('presente_invalida');
    expect(e.reconstruida).toBe(false);
    expect(e.descartes.filter(d => d.razao === 'formato_inesperado').map(d => d.id)).toEqual([
      'sub:B', 'sub:O', 'sub:C', 'sub:R',
    ]);
  });

  test('chave persistida fora do conjunto esperado conta como presente (não há reconstrução) e é nomeada', () => {
    const calc = calculoSoComPesos();
    calc.aggregatedMatrices = { subcriteria: { X: JSON.stringify(razoes(W5)) } };
    const e = prepararEnvio(calc);
    expect(e.condicao).toBe('presente_invalida');
    expect(e.inesperadas).toEqual(['X']);
    expect(e.reconstruida).toBe(false);
  });

  test('ausência total: nenhuma chave presente reconstrói bocr e os quatro subcritérios, e NUNCA a magnitude', () => {
    const e = prepararEnvio(calculoSoComPesos());
    expect(e.condicao).toBe('ausencia_total');
    expect(e.reconstruida).toBe(true);
    expect(Object.keys(e.matrices)).toEqual([
      'BOCR Méritos',
      'Benefits Subcritérios',
      'Opportunities Subcritérios',
      'Costs Subcritérios',
      'Risks Subcritérios',
    ]);
    expect(e.matrices['BOCR Méritos'].matrix).toEqual(razoes(W4));
    expect(e.descartes.find(d => d.id === 'magnitude')?.razao).toBe('nao_reconstruivel');
  });

  // ⚠ ALTERADO (impedimento 1). Este teste incluía o caso `{ bocr: null, magnitude: undefined, subcriteria: null }`
  // e exigia ausência total com reconstrução: tratava CHAVE EXISTENTE COM VALOR NULO como ausência. Esse caso
  // saiu desta lista e passou a ser exigido como "presente e inválida" no bloco seguinte. Ficam aqui só os casos
  // em que NENHUMA das seis chaves de matriz existe e nenhum contêiner é nulo ou malformado.
  test.each([
    ['objeto vazio (contêiner existe e é válido, nenhuma chave de matriz existe)', {}],
    ['com subcriteria vazio (contêiner de subcritérios existe e é válido, nenhum mérito existe)', { subcriteria: {} }],
    ['ausente (a chave aggregatedMatrices não existe)', undefined],
  ])('ausência total também quando aggregatedMatrices é %s', (_n, agg) => {
    const calc = calculoSoComPesos();
    if (agg !== undefined) calc.aggregatedMatrices = agg;
    const e = prepararEnvio(calc);
    expect(e.condicao).toBe('ausencia_total');
    expect(e.reconstruida).toBe(true);
  });

  describe('presença é EXISTÊNCIA DA CHAVE: chave ou contêiner existente com valor nulo NÃO é ausência', () => {
    const razoesPorId = (razao: string, quais: string[], resto = 'chave_ausente') =>
      Object.fromEntries(
        ['bocr', 'magnitude', 'sub:B', 'sub:O', 'sub:C', 'sub:R'].map(id => [id, quais.includes(id) ? razao : resto])
      );
    const SEIS = ['bocr', 'magnitude', 'sub:B', 'sub:O', 'sub:C', 'sub:R'];
    const QUATRO_SUB = ['sub:B', 'sub:O', 'sub:C', 'sub:R'];

    const casos: [string, any, Record<string, string>][] = [
      ['aggregatedMatrices nulo (contêiner existe com valor nulo)', null, razoesPorId('conteiner_nulo', SEIS)],
      ['aggregatedMatrices malformado (texto)', 'xx', razoesPorId('formato_inesperado', SEIS)],
      ['aggregatedMatrices malformado (arranjo)', [], razoesPorId('formato_inesperado', SEIS)],
      ['bocr nulo', { bocr: null }, razoesPorId('valor_nulo', ['bocr'])],
      ['magnitude nula', { magnitude: null }, razoesPorId('valor_nulo', ['magnitude'])],
      ['subcriteria nulo (contêiner de subcritérios existe com valor nulo)', { subcriteria: null }, razoesPorId('conteiner_nulo', QUATRO_SUB)],
      ['subcriteria malformado', { subcriteria: 'xx' }, razoesPorId('formato_inesperado', QUATRO_SUB)],
      ['mérito nulo dentro de subcriteria válido', { subcriteria: { B: null } }, razoesPorId('valor_nulo', ['sub:B'])],
      ['mérito undefined explícito dentro de subcriteria válido', { subcriteria: { C: undefined } }, razoesPorId('valor_nulo', ['sub:C'])],
      [
        'o caso antigo: bocr nulo, magnitude undefined explícito, subcriteria nulo',
        { bocr: null, magnitude: undefined, subcriteria: null },
        { ...razoesPorId('conteiner_nulo', QUATRO_SUB), bocr: 'valor_nulo', magnitude: 'valor_nulo' },
      ],
    ];

    test.each(casos)('%s: presente e inválida, SEM reconstrução, mesmo havendo pesos, com a razão nomeada por identidade', (_n, agg, razoesEsperadas) => {
      const calc = calculoSoComPesos();
      calc.aggregatedMatrices = agg;
      const e = prepararEnvio(calc);
      expect(e.condicao).toBe('presente_invalida');
      expect(e.reconstruida).toBe(false);
      expect(haEnvio(e)).toBe(false);
      expect(e.motivoDeNaoEnvio).toBeNull();
      expect(Object.fromEntries(e.descartes.map(d => [d.id, d.razao]))).toEqual(razoesEsperadas);
    });

    test('CONTRASTE: o mesmo documento SEM a chave reconstrói; COM a chave nula não reconstrói', () => {
      const semChave = calculoSoComPesos();
      semChave.aggregatedMatrices = {};
      expect(prepararEnvio(semChave).condicao).toBe('ausencia_total');
      for (const agg of [{ bocr: null }, { magnitude: null }, { subcriteria: null }, { subcriteria: { R: null } }, null]) {
        const comNula = calculoSoComPesos();
        comNula.aggregatedMatrices = agg;
        const e = prepararEnvio(comNula);
        expect(e.reconstruida).toBe(false);
        expect(e.condicao).not.toBe('ausencia_total');
      }
    });

    test('chave nula ENTRE persistidas utilizáveis: persistida parcial, a chave nula nomeada, sem reconstrução', () => {
      const calc = calculoCompleto();
      calc.aggregatedMatrices.magnitude = null;
      const e = prepararEnvio(calc);
      expect(e.condicao).toBe('persistida_parcial');
      expect(e.reconstruida).toBe(false);
      expect(e.enviadas).toEqual(['bocr', 'sub:B', 'sub:O', 'sub:C', 'sub:R']);
      expect(e.descartes).toEqual([
        expect.objectContaining({ id: 'magnitude', razao: 'valor_nulo' }),
      ]);
    });

    test('a razão aparece na tela em P1, e a tela não fala em ausência nem em reconstrução', () => {
      const calc = calculoSoComPesos();
      calc.aggregatedMatrices = null;
      const ap = classificarEstado({ envio: prepararEnvio(calc), resposta: null });
      expect(ap.codigo).toBe('P1');
      const h = html(ap);
      expect(h).toContain('contêiner persistido existente com valor nulo');
      expect(h).not.toContain('Matrizes reconstruídas dos pesos');
      expect(h).not.toContain('chave ausente no documento');
    });

    test('o diagnóstico não depende de haver pesos: sem pesos também é presente e inválida', () => {
      const e = prepararEnvio({ aggregatedMatrices: { bocr: null } });
      expect(e.condicao).toBe('presente_invalida');
      expect(e.motivoDeNaoEnvio).toBeNull();
    });
  });

  test('ausência total sem pesos: nada enviado, motivo nomeado', () => {
    const e = prepararEnvio({ bocrConsistency: { cr: 0.1 } });
    expect(e.condicao).toBe('ausencia_total');
    expect(haEnvio(e)).toBe(false);
    expect(e.motivoDeNaoEnvio).toBe('ausencia_total_sem_pesos');
  });

  test('ausência total com pesos que não servem (zero): nada enviado, motivo nomeado, razão por identidade', () => {
    const calc = { bocrWeights: [0.5, 0, 0.3, 0.2], subWeights: { B: [1, 2] } };
    const e = prepararEnvio(calc);
    expect(haEnvio(e)).toBe(false);
    expect(e.motivoDeNaoEnvio).toBe('reconstrucao_sem_matriz_utilizavel');
    expect(e.descartes.find(d => d.id === 'bocr')?.razao).toBe('peso_nao_positivo');
    expect(e.descartes.find(d => d.id === 'sub:B')?.razao).toBe('pesos_comprimento_divergente');
  });

  test('a barra da guarda alcança a reconstrução: peso Infinity não produz matriz com NaN no envio', () => {
    const e = prepararEnvio({ bocrWeights: [Infinity, 0.3, 0.2, 0.1] });
    expect(haEnvio(e)).toBe(false);
    expect(e.descartes.find(d => d.id === 'bocr')?.razao).toBe('peso_nao_finito');
  });

  test('sem cálculo: nada enviado, as seis identidades nomeadas com a razão', () => {
    for (const vazio of [null, undefined, 0, '']) {
      const e = prepararEnvio(vazio);
      expect(e.condicao).toBe('sem_calculo');
      expect(e.motivoDeNaoEnvio).toBe('sem_calculo');
      expect(e.descartes).toHaveLength(6);
      expect(haEnvio(e)).toBe(false);
    }
  });

  test('o objeto de cálculo recebido não é alterado', () => {
    const calc = calculoCompleto();
    const antes = JSON.stringify(calc);
    prepararEnvio(calc);
    expect(JSON.stringify(calc)).toBe(antes);
  });
});

// =============================================================================================
// 4. Procedência do CR (seção 10)
// =============================================================================================

describe('procedência local do CR: presente e válido, ausente, presente e inválido', () => {
  test.each([
    [undefined, 'ausente'],
    [null, 'ausente'],
    [0, 'presente_valido'],
    [0.05, 'presente_valido'],
    [NaN, 'presente_invalido'],
    [-0.1, 'presente_invalido'],
    [Infinity, 'presente_invalido'],
    [-Infinity, 'presente_invalido'],
    ['abc', 'presente_invalido'],
    ['0.1', 'presente_invalido'],
    [true, 'presente_invalido'],
    [{}, 'presente_invalido'],
  ])('CR bruto %p é classificado como %s', (bruto, esperado) => {
    expect(registrarProcedenciaDoCR(bruto).estado).toBe(esperado);
  });

  test('zero finito é presente e válido, e DISTINTO de ausência (o registro local é o que preserva a distinção)', () => {
    const zero = registrarProcedenciaDoCR(0);
    const ausente = registrarProcedenciaDoCR(undefined);
    expect(zero.estado).toBe('presente_valido');
    expect(zero.valorLocal).toBe(0);
    expect(ausente.estado).toBe('ausente');
    expect(ausente.valorLocal).toBeNull();
    // ...e os dois chegam ao serviço como zero, que é o motivo do registro local
    expect(zero.enviado).toBe(0);
    expect(ausente.enviado).toBe(0);
  });

  test('um CR negativo pertence SOMENTE a "presente e inválido" (as categorias são exclusivas)', () => {
    const p = registrarProcedenciaDoCR(-0.01);
    expect(p.estado).toBe('presente_invalido');
    expect(p.valorLocal).toBeNull();
    expect(p.descricao).toContain('negativo');
  });

  test('PRESERVAÇÃO: o valor ENVIADO como your_cr é `<bruto> || 0`, a expressão que já existia, nos três estados', () => {
    const brutos: any[] = [undefined, null, 0, 0.05, NaN, -0.1, Infinity, 'abc', '0.1', true];
    for (const bruto of brutos) {
      const calc = calculoCompleto();
      calc.bocrConsistency = { cr: bruto };
      const e = prepararEnvio(calc);
      expect(Object.is(e.matrices['BOCR Méritos'].your_cr, bruto || 0)).toBe(true);
      expect(Object.is(e.procedenciaCR['bocr']?.enviado, bruto || 0)).toBe(true);
    }
  });

  test('a procedência é registrada por identidade enviada, para as três fontes de CR', () => {
    const calc = calculoCompleto();
    calc.magnitudeConsistency = {};
    calc.subConsistency.O = { cr: -1 };
    const e = prepararEnvio(calc);
    expect(e.procedenciaCR['bocr']?.estado).toBe('presente_valido');
    expect(e.procedenciaCR['magnitude']?.estado).toBe('ausente');
    expect(e.procedenciaCR['sub:O']?.estado).toBe('presente_invalido');
    expect(e.procedenciaCR['sub:C']?.estado).toBe('presente_valido'); // zero medido
    expect(e.procedenciaCR['sub:C']?.valorLocal).toBe(0);
  });
});

// ⚠ ACRESCENTADO (impedimento 3). Três camadas que estavam colapsadas numa só ("valor substituto"):
//   1. o valor LOCAL (ausente, nulo, NaN, negativo, infinito, texto, número finito não negativo);
//   2. o efeito da coerção `|| 0`: SUBSTITUI o falsy (ausente, null, NaN, false, texto vazio) e PRESERVA o
//      truthy (negativo, infinito, texto, objeto). Zero finito não é substituído: `0 || 0` não muda nada;
//   3. o que o JSON da requisição CARREGA: `0` para o NaN (a coerção o trocou ANTES de serializar), `null`
//      para o infinito (preservado pela coerção, mas o JSON não o representa), chave OMITIDA para função e
//      símbolo, e FALHA de geração para BigInt e estrutura circular.
describe('CR local em três camadas: o valor local, o efeito da coerção `|| 0` e o corpo serializado', () => {
  const circular: any = { a: 1 };
  circular.self = circular;

  const casos: [string, any, string, 'substituido' | 'preservado', 'gerada' | 'omitida' | 'falha', string | null][] = [
    ['ausente (undefined)', undefined, 'ausente', 'substituido', 'gerada', '0'],
    ['null', null, 'ausente', 'substituido', 'gerada', '0'],
    ['NaN: a coerção o troca por 0 ANTES de serializar, então o corpo carrega 0 e não null', NaN, 'presente_invalido', 'substituido', 'gerada', '0'],
    ['false', false, 'presente_invalido', 'substituido', 'gerada', '0'],
    ['texto vazio', '', 'presente_invalido', 'substituido', 'gerada', '0'],
    ['BigInt zero (falsy: vira 0, e o corpo é gerado)', BigInt(0), 'presente_invalido', 'substituido', 'gerada', '0'],
    ['zero finito: presente e válido, NÃO substituído', 0, 'presente_valido', 'preservado', 'gerada', '0'],
    ['zero negativo: presente e válido, NÃO substituído', -0, 'presente_valido', 'preservado', 'gerada', '0'],
    ['finito não negativo', 0.05, 'presente_valido', 'preservado', 'gerada', '0.05'],
    ['negativo: verdadeiro, PRESERVADO', -5, 'presente_invalido', 'preservado', 'gerada', '-5'],
    ['infinito: PRESERVADO pela coerção, mas o corpo carrega null', Infinity, 'presente_invalido', 'preservado', 'gerada', 'null'],
    ['infinito negativo: idem', -Infinity, 'presente_invalido', 'preservado', 'gerada', 'null'],
    ['texto não vazio: preservado', 'abc', 'presente_invalido', 'preservado', 'gerada', '"abc"'],
    ['objeto: preservado', {}, 'presente_invalido', 'preservado', 'gerada', '{}'],
    ['função: preservada, e a chave é OMITIDA do corpo (não é falha)', () => 1, 'presente_invalido', 'preservado', 'omitida', null],
    ['símbolo: idem', Symbol('s'), 'presente_invalido', 'preservado', 'omitida', null],
    ['BigInt: a geração do corpo FALHA', BigInt(10), 'presente_invalido', 'preservado', 'falha', null],
    ['estrutura circular: a geração do corpo FALHA', circular, 'presente_invalido', 'preservado', 'falha', null],
  ];

  test.each(casos)('%s', (_n, bruto, estadoEsperado, coercao, serializacao, json) => {
    const p = registrarProcedenciaDoCR(bruto);
    expect(p.estado).toBe(estadoEsperado);
    expect(p.coercao).toBe(coercao);
    expect(p.serializacao).toBe(serializacao);
    expect(p.enviadoJson).toBe(json);
    // o valor ENVIADO não muda: continua `<bruto> || 0`
    expect(Object.is(p.enviado, bruto || 0)).toBe(true);
    expect(p.erroDeSerializacao === null).toBe(serializacao !== 'falha');
    // CONTROLE contra a serialização real do objeto da requisição
    if (serializacao === 'falha') {
      expect(() => JSON.stringify({ your_cr: bruto || 0 })).toThrow(TypeError);
    } else {
      const corpo = JSON.parse(JSON.stringify({ your_cr: bruto || 0 }));
      expect(Object.prototype.hasOwnProperty.call(corpo, 'your_cr')).toBe(serializacao === 'gerada');
      if (serializacao === 'gerada') expect(JSON.stringify(corpo.your_cr)).toBe(json);
    }
  });

  test('infinito negativo não repete "(negativo)" na descrição (só o negativo finito leva o sufixo)', () => {
    expect(registrarProcedenciaDoCR(-Infinity).descricao).toBe('infinito negativo');
    expect(registrarProcedenciaDoCR(-5).descricao).toBe('-5 (negativo)');
  });

  const linhaDoBocr = (bruto: any) => {
    const calc = calculoCompleto();
    calc.bocrConsistency = { cr: bruto };
    const ap = estado(calc, e => retornoCompleto(e));
    return { ap, linha: ap.linhas.find(l => l.chave === 'BOCR Méritos')! };
  };

  test.each([[undefined], [null], [NaN]])(
    'SUBSTITUÍDO (%p): as notas dizem "valor substituto", o corpo carrega 0, a célula não é avaliada e o estado é P7',
    bruto => {
      const { ap, linha } = linhaDoBocr(bruto);
      expect(ap.codigo).toBe('P7');
      expect(linha.crSistema.nota).toContain('a coerção (|| 0) substituiu o valor: o valor substituto é 0');
      expect(linha.crSistema.nota).toContain('o corpo da requisição carrega 0');
      expect(linha.deltaCR.nota).toContain('valor substituto (0)');
      expect(linha.deltaCR.avaliado).toBe(false);
      expect(linha.deltaCR.faixa).toBeUndefined();
    }
  );

  test.each([[-5, 'carrega -5'], ['abc', 'carrega "abc"']])(
    'INVÁLIDO PRESERVADO (%p): as notas dizem preservado, nunca "substituto", e mostram o que o corpo carrega',
    (bruto, carrega) => {
      const { ap, linha } = linhaDoBocr(bruto);
      expect(ap.codigo).toBe('P7');
      expect(linha.crSistema.texto).toBe('inválido');
      expect(linha.crSistema.nota).toContain('a coerção (|| 0) preservou o valor');
      expect(linha.crSistema.nota).toContain(carrega);
      expect(linha.crSistema.nota).not.toContain('substitu');
      expect(linha.deltaCR.nota).not.toContain('substitu');
      expect(linha.deltaCR.nota).toContain(carrega);
      expect(linha.deltaCR.avaliado).toBe(false);
      expect(linha.deltaCR.faixa).toBeUndefined();
    }
  );

  test.each([[Infinity], [-Infinity]])(
    'INFINITO (%p): a coerção PRESERVA, o corpo carrega null, e a nota NÃO diz "enviado como está" nem "substituto"',
    bruto => {
      const { ap, linha } = linhaDoBocr(bruto);
      expect(ap.codigo).toBe('P7');
      for (const nota of [linha.crSistema.nota!, linha.deltaCR.nota!]) {
        expect(nota).toContain('o corpo da requisição carrega null');
        expect(nota).toContain('o JSON não representa infinito');
        expect(nota).not.toContain('substitu');
        expect(nota).not.toContain('Infinity');
      }
      expect(linha.crSistema.nota).toContain('a coerção (|| 0) preservou o valor');
      const h = html(ap);
      expect(h).toContain('o JSON não representa infinito');
      expect(h).not.toContain('Infinity');
      // a procedência registrada confere com a serialização real
      const p = prepararEnvio(Object.assign(calculoCompleto(), { bocrConsistency: { cr: bruto } })).procedenciaCR['bocr']!;
      expect(p.enviadoJson).toBe('null');
      expect(p.coercao).toBe('preservado');
    }
  );

  test.each([[() => 1], [Symbol('s')]])('OMITIDO (%p): a nota diz que o campo foi omitido, e não que o corpo carrega algum valor', bruto => {
    const { ap, linha } = linhaDoBocr(bruto);
    expect(ap.codigo).toBe('P7');
    expect(linha.crSistema.nota).toContain('o campo your_cr foi omitido do corpo da requisição');
    expect(linha.crSistema.nota).not.toContain('carrega');
    expect(linha.crSistema.nota).not.toContain('substitu');
    expect(linha.deltaCR.nota).not.toContain('substitu');
  });

  test.each([[BigInt(10)], [circular]])(
    'FALHA DE SERIALIZAÇÃO (%p): a nota declara a falha, preserva o valor local e NUNCA afirma que o serviço recebeu um JSON',
    bruto => {
      const { linha } = linhaDoBocr(bruto);
      expect(linha.crSistema.nota).toContain('a coerção (|| 0) preservou o valor');
      expect(linha.crSistema.nota).toContain('falha de serialização');
      expect(linha.crSistema.nota).toContain('o corpo da requisição não foi gerado');
      expect(linha.deltaCR.nota).toContain('diferença não interpretável');
      for (const nota of [linha.crSistema.nota!, linha.deltaCR.nota!]) {
        expect(nota).not.toContain('recebeu');
        expect(nota).not.toContain('carrega');
        expect(nota).not.toContain('substitu');
      }
    }
  );

  test('zero finito medido continua presente e válido: P8, sem nota de substituto nem de inválido', () => {
    const { ap, linha } = linhaDoBocr(0);
    expect(ap.codigo).toBe('P8');
    expect(linha.crSistema.nota).toBeUndefined();
    expect(linha.deltaCR.nota).toBeUndefined();
    expect(linha.deltaCR.faixa).toBeDefined();
  });
});

// =============================================================================================
// 5. Contrato do retorno
// =============================================================================================

describe('contrato do retorno: envelope, entrada por matriz e as cinco comparações exatas', () => {
  const okEnv = () => ({
    all_valid: true,
    summary: { total_matrices: 1, valid_matrices: 1, max_weight_diff: 0.1, max_cr_diff: 0.2, issues: ['a'] },
    results: {},
  });

  test('envelope válido', () => {
    const e = avaliarEnvelope(okEnv());
    expect(e.valido).toBe(true);
    expect(e.defeitos).toEqual([]);
  });

  test.each([
    ['all_valid string "true"', (o: any) => { o.all_valid = 'true'; }, 'all_valid'],
    ['all_valid 1', (o: any) => { o.all_valid = 1; }, 'all_valid'],
    ['all_valid ausente', (o: any) => { delete o.all_valid; }, 'all_valid'],
    ['summary ausente', (o: any) => { delete o.summary; }, 'summary'],
    ['summary arranjo', (o: any) => { o.summary = []; }, 'summary'],
    ['total_matrices negativo', (o: any) => { o.summary.total_matrices = -1; }, 'total_matrices'],
    ['total_matrices fracionário', (o: any) => { o.summary.total_matrices = 2.5; }, 'total_matrices'],
    ['valid_matrices em texto', (o: any) => { o.summary.valid_matrices = '1'; }, 'valid_matrices'],
    ['max_weight_diff NaN', (o: any) => { o.summary.max_weight_diff = NaN; }, 'max_weight_diff'],
    ['max_weight_diff Infinity', (o: any) => { o.summary.max_weight_diff = Infinity; }, 'max_weight_diff'],
    ['max_cr_diff null', (o: any) => { o.summary.max_cr_diff = null; }, 'max_cr_diff'],
    ['issues ausente', (o: any) => { delete o.summary.issues; }, 'issues'],
    ['issues com número', (o: any) => { o.summary.issues = ['a', 3]; }, 'issues'],
    ['results arranjo', (o: any) => { o.results = []; }, 'results'],
    ['results nulo', (o: any) => { o.results = null; }, 'results'],
  ])('envelope inválido: %s', (_n, muta, campo) => {
    const o = okEnv();
    muta(o);
    const e = avaliarEnvelope(o);
    expect(e.valido).toBe(false);
    expect(e.defeitos.join(' | ')).toContain(campo);
  });

  test.each([[null], [undefined], ['texto'], [42], [[]]])('corpo que não é objeto (%p) é envelope inválido, sem lançar', corpo => {
    const e = avaliarEnvelope(corpo);
    expect(e.valido).toBe(false);
    expect(e.corpoObjeto).toBe(false);
  });

  test('entrada completa: n corresponde, valid booleano, três campos finitos', () => {
    const e = avaliarEntrada('BOCR Méritos', entrada(4), 4);
    expect(e.estado).toBe('completa');
    expect(e.dimensaoPesos).toBe(true);
    expect(e.dimensaoCR).toBe(true);
  });

  test('entrada parcialmente utilizável: o que falta fica identificado, e a dimensão que falta não tem resultado', () => {
    const semCrDiff = avaliarEntrada('x', entrada(4, { cr_diff: undefined }), 4);
    expect(semCrDiff.estado).toBe('parcial');
    expect(semCrDiff.dimensaoCR).toBe(false);
    expect(semCrDiff.dimensaoPesos).toBe(true);
    const validEmTexto = avaliarEntrada('x', entrada(4, { valid: 'true' }), 4);
    expect(validEmTexto.estado).toBe('parcial');
    expect(validEmTexto.valid).toBe('nao_confirmado');
    const semPesos = avaliarEntrada('x', entrada(4, { max_weight_diff: NaN }), 4);
    expect(semPesos.estado).toBe('parcial');
    expect(semPesos.dimensaoPesos).toBe(false);
    expect(semPesos.dimensaoCR).toBe(true);
    const yourCrNegativo = avaliarEntrada('x', entrada(4, { your_cr: -0.5 }), 4);
    expect(yourCrNegativo.estado).toBe('parcial');
  });

  test.each([
    ['n ausente', entrada(4, { n: undefined })],
    ['n divergente da ordem enviada', entrada(5)],
    ['n em texto', entrada(4, { n: '4' })],
    ['nenhum campo quantitativo finito', entrada(4, { sdk_cr: 'x', cr_diff: NaN, max_weight_diff: null })],
    ['entrada que não é objeto', 'texto'],
    ['entrada nula', null],
  ])('entrada sem evidência alguma: %s', (_n, bruto) => {
    const e = avaliarEntrada('x', bruto, 4);
    expect(e.estado).toBe('sem_evidencia');
    expect(e.dimensaoPesos).toBe(false);
    expect(e.dimensaoCR).toBe(false);
  });

  test('n divergente é inconsistência de correspondência, nomeada como tal', () => {
    const e = avaliarEntrada('x', entrada(5), 4);
    expect(e.motivos.join(' ')).toContain('outra ordem');
  });

  test('chave devolvida e não enviada: inesperada, sem cobertura', () => {
    const ordem = { A: 4 };
    const r = avaliarRetorno({ ...okEnv(), results: { A: entrada(4), B: entrada(4) } }, ordem);
    expect(r.chavesInesperadas).toEqual(['B']);
    expect(r.entradas.find(e => e.chave === 'B')?.estado).toBe('sem_evidencia');
    expect(r.haEntradaAproveitavel).toBe(true);
  });

  describe('as cinco comparações exatas conservam os dois valores e a fonte de cada um', () => {
    const base = () => {
      const envio = prepararEnvio(calculoCompleto());
      return { envio, corpo: retornoCompleto(envio) };
    };
    const contradicoes = (corpo: any, envio: Envio) => avaliarRetorno(corpo, envio.ordemEnviada).contradicoes;

    test('sem contradição no caso coerente', () => {
      const { envio, corpo } = base();
      expect(contradicoes(corpo, envio)).toEqual([]);
    });

    test('1. conjunto de chaves devolvidas contra o enviado (ausente e inesperada)', () => {
      const { envio, corpo } = base();
      delete corpo.results['Risks Subcritérios'];
      corpo.results['Extra'] = entrada(5);
      const c = contradicoes(corpo, envio).find(x => x.codigo === 1)!;
      expect(c).toBeDefined();
      expect(c.a.fonte).toContain('enviadas');
      expect(c.b.fonte).toContain('devolvidas');
      expect(c.a.valor).toContain('Risks Subcritérios');
      expect(c.b.valor).toContain('Extra');
    });

    test('2. total_matrices contra o número de entradas', () => {
      const { envio, corpo } = base();
      corpo.summary.total_matrices = 5;
      const c = contradicoes(corpo, envio).find(x => x.codigo === 2)!;
      expect(c.a).toEqual({ fonte: 'summary.total_matrices (informado pelo serviço)', valor: '5' });
      expect(c.b).toEqual({ fonte: 'número de entradas em results (contado aqui)', valor: '6' });
    });

    test('3. valid_matrices contra a contagem de valid === true', () => {
      const { envio, corpo } = base();
      corpo.summary.valid_matrices = 3;
      const c = contradicoes(corpo, envio).find(x => x.codigo === 3)!;
      expect(c.a.valor).toBe('3');
      expect(c.b.valor).toBe('6');
    });

    test('4. all_valid === true com entrada cujo valid não é true', () => {
      const { envio, corpo } = base();
      corpo.results['Costs Subcritérios'].valid = false;
      corpo.summary.valid_matrices = 5;
      const cs = contradicoes(corpo, envio);
      expect(cs.map(x => x.codigo)).toEqual([4]);
      expect(cs[0].a.valor).toBe('true');
      expect(cs[0].b.valor).toContain('Costs Subcritérios');
    });

    test('5. a contradição INVERSA: all_valid === false com todas as entradas válidas', () => {
      const { envio, corpo } = base();
      corpo.all_valid = false;
      const cs = contradicoes(corpo, envio);
      expect(cs.map(x => x.codigo)).toEqual([5]);
      expect(cs[0].a.valor).toBe('false');
      expect(cs[0].b.fonte).toContain('valid === true');
    });

    test('CONTRAEXEMPLO: all_valid false com UMA entrada não válida NÃO é contradição', () => {
      const { envio, corpo } = base();
      corpo.all_valid = false;
      corpo.results['Costs Subcritérios'].valid = false;
      corpo.summary.valid_matrices = 5;
      expect(contradicoes(corpo, envio)).toEqual([]);
    });

    test('CONTRAEXEMPLO: máximos do resumo diferentes dos das entradas NÃO são contradição nem divergência', () => {
      const { envio, corpo } = base();
      corpo.summary.max_weight_diff = 0.9;
      corpo.summary.max_cr_diff = 0.8;
      const r = avaliarRetorno(corpo, envio.ordemEnviada);
      expect(r.contradicoes).toEqual([]);
      expect(r.maximosDasEntradas.pesos).toBe(0.0002);
    });
  });
});

// =============================================================================================
// 6. Os nove estados
// =============================================================================================

describe('P1, matrizes persistidas inválidas', () => {
  test('POSITIVO: manchete própria, motivo de cada descarte por identidade, as três propriedades, sem selo', () => {
    const ap = classificarEstado({ envio: prepararEnvio(calculoPersistidoInvalido()), resposta: null });
    expect(ap.codigo).toBe('P1');
    expect(ap.manchete).toBe('Matrizes persistidas inválidas');
    expect(ap.selo).toBe(false);
    const cobertura = ap.propriedades[0];
    expect(cobertura.situacao).toContain('Nenhuma das 6 identidades');
    for (const i of IDENTIDADES_ESPERADAS) {
      expect(cobertura.detalhes.find(d => d.startsWith(`${i.rotulo}:`))).toContain('JSON inválido');
    }
    expect(ap.propriedades[1].situacao).toContain('Ausente por não haver envio');
    expect(ap.propriedades[2].situacao).toContain('não aplicável');
  });

  test('CONTRAEXEMPLO: não é a mensagem genérica de P2, não reconstrói e não chama o serviço', async () => {
    const calc = calculoPersistidoInvalido();
    const { buscar, chamadas } = fetchSimulado(new Error('não deveria ser chamado'));
    const ap = await executarValidacao(calc, buscar);
    expect(chamadas).toHaveLength(0);
    expect(ap.codigo).toBe('P1');
    expect(ap.manchete).not.toBe('Comparação não executada');
    expect(prepararEnvio(calc).reconstruida).toBe(false);
    expect(html(ap)).not.toContain('Comparação não executada');
  });
});

describe('P2, comparação não executada', () => {
  const casos: [string, any, string][] = [
    ['sem cálculo', null, 'sem_calculo'],
    ['ausência total sem pesos', { bocrConsistency: { cr: 0.1 } }, 'ausencia_total_sem_pesos'],
    ['reconstrução sem matriz utilizável', { bocrWeights: [1, 0, 1, 1] }, 'reconstrucao_sem_matriz_utilizavel'],
  ];

  test.each(casos)('POSITIVO (%s): manchete, seis identidades nomeadas com a razão, três propriedades, sem selo', (_n, calc, motivo) => {
    const envio = prepararEnvio(calc);
    expect(envio.motivoDeNaoEnvio).toBe(motivo);
    const ap = classificarEstado({ envio, resposta: null });
    expect(ap.codigo).toBe('P2');
    expect(ap.manchete).toBe('Comparação não executada');
    expect(ap.selo).toBe(false);
    expect(ap.propriedades[0].detalhes).toHaveLength(6);
    for (const i of IDENTIDADES_ESPERADAS) {
      expect(ap.propriedades[0].detalhes.some(d => d.startsWith(`${i.rotulo}:`))).toBe(true);
    }
    expect(ap.propriedades[1].situacao).toContain('não haver envio');
    expect(ap.propriedades[2].situacao).toContain('Não exibido');
  });

  test('CONTRAEXEMPLO: nenhum veredito nem selo, e o texto não prescreve ação sobre os dados', () => {
    for (const [, calc] of casos) {
      const ap = classificarEstado({ envio: prepararEnvio(calc), resposta: null });
      const h = html(ap);
      expect(seloDoHtml(h)).toBe('nao');
      expect(h).not.toContain('✅');
      expect(h).not.toMatch(/[Aa]prova[çc]/);
      expect(h).not.toMatch(/[Rr]ecalcul/);
      expect(h).not.toContain('Execute o cálculo');
    }
  });
});

describe('P3, falha ao obter a comparação', () => {
  const chamar = (r: Parameters<typeof fetchSimulado>[0]) => {
    const f = fetchSimulado(r);
    return executarValidacao(calculoCompleto(), f.buscar).then(ap => ({ ap, chamadas: f.chamadas }));
  };

  test('POSITIVO: status não-OK com corpo da rota: a origem (status, error, details) aparece', async () => {
    const { ap, chamadas } = await chamar({
      ok: false,
      status: 502,
      texto: JSON.stringify({ error: 'Validator returned 502', details: 'upstream caiu' }),
    });
    expect(ap.codigo).toBe('P3');
    expect(ap.manchete).toBe('Falha ao obter a comparação');
    expect(ap.descricao).toContain('status HTTP 502');
    expect(ap.descricao).toContain('Validator returned 502');
    expect(ap.descricao).toContain('upstream caiu');
    expect(ap.propriedades[0].detalhes.filter(d => d.startsWith('Enviada:'))).toHaveLength(6);
    expect(ap.propriedades[1].situacao).toContain('Ausente por não haver resposta');
    expect(ap.propriedades[2].situacao).toBe('Não obtido.');
    expect(ap.selo).toBe(false);
    // a chamada foi feita uma vez, por POST, com o corpo que o componente já enviava
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].url).toBe('/api/validate-external');
    expect(chamadas[0].init.method).toBe('POST');
    expect(JSON.parse(chamadas[0].init.body)).toEqual({
      action: 'validate-project',
      matrices: prepararEnvio(calculoCompleto()).matrices,
    });
  });

  test('POSITIVO: exceção de transporte', async () => {
    const { ap } = await chamar(new Error('network down'));
    expect(ap.codigo).toBe('P3');
    expect(ap.descricao).toContain('network down');
  });

  test('POSITIVO: resposta OK cujo corpo não é JSON é exceção, tratada como P3', async () => {
    const { ap } = await chamar({ ok: true, status: 200, texto: '<html>nao json</html>' });
    expect(ap.codigo).toBe('P3');
    expect(ap.descricao).toContain('não pôde ser lido como JSON');
  });

  test('POSITIVO: corpo não-OK que não é JSON vira detalhe; detalhe longo é truncado e dito truncado', () => {
    const curto = origemDaFalhaHttp(500, 'erro simples');
    expect(curto.detalhes).toBe('erro simples');
    expect(curto.detalhesTruncado).toBe(false);
    const longo = origemDaFalhaHttp(500, JSON.stringify({ error: 'x', details: 'a'.repeat(1000) }));
    expect(longo.detalhes).toHaveLength(300);
    expect(longo.detalhesTruncado).toBe(true);
    expect(origemDaFalhaHttp(503, '').detalhes).toBeUndefined();
  });

  test('CONTRAEXEMPLO: a falha NÃO se confunde com P2 nem com um veredito, por rótulo, descrição e detalhes', async () => {
    const { ap } = await chamar({ ok: false, status: 500, texto: '' });
    const p2 = classificarEstado({ envio: prepararEnvio(null), resposta: null });
    expect(ap.manchete).not.toBe(p2.manchete);
    expect(ap.descricao).not.toBe(p2.descricao);
    expect(ap.propriedades[2].situacao).not.toBe(p2.propriedades[2].situacao);
    expect(ap.propriedades[1].situacao).not.toBe(p2.propriedades[1].situacao);
    const h = html(ap);
    expect(h).not.toMatch(/Aprovad|Reprovad/);
    expect(h).not.toContain('Execute o cálculo');
  });
});

describe('P4, resposta inválida', () => {
  const lixos: [string, any][] = [
    ['objeto vazio', {}],
    ['nulo', null],
    ['texto', 'ok'],
    ['arranjo', []],
    ['results nulo', { results: null, all_valid: true }],
    ['results vazio', { results: {}, all_valid: true, summary: {} }],
  ];

  test.each(lixos)('POSITIVO (%s): manchete, cobertura distinguindo ausente de inaproveitável, três propriedades, sem exceção', (_n, corpo) => {
    const ap = estado(calculoCompleto(), () => corpo);
    expect(ap.codigo).toBe('P4');
    expect(ap.manchete).toBe('Resposta inválida');
    expect(ap.selo).toBe(false);
    expect(ap.propriedades[0].detalhes.filter(d => d.includes('chave ausente na resposta'))).toHaveLength(6);
    expect(ap.propriedades[1].situacao).toContain('nenhuma entrada ao menos parcialmente utilizável');
    expect(ap.propriedades[2].situacao).toContain('Não confirmado');
    expect(() => html(ap)).not.toThrow();
  });

  test('chave presente e inaproveitável é distinguida de chave ausente', () => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e);
      for (const k of Object.keys(r.results)) r.results[k] = entrada(99);
      delete r.results['Risks Subcritérios'];
      return r;
    });
    expect(ap.codigo).toBe('P4');
    const det = ap.propriedades[0].detalhes;
    expect(det.find(d => d.startsWith('Risks Subcritérios'))).toContain('chave ausente na resposta');
    expect(det.find(d => d.startsWith('BOCR Méritos'))).toContain('chave presente e inaproveitável');
  });

  test('CONTRAEXEMPLO: sem NaN, sem texto de aprovação, e um all_valid false sem entradas NÃO é reprovação', () => {
    for (const [, corpo] of lixos) {
      const h = html(estado(calculoCompleto(), () => corpo));
      expect(h).not.toContain('NaN');
      expect(h).not.toMatch(/Aprovação|APROVADA/);
    }
    const ap = estado(calculoCompleto(), () => ({ all_valid: false, results: {} }));
    expect(ap.codigo).toBe('P4');
    expect(html(ap)).not.toContain('Reprovação relatada');
  });
});

describe('P5, veredito global não confirmado', () => {
  test.each([
    ['all_valid string "true"', 'true'],
    ['all_valid 1', 1],
    ['all_valid string "false"', 'false'],
    ['all_valid objeto', {}],
  ])('POSITIVO e CONTRAEXEMPLO: %s NÃO produz aprovação nem reprovação, e as entradas aproveitáveis ficam visíveis', (_n, valor) => {
    const ap = estado(calculoCompleto(), e => retornoCompleto(e, { all_valid: valor }));
    expect(ap.codigo).toBe('P5');
    expect(ap.manchete).toBe('Veredito global não confirmado');
    expect(ap.selo).toBe(false);
    expect(ap.linhas).toHaveLength(6);
    expect(ap.propriedades[2].situacao).toBe('Global não confirmado.');
    const h = html(ap);
    expect(seloDoHtml(h)).toBe('nao');
    expect(h).not.toContain('✅');
    expect(h).not.toContain('Aprovação relatada');
    expect(h).not.toContain('Reprovação relatada');
  });

  test('all_valid ausente também cai em P5', () => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e);
      delete r.all_valid;
      return r;
    });
    expect(ap.codigo).toBe('P5');
  });

  test.each([
    ['1. chave enviada que não voltou', (r: any) => { delete r.results['Risks Subcritérios']; r.summary.total_matrices = 5; r.summary.valid_matrices = 5; }, 1],
    ['1. chave devolvida que não foi enviada', (r: any) => { r.results['Extra'] = entrada(5); r.summary.total_matrices = 7; r.summary.valid_matrices = 7; }, 1],
    ['2. total_matrices diferente do número de entradas', (r: any) => { r.summary.total_matrices = 5; }, 2],
    ['3. valid_matrices diferente da contagem', (r: any) => { r.summary.valid_matrices = 4; }, 3],
    ['4. all_valid true com entrada não válida', (r: any) => { r.results['Costs Subcritérios'].valid = false; r.summary.valid_matrices = 5; }, 4],
    ['5. all_valid false com todas válidas', (r: any) => { r.all_valid = false; }, 5],
  ])('POSITIVO: contradição exata %s é P5, conserva os dois valores e as fontes, e impede o selo', (_n, muta, codigo) => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e);
      muta(r);
      return r;
    });
    expect(ap.codigo).toBe('P5');
    expect(ap.selo).toBe(false);
    const c = ap.contradicoes.find(x => x.codigo === codigo)!;
    expect(c).toBeDefined();
    const causa = ap.causas.find(t => t.startsWith(`Contradição ${codigo}:`))!;
    expect(causa).toContain(c.a.fonte);
    expect(causa).toContain(c.a.valor);
    expect(causa).toContain(c.b.fonte);
    expect(causa).toContain(c.b.valor);
    expect(html(ap)).toContain(c.a.fonte);
  });

  test('chave que não voltou fica nomeada como ausente, e a inesperada como inesperada', () => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e);
      delete r.results['Risks Subcritérios'];
      r.results['Extra'] = entrada(5);
      return r;
    });
    expect(ap.codigo).toBe('P5');
    const det = ap.propriedades[0].detalhes;
    expect(det).toContain('Enviada e não devolvida (ausente na resposta): Risks Subcritérios');
    expect(det).toContain('Devolvida e não enviada (inesperada, sem cobertura): Extra');
  });

  test.each([
    ['max_cr_diff não finito', (r: any) => { r.summary.max_cr_diff = 'x'; }],
    ['issues ausente', (r: any) => { delete r.summary.issues; }],
    ['total_matrices em texto', (r: any) => { r.summary.total_matrices = '6'; }],
  ])('envelope inválido (%s) é P5, e o valid de cada matriz continua legível', (_n, muta) => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e);
      muta(r);
      return r;
    });
    expect(ap.codigo).toBe('P5');
    expect(ap.linhas).toHaveLength(6);
    expect(ap.linhas.every(l => l.veredito.valor === 'sim')).toBe(true);
    expect(ap.causas.some(c => c.startsWith('Envelope:'))).toBe(true);
  });

  test('entrada com valid não booleano aparece como "não confirmado", e os campos válidos seguem exibidos', () => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e, { all_valid: 'x' });
      r.results['BOCR Méritos'].valid = 'sim';
      return r;
    });
    const linha = ap.linhas.find(l => l.chave === 'BOCR Méritos')!;
    expect(linha.veredito.valor).toBe('nao_confirmado');
    expect(linha.deltaPesos.avaliado).toBe(true);
  });
});

describe('P6, comparação de matrizes reconstruídas', () => {
  const p6 = (sobre: any = {}) => estado(calculoSoComPesos(), e => retornoCompleto(e, sobre));

  test('POSITIVO: manchete própria, origem como matriz reconstruída dos pesos, cobertura das seis NÃO satisfeita, sem selo', () => {
    const ap = p6();
    expect(ap.codigo).toBe('P6');
    expect(ap.manchete).toBe('Comparação de matrizes reconstruídas');
    expect(ap.origem.rotulo).toBe('Matrizes reconstruídas dos pesos');
    expect(ap.selo).toBe(false);
    expect(ap.propriedades[0].situacao).toContain('Cobertura das seis identidades não satisfeita');
    expect(ap.propriedades[1].situacao).toContain('matrizes reconstruídas');
    expect(ap.propriedades[2].situacao).toContain('restrito às matrizes reconstruídas dos pesos');
    expect(ap.propriedades[2].situacao).toContain('não é aprovação do conjunto completo nem dos julgamentos originais');
  });

  test('CONTRAEXEMPLO: aprovação do serviço NÃO vira selo nem aprovação dos julgamentos; false NÃO vira reprovação', () => {
    for (const all_valid of [true, false]) {
      const ap = estado(calculoSoComPesos(), e => {
        const r = retornoCompleto(e, { all_valid });
        if (!all_valid) {
          r.results['BOCR Méritos'].valid = false;
          r.summary.valid_matrices = r.summary.total_matrices - 1;
        }
        return r;
      });
      expect(ap.codigo).toBe('P6');
      const h = html(ap);
      expect(seloDoHtml(h)).toBe('nao');
      expect(h).not.toContain('✅');
      expect(h).not.toContain('Aprovação relatada');
      expect(h).not.toContain('Reprovação relatada');
    }
  });

  test('CONTRAEXEMPLO: nenhum dos textos antigos (CR sempre, recálculo, validação completa) aparece', () => {
    const h = html(p6());
    expect(h).not.toContain('CR sempre');
    expect(h).not.toMatch(/[Rr]ecalcule/);
    expect(h).not.toContain('validação completa');
    expect(h).not.toContain('atestando');
  });

  test('a reconstrução só vale na ausência total: com chave persistida presente o estado nunca é P6', () => {
    const calc = calculoSoComPesos();
    calc.aggregatedMatrices = { bocr: 'xx' };
    const ap = classificarEstado({ envio: prepararEnvio(calc), resposta: null });
    expect(ap.codigo).toBe('P1');
  });

  test('a origem reconstruída aparece no bloco de veredito, no bloco de origem e na legenda da tabela', () => {
    const h = html(p6());
    expect((h.match(/Matrizes reconstruídas dos pesos/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

describe('P7, comparação incompleta', () => {
  test('POSITIVO: persistida parcial, com a identidade ausente NOMEADA', () => {
    const calc = calculoCompleto();
    delete calc.aggregatedMatrices.magnitude;
    const ap = estado(calc, e => retornoCompleto(e));
    expect(ap.codigo).toBe('P7');
    expect(ap.manchete).toBe('Comparação incompleta');
    expect(ap.descricao).toContain('Magnitude (Rescaling)');
    expect(ap.propriedades[0].situacao).toBe('Incompleta: 5 de 6 identidades enviadas e devolvidas.');
    expect(ap.propriedades[0].detalhes.some(d => d.startsWith('Não enviada: Magnitude (Rescaling)'))).toBe(true);
    expect(ap.selo).toBe(false);
  });

  test('CONTRAEXEMPLO: cobertura completa com CR local AUSENTE não produz P8; a dimensão CR é nomeada', () => {
    const calc = calculoCompleto();
    delete calc.bocrConsistency;
    const ap = estado(calc, e => retornoCompleto(e));
    expect(ap.codigo).toBe('P7');
    expect(ap.propriedades[0].situacao).toContain('Completa');
    expect(ap.descricao).toContain('BOCR Méritos: dimensão CR sem resultado utilizável');
    const linha = ap.linhas.find(l => l.chave === 'BOCR Méritos')!;
    expect(linha.crSistema.texto).toBe('não avaliado');
    expect(linha.crSistema.nota).toContain('valor substituto');
    expect(linha.deltaCR.nota).toContain('valor substituto');
    expect(linha.deltaCR.avaliado).toBe(false);
    expect(linha.deltaCR.faixa).toBeUndefined();
    expect(html(ap)).not.toContain('Aprovação relatada');
  });

  // ⚠ ALTERADO (impedimento 3). Este teste exigia `deltaCR.nota` contendo 'valor substituto' para um CR local
  // NEGATIVO. Mas a coerção `|| 0` só substitui valor falsy: -0.2 é verdadeiro e foi ENVIADO como está, então a
  // nota "valor substituto" era falsa. Passa a exigir a nota de inválido PRESERVADO, sem a palavra "substituto".
  test('CONTRAEXEMPLO: CR local INVÁLIDO é identificado como inválido e também leva a P7', () => {
    const calc = calculoCompleto();
    calc.magnitudeConsistency = { cr: -0.2 };
    const ap = estado(calc, e => retornoCompleto(e));
    expect(ap.codigo).toBe('P7');
    const linha = ap.linhas.find(l => l.chave === 'Magnitude (Rescaling)')!;
    expect(linha.crSistema.texto).toBe('inválido');
    expect(linha.crSistema.nota).toContain('CR local inválido');
    expect(linha.crSistema.nota).toContain('a coerção (|| 0) preservou o valor');
    expect(linha.crSistema.nota).toContain('o corpo da requisição carrega -0.2');
    expect(linha.deltaCR.nota).not.toContain('substituto');
    expect(linha.deltaCR.nota).toContain('o corpo da requisição carrega -0.2');
    expect(ap.propriedades[1].detalhes.find(d => d.startsWith('Magnitude (Rescaling)'))).toContain('CR local inválido');
  });

  test('CONTRAEXEMPLO: um zero finito medido NÃO é tratado como ausência (P8, e não P7)', () => {
    const calc = calculoCompleto();
    calc.subConsistency.C = { cr: 0 };
    const ap = estado(calc, e => {
      const r = retornoCompleto(e);
      r.results['Costs Subcritérios'].your_cr = 0;
      return r;
    });
    expect(ap.codigo).toBe('P8');
    expect(ap.linhas.find(l => l.chave === 'Costs Subcritérios')!.crSistema.texto).toBe('0.00%');
  });

  test.each([
    ['cr_diff ausente em uma entrada', (r: any) => { delete r.results['Costs Subcritérios'].cr_diff; }],
    ['sdk_cr não finito em uma entrada', (r: any) => { r.results['BOCR Méritos'].sdk_cr = NaN; }],
    ['max_weight_diff ausente em uma entrada', (r: any) => { delete r.results['BOCR Méritos'].max_weight_diff; }],
    ['uma entrada sem evidência (n divergente)', (r: any) => { r.results['Risks Subcritérios'].n = 9; }],
  ])('POSITIVO: cobertura completa mas %s é P7, nomeando a dimensão ou a entrada', (_n, muta) => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e);
      muta(r);
      return r;
    });
    expect(ap.codigo).toBe('P7');
    expect(ap.propriedades[0].situacao).toContain('Completa');
    expect(ap.descricao.length).toBeGreaterThan('Falta: .'.length);
    expect(ap.selo).toBe(false);
  });

  test('CONTRAEXEMPLO: um `false` recebido em P7 NÃO aparece como reprovação', () => {
    const calc = calculoCompleto();
    delete calc.aggregatedMatrices.magnitude;
    const ap = estado(calc, e => {
      const r = retornoCompleto(e, { all_valid: false });
      r.results['BOCR Méritos'].valid = false;
      r.summary.valid_matrices = 4;
      return r;
    });
    expect(ap.codigo).toBe('P7');
    expect(ap.propriedades[2].situacao).toContain('não é reprovação do conjunto completo');
    expect(html(ap)).not.toContain('Reprovação relatada');
  });

  test('valid não booleano com all_valid false: P7 (entrada parcial), e a descrição nomeia o motivo', () => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e, { all_valid: false });
      r.results['BOCR Méritos'].valid = 'nao';
      r.results['Costs Subcritérios'].valid = false;
      r.summary.valid_matrices = 4;
      return r;
    });
    expect(ap.codigo).toBe('P7');
    expect(ap.descricao).toContain('BOCR Méritos: entrada parcialmente utilizável');
  });
});

describe('P8, aprovação relatada pelo serviço', () => {
  const p8 = () => estado(calculoCompleto(), e => retornoCompleto(e));

  test('POSITIVO: única condição com selo; as seis identidades; pesos e CR; aprovação ATRIBUÍDA ao serviço', () => {
    const ap = p8();
    expect(ap.codigo).toBe('P8');
    expect(ap.manchete).toBe('Aprovação relatada pelo serviço');
    expect(ap.selo).toBe(true);
    expect(ap.tom).toBe('aprovado');
    expect(ap.propriedades[0].situacao).toBe('Completa: as seis identidades foram enviadas e devolvidas.');
    expect(ap.propriedades[1].situacao).toBe('Pesos e CR informados e estruturalmente válidos em todas as entradas.');
    expect(ap.propriedades[2].situacao).toBe('Aprovado, atribuído ao serviço (all_valid = true).');
    const h = html(p8());
    expect(seloDoHtml(h)).toBe('sim');
    expect(h).toContain('✅');
  });

  test('CONTRAEXEMPLO: o selo (rótulo, ícone e cor do bloco) NÃO existe em nenhum outro estado', () => {
    const todos = NOVE_ESTADOS();
    for (const [codigo, ap] of Object.entries(todos)) {
      const h = html(ap);
      if (codigo === 'P8') {
        expect(ap.selo).toBe(true);
        expect(seloDoHtml(h)).toBe('sim');
        expect(h).toContain('✅');
        expect(h).toContain('bg-green-50');
      } else {
        expect(ap.selo).toBe(false);
        expect(seloDoHtml(h)).toBe('nao');
        expect(h).not.toContain('✅');
        expect(h).not.toContain('bg-green-50');
        expect(h).not.toContain('Aprovação relatada pelo serviço');
      }
    }
  });

  test('CONTRAEXEMPLO: nenhuma afirmação de precisão da implementação, nem de "comparação confirmada", em nenhum estado', () => {
    for (const ap of Object.values(NOVE_ESTADOS())) {
      const h = html(ap);
      expect(h).not.toMatch(/atestando/i);
      expect(h).not.toMatch(/precisão matemática/i);
      expect(h).not.toMatch(/comparação confirmada/i);
      expect(h).not.toMatch(/dentro (da|de) tolerância/i);
    }
  });

  test('o rótulo ATRIBUI a aprovação ao serviço e declara os limites', () => {
    const h = html(p8());
    expect(h).toContain('Aprovação relatada pelo serviço');
    expect(h).toContain('esta tela não verifica que ele executou a comparação');
    expect(h).toContain('Tolerância aplicada pelo serviço: não informada');
    expect(h).toContain('critério visual');
  });

  test('os máximos do resumo e das entradas são EXIBIDOS com a fonte e NÃO comparados: divergência numérica não impede o selo', () => {
    const ap = estado(calculoCompleto(), e =>
      retornoCompleto(e, { summary: { total_matrices: 6, valid_matrices: 6, max_weight_diff: 0.9, max_cr_diff: 0.8, issues: [] } })
    );
    expect(ap.codigo).toBe('P8');
    expect(ap.maximos).toEqual({
      resumoPesos: '90.000%',
      resumoCR: '80.000%',
      entradasPesos: '0.020%',
      entradasCR: '0.010%',
    });
    const h = html(ap);
    expect(h).toContain('summary.max_weight_diff');
    expect(h).toContain('calculado aqui');
  });

  test('CR zero finito medido e CR positivo coexistem: P8 não é bloqueado por zero', () => {
    const calc = calculoCompleto();
    calc.bocrConsistency = { cr: 0 };
    const ap = estado(calc, e => {
      const r = retornoCompleto(e);
      r.results['BOCR Méritos'].your_cr = 0;
      return r;
    });
    expect(ap.codigo).toBe('P8');
  });
});

describe('P9, reprovação relatada pelo serviço', () => {
  const p9 = () => NOVE_ESTADOS().P9;

  test('POSITIVO: rótulo próprio, atribuído ao serviço, evidências disponíveis visíveis, sem selo', () => {
    const ap = p9();
    expect(ap.codigo).toBe('P9');
    expect(ap.manchete).toBe('Reprovação relatada pelo serviço');
    expect(ap.selo).toBe(false);
    expect(ap.tom).toBe('reprovado');
    expect(ap.propriedades[0].situacao).toContain('Completa');
    expect(ap.propriedades[2].situacao).toBe('Reprovado, atribuído ao serviço (all_valid = false).');
    expect(ap.linhas).toHaveLength(6);
    const h = html(ap);
    expect(h).toContain('Risks Subcritérios');
    expect(seloDoHtml(h)).toBe('nao');
  });

  test('CONTRAEXEMPLO: é DISTINGUÍVEL de ressalvas por rótulo, descrição e detalhes; o texto antigo de ressalvas não existe', () => {
    const ap = p9();
    const p7 = NOVE_ESTADOS().P7;
    expect(ap.manchete).not.toBe(p7.manchete);
    expect(ap.descricao).not.toBe(p7.descricao);
    expect(ap.propriedades[2].situacao).not.toBe(p7.propriedades[2].situacao);
    for (const a of Object.values(NOVE_ESTADOS())) {
      expect(html(a)).not.toContain('VALIDAÇÃO COM RESSALVAS');
      expect(html(a)).not.toContain('VALIDAÇÃO APROVADA');
    }
  });

  test('a reprovação não afirma qual implementação está correta nem bloqueia ranking, exportação ou decisão', () => {
    const h = html(p9());
    expect(h).toContain('não determina qual implementação está correta');
    expect(h).toContain('não bloqueia ranking, exportação nem decisão');
  });

  test('reprovação SÓ em P9: `false` em P4 a P7 já foi mostrado não ser reprovação; aqui, as condições de P8 + false', () => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e, { all_valid: false });
      r.results['BOCR Méritos'].valid = false;
      r.summary.valid_matrices = 5;
      return r;
    });
    expect(ap.codigo).toBe('P9');
  });
});

// =============================================================================================
// 7. Transversais
// =============================================================================================

describe('as três propriedades são nomeadas nos nove estados', () => {
  test.each(['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'])('%s: cobertura, resultado informado e veredito, nesta ordem, nunca omitidas', codigo => {
    const ap = NOVE_ESTADOS()[codigo];
    expect(ap.codigo).toBe(codigo);
    expect(ap.propriedades.map(p => p.nome)).toEqual(['Cobertura', 'Resultado informado', 'Veredito']);
    for (const p of ap.propriedades) {
      expect(typeof p.situacao).toBe('string');
      expect(p.situacao.length).toBeGreaterThan(0);
    }
    const h = html(ap);
    expect(h).toContain('data-propriedade="cobertura"');
    expect(h).toContain('data-propriedade="resultado"');
    expect(h).toContain('data-propriedade="veredito"');
  });

  test('as nove manchetes são distintas entre si', () => {
    const manchetes = Object.values(NOVE_ESTADOS()).map(a => a.manchete);
    expect(new Set(manchetes).size).toBe(9);
  });

  test('a origem das matrizes aparece em todos os blocos que descrevem o resultado, em todos os estados', () => {
    for (const ap of Object.values(NOVE_ESTADOS())) {
      const h = html(ap);
      expect(h).toContain(`Origem das matrizes: ${ap.origem.rotulo}`);
      expect((h.match(new RegExp(ap.origem.rotulo.replace(/[()]/g, '\\$&'), 'g')) ?? []).length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('forma do retorno verificada ANTES de exibir: sem exceção, sem NaN, sem zero no lugar de campo ausente', () => {
  const malformados: [string, (r: any) => any][] = [
    ['sem summary', r => { delete r.summary; return r; }],
    ['sem results', r => { delete r.results; return r; }],
    ['sem summary.issues', r => { delete r.summary.issues; return r; }],
    ['results nulo', r => ({ ...r, results: null })],
    ['summary nulo', r => ({ ...r, summary: null })],
    ['corpo arranjo', () => []],
    ['corpo texto', () => 'x'],
    ['corpo nulo', () => null],
    ['entradas com campos NaN', r => { for (const k of Object.keys(r.results)) r.results[k] = entrada(r.results[k].n, { sdk_cr: NaN, cr_diff: Infinity, max_weight_diff: -Infinity, your_cr: NaN }); return r; }],
    ['entradas vazias', r => { for (const k of Object.keys(r.results)) r.results[k] = {}; return r; }],
    ['entradas nulas', r => { for (const k of Object.keys(r.results)) r.results[k] = null; return r; }],
    ['campos em texto', r => { for (const k of Object.keys(r.results)) r.results[k] = entrada(r.results[k].n, { sdk_cr: '0.1', cr_diff: '0.1', max_weight_diff: '0.1' }); return r; }],
  ];

  test.each(malformados)('%s: classifica e renderiza sem lançar, sem "NaN" e sem "undefined" na tela', (_n, muta) => {
    const envio = prepararEnvio(calculoCompleto());
    const corpo = muta(retornoCompleto(envio));
    let ap!: Apresentacao;
    expect(() => {
      ap = classificarEstado({ envio, resposta: { tipo: 'corpo', corpo } });
    }).not.toThrow();
    let h = '';
    expect(() => {
      h = html(ap);
    }).not.toThrow();
    expect(h).not.toContain('NaN');
    expect(h).not.toContain('undefined');
    expect(h).not.toContain('Infinity');
    expect(['P4', 'P5', 'P7']).toContain(ap.codigo);
  });

  test('campo ausente aparece como "não avaliado", e NÃO como zero', () => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e);
      delete r.results['BOCR Méritos'].max_weight_diff;
      delete r.results['BOCR Méritos'].sdk_cr;
      return r;
    });
    const linha = ap.linhas.find(l => l.chave === 'BOCR Méritos')!;
    expect(linha.deltaPesos.texto).toBe('não avaliado');
    expect(linha.crServico.texto).toBe('não avaliado');
    expect(linha.deltaPesos.texto).not.toMatch(/^0/);
    const h = html(ap);
    expect(h).toContain('não avaliado');
  });
});

describe('os quatro limiares de cor são critério visual, e nunca tolerância nem veredito', () => {
  test('as faixas seguem 0,1% e 1%, e a tela declara que a tolerância do serviço não é informada', () => {
    const ap = estado(calculoCompleto(), e => {
      const r = retornoCompleto(e);
      r.results['BOCR Méritos'].max_weight_diff = 0.0005;
      r.results['Magnitude (Rescaling)'].max_weight_diff = 0.005;
      r.results['Costs Subcritérios'].max_weight_diff = 0.05;
      return r;
    });
    const faixa = (chave: string) => ap.linhas.find(l => l.chave === chave)!.deltaPesos.faixa;
    expect(faixa('BOCR Méritos')).toBe('verde');
    expect(faixa('Magnitude (Rescaling)')).toBe('azul');
    expect(faixa('Costs Subcritérios')).toBe('ambar');
    const h = html(ap);
    expect(h).toContain('Tolerância aplicada pelo serviço: não informada');
    expect(h).toContain('não são tolerância nem veredito');
    // a faixa ambar NÃO muda o estado: continua P8 se o serviço aprovou
    expect(ap.codigo).toBe('P8');
  });
});

// ⚠ ACRESCENTADO (impedimento 4). A multiplicação por 100 ocorria ANTES da formatação, então um número FINITO
// suficientemente grande transbordava e `toFixed` devolvia "Infinity", que a tela imprimia como percentual. É
// LIMITE DE EXIBIÇÃO, e não invalidade de contrato: o campo segue válido, segue contando como resultado
// informado, e a classificação P1 a P9 NÃO muda por causa dele.
describe('limite de exibição: número finito cujo produto por 100 transborda não aparece como infinito', () => {
  const GRANDE = 1e307;

  test('premissa medida: o valor é finito e o produto por 100 não é', () => {
    expect(Number.isFinite(GRANDE)).toBe(true);
    expect(Number.isFinite(GRANDE * 100)).toBe(false);
    expect(`${(GRANDE * 100).toFixed(3)}%`).toBe('Infinity%'); // o defeito, como era
  });

  const comGrande = (campos: Record<string, number>, resumo: Record<string, number> = {}, sobre: any = {}) =>
    estado(calculoCompleto(), e => {
      const r = retornoCompleto(e, sobre);
      Object.assign(r.results['BOCR Méritos'], campos);
      Object.assign(r.summary, resumo);
      return r;
    });

  test('as células da tabela: texto de magnitude fora da faixa, SEM cor e SEM avaliação visual, e o estado não muda', () => {
    const base = estado(calculoCompleto(), e => retornoCompleto(e));
    const ap = comGrande({ sdk_cr: GRANDE, cr_diff: GRANDE, max_weight_diff: GRANDE, your_cr: GRANDE });
    expect(base.codigo).toBe('P8');
    expect(ap.codigo).toBe(base.codigo);
    const linha = ap.linhas.find(l => l.chave === 'BOCR Méritos')!;
    for (const c of [linha.crSistema, linha.crServico, linha.deltaCR, linha.deltaPesos]) {
      expect(c.texto).toBe(TEXTO_FORA_DA_FAIXA);
      expect(c.avaliado).toBe(false);
      expect(c.faixa).toBeUndefined();
    }
    expect(linha.deltaPesos.nota).toContain('valor finito informado pelo serviço');
    const h = html(ap);
    expect(h).not.toContain('Infinity');
    expect(h).toContain(TEXTO_FORA_DA_FAIXA);
  });

  test('a mesma entrada com valor comum CONTINUA colorida e avaliada (o caminho comum não mudou)', () => {
    const ap = comGrande({ max_weight_diff: 0.05 });
    const c = ap.linhas.find(l => l.chave === 'BOCR Méritos')!.deltaPesos;
    expect(c.texto).toBe('5.000%');
    expect(c.avaliado).toBe(true);
    expect(c.faixa).toBe('ambar');
  });

  test.each([
    ['summary.max_weight_diff', {}, { max_weight_diff: GRANDE }, 'resumoPesos'],
    ['summary.max_cr_diff', {}, { max_cr_diff: GRANDE }, 'resumoCR'],
    ['máximo das entradas, pesos', { max_weight_diff: GRANDE }, {}, 'entradasPesos'],
    ['máximo das entradas, CR', { cr_diff: GRANDE }, {}, 'entradasCR'],
  ] as [string, any, any, 'resumoPesos' | 'resumoCR' | 'entradasPesos' | 'entradasCR'][])(
    'o máximo %s fora da faixa: SÓ ele vira texto de magnitude fora da faixa, sem Infinity e sem mudar o estado',
    (_n, campos, resumo, qual) => {
      const ap = comGrande(campos, resumo);
      expect(ap.codigo).toBe('P8');
      expect(ap.maximos![qual]).toBe(TEXTO_FORA_DA_FAIXA);
      const outros = (['resumoPesos', 'resumoCR', 'entradasPesos', 'entradasCR'] as const).filter(k => k !== qual);
      // os demais máximos: o das entradas segue o valor da entrada, o do resumo segue o resumo
      const algumForaIndevido = outros.filter(k => ap.maximos![k] === TEXTO_FORA_DA_FAIXA);
      expect(algumForaIndevido).toEqual([]);
      const h = html(ap);
      expect(h).not.toContain('Infinity');
      expect(h).toContain(TEXTO_FORA_DA_FAIXA);
    }
  );

  test('todos os quatro máximos juntos, e os campos da tabela: zero ocorrências de "Infinity" no texto RENDERIZADO', () => {
    const ap = comGrande(
      { sdk_cr: GRANDE, cr_diff: GRANDE, max_weight_diff: GRANDE },
      { max_weight_diff: GRANDE, max_cr_diff: GRANDE }
    );
    expect(Object.values(ap.maximos!)).toEqual(Array(4).fill(TEXTO_FORA_DA_FAIXA));
    const h = html(ap);
    expect(h.match(/Infinity/g) ?? []).toHaveLength(0);
    expect(h.match(/NaN/g) ?? []).toHaveLength(0);
  });

  test.each([
    ['P7 (CR local ausente)', (c: any) => { delete c.bocrConsistency; }, {}, 'P7'],
    ['P9 (all_valid false)', () => {}, { all_valid: false }, 'P9'],
    ['P8', () => {}, {}, 'P8'],
  ] as [string, (c: any) => void, any, string][])(
    'a classificação não muda por causa do limite de exibição: %s',
    (_n, muta, sobre, esperado) => {
      const calc = calculoCompleto();
      muta(calc);
      const monta = (grande: boolean) =>
        estado(calc, e => {
          const r = retornoCompleto(e, sobre);
          if (sobre.all_valid === false) {
            r.results['Risks Subcritérios'].valid = false;
            r.summary.valid_matrices = 5;
          }
          if (grande) Object.assign(r.results['BOCR Méritos'], { sdk_cr: GRANDE, cr_diff: GRANDE, max_weight_diff: GRANDE });
          return r;
        });
      expect(monta(false).codigo).toBe(esperado);
      expect(monta(true).codigo).toBe(esperado);
    }
  );

  test('os nove estados renderizados não contêm "Infinity" nem "NaN"', () => {
    for (const ap of Object.values(NOVE_ESTADOS())) {
      const h = html(ap);
      expect(h).not.toContain('Infinity');
      expect(h).not.toContain('NaN');
    }
  });
});

describe('o componente: ausência dos textos que saem desta frente, e leitura do veredito', () => {
  const raiz = join(__dirname, '..', '..');
  const arquivos = [
    'components/ExternalValidation.tsx',
    'lib/validacao-externa/conjunto-esperado.ts',
    'lib/validacao-externa/matriz-utilizavel.ts',
    'lib/validacao-externa/contrato-retorno.ts',
    'lib/validacao-externa/precedencia.ts',
  ];
  const lido = (rel: string) => readFileSync(join(raiz, rel), 'utf8');

  test.each([
    ['atestando a precisão'],
    ['CR sempre'],
    ['recalcule'],
    ['Recalcule'],
    ['validação completa'],
    ['Citação para dissertação'],
  ])('zero ocorrências de "%s" no componente e nos módulos (código, comentários e texto de tela)', padrao => {
    for (const rel of arquivos) expect(lido(rel)).not.toContain(padrao);
  });

  test('o componente não lê `all_valid` nem `.valid` de resposta algum: a interpretação do veredito está no módulo do contrato', () => {
    const c = lido('components/ExternalValidation.tsx');
    expect(c).not.toMatch(/all_valid/);
    expect(c).not.toMatch(/\br\.valid\b/);
    expect(c).not.toMatch(/result\./);
  });

  test('nos módulos, `all_valid` e `valid` só são lidos por comparação com booleano explícito, nunca por veracidade', () => {
    const contrato = lido('lib/validacao-externa/contrato-retorno.ts');
    const prec = lido('lib/validacao-externa/precedencia.ts');
    for (const src of [contrato, prec]) {
      expect(src).not.toMatch(/if\s*\(\s*!?\s*\w*\.?(all_valid|valid)\s*\)/);
      expect(src).not.toMatch(/(all_valid|\.valid)\s*(\?|&&|\|\|)/);
      expect(src).not.toMatch(/!\s*\w+\.(all_valid|valid)\b/);
    }
    expect(contrato).toMatch(/c\.all_valid === true \|\| c\.all_valid === false/);
    expect(contrato).toMatch(/r\.valid === true \? 'verdadeiro' : r\.valid === false \? 'falso'/);
  });

  test('o texto de aviso antigo de matrizes reconstruídas foi substituído por texto que descreve a origem e não prescreve ação', () => {
    const ap = estado(calculoSoComPesos(), e => retornoCompleto(e));
    const h = html(ap);
    expect(h).toContain('razões entre pesos');
    expect(h).toContain('não é evidência sobre os julgamentos originais');
  });
});

describe('o componente real, renderizado no servidor (estado inicial), descreve a origem e a prévia', () => {
  const inicial = (calculation: any) =>
    renderToStaticMarkup(React.createElement(ExternalValidation as any, { calculation, project: {} }));

  test('persistida completa: seis matrizes utilizáveis e a origem nomeada', () => {
    const h = inicial(calculoCompleto());
    expect(h).toContain('Executar Validação (6 matrizes)');
    expect(h).toContain('Origem das matrizes: Matrizes persistidas, completas');
    expect(h).not.toContain('Citação para dissertação');
  });

  test('persistida parcial: a prévia NOMEIA a identidade descartada e a razão', () => {
    const calc = calculoCompleto();
    calc.aggregatedMatrices.magnitude = '{"x":1}';
    const h = inicial(calc);
    expect(h).toContain('Executar Validação (5 matrizes)');
    expect(h).toContain('Matrizes persistidas, parciais');
    expect(h).toContain('Magnitude (Rescaling)');
    expect(h).toContain('não decodifica em arranjo de arranjos de números');
  });

  test('presente e inválida: nenhuma matriz utilizável, e a prévia diz isso sem prescrever ação', () => {
    const h = inicial(calculoPersistidoInvalido());
    expect(h).toContain('Executar Validação (0 matrizes)');
    expect(h).toContain('Matrizes persistidas presentes e inválidas');
    expect(h).not.toMatch(/[Rr]ecalcul/);
  });

  test('ausência total: a prévia nomeia a origem reconstruída e não afirma validação nem CR', () => {
    const h = inicial(calculoSoComPesos());
    expect(h).toContain('Executar Validação (5 matrizes)');
    expect(h).toContain('Matrizes reconstruídas dos pesos');
    expect(h).not.toContain('validação completa');
    expect(h).not.toContain('CR sempre');
  });

  test('sem cálculo: zero matrizes e nenhuma prévia de origem', () => {
    const h = inicial(null);
    expect(h).toContain('Executar Validação (0 matrizes)');
    expect(h).not.toContain('Origem das matrizes');
  });

  test('o estado inicial não mostra bloco de veredito nem selo', () => {
    const h = inicial(calculoCompleto());
    expect(h).not.toContain('data-bloco="veredito"');
    expect(h).not.toContain('✅');
  });
});

// ⚠ TÍTULO ALTERADO (precisão 5). Era "executarValidacao nunca lança", que NÃO estava demonstrado para toda
// entrada aceita: `prepararEnvio` rodava fora do `try` e a serialização do CR bruto lançava para BigInt e para
// estrutura circular. O título passa a dizer o DOMÍNIO, demonstrado no bloco "proteção" mais abaixo.
describe('orquestração: executarValidacao não lança no domínio declarado de prepararEnvio e só chama o serviço quando há matriz utilizável e corpo gerado', () => {
  test('caminho completo até P8, com o fetch simulado devolvendo o corpo coerente', async () => {
    const envio = prepararEnvio(calculoCompleto());
    const { buscar, chamadas } = fetchSimulado({ ok: true, status: 200, texto: JSON.stringify(retornoCompleto(envio)) });
    const ap = await executarValidacao(calculoCompleto(), buscar);
    expect(chamadas).toHaveLength(1);
    expect(ap.codigo).toBe('P8');
  });

  test('o fetch que lança ou o text() que lança viram P3, sem exceção', async () => {
    const f1 = fetchSimulado(new Error('x'));
    expect((await executarValidacao(calculoCompleto(), f1.buscar)).codigo).toBe('P3');
    const buscar: Buscar = async () => ({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error('corpo ilegível');
      },
    });
    const ap = await executarValidacao(calculoCompleto(), buscar);
    expect(ap.codigo).toBe('P3');
    expect(ap.descricao).toContain('status HTTP 500');
  });

  test('sem cálculo e com cálculo só de CR não chamam o serviço', async () => {
    for (const calc of [null, { bocrConsistency: { cr: 0.1 } }]) {
      const f = fetchSimulado(new Error('não deveria ser chamado'));
      const ap = await executarValidacao(calc, f.buscar);
      expect(f.chamadas).toHaveLength(0);
      expect(ap.codigo).toBe('P2');
    }
  });

  test('o documento de cálculo recebido não é alterado pela orquestração', async () => {
    const calc = calculoCompleto();
    const antes = JSON.stringify(calc);
    const envio = prepararEnvio(calc);
    const f = fetchSimulado({ ok: true, status: 200, texto: JSON.stringify(retornoCompleto(envio)) });
    await executarValidacao(calc, f.buscar);
    expect(JSON.stringify(calc)).toBe(antes);
  });
});

// ⚠ ACRESCENTADO (precisão 5). A proteção alcança os DOIS caminhos que chamam `prepararEnvio`: a orquestração
// (`executarValidacao`) e a PRÉVIA do componente (que a chama direto, fora de qualquer try). Mudar só o título
// deixaria a prévia lançando. OMISSÃO (função, símbolo) e FALHA (BigInt, estrutura circular) são coisas
// diferentes: a primeira não impede o corpo e omite a chave; a segunda impede o corpo, e nada é enviado.
describe('proteção: CR bruto hostil não faz prepararEnvio, a prévia do componente nem executarValidacao lançarem', () => {
  const circular: any = { a: 1 };
  circular.self = circular;
  const comCR = (bruto: any) => {
    const c = calculoCompleto();
    c.bocrConsistency = { cr: bruto };
    return c;
  };
  const previa = (calculation: any) =>
    renderToStaticMarkup(React.createElement(ExternalValidation as any, { calculation, project: {} }));
  const respostaCoerente = () =>
    ({ ok: true, status: 200, texto: JSON.stringify(retornoCompleto(prepararEnvio(calculoCompleto()))) }) as const;

  const hostis: [string, any, 'omitida' | 'falha' | 'gerada'][] = [
    ['BigInt', BigInt(10), 'falha'],
    ['estrutura circular', circular, 'falha'],
    ['função', () => 1, 'omitida'],
    ['símbolo', Symbol('s'), 'omitida'],
    ['NaN', NaN, 'gerada'],
    ['Infinity', Infinity, 'gerada'],
    ['-Infinity', -Infinity, 'gerada'],
    ['negativo', -5, 'gerada'],
    ['texto', 'abc', 'gerada'],
  ];

  test.each(hostis)('%s: prepararEnvio não lança, e o registro diz %s', (_n, bruto, serializacao) => {
    let e!: Envio;
    expect(() => {
      e = prepararEnvio(comCR(bruto));
    }).not.toThrow();
    expect(e.condicao).toBe('persistida_completa');
    expect(e.procedenciaCR['bocr']!.serializacao).toBe(serializacao);
  });

  test.each(hostis)('%s: a PRÉVIA do componente (segundo caminho) não lança e continua contando as seis matrizes', (_n, bruto) => {
    let h = '';
    expect(() => {
      h = previa(comCR(bruto));
    }).not.toThrow();
    expect(h).toContain('Executar Validação (6 matrizes)');
    expect(h).toContain('Origem das matrizes: Matrizes persistidas, completas');
  });

  test.each(hostis)('%s: executarValidacao RESOLVE (não rejeita) com um estado apresentável', async (_n, bruto) => {
    const f = fetchSimulado(respostaCoerente());
    const ap = await executarValidacao(comCR(bruto), f.buscar);
    expect(ap.codigo).toMatch(/^P[1-9]$/);
    expect(() => html(ap)).not.toThrow();
  });

  test.each([['função', () => 1], ['símbolo', Symbol('s')]])(
    'OMISSÃO (%s): o corpo é gerado SEM a chave your_cr, o serviço é chamado, e o estado é P7 (CR local inválido), não P3',
    async (_n, bruto) => {
      const f = fetchSimulado(respostaCoerente());
      const ap = await executarValidacao(comCR(bruto), f.buscar);
      expect(f.chamadas).toHaveLength(1);
      const corpo = JSON.parse(f.chamadas[0].init.body);
      expect(corpo.matrices['BOCR Méritos']).not.toHaveProperty('your_cr');
      expect(corpo.matrices['Magnitude (Rescaling)']).toHaveProperty('your_cr', 0.01);
      expect(ap.codigo).toBe('P7');
      expect(ap.descricao).toContain('BOCR Méritos: dimensão CR sem resultado utilizável');
      expect(ap.linhas.find(l => l.chave === 'BOCR Méritos')!.crSistema.nota).toContain('omitido do corpo da requisição');
    }
  );

  test.each([['BigInt', BigInt(10)], ['estrutura circular', circular]])(
    'FALHA (%s): o serviço NÃO é chamado, nada é enviado, o estado é P3 e o texto diz falha de serialização sem afirmar envio',
    async (_n, bruto) => {
      const f = fetchSimulado(respostaCoerente());
      const ap = await executarValidacao(comCR(bruto), f.buscar);
      expect(f.chamadas).toHaveLength(0);
      expect(ap.codigo).toBe('P3');
      expect(ap.descricao).toContain('Nada foi enviado ao serviço');
      expect(ap.descricao).toContain('Falha de serialização');
      expect(ap.descricao).not.toContain('A chamada falhou');
      expect(ap.descricao).not.toContain('respondeu');
      const cobertura = ap.propriedades[0];
      expect(cobertura.situacao).toContain('Preparado para envio: 6 de 6 identidades');
      expect(cobertura.situacao).toContain('nada foi enviado');
      expect(cobertura.detalhes.some(d => d.startsWith('Enviada:'))).toBe(false);
      expect(cobertura.detalhes.filter(d => d.startsWith('Preparada, não enviada:'))).toHaveLength(6);
      expect(ap.selo).toBe(false);
      const h = html(ap);
      expect(h).toContain('Falha de serialização');
      expect(h).not.toContain('Aprovação relatada');
    }
  );

  test('o P3 comum (status HTTP) continua dizendo que foi enviado: a distinção é feita pela natureza da falha', async () => {
    const f = fetchSimulado({ ok: false, status: 502, texto: '{}' });
    const ap = await executarValidacao(calculoCompleto(), f.buscar);
    expect(f.chamadas).toHaveLength(1);
    expect(ap.codigo).toBe('P3');
    expect(ap.propriedades[0].situacao).toContain('Enviado: 6 de 6 identidades');
    expect(ap.propriedades[0].detalhes.filter(d => d.startsWith('Enviada:'))).toHaveLength(6);
    expect(ap.descricao).not.toContain('Falha de serialização');
  });

  // O DOMÍNIO demonstrado: valores hostis em OUTROS campos do documento, não só no CR.
  const mutadores: [string, (c: any) => void][] = [
    ['BigInt em bocrWeights', c => { c.bocrWeights = [BigInt(1), 0.3, 0.2, 0.1]; }],
    ['arranjo circular em bocrWeights', c => { const w: any[] = [0.4, 0.3, 0.2]; w.push(w); c.bocrWeights = w; }],
    ['símbolo como matriz bocr', c => { c.aggregatedMatrices.bocr = Symbol('m'); }],
    ['função como matriz magnitude', c => { c.aggregatedMatrices.magnitude = () => 1; }],
    ['matriz bocr como arranjo circular', c => { const m: any[] = [[1, 2, 3, 4]]; m.push(m); c.aggregatedMatrices.bocr = m; }],
    ['BigInt como aggregatedMatrices', c => { c.aggregatedMatrices = BigInt(5); }],
    ['aggregatedMatrices circular', c => { c.aggregatedMatrices.self = c.aggregatedMatrices; }],
    ['subcriteria circular', c => { c.aggregatedMatrices.subcriteria.self = c.aggregatedMatrices.subcriteria; }],
    ['rescalingWeights BigInt', c => { c.rescalingWeights = BigInt(1); }],
    ['subWeights circular', c => { const s: any = { B: W5 }; s.self = s; c.subWeights = s; }],
    ['documento raiz circular', c => { c.self = c; }],
    [
      'todos os CR hostis ao mesmo tempo',
      c => {
        c.bocrConsistency = { cr: BigInt(1) };
        c.magnitudeConsistency = { cr: circular };
        c.subConsistency = { B: { cr: () => 1 }, O: { cr: Symbol('o') }, C: { cr: NaN }, R: { cr: Infinity } };
      },
    ],
  ];

  test.each(mutadores)('domínio: %s. prepararEnvio, a prévia e executarValidacao não lançam', async (_n, muta) => {
    const calc = calculoCompleto();
    muta(calc);
    expect(() => prepararEnvio(calc)).not.toThrow();
    expect(() => previa(calc)).not.toThrow();
    const f = fetchSimulado(respostaCoerente());
    const ap = await executarValidacao(calc, f.buscar);
    expect(ap.codigo).toMatch(/^P[1-9]$/);
    expect(() => html(ap)).not.toThrow();
  });

  // ⚠ ALTERADO (fechamento da precisão 5, ponto 2). Este teste exigia a declaração antiga, que generalizava
  // ("qualquer valor que um documento possa carregar", "a única fonte de exceção") e só excluía o ACESSO a
  // propriedade. A declaração passa a delimitar o domínio a "arranjos comuns, sem sobrescrita dos métodos
  // utilizados", cobre o método substituído por valor NÃO CHAMÁVEL e não promete além do que é exercitado.
  const juntar = (comentario: string) => comentario.replace(/\s*\n\s*\*\s*/g, ' ');
  test('a declaração do domínio no cabeçalho: arranjos comuns, sem sobrescrita dos métodos utilizados, e só o que os testes exercitam', () => {
    const fonte = readFileSync(join(__dirname, '..', 'validacao-externa/matriz-utilizavel.ts'), 'utf8');
    const cabecalho = juntar(fonte.slice(0, fonte.indexOf('import {')));
    expect(cabecalho).toContain('DOMÍNIO DEMONSTRADO EM QUE `prepararEnvio` NÃO LANÇA');
    expect(cabecalho).toContain('arranjos comuns, sem sobrescrita dos métodos utilizados');
    expect(cabecalho).toContain('FICAM FORA do domínio, e NÃO são garantidos');
    expect(cabecalho).toContain('ACESSO a uma propriedade lança');
    expect(cabecalho).toContain('MÉTODO PRÓPRIO SOBRESCRITO, seja por função que lança, seja por valor NÃO CHAMÁVEL');
    expect(cabecalho).toContain('chama `map` nos pesos do documento');
    expect(cabecalho).toContain('Isso vale além do acesso a propriedade');
    expect(cabecalho).toContain('Isso é o que está demonstrado, e nada além');
    // as frases que generalizavam além do que os testes exercitam SAÍRAM
    for (const frase of ['Qualquer valor que um documento possa carregar', 'em qualquer campo', 'A única fonte de exceção', 'nenhum documento do Firestore']) {
      expect(cabecalho).not.toContain(frase);
    }
  });

  test('a orquestração declara o que garante e a exclusão sobre text(), sem generalizar', () => {
    const fonte = readFileSync(join(__dirname, '..', 'validacao-externa/precedencia.ts'), 'utf8');
    const cabecalho = juntar(fonte.slice(0, fonte.indexOf('import {')));
    expect(cabecalho).toContain('não lança no domínio demonstrado em `matriz-utilizavel.ts`');
    expect(cabecalho).toContain('seja qual for o tipo do erro (inclusive objeto sem `toString`)');
    expect(cabecalho).toContain('EXCLUSÃO: `text()` deve resolver em string');
    expect(cabecalho).not.toContain('no domínio de `prepararEnvio` (ver o cabeçalho');
  });

  // ⚠ ACRESCENTADO (fechamento da precisão 5, ponto 1). `origemDaExcecao` convertia `err` ANTES de decidir qual
  // ramo usar (`String(err)` e `String(err.message)`, sem proteção), então um erro hostil lançado durante o
  // tratamento de uma falha fazia o próprio tratamento lançar, inclusive no caso `serializacao`, e
  // `executarValidacao` REJEITAVA em vez de resolver em P3. Os quatro primeiros erros abaixo são os que
  // reproduziam o defeito; os demais são controles de que o caminho comum não mudou de sentido.
  const erros: [string, () => unknown, string][] = [
    ['Object.create(null), sem toString', () => Object.create(null), 'erro sem mensagem legível'],
    ['objeto cujo message tem conversão que lança', () => ({ message: { toString() { throw new Error('conversão de message'); } } }), 'erro sem mensagem legível'],
    ['objeto cujo message tem Symbol.toPrimitive que lança', () => ({ message: { [Symbol.toPrimitive]() { throw new Error('toPrimitive'); } } }), 'erro sem mensagem legível'],
    ['objeto sem message cujo toString lança', () => ({ toString() { throw new Error('toString'); } }), 'erro sem mensagem legível'],
    ['null', () => null, 'null'],
    ['undefined', () => undefined, 'undefined'],
    ['texto lançado', () => 'texto lançado', 'texto lançado'],
    ['símbolo', () => Symbol('s'), 'Symbol(s)'],
    ['BigInt', () => BigInt(10), '10'],
  ];

  test.each(erros)(
    '%s lançado DURANTE a serialização do corpo: P3, o serviço NÃO é chamado e a promessa RESOLVE (os três no mesmo teste)',
    async (_n, fabrica, mensagem) => {
      const hostil = fabrica();
      const calc = calculoCompleto();
      calc.bocrConsistency = {
        cr: {
          toJSON() {
            throw hostil;
          },
        },
      };
      const f = fetchSimulado(respostaCoerente());
      const promessa = executarValidacao(calc, f.buscar);
      await expect(promessa).resolves.toMatchObject({ codigo: 'P3' }); // resolve, sem rejeição, e é P3
      const ap = await promessa;
      expect(f.chamadas).toHaveLength(0); // o serviço não é chamado
      expect(ap.descricao).toContain('Nada foi enviado ao serviço');
      expect(ap.descricao).toContain('Falha de serialização');
      expect(ap.descricao).toContain(`(${mensagem})`);
      expect(ap.selo).toBe(false);
    }
  );

  test.each(erros)('%s lançado por `buscar`: P3, a chamada foi tentada e a promessa RESOLVE', async (_n, fabrica, mensagem) => {
    let tentativas = 0;
    const buscar: Buscar = async () => {
      tentativas++;
      throw fabrica();
    };
    const promessa = executarValidacao(calculoCompleto(), buscar);
    await expect(promessa).resolves.toMatchObject({ codigo: 'P3' });
    const ap = await promessa;
    expect(tentativas).toBe(1);
    expect(ap.descricao).toContain('A chamada falhou antes de haver resposta');
    expect(ap.descricao).toContain(mensagem);
  });

  test.each(erros)('%s lançado ao LER o corpo da resposta: P3 (corpo_ilegivel) e a promessa RESOLVE', async (_n, fabrica, mensagem) => {
    const marca = '{"marca":"corpo-hostil"}';
    const original = JSON.parse;
    const espiao = jest.spyOn(JSON, 'parse').mockImplementation(((texto: string, reviver?: any) => {
      if (texto === marca) throw fabrica();
      return original(texto, reviver);
    }) as any);
    try {
      const f = fetchSimulado({ ok: true, status: 200, texto: marca });
      const promessa = executarValidacao(calculoCompleto(), f.buscar);
      await expect(promessa).resolves.toMatchObject({ codigo: 'P3' });
      const ap = await promessa;
      expect(f.chamadas).toHaveLength(1);
      expect(ap.descricao).toContain('o corpo não pôde ser lido como JSON');
      expect(ap.descricao).toContain(mensagem);
    } finally {
      espiao.mockRestore();
    }
  });

  test.each(erros)('%s: origemDaExcecao não lança em nenhuma das naturezas, preserva a natureza e devolve a mensagem protegida', (_n, fabrica, mensagem) => {
    for (const natureza of ['excecao', 'corpo_ilegivel', 'serializacao'] as const) {
      let o!: ReturnType<typeof origemDaExcecao>;
      expect(() => {
        o = origemDaExcecao(fabrica(), natureza);
      }).not.toThrow();
      expect(o.natureza).toBe(natureza);
      expect(o.erro).toBe(mensagem);
    }
    expect(origemDaExcecao(fabrica()).natureza).toBe('excecao'); // a natureza padrão
  });

  test('o fonte de origemDaExcecao não converte `err` fora de mensagemDoErro', () => {
    const fonte = readFileSync(join(__dirname, '..', 'validacao-externa/precedencia.ts'), 'utf8');
    const corpo = fonte.slice(fonte.indexOf('export function origemDaExcecao'), fonte.indexOf('function textoDaOrigemDaFalha'));
    expect(corpo).toContain('mensagemDoErro(err)');
    expect(corpo).not.toMatch(/String\(/);
    expect(corpo).not.toMatch(/\bmessage\b.*\bin\b/);
  });
});

// ⚠ ACRESCENTADO (fechamento da precisão 5, ponto 2). A varredura sustenta a EXCLUSÃO declarada no cabeçalho de
// `matriz-utilizavel.ts`: sobrescrever, um por vez, um método próprio (que lança, ou que não é função) em cada
// objeto ou arranjo alcançável do documento SÓ faz `prepararEnvio` lançar para `map` nos pesos, na
// reconstrução. Vale para os métodos e para as três formas de documento ABAIXO, e não além disso.
describe('exclusão declarada, medida por varredura: método próprio sobrescrito só faz prepararEnvio lançar no `map` dos pesos da reconstrução', () => {
  const clonar = (x: any) => JSON.parse(JSON.stringify(x)); // os documentos de teste compartilham arranjos (W4, W5)
  const NOMES: (string | symbol)[] = [
    'map', 'every', 'some', 'filter', 'forEach', 'slice', 'includes', 'join', 'indexOf', 'reduce', 'find', 'concat',
    'toString', 'valueOf', 'toJSON', 'hasOwnProperty', 'metodoInexistente', Symbol.iterator, Symbol.toPrimitive,
  ];
  const TIPOS: [string, unknown][] = [
    ['função que lança', () => { throw new Error('método hostil'); }],
    ['valor não chamável (5)', 5],
  ];
  const alcancaveis = (o: any, caminho: string, vistos: Set<any>, saida: [string, any][]) => {
    if (o === null || typeof o !== 'object' || vistos.has(o)) return;
    vistos.add(o);
    saida.push([caminho, o]);
    for (const k of Object.keys(o)) alcancaveis(o[k], `${caminho}.${k}`, vistos, saida);
  };
  const comoArranjos = () => {
    const c = calculoCompleto();
    c.aggregatedMatrices.bocr = razoes(W4);
    c.aggregatedMatrices.magnitude = razoes(W4);
    for (const m of ['B', 'O', 'C', 'R']) c.aggregatedMatrices.subcriteria[m] = razoes(W5);
    return c;
  };
  const formas: [string, () => any, boolean][] = [
    ['matrizes persistidas em texto JSON', () => clonar(calculoCompleto()), false],
    ['matrizes persistidas como arranjos', () => clonar(comoArranjos()), false],
    ['só pesos: reconstrução', () => clonar(calculoSoComPesos()), true],
  ];
  const exclusaoDeclarada = (reconstrucao: boolean, caminho: string, nome: string | symbol) =>
    reconstrucao && nome === 'map' && /^doc\.(bocrWeights|subWeights\.[BOCR])$/.test(caminho);

  test.each(formas)('%s: nenhuma sobrescrita FORA da exclusão declarada faz prepararEnvio lançar', (_f, fabrica, reconstrucao) => {
    const lista: [string, any][] = [];
    alcancaveis(fabrica(), 'doc', new Set(), lista);
    const lancaram: string[] = [];
    let medidas = 0;
    for (const [caminho] of lista) {
      for (const nome of NOMES) {
        for (const [tipo, valor] of TIPOS) {
          if (exclusaoDeclarada(reconstrucao, caminho, nome)) continue;
          const doc = fabrica();
          const alvos: [string, any][] = [];
          alcancaveis(doc, 'doc', new Set(), alvos);
          const objeto = alvos.find(([c]) => c === caminho)![1];
          Object.defineProperty(objeto, nome, { value: valor, configurable: true, writable: true, enumerable: false });
          medidas++;
          try {
            prepararEnvio(doc);
          } catch {
            lancaram.push(`${caminho} :: ${String(nome)} :: ${tipo}`);
          }
        }
      }
    }
    expect(medidas).toBeGreaterThan(200);
    expect(lancaram).toEqual([]);
  });

  // Este teste registra o LIMITE como ele é, e não o suporte: se um dia `reconstruir` deixar de chamar `map`
  // (por exemplo, com laço indexado), ele falha e a declaração do cabeçalho muda junto.
  test('CONTROLE: a exclusão existe e está onde a declaração diz (`map` próprio nos pesos, só na reconstrução)', () => {
    for (const [, valor] of TIPOS) {
      for (const caminho of ['bocrWeights', 'subWeights.B', 'subWeights.R']) {
        const doc = clonar(calculoSoComPesos());
        const alvo = caminho.split('.').reduce((o: any, k: string) => o[k], doc);
        Object.defineProperty(alvo, 'map', { value: valor, configurable: true, writable: true, enumerable: false });
        expect(() => prepararEnvio(doc)).toThrow();
      }
    }
    // com matrizes persistidas (sem reconstrução), o mesmo `map` próprio NÃO faz lançar
    const persistido = clonar(calculoCompleto());
    Object.defineProperty(persistido.bocrWeights, 'map', { value: () => { throw new Error('método hostil'); }, configurable: true, writable: true, enumerable: false });
    expect(() => prepararEnvio(persistido)).not.toThrow();
  });
});

describe('contrato do retorno: a cláusula dos vetores devolvidos está declarada como NÃO implementada', () => {
  const fonte = readFileSync(join(__dirname, '..', 'validacao-externa/contrato-retorno.ts'), 'utf8');
  // o cabeçalho é comentário em bloco: junta as linhas para conferir frases que quebram de linha
  const cabecalho = fonte.slice(0, fonte.indexOf('export type EstadoDoCampo')).replace(/\n\s*\*\s?/g, ' ');

  test('o cabeçalho nomeia a cláusula de 6.2, declara a exceção de escopo e nega o cumprimento integral', () => {
    expect(cabecalho).toContain('CLÁUSULA NÃO IMPLEMENTADA');
    expect(cabecalho).toContain('vetores de peso, se o retorno os trouxer');
    expect(cabecalho).toContain('NÃO está implementada');
    expect(cabecalho).toContain('NÃO apresenta cumprimento integral de 6.2');
    expect(cabecalho).toContain('expressamente autorizada pelo autor');
  });

  test('a regra estrutural por forma fica descartada, com o motivo', () => {
    expect(cabecalho).toContain('DESCARTADA');
    expect(cabecalho).toContain('nunca detectaria comprimento divergente');
  });

  // Por COMPORTAMENTO, e não por busca no fonte (uma busca no fonte é contornável por `(r as any).campo`).
  // Registra o LIMITE como ele é: vetores devolvidos, mesmo malformados, NÃO alteram a classificação. Os nomes
  // abaixo são ilustrativos; os nomes reais dos campos não estão estabelecidos, e é por isso que a cláusula
  // não está implementada. Se ela for implementada um dia, este teste muda junto com o cabeçalho.
  test('LIMITE verificado por comportamento: vetores devolvidos malformados NÃO alteram a classificação da entrada', () => {
    const semVetores = entrada(4);
    const comVetores = entrada(4, {
      weights: [NaN, -1],
      your_weights: [0, 0],
      sdk_weights: 'x',
      priority_vector: [Infinity],
      vetor_de_pesos: [],
      eigenvector: null,
    });
    expect(avaliarEntrada('x', comVetores, 4)).toEqual(avaliarEntrada('x', semVetores, 4));
    expect(avaliarEntrada('x', comVetores, 4).estado).toBe('completa');
  });
});
