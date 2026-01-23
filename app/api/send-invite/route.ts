// app/api/send-invite/route.ts
import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { email, projectName, projectId, respondentId } = await request.json();

    if (!email || !projectName || !projectId) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    if (!RESEND_API_KEY) {
      console.log(`[SIMULADO] Email enviado para: ${email}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Email simulado (configure RESEND_API_KEY para envio real)',
        simulated: true 
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ahp-simple.vercel.app';
    const evaluationLink = `${baseUrl}/avaliacao/${projectId}?token=${respondentId}`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Pesquisa AHP-BOCR <pesquisa@resend.dev>',
        to: email,
        subject: `Convite: Avaliação de Investimentos - ${projectName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Pesquisa Acadêmica</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Mestrado em Engenharia de Produção - UNESP</p>
            </div>
            <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef;">
              <h2 style="color: #333; margin-top: 0;">Olá!</h2>
              <p>Você foi convidado(a) a participar de uma pesquisa sobre <strong>decisões de investimento em tecnologias da Indústria 4.0</strong>.</p>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                <p style="margin: 0;"><strong>Projeto:</strong> ${projectName}</p>
              </div>
              <p>A avaliação leva aproximadamente <strong>15-20 minutos</strong>. Você pode pausar e continuar depois.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${evaluationLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold;">Iniciar Avaliação</a>
              </div>
            </div>
            <div style="background: #333; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
              <p style="color: #ccc; margin: 0; font-size: 14px;">Dúvidas: <a href="mailto:pedro.palma@unesp.br" style="color: #667eea;">pedro.palma@unesp.br</a></p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Falha ao enviar email' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, id: data.id });

  } catch (error) {
    console.error('Erro ao enviar convite:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
