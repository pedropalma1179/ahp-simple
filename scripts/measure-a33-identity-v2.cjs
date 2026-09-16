/** A.33: comparação offline de duas propostas. Não atribui IDs nem altera entradas. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const SNAPSHOT = 'b3fe3d7a0c78b8129e185cbce0099ef606fb844e';
const PROTOCOLO = '4f2a42a054f917e0cd85fe22f2f0512355b4c233';
const OUT = 'docs/dados/a33-identidade-revisada/';
const VECTORS = ['key_claims', 'thresholds', 'formulas', 'limitations', 'recommendations'];
const FIELDS = {
  key_claims: ['claim', 'verbatim_quote', 'evidence'],
  thresholds: ['metric', 'operator', 'value', 'unit', 'context', 'evidence'],
  formulas: ['latex', 'description', 'variables', 'conditions', 'evidence'],
  limitations: ['texto'], recommendations: ['texto'],
  benchmark: ['source_year', 'domain', 'n_respondents', 'n_alternatives', 'n_criteria_total', 'bocr_weights', 'concordance_rate', 'cr_aggregated', 'weight_ratio'],
};
const TYPES = [...VECTORS, 'benchmark'];
const own = (o, k) => o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
function text(s) {
  if (/[\uD800-\uDFFF]/u.test(s)) throw Error('Substituto UTF-16 isolado');
  return s;
}
function typed(v) {
  if (v === null) return ['nulo'];
  if (typeof v === 'string') return ['texto', text(v)];
  if (typeof v === 'boolean') return ['booleano', v];
  if (typeof v === 'number' && Number.isFinite(v)) return ['numero', Object.is(v, -0) ? '-0' : String(v)];
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) if (!own(v, i)) throw Error('Vetor com lacuna');
    return ['vetor', v.map(typed)];
  }
  if (typeof v === 'object') return ['objeto', Object.keys(v).sort().map(k => [text(k), typed(v[k])])];
  throw Error('Tipo de valor não admitido');
}
const slot = (o, k) => own(o, k) ? typed(o[k]) : ['ausente'];
const json = v => JSON.stringify(v);
const clone = v => JSON.parse(json(v));
const typeOf = u => ({ claim: 'key_claims', limiar: 'thresholds', formula: 'formulas' }[u.tipo] || u.tipo);
const native = u => slot(u.dadosOriginais, 'id');
function candidate(u, hypothesis) {
  if (!['U', 'T'].includes(hypothesis)) throw Error('Hipótese inválida');
  const type = typeOf(u), d = u.dadosOriginais;
  if (!FIELDS[type]) throw Error('Tipo de unidade fora do protocolo');
  let payload;
  if (hypothesis === 'U') {
    payload = typed(d && typeof d === 'object' && !Array.isArray(d) ? Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'id')) : d);
  } else {
    payload = ['campos', FIELDS[type].map(k => [k, ['limitations','recommendations'].includes(type) ? typed(d) : slot(d, k)])];
  }
  const preimage = json(payload), digest = sha(Buffer.from(preimage, 'utf8'));
  const fields = [['articleId', slot(u, 'articleId')], ['tipo', typed(type)], ['idNativo', native(u)], ['versaoSha256', typed(digest)]];
  const components = fields.map(json);
  if (components.some(c => c.includes('\x1e'))) throw Error('Separador cru dentro de componente');
  const key = [hypothesis === 'U' ? 'A33-universal-v2' : 'A33-por-tipo-v2', ...components].join('\x1e');
  return { chave: key, versaoSha256: digest, preimagemDoConteudo: preimage, idNativo: native(u) };
}
const nonempty = v => typeof v === 'string' && v.length > 0;
function minimum(u) {
  const d = u.dadosOriginais, t = typeOf(u), reasons = [];
  if (!nonempty(u.articleId)) reasons.push('articleId ausente ou vazio');
  if (!FIELDS[t]) reasons.push('tipo não admitido');
  const required = t === 'key_claims' ? ['claim'] : t === 'formulas' ? ['id','latex'] : t === 'thresholds' ? ['metric','operator','unit','context'] : [];
  required.forEach(k => { if (!nonempty(d?.[k])) reasons.push(k + ' ausente, nulo ou vazio'); });
  if (t === 'thresholds' && !(typeof d.value === 'number' && Number.isFinite(d.value))) reasons.push('value não é número finito');
  if (['limitations','recommendations'].includes(t) && !nonempty(d)) reasons.push('texto ausente ou vazio');
  if (t === 'benchmark') {
    if (d.source_article !== u.articleId) reasons.push('source_article diverge de articleId');
    if (!FIELDS.benchmark.slice(2).some(k => own(d,k) && d[k] !== null)) reasons.push('nenhum campo quantitativo disponível');
  }
  return reasons;
}
function groups(rows, get) {
  const map = new Map();
  for (const r of rows) { const k = get(r); if (k === null) continue; if (!map.has(k)) map.set(k,[]); map.get(k).push(r); }
  return [...map.values()].filter(g => g.length > 1);
}
const member = r => ({ indice: r.index, articleId: r.u.articleId, tipo: typeOf(r.u), endereco: r.u.enderecoNaBase });
const groupInfo = gs => ({ grupos: gs.length, unidades: gs.reduce((n,g) => n+g.length,0), membros: gs.map(g => g.map(member)) });
const nativeKey = u => nonempty(u.dadosOriginais?.id) ? json([u.articleId,typeOf(u),u.dadosOriginais.id]) : null;
const entire = u => json([slot(u,'articleId'),typed(typeOf(u)),typed(u.dadosOriginais)]);
const state = v => v[0] === 'ausente' ? 'ausente' : v[0] === 'nulo' ? 'nulo' : v[0] === 'texto' && v[1] === '' ? 'vazio' : 'presente';
function measuredFields(rows, h) {
  const names = new Set(['articleId','tipo','idNativo']);
  if (h === 'U') rows.forEach(r => { const d=r.u.dadosOriginais; if (typeof d==='string') names.add('texto'); else Object.keys(d).filter(k=>k!=='id').forEach(k=>names.add(k)); });
  else rows.forEach(r => FIELDS[typeOf(r.u)].forEach(k=>names.add(k)));
  // Campos internos de evidence também são observados; não são pré-requisitos de cobertura.
  if (names.has('evidence')) ['page','locator_type','locator_id','quote'].forEach(k=>names.add('evidence.'+k));
  const get = (u,k) => k==='articleId' ? slot(u,k) : k==='tipo' ? typed(typeOf(u)) : k==='idNativo' ? native(u) : k==='texto' ? (typeof u.dadosOriginais==='string' ? typed(u.dadosOriginais) : ['ausente']) : k.startsWith('evidence.') ? slot(u.dadosOriginais.evidence,k.slice(9)) : slot(u.dadosOriginais,k);
  return Object.fromEntries([...names].sort().map(k => [k, Object.fromEntries(['ausente','nulo','vazio','presente'].map(s => [s,rows.filter(r=>state(get(r.u,k))===s).length]))]));
}
function measure(units) {
  const rows=units.map((u,index)=>({u,index,U:candidate(u,'U'),T:candidate(u,'T')}));
  const nativeGroups=groups(rows,r=>nativeKey(r.u)), nativeAmbiguous=new Set(nativeGroups.flatMap(g=>g.filter(r=>typeOf(r.u)==='formulas').map(r=>r.index)));
  for (const h of ['U','T']) {
    const duplicate=new Set(groups(rows,r=>r[h].chave).flatMap(g=>g.map(r=>r.index)));
    rows.forEach(r=>{r[h].motivos=minimum(r.u);if(duplicate.has(r.index))r[h].motivos.push('candidata repetida');if(nativeAmbiguous.has(r.index))r[h].motivos.push('chave nativa de fórmula ambígua');r[h].elegivel=r[h].motivos.length===0;});
  }
  const stats = list => ({ denominador:list.length, ...Object.fromEntries(['U','T'].map(h=>[h,{
    cobertura:list.filter(r=>r[h].elegivel).length,
    excluidas:list.filter(r=>!r[h].elegivel).map(r=>({...member(r),motivos:r[h].motivos})),
    campos:measuredFields(list,h), repetidas:groupInfo(groups(list,r=>r[h].chave)),
    colisoesCriptograficas:groupInfo(groups(list,r=>r[h].chave).filter(g=>new Set(g.map(r=>r[h].preimagemDoConteudo)).size>1)),
  }])), indistinguiveisNaBase:groupInfo(groups(list,r=>entire(r.u))) });
  return { rows, porTipo:Object.fromEntries(TYPES.map(t=>[t,stats(rows.filter(r=>typeOf(r.u)===t))])),total:stats(rows),idsNativos:groupInfo(nativeGroups),camposOmitidosPorT:rows.filter(r=>r.u.dadosOriginais && typeof r.u.dadosOriginais==='object').map(r=>({...member(r),campos:Object.keys(r.u.dadosOriginais).filter(k=>k!=='id'&&!FIELDS[typeOf(r.u)].includes(k)).sort()})).filter(r=>r.campos.length) };
}
function controls(main, supplemental, oldGroups) {
  const positives=oldGroups.map((g,i)=>{
    const rows=g.unidades.map(m=>main.rows[m.indiceUnidade]);
    const signatures=k=>rows.map(r=>json(slot(r.u.dadosOriginais,k)));
    const fields=[...new Set(rows.flatMap(r=>Object.keys(r.u.dadosOriginais)))].sort();
    const distinction=k=>rows.every(r=>own(r.u.dadosOriginais,k)) ? {aplicavelATodos:true,valoresDistintos:new Set(signatures(k)).size,separaTodos:new Set(signatures(k)).size===rows.length} : {aplicavelATodos:false,unidadesComCampo:rows.filter(r=>own(r.u.dadosOriginais,k)).length};
    return {grupo:i+1,membros:rows.map(member),claim:distinction('claim'),verbatim_quote:distinction('verbatim_quote'),camposQueDiferem:fields.filter(k=>new Set(signatures(k)).size>1),tiposDistintos:new Set(rows.map(r=>typeOf(r.u))).size,indistinguiveisCompletos:new Set(rows.map(r=>entire(r.u))).size===1,...Object.fromEntries(['U','T'].map(h=>[h,{candidatasDistintas:new Set(rows.map(r=>r[h].chave)).size,separaTodos:new Set(rows.map(r=>r[h].chave)).size===rows.length}]))};
  });
  const all=[...main.rows,...supplemental.rows];
  const negatives=TYPES.map(t=>{
    const r=all.find(r=>typeOf(r.u)===t);if(!r)throw Error('Controle sem representante: '+t);
    const copy=clone(r.u);copy.enderecoNaBase={sha:'snapshot-ficticio',arquivo:'outro.ts',campo:t,indiceBaseZero:999};copy.origens=['outra'];copy.conferenciaPublicacao={estado:'controle'};copy.score=0.999;
    const pair=measure([r.u,copy]);
    return {tipo:t,origem:member(r),sinteticoForaDoDenominador:true,U:pair.total.U.repetidas,T:pair.total.T.repetidas,mesmoConteudo:entire(r.u)===entire(copy)};
  });
  const changes=[];
  const mutate=(t,field,value,expected)=>{
    const r=all.find(r=>typeOf(r.u)===t),copy=clone(r.u);
    if(field==='texto')copy.dadosOriginais+=value;else copy.dadosOriginais[field]=value(r.u.dadosOriginais[field]);
    changes.push({tipo:t,campo:field,esperado:expected,observado:Object.fromEntries(['U','T'].map(h=>[h,candidate(copy,h).chave!==r[h].chave])),idNativoPreservado:json(native(copy))===json(native(r.u))});
  };
  mutate('key_claims','claim',s=>s+' ',{U:true,T:true});mutate('key_claims','verbatim_quote',s=>s+' ',{U:true,T:true});
  mutate('key_claims','usable_as',()=> 'categoria-controle',{U:true,T:false});
  mutate('thresholds','value',n=>n+1,{U:true,T:true});mutate('formulas','latex',s=>s+' ',{U:true,T:true});
  mutate('formulas','label',s=>(s||'')+' ',{U:true,T:false});mutate('limitations','texto',' ',{U:true,T:true});mutate('recommendations','texto',' ',{U:true,T:true});
  mutate('benchmark','n_alternatives',n=>(n??0)+1,{U:true,T:true});
  const reverseKeys=v=>Array.isArray(v)?v.map(reverseKeys):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).reverse().map(k=>[k,reverseKeys(v[k])])):v;
  const reordered=main.rows.map(r=>({r,u:reverseKeys(r.u)})).reverse();
  return {positivos:positives,negativos:negatives,volatilidade:changes,reordenacao:Object.fromEntries(['U','T'].map(h=>[h,{comparadas:reordered.length,inalteradas:reordered.filter(({r,u})=>candidate(u,h).chave===r[h].chave).length}]))};
}
function inventoryArticles(read, files) {
  const ts=require('typescript');
  const inventory=[], supplemental=[];
  files.forEach(file=>{
    if (file === 'lib/rag/articles/_template.ts') return; // Modelo não incluído em ARTICLES.
    const source=read(file).toString('utf8');
    const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const context={exports:{}};vm.runInNewContext(js,context,{timeout:1000});const a=context.exports.default;
    if(!a||!nonempty(a.id))throw Error('Artigo sem export de dados');
    const vectors={};
    VECTORS.forEach(t=>{
      if(!Array.isArray(a[t]))throw Error('Vetor ausente: '+file+'/'+t);
      vectors[t]={unidades:a[t].length,idsNativos:a[t].filter(x=>nonempty(x?.id)).length,campos:[...new Set(a[t].flatMap(x=>typeof x==='string'?['texto']:Object.keys(x)))].sort()};
      a[t].forEach((d,i)=>supplemental.push({articleId:a.id,tipo:t,dadosOriginais:JSON.parse(json(d)),enderecoNaBase:{sha:SNAPSHOT,arquivo:file,campo:t,indiceBaseZero:i}}));
    });
    inventory.push({articleId:a.id,arquivo:file,sha256Fonte:sha(Buffer.from(source,'utf8')),vetores:vectors});
  });
  return {inventory,supplemental};
}
function readInputs(root) {
  const read=p=>execFileSync('git',['show',SNAPSHOT+':'+p],{cwd:root,maxBuffer:10*1024*1024});
  const manifest=JSON.parse(read('docs/dados/a33-etapa4/evidencias.json'));
  const previous=JSON.parse(read('docs/dados/a33-identidade-derivada/medicao.json'));
  const trace=JSON.parse(read('docs/dados/a33-identidade-derivada/rastreabilidade.json'));
  const c1=JSON.parse(read('docs/dados/a33-etapa4/C1-recuperacao.json'));
  const files=execFileSync('git',['ls-tree','-r','--name-only',SNAPSHOT,'lib/rag/articles'],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(f=>f.endsWith('.ts'));
  const {inventory,supplemental}=inventoryArticles(read,files);
  return {units:manifest.porTrecho,previous,trace,c1,inventory,supplemental};
}
function run(root=path.resolve(__dirname,'..')) {
  const input=readInputs(root), before=json(input.units);
  if(input.units.length!==165||input.units.some(u=>u.trechoId!==null))throw Error('Denominador ou IDs diferente do protocolo');
  const main=measure(input.units),extra=measure(input.supplemental);
  const old=input.previous.medicoes.total.indistinguiveisPelaComposicao.membros;
  const control=controls(main,extra,old);
  if(json(input.units)!==before)throw Error('Entrada alterada');
  const c1=input.c1.trechos.map(t=>{
    const r=main.rows.find(r=>json(r.u.enderecoNaBase)===json(t.enderecoNaBase));if(!r)throw Error('C1 sem endereço correspondente');
    return {...member(r),U:r.U.elegivel,T:r.T.elegivel,motivosU:r.U.motivos,motivosT:r.T.motivos};
  });
  const baseline=Object.fromEntries(TYPES.map(t=>[t,{denominador:main.porTipo[t].denominador,coberturaAnterior:input.previous.elegiveis.filter(x=>typeOf(x)===t).length,excluidasAnteriores:input.previous.excluidas.filter(x=>typeOf(x)===t)}]));
  const report={snapshot:SNAPSHOT,protocolo:PROTOCOLO,esquemaAdotado:false,objetos:{U:'Versão do conteúdo completo da unidade, ancorada em recorte quando existente.',T:'Versão da projeção de conteúdo por tipo, ancorada em recorte quando existente.'},limites:['Não é identidade estável de claim.','Não é atestado de fidelidade à publicação.','Endereço não é identidade.','Igualdade de cobertura não demonstra equivalência semântica das composições.'],principal:{porTipo:main.porTipo,total:main.total,idsNativos:main.idsNativos,camposOmitidosPorT:main.camposOmitidosPorT},complementar:{nota:'Cinco vetores; não somar ao principal: há sobreposição.',arquivoExcluido:{arquivo:'lib/rag/articles/_template.ts',motivo:'Modelo vazio, não integra ARTICLES em lib/rag/index.ts.'},artigos:input.inventory,porTipo:extra.porTipo,total:extra.total,idsNativos:extra.idsNativos,camposOmitidosPorT:extra.camposOmitidosPorT},linhaDeBase:baseline,controles:control,C1:c1,coberturaC1:{chunksFixados:{denominador:c1.length,U:c1.filter(x=>x.U).length,T:c1.filter(x=>x.T).length},incluindoContextoEstatico:{denominador:main.total.denominador,U:main.total.U.cobertura,T:main.total.T.cobertura},adocao:false},pendencias:{trechoIdNulo:input.units.filter(u=>u.trechoId===null).length,publicacoesPendentes:input.units.filter(u=>u.conferenciaPublicacao.estado==='pendente').length,claimsComCamposDivergentes:input.units.filter(u=>u.comparacaoDosCampos?.iguais===false).length}};
  const rowTrace=r=>({...member(r),trechoId:null,idNativo:native(r.u),...Object.fromEntries(['U','T'].map(h=>{const {preimagemDoConteudo,...publicFields}=r[h];return [h,publicFields];}))});
  const trace={snapshot:SNAPSHOT,protocolo:PROTOCOLO,esquemaAdotado:false,enderecoNaoEhIdentidade:true,preimagens:'Reproduzíveis a partir do snapshot e dos campos declarados no protocolo; comparadas em memória antes de emitir este registro. ID nativo está literal na chave.',principal:main.rows.map(r=>({...rowTrace(r),textoPreparado:{snapshot:SNAPSHOT,arquivo:'docs/dados/a33-identidade-derivada/rastreabilidade.json',vetor:'entradas',indice:r.index,sha256Textos:input.trace.entradas[r.index].textosPreparados.map(t=>t.sha256TextoUTF8)}})),complementar:extra.rows.map(rowTrace)};
  fs.mkdirSync(path.join(root,OUT),{recursive:true});
  for(const [file,value] of [['medicao.json',report],['rastreabilidade.json',trace]])fs.writeFileSync(path.join(root,OUT,file),json(value)+'\n');
  console.log(json({principal:Object.fromEntries(Object.entries(main.porTipo).map(([k,v])=>[k,{n:v.denominador,U:v.U.cobertura,T:v.T.cobertura}])),total:main.total.denominador,complementar:extra.total.denominador,complementarU:extra.total.U.cobertura,complementarT:extra.total.T.cobertura,C1:c1,positivos:control.positivos,negativos:control.negativos.map(n=>({tipo:n.tipo,U:n.U.grupos,T:n.T.grupos})),pendencias:report.pendencias}));
  return report;
}
module.exports={typed,slot,candidate,measure,controls,inventoryArticles,readInputs,typeOf,entire,run,SNAPSHOT,PROTOCOLO};
if(require.main===module)run();
