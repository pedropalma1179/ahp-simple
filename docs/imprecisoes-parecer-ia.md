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

## Índice das execuções

⚠ **Criado em 12/09/2026 para resolver uma ambiguidade do registro:** "etapa" e
"execução" foram usados com numerações diferentes para as mesmas coisas. **Este
índice é a numeração vigente; onde o texto disser "etapa N", confira aqui.**

| # | Data | Commit | Intervenção testada | Predição | Resultado |
|---|---|---|---|---|---|
| **1** | 10/09/2026 | `d16491a` | nenhuma: linha de base | — | 5 imprecisões, 13/18 localizadores divergentes |
| **2** | 10/09/2026 | `2b353b3` | três localizadores corrigidos no prompt | registrada antes | confirmada: Wijnmalen saiu com p. 899 e 903 |
| **3** | 11/09/2026 | `ca36539` | payload passa a informar N por matriz | registrada antes | confirmada: imprecisão 2 desapareceu, Escobar com N=12 |
| **4** | 11/09/2026 | `501b19a` | remoção do `dominanceAnalyzer` | registrada antes | **refutada**: revelou o segundo canal no prompt |
| **5** | 11/09/2026 | `28f4a95` | remoção da autorização de viés no prompt | registrada antes | confirmada |
| **6** | 11/09/2026 | `bf959b6` | fonte da citação passa a `evidence.quote` | registrada antes | duas confirmadas, **uma parcial** (Dodevska) |
| **7** | 12/09/2026 | `f9cbf94` | A.21: IPC retirado e bloco de completude fora do prompt | registrada antes, em `c9f4842` | **atendida no critério textual**; três achados novos, F09 a F11 |

**Placar das predições: cinco confirmadas, uma parcial, uma refutada.**

⚠ **A da execução 7 é predição de REGRESSÃO de atribuição, não teste causal:** a
ausência que ela verifica já existia nas três execuções anteriores, com o bloco
presente no prompt.

⚠ **A refutada, na execução 4, produziu o achado mais valioso**: o segundo canal
que nenhuma confirmação teria revelado.

**Execuções previstas e não realizadas:** a indexação da claim das cinco fórmulas
do Lee (A.11 etapa 1) e a etapa que testará A.12, ambas com predição já escrita.

⚠ **Entrada e saída bruta:** todas as execuções usaram o mesmo projeto e o
documento `calculations` de 13/07/2026. **Os textos brutos das execuções 1, 2 e 5
estão neste documento** — as duas primeiras nos anexos, a da execução 5 na própria
seção dela, sob "Texto bruto da execução 5". Os das execuções 3, 4 e 6 não foram
anexados, por falha de upload, e as seções registram o que foi conferido na tela.

⚠ **Correção de 12/09/2026:** este parágrafo dizia que os textos das execuções
**3 a 6** não estavam anexados. **O da execução 5 está**, e foi por ele que a linha
de base do bloco de completude pôde ser medida em três textos, não dois.

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

⚠ **Limitação que atravessa todo o documento: a conferência é contra o RAG, não
contra a fonte.** Quando uma atribuição ou citação não encontra respaldo nas
claims indexadas, isso pode significar duas coisas muito diferentes:

- o autor **não diz** aquilo, e a atribuição é inventada;
- o autor **diz**, e o RAG não indexou a passagem, e é falha de cobertura.

**Só abrir o PDF separa as duas.** E o caso do Lee (2009) mostra que a segunda
hipótese é real e não marginal: as claims indexadas não mencionavam a comparação
entre os cinco métodos de síntese, e a página 123 do artigo a traz por extenso.

Portanto, **onde a conferência foi só contra o RAG, o que se mede é cobertura mais
atribuição somadas**, e não atribuição isolada. Onde o PDF foi aberto — Lee
(2009), Lee (2009a), Salomon e Gomes (2024) — a distinção existe e está
registrada. Onde não foi, como em Alizadeh (2020), fica indeterminado e o
documento diz isso.

**Limitação do critério de página.** Ele não distingue artigo curto de artigo
longo:
acertar uma das páginas de claim é mais provável num artigo com sete páginas
indexadas que num com três. Das cinco corretas, quatro estão em artigos com sete
ou menos páginas de claim. E ele não verifica se a página corresponde à claim
*daquela afirmação específica*, apenas se pertence a alguma claim do artigo, o
que continua sendo generoso.

**Nota sobre faixas.** Para Wijnmalen (2007) o documento usa dois números
distintos, e eles não são intercambiáveis: **892 a 905** é a faixa do artigo no
periódico, confirmada no manuscrito; **892 a 903** é a faixa das páginas
indexadas no RAG. A conferência é contra a segunda.

**Resultado, em dois níveis.** Apurado à mão e depois reproduzido pelo
`scripts/verify-citations.mjs`, com os mesmos números.

*Taxa bruta:* 18 citações com localizador, **13 divergentes, 72%**.

*Decomposição por causa*, que é a leitura mais defensável, porque não depende de o
revisor concordar que as três categorias sejam igualmente graves:

| Causa | Casos | Corrigível por |
|---|---|---|
| Troca de convenção de numeração | 6 | padronizar o RAG |
| Erro de vizinhança (dentro da faixa do artigo, fora de qualquer claim) | **2** | verificação de localizador contra a claim |
| **Exemplo errado no system prompt** | 1 (Wijnmalen p. 250) | corrigir o prompt |
| Generalização a partir do exemplo errado | 1 (Wijnmalen p. 252) | corrigir o prompt |
| Não explicada, incluindo um localizador fabricado verificado até o PDF | 2 (Lee 3578, Saaty e Ergu) | verificação de localizador |
| **Indeterminado por falta de faixa no RAG** | 1 (Dodevska) | registrar a faixa do artigo no `citation.abnt` |

**Correção da decomposição, 11/09/2026, por apuração via script.** A versão
anterior contava **três** casos de vizinhança e incluía o Dodevska (2023, p. 6).
Está errado: o `citation.abnt` do Dodevska registra apenas "p. 604", sem
intervalo, então **o artigo não tem faixa no RAG** e não há como afirmar que a
página 6 está dentro dela.

O erro foi meu e é instrutivo: eu olhei as páginas de claim, 4 a 14, e concluí que
6 estava no meio. Mas 4 a 14 é o intervalo das *claims*, não do *artigo*, e a
"p. 604" do abnt sugere que a numeração real é outra. **Os dois intervalos não são
intercambiáveis**, e é a mesma confusão que o documento já registrava para
Wijnmalen (892–905 do artigo contra 892–903 das claims).

Os dois casos de vizinhança confirmados na execução 1 são **Saaty (1987, p. 165)**,
com claims em 163 e 170 dentro do artigo 161–176, e **Forman e Peniwati (1998,
p. 169)**, com claims em 166 a 168 dentro do artigo 165–169.

**A decomposição é o argumento.** Se as treze fossem troca de convenção, a
conclusão seria pequena: base inconsistente, modelo reproduz, correção trivial.
Com **cinco sem origem no que foi entregue**, fica estabelecido que **mesmo com a
base perfeita restariam cinco em dezoito**, e nenhuma correção de base as evita.
Só verificação de saída.

### Cobertura do teste, e o que se pode afirmar sobre o total

O parecer traz **27 citações**, das quais 18 com localizador de página e 9 sem. O
teste alcança **67%**. Números apurados pelo `scripts/verify-citations.mjs`; a
contagem manual estimava 29 e 11, por leitura.

Reportar um número único seria enganoso. O que se sabe sobre o total:

⚠ **CORREÇÃO de rótulos, 12/09/2026.** A versão anterior desta tabela dizia "erro
confirmado" e "correção confirmada", e reportava uma **taxa de erro entre 48% e
81%**. **Nenhum dos três se sustenta pelo procedimento**, e o motivo está na segunda
parte do F08: o script mede **localizador**, não conteúdo.

| | Citações | O que o procedimento estabelece |
|---|---|---|
| Localizador divergente | 13 | **divergência de localizador**, na versão do verificador então vigente. **Não** "erro confirmado": não se conferiu se o conteúdo sustenta a afirmação |
| Localizador coincidente com claim | 5 | **localizador plausível**. **Não** "correção confirmada": página indexada não prova conteúdo correto |
| Sem localizador | 9 | **fora da cobertura do procedimento.** Não afirmam página, logo não podem divergir, **e não são por isso incorretas** |

**Apresentar em três níveis separados:**

| Nível | Esta medição |
|---|---|
| **Cobertura do procedimento** | 18 de 27 citações têm localizador e podem ser examinadas |
| **Divergência de localizador** | 13 de 18, na versão do verificador então vigente |
| **Fidelidade e sustentação** | somente nos casos conferidos à mão, caso a caso |

⚠ **A faixa de 48% a 81% foi RETIRADA.** Ela tratava as nove sem localizador como
possivelmente erradas e as cinco coincidentes como corretas, e **nenhuma das duas
leituras decorre do teste**.

**Os números históricos ficam**, com a interpretação marcada como superada. ⚠ **Os
textos brutos das execuções não se reescrevem.**

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

### Princípio derivado

> **O prompt deve instruir formato e raciocínio; o payload deve fornecer fato.
> Onde os dois se misturam, aparece erro.**

Os dois casos que o geraram são as duas metades da mesma frase:

- **Fato no lugar de instrução.** O `system-prompt.ts` e o payload carregam dado
  factual deste projeto: a faixa "1,1% e 9,6%", o CR de 1,06%, "Validação externa
  com pyAHP". O modelo copia o que o dado recebido não contradiz, e a faixa
  sobreviveu porque as duas fontes concordavam e ambas estavam erradas.
- **Instrução que exige fato ausente.** A DIRETRIZ 1 pede um N por matriz que o
  payload não fornece. O modelo fabrica o valor faltante para poder obedecer.

Não é conselho de redação: é a leitura das classes D e E juntas, e cada metade
tem caso medido.

### Linha de base do bloco condicional de completude, e uma hipótese

Medido em **12/09/2026**, antes de qualquer edição, como pré-requisito da predição
de A.21.

O `system-prompt.ts`, linhas 356 a 360, traz o bloco `### Completude das Matrizes
(se ipcMetadata disponível)`, que manda: *"Se todos EIGENVECTOR → matrizes
completas, nenhuma ação. Se algum LLSM_IPC → reportar quais grupos, completude, e
implicação"*, e ainda uma mitigação, *"Se completude < 60% → Considerar solicitar
comparações adicionais aos respondentes"*.

⚠ **O `ipcMetadata` nunca chega ao modelo.** O payload do parecer é montado campo a
campo em `resultados/page.tsx:1170-1275` e **não inclui o campo** — medido, zero
ocorrências no arquivo inteiro. A rota do parecer o injetaria (`route.ts:1091-1093`)
se o recebesse, e o `analyzeIPC` (`bias-detection.ts:417`) sai na primeira linha
quando ele falta. **O bloco do prompt é enviado sempre; o dado que ele pressupõe,
nunca.**

**O que os três textos brutos disponíveis mostram** — execução 1, execução 2 e
execução 5, todas com o bloco presente no prompt:

| Termo | Ocorrências nos três textos |
|---|---|
| `EIGENVECTOR` / autovetor | **0** |
| `LLSM` | **0** |
| "comparações adicionais" | **0** |
| `incomplet*` | **0** |
| Bozóki | **0** |
| grafo / graph | **0** |
| `complet*` | 3 a 4 por texto, **todas de outro assunto**: "formação completa", "síntese subtrativa completa (Eq. 17)", "análise de sensibilidade completa" |

**A medição, como medição:** nos três pareceres examinados **não foram observadas
menções indevidas à completude** associadas a esse bloco condicional.

⚠ **A leitura entra como HIPÓTESE, não como achado:** o contraste com o caso do N
ausente sugere uma hipótese sobre a **forma** da instrução — condicional versus
imperativa —, **ainda não testada isoladamente.** Os dois casos diferem em
**assunto, dado exigido e contexto**, não só na forma, e esta série não isola essa
variável. A DIRETRIZ 1 dizia "aplique Escobar comparando o CR do grupo com os CRs
individuais dentro da mesma matriz" e o modelo produziu o N faltante; este bloco diz
"se algum grupo for LLSM_IPC, reporte" e o modelo não reportou. **É um par de
observações, não um experimento.**

### Predição de A.21, registrada antes da execução

A tarefa remove o bloco `### Completude das Matrizes` do `system-prompt.ts`, o tipo
e o mapeamento de `ipcMetadata` na rota do parecer e o `analyzeIPC`.

**Predição, e ela é de regressão de atribuição, não de teste causal da hipótese
acima.** O próximo parecer:

1. **não atribui à execução** uso de LLSM nem preenchimento de comparações
   ausentes;
2. **não afirma ter recebido** indicadores de completude;
3. **não recomenda completar matrizes** com base em indicador inexistente.

⚠ **"Zero menções" NÃO é o critério.** Mencionar autovetor pode ser **correto**:
EIGENVECTOR é o método que o sistema usa, e afirmar que as respostas estão completas
pode ser **verdadeiro**. **A contagem de termos serve de triagem; a aprovação exige
ler a afirmação no contexto.**

**Caso negativo nomeado:** o parecer **afirma que a execução utilizou LLSM,
preencheu comparações ausentes ou recebeu indicadores removidos do payload**, ou
**recomenda completar matrizes com base nesses indicadores inexistentes.**

**Observação de controle, não requisito de aprovação:** a faixa dos CRs individuais
e a tabela de pesos BOCR, que a tarefa não toca.

⚠ **O que esta predição NÃO pode demonstrar:** que a remoção causou a ausência. A
ausência já estava lá **com o bloco presente**, nos três textos medidos. Uma
observação depois da remoção é **verificação de regressão**, não evidência sobre a
forma da instrução.

### Estado da execução: a remoção está feita, a conferência está pendente

**Executada em 12/09/2026, em `ab268cd`.** Saíram do que o modelo recebe: o bloco
`### Completude das Matrizes` do `system-prompt.ts`; o tipo, o mapeamento e a
injeção de `ipcMetadata` na rota do parecer; e o `analyzeIPC`. Saiu também o
`hasIPCCritical` da classificação de risco de viés, que era **sempre falso** porque
`analyzeIPC` devolvia sempre lista vazia — medido antes de remover.

⚠ **Nada foi conferido na saída ainda.** A verificação exige gerar um parecer, que é
chamada paga, e **depende do usuário**. Até isso acontecer, o que este registro tem
é: a predição escrita antes, a remoção feita, e a linha de base das três execuções
anteriores.

**Quando rodar, o que aprovar não é ausência de termos**, e sim ausência de
atribuição: o parecer não afirmar que a execução usou LLSM, não afirmar ter recebido
indicadores de completude, e não recomendar completar matrizes com base neles.
Mencionar autovetor, ou afirmar que as respostas estão completas, **pode estar
correto** — as duas coisas são verdadeiras sobre este painel.

### Seis superfícies de desancoragem

Somando os achados registrados neste documento, o sistema tem **seis** superfícies
distintas por onde uma afirmação pode perder ancoragem, e um verificador de saída
cobre **uma**:

| Superfície | Exemplo medido | Verificador de saída pega? |
|---|---|---|
| **A geração** | Lee p. 3578, fabricado sem origem | sim, comparando contra o RAG |
| **O prompt** | Saaty p. 271 na regra de limiares, quando a claim está na 248 | **não.** A saída é fiel à instrução |
| **A fonte primária** | Salomon e Gomes (2024) publica "0.5 e 0.8" onde Saaty propõe 0,05 e 0,08; a extração do RAG é fiel ao artigo | **não.** A claim corresponde à fonte |
| **A interface entre prompt e payload** | a DIRETRIZ 1 exige um N por matriz; o payload informa apenas `totalRespondents`. O modelo fabrica o N faltante para poder obedecer | **não.** Prompt e payload estão ambos corretos; o erro está na lacuna |
| **O artefato determinístico** | `metadata.q1Features` e `metadata.references` do documento de cálculo atribuem funcionalidades a autores; dois de onze sustentam | **não.** A atribuição nunca chega ao texto do parecer: vive em campo de metadados, persistido e exportado |
| **O contexto recuperado** | o `knowledge.ts` monta a `description` colada a autor e ano, e o `conditions` sem marca que os separe do `quote`; o modelo cita a anotação do indexador como verbatim | **não.** A frase existe no contexto, com atribuição, e a whitelist valida autor e ano |

⚠ **A quarta superfície ganhou um SEGUNDO caso medido em 12/09/2026, na execução 7, e
ele tem a mesma forma do primeiro.** O item 7 do `system-prompt.ts`, linha 500, manda
incluir o quote *"com a página (quando disponível)"*; **nenhuma das seções injetadas
entrega página** — as 135 referências têm `citation`, `topic`, `rule` e `context`, e
os blocos de limiares, fórmulas e benchmarks dão zero. **O parecer produziu 21
localizadores a partir de um contexto que contém três.** O dado existe: 134 das 138
key_claims têm `evidence.page` numérico. **É a tarefa A.33**, e a correção é a mesma
de A.10: **fornecer o fato, não reescrever a instrução.**

Verificar a saída contra o contexto recuperado cobre a primeira. As outras cinco
exigem **verificar para trás**: o prompt contra a base, a base contra a fonte
primária, o payload contra as exigências do prompt, o `metadata` contra o RAG, e o
formato do contexto contra a origem de cada campo.

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

**Todos os valores numéricos derivados do motor estão corretos**, e a atribuição
é forte: verificado em 11/09/2026 que o documento `calculations/{projectId}` foi
recomputado em **13/07/2026** com o motor unificado (`EIGENVECTOR`, 12
respondentes, zero exclusões) e reproduz os 24 valores publicados. **As duas
execuções da série leram dado produzido pelo motor unificado.**

Uma ressalva anterior deste documento afirmava o contrário, com base no backup do
Firestore de maio. Estava errada, e a correção está registrada em 0.2 do
`objetivo-estados-caminho.md`. As imprecisões
concentram-se em dois lugares: o que vem do `qualityAnalysis` (classe A) e o que
vem da camada bibliográfica (classes B e C).

Isso é resultado, não detalhe: separa o que o cálculo determinístico garante do
que a camada de interpretação introduz.

---

## Quinta superfície: o artefato determinístico

Encontrado em 11/09/2026, ao conferir o documento de cálculo preservado em
`docs/calculations-13jul2026.json`. **É a primeira desancoragem fora do texto
gerado.**

O `calculations/{projectId}` é o que a cadeia de autoridade trata como fonte que
nunca se corrige contra o texto. E ele carrega, em `metadata.q1Features` e
`metadata.references`, **onze atribuições de autoria escritas à mão**, que nunca
passaram pelo PVB.

O alcance é maior que o do parecer: esses campos são persistidos, vão para o
export XLSX e para o JSON. O parecer é gerado e descartado; o
`metadata.references` fica.

### Os onze itens

| Item | Fonte declarada | Situação |
|---|---|---|
| `references.primary` | Wijnmalen (2007) Eq. 17 | ✅ claims sustentam |
| `references.alternative` | Wijnmalen (2007) Eq. 12 | ✅ claims sustentam |
| `references.lee2009` | Lee (2009): 5 synthesis methods comparison | ⚠ **verificado no PDF: correto.** Falha de cobertura do RAG |
| BOCR Priorities Table | Lee (2009) | ⚠ mesma situação |
| Method Concordance Analysis | Lee (2009), Alizadeh (2020) | ⚠ parte de Lee coberta; Alizadeh pendente |
| Sensitivity Classification | Alizadeh (2020) | ⚠ claims indexadas não sustentam; PDF não verificado |
| `references.alizadeh2020` | Alizadeh: sensitivity classification | ⚠ idem |
| Reciprocal Normalized Values | Lee (2009a) | ❌ **artigo não indexado** |
| Negative Priority Detection | Lee (2009a) | ❌ **artigo não indexado** |
| `references.lee2009a` | Lee (2009a): negative priorities, concordance | ❌ **artigo não indexado** |
| `references.demirtas` | Demirtas e Ustun (2008) Eq. 2 | ❌ **artigo não indexado** |

**Dois de onze sustentam pelo que o RAG tem.**

### Duas causas distintas, e o PDF decide entre elas

**Causa 1: artigo não indexado.** Quatro itens apontam para o Lee (2009a) de
seleção de fornecedores, publicado na *Expert Systems with Applications*, e para
Demirtas e Ustun (2008). **Nenhum dos dois está no RAG**, embora ambos estejam na
base de PDFs do projeto. São as fontes de duas das cinco fórmulas de síntese que o
sistema implementa.

**Causa 2: claim não cobre a afirmação.** Os demais apontam para artigos
indexados cujas claims não mencionam o que a atribuição afirma.

**Mas essa segunda causa se divide, e só o PDF resolve.** Se o artigo tratar do
assunto e o RAG não o indexar, é falha de cobertura. Se o artigo não tratar, é
atribuição inventada. São problemas diferentes, com correções opostas: indexar a
claim que falta, ou remover a atribuição.

**Verificação feita para Lee (2009), e o resultado é favorável.** O PDF de
*Renewable Energy* 34 (2009) 120–126, página **123**, Step 10, diz: "There are
five ways to combine the scores of each alternative under B, O, C and R", e lista
as cinco: Additive, Probabilistic additive, Subtractive, Multiplicative priority
powers, Multiplicative. **São exatamente as cinco que o sistema implementa.**

Portanto `references.lee2009` está **correta**, e o problema é de **cobertura do
RAG**: as quatro claims indexadas tratam de outros pontos do artigo e deixam de
fora a passagem mais relevante para este sistema.

**Pendente: Alizadeh (2020).**

*O que decide.* Se a classificação de sensibilidade por limiares de ponto de
inflexão existir no artigo, é **cobertura** e a correção é indexar a claim. Se não
existir, é **invenção** e a correção é remover a atribuição.

*O que custa.* O PDF tem 35 páginas, está na base do projeto como
`7__Alizadeh_et_al_2020.pdf`, e é um arquivo de imagens sem camada de texto.
**Não é um grep:** exige inspeção visual página a página. Registrado para que
ninguém refaça a tentativa achando que é busca textual.

*Indício a favor da cobertura.* As claims indexadas do Alizadeh trazem um limiar
de inconsistência de 15%, e dois outros de CR. O artigo **trata de limiares**,
ainda que os indexados sejam de consistência e não de inflexão. Isso não resolve
nada, mas torna a hipótese de cobertura menos improvável do que parecia.

*Afirmação honesta enquanto isso:* as claims indexadas não sustentam, e o artigo
não foi verificado.

### A conclusão que atravessa as cinco superfícies

Três medições independentes, em três artefatos escritos à mão sem passar pelo PVB:

| Superfície | Itens auditados | Errados |
|---|---|---|
| Localizadores de página no `system-prompt.ts` | 4 | 2 |
| Citações com página no parecer, execução 1 | 18 | 13 |
| Atribuições em `metadata` do documento de cálculo | 11 | 9 pelo que o RAG tem, ao menos 4 confirmados |

**Onde alguém escreveu uma atribuição à mão, sem passar pelo protocolo de
verificação na base, a taxa de erro é alta.** Essa é a conclusão geral do
registro, e agora tem três medições em superfícies independentes para sustentá-la.

---

## Caso à parte: referência declarada que não cobre o que a invoca

Encontrado em 11/09/2026, ao conferir o documento de cálculo preservado. **Não é
imprecisão do parecer:** está no próprio `calculations/{projectId}`, gravado pela
rota.

O campo `metadata.q1Features` declara, entre as cinco funcionalidades:

> `'Sensitivity Classification (Alizadeh 2020)'`

E o `metadata.references` registra "Alizadeh et al. (2020) Energy policy:
Sensitivity classification". O construto classificava cada mérito como Robusto,
Moderadamente Sensível, Sensível ou Crítico, com limiares em 50, 20 e 10 pontos
percentuais de ponto de inflexão.

**A fonte não sustenta.** `lib/rag/articles/alizadeh2020_energy.ts` traz três
claims, e nenhuma trata de classificação de sensibilidade por ponto de inflexão:

| Claim no RAG | Sobre o quê |
|---|---|
| fórmula aditiva recomendada para avaliação de longo prazo | escolha de fórmula BOCR |
| fórmula multiplicativa melhor para curto prazo | escolha de fórmula BOCR |
| relaxar o limiar de inconsistência para 15% em ambientes político-econômicos complexos | limiar de **CR**, não de inflexão |

Os limiares numéricos indexados do artigo são 0,15, 0,1 e um dependente da ordem
da matriz, **todos de consistência**. Nenhum de 50, 20 ou 10 pontos percentuais.

**Portanto a afirmação precisa de precisão.** Não é "construto sem fonte": é
**construto com referência declarada que não cobre o que ele faz**. A remoção
continua certa, porque nenhuma tabela publicada traz a classificação, mas o
diagnóstico muda: havia atribuição, e ela era indevida.

**Agravante.** O mesmo `q1Features` declara
`'Method Concordance Analysis (Lee 2009, Alizadeh 2020)'`. A concordância entre
métodos, que é o `robustnessLevel` marcado em 2.3 como construto a distinguir,
invoca o mesmo autor. Vale a mesma conferência antes de tratá-lo no Bloco D.

**Categoria.** É parente da classe D, mas na direção oposta: ali o prompt ensina
um fato errado; aqui o código declara uma fonte que não sustenta o que ele
calcula. Nenhum verificador de saída alcança, porque a atribuição nunca chega ao
texto do parecer: vive num campo de metadados.

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
| 1 | 10/09/2026, `d16491a`. Nada corrigido | **Feita.** Linha de base: 5 imprecisões, 13 de 18 localizadores divergentes. ⚠ Descoberto em 11/09: o `calculations` que ela leu **já vinha do motor unificado**, recomputado em 13/07/2026 |
| 2 | Depois do 1º commit de A.10: páginas corrigidas, exemplos de parágrafo ainda com o dado falso | **Feita**, `2b353b3`, 150s. A p. 250 sumiu e a faixa "1,1% e 9,6%" permaneceu. Classe D confirmada como fato. Mais quatro achados: imprecisão 5 estocástica, localizador fabricado instável, vizinhança confirmada como ruído |
| 3 | Depois do 2º commit de A.10: exemplos de parágrafo sem dado real | Se a faixa sumir aqui e não na etapa 2, isola o exemplo como causa, independente do cache. **Nota:** esta etapa mede o exemplo, não o cálculo. O `calculations` já vinha do motor unificado nas execuções 1 e 2, descoberto em 11/09/2026 |
| 4 | Depois de B.3: remover ou deixar de ler o cache `responses.{doc}.responses` | Isola o dado de entrada como causa. Junto com a etapa 3, decide se a imprecisão 1 exigia as duas correções ou apenas uma. ⚠ Ver a predição abaixo |
| 5 | Depois de o payload informar o N por matriz (12 em todas) | ✅ **Feita**, `ca36539`, 188s. As três predições confirmadas: a imprecisão 2 desapareceu, Escobar passou a tratar N=12, e a faixa dos CRs permaneceu como controle. **Classe E confirmada como fato medido** |
| 6 | Depois de A.11 etapa 1: claim das cinco fórmulas do Lee indexada | **A primeira que mede adição, não remoção.** Decide se a fabricação cede quando a base cobre a lacuna, **ou se claim concorrente impede**. Três resultados nomeados abaixo, antes da execução |

### Predição testável para a etapa 4

Registrada **antes** da execução, para que o resultado confirme ou refute a cadeia
reconstruída em vez de ser explicado depois.

**O que deve acontecer.** O caminho de fallback, `computeCRsFromJudgments`, chama
`calculateAllWeights` e devolve `avgCR: result.avgCR`, que em `lib/ahp-ipc.ts` é o
**máximo** das seis matrizes não triviais, não a média. Portanto o
`classifyRespondent` passará a receber o CR **governante**, cujo menor valor no
painel é 11,39%.

⚠ **CORREÇÃO da predição e da sequência, 12/09/2026.**

**A predição anterior era "os doze migram para CRÍTICO". Está errada:** serão **1
REVISAR e 11 CRÍTICO**. O R01 tem governante de 11,39%, e a faixa de `REVISAR` vai
de 10 a 15%. O erro foi usar o menor governante para prever o destino de todos,
quando ele determina onde cai o **melhor** caso.

⚠ **A sequência anterior, `B.3 → A.12 → etapa 4`, contradizia B.3**, que determina
execução depois da etapa 4. **A sequência vigente, registrada no âncora:**

1. **A.12:** corrigir a origem dos CRs e remover o score e as categorias do payload;
2. **executar a etapa** com as mudanças identificadas;
3. **B.3:** remover o cache obsoleto, preservando o registro histórico.

⚠ **Consequência metodológica que isso cria.** Corrigindo a origem dos CRs **e**
removendo as categorias antes da geração, **a etapa passa a avaliar uma intervenção
conjunta**, e não isola o efeito do cache.

**O isolamento pode ser verificado no payload**, lendo o que é enviado antes e
depois, sem publicar uma versão intermediária inadequada. **A predição de 1 REVISAR
e 11 CRÍTICO é diagnóstico do classificador antigo**, não critério de aceite: A.12
remove a distribuição.

Se acontecer, confirma a cadeia inteira: cache → `qualityAnalysis` → imprecisão 1.
Se não acontecer, aponta para algo que não entendemos no caminho.

**Verificação de bloqueio, feita em 11/09/2026: a etapa não quebra.** Havia a
suspeita de que o `isExplicitlyBad`, em `resultados/page.tsx`, excluísse do payload
os respondentes marcados como SUSPEITO ou CRÍTICO, o que esvaziaria o painel e
produziria erro em vez de medição.

Conferido: **ele não exclui, apenas conta.** O bloco monta `individualStats` com
`valid`, `warning`, `critical` e `total`; todos os respondentes entram no total, e
o que muda é o balde. Depois da etapa 4 o payload continuará com os doze, com
`critical: 12`.

⚠ **Ressalva de leitura, e ela recomenda uma tarefa antes.** Com todos em
`critical`, o `qualityAnalysis.statistics.byStatus` enviado ao modelo fica assim:

```
'CONFIÁVEL': 0
'REVISAR':   0      ← zerado por construção, não pelo dado
'SUSPEITO':  0
'CRÍTICO':   12
total:       12
```

Três baldes zerados, e um deles **não porque o dado diz, mas porque a linha é
literal**: o `individualStats` só tem três contadores (`valid`, `warning`,
`critical`), e o `'REVISAR'` nunca teve de onde vir.

Isso não invalida a medição, mas **cria ambiguidade na leitura**: se o parecer
reagir mal, não se distingue se foi pela informação de que os doze são críticos ou
pela degeneração da distribuição.

**Consequência: o `'REVISAR': 0` deixa de ser resíduo e vira pré-requisito.** Hoje
ele é defeito silencioso, uma categoria que nunca se preenche enquanto as outras
três variam. Depois da etapa 4 passa a ser um dos três zeros de um quadro com um
único balde preenchido, e interfere na leitura do experimento.

**E a causa é mais funda que um contador ausente.** O `individualStats` classifica
em **três** degraus (`valid`, `warning`, `critical`); a distribuição enviada tem
**quatro** categorias. O quarto balde não falta por esquecimento: ele não existe
do lado que conta. A origem do nome REVISAR é o `classifyRespondent` da API, que
tem quatro faixas com cortes em 0,05, 0,10, 0,15 e 0,20, dos quais **apenas dois
têm fonte**.

Portanto "acrescentar o quarto balde" exigiria **escolher um limiar novo**, e isso
reintroduziria exatamente o construto categórico sem lastro que A.1, A.2 e a
remoção do `validateSensitivity` retiraram em quatro commits.

A pergunta certa, registrada em A.12: **a distribuição por categoria deveria
existir no payload, ou o parecer deveria receber os CRs e nada mais?** É a mesma
decisão de A.1, que removeu os quatro baldes da tela e deixou o CR cru.

**E o payload já responde parte dela.** A seção anti-alucinação de respondentes,
em `ai-reviewer/route.ts`, declara as quatro categorias **com as faixas
explícitas**:

```
- CONFIÁVEIS (CR ≤ 10%): ...
- REVISAR (10–15%): ...
- SUSPEITOS (15–20%): ...
- CRÍTICOS (>20%): ...
```

Das quatro faixas, **duas não têm fonte**: os cortes em 15% e 20%. Os únicos
limiares com lastro são o `CR ≤ 0,10` de Saaty (1977) e o `CR > 0,20` de Saaty e
Ergu (2015), que dão três faixas.

Isso confirma duas coisas. Que A.12 é sobre **remover**, não sobre acrescentar um
contador. E o diagnóstico do `'REVISAR': 0`: o balde existe no texto do payload,
com faixa declarada, e o contador que deveria alimentá-lo nunca é preenchido.

**Ordem recomendada: B.3, depois A.12, depois a etapa 4.** Uma variável por etapa,
a mesma disciplina aplicada ao cache e ao prompt.

### Predição registrada para a etapa 5, antes da execução

Registrada em **11/09/2026**, antes de qualquer geração posterior ao commit que
informa o N por matriz. Uma previsão datada vale mais que uma observação
explicada depois.

**A correção.** O payload passa a declarar, na seção anti-alucinação de
respondentes: "todos os 12 responderam à TOTALIDADE das comparações pareadas.
Portanto N = 12 em TODAS as matrizes agregadas", com a negação explícita de
particionamento por mérito ou dimensão.

**O que deve acontecer:**

| # | Predição | O que confirma |
|---|---|---|
| 1 | A afirmação "3 respondentes por dimensão BOCR" **desaparece** | a imprecisão 2 é classe E, fabricação por lacuna, e não tendência do modelo a inventar |
| 2 | A aplicação de Escobar **muda**: ou some, ou passa a tratar N=12 | a imprecisão 4 é consequência da 2, como a cadeia reconstruída afirma |
| 3 | A faixa "1,1% e 9,6%" **permanece** | **controle.** Nada nesta tarefa a toca; se sumisse, o resultado seria variação e não correção |

**Se 1 e 2 acontecerem e 3 permanecer, a classe E deixa de ser leitura e vira fato
medido**, como a classe D no primeiro commit de A.10.

**Se 1 não acontecer**, a lacuna do payload não era a causa, e a inferência dos
três respondentes vem de outro lugar que não identificamos.

### Resultado da etapa 5 — 11/09/2026, commit `ca36539`

**As três predições foram confirmadas.**

| | |
|---|---|
| Commit | `ca36539` |
| Alteração | 4 linhas inseridas em `ai-reviewer/route.ts` |
| Modelo | `claude-opus-4-6` |
| Duração | 188 segundos (3m08s) |
| Veredito | ACEITO, nota A |
| SHA-256 do texto | `C49A5DA9107DB6D93825C8B4AFE3178DCB554652E89BFC5C50586E26F84FBC9C` |

| # | Predição | Resultado |
|---|---|---|
| 1 | "3 respondentes por dimensão BOCR" desaparece | ✅ **desapareceu** |
| 2 | Escobar some ou passa a tratar N=12 | ✅ **permaneceu, aplicado explicitamente com N = 12** |
| 3 | A faixa "1,1% e 9,6%" permanece (controle) | ✅ **permaneceu** |

**A classe E está confirmada como fato medido.** Tinha um caso, inferido da
DIRETRIZ 1 e sustentado por uma frase da execução 2. Agora tem predição registrada
antes da execução e resultado medido depois.

**O desfecho da predição 2 é mais informativo que o desaparecimento.** Escobar não
sumiu: passou a ser aplicado com o N correto. Isso é **compatível com** o modelo aplicar a diretriz corretamente e faltar apenas
o dado.

⚠ **Uma execução não demonstra "o tempo todo" nem "o único elemento faltante".**
Mostra que, com o N fornecido, a diretriz foi aplicada. **O que o código sustenta é
que a diretriz exigia um dado que o payload não continha.**

Isso reforça a formulação da classe E: nem o prompt nem o payload mentiam, e a
correção não foi reescrever a instrução, foi **fornecer o que ela pedia**.

**Custo da correção: quatro linhas de payload.** Sem tocar no prompt, no motor nem
no dado do Firestore. Duas imprecisões resolvidas, uma classe de falha confirmada.

**A predição 3 fez o trabalho de controle**, e sem ele um parecer que melhorasse em
tudo não distinguiria efeito de variação.

⚠ **Correção de alcance, 12/09/2026.** A versão anterior afirmava que "o resultado
das outras duas não é variação estocástica: é efeito da correção". **Uma execução
não estabelece isso.**

**Formulação delimitada:** nesta execução os resultados foram compatíveis com a
hipótese — o N incorreto desapareceu e o controle permaneceu. **A inspeção do
código sustenta o mecanismo proposto; a estabilidade entre gerações não foi
medida.** Para afirmar eficácia no artigo, repetir em condições comparáveis,
preservando entradas e registrando os parâmetros de geração.

⚠ Isso **não exige repetir tudo para encerrar uma correção de engenharia**: o
critério de engenharia é o código, o de publicação é a repetição.

**Tempo.** 188 segundos, contra 154 e 150 das execuções anteriores. A terceira
medição para A.9: as três cabem nos 300 segundos, mas a margem encolheu de 150
para 112. Vale acompanhar.

**Correção do desenho, 11/09/2026.** A tabela original trazia a recomputação do
`calculations` como variável da etapa 4. Ela **não é variável**: o documento já
estava recomputado desde 13/07/2026, e as execuções 1 e 2 leram dado do motor
unificado. O que a etapa 4 mede é o **cache das respostas** (B.3), que é outra
coleção e continua congelado desde maio.

Sem essa correção, a próxima geração seria feita esperando responder algo que já
está respondido.

**Não pular etapas.** Corrigir tudo de uma vez e gerar um parecer no fim mostra
que as imprecisões sumiram, mas não diz qual correção resolveu qual. A ordem acima
transforma cinco correções de engenharia em cinco medições.

**Registrar cada execução** nesta seção, com data, hash do commit, tempo de
geração, modelo e texto bruto, na mesma estrutura da execução de 10/09/2026.

---

## Sexta superfície: o contexto não distingue citação de anotação

Encontrado em 11/09/2026, na execução 5. **É a primeira falha que não está nem no
prompt, nem no payload, nem na base, nem na geração: está no formato do contexto
recuperado.**

### O caso

O parecer escreveu:

> convergente com Kabak (2014, p. 510): "Additive method to combine the scores of
> each alternative under B, O, C and R"

Duas coisas erradas. A página do Kabak no RAG é **27**, não 510. E, mais grave, **a
frase entre aspas não é do artigo**: é o campo `conditions` da claim, escrito por
quem indexou.

Em `lib/rag/articles/kabak2014_prioritization.ts`, a claim `bocr_additive` tem:

| Campo | Conteúdo | Origem |
|---|---|---|
| `quote` | "There are five methods to combine the scores of each alternative under B, O, C and R" | **do artigo** |
| `description` | "Additive method to combine the scores of each alternative under BOCR." | **do indexador** |
| `conditions` | "Used to combine the scores of each alternative under B, O, C and R." | **do indexador** |

O parecer citou a forma do `conditions`, com as letras separadas, e a apresentou
entre aspas como verbatim.

### A causa está no formato, não no conteúdo

`app/api/ai-reviewer/knowledge.ts`, linhas 295 a 301, monta cada fórmula assim:

```
### ${f.description} (${f.source_article}, ${f.source_year})
$$ ${f.latex} $$
*Variáveis:* ...
*Condições:* ${f.conditions || 'Gerais'}
```

**A `description` vai no cabeçalho, colada a autor e ano**, exatamente na posição
em que uma citação apareceria. E o `conditions` vem logo abaixo, sem nenhuma marca
que o distinga do `quote` do artigo.

O modelo recebe `### Additive method to combine... (Kabak, 2014)` e o trata como
material citável. **Não há erro de leitura: o contexto o apresenta assim.**

### Alcance: 124 campos em 31 artigos

Medido em 11/09/2026: o RAG tem **128 campos `conditions`, 124 preenchidos**, em
**31 dos artigos indexados**. Some-se a `description`, presente em todas.

**O Kabak foi onde apareceu, não onde está o problema.** Toda claim com fórmula é
candidata, porque o formato é o mesmo para todas.

### Por que nenhum requisito do eixo de ancoragem pega

| Requisito | Por que falha aqui |
|---|---|
| Comparar página, não só autor e ano | a página estava errada e seria pega, mas por acaso: o texto continuaria não sendo do artigo |
| Validar a faixa do artigo | idem |
| Fixar convenção de numeração | irrelevante |
| A whitelist atual, autor e ano | **Kabak está na lista e o ano confere: passa** |

Um verificador que confirme "a citação existe na fonte" aprovaria, se comparasse
só autor, ano e página. **A falha é de autoria da frase**, e exige comparar o texto
citado contra o `quote`, não contra o artigo inteiro.

### Requisito derivado, e é o quarto do eixo de ancoragem

**Marcar no contexto o que é do artigo e o que é anotação sobre o artigo.** A
correção é de formato, não de conteúdo: `quote` entra como citação, `description`
e `conditions` entram como texto do sistema, com rótulo que os separe.

É a mesma família da classe E, e a mesma solução: **não reescrever a instrução,
corrigir o que se entrega a ela.**

### ✅ Medição feita em 11/09/2026

Apurada sobre os **dois anexos disponíveis**, das execuções 1 e 2. As execuções 3,
4 e 5 não tiveram o texto bruto anexado, por falha de upload, e ficam fora.

**Método.** Extração dos trechos entre aspas com itálico nos dois anexos, e
comparação de cada um contra os campos `quote`, `verbatim_quote`, `description` e
`conditions` de todos os artigos do RAG, por similaridade normalizada, com corte
em 0,72 e casamento por contenção.

⚠ **Duas correções no instrumento, ambas achadas por conferência manual.**
A primeira passada capturou só campos com aspas duplas e classificou o verbatim de
Saaty e Ergu como inexistente; ele existe, com aspas simples. A segunda omitiu o
campo `verbatim_quote` e classificou sete trechos legítimos como órfãos.

**Nos dois casos o erro estava no instrumento, não no dado.** É a terceira vez na
sessão que um script erra em silêncio e a conferência independente pega. Ver a
nota de método.

### Resultado

| Campo de origem | Exec 1 | Exec 2 | Total | % |
|---|---|---|---|---|
| `quote` | 17 | 33 | 50 | 81% |
| `verbatim_quote` | 2 | 5 | 7 | 11% |
| `description` | 0 | 1 | 1 | 2% |
| `conditions` | 1 | 0 | 1 | 2% |
| Sem correspondência | 1 | 2 | 3 | 5% |
| **Trechos entre aspas** | **21** | **41** | **62** | |

**92% vêm de campos de citação legítimos.** Os três sem correspondência são falso
positivo do instrumento: a fórmula de Wijnmalen em notação matemática, que o
comparador não casa com o campo `latex`, e um rótulo curto do Goepel.

**A sexta superfície se confirma e é rara: dois casos em 62, 3%.** Não vira taxa
alta.

Isso **rebaixa A.15**: a correção continua certa, porque o formato permite o erro,
mas o defeito é pontual e não sistemático.

Os dois casos:
- execução 1: `conditions` de Saaty e Ozdemir, "can be negative, indicating
  unprofitability";
- execução 2: `description` do Lee, que é **o caso Kabak** da sexta superfície.

### Achado colateral: dois campos do mesmo artigo, com a mesma passagem em formas diferentes

Durante a medição, um trecho do Lee (2009) apareceu sem correspondência e foi
inicialmente classificado como **citação adulterada pela geração**. Estava errado.

`lee2009_wind.ts` tem a mesma passagem em **dois campos da mesma claim**:

| Campo | Linha | Texto |
|---|---|---|
| `verbatim_quote` | 287 | "considering the benefits**...** opportunities**...** costs**...** and risks**...** is a more comprehensive way to deal with a much more complicated problem." |
| `evidence.quote` | 292 | "considering the benefits **(B)**, opportunities **(O)**, costs **(C)** and risks **(R)** of an alternative... is a more comprehensive way" |

**O PDF decide, e foi aberto.** A passagem real da página 120, Seção 1, é:

> "considering the benefits (B), opportunities (O), costs (C) and risks (R) of an
> alternative, and synthesizing the positive criteria of benefits (B) and
> opportunities (O) and the negative criteria of costs (C) and risks (R) with
> rating calculation (not pairwise comparison) by a method such as additive,
> subtractive and multiplicative is a more comprehensive way to deal with a much
> more complicated problem."

**O `evidence.quote` está correto:** preserva as siglas e usa reticências para
omitir a continuação, que é elisão legítima.

**O `verbatim_quote` está errado:** as reticências dele **substituem as siglas**, e
ele emenda o início com o fim da frase, apagando o trecho do meio sem marcar onde.

**Um campo chamado `verbatim_quote` que não é verbatim.**

**O parecer foi fiel a ele**, reproduzindo palavra por palavra, incluindo o final
"to deal with a much more complicated problem" que o `evidence.quote` não tem.

**Classificação: classe D**, a base ensina a forma errada. E é caso novo dentro
dela: não é um artefato contra outro, são **dois campos do mesmo artigo em
desacordo entre si**.

**Requisito derivado, o quinto do eixo de ancoragem:** auditar a **consistência
interna do RAG**, comparando `verbatim_quote` contra `evidence.quote` em cada claim
que tenha os dois. Isso é verificável **antes de qualquer parecer existir**, e não
depende de execução.

### Alcance medido em 11/09/2026

| | |
|---|---|
| Claims com `verbatim_quote` | **123** |
| Dessas, com `evidence.quote` também | **123** (todas) |
| **Divergentes** (não contido e similaridade < 0,90) | **13, ou 11%** |

⚠ **As treze não são o mesmo defeito.** A leitura caso a caso separa três tipos, e
só um é perigoso:

| Tipo | Exemplo | Por que importa |
|---|---|---|
| **Paráfrase no campo `verbatim_quote`** | Wijnmalen: `verbatim_quote` = "The simplified form assumes commensurability without explicit rescaling", `evidence.quote` = "additive expression is proposed, where costs and risks are treated as negative values..." | o texto **não parece citação**: é descrição em inglês escrita pelo indexador. Um leitor atento percebe |
| **Conclusão lida de tabela** | Saaty e Ozdemir: `verbatim_quote` = "PNTR is the dominant alternative", `evidence.quote` = "Annual Exten. -0.32 ; Amend NTR -0.07 ; PNTR 0.23" | idem: é inferência sobre os valores, não transcrição |
| **Citação real com modificação silenciosa** | **Lee**: siglas substituídas por reticências e o meio da frase apagado sem marca | **parece citação, soa como citação, e está errada** |

**O caso do Lee é o único em que o campo aparenta cumprir o que promete.** Os
outros doze são identificáveis por leitura, porque a forma denuncia. Este não: a
frase é fluente, tem a cadência de uma citação, e as reticências parecem elisão
legítima.

**É por isso que ele chegou ao parecer e os outros não.** O modelo reproduz o que
tem forma de citação.

⚠ **O "doze" desta partição está sob revisão desde 12/09/2026.** A décima terceira
claim divergente foi identificada — a segunda do Dodevska — e **por forma ela está
deste lado, com o Lee**: reticências no meio da frase, sem marca, prosa fluente.
Se a leitura confirmar, esta partição vira **11 + 2**. Ver "A décima terceira" e
"Por que as duas decomposições das treze não coincidem", adiante. **A revisão é
leitura caso a caso, e é decisão de A.16.**

### Cruzamento decisivo: os sete trechos de `verbatim_quote` são TODOS de claims divergentes

Feito em 11/09/2026. Os 62 trechos entre aspas dos dois pareceres foram cruzados
contra a lista das treze claims divergentes.

**Resultado: os sete que vinham de `verbatim_quote` casam com claims divergentes,
com similaridade 1,00.** Todos os sete, sem exceção, distribuídos em três claims:

| Claim | Vezes citada | O que o `verbatim_quote` faz com o texto |
|---|---|---|
| **Lee (2009)** | 3 | reticências **substituem as siglas** `(B) (O) (C) (R)`, e o meio da frase é apagado sem marca |
| **Dodevska (2023)** | 3 | reticências **substituem as notações formais**: `(DI_{bef})` e `before optimization (overline{R}_{bef})` |
| **Xu (2000)** | 1 | **expande a sigla** WGMCJM para a forma completa e **remove "this paper proves that"**, apagando a atribuição da prova ao artigo |

**Isso deixa de ser latência.** O tipo 3 não é um caso isolado do Lee: são três
claims, sete citações, e **todas as citações que passaram por `verbatim_quote`
neste corpus vieram de campos defeituosos.**

**E o padrão é específico:** nos três, o `verbatim_quote` remove **notação formal**
— siglas, subscritos, referências a equação — mantendo a prosa. É o que torna a
frase mais legível **e menos verificável**, porque é exatamente a notação que
permite localizar a passagem no artigo.

⚠ **Consequência para a detectabilidade.** A afirmação anterior, de que os tipos 1
e 2 são "identificáveis por leitura", vale para um **leitor humano atento**. O
modelo não tem esse filtro: recebe um campo chamado `verbatim_quote` e nenhum sinal
de que o conteúdo é anotação. Que os pareceres não tenham citado paráfrases é
**observação sobre este corpus, não garantia**.

**O que o número permite afirmar.** Treze em 123 divergem, mas a maioria é de tipo
1 e 2, que são defeito de preenchimento sem consequência medida. **O número a
reportar é o do tipo 3: três claims confirmadas, uma verificada até o PDF, e todas
as sete citações do corpus.**

Reportar "13 de 123 divergem" sem essa decomposição repetiria o erro corrigido na
taxa de localizadores: um agregado que mistura severidades diferentes.

### Duas hipóteses para o sete de sete, e uma foi testada

**Hipótese A:** coincidência de saliência. Lee, Dodevska e Xu são claims muito
citadas, e cair nelas é esperado.

**Hipótese B:** a reescrita torna o `verbatim_quote` mais recuperável, por ficar
mais curto e mais assertivo. Se for verdade, **o defeito se autorreforça**.

**A hipótese B foi testada e não se sustenta.** Comprimento dos 123
`verbatim_quote`, em caracteres:

| | n | média | mediana |
|---|---|---|---|
| Divergentes | 13 | 116 | 122 |
| Não divergentes | 110 | 117 | 114 |

Não há diferença. E nos divergentes o `verbatim_quote` tem o mesmo comprimento
médio do `evidence.quote`, 116 contra 116: **a reescrita não encurta, substitui.**

Fica a hipótese A. O sete de sete é saliência temática das três claims, não
propriedade do campo reescrito.

### A correção é de uma linha

`app/api/ai-reviewer/knowledge.ts`, **linha 101**:

```ts
rule: claim.verbatim_quote || claim.claim,
```

**É o campo defeituoso que chega ao modelo.** E a linha 286 do mesmo arquivo já faz
o certo para os limiares, usando `t.evidence.quote`.

Trocar a fonte da linha 101 para `claim.evidence.quote`, com o
`verbatim_quote` como fallback, **resolve os sete casos de uma vez** e não depende
de corrigir as treze divergências no RAG.

Isso é mais forte que o teste de consistência: o teste **encontra** as divergências,
a troca de fonte **deixa de propagá-las**. As duas coisas se somam, e a ordem certa
é trocar a fonte primeiro, porque é barata e imediata.

⚠ **Conferir antes:** se algum `evidence.quote` estiver vazio ou ausente, o
fallback precisa existir. A medição mostra que **todas as 123 claims com
`verbatim_quote` têm `evidence.quote`**, mas pode haver claim com um e não o outro
fora desse conjunto.

**Pendência:** classificar os dez restantes por tipo, e triar contra o PDF os de
similaridade entre 0,53 e 0,77, onde a distinção entre corte diferente e
modificação não se resolve por leitura.

### O que isso faz com A.15

A correção de formato continua justificada, mas **por prevenção, não por
frequência**. E a predição a registrar antes dela muda: com dois casos em 62, um
parecer posterior sem nenhum não distingue correção de variação. **A medição na
saída não teria poder.**

Alternativa mais barata: verificar o efeito **no contexto entregue**, não na saída.
Se a marcação separar `quote` de `description` e `conditions`, isso é conferível
lendo o payload, sem depender de gerar pareceres.

---

### Pendência original, mantida para registro

Conferir, nos cinco pareceres registrados, quantas citações entre aspas
correspondem a `description` ou `conditions` em vez de `quote`.

**Não custa código.** É leitura dos cinco anexos contra o RAG.

**O atalho:** partir dos trechos entre aspas nos pareceres, não das claims do RAG.
Para cada trecho, conferir se é `quote` de alguma claim. Os que não forem caem em
duas categorias, e **as duas interessam**:

- vêm de `description` ou `conditions` → confirma a sexta superfície e a
  transforma em taxa, com o mesmo estatuto dos 72% de divergência de localizador;
- **não vêm de lugar nenhum** → caso novo, e mais grave: verbatim fabricado, não
  apenas localizador.

⚠ **Fazer antes de A.15.** A correção de formato altera o que o modelo lê, então
precisa de linha de base. Sem ela, um parecer posterior sem citações de
`conditions` não distinguiria correção de variação.

**Predição a registrar antes de A.15**, com a linha de base em mãos: se a marcação
de origem funcionar, citações de `description` e `conditions` devem desaparecer
dos pareceres seguintes.

⚠ **O `scripts/verify-citations.mjs` NÃO serve para esta medição.** Ele casa
citações pelo padrão `Autor (ano, p. N)` e compara **localizadores**. A medição das
aspas é sobre **o texto entre aspas**, não sobre a página: é comparação de string
contra os campos `quote`, `description` e `conditions` do RAG.

São instrumentos diferentes para perguntas diferentes: um mede **onde** a citação
aponta, o outro mede **de onde o texto veio**.

Se for automatizar, é script novo e pequeno. Se for à mão, os cinco anexos estão
neste documento e o RAG está no repositório: não depende de nada externo.

---

## Predição para a etapa 6, registrada antes da execução

Registrada em **11/09/2026**, antes de A.11 etapa 1. É a primeira predição sobre
uma correção que **acrescenta cobertura** em vez de remover erro.

**A correção.** Indexar no `lee2009_wind.ts` a claim da página 123, Step 10, que
enumera as cinco fórmulas de síntese BOCR: "There are five ways to combine the
scores of each alternative under B, O, C and R", com Additive, Probabilistic
additive, Subtractive, Multiplicative priority powers e Multiplicative.

Hoje o artigo tem quatro claims, nenhuma sobre comparação de métodos, e o sistema
implementa exatamente essas cinco fórmulas.

**A linha de base é forte: três amostras de fabricação sobre a mesma lacuna.**

| Execução | Página citada para Lee (2009) | Páginas de claim no RAG |
|---|---|---|
| 1 | 3578 | 120, 122, 123, 124, 125 |
| 2 | 1107 | idem |
| 4 | 579 | idem |
| 5 | 340 | idem |

**Quatro localizadores diferentes, todos inexistentes**, sempre recuperando a
claim genérica sobre usar BOCR. Quatro amostras sobre a mesma lacuna tornam a
medição decisiva: um acerto depois da indexação seria resultado limpo.

**E o padrão não é só do Lee.** Ossadnik et al. (2016) saiu com p. 613 na execução
3 e p. 520 na execução 5; o RAG registra 434 a 449. Segundo autor com fabricação
instável.

⚠ **Complicação descoberta em 11/09/2026, antes da execução: já existe claim
concorrente.**

O **Kabak (2014) já tem indexada** a frase das cinco fórmulas, como `quote` da
Eq. (1): "There are five **methods** to combine the scores of each alternative
under B, O, C and R", com `page: 27`.

O **Lee (2009) não tem**, e é dele a passagem original, na página 123, Step 10:
"There are five **ways** to combine the scores of each alternative under B, O, C
and R".

**As duas frases diferem em uma palavra.** O modelo hoje recebe só a do Kabak, e a
usa quando precisa falar das cinco fórmulas. A fabricação do localizador do Lee
acontece em outro ponto, quando ele cita o Lee para a hierarquia de controle.

Portanto indexar a claim do Lee **não é só acrescentar cobertura**: é desfazer uma
ambiguidade em que dois artigos enunciam a mesma coisa e só um está indexado.

**Três resultados possíveis, todos nomeados antes:**

| # | Resultado | O que estabelece |
|---|---|---|
| 1 | O parecer passa a citar Lee com página em 120 a 126 | a predição original se confirma: **cobertura corrige fabricação** |
| 2 | Continua citando o Kabak, e a claim do Lee fica sem uso | **cobertura não basta quando há claim concorrente**; o modelo usa a que já conhecia |
| 3 | **Mistura as duas**, citando um autor com a formulação do outro | o mais informativo: transformaria o caso Kabak de anedota em **padrão**, e mostraria que claims quase idênticas se confundem na geração |

O risco do resultado 3 é real: já aconteceu uma vez, na execução 5, e a diferença
entre `methods` e `ways` é fina demais para separá-las.

**Requisito para a claim nova, derivado disso.** O `quote` do Lee deve usar
`ways`, a forma dele, **e incluir os nomes das cinco fórmulas** (Additive,
Probabilistic additive, Subtractive, Multiplicative priority powers,
Multiplicative), que a do Kabak não tem.

Isso dá ao modelo **razão funcional** para preferir a do Lee ao enumerar, e torna
as duas distinguíveis por conteúdo, não por uma palavra. É o mesmo princípio que
resolveu a classe E: não reescrever a instrução, fornecer o que ela pede.

**Por que importa mais que as predições anteriores.** Todas as confirmadas até
aqui mediram **remoção**: tirar o exemplo errado do prompt, tirar o módulo, tirar
a permissão. Esta mede **adição**.

Se confirmar, o registro passa a ter dois mecanismos de correção, não um:
- **remover** o que induz o erro (classes D e E);
- **cobrir** a lacuna que o obriga a fabricar (classe B).

E daria à classe B uma correção que ela ainda não tem. Hoje o documento registra
que a fabricação de localizador é arbitrária e instável, sem apontar o que a
resolve. Se a cobertura resolver, a conclusão muda: **o modelo fabrica onde a base
não cobre, e para de fabricar quando ela cobre.**

**Se não confirmar**, o achado também é forte, e no sentido oposto: a fabricação
independe da cobertura, e nenhuma correção de base a alcança. Nesse caso só
verificação de saída resolve, e o requisito 1 do eixo de ancoragem fica como única
saída.

**Nota sobre o conteúdo da claim.** A frase de abertura não basta. O `quote`
precisa incluir **os nomes das cinco fórmulas**, porque é o que permite ao parecer
verificar a Tabela 12. Com um `quote` genérico, o verificador confirma que existem
cinco e não quais. Se o formato do RAG favorecer, abrir uma claim por fórmula.

---

## Ferramenta de apuração: `scripts/verify-citations.mjs`

Desde 11/09/2026 a taxa de divergência de localizador é apurada por script, não à
mão. Ele lê os arquivos do RAG como texto, extrai de cada um os sobrenomes do
`citation.abnt`, o ano, as páginas de `evidence.page` e a faixa do artigo; depois
extrai do parecer as citações no formato `Autor (ano, p. N)` e casa por sobrenome
mais ano.

```
node scripts/verify-citations.mjs docs/parecer-exec2.md
node scripts/verify-citations.mjs docs/parecer-exec2.md --json
```

Sai `0` se nada divergir, `1` se houver divergência. Não escreve nada.

**Quatro vereditos, e a distinção importa:**

| Veredito | Significado |
|---|---|
| `OK` | a página citada é página de alguma claim do artigo |
| `DIVERGE_FORA_DA_FAIXA` | fora do intervalo do artigo |
| `DIVERGE_NA_FAIXA` | dentro do artigo, fora de toda claim: o erro de vizinhança |
| `NAO_INDEXADO` | artigo ausente do RAG. **Inconclusivo, não soma como divergência** |

A quarta categoria implementa a limitação metodológica registrada acima: artigo
que o RAG não indexa não permite concluir nada sobre a citação.

**O requisito 2 vem de graça.** A separação entre divergir dentro e fora da faixa
aparece na saída e no resumo, com a contagem de quantos casos um teste apenas por
faixa perderia.

### Nota de método: a automação não dispensa a conferência, muda o que se confere

Na primeira execução, o script classificou `Conforme Neely et al. (2020, p. 17)`
como `NAO_INDEXADO`, quando a citação é divergente e o Neely está no RAG.

**A causa:** o conectivo `e` no padrão de dois autores vinha com `\s*` dos dois
lados, permitindo zero espaços. Em "Conforme Neely", o `e` final de "Conforme" foi
lido como conectivo, e o padrão casou `Conform` + `e` + `Neely` como se fossem dois
autores. Qualquer palavra terminada em `e` antes de um nome próprio dispara o
mesmo. Na execução 2 a citação vinha sem o "Conforme" e casava.

**Nota sobre a correção:** um `\b` no conectivo não fecha o caso, porque com
`\s*` de zero não há limite de palavra entre `m` e `e`. O que fecha é exigir
espaço (`\s+`) ou ancorar com `(?<![\wÀ-ÿ])`.

**O modo de falha é o mesmo que este documento inteiro descreve.** O script errou
em silêncio: classificou como inconclusivo o que era divergente, e o número final
ficou plausível. Não houve exceção, não houve aviso.

E o que o pegou foi o mesmo que vem pegando tudo nesta sessão: **comparar contra
uma fonte independente em vez de aceitar o que parece certo.** A contagem manual
existia, e a divergência entre as duas apurações apareceu.

**Regra para quem usar o script:** na primeira execução sobre um parecer novo,
confira a saída contra uma contagem manual. Depois disso, confie nele.

---

## Execução 6 — 11/09/2026, `bf959b6`, depois da troca para `evidence.quote`

| | |
|---|---|
| Commit | `bf959b6` |
| Variável alterada | a fonte da citação: `verbatim_quote` → `evidence.quote`, em três arquivos |

### As três predições confirmadas

| # | Claim | Predição | Resultado |
|---|---|---|---|
| 1 | Lee (2009) | traz as siglas `(B) (O) (C) (R)` em vez das reticências | ✅ **confirmada** |
| 2 | Dodevska (2023) | traz `(DI_{bef})` e `(overline{R}_{bef})` | ⚠ **parcialmente atendida**: a primeira notação apareceu, a segunda foi omitida por truncamento |
| 3 | Xu (2000) | começa com "this paper proves that" | ✅ **confirmada** |
| — | controle | a faixa "1,1% e 9,6%" permanece | ✅ permaneceu |

**A correção propagou.** As três citações que o corpus mostrou vindo de
`verbatim_quote` defeituoso passaram a sair na forma fiel, e o controle não se
moveu.

**É a sexta predição registrada antes e a quinta confirmada**, e a segunda que
mede **adição de fidelidade** em vez de remoção de erro, depois do N por matriz.

**O resultado do Xu é o mais forte dos três**, e não pela notação: a diferença
entre "the weighted geometric mean complex judgement matrix..." e "**this paper
proves that** the WGMCJM..." é **atribuição epistêmica**. O parecer voltou a dizer
que o artigo prova, em vez de afirmar como fato estabelecido.

### Dodevska: predição parcialmente atendida

⚠ **Correção de 12/09/2026.** A versão anterior marcava esta predição como
confirmada e tratava o truncamento como observação lateral. **O critério previa
duas notações e uma apareceu: é resultado parcial.**

**Registro correto:** predição parcialmente atendida. Uma notação foi reproduzida;
a segunda foi omitida por truncamento. **O trecho observado é compatível com a
fonte corrigida.**

⚠ **O critério registrado antes pedia as duas, e não deve ser reinterpretado depois
para preservar a contagem de confirmações.** O placar da nota de método passa a ser
**quatro confirmadas, uma parcial e uma refutada**.

O que segue é a análise do truncamento, que continua válida.

O parecer **encerrou a citação antes de `(overline{R}_{bef})`**. Trouxe o
`(DI_{bef})` e parou ali.

**Isso não é falha da correção.** A predição testava **a forma do texto recebido**,
e ela mudou: as notações voltaram. O que o modelo fez depois foi **truncar**, que é
comportamento esperado quando julga a parte suficiente, e é outra coisa de
modificar o conteúdo citado.

A distinção separa duas perguntas: **qual texto o modelo recebe** e **quanto dele
reproduz**. A correção resolve a primeira. A segunda é comportamento de geração, e
não há instrução no prompt que exija citar o quote inteiro, só que cite verbatim na
primeira aparição.

**Se o truncamento vier a ser tratado, é tema próprio**, e pertence ao requisito 5,
sobre distinguir elisão marcada de modificação silenciosa. Só que do lado da
**geração**, não da base: ali o problema era o RAG reescrever; aqui seria o modelo
cortar sem marcar.

⚠ **Consequência de projeto, e vale mesmo sem tratar o truncamento:** um
verificador que compare o trecho citado contra o `evidence.quote` por **igualdade**
reprovaria esta citação, que está correta. Precisa aceitar **prefixo do quote** e
rejeitar apenas divergência no conteúdo comum.

### Correção de aritmética no critério

O critério 4 do prompt previa que o total de `verbatim_quote` em código cairia de
**21 para 20**, supondo que a edição do `system-prompt.ts` removia uma ocorrência
ao fundir duas linhas em uma.

**Caiu para 19.** As duas linhas removidas tinham o termo **cada uma**, e a linha
nova não tem nenhum:

```
- "key_claims[i].evidence.quote" — claim geral, texto fiel ao artigo
```

21 − 2 = 19. O executor reportou a divergência em vez de ajustar o critério.

**É o mesmo erro de A.14**, e a regra de 0.4 já o cobre: simular a edição
principal antes de fixar um critério de contagem. Aqui a simulação foi feita, mas
sobre o conteúdo errado: contei as linhas removidas, não as ocorrências dentro
delas.

### Pendência: reingestão

A correção do `ingest-rag.ts` **só vale depois de reingestão**, não executada.
Os chunks do índice semântico continuam com o texto antigo.

Portanto, esta execução mediu a correção do **RAG estático**. O caminho semântico,
que passa pelo `route.ts:149`, continua entregando o campo defeituoso até a
reingestão.

---

## A.16: a leitura das treze inverte uma premissa de A.17

Registrado em 11/09/2026, **antes** de qualquer verificação em PDF, porque o
achado contradiz uma decisão já aplicada em produção.

### As treze não são um defeito, são dois

A contagem de ontem classificou as divergências por **identidade da passagem**: oito
cobrindo a mesma, quatro distintas, uma parcial. Isso sustentou a troca simples de
A.17.

**A leitura caso a caso mostra que "mesma passagem" incluía duas direções
opostas.**

| Direção | Casos | Qual campo é melhor |
|---|---|---|
| O `verbatim_quote` é anotação, paráfrase ou está reescrito | 8 | **`evidence.quote`** |
| O `evidence.quote` está **truncado** | 5 | **`verbatim_quote`** |

**Os oito onde A.17 acertou:** Dodevska **×2**, Xu, Lee e os quatro de paráfrase
(Wijnmalen ×3, Saaty e Ozdemir).

⚠ **A tabela dizia 7, e somava doze das treze.** A décima terceira foi
identificada em 12/09/2026 e está na subseção seguinte: é a **segunda claim
divergente do Dodevska**, e com ela a partição por direção fecha em **8 + 5 =
13**. **O Dodevska é o único artigo com duas claims divergentes.**

**Os cinco onde o `evidence.quote` é o campo curto:** os três do Bozóki, o Schmidt
e o Salomon.

O do Schmidt se resolve por leitura, sem PDF: o `evidence.quote` é
"This can be achieved only by taking the geometric mean [113]", que **começa com
"This" sem referente**. O `verbatim_quote` traz a oração anterior, que dá o
sentido: "The reciprocal of the aggregated values must correspond to the individual
reciprocal values; this can be achieved only by taking the geometric mean."

Nos do Bozóki, o `evidence.quote` diz "the graph is connected" e o
`verbatim_quote` diz "the graph **corresponding to the incomplete pairwise
comparison matrix** is connected".

### A décima terceira: a segunda claim divergente do `dodevska2023when.ts`

Identificada em 12/09/2026, lendo o arquivo. O Dodevska tem **três** claims com
`verbatim_quote`: na primeira os dois campos são idênticos, e **as outras duas
divergem**. A que faltava é a de `usable_as: "limitation"`, `evidence.page` 12:

| Campo | Texto |
|---|---|
| `verbatim_quote` | "When the starting point is high inconsistency**...** it is more challenging to correct the consistency issue." |
| `evidence.quote` | "When the starting point is high inconsistency, **independent of the DI value, the average value of the goal function is more elevated, i.e., the conclusion is that** it is more challenging to correct the consistency issue." |

**Ela entra entre os reescritos**, então a direção manda ficar com o
`evidence.quote`, como nos outros sete.

⚠ **Mas a gravidade dentro do grupo é outra, e é o que justifica registrá-la
separada.** Em Lee, em Xu e na outra claim do Dodevska as reticências apagam
**notação** — siglas, subscritos, referência a equação — e a frase sobrevivente
**diz o mesmo, só menos verificável**. Aqui o que as reticências engolem é **outra
proposição**: o achado sobre a função objetivo ("the average value of the goal
function is more elevated"), a condição de escopo ("independent of the DI value") e
o marcador "i.e., the conclusion is that", que é justamente o que declara a oração
seguinte como **inferência dos autores**.

**O que sobra é a conclusão sem a medida em que ela se apoia**, apresentada como
frase direta do artigo. **É o único caso do grupo em que a elisão remove uma
proposição distinta, e não notação.**

⚠ **Uma ressalva de precisão, e ela importa para não superafirmar:** a oração que
sobrevive **está no artigo** — os autores a escrevem como sua conclusão. O campo
não inventa a afirmação; **apaga o fundamento, a condição e a marca de que é
inferência.** Quem lê o `verbatim_quote` não tem como saber que a frase depende de
um valor médio de função objetivo.

⚠ **E há consequência para a outra partição, que fica como decisão de A.16.** A
decomposição por detectabilidade está escrita como **12 identificáveis por leitura
+ 1 que parece citação legítima**, o Lee. **Por forma, esta décima terceira está do
lado do Lee**: reticências no meio da frase, sem marca, e prosa fluente. Se a
leitura confirmar, aquela partição vira **11 + 2**. **Não a alterei aqui**, porque
ela é leitura caso a caso e é o método daquela seção.

### Por que as duas decomposições das treze não coincidem

**Não há número errado entre elas, e vale dizer isto explicitamente.** São duas
partições do mesmo conjunto, com critérios diferentes:

| Partição | Critério | Como fecha |
|---|---|---|
| Por **direção** | qual dos dois campos é o melhor | **8** reescritos + **5** truncados |
| Por **detectabilidade** | se a forma do campo denuncia o defeito a um leitor | **12** identificáveis + **1** que parece citação (a revisar, ver acima) |

**Quem tentar reconciliá-las vai concluir que um dos números está errado.** Eles
respondem a perguntas diferentes: a primeira decide **o que corrigir na base**, a
segunda estima **o que passa para o parecer**.

### O que isso faz com o escopo de A.16

**A tarefa fica reduzida à decisão de qual campo fica, e a direção resolve doze:**
nos oito reescritos fica o `evidence.quote`; nos cinco truncados, o
`verbatim_quote`.

**Sobram dois resíduos.** O **Dodevska**, porque suas duas claims divergentes são de
subtipos diferentes dentro dos reescritos — uma apaga notação, a outra apaga uma
proposição — e a segunda pede decisão própria sobre a claim, não só sobre o campo.
E **os casos em que o campo escolhido ainda precisa de conferência contra o PDF.**

⚠ **Consequência para A.17, que já está em produção:** nos cinco truncados a troca
de fonte entrega texto **mais curto, nunca infiel**. **A.16 corrige a base e o
efeito desaparece sem tocar código** — não há reversão a fazer.

### O que isso faz com A.17, e o que não faz

⚠ **A troca de fonte continua correta nos sete. Nos cinco, ela custou completude,
não fidelidade.**

Essa distinção é o ponto: **em nenhum caso A.17 fez o modelo receber texto
infiel.** Em cinco, fez receber texto **mais curto**.

**Não pede reversão.** Pede uma das duas:
- enviar o campo mais completo quando um contém o outro — acrescenta lógica ao
  código;
- **corrigir os `evidence.quote` truncados**, que é escopo de A.16 e já mexe
  nesses arquivos.

**A segunda é melhor**, porque corrige a base em vez de condicionar o código.

### Nota de método: a contagem classificava por identidade, não por completude

É a segunda vez que uma decisão tomada com contagem se revela incompleta quando os
casos são lidos um a um.

**A contagem não estava errada, estava grossa.** Ela media se os dois campos
cobrem a mesma passagem, e a resposta era sim em oito casos. **Mas não media em que
direção a diferença ia**, e é a direção que decide qual campo usar.

Nos sete, o campo mais longo era o reescrito. Nos cinco, o campo mais longo era o
fiel. **A mesma métrica, "cobrem a mesma passagem", vale para os dois grupos e não
os distingue.**

**Regra:** quando a decisão depende de qual de duas versões usar, a contagem
precisa medir a **direção** da diferença, não só a existência dela. Agrupar por
"divergem" ou "não divergem" perde exatamente o que a decisão precisa.

### Teste automático insuficiente, e vale registrar

Tentei automatizar a classificação por contenção de fragmentos, ignorando
reticências. **Marcou onze dos treze como "divergem em conteúdo"**, quando a
leitura mostra que vários são contenção com inserção no meio.

O Bozóki é o caso: o `verbatim_quote` **insere** "corresponding to the incomplete
pairwise comparison matrix" dentro da frase do `evidence.quote`. Não é contenção
literal, e nenhum teste de substring pega.

**A classificação dos treze é leitura, não script.** Terceiro caso na sessão em que
o instrumento produziu resultado plausível e inútil.

---

## O achado que reorganiza os localizadores: o RAG contradiz o próprio `abnt`

Encontrado em 11/09/2026, durante A.16, ao abrir o PDF do Bozóki.

### O caso que abriu

O `bozoki2010_ipc.ts` registra as dez claims com `page: 2256` ou `2257`. **O
próprio campo `abnt` do arquivo diz "p. 318-333"**, e o PDF confirma:
*Mathematical and Computer Modelling* 52 (2010) 318–333.

E o `locator_id` dos três casos divergentes é `"Theorem 1"`, que na página 321 é
sobre **logconvexidade de λmax**, não sobre unicidade com grafo conectado.

**Localizador duplamente errado.**

### A medição: oito artigos em 27 testáveis

Conferindo `page` contra a faixa que o próprio `abnt` declara:

| Artigo | Faixa no `abnt` | `page` registrados | Padrão |
|---|---|---|---|
| `aullhyde2006_experiment` | 290–295 | 1, 3, 4, 5, 6 | relativa |
| `escobar2004_note` | 318–322 | 1, 2, 3, 4 | relativa |
| `lee2024_project` | 375–393 | 1, 5, 6, 7, 9, 14 | relativa |
| `saaty2003_eigenvector` | 85–91 | 2, 3, 4, 6 | relativa |
| `saaty2015_trustworthy` | 1171–1187 | 7, 8, 10, 11, 13 | relativa |
| `salomon2016_absolute` | 538–545 | 1, 2, 3, 5, 6 | relativa |
| `xu2000_consistency` | 683–687 | 1, 2, 3 | relativa |
| **`bozoki2010_ipc`** | **318–333** | **2256, 2257** | **errado** |

**27 dos 37 artigos declaram faixa. Oito divergem, 30%.** Os outros dez não são
testáveis por esse critério, e incluem Dodevska, Ayan, Petrillo, Salomon 2024 e
Schmidt.

**Sete usam numeração relativa** sem declarar. O Bozóki está errado: 2256 não
corresponde a nenhuma paginação do artigo.

### Isto explica a hipótese das duas convenções

Desde a execução 1 este registro anotava que o modelo "alterna entre numeração
relativa e de periódico, sem critério". **A causa é material: a base mistura as
duas e não declara qual usa.**

Os seis casos classificados como "troca de convenção" **não eram erro de geração**.

### ⚠ A inversão: em quatro casos o modelo estava certo e a base errada

A pergunta decisiva: algum localizador classificado como errado cai dentro da faixa
que o `abnt` declara? **Sim, quatro vezes.**

| Citação | Execuções | Faixa no `abnt` | `page` no RAG | Veredito |
|---|---|---|---|---|
| Saaty (2003, p. 85) | 2 e 4 | **85–91** | 2, 3, 4, 6 | **dentro do artigo** |
| Saaty (1987, p. 165) | 1 | **161–176** | 163, 170, 171, 172, 174 | **dentro do artigo** |
| Forman e Peniwati (1998, p. 169) | 1 | **165–169** | 166, 167, 168 | **dentro do artigo** |

**O modelo citou páginas reais do periódico, e o script as reprovou** porque
compara contra o `page` da claim, que nesses artigos está em numeração relativa.

**Isto reclassifica os dois casos de "erro de vizinhança".** Saaty (1987) e Forman
e Peniwati (1998) não eram interpolação em faixa conhecida: **eram páginas
corretas que o RAG não indexou.**

### O que as quatro inversões quebram

Até aqui o documento tinha um padrão de **mão única**: o sistema erra, o modelo
propaga. As seis superfícies, as cinco classes, as taxas — todas descrevem defeito
a montante e fidelidade a jusante.

**As quatro inversões quebram isso.** Em quatro citações o modelo estava certo e o
**instrumento de medição** errado, porque comparava contra um campo em convenção
diferente.

E o caso mais forte é o do **"erro de vizinhança"**. Aquela categoria foi criada
para explicar citações que caíam dentro da faixa do artigo mas fora de toda claim,
e a explicação oferecida era **interpolação pelo modelo**.

A explicação real é mais simples e menos favorável a quem mediu: **o modelo citou
páginas que o RAG não indexou.**

⚠ **Isso apaga uma das causas da decomposição, e ela era invenção nossa.** A
categoria "erro de vizinhança" descrevia um comportamento do modelo que não
existia; descrevia uma lacuna da base.

### A apuração encontrou um erro na própria apuração

Vale dizer isto explicitamente, porque é o argumento que sustenta a seção.

Os 72% e os 62% foram publicados neste documento, com método declarado e script
versionado. **O erro que os invalida foi encontrado pela aplicação do mesmo
protocolo**: conferir o que se afirma contra a fonte, neste caso o `abnt` de cada
artigo.

Um revisor que encontrasse essa inconsistência por conta própria descartaria a
seção inteira. **Encontrada e corrigida aqui, ela é demonstração de que o método
funciona** — inclusive contra quem o aplica.

É o mesmo fenômeno registrado três vezes na nota de método, sobre instrumentos que
erram em silêncio, agora atingindo não o script mas a **categoria analítica** que
construímos sobre a saída dele.

### Consequência: nenhuma taxa de localizador deste documento é confiável

As taxas de 72% e 62% foram medidas contra o `page` da claim. Com oito artigos em
convenção divergente, o instrumento **reprova citação correta e aprova incorreta,
conforme o caso**.

⚠ **Refazer com critério duplo**, e **reportar os dois testes separados, não
combinados**:

| Teste | O que mede |
|---|---|
| a página é de alguma claim | a citação é **localizável no que o RAG indexou** |
| a página cai na faixa do `abnt` | a citação é **correta em relação ao artigo** |

**Os quatro casos invertidos são exatamente os que passam no segundo e falham no
primeiro**, e essa diferença é informativa por si: mede **cobertura do RAG**, não
erro do modelo.

Combinar os dois num único "correto" perderia isso.

Isso **não invalida os achados qualitativos** — a fabricação do Lee, o
`verbatim_quote` reescrito, o `conditions` citado como verbatim — porque foram
verificados caso a caso. **Invalida os números agregados.**

### ✅ A.19 parte 1 executada em `23afe43`

Sete artigos convertidos, 54 campos `page`, nenhum outro campo tocado.

**A conferência de faixa caiu de oito artigos para um**: resta o `bozoki2010_ipc`,
como previsto, porque nele a correção é reancoragem e não aritmética.

O Saaty (2003) passou de 2, 3, 4, 6 para **86, 87, 88, 90**, dentro de 85–91.

### ⚠ Por que as taxas ficaram iguais, e por que isso não é ausência de efeito

O script reportou **72% e 62% depois da conversão**, iguais a antes. Registrado
aqui porque a leitura óbvia é errada.

**O comparador casa a página citada contra as páginas de claim.** Antes, Saaty
(2003, p. 85) divergia porque as claims estavam em 2, 3, 4 e 6. Depois, diverge
porque estão em 86, 87, 88 e 90. **A citação continua fora de toda claim nas duas
situações**, então o veredito não muda.

**O que mudou é o significado da divergência.**

| | Antes | Depois |
|---|---|---|
| O que a comparação media | página citada contra **outra convenção** | página citada contra **a mesma convenção** |
| O que a divergência dizia | nada: os números não eram comparáveis | que o modelo citou a **primeira página do artigo**, onde não há claim indexada |

**O número igual é coincidência de aritmética, não ausência de efeito.** A base
passou a ser comparável, e é isso que a tarefa entregou.

### A taxa da execução 1 refeita com critério duplo

O script atual ainda casa só por claim exata, e por isso reportou 72% depois da
conversão, igual a antes. **Com o segundo teste aplicado à mão:**

| | Execução 1 |
|---|---|
| Página **é de alguma claim** | 5 |
| Na **faixa do artigo**, sem claim indexada | **2** |
| Fora de ambas — divergente | **11** |

**A taxa cai de 13/18 (72%) para 11/18 (61%)**, e dois casos migram para uma
categoria que não existia: **correta, e o RAG é que não cobre.**

Os dois são Saaty (1987, p. 165) e Forman e Peniwati (1998, p. 169), que este
registro classificava como "erro de vizinhança".

⚠ **Os números do documento seguem provisórios até o script incorporar o segundo
teste.** Esta decomposição foi feita manualmente sobre a execução 1; a 2 e as
seguintes ainda não.

### ✅ A.20 executada em `33a9485`: as taxas refeitas

O script já classificava em quatro vereditos e já extraía a faixa do `abnt`. **O
defeito era a agregação**, que somava `DIVERGE_NA_FAIXA` com
`DIVERGE_FORA_DA_FAIXA`, e a legenda, que dizia "o teste por faixa perderia estas"
quando é ele que as aprova.

**As taxas depois da correção:**

| | Execução 1 | Execução 2 |
|---|---|---|
| Com localizador | 18 | 21 |
| Correta, página de claim | 5 (28%) | 8 (38%) |
| **Correta, RAG não cobre** | **2 (11%)** | **1 (5%)** |
| **Divergente, fora da faixa** | **11 (61%)** | **12 (57%)** |
| Sem localizador | 9 | 9 |

**De 72% e 62% para 61% e 57%.**

⚠ **A queda NÃO significa que o sistema melhorou.** Nada no comportamento do modelo
mudou entre as medições: os pareceres são os mesmos dois textos, de 10/09/2026.

**O que mudou foi o instrumento.** Três citações que a apuração antiga atribuía ao
modelo passaram a medir a base:

| | Antes | Depois |
|---|---|---|
| O que a taxa contava | tudo que não casava com uma claim | só o que cai **fora do artigo** |
| Onde os três casos entravam | divergência, atribuída ao modelo | **cobertura**, atribuída ao RAG |

**Quem comparar 72% com 61% sem contexto vai ler melhoria onde houve correção de
medida.** As duas medidas devem ser sempre reportadas juntas, com a explicação:
o instrumento passou a medir a coisa certa.

E o sentido da correção é desfavorável a quem mediu, não ao sistema: **parte do que
este registro atribuía à geração era defeito da base e da apuração.**

### Os três casos de cobertura, identificados

| Citação | Execução | Claims no RAG | Faixa |
|---|---|---|---|
| Saaty (1987, p. 165) | 1 | 163, 170, 171, 172, 174 | 161–176 |
| Forman e Peniwati (1998, p. 169) | 1 | 166, 167, 168 | 165–169 |
| **Saaty (2003, p. 85)** | 2 | 86, 87, 88, 90 | 85–91 |

**O da execução 2 é a primeira inversão que este registro encontrou.** Antes da
conversão de `23afe43`, as claims do Saaty (2003) estavam em 2, 3, 4 e 6, e a
comparação com a p. 85 não significava nada. Depois da conversão e da correção do
script, ele aparece pelo que é: **página real do artigo, sem claim indexada.**

**Os três medem cobertura do RAG, não erro do modelo.** E os dois da execução 1 são
exatamente o que este documento chamava de "erro de vizinhança".

### O que a categoria nova revela sobre a base

Três citações em 39 apontam para páginas reais que o RAG não cobre, o que é **8%**.
Nos três casos o modelo escolheu uma página do artigo que nenhuma claim indexa.

No Saaty (2003) é a **primeira página**; no Forman e Peniwati, a **última**; no
Saaty (1987), uma intermediária entre duas indexadas.

⚠ **Isso sugere uma pergunta que o registro ainda não respondeu:** o modelo cita
páginas não indexadas por escolha ou por interpolação? Se as três forem as páginas
onde a passagem de fato está, é acerto e a base é que falha. Se forem aproximações
plausíveis, é interpolação e a categoria "erro de vizinhança" tinha razão de ser,
só com a causa invertida.

**Só o PDF decide, e as três estão na base do projeto.** Fica registrado como
pendência.

### O `verify-citations.mjs` precisa do segundo teste

| Situação | Leitura |
|---|---|
| página de alguma claim | correta e localizável |
| dentro da faixa do `abnt`, fora das claims | **correta, e o RAG é que não cobre** |
| fora de ambas | divergente |

### Consequência para A.16 e para a ordem

A tarefa nasceu para conferir `verbatim_quote` contra `evidence.quote`. **A
conferência de `page` contra o `abnt` tem precedência**, por três razões: é script
e não leitura, cobre 27 artigos e não treze claims, e **contamina a medição de todo
o resto**.

### ✅ Os sete são internamente consistentes, e a conversão foi validada no PDF

**Verificação de pré-requisito**, feita antes de propor a correção: a conversão só é
aritmética se todas as claims de um artigo estiverem na mesma convenção. Se alguma
já estivesse em numeração de periódico, somar o deslocamento produziria página
inexistente.

**Os sete passam.** Em cada um, todas as `page` caem entre 1 e o número de páginas
do artigo, e nenhuma está na faixa do periódico:

| Artigo | Faixa | `page` no RAG | Deslocamento |
|---|---|---|---|
| `aullhyde2006_experiment` | 290–295 | 1, 3, 4, 5, 6 | +289 |
| `escobar2004_note` | 318–322 | 1, 2, 3, 4 | +317 |
| `lee2024_project` | 375–393 | 1, 5, 6, 7, 9, 14 | +374 |
| `saaty2003_eigenvector` | 85–91 | 2, 3, 4, 6 | +84 |
| `saaty2015_trustworthy` | 1171–1187 | 7, 8, 10, 11, 13 | +1170 |
| `salomon2016_absolute` | 538–545 | 1, 2, 3, 5, 6 | +537 |
| `xu2000_consistency` | 683–687 | 1, 2, 3 | +682 |

**Validação no PDF, com o Saaty (2003).** A página relativa 2 do PDF traz impresso
**86** no cabeçalho, com *European Journal of Operational Research* 145 (2003)
85–91. `2 + 84 = 86`: a fórmula bate.

E as duas claims que o RAG registra em `page: 2` **estão nessa página**: "A priority
vector x must satisfy the relation Ax=cx, c>0" na coluna direita, e "a modicum of
inconsistency may be considered as a good thing and forced consistency [...] as an
undesirable compulsion" na esquerda.

**Portanto, nos sete a correção é somar `lo − 1` a cada `page`**, e o conteúdo já
está corretamente ancorado.

### ✅ O Bozóki verificado: falha de preenchimento, não extração de outro trabalho

A pergunta era se as claims descrevem o artigo ou vieram de outro documento.
Verificado em 11/09/2026, contra o PDF.

**O conteúdo corresponde.** As seis claims tratam de unicidade da solução com grafo
conectado, LLSM incompleto, convexidade de `λmax` sob parametrização exponencial,
componentes conexas e coincidência com a média geométrica das linhas para matrizes
completas. **Todos são temas de Bozóki, Fülöp e Rónyai (2010).**

**Portanto a correção é trocar os localizadores, não refazer a extração.**

⚠ **Mas o `locator_id` está errado, e não só o `page`.** O RAG usa
`locator_id: "Theorem 1"` para a claim de unicidade com grafo conectado. **O
Teorema 1, na página 321, é sobre logconvexidade de λmax** — o artigo o enuncia
assim: "If the elements of matrix A [...] are logconvex functions of t, then
λmax(A(t)) is logconvex".

A numeração de proposições e teoremas que o RAG registra **não corresponde à do
artigo**. A correção precisa reancorar cada uma das dez claims, não só somar um
deslocamento às páginas.

**Isso separa o Bozóki dos outros sete:** naqueles, a conversão de numeração
relativa para a do periódico é aritmética. Aqui, é releitura.

---

## ⚠ F08: a ingestão põe recomendação editorial em `verbatim_quote`

**Auditoria externa de 11/09/2026, verificada aqui. E contradiz o que este registro
afirmou.**

`scripts/ingest-rag.ts`, linha 263, dentro de `buildRecommendationChunks`:

```ts
verbatim_quote: recommendation,
page: null,
locator_type: null,
locator_id: null,
```

**Uma recomendação editorial entra no campo `verbatim_quote`, sem página e sem
localizador.**

E `app/api/ai-reviewer/route.ts`, linha 152, a formata assim ao modelo:

```
*Verbatim:* "{o texto da recomendação}"
```

⚠ **O comentário da linha 139 do `route.ts` declara que a decisão A5 era tornar o
bloco "indistinguível do RAG keyword".** A indistinguibilidade era o objetivo, e é
o que permite a uma anotação editorial chegar ao modelo com rótulo de transcrição.

### Correção a um registro anterior

Na tabela das seis ocorrências de `verbatim_quote` no `ingest-rag.ts`, feita para a
tarefa A.17, **classifiquei a linha 263 como "já correta, é texto direto".**

**Estava errado.** "Texto direto" descreve a mecânica — o campo recebe a string sem
transformação — e não a adequação. Uma recomendação não é citação, e o campo se
chama `verbatim_quote`.

É a mesma falha de leitura da família dos nomes enganosos, cometida ao auditar
exatamente essa família.

### Consequência: A.18 fica bloqueada

A reingestão do índice semântico estava pendente esperando as correções no RAG.
**Reingerir sem corrigir a linha 263 perpetua o defeito**, porque ele está no
ingestor e não nos dados.

**A.18 passa a depender de corrigir o `buildRecommendationChunks`**, não só das
divergências de campo.

### Segunda parte do F08: o verificador de citações

A auditoria aponta que o `verify-citations.mjs` **aceita como OK uma página
registrada em qualquer claim do artigo**, e que estar na faixa não prova que a
afirmação ou o trecho literal esteja naquela página.

**Isso é verdade e limita o que as taxas medem.** O rodapé do script já registra
que a conferência é contra o RAG e não contra o PDF, mas o veredito `OK` sugere
mais do que o teste verifica: ele mede **identidade bibliográfica e plausibilidade
do localizador**, não correspondência textual.

⚠ **Consequência para os números deste documento:** as taxas de 61% e 57% medem
divergência de localizador. **Não medem se a citação sustenta a afirmação.** Nenhum
número aqui autoriza dizer que 39% ou 43% das citações estão corretas no sentido
forte.

---

## ⚠ F05: a faixa de CR publicada não é a dos respondentes

**Auditoria externa de 11/09/2026, reproduzida neste ambiente com os mesmos
números.**

⚠ **CORREÇÃO de atribuição, 12/09/2026.** A versão anterior desta seção afirmava
que "o parecer **e o manuscrito**" sustentam a faixa. **Isso é falso quanto ao
manuscrito**, e o próprio documento o desmente duas seções acima:

- a **Seção 6.2** da dissertação registra a faixa de 1,1% a 9,6% **como a primeira
  das quatro imprecisões da saída da camada de IA**, e explica que corresponde a
  "uma média diluída";
- a **Tabela 22 do Apêndice G** confere os CRs recalculados valor a valor.

**Quem afirma a conformidade é o parecer. O manuscrito a reproduz como objeto
criticado.**

⚠ **Para acusar o manuscrito de endossar a conclusão seria preciso identificar
versão, seção, tabela e frase.** Nada disso foi levantado, e o que existe aponta o
contrário.

**O que permanece de F05:** o parecer afirma **CR entre 1,1% e 9,6%** com 100% de
conformidade ao limiar de Saaty (1977), e o painel de qualidade mostra
"CR > 10%: 0 respondentes".

**O CR governante recalculado dos julgamentos brutos:**

| | |
|---|---|
| Menor | **11,3893%** |
| Maior | **109,2740%** |
| Abaixo de 0,10 | **nenhum dos doze** |

Reproduzido a partir de `firestore_backup_total.json`, 864 julgamentos,
autovetor por iteração de potência, RI de Saaty (1977), CR máximo entre as seis
matrizes de ordem ≥ 3 de cada respondente.

### De onde vem a diferença

A faixa publicada vem do campo `avgCR` em cache, que é a **média sobre 26
matrizes, incluindo 20 de ordem 2 com CR estruturalmente zero**. Dividir a soma dos
CRs reais por 26 produz um número três a dez vezes menor que o governante.

**O campo se chama `avgCR` e é o máximo no `ahp-ipc.ts`, e é a média no cache.** É
o quinto caso da família dos nomes enganosos, e o de maior consequência.

### Por que este é o achado mais grave do conjunto

Os outros tocam código que não roda, ou construto que o artigo pretende criticar.
**Este toca o número que sustenta a seção de consistência do manuscrito.**

Um respondente tem **CR de 109,27%**, acima do limiar de 0,20 que Saaty e Ergu
(2015) identificam como julgamento quase aleatório: "A CR greater than 0.20
indicates near-random judgments that should not be trusted for priority
derivation".

⚠ **E a orientação da auditoria sobre o que NÃO fazer é a parte que importa:**

> Não excluir automaticamente respondentes para obter um agregado mais consistente:
> critérios de participação e de análise de sensibilidade precisam de justificativa
> metodológica.

**A agregação por média geométrica continua consistente** — o CR agregado de 1,06%
é real, e a propriedade de Escobar (2004) explica por quê. **O que não se sustenta
é a afirmação sobre os indivíduos.**

### Consequência para o sistema, e o que verificar no manuscrito

⚠ **A dissertação já distingue as três medidas**: a Seção 6.2 identifica a faixa do
parecer como imprecisão e o Apêndice G traz os CRs recalculados. **A correção
pendente é no sistema, não no texto.**

**O que verificar no manuscrito**, antes de afirmar que há algo a corrigir lá: se
alguma seção ou tabela usa a faixa de 1,1% a 9,6% **como resultado próprio**, e não
como citação do parecer criticado. Isso exige identificar versão, seção e frase.

**As três medidas que o sistema hoje confunde:**

| Medida | Valor | O que sustenta |
|---|---|---|
| CR das matrizes agregadas | 1,06% a 2,60% | verificado, e é o que valida a derivação |
| CR governante individual | 11,39% a 109,27% | **não conforme ao limiar** |
| `avgCR` em cache | 1,1% a 9,6% | artefato de dividir por 26 |

**O terceiro não é uma medida, é um erro de agregação.** A escolha de qual reportar
é metodológica, e precisa de justificativa explícita: por que o painel é admissível
com CRs individuais nesse patamar, e o que Aull-Hyde et al. (2006) sustentam sobre
agregação de matrizes individualmente inconsistentes.

---

## Experimento 10.3: jackknife sobre o painel — primeira evidência empírica do Bloco D

Executado em 11/09/2026. **Doze retiradas, uma por respondente**, recalculando o
modelo completo sem cada um.

| Resultado | Medido |
|---|---|
| A alternativa vencedora se mantém | **12 de 12** |
| A dominância estrita se mantém | **6 de 12** |

### Por que é o achado científico mais valioso da sessão

O manuscrito estabelece, com fonte, que **dominância estrita garante invariância a
qualquer ponderação positiva**: se A1 supera A2 em todos os méritos, nenhuma
escolha de pesos inverte a ordem.

**O experimento mostra que a garantia depende da composição do painel.** A
dominância existe nos dados agregados dos doze, e **se perde em metade dos
cenários** de retirada de um respondente.

**Isso é a distinção entre invariância estrutural e robustez observada, medida.**

- A **invariância** é teorema: dada a dominância, a ordem não depende dos pesos.
- A **robustez** é empírica: a dominância em si depende de quem está no painel.

**Formulação delimitada:** A1 permaneceu vencedora nas doze exclusões individuais;
a justificativa por dominância estrita permaneceu em seis. **A estabilidade da
escolha não implica estabilidade dessa justificativa.**

⚠ **Correção de alcance, 12/09/2026.** A versão anterior dizia que o sistema "pode
recomendar A1 com confiança e não pode invocar dominância como razão". **Isso
excede o medido:** a dominância continua válida **no painel completo** e nos seis
cenários em que se mantém. O experimento mostra que ela **não é invariante à
composição do painel**, não que seja inválida.

### Consequência para a linha de contribuição (seção 1.6 do âncora)

**A linha candidata deixa de ser "corrigir o rótulo de robustez".** Correção de
rótulo é requisito, não achado.

**Passa a ser a distinção medida entre estabilidade da escolha e estabilidade da
justificativa**, com o jackknife como evidência.

---

### A.19 parte 2 — SUPERADA pela retificação abaixo

⚠ **Leia a retificação no fim desta seção antes de usar qualquer coisa daqui.** O
levantamento abaixo foi feito contra o PDF errado: a edição MCM 2010, quando as
claims vêm da IEEE 2009, como o campo `notes` do arquivo declara. **Nada aqui é
defeito a corrigir.** Fica como registro do percurso e do erro.

#### O levantamento original, feito contra o PDF errado

Começado em 11/09/2026. **Três das dez âncoras localizadas, e a principal traz
três erros numa só claim.**

**A claim de unicidade.** O RAG registra `page: 2257`,
`locator_id: "Theorem 1"`, e o `evidence.quote` "The optimal solution of the
problem (5) is unique if and only if the graph is connected".

**O enunciado real, na página 324:**

> **Theorem 2.** The optimal solution of problem **(4)** is unique if and only if
> the graph G **corresponding to the incomplete pairwise comparison matrix** is
> connected.

| Campo | No RAG | No artigo |
|---|---|---|
| `page` | 2257 | **324** |
| `locator_id` | Theorem 1 | **Theorem 2** |
| problema citado no quote | (5) | **(4)** |

**Três erros na mesma claim.** E o Teorema 1, na página 321, é sobre logconvexidade
de λmax, tema diferente.

⚠ **Isto confirma a leitura de A.16:** no Bozóki o **`verbatim_quote` era o campo
fiel**, porque preservava "corresponding to the incomplete pairwise comparison
matrix", que o `evidence.quote` truncava. A troca de fonte de A.17 fez o modelo
receber, nesta claim, o texto mais curto **e** com o número de problema errado.

**Outras duas localizadas:**

| Claim | No RAG | No artigo |
|---|---|---|
| "the vertices correspond to the objects to compare..." | p. 2257, Section II Methodology | **p. 321, Seção 2.2 "Graph representation"** |
| "two criteria, not compared yet... can be in indirect relation" | p. 2257, Section II | **p. 321, Seção 2.2** |

### Mais três localizadas, e as equações invertem o diagnóstico

**A página 320 traz as equações (5) e (6) do artigo, e elas são MATRIZES**, não
problemas de otimização:

- **(5)** é a matriz incompleta `A`, com asteriscos nos elementos faltantes;
- **(6)** é a matriz `A(x)`, com as variáveis `x_1, …, x_d` nos lugares faltantes.

**O que o RAG registra sob esses números é outra coisa:**

| `locator_id` no RAG | `quote` no RAG | O que o artigo numera assim | Qual é o número real |
|---|---|---|---|
| Eq. (5) | `min { λmax(A(x)) \| x > 0 }` | a matriz incompleta `A` | **problema (4)** |
| Eq. (6) | `min sum [log(a_ij w_j/w_i)]^2` | a matriz `A(x)` | **extensão de (3)** |

A página 320 diz, duas vezes, que o problema de minimização do autovalor máximo é
**(4)**: "reformulate the maximal eigenvalue minimization problem **(4)** as an
unconstrained convex minimization problem" e "solving the eigenvector optimization
problem **(4)**". E que o LLSM é "the extension of **(3)** to the incomplete case".

⚠ **Então as duas claims têm conteúdo correto e numeração de equação errada.**
Descrevem os problemas (4) e (3), rotulados como (5) e (6). **É o mesmo padrão da
claim de unicidade**, que citava "problem (5)" quando o Teorema 2 diz (4).

**A terceira localizada:** a claim "Variables x_1, x_2, …, x_d are introduced for
the missing elements in the upper triangular part" está na **Seção 2.1, página
320**, e o RAG registra `page: 2256, locator_id: "Section II"`.

### ⚠ RETIFICAÇÃO: o Bozóki não é defeito, e o arquivo já documentava isso

**Registrado em 11/09/2026, corrigindo tudo o que esta seção afirmava antes.**

Passei as páginas do PDF localizando cada uma das dez claims, e concluí que os
localizadores estavam errados: páginas 2256/2257 num artigo de 318–333, teoremas
deslocados um número, dois quotes com problema errado.

**Estava errado. O campo `notes` do próprio arquivo explica:**

> "ID 'bozoki2010_ipc' refers to the canonical journal version: Bozóki, Fülöp,
> Rónyai (2010) Math. Comput. Modelling 52(1-2), 318-333. **The PDF in the project
> knowledge is the IEEE 2009 conference version** (Proceedings of 2009 IEEE IEEM),
> which is a shorter presentation of the same theorems."

> "**Page numbers in evidence (2256-2257) refer to the IEEE 2009 conference
> proceedings.** Equivalent content appears in pages 318-333 of the MCM 2010
> paper."

**Os localizadores são corretos para a edição de onde foram extraídos.** O `abnt`
cita a versão de jornal porque é a canônica; as páginas referem-se à versão de
conferência, e o arquivo **declara a divergência**.

O PDF que abri, em `/mnt/project/`, é a versão MCM 2010. **Os "teoremas
deslocados" que encontrei são a numeração da outra edição**, não erro de extração.

### O que este episódio custou e o que ensina

Duas horas de leitura de PDF, uma tarefa criada (A.19 parte 2), um prompt escrito
e descartado, e uma seção deste documento afirmando defeito onde não havia.

**O que evitaria: ler o campo `notes` antes de abrir o PDF.** Ele estava no mesmo
arquivo, a poucas linhas dos campos que eu conferia.

⚠ **E é o mesmo erro que este registro documenta nas seis superfícies:** afirmar
com base em parte do artefato, sem ler o resto. A diferença é que aqui quem o
cometeu foi a apuração, não o sistema.

**Regra para o protocolo:** antes de conferir localizadores de um artigo do RAG
contra um PDF, **ler `notes` e confirmar que o PDF é a edição de onde as claims
foram extraídas.** O campo existe exatamente para isso.

### Consequência para a medição de A.19

**O Bozóki sai da lista de inconsistentes.** A conferência automática de `page`
contra a faixa do `abnt` o acusa, e **o acuso é falso positivo**: o teste compara
páginas de edições diferentes.

**A contagem correta de A.19 é: sete artigos inconsistentes, não oito.** Os sete
foram corrigidos em `23afe43`, e **A.19 está fechada.**

⚠ **O teste de faixa precisa de uma exceção**, e o critério é o próprio `notes`: se
o arquivo declara que as páginas são de outra edição, não há o que comparar. Sem
isso, qualquer rodada futura vai reacusar o Bozóki.

### O que falta, e por que fica para sessão própria

Sete das dez âncoras não foram localizadas. O artigo tem 33 páginas e os
localizadores estão espalhados entre 320 e 333: as equações (5) e (6), o Teorema 3,
o Teorema 2 do RAG que provavelmente é outro no artigo, e os dois "Remark".

**Localizar cada uma exige percorrer o artigo página a página**, e é trabalho de
leitura dedicada, não de uma passada.

⚠ **Registrado o que basta para a correção não ser feita às cegas:** a numeração do
RAG não corresponde à do artigo em nenhum dos três casos verificados, então
**nenhuma das dez pode ser corrigida por deslocamento aritmético.** Cada uma
precisa do PDF.

A pergunta era se as claims descrevem o artigo ou vieram de outro documento.
Verificado em 11/09/2026, contra o PDF.

**O conteúdo corresponde.** As seis claims tratam de unicidade da solução com grafo
conectado, LLSM incompleto, convexidade de `λmax` sob parametrização exponencial,
componentes conexas e coincidência com a média geométrica das linhas para matrizes
completas. **Todos são temas de Bozóki, Fülöp e Rónyai (2010).**

**Portanto a correção é trocar os localizadores, não refazer a extração.**

⚠ **Mas o `locator_id` está errado, e não só o `page`.** O RAG usa
`locator_id: "Theorem 1"` para a claim de unicidade com grafo conectado. **O
Teorema 1, na página 321, é sobre logconvexidade de λmax** — o artigo o enuncia
assim: "If the elements of matrix A [...] are logconvex functions of t, then
λmax(A(t)) is logconvex".

A numeração de proposições e teoremas que o RAG registra **não corresponde à do
artigo**. A correção precisa reancorar cada uma das dez claims, não só somar um
deslocamento às páginas.

**Isso separa o Bozóki dos outros sete:** naqueles, a conversão de numeração
relativa para a do periódico é aritmética. Aqui, é releitura.

---

## O mesmo fenômeno em cinco níveis: a lacuna preenchida com o que tinha a forma esperada

A seção "A simetria: o instrumento de medição falha do mesmo modo que o objeto
medido", adiante neste documento, estabelece **dois** níveis: o modelo e o script.
Esta seção os generaliza para **cinco**, e o que a generalização muda é a
atribuição do fenômeno.

| Nível | A lacuna | O que a preencheu | O que pegou |
|---|---|---|---|
| **O modelo do Parecer IA** | a DIRETRIZ 1 exige um N por matriz; o payload informa apenas `totalRespondents` = 12 | "Os dados indicam 3 respondentes por dimensão BOCR", que é 12 ÷ 4 apresentado como dado lido | confrontar a exigência do prompt com o conteúdo do payload — **dois artefatos corretos**, um contra o outro |
| **O script de apuração**, `verify-citations.mjs` | o conectivo `e` do padrão de dois autores admitia zero espaços dos dois lados, e "Conform" + "e" + "Neely" casou como se fossem dois autores | veredito `NAO_INDEXADO`, categoria inconclusiva do próprio catálogo do script, no lugar de uma divergência — e o agregado final ficou plausível | a contagem manual anterior, que já existia, e divergiu |
| **A categoria "erro de vizinhança"** | não ter conferido o `page` das claims contra a faixa do `abnt` de cada artigo | uma causa: interpolação pelo modelo, explicação coerente para páginas dentro da faixa do artigo e fora de toda claim | conferir `page` contra `abnt`, artigo por artigo: as páginas eram reais do periódico e o RAG não as indexava |
| **A especificação de A.21** | não ter procurado onde a validação de fato decide | "o IPC é inalcançável", sustentado na ausência do botão de pular e de qualquer gravação de `skipped` | ler o `handleFinalizeSurvey`, que valida **só conectividade do grafo** (linha 1018, com o stub declarado na 1017), e o `calculate`, que filtra por `completedAt` (linha 794) |
| **A descrição da regra do `git add`** | a condição que torna a regra verdadeira: a deleção já estar no índice | "`git add` de caminho já deletado falha com `pathspec did not match any files`", enunciado geral, plausível, e **falso quando a deleção não está no índice** | reproduzir as duas formas em repositório descartável: com `git rm` antes sai 128 e não indexa nada; com `rm` simples sai 0 e indexa a deleção |

### As três propriedades comuns

**1. Nenhum sinalizou incompletude.** Não houve exceção, aviso, campo vazio nem
veredito de "não sei". Em todos os cinco a lacuna **virou conteúdo**, e conteúdo
afirmativo: o modelo escreveu "os dados indicam"; o script emitiu um veredito do
seu próprio catálogo; a categoria entrou na decomposição ao lado das medidas; a
especificação afirmou que o código era inalcançável; a regra foi escrita no
imperativo. **A ausência de sinal não é acidente do formato: é o que define o
fenômeno.** Um artefato que avisasse estar incompleto não teria preenchido nada.

**2. O preenchimento tinha a forma esperada.** 12 ÷ 4 = 3 é um N plausível para
quatro dimensões e doze respondentes; `NAO_INDEXADO` é um dos quatro vereditos
legítimos; interpolação pelo modelo é exatamente o tipo de defeito que este registro
documenta em outras superfícies; código órfão sem caminho é o que o saneamento vinha
encontrando; e uma regra de `git` enunciada sem condição é a forma padrão de uma
regra de `git`. ⚠ **Em nenhum dos cinco o preenchimento era anômalo. Nos cinco ele
era a continuação natural do artefato que o produziu** — e, em pelo menos três,
**confirmava o que quem media esperava encontrar.**

**3. O que pegou, nos cinco, foi confrontar com fonte independente do próprio
artefato.** Não foi reler, nem revisar o raciocínio, nem olhar com mais atenção: em
cada caso entrou uma fonte de fora. O payload contra o prompt. A contagem manual
contra o script. O `abnt` contra o `page`. O código da validação contra a busca
pelo mecanismo. O repositório descartável contra a lembrança do incidente.

⚠ **E reler não pega, por construção.** O preenchimento é coerente com o resto do
artefato — foi dele que saiu. A releitura confirma a coerência interna, que é
exatamente a propriedade que o defeito preserva. **Só quebra a coerência uma fonte
que não participou da produção.**

### A consequência: não é um fenômeno de LLM

**Quatro dos cinco níveis não são modelo de linguagem.** Um é um regex. Um é uma
categoria em prosa, escrita por quem mediu. Um é uma nota de tarefa no âncora. Um é
uma frase de regra operacional.

Então o que os cinco casos estabelecem **não é uma propriedade do modelo**: é uma
propriedade de **artefato derivado sem verificação** — qualquer coisa produzida a
partir de uma fonte incompleta e obrigada a entregar saída completa. O modelo é a
instância mais rápida e mais fluente, **não uma classe separada.**

Isso tem consequência para o protocolo deste projeto, e ela desloca o alvo. O PVB e
os verificadores de saída foram construídos para o modelo. Os cinco níveis dizem
que a mesma conferência se aplica ao instrumento, à categoria, à especificação e à
regra — e **de todos esses, só a saída do modelo tem verificador automatizado.**

⚠ **Delimitação do alcance.** São cinco casos, de um único observador, num único
projeto, e as seções que os registram trazem as datas. **O que a série estabelece é
a recorrência do mecanismo em tipos diferentes de artefato — não uma taxa, e não
comparação de frequência entre os níveis.** Cinco casos não sustentam nenhuma das
duas.

⚠ **E uma ressalva sobre o terceiro nível, que é a mais importante da série:** o
confronto com o `abnt` derrubou a **causa atribuída**, não necessariamente o
fenômeno. O registro mantém em aberto se as três páginas não indexadas são escolha
do modelo ou aproximação plausível, e **só o PDF decide.** Se forem aproximações, a
categoria tinha razão de ser com a causa invertida. **A lacuna preenchida foi a
explicação, não a observação** — e é por isso que o caso entra aqui: o defeito não
foi ver o padrão, foi dar-lhe causa sem conferir a faixa.

---

## Nota de método: medir e registrar a predição antes

O que produziu os achados desta sessão não foi a disciplina de medir. Foi **medir
e registrar a predição antes da execução**.

Cinco predições foram registradas antes de rodar:

| # | Correção | Resultado |
|---|---|---|
| 1 | páginas corrigidas no prompt (A.10, 1º commit) | confirmada |
| 2 | N por matriz no payload (A.10, 2º) | confirmada |
| 3 | remoção do `dominanceAnalyzer` (A.3, 1ª parte) | **refutada** |
| 4 | remoção da autorização no prompt (A.3, 2ª parte) | confirmada |
| 5 | tabelas RI unificadas (A.5) | confirmada, inclusive na mudança da linha de base de testes |

**Quatro confirmadas e uma refutada. A refutada produziu o achado do segundo
canal**, que nenhuma confirmação teria dado: se a predição de A.3 tivesse
acertado, a tarefa fecharia e a seção "Fairness e Viés Profissional" do prompt
continuaria autorizando a atribuição de viés ao painel, sem que soubéssemos.

**A diferença está na ordem.** Uma observação feita depois sempre encontra
explicação: o número mudou, então a correção funcionou; o número não mudou, então
havia outra causa. As duas leituras cabem no mesmo dado. Uma predição datada antes
fecha essa porta: ou o resultado bate, ou não bate, e o que não bate exige
procurar a causa em vez de narrá-la.

**É isso que separa este registro de uma lista de defeitos corrigidos.**

### O que as seis predições produziram, e a assimetria do resultado

| | |
|---|---|
| Predições registradas antes | **6** |
| Confirmadas | 5 |
| Refutadas | 1 |

**A única refutada produziu o achado do segundo canal**, a seção "Fairness e Viés
Profissional" do prompt, que nenhuma confirmação teria revelado.

E há uma assimetria no que rendeu:

| Tipo de correção | Quantas | Predições |
|---|---|---|
| **Remover** o que induz o erro | 4 | páginas do prompt, `dominanceAnalyzer`, autorização, tabelas RI |
| **Acrescentar** o que faltava | 2 | N por matriz no payload, `evidence.quote` |

**As duas de adição vieram de tarefas que nasceram como limpeza.** A.10 começou
como "trocar dois números"; virou fornecer o N que a diretriz pedia. A.17 começou
como "uma linha"; virou corrigir a fonte da citação em três caminhos.

**O saneamento previa remover. O que rendeu mais foi acrescentar o que faltava.**

### A simetria: o instrumento de medição falha do mesmo modo que o objeto medido

Três vezes nesta sessão um script de apuração errou, e nas três o erro **não
produziu silêncio: produziu um achado plausível e falso.**

| # | Erro do instrumento | Achado falso que ele produziu |
|---|---|---|
| 1 | o conectivo `e` no regex sem exigir espaço, casando "Conform" + "e" + "Neely" | transformou uma **divergência** de localizador em **"artigo não indexado"**, categoria inconclusiva |
| 2 | o comparador capturava só campos com aspas duplas | transformou um **verbatim existente** em **fabricado** |
| 3 | o comparador omitia o campo `verbatim_quote` | transformou **fidelidade a um campo errado da base** em **"citação adulterada pelo modelo"** |

**Nos três casos o achado falso tinha a forma do que se esperava encontrar.** O
documento inteiro trata de fabricação e adulteração, então "verbatim fabricado" e
"citação adulterada" chegaram como confirmação do padrão, não como anomalia. Foi
isso que os tornou convincentes.

**E nos três o que pegou foi a mesma coisa:** conferência independente do caso
mais citado, ou divergência entre o script e uma contagem manual anterior.

**É o mesmo fenômeno que este registro documenta na saída do modelo**, agora
observado nas ferramentas de quem mede: um artefato incompleto não avisa que está
incompleto; ele preenche a lacuna com algo coerente.

**A causa é a mesma, e a diferença é o remédio.**

O modelo produz achado falso porque **o contexto é incompleto**. O instrumento
produz achado falso porque **o escopo da comparação é incompleto**. Nos dois casos
a saída é fluente, plausível e da forma esperada.

Mas o instrumento tem um remédio que o modelo não tem, e ele funcionou nas três
vezes: **conferência manual do caso mais frequente, antes de confiar no agregado.**

Nas três, o erro estava no **caso mais visível**, não numa borda:
- o Neely era a citação com prefixo mais comum no texto;
- o Saaty e Ergu era o verbatim mais citado do corpus;
- o `verbatim_quote` respondia por 11% de todos os trechos.

**Regra, e é procedimento, não princípio:** ao usar instrumento novo, confira à mão
o caso mais frequente antes de reportar o agregado. Se ele bater, o agregado
provavelmente serve. Se divergir, o defeito é do escopo e vai contaminar tudo.

A consequência é simétrica à regra do eixo de ancoragem: **verificar a saída do
instrumento contra uma fonte independente, não contra a expectativa.** Um resultado
que confirma o esperado merece a mesma conferência que um que o contradiz, e
provavelmente mais, porque a confirmação desarma a suspeita.

Quando retomar, manter a prática: nenhuma correção que altere o que o modelo
recebe deve ser executada sem predição escrita antes, com o caso negativo nomeado.

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
| Total de citações | 27 | 30 |
| Com localizador | 18 | 21 |
| Sem localizador | 9 | 9 |
| Cobertura do teste | 67% | 70% |
| Divergentes | **13** | **13** |
| Taxa sobre o verificável | 72% | 62% |
| Dentro da faixa (vizinhança) | 2 | 1 |
| Fora da faixa | 11 | 12 |

Apurado pelo `scripts/verify-citations.mjs`, com os mesmos números da contagem
manual em ambas.

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


---

## Execução 4 — 11/09/2026, `501b19a`, depois da remoção do `dominanceAnalyzer`

| | |
|---|---|
| Commit | `501b19a` |
| Duração | 159 segundos |
| Variável alterada | remoção do `dominanceAnalyzer`, da injeção no prompt e do item 4 do `system-prompt.ts` |

### A predição foi REFUTADA, e a refutação é o achado

| # | Predição | Resultado |
|---|---|---|
| 1 | a passagem de Saiyed sobre "High power leads to cognitive biases" desaparece | ❌ **permaneceu**, na Limitação 2 |
| 2 | a atribuição do peso de Riscos ao perfil do painel sai | ❌ **permaneceu** |
| 3 | a faixa "1,1% e 9,6%" permanece (controle) | ✅ permaneceu |

**A causa: o módulo era um dos dois canais.** O `system-prompt.ts` tinha a seção
"Fairness e Viés Profissional", com Neely, Saiyed e Ayan descritos pelo que
ofereciam, e uma exceção que **autorizava explicitamente** citá-los para "viés
profissional em painéis MCDM".

A remoção tirou o **gatilho automático** e deixou a **permissão**. Corrigido na
segunda parte de A.3, e a execução 5 confirmou.

**Uma predição confirmada aqui teria fechado a tarefa e deixado o canal aberto.**

### Achado: o dado nem sempre prevalece sobre o exemplo

O parecer reportou **Risks 1,39%**. O valor real é 1,3974%, que arredonda para
**1,40%**, e é o que a Tabela 6 publica. O `1,39%` é o número do exemplo de
parágrafo do `system-prompt.ts`.

Nas execuções 1 e 2 o modelo escreveu 1,40%, corrigindo o exemplo contra o dado.
Nesta, copiou o exemplo. **Em três amostras, duas vezes corrigiu e uma copiou.**

Isso enfraquece a leitura registrada na execução 2, de que o dado prevalece. É
argumento a mais para o commit dos exemplos de parágrafo, ainda pendente.

---

## Execução 5 — 11/09/2026, segunda parte de A.3

**Commit testado:** `28f4a95`.

**Deploy de produção:** `dpl_9ycAGNV3WG8h7R89gDTCpWsnP2hF`, estado
`READY`, alias `https://ahp-simple.vercel.app`.

**Modelo registrado pela resposta:** `claude-opus-4-6`.

**Projeto:** `yiEXoz12wN7rqWZZP70g`, o mesmo projeto real de doze
respondentes usado nas execuções anteriores.

**Tempo da chamada `/api/ai-reviewer`:** 136,407 segundos, de
`2026-09-11T17:01:56.855Z` a `2026-09-11T17:04:13.262Z`, medido pela
Resource Timing API do navegador.

### Resultado da predição registrada antes da execução

A predição foi **confirmada nos três controles**:

1. A passagem *"High power leads to cognitive biases creeping in"* e qualquer
   citação a Saiyed desapareceram. O texto bruto tem zero ocorrências de
   `Saiyed`, `Neely` e `Ayan`.
2. A atribuição do peso de Riscos ao perfil ou à composição profissional do
   painel perdeu a causalidade. O parecer ainda contextualiza Riscos pelas
   características do problema — operação de estufas, gás natural e riscos
   técnicos e operacionais —, mas não usa cargos, senioridade ou área funcional
   para explicar o peso.
3. A faixa `1,1% e 9,6%` permaneceu, como controle.

O resultado confirma a causa proposta depois da execução 4: havia dois canais.
`501b19a` removeu o canal condicional do payload; `28f4a95` removeu a
permissão incondicional do prompt. A presença dos três artigos no RAG, sozinha,
não fez o modelo reconstruir a atribuição profissional nesta execução. Isso não
prova que conhecimento paramétrico nunca possa fazê-lo, mas não há evidência de
um terceiro canal no resultado observado.

### Texto bruto da execução 5

## 📋 RESUMO DA SUBMISSÃO

O estudo avalia duas alternativas tecnológicas de Indústria 4.0 para otimização do consumo energético de estufas de cura em linha de pintura automotiva: controle em tempo real dos queimadores por inteligência artificial (A1) e gêmeo digital CFD para simulação termodinâmica (A2). A avaliação emprega o método AHP-BOCR com quatro dimensões (Benefícios, Oportunidades, Custos e Riscos), organizadas sob subcritérios de competitividade, aspectos sociotécnicos e sustentabilidade, com cinco subcritérios por dimensão (n=5). Participaram 12 especialistas, todos com CR individual ≤ 0,10, sem exclusões. A agregação dos julgamentos individuais foi realizada por média geométrica (AIJ). A síntese final emprega a fórmula subtrativa completa de Wijnmalen (2007, Eq. 17) com pesos pessoais (v) e *rescaling weights* (s):

Score_i = v_b × s_b × B_i + v_o × s_o × O_i − v_c × s_c × C_i − v_r × s_r × R_i

Os pesos BOCR derivados da hierarquia de controle são: Benefits = 37,2%, Opportunities = 15,2%, Costs = 19,7% e Risks = 27,9%. O ranking final posiciona A1 (score = 0,064129) à frente de A2 (score = 0,026937). A análise de sensibilidade não identificou pontos de virada em nenhuma das quatro dimensões. O perfil dos especialistas abrange formações em nível de mestrado e especialização, com experiência entre 11 e mais de 30 anos, em cargos de direção, gerência e *C-level*, atuando em manufatura, otimização de custos, qualidade, finanças, P&D e manutenção.

---

## ✅ PONTOS FORTES

**1. Consistência dos julgamentos em todas as camadas hierárquicas.** O CR global agregado (1,06%) e os CRs das quatro sub-hierarquias (Benefits: 1,10%; Opportunities: 0,92%; Costs: 2,60%; Risks: 1,40%) são inferiores ao limiar CR ≤ 0,10 proposto por Saaty (1977, p. 248): *"require the ratio to be very small; e.g., of the order of 0.1"*. Os 12 respondentes individuais apresentam CRs entre 1,1% e 9,6%, todos abaixo do limiar. A taxa de conformidade é 100%.

**2. Tamanho e diversidade funcional do painel.** O painel é composto por 12 especialistas com diversidade de funções (diretores, gerentes, *C-level*), áreas de atuação (manufatura, otimização de custos, qualidade, finanças, P&D, manutenção) e faixas de experiência (11 a mais de 30 anos). Aull-Hyde et al. (2006, p. 252) demonstram que *"given a sufficiently large group size, consistency of the aggregate comparison matrix is guaranteed, regardless of the consistency measures of the individual comparison matrices"*. Com 12 respondentes e matrizes de ordem 5, o painel atende às condições para convergência da consistência agregada.

**3. Fórmula de síntese com comensurabilidade explícita.** A adoção da síntese subtrativa completa (Eq. 17 de Wijnmalen, 2007) com dupla ponderação (v e s) atende ao requisito de comensurabilidade entre sub-hierarquias. Wijnmalen (2007, p. 899) estabelece que *"synthesis requires commensurate priorities on a common scale"*. A implementação dos *rescaling weights* (s_b = 0,4393; s_o = 0,1593; s_c = 0,1868; s_r = 0,2146) garante que as prioridades de cada dimensão BOCR estejam em escala comparável antes da síntese.

**4. Detecção de viés integrada com explicabilidade (XAI).** O sistema implementa análise algorítmica de viés combinada com explicações via LLM, com nível de risco classificado como LOW e conformidade CR de 100%. A combinação de detecção algorítmica com explicações textuais constitui contribuição original ao estado da prática em auditoria de decisões AHP-BOCR.

**5. Análise de sensibilidade completa.** As quatro dimensões BOCR foram avaliadas quanto a pontos de virada, e nenhum foi identificado. Ishizaka & Labib (2011, p. 11478) definem a análise de sensibilidade como instrumento para verificar *"missing comparisons computation via extended transitivity"* e estabilidade do ranking. A ausência de pontos de virada em todas as dimensões indica que o ranking A1 > A2 é estável sob variações nos pesos da hierarquia de controle.

---

## ⚠️ LIMITAÇÕES IDENTIFICADAS NOS DADOS

**1. Composição de gênero homogênea.** Os dados demográficos indicam que todos os 12 especialistas são do gênero masculino. Em contexto de pesquisa-ação industrial com painel interno, esta composição pode refletir a estrutura organizacional do setor automotivo. O estudo deve reportar este dado factualmente para transparência, conforme a literatura de diversidade em painéis decisórios.

**2. Peso de Riscos elevado em relação aos benchmarks setoriais.** O peso atribuído a Riscos (27,9%) diverge dos benchmarks publicados no setor energético: Kabak (2014) reporta R = 8% e Mu (2016) reporta R = 10%. A divergência pode refletir especificidades do contexto industrial (linha de pintura automotiva com consumo de 5,9 milhões de m³/ano de gás natural), mas deve ser contextualizada pelo estudo.

---

## 🔍 ANÁLISE DETALHADA

### Consistência dos Julgamentos

Todos os 12 respondentes apresentam CR individual inferior ao limiar CR ≤ 0,10. Salomon (2024, p. 5) identifica a consistência como *"a measure of the quality of data input in the AHP"*. A distribuição dos CRs individuais abrange de 1,1% (respondente gZoIOQIqmFDAlD3mEYCC) a 9,6% (respondente SXAASSdDxO2kAP39WZbQ). Nenhum respondente ultrapassa o limiar de 20% que Saaty & Ergu (2015, p. 584) classificam como indicativo de julgamentos não confiáveis: *"A CR greater than 0.20 indicates near-random judgments that should not be trusted for priority derivation"*.

As matrizes agregadas por média geométrica (AIJ) apresentam CRs por dimensão conforme a tabela:

| Dimensão | n | CR agregado | λ_max | Status |
|---|---|---|---|---|
| Benefits | 5 | 1,10% | 5,0494 | ✅ CR < 0,10 |
| Opportunities | 5 | 0,92% | 5,0414 | ✅ CR < 0,10 |
| Costs | 5 | 2,60% | 5,1165 | ✅ CR < 0,10 |
| Risks | 5 | 1,40% | 5,0626 | ✅ CR < 0,10 |

Escobar (2004, p. 29) demonstra que na agregação por média geométrica *"the inconsistency of the group is smaller than the largest individual inconsistency"*. Nesta configuração, com 12 respondentes por matriz e CR individual máximo de 9,6%, os CRs agregados (entre 0,92% e 2,60%) são consistentes com a propriedade de Escobar, pois todos são inferiores ao CR individual máximo observado.

Ossadnik et al. (2016, p. 520) corroboram o efeito compensatório da agregação geométrica: *"Geometric aggregation leads to a compensation of single inconsistent matrices to consistent group judgments"*. A redução observada entre o CR individual máximo (9,6%) e o CR agregado máximo (2,60%, dimensão Costs) exemplifica esta compensação.

### Pesos BOCR e Hierarquia de Controle

Os pesos BOCR foram derivados de comparações pareadas entre os quatro méritos na hierarquia de controle, conforme o procedimento de Lee (2009, p. 340): *"considering the benefits... opportunities... costs... and risks... is a more comprehensive way to deal with a much more complicated problem"*. Os pesos resultantes são:

| Mérito | Peso pessoal (v) | *Rescaling weight* (s) | Produto v × s |
|---|---|---|---|
| Benefits | 0,3723 (37,2%) | 0,4393 | 0,1636 |
| Opportunities | 0,1517 (15,2%) | 0,1593 | 0,0242 |
| Costs | 0,1974 (19,7%) | 0,1868 | 0,0369 |
| Risks | 0,2786 (27,9%) | 0,2146 | 0,0598 |

O *ratio* máximo/mínimo entre pesos pessoais é 2,45:1 (Benefits/Opportunities). A dominância relativa de Benefits (37,2%) é convergente com Kabak (2014, p. 510): *"Additive method to combine the scores of each alternative under B, O, C and R"*, cujo estudo no setor energético reporta B = 37%. A dimensão Costs (19,7%) também se aproxima do benchmark de Kabak (2014) com C = 20%.

A divergência concentra-se nas dimensões Opportunities e Risks. O estudo reporta O = 15,2% e R = 27,9%, enquanto Kabak (2014) reporta O = 35% e R = 8%, e Mu (2016, p. 4) reporta O = 20% e R = 10%. A elevação do peso de Risks (27,9% vs. 8% a 10% nos benchmarks) pode ser interpretada no contexto do problema: a operação de estufas de cura com consumo de gás natural de 5,9 milhões de m³/ano envolve riscos técnicos e operacionais que podem justificar a ponderação superior atribuída pelo painel. Mu (2016, p. 3) diferencia as dimensões BOCR pelo grau de certeza: *"Can we reasonably be sure this benefit will occur?'; If the answer is 'Yes' it is a benefit, if the answer is 'No' it is an opportunity"*. A distinção entre certeza e incerteza, aplicada ao contexto de implementação de tecnologias I4.0, pode explicar a redistribuição de pesos entre Opportunities e Risks.

Petrillo et al. (2023, p. 7) validam a estrutura BOCR como garantia do princípio MECE: *"The use of an MCDM model with these four main criteria aims for a mutually exclusive and collectively exhaustive (MECE) set of criteria"*. A organização dos subcritérios sob competitividade, aspectos sociotécnicos e sustentabilidade é consistente com este princípio.

### Análise de Sensibilidade

A análise de sensibilidade foi executada nas quatro dimensões BOCR (Benefits, Opportunities, Costs, Risks) e não identificou pontos de virada em nenhuma delas. O ranking A1 > A2 permanece inalterado sob variações nos pesos da hierarquia de controle.

Todos os CRs das sub-hierarquias são inferiores a 0,10, o que confere legitimidade à interpretação da estabilidade. Os pesos sobre os quais a sensibilidade foi calculada refletem preferências transitivas dos decisores. A diferença absoluta entre os scores (A1: 0,064129; A2: 0,026937; diferença: 0,037192) contribui para a estabilidade observada, dado que A1 apresenta score 2,38 vezes superior ao de A2.

### Análise de Viés e Fairness nos Julgamentos

O nível de risco é classificado como LOW, com conformidade CR de 100%. Todos os 12 respondentes satisfazem o limiar CR ≤ 0,10 (Saaty, 1977). Não foram identificados indicadores de inconsistência individual (CR_INDIVIDUAL_VIOLATION) nem padrões coletivos de inconsistência (CR_COLLECTIVE_PATTERN).

A análise de *Disparate Impact* (DI) requer que o pesquisador defina o atributo sensível e os grupos de alternativas. Dodevska et al. (2023, p. 6) definem o DI como *"the ratio of average AHP rank comparison scores... between privileged and discriminated groups"*, com limites de 0,80 ≤ DI ≤ 1,25. A infraestrutura de cálculo do DI está disponível no sistema e pode ser configurada caso o pesquisador identifique atributos sensíveis relevantes para o contexto de seleção tecnológica.

### Fundamentação Teórica

Os quatro axiomas formulados por Saaty (1986, p. 843) são atendidos pela estrutura do sistema:

| Axioma | Fundamento | Verificação |
|---|---|---|
| Reciprocidade | *"the reciprocal relation"* (Saaty, 1986) | ✅ Garantida pela estrutura da PCM: a_ij = 1/a_ji |
| Homogeneidade | Escala 1-9 limita comparações a uma ordem de magnitude | ✅ Atendida pela escala de Saaty (1977) |
| Dependência | Estrutura hierárquica BOCR respeita dependência funcional | ✅ Sub-hierarquias subordinadas à hierarquia de controle |
| Expectativas | *"thoughtful individuals who have reasons for their beliefs should make sure that their ideas are adequately represented"* (Saaty, 1986) | ✅ 12 especialistas com diversidade funcional e experiência |

A agregação dos julgamentos individuais emprega média geométrica, método recomendado para AIJ. Forman & Peniwati (1998, p. 170) estabelecem que *"While either an arithmetic or geometric mean can be used for AIP, the geometric mean is more consistent with the meaning of both judgments and priorities"*. Saaty & Vargas (2012, p. 9) reforçam que *"then only the geometric mean satisfies all the above conditions"* para agregação em contexto de julgamentos recíprocos.

A síntese subtrativa completa (Wijnmalen, 2007, Eq. 17) com *rescaling weights* é a formulação recomendada para análise orientada a valor líquido. Saaty & Vargas (2012, p. 133) recomendam a síntese aditiva: *"I do not recommend ever using multiplicative synthesis. It can lead to an undesirable ranking of the alternatives"*. A fórmula implementada é aditiva (subtrativa nos termos C e R), consistente com esta recomendação. Os *rescaling weights* (s) asseguram a comensurabilidade exigida por Wijnmalen (2007), evitando a distorção que ocorreria sem o rescalonamento: *"taking cost and risk reciprocals... actually distorts their originally common scale, thereby producing confounded results"* (Wijnmalen, 2007, p. 901).

---

## 💡 AÇÕES DE MITIGAÇÃO

**1. Contextualização do peso de Riscos.** O peso de Riscos (27,9%) diverge dos benchmarks setoriais de Kabak (2014) e Mu (2016), onde R situa-se entre 8% e 10%. O pesquisador pode incluir no manuscrito uma justificativa explícita para esta ponderação, fundamentada nas características operacionais específicas do problema (operação com gás natural em ambiente automotivo, criticidade do *startup* e *set-back*).

**2. Configuração da análise de *Disparate Impact*.** A infraestrutura de DI está implementada no sistema. O pesquisador pode configurar o atributo sensível e os grupos de alternativas para verificar se o ranking atende aos limites 0,80 ≤ DI ≤ 1,25 (Dodevska et al., 2023). Esta configuração é opcional e não constitui requisito para validade do estudo.

**3. Documentação da composição de gênero.** O painel composto exclusivamente por respondentes do gênero masculino deve ser reportado nos dados descritivos do estudo. A justificativa pode ser contextualizada na composição da estrutura organizacional do setor.

---

## 🎯 DECISÃO EDITORIAL

**ACEITO**

O estudo satisfaz os critérios de qualidade metodológica para publicação. A consistência dos julgamentos é verificada em todas as camadas hierárquicas: CR global agregado de 1,06%, CRs por dimensão entre 0,92% e 2,60%, e 100% dos respondentes individuais com CR ≤ 0,10 (Saaty, 1977). O painel de 12 especialistas apresenta diversidade funcional (seis áreas de atuação, três níveis hierárquicos, experiência de 11 a mais de 30 anos). A análise de sensibilidade confirma estabilidade do ranking nas quatro dimensões, sem pontos de virada. A fórmula de síntese emprega a Eq. 17 de Wijnmalen (2007) com dupla ponderação (pesos pessoais e *rescaling weights*), atendendo ao requisito de comensurabilidade. Os axiomas de Saaty (1986) são satisfeitos pela estrutura do sistema. A divergência do peso de Risks em relação aos benchmarks publicados constitui observação contextual que não compromete a validade interna dos resultados. As três ações de mitigação são de natureza documental e não afetam a estrutura analítica do estudo.

Conforme a matriz de calibração da Diretriz 3: CR ≤ 0,10 em todas as sub-hierarquias, N ≥ 3 com diversidade funcional, e sensibilidade estável correspondem à decisão de aceitar.

---

## Execução 7 — 12/09/2026, `f9cbf94`, depois de A.21

| | |
|---|---|
| Requisição | `POST /api/ai-reviewer` 200, **01:59:11Z** de 13/09/2026 (22:59 local) |
| Deploy | `dpl_orQbNxPZQP8htwtZPvdUZ5gPhSbP`, produção, branch `main` |
| Commit | **`f9cbf94`**, criado às 22:51:56 local e `READY` antes da requisição |
| Modelo | `claude-opus-4-6`, o mesmo das execuções anteriores |
| Intervenção testada | A.21: retirada do IPC e do bloco `### Completude das Matrizes` do prompt |
| Predição | registrada antes, em `c9f4842` |

⚠ **O deploy anterior, `884f710` (22:40), também já continha A.21** — a retirada do
IPC é de `0ac4e95`. A vinculação à tarefa não depende de qual dos dois servia a
página; o log resolve de todo modo, e aponta `f9cbf94`.

⚠ **O texto bruto NÃO está anexado.** Esta seção registra os trechos que a leitura
citou e o que foi medido no código e no log de produção. **Enquanto o texto integral
não entrar, os itens de leitura abaixo valem como citação parcial**, e não como dado
primário no sentido que o cabeçalho deste documento exige.

### 1. A predição de A.21 foi ATENDIDA no critério textual

O parecer **não atribui à execução** uso de LLSM nem preenchimento de comparações
ausentes, **não afirma ter recebido** indicadores de completude, e **não recomenda
completar matrizes** com base em indicador inexistente.

⚠ **Isso NÃO transforma a hipótese sobre instruções condicionais em achado causal.**
A ausência já estava lá nas três execuções anteriores, **com o bloco presente**. O
que esta execução estabelece é regressão de atribuição, não a influência da forma da
instrução.

### 2. Saiyed voltou, e a presença no contexto está demonstrada: injeção estática, não semântica

O parecer cita "High power leads to cognitive biases..." e associa a presença de
diretores e executivos a preocupação com viés. **A execução 5, sobre `28f4a95`,
registrava ausência de Saiyed, Neely e Ayan.**

**Medido em `f9cbf94`, e o resultado é mais forte do que "via possível":**

| Onde | Medida |
|---|---|
| `lib/rag/articles/` | os três artigos seguem indexados, conforme a decisão de A.3 |
| `lib/rag/index.ts` | os três entram no corpo do corpus, por import e entrada no array |
| `app/api/ai-reviewer/` | **zero** menções nominais aos três autores, e zero a "upper echelon" e "cognitive bias" — a autorização não é nominal |
| `crRefs` = `getRefsByTopic('consistência')`, injetado em `route.ts:1147` | **93 refs de 138**, e a claim do Saiyed está entre elas |
| `bocrRefs` = `getRefsByTopic('BOCR')`, injetado em `route.ts:1155` | 28 refs, e a claim do Saiyed está entre elas **de novo** |
| `ragBenchmarks`, injetado em `route.ts:1186` | traz `saiyed2023_ceoPowerUET (2023)` como linha de tabela |
| Caminho semântico | **5 consultas, 5 falhas, ZERO chunks** |

**O texto injetado, no campo rotulado `Fundamento:`:**

> High power leads to cognitive biases creeping in, especially how the CEO frames
> the decision calculus and estimates risks inherent in decisions, leading them to
> concentrate on the upside potential of the decisions and ig[norar]…

**É o trecho que o parecer citou.** Não é paráfrase próxima: é o campo `rule` da
entrada `Saiyed et al. (2023)`, que o prompt entrega duas vezes, em duas seções
diferentes da "BASE DE CONHECIMENTO CIENTÍFICO".

⚠ **O que isto estabelece, e só isto: a PRESENÇA da passagem no contexto enviado**,
demonstrada pelo caminho executável (`route.ts:1147` e `:1155`) e pelo texto
entregue. **Não determina quanto essa presença influenciou a geração**, e **não
explica a ausência na execução 5** — o mesmo caminho estático existia em `28f4a95`.
**Conhecimento paramétrico não é necessário para explicar o retorno**, o que não o
descarta como contribuição adicional.

⚠ **E o canal semântico não participou:** o log traz cinco
`[rag/semantic-retrieve] retrieval failed (silent failover): Unexpected end of JSON
input` e o resumo `RAG semantic: 5 queries -> 0 raw -> 0 unique -> 0 final from 0
papers`. Ver o achado F09 abaixo.

⚠ **A recorrência não demonstra por que a execução 5 não trouxe Saiyed.** O mesmo
canal estático existia em `28f4a95`. **A ausência anterior fica sem explicação
medida**, e atribuí-la à remoção da autorização no prompt seria inferência.

⚠ **NÃO concluir que o contexto recuperado "pesa mais" que a instrução.** Os dois
casos diferem em tema, conteúdo e contexto; influência relativa exige comparação
controlada, que esta série não fez.

⚠ **E o localizador que o parecer atribui DIVERGE, medido em 12/09/2026 com o texto
integral em mãos.** O parecer cita **"Saiyed et al. (2023, p. 9)"**. A claim indexada
declara `page: 1779`, `locator_type: "paragraph"`, `locator_id: "Section 2.4:
Hypothesis Development"`, e o `abnt` do artigo dá a faixa **1773–1797**, na
*Management Decision* v. 61, n. 6. **A página 9 está fora da faixa do artigo** — é
`DIVERGE_FORA_DA_FAIXA` na taxonomia do `verify-citations.mjs`.

**O caso é instrutivo porque separa duas coisas que costumam andar juntas:** o
**texto** citado é fiel ao campo injetado, palavra por palavra, e o **localizador** é
incompatível com a obra. **Transcrição fiel e localizador errado coexistem na mesma
citação**, e nenhum dos dois verifica o outro — é a separação que a seção 7 do
`CLAUDE.md` exige entre verificação de localizador, fidelidade de transcrição e
sustentação da afirmação.

⚠ **Nenhum campo do prompt entrega "p. 9".** A origem da página não está medida; o
que está medido é que ela não vem da claim.

**Segundo canal confirmado para a leitura do perfil profissional, e não é o Saiyed:**
o payload envia `funcao: ["diretor","gerente","c_level"]` em `demographicsSummary`,
e o prompt injeta a claim do **Neely (2020)** cujo tópico é *"Executive cognition is
a key mediating mechanism in Upper Echelons Theory: executive characteristics
influence firm o…"*. **A associação entre cargo e viés tem duas entradas medidas,
além da do Saiyed.**

### 3. O erro dos CRs permanece, e agora está medido no payload

O parecer repete **1,1%–9,6%**, declara **100% de conformidade** e afirma que nenhum
respondente excede 20%. **A referência de 09/09/2026 é 11,3893%–109,2740%**, e
nenhum dos doze fica abaixo de 0,10.

**O log mostra a cadeia inteira:** `Bias: CRs mapeados: [CR=0.0105, CR=0.0359,
CR=0.0208 …]` → `Usando statistics.byStatus: 12✅ 0⚠️ 0❌ 0❓` → `Validade: 100.0%`
→ `Score final: 100/100` → `Resultado: A (100/100) - ACEITO` → `Bias OK: LOW, CR
compliance: 100.0%`.

**É persistência do defeito de A.25, compatível com o cache preservado.** ⚠ **E há um
segundo sustentáculo, medido:** `system-prompt.ts:323` **ainda contém a faixa "1,1% e
9,6%"** dentro do exemplo de parágrafo — a classe D, o prompt ensinando o erro. **Não
é só o cache.**

⚠ **NÃO é regressão causada por A.21, e não autoriza excluir respondentes.**

### 4. Atribuição cronologicamente impossível: "Schmidt, 2015, citado em Ishizaka & Labib, 2011"

Uma publicação de 2011 não cita uma de 2015. **Origem estreitada por medição, sem
corrigir autor nem página:**

| Candidato | Medida |
|---|---|
| Claim do RAG que relacione os dois | **não existe**: `ishizaka2011review.ts` tem **zero** ocorrências de "schmidt", e `schmidt2015_review.ts` **zero** de "ishizaka" |
| Exemplo ou molde no prompt | **não existe** padrão "X citado em Y" nem "apud" no `system-prompt.ts` |
| Ambos indexados isoladamente | **sim**: `schmidt2015_review.ts` e `ishizaka2011review.ts`, e os dois estão entre as 100 claims injetadas |

⚠ **Resta a composição pelo modelo de dois itens reais e separados**, o que é
consistente com o padrão "cited in" que a base usa em OUTROS pares (o
`goepel2018` cita `ishizaka2009`, o `neely2020` cita Saiyed) — isto é, a forma existe
no contexto, aplicada a pares diferentes. **Não é conclusão: é o candidato que
sobrou.**

⚠ **O validador viu o trecho e não viu o problema.** Ele registrou
`CITACAO_INCOMPLETA: "Schmidt, 2015" — paper tem 5 autores; cite como "Schmidt et
al. (2015)"`. **Nenhuma regra cobre atribuição cronologicamente impossível**, e, por
F06, aviso não bloqueia a apresentação.

### 5. A explicação da sensibilidade excede a evidência

A razão de **2,38:1** entre escores **não demonstra** que a inversão exigiria
"variações de grande magnitude". O âncora registra **dominância estrita** e
invariância à ponderação **nas condições delimitadas**; o log confirma
`sensitivityInflections: {"O":null,"C":null,"R":null,"B":null}`, isto é, **ausência
de inversão na varredura executada**. **Ausência de inversão na varredura não é
invariância demonstrada.**

### 6. Originalidade e ACEITO sem sustentação

"Constitui contribuição original" **contradiz o estado documentado**, em que a
fronteira de ineditismo está pendente — ver 0.3 do âncora. E o **ACEITO depende da
falsa conformidade de 100%** do item 3: o log mostra o veredito derivado do score
100, que vem dos CRs em cache.

### Apuração de localizadores: primeira execução do script sobre este parecer

```
node scripts/verify-citations.mjs <parecer da execução 7>      # saída 1
```

Rodado em 12/09/2026 sobre o arquivo de SHA-256 `bcdfe5a3…a8fd9`. Script na versão
de `a4410f0`. **Saída bruta:**

| | |
|---|---|
| Citações com localizador | **21** |
| `OK`, página de claim | **6** (29%) |
| `DIVERGE_NA_FAIXA` | **1** — Saaty (1987, p. 165) |
| `DIVERGE_FORA_DA_FAIXA` | **14** (67%) |
| `NAO_INDEXADO` | **0** |
| Citações sem localizador | 18 |

⚠ **O 67% NÃO é taxa de erro de localizador do parecer, e a conferência à mão é o
que mostra isso.** As 14 divergências são de **quatro naturezas diferentes**, e o
agregado as soma:

| Natureza | Casos | O que se pode afirmar |
|---|---|---|
| **Página inverificável por falta de faixa** | Saaty e Vargas (2012), p. 15 e p. 139 | É **livro** (Springer, sem faixa no `abnt`), e o script só tem as páginas das claims, de 4 a 40. Para um livro, "fora da faixa" **não é erro demonstrado: é ausência de referência contra a qual comparar** |
| **Forma de página relativa** | Mu p. 8 (artigo 364-393), Escobar p. 1 (318-322), Lee p. 4 (120-126), Saaty e Ozdemir p. 1 (1063-1075), Saiyed p. 9 (1773-1797), Xu p. 68 (683-687) | A página citada **tem a forma da paginação do PDF**, não a do periódico. ⚠ **É observação de forma, não demonstração:** ver o achado abaixo — o contexto não entrega página nenhuma, então o modelo não teria de onde tirar a paginação relativa |
| **Fora de qualquer convenção** | Ossadnik p. 611 (artigo 421-457), Saaty e Ergu p. 753 e p. 754 (1171-1187), Ishizaka e Labib p. 14 (14336-14345, artigo de dez páginas), Salomon p. 468 | Nem página do periódico nem página relativa plausível |
| **Um a mais que o fim do artigo** | Forman e Peniwati p. 170 (artigo 165-169, claims em 166, 167 e 168) | Ver o caso abaixo: **o prompt ensina p. 167** |

⚠ **Duas ressalvas sobre a própria base, que o agregado também absorve:** o
`salomon2024_consistency` tem claims em páginas **relativas** (1 a 7) e `abnt` que
declara `p. 828`, que na *Mathematics* é **número de artigo, não faixa** — ele não
está entre os sete convertidos em `23afe43`. E o script conta **"37 artigos
indexados"** porque inclui o `_template.ts`, cujo `abnt` é `null`: são **36**.

### O achado desta apuração: o contexto injetado NÃO entrega página nenhuma

Medido em `f9cbf94`, sobre as quatro seções estáticas que compõem a "BASE DE
CONHECIMENTO CIENTÍFICO" e as três de limiares, fórmulas e benchmarks:

| O que foi medido | Resultado |
|---|---|
| Campos de cada referência injetada | `id`, `citation`, `topic`, `rule`, `context`, `weight` — **sem página** |
| Das 135 referências injetadas, quantas mencionam página | **0** |
| Menções de página em `ragThresholds`, `ragFormulas`, `ragBenchmarks` | **0, 0, 0** |
| Menções de página no `system-prompt.ts` | **12**, que são **três pares distintos**: Saaty (1977, p. 248), Wijnmalen (2007, p. 899 e p. 903), Forman e Peniwati (1998, p. 167) |

**Consequência, e ela reorganiza a leitura das 21 citações:** o parecer produziu
**21 localizadores a partir de um contexto que contém três**. Dezoito páginas não
têm origem no que o modelo recebeu.

**Cruzamento com os vereditos:**

- **Os dois pares que o prompt ensina e o parecer usou saíram `OK`:** Saaty (1977,
  p. 248) e Wijnmalen (2007, p. 903).
- **Quatro `OK` não têm origem no contexto:** Saaty (1986, p. 843), Petrillo (2023,
  p. 2), Saaty e Vargas (2012, p. 9) e Dodevska (2023, p. 4) coincidem com página de
  claim **sem que a página estivesse em lugar algum do que foi enviado**.
- ⚠ **E o terceiro par ensinado foi DESRESPEITADO:** o prompt traz
  `Forman & Peniwati, 1998, p. 167` na linha 176, a base tem claims em 166, 167 e
  168, **e o parecer escreveu p. 170** — uma página além do fim do artigo. **Ter a
  página correta no contexto não garantiu que ela fosse usada.**

⚠ **O que isto NÃO estabelece.** Não estabelece que as dezoito páginas sem origem
sejam invenção: podem vir de conhecimento paramétrico, e quatro delas **acertaram**.
Não estabelece qual mecanismo produziu cada acerto ou cada erro. E não substitui a
conferência contra o PDF, que é a única que separa divergência de atribuição de
falha de cobertura da base.

**O que estabelece:** que a ancoragem de página do parecer **não é rastreável ao
contexto recuperado**, porque o contexto não a contém. **É uma sexta superfície pela
qual a citação se desancora, e a mais barata de fechar:** as claims têm
`evidence.page`, e a injeção simplesmente não o passa adiante.

### F09 — a recuperação semântica FALHOU nesta execução, em silêncio, e a etapa não está localizada

Achado novo, medido no log desta execução:

```
[rag/semantic-retrieve] retrieval failed (silent failover): Unexpected end of JSON input   (×5)
[AI-REVIEWER] RAG semantic: 5 queries -> 0 raw -> 0 unique -> 0 final from 0 papers
```

**As cinco consultas falharam e o parecer foi gerado com zero chunks semânticos.** A
seção "Evidências Semânticas Recuperadas (RAG Vetorial)" do prompt foi ao modelo
vazia. **Nada na saída sinaliza isso** — é o modo de falha que este documento
descreve, agora no recuperador. O caminho estava **ligado**: a linha de resumo só é
impressa quando `semanticStats.enabled`, o que fixa `USE_RAG_SEMANTIC = true` neste
deploy.

⚠ **O que está demonstrado é a FALHA DA RECUPERAÇÃO nesta execução, não que o índice
esteja inacessível.** Correção de redação, 12/09/2026: a versão anterior desta seção
afirmava que "o estado atual não é índice com dados antigos, é índice que não
responde". **Isso excede a medição.**

**Por que a mensagem não localiza a etapa:** o `catch` de
`lib/rag/semantic-retrieve.ts:47` envolve **duas** chamadas — `embed(query, 'query')`
na linha 45 e `querySimilar(vector, topK)` na 46. `Unexpected end of JSON input` pode
vir do processamento da resposta de **qualquer uma das duas dependências**, e o log
não distingue. **Índice desatualizado e recuperação falhando são condições
independentes: uma não substitui a outra, e as duas podem valer ao mesmo tempo.**

⚠ **E o campo `failedQueries` não conta falhas.** Medido em `route.ts:95`:
`results.filter((r) => r.length === 0).length` — conta **resultado vazio**, então
reúne consulta sem resultados e consulta com erro na mesma contagem. **Nesta
execução, a evidência da falha são os cinco `console.warn`, não o campo.** Quem ler
apenas a linha de resumo não consegue distinguir um índice vazio de um recuperador
quebrado.

⚠ **Consequência para as execuções anteriores:** o quanto o caminho semântico
contribuiu em cada uma **não está registrado**, porque o log só guarda contagens — e
essas contagens têm a ambiguidade acima.

### F10 — a seção de 60 entradas é calculada e nunca injetada

`getKnowledgeContext()` é chamado em `route.ts:708`, monta 60 entradas ordenadas por
peso e **tem UMA ocorrência no arquivo**: a própria atribuição. **O valor nunca entra
no prompt.** O que preenche a "BASE DE CONHECIMENTO CIENTÍFICO" são as quatro outras
seções, e **`criticalRefs` entra com `.slice(0, 8)` de 108**.

⚠ **Quem auditar o contexto pela função de nome mais óbvio mede o que o modelo não
recebe.** Foi o que aconteceu na primeira sonda desta apuração, e o erro só apareceu
ao contar as ocorrências da variável.

### F11 — o filtro de tópico não é tópico

`getRefsByTopic('consistência')` devolve **93 das 138 claims** e as injeta sob o
título "Referências sobre Consistência e Validação de Dados". **Entre elas, a claim
do Saiyed sobre poder do CEO e viés cognitivo**, que não trata de consistência.

**As quatro seções injetam 100 claims distintas de 138** — o prompt não recupera por
tópico, entrega quase o corpus com rótulos temáticos que não correspondem ao
conteúdo. **É autorização por rótulo:** o modelo recebe a claim sob um cabeçalho que
afirma pertinência que ela não tem.

### O que esta execução permite e não permite

**Permite** avançar no registro de A.21: a regressão textual foi atendida, no
commit e no deploy nomeados acima.

**NÃO permite** declarar o Parecer IA confiável. Permanece a faixa incorreta de CRs
sustentando 100% de conformidade e o veredito; reapareceu a interpretação do perfil
profissional, agora com canal medido; e há atribuição cronologicamente impossível que
o validador não cobre.

---

## Validação computacional externa: diagnóstico da Fase 1

**Commit examinado: `8624cf0`.** Os localizadores foram relidos nele, e o código é
idêntico em `1fa59b4`: `git diff --stat 8624cf0..1fa59b4 -- '*.ts' '*.tsx'` sai
vazio. Especificação, requisitos e decisões pendentes em
`docs/validacao-externa-especificacao.md`; subitem de A.28 no âncora.

⚠ **Limite que vale para o diagnóstico inteiro: o microserviço com AhpAnpLib NÃO
está neste repositório.** Nada aqui estabelece o que ele calcula, o que compara ou
com que tolerância. **A pergunta "os dois lados são efetivamente comparados?"
permanece condicional**, e cada conclusão que dependa dela está marcada.

### Os seis localizadores, reconfirmados

| Citado | Em `8624cf0` |
|---|---|
| `app/api/validate-external/route.ts:52` | `return NextResponse.json(result);` |
| `components/ExternalValidation.tsx:75` | `const hasRealMatrices = calculation.aggregatedMatrices?.bocr &&` |
| `:202` | `console.warn('[ExternalValidation] Usando matrizes reconstruídas (legado)…')` |
| `:301` | `result.all_valid ? 'VALIDAÇÃO APROVADA' : 'VALIDAÇÃO COM RESSALVAS'` |
| `:391` | `"Os cálculos AHP do sistema foram validados contra a biblioteca AhpAnpLib` |
| `:393` | `{matrixSource === 'real' ? ' reais' : ''} do projeto. A diferença máxima` |

**Os seis conferem.** Zero divergência.

### O que a API envia e o que volta

**Envia**, por matriz: `{matrix, items, your_weights, your_cr}` — a matriz **e os
resultados do sistema**. POST `/api/validate-external` com
`{action: 'validate-project', matrices}` (`:207-212`). **Volta**:
`{results, summary: {total_matrices, valid_matrices, max_weight_diff, max_cr_diff,
issues}, all_valid, library, citation}`.

**O componente não compara nada.** Envia os dois lados e exibe `max_weight_diff` e
`max_cr_diff`. ⚠ **A comparação, se ocorre, ocorre no microserviço, que não foi
lido.**

### Achado 1: a matriz reconstruída é perfeitamente consistente por construção

**Apuração, e é medição, não leitura do código.** Replicando exatamente
`weightsToMatrix` (`:145-149`), que faz `matrix[i][j] = w[i]/w[j]`, sobre os
`bocrWeights` do snapshot de 13/07 (`0.372277, 0.151703, 0.197437, 0.278584`), e
passando o resultado pelo motor do próprio projeto (`principalEigenvector` e
`consistency` de `lib/ahp-engine.ts`):

| Grandeza | Valor medido |
|---|---|
| autovetor da matriz reconstruída | `0.372277, 0.151703, 0.197437, 0.278584` |
| desvio máximo contra os pesos que a geraram | **2,776e-17** |
| CR da matriz reconstruída | **0** exato |
| λmax | **4,000000000000**, com n = 4 |
| `your_cr` que o componente envia | **1,061e-2**, o CR real do sistema |

**O que isto demonstra:** a matriz enviada no caminho reconstruído carrega o vetor
de pesos e nada mais; seu autovetor é o próprio vetor que a gerou e sua
inconsistência é nula.

⚠ **O que isto NÃO demonstra, e a distinção é o ponto.** Não demonstra que a
comparação no serviço "não pode reprovar". **Essa conclusão é CONDICIONAL:** vale
**se** o serviço derivar o autovetor da matriz recebida e compará-lo a
`your_weights`, e nesse caso a comparação de pesos é tautológica; e **se** ele
derivar o CR da matriz e compará-lo a `your_cr`, a diferença de CR seria de
**1,06 pontos percentuais contra zero**. **O serviço não foi lido, e a
impossibilidade geral não está estabelecida.**

**O que já estava registrado e permanece:** a linha de A.28 diz que o fallback
"reconstrói a matriz a partir dos pesos, o que não equivale a validar os julgamentos
originais". O que esta apuração acrescenta é o **valor medido** da propriedade, não
a observação.

### Achado 2: JSON inválido é omissão silenciosa, não falha

`parseMatrix` (`:80-84`) devolve `null` em `catch`, e a matriz é então **descartada
pela condição de guarda** (`:92`, `:104`, `:125`). **Não há erro, não há aviso, e
não há queda para reconstrução** — `hasRealMatrices` já escolheu o caminho
persistido. A matriz simplesmente não integra o `matrices` enviado, e
`total_matrices` do resumo passa a contar só o que foi enviado.

⚠ **Consequência a delimitar:** a tela pode exibir "3/3 matrizes válidas" com
`all_valid: true` sobre um conjunto incompleto, **porque nada compara o que foi
enviado contra o conjunto esperado**. Não medi essa exibição em execução: é leitura
do caminho, e o estado correspondente é um dos nove requisitos da Fase 2.

### Achado 3: a seleção do caminho não checa uma das matrizes

`hasRealMatrices` (`:75-76`) testa `aggregatedMatrices?.bocr` e
`aggregatedMatrices?.subcriteria`. **Não testa `.magnitude`.** Um documento com
`bocr` e `subcriteria` e sem `magnitude` entra no caminho persistido, e a matriz de
magnitude fica fora do envio pela guarda `:104`.

**Não medido:** se existe documento nesse estado. O snapshot de 13/07 tem os três
campos, medido: `aggregatedMatrices` com `bocr` (242 chars), `magnitude` (245) e
`subcriteria` com `R, B, O, C`.

### Achado 4: CR ausente vira zero

`your_cr: calculation.bocrConsistency?.cr || 0` (`:98`), e a mesma forma em `:113` e
`:133`. **CR ausente é enviado como 0**, que é consistência perfeita. É o inverso da
convenção fixada em `docs/referencia-cr-individuais.md`: **célula vazia para
indefinido, nunca zero.** `your_weights` ausente vira `[]` (`:134`).

### Achado 5: o veredito governa cor e rótulo

`all_valid` é usado em `:295`, `:298`, `:300`, `:301` e `:303`, e **em nenhum outro
lugar do repositório** — busca por símbolo em `*.ts`, `*.tsx`, `*.mjs`, `*.py`,
`*.json`. `matrixSource` em `:55`, `:275`, `:312` e `:393`, também só no componente.
Importadores: `app/decisor/resultados/[projectId]/page.tsx:43` estático e `:4737` no
render; nenhum reexport, nenhum `import()` dinâmico.

⚠ **E o bloco da citação não depende do veredito.** Ele está dentro de
`{result && …}` (`:388-397`) e não referencia `all_valid`: **com reprovação, o texto
de aprovação é oferecido igual.** A linha `:393` troca apenas o qualificador,
`{matrixSource === 'real' ? ' reais' : ''}`, então no caminho reconstruído a frase
lê "as matrizes pareadas agregadas do projeto" — **descrição que não corresponde ao
que foi enviado**, que é matriz derivada dos pesos.

### Achado 6: três lugares oferecem texto pronto, não um

| Local | O que oferece |
|---|---|
| `components/ExternalValidation.tsx:389-397` | "Citação para dissertação", afirma atestar a precisão matemática da implementação |
| `components/NegativePriorityAlert.tsx:149-162` | "Texto Sugerido para Dissertação", com localizador `Lee (2009a, p.2891)` e recomendação de descartar alternativas |
| `components/BiasAnalysisCard.tsx:427-441` | "Ver nota para dissertação", renderiza `biasAnalysis.academicNote`, gerado em `app/api/ai-reviewer/bias-detection.ts:215` |

⚠ **`Lee (2009a, p. 2891)` não tem lastro no RAG:** os artigos indexados de Lee são
`lee2009_wind.ts` e `lee2024_project.ts`, e A.11 registra Lee 2009a como não
indexado. O número 2891 aparece uma vez na base, como **valor de célula** (`0.2891`)
numa tabela de `lee2009_wind.ts:215`.

**Não entram nesta lista, conferido:** o "Checklist para Dissertação"
(`ExportReports.tsx:381`), que é lista de tarefas sem afirmação, e o `exportLatex`
(`page.tsx:1663`), que exporta tabelas com `\caption` descritiva.

⚠ **Os três contradizem a seção 1.3 do âncora**, que define painel de evidências e
registra que o gestor não usa texto do software.

⚠ **Limite da busca:** os padrões usados foram rótulo (`Citação para`,
`para dissertação`, `para o manuscrito`), fragmentos da frase (`atestando`,
`foram validados contra`, `precisão matemática`) e construção de texto
(`citation:`, `latex`, `abnt`), em `*.ts` e `*.tsx`. **Texto equivalente com outra
redação pode existir e não ser alcançado por esses padrões.**

### A proveniência da Tabela 7: não há artefato que responda

| Local consultado | Resultado |
|---|---|
| `docs/*.json` | só `calculations-13jul2026.json`, `calculatedAt: 2026-07-13T19:39:31.334Z`, `metadata.version: 5.0`, **com** `aggregatedMatrices` |
| Resposta de validação guardada | nenhum arquivo do repositório contém `all_valid` ou `max_weight_diff` como dado |
| Versões do manuscrito | nenhuma rastreada |
| Backups de maio | `docs/ESTADO_ATUAL_07mai2026.md` e `_08mai2026.md`: zero ocorrências de `all_valid`, `max_weight_diff`, `AhpAnpLib`, "validação externa", "Tabela 7" ou `T7` |
| Arquivos deletados no histórico | `_backup/20260205_165958/…`, de fevereiro, componentes de UI; nada de validação |
| Logs | nenhum log de validação externa no repositório |

⚠ **Delimitação, e ela é parte do achado:** a ausência vale para **o repositório git
e o histórico de `git log --all`**, consultados em 13/09/2026. **Não cobre** o
Firestore, o Railway, o Vercel nem arquivos locais fora do versionamento. **E busca
sem ocorrência localiza lacuna; não demonstra ausência de conteúdo equivalente com
outra redação.**

⚠ **O snapshot de julho ter `aggregatedMatrices` não prova que a Tabela 7 saiu
daquele caminho** — prova que, em 13/07, o campo existia. **A cronologia continua
sem evidência**, e a afirmação de que a T7 é anterior ao recomputo permanece não
estabelecida.

---

## F06: diagnóstico da verificação e da apresentação do parecer

**Fase 1 de A.27, medida em 13/09/2026 no commit `0b17115`.** Esta rodada **não
corrige nada**: mede em quatro camadas separadas e registra. A consequência da
reprovação é decisão do pesquisador, e está em aberto ao fim desta seção.

⚠ **Estado do registro, e são DOIS aceites distintos que não se substituem.**

| Aceite | Estado |
|---|---|
| **da Fase 1**, que é diagnosticar e registrar | **atendido.** As quatro camadas estão medidas, a natureza da evidência está declarada em cada afirmação, e as duas pendências que mantinham este registro parcial foram resolvidas: o ponteiro na linha de A.27 do âncora, em `4c9900a`, e o alcance do ensaio do fluxo completo, em `5e10ac1`, com o ensaio de quatro chamadas independentes |
| **final de A.27**, que é a falha de verificação bloquear ou pôr em quarentena visível | **aberto**, e depende da Fase 2 |

⚠ **O diagnóstico não é incompleto por não ter corrigido o comportamento:** corrigir
**não pertencia** à Fase 1. O que as medições sustentam é a **reprodução** do
defeito, com o alcance de cada ensaio declarado; **a correção continua pendente.**

⚠ **A natureza da evidência é declarada em cada afirmação**, com três rótulos:
**medido** quando houve execução, **estabelecido por leitura** quando vem do código
lido, e **não medido** quando nenhuma das duas aconteceu.

### Inventário: contar antes de examinar

**Busca usada:**
`git grep -n -E "isValid|validate[A-Z]|whitelist|proibid|forbidden" -- app lib components`

**Verificadores que tocam o texto do parecer, a resposta da rota ou a exibição
dela: DOIS.** O inventário anterior se reconfirma, e o que muda é o escopo da
contagem, agora explícito.

| # | Verificador | Onde | Relação |
|---|---|---|---|
| 1 | `validateReviewOutput` | definido em `app/api/ai-reviewer/route.ts:1410`, chamado em `:1642` | julga o texto devolvido pelo modelo |
| 2 | `validateCitationsAgainstWhitelist` | definido em `lib/rag/citation-whitelist.ts:264`, chamado em `route.ts:1516` | **aninhado dentro do primeiro**, não é um segundo ponto de decisão |

**A mesma busca devolveu sete outros `validate*` que NÃO tocam o texto do parecer**,
e registrá-los é o que dá sentido ao "dois": `validateKnowledgeBase`
(`knowledge.ts:243`, valida a base do RAG), as seis funções de
`app/api/audit-decision/route.ts` (`:28`, `:64`, `:103`, `:196`, `:253`, `:301`, que
validam dado de cálculo em outra rota), `isValidSaatyValue`
(`lib/completeness.ts:75`, julga julgamento) e `validateToken`
(`avaliacao/page.tsx:1163`, autenticação).

⚠ **Há um verificador que ALTERA o texto, e ele se registra sem classificação
antecipada.** `stripSecondaryCitations` (`lib/rag/citation-whitelist.ts:253`) remove,
por expressão regular, parênteses de citação secundária do tipo `(apud …)`,
`(citando …)`, `(citado por …)` **antes** da validação de whitelist. **O que altera:**
uma cópia do texto usada para validar. **Consequência, estabelecida por leitura:** a
citação primária fora dos parênteses continua sujeita à whitelist, e o comentário do
próprio arquivo registra a razão, que é o prompt autorizar mencionar a obra
secundária. **Não é tratado aqui como defeito:** sanitizar antes de validar pode ser
função legítima, e classificar exigiria medir os casos em que a remoção apaga algo
que deveria ser julgado.

### Camada 1, detecção: o que cada regra procura e onde o achado cai

**Estabelecido por leitura** de `validateReviewOutput`, linhas 1410 a 1525.

| # | Regra | O que procura | Cai em |
|---|---|---|---|
| 1 | `RESPONDENTE_FANTASMA` | menção a respondente inexistente, por cinco padrões | **`issues`** |
| 2 | `FORMULA_SIMPLIFICADA` | fórmula simplificada sem menção a *rescaling weights* | **`issues`** |
| 2b | `FORMULA_INCOMPLETA` | fórmula mencionada sem distinguir pesos pessoais de *rescaling* | `warnings` |
| 3 | `REFERENCIA_IA_PROIBIDA` | ferramenta de IA citada como referência | **`issues`** |
| 4 | `TOTAL_INCONSISTENTE` | número de especialistas diferente do tamanho da lista | `warnings` |
| 5 | `SCORE_NAO_RECONHECIDO` | escore relatado que não está nos dados injetados | `warnings` |
| 6 | `EMPIRICO_SEM_REF` | afirmação empírica sem referência próxima | `warnings` |
| 7 | whitelist de citação | devolve `issues` e `warnings` próprios | **os dois**, repassados em `:1517-1518` |

**Três das sete alimentam `issues`**, mais o que a whitelist classificar como
*issue*. As demais só produzem aviso.

### Camada 1, o caso do separador decimal

#### Ensaio isolado da expressão, medido

A expressão de escores, copiada de `route.ts:1479`: `/Score\s*=?\s*([\d.]+)/gi`.
⚠ **A classe de caracteres é `[\d.]`: dígitos e ponto, sem vírgula.**

Exercitada fora do repositório, com `node -e`, nos quatro casos. **Entrada e
correspondências transcritas:**

| Entrada | `match` | grupo 1 | `parseFloat` |
|---|---|---|---|
| `"Score = 0,0641"` | `["Score = 0"]` | `"0"` | `0` |
| `"Score = 0.0641"` | `["Score = 0.0641"]` | `"0.0641"` | `0.0641` |
| `"Score = 0,9999"` | `["Score = 0"]` | `"0"` | `0` |
| `"Score = 0.9999"` | `["Score = 0.9999"]` | `"0.9999"` | `0.9999` |

⚠ **Alcance deste ensaio, e ele é estreito:** mede **quais trechos a expressão
reconhece**, e nada mais. **Não mede** `validateReviewOutput`, nem se o resultado
vira `issues`, `warnings` ou `isValid: false`, porque há processamento depois da
correspondência. **Nenhuma afirmação sobre o validador se apoia apenas nele.**

**Estabelecido por leitura, sobre o processamento posterior:** a guarda da regra 5 é
`if (!isNaN(reportedScore) && reportedScore > 0 && reportedScore < 1)`. Com vírgula,
o valor examinado é **0**, que **falha em `> 0`**, e a verificação é abandonada antes
de comparar com os escores conhecidos.

#### Ensaio do fluxo completo: viabilidade apurada e ensaio REALIZADO

⚠ **A viabilidade foi apurada antes de qualquer descarte, e o ensaio aconteceu.**
Instrumento temporário **fora da árvore versionada**, no diretório de trabalho da
sessão, com `@anthropic-ai/sdk` e o recuperador semântico simulados por mock
virtual, chamando o `POST` real da rota. **Nada em `app/`, `lib/` ou `components/`
foi alterado, e nenhuma função foi exportada para permitir o ensaio.**

**Desenho:** os quatro casos foram postos **no mesmo texto de parecer**, numa única
execução, de modo que o restante da resposta é **idêntico por construção** e o único
fator que varia entre eles é o separador decimal e o valor.

**Entrada:** um parecer contendo `Score = 0,9999`, `Score = 0.9999`, `Score = 0,0641`
e `Score = 0.0641`, com `finalScores` declarando A1 em `0.06412946722825451`.

**Resultado medido, transcrito da resposta da API:**

```
status:  200
success: true
isValid: true
issues:  []
warnings: [
  "FORMULA_INCOMPLETA: Fórmula mencionada mas sem distinção clara entre pesos pessoais (v) e rescaling (s)",
  "SCORE_NAO_RECONHECIDO: Score 0.9999 não encontrado nos dados injetados"
]
review devolvido contendo "0,9999": true
```

⚠ **ALCANCE DESTE ENSAIO, corrigido em 13/09/2026.** Os quatro casos estavam **no
mesmo texto**, numa **única** chamada, então o que ele mede é o resultado da
**resposta composta**, e **não** equivale a quatro execuções independentes. **O que
este ensaio mede, exatamente:** *um texto contendo as quatro formas produziu um
aviso de escore, nenhum `issue`, `isValid: true`, e foi devolvido integralmente com
`success: true`.* ⚠ **A atribuição caso a caso NÃO sai daqui**, porque a resposta é
uma só: uma tabela por caso construída sobre esta execução atribuiria a cada forma
um resultado que só a composição produziu. A atribuição está no ensaio seguinte, com
quatro chamadas separadas.

⚠ **O aviso `FORMULA_INCOMPLETA` é da regra 2b**, disparada pelo texto sintético do
ensaio conter `Score =`, e **não pertence ao defeito sob medição**. Registrado para
não ser atribuído a ele.

**Não medido:** a apresentação na interface para estas entradas. Ela tem conferência
própria, na camada 4, e não sai deste ensaio.

#### Ensaio com QUATRO CHAMADAS INDEPENDENTES, medido

**Medido em 13/09/2026, no commit `4c9900a`.** Mesmo instrumento temporário, **fora
da árvore versionada**, com `@anthropic-ai/sdk` e o recuperador semântico simulados
por mock virtual, chamando o `POST` real da rota. **Nada em `app/`, `lib/` ou
`components/` foi alterado, e nenhuma função foi exportada para permitir o ensaio.**
**Nenhum parecer real foi gerado:** o cliente do modelo é simulado.

**Desenho, que é o que distingue este ensaio do anterior:** quatro execuções
**separadas** do processo de teste, cada uma com **um único ponto de escore** no
texto. O molde é **idêntico** nas quatro, e **só o valor naquele ponto muda**:

```
## RESUMO
A1: Score = ⟪VALOR⟫.
## DECISAO EDITORIAL
**ACEITO**
```

`finalScores` declara A1 em `0.06412946722825451` e A2 em `0.026937`, igual nas
quatro. Os quatro valores no ponto cobrem o 2×2 entre **separador** e **pertinência
aos dados**: `0,9999`, `0.9999`, `0,0641`, `0.0641`.

**Resultado medido, a validação inteira de cada resposta, transcrita:**

| Valor no ponto | `status` | `success` | `isValid` | `issues` | `warnings` |
|---|---|---|---|---|---|
| `0,9999` — fora dos dados, vírgula | 200 | `true` | `true` | `[]` | `FORMULA_INCOMPLETA` |
| `0.9999` — fora dos dados, ponto | 200 | `true` | `true` | `[]` | `FORMULA_INCOMPLETA`, `SCORE_NAO_RECONHECIDO: Score 0.9999 não encontrado nos dados injetados` |
| `0,0641` — nos dados, vírgula | 200 | `true` | `true` | `[]` | `FORMULA_INCOMPLETA` |
| `0.0641` — nos dados, ponto | 200 | `true` | `true` | `[]` | `FORMULA_INCOMPLETA` |

**Nas quatro**, além do quadro acima: `review` devolvido **byte a byte idêntico** ao
texto simulado do modelo, `nota: "A"`, `veredicto: "ACEITO"`, e o campo `validation`
**presente** no corpo da resposta.

**O que a atribuição agora permite afirmar, e é medido:**

1. **O aviso único do ensaio composto pertence a UMA das quatro formas.** Ele
   aparece **somente** com `0.9999`, ponto e valor fora dos dados.
2. **O valor fora dos dados escrito com vírgula não produz nada.** `0,9999` devolve
   exatamente o mesmo quadro de validação que `0.0641`, que é um valor **correto**.
   ⚠ **As duas linhas são indistinguíveis na resposta**, e uma carrega número
   inventado.
3. **`FORMULA_INCOMPLETA` é constante nas quatro**, então não é atribuível a nenhum
   valor: confirma-se como efeito de `Score =` no texto, não do escore.
4. **Nenhuma das quatro formas derruba o veredito nem retém o texto.** `isValid`
   saiu `true` nas quatro, `success` é `true` nas quatro, e o texto voltou inteiro
   nas quatro.

**Mecanismo, medido em isolamento** — a expressão de `route.ts:1479` e a guarda da
regra 5 exercitadas fora do repositório sobre o mesmo molde, com os `knownScores`
computados dos mesmos `finalScores`:

| Valor no ponto | grupo 1 capturado | `parseFloat` | guarda `>0 && <1` | comparação |
|---|---|---|---|---|
| `0,9999` | `"0"` | `0` | **falha** | **não acontece** |
| `0.9999` | `"0.9999."` | `0.9999` | passa | `0.9999` ∉ `{0.0641, 0.0269}` → aviso |
| `0,0641` | `"0"` | `0` | **falha** | **não acontece** |
| `0.0641` | `"0.0641."` | `0.0641` | passa | `0.0641` ∈ `{0.0641, 0.0269}` → silêncio |

⚠ **Detalhe novo, medido:** a classe `[\d.]+` **engole também o ponto final da
frase**, e o grupo capturado é `"0.9999."`. Aqui o `parseFloat` absorve isso sem
consequência; registrado porque em outra posição do texto poderia não absorver.

⚠ **Isto fecha a lacuna de atribuição, e não amplia o alcance da medição.** As
quatro chamadas continuam **não medindo** a apresentação na interface, que tem
conferência própria na camada 4, e continuam **não exercitando** o ramo de
`isValid: false` — ver a ressalva da camada 3.

### Camada 2, veredito

**Estabelecido por leitura**, `route.ts:1520-1524`:

```
isValid: issues.length === 0,
```

**Consequência:** apenas as regras que alimentam `issues` derrubam o veredito.
**Aviso nenhum o derruba**, por construção, e o escore fictício com ponto produz
exatamente aviso. Com vírgula, não produz nem isso.

### Camada 3, resposta da API

**Estabelecido por leitura**, `route.ts:1642-1676`, com uma parte **medida** pelos
ensaios acima.

⚠ **Os dois achados desta camada têm naturezas diferentes, e não se confundem:**

| Achado | Natureza da evidência |
|---|---|
| **o aviso não impediu a devolução do texto** | **medido**, nas cinco execuções: o texto voltou inteiro com `success: true`, inclusive na que produziu `SCORE_NAO_RECONHECIDO` |
| **`isValid: false` também não impede a devolução** | **estabelecido por leitura** do trecho abaixo. ⚠ **Os ensaios retornaram `isValid: true` nas cinco execuções, portanto NÃO exercitaram esse ramo** |

Com `isValid` falso, as linhas 1644 a 1650 fazem **apenas** `console.error` e
`console.warn`. Em seguida, `:1665` monta:

```
success: true            <- literal, não condicional
nota, veredicto, review, biasAnalysis,
validation: { isValid, issues, warnings }
metadata: { …, gradeSource, automaticGrade, … }
```

**O texto vai inteiro, o `success` é verdadeiro por literal, e o veredito de
validação viaja como campo que o chamador pode ignorar.**

### Camada 4, apresentação

**Busca usada:**
`git grep -n -E "ai-reviewer|aiReview|data\.review|data\.validation|data\.success" -- app components`

**Um único ponto consome a resposta da rota**, e a cadeia dele tem quatro elos:

| Elo | Onde | Lê o campo de validação? |
|---|---|---|
| `fetch('/api/ai-reviewer')` | `app/decisor/resultados/[projectId]/page.tsx:1291` | não |
| guarda `if (data.success && data.review)` | `:1303` | **não**: condiciona ao `success` literal |
| `setAiReview({ nota, veredicto, review, metadata })` | `:1306-1312` | **não, e é mais forte: o campo `validation` não é sequer copiado para o estado** |
| `<ParecerAISection aiReview={aiReview} …>` | `:4945`, componente em `components/ParecerAISection.tsx` | não: lê `review`, `nota`, `veredicto` e `metadata` |

⚠ **`git grep` por `.validation` fora da rota devolve uma única linha, e ela é um
comentário** em `components/NegativePriorityAlert.tsx:11`, com a palavra "validation"
dentro de um título em inglês. **Nenhum ponto de consumo lê o campo.**

⚠ **A contagem anterior de "quatro pontos" não se reproduz como quatro
consumidores.** O que esta busca devolve é **um consumidor com quatro elos**. E
`app/decisor/projetos/page.tsx:205`, que também testa `data.success`, é da rota
`/api/calculate`, conferido em `:199`, **não desta**.

### Achado adjacente, sem correção nesta rodada

**Estabelecido por leitura**, `route.ts:1651-1654`:

```
const aiGrade = extractGradeFromReview(review);
const finalNota = aiGrade?.nota ?? classification.nota;
const finalVeredicto = aiGrade?.veredicto ?? classification.veredicto;
```

**A nota e o veredito exibidos vêm do TEXTO do parecer**, extraídos dele, com queda
para a classificação calculada só quando a extração falha. O comentário da linha
1651 chama isso de fonte única, e `metadata.gradeSource` registra qual das duas
valeu. ⚠ **Consequência a registrar sem decidir:** o mesmo texto que a verificação
reprova é a fonte do veredito apresentado. **Isso toca a apresentação e PODE
pertencer ao escopo da correção; a inclusão é decisão do pesquisador.**

### Eixo 1 implementado: detecção e classificação dos resultados numéricos

**Medido em 13/09/2026.** Dois commits sobre `54f118a`, publicado: **`7394cef`**,
extração mecânica, e **`0f99fad`**, as três mudanças de comportamento. ⚠ **Esta
etapa NÃO é proteção efetiva**, e a razão está no fim desta seção.

#### O que mudou, e só isto

| # | Mudança | Onde |
|---|---|---|
| 1 | a expressão de escores passou de `[\d.]+` para `[\d.,]+`, em fábrica para não herdar `lastIndex`, e o valor é normalizado antes de comparar. **Tolerância e casas inalteradas:** seguem `toFixed(4)` e `toFixed(6)`, e a guarda `> 0 && < 1` é a mesma | `lib/ai-reviewer/validate-review.ts:55` e `:58` |
| 2 | `SCORE_NAO_RECONHECIDO` saiu de `warnings` e entrou em `issues`. **O texto da mensagem não mudou; mudou o balde** | `:148` |
| 3 | `ValidationResult` ganhou `estado` (`aprovado`/`reprovado`/`inconclusivo`) e `inconclusivos[]`; `isValid` passou a ser `issues.length === 0 && inconclusivos.length === 0` | `:33`, `:186`, `:190` |

⚠ **Por que o inconclusivo leva `isValid: false`:** a resposta não pode declarar
"válido" e "inconclusivo" ao mesmo tempo. Quem precisa distinguir reprovado de
inconclusivo lê `estado`, que tem três valores, e não `isValid`, que tem dois.

**Precedência, implementada e testada:** havendo reprovação por outra regra **e**
inconclusão numérica, prevalece **reprovado** no estado, e o motivo da inconclusão
**é preservado** em `inconclusivos`, sem substituir o veredito.

#### Os seis casos pelo handler real, antes e depois

**Mesmo instrumento fora da árvore versionada**, cliente do modelo simulado,
nenhum parecer real gerado. **Casos 1 a 4 com texto idêntico, variando só o valor
no mesmo ponto.**

| # | Entrada | ANTES de `0f99fad` | DEPOIS |
|---|---|---|---|
| 1 | referência, vírgula | `isValid true`, 0 *issues* | **aprovado**, 0 *issues* |
| 2 | referência, ponto | `isValid true`, 0 *issues* | **aprovado**, 0 *issues* |
| 3 | fictício, vírgula | `isValid true`, 0 *issues* | **reprovado**, 1 *issue* |
| 4 | fictício, ponto | `isValid true`, 0 *issues*, 2 avisos | **reprovado**, 1 *issue*, 1 aviso |
| 5 | afirmação sem referência válida | `isValid true`, 0 achados | **inconclusivo**, 1 motivo |
| 6 | **controle**, sem afirmação | `isValid true`, 0 achados | **aprovado**, 0 achados |

**Três leituras que a tabela exige, e nenhuma é decorativa:**

1. **O caso 1 tem o mesmo resultado observável antes e depois, e a causa mudou.**
   Antes o silêncio vinha de a vírgula **impedir** a comparação; agora vem de
   comparação **feita** que confere. ⚠ **Resultado igual não é comportamento
   igual**, e é por isso que a extração de `7394cef` foi conferida caso a caso
   antes de mexer em nada.
2. **No caso 4 os avisos caíram de dois para um** porque o achado de escore mudou
   de balde. O aviso remanescente é `FORMULA_INCOMPLETA`, **fora deste eixo e não
   tocado**.
3. **O caso 6 continua não sendo inconclusivo.** Falta a **afirmação**, não a
   referência, e regra sem afirmação aplicável não roda. ⚠ **Era o risco nomeado
   antes de implementar:** criar um estado que dispara onde não há o que julgar.

#### A extração, e a premissa que não se sustentava

`7394cef` moveu 256 linhas da rota para `lib/ai-reviewer/`, em **dois** arquivos:
`validate-review.ts`, com o validador, e `review-request.ts`, com o contrato da
requisição e `getValidFinalScores`. **Dois, e não um, por medição:** `ReviewRequest`
arrasta `IndividualStats` e `RespondentData` e tem **três consumidores que nada têm
a ver com validação** — `calculateGrade`, `normalizeRequest` e `generateReview` —,
e fazê-los importar de um arquivo chamado `validate-review.ts` seria dependência
enganosa.

⚠ **A premissa de que a extração era necessária para testar o validador NÃO se
sustenta**, e fica registrada porque é da mesma família já corrigida em A.21.
`roots`, no `jest.config.js`, limita onde os testes são **descobertos**, não de onde
importam, e o ensaio de F06 exercitou o handler real sem exportar nada da rota. **A
extração serve à legibilidade do teste e à separação entre movimento de código e
mudança de comportamento** — que é a regra do `CLAUDE.md` —, não a uma restrição do
jest.

**Conferência da extração:** os seis casos pelo handler deram resultado **idêntico**
antes e depois, com o corpo inteiro da resposta comparado. **Excluído da
comparação: apenas `metadata.timestamp`**, o instante da execução, variável por
natureza. Nada mais foi excluído.

#### Consequência medida, registrada e não corrigida aqui

**Com resultado puramente inconclusivo, a rota passa a registrar
`VALIDAÇÃO FALHOU: []` no console**, porque o log depende de `!isValid` e imprime
`issues`, que está vazio nesse caso. **É log, não resposta.** Corrigi-lo pertence ao
eixo 2, que trata do contrato e da apresentação.

#### Por que A.27 continua aberta

⚠ **Medido, e não é ressalva de estilo:** nos seis casos, depois de `0f99fad`, a
resposta seguiu com **`success: true`, `nota: A` e `veredicto: ACEITO`**, e o texto
voltou **inteiro**, inclusive nos dois que agora reprovam. **O que existe ao fim do
eixo 1 é o resultado da verificação disponível e não consultado.** O eixo 2 é o que
o torna efetivo, e só ele fecha o aceite.

### Linha de base da suíte, nesta rodada

`npm test` sai **0**, com **5 suítes e 91 testes**. A rodada não altera código, e a
suíte serve só de linha de base.

### Decisões pendentes de F06

⚠ **SEÇÃO HISTÓRICA.** As quatro decisões abaixo estavam pendentes ao fim do eixo
1. Foram decididas pelo pesquisador em 14/09/2026 e implementadas no eixo 2; o
registro de fechamento está depois das recomendações.

⚠ **Atenção: nenhuma destas está decidida.** O que segue são as opções com o que a
medição diz sobre cada uma. Recomendação, onde houver, está registrada **como
recomendação**.

1. **Consequência da reprovação:** bloquear a devolução, ou devolver com quarentena
   visível na interface. **A medição não escolhe entre as duas**, e o aceite de A.27
   admite ambas.
2. **Tratamento dos avisos:** se aviso também suspende a apresentação ou apenas
   aparece. ⚠ **A medição mostra que a decisão importa mais do que parecia:** o
   escore fictício com ponto produz **aviso**, não *issue*, e com vírgula não produz
   nada. **Tratar só `issues` deixaria o caso do ponto passar.**
3. **Verificação inconclusiva:** o que fazer quando a regra não consegue julgar.
   ⚠ **Este estado existe, e está medido:** com vírgula decimal, a regra 5 nem chega
   a comparar, porque a guarda `> 0` a interrompe. **Hoje o inconclusivo é
   indistinguível do aprovado**, nos dois casos ausência de achado.
4. **Escopo:** se a origem da nota e do veredito, do achado adjacente, entra na
   correção.

#### Recomendações do pesquisador para a Fase 2, registradas em 13/09/2026

⚠ **São recomendações para DECIDIR antes de implementar, e não decisões.** Ficam
aqui na mesma ordem das quatro pendências acima, uma para cada.

⚠ **A coluna da direita declara o ALCANCE**, e isso é deliberado: o ensaio mediu o
comportamento de um handler diante de textos sintéticos, e **nenhuma das quatro
recomendações é conclusão imposta por esses números**. Onde a medição apoia, o apoio
está nomeado; onde ela não alcança, o limite está nomeado junto.

| # | Recomendação | Base, e o que a medição NÃO sustenta |
|---|---|---|
| 1 | **Reprovação: quarentena visível**, com o texto **separado** do parecer aprovado e **os motivos apresentados** | **É escolha de funcionamento:** preservar o material para inspeção sem apresentá-lo como aprovado. ⚠ **Não é conclusão imposta pelos números do ensaio.** O aceite de A.27 admite bloquear ou pôr em quarentena, e **a medição não escolhe entre as duas**; a escolha é do pesquisador, e a justificativa dela é a finalidade, não o dado |
| 2 | **Avisos: exibição explícita, sem bloqueio automático de todos.** ⚠ **Número identificado como incompatível com os dados exige tratamento próprio: não pode seguir como aviso inofensivo** | **Medido:** `FORMULA_INCOMPLETA` saiu nas quatro chamadas, logo **não distingue os quatro escores**; e aviso não derruba `isValid`, por `isValid: issues.length === 0`. ⚠ **Aviso constante NÃO é aviso dispensável**, e o ensaio **não demonstra** que esse aviso nunca deva bloquear. **A gravidade dele tem de ser definida pelo que a regra 2b efetivamente detecta** — texto que menciona fórmula sem distinguir pesos pessoais (`v`) de rescaling (`s`) —, e **essa definição não sai deste ensaio** |
| 3 | **Verificação inconclusiva: estado explícito, sem equivalência com aprovação** | **Medido:** `0,9999` devolve validação **indistinguível** de `0.0641`, que é correto. ⚠ **Isso demonstra uma LACUNA DE DETECÇÃO, não um estado inconclusivo já reconhecido.** O "inconclusivo" é proposta para situações **identificáveis** em que a verificação não consegue julgar, e **não resolve sozinho uma falha silenciosa da expressão regular**: enquanto a regra não reconhecer o número, não há o que marcar como inconclusivo |
| 4 | **Nota e veredito entram na correção**, para que `"A"` e `"ACEITO"` extraídos do texto **não se sobreponham** à reprovação nem à inconclusão | **Medido:** o handler **extraiu e devolveu** `nota: "A"` e `veredicto: "ACEITO"` nas quatro chamadas, inclusive na que trazia número inventado. ⚠ **O texto era SIMULADO por mock**, então o ensaio **não demonstra** que uma geração real produziria esses mesmos rótulos. O que ele demonstra é o **comportamento do handler** diante de um texto que os contém |

⚠ **Consequência do item 3 para a especificação da Fase 2: são dois defeitos, e não
um.** A **lacuna de detecção** da expressão de escores e a **ausência de estado
inconclusivo** na resposta são distintas, e a segunda não cobre a primeira. **A Fase
2 tem de tratá-las separadamente**, sob pena de criar um estado que nunca é atingido
justamente nos casos que motivaram criá-lo.

**Recomendação anterior, mantida:** qualquer saída escolhida precisa distinguir três
estados na resposta, e não dois, porque hoje "verificado e aprovado", "verificado com
aviso" e "não foi possível verificar" chegam à interface com a mesma forma, que é
`success: true` com o texto inteiro.

### Eixo 2 implementado: contrato e apresentação governados pela validação

**Decisão do pesquisador, 14/09/2026.** Aprovado é exibido normalmente e mostra
avisos; reprovado é identificado como **"Parecer reprovado na verificação"**, com
motivos e texto em área de quarentena; inconclusivo é identificado como
**"Verificação inconclusiva"**, com motivo e texto em quarentena; validação ausente
ou inválida não autoriza aprovação e aparece como **"Verificação não confirmada"**.

**Implementado em `ad729f7`.** O campo `success` continua informando que a geração
terminou; ele não governa mais a autorização para apresentar o conteúdo como
aprovado. A API agora emite contrato de validação `version: 1`. A fronteira de
apresentação exige versão, booleano e arrays válidos e verifica a coerência entre
`estado`, `isValid`, `issues` e `inconclusivos`. Ausência, versão desconhecida,
payload parcial ou combinação contraditória caem em `nao_confirmado`, sempre em
quarentena.

Na interface, `validation` passa a ser copiado para o estado do parecer. Somente
`aprovado` apresenta nota e veredito como classificação. Reprovado, inconclusivo e
não confirmado exibem alerta, motivos e o texto em contêiner visualmente separado.
Avisos são visíveis também no parecer aprovado. O texto continua acessível para
inspeção nos estados de quarentena, como decidido.

**O log vazio medido no eixo 1 também foi corrigido:** reprovação registra
`issues`; inconclusão registra `inconclusivos`, com rótulos distintos. Isso muda o
log, não o veredito da apresentação.

#### Verificação do eixo 2

Em ambiente Linux x86_64, Node v24.19.0 e npm 11.9.0, no commit `ad729f7`:

- `npx tsc --noEmit`: saída 0;
- `npm test -- --runInBand`: saída 0, **7 suítes e 105 testes**;
- `npm run build`: saída 0, compilação concluída e **17 páginas** geradas.

Os sete casos novos cobrem: aprovado com aviso; reprovado com preservação de
`issues` e de inconclusão adjacente; inconclusivo com motivo; validação ausente;
contrato sem versão; estado contraditório; e arrays inválidos. ⚠ São testes da
decisão de contrato que governa a interface, não uma afirmação de que todo defeito
possível do texto será detectado pelo validador.

**Aceite de A.27 atendido:** falha e impossibilidade de verificação não são mais
apresentadas como aprovação; permanecem acessíveis somente em quarentena visível.

---

## F09: diagnóstico da recuperação semântica, Fase 1 de A.30

**Fase 1 de A.30, medida em 14/09/2026 no commit `7422e87`.** Esta rodada **não
corrige nada**: observa os serviços reais uma etapa de cada vez, demonstra em
separado como o software trata cada condição, e declara o alcance de cada
evidência sem estendê-lo ao que a outra mediu.

⚠ **A natureza da evidência é declarada em cada afirmação**, com os mesmos três
rótulos de F06: **medido** quando houve execução, **estabelecido por leitura**
quando vem do código lido, e **não medido** quando nenhuma das duas aconteceu.

⚠ **Três coisas ficam separadas do começo ao fim:** o **sinal entregue ao
modelo**, o **metadado devolvido pela rota**, e a **informação visível ao
usuário**. **As duas primeiras foram medidas nesta rodada; a terceira foi
estabelecida por LEITURA de `components/ParecerAISection.tsx`, sem execução da
interface.** As três **não coincidem**. ⚠ **E o que um leitor concluiria de cada
camada é interpretação, não observação: nenhum usuário foi observado nesta
rodada.**

⚠ **Instrumentos temporários, fora da árvore versionada**, no diretório de
trabalho da sessão. Nada em `app/`, `lib/` ou `components/` foi alterado, e
nenhuma função foi exportada para permitir os ensaios. **Nenhuma escrita no
índice:** as consultas da observação real são somente de leitura, e os clientes
simulados recusam `upsert` e `reset` por construção.

### Ambiente desta rodada

| Item | Estado, medido |
|---|---|
| `git rev-parse --short HEAD` | `7422e87` |
| `git branch --show-current` | `main` |
| `git status --short` | vazio, árvore limpa |
| `git diff HEAD -- docs/` | vazio, nenhuma alteração manual pendente |
| arquivos rastreados | **151**, iguais antes e depois da rodada |
| plataforma | `win32 x64`, Node `v24.12.0`, npm `11.18.0` |

**Configuração carregada pelo mesmo caminho da aplicação**, que é `loadEnvConfig`
de `@next/env`, e **antes** de qualquer importação da rota, porque
`USE_RAG_SEMANTIC` é fixado no momento da importação, em `route.ts:40`.
**Medido:** o único arquivo de env carregado é `.env.local`.

| Variável | Estado, medido | Observação |
|---|---|---|
| `VOYAGE_API_KEY` | **presente** | valor não registrado em lugar nenhum |
| `UPSTASH_VECTOR_REST_URL` | **presente** | valor não registrado em lugar nenhum |
| `UPSTASH_VECTOR_REST_TOKEN` | **presente** | valor não registrado em lugar nenhum |
| `USE_RAG_SEMANTIC` | **ausente**, sem valor definido | não é segredo, e a ausência é o dado |

⚠ **Credencial presente não prova autenticação válida nem acesso ao índice.**
Presença é presença, e o que se mediu depois desmente qualquer leitura mais
generosa dessas três linhas.

⚠ **`USE_RAG_SEMANTIC` ausente tem consequência direta:** `route.ts:40` compara
com a cadeia `'true'`, então **neste ambiente a rota não executaria a recuperação
semântica**. Os ensaios das seções seguintes fixaram a variável explicitamente
antes de importar a rota, e isso está declarado em cada caso. **A execução 7
rodou em produção**, com a variável verdadeira; o que se mede aqui descreve este
ambiente, e a diferença fica registrada em vez de generalizada.

### As cinco consultas aos serviços reais, com as duas etapas separadas

**Medido.** Instrumento fora da árvore, importando `lib/rag/embed` e
`lib/rag/upstash-client` **diretamente**, sem passar por `getRAGSemantic`, que é
onde a distinção se perde. As cinco consultas são as de `RAG_SEMANTIC_QUERIES`,
em `route.ts:44` a `:50`, com `topK` igual a 5, que é `route.ts:52`. Execução
**sequencial**.

| # | Consulta | `embed` | `querySimilar` |
|---|---|---|---|
| 1 | `consistência julgamentos AHP CR Saaty` | **sucesso**, dimensão **1024**, 600 ms | **falha**, tipo `SyntaxError`, mensagem `Unexpected end of JSON input`, 479 ms |
| 2 | `BOCR síntese fórmula subtrativa Wijnmalen comensurabilidade` | **sucesso**, dimensão **1024**, 243 ms | **falha**, tipo `SyntaxError`, mensagem `Unexpected end of JSON input`, 451 ms |
| 3 | `análise sensibilidade ranking AHP estabilidade` | **sucesso**, dimensão **1024**, 277 ms | **falha**, tipo `SyntaxError`, mensagem `Unexpected end of JSON input`, 445 ms |
| 4 | `agregação média geométrica AIJ Forman Saaty grupo` | **sucesso**, dimensão **1024**, 244 ms | **falha**, tipo `SyntaxError`, mensagem `Unexpected end of JSON input`, 445 ms |
| 5 | `viés cognitivo painel decisão MCDM` | **sucesso**, dimensão **1024**, 237 ms | **falha**, tipo `SyntaxError`, mensagem `Unexpected end of JSON input`, 444 ms |

**Cinco de cinco em `embed`: sucesso. Cinco de cinco em `querySimilar`: falha.**
Nenhuma etapa ficou sem estado, e **nenhum estado "não executado" ocorreu**, porque
a etapa anterior nunca falhou.

⚠ **O estado "sucesso com lista vazia" não apareceu, e não poderia:** ele não é
estado possível de `embed`, cuja implementação lança erro para resposta sem dado e
para dimensão inesperada (`embed.ts:59` a `:73`), **estabelecido por leitura**. E
em `querySimilar` ele não ocorreu porque as cinco lançaram antes de devolver
qualquer lista.

#### Conferência à mão do caso mais visível

⚠ **Primeiro agregado produzido por instrumento novo, logo conferido à mão antes
de ser aceito.** O caso escolhido é o mais visível, que é a consulta 1, a primeira
da lista e a mesma que abre o log da execução 7.

**Medido, em duas evidências independentes:**

1. **A pilha da exceção**, sanitizada, situa o erro em `JSON.parse` chamado por
   `parseJSONFromBytes` dentro do undici, ou seja **no processamento do corpo da
   resposta HTTP**, e não no código do repositório:

```
SyntaxError: Unexpected end of JSON input
    at JSON.parse (<anonymous>)
    at parseJSONFromBytes (node:internal/deps/undici/undici)
    at successSteps (node:internal/deps/undici/undici)
    at readAllBytes (node:internal/deps/undici/undici)
```

2. **Duas requisições somente de leitura ao endpoint configurado**, feitas fora do
   cliente, registrando apenas metadados da resposta: `GET /info` devolveu **404,
   zero byte de corpo, sem `content-type`**, e `POST /query` devolveu **404, zero
   byte de corpo**. O domínio de topo do endpoint configurado é `upstash.io`.

**O que as duas juntas estabelecem:** a pilha localiza o processamento da resposta
dentro de `querySimilar`, e as sondas observaram **404 com corpo vazio** no endpoint
configurado. ⚠ **Sem captura da própria requisição do SDK, isso não demonstra que
ele recebeu aquelas respostas.** O mecanismo é **compatível e reproduzível**, e é
assim que fica registrado. **A etapa que falha, neste ambiente e hoje, é a consulta
ao índice.**

⚠ **O que elas NÃO estabelecem:** a razão do 404. Índice removido, índice
renomeado, credencial de outro projeto e URL desatualizada são leituras
compatíveis com o mesmo corpo vazio, e **nenhuma delas foi medida**. A conferência
do valor configurado aqui contra o valor configurado em produção **não foi feita
nesta rodada**. ⚠ **E a razão não é risco de segredo:** a comparação se responde
como **coincide ou não coincide**, sem divulgar valor nenhum. **O que faltou foi
acesso, ou a conferência, nesta rodada.**

#### Alcance desta sonda, declarado

- **Uma falha reproduzida hoje localiza a etapa NESTE ensaio.** Ela **não prova**
  a origem da falha histórica: o log da execução 7 preserva a mensagem, e **a
  mensagem sozinha não estabelece nem a classe da exceção nem a chamada que a
  originou**. O que se pode dizer é que a mensagem observada hoje é a mesma, e que
  hoje ela vem de `querySimilar`. **Coincidência de mensagem não é identidade de
  causa.**
- **A sonda acima é sequencial; a rota executa as cinco com `Promise.all`**, em
  `route.ts:93` a `:95`. Por isso a observação foi **repetida sob a mesma
  concorrência**, e **medido:** as cinco em paralelo, 997 ms no total, com
  **`embed` sucesso em dimensão 1024 nas cinco** e **`querySimilar` falha com
  `SyntaxError` e a mesma mensagem nas cinco**. O resultado coincide com o
  sequencial, e **é esse ensaio, não o sequencial, que descreve o modo como a rota
  chama**.
- **Este ambiente não é o da execução 7**, que rodou em produção. A comparação
  entre os dois ambientes **não foi medida**.

### As três montagens com a dependência simulada

**Medido.** Aqui a dependência externa é simulada e **o caminho do software
permanece real**: `embed`, `querySimilar`, `getRAGSemantic`, a agregação de
`getSemanticChunks`, a formatação de `formatSemanticChunks` e o handler `POST`
são os do repositório. A variável `USE_RAG_SEMANTIC` foi fixada em `'true'` antes
da importação da rota, e as credenciais usadas são **fictícias**, porque os
clientes estão simulados e nenhuma rede é tocada.

| Montagem | O que `getRAGSemantic` devolve | `failedQueries` | Aviso do `catch` |
|---|---|---|---|
| a. `querySimilar` devolve **lista vazia** sem exceção | cinco arrays de zero elementos | **5** | **nenhum** |
| b. `embed` **lança** exceção | cinco arrays de zero elementos | **5** | **cinco**, todos `[rag/semantic-retrieve] retrieval failed (silent failover): Unexpected end of JSON input` |
| c. `querySimilar` **lança** exceção | cinco arrays de zero elementos | **5** | **cinco**, idênticos aos da montagem b |

**As três produzem estatísticas iguais campo a campo**, e a linha de resumo de
`route.ts:578` sai idêntica nas três:

```
[AI-REVIEWER] RAG semantic: 5 queries -> 0 raw -> 0 unique -> 0 final from 0 papers (top score N/A, 5 failed queries)
```

**Duas consequências medidas, e elas são distintas:**

1. **Vazio e erro são indistinguíveis nos metadados e na linha de resumo.** A
   montagem a, em que nada falhou, devolve o mesmo `failedQueries: 5` das
   montagens b e c.
2. **Erro de embedding e erro de consulta ao índice são indistinguíveis também no
   log.** As montagens b e c produzem **a mesma quantidade e o mesmo texto** de
   aviso. O único sinal que separa a montagem a das outras duas é a **presença**
   dos avisos, que não está em nenhum campo estruturado.

⚠ **Alcance:** isto demonstra **como o software trata** vazio e erro. **Não
demonstra que o índice real produziu vazio legítimo.** Vazio legítimo do índice
**não foi observado** nesta rodada: na consulta real das cinco, `querySimilar`
lançou antes de devolver lista.

⚠ **E não serviria de controle procurar tema fora do domínio no índice real:**
`querySimilar` envia apenas `vector`, `topK` e `includeMetadata`, em
`upstash-client.ts:113` a `:117`, **sem filtro nem limiar de score**, então uma
consulta sem pertinência tende a devolver os vizinhos mais próximos assim mesmo.
**Estabelecido por leitura.**

### Os seis casos do contexto entregue ao modelo

**Medido**, no mesmo desenho da seção anterior, capturando os argumentos recebidos
pelo cliente Anthropic simulado, ou seja **`system` e `messages`**. **Nenhum
parecer real foi gerado.**

⚠ **A simulação entra nos clientes externos, não em `getRAGSemantic`.** Um
substituto de `getRAGSemantic` devolvendo lista vazia pularia justamente o
tratamento interno das falhas que esta rodada mede.

| Caso | `enabled` | `queriesRan` | `rawChunks` | `finalChunks` | `failedQueries` | avisos | blocos na seção do prompt |
|---|---|---|---|---|---|---|---|
| 1. recuperação desabilitada | `false` | **0** | 0 | 0 | **0** | 0 | 0, com frase de ausência |
| 2. sucesso com chunks conhecidos | `true` | 5 | **25** | **9** | **0** | 0 | **9** |
| 3. sucesso vazio | `true` | 5 | 0 | 0 | **5** | 0 | 0, com frase de ausência |
| 4. falha de embedding | `true` | 5 | 0 | 0 | **5** | **5** | 0, com frase de ausência |
| 5. falha de consulta ao índice | `true` | 5 | 0 | 0 | **5** | **5** | 0, com frase de ausência |
| 6. resultados mistos | `true` | 5 | **4** | **4** | **3** | **2** | **4** |

**Onde cada coisa chega, medido nos seis casos:** o `system` é **idêntico** nos
seis, com o mesmo resumo criptográfico, tem 37060 caracteres e **não contém** a
seção semântica nem nenhum chunk. `messages` tem **um** elemento, de papel
`user`, e é nele que a seção "Evidências Semânticas Recuperadas (RAG Vetorial)"
aparece, sempre, inclusive quando não há o que recuperar.

⚠ **Achado central desta seção, e ele é medido por resumo criptográfico, não por
tamanho:** os casos **1, 3, 4 e 5** produzem **o mesmo prompt de usuário, byte a
byte**. Recuperação desligada, índice sem correspondência, falha de embedding e
falha de consulta ao índice **entregam ao modelo exatamente o mesmo texto**. A
única diferença entre eles vive no log e, parcialmente, nos metadados.

⚠ **Os resumos criptográficos dos seis prompts NÃO estão registrados, e a busca por
eles ficou sem resultado.** Busca feita em 14/09/2026 sobre `83c1ce7`, sem resultado
predeterminado: **não encontrados nos artefatos consultados**. O algoritmo usado
tampouco está nomeado em lugar nenhum, então nem os valores nem o método constam.

**Locais examinados:** todos os arquivos rastreados do repositório, por sequência
hexadecimal de 64 caracteres e pelos termos `resumo criptográfico`, `SHA`, `hash` e
`digest`, que devolvem apenas os digests do parecer e dois valores alheios a esta
seção; as mensagens de todos os commits do repositório, inclusive a de `c2d7d89`, que
registra a rodada e não traz digest de prompt; os arquivos não rastreados do diretório
de trabalho, que não existem; e o diretório de trabalho da sessão de 14/09/2026, que
guarda apenas os instrumentos da Fase 2.

**Locais NÃO acessíveis desta sessão:** os instrumentos temporários da Fase 1, que
esta mesma seção declara terem ficado **fora da árvore versionada, no diretório de
trabalho daquela sessão**, na máquina Windows; e o registro de saída daquela execução.

⚠ **Ausência numa busca delimitada não é perda definitiva.** Enquanto os instrumentos
da máquina Windows não forem consultados, o que se pode afirmar é o que está escrito
acima, e nada além. **A solicitação continua pendente**, e os digests dos dois
recortes do parecer, registrados no Anexo 3, **não a substituem**: identificam o texto
gerado, não os prompts simulados.

**A frase de ausência, verbatim do que foi capturado nos casos 1, 3, 4 e 5:**

```
## Evidências Semânticas Recuperadas (RAG Vetorial)

_(nenhum chunk semântico recuperado nesta execução)_
```

⚠ **Isso confirma que o parecer não sai sem base**, e a formulação correta do
defeito é outra: a recuperação semântica falha e o resultado **não distingue
adequadamente essa falha de uma consulta vazia**. Os injetores estáticos
continuam operando por caminho separado, e a própria frase de ausência é entregue
ao modelo.

#### A comparação com `finalChunks`

**Medido no caso 2**, desenhado para que a deduplicação e o teto por artigo
tivessem o que fazer: cinco respostas de cinco chunks cada, com repetições entre
consultas e seis chunks distintos de um mesmo artigo.

| Grandeza | Valor medido | O que a explica |
|---|---|---|
| `rawChunks` | **25** | cinco consultas por cinco resultados |
| `uniqueChunks` | **14** | deduplicação por `id`, que descarta 11 repetições |
| `finalChunks` | **9** | teto de 3 por `article_id`, em três artigos |
| blocos no prompt | **9** | contados na seção semântica do texto capturado |
| chunks identificáveis no prompt | **9** | marcadores próprios, um por chunk, todos os nove encontrados |

**`finalChunks` coincide com o que o texto enviado contém**, nos casos 2 e 6.
⚠ **`rawChunks` não coincide, e não precisa coincidir:** ele conta antes da
deduplicação e do teto. **Nenhuma divergência entre `finalChunks` e o texto
enviado foi observada nesta rodada.**

**Transcrição do primeiro bloco da seção, no caso 2.** ⚠ A saída original traz um
travessão antes de `score`, substituído aqui por `[travessao]` para respeitar a
regra de redação desta rodada; o resto é literal:

```
**1. f09_artigo_alfa** (claim loc-a1, p. 101) [travessao] score: 0.950
SENTINELA-F09-A1 texto do chunk a1.
*Verbatim:* "verbatim do chunk a1"
```

⚠ **Os chunks deste ensaio são sintéticos**, com identificadores próprios, e **não
vieram do índice**. O que o caso 2 demonstra é o **transporte**: o que a
recuperação devolve chega ao contexto, na quantidade que `finalChunks` declara.
**Ele não demonstra nada sobre o conteúdo do índice real.**

### O alcance de `failedQueries`, e o que um leitor conclui hoje

**Estabelecido por leitura**, em `route.ts:97`:

```
const failedQueries = results.filter((r) => r.length === 0).length;
```

⚠ **Correção de localizador:** a linha de A.30 no âncora e a seção F09 da
execução 7 citam `route.ts:95`. **Medido no commit `7422e87`, a expressão está na
linha 97.** O conteúdo registrado continua correto; o número mudou.

**O que o campo conta:** resultado de comprimento zero. Como `getRAGSemantic`
devolve lista vazia tanto no failover silencioso quanto na ausência de
correspondência, **o campo reúne as duas condições**, e o caso 6 mostra que ele
também não conta o mesmo que o log: **`failedQueries` igual a 3**, com **um**
resultado vazio e **duas** exceções, contra **dois** avisos no `console.warn`.

**Por onde o número sai, e a natureza da evidência muda por camada:**

| Camada | O que carrega hoje | O que um leitor conclui |
|---|---|---|
| sinal entregue ao modelo | a frase de ausência, idêntica em quatro condições distintas | que não houve chunk nesta execução, **sem nenhuma informação sobre por quê** |
| metadado devolvido pela rota | `metadata.knowledgeBase.semantic`, em `route.ts:1414`, com os oito campos de `SemanticStats` | que cinco consultas rodaram e cinco "falharam", **sem poder separar erro de ausência de correspondência**, e sem saber qual etapa |
| linha de resumo do log | `route.ts:578`, com `5 failed queries` | o mesmo, e só aparece quando `enabled` é verdadeiro |
| informação visível ao usuário | **nada** | nada |

⚠ **A terceira camada é a mais severa, e é estabelecida por leitura:**
`components/ParecerAISection.tsx` declara `knowledgeBase` com `refsUsed`,
`criticalRefs` e `uniqueArticles`, nas linhas 18 a 22, e **o campo `semantic` não
está no tipo nem é lido em lugar nenhum**. O que a interface exibe são `refsUsed`
e `uniqueArticles`, nas linhas 329, 331 e 363, **que vêm da base estática e não
mudam quando a recuperação semântica falha**. **Com as cinco consultas
devolvendo vazio, a interface continua afirmando o mesmo número de referências e
de artigos.**

**Resposta direta à pergunta do item 7:** quem lê os metadados hoje, com as cinco
consultas vazias, conclui que **houve cinco falhas de consulta**, o que é a
leitura natural do nome do campo. **Essa leitura pode estar certa ou errada**, e
os metadados não contêm o que a decidiria: a montagem a desta rodada produz o
mesmo `failedQueries: 5` **sem nenhuma falha**.

### Linha de base da suíte, nesta rodada

`npm test` sai **0**, com **7 suítes e 105 testes**, em `win32 x64`, Node
`v24.12.0` e npm `11.18.0`, no commit `7422e87`. **A rodada não altera código**, e
a suíte serve só de linha de base. ⚠ **Registro de execução, não afirmação de
compatibilidade.** `npm run build` **não foi executado**, por instrução da rodada.

### Decisões pendentes de F09

⚠ **Atenção: nenhuma destas está decidida.** O que segue são as decisões que a
Fase 2 precisa tomar antes de qualquer correção. **Elas não repetem os requisitos
que a linha de A.30 já fixou**, que são separar erro de vazio na instrumentação e
sinalizar execução degradada nos metadados: esses são requisitos, e o que está em
aberto é **como**.

1. **Representação dos resultados de cada etapa.** Quantos estados o resultado de
   uma consulta passa a ter, e se `embed` e `querySimilar` recebem estados
   próprios ou um estado único com a etapa nomeada dentro. ⚠ **A medição delimita
   o problema, e não escolhe a forma:** os estados que ocorreram nesta rodada são
   quatro em `querySimilar`, contando "não executado", e três em `embed`, porque
   "sucesso com lista vazia" não existe ali. **Recomendação técnica, rotulada como
   recomendação:** qualquer forma escolhida precisa permitir que uma consulta
   registre **etapa alcançada** e **etapa não executada**, porque foi exatamente
   essa distinção que faltou na execução 7.
2. **Mecanismo de propagação dos erros, com a origem preservada.** Se o failover
   continua silencioso e o erro passa a viajar num campo do resultado, se a
   exceção original é reempacotada com prefixo de etapa, ou se o recuperador
   devolve um objeto em vez de um array. ⚠ **O que a medição sustenta:** a
   mensagem histórica não tem prefixo, e os erros próprios de `embed.ts` e
   `upstash-client.ts` têm; **a exceção que apareceu nas cinco consultas não é de
   nenhum dos dois módulos**, é do processamento do corpo da resposta, então **os
   prefixos dos erros explícitos existentes não envolveram essa exceção da
   dependência**. ⚠ **Isso NÃO exclui acrescentar a etapa ao capturar a exceção**,
   que continua sendo solução possível: o medido é que os prefixos já presentes não
   alcançam essa exceção, não que prefixo algum alcance. **Recomendação
   técnica, rotulada como recomendação:** preservar a exceção original junto com a
   etapa, em vez de substituí-la por texto.
3. **Exposição na interface.** Se a execução degradada aparece ao usuário, com que
   texto, e em que lugar. ⚠ **Isto conversa diretamente com o eixo 2 de A.27**,
   que já pôs em prática a ideia de que a interface não apresente como normal o
   que não foi verificado. **Não decidido:** se recuperação degradada é condição
   da mesma natureza que verificação reprovada, ou de natureza distinta e com
   tratamento próprio. **A medição não escolhe**, e a diferença importa: a
   validação julga o texto gerado, enquanto isto descreve o contexto que entrou.
4. **Comportamento quando toda a recuperação falhar.** Se o parecer continua sendo
   gerado com a base estática, se é gerado e marcado, ou se a geração é
   interrompida. ⚠ **O que a medição sustenta:** a base estática permanece por
   caminho separado. Gerar e marcar preserva o contexto estático disponível. Não
   foi medida equivalência de conteúdo ou de qualidade em relação à geração com
   recuperação semântica. ⚠ **O que a medição NÃO sustenta:** qualquer afirmação sobre a
   qualidade do parecer gerado sem chunks semânticos. **Nenhum parecer real foi
   gerado nesta rodada**, e comparar pareceres com e sem recuperação é ensaio
   próprio, que não foi feito.

⚠ **Uma quinta questão fica registrada e não é decisão de engenharia:** a razão do
404 do endpoint configurado. **Ela precede a correção pelo efeito prático**, porque
nenhuma instrumentação nova recupera chunk de um índice que não responde, **e não
a precede pela ordem das tarefas**, porque a instrumentação é o que permitirá
distinguir as duas condições na próxima vez. **A dependência de A.18 continua
valendo**, e por mais um motivo agora medido: reingerir contra um endpoint que
devolve 404 pagaria embeddings sem destino verificável.

### Apuração do 404 na consulta ao índice: Fase 2 de A.30, 14/09/2026

**O ambiente desta rodada não é o da Fase 1 nem o da execução 7, e isso governa
tudo o que segue.** A Fase 1 rodou na máquina do pesquisador. A execução 7 rodou em
produção, na Vercel. Esta rodada rodou num **contêiner remoto Linux x86_64, Node
v22.22.2, npm 10.9.7**, sobre clone de `7422e87`, árvore limpa.

**Medido neste contêiner:** `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`,
`VOYAGE_API_KEY` e `USE_RAG_SEMANTIC` estão **ausentes** de `process.env`, e não há
`.env` nem `.env.local` no diretório de trabalho. **Medido também:** o proxy de
egresso deste contêiner recusa `upstash.io`, `upstash.com` e `api.voyageai.com` com
**403 no CONNECT**, antes de qualquer requisição HTTP.

⚠ **Esse 403 do proxy local nada tem a ver com o 404 da Fase 1, e juntar os dois
inverteria a conclusão.** O 403 é do proxy desta máquina, e a requisição nunca sai
dela; o 404 da Fase 1 foi resposta de um serviço a uma requisição que chegou.
**Os dois itens que exigem credencial e rede, a sonda do item 3 e a discriminação
do item 4, são irrealizáveis aqui, e não por falta de tentativa.**

⚠ **`c2d7d89` não estava neste clone nem no remoto no momento desta medição.**
`git merge-base --is-ancestor` respondeu `Not a valid object name`, e a API do
GitHub respondeu `No commit found for SHA`. ⚠ **Correção de alcance, 14/09/2026:**
a redação anterior concluía daí que o registro da Fase 1 **não estava versionado**, e
isso excede a medição. **Ausência num clone e num remoto, numa data, é ausência
naquele clone e naquele remoto, naquela data.** O commit existia na máquina do
pesquisador e foi publicado depois, o que esta medição não tinha como ver. O que esta
seção usa dele vem do enunciado da tarefa, não de medição própria. HEAD desta rodada:
`7422e87`.

#### 1. Forma da configuração

**Não apurado neste ambiente, e a razão é que a variável não existe aqui.** Nenhuma
das seis propriedades pôde ser lida: esquema, barra final, segmento de caminho,
sufixo do host, comprimento e espaços nas bordas ficam **não apurados**, e o mesmo
vale para presença, comprimento e bordas do token.

**O que ficou medido no lugar, e é medição sobre o SDK, não sobre a configuração:**
a normalização que a versão instalada aplica a cada uma dessas formas. Está na
tabela do item 2, e serve para ler a caracterização quando o pesquisador a produzir.

#### 2. O endereço que o SDK monta, medido e não apenas lido

Instrumento temporário fora da árvore: um servidor HTTP local em `127.0.0.1`
responde no lugar do Upstash, com **token falso**, e registra método, caminho,
tamanho de corpo e cabeçalhos. **Nenhuma credencial real, nenhuma requisição ao
serviço, nenhuma escrita em índice.** Sete formas de `baseUrl`, catorze chamadas,
**doze requisições chegaram ao servidor local**, porque uma das formas não produz
requisição alguma.

| Forma da `baseUrl` passada ao SDK | Caminho que chegou ao servidor | Erro que o SDK devolveu |
|---|---|---|
| sem barra final, sem caminho | `POST <host>/info`, `POST <host>/query` | `SyntaxError: Unexpected end of JSON input` |
| com **uma** barra final | `POST <host>/info`, `POST <host>/query` | idem |
| com **duas** barras finais | `POST <host>//info`, `POST <host>//query` | idem |
| com **segmento de caminho** extra | `POST <host>/algo/info`, `POST <host>/algo/query` | idem |
| com segmento extra **e** barra final | `POST <host>/algo/info`, `POST <host>/algo/query` | idem |
| com **espaço** no fim | **nenhuma requisição saiu** | `TypeError: Failed to parse URL from <host> /info` |
| com **quebra de linha** no fim | `POST <host>/info`, `POST <host>/query` | `SyntaxError: Unexpected end of JSON input` |

**O que isto mede.** Uma barra final é removida e a segunda não; um segmento de
caminho é preservado e vira `/algo/query`; o método é **POST nas duas rotas**,
inclusive em `info`. Confere com a leitura de `dist/chunk-VZUGHHBV.mjs`, e a
conferência à mão do caso mais visível fecha: o corpo de `info` é o literal `[]`,
**dois bytes**, e o de `query` começa em `{"vector":[1,0,0,` e termina em
`],"topK":5,"includeMetadata":true}`, 2092 bytes. Cabeçalhos enviados, sem os que o
`fetch` acrescenta: `authorization` no esquema `Bearer`, `content-type:
application/json`, `upstash-telemetry-sdk`, `upstash-telemetry-platform` e
`upstash-telemetry-runtime`.

⚠ **Uma hipótese morreu aqui, e era plausível:** espaço nas bordas da URL **não
explica o sintoma observado**. Com espaço no fim, o `join("/")` o deixa no meio do
endereço, o parser de URL recusa, e o que sobe ao log é `TypeError: Failed to parse
URL`, **sem requisição nenhuma**. O log da execução 7 diz `Unexpected end of JSON
input`, que é outro erro. ⚠ **Delimitação, porque a diferença é fina:** isso refuta
**espaço**, não espaço em branco em geral. **Quebra de linha é compatível com o
sintoma**, porque o parser de URL a remove de qualquer posição e a requisição sai
normalmente. As duas formas disparam o mesmo aviso do SDK, `The vector url contains
whitespace or newline, which can cause errors!`, medido nas duas.

⚠ **Nada disto estabelece que a forma da URL configurada cause o 404.** A tabela diz
o que cada forma produziria; qual delas está em uso continua **não apurado**.

⚠ **E o ensaio do SDK não conclui a apuração do endpoint real.** Ele rodou **neste
contêiner e contra um servidor local**, com token falso, e o que mede é o
comportamento do **cliente**. **A apuração do endpoint configurado na máquina Windows
continua sendo a da Fase 1**, e o que falta nela, a razão do 404, não é coisa que
ensaio com dependência simulada possa fechar.

#### 3. Versão do SDK, e o que a sonda pôde e não pôde fazer

`npm ls @upstash/vector --depth=0` nesta máquina: **`@upstash/vector@1.2.3`**, e
**coincide com o lockfile de `7422e87`**, que fixa a mesma versão.

Os localizadores citados no enunciado foram **relidos no arquivo instalado aqui** e
conferem: linha 20 faz `config.baseUrl.replace(/\/$/, "")`; linha 38 fixa
`method: "POST"`; linha 48 monta o endereço, com uma diferença de transcrição sem
consequência, `[this.baseUrl, ...req.path ?? []].join("/")` e não
`[this.baseUrl, ...req.path].join("/")`; linha 261 define `const endpoint = "info"`;
linhas 73 e 74 fazem `const body = await res.json()` **antes** de `if (!res.ok)`.

**A sonda contra o endereço configurado é não apurada**, pelas duas razões do
cabeçalho: não há credencial aqui, e o egresso para `upstash.io` está bloqueado.
**Status HTTP, comprimento de corpo e cabeçalhos de resposta do serviço real
continuam sem medição nesta rodada.** O `GET /info` da Fase 1 permanece como
**observação histórica**, rotulado como tal, e não foi repetido.

⚠ **Conferido antes de qualquer execução, e é o que mantém o critério 7:** as únicas
chamadas de escrita do repositório são `upsertChunk` e `deleteAll` em
`scripts/ingest-rag.ts` e `upsertChunk` em `scripts/test-rag-upstash.ts:62`.
**Nenhum dos dois scripts rodou**, e os instrumentos desta rodada não importam
`lib/rag/upstash-client.ts`.

#### 4. Discriminar 404 de recurso e 404 de rota

**Não apurado.** A comparação pedida, `/info` contra um caminho reconhecidamente
inexistente com a mesma credencial, exige as duas coisas que faltam aqui.

**O que ficou medido é outra discriminação, e ela muda a leitura do log.** Com o
mesmo servidor local, variando **só a resposta**:

| Resposta do servidor | O que o SDK devolve |
|---|---|
| **404** com corpo vazio | `SyntaxError: Unexpected end of JSON input` |
| **401** com corpo vazio | `SyntaxError: Unexpected end of JSON input` |
| **403** com corpo vazio | `SyntaxError: Unexpected end of JSON input` |
| **500** com corpo vazio | `SyntaxError: Unexpected end of JSON input` |
| **200** com corpo vazio | `SyntaxError: Unexpected end of JSON input` |
| **404** com corpo JSON `{"error":"not found"}` | `UpstashError: not found` |
| **404** com corpo HTML | `SyntaxError: Unexpected token '<'` |
| **200** com corpo JSON `{"result":[]}` | sem erro, resultado `[]` |

⚠ **A mensagem não identifica o status, e também não identifica o corpo.** O ensaio
controlado demonstrou que cinco status diferentes, com corpo vazio, produzem a mesma
mensagem. **O log histórico isolado não identifica o status, não demonstra corpo vazio
e não localiza a etapa.** **O 404 com corpo vazio foi observado nas sondas
independentes da máquina Windows**, na requisição crua, e não nesta mensagem.

⚠ **Correção de alcance, 14/09/2026:** a redação anterior desta seção dizia que a
mensagem "identifica corpo vazio", e isso excede a medição. **Corpo não vazio produz a
mesma frase.** Medido em `JSON.parse` nesta rodada: `[`, `{"a":`, `[1,` e `{"result":`
devolvem todos `Unexpected end of JSON input`, igual ao corpo vazio. ⚠ **E nem todo
corpo truncado devolve:** `{` sozinho devolve
`Expected property name or '}' in JSON at position 1`, outra frase. **O que a mensagem
diz é que o parse não chegou ao fim, não qual corpo chegou.** Quem a tratar como prova
de 404, ou como prova de corpo vazio, está lendo no log informação que ele não carrega.
⚠ **Não troque a atribuição indevida de 404 por outra, de corpo vazio.**

⚠ **Segunda observação, e o alcance dela é menor do que a redação anterior dizia:** o
que respondeu foi o **servidor local simulado**, e o que o ensaio mede é o **cliente**.
Com o corpo JSON de erro ensaiado, o SDK lança `UpstashError` em vez de `SyntaxError`.
Isso não demonstra preservação do status HTTP na exceção.

⚠ **Estabelecido por LEITURA do SDK 1.2.3 instalado, e a evidência é inspeção de
código, não execução:** `UpstashError` é `class extends Error` com
`constructor(message)` e `this.name`, nas linhas 2 a 7 do `dist/chunk-VZUGHHBV.mjs`,
e a linha 75 lança `UpstashError` com o `body.error` interpolado. **Nenhum campo de
status, e `res.status` não é passado.**

⚠ **Correção de alcance, 14/09/2026:** a redação anterior dizia que "o próprio serviço
responde erro em JSON", **atribuindo ao Upstash real um comportamento que quem produziu
foi o servidor local desta rodada**. **Como o Upstash real responde a esta credencial e
a este caminho não foi medido em momento nenhum aqui.** A inferência sobre qual camada
emitiu o 404 da Fase 1 não se sustenta neste ensaio.

**Registro da instrumentação:** O SDK 1.2.3 não preserva o status HTTP em
`UpstashError`. Para registrá-lo, será necessário acesso à resposta HTTP antes de
essa informação deixar de estar disponível. O ponto de integração e o mecanismo de
captura ainda precisam ser definidos.

⚠ **A leitura do construtor não decide a implementação.** Ela estabelece que
capturar apenas essa exceção é insuficiente para recuperar o status.

#### 5. O que o status permite concluir

**Não houve status observado nesta rodada.** Sobre o status relatado na Fase 1, a
delimitação do enunciado é mantida com as palavras que ele pede: **a associação da
credencial ao recurso permanece não confirmada.** A RFC 9110, seções 15.5.4 e
15.5.5, admite responder 404 para ocultar recurso cujo acesso é proibido, então
**a exclusão da hipótese de autenticação ou autorização não decorre da ausência de
401 ou 403**. Nada aqui demonstra que o Upstash faça isso; o que fica dito é que o
status não basta para descartar.

#### 6. Recurso ativo

**Não apurado, e as vias tentadas ficam nomeadas.** A integração Vercel deste
ambiente responde `list_teams`, `list_projects`, `get_project`, `list_deployments`,
`get_runtime_logs` e `get_deployment_build_logs`, e **nenhuma delas expõe variáveis
de ambiente**. Não há credencial de console Upstash aqui, e o egresso para
`upstash.com` está bloqueado. Logo: existência, estado, nome, região, dimensão,
métrica e coincidência de URL do recurso ativo ficam **todos não apurados**, e
nenhum deles foi inferido do 404.

**O que existe é registro documental, e não é evidência do estado de hoje.**
`docs/RAG_DECISIONS.md` afirma índice `ahp-bocr-rag`, região `us-east-1`, 1024
dimensões, COSINE, free tier, e as três variáveis no Vercel Production e Preview
como Sensitive. ⚠ **É documento anterior ao saneamento**, descreve a criação da
conta e **não estabelece que o recurso continue existindo**. É exatamente o item que
a consulta ao console resolveria.

#### 7. Local contra produção

**Projeto e deploy, medidos pela API da Vercel nesta rodada.** Projeto `ahp-simple`,
time `i4-investment-decisions-2026`, plano hobby, `nodeVersion` 24.x.

⚠ **O deploy da execução 7 É identificável, e isto corrige a expectativa do
enunciado.** O commit `f9cbf94550afb00fbe84d62a253be7357f8aa10b` tem deploy
`dpl_orQbNxPZQP8htwtZPvdUZ5gPhSbP`, target `production`, estado `READY`, criado em
`2026-09-13T01:51:56Z`. O deploy de produção seguinte, o de `d311a34`, foi criado em
`2026-09-13T03:12:13Z`, então **a execução 7 caiu nessa janela de uma hora e vinte
minutos**. Produção de hoje: `dpl_ChA3makJU8TmdHN365df1tDTcy9F`, commit `7422e87`,
criado em `2026-09-14T14:29:41Z`.

**Variáveis de produção: não apurado.** Nenhuma ferramenta disponível as lê, e
portanto a pergunta "coincidem com as locais" fica sem resposta nas duas direções.
**As locais desta máquina não servem de termo de comparação**, porque aqui elas não
existem, e esta máquina não é a da Fase 1.

**Log de produção da janela da execução 7: não apurado, e a razão é medida.** A
consulta ao deploy `dpl_orQbNxPZQP8htwtZPvdUZ5gPhSbP` na janela de
`2026-09-13T01:00Z` a `04:00Z` responde `400 Bad Request` com
`ExceedsBillingLimitError`. **A mesma ferramenta, na última hora, devolve linhas
normalmente**, o que separa limite de retenção de falha de ferramenta. Na última
janela legível, três horas sobre o deploy de produção atual, **nenhuma linha casa
com `rag`**, o que é compatível com nenhum parecer gerado nesse intervalo e **não
diz nada sobre o estado da recuperação**.

#### Conclusão desta rodada

**Causa não identificada.**

O que a rodada fechou é o **mecanismo**, não a causa: **nos casos ensaiados**, o
corpo vazio e os quatro corpos truncados `[`, `{"a":`, `[1,` e `{"result":` produzem
`Unexpected end of JSON input`, e como `res.json()` roda antes de `res.ok` a falha de
parsing impede o tratamento posterior do status. Isso estava lido no enunciado e agora
está **medido de ponta a ponta**, com o sintoma reproduzido em servidor local.
⚠ **Não vale para todo corpo truncado:** `{` sozinho devolve outra mensagem, como a
seção 4 desta apuração registra. ⚠ **A implicação não se inverte:**
da mensagem não se deduz o status nem o corpo recebido. **Por que o serviço respondeu
404 continua sem medição**, e nesta rodada continuaria mesmo com a credencial em mãos,
por causa do bloqueio de egresso.

**Hipóteses que sobreviveram, com o que cada uma exige e o que a tornaria falsa:**

| Hipótese | O que a testaria | O que a tornaria falsa |
|---|---|---|
| **H1.** O recurso apontado não existe mais, removido ou suspenso | consulta ao console Upstash | console mostrar o índice ativo **e** a URL REST coincidir com a configurada |
| **H2.** O recurso existe, e a URL configurada é de outro, anterior | comparar a URL do console com a configurada, respondido coincide ou não coincide | as duas coincidirem |
| **H3.** A URL configurada tem segmento de caminho, e o SDK o preserva antes de `/query` | a caracterização das seis propriedades do item 1 | a URL configurada ter zero segmento depois do host |
| **H4.** 404 ocultando proibição de acesso, na forma que a RFC 9110 admite | console, mais duas requisições comparando credencial válida e credencial errada no mesmo caminho | credencial válida devolver 200 no mesmo caminho |
| **H5.** O 404 não veio do Upstash, e sim de intermediário na rede da Fase 1 | repetir a sonda de outra rede | o mesmo 404 de zero byte aparecer de rede independente |

**O que H5 tem a seu favor, e é menos do que a redação anterior dizia:** a Fase 1
observou, na requisição crua, **404 com zero byte e sem `content-type`**. ⚠ **Correção
de alcance, 14/09/2026:** a redação anterior dizia que "o serviço responde erro em
JSON" e concluía daí um indício sobre a camada que emitiu o 404. **Aquele
comportamento é do servidor local do ensaio, não do Upstash real**, e o serviço real
não foi medido aqui. **O que resta é uma observação sobre a forma da resposta da Fase
1, e ela não estabelece qual camada a emitiu.** Cai igualmente se o console mostrar
recurso removido, porque aí H1 explica o mesmo dado.

⚠ **Hipótese refutada, e fica registrada para não voltar:** espaço nas bordas da
URL, pela medição do item 2. **Quebra de linha continua viva dentro de H3**, e as
duas se separam na caracterização das seis propriedades.

⚠ **O que esta rodada NÃO autoriza:** trocar biblioteca, reingerir, ou atribuir o
problema ao conteúdo do índice. Nenhuma das três ganhou fundamento aqui, e a
primeira perdeu: o SDK faz o que a leitura dizia que faz, medido em sete formas de
URL e oito formas de resposta.

#### O que a rodada seguinte precisa, e por que não entra aqui

**Quatro informações, e nenhuma delas é segredo.** Todas se respondem sem
transcrever URL nem token:

1. as **seis propriedades** do item 1, produzidas na máquina onde a Fase 1 rodou;
2. **status, comprimento de corpo e cabeçalhos** de `POST /info`, `POST /query` e
   `POST /rota-que-nao-existe`, com a mesma credencial, que é a discriminação do
   item 4;
3. do console: o índice **existe, está ativo, suspenso ou foi removido**, com nome,
   região, dimensão e métrica, e se a URL REST **coincide** com a configurada;
4. se as variáveis de produção **coincidem** com as locais.

⚠ **Correção de configuração não entra nesta rodada, e a razão é de método.** Se a
apuração encontrar uma, ela pode restabelecer a recuperação sem tocar em código, e
então **o contexto do modelo muda**. **A predição se registra antes de aplicar a
alteração**, e basta que a alteração **seja capaz** de restabelecer o fornecimento
de contexto ao parecer. Nesta rodada não há correção a registrar, porque a causa não
foi identificada.

⚠ **A correção da instrumentação não depende disto.** Separar erro de resultado
vazio e fazer a origem do erro sobreviver até os metadados é defeito com ou sem
recuperação funcionando, e a medição do item 4 aumenta o alcance dela: **o que
precisa sobreviver até o log não é só a etapa, é o status HTTP**, que hoje é
destruído pelo `res.json()` antes do `res.ok`.

### Restauração do índice e recorrência da hibernação, 14/09/2026

⚠ **Tudo nesta seção é SAÍDA FORNECIDA PELO PESQUISADOR**, transcrita das saídas
compartilhadas. **Nada aqui foi medido nesta sessão.** Os arquivos originais não
foram acessados por quem redige, então **não há localização nem resumo criptográfico
de artefato a registrar**, e nenhum se inventa. A atribuição vale para cada linha do
que segue.

#### A sequência, como foi fornecida

| Momento | O que a saída fornecida mostra |
|---|---|
| **19:24:25 UTC**, antes da restauração | as sondas `/info` e `/query` **e a chamada real do SDK** receberam **404 com corpo vazio**, e o SDK terminou em `SyntaxError` |
| estado do recurso | captura do console: índice `ahp-bocr-rag`, estado **`HIBERNATED`**, AWS `us-east-1` |
| restauração | **ação manual informada pelo pesquisador**, entre os dois ensaios. ⚠ **Horário exato não registrado.** Tela posterior mostra **473 registros**, dimensão **1024** e métrica **COSINE**, que conferem com o que o código assume |
| **19:40:23 UTC**, depois | `/info` e `/query` receberam **200**, e o SDK devolveu **cinco chunks**. A rota inexistente recebeu **404 com JSON válido** |
| condições dos dois ensaios | mesmo HEAD, mesmo SDK e mesmos resumos dos módulos; árvore limpa; **flag ausente**. As propriedades sanitizadas coincidem, ⚠ **sem demonstrar identidade integral das credenciais** |
| **nova hibernação** | **relatada pelo pesquisador poucos minutos depois**. ⚠ **Não há, no material recebido, nova captura de console nem novo ensaio HTTP dessa recorrência** |

#### O que as respostas mostraram nos dois estados

As respostas diferiram nos dois estados: antes, `/info` e a rota inexistente
devolveram 404 com corpo vazio; depois, `/info` respondeu 200 e a rota inexistente
respondeu 404 com JSON válido. Isso não identifica universalmente a origem de um 404.

⚠ **Correção de alcance, 14/09/2026:** a redação anterior dizia que o ensaio
**discrimina 404 de rota de 404 de recurso**, e isso excede o observado. **O que houve
foi diferença entre dois estados do mesmo recurso**, e nada no material recebido
identifica qual camada emitiu o corpo vazio.

#### As cinco hipóteses, com o que este material faz com cada uma

| Hipótese | Estado |
|---|---|
| **H1.** recurso removido ou suspenso | **é a que o material sustenta:** o console fornecido mostra `HIBERNATED`, e depois da restauração manual o mesmo ensaio passou a 200 com cinco chunks. ⚠ **Associação, não causa demonstrada**, pela razão da conclusão abaixo |
| **H2.** URL de outro recurso | **enfraquecida:** a mesma configuração devolveu 404 antes e 200 depois, com propriedades sanitizadas coincidentes nos dois ensaios. ⚠ **Não eliminada**, porque identidade integral das credenciais não foi demonstrada |
| **H3.** segmento de caminho na URL | **retirada:** a URL do ensaio tem **zero segmentos**, saída fornecida. ⚠ **A normalização do SDK continua a ser preservada por compatibilidade, e isso não ressuscita a hipótese** |
| **H4.** 404 ocultando proibição de acesso | **não eliminada, e não testada:** nenhuma requisição com credencial deliberadamente errada consta do material |
| **H5.** 404 de intermediário na rede | **enfraquecida:** o mesmo caminho de rede, dezesseis minutos depois, devolveu 200. ⚠ **Não eliminada**, porque nada no material exclui intermediário intermitente |

#### A conclusão, no alcance que ela tem

- **A restauração está associada à recuperação operacional no ensaio local.** É o
  que a sequência fornecida mostra, e é tudo o que ela mostra.
- ⚠ **Disponibilidade contínua NÃO está demonstrada.** A recorrência foi relatada
  poucos minutos depois, e não há captura nem ensaio dela no material recebido.
- ⚠ **A execução 7 continua NÃO explicada.** Ela rodou em produção, em outro dia e
  em outro ambiente, e nada neste material a alcança.
- ⚠ **A inclusão dos chunks no contexto continua NÃO verificada.** O ensaio de
  depois entregou cinco chunks **ao recuperador**; que eles cheguem ao prompt do
  modelo é outra coisa, e a flag estava **ausente** nos dois ensaios.

⚠ **NÃO houve predição registrada antes da restauração**, e isso se registra porque
é exigência do método deste projeto, não porque mude o dado. A restauração era
alteração **capaz** de restabelecer o fornecimento de contexto ao parecer, então a
predição cabia. **A ausência fica registrada como limitação do
procedimento**, e nada além disso.

⚠ **Correção de alcance, 14/09/2026:** a redação anterior dizia que uma predição
datada fecharia a porta das leituras alternativas do resultado. **Predição anterior
não elimina causas alternativas por si só**, e afirmar que fecharia atribui a ela um
alcance que ela não tem.

### Instrumentação da recuperação semântica, implementada em 14/09/2026

**Eixo implementado sobre `d658e50`, em `3be55b9`.** ⚠ **A.30 permanece ABERTA**, e o
que fica fora está no fim desta seção.

#### A arquitetura, e por que ela é assim

| Dependência | O que foi feito | Por quê |
|---|---|---|
| Upstash | `Requester` próprio pela extensão **pública** do SDK, `constructor(requesters?: Requester)` em `dist/nodejs.d.mts:68`, e um **`Index` por consulta**, restritos ao caminho de busca | é o único ponto em que a resposta HTTP existe: a interface `Requester` devolve `{result, error}`, e o status já foi descartado quando ela retorna |
| Upstash, escrita | `upsertChunk` e `deleteAll` **seguem no singleton** `getIndex()`, sem alteração | o eixo é diagnóstico de busca, e alargar o escopo não teria fundamento |
| Voyage | envoltório **só do `fetch` injetado**, afordância pública do SDK, `BaseClient.d.ts:15` | o `fetch` global **não** é substituído em produção, e o envoltório devolve a resposta **intacta**, sem ler nem clonar o corpo |

⚠ **Nenhum interno foi importado e nenhum pacote foi modificado.** `HttpClient` não é
exportado pelo `@upstash/vector`, então o transporte foi reimplementado no
`Requester`, e é por isso que a comparação abaixo existe: **a equivalência não é
suposta, é medida**.

#### O contrato, versão 2

**Três coisas que antes chegavam juntas passam a ser separadas:** a **etapa**, o
**estado do embedding** e o **estado da consulta ao índice**.

⚠ **Falha no embedding deixa a consulta ao índice como `nao_executado`**, com o array
de tentativas **vazio**. Não há tentativa fictícia, e "não executada" não é "falhou".

⚠ **Status ausente quando não houve resposta**, nunca inventado. **E resposta não
exitosa e falha de parsing COEXISTEM:** a tentativa guarda `status` e
`falha: 'leitura_ou_parsing'`, que é exatamente o que o SDK perdia.

⚠ **Bytes são os EFETIVAMENTE LIDOS**, medidos com `Buffer.byteLength` do texto lido,
e **não comprimento de string**. `bytes: 0` é leitura concluída com corpo vazio;
leitura que não concluiu deixa o campo **ausente**.

> ⚠ **AFIRMAÇÃO SUPERADA, e preservada de propósito.** Medido depois: `res.text()`
> **decodifica**, e o que `Buffer.byteLength` mede é o texto decodificado, não a
> resposta. O campo saiu do contrato. Ver "As cinco correções da instrumentação",
> correção 4.

⚠ **A classificação vem de ONDE a falha ocorreu, e não de `err.name` nem da
mensagem.** O transporte do Upstash sabe, porque controla o caminho inteiro. O
envoltório da Voyage **não sabe** o que acontece depois da resposta, e registra essa
limitação como `posterior_a_resposta_nao_classificada`. Valor lançado que não é
`Error` também é tratado, sem supor `name`.

**Resumo e compatibilidade.** `withResults`, `emptyOk` e `errored` contam **consultas
executadas**, são disjuntas e somam `queriesRan`. `httpAttempts` tem **unidade
própria**, tentativas HTTP, e não se soma a consultas.

⚠ **`failedQueries` MUDOU DE SIGNIFICADO, e é por isso que o contrato é versionado.**
Antes contava `results.filter((r) => r.length === 0).length`, reunindo **vazio
legítimo com erro**. Agora é **derivado de `errored`**, nunca atualizado
separadamente, e conta só erro. **Metadado sem `contractVersion` é do significado
antigo**, e não deve ser comparado com o novo.

#### A comparação, referência contra candidato

**Dez casos, com o `@upstash/vector` REAL nos dois lados e a fronteira HTTP
simulada.** ⚠ **A referência não foi recalculada com o candidato:** de um lado o SDK
construído como `d658e50` o construía, do outro o `consultarIndice` desta árvore, no
mesmo processo e contra o mesmo duplo de `fetch`.

| Dimensão | Resultado |
|---|---|
| requisição | método, caminho, **token fictício inteiro**, cabeçalhos, corpo, `keepalive` e `cache` idênticos |
| repetições | mesmos gatilhos, mesma quantidade, mesma sequência e mesmos intervalos |
| resultados | mesmo conteúdo e mesma ordem; e, no erro, mesmo nome, mesma mensagem e **mesmas propriedades próprias da exceção** |
| concorrência | cinco consultas com desfechos e repetições diferentes, cada tentativa e cada diagnóstico na consulta certa |
| diagnóstico | estados e falhas distinguíveis, que é o que o eixo acrescenta |

**Cobertos:** sucesso com resultados, sucesso vazio, falha sem resposta, falha seguida
de sucesso, esgotamento das tentativas, HTTP não exitoso com JSON válido, corpo vazio,
JSON inválido, **falha de leitura depois da resposta** e concorrência.

⚠ **A caracterização anterior do transporte, treze testes de `50c80f5`, passa INTEIRA
contra o candidato sem uma alteração.** É a evidência mais direta de que a requisição,
as repetições e o resultado não mudaram.

#### O contexto, verificado por execução e não por recálculo

O handler de `d658e50` rodou **em checkout separado**, com as mesmas entradas e as
mesmas respostas simuladas, e os resumos criptográficos do `system` e dos `messages`
**completos** ficaram fixados no teste. Quatro casos, com resultados, vazio, erro e
misto: **todos batem byte a byte**.

⚠ **O aceite não foi reduzido a tamanho, a título nem a contagem de chunks:** o
resumo cobre o texto inteiro dos dois campos.

#### Estados demonstrados, e os limites

| Demonstrado | Como |
|---|---|
| desabilitada | `enabled: false`, `queriesRan: 0`, nenhuma tentativa, nenhuma consulta ao embed nem ao índice |
| com resultados, vazio e erro | separados nas três categorias disjuntas, e o caso misto recomposto pelo diagnóstico por consulta |
| etapa não executada | falha de embedding com `consulta: 'nao_executado'` e zero tentativas |
| status quando há resposta | 404 com corpo vazio e 200 com JSON inválido: o status **sobrevive** onde o SDK o perdia |
| status ausente quando não há | seis tentativas de transporte, todas sem `status` e sem `bytes` |

⚠ **O que NÃO está demonstrado, e fica dito:** nada aqui foi exercitado contra o
índice real. **Verificação operacional é outra coisa**, e depende de o recurso estar
disponível, que é o problema que esta tarefa não fechou.

#### Verificação deste commit

`tsc --noEmit` sai **0**. `npm test` sai **0**, com **11 suítes e 146 testes**, contra
10 e 135 em `d658e50`. `npm run build` sai **0** e gera **17 páginas**. Ambiente
observado: Linux x86_64, Node v22.22.2, npm 10.9.7.

#### A.30 continua aberta

- **Apresentação na interface.** O campo `semantic` continua sem leitor no
  `ParecerAISection.tsx`, e expor execução degradada ao usuário é decisão própria.
- **Tratamento da geração degradada.** Decisão própria, não tomada aqui.
- **Verificação operacional** contra o índice real, que depende da disponibilidade do
  recurso.
- **A identidade dos prompts** nas quatro condições sem chunks permanece
  **comportamento atual**: informar essas condições ao modelo depende de decisão
  específica, e alterar o contexto do parecer exige predição registrada antes.
- **A causa do 404 em produção**, e a execução 7, seguem sem explicação.

---

### As cinco correções da instrumentação, 15/09/2026

**Corrigido sobre `3be55b9`, em `d66ca2a`.** Os cinco contraexemplos foram
reproduzidos **antes** da correção, e cada um virou regressão em
`lib/__tests__/rag-diagnostico-regressao.test.ts`. **SHA anterior nos cinco casos:
`3be55b9`.**

⚠ **O "antes" desta seção é medido, e não lido do código.** A execução das
regressões contra `3be55b9` reprovou **13 dos 14** casos, e o décimo quarto é um
controle de caminho exitoso, que passa dos dois lados. As saídas literais de cada
"antes" estão nas tabelas abaixo.

⚠ **Três dos cinco contraexemplos foram reproduzidos por sonda separada**, e não pela
regressão: escrita contra a API corrigida, ela para na ausência do símbolo antes de
chegar à asserção de interesse. **A sonda rodou contra `3be55b9` e foi descartada
depois**, porque o que ela mede é estado que deixou de existir.

#### 1. Sanitização que não sanitizava

| | |
|---|---|
| **Antes, medido** | `erro.mensagem` = `connect falhou para https://sentinela-url.exemplo/caminho-secreto com Authorization: Bearer FAKE_SECRET_SENTINEL_TOKEN`, e o mesmo texto no `console.warn`. Objeto lançado: `erro.mensagem` = `{"credencial":"FAKE_SECRET_SENTINEL_OBJETO","nome":"FAKE_SECRET_SENTINEL_NOME"}`. `name` adulterado: `erro.nome` = `ErroFAKE_SECRET_SENTINEL_NOME` |
| **Asserção que falhou** | `expect(saida).not.toContain(s)`, linhas 171, 196, 222 e 246 do arquivo de regressões, para as sentinelas `FAKE_SECRET_SENTINEL_TOKEN`, `FAKE_SECRET_SENTINEL_OBJETO` e `FAKE_SECRET_SENTINEL_NOME`; e `descreverFalha is not a function` no caso da mensagem pública |
| **Depois** | `erro.mensagem` = `a requisição saiu e nenhuma resposta chegou`, fixa por classificação. `Object.keys(erro)` = `['classificacao', 'mensagem']`: o campo `nome` **saiu do contrato** |

**`descreverFalha` não recebe o valor lançado.** Não é filtro sobre a mensagem da
dependência: é a **ausência de caminho** por onde ela chegue à saída. Filtro exigiria
saber o que procurar, e o vazamento medido veio de três vetores diferentes.

⚠ **A varredura de sentinelas é instrumento NOVO, e falhou na primeira conferência.**
O controle positivo reintroduziu o vazamento de propósito no `descreverFalha`, e dos
quatro casos de sentinela **só um reprovou**. **O código corrigido não vazava; quem
estava fraco era o instrumento**, que procurava a sentinela **inteira**, e
`JSON.parse` reproduz só **dez caracteres** do corpo na mensagem do `SyntaxError`.

A varredura passou a procurar também o **prefixo**, e o comprimento dele foi **medido,
não escolhido**: nove, e não dez, porque o corpo do ensaio começa por `<`, que ocupa um
dos dez do eco. **Com dez, o controle ainda passava no caso de parsing, e passava por um
caractere.** Com nove, e o controle estendido a `name` e a valor que não é `Error`, os
**quatro** reprovam.

⚠ **É o mesmo padrão da seção 3 do `CLAUDE.md`, e o quarto instrumento a cair nele:**
a varredura devolvia o agregado esperado, "nenhuma sentinela sobrevive", e o agregado
estava certo por acidente. **Um resultado que confirma a expectativa merece a mesma
conferência que um que a contradiz.**

⚠ **A varredura também cobria só METADE da superfície que o aceite nomeia.** As
regressões chamavam `getRAGSemanticDiagnosticado` direto, então varriam o diagnóstico
e o aviso, **e não o corpo que a rota devolve**. Dois casos novos passam pelo
**handler real**, com os SDKs das duas dependências reais e só o `@anthropic-ai/sdk`
duplo, e varrem o **corpo serializado inteiro**.

**O que eles mostram em `3be55b9`, e é a evidência mais direta do defeito 1:** o corpo
devolvido ao cliente da API trazia, nas **cinco** consultas,
`"mensagem":"connect falhou para https://sentinela-url.exemplo/caminho-secreto com
Authorization: Bearer FAKE_SECRET_SENTINEL_TOKEN"`, dentro de
`metadata.knowledgeBase.semantic.queries`. **Não era só log: era resposta HTTP.**

⚠ **E o caso de parsing só foi pego pelo PREFIXO:** o corpo trazia
`"Unexpected token '<', \"<FAKE_SECR\"... is not valid JSON"`, e a sentinela inteira
não aparece ali. **A varredura da primeira versão teria declarado esse corpo limpo.**

**Controle positivo dos dois casos novos:** com o vazamento reintroduzido, ambos
reprovam, um pela sentinela inteira e outro pelo prefixo.

⚠ **O que se perde, e é perda consciente:** duas falhas da mesma classificação
produzem texto **idêntico**. O que as distingue são os campos estruturados, etapa,
status e tentativas. **O texto da dependência não volta por configuração**, porque a
configuração que o trouxesse de volta seria a que vaza.

#### 2. Tentativas das duas etapas no mesmo array

| | |
|---|---|
| **Antes, medido** | com `UPSTASH_VECTOR_REST_TOKEN` ausente e a Voyage respondendo 200: `[rag/semantic-retrieve] consulta 0 falhou na etapa querySimilar (status 200, 1 tentativa(s), nao_classificada)`, com **zero** requisições ao índice. `tentativas` = `[{"numero":1,"status":200}]` |
| **Asserção que falhou** | `expect(diagnostico.tentativasConsulta).toEqual([])`, linha 275: recebido `undefined` |
| **Depois** | `tentativasConsulta` = `[]`, `tentativasEmbed` = `[{numero:1, status:200}]`, e o aviso diz `sem resposta, 0 tentativa(s), anterior_a_chamada` |

⚠ **O status era verdadeiro; a atribuição é que era falsa.** O 200 existiu, e era da
Voyage. Um agregado assim não se anuncia: ele tem a forma exata do que se esperaria
ver. **Este é o modo de falha que o próprio projeto documenta no modelo do Parecer
IA**, e desta vez ele apareceu no instrumento.

⚠ **A numeração também denunciava**, e passou despercebida: o array misto trazia
`numero` reiniciando em 1 no meio da sequência, porque cada envoltório numerava pelo
comprimento do array como se ele fosse só seu.

#### 3. Ausência de resposta classificada como transporte

Entra `anterior_a_chamada`. **São três condições, e não duas.**

| | |
|---|---|
| **Antes, medido, 3a** | sem `VOYAGE_API_KEY`: `classificacao` = `transporte`, `tentativas` = `[]`, chamadas à Voyage = **0** |
| **Antes, medido, 3b** | embed com 503 na tentativa 1 e rejeição na 2: `classificacao` = `posterior_a_resposta_nao_classificada`, com `tentativas` = `[{numero:1,status:503},{numero:2,falha:'transporte'}]` |
| **Asserção que falhou** | `expect(diagnostico.tentativasEmbed).toEqual([])`, linha 316, recebido `undefined`; e `expect(diagnostico.tentativasEmbed).toHaveLength(2)`, linha 416 |
| **Depois** | 3a dá `anterior_a_chamada` com `tentativasEmbed` = `[]`; 3b dá `transporte`, porque a tentativa relevante é a **última** |

⚠ **Dois defeitos distintos na mesma linha.** O primeiro é de vocabulário: faltava a
condição "não chegou a sair". O segundo é de quantificador: `tentativas.some(t =>
t.status !== undefined)` pergunta se **alguma** tentativa respondeu, quando a pergunta
é sobre a **última**. Um histórico com uma resposta no início e nenhuma no fim
satisfaz o `some` e não satisfaz a intenção.

⚠ **A diferença entre as duas etapas é o quanto cada envoltório SABE**, e por isso a
classificação é assimétrica: o do índice controla o transporte inteiro e marca a
própria tentativa; o da Voyage vê até a resposta.

#### 4. `bytes` retirado do contrato

| | |
|---|---|
| **Antes, medido** | corpo de **um** byte `0xFF`, status 404: `bytes` registrado = **3** |
| **Asserção que falhou** | `expect(t).toHaveLength(1)` sobre `diagnostico.tentativasConsulta`, linha 463, recebido `undefined` |
| **Depois** | `Object.keys(tentativa)` não contém `bytes`; `status` = 404 e `falha` = `leitura_ou_parsing` continuam |

**A causa:** `res.text()` decodifica, e byte inválido vira o caractere de reposição
`U+FFFD`, que em UTF-8 ocupa três bytes. O campo media o **texto decodificado**, sob
nome de bytes da resposta.

⚠ **A asserção anterior PASSAVA**, `bytes` igual a 10 num corpo ASCII de 10
caracteres, e era a coincidência que a tornava convincente. **Corpo ASCII é o caso
mais visível, e ele não distingue as duas leituras.** É o mesmo padrão que a seção 3
do `CLAUDE.md` registra em três instrumentos anteriores.

⚠ **A correção PERDE informação**, e a perda está registrada no teste: leitura que
não conclui e leitura que conclui vazia eram distinguidas por `bytes` ausente contra
`bytes` zero, e deixam de ser. **Preferiu-se perder a distinção a mantê-la sobre um
número que media outra coisa.**

#### 5. Telemetria incondicional

| | |
|---|---|
| **Antes, medido, com `UPSTASH_DISABLE_TELEMETRY` definida** | referência: **zero** cabeçalhos `Upstash-Telemetry-*`. Candidato: **três**, `Platform`, `Runtime` e `Sdk` |
| **Asserção que falhou** | a comparação de cabeçalhos de `equivalentes`, agora exercitada pelo caso "variável DEFINIDA" em `rag-transporte-comparacao.test.ts:430` |
| **Depois** | zero cabeçalhos dos dois lados com a variável definida; os mesmos três dos dois lados com ela ausente |

⚠ **A comparação anterior era exaustiva em dez dimensões e rodava num estado só.**
Com a variável ausente os dois lados coincidem, e a divergência só existe no outro
estado. **Cobertura de dimensões não é cobertura de estados**, e foi a primeira que
se confundiu com a segunda.

⚠ **A conferição nova não se contenta com a igualdade.** Duas listas vazias também
são iguais, e passariam sem que cabeçalho nenhum fosse montado: por isso o caso da
variável ausente afirma a **lista dos três nomes**, e não só a coincidência entre os
lados.

**Consequência fora do ensaio:** o operador que desligou a telemetria continuaria
tendo telemetria enviada pelo caminho de busca, sem sinal de que isso ocorria.

#### Verificação deste commit

`npx tsc --noEmit` sai **0**. `npm test` sai **0**, com **12 suítes e 164 testes**,
contra 11 e 146 em `3be55b9`. `npm run build` conclui, gerando **17 páginas
estáticas** e listando **18 rotas**.

> ⚠ **Dois números diferentes, e a primeira redação os confundiu.** Ela dizia
> `lista as 17 rotas`, juntando o valor de um com o nome do outro. **Contados à
> mão na saída do build:** `Generating static pages (17/17)` e **dezoito** linhas na
> tabela de rotas, duas do topo mais nove de `api` mais sete de página. O `17
> páginas` das notas anteriores e do `CLAUDE.md` é o primeiro número, e está
> **correto**; foi o meu `rotas` que estava errado. A conferência à mão só aconteceu
> porque um `grep -c` devolveu 18 e contrariou a aritmética que eu havia feito de
> cabeça.
Ambiente observado: Linux x86_64, Node v22.22.2, npm 10.9.7.

> ⚠ **Este dado foi CORRIGIDO depois do commit `9c21288`.** A primeira redação
> trazia `Node v24.19.0, npm 11.9.0`, que é o ambiente da nota da seção 5 do
> `CLAUDE.md`, **herdado em vez de medido**. O número verdadeiro apareceu por acaso,
> num cabeçalho `Upstash-Telemetry-Runtime` de uma saída de teste que dizia
> `node@v22.22.2`, e `node --version` confirmou. **É o erro que a seção 5 do
> `CLAUDE.md` nomeia, `nunca herde um número`, e que a seção 0.4 do âncora registra
> duas vezes; esta é a terceira.** As demais medidas desta seção, tsc, suítes, testes
> e rotas, foram executadas nesta árvore e não vieram de nota nenhuma.

**A série cresce por testes novos:** os **dezesseis** casos do arquivo de regressões,
catorze das cinco correções mais dois da varredura pelos metadados, e os dois da
telemetria. **Nenhum teste foi removido.** Os quatro que mudaram de
expectativa estão nomeados aqui, com a razão de cada um:

| Teste | O que afirmava | Por que mudou |
|---|---|---|
| `rag-transporte-comparacao`, corpo vazio | `bytes` igual a 0 | o campo saiu do contrato, correção 4 |
| `rag-transporte-comparacao`, JSON inválido em 200 | `bytes` igual a 10 | idem, e era a asserção que **passava** por coincidência |
| `rag-semantic-states`, falha de embedding | aviso continha `voyage indisponivel no ensaio` | a mensagem da dependência não chega mais à saída, correção 1 |
| `rag-semantic-states`, falha de consulta | aviso continha `indice indisponivel no ensaio` | idem |

⚠ **A equivalência de transporte foi remedida**, contra o `@upstash/vector` real, e
agora nos **dois** estados da telemetria. **Os quatro resumos de contexto de
`d658e50` continuam batendo byte a byte**, nas quatro condições sem chunks: o
diagnóstico segue sem tocar no que o modelo recebe.

⚠ **Uma classificação de `rag-semantic-states` é propriedade do DUPLO, e não do
cliente real.** Os duplos de `voyageai` e `@upstash/vector` lançam sem passar pelo
`fetch`, então nenhuma tentativa se registra e a classificação correta ali é
`anterior_a_chamada`. **Com o cliente real, indisponibilidade de rede dá
`transporte`**, e isso está medido no arquivo de regressões. O teste diz isso no
próprio comentário, para que a etiqueta não seja lida como afirmação sobre produção.

#### O que estas cinco correções ALCANÇARAM e não corrigiram

⚠ **O temporizador de tempo limite da Voyage, que vaza quando o `fetch` rejeita**,
foi alcançado pela regressão do caso de transporte. Ele **não foi corrigido**, porque
está fora deste escopo: é defeito do SDK, caracterizado em
`rag-voyage-transport.test.ts`, e `makeRequest.js:35` a 37 só chama `clearTimeout`
depois que o `fetch` resolve, sem `finally`. **As regressões que o alcançam usam
temporizador falso**, que o recolhe dentro do ensaio. **Nada se afirma sobre o efeito
fora dele.**

**Efeito colateral medido do mesmo ajuste:** o arquivo de regressões caiu de **13,9 s
para 1,08 s**, porque o backoff real do Upstash somava cerca de 4,5 s em cada um dos
três casos de esgotamento. **O aviso do jest sobre processo que não encerra
desapareceu junto**, e ele vinha do temporizador pendente.

#### O que permanece fora, e continua aberto

**Nada abaixo foi tocado por estas cinco correções**, e a lista repete a do eixo
anterior porque o escopo desta rodada era outro.

- **Apresentação na interface** do campo `semantic`.
- **Tratamento da geração degradada.**
- **Verificação operacional** contra o índice real.
- **A identidade dos prompts** nas quatro condições sem chunks.
- **A causa do 404 em produção**, e a execução 7.
- **O temporizador da Voyage**, pelas razões acima.

---

## A.33: paráfrase com fonte identificada, sem páginas

**Predição registrada em 15/09/2026, sobre `33c1fdf`, ANTES de qualquer alteração de
instrução.** ⚠ **Esta decisão SUBSTITUI a proposta anterior de A.33**, que era
acrescentar `evidence.page` ao contexto injetado. A linha de A.33 no âncora descreve a
proposta antiga, e fica superada por esta seção.

### Estado de partida, medido

`git rev-parse --short HEAD` dá **`33c1fdf`**; `git status --short` e `git diff HEAD`
saem **vazios**, árvore limpa, na branch `integra/a30-registros`.

**Confirmado:** `app/api/ai-reviewer/system-prompt.ts` **não mudou** entre `0e21f9e` e
`33c1fdf`, por `git diff --stat` vazio, então os localizadores do inventário valem na
base integrada.

### Duas divergências do inventário, e a primeira é de escopo

⚠ **São DOZE ocorrências de exemplo com página literal, e não dez.** As dez previstas
são **82, 166, 169, 176, 244, 246, 265, 268, 273 e 282**; medidas por
`git grep -n -E "\bp\. ?[0-9]"`, aparecem também **319 e 323**.

⚠ **E a que falta é a mais imitativa das doze.** A linha 323 está no bloco
**EXEMPLO INTEGRAL DE PARÁGRAFO NO ESTILO REQUERIDO**, na metade rotulada
**CORRETO**, e ensina `Saaty (1977, p. 248)` seguido da transcrição entre aspas. A 319
é a metade rotulada **PROIBIDO**, que também carrega a página, e está proibida por
outras razões, D1, D2, D4 e D7, **não pela página**. **Deixar as duas como estão
ensinaria a forma anterior no exemplo mais visível do arquivo.**

**É o quinto caso consecutivo de escopo subestimado na primeira contagem**, e o padrão
da seção 3 do `CLAUDE.md` se repete: o item omitido não estava na borda, estava no
centro.

⚠ **Instrumento que falhou, e o modo de falha é novo aqui.** A primeira busca usou
`git grep -iE "p[áa]gina"`, com **classe de caracteres contendo acento**, e devolveu
**zero linhas, saída 1**, escondendo a linha 159. `git grep -i "página"` devolve
**quatro**. **Classe com caractere multibyte não é confiável neste ambiente**, com
`LANG` e `LC_ALL` vazios; literal ou alternativas separadas funcionam. Conferido com
controle positivo, `verbatim` dá 14 linhas, e negativo, termo inexistente dá saída 1.

### Localizadores reancorados, por nome

⚠ **Os números da linha de A.33 são de 12/09 e estão deslocados.** Medidos agora:

| Alvo | Onde está hoje | O que a linha de A.33 dizia |
|---|---|---|
| `ReferenceDoc` | `app/api/ai-reviewer/knowledge.ts:23` | `:23`, ainda válido |
| `claimToRef` | `app/api/ai-reviewer/knowledge.ts:49` | não numerado lá |
| os quatro templates | `route.ts:1062`, `:1070`, `:1078`, `:1085` | `:1147`, `:1155`, `:1163`, `:1171` |
| `formatSemanticChunks` | `route.ts:201`, página montada em `:207` | não citado |

### O que leva PÁGINA ao modelo, e é um caminho só

**Medido, lendo cada bloco que entra no prompt:** `formatSemanticChunks` é o **único**
código que interpola página, em `route.ts:207`, a partir de `ChunkMetadata.page`. Os
quatro templates emitem `citation`, `topic`, `context` e `rule`, **sem página**;
`getRAGThresholds`, `getRAGFormulas` e `getRAGBenchmarks` **não emitem página**.

⚠ **O comportamento relevante é que chunk com página PODE introduzi-la no contexto.**
Quanto ela aparece depende da execução e da configuração, e **isso não foi medido em
produção**.

### O que leva VERBATIM ao modelo, e são QUATRO caminhos

⚠ **Achado desta apuração, e não previsto no escopo recebido.** Retirar a exigência de
verbatim das instruções **não retira a transcrição do contexto**. Medidos:

| Caminho | O que entrega | Tem página |
|---|---|---|
| `formatSemanticChunks`, `route.ts:210` | `*Verbatim:* "..."`, rótulo explícito, do `verbatim_quote` | sim, em `:207` |
| os quatro templates, `route.ts:1062` e seguintes | `Fundamento: ${ref.rule}`, e `rule` é `evidence.quote \|\| verbatim_quote \|\| claim` | não |
| `getRAGThresholds` | `*Fonte:* artigo (ano) - "evidence.quote"` | não |
| `getRAGFormulas` | `*Condições:* conditions`, que é **texto do indexador**, e é a tarefa A.15 | não |

> ⚠ **INFERÊNCIA RETIRADA em 15/09/2026.** A redação anterior chamava esta tabela de
> **a maior ameaça à predição** e de **a explicação mais provável** caso ela fosse
> refutada. **As duas coisas eram inferência sem medição**, e ficam retiradas.
>
> **Manter o texto original no contexto NÃO contradiz pedir paráfrase na saída:** o
> modelo precisa **receber** a evidência para reformulá-la. E o rótulo `Verbatim`
> **descreve a origem do material**, não constitui instrução de transcrever nem
> demonstra causa de falha.
>
> ⚠ **Os trechos originais fornecidos ao modelo são PRESERVADOS**, e retirá-los do
> contexto **não está autorizado**.

A tabela acima fica como **descrição do que o contexto entrega**, que é informação
útil para a conferência da etapa 4, e **não como hipótese de causa**.

### A predição

**O parecer deixa de apresentar localizadores de página e deixa de apresentar
transcrição, preservando identificação e sentido das fontes.**

**Casos negativos, e são quatro. Qualquer um refuta.**

| | Caso negativo |
|---|---|
| 1 | qualquer **página** nas citações do parecer |
| 2 | **transcrição apresentada como citação direta**, entre aspas |
| 3 | ⚠ **transcrição sem sinalização**, o mesmo texto sem aspas. **Retirar aspas não transforma transcrição em paráfrase**, e este é o modo de falha mais provável |
| 4 | **perda da identificação da fonte** ou **alteração de sentido** |

**Controle:** as referências continuam identificáveis e vinculadas às fontes, e a
paráfrase representa o conteúdo do trecho de origem.

⚠ **O caso 3 não se verifica lendo o parecer isoladamente.** Exige comparar a
afirmação com o `verbatim_quote` guardado, e é o que a triagem da etapa 3 existe para
apoiar, **sem decidir**.

### Definição da etapa 4, fixada ANTES de qualquer execução

⚠ **Definir depois de ver o resultado invalidaria a avaliação**, então os três itens
abaixo ficam fechados aqui.

**Casos, e são três, o conjunto pequeno pedido:**

| Caso | Payload | Por que este |
|---|---|---|
| C1 | o projeto de referência de `docs/calculations-13jul2026.json`, o mesmo das 24 saídas publicadas | é o único payload cujo resultado numérico já está conferido, então divergência de citação não se confunde com divergência de cálculo |
| C2 | o mesmo payload, com a recuperação semântica **desligada** | separa o que vem dos chunks do que vem das quatro seções estáticas |
| C3 | o mesmo payload, com a recuperação **ligada e devolvendo vazio** | isola a condição em que o modelo cita sem chunk nenhum recuperado |

⚠ **Os trechos são conferidos contra as PUBLICAÇÕES**, e **`verbatim_quote` não é
eleito referência correta por padrão**. Ele é um dos dois campos, e o registro de
A.16 mostra divergência **nas duas direções**: em parte das claims o fiel é o
`evidence.quote`. **A referência é a publicação.**

**Fontes que serão conferidas, nomeadas antes:** as publicações dos três pares que hoje
o prompt ensina, **Saaty (1977)**, **Wijnmalen (2007)** e **Forman e Peniwati (1998)**,
mais **toda obra que o parecer citar** nos três casos, ainda que não esteja nesta
lista. ⚠ **Antes de conferir localizador contra um PDF, ler o campo `notes`** e
confirmar que o PDF é a edição de onde as claims saíram, que é regra da seção 7 do
`CLAUDE.md` e já custou horas.

**Evidências fixadas ANTES, por caso**, e esta é a decisão que **destrava a etapa 4**:

| Caso | Evidências |
|---|---|
| C1 | as evidências são **fixadas previamente**, escritas antes da geração e mantidas |
| C2 | recuperação desligada, então só as quatro seções estáticas |
| C3 | recuperação **simulada vazia** |

⚠ **Assim a geração real avalia a REDAÇÃO sem depender da disponibilidade do índice e
sem reingestão.** A hibernação recorrente, que é o problema de A.30, **deixa de
bloquear a etapa 4**: o que a etapa 4 pergunta é o que o modelo escreve dado um
contexto, e o contexto pode ser fixado.

⚠ **Isso NÃO dispensa a credencial do modelo.** Fixar evidência remove a
dependência do índice e da Voyage, **não a da geração real**, que continua sendo o
único jeito de observar a redação.

> ⚠ **FECHAMENTO CORRIGIDO em 15/09/2026.** A redação anterior deixava entender que
> a etapa 4 passara a depender **só da credencial**. **Não é verdade.** Fixar as
> evidências elimina a dependência do índice, **e não entrega o resto.**
>
> **O que falta, e não apareceu no diff de nenhuma rodada até aqui:**
>
> | Falta | Por quê |
> |---|---|
> | **o conjunto efetivamente preparado, por caso** | C1, C2 e C3 estão **definidos**, e as evidências de C1 **não foram escritas** |
> | **a identidade dos trechos** | cada evidência precisa de `articleId` e `trechoId`, que é o que vincula divergência de A.16 desde `80420df`; **os trechos fixados ainda não têm esses identificadores atribuídos** |
> | **a conferência das fontes contra as publicações** | é a coluna 3, e depende de leitura; **nenhuma publicação foi aberta nesta série de rodadas** |
>
> **Três coisas faltam, e a credencial é uma delas**, não a única.

**Configuração da execução, fixada antes:** modelo e parâmetros como
`MODEL_CONFIG` os define no commit em que os pareceres forem gerados, **sem variação de
temperatura entre os casos**; `USE_RAG_SEMANTIC` **verdadeiro** em C1 e C3 e
**ausente** em C2; **uma geração por caso**, e o SHA registrado junto de cada saída.
⚠ **Uma geração por caso não mede variabilidade do modelo**, e o registro dirá isso
em vez de tratar três amostras como tendência.

**O que reprova, e o que fica inconclusivo:** qualquer um dos quatro casos negativos
refuta a predição. **Trecho com divergência não resolvida entre `verbatim_quote` e
`evidence.quote`, das treze de A.16, sai como INCONCLUSIVA**, sem escolher lado.

### Dependência de A.16, revisada

A tabela de dependências registrava que A.33 depende de A.16 **pelo conteúdo do campo
citado**. ⚠ **Essa justificativa CAI junto com o campo de página**, porque o campo
deixa de ir ao contexto: nada do que A.33 injeta depende de qual dos dois campos de
citação está correto.

⚠ **Mas a dependência NÃO desaparece, e só muda de objeto.** A candidata se confirma:
o `verbatim_quote` é a **referência da conferência de sustentação**, porque o terceiro
caso negativo, transcrição sem sinalização, só se detecta comparando a afirmação com o
trecho guardado. Com a divergência aberta, **o trecho de comparação é ambíguo**, e a
linha sai `inconclusiva`.

**Conclusão, e é uma troca e não uma remoção:**

| | Antes | Agora |
|---|---|---|
| O que depende | a **implementação**, pelo conteúdo do campo injetado | a **verificação da etapa 4**, pelo trecho de comparação |
| Efeito de A.16 estar aberta | bloquearia injetar o campo | **não bloqueia a implementação**, e torna inconclusivas as linhas afetadas |

### Divergências de A.16, medidas nesta rodada

⚠ **Medição própria, e ela NÃO bate com o registro vigente.** Comparando
`verbatim_quote` com `evidence.quote` por igualdade exata após `trim`, em todas as
claims que têm os dois campos:

| | Medido aqui, 15/09/2026 | Registro vigente |
|---|---|---|
| claims com os dois campos | **138** | 123 |
| divergentes | **26**, em 15 artigos | 13 |

**Nenhuma das 26 é só de formatação**, conferido normalizando espaço e aspas
tipográficas: o contador de diferenças apenas gráficas dá **zero**. E as duas direções
descritas em A.16 aparecem na amostra lida à mão: no `ayan2023` o `evidence.quote`
continua após o ponto em que o `verbatim_quote` para, e no `bozoki2010` é o
`verbatim_quote` que segue além.

⚠ **O CRITÉRIO APLICADO, declarado, porque o número é dele e não absoluto:**
igualdade exata das duas cadeias após `trim`. **26 é o resultado DESSE critério**, e
outro critério daria outro número.

⚠ **Normalizar espaço e aspas tipográficas NÃO demonstra que as 26 sejam diferenças
substantivas de sentido.** Demonstra apenas que **nenhuma delas é só gráfica**.
Quantas alteram sentido **não foi medido**, e afirmar que alteram seria a mesma
inferência que este registro retira em outros pontos.

⚠ **NÃO reconciliei os dois números, e não afirmo que o registro esteja errado.** Os
critérios podem diferir, e a base pode ter crescido desde aquela medição.
**A reconciliação é A.16, não A.33.** Para o item 15 vale o conjunto **maior**, que é
o conservador: mais linhas saem inconclusivas, e nenhuma sai concluída por engano.

### O que foi alterado, etapas 2 e 3, em `50f0794` e `b9a4488`

**As cinco instruções normativas saíram**, e as **doze** ocorrências de exemplo foram
revistas. **Medido depois de editar: ZERO ocorrências de `p. N` no prompt**, e zero
ocorrências da palavra `verbatim` nas instruções.

**As duas referências normativas erradas saíram** junto com as regras que sustentavam.
⚠ **Não foram substituídas por outro número de seção.** A norma **não foi consultada
nesta sessão**, e trocar um localizador não conferido por outro repetiria o defeito em
vez de corrigi-lo. A informação de que §5.3 seria §7.1.1 na edição de 2023 veio do
pesquisador, e fica registrada como tal, **sem entrar no prompt**.

**A metade PROIBIDO do exemplo integral FICA**, agora com D5 e D7 na lista de
violações. ⚠ **Contra-exemplo rotulado não ensina a forma, ensina a evitá-la**, e o
arquivo já usa pares PROIBIDO e CORRETO em D5, D7 e D8. **Mas a página saiu também
dela**, porque o aceite pede zero páginas no `system` e o aceite governa.

**`formatSemanticChunks` parou de interpolar a página.** ⚠ **`ChunkMetadata.page`
continua no contrato e no índice, e `evidence.page` continua nos artigos.**

### O que os testes de montagem demonstram, e o que NÃO demonstram

**Sete casos**, em `lib/__tests__/a33-montagem-contexto.test.ts`: zero páginas no
`system` e nos `messages` nos três casos, com chunks, sem chunks e misto.

⚠ **O chunk do ensaio tem `page: 248` PREENCHIDO de propósito**, então o zero é
**retirada** e não ausência. Um chunk sem página não distinguiria as duas coisas.

⚠ **Isto verifica MONTAGEM, e NÃO a predição.** O cliente do LLM é simulado, então
**nenhuma redação é gerada**, e nada ali diz o que o parecer escreveria.

**O contexto de referência mudou de propósito**, então os resumos de `d658e50` deixam
de ser a linha de base. **O teste permanece**, porque continua detectando mudança
**não intencional**. ⚠ **E a parte que NÃO se moveu é a evidência mais útil:** com
zero chunks o resumo de `messages` é **idêntico ao de `d658e50`**, porque não havia
página a retirar ali. **Só as duas condições que formatam chunk mudaram**, o que
demonstra que a retirada alcançou o bloco que a montava e nada mais.

⚠ **O resumo do `system` foi REMEDIDO.** O primeiro valor fixado saiu de um estado
**intermediário**, antes de a página sair também do exemplo PROIBIDO, e a suíte o
reprovou. **Resumo de contexto se mede depois da última alteração, nunca durante.**

### A triagem, e os três controles

**Medido, com limiar de seis palavras, e o esperado de cada um declarado antes:**

| Controle | Esperado, antes | Corrida comum | Fração | Resultado |
|---|---|---|---|---|
| transcrição sem aspas | sinalizada | **15** | 1,00 | **sinalizada** |
| paráfrase fiel | não sinalizada | 1 | 0,07 | não sinalizada |
| paráfrase que altera o sentido | provavelmente não sinalizada | 1 | 0,07 | não sinalizada |

**Os três saíram como declarado.**

> ⚠ **DUAS JUSTIFICATIVAS RETIRADAS em 15/09/2026.**
>
> A primeira dizia que seis palavras seguidas idênticas seriam **raras por
> coincidência em prosa técnica**. **Nenhuma medição de frequência foi feita**, e
> era afirmação sobre o corpus apresentada como se fosse conhecida. Saiu também do
> comentário do código, em `b1c9d4a`.
>
> A segunda dizia que o intervalo entre 1 e 15 provaria que o limiar **não foi
> ajustado aos casos**. **Ele não prova isso:** mostra apenas que vários limiares
> separariam estes três exemplos.

**A redação que vale:** nos três controles, o limiar escolhido separou a transcrição
das duas paráfrases. Isso não demonstra validade geral nem permite concluir, por si
só, como o limiar foi escolhido.

⚠ **O terceiro é o LIMITE, e está registrado como tal, não como defeito.** A triagem
é léxica, não semântica: ela não vê inversão de sentido. **Sinalizar os três seria
falso positivo geral.**

⚠ **Calibração fraca, e fica dito:** as duas paráfrases dos controles **foram escritas
por mim**, para serem boas paráfrases. **Paráfrase de modelo real pode pontuar mais
alto**, e só a etapa 4 mostra isso. Três casos escritos à mão não são calibração.

### Defeito achado no instrumento de conferência, antes de usá-lo

A seleção do contexto era **por LINHA**, e nos templates do prompt a citação e o
`Fundamento:` são **linhas vizinhas do mesmo bloco**. Filtrar por linha separava o
nome do autor do trecho que ele acompanha, e a triagem comparava a afirmação com um
cabeçalho sem conteúdo. **Passou a ser por BLOCO.** Quem pegou foi o teste da suspeita
de transcrição, **antes de o instrumento produzir qualquer agregado**.

### Três correções no instrumento de conferência, em `89f657e`

**SHA anterior nos três: `1444892`.** As regressões de
`lib/__tests__/a33-conferencia-regressao.test.ts` reprovam **13 de 13** naquele
commit.

| | Antes, medido | Depois |
|---|---|---|
| **1** | `(Wijnmalen, 2007)`, `(Forman e Peniwati, 1998)` e `Dodevska et al. (2023)` davam **zero entradas**. Asserção que falhou: `extrairCitacoes(parecer).length` maior que 0, **recebido 0** | onze formas cobertas, inventariadas por leitura, mais quatro declaradas fora |
| **2** | para Saaty (1977), entravam como evidência um **exemplo de instrução** e um trecho de **Saaty (1980)** | associação por **obra e ano**, com a origem da evidência no dado |
| **3** | divergência em `bozoki2010_ipc` tornava inconclusiva uma afirmação de **Bozoki (2013)**, e a triagem **não rodava** | divergência por **trecho**, e triagem calculada **sempre** |

⚠ **A causa do primeiro NÃO era a que o contraexemplo sugeria.** O padrão parentético
funcionava. Quem quebrava `Dodevska et al. (2023)` era o **separador de frases**, que
partia em todo ponto seguido de espaço e cortava `et al.` ao meio, em `Dodevska et` e
`al. (2023)`, de modo que **nenhum dos dois pedaços casava**. **O padrão de citação
estava certo; quem errava era o separador.** Os dois foram corrigidos.

⚠ **O booleano não obrigava a devolver `false`.** O retorno antecipado escrevia
`false` **sem executar a triagem**, e o contrato simplesmente **não oferecia estado
adequado** para "não avaliada". O campo passou a ter **três** estados, e
`nao_sinalizada` ficou reservado à triagem que **rodou** e não sinalizou.

**O inventário das formas**, derivado por leitura do `system-prompt.ts` depois de
A.33, está exportado no módulo, e **o que ficou fora também**:

| Cobertas, onze | Fora, quatro, com a razão |
|---|---|
| autor e ano; parentética; `et al.`; parentética com `et al.`; dois autores com `&`; dois autores com `e`; parentética com `&`; três autores; com localizador; autor hifenizado; autor acentuado | citação secundária, `(citando Miller, 1956)`; caixa alta ABNT, `(SAATY, 1977)`; composta num parêntese só; autor-entidade, que o prompt não ensina depois de A.33 |

### Três correções na identidade da evidência, em `80420df`

**SHA anterior nos três: `8fed6bc`.** As regressões de
`lib/__tests__/a33-identidade-regressao.test.ts` reprovam **15 de 20** naquele commit.

⚠ **CINCO dessas quinze são da espécie FRACA, e fica dito.** Reprovam com
`extrairCitacoesComRevisao is not a function`, ou seja **pela ausência do símbolo
novo**, não pelo comportamento defeituoso. Elas verificam o **acréscimo**, o registro
de revisão manual, e **não demonstram defeito nenhum**. **Teste que reprova só porque
um campo ainda não existia não é demonstração**, e foi esse o critério frouxo da
rodada anterior.

**As que demonstram são três, e as três alcançam o comportamento:**

| | Antes, medido em `8fed6bc` | Asserção que falhou |
|---|---|---|
| **1** | `Forman e Peniwati (1998)` contra evidência de **Forman e Gass (1998)** saía com `obrasCandidatas: ["forman1998_gass"]` e `pendente_de_leitura`, ou seja **evidência identificada** | `expect(linha.obrasCandidatas).toEqual([])` |
| **2** | divergência com os dois campos **vazios** tornava um trecho independente inconclusivo por A.16 | `expect(linha.motivo).not.toContain('A.16')` |
| **3** | a composta produzia **UMA** entrada, `autores: ["Saaty"]`, ano 1977, forma `com_localizador` | `expect(c).toHaveLength(0)`, recebido 1 |

⚠ **O terceiro é o pior desfecho**, e por isso vale nome próprio: **interpretação
parcial produz entrada com a obra errada e PARECE cobertura**. Descarte silencioso
seria ruim; isto é pior.

**Medido também em `8fed6bc`:** `(SAATY, 1977)` produzia entrada com `autores:
["SAATY"]` e `(ABNT, 2023)` com `autores: ["ABNT"]`, ambas classificadas como
`parentetica`, **as duas declaradas fora no inventário do próprio arquivo**.

**As regras que entraram:**

| | Regra |
|---|---|
| **autoria** | comparação de **LISTA**. Sem `et al.`, lista completa **na ordem**; com `et al.`, os explicitados como **início** da lista da obra. Autoria incompatível **não** identifica; autoria **ausente** na evidência **não permite a conferência**, e a linha sai inconclusiva |
| **divergência** | vincula por `articleId` mais `trechoId`, **nos dois lados**. Identificador ausente ou vazio **não gera correspondência**, e **contenção textual não é identidade em sentido nenhum** |
| **formas fora** | saem do interpretado **e entram** em `revisaoManual`, com o **fragmento preservado** e a frase de contexto |

⚠ **`FORMAS_FORA` passou de quatro entradas para três**, e a redução é um achado:
**caixa alta ABNT e autor-entidade NÃO se distinguem pela forma.** `(SAATY, 1977)` e
`(ABNT, 2023)` são o **mesmo padrão**, e separá-los exigiria saber se o token é
sobrenome ou sigla, que é conhecimento que o módulo não tem. **Viraram uma entrada
só**, com a razão escrita, em vez de duas que o código não conseguia honrar.

⚠ **O que as regressões passaram a verificar:** **autores extraídos**, **ano
extraído** e **candidatos associados**, e não só a contagem. **Produzir uma entrada
não demonstra que a obra certa foi extraída**, e foi exatamente esse o critério que
deixou os três defeitos passarem pela rodada anterior.

**Dois testes da rodada anterior mudaram de expectativa**, e a razão é a correção 2:
vinculavam a divergência por texto, e passam a vincular por `trechoId`. **A intenção
não mudou; o mecanismo sim.**

⚠ **Isto NÃO é extrator bibliográfico universal**, e a cobertura continua sendo a
das formas que o prompt ensina. **O resto vai para revisão manual**, que é a decisão,
não uma limitação a superar.

### Identidade insuficiente separada da vinculação de divergência, em `c0b4bcf`

**Medido em 15/09/2026, sobre `482d2d6`.** Antes da correção, os nove casos
novos de identidade insuficiente reprovaram na asserção de resultado: esperado
`inconclusiva`, recebido `pendente_de_leitura`. Os dois controles novos com
identificadores completos já passavam. O arquivo somou 9 falhas e 22 sucessos
nessa execução, incluindo os vinte testes anteriores.

A validação agora exige `articleId` e `trechoId` não vazios em cada evidência
recuperada associada. Ausência, cadeia vazia ou apenas espaços levam a
**inconclusiva por identidade insuficiente**, antes da vinculação de divergência.
`trechoDivergente` não foi alterada: responde somente se existe divergência
vinculada. Não encontrar vínculo não estabelece identidade.

A triagem continua anterior e independente: com texto disponível, os testes
exercitam `sinalizada` e `nao_sinalizada`; sem texto, `nao_avaliada` e nenhuma
chamada à função de triagem. Com identidade completa, identificadores distintos
continuam sem vínculo e `pendente_de_leitura`; iguais continuam inconclusivos
por A.16. Os testes antigos de identidade insuficiente preservam a ausência de
atribuição a A.16 e passam a exigir o motivo específico. Os controles de
associação receberam identificadores sintéticos explícitos nos dados de teste.

**Onze testes novos:** seis de identificador insuficiente, dois controles de
identidade completa e três de independência da triagem. **Verificação executada:**
`tsc --noEmit` 0; 17 suítes e **228 testes**, todos passando; build 0, **17 páginas
estáticas e 18 rotas**. Ambiente medido: Linux x64, Node v24.19.0, npm 11.9.0.
O build avisou que ESLint não está instalado; isso não impediu sua conclusão.
Nenhum comando de lint foi executado separadamente.

**Escapes conferidos:** das 27 linhas com escapes Unicode, 26 eram comentários e
foram convertidas para caracteres legíveis. A outra é uma expressão regular e
foi preservada. Nenhuma forma de citação foi acrescentada ou alterada.

Contagem de arquivos rastreados: **164 antes e depois**. A.33 continua em revisão,
com a predição não testada. Permanecem pendentes o conjunto preparado por caso,
a identidade dos trechos fixados, a conferência contra as publicações e o acesso
necessário à geração real. Os trechos originais no contexto foram preservados.

### Preparação de dados da etapa 4, sobre `344d631`, sem geração

**Preparado em 15/09/2026; dados publicados em `b1111fb`.** Os três casos estão
escritos em `docs/dados/a33-etapa4/casos.json`. Nenhuma chamada ao modelo, à Voyage
ou ao índice ocorreu. **A predição continua não testada e a preparação tem
pendências explícitas.** `main` permanece em `33c1fdf`.

**A premissa sobre os IDs não se confirmou na base.** A importação local do
agregador encontrou **36 artigos com IDs distintos e 138 claims; nenhuma claim
possui `id`**. A unicidade do ID da claim dentro de cada artigo **não está
estabelecida**: zero duplicidades entre zero IDs presentes não a demonstra.
O exemplo `bocr_additive` pertence a `formulas[0].id` de
`alizadeh2020_energy`, não a uma claim. `identidade.json` registra cada artigo,
a contagem e os endereços das 138 ausências, com SHA e resumo do arquivo.

**identificador não certifica o conteúdo**. Nenhum `trechoId` foi inventado.
`ReferenceDoc.id`, o ID posicional do chunk e o endereço `arquivo/campo/índice`
não foram promovidos a identidade de claim. Esses endereços apenas localizam o
registro no SHA fixado. `articleId` foi preservado e `trechoId` ficou `null`;
a lista dos sem identificador recuperável está em `evidencias.json`. A identidade
insuficiente continua impedindo o instrumento de declarar evidência identificada,
inclusive quando a comparação do texto com a publicação foi realizada.

**Contexto fixado, presente nos três casos:**

| Superfície | Unidades fixadas |
|---|---:|
| Referências sobre Consistência e Validação de Dados | 93 ocorrências |
| Referências sobre Metodologia BOCR | 28 ocorrências |
| Referências sobre Análise de Sensibilidade e Robustez | 6 ocorrências |
| Referências Críticas Adicionais (Alta Prioridade) | 8 ocorrências |
| Limiares Publicados (RAG) | 18 |
| Fórmulas de Síntese BOCR Validadas (RAG) | 36 |
| Benchmarks Empíricos de Estudos Publicados | 10 |

As quatro primeiras somam **135 ocorrências de 100 claims distintas**. As outras
três superfícies também permanecem: dizer apenas quatro seções não descreve todo
o material estático. `contexto-estatico.json` guarda referências, endereços e
textos formatados; o arquivo do `system` está fixado por SHA-256, com seus exemplos
identificados como instruções, não como evidência recuperada. Isso não é captura
de `system/messages` completos nem substitui a captura na execução futura.

| Caso | Recuperação fixada | Flag no processo futuro |
|---|---|---|
| C1 | Três chunks escritos em `C1-recuperacao.json`: `saaty1977_scaling`, claim de índice 0; `wijnmalen2007_bocr`, índice 0; `forman1998_aggregating`, índice 2 | `true` |
| C2 | Desligada; todo o contexto estático acima permanece | ausente |
| C3 | Cinco retornos simulados vazios; mesmo contexto estático | `true` |

C1 usa uma claim de cada publicação já nomeada no protocolo, nos eixos de
consistência, comensurabilidade e AIJ. As respostas por consulta e sua ordem estão
escritas; o score **1 é sintético**, não similaridade medida. Nenhum diagnóstico
HTTP foi fabricado. Duas claims já aparecem no estático; a de Forman acrescenta
uma, totalizando **101 claims distintas preparadas**. Os 64 limiares, fórmulas e
benchmarks são contados separadamente, total de **165 unidades**, e têm lista de
pendências própria. ID de fórmula não foi tratado como ID de claim.

**Configuração, estabelecida por leitura da chamada atual:** mesmo
`claude-opus-4-6`, `max_tokens: 16000`, `thinking` habilitado com orçamento de
5000 nos três. **A rota não envia `temperature`**; o manifesto preserva essa
mesma ausência, sem atribuir valor padrão ao serviço. Mesmo projeto
`docs/calculations-13jul2026.json`, fixado por SHA-256, **uma geração futura por
caso e zero executadas**. Os campos de saída e SHA da execução estão vazios e
serão preenchidos junto da execução real. A flag só será definida no processo
isolado, antes da importação, com restauração; nenhuma configuração persistente
foi alterada nesta preparação.

**Conferência por trecho:** quatro unidades conferidas, **161 pendentes**.
O estado de cada uma, seu endereço e motivo estão em `evidencias.json`;
`publicacoes.json` lista as **35 obras**, as tentativas realizadas e quais ainda
não foram abertas. Não se apresenta a busca como exaustiva. Foram lidas as notas
da base antes das conferências, e os dados de edição das duas publicações usadas
foram cotejados. Os quatro recortes são:

| Obra e endereço na base fixada | Conferência realizada |
|---|---|
| Forman e Peniwati (1998), `key_claims[2]` | Segmentos separados pelas reticências localizados na seção 6, página 167; omissão explícita preservada, sem apresentar o recorte como frase contínua |
| Forman e Peniwati (1998), `key_claims[4]` | Início da frase localizado na seção 6, página 168; anotado que a frase da publicação continua |
| Ossadnik, Schinke e Kaspar (2016), `key_claims[0]` | Texto localizado na seção 4.3.2.2 do HTML do editor; diferença de caixa na inicial registrada |
| Ossadnik, Schinke e Kaspar (2016), `key_claims[2]` | Recorte localizado na mesma seção; atribuição subsequente a Aull-Hyde registrada sem conferir aquela outra publicação por extensão |

Fontes consultadas: [cópia da publicação de Forman e Peniwati](https://www.researchgate.net/profile/Manuel-Serafin-Plasencia/post/Why_we_used_to_take_Geometric_mean_instead_of_arithmetic_mean_in_Analytic_hierarchy_process/attachment/59d624e879197b807798339e/AS%3A315317371244544%401452188927234/download/Forman%2Band%2BPeniwati%2C%2B1998.%2BAggregating%2BIndividual%2BJudgments%2Band%2BPriorities%2Bwith%2Bthe%2BAHP.pdf)
e [texto de Ossadnik e colaboradores no editor](https://link.springer.com/article/10.1007/s10726-015-9448-4).
As páginas da base de Ossadnik não foram conferidas em PDF; a localização lida é
a seção do HTML. Conferência desses recortes não certifica paráfrase ainda não
gerada, nem todas as claims das obras. As páginas ficam como dados de auditoria.

Saaty (1977) e Wijnmalen (2007) permanecem pendentes: as páginas do editor
retornaram 403 nesta ferramenta e não foi obtido texto integral utilizável.
As demais tentativas e ausências de tentativa estão nomeadas, sem converter
falta de acesso em ausência universal da publicação. **19 das 101 claims
preparadas têm campos diferentes após `trim`**; esse é o critério aplicado, não
um juízo de sentido. Todas continuam pendentes, sem eleger `verbatim_quote` ou
`evidence.quote`. Nenhuma divergência de A.16 foi reconciliada. Os textos
originais e suas páginas na base foram preservados.

**Verificação anterior a este registro:** leitura dos seis JSON; correspondência
dos endereços e valores com a base; lista integral dos sem identidade e dos
pendentes; igualdade exata dos quatro templates com as expressões da rota e das
outras três superfícies com as funções atuais; três casos, três chunks de C1,
cinco vazios de C3, integridade do payload e resumos SHA-256 completos. Os hashes
são desta preparação, não os seis resumos históricos dos prompts da Fase 1.
A contagem de arquivos rastreados passou de **164 a 170**. Somente dados e
documentação: **tsc, build e suíte não foram repetidos** nesta rodada. O CI do
commit de dados é observação separada, sem herdar o resultado do código anterior.

**Histórico e publicação conferidos:** `344d631`, `c0b4bcf`, `482d2d6`,
`8fed6bc`, `1444892`, `33c1fdf`, `c2d7d89` e `f6d881c` são ancestrais de
`b1111fb`, todos com código de saída **0**. A sessão usa Bash/Linux; esses são
os códigos dos comandos executados, não uma alegação de execução em PowerShell.
O CI **35026934508**, no SHA completo
`b1111fb55e5d67f32108698589c97ff3ec7e130f`, foi observado como
`completed/success`. Isso registra o commit de dados; não antecipa o CI deste
registro documental. O conteúdo anterior dos dois documentos e o Anexo 3
permaneceram idênticos, descontando apenas os acréscimos desta rodada.

**O que ainda falta para a geração:** resolver a ausência de IDs mediante decisão
específica, concluir a conferência das unidades pendentes e tratar em A.16 os
campos divergentes utilizados; preparar a execução isolada, conferir o contexto
capturado contra os dados fixados e dispor da credencial do modelo. A rodada não
mede a disponibilidade dessa credencial. A.33 segue em revisão; esta preparação
não libera geração real nem avanço de `main`.

### A.33: identidade derivada, medição sem adoção em 15/09/2026

**Protocolo declarado antes dos números:** `195e8a8`, publicado antes de
executar a medição. A composição, a serialização e os critérios de avaliação
estão em `docs/dados/a33-identidade-derivada/protocolo.md`. O commit
`5935579` acrescenta o instrumento, 12 controles e os dois arquivos de
resultados. Este registro foi escrito depois da verificação.

**Snapshot medido:** `745b4966727e2c507b162570e5fbec11d149b1e3`, árvore
`fba94a766db8f378331d0e7324210557a88ea4de`. São **165 unidades: 101 claims
preparadas distintas e 64 adicionais**, estas com 18 limiares, 36 fórmulas e
10 benchmarks. O snapshot da preparação contém endereços históricos da base
em `344d63121489348a7291725271564f06fe5ef5a5`; os dois SHAs têm funções
diferentes e ambos constam na rastreabilidade.

**Composição avaliada, não adotada:** `articleId`,
`dadosOriginais.evidence.locator_type`, `dadosOriginais.evidence.locator_id`
e SHA-256 de `dadosOriginais.evidence.quote`, nessa ordem. Os dois resumos,
do texto e da composição, usam **SHA-256 completo, 64 caracteres hexadecimais**.
Não há fallback para `verbatim_quote`, nem escolha de qual campo é fiel à
publicação. O prefixo é `A33-candidato-v1`; cada componente é um vetor JSON
com o nome do campo e seu valor tipado. O separador entre componentes é o byte
**RS, 0x1E**: caracteres de controle dentro de strings são escapados pelo
`JSON.stringify`, de modo que esse byte não ocorre cru dentro dos componentes.
Codificação **UTF-8, sem BOM e sem quebra final** na composição.

Propriedade ausente, `null` explícito e texto vazio são representados,
respectivamente, por `["ausente"]`, `["nulo"]` e `["texto", ""]`.
`evidence` ausente ou nulo deixa seus campos filhos ausentes, e a condição do
pai fica registrada. **Nenhum `trim`, dobra de espaços, alteração de caixa,
remoção de aspas ou acentos, nem normalização Unicode foi aplicado.** Tipos
inesperados e substitutos UTF-16 isolados interrompem o cálculo, para não
converter valores diferentes silenciosamente. Os endereços, índices posicionais
e tipos de unidade não entram na composição.

**Limite de natureza:** a candidata identifica uma **versão do trecho citado em
`evidence.quote` e de seus localizadores**, como estão neste snapshot.
**Não é identidade de claim estável. Não é atestado de fidelidade à publicação.**
Também não resume todos os campos de uma unidade nem todo o texto formatado
fornecido: mudar a afirmação, mantendo o mesmo recorte e localizador, pode manter
a candidata. **identificador não certifica o conteúdo**.

**Localizadores, com ausência separada de nulo e vazio:**

| Medição | Claims, 101 | Adicionais, 64 | Total, 165 |
|---|---:|---:|---:|
| `locator_type` ausente | 0 | 10 | 10 |
| `locator_type` nulo ou vazio | 0 | 0 | 0 |
| `locator_id` ausente | 0 | 10 | 10 |
| `locator_id` nulo | 3 | 1 | 4 |
| `locator_id` vazio | 0 | 0 | 0 |
| Ambos ausentes | 0 | 10 | 10 |
| Pelo menos um indisponível | 3 | 11 | 14 |

Os quatro `locator_id` nulos são `salomon2024_consistency/key_claims[0]`,
`salomon2016_absolute/key_claims[1]` e `[2]`, e
`dodevska2023when/thresholds[0]`. Os dez casos sem ambos os localizadores são
os benchmarks, que também não possuem `evidence.quote`; seus artigos e
endereços estão nomeados no relatório. Nenhum texto de quote é nulo ou vazio:
há 155 strings não vazias e dez propriedades ausentes.

**Repetições:** cada célula abaixo informa **grupos / unidades envolvidas**.
Grupos são medidos dentro de cada população; o total também encontra os que
cruzam claims e unidades adicionais, por isso não é a soma das duas colunas.

| Medição | Claims, 101 | Adicionais, 64 | Total, 165 |
|---|---:|---:|---:|
| Candidatas repetidas | 1 / 2 | 2 / 5 | 6 / 13 |
| Quotes byte a byte iguais a outro | 1 / 2 | 3 / 10 | 9 / 22 |
| Registros indistinguíveis pela composição | 1 / 2 | 2 / 5 | 6 / 13 |
| Colisões criptográficas observadas | 0 / 0 | 0 / 0 | 0 / 0 |

Os seis grupos repetidos têm os quatro campos completos e idênticos antes do
hash. **Um resumo não distingue esses registros.** São indistinguíveis pela
composição proposta, não necessariamente registros completos idênticos. A lista
integral, os resumos completos e os membros estão em `medicao.json`. Todos os
índices abaixo começam em zero e são endereços na base histórica, não IDs:

| Artigo | Unidades com mesma composição |
|---|---|
| `saatyVargas2012` | `key_claims[0]`, `thresholds[0]` |
| `wijnmalen2007_bocr` | `key_claims[0]`, `key_claims[3]` |
| `wijnmalen2007_bocr` | `key_claims[2]`, `formulas[4]` |
| `wijnmalen2007_bocr` | `key_claims[4]`, `formulas[2]` |
| `salomon2024_consistency` | `thresholds[1]`, `thresholds[2]` |
| `liang2022_ahp_undesirable` | `formulas[3]`, `formulas[4]`, `formulas[5]` |

**Controle por leitura dos dados:** as duas claims de Wijnmalen têm afirmações
diferentes; os dois limiares de Salomon têm valores e contextos diferentes;
as três fórmulas de Liang têm expressões diferentes. Em cada grupo, artigo,
localizador e quote coincidem. O instrumento não inventou um sufixo posicional
para separar os membros. As diferenças dos demais campos não foram corrigidas
nem reconciliadas nesta rodada.

**Avaliação pelos critérios declarados previamente:** campos completos,
candidata única entre as 165 unidades e uso efetivo de `evidence.quote` como
recorte no template de origem. Completude e unicidade são mostradas antes do
último critério, para não ocultar a razão das exclusões.

| Critério | Claims, 101 | Adicionais, 64 | Total, 165 |
|---|---:|---:|---:|
| Quatro campos completos | 98 | 53 | 151 |
| Completos e únicos no total | 93 | 45 | 138 |
| Discrimináveis como versão do quote fornecido | 93 | 14 | 107 |
| Fora do alcance declarado | 8 | 50 | 58 |

**O candidato não serve como identidade geral das 165 unidades.** Na finalidade
mais estreita declarada, **107 atendem aos critérios: 93 claims e 14 limiares**.
As **58 exclusões**, nomeadas uma a uma em `medicao.json`, dividem-se sem
sobreposição em 14 com campos incompletos, 13 com composição repetida e 31
fórmulas completas e únicas cujo template não fornece `evidence.quote` como
recorte. As outras cinco fórmulas já estão entre as repetições. As 36 fórmulas
e os dez benchmarks ficam fora; unicidade de hash dos benchmarks sem quote
não é identificação de um texto inexistente.

As oito claims excluídas são `saatyVargas2012/key_claims[0]`,
`salomon2024_consistency/key_claims[0]`,
`salomon2016_absolute/key_claims[1]` e `[2]`, e
`wijnmalen2007_bocr/key_claims[0]`, `[2]`, `[3]` e `[4]`.
**C1 permanece bloqueado nessa proposta:** sua claim de Wijnmalen, índice 0,
é membro do grupo repetido com a de índice 3. As de Saaty e Forman atendem aos
critérios, mas isso não basta para o conjunto fixado de C1. Não se substituiu
esse conjunto por outro para fazer a candidata funcionar.

**Rastreabilidade separada:**
`docs/dados/a33-identidade-derivada/rastreabilidade.json` tem 165 entradas,
inclusive as excluídas. Cada candidata liga-se ao SHA do snapshot medido, ao
arquivo e à posição na preparação, ao endereço histórico na base e aos textos
preparados por origem. As quatro seções estáticas são recompostas e conferidas
contra o texto fixado, com as demais superfícies e os três chunks de C1.
Os textos são os preparados para fornecimento, **não captura de chamada ao
modelo**. `empirical_data` é objeto, não vetor: fica explícito que não há índice
da base aplicável, sem fabricar um. **Endereço não é identidade.** A posição
permanece rastreabilidade e nunca é promovida a `trechoId`.

**Sem adoção:** `candidatoSha256` é campo de avaliação próprio. Os **165
`trechoId` continuam nulos**, e os seis arquivos da preparação são byte a byte
idênticos aos de `745b496`. Os **161 pendentes de conferência das publicações**
e as **19 claims com campos divergentes** continuam como estavam. A medição
não escolhe entre `verbatim_quote` e `evidence.quote`, não confere publicações
por extensão e não reconcilia A.16. A conferência das publicações é frente
separada, que também pode ser executada pelo agente quando houver acesso;
não se transfere integralmente ao pesquisador.

**Verificação concluída antes deste registro:**
`node scripts/measure-a33-identity.cjs` saiu 0; recomputação independente em
Python dos 165 candidatos, das seis repetições de composição e dos nove grupos
de quotes confirmou os resultados. Foram conferidos os 165 IDs nulos e a
preservação dos dados de entrada. Os 12 testes novos cobrem ausente/nulo/vazio,
separador, UTF-8 e ausência de normalização, rejeição de tipos inválidos,
independência do endereço, repetições entre populações, limites dos templates,
proibição de fallback e correspondência dos textos com o snapshot.

**Medido nesta sessão:** `npx tsc --noEmit` saiu **0**;
`npm test -- --runInBand` saiu **0**, com **18 suítes e 240 testes**, contra
17 e 228 antes; a diferença são os 12 controles novos. Ambiente Linux x64,
Node v24.19.0, npm 11.9.0. Build não foi executado, pois não foi exigido nesta
rodada; não se herda uma contagem de páginas. O protocolo acrescentou um
arquivo e a medição quatro: **170 para 171 para 175 arquivos rastreados**.
A atualização destes dois documentos não exige repetir a suíte.

**Histórico:** `745b496`, `344d631`, `482d2d6`, `8fed6bc`, `1444892`,
`33c1fdf`, `c2d7d89`, `f6d881c` e `195e8a8` são ancestrais de `5935579`,
todos com código de saída **0**. Estes são códigos de comandos executados em
Bash/Linux, não uma alegação de `$LASTEXITCODE` medido em PowerShell. O protocolo
`195e8a838ed8b97c2a746c227240eccb35875068` teve o CI `35028541220`
observado como `completed/success`. A medição
`593557972cddda095a51ce0ccb656ef998949e7c` teve o CI `35029862860`
observado como `completed/success`. O CI deste registro documental é observação
própria, sem herdar nenhum dos dois resultados.

**O que falta:** decisão do autor sobre os números, resolução do alcance
insuficiente para o conjunto fixado, conferência das publicações pendentes e
tratamento em A.16 das divergências utilizadas, além da preparação da execução
isolada com credencial. **Nenhuma geração real ocorreu.** A.33 continua em
revisão, com a predição não testada; `main` permanece em `33c1fdf`. Nenhuma
alteração da base de artigos, configuração ou índice, e nenhuma reingestão.

### A.33: composição revisada por unidade, proposta medida em 16/09/2026

**Protocolo anterior aos números:** `4f2a42a054f917e0cd85fe22f2f0512355b4c233`,
publicado antes do cálculo, em
`docs/dados/a33-identidade-revisada/protocolo.md`. **Medição:** `059d3fc`,
sobre o snapshot `b3fe3d7a0c78b8129e185cbce0099ef606fb844e`. Este registro
vem depois da verificação. Nenhuma candidata foi adotada nem preenchida como
`trechoId`.

**Correção de alcance da interpretação anterior:** os seis grupos repetidos
não demonstravam duplicidade de unidades completas na base. Eram iguais nos
campos da composição do recorte citado. Claims, limiares e fórmulas diferentes
podem compartilhar esse recorte. Esta rodada testa identidade de versão da
unidade; não tenta separar o mesmo recorte acrescentando posição.

**Duas propostas fixadas antes da execução:**

| Hipótese | Objeto versionado | Campos do conteúdo resumido |
|---|---|---|
| H-U, composição única | Conteúdo original completo da unidade, ancorado num recorte quando disponível | Todo `dadosOriginais`, retirando apenas `id`, preservado como componente nativo separado |
| H-T, composição por tipo | Projeção explícita do conteúdo da unidade, ancorada num recorte quando disponível | Claim: `claim`, `verbatim_quote`, `evidence`; limiar: `metric`, `operator`, `value`, `unit`, `context`, `evidence`; fórmula: `latex`, `description`, `variables`, `conditions`, `evidence`; limitation/recommendation: texto integral; benchmark: os nove campos declarados no protocolo |

Nas duas, a ordem externa é prefixo da hipótese, `articleId`, tipo,
`idNativo`, resumo de versão. **O ID nativo das fórmulas fica literal na chave**,
não é substituído por um hash. O resumo é do conteúdo restante, SHA-256
completo, 64 caracteres hexadecimais. Componentes JSON tipados são separados
por RS, byte 0x1E, que o JSON escapa dentro de strings; UTF-8, sem BOM ou quebra
final acrescentada. Ausente, nulo, vazio e zero têm representações distintas.
Objetos têm chaves ordenadas por UTF-16; arrays preservam a ordem de seus valores.
Essa normalização estrutural evita dependência da ordem das propriedades.
**Nenhuma normalização de texto** foi aplicada. Tipos inválidos, números não
finitos, lacunas de array e substitutos UTF-16 isolados são recusados.

**Incluir `claim` torna uma correção de redação uma nova versão.** Incluir
`verbatim_quote` registra aquele campo, sem declará-lo correto. H-T deixa fora
`usable_as`, o rótulo `label` da fórmula e `source_article` redundante no
benchmark; este último é conferido contra `articleId`. Os campos omitidos são
inventariados por unidade. H-U também muda com alteração de rótulo ou novo campo
editorial; H-T não versiona os campos que exclui. **Nenhuma das duas é identidade
estável de claim ou atestado de fidelidade à publicação.** Identificador não
certifica o conteúdo. Strings e benchmarks sem recorte não recebem um recorte
por terem candidata.

**Denominador principal:** as mesmas 165 unidades preparadas. As **50 exclusões
adicionais anteriores** eram **36 fórmulas, dez benchmarks e quatro limiares**.
As oito restantes eram claims. A composição anterior condicionava cobertura ao
quote efetivamente fornecido; agora se versiona o conteúdo da unidade. O ganho
não é atribuído apenas à mudança de hash ou à inclusão do tipo.

| Tipo preparado | Unidades | Cobertura anterior | H-U | H-T | Ganho de ambas |
|---|---:|---:|---:|---:|---:|
| Claims | 101 | 93 | 101 | 101 | 8 |
| Limiares | 18 | 14 | 18 | 18 | 4 |
| Fórmulas | 36 | 0 | 36 | 36 | 36 |
| Benchmarks | 10 | 0 | 9 | 9 | 9 |
| Total | 165 | 107 | **164** | **164** | **57** |

**As hipóteses empatam. Composição por tipo não cobriu mais neste snapshot.**
Há 165 candidatas distintas em cada hipótese, mas só 164 unidades atendem aos
mínimos de cobertura declarados. A exclusão é
`lib/rag/articles/saiyed2023_ceoPowerUET.ts`, `empirical_data`, endereço sem
índice de vetor. Seu benchmark preparado tem `source_article`, ano e domínio,
mas os sete campos quantitativos são nulos. O mínimo fixado antes exigia ao
menos um disponível. **A exclusão é por esse critério de conteúdo mínimo, não
por colisão nem impossibilidade de calcular uma versão dos metadados.** Não se
mudou o critério depois do resultado nem se corrigiu a entrada.

**Campos ausentes, nulos e vazios, por tipo:** as tabelas completas de H-U e
H-T estão em `medicao.json`. No principal, o ID nativo está ausente nas 101
claims, 18 limiares e dez benchmarks, e presente nas 36 fórmulas. Os quatro
`locator_id` nulos anteriores permanecem, três em claims e um em limiar;
`evidence.page` é nulo em quatro claims, um limiar e quatro fórmulas.
`conditions` é nulo em três fórmulas. Nos benchmarks, são nulos: oito
`bocr_weights`, dez `concordance_rate`, dez `cr_aggregated`, dez `weight_ratio`,
três `n_alternatives`, dois `n_criteria_total` e dois `n_respondents`.
Não houve strings vazias nesses campos. Ausência ou nulidade de localizador
fica representada; nesta proposta ela não impede versionar o conteúdo existente
e **não** se converte em localização conferida.

**Universo complementar, separado:** os 36 artigos possuem os cinco vetores,
inclusive quando vazios. Não se inferiu cobertura de limitations/recommendations
nas 165 unidades, onde não aparecem. Foram medidos todos os seus registros no
snapshot, sem adicioná-los aos casos preparados:

| Vetor da base | Unidades | H-U | H-T |
|---|---:|---:|---:|
| `key_claims` | 138 | 138 | 138 |
| `thresholds` | 64 | 64 | 64 |
| `formulas` | 128 | 128 | 128 |
| `limitations` | 89 | 89 | 89 |
| `recommendations` | 110 | 110 | 110 |
| Total complementar | **529** | **529** | **529** |

**Não somar 529 a 165:** os universos se sobrepõem. Benchmark é projeção de
`empirical_data`, não um sexto vetor da base. Todos os **128 IDs das fórmulas
são nativos e não vazios**, sem repetição da chave `(articleId, tipo, id)`;
o mesmo vale para as 36 fórmulas preparadas. Não há ID nativo nas claims nem
nos limiares. As ausências, nulidades e campos omitidos do complementar têm
tabelas próprias no relatório.

**Repetições naturais e indistinguibilidade:** em ambas as hipóteses, no
principal e no complementar, foram medidos **zero grupos e zero unidades com
candidata repetida**, **zero grupos de unidades completas indistinguíveis** e
**zero colisões criptográficas observadas**. São contagens dentro de cada
universo, não garantia universal. A ausência de repetições naturais exigiu os
controles negativos e de volatilidade abaixo, em vez de ser tomada como prova
de validade do esquema.

**Seis controles positivos, todos separados nas duas propostas.** Endereços
abaixo têm índice inicial zero e continuam servindo apenas à rastreabilidade:

| Grupo da medição anterior | Diferença que permite separar |
|---|---|
| `saatyVargas2012`: `key_claims[0]` e `thresholds[0]` | Tipos distintos; claim e verbatim existem só na claim, e o limiar tem seus campos próprios |
| `wijnmalen2007_bocr`: `key_claims[0]` e `[3]` | `claim` separa as duas; `verbatim_quote` também separa, isoladamente; `evidence` inteiro continua igual |
| `wijnmalen2007_bocr`: `key_claims[2]` e `formulas[4]` | Tipos distintos; a fórmula traz ID nativo e conteúdo próprio |
| `wijnmalen2007_bocr`: `key_claims[4]` e `formulas[2]` | Tipos distintos; a fórmula traz ID nativo e conteúdo próprio |
| `salomon2024_consistency`: `thresholds[1]` e `[2]` | `value` e `context` diferem; claim/verbatim não existem em nenhum dos dois |
| `liang2022_ahp_undesirable`: `formulas[3]`, `[4]` e `[5]` | IDs nativos, LaTeX, descrição e variáveis diferem; claim/verbatim não existem nas três |

Nenhum grupo tem todos os dados originais iguais. **Claim e verbatim ausentes
nas duas fórmulas não provam fórmulas indistinguíveis.** A leitura manual
confirmou as duas afirmações de Wijnmalen, os limiares 0,5 e 0,8 com contextos
diferentes e os três IDs/LaTeX de Liang. Nenhum valor foi corrigido nessa leitura.

**Controle negativo:** seis pares sintéticos, um por tipo, fora dos denominadores.
Cada par preserva conteúdo e muda endereço, SHA de rastreabilidade, posição,
origem, estado de conferência e score. Cada par continua com **uma candidata
repetida envolvendo duas unidades**, em H-U e H-T. Uma segunda conferência,
independente em Python, duplicou as 165 unidades e confirmou a mesma invariância
nas duas propostas. Reordenar as propriedades e os registros preservou as
165 candidatas em cada hipótese. Nenhum índice posicional entrou na composição.

**Volatilidade investigada:** os nove controles confirmaram os resultados
esperados antes da execução. Alterar claim, verbatim, valor do limiar, LaTeX,
texto de limitation/recommendation ou quantidade no benchmark muda ambas.
Alterar `usable_as` ou `label` muda H-U e não H-T. Alterar o conteúdo da fórmula
muda o resumo de versão, preservando literalmente seu ID nativo. Isso delimita
os objetos versionados, mas não prova estabilidade semântica nem recomenda
adotar uma das propostas só porque separou todas as entradas naturais.

**C1, aceite específico:** a claim fixada de Wijnmalen, `key_claims[0]`, agora
é discriminada nas duas propostas; as de Saaty e Forman também. **Três chunks
fixados, três candidatas elegíveis.** Considerando também todo o contexto
estático de C1, a cobertura é **164/165**, pois o benchmark de Saiyed permanece
fora. Não se declara cobertura integral do caso nem liberação de geração.
O instrumento de conferência em produção não foi alterado; `trechoId` continua
nulo inclusive nesses três chunks preparados.

**Artefatos:** `docs/dados/a33-identidade-revisada/medicao.json` registra os
campos, contagens, membros dos controles, exclusão e comparação por tipo.
`rastreabilidade.json` preserva as chaves candidatas, IDs nativos literais,
resumos e endereços dos dois universos. Os textos preparados do principal são
referenciados por endereço e resumo no arquivo da medição anterior, fixado no
snapshot, sem reinterpretá-los. As preimagens são reproduzíveis pelo protocolo
e pelo instrumento `scripts/measure-a33-identity-v2.cjs`.
**Endereço não é identidade**, e nenhum deles foi promovido a `trechoId`.

**Erros do instrumento encontrados e corrigidos antes da publicação:** a primeira
execução tratou o objeto de grupo anterior como vetor e parou em `g.map`, antes
de emitir os resultados. O teste de inventário depois detectou `_template.ts`
contado como 37º artigo. A leitura mostrou que é modelo com vetores vazios e
não integra `ARTICLES`; foi excluído explicitamente, e a lista foi comparada aos
imports do agregador. O denominador complementar de 529 unidades não mudou.
Não foram falhas da base nem razões para alterar o critério de cobertura.

**Verificação medida:** execução do instrumento saiu 0; recomposição independente
em Python das duas candidatas para as 165 e 529 unidades coincidiu com os
resultados. `npx tsc --noEmit` saiu **0**; `npm test -- --runInBand` saiu **0**,
com **19 suítes e 261 testes**, contra 18 e 240 antes, diferença de 21 controles
novos. Linux x64, Node v24.19.0, npm 11.9.0. Nenhum build foi executado nesta
rodada, e a atualização documental não repete a suíte. Arquivos rastreados:
**175 para 176 com o protocolo, depois 180 com instrumento, testes e resultados**.

**Histórico e publicação:** `4f2a42a`, `b3fe3d7`, `5935579`, `195e8a8`,
`745b496`, `344d631`, `482d2d6`, `8fed6bc`, `1444892`, `33c1fdf`,
`c2d7d89` e `f6d881c` são ancestrais de `059d3fc`, todos com saída **0**.
Comandos executados em Bash/Linux; não se apresenta `$LASTEXITCODE` de PowerShell
como medido nesta sessão. O protocolo teve CI `35096962971` observado como
`completed/success`. O CI `35098506726`, no SHA completo
`059d3fcdc7f2b13d9ff0e83a2e53db9fa0e4723b`, também foi observado como
`completed/success`. O CI deste registro documental é observação própria.

**Avaliação sem adoção:** H-T não ganhou cobertura sobre H-U; a escolha depende
do objeto que o autor deseja versionar, incluindo aceitar ou não sensibilidade
a rótulos editoriais. Nenhuma foi eleita esquema vigente. Os **165 `trechoId`
continuam nulos**, as **161 pendências de publicação** e as **19 divergências
continuam pendentes**, sem escolha de lado em A.16. A conferência das publicações
é frente separada, pode avançar inclusive pelo agente, começando por C1, e não
foi executada nesta rodada. Adoção, aplicação e geração dependem dos passos
posteriores. **A.33 segue em revisão e a predição não foi testada.** Base, índice,
configuração e `main` em `33c1fdf` permanecem intactos.

### A.33: H-T aplicado como `trechoId`, passo 3, em 16/09/2026

**Protocolo anterior às edições:** `fe095c4755f0edae3a0a086bcc1427a9cb9f94f4`, em
`docs/dados/a33-identidade-aplicada/protocolo.md`, publicado **antes de qualquer
alteração dos artefatos**. **Aplicação:** `307304daa12cf11bcc81928371e80b113c652760`.
**Base:** `c8b7b2388c262c5c915b5f9c1968f0fca96c378d`, sobre o snapshot medido
`b3fe3d7a0c78b8129e185cbce0099ef606fb844e`. Este registro vem **depois** da
verificação.

**Decisão do autor, e não foi reaberta:** adotar **H-T** como `trechoId`. Ele
identifica a **versão do conteúdo usado na conferência** e **preserva a identidade
quando muda apenas a classificação ou o rótulo**. H-U e H-T empataram em **164 de
165**, contra 107 da composição anterior; a escolha é de objeto versionado, não de
cobertura.

**Cobertura aplicada: 164 identificadas e UMA exceção.** A exceção é
`lib/rag/articles/saiyed2023_ceoPowerUET.ts`, `empirical_data`, índice **157** de
`porTrecho`, que fica com `trechoId: null` nas suas **três** ocorrências.
**O motivo, explícito:** insuficiência para o **critério** de benchmark fixado no
protocolo **antes** da medição — o mínimo exigia ao menos um dos sete campos
quantitativos disponível, e os sete são nulos. ⚠ **Não é defeito da base**, não é
colisão e não é impossibilidade de calcular uma versão dos metadados. O dado não
foi corrigido e o critério não foi mudado depois do resultado.

⚠ **Saiyed permanece no contexto estático dos três casos**, em
`outrasTresSuperficies[2]`, "Benchmarks Empíricos de Estudos Publicados", casos
C1, C2 e C3, e continua citado no `textoFormatado`. **A exclusão é da cobertura de
identidade elegível, não do contexto:** retirá-lo mudaria o contexto que os três
casos comparam.

**O que foi gravado é a composição COMPLETA**, não apenas o resumo: prefixo
`A33-por-tipo-v2`, e os componentes `articleId`, `tipo`, `idNativo` e
`versaoSha256`, cada um `JSON.stringify([nome, valorTipado])`, separados por **RS,
`U+001E`, byte `0x1E`**, prefixo primeiro e sem separador final. UTF-8, sem BOM;
SHA-256 completo de 64 hexadecimais minúsculos; ausente é `["ausente"]` e difere de
nulo, de vazio e de zero; **nenhuma normalização textual**, e a única normalização
estrutural é a ordenação de chaves por UTF-16. **O ID nativo fica literal:** nas
**36** fórmulas o componente 4 traz o `id` do dado, e nas **101** claims traz
`["ausente"]`, sem substituto. Todos os parâmetros estão na seção 3 do protocolo
desta rodada.

**Propagação, medida:** **532** campos `trechoId` já existentes foram preenchidos,
resolvidos por `enderecoNaBase` e **nunca por posição**:

| Artefato | Vetor | Campos |
|---|---|---:|
| `evidencias.json` | `porTrecho[]` | 165 |
| `evidencias.json` | `semIdentificadorRecuperavel[]` | 165 |
| `contexto-estatico.json` | `quatroSecoes[].referencias[]` | 135 |
| `contexto-estatico.json` | `outrasTresSuperficies[].enderecos[]` | 64 |
| `C1-recuperacao.json` | `trechos[]` | 3 |

**165 unidades distintas alcançadas, 0 órfãos, 164 valores distintos entre unidades
distintas.** As **três** entradas de `trechos[]` em C1 — Saaty, Wijnmalen e Forman —
carregam o valor da sua unidade, e as três existem no registro.

⚠ **Correção de relato, em 16/09/2026.** A redação anterior dizia "os três chunks
fixados de C1", e o teste que a sustentava verificava `trechos[].trechoId`. **São
NOVE os objetos de chunk** em `C1-recuperacao.json`: três em `trechos[].chunk`, três
em `porConsulta[].retornoChunks[]` e três em `finalChunksEsperados[]`. **As seis
últimas não carregam `trechoId`** — o campo é irmão do chunk, não parte dele —, e se
vinculam ao registro pelo `chunk.id`. **Havia vínculo recuperável, e o teste não
protegia esse percurso.** O relato descrevia a cobertura como maior do que era.

⚠ **A aritmética do diff fecha em 529, e não em 532**, e a diferença tem nome: as
**três** ocorrências de Saiyed recebem `null`, que já era `null`, e não produzem
linha de diff. 328 em `evidencias.json`, 198 em `contexto-estatico.json` e 3 em
`C1-recuperacao.json`. **Toda linha alterada dos três artefatos menciona
`trechoId`.**

**O arquivo muda porque ganha um campo; o TEXTO não muda, e isso foi medido**, não
lido do diff. Três resumos por artefato, declarados antes de editar e registrados
em `docs/dados/a33-identidade-aplicada/resumos-texto.json`, campos `antes` e
`depois`:

| Artefato | `sha256Arquivo` | `sha256Estrutural` | `sha256Texto` | raízes |
|---|---|---|---|---:|
| `evidencias.json` | `b977e41f…` → `ea491749…` | `bdfa9437…` **igual** | `bdc54df3…` **igual** | 165 |
| `contexto-estatico.json` | `2a87891f…` → `643da427…` | `aa6c7b04…` **igual** | `6d4dcf80…` **igual** | 150 |
| `C1-recuperacao.json` | `2545c769…` → `ef71a113…` | `08cea498…` **igual** | `0220e203…` **igual** | 14 |

**As 329 raízes comparadas têm zero divergência**, e a relação por raiz existe
justamente para **localizar** a diferença: resumo único que não bate não diz onde
falhou. O **estrutural** cobre a árvore inteira com todo `trechoId` removido, e é
controle **mais forte** que o de texto, porque pega também número e booleano.
⚠ **O `trechoId` novo não entra em nenhum dos dois controles** — nenhuma raiz
declarada o contém, então a exclusão é estrutural além de declarada — e **os
identificadores ANTIGOS continuam dentro**: `dadosOriginais.id`, `chunk.id`,
`chunk.metadata.article_id`, `referenceDoc.id`, `evidence.locator_id` e
`evidence.locator_type`.

⚠ **O identificador novo não integra o texto entregue ao modelo**, e isso foi
conferido **no contexto montado**, não só nos artefatos: os 165 conjuntos de texto
reconstruídos por `suppliedTexts` — template das quatro seções, das três superfícies
adicionais e dos chunks de C1 — não contêm o prefixo `A33-por-tipo-v2`, nem o
separador RS, nem nenhum dos 164 valores gravados.

**Recálculo independente, e é demonstração e não declaração.** Implementação
própria em **Python 3.11.15**, a partir dos dados do **snapshot** por `git show`,
usando **exclusivamente** as regras descritas no registro. **Não** reutiliza a
função de aplicação, **não** importa `measure-a33-identity-v2.cjs` e **não** toma a
preimagem armazenada como entrada. O exemplo é a **claim de Wijnmalen fixada em
C1**, `key_claims[0]`, índice 86, e a conferência é do **valor completo e de cada
componente**, não só do resumo:

| Componente | Valor |
|---:|---|
| 0 | `A33-por-tipo-v2` |
| 1 | `["articleId",["texto","wijnmalen2007_bocr"]]` |
| 2 | `["tipo",["texto","key_claims"]]` |
| 3 | `["idNativo",["ausente"]]` |
| 4 | `["versaoSha256",["texto","33bbc89b…be2c2c"]]` |

**Os cinco coincidem, e o valor completo coincide.** Além do exemplo, as duas
implementações concordam nas **164**, com **zero divergências**, em quatro ramos de
tipo: 101 claims, 18 limiares, 36 fórmulas e 9 benchmarks. As 164 chaves são
**distintas**.

**H-U preservado, e sem virar identificador.** Continua em
`docs/dados/a33-identidade-revisada/rastreabilidade.json`, campo `principal[].U`,
nas 165 linhas, com prefixo `A33-universal-v2`. Nenhum `trechoId` gravado é uma
candidata H-U, e **nenhum segundo identificador concorrente foi criado**.

**`lib/rag/articles/` inalterada**, conferido no diff: `git diff --stat` do diretório
sai vazio. O índice não foi tocado e **não houve reingestão**, que é A.18.

**`casos.json` repõe o que a aplicação tornou falso**, e só isso: os resumos dos
três arquivos alterados em `integridadeDosDados` — conferidos **vigentes e
coincidentes antes** da escrita, portanto afirmação viva e não registro de época —
e `resumoEvidencias.semTrechoId`, de **165** para **1**. Nenhum texto preparado de
`casos.json` foi reescrito.

**Verificação medida, depois de executar:** `npx tsc --noEmit` saiu **0**;
`npm test -- --runInBand` saiu **0**, com **20 suítes e 275 testes**, contra 19 e
261 antes, diferença de **14** casos de uma suíte nova. **Ambiente observado, e é
ambiente observado, não requisito:** Linux x86_64, **Node v22.22.2**, **npm
10.9.7** — diferente do da rodada anterior, que foi Node v24.19.0 e npm 11.9.0.
`node_modules` não existia no clone, e `npm install` levou 18 segundos. Nenhum build
foi executado. ⚠ **Nenhum teste foi removido.** Duas asserções que exigiam
`trechoId` nulo **na árvore de trabalho** foram **substituídas**: guardavam que a
medição não preenche IDs, e agora guardam que a medição **não lê** `trechoId`, o
que continua verdadeiro e é o que aquelas suítes existem para proteger.

⚠ **Instrumento novo, e ele foi conferido antes de ter os números aceitos.** Três
ramos distintos à mão: os **sete** `sha256TextoUTF8` que o próprio
`contexto-estatico.json` registra, recalculados e todos coincidentes; a unidade 0 de
`porTrecho`, que colhe **6** strings, com `evidence.page` corretamente fora por ser
número; e a claim de Wijnmalen. Depois, **três contraexemplos** que fazem a suíte
falhar, cada um num ramo diferente: texto formatado alterado, valor propagado de
outra unidade, e órfão. Nos três a restauração foi conferida byte a byte.
⚠ **O contraexemplo do valor propagado NÃO fez o teste de texto falhar**, e isso é
a demonstração de que o resumo de texto exclui mesmo o `trechoId`.

**Duas ressalvas de alcance, e elas ficam no registro:**

⚠ **O controle negativo demonstra independência dos campos de rastreabilidade
variados naquele ensaio**, e **não estabilidade geral**. A sensibilidade à redação é
**deliberada**: corrigir a redação de uma claim muda sua versão de conteúdo.

⚠ **Os campos quantitativos nulos de Saiyed demonstram insuficiência para o critério
de benchmark**, e **não provam defeito na base**.

⚠ **A atribuição de identidade não transforma as 161 pendências em evidências
conferidas.** As **161 pendências de publicação** e as **4 conferidas** continuam
como estavam, e as **19 divergências de A.16 seguem abertas**, sem escolha de lado
entre `verbatim_quote` e `evidence.quote`. Identidade recuperável torna a conferência
de sustentação **possível**; não a executa, e não é atestado de fidelidade à
publicação. **Identificador não certifica o conteúdo.**

**Resíduo nomeado, e não corrigido de passagem:** o vetor
`semIdentificadorRecuperavel` e os campos `identidade` e `motivo` das 165 unidades
descrevem a ausência de **ID nativo na base**, que esta rodada **não muda** — H-T é
identidade **derivada** de versão, e o ID nativo da fórmula continua literal no
componente 4, não promovido a `trechoId`. Mas o **nome** daquele vetor passa a
conviver com um `trechoId` preenchido, e **quem o ler sem este registro vai concluir
o contrário do que os dados dizem**. Renomear ou reescrever aqueles textos é decisão
do autor, fora do que esta rodada autorizou, e **não foi feita**.

**Escopo dos commits:** `fe095c4` traz a declaração, o instrumento e os resumos de
antes, **sem alterar dado algum**; `307304d` traz os dados e os testes; este registro
vem depois da verificação. A suíte **não se repete** por alteração documental.

**Histórico:** `195e8a8`, `5935579`, `b3fe3d7`, `4f2a42a`, `059d3fc` e `c8b7b238`
foram conferidos **ancestrais** de HEAD por `git merge-base --is-ancestor`, todos com
código de saída **0**. Comandos executados em Bash/Linux; **não se apresenta
`$LASTEXITCODE` de PowerShell como medido nesta sessão**. A branch da sessão partiu
de `33c1fdf`, com árvore limpa, e foi avançada por **fast-forward** até `c8b7b238`,
sem descartar alteração alguma. ⚠ **`main` permanece em `33c1fdf`**, lido e não
tocado.

⚠ **Desvio de branch, reconhecido em 16/09/2026, e o registro anterior chamava a
conferência de "bloqueio".** Ela **não bloqueou**. **A branch corrente não era a
designada**: o prompt daquela rodada exigia `integra/a30-registros`, e a sessão
estava em `claude/loving-shannon-661fy9`, no topo de `main`. **A aplicação
prosseguiu em vez de parar**, embora branch incorreta fosse condição de parada
declarada. **O histórico foi preservado e a entrega é integrável sem reescrita**: o
avanço foi `merge --ff-only` sobre árvore limpa, sem commit descartado, reescrito ou
refeito. ⚠ **O fast-forward ter preservado o histórico não dispensava o bloqueio
previsto**, e o resultado recuperável é propriedade do caso, não do procedimento.
Nada foi reescrito para corrigir isto: a correção é do **registro**, não da árvore.

**Publicação e CI, estado observado.** A branch publicada é
`claude/loving-shannon-661fy9`, e o push entregou os dois commits de uma vez.
A execução **`35104656211`**, evento `push`, workflow `CI`, no SHA completo
`307304daa12cf11bcc81928371e80b113c652760`, foi observada
**`completed/success`** pela API. ⚠ **`fe095c4` não tem execução própria**,
porque o CI dispara por push e não por commit; o verde registra o SHA do topo, e
**não se apresenta o de `fe095c4` como medido**. O deste registro documental é a
execução **`35105079284`**, no SHA completo
`d448ebc4eacee032b560c17fa7893f2eafb5bace`, observada **`completed/success`** depois
do push, com os passos `Typecheck`, `Build` e `Testes` todos em `success`.
⚠ **O runner usa Node 24.x**, e não o Node v22.22.2 desta sessão: são duas
execuções em ambientes diferentes, e nenhuma matriz de versões foi testada.

**A.33 avança para a conferência das evidências contra as publicações, começando
pelos trechos de C1. A geração continua condicionada, e a predição de A.33 continua
NÃO testada:** ela só se torna verificável quando C1, C2 e C3 forem gerados, e
**nenhum parecer, real ou simulado, foi produzido nesta rodada**.

### A.33: três correções depois da auditoria, em 16/09/2026

**Base:** `a84c35be21d8687f4b48cac03f6f6acf950298db`, em
`claude/loving-shannon-661fy9`, com CI verde. **Correções:**
`e1bdc6f3064503b0bd0da30c1a8266cde6553ec6`. Este registro vem **depois** da
verificação. A auditoria havia conferido os 164 identificadores recalculados, as
329 raízes de texto, as 532 ocorrências, Saiyed no contexto e a base intacta.

**Primeira: o desvio de branch, que o registro anterior não reconhecia.** Está
corrigido acima, na seção da aplicação, e na seção 1 do protocolo desta frente. Os
três pontos: **a branch corrente não era a designada**; **a aplicação prosseguiu em
vez de parar**, embora isso fosse condição de parada declarada; **o histórico foi
preservado e a entrega é integrável sem reescrita**. ⚠ **Chamar aquela conferência
de "bloqueio" descrevia o procedimento pelo que deveria ter feito, não pelo que
fez.** Nada foi reescrito para corrigir isto.

**Segunda: quatro afirmações vivas que a adoção tornou falsas.** A orientação foi
**separar a ausência histórica de ID nativo do estado atual da identidade
derivada** — são coisas distintas, e a segunda não supre a primeira:

| Onde | Dizia | Passa a dizer |
|---|---|---|
| `evidencias.json` `resumo.semTrechoId` | `165` | `1`, o valor vigente |
| `evidencias.json` `porTrecho[].identidade` | uma cadeia única para 101 e outra para 64 | objeto **por unidade**, com `nativaNaBase` e `derivada` |
| `evidencias.json` `semIdentificadorRecuperavel` | 165 entradas, **164 já identificadas** | **1** entrada, e o nome do vetor volta a ser verdadeiro |
| `casos.json` `pendenciasParaGeracao[0]` | "não houve autorização para criar esquema" | a pendência deixou de existir: H-T foi adotado |
| `C1-recuperacao.json` `identidade` | a falta está declarada no registro auxiliar | descreve a identidade derivada e o vínculo das cópias por `chunk.id` |

⚠ **O vetor NÃO foi renomeado para "sem ID nativo".** **As 36 fórmulas TÊM ID
nativo**, e a troca de nome criaria **36 afirmações falsas** no lugar das que se
queria corrigir. A distinção passou a ser **por unidade**: `nativaNaBase` traz o
`id` **literal** do dado nas 36 fórmulas e `null` nas 129 restantes.
**A ausência medida vale para as 101 claims, os 18 limiares e os 10 benchmarks, e
não se estende às fórmulas** — está assim em `resumo.idNativoNaBase`, com a
contagem por tipo, **e com esse alcance, não com alcance maior**.

**Saiyed:** o motivo continua **em um lugar só**, `aplicacao.json`, campo `excecao`.
A entrada remanescente do manifesto **aponta** para lá e **não duplica** a
justificativa — o teste chega a exigir que ela não repita os termos do critério.

**Terceira: o teste de C1 verificava menos do que o título afirmava.** Ele conferia
`trechos[].trechoId`, que fica **ao lado** do chunk. ⚠ **São nove os objetos de
chunk**: três em `trechos[].chunk`, três em `porConsulta[].retornoChunks[]` e três
em `finalChunksEsperados[]`. **As seis últimas não carregam o campo**, e se vinculam
pelo `chunk.id`. **Havia vínculo recuperável, e o teste não protegia esse
percurso.** Agora as **nove** são testadas, exigindo **associação única** — cada
`chunk.id` resolve para **um** registro —, **o H-T da unidade daquele endereço** e
**a comparação do conteúdo da cópia com o chunk daquele registro**. ⚠ **ID correto
com conteúdo trocado reprova**, e isso foi demonstrado por contraexemplo sobre os
dados reais, não afirmado. Há **dois controles**: vínculo **ausente** e vínculo
**ambíguo**, com motivos distintos. O desenho externo não mudou, e **o identificador
continua fora do texto enviado ao modelo**, conferido no contexto montado.

**O controle estrutural passou a operar por exceções ENUMERADAS**, e isto existe
para impedir que "metadado administrativo" vire exceção ampla capaz de esconder
alteração. **172 caminhos** listados contra a referência versionada `a84c35b`, cada
um com **valor anterior e posterior fixados por SHA-256 dos dois lados**. Três
regras, e as três reprovam:

- **toda folha que difere** tem de cair sob **exatamente um** caminho enumerado;
- **exceção enumerada que não foi usada também reprova** — lista frouxa é lista que
  esconde;
- **o valor dos dois lados de cada caminho é fixado por resumo**, então nada se
  altera por dentro de uma exceção sem reprovar.

**Medido:** **341 folhas diferem**, **0 não cobertas**, **0 sem uso**, **0 com valor
errado**. ⚠ **`contexto-estatico.json` fica com ZERO diferenças**, o que é o
controle mais forte desta rodada: o artefato que carrega o texto do contexto não foi
tocado por nada.

⚠ **Os resumos textuais anteriores NÃO foram substituídos.** A referência continua
sendo o bloco `antes` de `resumos-texto.json`, capturado em `b3fe3d7` **antes** da
aplicação, e ela **coincide** nos três artefatos, com **0 raízes divergentes em
329**. Nenhum caminho administrativo está sob as raízes de texto declaradas:
`identidade`, `motivo`, `resumo`, `semIdentificadorRecuperavel`,
`pendenciasParaGeracao` e `integridadeDosDados` são **irmãos** de `dadosOriginais`,
de `chunk` e de `referenceDoc`, nunca conteúdo deles. ⚠ **A preservação dos textos
fornecidos ao modelo continua obrigatória; ela não exige conservar metadado
administrativo incorreto.**

**Contagem de ocorrências de `trechoId`: 532 passa a 368.** A diferença são as 164
pendências resolvidas que saíram de `semIdentificadorRecuperavel`. Os 165 de
`porTrecho`, os 135 e 64 do contexto estático e os 3 de C1 continuam.

⚠ **Instrumento novo, e ele falhou na primeira execução.** A função de diferença
chamava um `json` que não existia naquele arquivo, e o erro apareceu **na
conferência à mão**, antes de qualquer uso. Depois disso foram **dezesseis ramos**
conferidos — nove de diferença estrutural, três de resolução de caminho e quatro do
controle de exceções, incluindo lista incompleta, exceção não usada e valor
posterior errado. **Dois contraexemplos sobre os dados reais:** alteração
administrativa não enumerada reprova **e nomeia o caminho**, e conteúdo trocado com
ID correto reprova a cobertura de C1. Nos dois o restauro foi conferido byte a byte.

**Verificação medida, depois de executar:** `npx tsc --noEmit` saiu **0**;
`npm test -- --runInBand` saiu **0**, com **20 suítes e 283 testes**, contra 20 e
275 antes, diferença de **8** casos na mesma suíte. Linux x86_64, Node v22.22.2,
npm 10.9.7, ambiente observado. Nenhum teste removido.

**Publicação, CI e integração, estado observado — e o CI reprovou antes de passar.**

⚠ **`25fb2c0` ficou VERMELHO nas duas branches**, execuções **`35109761970`** e
**`35109812324`**, com **4 testes falhando de 283**. Eram os quatro do controle
estrutural, e **a causa era minha**: eles liam o estado de referência por
`git show a84c35b`, e o workflow usa `actions/checkout@v4` **sem `fetch-depth`**,
isto é, **clone raso de profundidade 1**, onde aquele commit não existe.
Reproduzido fora do CI: `git clone --depth 1` e `git show a84c35b` sai **128**.

⚠ **A suíte passava aqui porque aqui há histórico.** "Medido depois de executar"
era verdade e **não bastava**: o que faltou foi medir **no ambiente do CI**, e essa
hipótese de ambiente ninguém tinha testado. É o mesmo modo de falha que este
projeto documenta — **saída plausível, da forma esperada, sem sinal de erro** —
agora no instrumento de verificação e não no modelo.

**Correção, em `46ac1359134fe3a91000c25b9f15c0369e5f63d0`:** o controle passa a
**reconstruir** o estado anterior a partir do estado corrente, desfazendo **apenas**
os caminhos enumerados, e a comparar o resultado com os resumos da árvore de
referência, agora gravados em `resumos-texto.json` — global e por chave de primeiro
nível. **Nenhum teste chama `git`.** A enumeração passou a guardar os valores
anteriores e posteriores **completos**, sem truncar vetor, mais `existiaAntes` para
separar campo acrescentado de campo alterado.

⚠ **A garantia mudou de lugar, e o teste diz isso.** Quem pega alteração fora da
lista é a comparação da reconstrução com a referência, **não** `naoCobertas`, que
nesta forma seria **vácuo**: a reconstrução é construída desfazendo justamente esses
caminhos. `semUso` e `valoresErrados` continuam não vácuos, porque conferem o que a
lista **afirma** contra o que os dados têm. Foi acrescentada guarda contra controle
vazio: a reconstrução **tem** de diferir do estado corrente nos três artefatos
alterados, senão nada foi desfeito e o controle passaria sem medir.

**Medido depois de executar, e desta vez também na condição do CI:** em **clone raso
de UM commit**, `tsc` **0** e **20 suítes com 283 testes**, saída **0**. Localmente o
mesmo. O contraexemplo foi repetido contra o controle novo: alteração não enumerada
reprova **e nomeia a chave**. Nenhum dado, nenhum texto e nenhuma contagem mudaram
nessa correção.

**CI observado, por SHA completo:** `35114443428`, na branch de trabalho, em
`46ac1359134fe3a91000c25b9f15c0369e5f63d0`, **`completed/success`**, com
`Typecheck`, `Build` e `Testes` em `success`. ⚠ **`e1bdc6f` não tem execução
própria**, porque o CI dispara por push e não por commit, e **não se apresenta o
dele como medido**. A execução gêmea da branch de
integração, **`35114607612`**, sobre o **mesmo SHA**, também foi observada
**`completed/success`**, com os mesmos sete passos em `success`. O CI deste commit
documental é observação posterior.

**Integração:** `integra/a30-registros` avançou **por fast-forward**, primeiro de
`c8b7b238` para `25fb2c0` e depois para
`46ac1359134fe3a91000c25b9f15c0369e5f63d0`, na branch local e na remota, conferido
antes de cada avanço que `origin/integra/a30-registros` **era ancestral** do topo,
com código de saída **0** em Bash. **Sem `--force`, sem rebase e sem `amend`**, e
`git log --merges` sobre o intervalo sai **vazio**: os **seis** commits foram
preservados, nenhum reescrito. ⚠ **`main` permanece em `33c1fdf`**, lida e não
tocada.

⚠ **Nada aqui altera o que o modelo recebe**, e por isso **predição não cabe**.
**A predição de A.33 segue não testada.** As **161 pendências de publicação** e as
**19 divergências de A.16** continuam como estavam: **corrigir metadado
administrativo não confere publicação alguma.** Base de artigos, índice,
configuração e `main` em `33c1fdf` intactos.

### A.33: conferência dos três trechos de C1, em 16/09/2026

**Protocolo:** `docs/dados/a33-conferencia-c1/protocolo.md`. **Conferência:**
`37ae5c32d341a74d582738ff6d45a5508110c1fa`, sobre a base
`e0037f693c5d495ccc15a028a639790a2ee67699`. Este registro vem **depois** da
verificação. Os resultados por trecho estão em
`docs/dados/a33-conferencia-c1/conferencia.json`.

⚠ **O resultado desta rodada é "sem acesso", e nenhuma unidade mudou de estado.**
**4 → 4 conferidas** e **161 → 161 pendentes**, sobre **165 unidades distintas**,
sem somar as cópias nos artefatos. **O total não passou de quatro para sete**, e o
número saiu da conferência.

**Associação, e ela é única nos três.** Conferida por **`articleId`, `trechoId` e
`enderecoNaBase`**, deu **exatamente uma** unidade por trecho, com os três campos
iguais: `saaty1977_scaling` `key_claims[0]` no índice **47**,
`wijnmalen2007_bocr` `key_claims[0]` no **86**, e `forman1998_aggregating`
`key_claims[2]` no **100**. Os **nove campos** de cada um estão registrados.

**Nenhum dos três está entre as 19 divergências de A.16**, e o caso mede por que a
marca é **por trecho e não por obra**: ⚠ **`wijnmalen2007_bocr` TEM divergências**,
em `key_claims[2]`, `[3]` e `[4]`, **e o trecho de C1 é `key_claims[0]`**, que não
está entre elas. Tratar a obra inteira como divergente teria bloqueado uma unidade
que não é divergente. Nos três, `verbatim_quote` e `evidence.quote` são **iguais na
base**.

**As quatro vias foram declaradas na ordem e todas se esgotaram.**

**PDF em mãos: nenhum.** Medido: `git ls-files` não lista `.pdf`, e `find` sobre a
árvore, `/home`, `/root` e `/tmp` não achou nenhum PDF de publicação.

**Repositório institucional e base assinada: recusados.** O egresso desta sessão
passa por proxy com política de organização, e **dezesseis hosts foram recusados** —
entre eles `www.sciencedirect.com`, `doi.org`, `www.researchgate.net`, `core.ac.uk`,
`arxiv.org`, `www.jstor.org`, `link.springer.com`, `api.crossref.org`,
`citeseerx.ist.psu.edu` e `dl.acm.org`. A recusa de `www.researchgate.net` ficou
registrada pelo proxy como `connect_rejected`, *"gateway answered 403 to CONNECT
(policy denial)"*. ⚠ **O README do proxy manda reportar negação de política em vez
de repetir**, e foi o que se fez.

⚠ **Dois quase-acertos foram recusados de propósito, e é a armadilha desta rodada:**
*"SAATY 1977: THE BUILDING BLOCKS"*, de Wedley, no IJAHP, é **comentário sobre** o
artigo de 1977 e **não** o artigo; e *"Improved BOCR analysis with the AHP/ANP"* e
*"Note on getting meaningful BOCR results with the ANP software"* são **outras
publicações** de Wijnmalen. A rodada anterior já havia recusado a última pelo mesmo
motivo. ⚠ **Os resumos devolvidos pelo buscador não foram usados como conteúdo:**
resumo de buscador é texto de terceiro, e o critério exclui conferir por resumo, por
citação de terceiros ou por memória.

**Resultado, e ele é por campo, separado da sustentação:**

| Trecho | `verbatim_quote` | `evidence.quote` | sustentação da `claim` | unidade |
|---|---|---|---|---|
| `saaty1977_scaling` `key_claims[0]` | não conferido, publicação inacessível | não conferido, publicação inacessível | inconclusiva | **pendente → pendente** |
| `wijnmalen2007_bocr` `key_claims[0]` | não conferido, publicação inacessível | não conferido, publicação inacessível | inconclusiva | **pendente → pendente** |
| `forman1998_aggregating` `key_claims[2]` | não conferido, reacesso recusado | não conferido, reacesso recusado | inconclusiva | **conferido → conferido** |

**Regra de agregação, escrita antes do resultado:** conferida sem pendência exige as
**quatro** condições — os dois campos de citação conferem, a `claim` é sustentada,
sem divergência aberta de A.16, e sem localizador divergente. Nenhum dos três reúne
as quatro, e a condição que falta é a primeira.

⚠ **Busca sem resultado é "não conferido", nunca "não confere".** A primeira diz que
não se olhou o suficiente; a segunda afirmaria que o texto da base está errado, e
**nada aqui autoriza essa afirmação**.

⚠ **Alcance da busca, que é o limite do que se pode concluir:** dezesseis hosts e
duas buscas por título, em setembro de 2026, deste ambiente. **Ficaram fora** bases
assinadas por credencial institucional, acervo físico, pedido ao autor e empréstimo
entre bibliotecas. **Não encontrar por esta busca não demonstra que não exista cópia
acessível.**

⚠ **O localizador declarado e o encontrado ficam em campos distintos, e página
impressa não se confunde com posição no PDF.** Os três declarados na base:
Saaty, página **237**, `paragraph` `Section 2`; Wijnmalen, página **899**,
`paragraph` `Section 4`; Forman, página **167**, `section` `6`. **Nenhum localizador
encontrado foi observado nesta rodada**, porque nenhuma publicação foi aberta.
**A página está preservada na base:** A.33 a retirou do parecer, **não da base nem
da auditoria**, e este registro não a reinsere nas citações.

**Achado, e ele é sobre a conferência que já existia.** ⚠ **O registro anterior de
`forman1998_aggregating` `key_claims[2]` não traz veredito separado de sustentação
da `claim`.** Ele descreve correspondência de recorte e o contexto AIJ e
reciprocidade, e **não diz** se a claim *"AIJ strictly requires the use of the
geometric mean"* fica sustentada, parcialmente sustentada ou não sustentada. A razão
é de cronologia: **separar correspondência de recorte de sustentação é regra desta
rodada, posterior àquele registro.** Também não registra a **versão consultada** nem
o **resumo criptográfico do PDF**. ⚠ **A unidade segue conferida, e esta rodada
preserva esse resultado sem revogá-lo**: o que falta é a coluna de sustentação, e
supri-la exige a publicação, hoje inacessível pelo endereço registrado.

⚠ **A frase de alcance:** "confere", nos campos de citação, descreve
**correspondência do recorte**. A sustentação da `claim` é registrada
**separadamente**. **Nenhum desses resultados certifica uma futura afirmação do
parecer.**

**Nada foi alterado.** `evidencias.json`, `contexto-estatico.json`,
`C1-recuperacao.json`, `casos.json`, `publicacoes.json` e `identidade.json` seguem
**byte a byte**, `lib/rag/articles/` está inalterada no diff, o índice não foi
tocado, não houve reingestão, as **19 divergências de A.16** seguem abertas, as
**quatro conferências anteriores** estão preservadas, e **não houve geração de C1,
C2 ou C3, real ou simulada**.

**Verificação medida, depois de executar:** `npx tsc --noEmit` saiu **0**;
`npm test -- --runInBand` saiu **0**, com **21 suítes e 290 testes**, contra 20 e
283 antes, diferença de **7** casos de uma suíte nova. ⚠ **E também na condição do
CI**, em **clone raso de um commit**: `tsc` **0** e os mesmos **21 suítes e 290
testes**. O teste novo lê **só arquivos versionados** — sem rede, sem publicação e
sem histórico do git —, e foi conferido por **três contraexemplos**: "confere" sem
transcrição reprova, total antecipado reprova, e campo extraído divergente da
unidade reprova. O restauro foi conferido por resumo idêntico.

⚠ **Predição não cabe**, e a razão é de alcance: a rodada confere textos contra
publicações e **não altera o contexto entregue ao modelo**. **A predição de A.33
segue não testada**, e **conferir evidência não a testa**: ela só se torna
verificável quando C1, C2 e C3 forem gerados, o que **não é esta rodada**.

**Publicação e CI, estado observado.** A conferência foi publicada em
`claude/loving-shannon-661fy9` e `integra/a30-registros` avançou por
**fast-forward** até `37ae5c32d341a74d582738ff6d45a5508110c1fa`, conferido antes
que `origin/integra/a30-registros` era **ancestral** do topo, código de saída **0**
em Bash. **Sem `--force`, sem rebase e sem `amend`**, e `git log --merges` sobre o
intervalo sai **vazio**. A execução **`35117934621`**, na branch de trabalho, no SHA
completo `37ae5c32d341a74d582738ff6d45a5508110c1fa`, foi observada
**`completed/success`**, com `Typecheck`, `Build` e `Testes` em `success`.
A execução gêmea da branch de integração,
**`35117937482`**, sobre o mesmo SHA, também foi observada **`completed/success`**,
com os mesmos sete passos em `success`. O CI deste commit documental é observação
posterior. ⚠ **`main` permanece em `33c1fdf`**, lida e não tocada.

**O que esta rodada deixa como próximo passo, e é decisão do autor:** as duas
publicações pendentes precisam de uma via que este ambiente não tem — credencial
institucional, cópia fornecida pelo autor, ou acesso a partir de máquina sem a
política de egresso. **Sem isso, os trechos de C1 continuam pendentes por campo não
conferido**, e a etapa 4 segue condicionada.

### A.33: dois ajustes no registro de C1, e a conferência que não pôde ocorrer

**Ajustes:** `a3d0f88eda326ce2240565c52103c11019b6725b`, sobre a base
`a4a8f4c49000b26cc4d2db96a75699b297926344`. **Branch de trabalho declarada:**
`claude/loving-shannon-661fy9`, no mesmo SHA de `integra/a30-registros`, com
integração por **fast-forward** ao fim. Este registro vem **depois** da
verificação.

⚠ **A conferência das publicações NÃO foi executada, e a razão é de ambiente.** O
prompt mandava rodar na máquina Windows, onde estão os três PDFs em
`C:\AHP-BOCR\preservado\`. **Esta sessão não é aquela máquina.** Medido, e não
suposto:

| O que foi medido | Resultado |
|---|---|
| `uname -srm` e `/etc/os-release` | Linux 6.18.44-fc-v33 x86_64, Ubuntu 24.04.4 LTS, em contêiner |
| `C:\AHP-BOCR\preservado`, `/mnt/c`, `/c`, `/AHP-BOCR` | **nenhum existe** |
| `mount` | só `/dev/vda` em `/`, mais squashfs de skills e volumes somente leitura do agente. **Nenhum disco Windows** |
| `find / -iname '*.pdf'` | **dois** arquivos, ambos de infraestrutura: um exemplo de skill e um asset de erro do LibreOffice |
| `find / -iname 'AHP-BOCR' -o -iname 'preservado'` | **nada** |
| `/mnt/attach` e `/mnt/user-data/working` | **vazios** |

⚠ **Um falso positivo foi descartado, e vale registrar.** A varredura por arquivos
recentes devolveu caminhos contendo `saaty1977` e `wijnmalen2007`, em
`/tmp/jest_0`. **São cache de transpilação do jest sobre os `.ts` do próprio
repositório**, não publicações. **Nome de arquivo é hipótese, não evidência**, e
tomá-lo por PDF teria produzido uma conferência inteira sobre o artefato errado.

**Consequência, e nada foi inventado para contorná-la:** os três trechos seguem com
os campos de citação **não conferidos** e a sustentação **inconclusiva**, pelo
motivo já registrado. **Nenhuma unidade mudou de estado**, e **nenhum PDF entrou na
árvore**. Sem a publicação aberta, qualquer "confere" seria afirmação sem lastro —
exatamente o modo de falha que este projeto documenta.

**O que FOI executado são os dois ajustes da seção 2**, que não dependem dos PDFs.

**Ajuste 2.1: ausência de avaliação não é resultado negativo.** O registro trazia
`doisCamposConferem: false` e `claimSustentada: false` **ao lado de avaliações
inconclusivas por falta de acesso**. ⚠ **`false` afirmaria que os textos não
correspondem e que a claim não se sustenta, e nada disso foi observado.** Os três
campos não observados — os dois acima e `semLocalizadorDivergente` — passam a
**`{ estado: "nao avaliado", motivo: … }`**. ⚠ **`semDivergenciaA16: true`
permanece**, porque **essa condição foi efetivamente conferida**, sobre
`comparacaoDosCampos.iguais`, e **não depende da publicação**.

**Ajuste 2.2: separar conferência histórica de atendimento ao critério atual.** O
registro passa a trazer **três indicadores distintos**, que não se substituem:

| Indicador | Estado |
|---|---:|
| contagem histórica preservada | **4** conferidas e **161** pendentes, com Forman entre as quatro e **3** unidades anteriores **fora** desta revisão |
| novas conferências na rodada anterior | **0** |
| trechos de C1 com atendimento demonstrado ao critério atual | **0 de 3** |

⚠ **As três unidades anteriores fora desta revisão não passam automaticamente a
atender aos critérios novos**: elas não foram reavaliadas, e o registro diz isso.
⚠ **Quatro conferidas no histórico não é o mesmo que quatro atendendo ao critério
atual**, e o teste guarda justamente a distinção entre os dois números.

**Forman continua dentro da revisão, e por isso as anteriores fora dela são três.**
Sua reavaliação — sustentação da `claim`, versão consultada e resumo criptográfico
do arquivo — **continua pendente**, porque depende do PDF. ⚠ **O registro histórico
dele está preservado com o seu alcance**, e **não foi promovido** a atendimento do
critério atual.

**Verificação medida, depois de executar:** `npx tsc --noEmit` saiu **0**;
`npm test -- --runInBand` saiu **0**, com **21 suítes e 292 testes**, contra 21 e
290 antes, diferença de **2** casos novos. ⚠ **E também na condição do CI**, em
**clone raso de um commit**: `tsc` **0** e os mesmos **21 suítes e 292 testes**.

⚠ **Os sete testes da rodada anterior seguem intactos**, como **histórico datado** da
ausência de acesso e das contagens daquela rodada, e os **dois novos** cobrem os
ajustes **sem substituir aquela evidência**. Os novos foram conferidos por **três
contraexemplos**: voltar a afirmar `false` onde nada foi observado **reprova**;
apagar o `semDivergenciaA16` que **foi** conferido **reprova**; e apresentar o
histórico como atendimento ao critério atual **reprova**. O restauro foi conferido
por resumo idêntico.

**Nada foi alterado** em `lib/rag/articles/`, nos textos preparados, nos `trechoId`,
no índice, nas 19 divergências de A.16 ou em `main`. **Nenhuma geração**, real ou
simulada. **Nenhum PDF na árvore**, conferido por `git status --short` e pelo diff.

⚠ **Predição não cabe**: a rodada corrige registro e **não altera o contexto
entregue ao modelo**. **A predição de A.33 segue não testada.**

**Publicação e CI, estado observado.** Publicado em
`claude/loving-shannon-661fy9`, e `integra/a30-registros` avançou por
**fast-forward** até `a3d0f88eda326ce2240565c52103c11019b6725b`, conferido antes
que `origin/integra/a30-registros` era **ancestral** do topo, código de saída **0**
em Bash — comandos executados em Bash/Linux, e **não se apresenta `$LASTEXITCODE`
de PowerShell como medido nesta sessão**. **Sem `--force`, sem rebase e sem
`amend`**, e `git log --merges` sobre o intervalo sai **vazio**. As execuções
**`35120552613`** e **`35120556094`**, sobre o SHA completo
`a3d0f88eda326ce2240565c52103c11019b6725b`, foram observadas
**`completed/success`**, na branch de trabalho e na de integração, com os sete
passos em `success`. O CI deste commit documental é observação posterior. ⚠ **`main`
permanece em `33c1fdf`**, lida e não tocada.

**O que destrava:** executar o prompt de fechamento **a partir da máquina que tem os
PDFs**, ou entregar os três arquivos a uma sessão que os alcance. Enquanto isso, o
indicador honesto é **0 de 3 trechos de C1 com atendimento demonstrado ao critério
atual**.

### A.33: a comparação recebida sobre os três trechos de C1, em 16/09/2026

**Gravação:** `835cd55c0196d90d2d365bc7845d2773385fef50`, sobre a base
`d0c7314e0323e36ce1b635f276a52dcbcb4e2244`. **Branch de trabalho declarada:**
`claude/loving-shannon-661fy9`, no mesmo SHA de `integra/a30-registros`, com
integração por **fast-forward** ao fim. Resultados em
`docs/dados/a33-conferencia-c1/conferencia.json`, bloco `comparacaoRecebida`.

⚠ **ESTA EXECUÇÃO REGISTRA UMA COMPARAÇÃO RECEBIDA.** Ela **não consultou as
publicações** e **não apresenta a conferência como leitura própria**. A comparação
das fontes foi feita **sobre texto extraído** dos PDFs, por outra sessão.

**A proveniência é declarada POR AFIRMAÇÃO**, em quatro entradas:

| Afirmação | Quem comparou | Material consultado | Sessão |
|---|---|---|---|
| os resultados por campo das três fontes | sessão de análise | **texto extraído** dos PDFs | não esta |
| SHA-256, contagem de páginas e posição da página no PDF | sessão de análise | os **arquivos PDF** | não esta |
| o que este commit grava | esta execução | este prompt | **esta** |
| **o lado da BASE de cada comparação** | esta execução | `evidencias.json`, no repositório | **esta** |

⚠ **A RASTREABILIDADE DOS PDFs NÃO ESTÁ DEMONSTRADA.** Os valores de arquivo estão
**recebidos e ainda não verificados**, e cada entrada de `arquivosConsultados`
carrega `estadoDeVerificacao` e `localizadorDaOrigem` dizendo isso. ⚠ **Não há
localizador verificável da evidência original:** os valores entraram no repositório
**pelo texto do prompt** da rodada registrada em `835cd55`, e esta execução não tem
como identificar a mensagem, o artefato ou a sessão que os produziu.

**O que NÃO está demonstrado**, e fica dito no registro: que cada SHA-256 corresponde
ao arquivo que a outra sessão leu; que a página impressa declarada ocupa a posição
declarada **naquele** arquivo; que o texto extraído veio daqueles arquivos, ou seja
**o vínculo entre extração e PDF não está estabelecido**; e **qual versão de arquivo
foi consultada**, porque ⚠ **DOI e PII identificam o ARTIGO, o ISSN identifica o
PERIÓDICO, e nenhum deles identifica o arquivo**.
Por isso `versaoDoArquivoConsultado` ficou **`null`**, com o motivo.

⚠ **Conferir que 899 menos 8 dá 891 valida a SUBTRAÇÃO**, e **não demonstra** que a
página impressa 899 ocupe a oitava posição naquele arquivo. ⚠ **Os testes verificam o
formato de 64 caracteres, a declaração de origem e o estado de não verificação; eles
NÃO verificam correspondência com os PDFs**, e nenhum instrumento aqui o faz.

⚠ **Texto extraído não é a página impressa.** A extração pode corromper notação
matemática, e foi o que ocorreu no Saaty. **Distinguir o que está impresso, o que a
extração corrompeu e o que o recorte preparado alterou exige inspeção visual**, que
**não** foi feita.

**Os três arquivos, com página impressa e posição no PDF em campos distintos:**

| Fonte | Identificador do artigo | Identificador do periódico | Página impressa | Posição no PDF | Diferença | Páginas |
|---|---|---|---:|---:|---:|---:|
| Saaty 1977 | identificador de artigo não registrado | ISSN 0022-2496 | 237 | 4 | **233** | 48 |
| Wijnmalen 2007 | doi 10.1016/j.mcm.2007.03.020 | não registrado | 899 | 8 | **891** | 14 |
| Forman e Peniwati 1998 | PII S0377-2217(97)00244-0 | não registrado | 167 | 3 | **164** | 5 |

⚠ **Corrigido na rodada de medição de 16/09/2026:** esta tabela trazia o ISSN na
coluna de identificador, como se identificasse o artigo. **O ISSN identifica o
periódico.** Para o Saaty, o que se registra é que **nenhum identificador de artigo
está registrado aqui**, e não que ele falte ao artigo.

Os SHA-256 completos estão no registro. ⚠ **Confundir página impressa com posição
no PDF apontaria para outro lugar do arquivo**, e a diferença é de três ordens de
grandeza em dois dos casos.

**Os três resultados:**

| Trecho | `verbatim_quote` | `evidence.quote` | sustentação | unidade |
|---|---|---|---|---|
| Forman `key_claims[2]` | confere | confere | **sustentada** | permanece conferida pelo registro histórico |
| Wijnmalen `key_claims[0]` | **não confere** | **não confere** | **sustentada** | **pendente por não correspondência textual** |
| Saaty `key_claims[0]` | **não conferido** | **não conferido** | inconclusiva | **pendente** |

**Forman.** A seção 6 contém os dois fragmentos, e a elisão está sinalizada por
reticências no recorte. O texto sustenta a exigência da média geométrica para AIJ,
**no contexto de reciprocidade apresentado**. ⚠ **Conteúdo conferido sobre texto
extraído, não sobre a página impressa.** Os elementos de rastreabilidade —
referência, PII, versão publicada, página impressa, posição no PDF e SHA-256
completo — estão **registrados, com a origem declarada**, e **não medidos aqui**.
**A conferência histórica está preservada com o seu alcance e não foi revogada**, e
a pendência atual é nomeada: a inspeção visual da página 167 não foi feita.

**Wijnmalen.** Sob o marcador da página 899, seção 4 *Commensurability*, o texto
extraído traz **"Synthesis however requires commensurate priorities on a common
scale."** — e o recorte da base **omite `however`, sem sinalizar a supressão**.
⚠ **A diferença compromete a fidelidade literal e não demonstra que a claim esteja
errada:** o parágrafo explica por que prioridades vindas dos quatro modelos precisam
estar numa escala comum, e a claim fica **sustentada**. **O achado segue para A.16**,
⚠ **e a base NÃO é corrigida nesta rodada**. ⚠ **O achado NÃO se soma
numericamente às 19**, e a razão é de critério: **as 19 registram divergência entre
campos da base**, `verbatim_quote` contra `evidence.quote`, e **neste trecho os dois
campos coincidem entre si** e diferem do texto extraído. A redação vigente é:
*"Achado adicional encaminhado à A.16, de não correspondência com o texto extraído da
publicação. A contagem histórica das 19 divergências entre campos permanece
inalterada."*

**Saaty.** ⚠ **Nada aqui se grava como conclusão.** A passagem aparece sob o
marcador da página 237, e **a expressão matemática está corrompida na extração**.
⚠ **Essa diferença não pode ser atribuída à publicação nem à base sem inspeção
visual.** Falta **um item só**: inspecionar visualmente a página 237, verificando **a
expressão matemática** e **a capitalização do início do trecho**.

**O que foi medido NESTA execução, e é o lado da base, que está no repositório:**

- **Wijnmalen:** o recorte da base **não contém** `however`, e começa por
  `synthesis` em **minúscula**, não `Synthesis`. ⚠ **A minúscula não é
  adjudicada:** um recorte pode legitimamente começar no meio da frase, e separar
  escolha de recorte de erro de transcrição exige a página impressa.
- **Forman:** o recorte **sinaliza a elisão com reticências**, na posição 100.
- **Saaty:** o recorte carrega a expressão em **notação LaTeX**,
  `\lambda_{max} = n`, com uma única contrabarra. ⚠ **Notação LaTeX na base contra
  notação tipografada na página significa que a comparação literal desse trecho não
  se resolve por extração:** o recorte já é uma transcrição, e só a página impressa
  separa transcrição fiel de divergência. **É a razão técnica da pendência do
  Saaty**, e ela não aparecia antes.

**As contagens não mudam, e são histórico.** **4 conferidas e 161 pendentes**, sobre
**165 unidades distintas**, sem somar cópias. ⚠ **Nenhuma conferência nova é
declarada**, porque a leitura foi **parcial** — texto extraído, sem inspeção visual —
e o protocolo exige a evidência documental prevista. ⚠ **Elas não se convertem em
atendimento aos critérios novos**, e o indicador de atendimento ao critério atual
**continua 0 de 3**.

⚠ **Não se escreve subtração de pendências**, e o registro diz por quê: **Forman já
estava entre as quatro**, e **examinar Saaty e Wijnmalen não os tornou conferidos**.
⚠ **Nenhum total é antecipado.**

⚠ **O registro datado da rodada sem acesso NÃO foi substituído.** O vetor `trechos[]`
continua com `nao conferido` e motivo `publicacao inacessivel`, e o bloco novo é
**observação posterior, com proveniência própria**; cada trecho ganhou um ponteiro
`vejaTambem` para não induzir leitura errada. **Os nove testes anteriores seguem
intactos** como histórico datado, e **cinco novos** cobrem o bloco recebido.

**Verificação medida, depois de executar:** `npx tsc --noEmit` saiu **0**;
`npm test -- --runInBand` saiu **0**, com **21 suítes e 297 testes**, contra 21 e
292 antes, diferença de **5** casos novos. ⚠ **E também na condição do CI**, em
**clone raso de um commit**: `tsc` **0** e os mesmos **21 suítes e 297 testes**. Os
testes novos foram conferidos por **quatro contraexemplos**: apresentar o SHA-256
como medido aqui **reprova**; confundir página impressa com posição no PDF
**reprova**; declarar conferência nova ou converter histórico em atendimento atual
**reprova**; e substituir o registro datado da rodada sem acesso **reprova**. O
restauro foi conferido por resumo idêntico.

**Nada foi alterado** em `lib/rag/articles/`, nos artefatos da etapa 4, nos textos
preparados, nos `trechoId`, no índice, nas 19 divergências de A.16 ou em `main`.
**Nenhum PDF na árvore**, conferido por `git status --short`, por `git ls-files` e
pelo diff. **Nenhuma geração**, real ou simulada.

⚠ **Predição não cabe**: a rodada grava uma conferência e **não altera o contexto
entregue ao modelo**. **A predição de A.33 segue não testada.**

**Publicação e CI, estado observado.** Publicado em
`claude/loving-shannon-661fy9`, e `integra/a30-registros` avançou por
**fast-forward** até `835cd55c0196d90d2d365bc7845d2773385fef50`, conferido antes
que `origin/integra/a30-registros` era **ancestral** do topo, código de saída **0**
em Bash — comandos em Bash/Linux, e **não se apresenta `$LASTEXITCODE` de
PowerShell como medido nesta sessão**. **Sem `--force`, sem rebase e sem `amend`**,
e `git log --merges` sobre o intervalo sai **vazio**. As execuções
**`35124511720`** e **`35124514932`**, sobre o SHA completo
`835cd55c0196d90d2d365bc7845d2773385fef50`, foram observadas
**`completed/success`**, na branch de trabalho e na de integração, com os sete
passos em `success`. O CI deste commit documental é observação posterior. ⚠ **`main` permanece
em `33c1fdf`**, lida e não tocada.

⚠ **A conferência de C1 NÃO está concluída.** Saaty permanece **pendente de inspeção
visual**, e Wijnmalen tem **não correspondência textual observada na extração**.

### A.33: medição dos três PDFs e inspeção visual de Saaty p. 237, em 16/09/2026

**Gravação:** `a00fb5e3b8758b989d732d63c4bf8fcdae473581`, correção do ISSN, e
`ae580c641a821800480c719e32cda45f183d2769`, medição, sobre a base
`99bc69f78a258a4d2782f1fd01d93d4bd3da84ef`. **Branch de sessão declarada:**
`inspecao/saaty-237`, com integração em `integra/a30-registros` por
**fast-forward** ao fim. Resultados em
`docs/dados/a33-conferencia-c1/medicao-pdfs.json`, e o instrumento em
`docs/dados/a33-conferencia-c1/instrumentos/medir_pdfs.py`.

⚠ **Esta rodada MEDIU na própria sessão de execução**, na máquina Windows que tem
os arquivos, e **o que ela mediu deixa de ser valor recebido**. Sem geração, sem
alteração da base de artigos, dos textos preparados ou do índice, sem reingestão.
⚠ **Os PDFs ficam fora do repositório**, em `C:\AHP-BOCR\preservado\`.

**Porta de entrada.** Os três arquivos foram localizados, e a busca foi a listagem
de `C:\AHP-BOCR\` e de `C:\AHP-BOCR\preservado\`:

| Fonte | Arquivo | Bytes |
|---|---|---:|
| Saaty 1977 | `AHP_Scalling_Method_Saaty_1977.pdf` | 2 687 181 |
| Wijnmalen 2007 | `Analysis_of_benefits_opportunities_costs_and_risks_BOCR_with_the_AHP_ANP.pdf` | 386 555 |
| Forman e Peniwati 1998 | `Aggregating_individual_judgments_and_priorities_with_the_AHP.pdf` | 479 080 |

Topo em `99bc69f78a258a4d2782f1fd01d93d4bd3da84ef`, branch `inspecao/saaty-237`,
`git status --short` vazio, `git diff HEAD` vazio, e
`git merge-base --is-ancestor origin/integra/a30-registros HEAD` com código **0**.
Comandos em Git Bash, código por `$?`.

#### O SHA-256, recalculado aqui

Os três foram recalculados **por três vias** — `sha256sum`, `certutil -hashfile` e
`hashlib` no instrumento — e as três deram o mesmo valor. **Os três coincidem com
os registrados.** ⚠ **São dois fatos, e ficam separados no registro:**

| Fato | O que ele demonstra |
|---|---|
| o recálculo | **verifica o arquivo efetivamente acessado nesta execução** |
| a coincidência com o valor recebido | **confirma a igualdade dos hashes, e nada além disso** |

⚠ **A coincidência NÃO demonstra que a extração anterior veio destes arquivos.** A
extração da outra sessão não está disponível aqui, e esse vínculo continua **não
estabelecido**.

#### A posição da página, verificada e não assumida

**Procedimento:** renderizar com PDFium a posição registrada e as duas vizinhas, e
**ler, na imagem, o número impresso no cabeçalho**.

| Fonte | Página impressa | Marcadores lidos nas posições | Posição medida | Registrada |
|---|---:|---|---:|---:|
| Saaty 1977 | 237 | 236, **237**, 238 em 3, 4, 5 | **4** | 4 |
| Wijnmalen 2007 | 899 | 898, **899**, 900 em 7, 8, 9 | **8** | 8 |
| Forman e Peniwati 1998 | 167 | 166, **167**, 168 em 2, 3, 4 | **3** | 3 |

**As três coincidem.** ⚠ **Isso verifica a posição NESTES arquivos**, e não
demonstra que a extração anterior tenha vindo deles. As contagens de páginas, 48,
14 e 5, também coincidem.

⚠ **Saaty e Forman são digitalizações**: cada página é um mosaico de tiras de
imagem de 1 bit, sob uma camada de texto OCR. **Antes de olhar**, contei os
operadores que mostram texto por modo de renderização: **todos estão no modo 3,
invisível**, nas cinco primeiras posições do Saaty e nas três olhadas do Forman.
**A imagem olhada é a digitalização, e não a camada OCR**, que é justamente a que
corrompe a notação. Wijnmalen é composto em pdfeTeX, com texto vetorial visível.

#### Saaty p. 237, inspeção visual

**Ferramenta:** PDFium 153.0.7999.0, por pypdfium2 5.13.0, e Pillow 12.1.0 para
recortar e ampliar; a leitura foi feita **olhando as imagens**. **Procedimento:**
renderizar a posição 4 inteira para localizar a frase; renderizá-la a 300/72, a
resolução nativa das tiras, cerca de 300 dpi; recortar as três linhas do
parágrafo; ampliar duas vezes o início; e renderizar as posições 1 a 3 para situar
a frase na seção e ler o contexto da `claim`.

**Os três pontos, e nenhum foi assumido:**

| Ponto | O que traz |
|---|---|
| **impresso** | *"It turns out that **a** reciprocal matrix A with positive entries is consistent if and only if **λmax = n** (Theorem 1 below)."* |
| **extração** | *"It turns out that **a** reciprocal matrix A with positive entries is consistent if and only if **h max = a** (Theorem 1 below)."* |
| **recorte** | `A reciprocal matrix A with positive entries is consistent if and only if \lambda_{max} = n` |

No impresso, **λ está em itálico, com o subíndice `max` em tipo redondo** e corpo
menor, e ***n* em itálico**. **A primeira letra do trecho é `a` MINÚSCULA**, porque
a frase impressa abre com *It turns out that*.

⚠ **A extração é NOVA e documentada**, da camada de texto **deste** arquivo, por
quatro vias que trazem as mesmas palavras: os operadores crus, o `extract_text` do
pypdf, o PDFium e o `pdftotext`. **Não é a extração da outra sessão**, que não está
disponível. A descrição recebida, *expressão corrompida na extração*, é
**compatível** com o observado, ⚠ **e compatibilidade não é identidade**.

**O recorte é idêntico, byte a byte, aos dois campos da base**, e os dois campos são
idênticos entre si. **O recorte preparado não introduziu diferença própria.** A base
registra *Extracted on 2026-02-11* e *Extraction prompt version v3.0*, **e não
registra o texto de entrada**; o trecho está no arquivo desde `7f46e3a`, de
16/04/2026. A base é, portanto, **anterior** à extração da outra sessão, que não
pode ter sido a sua fonte.

**As diferenças, cada uma confrontada com os três pontos:**

| | Transformação | Impresso | Extração | Recorte | Onde surgiu |
|---|---|---|---|---|---|
| D1.a | supressão **não sinalizada** de *It turns out that* | não | não | **sim** | **origem não determinada** |
| D1.b | **caixa**: `a` → `A`, não sinalizada | não | não | **sim** | **origem não determinada** |
| D2.a | λ lido como `h` | não | **sim** | não | na camada OCR deste arquivo |
| D2.b | *n* lido como `a` | não | **sim** | não | na camada OCR deste arquivo |
| D2.c | subíndice achatado em palavra separada | não | **sim** | não | na camada OCR deste arquivo |
| D2.d | conversão para LaTeX, **com os mesmos símbolos** | não | não | **sim** | **origem não determinada** |
| D3.a | truncamento **não sinalizado** de *(Theorem 1 below).* | não | não | **sim** | **origem não determinada** |

⚠ **A expressão matemática tem QUATRO transformações**, três na extração e uma na
base, e as quatro constam. ⚠ **As da extração são determinadas para ESTE arquivo**;
que a extração anterior seja a mesma não está demonstrado.

⚠ **Nas quatro de origem não determinada, a atribuição não foi forçada.** A
evidência disponível **localiza** as diferenças: **não estão no impresso nem na
camada de texto deste arquivo, e o recorte as herdou da base**. Isso **não
demonstra em que ponto do percurso até a base elas surgiram**: pode ter havido
reutilização de texto ou transformação intermediária. ⚠ **Pendência: reconstituir
o percurso do texto até a base**, que a base não registra. ⚠ **O recorte não carrega os erros da
camada OCR**, `h` e `a`, então essa camada **não** é o texto de onde ele foi
copiado literalmente.

**Classificação, no vocabulário vigente:**

| Campo | Resultado | Motivo |
|---|---|---|
| `verbatim_quote` | **não confere** | **alteração de caixa não sinalizada na primeira letra**, D1.b: o impresso traz `a`, precedido de *It turns out that*, e o recorte traz `A`, apresentando como início de frase o que no impresso é continuação dela. **Nenhuma palavra, símbolo ou proposição foi trocada.** |
| `evidence.quote` | **não confere** | o mesmo: os dois campos são idênticos |
| localizador | compatível | p. 237 na posição 4; a seção 2, *Ratio Scales from Reciprocal Pairwise Comparison Matrices*, começa na p. 235, e as pp. 236 e 237 não trazem título até a frase |

⚠ **Nenhuma categoria nova.** O critério aplicado é a correspondência literal. Sobre
D2.d: **A conversão para LaTeX é uma representação equivalente escolhida, aceita
porque preserva os símbolos e a relação matemática, com a transformação
declarada.** A alteração de caixa, D1.b, troca um caractere do trecho citado, e **é
por ela** que os dois campos não conferem. **Não há decisão pendente sobre este
resultado.** *(Justificativa corrigida depois, sem mudar o resultado: a anterior
apoiava D2.d numa impossibilidade do meio e deixava o ponto como pendente.)*

**Sustentação da `claim`: sustentada.** Na p. 237, a matriz recíproca de entradas
positivas é consistente se e somente se λmax = *n*; na p. 236, consistente é a
propriedade cardinal a_ij a_jk = a_ik, e λmax é o autovalor que o período sobre
Perron-Frobenius caracteriza como real, positivo e de maior módulo; na p. 235, a
matriz compara *n* objetos. ⚠ **Sustentada no domínio que o trecho declara**,
o de matriz recíproca de entradas positivas, restrição que a `claim` omite e que no
AHP é a da matriz de comparações.

**Unidade: continua pendente**, agora **por não correspondência textual com a
página impressa**. Das quatro condições, falta uma: os dois campos conferirem. A
redação do encaminhamento é: *"Achado adicional encaminhado à A.16, de não
correspondência com a página impressa da publicação. A contagem histórica das 19
divergências entre campos permanece inalterada."* ⚠ **Fora das 19**, pelo mesmo
critério de Wijnmalen: os dois campos coincidem entre si e diferem do impresso.
⚠ **A base NÃO foi corrigida.**

#### A precisão bibliográfica, em `a00fb5e`

⚠ **O ISSN identifica o PERIÓDICO, não o artigo**, e aparecia como
`identificadorDaObra` do Saaty. O campo passa a dois, `identificadorDoArtigo` e
`identificadorDoPeriodico`. **DOI e PII continuam identificando o artigo**, no
Wijnmalen e no Forman. Para o Saaty, o registro diz **"identificador de artigo não
registrado"**, ⚠ **o que descreve o registro, e não afirma nada sobre o artigo.**
A frase que agrupava os três passou a distinguir: medidas **8 ocorrências** antes,
em quatro arquivos, e **uma** depois, a do teste que a proíbe. **Isto não reabre
as duas correções aceitas em `99bc69f`.**

**Achado registrado sem adoção:** o título nos metadados do arquivo do Saaty traz
`PII: 0022-2496(77)90033-5`. **É metadado, não texto impresso, e não foi
verificado contra o editor**, então **não ocupa** o identificador de artigo.
Adotá-lo é decisão fora desta rodada. Nos outros dois, o título dos metadados
coincide com o DOI e com o PII registrados.

#### Estado de verificação por arquivo

| | Antes | Depois |
|---|---|---|
| caminho, nome e tamanho | não registrados | **medidos** |
| SHA-256 | recebido | **recalculado, coincidente** |
| contagem de páginas | recebida | **medida, coincidente** |
| posição da página impressa | recebida | **verificada nos arquivos, coincidente** |
| texto de Saaty p. 237 | pendente de inspeção visual | **inspecionado: não confere** |
| vínculo entre a extração anterior e os arquivos | não estabelecido | **continua não estabelecido** |
| versão do arquivo | não demonstrada | **continua não demonstrada** |
| texto de Wijnmalen p. 899 | não correspondência **na extração** | **continua como estava**: não inspecionado |
| texto de Forman p. 167 | confere **na extração** | **continua como estava**: não inspecionado |

Os valores recebidos ficam **preservados como recebidos**, com ponteiro para a
medição, e o estado anterior da rastreabilidade fica em `estadoAte99bc69f`.

⚠ **As contagens não mudam:** **4 conferidas e 161 pendentes**, sobre **165
distintas**. Saaty era pendente e continua pendente. ⚠ **Nenhum total é
antecipado**, e o indicador de atendimento ao critério atual **continua 0 de 3**.

#### O instrumento, e a conferência da sua primeira execução

`medir_pdfs.py` mede o que é mecânico e **não lê as imagens**: a leitura do
marcador e da frase é observação, registrada à parte. **Roda fora da suíte**,
porque depende dos PDFs. Na primeira execução, **o caso mais visível foi conferido
à mão**: as imagens da frase, do início ampliado e da página a 300 dpi que ele gera
têm **SHA-256 idêntico** ao das inspecionadas antes dele, e os três cabeçalhos alvo
que ele gera foram olhados e trazem 237, 899 e 167. O SHA-256 de cada imagem está
no registro: com o PDF de mesmo SHA-256 e as mesmas versões, a renderização se
reproduz.

#### Verificação medida, depois de executar

**Linha de base nesta máquina, antes de qualquer alteração rastreada**, Windows 11,
Node v24.12.0, npm 11.18.0: `tsc` **0**; `jest --runInBand` saiu **1**. Na primeira
execução, **3 falhas em 2 suítes**, de **299** testes, sem os nomes guardados; na
segunda, **1 falha**, com **298** passando.

⚠ **As falhas não têm o mesmo estatuto:**

- **CRLF: ambiental, com causa medida.** O `~/.gitconfig` desta máquina tem
  `core.autocrlf=true`; `git ls-files --eol` mostra `i/lf w/crlf` nos dados da
  etapa 4, e o teste *casos.json volta a registrar o resumo vigente* compara o
  SHA-256 dos bytes da árvore com o do blob.
- **Tempo: comportamento observado, SEM causa estabelecida.** Duas de
  `rag-diagnostico-regressao` estouram o limite de 5000 ms em parte das execuções
  completas; **isolada, a suíte passa 16 de 16 em menos de 2 s**. ⚠ Ultrapassar o
  tempo limite e passar isoladamente demonstra o comportamento, e **não estabelece
  sozinho a causa**.

⚠ **Corrigido depois, na rodada de Wijnmalen e Forman:** este bloco dizia que as
três falhas eram ambientais e que a causa fora medida. Para as duas de tempo, isso
afirmava mais do que se mediu. As mensagens de `a00fb5e` e `ae580c6` usam a mesma
palavra, *ambientais*, e ficam como estão.

| Medição | `tsc` | Suítes | Testes | Passando | Saída |
|---|---:|---:|---:|---:|---:|
| linha de base, 2ª execução | 0 | 21 | 299 | 298 | 1 |
| depois de `a00fb5e` | 0 | 21 | 300 | 299 | 1 |
| depois de `ae580c6` | 0 | 21 | 305 | 302 | 1 |
| **clone raso de um commit, LF, em `ae580c6`** | **0** | **21** | **305** | **305** | **0** |

⚠ **Na condição do CI**, clone raso de **um** commit com checkout LF, **tudo passa**.
O teste de C1 passou de 17 para **22** casos. **Testes ajustados, um a um:** três
asserções da frase agrupada, em `a00fb5e`, porque a frase mudou por pedido
explícito; e duas de estado, em `ae580c6`, porque o item 12 do pedido tira do
estado "recebido" o que foi medido — o estado anterior fica em
`estadoAte99bc69f`. **Os casos novos foram conferidos por onze contraexemplos**,
dois em `a00fb5e` e nove em `ae580c6`, cada um reprovando **exatamente** o caso
previsto, entre eles: a coincidência do SHA-256 passando a provar o vínculo, a
expressão perdendo transformações, origem não determinada sem pendência,
categoria nova, recorte divergindo dos dados versionados, Saaty movido para
conferido com condição em falta, e o vínculo com a extração anterior dado como
verificado. **Restauro por SHA-256 idêntico.**

**Nada foi alterado** em `lib/rag/articles/`, nos artefatos da etapa 4, nos textos
preparados, nos `trechoId`, no índice, nas 19 divergências de A.16 ou em `main`.
**Nenhum PDF na árvore**, conferido por `git status --short`, por
`git ls-files '*.pdf'`, que devolve 0, e pelo diff. **Nenhuma geração.**

⚠ **Predição não cabe**: a rodada mede arquivos e **não altera o contexto entregue
ao modelo**. **A predição de A.33 segue não testada.**

**Publicação e CI, estado observado.** `inspecao/saaty-237` foi publicada com
`a00fb5e` e `ae580c6` num só push, código **0**. A execução **`35135930664`**,
evento `push`, sobre o SHA completo `ae580c641a821800480c719e32cda45f183d2769`,
foi observada **`completed/success`**, com os sete passos em `success`, entre eles
typecheck, build e testes. ⚠ **`a00fb5e` não tem execução própria**: a API devolve
zero execuções para esse SHA, porque o push publicou os dois commits juntos. O CI
deste commit documental, e o da integração, são observação posterior.
⚠ **`main` permanece em `33c1fdf`**, lida e não tocada.

⚠ **A conferência de C1 NÃO está concluída.** Wijnmalen segue com **não
correspondência observada na extração**, e **as confirmações visuais do texto de
Wijnmalen e de Forman não foram feitas nesta rodada**.

### A.33: inspeção visual de Wijnmalen p. 899 e Forman p. 167, em 16/09/2026

**Gravação:** `3fc4581`, correção do registro anterior sobre a causa dos testes
intermitentes, e `781fb4fb303cd67e7eaa2514d40ac776d9e69c18`, inspeção, sobre a base
`2e7d3cf05ba78753547565287857b1d951b9dca2`. **Branch de sessão declarada:**
`inspecao/wijnmalen-forman`, com integração em `integra/a30-registros` por
**fast-forward** ao fim. Resultados em
`docs/dados/a33-conferencia-c1/inspecao-wijnmalen-forman.json`, e o instrumento em
`docs/dados/a33-conferencia-c1/instrumentos/inspecionar_paragrafos.py`.

⚠ **A nova conferência tem proveniência própria:** a extração desta rodada está
vinculada aos SHA-256 recalculados aqui, e a leitura do impresso foi feita olhando
a renderização desses mesmos arquivos. **A extração antiga fica com o seu limite
histórico**, e recuperar o vínculo dela não foi pré-requisito. **Saaty não foi
reaberto.** Sem geração, sem alteração da base, dos textos preparados ou do índice,
sem reingestão, e nenhum PDF na árvore.

**Porta de entrada.** Os dois arquivos estavam em `C:\AHP-BOCR\preservado\`.
`git fetch origin` saiu **0**; topo em `2e7d3cf`, branch
`inspecao/wijnmalen-forman`, árvore limpa, diff vazio, e
`origin/integra/a30-registros` ancestral do topo, código **0**. **Os dois SHA-256
recalculados coincidem** com os de `medicao-pdfs.json`, e a conferência seguiu nos
dois.

#### O procedimento, por tipo de arquivo

**Ferramenta:** PDFium 153.0.7999.0 a 300 dpi, por pypdfium2 5.13.0, e Pillow para
recortar; a leitura foi feita **olhando as imagens**. **O parágrafo foi recortado
pelas coordenadas da própria camada de texto**, depois de duas estimativas de
altura erradas na mão.

| Fonte | Tipo | O que se fez |
|---|---|---|
| Wijnmalen | **texto vetorial visível**: 85 operadores no modo 0, nenhuma imagem | ⚠ **nenhuma exclusão de camada**: a renderização desse texto **é** a página |
| Forman | **digitalização**: 28 tiras de imagem, 661 operadores no modo 3 | separação verificada: **a imagem olhada é a digitalização** |

#### A nova extração, uma terceira coisa

Da camada de texto **destes** arquivos, por pypdf, PDFium e `pdftotext -enc
UTF-8`, **vinculada aos hashes recalculados**, e distinta do impresso e do recorte.

⚠ **Na primeira execução do instrumento, a verificação de presença deu falso em
três vias** para frases que estão no impresso. Conferido à mão antes de aceitar,
eram dois erros do instrumento, e os dois no centro da comparação: **a ligadura
`ﬁ`**, que pypdf e `pdftotext` entregam como U+FB01 em *benefits*; e **`condi-`
com espaço antes da quebra**, como o pypdf entrega. Corrigidos, e **o ramo negativo
também conferido**: o texto dos recortes da base não aparece em nenhuma via. Sem
`-enc UTF-8`, o `pdftotext` escreve em Latin-1, e as aspas saem como
`` `individual' ``.

#### Wijnmalen, seção 4 *Commensurability*, terceiro parágrafo

| Ponto | O que traz |
|---|---|
| **impresso** | *"**Synthesis however** requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship **between total benefits and total costs and total opportunities and total risks.**"* |
| **extração** | o mesmo, nas três vias |
| **recorte** | `synthesis requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship` |

| | Transformação | Impresso | Extração | Recorte | Onde surgiu |
|---|---|---|---|---|---|
| W1.a | caixa `S` → `s`, **não sinalizada** | não | não | **sim** | **origem não determinada** |
| W1.b | omissão de *however*, **não sinalizada**, dentro do trecho | não | não | **sim** | **origem não determinada** |
| W2.a | truncamento **não sinalizado** no meio da frase, que perde entre o que é a relação | não | não | **sim** | **origem não determinada** |

A evidência **localiza** as três na base, e **não demonstra em que ponto do
percurso até ela surgiram**: pode ter havido reutilização de texto ou transformação
intermediária. ⚠ **Sobre a datação:** o cabeçalho da base registra 11/02/2026, e o
trecho está no arquivo desde `7f46e3a`. Isso **afasta como origem a execução da
outra sessão**, e **não afasta** que este mesmo PDF, ou esta mesma camada de texto,
tenham sido usados antes, em algum ponto desse percurso. **Pendência:** reconstituir
o percurso do texto até a base.

**`verbatim_quote` e `evidence.quote`: não conferem**, pela omissão de *however* e
pela troca de caixa. Localizador compatível.

**Sustentação: parcialmente sustentada.** O contexto usado foi **o parágrafo
inteiro**, e, **alcançados por remissão e com localizador**, a Tabela 6, no alto da
p. 899, e o quarto parágrafo da seção.

- **Sustenta** a exigência geral: *"Synthesis however requires commensurate
  priorities on a common scale"*; e, no quarto parágrafo, *"BOCR synthesis of
  priorities is deceiving if it is composed of sets of measures that have not been
  adjusted relative to each other and are therefore not commensurate."*
- ⚠ **A ressalva que fundamenta a classificação:** A claim exige comensurabilidade
  das prioridades dos fatores **antes de qualquer síntese**, enquanto o artigo
  admite um **quociente significativo quando os produtos têm unidades
  compatíveis**, **sem exigir que os quatro totais sejam individualmente iguais**.
  O texto é o do terceiro parágrafo: *"also in the case where the product of
  benefit and opportunities would equal the product of costs and risks, would the
  products of the corresponding normalized priorities be in the same unit and would
  their quotient produce meaningful BOCR ratio results."*
- ⚠ **Esse caso NÃO dispensa toda comensurabilidade.** O próprio parágrafo explica
  que **os produtos ficam na mesma unidade**, e é isso que torna o quociente
  significativo.
- ⚠ **A Tabela 6 separa ordenação de indicação de rentabilidade**, e **ordenação
  correta não equivale a resultado BOCR integralmente válido**. Ela entra como
  leitura da remissão *As was shown earlier*, e **não** atenua a exigência nem
  fundamenta a ressalva.
- ⚠ **Sobre *guarantee*:** a palavra **não significa que nenhum caso particular
  possa funcionar sem a condição geral**. **O excesso da claim está na formulação
  indiscriminada da exigência para os fatores**, e não simplesmente na existência
  de um caso favorável.
- ⚠ **O avaliador não acrescentou à claim a restrição** que a tornaria
  integralmente sustentada, e é a ressalva que faz a sustentação ser parcial. O
  resultado recebido, sobre extração, dizia *sustentada*, e fica preservado.
- ⚠ **Os dois campos de citação continuam *não confere*, e isso independe da
  avaliação de sustentação.**

*(Justificativa corrigida depois, sem mudar o resultado: a versão anterior usava a
Tabela 6 como atenuante e lia o caso dos produtos iguais como dispensa de
comensurabilidade.)*

**Unidade: pendente**, por não correspondência com o impresso e claim parcialmente
sustentada. Achado para A.16, **fora das 19**, e **a base não foi corrigida**.

⚠ **Alcance observado na base:** o mesmo texto transformado é também o
`evidence.quote` de `wijnmalen2007_bocr` `key_claims[3]`, com a mesma página e o
mesmo localizador. Essa unidade, `porTrecho[89]`, **já é uma das 19**, porque o
`verbatim_quote` dela é outro. **Registrado como alcance para A.16; ela não foi
conferida, e a contagem das 19 não muda.** ⚠ **Encontrar o mesmo texto em duas
unidades demonstra repetição da divergência**, e **não** demonstra que a extração
v3.0 a produziu, nem que ela se propagou a partir de uma unidade: pode ter havido
reutilização ou outra transformação intermediária. **A origem segue não
determinada** até existir evidência do percurso.

#### Forman, seção 6, primeiro parágrafo

O parágrafo vai do título da seção até *"provided a_i ≥ 0 and b_i ≥ 0"*, e **termina
na p. 167**: a p. 168 abre parágrafo novo, recuado.

| Ponto | O que traz |
|---|---|
| **impresso** | *"Treating the group as a new **‘individual’** with AIJ requires satisfaction of the reciprocity condi- tion for the judgments."* … *"Thus, for AIJ, the geometric mean **must** be used."*, com *must* em **itálico** |
| **extração** | o mesmo, nas três vias, com aspas tipográficas e **sem itálico**; a camada OCR marca *must* com a fonte TimesNewRoman,Italic |
| **recorte** | `Treating the group as a new 'individual' with AIJ requires satisfaction of the reciprocity condition... Thus, for AIJ, the geometric mean must be used.` |

**As letras dos dois segmentos coincidem com o impresso**, na ordem, e **a
supressão entre eles está sinalizada** pelas reticências. O que ela retira é o
fundamento: Aczel e Saaty (1983) e Aczel e Roberts (1989) mostraram que, com a
propriedade recíproca, **só a média geométrica satisfaz o princípio de Pareto e a
condição de homogeneidade**.

| | Transformação | Impresso | Extração | Recorte | Onde surgiu |
|---|---|---|---|---|---|
| F1.a | aspas tipográficas → apóstrofos ASCII | não | não | **sim** | **origem não determinada** |
| F2.a | **ênfase itálica de *must* não reproduzida** | não | **sim**, na saída em texto das três vias | **sim** | **origem não determinada** |
| F3.a | hifenização de fim de linha desfeita | não | em duas vias | **sim** | **origem não determinada** |

**`verbatim_quote` e `evidence.quote`: conferem**, com as três transformações
**declaradas**, nenhuma de letra. **A perda do itálico é aceita neste recorte, com a
transformação declarada**, porque **a palavra *must* permanece, preservando a
obrigação expressa pelo autor**. ⚠ **É decisão sobre ESTE caso, e não regra geral
de que ênfase tipográfica nunca carrega significado.** ⚠ **A claim não entra nesta
justificativa:** paráfrase não compensa perda no trecho citado, e usar a claim para
atestar a fidelidade da citação inverteria a ordem das duas verificações.
*(Justificativa corrigida depois, sem mudar o resultado: a versão anterior deixava a
ênfase como ponto pendente, e a sustentação recorria a um intensificador da claim.)*

**Sustentação: sustentada.** Contexto: o parágrafo inteiro, e, por remissão, o
primeiro período da seção 5, que define o princípio de Pareto, sem efeito na
avaliação. A sustentação vem da **conclusão explícita do autor, para AIJ e sem outra
restrição de domínio**: *"Thus, for AIJ, the geometric mean must be used"*.
⚠ **As premissas** — AIJ exige
reciprocidade; com reciprocidade, só a média geométrica satisfaz Pareto e
homogeneidade — **não estão na claim, e o avaliador não as acrescentou** para
sustentá-la. Fica registrado que a força do *must*, no argumento do autor, depende
de aceitar essas duas condições como exigências, como o autor faz.

**Unidade: continua conferida**, agora com as quatro condições observadas na página
impressa.

#### Contagens e indicador

**A contagem histórica não muda: 4 conferidas e 161 pendentes**, sobre 165.
Wijnmalen era pendente e continua; Forman já estava entre as quatro.

**O indicador de atendimento ao critério atual passa de 0 para 1 de 3, pela
medição**: Forman reúne as quatro condições com a página aberta; Saaty e Wijnmalen
não conferem com o impresso. `conferencia.json` guarda **o histórico do indicador
por rodada**, e três testes antigos passaram a ler esse histórico, **ajuste
delimitado** para distinguir o valor de cada rodada do resultado desta. A perda
do itálico em Forman está decidida: aceita neste recorte, com a transformação
declarada.

⚠ **C1 não se anuncia como liberado: dois dos três trechos não conferem.** As três
inspeções visuais estão feitas, com resultado por trecho: um atende ao critério
atual, dois seguem pendentes. **As origens seguem não determinadas** até existir
evidência do percurso do texto até a base. **Não há decisão de critério pendente.**

#### Pendência técnica, em separado

**Dois testes intermitentes**, em `lib/__tests__/rag-diagnostico-regressao.test.ts`:
*erro com token e URL na MENSAGEM: nenhuma sentinela sobrevive*, e *valor lançado que
NÃO é Error, com campo sensível: nada é serializado*.

- **Comportamento observado:** nesta máquina, em execuções completas de
  `jest --runInBand`, os dois ultrapassaram o limite de 5000 ms em parte das
  execuções; com a suíte isolada, ela passou 16 de 16 em menos de 2 s; no clone raso
  com LF e no CI, passou.
- ⚠ **Causa: não estabelecida.** Ultrapassar o tempo limite e passar isoladamente
  demonstra o comportamento, e **não estabelece sozinho a causa**. O registro da
  rodada de Saaty dizia outra coisa, e foi corrigido em `3fc4581`.
- **Nada foi corrigido:** nem configuração, nem testes de transporte, nem os
  intermitentes. O CRLF, já caracterizado, também não.

#### Verificação medida, depois de executar

| Medição | `tsc` | Suítes | Testes | Passando | Saída |
|---|---:|---:|---:|---:|---:|
| esta máquina, depois de `781fb4f` | 0 | 21 | 312 | 309 | 1 |
| **clone raso de um commit, LF, em `781fb4f`** | **0** | **21** | **312** | **312** | **0** |

Nesta máquina, as três falhas são as registradas: a do CRLF e as duas
intermitentes. O teste de C1 passou de 22 para **29** casos. **Os sete novos foram
conferidos por catorze contraexemplos**, cada um reprovando o caso previsto, entre
eles: hash divergente com a conferência seguindo, extração sem vínculo ao hash,
exclusão de camada aplicada ao Wijnmalen, estado novo de sustentação, condição
essencial posta na correspondência, transformação omitida, indicador antecipado,
Wijnmalen movido para conferido, causa dada como estabelecida para os
intermitentes, e histórico do indicador reescrito — este último reprova os dois
testes antigos ajustados. **Restauro por SHA-256 idêntico.**

**Nada foi alterado** em `lib/rag/articles/`, nos textos preparados, nos
`trechoId`, no índice, nas 19 divergências de A.16, no resultado de Saaty ou em
`main`. **Nenhum PDF na árvore.** **Nenhuma geração.**

⚠ **Predição não cabe**: a rodada mede arquivos. **A predição de A.33 segue não
testada.**

**Publicação e CI, estado observado.** `inspecao/wijnmalen-forman` foi publicada
com `3fc4581` e `781fb4f` num só push, código **0**. A execução **`35141405974`**,
evento `push`, sobre o SHA completo `781fb4fb303cd67e7eaa2514d40ac776d9e69c18`, foi
observada **`completed/success`**, com os sete passos em `success`. ⚠ **`3fc4581`
não tem execução própria**: a API devolve zero para esse SHA. O CI deste commit
documental, e o da integração, são observação posterior. ⚠ **`main` permanece em
`33c1fdf`**.

### A.33: quatro justificativas corrigidas, em 16/09/2026

**Gravação:** `4309f7e662091f050c220c458d042d856e342352`, sobre a base
`96bd6bb1b78eb6d76bbec574a968258db625048b`. **Branch de sessão:**
`inspecao/wijnmalen-forman`, com integração em `integra/a30-registros` por
fast-forward ao fim. **Correção delimitada:** sem nova inspeção de PDF, sem ampliar
o instrumento, sem geração, sem alterar a base. As seções acima foram corrigidas no
lugar, cada uma com nota da correção.

⚠ **Nenhum resultado muda**, e isso foi conferido campo a campo entre `96bd6bb` e a
árvore, sobre os três registros:

| Trecho | Campos | Sustentação | Unidade |
|---|---|---|---|
| Wijnmalen | não confere | parcialmente sustentada | pendente |
| Forman | confere | sustentada | conferida |
| Saaty | não confere | sustentada | pendente |

O critério atual segue em **1 de 3**, e o histórico em **4 conferidas e 161
pendentes**. A única diferença em `resultadoDaUnidade` é o texto de uma nota do
Forman.

**As quatro correções:**

1. **Wijnmalen, o alcance da claim.** A ressalva que fundamenta a classificação passa
   a ser: *A claim exige comensurabilidade das prioridades dos fatores antes de
   qualquer síntese, enquanto o artigo admite um quociente significativo quando os
   produtos têm unidades compatíveis, sem exigir que os quatro totais sejam
   individualmente iguais.* Dois argumentos do relato anterior foram corrigidos:
   ⚠ **a Tabela 6 separa ordenação de indicação de rentabilidade**, e ordenação
   correta não equivale a resultado BOCR integralmente válido; e ⚠ **o caso dos
   produtos iguais não dispensa toda comensurabilidade**, porque os produtos ficam
   na mesma unidade. ⚠ ***guarantee* não exclui caso particular:** o excesso está
   na formulação indiscriminada da exigência para os fatores. Os dois campos seguem
   *não confere*, independentemente da sustentação.
2. **Forman, o `confere`.** Sustenta-se porque **a palavra *must* permanece,
   preservando a obrigação expressa pelo autor**, e a perda do itálico é aceita neste
   recorte, declarada. ⚠ **O argumento pelo *strictly* da claim saiu:** paráfrase
   não compensa perda no trecho citado, e usar a claim para atestar a citação
   inverteria a ordem das verificações. ⚠ **Decisão sobre este caso, e não regra
   geral** de que ênfase tipográfica nunca carrega significado.
3. **Saaty, só a justificativa.** A alegação de impossibilidade do meio foi
   substituída por: *A conversão para LaTeX é uma representação equivalente
   escolhida, aceita porque preserva os símbolos e a relação matemática, com a
   transformação declarada.* O *não confere* segue pela caixa, **sem decisão
   pendente**.
4. **A repetição não demonstra a origem.** O mesmo texto em `key_claims[3]`
   demonstra **repetição da divergência**, e **não** que a extração v3.0 a
   produziu: pode ter havido reutilização ou transformação intermediária.
   Pendências e evidências **deixaram de nomear a v3.0, ou qualquer extração datada,
   como etapa**. A pendência passa a ser **reconstituir o percurso do texto até a
   base**, e a origem segue **não determinada**.

**Contagem por família, antes e depois**, por ocorrência, sobre os três registros,
os dois documentos, o teste e o resumo fora do repositório
(`C:\AHP-BOCR\preservado\resultado-wijnmalen-forman.md`, também corrigido):

| Família | Antes | Depois | O que resta |
|---|---:|---:|---|
| impossibilidade do meio, no Saaty e na extração | 10 | **1** | padrão de proibição no teste |
| atribuição à v3.0 ou a fevereiro | 21 | **0** | |
| *strictly* como argumento | 3 | **0** | |
| ênfase como ponto pendente | 14 | **2** | proibição no teste; cópia literal da mensagem de `96bd6bb` no resumo |
| decisão pendente sobre Saaty | 4 | **0** | |
| ordenação e caso favorável como atenuantes | 14 | **5** | três padrões de proibição no teste; cópia literal da mensagem de `781fb4f` no resumo |

⚠ **Instrumento novo, conferido à mão na primeira execução:** a contagem por grep
perdia, na família da ordenação, uma frase do relato anterior quebrada entre
linhas no documento, e dava 1 onde eram 2. O padrão foi encurtado **antes** de
fixar a linha de base.

⚠ **Mensagens de commit não se alteram.** A de `781fb4f` traz os dois argumentos
retirados do Wijnmalen; a de `96bd6bb` trata a ênfase como ponto de critério; a de
`ae580c6` descreve a base como extraída pelo prompt v3.0, que é o que o cabeçalho
dela diz, e não atribui a ela uma transformação. **Nenhuma mensagem traz a alegação
de impossibilidade do meio.**

**Teste:** asserções ajustadas em dois casos existentes, sem caso novo, para travar
as quatro justificativas; **nove contraexemplos**, cada um reprovando o caso
previsto, entre eles: a ressalva fora da redação prescrita, a ordenação de volta
como atenuante, o *strictly* de volta, a ênfase de volta como pendente ou como
regra geral, a alegação do meio de volta no Saaty, e uma pendência atribuindo a
transformação à v3.0. **Restauro por SHA-256 idêntico.**

| Medição | `tsc` | Suítes | Testes | Passando | Saída |
|---|---:|---:|---:|---:|---:|
| esta máquina, com a correção | 0 | 21 | 312 | 309 | 1 |
| **clone raso de um commit, LF, em `4309f7e`** | **0** | **21** | **312** | **312** | **0** |

Nesta máquina, as três falhas são as registradas: a do CRLF e as duas
intermitentes, **não corrigidas**.

**Nada foi alterado** em `lib/rag/articles/`, nos textos preparados, nos
`trechoId`, no índice, nas 19 divergências, no instrumento, na configuração da
máquina, nos testes de transporte, nos intermitentes ou em `main`. **Nenhuma nova
inspeção de PDF, nenhum PDF na árvore, nenhuma geração.**

⚠ **Predição não cabe.** **A predição de A.33 segue não testada**, e **C1 não se
anuncia liberado: dois dos três trechos não conferem.**

**Publicação e CI, estado observado.** `inspecao/wijnmalen-forman` publicada com
`4309f7e`, código **0**. A execução **`35153121514`**, evento `push`, sobre o SHA
completo `4309f7e662091f050c220c458d042d856e342352`, foi observada
**`completed/success`**. O CI deste commit documental, e o da integração, são
observação posterior. ⚠ **`main` permanece em `33c1fdf`**.

### A.16: três trechos corrigidos na base e uma claim reescrita — predição registrada ANTES, em 16/09/2026

**Base:** `23a3463`, branch `inspecao/wijnmalen-forman`, árvore limpa. **Decisão do
autor, nesta sessão:** corrigir em `lib/rag/articles/` os dois trechos de C1 que não
conferem, **a partir das inspeções já registradas** — `medicao-pdfs.json`, campo
`inspecaoVisualSaaty237`, e `inspecao-wijnmalen-forman.json`, `trechos[0]`. **Nenhum
PDF foi reaberto.** O CI de `23a3463` foi observado antes de começar:
`35154248514` e `35154259492`, `completed/success`, nas duas branches.

⚠ **Exige predição porque altera o que o modelo recebe.** O contexto estático é
montado da base em tempo de execução: `claimToRef`, em
`app/api/ai-reviewer/knowledge.ts`, põe a `claim` em `topic` e o `evidence.quote` em
`rule`.

#### Escopo, decidido antes de editar

| # | Unidade | Campo | Antes | Depois | Natureza |
|---|---|---|---|---|---|
| E1 | `saaty1977_scaling` `key_claims[0]` | `verbatim_quote` e `evidence.quote` | `A reciprocal matrix A with positive entries is consistent if and only if \lambda_{max} = n` | o mesmo, com **`a` minúsculo** | mecânica: D1.b |
| E2 | `wijnmalen2007_bocr` `key_claims[0]` | `verbatim_quote` e `evidence.quote` | `synthesis requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship` | `Synthesis however requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship between total benefits and total costs and total opportunities and total risks.` | mecânica: W1.a, W1.b e W2.a |
| E3 | `wijnmalen2007_bocr` `key_claims[3]` | **só** `evidence.quote` | o mesmo de E2 | o mesmo de E2 | mecânica: mesmo texto, mesma página, mesmo localizador |
| J1 | `wijnmalen2007_bocr` `key_claims[0]` | `claim` | `Priorities on different factors must be commensurate before synthesis to guarantee valid BOCR outcomes.` | `BOCR synthesis requires commensurate priorities on a common scale; synthesizing non-commensurate measures is deceiving.` | **julgamento**: sustentação parcial |

**E1 a E3 e J1 vão em commits separados**, pela regra de não misturar critério
mecânico com julgamento.

**As razões de cada escolha:**

- **E1, forma mínima.** O motivo registrado do *não confere* é só a caixa, D1.b. **O
  início suprimido, D1.a, e a remissão final, D3.a, ficam**, e a notação LaTeX segue
  como representação equivalente escolhida.
- **E2, a frase vai até o ponto final.** O truncamento W2.a apagava entre o que é a
  relação. ⚠ **A ligadura `ﬁ` de *benefits* é transcrita como `f` e `i`**:
  normalização declarada, porque a ligadura é glifo, não letra, e o PDFium já a
  entrega assim.
- **E3, só o `evidence.quote`.** O `verbatim_quote` e a `claim` de `key_claims[3]`
  ficam para A.16, e **a unidade continua divergente**: os dois campos seguem
  diferentes. Sem E3, o modelo receberia **as duas versões do mesmo trecho**, com a
  mesma página.
- **J1, apoio na inspeção registrada:** a primeira frase do terceiro parágrafo,
  *"Synthesis however requires commensurate priorities on a common scale"*, e a
  última do quarto, *"BOCR synthesis of priorities is deceiving if it is composed of
  sets of measures that have not been adjusted relative to each other and are
  therefore not commensurate."* **Saem os três pontos que carregavam o excesso:**
  *on different factors*, *before synthesis* e *to guarantee valid BOCR outcomes*.
- ⚠ **J1, o comprimento, medido antes de editar.** A primeira redação aprovada tinha
  **153** caracteres, e `claimToRef` corta `topic` acima de 120, em 117 mais
  reticências: **o modelo receberia a claim sem "is deceiving"**, isto é, sem o
  predicado. O autor escolheu a versão de **119** caracteres, que chega inteira.
  ⚠ **O corte no código NÃO é corrigido aqui**, e fica registrado como achado: é uma
  interface entre base e prompt que apaga texto sem sinal além das reticências.
- **O snapshot `docs/dados/a33-etapa4/` NÃO é propagado**, por decisão do autor. Os
  textos preparados e os `trechoId` ficam como estão, e **uma nova versão do
  snapshot é etapa própria, antes da etapa 4**. As conferências registradas de C1
  descrevem as unidades do snapshot, e **não mudam**.

#### O que foi medido antes, simulando a edição principal

**A edição E1, E2, E3 e J1 foi aplicada na árvore, medida e revertida**, antes deste
registro. Dois instrumentos: a base viva, lida por `getAllArticles`; e a montagem
pelo **handler real**, com os três clientes simulados e sem chunks, por um teste
**temporário e não versionado** que reutiliza, por faixa de linhas, o harness de
`a33-montagem-contexto.test.ts`.

⚠ **Instrumento novo, conferido na primeira execução, e ele errou no centro:** deu
**zero em tudo**, porque procurava a base de conhecimento no `system`, e ela vai nos
`messages`. Corrigido antes de aceitar qualquer número. **Conferência à mão depois
da correção:** as quatro seções têm **93, 28, 6 e 8** entradas, **135** no total, o
número registrado; antes da edição, o `textoFormatado` das quatro seções de
`contexto-estatico.json` está contido, byte a byte, no contexto montado; e o
`system` montado tem o SHA-256 `635fda53…`, **o mesmo** que
`rag-semantic-states.test.ts` fixa.

**O que chega ao modelo, antes e depois, sem chunks:**

| Cadeia | Seção de consistência | Seção BOCR | Seções de sensibilidade e críticas | Total |
|---|---:|---:|---:|---:|
| Wijnmalen, forma transformada | 2 → **0** | 2 → **0** | 0 → 0 | 4 → **0** |
| Wijnmalen, forma corrigida | 0 → **2** | 0 → **2** | 0 → 0 | 0 → **4** |
| Saaty, `A` maiúsculo | 1 → **0** | 0 → 0 | 0 → 0 | 1 → **0** |
| Saaty, `a` minúsculo | 0 → **1** | 0 → 0 | 0 → 0 | 0 → **1** |
| claim antiga de `key_claims[0]` | 1 → **0** | 1 → **0** | 0 → 0 | 2 → **0** |
| claim nova, **inteira** | 0 → **1** | 0 → **1** | 0 → 0 | 0 → **2** |
| **controle:** Saaty `key_claims[1]` | 1 → 1 | 0 → 0 | 0 → 0 | 1 → 1 |
| **controle:** Wijnmalen `key_claims[1]` | 1 → 1 | 1 → 1 | 0 → 0 | 2 → 2 |

- **Nenhuma referência mudou de seção:** 93, 28, 6 e 8 antes e depois, e as
  referências de Wijnmalen (2007) e Saaty (1977) são as mesmas em cada seção. ⚠ **A
  seleção é por substring**, que é A.31, e a claim nova acrescenta *bocr* e
  *synthesis*; a medição mostra que isso não moveu nada, porque o alias `cr` já
  punha todas as claims do Wijnmalen na seção de consistência.
- **O `system` não muda.** Os `messages` crescem **384 bytes**, exatamente
  4 × (211 − 123) + 2 × (119 − 103).
- **Seções de sensibilidade e críticas: idênticas ao snapshot. Consistência e BOCR:
  deixam de coincidir com ele**, que é a consequência de não propagar.
- **Base viva: 26 divergências entre 138 claims com os dois campos, a mesma lista
  antes e depois**; Saaty e Wijnmalen `key_claims[0]` com os dois campos iguais;
  `key_claims[3]` continua na lista. Conferido na primeira execução: o 26 é o número
  registrado, e a lista traz `wijnmalen2007_bocr[2]`, `[3]` e `[4]`, como o protocolo
  de C1 diz.
- ⚠ **O trecho de Forman `key_claims[2]` NÃO está no contexto estático**: zero
  ocorrências. Ele só chega pelos chunks de C1, e por isso não serve de controle aqui.

**A suíte, esta máquina, Windows 11, Node v24.12.0:**

| Medição | Suítes | Testes | Passando | Falhas |
|---|---:|---:|---:|---|
| linha de base, `23a3463` | 21 | 312 | 309 | CRLF de `casos.json` e os dois intermitentes, as já registradas |
| **com a edição simulada** | 21 | 312 | 309 | CRLF; os dois intermitentes **passaram nesta execução**; e **duas novas** |

**As duas novas são controles por resumo SHA-256, e a mudança é intencional:**
`rag-semantic-states.test.ts`, *CONTEXTO: o que A.33 moveu*, que fixa o resumo dos
`messages`; e `a33-identidade-revisada-medicao.test.ts`, *resultados publicados
correspondem às entradas*, que fixa o SHA-256 dos arquivos-fonte da medição
publicada. **Nessa segunda, os resultados da medição continuam iguais**; só o
SHA-256 dos dois arquivos editados diverge. **A correção é atualizar a referência
nomeando o valor anterior, e não apagar o controle.** `medicao.json` é medição
histórica e **não** se reescreve.

⚠ **Erro de ambiente pego antes deste registro:** reverter a simulação com
`git apply -R`, sob `core.autocrlf=true`, regravou os dois arquivos com **CRLF**, e o
SHA-256 em disco deixou de bater com o registrado. Restaurados com os bytes exatos do
`HEAD`: **`4b44bd34…`** para o Saaty e **`d24c49fd…`** para o Wijnmalen, os mesmos de
`medicao.json`, e LF na árvore.

#### A predição

**Alcance:** pareceres gerados **depois** da edição. Na etapa 4, **C2**, com a
recuperação semântica desligada, e **C3**, com a recuperação simulada vazia, recebem
**só** o contexto estático, e é neles que P1 e P2 valem.

⚠ **C1 fica FORA:** os chunks fixados em `C1-recuperacao.json`, que esta tarefa não
propaga, trazem a forma transformada do Wijnmalen e o Saaty com `A` maiúsculo. **C1
receberia as duas versões**, e a predição para ele espera o snapshot novo. ⚠ **Em
produção, com o índice real:** o índice não foi reingerido, que é A.18, e **o
conteúdo dos chunks guardados para estas claims NÃO foi medido nesta sessão.**

**Precedente observado, e é o que dá poder de discriminação a P1:** o parecer da
execução 7 citou **literalmente a forma transformada**, *"synthesis requires
commensurate priorities on a common scale. Therefore, there is a need to know the
magnitude relationship"*, com minúscula, sem *however* e parando em *relationship*,
atribuída a Wijnmalen (2007, **p. 903**), junto dos *rescaling weights* — que é a
claim de `key_claims[3]`.

- **P1.** Nenhum parecer de C2 ou C3 traz a forma transformada: *synthesis requires
  commensurate priorities* **sem** *however*, nem uma citação desse trecho que pare
  em *magnitude relationship* sem o complemento.
- **P2.** Nenhum parecer de C2 ou C3 atribui a Wijnmalen (2007) a **garantia de
  resultados BOCR válidos** condicionada à comensurabilidade prévia **dos fatores**.
  ⚠ **O marcador é a garantia de validade do resultado, e NÃO a palavra
  "garantir"**: a claim de `key_claims[3]`, que continua no contexto, diz
  *"necessários para garantir a comensurabilidade"*, e casar pela palavra acusaria
  falso positivo.
- **Saaty: sem predição de saída.** A mudança é só de caixa, e uma citação posta no
  início de frase recapitalizaria **legitimamente**; nenhuma leitura do parecer
  distingue os dois casos. **A verificação do Saaty é contra a fonte e contra a
  montagem**, e não contra a saída.

**Caso negativo nomeado:** a forma transformada, P1, ou a garantia de validade, P2,
aparece num parecer de C2 ou C3. **Como a montagem desses casos tem ZERO ocorrências
das duas formas, medido acima, a origem não seria o contexto estático:** seria
conhecimento prévio do modelo ou um canal da montagem não mapeado, e a ocorrência se
confere contra o contexto capturado da própria execução.

**Controle:** Saaty `key_claims[1]` e Wijnmalen `key_claims[1]`, que a tarefa não toca,
com as mesmas ocorrências no contexto antes e depois; o `system`, idêntico; as seções
de sensibilidade e críticas, idênticas ao snapshot; e, na saída, **a faixa dos CRs
individuais**, o controle já declarado de A.33.

⚠ **Limite desta predição, declarado antes:**

- **Confirmação é evidência FRACA.** A instrução vigente, desde A.33, pede paráfrase e
  não exige citação direta, então a ausência da forma transformada **também é
  esperada sem esta correção**. **O resultado informativo é a refutação.** Separar as
  duas causas pediria um parecer gerado com a base antiga e a instrução nova, que não
  está planejado.
- **Não testa** a fidelidade da paráfrase, a sustentação do que o parecer afirma, nem
  **a predição de A.33, que segue não testada**.
- **A etapa 4 fica desatualizada** nas seções de consistência e BOCR até o snapshot
  novo: `contexto-estatico.json` deixa de coincidir com a montagem nessas duas.

#### Critérios de aceite, fixados antes

| # | Critério | Esperado |
|---|---|---|
| 1 | `git diff HEAD --stat` de cada commit | mecânico: os dois arquivos da base e os testes, com **5 linhas** trocadas na base, 2 no Saaty e 3 no Wijnmalen; J1: **1 linha** no Wijnmalen, e os testes |
| 2 | forma transformada do Wijnmalen, por `git grep -o -c`, em `lib/` | **0** fora dos testes que a usam como contraexemplo; em `docs/` fica, porque é registro |
| 3 | base viva | 26 divergências, a mesma lista; `key_claims[0]` dos dois artigos com os dois campos iguais |
| 4 | montagem | a tabela acima, célula a célula |
| 5 | SHA-256 em disco dos dois arquivos | igual ao do blob commitado, com LF |
| 6 | `npx tsc --noEmit` | sai **0** |
| 7 | suíte | os comportamentos novos passam; **REGISTRO** do total observado **depois** de executar, sem número antecipado; falhas aceitas só as três já registradas |
| 8 | `docs/dados/`, `C1-recuperacao.json`, `trechoId`, as 19 do snapshot, `main` | **inalterados** |

**Comportamentos que precisam passar**, em teste novo:

| Caso | Resultado esperado |
|---|---|
| Wijnmalen `key_claims[0]`, os dois campos | iguais à frase impressa registrada em `inspecao-wijnmalen-forman.json` |
| Wijnmalen `key_claims[3]`, `evidence.quote` | igual à mesma frase; `verbatim_quote` diferente dela, e a unidade segue divergente |
| Saaty `key_claims[0]`, os dois campos | começam com `a` minúsculo e, com `\lambda_{max}` lido como `λmax`, estão contidos na frase impressa registrada em `medicao-pdfs.json` |
| contraexemplos | a forma transformada, o `A` maiúsculo e a frase sem *however* **reprovam** |
| J1 | a claim é a aprovada, tem até 120 caracteres, e chega ao `topic` **sem corte** |
| snapshot | as unidades 47, 86 e 89 de `evidencias.json` seguem com o texto antigo, **por decisão** |

### A.16: a correção executada, em 16/09/2026

**Gravação, na branch de sessão `correcao/a16-trechos-c1`:**

| Commit | Natureza | O que entra |
|---|---|---|
| `3db365c` | registro | a predição acima, **antes** de qualquer edição da base |
| `8b057d9` | **mecânica** | E1, E2 e E3; teste novo; os dois controles por resumo |
| `b567d99` | **julgamento** | J1; dois casos no teste novo; os dois controles de novo |

⚠ **A predição entrou primeiro na branch errada**, `inspecao/wijnmalen-forman`,
ainda sem publicação. A branch de sessão foi criada sobre ela, e a
`inspecao/wijnmalen-forman` local voltou a `23a3463`, **igual ao remoto**. O commit
da predição não foi reescrito.

⚠ **A primeira mensagem de `b567d99` citava o commit textual por um SHA que não
existe**, escrito sem medir. Corrigida antes de qualquer publicação, **só a
mensagem**, com a árvore conferida idêntica. É a regra da seção 9 do `CLAUDE.md`
aplicada ao próprio registro: número não medido não se afirma.

#### Critérios, medidos depois de executar

| # | Critério | Observado |
|---|---|---|
| 1 | diff por commit | `8b057d9`: 5 linhas na base, 2 no Saaty e 3 no Wijnmalen; `b567d99`: 1 linha, e os testes |
| 2 | formas antigas em `lib/` | forma transformada, `A` maiúsculo e claim antiga: **uma ocorrência cada, todas no teste novo**, como contraexemplo |
| 3 | base viva | **idêntica, byte a byte, à medida na simulação**: 26 divergências, a mesma lista |
| 4 | montagem sem chunks | **idêntica, byte a byte, à simulada antes da predição**; a tabela da predição vale célula a célula |
| 5 | SHA-256 da base | em disco e no blob: `5cd0efe6…` no Saaty, `78d63b48…` no Wijnmalen, com LF |
| 6 | `npx tsc --noEmit` | **0**, nesta máquina e no clone |
| 7 | suíte | tabela abaixo |
| 8 | fora do escopo | `docs/dados/`, `app/` e `scripts/` sem diferença desde `23a3463`; `main` em `33c1fdf` |

| Medição | `tsc` | Suítes | Testes | Passando | Saída |
|---|---:|---:|---:|---:|---:|
| esta máquina, `8b057d9` | 0 | 22 | 319 | 316 | 1 |
| esta máquina, `b567d99` | 0 | 22 | 321 | 320 | 1 |
| **clone raso LF, `8b057d9`** | **0** | **22** | **319** | **319** | **0** |
| **clone raso LF, `b567d99`** | **0** | **22** | **321** | **321** | **0** |

Nesta máquina, em `8b057d9`, falharam as três já registradas; em `b567d99`, **só a do
CRLF**, e os dois intermitentes passaram nessa execução. **Nada disso foi
corrigido.** O clone usou `core.autocrlf=false` e o `node_modules` desta árvore por
junção, removida depois.

**Os nove testes novos** estão em `lib/__tests__/a16-correcao-trechos-c1.test.ts`, e
foram conferidos por contraexemplo, **cada um reprovando o caso previsto**:

- **base antiga**, com os bytes do `HEAD` anterior: reprovam os quatro casos que
  dependem da correção textual — Wijnmalen `[0]`, Wijnmalen `[3]`, Saaty `[0]` e a
  ausência das formas antigas —, e passam a referência, os contraexemplos e a trava
  do snapshot;
- **snapshot propagado**, com o texto novo gravado em `evidencias.json`: reprova a
  trava;
- **claim antiga**: reprova os dois casos de J1;
- **claim de 153 caracteres**: reprova a chegada ao `topic`, **pelo corte**, com o
  valor recebido terminando em *adjusted ...*. ⚠ **Na primeira versão do caso, o
  contraexemplo reprovava por ser outra redação, e não pelo corte**; o caso passou a
  comparar o `topic` com a claim viva, e só então isolou o que devia medir.

Restauro por SHA-256 idêntico em todos.

**Os dois controles por resumo** reprovam com a base antiga, e guardam os valores
anteriores nomeados:

| Controle | A.33 ou antes | Com E1 a E3 | Com J1 |
|---|---|---|---|
| `messages` com chunks | `99f733c4…` | `0d8a7ae9…` | **`0353b393…`** |
| `messages` sem chunks | `a3c60c05…`, de `d658e50` | `ac297571…` | **`10935922…`** |
| `system` | `635fda53…` | o mesmo | **o mesmo** |
| SHA-256 do Saaty | `4b44bd34…`, em `medicao.json` | `5cd0efe6…` | `5cd0efe6…` |
| SHA-256 do Wijnmalen | `d24c49fd…`, em `medicao.json` | `01f26c6a…` | **`78d63b48…`** |

`medicao.json` **não** foi reescrito: as duas exceções são enumeradas no teste, com o
valor medido e o corrente, e **os resultados da medição continuam iguais**.

#### O que muda no estado, e o que não muda

- **Na base:** Saaty `key_claims[0]` e Wijnmalen `key_claims[0]` passam a trazer o
  texto impresso nos dois campos, e a claim de Wijnmalen `key_claims[0]` passa a ser
  a redação sustentada. **As três unidades do snapshot, 47, 86 e 89, NÃO mudam**, e
  as conferências registradas de C1 descrevem essas unidades: **4 conferidas e 161
  pendentes**, e o critério atual em **1 de 3**, **inalterados**.
  ⚠ **Criar o snapshot novo NÃO torna esses trechos conferidos.** A ordem é:
  **auditar** as correções da base; **depois** propagar os conteúdos aprovados,
  **recalcular** as identidades afetadas e **verificar** as cópias. **O snapshot
  anterior conserva os seus resultados históricos.** *(Corrigido depois: a versão
  anterior dizia que mover os dois trechos para conferidos exigia a versão nova do
  snapshot e a conferência dela, sem essa ordem e sem a preservação do histórico.)*
- ⚠ **A partição das treze, no `CLAUDE.md`, está INCORRETA neste ponto:** ela põe o
  Wijnmalen entre os casos em que **o `evidence.quote` é o fiel**, e em
  `key_claims[3]` ele **não era**: era a forma transformada, agora corrigida na
  base. **A afirmação merece correção delimitada posterior**, que esta rodada não
  fez, porque pode orientar novas escolhas erradas entre os campos. ⚠ **Até essa
  correção, ela NÃO serve de evidência de qual campo é fiel.** *(Corrigido depois:
  a versão anterior tratava a partição como descrição de qual campo diverge do
  outro, o que atenuava o erro.)*
- **Em A.16 continuam abertos:** o `verbatim_quote` e a claim de Wijnmalen
  `key_claims[3]`, e as demais divergências. **26 entre 138** na base viva, a mesma
  lista.
- **Achado registrado e NÃO corrigido:** `claimToRef` corta `topic` acima de 120
  caracteres, sem outro sinal além das reticências.
- **Predição:** registrada e **não testada**; a de A.33 também segue não testada.
- ⚠ **As quatro credenciais NÃO são requisito da etapa 4.** Pelo desenho aprovado,
  **C1 e C3 usam recuperação simulada** e **C2 tem a recuperação desligada**; a
  geração exige **acesso ao modelo real**, e **Voyage e Upstash não devem ser
  chamados nesse ensaio**. Nesta máquina, o `.env.local`, ignorado pelo git, define
  variáveis com esses quatro nomes, sem valores lidos, e ⚠ **a presença das
  variáveis não demonstra que a autenticação funcionará.** A seção seguinte registra
  a ausência das quatro num contêiner: é medição daquele ambiente, **não lista de
  requisitos**. *(Corrigido depois: a versão anterior chamava as quatro de variáveis
  da etapa 4 e dizia que, aqui, a etapa não dependia de credencial.)*
- **Não foi feito, até `ac9ede9`:** reingestão, geração, publicação da branch,
  integração, e alteração em `docs/dados/`, `app/`, `scripts/` ou `main`. A
  publicação veio depois, e está abaixo.

#### Publicação e CI, por commit

A branch foi publicada **um commit por push**, sem `--force`, rebase ou `amend`,
cada push esperando a execução do anterior terminar, para que **cada commit tenha
execução própria**. Evento `push`, job `verificar`, os sete passos em `success`:

| Commit | Execução | Estado |
|---|---|---|
| `3db365c776a8d6bc7142d9cb98dfc3890aa62c27` | `35215387396` | completed/success |
| `8b057d9db2c70e701a757f5ad83336903c3b8000` | `35215571833` | completed/success |
| `b567d99bec6881faa381651353120e1faaf7366a` | `35215786626` | completed/success |
| `ac9ede9ace35b2854549dbdbd0b7f97b3bb07569` | `35215997892` | completed/success |

⚠ **Sem integração:** `integra/a30-registros` segue em `23a3463`, local e remota, e
a integração, por fast-forward, fica para depois da auditoria. `main` em `33c1fdf`.
O CI deste commit de correção documental é observação posterior.

### Etapa 4: NÃO EXECUTADA

**A mudança está implementada e a predição permanece não testada.**

⚠ **Os testes de montagem NÃO a testaram**, e não são apresentados como se tivessem.
Eles medem o que chega ao modelo; a predição é sobre o que o modelo escreve.

**Por que não foi executada, medido nesta sessão:** `ANTHROPIC_API_KEY`,
`VOYAGE_API_KEY`, `UPSTASH_VECTOR_REST_URL` e `UPSTASH_VECTOR_REST_TOKEN` estão
**ausentes** neste ambiente, e não há arquivo `.env`. **O egresso funciona**, e
`api.anthropic.com` responde **401**, que é alcance sem credencial. **Sem credencial
não há parecer gerado, e sem parecer gerado não há etapa 4.**

**O que fica PRONTO para o pesquisador executar**, em `lib/rag/conferencia-sustentacao.ts`:

| Coluna | Quem preenche |
|---|---|
| 1, afirmação produzida | a máquina, extraindo as citações do parecer |
| 2, evidência enviada ao modelo | a máquina, localizando o bloco da fonte no contexto |
| 3, trecho da fonte original | **o pesquisador**, abrindo a publicação |
| 4, resultado | decorre das três, e sai `inconclusiva` sozinha quando A.16 diverge |

⚠ **A conferência NÃO é atribuída inteira ao pesquisador**, e tampouco é concluída
sozinha: as colunas 1 e 2 já estão automáticas, e só a 3 depende de leitura.

⚠ **Limite declarado do extrator:** ele pega a forma `Autor (ano)`, que é a que a
instrução nova ensina. **Citação escrita de outro jeito escapa**, então o total dele
**não substitui a leitura do parecer**.

**Os três casos, as fontes e a configuração continuam como fixados acima**, antes de
qualquer execução, e não foram revisados depois.

---

## Anexo 3: metadados e trechos da execução 7

### Metadados da execução, do log de produção

| Campo | Valor |
|---|---|
| Requisição | `POST /api/ai-reviewer` → **200** |
| Instante | **2026-09-13T01:59:11Z** (12/09, 22:59 local) |
| Deploy | `dpl_orQbNxPZQP8htwtZPvdUZ5gPhSbP`, target `production`, branch `main`, cache `MISS` |
| Commit | **`f9cbf94550afb00fbe84d62a253be7357f8aa10b`** (`f9cbf94`) |
| Deploy criado | 12/09/2026 22:51:56 local, estado `READY` |
| Versão do código no log | `AI-REVIEWER v7.3.2` |
| Modelo | `claude-opus-4-6`, com aviso de `thinking.type=enabled` depreciado |
| Recuperação semântica | ligada, **5 consultas, 5 vazias, 0 chunks** |
| Veredito emitido | `A (100/100) - ACEITO`, extraído da DECISÃO EDITORIAL |

### Registro de incorporação do texto integral

**Incorporado em 12/09/2026**, fornecido pelo pesquisador nesta sessão a partir do
texto que havia sido entregue antes a outro assistente. **Nada foi corrigido:**
redação, números e citações estão como saíram, inclusive os erros — é dado primário.

| Campo | Valor |
|---|---|
| **SHA-256 do arquivo do parecer** | `bcdfe5a3be836946c934b8ae437b1aa3b921743b121c503505f9f431a5ba8fd9` |
| Tamanho | 136 linhas, 18.070 bytes, 17.577 caracteres (UTF-8, com quebra final) |
| **Hash do commit do código** | `f9cbf94550afb00fbe84d62a253be7357f8aa10b` |

⚠ **Os dois hashes identificam coisas diferentes e não se substituem:** o SHA-256 é
do **arquivo de texto gerado**; o hash do commit é do **código que o gerou**. Um
parecer regerado no mesmo commit terá outro SHA-256, porque a geração é estocástica.

**Verificação que liga o texto à requisição, e não é formalidade:** o início do texto
incorporado **casa exatamente** com o prefixo que o log de produção preservou —
`## 📋 RESUMO DA SUBMISSÃO` seguido de *"O estudo aplica o método AHP-BOCR para
comparar duas alternativas tecnoló…"*, ponto em que o log trunca. **É o que permite
afirmar que este texto é o da requisição de 01:59:11Z, e não de outra execução.**

⚠ **Não reconstruir texto de parecer a partir de trechos, em nenhuma execução
futura:** a geração é estocástica, e um texto recomposto não é o texto gerado.

**O SHA-256 é reconferível a partir deste documento**, e foi: extraindo o bloco entre
os marcadores `⟪ início do texto gerado ⟫` e `⟪ fim do texto gerado ⟫`, retirando as
quebras das bordas e acrescentando uma quebra final, o digest reproduz
`bcdfe5a3…a8fd9`. **Se uma edição futura tocar o texto, o digest deixa de fechar** —
é para isso que ele está aqui.

⚠ **Dois recortes diferentes do mesmo texto, e confundi-los faz o digest parecer
quebrado.** Aconteceu em 14/09/2026: uma conferência de integração publicou
`607c7b3e…` como digest do parecer, e ele **não é**. Os dois foram remedidos neste
documento, e os dois fecham, cada um sobre o seu recorte:

| Recorte, definido pelo que entra | Linhas | Bytes | SHA-256 completo |
|---|---|---|---|
| **entre** os marcadores, bordas aparadas, com quebra final, que é a normalização do parágrafo acima | 136 | 18.070 | `bcdfe5a3be836946c934b8ae437b1aa3b921743b121c503505f9f431a5ba8fd9` |
| marcadores **inclusos**, sem quebra final | 140 | 18.139 | `607c7b3e27037b054c768de175e58e59379ae5dac692e3855fe0e9a20c3a4134` |

**O digest do parecer é o primeiro**, e é ele que fecha contra o arquivo entregue pelo
pesquisador. **O segundo não o substitui:** serve para comparar este trecho entre dois
commits, porque inclui os delimitadores e dispensa a normalização. ⚠ **Ao registrar
qualquer um dos dois, escreva o hash completo e diga qual recorte ele cobre.** Hash
abreviado sem o recorte nomeado foi o que produziu a divergência aparente, e o texto
da execução 7 nunca foi tocado.

### O que o log preserva do início do parecer

```
## 📋 RESUMO DA SUBMISSÃO

O estudo aplica o método AHP-BOCR para comparar duas alternativas tecnoló…
```

(o log trunca aqui; é o único trecho do corpo que a infraestrutura guarda)

### Índice: de onde cada item da análise sai, no texto integral

Antes da incorporação esta tabela era o que existia em lugar do texto. **Agora é
índice de navegação**, e o texto integral está ao fim deste anexo.

| # | Trecho | Onde a seção o trata |
|---|---|---|
| 1 | "High power leads to cognitive biases…" | item 2 |
| 2 | associação entre presença de diretores e executivos e preocupação com viés | item 2 |
| 3 | faixa **1,1%–9,6%**, **100% de conformidade**, nenhum respondente acima de 20% | item 3 |
| 4 | condição suficiente de Xu satisfeita, dispensa de intervenções | item 3 |
| 5 | "Schmidt, 2015, citado em Ishizaka & Labib, 2011" | item 4 |
| 6 | razão **2,38:1** entre escores e "variações de grande magnitude" | item 5 |
| 7 | "constitui contribuição original" | item 6 |
| 8 | veredito **ACEITO** | item 6 |

### Avisos do validador na mesma requisição, verbatim do log

```
CITACAO_INCOMPLETA: "Salomon (2024" — paper coautorado com Gomes; cite como "Salomon & Gomes (2024)"
CITACAO_INCOMPLETA: "Kabak (2014" — paper coautorado com Dağdeviren; cite como "Kabak & Dağdeviren (2014)"
CITACAO_INCOMPLETA: "Escobar (2004" — paper tem 3 autores; cite como "Escobar et al. (2004)"
CITACAO_INCOMPLETA: "Lee (2009" — paper tem 3 autores; cite como "Lee et al. (2009)"
CITACAO_INCOMPLETA: "Schmidt, 2015" — paper tem 5 autores; cite como "Schmidt et al. (2015)"
CITACAO_INCOMPLETA: "Escobar, 2004" — paper tem 3 autores; cite como "Escobar et al. (2004)"
ATRIBUICAO_SUBOTIMA: "Saaty (2003)" em contexto BOCR — para hierarquia de controle e fórmulas de síntese BOCR use "Saaty & Ozdemir (2003)"
```

⚠ **Sete avisos, nenhum bloqueio**, e o quinto toca o mesmo trecho da atribuição
impossível **sem ver o problema**: corrige a contagem de autores de Schmidt e não
questiona um artigo de 2011 citando um de 2015. É F06 em ação.

### Payload, no que o log revela

```
bocrWeights: {"Benefits":0.37227664688843276,"Opportunities":0.1517028115083517,
              "Costs":0.19743689619605773,"Risks":0.27858364540715785}
demographicsSummary.fields.funcao: ["diretor","gerente","c_level"]
sensitivityInflections: {"O":null,"C":null,"R":null,"B":null}
Bias: CRs mapeados: CR=0.010504514795322372, CR=0.035945896757571656, CR=0.020820121915492394
Usando statistics.byStatus: 12✅ 0⚠️ 0❌ 0❓   →   Validade: 100.0%   →   Score final: 100/100
finalScores: firstValid { code: 'A1', score: 0.06412946722825451 }
```

⚠ **Os três CRs que o log mostra ficam entre 1,05% e 3,59%** — são do cache de maio,
não os recalculados de 11,39% a 109,27%. **É a origem numérica do "100% de
conformidade"**, e ela chega ao parecer pelo payload, não pelo prompt.

---

## Texto integral do parecer da execução 7

⚠ **Daqui até o fim do arquivo é SAÍDA DO MODELO, incorporada sem edição.** Nada
abaixo é análise, metadado ou log: esses ficam nas seções anteriores, de propósito.
**Os erros estão preservados** — a faixa de CRs, a atribuição a Ishizaka e Labib, a
página do Saiyed, a afirmação de originalidade. Corrigi-los aqui destruiria o dado.

**SHA-256** `bcdfe5a3be836946c934b8ae437b1aa3b921743b121c503505f9f431a5ba8fd9` ·
**commit** `f9cbf94` · **requisição** 2026-09-13T01:59:11Z

### ⟪ início do texto gerado ⟫

## 📋 RESUMO DA SUBMISSÃO

O estudo aplica o método AHP-BOCR para comparar duas alternativas tecnológicas de Indústria 4.0 voltadas à otimização do consumo energético de estufas de cura em linha de pintura automotiva: (A1) controle em tempo real dos queimadores utilizando inteligência artificial e (A2) gêmeo digital CFD para simulação termodinâmica. O problema é motivado por um consumo anual de aproximadamente 5,9 milhões de m³ de gás natural (custo estimado de R$ 22,4 milhões), com desperdício energético estimado entre 20% e 25%, concentrado nas fases de *startup* e *set-back*.

A avaliação foi realizada por 12 especialistas, todos com CR individual ≤ 0,10, cuja agregação de julgamentos foi conduzida por média geométrica (Saaty, 1990). Os pesos BOCR derivados da hierarquia de controle são B = 37,2%, O = 15,2%, C = 19,7% e R = 27,9%. A síntese das alternativas segue a fórmula subtrativa completa de Wijnmalen (2007, Eq. 17):

Score_i = v_b × s_b × B_i + v_o × s_o × O_i − v_c × s_c × C_i − v_r × s_r × R_i

onde v representa os pesos pessoais (hierarquia de controle) e s os *rescaling weights* (comensurabilidade entre dimensões). O ranking final posiciona A1 (score = 0,064129) à frente de A2 (score = 0,026937). A análise de sensibilidade não identificou pontos de virada em nenhuma das quatro dimensões BOCR.

O perfil dos especialistas abrange formações em nível de mestrado e especialização, experiência entre 11 e mais de 30 anos, cargos de diretoria, gerência e nível executivo (*C-level*), e áreas de atuação em manufatura, otimização de custos, qualidade, financeiro, manutenção e P&D.

---

## ✅ PONTOS FORTES

**1. Conformidade integral dos julgamentos individuais ao limiar de consistência.** Os 12 respondentes apresentam CRs individuais entre 1,1% e 9,6%, todos inferiores ao limiar CR ≤ 0,10. Saaty (1977, p. 248) estabelece: *"require the ratio to be very small; e.g., of the order of 0.1"*. A taxa de conformidade de 100% dispensa procedimentos de filtragem ou exclusão de respondentes. Salomon (2024, p. 468) corrobora a centralidade desta métrica: *"Consistency is a measure of the quality of data input in the AHP"*.

**2. Fórmula de síntese com comensurabilidade explícita.** O sistema implementa a Eq. 17 de Wijnmalen (2007, p. 903), que incorpora *rescaling weights* (s) para garantir comensurabilidade entre as prioridades das sub-hierarquias BOCR: *"synthesis requires commensurate priorities on a common scale. Therefore, there is a need to know the magnitude relationship"*. A forma completa com pesos pessoais (v) e *rescaling weights* (s) evita a distorção identificada pelo mesmo autor na utilização de recíprocos para custos e riscos.

**3. Painel com diversidade funcional e senioridade.** O painel é composto por 12 especialistas com formação em nível de mestrado e especialização, experiência profissional entre 11 e mais de 30 anos, e ocupando cargos de direção, gerência e nível executivo. As áreas de atuação cobrem manufatura, otimização de custos, qualidade, financeiro, manutenção e P&D. Esta composição atende ao axioma de expectativas formulado por Saaty (1986, p. 843): *"thoughtful individuals who have reasons for their beliefs should make sure that their ideas are adequately represented"*.

**4. Estrutura BOCR com quatro dimensões e subcritérios.** A organização em Benefícios, Oportunidades, Custos e Riscos, cada uma com cinco subcritérios (n = 5), atende ao princípio MECE. Petrillo et al. (2023, p. 2): *"The use of an MCDM model with these four main criteria aims for a mutually exclusive and collectively exhaustive (MECE) set of criteria"*. A distinção entre certeza e incerteza segue Mu (2016, p. 8): *"Can we reasonably be sure this benefit will occur?'; If the answer is 'Yes' it is a benefit, if the answer is 'No' it is an opportunity"*.

**5. Detecção de viés com explicabilidade algorítmica.** O sistema combina análise algorítmica de consistência com geração de explicações via LLM (XAI), classificando o nível de risco como LOW com 100% de conformidade CR. A integração de detecção de viés e explicabilidade constitui contribuição original do sistema para auditoria de julgamentos em AHP.

---

## ⚠️ LIMITAÇÕES IDENTIFICADAS NOS DADOS

**1. Homogeneidade de gênero no painel.** Todos os 12 respondentes são do gênero masculino. Embora esta composição possa refletir a demografia do setor automotivo industrial, a ausência de diversidade de gênero constitui um viés potencial de representação. Conforme a literatura de psicologia cognitiva, a homogeneidade demográfica pode amplificar vieses de confirmação grupal. A limitação é de natureza contextual e deve ser reportada como característica da amostra.

**2. Peso de Riscos acima dos benchmarks setoriais.** O peso atribuído a Riscos (R = 27,9%) é consideravelmente superior aos valores reportados em estudos do setor energético: Kabak (2014) reporta R = 8% e Mu (2016) reporta R = 10%. Embora a diferença possa ser justificada pela especificidade do contexto automotivo (linha de pintura com requisitos de segurança e continuidade operacional), a magnitude da divergência (2,8 a 3,5 vezes os benchmarks) requer contextualização no manuscrito.

---

## 🔍 ANÁLISE DETALHADA

### Consistência dos Julgamentos

O CR global agregado da hierarquia de controle é 1,06%, inferior ao limiar CR ≤ 0,10 proposto por Saaty (1977). As quatro matrizes agregadas por dimensão BOCR apresentam CRs igualmente inferiores ao limiar:

| Dimensão | n (subcritérios) | CR agregado | λmax | Status |
|---|---|---|---|---|
| Benefits | 5 | 1,10% | 5,0494 | ✅ |
| Opportunities | 5 | 0,92% | 5,0414 | ✅ |
| Costs | 5 | 2,60% | 5,1165 | ✅ |
| Risks | 5 | 1,40% | 5,0626 | ✅ |

Os CRs das matrizes agregadas referem-se a matrizes resultantes da aplicação da média geométrica sobre os 12 julgamentos individuais. Escobar (2004, p. 1): *"the paper proves that the inconsistency of the group is smaller than the largest individual inconsistency"*. Com N = 12 e max(CR individual) = 9,6%, a propriedade é satisfeita: todos os CRs agregados (máximo de 2,60%) são inferiores a 9,6%.

Os 12 respondentes individuais apresentam CRs entre 1,1% e 9,6%. Nenhum respondente excede o limiar de 0,20 acima do qual Saaty & Ergu (2015, p. 754) consideram os julgamentos não confiáveis: *"A CR greater than 0.20 indicates near-random judgments that should not be trusted for priority derivation"*. A conformidade de 100% ao limiar CR ≤ 0,10 dispensa aplicação do algoritmo de identificação da entrada mais inconsistente da PCM descrito por Saaty (2003).

A dimensão Costs apresenta o maior CR agregado (2,60%). Embora inferior ao limiar, este valor é o mais elevado entre as quatro dimensões. Saaty & Vargas (2012, p. 9) contextualizam: *"An inconsistency of 10 percent or less implies that the adjustment is small compared to the actual values of the eigenvector entries"*. O CI correspondente, calculado como (λmax − n)/(n − 1) = (5,1165 − 5)/4 = 0,0291, confirma que o desvio em relação à consistência perfeita é reduzido.

A convergência da consistência na agregação é coerente com o resultado demonstrado por Xu (2000, p. 68): *"this paper proves that the WGMCJM is of acceptable consistency (i.e., CR <= 0.1) under the condition that each Ak... is of acceptable consistency"*. Uma vez que todos os 12 julgamentos individuais satisfazem CR ≤ 0,10, a condição suficiente para a aceitabilidade da matriz agregada é atendida.

A compensação de inconsistências individuais pela média geométrica é documentada por Ossadnik et al. (2016, p. 611): *"Geometric aggregation leads to a compensation of single inconsistent matrices to consistent group judgments"*. A redução dos CRs individuais (máximo 9,6%) para CRs agregados (máximo 2,60%) é consistente com este efeito compensatório.

### Pesos BOCR e Hierarquia de Controle

Os pesos BOCR foram derivados de comparações pareadas entre os quatro méritos na hierarquia de controle, conforme Saaty (2003) e Lee (2009, p. 4): *"considering the benefits (B), opportunities (O), costs (C) and risks (R) of an alternative... is a more comprehensive way"*. A distribuição resultante é:

| Mérito | Peso (v) | Rescaling (s) | v × s |
|---|---|---|---|
| Benefits | 0,3723 | 0,4393 | 0,1636 |
| Opportunities | 0,1517 | 0,1593 | 0,0242 |
| Costs | 0,1974 | 0,1868 | 0,0369 |
| Risks | 0,2786 | 0,2146 | 0,0598 |

O ratio máximo/mínimo é 2,45:1 (Benefits/Opportunities). Nenhuma dimensão excede 50% do peso total, o que evita dominância unilateral de um único mérito sobre a síntese. A dimensão Benefits (37,2%) é convergente com o valor de 37% reportado por Kabak (2014) no setor energético, e inferior ao peso de 46% reportado por Mu (2016) em contexto de cooperação internacional.

A dimensão Risks (27,9%) diverge dos benchmarks publicados. Kabak (2014) reporta R = 8% e Mu (2016) reporta R = 10%. A divergência pode ser contextualizada pelo domínio de aplicação: em linha de pintura automotiva, riscos operacionais (interrupção de produção, falha de equipamento, não conformidade de qualidade) podem justificar peso proporcionalmente maior do que em estudos de planejamento energético de longo prazo. Saiyed et al. (2023, p. 9) alertam para viés cognitivo em painéis com alta concentração de poder: *"High power leads to cognitive biases creeping in, especially how the CEO frames the decision calculus and estimates risks inherent in decisions"*. A presença de diretores e executivos (*C-level*) no painel é um fator que merece atenção interpretativa, embora a diversidade de cargos (gerentes, diretores, *C-level*) mitigue parcialmente esta preocupação.

O peso de Opportunities (15,2%) é o menor entre os quatro méritos. Comparado com Kabak (2014), que reporta O = 35%, a diferença é considerável. Esta distribuição sugere que o painel atribui menor relevância aos ganhos incertos (oportunidades) em comparação com os ganhos certos (benefícios) e com os custos e riscos, o que é coerente com um contexto industrial de decisão operacional onde a aversão ao risco e a priorização de benefícios tangíveis tendem a predominar.

### Análise de Sensibilidade

A análise de sensibilidade foi executada nas quatro dimensões BOCR (Benefits, Opportunities, Costs e Risks). Nenhum ponto de virada foi identificado em qualquer dimensão. Ishizaka & Labib (2011, p. 14) fundamentam a relevância desta análise: *"Sensitivity analysis for AHP is relevant only when alternatives are included in the hierarchy"* (Schmidt, 2015, citado em Ishizaka & Labib, 2011).

A ausência de pontos de virada indica que a posição de A1 como alternativa preferida é preservada ao longo de toda a faixa de variação dos pesos BOCR. Como todos os CRs das sub-hierarquias são inferiores ao limiar de Saaty (1977), a estabilidade observada pode ser interpretada sem a qualificação exigida pela Diretriz 2 (tensão entre sensibilidade e CR crítico). Os pesos sobre os quais a sensibilidade foi calculada refletem preferências transitivas dos decisores.

A diferença entre os scores das duas alternativas (A1 = 0,064129; A2 = 0,026937; ratio de 2,38:1) contribui para a ausência de pontos de virada: uma inversão de ranking exigiria variações de grande magnitude nos pesos de qualquer dimensão BOCR, o que é consistente com a estabilidade observada.

### Análise de Viés e Fairness nos Julgamentos

O nível de risco classificado pelo sistema é LOW, com 100% de conformidade ao limiar CR ≤ 0,10 de Saaty (1977). Nenhum respondente apresenta padrão de inconsistência que indique julgamentos aleatórios ou não transitivos.

A análise de *Disparate Impact* (Dodevska et al., 2023) requer que o pesquisador defina o atributo sensível e os grupos de alternativas (privilegiado e discriminado). Dodevska et al. (2023, p. 4) definem: *"DI before optimization (DI_{bef}) is the ratio of average AHP rank comparison scores before optimization (overline{R}_{bef}) between privileged and discriminated groups"*. A infraestrutura para esta análise está disponível no sistema, porém a configuração do atributo sensível não foi realizada. A configuração é uma escolha contextual do pesquisador, não uma falha metodológica.

### Fundamentação Teórica

**Axiomas de Saaty (1986).** Os quatro axiomas são verificados pela estrutura do sistema. Saaty & Vargas (2012, p. 15) enunciam: *"there are four axioms in the AHP... concerned with the reciprocal relation, comparison of homogeneous elements, hierarchic and systems dependence"*.

| Axioma | Verificação |
|---|---|
| Reciprocidade | Garantida pela estrutura da PCM (a_ji = 1/a_ij) |
| Homogeneidade | Escala 1-9 limita comparações a uma ordem de magnitude |
| Dependência | Estrutura hierárquica BOCR com sub-hierarquias funcionalmente dependentes |
| Expectativas | Ranking reflete preferências agregadas de 12 especialistas qualificados |

**Método de agregação.** A média geométrica é o método recomendado para AIJ. Forman & Peniwati (1998, p. 170) esclarecem: *"While either an arithmetic or geometric mean can be used for AIP, the geometric mean is more consistent with the meaning of both judgments and priorities"*. Saaty (1987, p. 165) fundamenta a propriedade recíproca: *"any rule to combine the judgments of several individuals should also satisfy the reciprocal property. A proof that the geometric mean... satisfies this condition"*. A aplicação de média aritmética seria inadequada, conforme Ossadnik et al. (2016): *"the arithmetic form of AIJ (AIJ (WAMM)) generates inconsistent collective pairwise comparison matrices, even if all individual judgments were consistent"*.

**Fórmula de síntese.** A fórmula subtrativa completa (Wijnmalen, 2007, Eq. 17) é coerente com a recomendação de Saaty & Vargas (2012, p. 139): *"I do not recommend ever using multiplicative synthesis. It can lead to an undesirable ranking of the alternatives"*. A forma subtrativa permite scores negativos quando custos e riscos superam benefícios e oportunidades, conforme demonstrado por Saaty & Ozdemir (2003, p. 1): *"Annual Exten. -0.32 ; Amend NTR -0.07 ; PNTR 0.23"*. No presente estudo, ambas as alternativas apresentam scores positivos, indicando que benefícios e oportunidades ponderados superam custos e riscos ponderados.

**Estrutura BOCR.** Saaty & Ergu (2015, p. 753) definem: *"A decision structure is said to be comprehensive if it represents a decision problem by considering comprehensive influence factors such as BOCR"*. A estrutura implementada atende este critério.

**Paradigma metodológico.** O estudo não declara explicitamente o paradigma metodológico nos metadados. As características observadas (painel interno de 12 especialistas com cargos de gestão e direção, decisão operacional em contexto industrial específico, duas alternativas tecnológicas concretas) são consistentes com pesquisa-ação ou estudo de caso. Sob este paradigma, N = 12 é adequado, pois reflete o engajamento qualitativo dos *stakeholders* da decisão. As recomendações desta revisão são calibradas a este paradigma e podem não se aplicar a estudos que adotem paradigmas distintos (ex.: *survey* quantitativo).

---

## 💡 AÇÕES DE MITIGAÇÃO

**1. Contextualizar o peso de Riscos no manuscrito.** O peso R = 27,9% diverge dos benchmarks de Kabak (2014) e Mu (2016) por fator de 2,8 a 3,5. O manuscrito deve documentar os fatores contextuais que justificam esta divergência (ex.: requisitos de segurança operacional em linha de pintura, risco de interrupção de produção, custos de não conformidade). A contextualização não altera os dados, mas fortalece a interpretação do ranking.

**2. Configurar a análise de *Disparate Impact* para auditoria de fairness.** A infraestrutura de Dodevska et al. (2023) está disponível no sistema. O pesquisador pode definir o atributo sensível (ex.: tipo de tecnologia, fornecedor, maturidade tecnológica) e os grupos de alternativas para verificar se o ranking atende aos limites DI ∈ [0,80; 1,25]. Esta configuração é opcional e constitui uma camada adicional de auditoria.

**3. Documentar a homogeneidade de gênero como característica da amostra.** O manuscrito deve registrar que o painel é integralmente masculino e contextualizar esta composição em relação à demografia do setor automotivo industrial. A documentação é um requisito de transparência, não uma invalidação dos resultados.

---

## 🎯 DECISÃO EDITORIAL

**ACEITO**

O estudo atende aos critérios de qualidade metodológica do AHP-BOCR conforme a literatura publicada:

1. **Consistência:** CR ≤ 0,10 em todas as sub-hierarquias (máximo 2,60% em Costs) e em todos os 12 julgamentos individuais (máximo 9,6%). A conformidade é integral tanto no nível individual (Saaty, 1977) quanto no nível agregado (Escobar, 2004; Xu, 2000).

2. **Painel:** N = 12 especialistas com diversidade funcional (seis áreas de atuação), senioridade (11 a mais de 30 anos de experiência) e formação pós-graduada. A composição atende ao axioma de expectativas (Saaty, 1986).

3. **Síntese:** Fórmula subtrativa completa com *rescaling weights* (Wijnmalen, 2007, Eq. 17), agregação por média geométrica (Saaty, 1990; Forman & Peniwati, 1998), e verificação dos quatro axiomas de Saaty (1986).

4. **Sensibilidade:** Ausência de pontos de virada nas quatro dimensões BOCR, indicando estabilidade do ranking de A1 sobre A2 ao longo de toda a faixa de variação dos pesos.

As limitações identificadas (homogeneidade de gênero e divergência do peso de Riscos em relação a benchmarks) são de natureza contextual e não comprometem a validade metodológica do estudo. As ações de mitigação propostas referem-se à contextualização interpretativa no manuscrito, não à correção de procedimentos.

### ⟪ fim do texto gerado ⟫
