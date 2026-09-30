# A.12: estatísticas por dimensão BOCR, Fase 1 (medir a origem): dados da medição

**30/09/2026.** Base do código `a07998c953d3c10ed32ef3f436054ba1c12c05a2`. Registro datado, com a leitura de cada
item: `docs/imprecisoes-parecer-ia.md`, seção "A.12: estatísticas por dimensão BOCR, Fase 1 (medir a origem)".
⚠ **Nenhum byte de produção foi alterado.** Nenhuma consulta a produção, nenhum recálculo, nenhum dado de
produção. O cliente do modelo é **simulado** (chave falsa, sem rede, captura antes da geração).

## O que há aqui

| Arquivo | O que é |
|---|---|
| `medicao.json` | as saídas dos cinco instrumentos, montadas por `instrumentos/montar_medicao.py`, e o extrato da cobertura da suíte existente. Cada seção declara se é **medida**, **lida** ou **derivada** |
| `ctx-agregado-5-semVinculo.txt`, `ctx-agregado-5-comVinculo.txt` | o contexto **completo** capturado no tratador real para o agregado de 5 |
| `ctx-agregado-3-semVinculo.txt`, `ctx-agregado-3-comVinculo.txt` | idem, agregado de 3 |
| `instrumentos/*.test.ts.txt` | os quatro instrumentos de teste e o de derivação (IPC), como **texto** (o sufixo `.txt` os mantém fora do `tsc` e do jest) |
| `instrumentos/montar_medicao.py` | monta `medicao.json` a partir das saídas |

Os outros contextos capturados (agregado de 12, "5 com dois desconhecidos", os casos de ramo forçado e de
cobertura parcial) **não são versionados**: `medicao.json` guarda o `sha256` e o tamanho de cada um
(`contextosNaoVersionados`) e os trechos que importam.

## Como reexecutar (ambiente observado: Linux x86_64, Node v22.22.2, npm 10.9.7, jest 30.1.3)

1. O clone precisa de **histórico completo**: `git rev-parse --is-shallow-repository` deve dar `false` (se der
   `true`, `git fetch --unshallow origin`). Sem isso, `git show 4437b3c:lib/ahp-ipc.ts` não existe.
2. Copie cada `instrumentos/zz-a12-dim-*.test.ts.txt` para `lib/__tests__/zz-a12-dim-*.test.ts` (sem o `.txt`).
3. Extraia o IPC de abril-maio de 2026, **removido depois**, para um diretório temporário:
   `mkdir lib/zz-ipc-4437b3c && git show 4437b3c:lib/ahp-ipc.ts > lib/zz-ipc-4437b3c/ahp-ipc.ts && git show 4437b3c:lib/graph-utils.ts > lib/zz-ipc-4437b3c/graph-utils.ts`.
   Os blobs esperados são `e4cde7af7ec21841418f0c2b149f2d38946ec738` (`ahp-ipc.ts`) e
   `02da7b069e80136edf464e814a691345aea0c71e` (`graph-utils.ts`); `git hash-object` deve reproduzi-los.
4. `SAIDA_DIM=<diretório de saída> npx jest lib/__tests__/zz-a12-dim` (19 testes).
5. `python3 instrumentos/montar_medicao.py <diretório de saída> <destino>`, na raiz do repositório.
6. **Apague** os testes temporários e `lib/zz-ipc-4437b3c/` antes de qualquer commit: eles **não** são código do
   projeto, e o IPC removido **não** pode voltar ao repositório.

O extrato de cobertura vem de
`npx jest --coverage --collectCoverageFrom='app/api/ai-reviewer/route.ts' --coverageDirectory=<fora do repositório> --coverageReporters=json`,
rodado **sem** os testes temporários.

## Limites (todos repetidos no registro)

- A tela **não é executada por teste algum**: o passo dela nos instrumentos é uma **cópia literal**.
- Os agregados de 5, de 3 e de "5 com dois desconhecidos" são **construídos**.
- Os valores **gravados** em produção para os doze são **derivados** (IPC de `4437b3c` sobre os julgamentos do
  fixture), com confirmação independente em **3 dos 12**; **não foram lidos**.
- A grade de 32 combinações varia só a **presença** de campos.
