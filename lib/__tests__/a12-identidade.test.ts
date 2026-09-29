/**
 * lib/__tests__/a12-identidade.test.ts
 *
 * **A.12: a medição histórica de identidade, CONGELADA.**
 *
 * ⚠ **Este instrumento é de INTEGRIDADE HISTÓRICA, e não executa código de produção.**
 * Ele lê `docs/dados/a12-identidade/medicao-preservada-03c7d8b.json`, a cópia congelada
 * da medição que **justificou a etapa 2**, e confere que ela continua íntegra.
 *
 * ⚠ **O FATO ESTRUTURAL que motivou a separação, medido por leitura.** Até `03c7d8b`
 * este arquivo construía `M` num `beforeAll` que **executava a rota real**, a agregação
 * real e a completude real. Então as suas asserções sobre `M.execucaoObservada`,
 * `M.duasIdentidades`, `M.fonteDoIdentificador`, `M.ondeAIdentidadeCai`,
 * `M.omissaoPorMatrizOuEtapa` e `M.observacaoNumericaNaoNormativa` mediam o
 * **comportamento de hoje**, qualquer que fosse o rótulo. ⚠ **Nomear um commit numa
 * asserção não transforma execução do código atual em medição histórica.**
 *
 * ⚠ **EXCEÇÃO MEDIDA:** partes daquele `M` eram **literais** escritos no `beforeAll`, e
 * não derivavam da execução — `identificadoresNoArtefato` e todo o bloco `vinculo`, com
 * `veredito` e `oQueOArtefatoTem`. Elas **descrevem o documento da base**, e por isso
 * pertencem à leitura congelada. ⚠ **Depois da etapa 2 elas deixaram de descrever o
 * documento atual, e é exatamente por isso que ficam CONGELADAS e não invertidas.**
 *
 * **Onde foi cada controle de comportamento atual:**
 *
 * | Controle | Destino |
 * |---|---|
 * | quatro conjuntos distinguidos | `a12-rastreabilidade.test.ts`, `'MIGRADO: os quatro conjuntos continuam distinguidos…'` |
 * | identidade só para quem ficou de fora | **superado**: `a12-rastreabilidade.test.ts`, ensaios 1 e 4 |
 * | órfã e duplicata caem no caminho | `a12-rastreabilidade.test.ts`, `'MIGRADO: orfa e duplicata caem no caminho…'` e ensaio 4 |
 * | identidade pode vir do DOCUMENTO | `a12-rastreabilidade.test.ts`, ensaio 2 |
 * | identidade cai na agregação | `a12-rastreabilidade.test.ts`, `'MIGRADO: a identidade cai na agregacao…'` |
 * | dois painéis gravam o MESMO documento | **superado**: `a12-rastreabilidade.test.ts`, ensaio 1, invertido |
 * | julgamento alterado muda campo NOMEADO | `a12-rastreabilidade.test.ts`, ensaio 6 e o controle de `'MIGRADO: a identidade cai na agregacao…'` |
 * | observação numérica é observação | `a12-rastreabilidade.test.ts`, ensaio 6, como comparação entre duas execuções |
 * | julgamento omitido reprova por matriz | **coberto**: `completeness.test.ts`, `'26 matrizes e 72 pares, com duas alternativas'`, `'par faltante é rejeitado e a matriz é nomeada'` e `'nomeia a matriz e o que falta nela'`; e `calculate-route.test.ts`, `'resposta incompleta COM completedAt é rejeitada e registrada'` |
 * | sem o portão, célula sem rastro | `a12-rastreabilidade.test.ts`, `'MIGRADO: sem o portao…'` |
 * | código atual não produziu o histórico | metade histórica fica aqui; a metade atual é o ensaio 1 de `a12-rastreabilidade` |
 *
 * ⚠ **Nenhum valor esperado foi invertido no lugar, e
 * `docs/dados/a12-identidade/medicao.json` NÃO foi regravado.**
 *
 * ---
 *
 * ⚠ **A PROCEDÊNCIA DA CÓPIA CONGELADA distingue TRÊS commits, e o nome do arquivo NÃO é
 * o commit em que ela foi preservada:**
 *
 * | Commit | O que é |
 * |---|---|
 * | `03c7d8b` | **versão de origem da cópia**, que é o que o nome do arquivo identifica |
 * | `ec4169d` | **commit que ADICIONOU a cópia**, medido por `git log --diff-filter=A` |
 * | `7157db89…` | **metadado histórico interno da medição**, a base da rodada que a produziu, asserido abaixo |
 *
 * **MEDIÇÃO, e não asserção**, porque `app/api/calculate/route.ts` mudou depois: os quatro
 * resumos de `identificacao.arquivos` da cópia são **exatamente** os arquivos em
 * `03c7d8b`, recomputados por `git show 03c7d8b:<arquivo>`. ⚠ **A recomputação continua
 * possível** sobre os arquivos daquele commit; o que seria incorreto é **comparar esses
 * resumos históricos com os arquivos atuais**.
 */

export {};

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = path.resolve(__dirname, '..', '..');
const ARTEFATO = path.join(RAIZ, 'docs', 'dados', 'a12-identidade', 'medicao.json');

/**
 * ⚠ **A CÓPIA CONGELADA da medição histórica.** É a evidência do estado que a etapa 2
 * corrige, e **não se regrava**.
 */
const PRESERVADO = path.join(
  RAIZ, 'docs', 'dados', 'a12-identidade', 'medicao-preservada-03c7d8b.json'
);
const SHA_PRESERVADO = '85368e20413fc03e735c85c403041c4a09e34ddd44c3f80e021bd424a7b9fe25';
const BYTES_PRESERVADO = 17326;

const sha256 = (b: Buffer | string) =>
  crypto.createHash('sha256').update(typeof b === 'string' ? Buffer.from(b, 'utf8') : b).digest('hex');

/** A medição histórica, LIDA da cópia congelada. Não deriva de execução alguma. */
const CONGELADO = JSON.parse(fs.readFileSync(PRESERVADO, 'utf8'));

// ---------------------------------------------------------------------------
// Preservação
// ---------------------------------------------------------------------------

test('preservacao: a copia congelada tem o resumo e o tamanho declarados', () => {
  expect(fs.existsSync(PRESERVADO)).toBe(true);
  const bytes = fs.readFileSync(PRESERVADO);
  expect(bytes.length).toBe(BYTES_PRESERVADO);
  expect(sha256(bytes)).toBe(SHA_PRESERVADO);
  // ⚠ CONTROLE de que a assercao discrimina: um byte a mais reprovaria.
  expect(sha256(Buffer.concat([bytes, Buffer.from('x')]))).not.toBe(SHA_PRESERVADO);
});

test('preservacao: o artefato da rodada de investigacao continua identico a copia', () => {
  expect(fs.existsSync(ARTEFATO)).toBe(true);
  // ⚠ Os DOIS caminhos sao distintos, e a distincao e testada: nenhuma regravacao do
  //   artefato pode alcancar a copia.
  expect(path.resolve(ARTEFATO)).not.toBe(path.resolve(PRESERVADO));
  expect(sha256(fs.readFileSync(ARTEFATO))).toBe(SHA_PRESERVADO);
});

// ---------------------------------------------------------------------------
// 3.1 O arquivo histórico de 13/07/2026
// ---------------------------------------------------------------------------

test('3.1: o arquivo historico nao tem dados individuais nem identificador de respondente', () => {
  const a = CONGELADO.arquivoHistorico;
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
  const c = CONGELADO.arquivoHistorico.completudeQueRegistra;
  expect(c.oQueNaoE).toMatch(/NAO e completude por respondente/);
  for (const g of ['B', 'O', 'C', 'R']) {
    expect(c.medido[g]).toEqual({ given: 10, possible: 10, isComplete: true, ratio: 1 });
  }
  // E o vínculo com as matrizes é inexistente: elas já vêm agregadas.
  expect(CONGELADO.arquivoHistorico.vinculoComAsMatrizes).toMatch(/JA agregadas/);
  // ⚠ copia antes de ordenar: `sort` muta, e mutar a medicao dentro da assertiva
  // foi defeito medido na primeira execucao daquele instrumento.
  expect([...CONGELADO.arquivoHistorico.oQueTem.matrizesAgregadas].sort())
    .toEqual(['bocr', 'magnitude', 'subcriteria']);
});

// ---------------------------------------------------------------------------
// A delimitação, e o que a medição NÃO alcançava
// ---------------------------------------------------------------------------

test('a conclusao dos paineis estava delimitada ao percurso e a forma de entrada', () => {
  const d = CONGELADO.duasIdentidades;
  expect(d.controleDiscriminante.leitura).toMatch(/NESTES paineis, que nao tem exclusao nem rejeicao/);
  expect(d.controleDiscriminante.alcance).toMatch(/Com exclusao ou rejeicao o documento DISTINGUE paineis/);
  expect(d.conclusaoDoQueFoiMedido).toMatch(/SEM exclusao e SEM rejeicao/);
  expect(d.conclusaoDoQueFoiMedido).toMatch(/neste percurso e nesta forma de entrada/);
  expect(d.oQueAConclusaoNaoAlcanca).toMatch(/identidade de quem saiu/);
  expect(d.oQueAConclusaoNaoAlcanca).toMatch(/rota de backup/);
});

/**
 * ⚠ **A MEDIÇÃO DA BASE que justificou a etapa 2, e ela descreve o documento DE ENTÃO.**
 * Depois da etapa 2 o documento passou a trazer `executionId`, `includedRespondents` e
 * `judgmentsDigest`. **Esta asserção não é sobre o documento de hoje**, e o controle do
 * documento de hoje está em `a12-rastreabilidade.test.ts`.
 */
test('3.4: na base, o vinculo com a execucao ficava NAO DETERMINADO', () => {
  const v = CONGELADO.vinculoComAExecucao;
  expect(v.veredito).toMatch(/^NAO DETERMINADO/);
  expect(v.oQueOArtefatoTem).toEqual(['projectId', 'calculatedAt', 'responseCount']);
  expect(v.oQueIssoDemonstra.responseCount).toMatch(/reconstruir por contagem/);
  expect(v.origemEMutavel.procedencia).toMatch(/LIDO no codigo, nao exercitado/);
  // ⚠ E o que NAO existia no documento da base, nomeado na propria medicao.
  expect(v.oQueNaoExiste).toContain('lista de identificadores incluidos');
});

test('o arquivo historico nao foi produzido pelo codigo desta base, e a medicao nao diz qual foi', () => {
  expect(CONGELADO.versoesDoCodigo.arquivoHistorico)
    .toEqual({ temIpcMetadata: true, temRejectedIncomplete: false });
  expect(CONGELADO.versoesDoCodigo.oQueIstoNaoDemonstra).toMatch(/qual versao o produziu/);
});

test('o registro diz o que NAO demonstra', () => {
  const s = JSON.stringify(CONGELADO.oQueIstoNaoDemonstra);
  expect(s).toMatch(/NAO demonstra qual versao produziu o arquivo historico/);
  expect(s).toMatch(/nenhuma identidade foi reconstruida por posicao ou contagem/);
  expect(CONGELADO.natureza).toMatch(/Nao escolhe, nao implementa, nao integra/);
  expect(CONGELADO.identificacao.commitDaBase).toBe('7157db89ff0fe102bbd36e7d5bc7c4378ab48c67');
});
