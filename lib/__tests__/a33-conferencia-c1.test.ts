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
const medicao = ler('docs/dados/a33-conferencia-c1/medicao-pdfs.json');

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
    // 3: na rodada sem acesso, nenhum trecho de C1 demonstrava atendimento ao
    // critério atual. ⚠ Esse valor é HISTÓRICO; o atual sai da inspeção posterior.
    expect(i.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.historico[0].total).toBe(0);
    expect(i.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.denominador).toBe(3);
    // ⚠ Os três são indicadores DISTINTOS: 4 conferidas no histórico não é o
    // mesmo que 4 atendendo ao critério atual, e o registro não os confunde.
    expect(i.contagemHistoricaPreservada.conferidas)
      .not.toBe(i.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.total);
  });

  test('a comparação RECEBIDA declara proveniência por afirmação, e não se atribui a esta execução', () => {
    const r = conferencia.comparacaoRecebida;
    expect(r.natureza).toMatch(/REGISTRA UMA COMPARACAO RECEBIDA/);
    expect(r.natureza).toMatch(/NAO consultou as publicacoes/);
    expect(r.natureza).toMatch(/TEXTO EXTRAIDO/);
    // ⚠ Cada afirmação diz quem comparou, que material e em qual sessão.
    expect(r.proveniencia.length).toBeGreaterThanOrEqual(3);
    for (const p of r.proveniencia) {
      expect(Object.keys(p).sort()).toEqual(['afirmacao', 'materialConsultado', 'quemComparou', 'sessao']);
      expect(p.afirmacao && p.quemComparou && p.materialConsultado && p.sessao).toBeTruthy();
    }
    // Os resultados por campo e os dados dos arquivos vêm de OUTRA sessão.
    const deOutra = r.proveniencia.filter((p: any) => /nao esta/.test(p.sessao));
    expect(deOutra.length).toBeGreaterThanOrEqual(2);
    expect(deOutra.some((p: any) => /SHA-256/.test(p.afirmacao))).toBe(true);
    // ⚠ Os valores recebidos ficam preservados COMO RECEBIDOS. O que foi medido
    // depois, na sessão de execução, deixa de ser recebido, e só isso.
    for (const a of r.arquivosConsultados) {
      expect(a.origemDestesValores).toMatch(/Recebidos pelo texto do prompt/);
      expect(a.origemDestesValores).toMatch(/MEDIDOS na sessao de execucao/);
      expect(a.estadoDeVerificacao).toMatch(/^SHA-256, paginas e posicao MEDIDOS na sessao de execucao/);
      expect(a.estadoDeVerificacao).toMatch(/vinculo com a extracao anterior e versao do arquivo AINDA NAO VERIFICADOS/);
      expect(a.localizadorDaOrigem).toMatch(/NAO HA localizador verificavel/);
      // ⚠ Só o FORMATO do resumo é verificado. Correspondência com o PDF, não.
      expect(a.sha256DoArquivo).toMatch(/^[0-9a-f]{64}$/);
      // ⚠ DOI e PII identificam o ARTIGO; o ISSN, o PERIÓDICO. Nenhum deles
      // identifica o arquivo, e a versão do arquivo fica nula.
      expect(a.identificadorDoArtigo).toBeTruthy();
      expect(a.identificadorDoPeriodico).toBeTruthy();
      expect(a.identificadorDaObra).toBeUndefined();
      expect(a.versaoDoArquivoConsultado).toBeNull();
      expect(a.porQueVersaoENula).toMatch(/DOI e PII identificam o ARTIGO, e o ISSN identifica o PERIODICO/);
      expect(a.porQueVersaoENula).toMatch(/Nenhum deles identifica o ARQUIVO/);
      expect(a.versao).toBeUndefined();
    }
    // ⚠ Texto extraído não é a página impressa, e o registro diz isso.
    expect(r.avisoSobreExtracao).toMatch(/NAO E A PAGINA IMPRESSA/);
    expect(r.avisoSobreExtracao).toMatch(/exige inspecao visual/);
  });

  test('a rastreabilidade dos PDFs NÃO é apresentada como demonstrada', () => {
    const n = conferencia.comparacaoRecebida.rastreabilidadeNaoDemonstrada;
    // ⚠ Parcialmente verificado depois; o estado anterior fica registrado.
    expect(n.estado).toMatch(/^PARCIALMENTE VERIFICADO/);
    expect(n.estado).toMatch(/vinculo com a extracao anterior e versao AINDA NAO VERIFICADOS/);
    expect(n.estadoAte99bc69f).toBe('recebido e AINDA NAO VERIFICADO');
    expect(n.localizadorDaOrigem).toMatch(/NAO HA localizador verificavel/);
    // ⚠ Os quatro itens que o registro declara NÃO demonstrados.
    expect(n.oQueNAOestaDemonstrado).toHaveLength(4);
    const juntos = n.oQueNAOestaDemonstrado.join(' | ');
    expect(juntos).toMatch(/SHA-256 corresponde ao arquivo/);
    expect(juntos).toMatch(/pagina impressa declarada ocupa a posicao declarada/);
    expect(juntos).toMatch(/vinculo entre extracao e PDF NAO esta estabelecido/);
    expect(juntos).toMatch(
      /DOI e PII identificam o artigo, o ISSN identifica o periodico, e nenhum deles identifica o arquivo/);
    // ⚠ A aritmética é aritmética, e o registro diz isso.
    expect(n.sobreAAritmetica).toMatch(/valida a SUBTRACAO/);
    expect(n.sobreAAritmetica).toMatch(/NAO demonstra/);
    // ⚠ E o que os testes cobrem está dito, sem sugerir mais do que cobrem.
    expect(n.oQueOsTestesVerificam).toMatch(/NAO verificam correspondencia com os PDFs/);
    // A natureza do bloco avisa antes de qualquer resultado.
    expect(conferencia.comparacaoRecebida.natureza).toMatch(/RASTREABILIDADE DOS PDFs NAO ESTA DEMONSTRADA/);
    // ⚠ Em lugar nenhum o vínculo extração-PDF aparece como estabelecido.
    expect(JSON.stringify(conferencia)).not.toMatch(/vinculado ao PDF/);
  });

  test('o achado de Wijnmalen NÃO é somado às 19 divergências entre campos', () => {
    const w = conferencia.comparacaoRecebida.porTrecho
      .find((t: any) => t.articleId === 'wijnmalen2007_bocr');
    // A redação prescrita, verbatim.
    expect(w.encaminhamento).toContain(
      'Achado adicional encaminhado à A.16, de não correspondência com o texto extraído da publicação.');
    expect(w.encaminhamento).toContain(
      'A contagem histórica das 19 divergências entre campos permanece inalterada.');
    // ⚠ A soma numérica saiu do registro inteiro.
    expect(JSON.stringify(conferencia)).not.toMatch(/se SOMA as 19|soma[m-]?\s*se\s+as\s+19/i);
    // ⚠ E o registro diz POR QUE são critérios diferentes.
    expect(w.porQueNaoSeSomaAs19).toMatch(/CRITERIOS DIFERENTES/);
    expect(w.porQueNaoSeSomaAs19).toMatch(/ENTRE CAMPOS DA BASE/);
    expect(w.porQueNaoSeSomaAs19).toMatch(/os dois campos COINCIDEM entre si/);
    // As 19 continuam sendo 19 nos dados, e nada foi acrescentado a elas.
    expect(evidencias.porTrecho.filter((u: any) => u.comparacaoDosCampos?.iguais === false))
      .toHaveLength(19);
    // O trecho de C1 continua FORA das 19: seus dois campos coincidem.
    const u = evidencias.porTrecho[86];
    expect(u.articleId).toBe('wijnmalen2007_bocr');
    expect(u.comparacaoDosCampos.iguais).toBe(true);
    expect(u.dadosOriginais.verbatim_quote).toBe(u.dadosOriginais.evidence.quote);
  });

  test('página impressa e posição no PDF são campos DISTINTOS, e a conferência é ARITMÉTICA', () => {
    const esperado: Record<string, number[]> = {
      'Saaty 1977': [237, 4, 233],
      'Wijnmalen 2007': [899, 8, 891],
      'Forman e Peniwati 1998': [167, 3, 164],
    };
    for (const a of conferencia.comparacaoRecebida.arquivosConsultados) {
      const [pagina, pdf, dif] = esperado[a.fonte];
      expect(a.paginaImpressa).toBe(pagina);
      expect(a.posicaoNoPdf).toBe(pdf);
      // ⚠ Isto confere a SUBTRAÇÃO sobre os números declarados. NÃO demonstra
      // que a página impressa ocupe aquela posição no arquivo — isso exigiria
      // abrir o PDF, e nenhum instrumento aqui o faz.
      expect(a.paginaImpressa - a.posicaoNoPdf).toBe(dif);
      expect(a.diferencaEntreOsDois).toBe(dif);
    }
    // E o registro declara esse limite, em vez de deixá-lo implícito.
    expect(conferencia.comparacaoRecebida.paginaImpressaNaoEhPosicaoNoPdf)
      .toMatch(/ARITMETICA sobre os numeros declarados/);
    expect(conferencia.comparacaoRecebida.paginaImpressaNaoEhPosicaoNoPdf)
      .toMatch(/NAO demonstra que a pagina impressa ocupe aquela posicao/);
  });

  test('os três resultados recebidos, e o lado da BASE conferido aqui', () => {
    const porId = Object.fromEntries(
      conferencia.comparacaoRecebida.porTrecho.map((t: any) => [t.articleId, t]));
    const unidade = (id: string) => evidencias.porTrecho.find((u: any) => u.articleId === id
      && JSON.stringify(u.enderecoNaBase) === JSON.stringify(porId[id].enderecoNaBase));

    // Forman: confere nos dois campos, claim sustentada, sobre texto extraído.
    const f = porId['forman1998_aggregating'];
    expect(f.resultado.verbatim_quote).toBe('confere');
    expect(f.resultado['evidence.quote']).toBe('confere');
    expect(f.resultado.sustentacaoDaClaim).toBe('sustentada');
    expect(f.alcance).toMatch(/TEXTO EXTRAIDO/);
    expect(f.conferenciaHistorica).toMatch(/PRESERVADA/);
    // ⚠ Medido AQUI, do lado da base: a elisão está sinalizada por reticências.
    expect(unidade('forman1998_aggregating')!.dadosOriginais.verbatim_quote).toContain('...');

    // Wijnmalen: não confere nos dois campos; claim sustentada; unidade pendente.
    const w = porId['wijnmalen2007_bocr'];
    expect(w.resultado.verbatim_quote).toMatch(/^nao confere/);
    expect(w.resultado['evidence.quote']).toMatch(/^nao confere/);
    expect(w.resultado.sustentacaoDaClaim).toBe('sustentada');
    expect(w.unidade).toMatch(/NAO CORRESPONDENCIA TEXTUAL/);
    expect(w.encaminhamento).toMatch(/A\.16/);
    // ⚠ Medido AQUI: o recorte da base realmente não traz `however`. É o lado
    // da comparação que está no repositório; o outro lado veio da extração.
    const textoW = unidade('wijnmalen2007_bocr')!.dadosOriginais.verbatim_quote;
    expect(/however/i.test(textoW)).toBe(false);
    // ⚠ E a base NÃO foi corrigida nesta rodada: o achado só se encaminha.
    expect(textoW).toBe(unidade('wijnmalen2007_bocr')!.dadosOriginais.evidence.quote);

    // Saaty: nada gravado como conclusão; um item único pendente.
    const s = porId['saaty1977_scaling'];
    expect(s.resultado.verbatim_quote).toMatch(/nao conferido/);
    expect(s.resultado['evidence.quote']).toMatch(/nao conferido/);
    expect(s.resultado.sustentacaoDaClaim).toMatch(/^inconclusiva/);
    expect(s.unidade).toBe('pendente');
    expect(s.alcance).toMatch(/NADA aqui se grava como conclusao/);
    expect(s.oQueFalta).toMatch(/inspecionar visualmente a pagina 237/i);
    // ⚠ Medido AQUI: o recorte carrega notação LaTeX, e por isso a comparação
    // literal desse trecho não se resolve por extração.
    expect(unidade('saaty1977_scaling')!.dadosOriginais.verbatim_quote).toContain('\\lambda_{max} = n');
  });

  test('as contagens recebidas seguem históricas: 4 e 161, sem total antecipado e sem subtração', () => {
    const k = conferencia.comparacaoRecebida.contagens;
    expect(k.conferidas).toBe(estado('conferido').length);
    expect(k.pendentes).toBe(estado('pendente').length);
    expect(k.conferidas).toBe(4);
    expect(k.pendentes).toBe(161);
    expect(k.denominador).toBe(165);
    // ⚠ Nenhuma conferência nova é declarada: a leitura foi parcial.
    expect(k.novasConferenciasDeclaradas).toBe(0);
    expect(k.porQueNenhumaNovaConferencia).toMatch(/PARCIAL/);
    expect(k.nota).toMatch(/NAO se convertem em atendimento aos criterios novos/);
    // ⚠ Nenhuma subtração do tipo "158 pela frente" é AFIRMADA. O número só pode
    // aparecer no campo que enuncia a proibição, e em nenhum outro lugar.
    expect(k.semSubtracao).toMatch(/158 pela frente/);
    const semAProibicao = { ...conferencia, comparacaoRecebida: { ...conferencia.comparacaoRecebida,
      contagens: { ...k, semSubtracao: undefined } } };
    expect(JSON.stringify(semAProibicao)).not.toMatch(/158/);
    // ⚠ E nada de anunciar a conferência de C1 como concluída.
    expect(conferencia.comparacaoRecebida.oQueNaoSeAnuncia).toMatch(/NAO se anuncia a conclusao integral/);
    // Na rodada do recebido, o indicador de critério atual continuou 0 de 3:
    // o recebido não o alterou. ⚠ Valor HISTÓRICO daquela rodada.
    expect(conferencia.tresIndicadores.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.historico[0].total).toBe(0);
  });

  test('o registro DATADO da rodada sem acesso não foi substituído', () => {
    // ⚠ Os resultados por campo de `trechos[]` continuam os daquela rodada, e o
    // bloco novo é observação posterior, com proveniência própria.
    for (const t of conferencia.trechos) {
      expect(t.resultadoPorCampo.verbatim_quote.resultado).toBe('nao conferido');
      expect(t.resultadoPorCampo.verbatim_quote.motivo).toBe('publicacao inacessivel');
      expect(t.vejaTambem).toMatch(/comparacaoRecebida/);
      expect(t.vejaTambem).toMatch(/nao foram substituidos/);
    }
  });

  test('o ISSN identifica o PERIÓDICO, e o Saaty fica sem identificador de artigo registrado', () => {
    const porFonte = Object.fromEntries(
      conferencia.comparacaoRecebida.arquivosConsultados.map((a: any) => [a.fonte, a]));
    const s = porFonte['Saaty 1977'];
    expect(s.identificadorDoPeriodico).toBe('ISSN 0022-2496');
    // ⚠ A redação prescrita: o que se afirma é que NÃO ESTÁ REGISTRADO aqui.
    expect(s.identificadorDoArtigo).toBe('identificador de artigo nao registrado');
    expect(s.sobreOIdentificadorDoArtigo).toMatch(/o ISSN NAO ocupa esse lugar/);
    // DOI e PII continuam identificando o artigo.
    expect(porFonte['Wijnmalen 2007'].identificadorDoArtigo).toBe('doi 10.1016/j.mcm.2007.03.020');
    expect(porFonte['Forman e Peniwati 1998'].identificadorDoArtigo).toBe('PII S0377-2217(97)00244-0');
    // ⚠ Nenhum ISSN no lugar de identificador de artigo.
    for (const a of conferencia.comparacaoRecebida.arquivosConsultados) {
      expect(a.identificadorDoArtigo).not.toMatch(/ISSN/);
    }
    const texto = JSON.stringify(conferencia);
    // ⚠ A frase que agrupava os três como identificadores da obra saiu do registro.
    expect(texto).not.toMatch(/DOI, PII e ISSN/);
    // ⚠ E nada afirma ou sugere que o identificador do artigo não exista.
    expect(texto).not.toMatch(/(nao|não) (existe|possui|tem) (identificador|DOI|PII)|inexistente/i);
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

/**
 * ⚠ A medição dos PDFs roda FORA da suíte, porque eles ficam fora do repositório.
 * Estes casos travam a COERÊNCIA do registro da medição com os dados versionados,
 * e o que ele se permite concluir. Não refazem a medição.
 */
describe('A.33: medição dos PDFs na sessão de execução', () => {
  const recebidos: Record<string, any> = Object.fromEntries(
    conferencia.comparacaoRecebida.arquivosConsultados.map((a: any) => [a.fonte, a]));
  const saaty = medicao.inspecaoVisualSaaty237;

  test('recálculo e coincidência do SHA-256 são fatos SEPARADOS, e a coincidência não prova o vínculo', () => {
    expect(medicao.arquivos.map((m: any) => m.fonte).sort()).toEqual(Object.keys(recebidos).sort());
    for (const m of medicao.arquivos) {
      const r = recebidos[m.fonte];
      // Caminho, nome e tamanho de cada arquivo, e o arquivo fica FORA da árvore.
      expect(m.nome).toMatch(/\.pdf$/);
      expect(m.caminho.endsWith(m.nome)).toBe(true);
      expect(m.caminho.startsWith('C:\\AHP-BOCR\\preservado\\')).toBe(true);
      expect(m.tamanhoBytes).toBeGreaterThan(0);
      const h = m.sha256;
      expect(h.recalculadoNestaSessao).toMatch(/^[0-9a-f]{64}$/);
      // ⚠ O valor recebido comparado é o que está no registro, e não um copiado à mão.
      expect(h.valorRecebidoRegistrado).toBe(r.sha256DoArquivo);
      expect(h.coincide).toBe(h.recalculadoNestaSessao === h.valorRecebidoRegistrado);
      expect(h.oQueORecalculoVerifica).toMatch(/EFETIVAMENTE ACESSADO nesta execucao/);
      expect(h.oQueACoincidenciaConfirma).toMatch(/IGUALDADE/);
      expect(h.oQueACoincidenciaConfirma).toMatch(/nada alem disso/);
      expect(h.oQueACoincidenciaNaoDemonstra).toMatch(/extracao anterior/);
      expect(h.oQueACoincidenciaNaoDemonstra).toMatch(/exige evidencia propria ou nova extracao documentada/);
      expect(m.paginas.valorRecebido).toBe(r.paginas);
      expect(m.paginas.coincide).toBe(m.paginas.medido === m.paginas.valorRecebido);
    }
  });

  test('a posição de cada página impressa foi VERIFICADA no arquivo, e não assumida', () => {
    for (const m of medicao.arquivos) {
      const p = m.posicaoDaPaginaImpressa;
      const r = recebidos[m.fonte];
      expect(p.paginaImpressa).toBe(r.paginaImpressa);
      expect(p.valorRecebido).toBe(r.posicaoNoPdf);
      expect(p.coincide).toBe(p.posicaoMedida === p.valorRecebido);
      expect(p.procedimento).toMatch(/leitura, na imagem, do numero impresso/);
      // As vizinhas trazem a página anterior e a seguinte.
      const marca = (pos: number) => p.marcadoresObservados[String(pos)];
      expect(marca(p.posicaoMedida)).toBe(String(p.paginaImpressa));
      expect(marca(p.posicaoMedida - 1)).toBe(String(p.paginaImpressa - 1));
      expect(marca(p.posicaoMedida + 1)).toBe(String(p.paginaImpressa + 1));
      expect(p.alcance).toMatch(/NESTE arquivo/);
      expect(p.alcance).toMatch(/NAO demonstra que a extracao anterior tenha vindo dele/);
    }
  });

  test('Saaty p. 237: impresso, extração e recorte confrontados, sem atribuição forçada', () => {
    expect(saaty.ferramenta).toMatch(/PDFium/);
    expect(saaty.procedimento.length).toBeGreaterThanOrEqual(3);
    // O observado no impresso: a expressão, e a caixa do início.
    expect(saaty.impresso.expressaoMatematica).toMatch(/lambda/);
    expect(saaty.impresso.capitalizacaoDoInicio).toMatch(/MINUSCULA/);
    expect(saaty.impresso.fraseComoImpressa).toMatch(/^It turns out that a reciprocal matrix A /);
    // ⚠ O recorte do registro é o dos dados versionados, e a base NÃO foi corrigida.
    const u = evidencias.porTrecho[saaty.trecho.indiceEmPorTrecho];
    expect(u.articleId).toBe(saaty.trecho.articleId);
    expect(u.enderecoNaBase).toEqual(saaty.trecho.enderecoNaBase);
    expect(u.dadosOriginais.verbatim_quote).toBe(saaty.recorte.texto);
    expect(u.dadosOriginais.evidence.quote).toBe(saaty.recorte.texto);
    expect(saaty.recorte.texto.startsWith('A reciprocal')).toBe(true);
    // A extração é a camada DESTE arquivo, e não se confunde com a da outra sessão.
    expect(saaty.extracao.resultado).toContain('if and only if h max = a (Theorem 1 below)');
    expect(saaty.extracao.alcance).toMatch(/compatibilidade nao e identidade/);
    const origens: string[] = [];
    for (const d of saaty.diferencas) {
      // Cada diferença é confrontada com os TRÊS pontos.
      expect(Object.keys(d.confronto).sort()).toEqual(['extracao', 'impresso', 'recorte']);
      expect(d.transformacoes.length).toBeGreaterThanOrEqual(1);
      let onde: string[];
      if (typeof d.ondeSurgiu === 'string') {
        onde = [d.ondeSurgiu];
      } else {
        // Origem por transformação: uma para cada, nenhuma a mais ou a menos.
        expect(Object.keys(d.ondeSurgiu).sort()).toEqual(d.transformacoes.map((t: any) => t.id).sort());
        onde = Object.values(d.ondeSurgiu);
      }
      for (const o of onde) {
        origens.push(o);
        // ⚠ Sem origem determinável: evidência e pendência, e nenhuma atribuição forçada.
        if (o === 'origem nao determinada') {
          expect(d.evidenciaDisponivel).toBeTruthy();
          expect(d.pendencia).toBeTruthy();
        }
      }
    }
    expect(origens).toContain('origem nao determinada');
    // ⚠ A expressão tem mais de uma transformação, e todas constam.
    const expressao = saaty.diferencas.find((d: any) => d.onde === 'expressao matematica');
    expect(expressao.transformacoes.map((t: any) => t.id)).toEqual(['D2.a', 'D2.b', 'D2.c', 'D2.d']);
    const inicio = saaty.diferencas.find((d: any) => d.onde === 'inicio do trecho');
    expect(inicio.transformacoes.some((t: any) => /caixa/.test(t.natureza))).toBe(true);
  });

  test('Saaty p. 237: vocabulário vigente, unidade pendente, e as contagens não mudam', () => {
    const vocabulario = ['confere', 'confere com localizador divergente', 'nao confere', 'nao conferido, com motivo'];
    expect(saaty.classificacao.vocabulario).toEqual(vocabulario);
    for (const campo of ['verbatim_quote', 'evidence.quote']) {
      // ⚠ Nenhuma categoria nova; a natureza da diferença vai no motivo.
      expect(vocabulario).toContain(saaty.classificacao[campo].resultado);
      expect(saaty.classificacao[campo].motivo).toMatch(/caixa|D1\.b/);
    }
    expect(saaty.classificacao.nenhumaCategoriaNova).toBe(true);
    expect(['sustentada', 'parcialmente sustentada', 'nao sustentada', 'inconclusiva'])
      .toContain(saaty.sustentacaoDaClaim.resultado);
    const u = evidencias.porTrecho[saaty.trecho.indiceEmPorTrecho];
    expect(saaty.sustentacaoDaClaim.claim).toBe(u.dadosOriginais.claim);
    // A regra de agregação, aplicada às condições observadas.
    const c = saaty.resultadoDaUnidade.condicoesDaSecao4;
    const r = saaty.classificacao;
    expect(c.doisCamposConferem).toBe(r.verbatim_quote.resultado === 'confere' && r['evidence.quote'].resultado === 'confere');
    expect(c.claimSustentada).toBe(saaty.sustentacaoDaClaim.resultado === 'sustentada');
    expect(c.semLocalizadorDivergente).toBe(r.localizador.resultado === 'compativel');
    const todas = c.doisCamposConferem && c.claimSustentada && c.semDivergenciaA16 && c.semLocalizadorDivergente;
    expect(saaty.resultadoDaUnidade.estadoPosterior).toBe(todas ? 'conferido' : 'pendente');
    // ⚠ Os dados versionados não mudaram de estado, e as contagens são as de antes.
    expect(u.conferenciaPublicacao.estado).toBe(saaty.resultadoDaUnidade.estadoAnterior);
    expect(medicao.contagens.conferidas).toBe(estado('conferido').length);
    expect(medicao.contagens.pendentes).toBe(estado('pendente').length);
    expect(medicao.contagens.movidas).toBe(0);
    // ⚠ Fora das 19, pela redação vigente, e as 19 seguem 19.
    expect(saaty.resultadoDaUnidade.encaminhamento)
      .toContain('A contagem histórica das 19 divergências entre campos permanece inalterada.');
    expect(saaty.resultadoDaUnidade.porQueNaoSeSomaAs19).toMatch(/CRITERIOS DIFERENTES/);
    expect(evidencias.porTrecho.filter((x: any) => x.comparacaoDosCampos?.iguais === false)).toHaveLength(19);
    // ⚠ O indicador da rodada de Saaty é o HISTÓRICO daquela rodada.
    expect(medicao.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.total)
      .toBe(conferencia.tresIndicadores.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.historico[1].total);
  });

  test('só o medido deixa de ser recebido, e a conclusão integral de C1 não se anuncia', () => {
    const r = conferencia.comparacaoRecebida;
    for (const a of r.arquivosConsultados) {
      const m = medicao.arquivos.find((x: any) => x.fonte === a.fonte);
      expect(a.medicaoPosterior.registro).toBe('docs/dados/a33-conferencia-c1/medicao-pdfs.json');
      expect(a.medicaoPosterior.sha256Coincide).toBe(m.sha256.coincide);
      expect(a.medicaoPosterior.paginasCoincidem).toBe(m.paginas.coincide);
      expect(a.medicaoPosterior.posicaoCoincide).toBe(m.posicaoDaPaginaImpressa.coincide);
      expect(a.medicaoPosterior.alcance).toMatch(/NAO demonstra que a extracao anterior/);
    }
    const n = r.rastreabilidadeNaoDemonstrada;
    expect(n.verificadoNaSessaoDeExecucao).toHaveLength(3);
    // ⚠ O vínculo com a extração anterior continua NÃO demonstrado.
    expect(n.oQueNAOestaDemonstrado.join(' | ')).toMatch(/vinculo entre extracao e PDF NAO esta estabelecido/);
    expect(medicao.estadoDeVerificacaoPorArquivo.continuaComoEstava.join(' | '))
      .toMatch(/vinculo entre a extracao da outra sessao/);
    // ⚠ NA RODADA DE SAATY, Wijnmalen e Forman não ganharam confirmação visual do
    // TEXTO. É o registro histórico daquela rodada; a inspeção deles é posterior.
    for (const f of ['Wijnmalen 2007', 'Forman e Peniwati 1998']) {
      expect(medicao.arquivos.find((x: any) => x.fonte === f).textoNaoInspecionado).toMatch(/NAO foi inspecionado/);
    }
    expect(r.oQueNaoSeAnuncia).toMatch(/Wijnmalen tem nao correspondencia textual observada NA EXTRACAO/);
    expect(medicao.oQueNaoSeAnuncia).toMatch(/NAO se anuncia a conclusao integral/);
    // O bloco recebido de Saaty fica preservado, com ponteiro para a inspeção.
    const s = r.porTrecho.find((t: any) => t.articleId === 'saaty1977_scaling');
    expect(s.alcance).toMatch(/NADA aqui se grava como conclusao/);
    expect(s.inspecaoPosterior).toMatch(/medicao-pdfs\.json/);
  });
});

/**
 * ⚠ A inspeção de Wijnmalen p. 899 e Forman p. 167 roda FORA da suíte, porque os
 * PDFs ficam fora do repositório. Estes casos travam a coerência do registro com
 * os dados versionados, e o que ele se permite concluir.
 */
describe('A.33: inspeção visual de Wijnmalen p. 899 e Forman p. 167', () => {
  const inspecao = ler('docs/dados/a33-conferencia-c1/inspecao-wijnmalen-forman.json');
  const porArticle: Record<string, any> = Object.fromEntries(
    inspecao.trechos.map((t: any) => [t.identidade.articleId, t]));
  const w = porArticle['wijnmalen2007_bocr'];
  const f = porArticle['forman1998_aggregating'];
  const vocabulario = ['confere', 'confere com localizador divergente', 'nao confere', 'nao conferido, com motivo'];
  const estados = ['sustentada', 'parcialmente sustentada', 'nao sustentada', 'inconclusiva'];
  const todas = (c: any) => c.doisCamposConferem && c.claimSustentada && c.semDivergenciaA16 && c.semLocalizadorDivergente;

  test('os dois SHA-256 foram recalculados, e a nova extração se vincula a eles', () => {
    expect(inspecao.arquivos.map((a: any) => a.fonte).sort()).toEqual(['Forman e Peniwati 1998', 'Wijnmalen 2007']);
    for (const a of inspecao.arquivos) {
      const m = medicao.arquivos.find((x: any) => x.fonte === a.fonte);
      expect(a.sha256Recalculado).toMatch(/^[0-9a-f]{64}$/);
      // ⚠ O registrado vem da rodada anterior, e não de cópia à mão.
      expect(a.sha256Registrado).toBe(m.sha256.recalculadoNestaSessao);
      expect(a.sha256Coincide).toBe(a.sha256Recalculado === a.sha256Registrado);
      // ⚠ Hash divergente para a conferência daquele arquivo.
      const trechosDoArquivo = inspecao.trechos.filter((t: any) => t.arquivo.fonte === a.fonte);
      if (!a.sha256Coincide) {
        expect(a.conferencia).toMatch(/INTERROMPIDA/);
        expect(trechosDoArquivo).toHaveLength(0);
      }
      for (const t of trechosDoArquivo) {
        expect(t.arquivo.sha256).toBe(a.sha256Recalculado);
        // A extração é uma TERCEIRA coisa, vinculada a este hash.
        expect(t.extracao.natureza).toMatch(/TERCEIRA coisa/);
        expect(t.extracao.natureza).toContain(a.sha256Recalculado);
        expect(t.extracao.vias.length).toBeGreaterThanOrEqual(2);
        // A página e a posição são as verificadas antes, no mesmo arquivo.
        expect(t.arquivo.paginaImpressa).toBe(m.posicaoDaPaginaImpressa.paginaImpressa);
        expect(t.arquivo.posicao).toBe(m.posicaoDaPaginaImpressa.posicaoMedida);
      }
    }
    expect(inspecao.proveniencia).toMatch(/proveniencia PROPRIA/);
    expect(inspecao.proveniencia).toMatch(/NAO e pre-requisito/);
  });

  test('o procedimento respeita o TIPO de cada arquivo', () => {
    expect(w.tipoDoArquivo).toMatch(/texto vetorial VISIVEL/);
    expect(w.procedimento.passos.join(' ')).toMatch(/NAO se aplica exclusao de camada/);
    expect(w.procedimento.passos.join(' ')).toMatch(/E a pagina a inspecionar/);
    expect(f.tipoDoArquivo).toMatch(/DIGITALIZACAO com camada OCR/);
    expect(f.procedimento.passos.join(' ')).toMatch(/modo 3, invisivel/);
    expect(f.procedimento.passos.join(' ')).toMatch(/A imagem olhada e a digitalizacao/);
    for (const t of inspecao.trechos) {
      expect(t.procedimento.ferramenta).toMatch(/PDFium/);
      expect(t.procedimento.imagens.paragrafo).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test('o PARÁGRAFO COMPLETO foi lido, e o que foi além dele tem localizador', () => {
    for (const t of inspecao.trechos) {
      expect(t.impresso.paragrafoCompleto).toBeTruthy();
      expect(t.leituraAlemDoParagrafo.length).toBeGreaterThanOrEqual(1);
      for (const l of t.leituraAlemDoParagrafo) {
        expect(l.localizador).toMatch(/p\. \d+/);
        expect(l.porQue).toBeTruthy();
      }
    }
    // A remissão "As was shown earlier" leva à Tabela 6, e isso está registrado.
    expect(w.leituraAlemDoParagrafo.some((l: any) => /Tabela 6/.test(l.localizador))).toBe(true);
    // O impresso traz o que o recorte perdeu, e o recorte não o traz.
    expect(w.impresso.fraseComoImpressa).toMatch(/^Synthesis however requires/);
    expect(w.impresso.fraseComoImpressa).toContain(
      'requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship between');
    expect(w.recorte.texto).not.toMatch(/however/i);
    expect(f.impresso.segundoSegmentoComoImpresso).toBe('Thus, for AIJ, the geometric mean must be used.');
    expect(f.impresso.tipografia).toMatch(/must em ITALICO/);
  });

  test('os dois campos e a sustentação ficam SEPARADOS, nos estados vigentes, sem condição suprida', () => {
    for (const t of inspecao.trechos) {
      const u = evidencias.porTrecho[t.identidade.indiceEmPorTrecho];
      expect(u.articleId).toBe(t.identidade.articleId);
      expect(u.enderecoNaBase).toEqual(t.identidade.enderecoNaBase);
      // ⚠ O recorte é o dos dados versionados, e a base NÃO foi corrigida.
      expect(u.dadosOriginais.verbatim_quote).toBe(t.recorte.texto);
      expect(u.dadosOriginais.evidence.quote).toBe(t.recorte.texto);
      for (const campo of ['verbatim_quote', 'evidence.quote']) {
        expect(vocabulario).toContain(t.classificacao[campo].resultado);
        expect(t.classificacao[campo].motivo).toBeTruthy();
      }
      expect(t.classificacao.nenhumaCategoriaNova).toBe(true);
      // ⚠ Só os quatro estados; domínio e condição vão na justificativa.
      expect(estados).toContain(t.sustentacaoDaClaim.resultado);
      expect(t.sustentacaoDaClaim.claim).toBe(u.dadosOriginais.claim);
      expect(t.sustentacaoDaClaim.naoSupridoPeloAvaliador).toMatch(/NAO acrescentou/);
    }
    expect(w.classificacao.verbatim_quote.resultado).toBe('nao confere');
    expect(w.sustentacaoDaClaim.resultado).toBe('parcialmente sustentada');
    // ⚠ A ressalva aparece na SUSTENTAÇÃO, na redação prescrita, e não na correspondência.
    const ws = w.sustentacaoDaClaim;
    expect(ws.condicaoOmitidaPelaClaim).toBe(
      'A claim exige comensurabilidade das prioridades dos fatores antes de qualquer síntese, enquanto o '
      + 'artigo admite um quociente significativo quando os produtos têm unidades compatíveis, sem exigir '
      + 'que os quatro totais sejam individualmente iguais.');
    expect(w.classificacao.verbatim_quote.motivo).not.toMatch(/Tabela 6|produto/);
    // ⚠ Ordenação correta não é resultado integralmente válido, e os produtos iguais
    // não dispensam comensurabilidade: ficam na mesma unidade.
    expect(ws.sobreATabela6).toMatch(/SEPARA ordenacao de indicacao de rentabilidade/);
    expect(ws.sobreATabela6).toMatch(/Ordenacao correta NAO equivale a resultado BOCR integralmente valido/);
    expect(ws.fundamentoNoTexto).toMatch(/NAO dispensa toda comensurabilidade/);
    expect(ws.fundamentoNoTexto).toMatch(/PRODUTOS ficam na mesma unidade/);
    expect(ws.sobreGuarantee).toMatch(/nao significa que nenhum caso particular possa funcionar/);
    expect(ws.sobreGuarantee).toMatch(/formulacao INDISCRIMINADA da exigencia para os fatores/);
    expect(ws.independenciaDosCampos).toMatch(/INDEPENDE/);
    // Os dois argumentos retirados não voltam.
    expect(JSON.stringify(ws)).not.toMatch(/sempre da a ordenacao|SEM que as prioridades|omite esses casos/);
    expect(f.classificacao.verbatim_quote.resultado).toBe('confere');
    expect(f.sustentacaoDaClaim.resultado).toBe('sustentada');
    // ⚠ O confere se sustenta pelo must que PERMANECE, e não pela claim.
    expect(f.classificacao.verbatim_quote.motivo).toMatch(/must PERMANECE, preservando a obrigacao expressa pelo autor/);
    expect(f.classificacao.decisaoSobreAEnfase).toMatch(/NESTE recorte/);
    expect(f.classificacao.decisaoSobreAEnfase).toMatch(/NAO regra geral de que enfase tipografica nunca carrega significado/);
    expect(f.classificacao.pontoDeCriterio).toBeUndefined();
    expect(f.classificacao.verbatim_quote.motivo).not.toMatch(/strictly|claim/);
    expect(f.sustentacaoDaClaim.oQueSustenta).not.toMatch(/strictly/);
    // ⚠ Nenhum ponto de critério segue pendente.
    expect(inspecao.oQueNaoSeAnuncia).toMatch(/Nao ha decisao de criterio pendente/);
    expect(inspecao.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.dependeDe).toBeUndefined();
    // ⚠ Saaty: só a justificativa muda, e o resultado segue não confere pela caixa.
    const criterioSaaty = medicao.inspecaoVisualSaaty237.classificacao.criterioAplicado;
    expect(criterioSaaty).toContain(
      'A conversão para LaTeX é uma representação equivalente escolhida, aceita porque preserva os símbolos '
      + 'e a relação matemática, com a transformação declarada.');
    expect(criterioSaaty).toMatch(/Nao ha decisao pendente/);
    expect(medicao.inspecaoVisualSaaty237.classificacao.verbatim_quote.resultado).toBe('nao confere');
    // ⚠ A alegação de impossibilidade do meio não aparece em nenhum dos três registros.
    for (const r of [medicao, inspecao, conferencia]) {
      expect(JSON.stringify(r)).not.toMatch(/reproduz sub[ií]ndice|qualquer texto plano|texto plano ele se perde/);
    }
  });

  test('cada diferença contra os TRÊS pontos, com todas as transformações e sem origem forçada', () => {
    const origens: string[] = [];
    for (const t of inspecao.trechos) {
      for (const d of t.diferencas) {
        expect(Object.keys(d.confronto).sort()).toEqual(['extracao', 'impresso', 'recorte']);
        expect(Object.keys(d.ondeSurgiu).sort()).toEqual(d.transformacoes.map((x: any) => x.id).sort());
        for (const o of Object.values<string>(d.ondeSurgiu)) {
          origens.push(o);
          if (o === 'origem nao determinada') {
            expect(d.evidenciaDisponivel).toBeTruthy();
            expect(d.pendencia).toBeTruthy();
          }
        }
      }
    }
    expect(origens).toContain('origem nao determinada');
    // ⚠ Duas transformações no início do trecho de Wijnmalen, e as duas constam.
    const inicio = w.diferencas.find((d: any) => d.onde === 'inicio do trecho');
    expect(inicio.transformacoes.map((x: any) => x.id)).toEqual(['W1.a', 'W1.b']);
    // ⚠ A datação afasta uma EXECUÇÃO, e não o uso anterior do mesmo PDF.
    expect(inicio.evidenciaDisponivel).toMatch(/NAO afasta que este mesmo PDF/);
    expect(f.diferencas.map((d: any) => d.transformacoes[0].id)).toEqual(['F1.a', 'F2.a', 'F3.a']);
    // ⚠ Nenhuma diferença, nos dois registros, atribui a transformação à v3.0 ou a
    // uma extração datada: a origem segue não determinada até haver evidência do percurso.
    const diferencas = [...inspecao.trechos.flatMap((t: any) => t.diferencas),
      ...medicao.inspecaoVisualSaaty237.diferencas];
    expect(JSON.stringify(diferencas)).not.toMatch(/v3\.0|fevereiro|extrator|criacao da base/);
    // A repetição em key_claims[3] demonstra repetição, e não a origem.
    const rep = w.alcanceObservadoNaBase.oQueARepeticaoDemonstra;
    expect(rep).toMatch(/REPETICAO DA DIVERGENCIA/);
    expect(rep).toMatch(/NAO demonstra que a extracao v3\.0 a produziu/);
    expect(rep).toMatch(/reutilizacao ou outra transformacao intermediaria/);
    expect(rep).toMatch(/NAO DETERMINADA/);
  });

  test('agregação, contagens e indicador saem da medição, e C1 não se anuncia liberado', () => {
    for (const t of inspecao.trechos) {
      const c = t.resultadoDaUnidade.condicoesDaSecao4;
      const r = t.classificacao;
      expect(c.doisCamposConferem).toBe(r.verbatim_quote.resultado === 'confere' && r['evidence.quote'].resultado === 'confere');
      expect(c.claimSustentada).toBe(t.sustentacaoDaClaim.resultado === 'sustentada');
      expect(c.semLocalizadorDivergente).toBe(r.localizador.resultado === 'compativel');
      expect(t.resultadoDaUnidade.estadoPosterior).toBe(todas(c) ? 'conferido' : 'pendente');
      // ⚠ Os dados versionados não mudaram de estado.
      expect(evidencias.porTrecho[t.identidade.indiceEmPorTrecho].conferenciaPublicacao.estado)
        .toBe(t.resultadoDaUnidade.estadoAnterior);
    }
    expect(inspecao.contagens.conferidas).toBe(estado('conferido').length);
    expect(inspecao.contagens.pendentes).toBe(estado('pendente').length);
    expect(inspecao.contagens.movidas).toBe(0);
    // O indicador é a soma do que as três inspeções observaram, nada antecipado.
    const atendem = inspecao.trechos.filter((t: any) => todas(t.resultadoDaUnidade.condicoesDaSecao4))
      .map((t: any) => `${t.identidade.articleId} key_claims[${t.identidade.enderecoNaBase.indiceBaseZero}]`);
    const saatyAtende = todas(medicao.inspecaoVisualSaaty237.resultadoDaUnidade.condicoesDaSecao4);
    const ind = inspecao.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual;
    expect(ind.total).toBe(atendem.length + (saatyAtende ? 1 : 0));
    expect(ind.quais).toEqual(atendem);
    const atual = conferencia.tresIndicadores.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual;
    expect(atual.total).toBe(ind.total);
    expect(atual.historico[atual.historico.length - 1].total).toBe(ind.total);
    // ⚠ Fora das 19, e as 19 seguem 19.
    expect(w.resultadoDaUnidade.encaminhamento)
      .toContain('A contagem histórica das 19 divergências entre campos permanece inalterada.');
    const divergentes = evidencias.porTrecho.filter((x: any) => x.comparacaoDosCampos?.iguais === false);
    expect(divergentes).toHaveLength(19);
    // O alcance observado na base, medido nos dados: o mesmo texto em key_claims[3].
    const u89 = evidencias.porTrecho[89];
    expect(u89.articleId).toBe('wijnmalen2007_bocr');
    expect(u89.enderecoNaBase.indiceBaseZero).toBe(3);
    expect(u89.dadosOriginais.evidence.quote).toBe(w.recorte.texto);
    expect(divergentes).toContain(u89);
    expect(w.alcanceObservadoNaBase.comoFicaRegistrado).toMatch(/NAO foi conferida/);
    expect(inspecao.oQueNaoSeAnuncia).toMatch(/NAO se anuncia C1 como liberado/);
  });

  test('a pendência técnica fica SEPARADA, como comportamento observado e sem causa estabelecida', () => {
    const p = inspecao.pendenciaTecnica.testesIntermitentes;
    expect(p.causa).toMatch(/NAO ESTABELECIDA/);
    expect(p.causa).toMatch(/nao estabelece sozinho a causa/);
    expect(p.comportamentoObservado).toMatch(/5000 ms/);
    const fonte = fs.readFileSync(path.join(raiz, p.suite), 'utf8');
    expect(p.casos).toHaveLength(2);
    for (const caso of p.casos) {
      // Os dois casos existem na suíte nomeada, com esse nome.
      expect(fonte).toContain(caso.split(' › ')[1]);
    }
    expect(inspecao.pendenciaTecnica.naoAlterado).toMatch(/os dois testes intermitentes/);
    // ⚠ Separada dos resultados bibliográficos.
    expect(JSON.stringify(inspecao.trechos)).not.toMatch(/rag-diagnostico|intermitente/);
  });
});
