# A.12 etapa 2: rastreabilidade da execução atual — registro datado

**28/09/2026.** Base `03c7d8bff598762ec0326f2ac43e301c9f45f41e`, cabeça de
`claude/loving-shannon-661fy9` e de `integra/a30-registros`; `main` em
`33c1fdf6500242832994a17aa15b0a686704c029`.

## O que a etapa resolve

O documento gravado passa a registrar **quem entrou** (`metadata.includedRespondents`),
**qual conteúdo foi julgado** (`metadata.judgmentsDigest` e o resumo por incluído) e
**qual execução o produziu** (`executionId`).

## O que ela NÃO resolve, e não se relata como resolvido

- **não preserva execuções anteriores**: o documento é único por projeto e é
  sobrescrito. `executionId` diz **qual execução o documento é**, e não quais houve.
  Preservar o histórico é decisão separada;
- **não preserva o conteúdo julgado**: o resumo **identifica e não guarda**;
- **não vincula a avaliação de qualidade aos incluídos**, que é a etapa 3;
- **não alcança o arquivo histórico de 13/07/2026**, que não foi produzido por este
  código.

## A releitura da seção 5, com o instrumento declarado

**Conferido em `03c7d8b`, por leitura do arquivo.** Em
`app/decisor/resultados/[projectId]/page.tsx` o payload do parecer é montado **chave a
chave**, lendo campos nomeados de `calculation`. ⚠ **Há um espalhamento no intervalo**, em
`:1261`, e é `...payload` — o objeto montado logo acima —, **não** `calculation` nem
`calculation.metadata`. No arquivo inteiro, os únicos espalhamentos com `calculation` são
de `calculation.finalScores`, um array de escores.

`/api/audit-decision` recebe o documento inteiro em `:1476`, e **não faz chamada externa
de inferência**: `grep` por `anthropic`, `openai`, `fetch(` e `messages.create` naquele
arquivo sai **zero**. Ele lê campos nomeados e monta o relatório localmente. `audit` **não
entra** no payload do parecer: zero ocorrências no intervalo. A chamada a
`/api/ai-reviewer` está em `:1278`.

⚠ **Instrumento declarado:** `git grep` pelo literal `api/ai-reviewer` na árvore
rastreada, e `git grep` por `@anthropic-ai/sdk` em `app`, `lib`, `components` e
`scripts`, excluídos os testes — o único arquivo que importa o SDK é
`app/api/ai-reviewer/route.ts`. ⚠ **Busca por literal é apoio à leitura, e não prova de
ausência:** não alcança URL montada por variável, por constante importada, por
concatenação nem por reescrita de rota. **Não se afirma que exista um único chamador no
sistema**; afirma-se o que foi lido, onde, e com que instrumento.

⚠ **Conclusão delimitada: no percurso examinado, acrescentar campos ao documento de
cálculo não altera o que o modelo recebe**, e esta etapa **não exigiu predição**. A regra
continua valendo **pelo efeito**, e não pelo arquivo tocado.

## A classificação dos dezessete ensaios de `a12-identidade`

⚠ **O fato estrutural que decide a classificação, medido por leitura:** `M` era construído
num `beforeAll` que **executava a rota real**, a agregação real e a completude real. Então
asserção sobre `M.execucaoObservada`, `M.duasIdentidades`, `M.fonteDoIdentificador`,
`M.ondeAIdentidadeCai`, `M.omissaoPorMatrizOuEtapa` e `M.observacaoNumericaNaoNormativa`
media o **comportamento de hoje**, qualquer que fosse o rótulo.

⚠ **Exceção medida:** partes de `M` eram **literais** escritos no `beforeAll`, e não
derivavam da execução — `identificadoresNoArtefato` e todo o bloco `vinculo`.

| Ensaio | Classe | Destino |
|---|---|---|
| histórico sem dados individuais | integridade histórica | lê a cópia congelada |
| completude do histórico é da agregada | integridade histórica | lê a cópia congelada |
| quatro conjuntos distinguidos | comportamento atual | `a12-rastreabilidade`, `'MIGRADO: os quatro conjuntos…'` |
| identidade só para quem ficou de fora | comportamento atual | **superado**: ensaios 1 e 4 |
| órfã e duplicata caem no caminho | comportamento atual | `'MIGRADO: orfa e duplicata…'` e ensaio 4 |
| identidade pode vir do DOCUMENTO | comportamento atual | ensaio 2 |
| identidade cai na agregação | comportamento atual | `'MIGRADO: a identidade cai na agregacao…'` |
| dois painéis gravam o MESMO documento | comportamento atual | **superado**: ensaio 1, invertido |
| julgamento alterado muda campo NOMEADO | comportamento atual | ensaio 6 e o controle do `'MIGRADO: a identidade cai…'` |
| delimitação da conclusão | integridade histórica | lê a cópia congelada |
| observação numérica é observação | forma, sobre valores da execução | ensaio 6 |
| vínculo NÃO DETERMINADO | literais, medição da base | **superado**, e fica congelado |
| julgamento omitido reprova por matriz | comportamento atual | **coberto** por `completeness.test.ts` (`'26 matrizes e 72 pares, com duas alternativas'`, `'par faltante é rejeitado e a matriz é nomeada'`, `'nomeia a matriz e o que falta nela'`) e `calculate-route.test.ts` (`'resposta incompleta COM completedAt é rejeitada e registrada'`) |
| sem o portão, célula sem rastro | comportamento atual | `'MIGRADO: sem o portao…'` |
| código atual não produziu o histórico | mista | metade histórica fica; metade atual é o ensaio 1 |
| o registro diz o que NÃO demonstra | integridade histórica | lê a cópia congelada |
| artefato coincide com a medição | mista | virou os dois controles de preservação |

⚠ **Nenhum controle comportamental necessário ficou sem destino, e toda cobertura alegada
nomeia arquivo e teste.**

## A previsão enumerada, e o que ela acertou

Registrada **antes de qualquer edição**. Commit 1: **zero** reprovações. Commit 2: **zero**
reprovações nas suítes existentes. Commit 3: **três asserções**, todas em
`a12-identidade.test.ts` — `ocorrenciasDeIdentificadorIncluido` `toEqual([])`,
`documentosIguais` `toBe(true)`, e o laço `gravado[chave]` `toEqual(M[chave])` na chave
`execucaoObservada`. **Conferiu exatamente, e nenhuma reprovação fora dela.**

⚠ **DUAS CORREÇÕES À LEITURA DE PRIMEIRA PASSAGEM DO PROMPT**, e vieram da leitura:

- `veredito` e `oQueOArtefatoTem` **não reprovam**, porque são **literais** no
  `beforeAll`. O que muda neles é a **verdade**, e não o resultado do teste: depois da
  etapa 2 eles deixam de descrever o documento atual. **É razão para congelar, e não para
  inverter.** O mesmo vale para `identificadoresNoArtefato`;
- `chavesDeTopo` `toBe(21)` **não é alcançada**, porque `documentosIguais` aborta o ensaio
  antes. O mesmo vale para `respostaDaRotaTrazListaDeIncluidos`.

✅ **Confirmadas as três que a seção 9 lia como NÃO reprovando** — `sha256DaEstrutura`,
`folhas` e `estruturaIgual`: os caminhos de chave incluem o índice do array, e os dois
painéis têm o mesmo número de incluídos.

## Um achado que custou dois controles

⚠ **O primeiro julgamento `bocr` do fixture é `B×O` com `favors: 'equal'`**, e
`lib/aggregation.ts` **força `saatyValue = 1` nesse ramo**. Dois controles discriminantes
escritos nesta rodada escolheram esse julgamento **por posição**, alteraram o seu
`saatyValue` e **não discriminaram**: o resultado agregado não mudou. A escolha passou a
ser **explícita e conferida**, por `bocrQueAAgregacaoLe`, que exige `favors !== 'equal'`,
`!skipped` e `saatyValue != null`. ⚠ **Um controle que não reprova não demonstra nada**, e
o defeito só apareceu porque os dois controles existiam.

## Mudança estrutural declarada

A cadeia de identificação saiu de `app/api/calculate/route.ts` para
`lib/identificador-respondente.ts`, **porque um arquivo de rota do Next.js não pode
exportar símbolo arbitrário**: `tsc` reprova com `TS2344`. ⚠ **A preservação do
comportamento é DEMONSTRADA**, elo por elo, sobre a função real do módulo, e não suposta.
`extractRespondentId` é **reimplementado sobre** `identificarRespondente`, e não ao lado
dela: a cadeia existe uma vez só.

## Preservados, conferidos por `sha256sum`

| Arquivo | `sha256` | bytes |
|---|---|---|
| `docs/dados/a12-identidade/medicao.json` | `85368e20413fc03e735c85c403041c4a09e34ddd44c3f80e021bd424a7b9fe25` | 17326 |
| `docs/dados/a12-identidade/medicao-preservada-03c7d8b.json` | idem | 17326 |
| `docs/dados/a33-cadeia-rule/medicao-preservada-0d02fab.json` | `a5a8d99632f1fc4251876eb709a674825db0722dd78bed96d9b4f4596351569d` | 223411 |

Referência histórica de `a33-cadeia-rule`: `a6c3b03f…`, 87057 bytes, inalterada.
