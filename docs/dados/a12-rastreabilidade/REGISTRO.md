# A.12 etapa 2: rastreabilidade da execução atual — registro datado

**28/09/2026.** Base `03c7d8bff598762ec0326f2ac43e301c9f45f41e`, cabeça de
`claude/loving-shannon-661fy9` e de `integra/a30-registros`; `main` em
`33c1fdf6500242832994a17aa15b0a686704c029`.

## O que a etapa resolve

O documento gravado passa a registrar **quem entrou** (`metadata.includedRespondents`),
**qual conteúdo foi julgado** (`metadata.judgmentsDigest` e o resumo por incluído) e
**qual execução o produziu** (`executionId`).

## As interrupções que a etapa ACRESCENTOU, e a falha que não interrompe

⚠ **A etapa não é portão NO QUE DIZ RESPEITO AO RESUMO**, e isso não quer dizer que nada
tenha passado a interromper. **Ela acrescentou duas interrupções por IDENTIDADE**, e os
três casos abaixo não podem aparecer sob a mesma descrição:

| Caso | Onde | HTTP | Escreve? | O que nomeia |
|---|---|---|---|---|
| Divergência de identificador entre as quatro etapas de seleção | `app/api/calculate/route.ts:802` | **409** | **não** | `responseDocId`, cada etapa com o seu valor, `valoresDistintos` |
| Identificador repetido depois da deduplicação | `app/api/calculate/route.ts:838` | **409** | **não** | `identificadoresIncluidos` |
| **Falha de resumo** | a montagem, via `lib/julgamentos-resumo.ts` | — | **sim** | ⚠ **NÃO interrompe:** o respondente **continua entrando**, e o registro fica em `judgmentsSha256` nulo com o motivo e o caminho |

**Medido nas execuções desta suíte**, e registrado no bloco observado do artefato: a
execução válida sai **200** com três incluídos; a divergência sai **409**, **não escreve**,
e nomeia as quatro etapas com dois valores distintos; e o caso do `NaN` sai **200**, com o
respondente **ainda incluído**, resultado agregado **idêntico**, e resumos individual e do
painel **nulos** com motivo.

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

## P3: o que o artefato é, e o que ele não é

⚠ **A `natureza` anterior dizia "MEDE O COMPORTAMENTO DE HOJE", e excedia o conteúdo.**
Medido campo a campo: a única parte derivada de execução era `identificacao.codigo`, e todo
o resto era **declarativo** — listas de campos, ordens declaradas, nomes de etapas, limites
e a redação do contrato.

**O que fica:** a `natureza` diz o que o arquivo é; **`classificacaoDosCampos` marca cada
campo como declarativo ou observado**; e as observações derivadas das execuções entram em
**bloco próprio**, `observacoesDasExecucoes`.

⚠ **Sem ponto flutuante no bloco observado**, e a razão é medida: a comparação de resumos
de conteúdo serializado já divergiu entre ambientes nesta tarefa, em `8879360`, com **causa
específica não determinada** e valores divergentes não preservados. Entram apenas
contagens, rótulos, códigos de estado HTTP e resumos de **fixtures fixas** — conferido que
os julgamentos do fixture só contêm inteiros e textos, e um controle do próprio ensaio
reprova se algum número não inteiro entrar no bloco.

## P1: um defeito do serializador, e não esclarecimento

⚠ **Não é esclarecimento do que já funcionava.** `Array.prototype.map` **não visita posição
vazia**, e `join` a renderizava como texto vazio. **Medido executando o módulo publicado em
`6aea771` fora da árvore, em Node v22.22.2:** `Array(1)` dava `[]`, **o mesmo texto e o
mesmo resumo de `[]`**, e `[1, , 3]` dava `[1,,3]`, que **não é JSON válido**.

⚠ **O termo é COLISÃO DE REPRESENTAÇÃO, e nunca colisão do SHA-256:** o resumo coincidia
porque a **entrada canônica** coincidia. ⚠ **Defeito demonstrado no serializador**, e não
se afirma que esse conteúdo exista no Firestore — **produção não se consulta**.

A versão continua `a12-julgamentos-v1`, e a regra de preservação está no contrato. **A
preservação foi conferida:** doze de doze conjuntos do painel de referência e dez de dez
entradas válidas construídas dão representação **idêntica** antes e depois.

## P2: uma cobertura perdida, e não esclarecimento

⚠ O ensaio publicado em `6aea771` comparava **um respondente contra dois**, medindo o
efeito de **retirar um respondente inteiro**. O ensaio original mantinha os dois e marcava
**um julgamento** como `skipped`: a leitura era **participação parcial por célula**.

⚠ **A célula é conferida pela própria `aggregateMatrix`**, e não por cópia da regra de
orientação: com um respondente só, a média geométrica de um valor **é** aquele valor.
**Medido antes de editar**, nas seis células de `bocr|BOCR` entre os respondentes 0 e 1:
`(B,O)` 1 contra 7; `(B,C)` 5 contra 7; `(B,R)` 3 contra 9; `(O,C)` e `(O,R)` 3 contra
`0,142857…`; e `(C,R)` **1 contra 1**. A célula escolhida é `(B,C)`, e `(C,R)` serve de
**controle que não deve mudar**.

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

## D3: a procedência da cópia congelada, com TRÊS commits distinguidos

⚠ **O nome do arquivo NÃO é o commit em que a cópia foi preservada.** São três coisas
diferentes, e cada uma é o que é:

| Commit | O que é |
|---|---|
| `03c7d8b` | **versão de origem da cópia**: é o que o nome do arquivo identifica |
| `ec4169d` | **commit que ADICIONOU a cópia congelada**, medido por `git log --diff-filter=A -- docs/dados/a12-identidade/medicao-preservada-03c7d8b.json` |
| `7157db89ff0fe102bbd36e7d5bc7c4378ab48c67` | **metadado histórico interno da medição**, a base da rodada que a produziu, asserido em `lib/__tests__/a12-identidade.test.ts:161` |

**MEDIÇÃO, e não asserção**, porque `app/api/calculate/route.ts` mudou depois: os quatro
resumos de `identificacao.arquivos` da cópia congelada são **exatamente** os arquivos em
`03c7d8b`, recomputados por `git show 03c7d8b:<arquivo>` e `sha256`:

| Arquivo | `sha256` | confere |
|---|---|---|
| `docs/calculations-13jul2026.json` | `00d1d8a1b70e4cd79d33b267ac8c31cfbf38f71fd9e08d9baf9c278d0db1fa9d` | sim |
| `app/api/calculate/route.ts` | `e912b7d4cf0bdf2cc2d3f7335ec97da1fae5f24f602148a8ab9c6c76b66c937b` | sim |
| `lib/aggregation.ts` | `b3ed77eac53edaad2e4db3f9eeafcd33c4020e3452535987a3a01ede8e2d23e1` | sim |
| `lib/completeness.ts` | `6080500aa2aa1a90ef8dcc79161f1bb9b2cc971c73bf444fd131c15fe05f7a92` | sim |

⚠ **A recomputação continua possível** sobre os arquivos daquele commit. **O que seria
incorreto é comparar esses resumos históricos com os arquivos atuais.**

## Preservados, conferidos por `sha256sum`

| Arquivo | `sha256` | bytes |
|---|---|---|
| `docs/dados/a12-identidade/medicao.json` | `85368e20413fc03e735c85c403041c4a09e34ddd44c3f80e021bd424a7b9fe25` | 17326 |
| `docs/dados/a12-identidade/medicao-preservada-03c7d8b.json` | idem | 17326 |
| `docs/dados/a33-cadeia-rule/medicao-preservada-0d02fab.json` | `a5a8d99632f1fc4251876eb709a674825db0722dd78bed96d9b4f4596351569d` | 223411 |

Referência histórica de `a33-cadeia-rule`: `a6c3b03f…`, 87057 bytes, inalterada.
