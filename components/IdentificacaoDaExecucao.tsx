'use client';

/**
 * components/IdentificacaoDaExecucao.tsx
 *
 * F07, A3: a faixa que identifica a EXECUÇÃO exibida na tela de resultados, e o contexto que leva a
 * mesma identificação ao envoltório de download dos gráficos (a imagem exportada sai com legenda).
 *
 * Os valores vêm do documento EXIBIDO (a execução lida, ou o documento anterior a F07), por
 * `identificarExecucao`; o que falta aparece como "ausente". Nada aqui lê a constante de versão do
 * motor do código.
 */

import React, { createContext } from 'react';
import { type IdentificacaoDaExecucao, linhasDeIdentificacao } from '@/lib/identificacao-da-execucao';

/** `null` (sem provedor, ou sem documento) vira "ausente" em cada campo da legenda. */
export const ContextoDaIdentificacao = createContext<IdentificacaoDaExecucao | null>(null);

export default function FaixaDeIdentificacao({ identificacao }: { identificacao: IdentificacaoDaExecucao | null }) {
  const linhas = linhasDeIdentificacao(identificacao);
  return (
    <section aria-label="Identificação da execução exibida" className="max-w-7xl mx-auto px-4 mt-4">
      <dl data-identificacao="execucao" className="bg-white border rounded-xl shadow-sm p-3 grid grid-cols-1 md:grid-cols-5 gap-x-4 gap-y-1 text-xs">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt className="text-gray-500">{rotulo}</dt>
            <dd data-ausente={valor === 'ausente' ? 'sim' : 'nao'} className="font-mono text-gray-900 break-all">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
