# Validação externa, Fase 2: especificação

**Status:** aprovada pelo autor. O registro da aprovação está na célula de A.28 de `docs/objetivo-estados-caminho.md`.

Redigida pelo analista a partir da leitura de `187d887fc0fd77ad13a6276896ef9e52c87f3146`, sob direção do líder técnico, aprovado pelo autor. ⚠ **Este documento especifica comportamento; ele não é registro de implementação.** A implementação exige pedido próprio, posterior ao registro da predição. F07 corre em frente separada, com especificação própria.

**Objetivo:** apresentação fiel de uma **comparação delimitada**, sem certificação geral da implementação ou do paper.

**Direção técnica definida:** M1, M5, as seis identidades, reconstrução somente na ausência total, e preservação dos dados existentes.

**Base de leitura:** `187d887fc0fd77ad13a6276896ef9e52c87f3146`. Todo fato de comportamento atual foi verificado por leitura nos arquivos desse commit, com localizador. Nenhuma execução da aplicação. Localizadores sem prefixo de arquivo são de `components/ExternalValidation.tsx`.

---

## 1. Objeto

**Entra:** a apresentação da validação externa na interface, e a **verificação do contrato recebido**, tanto do documento de cálculo lido quanto da resposta do serviço.

**Não entra:** o cálculo determinístico, o serviço externo, qualquer documento `calculations`, o texto da Tabela 7, e F07.

**O que justifica a mudança** (formulação do líder técnico): a interface pode apresentar aprovação **sem demonstrar completude**, **aceita valores não booleanos** como veredito, e mantém uma **declaração científica de aprovação** mesmo no ramo de ressalvas.

## 2. Decisões fechadas do líder técnico

1. **Selo de aprovação** é o conjunto **rótulo, ícone e cor do bloco de veredito** (`:294-310`).
2. **M5 remove apenas a "Citação para dissertação" de `ExternalValidation`** (`:388-399`). **`NegativePriorityAlert` fica fora.** Consequência registrada: o texto pronto **não sai por inteiro** do sistema, e o registro desta frente precisa dizer isso.
3. **Reconstrução automática somente na ausência total** de matrizes persistidas. Matrizes presentes e inválidas produzem **diagnóstico de invalidade**, sem substituição silenciosa.
4. **O `your_cr` enviado não muda**, nem na ausência nem na invalidade. A correção é de registro e de apresentação.

## 3. Precisões adotadas

São do líder técnico; os localizadores são meus. **As duas primeiras tratam de lados diferentes do contrato e não compartilham localizador.**

**1a. O produtor.** Ele persiste as seis matrizes serializadas como JSON (`app/api/calculate/route.ts:1124-1130`), construídas sobre conjuntos de itens declarados, de ordem 4 e 5 (`:944`, `:955`, `:970-981`). ⚠ **Se cada matriz persistida é quadrada, finita, positiva e recíproca não foi examinado nesta frente:** isso depende de `lib/aggregation.ts:51`, que **não foi lido aqui**. Portanto **completude no produtor não equivale a validade integral**, e a verificação tem de ocorrer no consumidor.

**1b. O consumidor.** Suas guardas atuais só contam linhas: `:93` e `:104` exigem `length === 4`, `:126` exige `length >= 2`. Não verificam formato quadrado, finitude, positividade, reciprocidade, nem correspondência entre matriz, `items` e `your_weights`, montados por caminhos independentes (`:128`, `:132`).

**2. Os limites de 6 e 5 matrizes dependem da estrutura atual do produtor.** O componente percorre as chaves presentes (`:124`, `:169`) e conta o que sobrou (`:225`, exibido em `:266`). O caminho real admite até 6; o reconstruído não tem ramo de magnitude e admite até 5 (`:152-180`). **Não são limites impostos pelo consumidor a qualquer documento recebido.**

**3. A fórmula de razões produz consistência exata nas condições declaradas.** `:145-149` monta `weights[i]/weights[j]`. Para pesos positivos e finitos, em aritmética exata, a matriz é consistente por construção. A afirmação de CR zero **também depende da definição aplicável ao tamanho da matriz, especialmente para n=2**, e `:278` hoje promete "CR sempre = 0" sem condição. **Não pode virar promessa geral da interface.**

**4. Conclusão delimitada da busca por tolerância.** Pelos padrões `toler`, `epsilon`, `limiar` e `threshold`, em `ExternalValidation.tsx` e `app/api/validate-external/route.ts`, **não foi encontrada tolerância declarada do nosso lado**; padrão literal pode não alcançar redação equivalente, e a busca não cobriu o microserviço. Os quatro limiares de `:349-350` e `:359-360` são **critérios visuais**, e **não tolerâncias verificadas do serviço**.

## 4. D1: conjunto esperado, matriz utilizável e as três propriedades

### 4.1 Conjunto esperado

As **seis matrizes agregadas persistidas da estrutura atual**, nomeadas por **identidade e ordem esperada**:

| Identidade | Chave no documento | Ordem esperada | Origem da expectativa |
|---|---|---|---|
| BOCR Méritos | `aggregatedMatrices.bocr` | 4 | `calculate/route.ts:66`, `:944`, `:948` |
| Magnitude | `aggregatedMatrices.magnitude` | 4 | `calculate/route.ts:66`, `:955`, `:959` |
| Subcritérios B, O, C, R | `aggregatedMatrices.subcriteria.{B,O,C,R}` | 5 cada | `calculate/route.ts:66-67`, `:970-981` |

O alcance é **declarado explicitamente** e **não inclui as vinte matrizes de alternativas**, que são calculadas e não persistidas.

**Fonte única.** Hoje a expectativa existe implícita em dois lugares que não se falam: as constantes do produtor e os literais do consumidor (`:92-137`). Exige-se **uma só definição**, consultável pelo consumidor, que **declare ser reflexo da estrutura atual do produtor** e não um limite imposto a qualquer documento recebido.

### 4.2 Matriz utilizável

**Presença da chave não basta.** Uma matriz entra na comparação quando **todas** valem:

1. decodifica em arranjo de arranjos de números (hoje só isso é tentado, `:85-89`);
2. é **quadrada**: número de linhas igual ao comprimento de cada linha;
3. a ordem **corresponde à esperada** para aquela identidade;
4. todas as entradas são **finitas e positivas**;
5. `items` tem comprimento igual à ordem;
6. `your_weights` tem comprimento igual à ordem e **todos os pesos são finitos e positivos**.

Qualquer falha é **descarte nomeado**, com a razão: chave ausente, JSON inválido, não quadrada, ordem inesperada, valor não finito, valor não positivo, comprimento de `items` divergente, peso ausente, não finito ou não positivo.

⚠ **Consequência a assumir:** matrizes que hoje são enviadas e comparadas podem passar a ser descartadas, e uma aprovação que hoje apareceria passaria a aparecer como comparação incompleta. **Nenhum dado armazenado é alterado por isso.**

⚠ **Reciprocidade e diagonal unitária ficam fora do critério, por escolha de escopo desta fase.** Uma margem para verificá-las seria **verificação local nossa, distinta da tolerância do serviço**, e não há impedimento técnico para adotá-la depois. Nesta fase **basta declarar o limite**: não são verificadas.

### 4.3 Os três conjuntos

| Conjunto | De onde sai | Regra |
|---|---|---|
| Esperado | a definição única de 4.1 | por identidade e ordem, não por contagem |
| Enviado | as chaves de `matrices` na requisição (`:208`), uma requisição por validação | só matrizes utilizáveis por 4.2 |
| Devolvido | as chaves de `result.results` (`:336`) | correspondência um a um com o enviado |

⚠ **A contagem informada pelo serviço não demonstra completude.** `result.summary.total_matrices` (`:304`) é do serviço, não evidência do conjunto efetivamente comparado.

### 4.4 Três propriedades distintas

Sempre nomeadas separadamente, nenhuma substituindo as outras:

- **Cobertura:** quais das seis identidades foram enviadas e devolvidas. Propriedade nossa, verificável aqui.
- **Resultado informado e estruturalmente válido:** por entrada devolvida, se o serviço **informou** valores presentes, finitos e correspondentes para **pesos** e para **CR**, utilizáveis como evidência, conforme 6.2. Propriedade nossa, verificável aqui.
- **Veredito:** do serviço, **atribuído a ele**. Não é verificável aqui.

⚠ **Campos presentes, finitos e correspondentes demonstram retorno estruturalmente válido e resultado informado pelo serviço. Não demonstram que o serviço executou a comparação.** Por isso esta especificação **não usa a expressão "comparação confirmada"**. A aprovação permanece atribuída ao serviço, com o limite da seção 14.

**Cobertura completa não valida o resultado informado, e nenhuma das duas aprova.**

## 5. Origem das matrizes: quatro condições, não um booleano

⚠ **`hasRealMatrices` não serve como definição.** Ele é a conjunção de dois campos (`:75-76`), de modo que a ausência de **um** deles joga todo o caminho na reconstrução (`:82`, `:145-182`) e **descarta matrizes persistidas utilizáveis que existiam**. A condição passa a ser avaliada **por identidade esperada**:

| Condição | Definição | Tratamento |
|---|---|---|
| **Persistida completa** | as seis utilizáveis por 4.2 | comparação das seis, origem persistida |
| **Persistida parcial** | **ao menos uma** utilizável, nem todas | comparação das utilizáveis, **nomeando as demais e a razão de cada uma**. **Sem reconstrução.** Não cai no diagnóstico de invalidade |
| **Presente e inválida** | ao menos uma chave de matriz persistida presente, **nenhuma** utilizável | **diagnóstico de invalidade** (P1), nomeando o motivo de cada descarte. ⚠ **Sem reconstrução e sem substituição silenciosa** |
| **Ausência total** | **nenhuma** chave de matriz persistida presente | comparação dos julgamentos indisponível. **Única condição em que cabe reconstrução automática**, e só se os pesos permitirem |

**Origens não se misturam numa comparação.** Reconstrução entra **somente na ausência total**, por decisão do líder técnico. Havendo chave presente, ainda que inválida, não há substituição: há diagnóstico.

**Reconstrução.** ⚠ **Ela não satisfaz o escopo de seis matrizes persistidas definido nesta especificação**, e não o satisfaz por construção: não há ramo de magnitude (`:152-180`) e as matrizes são razões de pesos (`:145-149`). Resultados utilizáveis são **preservados como comparação de matrizes reconstruídas**, identificados assim, **sem aprovação dos julgamentos originais** e sem afirmação de valor de CR.

## 6. Validação do retorno

A rota é repasse puro (`app/api/validate-external/route.ts:51-52`) e `:214` guarda o que vier. `results` é declarado como `Record<string, any>` (`:32`), ou seja, **o retorno não tem forma tipada**, e o que se sabe dele é o que a interface lê. Passa a haver verificação **antes de exibir**.

### 6.1 Envelope

`all_valid` booleano explícito; `summary` presente; `summary.total_matrices` e `summary.valid_matrices` inteiros não negativos; `summary.max_weight_diff` e `summary.max_cr_diff` números finitos; `summary.issues` arranjo de textos; `results` objeto. **Tipo incorreto e número não finito equivalem a campo não utilizável.**

⚠ **Envelope inválido entra na precedência** (P5): as **entradas aproveitáveis permanecem visíveis**, e o envelope inválido **impede o veredito global e o selo**. O `valid` de cada entrada continua legível por matriz quando for booleano explícito.

### 6.2 Contrato da entrada por matriz

Para cada chave devolvida:

| Campo | Exigência |
|---|---|
| `valid` | **booleano explícito**. Ausente ou de outro tipo: veredito **daquela** matriz não confirmado |
| `n` | inteiro **igual à ordem da matriz enviada** sob aquela chave |
| `sdk_cr` | número finito |
| `cr_diff` | número finito, ou ausente |
| `max_weight_diff` | número finito, ou ausente |
| `your_cr` | número finito e não negativo, ou ausente, com a procedência da seção 10 |
| vetores de peso, se o retorno os trouxer | finitos, positivos, de comprimento igual a `n`. ⚠ **Que o retorno traga vetores de peso não foi verificado:** a interface não os lê |

**Três estados da entrada:**

- **Completa:** `n` corresponde, `valid` é booleano, `sdk_cr`, `cr_diff` e `max_weight_diff` finitos. O resultado está **informado e estruturalmente válido** para pesos e para CR.
- **Parcialmente utilizável:** `n` corresponde e **ao menos um** campo quantitativo é finito, mas falta algum, ou `valid` não é booleano. Os campos válidos são exibidos; os demais aparecem como **"não avaliado"**; e a dimensão que falta **não tem resultado utilizável**.
- **Sem evidência alguma:** `n` ausente ou **divergente** da ordem enviada, ou **nenhum** campo quantitativo finito. ⚠ `n` divergente é **inconsistência de correspondência**: o serviço relatou sobre objeto de outra ordem, e a entrada não serve como evidência.

### 6.3 Chaves

Chave devolvida que não foi enviada é **nomeada como inesperada** e não conta como cobertura. Chave enviada que não voltou é **nomeada como ausente**.

### 6.4 Resumo versus resultados

**Comparações exatas, que impedem o veredito global e o selo:**

1. conjunto de chaves devolvidas contra o enviado;
2. `total_matrices` contra o número de entradas;
3. `valid_matrices` contra a contagem de `valid === true`;
4. `all_valid === true` com alguma entrada cujo `valid` não é `true`;
5. **a contradição inversa:** `all_valid === false` com **todas** as entradas válidas e `valid === true`.

⚠ **A contradição conserva os dois valores e a fonte de cada um, sem escolher em silêncio.**

**Máximos, sem comparação numérica:** `summary.max_weight_diff` e `summary.max_cr_diff` são **exibidos com a fonte declarada**, ao lado do máximo das entradas, também com a sua fonte. ⚠ **Não se exige igualdade numérica exata**, porque arredondamento e agregação do serviço não são conhecidos. **Uma regra de igualdade numérica exigiria critério próprio, que esta especificação não define**, e a diferença entre os dois máximos, por si, **não impede o veredito e não é apresentada como divergência**.

### 6.5 Evidência utilizável quando parte do retorno é inválida

**A entrada por matriz é a unidade de evidência.** Campos inválidos aparecem como **"não avaliado"**, nunca como `NaN` nem como zero (hoje `:305`, `:344` e `:394` imprimem `NaN%`). O **resumo nunca substitui** entradas ausentes. **Veredito malformado não produz aprovação nem reprovação.** Sem nenhuma entrada ao menos parcialmente utilizável, não há evidência, e o estado é resposta inválida.

## 7. Regra de precedência

O estado principal tem **três componentes sempre nomeados**: cobertura, resultado informado e veredito. A **manchete** do bloco é a **primeira condição aplicável** desta ordem, e os detalhes das demais aparecem dentro do bloco:

| # | Condição | Manchete | Veredito | Selo |
|---|---|---|---|---|
| P1 | ao menos uma chave de matriz persistida presente e **nenhuma** utilizável por 4.2 | **Matrizes persistidas inválidas**, nomeando o motivo de cada descarte | não exibido | não |
| P2 | nada enviado por outro motivo: sem cálculo (`:73`); ausência total sem pesos que permitam reconstrução; ou, na reconstrução, nenhuma matriz utilizável | **Comparação não executada** | não exibido | não |
| P3 | nenhuma resposta obtida: exceção, ou status não-OK (`:211`) | **Falha ao obter a comparação**, com a origem quando disponível (`validate-external/route.ts:44-48`) | não obtido | não |
| P4 | resposta sem nenhuma entrada ao menos parcialmente utilizável | **Resposta inválida** | não confirmado | não |
| P5 | **envelope inválido** por 6.1; `all_valid` não booleano; qualquer contradição exata de 6.4; ou alcance não identificável | **Veredito global não confirmado**, com as **entradas aproveitáveis visíveis** | não confirmado | não |
| P6 | origem reconstruída, só na ausência total | **Comparação de matrizes reconstruídas** | do serviço, atribuído, restrito às reconstruídas, **nunca sobre os julgamentos** | não |
| P7 | cobertura incompleta, **ou** alguma entrada sem resultado utilizável para pesos ou para CR, com origem persistida | **Comparação incompleta**, nomeando o que falta: identidade ausente, entrada não devolvida, ou dimensão sem resultado utilizável | do serviço, atribuído, restrito ao que foi devolvido e é utilizável | não |
| P8 | `all_valid === true`, envelope válido, **cobertura das seis identidades** e **resultado informado e estruturalmente válido para pesos e para CR** em todas as entradas, origem persistida | **Aprovação relatada pelo serviço** | aprovado | **sim, única condição** |
| P9 | `all_valid === false`, com as mesmas condições de envelope, cobertura e resultado informado de P8 | **Reprovação relatada pelo serviço** | reprovado | não |

⚠ **P1 precede P2** para que a invalidade das matrizes persistidas não desapareça sob uma mensagem genérica de comparação não executada. **Persistida parcial não cai em P1:** cai em P7.

⚠ **Reprovação só em P9.** Um `false` recebido em P4 a P7 **não é reprovação**: é veredito restrito, não confirmado, ou sobre outro objeto.

⚠ **P8 exige envelope válido, cobertura das seis identidades e resultado utilizável nas duas dimensões.** Cobertura completa com CR ausente ou inválido em alguma entrada cai em **P7**.

## 8. Requisitos por medida

**M1, reprovação.** O estado de reprovação existe (P9), com rótulo próprio, distinto de ressalvas, e **sem selo**. O veredito é **atribuído ao serviço** no próprio rótulo. O selo, conforme a decisão fechada, é rótulo, ícone e cor do bloco `:294-310`, e aparece **somente em P8**.

**M2, preservação.** Permanecem visíveis as **evidências disponíveis e validadas**, em todo estado que as tenha, inclusive P5, P6, P7 e P9. **Falha de transporte pode não produzir evidência alguma** (P3), e **retorno inválido não é exibido como evidência válida** (P4, e campos inválidos nos demais estados). **Tolerâncias: apenas as efetivamente disponíveis.** Enquanto a tolerância aplicada pelo serviço não for conhecida, a interface **declara que ela não é informada** e **não afirma** estar dentro de tolerância. Os quatro limiares de cor são **critério visual**, nunca tolerância nem veredito.

**M3, identificação do objeto.** A origem das matrizes, conforme a seção 5, aparece **em todos os blocos** que descrevem o resultado, e não só em quatro pontos como hoje: `:275`, `:312` e `:393`, por `matrixSource`, e `:424-426`, por `previewSource`.

**M4, sem bloqueio por arrasto.** Ranking, exportação e decisão do gestor **não são bloqueados** por nenhum estado desta frente. Uma divergência exige análise e, sozinha, não determina qual implementação está correta nem invalida a decisão gerencial. ⚠ Bloqueio futuro exige justificativa própria, fora desta especificação.

**M5, remoção do texto pronto.** O bloco `:388-399` sai inteiro, com a frase "atestando a precisão matemática da implementação" (`:396`).
**Contagem das ofertas de texto pronto:** o diagnóstico tinha **três lugares**. O bloco da validação **permanece** e sai por M5; **`NegativePriorityAlert.tsx:149-162` permanece e fica fora**, por decisão do líder técnico; os **dois arquivos removidos em 27/09 pertenciam à terceira oferta** (`41d7e56` removeu `bias-detection.ts` e `ded018a` removeu `BiasAnalysisCard.tsx`, remoções **medidas pelo auditor** com `git show --diff-filter=D`, confirmando a separação relatada pelo autor).

## 9. O aviso que sai desta frente

Os textos que **induzem recalcular o projeto** saem, porque prescrevem como remédio exatamente a ação que a seção 4 proíbe usar nesta investigação, a sobrescrita de `calculations`:

- `:279-280`, "recalcule o projeto (as matrizes originais serão salvas automaticamente)";
- `:426`, "recalcule para validação completa de CR";
- `:202`, o `console.warn` com "Recalcule o projeto para validação completa".

Saem junto, pelas precisões 3 e 2: `:278`, "CR sempre = 0" sem condição, e `:425`, "validação completa" afirmada pela origem antes de qualquer comparação.

O texto substituto **descreve a origem das matrizes e o que não foi comparado**, e **não prescreve ação** sobre os dados.

## 10. Procedência do CR do nosso lado

Hoje `calculation.*Consistency?.cr || 0` coage para zero em cinco pontos (`:98`, `:114`, `:133`, `:159`, `:176`). ⚠ **A coerção torna indistinguíveis três situações diferentes:** CR medido igual a zero, CR ausente e CR igual a `NaN`. Um CR negativo, por ser verdadeiro, **passa adiante sem coerção**. ⚠ **O que a coluna CR (Sistema) exibe em `:341` é o `your_cr` devolvido pelo serviço** (`:328`, `:341`), e não o valor local: que os dois sejam iguais é **não verificado**.

**Três estados, registrados por matriz, do nosso lado, antes da substituição:**

| Estado | Definição | Apresentação | Efeito |
|---|---|---|---|
| **Presente e válido** | número **finito e não negativo**, inclusive zero | valor exibido na coluna CR (Sistema) | evidência utilizável |
| **Ausente** | campo inexistente, `undefined` ou `null` | **"não avaliado"**, e o `cr_diff` da entrada identificado como **diferença calculada contra valor substituto** | **não sustenta aprovação** da comparação de CR; leva a **P7** |
| **Presente e inválido** | **qualquer outro valor**: número negativo, `NaN`, infinito, ou tipo incorreto | **invalidade registrada e exibida como tal**; **não apresentado como evidência utilizável** | **não sustenta aprovação** da comparação de CR; leva a **P7** |

⚠ **As três categorias são mutuamente exclusivas e exaustivas.** Um CR negativo pertence **somente** a "presente e inválido". A classificação é **local**: a expressão hoje usada para enviar `your_cr` permanece preservada, conforme o escopo.

⚠ **Zero finito continua distinto de ausência**, e o registro local é o que preserva essa distinção, já que hoje os dois chegam ao serviço como zero.

⚠ **O valor enviado permanece inalterado nesta frente**, nos três estados, por decisão do líder técnico. O registro e a apresentação são do nosso lado; o serviço continua recebendo o que recebe hoje.

## 11. Critérios de aceite

O critério da investigação está em `docs/validacao-externa-especificacao.md:99-102`.

1. **As condições relevantes são distinguíveis por rótulo, descrição e detalhes**, P1 a P9. **Não se exige cor exclusiva por combinação**, e o **selo aparece em uma única condição**, P8.
2. **Nenhum texto declara aprovação do conjunto completo nem dos julgamentos originais** sem envelope válido, cobertura das seis identidades, resultado utilizável nas duas dimensões e origem persistida. ⚠ **Texto que relata aprovação restrita é permitido** em P6 e P7, desde que atribuído ao serviço e qualificado pelo subconjunto ou pela origem. Com M5, o bloco que hoje viola o primeiro ponto deixa de existir.
3. **Nenhum texto afirma que o serviço executou a comparação** a partir da validade estrutural do retorno. O que a interface afirma é **resultado informado pelo serviço**, atribuído a ele.
4. **A descrição do objeto validado corresponde ao enviado**, em todo estado, nomeando matriz reconstruída como tal, sem afirmar valor de CR e sem afirmar completude pela origem.
5. **Os três conjuntos são comparados**, e a divergência é nomeada com a razão quando disponível. A contagem do serviço não é usada como evidência de completude.
6. **Só booleano explícito é interpretado como veredito**, por matriz e no agregado. As cinco comparações exatas de 6.4 conservam os dois valores com suas fontes e impedem o veredito global e o selo. **Os máximos são exibidos com suas fontes e não são comparados numericamente.**
7. **CR ausente aparece como "não avaliado"** e **CR inválido aparece como inválido**; nenhum dos dois é evidência utilizável, o `cr_diff` correspondente é identificado como diferença contra valor substituto quando for o caso, e **zero finito não é confundido com ausência**.
8. **Envelope inválido mantém visíveis as entradas aproveitáveis** e impede o veredito global e o selo.
9. **A verificação da forma impede exceção na renderização** para retorno sem `summary`, sem `results` ou sem `summary.issues` (hoje `:304`, `:336` e `:379` lançam), e campo ausente ou não finito aparece como "não avaliado", nunca como `NaN` nem como zero.
10. **Matrizes persistidas presentes e inválidas produzem o diagnóstico de invalidade de P1**, antes de qualquer mensagem genérica, e a reconstrução ocorre **somente na ausência total**.
11. **Os limiares de cor seguem identificados como critério visual**, e nenhum texto os apresenta como tolerância ou veredito.
12. **Ranking, exportação e decisão não são bloqueados** por nenhum estado desta frente.
13. **Nenhum dos cinco textos da seção 9 aparece** na interface ou no console.
14. **Nenhum documento `calculations` é lido para escrita, recomputado, migrado ou preenchido**; o cálculo determinístico e o serviço externo não são alterados; o texto da Tabela 7 não é alterado.

## 12. Fora do escopo

- **F07**, a sobrescrita de `calculations`: frente separada, com especificação própria.
- **O microserviço:** não é alterado e não é examinado.
- **`lib/aggregation.ts`:** não é alterado e não foi lido nesta frente.
- **O cálculo determinístico** e **o texto da Tabela 7.**
- **`NegativePriorityAlert`**, por decisão fechada.
- **Qualquer bloqueio** de ranking, exportação ou decisão.
- **O `your_cr` enviado**, por decisão fechada.
- **Reciprocidade e diagonal unitária**, por escolha de escopo desta fase.
- **Regra de igualdade numérica entre os máximos**, não definida nesta especificação.

## 13. Restrições da seção 4, integrais

Valem nesta frente, sem exceção: não alterar o cálculo determinístico; não alterar o serviço externo; **não recomputar, não migrar e não preencher retroativamente qualquer documento `calculations`**; não alterar o texto da Tabela 7 no manuscrito. ⚠ A proibição alcança também **prescrever** o recálculo ao gestor como remédio, conforme a seção 9.

## 14. Limites que o artefato declara

- **Validade estrutural do retorno não é execução da comparação.** Campos presentes, finitos e correspondentes demonstram **retorno estruturalmente válido e resultado informado pelo serviço**, e nada além disso. **Que o serviço executou a comparação não é verificável aqui.**
- **Sem examinar o microserviço, a leitura atual não confirma o que ele efetivamente compara.** O significado de `valid`, `all_valid`, `sdk_cr`, `cr_diff`, `max_weight_diff` e `issues` no serviço não é verificável aqui; o formato do retorno é **registrado, não verificado**, e `results` é `any` (`:32`); `result.library` (`:402`) é informado pelo próprio serviço.
- **As propriedades das matrizes persistidas não foram examinadas na origem:** `lib/aggregation.ts:51` não foi lido nesta frente, e por isso a verificação ocorre no consumidor.
- **A mudança na interface não valida retroativamente os resultados do paper.** Ela corrige o que o sistema afirma de agora em diante.
- **No caminho reconstruído a comparação de pesos é autorreferente por construção:** a matriz vem de `weights[i]/weights[j]` (`:145-149`) e os pesos enviados são os mesmos que a geraram (`:158`, `:175`). Concordância é esperada nas condições da precisão 3 e **não é evidência sobre os julgamentos originais**.
- **O Achado 1** (`2,776e-17`) permanece **medição anterior relatada**, sem executor, instrumento nem data disponíveis. A leitura da fórmula não confirma o comportamento numérico da implementação.
- **As guardas `every(v > 0)`** (`:154`, `:170`) barram zero, negativos e `NaN`, e **não barram `Infinity`**, de modo que a matriz reconstruída pode conter `NaN` por divisão de infinitos. O critério 4 de 4.2 passa a barrar isso **no envio**, não no dado armazenado.
- **A ordem 5 dos subcritérios vem das constantes do produtor** (`calculate/route.ts:67`), e a guarda atual do consumidor aceita `length >= 2` (`:126`, `:170`), de modo que o caso n=2 da precisão 3 **é alcançável também no caminho persistido**.
- **`citation` vem declarado no retorno (`:42`) e nunca é lido.** O texto que o gestor vê hoje é autoria da interface, não do validador.
- **O texto pronto não sai por inteiro do sistema:** `NegativePriorityAlert.tsx:149-162` permanece, por decisão fechada.
- **Igualdade numérica entre os máximos do resumo e das entradas não é avaliada**, por falta de regra própria.
- **O CR enviado ao serviço continua coagido** nos cinco pontos da seção 10; a distinção entre zero medido, ausência e invalidade existe **apenas do nosso lado**.
