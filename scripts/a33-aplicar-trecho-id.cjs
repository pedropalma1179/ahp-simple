/**
 * A.33, passo 3: aplica H-T como `trechoId` nos artefatos preparados da etapa 4.
 *
 * ⚠ Não altera `lib/rag/articles/`, não toca o índice, não gera parecer e não
 * reingere. Escreve APENAS campos `trechoId` já existentes nos artefatos, e os
 * resumos de integridade que `casos.json` mantém sobre os arquivos alterados.
 *
 * Modos: `resumos` (só mede), `aplicar` (mede antes, escreve, mede depois).
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { candidate } = require('./measure-a33-identity-v2.cjs');

const ROOT = path.resolve(__dirname, '..');
const DADOS = 'docs/dados/a33-etapa4/';
const MEDICAO = 'docs/dados/a33-identidade-revisada/';
const SNAPSHOT_MEDIDO = 'b3fe3d7a0c78b8129e185cbce0099ef606fb844e';
const PROTOCOLO_MEDICAO = '4f2a42a054f917e0cd85fe22f2f0512355b4c233';
const PREFIXO_HT = 'A33-por-tipo-v2';

/** A exceção, nomeada antes de medir. O motivo é de conteúdo mínimo, não de defeito. */
const EXCECAO = {
  articleId: 'saiyed2023_ceoPowerUET',
  campo: 'empirical_data',
  motivo:
    'insuficiente para o critério de benchmark do protocolo: os sete campos quantitativos são nulos, e o mínimo fixado antes da medição exigia ao menos um disponível. Não é defeito da base nem impossibilidade de calcular uma versão.',
};

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const utf8 = (s) => Buffer.from(s, 'utf8');
const ler = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const lerJson = (rel) => JSON.parse(ler(rel));
/** Medido em 16/09/2026: os quatro artefatos voltam byte a byte por este molde. */
const escreverJson = (rel, valor) =>
  fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(valor, null, 2) + '\n');

/** Endereço na base; `indiceBaseZero` ausente (benchmark) vira null, e não some. */
const chaveEndereco = (a) => JSON.stringify([a.sha, a.arquivo, a.campo, a.indiceBaseZero ?? null]);

/**
 * ALCANCE DECLARADO do resumo de texto, por artefato.
 *
 * ⚠ Nenhuma destas raízes contém `trechoId`: o campo novo é irmão de
 * `dadosOriginais`, de `referenceDoc` e de `chunk`. A exclusão do identificador
 * novo é estrutural, além de declarada. Os identificadores ANTIGOS — `id` do
 * dado, `chunk.id`, `referenceDoc.id`, `locator_id`, `article_id` — estão dentro
 * das raízes e PERMANECEM no controle.
 */
const RAIZES = {
  'evidencias.json': (j) => j.porTrecho.map((u, i) => [`porTrecho[${i}].dadosOriginais`, u.dadosOriginais]),
  'contexto-estatico.json': (j) => [
    ['system', j.system],
    ...j.quatroSecoes.flatMap((s, si) => [
      [`quatroSecoes[${si}].textoFormatado`, s.textoFormatado],
      [`quatroSecoes[${si}].sha256TextoUTF8`, s.sha256TextoUTF8],
      ...s.referencias.map((r, ri) => [`quatroSecoes[${si}].referencias[${ri}].referenceDoc`, r.referenceDoc]),
    ]),
    ...j.outrasTresSuperficies.flatMap((s, si) => [
      [`outrasTresSuperficies[${si}].textoFormatado`, s.textoFormatado],
      [`outrasTresSuperficies[${si}].sha256TextoUTF8`, s.sha256TextoUTF8],
    ]),
  ],
  'C1-recuperacao.json': (j) => [
    ...j.trechos.map((t, i) => [`trechos[${i}].chunk`, t.chunk]),
    ...j.porConsulta.flatMap((c, ci) => [
      [`porConsulta[${ci}].consulta`, c.consulta],
      ...c.retornoChunks.map((k, ki) => [`porConsulta[${ci}].retornoChunks[${ki}]`, k]),
    ]),
    ...j.finalChunksEsperados.map((k, i) => [`finalChunksEsperados[${i}]`, k]),
  ],
};

/**
 * Colhe todo valor string sob uma raiz, com o caminho.
 *
 * Chaves de objeto em ordem `sort()` de strings, UTF-16, como no protocolo da
 * medição; vetores na ordem própria. ⚠ Nenhuma normalização textual.
 */
function textos(valor, prefixo, saida) {
  if (typeof valor === 'string') { saida.push([prefixo, valor]); return saida; }
  if (Array.isArray(valor)) { valor.forEach((v, i) => textos(v, `${prefixo}[${i}]`, saida)); return saida; }
  if (valor !== null && typeof valor === 'object') {
    Object.keys(valor).sort().forEach((k) => textos(valor[k], `${prefixo}.${k}`, saida));
  }
  return saida;
}

/** Remove todo `trechoId` da árvore, preservando o resto. Base do resumo estrutural. */
function semTrechoId(valor) {
  if (Array.isArray(valor)) return valor.map(semTrechoId);
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(Object.keys(valor).sort().filter((k) => k !== 'trechoId').map((k) => [k, semTrechoId(valor[k])]));
  }
  return valor;
}

/** Os três resumos de um artefato, mais a relação por item que localiza diferença. */
function resumos(arquivo) {
  const rel = DADOS + arquivo;
  const bruto = ler(rel);
  const json = JSON.parse(bruto);
  const raizes = RAIZES[arquivo](json);
  const porItem = raizes.map(([nome, valor]) => {
    const pares = textos(valor, nome, []);
    return { raiz: nome, strings: pares.length, sha256: sha256(utf8(JSON.stringify(pares))) };
  });
  const todos = raizes.flatMap(([nome, valor]) => textos(valor, nome, []));
  return {
    arquivo: rel,
    sha256Arquivo: sha256(utf8(bruto)),
    sha256Estrutural: sha256(utf8(JSON.stringify(semTrechoId(json)))),
    sha256Texto: sha256(utf8(JSON.stringify(todos))),
    raizes: raizes.length,
    stringsDeTexto: todos.length,
    porItem,
  };
}

const ARQUIVOS = Object.keys(RAIZES);
const medirTodos = () => Object.fromEntries(ARQUIVOS.map((f) => [f, resumos(f)]));

/**
 * Calcula o `trechoId` das 165 unidades e confere contra a medição aprovada.
 *
 * ⚠ Duas fontes precisam concordar antes de qualquer escrita: o cálculo sobre a
 * árvore de trabalho e a chave registrada em `rastreabilidade.json` no commit da
 * medição. Divergência interrompe.
 */
function calcular() {
  const ev = lerJson(DADOS + 'evidencias.json');
  const traco = lerJson(MEDICAO + 'rastreabilidade.json');
  const medicao = lerJson(MEDICAO + 'medicao.json');
  if (traco.snapshot !== SNAPSHOT_MEDIDO || traco.protocolo !== PROTOCOLO_MEDICAO) throw Error('Rastreabilidade de outro snapshot ou protocolo');
  if (ev.porTrecho.length !== 165 || traco.principal.length !== 165) throw Error('Denominador diferente de 165');
  const excluidas = medicao.principal.total.T.excluidas;
  if (excluidas.length !== 1 || excluidas[0].articleId !== EXCECAO.articleId) throw Error('Exceção medida diferente da nomeada');

  return ev.porTrecho.map((u, i) => {
    const linha = traco.principal[i];
    if (chaveEndereco(linha.endereco) !== chaveEndereco(u.enderecoNaBase)) throw Error('Ordem divergente da medição no índice ' + i);
    const calculada = candidate(u, 'T');
    if (calculada.chave !== linha.T.chave) throw Error('Chave H-T recalculada diverge da medição no índice ' + i);
    if (!calculada.chave.startsWith(PREFIXO_HT + '\x1e')) throw Error('Prefixo H-T ausente no índice ' + i);
    const elegivel = linha.T.elegivel;
    if (elegivel !== (i !== excluidas[0].indice)) throw Error('Elegibilidade divergente da medição no índice ' + i);
    return { indice: i, endereco: chaveEndereco(u.enderecoNaBase), elegivel, trechoId: elegivel ? calculada.chave : null, versaoSha256: calculada.versaoSha256 };
  });
}

/** Escreve o valor em TODA ocorrência da unidade, nos três artefatos. */
function aplicar(linhas) {
  const porEndereco = new Map(linhas.map((l) => [l.endereco, l.trechoId]));
  const gravadas = [];
  const grava = (arquivo, caminho, alvo) => {
    const chave = chaveEndereco(alvo.enderecoNaBase);
    if (!porEndereco.has(chave)) throw Error('Ocorrência sem unidade no registro: ' + arquivo + ' ' + caminho);
    alvo.trechoId = porEndereco.get(chave);
    gravadas.push({ arquivo, caminho, trechoId: alvo.trechoId });
  };

  const ev = lerJson(DADOS + 'evidencias.json');
  ev.porTrecho.forEach((u, i) => grava('evidencias.json', `porTrecho[${i}]`, u));
  ev.semIdentificadorRecuperavel.forEach((u, i) => grava('evidencias.json', `semIdentificadorRecuperavel[${i}]`, u));

  const ce = lerJson(DADOS + 'contexto-estatico.json');
  ce.quatroSecoes.forEach((s, si) => s.referencias.forEach((r, ri) => grava('contexto-estatico.json', `quatroSecoes[${si}].referencias[${ri}]`, r)));
  ce.outrasTresSuperficies.forEach((s, si) => s.enderecos.forEach((e, ei) => grava('contexto-estatico.json', `outrasTresSuperficies[${si}].enderecos[${ei}]`, e)));

  const c1 = lerJson(DADOS + 'C1-recuperacao.json');
  c1.trechos.forEach((t, i) => grava('C1-recuperacao.json', `trechos[${i}]`, t));

  escreverJson(DADOS + 'evidencias.json', ev);
  escreverJson(DADOS + 'contexto-estatico.json', ce);
  escreverJson(DADOS + 'C1-recuperacao.json', c1);
  return gravadas;
}

/** Repõe em `casos.json` o que a aplicação tornou falso: resumos e a contagem. */
function atualizarCasos(comTrechoId) {
  const casos = lerJson(DADOS + 'casos.json');
  const antes = JSON.parse(JSON.stringify(casos));
  ARQUIVOS.forEach((f) => {
    casos.integridadeDosDados[f].resumoCompleto = sha256(fs.readFileSync(path.join(ROOT, DADOS + f)));
  });
  casos.resumoEvidencias.semTrechoId = 165 - comTrechoId;
  escreverJson(DADOS + 'casos.json', casos);
  return { antes: antes.integridadeDosDados, depois: casos.integridadeDosDados, semTrechoId: casos.resumoEvidencias.semTrechoId };
}

function run(modo) {
  const antes = medirTodos();
  if (modo === 'resumos') return { modo, snapshotMedido: SNAPSHOT_MEDIDO, antes };
  const linhas = calcular();
  const elegiveis = linhas.filter((l) => l.trechoId !== null);
  if (elegiveis.length !== 164) throw Error('Elegíveis diferente de 164: ' + elegiveis.length);
  const gravadas = aplicar(linhas);
  const casos = atualizarCasos(elegiveis.length);
  const depois = medirTodos();
  return { modo, snapshotMedido: SNAPSHOT_MEDIDO, antes, depois, elegiveis: elegiveis.length, nulos: linhas.length - elegiveis.length, gravadas: gravadas.length, excecao: EXCECAO, casos };
}

module.exports = { resumos, medirTodos, calcular, aplicar, textos, semTrechoId, chaveEndereco, RAIZES, ARQUIVOS, EXCECAO, PREFIXO_HT, run };

if (require.main === module) {
  const modo = process.argv[2] === 'aplicar' ? 'aplicar' : 'resumos';
  const out = run(modo);
  console.log(JSON.stringify(out, null, 2));
}
