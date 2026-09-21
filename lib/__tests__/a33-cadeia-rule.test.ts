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

const sha256 = (b: Buffer | string) =>
  crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : b).digest('hex');
const shaArquivo = (rel: string) => sha256(fs.readFileSync(path.join(RAIZ, rel)));

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
  real: { rule: unknown; tipo: string };
  fornecedorConfirmado: string | null;
  confronto: string;
  textoCompartilhadoComOutroCampo: boolean;
};

function censo() {
  const { getAllArticles } = require('@/lib/rag/index');
  const artigos = getAllArticles();

  const unidades: Unidade[] = [];
  const anomalias: Array<{ id: string; campo: string; tipo: string; endereco: string }> = [];
  const excecoes: Array<{ id: string; erro: string }> = [];
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

      // ⚠ A EXECUÇÃO real acontece na montagem de KNOWLEDGE_BASE. Aqui só se
      //   registra se a leitura dos operandos, do jeito que o código a faz,
      //   levanta exceção; sem simular que houve fallback.
      let real: unknown;
      let tipo = '';
      try {
        real = c.evidence.quote || c.verbatim_quote || c.claim;
        tipo = real === undefined ? 'undefined' : real === null ? 'null' : typeof real;
      } catch (e: any) {
        excecoes.push({ id, erro: String(e && e.message) });
        tipo = 'EXCECAO';
      }

      const previsto = preverPrecedencia(eq, vq, cl);
      const outros = previsto.fornecedor === 'evidence.quote' ? [vq, cl]
        : previsto.fornecedor === 'verbatim_quote' ? [cl] : [];
      unidades.push({
        id, articleId: a.id, indice: i, endereco, estados,
        entrada: { eq, vq, cl },
        previsto,
        real: { rule: real, tipo },
        fornecedorConfirmado: null,
        confronto: '',
        textoCompartilhadoComOutroCampo: outros.some((o) => o === previsto.valor),
      });
    });
  }
  return { artigos, unidades, anomalias, excecoes, objEvidenceAusente };
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
function confrontar(unidades: Unidade[]) {
  const k = require('@/app/api/ai-reviewer/knowledge');
  const docs = k.getRefsByContext('');
  const porId = new Map<string, any>(docs.map((d: any) => [d.id, d]));
  const ambiguas: string[] = [];
  const naoAlcancadas: string[] = [];

  for (const u of unidades) {
    const d = porId.get(u.id);
    if (!d) { naoAlcancadas.push(u.id); u.confronto = 'execucao nao alcancada'; continue; }
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
  return { docs, porId, ambiguas, naoAlcancadas };
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
      commitMedido: process.env.A33_SHA || null,
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
      excecoesDoCodigoReal: base.excecoes,
      objEvidenceAusenteOuNaoObjeto: base.objEvidenceAusente,
      soEspacosRegistradosAParte: base.unidades.filter((u) => Object.values(u.estados).includes('so espacos')).map((u) => u.id),
    },
    selecao: {
      metodo: 'precedencia sobre os valores de entrada, confrontada com doc.rule do codigo real; vinculo por id emitido pelo proprio codigo',
      porFornecedor: contFornecedor,
      divergentes: ambiguas,
      textoIndistinguivelDeCampoPosterior: base.unidades.filter((u) => u.textoCompartilhadoComOutroCampo).map((u) => u.id),
      fallbackEfetivamenteUtilizado: base.unidades.filter((u) => u.fornecedorConfirmado !== null && u.fornecedorConfirmado !== 'evidence.quote').map((u) => ({ id: u.id, fornecedor: u.fornecedorConfirmado })),
      semConteudoUtilizavel: base.unidades.filter((u) => u.fornecedorConfirmado === null).map((u) => ({ id: u.id, valorDevolvido: u.real.rule, tipo: u.real.tipo })),
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
      excecao: { valor: base.excecoes.length, denominador: base.unidades.length, exclusivaCom: ['selecaoConcluida', 'execucaoNaoAlcancada'] },
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
  expect(M.estados.excecoesDoCodigoReal).toEqual([]);
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
