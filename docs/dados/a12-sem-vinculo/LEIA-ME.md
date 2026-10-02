# Parecer IA, o caminho sem `vinculoDaExecucao` (rodada só de medição): dados da medição

**02/10/2026.** Base do código `ad2ad0afdc1a972570d3733ccc582d65a719397a`. A leitura, as medições e as conclusões ficam em
`docs/imprecisoes-parecer-ia.md`, na seção "Diagnóstico: o caminho sem `vinculoDaExecucao`, rodada só de medição, em 02/10/2026".
⚠ **Esta rodada não altera código nem teste, não corrige o caminho sem o campo, não decide o comportamento esperado para ele, não gera parecer, não faz
chamada de rede e não consulta produção.** O cliente do modelo é **simulado** (chave falsa), e o `fetch` global, substituído por uma função que lança e
conta, registrou **0 chamadas**. Nenhum modelo foi chamado.

## As quatro técnicas, e o que cada uma mede

| Fase | Técnica | O que mede | O que NÃO mede | Onde |
|---|---|---|---|---|
| **A** | **captura interrompida**: o cliente simulado registra o contexto e lança um erro sentinela antes da geração; o `POST` real responde 500 | o **contexto** que seria enviado ao modelo, e só ele | resposta, apresentação | `fase-a/` |
| **B** | **texto fixado, tratador concluindo**: o cliente simulado devolve um texto fixado e o `POST` real conclui (extração, validação de A.27, corpo) | o **corpo** da resposta | o que um modelo geraria; o estado `nenhum_padrao_reconhecido` da extração; outras causas de suspensão | `fase-b/` |
| **C** | **renderização do componente** real `components/ParecerAISection.tsx` (`renderToStaticMarkup`) com os quatro corpos da Fase B | o HTML que o componente produz com esses corpos | a página no navegador; o conteúdo que um modelo geraria; o comportamento da página completa | `fase-c/` |
| **D** | **leitura** de código e buscas (`git grep`, `grep`, `sed -n`), com o código assistido por máquina onde indicado | a alcançabilidade dentro da árvore de `ad2ad0a` | clientes externos, versão antiga publicada, campo perdido em trânsito: **não avaliado** | `fase-d/` |

⚠ **O transporte é o real, até onde o instrumento alcança:** o payload preparado é serializado com `JSON.stringify` (como a tela, em `page.tsx:1353`), o
**texto** vira o corpo de um `Request` real, e o `POST` real lê `await request.json()`. O instrumento **não** usa simulado de `request.json()` que devolva o
objeto: a omissão da propriedade `undefined` **não é contornada**. Ficam fora do alcance a rede, o `fetch` do navegador e o roteamento do Next.

## O que há aqui

| Arquivo ou pasta | O que é |
|---|---|
| `identidade.json` | a identidade da execução da sonda: `sha256` dos sete arquivos de produção lidos e do instrumento, ambiente, versões instaladas, parâmetros da chamada capturada, natureza dos dados, rede e as ausências declaradas |
| `fase-a/capturas.json` | as **8 capturas** (2 condições de exclusão × 4 variantes do campo): para cada uma, o objeto preparado, o JSON entregue (`sha256`, bytes, se contém a chave), a resposta do tratador à captura, o contexto (`sha256`, bytes, linhas), a chamada ao cliente e a contagem de chamadas de rede |
| `fase-a/contextos/` | o **texto integral** do contexto de cada captura (`ctx-<condição>__<variante>.txt`) |
| `fase-a/jsons-entregues/` | o **JSON que chegou ao tratador**, como texto, por captura |
| `fase-a/objetos-preparados/` | o **objeto preparado**, antes da serialização (`util.inspect`), por captura |
| `fase-a/diffs/` | o `diff` (GNU, formato normal) do contexto do controle contra a variante ausente, por condição (os três diffs de cada condição são idênticos) |
| `fase-a/analise.json` | análise **derivada**: integridade, contagens distintas, classes de equivalência, transporte, diff, frases só do caso ausente (com a **leitura** de cada uma), bloco vazio, menções ao vínculo, identidade conferida |
| `fase-b/corpos/` | o **corpo integral** da resposta nos quatro ensaios (JSON compacto, uma linha) |
| `fase-b/jsons-entregues/`, `fase-b/contextos/` | o JSON entregue e o contexto de cada ensaio. ⚠ Os dois contextos elegíveis são **byte a byte iguais** aos da Fase A sem exclusão (mesmo `sha256`), e ficam repetidos para que o caminho gravado em `execucoes.json` exista |
| `fase-b/execucoes.json` | os quatro ensaios: corpo (`sha256`, bytes, `status`, `timestamp`), enumeração de chaves, mensagem e estado da extração, A.27, contexto |
| `fase-b/analise.json` | análise **derivada**: texto fixado, causa da suspensão, enumeração de chaves, pergunta direta, diff bruto **por byte**, projeção sem `metadata.timestamp`, interação com a suspensão |
| `fase-c/renderizacoes.json` | os quatro ensaios renderizados: `aiReview` montado, estado de A.27, portão do destaque (três condições), o que se exibe |
| `fase-c/html/` | o HTML renderizado de cada ensaio. ⚠ Cada arquivo é a string renderizada **mais um LF final**; o `sha256` de `renderizacoes.json` é o da string, sem o LF |
| `fase-c/analise.json` | análise **derivada**: `aiReview` conferido contra a tela, comparação controle × ausente, resposta direta, busca por menção ao vínculo no componente (com controles positivos), tipo das propriedades |
| `fase-d/analise.json` | leitura de código **assistida por máquina**: os retornos de `prepararVinculoDaTela`, as saídas de `runAiReview` antes do `fetch`, e as **23 âncoras** do pedido, cada uma lida na linha indicada |
| `fase-d/buscas.txt` | a saída, **busca a busca**, de quem chama `POST /api/ai-reviewer` (D3a a D3j), com comando, escopo e código de saída; **sem resultado** (saída 1) separado de **falha de comando** (saída 2 ou mais) |
| `guardas/buscas-6-4.txt` | a saída das buscas da seção 6.4 do pedido (quem lê o registro e o diretório novo): B1 a B7 |
| `guardas/aplicacao.txt` | a aplicação de **cada guarda de redação** ao trecho que o teste examina, com fonte (teste:linhas), escopo nomeado e resultado |
| `instrumentos/` | a **sonda** (`sonda-sem-vinculo.test.ts.txt`) e a **configuração isolada** de jest (`jest.sem-vinculo.config.cjs.txt`), o **analisador** (`analisar-fases.py`), o **aplicador de guardas** (`aplicar-guardas.py`) e os dois **roteiros** de busca (`buscas-fase-d.sh.txt`, `buscas-guardas.sh.txt`). O sufixo `.txt` mantém a sonda e a configuração fora do `tsc` e do jest |

## Como reexecutar (ambiente observado: Linux x64, Node v22.22.2, npm 10.9.7)

⚠ **Nada disto é versionado como teste, e nada fica em caminho coletado pela suíte.** A sonda roda **fora** de `lib/`, com configuração **isolada**: a
`jest.config.js` do projeto não é editada, só reaproveitada (mesmo `preset` ts-jest, mesmo `transform`, mesmo mapeamento de `@/`), com `roots` e `testMatch`
apontando só para o diretório da sonda.

1. **Sonda** (a partir da raiz do repositório, com `npm ci` feito e o commit `ad2ad0a` em checkout):

   ```
   SONDA=$(mktemp -d); SAIDA=$(mktemp -d)        # FORA do repositório
   cp docs/dados/a12-sem-vinculo/instrumentos/sonda-sem-vinculo.test.ts.txt  $SONDA/sonda-sem-vinculo.test.ts
   cp docs/dados/a12-sem-vinculo/instrumentos/jest.sem-vinculo.config.cjs.txt $SONDA/jest.sem-vinculo.config.cjs
   SONDA_DIR=$SONDA SONDA_SAIDA=$SAIDA npx jest --config $SONDA/jest.sem-vinculo.config.cjs --runInBand
   ```

   A sonda grava em `$SAIDA` a mesma árvore de `fase-a/`, `fase-b/`, `fase-c/` e `identidade.json`. Em outro commit que não `ad2ad0a`, os arquivos de
   produção lidos podem diferir da base, e o analisador (passo 2) o acusa pela identidade.
2. **Analisador** (raiz do repositório; lê só os artefatos e `git show` da base; sai 1 e diz o que diverge):
   `python3 docs/dados/a12-sem-vinculo/instrumentos/analisar-fases.py` (confere e **regrava** `*/analise.json` e `fase-a/diffs/`; com `--so-conferir`, não grava).
   Para uma saída nova: `cp -r docs/dados/a12-sem-vinculo/instrumentos $SAIDA/` e `... analisar-fases.py --dados $SAIDA --so-conferir`.
3. **Buscas** (só leitura): `bash docs/dados/a12-sem-vinculo/instrumentos/buscas-fase-d.sh.txt` e `bash .../buscas-guardas.sh.txt`.
4. **Guardas** (depois de qualquer alteração em `docs/`): `python3 docs/dados/a12-sem-vinculo/instrumentos/aplicar-guardas.py`.

**Dependências:** Node (medido com v22.22.2; o CI usa 24.x), npm, os pacotes do `package-lock.json` do projeto (jest, ts-jest 29.4.6, `react` e `react-dom` 18.3.1,
`@anthropic-ai/sdk` 0.95.1; o `@/` é resolvido pelo próprio `jest.config.js`), **Python 3** (medido com 3.11), `git`, **GNU `diff`** (diffutils), `bash` e `node`
(o analisador executa um controle de `JSON.stringify`). Nenhuma rede, nenhuma chave real.

## Metadados: disponíveis, ausentes e não aplicáveis

| Metadado | Estado |
|---|---|
| código medido, instrumento, ambiente, versões instaladas | **disponíveis** em `identidade.json` (e conferidos contra a base pelo analisador) |
| versão do jest | **contraditória, e conservada**: os `package.json` de `jest`, `jest-cli` e `@jest/core` instalados dizem `30.2.0`, e `node_modules/.bin/jest --version` imprime `30.1.3`; a causa não foi apurada |
| modelo, versão do modelo real | **não aplicável**: o cliente foi simulado. O rótulo "Análise por …" no HTML vem de `metadata.model` do corpo, que é a configuração da rota |
| `temperature`, `top_p`, `top_k` | **não são enviados** (conferido na lista de chaves da chamada capturada); `seed` não existe na chamada |
| latência, custo, tokens | **não se aplicam** (nenhuma chamada de inferência) |
| dados | **sintéticos**: quatro respondentes (CR 0,05), documento de cálculo sintético, resumos derivados de etiquetas; a tela não foi executada |
| execução 1 da sonda | **não arquivada** (versão anterior do instrumento, sem as versões de pacote em `identidade.json`); a comparação entre as três execuções está no registro |

## Ao ler os artefatos

- **A palavra "vinculo" nos contextos:** o título sintético do projeto, que a sonda forneceu, é "Projeto da sonda sem vinculo" (linha 4 de todos os contextos). A contagem
  de menções que a sonda registra em `capturas.json` (`mencoesAoRadicalVinculo`: 1 no contexto ausente, 8 e 9 no controle) **inclui** essa ocorrência; `fase-a/analise.json`
  separa, linha a linha, o texto do sistema (0 no ausente, 7 e 8 no controle).
- **Comprimentos:** os campos `caracteres` da sonda são unidades UTF-16 (o `length` do JavaScript); o analisador, em Python, conta pontos de código quando diz `pontosDeCodigo`
  (os três emojis dos títulos do texto fixado valem 2 no JavaScript: 356 contra 353).
- **Os corpos da Fase B são JSON compacto de uma só linha.** Um diff por linha só diria "a linha difere"; a comparação bruta de `fase-b/analise.json` é **por byte**. Os corpos
  **não são byte a byte idênticos** entre controle e chave ausente: diferem só em `metadata.timestamp`, e a igualdade vale para a **projeção** que exclui esse campo e nenhum outro.
- **Os `.diff`** são a saída de `diff` entre dois contextos longos, com muitas linhas em branco; **qual linha em branco o `diff` alinha é escolha dele**. As frases
  "só no caso ausente" de `fase-a/analise.json` vêm da diferença de multiconjuntos de linhas **não brancas**, que não depende desse alinhamento.
- **O `aiReview` e os HTML:** `Análise por <modelo>` e "baseada em 138 referências científicas de 36 artigos (RAG)" vêm de `metadata.model` e `metadata.knowledgeBase` do corpo
  (configuração da rota e da base estática). O texto da revisão é o **texto fixado** pelo instrumento, e não saída de modelo.

## Limites (todos repetidos no registro)

- A tela **não é executada**: o componente é **renderizado**, com `aiReview` montado como a tela monta (`page.tsx:1363-1371`). **Não** é a página no navegador, e quatro renderizações com texto
  fixado **não** sustentam nenhuma afirmação sobre o que o gestor vê na página completa.
- Os textos e os dados são **construídos**: nada aqui diz o que um modelo geraria com o contexto ausente ou com o do controle.
- Dos três estados da extração só dois foram exercidos; uma só causa de suspensão; a condição com exclusão só na Fase A; só `vinculado`, `undefined`, `null` e chave ausente para o campo.
- A Fase D é **leitura**: o que existe fora da árvore (cliente externo, versão antiga publicada, campo perdido em trânsito) fica **não avaliado**, e não ausente.
- ⚠ Os instrumentos tiveram **defeitos de primeira execução**, achados e corrigidos antes de aceitar o agregado: ver o registro ("Achados sobre os instrumentos desta rodada").
