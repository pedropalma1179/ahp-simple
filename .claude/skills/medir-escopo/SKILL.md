---
name: medir-escopo
description: Medir o escopo real de uma alteração neste repositório antes de definir a tarefa. Use antes de remover construto, corrigir atribuição repetida ou unificar implementação duplicada. Existe porque cinco levantamentos consecutivos subestimaram o escopo na primeira contagem.
---

# Medir o escopo antes de definir a tarefa

Cinco tarefas consecutivas erraram a contagem inicial:

| Tarefa | Previa | Era |
|---|---|---|
| tabelas de índice aleatório | 4 | **6**, e a sexta incompleta |
| localizador `p. 271` | 1 | **5** |
| `dominanceAnalyzer` | 4 ocorrências | **7** |
| citações a Feldman | 11 | **14** |
| `verbatim_quote` | 1, depois 11 | **21** |

**A causa foi sempre a mesma:** a busca cobriu o arquivo onde o defeito foi visto,
não todos os lugares onde ele pode estar.

## Como medir

**Use `git grep`**, que cobre o repositório rastreado inteiro. Filtre por extensão
em vez de enumerar diretórios:

```
git grep -c TERMO -- '*.ts' '*.tsx' ':!lib/rag/articles'
```

Enumerar diretórios depende de memória. Numa tarefa isso perdeu `scripts/`, que
tinha **dois dos cinco alvos**.

**Conte ocorrências, não linhas.** `git grep -c` conta linhas; uma linha pode ter
o termo duas vezes. Para ocorrências:

```
git grep -o TERMO -- '*.ts' | wc -l
```

Numa tarefa a diferença foi 11 contra 21.

**Rode sem filtro de extensão também.** Numa tarefa isso revelou quinze
ocorrências em `docs/` que nenhuma busca anterior tinha visto.

## Classifique antes de contar

Contagem agregada que mistura casos de gravidade diferente não sustenta decisão.

Numa tarefa, treze divergências entre campos do RAG se dividiam em três tipos, e
**só um chegava ao parecer**. Reportar "treze divergem" sem decompor repetiria o
erro das taxas de localizador, que somavam duas categorias de sentido oposto.

Para cada ocorrência, decida: **é alvo, é caso vizinho com outra causa, ou é o
nome do conceito aparecendo em comentário?**

## Confira a consistência interna antes de aplicar fórmula

Se a correção é aritmética — somar deslocamento, substituir constante — confirme
que **todos os casos de um arquivo estão na mesma situação**.

Numa tarefa, sete artigos tinham `page` em numeração relativa; se algum já
estivesse na do periódico, somar produziria página inexistente. Os sete passaram,
e a fórmula foi validada contra o PDF de um deles antes de aplicar aos demais.

## Importação não prova uso, e ausência de importação não prova ausência de uso

**É a lição central desta revisão, e custou uma especificação errada.**

Ao decidir o que migrar numa remoção de módulo, listei quatro funções pela
**importação externa**. Estava errado nos dois sentidos:

| Função | Importação externa | Uso real |
|---|---|---|
| `eigenvectorMethod` | nenhuma | **é chamado**, pela cadeia `calculateAllWeights → calculateGroupWeights → eigenvectorMethod` |
| `buildPCM` | importado na rota `calculate` | **nunca chamado** ali |

**Siga a cadeia de chamadas**, não a lista de imports:

```
git grep -n NOME -- '*.ts' '*.tsx'
```

e leia cada ocorrência: é declaração, import, ou **chamada**? Depois repita para
quem a chama, até chegar a uma rota, um handler ou um componente.

⚠ **E confirmar a ausência de um mecanismo não prova a ausência da capacidade.**
Verifiquei que um botão não existia e concluí que um caminho era inalcançável. O
caminho existia por outra via, e a validação que o permitia estava declarada como
provisória no próprio código.

## Não conclua a partir do nome

**Nome de identificador é hipótese, não evidência.** Quatro casos medidos:

| Nome | O que fazia |
|---|---|
| `dominanceAnalyzer` | não media dominância entre alternativas |
| `avgCR` | era o máximo, não a média |
| `verbatim_quote` | não era verbatim em treze claims |
| "Skip link" | pulava instruções, não comparações |

Leia o que o handler faz. E leia o campo `notes` dos artigos do RAG antes de
conferir localizador contra PDF: um deles declara que as páginas são de outra
edição, e ignorar isso custou horas de leitura do artigo errado.

## Meça, não conte no fonte

**Contagem que vem do texto do código é hipótese; a que vem da execução é medida.**

`characterization.test.ts` tem dez blocos `test(` no fonte e o jest reporta **30**,
porque parte é gerada em laço.

E antes de declarar que não se pode medir, tente habilitar a medição: num clone o
jest não rodava por falta de `node_modules`, e `npm install` levou 34 segundos.
