# A.33: conferência dos três trechos de C1 contra as publicações

Declarado em 16/09/2026, sobre `e0037f693c5d495ccc15a028a639790a2ee67699`, topo de
`integra/a30-registros`. Rodada de **conferência bibliográfica**: sem geração, sem
alteração da base de artigos, sem reingestão, e **`main` permanece em `33c1fdf`**.

⚠ **Esta rodada não moveu nenhuma unidade de pendente para conferida.** O número
sai da conferência, e a seção 5 registra o que foi observado.

## 1. Base confirmada

| O que | Observado | Código |
|---|---|---:|
| `git fetch origin` | sem erro | 0 |
| Branch | `claude/loving-shannon-661fy9`, no mesmo SHA de `integra/a30-registros` | 0 |
| `git rev-parse HEAD` | `e0037f693c5d495ccc15a028a639790a2ee67699` | 0 |
| `git status --short` | vazio | 0 |
| `git diff HEAD` | vazio | 0 |
| `HEAD == origin/integra/a30-registros` | verdadeiro | 0 |
| `main` em `33c1fdf` | verdadeiro | 0 |

Ancestralidade por `git merge-base --is-ancestor <commit> HEAD`, código **0** em
cada um: `c8b7b238`, `fe095c4`, `307304d`, `d448ebc`, `a84c35b`, `e1bdc6f`,
`25fb2c0`, `46ac135`, `e0037f6`. Comandos em Bash, código por `$?`; **não se
apresenta `$LASTEXITCODE` de PowerShell como medido nesta sessão**.

## 2. Associação, e ela é única nos três

A associação de cada trecho de C1 à sua unidade em `evidencias.json` foi conferida
por **`articleId`, `trechoId` e `enderecoNaBase`**, e nos três deu **exatamente uma**
unidade, com os três campos iguais. **Nenhuma associação ambígua ou ausente.**

| Trecho | Unidade em `porTrecho` | Endereço |
|---|---:|---|
| `saaty1977_scaling` | 47 | `key_claims[0]` |
| `wijnmalen2007_bocr` | 86 | `key_claims[0]` |
| `forman1998_aggregating` | 100 | `key_claims[2]` |

Os **nove campos por trecho** estão em `conferencia.json`, campo `camposExtraidos`.

## 3. Divergências de A.16: nenhum dos três

Medido sobre `comparacaoDosCampos.iguais === false`, que são **19** unidades:
**nenhuma das três** está entre elas, e nas três `verbatim_quote` e
`evidence.quote` são **iguais** na base.

⚠ **A marca é por TRECHO, não por obra**, e o caso mede isso:
`wijnmalen2007_bocr` tem divergências em `key_claims[2]`, `[3]` e `[4]`, e o trecho
de C1 é `key_claims[0]`, que **não** está entre elas. Tratar a obra inteira como
divergente teria bloqueado uma unidade que não é divergente.

## 4. Vias de acesso declaradas, e o que cada uma deu

**Declaradas antes de conferir**, nesta ordem: **PDF em mãos**, **repositório
institucional**, **base assinada**, e **sem acesso**.

⚠ **Não se confere por resumo, por citação de terceiros nem por memória do
conteúdo.** Esta seção registra tentativas, não leituras.

**PDF em mãos:** nenhum. Medido: `git ls-files` não lista `.pdf`; `find` sobre a
árvore, sobre `/home`, `/root` e `/tmp` não achou nenhum PDF de publicação.

**Repositório institucional e base assinada:** o egresso desta sessão passa por um
proxy com política de organização, e **os catorze hosts candidatos foram recusados**.
Probe por `curl -I`, cada um com código HTTP `000` e túnel CONNECT recusado:

`doi.org`, `www.sciencedirect.com`, `www.researchgate.net`, `core.ac.uk`,
`api.semanticscholar.org`, `arxiv.org`, `www.ijahp.org`, `publications.tno.nl`,
`link.springer.com`, `citeseerx.ist.psu.edu`, `www.jstor.org`,
`scholar.google.com`, `openalex.org`, `api.crossref.org`.

Pela outra via de rede, quatro recusas com `EGRESS_BLOCKED`:
`www.sciencedirect.com`, `doi.org`, `scispace.com` e `dl.acm.org`. A recusa do
proxy para `www.researchgate.net` ficou registrada como `connect_rejected`,
*"gateway answered 403 to CONNECT (policy denial)"*. **O README do proxy manda
reportar negação de política em vez de repetir**, e é o que se faz aqui.

**Busca por cópia em acesso aberto:** duas buscas, uma por publicação pendente. Os
resultados devolveram **apenas** páginas de editora e agregador atrás de barreira,
ou **obras de terceiros**. Dois quase-acertos foram **recusados de propósito**:

- *"SAATY 1977: THE BUILDING BLOCKS"*, no IJAHP, é **comentário de Wedley sobre** o
  artigo de 1977, e **não** o artigo. Usá-lo seria citação de terceiros.
- *"Improved BOCR analysis with the AHP/ANP"* e *"Note on getting meaningful BOCR
  results with the ANP software"* são **outras publicações** de Wijnmalen, e não a
  pedida. A rodada anterior já havia recusado a segunda pelo mesmo motivo.

⚠ **Os resumos devolvidos pela busca não foram usados como conteúdo.** Resumo de
buscador é texto de terceiro, e o critério desta rodada o exclui.

**Resultado: sem acesso**, para as duas publicações pendentes.

⚠ **Alcance da busca, e ele é o limite do que se pode concluir:** foram percorridos
os catorze hosts acima e duas buscas por título, em setembro de 2026, a partir
deste ambiente. **Ficaram fora**: bases assinadas por credencial institucional,
acervo físico, pedido ao autor e empréstimo entre bibliotecas. **Não encontrar por
esta busca não demonstra que não exista cópia acessível**, e não é veredito sobre o
texto.

## 5. Regra de agregação da unidade, escrita antes do resultado

**Conferida sem pendência** exige as **quatro** condições, e a falta de qualquer
uma mantém a unidade pendente com o motivo específico:

1. os **dois campos de citação conferem**;
2. a **`claim` é sustentada**;
3. **sem divergência aberta** de A.16;
4. **sem localizador divergente**.

⚠ **A comparação é POR CAMPO.** `verbatim_quote` e `evidence.quote` se conferem por
**correspondência de texto**; a `claim` é **asserção do preparador** e se confere
por o trecho **sustentá-la ou não**. **As duas não se colapsam num resultado único.**

⚠ **Busca sem resultado é "não conferido", nunca "não confere".** A primeira diz que
não se olhou o suficiente; a segunda afirmaria que o texto da base está errado.

⚠ **Página impressa e posição no PDF são coisas diferentes**, e ficam em campos
separados no registro, junto do localizador interno quando houver.

⚠ **"Confere", nos campos de citação, descreve correspondência do RECORTE.** A
sustentação da `claim` é registrada **separadamente**, e **nenhum desses resultados
certifica uma futura afirmação do parecer.**

⚠ **Achar divergência não autoriza corrigi-la aqui**, e escolher entre
`verbatim_quote` e `evidence.quote` é **A.16**, não esta rodada.

## 6. O que NÃO se altera

- `lib/rag/articles/`, a base de artigos.
- Os textos preparados em qualquer artefato, e os `trechoId`.
- O índice, e nenhuma reingestão.
- As 19 divergências de A.16.
- `main`.
- **As quatro conferências anteriores.**
- Nenhuma geração de C1, C2 ou C3, real ou simulada.

## 7. Predição

**Não cabe.** A rodada confere textos contra publicações e **não altera o contexto
entregue ao modelo**. ⚠ **A predição de A.33 segue não testada**, e **conferir
evidência não a testa**: ela só se torna verificável quando C1, C2 e C3 forem
gerados.
