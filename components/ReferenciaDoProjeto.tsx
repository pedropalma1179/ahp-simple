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
import {
  type ConsultaDaApresentacao,
  type OrdemDeCliques,
  acompanharLeitura,
  carregarReferenciaAtual,
  criarOrdemDeCliques,
  enviarEscolhaDaReferencia,
  exibirExecucaoDaLista,
} from '@/lib/fluxos-da-referencia';

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
  /**
   * F07 A6, V5: a apresentação CORRENTE da tela, só para consulta (o par e a conferência). É o registro da
   * PÁGINA, que sobrevive ao desmonte deste painel (o recálculo troca a página pelo indicador de carga). Uma leitura
   * iniciada por «Exibir» ou «Carregar a referência atual» que volta depois de a tela apresentar outra coisa por
   * qualquer caminho não apresenta, não avisa e não avança a revisão. Interface nova do componente.
   */
  registroDaApresentacao: ConsultaDaApresentacao;
}

export default function ReferenciaDoProjeto({
  projectId, updatedAtDoProjeto, inicial, exibicao, calculation, execucaoRecemCalculada, onExibir, registroDaApresentacao,
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
  // F07 A5, ponto 4: "Exibir" e "Carregar a referência atual" leem o documento (`await`) antes de apresentá-lo. Se
  // a pessoa clica em outra execução enquanto a primeira leitura está em voo, a leitura mais lenta não pode
  // definir o que fica na tela: o ÚLTIMO clique vence. A ordem está num `useRef` (e não em estado) para que o
  // bilhete pego no clique seja conferido contra a ordem de AGORA quando a leitura voltar.
  const ordemDeCliquesRef = useRef<OrdemDeCliques | null>(null);
  if (ordemDeCliquesRef.current === null) ordemDeCliquesRef.current = criarOrdemDeCliques();
  const ordemDeCliques = ordemDeCliquesRef.current;
  // F07 A6, V5: esta INSTÂNCIA ainda está montada? A ordem de cliques acima vive neste painel e é recriada no
  // remonte; o fecho de uma leitura iniciada antes do desmonte continua vendo a ordem ANTIGA, onde o seu bilhete
  // segue sendo o mais novo. O desmonte acontece quando a página troca o painel pelo indicador de carga (o
  // recálculo liga `loading`), e vem ANTES de a apresentação nova avançar; o retorno de uma instância desmontada
  // é inerte de todo modo. ⚠ LIMITE: entre o pedido de desmonte e o commit do React a referência ainda diz
  // «montada»; começa em `true` porque um clique não acontece antes de o painel existir.
  const montadaRef = useRef(true);
  useEffect(() => {
    montadaRef.current = true;
    return () => { montadaRef.current = false; };
  }, []);
  // F07 A5, ponto 1: a escolha confirmada só avança a revisão carregada se a execução da referência devolvida é a
  // que a tela apresenta NO RETORNO do envio. A propriedade `exibicao` que o manipulador `escolher` capturou
  // quando o pedido começou é a do INÍCIO, e conferi-la reintroduz o defeito em miniatura. Esta referência é
  // atualizada a cada renderização, e `exibicaoVigente` a lê depois do `await`.
  // ⚠ LIMITE DA LIGAÇÃO (declarado): a atribuição no corpo da renderização evita o atraso de um `useEffect`, mas
  // não é garantia absoluta. Renderização e apresentação confirmada (commit) pelo React são momentos distintos, e a
  // referência pode ficar ADIANTE do que foi comprometido (uma renderização descartada); e fica ATRÁS de um
  // `setExibicao` já pedido e ainda não renderizado. O mesmo dispositivo (`retomadaRef`) é usado na página.
  const exibicaoVigenteRef = useRef<Exibicao | null>(exibicao);
  exibicaoVigenteRef.current = exibicao;

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

  /**
   * F07 A5, ponto 5: o clique em "Exibir". A leitura que lança vira aviso (a exceção não escapa do
   * manipulador) e a tela não muda; o caso `null` mantém o aviso de antes, e os dois são distinguíveis
   * (ver `lib/fluxos-da-referencia.ts`). O caminho de "Carregar a referência atual" é `carregarReferencia`.
   */
  const exibir = async (executionId: string) => {
    const bilhete = ordemDeCliques.novo(); // NO CLIQUE, antes de qualquer `await`
    const leitura = acompanharLeitura({ montada: () => montadaRef.current, apresentacao: registroDaApresentacao }); // F07 A6, V5: o par de AGORA
    await exibirExecucaoDaLista({
      executionId,
      acoes: {
        lerExecucao: obterDocumento,
        apresentar: documento => { onExibir(documento); },
        acrescentarAviso: texto => setAvisos(a => [...a, texto]),
        vigente: () => ordemDeCliques.vigente(bilhete),
        interrompida: leitura.interrompida,
      },
    });
  };

  /**
   * F07 A5, ponto 1: o envio da escolha e a aplicação da resposta moram em `lib/fluxos-da-referencia.ts`
   * (`enviarEscolhaDaReferencia`). A revisão carregada só avança se a execução da referência devolvida é a que a
   * tela apresenta NO RETORNO (`exibicaoVigente`, lida depois do `await`); do contrário, o painel passa a SABER a
   * referência (como no caminho recusado) e a revisão carregada permanece.
   */
  const escolher = async (executionId: string, justificativa: string) => {
    await enviarEscolhaDaReferencia({
      executionId,
      justificativa,
      referenciaCarregada,
      acoes: {
        enviar: parametros => executarEscolha(dependenciasDoNavegador(), { projectId, ...parametros }),
        setEscolha,
        atualizarReferenciaConhecida: setReferencia,
        avancarReferenciaCarregada: setReferenciaCarregada,
        acrescentarEventoAoHistorico: evento => setHistorico(h => [evento, ...h.filter(x => x.operationId !== evento.operationId)]),
        exibicaoVigente: () => exibicaoVigenteRef.current,
      },
    });
  };

  /**
   * F07 A4, item 3: a revisão carregada SÓ avança depois de a execução ser apresentada. Falha na leitura
   * (`null` ou exceção) mantém a revisão, mantém o aviso de mudança e avisa que a referência não pôde
   * ser carregada (ver `lib/fluxos-da-referencia.ts`). A exceção não escapa daqui.
   */
  const carregarReferencia = async () => {
    const bilhete = ordemDeCliques.novo(); // NO CLIQUE, antes de qualquer `await` (a mesma ordem de "Exibir")
    const leitura = acompanharLeitura({ montada: () => montadaRef.current, apresentacao: registroDaApresentacao }); // F07 A6, V5
    await carregarReferenciaAtual({
      referencia,
      revisaoCarregada: referenciaCarregada?.revision ?? null,
      acoes: {
        lerExecucao: obterDocumento,
        apresentar: documento => { onExibir(documento); },
        avancarReferenciaCarregada: setReferenciaCarregada,
        acrescentarAviso: texto => setAvisos(a => (a.includes(texto) ? a : [...a, texto])),
        vigente: () => ordemDeCliques.vigente(bilhete),
        interrompida: leitura.interrompida,
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
