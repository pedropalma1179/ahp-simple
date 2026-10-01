# Parecer IA, nota e veredicto, Fase 2 (implementar as decisões): dados da predição

**01/10/2026.** Base do código `93d2e988f3133d6f87678ec518cbe15b31343b40`. A predição, a previsão enumerada de testes, o caso que
a contraria e os limites ficam em `docs/imprecisoes-parecer-ia.md`, na seção "Nota e veredicto do Parecer IA, Fase 2
(implementar as decisões): predição datada, em 01/10/2026".

⚠ **Este é o primeiro de dois commits: só documentos e dados. Nenhum byte de produção e nenhum byte de teste.** ⚠ **Nada aqui é
medição do código novo**, que ainda não existe: tudo é **derivado por regra** a partir de medições feitas sobre o código ANTERIOR
(`93d2e98`), e cada regra está nos instrumentos abaixo. A comparação com o código novo é feita **depois**, no segundo commit, e
**sem ajustar** o que está aqui.

## O que há aqui

| Arquivo ou pasta | O que é | Como foi obtido |
|---|---|---|
| `identidade-da-base.json` | a identidade (sha256 do contexto, do `system` e da requisição, bytes e linhas) das **7 capturas** refeitas sobre `93d2e98`, cada uma comparada com a captura da Fase 1; **7 de 7 idênticas** | **captura**: o cliente simulado registra o contexto e interrompe antes da geração |
| `predicao-contextos.json` | o contexto **previsto** de cada uma das 7 condições: o antigo, menos o bloco `route.ts:1062-1066`, e, nas suspensas, menos o prefixo do rótulo; sha256 e bytes previstos, o bloco retirado, e onde o motivo está antes e depois | **regra** aplicada aos contextos da Fase 1 |
| `predicao-suites.json` | o que as suítes que comparam contexto passariam a medir: os **27** cenários de `a12-estatisticas-dimensao`, os **4** casos de `a12-diagnostico` e as **4** condições de `rag-semantic-states` | **regra** aplicada aos contextos despejados das cópias temporárias das suítes, sobre `93d2e98` |
| `predicao-matriz.json` | o estado da extração, a mensagem e a apresentação previstos nas **150** células da Fase 1 e nos **12** controles adicionais | **regra** aplicada a `docs/dados/a12-nota-veredicto-fase1/texto-fixado.json` |
| `previsao-de-testes.json` | a **previsão enumerada** de testes: os que reprovam, cada um na primeira asserção, os que passam por outra razão que a de antes, e as negativas não alcançadas | **leitura** dos testes e do código, antes de editar |
| `trechos-que-nao-mudam.json` | o sha256 de **9 trechos** que o pedido manda **não mudar** (`calculateGrade`; o extrator com o seu cabeçalho de comentário; o ranking das alternativas; `Elegibilidade` e as quatro causas; `elegivelParaClassificacao`; `handleCopy`; o aviso de A.27; o portão do destaque; o corpo do parecer), cada um localizado por **âncoras de texto**, e não por número de linha | **leitura** do fonte de `93d2e98`; **pré-registro**: o segundo commit confere os mesmos trechos **depois** da edição, contra estes valores |
| `instrumentos/` | os instrumentos, como **texto** (o sufixo `.txt` os mantém fora do `tsc` e do jest) | |

⚠ **Os contextos antigos NÃO são duplicados aqui:** são os de `docs/dados/a12-nota-veredicto-fase1/contextos-capturados/`, e o
sha256 de cada um coincide com o da captura refeita (`identidade-da-base.json`, `identicoAFase1`). ⚠ **Os 21 arquivos da pasta da
Fase 1 NÃO se regravam.**

## As duas regras da predição de contexto

- **T1.** Sai o bloco `route.ts:1062-1066`: as **quatro linhas de saída** (o título "Referência Automatizada", "Pontuação
  automática", "Sugestão automática" e a instrução "IMPORTANTE"), **cada uma com a sua quebra de linha, e nada mais**. As linhas em
  branco vizinhas ficam.
- **T2.** Nas condições de suspensão, o prefixo "Nota não calculada: " sai da frase "…a classificação global está SUSPENSA: …",
  **uma vez** por contexto. A descrição que a segue não muda.

## Como reexecutar (ambiente observado: Linux x86_64, Node v22.22.2, npm 10.9.7, `npx jest --version` imprime 30.1.3, o pacote `jest` instalado é 30.2.0, ts-jest 29.4.6, React 18.3.1)

1. **Contextos previstos** (na raiz do repositório):
   `node docs/dados/a12-nota-veredicto-fase2/instrumentos/prever-contextos.cjs.txt docs/dados/a12-nota-veredicto-fase1/contextos-capturados <saida.json> [<diretório dos previstos>]`
   (copie o script para `.cjs`; o Node só executa `.cjs` por extensão). A saída deve ser **idêntica** a `predicao-contextos.json`.
2. **Matriz prevista**: `node prever-matriz.cjs docs/dados/a12-nota-veredicto-fase1/texto-fixado.json <saida.json>`.
3. **Previsão de testes**: `node previsao-de-testes.cjs <saida.json>`.
   **Trechos que não mudam** (na raiz do repositório, sobre `93d2e98`): `node trechos-que-nao-mudam.cjs <saida.json>`; a saída deve ser
   **idêntica** a `trechos-que-nao-mudam.json`. O script **para** se uma âncora de início não ocorrer exatamente uma vez.
4. **Suítes** (só sobre o commit `93d2e98`): `node criar-copias-de-despejo.cjs` cria as três cópias temporárias
   `lib/__tests__/zz-fase2-dump-*.test.ts`; `FASE2_SAIDA=<diretório> npx jest lib/__tests__/zz-fase2-dump` despeja os contextos em
   `estat27/`, `diag4/` e `rag4/`; depois `node prever-suites.cjs <diretório> <saida.json>`. ⚠ **Apague as cópias antes de qualquer
   commit.** O despejo **não** fica versionado (cerca de 2 MB só nos 27 cenários), porque se regenera; o sha256 de cada contexto
   antigo está em `predicao-suites.json` (`sha256Antigo`).
5. **Captura antiga**: copie `instrumentos/zz-fase2-captura-antiga.test.ts.txt` para `lib/__tests__/zz-fase2-captura-antiga.test.ts`,
   rode `npx jest lib/__tests__/zz-fase2-captura-antiga` com `FASE2_SAIDA` e **apague** o teste temporário.

## Verificações feitas antes de aceitar os agregados (primeira execução dos instrumentos)

- **As 7 capturas antigas são idênticas às da Fase 1**, byte a byte (sha256 do contexto e do `system`): `identicoAFase1` é
  verdadeiro em 7 de 7. O instrumento mede, portanto, o mesmo objeto que a Fase 1 mediu.
- **As cópias de despejo carregam as asserções das suítes originais, e passam sobre o código anterior**: o sha256 de cada contexto
  despejado de `rag-semantic-states` coincide com a constante da própria suíte (`A12_MESSAGES_COM_CHUNKS` e `A12_MESSAGES_SEM_CHUNKS`;
  `igualAConstanteDoTeste` verdadeiro em 4 de 4), e a cópia de `a12-estatisticas-dimensao` conserva a comparação dos 27 cenários com a
  base.
- **O script de criação das cópias reproduz, byte a byte, as três cópias que foram usadas** (conferido com `cmp`), depois de a
  primeira versão ter errado duas âncoras; o erro foi achado por essa conferência e corrigido antes de arquivar o texto.
- **Caso mais visível**, conferido à mão antes de aceitar a regra: o contexto `elegivel-auto-A` (o mais comum): a diferença para o
  contexto antigo é **exatamente** as quatro linhas do bloco, 279 bytes (70417 para 70138), e o sha256 previsto é o do texto assim
  construído.

## Limites (repetidos no registro)

- ⚠ **Predição só sobre o que o modelo RECEBE.** A redação do parecer GERADO **não é testada nem predita**: o cliente é simulado, e
  nenhuma geração real está autorizada.
- A matriz parte de **textos fixados construídos pelo instrumento da Fase 1**: a frequência de cada formato em gerações reais **não
  está medida**.
- ⚠ O estado `coerencia_nao_avaliada` **não é produzível** pelo tratador real; aparece **CONSTRUÍDO**, por simulado de
  `avaliarCoerencia` que devolve `null`, e assim fica marcado.
- ⚠ O estado de A.27 `nao_confirmado` só existe num payload **montado pelo instrumento**, sem `validation`; **não é resposta do
  tratador**.
- Sem chamada de rede, sem geração real, sem consulta a produção, sem recálculo, sem alteração de dado.
