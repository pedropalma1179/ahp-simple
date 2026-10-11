'use client';

/**
 * components/PainelDaReferencia.tsx
 *
 * F07, A2: o painel da REFERÊNCIA do projeto. É PURAMENTE APRESENTACIONAL: recebe tudo por
 * propriedade e não importa Firestore, de modo que o teste o renderiza (`renderToStaticMarkup`) sem
 * simular banco. Quem lê o banco, assina mudanças e envia a escolha é `ReferenciaDoProjeto.tsx`.
 *
 * O que o painel SEMPRE mostra:
 *   - o estado da apresentação, por NOME (referência escolhida; resultado anterior sem referência
 *     escolhida; outra execução), com a frase que o explica;
 *   - a atualidade em relação ao projeto, em um dos quatro estados, com o limite do marcador;
 *   - o limite da autoria: a escolha NÃO é autenticada;
 *   - cada campo de identificação da execução, ou a palavra "ausente".
 *
 * ⚠ O painel NÃO troca sozinho o que a tela exibe. Quando a referência muda com a tela aberta, ele
 * avisa e oferece o botão; só o clique carrega a referência nova.
 */

import React, { useState } from 'react';
import {
  type Apresentacao,
  type Atualidade,
  type EstadoDaApresentacao,
  type MudancaDeReferencia,
  type ReferenciaDoProjeto,
  type RegistroDeEscolha,
  type ResumoDeExecucao,
  TEXTO_DE_AUTORIA,
  comoTexto,
} from '@/lib/referencia-do-projeto';

export const ROTULO_DO_ESTADO: Record<EstadoDaApresentacao, string> = {
  'referencia-escolhida': 'Referência escolhida',
  'resultado-anterior-sem-referencia': 'Resultado anterior, sem referência escolhida',
  'outra-execucao': 'Exibindo outra execução',
};

export interface EstadoDaEscolha {
  emAndamento: boolean;
  mensagem: string | null;
  tipo: 'sucesso' | 'erro' | 'aviso' | null;
}

export interface PainelDaReferenciaProps {
  apresentacao: Apresentacao;
  atualidade: Atualidade;
  /** A referência corrente conhecida pela tela (`null`: o projeto não tem). */
  referencia: ReferenciaDoProjeto | null;
  execucoes: ResumoDeExecucao[];
  historico: RegistroDeEscolha[];
  /** A execução exibida agora (`null` quando é o documento anterior a F07). */
  exibidaId: string | null;
  avisos?: string[];
  mudanca?: MudancaDeReferencia | null;
  escolha?: EstadoDaEscolha;
  /** `true` enquanto a tela consulta escolhas pendentes: nenhuma ação nova é liberada. */
  consultandoPendentes?: boolean;
  onExibir?: (executionId: string) => void;
  onEscolher?: (executionId: string, justificativa: string) => void;
  onCarregarReferencia?: () => void;
}

const CORES_DO_ESTADO: Record<EstadoDaApresentacao, string> = {
  'referencia-escolhida': 'bg-emerald-50 border-emerald-300 text-emerald-900',
  'resultado-anterior-sem-referencia': 'bg-amber-50 border-amber-300 text-amber-900',
  'outra-execucao': 'bg-sky-50 border-sky-300 text-sky-900',
};

export default function PainelDaReferencia(props: PainelDaReferenciaProps) {
  const {
    apresentacao, atualidade, referencia, execucoes, historico, exibidaId,
    avisos = [], mudanca = null, escolha, consultandoPendentes = false,
    onExibir, onEscolher, onCarregarReferencia,
  } = props;
  const [alvo, setAlvo] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const ocupado = consultandoPendentes || escolha?.emAndamento === true;

  return (
    <section aria-label="Referência do projeto" className="max-w-7xl mx-auto px-4 mt-4">
      <div className="bg-white border rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Referência e execuções do projeto</h2>

        <div data-estado={apresentacao.estado} className={`border rounded-lg p-3 ${CORES_DO_ESTADO[apresentacao.estado]}`}>
          <p className="font-semibold">{ROTULO_DO_ESTADO[apresentacao.estado]}</p>
          <p className="text-sm">{apresentacao.texto}</p>
        </div>

        {mudanca?.mudou ? (
          <div role="alert" data-aviso="referencia-mudou" className="border border-red-300 bg-red-50 text-red-900 rounded-lg p-3 text-sm">
            <p>{mudanca.texto}</p>
            {onCarregarReferencia && (
              <button type="button" onClick={onCarregarReferencia} disabled={ocupado} className="mt-2 underline">
                Carregar a referência atual
              </button>
            )}
          </div>
        ) : null}

        {avisos.map((a, i) => (
          <p key={i} data-aviso="geral" className="text-sm border border-amber-200 bg-amber-50 text-amber-900 rounded-lg p-2">{a}</p>
        ))}

        <div data-atualidade={atualidade.estado} className="text-sm text-gray-800">
          <p>
            <strong>Atualidade em relação ao projeto:</strong> {atualidade.texto}
          </p>
          <p className="text-xs text-gray-600">{atualidade.limite}</p>
        </div>

        {referencia ? (
          <div className="text-sm text-gray-800">
            <p>
              <strong>Referência corrente:</strong> execução {referencia.executionId}, revisão {referencia.revision}, escolhida em {referencia.chosenAt}.
            </p>
            <p>Justificativa: {referencia.justification}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-800"><strong>Referência corrente:</strong> o projeto não tem referência escolhida.</p>
        )}

        <p data-limite="autoria" className="text-xs text-gray-700 border-l-4 border-gray-300 pl-2">{TEXTO_DE_AUTORIA}</p>

        {escolha?.mensagem ? (
          <p
            role="status"
            data-escolha={escolha.tipo ?? 'info'}
            className={`text-sm rounded-lg p-2 border ${
              escolha.tipo === 'erro' ? 'border-red-300 bg-red-50 text-red-900' : escolha.tipo === 'sucesso' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900'
            }`}
          >
            {escolha.mensagem}
          </p>
        ) : null}

        <h3 className="font-semibold text-gray-900">Execuções ({execucoes.length})</h3>
        {execucoes.length === 0 ? (
          <p className="text-sm text-gray-700">Nenhuma execução registrada para este projeto.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Calculada em</th>
                  <th className="p-2 text-left">Execução</th>
                  <th className="p-2 text-right">Respostas</th>
                  <th className="p-2 text-right">Excluídos</th>
                  <th className="p-2 text-left">Motor</th>
                  <th className="p-2 text-left">Código</th>
                  <th className="p-2 text-left">Marcador do projeto</th>
                  <th className="p-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {execucoes.map(e => {
                  const ehReferencia = referencia?.executionId === e.executionId;
                  const ehExibida = exibidaId === e.executionId;
                  return (
                    <tr key={e.executionId} data-execucao={e.executionId} className="border-t">
                      <td className="p-2">{comoTexto(e.calculatedAt)}</td>
                      <td className="p-2 font-mono">
                        {e.executionId}
                        {ehReferencia ? <span className="ml-1 font-semibold text-emerald-700"> (referência)</span> : null}
                        {ehExibida ? <span className="ml-1 font-semibold text-sky-700"> (exibida)</span> : null}
                      </td>
                      <td className="p-2 text-right">{comoTexto(e.responseCount)}</td>
                      <td className="p-2 text-right">{comoTexto(e.excludedCount)}</td>
                      <td className="p-2">{comoTexto(e.engineVersion)}</td>
                      <td className="p-2 font-mono">{comoTexto(e.codeRevision)}</td>
                      <td className="p-2">{comoTexto(e.projectUpdatedAt)}</td>
                      <td className="p-2 space-x-2">
                        <button type="button" disabled={ocupado || ehExibida} onClick={() => onExibir?.(e.executionId)} className="underline disabled:opacity-40">
                          Exibir
                        </button>
                        <button
                          type="button"
                          disabled={ocupado || ehReferencia}
                          onClick={() => { setAlvo(e.executionId); setJustificativa(''); }}
                          className="underline disabled:opacity-40"
                        >
                          Escolher como referência
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {alvo !== null ? (
          <div data-formulario="escolha" className="border rounded-lg p-3 bg-gray-50 space-y-2">
            <p className="text-sm">
              Escolher a execução <span className="font-mono">{alvo}</span> como referência do projeto.
              {referencia ? ` A referência corrente (revisão ${referencia.revision}) será substituída, e continua no histórico.` : ''}
            </p>
            <label className="block text-sm">
              Justificativa (obrigatória)
              <textarea
                className="mt-1 w-full border rounded p-2"
                rows={3}
                value={justificativa}
                onChange={ev => setJustificativa(ev.target.value)}
              />
            </label>
            <div className="space-x-2">
              <button
                type="button"
                disabled={ocupado || justificativa.trim() === ''}
                onClick={() => { onEscolher?.(alvo, justificativa); setAlvo(null); }}
                className="px-3 py-1 rounded bg-indigo-600 text-white disabled:opacity-40"
              >
                Confirmar escolha
              </button>
              <button type="button" onClick={() => setAlvo(null)} className="px-3 py-1 rounded border">Cancelar</button>
            </div>
          </div>
        ) : null}

        <h3 className="font-semibold text-gray-900">Histórico de escolhas ({historico.length})</h3>
        {historico.length === 0 ? (
          <p className="text-sm text-gray-700">Nenhuma escolha registrada.</p>
        ) : (
          <ol className="text-xs space-y-1">
            {historico.map(h => (
              <li key={h.operationId} data-revisao={h.revision} className="border-b pb-1">
                Revisão {h.revision}: execução <span className="font-mono">{h.executionId}</span>, em {h.chosenAt}. Justificativa: {h.justification}.
                {' '}Autoria: {h.authorship === 'nao-autenticada' ? 'não autenticada' : comoTexto(h.authorship)}.
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
