export {};

/**
 * lib/__tests__/consistencia-individual.test.ts
 *
 * **Ajuste 1 (A.12 item (c)): a ORIGEM do CR individual.** Confere `lib/consistencia-individual.ts` contra a tabela de referência
 * (`docs/referencia-cr-individuais.md`, seção 2), sobre os 864 julgamentos do painel de 2026 (`fixtures/panel-2026.json`).
 *
 * ⚠ **A tabela de referência é o ORÁCULO e está copiada abaixo à mão, em porcentagem, do documento** (os valores com vírgula do documento
 * viram ponto). Ela NÃO é calculada por este arquivo nem pelo módulo. O que se confere: (i) cada uma das 72 células (12 respondentes × 6 matrizes
 * não triviais), arredondada a duas casas; (ii) a média das seis, o máximo e a matriz governante de cada respondente; (iii) as contagens do painel
 * (47 das 72 matrizes acima de 0,10, e 12 dos 12 respondentes com ao menos uma); (iv) o caso R03 refeito à mão; (v) os casos de CR calculado zero.
 *
 * ⚠ **O instrumento é novo**, então a primeira conferência foi feita à mão no caso mais visível (R03, o de maior CR governante e o único cuja média,
 * 29,02, o documento destaca): a soma das seis células da tabela, dividida por seis, dá 29,02, e o governante é a MAGNITUDE com 109,27. Os testes de
 * controle negativo (adulterar uma célula da referência, ou a ordem das colunas) mostram que a comparação discrimina.
 *
 * ⚠ **O que NÃO se demonstra aqui:** que o CR assim calculado seja o que o modelo interpreta bem. Isto verifica a ORIGEM do número, e não o parecer.
 */

import {
  consistenciaIndividualDeJulgamentos,
  matrizesAcimaDoLimiar,
  formatarPercentualDoCR,
  MATRIZES_NAO_TRIVIAIS,
  LIMIAR_DE_ACEITACAO_POR_MATRIZ,
  ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL,
} from '@/lib/consistencia-individual';
import { calculateRespondentWeights } from '@/lib/respondent-weights';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fixture = require('./fixtures/panel-2026.json');
const ALTERNATIVAS = fixture.alternatives.map((c: string) => ({ code: c, name: c, description: '' }));
const julgamentosDe = (id: string): any[] => fixture.responses.find((r: any) => r.id === id).judgments;

import { REFERENCIA } from './helpers/referencia-cr-individuais';

const IDS = Object.keys(REFERENCIA);
// ⚠ `+ 0` normaliza o zero NEGATIVO só na COMPARAÇÃO com a tabela (que escreve «0,00»): `Object.is(-0, 0)` é falso e o resíduo −3,97e−16 de R12/SUB-B
//   arredonda a −0. O módulo NÃO normaliza (ver o teste de R12/SUB-B); a normalização é de apresentação, e aqui a apresentação é o arredondamento.
const arred2 = (v: number) => Number((v * 100).toFixed(2)) + 0;

describe('a origem: o CR por matriz recalculado dos julgamentos confere com a tabela de referência', () => {
  test('o painel tem os 12 respondentes da referência, com 72 julgamentos cada', () => {
    expect(fixture.responses.map((r: any) => r.id).sort()).toEqual([...IDS].sort());
    for (const r of fixture.responses) expect(r.judgments).toHaveLength(72);
    expect(ALTERNATIVAS.map((a: any) => a.code)).toEqual(['A1', 'A2']);
  });

  test.each(IDS.map((id) => [id] as [string]))('%s: as seis células, a média, o máximo e a matriz governante conferem com a tabela', (id) => {
    const c = consistenciaIndividualDeJulgamentos(julgamentosDe(id), ALTERNATIVAS);
    const ref = REFERENCIA[id];
    expect(c.esquema).toBe(ESQUEMA_DA_CONSISTENCIA_INDIVIDUAL);
    expect([c.fonte, c.condicao, c.detalhe, c.defeitos]).toEqual(['recalculado_dos_julgamentos', 'validos_completos', null, null]);
    expect(c.matrizesComCR).toBe(6);
    expect(c.matrizesEsperadas).toBe(6);
    expect(Object.keys(c.crPorMatriz)).toEqual([...MATRIZES_NAO_TRIVIAIS]);
    for (const m of MATRIZES_NAO_TRIVIAIS) {
      const v = c.crPorMatriz[m];
      expect([id, m, typeof v]).toEqual([id, m, 'number']); // número finito: nunca null quando os julgamentos são completos
      expect([id, m, arred2(v as number)]).toEqual([id, m, ref[m]]);
    }
    expect([id, arred2(c.media as number)]).toEqual([id, ref.medio]);
    expect([id, arred2(c.maximo as number), c.matrizGovernante]).toEqual([id, ref.governante, ref.matriz]);
  });

  test('a média é a ARITMÉTICA das seis, e o máximo é o maior delas, para os 12: os campos do resumo coincidem com as seis células', () => {
    for (const id of IDS) {
      const c = consistenciaIndividualDeJulgamentos(julgamentosDe(id), ALTERNATIVAS);
      const seis = MATRIZES_NAO_TRIVIAIS.map((m) => c.crPorMatriz[m] as number);
      expect(Math.abs((c.media as number) - seis.reduce((a, b) => a + b, 0) / 6)).toBeLessThan(1e-12);
      expect(c.maximo).toBe(Math.max(...seis));
      expect(c.crPorMatriz[c.matrizGovernante as keyof typeof c.crPorMatriz]).toBe(c.maximo);
    }
  });

  test('o painel inteiro: 47 das 72 matrizes acima de 0,10, e 12 dos 12 respondentes com ao menos uma', () => {
    let acima = 0;
    let comAlguma = 0;
    let avaliadas = 0;
    for (const id of IDS) {
      const c = consistenciaIndividualDeJulgamentos(julgamentosDe(id), ALTERNATIVAS);
      const n = matrizesAcimaDoLimiar(c).length;
      acima += n;
      avaliadas += c.matrizesComCR;
      if (n > 0) comAlguma += 1;
    }
    expect([acima, avaliadas, comAlguma]).toEqual([47, 72, 12]);
    expect(LIMIAR_DE_ACEITACAO_POR_MATRIZ).toBe(0.1);
    // a mesma contagem, feita sobre a TABELA copiada à mão (e não sobre o módulo): o oráculo concorda consigo mesmo
    const daTabela = IDS.reduce((s, id) => s + MATRIZES_NAO_TRIVIAIS.filter((m) => REFERENCIA[id][m] > 10).length, 0);
    expect(daTabela).toBe(47);
  });

  test('R03 REFEITO À MÃO: a média da tabela são as seis células somadas e divididas por seis, e a MAGNITUDE governa', () => {
    // 27,21 + 109,27 + 7,18 + 0,00 + 13,11 + 17,36 = 174,13; 174,13 / 6 = 29,0217 → 29,02
    const soma = 27.21 + 109.27 + 7.18 + 0 + 13.11 + 17.36;
    expect(Number(soma.toFixed(2))).toBe(174.13);
    expect(Number((soma / 6).toFixed(2))).toBe(29.02);
    const c = consistenciaIndividualDeJulgamentos(julgamentosDe('R03'), ALTERNATIVAS);
    expect(arred2(c.media as number)).toBe(29.02);
    expect(c.matrizGovernante).toBe('MAGNITUDE');
    expect(arred2(c.maximo as number)).toBe(109.27);
    // a MAGNITUDE (4×4) está no bloco e no resumo; antes, o transporte não a levava (o que chegava ao modelo era o cache)
    expect(arred2(c.crPorMatriz.MAGNITUDE as number)).toBe(109.27);
    // 4 das 6 matrizes de R03 acima de 0,10: BOCR, MAGNITUDE, SUB-C e SUB-R (SUB-B 7,18 e SUB-O 0,00 ficam dentro)
    expect(matrizesAcimaDoLimiar(c)).toEqual(['BOCR', 'MAGNITUDE', 'SUB-C', 'SUB-R']);
  });

  test('CONTROLE NEGATIVO: a comparação discrimina (uma célula adulterada, ou duas colunas trocadas, reprovam)', () => {
    const c = consistenciaIndividualDeJulgamentos(julgamentosDe('R03'), ALTERNATIVAS);
    expect(arred2(c.crPorMatriz.MAGNITUDE as number)).toBe(REFERENCIA.R03.MAGNITUDE); // o controle: sem adulteração, igual
    expect(arred2(c.crPorMatriz.MAGNITUDE as number)).not.toBe(REFERENCIA.R03.MAGNITUDE + 0.01);
    expect(arred2(c.crPorMatriz.BOCR as number)).not.toBe(REFERENCIA.R03.MAGNITUDE); // trocar BOCR por MAGNITUDE seria detectado
    expect(arred2(c.media as number)).not.toBe(REFERENCIA.R05.medio);
  });
});

describe('o zero CALCULADO é valor válido, e o resíduo do motor se conserva', () => {
  test('as células de CR 0,00 da tabela (R03/SUB-O, R09/SUB-B, R09/SUB-O, R12/SUB-B) são NÚMEROS no bloco, e contam entre as seis', () => {
    for (const [id, m] of [['R03', 'SUB-O'], ['R09', 'SUB-B'], ['R09', 'SUB-O'], ['R12', 'SUB-B']] as const) {
      expect(REFERENCIA[id][m]).toBe(0); // o oráculo diz zero
      const c = consistenciaIndividualDeJulgamentos(julgamentosDe(id), ALTERNATIVAS);
      const v = c.crPorMatriz[m];
      expect([id, m, typeof v]).toEqual([id, m, 'number']); // não é null: ausência é outra coisa
      expect(Math.abs(v as number)).toBeLessThan(5e-5); // arredonda a 0,00%
      expect(c.matrizesComCR).toBe(6); // e conta no denominador
      expect(c.fonte).toBe('recalculado_dos_julgamentos');
    }
  });

  test('R12/SUB-B: o valor transportado é o do motor, sem clamp; só a APRESENTAÇÃO normaliza o zero negativo', () => {
    const j = julgamentosDe('R12');
    const c = consistenciaIndividualDeJulgamentos(j, ALTERNATIVAS);
    // O motor, chamado diretamente, devolve o MESMO número que o bloco transporta (identidade, `Object.is`): o módulo não arredonda nem limita.
    const w = calculateRespondentWeights(j, ALTERNATIVAS.map((a: any) => a.code));
    expect(Object.is(c.crPorMatriz['SUB-B'], w.subWeights.B?.cr)).toBe(true);
    expect(Object.is(c.crPorMatriz.BOCR, w.bocrWeights.cr)).toBe(true);
    expect(Object.is(c.crPorMatriz.MAGNITUDE, w.magnitudeWeights.cr)).toBe(true);
    expect(Object.is(c.media, w.meanCR)).toBe(true);
    expect(Object.is(c.maximo, w.maxCR)).toBe(true);
    expect(c.matrizGovernante).toBe(w.governingMatrix);
    // a apresentação: zero, resíduo e zero negativo saem «0.00%», e o valor positivo não é afetado
    expect(formatarPercentualDoCR(c.crPorMatriz['SUB-B'] as number)).toBe('0.00%');
    expect(formatarPercentualDoCR(-3.97e-16)).toBe('0.00%');
    expect(formatarPercentualDoCR(-0)).toBe('0.00%');
    expect(formatarPercentualDoCR(0)).toBe('0.00%');
    expect(formatarPercentualDoCR(0.1139)).toBe('11.39%');
    expect(formatarPercentualDoCR(1.0927)).toBe('109.27%');
  });

  test('um respondente PERFEITAMENTE consistente (todas as comparações iguais a 1): o CR é zero calculado nas seis matrizes, e o bloco o diz', () => {
    const iguais = julgamentosDe('R01').map((j: any) => ({ ...j, saatyValue: 1, favors: 'equal' }));
    const c = consistenciaIndividualDeJulgamentos(iguais, ALTERNATIVAS);
    expect(c.fonte).toBe('recalculado_dos_julgamentos');
    expect(c.matrizesComCR).toBe(6);
    for (const m of MATRIZES_NAO_TRIVIAIS) {
      expect([m, typeof c.crPorMatriz[m]]).toEqual([m, 'number']);
      expect([m, Math.abs(c.crPorMatriz[m] as number) < 1e-12]).toEqual([m, true]);
    }
    expect(Math.abs(c.media as number)).toBeLessThan(1e-12);
    expect(matrizesAcimaDoLimiar(c)).toEqual([]);
    expect(formatarPercentualDoCR(c.media as number)).toBe('0.00%');
  });
});

describe('ausente, incompleto, inválido, duplicado e misto: condição EXPLÍCITA, nenhum CR, e NUNCA zero', () => {
  const r01 = () => julgamentosDe('R01');
  const semNenhumCR = (c: ReturnType<typeof consistenciaIndividualDeJulgamentos>) => {
    expect(c.fonte).toBe('indisponivel');
    expect(c.matrizesComCR).toBe(0);
    expect(c.matrizesEsperadas).toBe(6);
    for (const m of MATRIZES_NAO_TRIVIAIS) expect([m, c.crPorMatriz[m]]).toEqual([m, null]); // null, e nunca 0
    expect([c.media, c.maximo, c.matrizGovernante]).toEqual([null, null, null]);
    expect(matrizesAcimaDoLimiar(c)).toEqual([]);
    expect(typeof c.detalhe).toBe('string');
  };

  test.each([['undefined', undefined], ['null', null], ['lista vazia', []], ['lista só de nulos', [null, undefined]], ['não é lista', { a: 1 }]])(
    'julgamentos ausentes (%s): condição «ausentes»',
    (_r, j) => {
      const c = consistenciaIndividualDeJulgamentos(j, ALTERNATIVAS);
      semNenhumCR(c);
      expect([c.condicao, c.defeitos]).toEqual(['ausentes', null]);
    }
  );

  test('dois pares sem julgamento: «incompletos», com a contagem do defeito, a matriz nomeada e nenhum CR', () => {
    const c = consistenciaIndividualDeJulgamentos(r01().slice(2), ALTERNATIVAS);
    semNenhumCR(c);
    expect(c.condicao).toBe('incompletos');
    expect(c.defeitos).toEqual({ paresFaltantes: 2, paresPulados: 0, matrizesAusentes: 0, valoresInvalidos: 0, foraDaEstrutura: 0, paresDuplicados: 0 });
    expect(c.detalhe).toContain('2 par(es) sem julgamento');
    expect(c.detalhe).toContain('BOCR: 2 comparação(ões) sem resposta');
  });

  test('uma matriz inteira sem nenhuma comparação: «incompletos», com «matriz(es) sem nenhuma comparação»', () => {
    const semMagnitude = r01().filter((j: any) => j.type !== 'magnitude');
    const c = consistenciaIndividualDeJulgamentos(semMagnitude, ALTERNATIVAS);
    semNenhumCR(c);
    expect(c.condicao).toBe('incompletos');
    expect((c.defeitos as any).matrizesAusentes).toBeGreaterThanOrEqual(1);
    expect(c.detalhe).toContain('sem nenhuma comparação');
  });

  test.each([['10', 10], ['0,5', 0.5], ['null', null], ['texto', 'tres']])('valor fora da escala (%s): «invalidos», sem CR', (_r, valor) => {
    const j = r01().map((x: any, i: number) => (i === 0 ? { ...x, saatyValue: valor } : x));
    const c = consistenciaIndividualDeJulgamentos(j, ALTERNATIVAS);
    semNenhumCR(c);
    expect(c.condicao).toBe('invalidos');
    expect((c.defeitos as any).valoresInvalidos).toBe(1);
    expect(c.detalhe).toContain('fora da escala de Saaty');
  });

  test('um julgamento fora da estrutura do projeto: «invalidos»', () => {
    const j = [...r01(), { type: 'bocr', group: 'BOCR', itemA: 'B', itemB: 'Z', saatyValue: 3, favors: 'A' }];
    const c = consistenciaIndividualDeJulgamentos(j, ALTERNATIVAS);
    semNenhumCR(c);
    expect(c.condicao).toBe('invalidos');
    expect((c.defeitos as any).foraDaEstrutura).toBe(1);
  });

  test('um par respondido DUAS vezes: «duplicados», e o CR não é calculado «de qualquer maneira»', () => {
    const c = consistenciaIndividualDeJulgamentos([...r01(), r01()[0]], ALTERNATIVAS);
    semNenhumCR(c);
    expect(c.condicao).toBe('duplicados');
    expect((c.defeitos as any).paresDuplicados).toBe(1);
    expect(c.detalhe).toContain('respondido(s) mais de uma vez');
  });

  test('mais de um tipo de defeito: «mistos», com os dois contados', () => {
    const j = [...r01().slice(1), { ...r01()[0], saatyValue: 10 }, r01()[2]];
    const c = consistenciaIndividualDeJulgamentos(j, ALTERNATIVAS);
    semNenhumCR(c);
    expect(c.condicao).toBe('mistos');
    expect((c.defeitos as any).valoresInvalidos).toBe(1);
    expect((c.defeitos as any).paresDuplicados).toBe(1);
  });

  test.each([['undefined', undefined], ['null', null], ['lista vazia', []]])('sem as alternativas do projeto (%s): «nao_calculavel», porque não há estrutura contra a qual validar', (_r, alts) => {
    const c = consistenciaIndividualDeJulgamentos(r01(), alts as any);
    semNenhumCR(c);
    expect([c.condicao, c.defeitos]).toEqual(['nao_calculavel', null]);
    expect(c.detalhe).toContain('as alternativas do projeto não foram informadas');
  });

  test('CONTROLE: o MESMO respondente, completo, tem CR nas seis (a falha acima é dos julgamentos, e não do módulo)', () => {
    const c = consistenciaIndividualDeJulgamentos(r01(), ALTERNATIVAS);
    expect([c.fonte, c.matrizesComCR]).toEqual(['recalculado_dos_julgamentos', 6]);
  });
});
