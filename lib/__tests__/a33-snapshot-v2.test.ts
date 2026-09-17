/**
 * A.33: trava a nova versão do snapshot da etapa 4, `docs/dados/a33-etapa4-v2/`.
 *
 * ⚠ **Nenhum teste chama git, rede ou serviço.** A base é a viva, pelo agregador; a
 * v1 e a v2 são arquivos versionados. A lição de `46ac135` vale: o CI clona raso.
 *
 * ⚠ **A montagem usa o handler real com os três clientes externos simulados**, e o
 * cliente do LLM só CAPTURA os argumentos e interrompe: nenhum parecer é produzido,
 * nem de ensaio. O `fetch` global fica bloqueado, e a contagem de chamadas é zero.
 *
 * ⚠ **Propagação correta não é conferência bibliográfica.** O bloco de estados
 * trava que nenhuma unidade mudou de estado sem conclusão nova.
 */
export {};
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const v2 = require('../../scripts/a33-snapshot-v2.cjs');
const { candidate } = require('../../scripts/measure-a33-identity-v2.cjs');
const { textos, chaveEndereco, RAIZES } = require('../../scripts/a33-aplicar-trecho-id.cjs');
import { getAllArticles, getAllBenchmarks } from '@/lib/rag/index';

const sha = (s: string) => crypto.createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const json = (v: unknown) => JSON.stringify(v === undefined ? null : v);
const clone = (v: any) => JSON.parse(JSON.stringify(v));
const ler = (rel: string): string => v2.lerArquivo(rel);
const lerJson = (rel: string): any => JSON.parse(ler(rel));

const V1: string = v2.V1;
const V2: string = v2.V2;
const antes = lerJson(V2 + 'resumos-antes.json');
const manifesto = lerJson(V2 + 'manifesto-transicao.json');
const um: Record<string, any> = Object.fromEntries(v2.ARQUIVOS.map((f: string) => [f, lerJson(V1 + f)]));
const dois: Record<string, any> = Object.fromEntries(v2.ARQUIVOS.map((f: string) => [f, lerJson(V2 + f)]));
const ev1 = um['evidencias.json'], ev2 = dois['evidencias.json'];
const BASE_CORRIGIDA: string = manifesto.baseCorrigida.sha;

const SAATY_ANTES = 'A reciprocal matrix A with positive entries is consistent if and only if \\lambda_{max} = n';
const W_ANTES = 'synthesis requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship';
const WC_ANTES = 'Priorities on different factors must be commensurate before synthesis to guarantee valid BOCR outcomes.';
const RS = String.fromCharCode(0x1e);

/** Base viva, pelo agregador. O nome do arquivo é o `id` do artigo, medido nos 36. */
const artigos = new Map(getAllArticles().map((a) => [`lib/rag/articles/${a.id}.ts`, a]));
function valorVivo(u: any) {
  const e = u.enderecoNaBase;
  const a: any = artigos.get(e.arquivo);
  if (!a || a.id !== u.articleId) throw new Error('artigo ausente: ' + e.arquivo);
  if (e.campo === 'empirical_data') return clone(getAllBenchmarks().find((b) => b.source_article === a.id));
  return clone(a[e.campo][e.indiceBaseZero]);
}
const diferencasDaUnidade = (u: any) => v2.diferencasSeg(u.dadosOriginais, valorVivo(u)).map((segs: any[]) => ({
  indice: ev1.porTrecho.indexOf(u) >= 0 ? ev1.porTrecho.indexOf(u) : ev2.porTrecho.indexOf(u),
  articleId: u.articleId,
  indiceBaseZero: u.enderecoNaBase.indiceBaseZero ?? null,
  campo: v2.rotulo(segs),
  antes: v2.valorEm(u.dadosOriginais, segs),
  depois: v2.valorEm(valorVivo(u), segs),
}));
const chaveMudanca = (m: any) => json([m.articleId, m.indiceBaseZero, m.campo, m.antes, m.depois]);
const aprovadaPorId = new Map(v2.APROVADAS.map((a: any) => [a.id, a]));

describe('A.33 v2: o snapshot anterior está preservado', () => {
  test.each(v2.ARQUIVOS)('%s da v1 coincide com os resumos capturados antes', (f: string) => {
    const { caminho, blobGit, ...resumos } = antes.arquivos[f];
    expect(caminho).toBe(V1 + f);
    expect(blobGit).toMatch(/^[0-9a-f]{40}$/);
    expect(v2.resumosDe(f, ler(V1 + f))).toEqual(resumos);
  });

  test('a nova versão aponta para a anterior e declara a base corrigida', () => {
    expect(manifesto.versao).toBe(2);
    expect(manifesto.snapshotAnterior.caminho).toBe(V1);
    expect(manifesto.snapshotAnterior.baseSha).toBe(v2.BASE_SNAPSHOT);
    expect(manifesto.snapshotAnterior.sha256ResumosDeAntes).toBe(sha(ler(V2 + 'resumos-antes.json')));
    expect(BASE_CORRIGIDA).toBe(antes.headSha);
    expect(manifesto.baseCorrigida.commitsDaCorrecao).toEqual([
      '8b057d9db2c70e701a757f5ad83336903c3b8000',
      'b567d99bec6881faa381651353120e1faaf7366a',
    ]);
  });

  test.each(v2.COPIADOS_SEM_ALTERACAO)('%s segue byte a byte igual ao da v1', (f: string) => {
    expect(ler(V2 + f)).toBe(ler(V1 + f));
  });
});

describe('A.33 v2: unidades afetadas, derivadas da base', () => {
  test('contra a base viva, a v1 difere EXATAMENTE nas seis alterações aprovadas, em três unidades', () => {
    const mudancas = ev1.porTrecho.flatMap(diferencasDaUnidade);
    expect(mudancas.map(chaveMudanca).sort()).toEqual(v2.APROVADAS.map(chaveMudanca).sort());
    const afetadas = [...new Set(mudancas.map((m: any) => m.indice))].sort((a: any, b: any) => a - b);
    expect(afetadas).toEqual([47, 86, 89]);
    expect(manifesto.derivacao.unidadesAfetadas).toEqual(afetadas);
    expect(manifesto.derivacao.controleContraBaseDoSnapshot.diferencas).toBe(0);
    expect(manifesto.aprovadas).toEqual(v2.APROVADAS);
  });

  test('a v2 coincide com a base viva nas 165 unidades, e a projeção de benchmark é a do agregador', () => {
    expect(ev2.porTrecho).toHaveLength(165);
    expect(ev2.porTrecho.flatMap(diferencasDaUnidade)).toEqual([]);
    const bench = ev2.porTrecho.filter((u: any) => u.enderecoNaBase.campo === 'empirical_data');
    expect(bench).toHaveLength(10);
    for (const u of bench) expect(v2.benchmarkDe(artigos.get(u.enderecoNaBase.arquivo))).toEqual(valorVivo(u));
  });
});

describe('A.33 v2: controle estrutural por exceções enumeradas', () => {
  const excecoes: any[] = manifesto.excecoesEnumeradas;
  const alterados = ['evidencias.json', 'contexto-estatico.json', 'C1-recuperacao.json', 'casos.json'];

  test.each(alterados)('%s: toda diferença cai sob exatamente uma exceção, e nenhuma sobra', (f: string) => {
    const folhas = v2.diferencasSeg(um[f], dois[f]).map((s: any[]) => v2.rotulo(s));
    const doArquivo = excecoes.filter((e) => e.arquivo === f);
    expect(new Set(folhas).size).toBe(folhas.length);
    expect([...folhas].sort()).toEqual(doArquivo.map((e) => e.caminho).sort());
    for (const s of v2.diferencasSeg(um[f], dois[f])) {
      const e = doArquivo.find((x) => x.caminho === v2.rotulo(s));
      expect(v2.classificar(f, e.caminho)).toBe(e.categoria);
      expect(sha(json(v2.valorEm(um[f], s)))).toBe(e.sha256Antes);
      expect(sha(json(v2.valorEm(dois[f], s)))).toBe(e.sha256Depois);
      expect(e.existiaAntes).toBe(v2.valorEm(um[f], s) !== undefined);
    }
  });

  test('são 57, e a contagem por categoria é a do desenho', () => {
    const porCategoria = excecoes.reduce((o: any, e: any) => ({ ...o, [e.categoria]: (o[e.categoria] || 0) + 1 }), {});
    expect(excecoes).toHaveLength(57);
    expect(porCategoria).toEqual({
      'substituicao-aprovada': 6,
      'copia-referenceDoc': 7,
      'texto-formatado-recomposto': 2,
      'copia-chunk': 4,
      'copia-chunk-por-id': 8,
      'identidade-recalculada': 10,
      'endereco-administrativo': 10,
      'resumo-derivado': 5,
      'metadado-da-versao': 4,
      'declaracao-administrativa-corrigida': 1,
    });
  });

  test('cada diferença de texto corresponde a uma substituição AUTORIZADA, com valor anterior e posterior', () => {
    const paresAprovados = new Set(v2.APROVADAS.map((a: any) => json([a.antes, a.depois])));
    for (const e of excecoes) {
      const a = e.antes, d = e.depois;
      if (e.categoria === 'substituicao-aprovada') {
        const ap: any = aprovadaPorId.get(e.aprovada);
        expect([a, d]).toEqual([ap.antes, ap.depois]);
        expect(ev1.porTrecho[e.unidade].articleId).toBe(ap.articleId);
        expect(e.caminho).toBe(`porTrecho[${e.unidade}].dadosOriginais.${ap.campo}`);
      }
      if (e.categoria === 'copia-referenceDoc') {
        const campo = e.caminho.endsWith('.topic') ? 'topic' : 'rule';
        const de = campo === 'topic' ? v2.topicDe : v2.ruleDe;
        expect(a).toBe(de(ev1.porTrecho[e.unidade].dadosOriginais));
        expect(d).toBe(de(ev2.porTrecho[e.unidade].dadosOriginais));
        expect(paresAprovados.has(json([a, d]))).toBe(true);
        expect(aprovadaPorId.has(e.aprovada)).toBe(true);
      }
      if (e.categoria === 'texto-formatado-recomposto' || (e.categoria.startsWith('copia-chunk') && e.caminho.endsWith('.text'))) {
        // Estes caminhos só têm identificadores e índices, sem chave com ponto.
        const segs = e.caminho.match(/[^.[\]]+/g).map((x: string) => (/^\d+$/.test(x) ? Number(x) : x));
        expect(v2.rotulo(segs)).toBe(e.caminho);
        const f = e.arquivo;
        const antesTexto = v2.valorEm(um[f], segs), depoisTexto = v2.valorEm(dois[f], segs);
        expect(v2.aplicarSubstituicoes(antesTexto, e.substituicoes)).toBe(depoisTexto);
        for (const p of e.substituicoes) expect(paresAprovados.has(json([p.de, p.para]))).toBe(true);
      }
      if (e.categoria.startsWith('copia-chunk') && e.caminho.endsWith('.verbatim_quote')) {
        const ap: any = aprovadaPorId.get(e.aprovada);
        expect([a, d]).toEqual([ap.antes, ap.depois]);
      }
      if (e.categoria === 'endereco-administrativo') expect([a, d]).toEqual([v2.BASE_SNAPSHOT, BASE_CORRIGIDA]);
      if (e.categoria === 'declaracao-administrativa-corrigida') {
        expect([e.arquivo, e.caminho]).toEqual(['casos.json', 'verificacaoCodigo']);
        expect([a, d]).toEqual([um['casos.json'].verificacaoCodigo, v2.VERIFICACAO_V2]);
      }
      if (e.categoria === 'identidade-recalculada') {
        expect(a).toBe(ev1.porTrecho[e.unidade].trechoId);
        expect(d).toBe(ev2.porTrecho[e.unidade].trechoId);
      }
    }
  });

  test('resumos derivados e metadados da versão são os recalculados', () => {
    const ce2 = dois['contexto-estatico.json'];
    ce2.quatroSecoes.forEach((s: any, si: number) => {
      expect(v2.formatarSecao(si, s.referencias)).toBe(s.textoFormatado);
      expect(sha(s.textoFormatado)).toBe(s.sha256TextoUTF8);
    });
    const casos = dois['casos.json'];
    for (const [f, r] of Object.entries<any>(casos.integridadeDosDados)) expect(r.resumoCompleto).toBe(sha(ler(V2 + f)));
    expect([um['casos.json'].versaoPreparacao, casos.versaoPreparacao]).toEqual([1, 2]);
    expect(casos.pendenciasParaGeracao.slice(0, 3)).toEqual(um['casos.json'].pendenciasParaGeracao);
    expect(casos.pendenciasParaGeracao.slice(3)).toEqual([v2.PENDENCIA_P1, v2.PENDENCIA_CONCLUSOES]);
    expect(v2.PENDENCIA_P1).toContain('delimitar P1');
    expect(v2.PENDENCIA_P1).toContain('inclusive a C1');
  });

  test('os demais textos permanecem IDÊNTICOS, pelo resumo por raiz; as raízes que mudam são as nomeadas', () => {
    const mudaram: string[] = [];
    for (const f of Object.keys(RAIZES)) {
      const depois = RAIZES[f](dois[f]).map(([nome, valor]: [string, unknown]) => {
        const pares = textos(valor, nome, []);
        return { raiz: nome, strings: pares.length, sha256: sha(JSON.stringify(pares)) };
      });
      const anteriores = antes.arquivos[f].porItem;
      expect(depois.map((x: any) => x.raiz)).toEqual(anteriores.map((x: any) => x.raiz));
      depois.forEach((x: any, i: number) => { if (json(x) !== json(anteriores[i])) mudaram.push(`${f} ${x.raiz}`); });
    }
    expect(mudaram.sort()).toEqual([
      'C1-recuperacao.json finalChunksEsperados[0]',
      'C1-recuperacao.json finalChunksEsperados[1]',
      'C1-recuperacao.json porConsulta[0].retornoChunks[0]',
      'C1-recuperacao.json porConsulta[1].retornoChunks[0]',
      'C1-recuperacao.json trechos[0].chunk',
      'C1-recuperacao.json trechos[1].chunk',
      'contexto-estatico.json quatroSecoes[0].referencias[47].referenceDoc',
      'contexto-estatico.json quatroSecoes[0].referencias[86].referenceDoc',
      'contexto-estatico.json quatroSecoes[0].referencias[89].referenceDoc',
      'contexto-estatico.json quatroSecoes[0].sha256TextoUTF8',
      'contexto-estatico.json quatroSecoes[0].textoFormatado',
      'contexto-estatico.json quatroSecoes[1].referencias[23].referenceDoc',
      'contexto-estatico.json quatroSecoes[1].referencias[26].referenceDoc',
      'contexto-estatico.json quatroSecoes[1].sha256TextoUTF8',
      'contexto-estatico.json quatroSecoes[1].textoFormatado',
      'evidencias.json porTrecho[47].dadosOriginais',
      'evidencias.json porTrecho[86].dadosOriginais',
      'evidencias.json porTrecho[89].dadosOriginais',
    ]);
  });
});

describe('A.33 v2: a declaração administrativa e a regra do endereço', () => {
  test('verificacaoCodigo foi corrigido SÓ na v2, com o alcance verificado, e a v1 segue com o texto da rodada dela', () => {
    expect(um['casos.json'].verificacaoCodigo).toBe(
      'Nenhum código de produção ou teste alterado; suíte e build não executados nesta rodada, conforme o aceite de dados/documentação.'
    );
    const texto: string = dois['casos.json'].verificacaoCodigo;
    expect(texto).toBe(v2.VERIFICACAO_V2);
    for (const trecho of ['scripts/a33-snapshot-v2.cjs', 'scripts/a33-payload-referencia.cjs', 'lib/__tests__/a33-snapshot-v2.test.ts',
      'Verificado em c87e337', 'Verificado em 82057ec', 'Build local não executado', 'não cobre alterações posteriores a 82057ec']) {
      expect(texto).toContain(trecho);
    }
    expect(texto).not.toContain('PENDENTE_CI');
    expect(texto).not.toMatch(/nenhum teste|suíte e build não executados/i);
  });

  test('o sha do endereço registra a base de onde o conteúdo foi lido, e varia por unidade', () => {
    const regra = manifesto.regraDoEndereco;
    const afetadas: number[] = manifesto.derivacao.unidadesAfetadas;
    expect(regra.nasCorrigidas).toMatchObject({ sha: v2.BASE_CORRIGIDA, unidades: afetadas });
    expect(regra.nasDemais).toMatchObject({ sha: v2.BASE_SNAPSHOT, unidades: 162 });
    expect(BASE_CORRIGIDA).toBe(v2.BASE_CORRIGIDA);
    const esperado = (i: number) => (afetadas.includes(i) ? v2.BASE_CORRIGIDA : v2.BASE_SNAPSHOT);
    ev2.porTrecho.forEach((u: any, i: number) => expect([i, u.enderecoNaBase.sha]).toEqual([i, esperado(i)]));
    const porChave = new Map<string, number>(ev1.porTrecho.map((u: any, i: number) => [chaveEndereco({ ...u.enderecoNaBase, sha: 'x' }), i]));
    const ce2 = dois['contexto-estatico.json'], c12 = dois['C1-recuperacao.json'];
    const ocorrencias = [
      ...ce2.quatroSecoes.flatMap((s: any) => s.referencias),
      ...ce2.outrasTresSuperficies.flatMap((s: any) => s.enderecos),
      ...c12.trechos,
    ];
    for (const o of ocorrencias) expect(o.enderecoNaBase.sha).toBe(esperado(porChave.get(chaveEndereco({ ...o.enderecoNaBase, sha: 'x' })) as number));
    for (const f of ['evidencias.json', 'contexto-estatico.json', 'C1-recuperacao.json', 'casos.json']) expect(dois[f].baseSha).toBe(v2.BASE_SNAPSHOT);
  });
});

describe('A.33 v2: identidade', () => {
  test('H-T reproduz o trechoId das 165 unidades, e a exceção de benchmark segue nula', () => {
    const nulos = ev2.porTrecho.filter((u: any) => u.trechoId === null);
    expect(nulos.map((u: any) => u.articleId)).toEqual(['saiyed2023_ceoPowerUET']);
    for (const u of ev2.porTrecho.filter((x: any) => x.trechoId !== null)) expect(candidate(u, 'T').chave).toBe(u.trechoId);
  });

  test('recalculado SÓ onde mudou campo da composição; as não afetadas mantêm o seu trechoId', () => {
    const afetadas = manifesto.derivacao.unidadesAfetadas;
    ev2.porTrecho.forEach((u: any, i: number) => {
      if (afetadas.includes(i)) expect(u.trechoId).not.toBe(ev1.porTrecho[i].trechoId);
      else expect(u.trechoId).toBe(ev1.porTrecho[i].trechoId);
    });
    expect(manifesto.identidadePorUnidade.map((x: any) => x.indice)).toEqual(afetadas);
    for (const x of manifesto.identidadePorUnidade) {
      expect(x.decisao).toBe('recalcular');
      expect(x.camposAlterados.length).toBeGreaterThan(0);
      for (const c of x.camposAlterados) {
        expect(c.participaDaComposicaoHT).toBe(v2.CAMPOS_HT_KEY_CLAIMS.includes(c.campo.split('.')[0]));
        expect(aprovadaPorId.has(c.aprovada)).toBe(true);
      }
      expect(x.alteracaoAdministrativa).toEqual([{ campo: 'enderecoNaBase.sha', antes: v2.BASE_SNAPSHOT, depois: BASE_CORRIGIDA, participaDaComposicaoHT: false }]);
      expect([x.trechoIdAnterior, x.trechoIdNovo]).toEqual([ev1.porTrecho[x.indice].trechoId, ev2.porTrecho[x.indice].trechoId]);
    }
  });

  test('CONTROLE: mudança exclusivamente administrativa não altera a identidade', () => {
    for (const i of manifesto.derivacao.unidadesAfetadas) {
      const soEndereco = clone(ev1.porTrecho[i]);
      soEndereco.enderecoNaBase.sha = BASE_CORRIGIDA;
      expect(candidate(soEndereco, 'T').chave).toBe(ev1.porTrecho[i].trechoId);
      const soUso = clone(ev1.porTrecho[i]);
      soUso.dadosOriginais.usable_as = 'controle';
      expect(candidate(soUso, 'T').chave).toBe(ev1.porTrecho[i].trechoId);
      const v2ComEnderecoAntigo = clone(ev2.porTrecho[i]);
      v2ComEnderecoAntigo.enderecoNaBase.sha = v2.BASE_SNAPSHOT;
      expect(candidate(v2ComEnderecoAntigo, 'T').chave).toBe(ev2.porTrecho[i].trechoId);
    }
  });
});

describe('A.33 v2: todas as ocorrências', () => {
  const ce2 = dois['contexto-estatico.json'], c12 = dois['C1-recuperacao.json'];
  const porEndereco = new Map<string, number>(ev2.porTrecho.map((u: any, i: number) => [chaveEndereco(u.enderecoNaBase), i]));

  test('cada ocorrência com trechoId resolve para UMA unidade e carrega o trechoId dela, sem órfão', () => {
    const ocorrencias: Array<[string, any]> = [
      ...ev2.porTrecho.map((u: any, i: number) => [`porTrecho[${i}]`, u]),
      ...ev2.semIdentificadorRecuperavel.map((u: any, i: number) => [`semIdentificadorRecuperavel[${i}]`, u]),
      ...ce2.quatroSecoes.flatMap((s: any, si: number) => s.referencias.map((r: any, ri: number) => [`quatroSecoes[${si}].referencias[${ri}]`, r])),
      ...ce2.outrasTresSuperficies.flatMap((s: any, si: number) => s.enderecos.map((e: any, ei: number) => [`outrasTresSuperficies[${si}].enderecos[${ei}]`, e])),
      ...c12.trechos.map((t: any, i: number) => [`trechos[${i}]`, t]),
    ];
    expect(ocorrencias).toHaveLength(165 + 1 + 135 + 64 + 3);
    const alcancadas = new Set<number>();
    for (const [onde, o] of ocorrencias) {
      const i = porEndereco.get(chaveEndereco(o.enderecoNaBase));
      if (i === undefined) throw new Error('órfã: ' + onde);
      expect([onde, o.trechoId]).toEqual([onde, ev2.porTrecho[i].trechoId]);
      alcancadas.add(i);
    }
    expect(alcancadas.size).toBe(165);
    expect(porEndereco.size).toBe(165);
  });

  test('as seis cópias sem trechoId resolvem por chunk.id, com associação única e o mesmo conteúdo', () => {
    const copias = [
      ...c12.porConsulta.flatMap((c: any) => c.retornoChunks),
      ...c12.finalChunksEsperados,
    ];
    expect(copias).toHaveLength(6);
    for (const k of copias) {
      const alvos = c12.trechos.filter((t: any) => t.chunk.id === k.id);
      expect(alvos).toHaveLength(1);
      expect(k).toEqual(alvos[0].chunk);
      expect(k).not.toHaveProperty('trechoId');
    }
  });

  test('o mesmo valor de trechoId nunca aparece em duas unidades distintas', () => {
    const valores = ev2.porTrecho.map((u: any) => u.trechoId).filter((v: any) => v !== null);
    expect(valores).toHaveLength(164);
    expect(new Set(valores).size).toBe(164);
  });

  test('nenhum identificador no texto fornecido ao modelo, nem acrescentado a chunk ou referenceDoc', () => {
    const ce1 = um['contexto-estatico.json'], c11 = um['C1-recuperacao.json'];
    ce2.quatroSecoes.forEach((s: any, si: number) => s.referencias.forEach((r: any, ri: number) => {
      expect(Object.keys(r.referenceDoc)).toEqual(Object.keys(ce1.quatroSecoes[si].referencias[ri].referenceDoc));
    }));
    const chunks = [...c12.trechos.map((t: any) => t.chunk), ...c12.porConsulta.flatMap((c: any) => c.retornoChunks), ...c12.finalChunksEsperados];
    for (const k of chunks) {
      expect(Object.keys(k)).toEqual(['id', 'score', 'metadata']);
      expect(Object.keys(k.metadata)).toEqual(Object.keys(c11.trechos[0].chunk.metadata));
    }
    const textoAoModelo = JSON.stringify([
      ce2.quatroSecoes.map((s: any) => [s.textoFormatado, s.referencias.map((r: any) => r.referenceDoc)]),
      ce2.outrasTresSuperficies.map((s: any) => s.textoFormatado),
      chunks,
    ]);
    for (const proibido of ['\\u001e', RS, 'A33-por-tipo-v2', 'trechoId', 'versaoSha256']) expect(textoAoModelo).not.toContain(proibido);
  });
});

// ============================================================
// Montagem pelo handler real
// ============================================================

const DIMS = 1024;
const CHAVES_FALSAS: Record<string, string> = {
  VOYAGE_API_KEY: 'chave-voyage-falsa-do-processo-de-teste',
  UPSTASH_VECTOR_REST_URL: 'https://indice-simulado.exemplo',
  UPSTASH_VECTOR_REST_TOKEN: 'token-upstash-falso-do-processo-de-teste',
  ANTHROPIC_API_KEY: 'chave-anthropic-falsa-do-processo-de-teste',
};
const NOMES_ENV = [...Object.keys(CHAVES_FALSAS), 'USE_RAG_SEMANTIC'];
const SENTINELA = 'montagem capturada; execucao interrompida antes de qualquer parecer';
const envOriginal: Record<string, string | undefined> = {};
function restaurarEnv(nome: string, anterior: string | undefined) {
  if (anterior === undefined) delete process.env[nome];
  else process.env[nome] = anterior;
}

/**
 * A requisição dos casos C1, C2 e C3, montada do payload de referência.
 *
 * ⚠ **Não é projeto sintético.** Vem de `docs/calculations-13jul2026.json` pela
 * transformação declarada em `scripts/a33-payload-referencia.cjs`, que espelha a
 * tela e diz, campo a campo, o que é lido, derivado ou ausente.
 */
const referencia = require('../../scripts/a33-payload-referencia.cjs');
const CALCULO = JSON.parse(referencia.lerArquivo().toString('utf8'));
const REQUISICAO = referencia.montarRequisicao(CALCULO).requisicao;

/**
 * Captura os argumentos da montagem e interrompe.
 *
 * ⚠ A recuperação simulada associa cada consulta ao seu retorno pelo TEXTO da
 * consulta, que o embed simulado codifica no vetor; não depende da ordem das
 * chamadas paralelas.
 */
async function montar(flag: string | undefined, porConsulta: Array<{ consulta: string; retornoChunks: any[] }>) {
  jest.resetModules();
  for (const [n, v] of Object.entries(CHAVES_FALSAS)) process.env[n] = v;
  restaurarEnv('USE_RAG_SEMANTIC', flag);
  const cap = { system: '', messages: '', embeds: 0, consultas: 0, chamadasAoModelo: 0 };
  const consultas = porConsulta.map((c) => c.consulta);

  jest.doMock('voyageai', () => ({
    VoyageAIClient: class {
      async embed(a: { input: string[] }) {
        cap.embeds += 1;
        const i = consultas.indexOf(a.input[0]);
        if (i < 0) throw new Error('consulta fora da preparação');
        return { data: [{ embedding: new Array(DIMS).fill(i + 1) }] };
      }
    },
  }));
  jest.doMock('@upstash/vector', () => ({
    Index: class {
      async query(a: { vector: number[] }) {
        cap.consultas += 1;
        return clone(porConsulta[a.vector[0] - 1].retornoChunks);
      }
    },
  }));
  jest.doMock('@anthropic-ai/sdk', () => ({
    __esModule: true,
    default: class {
      messages = {
        create: async (a: { system: string; messages: Array<{ content: string }> }) => {
          cap.chamadasAoModelo += 1;
          cap.system = a.system;
          cap.messages = a.messages.map((m) => m.content).join('\n');
          throw new Error(SENTINELA);
        },
      };
    },
  }));

  const bloqueio = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    throw new Error('fetch bloqueado no ensaio');
  });
  const silencios = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m as 'log').mockImplementation(() => undefined));
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { POST } = require('@/app/api/ai-reviewer/route');
    const res = await POST({ json: async () => clone(REQUISICAO) } as any);
    const corpo = await res.json();
    return { ...cap, status: res.status, corpo, fetches: bloqueio.mock.calls.length };
  } finally {
    bloqueio.mockRestore();
    silencios.forEach((s) => s.mockRestore());
  }
}

const contar = (texto: string, parte: string) => texto.split(parte).length - 1;

/** Folhas de uma árvore, com vetor ou objeto vazio contando como folha. */
function folhas(v: any, segs: any[] = [], saida: any[][] = []): any[][] {
  const vazio = (x: any) => (Array.isArray(x) ? x.length === 0 : Object.keys(x).length === 0);
  if (v !== null && typeof v === 'object' && !vazio(v)) {
    for (const k of Object.keys(v)) folhas(v[k], [...segs, Array.isArray(v) ? Number(k) : k], saida);
  } else saida.push(segs);
  return saida;
}

describe('A.33 v2: o payload de referência, e a transformação até a requisição', () => {
  const origens: any[] = referencia.montarRequisicao(CALCULO).origens;
  const cobre = (rotulo: string) => origens.filter((o) => rotulo === o.campo || rotulo.startsWith(o.campo + '.') || rotulo.startsWith(o.campo + '['));

  test('o arquivo é o fixado nos casos, pelo resumo dos bytes', () => {
    const resumo = sha(referencia.lerArquivo().toString('utf8'));
    for (const casos of [um['casos.json'], dois['casos.json']]) {
      expect(casos.payloadReferencia.arquivo).toBe(referencia.ARQUIVO);
      expect(casos.payloadReferencia.sha256Bytes).toBe(resumo);
    }
  });

  test('cada folha da requisição tem UMA origem declarada, e cada origem alcança a requisição ou declara o campo omitido', () => {
    for (const segs of folhas(REQUISICAO)) expect([v2.rotulo(segs), cobre(v2.rotulo(segs)).length]).toEqual([v2.rotulo(segs), 1]);
    const omitidos = origens.filter((o) => v2.valorEm(REQUISICAO, o.campo.match(/[^.[\]"]+/g)) === undefined).map((o) => o.campo);
    expect(omitidos).toEqual(['individualStats', 'sensitiveGroups', 'exclusionInfo']);
    for (const o of origens) expect(['lido', 'derivado', 'ausente-no-arquivo', 'constante-da-tela']).toContain(o.origem);
  });

  test('o que é LIDO é o valor do arquivo; o que é DERIVADO segue a regra declarada', () => {
    for (const o of origens.filter((x) => x.origem === 'lido')) expect(REQUISICAO[o.campo]).toEqual(CALCULO[o.campo]);
    const [b, o, c, r] = CALCULO.bocrWeights;
    expect(REQUISICAO.personalWeights).toEqual({ Benefits: b, Opportunities: o, Costs: c, Risks: r });
    const s = CALCULO.rescalingWeights;
    expect(REQUISICAO.rescalingWeights).toEqual({ Benefits: s.sb, Opportunities: s.so, Costs: s.sc, Risks: s.sr });
    expect(REQUISICAO.qualityAnalysis.statistics.byStatus['CONFIÁVEL']).toBe(CALCULO.responseCount);
    const aviso = origens.find((x) => x.campo === 'qualityAnalysis.statistics.byStatus["CONFIÁVEL"]');
    expect(aviso.regra).toContain('SEM medição individual');
  });

  test('o espelho da tela segue válido, pelas âncoras de texto', () => {
    const tela = fs.readFileSync(path.join(__dirname, '../..', referencia.TELA), 'utf8');
    for (const [ancora, n] of referencia.ANCORAS_DA_TELA) expect([ancora, contar(tela, ancora)]).toEqual([ancora, n]);
  });

  test('o manifesto declara a mesma transformação, com o resumo do arquivo e da requisição', () => {
    expect(manifesto.payloadDeReferencia).toEqual(referencia.declaracao());
    expect(manifesto.payloadDeReferencia.sha256Requisicao).toBe(sha(JSON.stringify(REQUISICAO)));
    expect(manifesto.payloadDeReferencia.pendencia).toContain('A.12');
  });
});

describe('A.33 v2: a montagem real corresponde à nova preparação, sem chamada externa', () => {
  const ce1 = um['contexto-estatico.json'], ce2 = dois['contexto-estatico.json'], c12 = dois['C1-recuperacao.json'];
  const vazios = c12.porConsulta.map((c: any) => ({ consulta: c.consulta, retornoChunks: [] }));
  const casos: Array<[string, string | undefined, any[]]> = [
    ['C1', 'true', c12.porConsulta],
    ['C2', undefined, vazios],
    ['C3', 'true', vazios],
  ];
  const capturas: Record<string, any> = {};

  beforeAll(async () => {
    for (const n of NOMES_ENV) envOriginal[n] = process.env[n];
    for (const [nome, flag, porConsulta] of casos) capturas[nome] = await montar(flag, porConsulta);
  });
  afterAll(() => {
    for (const n of NOMES_ENV) restaurarEnv(n, envOriginal[n]);
  });

  test.each(['C1', 'C2', 'C3'])('%s: argumentos capturados, execução interrompida, nenhuma chamada externa', (nome: string) => {
    const c = capturas[nome];
    expect(c.chamadasAoModelo).toBe(1);
    expect(c.status).toBe(500);
    expect(c.corpo.details).toBe(SENTINELA);
    expect(c.fetches).toBe(0);
    expect([c.embeds, c.consultas]).toEqual(nome === 'C2' ? [0, 0] : [5, 5]);
  });

  test.each(['C1', 'C2', 'C3'])('%s: as seções estáticas da v2 estão na montagem, uma vez cada', (nome: string) => {
    const m = capturas[nome].messages;
    for (const s of ce2.quatroSecoes) expect(contar(m, s.textoFormatado)).toBe(1);
    for (const s of ce2.outrasTresSuperficies) expect(contar(m, s.textoFormatado)).toBe(1);
    // As duas seções que mudaram NÃO estão na forma da v1; as duas que não mudaram estão.
    expect(ce1.quatroSecoes.map((s: any) => contar(m, s.textoFormatado))).toEqual([0, 0, 1, 1]);
  });

  test.each(['C1', 'C2', 'C3'])('%s: nenhuma forma antiga e nenhum identificador chegam ao modelo', (nome: string) => {
    const tudo = capturas[nome].system + '\n' + capturas[nome].messages;
    for (const antigo of [W_ANTES, SAATY_ANTES, WC_ANTES]) expect(contar(tudo, antigo)).toBe(0);
    for (const proibido of [RS, 'A33-por-tipo-v2', 'trechoId']) expect(tudo).not.toContain(proibido);
  });

  test.each(['C1', 'C2', 'C3'])('%s: a montagem usa o payload de referência, e nenhum dado sintético', (nome: string) => {
    const m = capturas[nome].messages;
    const pct = (x: number) => (x * 100).toFixed(1) + '%';
    const [b, o, c, r] = CALCULO.bocrWeights;
    expect(contar(m, `(B=${pct(b)}, O=${pct(o)}, C=${pct(c)}, R=${pct(r)})`)).toBe(1);
    expect(m).toContain('**Título do Projeto:** Projeto sem nome');
    for (const f of CALCULO.finalScores) expect(contar(m, `${f.code} — ${f.name}: Score = ${f.scoreSubtractive.toFixed(6)}`)).toBe(1);
    for (const sintetico of ['Projeto de ensaio', 'Alternativa 1', 'B=37.0%']) expect(m).not.toContain(sintetico);
  });

  test('C1: os três chunks fixados da v2 chegam formatados, na ordem da preparação', () => {
    const m = capturas.C1.messages;
    c12.finalChunksEsperados.forEach((k: any, i: number) => {
      const bloco = `**${i + 1}. ${k.metadata.article_id}** (${k.metadata.chunk_type} ${k.metadata.locator_id}) — score: ${k.score.toFixed(3)}\n${k.metadata.text}\n*Verbatim:* "${k.metadata.verbatim_quote}"`;
      expect(contar(m, bloco)).toBe(1);
    });
  });

  test('C2 e C3: sem chunk semântico, e a mesma montagem nos dois', () => {
    for (const nome of ['C2', 'C3']) expect(capturas[nome].messages).toContain('_(nenhum chunk semântico recuperado nesta execução)_');
    expect(capturas.C2.messages).toBe(capturas.C3.messages);
    expect(capturas.C1.system).toBe(capturas.C2.system);
    expect(capturas.C2.system).toBe(capturas.C3.system);
  });
});

describe('A.33 v2: estados e contagens resultam da verificação', () => {
  test('nenhuma unidade muda de estado sem conclusão nova', () => {
    ev2.porTrecho.forEach((u: any, i: number) => expect(u.conferenciaPublicacao).toEqual(ev1.porTrecho[i].conferenciaPublicacao));
    expect(manifesto.transicoes).toHaveLength(165);
    manifesto.transicoes.forEach((t: any, i: number) => {
      expect(t.indice).toBe(i);
      expect(t.estadoPosterior).toBe(t.estadoAnterior);
      expect(t.afetada).toBe(manifesto.derivacao.unidadesAfetadas.includes(i));
    });
    expect(manifesto.contagens).toMatchObject({ denominador: 165, conferidasAntes: 4, conferidasDepois: 4, pendentesAntes: 161, pendentesDepois: 161, movidas: 0 });
    expect(dois['casos.json'].resumoEvidencias).toEqual(um['casos.json'].resumoEvidencias);
  });

  test('cada unidade afetada cita a evidência, e Wijnmalen [3] segue PARCIALMENTE PENDENTE', () => {
    for (const i of manifesto.derivacao.unidadesAfetadas) {
      const ev = manifesto.transicoes[i].evidencia;
      expect(Object.keys(ev)).toEqual(['conteudoDaV2', 'conclusoesRegistradas', 'aplicabilidadeAV2', 'pendencias']);
      expect(ev.pendencias).toMatch(/^Conservadas/);
    }
    const w3 = manifesto.transicoes[89];
    expect([w3.articleId, w3.enderecoNaBase.indiceBaseZero, w3.estadoPosterior]).toEqual(['wijnmalen2007_bocr', 3, 'pendente']);
    expect(w3.evidencia.aplicabilidadeAV2).toContain('PARCIALMENTE PENDENTE');
    expect(w3.evidencia.aplicabilidadeAV2).toContain('não certifica a claim nem o verbatim_quote');
    expect(ev2.porTrecho[89].comparacaoDosCampos.iguais).toBe(false);
  });

  test('o indicador de C1 sai dos registros: conteúdo inspecionado E as quatro condições', () => {
    const insp = lerJson('docs/dados/a33-conferencia-c1/inspecao-wijnmalen-forman.json');
    const med = lerJson('docs/dados/a33-conferencia-c1/medicao-pdfs.json');
    const registro: Record<string, any> = { saaty1977_scaling: med.inspecaoVisualSaaty237, wijnmalen2007_bocr: insp.trechos[0], forman1998_aggregating: insp.trechos[1] };
    const porEndereco = new Map<string, any>(ev2.porTrecho.map((u: any) => [chaveEndereco(u.enderecoNaBase), u]));
    const calculado = dois['C1-recuperacao.json'].trechos.map((t: any) => {
      const d = porEndereco.get(chaveEndereco(t.enderecoNaBase)).dadosOriginais, r = registro[t.articleId];
      const corresp = d.verbatim_quote === r.recorte.texto && d.evidence.quote === r.recorte.texto;
      const sust = d.claim === r.sustentacaoDaClaim.claim;
      const cond = Object.entries(r.resultadoDaUnidade.condicoesDaSecao4).filter(([k]) => k !== 'nota').every(([, v]) => v === true);
      return [t.articleId, corresp, sust, corresp && sust && cond];
    });
    expect(calculado).toEqual([
      ['saaty1977_scaling', false, true, false],
      ['wijnmalen2007_bocr', false, false, false],
      ['forman1998_aggregating', true, true, true],
    ]);
    const ind = manifesto.indicadorC1;
    expect([ind.total, ind.denominador, ind.quais]).toEqual([1, 3, ['forman1998_aggregating key_claims[2]']]);
    expect(ind.porTrecho.map((x: any) => [x.articleId, x.conclusaoDeCorrespondenciaAplicaAV2, x.conclusaoDeSustentacaoAplicaAV2, x.atendimentoDemonstrado])).toEqual(calculado);
  });
});
