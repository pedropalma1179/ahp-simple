/**
 * lib/__tests__/validate-review.test.ts
 *
 * Caracterização de `validateReviewOutput`, A.27 eixo 1, commit 1a.
 *
 * ⚠ Cada teste afirma O QUE O CÓDIGO FAZ HOJE, e o comentário de uma linha diz
 * se aquilo é o comportamento desejado ou o defeito sob correção. O commit 1b
 * atualiza um a um os que descrevem defeito.
 *
 * Os seis casos são os mesmos exercitados pelo handler real, fora da árvore, e
 * os resultados coincidem: ver a mensagem do commit 1a.
 */

import { validateReviewOutput } from '@/lib/ai-reviewer/validate-review';
import type { ReviewRequest } from '@/lib/ai-reviewer/review-request';

const ALVO = { code: 'A1', name: 'A1', score: 0.06412946722825451 };
const SEGUNDO = { code: 'A2', name: 'A2', score: 0.026937 };

/** Molde dos casos 1 a 5: um único ponto de escore, e só o valor varia. */
const molde = (v: string) =>
  ['## RESUMO', `A1: Score = ${v}.`, '## DECISAO EDITORIAL', '**ACEITO**'].join('\n');

/** Caso 6: nenhuma afirmação de escore, e nenhum termo que dispare a regra 2. */
const TEXTO_CONTROLE = ['## RESUMO', 'A1 lidera o ranking.', '## DECISAO EDITORIAL', '**ACEITO**'].join('\n');

const dados = (finalScores: any[]): ReviewRequest =>
  ({
    projectName: 'caracterizacao A27',
    alternatives: [{ code: 'A1', name: 'A1' }, { code: 'A2', name: 'A2' }],
    bocrWeights: { Benefits: 0.3723, Opportunities: 0.1517, Costs: 0.1974, Risks: 0.2786 },
    finalScores,
    bocrConsistency: { cr: 0.0106, lambda: 4.0286 },
  } as unknown) as ReviewRequest;

const REF_VALIDA = [ALVO, SEGUNDO];
/** "Nenhuma referência válida": campo presente, valores não numéricos; o filtro descarta. */
const REF_INVALIDA = [{ code: 'A1', name: 'A1', score: 'abc' }, { code: 'A2', name: 'A2', score: null }];

const FORMULA_INCOMPLETA =
  'FORMULA_INCOMPLETA: Fórmula mencionada mas sem distinção clara entre pesos pessoais (v) e rescaling (s)';

/** Achados de escore, isolados dos demais avisos que a entrada dispara. */
const deEscore = (avisos: string[]) => avisos.filter(w => w.startsWith('SCORE_'));

describe('validateReviewOutput: caracterização dos seis casos', () => {
  test('caso 1, valor de referência com VÍRGULA: nenhum achado de escore', () => {
    // Comportamento de HOJE. Aqui o silêncio é o resultado correto, mas pelo motivo
    // errado: a vírgula impede a comparação, então o acerto não foi verificado.
    const r = validateReviewOutput(molde('0,0641'), [], dados(REF_VALIDA));
    expect(deEscore(r.warnings)).toEqual([]);
    expect(r.issues).toEqual([]);
    expect(r.isValid).toBe(true);
    expect(r.warnings).toContain(FORMULA_INCOMPLETA);
  });

  test('caso 2, valor de referência com PONTO: nenhum achado de escore', () => {
    // Comportamento de HOJE, e é o desejado: o valor é reconhecido e confere.
    const r = validateReviewOutput(molde('0.0641'), [], dados(REF_VALIDA));
    expect(deEscore(r.warnings)).toEqual([]);
    expect(r.issues).toEqual([]);
    expect(r.isValid).toBe(true);
  });

  test('caso 3, valor FICTÍCIO com VÍRGULA: nenhum achado, e isto é o defeito', () => {
    // DEFEITO sob correção: número inventado passa sem qualquer achado, porque a
    // expressão captura "0" antes da vírgula e a guarda `> 0` aborta a regra 5.
    const r = validateReviewOutput(molde('0,9999'), [], dados(REF_VALIDA));
    expect(deEscore(r.warnings)).toEqual([]);
    expect(r.issues).toEqual([]);
    expect(r.isValid).toBe(true);
  });

  test('caso 4, valor FICTÍCIO com PONTO: aviso, e aprovação mantida', () => {
    // DEFEITO sob correção na segunda metade: o achado existe, mas como AVISO, e
    // aviso não derruba `isValid`, que é `issues.length === 0`.
    const r = validateReviewOutput(molde('0.9999'), [], dados(REF_VALIDA));
    expect(deEscore(r.warnings)).toEqual([
      'SCORE_NAO_RECONHECIDO: Score 0.9999 não encontrado nos dados injetados',
    ]);
    expect(r.issues).toEqual([]);
    expect(r.isValid).toBe(true);
  });

  test('caso 5, afirmação de escore SEM referência válida: nenhum achado', () => {
    // DEFEITO sob correção: a regra 5 não roda por falta de referência, e a ausência
    // de verificação chega indistinguível de verificação aprovada.
    const r = validateReviewOutput(molde('0.0641'), [], dados(REF_INVALIDA));
    expect(deEscore(r.warnings)).toEqual([]);
    expect(r.issues).toEqual([]);
    expect(r.isValid).toBe(true);
  });

  test('caso 6, CONTROLE, sem afirmação de escore e sem referência: nenhum achado', () => {
    // Comportamento de HOJE, e é o desejado: regra sem afirmação aplicável não roda,
    // e não ter achado é o resultado certo. Este caso tem de continuar assim em 1b.
    const r = validateReviewOutput(TEXTO_CONTROLE, [], dados(REF_INVALIDA));
    expect(deEscore(r.warnings)).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.issues).toEqual([]);
    expect(r.isValid).toBe(true);
  });
});
