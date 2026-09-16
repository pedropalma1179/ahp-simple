# A.33, passo 3: aplicar H-T como `trechoId`, declarado antes de editar

Declarado em 16/09/2026, **antes de qualquer alteração dos artefatos**. A decisão
de adotar H-T é do autor e não é reaberta aqui. Esta rodada é de **dados**: sem
geração, sem alteração da base de artigos, sem reingestão e sem tocar
configuração.

⚠ **Nada aqui transforma pendência em evidência conferida.** Gravar identidade
torna a conferência de sustentação *possível*; não a executa.

## 1. Base confirmada, e a confirmação foi bloqueio

| O que | Observado |
|---|---|
| Branch da sessão | `claude/loving-shannon-661fy9` |
| `git rev-parse HEAD` antes | `33c1fdf6500242832994a17aa15b0a686704c029` |
| `git status --short` | vazio |
| `git diff HEAD` | vazio |

A branch da sessão começou no topo de `main` e **não continha os commits da
medição aprovada**. Eles estão em `origin/integra/a30-registros`, cujo topo é
`c8b7b2388c262c5c915b5f9c1968f0fca96c378d`. Conferido que
`33c1fdf` **é ancestral** de `c8b7b238` — `git merge-base --is-ancestor`, código
de saída **0** —, a branch foi avançada por `git merge --ff-only`: fast-forward,
**sem descartar alteração alguma**, porque a árvore estava limpa e o topo
anterior está contido no novo.

**HEAD de partida da aplicação:** `c8b7b2388c262c5c915b5f9c1968f0fca96c378d`.
`git status --short` vazio depois do avanço.

Ancestralidade dos commits da medição aprovada, por
`git merge-base --is-ancestor <commit> HEAD`, com o código de saída de cada um —
em Bash é `$?`, e **não se apresenta `$LASTEXITCODE` de PowerShell como medido
nesta sessão**:

| Commit | O que é | Código |
|---|---|---:|
| `195e8a8` | protocolo da medição derivada | 0 |
| `5935579` | medição derivada, 165 unidades | 0 |
| `b3fe3d7` | avaliação da derivada; **é o snapshot medido** | 0 |
| `4f2a42a` | protocolo das duas composições, anterior aos cálculos | 0 |
| `059d3fc` | medição revisada, H-U e H-T | 0 |
| `c8b7b238` | registro do empate e do limite de C1 | 0 |

⚠ **`origin/main` permanece em `33c1fdf` e foi lido, não tocado.**

## 2. Artefatos da rodada anterior, por caminho e por resumo

**SHA do snapshot medido: `b3fe3d7a0c78b8129e185cbce0099ef606fb844e`.**

| Papel | Caminho | SHA-256 do arquivo |
|---|---|---|
| Protocolo anterior aos cálculos (`4f2a42a`) | `docs/dados/a33-identidade-revisada/protocolo.md` | `841f9f19…4059ea65d` |
| Medição (`059d3fc`) | `docs/dados/a33-identidade-revisada/medicao.json` | `a6d5483b…16cc44c96` |
| Rastreabilidade das candidatas (`059d3fc`) | `docs/dados/a33-identidade-revisada/rastreabilidade.json` | `42553ae4…1cd8e8fc1b` |
| Registro da avaliação (`c8b7b238`) | `docs/imprecisoes-parecer-ia.md`, seção "composição revisada por unidade" | — |

Os quatro artefatos de `docs/dados/a33-etapa4/` na árvore de trabalho foram
conferidos por `git diff --quiet b3fe3d7…` e estão **byte a byte iguais ao
snapshot medido**. A execução parte desse estado versionado.

## 3. A composição H-T adotada, transcrita do protocolo de `4f2a42a`

**Ordem dos componentes**, sempre esta:

1. prefixo literal `A33-por-tipo-v2`;
2. `["articleId", <valor tipado>]`;
3. `["tipo", <valor tipado>]`;
4. `["idNativo", <valor tipado>]`;
5. `["versaoSha256", <valor tipado>]`.

Cada componente de 2 a 5 é `JSON.stringify([nome, valorTipado])`. **Separador:**
RS, `U+001E`, byte `0x1E`, entre componentes, **prefixo primeiro e sem separador
final**. RS dentro de texto é escapado pelo JSON como `` e **não ocorre cru
dentro de componente**; a aplicação recusa se ocorrer.

**Codificação:** UTF-8, sem BOM, sem quebra acrescentada.
**Algoritmo do resumo:** SHA-256 **completo**, 256 bits, **64 caracteres
hexadecimais minúsculos**. O resumo é do **conteúdo restante**; **não substitui o
ID nativo**, que fica literal no componente 4.

**Conteúdo resumido em H-T:** `["campos", [[campo, valorTipado], …]]`, na ordem
da tabela, com **campo ausente presente como marcador de ausência**:

| Tipo | Campos, em ordem |
|---|---|
| `key_claims` | `claim`, `verbatim_quote`, `evidence` |
| `thresholds` | `metric`, `operator`, `value`, `unit`, `context`, `evidence` |
| `formulas` | `latex`, `description`, `variables`, `conditions`, `evidence` |
| `limitations` / `recommendations` | valor textual integral, nomeado `texto` |
| `benchmark` | `source_year`, `domain`, `n_respondents`, `n_alternatives`, `n_criteria_total`, `bocr_weights`, `concordance_rate`, `cr_aggregated`, `weight_ratio` |

**Valores tipados:** ausente `["ausente"]`; null `["nulo"]`; string
`["texto", valor]`; boolean `["booleano", valor]`; número finito
`["numero", String(valor)]`, com `-0` explícito; array
`["vetor", valoresNaOrdem]`; objeto `["objeto", [[chave, valorTipado], …]]`.

**Tratamento de ausente:** `["ausente"]` **difere** de null, de string vazia, de
objeto vazio e de vetor vazio. `idNativo` ausente **não recebe substituto**.

**Normalizações:** **nenhuma normalização textual** — sem trim, dobra de espaços,
caixa, acentos, aspas, quebras de linha ou Unicode. A **única** normalização é
estrutural e declarada: chaves de objeto ordenadas pelo `sort()` de strings,
ordem UTF-16, antes de serializar; vetores conservam a ordem de seus valores.
**Posição da unidade no vetor da base nunca entra.** `id` sai do conteúdo
resumido porque já ocupa componente próprio. H-T **não versiona** `usable_as`,
`label`, nem `source_article`.

Valores `undefined`, números não finitos, lacunas de vetor, tipos não previstos e
substitutos UTF-16 isolados são **recusados**.

**O `trechoId` gravado é a composição COMPLETA**, com os quatro componentes e o
prefixo — **não apenas o resumo SHA-256**.

## 4. O que entra no resumo de texto, declarado antes de editar

"Campos de texto" admite leituras diferentes. Esta é a que vale nesta rodada.

**Alcance, por raízes declaradas:**

| Artefato | Raízes |
|---|---|
| `evidencias.json` | `porTrecho[*].dadosOriginais` — os trechos originais |
| `contexto-estatico.json` | `system`; `quatroSecoes[*].textoFormatado` e `…sha256TextoUTF8`; `quatroSecoes[*].referencias[*].referenceDoc`; `outrasTresSuperficies[*].textoFormatado` e `…sha256TextoUTF8` — os textos formatados |
| `C1-recuperacao.json` | `trechos[*].chunk`; `porConsulta[*].consulta`; `porConsulta[*].retornoChunks[*]`; `finalChunksEsperados[*]` — **os textos das cópias de chunks** |

Sob cada raiz é colhido **todo valor do tipo string, em qualquer profundidade**,
com seu caminho.

**Caminhos e ordem de serialização:** chaves de objeto em ordem `sort()` de
strings, UTF-16; vetores na ordem própria; cada string vira o par
`[caminho, valor]`, e o conjunto é serializado por `JSON.stringify`.
**UTF-8**, **SHA-256**, **nenhuma normalização**.

⚠ **Exclusão explícita do `trechoId` novo.** Nenhuma raiz declarada o contém: ele
é irmão de `dadosOriginais`, de `referenceDoc` e de `chunk`. A exclusão é
**estrutural além de declarada**.

⚠ **Os identificadores ANTIGOS continuam no controle**, porque já existiam e são
parte do texto de antes: `dadosOriginais.id`, `chunk.id`,
`chunk.metadata.article_id`, `referenceDoc.id`, `evidence.locator_id` e
`evidence.locator_type`.

**Três resumos por artefato, e eles medem coisas diferentes:**

| Resumo | O que cobre | Esperado |
|---|---|---|
| `sha256Arquivo` | bytes do arquivo inteiro | **muda**: o arquivo ganha um campo |
| `sha256Estrutural` | árvore inteira **com todo `trechoId` removido** | **não pode mudar** |
| `sha256Texto` | apenas as raízes acima | **não pode mudar** |

O estrutural é controle **mais forte** que o de texto: pega também número e
booleano, que o de texto não alcança. Os dois entram, e os dois precisam bater.

⚠ **Relação por item**, em `resumos-texto.json`: um resumo por raiz — 165 em
`evidencias.json`, 150 em `contexto-estatico.json`, 14 em `C1-recuperacao.json` —
para **localizar** a diferença. Resumo único que não bate não diz onde falhou.

⚠ **Recuperação do estado anterior:** pelo **snapshot versionado**, por SHA, com
`git show b3fe3d7a0c78b8129e185cbce0099ef606fb844e:<caminho>`. **O que não vale é
reconstruir o "antes" a partir dos dados já alterados.** Não há conteúdo não
versionado nesta rodada.

## 5. Os resumos de antes

Capturados **antes da aplicação**, vinculados ao SHA e aos caminhos de origem, e
gravados em `docs/dados/a33-identidade-aplicada/resumos-texto.json`, campo
`antes`. `sha256Arquivo` dos três coincide com o que `casos.json` já registrava
em `integridadeDosDados`, o que é conferência por instrumento independente.

| Artefato | `sha256Arquivo` | `sha256Estrutural` | `sha256Texto` | strings |
|---|---|---|---|---:|
| `evidencias.json` | `b977e41f…` | `bdfa9437…` | `bdc54df3…` | 1140 |
| `contexto-estatico.json` | `2a87891f…` | `aa6c7b04…` | `6d4dcf80…` | 692 |
| `C1-recuperacao.json` | `2545c769…` | `08cea498…` | `0220e203…` | 86 |

⚠ **Instrumento novo, primeira execução.** Antes de aceitar os agregados foram
conferidos à mão **três ramos distintos**: os **sete** `sha256TextoUTF8` que o
próprio `contexto-estatico.json` registra, recalculados um a um e **todos
coincidentes**; a unidade 0 de `porTrecho`, que colhe **6** strings —
`claim`, `verbatim_quote`, `evidence.locator_type`, `evidence.locator_id`,
`evidence.quote`, `usable_as` — com `evidence.page` corretamente **fora**, por
ser número; e a claim de Wijnmalen fixada em C1. **Um caso correto não valida
todos os ramos**, e por isso foram três, de naturezas diferentes.

## 6. Contagem de partida e artefatos que serão alterados

**164 elegíveis e 1 exceção**, conferidas contra `medicao.json`:
`principal.total.denominador` **165**, `principal.total.T.cobertura` **164**, e
`principal.total.T.excluidas` com **um** membro — índice **157**,
`saiyed2023_ceoPowerUET`, `empirical_data`, motivo
`nenhum campo quantitativo disponível`.

**532 campos `trechoId` já existentes** serão preenchidos, todos resolvidos por
`enderecoNaBase` contra as 165 unidades do registro, **sem órfão**:

| Artefato | Vetor | Campos |
|---|---|---:|
| `evidencias.json` | `porTrecho[]` | 165 |
| `evidencias.json` | `semIdentificadorRecuperavel[]` | 165 |
| `contexto-estatico.json` | `quatroSecoes[].referencias[]` | 135 |
| `contexto-estatico.json` | `outrasTresSuperficies[].enderecos[]` | 64 |
| `C1-recuperacao.json` | `trechos[]` | 3 |

Medido antes de escrever: **165 unidades distintas alcançadas**, **0 ocorrências
sem unidade no registro**, e a distribuição de ocorrências por unidade é
129 unidades com 3, 35 com 4 e 1 com 5.

**Também muda `casos.json`**, e por consequência mecânica: `integridadeDosDados`
registra o SHA-256 vigente dos três arquivos — conferido e coincidente **antes**
da aplicação, portanto afirmação viva e não registro de época — e
`resumoEvidencias.semTrechoId` passa de **165** para **1**. Nenhum texto
preparado de `casos.json` é reescrito.

## 7. O que NÃO se altera

- `lib/rag/articles/`, a base de artigos.
- O índice; **nenhuma reingestão**, que é A.18.
- **Os textos preparados, em qualquer artefato.**
- O contexto estático fixado, **inclusive Saiyed**, que permanece em
  `outrasTresSuperficies[2].enderecos[2]`, nos três casos. A exclusão é **da
  cobertura de identidade elegível**, não do contexto.
- `.env.local`, configuração e produção.
- `main`.
- As 19 divergências de A.16.
- H-U, que **continua nos artefatos de auditoria** e **não vira identificador**.
- Os campos `identidade` e `motivo` das 165 unidades, que descrevem a ausência de
  **ID nativo na base** — condição que esta rodada não muda, porque H-T é
  identidade **derivada** de versão, e não um ID nativo promovido.

## 8. Duas ressalvas de alcance, e elas entram no registro

⚠ **O controle negativo demonstra independência dos campos de rastreabilidade
variados naquele ensaio**, e **não estabilidade geral**. A sensibilidade à
redação é **deliberada**: corrigir a redação de uma claim muda sua versão.

⚠ **Os campos quantitativos nulos de Saiyed demonstram insuficiência para o
critério de benchmark**, e **não provam defeito na base**.

## 9. Previsão

**Predição não cabe**, e a razão é de alcance: a rodada grava um campo de
identidade em artefatos de preparação e **não altera o contexto entregue ao
modelo**. A preservação do texto é **critério de aceite**, não predição.

⚠ **A predição de A.33 continua não testada**, e passa a ser verificável quando
C1, C2 e C3 forem gerados, o que **não é esta rodada**.
