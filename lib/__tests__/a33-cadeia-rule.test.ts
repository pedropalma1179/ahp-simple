/**
 * lib/__tests__/a33-cadeia-rule.test.ts
 *
 * MEDIÇÃO da cadeia de fallback de `rule`, em
 * `app/api/ai-reviewer/knowledge.ts`, linha 101:
 *
 *     rule: claim.evidence.quote || claim.verbatim_quote || claim.claim
 *
 * ⚠ **Rodada de medição. NENHUM caminho de produção é alterado.**
 *
 * ⚠ **Nenhuma geração de parecer, real ou simulada.** O cliente do modelo é um
 * duplo que CAPTURA a chamada e INTERROMPE, lançando um sentinela, antes de
 * devolver qualquer conteúdo. ⚠ **A captura demonstra MONTAGEM, e não recepção
 * pelo modelo nem influência sobre uma resposta.**
 *
 * ⚠ **Três situações distintas, que este arquivo não confunde:**
 *
 * | Situação | O que demonstra |
 * |---|---|
 * | possibilidade no código | que a expressão admite o caminho |
 * | fallback efetivamente utilizado | que registros concretos o acionam |
 * | presença na entrada capturada | que o conteúdo aparece na chamada montada |
 *
 * ⚠ **Contar campos faltantes caracteriza a base, e não demonstra a seleção pelo
 * código real nem a presença no contexto.**
 *
 * ⚠ **Nenhum juízo de fidelidade** sobre `verbatim_quote` é registrado: a origem
 * e a fidelidade dele exigem conferência, que NÃO é desta rodada.
 */

export {};

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const ARTEFATO = path.join(RAIZ, 'docs', 'dados', 'a33-cadeia-rule', 'medicao.json');
const GRAVAR = process.env.A33_GRAVAR === '1';

/** ⚠ Metadado histórico: o commit em que a medição original foi feita. */
const COMMIT_DA_MEDICAO_ORIGINAL = 'ebfc9dd3e3f8c988e68fcd1876f8ea3a26b9c27d';

const sha256 = (b: Buffer | string) =>
  crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : b).digest('hex');
const shaArquivo = (rel: string) => sha256(fs.readFileSync(path.join(RAIZ, rel)));

/**
 * Resumo da BASE DE ARTIGOS, para identificar o conjunto medido **sem depender de
 * variável de ambiente nem do histórico do git**.
 *
 * **Regra declarada:** os arquivos `.ts` de `lib/rag/articles/`, em ordem
 * lexicográfica, cada um como `nome` mais byte `0x1E` mais bytes do arquivo mais
 * `0x1E`, concatenados e resumidos em SHA-256.
 */
function shaDaBaseDeArtigos() {
  const dir = path.join(RAIZ, 'lib', 'rag', 'articles');
  const nomes = fs.readdirSync(dir).filter((n: string) => n.endsWith('.ts')).sort();
  const h = crypto.createHash('sha256');
  for (const n of nomes) {
    h.update(Buffer.from(n, 'utf8'));
    h.update(Buffer.from([0x1e]));
    h.update(fs.readFileSync(path.join(dir, n)));
    h.update(Buffer.from([0x1e]));
  }
  return { arquivos: nomes.length, sha256: h.digest('hex'), regra: 'nomes .ts em ordem lexicografica, nome + 0x1E + bytes + 0x1E, concatenados' };
}

// ============================================================
// 3.0 IDENTIFICAÇÃO
// ============================================================

/** Arquivos de código cujo comportamento esta medição depende (RE3). */
const CODIGO = [
  'app/api/ai-reviewer/knowledge.ts',
  'app/api/ai-reviewer/route.ts',
];

/** Artefatos de dados que entram na medição (RE3). */
const DADOS = [
  'docs/dados/a33-etapa4-v2/casos.json',
  'docs/dados/a33-etapa4-v2/requisicao-referencia-r2.json',
  'docs/dados/a33-etapa4-v2/C1-recuperacao.json',
  'docs/calculations-13jul2026.json',
];

// ============================================================
// OS CINCO ESTADOS, MUTUAMENTE EXCLUSIVOS
// ============================================================

/**
 * ⚠ **A classificação NÃO modifica o valor utilizado.** O código real recebe o
 * valor como está; isto apenas o rotula.
 *
 * ⚠ **"com conteúdo" é definido por pelo menos um caractere que não seja espaço
 * em branco.** ⚠ **Valor fora dos cinco é ANOMALIA, sem conversão.**
 */
function classificar(presente: boolean, v: unknown): string {
  if (!presente) return 'ausente';
  if (v === null) return 'null';
  if (typeof v === 'string') {
    if (v === '') return 'string vazia';
    if (v.trim() === '') return 'so espacos';
    return 'com conteudo';
  }
  return 'ANOMALIA:' + (v === undefined ? 'undefined' : typeof v);
}

const ESTADOS_PREVISTOS = ['ausente', 'null', 'string vazia', 'so espacos', 'com conteudo'];

/** Precedência de `a || b || c`, a partir dos VALORES DE ENTRADA. */
function preverPrecedencia(eq: unknown, vq: unknown, cl: unknown) {
  if (eq) return { fornecedor: 'evidence.quote', valor: eq };
  if (vq) return { fornecedor: 'verbatim_quote', valor: vq };
  if (cl) return { fornecedor: 'claim', valor: cl };
  // ⚠ Todos falsy: `||` devolve o ÚLTIMO operando, como está.
  return { fornecedor: null as string | null, valor: cl };
}

// ============================================================
// O CENSO REAL
// ============================================================

type Unidade = {
  id: string;
  articleId: string;
  indice: number;
  endereco: string;
  estados: { evidenceObj: string; 'evidence.quote': string; verbatim_quote: string; claim: string };
  entrada: { eq: unknown; vq: unknown; cl: unknown };
  previsto: { fornecedor: string | null; valor: unknown };
  /** ⚠ Resultado de uma CÓPIA LOCAL da expressão. É PREVISÃO, nunca saída real. */
  previsaoLocal: { rule: unknown; tipo: string };
  /** ⚠ Preenchido em `confrontar()`, a partir do documento que o MÓDULO devolve. */
  saidaReal: { rule: unknown; tipo: string } | null;
  fornecedorConfirmado: string | null;
  confronto: string;
  textoCompartilhadoComOutroCampo: boolean;
};

function censo() {
  const { getAllArticles } = require('@/lib/rag/index');
  const artigos = getAllArticles();

  const unidades: Unidade[] = [];
  const anomalias: Array<{ id: string; campo: string; tipo: string; endereco: string }> = [];
  // ⚠ Exceções da CÓPIA LOCAL da expressão. NÃO são exceções do código real.
  const excecoesDaCopiaLocal: Array<{ id: string; erro: string }> = [];
  const objEvidenceAusente: string[] = [];

  for (const a of artigos) {
    a.key_claims.forEach((c: any, i: number) => {
      const id = `${a.id}_c${i}`;
      const endereco = `lib/rag/articles/${a.id}.ts :: key_claims[${i}]`;

      // ⚠ Ausência do objeto `evidence` é DISTINTA de ausência de `evidence.quote`.
      const temChaveEv = Object.prototype.hasOwnProperty.call(c, 'evidence');
      const ev = temChaveEv ? c.evidence : undefined;
      const evEhObjeto = ev !== null && ev !== undefined && typeof ev === 'object';
      const estadoObj = !temChaveEv
        ? 'ausente'
        : ev === null
          ? 'null'
          : evEhObjeto
            ? 'objeto'
            : 'ANOMALIA:' + (ev === undefined ? 'undefined' : typeof ev);
      if (estadoObj !== 'objeto') objEvidenceAusente.push(`${id} (${estadoObj})`);

      const temEq = evEhObjeto && Object.prototype.hasOwnProperty.call(ev, 'quote');
      const eq = temEq ? ev.quote : undefined;
      const temVq = Object.prototype.hasOwnProperty.call(c, 'verbatim_quote');
      const vq = temVq ? c.verbatim_quote : undefined;
      const temCl = Object.prototype.hasOwnProperty.call(c, 'claim');
      const cl = temCl ? c.claim : undefined;

      const estados = {
        evidenceObj: estadoObj,
        'evidence.quote': evEhObjeto ? classificar(temEq, eq) : 'ausente',
        verbatim_quote: classificar(temVq, vq),
        claim: classificar(temCl, cl),
      };
      for (const [campo, e] of Object.entries(estados)) {
        if (e.startsWith('ANOMALIA')) anomalias.push({ id, campo, tipo: e, endereco });
      }

      // ⚠ CÓPIA LOCAL da expressão, e portanto PREVISÃO. A execução real
      //   acontece na montagem de KNOWLEDGE_BASE, e a sua saída é lida em
      //   `confrontar()`. ⚠ Exceção daqui NÃO é exceção do código real.
      let localRule: unknown;
      let localTipo = '';
      try {
        localRule = c.evidence.quote || c.verbatim_quote || c.claim;
        localTipo = localRule === undefined ? 'undefined' : localRule === null ? 'null' : typeof localRule;
      } catch (e: any) {
        excecoesDaCopiaLocal.push({ id, erro: String(e && e.message) });
        localTipo = 'EXCECAO';
      }

      const previsto = preverPrecedencia(eq, vq, cl);
      const outros = previsto.fornecedor === 'evidence.quote' ? [vq, cl]
        : previsto.fornecedor === 'verbatim_quote' ? [cl] : [];
      unidades.push({
        id, articleId: a.id, indice: i, endereco, estados,
        entrada: { eq, vq, cl },
        previsto,
        previsaoLocal: { rule: localRule, tipo: localTipo },
        saidaReal: null,
        fornecedorConfirmado: null,
        confronto: '',
        textoCompartilhadoComOutroCampo: outros.some((o) => o === previsto.valor),
      });
    });
  }
  return { artigos, unidades, anomalias, excecoesDaCopiaLocal, objEvidenceAusente };
}

/**
 * Confronta a previsão por precedência com a SAÍDA DO CÓDIGO REAL.
 *
 * ⚠ **A saída real vem de `claimToRef`**, exercitado na montagem de
 * `KNOWLEDGE_BASE`, e é lida por `getRefsByContext('')`, cujo predicado
 * `context.includes('')` é verdadeiro para toda unidade. ⚠ **Nenhuma cópia local
 * da expressão é usada como evidência da execução real**: o campo `real.rule`
 * acima é registro de leitura, e o veredito abaixo usa `doc.rule`.
 *
 * ⚠ **A origem NÃO é deduzida por igualdade textual**: o vínculo unidade a
 * documento é o `id`, `${article.id}_c${index}`, emitido pelo próprio código.
 */
/**
 * ⚠ **Constrói o índice por ID DEPOIS de verificar a unicidade.** Um `Map`
 * construído de pares silenciosamente mantém o último de um id repetido, e a
 * duplicata ficaria invisível. Aqui ela INTERROMPE.
 */
function indexarPorId(docs: any[]) {
  const vistos = new Map<string, number>();
  const semId: number[] = [];
  const duplicados: string[] = [];
  docs.forEach((d, i) => {
    if (typeof d?.id !== 'string' || d.id === '') { semId.push(i); return; }
    const n = (vistos.get(d.id) || 0) + 1;
    vistos.set(d.id, n);
    if (n === 2) duplicados.push(d.id);
  });
  if (semId.length) throw new Error('ID ausente nas posicoes ' + semId.join(','));
  if (duplicados.length) throw new Error('ID duplicado: ' + duplicados.join(','));
  return new Map<string, any>(docs.map((d: any) => [d.id, d]));
}

/** O tipo do valor, determinado do PRÓPRIO valor recebido. */
const tipoDe = (v: unknown) => (v === undefined ? 'undefined' : v === null ? 'null' : typeof v);

/**
 * Confronta a previsão por precedência com a SAÍDA DO CÓDIGO REAL, e GRAVA essa
 * saída na unidade.
 *
 * ⚠ **`saidaReal` vem do documento que o MÓDULO devolve**, casado por ID, e
 * `saidaReal.tipo` sai desse mesmo valor. ⚠ **Nada da cópia local entra aqui.**
 *
 * ⚠ **ID sem correspondência INTERROMPE**, sem escolher documento nem gravar
 * saída presumida.
 */
function confrontar(unidades: Unidade[]) {
  const k = require('@/app/api/ai-reviewer/knowledge');
  const docs = k.getRefsByContext('');
  const porId = indexarPorId(docs);
  const ambiguas: string[] = [];

  for (const u of unidades) {
    const d = porId.get(u.id);
    if (!d) throw new Error('unidade sem correspondencia no modulo real: ' + u.id);
    u.saidaReal = { rule: d.rule, tipo: tipoDe(d.rule) };
    if (d.rule === u.previsto.valor) {
      u.fornecedorConfirmado = u.previsto.fornecedor;
      u.confronto = u.textoCompartilhadoComOutroCampo
        ? 'coincide; fornecedor determinado por PRECEDENCIA, texto indistinguivel de campo posterior'
        : 'coincide';
    } else {
      u.confronto = 'DIVERGE da previsao por precedencia';
      ambiguas.push(u.id);
    }
  }
  // ⚠ Chegar aqui já demonstra que toda unidade foi alcançada: o contrário lança.
  return { docs, porId, ambiguas, naoAlcancadas: [] as string[] };
}

// ============================================================
// A MONTAGEM: CAPTURA E INTERRUPÇÃO
// ============================================================

const CHAVES_FALSAS: Record<string, string> = {
  VOYAGE_API_KEY: 'chave-voyage-falsa-do-processo-de-teste',
  UPSTASH_VECTOR_REST_URL: 'https://indice-simulado.exemplo',
  UPSTASH_VECTOR_REST_TOKEN: 'token-upstash-falso-do-processo-de-teste',
  ANTHROPIC_API_KEY: 'chave-anthropic-falsa-do-processo-de-teste',
};
const NOMES_ENV = [...Object.keys(CHAVES_FALSAS), 'USE_RAG_SEMANTIC'];
const SENTINELA = 'INTERROMPIDO-ANTES-DE-PRODUZIR-CONTEUDO';

const SECOES = [
  { chave: 'consistencia', titulo: '## Referências sobre Consistência e Validação de Dados', comContexto: true },
  { chave: 'bocr', titulo: '## Referências sobre Metodologia BOCR', comContexto: true },
  { chave: 'sensibilidade', titulo: '## Referências sobre Análise de Sensibilidade e Robustez', comContexto: true },
  { chave: 'criticas', titulo: '## Referências Críticas Adicionais (Alta Prioridade)', comContexto: false },
];

/**
 * Executa o handler REAL com os três clientes externos duplos.
 *
 * ⚠ **O duplo do modelo captura e LANÇA**, sem devolver conteúdo. Nenhum parecer
 * é produzido, real ou simulado.
 */
async function capturar(flag: string | null, porConsulta: Array<any[]> | null, requisicao: any) {
  jest.resetModules();
  const anterior: Record<string, string | undefined> = {};
  for (const n of NOMES_ENV) anterior[n] = process.env[n];
  for (const [n, v] of Object.entries(CHAVES_FALSAS)) process.env[n] = v;
  if (flag === null) delete process.env.USE_RAG_SEMANTIC;
  else process.env.USE_RAG_SEMANTIC = flag;

  let i = 0;
  const consultas: unknown[] = [];
  const capturado: { system: string; messages: string } = { system: '', messages: '' };
  let houveChamadaAoModelo = false;
  let interrompidoAntesDeConteudo = false;

  jest.doMock('voyageai', () => ({
    VoyageAIClient: class {
      async embed() { return { data: [{ embedding: new Array(1024).fill(0.1) }] }; }
    },
  }));
  jest.doMock('@upstash/vector', () => ({
    Index: class {
      async query(q: unknown) {
        consultas.push(q);
        const r = porConsulta ? (porConsulta[i] ?? []) : [];
        i += 1;
        return r;
      }
    },
  }));
  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: class {
      messages = {
        create: async (a: { system: string; messages: Array<{ content: string }> }) => {
          houveChamadaAoModelo = true;
          capturado.system = a.system ?? '';
          capturado.messages = (a.messages ?? []).map((m) => m.content).join('\n');
          // ⚠ Interrompe ANTES de produzir conteúdo. A marca é posta AQUI, e não
          //   num inicializador, para que a asserção não seja tautológica.
          interrompidoAntesDeConteudo = true;
          throw new Error(SENTINELA);
        },
      };
    },
  }));

  const silencios = ['log', 'warn', 'error'].map((m) =>
    jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { POST } = require('@/app/api/ai-reviewer/route');
    await POST({ json: async () => JSON.parse(JSON.stringify(requisicao)) } as any);
  } catch (e: any) {
    if (!String(e && e.message).includes(SENTINELA)) throw e;
  } finally {
    silencios.forEach((s) => s.mockRestore());
    for (const n of NOMES_ENV) {
      if (anterior[n] === undefined) delete process.env[n];
      else process.env[n] = anterior[n]!;
    }
  }
  return { ...capturado, houveChamadaAoModelo, interrompidoAntesDeConteudo, consultas: consultas.length };
}

/** Recorta o texto de cada seção de referências dentro do contexto capturado. */
function recortarSecoes(texto: string) {
  const out: Record<string, string> = {};
  for (let s = 0; s < SECOES.length; s++) {
    const ini = texto.indexOf(SECOES[s].titulo);
    if (ini === -1) { out[SECOES[s].chave] = ''; continue; }
    const prox = s + 1 < SECOES.length ? texto.indexOf(SECOES[s + 1].titulo, ini) : texto.indexOf('\n## ', ini + 1);
    out[SECOES[s].chave] = texto.slice(ini, prox === -1 ? texto.length : prox);
  }
  return out;
}

/** O bloco exato que o template emite para uma referência, por seção. */
function blocoEsperado(d: any, comContexto: boolean) {
  return comContexto
    ? `\n**${d.citation}** - *${d.topic}*\nContexto: ${d.context}\nFundamento: ${d.rule}\n`
    : `\n**${d.citation}** - *${d.topic}*\nFundamento: ${d.rule}\n`;
}

// ============================================================
// CONTROLES SINTÉTICOS: entrada e esperado FIXADOS ANTES
// ============================================================

/**
 * ⚠ **Verificam o INSTRUMENTO, e NÃO entram nas contagens da base** nem alteram
 * os casos preparados. Cada caso traz `esperado` escrito ANTES da execução, e a
 * execução usa o `claimToRef` REAL, alcançado por substituição de
 * `getAllArticles`.
 */
const CONTROLES: Array<{ nome: string; claim: any; esperadoRule: unknown; esperadoFornecedor: string | null; esperadoExcecao?: boolean }> = [
  { nome: 'fornecedor evidence.quote', claim: { claim: 'C', verbatim_quote: 'V', evidence: { quote: 'E' } }, esperadoRule: 'E', esperadoFornecedor: 'evidence.quote' },
  { nome: 'fornecedor verbatim_quote, eq vazio', claim: { claim: 'C', verbatim_quote: 'V', evidence: { quote: '' } }, esperadoRule: 'V', esperadoFornecedor: 'verbatim_quote' },
  { nome: 'fornecedor claim, eq e vq vazios', claim: { claim: 'C', verbatim_quote: '', evidence: { quote: '' } }, esperadoRule: 'C', esperadoFornecedor: 'claim' },
  { nome: 'so espacos em eq E SELECIONADO', claim: { claim: 'C', verbatim_quote: 'V', evidence: { quote: '   ' } }, esperadoRule: '   ', esperadoFornecedor: 'evidence.quote' },
  { nome: 'sem conteudo utilizavel devolve claim vazio', claim: { claim: '', verbatim_quote: '', evidence: { quote: '' } }, esperadoRule: '', esperadoFornecedor: null },
  { nome: 'campos com textos IGUAIS, precedencia decide', claim: { claim: 'T', verbatim_quote: 'T', evidence: { quote: 'T' } }, esperadoRule: 'T', esperadoFornecedor: 'evidence.quote' },
  { nome: 'eq null cai para vq', claim: { claim: 'C', verbatim_quote: 'V', evidence: { quote: null } }, esperadoRule: 'V', esperadoFornecedor: 'verbatim_quote' },
  { nome: 'chave quote ausente cai para vq', claim: { claim: 'C', verbatim_quote: 'V', evidence: {} }, esperadoRule: 'V', esperadoFornecedor: 'verbatim_quote' },
  { nome: 'tipo inesperado em eq e SELECIONADO', claim: { claim: 'C', verbatim_quote: 'V', evidence: { quote: 42 } }, esperadoRule: 42, esperadoFornecedor: 'evidence.quote' },
  { nome: 'objeto evidence AUSENTE levanta excecao', claim: { claim: 'C', verbatim_quote: 'V' }, esperadoRule: undefined, esperadoFornecedor: null, esperadoExcecao: true },
  { nome: 'evidence undefined levanta excecao', claim: { claim: 'C', verbatim_quote: 'V', evidence: undefined }, esperadoRule: undefined, esperadoFornecedor: null, esperadoExcecao: true },
];

/** Duas unidades DISTINTAS com o mesmo texto, para o item de texto compartilhado. */
const CONTROLE_TEXTO_COMPARTILHADO = [
  { claim: 'X', verbatim_quote: 'vq1', evidence: { quote: 'MESMO TEXTO' } },
  { claim: 'Y', verbatim_quote: 'vq2', evidence: { quote: 'MESMO TEXTO' } },
];

/** Roda o `claimToRef` REAL sobre key_claims sintéticos. */
function rodarSinteticos(keyClaims: any[]) {
  jest.resetModules();
  const artigo = {
    id: 'controle_sintetico',
    type: 'paper',
    citation: { abnt: 'CONTROLE, Sintetico.' },
    metadata: { year: 2026, domain: 'CONTROLE' },
    key_claims: keyClaims,
  };
  jest.doMock('@/lib/rag/index', () => ({
    getAllArticles: () => [artigo],
    getAllClaims: () => [],
    getRAGStats: () => ({ total_articles: 1 }),
    getThresholdsByMetric: () => [],
    getAllFormulas: () => [],
    getAllBenchmarks: () => [],
    getFormulasByKeyword: () => [],
    getArticleIds: () => ['controle_sintetico'],
  }));
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const k = require('@/app/api/ai-reviewer/knowledge');
  return k.getRefsByContext('');
}

// ============================================================
// OS CONJUNTOS: DISTINGUÍVEIS, A.16 E O RECALCULADO
// ============================================================

const EVIDENCIAS = 'docs/dados/a33-etapa4-v2/evidencias.json';

/**
 * A lista de A.16 **localizada**, por unidade.
 *
 * ⚠ **Não se impõe a ela nenhum total antes de contá-la.** O que se declara é o
 * artefato, o critério registrado nele e o `baseSha` em que foi medida.
 *
 * ⚠ **A comparação usa `articleId` e índice**, e só entram unidades de
 * `key_claims`, que é o universo das 138.
 */
function listaA16() {
  const j = JSON.parse(fs.readFileSync(path.join(RAIZ, EVIDENCIAS), 'utf8'));
  const todas = j.porTrecho || [];
  const comCampo = todas.filter((t: any) => t.comparacaoDosCampos);
  const divergentes = comCampo.filter((t: any) => t.comparacaoDosCampos.iguais === false);
  const criterios = Array.from(new Set(comCampo.map((t: any) => t.comparacaoDosCampos.criterio)));
  const chaves = divergentes
    .filter((t: any) => t.enderecoNaBase && t.enderecoNaBase.campo === 'key_claims')
    .map((t: any) => `${t.articleId}#${t.enderecoNaBase.indiceBaseZero}`);
  const chavesCobertas = comCampo
    .filter((t: any) => t.enderecoNaBase && t.enderecoNaBase.campo === 'key_claims')
    .map((t: any) => `${t.articleId}#${t.enderecoNaBase.indiceBaseZero}`);
  return {
    artefato: EVIDENCIAS,
    chavesCobertas,
    baseSha: j.baseSha,
    criterioRegistrado: criterios,
    unidadesComComparacao: comCampo.length,
    divergentesNoArtefato: divergentes.length,
    divergentesEmKeyClaims: chaves.length,
    chaves,
  };
}

/** Chave de comparação, comum aos três conjuntos. */
const chaveDe = (articleId: string, indice: number) => `${articleId}#${indice}`;

function compararConjuntos(a: string[], b: string[]) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).sort();
  return {
    tamanhoA: A.size,
    tamanhoB: B.size,
    intersecao: inter,
    somenteA: [...A].filter((x) => !B.has(x)).sort(),
    somenteB: [...B].filter((x) => !A.has(x)).sort(),
    identicos: A.size === B.size && inter.length === A.size,
  };
}

// ============================================================
// PRESERVAÇÃO DO ARTEFATO DE `7405839`
// ============================================================

/**
 * ⚠ **Referência VERIFICÁVEL nos arquivos versionados**, para que a regressão
 * NÃO dependa de `7405839` existir no checkout, que é raso no CI.
 *
 * **Regra de serialização canônica, declarada:** `JSON.stringify(valor)`,
 * compacto, sem indentação e sem quebra final, em UTF-8. É a mesma regra já
 * usada e conferida para a requisição de referência.
 */
const ORIGINAL_7405839 = {
  sha256Canonico: 'a6c3b03f24ebd544aaf35c69a21cd7f41b7c871adfc843a0e2ffcc0f7fa21a8d',
  bytesCanonicos: 87057,
  regra: 'JSON.stringify(valor), compacto, UTF-8',
};

/**
 * ⚠ **TUDO o que esta rodada acrescentou ou renomeou, enumerado com antes e
 * depois.** ⚠ **A retirada de `entrada` e `saidaReal` sozinha NÃO reproduz o
 * JSON de `7405839`**, e o registro diz por quê, em vez de esconder: a rodada
 * também corrigiu um rótulo FALSO, `excecoesDoCodigoReal`, cujas exceções vinham
 * da cópia local da expressão, e acrescentou as duas chaves de topo que o
 * complemento exigia. **Nada fica fora desta lista**: a reconstrução desfaz
 * exatamente estes itens, e o resumo criptográfico do resultado é a prova.
 */
const CORRECOES_DE_PROCEDENCIA = [
  {
    caminho: 'conjuntos',
    antes: 'inexistente',
    depois: 'chave nova de topo, com os tres conjuntos e as comparacoes',
  },
  {
    caminho: 'preservacaoDoArtefatoAnterior',
    antes: 'inexistente',
    depois: 'chave nova de topo, com a referencia canonica e esta propria enumeracao',
  },
  {
    caminho: 'estados.excecoesDoCodigoReal',
    antes: 'chave presente, com as excecoes da COPIA LOCAL sob rotulo de codigo real',
    depois: 'renomeada para estados.excecoesDaCopiaLocalDaExpressao',
  },
  {
    caminho: 'estados.excecaoDoCodigoReal',
    antes: 'inexistente',
    depois: 'chave nova, dizendo NENHUMA e como se sabe',
  },
  {
    caminho: 'contagens.excecao.nota',
    antes: 'inexistente',
    depois: 'nota separando excecao do codigo real da excecao da copia local',
  },
  {
    caminho: 'camadas[].entrada e camadas[].saidaReal',
    antes: 'inexistentes',
    depois: 'os tres valores de entrada e a saida do modulo real, casada por ID',
  },
];

/**
 * Desfaz, sobre a medição atual, **exclusivamente** o que esta rodada acrescentou
 * ou renomeou, reconstruindo as chaves **na ordem original**.
 *
 * ⚠ **Reconstrói por ordem explícita**, e não por `delete`, para que a
 * serialização canônica não dependa de ordem de remoção.
 */
function reconstruir7405839(M: any) {
  const e = M.estados;
  const estados: any = {
    definicao: e.definicao,
    evidenceObj: e.evidenceObj,
    'evidence.quote': e['evidence.quote'],
    verbatim_quote: e.verbatim_quote,
    claim: e.claim,
    anomalias: e.anomalias,
    excecoesDoCodigoReal: e.excecoesDaCopiaLocalDaExpressao,
    objEvidenceAusenteOuNaoObjeto: e.objEvidenceAusenteOuNaoObjeto,
    soEspacosRegistradosAParte: e.soEspacosRegistradosAParte,
  };
  const ex = M.contagens.excecao;
  const contagens = {
    ...M.contagens,
    excecao: { valor: ex.valor, denominador: ex.denominador, exclusivaCom: ex.exclusivaCom },
  };
  const camadas = M.camadas.map((c: any) => ({
    id: c.id,
    endereco: c.endereco,
    ocorrenciaNaBase: c.ocorrenciaNaBase,
    selecao: c.selecao,
    presencaNoContexto: c.presencaNoContexto,
  }));
  // ⚠ As chaves de topo que ESTA rodada criou saem, e estao na enumeração.
  const NOVAS_DE_TOPO = ['conjuntos', 'preservacaoDoArtefatoAnterior'];
  const out: any = {};
  for (const k of Object.keys(M)) {
    if (NOVAS_DE_TOPO.includes(k)) continue;
    out[k] = k === 'estados' ? estados : k === 'contagens' ? contagens : k === 'camadas' ? camadas : M[k];
  }
  return out;
}

// ============================================================
// EXECUÇÃO
// ============================================================

let M: any;

beforeAll(async () => {
  const base = censo();
  const { docs, ambiguas, naoAlcancadas } = confrontar(base.unidades);

  const r2 = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/dados/a33-etapa4-v2/requisicao-referencia-r2.json'), 'utf8'));
  const c1 = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs/dados/a33-etapa4-v2/C1-recuperacao.json'), 'utf8'));
  const requisicao = r2.requisicao;
  const serializada = JSON.stringify(requisicao);

  const k = require('@/app/api/ai-reviewer/knowledge');
  const porSecao: Record<string, any[]> = {
    consistencia: k.getRefsByTopic('consistência'),
    bocr: k.getRefsByTopic('BOCR'),
    sensibilidade: k.getRefsByTopic('sensibilidade'),
    criticas: k.getCriticalRefs().slice(0, 8),
  };

  const idsPorSecao: Record<string, string[]> = {};
  for (const s of SECOES) idsPorSecao[s.chave] = porSecao[s.chave].map((d: any) => d.id);

  const C1_CHUNKS = c1.porConsulta.map((p: any) => p.retornoChunks);
  const casos: Record<string, any> = {};
  let controleNegativo: any = null;
  for (const [nome, flag, chunks] of [
    ['C1', 'true', C1_CHUNKS],
    ['C2', null, null],
    ['C3', 'true', [[], [], [], [], []]],
  ] as Array<[string, string | null, any]>) {
    const cap = await capturar(flag, chunks, requisicao);
    const alvo = cap.system.includes(SECOES[0].titulo) ? 'system' : 'messages';
    const texto = alvo === 'system' ? cap.system : cap.messages;
    const recortes = recortarSecoes(texto);
    const presenca: Record<string, any> = {};
    for (const s of SECOES) {
      const esperados = porSecao[s.chave];
      const dentro: string[] = [];
      const fora: string[] = [];
      for (const d of esperados) {
        (recortes[s.chave].includes(blocoEsperado(d, s.comContexto)) ? dentro : fora).push(d.id);
      }
      presenca[s.chave] = { esperados: esperados.length, presentes: dentro.length, ausentes: fora };
    }
    casos[nome] = {
      flag, chamouModelo: cap.houveChamadaAoModelo, interrompidoAntesDeConteudo: cap.interrompidoAntesDeConteudo,
      consultasAoIndice: cap.consultas, superficie: alvo,
      bytesSystem: Buffer.byteLength(cap.system, 'utf8'), bytesMessages: Buffer.byteLength(cap.messages, 'utf8'),
      presencaPorSecao: presenca,
      ocorrenciasDeFundamento: (texto.match(/^Fundamento: /gm) || []).length,
    };
    if (nome === 'C1') {
      // ⚠ Controle negativo: o MESMO predicado, sobre um bloco adulterado e
      //   sobre um bloco posto na seção errada, tem de REPROVAR.
      const d = porSecao.sensibilidade[0];
      const forcado = porSecao.sensibilidade.find((x: any) => !idsPorSecao.bocr.includes(x.id));
      controleNegativo = {
        unidadeUsada: d.id,
        blocoIntactoPresente: recortes.sensibilidade.includes(blocoEsperado(d, true)),
        blocoComRuleAdulteradoPresente: recortes.sensibilidade.includes(
          blocoEsperado({ ...d, rule: d.rule + ' ADULTERADO' }, true)),
        blocoDeUnidadeForaDaSecaoPresente: forcado ? recortes.bocr.includes(blocoEsperado(forcado, true)) : null,
      };
    }
  }

  // união das unidades presentes em cada caso, por seção
  const unicos = new Set<string>(Object.values(idsPorSecao).flat());

  /**
   * ⚠ **As TRÊS CAMADAS, por unidade, separadas.**
   *
   * ⚠ **Unidade com seleção efetiva que não aparece nos contextos capturados
   * registra SELEÇÃO EFETIVA e EXPOSIÇÃO NÃO OBSERVADA em C1, C2 e C3.** Uma
   * execução observada NÃO se rebaixa a mera possibilidade.
   */
  const camadas = base.unidades.map((u) => {
    const secoes = SECOES.filter((s) => idsPorSecao[s.chave].includes(u.id)).map((s) => s.chave);
    const mesmoEmTodosOsCasos = ['C1', 'C2', 'C3'].every(
      (n) => casos[n].presencaPorSecao && secoes.every((c) => casos[n].presencaPorSecao[c].ausentes.indexOf(u.id) === -1));
    return {
      id: u.id,
      endereco: u.endereco,
      ocorrenciaNaBase: u.estados,
      // ⚠ Os três valores COMO O CÓDIGO REAL OS RECEBEU, sem normalização.
      entrada: {
        evidenceQuote: u.entrada.eq,
        verbatimQuote: u.entrada.vq,
        claim: u.entrada.cl,
      },
      // ⚠ O que o MÓDULO devolveu, casado por ID. NÃO é a cópia local.
      saidaReal: { rule: u.saidaReal!.rule, tipo: u.saidaReal!.tipo },
      selecao: { fornecedor: u.fornecedorConfirmado, confronto: u.confronto, textoIndistinguivelDeCampoPosterior: u.textoCompartilhadoComOutroCampo },
      presencaNoContexto: secoes.length
        ? { estado: 'presente', secoes, casos: ['C1', 'C2', 'C3'], confirmadoNosTres: mesmoEmTodosOsCasos }
        : { estado: 'SELECAO EFETIVA e EXPOSICAO NAO OBSERVADA em C1, C2 e C3', secoes: [], casos: [], confirmadoNosTres: false },
    };
  });
  const expostas = camadas.filter((c) => c.presencaNoContexto.secoes.length > 0);
  const naoExpostas = camadas.filter((c) => c.presencaNoContexto.secoes.length === 0);

  // controles sintéticos
  const controles = CONTROLES.map((c) => {
    let obtido: any; let excecao: string | null = null;
    try {
      const refs = rodarSinteticos([c.claim]);
      obtido = refs.length ? refs[0].rule : undefined;
    } catch (e: any) { excecao = String(e && e.message); }
    const okExcecao = Boolean(c.esperadoExcecao) === (excecao !== null);
    const okRule = c.esperadoExcecao ? true : Object.is(obtido, c.esperadoRule);
    return { nome: c.nome, esperadoRule: c.esperadoRule, esperadoFornecedor: c.esperadoFornecedor, esperadoExcecao: Boolean(c.esperadoExcecao), obtido, excecao, passou: okExcecao && okRule };
  });
  const compartilhado = rodarSinteticos(CONTROLE_TEXTO_COMPARTILHADO);

  const contEstado = (campo: string) => {
    const c: Record<string, number> = {};
    for (const u of base.unidades) { const e = (u.estados as any)[campo]; c[e] = (c[e] || 0) + 1; }
    return c;
  };
  const contFornecedor: Record<string, number> = {};
  for (const u of base.unidades) {
    const f = u.fornecedorConfirmado === null ? '(nenhum)' : u.fornecedorConfirmado;
    contFornecedor[f] = (contFornecedor[f] || 0) + 1;
  }

  M = {
    rodada: 'A.33 medicao da cadeia de fallback de rule',
    natureza: 'MEDICAO. Nenhum caminho de producao alterado. Nenhuma geracao de parecer, real ou simulada.',
    identificacao: {
      // ⚠ METADADO HISTÓRICO: o commit da medição ORIGINAL. O SHA, o ambiente e
      //   os comandos da execução complementar vão no REGISTRO NARRATIVO, e não
      //   substituem isto.
      commitMedido: COMMIT_DA_MEDICAO_ORIGINAL,
      codigo: Object.fromEntries(CODIGO.map((f) => [f, shaArquivo(f)])),
      dados: Object.fromEntries(DADOS.map((f) => [f, shaArquivo(f)])),
      serializacaoDeclarada: {
        regra: 'JSON.stringify(requisicao), compacto, UTF-8',
        sha256: sha256(serializada),
        bytes: Buffer.byteLength(serializada, 'utf8'),
        declaradoNoArtefato: r2.requisicaoSerializada.sha256,
        coincide: sha256(serializada) === r2.requisicaoSerializada.sha256,
      },
      versoes: { preparacao: 'v2', requisicao: 'r2' },
      comando: 'npx jest --runInBand lib/__tests__/a33-cadeia-rule.test.ts',
      ambiente: { plataforma: process.platform, arch: process.arch, node: process.version },
    },
    inventario: {
      artigos: base.artigos.length,
      unidades: base.unidades.length,
      fonte: 'getAllArticles() de @/lib/rag/index, e article.key_claims',
      alcancadasPeloCodigoReal: base.unidades.length - naoAlcancadas.length,
      execucaoNaoAlcancada: naoAlcancadas,
    },
    estados: {
      definicao: 'com conteudo = ao menos um caractere que nao seja espaco em branco',
      evidenceObj: contEstado('evidenceObj'),
      'evidence.quote': contEstado('evidence.quote'),
      verbatim_quote: contEstado('verbatim_quote'),
      claim: contEstado('claim'),
      anomalias: base.anomalias,
      // ⚠ Exceções da CÓPIA LOCAL da expressão, NUNCA apresentadas como do código real.
      excecoesDaCopiaLocalDaExpressao: base.excecoesDaCopiaLocal,
      excecaoDoCodigoReal: {
        observado: 'NENHUMA',
        comoSeSabe: 'claimToRef roda na montagem de KNOWLEDGE_BASE, na importacao do modulo; uma excecao ali impediria o import, e o modulo importou e devolveu as 138',
      },
      objEvidenceAusenteOuNaoObjeto: base.objEvidenceAusente,
      soEspacosRegistradosAParte: base.unidades.filter((u) => Object.values(u.estados).includes('so espacos')).map((u) => u.id),
    },
    selecao: {
      metodo: 'precedencia sobre os valores de entrada, confrontada com doc.rule do codigo real; vinculo por id emitido pelo proprio codigo',
      porFornecedor: contFornecedor,
      divergentes: ambiguas,
      textoIndistinguivelDeCampoPosterior: base.unidades.filter((u) => u.textoCompartilhadoComOutroCampo).map((u) => u.id),
      fallbackEfetivamenteUtilizado: base.unidades.filter((u) => u.fornecedorConfirmado !== null && u.fornecedorConfirmado !== 'evidence.quote').map((u) => ({ id: u.id, fornecedor: u.fornecedorConfirmado })),
      semConteudoUtilizavel: base.unidades.filter((u) => u.fornecedorConfirmado === null).map((u) => ({ id: u.id, valorDevolvido: u.saidaReal!.rule, tipo: u.saidaReal!.tipo })),
    },
    fatiasCriticas: {
      criterio: 'unidades em que rule vem de claim, ou de string so com espacos',
      deClaim: base.unidades.filter((u) => u.fornecedorConfirmado === 'claim').map((u) => u.id),
      deSoEspacos: base.unidades.filter((u) => u.fornecedorConfirmado && (u.estados as any)[u.fornecedorConfirmado] === 'so espacos').map((u) => u.id),
    },
    montagem: {
      rotuloNoTemplate: 'Fundamento: ${ref.rule}',
      sitiosNoTemplate: 4,
      secoes: SECOES.map((s) => ({ chave: s.chave, titulo: s.titulo, trazContexto: s.comContexto })),
      unidadesPorSecao: Object.fromEntries(Object.entries(idsPorSecao).map(([k2, v]) => [k2, v.length])),
      unidadesDistintasNasQuatroSecoes: unicos.size,
      controleNegativo,
      ocorrenciasSomadas: Object.values(idsPorSecao).reduce((a, v) => a + v.length, 0),
      casos,
    },
    camadas,
    /**
     * ⚠ **Cada contagem com o SEU denominador.** ⚠ **Só se reconciliam com o
     * total categorias mutuamente exclusivas sobre o mesmo denominador.**
     * ⚠ **Unidades distintas e ocorrências são informadas SEPARADAMENTE**, e as
     * seções se sobrepõem.
     */
    contagens: {
      artigos: { valor: base.artigos.length, denominador: base.artigos.length, nota: 'conjunto efetivamente lido' },
      unidades: { valor: base.unidades.length, denominador: base.unidades.length, nota: 'key_claims dos 36 artigos' },
      selecaoConcluida: { valor: base.unidades.filter((u) => u.confronto.startsWith('coincide')).length, denominador: base.unidades.length, exclusivaCom: ['excecao', 'execucaoNaoAlcancada'] },
      excecao: { valor: 0, denominador: base.unidades.length, exclusivaCom: ['selecaoConcluida', 'execucaoNaoAlcancada'], nota: 'excecao DO CODIGO REAL; a da copia local esta em estados.excecoesDaCopiaLocalDaExpressao e conta ' + base.excecoesDaCopiaLocal.length },
      execucaoNaoAlcancada: { valor: naoAlcancadas.length, denominador: base.unidades.length, exclusivaCom: ['selecaoConcluida', 'excecao'] },
      porFornecedor: { valores: contFornecedor, denominador: base.unidades.length, nota: 'mutuamente exclusivas; fecham no total' },
      comConteudoUtilizavel: { valor: base.unidades.filter((u) => u.fornecedorConfirmado !== null).length, denominador: base.unidades.length },
      semConteudoUtilizavel: { valor: base.unidades.filter((u) => u.fornecedorConfirmado === null).length, denominador: base.unidades.length },
      associacoesAmbiguas: { valor: ambiguas.length, denominador: base.unidades.length, nota: 'divergencia entre a previsao por precedencia e a saida do codigo real' },
      textoIndistinguivelDeCampoPosterior: { valor: base.unidades.filter((u) => u.textoCompartilhadoComOutroCampo).length, denominador: base.unidades.length, nota: 'NAO e ambiguidade de resultado: a precedencia decide; e o motivo de nao deduzir origem por igualdade textual' },
      unidadesDistintasExpostas: { valor: expostas.length, denominador: base.unidades.length, exclusivaCom: ['unidadesDistintasNaoExpostas'] },
      unidadesDistintasNaoExpostas: { valor: naoExpostas.length, denominador: base.unidades.length, exclusivaCom: ['unidadesDistintasExpostas'], ids: naoExpostas.map((c) => c.id) },
      ocorrenciasNoContexto: { valor: Object.values(idsPorSecao).reduce((a, v) => a + v.length, 0), denominador: 'nao ha; ocorrencias NAO se somam a unidades distintas', porSecao: Object.fromEntries(Object.entries(idsPorSecao).map(([k2, v]) => [k2, v.length])) },
      porCaso: Object.fromEntries(['C1', 'C2', 'C3'].map((n) => [n, { ocorrencias: casos[n].ocorrenciasDeFundamento, denominador: 'ocorrencias de Fundamento: no contexto capturado' }])),
    },
    /**
     * ⚠ **Três conjuntos, com CRITÉRIO e SHA declarados cada um**, e que NÃO se
     * reconciliam aqui.
     */
    conjuntos: (() => {
      const a16 = listaA16();
      const baseArtigos = shaDaBaseDeArtigos();
      const distinguiveis = base.unidades
        .filter((u) => !u.textoCompartilhadoComOutroCampo)
        .map((u) => chaveDe(u.articleId, u.indice));
      // Terceiro conjunto: o critério de A.16 RECALCULADO na base atual.
      const recalculado = base.unidades
        .filter((u) => String(u.entrada.eq ?? '').trim() !== String(u.entrada.vq ?? '').trim())
        .map((u) => chaveDe(u.articleId, u.indice));
      return {
        distinguiveis: {
          criterio: 'evidence.quote diferente de verbatim_quote E diferente de claim, por igualdade estrita, SEM trim, que e a comparacao usada no instrumento',
          sha: baseArtigos,
          base: 'lib/rag/articles, no checkout desta execucao',
          total: distinguiveis.length,
          chaves: distinguiveis.slice().sort(),
        },
        a16Localizada: {
          estado: 'LOCALIZADA',
          artefato: a16.artefato,
          criterio: a16.criterioRegistrado,
          sha: a16.baseSha,
          unidadesComComparacaoNoArtefato: a16.unidadesComComparacao,
          divergentesNoArtefato: a16.divergentesNoArtefato,
          divergentesEmKeyClaims: a16.divergentesEmKeyClaims,
          chaves: a16.chaves.slice().sort(),
        },
        conjuntoDe26: {
          estado: 'NAO DETERMINADO: lista nao localizada',
          ondeOTotalAparece: 'docs/imprecisoes-parecer-ia.md, no texto narrativo, como "26 entre 138"',
          oQueFoiProcurado: 'arrays de exatamente 26 itens em docs/dados/**/*.json, e ocorrencias de 26 ligadas a divergencia; nenhuma lista POR UNIDADE encontrada',
          consequencia: 'os resultados da comparacao com esse conjunto ficam NAO DETERMINADOS, e NAO sao zero nem identidade',
          naoSeImpoeTotal: 'o total de 26 NAO foi imposto a lista localizada, que tem o seu proprio total',
        },
        recalculadoPeloCriterioDeA16: {
          estado: 'TERCEIRO CONJUNTO, recalculado nesta base; NAO e a lista de A.16',
          criterio: 'verbatim_quote diferente de evidence.quote apos trim, que e o criterio registrado em evidencias.json, aplicado a base ATUAL',
          sha: baseArtigos,
          total: recalculado.length,
          chaves: recalculado.slice().sort(),
        },
        /**
         * ⚠ **A origem da diferença, MEDIDA e não raciocinada.** As duas fontes
         * que o enunciado nomeia, critério e base, **não explicam nada aqui**, e
         * a que explica é uma terceira: o **escopo do artefato**.
         */
        origemDasDiferencas: {
          porCriterio: {
            efeito: 'NENHUM',
            comoSeMediu: 'o terceiro conjunto aplica o criterio de A.16, com trim, a base atual, e sai IDENTICO ao dos distinguiveis; logo o criterio nao separa nenhuma unidade nesta base',
          },
          porBase: {
            efeito: 'NENHUM',
            comoSeMediu: 'os dois conjuntos foram recalculados em arvore auxiliar no commit 3db365c, que e o pai de 8b057d9, ANTES das duas correcoes de A.16; sairam 26 e 26, com as MESMAS chaves do conjunto atual',
            commitsConferidos: ['8b057d9db2c70e701a757f5ad83336903c3b8000', 'b567d99bec6881faa381651353120e1faaf7366a'],
            unidadesQueEssesCommitsTocaram: ['saaty1977_scaling#0', 'wijnmalen2007_bocr#0', 'wijnmalen2007_bocr#3'],
            porQueNaoMudouPertenca: 'em saaty1977_scaling#0 e wijnmalen2007_bocr#0 os dois campos foram alterados JUNTOS e seguiram iguais entre si, e em wijnmalen2007_bocr#3 o evidence.quote mudou mas continuou diferente do verbatim_quote; medido, e nao deduzido',
            provenienciaDestaMedicao: 'arvore auxiliar desta execucao complementar, removida ao fim; o registro narrativo traz o comando',
          },
          porEscopoDoArtefato: {
            efeito: 'EXPLICA AS SETE',
            comoSeMediu: 'evidencias.json traz 101 unidades de key_claims entre as 165 de porTrecho, e as 138 da base viva nao estao todas ali; as sete de somenteA estao AUSENTES de porTrecho',
            keyClaimsNaBaseViva: 138,
            keyClaimsCobertasPeloArtefato: a16.unidadesComComparacao,
            keyClaimsForaDoArtefato: 138 - a16.unidadesComComparacao,
          },
          conclusao: 'A diferenca de sete e inteiramente de ESCOPO. Dentro do escopo comum as 101 unidades cobertas, os dois conjuntos coincidem. ⚠ Nenhuma diferenca ficou sem origem determinada, e nenhuma foi atribuida as correcoes de A.16.',
        },
        comparacoes: {
          distinguiveisVsA16Localizada: compararConjuntos(distinguiveis, a16.chaves),
          distinguiveisNoEscopoComumVsA16Localizada: compararConjuntos(
            distinguiveis.filter((c) => a16.chavesCobertas.includes(c)), a16.chaves),
          distinguiveisVsRecalculado: compararConjuntos(distinguiveis, recalculado),
          a16LocalizadaVsRecalculado: compararConjuntos(a16.chaves, recalculado),
          distinguiveisVsConjuntoDe26: 'NAO DETERMINADO: lista nao localizada',
        },
      };
    })(),
    textoDeRuleCompartilhadoEntreUnidades: (() => {
      const m = new Map<string, string[]>();
      for (const d of docs) { if (!m.has(d.rule)) m.set(d.rule, []); m.get(d.rule)!.push(d.id); }
      return [...m.values()].filter((v) => v.length > 1);
    })(),
    tripeDuplicado: (() => {
      const m = new Map<string, string[]>();
      for (const d of docs) { const kk = d.citation + '\u001e' + d.topic + '\u001e' + d.rule; if (!m.has(kk)) m.set(kk, []); m.get(kk)!.push(d.id); }
      return [...m.values()].filter((v) => v.length > 1);
    })(),
    controlesSinteticos: {
      alcance: 'verificam o INSTRUMENTO; NAO entram nas contagens da base',
      casos: controles,
      textoCompartilhadoEntreUnidadesDistintas: {
        esperado: 'duas unidades distintas, mesmo rule, ids distintos',
        ids: compartilhado.map((d: any) => d.id),
        rules: compartilhado.map((d: any) => d.rule),
        passou: compartilhado.length === 2 && compartilhado[0].rule === compartilhado[1].rule && compartilhado[0].id !== compartilhado[1].id,
      },
    },
    preservacaoDoArtefatoAnterior: {
      referencia: ORIGINAL_7405839,
      correcoesDeProcedencia: CORRECOES_DE_PROCEDENCIA,
      comoSeVerifica: 'reconstruir7405839 desfaz exclusivamente o que esta rodada acrescentou ou renomeou, e o sha256 da serializacao canonica do resultado tem de bater com a referencia; NAO depende de 7405839 existir no checkout',
    },
    oQueIstoNaoDemonstra: [
      'NAO demonstra recepcao pelo modelo: a captura e da chamada montada',
      'NAO demonstra influencia sobre uma resposta: nenhum parecer foi produzido',
      'NAO julga fidelidade de verbatim_quote, que exige conferencia bibliografica',
      'NAO reconcilia com a particao historica de treze divergencias, que e registro datado',
    ],
  };

  if (GRAVAR) fs.writeFileSync(ARTEFATO, JSON.stringify(M, null, 2) + '\n');
});

// ------------------------------------------------------------ 3.0 identificação
test('3.0: identificacao registrada, com sha dos artefatos e serializacao declarada', () => {
  for (const f of CODIGO) expect(M.identificacao.codigo[f]).toMatch(/^[0-9a-f]{64}$/);
  for (const f of DADOS) expect(M.identificacao.dados[f]).toMatch(/^[0-9a-f]{64}$/);
  expect(M.identificacao.serializacaoDeclarada.coincide).toBe(true);
  expect(M.identificacao.serializacaoDeclarada.bytes).toBe(3279);
  expect(M.identificacao.ambiente.node).toBe(process.version);
});

// ------------------------------------------------------------ item 2
test('item 2: inventario do conjunto efetivamente lido, com identificacao por unidade', () => {
  expect(M.inventario.artigos).toBe(36);
  expect(M.inventario.unidades).toBe(138);
  expect(M.inventario.alcancadasPeloCodigoReal).toBe(138);
  expect(M.inventario.execucaoNaoAlcancada).toEqual([]);
});

// ------------------------------------------------------------ item 3
test('item 3: os cinco estados sao mutuamente exclusivos e cobrem as 138', () => {
  for (const campo of ['evidence.quote', 'verbatim_quote', 'claim']) {
    const c = M.estados[campo];
    for (const e of Object.keys(c)) expect(ESTADOS_PREVISTOS).toContain(e);
    expect(Object.values(c).reduce((a: any, b: any) => a + b, 0)).toBe(138);
  }
});

test('item 3: nenhuma anomalia, nenhuma excecao, e o objeto evidence existe nas 138', () => {
  expect(M.estados.anomalias).toEqual([]);
  expect(M.estados.excecoesDaCopiaLocalDaExpressao).toEqual([]);
  expect(M.estados.excecaoDoCodigoReal.observado).toBe('NENHUMA');
  expect(M.estados.objEvidenceAusenteOuNaoObjeto).toEqual([]);
  expect(M.estados.evidenceObj).toEqual({ objeto: 138 });
});

test('item 3: a lista de so espacos concorda com a contagem dos estados', () => {
  // ⚠ Asserção de CONSISTÊNCIA, e não de valor: vale também se um dia houver algum.
  const declarados: string[] = M.estados.soEspacosRegistradosAParte;
  const porContagem = M.camadas
    .filter((c: any) => Object.values(c.ocorrenciaNaBase).includes('so espacos'))
    .map((c: any) => c.id);
  expect(declarados.slice().sort()).toEqual(porContagem.slice().sort());
  // A fatia crítica de só espaços é subconjunto do que a lista declara.
  for (const id of M.fatiasCriticas.deSoEspacos) expect(declarados).toContain(id);
});

// ------------------------------------------------------------ item 4
test('item 4: a selecao foi executada pelo codigo real, sem divergencia da precedencia', () => {
  expect(M.selecao.divergentes).toEqual([]);
  expect(M.selecao.metodo).toMatch(/vinculo por id emitido pelo proprio codigo/);
  const total = Object.values(M.selecao.porFornecedor).reduce((a: any, b: any) => a + b, 0);
  expect(total).toBe(138);
});

test('item 4: ausencia de conteudo consta pelo valor realmente devolvido', () => {
  for (const u of M.selecao.semConteudoUtilizavel) {
    expect(u).toHaveProperty('valorDevolvido');
    expect(u).toHaveProperty('tipo');
  }
});

// ------------------------------------------------------------ item 5
test('item 5: nenhum juizo de fidelidade sobre verbatim_quote', () => {
  const s = JSON.stringify(M.selecao) + JSON.stringify(M.estados) + JSON.stringify(M.fatiasCriticas);
  expect(s).not.toMatch(/infiel|fidedigno|adulterad|fabricad/i);
  expect(JSON.stringify(M.oQueIstoNaoDemonstra)).toMatch(/NAO julga fidelidade de verbatim_quote/);
});

// ------------------------------------------------------------ itens 6 e 7
test('itens 6 e 7: os tres casos chamaram o modelo e foram INTERROMPIDOS antes de conteudo', () => {
  for (const nome of ['C1', 'C2', 'C3']) {
    expect(M.montagem.casos[nome].chamouModelo).toBe(true);
    // ⚠ A marca é posta dentro do duplo, imediatamente antes do lançamento.
    expect(M.montagem.casos[nome].interrompidoAntesDeConteudo).toBe(true);
  }
  // ⚠ Nenhum texto de parecer existe no artefato: nada foi produzido.
  expect(JSON.stringify(M)).not.toMatch(/DECIS[AÃ]O EDITORIAL|PARECER DE ENSAIO/);
});

test('itens 6 e 7: presenca vinculada a UNIDADE e a SECAO, nas quatro secoes e nos tres casos', () => {
  for (const nome of ['C1', 'C2', 'C3']) {
    const p = M.montagem.casos[nome].presencaPorSecao;
    for (const s of SECOES) {
      expect(p[s.chave].ausentes).toEqual([]);
      expect(p[s.chave].presentes).toBe(p[s.chave].esperados);
    }
  }
});

test('itens 6 e 7: o tripe que vincula ao contexto nao tem duplicata', () => {
  expect(M.tripeDuplicado).toEqual([]);
});

/**
 * ⚠ **Controle NEGATIVO da checagem de presença.** Sem ele, "presente em todas"
 * poderia ser verdade por a checagem casar com qualquer coisa. Mede-se que o
 * mesmo predicado REPROVA um bloco adulterado e um bloco posto na seção errada.
 */
test('itens 6 e 7: a checagem de presenca discrimina, e nao casa com qualquer bloco', () => {
  const alvo = M.montagem.controleNegativo;
  expect(alvo.blocoIntactoPresente).toBe(true);
  expect(alvo.blocoComRuleAdulteradoPresente).toBe(false);
  expect(alvo.blocoDeUnidadeForaDaSecaoPresente).toBe(false);
  expect(alvo.unidadeUsada).toMatch(/_c\d+$/);
});

test('itens 6 e 7: ocorrencias e unidades distintas sao reportadas SEPARADAS', () => {
  expect(M.montagem.ocorrenciasSomadas).toBeGreaterThanOrEqual(M.montagem.unidadesDistintasNasQuatroSecoes);
  for (const nome of ['C1', 'C2', 'C3']) {
    expect(M.montagem.casos[nome].ocorrenciasDeFundamento).toBe(M.montagem.ocorrenciasSomadas);
  }
  // ⚠ Ocorrências NÃO se somam a unidades distintas: denominadores diferentes.
  expect(M.contagens.ocorrenciasNoContexto.denominador).toMatch(/NAO se somam a unidades distintas/);
});

test('item 7: as tres camadas estao separadas nas 138 unidades', () => {
  expect(M.camadas.length).toBe(138);
  for (const c of M.camadas) {
    // ⚠ Caminho em ARRAY: a chave literal contém um ponto, que `toHaveProperty`
    //   interpretaria como separador.
    expect(c.ocorrenciaNaBase).toHaveProperty(['evidence.quote']);
    expect(c.selecao).toHaveProperty('fornecedor');
    expect(c.presencaNoContexto).toHaveProperty('estado');
  }
});

test('item 7: selecao efetiva sem aparicao consta como EXPOSICAO NAO OBSERVADA, nao como possibilidade', () => {
  const naoExpostas = M.camadas.filter((c: any) => c.presencaNoContexto.secoes.length === 0);
  expect(naoExpostas.length).toBe(M.contagens.unidadesDistintasNaoExpostas.valor);
  for (const c of naoExpostas) {
    // A seleção continua EFETIVA: não se rebaixa a possibilidade.
    expect(c.selecao.fornecedor).not.toBeNull();
    expect(c.presencaNoContexto.estado).toMatch(/SELECAO EFETIVA e EXPOSICAO NAO OBSERVADA em C1, C2 e C3/);
  }
});

// ------------------------------------------------------------ item 9, RE6
test('item 9: as contagens exclusivas fecham no total; as sobrepostas NAO sao somadas', () => {
  const c = M.contagens;
  expect(c.selecaoConcluida.valor + c.excecao.valor + c.execucaoNaoAlcancada.valor).toBe(138);
  expect(c.comConteudoUtilizavel.valor + c.semConteudoUtilizavel.valor).toBe(138);
  expect(c.unidadesDistintasExpostas.valor + c.unidadesDistintasNaoExpostas.valor).toBe(138);
  expect(Object.values(c.porFornecedor.valores).reduce((a: any, b: any) => a + b, 0)).toBe(138);
  // ⚠ As quatro seções se SOBREPÕEM: a soma das ocorrências excede as distintas.
  const somaSecoes = Object.values(c.ocorrenciasNoContexto.porSecao).reduce((a: any, b: any) => a + b, 0);
  expect(somaSecoes).toBe(c.ocorrenciasNoContexto.valor);
  expect(somaSecoes).toBeGreaterThan(M.montagem.unidadesDistintasNasQuatroSecoes);
});

// ------------------------------------------------------------ item 8
test('item 8: os controles sinteticos passam, com esperado fixado antes', () => {
  const falhos = M.controlesSinteticos.casos.filter((c: any) => !c.passou);
  expect(falhos).toEqual([]);
  expect(M.controlesSinteticos.casos.length).toBe(CONTROLES.length);
  expect(M.controlesSinteticos.textoCompartilhadoEntreUnidadesDistintas.passou).toBe(true);
});

test('item 8: os controles cobrem os tres fornecedores, so espacos, sem conteudo, iguais, evidence ausente/undefined e tipo inesperado', () => {
  const n = M.controlesSinteticos.casos.map((c: any) => c.nome).join('|');
  expect(n).toMatch(/fornecedor evidence\.quote/);
  expect(n).toMatch(/fornecedor verbatim_quote/);
  expect(n).toMatch(/fornecedor claim/);
  expect(n).toMatch(/so espacos/);
  expect(n).toMatch(/sem conteudo utilizavel/);
  expect(n).toMatch(/textos IGUAIS/);
  expect(n).toMatch(/objeto evidence AUSENTE/);
  expect(n).toMatch(/evidence undefined/);
  expect(n).toMatch(/tipo inesperado/);
});

test('item 8: os sinteticos ficam FORA das contagens da base', () => {
  expect(M.inventario.unidades).toBe(138);
  expect(JSON.stringify(M.selecao)).not.toMatch(/controle_sintetico/);
  expect(JSON.stringify(M.estados)).not.toMatch(/controle_sintetico/);
  expect(JSON.stringify(M.montagem)).not.toMatch(/controle_sintetico/);
});

// ------------------------------------------------------------ RE2: reprodução
test('RE2: o inventario gravado coincide com o medido agora', () => {
  expect(fs.existsSync(ARTEFATO)).toBe(true);
  const gravado = JSON.parse(fs.readFileSync(ARTEFATO, 'utf8'));
  // ⚠ Compara o que NAO depende do ambiente da execução.
  for (const chave of ['inventario', 'estados', 'selecao', 'fatiasCriticas', 'tripeDuplicado', 'textoDeRuleCompartilhadoEntreUnidades', 'camadas', 'contagens']) {
    expect(gravado[chave]).toEqual(M[chave]);
  }
  expect(gravado.identificacao.codigo).toEqual(M.identificacao.codigo);
  expect(gravado.identificacao.dados).toEqual(M.identificacao.dados);
  expect(gravado.identificacao.serializacaoDeclarada).toEqual(M.identificacao.serializacaoDeclarada);
});

test('RE2: a montagem gravada coincide, exceto o que e do ambiente', () => {
  const gravado = JSON.parse(fs.readFileSync(ARTEFATO, 'utf8'));
  expect(gravado.montagem.unidadesPorSecao).toEqual(M.montagem.unidadesPorSecao);
  expect(gravado.montagem.ocorrenciasSomadas).toBe(M.montagem.ocorrenciasSomadas);
  for (const nome of ['C1', 'C2', 'C3']) {
    expect(gravado.montagem.casos[nome].presencaPorSecao).toEqual(M.montagem.casos[nome].presencaPorSecao);
    expect(gravado.montagem.casos[nome].ocorrenciasDeFundamento).toBe(M.montagem.casos[nome].ocorrenciasDeFundamento);
  }
});

// ------------------------------------------------------------ alcance
test('o registro nao apresenta a captura como recepcao pelo modelo', () => {
  const s = JSON.stringify(M.oQueIstoNaoDemonstra);
  expect(s).toMatch(/NAO demonstra recepcao pelo modelo/);
  expect(s).toMatch(/NAO demonstra influencia sobre uma resposta/);
  expect(M.natureza).toMatch(/Nenhuma geracao de parecer, real ou simulada/);
});

// ============================================================
// COMPLEMENTO: REGISTRO POR UNIDADE E PROCEDÊNCIA
// ============================================================

test('complemento: cada unidade traz entrada com os tres valores e saidaReal', () => {
  expect(M.camadas.length).toBe(138);
  for (const c of M.camadas) {
    expect(Object.keys(c.entrada)).toEqual(['evidenceQuote', 'verbatimQuote', 'claim']);
    expect(Object.keys(c.saidaReal)).toEqual(['rule', 'tipo']);
    // ⚠ O tipo sai do PRÓPRIO valor de saída.
    const v = c.saidaReal.rule;
    expect(c.saidaReal.tipo).toBe(v === undefined ? 'undefined' : v === null ? 'null' : typeof v);
  }
});

/**
 * ⚠ **Isto confere CONSISTÊNCIA, e não procedência.** Nesta base os dois valores
 * coincidem nas 138, então trocar a fonte não mudaria o resultado. **Quem
 * discrimina a procedência é o teste do sentinela, logo abaixo.**
 */
test('complemento: saidaReal e consistente com o modulo, unidade por unidade', () => {
  // ⚠ Os controles sintéticos substituem `@/lib/rag/index` por `doMock`. Sem
  //   desfazer isso, este teste leria o módulo SINTÉTICO e não o real.
  jest.resetModules();
  jest.dontMock('@/lib/rag/index');
  // Lê de novo o módulo real e casa por ID: os valores têm de ser os mesmos.
  const k = require('@/app/api/ai-reviewer/knowledge');
  const porId = new Map<string, any>(k.getRefsByContext('').map((d: any) => [d.id, d]));
  expect(porId.size).toBe(138);
  for (const c of M.camadas) {
    expect(porId.has(c.id)).toBe(true);
    expect(c.saidaReal.rule).toBe(porId.get(c.id).rule);
  }
});

/**
 * ⚠ **Controle que DISCRIMINA a procedência.** A previsão local recebe um valor
 * sentinela que o módulo nunca produziria. Se `confrontar` lesse a cópia local,
 * `saidaReal` sairia com o sentinela, e o teste reprova.
 */
test('complemento: confrontar toma o valor do MODULO, e nao o da previsao local', () => {
  jest.resetModules();
  jest.dontMock('@/lib/rag/index');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const k = require('@/app/api/ai-reviewer/knowledge');
  const doc = k.getRefsByContext('')[0];
  const SENTINELA_LOCAL = 'SENTINELA-DA-COPIA-LOCAL-QUE-O-MODULO-NAO-PRODUZ';
  const u: any = {
    id: doc.id,
    previsto: { fornecedor: 'evidence.quote', valor: doc.rule },
    previsaoLocal: { rule: SENTINELA_LOCAL, tipo: 'string' },
    saidaReal: null,
    confronto: '',
    textoCompartilhadoComOutroCampo: false,
  };
  confrontar([u]);
  expect(u.saidaReal.rule).toBe(doc.rule);
  expect(u.saidaReal.rule).not.toBe(SENTINELA_LOCAL);
  expect(u.saidaReal.tipo).toBe(typeof doc.rule);
  // Controle POSITIVO: o confronto usa a previsão por precedência, que aqui coincide.
  expect(u.confronto).toMatch(/^coincide/);
});

test('complemento: nenhuma excecao da copia local e apresentada como do codigo real', () => {
  expect(M.estados).not.toHaveProperty('excecoesDoCodigoReal');
  expect(M.estados.excecoesDaCopiaLocalDaExpressao).toEqual([]);
  expect(M.estados.excecaoDoCodigoReal.observado).toBe('NENHUMA');
  expect(M.estados.excecaoDoCodigoReal.comoSeSabe).toMatch(/impediria o import/);
});

/**
 * ⚠ **Controles NEGATIVOS da associação por ID.** Sem eles, "todas casaram"
 * poderia ser verdade por o indexador aceitar qualquer coisa.
 */
test('complemento: associacao AUSENTE interrompe, sem escolher documento', () => {
  const unidade: any = { id: 'inexistente_c0', previsto: { fornecedor: 'x', valor: 'y' }, saidaReal: null, confronto: '', textoCompartilhadoComOutroCampo: false };
  expect(() => confrontar([unidade])).toThrow(/sem correspondencia no modulo real: inexistente_c0/);
  // ⚠ Nada presumido foi gravado.
  expect(unidade.saidaReal).toBeNull();
  expect(unidade.fornecedorConfirmado).toBeUndefined();
});

test('complemento: associacao DUPLICADA interrompe antes de qualquer casamento', () => {
  const d = { id: 'dup_c0', rule: 'A' };
  expect(() => indexarPorId([d, { id: 'dup_c0', rule: 'B' }])).toThrow(/ID duplicado: dup_c0/);
  expect(() => indexarPorId([d, { rule: 'sem id' } as any])).toThrow(/ID ausente nas posicoes 1/);
  // Controle POSITIVO, para o indexador não reprovar tudo.
  expect(indexarPorId([d, { id: 'outro_c0', rule: 'B' }]).size).toBe(2);
});

// ------------------------------------------------------------ preservação
test('complemento: removidos SO entrada e saidaReal, e desfeitas as correcoes de procedencia, o JSON reproduz 7405839', () => {
  const reconstruido = reconstruir7405839(M);
  const canonico = JSON.stringify(reconstruido);
  expect(Buffer.byteLength(canonico, 'utf8')).toBe(ORIGINAL_7405839.bytesCanonicos);
  expect(sha256(canonico)).toBe(ORIGINAL_7405839.sha256Canonico);
});

test('complemento: TUDO o que a rodada acrescentou esta ENUMERADO, com antes e depois', () => {
  expect(M.preservacaoDoArtefatoAnterior.correcoesDeProcedencia.length).toBe(6);
  for (const c of M.preservacaoDoArtefatoAnterior.correcoesDeProcedencia) {
    expect(c.caminho).toBeTruthy();
    expect(c.antes).toBeTruthy();
    expect(c.depois).toBeTruthy();
  }
  expect(M.preservacaoDoArtefatoAnterior.referencia.regra).toMatch(/JSON\.stringify\(valor\), compacto, UTF-8/);
});

test('complemento: os metadados historicos do artefato foram preservados', () => {
  const gravado = JSON.parse(fs.readFileSync(ARTEFATO, 'utf8'));
  expect(gravado.identificacao.serializacaoDeclarada.sha256).toBe(M.identificacao.serializacaoDeclarada.sha256);
  expect(gravado.identificacao.versoes).toEqual({ preparacao: 'v2', requisicao: 'r2' });
  expect(gravado.identificacao.codigo).toEqual(M.identificacao.codigo);
});

// ------------------------------------------------------------ regressão por unidade
test('complemento: o artefato gravado coincide com a medicao atual UNIDADE POR UNIDADE', () => {
  const gravado = JSON.parse(fs.readFileSync(ARTEFATO, 'utf8'));
  expect(gravado.camadas.length).toBe(M.camadas.length);
  for (let i = 0; i < M.camadas.length; i++) {
    expect(gravado.camadas[i].id).toBe(M.camadas[i].id);
    expect(gravado.camadas[i].entrada).toEqual(M.camadas[i].entrada);
    expect(gravado.camadas[i].saidaReal).toEqual(M.camadas[i].saidaReal);
    expect(gravado.camadas[i].ocorrenciaNaBase).toEqual(M.camadas[i].ocorrenciaNaBase);
    expect(gravado.camadas[i].selecao).toEqual(M.camadas[i].selecao);
  }
  expect(gravado.conjuntos).toEqual(M.conjuntos);
});

// ------------------------------------------------------------ conjuntos
test('conjuntos: distinguiveis e A.16 tem criterio e SHA declarados', () => {
  const c = M.conjuntos;
  expect(c.distinguiveis.criterio).toMatch(/SEM trim/);
  expect(c.a16Localizada.estado).toBe('LOCALIZADA');
  expect(c.a16Localizada.artefato).toBe('docs/dados/a33-etapa4-v2/evidencias.json');
  expect(c.a16Localizada.sha).toMatch(/^[0-9a-f]{40}$/);
  expect(c.distinguiveis.sha.sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(c.distinguiveis.sha.arquivos).toBeGreaterThan(0);
  expect(c.a16Localizada.criterio.join(' ')).toMatch(/trim/i);
});

test('conjuntos: o conjunto de 26 fica NAO DETERMINADO, nunca zero nem identidade', () => {
  const c = M.conjuntos;
  expect(c.conjuntoDe26.estado).toMatch(/^NAO DETERMINADO: lista nao localizada/);
  expect(c.comparacoes.distinguiveisVsConjuntoDe26).toBe('NAO DETERMINADO: lista nao localizada');
  // ⚠ O total de 26 não foi imposto à lista localizada.
  expect(c.a16Localizada).not.toHaveProperty('total');
  expect(c.conjuntoDe26).not.toHaveProperty('chaves');
});

test('conjuntos: a comparacao reporta intersecao, exclusivos e identidade', () => {
  for (const nome of ['distinguiveisVsA16Localizada', 'distinguiveisVsRecalculado', 'a16LocalizadaVsRecalculado']) {
    const r = M.conjuntos.comparacoes[nome];
    expect(r).toHaveProperty('intersecao');
    expect(r).toHaveProperty('somenteA');
    expect(r).toHaveProperty('somenteB');
    expect(typeof r.identicos).toBe('boolean');
    // Consistência aritmética das partes sobre o mesmo denominador.
    expect(r.intersecao.length + r.somenteA.length).toBe(r.tamanhoA);
    expect(r.intersecao.length + r.somenteB.length).toBe(r.tamanhoB);
  }
});

test('conjuntos: o terceiro conjunto esta identificado como recalculado, e nao como a lista de A.16', () => {
  expect(M.conjuntos.recalculadoPeloCriterioDeA16.estado).toMatch(/NAO e a lista de A\.16/);
  expect(M.conjuntos.recalculadoPeloCriterioDeA16.criterio).toMatch(/base ATUAL/);
});

test('conjuntos: a origem da diferenca esta MEDIDA, e separada por fonte', () => {
  const o = M.conjuntos.origemDasDiferencas;
  expect(o.porCriterio.efeito).toBe('NENHUM');
  expect(o.porBase.efeito).toBe('NENHUM');
  expect(o.porEscopoDoArtefato.efeito).toBe('EXPLICA AS SETE');
  // ⚠ O efeito "nenhum" do critério é RECOMPUTÁVEL aqui, e não uma afirmação solta.
  expect(M.conjuntos.comparacoes.distinguiveisVsRecalculado.identicos).toBe(true);
  // ⚠ O escopo também: sai dos arquivos versionados.
  expect(o.porEscopoDoArtefato.keyClaimsNaBaseViva).toBe(138);
  expect(o.porEscopoDoArtefato.keyClaimsCobertasPeloArtefato).toBe(M.conjuntos.a16Localizada.unidadesComComparacaoNoArtefato);
  expect(o.porEscopoDoArtefato.keyClaimsForaDoArtefato).toBe(138 - M.conjuntos.a16Localizada.unidadesComComparacaoNoArtefato);
  // ⚠ Nenhuma diferença foi atribuída às correções de A.16.
  expect(o.conclusao).toMatch(/nenhuma foi atribuida as correcoes de A\.16/);
});

test('conjuntos: dentro do escopo comum os dois conjuntos COINCIDEM', () => {
  const r = M.conjuntos.comparacoes.distinguiveisNoEscopoComumVsA16Localizada;
  expect(r.identicos).toBe(true);
  expect(r.somenteA).toEqual([]);
  expect(r.somenteB).toEqual([]);
  // E as sete de fora são exatamente as que o escopo comum descarta.
  const fora = M.conjuntos.comparacoes.distinguiveisVsA16Localizada.somenteA;
  expect(fora.length).toBe(M.conjuntos.distinguiveis.total - r.tamanhoA);
});
