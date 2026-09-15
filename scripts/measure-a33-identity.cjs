/** Medição offline de candidato, A.33. Não atribui trechoId nem importa clientes. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const SNAPSHOT = '745b4966727e2c507b162570e5fbec11d149b1e3';
const PROTOCOLO = '195e8a838ed8b97c2a746c227240eccb35875068';
const INPUT = 'docs/dados/a33-etapa4/';
const OUTPUT = 'docs/dados/a33-identidade-derivada/';
const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function utf8(s) {
  if (/[\uD800-\uDFFF]/u.test(s)) throw new Error('Surrogate isolado: conversão recusada');
  return Buffer.from(s, 'utf8');
}
function slot(object, key) {
  if (!own(object, key)) return ['ausente'];
  const v = object[key];
  if (v === null) return ['nulo'];
  if (typeof v !== 'string') throw new Error('Tipo não declarado: ' + key);
  utf8(v);
  return ['texto', v];
}
function fields(unit) {
  const e = unit.dadosOriginais.evidence;
  if (e != null && (typeof e !== 'object' || Array.isArray(e))) throw new Error('evidence inválida');
  return [slot(unit, 'articleId'), slot(e || {}, 'locator_type'), slot(e || {}, 'locator_id'), slot(e || {}, 'quote')];
}
function candidate(unit) {
  const values = fields(unit);
  const quoteHash = values[3][0] === 'texto' ? ['texto', sha(utf8(values[3][1]))] : values[3];
  const names = ['articleId', 'locator_type', 'locator_id', 'quote_sha256'];
  const components = [...values.slice(0, 3), quoteHash].map((s, i) => JSON.stringify([names[i], s]));
  if (components.some(s => s.includes('\x1e'))) throw new Error('Separador dentro de componente');
  const preimage = ['A33-candidato-v1', ...components].join('\x1e');
  return { values, quoteHash, preimage, hash: sha(utf8(preimage)) };
}
const available = (s) => s[0] === 'texto' && s[1].length > 0;
const addressKey = (a) => JSON.stringify([a.sha, a.arquivo, a.campo, a.indiceBaseZero ?? null]);
function repeated(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const k = keyFn(row);
    if (k === null) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return [...map.values()].filter(g => g.length > 1);
}
const counts = groups => ({ grupos: groups.length, unidades: groups.reduce((n,g) => n + g.length, 0), excedentes: groups.reduce((n,g) => n + g.length - 1, 0) });
const member = r => ({ indiceUnidade: r.index, tipo: r.unit.tipo, articleId: r.unit.articleId, enderecoNaBase: r.unit.enderecoNaBase });
function metrics(rows) {
  const status = (i) => ({ ausente: rows.filter(r => r.values[i][0] === 'ausente').length, nulo: rows.filter(r => r.values[i][0] === 'nulo').length, vazio: rows.filter(r => r.values[i][0] === 'texto' && r.values[i][1] === '').length, textoNaoVazio: rows.filter(r => available(r.values[i])).length });
  const duplicate = repeated(rows, r => r.hash);
  // A igualdade do conteúdo é comparada pelos bytes, não pelo hash.
  const content = repeated(rows, r => r.values[3][0] === 'texto' ? utf8(r.values[3][1]).toString('hex') : null);
  const identical = repeated(rows, r => JSON.stringify(r.values));
  const complete = identical.filter(g => g[0].values.every(available));
  const incomplete = identical.filter(g => !g[0].values.every(available));
  const cryptographic = duplicate.filter(g => new Set(g.map(r => JSON.stringify(r.values))).size > 1);
  return {
    denominador: rows.length,
    localizadores: { locator_type: status(1), locator_id: status(2), ambosAusentes: rows.filter(r => r.values[1][0] === 'ausente' && r.values[2][0] === 'ausente').length, ambosIndisponiveis: rows.filter(r => !available(r.values[1]) && !available(r.values[2])).length, algumIndisponivel: rows.filter(r => !available(r.values[1]) || !available(r.values[2])).length },
    quotes: status(3),
    candidatosRepetidos: { ...counts(duplicate), membros: duplicate.map(g => ({ candidatoSha256: g[0].hash, unidades: g.map(member) })) },
    quotesByteAIgual: { ...counts(content), membros: content.map(g => ({ quoteSha256: g[0].quoteHash[1], bytes: utf8(g[0].values[3][1]).length, unidades: g.map(member) })) },
    indistinguiveisPelaComposicao: { ...counts(identical), comCamposCompletos: counts(complete), comInformacaoIncompleta: counts(incomplete), membros: identical.map(g => ({ candidatoSha256: g[0].hash, camposCompletos: g[0].values.every(available), unidades: g.map(member) })) },
    colisoesCriptograficasObservadas: counts(cryptographic)
  };
}

function assess(units, texts) {
  const rows = units.map((unit, index) => ({ unit, index, ...candidate(unit), texts: texts[index] }));
  const duplicated = new Set(repeated(rows, r => r.hash).flatMap(g => g.map(r => r.index)));
  for (const r of rows) {
    r.reasons = [];
    ['articleId', 'locator_type', 'locator_id', 'quote'].forEach((f, i) => { if (!available(r.values[i])) r.reasons.push(f + ': ausente, nulo ou vazio'); });
    if (duplicated.has(r.index)) r.reasons.push('candidato repetido no conjunto total');
    if (!r.texts.length || !r.texts.every(t => t.quoteUsadoComoEvidencia)) r.reasons.push('o quote não é o trecho de evidência efetivamente usado em todas as origens desta unidade');
    r.eligible = r.reasons.length === 0;
  }
  const populations = { claims: rows.filter(r => r.unit.tipo === 'claim'), adicionais: rows.filter(r => r.unit.tipo !== 'claim'), total: rows };
  const assessment = Object.fromEntries(Object.entries(populations).map(([name, list]) => [name, {
    denominador: list.length,
    camposCompletos: list.filter(r => r.values.every(available)).length,
    completosEUnicosNoTotal: list.filter(r => r.values.every(available) && !duplicated.has(r.index)).length,
    discriminaveisComoVersaoDoQuote: list.filter(r => r.eligible).length,
    excluidas: list.filter(r => !r.eligible).length
  }]));
  return { rows, metrics: Object.fromEntries(Object.entries(populations).map(([n,r]) => [n, metrics(r)])), assessment };
}

/** Endereço serve só para ligar o snapshot e seus textos, nunca para compor candidato. */
function suppliedTexts(units, context, c1) {
  const texts = new Map();
  const add = (address, value) => {
    const key = addressKey(address);
    if (!texts.has(key)) texts.set(key, []);
    texts.get(key).push({ ...value, sha256TextoUTF8: sha(utf8(value.texto)) });
  };
  context.quatroSecoes.forEach((section, si) => {
    const rendered = section.referencias.map((ref, ri) => {
      const d = ref.referenceDoc;
      const text = `\n**${d.citation}** - *${d.topic}*\n${si === 3 ? '' : `Contexto: ${d.context}\n`}Fundamento: ${d.rule}\n`;
      const u = units.find(u => addressKey(u.enderecoNaBase) === addressKey(ref.enderecoNaBase));
      if (!u) throw new Error('Referência sem unidade no snapshot');
      add(ref.enderecoNaBase, { origem: 'estatica', secao: section.nome, casos: ['C1','C2','C3'], enderecoTexto: { arquivo: INPUT + 'contexto-estatico.json', vetor: `quatroSecoes[${si}].referencias`, indice: ri }, texto: text, quoteUsadoComoEvidencia: typeof u.dadosOriginais.evidence?.quote === 'string' && d.rule === u.dadosOriginais.evidence.quote, transformacao: 'Template da rota: citation, topic, context (exceto críticas) e rule; preservados como fixados.' });
      return text;
    }).join('\n');
    if (rendered !== section.textoFormatado) throw new Error('Template estático não coincide com o snapshot');
  });
  context.outrasTresSuperficies.forEach((section, si) => {
    let chunks;
    if (si === 0) {
      const lines = section.textoFormatado.split('\n');
      if (lines.length !== section.enderecos.length * 2) throw new Error('Limiares não têm dois versos por unidade');
      chunks = section.enderecos.map((_,i) => lines.slice(2*i,2*i+2).join('\n'));
    } else if (si === 1) chunks = section.textoFormatado.split('\n\n');
    else chunks = section.textoFormatado.split('\n').slice(2);
    if (chunks.length !== section.enderecos.length) throw new Error('Segmentação da superfície adicional não coincide');
    section.enderecos.forEach((entry, i) => add(entry.enderecoNaBase, { origem: 'estatica_adicional', secao: section.nome, casos: ['C1','C2','C3'], enderecoTexto: { arquivo: INPUT + 'contexto-estatico.json', vetor: `outrasTresSuperficies[${si}].enderecos`, indice: i }, texto: chunks[i], quoteUsadoComoEvidencia: si === 0, transformacao: si === 0 ? 'Limiar: valor, unidade, operador, contexto, artigo, ano e evidence.quote; texto copiado do recorte fixado.' : si === 1 ? 'Fórmula: descrição, artigo/ano, LaTeX, variáveis e condições. O template não usa evidence.quote.' : 'Benchmark: linha da tabela, arredondamento e substitutos de ausência já aplicados no snapshot. Não há quote.' }));
  });
  c1.finalChunksEsperados.forEach((chunk, i) => {
    const entry = c1.trechos.find(t => t.chunk.id === chunk.id);
    if (!entry) throw new Error('Chunk sem endereço');
    const m = chunk.metadata, loc = m.locator_id ? ` ${m.locator_id}` : '';
    const text = `**${i + 1}. ${m.article_id}** (${m.chunk_type}${loc}) — score: ${chunk.score.toFixed(3)}\n${m.text}\n*Verbatim:* "${m.verbatim_quote ?? 'N/A'}"`;
    const u = units.find(u => addressKey(u.enderecoNaBase) === addressKey(entry.enderecoNaBase));
    if (!u) throw new Error('Chunk sem unidade');
    add(entry.enderecoNaBase, { origem: 'semantica_simulada', casos: ['C1'], enderecoTexto: { arquivo: INPUT + 'C1-recuperacao.json', vetor: 'finalChunksEsperados', indice: i }, texto: text, quoteUsadoComoEvidencia: m.verbatim_quote === u.dadosOriginais.evidence?.quote, transformacao: 'formatSemanticChunks: cabeçalho, score com três casas e metadados fixados. Página não interpolada. Sem execução do handler.' });
  });
  return units.map(u => {
    const value = texts.get(addressKey(u.enderecoNaBase));
    if (!value || !value.length) throw new Error('Unidade sem texto preparado');
    return value;
  });
}

function run(root = path.resolve(__dirname, '..')) {
  const read = (name) => execFileSync('git', ['show', `${SNAPSHOT}:${INPUT}${name}`], { cwd: root });
  const raw = Object.fromEntries(['evidencias.json','contexto-estatico.json','C1-recuperacao.json'].map(n => [n, read(n)]));
  const evidence = JSON.parse(raw['evidencias.json']), context = JSON.parse(raw['contexto-estatico.json']), c1 = JSON.parse(raw['C1-recuperacao.json']);
  const units = evidence.porTrecho;
  if (units.length !== 165 || units.filter(u => u.tipo === 'claim').length !== 101 || units.some(u => u.trechoId !== null)) throw new Error('Base diferente da declarada');
  const before = JSON.stringify(units);
  const texts = suppliedTexts(units, context, c1);
  const result = assess(units, texts);
  if (JSON.stringify(units) !== before) throw new Error('Entrada alterada');
  const trace = { snapshotMedido: SNAPSHOT, protocoloAnterior: PROTOCOLO, esquemaAdotado: false, enderecoNaoEhIdentidade: 'Endereço não é identidade. Índice posicional não entra na composição nem será promovido a trechoId.', alcance: 'Textos efetivamente preparados nos dados fixados, não captura de uma geração real. Cada origem conserva seu texto; exemplos do system não se tornam evidência recuperada.', entradas: result.rows.map(r => ({ indiceUnidade: r.index, tipo: r.unit.tipo, candidatoSha256: r.hash, trechoId: null, campos: { articleId: r.values[0], locator_type: r.values[1], locator_id: r.values[2], quote: r.values[3] }, quoteSha256: r.quoteHash, preimagemSerializada: r.preimage, enderecoPreparacao: { sha: SNAPSHOT, arquivo: INPUT + 'evidencias.json', vetor: 'porTrecho', indice: r.index }, enderecoNaBase: r.unit.enderecoNaBase, indiceDaBaseAplicavel: own(r.unit.enderecoNaBase, 'indiceBaseZero'), evidencePresente: own(r.unit.dadosOriginais, 'evidence'), evidenceNula: r.unit.dadosOriginais.evidence === null, textosPreparados: r.texts, discriminavelComoVersaoDoQuote: r.eligible, motivosExclusao: r.reasons })) };
  const report = { snapshotMedido: SNAPSHOT, protocoloAnterior: PROTOCOLO, algoritmo: 'SHA-256', comprimentoHexadecimal: 64, esquemaAdotado: false, negativos: ['Não é identidade de claim estável.', 'Não é atestado de fidelidade à publicação.'], alvo: 'Versão do quote com artigo e localizador; não versiona todos os campos da unidade ou todo o texto formatado.', entradas: Object.fromEntries(Object.entries(raw).map(([n,bytes]) => [INPUT+n, { sha256: sha(bytes), bytes: bytes.length }])), medicoes: result.metrics, avaliacao: result.assessment, elegiveis: result.rows.filter(r => r.eligible).map(member), excluidas: result.rows.filter(r => !r.eligible).map(r => ({ ...member(r), motivos: r.reasons })), pendenciasInalteradas: { trechoIdNulo: units.filter(u => u.trechoId === null).length, publicacoesPendentes: units.filter(u => u.conferenciaPublicacao.estado === 'pendente').length, claimsComCamposDiferentes: units.filter(u => u.comparacaoDosCampos?.iguais === false).length }, rastreabilidade: 'rastreabilidade.json' };
  fs.mkdirSync(path.join(root, OUTPUT), { recursive: true });
  fs.writeFileSync(path.join(root, OUTPUT, 'rastreabilidade.json'), JSON.stringify(trace,null,2)+'\n');
  fs.writeFileSync(path.join(root, OUTPUT, 'medicao.json'), JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({ snapshot: SNAPSHOT, avaliacao: result.assessment, medicoes: Object.fromEntries(Object.entries(result.metrics).map(([k,m]) => [k, { denominador:m.denominador,localizadores:m.localizadores,quotes:m.quotes,candidatos:counts(repeated(result.rows.filter(r=> k==='total'||(k==='claims' ? r.unit.tipo==='claim':r.unit.tipo!=='claim')),r=>r.hash)),quotesRepetidos:{grupos:m.quotesByteAIgual.grupos,unidades:m.quotesByteAIgual.unidades},indistinguiveis:{grupos:m.indistinguiveisPelaComposicao.grupos,unidades:m.indistinguiveisPelaComposicao.unidades},colisoesCriptograficas:m.colisoesCriptograficasObservadas }])) },null,2));
  return report;
}
module.exports = { candidate, metrics, assess, suppliedTexts, utf8, run };
if (require.main === module) run();
