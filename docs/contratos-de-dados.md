# ahp-simple: contratos de dados

Formato exato de cada coleção do Firestore e de cada rota de API, com quem grava
e quem lê. Abrir antes de tocar em qualquer campo.

Estado do commit `237e0fb`. Formas extraídas do dado real em produção, não da
tipagem, porque as duas divergem em vários pontos.

---

## Armadilhas que custam tempo

**1. `aggregatedMatrices` são strings JSON, não arrays.** Os três campos
(`bocr`, `magnitude` e cada entrada de `subcriteria`) vêm serializados. É preciso
`JSON.parse` antes de usar. A tipagem não avisa.

**2. `finalScores` é array, `altScores` é mapa.** Dois formatos para coisas
relacionadas. `finalScores` é `[{code, name, ...}]`; `altScores` é
`{B1: {A1, A2}, ...}`.

**3. `rescalingWeights` usa chaves `sb`, `so`, `sc`, `sr`**, não `B`, `O`, `C`,
`R`. Ordem é benefícios, oportunidades, custos, riscos.

**4. `subConsistency` traz `cr` e `lambda`, sem `ci`.** Já `bocrConsistency` e
`magnitudeConsistency` trazem os três.

**5. Nada é recalculado na leitura.** O `calculations/{projectId}` e o subobjeto
`responses` de cada resposta são caches gravados uma vez e nunca invalidados. O
documento em produção é de 07/05/2026, anterior à unificação do motor.

**6. `isSimulated` e `modoConsistencia` são assinatura do simulador removido.**
Ausência de `isSimulated` não significa `false`: o `/api/calculate` nunca gravou
esse campo.

---

## Firestore

### `projects/{projectId}`

Gravado por `projetos/page.tsx:1072` (criação) e `:1037` (edição).

| Campo | Tipo | Nota |
|---|---|---|
| `name` | string | |
| `description` | string | |
| `objective` | string | objetivo da decisão, exibido ao especialista |
| `timeHorizon` | `'short' \| 'medium' \| 'long'` | |
| `industrialContext` | string | |
| `budgetReference` | string | texto livre, ex. "R$ 5–20 milhões" |
| `alternatives` | `Alternative[]` | ver abaixo |
| `status` | `'draft' \| 'active' \| 'closed'` | |
| `isOpen` | boolean | abertura da pesquisa, independente de `status` |
| `ownerId` | string | |
| `createdAt`, `updatedAt` | ISO string | |

`Alternative`: `code`, `name`, `description`, `scope`, `trl` (1–9),
`investmentRange`, `timeline` (`'3-6' \| '6-12' \| '12-24' \| '24+'`),
`references`, `impacts` (mapa código de subcritério → texto).

⚠ `sensitiveGroups` aparece em código mas não no dado real. Verificar antes de
usar.

### `respondents/{respondentId}`

Gravado por `avaliacao/page.tsx` em cinco pontos ao longo do fluxo.

| Campo | Tipo |
|---|---|
| `projectId` | string |
| `email` | string |
| `accessCode` | string de 6 dígitos |
| `status` | `'pending' \| 'started' \| 'completed'` |
| `demographics` | objeto, ver abaixo |
| `createdAt`, `consentAcceptedAt`, `startedAt`, `completedAt` | ISO string |

`demographics`: `idade` (`'41_50'`), `genero`, `formacao`, `areaFormacao`,
`tempoTrabalho` (`'21_30'`), `tempoGestor` (`'11_20'`), `areaAtuacao`, `funcao`,
`submittedAt`. Todos são códigos, não rótulos; a tradução está em `lib/data.ts`.

### `responses/{auto}` — DADO PRIMÁRIO

Gravado por `avaliacao/page.tsx:1082-1087`.

| Campo | Tipo | Nota |
|---|---|---|
| `projectId` | string | |
| `respondentId` | string | ⚠ chave de deduplicação em `/api/calculate` |
| `judgments` | `Judgment[72]` | **o dado primário** |
| `responses` | objeto derivado | ⚠ cache congelado |
| `currentIndex`, `currentBlockIndex` | int | progresso |
| `completedAt`, `updatedAt` | ISO string | ⚠ `completedAt` é o filtro de inclusão |
| `isSimulated` | boolean | resíduo |

**`Judgment`** (o formato mais importante do sistema):

```
{
  type: 'bocr' | 'magnitude' | 'subcriteria' | 'alternatives',
  group: 'BOCR' | 'MAGNITUDE' | 'B'|'O'|'C'|'R' | 'B1'..'R5',
  itemA: string,
  itemB: string,
  saatyValue: number,        // 1 a 9
  favors: 'A' | 'B' | 'equal',
  rawSlider: number,         // -8 a 8
  skipped?: boolean
}
```

Distribuição dos 72: 6 `bocr`, 6 `magnitude`, 40 `subcriteria` (10 por mérito),
20 `alternatives` (1 por subcritério).

**Orientação do valor.** Para a posição `[i][k]` da matriz: `favors === 'equal'`
vira 1; `favors === 'B'` e `itemA === items[i]` inverte; `favors === 'A'` e
`itemA === items[k]` inverte. Errar isso transpõe a matriz em silêncio.

**`responses`** (derivado, cache): `avgCR`, `bocrWeights` (array de 4),
`bocrConsistency` (`{cr, lambda, ci}`), `magnitudeWeights`,
`magnitudeConsistency`, `subWeights` (`{B,O,C,R: number[5]}`), `subConsistency`.

⚠ Calculado no cliente na submissão. `response-quality/route.ts:166` e
`resultados/page.tsx:66` recalculam por conta própria, o que já produziu
divergência entre dashboard e planilha.

### `calculations/{projectId}` — RESULTADO

Gravado **só** por `calculate/route.ts:1320`, via `setDoc`. Lido por
`resultados/page.tsx:1465`.

| Campo | Tipo | Quem lê |
|---|---|---|
| `projectId`, `calculatedAt`, `responseCount` | string, string, int | dashboard, IA |
| `executionId` | string opaca, **uma por execução** | rastreabilidade |
| `bocrWeights` | `number[4]` ordem B,O,C,R | dashboard, IA, gráficos |
| `bocrConsistency` | `{cr, ci, lambda}` | `BOCRConsistencyMatrix`, IA |
| `rescalingWeights` | `{sb, so, sc, sr}` | síntese, IA |
| `magnitudeConsistency` | `{cr, ci, lambda}` | `BOCRConsistencyMatrix` |
| `subWeights` | `{B,O,C,R: number[5]}` | `BOCRPrioritiesTable`, IA |
| `subConsistency` | `{B,O,C,R: {cr, lambda}}` | `BOCRConsistencyMatrix` |
| `aggregatedMatrices` | ⚠ `{bocr: string, magnitude: string, subcriteria: {B,O,C,R: string}}` | `validate-external` |
| `altScores` | `{[subcódigo]: {A1: number, A2: number}}` | síntese, dominância |
| `altMeritScores` | `[{code, name, B, O, C, R}]` | gráficos |
| `bocrPrioritiesTable` | `[{code, name, B, O, C, R, C_reciprocal, R_reciprocal}]` | `BOCRPrioritiesTable` |
| `finalScores` | ver abaixo | dashboard, IA, exports |
| `ranking` | `[{position, code, name}]` | dashboard |
| `methodConcordance` | ver abaixo | `MethodComparisonTable`, IA |
| `sensitivityAnalysis` | `[4 x {merit, meritName, inflectionPoint, classification, classificationLabel, currentWinner, newWinner, changeDescription, currentWeight}]` | ⚠ `classification` é o construto a remover |
| `sensitivityInflections` | `{B,O,C,R: number \| null}` | IA |
| `sensitivityTrajectories` | `{B,O,C,R: [21 x {weight, scores:{A1,A2}, winner, inflection}]}` | `SensitivityAnalysisPanel` |
| `alerts` | `{hasNegativePriorities, negativeAlternatives, sensitivityCritical, lowConcordance}` | `NegativePriorityAlert` |
| `metadata` | ver abaixo | dashboard |
| ~~`ipcMetadata`~~ | **removido em `0ac4e95`, com A.21.** A rota não grava mais o campo; documentos gravados antes ainda o têm até a próxima recomputação. Nunca chegou ao Parecer IA: o dashboard não o enviava |

**`finalScores[i]`** — 24 campos por alternativa:

```
code, name,
B, O, C, R,                    // prioridade em cada mérito
C_reciprocal, R_reciprocal,    // 1 - valor, para leitura direta
scoreSubtractive,       scoreSubtractiveNorm,       rankSubtractive,
scoreQuotientSums,      scoreQuotientSumsNorm,      rankQuotientSums,
scoreAdditiveResidual,  scoreAdditiveResidualNorm,  rankAdditiveResidual,
scoreMultiplicative,    scoreMultiplicativeNorm,    rankMultiplicative,
scoreMultSimple,        scoreMultSimpleNorm,        rankMultSimple,
isNegative
```

⚠ `scoreMultiplicative` é o multiplicativo **de potências**; `scoreMultSimple` é
o de pesos unitários. Os nomes não deixam isso claro.

**`methodConcordance`**: `totalMethods`, `agreeMethods`, `agreementPercent`,
`consensusWinner`, `divergentMethods[]`, `rankingsByMethod`
(`{Subtractive, QuotientSums, AdditiveResidual, Multiplicative, MultSimple: [códigos em ordem]}`),
`robustnessLevel`, `robustnessLabel`.

⚠ `robustnessLevel` chama de robustez a concordância entre métodos. Sob
dominância estrita isso é consequência algébrica. É o construto que o artigo
distingue.

**`metadata`**: `projectName`, `alternativesCount`, `methodsCount`,
`primaryMethod`, `version`, `q1Features[]`, `references{}`,
`excludedRespondentIds[]`, `rejectedIncomplete[]`.

⚠ **Os dois últimos são coisas diferentes, e o campo separado é deliberado:**

| | `excludedRespondentIds` | `rejectedIncomplete` |
|---|---|---|
| Origem | decisão metodológica do gestor, vem no corpo do POST | portão de integridade, decidido pelo sistema |
| Justificativa | exige fundamentação (ver F05) | nenhuma: é dado inválido |
| Forma | `string[]` de respondentId | `[{respondentId, matrizes: string[]}]` |
| Valor esperado hoje | `[]` | `[]` — **zero legados incompletos**, medido nos 864 julgamentos |

**No mesmo campo, um defeito de coleta passaria a parecer decisão de pesquisa.** A
rejeição vale para a resposta **no estado examinado**: completada depois, ela passa
a ser válida.

---

## Rotas de API


#### A.12 etapa 2: rastreabilidade da execução atual

**Três campos novos.** ⚠ **O que NÃO é portão é o RESUMO:** nenhum respondente deixa de
entrar no cálculo por causa de `judgmentsSha256`, e falha de serialização não interrompe.
⚠ **A etapa ACRESCENTOU interrupções, e elas são por IDENTIDADE**, não por resumo: são as
duas de HTTP 409 descritas abaixo, que **param a execução e não escrevem**.

`executionId`, de topo, diz **qual execução** o documento é. Opaco, sem significado de
ordem, e **não derivado de `calculatedAt`**: instante não é identidade, e duas execuções
podem cair no mesmo milissegundo.

`metadata.includedRespondents`, **ordenado por `respondentId` ascendente** — ordem de
retorno do Firestore não é propriedade dos dados —, com um item por incluído:

| Campo | O que é |
|---|---|
| `respondentId` | o valor da etapa **`deduplicacao`**, declarada como **etapa de origem**: é a chave sob a qual respostas foram colapsadas numa única identidade, e que o restante do percurso herda |
| `responseDocId` | `docSnap.id`, capturado **antes do espalhamento**. ⚠ O espalhamento vem depois de `id: docSnap.id`, então um campo `id` gravado no documento **sobrescreve** o id do documento |
| `identifierSource` | um dos nove rótulos, e cada um **nomeia a expressão lida no código**. ⚠ `'response.id'` **não é** sinônimo de id do documento, pelo motivo acima. ⚠ `'fallbackPorIndice'` é **identidade por posição**, e registrá-la a torna visível |
| `judgmentsSha256` | o resumo, ou **`null`** — nunca zero, vazio ou resumo de outra coisa |
| `judgmentsUnavailableReason` | o motivo **com o caminho**, quando o resumo faltar |

⚠ **Excluídos e rejeitados não entram nessa lista**, e continuam nos seus campos, de
propósito distinto: exclusão é decisão do gestor, rejeição é dado inválido decidido pelo
sistema.

⚠ **A concordância entre as quatro etapas de seleção é EXIGIDA, e não suposta.** Os
valores de `validacaoCruzada`, `deduplicacao`, `filtroDeExcluidos` e `portaoDeCompletude`
têm de coincidir para todo incluído. ⚠ O log do fallback fica **fora** da concordância, por
**não ser etapa de seleção**, e a exclusão é deliberada.

##### As DUAS interrupções por identidade, e a falha de resumo, que é outra coisa

⚠ **Três casos, e eles não podem aparecer sob a mesma descrição.** Os dois primeiros são
**por identidade**: **param a execução** e **não escrevem**. O terceiro **não interrompe**.

| Caso | Onde | Quando | HTTP | Escreve? | O que nomeia |
|---|---|---|---|---|---|
| Divergência de identificador | `app/api/calculate/route.ts:802` | os identificadores das quatro etapas divergem para algum incluído | **409** | **não** | `responseDocId`, cada etapa com o seu valor, e `valoresDistintos` |
| Identificador repetido | `app/api/calculate/route.ts:838` | aparece identificador repetido na lista montada **depois** da deduplicação | **409** | **não** | `identificadoresIncluidos` |
| **Falha de resumo** | `lib/julgamentos-resumo.ts`, via a montagem | a serialização recusa o conteúdo de um respondente | — | **sim** | ⚠ **NÃO interrompe:** o respondente **continua entrando**, `judgmentsSha256` fica `null` e `judgmentsUnavailableReason` traz o motivo **com o caminho** |

⚠ **A repetição depois da deduplicação é sinal de que a premissa mudou**, e por isso para
em vez de desempatar em silêncio.

`metadata.judgmentsDigest`: `{ algorithm: 'sha256', serialization, panel, unavailableReason }`.
O resumo do painel é o `sha256` da serialização da lista de pares
`[respondentId, judgmentsSha256]` **ordenada por `respondentId`** ascendente.

**Regras da versão `a12-julgamentos-v1`**, em `lib/julgamentos-resumo.ts`:

1. chaves de objeto **ordenadas** ascendentemente por unidade de código UTF-16, em todos
   os níveis;
2. **ordem dos arrays preservada**: a ordem dos julgamentos é conteúdo;
3. `undefined` **omitido** em objeto; `undefined` **dentro de array** é erro nomeado;
4. `null` **preservado**, e distinto de ausente — `saatyValue: null` marca comparação
   pulada;
5. números pela serialização padrão, com `-0` normalizado para `0`; `NaN` e infinitos são
   **erro nomeado com o caminho**;
6. `Date`, `Map`, carimbo do Firestore e instância de classe são **erro nomeado com o
   caminho**, e não coagidos em silêncio;
7. sem indentação; bytes UTF-8 para o resumo.

#### Correção datada da v1, em 29/09/2026

⚠ **As sete regras acima NÃO estavam integralmente implementadas antes desta data**, e
esta correção é a condição para que a afirmação de implementação integral apareça:

- a **regra 3** cobria `undefined` **explícito** e **não** cobria **posição vazia** de
  array. `Array.prototype.map` não visita posição vazia, e `join` a renderizava como texto
  vazio;
- a **regra 7** produzia **texto que não é JSON válido** quando o buraco estava no meio.

**Medido, executando o módulo publicado em `6aea771` fora da árvore, em Node v22.22.2:**

| Entrada | Saída antes | JSON válido |
|---|---|---|
| `[]` | `[]` | sim |
| `Array(1)` | `[]`, **o mesmo texto e o mesmo resumo de `[]`** | sim |
| `Array(2)` | `[,]` | **não** |
| `[1, , 3]` | `[1,,3]` | **não** |
| `[1, undefined, 3]` | erro nomeado, `$[1]` | não se aplica |

⚠ **O termo é COLISÃO DE REPRESENTAÇÃO, e nunca colisão do SHA-256:** o resumo coincidia
porque a **entrada canônica** coincidia. ⚠ **Defeito demonstrado no serializador. Não se
afirma que esse conteúdo exista no Firestore.**

**A versão continua `a12-julgamentos-v1`**, e a regra de preservação é esta:

> Para entradas válidas segundo o contrato corrigido, a representação permanece idêntica.
> A mudança deliberada é a recusa de posições vazias, antes processadas incorretamente.
> Qualquer outra alteração de representação é parada.

⚠ **A preservação foi conferida:** os doze conjuntos de julgamentos do painel de referência
e dez entradas válidas construídas cobrindo as sete regras dão **representação idêntica**
antes e depois, doze de doze e dez de dez.

⚠ **LIMITE:** **não foi verificado se algum documento em produção já carrega um resumo**,
porque **produção não se consulta**.

⚠ **Correção de redação na mesma rodada:** `undefined` na **raiz** passou a ter mensagem
própria. Antes ela dizia "dentro de array" com caminho `$`, afirmando um array que não
existe. ⚠ **No percurso da rota é inalcançável**, porque o portão de completude rejeita
antes: é precisão de redação, e não defeito de comportamento.

**OS QUATRO LIMITES, e eles não se apagam com a implementação.**

> O resumo identifica a representação canônica dos julgamentos segundo a versão
> declarada. Sua igualdade é evidência de igualdade dessa representação, sob a hipótese
> de ausência de colisão SHA-256; não demonstra identidade do objeto bruto nem de toda a
> entrada do cálculo.

⚠ **Por que não se pode dizer "conteúdo recebido igual":** a própria versão v1 omite
`undefined` em objeto e normaliza `-0`, então **objetos brutos distintos podem ter a mesma
representação canônica**, independentemente de colisão criptográfica.

⚠ **Resumo diferente NÃO implica resultado agregado diferente.** `lib/aggregation.ts` lê
apenas `type`, `group`, `itemA`, `itemB`, `skipped`, `saatyValue` e `favors`. **Medido:**
`.rawSlider` não aparece nenhuma vez como acesso de propriedade naquele arquivo.

⚠ **O resumo do painel não identifica documentos nem a ordem de processamento.** Essas
duas coisas têm campos próprios: `responseDocId` e a ordenação declarada da lista.

⚠ **A sobrescrita apaga execuções anteriores.** O documento é **único por projeto** e é
regravado a cada cálculo: `executionId` diz **qual execução o documento é**, e **não**
quais execuções houve. Preservar o histórico é decisão separada. ⚠ **A afirmação vale
para o percurso examinado**, a rota `calculate` gravando em `calculations`.

⚠ **O resumo IDENTIFICA e NÃO PRESERVA:** depois de uma sobrescrita das respostas, ele não
recupera o que foi julgado.


#### A.12 etapa 3, estágio 1: o vínculo da avaliação de qualidade com a execução

**Campo novo no payload de `POST /api/ai-reviewer`, `vinculoDaExecucao`**, separado de
`avaliacaoDeQualidade`, que é contrato da etapa 1 e não muda. A tela lê
`metadata.includedRespondents` do documento de cálculo, compara com o conjunto que ela mesma
avalia e envia o resultado. Onde mora cada parte: a decisão, em
`lib/ai-reviewer/vinculo-execucao.ts` (puro, sem nenhuma importação); a fiação, em
`runAiReview`, na tela; a cópia, em `normalizeRequest`; e o bloco, no contexto, entre a
filtragem de respondentes e a lista exaustiva.

⚠ **Este estágio REPRESENTA o vínculo, e NÃO decide o que a divergência faz com a
classificação.** Nenhuma causa nova entra em `elegivelParaClassificacao`, e nada altera
`calculateGrade`, penalidades, limiares ou faixas. A regra, literal:

> O estado do vínculo, isoladamente, não acrescenta causa de suspensão nem altera a elegibilidade. Alterações decorrentes do novo conjunto avaliado continuam sujeitas às regras existentes da etapa 1 e devem ter seus efeitos previstos e testados.

⚠ **O que `vinculado` significa:** correspondência de identificadores segundo as regras
declaradas abaixo. Isso não comprova que os CRs foram calculados sobre as versões registradas,
e nenhum resumo é verificado.

⚠ **O limite, na redação obrigatória:**

> O módulo atual não pode ser importado diretamente pelo navegador, pois depende de APIs do Node. Este estágio não implementa verificação de conteúdo no navegador nem no servidor.

`lib/julgamentos-resumo.ts` não é importado pela tela nem pelo módulo do vínculo, e não existe
segunda implementação da serialização: os resumos são **transportados** como texto.

##### Os quatro estados, avaliados nesta ordem

| Estado | Quando | Restrição | Listas de divergência | Resumos | Parecer |
|---|---|---|---|---|---|
| `indisponivel` | `includedRespondents` **ausente** ou `executionId` **ausente** | **não ocorre** | `null`, e não vazias | não viajam | não bloqueia |
| `invalido` | presentes, mas inutilizáveis por uma regra de boa formação | **não ocorre** | `null`, e não vazias | só os de painel, **sem** o mapa por incluído | não bloqueia |
| `vinculado` | correspondência **um a um** entre `incluidosNoDocumento` e `avaliadosAntesDaRestricao` | ocorre, e é **identidade** | `[]`, e isso é medição | viajam | não bloqueia |
| `divergente` | qualquer diferença, com as **duas** listas conservadas | ocorre | o que sobrou de cada lado | viajam | não bloqueia |

**Regras de boa formação**, cada uma com motivo próprio, todas avaliadas: `includedRespondents`
não é array; array **vazio**; item sem `respondentId`; `respondentId` que não é string;
`respondentId` vazio; `respondentId` **repetido**; `executionId` que não é string não vazia.
O estado `invalido` conserva **todas** as violações em `violacoes`, e o `motivo` nomeia a
primeira. ⚠ **Ausente, vazio e malformado são três coisas:** lista vazia é `invalido`, e não
`indisponivel` nem `vinculado`; dois conjuntos vazios **não** são coincidentes.

⚠ **`indisponivel` é o estado ESPERADO dos documentos gravados antes da etapa 2**, e não é
falha. É inferência sobre produção, que não se consulta; o que foi **medido** é que o
snapshot versionado de 13/07/2026, que **não é produção**, dá `indisponivel`.

##### Três conjuntos, e a comparação vem ANTES da restrição

| Conjunto | O que é |
|---|---|
| `incluidosNoDocumento` | `metadata.includedRespondents` do documento de cálculo |
| `avaliadosAntesDaRestricao` | os respondentes da avaliação de qualidade, **antes** de qualquer restrição |
| `enviados` | os que de fato vão no payload, **depois** da restrição |

As duas diferenças, `sobraNoDocumento` e `sobraNaAvaliacao`, são calculadas sobre os dois
primeiros conjuntos, **antes** da restrição, e nenhuma se reconstrói a partir de `enviados`:
restringir primeiro apagaria a sobra do lado da avaliação por construção. ⚠ **A comparação
preserva multiplicidade:** identificador repetido no lado da avaliação é **achado**
(`repetidosNaAvaliacao`), as ocorrências se conservam, o estado é `divergente`, e **não há
desempate** por ordem, por posição nem por recência. ⚠ O contexto distingue a **divergência
encontrada** da **cobertura efetivamente enviada**.

##### A origem da lista avaliada, e a identidade de cada elemento

A origem é **selecionada depois das exclusões que a tela já aplica e antes da restrição**:
`analiseDeQualidade` quando há respondentes ativos da API de qualidade; senão
`fallbackSobreRespostas`, quando há respostas ativas; senão `nenhuma`. ⚠ **A restrição nunca
reabre o fallback:** a lista enviada é sempre subconjunto da selecionada, e a lista da
**outra** origem volta vazia.

Cada elemento registra o identificador **e o campo que o produziu**:

| Origem | Expressão | Campos possíveis |
|---|---|---|
| `analiseDeQualidade` | `respondentId \|\| id \|\| visitorId \|\| ''`, a do filtro de excluídos | `respondentId`, `id`, `visitorId`, `vazio` |
| `fallbackSobreRespostas` | `visitorId \|\| id \|\| resp-${idx + 1}`, a de `id:` em `respondentesComCR` | `visitorId`, `id`, `posicao` |

⚠ **As duas cadeias NÃO foram unificadas**, e a ordem difere: no fallback, `visitorId` vem
antes de `id`, e `respondentId` **não está na cadeia**. ⚠ **`vazio` e `posicao` são identidade
AUSENTE:** entram na `sobraNaAvaliacao` com motivo próprio (`identidade-ausente-vazia`,
`identidade-ausente-por-posicao`) e **nunca** correspondem a ninguém. Nada nesta etapa
reconstrói identidade por posição ou por contagem. `posicaoNaLista` é **localizador**, e
não identidade.

##### O que viaja em `vinculoDaExecucao`

`estado`, `motivo`, `violacoes`, `executionId`, `origemDaListaAvaliada`,
`avaliadosAntesDaRestricao[]`, `incluidosNoDocumento`, `divergencia{sobraNoDocumento,
sobraNaAvaliacao, repetidosNaAvaliacao}`, `enviados`, `cobertura{restringiu,
avaliadosAntesDaRestricao, enviados, incluidosNoDocumento, enviadosDiferemDosAvaliados,
enviadosIguaisAoDocumento}` e `resumoDoConteudo`. Este, **transportado e declarado não
verificado** (`verificado: false`), traz `serialization`, `algorithm`, `panel` e
`unavailableReason` de `metadata.judgmentsDigest` em `painel`, o `mapaPorRespondentId` e três
listas. ⚠ **O mapa é chaveado por `respondentId`, e NUNCA por posição nem por ordem**; cada
entrada é `{ responseDocId, judgmentsSha256, judgmentsUnavailableReason }`. ⚠ **O mapa e
`judgmentsDigest.panel` cobrem `incluidosNoDocumento`**, e não `enviados`; quando `enviados`
difere do documento, o contexto diz que o resumo do painel **não descreve o conjunto
enviado**.

##### A regra de valor, e as três listas

- `null`: comparação não realizada. É o valor de `sobraNoDocumento`, `sobraNaAvaliacao`,
  `repetidosNaAvaliacao`, do mapa e das três listas abaixo em `indisponivel` e `invalido`.
- `[]`: comparação **realizada, sem ocorrência**.
- Resumo individual indisponível permanece `null`, **com motivo**, e nunca vira string vazia,
  zero ou resumo de outra pessoa. Resumo **e** motivo juntos no documento se conservam os
  dois: contradição não se resolve em silêncio.

⚠ **Identidade coincidente não é resumo disponível.** A etapa 2 admite identificador
coincidente com `judgmentsSha256: null`, e esse respondente continua sem resumo. Por isso
são **três** listas, e elas não se confundem: `enviadosSemEntradaNoMapa` (em `enviados` e sem
entrada), `enviadosComResumoIndisponivel` (entrada presente, `judgmentsSha256` nulo, com o
motivo) e `entradasDeNaoEnviados` (entrada cujo identificador não está em `enviados`).

##### O que o modelo recebe

Três efeitos independentes, cada um com o seu alcance:

1. **O bloco do contexto** (`## DADOS DO SISTEMA — VÍNCULO DA AVALIAÇÃO DE QUALIDADE COM A
   EXECUÇÃO DO CÁLCULO`), nos quatro estados. Declara estado, identificador da execução,
   divergência e cobertura enviada, e **não emite veredito**. Requisição **sem** o campo
   gera contexto **byte a byte** igual ao anterior ao estágio, e isso inclui as frases ao
   redor do bloco. **COM** o campo, essas frases também mudam (subseção seguinte). Uma frase de
   limite é a única com palavras de verificação, e todas negadas.
2. **A restrição do conjunto avaliado** (P1), em `vinculado` (onde é identidade) e
   `divergente` (onde muda a lista e o N que o contexto declara). ⚠ Retirar respondentes pode
   mudar disponibilidade, completude e coerência **pelas regras da etapa 1**, sem tocar na
   função de elegibilidade: esse efeito é do conjunto, e não do estado.
3. **A omissão de `qualityAnalysis.overall`** quando `enviados` difere de
   `avaliadosAntesDaRestricao`. ⚠ **Sem efeito sobre o texto entregue:** `overall` não tem
   consumidor no código atual. Fica como guarda de transporte.

##### As frases AO REDOR do bloco: população, etapa e relação (correções antes do aceite)

⚠ **Escopo, decidido nesta rodada.** A redação abaixo vale **COM** `vinculoDaExecucao`, nos quatro
estados e em formato não reconhecido. **SEM** o campo, o contexto segue **byte a byte** o de
`a973c8f`, com as afirmações que ele já trazia; ampliar a correção a esse caminho é decisão do
autor e exige regravar as linhas de base. ⚠ A cláusula "com o campo, a única diferença é o bloco
inserido" **deixa de valer**: a lista de respondentes, o bloco de exclusão e a regra de menção
também mudam.

**O defeito.** O contexto afirmava, em frases ao redor do bloco, uma população que o próprio
vínculo contradiz: a lista **enviada** como "COMPLETA — não existem outros", como participação
plena de todos e como o "N = …" de **todas** as matrizes agregadas; a contagem de restantes da
exclusão do gestor como a dos "dados de qualidade abaixo", calculados sobre a lista enviada; e a
regra de menção proibindo citar quem o bloco nomeia.

**Três regras.**

1. **Cada contagem nomeia a sua população e a etapa a que se refere**, e cálculo, avaliação e envio
   **não são sinônimos**:

   | População | Etapa | Onde o contexto a conta |
   |---|---|---|
   | amostra coletada | coleta | `exclusionInfo.totalCollected` |
   | restantes após a exclusão do gestor | exclusão do gestor, **anterior** a qualquer restrição do vínculo | `exclusionInfo.activeCount` (`page.tsx:1338` em `a973c8f`) |
   | excluídos pelo gestor | exclusão do gestor | `exclusionInfo.excludedCount` |
   | incluídos no documento de cálculo | cálculo | `metadata.includedRespondents`, no bloco e na linha de cálculo |
   | avaliados antes de qualquer restrição | avaliação de qualidade | no bloco |
   | enviados a você | envio | a lista de respondentes e as contagens por status |

   ⚠ O contexto também informa a amostra coletada e os excluídos pelo gestor, que **não** são
   nenhuma das três populações do vínculo. A **chave de leitura** do bloco define as populações e as
   etapas. Onde a linha **afirma** uma população (exclusão, total da lista, cálculo, contagens por
   status) o rótulo vai **na própria linha**. As distribuições que esta rodada **não reescreve**
   (`Total: N especialistas`, as quatro contagens por status, `Taxa de Validade Geral` e os quatro
   `Respostas totais` por dimensão) ficam cobertas **só pela chave**, e são **dez** linhas no cenário
   do inventário de `vinculo-execucao-fiacao.test.ts`. ⚠ `Respostas totais` por dimensão **não é
   população medida:** quando a requisição traz o total agregado, como a da tela, `normalizeRequest`
   o reparte por quatro, arredondando para baixo (`route.ts:559-588` em `a973c8f`). Isso não é objeto
   desta correção, e a chave apenas diz que esses totais não medem participação nem são o N de
   matriz alguma.
   ⚠ **Superado em 30/09/2026 (A.12, estatísticas por dimensão, saída A):** hoje as linhas cobertas só pela chave
   são **seis**, e não dez, porque as quatro `Respostas totais` por dimensão **saíram** do bloco;
   `normalizeRequest` **não reparte mais** o agregado; e o item da chave **não descreve mais** a divisão. O
   parágrafo acima descreve o comportamento de `a973c8f` e fica como registro dele; o comportamento atual está na
   entrada "Estatísticas por dimensão BOCR, Fase 2, SAÍDA A", mais abaixo.

2. **A relação entre enviados e incluídos vem da COMPARAÇÃO DAS DUAS LISTAS, com multiplicidade, e
   nunca do estado nem do booleano transportado** (`cobertura.enviadosIguaisAoDocumento`). O mesmo
   estado `divergente` cobre dois casos opostos: no **5 / 4 / 4** (5 avaliados, 4 incluídos, 4
   enviados) os enviados **coincidem** com os incluídos e a divergência anterior à restrição
   **permanece registrada**; no **3 / 4 / 3** (3 avaliados, 4 incluídos, 3 enviados) os enviados
   **diferem**, e o contexto nomeia quantos faltam de cada lado. Sem as duas listas bem formadas
   (`indisponivel`, `invalido`, formato não reconhecido, lista malformada) a comparação **não foi
   realizada**, e o contexto diz isso.

3. **A contagem informada é o tamanho do conjunto incluído registrado no documento de cálculo, e
   não é apresentada como medição da participação em cada célula das matrizes agregadas.** O
   portão de completude de A.21 é descrito como **propriedade do percurso de cálculo examinado**
   (o código da rota de cálculo, que rejeita a resposta com algum par sem julgamento válido e agrega
   cada célula só com julgamento existente, não pulado e com valor), e a linha diz que o vínculo de
   identificadores **não verificou** os julgamentos daquela execução. Com `indisponivel` ou
   `invalido` **não existe** contagem de incluídos, e **nada se afirma** sobre ela. Se o bloco traz
   uma contagem **declarada** mas nenhuma lista utilizável para compará-la, ela é nomeada como
   declarada; se a contagem declarada difere da lista, o contexto conserva os **dois** valores, sem
   escolher um em silêncio. O mesmo vale para os enviados: a lista de identificadores do vínculo e a
   contagem declarada, quando diferem da lista de respondentes, entram as duas.

**A exaustividade** é afirmada **só da lista enviada** ("a lista é COMPLETA para o conjunto
enviado"), e nunca do universo. **A linha de dados de qualidade** da exclusão usa a população
**enviada** (a contagem da própria lista), e não `activeCount`; com a lista enviada **vazia** ela
diz que nenhum respondente foi enviado e que não há lista abaixo.

**A regra de menção** passa a distinguir dois papéis: o **participante da avaliação enviada**, que
só a lista nomeia, e a **divergência registrada**, cujo identificador o bloco nomeia e a regra
permite citar **somente nesse papel**, nunca como quem contribuiu para os dados de qualidade.

⚠ **O que isto NÃO é.** Nenhuma causa de suspensão, nenhuma alteração em `calculateGrade`,
penalidades, limiares ou faixas, e nenhuma suspensão por divergência. ⚠ A redação do modelo sobre
estas frases **não foi testada**: só o que ele **recebe**.

##### A lista APRESENTADA, e a comparação com as duas declaradas (R4)

⚠ **Escopo.** Vale **COM** `vinculoDaExecucao` em modo `comparado` (`vinculado` ou `divergente` com as duas
listas bem formadas). Em `indisponivel`, `invalido`, formato não reconhecido e lista de incluídos malformada
não há conjunto de incluídos: a linha nova **não existe** e nenhuma coincidência é afirmada, como antes.
**SEM** o campo o contexto segue **byte a byte** o de `a973c8f`. P1 permanece, nenhuma cadeia de identificador
é unificada e nenhuma causa de suspensão é acrescentada.

**O defeito.** A comparação do texto usava as duas listas **declaradas** dentro do vínculo (`enviados` e
`incluidosNoDocumento`), e a rota entregava às frases só o **tamanho** da lista que de fato apresenta ao modelo
(`data.qualityAnalysis.respondents`). Três respondentes podiam ser afirmados "um a um" com quatro; com a mesma
contagem e um identificador trocado (`r9` no lugar de `r4`) a coincidência era afirmada **sem ressalva**; e, no
sentido inverso, uma lista apresentada igual aos incluídos, com enviados declarados menores, era dada como
"1 incluído(s) … ausente(s) desta lista", o que é falso.

**As regras.**

1. **Três conjuntos, cada um com a sua origem**, e nenhum se descarta em silêncio: a lista **apresentada** (lida de
   `respondentId` ou `id` de cada elemento de `qualityAnalysis.respondents`, na forma em que a lista do contexto os
   exibe; etapa: envio), os **enviados declarados** (`vinculoDaExecucao.enviados`; etapa: envio) e os **incluídos**
   (`vinculoDaExecucao.incluidosNoDocumento`, que vem de `metadata.includedRespondents`; etapa: cálculo).
2. **A lista apresentada é comparada, um a um e com multiplicidade, com os DOIS**, e não só com um deles nem só pelo
   tamanho. `r1,r1,r2` contra `r1,r2,r2` **não** coincidem, mesmo com o mesmo conjunto e o mesmo tamanho.
3. **"Coincide" só sai quando os TRÊS correspondem um a um**, e isso vale no bloco **e** nas frases ao redor (tabela
   abaixo). Na discrepância o contexto **conserva** os três conjuntos e nomeia o excedente de cada lado, inclusive o
   identificador presente na lista apresentada e ausente dos **dois** conjuntos declarados. ⚠ **Invariante de
   vocabulário**, fixado por teste: dentro da região que muda (do início da seção "Amostra e Qualidade Geral" até a
   regra de menção da lista), o radical "coincid" (sem distinção de caixa) ocorre **se e somente se** os três
   correspondem um a um; a discrepância usa "DIFERE".
4. **A origem da identidade é registrada na CONSTRUÇÃO do `displayId`, e nunca inferida pela grafia.** A expressão que
   a rota escrevia inline (`r.respondentId || r.id`, e `hash_NNN` pelo índice quando o valor falta ou é a string
   "undefined" ou "null") passou a ser escrita **uma vez**, em `identificarParaApresentacao`
   (`lib/ai-reviewer/vinculo-execucao.ts`), que devolve o valor **e** a origem (`respondentId`, `id` ou
   `posicional`); a rota a chama onde construía o `displayId`. Um identificador **gerado** pelo fallback posicional
   **nunca corresponde a ninguém**, mesmo que o mesmo texto conste dos conjuntos declarados, e a discrepância traz
   **motivo próprio**: a posição na lista, contada a partir de 0. Um `hash_000` **recebido** em `respondentId` ou
   `id` tem essa origem e **corresponde normalmente**. Nenhum ponto do módulo lê a grafia `hash_NNN`.

| Sítio do contexto | Os três correspondem | Discrepância |
|---|---|---|
| relação entre os enviados e os incluídos (bloco) | `COINCIDEM, um a um (N enviados, M incluídos).` | os dois declarados iguais entre si: "os dois conjuntos DECLARADOS têm os mesmos identificadores, um a um (…); a correspondência da lista APRESENTADA a você está na linha seguinte."; os declarados diferentes: `DIFEREM (…)` e, se a apresentada também difere dos enviados declarados, "Este é o confronto dos dois conjuntos DECLARADOS; …" |
| linha da lista APRESENTADA (bloco, **nova**) | `COINCIDE, um a um, com os N enviados declarados (etapa: envio) e com os M incluídos … (etapa: cálculo).` | `DIFERE do que o vínculo declara`, com os três conjuntos e a origem de cada um, o excedente de cada lado em cada confronto, os repetidos, a identidade por posição e os presentes na apresentada e ausentes dos dois declarados |
| cobertura do resumo do painel (bloco) | "O conjunto enviado coincide com o do documento." | apresentada difere dos incluídos: "⚠ NÃO descreve o conjunto enviado a você, que difere do conjunto do documento."; apresentada tem os identificadores dos incluídos mas difere dos enviados declarados: "Não se pode afirmar que descreve o conjunto enviado a você: …" |
| linha "Cobertura enviada" (bloco) | "… a lista de respondentes que segue é a dos N enviados." | se a apresentada difere dos enviados declarados: "o vínculo declara que a lista de respondentes que segue é a dos N enviados (a linha da lista APRESENTADA, abaixo, compara essa declaração com a lista)." |
| total da lista | `… e COINCIDE, um a um, com os M incluídos …` | três formas: "DIFERE dos M incluídos" (mais "A lista também DIFERE dos N enviados declarados" quando difere deles também), ou "ela tem os mesmos identificadores dos M incluídos, mas DIFERE dos N enviados declarados"; a identidade por posição conta como apresentada ausente do documento |
| regra de menção da lista | o texto de R2 | o texto de R2, **intacto como prefixo**, mais uma frase que permite nomear, só nesse papel, o identificador declarado e ausente da lista apresentada |

⚠ **O que isto NÃO é.** Nenhuma causa de suspensão, nenhuma alteração em `calculateGrade`, penalidades, limiares ou
faixas, e nenhuma cadeia de identificador unificada: a rota tem **outras duas** expressões de identificador para o
mesmo tipo de lista (os respondentes críticos e a validação posterior à geração), **medidas e não alteradas**. ⚠ A
redação do modelo sobre estas frases **não foi testada**: só o que ele **recebe**.

##### Limites, e o que foi medido

- ⚠ **A fiação na tela não é executada por teste algum.** `page.tsx` é `'use client'` e o
  repositório não tem `jsdom` nem `@testing-library`. A decisão mora no módulo puro, que é
  executado; a fiação é verificada por leitura da fonte, `tsc` e `build`.
- ⚠ **Ramo `fallbackSobreRespostas`, nas condições observadas:** a cadeia do fallback não contém
  `respondentId`, nenhum ponto do app atribui `visitorId`, e a resposta carregada é
  `{ id: doc.id, ...data }`. Com o id do documento diferente do `respondentId` e sem `id` nem
  `visitorId` gravados no dado, o identificador é o id do **documento da resposta**, que o documento
  de cálculo (chaveado por `respondentId`) não contém. **Medido nessas condições:** o vínculo é
  `divergente`, a restrição esvazia a lista, e a avaliação da etapa 1 passa de `disponivel` para
  `ausente` (causa `disponibilidade`). ⚠ **Três condições não estão demonstradas para os documentos
  existentes:** o id do documento pode coincidir com o `respondentId`; o espalhamento
  `{ id: doc.id, ...data }` deixa um `id` gravado no dado sobrescrever o do documento; e a ausência
  de gravação de `visitorId` no caminho examinado não prova a ausência em todos os documentos. Cada
  uma, satisfeita, desfaz a divergência (controles executados). Decisão sobre P1 e sobre a cadeia:
  do autor.
- ⚠ `exclusionInfo.activeCount` e `responseCount` seguem descrevendo o conjunto **antes** da
  restrição. Com exclusão do gestor **e** restrição que retire alguém, a redação de `a973c8f`
  ("os dados de qualidade abaixo referem-se APENAS aos N respondentes incluídos") usava a contagem
  anterior para dados calculados sobre a lista enviada. **Corrigido COM o campo:** a linha nomeia
  população e etapa e usa a contagem da lista enviada. **SEM o campo permanece a redação
  anterior**, por decisão de escopo desta rodada.
- ⚠ A afirmação de que N vale em todas as matrizes agregadas, na lista exaustiva, descrevia o
  conjunto **enviado**; com sobra só no documento, as matrizes foram agregadas sobre o conjunto do
  **documento**. **Corrigido COM o campo:** o contexto informa a contagem de incluídos registrada
  no documento, nomeada, e diz que ela não é medição por célula. **SEM o campo permanece a redação
  anterior.**
- ⚠ Cobertas **só pela chave** (sem rótulo na própria linha): `Total: N especialistas`, as quatro
  contagens por status, `Taxa de Validade Geral` e `Respostas totais` por dimensão. Ficam como
  estão; rotulá-las uma a uma é decisão do autor. O ramo do prompt para lista de respondentes
  **ausente** ("Lista individual de respondentes não disponível") também não foi alterado.
- ⚠ **R4, o que não foi alterado nem conferido.** (1) As **outras duas** expressões de identificador da
  rota, medidas em `bfa7e81` e mantidas: a lista dos respondentes críticos (`route.ts:740-742`, rótulo
  posicional "Respondente N") e a validação posterior à geração (`route.ts:1477-1479`, sem a checagem de
  "undefined" e "null"). Unificá-las é decisão do autor. (2) Nos modos **sem comparação** a rota entrega a lista
  apresentada e o módulo a **ignora**: nenhuma coincidência e nenhuma discrepância é afirmada, e o texto é o de
  antes. (3) Com a lista apresentada **vazia** (a restrição a esvaziou) o bloco compara a lista vazia com os
  declarados e diz que ela tem 0 identificadores; o ramo do prompt para lista ausente não foi alterado. (4) A
  redistribuição por dimensão de `normalizeRequest` (`route.ts:565-593` em `bfa7e81`) **não foi corrigida**: é item
  enfileirado.
- ⚠ **Estatísticas por dimensão BOCR, Fase 1 (30/09/2026): medida, e NÃO corrigida.** Em `a07998c`, a divisão por
  quatro é `route.ts:567-596` e o bloco impresso é `:1143-1177` (as citações `:565-593` e `:1139-1170` erravam a
  linha e nomeavam a mesma passagem). **Nem a divisão nem o bloco dependem de `vinculoDaExecucao`:** o bloco e a
  Taxa saem idênticos com e sem o campo. A tela envia `individualStats` **achatado** (`page.tsx:1051-1088`,
  `:1314`), e o tipo `ReviewRequest.individualStats` (`lib/ai-reviewer/review-request.ts:78-83`) declara o formato
  **por dimensão**. Os CRs por dimensão (`metrics.crBenefits`, `crOpportunities`, `crCosts`, `crRisks`) **chegam**
  a `qualityAnalysis.respondents` e **nada os consome**; a distinção entre zero calculado, recuperado, ausência e
  substituição por zero **não sobrevive** a `app/api/response-quality/route.ts:393-398`. **A Fase 2 (as saídas A e
  B) não foi executada.** Registro datado, dados e limites em `docs/imprecisoes-parecer-ia.md` e em
  `docs/dados/a12-estatisticas-dimensao/`.
- ⚠ **Estatísticas por dimensão BOCR, Fase 2, SAÍDA A (30/09/2026): implementada.** O autor escolheu a saída A; a B
  não foi implementada. **Comportamento atual:** `normalizeRequest` **não lê** `individualStats` nem
  `criteriaStats`, e o bloco "Estatísticas por Dimensão BOCR" **não traz número por dimensão** em caso algum. Para o
  pedido **elegível** o bloco diz que a contagem por dimensão está **não disponível nesta requisição**, e que os
  totais do contexto são agregados e não identificam a dimensão (a razão diz só o que o contexto tem, e não o que a
  requisição carrega); para o pedido **não elegível**, seja qual for a causa, a frase de indisponibilidade
  **existente** fica **palavra por palavra**. A Taxa de Validade Geral fica a **medida**, inclusive `0.0%` quando
  esse é o resultado medido; **sem base** (nenhuma das três fontes, `byStatus`, `summary` e `overallStats`, com
  total positivo) ela é "não calculada", e nunca `0.0%` no lugar da ausência. O item da chave de leitura deixou de
  descrever a divisão por quatro. ⚠ **Um `individualStats` já por dimensão também não é apresentado:** a saída A
  não distingue a origem. ⚠ **A tela continua enviando o agregado achatado**; a rota é que não o lê.
  ⚠ **A propriedade "requisição sem `vinculoDaExecucao` gera contexto byte a byte o anterior" DEIXOU DE VALER, por
  decisão do autor:** para o pedido **elegível** (o bloco muda, com ou sem o campo) e, **com** o campo, para todo
  pedido (o item da chave muda). **Continua valendo** para o pedido não elegível sem o campo. **Integridade
  histórica e comportamento atual estão separados:** as entradas acima, de `a973c8f` a `35a1506`, descrevem
  aquelas bases e não foram reescritas; a frase "não foi corrigida", da R4 acima, é verdadeira **para `bfa7e81`**, e
  a redistribuição por dimensão foi corrigida agora. ⚠ **O consumidor agregado (`:855-864` em `35a1506`) era
  inalcançado** (cobertura observada: 0 de 32 combinações e 0 execuções; leitura das condições: elegível implica
  `byStatus` presente) e **saiu**: previne um defeito latente, e não corrige um defeito ativo. Registro datado,
  medição e dados: `docs/imprecisoes-parecer-ia.md` e `docs/dados/a12-estatisticas-dimensao/saida-a/`.
- ⚠ Coerência interna do pedido, **sem cobertura do universo real**, sem verificação de
  conteúdo, e sem consulta a produção.


### `POST /api/calculate`

**Entrada** (`route.ts:782`):
```
{ projectId: string, excludedRespondentIds?: string[] }
```

**Saída**: o documento `calculations` inteiro, e grava a mesma coisa no Firestore.

**Chamado por**: `resultados/page.tsx:1401`, `projetos/page.tsx:195`.

⚠ `excludedRespondentIds` vem do corpo e é persistido em
`metadata.excludedRespondentIds`. É a base da recomputação por composição do
painel.

⚠ **Desde A.21, a rota só aceita resposta COMPLETA.** `completedAt` deixou de
bastar: cada resposta é verificada par a par por matriz (`lib/completeness.ts`), e a
que reprova é rejeitada **individualmente**, com o cálculo seguindo com as válidas.

**Onde a rejeição aparece depende de haver cálculo:**

| Situação | Destino |
|---|---|
| Há respondente aceito | persistida em `metadata.rejectedIncomplete`, no documento, e devolvida no POST |
| Nenhum respondente aceito | **HTTP 400 com os motivos no corpo** (`rejectedIncomplete` e `excludedByDecision`), e **nada é gravado** — a única escrita da rota é o `setDoc` do fim, então o resultado anterior fica intacto |

### `POST /api/ai-reviewer`

**Entrada**: a interface `ReviewRequest`, normalizada por `normalizeRequest`.
Campos principais: `projectName`, `projectDescription`, `alternatives[]`,
`bocrWeights` (⚠ aqui como `{Benefits, Opportunities, Costs, Risks}`, não array),
`personalWeights`, `bocrConsistency`, `subWeights`, `subConsistency`,
`finalScores[]`, `responseCount`, `sensitivityInflections`, `ipcMetadata`,
`demographicsSummary`, `exclusionInfo`, `individualStats`, `qualityAnalysis`,
`avaliacaoDeQualidade` (etapa 1) e `vinculoDaExecucao` (etapa 3, estágio 1, descrito acima).

⚠ **`individualStats` é aceito e NÃO é lido** desde a saída A de A.12 (30/09/2026): a tela o envia achatado
(`total`, `valid`, `warning`, `critical`), e nenhum valor dele chega ao contexto. O bloco de estatísticas por
dimensão declara a contagem por dimensão **não disponível nesta requisição**.

⚠ **O dashboard envia `'REVISAR': 0` fixo** (`resultados/page.tsx:1167`). A
distribuição de status que chega à IA nunca tem essa categoria preenchida.

⚠ Os nomes dos méritos mudam de forma entre camadas: `B,O,C,R` no Firestore,
`Benefits, Opportunities, Costs, Risks` na entrada da IA, `sb,so,sc,sr` no
rescaling. Três convenções para a mesma coisa.

**Saída**: texto do parecer, nota, veredicto, análise de viés, chunks do RAG.

**Chamado por**: `resultados/page.tsx:1245`.

### `POST /api/audit-decision`

**Entrada**: `{ calculationData }` — o documento de cálculo inteiro.
**Saída**: sete resultados de validação mais relatório técnico.
⚠ Nenhum chamador na interface hoje.

### `POST /api/response-quality`

**Entrada**: `{ responses, includeSimulated = true }`.
**Saída**: por respondente, CRs, status, score e padrões detectados.

### `POST /api/validate-external`

**Entrada**: `{ action = 'validate', ...payload }`. Proxy para a AhpAnpLib.
**Chamado por**: `ExternalValidation.tsx:59` (GET) e `:205` (POST).

### `POST /api/generate-academic` — A REMOVER

**Chamado por**: `resultados/page.tsx:1736`.

---

## Fluxo completo

```
projetos/page.tsx
   ↓ cria projects/{id} + respondents/{id}
avaliacao/[projectId]/page.tsx
   ↓ grava responses/{auto} com judgments[72] + cache derivado
POST /api/calculate
   ↓ lê projects, respondents, responses
   ↓ filtra completedAt, deduplica respondentId, aplica excludedRespondentIds
   ↓ aggregateMatrix (AIJ)  →  calculateWeightsIPC (motor)
   ↓ calculateAlternativeScores (5 sínteses)  →  concordância  →  sensibilidade
   ↓ setDoc calculations/{projectId}
resultados/[projectId]/page.tsx
   ↓ getDoc calculations/{projectId}   (sem recálculo)
   ├→ dashboard, tabelas, gráficos
   ├→ POST /api/ai-reviewer        (parecer)
   ├→ POST /api/validate-external  (AhpAnpLib)
   └→ exports CSV e XLSX
```

---

## Onde acrescentar campos novos

Para as funções da especificação do artigo, os pontos de entrada são:

| Função nova | Onde produzir | Onde persistir | Quem consome |
|---|---|---|---|
| Dominância de alternativas | `calculate/route.ts`, após `calculateAlternativeScores` | campo novo em `calculations` | dashboard, `ai-reviewer` |
| Recomputação por painel | orquestrador novo sobre `/api/calculate` com `excludedRespondentIds` | coleção própria | dashboard |
| Cenários de reescalonamento | `calculate/route.ts`, variando `rescalingWeights` | campo novo | dashboard |
| Perturbações | idem, variando `subWeights` | campo novo | diagnóstico |
| Manifesto de execução | `calculate/route.ts:1320` | campos no próprio `calculations` | export |
| Verificador de fidelidade | após `/api/ai-reviewer` | junto do parecer | dashboard |

**Regra ao acrescentar campo em `calculations`**: quem grava é só o
`calculate/route.ts`. Qualquer outra rota que precise persistir resultado usa
coleção própria. Foi a mistura de dois gravadores na mesma chave que motivou a
remoção do simulador.
