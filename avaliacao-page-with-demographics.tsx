// app/avaliacao/[projectId]/page.tsx
// Versão com coleta de dados demográficos
// Fluxo: Login → Dados Demográficos → Pesquisa AHP
'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { BOCR_CRITERIA, SUBCRITERIA, generateAllComparisons, Project, Alternative, Respondent } from '@/lib/data';

// ============================================================
// DADOS DEMOGRÁFICOS - OPÇÕES
// ============================================================

const DEMOGRAPHIC_OPTIONS = {
  idade: {
    label: 'Faixa Etária',
    options: [
      { value: 'menos_30', label: 'Menos de 30 anos' },
      { value: '31_40', label: '31 a 40 anos' },
      { value: '41_50', label: '41 a 50 anos' },
      { value: 'mais_50', label: 'Mais de 50 anos' }
    ]
  },
  genero: {
    label: 'Gênero',
    options: [
      { value: 'masculino', label: 'Masculino' },
      { value: 'feminino', label: 'Feminino' },
      { value: 'outro', label: 'Outro / Prefiro não informar' }
    ]
  },
  formacao: {
    label: 'Nível de Formação',
    options: [
      { value: 'superior', label: 'Superior (Graduação)' },
      { value: 'especializacao', label: 'Especialização / MBA' },
      { value: 'mestrado', label: 'Mestrado' },
      { value: 'doutorado', label: 'Doutorado ou Acima' }
    ]
  },
  areaFormacao: {
    label: 'Área de Formação',
    options: [
      { value: 'administracao', label: 'Administração' },
      { value: 'engenharias', label: 'Engenharias' },
      { value: 'logistica', label: 'Logística' },
      { value: 'ti_sistemas', label: 'TI / Sistemas' },
      { value: 'ciencias_exatas', label: 'Ciências Exatas' },
      { value: 'outra', label: 'Outra' }
    ]
  },
  tempoTrabalho: {
    label: 'Tempo de Trabalho na Área',
    options: [
      { value: 'menos_10', label: 'Menos de 10 anos' },
      { value: '11_20', label: '11 a 20 anos' },
      { value: '21_30', label: '21 a 30 anos' },
      { value: 'mais_30', label: 'Mais de 30 anos' }
    ]
  },
  tempoGestor: {
    label: 'Tempo como Gestor',
    options: [
      { value: 'nao_atua', label: 'Não atuo como gestor' },
      { value: 'menos_10', label: 'Menos de 10 anos' },
      { value: '11_20', label: '11 a 20 anos' },
      { value: '21_30', label: '21 a 30 anos' },
      { value: 'mais_30', label: 'Mais de 30 anos' }
    ]
  },
  areaAtuacao: {
    label: 'Área de Atuação',
    options: [
      { value: 'producao', label: 'Produção' },
      { value: 'eng_processos', label: 'Eng. Processos' },
      { value: 'financas', label: 'Finanças' },
      { value: 'qualidade', label: 'Qualidade' },
      { value: 'manutencao', label: 'Manutenção' },
      { value: 'logistica', label: 'Logística' },
      { value: 'ti', label: 'Tecnologia da Informação' }
    ]
  },
  funcao: {
    label: 'Função / Cargo',
    options: [
      { value: 'c_level', label: 'C-Level' },
      { value: 'diretor', label: 'Diretor' },
      { value: 'gerente', label: 'Gerente' },
      { value: 'supervisor', label: 'Supervisor' },
      { value: 'analista', label: 'Analista / Especialista / Engenheiro' }
    ]
  }
};

// Interface para dados demográficos (local, para o formulário)
interface DemographicData {
  idade: string;
  genero: string;
  formacao: string;
  areaFormacao: string;
  tempoTrabalho: string;
  tempoGestor: string;
  areaAtuacao: string;
  funcao: string;
  submittedAt?: string;
}

// ============================================================
// ESCALA DE SAATY
// ============================================================

const SAATY_LABELS: { [key: number]: string } = {
  1: '1 - Igual importância',
  2: '2 - Entre igual e fraca',
  3: '3 - Importância fraca',
  4: '4 - Entre fraca e forte',
  5: '5 - Importância forte',
  6: '6 - Entre forte e muito forte',
  7: '7 - Importância muito forte',
  8: '8 - Entre muito forte e absoluta',
  9: '9 - Importância absoluta',
};

const SAATY_SCALE_DETAILED = [
  {
    value: 1,
    label: 'Igual importância',
    definition: 'Ambos os elementos contribuem igualmente para o objetivo. Não há diferença perceptível entre eles.',
    example: 'Exemplo: "Custo de manutenção" e "Custo de operação" são igualmente importantes para avaliar despesas.'
  },
  {
    value: 3,
    label: 'Importância fraca (ou moderada)',
    definition: 'A experiência e o julgamento favorecem levemente um elemento sobre o outro.',
    example: 'Exemplo: "Segurança" é um pouco mais importante que "Conforto" ao escolher um veículo.'
  },
  {
    value: 5,
    label: 'Importância forte (ou essencial)',
    definition: 'A experiência e o julgamento favorecem fortemente um elemento sobre o outro. A diferença é claramente perceptível.',
    example: 'Exemplo: "Qualidade do produto" é significativamente mais importante que "Embalagem" para a satisfação do cliente.'
  },
  {
    value: 7,
    label: 'Importância muito forte (ou demonstrada)',
    definition: 'Um elemento é fortemente favorecido e sua dominância é demonstrada na prática.',
    example: 'Exemplo: "Conformidade legal" é muito mais importante que "Estética" em projetos de engenharia.'
  },
  {
    value: 9,
    label: 'Importância absoluta',
    definition: 'A evidência favorece um elemento sobre o outro com o mais alto grau de certeza possível.',
    example: 'Exemplo: "Segurança dos funcionários" tem prioridade absoluta sobre "Redução de custos" em situações de risco.'
  },
  {
    value: '2,4,6,8',
    label: 'Valores intermediários',
    definition: 'Usados quando é necessário um compromisso entre dois níveis adjacentes da escala.',
    example: 'Exemplo: Se você acha que está entre "fraca" (3) e "forte" (5), use o valor 4.'
  },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function AvaliacaoProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const tokenFromUrl = searchParams.get('token');
  
  // Estados gerais
  const [project, setProject] = useState<Project | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [judgments, setJudgments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondentId, setRespondentId] = useState<string | null>(null);
  const [respondentData, setRespondentData] = useState<Respondent | null>(null);
  const [error, setError] = useState('');
  const [alreadyResponded, setAlreadyResponded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Estados para autenticação
  const [authStep, setAuthStep] = useState<'loading' | 'email_validation' | 'demographics' | 'authenticated' | 'error'>('loading');
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [authError, setAuthError] = useState('');

  // Estados para dados demográficos
  const [demographics, setDemographics] = useState<DemographicData>({
    idade: '',
    genero: '',
    formacao: '',
    areaFormacao: '',
    tempoTrabalho: '',
    tempoGestor: '',
    areaAtuacao: '',
    funcao: ''
  });
  const [demographicsError, setDemographicsError] = useState('');
  const [savingDemographics, setSavingDemographics] = useState(false);

  // ============================================================
  // CARREGAR PROJETO
  // ============================================================

  useEffect(() => {
    const loadProject = async () => {
      try {
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (!projectDoc.exists()) { 
          setError('Projeto não encontrado'); 
          setAuthStep('error');
          setLoading(false); 
          return; 
        }

        const projectData = projectDoc.data() as Project;
        if (projectData.status !== 'active') { 
          setError('Este projeto não está aberto para avaliações'); 
          setAuthStep('error');
          setLoading(false); 
          return; 
        }

        setProject(projectData);
        setAlternatives(projectData.alternatives || []);
        const allComparisons = generateAllComparisons(projectData.alternatives);
        setComparisons(allComparisons);

        if (tokenFromUrl) {
          localStorage.setItem(`pendingToken_${projectId}`, tokenFromUrl);
        }
        
        // Verificar sessão existente
        const validatedEmail = sessionStorage.getItem(`validatedEmail_${projectId}`);
        const savedRespondentId = sessionStorage.getItem(`validatedRespondentId_${projectId}`);
        
        if (validatedEmail && savedRespondentId) {
          const isStillValid = await validateToken(savedRespondentId, projectId);
          if (isStillValid) {
            setRespondentId(savedRespondentId);
            
            // Verificar se já preencheu dados demográficos
            const respondentDoc = await getDoc(doc(db, 'respondents', savedRespondentId));
            const respData = respondentDoc.data() as Respondent;
            
            if (respData?.demographics) {
              // Já tem dados demográficos, ir direto para pesquisa
              await loadExistingProgress(savedRespondentId, projectId, allComparisons);
              setAuthStep('authenticated');
            } else {
              // Precisa preencher dados demográficos
              setAuthStep('demographics');
            }
          } else {
            sessionStorage.removeItem(`validatedEmail_${projectId}`);
            sessionStorage.removeItem(`validatedRespondentId_${projectId}`);
            setAuthStep('email_validation');
          }
        } else {
          setAuthStep('email_validation');
        }

        setLoading(false);
      } catch (err) {
        console.error('Erro:', err);
        setError('Erro ao carregar projeto');
        setAuthStep('error');
        setLoading(false);
      }
    };

    if (projectId) loadProject();
  }, [projectId, tokenFromUrl]);

  // ============================================================
  // VALIDAÇÃO DE TOKEN
  // ============================================================

  const validateToken = async (token: string, projId: string): Promise<boolean> => {
    try {
      const respondentDoc = await getDoc(doc(db, 'respondents', token));
      if (!respondentDoc.exists()) return false;
      
      const data = respondentDoc.data() as Respondent;
      if (data.projectId !== projId) return false;
      
      setRespondentData(data);
      return true;
    } catch (e) {
      return false;
    }
  };

  // ============================================================
  // VALIDAÇÃO DE EMAIL E CÓDIGO
  // ============================================================

  const handleEmailValidation = async () => {
    const email = emailInput.trim().toLowerCase();
    const code = codeInput.trim();
    
    if (!email) {
      setAuthError('Digite seu email');
      return;
    }
    if (!code) {
      setAuthError('Digite o código de acesso');
      return;
    }

    setValidating(true);
    setAuthError('');

    try {
      const respondentsQuery = query(
        collection(db, 'respondents'),
        where('projectId', '==', projectId),
        where('email', '==', email)
      );
      const snapshot = await getDocs(respondentsQuery);

      if (snapshot.empty) {
        setAuthError('Este email não está autorizado a participar desta pesquisa.');
        setValidating(false);
        return;
      }

      const respondentDoc = snapshot.docs[0];
      const data = respondentDoc.data() as Respondent;
      
      if (data.accessCode && data.accessCode !== code) {
        setAuthError('Código de acesso incorreto. Verifique o código recebido.');
        setValidating(false);
        return;
      }

      const respondentId = respondentDoc.id;

      setRespondentId(respondentId);
      setRespondentData(data);
      
      sessionStorage.setItem(`validatedEmail_${projectId}`, email);
      sessionStorage.setItem(`validatedRespondentId_${projectId}`, respondentId);

      // Verificar se já tem dados demográficos
      if (data.demographics) {
        // Já preencheu, carregar progresso e ir para pesquisa
        await loadExistingProgress(respondentId, projectId, comparisons);
        
        if (data.status === 'pending') {
          await updateDoc(doc(db, 'respondents', respondentId), {
            status: 'in_progress',
            startedAt: new Date().toISOString()
          });
        }
        
        setAuthStep('authenticated');
      } else {
        // Precisa preencher dados demográficos
        setAuthStep('demographics');
      }
    } catch (error) {
      console.error('Erro na validação:', error);
      setAuthError('Erro ao validar. Tente novamente.');
    } finally {
      setValidating(false);
    }
  };

  // ============================================================
  // SALVAR DADOS DEMOGRÁFICOS
  // ============================================================

  const handleSaveDemographics = async () => {
    // Validar campos obrigatórios
    const requiredFields = ['idade', 'genero', 'formacao', 'areaFormacao', 'tempoTrabalho', 'tempoGestor', 'areaAtuacao', 'funcao'];
    const emptyFields = requiredFields.filter(field => !demographics[field as keyof DemographicData]);
    
    if (emptyFields.length > 0) {
      setDemographicsError('Por favor, preencha todos os campos antes de continuar.');
      return;
    }

    setSavingDemographics(true);
    setDemographicsError('');

    try {
      if (!respondentId) throw new Error('Respondente não identificado');

      // Salvar dados demográficos no respondente
      await updateDoc(doc(db, 'respondents', respondentId), {
        demographics: {
          ...demographics,
          submittedAt: new Date().toISOString()
        },
        status: 'in_progress',
        startedAt: new Date().toISOString()
      });

      // Carregar progresso existente (se houver)
      await loadExistingProgress(respondentId, projectId, comparisons);

      // Ir para a pesquisa
      setAuthStep('authenticated');
    } catch (error) {
      console.error('Erro ao salvar dados demográficos:', error);
      setDemographicsError('Erro ao salvar. Tente novamente.');
    } finally {
      setSavingDemographics(false);
    }
  };

  // ============================================================
  // CARREGAR PROGRESSO EXISTENTE
  // ============================================================

  const loadExistingProgress = async (respId: string, projId: string, allComparisons: any[]) => {
    const responsesQuery = query(
      collection(db, 'responses'),
      where('projectId', '==', projId),
      where('respondentId', '==', respId)
    );
    const existingResponses = await getDocs(responsesQuery);

    if (!existingResponses.empty) {
      const response = existingResponses.docs[0].data();
      if (response.completedAt) {
        setAlreadyResponded(true);
        return;
      }
      if (response.judgments && response.currentIndex !== undefined) {
        setJudgments(response.judgments);
        setCurrentIndex(response.currentIndex);
      }
    }

    try {
      const respondentRef = doc(db, 'respondents', respId);
      const respondentDoc = await getDoc(respondentRef);
      if (respondentDoc.exists() && respondentDoc.data().status === 'pending') {
        await updateDoc(respondentRef, { 
          status: 'in_progress', 
          startedAt: new Date().toISOString() 
        });
      }
    } catch (e) { 
      console.log('Erro ao atualizar status'); 
    }
  };

  // ============================================================
  // AUTO-SAVE
  // ============================================================

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (judgments.length > 0 && respondentId && !alreadyResponded && authStep === 'authenticated') {
        saveProgress();
      }
    }, 30000);
    return () => clearInterval(autoSaveInterval);
  }, [judgments, respondentId, alreadyResponded, authStep]);

  const saveProgress = async () => {
    if (!respondentId || !projectId) return;
    setSaving(true);
    try {
      const responsesQuery = query(
        collection(db, 'responses'),
        where('projectId', '==', projectId),
        where('respondentId', '==', respondentId)
      );
      const existingResponses = await getDocs(responsesQuery);
      const progressData = { 
        projectId, 
        respondentId, 
        judgments, 
        currentIndex, 
        updatedAt: new Date().toISOString() 
      };
      
      if (existingResponses.empty) {
        await addDoc(collection(db, 'responses'), progressData);
      } else {
        await updateDoc(existingResponses.docs[0].ref, progressData);
      }
      setLastSaved(new Date());
    } catch (error) { 
      console.error('Erro ao salvar:', error); 
    } finally { 
      setSaving(false); 
    }
  };

  // ============================================================
  // FUNÇÕES AUXILIARES
  // ============================================================

  const getItemName = (code: string): string => {
    const bocr = BOCR_CRITERIA.find(b => b.code === code);
    if (bocr) return bocr.name;
    const sub = SUBCRITERIA.find(s => s.code === code);
    if (sub) return sub.name;
    const alt = alternatives.find(a => a.code === code);
    if (alt) return alt.name;
    return code;
  };

  const getItemDescription = (code: string): string => {
    const bocr = BOCR_CRITERIA.find(b => b.code === code);
    if (bocr) return bocr.description;
    const sub = SUBCRITERIA.find(s => s.code === code);
    if (sub) return sub.description;
    const alt = alternatives.find(a => a.code === code);
    if (alt) return alt.description;
    return '';
  };

  const getItemColor = (code: string): string => {
    const bocr = BOCR_CRITERIA.find(b => b.code === code);
    if (bocr) return bocr.color;
    const sub = SUBCRITERIA.find(s => s.code === code);
    if (sub) return sub.color;
    return '#6B7280';
  };

  const current = comparisons[currentIndex];
  const progress = comparisons.length > 0 ? ((currentIndex) / comparisons.length) * 100 : 0;

  function sliderToSaaty(value: number): { saatyValue: number; favors: 'A' | 'B' | 'equal' } {
    if (value === 0) return { saatyValue: 1, favors: 'equal' };
    if (value < 0) return { saatyValue: Math.abs(value) + 1, favors: 'A' };
    return { saatyValue: value + 1, favors: 'B' };
  }

  function getDynamicLabel(): string {
    if (!current) return '';
    const { saatyValue, favors } = sliderToSaaty(sliderValue);
    const label = SAATY_LABELS[saatyValue] || '';
    if (favors === 'equal') return `${getItemName(current.itemA)} e ${getItemName(current.itemB)} têm igual importância`;
    const favoredItem = favors === 'A' ? current.itemA : current.itemB;
    const otherItem = favors === 'A' ? current.itemB : current.itemA;
    return `${getItemName(favoredItem)} possui importância "${label.split(' - ')[1]}" em relação a ${getItemName(otherItem)}`;
  }

  const getComparisonTitle = () => {
    if (!current) return '';
    if (current.type === 'bocr') return 'Ponderação Estratégica (BOCR)';
    if (current.type === 'subcriteria') return `Subcritérios: ${BOCR_CRITERIA.find(b => b.code === current.group)?.name || current.group}`;
    if (current.type === 'alternatives') return `Alternativas: ${SUBCRITERIA.find(s => s.code === current.group)?.name || current.group}`;
    return 'Comparação';
  };

  const getQuestionText = () => {
    if (!current) return '';
    if (current.type === 'bocr') return 'Considerando a decisão de investimento em tecnologias da Indústria 4.0, qual critério estratégico tem maior importância?';
    if (current.type === 'subcriteria') {
      const parent = BOCR_CRITERIA.find(b => b.code === current.group);
      return `Considerando "${parent?.name}", qual subcritério tem maior importância para a avaliação?`;
    }
    if (current.type === 'alternatives') {
      const subParent = SUBCRITERIA.find(s => s.code === current.group);
      return `Considerando o critério "${subParent?.name}", qual alternativa apresenta melhor desempenho?`;
    }
    return 'Compare os itens:';
  };

  // ============================================================
  // NAVEGAÇÃO
  // ============================================================

  const handleNext = async () => {
    const { saatyValue, favors } = sliderToSaaty(sliderValue);
    const judgment = { ...current, saatyValue, favors, rawSlider: sliderValue };
    const newJudgments = [...judgments, judgment];
    setJudgments(newJudgments);

    if (currentIndex + 1 >= comparisons.length) {
      // Finalizar
      setSaving(true);
      try {
        const responsesQuery = query(
          collection(db, 'responses'),
          where('projectId', '==', projectId),
          where('respondentId', '==', respondentId)
        );
        const existingResponses = await getDocs(responsesQuery);
        const finalData = {
          projectId, respondentId, judgments: newJudgments,
          currentIndex: currentIndex + 1,
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (existingResponses.empty) {
          await addDoc(collection(db, 'responses'), finalData);
        } else {
          await updateDoc(existingResponses.docs[0].ref, finalData);
        }

        if (respondentId) {
          await updateDoc(doc(db, 'respondents', respondentId), {
            status: 'completed',
            completedAt: new Date().toISOString()
          });
        }

        window.location.href = '/obrigado';
      } catch (error) {
        console.error('Erro ao finalizar:', error);
        alert('Erro ao salvar. Tente novamente.');
        setSaving(false);
      }
    } else {
      setCurrentIndex(currentIndex + 1);
      setSliderValue(0);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevJudgment = judgments[currentIndex - 1];
      if (prevJudgment) setSliderValue(prevJudgment.rawSlider || 0);
      setJudgments(judgments.slice(0, -1));
      setCurrentIndex(currentIndex - 1);
    }
  };

  // ============================================================
  // TELA DE LOADING
  // ============================================================

  if (loading || authStep === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Carregando...</div>
      </div>
    );
  }

  // ============================================================
  // TELA DE ERRO
  // ============================================================

  if (authStep === 'error' || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Erro</h1>
          <p className="text-gray-600">{error || 'Ocorreu um erro inesperado.'}</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA DE VALIDAÇÃO DE EMAIL E CÓDIGO
  // ============================================================

  if (authStep === 'email_validation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso à Pesquisa</h1>
            <p className="text-gray-600 text-sm">
              {project?.name || 'Pesquisa AHP-BOCR'}
            </p>
          </div>

          {/* Indicador de etapa */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <span className="ml-2 text-sm font-medium text-indigo-600">Login</span>
            </div>
            <div className="w-8 h-px bg-gray-300 mx-2"></div>
            <div className="flex items-center opacity-50">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <span className="ml-2 text-sm text-gray-500">Perfil</span>
            </div>
            <div className="w-8 h-px bg-gray-300 mx-2"></div>
            <div className="flex items-center opacity-50">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <span className="ml-2 text-sm text-gray-500">Pesquisa</span>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              <strong>📋 Validação necessária</strong><br />
              Digite seu email e o código de acesso que você recebeu.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seu email
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                disabled={validating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de acesso
              </label>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailValidation()}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center text-2xl font-mono tracking-widest"
                disabled={validating}
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Código de 6 dígitos enviado junto com o link
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{authError}</p>
              </div>
            )}

            <button
              onClick={handleEmailValidation}
              disabled={validating || !emailInput.trim() || codeInput.length < 6}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validating ? 'Validando...' : 'Continuar →'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Dúvidas? Entre em contato com o pesquisador:<br />
              <a href="mailto:pedro.palma@unesp.br" className="text-indigo-600 hover:underline">
                pedro.palma@unesp.br
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA DE DADOS DEMOGRÁFICOS
  // ============================================================

  if (authStep === 'demographics') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
              <h1 className="text-2xl font-bold text-white mb-2">Perfil do Especialista</h1>
              <p className="text-white/80 text-sm">
                Antes de iniciar a avaliação, precisamos conhecer um pouco sobre seu perfil profissional.
              </p>
            </div>

            {/* Indicador de etapa */}
            <div className="flex items-center justify-center py-4 bg-gray-50 border-b">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">✓</div>
                <span className="ml-2 text-sm text-green-600">Login</span>
              </div>
              <div className="w-8 h-px bg-green-500 mx-2"></div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <span className="ml-2 text-sm font-medium text-indigo-600">Perfil</span>
              </div>
              <div className="w-8 h-px bg-gray-300 mx-2"></div>
              <div className="flex items-center opacity-50">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <span className="ml-2 text-sm text-gray-500">Pesquisa</span>
              </div>
            </div>

            {/* Formulário */}
            <div className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Idade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {DEMOGRAPHIC_OPTIONS.idade.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={demographics.idade}
                    onChange={(e) => setDemographics({ ...demographics, idade: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.idade.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Gênero */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {DEMOGRAPHIC_OPTIONS.genero.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={demographics.genero}
                    onChange={(e) => setDemographics({ ...demographics, genero: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.genero.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Formação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {DEMOGRAPHIC_OPTIONS.formacao.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={demographics.formacao}
                    onChange={(e) => setDemographics({ ...demographics, formacao: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.formacao.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Área de Formação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {DEMOGRAPHIC_OPTIONS.areaFormacao.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={demographics.areaFormacao}
                    onChange={(e) => setDemographics({ ...demographics, areaFormacao: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.areaFormacao.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tempo de Trabalho */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {DEMOGRAPHIC_OPTIONS.tempoTrabalho.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={demographics.tempoTrabalho}
                    onChange={(e) => setDemographics({ ...demographics, tempoTrabalho: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.tempoTrabalho.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tempo como Gestor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {DEMOGRAPHIC_OPTIONS.tempoGestor.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={demographics.tempoGestor}
                    onChange={(e) => setDemographics({ ...demographics, tempoGestor: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.tempoGestor.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Área de Atuação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {DEMOGRAPHIC_OPTIONS.areaAtuacao.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={demographics.areaAtuacao}
                    onChange={(e) => setDemographics({ ...demographics, areaAtuacao: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.areaAtuacao.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Função */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {DEMOGRAPHIC_OPTIONS.funcao.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={demographics.funcao}
                    onChange={(e) => setDemographics({ ...demographics, funcao: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  >
                    <option value="">Selecione...</option>
                    {DEMOGRAPHIC_OPTIONS.funcao.options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Erro */}
              {demographicsError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{demographicsError}</p>
                </div>
              )}

              {/* Informação de privacidade */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">
                  <strong>🔒 Privacidade:</strong> Seus dados são confidenciais e serão utilizados apenas para fins estatísticos 
                  da pesquisa acadêmica. Os resultados serão apresentados de forma agregada, sem identificação individual.
                </p>
              </div>

              {/* Botão */}
              <button
                onClick={handleSaveDemographics}
                disabled={savingDemographics}
                className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {savingDemographics ? 'Salvando...' : 'Iniciar Avaliação →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA DE JÁ RESPONDIDO
  // ============================================================

  if (alreadyResponded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-lg w-full relative z-10">
          {/* Ícone de Sucesso */}
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full"></div>
            <div className="absolute inset-2 bg-emerald-500/30 rounded-full"></div>
            <div className="absolute inset-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Título */}
          <h1 className="text-3xl font-bold text-white mb-4 text-center">
            Avaliação já Concluída!
          </h1>

          {/* Card Principal */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-6">
            <p className="text-gray-300 text-center text-lg mb-4">
              Você já completou esta avaliação anteriormente.
            </p>
            <p className="text-white text-center">
              Sua contribuição foi <span className="text-emerald-400 font-semibold">registrada com sucesso</span>.
              Agradecemos sua participação nesta pesquisa acadêmica.
            </p>
          </div>

          {/* Card de Contato */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
            <p className="text-gray-400 text-sm text-center mb-3">
              Em caso de dúvidas, entre em contato:
            </p>
            <a 
              href="mailto:pedro.palma@unesp.br"
              className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              pedro.palma@unesp.br
            </a>
          </div>

          {/* Botão Voltar */}
          <div className="text-center">
            <a 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Voltar ao Início
            </a>
          </div>

          {/* Footer Institucional */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  UNESP — Universidade Estadual Paulista | Guaratinguetá
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Mestrado Profissional em Engenharia de Produção
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // TELA PRINCIPAL DE AVALIAÇÃO (PESQUISA AHP)
  // ============================================================

  if (!current || authStep !== 'authenticated') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Carregando comparações...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header com info do respondente */}
        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="text-white/70 text-sm">
            <span className="bg-white/10 px-2 py-1 rounded">
              👤 {respondentData?.email || 'Respondente'}
            </span>
          </div>
          <div className="text-white/50 text-xs flex items-center gap-2">
            {saving && <span className="text-yellow-300">💾 Salvando...</span>}
            {lastSaved && !saving && <span className="text-green-300">✓ Salvo às {lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        </div>

        {/* Indicador de etapa */}
        <div className="flex items-center justify-center mb-4 bg-white/10 rounded-lg py-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
            <span className="ml-1 text-xs text-green-300">Login</span>
          </div>
          <div className="w-4 h-px bg-green-500 mx-1"></div>
          <div className="flex items-center">
            <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</div>
            <span className="ml-1 text-xs text-green-300">Perfil</span>
          </div>
          <div className="w-4 h-px bg-green-500 mx-1"></div>
          <div className="flex items-center">
            <div className="w-6 h-6 bg-indigo-400 text-white rounded-full flex items-center justify-center text-xs font-bold">3</div>
            <span className="ml-1 text-xs text-white font-medium">Pesquisa</span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between text-white/70 text-xs sm:text-sm mb-2">
            <span>Questão {currentIndex + 1} de {comparisons.length}</span>
            <span>{Math.round(progress)}% concluído</span>
          </div>
          <div className="h-2 sm:h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-4 sm:p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-xs font-medium mb-2">{getComparisonTitle()}</span>
            <p className="text-white/90 text-sm sm:text-base">{getQuestionText()}</p>
          </div>

          <div className="p-4 sm:p-8">
            {/* Items */}
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className={`p-4 sm:p-5 rounded-xl border-2 transition-all ${sliderValue < 0 ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-[1.02]' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base" style={{ backgroundColor: getItemColor(current.itemA) }}>
                    {current.itemA}
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{getItemName(current.itemA)}</h3>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm">{getItemDescription(current.itemA)}</p>
              </div>

              <div className={`p-4 sm:p-5 rounded-xl border-2 transition-all ${sliderValue > 0 ? 'border-purple-500 bg-purple-50 shadow-lg scale-[1.02]' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-base" style={{ backgroundColor: getItemColor(current.itemB) }}>
                    {current.itemB}
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm sm:text-base">{getItemName(current.itemB)}</h3>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm">{getItemDescription(current.itemB)}</p>
              </div>
            </div>

            {/* Slider */}
            <div className="mb-6 sm:mb-8">
              <div className="flex justify-between text-xs text-gray-500 mb-3">
                <span className="text-indigo-600 font-medium">{getItemName(current.itemA)}</span>
                <span>Igual</span>
                <span className="text-purple-600 font-medium">{getItemName(current.itemB)}</span>
              </div>
              
              {/* Range Input */}
              <div className="slider-container">
                <input 
                  type="range" 
                  min="-8" 
                  max="8" 
                  step="1"
                  value={sliderValue}
                  onChange={(e) => setSliderValue(parseInt(e.target.value))}
                  className="slider-input"
                  style={{ touchAction: 'pan-y' }} 
                />
              </div>
              
              {/* Labels numéricos */}
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>9</span>
                <span>7</span>
                <span>5</span>
                <span>3</span>
                <span>1</span>
                <span>3</span>
                <span>5</span>
                <span>7</span>
                <span>9</span>
              </div>
            </div>

            {/* Label Dinâmica */}
            <div className="text-center p-3 sm:p-4 bg-gray-50 rounded-xl mb-6 sm:mb-8">
              <p className="text-gray-700 font-medium text-sm sm:text-base">{getDynamicLabel()}</p>
            </div>

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button onClick={handlePrevious} disabled={currentIndex === 0}
                className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium">
                ← Anterior
              </button>
              <button onClick={handleNext} disabled={saving}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50">
                {currentIndex + 1 >= comparisons.length ? (saving ? 'Finalizando...' : '✓ Finalizar') : 'Próxima →'}
              </button>
            </div>

            {/* Botão salvar */}
            <button onClick={saveProgress} disabled={saving || judgments.length === 0}
              className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700 text-sm disabled:opacity-30">
              {saving ? '💾 Salvando...' : '💾 Pausar e salvar progresso'}
            </button>
          </div>
        </div>

        {/* Glossário Expandido */}
        <details className="mt-4 sm:mt-6 bg-white/10 backdrop-blur rounded-xl">
          <summary className="px-4 sm:px-6 py-3 sm:py-4 cursor-pointer text-white font-medium text-sm sm:text-base hover:bg-white/5 transition-colors rounded-xl">
            📖 Entenda a Escala de Saaty (Clique para expandir)
          </summary>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="mb-4 p-3 bg-white/10 rounded-lg">
              <p className="text-white/90 text-sm leading-relaxed">
                <strong>O que é?</strong> A Escala Fundamental de Saaty é uma ferramenta científica que permite 
                comparar dois elementos por vez, atribuindo valores de 1 a 9 para expressar o quanto um é mais 
                importante que o outro.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-white font-medium text-sm">Significado de cada valor:</h4>
              
              {SAATY_SCALE_DETAILED.map((item, idx) => (
                <div key={idx} className="bg-white/5 rounded-lg p-3 border-l-4 border-indigo-400">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white font-bold text-lg shadow-lg">
                        {item.value}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-white font-semibold text-sm">{item.label}</h5>
                      <p className="text-white/80 text-xs mt-1 leading-relaxed">{item.definition}</p>
                      <p className="text-indigo-300 text-xs mt-2 italic">{item.example}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10">
              <p className="text-white/50 text-xs">
                Referência: SAATY, T. L. Decision making with the analytic hierarchy process. 
                <em> International Journal of Services Sciences</em>, v. 1, n. 1, p. 83-98, 2008.
              </p>
            </div>
          </div>
        </details>
      </div>

      <style jsx>{`
        .slider-container {
          position: relative;
          width: 100%;
          padding: 10px 0;
        }
        .slider-input {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 4px;
          background: linear-gradient(to right, #c7d2fe, #e5e7eb, #e9d5ff);
          outline: none;
          cursor: pointer;
          margin: 0;
          padding: 0;
        }
        .slider-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 3px solid white;
          margin-top: -8px;
        }
        .slider-input::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          border: 3px solid white;
        }
        .slider-input::-moz-range-track {
          height: 8px;
          border-radius: 4px;
          background: linear-gradient(to right, #c7d2fe, #e5e7eb, #e9d5ff);
        }
      `}</style>
    </div>
  );
}
