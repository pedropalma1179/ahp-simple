// app/decisor/projetos/page.tsx
// VERSÃO v7 - Correções de segurança, integridade e performance
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc,
  query, orderBy, where, writeBatch
} from 'firebase/firestore';
import { Project, Alternative, Respondent, BOCR_CRITERIA, SUBCRITERIA } from '@/lib/data';

const generateAccessCode = (existingCodes: string[] = []) => {
  // [I5] Gerar código único verificando colisões
  const usedCodes = new Set(existingCodes);
  let code: string;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (usedCodes.has(code));
  return code;
};

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

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'closed'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'progress'>('recent');

  // ---------------------------------------------------------
  // 2. useMemos (Filtragem e Ordenação)
  // ---------------------------------------------------------
  // Filtrar e ordenar projetos
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Filtro por busca
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    // Ordenação
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'progress') {
        const rateA = (projectRespondents[a.id]?.length || 0) > 0 ? (projectResponses[a.id] || 0) / (projectRespondents[a.id]?.length || 1) : 0;
        const rateB = (projectRespondents[b.id]?.length || 0) > 0 ? (projectResponses[b.id] || 0) / (projectRespondents[b.id]?.length || 1) : 0;
        return rateB - rateA;
      }
      // recent (default)
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return result;
  }, [projects, searchQuery, statusFilter, sortBy, projectRespondents, projectResponses]);

  // Contagens por status
  const statusCounts = useMemo(() => {
    const counts = { all: projects.length, active: 0, draft: 0, closed: 0 };
    projects.forEach(p => {
      if (p.status === 'active') counts.active++;
      else if (p.status === 'draft') counts.draft++;
      else if (p.status === 'closed') counts.closed++;
    });
    return counts;
  }, [projects]);

  // Toast e Confirmações
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    projectId: string;
    projectName: string;
    action: 'delete' | 'archive';
  } | null>(null);

  // [Fix] Dropdown state control
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Referência para o input de busca
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---------------------------------------------------------
  // 3. useEffects
  // ---------------------------------------------------------
  useEffect(() => {
    const auth = sessionStorage.getItem('isAuthenticated');
    if (auth !== 'true') window.location.href = '/';
  }, []);

  useEffect(() => { loadProjects(); }, []);



  // Atalho Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape limpa busca
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // ---------------------------------------------------------
  // 4. Helpers & Handlers
  // ---------------------------------------------------------
  const loadProjects = async () => {
    try {
      // [C2] Filtrar projetos por ownerId — isolamento entre decisores
      const userId = sessionStorage.getItem('userId') || 'default';
      const q = query(
        collection(db, 'projects'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const projectList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as (Project & { id: string })[];
      setProjects(projectList);

      const respondentsMap: Record<string, (Respondent & { id: string })[]> = {};
      const responsesCountMap: Record<string, number> = {};

      // [I2] Paralelizar queries — era loop sequencial N+1
      await Promise.all(projectList.map(async (project) => {
        const [respondentsSnapshot, responsesSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'respondents'), where('projectId', '==', project.id))),
          getDocs(query(collection(db, 'responses'), where('projectId', '==', project.id)))
        ]);
        respondentsMap[project.id] = respondentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as (Respondent & { id: string })[];
        // [CORREÇÃO] Contar apenas respostas que de fato foram finalizadas, ignorando autosaves
        const completedResponses = responsesSnapshot.docs.filter(d => {
          const data = d.data();
          return data.completedAt != null;
        });
        responsesCountMap[project.id] = completedResponses.length;
      }));

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

  /**
   * Formata data relativa: "há 2h", "há 3 dias", etc.
   */
  const getTimeAgo = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMin < 1) return 'Agora mesmo';
      if (diffMin < 60) return `Há ${diffMin} min`;
      if (diffHours < 24) return `Há ${diffHours}h`;
      if (diffDays < 7) return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
      if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // ---------------------------------------------------------
  // 5. Conditional Returns
  // ---------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header skeleton */}
        <header className="sticky top-0 z-50 h-14" style={{ background: 'linear-gradient(to right, #0f172a, #1e1b4b)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="h-5 w-40 bg-white/20 rounded animate-pulse"></div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Título skeleton */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-36 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>

          {/* Search skeleton */}
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse mb-4"></div>

          {/* Filter pills skeleton */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>

          {/* Card skeletons */}
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse mb-4"></div>
                <div className="flex gap-4 mb-4">
                  <div className="h-4 w-28 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 w-28 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full animate-pulse mb-4"></div>
                <div className="flex justify-between pt-3 border-t border-gray-100">
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-8 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .card-animate {
          opacity: 0;
          animation: fadeInUp 0.4s ease-out forwards;
        }
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .toast-animate {
          animation: toastSlideIn 0.3s ease-out forwards;
        }
        @keyframes summaryFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .summary-animate {
          opacity: 0;
          animation: summaryFadeIn 0.5s ease-out forwards;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: 'linear-gradient(to right, #0f172a, #1e1b4b)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo + Título */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(99,102,241,0.3))' }}>
                <span className="text-lg">🎯</span>
              </div>
              <span className="text-white font-semibold text-lg">Painel do Decisor</span>
            </div>

            {/* Ações do header */}
            <div className="flex items-center gap-4">
              {/* Simulação — discreto como link ghost */}
              <button
                onClick={() => window.location.href = '/decisor/simulacao'}
                className="text-white/60 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                Simulação
              </button>

              {/* Separador */}
              <div className="w-px h-5 bg-white/20"></div>

              {/* Sair — com ícone */}
              <button
                onClick={handleLogout}
                className="text-white/60 hover:text-red-400 text-sm flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sair
              </button>
            </div>
          </div>
        </div>

      </header>
      {/* Toast */}
      {
        toast && (
          <div className="fixed top-20 right-6 z-50 toast-animate">
            <div
              className="flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border"
              style={{
                background: toast.type === 'success' ? '#ecfdf5' : '#fef2f2',
                borderColor: toast.type === 'success' ? '#a7f3d0' : '#fecaca',
              }}
            >
              {toast.type === 'success' ? (
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              )}
              <span className={`text-sm font-medium ${toast.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
                {toast.message}
              </span>
              <button
                onClick={() => setToast(null)}
                className={`ml-2 ${toast.type === 'success' ? 'text-emerald-400 hover:text-emerald-600' : 'text-red-400 hover:text-red-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )
      }

      {/* Modal de confirmação */}
      {
        confirmModal?.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setConfirmModal(null)}
            />
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {confirmModal.action === 'delete' ? 'Excluir projeto?' : 'Arquivar projeto?'}
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                {confirmModal.action === 'delete'
                  ? `"${confirmModal.projectName}" será excluído permanentemente. Todos os dados de respostas serão perdidos.`
                  : `"${confirmModal.projectName}" será arquivado e não receberá novas respostas.`
                }
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (confirmModal.action === 'delete') {
                      // Lógica de exclusão (mesma do EditProjectModal, mas inline aqui ou reutilizando props se possível)
                      // Como a lógica de exclusão completa está dentro do EditProjectModal e não exposta aqui diretamente como função reutilizável, 
                      // e a instrução diz para "MANTER lógica existente", vamos simplificar chamando o handler se estivesse disponível.
                      // Mas o EditProjectModal é um componente que recebe onDelete.
                      // Para deletar da lista principal, precisamos reimplementar a lógica de exclusão aqui.

                      try {
                        // [C4] Chunked batch delete REIMPLANTADA AQUI para funcionar no contexto da lista
                        const projectId = confirmModal.projectId;

                        const respQuery = query(collection(db, 'respondents'), where('projectId', '==', projectId));
                        const respDocs = await getDocs(respQuery);

                        const answersQuery = query(collection(db, 'responses'), where('projectId', '==', projectId));
                        const answersDocs = await getDocs(answersQuery);

                        const allDocs = [...respDocs.docs, ...answersDocs.docs];
                        for (let i = 0; i < allDocs.length; i += 450) {
                          const chunk = allDocs.slice(i, i + 450);
                          const chunkBatch = writeBatch(db);
                          chunk.forEach(d => chunkBatch.delete(d.ref));
                          await chunkBatch.commit();
                        }

                        const finalBatch = writeBatch(db);
                        try {
                          finalBatch.delete(doc(db, 'calculations', projectId));
                        } catch { }
                        finalBatch.delete(doc(db, 'projects', projectId));
                        await finalBatch.commit();

                        showToast('Projeto removido');
                        loadProjects();
                      } catch (error) {
                        console.error(error);
                        showToast('Erro ao excluir projeto', 'error');
                      }
                    }
                    setConfirmModal(null);
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
                  style={{ background: '#ef4444' }}
                >
                  {confirmModal.action === 'delete' ? 'Excluir' : 'Arquivar'}
                </button>
              </div>
            </div>
          </div>
        )
      }

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        {/* Título + Ação primária */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Meus Projetos</h1>
              <p className="text-gray-500 text-sm mt-1">Gerencie seus projetos de decisão</p>
            </div>
            <button
              onClick={() => setShowNewProject(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-medium rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'; }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Novo Projeto
            </button>
          </div>
        </div>

        {/* Dashboard Summary */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            {[
              {
                label: 'Projetos',
                value: projects.length,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                  </svg>
                ),
                color: '#6366f1',
                bgColor: 'rgba(99, 102, 241, 0.08)',
              },
              {
                label: 'Ativos',
                value: statusCounts.active,
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                color: '#10b981',
                bgColor: 'rgba(16, 185, 129, 0.08)',
              },
              {
                label: 'Especialistas',
                value: Object.values(projectRespondents).reduce((acc, list) => acc + list.length, 0),
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 015 17.16V14.82" />
                  </svg>
                ),
                color: '#f59e0b',
                bgColor: 'rgba(245, 158, 11, 0.08)',
              },
              {
                label: 'Respostas',
                value: Object.values(projectResponses).reduce((acc, count) => acc + count, 0),
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                color: '#06b6d4',
                bgColor: 'rgba(6, 182, 212, 0.08)',
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="bg-white rounded-xl border border-gray-200 p-4 transition-all duration-300 summary-animate"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: stat.bgColor, color: stat.color }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Busca + Filtros + Ordenação */}
        <div className="mt-6 space-y-4">
          {/* Busca */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar projeto por nome..."
              className="w-full pl-12 pr-20 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {/* Hint do atalho — visível apenas quando input está vazio */}
            {!searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-400 font-mono border border-gray-200">
                  Ctrl K
                </kbd>
              </div>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filtros por status + Ordenação */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Pills de status */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {([
                { key: 'all', label: 'Todos' },
                { key: 'active', label: 'Ativos' },
                { key: 'draft', label: 'Rascunhos' },
                { key: 'closed', label: 'Encerrados' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${statusFilter === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {label}
                  <span className={`ml-1.5 text-xs ${statusFilter === key ? 'text-indigo-600' : 'text-gray-400'}`}>
                    {statusCounts[key]}
                  </span>
                </button>
              ))}
            </div>

            {/* Ordenação */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'progress')}
                className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 outline-none focus:border-indigo-400 cursor-pointer"
              >
                <option value="recent">Mais recentes</option>
                <option value="name">Nome (A-Z)</option>
                <option value="progress">Progresso</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contagem */}
        {filteredProjects.length > 0 && (
          <div className="flex items-center justify-between mt-2 mb-1">
            <p className="text-sm text-gray-400">
              {filteredProjects.length === projects.length
                ? `${projects.length} projeto${projects.length !== 1 ? 's' : ''}`
                : `${filteredProjects.length} de ${projects.length} projeto${projects.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
        )}

        {/* Estado vazio — sem projetos */}
        {filteredProjects.length === 0 && !loading && (
          <div className="text-center py-16">
            {projects.length === 0 ? (
              // Nenhum projeto criado
              <>
                <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum projeto ainda</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                  Crie seu primeiro projeto para começar a coletar avaliações dos especialistas.
                </p>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-medium rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Criar Primeiro Projeto
                </button>
              </>
            ) : (
              // Filtro/busca sem resultados
              <>
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <h3 className="text-base font-medium text-gray-600 mb-1">Nenhum projeto encontrado</h3>
                <p className="text-gray-400 text-sm">
                  {searchQuery
                    ? `Sem resultados para "${searchQuery}"`
                    : `Nenhum projeto com status "${statusFilter === 'active' ? 'Ativo' : statusFilter === 'draft' ? 'Rascunho' : 'Encerrado'}"`
                  }
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                  className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Limpar filtros
                </button>
              </>
            )}
          </div>
        )}

        {/* Lista de Projetos */}
        {/* Backdrop para fechar menu dropdown */}
        {openMenuId && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpenMenuId(null)}
          />
        )}
        {filteredProjects.length > 0 && (
          <div className="space-y-4 mt-6">
            {/* Card de Projeto */}
            {filteredProjects.map((project, index) => {
              // Calcular taxa de resposta
              const totalRespondents = projectRespondents[project.id]?.length || 0;
              const completedCount = projectResponses[project.id] || 0;
              const responseRate = totalRespondents > 0 ? Math.round((completedCount / totalRespondents) * 100) : 0;

              // Status badge config
              const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
                active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Ativo' },
                draft: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Rascunho' },
                closed: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', label: 'Encerrado' },
              };
              const status = statusConfig[project.status] || statusConfig.active;

              // CTA primário depende do status
              const primaryAction = project.status === 'draft'
                ? { label: 'Continuar', icon: '✏️', onClick: () => setEditingProject(project) }
                : { label: 'Resultados', icon: '📊', onClick: () => window.location.href = `/decisor/resultados/${project.id}` };

              // Última atividade
              const lastActivity = project.updatedAt || project.createdAt;
              const timeAgo = lastActivity ? getTimeAgo(lastActivity) : 'Data não disponível';

              return (
                <div
                  key={project.id || index}
                  className={`bg-white rounded-2xl border border-gray-200 hover:border-indigo-200 transition-all duration-200 group card-animate ${openMenuId === project.id ? 'z-20' : ''}`}
                  style={{
                    animationDelay: `${index * 0.08}s`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    position: openMenuId === project.id ? 'relative' : undefined,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08), -4px 0 0 #6366f1';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  }}
                >
                  <div className="p-5 sm:p-6">
                    {/* Linha 1: Nome + Badge + Menu */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.bg} ${status.text} ${status.border}`}>
                            {status.label}
                          </span>
                          {project.isOpen === false && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200" title="Pesquisa fechada para respostas">
                              ⛔ Fechada
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu ⋯ */}
                      <div className="relative ml-3">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </svg>
                        </button>

                        {/* Dropdown menu */}
                        {openMenuId === project.id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-30"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                setManagingProject(project);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 015 17.16V14.82a2 2 0 01.879-1.66l2.523-1.73a2 2 0 012.196 0l.39.267m.587 4.43a.75.75 0 001.65 0" />
                              </svg>
                              Gerenciar Especialistas
                            </button>
                            <button
                              onClick={() => {
                                setEditingProject(project);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                              </svg>
                              Editar Projeto
                            </button>
                            <button
                              onClick={() => {
                                window.location.href = `/decisor/resultados/${project.id}`;
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                              </svg>
                              Ver Resultados
                            </button>

                            {/* Separador */}
                            <div className="my-1 border-t border-gray-100"></div>
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  open: true,
                                  projectId: project.id,
                                  projectName: project.name,
                                  action: 'delete',
                                });
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Excluir Projeto
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Linha 2: Descrição */}
                    {project.description && (
                      <p className="text-gray-500 text-sm mb-4 line-clamp-2">{project.description}</p>
                    )}

                    {/* Linha 3: Métricas */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
                        </svg>
                        {project.alternatives?.length || 0} alternativas
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 015 17.16V14.82" />
                        </svg>
                        {totalRespondents} especialistas
                      </span>
                    </div>

                    {/* Linha 4: Progresso com mini donut */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Barra de progresso */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-gray-500">Respostas</span>
                            <span className={`font-medium ${responseRate >= 80 ? 'text-emerald-600' : responseRate >= 50 ? 'text-amber-600' : 'text-gray-500'}`}>
                              {completedCount}/{totalRespondents}
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${Math.min(responseRate, 100)}%`,
                                background: responseRate >= 80 ? '#10b981' : responseRate >= 50 ? '#f59e0b' : '#94a3b8',
                              }}
                            />
                          </div>
                        </div>

                        {/* Mini donut */}
                        <div className="flex-shrink-0 relative w-11 h-11">
                          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                            {/* Background circle */}
                            <circle
                              cx="18" cy="18" r="14"
                              fill="none"
                              stroke="#f1f5f9"
                              strokeWidth="3"
                            />
                            {/* Progress circle */}
                            <circle
                              cx="18" cy="18" r="14"
                              fill="none"
                              stroke={responseRate >= 80 ? '#10b981' : responseRate >= 50 ? '#f59e0b' : '#94a3b8'}
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeDasharray={`${responseRate * 0.88} 88`}
                              className="transition-all duration-700"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                            {responseRate}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Linha 5: Rodapé — data + CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">
                        {timeAgo}
                      </span>

                      <div className="relative group/btn">
                        <button
                          onClick={primaryAction.onClick}
                          disabled={project.status === 'active' && completedCount === 0}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5"
                          style={{
                            background: project.status === 'draft' ? '#f8fafc' : 'linear-gradient(135deg, #6366f1, #7c3aed)',
                            color: project.status === 'draft' ? '#475569' : '#ffffff',
                            border: project.status === 'draft' ? '1px solid #e2e8f0' : 'none',
                            boxShadow: project.status !== 'draft' ? '0 2px 8px rgba(99,102,241,0.25)' : 'none',
                          }}
                        >
                          <span>{primaryAction.icon}</span>
                          {primaryAction.label}
                        </button>
                        {/* Tooltip quando disabled */}
                        {project.status === 'active' && completedCount === 0 && (
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover/btn:block">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap">
                              Aguardando respostas dos especialistas
                              <div className="absolute top-full right-4 w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center pb-8">
          <p className="text-xs text-gray-400">
            UNESP · FEG · Mestrado Profissional em Engenharia de Produção
          </p>
        </div>
      </div>

      {/* Modal: Novo/Editar Projeto */}
      {
        (showNewProject || editingProject) && (
          <EditProjectModal
            project={editingProject}
            existingRespondents={editingProject ? (projectRespondents[editingProject.id] || []) : []}
            onClose={() => { setShowNewProject(false); setEditingProject(null); }}
            onSave={async (data, newEmails, deletedRespondentIds) => {
              if (editingProject) {
                // Atualizar projeto existente
                await updateDoc(doc(db, 'projects', editingProject.id), { ...data, updatedAt: new Date().toISOString() });

                // Adicionar novos emails — [I5] com códigos únicos
                const existingCodes = (projectRespondents[editingProject.id] || []).map(r => r.accessCode);
                for (const email of newEmails) {
                  const code = generateAccessCode(existingCodes);
                  existingCodes.push(code);
                  await addDoc(collection(db, 'respondents'), {
                    projectId: editingProject.id,
                    email,
                    accessCode: code,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                  });
                }

                // Remover especialistas deletados — hard delete atômico:
                // respondent + suas responses + invalidação do cache de cálculo
                if (deletedRespondentIds.length > 0) {
                  const deleteBatch = writeBatch(db);
                  for (const id of deletedRespondentIds) {
                    const responsesSnap = await getDocs(
                      query(collection(db, 'responses'), where('respondentId', '==', id))
                    );
                    responsesSnap.docs.forEach(d => deleteBatch.delete(d.ref));
                    deleteBatch.delete(doc(db, 'respondents', id));
                  }
                  // Invalida o cálculo em cache para que a próxima execução
                  // não inclua os respondentes excluídos
                  deleteBatch.delete(doc(db, 'calculations', editingProject.id));
                  await deleteBatch.commit();
                }
              } else {
                // [C1] Criar novo projeto com ownerId
                const userId = sessionStorage.getItem('userId') || 'default';
                const projectRef = await addDoc(collection(db, 'projects'), {
                  ...data,
                  ownerId: userId,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });

                // Adicionar emails — [I5] com códigos únicos
                const usedCodes: string[] = [];
                for (const email of newEmails) {
                  const code = generateAccessCode(usedCodes);
                  usedCodes.push(code);
                  await addDoc(collection(db, 'respondents'), {
                    projectId: projectRef.id,
                    email,
                    accessCode: code,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                  });
                }
              }

              setShowNewProject(false);
              setEditingProject(null);
              showToast(editingProject ? 'Projeto atualizado com sucesso' : 'Projeto criado com sucesso');
              loadProjects();
            }}
            onDelete={editingProject ? async () => {
              if (!confirm('Excluir este projeto e todos os dados? Esta ação é irreversível.')) return;

              // [C4] Chunked batch delete — Firestore limit = 500 ops/batch
              const respQuery = query(collection(db, 'respondents'), where('projectId', '==', editingProject.id));
              const respDocs = await getDocs(respQuery);

              const answersQuery = query(collection(db, 'responses'), where('projectId', '==', editingProject.id));
              const answersDocs = await getDocs(answersQuery);

              // Deletar documentos em chunks de 450
              const allDocs = [...respDocs.docs, ...answersDocs.docs];
              for (let i = 0; i < allDocs.length; i += 450) {
                const chunk = allDocs.slice(i, i + 450);
                const chunkBatch = writeBatch(db);
                chunk.forEach(d => chunkBatch.delete(d.ref));
                await chunkBatch.commit();
              }

              // Deletar cálculos e projeto em batch final
              const finalBatch = writeBatch(db);
              try {
                finalBatch.delete(doc(db, 'calculations', editingProject.id));
              } catch { }
              finalBatch.delete(doc(db, 'projects', editingProject.id));
              await finalBatch.commit();

              setEditingProject(null);
              loadProjects();
            } : undefined}
          />
        )
      }

      {/* Modal: Gerenciar Especialistas */}
      {
        managingProject && (
          <ManageProjectModal
            project={managingProject}
            respondents={projectRespondents[managingProject.id] || []}
            onClose={() => { setManagingProject(null); setCalculateResult(null); }}
            onCalculate={() => handleCalculate(managingProject.id)}
            calculating={calculating}
            calculateResult={calculateResult}
            onReloadRespondents={loadProjects}
          />
        )
      }
    </div >
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
  const [isOpen, setIsOpen] = useState<boolean>(project?.isOpen !== false); // Default true (retrocompatibilidade)
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
  // Contexto decisório
  const [objective, setObjective] = useState(project?.objective || '');
  const [timeHorizon, setTimeHorizon] = useState<'short' | 'medium' | 'long' | ''>(project?.timeHorizon || '');
  const [industrialContext, setIndustrialContext] = useState(project?.industrialContext || '');
  const [budgetReference, setBudgetReference] = useState(project?.budgetReference || '');

  const [activeTab, setActiveTab] = useState<'info' | 'context' | 'alternatives' | 'impacts' | 'respondents'>('info');

  // [I4] Normalizar emails para comparação case-insensitive
  const originalEmails = existingRespondents.map(r => r.email.toLowerCase());
  const newEmails = emails.filter(e => !originalEmails.includes(e.toLowerCase()));

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
      const hasSubmitted = respondent.completedAt || respondent.status === 'completed';
      const msg = hasSubmitted
        ? `Excluir respondente ${email}?\n\nEste especialista já submeteu julgamentos. Os dados serão permanentemente removidos e deixarão de ser utilizados nos cálculos. Esta ação é irreversível.`
        : `Excluir respondente ${email}?\n\nO acesso deste especialista à pesquisa será revogado. Esta ação é irreversível.`;
      if (!confirm(msg)) return;
      setDeletedRespondentIds([...deletedRespondentIds, respondent.id]);
    }
    setEmails(emails.filter(e => e !== email));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    const validAlts = alternatives
      .filter(a => a.name.trim())
      .map(alt => ({
        ...alt,
        description: alt.description || '',
        scope: alt.scope || null,
        trl: alt.trl || null,
        investmentRange: alt.investmentRange || null,
        timeline: alt.timeline || null,
        references: alt.references || null,
        impacts: alt.impacts || {}
      }));
    if (validAlts.length < 2) {
      setError('Mínimo 2 alternativas com nome');
      return;
    }

    if (!objective.trim()) {
      setError('Objetivo da decisão é obrigatório (aba Contexto)');
      setActiveTab('context');
      return;
    }
    if (!industrialContext.trim()) {
      setError('Contexto industrial é obrigatório (aba Contexto)');
      setActiveTab('context');
      return;
    }

    setSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          description: description.trim(),
          status,
          alternatives: validAlts,
          objective: objective.trim(),
          timeHorizon: timeHorizon || null,
          industrialContext: industrialContext.trim(),
          budgetReference: budgetReference.trim() || null,
          isOpen,
        },
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
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col mx-4">
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
            { id: 'info', label: '📋 Projeto' },
            { id: 'context', label: '🎯 Contexto' },
            { id: 'alternatives', label: '🏭 Alternativas' },
            { id: 'impacts', label: '📊 Impactos' },
            { id: 'respondents', label: '👥 Especialistas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === tab.id
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
                  onChange={e => {
                    // [I3] Confirmar antes de desativar projeto com especialistas
                    const newStatus = e.target.value as 'draft' | 'active' | 'closed';
                    if (status === 'active' && newStatus !== 'active' && existingRespondents.length > 0) {
                      const label = newStatus === 'draft' ? 'Rascunho' : 'Encerrado';
                      if (!confirm(
                        `Atenção: ${existingRespondents.length} especialista(s) cadastrado(s). ` +
                        `Mudar para "${label}" impedirá novas respostas. Continuar?`
                      )) return;
                    }
                    setStatus(newStatus);
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="draft">Rascunho (não aceita respostas)</option>
                  <option value="active">Ativo (aceitando respostas)</option>
                  <option value="closed">Encerrado (não aceita mais)</option>
                </select>
              </div>

              {/* Toggle de Abertura da Pesquisa (Novo) */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">Status da Pesquisa</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {isOpen
                        ? 'Pesquisa ABERTA: Especialistas podem acessar e responder.'
                        : 'Pesquisa FECHADA: Ninguém pode acessar, mesmo com o link.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isOpen ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isOpen ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              </div>

            </div>
          )}




          {/* Tab: Contexto Decisório */}
          {activeTab === 'context' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Informações que contextualizam a decisão para os especialistas. Quanto mais detalhado, melhores os julgamentos.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objetivo da Decisão *
                </label>
                <textarea
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  placeholder="Ex: Selecionar a tecnologia I4.0 prioritária para investimento na linha de estamparia da planta de Piracicaba, visando aumento de produtividade e redução de custos operacionais."
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horizonte Temporal
                </label>
                <select
                  value={timeHorizon}
                  onChange={e => setTimeHorizon(e.target.value as any)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecione...</option>
                  <option value="short">Curto prazo (1–2 anos)</option>
                  <option value="medium">Médio prazo (3–5 anos)</option>
                  <option value="long">Longo prazo (5–10 anos)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contexto Industrial *
                </label>
                <textarea
                  value={industrialContext}
                  onChange={e => setIndustrialContext(e.target.value)}
                  placeholder="Ex: Montadora automotiva com 2.500 funcionários, linhas de estamparia, soldagem e montagem. Produção de 150.000 veículos/ano."
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orçamento de Referência
                </label>
                <input
                  type="text"
                  value={budgetReference}
                  onChange={e => setBudgetReference(e.target.value)}
                  placeholder="Ex: R$ 5–20 milhões"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Valor aproximado para calibrar a percepção dos especialistas sobre custos.
                </p>
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

                    {/* Ficha técnica — colapsável */}
                    <details className="mt-2">
                      <summary className="text-xs text-indigo-600 cursor-pointer hover:underline">
                        ▸ Ficha técnica (opcional)
                      </summary>
                      <div className="mt-2 space-y-2 pl-1 border-l-2 border-indigo-100">
                        <input
                          type="text"
                          value={alt.scope || ''}
                          onChange={e => {
                            const newAlts = [...alternatives];
                            newAlts[idx] = { ...newAlts[idx], scope: e.target.value };
                            setAlternatives(newAlts);
                          }}
                          placeholder="Escopo: onde será implementado?"
                          className="w-full px-3 py-1.5 border rounded text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={alt.trl || ''}
                            onChange={e => {
                              const newAlts = [...alternatives];
                              newAlts[idx] = { ...newAlts[idx], trl: e.target.value ? Number(e.target.value) : null };
                              setAlternatives(newAlts);
                            }}
                            className="px-3 py-1.5 border rounded text-sm"
                          >
                            <option value="">TRL (maturidade)</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                              <option key={n} value={n}>TRL {n}</option>
                            ))}
                          </select>
                          <select
                            value={alt.timeline || ''}
                            onChange={e => {
                              const newAlts = [...alternatives];
                              newAlts[idx] = { ...newAlts[idx], timeline: e.target.value || null };
                              setAlternatives(newAlts);
                            }}
                            className="px-3 py-1.5 border rounded text-sm"
                          >
                            <option value="">Prazo de implementação</option>
                            <option value="3-6">3 a 6 meses</option>
                            <option value="6-12">6 a 12 meses</option>
                            <option value="12-24">12 a 24 meses</option>
                            <option value="24+">Mais de 24 meses</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={alt.investmentRange || ''}
                          onChange={e => {
                            const newAlts = [...alternatives];
                            newAlts[idx] = { ...newAlts[idx], investmentRange: e.target.value };
                            setAlternatives(newAlts);
                          }}
                          placeholder="Investimento estimado (ex: R$ 2M–4M)"
                          className="w-full px-3 py-1.5 border rounded text-sm"
                        />
                        <input
                          type="text"
                          value={alt.references || ''}
                          onChange={e => {
                            const newAlts = [...alternatives];
                            newAlts[idx] = { ...newAlts[idx], references: e.target.value };
                            setAlternatives(newAlts);
                          }}
                          placeholder="Referências/benchmarks (ex: Caso BMW Leipzig 2022)"
                          className="w-full px-3 py-1.5 border rounded text-sm"
                        />
                      </div>
                    </details>
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
                  onClick={() => {
                    // [I1] Gerar próximo código único (evita duplicata ao deletar e re-adicionar)
                    const existingNums = alternatives.map(a => parseInt(a.code.replace('A', '')) || 0);
                    const nextNum = Math.max(...existingNums, 0) + 1;
                    setAlternatives([
                      ...alternatives,
                      { code: `A${nextNum}`, name: '', description: '' }
                    ]);
                  }}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  + Adicionar Alternativa
                </button>
              )}
            </div>
          )}

          {/* Tab: Impactos BOCR */}
          {activeTab === 'impacts' && (
            <div className="space-y-6">
              {/* Instruções */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>📝 Descreva o impacto de cada alternativa em cada subcritério.</strong><br />
                  <span className="text-blue-600">
                    Essas descrições serão apresentadas aos especialistas durante a avaliação para fundamentar seus julgamentos.
                    Quanto mais detalhada a descrição, melhor a qualidade das respostas.
                  </span>
                </p>
              </div>

              {alternatives.filter(a => a.name.trim()).length < 2 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
                  <p>Cadastre pelo menos 2 alternativas com nome na aba "Alternativas" antes de definir impactos.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Agrupado por mérito */}
                  {[
                    { code: 'B', label: 'Benefícios', color: '#10b981', bgColor: '#ecfdf5', borderColor: '#a7f3d0' },
                    { code: 'O', label: 'Oportunidades', color: '#3b82f6', bgColor: '#eff6ff', borderColor: '#bfdbfe' },
                    { code: 'C', label: 'Custos', color: '#f59e0b', bgColor: '#fffbeb', borderColor: '#fde68a' },
                    { code: 'R', label: 'Riscos', color: '#ef4444', bgColor: '#fef2f2', borderColor: '#fecaca' },
                  ].map(merit => {
                    // Filtrar subcritérios deste mérito
                    const meritSubs = SUBCRITERIA.filter(s => s.group === merit.code || s.code.startsWith(merit.code));

                    return (
                      <div key={merit.code}>
                        {/* Header do mérito */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-white"
                            style={{ background: merit.color }}>{merit.code}</span>
                          <h4 className="text-lg font-semibold text-gray-800">{merit.label}</h4>
                        </div>

                        {/* Um card por subcritério */}
                        <div className="space-y-4">
                          {meritSubs.map(sub => (
                            <div key={sub.code} className="rounded-xl border p-4"
                              style={{ background: merit.bgColor, borderColor: merit.borderColor }}>

                              {/* Nome do subcritério */}
                              <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-0.5 rounded text-xs font-bold text-white"
                                  style={{ background: merit.color }}>{sub.code}</span>
                                <span className="text-sm font-semibold text-gray-800">{sub.name}</span>
                              </div>

                              {/* Descrição do subcritério como referência */}
                              {sub.description && (
                                <p className="text-xs text-gray-500 mb-3 italic leading-relaxed">
                                  {sub.description}
                                </p>
                              )}

                              {/* Um textarea por alternativa */}
                              <div className="space-y-3">
                                {alternatives.filter(a => a.name.trim()).map(alt => {
                                  const altIdx = alternatives.indexOf(alt);
                                  return (
                                    <div key={`${sub.code}-${alt.code}`}>
                                      <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {alt.code} — {alt.name}
                                      </label>
                                      <textarea
                                        value={alt.impacts?.[sub.code] || ''}
                                        onChange={(e) => {
                                          const newAlts = [...alternatives];
                                          if (!newAlts[altIdx].impacts) newAlts[altIdx].impacts = {};
                                          // Simplificado: direto string
                                          newAlts[altIdx].impacts![sub.code] = e.target.value;
                                          setAlternatives(newAlts);
                                        }}
                                        placeholder={`Descreva como "${alt.name}" impacta "${sub.name}"...`}
                                        rows={2}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none resize-y bg-white"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Indicador de preenchimento */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Campos preenchidos:</span>
                  <span className="font-medium">
                    {alternatives.filter(a => a.name.trim()).reduce((acc, alt) =>
                      acc + Object.values(alt.impacts || {}).filter(v => {
                        if (!v) return false;
                        if (typeof v === 'string') return v.trim().length > 0;
                        if (typeof v === 'object' && v !== null) {
                          const text = (v as any).description || (v as any).value || '';
                          return typeof text === 'string' && text.trim().length > 0;
                        }
                        return false;
                      }).length, 0
                    )} / {alternatives.filter(a => a.name.trim()).length * SUBCRITERIA.length}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  💡 Não é obrigatório preencher todos os campos, mas quanto mais completo, melhor a qualidade dos julgamentos.
                </p>
              </div>
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
                    const isCompleted = respondent?.status === 'completed' && respondent?.completedAt != null;

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

  // [CORREÇÃO] Contagem rigorosa de respondentes finalizados
  const completedCount = respondents.filter(r => r.status === 'completed' && r.completedAt != null).length;
  const inProgressCount = respondents.filter(r =>
    (r.startedAt || r.status === 'in_progress') &&
    !(r.status === 'completed' && r.completedAt != null)
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
    // [CORREÇÃO] Só é concluído se tiver status completed E timestamp não-nulo
    if (r.status === 'completed' && r.completedAt != null) {
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
                className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 ${copiedLink
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
                        className={`px-3 py-1.5 rounded text-xs font-medium ${copiedId === respondent.id
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
            <div className={`mb-4 p-3 rounded-lg text-sm ${calculateResult.type === 'success'
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
                className={`px-4 py-2 rounded-lg text-sm font-medium ${calculating || completedCount === 0
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
