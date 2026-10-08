'use client';

import { useState } from 'react';
import { prepararEnvio } from '@/lib/validacao-externa/matriz-utilizavel';
import {
  descreverOrigem,
  executarValidacao,
  type Apresentacao,
  type Celula,
  type FaixaVisual,
  type Propriedade,
} from '@/lib/validacao-externa/precedencia';

/**
 * ExternalValidation Component — AhpAnpLib (Creative Decisions Foundation)
 *
 * Envia as matrizes pareadas agregadas do cálculo à AhpAnpLib e APRESENTA o resultado informado pelo
 * serviço. Este componente só apresenta: a decisão de quais matrizes são utilizáveis, a origem delas, a
 * verificação da forma do retorno e a regra de precedência P1 a P9 estão em `lib/validacao-externa/`
 * (especificação em `docs/validacao-externa-fase2-especificacao.md`).
 *
 *   - `matriz-utilizavel.ts`   o conjunto enviado, a origem e a procedência local do CR;
 *   - `contrato-retorno.ts`    a forma do retorno, os três estados da entrada e as contradições;
 *   - `precedencia.ts`         o estado (manchete, as três propriedades, o selo) e a orquestração.
 *
 * Estrutura do documento de cálculo lido (coleção 'calculations'):
 *   calculation.aggregatedMatrices.bocr / .magnitude / .subcriteria.{B,O,C,R}   (JSON em texto)
 *   calculation.bocrWeights, .rescalingWeights, .subWeights
 *   calculation.bocrConsistency, .magnitudeConsistency, .subConsistency
 *
 * Limites declarados: o resultado é informado pelo serviço; que ele executou a comparação não é
 * verificável aqui. Esta tela não bloqueia ranking, exportação nem decisão.
 *
 * Referência:
 *   MU, E. (2023). Creative Decisions Foundation Announces the Release of
 *   AHP/ANP Python Library. IJAHP, v. 15, n. 2. DOI: 10.13033/ijahp.v15i2.1163
 */

interface ExternalValidationProps {
  calculation: any;
  project: any;
}

// ---------------------------------------------------------------------------------------------
// Apresentação do resultado (exportada para ser renderizada isoladamente nos testes)
// ---------------------------------------------------------------------------------------------

const ICONE: Record<Apresentacao['codigo'], string> = {
  P1: '⚠️',
  P2: 'ℹ️',
  P3: '❌',
  P4: '❌',
  P5: '❓',
  P6: 'ℹ️',
  P7: '⚠️',
  P8: '✅', // o ícone do selo: aparece somente em P8
  P9: '⛔',
};

const CLASSES_DO_BLOCO: Record<Apresentacao['tom'], { caixa: string; titulo: string; texto: string }> = {
  aprovado: { caixa: 'bg-green-50 border-green-200', titulo: 'text-green-800', texto: 'text-green-700' },
  reprovado: { caixa: 'bg-rose-50 border-rose-300', titulo: 'text-rose-800', texto: 'text-rose-700' },
  erro: { caixa: 'bg-red-50 border-red-200', titulo: 'text-red-800', texto: 'text-red-700' },
  aviso: { caixa: 'bg-amber-50 border-amber-200', titulo: 'text-amber-800', texto: 'text-amber-700' },
  neutro: { caixa: 'bg-slate-50 border-slate-200', titulo: 'text-slate-800', texto: 'text-slate-600' },
};

// Critério VISUAL desta tela, e não tolerância do serviço nem veredito.
const CLASSE_DA_FAIXA: Record<FaixaVisual, string> = {
  verde: 'text-green-600',
  azul: 'text-blue-600',
  ambar: 'text-amber-600',
};

function CelulaDaTabela({ celula }: { celula: Celula }) {
  return (
    <td className="px-3 py-2 border text-center font-mono">
      <span
        className={
          celula.faixa
            ? CLASSE_DA_FAIXA[celula.faixa]
            : celula.avaliado
              ? 'text-gray-600'
              : 'text-gray-400 italic'
        }
      >
        {celula.texto}
      </span>
      {celula.nota && <span className="block text-[10px] text-gray-400 font-sans">{celula.nota}</span>}
    </td>
  );
}

function BlocoDePropriedade({ propriedade, ordem }: { propriedade: Propriedade; ordem: number }) {
  const chave = ['cobertura', 'resultado', 'veredito'][ordem];
  return (
    <section data-propriedade={chave} className="p-3 rounded-lg border border-gray-200 bg-white">
      <p className="text-xs font-semibold text-gray-700">{propriedade.nome}</p>
      <p className="text-xs text-gray-600 mt-1">{propriedade.situacao}</p>
      {propriedade.detalhes.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {propriedade.detalhes.map((d, i) => (
            <li key={i} className="text-[11px] text-gray-500">
              • {d}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PainelDeResultado({ apresentacao }: { apresentacao: Apresentacao }) {
  const a = apresentacao;
  const cores = CLASSES_DO_BLOCO[a.tom];
  return (
    <div className="space-y-4" data-estado={a.codigo}>
      {/* Bloco de veredito. O SELO é o conjunto rótulo, ícone e cor deste bloco, e existe somente em P8. */}
      <div
        data-bloco="veredito"
        data-estado={a.codigo}
        data-selo={a.selo ? 'sim' : 'nao'}
        className={`p-4 rounded-lg border ${cores.caixa}`}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{ICONE[a.codigo]}</span>
          <div>
            <p className={`font-semibold ${cores.titulo}`}>{a.manchete}</p>
            <p className={`text-xs ${cores.texto}`}>Origem das matrizes: {a.origem.rotulo}</p>
          </div>
        </div>
        <p className={`text-xs ${cores.texto}`}>{a.descricao}</p>
      </div>

      <div data-bloco="origem" className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>Origem das matrizes: {a.origem.rotulo}.</strong> {a.origem.descricao}
        </p>
        {a.origem.detalhes.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {a.origem.detalhes.map((d, i) => (
              <li key={i} className="text-[11px] text-blue-700">
                • {d}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div data-bloco="propriedades" className="grid gap-2">
        {a.propriedades.map((p, i) => (
          <BlocoDePropriedade key={p.nome} propriedade={p} ordem={i} />
        ))}
      </div>

      {a.causas.length > 0 && (
        <div data-bloco="causas" className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm font-medium text-amber-800 mb-1">Por que o veredito global não é confirmado:</p>
          {a.causas.map((c, i) => (
            <p key={i} className="text-xs text-amber-700">
              • {c}
            </p>
          ))}
        </div>
      )}

      {a.linhas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" data-bloco="tabela">
            <caption className="text-left text-xs text-gray-500 pb-1">
              Resultado informado pelo serviço. Origem das matrizes: {a.origem.rotulo}.
            </caption>
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border">Matriz</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 border">N</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 border">CR (Sistema)</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 border">CR (AhpAnpLib)</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 border">Δ CR</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 border">Δ Pesos Máx</th>
                <th className="px-3 py-2 text-center font-semibold text-gray-700 border">valid (serviço)</th>
              </tr>
            </thead>
            <tbody>
              {a.linhas.map(l => (
                <tr key={l.chave} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border font-medium text-gray-800">
                    {l.chave}
                    {l.notas.length > 0 && (
                      <span className="block text-[10px] text-gray-400 font-normal">{l.notas.join('; ')}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border text-center text-gray-600">{l.n}</td>
                  <CelulaDaTabela celula={l.crSistema} />
                  <CelulaDaTabela celula={l.crServico} />
                  <CelulaDaTabela celula={l.deltaCR} />
                  <CelulaDaTabela celula={l.deltaPesos} />
                  <td className="px-3 py-2 border text-center text-xs text-gray-700">{l.veredito.texto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {a.semEvidencia.length > 0 && (
        <div data-bloco="sem-evidencia" className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-1">Entradas sem evidência utilizável (não exibidas como resultado):</p>
          {a.semEvidencia.map(s => (
            <p key={s.chave} className="text-xs text-gray-600">
              • {s.chave}: {s.motivos.join('; ')}
            </p>
          ))}
        </div>
      )}

      {a.maximos && (
        <div data-bloco="maximos" className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-0.5">
          <p className="text-xs text-gray-600">
            Diferença máxima de pesos: resumo do serviço (summary.max_weight_diff) = {a.maximos.resumoPesos};
            máximo das entradas (calculado aqui) = {a.maximos.entradasPesos}.
          </p>
          <p className="text-xs text-gray-600">
            Diferença máxima de CR: resumo do serviço (summary.max_cr_diff) = {a.maximos.resumoCR}; máximo das
            entradas (calculado aqui) = {a.maximos.entradasCR}.
          </p>
          {a.resumoDoServico && a.resumoDoServico.map((r, i) => (
            <p key={i} className="text-xs text-gray-600">{r}</p>
          ))}
        </div>
      )}

      {a.pontosDeAtencao && a.pontosDeAtencao.length > 0 && (
        <div data-bloco="pontos" className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm font-medium text-amber-800 mb-1">Pontos de atenção informados pelo serviço:</p>
          {a.pontosDeAtencao.map((issue, i) => (
            <p key={i} className="text-xs text-amber-700">• {issue}</p>
          ))}
        </div>
      )}

      {a.notas.length > 0 && (
        <div data-bloco="notas" className="space-y-0.5">
          {a.notas.map((n, i) => (
            <p key={i} className="text-[11px] text-gray-500">{n}</p>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t">
        <span>Biblioteca (informada pelo serviço): {a.biblioteca ?? 'não informada'}</span>
        <span>•</span>
        <span>
          <a href="https://doi.org/10.13033/ijahp.v15i2.1163" target="_blank"
            rel="noopener noreferrer" className="text-blue-500 hover:underline">
            DOI: 10.13033/ijahp.v15i2.1163
          </a>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// O componente
// ---------------------------------------------------------------------------------------------

export default function ExternalValidation({ calculation, project }: ExternalValidationProps) {
  const [loading, setLoading] = useState(false);
  const [apresentacao, setApresentacao] = useState<Apresentacao | null>(null);
  const [serviceStatus, setServiceStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/validate-external');
      if (res.ok) {
        const data = await res.json();
        setServiceStatus(data.ahpanplib_available ? 'online' : 'offline');
      } else {
        setServiceStatus('offline');
      }
    } catch {
      setServiceStatus('offline');
    }
  };

  const runValidation = async () => {
    setLoading(true);
    setApresentacao(null);
    try {
      // `executarValidacao` não lança: toda falha vira um estado apresentável.
      setApresentacao(await executarValidacao(calculation, (url, init) => fetch(url, init)));
    } finally {
      setLoading(false);
    }
  };

  const envioPrevisto = calculation ? prepararEnvio(calculation) : null;
  const matrixCount = envioPrevisto ? Object.keys(envioPrevisto.matrices).length : 0;
  const origemPrevista = envioPrevisto ? descreverOrigem(envioPrevisto) : null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-xl">🔬</span>
            Validação Externa — AhpAnpLib
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Envia as matrizes do sistema à biblioteca da
            <strong className="text-gray-700"> Creative Decisions Foundation</strong> e exibe o resultado
            informado pelo serviço
          </p>
          <p className="text-xs text-gray-400 mt-1 italic">
            Mu, E. (2023). IJAHP, v. 15, n. 2. DOI: 10.13033/ijahp.v15i2.1163
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            serviceStatus === 'online' ? 'bg-green-400' :
            serviceStatus === 'offline' ? 'bg-red-400' : 'bg-gray-300'
          }`} />
          <span className="text-xs text-gray-400">
            {serviceStatus === 'online' ? 'Online' :
             serviceStatus === 'offline' ? 'Offline' : 'Verificar'}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={runValidation} disabled={loading}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Validando...
            </span>
          ) : `🔬 Executar Validação (${matrixCount} matrizes)`}
        </button>
        <button onClick={checkHealth}
          className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm text-gray-600 transition-colors">
          Verificar Serviço
        </button>
      </div>

      {apresentacao && <PainelDeResultado apresentacao={apresentacao} />}

      {!apresentacao && !loading && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-4xl mb-3">🔬</p>
          <p className="text-sm">
            Clique em <strong>&ldquo;Executar Validação&rdquo;</strong> para enviar as matrizes utilizáveis do
            cálculo à biblioteca AhpAnpLib da Creative Decisions Foundation.
          </p>
          {origemPrevista && (
            <div data-bloco="previa" className="text-xs mt-2 text-gray-500">
              <p>
                {matrixCount} matrizes utilizáveis para envio. Origem das matrizes: {origemPrevista.rotulo}.
              </p>
              {origemPrevista.detalhes.map((d, i) => (
                <p key={i} className="text-[11px] text-gray-400">• {d}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
