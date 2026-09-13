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
