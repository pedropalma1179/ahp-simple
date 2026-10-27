export {};

/**
 * lib/__tests__/consistencia-individual-contexto.test.ts
 *
 * **Ajuste 1 (A.12 item (c)): o TEXTO do CR individual por matriz que vai ao modelo, e as contagens do painel ENVIADO.** Confere
 * `lib/ai-reviewer/consistencia-individual-contexto.ts`: a leitura do bloco de cada respondente, as contagens com denominador declarado, o
 * painel reduzido (um resumo do painel completo NÃO viaja como o de um painel reduzido), e o que o texto diz de cada condição.
 *
 * ⚠ Os blocos do painel de 2026 vêm do MOTOR (`consistenciaIndividualDeJulgamentos`, sobre os julgamentos do fixture), e o oráculo das contagens
 * é a tabela de `docs/referencia-cr-individuais.md` copiada à mão (`helpers/referencia-cr-individuais.ts`), e NÃO o módulo sob teste.
 *
 * ⚠ **O que NÃO se demonstra:** o que o modelo escreve com este texto. Isto confere o CONTEXTO, e não a saída.
 */

import {
  blocoDeConsistenciaDoPainel,
  estatisticasPorMatriz,
  lerConsistenciaDoRespondente,
  resumirPainelDeConsistencia,
  trechoDaLinhaDoRespondente,
} from '@/lib/ai-reviewer/consistencia-individual-contexto';
import { consistenciaIndividualDeJulgamentos, MATRIZES_NAO_TRIVIAIS } from '@/lib/consistencia-individual';
import { REFERENCIA } from './helpers/referencia-cr-individuais';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { blocoComMaximo, blocoIndisponivel } = require('./helpers/consistencia-de-ensaio');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fixture = require('./fixtures/panel-2026.json');

const ALTERNATIVAS = fixture.alternatives.map((c: string) => ({ code: c, name: c, description: '' }));
const CABECALHO = 'Consistência individual por matriz, sobre os ENVIADOS a você (etapa: envio):\n';
const IDS = Object.keys(REFERENCIA);

/** O respondente da requisição, com o bloco do MOTOR. */
const doPainel = (id: string) => ({
  respondentId: id,
  consistenciaIndividual: consistenciaIndividualDeJulgamentos(fixture.responses.find((r: any) => r.id === id).judgments, ALTERNATIVAS),
});
const resumoDe = (respondentes: any[]) => resumirPainelDeConsistencia(respondentes.map(lerConsistenciaDoRespondente));
const painelCompleto = () => IDS.map(doPainel);

describe('a leitura do bloco de cada respondente: formato não reconhecido NÃO é lido «no que der»', () => {
  const bom = () => blocoComMaximo(0.05);

  test.each([['sem a chave', {}], ['undefined', { consistenciaIndividual: undefined }], ['null', { consistenciaIndividual: null }], ['respondente que nem é objeto', 'texto']])(
    'bloco ausente (%s): «ausente_no_payload», sem valor algum',
    (_r, respondente) => {
      expect(lerConsistenciaDoRespondente(respondente)).toEqual({ estado: 'ausente_no_payload' });
    }
  );

  test.each([
    ['uma lista', [bom()], 'o bloco recebido não é um objeto'],
    ['um número', 7, 'o bloco recebido não é um objeto'],
    ['esquema outro', { ...bom(), esquema: 'outro-v9' }, 'esquema não reconhecido: outro-v9'],
    ['fonte outra', { ...bom(), fonte: 'cache_legado' }, 'fonte não reconhecida: cache_legado'],
    ['sem condição', { ...bom(), condicao: '' }, 'o bloco não traz a condição dos julgamentos'],
    ['sem crPorMatriz', { ...bom(), crPorMatriz: undefined }, 'o bloco não traz crPorMatriz'],
    ['sem a matriz MAGNITUDE', (() => { const b: any = bom(); delete b.crPorMatriz.MAGNITUDE; return b; })(), 'crPorMatriz sem a matriz MAGNITUDE'],
    ['CR NaN', (() => { const b: any = bom(); b.crPorMatriz.BOCR = NaN; return b; })(), 'CR da matriz BOCR não é número finito nem nulo'],
    ['CR infinito', (() => { const b: any = bom(); b.crPorMatriz['SUB-C'] = Infinity; return b; })(), 'CR da matriz SUB-C não é número finito nem nulo'],
    ['CR em texto', (() => { const b: any = bom(); b.crPorMatriz['SUB-R'] = '0.05'; return b; })(), 'CR da matriz SUB-R não é número finito nem nulo'],
    ['indisponível que traz valor', { ...blocoIndisponivel(), crPorMatriz: { ...blocoIndisponivel().crPorMatriz, BOCR: 0 } }, 'o bloco declara os CRs indisponíveis e traz valor em alguma matriz'],
    ['recalculado que deixa uma matriz sem valor', (() => { const b: any = bom(); b.crPorMatriz['SUB-O'] = null; return b; })(), 'o bloco declara os CRs recalculados e deixa alguma das seis matrizes sem valor'],
  ])('bloco com formato não reconhecido (%s): «invalido», com o motivo', (_r, bloco, motivo) => {
    expect(lerConsistenciaDoRespondente({ consistenciaIndividual: bloco })).toEqual({ estado: 'invalido', motivo });
  });

  test('bloco indisponível, bem formado: «indisponivel», e a condição é a dele', () => {
    const l: any = lerConsistenciaDoRespondente({ consistenciaIndividual: blocoIndisponivel('duplicados', 'um par repetido') });
    expect(l.estado).toBe('indisponivel');
    expect(l.consistencia.condicao).toBe('duplicados');
  });

  test('bloco recalculado e COERENTE: «recalculado», sem contradição; o do motor para R03 também', () => {
    expect((lerConsistenciaDoRespondente({ consistenciaIndividual: bom() }) as any).contradicoes).toEqual([]);
    const l: any = lerConsistenciaDoRespondente(doPainel('R03'));
    expect([l.estado, l.contradicoes]).toEqual(['recalculado', []]);
  });

  test('o resumo declarado que NÃO confere com as seis matrizes vira contradição, com os DOIS valores conservados, e nenhum é escolhido', () => {
    const l: any = lerConsistenciaDoRespondente({ consistenciaIndividual: { ...bom(), media: 0.9, maximo: 0.4, matrizGovernante: 'SUB-R' } });
    expect(l.estado).toBe('recalculado');
    const por = Object.fromEntries(l.contradicoes.map((c: any) => [c.campo, c]));
    expect(Object.keys(por).sort()).toEqual(['matrizGovernante', 'maximo', 'media']);
    expect(por.media).toEqual({ campo: 'media', declarado: 0.9, recomputado: 0.029166666666666664 });
    expect(por.maximo).toEqual({ campo: 'maximo', declarado: 0.4, recomputado: 0.05 });
    expect(por.matrizGovernante).toEqual({ campo: 'matrizGovernante', declarado: 'SUB-R', recomputado: 'BOCR' });
    // o valor declarado ausente (não numérico) também é contradição, e vira `null`, e NÃO zero
    const sem: any = lerConsistenciaDoRespondente({ consistenciaIndividual: { ...bom(), media: undefined } });
    expect(sem.contradicoes).toEqual([{ campo: 'media', declarado: null, recomputado: 0.029166666666666664 }]);
  });
});

describe('o painel de 2026 inteiro: 12 enviados, 72 matrizes, 47 acima de 0,10, 12 respondentes com ao menos uma', () => {
  test('as contagens do painel conferem com a tabela de referência, e o denominador é o ENVIADO', () => {
    const r = resumoDe(painelCompleto());
    expect([r.enviados, r.recalculados, r.totalIndisponiveis, r.semBloco, r.invalidos, r.comContradicao]).toEqual([12, 12, 0, 0, 0, 0]);
    expect([r.matrizesAvaliadas, r.matrizesAcimaDoLimiar, r.respondentesComAlgumaAcimaDoLimiar]).toEqual([72, 47, 12]);
  });

  test.each(MATRIZES_NAO_TRIVIAIS.map((m) => [m] as [string]))('%s: n, acima do limiar, mínimo, média e máximo entre os 12 conferem com a tabela (oráculo à parte)', (m) => {
    const r = resumoDe(painelCompleto());
    const v = IDS.map((id) => (REFERENCIA[id] as any)[m] as number); // em %, da tabela
    const e = (r.porMatriz as any)[m];
    expect(e.n).toBe(12);
    expect(e.acimaDoLimiar).toBe(v.filter((x) => x > 10).length);
    expect(Number((e.minimo * 100).toFixed(2)) + 0).toBe(Math.min(...v));
    expect(Number((e.maximo * 100).toFixed(2)) + 0).toBe(Math.max(...v));
    // a média da tabela é de valores já arredondados a 2 casas: concorda com a do motor dentro de 0,01 ponto percentual
    expect(Math.abs(e.mediaEntreRespondentes * 100 - v.reduce((a: number, b: number) => a + b, 0) / v.length)).toBeLessThan(0.01);
  });

  test('o texto do painel diz a população e os denominadores: 12 respondentes, 72 matrizes, 47 de 72 (65.3%), 12 de 12', () => {
    const t = blocoDeConsistenciaDoPainel(resumoDe(painelCompleto()), CABECALHO);
    expect(t).toContain('Consistência individual por matriz, sobre os ENVIADOS a você (etapa: envio):');
    expect(t).toContain('- Respondentes enviados: 12. Com CR recalculado dos julgamentos nas 6 matrizes: 12. Sem CR: 0.');
    expect(t).toContain('- Matrizes avaliadas: 72 (12 respondentes × 6 matrizes não triviais: BOCR, MAGNITUDE, SUB-B, SUB-O, SUB-C, SUB-R).');
    expect(t).toContain('As vinte matrizes de alternativas (2×2) ficam fora: o CR delas é zero por construção.');
    expect(t).toContain('- Matrizes com CR > 0.10 (limiar de aceitação por matriz, Saaty, 1977): 47 de 72 (65.3%).');
    expect(t).toContain('- Respondentes com ao menos uma matriz com CR > 0.10: 12 de 12.');
    // a leitura: o CR descreve a matriz, não a pessoa; a contagem não é critério de exclusão; média/máximo são de UM respondente
    expect(t).toContain('o CR descreve uma matriz de julgamentos, e não classifica a pessoa');
    expect(t).toContain('não é critério de exclusão de participantes');
    expect(t).toContain('«Média das 6 matrizes» e «máximo» são de UM respondente');
    expect(t).toContain('«média entre respondentes» é a média dos CRs de UMA matriz sobre os respondentes enviados');
    expect(t).toContain('Nenhuma delas é o CR das matrizes AGREGADAS por média geométrica');
  });

  test('a linha de R03 traz a MAGNITUDE (109.27%), a média das seis (29.02%) e o máximo com a matriz governante, e o zero calculado como 0.00%', () => {
    const linha = trechoDaLinhaDoRespondente(lerConsistenciaDoRespondente(doPainel('R03')));
    expect(linha).toBe(
      'CR por matriz (recalculado dos julgamentos): BOCR 27.21% | MAGNITUDE 109.27% | SUB-B 7.18% | SUB-O 0.00% | SUB-C 13.11% | SUB-R 17.36% | ' +
        'média das 6 matrizes: 29.02% | máximo: 109.27% (matriz governante: MAGNITUDE)'
    );
    // R12/SUB-B, cujo valor do motor é o resíduo −3,97e−16: a APRESENTAÇÃO sai 0.00%, nunca «-0.00%»
    expect(trechoDaLinhaDoRespondente(lerConsistenciaDoRespondente(doPainel('R12')))).toContain('SUB-B 0.00%');
    expect(trechoDaLinhaDoRespondente(lerConsistenciaDoRespondente(doPainel('R12')))).not.toContain('-0.00%');
  });
});

describe('o painel REDUZIDO: o resumo é o da lista enviada, e não o do painel completo', () => {
  // R03 e R06 saem do painel: 4 e 6 matrizes acima do limiar na tabela, 10 ao todo. 72 − 12 = 60; 47 − 10 = 37; 12 − 2 = 10.
  const SAEM = ['R03', 'R06'];
  const reduzido = () => IDS.filter((id) => !SAEM.includes(id)).map(doPainel);

  test('10 enviados, 60 matrizes, 37 acima do limiar, 10 respondentes com ao menos uma (os números do painel completo NÃO aparecem)', () => {
    const acimaDosQueSaem = SAEM.reduce((s, id) => s + MATRIZES_NAO_TRIVIAIS.filter((m) => (REFERENCIA[id] as any)[m] > 10).length, 0);
    expect(acimaDosQueSaem).toBe(10); // o oráculo: 4 + 6
    const r = resumoDe(reduzido());
    expect([r.enviados, r.recalculados, r.matrizesAvaliadas, r.matrizesAcimaDoLimiar, r.respondentesComAlgumaAcimaDoLimiar]).toEqual([10, 10, 60, 37, 10]);
    const t = blocoDeConsistenciaDoPainel(r, CABECALHO);
    expect(t).toContain('- Respondentes enviados: 10. Com CR recalculado dos julgamentos nas 6 matrizes: 10. Sem CR: 0.');
    expect(t).toContain('- Matrizes avaliadas: 60 (10 respondentes × 6 matrizes não triviais');
    expect(t).toContain('- Matrizes com CR > 0.10 (limiar de aceitação por matriz, Saaty, 1977): 37 de 60 (61.7%).');
    expect(t).toContain('- Respondentes com ao menos uma matriz com CR > 0.10: 10 de 10.');
    for (const doCompleto of ['72', '47 de 72', 'enviados: 12', '12 de 12']) expect({ doCompleto, presente: t.includes(doCompleto) }).toEqual({ doCompleto, presente: false });
    // as estatísticas por matriz também são sobre os 10
    expect(estatisticasPorMatriz(r)).toContain('sobre os 10 respondentes enviados com CR recalculado dos julgamentos');
    expect(estatisticasPorMatriz(r)).toContain('- BOCR: n = 10 respondentes com CR;');
    expect(estatisticasPorMatriz(r)).not.toContain('n = 12');
  });

  test('CONTROLE: o mesmo código sobre os 12 dá os números do completo (o painel reduzido não é o completo disfarçado)', () => {
    const t = blocoDeConsistenciaDoPainel(resumoDe(painelCompleto()), CABECALHO);
    expect(t).toContain('47 de 72');
    expect(t).not.toContain('37 de 60');
  });
});

describe('sem CR: o respondente conta no ENVIADO, nunca no avaliado, e nenhum zero é preenchido', () => {
  const indisp = (condicao: any) => ({ respondentId: `x-${condicao}`, consistenciaIndividual: blocoIndisponivel(condicao, `ensaio: ${condicao}`) });

  test('10 com CR + 1 ausente + 1 incompleto: enviados 12, recalculados 10, matrizes avaliadas 60 (e não 72), acima do limiar só entre os 10', () => {
    const dez = IDS.filter((id) => !['R03', 'R06'].includes(id)).map(doPainel);
    const r = resumoDe([...dez, indisp('ausentes'), indisp('incompletos')]);
    expect([r.enviados, r.recalculados, r.totalIndisponiveis]).toEqual([12, 10, 2]);
    expect(r.indisponiveis).toEqual({ ausentes: 1, incompletos: 1 });
    expect([r.matrizesAvaliadas, r.matrizesAcimaDoLimiar, r.respondentesComAlgumaAcimaDoLimiar]).toEqual([60, 37, 10]);
    const t = blocoDeConsistenciaDoPainel(r, CABECALHO);
    expect(t).toContain('- Respondentes enviados: 12. Com CR recalculado dos julgamentos nas 6 matrizes: 10. Sem CR: 2 (julgamentos ausentes: 1; julgamentos incompletos: 1).');
    expect(t).toContain('- Matrizes avaliadas: 60 (10 respondentes × 6 matrizes');
    expect(t).toContain('37 de 60');
    expect(t).toContain('10 de 10');
    // cada n por matriz é 10, e não 12
    for (const m of MATRIZES_NAO_TRIVIAIS) expect([m, r.porMatriz[m].n]).toEqual([m, 10]);
  });

  test('cada condição que impede o CR é nomeada no texto, na linha do respondente, e a linha NÃO traz percentual', () => {
    for (const [condicao, rotulo] of [['ausentes', 'ausentes'], ['incompletos', 'incompletos'], ['invalidos', 'inválidos'], ['duplicados', 'com par respondido mais de uma vez'], ['mistos', 'com mais de um tipo de defeito'], ['nao_calculavel', 'não calculáveis']] as const) {
      const linha = trechoDaLinhaDoRespondente(lerConsistenciaDoRespondente(indisp(condicao)));
      expect(linha).toContain(`CR por matriz: NÃO DISPONÍVEL — julgamentos ${rotulo} (ensaio: ${condicao}).`);
      expect(linha).toContain('Nenhum valor é apresentado, e nenhum é preenchido com zero');
      expect(linha).not.toMatch(/\d+\.\d\d%/);
    }
  });

  test('sem bloco e bloco inválido: contados à parte, e o texto os distingue da indisponibilidade dos julgamentos', () => {
    const r = resumoDe([doPainel('R01'), { respondentId: 'a' }, { respondentId: 'b', consistenciaIndividual: { esquema: 'outro' } }]);
    expect([r.enviados, r.recalculados, r.semBloco, r.invalidos, r.totalIndisponiveis]).toEqual([3, 1, 1, 1, 0]);
    const t = blocoDeConsistenciaDoPainel(r, CABECALHO);
    expect(t).toContain('Sem CR: 2 (bloco não recebido: 1; bloco com formato não reconhecido: 1).');
    expect(t).toContain('- Matrizes avaliadas: 6 (1 respondentes × 6 matrizes');
    expect(trechoDaLinhaDoRespondente({ estado: 'ausente_no_payload' })).toContain('NÃO RECEBIDO nesta requisição');
    expect(trechoDaLinhaDoRespondente({ estado: 'invalido', motivo: 'esquema não reconhecido: outro' })).toContain('BLOCO RECEBIDO COM FORMATO NÃO RECONHECIDO (esquema não reconhecido: outro). Nenhum valor é apresentado');
  });

  test('NENHUM recalculado: nenhuma contagem de matrizes, nenhum percentual, e as estatísticas por matriz dizem «não disponíveis»', () => {
    const r = resumoDe([indisp('ausentes'), indisp('incompletos'), { respondentId: 'z' }]);
    expect([r.recalculados, r.matrizesAvaliadas, r.matrizesAcimaDoLimiar, r.respondentesComAlgumaAcimaDoLimiar]).toEqual([0, 0, 0, 0]);
    for (const m of MATRIZES_NAO_TRIVIAIS) expect(r.porMatriz[m]).toEqual({ n: 0, acimaDoLimiar: 0, minimo: null, mediaEntreRespondentes: null, maximo: null });
    const t = blocoDeConsistenciaDoPainel(r, CABECALHO);
    expect(t).toContain('- Nenhum respondente enviado tem CR recalculado nas 6 matrizes: nenhuma contagem de matrizes é apresentada, e nenhum valor é preenchido com zero.');
    expect(t).not.toContain('Matrizes avaliadas');
    expect(t).not.toContain('NaN');
    expect(estatisticasPorMatriz(r)).toBe('⚠️ Não disponíveis: nenhum respondente enviado tem CR recalculado dos julgamentos. Nenhum valor por matriz é apresentado, e nenhum é preenchido com zero.');
  });

  test('lista VAZIA: nada é dividido por zero, e o texto diz 0 enviados', () => {
    const r = resumoDe([]);
    expect([r.enviados, r.recalculados, r.matrizesAvaliadas]).toEqual([0, 0, 0]);
    const t = blocoDeConsistenciaDoPainel(r, CABECALHO);
    expect(t).toContain('- Respondentes enviados: 0. Com CR recalculado dos julgamentos nas 6 matrizes: 0. Sem CR: 0.');
    expect(t).not.toMatch(/NaN|Infinity/);
  });
});

describe('contradição do resumo declarado: as contagens de matrizes NÃO são apresentadas, e os dois valores seguem na linha do respondente', () => {
  test('um respondente com a média adulterada: o painel não apresenta contagem, a seção por dimensão diz «não apresentadas», e a linha conserva os dois valores', () => {
    const adulterado = { respondentId: 'adulterado', consistenciaIndividual: { ...blocoComMaximo(0.05), media: 0.9 } };
    const r = resumoDe([doPainel('R01'), adulterado]);
    expect([r.recalculados, r.comContradicao]).toEqual([2, 1]);
    const t = blocoDeConsistenciaDoPainel(r, CABECALHO);
    expect(t).toContain('- ⚠ Contagens de matrizes NÃO apresentadas: o resumo declarado de 1 respondente(s) não confere com as suas seis matrizes');
    expect(t).not.toContain('Matrizes com CR >');
    expect(estatisticasPorMatriz(r)).toBe('⚠️ Não apresentadas: o resumo declarado de 1 respondente(s) não confere com as suas seis matrizes.');
    const linha = trechoDaLinhaDoRespondente(lerConsistenciaDoRespondente(adulterado));
    expect(linha).toContain('⚠ O RESUMO DECLARADO NÃO CONFERE com as seis matrizes');
    expect(linha).toContain('media: declarado pelo motor 90.00%, recomputado das seis matrizes 2.92%');
    expect(linha).toContain('os dois valores ficam conservados, e nenhum é escolhido');
  });
});
