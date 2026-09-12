---
name: prompt-de-saneamento
description: Especificar uma tarefa de saneamento deste repositório antes de executá-la. Use quando for remover construto, corrigir atribuição, unificar implementação duplicada ou alterar o que o Parecer IA recebe. Produz diagnóstico medido, edições ancoradas, bloco do que não alterar, critérios numéricos e predição registrada.
---

# Especificar uma tarefa de saneamento

Formato desenvolvido ao longo de vinte tarefas. Ele existe porque **cinco
levantamentos consecutivos subestimaram o escopo na primeira contagem**, e porque
critérios escritos por leitura em vez de medição pararam três tarefas no meio.

## Antes de escrever

Leia `docs/objetivo-estados-caminho.md`: a tabela do Bloco A tem o escopo já
medido de cada tarefa aberta, e a seção 0.4 tem vinte erros de rota que este
formato evita.

## As seis partes

### 1. CONTEXTO

O que a tarefa faz, em quantos arquivos, e **por que**. Se a justificativa for
"limpeza", pare: aplique o teste de trilho da seção 8 do `CLAUDE.md`.

Inclua o que já foi medido, com data. Se a tarefa nasceu de um achado, diga qual.

### 2. FASE 1 — DIAGNÓSTICO, sem alterar nada

Numere os itens. Cada um é uma medição com **valor esperado explícito**.

- `git rev-parse --short HEAD` e `git status --short`
- `git grep` pelos termos da tarefa, com filtro de extensão e `:!` para excluir
  caminhos. **Conte ocorrências, não linhas**
- **a linha de base das verificações pertinentes ao impacto da tarefa**

⚠ **Selecione as verificações pelo impacto.** Alteração exclusivamente documental
**dispensa testes e build** da aplicação; alteração de tipo pede `npx tsc
--noEmit`; alteração de cálculo pede a suíte inteira e o build.

**Escreva "PARE e avise" onde a divergência muda o escopo, e "REGISTRE" onde só
informa.** Um item que diz PARE numa contagem imprecisa trava a tarefa; um que
diz REGISTRE numa divergência de escopo a deixa passar errada.

### 3. FASE 2 — ALTERAÇÃO

Uma subseção por edição, numerada. Para cada uma:

- o texto exato a buscar, **conferido como único no arquivo**
- o texto que entra
- a razão, quando não for óbvia

Se uma âncora aparece mais de uma vez, diga quantas e como distinguir. Assinaturas
de função servem de âncora quando o corpo é idêntico.

### 4. NÃO ALTERAR

O que fica, **com a razão**. É a parte que mais evita retrabalho.

Inclua o que está registrado como tarefa própria, com a instrução de **não
corrigir de passagem**: o achado se perde.

### 5. CRITÉRIOS DE ACEITE

Numerados, verificáveis, com valores medidos na Fase 1.

- **defina os comportamentos que precisam passar**, em tabela de caso e resultado
  esperado
- **justifique testes removidos ou substituídos**, um a um
- **registre o total observado DEPOIS de executar a suíte** — nunca antecipe o
  número novo
- greps de confirmação, com a contagem esperada
- **`git diff HEAD --stat`** com os caminhos esperados

⚠ **Use `git diff HEAD --stat`, não `git diff --stat`.** O segundo omite o que já
está preparado para commit, e uma remoção por `git rm` não aparece nele.

⚠ **Selecione as verificações pelo impacto.** Alteração só de documentação não
exige build; alteração de tipo exige typecheck; alteração de cálculo exige a suíte
inteira.

⚠ **Simule a edição principal antes de fixar um critério de contagem.** Dois
critérios desta sessão ficaram errados por aritmética não conferida: um previu
queda de uma ocorrência quando eram duas, outro fixou "o número não muda" quando a
edição substituía um termo por outro.

⚠ **Se a linha de base de testes vai mudar, diga QUE vai mudar e por quê — não o
número novo.** Antecipar o total reproduz o erro que a regra acima corrige:
aritmética de exclusão ignora os testes que a mudança exige criar.

### 6. PREDIÇÃO, quando a correção altera o que o modelo recebe

Registrada **antes** da execução, com o caso negativo nomeado e um controle: algo
que a tarefa não toca e deve permanecer.

**Não cabe** onde a correção altera artefato que o modelo não lê: comentário de
código, base para leitura humana, campo em desuso. Aí a verificação é contra a
fonte.

## Fechamento

Observações operacionais: não rodar `npm run lint`, que é proibição permanente;
**executar a reingestão somente no escopo autorizado de A.18, após seus
pré-requisitos e mediante a confirmação configurada em `settings.json`**; salvar
`git diff HEAD > tentativa.patch` antes de reverter.

⚠ **O patch NÃO preserva arquivos não rastreados.** Sozinho não é cópia completa do
trabalho: arquivo novo precisa de `git add -N` antes, ou de cópia manual.

E a mensagem de commit, que deve dizer **o que foi medido**, não só o que mudou.

## Erros deste formato, já cometidos

- **Escrever critério mirando um alvo e medindo em escopo mais largo.** Cinco vezes.
- **Misturar critério mecânico com critério de leitura no mesmo commit.** O segundo
  contamina a conferência do primeiro.
- **Enumerar diretórios em vez de usar `git grep`.** Perdeu `scripts/`, que tinha
  dois dos cinco alvos de uma tarefa.
