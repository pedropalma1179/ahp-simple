'use client';

/**
 * components/ConfirmacaoDeRetomada.tsx
 *
 * F07, A4, item 4: a CONFIRMAÇÃO antes de reenviar um pedido de cálculo guardado no navegador. É
 * PURAMENTE APRESENTACIONAL (recebe tudo por propriedade; o teste o renderiza com
 * `renderToStaticMarkup`). O estado e o texto estão em `lib/retomada-com-confirmacao.ts`.
 *
 * ⚠ Nenhuma tela é executada por teste algum: a fiação nas duas páginas é conferida por leitura.
 *
 * ⚠ O texto diz o que o botão faz: reenviar o MESMO pedido (mesmo identificador, mesmas exclusões). Se o
 * servidor já o tinha, a execução registrada é recuperada; se nunca chegou, o cálculo usará os dados de
 * agora. A recusa NÃO apaga nada: o pedido continua guardado e continua pendente.
 */

import React from 'react';
import {
  type EstadoDaRetomada,
  linhaDaPendenciaMantida,
  textoDaConfirmacao,
} from '@/lib/retomada-com-confirmacao';

export interface ConfirmacaoDeRetomadaProps {
  estado: EstadoDaRetomada;
  /** O nome do projeto, quando a tela o conhece. */
  nomeDoProjeto?: (projectId: string) => string | null | undefined;
  onReenviar: (id: string) => void;
  onManter: (id: string) => void;
}

export default function ConfirmacaoDeRetomada({ estado, nomeDoProjeto, onReenviar, onManter }: ConfirmacaoDeRetomadaProps) {
  const visiveis = estado.pendencias.filter(p => p.situacao !== 'resolvida');
  if (visiveis.length === 0) return null;
  return (
    <div data-testid="confirmacao-de-retomada" className="space-y-3">
      {visiveis.map(p => {
        const id = p.intencao.id;
        if (p.situacao === 'mantida') {
          return (
            <div key={id} data-pendencia={id} data-situacao="mantida" className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              <p>{linhaDaPendenciaMantida(p)}</p>
            </div>
          );
        }
        const t = textoDaConfirmacao(p.intencao, nomeDoProjeto?.(p.intencao.projectId));
        const enviando = p.situacao === 'enviando';
        return (
          <div key={id} data-pendencia={id} data-situacao={p.situacao} className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-900">
            <p className="font-semibold">{t.titulo}</p>
            {t.linhas.map((linha, i) => (
              <p key={i}>{linha}</p>
            ))}
            <p className="mt-1">Nenhum novo cálculo será pedido enquanto você não decidir.</p>
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={() => onReenviar(id)} disabled={enviando} className="px-3 py-1 bg-amber-700 text-white rounded disabled:opacity-50">
                {enviando ? 'Reenviando...' : 'Reenviar este pedido'}
              </button>
              <button type="button" onClick={() => onManter(id)} disabled={enviando} className="underline text-amber-800 disabled:opacity-50">
                Não reenviar agora (manter pendente)
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
