/**
 * A.33: nova versão do snapshot da etapa 4, em `docs/dados/a33-etapa4-v2/`.
 *
 * Propaga SOMENTE as alterações da base aprovadas em A.16, recalcula H-T onde
 * muda campo da composição e grava o manifesto de transição.
 *
 * ⚠ `docs/dados/a33-etapa4/` NÃO é tocado: é lido, e é o termo de comparação.
 * ⚠ Não altera `lib/rag/articles/`, não toca o índice, não gera parecer, não
 * chama serviço externo.
 *
 * Modos: `antes` grava os resumos de antes, e nada mais; `propagar` exige esses
 * resumos, confere que a v1 ainda é a mesma, e escreve a v2.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { candidate } = require('./measure-a33-identity-v2.cjs');
const { textos, semTrechoId, chaveEndereco, sha256, utf8, RAIZES } = require('./a33-aplicar-trecho-id.cjs');

const ROOT = path.resolve(__dirname, '..');
const V1 = 'docs/dados/a33-etapa4/';
const V2 = 'docs/dados/a33-etapa4-v2/';
const DATA = '2026-09-17';
const BASE_SNAPSHOT = '344d63121489348a7291725271564f06fe5ef5a5';
const COMMIT_A16_TEXTUAL = '8b057d9db2c70e701a757f5ad83336903c3b8000';
const COMMIT_A16_CLAIM = 'b567d99bec6881faa381651353120e1faaf7366a';
/**
 * A base corrigida é FIXA: é o SHA de onde a v2 leu o conteúdo, aprovado na
 * auditoria. Tomar o `HEAD` de cada execução mudaria o endereço a cada commit.
 */
const BASE_CORRIGIDA = '8f9434140ea00247e07c31dbff4cc84e5d45425f';
const ARQUIVOS = ['casos.json', 'contexto-estatico.json', 'evidencias.json', 'C1-recuperacao.json', 'identidade.json', 'publicacoes.json'];
const COPIADOS_SEM_ALTERACAO = ['identidade.json', 'publicacoes.json'];

/** Composição H-T de `key_claims`, transcrita de `a33-identidade-aplicada/protocolo.md`, seção 3. */
const CAMPOS_HT_KEY_CLAIMS = ['claim', 'verbatim_quote', 'evidence'];

const SAATY_ANTES = 'A reciprocal matrix A with positive entries is consistent if and only if \\lambda_{max} = n';
const SAATY_DEPOIS = 'a reciprocal matrix A with positive entries is consistent if and only if \\lambda_{max} = n';
const W_ANTES = 'synthesis requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship';
const W_DEPOIS = 'Synthesis however requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship between total benefits and total costs and total opportunities and total risks.';
const WC_ANTES = 'Priorities on different factors must be commensurate before synthesis to guarantee valid BOCR outcomes.';
const WC_DEPOIS = 'BOCR synthesis requires commensurate priorities on a common scale; synthesizing non-commensurate measures is deceiving.';

/**
 * As alterações aprovadas em A.16, e SÓ elas. A derivação pela base tem de
 * reproduzir esta lista exatamente; qualquer outra diferença interrompe.
 */
const APROVADAS = [
  { id: 'A16-E1-verbatim_quote', articleId: 'saaty1977_scaling', indiceBaseZero: 0, campo: 'verbatim_quote', antes: SAATY_ANTES, depois: SAATY_DEPOIS, commit: COMMIT_A16_TEXTUAL },
  { id: 'A16-E1-evidence.quote', articleId: 'saaty1977_scaling', indiceBaseZero: 0, campo: 'evidence.quote', antes: SAATY_ANTES, depois: SAATY_DEPOIS, commit: COMMIT_A16_TEXTUAL },
  { id: 'A16-E2-verbatim_quote', articleId: 'wijnmalen2007_bocr', indiceBaseZero: 0, campo: 'verbatim_quote', antes: W_ANTES, depois: W_DEPOIS, commit: COMMIT_A16_TEXTUAL },
  { id: 'A16-E2-evidence.quote', articleId: 'wijnmalen2007_bocr', indiceBaseZero: 0, campo: 'evidence.quote', antes: W_ANTES, depois: W_DEPOIS, commit: COMMIT_A16_TEXTUAL },
  { id: 'A16-E3-evidence.quote', articleId: 'wijnmalen2007_bocr', indiceBaseZero: 3, campo: 'evidence.quote', antes: W_ANTES, depois: W_DEPOIS, commit: COMMIT_A16_TEXTUAL },
  { id: 'A16-J1-claim', articleId: 'wijnmalen2007_bocr', indiceBaseZero: 0, campo: 'claim', antes: WC_ANTES, depois: WC_DEPOIS, commit: COMMIT_A16_CLAIM },
];

const PENDENCIA_P1 =
  'Antes de qualquer geração: delimitar P1 e conferir a sua aplicabilidade a esta versão, inclusive a C1, que a formulação registrada em 3db365c excluía. Paráfrase fiel sem however não é falha de transcrição, e a proibição de citação direta de A.33 é critério separado. A predição de A.33 segue não testada.';
const PENDENCIA_CONCLUSOES =
  'Versão 2: Saaty key_claims[0] e Wijnmalen key_claims[0] têm conteúdo novo sem conclusão registrada de correspondência textual, e Wijnmalen key_claims[0] também sem conclusão de sustentação da claim nova; Wijnmalen key_claims[3] segue com verbatim_quote e claim abertos em A.16. Ver manifesto-transicao.json.';

const git = (args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const blob = (sha, rel) => git(['show', `${sha}:${rel}`]);
const clone = (v) => JSON.parse(JSON.stringify(v));
const json = (v) => JSON.stringify(v === undefined ? null : v);
const shaJson = (v) => sha256(utf8(json(v)));
const serializar = (v) => JSON.stringify(v, null, 2) + '\n';
/** A árvore de trabalho pode ter CRLF por `core.autocrlf`; o blob tem LF. JSON não tem CR em conteúdo. */
const lerArquivo = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const lerJson = (rel) => JSON.parse(lerArquivo(rel));

// ============================================================
// Caminhos por segmentos
// ============================================================
//
// ⚠ Chave com ponto, como `C1-recuperacao.json`, torna ambíguo o caminho escrito
// só com pontos. Aqui o caminho é um vetor de segmentos, e o rótulo escreve entre
// colchetes toda chave que não é identificador simples.

const IDENTIFICADOR = /^[A-Za-z_$][A-Za-z0-9_$-]*$/;
const rotulo = (segs) => segs.map((s, i) => (typeof s === 'number' ? `[${s}]`
  : IDENTIFICADOR.test(s) ? (i ? '.' : '') + s : `[${JSON.stringify(s)}]`)).join('');
const valorEm = (raiz, segs) => segs.reduce((v, s) => (v === undefined || v === null ? undefined : v[s]), raiz);
function gravarEm(raiz, segs, valor) {
  valorEm(raiz, segs.slice(0, -1))[segs[segs.length - 1]] = valor;
}

/** Folhas em que duas árvores diferem, incluindo chave ou índice presente de um lado só. */
function diferencasSeg(a, b, segs = [], saida = []) {
  const objeto = (v) => v !== null && typeof v === 'object';
  if (objeto(a) && objeto(b) && Array.isArray(a) === Array.isArray(b)) {
    const chaves = [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .sort((x, y) => (Array.isArray(a) ? Number(x) - Number(y) : x < y ? -1 : x > y ? 1 : 0));
    for (const k of chaves) {
      const s = Array.isArray(a) ? Number(k) : k;
      if (!(k in a) || !(k in b)) saida.push([...segs, s]);
      else diferencasSeg(a[k], b[k], [...segs, s], saida);
    }
    return saida;
  }
  if (json(a) !== json(b)) saida.push(segs);
  return saida;
}

// ============================================================
// Base de artigos, lida por SHA
// ============================================================

/** Artigos da base num SHA, por arquivo, pelo mesmo caminho de `inventoryArticles`. */
function carregarBase(sha) {
  const ts = require('typescript');
  const arquivos = git(['ls-tree', '-r', '--name-only', sha, 'lib/rag/articles']).toString('utf8').trim().split('\n')
    .filter((f) => f.endsWith('.ts') && f !== 'lib/rag/articles/_template.ts');
  const porArquivo = new Map();
  for (const f of arquivos) {
    const js = ts.transpileModule(blob(sha, f).toString('utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const contexto = { exports: {} };
    vm.runInNewContext(js, contexto, { timeout: 1000 });
    porArquivo.set(f, contexto.exports.default);
  }
  return porArquivo;
}

/** Projeção de benchmark, espelho de `getAllBenchmarks` em `lib/rag/index.ts`. */
function benchmarkDe(a) {
  const d = a.empirical_data;
  if (!(a.type === 'application' || d.n_respondents !== null)) throw Error('Benchmark fora do filtro: ' + a.id);
  return {
    source_article: a.id,
    source_year: a.metadata.year,
    domain: a.metadata.domain,
    n_respondents: d.n_respondents,
    n_alternatives: d.n_alternatives,
    n_criteria_total: d.n_criteria.total,
    bocr_weights: d.bocr_weights,
    concordance_rate: d.concordance?.rate ?? null,
    cr_aggregated: d.cr_values?.aggregated ?? null,
    weight_ratio: d.weight_ratio_max_min,
  };
}

/** O valor da unidade na base, pelo arquivo, campo e índice do endereço. O `sha` do endereço não é lido. */
function valorNaBase(base, u) {
  const e = u.enderecoNaBase;
  const a = base.get(e.arquivo);
  if (!a || a.id !== u.articleId) throw Error('Artigo não encontrado para ' + chaveEndereco(e));
  const v = e.campo === 'empirical_data' ? benchmarkDe(a) : a[e.campo]?.[e.indiceBaseZero];
  if (v === undefined) throw Error('Endereço sem valor: ' + chaveEndereco(e));
  return clone(v);
}

/** Diferenças por campo entre o snapshot e a base, sobre as 165 unidades. */
function derivar(ev, base) {
  return ev.porTrecho.flatMap((u, indice) => {
    const naBase = valorNaBase(base, u);
    return diferencasSeg(u.dadosOriginais, naBase).map((segs) => ({
      indice,
      articleId: u.articleId,
      indiceBaseZero: u.enderecoNaBase.indiceBaseZero ?? null,
      campo: rotulo(segs),
      segs,
      antes: valorEm(u.dadosOriginais, segs),
      depois: valorEm(naBase, segs),
    }));
  });
}

const chaveMudanca = (m) => json([m.articleId, m.indiceBaseZero, m.campo, m.antes, m.depois]);

/** A derivação tem de ser EXATAMENTE a lista aprovada, sem faltar e sem sobrar. */
function conferirContraAprovadas(derivadas) {
  const d = derivadas.map(chaveMudanca).sort();
  const a = APROVADAS.map(chaveMudanca).sort();
  if (json(d) !== json(a)) throw Error('Diferenças da base fora da lista aprovada:\n' + json(derivadas));
  return derivadas.map((m) => ({ ...m, aprovada: APROVADAS.find((x) => chaveMudanca(x) === chaveMudanca(m)).id }));
}

// ============================================================
// Moldes das cópias
// ============================================================

/** `claimToRef`, em `app/api/ai-reviewer/knowledge.ts`: só `topic` e `rule` dependem dos campos aprovados. */
const topicDe = (d) => (d.claim.length > 120 ? d.claim.substring(0, 117) + '...' : d.claim);
const ruleDe = (d) => d.evidence.quote || d.verbatim_quote || d.claim;

/** As quatro seções de `route.ts`; a de referências críticas não tem a linha de contexto. */
function formatarSecao(indiceSecao, referencias) {
  return referencias.map(({ referenceDoc: r }) => (indiceSecao === 3
    ? `\n**${r.citation}** - *${r.topic}*\nFundamento: ${r.rule}\n`
    : `\n**${r.citation}** - *${r.topic}*\nContexto: ${r.context}\nFundamento: ${r.rule}\n`)).join('\n');
}

/** `buildClaimChunks`, em `scripts/ingest-rag.ts`: só `text` e `verbatim_quote` dependem dos campos aprovados. */
const verbatimDoChunk = (d) => d.evidence.quote ?? d.verbatim_quote;
const textoDoChunk = (d, artigo) => [
  `Claim: ${d.claim}`,
  `Verbatim: ${verbatimDoChunk(d)}`,
  `Context: ${artigo.metadata.domain ?? 'N/A'} (${artigo.type})`,
].join('\n');

// ============================================================
// Resumos
// ============================================================

/** Resumos de um artefato já lido. Para os de texto, os mesmos três da rodada de H-T, e mais o com `trechoId`. */
function resumosDe(arquivo, bruto) {
  const j = JSON.parse(bruto);
  const r = {
    sha256Arquivo: sha256(utf8(bruto)),
    sha256JsonCanonico: shaJson(j),
    sha256Estrutural: shaJson(semTrechoId(j)),
  };
  if (RAIZES[arquivo]) {
    const raizes = RAIZES[arquivo](j);
    const todos = raizes.flatMap(([nome, valor]) => textos(valor, nome, []));
    r.sha256Texto = sha256(utf8(JSON.stringify(todos)));
    r.stringsDeTexto = todos.length;
    r.porItem = raizes.map(([nome, valor]) => {
      const pares = textos(valor, nome, []);
      return { raiz: nome, strings: pares.length, sha256: sha256(utf8(JSON.stringify(pares))) };
    });
  }
  return r;
}

// ============================================================
// Controle estrutural por exceções enumeradas
// ============================================================

/** Classifica um caminho que difere entre v1 e v2. Caminho não previsto interrompe. */
function classificar(arquivo, caminho) {
  const regras = {
    'evidencias.json': [
      [/^porTrecho\[\d+\]\.dadosOriginais\./, 'substituicao-aprovada'],
      [/^porTrecho\[\d+\]\.trechoId$/, 'identidade-recalculada'],
      [/^porTrecho\[\d+\]\.enderecoNaBase\.sha$/, 'endereco-administrativo'],
    ],
    'contexto-estatico.json': [
      [/^quatroSecoes\[\d+\]\.referencias\[\d+\]\.referenceDoc\.(topic|rule)$/, 'copia-referenceDoc'],
      [/^quatroSecoes\[\d+\]\.referencias\[\d+\]\.trechoId$/, 'identidade-recalculada'],
      [/^quatroSecoes\[\d+\]\.referencias\[\d+\]\.enderecoNaBase\.sha$/, 'endereco-administrativo'],
      [/^quatroSecoes\[\d+\]\.textoFormatado$/, 'texto-formatado-recomposto'],
      [/^quatroSecoes\[\d+\]\.sha256TextoUTF8$/, 'resumo-derivado'],
    ],
    'C1-recuperacao.json': [
      [/^trechos\[\d+\]\.chunk\.metadata\.(text|verbatim_quote)$/, 'copia-chunk'],
      [/^trechos\[\d+\]\.trechoId$/, 'identidade-recalculada'],
      [/^trechos\[\d+\]\.enderecoNaBase\.sha$/, 'endereco-administrativo'],
      [/^porConsulta\[\d+\]\.retornoChunks\[\d+\]\.metadata\.(text|verbatim_quote)$/, 'copia-chunk-por-id'],
      [/^finalChunksEsperados\[\d+\]\.metadata\.(text|verbatim_quote)$/, 'copia-chunk-por-id'],
    ],
    'casos.json': [
      [/^(versaoPreparacao|dataUTC)$/, 'metadado-da-versao'],
      [/^pendenciasParaGeracao\[\d+\]$/, 'metadado-da-versao'],
      [/^integridadeDosDados\["[^"]+"\]\.resumoCompleto$/, 'resumo-derivado'],
    ],
  };
  const regra = (regras[arquivo] || []).find(([re]) => re.test(caminho));
  if (!regra) throw Error('Diferença fora da lista de exceções: ' + arquivo + ' ' + caminho);
  return regra[1];
}

/** Aplica pares de substituição por igualdade de cadeia inteira, conferindo o número de ocorrências. */
function aplicarSubstituicoes(texto, pares) {
  let saida = texto;
  for (const p of pares) {
    const n = saida.split(p.de).length - 1;
    if (n !== p.ocorrencias) throw Error(`Ocorrências de substituição: esperado ${p.ocorrencias}, observado ${n}`);
    saida = saida.split(p.de).join(p.para);
  }
  return saida;
}

// ============================================================
// Modo `antes`
// ============================================================

function capturarAntes() {
  const head = git(['rev-parse', 'HEAD']).toString('utf8').trim();
  if (git(['status', '--porcelain', '--', V1]).toString('utf8').trim() !== '') throw Error('v1 com alteração na árvore');
  const arquivos = {};
  for (const f of ARQUIVOS) {
    const bruto = blob(head, V1 + f).toString('utf8');
    if (lerArquivo(V1 + f) !== bruto) throw Error('Árvore de trabalho difere do blob em ' + f);
    arquivos[f] = { caminho: V1 + f, blobGit: git(['rev-parse', `${head}:${V1 + f}`]).toString('utf8').trim(), ...resumosDe(f, bruto) };
  }
  const saida = {
    rodada: 'A.33, nova versão do snapshot da etapa 4',
    papel: 'Resumos de ANTES, capturados antes de qualquer escrita da v2, sobre a v1 preservada. É o termo de comparação, e não se reconstrói a partir do já alterado.',
    headSha: head,
    snapshotAnterior: V1,
    alcanceDosResumos: 'sha256Arquivo: bytes do blob, com LF. sha256JsonCanonico: JSON.stringify do objeto lido. sha256Estrutural: árvore sem trechoId. sha256Texto e porItem: as raízes de texto declaradas em a33-identidade-aplicada/protocolo.md, seção 4, sem normalização.',
    arquivos,
  };
  fs.mkdirSync(path.join(ROOT, V2), { recursive: true });
  fs.writeFileSync(path.join(ROOT, V2, 'resumos-antes.json'), serializar(saida));
  return saida;
}

// ============================================================
// Modo `propagar`
// ============================================================

function propagar() {
  const antes = lerJson(V2 + 'resumos-antes.json');
  for (const f of ARQUIVOS) {
    const r = resumosDe(f, lerArquivo(V1 + f));
    if (json(r) !== json(Object.fromEntries(Object.entries(antes.arquivos[f]).filter(([k]) => !['caminho', 'blobGit'].includes(k))))) {
      throw Error('A v1 mudou depois da captura dos resumos: ' + f);
    }
  }
  const head = git(['rev-parse', 'HEAD']).toString('utf8').trim();
  if (git(['status', '--porcelain', '--', 'lib/rag']).toString('utf8').trim() !== '') throw Error('lib/rag com alteração na árvore');
  for (const outro of [COMMIT_A16_CLAIM, head]) {
    try { git(['diff', '--quiet', BASE_CORRIGIDA, outro, '--', 'lib/rag']); } catch { throw Error('lib/rag difere da base corrigida em ' + outro); }
  }

  const v1 = Object.fromEntries(ARQUIVOS.map((f) => [f, lerJson(V1 + f)]));
  const ev1 = v1['evidencias.json'];
  if (ev1.baseSha !== BASE_SNAPSHOT) throw Error('Base do snapshot diferente da esperada');

  // Derivação, com controle: contra a base do snapshot, zero diferenças.
  const baseSnapshot = carregarBase(BASE_SNAPSHOT);
  const controle = derivar(ev1, baseSnapshot);
  if (controle.length !== 0) throw Error('O snapshot não reproduz a própria base: ' + json(controle));
  const baseCorrigida = carregarBase(BASE_CORRIGIDA);
  const mudancas = conferirContraAprovadas(derivar(ev1, baseCorrigida));
  const afetadas = [...new Set(mudancas.map((m) => m.indice))].sort((a, b) => a - b);
  const porEndereco = new Map(ev1.porTrecho.map((u, i) => [chaveEndereco(u.enderecoNaBase), i]));
  const artigoDe = (u) => baseCorrigida.get(u.enderecoNaBase.arquivo);

  // Registro de unidades.
  const ev2 = clone(ev1);
  const identidades = [];
  for (const i of afetadas) {
    const u1 = ev1.porTrecho[i], u2 = ev2.porTrecho[i];
    if (candidate(u1, 'T').chave !== u1.trechoId) throw Error('trechoId da v1 não reproduz H-T no índice ' + i);
    const daUnidade = mudancas.filter((m) => m.indice === i);
    daUnidade.forEach((m) => gravarEm(u2.dadosOriginais, m.segs, m.depois));
    u2.enderecoNaBase.sha = BASE_CORRIGIDA;
    const naComposicao = daUnidade.filter((m) => CAMPOS_HT_KEY_CLAIMS.includes(m.campo.split('.')[0]));
    const recalculada = candidate(u2, 'T').chave;
    // Controle: o endereço sozinho não move a identidade.
    const soEndereco = clone(u1); soEndereco.enderecoNaBase.sha = BASE_CORRIGIDA;
    if (candidate(soEndereco, 'T').chave !== u1.trechoId) throw Error('Endereço alterou identidade no índice ' + i);
    if (naComposicao.length > 0) u2.trechoId = recalculada;
    else if (recalculada !== u1.trechoId) throw Error('Identidade mudou sem campo da composição no índice ' + i);
    const iguais = u2.dadosOriginais.verbatim_quote.trim() === u2.dadosOriginais.evidence.quote.trim();
    if (iguais !== u1.comparacaoDosCampos.iguais) throw Error('comparacaoDosCampos mudaria no índice ' + i);
    identidades.push({
      indice: i,
      articleId: u1.articleId,
      enderecoAnterior: u1.enderecoNaBase,
      enderecoNovo: u2.enderecoNaBase,
      camposAlterados: daUnidade.map((m) => ({ campo: m.campo, aprovada: m.aprovada, participaDaComposicaoHT: CAMPOS_HT_KEY_CLAIMS.includes(m.campo.split('.')[0]) })),
      alteracaoAdministrativa: [{ campo: 'enderecoNaBase.sha', antes: u1.enderecoNaBase.sha, depois: BASE_CORRIGIDA, participaDaComposicaoHT: false }],
      decisao: naComposicao.length > 0 ? 'recalcular' : 'manter',
      motivo: naComposicao.length > 0
        ? `Mudou campo que participa da composição H-T: ${[...new Set(naComposicao.map((m) => m.campo.split('.')[0]))].join(', ')}. A mudança de endereço, sozinha, manteria o identificador, e isso foi conferido.`
        : 'Só mudança administrativa: identidade mantida.',
      trechoIdAnterior: u1.trechoId,
      trechoIdNovo: u2.trechoId,
      versaoSha256Anterior: candidate(u1, 'T').versaoSha256,
      versaoSha256Nova: candidate(u2, 'T').versaoSha256,
    });
  }
  const novoPorEndereco = new Map(ev2.porTrecho.map((u, i) => [chaveEndereco(u.enderecoNaBase), i]));

  // Contexto estático.
  const ce1 = v1['contexto-estatico.json'], ce2 = clone(ce1);
  ce1.quatroSecoes.forEach((s, si) => {
    if (formatarSecao(si, s.referencias) !== s.textoFormatado) throw Error('O molde não reproduz a seção ' + si + ' da v1');
    if (sha256(utf8(s.textoFormatado)) !== s.sha256TextoUTF8) throw Error('Resumo gravado da seção ' + si + ' não confere');
  });
  const substituicoesPorSecao = ce2.quatroSecoes.map(() => []);
  ce2.quatroSecoes.forEach((s, si) => s.referencias.forEach((r) => {
    const i = porEndereco.get(chaveEndereco(r.enderecoNaBase));
    if (i === undefined) throw Error('Referência sem unidade');
    const d1 = ev1.porTrecho[i].dadosOriginais;
    if (r.referenceDoc.topic !== topicDe(d1) || r.referenceDoc.rule !== ruleDe(d1)) throw Error('referenceDoc da v1 não reproduz claimToRef no índice ' + i);
    if (!afetadas.includes(i)) return;
    const d2 = ev2.porTrecho[i].dadosOriginais;
    for (const [campo, novo, origem] of [['topic', topicDe(d2), 'claim'], ['rule', ruleDe(d2), 'evidence.quote']]) {
      if (novo !== r.referenceDoc[campo]) {
        const aprovada = mudancas.find((m) => m.indice === i && m.campo === origem).aprovada;
        substituicoesPorSecao[si].push({ de: r.referenceDoc[campo], para: novo, aprovada });
      }
      r.referenceDoc[campo] = novo;
    }
    r.trechoId = ev2.porTrecho[i].trechoId;
    r.enderecoNaBase.sha = BASE_CORRIGIDA;
  }));
  ce2.outrasTresSuperficies.forEach((s) => s.enderecos.forEach((e) => {
    if (afetadas.includes(porEndereco.get(chaveEndereco(e.enderecoNaBase ?? e)))) throw Error('Superfície adicional com unidade afetada');
  }));
  ce2.quatroSecoes.forEach((s, si) => {
    s.textoFormatado = formatarSecao(si, s.referencias);
    s.sha256TextoUTF8 = sha256(utf8(s.textoFormatado));
  });

  // Chunks de C1: as entradas de `trechos` e as cópias vinculadas por `chunk.id`.
  const c11 = v1['C1-recuperacao.json'], c12 = clone(c11);
  const chunkPorId1 = new Map();
  c11.trechos.forEach((t) => {
    if (chunkPorId1.has(t.chunk.id)) throw Error('chunk.id repetido em trechos');
    chunkPorId1.set(t.chunk.id, t.chunk);
    const i = porEndereco.get(chaveEndereco(t.enderecoNaBase));
    const u = ev1.porTrecho[i];
    if (t.chunk.metadata.text !== textoDoChunk(u.dadosOriginais, carregarArtigo(baseSnapshot, u))) throw Error('O molde não reproduz o chunk da v1: ' + t.chunk.id);
    if (t.chunk.metadata.verbatim_quote !== verbatimDoChunk(u.dadosOriginais)) throw Error('verbatim do chunk da v1 não reproduz: ' + t.chunk.id);
  });
  const substituicoesPorChunk = new Map();
  c12.trechos.forEach((t) => {
    const i = porEndereco.get(chaveEndereco(t.enderecoNaBase));
    if (!afetadas.includes(i)) return;
    const u2 = ev2.porTrecho[i];
    const m = t.chunk.metadata;
    const novoTexto = textoDoChunk(u2.dadosOriginais, artigoDe(u2));
    const pares = mudancas.filter((x) => x.indice === i && x.campo !== 'verbatim_quote').map((x) => ({ de: x.antes, para: x.depois, ocorrencias: 1 }));
    substituicoesPorChunk.set(t.chunk.id, pares);
    m.text = novoTexto;
    m.verbatim_quote = verbatimDoChunk(u2.dadosOriginais);
    t.trechoId = u2.trechoId;
    t.enderecoNaBase.sha = BASE_CORRIGIDA;
  });
  const chunkPorId2 = new Map(c12.trechos.map((t) => [t.chunk.id, t.chunk]));
  const substituirCopia = (copia, onde) => {
    if (!chunkPorId1.has(copia.id)) throw Error('Cópia de chunk sem entrada em trechos: ' + onde);
    if (json(copia) !== json(chunkPorId1.get(copia.id))) throw Error('Cópia de chunk da v1 difere da entrada: ' + onde);
    return clone(chunkPorId2.get(copia.id));
  };
  c12.porConsulta.forEach((c, ci) => { c.retornoChunks = c.retornoChunks.map((k, ki) => substituirCopia(k, `porConsulta[${ci}].retornoChunks[${ki}]`)); });
  c12.finalChunksEsperados = c12.finalChunksEsperados.map((k, ki) => substituirCopia(k, `finalChunksEsperados[${ki}]`));

  // Casos.
  const casos1 = v1['casos.json'], casos2 = clone(casos1);
  casos2.versaoPreparacao = 2;
  casos2.dataUTC = DATA;
  casos2.pendenciasParaGeracao = [...casos1.pendenciasParaGeracao, PENDENCIA_P1, PENDENCIA_CONCLUSOES];
  const escritos = {
    'evidencias.json': serializar(ev2),
    'contexto-estatico.json': serializar(ce2),
    'C1-recuperacao.json': serializar(c12),
  };
  for (const f of COPIADOS_SEM_ALTERACAO) escritos[f] = lerArquivo(V1 + f);
  for (const f of Object.keys(casos2.integridadeDosDados)) casos2.integridadeDosDados[f].resumoCompleto = sha256(utf8(escritos[f]));
  const resumoCalculado = {
    claimsPreparadasDistintas: ev2.porTrecho.filter((u) => u.tipo === 'claim').length,
    unidadesAdicionais: ev2.porTrecho.filter((u) => u.tipo !== 'claim').length,
    totalUnidades: ev2.porTrecho.length,
    conferidas: ev2.porTrecho.filter((u) => u.conferenciaPublicacao.estado === 'conferido').length,
    pendentes: ev2.porTrecho.filter((u) => u.conferenciaPublicacao.estado === 'pendente').length,
    semTrechoId: ev2.porTrecho.filter((u) => u.trechoId === null).length,
    claimsComCamposDiferentes: ev2.porTrecho.filter((u) => u.comparacaoDosCampos?.iguais === false).length,
  };
  if (json(resumoCalculado) !== json(casos1.resumoEvidencias)) throw Error('Resumo de evidências mudaria: ' + json(resumoCalculado));
  escritos['casos.json'] = serializar(casos2);

  // Controle: o molde de escrita reproduz os bytes da v1.
  for (const f of ['evidencias.json', 'contexto-estatico.json', 'C1-recuperacao.json', 'casos.json']) {
    if (serializar(v1[f]) !== lerArquivo(V1 + f)) throw Error('O molde de escrita não reproduz a v1: ' + f);
  }

  // Exceções enumeradas.
  const novos = { 'evidencias.json': ev2, 'contexto-estatico.json': ce2, 'C1-recuperacao.json': c12, 'casos.json': casos2 };
  const excecoes = [];
  for (const [f, depois] of Object.entries(novos)) {
    for (const segs of diferencasSeg(v1[f], depois)) {
      const caminho = rotulo(segs);
      const categoria = classificar(f, caminho);
      const a = valorEm(v1[f], segs), d = valorEm(depois, segs);
      const e = { arquivo: f, caminho, categoria, existiaAntes: a !== undefined, sha256Antes: shaJson(a), sha256Depois: shaJson(d) };
      const grande = typeof a === 'string' && a.length > 2000;
      if (!grande) { e.antes = a === undefined ? null : a; e.depois = d; }
      const unidade = (() => {
        const m = caminho.match(/^(porTrecho|trechos)\[(\d+)\]/) || caminho.match(/^quatroSecoes\[(\d+)\]\.referencias\[(\d+)\]/);
        if (!m) return undefined;
        const alvo = caminho.startsWith('porTrecho') ? ev1.porTrecho[Number(m[2])]
          : caminho.startsWith('trechos') ? c11.trechos[Number(m[2])]
            : ce1.quatroSecoes[Number(m[1])].referencias[Number(m[2])];
        return porEndereco.get(chaveEndereco(alvo.enderecoNaBase));
      })();
      if (unidade !== undefined) e.unidade = unidade;
      if (categoria === 'substituicao-aprovada') {
        const campo = caminho.replace(/^porTrecho\[\d+\]\.dadosOriginais\./, '');
        e.aprovada = mudancas.find((m) => m.indice === unidade && m.campo === campo).aprovada;
      }
      if (categoria === 'copia-referenceDoc') {
        const campo = caminho.endsWith('.topic') ? 'claim' : 'evidence.quote';
        e.aprovada = mudancas.find((m) => m.indice === unidade && m.campo === campo).aprovada;
        e.molde = 'claimToRef, app/api/ai-reviewer/knowledge.ts: topic vem de claim, rule de evidence.quote';
      }
      if (categoria === 'texto-formatado-recomposto') {
        const si = Number(caminho.match(/^quatroSecoes\[(\d+)\]/)[1]);
        const grupos = new Map();
        substituicoesPorSecao[si].forEach((p) => {
          const k = json([p.de, p.para]);
          if (!grupos.has(k)) grupos.set(k, []);
          grupos.get(k).push(p.aprovada);
        });
        e.substituicoes = [...grupos.entries()].map(([k, aprovadas]) => {
          const [de, para] = JSON.parse(k);
          return { de, para, ocorrencias: aprovadas.length, aprovadas };
        });
        if (aplicarSubstituicoes(a, e.substituicoes) !== d) throw Error('Substituições não explicam ' + caminho);
        e.comprimentoAntes = a.length; e.comprimentoDepois = d.length;
        e.molde = 'as quatro seções de app/api/ai-reviewer/route.ts';
      }
      if (categoria === 'copia-chunk' || categoria === 'copia-chunk-por-id') {
        const id = valorEm(c11, [...segs.slice(0, -2), 'id']);
        e.chunkId = id;
        e.molde = 'buildClaimChunks, scripts/ingest-rag.ts';
        const indiceDoChunk = porEndereco.get(chaveEndereco(c11.trechos.find((t) => t.chunk.id === id).enderecoNaBase));
        if (caminho.endsWith('.text')) {
          e.substituicoes = substituicoesPorChunk.get(id);
          if (aplicarSubstituicoes(a, e.substituicoes) !== d) throw Error('Substituições não explicam ' + caminho);
          e.aprovadas = mudancas.filter((m) => m.indice === indiceDoChunk && m.campo !== 'verbatim_quote').map((m) => m.aprovada);
        } else {
          e.aprovada = mudancas.find((m) => m.indice === indiceDoChunk && m.campo === 'evidence.quote').aprovada;
        }
      }
      excecoes.push(e);
    }
  }

  // Estados de conferência e indicador de C1.
  const transicoes = ev1.porTrecho.map((u, i) => {
    const u2 = ev2.porTrecho[i];
    const afetada = afetadas.includes(i);
    return {
      indice: i,
      articleId: u.articleId,
      enderecoNaBase: u.enderecoNaBase,
      afetada,
      estadoAnterior: u.conferenciaPublicacao.estado,
      estadoPosterior: u2.conferenciaPublicacao.estado,
      evidencia: afetada ? EVIDENCIA_AFETADAS[u.articleId + '#' + u.enderecoNaBase.indiceBaseZero]
        : 'Conteúdo idêntico ao da v1, conferido pela derivação e pelo resumo por item; nenhuma conclusão nova. Estado e pendências preservados.',
    };
  });
  if (transicoes.some((t) => t.estadoAnterior !== t.estadoPosterior)) throw Error('Transição de estado sem conclusão nova');
  const indicadorC1 = calcularIndicadorC1(c12, ev2, novoPorEndereco);

  const manifesto = {
    versao: 2,
    rodada: 'A.33, nova versão do snapshot da etapa 4',
    data: DATA,
    natureza: 'Rodada de dados. Propaga somente as alterações da base aprovadas em A.16, recalcula H-T onde muda campo da composição e verifica todas as cópias. Sem geração, sem reingestão, sem chamada externa de inferência, embedding ou recuperação.',
    snapshotAnterior: {
      caminho: V1,
      preservado: 'Integralmente inalterado, no mesmo caminho. Os resultados históricos dele valem para o conteúdo dele.',
      baseSha: BASE_SNAPSHOT,
      resumosDeAntes: V2 + 'resumos-antes.json',
      sha256ResumosDeAntes: sha256(utf8(lerArquivo(V2 + 'resumos-antes.json'))),
    },
    baseCorrigida: {
      sha: BASE_CORRIGIDA,
      commitsDaCorrecao: [COMMIT_A16_TEXTUAL, COMMIT_A16_CLAIM],
      libRagIdenticaA: COMMIT_A16_CLAIM,
      nota: 'As correções vieram de 8b057d9 e b567d99, auditadas e integradas; lib/rag no SHA lido é idêntica à de b567d99.',
    },
    alcanceDaPropagacao: {
      alterados: ['evidencias.json', 'contexto-estatico.json', 'C1-recuperacao.json', 'casos.json'],
      copiadosSemAlteracao: COPIADOS_SEM_ALTERACAO,
      notaSobreCopias: 'identidade.json e publicacoes.json são medições históricas vinculadas a ' + BASE_SNAPSHOT + ': localizam unidades por endereço naquele SHA e não contêm os textos corrigidos. Seguem byte a byte iguais; o vínculo das três unidades afetadas está em identidadePorUnidade.',
      lugaresDoTexto: ['contexto estático: referenceDoc e textoFormatado das quatro seções', 'cópias dos chunks de C1: trechos e as cópias vinculadas por chunk.id'],
      registro: 'evidencias.json é o registro auxiliar das 165 unidades: recebe as substituições em dadosOriginais, que é de onde H-T se calcula.',
    },
    aprovadas: APROVADAS,
    derivacao: {
      metodo: 'Para cada uma das 165 unidades da v1, o valor na base pelo arquivo, campo e índice do endereço, comparado campo a campo com dadosOriginais.',
      controleContraBaseDoSnapshot: { sha: BASE_SNAPSHOT, diferencas: controle.length },
      contraBaseCorrigida: { sha: BASE_CORRIGIDA, diferencas: mudancas.map(({ segs, ...m }) => m) },
      unidadesAfetadas: afetadas,
      unidadesNaoAfetadas: ev1.porTrecho.length - afetadas.length,
    },
    identidadePorUnidade: identidades,
    composicaoHT: 'Aplicada sem alteração: prefixo A33-por-tipo-v2; para key_claims, os campos claim, verbatim_quote e evidence. Endereço, usable_as e posição não participam.',
    excecoesEnumeradas: excecoes,
    transicoes,
    contagens: {
      denominador: ev2.porTrecho.length,
      conferidasAntes: ev1.porTrecho.filter((u) => u.conferenciaPublicacao.estado === 'conferido').length,
      conferidasDepois: resumoCalculado.conferidas,
      pendentesAntes: ev1.porTrecho.filter((u) => u.conferenciaPublicacao.estado === 'pendente').length,
      pendentesDepois: resumoCalculado.pendentes,
      movidas: transicoes.filter((t) => t.estadoAnterior !== t.estadoPosterior).length,
      nota: 'Resultado da verificação sobre 165 unidades distintas, sem somar cópias. Propagação correta não é conferência bibliográfica.',
    },
    indicadorC1,
    payloadDeReferencia: require('./a33-payload-referencia.cjs').declaracao(),
    pendencias: [PENDENCIA_P1, PENDENCIA_CONCLUSOES],
    limites: [
      'Aprovação estrutural, resumo correto e identidade recalculada não mudam estado de conferência.',
      'Identificador não certifica conteúdo.',
      'Nenhum identificador entra no texto fornecido ao modelo, nem foi acrescentado a chunk.',
      'A predição de A.33 segue não testada; esta rodada não introduz hipótese nova sobre a saída.',
    ],
  };

  fs.mkdirSync(path.join(ROOT, V2), { recursive: true });
  for (const [f, conteudo] of Object.entries(escritos)) fs.writeFileSync(path.join(ROOT, V2, f), conteudo);
  fs.writeFileSync(path.join(ROOT, V2, 'manifesto-transicao.json'), serializar(manifesto));
  return {
    baseCorrigida: BASE_CORRIGIDA,
    afetadas,
    excecoes: excecoes.length,
    porCategoria: excecoes.reduce((o, e) => ({ ...o, [e.categoria]: (o[e.categoria] || 0) + 1 }), {}),
    indicadorC1: { total: indicadorC1.total, quais: indicadorC1.quais },
    identidades: identidades.map((x) => ({ indice: x.indice, decisao: x.decisao })),
  };
}

function carregarArtigo(base, u) {
  const a = base.get(u.enderecoNaBase.arquivo);
  if (!a) throw Error('Artigo ausente: ' + u.enderecoNaBase.arquivo);
  return a;
}

/**
 * Evidência citada por unidade afetada. ⚠ Nenhuma autoriza transição: as
 * conclusões registradas descrevem o conteúdo da v1.
 */
const EVIDENCIA_AFETADAS = {
  'saaty1977_scaling#0': {
    conteudoDaV2: 'Igual ao da base corrigida, aprovado em A.16 (A16-E1-verbatim_quote e A16-E1-evidence.quote).',
    conclusoesRegistradas: 'docs/dados/a33-conferencia-c1/medicao-pdfs.json, inspecaoVisualSaaty237: campos "nao confere" por D1.b, sobre o recorte da v1; claim "sustentada"; localizador compatível.',
    aplicabilidadeAV2: 'A conclusão de correspondência textual descreve o recorte da v1, que difere do da v2; para o recorte da v2 não há conclusão registrada. A de sustentação se aplica, porque a claim não mudou.',
    pendencias: 'Conservadas. Falta a conclusão de correspondência textual da versão nova.',
  },
  'wijnmalen2007_bocr#0': {
    conteudoDaV2: 'Igual ao da base corrigida, aprovado em A.16 (A16-E2-verbatim_quote, A16-E2-evidence.quote e A16-J1-claim).',
    conclusoesRegistradas: 'docs/dados/a33-conferencia-c1/inspecao-wijnmalen-forman.json, trechos[0]: campos "nao confere" por W1.a, W1.b e W2.a, sobre o recorte da v1; claim anterior "parcialmente sustentada"; localizador compatível.',
    aplicabilidadeAV2: 'As duas conclusões descrevem a v1: o recorte e a claim mudaram. Para o conteúdo da v2 não há conclusão registrada de correspondência textual nem de sustentação.',
    pendencias: 'Conservadas. Faltam as duas conclusões sobre a versão nova.',
  },
  'wijnmalen2007_bocr#3': {
    conteudoDaV2: 'Igual ao da base corrigida, aprovado em A.16 (A16-E3-evidence.quote).',
    conclusoesRegistradas: 'Nenhuma conferência da unidade. inspecao-wijnmalen-forman.json registra o texto antigo desta unidade só como alcance observado.',
    aplicabilidadeAV2: 'Continua PARCIALMENTE PENDENTE: o evidence.quote corrigido não certifica a claim nem o verbatim_quote, que seguem abertos em A.16, e os dois campos continuam diferentes.',
    pendencias: 'Conservadas: divergência de A.16 e conferência contra a publicação.',
  },
};

/**
 * Indicador de C1 na v2: uma conclusão registrada só vale se o conteúdo da v2
 * for o conteúdo inspecionado, no recorte e na claim.
 */
function calcularIndicadorC1(c12, ev2, novoPorEndereco) {
  const insp = lerJson('docs/dados/a33-conferencia-c1/inspecao-wijnmalen-forman.json');
  const med = lerJson('docs/dados/a33-conferencia-c1/medicao-pdfs.json');
  const registros = {
    saaty1977_scaling: { fonte: 'medicao-pdfs.json, inspecaoVisualSaaty237', r: med.inspecaoVisualSaaty237 },
    wijnmalen2007_bocr: { fonte: 'inspecao-wijnmalen-forman.json, trechos[0]', r: insp.trechos[0] },
    forman1998_aggregating: { fonte: 'inspecao-wijnmalen-forman.json, trechos[1]', r: insp.trechos[1] },
  };
  const porTrecho = c12.trechos.map((t) => {
    const u = ev2.porTrecho[novoPorEndereco.get(chaveEndereco(t.enderecoNaBase))];
    const { fonte, r } = registros[t.articleId];
    const d = u.dadosOriginais;
    const recorteInspecionado = r.recorte.texto;
    const correspondenciaAplica = d.verbatim_quote === recorteInspecionado && d.evidence.quote === recorteInspecionado;
    const sustentacaoAplica = d.claim === r.sustentacaoDaClaim.claim;
    const condicoes = r.resultadoDaUnidade.condicoesDaSecao4;
    const atende = correspondenciaAplica && sustentacaoAplica
      && condicoes.doisCamposConferem === true && condicoes.claimSustentada === true
      && condicoes.semDivergenciaA16 === true && condicoes.semLocalizadorDivergente === true;
    return {
      articleId: t.articleId,
      indiceBaseZero: t.enderecoNaBase.indiceBaseZero,
      registro: fonte,
      conclusaoDeCorrespondenciaAplicaAV2: correspondenciaAplica,
      conclusaoDeSustentacaoAplicaAV2: sustentacaoAplica,
      atendimentoDemonstrado: atende,
      motivo: atende ? 'Conteúdo da v2 idêntico ao inspecionado, e as quatro condições registradas.'
        : [
          !correspondenciaAplica && 'o recorte da v2 não é o inspecionado, e não há conclusão de correspondência para ele',
          !sustentacaoAplica && 'a claim da v2 não é a avaliada, e não há conclusão de sustentação para ela',
        ].filter(Boolean).join('; ') || 'o registro não traz as quatro condições',
    };
  });
  return {
    criterio: 'Atendimento demonstrado só quando o conteúdo da v2 é o inspecionado e o registro traz as quatro condições da seção 5 do protocolo de C1.',
    historicoV1: { total: insp.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.total, denominador: 3, fonte: 'inspecao-wijnmalen-forman.json' },
    total: porTrecho.filter((x) => x.atendimentoDemonstrado).length,
    denominador: porTrecho.length,
    quais: porTrecho.filter((x) => x.atendimentoDemonstrado).map((x) => `${x.articleId} key_claims[${x.indiceBaseZero}]`),
    porTrecho,
  };
}

module.exports = {
  V1, V2, BASE_SNAPSHOT, APROVADAS, CAMPOS_HT_KEY_CLAIMS, ARQUIVOS, COPIADOS_SEM_ALTERACAO,
  PENDENCIA_P1, PENDENCIA_CONCLUSOES, valorNaBase, benchmarkDe, derivar, conferirContraAprovadas,
  topicDe, ruleDe, formatarSecao, textoDoChunk, verbatimDoChunk, resumosDe, classificar,
  aplicarSubstituicoes, lerArquivo, lerJson, rotulo, valorEm, diferencasSeg,
};

if (require.main === module) {
  const modo = process.argv[2];
  if (modo === 'antes') console.log(JSON.stringify(capturarAntes(), (k, v) => (k === 'porItem' ? `[${v.length} itens]` : v), 2));
  else if (modo === 'propagar') console.log(JSON.stringify(propagar(), null, 2));
  else { console.error('uso: node scripts/a33-snapshot-v2.cjs antes|propagar'); process.exit(2); }
}
