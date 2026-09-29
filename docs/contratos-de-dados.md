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

**Três campos novos.** ⚠ **Rastreabilidade, e não portão:** nenhum respondente deixa de
entrar no cálculo por causa deles.

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
têm de coincidir para todo incluído; divergência **para a execução** com HTTP 409,
nomeando a resposta, as etapas e os valores, **sem escrever**. ⚠ O log do fallback fica
**fora** da concordância, por **não ser etapa de seleção**, e a exclusão é deliberada.

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
`demographicsSummary`, `exclusionInfo`, `individualStats`, `qualityAnalysis`.

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
