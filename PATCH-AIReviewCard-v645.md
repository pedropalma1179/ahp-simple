# PATCH: AIReviewCard.tsx - Suporte API v6.4.5

## Mudanças Necessárias:

### 1. Adicionar `texto_completo` ao tipo (linha ~63):

```typescript
interface AIReviewResponse {
  // ... campos existentes ...
  
  // NOVO v6.4.5: Campo unificado com todo o markdown
  texto_completo?: string;
  version?: string;
  
  // ... resto dos campos ...
}
```

### 2. Usar `texto_completo` como fallback (linha ~627):

**ANTES:**
```typescript
{aiReview.resumo_executivo && (
  <div className="bg-white/50 p-4 rounded-lg max-h-96 overflow-y-auto">
    <MarkdownRenderer content={aiReview.resumo_executivo} />
  </div>
)}
```

**DEPOIS:**
```typescript
{(aiReview.texto_completo || aiReview.resumo_executivo) && (
  <div className="bg-white/50 p-4 rounded-lg max-h-96 overflow-y-auto">
    <MarkdownRenderer content={aiReview.texto_completo || aiReview.resumo_executivo || ''} />
  </div>
)}
```

### 3. Seção "Parecer Completo" - usar texto_completo (linha ~844):

**ANTES:**
```typescript
{aiReview.observacoes_revisor && (
  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
    ...
    <MarkdownRenderer content={aiReview.observacoes_revisor} />
  </div>
)}
```

**DEPOIS:**
```typescript
{(aiReview.texto_completo || aiReview.observacoes_revisor) && (
  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-semibold text-gray-800">📝 Revisão Acadêmica Completa</h4>
      <button
        onClick={() => {
          const content = aiReview.texto_completo || aiReview.observacoes_revisor || '';
          navigator.clipboard.writeText(content);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
      >
        {copied ? '✓ Copiado!' : '📋 Copiar'}
      </button>
    </div>
    <div className="bg-white p-4 rounded-lg border max-h-[500px] overflow-y-auto">
      <MarkdownRenderer content={aiReview.texto_completo || aiReview.observacoes_revisor || ''} />
    </div>
  </div>
)}
```

### 4. Atualizar Footer para mostrar versão correta (linha ~862):

**ANTES:**
```typescript
<p className="text-xs text-gray-500 text-center">
  🎓 Revisão por Professor Titular (IA v6.1) • 
  📊 Números do sistema (tokens verificados) • 
  ✅ Correções aplicadas: regex, normalização, quality gate
</p>
```

**DEPOIS:**
```typescript
<p className="text-xs text-gray-500 text-center">
  🎓 Revisão Acadêmica A1/Q1 (API v{aiReview.version || aiReview.metadata?.version || '6.4.5'}) • 
  📊 Análise qualitativa profunda • 
  ✅ {aiReview.metadata?.knowledgeBase?.refsUsed || 24} referências científicas
</p>
```

### 5. Simplificar botão "Ver revisão completa" quando só tem texto_completo:

**Remover ou adaptar linhas ~638-644:**
```typescript
{/* Só mostrar botão se o texto for MUITO longo */}
{(aiReview.texto_completo || aiReview.resumo_executivo) && 
 (aiReview.texto_completo?.length || aiReview.resumo_executivo?.length || 0) > 2000 && (
  <button
    onClick={() => setShowFullReview(!showFullReview)}
    className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
  >
    {showFullReview ? '▲ Recolher' : '▼ Ver revisão completa'}
  </button>
)}
```

## Aplicação Manual:

Se não quiser usar script, edite manualmente:
1. Abra `C:\AHP-BOCR\ahp-simple\components\AIReviewCard.tsx`
2. Aplique as 5 mudanças acima
3. Salve o arquivo
4. Execute: `npm run build` e `vercel --prod`

## Resultado Esperado:

Após aplicar o patch:
- ✅ Revisão markdown completa aparece na tela
- ✅ Footer mostra "API v6.4.5"
- ✅ Botão "Copiar" funciona com texto completo
- ✅ Compatibilidade com formato v6.1 mantida (fallbacks)
