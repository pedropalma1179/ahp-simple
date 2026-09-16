/**
 * A.33, passo 3: trava a aplicação de H-T como `trechoId` nos artefatos da etapa 4.
 *
 * ⚠ **O arquivo muda porque ganha um campo; o TEXTO não muda.** É a terceira
 * descrição que mede isso, e ela **não se substitui** por leitura do diff.
 *
 * Não chama serviço externo, não lê o índice e não gera parecer.
 */
export {};
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const aplicacao = require('../../scripts/a33-aplicar-trecho-id.cjs');
const { candidate } = require('../../scripts/measure-a33-identity-v2.cjs');
const { suppliedTexts } = require('../../scripts/measure-a33-identity.cjs');

const raiz = path.resolve(__dirname, '../..');
const ler = (rel: string) => JSON.parse(fs.readFileSync(path.join(raiz, rel), 'utf8'));
const DADOS = 'docs/dados/a33-etapa4/';

const evidencias = ler(DADOS + 'evidencias.json');
const contexto = ler(DADOS + 'contexto-estatico.json');
const c1 = ler(DADOS + 'C1-recuperacao.json');
const casos = ler(DADOS + 'casos.json');
const declarado = ler('docs/dados/a33-identidade-aplicada/resumos-texto.json');
const medicao = ler('docs/dados/a33-identidade-revisada/medicao.json');

/** `indiceBaseZero` ausente, como no benchmark, vira null e não some. */
const endereco = (a: any) => JSON.stringify([a.sha, a.arquivo, a.campo, a.indiceBaseZero ?? null]);
const RS = String.fromCharCode(30);
const PREFIXO = 'A33-por-tipo-v2';

/** Toda ocorrência com campo `trechoId`, nos três artefatos. */
function ocorrencias(): Array<{ artefato: string; caminho: string; alvo: any }> {
  const saida: Array<{ artefato: string; caminho: string; alvo: any }> = [];
  const add = (artefato: string, caminho: string, alvo: any) => saida.push({ artefato, caminho, alvo });
  evidencias.porTrecho.forEach((u: any, i: number) => add('evidencias.json', `porTrecho[${i}]`, u));
  evidencias.semIdentificadorRecuperavel.forEach((u: any, i: number) => add('evidencias.json', `semIdentificadorRecuperavel[${i}]`, u));
  contexto.quatroSecoes.forEach((s: any, si: number) =>
    s.referencias.forEach((r: any, ri: number) => add('contexto-estatico.json', `quatroSecoes[${si}].referencias[${ri}]`, r)));
  contexto.outrasTresSuperficies.forEach((s: any, si: number) =>
    s.enderecos.forEach((e: any, ei: number) => add('contexto-estatico.json', `outrasTresSuperficies[${si}].enderecos[${ei}]`, e)));
  c1.trechos.forEach((t: any, i: number) => add('C1-recuperacao.json', `trechos[${i}]`, t));
  return saida;
}

/**
 * TODA cópia de chunk de C1, com seu caminho.
 *
 * ⚠ São NOVE objetos, e só três ficam em `trechos[]`, ao lado do `trechoId`. As
 * outras seis não carregam o campo: o vínculo delas é o `chunk.id`.
 */
function copiasDeChunk(): Array<{ caminho: string; chunk: any }> {
  return [
    ...c1.trechos.map((t: any, i: number) => ({ caminho: `trechos[${i}].chunk`, chunk: t.chunk })),
    ...c1.porConsulta.flatMap((q: any, qi: number) =>
      q.retornoChunks.map((k: any, ki: number) => ({ caminho: `porConsulta[${qi}].retornoChunks[${ki}]`, chunk: k }))),
    ...c1.finalChunksEsperados.map((k: any, i: number) => ({ caminho: `finalChunksEsperados[${i}]`, chunk: k })),
  ];
}

/**
 * Resolve uma cópia contra o registro de `trechos[]`, pelo `chunk.id`.
 *
 * ⚠ Três recusas distintas, e o motivo diz qual é: sem vínculo, vínculo ambíguo
 * e conteúdo divergente. **ID correto com conteúdo trocado não passa.**
 */
function vincular(chunk: any, registro: any[] = c1.trechos): { ok: boolean; motivo?: string; trechoId?: string } {
  const casam = registro.filter((t: any) => t.chunk.id === chunk.id);
  if (casam.length === 0) return { ok: false, motivo: 'sem vínculo' };
  if (casam.length > 1) return { ok: false, motivo: 'vínculo ambíguo' };
  if (JSON.stringify(chunk) !== JSON.stringify(casam[0].chunk)) return { ok: false, motivo: 'conteúdo divergente' };
  return { ok: true, trechoId: casam[0].trechoId };
}

describe('A.33: H-T aplicado como trechoId', () => {
  test('cobertura: 164 identificadas e UMA exceção nomeada, que é de critério e não de defeito', () => {
    const comId = evidencias.porTrecho.filter((u: any) => typeof u.trechoId === 'string' && u.trechoId.length > 0);
    const nulos = evidencias.porTrecho.filter((u: any) => u.trechoId === null);
    expect(evidencias.porTrecho).toHaveLength(165);
    expect(comId).toHaveLength(164);
    expect(nulos).toHaveLength(1);
    expect(nulos[0].articleId).toBe('saiyed2023_ceoPowerUET');
    expect(nulos[0].enderecoNaBase.campo).toBe('empirical_data');
    // O motivo é insuficiência para o critério de benchmark: os sete campos
    // quantitativos são nulos. ⚠ Não é defeito da base, e o dado não foi corrigido.
    const quantitativos = ['n_respondents', 'n_alternatives', 'n_criteria_total', 'bocr_weights', 'concordance_rate', 'cr_aggregated', 'weight_ratio'];
    expect(quantitativos.every((k) => nulos[0].dadosOriginais[k] === null)).toBe(true);
    expect(nulos[0].dadosOriginais.source_year).not.toBeNull();
    expect(nulos[0].dadosOriginais.domain).not.toBeNull();
    // A exceção coincide com a que a medição aprovada já havia excluído.
    expect(medicao.principal.total.T.excluidas).toHaveLength(1);
    expect(medicao.principal.total.T.excluidas[0].articleId).toBe('saiyed2023_ceoPowerUET');
    expect(casos.resumoEvidencias.semTrechoId).toBe(1);
  });

  test('o valor gravado é a composição H-T COMPLETA, não apenas o resumo', () => {
    for (const u of evidencias.porTrecho) {
      if (u.trechoId === null) continue;
      const esperada = candidate(u, 'T');
      expect(u.trechoId).toBe(esperada.chave);
      const partes = u.trechoId.split(RS);
      expect(partes).toHaveLength(5);
      expect(partes[0]).toBe(PREFIXO);
      expect(JSON.parse(partes[1])[0]).toBe('articleId');
      expect(JSON.parse(partes[2])[0]).toBe('tipo');
      expect(JSON.parse(partes[3])[0]).toBe('idNativo');
      expect(JSON.parse(partes[4])).toEqual(['versaoSha256', ['texto', esperada.versaoSha256]]);
      expect(esperada.versaoSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test('ID nativo de fórmula fica LITERAL na chave, e não vira resumo', () => {
    const formulas = evidencias.porTrecho.filter((u: any) => u.tipo === 'formula');
    expect(formulas).toHaveLength(36);
    for (const f of formulas) {
      expect(JSON.parse(f.trechoId.split(RS)[3])).toEqual(['idNativo', ['texto', f.dadosOriginais.id]]);
    }
    // Onde não há ID nativo, ausente NÃO recebe substituto.
    const claims = evidencias.porTrecho.filter((u: any) => u.tipo === 'claim');
    expect(claims).toHaveLength(101);
    for (const c of claims) expect(JSON.parse(c.trechoId.split(RS)[3])).toEqual(['idNativo', ['ausente']]);
  });

  test('propagação: a mesma unidade tem o MESMO valor em todos os artefatos, sem órfão', () => {
    const registro = new Map<string, any>();
    evidencias.porTrecho.forEach((u: any) => registro.set(endereco(u.enderecoNaBase), u.trechoId));
    expect(registro.size).toBe(165);
    const todas = ocorrencias();
    // 165 em porTrecho, 1 no que restou de semIdentificadorRecuperavel, 135+64 no
    // contexto estático e 3 em C1. Eram 532 antes de as 164 pendências resolvidas
    // saírem daquele vetor.
    expect(todas).toHaveLength(368);
    for (const { artefato, caminho, alvo } of todas) {
      const chave = endereco(alvo.enderecoNaBase);
      // Órfão: referência a unidade que o registro não tem.
      expect(registro.has(chave)).toBe(true);
      expect(`${artefato} ${caminho} -> ${alvo.trechoId}`).toBe(`${artefato} ${caminho} -> ${registro.get(chave)}`);
    }
    // Nenhum valor gravado fora do conjunto do registro.
    const conhecidos = new Set(registro.values());
    for (const { alvo } of todas) expect(conhecidos.has(alvo.trechoId)).toBe(true);
  });

  test('as NOVE cópias de chunk de C1 se vinculam por chunk.id, com conteúdo conferido', () => {
    // ⚠ As cópias NÃO carregam `trechoId`: o campo fica ao lado do chunk, em
    // `trechos[]`. O vínculo recuperável é o `chunk.id`, e é ele que se testa.
    // Verificar só `trechos[].trechoId` deixaria seis das nove sem cobertura.
    const copias = copiasDeChunk();
    expect(copias).toHaveLength(9);
    expect(copias.filter((c) => c.caminho.startsWith('trechos'))).toHaveLength(3);
    expect(copias.filter((c) => c.caminho.startsWith('porConsulta'))).toHaveLength(3);
    expect(copias.filter((c) => c.caminho.startsWith('finalChunksEsperados'))).toHaveLength(3);
    expect(copias.every((c) => !('trechoId' in c.chunk))).toBe(true);

    const porEndereco = new Map(evidencias.porTrecho.map((u: any) => [endereco(u.enderecoNaBase), u]));
    for (const { caminho, chunk } of copias) {
      // Associação ÚNICA: um `chunk.id` resolve para exatamente um registro.
      const registros = c1.trechos.filter((t: any) => t.chunk.id === chunk.id);
      expect(`${caminho}: ${registros.length} registro(s)`).toBe(`${caminho}: 1 registro(s)`);
      const [registro] = registros;
      // H-T correto, o mesmo da unidade daquele endereço.
      const unidade: any = porEndereco.get(endereco(registro.enderecoNaBase));
      expect(unidade).toBeDefined();
      expect(`${caminho} -> ${registro.trechoId}`).toBe(`${caminho} -> ${unidade.trechoId}`);
      expect(typeof registro.trechoId).toBe('string');
      // ⚠ Conteúdo da cópia comparado com o chunk daquele registro. ID correto
      // com conteúdo trocado também reprova.
      expect(`${caminho}: ${JSON.stringify(chunk)}`).toBe(`${caminho}: ${JSON.stringify(registro.chunk)}`);
      expect(chunk.metadata.article_id).toBe(unidade.articleId);
    }
  });

  test('CONTROLE de vínculo ausente: cópia cujo chunk.id não existe no registro reprova', () => {
    const orfa = JSON.parse(JSON.stringify(c1.trechos[0].chunk));
    orfa.id = 'obra-inexistente::claim::0';
    expect(c1.trechos.filter((t: any) => t.chunk.id === orfa.id)).toHaveLength(0);
    expect(vincular(orfa)).toEqual({ ok: false, motivo: 'sem vínculo' });
  });

  test('CONTROLE de vínculo ambíguo: dois registros com o mesmo chunk.id reprovam', () => {
    const duplicado = JSON.parse(JSON.stringify(c1));
    duplicado.trechos.push(JSON.parse(JSON.stringify(duplicado.trechos[0])));
    const alvo = duplicado.trechos[0].chunk;
    expect(duplicado.trechos.filter((t: any) => t.chunk.id === alvo.id)).toHaveLength(2);
    expect(vincular(alvo, duplicado.trechos)).toEqual({ ok: false, motivo: 'vínculo ambíguo' });
    // ⚠ E o conteúdo trocado reprova mesmo com o ID certo e o vínculo único.
    const trocado = JSON.parse(JSON.stringify(c1.trechos[0].chunk));
    trocado.metadata.text = c1.trechos[1].chunk.metadata.text;
    expect(vincular(trocado)).toEqual({ ok: false, motivo: 'conteúdo divergente' });
    expect(vincular(c1.trechos[0].chunk).ok).toBe(true);
  });

  test('unicidade: nenhum trechoId repetido entre unidades DISTINTAS', () => {
    const valores = evidencias.porTrecho.filter((u: any) => u.trechoId !== null).map((u: any) => u.trechoId);
    expect(valores).toHaveLength(164);
    expect(new Set(valores).size).toBe(164);
  });

  test.each(Object.keys(aplicacao.RAIZES))('texto intacto em %s: estrutural e texto coincidem com o antes', (arquivo: string) => {
    const antes = declarado.antes[arquivo];
    const agora = aplicacao.resumos(arquivo);
    // ⚠ A relação por raiz vem PRIMEIRO, de propósito: resumo único que não bate
    // não diz onde falhou, e jest para na primeira asserção que falha. Assim a
    // falha NOMEIA a raiz divergente antes de qualquer agregado.
    expect(agora.porItem.map((i: any) => `${i.raiz}:${i.sha256}`)).toEqual(antes.porItem.map((i: any) => `${i.raiz}:${i.sha256}`));
    expect(agora.stringsDeTexto).toBe(antes.stringsDeTexto);
    expect(agora.sha256Texto).toBe(antes.sha256Texto);
    // O arquivo MUDOU, porque ganhou um campo. Isso é esperado, e é o que separa
    // o resumo do arquivo dos outros dois.
    expect(agora.sha256Arquivo).not.toBe(antes.sha256Arquivo);
  });

  test.each(['evidencias.json', 'contexto-estatico.json', 'C1-recuperacao.json', 'casos.json'])(
    'controle estrutural de %s: SÓ as diferenças enumeradas, e todas elas',
    (arquivo: string) => {
      const bloco = declarado.alteracoesAdministrativas;
      const versionado = JSON.parse(
        execFileSync('git', ['show', `${bloco.referenciaVersionada}:${DADOS}${arquivo}`], { cwd: raiz, maxBuffer: 30 * 1024 * 1024 }).toString('utf8'));
      const atual = ler(DADOS + arquivo);
      const enumerados = bloco.caminhos.filter((e: any) => e.arquivo === arquivo);
      const r = aplicacao.conferirExcecoes(versionado, atual, enumerados);
      // ⚠ Diferença fora da lista reprova, e a falha NOMEIA o caminho.
      expect(r.naoCobertas).toEqual([]);
      // ⚠ Exceção enumerada que não foi usada também reprova: lista frouxa é
      // lista que esconde, e seria a porta para exceção ampla.
      expect(r.semUso.map((e: any) => e.caminho)).toEqual([]);
      // ⚠ Cada caminho enumerado tem os DOIS valores fixados por resumo, então
      // nada se altera por dentro de uma exceção sem reprovar.
      expect(r.valoresErrados.map((e: any) => e.caminho)).toEqual([]);
      // O contexto estático não tem alteração administrativa alguma nesta rodada.
      if (arquivo === 'contexto-estatico.json') expect(r.folhasQueDiferem).toBe(0);
    });

  test('a distinção de identidade é POR UNIDADE, e as 36 fórmulas têm ID nativo', () => {
    const comNativo = evidencias.porTrecho.filter((u: any) => u.identidade.nativaNaBase !== null);
    expect(comNativo).toHaveLength(36);
    expect(new Set(comNativo.map((u: any) => u.tipo))).toEqual(new Set(['formula']));
    for (const u of comNativo) expect(u.identidade.nativaNaBase).toBe(u.dadosOriginais.id);
    // ⚠ Nenhuma fórmula pode aparecer como "sem ID nativo": seriam 36 afirmações
    // falsas, e é por isso que o vetor não foi renomeado em bloco.
    const semNativo = evidencias.porTrecho.filter((u: any) => u.identidade.nativaNaBase === null);
    expect(semNativo.filter((u: any) => u.tipo === 'formula')).toHaveLength(0);
    expect(semNativo).toHaveLength(129);
    expect(evidencias.resumo.idNativoNaBase.presente).toBe(36);
    expect(evidencias.resumo.idNativoNaBase.ausente).toBe(129);
    expect(evidencias.resumo.idNativoNaBase.porTipoAusente.formula).toBeUndefined();
    // Derivada onde foi aplicada, nula na única exceção.
    expect(evidencias.porTrecho.filter((u: any) => u.identidade.derivada === PREFIXO)).toHaveLength(164);
    expect(evidencias.porTrecho.filter((u: any) => u.identidade.derivada === null)).toHaveLength(1);
    for (const u of evidencias.porTrecho) expect(u.identidade.derivada === null).toBe(u.trechoId === null);
  });

  test('as pendências resolvidas saíram, e o manifesto APONTA para aplicacao.json sem duplicar', () => {
    expect(evidencias.resumo.semTrechoId).toBe(1);
    expect(casos.resumoEvidencias.semTrechoId).toBe(1);
    // Só permanece quem de fato não tem identificador recuperável.
    expect(evidencias.semIdentificadorRecuperavel).toHaveLength(1);
    const [restante] = evidencias.semIdentificadorRecuperavel;
    expect(restante.articleId).toBe('saiyed2023_ceoPowerUET');
    expect(restante.trechoId).toBeNull();
    expect(restante.motivo).toContain('a33-identidade-aplicada/aplicacao.json');
    // ⚠ Aponta, não duplica: a justificativa de conteúdo mínimo fica num lugar só.
    expect(restante.motivo).not.toMatch(/quantitativ|benchmark/i);
    const aplicada = ler('docs/dados/a33-identidade-aplicada/aplicacao.json');
    expect(aplicada.excecao.motivo).toMatch(/quantitativos/);
    // As afirmações que a adoção tornou falsas acompanham a adoção.
    expect(casos.pendenciasParaGeracao[0]).not.toMatch(/não houve autorização para criar esquema/);
    expect(casos.pendenciasParaGeracao[0]).toContain('H-T');
    expect(c1.identidade).toContain('chunk.id');
    expect(c1.identidade).not.toMatch(/nem preenche trechoId/);
  });

  test('casos.json volta a registrar o resumo vigente dos arquivos alterados', () => {
    const crypto = require('node:crypto');
    for (const [arquivo, registro] of Object.entries<any>(casos.integridadeDosDados)) {
      const bytes = fs.readFileSync(path.join(raiz, DADOS + arquivo));
      expect(registro.resumoCompleto).toBe(crypto.createHash('sha256').update(bytes).digest('hex'));
    }
  });

  test('Saiyed continua no contexto estático dos TRÊS casos, com trechoId nulo', () => {
    const superficie = contexto.outrasTresSuperficies.find((s: any) =>
      s.enderecos.some((e: any) => e.articleId === 'saiyed2023_ceoPowerUET'));
    expect(superficie).toBeDefined();
    expect(superficie.casos).toEqual(['C1', 'C2', 'C3']);
    const entrada = superficie.enderecos.find((e: any) => e.articleId === 'saiyed2023_ceoPowerUET');
    expect(entrada.trechoId).toBeNull();
    // ⚠ A exclusão é da cobertura de identidade elegível, e NÃO autoriza retirá-lo
    // do contexto: retirá-lo mudaria o contexto que os três casos comparam.
    expect(/saiyed/i.test(superficie.textoFormatado)).toBe(true);
  });

  test('o identificador novo NÃO integra o texto entregue ao modelo', () => {
    const textos = suppliedTexts(evidencias.porTrecho, contexto, c1);
    expect(textos).toHaveLength(165);
    const gravados = new Set(evidencias.porTrecho.map((u: any) => u.trechoId).filter(Boolean));
    for (const porUnidade of textos) {
      for (const t of porUnidade) {
        expect(t.texto).not.toContain(PREFIXO);
        expect(t.texto).not.toContain(RS);
        for (const id of gravados) expect(t.texto).not.toContain(id);
      }
    }
  });

  test('H-U continua na auditoria e NUNCA vira identificador', () => {
    const traco = ler('docs/dados/a33-identidade-revisada/rastreabilidade.json');
    expect(traco.principal).toHaveLength(165);
    expect(traco.principal.every((r: any) => typeof r.U.chave === 'string' && r.U.chave.startsWith('A33-universal-v2'))).toBe(true);
    // Nenhum trechoId gravado é uma candidata H-U, e nenhum outro identificador
    // concorrente foi criado.
    const universais = new Set(traco.principal.map((r: any) => r.U.chave));
    for (const { alvo } of ocorrencias()) {
      if (alvo.trechoId === null) continue;
      expect(universais.has(alvo.trechoId)).toBe(false);
      expect(alvo.trechoId.startsWith(PREFIXO + RS)).toBe(true);
    }
  });

  test('atribuir identidade NÃO conferiu publicação alguma', () => {
    const pendentes = evidencias.porTrecho.filter((u: any) => u.conferenciaPublicacao.estado === 'pendente');
    expect(pendentes).toHaveLength(161);
    expect(casos.resumoEvidencias.pendentes).toBe(161);
    expect(casos.resumoEvidencias.conferidas).toBe(4);
    // As 19 divergências de A.16 seguem abertas; nenhum lado foi escolhido.
    expect(evidencias.porTrecho.filter((u: any) => u.comparacaoDosCampos?.iguais === false)).toHaveLength(19);
  });
});
