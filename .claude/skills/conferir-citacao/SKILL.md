---
name: conferir-citacao
description: Conferir se uma citação atribuída a um autor tem lastro no RAG deste projeto. Use ao auditar um parecer gerado, ao revisar texto da dissertação ou do artigo, e antes de afirmar que uma citação está errada. Cobre o script de apuração, os quatro vereditos e o que cada um permite concluir, mais as armadilhas medidas.
---

# Conferir uma citação contra o RAG

O RAG está em `lib/rag/articles/`, um arquivo por artigo. Cada claim tem `claim`,
`verbatim_quote` e um objeto `evidence` com `page`, `locator_type`, `locator_id` e
`quote`.

## O script

```
node scripts/verify-citations.mjs <arquivo-do-parecer>
node scripts/verify-citations.mjs <arquivo> --json
```

Ele extrai citações no padrão `Autor (ano, p. N)` e classifica em quatro:

⚠ **O script verifica LOCALIZADOR, não conteúdo.** Uma afirmação inventada pode
apontar para uma página que existe, inclusive uma já indexada. **Nenhum veredito
prova que a citação sustenta o que se afirma.**

| Veredito | O que permite concluir |
|---|---|
| `OK` | o localizador coincide com página indexada; **o conteúdo atribuído ainda precisa ser conferido** |
| `DIVERGE_NA_FAIXA` | a página está na faixa do artigo; **o apoio à afirmação permanece não verificado** |
| `DIVERGE_FORA_DA_FAIXA` | incompatibilidade de localização, **sujeita à conferência da edição e da convenção de páginas** |
| `NAO_INDEXADO` | a base não permite verificar a obra |

⚠ **Mantenha separadas três coisas, e o script automatiza parte da primeira:**

1. **verificação do localizador** — a página existe e está onde se diz;
2. **fidelidade da transcrição** — o texto entre aspas é o do artigo;
3. **sustentação da afirmação** — o trecho citado apoia o que o texto afirma.

Desde `33a9485` o `DIVERGE_NA_FAIXA` não entra na taxa de divergência nem dispara
código de saída 1, porque **não indica erro de localizador**. Três citações caíram
nessa categoria: Saaty (2003, p. 85), Saaty (1987, p. 165) e Forman e Peniwati
(1998, p. 169). **Isso não as declara corretas**: declara que o localizador é
plausível e o conteúdo não foi verificado.

## Antes de afirmar que uma citação está errada

**Cinco armadilhas, todas medidas:**

**1. A convenção de página pode divergir entre `page` e `abnt`.** Sete artigos
usavam numeração relativa ao PDF enquanto o `abnt` declara a do periódico;
corrigidos em `23afe43`. Isso fez a apuração reprovar quatro citações corretas.

**2. Leia o campo `notes` antes de abrir um PDF.** O `bozoki2010_ipc.ts` tem `page`
da edição IEEE 2009 e `abnt` da MCM 2010, e o `notes` documenta isso. Conferir
contra o PDF errado custou horas e uma tarefa descartada.

**3. Nenhum dos dois campos de citação é confiável por si.** Treze das 123 claims
divergem entre `verbatim_quote` e `evidence.quote`, **em duas direções**: em sete o
`verbatim_quote` é anotação ou reescrita, em cinco é o `evidence.quote` que está
truncado. Confira os dois.

**4. `description` e `conditions` são texto do indexador, não do artigo.** O
contexto entregue ao modelo não os distingue do `quote`, e um parecer já citou um
`conditions` entre aspas como verbatim.

**5. Uma citação pode ser prefixo do quote e estar correta.** Um parecer citou o
Dodevska truncando antes da segunda notação. Truncar é comportamento esperado;
verificador que compare por igualdade reprovaria citação correta.

## Ao rodar sobre um parecer novo

**Confira à mão o caso mais frequente antes de confiar no agregado.** Três vezes
nesta sessão um instrumento de apuração errou em silêncio, e nas três **o erro
estava no caso mais visível, não numa borda**:

| Erro do instrumento | Achado falso que produziu |
|---|---|
| regex do conectivo `e` sem limite de palavra | divergência virou "artigo não indexado" |
| comparador só lia campos com aspas duplas | verbatim existente virou "fabricado" |
| comparador omitia o campo `verbatim_quote` | fidelidade à base virou "adulteração pelo modelo" |

**Nos três o achado falso tinha a forma do que se esperava encontrar**, e foi isso
que o tornou convincente. Um resultado que confirma a expectativa merece a mesma
conferência que um que a contradiz.

## Onde registrar

`docs/imprecisoes-parecer-ia.md`, com data, hash do commit, duração e o texto
bruto. E se a execução testa uma correção, a **predição tem de estar escrita
antes**.
