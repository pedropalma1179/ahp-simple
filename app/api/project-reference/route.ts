// app/api/project-reference/route.ts
//
// F07, A2: escolher a REFERÊNCIA do projeto. Ver `lib/escolha-de-referencia.ts` para a ordem das
// operações dentro da transação e para o que esta rota NÃO faz (não autentica quem escolhe).
//
// Corpo: { projectId, executionId, expectedRevision, operationId, justification }.
//   - `operationId` é do pedido e fica VINCULADO ao conteúdo: o mesmo `operationId` com outro
//     `projectId`, `executionId`, `expectedRevision` ou `justification` é recusado (409).
//   - A execução é lida do BANCO, e o `projectId` dela é conferido contra o do pedido: a rota não
//     confia no cliente para dizer a que projeto a execução pertence.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { identificadorValido } from '@/lib/execucoes';
import { escolherReferencia } from '@/lib/escolha-de-referencia';

const recusa = (status: number, codigo: string, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, codigo, error, ...extra }, { status });

export async function POST(request: NextRequest) {
  try {
    let corpo: any;
    try {
      corpo = await request.json();
    } catch {
      return recusa(400, 'corpo-ilegivel', 'O corpo do pedido não é um JSON válido.');
    }
    const { projectId, executionId, expectedRevision, operationId, justification } = corpo ?? {};

    if (typeof projectId !== 'string' || projectId === '') {
      return recusa(400, 'projectId-invalido', 'projectId é obrigatório e deve ser texto.');
    }
    if (typeof executionId !== 'string' || executionId === '') {
      return recusa(400, 'executionId-invalido', 'executionId é obrigatório e deve ser texto.');
    }
    if (!identificadorValido(operationId)) {
      return recusa(
        400,
        'operation-id-ausente-ou-invalido',
        'operationId é obrigatório e deve ser um identificador de 8 a 128 caracteres (letras, dígitos, "_" e "-"). Recarregue a página para obter a versão atual da tela e repita o pedido.'
      );
    }
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      return recusa(400, 'expected-revision-invalida', 'expectedRevision é obrigatório e deve ser um inteiro maior ou igual a 0 (0 quando o projeto ainda não tem referência).');
    }
    if (typeof justification !== 'string' || justification.trim() === '') {
      return recusa(400, 'justificativa-obrigatoria', 'A justificativa é obrigatória e não pode ser vazia.');
    }

    const desfecho = await escolherReferencia(db, { projectId, executionId, expectedRevision, operationId, justification });

    switch (desfecho.tipo) {
      case 'efetivada':
        return NextResponse.json({ success: true, recuperada: false, evento: desfecho.evento, referencia: desfecho.referencia });
      case 'ja-registrada':
        return NextResponse.json({
          success: true,
          recuperada: true,
          message: 'Escolha já registrada: devolvidos o evento histórico e a referência corrente, sem nova escrita.',
          evento: desfecho.evento,
          referencia: desfecho.referencia,
        });
      case 'operationId-reutilizado':
        return recusa(409, 'operationId-reutilizado', `O operationId ${operationId} já foi usado com outro conteúdo. Cada escolha nova precisa de um operationId novo.`);
      case 'referencia-ja-existe':
        return recusa(409, 'referencia-ja-existe', 'O projeto já tem uma referência escolhida. Recarregue e escolha de novo a partir da revisão atual.', { referencia: desfecho.referencia });
      case 'referencia-mudou':
        return recusa(409, 'referencia-mudou', 'A referência do projeto mudou desde que a tela a carregou. Nada foi gravado; a referência corrente segue em "referencia".', { referencia: desfecho.referencia });
      case 'execucao-inexistente':
        return recusa(404, 'execucao-inexistente', `A execução ${executionId} não existe.`);
      case 'execucao-de-outro-projeto':
        return recusa(409, 'execucao-de-outro-projeto', `A execução ${executionId} não pertence ao projeto ${projectId}.`);
    }
  } catch (error: any) {
    console.error('[project-reference] Erro:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
