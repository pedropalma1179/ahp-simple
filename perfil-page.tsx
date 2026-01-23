// app/perfil/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

// Opções para os campos do formulário
const FAIXAS_IDADE = [
  { value: '<30', label: 'Menos de 30 anos' },
  { value: '31-40', label: '31 a 40 anos' },
  { value: '41-50', label: '41 a 50 anos' },
  { value: '>50', label: 'Mais de 50 anos' },
];

const GENEROS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
  { value: 'prefiro_nao_informar', label: 'Prefiro não informar' },
];

const NIVEIS_FORMACAO = [
  { value: 'ensino_medio', label: 'Ensino Médio' },
  { value: 'superior', label: 'Superior (Graduação)' },
  { value: 'especializacao', label: 'Especialização/MBA' },
  { value: 'mestrado', label: 'Mestrado' },
  { value: 'doutorado', label: 'Doutorado ou Acima' },
];

const AREAS_FORMACAO = [
  { value: 'administracao', label: 'Administração' },
  { value: 'engenharias', label: 'Engenharias' },
  { value: 'logistica', label: 'Logística' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ti_sistemas', label: 'TI / Sistemas de Informação' },
  { value: 'ciencias_exatas', label: 'Ciências Exatas (Química, Física, Matemática, etc.)' },
  { value: 'outra', label: 'Outra' },
];

const TEMPO_TRABALHO = [
  { value: '<10', label: 'Menos de 10 anos' },
  { value: '11-20', label: '11 a 20 anos' },
  { value: '21-30', label: '21 a 30 anos' },
  { value: '>30', label: 'Mais de 30 anos' },
];

const TEMPO_GESTOR = [
  { value: '0', label: 'Não atuo como gestor' },
  { value: '<10', label: 'Menos de 10 anos' },
  { value: '11-20', label: '11 a 20 anos' },
  { value: '21-30', label: '21 a 30 anos' },
  { value: '>30', label: 'Mais de 30 anos' },
];

const AREAS_ATUACAO = [
  { value: 'gerencial', label: 'Gerencial' },
  { value: 'engenharia_processos', label: 'Engenharia de Processos/Produção' },
  { value: 'planejamento_logistica', label: 'Planejamento e Logística' },
  { value: 'producao', label: 'Produção' },
  { value: 'projetos', label: 'Projetos' },
  { value: 'qualidade', label: 'Qualidade / Melhoria Contínua' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'outra', label: 'Outra' },
];

const FUNCOES = [
  { value: 'c_level', label: 'C-Level (CEO, CFO, COO, etc.)' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'supervisor', label: 'Supervisor / Coordenador' },
  { value: 'analista_especialista', label: 'Analista / Especialista / Engenheiro' },
];

function PerfilContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const token = searchParams.get('token');
  
  const [step, setStep] = useState<'auth' | 'profile' | 'redirect'>('auth');
  const [email, setEmail] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [respondentId, setRespondentId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  
  // Campos do perfil
  const [formData, setFormData] = useState({
    nome: '',
    faixaIdade: '',
    genero: '',
    nivelFormacao: '',
    areaFormacao: '',
    areaFormacaoOutra: '',
    tempoTrabalho: '',
    tempoGestor: '',
    areaAtuacao: '',
    areaAtuacaoOutra: '',
    funcao: '',
  });
  const [formError, setFormError] = useState('');

  // Se veio com token, tentar autenticação automática
  useEffect(() => {
    if (token && projectId) {
      // Token é o respondentId
      setRespondentId(token);
      localStorage.setItem(`respondentId_${projectId}`, token);
      checkExistingProfile(token);
    }
  }, [token, projectId]);

  // Carregar nome do projeto
  useEffect(() => {
    if (projectId) {
      loadProjectName();
    }
  }, [projectId]);

  const loadProjectName = async () => {
    try {
      const projectDoc = await getDoc(doc(db, 'projects', projectId!));
      if (projectDoc.exists()) {
        setProjectName(projectDoc.data().name);
      }
    } catch (e) {
      console.error('Erro ao carregar projeto:', e);
    }
  };

  const checkExistingProfile = async (respId: string) => {
    try {
      const respondentDoc = await getDoc(doc(db, 'respondents', respId));
      if (respondentDoc.exists()) {
        const data = respondentDoc.data();
        // Se já tem perfil completo, redirecionar para avaliação
        if (data.perfilCompleto) {
          setStep('redirect');
          setTimeout(() => {
            window.location.href = `/avaliacao/${projectId}?token=${respId}`;
          }, 1500);
        } else {
          // Carregar dados existentes se houver
          if (data.email) setEmail(data.email);
          setStep('profile');
        }
      }
    } catch (e) {
      console.error('Erro ao verificar perfil:', e);
      setStep('profile');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      // Buscar respondente pelo email e código
      const respondentsQuery = query(
        collection(db, 'respondents'),
        where('projectId', '==', projectId),
        where('email', '==', email.toLowerCase().trim())
      );
      const snapshot = await getDocs(respondentsQuery);

      if (snapshot.empty) {
        setAuthError('Email não encontrado para este projeto. Verifique se você foi convidado.');
        setLoading(false);
        return;
      }

      const respondentDoc = snapshot.docs[0];
      const respondentData = respondentDoc.data();

      // Verificar código de acesso
      if (respondentData.accessCode !== accessCode.trim()) {
        setAuthError('Código de acesso inválido. Verifique o email de convite.');
        setLoading(false);
        return;
      }

      // Autenticação bem-sucedida
      setRespondentId(respondentDoc.id);
      localStorage.setItem(`respondentId_${projectId}`, respondentDoc.id);

      // Verificar se já tem perfil completo
      if (respondentData.perfilCompleto) {
        setStep('redirect');
        setTimeout(() => {
          window.location.href = `/avaliacao/${projectId}?token=${respondentDoc.id}`;
        }, 1500);
      } else {
        setStep('profile');
      }

    } catch (error) {
      console.error('Erro na autenticação:', error);
      setAuthError('Erro ao verificar credenciais. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validações
    if (!formData.nome.trim()) {
      setFormError('Por favor, informe seu nome.');
      return;
    }
    if (!formData.faixaIdade) {
      setFormError('Por favor, selecione sua faixa de idade.');
      return;
    }
    if (!formData.genero) {
      setFormError('Por favor, selecione seu gênero.');
      return;
    }
    if (!formData.nivelFormacao) {
      setFormError('Por favor, selecione seu nível de formação.');
      return;
    }
    if (!formData.areaFormacao) {
      setFormError('Por favor, selecione sua área de formação.');
      return;
    }
    if (formData.areaFormacao === 'outra' && !formData.areaFormacaoOutra.trim()) {
      setFormError('Por favor, especifique sua área de formação.');
      return;
    }
    if (!formData.tempoTrabalho) {
      setFormError('Por favor, selecione seu tempo de trabalho.');
      return;
    }
    if (!formData.tempoGestor) {
      setFormError('Por favor, selecione seu tempo como gestor.');
      return;
    }
    if (!formData.areaAtuacao) {
      setFormError('Por favor, selecione sua área de atuação.');
      return;
    }
    if (formData.areaAtuacao === 'outra' && !formData.areaAtuacaoOutra.trim()) {
      setFormError('Por favor, especifique sua área de atuação.');
      return;
    }
    if (!formData.funcao) {
      setFormError('Por favor, selecione sua função.');
      return;
    }

    setLoading(true);

    try {
      // Salvar perfil
      await updateDoc(doc(db, 'respondents', respondentId!), {
        nome: formData.nome.trim(),
        faixaIdade: formData.faixaIdade,
        genero: formData.genero,
        nivelFormacao: formData.nivelFormacao,
        areaFormacao: formData.areaFormacao,
        areaFormacaoOutra: formData.areaFormacaoOutra.trim(),
        tempoTrabalho: formData.tempoTrabalho,
        tempoGestor: formData.tempoGestor,
        areaAtuacao: formData.areaAtuacao,
        areaAtuacaoOutra: formData.areaAtuacaoOutra.trim(),
        funcao: formData.funcao,
        perfilCompleto: true,
        perfilPreenchidoEm: new Date().toISOString(),
      });

      // Redirecionar para avaliação
      setStep('redirect');
      setTimeout(() => {
        window.location.href = `/avaliacao/${projectId}?token=${respondentId}`;
      }, 1500);

    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      setFormError('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Tela de Autenticação
  if (step === 'auth') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Acesso à Pesquisa</h1>
            {projectName && (
              <p className="text-sm text-gray-500 mt-2">{projectName}</p>
            )}
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="seu.email@empresa.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código de Acesso</label>
              <input
                type="text"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-center text-lg tracking-widest"
                placeholder="XXXXXX"
                maxLength={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1">O código foi enviado no email de convite</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Acessar Pesquisa'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Dúvidas? Entre em contato:</p>
            <p className="text-indigo-600">pedro.palma@unesp.br</p>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Redirecionamento
  if (step === 'redirect') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Tudo certo!</h2>
          <p className="text-gray-500">Redirecionando para a avaliação...</p>
        </div>
      </div>
    );
  }

  // Tela de Perfil
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Perfil do Especialista</h1>
            <p className="text-sm text-gray-500 mt-2">
              Essas informações serão utilizadas para caracterizar os respondentes na pesquisa acadêmica.
              Seus dados são confidenciais e serão apresentados apenas de forma agregada.
            </p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {formError}
              </div>
            )}

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={e => updateField('nome', e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Seu nome completo"
              />
            </div>

            {/* Grid de 2 colunas para campos menores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Faixa de Idade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Faixa de Idade *</label>
                <select
                  value={formData.faixaIdade}
                  onChange={e => updateField('faixaIdade', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">Selecione...</option>
                  {FAIXAS_IDADE.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Gênero */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gênero *</label>
                <select
                  value={formData.genero}
                  onChange={e => updateField('genero', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="">Selecione...</option>
                  {GENEROS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Formação */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h3 className="font-medium text-gray-800">Formação Acadêmica</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nível de Formação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Formação *</label>
                  <select
                    value={formData.nivelFormacao}
                    onChange={e => updateField('nivelFormacao', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecione...</option>
                    {NIVEIS_FORMACAO.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Área de Formação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área de Formação *</label>
                  <select
                    value={formData.areaFormacao}
                    onChange={e => updateField('areaFormacao', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecione...</option>
                    {AREAS_FORMACAO.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campo "Outra" para Área de Formação */}
              {formData.areaFormacao === 'outra' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especifique a área *</label>
                  <input
                    type="text"
                    value={formData.areaFormacaoOutra}
                    onChange={e => updateField('areaFormacaoOutra', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Economia, Direito..."
                  />
                </div>
              )}
            </div>

            {/* Experiência Profissional */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h3 className="font-medium text-gray-800">Experiência Profissional</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tempo de Trabalho */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo de Trabalho *</label>
                  <select
                    value={formData.tempoTrabalho}
                    onChange={e => updateField('tempoTrabalho', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecione...</option>
                    {TEMPO_TRABALHO.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Tempo como Gestor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo como Gestor *</label>
                  <select
                    value={formData.tempoGestor}
                    onChange={e => updateField('tempoGestor', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecione...</option>
                    {TEMPO_GESTOR.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Atuação Atual */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h3 className="font-medium text-gray-800">Atuação Atual</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Área de Atuação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Área de Atuação *</label>
                  <select
                    value={formData.areaAtuacao}
                    onChange={e => updateField('areaAtuacao', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecione...</option>
                    {AREAS_ATUACAO.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Função */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Função *</label>
                  <select
                    value={formData.funcao}
                    onChange={e => updateField('funcao', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="">Selecione...</option>
                    {FUNCOES.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campo "Outra" para Área de Atuação */}
              {formData.areaAtuacao === 'outra' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especifique a área *</label>
                  <input
                    type="text"
                    value={formData.areaAtuacaoOutra}
                    onChange={e => updateField('areaAtuacaoOutra', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Ex: Recursos Humanos, Finanças..."
                  />
                </div>
              )}
            </div>

            {/* Aviso de privacidade */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium">Sobre seus dados</p>
                  <p className="mt-1 text-blue-700">
                    Suas informações serão utilizadas exclusivamente para fins acadêmicos. 
                    Os resultados serão apresentados de forma agregada, sem identificação individual.
                    Esta pesquisa segue as diretrizes éticas para pesquisas com seres humanos.
                  </p>
                </div>
              </div>
            </div>

            {/* Botão de envio */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 text-lg"
            >
              {loading ? 'Salvando...' : 'Continuar para Avaliação →'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Dúvidas? pedro.palma@unesp.br</p>
        </div>
      </div>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PerfilContent />
    </Suspense>
  );
}
