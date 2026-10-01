# Parecer IA, nota e veredicto, Fase 1 (medir o alcance): dados da medição

**01/10/2026.** Base do código `d6fc649ace1fe1c2c8fb3f9677cb0b706c11fcb8`. A leitura, as medições e as conclusões ficam em
`docs/imprecisoes-parecer-ia.md`, na seção "Nota e veredicto do Parecer IA, Fase 1 (medir o alcance): o que foi medido, em
01/10/2026". ⚠ **Esta rodada não altera código nem teste, não implementa nenhuma das duas decisões, não gera parecer, não faz
chamada de rede e não consulta produção.** O cliente do modelo é **simulado** (chave falsa), e um `fetch` simulado que lança e
conta registrou **0 chamadas**.

## Os dois modos do instrumento, e o que cada arquivo mede

| Modo | O que faz | Arquivo |
|---|---|---|
| **captura** | o cliente simulado registra o contexto e **interrompe antes da geração** (erro sentinela); o `POST` responde 500 e nada é extraído | `captura.json`, `contextos-capturados/` |
| **texto fixado** | o cliente simulado registra o contexto e **devolve um texto fixado pelo instrumento**; o `POST` conclui (extração, resposta da API) e o componente real é renderizado | `texto-fixado.json` |
| **leitura** | `git grep`, varredura dos arquivos rastreados e leitura do fonte; **sem execução do código medido** | `inventario.json`, `relacionados.json`, `buscas-g-l.saida.txt` |

⚠ **Nenhum modo mede o efeito de retirar o escore sobre o texto GERADO pelo modelo.** Isso exige geração real, que não está
autorizada.

## O que há aqui

| Arquivo ou pasta | O que é |
|---|---|
| `texto-fixado.json` | os 10 textos fixados (entrada integral, extensão e posição da seção editorial), as 7 condições, as 3 apresentações, as **150 células** da matriz, os **12 controles adicionais** do executor, os 2 payloads construídos sem `validation`, e o ambiente |
| `captura.json` | as **7 capturas**: a identidade de cada uma (sha256 do contexto, do `system` e da requisição, tamanhos), o bloco `:1062-1066` e a linha de cada rótulo e de cada frase de interesse |
| `requisicoes.json` | as requisições de cada condição, como entram no tratador real |
| `contextos-capturados/` | o contexto **completo** de cada captura, como texto |
| `resumo.json` | os agregados com denominador: (c), (d), (e), as diferenças entre contextos, e onde cada rótulo e cada motivo aparecem |
| `inventario.json` | as **528 ocorrências** dos seis identificadores, cada uma com objeto, papel e transporte |
| `relacionados.json` | os **38** identificadores relacionados descobertos na leitura (`calculateGrade`, `aiGrade`, `finalNota`, o aparato de elegibilidade, as constantes `MOTIVO_*`, ...), com as ocorrências de produção, de teste e de script |
| `buscas-g-l.saida.txt` | a saída, **comando a comando**, das buscas de leitura das seções (g) a (l) do registro: `git grep`, `grep` e `sed -n`, cada busca **sem resultado** marcada (saída 1) e separada de **falha de comando** (saída 2 ou mais; nenhuma ocorreu) |
| `instrumentos/` | a sonda, o analisador, a varredura, a classificação, a contagem de relacionados e o roteiro das buscas de (g) a (l), como **texto** (o sufixo `.txt` os mantém fora do `tsc` e do jest) |

## Como reexecutar (ambiente observado: Linux x86_64, Node v22.22.2, npm 10.9.7, jest 30.1.3, ts-jest 29.4.6, React 18.3.1)

1. **Sonda** (modos captura e texto fixado): copie `instrumentos/zz-nota-sonda.test.ts.txt` para
   `lib/__tests__/zz-nota-sonda.test.ts` e rode `NOTA_SAIDA=<diretório> npx jest lib/__tests__/zz-nota-sonda`. **Apague** o teste
   temporário antes de qualquer commit: ele não é versionado como teste.
2. **Analisador**: `node instrumentos/analisar-sonda.cjs.txt <diretório>` (renomeie para `.cjs`); lê `sonda.json` do diretório da
   sonda e grava `resumo.json`. O analisador espera `contextos/` ao lado do `sonda.json`.
3. **Varredura e classificação** (na raiz do repositório): `node varredura.cjs <saida.json>`, depois `NOTA_CTX_A=<ctx do
   elegivel-auto-A> node inventario.cjs <diretório com varredura.json>`.
4. **Buscas de (g) a (l)** (na raiz do repositório): `bash instrumentos/buscas-g-l.sh.txt > saida.txt`. O roteiro só lê (`git grep`, `grep`, `sed -n`) e
   imprime, ao fim de cada busca sem resultado, a marca "sem resultado; o comando executou". ⚠ Os números dependem do **commit**: a saída gravada
   aqui foi gerada sobre `d6fc649ace1fe1c2c8fb3f9677cb0b706c11fcb8`, e as buscas por texto sobre `docs/` mudam com o próprio registro.

## Limites (todos repetidos no registro)

- A tela **não é executada**: o componente `ParecerAISection` é **renderizado** por `renderToStaticMarkup`, e o manipulador de
  cópia é o **real**, extraído da árvore do componente e **invocado diretamente**, com `navigator.clipboard.writeText`
  **simulado** e o argumento registrado. ⚠ **Não é clique no navegador e não é cópia para a área de transferência.**
- Os textos fixados são **construídos**: a frequência de cada formato em gerações reais **não está medida**.
- O estado `coerencia_nao_avaliada` **não é produzível** pelo tratador real (a rota sempre calcula a coerência): está
  marcado **CONSTRUÍDO**, por um simulado de `avaliarCoerencia` que devolve `null`.
- Os estados de A.27 `reprovado` e `inconclusivo` foram induzidos por um **sufixo** no texto fixado (que **não** muda a
  extração: 0 de 80 comparações); o estado `nao_confirmado` só existe num payload **montado pelo instrumento**.
- A leitura do transporte 2 dos textos de artigo do RAG é **medida contra uma captura** (`elegivel-auto-A`): vale para aquela
  requisição, e não para toda recuperação.
- ⚠ O instrumento teve **um defeito**, achado antes de aceitar o agregado e corrigido: ver o registro.
