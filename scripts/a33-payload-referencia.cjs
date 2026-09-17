/**
 * A.33: a requisição do Parecer IA montada a partir do payload de referência dos
 * casos C1, C2 e C3, `docs/calculations-13jul2026.json`.
 *
 * ⚠ **O arquivo NÃO é a requisição.** É o documento `calculations` do Firestore.
 * A requisição é montada pela tela, em `app/decisor/resultados/[projectId]/page.tsx`,
 * função `runAiReview`, bloco "Preparar payload", que também lê o documento do
 * projeto, as respostas, a análise de qualidade, a demografia e as exclusões.
 * **Nenhuma dessas fontes está no arquivo.**
 *
 * Esta transformação ESPELHA aquele bloco com as fontes ausentes, e declara, campo
 * a campo, o que é LIDO do arquivo, o que é DERIVADO dele e o que vem do valor de
 * AUSÊNCIA da tela. As âncoras de texto em `ANCORAS_DA_TELA` são conferidas por
 * teste: se a tela mudar, o espelho tem de ser revisto.
 *
 * ⚠ A normalização interna da rota, `normalizeRequest`, é parte do handler e fica
 * fora desta transformação: ela age sobre a requisição, como em produção.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const ARQUIVO = 'docs/calculations-13jul2026.json';
const TELA = 'app/decisor/resultados/[projectId]/page.tsx';

const ESPELHO = `${TELA}, runAiReview, bloco "Preparar payload"`;

/**
 * Âncoras de texto da tela, com o número de ocorrências medido. Mudança na tela
 * reprova o teste, e o espelho tem de ser revisto antes de voltar a valer.
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
];

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const lerArquivo = () => fs.readFileSync(path.join(ROOT, ARQUIVO));

/**
 * Monta a requisição e a declaração de origem.
 *
 * Premissa declarada: o projeto EXISTE, como a tela exige para enviar, mas os
 * campos dele não estão no arquivo; e não há análise de qualidade, respostas,
 * demografia, grupos sensíveis nem exclusões. Cada uma dessas ausências recebe o
 * valor que a própria tela usa quando a fonte está vazia.
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

function declaracao() {
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

module.exports = { ARQUIVO, TELA, ANCORAS_DA_TELA, montarRequisicao, declaracao, lerArquivo };
