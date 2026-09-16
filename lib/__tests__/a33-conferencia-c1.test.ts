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
    // ⚠ Nenhum valor de arquivo é apresentado como medido nem como verificado.
    for (const a of r.arquivosConsultados) {
      expect(a.origemDestesValores).toMatch(/NAO medidos nesta execucao e NAO verificados/);
      expect(a.estadoDeVerificacao).toBe('recebido e AINDA NAO VERIFICADO');
      expect(a.localizadorDaOrigem).toMatch(/NAO HA localizador verificavel/);
      // ⚠ Só o FORMATO do resumo é verificado. Correspondência com o PDF, não.
      expect(a.sha256DoArquivo).toMatch(/^[0-9a-f]{64}$/);
      // ⚠ DOI, PII e ISSN identificam a OBRA. A versão do arquivo fica nula.
      expect(a.identificadorDaObra).toBeTruthy();
      expect(a.versaoDoArquivoConsultado).toBeNull();
      expect(a.porQueVersaoENula).toMatch(/identificam a OBRA/);
      expect(a.versao).toBeUndefined();
    }
    // ⚠ Texto extraído não é a página impressa, e o registro diz isso.
    expect(r.avisoSobreExtracao).toMatch(/NAO E A PAGINA IMPRESSA/);
    expect(r.avisoSobreExtracao).toMatch(/exige inspecao visual/);
  });

  test('a rastreabilidade dos PDFs NÃO é apresentada como demonstrada', () => {
    const n = conferencia.comparacaoRecebida.rastreabilidadeNaoDemonstrada;
    expect(n.estado).toBe('recebido e AINDA NAO VERIFICADO');
    expect(n.localizadorDaOrigem).toMatch(/NAO HA localizador verificavel/);
    // ⚠ Os quatro itens que o registro declara NÃO demonstrados.
    expect(n.oQueNAOestaDemonstrado).toHaveLength(4);
    const juntos = n.oQueNAOestaDemonstrado.join(' | ');
    expect(juntos).toMatch(/SHA-256 corresponde ao arquivo/);
    expect(juntos).toMatch(/pagina impressa declarada ocupa a posicao declarada/);
    expect(juntos).toMatch(/vinculo entre extracao e PDF NAO esta estabelecido/);
    expect(juntos).toMatch(/DOI, PII e ISSN identificam a obra e nao o arquivo/);
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
    // O indicador de critério atual continua 0 de 3, apesar do recebido.
    expect(conferencia.tresIndicadores.trechosDeC1ComAtendimentoDemonstradoAoCriterioAtual.total).toBe(0);
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
