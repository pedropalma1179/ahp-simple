// app/decisor/projetos/page.tsx
// VERSÃO v6 - Interface Simplificada e Organizada
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, 
  query, orderBy, where, writeBatch 
} from 'firebase/firestore';
import { Project, Alternative, Respondent } from '@/lib/data';

const generateAccessCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export default function ProjetosPage() {
  const [projects, setProjects] = useState<(Project & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectRespondents, setProjectRespondents] = useState<Record<string, (Respondent & { id: string })[]>>({});
  const [projectResponses, setProjectResponses] = useState<Record<string, number>>({});
  
  // Modais
  const [editingProject, setEditingProject] = useState<(Project & { id: string }) | null>(null);
  const [managingProject, setManagingProject] = useState<(Project & { id: string }) | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  
  // Cálculo
  const [calculating, setCalculating] = useState(false);
  const [calculateResult, setCalculateResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const auth = sessionStorage.getItem('isAuthenticated');
    if (auth !== 'true') window.location.href = '/';
  }, []);

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const projectList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Project & { id: string })[];
      setProjects(projectList);

      const respondentsMap: Record<string, (Respondent & { id: string })[]> = {};
      const responsesCountMap: Record<string, number> = {};
      
      for (const project of projectList) {
        const respondentsQuery = query(collection(db, 'respondents'), where('projectId', '==', project.id));
        const respondentsSnapshot = await getDocs(respondentsQuery);
        respondentsMap[project.id] = respondentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as (Respondent & { id: string })[];
        
        const responsesQuery = query(collection(db, 'responses'), where('projectId', '==', project.id));
        const responsesSnapshot = await getDocs(responsesQuery);
        // Contar apenas respostas completas
        responsesCountMap[project.id] = responsesSnapshot.docs.filter(d => d.data().completedAt).length;
      }
      
      setProjectRespondents(respondentsMap);
      setProjectResponses(responsesCountMap);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    // Limpa todo o estado de autenticação
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('userRole');
    localStorage.removeItem('decisorAuth'); // Legacy cleanup
    // Redireciona para a nova tela de login (home)
    // Usa window.location para limpar completamente a pilha de navegação
    window.location.href = '/';
  };

  const handleCalculate = async (projectId: string) => {
    setCalculating(true);
    setCalculateResult(null);
    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await response.json();
      if (data.success) {
        setCalculateResult({ type: 'success', text: data.message });
      } else {
        setCalculateResult({ type: 'error', text: data.error });
      }
    } catch (error: any) {
      setCalculateResult({ type: 'error', text: error.message });
    } finally {
      setCalculating(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
      active: { label: 'Ativo', color: 'bg-green-100 text-green-700' },
      closed: { label: 'Encerrado', color: 'bg-red-100 text-red-700' }
    };
    return map[status] || map.draft;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">🎯 Painel do Decisor</h1>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Sair</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Título e Botões */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Meus Projetos</h2>
            <p className="text-gray-500 text-sm">Gerencie suas pesquisas AHP-BOCR</p>
          </div>
          <div className="flex gap-3">
            <a 
              href="/decisor/simulacao"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center gap-2"
            >
              🧪 Simulação
            </a>
            <button 
              onClick={() => setShowNewProject(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              + Novo Projeto
            </button>
          </div>
        </div>

        {/* Lista de Projetos */}
        {projects.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhum projeto ainda</h3>
            <p className="text-gray-500 mb-6">Crie seu primeiro projeto de pesquisa AHP-BOCR</p>
            <button 
              onClick={() => setShowNewProject(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              Criar Projeto
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map(project => {
              const respondents = projectRespondents[project.id] || [];
              const completedCount = respondents.filter(r => r.completedAt || r.status === 'completed').length;
              const statusInfo = getStatusInfo(project.status);
              
              return (
                <div key={project.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">{project.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-gray-500 text-sm mb-3 line-clamp-1">{project.description}</p>
                      )}
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>📊 {project.alternatives?.length || 0} alternativas</span>
                        <span>👥 {respondents.length} especialistas</span>
                        <span className="text-green-600 font-medium">✅ {completedCount} respostas</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setManagingProject(project)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                      >
                        👥 Gerenciar
                      </button>
                      <button
                        onClick={() => setEditingProject(project)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                      >
                        ✏️ Editar
                      </button>
                      <a
                        href={`/decisor/resultados/${project.id}`}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                      >
                        📈 Resultados
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal: Novo/Editar Projeto */}
      {(showNewProject || editingProject) && (
        <EditProjectModal
          project={editingProject}
          existingRespondents={editingProject ? (projectRespondents[editingProject.id] || []) : []}
          onClose={() => { setShowNewProject(false); setEditingProject(null); }}
          onSave={async (data, newEmails, deletedRespondentIds) => {
            if (editingProject) {
              // Atualizar projeto existente
              await updateDoc(doc(db, 'projects', editingProject.id), { ...data, updatedAt: new Date().toISOString() });
              
              // Adicionar novos emails
              for (const email of newEmails) {
                await addDoc(collection(db, 'respondents'), {
                  projectId: editingProject.id,
                  email,
                  accessCode: generateAccessCode(),
                  status: 'pending',
                  createdAt: new Date().toISOString()
                });
              }
              
              // Remover especialistas deletados
              for (const id of deletedRespondentIds) {
                await deleteDoc(doc(db, 'respondents', id));
              }
            } else {
              // Criar novo projeto
              const projectRef = await addDoc(collection(db, 'projects'), {
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              
              // Adicionar emails
              for (const email of newEmails) {
                await addDoc(collection(db, 'respondents'), {
                  projectId: projectRef.id,
                  email,
                  accessCode: generateAccessCode(),
                  status: 'pending',
                  createdAt: new Date().toISOString()
                });
              }
            }
            
            setShowNewProject(false);
            setEditingProject(null);
            loadProjects();
          }}
          onDelete={editingProject ? async () => {
            if (!confirm('Excluir este projeto e todos os dados? Esta ação é irreversível.')) return;
            
            const batch = writeBatch(db);
            
            // Deletar respondentes
            const respQuery = query(collection(db, 'respondents'), where('projectId', '==', editingProject.id));
            const respDocs = await getDocs(respQuery);
            respDocs.docs.forEach(d => batch.delete(d.ref));
            
            // Deletar respostas
            const answersQuery = query(collection(db, 'responses'), where('projectId', '==', editingProject.id));
            const answersDocs = await getDocs(answersQuery);
            answersDocs.docs.forEach(d => batch.delete(d.ref));
            
            // Deletar cálculos
            try {
              batch.delete(doc(db, 'calculations', editingProject.id));
            } catch {}
            
            // Deletar projeto
            batch.delete(doc(db, 'projects', editingProject.id));
            
            await batch.commit();
            setEditingProject(null);
            loadProjects();
          } : undefined}
        />
      )}

      {/* Modal: Gerenciar Especialistas */}
      {managingProject && (
        <ManageProjectModal
          project={managingProject}
          respondents={projectRespondents[managingProject.id] || []}
          onClose={() => { setManagingProject(null); setCalculateResult(null); }}
          onCalculate={() => handleCalculate(managingProject.id)}
          calculating={calculating}
          calculateResult={calculateResult}
          onReloadRespondents={loadProjects}
        />
      )}
    </div>
  );
}

// ============================================================
// MODAL: Editar Projeto (Dados + Alternativas + Emails)
// ============================================================
function EditProjectModal({ 
  project, 
  existingRespondents,
  onClose, 
  onSave, 
  onDelete 
}: {
  project: (Project & { id: string }) | null;
  existingRespondents: (Respondent & { id: string })[];
  onClose: () => void;
  onSave: (data: Partial<Project>, newEmails: string[], deletedRespondentIds: string[]) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(project?.name || '');
  const [description, setDescription] = useState(project?.description || '');
  const [status, setStatus] = useState<'draft' | 'active' | 'closed'>(project?.status || 'draft');
  const [alternatives, setAlternatives] = useState<Alternative[]>(
    project?.alternatives || [
      { code: 'A1', name: '', description: '' },
      { code: 'A2', name: '', description: '' }
    ]
  );
  const [emails, setEmails] = useState<string[]>(existingRespondents.map(r => r.email));
  const [deletedRespondentIds, setDeletedRespondentIds] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'alternatives' | 'respondents'>('info');

  const originalEmails = existingRespondents.map(r => r.email);
  const newEmails = emails.filter(e => !originalEmails.includes(e));

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido');
      return;
    }
    if (emails.includes(email)) {
      setError('Email já adicionado');
      return;
    }
    setEmails([...emails, email]);
    setNewEmail('');
    setError('');
  };

  const removeEmail = (email: string) => {
    const respondent = existingRespondents.find(r => r.email === email);
    if (respondent) {
      // É um respondente existente - marcar para deleção
      if (respondent.completedAt || respondent.status === 'completed') {
        if (!confirm(`${email} já respondeu a pesquisa. Excluir mesmo assim?`)) return;
      }
      setDeletedRespondentIds([...deletedRespondentIds, respondent.id]);
    }
    setEmails(emails.filter(e => e !== email));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    const validAlts = alternatives.filter(a => a.name.trim());
    if (validAlts.length < 2) {
      setError('Mínimo 2 alternativas com nome');
      return;
    }
    
    setSaving(true);
    try {
      await onSave(
        { name: name.trim(), description: description.trim(), status, alternatives: validAlts },
        newEmails,
        deletedRespondentIds
      );
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {project ? 'Editar Projeto' : 'Novo Projeto'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          {[
            { id: 'info', label: '📋 Informações' },
            { id: 'alternatives', label: '🎯 Alternativas' },
            { id: 'respondents', label: '👥 Especialistas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Informações */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Projeto *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Avaliação de Investimentos I4.0"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descreva brevemente o objetivo da pesquisa..."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as 'draft' | 'active' | 'closed')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="draft">Rascunho (não aceita respostas)</option>
                  <option value="active">Ativo (aceitando respostas)</option>
                  <option value="closed">Encerrado (não aceita mais)</option>
                </select>
              </div>
            </div>
          )}

          {/* Tab: Alternativas */}
          {activeTab === 'alternatives' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Defina as alternativas que serão comparadas pelos especialistas (mínimo 2).
              </p>
              
              {alternatives.map((alt, idx) => (
                <div key={idx} className="flex gap-3 items-start bg-gray-50 p-4 rounded-lg">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold shrink-0">
                    {alt.code}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={alt.name}
                      onChange={e => {
                        const newAlts = [...alternatives];
                        newAlts[idx].name = e.target.value;
                        setAlternatives(newAlts);
                      }}
                      placeholder="Nome da alternativa *"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      value={alt.description}
                      onChange={e => {
                        const newAlts = [...alternatives];
                        newAlts[idx].description = e.target.value;
                        setAlternatives(newAlts);
                      }}
                      placeholder="Descrição (opcional)"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  {alternatives.length > 2 && (
                    <button
                      onClick={() => setAlternatives(alternatives.filter((_, i) => i !== idx))}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}

              {alternatives.length < 10 && (
                <button
                  onClick={() => setAlternatives([
                    ...alternatives,
                    { code: `A${alternatives.length + 1}`, name: '', description: '' }
                  ])}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  + Adicionar Alternativa
                </button>
              )}
            </div>
          )}

          {/* Tab: Especialistas */}
          {activeTab === 'respondents' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Adicione os emails dos especialistas que participarão da pesquisa.
              </p>

              {/* Adicionar email */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addEmail()}
                  placeholder="email@exemplo.com"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={addEmail}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
                >
                  Adicionar
                </button>
              </div>

              {/* Lista de emails */}
              {emails.length > 0 ? (
                <div className="space-y-2">
                  {emails.map(email => {
                    const respondent = existingRespondents.find(r => r.email === email);
                    const isNew = !respondent;
                    const isCompleted = respondent?.completedAt || respondent?.status === 'completed';
                    
                    return (
                      <div key={email} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-700">{email}</span>
                          {isNew && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Novo</span>
                          )}
                          {isCompleted && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">✓ Respondeu</span>
                          )}
                        </div>
                        <button
                          onClick={() => removeEmail(email)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  Nenhum especialista adicionado
                </div>
              )}

              <p className="text-xs text-gray-400">
                💡 Você poderá enviar os convites após salvar o projeto.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between">
          <div>
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
              >
                🗑️ Excluir Projeto
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {error && <span className="text-red-500 text-sm self-center">{error}</span>}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: Gerenciar Projeto (Convites + Cálculo)
// ============================================================
function ManageProjectModal({
  project,
  respondents,
  onClose,
  onCalculate,
  calculating,
  calculateResult,
  onReloadRespondents
}: {
  project: Project & { id: string };
  respondents: (Respondent & { id: string })[];
  onClose: () => void;
  onCalculate: () => void;
  calculating: boolean;
  calculateResult: { type: 'success' | 'error'; text: string } | null;
  onReloadRespondents: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const completedCount = respondents.filter(r => r.completedAt || r.status === 'completed').length;
  const inProgressCount = respondents.filter(r => 
    (r.startedAt || r.status === 'in_progress') && 
    !r.completedAt && r.status !== 'completed'
  ).length;
  const pendingCount = respondents.length - completedCount - inProgressCount;

  const surveyLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/avaliacao/${project.id}` 
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(surveyLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyInvite = (respondent: Respondent & { id: string }) => {
    const text = `Olá! Você foi convidado(a) para participar da pesquisa "${project.name}".

📋 Link: ${surveyLink}
🔑 Código de acesso: ${respondent.accessCode}

Obrigado pela participação!`;
    
    navigator.clipboard.writeText(text);
    setCopiedId(respondent.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetRespondent = async (respondent: Respondent & { id: string }) => {
    if (!confirm(`Resetar as respostas de ${respondent.email}? Isso apagará todos os dados.`)) return;
    
    setActionLoading(respondent.id);
    try {
      const batch = writeBatch(db);
      
      // Deletar respostas
      const responsesQuery = query(
        collection(db, 'responses'),
        where('projectId', '==', project.id),
        where('respondentId', '==', respondent.id)
      );
      const responsesSnapshot = await getDocs(responsesQuery);
      responsesSnapshot.docs.forEach(d => batch.delete(d.ref));
      
      // Resetar status
      batch.update(doc(db, 'respondents', respondent.id), {
        status: 'pending',
        startedAt: null,
        completedAt: null,
        progress: 0
      });
      
      await batch.commit();
      onReloadRespondents();
    } catch (error) {
      console.error('Erro ao resetar:', error);
      alert('Erro ao resetar respostas');
    } finally {
      setActionLoading(null);
    }
  };

  const getRespondentStatus = (r: Respondent & { id: string }) => {
    if (r.completedAt || r.status === 'completed') {
      return { label: 'Concluído', color: 'bg-green-100 text-green-700', icon: '✅' };
    }
    if (r.startedAt || r.status === 'in_progress') {
      return { label: 'Em andamento', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' };
    }
    return { label: 'Pendente', color: 'bg-gray-100 text-gray-600', icon: '⏸️' };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Gerenciar Coleta</h2>
              <p className="text-gray-500 text-sm">{project.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{respondents.length}</div>
              <div className="text-xs text-blue-700">Total</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{pendingCount}</div>
              <div className="text-xs text-gray-700">Pendentes</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
              <div className="text-xs text-yellow-700">Em andamento</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-xs text-green-700">Concluídos</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Link da Pesquisa */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-indigo-800 text-sm mb-1">🔗 Link da Pesquisa</h3>
                <p className="text-sm text-indigo-600 font-mono truncate">{surveyLink}</p>
              </div>
              <button
                onClick={copyLink}
                className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${
                  copiedLink
                    ? 'bg-green-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {copiedLink ? '✓ Copiado!' : '📋 Copiar'}
              </button>
            </div>
          </div>

          {/* Lista de Especialistas */}
          <h3 className="font-semibold text-gray-700 mb-3">👥 Especialistas ({respondents.length})</h3>
          
          {respondents.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
              Nenhum especialista cadastrado. Use "Editar" para adicionar.
            </div>
          ) : (
            <div className="space-y-2">
              {respondents.map(respondent => {
                const status = getRespondentStatus(respondent);
                const isLoading = actionLoading === respondent.id;
                
                return (
                  <div key={respondent.id} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                      <span className="text-sm text-gray-700 truncate">{respondent.email}</span>
                      <span className="text-xs text-gray-400 font-mono">#{respondent.accessCode}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => copyInvite(respondent)}
                        className={`px-3 py-1.5 rounded text-xs font-medium ${
                          copiedId === respondent.id
                            ? 'bg-green-500 text-white'
                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                        }`}
                      >
                        {copiedId === respondent.id ? '✓' : '📋 Convite'}
                      </button>
                      {(respondent.completedAt || respondent.status === 'completed' || respondent.startedAt) && (
                        <button
                          onClick={() => resetRespondent(respondent)}
                          disabled={isLoading}
                          className="px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium disabled:opacity-50"
                        >
                          {isLoading ? '...' : '🔄'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Dica */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              💡 <strong>Como enviar convites:</strong> Clique em "📋 Convite" ao lado do especialista, 
              depois cole a mensagem no WhatsApp ou Email.
            </p>
          </div>
        </div>

        {/* Footer com Cálculo */}
        <div className="p-6 border-t bg-gray-50">
          {calculateResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              calculateResult.type === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {calculateResult.type === 'success' ? '✅' : '❌'} {calculateResult.text}
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={onCalculate}
                disabled={calculating || completedCount === 0}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  calculating || completedCount === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {calculating ? '⏳ Calculando...' : '🧮 Calcular Resultados'}
              </button>
              <a
                href={`/decisor/resultados/${project.id}`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
              >
                📈 Ver Resultados
              </a>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
