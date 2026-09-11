# ahp-simple: inventário de código

Referência para retomar o trabalho sem reanalisar a arquitetura.
Estado do commit `501b19a`, 11/09/2026.

**Como usar.** Documento de consulta, não de leitura corrida. Cada entrada traz o
que o arquivo faz, quem o usa e o que há de armadilha nele. Os avisos marcados
com ⚠ são defeitos conhecidos ainda não corrigidos.

**Este documento envelhece a cada commit.** Ele descreve o repositório no commit
citado acima. Revisar quando uma tarefa fechar, ou ao menos ler sabendo que pode
estar atrás.

**Sobre os números.** As contagens de linha por arquivo e as colunas "Linha" das
tabelas de função são referência de dimensão e de localização aproximada, medidas
no commit citado acima. Elas envelhecem a cada alteração. **Não use número de
linha como ponteiro:** localize pelo nome da função ou pelo trecho citado, que é
o que sobrevive a refactor. Onde a precisão importa, os outros documentos usam
trecho-âncora.

---

## Mapa rápido

```
lib/ahp-engine.ts ......... motor determinístico único (autoridade de cálculo)
lib/ahp-ipc.ts ............ matrizes incompletas (LLSM), caminho individual
lib/graph-utils.ts ........ conectividade do grafo de comparações
lib/data.ts ............... árvore de 20 subcritérios, tipos de domínio
app/api/calculate/ ........ cálculo agregado, grava calculations/{projectId}
app/api/ai-reviewer/ ...... camada de interpretação (LLM + RAG)
lib/rag/ .................. base de conhecimento, 37 artigos, busca semântica
app/decisor/projetos/ ..... cadastro de projeto, alternativas e painel
app/avaliacao/ ............ coleta dos 72 julgamentos por respondente
app/decisor/resultados/ ... dashboard, 7 abas, exports
```

**Fluxo do dado.** `judgments` (primário, 72 por respondente) → agregação AIJ →
seis matrizes agregadas → autovetor → pesos → síntese BOCR → `calculations/{projectId}`
→ dashboard e camada de interpretação.

---

## Camada 1. Motor e cálculo

### `lib/ahp-engine.ts` (313L) — AUTORIDADE

Única fonte de derivação de prioridades no repositório. Nenhum outro arquivo deve
implementar essas operações; o censo quebra o build se aparecer.

| Export | O que faz |
|---|---|
| `principalEigenvector(matrix, label)` | autovetor principal por iteração de potência, TOL 1e-12, 1000 iter. Retorna `{weights, lambdaMax, iterations, method}` |
| `consistency(matrix, label)` | CI, RI, CR. Retorna 0 para n ≤ 2 |
| `aggregateAIJ(values, label)` | média geométrica por soma de logaritmos (Aczél e Saaty, 1983) |
| `synthesizeBOCR(merit, v, s, label)` | as cinco fórmulas de síntese |
| `randomIndex(n)` | tabela de Saaty (1977), n de 1 a 10 |
| `assertValidPCM(matrix, label)` | valida quadrada, positiva, diagonal 1, recíproca |
| `toMerits(vetor)` | converte `[B,O,C,R]` em objeto |
| `AhpEngineError` | erro de todas as validações |

**Princípio de projeto: falhar alto.** Sem clamp, sem epsilon, sem fallback.
Entrada inválida lança erro. `lambdaMax` é a soma de A·w, o que dispensa divisão
por `w[i]` e a guarda que ela exigiria.

Validado pelo arnês contra 24 valores de referência.

### `lib/ahp-ipc.ts` (490L)

Matrizes incompletas e cálculo por respondente individual.

| Export | O que faz |
|---|---|
| `buildPCM(items, judgments)` | monta matriz `(number\|null)[][]` a partir dos julgamentos |
| `eigenvectorMethod(pcm, label)` | **delega ao motor**; mantém a assinatura antiga `{weights, lambdaMax, cr}` |
| `llsmIPC(pcm, graph)` | mínimos quadrados logarítmicos para matriz incompleta (Bozóki et al., 2009) |
| `calculateGroupWeights(items, judgments, group)` | escolhe entre autovetor e LLSM pela completude |
| `calculateAllWeights(judgments, alternatives)` | todos os blocos de um respondente |
| `calculatePartialCR(...)` | feedback de consistência em tempo real na coleta |

Célula ausente numa matriz classificada como completa lança erro, em vez de virar
1 como antes.

### `lib/graph-utils.ts` (328L)

Trata as comparações como grafo. `checkConnectivity`, `getCompletenessMetrics`,
`findBridgeEdges`, `validateSkip`, `getMinimumSpanningChain`,
`buildGraphFromJudgments`. É o que permite ao respondente pular uma comparação
sem desconectar o grafo.

### `app/api/calculate/route.ts` (1298L) — ROTA CENTRAL

Único gravador de `calculations/{projectId}`.

Fluxo do handler `POST`: lê projeto e alternativas → lê respondentes válidos →
lê respostas com `completedAt` → deduplica por `respondentId` → aplica
`excludedRespondentIds` do corpo → recalcula derivados ausentes → invalida CR por
completude → agrega por AIJ → deriva pesos → compõe escores → cinco sínteses →
concordância → sensibilidade → `setDoc`.

| Função | Linha | O que faz |
|---|---|---|
| `aggregateMatrix` | 236 | AIJ entrada a entrada, devolve `(number\|null)[][]` e completude |
| `calculateWeightsIPC` | 310 | ramo completo usa o motor; incompleto usa LLSM |
| `calculateAlternativeScores` | 389 | as cinco fórmulas, por alternativa |
| `analyzeMethodConcordance` | 543 | quantos métodos concordam com o ranking |
| `calculateSensitivityWithClassification` | 614 | ⚠ varredura de 101 pontos **mais** classificação categórica (robusto/moderado/sensível/crítico), construto sem respaldo |
| `calculateSensitivityTrajectoriesOnly` | 724 | 21 pontos, para os gráficos |
| `completePCM` | 75 | completa matriz incompleta com `w_i/w_j` para serialização |

⚠ Mantém tabela RI própria e `RI[n] ||` no ramo LLSM. Não está no caminho dos
valores publicados, mas o censo acusa.

---

## Camada 2. Domínio e tipos

### `lib/data.ts` (594L)

Constantes de domínio e tipos. **A árvore de vinte subcritérios é fixa por
desenho**, é a contribuição da dissertação e não varia por projeto.

`SUBCRITERIA` (20, com código, grupo, nome, dimensão, cor, descrição),
`BOCR_CRITERIA`, `MAGNITUDE_*` (nomes, descrições, perguntas, ajuda),
`IMPACT_FIELDS`, `SAATY_SCALE`, `ALTERNATIVES` (exemplo).
Interfaces `Project`, `Alternative`, `Respondent`, `ImpactField`.
`generatePairs`, `generateAllComparisons`, `groupComparisonsByBlock`,
`calculateTotalComparisons`, `formatImpactValue`.

### `lib/types.ts` (51L)

`ComparisonType`, `FavorsDirection`, `ComparisonItem`, `JudgmentItem`.

### `lib/firebase.ts` (17L)

Inicialização do cliente Firestore.

### `lib/bocr-colors.ts` (255L)

Paleta, rótulos, ícones e descrições dos quatro méritos. `getBocrColor`,
`bocrWeightsToChartData`, `getPlotlyLayout`.

---

## Camada 3. Coleta

### `app/avaliacao/[projectId]/page.tsx` (3718L)

Questionário do especialista. Login por código, consentimento, demografia, 72
comparações em blocos, verificação de conectividade em tempo real, autosave.

Componentes internos: `HierarchyTreeSidebar` (138), `BlockContextCard` (329),
`checkGraphConnectivity` (537), `ipcGetRequiredComparisons` (593),
`AvaliacaoProjectPageInner` (779).

Na submissão chama `calculateAllWeights` e grava em `responses` o subobjeto
`responses` com `avgCR`, `bocrWeights`, `magnitudeWeights`, `subWeights` e
consistências. ⚠ Esse cache nunca é invalidado na leitura.

Concentra UI, cálculo e persistência no mesmo arquivo.

---

## Camada 4. Cadastro

### `app/decisor/projetos/page.tsx` (2135L)

Lista de projetos e formulário de cadastro em cinco abas: informações, contexto,
alternativas, impactos, respondentes.

`ProjetosPage` (23), `EditProjectModal` (1154), `ManageProjectModal` (1822).

Cria `projects` com nome, descrição, objetivo, horizonte, contexto industrial e
orçamento; alternativas com código, nome, descrição, escopo, TRL, faixa de
investimento, prazo, referências e mapa de impactos; e `respondents` por e-mail.
Dispara `/api/calculate` pelo botão de cálculo, em `handleCalculate`.

**É aqui que a ferramenta deixa de ser um caso e vira ferramenta.** Projeto e
painel são as duas variáveis do sistema.

---

## Camada 5. Apresentação

### `app/decisor/resultados/[projectId]/page.tsx` (6114L) — MAIOR ARQUIVO

Dashboard com seis abas: `executive`, `results`, `quality`, `robustness`,
`review`, `export`.

| Bloco | Linhas |
|---|---|
| `recalcularCRBocrIndividual` | 66 |
| `calculateAltBOCR` | 212 |
| `ChartDownloadWrapper` | 252 |
| `ResultadosPage` | 554 |
| leitura do cache (`getDoc` em `calculations`) | 1465 |
| chamada a `/api/calculate` | 1401 |
| exclusão de respondentes (`excludedIds`) | 611, 1377-1393, 1406 |
| exports CSV e XLSX | 2330-2360, 2784-2800 |
| painel de qualidade (inline) | 3844-4228 |
| chamada a `/api/ai-reviewer` | 1158, 1245 |

⚠ **Contradição do painel de qualidade.** Status geral e estatísticas vêm de
`adjustedQualityScore` (3855) e `adjustedStatusCounts` (3945). A tabela por
respondente, a partir de 4022, usa outra rotina. As duas leem o mesmo dado e
concluem o oposto: cabeçalho declara qualidade excelente enquanto a tabela mostra
onze respondentes em CRÍTICO.

⚠ Mantém tabela RI própria e `RI[n] ||`.

⚠ Importa e nunca renderiza: `AIReviewCard` (42), `QualityDashboard` (43),
`CRTable` (62).

⚠ Importa `lib/knowledge.ts` (38), base legada anterior ao RAG.

### Subcomponentes da tela de resultados

| Arquivo | Linhas | O que faz |
|---|---|---|
| `components/ExportReports.tsx` | 404 | geração de relatórios |
| `components/QualityConsistency.tsx` | 542 | heatmap de CR, distribuição, outliers |

### Componentes em uso

| Arquivo | Linhas | O que faz |
|---|---|---|
| `BentoGridDashboard.tsx` | 650 | painel principal da aba executiva |
| `BOCRConsistencyMatrix.tsx` | 206 | tabela de CR das seis matrizes agregadas ⚠ RI próprio |
| `BOCRPrioritiesTable.tsx` | 228 | pesos dos méritos e subcritérios |
| `MethodComparisonTable.tsx` | 324 | os cinco métodos lado a lado |
| `SensitivityAnalysisPanel.tsx` | 314 | varredura de pesos |
| `NegativePriorityAlert.tsx` | 165 | alerta de prioridade negativa na síntese subtrativa |
| `ExternalValidation.tsx` | 433 | consome `/api/validate-external`, produz a comparação com a AhpAnpLib |
| `ParecerAISection.tsx` | 335 | Parecer Científico IA ⚠ rótulo diz Sonnet 4.5, código roda Opus 4.6 |
| `BiasAnalysisCard.tsx` | 449 | resultado da detecção de viés |
| `charts/BOCRRadarChart.tsx` | 268 | radar comparativo |
| `charts/BOCRSunburstChart.tsx` | 229 | hierarquia em sunburst |
| `charts/BOCRWaterfallChart.tsx` | 355 | cascata da síntese |
| `charts/ConsistencyGaugeChart.tsx` | 275 | medidor de CR |
| `VideoBackground.tsx` | 29 | fundo da página inicial |

### Componentes órfãos ⚠ (1742L, nenhum importador)

`BOCRMetricsCards.tsx` (205), `ChartExportWrapper.tsx` (238),
`ExportDemographicsButton.tsx` (337), `ImpactComparison.tsx` (115),
`QualityAnalysisWithFilter.tsx` (266), `RespondentsDemographics.tsx` (300),
`WeightsMatrixTable.tsx` (281).

### Componentes importados mas não renderizados ⚠

`AIReviewCard.tsx` (809), `QualityDashboard.tsx` (683), `CRTable.tsx` (501).
São 1993 linhas importadas em `resultados/page.tsx` e nunca instanciadas. O
painel de qualidade que está na tela é código inline, não o `QualityDashboard`.

`CRHeatmap.tsx` (345) e `CRTableExpanded.tsx` (808) **são usados**, dentro de
`components/QualityConsistency.tsx`, onde ambos são instanciados no JSX.

### Outras páginas

`app/page.tsx` (333) inicial, `app/especialista/page.tsx` (160),
`app/perfil/page.tsx` (631), `app/obrigado/page.tsx` (141),
`app/decisor/layout.tsx` (52), `app/layout.tsx` (44) ⚠ baixa fontes do Google em
tempo de build, `app/test-design/page.tsx` (115) página de teste visual.

---

## Camada 6. Interpretação

### `app/api/ai-reviewer/route.ts` (1727L)

Parecer Científico IA. O `MODEL_CONFIG.id` é `claude-opus-4-6`,
`maxTokens` 16000, budget de raciocínio 5000. `maxDuration` 300s.

| Função | Linha | O que faz |
|---|---|---|
| `normalizeRequest` | 609 | normaliza o corpo recebido do dashboard |
| `normalizeBOCRWeights` | 187 | reordena e valida os pesos |
| `getValidFinalScores` | 245 | filtra escores utilizáveis |
| `calculateGrade` | 409 | nota e veredicto determinísticos |
| `extractGradeFromReview` | 568 | extrai nota do texto gerado |
| `validateReviewOutput` | 1422 | valida a saída do modelo |
| `formatSemanticChunks` | 141 | monta o contexto RAG |

O classificador heurístico de concentração dos pesos BOCR e sua injeção no
prompt foram removidos em `501b19a`. O prompt conserva apenas o ratio
máximo/mínimo calculado diretamente dos pesos.

### `app/api/ai-reviewer/system-prompt.ts` (518L)

Prompt do parecer.

### `app/api/ai-reviewer/bias-detection.ts` (660L)

`analyzeBias` (156) reúne três análises: `analyzeConsistency` (250),
`analyzeDisparateImpact` (322) e `analyzeIPC` (417). `formatBiasForPrompt` (604)
converte para o prompt.

### `app/api/ai-reviewer/knowledge.ts` (326L)

Fachada sobre `lib/rag`. `getKnowledgeContext`, `getRefsByTopic`,
`getRefsByAuthor`, `getCriticalRefs`, `getRAGThresholds`, `getRAGFormulas`,
`getRAGBenchmarks`, `validateKnowledgeBase`.

### `app/api/ai-reviewer/knowledge-ipc.ts` (315L) ⚠

Base dedicada a IPC. `IPC_KNOWLEDGE`, `IPC_QUALITY_REFS`, `IPC_RISKS_REFS`,
`getIPCContextForAI`, `analyzeCompleteness`. Tema fora do recorte atual.

### `lib/knowledge.ts` (1125L) ⚠ LEGADO

Base anterior ao RAG, ainda importada por `resultados/page.tsx`.
`BOCR_KNOWLEDGE_BASE`, `CORRECT_BOCR_FORMULAS`, `SYNTHESIS_METHODS`,
`QUALITY_THRESHOLDS`, `interpretConsistencyRatio`, `interpretSensitivity`,
`interpretMethodAgreement`, `interpretDominanceGap`, `interpretNegativePriority`,
`generateExecutiveSummary`.

---

## Camada 7. Base de conhecimento (RAG)

### `lib/rag/index.ts` (236L)

Registro central. 37 arquivos de artigo em `lib/rag/articles/`, **36 registrados**.
`getAllThresholds`, `getThresholdsByMetric`, `getAllFormulas`,
`getFormulasByKeyword`, `getAllClaims`, `getClaimsByUsage`, `getAllBenchmarks`,
`getArticle`, `searchClaims`, `getCRThresholds`, `getSensitivityThresholds`,
`getBOCRFormulas`.

### `lib/rag/types.ts` (225L)

`Evidence`, `Threshold`, `Formula`, `TableFigure`, `EmpiricalData`,
`ArticleExtraction`. Cada claim carrega fonte, sentença e página.

### `lib/rag/citation-whitelist.ts` (386L)

Valida citações do texto gerado contra a base. `validateCitationsAgainstWhitelist`
(264), `detectSuboptimalAttributions` (212), `stripSecondaryCitations` (253).

### `lib/rag/embed.ts` (76L) e `lib/rag/upstash-client.ts` (133L)

Embeddings Voyage e vetores Upstash. `embed`, `upsertChunk`, `querySimilar`,
`deleteAll`.

### `lib/rag/semantic-retrieve.ts` (52L)

`getRAGSemantic` — busca semântica que alimenta o parecer.

### `lib/rag/articles/*.ts` (37 arquivos)

Extrações estruturadas de artigos. Nomeados `autorAno_tema.ts`. Inclui Saaty
(1977, 1986, 1987, 1990, 2003, 2015), Wijnmalen (2007), Bozóki (2010), Harker
(1987), Lee (2009 eólica, 2024), Kabak (2014), Demirtas (2008), Forman (1998),
Escobar (2004), Salomon (2016, 2024), Goepel (2018), Xu (2000), Petrillo (2023),
Ishizaka (2011), Tavana (2023), Dodevska (2023), Neely (2020), Saiyed (2023),
Ayan (2023), Schmidt (2015, 2016), Ossadnik (2016), Mu (2016), Liang (2022),
Alizadeh (2020), Aull-Hyde (2006).

⚠ Falta Lee (2009) de seleção de fornecedores, artigo canônico de AHP-BOCR
publicado na própria ESWA. Só existe `lee2009_wind.ts`.

---

## Camada 8. Auditoria e qualidade

### `app/api/audit-decision/route.ts`

**Seis** validadores heurísticos, sem LLM: `validateConsistency`,
`validateSampleSize`, `validateMethodsAgreement`, `validateDiscrimination`,
`validateDataQuality` e `validateLogic`, este último tratado à parte do array.
Mais o `generateTechnicalReport`.

O sétimo, `validateSensitivity`, foi removido em `d16491a`: emitia veredito PASS,
ALERT ou FAIL sobre a análise a partir de limiares de sensibilidade sem fonte, e
injetava "Robustez excelente" em pontos fortes.

Chamada automaticamente por `resultados/page.tsx` em dois pontos: no
carregamento da página e após exclusão de respondentes. **Já é acoplada ao
resultado.** ⚠ Tabela RI própria.

### `app/api/response-quality/route.ts` (489L)

Qualidade por respondente. `extractRespondentCRs` (37),
`computeCRsFromJudgments` (166), `classifyRespondent` (225), `detectPatterns`
(254) para tudo-igual, padrão uniforme e valores extremos. ⚠ Tabela RI própria.

### `lib/crRealista.ts` (336L)

Geração de CR sintético por distribuição de Weibull, em três modos.
`gerarCRRealista`, `gerarMatrizComCRAlvo`, `calcularCRMatriz`, `calcularRI`.
Resíduo do modo de simulação removido; verificar se ainda tem consumidor.

---

## Camada 9. Verificação externa

### `app/api/validate-external/route.ts` (74L)

Proxy para microserviço Flask com AhpAnpLib v2.3 no Railway. É a validação
declarada, a que sustenta a Tabela 7 da dissertação. Consumido por
`ExternalValidation.tsx`.

---

## Camada 10. Utilitários

`app/api/send-invite/route.ts` (76L) envio de convite por e-mail.
`app/api/export-demographics/route.ts` (264L) exporta demografia com
`calculateStatistics`.
`app/api/backup/route.ts` (98L) `GET` e `POST` de backup.
`app/api/test-claude/route.ts` (167L) teste de conectividade com a API.

---

## Camada 11. Testes

### `lib/__tests__/characterization.test.ts` (261L) — 30 verificações

Fixa o comportamento contra referência conferida. Lê
`fixtures/panel-2026.json` com os 864 julgamentos anonimizados.

Grupos: integridade do fixture; agregação AIJ reproduzindo as seis matrizes e os
vinte `altScores`; motor reproduzindo os 24 valores de referência; e o registro
da diferença entre o motor unificado e a linha de base anterior.

### `lib/__tests__/engine-census.test.ts` (234L) — 12 verificações

Varre o código-fonte por **assinatura de comportamento**, não por nome.
`removerComentarios` (79) limpa comentários antes da busca.
`FORA_DO_CENSO_DE_CODIGO` exclui `lib/rag/articles/`.

Listas autorizadas descrevem o estado alvo. Falhas são trabalho pendente, não
erro. Hoje 7 passam e 5 falham.

### `lib/__tests__/ahp-ipc.test.ts` (130L) e `graph-utils.test.ts` (185L)

Testes originais do IPC e do grafo, 6 e 7 verificações.

### `lib/__tests__/fixtures/panel-2026.json`

864 julgamentos anônimos, matrizes agregadas observadas, `altScores`, valores
publicados de referência. Sem dado pessoal.

---

## Índice de defeitos conhecidos

| ⚠ | Onde | O quê |
|---|---|---|
| ✅ 1 | ~~painel de qualidade se contradiz~~ | **resolvido em `e5f9be2`** (A.1) |
| ✅ 2 | ~~rótulo fixo do modelo~~ | **resolvido em `8730cb6`** (A.4) |
| ✅ 3 | ~~`dominanceAnalyzer.ts` colidia com a função a construir~~ | **removido em `501b19a`** (A.3) |
| 4 | três em `exportLatex`, `exportCSV` e `exportXLSX`, mais o card e a interpretação da aba executiva, mais `interpretSensitivity` em `lib/knowledge.ts` | classificação categórica de sensibilidade. Cinco das oito implementações já removidas em `305d699`, `5837d0d` e `d16491a`; o resto é o quarto commit de A.2 e depende de A.6 |
| 5 | 4 arquivos | tabelas RI duplicadas |
| 6 | `resultados/page.tsx` | `RI[n] \|\|` sem erro explícito |
| ✅ 7 | ~~7 componentes órfãos~~ | **resolvido em `ed897ec`** |
| ✅ 8 | ~~3 componentes importados e não renderizados~~ | **resolvido em `ed897ec`** |
| 9 | `lib/knowledge.ts` | base legada ainda importada |
| ✅ 10 | ~~backups e resíduo versionado~~ | **resolvido em `ed897ec` e `599d0d8`**. Repositório de 298 para 138 arquivos |
| 11 | `app/layout.tsx` | fontes do Google em tempo de build |
| 12 | `calculations/{projectId}` | cache de 07/05/2026, motor anterior |
| 13 | `lib/rag/` | falta Lee (2009) de fornecedores |
| 14 | ESLint | incompatível com Next 14, sem CI |
| ✅ 15 | ~~`downlevelIteration` depreciado~~ | **resolvido em `3a6665d`**: target subiu para ES2020, bundle de resultados caiu 10 kB |
