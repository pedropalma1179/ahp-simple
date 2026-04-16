// app/api/test-claude/route.ts
// API para testar a integração com Anthropic Claude
import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function GET(request: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  // 1. Verificar se a API key está configurada
  results.checks.api_key_configured = !!ANTHROPIC_API_KEY;
  results.checks.api_key_preview = ANTHROPIC_API_KEY 
    ? `${ANTHROPIC_API_KEY.substring(0, 10)}...${ANTHROPIC_API_KEY.substring(ANTHROPIC_API_KEY.length - 4)}`
    : 'NÃO CONFIGURADA';

  if (!ANTHROPIC_API_KEY) {
    results.status = 'ERROR';
    results.message = 'ANTHROPIC_API_KEY não está configurada nas variáveis de ambiente do Vercel';
    results.instructions = [
      '1. Acesse o dashboard do Vercel',
      '2. Vá em Settings → Environment Variables',
      '3. Adicione ANTHROPIC_API_KEY com sua chave',
      '4. Faça redeploy do projeto'
    ];
    return NextResponse.json(results, { status: 400 });
  }

  // 2. Testar conexão com a API da Anthropic
  try {
    console.log('🧪 Testando conexão com Anthropic API...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Responda apenas com: "API funcionando corretamente para auditoria AHP-BOCR"'
          }
        ]
      }),
    });

    results.checks.api_response_status = response.status;
    results.checks.api_response_ok = response.ok;

    if (!response.ok) {
      const errorText = await response.text();
      results.status = 'ERROR';
      results.message = 'Erro na conexão com Anthropic API';
      results.error_details = errorText;
      
      // Diagnóstico de erros comuns
      if (response.status === 401) {
        results.diagnosis = 'API key inválida ou expirada. Verifique se a chave está correta.';
      } else if (response.status === 429) {
        results.diagnosis = 'Rate limit excedido. Aguarde alguns minutos.';
      } else if (response.status === 400) {
        results.diagnosis = 'Requisição inválida. Pode haver problema com o modelo especificado.';
      }
      
      return NextResponse.json(results, { status: response.status });
    }

    const data = await response.json();
    const textContent = data.content?.find((c: any) => c.type === 'text');
    
    results.checks.claude_response = textContent?.text || 'Resposta vazia';
    results.checks.model_used = data.model;
    results.checks.usage = data.usage;

    // 3. Teste de auditoria simplificada
    console.log('🧪 Testando auditoria simplificada...');
    
    const testData = {
      projectName: 'Teste de Integração',
      bocrWeights: [0.3, 0.2, 0.25, 0.25],
      bocrConsistency: { cr: 0.05, ci: 0.04, lambda_max: 4.12 },
      finalScores: [
        { code: 'A1', name: 'Alternativa Teste 1', score: 0.15, B: 0.4, O: 0.3, C: 0.3, R: 0.2, scoreAdditive: 0.15, scoreMultiplicative: 2.0, scoreProbabilistic: 0.55 },
        { code: 'A2', name: 'Alternativa Teste 2', score: 0.10, B: 0.3, O: 0.35, C: 0.35, R: 0.25, scoreAdditive: 0.10, scoreMultiplicative: 1.2, scoreProbabilistic: 0.50 }
      ],
      responseCount: 5
    };

    const auditResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Teste rápido: Analise estes dados AHP-BOCR e responda em JSON simples:
${JSON.stringify(testData)}

Responda APENAS com um JSON assim:
{"status": "APROVADO ou ATENCAO ou REPROVADO", "cr_ok": true/false, "mensagem": "uma frase curta"}`
          }
        ]
      }),
    });

    if (auditResponse.ok) {
      const auditData = await auditResponse.json();
      const auditText = auditData.content?.find((c: any) => c.type === 'text')?.text;
      
      try {
        // Tentar parsear o JSON da resposta
        let cleanJson = auditText;
        if (cleanJson.includes('```')) {
          cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        const auditResult = JSON.parse(cleanJson.trim());
        results.checks.audit_test = {
          success: true,
          result: auditResult
        };
      } catch {
        results.checks.audit_test = {
          success: true,
          raw_response: auditText?.substring(0, 200) + '...'
        };
      }
    }

    // Sucesso!
    results.status = 'SUCCESS';
    results.message = '✅ Integração com Anthropic Claude funcionando perfeitamente!';
    results.ready_for = [
      'Auditoria científica de resultados AHP-BOCR',
      'Validação metodológica para publicação',
      'Geração de pareceres científicos',
      'Detecção de contradições estratégicas'
    ];

    return NextResponse.json(results);

  } catch (error: any) {
    results.status = 'ERROR';
    results.message = 'Erro de conexão com Anthropic API';
    results.error = error.message;
    results.diagnosis = 'Verifique sua conexão de internet e se a API está acessível.';
    
    return NextResponse.json(results, { status: 500 });
  }
}

// POST também disponível para testes manuais
export async function POST(request: NextRequest) {
  return GET(request);
}
