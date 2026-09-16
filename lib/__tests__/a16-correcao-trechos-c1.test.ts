/**
 * A.16: trava a correção, na base, dos dois trechos de C1 que não conferiam com o
 * impresso.
 *
 * ⚠ **A referência é a INSPEÇÃO REGISTRADA**, e não memória do texto: a frase
 * impressa de Wijnmalen em `inspecao-wijnmalen-forman.json` e a de Saaty em
 * `medicao-pdfs.json`. Nenhum PDF é lido aqui.
 *
 * ⚠ **O snapshot de `docs/dados/a33-etapa4/` NÃO foi propagado**, por decisão do
 * autor, e o último bloco trava isso: uma propagação silenciosa reprova.
 */
export {};
const fs = require('node:fs');
const path = require('node:path');
import { getAllArticles } from '@/lib/rag/index';
import { getRefsByAuthor } from '@/app/api/ai-reviewer/knowledge';

const raiz = path.resolve(__dirname, '../..');
const ler = (rel: string) => JSON.parse(fs.readFileSync(path.join(raiz, rel), 'utf8'));

const inspecao = ler('docs/dados/a33-conferencia-c1/inspecao-wijnmalen-forman.json');
const medicao = ler('docs/dados/a33-conferencia-c1/medicao-pdfs.json');
const evidencias = ler('docs/dados/a33-etapa4/evidencias.json');

const IMPRESSO_WIJNMALEN: string = inspecao.trechos[0].impresso.fraseComoImpressa;
const IMPRESSO_SAATY: string = medicao.inspecaoVisualSaaty237.impresso.fraseComoImpressa;

/** As formas que a base trazia até A.16, e que o snapshot ainda traz. */
const TRANSFORMADA_WIJNMALEN =
  'synthesis requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship';
const ANTIGA_SAATY =
  'A reciprocal matrix A with positive entries is consistent if and only if \\lambda_{max} = n';
const CLAIM_ANTIGA_WIJNMALEN =
  'Priorities on different factors must be commensurate before synthesis to guarantee valid BOCR outcomes.';
const CLAIM_NOVA_WIJNMALEN =
  'BOCR synthesis requires commensurate priorities on a common scale; synthesizing non-commensurate measures is deceiving.';

const claim = (id: string, i: number) => {
  const artigo = getAllArticles().find(a => a.id === id);
  if (!artigo) throw new Error('artigo ausente: ' + id);
  return artigo.key_claims[i];
};

/** Wijnmalen: o recorte é a frase impressa inteira, até o ponto final. */
const confereWijnmalen = (texto: string) => texto === IMPRESSO_WIJNMALEN;

/**
 * Saaty: começa no meio da frase, então com minúscula, e, lida a notação LaTeX como
 * o impresso a compõe, está contido na frase impressa. A notação é representação
 * equivalente escolhida; a caixa não é.
 */
const confereSaaty = (texto: string) =>
  /^[a-z]/.test(texto) && IMPRESSO_SAATY.includes(texto.replace('\\lambda_{max}', 'λmax'));

describe('A.16: trechos de C1 corrigidos na base', () => {
  test('a referência é a frase impressa registrada, e não a forma antiga', () => {
    expect(inspecao.trechos[0].identidade.articleId).toBe('wijnmalen2007_bocr');
    expect(inspecao.trechos[0].identidade.enderecoNaBase.indiceBaseZero).toBe(0);
    expect(medicao.inspecaoVisualSaaty237.trecho.articleId).toBe('saaty1977_scaling');
    expect(IMPRESSO_WIJNMALEN.startsWith('Synthesis however requires')).toBe(true);
    expect(IMPRESSO_WIJNMALEN.endsWith('total risks.')).toBe(true);
    expect(IMPRESSO_SAATY.startsWith('It turns out that a reciprocal matrix')).toBe(true);
  });

  test('Wijnmalen key_claims[0]: os dois campos são a frase impressa', () => {
    const c = claim('wijnmalen2007_bocr', 0);
    expect(c.verbatim_quote).toBe(IMPRESSO_WIJNMALEN);
    expect(c.evidence.quote).toBe(IMPRESSO_WIJNMALEN);
    expect(c.evidence.page).toBe(899);
    expect(c.evidence.locator_id).toBe('Section 4');
  });

  test('Wijnmalen key_claims[3]: só o evidence.quote foi corrigido, e a unidade segue divergente', () => {
    const c = claim('wijnmalen2007_bocr', 3);
    expect(c.evidence.quote).toBe(IMPRESSO_WIJNMALEN);
    // ⚠ O verbatim_quote e a claim desta unidade são escopo de A.16, não desta correção.
    expect(c.verbatim_quote).toBe('Rescaling weights ensure commensurability across the four merit hierarchies.');
    expect(c.verbatim_quote).not.toBe(c.evidence.quote);
  });

  test('Saaty key_claims[0]: os dois campos conferem, com a minúscula do impresso', () => {
    const c = claim('saaty1977_scaling', 0);
    expect(c.verbatim_quote).toBe(c.evidence.quote);
    expect(confereSaaty(c.evidence.quote)).toBe(true);
    expect(c.evidence.page).toBe(237);
  });

  test('CONTRAEXEMPLOS: as transformações registradas reprovam', () => {
    expect(confereWijnmalen(TRANSFORMADA_WIJNMALEN)).toBe(false);
    expect(confereWijnmalen(IMPRESSO_WIJNMALEN.replace(' however', ''))).toBe(false);
    expect(confereWijnmalen('s' + IMPRESSO_WIJNMALEN.slice(1))).toBe(false);
    expect(confereWijnmalen(IMPRESSO_WIJNMALEN.replace(' between total benefits and total costs and total opportunities and total risks.', ''))).toBe(false);
    expect(confereSaaty(ANTIGA_SAATY)).toBe(false);
    // A troca de símbolo da camada OCR também reprova, com a caixa certa.
    expect(confereSaaty('a reciprocal matrix A with positive entries is consistent if and only if h max = a')).toBe(false);
  });

  test('a base não traz mais as formas antigas em nenhuma claim', () => {
    const campos = getAllArticles().flatMap(a =>
      a.key_claims.flatMap(c => [c.verbatim_quote, c.evidence.quote]));
    expect(campos.filter(t => t === TRANSFORMADA_WIJNMALEN)).toHaveLength(0);
    expect(campos.filter(t => t === ANTIGA_SAATY)).toHaveLength(0);
    expect(campos.filter(t => t === IMPRESSO_WIJNMALEN)).toHaveLength(3);
  });

  test('REGISTRO, por decisão: o snapshot da etapa 4 segue com o texto antigo', () => {
    const [saaty, w0, w3] = [47, 86, 89].map(i => evidencias.porTrecho[i]);
    expect([saaty.articleId, saaty.enderecoNaBase.indiceBaseZero]).toEqual(['saaty1977_scaling', 0]);
    expect([w0.articleId, w0.enderecoNaBase.indiceBaseZero]).toEqual(['wijnmalen2007_bocr', 0]);
    expect([w3.articleId, w3.enderecoNaBase.indiceBaseZero]).toEqual(['wijnmalen2007_bocr', 3]);
    expect(saaty.dadosOriginais.verbatim_quote).toBe(ANTIGA_SAATY);
    expect(saaty.dadosOriginais.evidence.quote).toBe(ANTIGA_SAATY);
    expect(w0.dadosOriginais.verbatim_quote).toBe(TRANSFORMADA_WIJNMALEN);
    expect(w0.dadosOriginais.evidence.quote).toBe(TRANSFORMADA_WIJNMALEN);
    expect(w0.dadosOriginais.claim).toBe(CLAIM_ANTIGA_WIJNMALEN);
    expect(w3.dadosOriginais.evidence.quote).toBe(TRANSFORMADA_WIJNMALEN);
  });
});

describe('A.16, J1: a claim de Wijnmalen key_claims[0], reescrita por julgamento', () => {
  test('é a redação aprovada, sem os três pontos que carregavam o excesso', () => {
    const c = claim('wijnmalen2007_bocr', 0);
    expect(c.claim).toBe(CLAIM_NOVA_WIJNMALEN);
    for (const excesso of ['different factors', 'before synthesis', 'guarantee']) {
      expect(c.claim).not.toContain(excesso);
    }
  });

  test('chega INTEIRA ao topic, pelo caminho real até o modelo', () => {
    // ⚠ `claimToRef` corta `topic` acima de 120 caracteres. A primeira redação
    // aprovada tinha 153 e chegaria sem "is deceiving"; o corte no código não é
    // corrigido aqui, e este caso reprova se a claim voltar a passar do limite.
    const refs = getRefsByAuthor('Wijnmalen').filter(r => r.id === 'wijnmalen2007_bocr_c0');
    expect(refs).toHaveLength(1);
    // Contra a claim VIVA, e não contra a constante: assim só o corte reprova aqui.
    expect(refs[0].topic).toBe(claim('wijnmalen2007_bocr', 0).claim);
    expect(refs[0].topic).toBe(CLAIM_NOVA_WIJNMALEN);
    expect(refs[0].rule).toBe(IMPRESSO_WIJNMALEN);
  });
});
