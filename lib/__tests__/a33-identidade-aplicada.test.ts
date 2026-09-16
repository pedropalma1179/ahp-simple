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
    expect(todas).toHaveLength(532);
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

  test('os três chunks de C1 existem no registro e carregam o valor da sua unidade', () => {
    expect(c1.trechos).toHaveLength(3);
    const porEndereco = new Map(evidencias.porTrecho.map((u: any) => [endereco(u.enderecoNaBase), u]));
    for (const t of c1.trechos) {
      const u: any = porEndereco.get(endereco(t.enderecoNaBase));
      expect(u).toBeDefined();
      expect(typeof t.trechoId).toBe('string');
      expect(t.trechoId).toBe(u.trechoId);
      expect(t.chunk.metadata.article_id).toBe(u.articleId);
    }
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
    expect(agora.sha256Estrutural).toBe(antes.sha256Estrutural);
    // O arquivo MUDOU, porque ganhou um campo. Isso é esperado, e é o que separa
    // o resumo do arquivo dos outros dois.
    expect(agora.sha256Arquivo).not.toBe(antes.sha256Arquivo);
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
