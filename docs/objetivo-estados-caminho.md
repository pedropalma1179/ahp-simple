# ahp-simple: objetivo, estados e caminho

Documento âncora. Revisado em 11/09/2026 sobre o commit `bf959b6`.

**Leia a Parte 0 antes de qualquer trabalho neste repositório.** Ela existe
porque o desenvolvimento perdeu direção várias vezes: a memória se perde entre
sessões, e sem um alvo escrito cada retomada reinventa a prioridade. Quando
houver dúvida sobre o que construir, a resposta está aqui, não na conversa em
curso.

Toda afirmação sobre o código foi verificada por leitura. Onde algo não foi
encontrado, o documento diz onde procurei.

---

# Parte 0. O objetivo

## 0.1 Os dois objetivos, e a relação entre eles

**Objetivo organizacional.** Um instrumento de apoio à decisão de investimentos
para uso por um gestor industrial. Este objetivo foi cumprido e a dissertação de
mestrado profissional foi aprovada.

**Objetivo atual.** Um artigo em periódico A1/Q1 de alto impacto, alvo Expert
Systems with Applications. É outro trabalho científico, derivado da dissertação
mas independente dela.

Os dois se relacionam assim: o software precisa **continuar sendo** uma
ferramenta de decisão útil ao gestor, e **passar a ser** um artefato que
sobrevive à revisão de um periódico de impacto. Nenhum dos dois pode ser
sacrificado pelo outro.

## 0.2 Por que o software está sendo revisado

Duas razões, ambas de bloqueio.

**Os dados da dissertação foram obtidos por cálculo fora do software.** Isso
permanece verdade quanto à origem histórica: as tabelas do manuscrito foram
calculadas fora do sistema.

⚠ **Correção registrada em 11/09/2026.** Até esta data o documento afirmava que "o
software nunca produziu os números publicados", com base no documento
`calculations` de 07/05/2026, que trazia pesos por média geométrica. **A afirmação
estava desatualizada.** O documento em produção foi recomputado em **13/07/2026**,
com motor `EIGENVECTOR`, zero exclusões e doze respondentes, e **reproduz os 24
valores publicados**.

O erro veio de eu ter tratado o backup do Firestore de maio como se fosse o estado
presente, sem conferir contra o Firestore atual. É a mesma classe de erro que 0.4
registra: medir na cópia errada.

**O sistema produz os números publicados desde julho de 2026.**

**O software tinha erros de cálculo.** Cinco derivadores de prioridade, dois
deles calculando média geométrica sob o nome de autovetor. Guardas numéricas que
deslocavam resultados na quarta casa. Tabela de índice aleatório deslocada. Uma
rota chamada "Validação Científica" que validava pesos contra uma matriz
reconstruída dos próprios pesos. A maior parte disso já foi corrigida; ver 2.4.

## 0.3 O que o revisor vai perguntar

**"Isso já foi feito."** Cinco mecanismos candidatos já estão publicados: LLM
interpretando saída de MCDA, verificação de claim atômico numérico contra fonte
estruturada, teste contrafactual contra função determinística, separação entre
julgamento de fluência e verificação simbólica, e métricas para narrativa de XAI.

Consequência para a engenharia, e ela é dura: **reproduzir as tabelas do Capítulo
4 não sustenta ineditismo.** É requisito de correção e de rastreabilidade. Um
revisor não chamará isso de contribuição.

O que pode sustentar é a análise da **força da recomendação em decisão de
grupo**, porque nenhum dos precedentes trata de agregação de julgamentos de
especialistas discordantes. Ver 1.6 e o Bloco D.

---

## 0.4 Teste de trilho

**Aplicar antes de começar qualquer tarefa neste repositório.** Se a tarefa não
passar em nenhuma das três perguntas, ela não deveria estar sendo feita agora.

1. **Isso corrige um erro que impede o software de produzir resultado
   correto?** → Bloco A ou B. Prioridade máxima, porque bloqueia todo o resto.

2. **Isso é necessário para o gestor decidir ou argumentar?** → Bloco C.
   Requisito da ferramenta e da rastreabilidade. Não é contribuição científica.

3. **Isso é o que diferencia o artigo do que já foi publicado?** → Bloco D. É
   onde está a contribuição.

**Erros recorrentes de rota, para reconhecer e evitar:**

- Eleger uma função qualquer como eixo do sistema e redesenhar tudo em volta
  dela. Já aconteceu com a dominância. Ela é **um qualificador entre outros**.
- Confundir requisito de correção com contribuição. Reproduzir tabela publicada
  é o primeiro; analisar força da recomendação é o segundo.
- Construir função nova antes de o cálculo estar correto e o dado regravado.
- Afirmar que algo não existe no código sem mostrar onde foi procurado.
- Prever critérios de aceite por leitura em vez de medir rodando.
- Medir na cópia errada. Números de linha e contagens só valem se a cópia
  corresponder ao commit citado; conferir `git rev-parse HEAD` antes de citar
  qualquer endereço. Melhor ainda: ancorar por trecho de texto, que não
  envelhece.
- Prever uma consequência da edição só no caso alternativo, quando ela vale
  também para o principal. Em A.14 o critério fixava "catorze ocorrências, o
  número não muda", mas a edição principal substituía um nome por outro e fazia
  cair para treze. A queda estava prevista só para a alternativa. **A regra: ao
  escrever um critério de contagem, simular a edição principal antes, não só a
  de exceção.**
- Escrever critério de contagem mirando um alvo e medindo num escopo mais largo.
  Aconteceu com "uma ocorrência em docs/", quando o alvo era um arquivo e a
  medição pegou o diretório inteiro, incluindo registro histórico legítimo.
  **A regra: todo critério de contagem nomeia o arquivo exato da medição, não o
  diretório que o contém.**
- Verificar árvore limpa sem excluir os caminhos que a própria tarefa altera.
  Aconteceu três vezes: o prompt bloqueia sobre o próprio resultado quando é
  reexecutado, ou sobre arquivo alheio que o commit já vai excluir. **A regra:
  a verificação exclui os caminhos da tarefa, e arquivo alheio é aviso, não
  parada, desde que o commit o exclua explicitamente** (`git add <caminhos>`,
  nunca `git add -A`).
- Escrever critério de registro como se fosse critério de bloqueio. Se o texto
  não distingue "confirme e siga" de "pare se divergir", o executor assume o
  segundo, que é o comportamento seguro. **Todo critério que só coleta
  informação deve começar com a palavra REGISTRO.** Aconteceu na remoção da aba
  Bibliografia: um critério que pedia para listar reclassificações remanescentes
  parou a tarefa sobre trabalho correto.
- Escrever critério que contradiz o próprio bloco NÃO ALTERAR. No mesmo caso, o
  critério pedia ausência de ocorrências que o escopo mandava preservar.
- Usar `git diff --stat` em tarefa que remove arquivos. `git rm` deixa as
  remoções staged, e elas não aparecem sem `HEAD`. **Sempre `git diff HEAD --stat`.**
- Herdar valor de aceite de execução anterior sem confirmar que a instrução era
  a mesma. **Número de aceite só entra num prompt se vier de execução que
  aplicou exatamente as instruções daquele prompt.** Alterar a instrução e
  manter o critério medido sobre a versão anterior invalida o critério, e faz o
  executor parar sobre trabalho correto. Aconteceu três vezes na tarefa A.1, em
  três formas: medição na cópia de trabalho errada, medição num repositório em
  commit diferente, e medição sobre uma versão anterior da própria instrução.

---

# Parte 1. Estado futuro

## 1.1 A quem serve

Um gestor industrial que precisa escolher entre projetos de investimento
concorrendo pelo mesmo CAPEX. A lista de necessidades é maior que a verba, e a
priorização precisa de respaldo.

Ele **não é especialista em MCDM**, e não precisa ser. E **não sabe a resposta de
antemão**: não conhece o peso relativo de fatores fora da análise financeira, e é
isso que a ferramenta traz para dentro da decisão.

## 1.2 O que ele faz, em três etapas

**Descobrir.** Qual é o melhor investimento, considerando fatores que a análise
financeira não captura. O resultado pode contrariar a intuição dele, e isso é
função, não defeito.

**Avaliar a força.** Quanto o resultado aguenta. Se aguenta, ele tem caso. Se
não, **ele recua e busca critério adicional antes de apresentar**.

**Argumentar.** Ele monta um relatório para o departamento de finanças. O
relatório atual já traz valor do investimento, retorno estimado e payback. Faltam
os fatores que o painel ponderou: complexidade de integração, riscos
cibernéticos, ganhos não financeiros.

O interlocutor é conhecido e o argumento dele é legítimo. O financeiro vai pelo
payback. O gestor não vence negando o payback; vence mostrando o que ele não
captura.

## 1.3 O que a ferramenta entrega

**Painel de evidências, não gerador de relatório.** O gestor extrai elementos e
escreve com as próprias palavras. Ele **não usa texto do software**.

Consequência: a camada de IA não redige o relatório. Serve para o gestor
**entender** o que os números significam.

**A camada de IA tem dois consumidores, com exigências diferentes, e os dois são
legítimos.** Para o gestor, o texto é instrumento de compreensão: precisa ser
correto e claro. Para o artigo, o mesmo texto é o objeto auditado: fidelidade
computacional e ancoragem de citação são o produto, não meio. É por isso que o
Apêndice A permanece no escopo de saída em 1.4, e é o que a ESWA compra.

Isso resolve a divergência aparente com o `CLAUDE.md` do projeto, que na seção
OBJETIVO define que o sistema produz texto interpretativo e logo depois restringe
essa interpretação a dois eixos, fidelidade computacional e ancoragem. Os dois documentos descrevem consumidores distintos do
mesmo artefato. Nenhum precisa ser corrigido.

**Rastreabilidade.** Se o gestor indicou uma decisão, é preciso saber como ele
chegou ali. A saída é o conjunto de tabelas que qualquer especialista em
AHP-BOCR esperaria ver, o que torna a decisão reconstituível a partir da tela.

## 1.4 Escopo de saída, definido

**Todas as tabelas, quadros e figuras do Capítulo 4 e dos apêndices da
dissertação, exceto o benchmarking com outras publicações.**

Fora: Tabela 13, Quadro 16 e Apêndice H.

| Item | Conteúdo |
|---|---|
| T2 | estimativas econômicas das alternativas |
| T3 | caracterização do painel |
| T4 | razões de consistência individuais dos respondentes |
| T5 | dispersão geométrica das comparações da matriz BOCR |
| T6 | índices de consistência das matrizes agregadas |
| T7 | validação computacional contra AhpAnpLib |
| T8 | pesos estratégicos dos méritos BOCR |
| T9 | pesos locais e globais dos subcritérios |
| T10 | pesos globais agregados por perspectiva decisória |
| T11 | prioridades das alternativas nos méritos BOCR |
| T12 | scores e ranking pelos cinco métodos de síntese |
| Q15 | síntese interpretativa dos perfis BOCR |
| F21 | análise de sensibilidade dos quatro méritos |
| Ap. A / F22 | saída completa do Parecer IA |
| Ap. B / Q17 | decomposição de CAPEX e OPEX |
| Ap. C / Q18 | comparação das alternativas nos vinte subcritérios |
| Ap. D / T14 | dispersão geométrica das 72 comparações |
| Ap. E / T15–20 | as seis matrizes agregadas |
| Ap. F / T21 | prioridades locais das alternativas nos subcritérios |
| Ap. G / T22 | razões de consistência individuais nas seis matrizes |

## 1.5 O que varia e o que é constante

**Varia por projeto:** alternativas (código, nome, descrição, escopo, TRL, faixa
de investimento, prazo, referências, e um texto de impacto para cada um dos vinte
subcritérios), contexto decisório e painel de especialistas.

**Constante por desenho:** a árvore de vinte subcritérios sob a estrutura BOCR,
em `lib/data.ts`, constante `SUBCRITERIA`. É a contribuição da dissertação, e reaproveitá-la é o
ponto.

## 1.6 Força da recomendação — onde está a contribuição

O gestor precisa saber, antes de apresentar, se tem um caso. **Fragilidade não é
uma coisa só.** Cada causa sugere uma ação diferente. Tratar tudo como um
indicador único de robustez é o que o sistema faz hoje, e é o que precisa mudar.

| Causa | O que significa para o gestor | Ação sugerida |
|---|---|---|
| Alternativas quase empatadas | a diferença pode não justificar a escolha | trazer critério adicional |
| Dependência de poucos respondentes | o resultado muda se o painel fosse outro | ampliar o painel |
| Dependência de poucos subcritérios | a vantagem se concentra e é contestável | reforçar evidência naqueles fatores |
| Dependência de uma ponderação específica | discordar dos pesos muda a conclusão | negociar a ponderação antes |
| Dispersão alta no painel | não há consenso a invocar | investigar a discordância |

E o caso oposto, que é argumento forte e derivável: se uma alternativa supera a
outra em **todos** os méritos, respeitada a direção de preferência de Custos e
Riscos, nenhuma ponderação positiva inverte o resultado. O gestor pode dizer ao
financeiro que discordar dos pesos não muda a conclusão. Isso é a dominância, e
ela é **um qualificador entre outros**.

**Evidência de campo a recuperar quando esta seção for reescrita:** o sistema
tinha, antes de A.1, **seis conjuntos distintos de limiares de CR na mesma
tela**, cinco deles sem fonte e um com atribuição que a fonte não sustenta. A.1
removeu dois (`statusFromCR` e a cor da coluna de CR); restam quatro. Ver
`docs/referencia-cr-individuais.md`, observação 5.4. É demonstração concreta de
que qualificação de consistência sem ancoragem prolifera sozinha.

**⚠ A justificativa de ineditismo desta seção está PENDENTE, e a versão anterior
estava errada.** Ela comparava com a literatura de verificação de saída de LLM,
que é a vizinhança do texto interpretativo, não a do Bloco D.

Os vizinhos reais do Bloco D são a literatura de robustez e consenso em AHP de
grupo, ocupada há duas décadas. Correspondências conhecidas, a confirmar por PVB:

| Item | Vizinho |
|---|---|
| D.2, exclusão de um respondente por vez | jackknife |
| D.4, sensibilidade à ponderação | revisões de análise de sensibilidade em MCDA, com variação OAT |
| D.5, dispersão do painel | teste de dispersão de Saaty e Vargas |
| D.6, robustez do ranking | abordagens por Monte Carlo sobre probabilidade de posição |
| consenso em geral | Forman e Peniwati (1998), Escobar (2004), Aull-Hyde (2006), Goepel (2018), todos já no RAG |

**A linha que parece sobreviver, e é a única a defender por ora:** em AHP-BOCR
com cinco fórmulas de síntese, a concordância entre métodos é tratada como
evidência de robustez quando pode ser consequência algébrica da dominância. O
próprio sistema comete o erro, em `robustnessLevel` (ver 2.3), o que demonstra
que o erro é natural e não hipotético. Isso é correção metodológica, não análise
de robustez, e não compete com quem já fez sensibilidade.

**A distinção já está formulada no manuscrito, com fonte, e não precisa ser
construída do zero.** Quatro passagens a desenvolvem:

- **Discussão da Tabela 12.** "A convergência decorre da relação de dominância
  entre as alternativas [...] A ordenação da A1 à frente da A2 é, portanto,
  consequência algébrica dessa dominância." O fundamento é Saaty e Vargas (1984):
  a dominância de uma linha sobre outra preserva a ordem pelo autovetor principal
  **sem exigência de consistência**, e a ordem é fator estrutural que a
  inconsistência mascara sem eliminar.
- **Seção 4.10.** Vai além da concordância entre métodos: como A1 domina nos
  quatro méritos e os pesos pessoais e rescaling weights são não negativos, "a
  diferença de score em favor da A1 permanece positiva para qualquer combinação
  admissível dos pesos estratégicos". **A invariância se estende analiticamente a
  perturbações simultâneas**, e não apenas à varredura unidimensional.
- **Delimitação do alcance.** A extensão vale para os pesos estratégicos. As
  perturbações das prioridades locais, dos julgamentos, das descrições técnicas e
  da estrutura dos critérios permanecem fora.
- **Limitações (Seção 6).** "Para aplicações sem relação de dominância entre
  alternativas, estudos futuros podem incorporar sensibilidade multivariada e
  exploração estocástica do espaço de pesos por simulação de Monte Carlo."

⚠ **Lacuna na cadeia de autoridade, registrada em 11/09/2026.** A nota da Tabela
12 do manuscrito fundamenta os cinco métodos de síntese em Lee (2009b), que é o
artigo de seleção de fornecedores publicado na *Expert Systems with Applications*.
**Ele não está no RAG.** Nem Demirtas e Ustun (2008), a outra fonte de fórmula.

Consequência: o parecer **nunca pode verificar a procedência do método central do
sistema**. Não é defeito de metadado, é buraco na cadeia de autoridade, e é o
mesmo problema que a A.6 e a pendência do Lee da ESWA veem de outros ângulos: a
base não cobre as fontes que o sistema declara usar. Endereçado em A.11.

**Consequência para o Bloco D.** O que falta não é o argumento: é o software
parar de chamar concordância de robustez, que é a D.6. E as verificações D.1 a
D.5 ganham endereço no manuscrito: a dominância no nível dos méritos já está
estabelecida, e o que a Seção 4.10 declara fora de alcance (prioridades locais,
julgamentos) é exatamente o que D.3 e D.4 poderiam cobrir.

O restante do Bloco D é o que de fato é: as verificações que instanciam o
diagnóstico, necessárias à ferramenta e não inéditas. O artefato integrado, que
mapeia causa de fragilidade para ação do gestor, é defensável como sistema
especialista, desde que apresentado como integração e não como método novo.

**Não reescrever esta justificativa por inferência.** A fronteira precisa ser
estabelecida contra a literatura de AHP de grupo, com fonte verificada.

---

# Parte 2. Estado atual

> **Esta parte envelhece a cada commit.** Ela descreve o repositório no commit
> citado no cabeçalho do documento. As Partes 0 e 1 são estáveis; esta não é.
> **Revisar a cada tarefa fechada**, e mover para 2.4 o que passou a estar
> saneado. Sem isso, a próxima retomada reabre tarefa já concluída.

## 2.1 O achado estrutural

**As tabelas do Capítulo 4 existem, mas na exportação, não na tela.**

`exportXLSX` (em `resultados/page.tsx`) gera onze abas: Visão Geral, Pesos
BOCR, Subcritérios, Desempenho BOCR, Ranking, Consistência, Sensibilidade,
Demográficos, Respostas, Referências. `exportLatex` gera as tabelas em LaTeX com preview e `exportCSV` gera a versão
em texto.

Os exports foram construídos para alimentar a dissertação. O gestor lê a tela.

## 2.2 Inventário item a item

Legenda: **tela** exibido no dashboard; **export** só na planilha ou LaTeX;
**dado** calculado e persistido sem exibição; **cadastro** informado no
formulário; **ausente** procurei e não encontrei.

| Item | Situação | Onde |
|---|---|---|
| T2 | cadastro | `alternatives[].investmentRange`, `.timeline`, `impacts.C1` (moeda), `impacts.C3` (payback em meses) |
| T3 | tela | aba `quality`; `wsDemo` no XLSX |
| T4 | tela | tabela de respondentes, com os seis CRs por matriz, o governante e a matriz que governou. Corrigida em A.1 (`e5f9be2`) |
| T5 | **ausente** | busca por `dispers`, `desvio.geom`, `gsd` em `app`, `lib`, `components`: nenhum resultado |
| T6 | tela | `BOCRConsistencyMatrix.tsx`; `wsCons` |
| T7 | tela | `ExternalValidation.tsx`, renderizado na aba `review` |
| T8 | tela | `BOCRPrioritiesTable.tsx`; `wsOverview` |
| T9 | export | peso global calculado dentro de `exportLatex`, `exportCSV`, `exportXLSX` e `ExportReports.tsx`. **Não existe na tela** |
| T10 | **ausente** | o campo `dimension` existe em cada entrada de `SUBCRITERIA` (`lib/data.ts`) e é usado na aba de subcritérios do XLSX e no prompt da IA, mas **a agregação por perspectiva não é calculada em lugar nenhum** |
| T11 | tela | `altMeritScores`; `wsPerf` |
| T12 | tela | `MethodComparisonTable.tsx`; `wsRank` |
| Q15 | **ausente** | não encontrado |
| F21 | tela | `SensitivityAnalysisPanel.tsx` |
| Ap. A | tela | `ParecerAISection.tsx`, no primeiro bloco da aba `review` |
| Ap. B | cadastro | `impacts` de C1 a C5 |
| Ap. C | cadastro | `alternatives[].impacts`, os vinte campos de `IMPACT_FIELDS` (`lib/data.ts`). Exibidos ao respondente na coleta. **Não exibidos no resultado**: busca por `impacts` em `resultados/page.tsx` não retorna nada |
| Ap. D | **ausente** | mesma busca de T5 |
| Ap. E | dado | `calculations.aggregatedMatrices`, ⚠ strings JSON. Único consumidor é `ExternalValidation.tsx`, que as envia à AhpAnpLib. **Não exibidas** |
| Ap. F | dado | `calculations.altScores`, consumido por `calculateAltBOCR` para compor os méritos. **Não exibido como tabela** |
| Ap. G | tela | os seis CRs por respondente, exibidos desde A.1 (`e5f9be2`) |

## 2.3 Defeitos que afetam o estado futuro

**`robustnessLevel` chama de robustez a concordância entre métodos.** Persistido
em `calculations.methodConcordance`, exibido e enviado à IA. Sob dominância, os
cinco métodos concordarem é consequência algébrica.

**`'REVISAR': 0` fixo** em `resultados/page.tsx`, no objeto de contagem de status montado para o payload do parecer. A distribuição de status
que chega à IA nunca tem essa categoria preenchida.

**Classificação categórica de sensibilidade** em
`calculateSensitivityWithClassification`, dentro de `calculate/route.ts`, com os
limiares de `SENSITIVITY_THRESHOLDS` em 50, 20 e 10. Construto sem respaldo, e é uma leitura de fragilidade
que 1.6 substitui.

**Rótulo de modelo divergente.** `ParecerAISection.tsx` diz "Claude Sonnet 4.5"
em dois pontos e `resultados/page.tsx` num terceiro; o `MODEL_CONFIG.id` de
`ai-reviewer/route.ts` é `claude-opus-4-6`.

**O antigo `dominanceAnalyzer.ts` não media dominância de alternativas.** Media
concentração de peso entre méritos, por uma razão arbitrária de 3:1, e injetava
narrativa sobre Upper Echelons Theory no prompt. Foi removido em A.3; o ratio
máximo/mínimo factual continua no payload, sem classificação automática.

## 2.4 O que já está saneado

**Quarenta e cinco commits desde `9f2284c`**, todos em produção. **O repositório tem hoje 139 arquivos
rastreados**, contra 298 no início do saneamento. É o número que a Fase 1 da
próxima tarefa deve conferir. Um único derivador de prioridades,
`lib/ahp-engine.ts`, validado por 30 verificações contra 24 valores de referência
conferidos contra os 864 julgamentos brutos e contra a AhpAnpLib. Zero guardas
silenciosas no caminho de cálculo. Um gravador único de `calculations`. Censo
automatizado que quebra o build se uma segunda implementação aparecer. 10 306
linhas de código morto removidas.

**A.3 fechou em `501b19a`.** A saída adotada foi remover, não renomear, o
classificador. Além do conflito nominal, ele escolhia um limiar de 3:1 sem fonte,
inferia setor e perfil profissional por busca de substrings e convertia essas
heurísticas em `contextualized`, `professional_bias_supported` ou `unexplained`.
Saíram o arquivo de 291 linhas, o consumidor na rota e as instruções de três
camadas no prompt. Permaneceu o ratio máximo/mínimo calculado diretamente dos
pesos BOCR. A API passou a `7.3.2`, sem o sufixo obsoleto
`dominance-analysis`.

**A.1 fechou em `e5f9be2`.** O painel de qualidade se contradizia: o cabeçalho
declarava qualidade excelente e doze respondentes confiáveis enquanto a tabela
mostrava onze em CRÍTICO, com CR de até 109%. A causa era o `getRespondentsList`
reprocessar os objetos da API, recalcular o CR pelos julgamentos, reclassificar o
status sobre esse CR e **preservar o score antigo**, calculado sobre outra
grandeza. Saíram o score composto, os quatro baldes de status e as duas rotinas
de cabeçalho. A tabela passou a exibir os seis CRs por matriz, o governante e a
matriz que governou, conferidos célula a célula contra
`docs/referencia-cr-individuais.md`.

**A remoção da Bibliografia fechou em `999136f`.** Saíram a aba de bibliografia
(lista estática escrita à mão, com números de equação divergentes do manuscrito e
concordância entre métodos chamada de validação), o gerador de texto acadêmico
com suas duas funções, a rota `/api/generate-academic` com seu system prompt, e
o `scripts/audit-system-prompt.mjs`, que existia só para auditar aquele prompt.
São 2646 linhas. O `page.tsx` caiu de 5954 para 5042 linhas.

**`56bd50a`** ajustou o `maxDuration` de `/api/ai-reviewer` de 800 para 300
segundos, teto do plano Hobby da Vercel, que bloqueava o deploy. O build voltou a
passar, com 17 páginas. A medição da duração real do parecer continua pendente:
ver A.9.

**A remoção do `validateSensitivity` fechou em `d16491a`.** Ele emitia PASS,
ALERT ou FAIL sobre a análise a partir de limiares de 10 e 20 pontos percentuais
sem fonte, e injetava "Robustez excelente: ranking estável para todas as
variações" em pontos fortes. Suas ações eram "Documente a sensibilidade no artigo"
e "Considere expandir subcritérios", dirigidas a autor de artigo e não a gestor.
Saíram também a linha do card de robustez, a entrada da documentação do `GET` e a
nota do `AI-AUDITOR-GUIDELINE.md`, que passou a registrar a remoção.

**A.7 fechou em `599d0d8`.** O repositório caiu de 257 para **135** arquivos
rastreados, com 119 041 linhas removidas. Saíram o `_backup/` inteiro, os 39
scripts `.py` de arqueologia, 13 logs de build e debug, os arquivos de nome
inválido `node` e `{`, cinco documentos que descreviam versões inexistentes, oito
scripts JS one-off e o `scripts/debug_sensitivity.js`. Quatro documentos foram
movidos para `docs/`, que passou a ter sete arquivos, e o
`docs/AI-AUDITOR-GUIDELINE.md` ganhou a nota de contexto explicando que descreve o
desenho original e não o sistema atual.

**`c9fc46f`** versionou os quatro documentos de trabalho em `docs/`, que passou a
ter onze arquivos. **`305d699`** removeu `QualityAnalysis.tsx`, componente órfão de
1459 linhas.

**`3a6665d`** subiu o `target` do TypeScript de ES2015 para ES2020 e removeu o
`downlevelIteration`, que ficara redundante e seria descontinuado no TypeScript 7.
Ganho colateral: o bundle de `/decisor/resultados/[projectId]` caiu de 636 kB para
**626 kB**, porque os 73 usos de `for...of` e spread de iteradores passaram a
rodar nativos em vez de transpilados.

Restam três falhas do censo: quatro tabelas de índice aleatório em rotas de
exibição e auditoria, um `RI[n] ||` em `resultados/page.tsx`, e menção a LLSM em
`calculate/route.ts`. Nenhuma está no caminho que produz os valores publicados.

---

# Parte 3. O caminho

Ordem de dependência. **A e B bloqueiam tudo. D é onde está a contribuição. C é a
infraestrutura que torna D verificável.**

## Bloco A. Fechar o saneamento

Nada novo se constrói sobre base contraditória.

| # | Ação |
|---|---|
| ✅ A.1 | **Fechada em `e5f9be2`.** Painel de qualidade: uma rotina só, que é a Tabela 4 |
| A.2 | Remover a classificação categórica de sensibilidade (Robusto / Moderadamente Sensível / Sensível / Crítico, limiares 50/20/10). ⚠ **Não é "sem fonte": é fonte que não sustenta.** O `metadata.q1Features` declara `'Sensitivity Classification (Alizadeh 2020)'`, e as claims de Alizadeh no RAG tratam de escolha de fórmula BOCR e de limiar de CR, nunca de classificação por ponto de inflexão. Ver `docs/imprecisoes-parecer-ia.md`. **Sete implementações, mapeadas abaixo da tabela**, em quatro commits. O commit (4) depende de A.6 |
| ✅ A.3 | **Fechada em duas partes.** `501b19a` removeu o módulo `dominanceAnalyzer`, a injeção no prompt e o item 4 do `system-prompt.ts`. A predição registrada foi **refutada pela execução 4**: a passagem de Saiyed e a atribuição ao perfil do painel permaneceram, e a refutação revelou um **segundo canal** que o levantamento não vira: a seção "Fairness e Viés Profissional" listava os três autores com descrição do que ofereciam, e uma exceção autorizava citá-los. `28f4a95` removeu as três entradas e a exceção, renomeou a seção para "Fairness" e preservou Dodevska. **A execução 5 confirmou as três predições.** O percurso vale mais que um acerto de primeira: a refutação identificou a causa. Evidência em `docs/imprecisoes-parecer-ia.md` |
| ✅ A.4 | **Fechada em `8730cb6`.** O rótulo do modelo na tela dizia "Claude Sonnet 4.5" enquanto o sistema executa `claude-opus-4-6`. Passou a ler `metadata.model` da resposta do POST, que a rota já devolvia. **Não é string fixa nova:** como o valor vem da resposta que gerou aquele parecer, um parecer antigo exibe o modelo que o gerou, não o configurado agora. Fallback é "modelo não informado", nunca um nome de modelo, para não reintroduzir o problema em silêncio. Verificado com um parecer real da execução 3 |
| ✅ A.5 | **Fechada em `c8ba368`.** Seis tabelas de índice aleatório unificadas em `randomIndex` do motor, em quatro arquivos. Cinco tinham valores idênticos; a sexta, em `BOCRConsistencyMatrix.tsx`, parava em **n=7** e só não falhava porque os índices eram literais 4 e 5. O ganho maior foi trocar três guardas silenciosas `RI[n] || 1.49` por falha alta: o 1,49 é o RI de n=10, e aplicá-lo a ordem maior produz um CR que existe e está errado. **Fechou duas das três falhas do censo**, e a linha de base de testes passou de 52/3 para **54/1**. Verificado que o CSV exportado ficou byte a byte idêntico na seção de consistência |
| A.6 | Remover `lib/knowledge.ts` legado e o resíduo de IPC do RAG |
| ✅ A.7 | **Fechada em `599d0d8`.** 122 remoções e 4 documentos movidos para `docs/`. O repositório caiu de 257 para 135 arquivos, 119 041 linhas |
| A.8 | Unificar o limiar de CR no painel de consistência, alcançando `ConsistencyGaugeChart` e o painel textual **numa edição só**. Adiado de A.1 porque os dois são hoje coerentes entre si, e corrigir um cria divergência adjacente no mesmo campo de visão. Não é cosmético: o eixo do medidor vai a 20% com quebra em 10% e 15%, e reduzir para um limiar muda o que o arco comunica |
| ✅ A.9 | **Fechada.** `maxDuration` cortado de 800 para 300s em `56bd50a`. **Cinco medições:** 154, 150, 188, 159 e 136 segundos, média de 157s e máximo de 188s. Todas cabem em 300, com margem mínima de 112s. A terceira medição sugeria tendência de alta; as duas seguintes desfizeram. **Qualquer aumento de `maxTokens` (hoje 16000) ou do budget de raciocínio (5000) reabre.** Se estourar, a saída é streaming, não porque a Vercel limita, mas porque requisição HTTP síncrona de minutos deixa o gestor em tela travada |
| A.10 | **Auditar as citações e afirmações do prompt contra o RAG e contra o sistema. ✅ 1º de 3 commits em `2b353b3`:** três localizadores corrigidos. A execução 2 confirmou que a correção propagou: as duas citações de Wijnmalen saíram corretas e nenhuma outra melhorou sozinha. **2º commit:** remover o dado real dos exemplos de parágrafo, incluindo a frase "os 12 respondentes apresentam CRs entre 1,1% e 9,6%", que é a imprecisão 1 ensinada como modelo de redação. **✅ 2º commit em `ca36539`:** o payload passou a informar N = 12 em todas as matrizes. As três predições registradas antes da execução se confirmaram: a imprecisão 2 desapareceu, Escobar passou a ser aplicado com N=12, e a faixa dos CRs permaneceu como controle. **Classe E confirmada como fato medido, ao custo de quatro linhas.** **3º commit:** (a) auditar as 61 combinações de autor e ano; (b) auditar o restante do payload, onde `- ✅ Validação externa com pyAHP` faz o parecer afirmar biblioteca que o sistema não usa. Equações e limiares já auditados. Evidência em `docs/imprecisoes-parecer-ia.md` |
| A.11 | **Fechar a procedência das cinco fórmulas de síntese.** Não é limpeza de metadados, e a **ordem importa**: **(1) Indexar a claim das cinco fórmulas do Lee (2009), página 123, Step 10.** É a mais importante e a mais barata: é a fonte do método central do sistema, verificada no PDF, e a sua ausência impede o parecer de checar a procedência da Tabela 12. **(2) Indexar Lee (2009a), de fornecedores, e Demirtas e Ustun (2008)**, fontes de funcionalidades declaradas em `metadata`, ausentes do RAG e presentes na base de PDFs. **(3) Só então** corrigir ou remover as atribuições que sobrarem sem lastro, abrindo o PDF antes de decidir em cada caso. **Fazer (3) primeiro apagaria atribuições corretas**, como quase aconteceu com o Lee. Alizadeh (2020) pendente: 35 páginas, sem camada de texto, exige inspeção visual. Evidência em `docs/imprecisoes-parecer-ia.md` **Inclui a string `'Sensitivity Classification (Alizadeh 2020)'` no `q1Features`**, que é o oitavo endereço do construto e cai entre A.2 e A.11: depois de `5837d0d`, ela declara no documento persistido uma funcionalidade que o motor **não faz mais**, e a atribui a um autor. As duas metades da afirmação são falsas ao mesmo tempo. Sai na etapa 3, por ser atribuição e não implementação |
| A.12 | **Resolver a distribuição categórica de status enviada ao parecer.** ⚠ **Não é "acrescentar o quarto balde".** O `individualStats` classifica em **três** degraus (`valid`, `warning`, `critical`) e a distribuição enviada tem **quatro** categorias (CONFIÁVEL, REVISAR, SUSPEITO, CRÍTICO), com `'REVISAR'` literal zero. Os dois lados não falam a mesma língua: o quarto balde não falta por esquecimento, ele não existe na contagem. **Criá-lo exigiria escolher um limiar novo**, e os únicos com fonte (CR ≤ 0,10 de Saaty; CR > 0,20 de Saaty e Ergu) dão três faixas, não quatro. Seria reintroduzir o construto categórico sem lastro que A.1, A.2 e a remoção do `validateSensitivity` tiraram em quatro commits. **A pergunta a decidir antes de codificar:** a distribuição por categoria deveria existir no payload, ou o parecer deveria receber os CRs e nada mais? É a mesma decisão de A.1, que removeu os quatro baldes da tela e deixou o CR cru. Se a resposta for a mesma, a tarefa vira *remover a distribuição categórica do payload*, que é menor e mais coerente. Agravante: depois de B.3 os doze caem todos em `critical` e a distribuição perde função informativa de qualquer modo. ⚠ Pré-requisito da etapa 4; ordem: B.3, A.12, etapa 4 |
| ✅ A.13 | **Fechada em `99a4d6c`.** As quatro ocorrências de `p. 271` no código corrigidas. **Uma delas era pior que a página:** o JSDoc de `bias-detection.ts` trazia o verbatim `"A consistency ratio of 0.10 or less is acceptable"`, que **não existe em nenhum artigo indexado**; a claim real, na p. 248, diz `"require the ratio to be very small; e.g., of the order of 0.1"`. Trocar só a página teria dado localizador correto a um texto inexistente, transformando erro visível em atribuição plausível e falsa. O exemplo do `citation-whitelist.ts` virou genérico, `"Autor (1977, p. N)"` |
| ✅ A.14 | **Fechada em `a8aa904`.** Duas linhas corrigidas: o texto de saída da detecção de viés no ramo DI < 0,80, que passou à forma composta "Feldman et al. (2015); Dodevska et al. (2023)", e o rótulo visível ao gestor no `BiasAnalysisCard.tsx`, que passou a atribuir os limites a Dodevska. **A decisão não foi remover Feldman, foi uniformizar** para a forma que nove ocorrências já usavam: nomeia a origem histórica da regra dos 80% e a fonte que o RAG indexa. A entrada bibliográfica do cabeçalho ficou, porque lista de referências nomeia obras e não atribui limiares. O `system-prompt.ts` não mudou: no código vale a proveniência completa, no prompt só a fonte indexada, porque a série mostrou que o modelo obedece ao que o prompt autoriza. **Verificado:** das treze ocorrências restantes, a única sem Dodevska no contexto é a bibliográfica |
| A.15 | **Marcar no contexto do RAG o que é citação e o que é anotação.** O `knowledge.ts`, linhas 295 a 301, monta cada fórmula com a `description` no cabeçalho, **colada a autor e ano**, e o `conditions` logo abaixo, sem marca que os distinga do `quote` do artigo. Os dois campos são **texto do indexador**, e o modelo os trata como citáveis: na execução 5 o parecer citou o `conditions` do Kabak entre aspas, como verbatim. **Alcance medido: 124 campos `conditions` preenchidos em 31 artigos**, mais a `description` de todas as claims. ⚠ **Nenhum requisito do eixo de ancoragem pega**: a whitelist valida autor e ano, e ambos conferem. A correção é de **formato**: `quote` entra como citação, `description` e `conditions` como texto do sistema, com rótulo. Mesma família da classe E, mesma solução: não reescrever a instrução, corrigir o que se entrega a ela. Evidência em `docs/imprecisoes-parecer-ia.md`, sexta superfície |
| A.16 | **Auditar a consistência interna do RAG: `verbatim_quote` contra `evidence.quote`.** Medido em 11/09/2026: **123 claims têm os dois campos, 13 divergem.** Três tipos, ordenados por **detectabilidade**: (a) paráfrase no campo, identificável por um leitor humano porque não tem forma de citação; (b) conclusão lida de tabela; (c) **citação real com notação formal removida**, o único que parece cumprir o que o nome promete. ⚠ **Cruzamento decisivo: os sete trechos dos pareceres que vieram de `verbatim_quote` são TODOS de claims divergentes**, em três delas: Lee (siglas B/O/C/R trocadas por reticências), Dodevska (notações `DI_bef` e `R_bef` apagadas) e Xu (sigla expandida e "this paper proves that" removido). **O padrão é remover notação formal e manter a prosa**, o que torna a frase mais legível e menos verificável. **O número a reportar é o do tipo (c), não os 13 agregados.** Verificável antes de qualquer parecer existir. Pendência: classificar os dez restantes e triar contra o PDF os de similaridade 0,53 a 0,77 |
| ✅ A.17 | **Fechada em `bf959b6`.** As citações que chegam ao modelo passaram a vir de `evidence.quote`. Três arquivos: a `rule` do `knowledge.ts`, o texto e o metadata do chunk no `ingest-rag.ts`, e a instrução do `system-prompt.ts` que apontava o campo defeituoso como primário. **A execução 6 confirmou as três predições:** Lee com as siglas, Xu com "this paper proves that", Dodevska com `(DI_bef)`, e o controle da faixa dos CRs intacto. ⚠ **A correção do ingestor só vale depois de reingestão**, ainda pendente: o caminho semântico, via `route.ts:149`, continua entregando o campo antigo. **O total em código caiu de 21 para 19**, não 20 como o critério previa: as duas linhas removidas do prompt tinham o termo cada uma |
| A.18 | **Reingerir o índice semântico no Upstash.** A correção de A.17 no `scripts/ingest-rag.ts` só vale depois de reexecutar a ingestão: os chunks indexados continuam com o `verbatim_quote` defeituoso, e o `route.ts:149` os entrega ao modelo na seção de chunks semânticos do payload. ⚠ **Depende de A.16, e a ordem importa por custo.** A reingestão reescreve o índice e paga chamadas de embedding; fazê-la antes de corrigir as treze divergências do RAG significaria pagar duas vezes. **Ordem: A.16 primeiro, depois A.18.** Depois dela, gerar um parecer e conferir se as citações vindas de chunks semânticos também saem na forma fiel ⚠ **Estado intermediário conhecido, até a reingestão rodar:** o `ingest-rag.ts` já grava `evidence.quote` nos chunks de claim, mas **o índice Upstash ainda guarda o `verbatim_quote` antigo**. Código e índice divergem. É o mesmo padrão de B.1, o cache que sobrevive à correção: se aparecer uma citação na forma antiga, **é o índice, não regressão**. **O teste de se a reingestão é necessária não é gerar outro parecer:** é ler o payload e ver de qual seção veio cada citação, a do RAG estático ou a de chunks semânticos. Mais barato e decide |

**Mapa das OITO implementações do construto de sensibilidade.** Levantado em
10/09/2026, revisado sobre `5837d0d`. Custou quatro rodadas para montar; não
refazer.

| Onde | O que faz | Commit |
|---|---|---|
| `app/decisor/resultados/[projectId]/QualityAnalysis.tsx` | componente órfão, 1459 linhas | ✅ `305d699` |
| `app/api/calculate/route.ts` | `SENSITIVITY_THRESHOLDS`, `classification` e `classificationLabel` persistidos em `calculations.sensitivityAnalysis`, mais o filtro `alerts.sensitivityCritical` | ✅ `5837d0d` |
| `components/SensitivityAnalysisPanel.tsx` | rótulo textual nos cards, `getClassificationStyle` com semáforo colorido, `changeDescription` | ✅ `5837d0d` |
| `app/api/calculate/route.ts`, array `q1Features` do metadata | a string `'Sensitivity Classification (Alizadeh 2020)'` continua declarando, no documento persistido, um construto que o motor não faz mais. **Oitavo endereço, sem dono.** Achado depois do commit (2) | — |
| `components/q1-features/index.ts` | arquivo órfão com cópias paralelas dos tipos | ✅ `5837d0d`, por remoção |
| `app/api/audit-decision/route.ts` | `validateSensitivity`, implementação PRÓPRIA com rótulos Estável / Moderado / Sensível / Crítico e limiares 10/20/50. Emitia PASS, ALERT ou FAIL, e alcançava quatro pontos da tela | ✅ `d16491a` |
| `page.tsx`, dentro de `exportLatex`, `exportCSV` e `exportXLSX` | três cadeias independentes com limiares 10/20/50. A do XLSX também gera coluna "Interpretação" e resumo "ALTAMENTE ROBUSTO" | (4) |
| `lib/knowledge.ts`, `interpretSensitivity` | raiz do card e da interpretação textual da aba executiva ("❌ Crítico", "⚠️ Sensível", "ATENÇÃO: N de 4 méritos") via `sensitivityResults`, `hasCritical` e `nonRobustMerits` | (4) |

**Construtos distintos, que NÃO são escopo de A.2:**
O antigo `dominanceResult.classification` em `ai-reviewer/route.ts` e
`lib/analysis/dominanceAnalyzer.ts` era concentração de peso entre méritos e foi
removido em A.3 (`501b19a`). O construto de **completude de matriz** é definido em
`lib/graph-utils.ts` (`CompletenessMetrics.classification`, com os valores
COMPLETE, NEAR_COMPLETE, PARTIAL, MINIMAL e INSUFFICIENT) e consumido em
`lib/ahp-ipc.ts`. Não está em `lib/rag/`: o que existe lá é um comentário sobre
classificação de artigo, em `types.ts`.

**O commit (4) depende de A.6** porque `lib/knowledge.ts` é o legado que ela
remove, e o `page.tsx` importa oito símbolos dele, não só o `interpretSensitivity`.
Fazer o (4) antes arrastaria A.6 inteira para dentro de A.2.

## ✅ Bloco B. Recomputar — JÁ EXECUTADO em 13/07/2026

**Fechado antes desta sessão, sem registro.** Descoberto em 11/09/2026, ao
preparar a execução.

O documento `calculations/{projectId}` foi recomputado em **13/07/2026**:

| | |
|---|---|
| Motor registrado | `EIGENVECTOR` |
| `responseCount` | 12 |
| Exclusões | 0 |
| 24 valores publicados | conferem nas respectivas casas decimais |
| Ranking | A1 vence A2 nos cinco métodos |
| `sensitivityInflections` | `{ B: null, O: null, C: null, R: null }` |
| Arnês | 30 de 30 aprovados |

Estado preservado em `docs/calculations-13jul2026.json`,
SHA-256 `00D1D8A1B70E4CD79D33B267AC8C31CFBF38F71FD9E08D9BAF9C278D0DB1FA9D`.
**Versionar esse arquivo:** é a cópia do documento que as duas execuções da série
de pareceres leram, e sem ele a série perde o dado primário do lado do cálculo.

Uma nova chamada a `/api/calculate` apenas atualizaria o `calculatedAt` de um
resultado que já corresponde ao motor unificado.

**Gatilho natural da limpeza do documento.** O `sensitivityAnalysis` gravado ainda
traz `classification`, `classificationLabel` e `changeDescription`, e o `alerts`
ainda traz `sensitivityCritical`. O código parou de lê-los em `5837d0d`, mas o
dado continua no Firestore. **A próxima recomputação os remove por consequência**,
porque a rota não os grava mais. Não é preciso script: basta que uma recomputação
aconteça por qualquer motivo.

O JSON preservado em `docs/calculations-13jul2026.json` é a última cópia com esses
campos, e por isso é também o dado primário do que o parecer leu nas duas
execuções da série.

✅ **Proveniência confirmada em 11/09/2026**, por conferência do JSON preservado.
O documento foi gravado pela própria rota `/api/calculate`, como ela era em julho:

| Marcador | Valor no documento |
|---|---|
| `calculatedAt` | 2026-07-13T19:39:31.334Z |
| `metadata.version` | 5.0 |
| `metadata.primaryMethod` | Subtractive |
| `metadata.q1Features` | os cinco, incluindo `'Sensitivity Classification (Alizadeh 2020)'` |
| `ipcMetadata` | `EIGENVECTOR` nas seis matrizes, com completude 10/10 em cada |
| `sensitivityAnalysis[0]` | tem `classification`, `classificationLabel` e `changeDescription` |

Os três últimos campos foram **removidos da rota em `5837d0d`**, em 10/09/2026.
Um documento de julho deve tê-los, e tem. Não veio de outro caminho.

✅ **Os 24 valores conferidos campo a campo em 11/09/2026: zero divergências.**
Pesos BOCR e rescaling com erro abaixo de 5e-5; as seis razões de consistência
abaixo de 0,006 pp; os dez scores de síntese abaixo de 5e-5. Ranking A1, A2, com
concordância 5 de 5 e `sensitivityInflections` nulo nos quatro méritos.

### B.1 O cache derivado das respostas continua defasado


Achado da tarefa A.1, que pertence ao Bloco B.

A recomputação de 13/07/2026 regravou `calculations/{projectId}` e **não tocou em
`responses.{doc}.responses`**, que é outra coleção e é cache congelado desde a
coleta de maio. Por isso, hoje: o dashboard mostra valores do motor unificado e o
`/api/response-quality` continua classificando pelo cache antigo.

O campo `responses.{doc}.responses.avgCR` foi investigado e a semântica está
**determinada**: é a média aritmética sobre as **26 matrizes** do respondente,
incluindo as vinte de alternativas 2×2, cujo CR é zero por construção. A fonte é
o próprio manuscrito, na discussão da primeira imprecisão da camada de IA. Desvio
verificado de 0,13 pp em média, com R05 como maior discrepância individual
(0,59 pp): é o respondente de CRs mais altos, e o cache foi gravado pelo motor
anterior, então qualquer diferença de derivador se amplifica ali. Diluir por vinte matrizes triviais puxa qualquer
respondente para baixo do limiar de 10%, o que explica a faixa observada de 1,05%
a 9,64%. Ver `docs/referencia-cr-individuais.md`, seção 3.1.

**DECISÃO, 10/09/2026, mantida: congelar, com registro.** O cache continua
intocado.

A razão original era não alterar duas variáveis na mesma etapa da série. Com a
descoberta de que a recomputação já estava feita, a razão muda mas a decisão
permanece: o cache é a **única** variável do lado do dado que ainda está errada, e
corrigi-la isolada é exatamente o que a etapa 4 mede.

⚠ **O estado atual, e a próxima retomada precisa saber.** O sistema tem **duas
origens de dado convivendo, sem nenhuma marca que as distinga na tela**:

| Dado | Origem |
|---|---|
| pesos, rescaling, scores, consistência agregada | motor unificado, 13/07/2026 |
| CR individual e classificação de respondente que vão ao parecer | cache de maio de 2026 |

Não é estado transitório criado pelo saneamento: é assim desde julho. A correção
é a **etapa 4** da série documentada em `docs/imprecisoes-parecer-ia.md`.

### B.3 Remover o subobjeto `responses` das respostas

Depois da etapa 4. Remover a saída antecipada faz o código parar de ler o cache,
mas o dado errado continua no banco, e o `contratos-de-dados.md` registra que
aquele subobjeto é cache congelado que ninguém invalida. **Um campo morto que já
enganou o sistema uma vez é candidato a enganá-lo de novo, por outro caminho.**

⚠ **Consequência a antecipar, verificada em 10/09/2026.** O caminho de fallback,
`computeCRsFromJudgments`, chama `calculateAllWeights` e devolve `avgCR:
result.avgCR`, que no `ahp-ipc.ts` é o **máximo** das seis matrizes não triviais,
não a média. Portanto, ao remover a saída antecipada, o `classifyRespondent`
passa a receber o **CR governante**. Os doze respondentes migram de CONFIÁVEL
para CRÍTICO, porque o menor governante é 11,39%.

Isso é o comportamento correto, mas **a etapa 4 não troca só a origem do dado:
ela inverte o veredito de todos os respondentes**, e o parecer passará a dizer o
oposto do que diz hoje. É o resultado mais forte que a série pode produzir, e
conviria antecipá-lo em vez de descobri-lo na geração.

### B.2 O Parecer IA publicado foi gerado sobre esse dado

O `qualityAnalysis` vai no corpo do `/api/ai-reviewer` (ver
`docs/contratos-de-dados.md`). Ele é construído pelo `/api/response-quality`, que
lê o cache descrito em B.1. Somando ao `'REVISAR': 0` fixo de
`resultados/page.tsx`, o parecer recebe uma distribuição de qualidade
construída a partir de grandeza que não é o CR do respondente.

O Apêndice A da dissertação é a saída do Parecer IA e está no escopo de saída em
1.4. **Não se resolve no Bloco A**, mas fica registrado por tocar item já
publicado.

**E não é só exibição: é decisão.** Na função que monta o payload do parecer em
`resultados/page.tsx`, a condição

```
const isExplicitlyBad = r.status === 'SUSPEITO' || r.status === 'CRÍTICO';
```

usa como critério de exclusão o `status` vindo do `/api/response-quality`, ou
seja o classificado sobre o cache descrito em B.1. **Um respondente pode ser
retirado do payload que alimenta o parecer com base numa grandeza que não é o CR
dele.** Nas linhas vizinhas há ainda uma classificação própria por `cr > 0.20`,
que é o oitavo conjunto de limiares de CR encontrado no sistema.

Achado da tarefa A.1, endereçado por trecho para sobreviver a refactor. Fica
fora do Bloco A por decisão de escopo.

**Confirmado empiricamente em 10/09/2026.** Um parecer gerado contra o commit
`d16491a`, depois de todo o saneamento, reproduz as quatro imprecisões que a
Seção 6.2 da dissertação registra, mais uma quinta. Duas delas vêm exatamente do
cache descrito em B.1: o parecer afirma que os doze respondentes têm CR abaixo de
10%, com faixa de 1,1% a 9,6%, que é a faixa do cache.

O registro completo, com o texto bruto, a classificação em três tipos de falha e
a causa técnica de cada uma, está em **`docs/imprecisoes-parecer-ia.md`**. Ele é
insumo do artigo, não tarefa de engenharia.

## Bloco C. Escopo de saída

**Um item é pré-requisito do Bloco D e sobe de prioridade** (o outro, C.0b, já foi fechado em `e5f9be2`):

**C.0a Dispersão geométrica** (T5 e T14). É a medida de discordância do painel,
uma das cinco causas de fragilidade. Não existe no código: busca por `dispers`,
`desvio.geom` e `gsd` em `app`, `lib` e `components` não retorna nada.

**A fórmula tem dono e a fonte já está no projeto.** `Dispersion_of_group_judgments.pdf`,
de Saaty e Vargas, está na base de conhecimento do projeto e **não está indexado
no RAG**: busca por `dispers` em `lib/rag/articles/` retorna zero. Implementar é
requisito, não achado. Indexar o artigo é parte da tarefa.

**✅ C.0b Tabela 4 e Apêndice G completos.** Fechado em `e5f9be2`, junto com A.1.
A tabela de respondentes exibe os seis CRs por matriz, o CR governante e a matriz
que governou, conferidos célula a célula contra
`docs/referencia-cr-individuais.md`. **Não é mais pré-requisito do Bloco D.**
Resta apenas C.0a.

**O restante do Bloco C é requisito de ferramenta e de rastreabilidade, não
contribuição:**

**C.1 Trazer para a tela o que já existe.** Peso global dos subcritérios (T9),
prioridades locais nos vinte subcritérios (Ap. F), as seis matrizes agregadas
(Ap. E), estimativas econômicas e CAPEX/OPEX (T2, Ap. B), e a comparação das
alternativas nos vinte subcritérios (Ap. C). Tudo já calculado ou cadastrado.

**C.2 Pesos globais por perspectiva decisória** (T10). Agregação por `dimension`,
barato.

**C.3 Quadro 15**, síntese interpretativa dos perfis BOCR.

## Bloco D. Força da recomendação — a contribuição

Cada causa de 1.6 vira uma verificação com resposta acionável.

| # | Verificação | Base existente |
|---|---|---|
| D.1 | Dominância entre alternativas, respeitada a direção de Custos e Riscos | `altScores` e `altMeritScores` |
| D.2 | Recomputação por composição do painel, exclusão de um respondente por vez | `excludedRespondentIds` já existe em `calculate/route.ts` e na UI |
| D.3 | Concentração da vantagem em poucos subcritérios | `altScores` e pesos globais |
| D.4 | Sensibilidade à ponderação, substituindo a classificação de A.2 | **duas** varreduras já existem, ver nota abaixo da tabela |
| D.5 | Dispersão do painel | depende de C.0a |
| D.6 | Substituir `robustnessLevel` por leitura que distinga invariância estrutural de robustez observada | `methodConcordance` |

**Nota sobre as duas varreduras de sensibilidade.** Elas não são duplicação e
nenhuma deve ser removida:

- `calculateSensitivityWithClassification` varre em passo de **1 ponto
  percentual**, subindo e descendo a partir do peso atual, e é a **busca do ponto
  de inflexão**. Corresponde ao procedimento descrito na Seção 3.3 do manuscrito.
  O que sai dela em A.2 é apenas a classificação categórica; a varredura fica.
- `calculateSensitivityTrajectoriesOnly` varre **21 pontos com passo de 0,05** e
  gera as curvas da **Figura 21**. A nota da figura no manuscrito é explícita
  quanto a isso.

Se um dia a tela precisar dizer algo sobre robustez, a formulação com fonte já
está no manuscrito, Seção 4.10: "nenhum dos méritos é crítico, nos termos de
Karande, Zavadskas e Chakraborty (2016) e Triantaphyllou e Sánchez (1997)". Isso
nasce em D.4, não antes.

---

# Decisões fechadas

**Caso de demonstração: duas alternativas, o mesmo da dissertação.** O painel de
doze especialistas sustenta a alegação. Ambas já estabelecidas na dissertação
aprovada.

Consequência de engenharia a registrar: com duas alternativas, D.1 e D.6 têm
menor poder discriminante, porque a dominância se resolve em quatro comparações e
a concordância entre os cinco métodos é quase garantida. D.2 e D.5 não são
afetadas, porque dependem do número de respondentes.

Contraponto medido, que não decorre do número de alternativas: a dominância no
nível dos quatro méritos é estrita, e no nível dos vinte subcritérios é ausente,
com 11 favorecendo A1 e 9 favorecendo A2. O contraste vem da ponderação
intra-mérito.

**Camada de IA: dois consumidores.** Ver 1.3.

---

# Pendência de segurança, fora do escopo do saneamento

**As regras do Firestore não foram verificadas, e o repositório é público desde
10/09/2026.**

O que foi verificado e **não** é problema: a `apiKey` do Firebase em
`lib/firebase.ts` não é segredo. Toda aplicação web Firebase a expõe no bundle do
cliente; é identificador de projeto, não credencial, e já era visível pelo
DevTools no site em produção. As chaves que importam, `ANTHROPIC_API_KEY` e
`VOYAGE_API_KEY`, estão em variável de ambiente, e nenhum `.env` está versionado.

O que **não** foi verificado: as regras de segurança do Firestore. Elas não estão
versionadas no repositório, então não há como saber do código o que permitem. A
proteção dos dados depende inteiramente delas.

O que está nas coleções: doze respondentes com e-mail corporativo nominal,
demografia, 864 julgamentos, mais `calculations` e `projects`. São dados pessoais
de pessoas identificáveis, coletados sob consentimento para pesquisa.

Tornar o repositório público **não criou** a exposição, porque o `projectId`
sempre esteve no bundle, mas reduziu o esforço de encontrá-la.

**Como verificar:** console do Firebase, Firestore Database, aba Rules. Um
`allow read, write: if true;` ou uma data de expiração do modo de teste indicam
acesso aberto.

Decisão registrada em 10/09/2026: não mexer agora. Esta seção existe para que a
pendência não se perca.

---

# O que este documento não decide

**Como o gestor extrai um elemento da tela.** Ele não usa texto do software, mas
não está definido se copia número, tabela ou gráfico.

**Onde a interpretação por IA entra no fluxo.** Definido que serve para
compreender, não para redigir. Não definido em que momento da jornada.

**O formato do Quadro 15.**

**O que fazer com `/api/audit-decision`**, cujos validadores heurísticos já rodam
acoplados ao resultado. São **seis** desde `d16491a`: consistência, tamanho da
amostra, concordância entre métodos, poder de discriminação, qualidade dos dados
e a validação lógica.

**Decisão adiada para o fim do saneamento, em 10/09/2026.** O levantamento
preliminar mostra que a rota reproduz o mesmo padrão já removido em três
grandezas: rótulos categóricos sem fonte. O "Relatório Técnico Completo", gerado
por `generateTechnicalReport` e baixável em `.md` pela tela, traz "Consistência
excelente (< 5%)", "Amostra muito boa (≥ 12)" e "Excelente discriminação", todos
com limiares próprios sem lastro, mais o rodapé "AHP-BOCR Scientific Validator
v3.1", que é o nome do desenho anterior.

Pelo teste de trilho, o relatório não passa em nenhuma das três perguntas: cinco
linhas de PASS que a tela já mostra, em formato de parecer editorial dirigido a
autor de artigo.

⚠ **Verificar antes:** o relatório afirma "Diferença de 58,0%" entre as
alternativas. Os scores são 0,064129 e 0,026937, e não é evidente de onde sai
esse número. Pode ser normalização não declarada.

**Quando retomar, decidir de uma vez**, e não por partes: remover só o relatório
deixa a fonte. As saídas são remover o relatório, remover a rota inteira, ou
reduzi-la a fatos sem juízo. O levantamento necessário é o mesmo que foi feito
para a sensibilidade: o que cada um dos seis validadores produz e onde aparece. Sobrepõe-se ao Bloco D: ou os validadores são
estendidos com as verificações de 1.6, ou a rota é substituída por elas.

**A fronteira de ineditismo do Bloco D.** Ver o aviso em 1.6. Depende de
levantamento bibliográfico com PVB contra a literatura de AHP de grupo, não de
engenharia.
