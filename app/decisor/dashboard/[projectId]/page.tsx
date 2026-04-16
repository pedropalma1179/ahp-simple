// app/decisor/dashboard/[projectId]/page.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Project, BOCR_CRITERIA, SUBCRITERIA, Respondent } from '@/lib/data';


export default function DashboardPage() {
    const params = useParams();
    const projectId = params.projectId as string;
    const reportRef = useRef<HTMLDivElement>(null);

    const [project, setProject] = useState<Project | null>(null);
    const [responses, setResponses] = useState<any[]>([]);
    const [respondents, setRespondents] = useState<Record<string, any>>({});
    const [allRespondents, setAllRespondents] = useState<(Respondent & { id: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'responses' | 'specialists' | 'results' | 'sensitivity' | 'report'>('overview');
    const [results, setResults] = useState<any>(null);
    const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

    // Estados para Análise de Sensibilidade (Módulo 6)
    const [customWeights, setCustomWeights] = useState<{ B: number; O: number; C: number; R: number }>({ B: 25, O: 25, C: 25, R: 25 });
    const [useCustomWeights, setUseCustomWeights] = useState(false);
    const [sensitivityData, setSensitivityData] = useState<any>(null);

    // Estados para AI Decision Auditor
    const [aiAudit, setAiAudit] = useState<any>(null);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditError, setAuditError] = useState<string | null>(null);
    const [auditMethod, setAuditMethod] = useState<'ai' | 'local' | null>(null);

    // Estados para AI Scientific Writer
    const [generatedArticle, setGeneratedArticle] = useState<string | null>(null);
    const [articleLoading, setArticleLoading] = useState(false);
    const [articleError, setArticleError] = useState<string | null>(null);
    const [articleMethod, setArticleMethod] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState<'claude' | 'gemini'>('gemini');
    const [articleLiterature, setArticleLiterature] = useState<any>(null);

    // Estados para Backup e Proteção de Dados
    const [lastBackup, setLastBackup] = useState<string | null>(null);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [backupData, setBackupData] = useState<any>(null);

    useEffect(() => {
        // Auth é verificada pelo layout.tsx (sessionStorage)
        // Apenas carrega dados se projectId disponível
        if (projectId) {
            loadData();
        }
    }, [projectId]);

    useEffect(() => {
        if (results?.bocrWeights) {
            setCustomWeights({
                B: Math.round(results.bocrWeights[0] * 100),
                O: Math.round(results.bocrWeights[1] * 100),
                C: Math.round(results.bocrWeights[2] * 100),
                R: Math.round(results.bocrWeights[3] * 100),
            });
        }
    }, [results?.bocrWeights]);

    useEffect(() => {
        if (results) {
            calculateSensitivityData();
        }
    }, [results]);

    // Auto-backup desabilitado — rota /api/backup não implementada
    // TODO: Reabilitar quando /api/backup estiver funcional

    /**
     * Carrega resultados pré-calculados do Firestore.
     * Os cálculos são feitos pelo backend (app/api/calculate/route.ts)
     * que suporta IPC, magnitude weights, e 5 fórmulas de síntese.
     */
    const loadCalculations = async (proj: Project) => {
        try {
            const calcDoc = await getDoc(doc(db, 'calculations', projectId));

            if (!calcDoc.exists()) {
                console.log('[DASHBOARD] Nenhum cálculo encontrado. Use "Calcular Resultados" na página de projetos.');
                return;
            }

            const calc = calcDoc.data();
            console.log('[DASHBOARD] Cálculos carregados:', {
                version: calc.metadata?.version,
                responseCount: calc.responseCount,
                calculatedAt: calc.calculatedAt
            });

            // Reconstruir globalWeights a partir de bocrWeights + subWeights
            const bocrWeights = calc.bocrWeights || [0.25, 0.25, 0.25, 0.25];
            const subWeights = calc.subWeights || {};

            const globalWeights: { code: string; name: string; group: string; localWeight: number; globalWeight: number }[] = [];
            ['B', 'O', 'C', 'R'].forEach((group, groupIdx) => {
                const subCodes = SUBCRITERIA.filter(s => s.group === group);
                const groupWeight = bocrWeights[groupIdx];
                const groupSubWeights = subWeights[group] || [];

                subCodes.forEach((sub, subIdx) => {
                    const localWeight = groupSubWeights[subIdx] || 0;
                    globalWeights.push({
                        code: sub.code,
                        name: sub.name,
                        group,
                        localWeight,
                        globalWeight: groupWeight * localWeight,
                    });
                });
            });
            globalWeights.sort((a, b) => b.globalWeight - a.globalWeight);

            // Obter alternativas do projeto
            const alternatives = proj.alternatives || [
                { code: 'A1', name: 'Alternativa 1', description: '' },
                { code: 'A2', name: 'Alternativa 2', description: '' }
            ];

            // Montar o estado results com a mesma shape esperada pelo JSX
            setResults({
                bocrWeights,
                bocrConsistency: calc.bocrConsistency || { cr: 0, ci: 0, lambda: 0 },
                rescalingWeights: calc.rescalingWeights || null,
                magnitudeConsistency: calc.magnitudeConsistency || null,
                subWeights,
                subConsistency: calc.subConsistency || {},
                altScores: calc.altScores || {},
                altMeritScores: calc.altMeritScores || [],
                finalScores: calc.finalScores || [],
                globalWeights,
                responseCount: calc.responseCount || 0,
                alternatives,
                calculatedAt: calc.calculatedAt,
                metadata: calc.metadata,
                // Campos IPC (se disponíveis)
                ipcMetadata: calc.ipcMetadata || null,
                // Sensibilidade pré-calculada (pontos de inflexão)
                sensitivityInflections: calc.sensitivityInflections || null,
            });

        } catch (error) {
            console.error('[DASHBOARD] Erro ao carregar cálculos:', error);
        }
    };

    const loadData = async () => {
        try {
            const projectDoc = await getDoc(doc(db, 'projects', projectId));
            if (!projectDoc.exists()) {
                console.error('[DASHBOARD] Projeto não encontrado:', projectId);
                window.location.href = '/decisor/projetos';
                return;
            }
            const projectData = projectDoc.data() as Project & { respondents?: any[] };

            // Verificar propriedade do projeto
            const currentUserId = sessionStorage.getItem('userId') || 'default';
            if (projectData.ownerId && projectData.ownerId !== currentUserId) {
                console.error('[DASHBOARD] Acesso negado: projeto pertence a outro decisor');
                window.location.href = '/decisor/projetos';
                return;
            }

            setProject(projectData);

            console.log('🔍 Carregando dados do projeto:', projectId);

            // Buscar responses completadas
            const responsesQuery = query(collection(db, 'responses'), where('projectId', '==', projectId), where('completedAt', '!=', null));
            const responsesSnapshot = await getDocs(responsesQuery);
            const allResponsesList = responsesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
            console.log('📝 Responses encontradas:', allResponsesList.length);

            // Buscar respondents da coleção separada
            const allRespondentsQuery = query(collection(db, 'respondents'), where('projectId', '==', projectId));
            const allRespondentsSnapshot = await getDocs(allRespondentsQuery);
            let allRespondentsList = allRespondentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as (Respondent & { id: string })[];
            console.log('👥 Respondents da coleção:', allRespondentsList.length);

            // Se não encontrou na coleção, verificar se estão embutidos no projeto
            if (allRespondentsList.length === 0 && projectData.respondents && Array.isArray(projectData.respondents)) {
                console.log('📦 Usando respondents embutidos no projeto');
                allRespondentsList = projectData.respondents.map((r: any, idx: number) => ({
                    id: r.id || `embedded-${idx}`,
                    projectId: projectId,
                    email: r.email,
                    accessCode: r.accessCode || r.code,
                    status: r.status || 'pending',
                    ...r
                }));
            }

            // Log se nenhum respondente encontrado (não buscar ALL — risco de vazamento)
            if (allRespondentsList.length === 0) {
                console.log('[DASHBOARD] Nenhum respondente encontrado para o projeto:', projectId);
            }

            setAllRespondents(allRespondentsList);

            const validRespondentIds = new Set(allRespondentsList.map(r => r.id));
            const responsesList = allResponsesList.filter(r => validRespondentIds.has(r.respondentId));

            // Setar responses para a tab de avaliações
            if (responsesList.length === 0 && allResponsesList.length > 0) {
                console.log('⚠️ Usando todas as responses do projeto');
                setResponses(allResponsesList);
            } else {
                setResponses(responsesList);
            }

            // Carregar resultados pré-calculados (API calculate)
            await loadCalculations(projectData);

            const respondentsMap: Record<string, any> = {};
            for (const resp of allRespondentsList) {
                respondentsMap[resp.id] = resp;
            }
            setRespondents(respondentsMap);

        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };


// Recalcular scores com pesos customizados
const customScores = useMemo(() => {
    if (!results?.altMeritScores) return [];

    const weights = useCustomWeights ? {
        B: customWeights.B / 100,
        O: customWeights.O / 100,
        C: customWeights.C / 100,
        R: customWeights.R / 100,
    } : {
        B: results.bocrWeights[0],
        O: results.bocrWeights[1],
        C: results.bocrWeights[2],
        R: results.bocrWeights[3],
    };

    const scores = results.altMeritScores.map((alt: any) => ({
        ...alt,
        // Fórmula correta: b×B + o×O + c×(1-C) + r×(1-R)
        score: (weights.B * alt.B + weights.O * alt.O + weights.C * (1 - alt.C) + weights.R * (1 - alt.R))
    }));

    return scores.sort((a: any, b: any) => b.score - a.score);
}, [results, customWeights, useCustomWeights]);

// Calcular dados para gráficos de sensibilidade
const calculateSensitivityData = () => {
    if (!results?.altMeritScores || results.altMeritScores.length < 2) return;

    const data: Record<string, { weight: number; scores: Record<string, number> }[]> = {};
    const inflectionPoints: Record<string, number | null> = {};

    ['B', 'O', 'C', 'R'].forEach(merit => {
        data[merit] = [];
        let lastWinner: string | null = null;
        let inflection: number | null = null;

        for (let w = 0; w <= 100; w += 2) {
            const testWeight = w / 100;
            const otherWeight = (1 - testWeight) / 3;

            const weights = {
                B: merit === 'B' ? testWeight : otherWeight,
                O: merit === 'O' ? testWeight : otherWeight,
                C: merit === 'C' ? testWeight : otherWeight,
                R: merit === 'R' ? testWeight : otherWeight,
            };

            const scores: Record<string, number> = {};
            results.altMeritScores.forEach((alt: any) => {
                // Fórmula correta: b×B + o×O + c×(1-C) + r×(1-R)
                scores[alt.code] = (weights.B * alt.B + weights.O * alt.O + weights.C * (1 - alt.C) + weights.R * (1 - alt.R));
            });

            data[merit].push({ weight: w, scores });

            const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
            if (lastWinner && winner !== lastWinner && inflection === null) {
                inflection = w;
            }
            lastWinner = winner;
        }

        inflectionPoints[merit] = inflection;
    });

    setSensitivityData({ data, inflectionPoints });
};

const handleDeleteResponse = async (responseId: string) => {
    if (!confirm('Excluir esta avaliação?')) return;
    try {
        await deleteDoc(doc(db, 'responses', responseId));
        loadData();
    } catch (error) {
        console.error('Erro:', error);
    }
};

const handleCopyInvite = (respondent: Respondent & { id: string }) => {
    const surveyLink = `${window.location.origin}/avaliacao/${projectId}`;
    const text = `Olá! Você foi convidado(a) para participar da pesquisa "${project?.name || 'AHP-BOCR'}".

📋 Link: ${surveyLink}
🔑 Código de acesso: ${respondent.accessCode}

Obrigado pela participação!`;

    navigator.clipboard.writeText(text);
    setCopiedInviteId(respondent.id);
    setTimeout(() => setCopiedInviteId(null), 2000);
};

const handleResendInvite = (respondent: Respondent & { id: string }) => {
    handleCopyInvite(respondent);
};

const normalizeWeights = (changed: keyof typeof customWeights, value: number) => {
    const total = Object.entries(customWeights)
        .filter(([k]) => k !== changed)
        .reduce((sum, [, v]) => sum + v, 0);

    const remaining = 100 - value;
    const scale = total > 0 ? remaining / total : 0;

    setCustomWeights(prev => {
        const newWeights = { ...prev, [changed]: value };
        Object.keys(newWeights).forEach(k => {
            if (k !== changed) {
                newWeights[k as keyof typeof customWeights] = Math.round(prev[k as keyof typeof customWeights] * scale);
            }
        });
        return newWeights;
    });
};

const resetWeights = () => {
    if (results?.bocrWeights) {
        setCustomWeights({
            B: Math.round(results.bocrWeights[0] * 100),
            O: Math.round(results.bocrWeights[1] * 100),
            C: Math.round(results.bocrWeights[2] * 100),
            R: Math.round(results.bocrWeights[3] * 100),
        });
    }
};

const applyScenario = (scenario: 'financial' | 'innovation' | 'risk') => {
    setUseCustomWeights(true);
    if (scenario === 'financial') {
        setCustomWeights({ B: 15, O: 10, C: 50, R: 25 });
    } else if (scenario === 'innovation') {
        setCustomWeights({ B: 20, O: 50, C: 15, R: 15 });
    } else if (scenario === 'risk') {
        setCustomWeights({ B: 15, O: 15, C: 20, R: 50 });
    }
};

// AI Decision Auditor
const runAIAudit = async () => {
    if (!results) return;

    setAuditLoading(true);
    setAuditError(null);
    setAuditMethod(null);

    try {
        const calculationData = {
            projectName: project?.name,
            bocrWeights: results.bocrWeights,
            bocrConsistency: results.bocrConsistency,
            subConsistency: results.subConsistency,
            altMeritScores: results.altMeritScores,  // Scores B, O, C, R por alternativa
            finalScores: results.finalScores,
            alternatives: results.alternatives,
            globalWeights: results.globalWeights,
            responseCount: results.responseCount,
            sensitivityInflections: sensitivityData?.inflectionPoints,
            metadata: {
                projectName: project?.name,
                projectDescription: project?.description,
                alternativesCount: results.alternatives?.length || 0
            }
        };

        const response = await fetch('/api/audit-decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calculationData }),
        });

        const data = await response.json();

        if (data.success) {
            setAiAudit(data.audit);
            setAuditMethod(data.method || 'local');
        } else {
            setAuditError(data.error || 'Erro na auditoria');
        }
    } catch (error: any) {
        console.error('Erro na auditoria:', error);
        setAuditError('Erro ao conectar com o serviço de auditoria');
    } finally {
        setAuditLoading(false);
    }
};

// Exportar CSV
const exportCSV = () => {
    if (!results) return;

    let csv = 'RELATÓRIO AHP-BOCR\n';
    csv += `Projeto:,${project?.name}\n`;
    csv += `Data:,${new Date().toLocaleDateString('pt-BR')}\n`;
    csv += `Respondentes:,${results.responseCount}\n\n`;

    csv += 'PESOS BOCR\n';
    csv += 'Mérito,Peso\n';
    BOCR_CRITERIA.forEach((c, i) => {
        csv += `${c.name},${(results.bocrWeights[i] * 100).toFixed(2)}%\n`;
    });
    csv += `CR,${(results.bocrConsistency?.cr * 100).toFixed(2)}%\n\n`;

    csv += 'PESOS GLOBAIS DOS SUBCRITÉRIOS\n';
    csv += 'Código,Nome,Grupo,Peso Local,Peso Global\n';
    results.globalWeights.forEach((w: any) => {
        csv += `${w.code},${w.name},${w.group},${(w.localWeight * 100).toFixed(2)}%,${(w.globalWeight * 100).toFixed(2)}%\n`;
    });
    csv += '\n';

    csv += 'RANKING FINAL - 5 MÉTODOS DE SÍNTESE BOCR (Petrillo et al., 2023)\n';
    csv += 'Alternativa,B,O,C,R,Additive,Probabilistic,Subtractive (norm),MultPowers (norm),MultSimple (norm)\n';
    results.finalScores.forEach((alt: any) => {
        csv += `${alt.name},${alt.B.toFixed(4)},${alt.O.toFixed(4)},${alt.C.toFixed(4)},${alt.R.toFixed(4)},`;
        csv += `${alt.scoreAdditive?.toFixed(4)},${alt.scoreProbabilistic?.toFixed(4)},${alt.scoreSubtractiveNorm?.toFixed(4)},`;
        csv += `${alt.scoreMultPowersNorm?.toFixed(4)},${alt.scoreMultSimpleNorm?.toFixed(4)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-ahp-bocr-${project?.name?.replace(/\s+/g, '-')}.csv`;
    link.click();
};

// Exportar XLSX (Excel)
const exportXLSX = async () => {
    if (!results) return;

    // Carregar biblioteca SheetJS dinamicamente
    const XLSX = await import('xlsx');

    // Criar workbook
    const wb = XLSX.utils.book_new();

    // === ABA 1: Resumo ===
    const resumoData = [
        ['RELATÓRIO AHP-BOCR'],
        [''],
        ['Projeto', project?.name || ''],
        ['Data', new Date().toLocaleDateString('pt-BR')],
        ['Respondentes', results.responseCount],
        ['CR Global', `${(results.bocrConsistency?.cr * 100).toFixed(2)}%`],
        [''],
        ['PESOS BOCR'],
        ['Mérito', 'Peso'],
        ...BOCR_CRITERIA.map((c, i) => [c.name, results.bocrWeights[i]]),
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);

    // Formatar colunas
    wsResumo['!cols'] = [{ wch: 20 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // === ABA 2: Pesos Globais ===
    const pesosData = [
        ['PESOS GLOBAIS DOS SUBCRITÉRIOS'],
        [''],
        ['Rank', 'Código', 'Nome', 'Grupo', 'Peso Local', 'Peso Global'],
        ...results.globalWeights
            .sort((a: any, b: any) => b.globalWeight - a.globalWeight)
            .map((w: any, i: number) => [
                i + 1,
                w.code,
                w.name,
                w.group,
                w.localWeight,
                w.globalWeight
            ])
    ];
    const wsPesos = XLSX.utils.aoa_to_sheet(pesosData);
    wsPesos['!cols'] = [{ wch: 6 }, { wch: 8 }, { wch: 40 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsPesos, 'Pesos Globais');

    // === ABA 3: Ranking 5 Métodos ===
    const rankingData = [
        ['RANKING FINAL - 5 MÉTODOS DE SÍNTESE BOCR'],
        ['Referência: Petrillo, Salomon & Tramarico (2023)'],
        [''],
        ['Alternativa', 'B', 'O', 'C', 'R', 'Additive', 'Probabilistic', 'Subtractive', 'Mult.Powers', 'Mult.Simple'],
        ...results.finalScores.map((alt: any) => [
            alt.name,
            alt.B,
            alt.O,
            alt.C,
            alt.R,
            alt.scoreAdditive,
            alt.scoreProbabilistic,
            alt.scoreSubtractiveNorm,
            alt.scoreMultPowersNorm,
            alt.scoreMultSimpleNorm
        ])
    ];
    const wsRanking = XLSX.utils.aoa_to_sheet(rankingData);
    wsRanking['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking');

    // === ABA 4: Scores por Alternativa ===
    const scoresData = [
        ['SCORES POR MÉRITO BOCR'],
        [''],
        ['Alternativa', 'Benefits', 'Opportunities', 'Costs', 'Risks', 'B+O (positivo)', 'C+R (negativo)', 'Score Final'],
        ...results.finalScores.map((alt: any) => [
            alt.name,
            alt.B,
            alt.O,
            alt.C,
            alt.R,
            alt.B + alt.O,
            alt.C + alt.R,
            alt.scoreAdditive
        ])
    ];
    const wsScores = XLSX.utils.aoa_to_sheet(scoresData);
    wsScores['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsScores, 'Scores');

    // === ABA 5: Sensibilidade ===
    const sensData = [
        ['ANÁLISE DE SENSIBILIDADE'],
        [''],
        ['Mérito', 'Ponto de Inversão', 'Status'],
        ['Benefits', sensitivityData?.inflectionPoints?.B ? `${sensitivityData.inflectionPoints.B}%` : 'Estável', sensitivityData?.inflectionPoints?.B ? 'Sensível' : '✓ Estável'],
        ['Opportunities', sensitivityData?.inflectionPoints?.O ? `${sensitivityData.inflectionPoints.O}%` : 'Estável', sensitivityData?.inflectionPoints?.O ? 'Sensível' : '✓ Estável'],
        ['Costs', sensitivityData?.inflectionPoints?.C ? `${sensitivityData.inflectionPoints.C}%` : 'Estável', sensitivityData?.inflectionPoints?.C ? 'Sensível' : '✓ Estável'],
        ['Risks', sensitivityData?.inflectionPoints?.R ? `${sensitivityData.inflectionPoints.R}%` : 'Estável', sensitivityData?.inflectionPoints?.R ? 'Sensível' : '✓ Estável'],
    ];
    const wsSens = XLSX.utils.aoa_to_sheet(sensData);
    wsSens['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSens, 'Sensibilidade');

    // === ABA 6: Metodologia ===
    const metodoData = [
        ['METODOLOGIA AHP-BOCR'],
        [''],
        ['Fórmulas de Síntese (Tabela 5, Petrillo et al., 2023)'],
        [''],
        ['#', 'Método', 'Fórmula'],
        [1, 'Additive', 'bB + oO + c(1/C)n + r(1/R)n'],
        [2, 'Probabilistic', 'bB + oO + c(1-C) + r(1-R)'],
        [3, 'Subtractive', 'bB + oO + cC - rR'],
        [4, 'Multiplicative Powers', 'B^b × O^o × (1/C)^c × (1/R)^r'],
        [5, 'Multiplicative Simple', '(B × O) / (C × R)'],
        [''],
        ['Referências'],
        ['SAATY, T. L. The Analytic Hierarchy Process. McGraw-Hill, 1980.'],
        ['WIJNMALEN, D. J. D. Analysis of BOCR with the AHP-ANP. Math. Comp. Model., 2007.'],
        ['PETRILLO, A. et al. State-of-the-Art Review on AHP-BOCR. JRFM, 2023.'],
    ];
    const wsMetodo = XLSX.utils.aoa_to_sheet(metodoData);
    wsMetodo['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsMetodo, 'Metodologia');

    // Gerar arquivo e download
    const fileName = `relatorio-ahp-bocr-${project?.name?.replace(/\s+/g, '-') || 'projeto'}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

// Exportar JSON (para análises adicionais)
const exportJSON = () => {
    if (!results) return;

    const data = {
        project: project?.name,
        date: new Date().toISOString(),
        respondentCount: results.responseCount,
        bocrWeights: {
            B: results.bocrWeights[0],
            O: results.bocrWeights[1],
            C: results.bocrWeights[2],
            R: results.bocrWeights[3],
        },
        consistency: results.bocrConsistency,
        subWeights: results.subWeights,
        globalWeights: results.globalWeights,
        finalScores: results.finalScores,
        sensitivityData,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dados-ahp-bocr-${project?.name?.replace(/\s+/g, '-')}.json`;
    link.click();
};


// AI Scientific Writer - Gerar texto do artigo
const generateArticle = async () => {
    if (!results) return;

    setArticleLoading(true);
    setArticleError(null);
    setArticleMethod(null);
    setArticleLiterature(null);

    try {
        const calculationData = {
            projectName: project?.name,
            projectDescription: project?.description,
            bocrWeights: results.bocrWeights,
            bocrConsistency: results.bocrConsistency,
            subConsistency: results.subConsistency,
            altMeritScores: results.altMeritScores,
            finalScores: results.finalScores,
            globalWeights: results.globalWeights,
            responseCount: results.responseCount,
            sensitivityInflections: sensitivityData?.inflectionPoints,
        };

        const response = await fetch('/api/generate-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                calculationData,
                projectContext: {
                    projectName: project?.name,
                    projectDescription: project?.description
                },
                model: selectedModel,
                searchLiterature: true
            }),
        });

        const data = await response.json();

        if (data.success) {
            setGeneratedArticle(data.article);
            setArticleMethod(data.model || 'unknown');
            setArticleLiterature(data.literature || null);
        } else {
            setArticleError(data.error || 'Erro ao gerar artigo');
        }
    } catch (error: any) {
        console.error('Erro ao gerar artigo:', error);
        setArticleError('Erro ao conectar com o serviço de geração');
    } finally {
        setArticleLoading(false);
    }
};

// Exportar artigo como DOCX
const exportArticleAsDocx = async () => {
    if (!generatedArticle) return;

    // Converter Markdown para HTML simples
    const htmlContent = generatedArticle
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\| /g, '| ')
        .replace(/\n/g, '<br/>');

    const docContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Artigo AHP-BOCR - ${project?.name}</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; margin: 2.5cm; }
    h2 { font-size: 14pt; font-weight: bold; margin-top: 24pt; }
    h3 { font-size: 12pt; font-weight: bold; margin-top: 18pt; }
    p { text-align: justify; margin-bottom: 12pt; }
    table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
    th, td { border: 1px solid #000; padding: 6pt; text-align: left; }
    th { background-color: #f0f0f0; }
  </style>
</head>
<body>
  <p>${htmlContent}</p>
</body>
</html>`;

    const blob = new Blob([docContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `artigo-ahp-bocr-${project?.name?.replace(/\s+/g, '-')}.doc`;
    link.click();
};

// Copiar artigo para clipboard
const copyArticleToClipboard = async () => {
    if (!generatedArticle) return;
    try {
        await navigator.clipboard.writeText(generatedArticle);
        alert('Artigo copiado para a área de transferência!');
    } catch (err) {
        console.error('Erro ao copiar:', err);
    }
};

if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-gray-500">Carregando...</div></div>;
}

const stats = {
    pending: allRespondents.filter(r => r.status === 'pending').length,
    inProgress: allRespondents.filter(r => r.status === 'in_progress').length,
    completed: allRespondents.filter(r => r.status === 'completed').length,
};

const totalCustomWeight = customWeights.B + customWeights.O + customWeights.C + customWeights.R;

// Verificar robustez (vencedor é o mesmo nos 5 métodos)
const isRobust = results?.finalScores?.length >= 2 && (() => {
    const w1 = [...results.finalScores].sort((a: any, b: any) => b.scoreAdditive - a.scoreAdditive)[0].code;
    const w2 = [...results.finalScores].sort((a: any, b: any) => b.scoreProbabilistic - a.scoreProbabilistic)[0].code;
    const w3 = [...results.finalScores].sort((a: any, b: any) => b.scoreSubtractiveNorm - a.scoreSubtractiveNorm)[0].code;
    const w4 = [...results.finalScores].sort((a: any, b: any) => b.scoreMultPowersNorm - a.scoreMultPowersNorm)[0].code;
    const w5 = [...results.finalScores].sort((a: any, b: any) => b.scoreMultSimpleNorm - a.scoreMultSimpleNorm)[0].code;
    // Robusto se todos os métodos concordam
    return w1 === w2 && w2 === w3 && w3 === w4 && w4 === w5;
})();

// Contar quantos métodos concordam com o vencedor do método Additive
const methodsAgreement = results?.finalScores?.length >= 2 ? (() => {
    const w1 = [...results.finalScores].sort((a: any, b: any) => b.scoreAdditive - a.scoreAdditive)[0].code;
    const w2 = [...results.finalScores].sort((a: any, b: any) => b.scoreProbabilistic - a.scoreProbabilistic)[0].code;
    const w3 = [...results.finalScores].sort((a: any, b: any) => b.scoreSubtractiveNorm - a.scoreSubtractiveNorm)[0].code;
    const w4 = [...results.finalScores].sort((a: any, b: any) => b.scoreMultPowersNorm - a.scoreMultPowersNorm)[0].code;
    const w5 = [...results.finalScores].sort((a: any, b: any) => b.scoreMultSimpleNorm - a.scoreMultSimpleNorm)[0].code;
    return [w1, w2, w3, w4, w5].filter(w => w === w1).length;
})() : 0;

return (
    <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">{project?.name}</h1>
                        <p className="text-sm text-gray-500">{project?.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {results && (
                            <button
                                onClick={() => setActiveTab('report')}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                                📄 Relatório Científico
                            </button>
                        )}
                        <a href="/decisor/projetos" className="text-sm text-indigo-600 hover:text-indigo-700">← Voltar aos Projetos</a>
                    </div>
                </div>
            </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-6">
            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
                {[
                    { id: 'overview', label: '📊 Visão Geral' },
                    { id: 'responses', label: `👥 Avaliações (${responses.length})` },
                    { id: 'specialists', label: `🎓 Especialistas (${allRespondents.filter(r => r.perfilCompleto).length})` },
                    { id: 'results', label: '🏆 Resultados' },
                    { id: 'sensitivity', label: '🔬 Sensibilidade' },
                    { id: 'report', label: '📄 Relatório' },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Banner: sem cálculo */}
            {!results && !loading && responses.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h3 className="font-medium text-amber-800">Resultados não calculados</h3>
                            <p className="text-sm text-amber-700">
                                Existem {responses.length} avaliação(ões) coletada(s), mas os resultados ainda não foram processados.
                                Vá em <strong>Projetos → Gerenciar → Calcular Resultados</strong> para gerar os cálculos.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Visão Geral */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-gray-500">Total Convidados</p>
                            <p className="text-3xl font-bold text-gray-800">{allRespondents.length}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-gray-500">Pendentes</p>
                            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-gray-500">Em Andamento</p>
                            <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
                        </div>
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <p className="text-sm text-gray-500">Concluídos</p>
                            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                        </div>
                    </div>

                    {/* Seção de Backup e Proteção de Dados */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">💾</span>
                                <h3 className="font-semibold text-gray-800">Proteção de Dados</h3>
                            </div>
                            {lastBackup && (
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                    ✓ Último backup: {new Date(lastBackup).toLocaleString('pt-BR')}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button
                                onClick={async () => {
                                    setIsBackingUp(true);
                                    try {
                                        const response = await fetch(`/api/backup?projectId=${projectId}`);
                                        if (!response.ok) throw new Error('Falha no backup');
                                        const backup = await response.json();
                                        localStorage.setItem(`backup_${projectId}`, JSON.stringify(backup));
                                        localStorage.setItem(`lastBackup_${projectId}`, new Date().toISOString());
                                        setLastBackup(new Date().toISOString());
                                        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        const safeName = (project?.name || 'projeto').replace(/[^a-zA-Z0-9]/g, '_');
                                        a.download = `backup_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    } catch (error) {
                                        alert('Erro ao gerar backup');
                                    } finally {
                                        setIsBackingUp(false);
                                    }
                                }}
                                disabled={isBackingUp}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isBackingUp ? (
                                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Gerando...</span></>
                                ) : (
                                    <><span>📥</span><span>Download Backup</span></>
                                )}
                            </button>
                            <label className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors cursor-pointer">
                                <span>📤</span><span>Carregar Backup</span>
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            try {
                                                const backup = JSON.parse(ev.target?.result as string);
                                                if (!backup.metadata || !backup.responses) {
                                                    alert('Arquivo de backup inválido');
                                                    return;
                                                }
                                                setBackupData(backup);
                                                setShowBackupModal(true);
                                            } catch {
                                                alert('Erro ao ler arquivo');
                                            }
                                        };
                                        reader.readAsText(file);
                                        e.target.value = '';
                                    }}
                                    className="hidden"
                                />
                            </label>
                            <button
                                onClick={() => {
                                    const saved = localStorage.getItem(`backup_${projectId}`);
                                    if (!saved) {
                                        alert('Nenhum backup local encontrado');
                                        return;
                                    }
                                    try {
                                        const backup = JSON.parse(saved);
                                        setBackupData(backup);
                                        setShowBackupModal(true);
                                    } catch {
                                        alert('Erro ao ler backup local');
                                    }
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                            >
                                <span>🔄</span><span>Backup Local</span>
                            </button>
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-blue-800">
                                <strong>Auto-backup:</strong> O sistema salva automaticamente a cada 30 minutos no navegador.
                                Para máxima segurança, faça download do backup regularmente e guarde em local seguro.
                            </p>
                        </div>
                    </div>

                    {/* Modal de Backup */}
                    {showBackupModal && backupData && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                                <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Dados do Backup</h3>
                                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                                    <p><strong>Projeto:</strong> {backupData.metadata.projectName}</p>
                                    <p><strong>Exportado em:</strong> {new Date(backupData.metadata.exportedAt).toLocaleString('pt-BR')}</p>
                                    <p><strong>Especialistas:</strong> {backupData.metadata.totalRespondents}</p>
                                    <p><strong>Respostas completas:</strong> {backupData.metadata.completedResponses}</p>
                                </div>
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-yellow-800">
                                        <strong>⚠️ Dados preservados:</strong> Este backup contém todos os julgamentos dos especialistas e pode ser usado para análise offline ou reimportação.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!backupData?.responses) return;
                                        const completed = backupData.responses.filter((r: any) => r.completedAt);
                                        if (completed.length === 0) {
                                            alert('Nenhuma resposta completa');
                                            return;
                                        }
                                        const headers = ['respondentId', 'completedAt'];
                                        const first = completed[0];
                                        if (first.judgments) {
                                            first.judgments.forEach((_: any, idx: number) => {
                                                headers.push(`Q${idx + 1}_type`, `Q${idx + 1}_group`, `Q${idx + 1}_itemA`, `Q${idx + 1}_itemB`, `Q${idx + 1}_value`, `Q${idx + 1}_favors`);
                                            });
                                        }
                                        const rows = completed.map((r: any) => {
                                            const row = [r.respondentId, r.completedAt];
                                            if (r.judgments) {
                                                r.judgments.forEach((j: any) => {
                                                    row.push(j.type || '', j.group || '', j.itemA || '', j.itemB || '', j.saatyValue || '', j.favors || '');
                                                });
                                            }
                                            return row.join(';');
                                        });
                                        const csv = [headers.join(';'), ...rows].join('\n');
                                        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `julgamentos_${backupData.metadata.projectName.replace(/\s/g, '_')}.csv`;
                                        a.click();
                                    }}
                                    className="w-full py-2 mb-4 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                                >
                                    📊 Exportar Julgamentos como CSV
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setShowBackupModal(false); setBackupData(null); }}
                                        className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        Fechar
                                    </button>
                                    <button
                                        onClick={() => {
                                            localStorage.setItem(`backup_${projectId}`, JSON.stringify(backupData));
                                            localStorage.setItem(`lastBackup_${projectId}`, backupData.metadata.exportedAt);
                                            setLastBackup(backupData.metadata.exportedAt);
                                            alert('Backup salvo no navegador!');
                                            setShowBackupModal(false);
                                            setBackupData(null);
                                        }}
                                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        💾 Salvar Localmente
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {results && (
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                            <h2 className="text-lg font-semibold mb-4">Pesos BOCR (Calculados)</h2>
                            <div className="grid grid-cols-4 gap-4">
                                {BOCR_CRITERIA.map((b, i) => (
                                    <div key={b.code} className="text-center">
                                        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: b.color }}>
                                            {((results.bocrWeights[i] || 0) * 100).toFixed(0)}%
                                        </div>
                                        <p className="mt-2 text-sm font-medium">{b.name}</p>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-4 text-center">
                                CR: {((results.bocrConsistency?.cr || 0) * 100).toFixed(1)}%
                                {(results.bocrConsistency?.cr || 0) <= 0.1 ? ' ✓ Consistente' : ' ⚠️ Inconsistente'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Avaliações */}
            {activeTab === 'responses' && (
                <div className="space-y-6">
                    {allRespondents.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-lg font-semibold mb-4">📊 Status dos Especialistas</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 px-3">Email</th>
                                            <th className="text-center py-2 px-3">Status</th>
                                            <th className="text-center py-2 px-3">Convidado</th>
                                            <th className="text-center py-2 px-3">Iniciou</th>
                                            <th className="text-center py-2 px-3">Concluiu</th>
                                            <th className="text-center py-2 px-3">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allRespondents.map(resp => (
                                            <tr key={resp.id} className="border-b hover:bg-gray-50">
                                                <td className="py-2 px-3">{resp.email}</td>
                                                <td className="py-2 px-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${resp.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                        resp.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {resp.status === 'completed' ? '✓ Concluído' : resp.status === 'in_progress' ? '🔄 Em andamento' : '⏳ Pendente'}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-center text-gray-500">{resp.invitedAt ? new Date(resp.invitedAt).toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="py-2 px-3 text-center text-gray-500">{resp.startedAt ? new Date(resp.startedAt).toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="py-2 px-3 text-center text-gray-500">{resp.completedAt ? new Date(resp.completedAt).toLocaleDateString('pt-BR') : '-'}</td>
                                                <td className="py-2 px-3 text-center">
                                                    {resp.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleCopyInvite(resp)}
                                                            className={`text-xs font-medium ${copiedInviteId === resp.id ? 'text-green-600' : 'text-blue-500 hover:text-blue-700'}`}
                                                        >
                                                            {copiedInviteId === resp.id ? '✓ Copiado!' : '📋 Copiar Convite'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4">Avaliações Concluídas</h2>
                        {responses.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Nenhuma avaliação concluída ainda.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 px-3">Respondente</th>
                                        <th className="text-center py-2 px-3">Data</th>
                                        <th className="text-center py-2 px-3">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {responses.map(r => (
                                        <tr key={r.id} className="border-b hover:bg-gray-50">
                                            <td className="py-2 px-3">{respondents[r.respondentId]?.email || r.respondentId}</td>
                                            <td className="py-2 px-3 text-center text-gray-500">{r.completedAt ? new Date(r.completedAt).toLocaleDateString('pt-BR') : '-'}</td>
                                            <td className="py-2 px-3 text-center">
                                                <button onClick={() => handleDeleteResponse(r.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Especialistas - Caracterização Demográfica */}
            {activeTab === 'specialists' && (
                <div className="space-y-6">
                    {(() => {
                        // Labels para exibição
                        const LABELS = {
                            faixaIdade: { '<30': 'Menos de 30 anos', '31-40': '31 a 40 anos', '41-50': '41 a 50 anos', '>50': 'Mais de 50 anos' },
                            genero: { 'masculino': 'Masculino', 'feminino': 'Feminino', 'outro': 'Outro', 'prefiro_nao_informar': 'Não informado' },
                            nivelFormacao: { 'ensino_medio': 'Ensino Médio', 'superior': 'Superior', 'especializacao': 'Especialização/MBA', 'mestrado': 'Mestrado', 'doutorado': 'Doutorado ou Acima' },
                            areaFormacao: { 'administracao': 'Administração', 'engenharias': 'Engenharias', 'logistica': 'Logística', 'marketing': 'Marketing', 'ti_sistemas': 'TI / Sistemas', 'ciencias_exatas': 'Ciências Exatas', 'outra': 'Outra' },
                            tempoTrabalho: { '<10': 'Menos de 10 anos', '11-20': '11 a 20 anos', '21-30': '21 a 30 anos', '>30': 'Mais de 30 anos' },
                            tempoGestor: { '0': 'Não atua como gestor', '<10': 'Menos de 10 anos', '11-20': '11 a 20 anos', '21-30': '21 a 30 anos', '>30': 'Mais de 30 anos' },
                            areaAtuacao: { 'gerencial': 'Gerencial', 'engenharia_processos': 'Eng. Processos/Produção', 'planejamento_logistica': 'Planejamento/Logística', 'producao': 'Produção', 'projetos': 'Projetos', 'qualidade': 'Qualidade/Melhoria', 'manutencao': 'Manutenção', 'outra': 'Outra' },
                            funcao: { 'c_level': 'C-Level', 'diretor': 'Diretor', 'gerente': 'Gerente', 'supervisor': 'Supervisor/Coord.', 'analista_especialista': 'Analista/Espec./Eng.' },
                        };

                        const completedProfiles = allRespondents.filter(r =>
                            r.perfilCompleto || r.demographics?.submittedAt
                        );
                        const total = completedProfiles.length;

                        if (total === 0) {
                            return (
                                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                                    <div className="text-6xl mb-4">🎓</div>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Aguardando Perfis</h3>
                                    <p className="text-gray-500">Nenhum especialista completou o perfil demográfico ainda.</p>
                                    <p className="text-gray-400 text-sm mt-2">Os especialistas preenchem o perfil ao acessar a pesquisa pela primeira vez.</p>
                                </div>
                            );
                        }

                        // Função para contar
                        const countBy = (items: any[]) => items.reduce((acc: Record<string, number>, item) => {
                            if (item) acc[item] = (acc[item] || 0) + 1;
                            return acc;
                        }, {});

                        const toPercent = (count: number) => total === 0 ? '0%' : `${Math.round((count / total) * 100)}%`;

                        // Helper: lê campo demográfico suportando formato legado e novo
                        const getDemographic = (r: any, legacyField: string, newField: string) => {
                            // Prioriza formato novo (demographics.X), fallback para legado (r.X)
                            return r.demographics?.[newField] || r[legacyField] || null;
                        };

                        const distributions = {
                            faixaIdade: countBy(completedProfiles.map(r => getDemographic(r, 'faixaIdade', 'idade'))),
                            genero: countBy(completedProfiles.map(r => getDemographic(r, 'genero', 'genero'))),
                            nivelFormacao: countBy(completedProfiles.map(r => getDemographic(r, 'nivelFormacao', 'formacao'))),
                            areaFormacao: countBy(completedProfiles.map(r => getDemographic(r, 'areaFormacao', 'areaFormacao'))),
                            tempoTrabalho: countBy(completedProfiles.map(r => getDemographic(r, 'tempoTrabalho', 'tempoTrabalho'))),
                            tempoGestor: countBy(completedProfiles.map(r => getDemographic(r, 'tempoGestor', 'tempoGestor'))),
                            areaAtuacao: countBy(completedProfiles.map(r => getDemographic(r, 'areaAtuacao', 'areaAtuacao'))),
                            funcao: countBy(completedProfiles.map(r => getDemographic(r, 'funcao', 'funcao'))),
                        };

                        const renderCard = (title: string, dist: Record<string, number>, labels: Record<string, string>, color: string) => (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className={`px-4 py-2 ${color}`}>
                                    <h4 className="font-medium text-white text-sm">{title}</h4>
                                </div>
                                <div className="p-3">
                                    <table className="w-full text-sm">
                                        <thead><tr className="text-gray-500 text-xs"><th className="text-left pb-2">Categoria</th><th className="text-center pb-2 w-12">n</th><th className="text-center pb-2 w-12">%</th></tr></thead>
                                        <tbody>
                                            {Object.entries(labels).map(([key, label]) => {
                                                const count = dist[key] || 0;
                                                if (count === 0) return null;
                                                return (<tr key={key} className="border-t border-gray-100"><td className="py-1.5 text-gray-700">{label}</td><td className="py-1.5 text-center font-medium">{count}</td><td className="py-1.5 text-center text-gray-500">{toPercent(count)}</td></tr>);
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );

                        const exportCSV = () => {
                            const headers = ['Nome', 'Email', 'Faixa Idade', 'Gênero', 'Nível Formação', 'Área Formação', 'Tempo Trabalho', 'Tempo Gestor', 'Área Atuação', 'Função', 'Concluído Em'];
                            const rows = completedProfiles.map(r => [
                                r.nome || '', r.email,
                                LABELS.faixaIdade[r.faixaIdade as keyof typeof LABELS.faixaIdade] || '',
                                LABELS.genero[r.genero as keyof typeof LABELS.genero] || '',
                                LABELS.nivelFormacao[r.nivelFormacao as keyof typeof LABELS.nivelFormacao] || '',
                                r.areaFormacao === 'outra' ? r.areaFormacaoOutra : (LABELS.areaFormacao[r.areaFormacao as keyof typeof LABELS.areaFormacao] || ''),
                                LABELS.tempoTrabalho[r.tempoTrabalho as keyof typeof LABELS.tempoTrabalho] || '',
                                LABELS.tempoGestor[r.tempoGestor as keyof typeof LABELS.tempoGestor] || '',
                                r.areaAtuacao === 'outra' ? r.areaAtuacaoOutra : (LABELS.areaAtuacao[r.areaAtuacao as keyof typeof LABELS.areaAtuacao] || ''),
                                LABELS.funcao[r.funcao as keyof typeof LABELS.funcao] || '',
                                r.completedAt ? new Date(r.completedAt).toLocaleDateString('pt-BR') : '',
                            ]);
                            const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
                            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `especialistas_${project?.name?.replace(/\s/g, '_') || 'projeto'}_${new Date().toISOString().split('T')[0]}.csv`;
                            a.click();
                        };

                        return (
              <>
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800">Caracterização dos Especialistas</h3>
                                        <p className="text-sm text-gray-500">n = {total} respondentes com perfil completo</p>
                                    </div>
                                    <button onClick={exportCSV} className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors flex items-center gap-2">
                                        📥 Exportar CSV
                                    </button>
                                </div>


{/* Grid de Cards - Linha 1 */ }
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {renderCard('Faixa de Idade', distributions.faixaIdade, LABELS.faixaIdade, 'bg-blue-600')}
    {renderCard('Gênero', distributions.genero, LABELS.genero, 'bg-purple-600')}
    {renderCard('Nível de Formação', distributions.nivelFormacao, LABELS.nivelFormacao, 'bg-indigo-600')}
    {renderCard('Área de Formação', distributions.areaFormacao, LABELS.areaFormacao, 'bg-teal-600')}
</div>

{/* Grid de Cards - Linha 2 */ }
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {renderCard('Tempo de Trabalho', distributions.tempoTrabalho, LABELS.tempoTrabalho, 'bg-orange-600')}
    {renderCard('Tempo como Gestor', distributions.tempoGestor, LABELS.tempoGestor, 'bg-amber-600')}
    {renderCard('Área de Atuação', distributions.areaAtuacao, LABELS.areaAtuacao, 'bg-green-600')}
    {/* Função com layout especial para textos longos */}
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-4 py-2 bg-red-600">
            <h4 className="font-medium text-white text-sm">Função</h4>
        </div>
        <div className="p-3">
            <table className="w-full text-sm">
                <thead><tr className="text-gray-500 text-xs"><th className="text-left pb-2">Categoria</th><th className="text-center pb-2 w-10">n</th><th className="text-center pb-2 w-10">%</th></tr></thead>
                <tbody>
                    {Object.entries(LABELS.funcao).map(([key, label]) => {
                        const count = distributions.funcao[key] || 0;
                        if (count === 0) return null;
                        return (<tr key={key} className="border-t border-gray-100"><td className="py-1 text-gray-700 text-xs leading-tight">{label}</td><td className="py-1 text-center font-medium text-xs">{count}</td><td className="py-1 text-center text-gray-500 text-xs">{total > 0 ? Math.round((count / total) * 100) + '%' : '0%'}</td></tr>);
                    })}
                </tbody>
            </table>
        </div>
    </div>
</div>

{/* Tabela Acadêmica */ }
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
    <div className="px-4 py-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
        <div>
            <h4 className="font-medium text-gray-800">Tabela para Dissertação/Artigo</h4>
            <p className="text-xs text-gray-500">Formato pronto para copiar</p>
        </div>
        <button
            onClick={() => {
                const table = document.getElementById('tabela-academica');
                if (table) {
                    const range = document.createRange();
                    range.selectNode(table);
                    window.getSelection()?.removeAllRanges();
                    window.getSelection()?.addRange(range);
                    document.execCommand('copy');
                    window.getSelection()?.removeAllRanges();
                    alert('Tabela copiada!');
                }
            }}
            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200"
        >
            📋 Copiar Tabela
        </button>
    </div>
    <div className="p-4 overflow-x-auto">
        <table id="tabela-academica" className="w-full text-sm border-collapse">
            <thead>
                <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left">Variável</th>
                    <th className="border border-gray-300 px-3 py-2 text-left">Definição/Faixa</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">n</th>
                    <th className="border border-gray-300 px-3 py-2 text-center">%</th>
                </tr>
            </thead>
            <tbody>
                {/* Idade */}
                {Object.entries(LABELS.faixaIdade).filter(([k]) => distributions.faixaIdade[k]).map(([key, label], idx) => (
                    <tr key={`idade-${key}`} className={idx === 0 ? 'bg-blue-50' : ''}>
                        {idx === 0 && <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.faixaIdade).length}>Idade</td>}
                        <td className="border border-gray-300 px-3 py-1">{label}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{distributions.faixaIdade[key]}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(distributions.faixaIdade[key])}</td>
                    </tr>
                ))}
                {/* Gênero */}
                {Object.entries(LABELS.genero).filter(([k]) => distributions.genero[k]).map(([key, label], idx) => (
                    <tr key={`genero-${key}`} className={idx === 0 ? 'bg-purple-50' : ''}>
                        {idx === 0 && <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.genero).length}>Gênero</td>}
                        <td className="border border-gray-300 px-3 py-1">{label}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{distributions.genero[key]}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(distributions.genero[key])}</td>
                    </tr>
                ))}
                {/* Nível de Formação */}
                {Object.entries(LABELS.nivelFormacao).filter(([k]) => distributions.nivelFormacao[k]).map(([key, label], idx) => (
                    <tr key={`formacao-${key}`} className={idx === 0 ? 'bg-indigo-50' : ''}>
                        {idx === 0 && <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.nivelFormacao).length}>Nível de Formação</td>}
                        <td className="border border-gray-300 px-3 py-1">{label}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{distributions.nivelFormacao[key]}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(distributions.nivelFormacao[key])}</td>
                    </tr>
                ))}
                {/* Área de Formação */}
                {Object.entries(LABELS.areaFormacao).filter(([k]) => distributions.areaFormacao[k]).map(([key, label], idx) => (
                    <tr key={`areaform-${key}`} className={idx === 0 ? 'bg-teal-50' : ''}>
                        {idx === 0 && <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.areaFormacao).length}>Área de Formação</td>}
                        <td className="border border-gray-300 px-3 py-1">{label}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{distributions.areaFormacao[key]}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(distributions.areaFormacao[key])}</td>
                    </tr>
                ))}
                {/* Tempo de Trabalho */}
                {Object.entries(LABELS.tempoTrabalho).filter(([k]) => distributions.tempoTrabalho[k]).map(([key, label], idx) => (
                    <tr key={`tempo-${key}`} className={idx === 0 ? 'bg-orange-50' : ''}>
                        {idx === 0 && <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.tempoTrabalho).length}>Tempo de Trabalho</td>}
                        <td className="border border-gray-300 px-3 py-1">{label}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{distributions.tempoTrabalho[key]}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(distributions.tempoTrabalho[key])}</td>
                    </tr>
                ))}
                {/* Tempo como Gestor */}
                {Object.entries(LABELS.tempoGestor).filter(([k]) => distributions.tempoGestor[k]).map(([key, label], idx) => (
                    <tr key={`gestor-${key}`} className={idx === 0 ? 'bg-amber-50' : ''}>
                        {idx === 0 && <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.tempoGestor).length}>Tempo como Gestor</td>}
                        <td className="border border-gray-300 px-3 py-1">{label}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{distributions.tempoGestor[key]}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(distributions.tempoGestor[key])}</td>
                    </tr>
                ))}
                {/* Área de Atuação */}
                {Object.entries(LABELS.areaAtuacao).filter(([k]) => distributions.areaAtuacao[k]).map(([key, label], idx) => (
                    <tr key={`atuacao-${key}`} className={idx === 0 ? 'bg-green-50' : ''}>
                        {idx === 0 && <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.areaAtuacao).length}>Área de Atuação</td>}
                        <td className="border border-gray-300 px-3 py-1">{label}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{distributions.areaAtuacao[key]}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(distributions.areaAtuacao[key])}</td>
                    </tr>
                ))}
                {/* Função */}
                {Object.entries(LABELS.funcao).filter(([k]) => distributions.funcao[k]).map(([key, label], idx) => (
                    <tr key={`funcao-${key}`} className={idx === 0 ? 'bg-red-50' : ''}>
                        {idx === 0 && <td className="border border-gray-300 px-3 py-2 font-medium" rowSpan={Object.keys(distributions.funcao).length}>Função</td>}
                        <td className="border border-gray-300 px-3 py-1">{label}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{distributions.funcao[key]}</td>
                        <td className="border border-gray-300 px-3 py-1 text-center">{toPercent(distributions.funcao[key])}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 text-center">
        Fonte: Dados coletados pelo sistema AHP-BOCR. Produção do próprio autor.
    </div>
</div>

{/* Lista de Especialistas */ }
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
    <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
        <h4 className="font-medium text-gray-800">Lista Detalhada de Especialistas</h4>
    </div>
    <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead className="bg-gray-50">
                <tr>
                    <th className="text-left py-2 px-3 border-b">Nome</th>
                    <th className="text-left py-2 px-3 border-b">Função</th>
                    <th className="text-left py-2 px-3 border-b">Área de Atuação</th>
                    <th className="text-center py-2 px-3 border-b">Formação</th>
                    <th className="text-center py-2 px-3 border-b">Exp. Total</th>
                    <th className="text-center py-2 px-3 border-b">Exp. Gestão</th>
                </tr>
            </thead>
            <tbody>
                {completedProfiles.map(r => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium">{r.nome || r.email}</td>
                        <td className="py-2 px-3">{LABELS.funcao[r.funcao as keyof typeof LABELS.funcao] || '-'}</td>
                        <td className="py-2 px-3">{r.areaAtuacao === 'outra' ? r.areaAtuacaoOutra : (LABELS.areaAtuacao[r.areaAtuacao as keyof typeof LABELS.areaAtuacao] || '-')}</td>
                        <td className="py-2 px-3 text-center">{LABELS.nivelFormacao[r.nivelFormacao as keyof typeof LABELS.nivelFormacao] || '-'}</td>
                        <td className="py-2 px-3 text-center">{LABELS.tempoTrabalho[r.tempoTrabalho as keyof typeof LABELS.tempoTrabalho] || '-'}</td>
                        <td className="py-2 px-3 text-center">{LABELS.tempoGestor[r.tempoGestor as keyof typeof LABELS.tempoGestor] || '-'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
</div>
              </>
            );
          }) ()}
        </div >
      )}


{/* Resultados */ }
{
    activeTab === 'results' && (
        <div className="space-y-6">
            {!results ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <p className="text-gray-500">Aguardando avaliações para calcular resultados.</p>
                </div>
            ) : (
            <>
                    {/* AI Decision Auditor */}
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                                    🤖 AI Decision Auditor
                                </h3>
                                <p className="text-sm text-indigo-700">Analise a robustez da decisão e identifique vieses cognitivos nos julgamentos.</p>
                            </div>
                            <button
                                onClick={runAIAudit}
                                disabled={auditLoading}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {auditLoading ? 'Analisando...' : '🔍 Auditar Decisão'}
                            </button>
                        </div>

                        {auditError && (
                            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                                ❌ {auditError}
                            </div>
                        )}

                        {aiAudit && (
                            <div className="mt-6 bg-white rounded-lg border border-purple-100 shadow-sm p-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-bold text-gray-800 text-lg">Relatório de Auditoria</h4>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${auditMethod === 'ai' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {auditMethod === 'ai' ? '✨ Análise via IA' : '📊 Análise Heurística'}
                                    </span>
                                </div>

                                <div className="space-y-6">
                                    {/* Vieses Detectados */}
                                    <div>
                                        <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            🎯 Vieses Cognitivos Detectados
                                        </h5>
                                        {aiAudit.biases && aiAudit.biases.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {aiAudit.biases.map((bias: any, idx: number) => (
                                                    <div key={idx} className={`p-3 rounded-lg border-l-4 ${bias.severity === 'high' ? 'bg-red-50 border-red-500' :
                                                        bias.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                                                            'bg-blue-50 border-blue-500'
                                                        }`}>
                                                        <div className="flex justify-between items-start">
                                                            <span className="font-bold text-gray-800">{bias.biasName}</span>
                                                            <span className="text-xs uppercase font-bold opacity-75">{bias.severity}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">{bias.description}</p>
                                                        <p className="text-xs text-gray-500 mt-2 italic">recomendações: {bias.recommendation}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                                                Nenhum viés significativo detectado nos padrões de julgamento.
                                            </div>
                                        )}
                                    </div>

                                    {/* Análise de Robustez */}
                                    <div>
                                        <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                            🛡️ Análise de Robustez
                                        </h5>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`w-3 h-3 rounded-full ${aiAudit.robustness?.score >= 80 ? 'bg-green-500' :
                                                    aiAudit.robustness?.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                    }`} />
                                                <span className="font-bold text-gray-700">Índice de Robustez: {aiAudit.robustness?.score}/100</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3">{aiAudit.robustness?.analysis}</p>

                                            {aiAudit.robustness?.scenarios && (
                                                <div className="text-xs space-y-1 text-gray-500">
                                                    <p className="font-medium">Cenários Testados:</p>
                                                    <ul className="list-disc pl-4 space-y-0.5">
                                                        {aiAudit.robustness.scenarios.map((s: string, i: number) => (
                                                            <li key={i}>{s}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Feedback Qualitativo */}
                                    {aiAudit.qualitativeFeedback && (
                                        <div>
                                            <h5 className="font-semibold text-gray-700 mb-2">💡 Insights Estratégicos</h5>
                                            <p className="text-sm text-gray-600 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 italic">
                                                "{aiAudit.qualitativeFeedback}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botão de Toggle Pesos Customizados */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => {
                                const newValue = !useCustomWeights;
                                setUseCustomWeights(newValue);
                                if (!newValue) resetWeights();
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${useCustomWeights
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-white border text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {useCustomWeights ? '🔓 Modo Simulação Ativo' : '🔒 Habilitar Simulação de Pesos'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">


{/* Cenários Pré-definidos */ }
<div className="mb-6">
    <p className="text-sm font-medium text-gray-700 mb-3">Cenários Pré-definidos:</p>
    <div className="flex flex-wrap gap-2">
        <button onClick={() => applyScenario('financial')}
            className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium transition-colors">
            💰 Foco Financeiro (C=50%)
        </button>
        <button onClick={() => applyScenario('innovation')}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors">
            🚀 Foco Inovação (O=50%)
        </button>
        <button onClick={() => applyScenario('risk')}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors">
            🛡️ Aversão ao Risco (R=50%)
        </button>
        <button onClick={resetWeights}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
            ↺ Resetar para Original
        </button>
    </div>
</div>

{/* Sliders de Peso */ }
<div className={`space-y-4 p-4 rounded-lg ${useCustomWeights ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-gray-50'}`}>
    {BOCR_CRITERIA.map((criterion) => (
        <div key={criterion.code} className="flex items-center gap-4">
            <div className="w-24 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: criterion.color }}>
                    {criterion.code}
                </div>
                <span className="text-sm font-medium">{criterion.name}</span>
            </div>
            <div className="flex-1">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={customWeights[criterion.code as keyof typeof customWeights]}
                    onChange={(e) => normalizeWeights(criterion.code as keyof typeof customWeights, parseInt(e.target.value))}
                    disabled={!useCustomWeights}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                    style={{ accentColor: criterion.color }}
                />
            </div>
            <div className="w-16 text-right">
                <span className="font-bold" style={{ color: criterion.color }}>
                    {customWeights[criterion.code as keyof typeof customWeights]}%
                </span>
            </div>
        </div>
    ))}
    <div className="flex justify-between items-center pt-2 border-t">
        <span className="text-sm text-gray-500">Total:</span>
        <span className={`font-bold ${totalCustomWeight === 100 ? 'text-green-600' : 'text-red-600'}`}>
            {totalCustomWeight}% {totalCustomWeight === 100 ? '✓' : '(deve ser 100%)'}
        </span>
    </div>
</div>

{/* Ranking Atualizado */ }
<div className="mt-6">
    <h3 className="text-md font-semibold mb-3">
        Ranking {useCustomWeights ? '(Simulado)' : '(Original)'}:
    </h3>
    <div className="space-y-2">
        {customScores.map((alt: any, idx: number) => {
            const originalIdx = results.finalScores.findIndex((f: any) => f.code === alt.code);
            const changed = useCustomWeights && originalIdx !== idx;
            return (
                <div key={alt.code} className={`flex items-center justify-between p-3 rounded-lg ${idx === 0 ? 'bg-yellow-50 border border-yellow-300' : 'bg-gray-50'} ${changed ? 'ring-2 ring-purple-400' : ''}`}>
                    <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-300 text-gray-600'}`}>
                            {idx + 1}º
                        </span>
                        <span className="font-medium">{alt.name}</span>
                        {changed && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                                {originalIdx < idx ? '↓' : '↑'} era {originalIdx + 1}º
                            </span>
                        )}
                    </div>
                    <span className="font-bold text-lg">{alt.score.toFixed(4)}</span>
                </div>
            );
        })}
    </div>
</div>
              </div >

    {/* Funcionalidade 6.2: Gráficos de Sensibilidade */ }
{
    sensitivityData && (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-2">📈 Análise de Sensibilidade por Mérito</h2>
            <p className="text-sm text-gray-500 mb-6">Variação do peso de cada mérito (0% a 100%) e impacto no score das alternativas</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {BOCR_CRITERIA.map((criterion) => {
                    const meritData = sensitivityData.data[criterion.code] || [];
                    const inflection = sensitivityData.inflectionPoints[criterion.code];
                    const altCodes = results.alternatives.map((a: any) => a.code);

                    let minScore = Infinity, maxScore = -Infinity;
                    meritData.forEach((d: any) => {
                        Object.values(d.scores).forEach((s: any) => {
                            if (s < minScore) minScore = s;
                            if (s > maxScore) maxScore = s;
                        });
                    });
                    const range = maxScore - minScore || 1;

                    return (
                        <div key={criterion.code} className="border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-medium flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: criterion.color }}>
                                        {criterion.code}
                                    </span>
                                    {criterion.name}
                                </h3>
                                {inflection !== null ? (
                                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                        ⚠️ Inversão em {inflection}%
                                    </span>
                                ) : (
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                        ✓ Estável
                                    </span>
                                )}
                            </div>

                            <div className="relative h-40 bg-gray-50 rounded">
                                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
                                    <line x1="50" y1="0" x2="50" y2="100" stroke="#e5e7eb" strokeWidth="0.5" />

                                    {altCodes.map((altCode: string, altIdx: number) => {
                                        const color = altIdx === 0 ? '#3B82F6' : '#EF4444';
                                        const points = meritData.map((d: any) => {
                                            const x = (d.weight / 100) * 100;
                                            const y = 100 - ((d.scores[altCode] - minScore) / range) * 100;
                                            return `${x},${y}`;
                                        }).join(' ');

                                        return (
                                            <polyline
                                                key={altCode}
                                                points={points}
                                                fill="none"
                                                stroke={color}
                                                strokeWidth="2"
                                            />
                                        );
                                    })}

                                    {inflection !== null && (
                                        <line x1={inflection} y1="0" x2={inflection} y2="100" stroke="#9333EA" strokeWidth="1" strokeDasharray="3,3" />
                                    )}
                                </svg>

                                <div className="absolute top-2 right-2 text-xs space-y-1">
                                    {results.alternatives.map((alt: any, idx: number) => (
                                        <div key={alt.code} className="flex items-center gap-1">
                                            <div className={`w-3 h-3 rounded ${idx === 0 ? 'bg-blue-500' : 'bg-red-500'}`} />
                                            <span>{alt.code}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 px-1">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            <p className="text-xs text-gray-500 mt-2 text-center">
                                Peso de {criterion.name} →
                            </p>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">📋 Resumo de Estabilidade</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {BOCR_CRITERIA.map((criterion) => {
                        const inflection = sensitivityData.inflectionPoints[criterion.code];
                        return (
                            <div key={criterion.code} className={`p-3 rounded-lg ${inflection !== null ? 'bg-red-50' : 'bg-green-50'}`}>
                                <div className="font-medium" style={{ color: criterion.color }}>{criterion.name}</div>
                                {inflection !== null ? (
                                    <div className="text-red-700 text-xs">Inversão em {inflection}%</div>
                                ) : (
                                    <div className="text-green-700 text-xs">Decisão estável</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    )
}

{/* Perguntas de Cenário */ }
<div className="bg-white rounded-xl shadow-sm p-6">
    <h2 className="text-lg font-semibold mb-4">❓ Perguntas Estratégicas</h2>
    <div className="space-y-4">
        <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-400">
            <p className="font-medium text-orange-800">Cenário 1: Foco Financeiro</p>
            <p className="text-sm text-orange-700 mt-1">
                "Se o orçamento ficar extremamente apertado (C=50%), a {results.finalScores[0]?.name} ainda vence?"
            </p>
            <button onClick={() => applyScenario('financial')} className="mt-2 text-xs text-orange-600 hover:underline">
                → Testar este cenário
            </button>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <p className="font-medium text-blue-800">Cenário 2: Foco em Inovação</p>
            <p className="text-sm text-blue-700 mt-1">
                "Se priorizarmos a transformação digital acima de tudo (O=50%), o resultado muda?"
            </p>
            <button onClick={() => applyScenario('innovation')} className="mt-2 text-xs text-blue-600 hover:underline">
                → Testar este cenário
            </button>
        </div>

        <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-400">
            <p className="font-medium text-red-800">Cenário 3: Aversão ao Risco</p>
            <p className="text-sm text-red-700 mt-1">
                "Se formos muito conservadores quanto à segurança cibernética e integração (R=50%), qual tecnologia é mais segura?"
            </p>
            <button onClick={() => applyScenario('risk')} className="mt-2 text-xs text-red-600 hover:underline">
                → Testar este cenário
            </button>
        </div>
    </div>
</div>
            </>
          )}
        </div >
      )}


{/* MÓDULO 7: Relatório Científico */ }
{
    activeTab === 'report' && (
        <div className="space-y-6">
            {!results ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <p className="text-gray-500">Aguardando avaliações para gerar relatório.</p>
                </div>
            ) : (
                <>
                    {/* Botões de Exportação */}
                    <div className="flex flex-wrap gap-3 justify-end">
                        <button onClick={exportXLSX} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            📗 Exportar Excel
                        </button>
                        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            📊 Exportar CSV
                        </button>
                        <button onClick={exportJSON} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            📁 Exportar JSON
                        </button>
                        <button onClick={() => window.print()} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            🖨️ Imprimir / PDF
                        </button>
                    </div>

                    {/* AI Scientific Writer */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                                    ✍️ AI Scientific Writer
                                </h3>
                                <p className="text-sm text-amber-700">Gere automaticamente as seções "Resultados e Discussão" e "Conclusão" com busca em literatura científica</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Seletor de Modelo */}
                                <div className="flex items-center gap-2 bg-white rounded-lg border border-amber-200 p-1">
                                    <button
                                        onClick={() => setSelectedModel('gemini')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedModel === 'gemini'
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        🔮 Gemini
                                    </button>
                                    <button
                                        onClick={() => setSelectedModel('claude')}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${selectedModel === 'claude'
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        🧠 Claude
                                    </button>
                                </div>
                                <button
                                    onClick={generateArticle}
                                    disabled={articleLoading}
                                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
                                >
                                    {articleLoading ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Gerando...
                                        </>
                                    ) : (
                                        <>🚀 Gerar Texto Científico</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Info sobre busca em literatura */}
                        <div className="flex items-center gap-2 text-xs text-amber-600 mb-4 bg-amber-100/50 rounded-lg px-3 py-2">
                            <span>📚</span>
                            <span>Busca automática no <strong>Semantic Scholar</strong> por papers relevantes sobre AHP, BOCR e Indústria 4.0</span>
                        </div>

                        {articleError && (
                            <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm mb-4">
                                ❌ {articleError}
                            </div>
                        )}

                        {generatedArticle && (
                            <div className="mt-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-amber-600">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${articleMethod === 'gemini' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {articleMethod === 'gemini' ? '🔮 Gemini 2.0 Flash' : '🧠 Claude Sonnet'}
                                        </span>
                                        {articleLiterature && (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                                📚 {articleLiterature.papersFound} papers encontrados
                                            </span>
                                        )}
                                        <span>Texto gerado com sucesso!</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={copyArticleToClipboard}
                                            className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-sm hover:bg-amber-50 transition-colors"
                                        >
                                            📋 Copiar
                                        </button>
                                        <button
                                            onClick={exportArticleAsDocx}
                                            className="px-3 py-1.5 bg-white border border-amber-300 text-amber-700 rounded-lg text-sm hover:bg-amber-50 transition-colors"
                                        >
                                            📄 Baixar .doc
                                        </button>
                                    </div>
                                </div>

                                {/* Papers encontrados */}
                                {articleLiterature && articleLiterature.topPapers && articleLiterature.topPapers.length > 0 && (
                                    <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-xs font-medium text-green-800 mb-2">📖 Literatura utilizada como referência:</p>
                                        <div className="space-y-1">
                                            {articleLiterature.topPapers.slice(0, 5).map((paper: any, idx: number) => (
                                                <p key={idx} className="text-xs text-green-700">
                                                    • {paper.authors} ({paper.year}). "{paper.title.substring(0, 80)}{paper.title.length > 80 ? '...' : ''}"
                                                    <span className="text-green-500 ml-1">({paper.citations} citações)</span>
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white rounded-lg border border-amber-200 p-6 max-h-[500px] overflow-y-auto">
                                    <div className="prose prose-sm max-w-none">
                                        {generatedArticle.split('\n').map((line, i) => {
                                            if (line.startsWith('## ')) {
                                                return <h2 key={i} className="text-lg font-bold text-gray-800 mt-6 mb-3">{line.replace('## ', '')}</h2>;
                                            }
                                            if (line.startsWith('### ')) {
                                                return <h3 key={i} className="text-md font-semibold text-gray-700 mt-4 mb-2">{line.replace('### ', '')}</h3>;
                                            }
                                            if (line.startsWith('|')) {
                                                return <code key={i} className="block text-xs bg-gray-50 p-1 font-mono">{line}</code>;
                                            }
                                            if (line.startsWith('---')) {
                                                return <hr key={i} className="my-4 border-gray-200" />;
                                            }
                                            if (line.trim() === '') {
                                                return <br key={i} />;
                                            }
                                            return <p key={i} className="text-gray-700 text-sm leading-relaxed mb-2" dangerouslySetInnerHTML={{
                                                __html: line
                                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                            }} />;
                                        })}
                                    </div>
                                </div>
                                <p className="text-xs text-amber-600 mt-2 italic">
                                    💡 Dica: Revise e adapte o texto gerado. Verifique as citações e adicione detalhes específicos do seu contexto organizacional.
                                </p>
                            </div>
                        )}
                    </div>

                    <div ref={reportRef} className="space-y-6 print:space-y-4">
                        {/* Cabeçalho do Relatório */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white print:bg-indigo-600">
                            <h1 className="text-2xl font-bold">Dossiê de Decisão AHP-BOCR</h1>
                            <p className="text-indigo-100 mt-1">{project?.name}</p>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-indigo-200">Data</p>
                                    <p className="font-semibold">{new Date().toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div>
                                    <p className="text-indigo-200">Especialistas</p>
                                    <p className="font-semibold">{results.responseCount}</p>
                                </div>
                                <div>
                                    <p className="text-indigo-200">Alternativas</p>
                                    <p className="font-semibold">{results.alternatives.length}</p>
                                </div>
                                <div>
                                    <p className="text-indigo-200">Critérios</p>
                                    <p className="font-semibold">4 BOCR + 20 Sub</p>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO 1: Validação Metodológica */}
                        <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                                Validação Metodológica
                            </h2>

                            {/* Perfil do Painel */}
                            <div className="mb-6">
                                <h3 className="text-md font-semibold text-gray-700 mb-3">Perfil do Painel de Especialistas</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border px-3 py-2 text-left">Email</th>
                                                <th className="border px-3 py-2 text-center">Cargo</th>
                                                <th className="border px-3 py-2 text-center">Divisão</th>
                                                <th className="border px-3 py-2 text-center">Tempo Empresa</th>
                                                <th className="border px-3 py-2 text-center">Conclusão</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allRespondents.filter(r => r.status === 'completed').map(resp => (
                                                <tr key={resp.id}>
                                                    <td className="border px-3 py-2">{resp.email}</td>
                                                    <td className="border px-3 py-2 text-center">{resp.cargo || '-'}</td>
                                                    <td className="border px-3 py-2 text-center">{resp.divisao || '-'}</td>
                                                    <td className="border px-3 py-2 text-center">{resp.tempoEmpresa ? `${resp.tempoEmpresa} anos` : '-'}</td>
                                                    <td className="border px-3 py-2 text-center">{resp.completedAt ? new Date(resp.completedAt).toLocaleDateString('pt-BR') : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Box de Consistência */}
                            <div className={`p-4 rounded-lg border-2 ${(results.bocrConsistency?.cr || 0) <= 0.1 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${(results.bocrConsistency?.cr || 0) <= 0.1 ? 'bg-green-100' : 'bg-red-100'}`}>
                                        {(results.bocrConsistency?.cr || 0) <= 0.1 ? '✓' : '⚠️'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">
                                            Razão de Consistência (CR): {((results.bocrConsistency?.cr || 0) * 100).toFixed(2)}%
                                        </p>
                                        <p className={`text-sm ${(results.bocrConsistency?.cr || 0) <= 0.1 ? 'text-green-700' : 'text-red-700'}`}>
                                            {(results.bocrConsistency?.cr || 0) <= 0.1
                                                ? 'Como CR ≤ 10%, o julgamento é considerado CONSISTENTE.'
                                                : 'CR > 10% indica possível inconsistência nos julgamentos.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO 2: Anatomia da Decisão */}
                        <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                Anatomia da Decisão
                            </h2>

                            {/* Pesos BOCR */}
                            <div className="mb-6">
                                <h3 className="text-md font-semibold text-gray-700 mb-3">Pesos dos Méritos Estratégicos (BOCR)</h3>
                                <div className="grid grid-cols-4 gap-4">
                                    {BOCR_CRITERIA.map((b, i) => (
                                        <div key={b.code} className="text-center p-4 rounded-lg" style={{ backgroundColor: `${b.color}15` }}>
                                            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: b.color }}>
                                                {((results.bocrWeights[i] || 0) * 100).toFixed(0)}%
                                            </div>
                                            <p className="mt-2 font-medium text-gray-700">{b.name}</p>
                                            <p className="text-xs text-gray-500">{b.code}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tabela Mestra de Pesos Globais */}
                            <div className="mb-6">
                                <h3 className="text-md font-semibold text-gray-700 mb-3">Tabela Mestra de Pesos (Ordenada por Peso Global)</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50">
                                                <th className="border px-3 py-2 text-left">Rank</th>
                                                <th className="border px-3 py-2 text-left">Código</th>
                                                <th className="border px-3 py-2 text-left">Subcritério</th>
                                                <th className="border px-3 py-2 text-center">Grupo</th>
                                                <th className="border px-3 py-2 text-center">Peso Local</th>
                                                <th className="border px-3 py-2 text-center">Peso Global</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.globalWeights.map((w: any, idx: number) => {
                                                const criterion = BOCR_CRITERIA.find(c => c.code === w.group);
                                                const isTop3 = idx < 3;
                                                return (
                                                    <tr key={w.code} className={isTop3 ? 'bg-yellow-50 font-medium' : ''}>
                                                        <td className="border px-3 py-2">
                                                            {isTop3 && <span className="text-yellow-600">⭐</span>} {idx + 1}
                                                        </td>
                                                        <td className="border px-3 py-2 font-mono">{w.code}</td>
                                                        <td className="border px-3 py-2">{w.name}</td>
                                                        <td className="border px-3 py-2 text-center">
                                                            <span className="px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: criterion?.color }}>
                                                                {w.group}
                                                            </span>
                                                        </td>
                                                        <td className="border px-3 py-2 text-center">{(w.localWeight * 100).toFixed(2)}%</td>
                                                        <td className="border px-3 py-2 text-center font-bold">{(w.globalWeight * 100).toFixed(2)}%</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">⭐ Top 3 Fatores Críticos que mais influenciaram o resultado</p>
                            </div>
                        </div>

                        {/* SEÇÃO 3: Desempenho Comparativo */}
                        <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                                Desempenho Comparativo
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Gráfico de Radar */}
                                <div>
                                    <h3 className="text-md font-semibold text-gray-700 mb-3">Gráfico de Radar (Spider Chart)</h3>
                                    <div className="relative h-64 bg-gray-50 rounded-lg p-4">
                                        <svg className="w-full h-full" viewBox="-60 -60 120 120">
                                            {/* Grid */}
                                            {[0.25, 0.5, 0.75, 1].map((r, i) => (
                                                <polygon
                                                    key={i}
                                                    points={BOCR_CRITERIA.map((_, idx) => {
                                                        const angle = (idx * 90 - 90) * Math.PI / 180;
                                                        return `${Math.cos(angle) * r * 50},${Math.sin(angle) * r * 50}`;
                                                    }).join(' ')}
                                                    fill="none"
                                                    stroke="#e5e7eb"
                                                    strokeWidth="0.5"
                                                />
                                            ))}

                                            {/* Axes */}
                                            {BOCR_CRITERIA.map((criterion, idx) => {
                                                const angle = (idx * 90 - 90) * Math.PI / 180;
                                                return (
                                                    <g key={criterion.code}>
                                                        <line x1="0" y1="0" x2={Math.cos(angle) * 50} y2={Math.sin(angle) * 50} stroke="#d1d5db" strokeWidth="0.5" />
                                                        <text x={Math.cos(angle) * 55} y={Math.sin(angle) * 55} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={criterion.color} fontWeight="bold">
                                                            {criterion.code}
                                                        </text>
                                                    </g>
                                                );
                                            })}

                                            {/* Data for each alternative */}
                                            {results.altMeritScores.map((alt: any, altIdx: number) => {
                                                const color = altIdx === 0 ? '#3B82F6' : '#EF4444';
                                                const values = [alt.B, alt.O, alt.C, alt.R];
                                                const points = values.map((v, idx) => {
                                                    const angle = (idx * 90 - 90) * Math.PI / 180;
                                                    return `${Math.cos(angle) * v * 50},${Math.sin(angle) * v * 50}`;
                                                }).join(' ');

                                                return (
                                                    <polygon
                                                        key={alt.code}
                                                        points={points}
                                                        fill={`${color}30`}
                                                        stroke={color}
                                                        strokeWidth="2"
                                                    />
                                                );
                                            })}
                                        </svg>

                                        <div className="absolute bottom-2 right-2 text-xs space-y-1">
                                            {results.alternatives.map((alt: any, idx: number) => (
                                                <div key={alt.code} className="flex items-center gap-1">
                                                    <div className={`w-3 h-3 rounded ${idx === 0 ? 'bg-blue-500' : 'bg-red-500'}`} />
                                                    <span>{alt.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Gráfico de Barras */}
                                <div>
                                    <h3 className="text-md font-semibold text-gray-700 mb-3">Contribuição por Mérito</h3>
                                    <div className="space-y-4">
                                        {results.altMeritScores.map((alt: any, idx: number) => {
                                            const total = results.bocrWeights[0] * alt.B + results.bocrWeights[1] * alt.O + results.bocrWeights[2] * alt.C + results.bocrWeights[3] * alt.R;
                                            const positive = results.bocrWeights[0] * alt.B + results.bocrWeights[1] * alt.O;
                                            const negative = results.bocrWeights[2] * alt.C + results.bocrWeights[3] * alt.R;
                                            const score = positive - negative;

                                            return (
                                                <div key={alt.code} className="p-3 bg-gray-50 rounded-lg">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-medium">{alt.name}</span>
                                                        <span className={`font-bold ${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {score.toFixed(4)}
                                                        </span>
                                                    </div>
                                                    <div className="flex h-6 rounded overflow-hidden">
                                                        <div className="bg-green-500 flex items-center justify-center text-white text-xs" style={{ width: `${(positive / (positive + negative)) * 100}%` }}>
                                                            +{positive.toFixed(2)}
                                                        </div>
                                                        <div className="bg-red-500 flex items-center justify-center text-white text-xs" style={{ width: `${(negative / (positive + negative)) * 100}%` }}>
                                                            -{negative.toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                        <span>B+O (positivo)</span>
                                                        <span>C+R (negativo)</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO 4: Robustez da Decisão */}
                        <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                                Robustez da Decisão
                            </h2>

                            {/* Selo de Robustez */}
                            <div className={`p-4 rounded-lg mb-6 ${isRobust ? 'bg-green-50 border-2 border-green-300' : 'bg-yellow-50 border-2 border-yellow-300'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isRobust ? 'bg-green-100' : 'bg-yellow-100'}`}>
                                        {isRobust ? '🏆' : '⚠️'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800">
                                            {isRobust ? 'RESULTADO ROBUSTO' : `CONCORDÂNCIA PARCIAL (${methodsAgreement}/5 métodos)`}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {isRobust
                                                ? 'A alternativa vencedora é a mesma em todos os 5 métodos de síntese BOCR.'
                                                : `${methodsAgreement} dos 5 métodos concordam com o vencedor. Análise das diferenças recomendada.`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Comparação dos 5 Métodos - Tabela 5 (Petrillo et al., 2023) */}
                            <h3 className="text-md font-semibold text-gray-700 mb-3">Comparação dos 5 Métodos de Síntese BOCR (Petrillo et al., 2023)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="border px-2 py-2 text-left" rowSpan={2}>Alternativa</th>
                                            <th className="border px-2 py-1 text-center bg-blue-50" colSpan={2}>
                                                <div className="font-bold">Additive</div>
                                                <div className="font-normal text-gray-500">bB+oO+c(1/C)<sub>n</sub>+r(1/R)<sub>n</sub></div>
                                            </th>
                                            <th className="border px-2 py-1 text-center bg-green-50" colSpan={2}>
                                                <div className="font-bold">Probabilistic</div>
                                                <div className="font-normal text-gray-500">bB+oO+c(1−C)+r(1−R)</div>
                                            </th>
                                            <th className="border px-2 py-1 text-center bg-yellow-50" colSpan={2}>
                                                <div className="font-bold">Subtractive</div>
                                                <div className="font-normal text-gray-500">bB+oO+cC−rR</div>
                                            </th>
                                            <th className="border px-2 py-1 text-center bg-purple-50" colSpan={2}>
                                                <div className="font-bold">Mult. Powers</div>
                                                <div className="font-normal text-gray-500">B<sup>b</sup>O<sup>o</sup>(1/C)<sup>c</sup>(1/R)<sup>r</sup></div>
                                            </th>
                                            <th className="border px-2 py-1 text-center bg-orange-50" colSpan={2}>
                                                <div className="font-bold">Multiplicative</div>
                                                <div className="font-normal text-gray-500">(B×O)/(C×R)</div>
                                            </th>
                                        </tr>
                                        <tr className="bg-gray-100 text-xs">
                                            <th className="border px-1 py-1">Score</th>
                                            <th className="border px-1 py-1">Rank</th>
                                            <th className="border px-1 py-1">Score</th>
                                            <th className="border px-1 py-1">Rank</th>
                                            <th className="border px-1 py-1">Score</th>
                                            <th className="border px-1 py-1">Rank</th>
                                            <th className="border px-1 py-1">Score</th>
                                            <th className="border px-1 py-1">Rank</th>
                                            <th className="border px-1 py-1">Score</th>
                                            <th className="border px-1 py-1">Rank</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.finalScores.map((alt: any) => {
                                            const r1 = [...results.finalScores].sort((a: any, b: any) => b.scoreAdditive - a.scoreAdditive).findIndex((a: any) => a.code === alt.code) + 1;
                                            const r2 = [...results.finalScores].sort((a: any, b: any) => b.scoreProbabilistic - a.scoreProbabilistic).findIndex((a: any) => a.code === alt.code) + 1;
                                            const r3 = [...results.finalScores].sort((a: any, b: any) => b.scoreSubtractiveNorm - a.scoreSubtractiveNorm).findIndex((a: any) => a.code === alt.code) + 1;
                                            const r4 = [...results.finalScores].sort((a: any, b: any) => b.scoreMultPowersNorm - a.scoreMultPowersNorm).findIndex((a: any) => a.code === alt.code) + 1;
                                            const r5 = [...results.finalScores].sort((a: any, b: any) => b.scoreMultSimpleNorm - a.scoreMultSimpleNorm).findIndex((a: any) => a.code === alt.code) + 1;

                                            return (
                                                <tr key={alt.code}>
                                                    <td className="border px-2 py-2 font-medium">{alt.name}</td>
                                                    <td className={`border px-2 py-1 text-center ${r1 === 1 ? 'bg-blue-100 font-bold' : ''}`}>{alt.scoreAdditive?.toFixed(4)}</td>
                                                    <td className={`border px-2 py-1 text-center ${r1 === 1 ? 'bg-blue-100 font-bold' : ''}`}>{r1}º</td>
                                                    <td className={`border px-2 py-1 text-center ${r2 === 1 ? 'bg-green-100 font-bold' : ''}`}>{alt.scoreProbabilistic?.toFixed(4)}</td>
                                                    <td className={`border px-2 py-1 text-center ${r2 === 1 ? 'bg-green-100 font-bold' : ''}`}>{r2}º</td>
                                                    <td className={`border px-2 py-1 text-center ${r3 === 1 ? 'bg-yellow-100 font-bold' : ''}`}>{alt.scoreSubtractiveNorm?.toFixed(4)}</td>
                                                    <td className={`border px-2 py-1 text-center ${r3 === 1 ? 'bg-yellow-100 font-bold' : ''}`}>{r3}º</td>
                                                    <td className={`border px-2 py-1 text-center ${r4 === 1 ? 'bg-purple-100 font-bold' : ''}`}>{alt.scoreMultPowersNorm?.toFixed(4)}</td>
                                                    <td className={`border px-2 py-1 text-center ${r4 === 1 ? 'bg-purple-100 font-bold' : ''}`}>{r4}º</td>
                                                    <td className={`border px-2 py-1 text-center ${r5 === 1 ? 'bg-orange-100 font-bold' : ''}`}>{alt.scoreMultSimpleNorm?.toFixed(4)}</td>
                                                    <td className={`border px-2 py-1 text-center ${r5 === 1 ? 'bg-orange-100 font-bold' : ''}`}>{r5}º</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Resumo de concordância */}
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    <strong>Referência:</strong> Petrillo, A.; Salomon, V.A.P.; Tramarico, C.L. (2023). State-of-the-Art Review on the Analytic Hierarchy Process with Benefits, Opportunities, Costs, and Risks. <em>Journal of Risk and Financial Management</em>, 16(8), 372.
                                </p>
                            </div>
                        </div>

                        {/* SEÇÃO 5: Análise de Sensibilidade */}
                        {sensitivityData && (
                            <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">5</span>
                                    Análise de Sensibilidade
                                </h2>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    {BOCR_CRITERIA.map((criterion) => {
                                        const inflection = sensitivityData.inflectionPoints[criterion.code];
                                        return (
                                            <div key={criterion.code} className={`p-4 rounded-lg text-center ${inflection !== null ? 'bg-red-50' : 'bg-green-50'}`}>
                                                <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: criterion.color }}>
                                                    {criterion.code}
                                                </div>
                                                <p className="font-medium mt-2">{criterion.name}</p>
                                                {inflection !== null ? (
                                                    <p className="text-sm text-red-700">⚠️ Inversão em {inflection}%</p>
                                                ) : (
                                                    <p className="text-sm text-green-700">✓ Estável</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        <strong>Interpretação:</strong> A análise de sensibilidade mostra como o ranking das alternativas varia
                                        conforme os pesos dos méritos BOCR são alterados. Critérios marcados como "Estável" indicam que a decisão
                                        não muda independentemente do peso atribuído. Critérios com "Inversão" indicam o ponto percentual onde
                                        ocorre mudança no ranking.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* SEÇÃO 6: Referências Bibliográficas */}
                        <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">6</span>
                                Referências Bibliográficas
                            </h2>
                            <div className="text-sm text-gray-700 space-y-3 leading-relaxed">
                                <p className="pl-6 -indent-6">
                                    PETRILLO, A.; SALOMON, V. A. P.; TRAMARICO, C. L. State-of-the-Art Review on the Analytic Hierarchy Process with Benefits, Opportunities, Costs, and Risks. <strong>Journal of Risk and Financial Management</strong>, v. 16, n. 8, p. 372, 2023. DOI: 10.3390/jrfm16080372.
                                </p>
                                <p className="pl-6 -indent-6">
                                    SAATY, T. L. <strong>The Analytic Hierarchy Process: Planning, Priority Setting, Resource Allocation</strong>. New York: McGraw-Hill, 1980.
                                </p>
                                <p className="pl-6 -indent-6">
                                    SAATY, T. L. How to make a decision: The analytic hierarchy process. <strong>European Journal of Operational Research</strong>, v. 48, n. 1, p. 9-26, 1990.
                                </p>
                                <p className="pl-6 -indent-6">
                                    SAATY, T. L. <strong>Theory and Applications of the Analytic Network Process: Decision Making with Benefits, Opportunities, Costs, and Risks</strong>. Pittsburgh: RWS Publications, 2013.
                                </p>
                                <p className="pl-6 -indent-6">
                                    SAATY, T. L.; OZDEMIR, M. S. Negative priorities in the Analytic Hierarchy Process. <strong>Mathematical and Computer Modelling</strong>, v. 37, p. 1063-1075, 2003.
                                </p>
                                <p className="pl-6 -indent-6">
                                    WIJNMALEN, D. J. D. Analysis of benefits, opportunities, costs, and risks (BOCR) with the AHP–ANP: A critical validation. <strong>Mathematical and Computer Modelling</strong>, v. 46, p. 892-905, 2007.
                                </p>
                                <p className="pl-6 -indent-6">
                                    FORMAN, E.; PENIWATI, K. Aggregating individual judgments and priorities with the Analytic Hierarchy Process. <strong>European Journal of Operational Research</strong>, v. 108, n. 1, p. 165-169, 1998.
                                </p>
                                <p className="pl-6 -indent-6">
                                    MILLET, I.; SCHONER, B. Incorporating negative values into the Analytic Hierarchy Process. <strong>Computers and Operations Research</strong>, v. 32, p. 3163-3173, 2005.
                                </p>
                            </div>
                        </div>

                        {/* SEÇÃO 7: Sugestões para Pesquisas Futuras */}
                        <div className="bg-white rounded-xl shadow-sm p-6 print:shadow-none print:border">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">7</span>
                                Sugestões para Pesquisas Futuras
                            </h2>
                            <div className="text-sm text-gray-700 space-y-4">
                                <p>
                                    Com base na revisão sistemática de Petrillo, Salomon e Tramarico (2023) e nas contribuições metodológicas de Wijnmalen (2007),
                                    identificam-se as seguintes oportunidades para pesquisas futuras:
                                </p>

                                <div className="space-y-3">
                                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                        <p className="font-medium text-blue-800">1. Extensão do Método de Síntese</p>
                                        <p className="text-blue-700 text-xs mt-1">
                                            Implementar e comparar o método de Quociente de Somas proposto por Wijnmalen (2007, Eq. 12),
                                            que oferece vantagens em termos de comensurabilidade das prioridades BOCR.
                                        </p>
                                    </div>

                                    <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                                        <p className="font-medium text-green-800">2. Integração com Outros Métodos MCDM</p>
                                        <p className="text-green-700 text-xs mt-1">
                                            Explorar abordagens híbridas como AHP-TOPSIS, AHP-VIKOR ou Fuzzy AHP-BOCR,
                                            conforme evidenciado na literatura recente (Petrillo et al., 2023).
                                        </p>
                                    </div>

                                    <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                                        <p className="font-medium text-purple-800">3. Análise de Comensurabilidade</p>
                                        <p className="text-purple-700 text-xs mt-1">
                                            Investigar o problema da incomensurabilidade das prioridades entre os quatro fatores BOCR
                                            e propor métodos de ajuste de magnitude conforme Wedley et al. (2001).
                                        </p>
                                    </div>

                                    <div className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                                        <p className="font-medium text-orange-800">4. Aplicação em Outros Setores</p>
                                        <p className="text-orange-700 text-xs mt-1">
                                            Expandir a aplicação do modelo AHP-BOCR para outros contextos além do setor automotivo,
                                            como energia renovável, saúde e sustentabilidade, áreas identificadas como promissoras.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rodapé do Relatório */}
                        <div className="text-center text-xs text-gray-400 py-4 border-t">
                            <p>Relatório gerado automaticamente pelo Sistema AHP-BOCR</p>
                            <p>Mestrado em Engenharia de Produção - UNESP Guaratinguetá</p>
                            <p>{new Date().toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
    </div >
  </div >
  );
}

