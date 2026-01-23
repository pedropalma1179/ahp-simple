// app/api/backup/route.ts
// API para backup completo dos dados do projeto

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 });
    }

    // 1. Buscar dados do projeto
    const projectDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projectDoc.exists()) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 });
    }
    const projectData = projectDoc.data() as Record<string, any>;

    // 2. Buscar todos os respondentes
    const respondentsQuery = query(
      collection(db, 'respondents'),
      where('projectId', '==', projectId)
    );
    const respondentsSnapshot = await getDocs(respondentsQuery);
    const respondents = respondentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3. Buscar todas as respostas (incluindo incompletas)
    const responsesQuery = query(
      collection(db, 'responses'),
      where('projectId', '==', projectId)
    );
    const responsesSnapshot = await getDocs(responsesQuery);
    const responses = responsesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // 4. Montar objeto de backup
    const backup = {
      metadata: {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        projectId,
        projectName: projectData.name || 'Sem nome',
        totalRespondents: respondents.length,
        totalResponses: responses.length,
        completedResponses: responses.filter((r: any) => r.completedAt).length,
      },
      project: { id: projectId, ...projectData },
      respondents,
      responses,
    };

    // 5. Retornar como JSON
    return NextResponse.json(backup);

  } catch (error) {
    console.error('Erro no backup:', error);
    return NextResponse.json({ error: 'Erro ao gerar backup' }, { status: 500 });
  }
}

// POST - Restaurar backup
export async function POST(request: NextRequest) {
  try {
    const backup = await request.json();

    if (!backup.metadata || !backup.project || !backup.responses) {
      return NextResponse.json({ error: 'Formato de backup inválido' }, { status: 400 });
    }

    // Validar estrutura mínima
    if (!backup.metadata.version || !backup.metadata.projectId) {
      return NextResponse.json({ error: 'Backup sem metadados válidos' }, { status: 400 });
    }

    // Retornar informações para confirmação (não restaura automaticamente por segurança)
    return NextResponse.json({
      success: true,
      message: 'Backup validado com sucesso',
      info: {
        projectName: backup.metadata.projectName,
        exportedAt: backup.metadata.exportedAt,
        respondents: backup.metadata.totalRespondents,
        responses: backup.metadata.totalResponses,
        completedResponses: backup.metadata.completedResponses,
      },
      // Os dados estão no backup, frontend pode decidir o que fazer
      data: backup,
    });

  } catch (error) {
    console.error('Erro na validação:', error);
    return NextResponse.json({ error: 'Erro ao validar backup' }, { status: 500 });
  }
}
