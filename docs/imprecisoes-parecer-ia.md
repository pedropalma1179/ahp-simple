# Imprecisões do Parecer IA: registro experimental

> **Este documento é insumo do artigo, não tarefa de engenharia.** Ele registra
> medições sobre saídas reais da camada de interpretação. As correções que ele
> implica estão em B.1 e B.2 do `objetivo-estados-caminho.md`; não as duplique
> aqui.
>
> Cresce por acumulação: cada execução nova acrescenta uma seção, nenhuma
> substitui a anterior. A geração é estocástica e não se refaz igual, então o
> texto bruto de cada execução é dado primário e não deve ser resumido.

---

## Por que este registro existe

A dissertação registra, na Seção 6.2, o que a revisão humana encontrou na saída da
camada de IA em maio de 2026:

> A revisão humana identificou quatro imprecisões factuais na saída da camada de
> IA. A primeira é a afirmação de que todos os respondentes apresentaram CR
> individual inferior a 10%, com faixa de 1,1% a 9,6%; a Tabela 4 registra oito
> respondentes acima do limite na matriz estratégica, e a faixa citada corresponde
> a uma média diluída entre as vinte e seis matrizes de cada respondente, vinte
> delas de ordem 2 × 2 e consistência trivial. A segunda é a descrição do painel
> como distribuído à razão de três respondentes por mérito BOCR, desenho que não
> existiu. Os doze respondentes responderam à totalidade das setenta e duas
> comparações. A terceira é a citação de uma página inexistente em Wijnmalen
> (2007), cujo artigo abrange as páginas 892 a 905; o número da equação indicado
> está correto. A quarta é a invocação da condição de consistência de grupo de Xu
> (2000 apud Escobar; Aguarón; Moreno-Jiménez, 2004), cuja premissa, a
> consistência aceitável de todas as matrizes individuais, não se verifica neste
> estudo.

A execução de 10/09/2026 mostra que **as quatro continuam presentes**, contra o
motor unificado e depois de seis commits de saneamento, mais uma quinta não
registrada antes.

**A coincidência mais direta é a faixa.** O manuscrito registra "1,1% a 9,6%" em
maio; o parecer de setembro traz exatamente os mesmos números. É a faixa do cache
do Firestore, 1,05% a 9,64%, e a causa que o manuscrito já identificava — a média
diluída sobre as vinte e seis matrizes — é a mesma que a seção 3.1 do
`referencia-cr-individuais.md` confirmou numericamente.

Isso não é anedota: é reprodutibilidade. As imprecisões têm causa identificada, e
duas delas não seriam capturadas por nenhum verificador de citação.

---

## Classificação por tipo de falha

As cinco imprecisões pertencem a **quatro classes distintas**, cada uma exigindo
um mecanismo de verificação diferente. Essa distinção vale mais que a contagem.

| Classe | Imprecisões | O que a causa | O que a pegaria |
|---|---|---|---|
| **A. Dado de entrada falso** | 1 (parte) | o `qualityAnalysis` que chega à rota é construído sobre um cache que não é o CR do respondente | verificação do insumo contra o dado primário. **Nenhum verificador de citação pega**: o modelo relatou fielmente o que recebeu |
| **B. Ancoragem corrompida** | 3 e 5 | o RAG entrega a claim correta e a geração altera o localizador (**72% das citações com página**), ou aplica a claim a contexto que ela não sustenta | comparação do localizador gerado contra o `evidence.page` da claim. O verificador atual, que confere apenas autor e ano, **não pega** |
| **C. Premissa não verificada** | 4 | a claim é citada corretamente, mas a condição que o próprio autor estabelece não é checada contra os dados | verificação da premissa, não da citação |
| **E. Instrução exige dado que o payload não fornece** | 2, e por consequência a 4 | a DIRETRIZ 1 manda aplicar Escobar comparando CR do grupo com CRs individuais **dentro da mesma matriz**, e trata o caso N=1. O payload informa apenas `totalRespondents` = 12, nunca o N por matriz. **Nem o prompt nem o payload mentem**: a instrução está correta e o dado está correto. O modelo fabrica o N faltante (12 ÷ 4 = 3) **para poder obedecer** | verificação de **suficiência do payload em relação às exigências do prompt**. Auditar o prompt contra o RAG não pega; auditar o payload contra o dado não pega |
| **D. O prompt ensina o erro** | parte da 1 e parte da 3 | (i) o exemplo de formato traz "Wijnmalen (2007, p. 250)" quando o `evidence.page` no RAG é 899; (ii) a REGRA CRÍTICA de limiares cita Saaty (1977, p. 271) quando a claim está na 248; (iii) o exemplo marcado como CORRETO contém a própria imprecisão 1, "os 12 respondentes apresentam CRs entre 1,1% e 9,6%"; (iv) o payload montado em `ai-reviewer/route.ts` afirma "Validação externa com pyAHP" quando o sistema usa AhpAnpLib; (v) a DIRETRIZ 1 pressupõe um N por matriz que o payload nunca informa, e o modelo o inventa para poder cumpri-la (imprecisão 2). O modelo obedeceu | auditoria do prompt contra o RAG e contra o dado real. **Nenhum verificador de saída pega**: a saída é fiel à instrução |

**O erro quase nunca está na geração.** Depois de determinar a causa da
imprecisão 2 e a origem do "pyAHP", o quadro é:

| Classe | Imprecisões | Onde está a causa |
|---|---|---|
| A. Dado de entrada falso | 1 (parte) | banco de dados |
| B. Ancoragem corrompida | 3 (parte) e 5 | geração |
| C. Premissa não verificada | 4 (parte) | geração |
| **D. O prompt ensina o erro** | 1 (parte), 3 (parte), pyAHP | prompt e payload |
| **E. Instrução exige dado ausente** | 2, e por consequência a 4 | **a lacuna entre prompt e payload** |

**O modelo foi fiel em quase todos os casos.** Fiel ao insumo, ao exemplo, à
diretriz. Um pipeline que verifique cada afirmação contra a fonte citada aprovaria
a maioria.

**A classe E é a que expõe problema de desenho, e não conserto pontual.** As
outras quatro têm correção óbvia: corrigir o cache, corrigir a página, verificar a
premissa, corrigir o exemplo. Esta mostra que **um prompt inteiramente verdadeiro
e um payload inteiramente verdadeiro podem, em combinação, produzir invenção**.

Auditar o prompt contra o RAG não pega. Auditar o payload contra o dado não pega.
Só pega quem verificar a **suficiência do payload em relação às exigências do
prompt**, e essa é a quarta superfície de verificação deste registro, ao lado da
geração, do prompt e da fonte primária.

---

## Método de apuração

Como a taxa de divergência de localizador foi medida, para que a apuração seja
reproduzível e auditável.

**Objeto.** Um parecer gerado em 10/09/2026 pela rota `/api/ai-reviewer` contra o
commit `d16491a`, sobre o projeto real de doze respondentes. Texto bruto no anexo.

**Universo.** Todas as citações do parecer que trazem **localizador de página**,
no formato "Autor (ano, p. N)". Citações sem página ficam fora do universo: não
afirmam localizador e, por isso, não podem divergir. São uma terceira categoria,
não verificável por este teste, e o total delas está registrado abaixo.

**Referência de verdade.** O conjunto de valores `evidence.page` das claims em
`lib/rag/articles/*.ts`, para o artigo citado. É o que o sistema entrega ao
modelo, e portanto o que ele deveria preservar.

**Critério de divergência.** Uma citação diverge quando a página que ela afirma
**não é a página de nenhuma claim registrada** para aquele autor e ano.

Este é o teste que interessa, porque é o que um verificador faria: comparar o
localizador gerado contra o `evidence.page` da claim recuperada. A conferência
contra a **faixa do artigo** é teste secundário, mais grosseiro, e corresponde ao
requisito 2 adiante: ele pega a família mais grosseira do erro sem precisar
identificar a claim exata.

**Limitação do critério.** Ele não distingue artigo curto de artigo longo:
acertar uma das páginas de claim é mais provável num artigo com sete páginas
indexadas que num com três. Das cinco corretas, quatro estão em artigos com sete
ou menos páginas de claim. E ele não verifica se a página corresponde à claim
*daquela afirmação específica*, apenas se pertence a alguma claim do artigo, o
que continua sendo generoso.

**Nota sobre faixas.** Para Wijnmalen (2007) o documento usa dois números
distintos, e eles não são intercambiáveis: **892 a 905** é a faixa do artigo no
periódico, confirmada no manuscrito; **892 a 903** é a faixa das páginas
indexadas no RAG. A conferência é contra a segunda.

**Resultado, em dois níveis.**

*Taxa bruta:* 18 citações com localizador, **13 divergentes, 72%**.

*Decomposição por causa*, que é a leitura mais defensável, porque não depende de o
revisor concordar que as três categorias sejam igualmente graves:

| Causa | Casos | Corrigível por |
|---|---|---|
| Troca de convenção de numeração | 6 | padronizar o RAG |
| Erro de vizinhança (dentro da faixa, fora de qualquer claim) | 3 | verificação de localizador contra a claim |
| **Exemplo errado no system prompt** | 1 (Wijnmalen p. 250) | corrigir o prompt |
| Generalização a partir do exemplo errado | 1 (Wijnmalen p. 252) | corrigir o prompt |
| Não explicada, incluindo um localizador fabricado verificado até o PDF | 2 (Lee 3578, Saaty e Ergu) | verificação de localizador |

**A decomposição é o argumento.** Se as treze fossem troca de convenção, a
conclusão seria pequena: base inconsistente, modelo reproduz, correção trivial.
Com **cinco sem origem no que foi entregue**, fica estabelecido que **mesmo com a
base perfeita restariam cinco em dezoito**, e nenhuma correção de base as evita.
Só verificação de saída.

### Cobertura do teste, e o que se pode afirmar sobre o total

O parecer traz cerca de **29 citações**, das quais 18 com localizador de página e
11 sem. O teste alcança **62%**.

Reportar um número único seria enganoso. O que se sabe sobre o total:

| | Citações | Leitura |
|---|---|---|
| Verificadas e divergentes | 13 | erro confirmado |
| Verificadas e corretas | 5 | correção confirmada |
| Sem localizador | ~11 | **inverificáveis**: não afirmam página, logo não podem divergir, mas também não permitem conferência |

Portanto: **taxa de erro entre 13/29 (45%) no melhor caso e 24/29 (83%) no pior**,
com 13/18 (72%) medido sobre o subconjunto verificável. Essa formulação antecipa
a pergunta do revisor sobre o denominador.

**A ausência de localizador é lacuna do mecanismo, não do resultado.** Uma
afirmação técnica sem página é indistinguível de uma correta: o verificador não a
reprova nem a aprova.

**E as onze não são desobediência: são conformidade.** O `system-prompt.ts` exige
verbatim e página **na primeira aparição** de cada paper, e abre exceção explícita
para aparições subsequentes e para comparações em série. As citações sem
localizador cumprem a regra.

Portanto a lacuna de cobertura é **de desenho, não de execução**. A regra escolhe
não exigir aquilo que torna a verificação possível.

**Requisito:** em sistema onde a citação será verificada, a exceção por repetição
custa a verificabilidade de 38% das citações. Ou a exceção cai, ou 38% do parecer
fica fora do alcance do verificador por construção.

---

## Execução de 10/09/2026

| | |
|---|---|
| Commit | `d16491a` |
| Modelo | `claude-opus-4-6` |
| Tempo de geração | 154 segundos (2m34s) |
| `maxTokens` | 16000 |
| Budget de raciocínio | 5000 tokens |
| Veredito emitido | ACEITO, pontuação 100/100 |
| Texto bruto | ver anexo ao fim deste documento |

---

### Imprecisão 1 — CR individual (classe A)

**O que o parecer afirma.** "Todos os 12 respondentes apresentam CR ≤ 0,10 (taxa
de conformidade: 100%)". E, no detalhamento: "os 12 respondentes apresentam CRs
entre 1,1% (respondente gZoIOQ...) e 9,6% (respondente SXAASS...)", com uma
tabela de distribuição que registra "CR > 10%: 0 respondentes, 0,0%".

**O que é verdade.** O CR governante vai de 11,39% (R01) a 109,27% (R03).
Quarenta e sete das setenta e duas matrizes individuais superam o limiar de 0,10.
Fonte: `docs/referencia-cr-individuais.md`, seção 2, verificada contra os 864
julgamentos brutos pelo motor unificado, e Tabela 22 do Apêndice G da
dissertação, que confere valor a valor.

**Causa técnica.** `extractRespondentCRs`, em `app/api/response-quality/route.ts`,
tem saída antecipada na condição `if (response.responses.avgCR !== undefined)`.
Esse campo é cache congelado no Firestore desde a coleta e é a **média aritmética
sobre as 26 matrizes** do respondente, incluindo as vinte de alternativas 2×2 cujo
CR é zero por construção. Diluir por vinte matrizes triviais leva qualquer
respondente para baixo de 10%. A faixa do cache é 1,05% a 9,64%, e o parecer a
reproduz como 1,1% a 9,6%.

**Segunda causa, independente da primeira: o prompt ensina a frase.**

O `system-prompt.ts` traz, na seção "EXEMPLO INTEGRAL DE PARÁGRAFO NO ESTILO
REQUERIDO", um exemplo marcado como **CORRETO** que termina assim:

> Os 12 respondentes individuais apresentam CRs entre 1,1% e 9,6%, todos abaixo
> do limiar.

É a imprecisão 1, palavra por palavra, oferecida ao modelo como modelo de
redação. O exemplo marcado como PROIBIDO, logo acima, traz a mesma informação em
outra forma: a diferença entre os dois é apenas estilo, e ambos ensinam o mesmo
fato falso.

Há ainda, na regra de linguagem impessoal:
`Exemplo correto: "todos os 12 respondentes atendem o limiar"`.

**Portanto a imprecisão 1 é de classe A e D ao mesmo tempo.** Corrigir o cache do
Firestore (B.1) **não a elimina**: o modelo continuaria tendo, no prompt, um
exemplo dizendo que os doze estão entre 1,1% e 9,6%. São duas correções
independentes.

**Evidência de qual pesa mais, e ela é boa.** O exemplo do prompt traz Costs
**2,58%** e Risks **1,39%**. O parecer produziu **2,60% e 1,40%**, que são os
valores reais do projeto. O modelo **corrigiu os dois números que o dado
contradizia e manteve a faixa individual intacta**.

Isso mostra que ele não copia cegamente: confronta o exemplo com o dado recebido
e o dado prevalece. A faixa sobreviveu porque as duas fontes concordavam, e as
duas estavam erradas pela mesma causa. É o achado mais forte da auditoria do
prompt, mais que os dois localizadores.

**A afirmação sem número é pior que a com número.** A linha 299 traz
`Exemplo correto: "todos os 12 respondentes atendem o limiar"`, dentro de uma
regra de estilo sobre linguagem impessoal. Ela não tem valor que o dado possa
contradizer: é conclusão qualitativa, não medida. O modelo confrontou 2,58% com
2,60% e corrigiu; não há como confrontar "atendem o limiar" com coisa alguma.
**Ensina a conclusão, não o valor**, e por isso escapa ao mecanismo que corrigiu
os agregados.

### Observação de generalidade: o prompt está acoplado a este caso

O dado deste projeto permeia o `system-prompt.ts`. O CR de 1,06% aparece em seis
lugares como material de exemplo; "12 respondentes" ou "12 especialistas" em
três; os CRs por mérito, os nomes das alternativas e os valores de síntese
aparecem nos exemplos de parágrafo.

Isso é achado de outra natureza, e toca a **generalidade do artefato**, não a
fidelidade desta execução. O prompt não é genérico: foi escrito olhando um caso.
Se outro projeto usar o sistema, o modelo recebe exemplos de redação povoados com
dados de um painel que não é o dele, e a evidência acima mostra que ele copia o
que o dado recebido não contradiz.

Para uma ferramenta que se apresenta como instrumento de apoio à decisão
reutilizável, isso é limitação de projeto. Registrada aqui porque foi encontrada
durante esta auditoria; o endereço da correção é A.10, segundo commit.

**Reprodutível.** Sim. Registrada na Seção 6.2 da dissertação (maio de 2026) e
presente na execução de 10/09/2026.

**Nota temporal obrigatória.** A execução de 10/09/2026 foi feita **antes** de
qualquer correção do prompt. Quem ler este registro depois de A.10 não deve
estranhar que o parecer diga p. 250 num prompt já corrigido para 899.

**Alcance dentro do parecer.** A afirmação não fica isolada: sustenta o Ponto
Forte 1, a tabela de distribuição por faixa, a seção de análise de viés ("100% de
conformidade CR"), e é citada na fundamentação da decisão editorial.

---

### Imprecisão 2 — três respondentes por dimensão (classe A)

**O que o parecer afirma.** "Os dados indicam 3 respondentes por dimensão BOCR
(Benefits, Opportunities, Costs, Risks)", usado como Limitação 1 e desenvolvido
com Aull-Hyde et al. (2006) sobre convergência de consistência agregada.

**O que é verdade.** Os doze respondentes responderam à **totalidade** das 72
comparações pareadas. Esse desenho nunca existiu. Fonte: Seção 6.2 da
dissertação e a estrutura do próprio `judgments[]`, com 72 entradas por
respondente.

**Causa técnica: determinada em 10/09/2026, e é classe D.** O modelo não inventou
o número por acaso: ele o inferiu **para poder cumprir uma instrução do prompt**.

A DIRETRIZ 1 do `system-prompt.ts` manda aplicar a propriedade de Escobar (2004)
"apenas ao comparar CR_grupo vs. CR_individuais **dentro da mesma matriz**", e
trata explicitamente o caso de um único respondente, duas vezes:

> Com N=1, a propriedade é vacuous — declare isso explicitamente em vez de afirmar
> que "se verifica".

E o exemplo de redação correta que ela oferece começa por "Com N=1, não há
agregação entre respondentes".

**A diretriz exige um N por matriz. O payload não fornece nenhum.** O
`ai-reviewer/route.ts` calcula e envia apenas `totalRespondents`, que é 12. Não há
campo algum informando quantos respondentes agregam dentro de cada matriz.

Diante da lacuna, o modelo preencheu com a divisão plausível: doze respondentes,
quatro dimensões BOCR, três por dimensão.

**A execução 2 escreve a inferência com todas as letras:**

> A propriedade demonstrada por Escobar (2004, p. 9) [...] é testável nesta
> configuração, **dado que cada dimensão conta com 3 respondentes (N > 1)**.

O "dado que" é a chave: o modelo declara o N inventado como premissa que autoriza
aplicar a diretriz. **Ele não errou apesar da instrução; errou por causa dela.**

**Reclassificação.** A imprecisão 2 sai da classe A e passa à **classe D**. Não é
dado de entrada falso: é instrução que pressupõe informação que o payload não
entrega. Corrigir o cache do Firestore não a elimina.

**Duas correções possíveis, e a segunda é a certa.** Reescrever a diretriz para
não pressupor N por matriz trata o sintoma. Fazer o payload informar quantos
respondentes agregam em cada matriz trata a causa, e é dado que o sistema já tem:
neste painel, todos os doze responderam às setenta e duas comparações, então N=12
em todas as matrizes.

**Reprodutível.** Sim. Seção 6.2 e execução de 10/09/2026.

---

### Imprecisão 3 — páginas de Wijnmalen (classe B)

**O caso mais limpo do conjunto**, porque a fonte, o que foi entregue e o que foi
gerado são todos verificáveis.

**O que o parecer afirma.** Duas citações com localizador:
- "Wijnmalen (2007, p. 250) demonstra que *'synthesis requires commensurate
  priorities on a common scale'*"
- "Wijnmalen (2007, p. 252) especifica a fórmula como: *'v_b·s_b·B_p^i + ...'*"

**O que é verdade.** O artigo abrange as páginas **892 a 905** no periódico; as
claims indexadas no RAG vão de **892 a 903**. As duas passagens existem, com o
texto exatamente como citado, mas em outras páginas:

| Passagem | Página real, registrada no RAG | Página no parecer |
|---|---|---|
| "synthesis requires commensurate priorities..." | **899**, Section 4 | 250 |
| fórmula da Eq. (17) | **903**, Eq. (17) | 252 |

**Causa técnica: a página errada está no próprio system prompt.**

O `app/api/ai-reviewer/system-prompt.ts` traz, **duas vezes**, como exemplo de
formato de citação:

> Conforme Wijnmalen (2007, **p. 250**): "synthesis requires commensurate
> priorities on a common scale"

O `evidence.page` dessa claim no RAG é **899**. O exemplo do prompt contradiz a
base que o mesmo prompt manda usar.

O modelo **obedeceu ao exemplo**. A p. 250 do parecer é reprodução fiel de uma
instrução errada, não corrupção da geração. A p. 252, que não aparece no prompt,
é provavelmente extensão por analogia a partir do 250 que ele acabou de usar.

**A regra existe e é explícita.** O mesmo prompt determina: "Inclua sempre o
número da página, do campo `evidence.page` ou equivalente." Ou seja, a regra
manda usar o `evidence.page` e o exemplo logo abaixo usa outro número.

**Contraprova.** O prompt também traz "Saaty (1977, p. 248)" oito vezes como
exemplo. Essa página **está correta** no RAG, e é uma das cinco que o parecer
acertou. O modelo é fiel ao exemplo nos dois casos: quando o exemplo está certo,
acerta; quando está errado, erra.

**Isso cria uma quarta classe de falha**, distinta das três anteriores:
instrução do prompt contradizendo a base. Nenhum verificador de citação a pega,
porque a saída é fiel ao que foi instruído. Só auditoria do prompt contra o RAG.

**A varredura do prompt encontra um segundo caso, e pior.**

O `system-prompt.ts` cita quatro páginas ao todo: 167, 248, 250 e 271.

| Citação no prompt | Onde aparece | Páginas no RAG | |
|---|---|---|---|
| Saaty (1977, p. 248) | exemplos e regras, 8 vezes | claim em **248** | ok |
| Forman & Peniwati (1998, p. 167) | exemplo de formato | 166–168 | ok |
| Wijnmalen (2007, p. 250) | exemplo de formato, 2 vezes | claim em **899** (artigo: 892–905) | **erro** |
| Saaty (1977, p. 271) | **REGRA CRÍTICA — LIMIARES** | claims em 237–263; **não há 271** | **erro** |

O segundo é mais grave que o primeiro por dois motivos.

Não é exemplo de formato: é a linha que define qual limiar de consistência usar,
`CR ≤ 0.10: aceitabilidade (Saaty, 1977, p. 271)`. A regra que ancora o critério
central do método traz a fonte errada.

E **o prompt contradiz a si mesmo**: usa `p. 248` corretamente em oito lugares
para a mesma claim de Saaty (1977) e `p. 271` na regra de limiares. Não existe
página 271 nesse artigo.

**Por que o segundo é pior.** O de Wijnmalen é exemplo de formato: ensina como
escrever, e propaga o erro por imitação. O de Saaty em 271 está na linha que
**define o limiar de aceitação**. Não ensina formato, ancora o critério central do
método. Quem fosse conferir de onde vem o `CR ≤ 0,10` seria mandado a uma página
que não existe no artigo.

E a autocontradição fecha o caso sem margem: o mesmo arquivo usa 248 oito vezes
para a mesma claim. Não é divergência entre prompt e base, é divergência do
prompt **consigo mesmo**. Não admite explicação de convenção, de edição ou de
fonte alternativa.

**Escopo da medição: censo, não amostra.** Os quatro localizadores são a
*população inteira* de citações com página no prompt, não uma amostra dela.
**Metade da população está errada.** Isso não se estende às demais categorias, que
foram auditadas separadamente abaixo.

**Auditoria das outras categorias do prompt.** Conferidas contra o RAG:

| Categoria | Itens | Resultado |
|---|---|---|
| Localizadores de página | 4 | **2 errados** (Wijnmalen 250, Saaty 271) |
| Números de equação | 3 (Wijnmalen Eq. 17, Dodevska Eq. 10 e 15) | todos corretos, constam no RAG com esses `locator_id` |
| Limiares numéricos | 3 (CR ≤ 0,10; DI ≥ 0,80; DI ≤ 1,25) | todos corretos |
| Combinações de autor e ano | 61 | **não auditadas.** Maior superfície, menor risco individual: atribuir claim ao autor errado é mais visível que errar a página |

**O padrão é específico:** o prompt acerta equações e limiares, que são o conteúdo
do método, e erra metade dos localizadores, que são a rastreabilidade. O erro
concentra-se exatamente na camada que o eixo de ancoragem existe para garantir.

**A superfície do prompt está fora do PVB.** O protocolo de verificação na base
foi aplicado ao RAG, artigo por artigo, mas nunca ao artefato que instrui o modelo
a usá-lo. O prompt é tratado como configuração, não como conteúdo sujeito a
verificação.

**Para o artigo, isso é resultado próprio:** o artefato que impõe a regra de
ancoragem é ele mesmo fonte de desancoragem, e está fora do alcance de qualquer
verificador de saída.

### Quatro superfícies de desancoragem

Somando este achado ao caso de Salomon e Gomes (2024), registrado adiante, o
sistema tem **três** superfícies distintas por onde uma afirmação pode perder
ancoragem, e um verificador de saída cobre **uma**:

| Superfície | Exemplo medido | Verificador de saída pega? |
|---|---|---|
| **A geração** | Lee p. 3578, fabricado sem origem | sim, comparando contra o RAG |
| **O prompt** | Saaty p. 271 na regra de limiares, quando a claim está na 248 | **não.** A saída é fiel à instrução |
| **A fonte primária** | Salomon e Gomes (2024) publica "0.5 e 0.8" onde Saaty propõe 0,05 e 0,08; a extração do RAG é fiel ao artigo | **não.** A claim corresponde à fonte |
| **A interface entre prompt e payload** | a DIRETRIZ 1 exige um N por matriz; o payload informa apenas `totalRespondents`. O modelo fabrica o N faltante para poder obedecer | **não.** Prompt e payload estão ambos corretos; o erro está na lacuna |

Verificar a saída contra o contexto recuperado cobre a primeira. As outras três
exigem **verificar para trás**: o prompt contra a base, a base contra a fonte
primária, e o payload contra as exigências do prompt.

O PVB foi aplicado ao RAG, artigo por artigo, e nunca ao prompt, que é tratado
como configuração e não como conteúdo verificável. E a quarta superfície não é
verificável por nenhum dos dois protocolos isoladamente: **exige confrontar dois
artefatos corretos entre si.**

É essa assimetria, e não a taxa de erro, o que este registro estabelece.

**Reprodutível.** Sim, e agravada. A Seção 6.2 registra **uma** página
inexistente em maio; a execução de 10/09/2026 traz **duas** só em Wijnmalen.

**E não é caso isolado: é padrão com taxa medida.**

Conferi as dezoito citações com localizador do parecer contra as páginas
registradas nas claims do RAG. **Treze divergem: 72%.**

Conferência contra as **páginas de claim** registradas no RAG, não contra a faixa
do artigo.

| Citação | Pág. no parecer | Páginas de claim no RAG | |
|---|---|---|---|
| Saaty (1977) | 248 | 237, 246, 247, **248**, 249, 251, 263 | ok |
| Salomon (2024) | 2 | 1, **2**, 3, 4, 5, 7 | ok |
| Petrillo (2023) | 4 | 2, **4**, 7 | ok |
| Ayan (2023) | 2 | 1, **2**, 19 | ok |
| Saaty (1986) | 843 | 841, **843**, 845, 847, 853 | ok |
| Neely (2020) | 17 | 1033, 1034, 1035, 1042, 1044, 1047 | **diverge** |
| Wijnmalen (2007) | 250 | 892, 894, 895, 899, 901, 902, 903 | **diverge** |
| Wijnmalen (2007) | 252 | 892, 894, 895, 899, 901, 902, 903 | **diverge** |
| Ishizaka & Labib (2011) | 14 | 14337–14342 | **diverge** |
| Saaty & Ergu (2015) | 2 | 7, 8, 10, 11, 13 | **diverge** |
| Lee (2009) | 3578 | 120, 122, 123, 124, 125 | **diverge** |
| Saaty & Vargas (2012) | 140 | 4, 6, 8, 9, 26, 33, 35, 38, 39, 40 | **diverge** |
| Saaty & Ozdemir (2003) | 10 | 1063, 1070, 1075 | **diverge** |
| Saiyed (2023) | 8 | 1778, 1779, 1780, 1787, 1788 | **diverge** |
| Dodevska (2023) | 6 | 4, 5, 8, 9, 10, 12, 14 | **diverge** |
| Saaty (1987) | 165 | 163, 170, 171, 172, 174 | **diverge** |
| Forman & Peniwati (1998) | 169 | 166, 167, 168 | **diverge** |
| Aull-Hyde (2006) | 166 | 1, 3, 4, 5, 6 | **diverge** |

Três das divergências ficam **dentro da faixa do artigo** mas fora de qualquer
claim: Saaty (1987) p. 165 entre 163 e 174; Dodevska (2023) p. 6 entre 4 e 14;
Forman e Peniwati (1998) p. 169, a um passo de 168. Pelo teste secundário de
faixa, as duas primeiras contariam como corretas e a taxa cairia para 11 em 18.
**A diferença entre os dois testes é ela mesma um resultado:** um verificador que
confira apenas a faixa perde três dos treze casos.

**Duas leituras coexistem, e são complementares.** A divisão por *faixa do
artigo* — página dentro ou fora do intervalo — é o **teste secundário**, ligado ao
requisito 2: grosseiro, mas trivial de implementar. A **decomposição por causa**,
adiante, é o teste primário e é o que orienta a correção. A tabela acima traz os
dados das duas.


### Teste da hipótese das duas convenções

A hipótese: o modelo alterna entre **numeração relativa do artigo** (a página
dentro do PDF) e **numeração do periódico** (a página no volume), sem preservar a
convenção que o RAG entregou.

**Primeira verificação: o RAG é consistente?** Não. Dos 34 artigos com página
registrada, **16 usam numeração relativa** (começam em 1 a 27) e **18 usam
numeração de periódico** (começam em 77 a 14337). A base expõe o modelo a sinal
inconsistente, e parte da responsabilidade é dela.

**Segunda verificação: os números produzidos correspondem à convenção
alternativa?** Em seis dos treze casos, sim, e a troca ocorre nas duas direções:

| Artigo | Convenção no RAG | Faixa no RAG | Citado | Leitura |
|---|---|---|---|---|
| Ishizaka & Labib (2011) | periódico | 14337–14342 | 14 | relativa plausível |
| Saaty & Ozdemir (2003) | periódico | 1063–1075 | 10 | relativa plausível |
| Neely (2020) | periódico | 1033–1047 | 17 | relativa plausível |
| Saiyed (2023) | periódico | 1778–1788 | 8 | relativa plausível |
| Aull-Hyde (2006) | relativa | 1–6 | 166 | periódico plausível |
| Saaty & Vargas (2012) | relativa | 4–40 | 140 | periódico plausível |

**Três são erro de vizinhança**, com página dentro da faixa do artigo mas fora de
qualquer claim, ou a um passo dela: Saaty (1987) como 165, com claims em 163 e
170; Dodevska (2023) como 6, com claims em 5 e 8; Forman e Peniwati (1998) como
169, com claims em 166 a 168.

**Reclassificação após a auditoria do prompt.** Dos cinco antes não explicados:

- **Wijnmalen p. 250**: causa identificada, é o exemplo errado do prompt (classe D).
- **Wijnmalen p. 252**: não está no prompt, mas nasce ao lado do 250 que está.
  Generalização a partir de exemplo errado, mecanismo distinto de fabricação.
- **Lee p. 3578**: **fabricação confirmada.** Trilha de verificação, porque é o
  caso que mais atrai ceticismo:
  (i) o PDF de `lee2009_wind` foi aberto: *Renewable Energy* 34 (2009) **120–126**,
  e o verbatim citado está no parágrafo de introdução da p. 120;
  (ii) o segundo Lee de 2009 da base do projeto foi aberto: *Expert Systems with
  Applications* 36 (2009) **2879–2893**, não indexado no RAG;
  (iii) nenhuma das duas faixas contém 3578;
  (iv) busca por "3578" em `app/`, `lib/`, `components/` e em todo o `lib/rag/`
  retorna zero, o que descarta contaminação por número presente no prompt ou no
  contexto;
  (v) o Lee de fornecedores está na base de PDFs do projeto e **não** no RAG,
  ausência já registrada como pendência no `objetivo-estados-caminho.md`. Ela tem
  peso próprio, independente deste achado: o artigo saiu na *Expert Systems with
  Applications*, periódico alvo desta submissão, e citar trabalho publicado no
  periódico de destino é praxe editorial. **Não é causa do erro de localizador.**
  É o único caso do conjunto sem nenhuma explicação de mecanismo.
- **Saaty e Ergu (2015) p. 2** contra claims em 7 a 13: permanece não explicado.

### Três requisitos para o eixo de ancoragem

Derivados de medição, não de especulação.

**1. Comparar página, não só autor e ano.** A whitelist atual aprova 72% das
citações com localizador errado. Implementável hoje: a página vem no
`evidence.page` da claim.

**2. Validar a faixa do artigo.** Sete dos treze casos citam página fora do
intervalo do artigo. O teste é trivial e o RAG tem a faixa. Pega a família mais
grosseira do erro sem precisar identificar a claim exata.

**3. Fixar convenção única na base, ou registrar a convenção por artigo junto da
claim.** Hoje o RAG mistura 16 artigos em numeração relativa com 18 em numeração
de periódico. Sem isso, a verificação não sabe contra o que comparar, e o modelo
recebe sinal inconsistente.

Os dois primeiros são implementáveis hoje. O terceiro é correção na base.

Um mecanismo que apenas confirme que a citação existe na fonte aprovaria as
treze.

---

### Imprecisão 4 — propriedade de Escobar (classe C)

**O que o parecer afirma.** "A propriedade de Escobar (2004), segundo a qual *'the
inconsistency of the group is smaller than the largest individual inconsistency'*,
aplica-se às matrizes agregadas por média geométrica dentro de cada dimensão
BOCR."

**O que é verdade.** A citação é exata e a claim existe no RAG
(`escobar2004_note.ts`, com o `verbatim_quote` idêntico). O problema é a
aplicação: a Seção 6.2 da dissertação registra que a premissa da condição de
consistência de grupo, a **consistência aceitável de todas as matrizes
individuais**, não se verifica neste estudo.

**Causa técnica.** Nenhuma falha de recuperação ou de citação. O modelo não
checou a premissa contra os dados. E não tinha como: o `qualityAnalysis` que ele
recebeu dizia que 100% dos respondentes estavam abaixo do limiar (imprecisão 1).

**Nota de dependência, corrigida em 10/09/2026.** Esta imprecisão é consequência
da **imprecisão 2**, não da 1. A cadeia é:

1. A DIRETRIZ 1 do prompt exige um N por matriz para aplicar Escobar.
2. O payload não fornece esse N.
3. O modelo infere três respondentes por dimensão (imprecisão 2).
4. Com o N inventado, aplica a propriedade sobre uma configuração que não existe.

A execução 2 escreve o elo com todas as letras: a propriedade "é testável nesta
configuração, **dado que cada dimensão conta com 3 respondentes (N > 1)**".

Isso mostra que as classes não são independentes: **uma lacuna de payload induz
fabricação, e a fabricação sustenta uma aplicação indevida a jusante.**

**Reprodutível.** Sim. Seção 6.2 e execução de 10/09/2026.

---

### Imprecisão 5 — Ishizaka e Labib sobre deleção de comparações (classe B)

**Não registrada entre as quatro de maio.** O conjunto não é fechado.

**O que o parecer afirma.** Como Ponto Forte 4, sobre a estabilidade do ranking:
"Conforme Ishizaka & Labib (2011, p. 14): *'one can randomly delete as much as 50%
of the comparisons without significantly reducing the results'*. A ausência de
pontos de virada indica que a dominância de A1 sobre A2 é preservada sob
perturbações nos pesos BOCR."

**O que é verdade.** A citação é exata e existe no RAG
(`ishizaka2011review.ts`, claim "Up to 50% comparisons can be deleted without
major loss"). Mas ela trata de **matrizes incompletas**, ou seja, de quantas
comparações pareadas podem ser omitidas na coleta sem degradar as prioridades
derivadas. Não tem relação com estabilidade do ranking sob variação de pesos, que
é o que a análise de sensibilidade mede. A claim foi invocada para sustentar uma
afirmação que ela não sustenta.

**Causa técnica.** Recuperação semântica por proximidade de vocabulário:
"comparisons", "results", "without significantly reducing" são compatíveis com o
tema de robustez, e a claim foi trazida para um contexto errado.

**Reprodutível.** Desconhecido. Primeira observação.

---

## O que o parecer acertou

Registrar os acertos importa: sem eles o documento é acusação, não medição.

| Afirmação | Verificação |
|---|---|
| "A análise de sensibilidade não identificou pontos de virada em nenhuma das quatro dimensões" | correto. `sensitivityInflections` é `{B: null, O: null, C: null, R: null}` no documento de cálculo |
| "A totalidade dos 12 respondentes é do gênero masculino" | correto. Contagem no backup: 12 de 12 |
| CRs agregados: BOCR 1,06%, B 1,10%, O 0,92%, C 2,60%, R 1,40% | corretos. Conferem com a Tabela 6 e com o arnês de caracterização |
| Pesos BOCR e rescaling weights | corretos. Conferem com a Tabela 8 |
| Scores finais A1 0,064129 e A2 0,026937 | corretos. Conferem com a Tabela 12 |
| Fórmula da síntese subtrativa com v e s | correta. Corresponde a Wijnmalen Eq. 17, apenas com a página errada (imprecisão 3) |

**Todos os valores numéricos derivados do motor estão corretos.** As imprecisões
concentram-se em dois lugares: o que vem do `qualityAnalysis` (classe A) e o que
vem da camada bibliográfica (classes B e C).

Isso é resultado, não detalhe: separa o que o cálculo determinístico garante do
que a camada de interpretação introduz.

---

## Caso à parte: erro na fonte primária

Registrado durante a auditoria do RAG, em 10/09/2026. Não é imprecisão do parecer,
mas pertence ao mesmo quadro: é a terceira superfície de desancoragem.

`lib/rag/articles/salomon2024_consistency.ts` registra dois limiares de CR por
ordem de matriz: `CR ≤ 0.5` para ordem três e `CR ≤ 0.8` para ordem quatro, com
`page: 5`, `locator_id: "2.1"`.

**A extração está fiel à fonte.** A página 5 do artigo foi aberta e verificada:
Salomon e Gomes (2024), *Mathematics* 12, 828, escreve literalmente que para
matrizes de ordens três e quatro os limiares poderiam ser 0,5 e 0,8, atribuindo a
Saaty pela referência [29].

**O erro está no artigo.** Os limiares de Saaty por ordem são **0,05 e 0,08**. Um
CR de 0,5 seria 50%, acima do que o próprio artigo, três parágrafos depois, chama
de inaceitável ao classificar uma matriz com CR de 1,29.

**Consequência.** A claim está ativa: `ai-reviewer/route.ts` chama
`getRAGThresholds('CR')`, que devolve todos os limiares de CR do RAG, incluindo
esses dois, e o system prompt exige verbatim em afirmação técnica. Se o parecer
recuperar a claim, informará ao gestor que CR até 50% é aceitável para matriz de
ordem três.

**Nenhum verificador de saída pega.** A citação corresponde exatamente à fonte. O
PVB funcionou como deveria: a claim tinha página e seção registradas, foi possível
abrir e conferir. É o primeiro caso em que a verificação encontra erro na origem
em vez de na extração.

**Decisão editorial pendente**, e é do autor: o artigo é do orientador. Registrado
em 10/09/2026, sem ação.

---

## Desenho da série de execuções

A geração é estocástica, então uma execução isolada não distingue causa de
variação. A sequência abaixo isola as duas causas da imprecisão 1 e as duas dos
localizadores, e cada etapa custa uma geração de cerca de 2m30s.

| # | Estado do sistema | O que a execução decide |
|---|---|---|
| 1 | 10/09/2026, `d16491a`. Nada corrigido | **Feita.** Linha de base: 5 imprecisões, 13 de 18 localizadores divergentes |
| 2 | Depois do 1º commit de A.10: páginas corrigidas, exemplos de parágrafo ainda com o dado falso | **Feita**, `2b353b3`, 150s. A p. 250 sumiu e a faixa "1,1% e 9,6%" permaneceu. Classe D confirmada como fato. Mais quatro achados: imprecisão 5 estocástica, localizador fabricado instável, vizinhança confirmada como ruído |
| 3 | Depois do 2º commit: exemplos de parágrafo sem dado real | Se a faixa sumir aqui e não na etapa 2, isola o exemplo como causa, independente do cache |
| 4 | Depois do Bloco B: cache do Firestore regravado | Isola o dado de entrada como causa. Junto com a etapa 3, decide se a imprecisão 1 exigia as duas correções ou apenas uma |
| 5 | Depois de o payload informar o N por matriz (12 em todas) | **A mais barata das cinco:** uma linha no payload, uma geração. Decide se as imprecisões 2 e 4 desaparecem por construção. Se sim, confirma a classe E como fabricação por lacuna, e não por tendência do modelo a inventar |

**Não pular etapas.** Corrigir tudo de uma vez e gerar um parecer no fim mostra
que as imprecisões sumiram, mas não diz qual correção resolveu qual. A ordem
acima transforma quatro correções de engenharia em quatro medições.

**Registrar cada execução** nesta seção, com data, hash do commit, tempo de
geração, modelo e texto bruto, na mesma estrutura da execução de 10/09/2026.

---

## Pendências de levantamento

1. ✅ **Causa da imprecisão 2:** determinada. A DIRETRIZ 1 do prompt pressupõe um
   N por matriz que o payload nunca informa, e o modelo o infere dividindo 12 por
   4. É classe D, não A. Ver a seção da imprecisão 2.
2. ✅ **Reprodutibilidade da imprecisão 5.** Respondida na execução 2: não se
   reproduziu. Era estocástica.
3. **Contagem de execuções.** Este registro tem três: maio de 2026 (Seção 6.2 da
   dissertação, quatro imprecisões), execução 1 em 10/09/2026 (cinco) e execução 2
   no mesmo dia, depois da correção do prompt. As etapas 3 e 4 do desenho ainda
   faltam.

4. ✅ **Origem dos "58,0% de diferença"** no Relatório Técnico Completo:
   resolvida. É a diferença relativa ao vencedor,
   (0,064129 − 0,026937) / 0,064129 = 58,0%. Não é imprecisão. O rótulo na tela
   ainda merece conferência: "Excelente discriminação" é juízo sem fonte, e entra
   na revisão do `/api/audit-decision` adiada para o fim do saneamento.

5. **Auditar o payload construído em `ai-reviewer/route.ts`**, superfície irmã do
   `system-prompt.ts` e nunca verificada. O caso do "pyAHP" mostra que ela carrega
   afirmações sobre o próprio sistema. Escopo de A.10.

---

## Execução 2 — 10/09/2026, depois da correção do prompt

| | |
|---|---|
| Commit | `2b353b3` (1º commit de A.10 aplicado) |
| Modelo | `claude-opus-4-6` |
| Tempo de geração | 150 segundos (2m30s) |
| Veredito emitido | ACEITO |
| Texto bruto | anexo 2 |

**Variável alterada em relação à execução 1:** apenas os três localizadores de
página do `system-prompt.ts`. Os exemplos de parágrafo com dado falso e o cache
do Firestore permanecem intactos. É o controle previsto na etapa 2 do desenho.

### Fato 1 — a correção do prompt propagou para a saída

| Citação | Execução 1 | Execução 2 | RAG |
|---|---|---|---|
| Wijnmalen, comensurabilidade | p. **250** | p. **899** | 899 |
| Wijnmalen, Eq. 17 | p. **252** | p. **903** | 903 |
| Saaty (1977), limiar | p. 248 | p. 248 | 248 |

As duas citações erradas passaram a corretas, e **nenhuma outra melhorou por
conta própria**. Com uma única variável alterada, mudou exatamente o que foi
corrigido.

**Isto encerra a classe D como hipótese e a estabelece como fato.** O modelo
obedecia ao exemplo do prompt; corrigido o exemplo, a saída corrigiu junto. É o
teste mais forte deste registro, porque tem antes, depois e controle.

### Fato 2 — a faixa dos CRs persistiu

"Todos os 12 respondentes apresentam CR individual entre 1,1% e 9,6%" aparece
**três vezes** no texto: pontos fortes, análise detalhada e decisão editorial.

Era o previsto. As duas fontes que a sustentam continuam intactas: o cache do
Firestore (B.1) e o exemplo de parágrafo no prompt. **A imprecisão 1 exige as
duas correções**, e a etapa 3 do desenho isola qual delas basta.

### Fato 3 — a imprecisão 5 não se reproduziu

O parecer cita Ishizaka e Labib de novo, na mesma p. 14, mas com **outra claim**:
*"Sensitivity analysis for AHP is relevant only when alternatives are included in
the hierarchy"*, e desta vez a aplicação está correta. A claim das 50% de
comparações não apareceu.

**A imprecisão 5 era estocástica, não sistemática.** Das cinco, quatro se
reproduzem e uma não. Isso responde a pendência de reprodutibilidade que o
documento tinha em aberto, e mostra que o conjunto tem duas naturezas: erro
estrutural e ruído de geração.

### Fato 4 — o localizador fabricado mudou de valor

Lee (2009) foi citado como **p. 3578** na execução 1 e **p. 1107** na execução 2.
O RAG registra 120 a 125 nas duas. Nenhum dos dois números existe.

**A fabricação não é estável entre gerações.** Se fosse recuperação de um número
específico da memória paramétrica, tenderia a repetir. Varia, logo é fabricação
com valor arbitrário. Duas amostras, dois números diferentes, mesma claim
recuperada corretamente com o verbatim exato.

### Fato 5 — os erros de vizinhança viraram acertos

| Citação | Execução 1 | Execução 2 | RAG |
|---|---|---|---|
| Forman & Peniwati (1998) | 169 | **167** | 166, 167, 168 |
| Saaty (1987) | 165 | **163** | 163, 170, 171, 172, 174 |

Os dois casos classificados como "erro de vizinhança" corrigiram-se sozinhos, sem
que nada os tocasse. **Vizinhança é ruído, e ruído varia.** A classificação se
confirma.

Em sentido contrário, **Aull-Hyde (2006) piorou**: de p. 166 para p. 252, contra
1 a 6 no RAG. Muda de valor e continua fora da faixa.

### Imprecisões novas nesta execução

**A imprecisão 2 se agravou.** Os "3 respondentes por dimensão BOCR" agora
aparecem em **quatro** lugares, contra dois na execução 1: resumo, limitação 1,
ação de mitigação 2 e decisão editorial. E ganharam desenvolvimento: o parecer
recomenda "documentar o critério de alocação dos especialistas às dimensões
(aleatorização, expertise, auto-seleção)" de um desenho que nunca existiu.

**Nova, e é o terceiro caso de classe D.** O parecer afirma: "A validação externa
dos cálculos foi realizada com pyAHP, conforme documentado nos recursos do
sistema."

O sistema usa a **AhpAnpLib**, confirmado em `calculate/route.ts`,
`validate-external/route.ts`, `resultados/page.tsx` e `ExternalValidation.tsx`.

**Mas o parecer não inventou.** O payload construído em
`app/api/ai-reviewer/route.ts`, linha 1295, envia ao modelo a linha:

```
- ✅ Validação externa com pyAHP
```

É a **única** ocorrência de "pyAHP" no repositório inteiro. A afirmação do parecer
é fiel ao que recebeu.

**Este é o caso de classe D mais consequente dos três**, porque não está no
`system-prompt.ts`: está no **payload construído em runtime**. A auditoria de A.10
varreu o arquivo de instruções e não alcançaria esta linha.

**Consequência para A.10:** a superfície do prompt não é um arquivo, são dois. O
texto que chega ao modelo é o `system-prompt.ts` mais o payload montado em
`route.ts`, e o segundo nunca foi auditado.

**Nova, sobre Xu (2000).** O parecer cita Xu (2000, p. 285) para afirmar que a
condição de consistência agregada "é satisfeita", porque todos os CRs individuais
estariam abaixo de 0,10. É a mesma imprecisão 4 da Seção 6.2 da dissertação, agora
com Xu citado diretamente em vez de *apud* Escobar. **A premissa continua falsa**,
e pela mesma causa da imprecisão 1.

### Taxa de divergência de localizador na execução 2

Mesma metodologia da execução 1: conferência contra as páginas de claim do RAG.

**13 divergentes em 21 citações com localizador, 62%.**

| | Execução 1 | Execução 2 |
|---|---|---|
| Citações com localizador | 18 | 21 |
| Divergentes | 13 | 13 |
| Taxa | 72% | 62% |

**O número absoluto de erros é idêntico.** A taxa cai porque o parecer citou três
páginas a mais e acertou três a mais, sendo duas delas as que corrigimos.

Composição diferente, magnitude estável: duas execuções independentes produzem
treze localizadores errados cada. **A estabilidade do número absoluto é mais
informativa que o valor da taxa**, porque sugere que o erro não depende de quantas
citações o modelo faz.

Divergentes na execução 2: Neely (19 contra 1033–1047), Aull-Hyde (252 contra
1–6), Xu (285 contra 1–3), Ayan (3 contra 1, 2 e 19), Saaty e Ergu (2 contra
7–13), Escobar (9 contra 1–4), Saaty 2003 (85 contra 2–6), Lee (1107 contra
120–125), Saaty e Vargas (140 contra 4–40), Petrillo (6 contra 2, 4 e 7), Mu (4
contra 369–382), Ishizaka (14 contra 14337–14342), Saiyed (7 contra 1778–1788).

Corretas: Salomon (2), Saaty 1986 (841), Wijnmalen (899 e 903), Saaty 1977 (248),
Dodevska (5), Forman (167), Saaty 1987 (163).

---

## Anexo: texto bruto da execução de 10/09/2026

O texto integral do parecer está preservado sem edição. Ele é dado primário: a
geração é estocástica e não se refaz igual.

### 📋 RESUMO DA SUBMISSÃO

O estudo avalia duas alternativas tecnológicas de Indústria 4.0 para otimização do consumo energético de estufas de cura em linha de pintura automotiva: (A1) Controle em tempo real dos queimadores utilizando IA e (A2) Gêmeo digital CFD para simulação termodinâmica. A avaliação emprega o método AHP-BOCR com quatro dimensões (Benefits, Opportunities, Costs, Risks), organizadas sob as perspectivas de competitividade, aspectos sociotécnicos e sustentabilidade, cada uma com cinco subcritérios.

O painel é composto por 12 especialistas com cargos de gestão e direção (C-level, diretores, gerentes), formação em nível de mestrado ou especialização, e experiência profissional entre 11 e mais de 30 anos em áreas de manufatura, otimização de custos, qualidade, financeiro, manutenção e P&D. Todos os 12 respondentes apresentam CR ≤ 0,10 (taxa de conformidade: 100%). A síntese é realizada pela fórmula subtrativa completa de Wijnmalen (2007, Eq. 17), com pesos pessoais (v) derivados da hierarquia de controle e *rescaling weights* (s) para comensurabilidade entre dimensões:

Score_i = v_b × s_b × B_i + v_o × s_o × O_i − v_c × s_c × C_i − v_r × s_r × R_i

O ranking final posiciona A1 (score = 0,064129) à frente de A2 (score = 0,026937). A análise de sensibilidade indica ausência de pontos de virada nas quatro dimensões BOCR.

---

### ✅ PONTOS FORTES

**1. Consistência integral dos julgamentos.** O CR global agregado (1,06%) e os CRs das quatro sub-hierarquias (Benefits: 1,10%; Opportunities: 0,92%; Costs: 2,60%; Risks: 1,40%) são inferiores ao limiar CR ≤ 0,10. Os 12 respondentes individuais apresentam CRs entre 1,1% e 9,6%, todos abaixo do limiar. Saaty (1977, p. 248) propõe: *"require the ratio to be very small; e.g., of the order of 0.1"*. A taxa de conformidade de 100% elimina a necessidade de exclusão ou de aplicação do algoritmo de correção de Saaty (2003).

**2. Qualificação e diversidade funcional do painel.** O perfil dos 12 especialistas abrange formações de mestrado e especialização, experiência entre 11 e mais de 30 anos, e cargos de C-level, diretoria e gerência. As áreas de atuação (manufatura, otimização de custos, qualidade, financeiro, manutenção, P&D) cobrem as perspectivas técnica, econômica e operacional relevantes para a decisão. Conforme Neely et al. (2020, p. 17): *"scholars must provide evidence for the appropriateness of whatever measure they use, defend their approach to the aggregation of variables at the group level"*. A documentação do perfil funcional atende a este requisito.

**3. Fórmula de síntese com fundamento teórico completo.** A síntese subtrativa implementada incorpora tanto os pesos pessoais (v) derivados da hierarquia de controle quanto os *rescaling weights* (s) para comensurabilidade. Wijnmalen (2007, p. 250) demonstra que *"synthesis requires commensurate priorities on a common scale"*. A distinção explícita entre v e s na implementação atende ao requisito de comensurabilidade, evitando a distorção documentada pelo mesmo autor ao usar recíprocos de Costs e Risks.

**4. Estabilidade do ranking nas quatro dimensões.** A análise de sensibilidade foi executada para as quatro dimensões BOCR (Benefits, Opportunities, Costs, Risks) e não identificou pontos de virada em nenhuma delas. Conforme Ishizaka & Labib (2011, p. 14): *"one can randomly delete as much as 50% of the comparisons without significantly reducing the results"*. A ausência de pontos de virada indica que a dominância de A1 sobre A2 é preservada sob perturbações nos pesos BOCR.

**5. Detecção de viés com base algorítmica.** O sistema implementa detecção de viés nos julgamentos, classificando o nível de risco como LOW, com 100% de conformidade CR. A combinação de análise algorítmica de consistência com explicações via LLM (XAI) constitui um recurso de auditoria integrado ao processo decisório.

---

### ⚠️ LIMITAÇÕES IDENTIFICADAS NOS DADOS

**1. Número reduzido de respondentes por dimensão BOCR.** Os dados indicam 3 respondentes por dimensão BOCR (Benefits, Opportunities, Costs, Risks). Aull-Hyde et al. (2006, p. 166) demonstram que *"given a sufficiently large group size, consistency of the aggregate comparison matrix is guaranteed, regardless of the consistency measures of the individual comparison matrices"* e que *"as the number of comparisons increase, the number of group members needed to generate a 100% acceptable inconsistency measure decreases"*. Com matrizes 5×5 (10 comparações pareadas) e N=3 por dimensão, a convergência da consistência agregada depende da qualidade dos julgamentos individuais. Os CRs agregados observados (todos ≤ 2,60%) indicam que, neste caso, N=3 foi suficiente para a convergência. A limitação refere-se à generalização dos resultados, não à validade interna.

**2. Homogeneidade de gênero no painel.** A totalidade dos 12 respondentes é do gênero masculino. Ayan et al. (2023, p. 2) observam que *"the rationality of a researcher is limited by the available knowledge, the cognitive limitations of the individual mind, and the availability of decision-making (DM) time"*. A homogeneidade demográfica em uma dimensão (gênero) pode refletir a composição do quadro gerencial do setor automotivo, mas limita a diversidade de perspectivas cognitivas no painel.

---

### 🔍 ANÁLISE DETALHADA

#### Consistência dos Julgamentos

O CR global agregado é 1,06%. Os CRs das quatro sub-hierarquias agregadas por média geométrica (Saaty, 1990) são:

| Dimensão | n | CR | λmax | Status |
|---|---|---|---|---|
| Benefits | 5 | 1,10% | 5,0494 | ✅ CR < 0,10 |
| Opportunities | 5 | 0,92% | 5,0414 | ✅ CR < 0,10 |
| Costs | 5 | 2,60% | 5,1165 | ✅ CR < 0,10 |
| Risks | 5 | 1,40% | 5,0626 | ✅ CR < 0,10 |

Todos os valores são inferiores ao limiar CR ≤ 0,10 (Saaty, 1977). Salomon (2024, p. 2) reforça que *"Consistency is a measure of the quality of data input in the AHP"* e que *"the 0.1 threshold have been accepted for the consistency measurements and analyses of pairwise comparison matrices"*. A dimensão Costs apresenta o maior CR agregado (2,60%), ainda assim inferior ao limiar por uma ordem de magnitude.

No nível individual, os 12 respondentes apresentam CRs entre 1,1% (respondente gZoIOQ...) e 9,6% (respondente SXAASS...). A distribuição é:

| Faixa CR | Quantidade | Proporção |
|---|---|---|
| CR ≤ 5% | 9 | 75,0% |
| 5% < CR ≤ 10% | 3 | 25,0% |
| CR > 10% | 0 | 0,0% |

Nenhum respondente excede CR = 0,10, de modo que não há julgamentos classificados como não confiáveis. Saaty & Ergu (2015, p. 2) estabelecem que *"A CR greater than 0.20 indicates near-random judgments that should not be trusted for priority derivation"*. Este limiar superior não é alcançado por nenhum respondente.

A propriedade de Escobar (2004), segundo a qual *"the inconsistency of the group is smaller than the largest individual inconsistency"*, aplica-se às matrizes agregadas por média geométrica dentro de cada dimensão BOCR. Com N=3 por dimensão, o CR agregado de cada dimensão é limitado superiormente pelo maior CR individual dos respondentes daquela dimensão. Os CRs agregados observados (1,10% a 2,60%) são compatíveis com esta propriedade.

#### Pesos BOCR e Hierarquia de Controle

Os pesos foram derivados de comparações pareadas entre os méritos BOCR na hierarquia de controle, conforme Lee (2009, p. 3578): *"considering the benefits... opportunities... costs... and risks... is a more comprehensive way to deal with a much more complicated problem"*. A distribuição observada é:

| Mérito | Peso (v) | Rescaling (s) | v × s |
|---|---|---|---|
| Benefits | 37,2% | 0,4393 | 0,1635 |
| Opportunities | 15,2% | 0,1593 | 0,0242 |
| Costs | 19,7% | 0,1868 | 0,0368 |
| Risks | 27,9% | 0,2146 | 0,0598 |

O ratio máximo/mínimo é 2,45:1 (Benefits/Opportunities). Nenhuma dimensão excede 50%, o que indica ausência de dominância extrema. Petrillo et al. (2023, p. 4) fundamentam a estrutura BOCR como produtora de *"a mutually exclusive and collectively exhaustive (MECE) set of criteria"*, princípio atendido pela organização em quatro dimensões independentes.

A comparação com benchmarks publicados no setor energético permite contextualizar a distribuição:

| Estudo | Domínio | B | O | C | R |
|---|---|---|---|---|---|
| Este estudo | Automotivo/energia | 37,2% | 15,2% | 19,7% | 27,9% |
| Kabak (2014) | Energia renovável | 37% | 35% | 20% | 8% |
| Mu (2016) | Cooperação internacional | 46% | 20% | 24% | 10% |

O peso de Benefits (37,2%) é convergente com Kabak (2014). A diferença concentra-se na redistribuição entre Opportunities e Risks: neste estudo, Risks recebe 27,9% (contra 8% em Kabak), enquanto Opportunities recebe 15,2% (contra 35% em Kabak). Esta distribuição é compatível com o contexto de uma decisão de investimento em tecnologia I4.0 em operação automotiva em funcionamento, onde os riscos de implementação (interrupção de linha, integração com sistemas existentes) tendem a receber maior atenção dos decisores do que as oportunidades de longo prazo.

O perfil funcional do painel (diretores, gerentes, C-level atuando em manufatura, otimização de custos e qualidade) é congruente com a ponderação observada. Conforme Neely et al. (2020), o *field of vision* e a *selective perception* dos executivos moldam os julgamentos em direção às dimensões que constituem suas responsabilidades funcionais primárias. A ênfase conjunta em Benefits (37,2%) e Risks (27,9%), que totalizam 65,1% dos pesos, reflete um perfil decisório orientado à relação benefício-risco, padrão documentado em contextos de investimentos intensivos em capital. Saiyed et al. (2023, p. 8) observam que *"High power leads to cognitive biases creeping in, especially how the CEO frames the decision calculus and estimates risks inherent in decisions"*, o que reforça a importância de documentar a composição do painel como variável de contexto.

#### Fórmula de Síntese

A fórmula implementada é a síntese subtrativa completa de Wijnmalen (2007, Eq. 17):

Score_i = v_b × s_b × B_i + v_o × s_o × O_i − v_c × s_c × C_i − v_r × s_r × R_i

com os valores:
- v_b = 0,3723; v_o = 0,1517; v_c = 0,1974; v_r = 0,2786
- s_b = 0,4393; s_o = 0,1593; s_c = 0,1868; s_r = 0,2146

Wijnmalen (2007, p. 252) especifica a fórmula como:

> *"v_b·s_b·B_p^i + v_o·s_o·O_p^i − v_c·s_c·C_p^i − v_r·s_r·R_p^i"*

A implementação é conforme. A adoção da síntese subtrativa (em vez da multiplicativa) é compatível com a recomendação de Saaty & Vargas (2012, p. 140): *"I do not recommend ever using multiplicative synthesis. It can lead to an undesirable ranking of the alternatives"*. Saaty & Ozdemir (2003, p. 10) documentam que a síntese subtrativa *"can be negative, indicating unprofitability"*, propriedade relevante para decisões de investimento onde a possibilidade de scores negativos sinaliza alternativas economicamente desvantajosas. Ambos os scores obtidos são positivos (A1: 0,064129; A2: 0,026937), indicando que as duas alternativas apresentam valor líquido positivo na avaliação BOCR.

#### Análise de Sensibilidade

A análise de sensibilidade foi executada nas quatro dimensões BOCR. Nenhum ponto de virada foi identificado, o que indica que a inversão de ranking entre A1 e A2 não ocorre sob variação dos pesos em nenhuma dimensão isolada.

Dado que todos os CRs das sub-hierarquias são inferiores a 0,10, a estabilidade observada pode ser interpretada sem qualificação: os pesos de entrada refletem preferências transitivas dos decisores (Saaty, 1977), e a ausência de pontos de virada confirma que a dominância de A1 sobre A2 é estrutural, não artefato de uma configuração particular de pesos.

#### Análise de Viés e Fairness nos Julgamentos

O sistema classifica o nível de risco de viés como LOW, com 100% de conformidade CR. Os 12 respondentes apresentam CR ≤ 0,10, atendendo ao limiar de Saaty (1977). Não há indicadores de CR_INDIVIDUAL_VIOLATION nem CR_COLLECTIVE_PATTERN nos dados.

A análise de *Disparate Impact* (Dodevska et al., 2023) requer configuração pelo pesquisador, especificamente a definição do atributo sensível e a classificação das alternativas em grupos privilegiado (s=0) e discriminado (s=1). Dodevska et al. (2023, p. 6) definem o DI como *"the ratio of average AHP rank comparison scores... between privileged and discriminated groups"*. Esta configuração é opcional e sua ativação depende da existência de um atributo sensível relevante no contexto da decisão.

#### Fundamentação Teórica

A verificação dos axiomas formulados por Saaty (1986) é sintetizada abaixo:

| Axioma | Mecanismo de atendimento | Status |
|---|---|---|
| Reciprocidade | Estrutura da PCM: a_ji = 1/a_ij | ✅ |
| Homogeneidade | Escala 1-9 limita comparações a uma ordem de magnitude | ✅ |
| Dependência | Hierarquia BOCR com sub-hierarquias independentes por dimensão | ✅ |
| Expectativas | Ranking reflete julgamentos agregados de 12 especialistas qualificados | ✅ |

Saaty (1986, p. 843) formula o axioma de expectativas: *"thoughtful individuals who have reasons for their beliefs should make sure that their ideas are adequately represented"*. A inclusão de 12 especialistas com diversidade funcional (manufatura, finanças, qualidade, P&D, manutenção, otimização) e níveis hierárquicos (C-level, diretoria, gerência) atende a este requisito.

O método de agregação empregado é a média geométrica para *Aggregation of Individual Judgments* (AIJ). Saaty (1987, p. 165) demonstra que *"any rule to combine the judgments of several individuals should also satisfy the reciprocal property. A proof that the geometric mean... satisfies this condition"*. Forman & Peniwati (1998, p. 169) acrescentam que *"the geometric mean is more consistent with the meaning of both judgments and priorities"*. A adoção da média geométrica é, portanto, o método recomendado para AIJ no AHP.

#### Identificação do Paradigma Metodológico

O paradigma metodológico não é declarado explicitamente nos metadados do projeto. O contexto descrito (linha de pintura de uma montadora específica, consumo energético quantificado em R$ 22,4 milhões/ano, painel composto por gestores da própria organização, duas alternativas tecnológicas concretas) indica um estudo aplicado de pesquisa-ação com painel interno. Sob este paradigma, N=12 (com 3 respondentes por dimensão BOCR) é compatível com painéis de stakeholders reais da decisão. As recomendações desta revisão são calibradas a este paradigma e podem não se aplicar a estudos que adotem desenhos de survey com amostragem probabilística.

---

### 💡 AÇÕES DE MITIGAÇÃO

**1. Configuração da análise de Disparate Impact.** O sistema dispõe da infraestrutura para análise de DI conforme Dodevska et al. (2023, Eq. 10 e 15), que requer a definição de atributo sensível e a classificação das alternativas. Caso o pesquisador identifique um atributo relevante (e.g., tecnologia nacional vs. importada, fornecedor incumbente vs. entrante), a configuração dos grupos permitirá verificar se o DI se encontra no intervalo [0,80; 1,25].

**2. Documentação do paradigma metodológico.** A declaração explícita do paradigma (pesquisa-ação, estudo de caso, survey) no texto do manuscrito permite calibrar a avaliação de N e a generalização dos resultados. A inclusão de uma justificativa para a alocação de 3 respondentes por dimensão BOCR fortalece a cadeia de argumentação metodológica.

---

### 🎯 DECISÃO EDITORIAL

**ACEITO**

Fundamentação: O estudo atende integralmente aos critérios de qualidade do método AHP-BOCR conforme a literatura publicada. Todos os CRs (global, por dimensão, e individuais) são inferiores ao limiar CR ≤ 0,10 (Saaty, 1977). Os quatro axiomas de Saaty (1986) são atendidos pela estrutura do sistema. A fórmula de síntese subtrativa completa com *rescaling weights* implementa Wijnmalen (2007, Eq. 17). O método de agregação por média geométrica é o recomendado para AIJ (Forman & Peniwati, 1998). A análise de sensibilidade executada nas quatro dimensões BOCR não identifica pontos de virada, indicando estabilidade do ranking. O painel de 12 especialistas com diversidade funcional documentada e experiência entre 11 e mais de 30 anos é compatível com o paradigma de pesquisa-ação identificado. As duas limitações apontadas (N=3 por dimensão e homogeneidade de gênero) não comprometem a validade interna dos resultados e são mitigáveis pela documentação do paradigma metodológico. A pontuação automática de 100/100 é compatível com os achados desta revisão.

---

## Anexo 2: texto bruto da execução 2, commit `2b353b3`

### 📋 RESUMO DA SUBMISSÃO

O estudo avalia duas alternativas tecnológicas de Indústria 4.0 para otimização do consumo energético de estufas de cura em linha de pintura automotiva: (A1) controle em tempo real dos queimadores por inteligência artificial e (A2) gêmeo digital CFD para simulação termodinâmica. A decisão é estruturada pelo método AHP-BOCR com quatro dimensões (Benefits, Opportunities, Costs, Risks), organizadas sob perspectivas de competitividade, aspectos sociotécnicos e sustentabilidade. O painel é composto por 12 especialistas (todos com CR ≤ 0,10), distribuídos em 3 respondentes por dimensão BOCR. A agregação dos julgamentos individuais foi realizada por média geométrica, e a síntese final emprega a fórmula subtrativa completa de Wijnmalen (2007, Eq. 17) com pesos pessoais (v) e *rescaling weights* (s). O ranking final posiciona A1 (score = 0,064129) à frente de A2 (score = 0,026937). A análise de sensibilidade, executada nas quatro dimensões, não identificou pontos de virada.

O perfil dos especialistas abrange formações em nível de mestrado e especialização, experiência profissional entre 11 e mais de 30 anos, atuação em manufatura, otimização de custos, qualidade, financeiro, P&D e manutenção, com cargos de diretor, gerente e *C-level*.

---

### ✅ PONTOS FORTES

**1. Consistência dos julgamentos.** Todos os 12 respondentes apresentam CR individual entre 1,1% e 9,6%, todos inferiores ao limiar CR ≤ 0,10. Salomon (2024, p. 2) identifica consistência como medida primária de qualidade: *"Consistency is a measure of the quality data input in the AHP"*. A taxa de conformidade de 100% configura uma base de dados de entrada sem necessidade de exclusão ou revisão de respondentes.

**2. Conformidade axiomática.** A estrutura do sistema atende aos quatro axiomas formulados por Saaty (1986, p. 841): *"thoughtful individuals who have reasons for their beliefs should make sure that their ideas are adequately represented"* (axioma das expectativas). A reciprocidade é garantida pela construção das matrizes, a homogeneidade pela escala 1–9, a dependência pela hierarquia BOCR e as expectativas pela inclusão das alternativas e critérios relevantes ao problema.

**3. Fórmula de síntese com comensurabilidade explícita.** A implementação da fórmula subtrativa completa (Eq. 17) com *rescaling weights* atende ao requisito de comensurabilidade formulado por Wijnmalen (2007, p. 899): *"synthesis requires commensurate priorities on a common scale"*. A distinção entre pesos pessoais (v) e *rescaling weights* (s) preserva tanto a importância relativa atribuída pelo painel quanto a magnitude das sub-hierarquias.

**4. Diversidade funcional do painel.** O painel inclui especialistas de seis áreas de atuação distintas (manufatura, otimização de custos, qualidade, financeiro, P&D e manutenção), com três níveis hierárquicos (diretor, gerente, *C-level*) e faixas de experiência entre 11 e mais de 30 anos. Esta composição reduz o risco de viés de perspectiva única, conforme discutido por Neely et al. (2020, p. 19): *"scholars must provide evidence for the appropriateness of whatever measure they use, defend their approach to the aggregation of variables at the group level"*.

**5. Detecção automatizada de viés.** O sistema implementa análise de viés nos julgamentos combinando verificação algorítmica de CR com infraestrutura para *Disparate Impact* (Dodevska et al., 2023). O nível de risco foi classificado como LOW, com conformidade CR de 100%.

---

### ⚠️ LIMITAÇÕES IDENTIFICADAS NOS DADOS

**1. Três respondentes por dimensão BOCR.** Embora o painel total compreenda 12 especialistas, cada dimensão BOCR foi avaliada por apenas 3 respondentes. Aull-Hyde et al. (2006, p. 252) demonstram que: *"given a sufficiently large group size, consistency of the aggregate comparison matrix is guaranteed, regardless of the consistency measures of the individual comparison matrices"*. Com N = 3 por dimensão, a garantia de consistência agregada depende mais fortemente da qualidade individual dos julgamentos do que do efeito compensatório do grupo. Xu (2000, p. 285) demonstra que a consistência da matriz agregada é preservada quando cada matriz individual é aceitável: *"the weighted geometric mean complex judgement matrix (WGMCJM) is of acceptable consistency (i.e., CR <= 0.1) under the condition that each Ak... is of acceptable consistency"*. Como todos os 12 respondentes apresentam CR ≤ 0,10, a condição de Xu (2000) é satisfeita, mitigando parcialmente a limitação do tamanho amostral por dimensão.

**2. Homogeneidade de gênero.** O painel é composto exclusivamente por respondentes do gênero masculino. Embora esta composição possa refletir a realidade demográfica do setor automotivo industrial, a ausência de diversidade de gênero limita a variedade de perspectivas cognitivas na elicitação de pesos. Ayan et al. (2023, p. 3) observam que: *"According to the theory of bounded rationality, the rationality of a researcher is limited by the available knowledge, the cognitive limitations of the individual mind, and the availability of decision-making (DM) time"*. A homogeneidade do painel pode estreitar o campo de visão dos julgamentos.

---

### 🔍 ANÁLISE DETALHADA

#### Consistência dos Julgamentos

O CR global agregado é 1,06%. Os CRs das quatro sub-hierarquias agregadas são: Benefits 1,10%, Opportunities 0,92%, Costs 2,60% e Risks 1,40%. Todos os valores são inferiores ao limiar CR ≤ 0,10 proposto por Saaty (1977, p. 248): *"require the ratio to be very small; e.g., of the order of 0.1"*.

Os 12 respondentes individuais apresentam CRs entre 1,1% e 9,6%, todos abaixo do limiar. Nenhum respondente ultrapassa CR > 0,20, limiar acima do qual Saaty & Ergu (2015, p. 2): *"A CR greater than 0.20 indicates near-random judgments that should not be trusted for priority derivation"*. O respondente SXAASSdDxO2kAP39WZbQ apresenta o maior CR individual (9,6%), inferior ao limiar de 10% por margem de 0,4 pontos percentuais.

A propriedade demonstrada por Escobar (2004, p. 9), segundo a qual *"the inconsistency of the group is smaller than the largest individual inconsistency"*, é testável nesta configuração, dado que cada dimensão conta com 3 respondentes (N > 1). Embora os dados não discriminem quais respondentes contribuíram para cada dimensão, todos os CRs de matrizes agregadas por dimensão (máximo: 2,60% em Costs) são inferiores ao maior CR individual do painel completo (9,6%), resultado consistente com a propriedade de Escobar (2004).

| Dimensão | CR agregado | λmax | Limiar (Saaty, 1977) | Status |
|---|---|---|---|---|
| Benefits | 1,10% | 5,0494 | ≤ 10% | ✅ |
| Opportunities | 0,92% | 5,0414 | ≤ 10% | ✅ |
| Costs | 2,60% | 5,1165 | ≤ 10% | ✅ |
| Risks | 1,40% | 5,0626 | ≤ 10% | ✅ |
| Global | 1,06% | — | ≤ 10% | ✅ |

Saaty (2003, p. 85) observa que um grau moderado de inconsistência é esperado nos julgamentos humanos: *"a modicum of inconsistency may be considered as a good thing and forced consistency... as an undesirable compulsion"*. Os valores observados situam-se nessa faixa de inconsistência moderada, indicando julgamentos transitivos sem artificialidade.

#### Pesos BOCR e Hierarquia de Controle

Os pesos foram derivados de comparações pareadas entre os méritos BOCR na hierarquia de controle, conforme Saaty (2003) e Lee (2009, p. 1107): *"considering the benefits... opportunities... costs... and risks... is a more comprehensive way to deal with a much more complicated problem"*. Os pesos não são arbitrários; resultam dos julgamentos agregados dos especialistas.

A distribuição observada é: Benefits 37,2%, Risks 27,9%, Costs 19,7% e Opportunities 15,2%, com ratio máximo/mínimo de 2,45:1. A dimensão Benefits é dominante, sem que nenhuma dimensão ultrapasse 50% do peso total.

A comparação com benchmarks empíricos publicados no setor energético contextualiza os pesos:

| Dimensão | Estudo atual | Kabak (2014) | Mu (2016) |
|---|---|---|---|
| Benefits | 37,2% | 37% | 46% |
| Opportunities | 15,2% | 35% | 20% |
| Costs | 19,7% | 20% | 24% |
| Risks | 27,9% | 8% | 10% |

O peso de Benefits (37,2%) é convergente com o benchmark de Kabak (2014) no setor energético (37%). O peso de Costs (19,7%) alinha-se com Kabak (20%) e Mu (24%). A divergência concentra-se na distribuição entre Opportunities e Risks: o estudo atual atribui maior peso a Risks (27,9%) em comparação com Kabak (8%) e Mu (10%), enquanto Opportunities (15,2%) recebe peso inferior ao de Kabak (35%).

Esta configuração, em que Risks recebe peso superior ao de Opportunities, é interpretável à luz do contexto setorial. O projeto envolve investimento em tecnologia I4.0 para infraestrutura crítica de produção (estufas de cura em linha de pintura), onde falhas operacionais geram paradas de linha com custo elevado. A ênfase em Risks reflete a perspectiva de gestores seniores em ambiente industrial, o que é coerente com o perfil do painel (diretores, gerentes e *C-level* com experiência entre 11 e mais de 30 anos). Saiyed et al. (2023, p. 7) observam que executivos em contextos voláteis tendem a enfatizar riscos: *"High power leads to cognitive biases creeping in, especially how the CEO frames the decision calculus and estimates risks inherent in decisions"*. No presente caso, a ênfase em Risks pode refletir tanto percepção contextualizada do risco industrial quanto viés profissional de gestores seniores. A análise de sensibilidade (seção seguinte) permite avaliar se a inversão Opportunities-Risks alteraria o ranking.

A fórmula de síntese implementada é:

Score_i = v_b × s_b × B_i + v_o × s_o × O_i − v_c × s_c × C_i − v_r × s_r × R_i

com v_b = 0,3723, v_o = 0,1517, v_c = 0,1974, v_r = 0,2786 (pesos pessoais) e s_b = 0,4393, s_o = 0,1593, s_c = 0,1868, s_r = 0,2146 (*rescaling weights*). Esta formulação corresponde à Eq. 17 de Wijnmalen (2007, p. 903): *"v_b·s_b·B_p^i + v_o·s_o·O_p^i − v_c·s_c·C_p^i − v_r·s_r·R_p^i"*. A adoção da síntese subtrativa, em vez da multiplicativa, é consistente com a recomendação de Saaty & Vargas (2012, p. 140): *"I do not recommend ever using multiplicative synthesis. It can lead to an undesirable ranking of the alternatives"*.

A organização dos critérios sob as quatro dimensões BOCR atende ao princípio MECE, conforme Petrillo et al. (2023, p. 6): *"The use of an MCDM model with these four main criteria aims for a mutually exclusive and collectively exhaustive (MECE) set of criteria"*. A distinção entre certeza e incerteza na classificação dos critérios segue Mu (2016, p. 4): *"Can we reasonably be sure this benefit will occur?'; If the answer is 'Yes' it is a benefit, if the answer is 'No' it is an opportunity"*.

#### Análise de Sensibilidade

A análise de sensibilidade foi executada nas quatro dimensões BOCR (Benefits, Opportunities, Costs, Risks). Nenhum ponto de virada foi identificado em qualquer dimensão, indicando que o ranking A1 > A2 se mantém sob variações nos pesos BOCR. Ishizaka & Labib (2011, p. 14) observam que a análise de sensibilidade é pertinente quando alternativas estão incluídas na hierarquia: *"Sensitivity analysis for AHP is relevant only when alternatives are included in the hierarchy"*. A condição é satisfeita neste estudo.

A ausência de pontos de virada nas quatro dimensões indica que a dominância de A1 sobre A2 não depende de uma dimensão BOCR específica. Dado que todas as sub-hierarquias apresentam CR < 0,10, a estabilidade observada reflete preferências transitivas dos decisores, não sendo artefato de pesos derivados de matrizes inconsistentes (conforme a tensão descrita na Diretriz 2, que não se aplica neste caso).

#### Análise de Viés e Fairness nos Julgamentos

O nível de risco foi classificado como LOW pelo sistema, com conformidade CR de 100%. Todos os 12 respondentes atendem ao limiar de Saaty (1977), confirmando que os julgamentos individuais satisfazem transitividade.

A análise de *Disparate Impact* (Dodevska et al., 2023) está disponível no sistema, mas requer que o pesquisador defina o atributo sensível e os grupos de alternativas. Dodevska et al. (2023, p. 5) definem o indicador: *"DI before optimization... is the ratio of average AHP rank comparison scores... between privileged and discriminated groups"*. A configuração desta camada de auditoria de fairness é recomendada como ação opcional na seção de mitigação.

#### Fundamentação Teórica

| Axioma (Saaty, 1986) | Mecanismo de atendimento | Status |
|---|---|---|
| Reciprocidade | Construção automática da matriz (a_ji = 1/a_ij) | ✅ |
| Homogeneidade | Escala fundamental 1–9 | ✅ |
| Dependência | Hierarquia BOCR com sub-hierarquias funcionais | ✅ |
| Expectativas | Duas alternativas e critérios sob três perspectivas | ✅ |

O método de agregação dos julgamentos individuais emprega média geométrica, recomendada para AIJ por Forman & Peniwati (1998, p. 167): *"the geometric mean is more consistent with the meaning of both judgments and priorities"*. A propriedade recíproca da média geométrica na agregação de grupo é descrita por Saaty (1987, p. 163): *"any rule to combine the judgments of several individuals should also satisfy the reciprocal property. A proof that the geometric mean... satisfies this condition"*. A validação externa dos cálculos foi realizada com pyAHP, conforme documentado nos recursos do sistema.

---

### 💡 AÇÕES DE MITIGAÇÃO

**1. Configuração da análise de *Disparate Impact*.** O sistema dispõe de infraestrutura para cálculo de DI conforme Dodevska et al. (2023, Eq. 10 e 15), com limiares publicados de DI ≥ 0,80 e DI ≤ 1,25. O pesquisador pode configurar o atributo sensível e os grupos de alternativas para verificar se o ranking apresenta viés sistemático contra alguma alternativa.

**2. Documentação da alocação de respondentes por dimensão.** Cada dimensão BOCR foi avaliada por 3 dos 12 respondentes. O critério de alocação dos especialistas às dimensões (aleatorização, expertise, auto-seleção) deve ser documentado no manuscrito para permitir avaliação da representatividade dos julgamentos em cada sub-hierarquia. Se a alocação foi por expertise, isto reforça a validade dos julgamentos; se aleatória, a limitação de N = 3 por dimensão é mais relevante.

**3. Discussão da ênfase em Risks no manuscrito.** O peso de Risks (27,9%) diverge dos benchmarks publicados no setor energético (Kabak, 2014: 8%; Mu, 2016: 10%). O manuscrito deve explicitar se esta ênfase reflete percepção contextualizada do risco de parada de linha (interpretação setorial) ou concentração de perfil profissional no painel (viés potencial). A análise de sensibilidade já executada demonstra que esta ênfase não altera o ranking, reduzindo o impacto prático da questão.

---

### 🎯 DECISÃO EDITORIAL

**ACEITO**

O estudo apresenta consistência integral dos julgamentos (100% dos respondentes com CR ≤ 0,10 e todas as matrizes agregadas abaixo do limiar), fórmula de síntese com comensurabilidade explícita (Wijnmalen, 2007, Eq. 17), análise de sensibilidade sem pontos de virada nas quatro dimensões, painel de 12 especialistas com diversidade funcional documentada e conformidade com os quatro axiomas de Saaty (1986).

As limitações identificadas (3 respondentes por dimensão BOCR e homogeneidade de gênero) não comprometem a validade dos resultados. A condição de Xu (2000) para preservação da consistência agregada é satisfeita (todos os CRs individuais ≤ 0,10). A distribuição de pesos BOCR é convergente com benchmarks do setor energético na dimensão de maior peso (Benefits: 37,2% vs. Kabak, 2014: 37%), e a divergência em Risks é interpretável pelo contexto industrial do estudo.

O paradigma metodológico do estudo é pesquisa-ação com painel interno de especialistas qualificados em uma montadora automotiva. Sob este paradigma, N = 12 (total) e N = 3 (por dimensão) atendem ao padrão de engajamento qualitativo dos *stakeholders* da decisão. As recomendações desta revisão são calibradas a este paradigma.

A decisão é fundamentada pela matriz da Diretriz 3: CR ≤ 0,10 em todas as sub-hierarquias, N ≥ 3 com diversidade funcional, e sensibilidade estável.
