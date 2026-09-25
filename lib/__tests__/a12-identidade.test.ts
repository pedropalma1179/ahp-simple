/**
 * lib/__tests__/a12-identidade.test.ts
 *
 * A.12: **existe identidade de quem participou do cálculo?**
 *
 * ⚠ **Rodada de INVESTIGAÇÃO. Lê e mede, e não altera produção.** Nenhuma geração
 * de parecer, nenhuma reingestão, nenhuma chamada externa.
 *
 * ⚠ **O relato separa três coisas, e este arquivo também:** o que está no
 * **arquivo histórico**; o que a **execução observada** do handler real produz; e o
 * que foi apenas **lido no código**. **Leitura de código não é execução observada.**
 *
 * ⚠ **Nenhuma identidade é reconstruída por posição nem por contagem.** Onde o
 * vínculo falta, o registro diz `NAO DETERMINADO`.
 *
 * O Firestore entra por duplo, no mesmo padrão de `calculate-route.test.ts`, e o
 * `setDoc` é espionado: é o que permite afirmar o que o documento gravado carrega.
 */

export {};

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const ARTEFATO = path.join(RAIZ, 'docs', 'dados', 'a12-identidade', 'medicao.json');
const GRAVAR = process.env.A12ID_GRAVAR === '1';
const COMMIT_DA_BASE = '7157db89ff0fe102bbd36e7d5bc7c4378ab48c67';

const sha256 = (b: Buffer | string) =>
  crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : b).digest('hex');
const shaArquivo = (rel: string) => sha256(fs.readFileSync(path.join(RAIZ, rel)));

const HISTORICO = 'docs/calculations-13jul2026.json';
const ROTA_CALCULO = 'app/api/calculate/route.ts';
const AGREGACAO = 'lib/aggregation.ts';
const COMPLETUDE = 'lib/completeness.ts';

// ---------------------------------------------------------------------------
// Firestore simulado. ⚠ É duplo de TESTE, e não caminho de produção.
// ---------------------------------------------------------------------------

type Doc = { id: string; data: Record<string, unknown> };
const store: Record<string, Doc[]> = { projects: [], respondents: [], responses: [] };
const setDocSpy = jest.fn();

jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));

jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __col: name }),
  query: (ref: unknown) => ref,
  where: (field: string, _op: string, value: unknown) => ({ field, value }),
  doc: (_db: unknown, col: string, id: string) => ({ __col: col, __id: id }),
  getDoc: async (ref: { __col: string; __id: string }) => {
    const achado = store[ref.__col]?.find(d => d.id === ref.__id);
    return { exists: () => Boolean(achado), id: ref.__id, data: () => achado?.data };
  },
  getDocs: async (ref: { __col: string }) => {
    const docs = (store[ref.__col] ?? []).map(d => ({ id: d.id, data: () => d.data }));
    return { docs, size: docs.length };
  },
  setDoc: (...args: unknown[]) => {
    setDocSpy(...args);
    return Promise.resolve();
  },
}));

// Os imports do código real vêm DEPOIS dos duplos.
/* eslint-disable @typescript-eslint/no-var-requires */
const { POST } = require('@/app/api/calculate/route');
const { aggregateMatrix } = require('@/lib/aggregation');
const { checkResponseCompleteness, describeIncompleteness } = require('@/lib/completeness');
const fixture = require('./fixtures/panel-2026.json');
/* eslint-enable @typescript-eslint/no-var-requires */

// ---------------------------------------------------------------------------
// Montagem dos cenários
// ---------------------------------------------------------------------------

const PROJETO = 'projeto-a12-identidade';
const ALTERNATIVAS = [
  { code: 'A1', name: 'Alternativa um', description: '' },
  { code: 'A2', name: 'Alternativa dois', description: '' },
];

/** Os 72 julgamentos de cada respondente do painel de referência. */
const JULGAMENTOS: any[][] = (fixture as any).responses.map((r: any) => r.judgments);

/**
 * Identificadores DISTINTOS dos códigos do instrumento (A1, A2, B1..R5), para que
 * a busca por identidade no documento gravado não case por acaso.
 */
const idAlfa = (i: number) => `ident-alfa-${String(i).padStart(2, '0')}`;
const idBeta = (i: number) => `ident-beta-${String(i).padStart(2, '0')}`;

type Entrada = { docId: string; respondentId?: string; judgments: any[]; completedAt?: string };

function montarStore(cadastrados: string[], respostas: Entrada[]) {
  store.projects = [
    { id: PROJETO, data: { name: 'Painel de investigação', description: '', alternatives: ALTERNATIVAS } },
  ];
  store.respondents = cadastrados.map(id => ({ id, data: { projectId: PROJETO } }));
  store.responses = respostas.map(r => ({
    id: r.docId,
    data: {
      projectId: PROJETO,
      ...(r.respondentId === undefined ? {} : { respondentId: r.respondentId }),
      judgments: r.judgments,
      ...(r.completedAt === undefined ? {} : { completedAt: r.completedAt }),
    },
  }));
}

const pedir = (body: Record<string, unknown> = { projectId: PROJETO }) =>
  POST({ json: async () => body } as any);

const copia = (x: any) => JSON.parse(JSON.stringify(x));

/** Remove um par de um conjunto de julgamentos, deixando a matriz incompleta. */
function mutilar(julgamentos: any[]): any[] {
  const j = copia(julgamentos);
  const i = j.findIndex((x: any) => x.type === 'subcriteria' && x.group === 'O' && x.itemA === 'O1' && x.itemB === 'O2');
  if (i < 0) throw new Error('par de referência não encontrado no fixture');
  j.splice(i, 1);
  return j;
}

// ---------------------------------------------------------------------------
// A medição
// ---------------------------------------------------------------------------

let M: any;

beforeAll(async () => {
  // ==== 1. O ARQUIVO HISTÓRICO ====
  const hist = JSON.parse(fs.readFileSync(path.join(RAIZ, HISTORICO), 'utf8'));
  const chaves = new Set<string>();
  const folhas: [string, any][] = [];
  const andar = (o: any, p = '') => {
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      for (const [k, v] of Object.entries(o)) { chaves.add(k); andar(v, `${p}.${k}`); }
    } else if (Array.isArray(o)) {
      o.forEach((v, i) => andar(v, `${p}[${i}]`));
    } else {
      folhas.push([p, o]);
    }
  };
  andar(hist);
  const pareceIdentificador = folhas.filter(
    ([, v]) => typeof v === 'string' && (/^[A-Za-z0-9_-]{16,28}$/.test(v) || v.includes('@'))
  );
  const arquivoHistorico = {
    caminho: HISTORICO,
    sha256: shaArquivo(HISTORICO),
    chavesDistintas: chaves.size,
    folhas: folhas.length,
    temDadosIndividuais: false,
    oQueTem: {
      responseCount: hist.responseCount,
      projectId: hist.projectId,
      calculatedAt: hist.calculatedAt,
      'metadata.excludedRespondentIds': hist.metadata?.excludedRespondentIds,
      matrizesAgregadas: Object.keys(hist.aggregatedMatrices ?? {}),
      'ipcMetadata.hasIncompleteGroups': hist.ipcMetadata?.hasIncompleteGroups,
      'ipcMetadata.version': hist.ipcMetadata?.version,
    },
    oQueNaoTem: {
      listaDeRespondentes: !('respondents' in hist) && !('qualityAnalysis' in hist),
      matrizesPorRespondente: true,
      'metadata.rejectedIncomplete': hist.metadata?.rejectedIncomplete === undefined,
      identificadorDeRespondenteEmQualquerCampo: true,
    },
    valoresComCaraDeIdentificador: pareceIdentificador.map(([p, v]) => ({ caminho: p, valor: v })),
    completudeQueRegistra: {
      onde: 'ipcMetadata.<grupo>.completeness',
      oQueE: 'dado e possivel da MATRIZ AGREGADA, por grupo',
      oQueNaoE: '⚠ NAO e completude por respondente: nao ha um so campo por unidade',
      medido: Object.fromEntries(
        Object.entries(hist.ipcMetadata?.subcriteria ?? {}).map(([g, v]: any) => [g, v.completeness])
      ),
    },
    vinculoComAsMatrizes:
      'as matrizes de aggregatedMatrices sao strings JSON de matrizes JA agregadas; nao ha campo que ligue celula a respondente',
  };

  // ==== 2. A EXECUÇÃO OBSERVADA: os quatro conjuntos ====
  // Cadastrados: doze com resposta completa, um sem resposta, um com resposta não
  // concluída. Mais uma resposta órfã, uma duplicada e uma incompleta.
  const cadastrados = [...JULGAMENTOS.map((_, i) => idAlfa(i + 1)), 'ident-alfa-13', 'ident-alfa-14'];
  const respostas: Entrada[] = JULGAMENTOS.map((j, i) => ({
    docId: `doc-${i + 1}`,
    respondentId: idAlfa(i + 1),
    judgments: i === 6 ? mutilar(j) : copia(j), // o sétimo fica incompleto
    completedAt: `2026-05-0${(i % 9) + 1}T12:00:00.000Z`,
  }));
  respostas.push({
    docId: 'doc-dup', respondentId: idAlfa(3), judgments: copia(JULGAMENTOS[2]),
    completedAt: '2026-06-01T12:00:00.000Z', // mais recente: a deduplicação fica com esta
  });
  respostas.push({
    docId: 'doc-orfa', respondentId: 'ident-orfao-99', judgments: copia(JULGAMENTOS[0]),
    completedAt: '2026-05-02T12:00:00.000Z',
  });
  respostas.push({ docId: 'doc-sem-fim', respondentId: 'ident-alfa-14', judgments: copia(JULGAMENTOS[1]) });

  montarStore(cadastrados, respostas);
  setDocSpy.mockClear();
  const excluidoPeloGestor = idAlfa(2);
  const res = await pedir({ projectId: PROJETO, excludedRespondentIds: [excluidoPeloGestor] });
  const corpo = await res.json();
  const gravado = setDocSpy.mock.calls[0]?.[1] as any;

  // Quem a instrumentação SABE ter entrado, por construção da entrada.
  const utilizadosPelaConstrucao = JULGAMENTOS
    .map((_, i) => idAlfa(i + 1))
    .filter(id => id !== excluidoPeloGestor && id !== idAlfa(7));

  const serializado = JSON.stringify(gravado);
  const execucaoObservada = {
    comoFoiExercitado:
      'handler real de app/api/calculate/route.ts, com Firestore por duplo e setDoc espionado. Nenhuma chamada externa.',
    status: res.status,
    conjuntos: {
      participantesCadastrados: {
        existeHoje: true,
        onde: `colecao respondents, lida em ${ROTA_CALCULO}:632-638`,
        temIdentidade: true,
        quantos: cadastrados.length,
        identificadores: cadastrados,
      },
      respostasConcluidas: {
        existeHoje: true,
        onde: `colecao responses com completedAt, filtrada em ${ROTA_CALCULO}:654-656`,
        temIdentidade: true,
        documentos: respostas.filter(r => r.completedAt !== undefined).length,
        identificadoresDistintos: Array.from(
          new Set(respostas.filter(r => r.completedAt !== undefined).map(r => r.respondentId))
        ),
        aviso: '⚠ documento e respondente nao sao a mesma unidade: ha duplicata por respondentId',
      },
      respostasUtilizadas: {
        existeHoje: 'SIM, em memoria durante a execucao',
        onde: `variavel responses apos o portao de completude, ${ROTA_CALCULO}:713-727`,
        temIdentidadeNoArtefato: false,
        quantosOArtefatoDeclara: gravado?.responseCount,
        identificadoresNoArtefato: 'NAO DETERMINADO: o documento gravado nao traz lista de incluidos',
        identificadoresPelaConstrucaoDaEntrada: utilizadosPelaConstrucao,
        aviso:
          '⚠ a lista acima e conhecida porque ESTE instrumento montou a entrada. Nao e recuperavel do artefato.',
      },
      exclusoesRegistradas: {
        existeHoje: true,
        onde: `metadata.excludedRespondentIds em ${ROTA_CALCULO}:1060 e metadata.rejectedIncomplete em ${ROTA_CALCULO}:1064`,
        temIdentidade: true,
        decisaoDoGestor: gravado?.metadata?.excludedRespondentIds,
        decisaoDoSistema: gravado?.metadata?.rejectedIncomplete,
        aviso: '⚠ identidade existe no artefato SO para quem ficou de FORA',
      },
    },
    documentoGravado: {
      colecao: setDocSpy.mock.calls[0]?.[0],
      chavesDeTopo: Object.keys(gravado ?? {}),
      chavesDeMetadata: Object.keys(gravado?.metadata ?? {}),
      temIpcMetadata: gravado?.ipcMetadata !== undefined,
      temRejectedIncomplete: gravado?.metadata?.rejectedIncomplete !== undefined,
      ocorrenciasDeIdentificadorIncluido: utilizadosPelaConstrucao.filter(id => serializado.includes(id)),
      respostaDaRotaTrazListaDeIncluidos: JSON.stringify(corpo).includes(utilizadosPelaConstrucao[0]),
    },
    orfaEDuplicata: {
      orfaDescartada: !serializado.includes('ident-orfao-99'),
      ondeAOrfaCai: `${ROTA_CALCULO}:659-665, validacao cruzada contra respondents`,
      ondeADuplicataCai: `${ROTA_CALCULO}:676-685, deduplicacao por respondentId mantendo o completedAt maior`,
      aviso: '⚠ descarte medido pela AUSENCIA do identificador no documento; o documento nao registra o descarte',
    },
  };

  // ==== 3. DUAS IDENTIDADES, O MESMO DOCUMENTO ====
  const semTempo = (o: any) => {
    const c = copia(o);
    delete c.calculatedAt;
    return JSON.stringify(c);
  };
  const rodarPainel = async (nome: (i: number) => string, alterarUm = false) => {
    const cad = JULGAMENTOS.map((_, i) => nome(i + 1));
    const resp: Entrada[] = JULGAMENTOS.map((j, i) => {
      const julg = copia(j);
      if (alterarUm && i === 0) {
        const alvo = julg.find((x: any) => x.type === 'bocr');
        alvo.saatyValue = alvo.saatyValue === 9 ? 8 : (alvo.saatyValue ?? 1) + 1;
        alvo.favors = 'A';
      }
      return { docId: `d-${nome(i + 1)}`, respondentId: nome(i + 1), judgments: julg, completedAt: `2026-05-0${(i % 9) + 1}T12:00:00.000Z` };
    });
    montarStore(cad, resp);
    setDocSpy.mockClear();
    await pedir();
    return setDocSpy.mock.calls[0][1] as any;
  };
  const docAlfa = await rodarPainel(idAlfa);
  const docBeta = await rodarPainel(idBeta);
  const docBetaAlterado = await rodarPainel(idBeta, true);

  const duasIdentidades = {
    pergunta: 'o documento gravado distingue QUEM respondeu?',
    // ⚠ o tamanho fica registrado para que a igualdade nao possa ser de documento vazio.
    painelA: {
      identificadores: `${idAlfa(1)} ... ${idAlfa(12)}`,
      bytesComparados: Buffer.byteLength(semTempo(docAlfa), 'utf8'),
      chavesDeTopo: Object.keys(docAlfa).length,
      sha256SemCalculatedAt: sha256(semTempo(docAlfa)),
    },
    painelB: {
      identificadores: `${idBeta(1)} ... ${idBeta(12)}`,
      bytesComparados: Buffer.byteLength(semTempo(docBeta), 'utf8'),
      chavesDeTopo: Object.keys(docBeta).length,
      sha256SemCalculatedAt: sha256(semTempo(docBeta)),
    },
    documentosIguais: semTempo(docAlfa) === semTempo(docBeta),
    controleDiscriminante: {
      oQueMudou: 'um unico julgamento do primeiro respondente do painel B',
      sha256SemCalculatedAt: sha256(semTempo(docBetaAlterado)),
      documentosIguais: semTempo(docBeta) === semTempo(docBetaAlterado),
      leitura: 'o documento responde a JULGAMENTOS e nao a IDENTIDADES',
    },
    conclusaoDoQueFoiMedido:
      'dois paineis com identidades inteiramente diferentes gravam documento identico fora de calculatedAt: o artefato NAO determina quem participou',
  };

  // ==== 3b. DE ONDE SAI O IDENTIFICADOR QUE OS FILTROS USAM ====
  // Três respostas: uma normal, uma SEM respondentId cujo id de DOCUMENTO está
  // cadastrado, e uma SEM respondentId e sem cadastro.
  montarStore(['ident-alfa-01', 'doc-vira-identidade'], [
    { docId: 'doc-normal', respondentId: 'ident-alfa-01', judgments: copia(JULGAMENTOS[0]), completedAt: '2026-05-01T12:00:00.000Z' },
    { docId: 'doc-vira-identidade', judgments: copia(JULGAMENTOS[1]), completedAt: '2026-05-02T12:00:00.000Z' },
    { docId: 'doc-sem-cadastro', judgments: copia(JULGAMENTOS[2]), completedAt: '2026-05-03T12:00:00.000Z' },
  ]);
  setDocSpy.mockClear();
  const resFonte = await pedir();
  const corpoFonte = await resFonte.json();
  const gravadoFonte = setDocSpy.mock.calls[0]?.[1] as any;

  const fonteDoIdentificador = {
    pergunta: 'de onde sai o identificador que os filtros usam?',
    cadeiaLidaNoCodigo: {
      onde: `${ROTA_CALCULO}:159-180, funcao extractRespondentId`,
      ordem: [
        'respondentId', 'visitorId', 'id do DOCUMENTO', 'responses.respondentId',
        'responses.visitorId', 'data.respondentId', 'userId', 'parte do email antes do arroba',
      ],
      ultimoElo: 'respondente_ seguido do INDICE mais um, isto e, identidade por POSICAO na lista',
      procedencia: 'LIDO no codigo',
    },
    observado: {
      responseCount: gravadoFonte?.responseCount,
      respostaSemRespondentIdComDocumentoCadastrado:
        'ENTROU: o id do documento serviu de identidade e passou na validacao cruzada',
      respostaSemRespondentIdSemCadastro: 'CAIU como orfa',
      leitura:
        'a identidade que o filtro usa pode vir do DOCUMENTO e nao do respondente, e as duas nao sao a mesma coisa',
    },
    fallbackPorPosicao: {
      alcancadoNaExecucaoObservada: false,
      porque: 'o id do documento precede o fallback na cadeia, e documento vindo do Firestore sempre tem id',
      procedencia: '⚠ LIDO no codigo. Nao exercitado, e NAO se afirma alcancavel no caminho de producao',
      ondeMudaDeValor:
        `⚠ o indice passado muda entre etapas: ${ROTA_CALCULO}:659 filtra sobre completedResponses e :678 percorre validatedResponses, que sao listas de tamanhos diferentes`,
    },
    naoAplicadoAqui:
      '⚠ esta rodada NAO usa posicao nem contagem para identificar ninguem; o achado acima e sobre o codigo lido',
  };
  void corpoFonte;

  // ==== 4. ONDE A IDENTIDADE CAI ====
  const trio = [
    { respondentId: 'quem-a', judgments: copia(JULGAMENTOS[0]) },
    { respondentId: 'quem-b', judgments: copia(JULGAMENTOS[1]) },
    { respondentId: 'quem-c', judgments: copia(JULGAMENTOS[2]) },
  ];
  const trioOutrosNomes = trio.map((r, i) => ({ respondentId: `outro-${i}`, judgments: r.judgments }));
  const trioOutroJulgamento = copia(trio);
  const alvoTrio = trioOutroJulgamento[0].judgments.find((x: any) => x.type === 'bocr');
  alvoTrio.saatyValue = alvoTrio.saatyValue === 9 ? 8 : (alvoTrio.saatyValue ?? 1) + 1;
  alvoTrio.favors = 'A';

  const agr = (rs: any[]) => aggregateMatrix(rs, 'bocr', 'BOCR', ['B', 'O', 'C', 'R']);
  const rA = agr(trio);
  const rB = agr(trioOutrosNomes);
  const rC = agr(trioOutroJulgamento);

  const ondeCai = {
    arquivo: AGREGACAO,
    linhas: '68-95',
    oQueEntra: 'objetos de resposta que TEM respondentId: a interface AggregationResponse o declara em lib/aggregation.ts:37',
    oQueSai: Object.keys(rA),
    oQuePassaAdiante: 'values: number[], em lib/aggregation.ts:95, e aggregateAIJ recebe SO numeros',
    trocandoSoOsIdentificadores: {
      iguais: JSON.stringify(rA) === JSON.stringify(rB),
      leitura: 'a saida nao depende da identidade',
    },
    controleDiscriminante: {
      oQueMudou: 'um julgamento de um dos tres',
      iguais: JSON.stringify(rA) === JSON.stringify(rC),
      leitura: 'a saida depende dos julgamentos, entao a comparacao anterior nao e trivial',
    },
    aviso: '⚠ medido na funcao REAL, com entradas sinteticas. Nao e execucao do painel de 2026.',
  };

  // ==== 5. OMISSÃO POR MATRIZ OU ETAPA ====
  const comPulado = copia(JULGAMENTOS[0]);
  const parPulado = comPulado.find((x: any) => x.type === 'subcriteria' && x.group === 'O' && x.itemA === 'O1' && x.itemB === 'O2');
  parPulado.skipped = true;
  const relatorio = checkResponseCompleteness(comPulado, ALTERNATIVAS);

  // Sem o portão, a agregação aceita contribuição PARCIAL e não registra quem deu.
  const dois = [{ respondentId: 'p1', judgments: copia(JULGAMENTOS[0]) }, { respondentId: 'p2', judgments: copia(JULGAMENTOS[1]) }];
  const doisComUmPulado = copia(dois);
  const alvoPulado = doisComUmPulado[1].judgments.find((x: any) => x.type === 'bocr');
  alvoPulado.skipped = true;
  const semPulo = agr(dois);
  const comPulo = agr(doisComUmPulado);

  const omissao = {
    portaoAtual: {
      arquivo: COMPLETUDE,
      matrizesEsperadas: relatorio.expectedMatrices,
      paresEsperados: relatorio.expectedPairs,
      paresValidos: relatorio.validPairs,
      isComplete: relatorio.isComplete,
      matrizesComDefeito: relatorio.incompleteMatrices,
      descricao: describeIncompleteness(relatorio),
      leitura: 'um par PULADO reprova a resposta inteira, e o defeito e nomeado POR MATRIZ',
    },
    semOPortao: {
      oQueFoiMedido: 'a mesma aggregateMatrix com um julgamento marcado skipped',
      celulaMudaDeValor: JSON.stringify(semPulo.matrix) !== JSON.stringify(comPulo.matrix),
      matrizContinuaCompleta: comPulo.isComplete,
      celulasPreenchidas: { semPulo: semPulo.filledCells, comPulo: comPulo.filledCells },
      registroDeQuemContribuiu: 'NAO EXISTE: a saida nao tem campo por respondente nem por celula',
      leitura:
        'participacao por celula altera o valor agregado e nao deixa rastro; presenca na lista inicial nao demonstra contribuicao a toda celula',
    },
    alcance:
      '⚠ o portao e do codigo ATUAL, lido e exercitado aqui. O arquivo historico nao foi produzido por este codigo.',
  };

  // ==== 6. VÍNCULO COM A EXECUÇÃO E COM A VERSÃO DOS DADOS ====
  const vinculo = {
    oQueOArtefatoTem: ['projectId', 'calculatedAt', 'responseCount'],
    oQueIssoDemonstra: {
      projectId: 'o projeto, nao os respondentes',
      calculatedAt: 'o instante do calculo, nao quem entrou',
      responseCount: '⚠ contagem; usar contagem para identificar seria reconstruir por contagem',
    },
    oQueNaoExiste: [
      'lista de identificadores incluidos',
      'identificador de documento de resposta',
      'resumo ou versao do conjunto de respostas',
      'carimbo de versao dos dados de origem',
    ],
    origemEMutavel: {
      onde: 'app/decisor/projetos/page.tsx:1044-1056',
      oQue: 'exclusao de especialista apaga respondent, suas responses e o documento de calculations, em lote',
      efeito: '⚠ o artefato exportado sobrevive a origem apagada, e nada nele preserva a identidade',
      procedencia: 'LIDO no codigo, nao exercitado nesta rodada',
    },
    veredito: 'NAO DETERMINADO: nada no artefato liga o resultado aos respondentes daquela execucao',
  };

  // ==== 7. O CÓDIGO ATUAL NÃO É O QUE PRODUZIU O HISTÓRICO ====
  const versoes = {
    documentoGravadoHoje: {
      temIpcMetadata: docAlfa.ipcMetadata !== undefined,
      temRejectedIncomplete: docAlfa.metadata?.rejectedIncomplete !== undefined,
    },
    arquivoHistorico: {
      temIpcMetadata: hist.ipcMetadata !== undefined,
      temRejectedIncomplete: hist.metadata?.rejectedIncomplete !== undefined,
    },
    leitura:
      'os dois conjuntos de campos diferem nos dois sentidos: o historico tem ipcMetadata e nao tem rejectedIncomplete, e o documento de hoje e o inverso',
    oQueIstoDemonstra: 'que o arquivo historico NAO foi produzido pelo codigo atual',
    oQueIstoNaoDemonstra: '⚠ qual versao o produziu, nem quais filtros aquela versao aplicou',
  };

  M = {
    rodada: 'A.12 identidade de quem participou do calculo, INVESTIGACAO',
    natureza:
      'LE E MEDE. Nao escolhe, nao implementa, nao integra. Nenhum parecer produzido, real ou simulado. Nenhuma identidade reconstruida por posicao ou contagem.',
    identificacao: {
      commitDaBase: COMMIT_DA_BASE,
      arquivos: Object.fromEntries(
        [HISTORICO, ROTA_CALCULO, AGREGACAO, COMPLETUDE].map(f => [f, shaArquivo(f)])
      ),
    },
    arquivoHistorico,
    execucaoObservada,
    duasIdentidades,
    fonteDoIdentificador,
    ondeAIdentidadeCai: ondeCai,
    omissaoPorMatrizOuEtapa: omissao,
    vinculoComAExecucao: vinculo,
    versoesDoCodigo: versoes,
    oQueIstoNaoDemonstra: [
      'NAO demonstra qual versao produziu o arquivo historico',
      'NAO demonstra quais respondentes entraram naquela execucao de 13/07/2026',
      'NAO exercita a tela de resultados nem o caminho do parecer: foram LIDOS',
      'NAO julga a legitimidade de exclusao alguma',
      'NAO altera producao, e nenhuma identidade foi reconstruida por posicao ou contagem',
    ],
  };

  if (GRAVAR) {
    fs.mkdirSync(path.dirname(ARTEFATO), { recursive: true });
    fs.writeFileSync(ARTEFATO, JSON.stringify(M, null, 2) + '\n', 'utf8');
  }
});

// ---------------------------------------------------------------------------
// 3.1 O arquivo histórico
// ---------------------------------------------------------------------------

test('3.1: o arquivo historico nao tem dados individuais nem identificador de respondente', () => {
  const a = M.arquivoHistorico;
  expect(a.chavesDistintas).toBe(131);
  expect(a.folhas).toBe(700);
  // O ÚNICO valor com cara de identificador é o do projeto.
  expect(a.valoresComCaraDeIdentificador).toEqual([{ caminho: '.projectId', valor: 'yiEXoz12wN7rqWZZP70g' }]);
  expect(a.oQueTem['metadata.excludedRespondentIds']).toEqual([]);
  expect(a.oQueTem.responseCount).toBe(12);
  // ⚠ lista vazia de excluídos não é lista de incluídos.
  expect(a.oQueNaoTem['metadata.rejectedIncomplete']).toBe(true);
});

test('3.1: a completude do historico e da matriz AGREGADA, e nao por respondente', () => {
  const c = M.arquivoHistorico.completudeQueRegistra;
  expect(c.oQueNaoE).toMatch(/NAO e completude por respondente/);
  for (const g of ['B', 'O', 'C', 'R']) {
    expect(c.medido[g]).toEqual({ given: 10, possible: 10, isComplete: true, ratio: 1 });
  }
  // E o vínculo com as matrizes é inexistente: elas já vêm agregadas.
  expect(M.arquivoHistorico.vinculoComAsMatrizes).toMatch(/JA agregadas/);
  // ⚠ copia antes de ordenar: `sort` muta, e mutar a medicao dentro da assertiva
  // foi defeito medido na primeira execucao deste instrumento.
  expect([...M.arquivoHistorico.oQueTem.matrizesAgregadas].sort()).toEqual(['bocr', 'magnitude', 'subcriteria']);
});

// ---------------------------------------------------------------------------
// 3.3 Os quatro conjuntos
// ---------------------------------------------------------------------------

test('3.3: os quatro conjuntos estao distinguidos, com existencia, local e identidade', () => {
  const c = M.execucaoObservada.conjuntos;
  expect(Object.keys(c)).toEqual([
    'participantesCadastrados', 'respostasConcluidas', 'respostasUtilizadas', 'exclusoesRegistradas',
  ]);
  for (const k of Object.keys(c)) {
    expect(typeof c[k].onde).toBe('string');
    expect(c[k].onde.length).toBeGreaterThan(10);
  }
  expect(c.participantesCadastrados.quantos).toBe(14);
  expect(c.respostasConcluidas.documentos).toBe(14);
  expect(c.respostasConcluidas.identificadoresDistintos).toHaveLength(13);
  // Doze do painel, menos o excluído pelo gestor e o rejeitado por incompletude.
  expect(c.respostasUtilizadas.quantosOArtefatoDeclara).toBe(10);
  expect(c.respostasUtilizadas.identificadoresPelaConstrucaoDaEntrada).toHaveLength(10);
});

test('3.3: identidade no artefato existe SO para quem ficou de fora', () => {
  const c = M.execucaoObservada.conjuntos;
  expect(c.exclusoesRegistradas.decisaoDoGestor).toEqual(['ident-alfa-02']);
  expect(c.exclusoesRegistradas.decisaoDoSistema).toEqual([
    { respondentId: 'ident-alfa-07', matrizes: ['O: 1 comparação(ões) sem resposta'] },
  ]);
  // E nenhum identificador de INCLUÍDO aparece no documento gravado.
  expect(M.execucaoObservada.documentoGravado.ocorrenciasDeIdentificadorIncluido).toEqual([]);
  expect(M.execucaoObservada.documentoGravado.respostaDaRotaTrazListaDeIncluidos).toBe(false);
  expect(c.respostasUtilizadas.identificadoresNoArtefato).toMatch(/^NAO DETERMINADO/);
});

test('3.3: orfa e duplicata caem no caminho, e o documento nao registra o descarte', () => {
  const o = M.execucaoObservada.orfaEDuplicata;
  expect(o.orfaDescartada).toBe(true);
  expect(o.ondeAOrfaCai).toMatch(/route\.ts:\d+/);
  expect(o.ondeADuplicataCai).toMatch(/route\.ts:\d+/);
  expect(o.aviso).toMatch(/o documento nao registra o descarte/);
  // A duplicata não vira respondente a mais: doze documentos de painel, onze ids.
  expect(M.execucaoObservada.conjuntos.respostasUtilizadas.quantosOArtefatoDeclara).toBe(10);
});

test('3.3: a identidade que o filtro usa pode vir do DOCUMENTO, e o fallback por posicao nao foi alcancado', () => {
  const f = M.fonteDoIdentificador;
  expect(f.observado.responseCount).toBe(2);
  expect(f.observado.respostaSemRespondentIdComDocumentoCadastrado).toMatch(/^ENTROU/);
  expect(f.observado.respostaSemRespondentIdSemCadastro).toMatch(/^CAIU/);
  // ⚠ o ultimo elo da cadeia e identidade por posicao, e fica registrado como LIDO.
  expect(f.cadeiaLidaNoCodigo.ultimoElo).toMatch(/POSICAO/);
  expect(f.fallbackPorPosicao.alcancadoNaExecucaoObservada).toBe(false);
  expect(f.fallbackPorPosicao.procedencia).toMatch(/LIDO no codigo/);
  expect(f.naoAplicadoAqui).toMatch(/NAO usa posicao nem contagem/);
});

// ---------------------------------------------------------------------------
// 3.2 Onde a identidade existe e onde é descartada
// ---------------------------------------------------------------------------

test('3.2: a identidade existe na origem e cai na agregacao, com arquivo e linha', () => {
  const o = M.ondeAIdentidadeCai;
  expect(o.arquivo).toBe('lib/aggregation.ts');
  expect([...o.oQueSai].sort()).toEqual(['filledCells', 'isComplete', 'matrix', 'totalCells']);
  expect(o.trocandoSoOsIdentificadores.iguais).toBe(true);
  // ⚠ CONTROLE: se mudar um julgamento, a saída muda — a igualdade acima não é trivial.
  expect(o.controleDiscriminante.iguais).toBe(false);
});

test('3.2: dois paineis de identidades diferentes gravam o MESMO documento', () => {
  const d = M.duasIdentidades;
  expect(d.documentosIguais).toBe(true);
  expect(d.painelA.sha256SemCalculatedAt).toBe(d.painelB.sha256SemCalculatedAt);
  // ⚠ CONTROLE: um julgamento diferente muda o documento.
  expect(d.controleDiscriminante.documentosIguais).toBe(false);
  expect(d.controleDiscriminante.sha256SemCalculatedAt).not.toBe(d.painelA.sha256SemCalculatedAt);
});

// ---------------------------------------------------------------------------
// 3.4 Rastreabilidade e omissão por matriz
// ---------------------------------------------------------------------------

test('3.4: o vinculo com a execucao e com a versao dos dados fica NAO DETERMINADO', () => {
  const v = M.vinculoComAExecucao;
  expect(v.veredito).toMatch(/^NAO DETERMINADO/);
  expect(v.oQueOArtefatoTem).toEqual(['projectId', 'calculatedAt', 'responseCount']);
  expect(v.oQueIssoDemonstra.responseCount).toMatch(/reconstruir por contagem/);
  expect(v.origemEMutavel.procedencia).toMatch(/LIDO no codigo, nao exercitado/);
});

test('3.4: julgamento omitido reprova a resposta e e nomeado POR MATRIZ', () => {
  const p = M.omissaoPorMatrizOuEtapa.portaoAtual;
  expect(p.matrizesEsperadas).toBe(26);
  expect(p.paresEsperados).toBe(72);
  expect(p.isComplete).toBe(false);
  expect(p.matrizesComDefeito).toEqual(['subcriteria|O']);
  expect(p.descricao).toEqual(['O: 1 comparação(ões) sem resposta']);
});

test('3.4: sem o portao, a contribuicao por celula muda o valor e NAO deixa rastro', () => {
  const s = M.omissaoPorMatrizOuEtapa.semOPortao;
  expect(s.celulaMudaDeValor).toBe(true);
  expect(s.matrizContinuaCompleta).toBe(true); // o outro respondente preenche a célula
  expect(s.registroDeQuemContribuiu).toMatch(/^NAO EXISTE/);
  expect(M.omissaoPorMatrizOuEtapa.alcance).toMatch(/nao foi produzido por este codigo/);
});

// ---------------------------------------------------------------------------
// Versões, limites e artefato
// ---------------------------------------------------------------------------

test('o codigo atual NAO e o que produziu o arquivo historico, e nao diz qual foi', () => {
  const v = M.versoesDoCodigo;
  expect(v.documentoGravadoHoje).toEqual({ temIpcMetadata: false, temRejectedIncomplete: true });
  expect(v.arquivoHistorico).toEqual({ temIpcMetadata: true, temRejectedIncomplete: false });
  expect(v.oQueIstoNaoDemonstra).toMatch(/qual versao o produziu/);
});

test('o registro diz o que NAO demonstra', () => {
  const s = JSON.stringify(M.oQueIstoNaoDemonstra);
  expect(s).toMatch(/NAO demonstra qual versao produziu o arquivo historico/);
  expect(s).toMatch(/nenhuma identidade foi reconstruida por posicao ou contagem/);
  expect(M.natureza).toMatch(/Nao escolhe, nao implementa, nao integra/);
});

test('o artefato gravado coincide com a medicao atual', () => {
  expect(fs.existsSync(ARTEFATO)).toBe(true);
  const gravado = JSON.parse(fs.readFileSync(ARTEFATO, 'utf8'));
  for (const chave of [
    'arquivoHistorico', 'execucaoObservada', 'duasIdentidades', 'ondeAIdentidadeCai',
    'omissaoPorMatrizOuEtapa', 'vinculoComAExecucao', 'versoesDoCodigo', 'fonteDoIdentificador',
  ]) {
    expect(gravado[chave]).toEqual(M[chave]);
  }
  expect(gravado.identificacao).toEqual(M.identificacao);
});
