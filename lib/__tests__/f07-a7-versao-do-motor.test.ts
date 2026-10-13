/**
 * lib/__tests__/f07-a7-versao-do-motor.test.ts
 *
 * F07, entrega A7, ponto 2: a decisão 5-A (a origem da versão do motor). A versão é a TUPLA `(5, 0, 0)` em
 * `lib/engine-version.ts`; os dois textos que o sistema grava saem dela:
 *
 *   - `engineVersion` da execução        = `ahp-bocr-motor-5.0.0`  (três componentes);
 *   - `metadata.version` do cálculo      = `5.0`                   (dois componentes).
 *
 * Os valores são os de ANTES de A7, byte a byte; o que muda é a origem no código. Por isso os testes de valor
 * comparam com LITERAIS escritos aqui, e nunca com a derivação (comparar a derivação com ela mesma passaria
 * mesmo que a tupla fosse trocada).
 *
 * ⚠ **O QUE ESTE ARQUIVO NÃO DEMONSTRA.** Que a entrada do Parecer IA não mudou: isso é a comparação do item
 * 3.3, feita sobre o payload e o contexto por instrumento próprio (ver o registro); aqui só se fixa o que
 * escreve o código de produção. E o censo (`engine-census.test.ts`) NÃO ganhou regra para a constante.
 */

export {};

import crypto from 'node:crypto';
import fixture from './fixtures/panel-2026.json';

jest.mock('@/lib/firebase', () => ({ db: { __mock: true } }));
jest.mock('firebase/firestore', () => require('./helpers/firestore-duplo').moduloFirestoreSimulado());

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { duplo } = require('./helpers/firestore-duplo');
const { POST } = require('@/app/api/calculate/route');
const execucoes = require('@/lib/execucoes');
const versao = require('@/lib/engine-version');
/* eslint-enable @typescript-eslint/no-var-requires */

const RAIZ = path.resolve(__dirname, '..', '..');
const ler = (rel: string): string => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const ocorrencias = (t: string, a: string) => t.split(a).length - 1;
const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Os arquivos de PRODUÇÃO (.ts/.tsx fora de testes, de `node_modules` e de `.next`), em `app`, `lib` e `components`. */
function arquivosDeProducao(): string[] {
  const achados: string[] = [];
  const varrer = (dir: string) => {
    for (const e of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        if (!['node_modules', '.next', '__tests__'].includes(e.name)) varrer(rel);
      } else if (/\.(ts|tsx)$/.test(e.name)) {
        achados.push(rel);
      }
    }
  };
  for (const d of ['app', 'lib', 'components']) varrer(d);
  return achados;
}

// ═════════════════════════════════════════════════════════════════════════════
// Critério 1: os valores, comparados com LITERAIS
// ═════════════════════════════════════════════════════════════════════════════

describe('A7.5-A (critério 1): os dois textos são os de antes, byte a byte', () => {
  test('o rótulo do motor é «ahp-bocr-motor-5.0.0» e a versão curta é «5.0» (literais; textos DIFERENTES)', () => {
    expect(versao.ROTULO_DO_MOTOR_DA_EXECUCAO).toBe('ahp-bocr-motor-5.0.0');
    expect(versao.VERSAO_CURTA_DO_CALCULO).toBe('5.0');
    expect(versao.ROTULO_DO_MOTOR_DA_EXECUCAO).not.toBe(`ahp-bocr-motor-${versao.VERSAO_CURTA_DO_CALCULO}`);
    // os bytes (UTF-8): só ASCII, e é o que ficava gravado antes de A7
    expect(Buffer.from(versao.ROTULO_DO_MOTOR_DA_EXECUCAO, 'utf8').toString('hex')).toBe('6168702d626f63722d6d6f746f722d352e302e30');
    expect(Buffer.from(versao.VERSAO_CURTA_DO_CALCULO, 'utf8').toString('hex')).toBe('352e30');
  });

  test('a rota REAL de cálculo grava `engineVersion` e `metadata.version` com esses literais, na execução e na resposta', async () => {
    duplo.reset();
    const PROJETO = 'projeto-f07-a7-versao';
    duplo.semear('projects', PROJETO, {
      name: 'Painel A7', description: 'fixture',
      alternatives: [{ code: 'A1', name: 'Gêmeo Digital', description: '' }, { code: 'A2', name: 'IA Temperatura', description: '' }],
    });
    ((fixture as any).responses as { id: string; judgments: any[] }[]).forEach((r, i) => {
      duplo.semear('respondents', `${PROJETO}__${r.id}`, { projectId: PROJETO });
      duplo.semear('responses', `${PROJETO}__resp-${i}`, {
        projectId: PROJETO, respondentId: `${PROJETO}__${r.id}`, judgments: JSON.parse(JSON.stringify(r.judgments)),
        completedAt: `2026-05-0${(i % 9) + 1}T12:00:00.000Z`,
      });
    });
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const res = await POST({ json: async () => ({ projectId: PROJETO, requestId: 'req-f07-a7-versao' }) } as any);
      expect(res.status).toBe(200);
      const corpo = await res.json();
      const gravada = duplo.ler('executions', corpo.executionId);
      expect(gravada.engineVersion).toBe('ahp-bocr-motor-5.0.0');
      expect(gravada.metadata.version).toBe('5.0');
      expect(corpo.calculation.engineVersion).toBe('ahp-bocr-motor-5.0.0');
      expect(corpo.calculation.metadata.version).toBe('5.0');
    } finally {
      log.mockRestore();
      aviso.mockRestore();
    }
  });

  test('`montarDocumentoDeExecucao` (lib/execucoes.ts) grava o rótulo literal em `engineVersion`', () => {
    const doc = execucoes.montarDocumentoDeExecucao({ metadata: {}, responseCount: 1 }, { requestId: 'req-x', codeRevision: null, projectUpdatedAt: null });
    expect(doc.engineVersion).toBe('ahp-bocr-motor-5.0.0');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Critério 2: a tupla é a ÚNICA origem declarada; os dois textos são derivados em código
// ═════════════════════════════════════════════════════════════════════════════

describe('A7.5-A (critério 2): a tupla (5, 0, 0) é a única origem, e os dois textos saem dela', () => {
  test('a tupla é (5, 0, 0), e é só leitura', () => {
    expect([...versao.VERSAO_DO_MOTOR]).toEqual([5, 0, 0]);
    expect(Array.isArray(versao.VERSAO_DO_MOTOR)).toBe(true);
  });

  /** O módulo REAL, transpilado e avaliado com OUTRA tupla no lugar da linha `export const VERSAO_DO_MOTOR = [5, 0, 0] as const;`. */
  function avaliarComTupla(tupla: string): { ROTULO_DO_MOTOR_DA_EXECUCAO: string; VERSAO_CURTA_DO_CALCULO: string } {
    const fonte = ler('lib/engine-version.ts');
    const alvo = 'export const VERSAO_DO_MOTOR = [5, 0, 0] as const;';
    expect(ocorrencias(fonte, alvo)).toBe(1);
    const js: string = ts.transpileModule(fonte.replace(alvo, `export const VERSAO_DO_MOTOR = ${tupla} as const;`), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const modulo: any = { exports: {} };
    vm.runInNewContext(js, { module: modulo, exports: modulo.exports });
    return modulo.exports;
  }

  test.each([
    ['[7, 3, 9]', 'ahp-bocr-motor-7.3.9', '7.3'],
    ['[10, 2, 11]', 'ahp-bocr-motor-10.2.11', '10.2'], // componentes de dois algarismos: sem separador seria «1021»
    ['[5, 0, 1]', 'ahp-bocr-motor-5.0.1', '5.0'], // a correção muda o rótulo da execução e NÃO a versão curta
  ])('trocar a tupla por %s troca os DOIS textos: «%s» e «%s»', (tupla, rotulo, curta) => {
    const m = avaliarComTupla(tupla);
    expect([m.ROTULO_DO_MOTOR_DA_EXECUCAO, m.VERSAO_CURTA_DO_CALCULO]).toEqual([rotulo, curta]);
  });

  test('o fonte de lib/engine-version.ts declara UMA tupla e deriva os dois textos dela (sem literal de versão)', () => {
    const codigo = semComentarios(ler('lib/engine-version.ts'));
    expect(ocorrencias(codigo, 'export const VERSAO_DO_MOTOR = [5, 0, 0] as const;')).toBe(1);
    expect(ocorrencias(codigo, 'export const ROTULO_DO_MOTOR_DA_EXECUCAO = `ahp-bocr-motor-${VERSAO_DO_MOTOR.join(\'.\')}`;')).toBe(1);
    expect(ocorrencias(codigo, 'export const VERSAO_CURTA_DO_CALCULO = VERSAO_DO_MOTOR.slice(0, 2).join(\'.\');')).toBe(1);
    // nenhum texto «5.0» nem «5.0.0» literal no código (fora de comentário): a tupla é a única fonte dos algarismos
    expect(/['"`][^'"`\n]*5\.0[^'"`\n]*['"`]/.test(codigo)).toBe(false);
    expect(ocorrencias(codigo, 'export const ')).toBe(3);
  });

  test('em TODA a produção (app, lib, components) o prefixo «ahp-bocr-motor-» aparece uma vez, e nenhum `version: \'5.0\'` literal resta', () => {
    const porArquivo: [string, number, number][] = arquivosDeProducao()
      .map((rel): [string, number, number] => {
        const codigo = semComentarios(ler(rel));
        return [rel, ocorrencias(codigo, 'ahp-bocr-motor-'), (codigo.match(/version\s*:\s*['"`]5\.0(\.0)?['"`]/g) ?? []).length];
      })
      .filter(([, a, b]) => a > 0 || b > 0);
    expect(porArquivo).toEqual([['lib/engine-version.ts', 1, 0]]);
  });

  test('a rota de cálculo e o gravador de execuções leem a versão do módulo: um import cada, e o uso no campo', () => {
    const rota = ler('app/api/calculate/route.ts');
    expect(ocorrencias(rota, "import { VERSAO_CURTA_DO_CALCULO } from '@/lib/engine-version';")).toBe(1);
    expect(ocorrencias(rota, 'version: VERSAO_CURTA_DO_CALCULO,')).toBe(1);
    const grava = ler('lib/execucoes.ts');
    expect(ocorrencias(grava, "import { ROTULO_DO_MOTOR_DA_EXECUCAO } from '@/lib/engine-version';")).toBe(1);
    expect(ocorrencias(grava, 'engineVersion: ROTULO_DO_MOTOR_DA_EXECUCAO,')).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Critério 3: o nome ativo é distinto de `ENGINE_VERSION`, e `lib/ahp-engine.ts` está intacto
// ═════════════════════════════════════════════════════════════════════════════

describe('A7.5-A (critério 3): nenhum nome exportado por lib/engine-version.ts contém «ENGINE_VERSION»', () => {
  test('os exports do módulo são os três novos, e nenhum se chama ENGINE_VERSION nem o contém', () => {
    const nomes = Object.keys(versao).sort();
    expect(nomes).toEqual(['ROTULO_DO_MOTOR_DA_EXECUCAO', 'VERSAO_CURTA_DO_CALCULO', 'VERSAO_DO_MOTOR']);
    for (const n of nomes) expect([n, n.includes('ENGINE_VERSION')]).toEqual([n, false]);
    expect('ENGINE_VERSION' in versao).toBe(false);
  });

  test('`lib/ahp-engine.ts` mantém a SUA `ENGINE_VERSION = \'engine-1.0.0\'`, uma vez, e não importa o módulo da versão', () => {
    const motor = ler('lib/ahp-engine.ts');
    expect(ocorrencias(motor, "export const ENGINE_VERSION = 'engine-1.0.0';")).toBe(1);
    expect(ocorrencias(motor, 'engine-version')).toBe(0);
  });

  test('ninguém em produção importa o nome ENGINE_VERSION do módulo da versão (a importação quebraria no tsc)', () => {
    const importadores = arquivosDeProducao().filter(rel => /import\s*\{[^}]*\bENGINE_VERSION\b[^}]*\}\s*from\s*['"]@\/lib\/engine-version['"]/.test(semComentarios(ler(rel))));
    expect(importadores).toEqual([]);
  });
});
