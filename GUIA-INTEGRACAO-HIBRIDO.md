# Guia de Integração: Parecer IA Híbrido

## 🎯 Problema Resolvido

A IA (Claude) tem tendência a **recalcular valores numéricos** mesmo quando instruída a usar valores fornecidos. Isso causa discrepâncias como:

| Campo | Sistema (Correto) | IA (Errado) |
|-------|-------------------|-------------|
| Diferença | **12.65%** | 6.75% |
| Concordância | **4/5** | 5/5 |

## ✅ Solução: Abordagem Híbrida

O componente `AIReviewCard` usa:
- **Valores do SISTEMA** para todos os números (diferença, concordância, CR, etc.)
- **Valores da IA** para análise qualitativa (pontos fortes, recomendações, observações)

---

## 📁 Arquivos Criados

### 1. `hooks/useOfficialValues.ts`
Utilitário para calcular valores oficiais a partir do `calculationData`.

```typescript
import { calculateOfficialValues } from '@/hooks/useOfficialValues';

const officialValues = calculateOfficialValues(calculationData);
console.log(officialValues.diferenca.valor);      // "12.65%"
console.log(officialValues.concordancia.valor);   // "4/5"
```

### 2. `components/AIReviewCard.tsx`
Componente React que renderiza o parecer usando a abordagem híbrida.

---

## 🚀 Como Usar

### Passo 1: Copiar os arquivos

```bash
# Copiar para seu projeto
cp useOfficialValues.ts seu-projeto/hooks/
cp AIReviewCard.tsx seu-projeto/components/
```

### Passo 2: Importar e usar

```tsx
// Em sua página de resultados
import AIReviewCard from '@/components/AIReviewCard';

export default function ResultsPage() {
  const [aiReview, setAiReview] = useState(null);
  const [calculationData, setCalculationData] = useState(null);
  
  const handleRunAIReview = async () => {
    const response = await fetch('/api/ai-reviewer', {
      method: 'POST',
      body: JSON.stringify({ calculationData })
    });
    const data = await response.json();
    setAiReview(data.review);
  };
  
  return (
    <AIReviewCard
      aiReview={aiReview}
      calculationData={calculationData}
      isLoading={isLoading}
      onRetry={handleRunAIReview}
    />
  );
}
```

---

## 📊 Estrutura de Dados

### calculationData (do sistema)

```typescript
interface CalculationData {
  finalScores: Array<{
    name: string;
    code: string;
    B: number;
    O: number;
    C: number;
    R: number;
    scoreAdditive: number;
    scoreProbabilistic: number;
    scoreSubtractiveNorm: number;
    scoreMultPowersNorm: number;
    scoreMultSimpleNorm: number;
  }>;
  bocrWeights: number[];  // [B, O, C, R]
  bocrConsistency: {
    cr: number;
    lambda: number;
  };
  responseCount: number;
}
```

### aiReview (da API)

```typescript
interface AIReviewResponse {
  resumo_executivo: string;
  nota_geral: number;
  classificacao: string;
  
  // Esses valores são IGNORADOS - usamos do sistema
  analise_robustez: {
    concordancia_metodos: { valor: string; ... };  // IGNORADO
    diferenca_1o_2o: { valor: string; ... };       // IGNORADO
  };
  
  // Esses valores são USADOS - análise qualitativa
  pontos_fortes: string[];
  recomendacoes: string[];
  observacoes_revisor: string;
}
```

---

## 🔧 Personalização

### Substituição automática de valores errados

O componente automaticamente substitui valores percentuais errados nos textos:

```typescript
// Original da IA: "diferença de 6.75%"
// Corrigido: "diferença de 12.65%"

const textoCorrigido = textoOriginal.replace(
  /\d+[.,]\d+%/g, 
  officialValues.diferenca.valor
);
```

### Adicionar novos campos

Para adicionar novos campos calculados pelo sistema:

```typescript
// Em useOfficialValues.ts

export function calculateOfficialValues(calculationData) {
  // ... código existente ...
  
  // Adicionar novo campo
  const novoValor = calcularNovoValor(calculationData);
  
  return {
    // ... campos existentes ...
    novoValor,
  };
}
```

---

## ⚠️ Importante

### O que usar do SISTEMA (nunca da IA):
- ✅ Diferença percentual entre alternativas
- ✅ Concordância de métodos (X/5)
- ✅ Índice de Dominância (Xx)
- ✅ CR (Consistency Ratio)
- ✅ Scores e rankings

### O que usar da IA (análise qualitativa):
- ✅ Resumo executivo (texto)
- ✅ Pontos fortes
- ✅ Recomendações
- ✅ Observações do revisor
- ✅ Classificação geral
- ✅ Comentários de sensibilidade

---

## 🐛 Troubleshooting

### Valores ainda errados?

1. Verifique se `calculationData` está sendo passado corretamente
2. Verifique se `finalScores` contém os campos de score
3. Use o DevTools para inspecionar `officialValues`

```typescript
// Debug
console.log('Official Values:', calculateOfficialValues(calculationData));
```

### Componente não renderiza?

Verifique se as dependências do Lucide React estão instaladas:

```bash
npm install lucide-react
```

---

## 📝 Changelog

### v1.0.0
- Componente híbrido inicial
- Utility function para cálculos oficiais
- Substituição automática de valores em textos
