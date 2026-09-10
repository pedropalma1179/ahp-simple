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
| **A. Dado de entrada falso** | 1 e 2 | o `qualityAnalysis` que chega à rota é construído sobre um cache que não é o CR do respondente | verificação do insumo contra o dado primário. **Nenhum verificador de citação pega**: o modelo relatou fielmente o que recebeu |
| **B. Ancoragem corrompida** | 3 e 5 | o RAG entrega a claim correta e a geração altera o localizador (**72% das citações com página**), ou aplica a claim a contexto que ela não sustenta | comparação do localizador gerado contra o `evidence.page` da claim. O verificador atual, que confere apenas autor e ano, **não pega** |
| **C. Premissa não verificada** | 4 | a claim é citada corretamente, mas a condição que o próprio autor estabelece não é checada contra os dados | verificação da premissa, não da citação |
| **D. Instrução do prompt contradiz a base** | parte da 3 | o exemplo de formato no `system-prompt.ts` traz "Wijnmalen (2007, p. 250)" quando o `evidence.page` no RAG é 899. O modelo obedeceu ao exemplo | auditoria do prompt contra o RAG. **Nenhum verificador de saída pega**: a saída é fiel à instrução |

A classe A é a mais séria para o argumento do artigo: o modelo não alucinou. Ele
foi fiel a um insumo falso. Um pipeline que verifique cada afirmação contra a
fonte citada aprovaria as duas.

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

**Reprodutível.** Sim. Registrada na Seção 6.2 da dissertação (maio de 2026) e
presente na execução de 10/09/2026.

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

**Causa técnica.** Não determinada. Candidata: o payload enviado a
`/api/ai-reviewer` inclui `demographicsSummary` e contagens por status; o
`'REVISAR': 0` fixo em `resultados/page.tsx` mostra que ao menos um campo de
contagem é construído sem base no dado. Investigar antes de afirmar.

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

**Contraprova.** O prompt também traz "Saaty (1977, p. 248)" seis vezes como
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
| Saaty (1977, p. 248) | exemplo de formato, 6 vezes | claim em **248** | ok |
| Forman & Peniwati (1998, p. 167) | exemplo de formato | 166–168 | ok |
| Wijnmalen (2007, p. 250) | exemplo de formato, 2 vezes | claim em **899** (artigo: 892–905) | **erro** |
| Saaty (1977, p. 271) | **REGRA CRÍTICA — LIMIARES** | claims em 237–263; **não há 271** | **erro** |

O segundo é mais grave que o primeiro por dois motivos.

Não é exemplo de formato: é a linha que define qual limiar de consistência usar,
`CR ≤ 0.10: aceitabilidade (Saaty, 1977, p. 271)`. A regra que ancora o critério
central do método traz a fonte errada.

E **o prompt contradiz a si mesmo**: usa `p. 248` corretamente em seis lugares
para a mesma claim de Saaty (1977) e `p. 271` na regra de limiares. Não existe
página 271 nesse artigo.

**Por que o segundo é pior.** O de Wijnmalen é exemplo de formato: ensina como
escrever, e propaga o erro por imitação. O de Saaty em 271 está na linha que
**define o limiar de aceitação**. Não ensina formato, ancora o critério central do
método. Quem fosse conferir de onde vem o `CR ≤ 0,10` seria mandado a uma página
que não existe no artigo.

E a autocontradição fecha o caso sem margem: o mesmo arquivo usa 248 seis vezes
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

### Três superfícies de desancoragem

Somando este achado ao caso de Salomon e Gomes (2024), registrado adiante, o
sistema tem **três** superfícies distintas por onde uma afirmação pode perder
ancoragem, e um verificador de saída cobre **uma**:

| Superfície | Exemplo medido | Verificador de saída pega? |
|---|---|---|
| **A geração** | Lee p. 3578, fabricado sem origem | sim, comparando contra o RAG |
| **O prompt** | Saaty p. 271 na regra de limiares, quando a claim está na 248 | **não.** A saída é fiel à instrução |
| **A fonte primária** | Salomon e Gomes (2024) publica "0.5 e 0.8" onde Saaty propõe 0,05 e 0,08; a extração do RAG é fiel ao artigo | **não.** A claim corresponde à fonte |

Verificar a saída contra o contexto recuperado cobre a primeira. As outras duas
exigem **verificar para trás**: o prompt contra a base, e a base contra a fonte
primária. O PVB foi aplicado ao RAG, artigo por artigo, e nunca ao prompt, que é
tratado como configuração e não como conteúdo verificável.

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

**Nota de dependência.** Esta imprecisão é **consequência da imprecisão 1**. Com
o insumo correto, a premissa seria visivelmente falsa. Isso mostra que as classes
não são independentes: um dado de entrada falso induz falha de premissa a jusante.

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

## Pendências de levantamento

1. **Causa da imprecisão 2.** Determinar de onde sai "3 respondentes por
   dimensão". Verificar o payload enviado a `/api/ai-reviewer`.
2. **Reprodutibilidade da imprecisão 5.** Gerar novo parecer e verificar se a
   claim de Ishizaka reaparece no mesmo contexto.
3. **Contagem de execuções.** Este registro tem duas: maio de 2026 (Seção 6.2 da
   dissertação, quatro imprecisões) e 10/09/2026 (cinco). Uma série de três ou
   mais permitiria distinguir imprecisão sistemática de variação estocástica.

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
