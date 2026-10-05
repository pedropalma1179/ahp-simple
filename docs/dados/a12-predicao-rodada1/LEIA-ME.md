# Pacote de evidências da predição da rodada 1 (ausência de `vinculoDaExecucao`)

## 1. O que o pacote é e a que rodada pertence

Este diretório reúne as **bases** e os **instrumentos** de que saíram os valores previstos publicados na predição datada da rodada 1 (ausência de `vinculoDaExecucao`, opção 3), e as instruções para recompor esses valores sem os contextos derivados.

A predição está em `docs/imprecisoes-parecer-ia.md`, no bloco que começa na linha 17320 (título "Registro de 04/10/2026: a predição datada da rodada 1 …"). As sete tabelas de previsão estão na seção 5b desse bloco (linhas 17639 a 17719), e os controles de preservação, na seção 3 (linhas 17486 a 17527).

Nomes dos commits desta série, para não os confundir:

- **commit do registro da decisão e da especificação**: `8885c149117a049dcdc0652ec63033fbe4334c53`;
- **commit da predição**: `838212cfe9fae9f42f8c9bfc66d98762fe41def9`;
- **commit do pacote de evidências**: o que acrescenta este diretório (só arquivos novos);
- **commit da retificação**: o seguinte, que só insere um bloco no registro.

O pacote pertence à rodada de 05/10/2026 (UTC): as capturas e as derivações foram feitas entre 02:48Z e 03:09Z, e os arquivos foram reunidos depois, na rodada de retificação e disponibilização das evidências. **Nenhum valor previsto é atualizado por este pacote**, e nada aqui implementa a rodada 1.

## 2. A base do repositório em que as capturas foram feitas

- **Base da rodada:** `5ad478086d0aa4dadd42b6116cb9b96fecb7afe8`.
- **HEAD da sessão no momento das capturas** (05/10/2026, 02:50:57Z a 03:04:37Z): `8885c149117a049dcdc0652ec63033fbe4334c53`, o commit do registro da decisão e da especificação (o `reflog` do clone da sessão o dá como HEAD de 02:34:43Z até a criação do commit da predição, às 03:30:04Z). Fora de `docs/`, ele é igual a `5ad4780`: `git diff --stat 5ad478086d0aa4dadd42b6116cb9b96fecb7afe8 8885c149117a049dcdc0652ec63033fbe4334c53 -- . ':!docs'` não tem saída (conferido na montagem do pacote; o mesmo vale para o commit da predição).
- Os comandos de captura imprimiram `git status` depois de cada execução (a primeira, também antes) e **não mostraram alteração** no repositório.
- Os instrumentos de derivação e de conferência leem **arquivos versionados** e **blobs de `5ad4780`** (`git show 5ad478086d0aa4dadd42b6116cb9b96fecb7afe8:<caminho>`): o clone precisa ter esse commit.

## 3. Ambiente

Ambiente **observado** na rodada de origem e reconferido na montagem do pacote (mesmo contêiner); é registro de execução, **não** afirmação de compatibilidade.

- **Sistema:** Linux 6.18.44-fc-v70 x86_64 (Ubuntu 24.04.4 LTS).
- **Node** v22.22.2; **npm** 10.9.7.
- **Python** 3.11.15, só biblioteca padrão; **git** 2.43.0.
- **Do repositório** (`node_modules`, instalado com `npm ci`): TypeScript 5.9.3 (os `.cjs` o usam para transpilar); ts-jest 29.4.6. **Jest: dois valores medidos, que se contradizem e se conservam:** `package.json` pede `^30.2.0`, o pacote `jest` instalado diz **30.2.0**, e `npx jest --version` imprime **30.1.3** (contradição já registrada em `docs/imprecisoes-parecer-ia.md`, linhas 15966 e 16500 a 16513, e não apurada). O registro da predição cita "jest 30.1.3" (linhas 17614 a 17618).
- **Dependências externas ao repositório:** nenhuma rede, nenhum serviço e nenhuma credencial. As capturas **simulam**, com `jest.doMock`, o cliente do modelo (`@anthropic-ai/sdk`) em todas, e também os de embedding (`voyageai`) e do índice (`@upstash/vector`) nas de `rag-semantic-states`, `a12-diagnostico` e `a33-cadeia-rule`; nas de `vinculo-execucao-fiacao` e `a12-estatisticas-dimensao` o RAG semântico fica desligado (`USE_RAG_SEMANTIC` removida). As "chaves" que os arquivos de captura definem são **valores falsos**, os mesmos que os testes do repositório já usam. A derivação e a conferência só leem arquivos, chamam `git show` e transpilam localmente.
- **Caminho do clone:** os instrumentos executados fixam `/home/user/ahp-simple` (e os `.cjs` leem `node_modules/typescript` dali). Para outro caminho, use um link simbólico.

## 4. Os instrumentos

Todos ficam em `instrumentos/`. Os arquivos `.ts` e `.cjs` têm o sufixo `.txt` para não serem descobertos como teste nem compilados (`tsc` inclui `**/*.ts`); os `.py` mantêm o nome. **Nenhum nome contém `.test.` ou `.spec.`**, e não há diretório `__tests__`. **Os arquivos "executados" são cópias byte a byte dos arquivos da sessão de origem ao fim da rodada** (conferidas com `cmp` na montagem; o `sha256` de cada um está em `MANIFESTO.sha256`). Os cabeçalhos dos arquivos de captura dizem "fora do repositório, não committado": era verdade quando foram escritos, e a cópia é a deste pacote.

**Captura** (jest, tratador real `POST /api/ai-reviewer` sem modificação, clientes simulados). Diretório de execução: a raiz do clone. Comandos: seção 6, passo opcional.

1. `captura-base-1-rag-diag.ts.txt` — **executado**; no original, `captura-base.test.ts`. Captura as 4 condições de `rag-semantic-states` e os 4 casos de `a12-diagnostico`. Variáveis: `CAPTURA_DIR`, `CAPTURA_SAIDA`. Executado em 05/10/2026, 02:50:57Z.
2. `captura-base-2-a33-fiacao.ts.txt` — **executado**; no original, `captura-base-2.test.ts`. Captura C1 a C3 de `a33-cadeia-rule` e os 18 cenários de `vinculo-execucao-fiacao` (7 da classe A, 6 da B e 5 da C). Lê dois arquivos versionados, `docs/dados/a33-etapa4-v2/requisicao-referencia-r2.json` e `docs/dados/a33-etapa4-v2/C1-recuperacao.json`, pela constante `REPO` (`/home/user/ahp-simple/`). Variáveis: `CAPTURA_DIR`, `CAPTURA_SAIDA`, `CAPTURA_ARQ`. Executado às 03:02:56Z.
3. `captura-base-3-est27.ts.txt` — **executado**; no original, `captura-base-3.test.ts`. Captura os 27 cenários de `a12-estatisticas-dimensao`. **Gerado por um script em linha, não arquivado,** a partir de `lib/__tests__/a12-estatisticas-dimensao.test.ts` em `5ad4780`, linhas 295 a 491 embutidas **literalmente** (conferido na montagem: as 197 linhas embutidas são idênticas às do teste); o arquivo gerado é o executado. Lê `docs/dados/a12-estatisticas-dimensao/saida-a/contextos-da-base-35a1506.json`, pela constante `RAIZ`. Executado às 03:04:34Z.
4. `jest.captura.config.cjs.txt` — **executado**; no original, `jest.captura.config.cjs`. Reaproveita `jest.config.js` do projeto e aponta `roots` para `CAPTURA_DIR` (a constante `RAIZ` fixa o clone). Esta é a versão das capturas 2 e 3 (`testMatch` vem de `CAPTURA_ARQ`, com `**/captura-base.test.ts` como padrão); a captura 1 rodou com a versão anterior, que fixava `testMatch: ['**/captura-base.test.ts']`, e a versão deste pacote seleciona o mesmo arquivo quando `CAPTURA_ARQ` não está definida.

**Transpilação e funções não modificadas** (Node; diretório de execução: `$A12_TRAB/derivacao`, seção 6). Dependências: `typescript` do clone e o commit `5ad4780` no histórico.

5. `saidas-das-funcoes.cjs.txt` — **executado** como `saidas-das-funcoes.cjs`, com `node saidas-das-funcoes.cjs`, em 02:48:48Z. Transpila `lib/ai-reviewer/vinculo-execucao.ts` de `5ad4780` (grava `vinculo-execucao-base.cjs`, que **não** faz parte do pacote), executa as funções **não modificadas** e grava `saidas-das-funcoes.json` (V1, e a entrada de V2). Lê `docs/dados/a12-sem-vinculo/fase-a/jsons-entregues/*__controle.json`.
6. `saidas-fiacao.cjs.txt` — **executado** como `saidas-fiacao.cjs`, com `node saidas-fiacao.cjs`, em 03:03:32Z. Usa `./vinculo-execucao-base.cjs` e grava `saidas-fiacao.json` (a entrada de V3).
7. `reverter-27.cjs.txt` — **executado** como `reverter-27.cjs`, com `node reverter-27.cjs`, em 03:05:14Z. Extrai do teste `a12-estatisticas-dimensao.test.ts` de `5ad4780` as funções de reversão (linhas 61 a 63, 127 a 181, 183 a 202 e 216 a 289), transpila (grava `reversao-do-teste.cjs`, fora do pacote) e confere as 27 capturas (V4). Lê `../captura-base/saida3` e `contextos-da-base-35a1506.json`.
8. `esperado-fase1.cjs.txt` — **executado** como `esperado-fase1.cjs`, com `node esperado-fase1.cjs`, em 03:09:02Z (a primeira versão, de 03:08:57Z, falhou com `SyntaxError: Identifier 'expect' has already been declared` e foi remendada por script antes da execução que valeu). Reconstrói, com as funções do próprio teste (linhas 127 a 144, 159 a 165, 183 a 202 e 833 a 862), o contexto esperado de `agregado-5` e `agregado-3` sem vínculo a partir de `docs/dados/a12-estatisticas-dimensao/ctx-agregado-{5,3}-semVinculo.txt` (V5) e grava em `novos/`.

**Derivação e validação** (Python; diretório de execução: `$A12_TRAB/derivacao`, com `.` no caminho de módulos).

9. `deriva.py` — **executado** (criado em 02:49:28Z); é o módulo de gabaritos e de substituições contadas. **Não é executável fora da sessão de origem:** fixa o diretório de trabalho daquela sessão e lê o bloco (a) do prompt da tarefa, que não faz parte do pacote. Use o item 13.
10. `derivar_conjunto1.py` — **executado** (criado em 02:50:08Z; executado também às 02:53:22Z). F2 e P: aplica as substituições às bases e grava os textos derivados em `novos/`. **Histórico:** às 03:07:43Z foram acrescentadas a função `salvar` e as chamadas que gravam os textos derivados em `novos/`, e o script foi executado em seguida; as execuções anteriores rodaram a versão sem esse acréscimo (a lógica de derivação é a mesma). O arquivo do pacote é a versão final.
11. `derivar_conjunto2.py` — **executado** (criado em 03:05:45Z). R, D, 33, F (com V3) e E. Mesmo histórico do item 10 (acréscimo às 03:07:43Z, executado em seguida). Versão final.
12. `validar.py` — **executado** (criado em 02:49:43Z; executado às 02:49:43Z e 02:53:22Z). V1 (gabaritos novos contra as funções não modificadas) e V2 (recompõe os dois controles de classe B do pacote de 02/10 a partir das bases de classe A).

Os itens 9 a 12 **rodam sem alteração** com o módulo `deriva` reconstruído instalado com o nome `deriva.py` no diretório de trabalho.

**Reconstruídos** (não são os executados; identificados pelo nome):

13. `deriva_reconstruido.py` — **reconstruído**: o `deriva.py` executado com **quatro** diferenças, e só elas. (i) `D` vem de `A12_TRAB`, em vez do caminho fixo do diretório de trabalho da sessão; (ii) `REPO` vem de `A12_REPO` (padrão: `/home/user/ahp-simple`); (iii) o bloco (a) é lido de `docs/imprecisoes-parecer-ia.md`, a partir do título do commit do registro da decisão e da especificação, e não do prompt da tarefa; o laço que escolhe o primeiro bloco cercado cuja primeira linha começa por `## DADOS DO SISTEMA — VÍNCULO` é o mesmo; (iv) acréscimo de uma verificação: o bloco (a) tem de ter 571 bytes e o `sha256` `267226e55d0e4d031b324c9a8e2961df9be74b50fa6e217cb70e15f39d99872f`. Cada diferença está marcada no arquivo com `RECONSTRUÍDO`.
14. `conferir_reconstruido.py` — **reconstruído, escrito para esta entrega** (não existia em 05/10/2026 e não foi executado naquela rodada): lê as tabelas publicadas no registro e compara, uma a uma, com o que as bases e os instrumentos produzem; **nunca escreve nem atualiza valor algum**; imprime a divergência e sai com código 1. Dependências: `A12_TRAB` e `A12_REPO`.

## 5. A origem das 38 previsões

O estatuto declarado no registro (linhas 17639 a 17719) foi o ponto de partida, e cada previsão foi **reconferida** na montagem: bytes e `sha256` completos do arquivo de origem contra os valores de base publicados. **Resultado: 38 de 38 iguais.** Em contagem: **11** têm a base no repositório (F2: 7; P: 2; E: 2, por V5) e **27** têm a base em arquivo de captura (R: 4; D: 4; 33: 3; F: 4; E: 12). Hash, tamanho e contagem de linhas **não substituem** o texto-base: cada linha da tabela abaixo aponta o arquivo ou o procedimento que o recompõe.

**Bases já disponíveis no repositório** não são copiadas: o pacote traz a referência, caminho e commit `5ad478086d0aa4dadd42b6116cb9b96fecb7afe8`. Commits que introduziram as fontes versionadas citadas:

| Fonte | Commit que a introduziu |
|---|---|
| `docs/dados/a12-nota-veredicto-fase2/depois/contextos-depois/` | `35a4164bf46c5ca95227df4a3f1d7e9de64d7435` |
| `docs/dados/a12-nota-veredicto-fase2/predicao-contextos.json` | `848d5a484510d6988c564ba0e1ae3cfdf4c99506` |
| `docs/dados/a12-nota-veredicto-fase1/contextos-capturados/` | `93d2e988f3133d6f87678ec518cbe15b31343b40` |
| `docs/dados/a12-sem-vinculo/fase-a/contextos/` | `c8e1da0e3bb34c08a55c8ffb76dc6cae78d9b2cc` |
| `docs/dados/a12-estatisticas-dimensao/ctx-agregado-{3,5}-semVinculo.txt` | `35a15062a64f39085cc6702aaf0e77a600d6f542` |
| `docs/dados/a12-estatisticas-dimensao/saida-a/contextos-da-base-35a1506.json` | `ce81fdab632afab5af6cde2053031b6523e17647` |
| `docs/dados/a33-etapa4-v2/requisicao-referencia-r2.json` | `76b93e8050758a532275c55fa532ccdeb162938f` |
| `docs/dados/a33-etapa4-v2/C1-recuperacao.json` | `c87e33702a7b5bd153bfd7eef5c02cad0877806c` |

**Por seção** (as siglas são as das tabelas do registro; "V1" a "V5" são as validações descritas nas linhas 17629 a 17637):

- **F2** (7). **Base no repositório**, em dois caminhos que coincidem. (a) **Bytes:** `docs/dados/a12-nota-veredicto-fase2/depois/contextos-depois/ctx-<id>.txt` em `5ad4780`. São os contextos do diretório `depois/` da Fase 2, introduzido pelo commit de implementação da Fase 2, e são iguais, em bytes, linhas e `sha256`, ao `previsto` **pré-registrado** em `docs/dados/a12-nota-veredicto-fase2/predicao-contextos.json` (gravado antes do código), que é o que `lib/__tests__/a12-nota-veredicto-fase2.test.ts:437-450` compara. (b) **Procedimento:** `derivar_conjunto1.py` recompõe o mesmo texto a partir de `docs/dados/a12-nota-veredicto-fase1/contextos-capturados/ctx-<id>.txt` (o `antigo.sha256` do JSON pré-registrado confere) por duas trocas do teste (retirar o bloco "Referência Automatizada" e, nas suspensas, trocar o prefixo `SUSPENSA: Nota não calculada: ` por `SUSPENSA: `), e afirma a igualdade com o `previsto`. **Conferida contra:** as duas vias iguais entre si e iguais à base publicada, 7 de 7 (medido na montagem). Nada capturado.
- **P** (2). **Base no repositório:** `docs/dados/a12-sem-vinculo/fase-a/contextos/ctx-sem-exclusao__chave-ausente.txt` e `ctx-com-exclusao__chave-ausente.txt` em `5ad4780`. São as capturas da fase A do diagnóstico de 02/10/2026 com o campo omitido, entre os 60 arquivos do pacote `a12-sem-vinculo`. **Conferida contra** V2 (`validar.py`): a partir de cada uma, as mesmas trocas com o bloco e as frases da classe B recompõem **byte a byte** o controle registrado `ctx-*__controle.txt` do mesmo pacote, 2 de 2.
- **R** (4 previsões, 2 conteúdos: `comResultados` = `misto`; `vazio` = `erro`). **Captura** por `captura-base-1-rag-diag`, 05/10/2026, execução às 02:50:57Z (saídas às 02:51:00Z), em `bases/captura-base/saida/`: o JSON de `messages` (os bytes que o teste hasheia) e o conteúdo da mensagem. **Conferida contra** o `sha256` do JSON: igual a `A12_MESSAGES_COM_CHUNKS` (`71d5a2dc…`, comResultados e misto) e a `A12_MESSAGES_SEM_CHUNKS` (`4f638afb…`, vazio e erro), constantes de `lib/__tests__/rag-semantic-states.test.ts:396-397` (mapeamento nas linhas 414 a 417), 4 de 4; a reserialização do JSON capturado reproduz o JSON byte a byte (`derivar_conjunto2.py`).
- **D** (4). **Captura** pela mesma execução (02:50:57Z), em `bases/captura-base/saida/diag-<caso>-messages.txt`. **Conferida contra** os bytes registrados em `docs/dados/a12-diagnostico/medicao.json` (`quatroCasos[i].executadoAntesDaInterrupcao.bytesDoContexto`: 70188, 69444, 70394 e 70966), 4 de 4; e as 6 linhas de `blocoDeQualidadeNoContexto` registradas ali estão no contexto capturado, 4 de 4 (medido na montagem). **Limite:** o repositório guarda só o tamanho desses quatro contextos, e tamanho igual não prova conteúdo igual.
- **33** (3 previsões, 2 conteúdos: `C2` = `C3`). **Captura** por `captura-base-2-a33-fiacao`, execução às 03:02:56Z (saídas às 03:02:58Z a 03:02:59Z), em `bases/captura-base/saida2/a33-<caso>-messages.txt` e `a33-resumo.json`; entradas versionadas lidas pelo instrumento: `requisicao-referencia-r2.json` e `C1-recuperacao.json`. **Conferida contra** `docs/dados/a33-cadeia-rule/medicao.json` (`montagem.casos[Ci].bytesMessages`: 71994, 70428 e 70428), 3 de 3, e `bytesSystem` 34170 igual ao capturado, 3 de 3. **Limite:** só o tamanho está registrado.
- **F** (4). **Captura** pela mesma execução (03:02:56Z), em `bases/captura-base/saida2/fiacao-<cenário>.txt`. **Conferida contra:** (i) `A-sem` é igual a `A-undefined`, `A-null` e `A-outro-nome`, e a marca `MARCA-QUE-NAO-DEVE-CHEGAR` não está em `A-outro-nome` (`lib/__tests__/vinculo-execucao-fiacao.test.ts:254-255` e `:297-298`); (ii) V3 (`derivar_conjunto2.py`): de `A-sem` e de `A-sem-exclusao-ativa`, as mesmas trocas com o bloco e as frases da classe B recompõem **byte a byte** os controles capturados `B-vinculado` e `B-vinculado-exclusao-5-4-4`; (iii) **`A-sem-lista` e `A-sem-lista-exclusao-ativa`: sem valor registrado no repositório e sem recomposição**; a conferência é só indireta (o mesmo instrumento reproduziu os bytes registrados de `a33-cadeia` e os dois controles de (ii)).
- **E** (14 sem vínculo; as 27 capturas incluem 13 com vínculo, que são controles). **12 por captura** (`captura-base-3-est27`, execução às 03:04:34Z, saídas às 03:04:36Z a 03:04:37Z, em `bases/captura-base/saida3/est27-<cenário>.txt` e `est27-resumo.json`) e **2 com origem no repositório**, `agregado-3-semVinculo` e `agregado-5-semVinculo`: a base é **recomposta** por `esperado-fase1.cjs` (V5) a partir de `docs/dados/a12-estatisticas-dimensao/ctx-agregado-{3,5}-semVinculo.txt` pelas funções do teste (`a12-estatisticas-dimensao.test.ts:833-862`), e é igual à captura byte a byte; a captura fica como conferência. **Conferida contra** V4 (`reverter-27.cjs`): para os 27 cenários, a captura, depois da reversão `paraOTextoAnterior` que o próprio teste aplica, tem `sha256`, bytes e `sha256` do `system` iguais aos de `docs/dados/a12-estatisticas-dimensao/saida-a/contextos-da-base-35a1506.json`, **27 de 27**, com as trocas contadas `{ blocos: 27, prefixos: 9 }`.

**Uma a uma** (a referência é a sigla da seção e a ordem das tabelas do registro; arquivos de captura em `bases/captura-base/…`; "sha256 (12)" são os 12 primeiros caracteres, e os 64 de cada captura estão em `MANIFESTO.sha256`):

| Ref. | Previsão | Origem | Onde está a base | Bytes | sha256 (12) |
|---|---|---|---|---|---|
| F2.1 | `elegivel-auto-A` | repositório | `ctx-elegivel-auto-A.txt` (em `docs/dados/a12-nota-veredicto-fase2/depois/contextos-depois/`) | 70138 | `346d07ed1fe3` |
| F2.2 | `elegivel-auto-F` | repositório | `ctx-elegivel-auto-F.txt` (em `docs/dados/a12-nota-veredicto-fase2/depois/contextos-depois/`) | 70304 | `365f640d7ce4` |
| F2.3 | `disponibilidade-ausente` | repositório | `ctx-disponibilidade-ausente.txt` (em `docs/dados/a12-nota-veredicto-fase2/depois/contextos-depois/`) | 69394 | `a03ef5ceb50e` |
| F2.4 | `disponibilidade-incompleta` | repositório | `ctx-disponibilidade-incompleta.txt` (em `docs/dados/a12-nota-veredicto-fase2/depois/contextos-depois/`) | 70207 | `13ef2d180f0b` |
| F2.5 | `contradicao` | repositório | `ctx-contradicao.txt` (em `docs/dados/a12-nota-veredicto-fase2/depois/contextos-depois/`) | 70514 | `6c0293d8ceb0` |
| F2.6 | `coerencia-nao-concluida` | repositório | `ctx-coerencia-nao-concluida.txt` (em `docs/dados/a12-nota-veredicto-fase2/depois/contextos-depois/`) | 70769 | `e8c89e3eaf6c` |
| F2.7 | `coerencia-nao-avaliada-CONSTRUIDA` | repositório | `ctx-coerencia-nao-avaliada-CONSTRUIDA.txt` (em `docs/dados/a12-nota-veredicto-fase2/depois/contextos-depois/`) | 70452 | `6ef3d2b24f4f` |
| P.1 | `sem-exclusao` | repositório | `ctx-sem-exclusao__chave-ausente.txt` (em `docs/dados/a12-sem-vinculo/fase-a/contextos/`) | 70094 | `eee039f0bb84` |
| P.2 | `com-exclusao` | repositório | `ctx-com-exclusao__chave-ausente.txt` (em `docs/dados/a12-sem-vinculo/fase-a/contextos/`) | 70995 | `4b09690aaa05` |
| R.1 | `comResultados` | captura | `rag-comResultados-messages.json` (em `bases/captura-base/saida/`) | 71028 | `71d5a2dcd602` |
| R.2 | `vazio` | captura | `rag-vazio-messages.json` (em `bases/captura-base/saida/`) | 70691 | `4f638afbcf61` |
| R.3 | `erro` | captura | `rag-erro-messages.json` (em `bases/captura-base/saida/`) | 70691 | `4f638afbcf61` |
| R.4 | `misto` | captura | `rag-misto-messages.json` (em `bases/captura-base/saida/`) | 71028 | `71d5a2dcd602` |
| D.1 | `C-disponivel` | captura | `diag-C-disponivel-messages.txt` (em `bases/captura-base/saida/`) | 70188 | `bc0d203f5e47` |
| D.2 | `C-ausente` | captura | `diag-C-ausente-messages.txt` (em `bases/captura-base/saida/`) | 69444 | `8e5e84869a01` |
| D.3 | `C-incompleta` | captura | `diag-C-incompleta-messages.txt` (em `bases/captura-base/saida/`) | 70394 | `b62c6f4bd389` |
| D.4 | `C-contradicao` | captura | `diag-C-contradicao-messages.txt` (em `bases/captura-base/saida/`) | 70966 | `5c23981652ee` |
| 33.1 | `C1` | captura | `a33-C1-messages.txt` (em `bases/captura-base/saida2/`) | 71994 | `9c4b83489b71` |
| 33.2 | `C2` | captura | `a33-C2-messages.txt` (em `bases/captura-base/saida2/`) | 70428 | `14b0abce5653` |
| 33.3 | `C3` | captura | `a33-C3-messages.txt` (em `bases/captura-base/saida2/`) | 70428 | `14b0abce5653` |
| F.1 | `A-sem` | captura | `fiacao-A-sem.txt` (em `bases/captura-base/saida2/`) | 70155 | `5649a44b16fa` |
| F.2 | `A-sem-exclusao-ativa` | captura | `fiacao-A-sem-exclusao-ativa.txt` (em `bases/captura-base/saida2/`) | 71056 | `61ec6783ac2e` |
| F.3 | `A-sem-lista` | captura | `fiacao-A-sem-lista.txt` (em `bases/captura-base/saida2/`) | 69357 | `6787f3b947d8` |
| F.4 | `A-sem-lista-exclusao-ativa` | captura | `fiacao-A-sem-lista-exclusao-ativa.txt` (em `bases/captura-base/saida2/`) | 70258 | `ae0a2bfcb2c4` |
| E.1 | `agregado-12-gravado-semVinculo` | captura | `est27-agregado-12-gravado-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70562 | `4db9db54104a` |
| E.2 | `agregado-12-semVinculo` | captura | `est27-agregado-12-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70769 | `846c2287cda2` |
| E.3 | `agregado-3-semVinculo` | repositório (V5), com captura de conferência | recomposta de `docs/dados/a12-estatisticas-dimensao/ctx-agregado-3-semVinculo.txt`; conferência: `est27-agregado-3-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70138 | `8b584ef59c37` |
| E.4 | `agregado-5-com-2-desconhecidos-semVinculo` | captura | `est27-agregado-5-com-2-desconhecidos-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70203 | `c5e476e55710` |
| E.5 | `agregado-5-semVinculo` | repositório (V5), com captura de conferência | recomposta de `docs/dados/a12-estatisticas-dimensao/ctx-agregado-5-semVinculo.txt`; conferência: `est27-agregado-5-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70245 | `be3b6f8adc0b` |
| E.6 | `coerencia-nao-concluida-semVinculo` | captura | `est27-coerencia-nao-concluida-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70792 | `c52b30bc10aa` |
| E.7 | `contradicao-semVinculo` | captura | `est27-contradicao-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70538 | `123fd947c4c8` |
| E.8 | `duplo-por-dimensao-semVinculo` | captura | `est27-duplo-por-dimensao-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70245 | `be3b6f8adc0b` |
| E.9 | `elegivel-sem-individualStats-semVinculo` | captura | `est27-elegivel-sem-individualStats-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70245 | `be3b6f8adc0b` |
| E.10 | `elegivel-total-zero-semVinculo` | captura | `est27-elegivel-total-zero-semVinculo.txt` (em `bases/captura-base/saida3/`) | 69417 | `2d088295d188` |
| E.11 | `nao-avaliada-ausente-semVinculo` | captura | `est27-nao-avaliada-ausente-semVinculo.txt` (em `bases/captura-base/saida3/`) | 69423 | `3c49d2ce2203` |
| E.12 | `nao-avaliada-incompleta-semVinculo` | captura | `est27-nao-avaliada-incompleta-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70262 | `133da9c5d082` |
| E.13 | `todos-acima-3-semVinculo` | captura | `est27-todos-acima-3-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70049 | `85b11aa12c62` |
| E.14 | `todos-validos-3-semVinculo` | captura | `est27-todos-validos-3-semVinculo.txt` (em `bases/captura-base/saida3/`) | 70057 | `b0b853fc9690` |

Para R, os bytes e o `sha256` são os do JSON de `messages`; o conteúdo da mensagem está em `rag-<condição>-conteudo.txt`.

## 6. Como reproduzir os valores publicados

Pré-requisitos: seções 2 e 3 (clone em `/home/user/ahp-simple`, no commit do pacote ou posterior, com o histórico e com `node_modules`). A reprodução **não usa rede**, e os contextos derivados vão para um diretório de trabalho **fora do repositório**.

```
RAIZ=/home/user/ahp-simple
PAC=$RAIZ/docs/dados/a12-predicao-rodada1
(cd $RAIZ && sha256sum --quiet -c docs/dados/a12-predicao-rodada1/MANIFESTO.sha256)
export A12_REPO=$RAIZ
export A12_TRAB=$(mktemp -d)
mkdir -p $A12_TRAB/derivacao $A12_TRAB/captura-base
cp -r $PAC/bases/captura-base/. $A12_TRAB/captura-base/
for f in saidas-das-funcoes saidas-fiacao reverter-27 esperado-fase1; do cp $PAC/instrumentos/$f.cjs.txt $A12_TRAB/derivacao/$f.cjs; done
cp $PAC/instrumentos/derivar_conjunto1.py $PAC/instrumentos/derivar_conjunto2.py $PAC/instrumentos/validar.py $A12_TRAB/derivacao/
cp $PAC/instrumentos/deriva_reconstruido.py $A12_TRAB/derivacao/deriva.py
cp $PAC/instrumentos/conferir_reconstruido.py $A12_TRAB/derivacao/
cd $A12_TRAB/derivacao
node saidas-das-funcoes.cjs
node saidas-fiacao.cjs
python3 validar.py
python3 derivar_conjunto1.py
python3 derivar_conjunto2.py
node reverter-27.cjs
node esperado-fase1.cjs
python3 conferir_reconstruido.py
```

O que esperar (saídas **medidas** na montagem do pacote, ambiente da seção 3):

- a conferência do manifesto (`sha256sum --quiet -c`) **não imprime nada** e sai 0, o que mostra que os 80 arquivos do pacote (o manifesto não se inclui) são os do commit do pacote de evidências;
- `validar.py`: `V1 … => IGUAIS` e `V2 => VALIDADO` (os dois controles de classe B recompostos byte a byte).
- `derivar_conjunto1.py` e `derivar_conjunto2.py`: uma linha por previsão, com a base, o previsto e a diferença de bytes; em `derivar_conjunto2.py`, `V3 => VALIDADO`. Os textos derivados ficam em `$A12_TRAB/derivacao/novos/` e **não entram no repositório**.
- `reverter-27.cjs`: `V4: 27 de 27 capturas …` e `trocas contadas: {"blocos":27,"prefixos":9}`.
- `esperado-fase1.cjs`: V5; a igualdade com a captura se confere com `cmp novos/esperado-fase1-agregado-5-semVinculo.txt ../captura-base/saida3/est27-agregado-5-semVinculo.txt` e o mesmo para `agregado-3` (sem saída = iguais).
- `conferir_reconstruido.py`: `CONFERÊNCIA COM O REGISTRO: 190 valores publicados comparados; 190 coincidem; 0 divergem.` Os 190 são: 148 das 38 previsões (base, previsto, diferença de bytes e linhas; para R, o JSON e o conteúdo), 22 controles de preservação, e 20 diferenças de frases, de linhas de exclusão e de linhas do motivo.

**Se algum valor divergir**, a divergência é **relatada**, e o valor publicado **fica como está**: nem o registro nem os testes se ajustam para coincidir com o que a derivação produzir.

**Passo opcional, refazer as capturas** (**não foi executado na montagem do pacote**, e não precisa ser feito para recompor os valores previstos; os comandos são os executados em 05/10/2026). Em `/home/user/ahp-simple`, com `node_modules`, e com as variáveis `RAIZ` e `PAC` do bloco acima:

```
CAP=$(mktemp -d)
cp $PAC/instrumentos/captura-base-1-rag-diag.ts.txt   $CAP/captura-base.test.ts
cp $PAC/instrumentos/captura-base-2-a33-fiacao.ts.txt $CAP/captura-base-2.test.ts
cp $PAC/instrumentos/captura-base-3-est27.ts.txt      $CAP/captura-base-3.test.ts
cp $PAC/instrumentos/jest.captura.config.cjs.txt      $CAP/jest.captura.config.cjs
cd $RAIZ
CAPTURA_DIR=$CAP CAPTURA_SAIDA=$CAP/saida npx jest --config $CAP/jest.captura.config.cjs --runInBand
CAPTURA_ARQ='**/captura-base-2.test.ts' CAPTURA_DIR=$CAP CAPTURA_SAIDA=$CAP/saida2 timeout 600 npx jest --config $CAP/jest.captura.config.cjs --runInBand
CAPTURA_ARQ='**/captura-base-3.test.ts' CAPTURA_DIR=$CAP CAPTURA_SAIDA=$CAP/saida3 timeout 600 npx jest --config $CAP/jest.captura.config.cjs --runInBand
```

Cada execução termina com `PASS` (2, 2 e 1 testes). Uma recaptura é **outra captura**, com data própria: compare os `sha256` dos arquivos gerados com os de `bases/captura-base/` e relate qualquer diferença, sem substituir os arquivos deste pacote.

## 7. O que o pacote não contém

- **Contextos derivados:** nenhum dos textos previstos. Eles se recompõem pela seção 6 e ficam no diretório de trabalho.
- **Prompts de tarefa:** nem o pedido desta rodada nem os anteriores; o texto (a), que o instrumento executado lia do prompt, vem do registro (item 13 da seção 4).
- **Transcrições de sessão.**
- **Os roteiros de avaliação dos predicados dos testes (V6) e o gerador do texto do bloco publicado:** as 38 previsões, os 22 controles e as diferenças conferidas não dependem deles; o resultado de V6 e a contagem de testes que reprovariam ficam como **leitura** do registro, e este pacote não os reproduz.
- **Os módulos transpilados** (`vinculo-execucao-base.cjs` e `reversao-do-teste.cjs`) e os JSON de saída dos instrumentos de derivação: são gerados pela seção 6.

## 8. Estatuto destes arquivos

A partir do commit do pacote de evidências, estes arquivos valem como **artefatos preservados**: não se editam, não se regravam e não se removem. Uma correção entra por **novo registro**, e nunca por alteração destes arquivos.
