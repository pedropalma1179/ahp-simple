# 🚀 API v6.4.2 - Análise Completa com RAG

## 📦 Arquivos Disponíveis:

| Arquivo | Descrição |
|---------|-----------|
| `route-debug.ts` | 🐛 Versão DEBUG - Mostra payload completo nos logs |
| `route-v642.ts` | ✨ Versão COMPLETA - Análise + Nota + Veredicto |
| `instalar-v642.bat` | 🔧 Script de instalação interativo |

---

## 🎯 Recomendação: Começar pelo DEBUG

### Por quê?

Para criar uma análise perfeita, preciso ver **exatamente** o que o frontend está enviando:
- ✅ Quais campos existem no payload?
- ✅ Os CRs individuais estão sendo enviados?
- ✅ Os nomes dos respondentes estão disponíveis?
- ✅ Qual é a estrutura exata dos dados?

---

## 📋 Passo a Passo Completo:

### **ETAPA 1: DEBUG** (5 minutos)

```cmd
cd C:\AHP-BOCR\ahp-simple

:: 1. Executar instalação
instalar-v642.bat
   → Escolher opção [1] DEBUG

:: 2. Build e deploy
npm run build
vercel --prod

:: 3. Testar no site
   → Clicar em "🤖 Executar Revisão IA"
   → Aguardar resposta (aparecerá "DEBUG MODE")

:: 4. Ver logs no Vercel
   → Acessar https://vercel.com/seu-usuario/seu-projeto
   → Functions → /api/ai-reviewer
   → Real-time Logs
   → COPIAR O LOG COMPLETO e me enviar
```

---

### **ETAPA 2: VERSÃO COMPLETA** (após eu analisar o log)

Depois que você me enviar o log do DEBUG, vou:
1. ✅ Ver exatamente o formato do payload
2. ✅ Ajustar a v6.4.2 se necessário
3. ✅ Você instala a versão completa

```cmd
:: Instalar versão completa
instalar-v642.bat
   → Escolher opção [2] COMPLETA

:: Build e deploy
npm run build
vercel --prod
```

---

## ✨ Features da v6.4.2 Completa:

### 1️⃣ **Análise de CRs Individuais**
```
Respondentes Críticos (CR > 0.20):
- João Silva: CR médio = 78.3%
- Maria Santos: CR médio = 94.1%
```

### 2️⃣ **Classificação Automática**
```javascript
{
  nota: "B",                           // A, B, C, D ou F
  veredicto: "APROVADO COM RESSALVAS", // APROVADO, REVISÃO MENOR, etc
  justificativa: "Pontuação: 82/100..."
}
```

### 3️⃣ **Benchmarks da Literatura**
```markdown
## 🎯 ANÁLISE DOS PESOS BOCR

Segundo Lee (2009), os pesos dos méritos B, O, C, R não devem 
ser arbitrários e exigem Hierarquia de Controle. Observa-se 
que Riscos (7.9%) está abaixo do recomendado por Petrillo et 
al. (2023), que sugere mínimo de 12%...
```

### 4️⃣ **Referências Científicas Automáticas**
- Saaty (1977) sobre CI
- Wijnmalen (2007) sobre BOCR
- Petrillo et al. (2023) sobre peso de Riscos
- Lee (2009) sobre Hierarquia de Controle
- Ishizaka & Labib (2011) sobre Análise de Sensibilidade

---

## 🐛 Versão DEBUG - O que Ela Faz:

```javascript
// No código
console.log('═══════════════════════════════════════');
console.log('[DEBUG] PAYLOAD COMPLETO RECEBIDO:');
console.log(JSON.stringify(rawData, null, 2));
console.log('═══════════════════════════════════════');
console.log('[DEBUG] Chaves do objeto:', Object.keys(rawData));

// Retorna para o frontend
{
  success: true,
  debug: true,
  message: 'Payload recebido! Verifique logs do Vercel.',
  review: '## 🐛 DEBUG MODE...',
  nota: 'DEBUG',
  veredicto: 'DEBUG MODE'
}
```

---

## 📊 Sistema de Pontuação (v6.4.2):

| Critério | Peso | Penalidades |
|----------|------|-------------|
| **Qualidade dos Dados** | 40pts | <50% válidas: -40pts<br><70% válidas: -20pts<br><85% válidas: -10pts |
| **Homogeneidade BOCR** | 30pts | Ratio >10:1: -30pts<br>Ratio >5:1: -15pts<br>Riscos <12%: -10pts |
| **Consistência/Dimensão** | 30pts | <60% válidas: -10pts/dim<br><75% válidas: -5pts/dim |

### Notas Finais:

- **A** (≥90pts): APROVADO
- **B** (80-89pts): APROVADO COM RESSALVAS
- **C** (70-79pts): REVISÃO MENOR NECESSÁRIA
- **D** (60-69pts): REVISÃO MAIOR NECESSÁRIA
- **F** (<60pts): REJEITADO

---

## 🚀 Quick Start:

```cmd
cd C:\AHP-BOCR\ahp-simple

# 1. Instalar DEBUG
instalar-v642.bat → [1]

# 2. Deploy
npm run build
vercel --prod

# 3. Testar e copiar logs
# 4. Me enviar o log completo
# 5. Eu ajusto se necessário
# 6. Instalar versão COMPLETA
```

---

## 📞 Próximos Passos:

**Instale a versão DEBUG primeiro e me envie o log completo do Vercel!**

Isso me permite:
- ✅ Ver exatamente o que o frontend envia
- ✅ Ajustar a análise de CRs individuais
- ✅ Garantir compatibilidade 100%
- ✅ Criar citações precisas dos respondentes ruins

---

**Versão:** 6.4.2  
**Data:** 11/01/2026  
**Modelo:** claude-sonnet-4-20250514  
**Base RAG:** 24 referências de 16 artigos
