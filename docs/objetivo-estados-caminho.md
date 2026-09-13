# ahp-simple: objetivo, estados e caminho

Documento âncora. Revisado em 11/09/2026. Último commit de código: `bf959b6`; os de documentação vieram depois.

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
- Prever critérios de aceite por leitura em vez de medir rodando. **Contagem que
  vem do texto do código é hipótese; a que vem da execução é medida.** Casos
  medidos nesta sessão: o `characterization.test.ts` tem dez blocos `test(` no
  fonte e o jest reporta **30**, porque parte é gerada em laço; e as contagens de
  ocorrência por linha de grep subestimaram cinco vezes o escopo de tarefas de
  atribuição. **É a mesma lição da família dos nomes enganosos, em outra forma:** o
  fonte descreve a intenção de quem escreveu, o runtime mostra o que executa.
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
- Conferir um artefato contra a fonte sem ler os campos de metadado do próprio
  artefato. No Bozóki, o campo `notes` declarava que as páginas eram de outra
  edição do mesmo trabalho; passei horas no PDF errado, criei uma tarefa e escrevi
  um prompt, tudo descartado. **A regra: antes de conferir localizadores contra um
  PDF, ler `notes` e confirmar que o PDF é a edição de onde as claims saíram.** É o
  mesmo erro que o registro documenta no sistema — afirmar com base em parte do
  artefato — cometido pela apuração.
⚠ **As duas entradas seguintes são as primeiras desta lista derivadas de erro
EVITADO, não cometido.** O levantamento revelou o problema antes da execução, e o
procedimento funcionou. A terceira, sobre o botão de pular, registra um erro que
eu cometi e corrigi na mesma rodada.

⚠ **Mudança de decisão, registrada em 11/09/2026: os prompts de tarefa passam a
ser versionados, em `tools/prompts/`.**

Em `c9fc46f` os quatro documentos de conteúdo foram versionados e **os prompts
ficaram fora**, com a razão de que guardar prompt executado no repositório é
discutível.

**O argumento que mudou:** o prompt registra os **valores medidos na Fase 1** e os
critérios de aceite, o que permite conferir depois se o entregue era o pedido. Sem
ele, a especificação da tarefa se perde: os prompts das primeiras vinte tarefas
ficaram fora do repositório e alguns desapareceram, incluindo dois que tiveram de
ser reescritos.

**Esta entrada existe para que a próxima sessão não encontre duas decisões
contrárias sem saber qual vale.** A que vale é esta.

- Confundir a **mecânica** de uma atribuição com a sua **adequação**. Ao auditar as
  seis ocorrências de `verbatim_quote` no `ingest-rag.ts` para A.17, classifiquei a
  linha 263 como "já correta, é texto direto". A mecânica estava certa — o campo
  recebe a string sem transformação — e a adequação não: **a string é uma
  recomendação editorial, e o campo se chama `verbatim_quote`.** Uma auditoria
  externa apontou o que eu tinha lido e aprovado. **A regra: ao conferir um campo,
  perguntar o que ele promete, não só de onde o valor vem.** É a família dos nomes
  enganosos, e eu a cometi auditando exatamente ela.
- Tratar uma restrição do ambiente como dada, sem tentar removê-la. Passei três
  rodadas afirmando que o jest não rodava no meu clone por falta de
  `node_modules`, e pedindo os números a quem tinha a suíte. **A rede permite npm,
  e `npm install` levou 34 segundos.** A restrição era removível e eu não tentei.
  **A regra: antes de declarar que não se pode medir, tentar habilitar a medição.**
  É a mesma família de prever em vez de medir.
- Tratar código **inalcançável** como decisão de produto. Refina a regra anterior:
  código com fundamento merece decisão própria **quando alguém poderia usá-lo**.
  **A regra: antes de tratar código sem uso como decisão de produto, conferir se
  existe caminho até ele.**

  ⚠ **E a aplicação desta regra ao IPC estava ERRADA.** Concluí que ele era
  inalcançável porque **confirmei a ausência de um mecanismo**: o botão de pular
  comparação não existe e nada grava `skipped` em produção. **Mas o caminho não era
  esse.** É simplesmente **não responder tudo e finalizar**, o que o formulário
  permite: o `handleFinalizeSurvey` valida **conectividade do grafo**, não
  completude, e o `calculate` filtra só por `completedAt`.

  **A regra que falta: confirmar a ausência de um mecanismo não estabelece a
  ausência da capacidade.** São coisas diferentes. Procurei o alcance no lugar em
  que eu imaginava que ele estaria, e não no lugar em que a validação de fato
  decide. É a mesma classe de "nome de identificador é hipótese", aplicada a
  mecanismo em vez de nome.

  ⚠ **Havia sinal no código e eu não o li:** a linha 1017 declara "Stub de
  finalização. Etapa 4/4 substituirá por validação IPC completa." **O próprio
  código avisava que a validação era provisória.**
- Tratar "não usado" como "indevido". Os quatro construtos removidos nesta sessão
  eram heurística sem fonte: limiares inventados, listas de palavras-chave,
  rótulos sem lastro. **O IPC é outra coisa:** tem fundamento no RAG, a matriz
  incompleta é problema real e o LLSM é método estabelecido. O levantamento mostrou
  que ele **não é usado**, e eu estava a ponto de removê-lo pelo mesmo critério dos
  outros. **A regra: construto sem fonte se remove; código sem uso mas com
  fundamento se registra, e a remoção exige decisão própria ⚠ **SUPERADO em 11/09/2026: a decisão foi tomada.** O IPC sai por A.21 **porque o instrumento aceita apenas respostas completas**, que é decisão de escopo do trabalho. O defeito do F02 reforça a prioridade, **não é a justificativa**: do contrário, corrigir o cálculo passaria a ser alternativa à retirada, e não é. Esta passagem fica como registro do raciocínio, não como pendência.
- Descobrir uma decisão de produto no meio de uma tarefa de saneamento. A remoção
  do IPC implicava decidir se o respondente pode pular comparação, o que é escopo
  do instrumento e não passa pelo teste de trilho. **A regra: quando o escopo
  cresce até tocar o que o usuário pode fazer, parar e separar a decisão da
  execução.**
- Afirmar sobre funcionalidade a partir do nome de um identificador. Vi
  `{/* Skip link */}` e cinco leituras de `skipped` e concluí que havia botão de
  pular comparação, o que criou uma decisão de produto inexistente. **O botão é
  "Pular instruções e iniciar pesquisa"**, e nada grava `skipped` em produção.
  **A regra: nome de identificador é hipótese, não evidência.** Ler o que o handler
  faz, não o que o comentário diz.

  **É uma família, com quatro casos medidos nesta sessão:** o `dominanceAnalyzer`,
  que não media dominância entre alternativas; o `avgCR`, que era o máximo e não a
  média; o `verbatim_quote`, que não era verbatim em treze claims; e o "Skip link",
  que pulava instruções e não comparações. **Nos quatro, o nome descrevia a
  intenção de quem escreveu, não o que o código faz.**

  ⚠ **Mesma causa, gravidades muito diferentes.** O `avgCR` alimentou uma
  classificação errada dos doze respondentes que chegou ao parecer; o "Skip link"
  enganou um levantamento por uma rodada. **A regra não diz que todo nome enganoso
  é grave: diz que nenhum nome dispensa verificação.** A tabela agrupa por causa,
  não por consequência.
- Misturar, no mesmo commit, correção com critério mecânico e correção com
  critério de leitura. **A segunda contamina a conferência da primeira:** um diff
  com setenta valores convertidos por fórmula é verificável; o mesmo diff com
  reancoragens por julgamento deixa de ser. Aconteceu na divisão de A.19, e a
  separação foi o que manteve a parte 1 conferível.
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
- Repetir, na lista do `git add`, um caminho que o `git rm` já removeu. O caminho
  não está mais na árvore nem no índice, então o `git add` **falha inteiro**:
  `fatal: pathspec '<caminho>' did not match any files`, saída 128, e **nenhum dos
  outros caminhos da mesma linha é indexado**. A remoção continua staged pelo
  próprio `git rm`, a edição de documento fica de fora, e **o commit sai
  incompleto sem nenhum sinal de erro** — a mensagem de falha aparece antes, no
  comando anterior, não no commit. Aconteceu em A.6. **O que pegou foi o
  `git show --stat` depois do commit**, que é a segunda metade do par prescrito no
  `CLAUDE.md`.

  ⚠ **A falha depende de a remoção já estar staged.** Medido nas duas formas nesta
  sessão, em repositório descartável (git 2.50.1): com `git rm` antes, o
  `git add doc.md orfao.ts` sai 128 e o `doc.md` permanece ` M`, não indexado; com
  `rm` simples, o mesmo comando sai 0 e indexa a deleção. **A regra: caminho
  removido com `git rm` não se repete no `git add`, e o `git status --short` antes
  mostra quais já estão com `D` na coluna do índice.**
- Buscar o início de um bloco a remover por um delimitador que **não é único**.
  Para tirar o union-find da tela em A.21, procurei a `interface` e depois recuei
  até o `/**` anterior, supondo que o comentário fosse do bloco. **Era de outra
  função**, e a remoção levou **200 linhas alheias** — o `getImpactText`, o
  `DEMOGRAPHIC_OPTIONS` e os imports de `React` e `VideoBackground`.
  **É a mesma família das âncoras de texto: delimitador que não é único não
  identifica um bloco.** `/**` aparece dezenas de vezes num arquivo de 3.700 linhas.

  ⚠ **E o que pegou foi o `tsc`, não a leitura do diff.** O `npx tsc --noEmit`
  acusou oito nomes inexistentes na hora; eu só fui olhar o diff depois, para
  entender o tamanho. **Um erro de escopo de remoção não aparece no diff que você
  pediu, e aparece no typecheck que você não pediu.**

  **O remédio, que funcionou na segunda tentativa:** reverter com
  `git checkout -- <caminho>`, delimitar por **faixa de linhas** e, antes de
  escrever, **listar os símbolos contidos no trecho** e afirmar que o conjunto é
  exatamente o esperado. A asserção falhou uma vez, por a faixa começar uma linha
  adiante do cabeçalho, e foi isso que impediu o segundo corte errado.

- Manter número em documento por ele estar certo, quando o problema é ele ser
  herdável. **Os seis números retirados do `CLAUDE.md` em `974e658` estavam todos
  certos em 12/09/2026**, conferidos um por um: três arquivos na tabela, sete
  arquivos anteriores ao saneamento, seis superfícies e cinco classes no registro,
  cinco coisas aprendidas medindo, cinco construtos removidos. **Saíram porque cada
  um resumia o tamanho de uma lista que está ao lado**, então não acrescentava
  informação e só podia divergir dela depois. **A regra: contagem que acompanha a
  própria enumeração sai; número que alguém vai comparar contra uma medição fica,
  com data e com o previsto pós-tarefa.** Foi por esse critério que a frase sobre
  esta seção perdeu o "vinte": a lista cresce a cada entrada, e a contagem era
  ambígua porque há bullets aqui que não são erro de rota — este, por exemplo.

  ⚠ **E o total pós-A.21 ficou deliberadamente sem valor previsto.** A aritmética
  de exclusão que chegava a **45** valia para a versão da tarefa que **só
  removia**. Depois do achado de que **o IPC é alcançável** pela finalização sem
  completude, A.21 passou a exigir validação de completude individual e adaptação
  dos consumidores, **que acrescentam testes**. **Subtrair deixou de descrever a
  tarefa.** O previsto que restou é qualitativo e verificável: a falha única do
  censo desaparece. **O total se mede depois de executar.**

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

⚠ **A divisão de papéis vigente, desde a revisão de 11/09/2026: este âncora define
o objetivo do produto e da pesquisa; o `CLAUDE.md` define o procedimento de
trabalho.** A seção "OBJETIVO" a que o texto abaixo se referia **não existe mais no
`CLAUDE.md` revisado**, e o parágrafo fica como registro do raciocínio.

Isso resolvia a divergência aparente com o `CLAUDE.md` antigo, que definia que o
sistema produz texto interpretativo e logo depois restringia essa interpretação a dois eixos, fidelidade computacional e ancoragem. Os dois documentos descrevem consumidores distintos do
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

### Oportunidade registrada: replicar a série com um segundo modelo

Registrado em 11/09/2026. **É oportunidade, não tarefa**, e vem depois das
correções que produzem resultado errado hoje.

**O que a limita hoje:** todos os achados do `docs/imprecisoes-parecer-ia.md` —
localizador fabricado, `conditions` citado como verbatim, sensibilidade ao exemplo
de parágrafo, a autorização no prompt — foram medidos com **um único modelo**,
`claude-opus-4-6`.

**A pergunta que um revisor da ESWA pode fazer:** isso é propriedade do modelo ou
do sistema?

**O que a replicação decidiria.** Se os mesmos modos de falha aparecerem num
segundo modelo, o achado deixa de ser sobre um produto e passa a ser sobre **LLMs
recuperando de base com atribuição frouxa**. É diferença de alcance grande para o
artigo, e converte cinco classes de falha de observação em regularidade.

**Candidatos:** Ollama para modelo aberto local, ou vLLM para servir com controle
de parâmetros. Nenhum entra em produção: **é experimento em paralelo.**

**Custo:** moderado. A chamada está num ponto só, `ai-reviewer/route.ts` linha
1399, mas o SDK da Anthropic é importado na linha 7 e o cliente instanciado na 711.
Uma camada de adaptação sobre essas três linhas basta para a série.

⚠ **O que NÃO fazer:** trocar o modelo de produção, nem adotar framework de
orquestração — LangChain, LlamaIndex, Langflow, Dify — para isso. Os problemas
medidos estão no **conteúdo** do que se envia, não na mecânica do envio, e
acrescentar abstração não os alcança.

⚠ **E não automatizar a extração do RAG** com ferramenta de chunking. O RAG é
curado por desenho, com `page`, `locator_id` e `quote` por claim, porque o
protocolo PVB exige rastreabilidade. Extração automática pioraria exatamente o que
esta sessão passou vinte tarefas medindo.

**Pré-requisitos:** A.21, A.23 e A.25 antes, porque as três corrigem coisas que
produzem resultado errado hoje. Replicar a série sobre um sistema com defeito
conhecido mede o defeito, não o modelo.

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

**O repositório tem 145 arquivos rastreados**, medido em 12/09/2026 em `0ac4e95`,
contra 298 no início do saneamento. ⚠ **Subiu de 139 para 145 com A.21**, e a
direção é esperada: saíram dois módulos e dois testes, entraram três módulos de
`lib/` e três arquivos de teste. **Meça antes de citar.** Um único derivador de prioridades,
`lib/ahp-engine.ts`, validado por 30 verificações contra 24 valores de referência
conferidos contra os 864 julgamentos brutos e contra a AhpAnpLib. Zero guardas
silenciosas no caminho de cálculo. Um gravador único de `calculations`. Censo de doze
testes que, **desde `0ac4e95`, passa inteiro** — antes acusava o LLSM fora do
módulo de matrizes incompletas, e esse módulo não existe mais.

⚠ **Correção de 11/09/2026: o censo NÃO quebra o build.** Não existe GitHub
Actions neste repositório — `.github/` contém só `copilot-instructions.md`. **A
garantia é local e manual**, dependente de alguém rodar `npm test`.

⚠ **E o censo cobre derivação de prioridades, não síntese.** A rota
`app/api/calculate/route.ts` importa do motor `principalEigenvector`,
`consistency` e `aggregateAIJ`, e **implementa as fórmulas de síntese em código
próprio**, dentro de `calculateAlternativeScores`.

⚠ **Desde `a5524d1` essa cópia é exercitada por teste, e a pendência NÃO diminuiu.**
O teste do handler mostra que ela reproduz a Tabela 12 **no caso de referência** —
não que as duas implementações sejam equivalentes para toda entrada. **A diferença
está medida:** a cópia da rota tem **cinco clamps `EPS_GUARD = 1e-12`** e o
`synthesizeBOCR` do motor **nenhum**, o que divergiria com mérito de peso nulo — a
mesma região onde A.23 (F04) registra os escores 0 e 0. **Unificar continua sendo a
correção; o teste só impede que a divergência passe sem ser vista no caso conhecido.** Nenhum dos doze testes verifica unicidade
da síntese. 10 306
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
| ✅ A.1 | **Fechada em `e5f9be2`.** Painel de qualidade: uma rotina só, que é a Tabela 4 ⚠ **PARCIAL, descoberto em 11/09/2026:** a remoção alcançou a **exibição**, não a origem nem o transporte. O `classifyRespondent` continua calculando o score por interpolação linear sem fonte, e o tipo `qualityAnalysis` do `ai-reviewer/route.ts` declara `statistics.avgScore`, `overall.qualityScore`, `overall.status` e `overall.recommendation`. **O construto sem lastro continua chegando ao modelo do parecer.** Fecha em A.12, que passou a ter escopo de remoção |
| A.2 | Remover a classificação categórica de sensibilidade (Robusto / Moderadamente Sensível / Sensível / Crítico, limiares 50/20/10). ⚠ **Não é "sem fonte": é fonte que não sustenta.** O `metadata.q1Features` declara `'Sensitivity Classification (Alizadeh 2020)'`, e as claims de Alizadeh no RAG tratam de escolha de fórmula BOCR e de limiar de CR, nunca de classificação por ponto de inflexão. Ver `docs/imprecisoes-parecer-ia.md`. **Sete implementações, mapeadas abaixo da tabela**, em quatro commits. O commit (4) **depende de A.29**, que remove o `lib/knowledge.ts` legado onde está o `interpretSensitivity` (antes atribuído a A.6, que encolheu para só o `knowledge-ipc.ts`) |
| ✅ A.3 | **Fechada em duas partes.** `501b19a` removeu o módulo `dominanceAnalyzer`, a injeção no prompt e o item 4 do `system-prompt.ts`. A predição registrada foi **refutada pela execução 4**: a passagem de Saiyed e a atribuição ao perfil do painel permaneceram, e a refutação revelou um **segundo canal** que o levantamento não vira: a seção "Fairness e Viés Profissional" listava os três autores com descrição do que ofereciam, e uma exceção autorizava citá-los. `28f4a95` removeu as três entradas e a exceção, renomeou a seção para "Fairness" e preservou Dodevska. **A execução 5 confirmou as três predições.** O percurso vale mais que um acerto de primeira: a refutação identificou a causa. Evidência em `docs/imprecisoes-parecer-ia.md` |
| ✅ A.4 | **Fechada em `8730cb6`.** O rótulo do modelo na tela dizia "Claude Sonnet 4.5" enquanto o sistema executa `claude-opus-4-6`. Passou a ler `metadata.model` da resposta do POST, que a rota já devolvia. **Não é string fixa nova:** como o valor vem da resposta que gerou aquele parecer, um parecer antigo exibe o modelo que o gerou, não o configurado agora. Fallback é "modelo não informado", nunca um nome de modelo, para não reintroduzir o problema em silêncio. Verificado com um parecer real da execução 3 |
| ✅ A.5 | **Fechada em `c8ba368`.** Seis tabelas de índice aleatório unificadas em `randomIndex` do motor, em quatro arquivos. Cinco tinham valores idênticos; a sexta, em `BOCRConsistencyMatrix.tsx`, parava em **n=7** e só não falhava porque os índices eram literais 4 e 5. O ganho maior foi trocar três guardas silenciosas `RI[n] || 1.49` por falha alta: o 1,49 é o RI de n=10, e aplicá-lo a ordem maior produz um CR que existe e está errado. **Fechou duas das três falhas do censo**, e a linha de base de testes passou de 52/3 para **54/1**. Verificado que o CSV exportado ficou byte a byte idêntico na seção de consistência |
| ✅ A.6 | **Fechada em `d1bdbd6`.** As 315 linhas órfãs de `app/api/ai-reviewer/knowledge-ipc.ts` saíram, mais a estrofe que o inventário lhe dedicava. **Medido nesta sessão, 12/09/2026:** nenhum importador por caminho de módulo, nenhum `import()` dinâmico, e **zero ocorrências fora do arquivo para os onze símbolos exportados** — a cadeia de chamadas foi conferida pela aresta de entrada, não pelo nome. Linha de base antes e depois **idêntica**: `tsc` sai 0, **55 testes com a mesma falha única do LLSM no censo**, e build de **17 páginas**. **Sem predição registrada, e a medição é a justificativa:** `getIPCContextForAI` era a única função que produziria texto de prompt e tinha zero chamadores, então nada do que o modelo recebe mudou; a verificação é contra a fonte. ⚠ **Três achados que a nota da tarefa não previa.** (1) **O arquivo falava de LLSM em prosa mas não casa com o regex `/llsmIPC|LLSM_IPC/` do censo**, medido com `grep -cE`, que dá 0. O filtro `!f.startsWith('app/api/ai-reviewer/')` em `engine-census.test.ts:173` existe por causa do `system-prompt.ts`, que **casa** — **remover o órfão não o torna obsoleto**, e quem inferir o contrário mexerá no teste sem razão. (2) **Não era só base de texto: tinha código.** O `analyzeCompleteness` emitia recomendação por faixas de **50% e 70%** com "recomenda-se" e nenhuma fonte — construto sem lastro, que saiu na remoção mecânica por não ter caminho até ele, sem decisão de trilho própria. (3) **`Belton & Gear (1983)` só existia aqui em todo o repositório**, como citação secundária ("citado em Bozóki et al.") com `rule` do indexador, nunca como claim indexada. Harker (1987) e Bozóki sobrevivem no RAG. **A perda é deliberada e fica registrada.** ⚠ **O resto do IPC continua em A.21**, e este era o primeiro dos dois commits do par |
| ✅ A.7 | **Fechada em `599d0d8`.** 122 remoções e 4 documentos movidos para `docs/`. O repositório caiu de 257 para 135 arquivos, 119 041 linhas |
| A.8 | Unificar o limiar de CR no painel de consistência, alcançando `ConsistencyGaugeChart` e o painel textual **numa edição só**. Adiado de A.1 porque os dois são hoje coerentes entre si, e corrigir um cria divergência adjacente no mesmo campo de visão. Não é cosmético: o eixo do medidor vai a 20% com quebra em 10% e 15%, e reduzir para um limiar muda o que o arco comunica |
| ✅ A.9 | **Fechada.** `maxDuration` cortado de 800 para 300s em `56bd50a`. **Cinco medições:** 154, 150, 188, 159 e 136 segundos, média de 157s e máximo de 188s. Todas cabem em 300, com margem mínima de 112s. A terceira medição sugeria tendência de alta; as duas seguintes desfizeram. **Qualquer aumento de `maxTokens` (hoje 16000) ou do budget de raciocínio (5000) reabre.** Se estourar, a saída é streaming, não porque a Vercel limita, mas porque requisição HTTP síncrona de minutos deixa o gestor em tela travada |
| A.10 | **Auditar as citações e afirmações do prompt contra o RAG e contra o sistema. ✅ 1º de 3 commits em `2b353b3`:** três localizadores corrigidos. A execução 2 confirmou que a correção propagou: as duas citações de Wijnmalen saíram corretas e nenhuma outra melhorou sozinha. **2º commit:** remover o dado real dos exemplos de parágrafo, incluindo a frase "os 12 respondentes apresentam CRs entre 1,1% e 9,6%", que é a imprecisão 1 ensinada como modelo de redação. **✅ 2º commit em `ca36539`:** o payload passou a informar N = 12 em todas as matrizes. As três predições registradas antes da execução se confirmaram: a imprecisão 2 desapareceu, Escobar passou a ser aplicado com N=12, e a faixa dos CRs permaneceu como controle. **Classe E confirmada como fato medido, ao custo de quatro linhas.** **3º commit:** (a) auditar as 61 combinações de autor e ano; (b) auditar o restante do payload, onde `- ✅ Validação externa com pyAHP` faz o parecer afirmar biblioteca que o sistema não usa. Equações e limiares já auditados. Evidência em `docs/imprecisoes-parecer-ia.md` |
| A.11 | **Fechar a procedência das cinco fórmulas de síntese.** Não é limpeza de metadados, e a **ordem importa**: **(1) Indexar a claim das cinco fórmulas do Lee (2009), página 123, Step 10.** É a mais importante e a mais barata: é a fonte do método central do sistema, verificada no PDF, e a sua ausência impede o parecer de checar a procedência da Tabela 12. **(2) Indexar Lee (2009a), de fornecedores, e Demirtas e Ustun (2008)**, fontes de funcionalidades declaradas em `metadata`, ausentes do RAG e presentes na base de PDFs. **(3) Só então** corrigir ou remover as atribuições que sobrarem sem lastro, abrindo o PDF antes de decidir em cada caso. **Fazer (3) primeiro apagaria atribuições corretas**, como quase aconteceu com o Lee. Alizadeh (2020) pendente: 35 páginas, sem camada de texto, exige inspeção visual. Evidência em `docs/imprecisoes-parecer-ia.md` **Inclui a string `'Sensitivity Classification (Alizadeh 2020)'` no `q1Features`**, que é o oitavo endereço do construto e cai entre A.2 e A.11: depois de `5837d0d`, ela declara no documento persistido uma funcionalidade que o motor **não faz mais**, e a atribui a um autor. As duas metades da afirmação são falsas ao mesmo tempo. Sai na etapa 3, por ser atribuição e não implementação ⚠ **CORREÇÃO de 11/09/2026: Demirtas e Ustun ESTÁ no RAG**, como `demirtas2008_integrated.ts`. A afirmação de que não estava indexado era falsa, e a etapa 2 encolhe. **Verificado por `ls lib/rag/articles/`** |
| A.12 | **Resolver a distribuição categórica de status enviada ao parecer.** ⚠ **Não é "acrescentar o quarto balde".** O `individualStats` classifica em **três** degraus (`valid`, `warning`, `critical`) e a distribuição enviada tem **quatro** categorias (CONFIÁVEL, REVISAR, SUSPEITO, CRÍTICO), com `'REVISAR'` literal zero. Os dois lados não falam a mesma língua: o quarto balde não falta por esquecimento, ele não existe na contagem. **Criá-lo exigiria escolher um limiar novo**, e os únicos com fonte (CR ≤ 0,10 de Saaty; CR > 0,20 de Saaty e Ergu) dão três faixas, não quatro. Seria reintroduzir o construto categórico sem lastro que A.1, A.2 e a remoção do `validateSensitivity` tiraram em quatro commits. **A pergunta a decidir antes de codificar:** a distribuição por categoria deveria existir no payload, ou o parecer deveria receber os CRs e nada mais? É a mesma decisão de A.1, que removeu os quatro baldes da tela e deixou o CR cru. Se a resposta for a mesma, a tarefa vira *remover a distribuição categórica do payload*, que é menor e mais coerente. ⚠ **Previsão antiga RETIRADA:** o texto dizia que depois de B.3 os doze cairiam todos em `critical`. **Está errada** (serão 1 REVISAR e 11 CRÍTICO), e **deixou de ser relevante**: esta tarefa remove a distribuição, então nenhuma previsão sobre ela é critério de aceite. ⚠ **SEQUÊNCIA, corrigida em 11/09/2026** — a anterior, `B.3 → A.12 → etapa 4`, contradizia B.3, que determina execução **depois** da etapa 4. **A ordem separa a correção da leitura do cache da limpeza física posterior:** (1) **corrigir a origem dos CRs individuais** e remover o score e as categorias do payload, que é esta tarefa; (2) **executar a etapa 4** da série com as mudanças identificadas; (3) **depois** remover o cache obsoleto por B.3, preservando o registro histórico ⚠ **RESOLVIDA a pergunta aberta, 11/09/2026, e a resposta é remover.** A investigação do `classifyRespondent` (`app/api/response-quality/route.ts`, linhas 221 a 237) mostrou três coisas: **(a) são CINCO status, não quatro**: `CONFIÁVEL`, `REVISAR`, `SUSPEITO`, `CRÍTICO` e **`DESCONHECIDO`**, este último devolvido quando `avgCR === 0`, com o comentário "não encontrado". ⚠ **Zero é consistência perfeita, não ausência** — é o valor real de toda matriz de ordem 2. É o inverso da convenção fixada na tabela de referência, célula vazia para indefinido e nunca zero. **(b) o score é interpolação linear sem fonte:** `95 − (avgCR − 0,05) × 140`, e mais os coeficientes **340, 380 e 200**. Nenhum tem lastro. **(c) ⚠ O score composto que A.1 removeu da tela em `e5f9be2` CONTINUA CHEGANDO AO PARECER.** O tipo `qualityAnalysis` do `ai-reviewer/route.ts`, linhas 367 a 389, declara `statistics.avgScore`, `overall.qualityScore`, `overall.status` e `overall.recommendation`. **A.1 tirou a exibição; a origem e o transporte ficaram.** E o `byStatus` declara **sete chaves**: os cinco status mais duas grafias sem acento. **Consequência: a saída é remover o score e a distribuição categórica do payload, não acrescentar o quarto balde.** O `'REVISAR': 0` fixo era sintoma, não o defeito |
| ✅ A.13 | **Fechada em `99a4d6c`.** As quatro ocorrências de `p. 271` no código corrigidas. **Uma delas era pior que a página:** o JSDoc de `bias-detection.ts` trazia o verbatim `"A consistency ratio of 0.10 or less is acceptable"`, que **não existe em nenhum artigo indexado**; a claim real, na p. 248, diz `"require the ratio to be very small; e.g., of the order of 0.1"`. Trocar só a página teria dado localizador correto a um texto inexistente, transformando erro visível em atribuição plausível e falsa. O exemplo do `citation-whitelist.ts` virou genérico, `"Autor (1977, p. N)"` |
| ✅ A.14 | **Fechada em `a8aa904`.** Duas linhas corrigidas: o texto de saída da detecção de viés no ramo DI < 0,80, que passou à forma composta "Feldman et al. (2015); Dodevska et al. (2023)", e o rótulo visível ao gestor no `BiasAnalysisCard.tsx`, que passou a atribuir os limites a Dodevska. **A decisão não foi remover Feldman, foi uniformizar** para a forma que nove ocorrências já usavam: nomeia a origem histórica da regra dos 80% e a fonte que o RAG indexa. A entrada bibliográfica do cabeçalho ficou, porque lista de referências nomeia obras e não atribui limiares. O `system-prompt.ts` não mudou: no código vale a proveniência completa, no prompt só a fonte indexada, porque a série mostrou que o modelo obedece ao que o prompt autoriza. **Verificado:** das treze ocorrências restantes, a única sem Dodevska no contexto é a bibliográfica |
| A.15 | **Marcar no contexto do RAG o que é citação e o que é anotação.** O `knowledge.ts`, linhas 295 a 301, monta cada fórmula com a `description` no cabeçalho, **colada a autor e ano**, e o `conditions` logo abaixo, sem marca que os distinga do `quote` do artigo. Os dois campos são **texto do indexador**, e o modelo os trata como citáveis: na execução 5 o parecer citou o `conditions` do Kabak entre aspas, como verbatim. **Alcance medido: 124 campos `conditions` preenchidos em 31 artigos**, mais a `description` de todas as claims. ⚠ **Nenhum requisito do eixo de ancoragem pega**: a whitelist valida autor e ano, e ambos conferem. A correção é de **formato**: `quote` entra como citação, `description` e `conditions` como texto do sistema, com rótulo. Mesma família da classe E, mesma solução: não reescrever a instrução, corrigir o que se entrega a ela. Evidência em `docs/imprecisoes-parecer-ia.md`, sexta superfície |
| A.16 | **Auditar a consistência interna do RAG: `verbatim_quote` contra `evidence.quote`.** 123 claims têm os dois campos, **13 divergem**. ⚠ **A leitura caso a caso, feita em 11/09/2026, inverteu uma premissa de A.17: as treze são DOIS defeitos opostos.** Em **oito** o `verbatim_quote` é anotação ou está reescrito, e o `evidence.quote` é o fiel (Dodevska **×2**, Xu, Lee, Wijnmalen ×3, Saaty e Ozdemir). Em **cinco** é o `evidence.quote` que está **truncado**, e o `verbatim_quote` traz a frase completa (Bozóki ×3, Schmidt, Salomon). O do Schmidt se resolve sem PDF: o `evidence.quote` começa com "This" sem referente. **Consequência: A.17 acertou nos oito e, nos cinco, fez o modelo receber texto mais curto, não infiel.** Não pede reversão; pede corrigir os `evidence.quote` truncados, que é escopo desta tarefa. **A classificação é leitura, não script:** um teste de contenção por fragmentos marcou onze dos treze como divergentes em conteúdo, porque o campo longo **insere** texto no meio do curto. Evidência em `docs/imprecisoes-parecer-ia.md` ⚠ **A.19 tem precedência**: a numeração inconsistente contamina qualquer medição de localizador ⚠ **A décima terceira foi identificada em 12/09/2026, e a partição por direção fecha em 8 + 5 = 13.** É a **segunda claim divergente do `dodevska2023when.ts`**, a de `usable_as: "limitation"` e `evidence.page` 12, com `verbatim_quote` "When the starting point is high inconsistency... it is more challenging to correct the consistency issue." **O Dodevska conta duas vezes entre os reescritos, e é o único artigo com duas claims divergentes.** ⚠ **Gravidade dentro do grupo, e é o que a separa das outras sete:** em Lee, em Xu e na outra claim do Dodevska as reticências apagam **notação** — siglas, subscritos, referência a equação — e a frase **diz o mesmo, só menos verificável**. Aqui elas engolem **outra proposição**: o `evidence.quote` traz "independent of the DI value, the average value of the goal function is more elevated, i.e., the conclusion is that" no meio da frase, e o campo apaga o achado sobre a função objetivo, a condição de escopo e o marcador que declara a oração seguinte como inferência. **Sobra a conclusão sem a medida em que ela se apoia.** ⚠ **Ressalva de precisão: a oração que sobrevive está no artigo**, como conclusão dos autores; o campo não inventa a afirmação, **apaga o fundamento, a condição e a marca de inferência.** ⚠ **ESCOPO REDUZIDO: a tarefa é decidir qual campo fica, e a direção resolve doze.** Nos oito reescritos fica o `evidence.quote`; nos cinco truncados, o `verbatim_quote`. **Sobram dois resíduos:** o **Dodevska**, cujas duas claims são de subtipos diferentes dentro dos reescritos — uma apaga notação, a outra apaga proposição — e a segunda pede decisão sobre a claim, não só sobre o campo; e **os casos em que o campo escolhido ainda precisa de conferência contra o PDF.** ⚠ **As duas decomposições das treze NÃO coincidem, e nenhum número está errado:** uma parte por **direção do truncamento** (8 + 5), a outra por **detectabilidade** (12 identificáveis por leitura + 1 que parece citação legítima). **Quem tentar reconciliá-las vai concluir que um dos números está errado.** E a segunda entra em revisão por este achado: **por forma, a décima terceira está do lado do Lee**, o que a levaria a 11 + 2 — leitura caso a caso, decisão desta tarefa. ⚠ **Consequência para A.17, já em produção:** nos cinco truncados a troca de fonte entrega texto **mais curto, nunca infiel**; **A.16 corrige a base e o efeito desaparece sem tocar código.** Não há reversão a fazer |
| ✅ A.17 | **Fechada em `bf959b6`.** As citações que chegam ao modelo passaram a vir de `evidence.quote`. Três arquivos: a `rule` do `knowledge.ts`, o texto e o metadata do chunk no `ingest-rag.ts`, e a instrução do `system-prompt.ts` que apontava o campo defeituoso como primário. **A execução 6 confirmou as três predições:** Lee com as siglas, Xu com "this paper proves that", Dodevska com `(DI_bef)`, e o controle da faixa dos CRs intacto. ⚠ **A correção do ingestor só vale depois de reingestão**, ainda pendente: o caminho semântico, via `route.ts:149`, continua entregando o campo antigo. **O total em código caiu de 21 para 19**, não 20 como o critério previa: as duas linhas removidas do prompt tinham o termo cada uma ⚠ **Ressalva de A.16, registrada em 11/09/2026:** em **cinco** das treze claims divergentes o `evidence.quote` é o campo **truncado**, então a troca fez o modelo receber texto mais curto nesses casos. **Em nenhum caso texto infiel.** A correção é ajustar os `evidence.quote` em A.16, não reverter esta tarefa |
| A.18 | **Reingerir o índice semântico no Upstash.** A correção de A.17 no `scripts/ingest-rag.ts` só vale depois de reexecutar a ingestão: os chunks indexados continuam com o `verbatim_quote` defeituoso, e o `route.ts:149` os entrega ao modelo na seção de chunks semânticos do payload. ⚠ **Depende de A.16, e a ordem importa por custo.** A reingestão reescreve o índice e paga chamadas de embedding; fazê-la antes de corrigir as treze divergências do RAG significaria pagar duas vezes. **Ordem: A.16 primeiro, depois A.18.** Depois dela, gerar um parecer e conferir se as citações vindas de chunks semânticos também saem na forma fiel ⚠ **Estado intermediário conhecido, até a reingestão rodar:** o `ingest-rag.ts` já grava `evidence.quote` nos chunks de claim, mas **o índice Upstash ainda guarda o `verbatim_quote` antigo**. Código e índice divergem. É o mesmo padrão de B.1, o cache que sobrevive à correção: se aparecer uma citação na forma antiga, **é o índice, não regressão**. **O teste de se a reingestão é necessária não é gerar outro parecer:** é ler o payload e ver de qual seção veio cada citação, a do RAG estático ou a de chunks semânticos. Mais barato e decide ⚠ **BLOQUEADA por A.26 (F08), 11/09/2026:** a linha 263 do `ingest-rag.ts` grava recomendação editorial em `verbatim_quote` com localizadores nulos, e o `route.ts` a rotula como `*Verbatim:*` ao modelo. **Reingerir sem corrigir o ingestor perpetua o defeito**, porque ele está no código e não nos dados. **Ordem: A.26 antes de A.18** |
| ✅ A.19 | **Fechada em `23afe43`.** Sete artigos do RAG registravam `page` em numeração relativa ao PDF enquanto o próprio `abnt` declara a faixa do periódico; os sete foram convertidos, 54 campos, e a conferência de faixa passou a acusar zero. ⚠ **A inversão que isso revelou: em quatro citações dos pareceres o modelo estava certo e a base errada.** Saaty (2003, p. 85), Saaty (1987, p. 165) e Forman e Peniwati (1998, p. 169) caem dentro da faixa real e fora do `page` registrado. **Os dois últimos eram o que o documento chamava de "erro de vizinhança", categoria que se revelou invenção nossa.** Com A.20, as taxas caíram de 72% e 62% para 61% e 57%. ⚠ **RETIFICAÇÃO: o Bozóki não era o oitavo caso.** O campo `notes` do próprio arquivo declara que as páginas 2256-2257 são da **versão IEEE 2009** do mesmo trabalho, e que o `abnt` cita a versão de jornal por ser a canônica. **Os localizadores estão corretos para a edição de onde foram extraídos**, e o PDF em `/mnt/project/` é a outra edição. A parte 2 desta tarefa foi criada, investigada por horas e **descartada**. **A contagem correta é sete, não oito.** ⚠ **O teste de faixa precisa de exceção baseada no `notes`**, senão reacusa o Bozóki em toda rodada **Pendência residual do Bozóki:** o `abnt` cita a edição MCM 2010 e as claims usam a paginação do IEEE 2009, com o `notes` documentando a divergência. É consistente, mas **é armadilha para qualquer instrumento que compare `page` contra a faixa do `abnt`**, como o `verify-citations.mjs` faz. Duas saídas: **(a) alinhar o `abnt` com a edição das claims**, uma linha, resolve para sempre e deixa o arquivo legível; (b) ensinar o script a pular artigos que declaram edição divergente no `notes`, o que esconde um caso que continuaria confuso para quem lê. **Vale a (a)** |
| ✅ A.20 | **Fechada em `33a9485`.** O `verify-citations.mjs` já classificava em quatro vereditos e já extraía a faixa do `abnt`; **o defeito era a agregação**, que somava `DIVERGE_NA_FAIXA` com `DIVERGE_FORA_DA_FAIXA`, e a legenda, que dizia "o teste por faixa perderia estas" quando é ele que as aprova. **As taxas caíram de 72% e 62% para 61% e 57%.** Três citações migraram para a categoria nova, **localizador dentro da faixa do artigo, com a sustentação da afirmação ainda não verificada**: Saaty (1987, p. 165) e Forman e Peniwati (1998, p. 169) na execução 1, e **Saaty (2003, p. 85)** na 2, que foi a primeira inversão encontrada. Casos de cobertura deixaram de disparar código de saída 1. ⚠ **Pergunta aberta que a categoria nova levanta:** o modelo cita páginas não indexadas por acerto ou por interpolação? No Saaty (2003) é a primeira página do artigo, no Forman a última, no Saaty (1987) uma intermediária. **Só o PDF decide, e os três estão na base do projeto.** |
| A.21 | **STATUS, em 12/09/2026: implementação concluída e verificada por testes automatizados. Regressão do Parecer IA pendente. Ensaio com persistência real em projeto de teste pendente, como verificação complementar.** **Eliminar a capacidade de tratar matriz incompleta, em UMA unidade coerente.** **Achado F02, reproduzido:** o IPC devolve **pesos incorretos com CR excelente**. Em grafo estrela devolve 0,25 para os quatro onde o correto é 0,4 / 0,2 / 0,2 / 0,2, com **CR de 3e-16**. Em cadeia, **pesos incorretos com a ordem preservada** (correção: não são "valores invertidos"). **Resultado errado com indicador perfeito é o pior modo de falha.** O lastro de Bozóki e Harker é do método, não desta implementação. ⚠ **MOTIVO DA REMOÇÃO, e a ordem importa: o IPC sai porque o instrumento aceita apenas respostas completas.** É decisão de escopo do trabalho. **O defeito do F02 reforça a prioridade, não é a justificativa** — do contrário, corrigir o cálculo passaria a ser alternativa à retirada, e não é. ⚠ **E o IPC É ALCANÇÁVEL hoje:** `handleFinalizeSurvey` (linha 1018) valida **só conectividade do grafo**, e a linha 1017 declara "Stub de finalização. Etapa 4/4 substituirá por validação IPC completa." O `calculate` filtra por `completedAt` (linha 794) sem contar comparações. **É essa porta que a entrega 1 fecha.** **ORDEM OBRIGATÓRIA, e a mudança de comportamento é UMA unidade:** (1) implementar a validação de completude individual; (2) adaptar os consumidores ao cálculo de matriz completa; (3) retirar o IPC; (4) validar a regressão. **Não remover antes de validar: geraria versão intermediária que aceita resposta incompleta sem caminho para tratá-la.** ⚠ **Definir o que permanece pela CADEIA DE CHAMADAS, não pelas importações externas.** **Adaptar os consumidores ao cálculo de matrizes completas, preservando o cálculo de pesos e consistência do motor. Substituir as dependências internas de `calculateGroupWeights` e `eigenvectorMethod` antes de remover o módulo. Remover `calculatePartialCR`.** O que a medição mostrou: `eigenvectorMethod` **é usado**, na linha 292, dentro do ramo de matriz completa de `calculateGroupWeights`, pela cadeia `calculateAllWeights → calculateGroupWeights → eigenvectorMethod`; `buildPCM` é **importado e nunca chamado** na rota `calculate`, linha 42; e `calculatePartialCR` é **IPC por dentro** — usa `buildGraphFromJudgments`, `checkConnectivity` e `getCompletenessMetrics` — e **migrá-lo preservaria a capacidade que a tarefa elimina**. Durante o preenchimento, informar progresso e calcular CR só quando a matriz estiver completa. **A validação de completude precisa verificar, por respondente E por matriz:** todos os pares esperados **exatamente uma vez**; identificadores de grupo e itens válidos; valores válidos, sem nulo ou pulado; quantidade esperada derivada do número de alternativas do projeto. ⚠ **Contagem de julgamentos NÃO basta:** 72 registros com uma duplicata e um par faltante passariam. E **cada matriz de alternativas por subcritério** precisa de verificação própria: o bloco visual reúne várias, e a conectividade do bloco não prova que todas foram respondidas. ⚠ **Completude agregada não prova completude individual:** um respondente preenche o par que falta em outro, a matriz agregada fecha, e cada comparação passa a ter número diferente de especialistas. Afeta a agregação AIJ que o manuscrito reporta. **`AUTORIZADO_LLSM` do censo fica VAZIO**, senão o teste autoriza um módulo que não implementa mais o LLSM e a garantia inverte de sinal. ⚠ **NÃO usar redução da suíte como critério.** Os testes a somar são os da tabela de aceite abaixo, e **o total se registra depois da execução** ⚠ **Implementada em 12/09/2026, em cinco commits: `c9f4842` (predição registrada antes), `aec0a0f` (validador), `a5524d1` (extração mecânica), `ab268cd` (os dois portões) e `0ac4e95` (retirada do IPC).** **Medido no fim, com o total vindo do jest e não de subtração:** `tsc` sai 0, build de **17 páginas**, e **91 testes, todos passando** — o censo do motor dá **12 de 12 pela primeira vez**. **O `characterization.test.ts` não foi tocado** e continua reproduzindo os 24 valores publicados. ⚠ **Três achados que a nota da tarefa não previa.** (1) **A porta era mais larga do que se supunha:** nos quatro blocos de alternativas, com duas alternativas, `minRequired` era **1 de 5**, então a resposta podia ser finalizada com **16 dos 72 pares em branco** — e **sem contador visível**, porque o indicador de progresso só renderizava com três ou mais nós. (2) **A cópia própria das cinco fórmulas de síntese na rota nunca havia sido conferida contra a Tabela 12.** O teste do handler real a exercita e ela reproduz os valores publicados **NO CASO DE REFERÊNCIA**. ⚠ **Isso NÃO demonstra equivalência entre as duas implementações para toda entrada**, e há diferença medida: a cópia da rota tem **cinco clamps `EPS_GUARD = 1e-12`** (linhas 307, 316, 317 e 321) e o `synthesizeBOCR` do motor **não tem nenhum** — é exatamente o tipo de diferença que divergiria em borda, com mérito de peso nulo. **A pendência de unificação da seção 2.4 continua pertinente, e o teste não a reduz.** (3) **O módulo novo reproduz até o zero NEGATIVO do R12 em SUB-B**, caracterizado na seção 6 de `docs/referencia-cr-individuais.md` — evidência de que a migração preserva o último bit, não só o arredondado. ⚠ **Pendente, e depende do usuário:** gerar um parecer e conferir a predição de `c9f4842`, que é de **regressão de atribuição**, não de teste causal. |
| A.22 | **Revisar o `README.md`.** 381 linhas, e afirma **"v6.5.0"** e **"5 peer-reviewed papers"** quando o RAG tem **37 artigos**. ⚠ **Mesma família de tudo que este saneamento corrigiu: afirmação sobre o sistema que o sistema não sustenta.** E está na superfície mais visível do repositório, o primeiro arquivo que alguém abre no GitHub, **que é público**. Conferir também as demais afirmações quantitativas do arquivo antes de reescrever, com a regra de medir e não herdar número |
| A.23 | **Corrigir o tratamento de empates. ⚠ ACHADO F04, e é o mais consequente para o artigo.** Com duas alternativas idênticas, escores **0 e 0**, o sistema declara **A1 vencedora com 100% de concordância** entre os cinco métodos de síntese. **A ordem de entrada resolve o que o modelo não resolveu.** ⚠ **É pior que o `robustnessLevel` já registrado:** não é só confundir concordância com robustez, é **declarar consenso onde não existe diferença**. Cinco métodos concordando sobre dois zeros não é convergência, é ausência de informação. **Toca exatamente o construto que a seção 1.6 identifica como linha de contribuição**, e é **independente da remoção do IPC**, como também são A.25, A.27 e A.28 (correção: não é o único). **Sai à frente de A.16 e A.18**, porque produz resultado errado hoje |
| A.24 | **Criar o workflow do GitHub Actions.** Sem ele, **nenhum teste protege a entrega**, e o censo é garantia declarada sem mecanismo: depende de alguém rodar `npm test` antes do push. `.github/` existe e contém só `copilot-instructions.md`. **É pequeno** e resolve o problema de fundo que o relatório aponta. Mínimo: `npx tsc --noEmit`, `npm test` e `npm run build` em cada push |
| A.25 | **⚠ F05, O ACHADO MAIS GRAVE: a faixa de CR publicada não é a dos respondentes.** O manuscrito afirma CR individual entre **1,1% e 9,6%** com 100% de conformidade. **Recalculado dos 864 julgamentos brutos: 11,3893% a 109,2740%, e nenhum dos doze abaixo de 0,10.** Reproduzido neste ambiente com os mesmos números da auditoria. **A causa:** a faixa publicada vem do `avgCR` em cache, que é a **média sobre 26 matrizes incluindo 20 de ordem 2 com CR zero**; o governante é o máximo entre as seis de ordem ≥ 3. Um respondente tem **109,27%**, acima do limiar de 0,20 que Saaty e Ergu identificam como julgamento quase aleatório. ⚠ **Não é defeito de código: é o número que sustenta a seção de consistência.** A agregação por média geométrica continua consistente, e o CR agregado de 1,06% é real; **o que não se sustenta é a afirmação sobre os indivíduos**. ⚠ **NÃO excluir respondentes para obter agregado mais consistente.** Critérios de participação exigem justificativa metodológica. **O que a tarefa entrega é a distinção das três medidas e a justificativa de qual reportar**, com Aull-Hyde et al. (2006) sobre agregação de matrizes individualmente inconsistentes. Evidência em `docs/imprecisoes-parecer-ia.md`, F05 |
| A.26 | **⚠ F08: a ingestão põe recomendação editorial em `verbatim_quote`.** `scripts/ingest-rag.ts` linha **263**, em `buildRecommendationChunks`, grava a recomendação nesse campo com `page`, `locator_type` e `locator_id` **nulos**. E o `route.ts` linha 152 a formata como `*Verbatim:* "..."` ao modelo. O comentário da linha 139 declara que a decisão A5 era tornar o bloco **"indistinguível do RAG keyword"**. ⚠ **CORREÇÃO a um registro anterior:** na tabela das seis ocorrências feita para A.17, classifiquei a linha 263 como "já correta, é texto direto". **Estava errado:** "texto direto" descreve a mecânica, não a adequação. ⚠ **Bloqueia A.18:** reingerir sem corrigir o ingestor perpetua o defeito, porque ele está no código e não nos dados |
| A.27 | **⚠ F06: o parecer não é impedido de apresentar números inválidos.** O validador aceita como `isValid=true` texto com escores fictícios escritos com **vírgula decimal**; com ponto, identifica números desconhecidos **só como avisos**. E quando retorna inválido por referência proibida, **a rota não bloqueia a apresentação**: a interface usa o sucesso e o texto. Fontes: `ai-reviewer/route.ts` linhas 1491 e 1657. **Aceite:** falha de verificação bloqueia ou põe em quarentena visível |
| A.28 | **⚠ F07: cenários sobrescrevem o resultado-base.** O cálculo completo e um cenário com R01 excluído **gravam no mesmo documento** `calculations/{projectId}`, e a constante de versão do motor não é persistida como identidade da execução. Fonte: `calculate/route.ts` linha 1242. **E a validação externa depende de um backend Python que não está neste repositório**, com um fallback legado que reconstrói a matriz a partir dos pesos — o que **não equivale a validar os julgamentos originais**. **Aceite:** simulação não altera o resultado-base; cada afirmação remete à execução usada |
| A.29 | **Remover o `lib/knowledge.ts` legado.** Era escopo de A.6 antes dela encolher para só o `knowledge-ipc.ts`, e **ficou sem responsável**. ⚠ **Contém o `interpretSensitivity`**, que é uma das três implementações restantes do construto categórico de sensibilidade, e por isso **A.2 depende desta tarefa**, não mais de A.6. Medir o escopo antes: o arquivo tem outras funções, e `git grep` sobre `lib/knowledge` dá os consumidores |

**Tabela de aceite de A.21**, e ela substitui qualquer critério de contagem de
testes:

| Caso | Resultado esperado |
|---|---|
| Resposta completa válida | calculada, preservando a referência |
| Uma comparação faltante, mesmo com `completedAt` | **rejeitada** para finalização e cálculo oficial |
| Duplicata substituindo um par | **rejeitada** |
| Respostas parciais complementares entre participantes | **rejeitadas individualmente** |
| Rascunho incompleto | salvo e retomado, **sem virar resposta finalizada** |
| Consumidores migrados | compilação aprovada e **nenhuma chamada ao IPC** |

⚠ **O total de testes se registra DEPOIS da execução.** Nenhuma aritmética de
exclusão serve de critério: ela conta o que sai e ignora os testes novos que a
tabela acima exige. **Redução da suíte não é prova de conclusão.**

**Sobre os testes do `graph-utils`:** `checkConnectivity`, `getCompletenessMetrics`
e `buildGraphFromJudgments` **têm consumidor em produção**: o primeiro na rota
`calculate`, linha 344. **Exclusivos de teste são apenas `findBridgeEdges`,
`getMinimumSpanningChain` e `validateSkip`.**

**Resíduo de A.21 reescrita, mantido só como registro do que se esperava:** a
aritmética de exclusão de testes — a que chegava a **45** — e a afirmação de que os
sete testes do `graph-utils` cobriam funções sem uso. **As duas foram superadas** —
ver a tabela de aceite de A.21 e a nota sobre `checkConnectivity`. **Por que a
aritmética não vale: ver a entrada do levantamento de números em 0.4.**

O que permanece válido: o `characterization.test.ts` tem **dez blocos `test(` e
reporta 30**, porque parte é gerada em laço; **contar blocos no fonte subestima, o
número tem de vir do jest**. E a falha do censo que A.21 fecha é **"o LLSM
permanece confinado ao módulo de matrizes incompletas"**, a única das doze que
falha hoje. ⚠ **Será a primeira vez que o censo fica limpo.**

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

**O commit (4) depende de A.29** porque `lib/knowledge.ts` é o legado que ela
remove (era atribuído a A.6, que encolheu para só o `knowledge-ipc.ts`), e o `page.tsx` importa oito símbolos dele, não só o `interpretSensitivity`.
**A remoção do legado e a adaptação de seus consumidores devem ser coordenadas com A.29.**

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


**Resíduos em `calculations` e em `responses`, com tratamentos distintos.**
Registrado em 11/09/2026:

| # | Campo | Deixou de ser gravado em |
|---|---|---|
| a | `responses.{doc}.responses.avgCR` | ainda gravado; ver acima |
| b | `sensitivityAnalysis.classification` e `classificationLabel` | `5837d0d` |
| c | `ipcMetadata` | ✅ **`0ac4e95`**, com A.21. A rota não grava mais o campo; a próxima recomputação escreve o documento sem ele, sem script |

**Dois dos três saem por consequência; um não.**

⚠ **(b) e (c) estão em `calculations/{projectId}`.** Removido o código que os
gravava, a próxima recomputação escreve o documento sem eles. **Não exigem
script.**

⚠ **(a) está em `responses/{doc}` — outra coleção.** Recomputar `calculations` não
toca `responses.{doc}.responses.avgCR`: **o cache individual sobrevive à
recomputação**, e é por isso que B.3 existe como tarefa própria, com remoção
explícita do subobjeto.

**Decisão vigente: preservar os três em produção por ora.** O `calculations` é o
dado que reproduz os 24 valores publicados e corresponde ao
`docs/calculations-13jul2026.json` versionado; o cache em `responses` sai por B.3,
cuja predição está registrada como `{valid: 0, warning: 1, critical: 11, total:
12}`.

### B.3 Remover o subobjeto `responses` das respostas

Depois da etapa 4. Remover a saída antecipada faz o código parar de ler o cache,
mas o dado errado continua no banco, e o `contratos-de-dados.md` registra que
aquele subobjeto é cache congelado que ninguém invalida. **Um campo morto que já
enganou o sistema uma vez é candidato a enganá-lo de novo, por outro caminho.**

⚠ **Consequência a antecipar, verificada em 10/09/2026.** O caminho de fallback,
`computeCRsFromJudgments`, chama `calculateAllWeights` e devolve `avgCR:
result.avgCR`, que no `ahp-ipc.ts` é o **máximo** das seis matrizes não triviais,
não a média. Portanto, ao remover a saída antecipada, o `classifyRespondent`
passa a receber o **CR governante**.

⚠ **CORREÇÃO da previsão, 11/09/2026.** A previsão registrada era "os doze migram
para CRÍTICO". **Medido: serão 1 REVISAR e 11 CRÍTICO.** O respondente R01 tem
governante de **11,39%**, que é o menor dos doze e cai na faixa de REVISAR, não de
CRÍTICO.

O erro foi usar o menor governante para prever o destino de todos: ele determina
onde o **melhor** caso cai, não onde caem os outros onze. **É a mesma classe de
erro registrada em 0.4 sobre critério de contagem: mirar num alvo e afirmar sobre
um escopo mais largo.**

**A predição de B.3 passa a ser `byStatus = {valid: 0, warning: 1, critical: 11,
total: 12}`.**

⚠ **Esta previsão é DIAGNÓSTICO do classificador antigo, não critério de aceite do
resultado final.** Ela mede o que o `classifyRespondent` atual produziria ao
receber o CR governante em vez do cache. **A.12 remove essa distribuição do
payload**, então o estado final não tem `byStatus` a conferir.

**O que a previsão serve para testar:** que a mudança de fonte do CR — de cache
para governante — tem o efeito medido. É evidência de que o cache mascarava a
inconsistência individual, e sustenta o F05.

✅ **Limiares confirmados no código em 11/09/2026:** 0,05, 0,10, 0,15 e 0,20, com
`REVISAR` na faixa de 10 a 15%. R01, com governante de **11,39%**, cai em
`REVISAR`; os outros onze têm governante **acima de 20%** e caem em `CRÍTICO`.

⚠ **E existe um quinto status:** `DESCONHECIDO`, devolvido quando `avgCR === 0`.
Não aparece nesta predição porque nenhum dos doze tem governante zero, mas está no
caminho. Ver A.12.

Isso é o comportamento correto. ⚠ **A etapa 4 verificará duas coisas:** que os CRs
recalculados passam a ser usados, e que **a conclusão de conformidade derivada do
cache é retirada**.

⚠ **As categorias antigas ficam como diagnóstico histórico**, não como veredito
novo: A.12 remove a distribuição do payload, então não há veredito a comparar. É o resultado mais forte que a série pode produzir, e
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
