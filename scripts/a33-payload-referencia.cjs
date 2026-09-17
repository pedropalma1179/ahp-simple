/**
 * A.33: a requisição do Parecer IA montada a partir do payload de referência dos
 * casos C1, C2 e C3, `docs/calculations-13jul2026.json`.
 *
 * ⚠ **O arquivo NÃO é a requisição.** É o documento `calculations` do Firestore.
 * A requisição é montada pela tela, em `app/decisor/resultados/[projectId]/page.tsx`,
 * função `runAiReview`, bloco "Preparar payload", que também lê o documento do
 * projeto, as respostas, a análise de qualidade, a demografia e as exclusões.
 *
 * Duas versões, e as duas ficam:
 *
 * - **r1**, `montarRequisicao`, gravada em 82057ec: tratava todas as fontes fora do
 *   cálculo como vazias. ⚠ **Estava errada num ponto:** o nome do projeto está no
 *   arquivo, em `metadata.projectName`. Fica CONGELADA, só para verificar o registro
 *   histórico.
 * - **r2**, `montarRequisicaoR2`, a vigente: mapeia o nome e classifica cada campo
 *   pela DISPONIBILIDADE da informação, separada do valor enviado.
 *
 * ⚠ **Nenhuma das duas corrige o fallback de qualidade da tela.** Ele é
 * preservado, e o efeito dele é pendência de A.12.
 *
 * ⚠ A normalização interna da rota, `normalizeRequest`, é parte do handler e fica
 * fora destas transformações: ela age sobre a requisição, como em produção.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const ARQUIVO = 'docs/calculations-13jul2026.json';
const TELA = 'app/decisor/resultados/[projectId]/page.tsx';
const CALCULO = 'app/api/calculate/route.ts';

const ESPELHO = `${TELA}, runAiReview, bloco "Preparar payload"`;

/**
 * Âncoras de texto, com o número de ocorrências medido.
 *
 * ⚠ **ALCANCE:** verificam a PRESENÇA dos fragmentos escolhidos, e nada além. **Não
 * demonstram equivalência completa entre a tela e este espelho**: uma mudança fora
 * dos fragmentos passa sem ser vista. Mudança num fragmento reprova o teste, e o
 * espelho tem de ser revisto antes de voltar a valer.
 */
const ANCORAS_DA_TELA = [
  ['if (!calculation || !project) {', 1],
  ["projectName: project.name || 'Projeto sem nome'", 1],
  ["projectDescription: project.description || ''", 1],
  ['alternatives: project.alternatives || []', 1],
  ['bocrWeights: calculation.bocrWeights || []', 1],
  ['Benefits: calculation.bocrWeights[0]', 1],
  ['Benefits: calculation.rescalingWeights.sb', 1],
  ['bocrConsistency: calculation.bocrConsistency || { cr: 0, lambda: 0 }', 1],
  ['subWeights: calculation.subWeights || {}', 1],
  ['subConsistency: calculation.subConsistency || {}', 1],
  ['finalScores: calculation.finalScores || []', 1],
  ['responseCount: calculation.responseCount || activeProjectResponses.length || 0', 1],
  ['sensitivityInflections: calculation.sensitivityInflections || {}', 1],
  ["'CONFIÁVEL': individualStats.valid || calculation.responseCount || 0", 1],
  ["'REVISAR': 0", 2],
  // Duas: `summary.total` no ramo COM análise de qualidade e `statistics.total` no
  // ramo SEM ela, que é o espelhado.
  ['total: individualStats.total || calculation.responseCount || 0,', 2],
  ['total: calculation.responseCount || activeProjectResponses.length || 0,', 1],
  ['ok: individualStats.valid || calculation.responseCount || 0', 1],
  ['total: individualStats.total || calculation.responseCount || activeProjectResponses.length || 0', 1],
  ['individualStats: individualStats.total > 0 ? individualStats : undefined', 1],
  ['} : { total: 0, hasData: false };', 1],
  ['exclusionInfo: excludedIds.length > 0 ? {', 1],
  ['body: JSON.stringify(finalPayload)', 1],
  // r2: a fonte das exclusões da tela é o próprio documento de cálculo.
  ['setExcludedIds(calcData.metadata.excludedRespondentIds);', 1],
  ['setSensitiveGroups(projectData.sensitiveGroups);', 1],
  ['sensitiveGroups: sensitiveGroups || undefined', 1],
];

/** r2: de onde a rota de cálculo tira os dois metadados que a requisição usa. */
const ANCORAS_DO_CALCULO = [
  ['projectName: project.name,', 1],
  ['excludedRespondentIds, // Persistir lista de excluídos: decisão do gestor', 1],
];

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const lerArquivo = () => fs.readFileSync(path.join(ROOT, ARQUIVO));

// ============================================================
// r1, congelada
// ============================================================

/**
 * r1: monta a requisição e a declaração de origem.
 *
 * ⚠ CONGELADA em 82057ec, e mantida só para verificar o registro histórico. A
 * premissa dela diz que os campos do projeto não estão no arquivo, o que é falso
 * para o nome; a r2 corrige isso.
 */
function montarRequisicao(calc) {
  // Rótulos no formato de caminho de `a33-snapshot-v2.cjs`: chave que não é
  // identificador simples, como as acentuadas, vai entre colchetes.
  const origens = [];
  const lido = (campo, valor) => { origens.push({ campo, origem: 'lido', de: `${ARQUIVO}: ${campo}` }); return valor; };
  const derivado = (campo, valor, regra) => { origens.push({ campo, origem: 'derivado', regra }); return valor; };
  const ausente = (campo, valor, regra) => { origens.push({ campo, origem: 'ausente-no-arquivo', regra }); return valor; };
  const constante = (campo, valor, regra) => { origens.push({ campo, origem: 'constante-da-tela', regra }); return valor; };

  const bw = calc.bocrWeights;
  const rw = calc.rescalingWeights;
  if (!Array.isArray(bw) || bw.length < 4) throw Error('bocrWeights do arquivo não é vetor de quatro pesos');
  if (!rw) throw Error('rescalingWeights ausente do arquivo');

  // Fontes ausentes, com o valor que a tela usa quando estão vazias.
  const individualStats = { valid: 0, warning: 0, critical: 0, total: 0, avgCR: 0 };

  const requisicao = {
    projectName: ausente('projectName', 'Projeto sem nome', "project.name ausente: a tela usa 'Projeto sem nome'"),
    projectDescription: ausente('projectDescription', '', "project.description ausente: a tela usa ''"),
    alternatives: ausente('alternatives', [], 'project.alternatives ausente: a tela usa []'),
    bocrWeights: lido('bocrWeights', bw),
    personalWeights: derivado('personalWeights', { Benefits: bw[0], Opportunities: bw[1], Costs: bw[2], Risks: bw[3] },
      'bocrWeights[0..3] do arquivo, nomeados Benefits, Opportunities, Costs e Risks'),
    rescalingWeights: derivado('rescalingWeights', { Benefits: rw.sb, Opportunities: rw.so, Costs: rw.sc, Risks: rw.sr },
      'rescalingWeights.sb, so, sc e sr do arquivo, nomeados Benefits, Opportunities, Costs e Risks'),
    bocrConsistency: lido('bocrConsistency', calc.bocrConsistency),
    subWeights: lido('subWeights', calc.subWeights),
    subConsistency: lido('subConsistency', calc.subConsistency),
    finalScores: lido('finalScores', calc.finalScores),
    responseCount: lido('responseCount', calc.responseCount),
    sensitivityInflections: lido('sensitivityInflections', calc.sensitivityInflections),
    qualityAnalysis: {
      respondents: ausente('qualityAnalysis.respondents', [], 'sem análise de qualidade e sem respostas: a tela envia []'),
      statistics: {
        byStatus: {
          'CONFIÁVEL': derivado('qualityAnalysis.statistics.byStatus["CONFIÁVEL"]', individualStats.valid || calc.responseCount || 0,
            '⚠ individualStats.valid é 0 sem fontes, e a tela usa responseCount do arquivo: declara os respondentes como confiáveis SEM medição individual. Terreno de A.12; não resolvido aqui.'),
          'REVISAR': constante('qualityAnalysis.statistics.byStatus.REVISAR', 0, "a tela fixa 'REVISAR': 0"),
          'SUSPEITO': ausente('qualityAnalysis.statistics.byStatus.SUSPEITO', individualStats.warning || 0, 'individualStats.warning é 0 sem fontes'),
          'CRÍTICO': ausente('qualityAnalysis.statistics.byStatus["CRÍTICO"]', individualStats.critical || 0, 'individualStats.critical é 0 sem fontes'),
        },
        total: derivado('qualityAnalysis.statistics.total', individualStats.total || calc.responseCount || 0, 'individualStats.total é 0 sem fontes, e a tela usa responseCount do arquivo'),
        avgCR: ausente('qualityAnalysis.statistics.avgCR', individualStats.avgCR || 0, 'individualStats.avgCR é 0 sem fontes'),
      },
      summary: {
        total: derivado('qualityAnalysis.summary.total', calc.responseCount || 0, 'responseCount do arquivo'),
        ok: derivado('qualityAnalysis.summary.ok', individualStats.valid || calc.responseCount || 0, 'individualStats.valid é 0 sem fontes, e a tela usa responseCount do arquivo'),
        suspicious: ausente('qualityAnalysis.summary.suspicious', individualStats.warning || 0, 'individualStats.warning é 0 sem fontes'),
        critical: ausente('qualityAnalysis.summary.critical', individualStats.critical || 0, 'individualStats.critical é 0 sem fontes'),
      },
    },
    overallStats: {
      total: derivado('overallStats.total', individualStats.total || calc.responseCount || 0, 'individualStats.total é 0 sem fontes, e a tela usa responseCount do arquivo'),
      valid: ausente('overallStats.valid', individualStats.valid || 0, 'individualStats.valid é 0 sem fontes'),
      warning: ausente('overallStats.warning', individualStats.warning || 0, 'individualStats.warning é 0 sem fontes'),
      critical: ausente('overallStats.critical', individualStats.critical || 0, 'individualStats.critical é 0 sem fontes'),
    },
    individualStats: ausente('individualStats', individualStats.total > 0 ? individualStats : undefined, 'total 0 sem fontes: a tela envia undefined, e o campo some no JSON'),
    demographicsSummary: ausente('demographicsSummary', { total: 0, hasData: false }, 'sem demografia: a tela envia { total: 0, hasData: false }'),
    sensitiveGroups: ausente('sensitiveGroups', undefined, 'sem grupos sensíveis: a tela envia undefined, e o campo some no JSON'),
    exclusionInfo: ausente('exclusionInfo', undefined, 'sem exclusões: a tela envia undefined, e o campo some no JSON'),
  };
  // Como `fetch` recebe o corpo: JSON.stringify, que descarta os undefined.
  return { requisicao: JSON.parse(JSON.stringify(requisicao)), origens };
}

/** r1: a declaração, com o texto exatamente como foi gravado em 82057ec. */
function declaracaoR1() {
  const bruto = lerArquivo();
  const { requisicao, origens } = montarRequisicao(JSON.parse(bruto.toString('utf8')));
  return {
    arquivo: ARQUIVO,
    sha256Bytes: sha256(bruto),
    papel: 'Payload de referência dos casos C1, C2 e C3: o documento calculations do projeto das 24 saídas publicadas. Não é captura de requisição HTTP.',
    transformacao: {
      modulo: 'scripts/a33-payload-referencia.cjs, montarRequisicao',
      espelho: ESPELHO,
      premissa: 'O projeto existe, como a tela exige para enviar, mas os campos dele não estão no arquivo; não há análise de qualidade, respostas, demografia, grupos sensíveis nem exclusões. Cada ausência recebe o valor que a própria tela usa quando a fonte está vazia.',
      foraDaTransformacao: 'normalizeRequest, dentro do handler, age sobre a requisição como em produção.',
      conferenciaDoEspelho: `âncoras de texto em ${TELA}, conferidas por teste`,
    },
    origens,
    sha256Requisicao: sha256(Buffer.from(JSON.stringify(requisicao), 'utf8')),
    pendencia: 'Antes de gerar: decidir se a requisição de referência deve declarar os 12 respondentes como confiáveis, como a tela faz sem análise de qualidade, ou trazer a qualidade medida. Terreno de A.12; não resolvido aqui.',
  };
}

// ============================================================
// r2, vigente
// ============================================================

/** Os quatro estados da INFORMAÇÃO de entrada, e só estes. */
const ESTADOS = ['disponivel', 'derivado', 'indisponivel', 'comprovadamente-vazio'];
/** Como a montagem trata o campo. */
const TRATAMENTOS = ['leitura', 'transformacao', 'omissao', 'fallback'];

const FONTES_FORA_DO_ARQUIVO = {
  projeto: 'documento do projeto no Firestore, lido pela tela como project',
  qualidade: 'análise de qualidade, /api/response-quality sobre as respostas, e as respostas do projeto no Firestore',
  demografia: 'campos demográficos das respostas do projeto',
  grupos: 'projectData.sensitiveGroups, configurado pelo pesquisador no documento do projeto',
};

const PENDENCIA_A12 =
  'Efeito do fallback de qualidade, PRESERVADO e não corrigido: sem avaliação individual, a tela envia byStatus CONFIÁVEL e summary.ok iguais a responseCount, isto é, 12 respondentes confiáveis sem medição. Chega ao modelo, na seção de qualidade e na pontuação automática 100/100 que calculateGrade tira desses números, e pode chegar à tela: a nota e o veredicto automáticos voltam na resposta e substituem os do parecer quando ele não traz nota, e são exibidos no estado aprovado. A Tabela 4 contradiz a classificação. Terreno de A.12, em rodada própria, com predição registrada antes.';

/**
 * r2: a requisição de referência, com o inventário por campo.
 *
 * Premissa: o projeto existe, como a tela exige. O nome vem do próprio arquivo, em
 * `metadata.projectName`, que a rota de cálculo grava a partir de `project.name`.
 * As fontes que o arquivo não traz são INDISPONÍVEIS, e não vazias; a montagem
 * aplica o fallback que a tela aplica, e o valor enviado por fallback NÃO é
 * informação medida.
 */
function montarRequisicaoR2(calc) {
  const inventario = [];
  const constantes = [];
  const registrar = (campo, estado, origemEvidencia, tratamento, valor, extra = {}) => {
    if (!ESTADOS.includes(estado)) throw Error('Estado fora das quatro categorias: ' + estado);
    if (!TRATAMENTOS.includes(tratamento)) throw Error('Tratamento não previsto: ' + tratamento);
    const presente = valor !== undefined;
    inventario.push({
      campo,
      estado,
      origemEvidencia,
      tratamento,
      valorEnviado: presente ? { presente: true, valor } : { presente: false },
      valorEnviadoEhInformacaoMedida: estado !== 'indisponivel',
      ...extra,
    });
    return valor;
  };
  const constante = (campo, valor, origem) => { constantes.push({ campo, valor, origemNoCodigo: origem, naoEhObservacaoDoProjeto: true }); return valor; };

  const bw = calc.bocrWeights;
  const rw = calc.rescalingWeights;
  const meta = calc.metadata || {};
  if (!Array.isArray(bw) || bw.length < 4) throw Error('bocrWeights do arquivo não é vetor de quatro pesos');
  if (!rw) throw Error('rescalingWeights ausente do arquivo');
  if (typeof meta.projectName !== 'string' || meta.projectName === '') throw Error('metadata.projectName ausente do arquivo');
  if (!Array.isArray(meta.excludedRespondentIds)) throw Error('metadata.excludedRespondentIds ausente do arquivo');

  // Fontes que o arquivo não traz: a tela vê individualStats zerado.
  const individualStats = { valid: 0, warning: 0, critical: 0, total: 0, avgCR: 0 };
  const excludedIds = meta.excludedRespondentIds;
  const indisponivelQualidade = `indisponível: ${FONTES_FORA_DO_ARQUIVO.qualidade}; o arquivo não traz classificação individual`;
  const lido = (campo) => registrar(campo, 'disponivel', `${ARQUIVO}: ${campo}`, 'leitura', calc[campo]);

  const requisicao = {
    projectName: registrar('projectName', 'disponivel',
      `${ARQUIVO}: metadata.projectName, gravado por ${CALCULO} a partir de project.name no cálculo de ${calc.calculatedAt}`,
      'transformacao', meta.projectName,
      { transformacao: 'metadata.projectName -> projectName: mapeamento de campo, com o texto copiado sem alteração. A tela lê project.name, outra fonte; o arquivo guarda o valor que ela tinha no cálculo.' }),
    projectDescription: registrar('projectDescription', 'indisponivel',
      `indisponível: ${FONTES_FORA_DO_ARQUIVO.projeto}; o arquivo não traz descrição`, 'fallback', '',
      { fallback: "a tela usa project.description || ''" }),
    alternatives: registrar('alternatives', 'indisponivel',
      `indisponível: os objetos de alternativa do ${FONTES_FORA_DO_ARQUIVO.projeto}; o arquivo só traz metadata.alternativesCount e code e name em finalScores`, 'fallback', [],
      { fallback: 'a tela usa project.alternatives || []', nota: 'A rota só copia o campo em normalizeRequest e não o lê depois; medido por busca em app/api/ai-reviewer e lib/ai-reviewer.' }),
    bocrWeights: lido('bocrWeights'),
    personalWeights: registrar('personalWeights', 'derivado', `${ARQUIVO}: bocrWeights`, 'transformacao',
      { Benefits: bw[0], Opportunities: bw[1], Costs: bw[2], Risks: bw[3] },
      { regra: 'bocrWeights[0..3], nomeados Benefits, Opportunities, Costs e Risks, como a tela faz' }),
    rescalingWeights: registrar('rescalingWeights', 'derivado', `${ARQUIVO}: rescalingWeights`, 'transformacao',
      { Benefits: rw.sb, Opportunities: rw.so, Costs: rw.sc, Risks: rw.sr },
      { regra: 'rescalingWeights.sb, so, sc e sr, nomeados Benefits, Opportunities, Costs e Risks, como a tela faz' }),
    bocrConsistency: lido('bocrConsistency'),
    subWeights: lido('subWeights'),
    subConsistency: lido('subConsistency'),
    finalScores: lido('finalScores'),
    responseCount: lido('responseCount'),
    sensitivityInflections: lido('sensitivityInflections'),
    qualityAnalysis: {
      respondents: registrar('qualityAnalysis.respondents', 'indisponivel',
        `indisponível: ${FONTES_FORA_DO_ARQUIVO.qualidade}`, 'fallback', [],
        { fallback: 'sem análise de qualidade e sem respostas, a tela envia []', nota: 'Os CRs individuais dos 12 existem fora do arquivo, em docs/referencia-cr-individuais.md; usá-los é decisão de A.12.' }),
      statistics: {
        byStatus: {
          'CONFIÁVEL': registrar('qualityAnalysis.statistics.byStatus["CONFIÁVEL"]', 'indisponivel', indisponivelQualidade, 'fallback',
            individualStats.valid || calc.responseCount || 0,
            { fallback: 'a tela usa individualStats.valid || calculation.responseCount', pendencia: 'A.12: o valor enviado declara os respondentes confiáveis sem medição' }),
          'REVISAR': constante('qualityAnalysis.statistics.byStatus.REVISAR', 0, `${TELA}: 'REVISAR': 0, fixo nos dois ramos`),
          'SUSPEITO': registrar('qualityAnalysis.statistics.byStatus.SUSPEITO', 'indisponivel', indisponivelQualidade, 'fallback',
            individualStats.warning || 0, { fallback: 'a tela usa individualStats.warning || 0' }),
          'CRÍTICO': registrar('qualityAnalysis.statistics.byStatus["CRÍTICO"]', 'indisponivel', indisponivelQualidade, 'fallback',
            individualStats.critical || 0, { fallback: 'a tela usa individualStats.critical || 0' }),
        },
        total: registrar('qualityAnalysis.statistics.total', 'derivado', `${ARQUIVO}: responseCount`, 'fallback',
          individualStats.total || calc.responseCount || 0,
          { fallback: 'a tela usa individualStats.total || calculation.responseCount', regra: 'o número de respondentes do cálculo; metadata.excludedRespondentIds é vazio' }),
        avgCR: registrar('qualityAnalysis.statistics.avgCR', 'indisponivel', indisponivelQualidade, 'fallback',
          individualStats.avgCR || 0, { fallback: 'a tela usa individualStats.avgCR || 0' }),
      },
      summary: {
        total: registrar('qualityAnalysis.summary.total', 'derivado', `${ARQUIVO}: responseCount`, 'leitura',
          calc.responseCount || 0, { regra: 'a tela lê calculation.responseCount' }),
        ok: registrar('qualityAnalysis.summary.ok', 'indisponivel', indisponivelQualidade, 'fallback',
          individualStats.valid || calc.responseCount || 0,
          { fallback: 'a tela usa individualStats.valid || calculation.responseCount', pendencia: 'A.12: o valor enviado declara os respondentes confiáveis sem medição' }),
        suspicious: registrar('qualityAnalysis.summary.suspicious', 'indisponivel', indisponivelQualidade, 'fallback',
          individualStats.warning || 0, { fallback: 'a tela usa individualStats.warning || 0' }),
        critical: registrar('qualityAnalysis.summary.critical', 'indisponivel', indisponivelQualidade, 'fallback',
          individualStats.critical || 0, { fallback: 'a tela usa individualStats.critical || 0' }),
      },
    },
    overallStats: {
      total: registrar('overallStats.total', 'derivado', `${ARQUIVO}: responseCount`, 'fallback',
        individualStats.total || calc.responseCount || 0,
        { fallback: 'a tela usa individualStats.total || calculation.responseCount', regra: 'o número de respondentes do cálculo' }),
      valid: registrar('overallStats.valid', 'indisponivel', indisponivelQualidade, 'fallback',
        individualStats.valid || 0, { fallback: 'a tela usa individualStats.valid || 0' }),
      warning: registrar('overallStats.warning', 'indisponivel', indisponivelQualidade, 'fallback',
        individualStats.warning || 0, { fallback: 'a tela usa individualStats.warning || 0' }),
      critical: registrar('overallStats.critical', 'indisponivel', indisponivelQualidade, 'fallback',
        individualStats.critical || 0, { fallback: 'a tela usa individualStats.critical || 0' }),
    },
    individualStats: registrar('individualStats', 'indisponivel', indisponivelQualidade, 'omissao',
      individualStats.total > 0 ? individualStats : undefined,
      { omissao: 'total 0: a tela envia undefined, e o campo some no JSON' }),
    demographicsSummary: registrar('demographicsSummary', 'indisponivel',
      `indisponível: ${FONTES_FORA_DO_ARQUIVO.demografia}; o arquivo não traz demografia`, 'fallback',
      { total: 0, hasData: false },
      { fallback: 'a tela envia { total: 0, hasData: false } sem demografia', nota: 'NÃO é vazio demonstrado: a dissertação caracteriza o painel na Tabela 3.' }),
    sensitiveGroups: registrar('sensitiveGroups', 'indisponivel',
      `indisponível: ${FONTES_FORA_DO_ARQUIVO.grupos}`, 'omissao', undefined,
      { omissao: 'sem configuração, a tela envia undefined, e o campo some no JSON' }),
    exclusionInfo: registrar('exclusionInfo', 'comprovadamente-vazio',
      `${ARQUIVO}: metadata.excludedRespondentIds = []. É a fonte que a tela usa: ${TELA} inicializa excludedIds com calcData.metadata.excludedRespondentIds, e ${CALCULO} grava ali a lista de excluídos do cálculo.`,
      'omissao', excludedIds.length > 0 ? { excludedCount: excludedIds.length } : undefined,
      { omissao: 'lista vazia: a tela envia undefined, e o campo some no JSON', evidenciaDoVazio: { campo: 'metadata.excludedRespondentIds', valor: excludedIds } }),
  };
  if (excludedIds.length > 0) throw Error('Exclusões no arquivo: exclusionInfo precisaria das respostas, que o arquivo não traz');
  return { requisicao: JSON.parse(JSON.stringify(requisicao)), inventario, constantes };
}

/** A requisição serializada como a tela envia: JSON.stringify do objeto. */
const serializarRequisicao = (requisicao) => JSON.stringify(requisicao);

function declaracaoR2() {
  const bruto = lerArquivo();
  const { requisicao, inventario, constantes } = montarRequisicaoR2(JSON.parse(bruto.toString('utf8')));
  const serializada = serializarRequisicao(requisicao);
  return {
    versao: 'r2',
    arquivo: ARQUIVO,
    sha256Bytes: sha256(bruto),
    papel: 'Requisição de referência dos casos C1, C2 e C3, montada do documento calculations do projeto das 24 saídas publicadas. Demonstra a montagem na condição declarada; NÃO reconstrói a requisição original do projeto.',
    transformacao: {
      modulo: 'scripts/a33-payload-referencia.cjs, montarRequisicaoR2',
      espelho: ESPELHO,
      premissa: 'O projeto existe, como a tela exige. O nome vem de metadata.projectName. As fontes que o arquivo não traz são INDISPONÍVEIS, e não vazias, e recebem o fallback da tela, preservado. A lista de exclusões é a do arquivo, e está vazia.',
      foraDaTransformacao: 'normalizeRequest, dentro do handler, age sobre a requisição como em produção.',
      alcanceDasAncoras: `As âncoras em ${TELA} e ${CALCULO} verificam a presença dos fragmentos escolhidos, com a contagem medida. NÃO demonstram equivalência completa entre a tela e este espelho.`,
    },
    estados: {
      'disponivel': 'está no arquivo, e se usa',
      'derivado': 'se calcula do que está no arquivo, com a regra declarada',
      'indisponivel': 'não se sabe o valor: o arquivo não traz',
      'comprovadamente-vazio': 'a fonte foi consultada e está vazia, com a evidência',
    },
    notaSobreOsEstados: 'Os estados descrevem a disponibilidade da INFORMAÇÃO, e não o valor enviado. Valor enviado por fallback em campo indisponível NÃO é informação medida.',
    inventario,
    constantesDaMontagem: constantes,
    pendenciaA12: PENDENCIA_A12,
    requisicaoSerializada: {
      sha256: sha256(Buffer.from(serializada, 'utf8')),
      bytes: Buffer.byteLength(serializada, 'utf8'),
      comumAosCasos: ['C1', 'C2', 'C3'],
      diferencasEntreCasos: 'USE_RAG_SEMANTIC e recuperação, declaradas por caso em casos.json; a requisição é a mesma nos três.',
    },
    requisicao,
  };
}

module.exports = {
  ARQUIVO, TELA, CALCULO, ANCORAS_DA_TELA, ANCORAS_DO_CALCULO, ESTADOS, TRATAMENTOS, PENDENCIA_A12,
  montarRequisicao, declaracaoR1, montarRequisicaoR2, declaracaoR2, serializarRequisicao, lerArquivo,
};
