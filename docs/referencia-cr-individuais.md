# Referência: razões de consistência individuais

Computado em 09/09/2026 pelo motor unificado (`lib/ahp-engine.ts`) a partir dos
864 julgamentos brutos em `lib/__tests__/fixtures/panel-2026.json`.

Serve a três usos: critério de verdade para a tarefa A.1, conteúdo da Tabela 4 e
conteúdo do Apêndice G (Tabela 22).

---

## 1. Definições fixadas antes de rodar

**Universo: as seis matrizes não triviais.** BOCR e Magnitude (4×4) e os quatro
blocos de subcritérios (5×5). As vinte matrizes de alternativas são 2×2, e para
n ≤ 2 o CR é zero por construção; incluí-las puxaria qualquer média para baixo
por artefato de dimensão, não por consistência do respondente.

**Média aritmética sobre as matrizes com CR definido.** É a convenção usual em
AHP e é a que `classifyRespondent` (em `response-quality/route.ts`) assume ao
receber `avgCR`. É uma escolha, não uma consequência: o CR é uma razão, e média
de razões admite outras definições.

**Célula vazia para CR indefinido, nunca zero.** Se um respondente pulou
comparações e a matriz caiu no ramo LLSM, o CR pode não estar definido. Zero num
CR significa consistência perfeita, e usá-lo como marcador de ausência é o mesmo
erro que a linha `const status = r.status || 'CONFIÁVEL';` em `resultados/page.tsx` comete com o status.

Neste painel a questão não se aplica: **todos os doze respondentes têm as seis
matrizes completas**, coluna `n` igual a 6 em todas as linhas.

**CR governante: máximo sobre as matrizes com CR definido**, com registro de qual
matriz governou.

---

## 2. Tabela de referência

Valores em porcentagem.

| Resp | BOCR | MAGN | SUB-B | SUB-O | SUB-C | SUB-R | n | médio | governante | matriz |
|---|---|---|---|---|---|---|---|---|---|---|
| R03 | 27,21 | 109,27 | 7,18 | 0,00 | 13,11 | 17,36 | 6 | 29,02 | 109,27 | MAGNITUDE |
| R05 | 19,96 | 52,31 | 46,58 | 26,43 | 63,59 | 57,20 | 6 | 44,34 | 63,59 | SUB-C |
| R04 | 48,02 | 59,03 | 7,80 | 9,44 | 18,71 | 10,35 | 6 | 25,56 | 59,03 | MAGNITUDE |
| R06 | 46,10 | 19,32 | 17,23 | 28,47 | 30,08 | 27,71 | 6 | 28,15 | 46,10 | BOCR |
| R02 | 21,69 | 18,76 | 9,07 | 37,47 | 37,47 | 26,13 | 6 | 25,10 | 37,47 | SUB-O |
| R09 | 25,97 | 31,58 | 0,00 | 0,00 | 9,68 | 18,65 | 6 | 14,31 | 31,58 | MAGNITUDE |
| R10 | 18,00 | 21,99 | 7,52 | 8,80 | 26,34 | 3,08 | 6 | 14,29 | 26,34 | SUB-C |
| R12 | 6,94 | 6,25 | 0,00 | 3,23 | 25,25 | 13,11 | 6 | 9,13 | 25,25 | SUB-C |
| R07 | 9,36 | 25,19 | 19,60 | 12,08 | 9,56 | 15,85 | 6 | 15,28 | 25,19 | MAGNITUDE |
| R11 | 8,45 | 14,41 | 5,22 | 11,14 | 18,88 | 24,02 | 6 | 13,68 | 24,02 | SUB-R |
| R08 | 19,62 | 13,43 | 22,09 | 5,31 | 23,44 | 10,27 | 6 | 15,69 | 23,44 | SUB-C |
| R01 | 1,21 | 5,72 | 8,45 | 0,30 | 11,39 | 0,51 | 6 | 4,60 | 11,39 | SUB-C |

Ordenado por CR governante decrescente. A ordem dos respondentes é a do fixture,
por `completedAt`.

---

## 3. Matriz de confusão entre as duas regras em uso no software

**Regra API**: `classifyRespondent` (em `response-quality/route.ts`) aplicada a
um valor chamado `avgCR`. Limiares 0,05 / 0,10 / 0,15 / 0,20.

⚠ **Esse `avgCR` é a média sobre as 26 matrizes**, incluindo as vinte 2×2 de CR
zero por construção, o que dilui o valor para baixo do limiar. Ver seção 3.1.

**Regra tabela**: `statusFromCR` (declarada dentro de `getRespondentsList`, em `resultados/page.tsx`) aplicada ao CR
**governante**. Limiares 0,10 / 0,15 / 0,20.

| API \ TABELA | CONFIÁVEL | REVISAR | SUSPEITO | CRÍTICO |
|---|---|---|---|---|
| CONFIÁVEL | 0 | 1 | 0 | 1 |
| REVISAR | 0 | 0 | 0 | 3 |
| SUSPEITO | 0 | 0 | 0 | 2 |
| CRÍTICO | 0 | 0 | 0 | 5 |

Concordância: 5 de 12.

As duas regras nunca discordam para menos: a regra da tabela é sempre igual ou
mais severa, o que decorre de o máximo dominar a média. O caso extremo é R12, com
CR médio de 9,13% (CONFIÁVEL pela API) e governante de 25,25% (CRÍTICO pela
tabela).

### 3.1 O que a regra da API realmente recebe

`extractRespondentCRs`, em `response-quality/route.ts`, é uma cascata de
formatos com saída antecipada. A primeira condição a disparar é esta:

```
if (response.responses.avgCR !== undefined) {
  crs.avgCR = safeNumber(response.responses.avgCR);
  if (crs.avgCR > 0) return crs;   // "Já temos tudo!"
}
```

`response.responses.avgCR` é um campo **congelado no Firestore desde a coleta**,
em maio de 2026, gravado por `avaliacao/page.tsx` na submissão. Como existe e é
positivo nos doze respondentes, a função retorna nesse ponto e nenhum caminho
posterior executa. O recálculo pelos julgamentos, mais abaixo na mesma função,
é fallback e nunca dispara neste painel.

**Semântica DETERMINADA.** É a **média aritmética sobre as 26 matrizes do
respondente**, incluindo as vinte de alternativas 2×2, cujo CR é zero por
construção.

Fonte: o próprio manuscrito, na discussão da primeira imprecisão da camada de IA
(Seção 6.2), diz que "a faixa citada corresponde a uma média diluída entre as
vinte e seis matrizes de cada respondente, vinte delas de ordem 2 × 2 e
consistência trivial".

Verificado numericamente contra os 864 julgamentos: desvio médio de **0,13 pp** e
máximo de 0,59 pp, resíduo compatível com a diferença conhecida entre os dois
motores. Comparação com as hipóteses anteriores:

| Hipótese | Desvio médio | Desvio máximo |
|---|---|---|
| **média das 26 matrizes (correta)** | **0,13 pp** | **0,59 pp** |
| média das 6 não triviais | 15,46 pp | 34,70 pp |
| CR governante (máximo das seis) | 35,75 pp | 102,92 pp |
| CR da matriz BOCR | 16,58 pp | 42,35 pp |

**Por que isso importa.** Diluir por vinte matrizes de consistência trivial puxa
qualquer respondente para baixo de 10%, o que é exatamente o que produz a faixa
observada de 1,05% a 9,64% num painel em que 47 das 72 matrizes não triviais
superam o limiar. Não é grandeza com escala própria: é a mesma grandeza,
calculada sobre um universo que a esvazia. É a razão de a seção 1 deste documento
excluir as 2×2.

Hipóteses anteriores, agora descartadas:

**A matriz de confusão acima permanece válida**, porque foi construída aplicando
as duas fórmulas de classificação aos valores corretos computados pelo motor
unificado. O que muda é a legenda: a regra da API, no sistema real, opera sobre o
cache, não sobre a grandeza que seu nome sugere.

### 3.2 Existem três `avgCR` no sistema

| Onde | O que é de fato |
|---|---|
| `avgCR` devolvido por `calculateAllWeights`, em `lib/ahp-ipc.ts` | **máximo** das seis matrizes não triviais; o comentário imediatamente acima do retorno admite o nome errado e registra a renomeação como débito |
| `responses.{doc}.responses.avgCR` no Firestore | congelado na coleta; **média aritmética sobre as 26 matrizes**, incluindo as vinte 2×2 de CR zero. Faixa 1,05% a 9,64% |
| a média aritmética calculada no fim da cascata de `extractRespondentCRs` | **morto por dado, não por desenho** |

O terceiro só é alcançado se a cascata descer, ou seja, se um respondente não
tiver o cache gravado. Um respondente futuro sem esse campo seria classificado
por outra grandeza que os atuais, sem aviso.

**Origem estrutural da divergência.** `getRespondentsList`, em
`resultados/page.tsx`, não é outro array: é `qualityAnalysis.respondents`
reprocessado. Ele recalcula o CR pelos julgamentos (`const recalc =
recalcularCRBocrIndividual(judgmentsById`), reclassifica o status sobre esse CR
(`const statusFromCR = (cr: number): string =>`) e **preserva o `score` vindo da
API** (`score: r.overallScore ?? r.score ?? null`), calculado sobre outra
grandeza. O mesmo registro passa a carregar status de uma grandeza e score de
outra.

---

## 4. Conferência contra a dissertação

**Tabela 22, Apêndice G.** Os 72 valores conferem, um a um, incluindo 109,27% de
R03 em Magnitude e 63,59% de R05 em Custos.

**Tabela 4, corpo.** As doze linhas de CR BOCR conferem. A média geral publicada,
21,04%, corresponde à média aritmética da coluna BOCR.

O motor unificado reproduz as duas tabelas publicadas a partir dos julgamentos
brutos.

**Nenhuma das duas tabelas publica classificação categórica de respondente.** Não
há CONFIÁVEL, REVISAR, SUSPEITO nem CRÍTICO, e não há score de 0 a 100. As duas
reportam CR por matriz e a média.

---

## 5. Observações

**5.1 O CR da matriz BOCR subrepresenta a inconsistência do respondente.** Ela
governa em apenas um dos doze casos. Magnitude governa quatro vezes e Custos
cinco. Reportar o CR da matriz de méritos como indicador de consistência
individual dá leitura sistematicamente otimista. A dissertação publica a T22
completa, então não há erro; a observação é sobre o indicador, não sobre o
trabalho.

**5.2 O `score` e o CR medem construtos diferentes.** O `score` é função do CR
médio, por `classifyRespondent`. O CR exibido ao lado dele na tabela é o
governante. A tela apresenta os dois como se fossem a mesma grandeza.

**5.4 Seis conjuntos de limiares de CR na mesma tela.** cor da coluna de CR na tabela (0,15 e
0,10, sem fonte); rodapé metodológico (0,10 e 0,20, com Forman e Peniwati citado
sem sustentar); painel "Interpretação do CR" (0,10 e 0,15, sem fonte); flags de
`detectPatterns` (0,10 e 0,20, sem fonte); `classifyRespondent` (0,05, 0,10, 0,15
e 0,20); `statusFromCR` (0,10, 0,15 e 0,20). Um oitavo, encontrado depois, no
caminho que monta o payload do parecer.

É evidência de campo de que qualificação de consistência sem fonte prolifera
sozinha. **Recuperar quando a justificativa de ineditismo do Bloco D for
reescrita** (seção 1.6 do documento âncora).

**5.5 Três rótulos de flag sem detector.** O bloco de Tipos de Problemas, aberto pelo comentário
`{/* Tipos de Problemas Detectados */}` em `resultados/page.tsx`, rotula `VALORES_EXTREMOS`, `CONTRADICAO` e
`POUCOS_JULGAMENTOS`, que `detectPatterns` nunca emite. Ou existiram e foram
removidos sem limpar a apresentação, ou foram planejados e nunca implementados.
**Não tomar essa lista como especificação:** o sistema não detecta seis coisas.

`POUCOS_JULGAMENTOS` é o único que aponta para algo real e ausente: completude.
O `calculateAllWeights` já devolve `overallCompleteness` e o
`recalcularCRBocrIndividual` a descarta. Existe um rótulo
sem detector e um detector sem rótulo, e são a mesma coisa. Quando
`overallCompleteness` for trazido, o nome já está decidido.

**5.3 O texto do manuscrito já discute o painel.** Quatro dos doze com CR BOCR
abaixo de 10%, amplitude de 1,21% a 48,02%, média de 21,04%, e quarenta e sete
das setenta e duas matrizes individuais acima do limite. A dissertação trata
isso como achado, com paralelo em Morgan (2017).

Registro que são duas perguntas distintas: se a dissertação sustenta a agregação,
o que a banca já aprovou; e se um revisor de periódico aceita esse painel num
artigo que propõe analisar força da recomendação, o que continua aberto e exigirá
argumento mais explícito.

---

## 6. Pendência aberta

**R12 em SUB-B: `-0,00%`.** Investigado e caracterizado.

A matriz é **perfeitamente consistente**: o desvio relativo máximo de
`a_ij · a_jk = a_ik` é exatamente zero. Os julgamentos formam duas classes,
`B1 = B2 = B3` e `B4 = B5`, com razão 3 entre elas. É a única matriz do painel
nessa condição.

Para matriz perfeitamente consistente, `lambdaMax` é exatamente `n` em aritmética
real. Em ponto flutuante a soma de `A·w` devolve 4,99999999999999822, com
diferença de -1,78e-15, o último bit de um `double`. O CI sai -4,44e-16 e o CR
-3,97e-16. A convergência em duas iterações confirma.

Não é matriz degenerada, não é falha do motor e não é acumulação anômala.

**A pendência é de exibição, não de cálculo.** O motor está correto em não
aplicar clamp. Arredondar para `0,00%` na camada de formatação resolve sem tocar
no cálculo. Não introduzir clamp no motor para isto.

---

## 7. O que este documento não decide

**Qual das duas regras de classificação prevalece, ou se alguma deve existir.**
A tabela é insumo dessa decisão, não a decisão.

Nota para quem retomar: nenhuma classificação categórica de respondente tem
precedente na dissertação. Isso é um fato registrado na seção 4, não uma
conclusão sobre o que fazer.
