# A.12: `cobertura.restringiu`, filtro aplicado e elementos retirados: dados da medição

**01/10/2026.** Base do código `8e165fb9da51133ccbe1e9d0093680ada67a7ca5`. Predição datada (commit
`c3f33980e07612a57c4f2681b68882e7da2bacfd`, só documento), implementação, erros meus declarados e a medição:
`docs/imprecisoes-parecer-ia.md`, seções "A.12: `cobertura.restringiu`, filtro aplicado e elementos retirados: predição
datada" e "…: o que foi implementado e o que foi medido". ⚠ **Nenhuma consulta a produção, nenhum recálculo, nenhum dado
de produção.** O cliente do modelo é **simulado** (chave falsa, sem rede, captura antes da geração).

## O que há aqui

| Arquivo ou pasta | O que é |
|---|---|
| `contextos-antes-8e165fb.json` | **linhas de base históricas:** por cenário, a linha de cobertura, o sha256 e o tamanho do contexto completo, o sha256 do `system` e o sha256 do corpo da resposta, capturados pelo tratador real no código de `8e165fb`, **antes** de qualquer edição de código desta rodada. **Não é critério de qualidade:** é o que o modelo recebia. Regravar só com procedência |
| `contextos-depois.json` | o mesmo, no código novo |
| `comparacao-antes-depois.json` | por cenário: o contexto depois é o antes **com exatamente a substituição declarada** da linha de cobertura (só a abertura de (b) ou de (d), com a cláusula de R4 idêntica), ou **idêntico**. Resultado de uma comparação temporária, **não é teste versionado** |
| `enumeracao-antes.json`, `enumeracao-depois.json` | a enumeração do **produtor real** (`prepararVinculoDaTela`): 12939 vínculos, a classificação pela tabela dos quatro estados, os seis invariantes e, no "depois", a conferência da abertura da linha de cada um |
| `testes-antigos-contra-codigo-novo.json` | os testes de `8e165fb`, **sem edição**, contra o código novo: os **12** que reprovam, a primeira asserção de cada um, e a comparação com o que a previsão por leitura enumerou |
| `mutantes.json` | os 20 contraexemplos **executados sobre a fonte**: cada um, o estado (`MORTO`) e os testes que o mataram |
| `contextos-depois/` | o contexto **completo** que o tratador real captura depois da mudança em cinco cenários, um por estado: `a-indisponivel` (a), `b-vinculado` e `b-divergente-sobra-no-documento` (b), `c-retirada-parcial-4-para-3` (c) e `d8-menor-com-booleano-false` (d) |
| `instrumentos/` | as sondas temporárias, como **texto** (o sufixo `.txt` as mantém fora do `tsc` e do jest), o comparador, o executor dos mutantes e o contador das execuções do auxiliar `vinculoCom` |

## Como reexecutar (ambiente observado: Linux x86_64, Node v22.22.2, npm 10.9.7, jest 30.1.3)

1. Sonda: copie `instrumentos/zz-cobertura-sonda.test.ts.txt` para `lib/__tests__/zz-cobertura-sonda.test.ts` e rode
   `COB_FASE=antes COB_SAIDA=<diretório> npx jest lib/__tests__/zz-cobertura-sonda` **sobre o código de `8e165fb`** (por
   exemplo, com `git stash` das mudanças de código), e depois `COB_FASE=depois …` sobre o código novo. **Apague** o
   teste temporário antes de qualquer commit. O arquivo `.txt` é **autocontido**: as fatias que copia de
   `a12-estatisticas-dimensao.test.ts` de `8e165fb` já estão nele.
2. Comparador: ponha os dois diretórios em `<raiz>/antes` e `<raiz>/depois` e rode
   `node instrumentos/comparar.mjs.txt <raiz>` (renomeie para `.mjs`).
3. Mutantes: `python3 instrumentos/mutantes-cobertura.py`, na raiz do repositório (ajuste `RAIZ` e `SP`). O script edita a
   fonte e a **restaura**, e confere o sha256 no fim.

## Limites (todos repetidos no registro)

- A tela **não é executada** por teste algum.
- Os 56 cenários são **construídos**: os 27 da saída A reaproveitam as construções dela (cópia literal), e os 29
  controles são montados pelo produtor real ou **à mão**. A enumeração é um **espaço pequeno e construído**, e **não é
  amostra do universo real**.
- ⚠ A sonda teve **um erro de instrumento**, achado antes de aceitar o agregado e corrigido: o primeiro hash do corpo da
  resposta incluía o `timestamp`, o único campo volátil, e dava **0 de 56** iguais. Os arquivos desta pasta vêm da
  sonda **corrigida**, e o corpo é comparado **sem** o `timestamp`.
- **A redação do modelo sobre as frases novas não foi testada.**
- O instrumento que soma as asserções por suíte **não é versionado**.
