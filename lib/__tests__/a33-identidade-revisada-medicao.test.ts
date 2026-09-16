/** Controle das propostas offline; não aplica esquema à base nem chama serviços. */
export {};
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { candidate, typed, slot, measure, controls, inventoryArticles } = require('../../scripts/measure-a33-identity-v2.cjs');
const root = path.resolve(__dirname, '../..');
const read = (file: string) => fs.readFileSync(path.join(root, file));
const units = JSON.parse(read('docs/dados/a33-etapa4/evidencias.json')).porTrecho;
const old = JSON.parse(read('docs/dados/a33-identidade-derivada/medicao.json'));
const published = JSON.parse(read('docs/dados/a33-identidade-revisada/medicao.json'));
const files = fs.readdirSync(path.join(root,'lib/rag/articles')).filter((f: string) => f.endsWith('.ts')).sort().map((f: string) => 'lib/rag/articles/'+f);
const inventory = inventoryArticles(read, files);
const main = measure(units), extra = measure(inventory.supplemental);
const actualControls = controls(main, extra, old.medicoes.total.indistinguiveisPelaComposicao.membros);
const copy = (v: any) => JSON.parse(JSON.stringify(v));
const key = (u: any, h='T') => candidate(u,h).chave;

describe('A.33: propostas revisadas, sem adoção', () => {
  test('as duas claims de Wijnmalen diferem, embora evidence inteiro coincida', () => {
    const a=units[86], b=units[89];
    expect(a.articleId).toBe('wijnmalen2007_bocr');expect(b.articleId).toBe(a.articleId);
    expect(a.dadosOriginais.evidence).toEqual(b.dadosOriginais.evidence);
    expect(a.dadosOriginais.claim).not.toBe(b.dadosOriginais.claim);
    expect(a.dadosOriginais.verbatim_quote).not.toBe(b.dadosOriginais.verbatim_quote);
    for (const h of ['U','T']) expect(key(a,h)).not.toBe(key(b,h));
    const onlyClaim=copy(a);onlyClaim.dadosOriginais.claim=b.dadosOriginais.claim;
    const onlyVerbatim=copy(a);onlyVerbatim.dadosOriginais.verbatim_quote=b.dadosOriginais.verbatim_quote;
    for (const h of ['U','T']) {expect(key(a,h)).not.toBe(key(onlyClaim,h));expect(key(a,h)).not.toBe(key(onlyVerbatim,h));}
  });
  test('os seis grupos anteriores se separam sem inventar posição ou campo ausente', () => {
    expect(actualControls.positivos).toHaveLength(6);
    for (const g of actualControls.positivos) {expect(g.U.separaTodos).toBe(true);expect(g.T.separaTodos).toBe(true);expect(g.indistinguiveisCompletos).toBe(false);}
    expect(actualControls.positivos[4].camposQueDiferem).toEqual(['context','value']);
    expect(actualControls.positivos[4].claim.aplicavelATodos).toBe(false);
    expect(actualControls.positivos[5].camposQueDiferem).toEqual(['description','id','latex','variables']);
  });
  test.each(['key_claims','thresholds','formulas','limitations','recommendations','benchmark'])('controle negativo de %s continua repetido sob endereço diferente', (tipo: string) => {
    const n=actualControls.negativos.find((n: any)=>n.tipo===tipo);
    expect(n.mesmoConteudo).toBe(true);expect(n.sinteticoForaDoDenominador).toBe(true);
    expect(n.U.grupos).toBe(1);expect(n.T.grupos).toBe(1);expect(n.U.unidades).toBe(2);expect(n.T.unidades).toBe(2);
  });
  test('duplicação do conteúdo natural reprova cobertura, não é separada por hash', () => {
    const a=copy(units[86]), b=copy(a);b.enderecoNaBase.indiceBaseZero=1000;
    const r=measure([a,b]);
    expect(r.total.indistinguiveisNaBase.grupos).toBe(1);
    for (const h of ['U','T']) {expect(r.total[h].cobertura).toBe(0);expect(r.total[h].excluidas).toHaveLength(2);expect(r.total[h].excluidas[0].motivos).toContain('candidata repetida');}
  });
  test('IDs nativos são literais, específicos da obra e não substituídos pelo resumo', () => {
    const a=units.find((u: any)=>u.tipo==='formula'&&u.dadosOriginais.id==='bocr_additive');
    expect(a).toBeDefined();
    for (const h of ['U','T']) {
      const c=candidate(a,h);expect(c.idNativo).toEqual(['texto','bocr_additive']);expect(c.chave).toContain('["idNativo",["texto","bocr_additive"]]');
      const revised=copy(a);revised.dadosOriginais.latex+=' ';
      expect(candidate(revised,h).idNativo).toEqual(c.idNativo);expect(key(revised,h)).not.toBe(c.chave);
      const other=copy(a);other.articleId='outra_obra';expect(key(other,h)).not.toBe(c.chave);
    }
  });
  test('versões diferentes não disfarçam chave nativa duplicada dentro da obra', () => {
    const a=units.find((u: any)=>u.tipo==='formula'),b=copy(a);b.dadosOriginais.latex+=' ';
    const r=measure([a,b]);expect(r.idsNativos.grupos).toBe(1);
    for (const h of ['U','T']) {expect(r.total[h].repetidas.grupos).toBe(0);expect(r.total[h].cobertura).toBe(0);expect(r.total[h].excluidas[0].motivos).toContain('chave nativa de fórmula ambígua');}
  });
  test('ausente, nulo, vazio e zero são valores diferentes', () => {
    expect(slot({},'x')).toEqual(['ausente']);expect(slot({x:null},'x')).toEqual(['nulo']);expect(slot({x:''},'x')).toEqual(['texto','']);
    const variants=[undefined,null,'',0].map(v=>{const u=copy(units[0]);if(v===undefined)delete u.dadosOriginais.evidence.locator_id;else u.dadosOriginais.evidence.locator_id=v;return u;});
    for (const h of ['U','T']) expect(new Set(variants.map(u=>key(u,h))).size).toBe(4);
    expect(typed(-0)).not.toEqual(typed(0));
  });
  test('não normaliza espaços, caixa, acentos, Unicode ou texto com RS', () => {
    const variants=['é','e\u0301','É','e','é ','é\n','é\x1e'].map(s=>{const u=copy(units[0]);u.dadosOriginais.claim=s;return u;});
    for (const h of ['U','T']) {
      expect(new Set(variants.map(u=>key(u,h))).size).toBe(variants.length);
      for(const u of variants)expect(key(u,h).split('\x1e')).toHaveLength(5);
    }
  });
  test('recusa tipos fora da serialização e não converte surrogate em substituição', () => {
    for(const v of [undefined,NaN,Infinity,()=>1])expect(()=>typed(v)).toThrow();
    expect(()=>typed('\ud800')).toThrow();expect(()=>typed(Array(1))).toThrow();
    expect(typed('😀')).toEqual(['texto','😀']);
  });
  test('ordem de propriedades e dos registros não muda nenhuma candidata', () => {
    expect(actualControls.reordenacao).toEqual({U:{comparadas:165,inalteradas:165},T:{comparadas:165,inalteradas:165}});
    expect(typed({b:1,a:2})).toEqual(typed({a:2,b:1}));
    expect(typed([1,2])).not.toEqual(typed([2,1]));
  });
  test('controles de volatilidade preservam o alcance distinto das duas hipóteses', () => {
    for(const v of actualControls.volatilidade){expect(v.observado).toEqual(v.esperado);expect(v.idNativoPreservado).toBe(true);}
    const u=copy(units[0]);u.dadosOriginais.anotacaoEditorial='alterada';
    expect(key(u,'U')).not.toBe(key(units[0],'U'));expect(key(u,'T')).toBe(key(units[0],'T'));
  });
  test('benchmark sem dado quantitativo é excluído mesmo com candidata única', () => {
    const excluded=main.total.U.excluidas;expect(excluded).toHaveLength(1);
    expect(excluded[0].articleId).toBe('saiyed2023_ceoPowerUET');expect(excluded[0].motivos).toEqual(['nenhum campo quantitativo disponível']);
    expect(main.total.U.repetidas.grupos).toBe(0);expect(main.total.T.excluidas).toEqual(excluded);
    const u=copy(units[157]);u.dadosOriginais.n_respondents=0;
    expect(measure([u]).total.U.cobertura).toBe(1);expect(measure([u]).total.T.cobertura).toBe(1);
  });
  test('benchmark de outro artigo não entra por contentamento com um hash único', () => {
    const u=copy(units[155]);expect(u.tipo).toBe('benchmark');u.dadosOriginais.source_article='outra_obra';
    for(const h of ['U','T'])expect(measure([u]).total[h].excluidas[0].motivos).toContain('source_article diverge de articleId');
  });
  test('inventário complementar mede os cinco vetores e a unicidade nativa', () => {
    expect(inventory.inventory).toHaveLength(36);
    expect(inventory.inventory.some((a: any)=>a.arquivo.endsWith('/_template.ts'))).toBe(false);
    const imports=[...read('lib/rag/index.ts').toString().matchAll(/import \w+ from '\.\/articles\/([^']+)'/g)].map((m: any)=>'lib/rag/articles/'+m[1]+'.ts').sort();
    expect(inventory.inventory.map((a: any)=>a.arquivo).sort()).toEqual(imports);
    const counts={key_claims:138,thresholds:64,formulas:128,limitations:89,recommendations:110,benchmark:0};
    for(const [t,n] of Object.entries(counts)){expect(extra.porTipo[t].denominador).toBe(n);expect(extra.porTipo[t].U.cobertura).toBe(n);expect(extra.porTipo[t].T.cobertura).toBe(n);}
    expect(extra.idsNativos.grupos).toBe(0);expect(extra.total.indistinguiveisNaBase.grupos).toBe(0);
    expect(inventory.inventory.reduce((n: number,a: any)=>n+a.vetores.formulas.idsNativos,0)).toBe(128);
    expect(inventory.inventory.every((a: any)=>a.vetores.key_claims.idsNativos===0&&a.vetores.thresholds.idsNativos===0)).toBe(true);
  });
  test('resultados publicados correspondem às entradas e às duas hipóteses', () => {
    expect(main.total).toEqual(published.principal.total);expect(main.porTipo).toEqual(published.principal.porTipo);
    expect(extra.total).toEqual(published.complementar.total);expect(actualControls).toEqual(published.controles);
    // ⚠ **A.16 corrigiu dois destes arquivos DEPOIS da medição**, e `medicao.json` é
    // histórica: não se reescreve. Exceções ENUMERADAS, com o SHA-256 medido e o
    // corrente fixados; qualquer outro arquivo continua tendo de bater com a medição.
    const corrigidosEmA16: Record<string, {medido: string; corrente: string}> = {
      'lib/rag/articles/saaty1977_scaling.ts': {medido:'4b44bd347a9fc1836df68d6543a0359771f3be6d6ae854cdf8b0011cd2116242',corrente:'5cd0efe662e4132ac33297074419be7051e0609c56f84077f8b222353698f759'},
      'lib/rag/articles/wijnmalen2007_bocr.ts': {medido:'d24c49fda401ff092a4d46b0be3035a3c6e84ef8dbf530ab6209c21b18e3b1fd',corrente:'01f26c6afed0c1519ca8b34b1d297c1e580b0acf6809cc1f3a6b70e7c7b46885'},
    };
    expect(published.complementar.artigos.filter((a: any)=>corrigidosEmA16[a.arquivo])).toHaveLength(2);
    for(const a of published.complementar.artigos){
      const atual=crypto.createHash('sha256').update(read(a.arquivo)).digest('hex');
      const e=corrigidosEmA16[a.arquivo];
      if(e){expect(a.sha256Fonte).toBe(e.medido);expect(atual).toBe(e.corrente);}else expect(atual).toBe(a.sha256Fonte);
    }
    expect(published.C1.map((u: any)=>[u.articleId,u.U,u.T])).toEqual([['saaty1977_scaling',true,true],['wijnmalen2007_bocr',true,true],['forman1998_aggregating',true,true]]);
    expect(published.coberturaC1.incluindoContextoEstatico).toEqual({denominador:165,U:164,T:164});
  });
  test('medição não preenche IDs, não resolve A.16 e não altera os objetos', () => {
    const before=JSON.stringify(units);measure(units);expect(JSON.stringify(units)).toBe(before);
    // ⚠ **A adoção veio depois, em A.33 passo 3**, e é do autor, não da medição.
    // O que se guarda aqui é que a MEDIÇÃO não lê nem escreve `trechoId`: as
    // candidatas continuam idênticas às publicadas com o campo já preenchido, o
    // que as duas primeiras asserções deste bloco demonstram sobre `published`.
    expect(units.filter((u: any)=>typeof u.trechoId==='string')).toHaveLength(164);
    for(const u of units){const semId=JSON.parse(JSON.stringify(u));semId.trechoId=null;expect(key(semId)).toBe(key(u));}
    expect(published.esquemaAdotado).toBe(false);
    expect(published.pendencias).toEqual({trechoIdNulo:165,publicacoesPendentes:161,claimsComCamposDivergentes:19});
  });
});
