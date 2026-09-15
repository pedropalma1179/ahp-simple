/** Controles do instrumento offline. Não adotam identidade nem mudam o recuperador. */
import fs from 'node:fs';
import path from 'node:path';
const { candidate, assess, suppliedTexts, utf8 } = require('../../scripts/measure-a33-identity.cjs');

function unit(articleId = 'obra', quote: any = 'trecho') {
  return { articleId, trechoId: null, tipo: 'claim', enderecoNaBase: { sha: 'snapshot-ficticio', arquivo: 'obra.ts', campo: 'key_claims', indiceBaseZero: 0 }, dadosOriginais: { evidence: { locator_type: 'section', locator_id: '1', quote }, verbatim_quote: quote }, conferenciaPublicacao: { estado: 'pendente' } };
}
const text = (quoteUsadoComoEvidencia = true) => [{ texto: 'texto preparado', quoteUsadoComoEvidencia }];
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

it('distingue localizador ausente, null e vazio, sem promover nenhum a completo', () => {
  const absent: any = unit(), nul: any = unit(), empty: any = unit();
  delete absent.dadosOriginais.evidence.locator_id;
  nul.dadosOriginais.evidence.locator_id = null;
  empty.dadosOriginais.evidence.locator_id = '';
  const out = assess([absent, nul, empty], [text(), text(), text()]);
  expect(new Set(out.rows.map((r: any) => r.hash)).size).toBe(3);
  expect(out.metrics.total.localizadores.locator_id).toEqual({ ausente: 1, nulo: 1, vazio: 1, textoNaoVazio: 0 });
  expect(out.assessment.total.discriminaveisComoVersaoDoQuote).toBe(0);
});

it('quote ausente e null não contam como conteúdo; vazio conta como zero bytes', () => {
  const a: any = unit(), n = unit('obra', null), e = unit('obra', '');
  delete a.dadosOriginais.evidence.quote;
  const out = assess([a, n, e, clone(e)], [text(), text(), text(), text()]);
  expect(new Set(out.rows.map((r: any) => r.hash)).size).toBe(3);
  expect(out.metrics.total.quotesByteAIgual.grupos).toBe(1);
  expect(out.metrics.total.quotesByteAIgual.unidades).toBe(2);
  expect(out.metrics.total.quotesByteAIgual.membros[0].bytes).toBe(0);
  expect(out.rows[2].quoteHash[1]).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

it('RS dentro de valor não cria um novo componente serializado', () => {
  const u = unit('obra\x1e["locator_type",["texto","enganoso"]]');
  const out = candidate(u), components = out.preimage.split('\x1e');
  expect(components).toHaveLength(5);
  expect(JSON.parse(components[1])).toEqual(['articleId', ['texto', u.articleId]]);
  expect(components[1]).toContain('\\u001e');
  expect(candidate(unit('obra')).hash).not.toBe(out.hash);
});

it('preserva caixa, espaços, quebras, acentos e formas Unicode distintas', () => {
  const values = ['ação', ' ação', 'ação ', 'ação\n', 'AÇÃO', 'ação', 'acao', 'ação 😀'];
  expect(new Set(values.map(v => candidate(unit('obra', v)).hash)).size).toBe(values.length);
  expect(utf8('😀').length).toBe(4);
});

it('recusa coerção de tipo e substituição de surrogate isolado', () => {
  expect(() => candidate(unit('obra', 123))).toThrow('Tipo não declarado');
  expect(() => candidate(unit('obra', '\ud800'))).toThrow('Surrogate isolado');
});

it('endereço e índice não entram no candidato e trechoId permanece null', () => {
  const a = unit(), b = clone(a);
  b.enderecoNaBase.indiceBaseZero = 9;
  b.enderecoNaBase.sha = 'outro-snapshot';
  const before = JSON.stringify([a, b]);
  expect(candidate(a).hash).toBe(candidate(b).hash);
  assess([a, b], [text(), text()]);
  expect(JSON.stringify([a, b])).toBe(before);
  expect([a.trechoId, b.trechoId]).toEqual([null, null]);
});

it('mesmo artigo, localizador e quote continuam indistinguíveis apesar de outro campo', () => {
  const a: any = unit(), b: any = clone(a);
  a.dadosOriginais.claim = 'afirmação A'; b.dadosOriginais.claim = 'afirmação B';
  const out = assess([a,b], [text(),text()]);
  expect(out.metrics.total.indistinguiveisPelaComposicao.unidades).toBe(2);
  expect(out.metrics.total.colisoesCriptograficasObservadas.grupos).toBe(0);
  expect(out.assessment.total.discriminaveisComoVersaoDoQuote).toBe(0);
  expect(out.rows.every((r: any) => r.reasons.includes('candidato repetido no conjunto total'))).toBe(true);
});

it('mede repetições entre populações, além das repetições internas', () => {
  const a = unit(), b = clone(a), c = unit('outra-obra');
  b.tipo = 'limiar';
  const out = assess([a,b,c], [text(),text(),text()]);
  expect(out.metrics.claims.candidatosRepetidos.grupos).toBe(0);
  expect(out.metrics.adicionais.candidatosRepetidos.grupos).toBe(0);
  expect(out.metrics.total.candidatosRepetidos.unidades).toBe(2);
  expect(out.metrics.total.quotesByteAIgual.unidades).toBe(3);
  expect(out.assessment.claims.discriminaveisComoVersaoDoQuote).toBe(1);
});

it('candidato único não basta quando o template não usa quote ou quando quote falta', () => {
  const a: any = unit('formula'), b: any = unit('benchmark');
  a.tipo = 'formula'; b.tipo = 'benchmark'; delete b.dadosOriginais.evidence;
  const out = assess([a,b], [text(false),text(false)]);
  expect(out.metrics.total.candidatosRepetidos.grupos).toBe(0);
  expect(out.assessment.total.completosEUnicosNoTotal).toBe(1);
  expect(out.assessment.total.discriminaveisComoVersaoDoQuote).toBe(0);
});

it('não elege verbatim como fallback nem resolve divergência ou conferência pendente', () => {
  const a: any = unit(); a.dadosOriginais.verbatim_quote = 'outro texto';
  const b: any = unit('sem-quote'); delete b.dadosOriginais.evidence.quote;
  const before = JSON.stringify([a,b]);
  const out = assess([a,b],[text(),text()]);
  expect(out.rows[0].eligible).toBe(true);
  expect(out.rows[1].values[3]).toEqual(['ausente']);
  expect(out.rows[1].eligible).toBe(false);
  expect(JSON.stringify([a,b])).toBe(before);
  expect(a.conferenciaPublicacao.estado).toBe('pendente');
});

it('rastreia as 165 unidades congeladas, conservando cada origem e a falta de identidade', () => {
  const base = path.resolve(__dirname, '../../docs/dados/a33-etapa4');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(base, f), 'utf8'));
  const ev = read('evidencias.json'), context = read('contexto-estatico.json'), c1 = read('C1-recuperacao.json');
  const before = JSON.stringify(ev);
  const texts = suppliedTexts(ev.porTrecho, context, c1);
  const out = assess(ev.porTrecho, texts);
  expect(texts).toHaveLength(165);
  expect(texts.every((t: any[]) => t.length > 0)).toBe(true);
  expect(texts.flat().filter((t: any) => t.origem === 'semantica_simulada')).toHaveLength(3);
  expect(texts.flat().filter((t: any) => t.origem === 'estatica')).toHaveLength(135);
  expect(texts.flat().filter((t: any) => t.origem === 'estatica_adicional')).toHaveLength(64);
  expect(out.assessment.total.discriminaveisComoVersaoDoQuote).toBe(107);
  expect(out.metrics.total.indistinguiveisPelaComposicao.grupos).toBe(6);
  expect(out.metrics.total.indistinguiveisPelaComposicao.unidades).toBe(13);
  expect(ev.porTrecho.every((u: any) => u.trechoId === null)).toBe(true);
  expect(JSON.stringify(ev)).toBe(before);
});

it('rejeita um recorte estático que não coincide com seus dados de origem', () => {
  const base = path.resolve(__dirname, '../../docs/dados/a33-etapa4');
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(base, f), 'utf8'));
  const ev = read('evidencias.json'), context = read('contexto-estatico.json'), c1 = read('C1-recuperacao.json');
  context.quatroSecoes[0].textoFormatado += ' alteração';
  expect(() => suppliedTexts(ev.porTrecho, context, c1)).toThrow('Template estático não coincide');
});
