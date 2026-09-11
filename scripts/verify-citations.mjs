#!/usr/bin/env node
/**
 * verify-citations.mjs
 *
 * Confere os localizadores de pagina de um parecer gerado contra as paginas
 * de claim registradas no RAG (lib/rag/articles).
 *
 * Automatiza a apuracao descrita em docs/imprecisoes-parecer-ia.md, secao
 * "Metodo de apuracao". Implementa os requisitos 1 e 2 do eixo de ancoragem:
 * comparar pagina (nao so autor e ano) e validar a faixa do artigo.
 *
 * NAO altera nenhum arquivo. Le o RAG e o parecer, escreve no stdout.
 *
 * Uso:
 *   node scripts/verify-citations.mjs <parecer.md>
 *   node scripts/verify-citations.mjs <parecer.md> --json
 *   node scripts/verify-citations.mjs <parecer.md> --rag lib/rag/articles
 */

import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

// ---------------------------------------------------------------- argumentos

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const ragIdx = argv.indexOf('--rag');
const RAG_DIR = ragIdx >= 0 ? argv[ragIdx + 1] : 'lib/rag/articles';
const parecerPath = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--rag');

if (!parecerPath) {
  console.error('uso: node scripts/verify-citations.mjs <parecer.md> [--json] [--rag <dir>]');
  process.exit(2);
}

// ------------------------------------------------------------------ carregar

/**
 * Le cada arquivo do RAG como texto e extrai:
 *   - sobrenomes dos autores (do campo citation.abnt, em MAIUSCULAS)
 *   - ano (metadata.year, com fallback para o abnt)
 *   - paginas de claim (todos os `page:` do arquivo)
 *   - faixa do artigo (do "p. X-Y" do abnt)
 *
 * O RAG e lido como texto, nao importado: evita compilar TypeScript e nao
 * depende de o arquivo exportar o que se espera.
 */
function carregarRag(dir) {
  const artigos = [];
  let arquivos;
  try {
    arquivos = readdirSync(dir).filter(f => f.endsWith('.ts') && f !== 'index.ts');
  } catch {
    console.error(`nao consegui ler o diretorio do RAG: ${dir}`);
    process.exit(2);
  }

  for (const arq of arquivos) {
    const txt = readFileSync(join(dir, arq), 'utf8');
    const abnt = (txt.match(/abnt:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] || '';

    const ano =
      Number((txt.match(/year:\s*(\d{4})/) || [])[1]) ||
      Number((abnt.match(/(\d{4})\s*\.?\s*$/) || [])[1]) ||
      null;

    // Sobrenomes: blocos em MAIUSCULAS antes de cada virgula do abnt.
    // Cobre "SAATY, Thomas L.; VARGAS, Luis G." e tambem sufixos como
    // "NEELY JR., Brett H.", em que o sobrenome nao e o token colado a virgula.
    const SUFIXOS = new Set(['jr', 'junior', 'filho', 'neto', 'sobrinho', 'ii', 'iii']);
    const sobrenomes = [];
    for (const m of abnt.matchAll(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ'’-]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ'’.-]+)*)\s*,/g)) {
      for (const tok of m[1].split(/\s+/)) {
        const n = normalizar(tok);
        if (n.length >= 2 && !SUFIXOS.has(n)) sobrenomes.push(n);
      }
    }

    const paginas = [...new Set([...txt.matchAll(/page:\s*(\d+)/g)].map(m => Number(m[1])))]
      .sort((a, b) => a - b);

    const faixaM = abnt.match(/p\.?\s*(\d+)\s*[-–—]\s*(\d+)/);
    const faixa = faixaM ? [Number(faixaM[1]), Number(faixaM[2])] : null;

    artigos.push({
      id: basename(arq, '.ts'),
      abnt,
      ano,
      sobrenomes: [...new Set(sobrenomes)],
      paginas,
      faixa,
    });
  }
  return artigos;
}

function normalizar(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

// ------------------------------------------------------- extrair as citacoes

/**
 * Casa os formatos que aparecem nos pareceres:
 *   Saaty (1977, p. 248)
 *   Saaty & Ergu (2015, p. 2)
 *   Aull-Hyde et al. (2006, p. 252)
 *   Forman e Peniwati (1998, p. 167)
 *
 * E tambem as SEM localizador, contadas a parte: elas nao podem divergir,
 * mas tambem nao permitem conferencia. Ver a secao "Cobertura do teste".
 */
const RX_COM_PAGINA = /(?<![\wÀ-ÿ])([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ'’-]*(?:\s*&\s*|\s+(?:e|and)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ'’-]*)?(?:\s+et\s+al\.?)?)\s*\((\d{4})[a-z]?,\s*p\.?\s*(\d+)\s*\)/g;
const RX_SEM_PAGINA = /(?<![\wÀ-ÿ])([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ'’-]*(?:\s*&\s*|\s+(?:e|and)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ'’-]*)?(?:\s+et\s+al\.?)?)\s*\((\d{4})[a-z]?\)/g;

function extrairCitacoes(texto) {
  const comPagina = [];
  for (const m of texto.matchAll(RX_COM_PAGINA)) {
    comPagina.push({ autores: m[1].trim(), ano: Number(m[2]), pagina: Number(m[3]), bruto: m[0] });
  }
  const semPagina = [];
  for (const m of texto.matchAll(RX_SEM_PAGINA)) {
    semPagina.push({ autores: m[1].trim(), ano: Number(m[2]), bruto: m[0] });
  }
  return { comPagina, semPagina };
}

// ------------------------------------------------------------- casar com RAG

/**
 * Casa por (sobrenome, ano). O sobrenome citado e comparado contra a lista de
 * sobrenomes do abnt, para funcionar com "Saaty & Ergu" e "Aull-Hyde et al.".
 */
function acharArtigo(citacao, artigos) {
  const tokens = citacao.autores
    .split(/\s*(?:&|\be\b|\band\b)\s*|\s+et\s+al\.?/)
    .map(normalizar)
    .filter(Boolean);

  const candidatos = artigos.filter(
    a => a.ano === citacao.ano && tokens.some(t => a.sobrenomes.includes(t))
  );
  if (candidatos.length === 1) return { artigo: candidatos[0], ambiguo: false };
  if (candidatos.length > 1) {
    // desempata por quantidade de sobrenomes em comum
    const ordenado = candidatos
      .map(a => ({ a, n: tokens.filter(t => a.sobrenomes.includes(t)).length }))
      .sort((x, y) => y.n - x.n);
    return { artigo: ordenado[0].a, ambiguo: ordenado[0].n === (ordenado[1]?.n ?? -1) };
  }
  return { artigo: null, ambiguo: false };
}

// ------------------------------------------------------------------ conferir

const artigos = carregarRag(RAG_DIR);
const texto = readFileSync(parecerPath, 'utf8');
const { comPagina, semPagina } = extrairCitacoes(texto);

const resultados = comPagina.map(c => {
  const { artigo, ambiguo } = acharArtigo(c, artigos);

  if (!artigo) {
    return { ...c, veredito: 'NAO_INDEXADO', artigo: null, paginasClaim: [], faixa: null, ambiguo };
  }

  const naClaim = artigo.paginas.includes(c.pagina);
  const naFaixa = artigo.faixa
    ? c.pagina >= artigo.faixa[0] && c.pagina <= artigo.faixa[1]
    : null;

  let veredito;
  if (naClaim) veredito = 'OK';
  else if (naFaixa === true) veredito = 'DIVERGE_NA_FAIXA';   // erro de vizinhanca
  else veredito = 'DIVERGE_FORA_DA_FAIXA';                    // familia grosseira

  return {
    ...c,
    veredito,
    artigo: artigo.id,
    paginasClaim: artigo.paginas,
    faixa: artigo.faixa,
    ambiguo,
  };
});

// ------------------------------------------------------------------- relatar

const total = resultados.length;
const ok = resultados.filter(r => r.veredito === 'OK').length;
const naFaixa = resultados.filter(r => r.veredito === 'DIVERGE_NA_FAIXA').length;
const foraFaixa = resultados.filter(r => r.veredito === 'DIVERGE_FORA_DA_FAIXA').length;
const naoIndexado = resultados.filter(r => r.veredito === 'NAO_INDEXADO').length;
const divergentes = foraFaixa;
const cobertura = naFaixa;

// citacoes sem pagina que nao sao repeticao de uma com pagina
const chavesComPagina = new Set(comPagina.map(c => `${normalizar(c.autores)}|${c.ano}`));
const semPaginaUnicas = semPagina.filter(
  c => !chavesComPagina.has(`${normalizar(c.autores)}|${c.ano}`)
);

if (asJson) {
  console.log(JSON.stringify({
    parecer: parecerPath,
    rag: RAG_DIR,
    artigosIndexados: artigos.length,
    resumo: { total, ok, cobertura, divergentes, naFaixa, foraFaixa, naoIndexado, semLocalizador: semPagina.length },
    resultados,
  }, null, 2));
  process.exit(divergentes > 0 ? 1 : 0);
}

const pct = n => (total ? ((n / total) * 100).toFixed(0) + '%' : '-');

console.log(`\nVERIFICADOR DE LOCALIZADORES`);
console.log(`parecer: ${parecerPath}`);
console.log(`RAG:     ${RAG_DIR} (${artigos.length} artigos indexados)\n`);

const largura = Math.max(...resultados.map(r => r.bruto.length), 10);
for (const r of resultados) {
  const marca =
    r.veredito === 'OK' ? 'ok  '
    : r.veredito === 'DIVERGE_NA_FAIXA' ? 'ok* '
    : r.veredito === 'NAO_INDEXADO' ? '??  '
    : 'XX  ';
  const detalhe =
    r.veredito === 'OK' ? ''
    : r.veredito === 'NAO_INDEXADO' ? 'artigo nao indexado no RAG'
    : `claims em ${r.paginasClaim.join(', ')}` +
      (r.faixa ? ` | artigo ${r.faixa[0]}-${r.faixa[1]}` : '') +
      (r.veredito === 'DIVERGE_NA_FAIXA' ? ' | dentro da faixa, fora de toda claim' : '');
  console.log(`${marca}${r.bruto.padEnd(largura)}  ${detalhe}`);
  if (r.ambiguo) console.log(`    aviso: mais de um artigo casa (autor, ano). Confira a mao.`);
}

console.log(`\n--- resumo`);
console.log(`citacoes com localizador : ${total}`);
console.log(`  correta (pagina de claim)      : ${ok}  (${pct(ok)})`);
console.log(`  correta, RAG nao cobre         : ${cobertura}  (${pct(cobertura)})  <- na faixa do artigo, sem claim indexada`);
console.log(`  DIVERGENTE (fora da faixa)     : ${divergentes}  (${pct(divergentes)})`);
console.log(`  artigo nao indexado            : ${naoIndexado}  <- inconclusivo`);
console.log(`citacoes sem localizador : ${semPagina.length}  (${semPaginaUnicas.length} de artigos que nunca aparecem com pagina)`);

const classificadas = ok + cobertura + divergentes;
console.log(`\ntaxa de divergencia: ${divergentes}/${classificadas} (${classificadas ? ((divergentes / classificadas) * 100).toFixed(0) + '%' : '-'})`);

const universo = total + semPagina.length;
if (universo) {
  console.log(`\ncobertura do teste: ${((total / universo) * 100).toFixed(0)}% das ${universo} citacoes`);
  console.log(`taxa de erro: entre ${divergentes}/${universo} (${((divergentes / universo) * 100).toFixed(0)}%) no melhor caso`);
  console.log(`              e ${divergentes + semPaginaUnicas.length}/${universo} (${(((divergentes + semPaginaUnicas.length) / universo) * 100).toFixed(0)}%) no pior`);
}

console.log(`\nlimitacao: a conferencia e contra o RAG, nao contra o PDF. Uma divergencia`);
console.log(`pode ser atribuicao errada OU falha de cobertura do RAG. So o PDF separa as`);
console.log(`duas. As citacoes contadas em "correta, RAG nao cobre" caem na faixa do`);
console.log(`artigo mas em pagina sem claim indexada: sao corretas quanto ao artigo, e`);
console.log(`medem a cobertura da base, nao erro do modelo.`);
console.log(`Ver docs/imprecisoes-parecer-ia.md, "Limitacao metodologica".\n`);

process.exit(divergentes > 0 ? 1 : 0);
