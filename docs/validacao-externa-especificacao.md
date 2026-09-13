# Validação computacional externa: especificação da investigação

> **Este documento é a especificação, não o resultado.** O diagnóstico medido está
> em `docs/imprecisoes-parecer-ia.md`, na seção da validação computacional externa.
> Os dois são separados de propósito: aqui ficam escopo, perguntas, restrições,
> decisões pendentes e requisitos; lá ficam as medições e os limites delas.
>
> Criado em 13/09/2026 para preservar a especificação sem transcrever prompt no
> repositório. A decisão de não versionar prompts está na seção 0.4 do âncora.

**Item da fila:** subitem de **A.28**, distinto do problema de sobrescrita de
cenários (F07) que ocupa a mesma linha. ⚠ **Sem posição na fila:** a posição não
está decidida, e nada aqui a decide.

**Objeto:** `app/api/validate-external/route.ts`, `components/ExternalValidation.tsx`
e o microserviço Flask com AhpAnpLib, que **não está neste repositório**.

---

## 1. O que a investigação apura

**Três coisas que precisam ficar separadas**, e o diagnóstico as separa:

1. **sucesso do transporte** — a requisição foi processada;
2. **validade estrutural da resposta** — o corpo tem as grandezas esperadas;
3. **veredito da comparação** — o serviço aprovou ou reprovou.

⚠ **HTTP 200 com reprovação numérica não é, por si só, defeito.** A requisição pode
ter sido processada corretamente e a comparação ter encontrado divergência. **Não é
obrigatório transformar `all_valid: false` em erro HTTP.** O que se apura é se uma
reprovação permite declaração indevida de aprovação, e se uma resposta inválida é
tratada como comparação concluída.

### Ponto A, a citação pronta

O componente oferece um bloco rotulado "Citação para dissertação" com texto
afirmando validação bem-sucedida. **A apurar:** de que condições esse bloco
depende, e se a descrição que ele oferece corresponde ao objeto efetivamente
enviado.

⚠ **Uma matriz reconstruída dos pesos não pode ser apresentada como evidência de
validação dos julgamentos agregados originais.** Não classificar como omissão antes
de estabelecer o que foi enviado e comparado.

### Ponto B, origem das matrizes

`extractMatrices` escolhe entre matrizes persistidas e reconstrução a partir dos
pesos. **A apurar:** o que a seleção demonstra e o que não demonstra.

⚠ **A presença dos campos seleciona o caminho; não demonstra proveniência nem
integridade.** Não comprova, sozinha, que as strings foram interpretadas
corretamente, que todas as matrizes esperadas foram enviadas, que correspondem ao
painel e à execução examinados, nem que o serviço comparou os resultados que a tela
apresenta.

### Ponto C, veredito sem consequência

**A apurar:** o que o veredito da comparação governa na interface, e o que não
governa. **"Ressalva" é eufemismo:** uma matriz que não valida contra a referência
não é ressalva.

### A proveniência da Tabela 7

**Pergunta:** quando e por qual procedimento os valores da Tabela 7 foram obtidos?

⚠ **Não tratar a cronologia como estabelecida.** A afirmação de que a Tabela 7 é
anterior ao recomputo de 13/07/2026 não veio acompanhada de evidência.

**Onde procurar:** arquivos de cálculo, respostas da validação, versões do
manuscrito, backups e logs identificados. A existência de um campo num backup
**seria evidência útil e não provaria** que aquele documento e aquele caminho
produziram a Tabela 7. **A ausência de logs se delimita aos locais e períodos
consultados**, e não se declara em geral.

⚠ **Consequência que fica escrita desde já: a correção futura impede repetição e
NÃO verifica retroativamente a Tabela 7.** Não declarar a T7 verificada por força
de nenhum commit desta linha de trabalho.

---

## 2. Requisitos para a implementação futura

⚠ **Os nove estados abaixo são REQUISITOS da Fase 2, não resultados verificados.**
Nenhum deles foi validado ainda. **Nenhum pode produzir aprovação por coerção,
fallback ou ausência de informação.**

| Estado | Resultado exigido |
|---|---|
| Aprovada, matriz real | comportamento a decidir na parada |
| Aprovada, matriz reconstruída | comportamento a decidir na parada |
| Reprovada, matriz real | sem selo de aprovação, sem declaração de validação bem-sucedida |
| Reprovada, matriz reconstruída | idem, e a descrição do objeto validado corresponde ao que foi enviado |
| Resposta sem `all_valid`, ou com tipo incorreto | não tratada como aprovação |
| Resposta parcial, faltando uma matriz esperada | não tratada como comparação concluída |
| JSON de matriz inválido | falha explícita, não caminho de reconstrução silencioso |
| Falha de transporte | distinta de reprovação |
| Aprovada dentro das tolerâncias declaradas | declaração compatível com o que a tolerância autoriza afirmar |

**Critério de aceite da Fase 2:** reprovação e reconstrução deixam de ser
silenciosas em todos os estados acima; nenhuma declaração de aprovação é emitida sem
veredito de aprovação; a descrição do objeto validado corresponde ao objeto
efetivamente enviado.

**Verificação:** a condição que seleciona o caminho de reconstrução é forçada em
ambiente controlado, **sem tocar em dado de produção**. Typecheck, build e teste.
Não executar `npm run lint`.

---

## 3. Decisões pendentes

⚠ **Nenhuma destas está decidida.** São as opções levantadas, com a recomendação de
partida registrada como recomendação.

1. **Reprovação impede selo de aprovação e declaração de validação bem-sucedida.**
2. **A tela preserva diferenças, tolerâncias e resultados da comparação.** Reprovar
   não é esconder o resultado.
3. **Ausência de matrizes originais** é apresentada como validação dos julgamentos
   indisponível, não como validação com qualificador ausente.
4. **Bloqueio de ranking, exportação ou decisão do gestor exige justificativa
   própria** e não entra por arrasto.
5. **Remover a "Citação para dissertação" inteira.** Ela conflita com o objetivo
   definido na seção 1.3 do âncora, painel de evidências e não gerador de texto, e
   mantém promessa excessiva: uma comparação aprovada dentro de tolerâncias não
   atesta a precisão matemática da implementação em geral.

**Duas perguntas que o diagnóstico abriu e que mudam o escopo da Fase 2:**

- O conjunto esperado de matrizes deve ser exigido completo antes de aceitar o
  resultado como comparação concluída?
- A condição que seleciona o caminho das matrizes persistidas entra no escopo da
  Fase 2, ou vira achado à parte?

---

## 4. Restrições

**Não alterar, em nenhuma fase desta investigação:**

- o cálculo determinístico;
- o serviço externo de validação;
- qualquer documento `calculations` no Firestore: **não recomputar, não migrar, não
  preencher campos retroativamente**;
- o texto da Tabela 7 no manuscrito.
