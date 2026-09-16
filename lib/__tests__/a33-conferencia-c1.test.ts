/**
 * A.33: trava o registro da conferência dos três trechos de C1.
 *
 * ⚠ **Só lê arquivos versionados.** Nada aqui depende de rede, de acesso a
 * publicação ou do histórico do git: a lição de `46ac135` foi que teste com
 * condição externa passa aqui e reprova no CI, cujo checkout é raso.
 *
 * ⚠ **Não confere publicação.** Confere que o REGISTRO da conferência é coerente
 * com os dados e não afirma mais do que observou.
 */
export {};
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '../..');
const ler = (rel: string) => JSON.parse(fs.readFileSync(path.join(raiz, rel), 'utf8'));
const DADOS = 'docs/dados/a33-etapa4/';

const evidencias = ler(DADOS + 'evidencias.json');
const c1 = ler(DADOS + 'C1-recuperacao.json');
const conferencia = ler('docs/dados/a33-conferencia-c1/conferencia.json');

const endereco = (a: any) => JSON.stringify([a.sha, a.arquivo, a.campo, a.indiceBaseZero ?? null]);
const estado = (s: string) => evidencias.porTrecho.filter((u: any) => u.conferenciaPublicacao.estado === s);

describe('A.33: registro da conferência de C1', () => {
  test('cobre os TRÊS trechos, com associação única por articleId, trechoId e endereço', () => {
    expect(conferencia.trechos).toHaveLength(3);
    expect(c1.trechos).toHaveLength(3);
    for (const t of conferencia.trechos) {
      const casam = evidencias.porTrecho.filter(
        (u: any) => endereco(u.enderecoNaBase) === endereco(t.camposExtraidos.enderecoNaBase));
      // ⚠ Associação ambígua ou ausente interromperia a conferência.
      expect(`${t.identidade.articleId}: ${casam.length}`).toBe(`${t.identidade.articleId}: 1`);
      const [u] = casam;
      expect(t.identidade.articleId).toBe(u.articleId);
      expect(t.identidade.trechoId).toBe(u.trechoId);
      expect(t.identidade.indiceEmPorTrecho).toBe(evidencias.porTrecho.indexOf(u));
      // O trecho registrado é mesmo um dos fixados em C1.
      expect(c1.trechos.some((x: any) => x.chunk.id === t.chunkDeC1.id)).toBe(true);
    }
  });

  test('os NOVE campos extraídos batem com a unidade, um a um', () => {
    for (const t of conferencia.trechos) {
      const u = evidencias.porTrecho[t.identidade.indiceEmPorTrecho];
      const e = u.dadosOriginais.evidence || {};
      const c = t.camposExtraidos;
      expect(Object.keys(c).sort()).toEqual(
        ['articleId', 'claim', 'enderecoNaBase', 'evidence.locator_id', 'evidence.locator_type',
          'evidence.page', 'evidence.quote', 'trechoId', 'verbatim_quote'].sort());
      expect(c.articleId).toBe(u.articleId);
      expect(c.trechoId).toBe(u.trechoId);
      expect(c.enderecoNaBase).toEqual(u.enderecoNaBase);
      expect(c['evidence.page']).toBe(e.page ?? null);
      expect(c['evidence.locator_type']).toBe(e.locator_type ?? null);
      expect(c['evidence.locator_id']).toBe(e.locator_id ?? null);
      expect(c['evidence.quote']).toBe(e.quote ?? null);
      expect(c.verbatim_quote).toBe(u.dadosOriginais.verbatim_quote ?? null);
      expect(c.claim).toBe(u.dadosOriginais.claim ?? null);
      // ⚠ A página está PRESERVADA na base. A.33 tirou-a do parecer, não daqui.
      expect(typeof c['evidence.page']).toBe('number');
    }
  });

  test('nenhum dos três está entre as 19 divergências, e a marca é por TRECHO', () => {
    const divergentes = evidencias.porTrecho.filter((u: any) => u.comparacaoDosCampos?.iguais === false);
    expect(divergentes).toHaveLength(19);
    const chaves = new Set(divergentes.map((u: any) => endereco(u.enderecoNaBase)));
    for (const t of conferencia.trechos) {
      expect(chaves.has(endereco(t.camposExtraidos.enderecoNaBase))).toBe(false);
      expect(t.divergenciaA16.entreAs19).toBe(false);
    }
    // ⚠ O caso que mede a diferença entre obra e trecho: a obra de Wijnmalen TEM
    // divergências, e o trecho de C1 não é uma delas.
    const daObra = divergentes.filter((u: any) => u.articleId === 'wijnmalen2007_bocr');
    expect(daObra.map((u: any) => u.enderecoNaBase.indiceBaseZero).sort()).toEqual([2, 3, 4]);
    const deC1 = conferencia.trechos.find((t: any) => t.identidade.articleId === 'wijnmalen2007_bocr');
    expect(deC1.camposExtraidos.enderecoNaBase.indiceBaseZero).toBe(0);
  });

  test('nenhum campo aparece como "confere" sem transcrição da publicação', () => {
    for (const t of conferencia.trechos) {
      const campos = [t.resultadoPorCampo.verbatim_quote, t.resultadoPorCampo['evidence.quote']];
      for (const r of campos) {
        if (r.resultado !== 'nao conferido') {
          // Se algum dia um campo passar a "confere", a transcrição vira obrigatória.
          expect(typeof t.transcricao.texto).toBe('string');
          expect(t.transcricao.texto.length).toBeGreaterThan(0);
        } else {
          expect(r.motivo).toBeTruthy();
        }
      }
      // ⚠ Sustentação da claim é resultado SEPARADO, e não se colapsa nos campos.
      expect(['sustentada', 'parcialmente sustentada', 'nao sustentada', 'inconclusiva'])
        .toContain(t.sustentacaoDaClaim.resultado);
      if (t.sustentacaoDaClaim.resultado === 'inconclusiva') expect(t.sustentacaoDaClaim.motivo).toBeTruthy();
    }
  });

  test('página impressa e posição no PDF ficam SEPARADAS no localizador encontrado', () => {
    for (const t of conferencia.trechos) {
      expect(Object.keys(t.localizadorEncontrado).sort())
        .toEqual(['localizadorInterno', 'nota', 'paginaImpressa', 'posicaoNoPdf']);
      expect(Object.keys(t.localizadorDeclarado).sort()).toEqual(['id', 'nota', 'paginaImpressa', 'tipo']);
    }
    // Busca sem achado registra o ALCANCE da busca, e não vira "não confere".
    expect(conferencia.viasDeAcesso.alcanceDaBusca).toMatch(/Ficaram FORA/);
    expect(conferencia.viasDeAcesso.hostsRecusados.length).toBeGreaterThanOrEqual(14);
    const resultados = conferencia.trechos.flatMap((t: any) =>
      [t.resultadoPorCampo.verbatim_quote.resultado, t.resultadoPorCampo['evidence.quote'].resultado]);
    expect(resultados).not.toContain('nao confere');
  });

  test('as contagens saem dos dados: 165 distintas, nada movido, as quatro preservadas', () => {
    expect(evidencias.porTrecho).toHaveLength(165);
    expect(conferencia.contagens.denominador).toBe(165);
    expect(conferencia.contagens.conferidasAntes).toBe(estado('conferido').length);
    expect(conferencia.contagens.conferidasDepois).toBe(estado('conferido').length);
    expect(conferencia.contagens.pendentesAntes).toBe(estado('pendente').length);
    expect(conferencia.contagens.pendentesDepois).toBe(estado('pendente').length);
    // ⚠ Nenhum total antecipado: continua 4 e 161, e não 7.
    expect(estado('conferido')).toHaveLength(4);
    expect(estado('pendente')).toHaveLength(161);
    expect(conferencia.contagens.movidas).toBe(0);
    expect(conferencia.contagens.asQuatroAnteriores).toHaveLength(4);
    for (const q of conferencia.contagens.asQuatroAnteriores) {
      expect(evidencias.porTrecho[q.indice].conferenciaPublicacao.estado).toBe('conferido');
    }
    // `estado anterior -> estado posterior` por unidade, e sem revogar nada.
    for (const t of conferencia.trechos) {
      const u = evidencias.porTrecho[t.identidade.indiceEmPorTrecho];
      expect(t.resultadoDaUnidade.estadoAnterior).toBe(u.conferenciaPublicacao.estado);
      expect(t.resultadoDaUnidade.estadoPosterior).toBe(u.conferenciaPublicacao.estado);
    }
  });

  test('ausência de avaliação NÃO é registrada como resultado negativo', () => {
    for (const t of conferencia.trechos) {
      const c = t.resultadoDaUnidade.condicoesDaSecao4;
      // ⚠ `false` afirmaria que os textos não correspondem e que a claim não se
      // sustenta. Nada disso foi observado: a publicação não foi aberta.
      for (const chave of ['doisCamposConferem', 'claimSustentada', 'semLocalizadorDivergente']) {
        expect(`${t.identidade.articleId}.${chave}`).toBe(`${t.identidade.articleId}.${chave}`);
        expect(c[chave]).not.toBe(false);
        expect(c[chave].estado).toBe('nao avaliado');
        expect(c[chave].motivo).toBeTruthy();
      }
      // ⚠ Este FOI conferido, sobre `comparacaoDosCampos.iguais`, que não depende
      // da publicação. Continua `true`, e não vira "não avaliado".
      expect(c.semDivergenciaA16).toBe(true);
    }
    // O campo diz por que `false` era errado: afirmaria o que não se observou.
    expect(conferencia.ausenciaNaoEhNegativa).toMatch(/nada disso foi observado/i);
    expect(conferencia.ausenciaNaoEhNegativa).toMatch(/semDivergenciaA16 continua true/i);
  });

  test('os TRÊS indicadores ficam separados, e o histórico não vira liberação atual', () => {
    const i = conferencia.tresIndicadores;
    // 1: contagem histórica, preservada com o alcance de cada época.
    expect(i.contagemHistoricaPreservada.conferidas).toBe(estado('conferido').length);
    expect(i.contagemHistoricaPreservada.pendentes).toBe(estado('pendente').length);
    expect(i.contagemHistoricaPreservada.formanEstaEntreAsQuatro).toBe(true);
    // ⚠ Forman está DENTRO desta revisão, então sobram três anteriores fora dela.
    expect(i.contagemHistoricaPreservada.unidadesAnterioresFORAdestaRevisao).toBe(3);
    expect(i.contagemHistoricaPreservada.detalheForaDestaRevisao).toHaveLength(3);
    expect(i.contagemHistoricaPreservada.alcance).toMatch(/NAO passam automaticamente|não passam automaticamente/i);
    // 2: nenhuma conferência nova foi concluída na rodada anterior.
    expect(i.novasConferenciasNaRodadaAnterior.total).toBe(0);
    // 3: nenhum trecho de C1 demonstra atendimento ao critério atual.
    expect(i.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.total).toBe(0);
    expect(i.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.denominador).toBe(3);
    // ⚠ Os três são indicadores DISTINTOS: 4 conferidas no histórico não é o
    // mesmo que 4 atendendo ao critério atual, e o registro não os confunde.
    expect(i.contagemHistoricaPreservada.conferidas)
      .not.toBe(i.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.total);
  });

  test('o registro declara o alcance do "confere" e a regra de agregação', () => {
    expect(conferencia.alcanceDoConfere).toMatch(/RECORTE/);
    // A frase de alcance exigida: nenhum resultado certifica afirmação futura.
    expect(conferencia.alcanceDoConfere).toMatch(/Nenhum desses resultados certifica/);
    expect(conferencia.regraDeAgregacao).toMatch(/QUATRO condicoes|quatro condições/i);
    expect(conferencia.viasDeAcesso.declaradas)
      .toEqual(['PDF em maos', 'repositorio institucional', 'base assinada', 'sem acesso']);
    // "Não conferido" nomeia a via tentada.
    for (const t of conferencia.trechos) {
      expect(t.resultadoPorCampo.verbatim_quote.motivo).toBe('publicacao inacessivel');
    }
  });
});
