'use client';

/**
 * components/ReferenciaDoProjeto.tsx
 *
 * F07, A2: o CONTÊINER do painel da referência. Lê o histórico, assina a referência e o projeto
 * (para avisar de mudança com a tela aberta), consulta as escolhas que ficaram sem resposta ao montar
 * e envia a escolha. A apresentação está em `PainelDaReferencia.tsx`, e as decisões de texto e de
 * estado estão em `lib/referencia-do-projeto.ts`, que é o que os testes exercitam.
 *
 * ⚠ **Nenhuma tela é executada por teste algum.** Este arquivo é conferido por `tsc`, pelo `build` e
 * por leitura.
 *
 * ⚠ **A tela não troca sozinha o que foi apresentado.** Uma mudança na referência chega pela
 * assinatura e vira AVISO; a execução exibida só muda por clique (Exibir, ou Carregar a referência
 * atual).
 *
 * ⚠ **A escolha usa a revisão que a tela CARREGOU** (`referenciaCarregada`), e não a mais recente
 * vista pela assinatura. Se a referência mudou e a pessoa ainda não carregou a nova, o servidor
 * recusa (`referencia-mudou`), devolve a referência corrente, e nada é gravado.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PainelDaReferencia, { type EstadoDaEscolha } from '@/components/PainelDaReferencia';
import {
  type Exibicao,
  type ReferenciaDoProjeto,
  type RegistroDeEscolha,
  type ResumoDeExecucao,
  atualidadeDoProjeto,
  compararReferencia,
  estadoDaApresentacao,
  ordenarExecucoes,
  resumirExecucao,
} from '@/lib/referencia-do-projeto';
import { type ApresentacaoInicial, lerExecucao, listarHistorico } from '@/lib/referencia-leitura';
import { dependenciasDoNavegador, executarEscolha, resumirRetomada, retomarPendentes } from '@/lib/intencoes';
import { carregarReferenciaAtual } from '@/lib/fluxos-da-referencia';

interface Props {
  projectId: string;
  /** O `updatedAt` do projeto quando a tela o leu; a assinatura o mantém atual. */
  updatedAtDoProjeto: string | null;
  inicial: ApresentacaoInicial;
  exibicao: Exibicao | null;
  /** O documento exibido agora (para o marcador `projectUpdatedAt` dele). */
  calculation: Record<string, any> | null;
  /** Uma execução criada nesta tela (recálculo): entra na lista. */
  execucaoRecemCalculada?: Record<string, any> | null;
  /** Pedido de exibição de uma execução. A tela decide o que fazer com o documento. */
  onExibir: (documento: Record<string, any>) => void;
}

export default function ReferenciaDoProjeto({
  projectId, updatedAtDoProjeto, inicial, exibicao, calculation, execucaoRecemCalculada, onExibir,
}: Props) {
  const [referencia, setReferencia] = useState<ReferenciaDoProjeto | null>(inicial.referencia);
  const [referenciaCarregada, setReferenciaCarregada] = useState<ReferenciaDoProjeto | null>(inicial.referencia);
  const [resumos, setResumos] = useState<ResumoDeExecucao[]>(inicial.resumos);
  const documentos = useRef<Map<string, Record<string, any>>>(new Map(inicial.documentos));
  const [historico, setHistorico] = useState<RegistroDeEscolha[]>([]);
  const [updatedAtAtual, setUpdatedAtAtual] = useState<string | null>(updatedAtDoProjeto);
  const [avisos, setAvisos] = useState<string[]>(inicial.avisos);
  const [escolha, setEscolha] = useState<EstadoDaEscolha>({ emAndamento: false, mensagem: null, tipo: null });
  const [consultandoPendentes, setConsultandoPendentes] = useState(true);

  // O histórico, uma vez.
  useEffect(() => {
    let ativo = true;
    listarHistorico(db, projectId)
      .then(h => { if (ativo) setHistorico(h); })
      .catch(e => { if (ativo) setAvisos(a => [...a, `Não foi possível ler o histórico de escolhas: ${e?.message ?? String(e)}`]); });
    return () => { ativo = false; };
  }, [projectId]);

  // A referência e o projeto, ao vivo. ⚠ Só atualizam o que o painel SABE; não trocam o que a tela exibe.
  useEffect(() => {
    const cancelarReferencia = onSnapshot(
      doc(db, 'projectReference', projectId),
      snap => setReferencia(snap.exists() ? (snap.data() as ReferenciaDoProjeto) : null),
      () => undefined
    );
    const cancelarProjeto = onSnapshot(
      doc(db, 'projects', projectId),
      snap => {
        const u = snap.exists() ? (snap.data() as Record<string, any>).updatedAt : null;
        setUpdatedAtAtual(typeof u === 'string' ? u : null);
      },
      () => undefined
    );
    return () => { cancelarReferencia(); cancelarProjeto(); };
  }, [projectId]);

  // Escolhas que ficaram sem resposta (recarga, rede): consultadas ANTES de liberar nova ação.
  useEffect(() => {
    let ativo = true;
    retomarPendentes(dependenciasDoNavegador(), { tipo: 'escolha', projectId })
      .then(relato => {
        if (!ativo) return;
        const linhas = resumirRetomada(relato).linhas;
        if (linhas.length > 0) setAvisos(a => [...a, ...linhas]);
      })
      .catch(e => { if (ativo) setAvisos(a => [...a, `Não foi possível consultar as escolhas anteriores: ${e?.message ?? String(e)}`]); })
      .finally(() => { if (ativo) setConsultandoPendentes(false); });
    return () => { ativo = false; };
  }, [projectId]);

  // Uma execução criada por recálculo nesta tela entra na lista.
  useEffect(() => {
    if (!execucaoRecemCalculada || typeof execucaoRecemCalculada.executionId !== 'string') return;
    const id = execucaoRecemCalculada.executionId as string;
    documentos.current.set(id, execucaoRecemCalculada);
    setResumos(prev => (prev.some(r => r.executionId === id) ? prev : ordenarExecucoes([resumirExecucao(id, execucaoRecemCalculada), ...prev])));
  }, [execucaoRecemCalculada]);

  const apresentacao = useMemo(() => {
    const e: Exibicao = exibicao ?? { tipo: 'anterior-a-f07' };
    return estadoDaApresentacao(referencia, e);
  }, [referencia, exibicao]);

  const atualidade = useMemo(
    () => atualidadeDoProjeto(calculation?.projectUpdatedAt, updatedAtAtual, apresentacao.estado === 'referencia-escolhida' ? 'referência' : 'execução exibida'),
    [calculation, updatedAtAtual, apresentacao.estado]
  );

  const mudanca = useMemo(() => compararReferencia(referenciaCarregada, referencia), [referenciaCarregada, referencia]);

  /** O documento da execução: o que a tela já tem, ou a leitura. `null` = não existe; a leitura PODE lançar. */
  const obterDocumento = async (executionId: string): Promise<Record<string, any> | null> => {
    let documento = documentos.current.get(executionId) ?? null;
    if (documento === null) {
      documento = await lerExecucao(db, executionId);
      if (documento !== null) documentos.current.set(executionId, documento);
    }
    return documento;
  };

  const exibir = async (executionId: string) => {
    const documento = await obterDocumento(executionId);
    if (documento === null) {
      setAvisos(a => [...a, `A execução ${executionId} não foi encontrada.`]);
      return;
    }
    onExibir(documento);
  };

  const escolher = async (executionId: string, justificativa: string) => {
    setEscolha({ emAndamento: true, mensagem: null, tipo: null });
    try {
      const { desfecho, persistida } = await executarEscolha(dependenciasDoNavegador(), {
        projectId,
        executionId,
        expectedRevision: referenciaCarregada?.revision ?? 0,
        justification: justificativa,
      });
      const aviso = persistida ? '' : ' Aviso: o armazenamento do navegador não está disponível, e uma recarga durante o envio não permitiria recuperar este pedido.';
      if (desfecho.situacao === 'confirmada') {
        const corpo = desfecho.resposta.corpo;
        setReferencia(corpo.referencia ?? null);
        setReferenciaCarregada(corpo.referencia ?? null);
        if (corpo.evento && !corpo.recuperada) setHistorico(h => [corpo.evento, ...h.filter(x => x.operationId !== corpo.evento.operationId)]);
        setEscolha({
          emAndamento: false,
          tipo: 'sucesso',
          mensagem: `Referência escolhida: revisão ${corpo.referencia?.revision ?? '?'}, execução ${executionId}.${aviso}`,
        });
      } else if (desfecho.situacao === 'recusada') {
        const corpo = desfecho.resposta.corpo;
        // O servidor devolve a referência corrente: o painel passa a sabê-la, mas NÃO a "carrega".
        if ('referencia' in corpo) setReferencia(corpo.referencia ?? null);
        setEscolha({ emAndamento: false, tipo: 'erro', mensagem: `Nada foi gravado. ${corpo.error ?? `Pedido recusado (status ${desfecho.resposta.status}).`}` });
      } else {
        setEscolha({
          emAndamento: false,
          tipo: 'aviso',
          mensagem: `Sem confirmação do servidor (${desfecho.motivo}). A escolha permanece guardada neste navegador e será consultada ao reabrir esta tela.${aviso}`,
        });
      }
    } catch (e: any) {
      setEscolha({ emAndamento: false, tipo: 'erro', mensagem: e?.message ?? String(e) });
    }
  };

  /**
   * F07 A4, item 3: a revisão carregada SÓ avança depois de a execução ser apresentada. Falha na leitura
   * (`null` ou exceção) mantém a revisão, mantém o aviso de mudança e avisa que a referência não pôde
   * ser carregada (ver `lib/fluxos-da-referencia.ts`). A exceção não escapa daqui.
   */
  const carregarReferencia = async () => {
    await carregarReferenciaAtual({
      referencia,
      revisaoCarregada: referenciaCarregada?.revision ?? null,
      acoes: {
        lerExecucao: obterDocumento,
        apresentar: documento => { onExibir(documento); },
        avancarReferenciaCarregada: setReferenciaCarregada,
        acrescentarAviso: texto => setAvisos(a => (a.includes(texto) ? a : [...a, texto])),
      },
    });
  };

  return (
    <PainelDaReferencia
      apresentacao={apresentacao}
      atualidade={atualidade}
      referencia={referencia}
      execucoes={resumos}
      historico={historico}
      exibidaId={exibicao?.tipo === 'execucao' ? exibicao.executionId : null}
      avisos={avisos}
      mudanca={mudanca}
      escolha={escolha}
      consultandoPendentes={consultandoPendentes}
      onExibir={exibir}
      onEscolher={escolher}
      onCarregarReferencia={carregarReferencia}
    />
  );
}
