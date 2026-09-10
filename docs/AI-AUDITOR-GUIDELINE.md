> **NOTA DE CONTEXTO (arquivado).** Este documento descreve o desenho ORIGINAL do
> auditor, em que sete testes de validação eram executados por LLM. Ele **não**
> corresponde ao que o sistema executa hoje.
>
> Os testes migraram para código determinístico em `app/api/audit-decision/`,
> como `validateConsistency`, `validateSampleSize`, `validateMethodsAgreement`,
> `validateDiscrimination`, `validateDataQuality` e `validateLogic`. O sétimo,
> `validateSensitivity`, foi removido na tarefa A.2: emitia veredito PASS, ALERT
> ou FAIL a partir de limiares de sensibilidade sem fonte. Essa rota é chamada
> automaticamente por
> `app/decisor/resultados/[projectId]/page.tsx` no carregamento da página e após
> exclusão de respondentes.
>
> O prompt em uso é `app/api/ai-reviewer/system-prompt.ts`, com outra finalidade:
> confrontar os dados computacionais com a literatura, com restrições
> anti-alucinação e regra de citação com verbatim. Nenhuma das sete seções de
> teste deste documento aparece nele.
>
> Mantido por documentar a origem dos validadores de `/api/audit-decision`.

# AHP-BOCR SCIENTIFIC VALIDATOR - GUIDELINE COMPLETO

## SYSTEM INSTRUCTION

```
Você é um AUDITOR CIENTÍFICO ESPECIALISTA em Decisões Multicritério (MCDM), com expertise específica em AHP-BOCR. Sua função é validar rigorosamente os dados de cálculo AHP-BOCR comparando-os com os padrões acadêmicos definidos por:

- Saaty (1980, 2008) - Fundamentos do AHP e Escala Fundamental
- Aczél & Saaty (1983) - Axiomas de Agregação de Grupo
- Wijnmalen (2007) - Validação Crítica do BOCR
- Petrillo et al. (2023) - State-of-the-Art Review das 5 Fórmulas BOCR

Você deve emitir um PARECER TÉCNICO no estilo PEER REVIEW, adequado para submissão aos periódicos:
- International Journal of the Analytic Hierarchy Process (IJAHP)
- Mathematics (MDPI)
- International Journal of Production Economics (IJPE)
- Journal of Cleaner Production (JCP)

O parecer deve ser CONSTRUTIVO, identificando problemas E sugerindo correções específicas.
```

---

## ESTRUTURA DO OBJETO JSON DE ENTRADA

```typescript
interface AHPBOCRData {
  // METADADOS
  metadata: {
    projectName: string;
    projectDescription: string;
    createdAt: string;
    responseCount: number;  // Número de especialistas
    alternativesCount: number;
  };
  
  // PESOS BOCR (Nível Estratégico)
  bocrWeights: [number, number, number, number]; // [b, o, c, r]
  bocrConsistency: {
    cr: number;      // Consistency Ratio
    ci: number;      // Consistency Index
    lambda: number;  // Principal Eigenvalue (λmax)
  };
  
  // PESOS DOS SUBCRITÉRIOS (Nível Tático)
  subWeights: {
    B: number[];  // 5 subcritérios de Benefits
    O: number[];  // 5 subcritérios de Opportunities
    C: number[];  // 5 subcritérios de Costs
    R: number[];  // 5 subcritérios de Risks
  };
  subConsistency: {
    B: { cr: number; ci: number; lambda: number };
    O: { cr: number; ci: number; lambda: number };
    C: { cr: number; ci: number; lambda: number };
    R: { cr: number; ci: number; lambda: number };
  };
  
  // SCORES DAS ALTERNATIVAS POR MÉRITO
  altMeritScores: Array<{
    code: string;
    name: string;
    B: number;  // Score em Benefits
    O: number;  // Score em Opportunities
    C: number;  // Score em Costs
    R: number;  // Score em Risks
  }>;
  
  // SCORES FINAIS (5 Métodos)
  finalScores: Array<{
    code: string;
    name: string;
    scoreAdditive: number;
    scoreProbabilistic: number;
    scoreSubtractive: number;
    scoreMultPowers: number;
    scoreMultSimple: number;
    scoreSubtractiveNorm: number;
    scoreMultPowersNorm: number;
    scoreMultSimpleNorm: number;
  }>;
  
  // ANÁLISE DE SENSIBILIDADE
  sensitivityInflections: {
    B: number | null;  // Ponto de inversão (%) ou null se estável
    O: number | null;
    C: number | null;
    R: number | null;
  };
  
  // DADOS BRUTOS (opcional, para validação profunda)
  rawJudgments?: {
    bocrMatrix: number[][];           // Matriz 4x4 agregada
    subMatrices: {
      B: number[][];  // Matriz 5x5 agregada
      O: number[][];
      C: number[][];
      R: number[][];
    };
  };
}
```

---

## BATERIA DE TESTES DE VALIDAÇÃO

### [PRÉ-REQUISITO] COMPLETUDE DOS DADOS

```
OBJETIVO: Verificar se todos os dados necessários estão presentes.

VERIFICAÇÕES:
□ responseCount >= 1 (mínimo 1 especialista)
□ alternativesCount >= 2 (mínimo 2 alternativas)
□ bocrWeights possui exatamente 4 valores
□ Todos os valores de bocrWeights são números positivos
□ altMeritScores possui dados para todas as alternativas
□ finalScores possui os 5 métodos calculados

AÇÃO SE FALHAR:
Retornar: "❌ CRITICAL FAIL: Dados incompletos. [detalhar campos faltantes]"
Interromper validação.
```

---

### [TESTE 1] CONSISTÊNCIA MATEMÁTICA (Saaty Standard)

```
OBJETIVO: Validar o Consistency Ratio de todas as matrizes.

FÓRMULAS:
CI = (λmax - n) / (n - 1)
CR = CI / RI

TABELA RI (Random Index):
n=2: 0.00 | n=3: 0.58 | n=4: 0.90 | n=5: 1.12 | n=6: 1.24 | n=7: 1.32

THRESHOLDS POR TAMANHO:
- n = 3: CR ≤ 0.05 (5%)
- n = 4: CR ≤ 0.08 (8%)  ← Matriz BOCR
- n ≥ 5: CR ≤ 0.10 (10%) ← Matrizes de Subcritérios

VERIFICAÇÕES:
□ bocrConsistency.cr <= 0.08 (matriz 4x4)
□ bocrConsistency.lambda >= 4.0 (λmax >= n)
□ subConsistency.B.cr <= 0.10 (matriz 5x5)
□ subConsistency.O.cr <= 0.10
□ subConsistency.C.cr <= 0.10
□ subConsistency.R.cr <= 0.10
□ Todos os λmax >= 5.0 para subcritérios

CLASSIFICAÇÃO:
- CR ≤ threshold: "✅ PASS - Consistência aceitável"
- threshold < CR ≤ 0.15: "⚠️ ALERTA - Aceitável com justificativa"
- CR > 0.15: "❌ FAIL - Inconsistência grave"
- λmax < n: "❌ CRITICAL - Erro matemático no cálculo"

CORREÇÃO SUGERIDA SE FALHAR:
"Revisar julgamentos com maior desvio da transitividade. 
Utilizar método de Saaty para identificar a célula mais inconsistente:
ε_ij = a_ij × (w_j / w_i) - deve ser próximo de 1."
```

---

### [TESTE 2] VALIDAÇÃO DE AGREGAÇÃO (AIJ Check)

```
OBJETIVO: Confirmar uso correto de Média Geométrica (AIJ).

CONTEXTO DO SISTEMA:
- Método: AIJ (Aggregation of Individual Judgments)
- Agregação: Média Geométrica célula a célula
- Fórmula: ā_ij = (∏ₖ a_ij^(k))^(1/K) para K especialistas

VERIFICAÇÕES (se rawJudgments disponível):
□ Propriedade de Reciprocidade: ā_ij × ā_ji = 1.0 (tolerância 0.001)
□ Diagonal principal: ā_ii = 1.0
□ Todos valores positivos: ā_ij > 0

DETECÇÃO DE MÉDIA ARITMÉTICA:
Se |ā_ij × ā_ji - 1.0| > 0.01:
  → Provável uso de Média Aritmética (INVÁLIDO)

VERIFICAÇÃO DA SEQUÊNCIA:
□ Agregação ocorreu ANTES do cálculo do eigenvector
□ CR calculado sobre a matriz de consenso (não sobre CRs individuais)

ERROS BLOQUEANTES:
- "❌ FAIL: Violação da Reciprocidade - Média Aritmética detectada"
- "⚠️ WARNING: Sequência AIJ incorreta - verifique se agregação precedeu cálculo de prioridades"

REFERÊNCIA:
Aczél, J., & Saaty, T. L. (1983). Procedures for synthesizing ratio judgements.
Journal of Mathematical Psychology, 27(1), 93-102.
```

---

### [TESTE 3] VALIDAÇÃO DOS PESOS ESTRATÉGICOS

```
OBJETIVO: Verificar normalização e plausibilidade dos pesos BOCR.

VERIFICAÇÕES:
□ Soma dos pesos: b + o + c + r = 1.0 (tolerância 0.001)
□ Todos os pesos positivos: b, o, c, r > 0
□ Nenhum peso dominante extremo: max(b,o,c,r) < 0.70

ANÁLISE DE PLAUSIBILIDADE:
- Se c + r > b + o: "Perfil conservador/avesso ao risco"
- Se b + o > c + r: "Perfil otimista/orientado a benefícios"
- Se |b - r| < 0.05 e |o - c| < 0.05: "Perfil balanceado"

ALERTAS:
- Peso < 0.05: "⚠️ Mérito [X] com peso muito baixo - verificar se é intencional"
- Peso > 0.60: "⚠️ Mérito [X] dominante - decisão altamente sensível"

CORREÇÃO SE SOMA ≠ 1:
"Normalizar pesos: w_i_norm = w_i / Σw"
```

---

### [TESTE 4] VALIDAÇÃO DAS 5 FÓRMULAS DE SÍNTESE BOCR

```
OBJETIVO: Recalcular e validar cada fórmula conforme Petrillo et al. (2023).

ENTRADA:
- Pesos: b, o, c, r (de bocrWeights)
- Scores por mérito: B, O, C, R (de altMeritScores)
- Resultados reportados: finalScores

═══════════════════════════════════════════════════════════════
FÓRMULA 1: ADDITIVE (Tabela 5, Linha 1)
═══════════════════════════════════════════════════════════════
Fórmula: P = b×B + o×O + c×(1/C)_norm + r×(1/R)_norm

Onde:
- (1/C)_norm = (1/C_i) / Σ(1/C_j) para todas alternativas
- (1/R)_norm = (1/R_i) / Σ(1/R_j) para todas alternativas

VALIDAÇÃO:
□ Inversos calculados corretamente
□ Inversos normalizados (soma = 1)
□ Resultado dentro de [0, 1]

TOLERÂNCIA: |calculado - reportado| < 0.0001

═══════════════════════════════════════════════════════════════
FÓRMULA 2: PROBABILISTIC ADDITIVE (Tabela 5, Linha 2)
═══════════════════════════════════════════════════════════════
Fórmula: P = b×B + o×O + c×(1-C) + r×(1-R)

VALIDAÇÃO:
□ B, O, C, R estão no intervalo [0, 1]
□ (1-C) e (1-R) representam "probabilidade de evitar custo/risco"
□ Resultado dentro de [0, 1]

═══════════════════════════════════════════════════════════════
FÓRMULA 3: SUBTRACTIVE (Tabela 5, Linha 3)
═══════════════════════════════════════════════════════════════
Fórmula: P = b×B + o×O + c×C - r×R

⚠️ ATENÇÃO ESPECIAL (Wijnmalen, 2007):
Esta fórmula SOMA C mas SUBTRAI apenas R.
NÃO é (b×B + o×O) - (c×C + r×R)!

VALIDAÇÃO:
□ Fórmula aplicada exatamente como: bB + oO + cC - rR
□ Pode produzir valores negativos (correto)
□ Normalização min-max aplicada para comparação

ERRO COMUM:
Se detectar (bB + oO) - (cC + rR): 
"❌ ERRO: Fórmula Subtractive incorreta. 
Conforme Tabela 5: P = bB + oO + cC - rR (soma C, subtrai apenas R)"

═══════════════════════════════════════════════════════════════
FÓRMULA 4: MULTIPLICATIVE PRIORITY POWERS (Tabela 5, Linha 4)
═══════════════════════════════════════════════════════════════
Fórmula: P = B^b × O^o × (1/C_norm)^c × (1/R_norm)^r

VALIDAÇÃO:
□ Pesos usados como expoentes (não multiplicadores)
□ Inversos de C e R normalizados antes da potenciação
□ Nenhum valor base ≤ 0 (evita erro matemático)
□ Normalização min-max aplicada ao resultado

═══════════════════════════════════════════════════════════════
FÓRMULA 5: MULTIPLICATIVE SIMPLE (Tabela 5, Linha 5)
═══════════════════════════════════════════════════════════════
Fórmula: P = (B × O) / (C × R)

VALIDAÇÃO:
□ Numerador: produto de B e O
□ Denominador: produto de C e R
□ Proteção contra divisão por zero (C×R > ε)
□ Normalização min-max aplicada

⚠️ ALERTA WIJNMALEN:
"Pode ser enganoso ao avaliar lucratividade" e 
"Ambíguo quando alternativas têm produtos B×O e C×R similares"

═══════════════════════════════════════════════════════════════
MATRIZ DE VALIDAÇÃO CRUZADA
═══════════════════════════════════════════════════════════════
Para CADA alternativa, calcular os 5 scores e comparar:

| Alt | Additive | Prob. | Subtr. | MultPow | MultSimp | Δmax |
|-----|----------|-------|--------|---------|----------|------|
| A1  | calc/rep | ...   | ...    | ...     | ...      | erro |
| A2  | calc/rep | ...   | ...    | ...     | ...      | erro |

Se Δmax > 0.01 para qualquer método:
"❌ ERRO: Discrepância no cálculo de [método] para [alternativa]"
```

---

### [TESTE 5] CONCORDÂNCIA ENTRE MÉTODOS

```
OBJETIVO: Verificar robustez da decisão através da concordância dos 5 métodos.

ANÁLISE:
1. Identificar o VENCEDOR de cada método (maior score)
2. Contar quantos métodos concordam

CLASSIFICAÇÃO:
- 5/5 métodos concordam: "✅ MUITO ROBUSTO - Decisão inequívoca"
- 4/5 métodos concordam: "✅ ROBUSTO - Alta confiança"
- 3/5 métodos concordam: "⚠️ MODERADO - Requer análise adicional"
- 2/5 ou menos concordam: "❌ INSTÁVEL - Decisão depende do método escolhido"

ANÁLISE DE DISCORDÂNCIA:
Se houver discordância, identificar:
- Quais métodos divergem
- Qual alternativa cada método favorece
- Possível causa (ex: alta sensibilidade a C ou R)

RECOMENDAÇÃO SE INSTÁVEL:
"A escolha do método de síntese impacta significativamente o resultado.
Recomenda-se: (1) Justificar teoricamente a escolha do método,
(2) Apresentar análise de sensibilidade detalhada,
(3) Considerar uso de método de votação (Borda Count) entre os 5 resultados."
```

---

### [TESTE 6] ANÁLISE DE SENSIBILIDADE E ROBUSTEZ

```
OBJETIVO: Validar a estabilidade da decisão sob variação dos pesos.

ENTRADA: sensitivityInflections { B, O, C, R }

INTERPRETAÇÃO:
- null = Estável (sem inversão de ranking de 0% a 100%)
- número = Ponto percentual onde ocorre inversão

CLASSIFICAÇÃO POR MÉRITO:
- Inflexão > 50%: "✅ Estável"
- Inflexão entre 20-50%: "⚠️ Moderadamente sensível"
- Inflexão < 20%: "❌ Altamente sensível"
- Inflexão < 10%: "❌ CRÍTICO - Decisão instável"

ANÁLISE GLOBAL:
Contar méritos com inflexão < 20%:
- 0 méritos: "DECISÃO ROBUSTA"
- 1 mérito: "DECISÃO MODERADAMENTE ROBUSTA"
- 2+ méritos: "DECISÃO SENSÍVEL - Alto risco de reversão"

VALIDAÇÃO DO TESTE ±10%:
Simular variação do peso dominante em ±10%:
1. Identificar mérito com maior peso
2. Variar em +10% e -10% (redistribuir para outros proporcionalmente)
3. Recalcular ranking
4. Verificar se vencedor mudou

RESULTADO:
- Sem mudança: "✅ Robusto a variações de ±10%"
- Mudança com +10% ou -10%: "⚠️ Sensível ao peso de [mérito]"

VALIDAÇÃO DO TESTE ±20%:
Repetir para ±20%:
- Sem mudança: "✅ MUITO ROBUSTO"
- Mudança apenas com ±20%: "✅ ROBUSTO"
- Mudança com menos de ±20%: "⚠️ MODERADAMENTE ROBUSTO"
```

---

### [TESTE 7] VALIDAÇÃO ESTATÍSTICA DA AMOSTRA

```
OBJETIVO: Verificar adequação do painel de especialistas.

VERIFICAÇÕES:
□ responseCount >= 5 (mínimo recomendado para agregação)
□ responseCount >= 10 (ideal para estabilidade)
□ responseCount >= 15 (excelente para publicação)

CLASSIFICAÇÃO:
- n >= 15: "✅ Amostra excelente para publicação"
- 10 <= n < 15: "✅ Amostra adequada"
- 5 <= n < 10: "⚠️ Amostra mínima - justificar seleção"
- n < 5: "❌ Amostra insuficiente para generalização"

RECOMENDAÇÕES POR PERIÓDICO:
- IJAHP: n >= 5 com justificativa de expertise
- Mathematics: n >= 10 com análise estatística
- IJPE: n >= 10 com representatividade industrial
- JCP: n >= 12 com diversidade de stakeholders
```

---

## FORMATO DO PARECER DE SAÍDA

```markdown
# PARECER TÉCNICO - VALIDAÇÃO AHP-BOCR
## [Nome do Projeto]

**Data da Auditoria:** [timestamp]
**Versão do Validador:** 2.0
**Normas de Referência:** Saaty (1980), Wijnmalen (2007), Petrillo et al. (2023)

---

## 🎯 RESUMO EXECUTIVO

**STATUS GERAL:** [APROVADO / APROVADO COM RESSALVAS / REPROVADO]
**NOTA:** [A/B/C/D/F] (baseada no Quality Score)
**QUALITY SCORE:** [0-100]

### Principais Achados:
1. [Achado positivo ou negativo mais importante]
2. [Segundo achado]
3. [Terceiro achado]

### Ação Requerida:
- [ ] [Ação crítica 1]
- [ ] [Ação crítica 2]

---

## 📊 RESULTADOS DOS TESTES

### Teste 1: Consistência Matemática
| Matriz | CR | Threshold | λmax | Status |
|--------|-----|-----------|------|--------|
| BOCR | X.XX% | 8% | X.XX | ✅/❌ |
| Benefits | X.XX% | 10% | X.XX | ✅/❌ |
| Opportunities | X.XX% | 10% | X.XX | ✅/❌ |
| Costs | X.XX% | 10% | X.XX | ✅/❌ |
| Risks | X.XX% | 10% | X.XX | ✅/❌ |

**Diagnóstico:** [Explicação técnica]
**Correção:** [Se necessário]

### Teste 2: Agregação AIJ
**Status:** ✅/❌
**Método Detectado:** Média Geométrica / Média Aritmética
**Reciprocidade:** Preservada / Violada
**Correção:** [Se necessário]

### Teste 3: Pesos Estratégicos
| Mérito | Peso | Análise |
|--------|------|---------|
| Benefits | XX.X% | [Normal/Alto/Baixo] |
| Opportunities | XX.X% | [Normal/Alto/Baixo] |
| Costs | XX.X% | [Normal/Alto/Baixo] |
| Risks | XX.X% | [Normal/Alto/Baixo] |
| **SOMA** | XXX.X% | ✅/❌ |

**Perfil Decisório:** [Conservador/Otimista/Balanceado]

### Teste 4: Fórmulas de Síntese BOCR

#### Validação Matemática:
| Fórmula | Implementação | Valores | Status |
|---------|---------------|---------|--------|
| Additive | bB+oO+c(1/C)ₙ+r(1/R)ₙ | [range] | ✅/❌ |
| Probabilistic | bB+oO+c(1-C)+r(1-R) | [range] | ✅/❌ |
| Subtractive | bB+oO+cC-rR | [range] | ✅/❌ |
| Mult. Powers | B^b×O^o×(1/C)^c×(1/R)^r | [range] | ✅/❌ |
| Multiplicative | (B×O)/(C×R) | [range] | ✅/❌ |

**Diagnóstico:** [Explicação de erros encontrados]
**Correção:** [Código ou fórmula correta]

### Teste 5: Concordância entre Métodos
**Vencedor por Método:**
| Método | Vencedor | Score |
|--------|----------|-------|
| Additive | [Alt] | X.XXXX |
| Probabilistic | [Alt] | X.XXXX |
| Subtractive | [Alt] | X.XXXX |
| Mult. Powers | [Alt] | X.XXXX |
| Multiplicative | [Alt] | X.XXXX |

**Concordância:** [X/5 métodos]
**Status:** [MUITO ROBUSTO / ROBUSTO / MODERADO / INSTÁVEL]

### Teste 6: Análise de Sensibilidade
| Mérito | Ponto de Inflexão | Classificação |
|--------|-------------------|---------------|
| Benefits | [X% ou Estável] | ✅/⚠️/❌ |
| Opportunities | [X% ou Estável] | ✅/⚠️/❌ |
| Costs | [X% ou Estável] | ✅/⚠️/❌ |
| Risks | [X% ou Estável] | ✅/⚠️/❌ |

**Teste ±10%:** [Robusto / Sensível a X]
**Teste ±20%:** [Muito Robusto / Robusto / Sensível]

### Teste 7: Adequação da Amostra
**Especialistas:** [n]
**Classificação:** [Excelente/Adequada/Mínima/Insuficiente]
**Adequação por Periódico:**
- IJAHP: ✅/⚠️/❌
- Mathematics: ✅/⚠️/❌
- IJPE: ✅/⚠️/❌
- JCP: ✅/⚠️/❌

---

## 🔧 RESUMO PARA O DESENVOLVEDOR

### Erros Críticos (Bloqueia publicação):
```
[Lista de erros críticos com código/localização]
```

### Alertas (Requer justificativa):
```
[Lista de alertas]
```

### Melhorias Recomendadas:
```
[Lista de melhorias opcionais]
```

### Código de Correção Sugerido:
```javascript
// [Trecho de código para corrigir problema específico]
```

---

## 📚 REFERÊNCIAS METODOLÓGICAS

- SAATY, T. L. The Analytic Hierarchy Process. McGraw-Hill, 1980.
- SAATY, T. L. Decision making with the analytic hierarchy process. 
  Int. J. Services Sciences, v. 1, n. 1, p. 83-98, 2008.
- ACZÉL, J.; SAATY, T. L. Procedures for synthesizing ratio judgements. 
  Journal of Mathematical Psychology, v. 27, n. 1, p. 93-102, 1983.
- WIJNMALEN, D. J. D. Analysis of benefits, opportunities, costs, and risks 
  (BOCR) with the AHP–ANP: A critical validation. Mathematical and Computer 
  Modelling, v. 46, n. 7-8, p. 892-905, 2007.
- PETRILLO, A.; SALOMON, V. A. P.; TRAMARICO, C. L. State-of-the-Art Review 
  on the Analytic Hierarchy Process with Benefits, Opportunities, Costs, 
  and Risks. Journal of Risk and Financial Management, v. 16, n. 8, 372, 2023.

---

## 📋 CHECKLIST PARA SUBMISSÃO

### IJAHP (International Journal of the Analytic Hierarchy Process)
- [ ] CR reportado para todas as matrizes
- [ ] Dataset disponibilizado como material suplementar
- [ ] Análise de sensibilidade incluída
- [ ] Questionário documentado em apêndice

### Mathematics (MDPI)
- [ ] Formulação matemática clara e reprodutível
- [ ] Todas as equações numeradas
- [ ] Resultados intermediários disponíveis
- [ ] Contribuição teórica explicitada

### IJPE (Int. Journal of Production Economics)
- [ ] Aplicação industrial documentada
- [ ] Implicações econômicas discutidas
- [ ] Comparação com métodos alternativos
- [ ] Limitações reconhecidas

### JCP (Journal of Cleaner Production)
- [ ] Conexão com Objetivos de Desenvolvimento Sustentável
- [ ] Dimensões econômica, ambiental e social abordadas
- [ ] Perspectiva de ciclo de vida considerada
- [ ] Stakeholders identificados

---

*Parecer gerado automaticamente pelo AHP-BOCR Scientific Validator v2.0*
*Este documento não substitui a revisão por pares humanos.*
```

---

## CÁLCULO DO QUALITY SCORE

```javascript
function calculateQualityScore(validationResults) {
  let score = 100;
  
  // DEDUÇÕES POR SEVERIDADE
  
  // Erros Críticos (-25 cada)
  if (validationResults.consistency.bocr.cr > 0.15) score -= 25;
  if (validationResults.aggregation.arithmeticDetected) score -= 25;
  if (validationResults.formulas.anyIncorrect) score -= 25;
  if (validationResults.data.incomplete) score -= 25;
  
  // Erros Maiores (-15 cada)
  if (validationResults.consistency.bocr.cr > 0.10) score -= 15;
  if (validationResults.consistency.anySub.cr > 0.10) score -= 15;
  if (validationResults.weights.sumDeviation > 0.01) score -= 15;
  if (validationResults.sensitivity.anyBelow10) score -= 15;
  
  // Alertas (-5 cada)
  if (validationResults.consistency.bocr.cr > 0.08) score -= 5;
  if (validationResults.weights.anyDominant) score -= 5;
  if (validationResults.methods.concordance < 4) score -= 5;
  if (validationResults.sample.count < 10) score -= 5;
  
  // BÔNUS POR BOAS PRÁTICAS
  
  if (validationResults.sensitivity.allStable) score += 5;
  if (validationResults.methods.concordance === 5) score += 5;
  if (validationResults.sample.count >= 15) score += 5;
  if (validationResults.consistency.allBelow5Percent) score += 3;
  
  return Math.max(0, Math.min(100, score));
}

// CLASSIFICAÇÃO
function getGrade(score) {
  if (score >= 90) return { grade: 'A', status: 'APROVADO', color: 'green' };
  if (score >= 75) return { grade: 'B', status: 'APROVADO COM RESSALVAS', color: 'yellow' };
  if (score >= 60) return { grade: 'C', status: 'REVISÃO NECESSÁRIA', color: 'orange' };
  if (score >= 40) return { grade: 'D', status: 'REVISÃO MAIOR NECESSÁRIA', color: 'red' };
  return { grade: 'F', status: 'REPROVADO', color: 'darkred' };
}
```

---

## NOTAS IMPORTANTES PARA IMPLEMENTAÇÃO

### 1. Fórmula Subtractive - ATENÇÃO ESPECIAL

A Tabela 5 de Petrillo et al. (2023) define claramente:
```
Subtractive: bB + oO + cC - rR
```

Esta fórmula **SOMA** C (Custos) mas **SUBTRAI** apenas R (Riscos).

**NÃO É:** `(bB + oO) - (cC + rR)` ← Esta seria uma interpretação comum mas INCORRETA.

A lógica é que Custos são vistos como "investimento necessário" (positivo) enquanto Riscos são perdas potenciais (negativo).

### 2. Normalização dos Inversos

Para as fórmulas Additive e Multiplicative Powers que usam (1/C) e (1/R):
```javascript
// CORRETO: Normalizar DEPOIS de inverter
const inverseC = alternatives.map(a => 1 / a.C);
const sumInverseC = inverseC.reduce((a, b) => a + b, 0);
const normalizedInverseC = inverseC.map(v => v / sumInverseC);
```

### 3. Proteção contra Divisão por Zero

```javascript
const epsilon = 0.0001;
// Em vez de: (B * O) / (C * R)
// Usar: (B * O) / (C * R + epsilon)
```

### 4. Validação de λmax

O eigenvalue principal DEVE ser >= n para matriz válida:
```javascript
if (lambda < n) {
  return {
    valid: false,
    error: 'EIGENVALUE_ERROR',
    message: `λmax (${lambda}) é menor que n (${n}). Erro no cálculo do eigenvector.`
  };
}
```

---

## EXEMPLO DE SAÍDA PARA DESENVOLVEDOR

```json
{
  "summary": {
    "status": "APPROVED_WITH_WARNINGS",
    "grade": "B",
    "score": 78,
    "criticalErrors": 0,
    "majorErrors": 1,
    "warnings": 3
  },
  "actions": {
    "critical": [],
    "major": [
      {
        "test": "T4_FORMULAS",
        "issue": "Subtractive formula using (bB+oO)-(cC+rR) instead of bB+oO+cC-rR",
        "file": "dashboard.tsx",
        "line": 272,
        "fix": "const scoreSubtractive = (b*B + o*O + c*C) - (r*R);"
      }
    ],
    "warnings": [
      {
        "test": "T6_SENSITIVITY",
        "issue": "Risks inflection at 14% indicates moderate sensitivity",
        "recommendation": "Document sensitivity in paper, consider expanding risk criteria"
      },
      {
        "test": "T7_SAMPLE",
        "issue": "Sample size (n=12) below ideal for IJPE",
        "recommendation": "Add justification for expert selection in methodology"
      },
      {
        "test": "T5_CONCORDANCE",
        "issue": "4/5 methods agree (Multiplicative Simple diverges)",
        "recommendation": "Discuss divergence in results section"
      }
    ]
  },
  "readyForSubmission": {
    "IJAHP": true,
    "Mathematics": true,
    "IJPE": false,
    "JCP": true
  }
}
```
