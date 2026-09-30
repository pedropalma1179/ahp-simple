# A.12: estatísticas por dimensão BOCR, Fase 2 (saída A): dados da medição

**30/09/2026.** Base do código `35a15062a64f39085cc6702aaf0e77a600d6f542`. Predição datada, implementação, erros
meus declarados e a medição: `docs/imprecisoes-parecer-ia.md`, seções "A.12: estatísticas por dimensão BOCR, Fase 2
(saída A): predição datada" e "…: o que foi implementado e o que foi medido". ⚠ **Nenhuma consulta a produção,
nenhum recálculo, nenhum dado de produção.** O cliente do modelo é **simulado** (chave falsa, sem rede, captura
antes da geração).

## O que há aqui

| Arquivo ou pasta | O que é |
|---|---|
| `contextos-da-base-35a1506.json` | **linhas de base históricas:** sha256 e tamanho, em bytes, do contexto completo de **27 cenários** capturados pelo tratador real na base, **antes** da saída A, e o sha256 do `system`. É o que `lib/__tests__/a12-estatisticas-dimensao.test.ts` usa para medir que o contexto novo é o antigo com **exatamente** as substituições declaradas. **Não é critério de qualidade:** é o que o modelo recebia. Regravar só com procedência |
| `comparacao-antes-depois.json` | por cenário: o contexto **depois** é o **antes** com exatamente as substituições declaradas (27 de 27), o corpo da resposta é igual (27 de 27), o `system` é igual (27 de 27) e a linha da Taxa é igual (27 de 27). **Não é teste versionado:** é o resultado de uma comparação temporária |
| `contextos-depois/` | o contexto **completo** que o tratador real captura **depois** da saída A, com e sem `vinculoDaExecucao`: agregado de 12, de 5 e de 3, pedido elegível sem `individualStats`, três respondentes todos válidos (zero críticos **medidos**), três respondentes todos acima de 0.10 (Taxa **medida** em 0.0%) e pedido não avaliado. Os de 5 e de 3 comparam-se, byte a byte, com os quatro da Fase 1 (`../ctx-agregado-*.txt`) |
| `contextos-forcado/` | o contexto do **controle do consumidor latente**, com a **elegibilidade forçada** por `jest.mock` (duplo declarado): `-antes` (código de `35a1506`, Taxa 0.0% derivada do quociente) e `-depois` (a frase da Taxa sem base). ⚠ **Não é caminho alcançável pela API** |
| `instrumentos/` | as sondas temporárias, como **texto** (o sufixo `.txt` as mantém fora do `tsc` e do jest), o executor dos 14 mutantes e o comparador campo a campo |
| `medicao.json` | as saídas resumidas: testes antigos contra o código novo, testes novos contra o código anterior, mutantes, o controle forçado, as linhas de base regravadas e a execução |

## Como reexecutar (ambiente observado: Linux x86_64, Node v22.22.2, npm 10.9.7, jest 30.1.3)

1. Sonda da base: copie `instrumentos/zz-a12-saidaA-base.test.ts.txt` para `lib/__tests__/zz-a12-saidaA-base.test.ts`,
   rode `SAIDA_DIM2=<diretório> npx jest lib/__tests__/zz-a12-saidaA-base` **sobre o código de `35a1506`** (por
   exemplo, com `git stash` das mudanças de código), e **apague** o teste temporário antes de qualquer commit.
2. Controle forçado: idem com `instrumentos/zz-a12-saidaA-forcado.test.ts.txt` e `SAIDA_FORCADO=<diretório>`.
3. Mutantes: `python3 instrumentos/mutantes-saidaA.py`, na raiz do repositório (o script edita a fonte e a **restaura**,
   e confere o sha256 no fim).
4. Linhas de base: `python3 instrumentos/comparar-campos.py <antes.json> <depois.json>`.

## Limites (todos repetidos no registro)

- A tela **não é executada por teste algum:** o passo dela é **cópia literal** de `page.tsx`.
- Os agregados de 3 e de 5 e as variantes são **construídos**; o painel de 12 usa CRs de um painel real, mas o
  agregado é montado pela cópia da tela.
- A sonda da base teve **um erro de instrumento**, achado e corrigido (duas variantes "com vínculo" saíam sem o
  campo); as linhas de base desta pasta vêm da sonda **corrigida**.
- **A redação do modelo sobre as frases novas não foi testada.**
