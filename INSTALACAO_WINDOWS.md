# 🚀 GUIA DE INSTALAÇÃO - Windows

## 📂 Seus arquivos estão em:
```
C:\AHP-BOCR\ahp-simple\
```

---

## ✅ PASSO 1: Verificar Node.js

Abra o **PowerShell** ou **CMD** e execute:

```bash
node --version
npm --version
```

**Esperado:**
```
v16.x.x ou superior
8.x.x ou superior
```

**Se não tiver Node.js instalado:**
- Baixe em: https://nodejs.org/
- Instale a versão LTS (Long Term Support)
- Reinicie o terminal

---

## ✅ PASSO 2: Navegar para a pasta

No PowerShell ou CMD:

```bash
cd C:\AHP-BOCR\ahp-simple
```

Verificar arquivos:

```bash
dir
```

**Deve mostrar:**
```
SUMARIO_EXECUTIVO.md
README.md
knowledge.ts
bocr-peer-review-api.ts
demo.ts
package.json
```

---

## ✅ PASSO 3: Instalar dependências

```bash
npm install
```

**Isso vai instalar:**
- TypeScript
- ts-node
- @types/node

**Tempo estimado:** 30-60 segundos

---

## ✅ PASSO 4: Executar o Demo

```bash
npm run demo
```

**OU diretamente:**

```bash
npx ts-node demo.ts
```

---

## 📊 O QUE VOCÊ VAI VER:

O demo vai executar **4 análises completas**:

### ✅ **Exemplo 1: Lee et al. (2009) - Wind Farms**
- Qualidade: **EXCELLENT/GOOD**
- Usa métodos corretos
- 100% de concordância
- 11 experts (ótimo)

### ✅ **Exemplo 2: Lee (2009) - TFT-LCD**
- Qualidade: **GOOD**
- Estrutura complexa (37 critérios)
- 80% de concordância
- Falta pesos de reescalonamento

### ❌ **Exemplo 3: Manuscrito RUIM (Tradicional)**
- Qualidade: **CRITICAL FLAWS**
- Usa fórmula incorreta: (B^wb * O^wo) / (C^wc * R^wr)
- Sem comensurabilidade
- Resultados podem estar errados

### ❌ **Exemplo 4: Manuscrito RUIM (Recíprocos)**
- Qualidade: **CRITICAL FLAWS**
- Usa recíprocos: 1/C e 1/R
- Sempre dá resultado positivo
- Não detecta alternativas não-lucrativas

---

## 📈 TABELA DE COMPARAÇÃO

No final do demo, você verá:

```
Manuscript                   | Quality      | Score | Confidence | Critical Issues
─────────────────────────────┼──────────────┼───────┼────────────┼────────────────
Lee et al. (2009) Wind       | EXCELLENT    | 90+   | VERY_HIGH  | 0
Lee (2009) TFT-LCD          | GOOD         | 70+   | HIGH       | 1
Bad Traditional              | CRITICAL_FLAWS| 25   | VERY_LOW   | 2+
Bad Reciprocals             | CRITICAL_FLAWS| 30   | VERY_LOW   | 2+
```

---

## 🔧 RESOLVER PROBLEMAS COMUNS

### ❌ Erro: "ts-node não é reconhecido"

**Solução 1 - Usar npx:**
```bash
npx ts-node demo.ts
```

**Solução 2 - Instalar globalmente:**
```bash
npm install -g ts-node typescript
ts-node demo.ts
```

---

### ❌ Erro: "Cannot find module './knowledge'"

**Verifique que todos os arquivos estão na mesma pasta:**
```bash
dir
```

**Devem estar todos juntos:**
- knowledge.ts
- bocr-peer-review-api.ts
- demo.ts

---

### ❌ Erro: "Permission denied"

**Execute PowerShell como Administrador** e tente novamente.

---

## 📝 PRÓXIMOS PASSOS

### 1️⃣ **Entender o Knowledge Base**

Abra `knowledge.ts` e explore:
- Linha 20-100: Estrutura de critérios
- Linha 100-300: Métodos de síntese (CRÍTICO!)
- Linha 300-400: Benchmarks de concordância
- Linha 400-500: Análise de robustez

### 2️⃣ **Analisar a API**

Abra `bocr-peer-review-api.ts`:
- Linha 1-200: Definições de tipos
- Linha 200-400: Análise de estrutura
- Linha 400-700: **Validação de metodologia** (MAIS IMPORTANTE!)
- Linha 700-900: Análise de robustez
- Linha 900+: Geração de relatórios

### 3️⃣ **Preparar Seus Dados**

Crie um novo arquivo: `meus-dados.ts`

```typescript
import { BOCRPeerReviewAPI, ManuscriptData } from './bocr-peer-review-api';

const meusDados: ManuscriptData = {
  title: "Avaliação de Investimentos Indústria 4.0 com AHP-BOCR",
  authors: ["Pedro Henrique Alves"],
  application_area: "Automotive Manufacturing - Paint Shop",
  
  total_criteria: 20,  // Seus subcritérios
  bocr_distribution: { 
    B: 5,  // 5 critérios de benefícios
    O: 5,  // 5 de oportunidades
    C: 5,  // 5 de custos
    R: 5   // 5 de riscos
  },
  
  n_experts: 11,  // Seus 11 gerentes sêniores
  aggregation_method: "Geometric mean",
  
  bocr_weights: { 
    B: 0.25,  // SUBSTITUA pelos seus pesos calculados
    O: 0.25, 
    C: 0.25, 
    R: 0.25 
  },
  
  n_alternatives: 3,  // Suas 3 alternativas de investimento
  alternative_scores: {
    "Alt_1": { B: 0.33, O: 0.33, C: 0.33, R: 0.33 },
    "Alt_2": { B: 0.33, O: 0.33, C: 0.33, R: 0.33 },
    "Alt_3": { B: 0.34, O: 0.34, C: 0.34, R: 0.34 }
  },
  
  // ⚠️ IMPORTANTE: Use o método correto!
  synthesis_method: 'multiplicative_revised',
  
  // ⚠️ CRÍTICO: Calcule os pesos de reescalonamento
  rescaling_weights: {
    sb: 0.25,  // CALCULE baseado nos totais
    so: 0.25,
    sc: 0.25,
    sr: 0.25
  },
  
  final_ranking: ["Alt_3", "Alt_2", "Alt_1"],
  
  consistency_ratios_reported: true,
  max_cr_value: 0.08  // Seu máximo CR
};

// Executar análise
async function analisarMeusDados() {
  const api = new BOCRPeerReviewAPI();
  const resultado = await api.analyzeManuscript(meusDados);
  const relatorio = api.generateReport(resultado);
  console.log(relatorio);
}

analisarMeusDados();
```

Execute:
```bash
npx ts-node meus-dados.ts
```

---

## 🎯 COMO CALCULAR PESOS DE REESCALONAMENTO

**CRÍTICO para comensurabilidade!**

```typescript
// Exemplo fictício - SUBSTITUA pelos seus valores reais:

const totais = {
  B_total: 1000,  // Soma de todos os benefícios em magnitude absoluta
  O_total: 500,   // Soma de todas as oportunidades
  C_total: 800,   // Soma de todos os custos
  R_total: 200    // Soma de todos os riscos
};

const soma_total = totais.B_total + totais.O_total + 
                   totais.C_total + totais.R_total;
// = 2500

const rescaling_weights = {
  sb: totais.B_total / soma_total,  // = 1000/2500 = 0.40
  so: totais.O_total / soma_total,  // = 500/2500 = 0.20
  sc: totais.C_total / soma_total,  // = 800/2500 = 0.32
  sr: totais.R_total / soma_total   // = 200/2500 = 0.08
};

// Verificação: sb + so + sc + sr DEVE = 1.0
```

**Como obter os totais?**
1. Use valores monetários quando disponíveis
2. Use magnitudes relativas (pairwise comparisons agregadas)
3. Use método de "linking pins" (Wedley et al. 2003)

---

## 📚 DOCUMENTAÇÃO COMPLETA

Leia os arquivos na ordem:

1. **SUMARIO_EXECUTIVO.md** ← Comece aqui!
2. **README.md** ← Documentação técnica
3. **knowledge.ts** ← Todos os benchmarks
4. **demo.ts** ← Exemplos práticos

---

## 🆘 PRECISA DE AJUDA?

**Se tiver problemas:**
1. Verifique que Node.js está instalado
2. Confirme que todos os arquivos estão na pasta
3. Execute `npm install` novamente
4. Tente `npx ts-node demo.ts`

**Se ainda não funcionar:**
- Me mostre a mensagem de erro completa
- Envie o resultado de `node --version`
- Envie o resultado de `npm --version`

---

## ✅ CHECKLIST

- [ ] Node.js instalado (v16+)
- [ ] Navegou para C:\AHP-BOCR\ahp-simple
- [ ] Executou `npm install`
- [ ] Executou `npm run demo`
- [ ] Viu os 4 exemplos de análise
- [ ] Leu o SUMARIO_EXECUTIVO.md
- [ ] Pronto para preparar seus dados!

---

**Sucesso com a implementação!** 🚀

Se tiver dúvidas, me avise! 😊
