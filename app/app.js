const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);

/* ================= DADOS VERIFICADOS (gerados por pipeline/08_build_app.py) ================= */
const DATA=/*__DATA__*/null;
const {SETOR,EMP,MET,PROV,ND,VERIF,ICONS,BRAND}=DATA;
const ic=n=>ICONS[n]||"";
const hydrate=(root=document)=>{root.querySelectorAll("[data-ic]").forEach(el=>{if(!el.dataset.done){el.innerHTML=ic(el.dataset.ic);el.dataset.done=1}});
  root.querySelectorAll("img[data-brand]").forEach(el=>{if(!el.getAttribute("src"))el.src=BRAND[el.dataset.brand]})};
const SECT_IC={siderurgia:"industry",mineracao:"hammer",bancos:"bank",energia:"flash",varejo:"shopping-bag",petroleo:"droplet"};
const logo=(e,cls="")=>EMP[e].logo?`<span class="lg ${cls}"><img src="${EMP[e].logo}" alt="${esc(EMP[e].nome)}"></span>`:`<span class="lg mono ${cls}">${esc(EMP[e].nome)}</span>`;
const SETORES=[
 {id:"siderurgia",nome:"Siderurgia",desc:"Aço longo, plano e ferroligas",ativo:true},
 {id:"mineracao",nome:"Mineração",desc:"Minério de ferro e metais"},
 {id:"bancos",nome:"Bancos",desc:"Grandes bancos de varejo"},
 {id:"energia",nome:"Energia elétrica",desc:"Geração, transmissão e distribuição"},
 {id:"varejo",nome:"Varejo",desc:"Varejo alimentar e de moda"},
 {id:"petroleo",nome:"Petróleo e gás",desc:"Exploração, refino e distribuição"}];
const ORDER=Object.keys(MET);
const GROUPS=[...new Set(ORDER.map(k=>MET[k].g))];

/* ================= ESTADO ================= */
const KEY="balanco-lado-a-lado-analises-v1";
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const fresh=()=>({id:uid(),created:Date.now(),updated:Date.now(),view:"dash",step:"start",picks:[],metrics:[],title:"",concl:[],verdict:null,tab:"resumo",msgs:[]});
let STORE={list:[]};
let S=fresh();
function save(){if(!S.msgs.length)return;S.updated=Date.now();const i=STORE.list.findIndex(a=>a.id===S.id);if(i>=0)STORE.list[i]=S;else STORE.list.unshift(S);
  STORE.list.sort((a,b)=>b.updated-a.updated);STORE.list=STORE.list.slice(0,30);try{localStorage.setItem(storeKey(),JSON.stringify(STORE))}catch(e){}}
function openAnalysis(id){const a=STORE.list.find(x=>x.id===id);if(!a)return;S=JSON.parse(JSON.stringify(a));if(S.step==="building")S.step=S.title?"card":"metrics";seenMsgs=S.msgs.length;closeSide();vt(render)}
function deleteAnalysis(id){STORE.list=STORE.list.filter(a=>a.id!==id);try{localStorage.setItem(storeKey(),JSON.stringify(STORE))}catch(e){}if(S.id===id)S=fresh();render()}
const anTitle=a=>a.picks?.length===2?`${EMP[a.picks[0]].nome} × ${EMP[a.picks[1]].nome}`:"Tese do setor";
function when(t){const d=new Date(t),n=new Date(),hm=d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
  return d.toDateString()===n.toDateString()?`Hoje, ${hm}`:d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})+", "+hm}
let slide=0,sample=null,downloads=null,busy=false,editIdx=null,tabAnim=false;
const ACCT_KEY="balanco-lado-a-lado-conta-v1";
const ROLES=["Analista de research","Gestor(a) de investimentos","Membro de comitê","Estudante","Professor(a)"];
/* contas locais: várias por navegador, cada uma com o próprio histórico; sem senha */
const ACCTS_KEY="balanco-lado-a-lado-contas-v2";
let ACC={list:[],atual:null};try{const v=JSON.parse(localStorage.getItem(ACCTS_KEY));if(v&&Array.isArray(v.list))ACC=v}catch(e){}
try{const old=JSON.parse(localStorage.getItem(ACCT_KEY));if(old&&old.nome&&!ACC.list.length){const a={id:uid(),...old};ACC.list.push(a);ACC.atual=a.id;localStorage.setItem(ACCTS_KEY,JSON.stringify(ACC));localStorage.removeItem(ACCT_KEY)}}catch(e){}
const saveAcc=()=>{try{localStorage.setItem(ACCTS_KEY,JSON.stringify(ACC))}catch(e){}};
let ACCT=ACC.list.find(a=>a.id===ACC.atual)||null;
const storeKey=()=>ACCT?KEY+":"+ACCT.id:KEY+":anon";
function loadStore(){let v=null;try{v=JSON.parse(localStorage.getItem(storeKey()))}catch(e){}
  if(!v&&ACCT){let legacy=null;try{legacy=JSON.parse(localStorage.getItem(KEY))}catch(e){}
    if(legacy&&Array.isArray(legacy.list)){v=legacy;try{localStorage.setItem(storeKey(),JSON.stringify(v));localStorage.removeItem(KEY)}catch(e){}}}
  STORE=v&&Array.isArray(v.list)?v:{list:[]}}
loadStore();
function login(id){ACC.atual=id;saveAcc();ACCT=ACC.list.find(a=>a.id===id)||null;loadStore();S=fresh();seenMsgs=0;
  if(location.hash==="#painel")vt(()=>{render();scrollTo(0,0)});else location.hash="#painel"}
function logout(){ACC.atual=null;saveAcc();ACCT=null;STORE={list:[]};S=fresh();closeD();location.hash="#inicio";if(curView!=="landing")vt(()=>{render();scrollTo(0,0)})}
let suRole=ROLES[0];
const vt=fn=>document.startViewTransition&&!matchMedia("(prefers-reduced-motion: reduce)").matches?document.startViewTransition(fn):fn();
const initials=n=>(n||"V").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();

/* ================= FORMATAÇÃO ================= */
const nf=(v,d=0)=>v.toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
function fmt(v,un){if(v==null)return "n.d.";
  if(un==="R$ mi")return (v<0?"−":"")+"R$ "+nf(Math.abs(v))+" mi"; if(un==="%")return (v<0?"−":"")+nf(Math.abs(v),1)+"%";
  if(un==="x")return (v<0?"−":"")+nf(Math.abs(v),Math.abs(v)<1?2:1)+"x"; if(un==="R$/t")return "R$ "+nf(v)+"/t"; return nf(v)+" "+un}
const val=(k,e,i=0)=>(MET[k].vals[e]||[null,null])[i];
const per=(e,i=0)=>EMP[e].per[i];
function chipOf(s){if(!s)return "";const c={verificado:["",`p.${s.pagina} ✓`],calculado:["calc","calc"],cvm:["cvm","CVM"],mercado:["cvm","B3"]}[s.tipo]||["",""];return `<span class="chip ${c[0]}">${c[1]}</span>`}
function numB(k,e,i=0){const v=val(k,e,i);if(v==null){const r=ND[`${k}|${e}`]||"Não disponível";return `<span class="nd" title="${esc(r)}">n.d.</span>`}
  return `<button class="num" data-k="${k}" data-e="${e}" data-i="${i}">${esc(fmt(v,MET[k].un))}</button>${chipOf(PROV[`${k}|${e}|${i}`])}`}
function delta(k,e){const v=val(k,e,0),p=val(k,e,1);if(p==null||v==null)return "";
  if(MET[k].un==="%"){if(p<0)return `<span class="dp ns" title="Base negativa no período anterior">n.s.</span>`;const d=v-p;return `<span class="dp ${d>=0?"up":"down"}"><b>${d>=0?"↑":"↓"}</b>${(d>=0?"+":"−")+nf(Math.abs(d),1)} p.p.</span>`}
  if(p<=0)return `<span class="dp ns" title="Base negativa no período anterior">n.s.</span>`;const d=(v/p-1)*100;return `<span class="dp ${d>=0?"up":"down"}"><b>${d>=0?"↑":"↓"}</b>${(d>=0?"+":"−")+nf(Math.abs(d),1)}%</span>`}
const avail=k=>S.picks.length===2&&S.picks.every(e=>val(k,e)!=null);
function leader(k){const [a,b]=S.picks,va=val(k,a),vb=val(k,b);if(va==null||vb==null)return null;
  if(k==="volume"||k==="receita")return {e:va>vb?a:b,why:"maior escala"};
  const better=MET[k].lb?(va<vb?a:b):(va>vb?a:b);return {e:better,why:MET[k].mult?"mais barata":MET[k].lb?"menos alavancada":"melhor"}}
const co=e=>EMP[e], dot=e=>`<i class="dot" style="background:${EMP[e].cor}"></i>`;
const hasCSN=()=>S.picks.includes("c");
function defaultMetrics(){const aj=!hasCSN();
  return ORDER.filter(k=>avail(k)&&!(aj&&(k==="ebitda"||k==="margem"))&&!(!aj&&(k==="ebitda_aj"||k==="margem_aj")))}
const mgn=()=>hasCSN()?"margem":"margem_aj";
const srcTag=(f,u,p)=>`<span class="src">${u&&/^https?:/.test(u)?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(f)}${p?`, pág. ${p}`:""}</a>`:`${esc(f)}${p?`, pág. ${p}`:""}`}</span>`;

/* ================= WIDGETS ================= */
function sensRows(){return SETOR.sens.map(s=>`<div class="srow"><span>${esc(s.d)}</span><span class="lvlbar">${[1,2,3].map(i=>`<i class="${i<=s.n?"on":""}"></i>`).join("")}</span><span class="dado">${esc(s.dado)} <span class="src">${esc(s.f)}</span></span></div>`).join("")}
function wSector(){const v=SETOR.veredito,E=EMP[v.escolha];
  return `<div class="widget">
   <div class="verdict"><div class="top"><span>Este setor é um bom lugar para investir?</span><span class="lvl">${v.nivel}</span></div>
     <h3>${esc(v.frase)}</h3>
     <div class="pick"><span><b>Empresa para a Etapa 2: ${E.nome}</b><br>${esc(v.porque)}</span></div></div>
   <div class="sec-h"><b>Sensibilidade do setor</b><span>Produção siderúrgica (IBGE) contra cada driver, 2019–2026</span></div>
   <div class="sens">${sensRows()}</div>
   <span class="small">Correlação não é causalidade. Variações de 12 meses se sobrepõem, então o número efetivo de observações é menor que o de meses; use como contexto.</span>
   <div class="sec-h"><b>Os 8 pontos da tese</b><span>Abra para ver os fatos e as fontes</span></div>
   <div class="topics">${SETOR.topicos.map((t,i)=>`<details class="tp"><summary><span class="n">${String(i+1).padStart(2,"0")}</span><span><b>${esc(t.t)}</b><span class="t">${esc(t.tese)}</span></span><span class="chev">${ic("nav-arrow-down")}</span></summary><ul>${t.pts.map(p=>`<li>${p.tipo==="interpretacao"?`<span class="kind">leitura</span>`:""}${esc(p.x)} ${srcTag(p.f,p.u,p.p)}</li>`).join("")}</ul></details>`).join("")}</div>
   ${S.step==="sector"?`<div class="wfoot"><span class="note">Próximo passo: comparar duas empresas do setor</span><button class="pill dark" data-do="go-cos">Ver as principais empresas</button></div>`:""}
  </div>`}
function wCompanies(locked){const sel=S.picks;
  return `<div class="widget ${locked?"locked":""}"><div class="cos">${["g","u","c","f"].map(k=>{const e=EMP[k];return `<button class="coc" data-pick="${k}" aria-pressed="${sel.includes(k)}" ${!e.ok||locked?"disabled":""}>
     <span class="h">${e.ok&&e.logo?logo(k):`<span class="lg mono">${esc(e.nome)}</span>`}${e.ok?`<span class="ck">${sel.includes(k)?ic("check"):""}</span>`:`<span class="tag">Sem dados</span>`}</span>
     <span><b>${e.nome} <small>· ${e.tk}</small></b><small>${e.desc}</small></span>${e.aviso?`<span class="tag" style="background:var(--amber-soft);color:var(--amber);white-space:normal">${esc(e.aviso)}</span>`:""}</button>`}).join("")}</div>
   ${locked?"":`<div class="wfoot"><span class="note">${sel.length}/2 escolhidas</span><button class="pill dark" data-do="confirm-cos" ${sel.length!==2?"disabled":""}>Comparar estas duas</button></div>`}</div>`}
function wMetrics(locked){
  return `<div class="widget ${locked?"locked":""}"><div class="mgroups">${GROUPS.map(g=>`<div class="mg"><h4>${g}</h4><div class="mets">${ORDER.filter(k=>MET[k].g===g).map(k=>{const ok=avail(k),why=ok?"":S.picks.map(e=>ND[`${k}|${e}`]).filter(Boolean)[0]||"";
     return `<label class="met ${ok?"":"off"}"><input type="checkbox" data-met="${k}" ${S.metrics.includes(k)?"checked":""} ${locked||!ok?"disabled":""}><span><b>${esc(MET[k].nome)}</b>${MET[k].rel?`<span class="rel">chave no setor</span>`:""}<small>${esc(ok?MET[k].porque:why)}</small></span></label>`}).join("")}</div></div>`).join("")}</div>
   ${locked?"":`<div class="wfoot"><span class="note">${S.metrics.length} selecionadas · mínimo 4</span><button class="pill dark" data-do="confirm-mets" ${S.metrics.length<4?"disabled":""}>Confirmar métricas</button></div>`}</div>`}

const TABS=[["resumo","Resumo"],["kpis","KPIs"],["modelo","Modelo de negócio"],["mult","Múltiplos"],["quali","Qualitativo"]];
function kpiTable(keys){const [a,b]=S.picks;let last="";
  return `<div class="tblwrap"><table><thead><tr><th>Métrica</th><th>${dot(a)} ${co(a).nome} · ${per(a)}</th><th>${dot(b)} ${co(b).nome} · ${per(b)}</th><th>Destaque</th></tr></thead><tbody>${keys.map(k=>{const m=MET[k],L=leader(k);
    const g=m.g!==last?`<tr class="grp"><td colspan="4">${m.g}</td></tr>`:"";last=m.g;
    return g+`<tr><td class="m">${esc(m.nome)}</td><td><span class="v">${numB(k,a)}</span>${delta(k,a)}</td><td><span class="v">${numB(k,b)}</span>${delta(k,b)}</td><td>${L?`<span class="best">${dot(L.e)}${co(L.e).nome} · ${L.why}</span>`:""}</td></tr>`}).join("")}</tbody></table></div>
   <span class="small">Variações contra o mesmo trimestre do ano anterior. Consolidado. ROE, ROIC e alavancagem em 12 meses; múltiplos com preço de ${VERIF.dataPreco.split("-").reverse().join("/")}.${hasCSN()?" CSN: dados do 2T26 e EBITDA pelo critério CVM 156 nas duas empresas.":""}</span>`}
function tabResumo(){const [a,b]=S.picks,keys=[mgn(),"roic","alav","ev"].filter(k=>S.metrics.includes(k)).slice(0,3);
  return `<ol class="concl">${S.concl.map(c=>`<li>${esc(c)}</li>`).join("")}</ol>
   <div class="tiles">${keys.map(k=>`<div class="tile"><span class="k">${esc(MET[k].nome)}</span><div class="pair">${[a,b].map(e=>`<div><span>${dot(e)} ${co(e).nome}</span><b>${numB(k,e)}</b></div>`).join("")}</div></div>`).join("")}</div>`}
function tabModelo(){const [a,b]=S.picks,pal=["var(--ink)","var(--violet)","var(--orange)","#9aa0a9"];
  return `<div class="bm">${[a,b].map(e=>{const E=co(e);return `<div class="bmc"><h5>${logo(e,"sm")}${E.nome}</h5><p class="para">${esc(E.resumo)}</p>
   ${E.mix?`<span class="small">Mix do EBITDA ajustado · ${per(e)} · ${esc(E.mixFonte)}</span><div class="mix">${E.mix.map((s,i)=>`<i style="flex:${Math.max(s[1],1)};background:${pal[i]}"></i>`).join("")}</div>
   <div class="mixl">${E.mix.map((s,i)=>`<span><i style="background:${pal[i]}"></i>${esc(s[0])} ${s[1]}%</span>`).join("")}</div>`:`<span class="small">${esc(E.mixFonte)}</span>`}
   <div>${E.fontes.map(f=>srcTag(f.t,f.u,null)).join(" ")}</div></div>`}).join("")}</div>
   <div class="read"><b>Nossa leitura:</b> parte da diferença de margem vem de onde cada uma opera, não só de eficiência. Compare o segmento Brasil de uma com o da outra antes de concluir quem é melhor.</div>`}
function tabMult(){const [a,b]=S.picks,ks=["ev","pvp","pl"].filter(k=>S.metrics.includes(k));
  return `<div class="mbars">${ks.map(k=>{const vs=[a,b].map(e=>val(k,e)),mx=Math.max(...vs.filter(v=>v!=null).map(Math.abs),0.01);
    return `<div class="mbar"><span>${esc(MET[k].nome)}</span><div class="tr">${[a,b].map((e,i)=>`<div><i style="width:${vs[i]==null?0:Math.max(4,Math.abs(vs[i])/mx*100)}%;background:${co(e).cor}"></i><span>${numB(k,e)}</span></div>`).join("")}</div></div>`}).join("")||`<span class="note">Nenhum múltiplo selecionado.</span>`}</div>
   <div class="read"><b>Qual múltiplo usar:</b> em siderurgia, EV/EBITDA. O P/L distorce porque o lucro de 12 meses carrega efeitos pontuais, e P/VP abaixo de 1x é o que se espera de um setor que rende menos que o custo de capital. Barato não quer dizer bom: leia junto com o ROIC.</div>`}
function tabQuali(){const [a,b]=S.picks;
  return `<div class="ql">${[a,b].map(e=>{const Q=co(e).quali;return `<div class="bmc"><h5>${logo(e,"sm")}${co(e).nome}</h5>
   <span class="lab">Forças</span><ul>${Q.f.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
   <span class="lab">Fraquezas</span><ul>${Q.fr.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
   <span class="lab">O que observar</span><ul>${Q.r.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`}).join("")}</div>
   <div class="read"><b>Interpretação:</b> o número mostra o trimestre; o qualitativo diz se ele se repete. Margem sustentada por um mercado protegido depende da política tarifária; margem sustentada por custo é mais durável.</div>`}
function wCard(i){const last=S.msgs.findLastIndex(x=>x.w==="card")===i,pending=last&&!S.verdict;const [a,b]=S.picks;
  const body={resumo:tabResumo,kpis:()=>kpiTable(S.metrics),modelo:tabModelo,mult:tabMult,quali:tabQuali}[S.tab]();
  return `<div class="widget">
   <div class="cmphead"><div><div class="eyebrow">Comparativo · ${per(a)}${per(a)!==per(b)?` × ${per(b)}`:""}</div><h3 class="ctitle">${esc(S.title)}</h3></div><div class="vs">${logo(a,"sm")}<span class="note">×</span>${logo(b,"sm")}</div></div>
   <div class="tabs" role="tablist">${TABS.map(([k,l])=>`<button role="tab" aria-selected="${S.tab===k}" data-tab="${k}">${l}</button>`).join("")}</div>
   <div class="tabbody${tabAnim&&last?" anim":""}">${body}</div>
   <div class="wfoot">${pending?`<span class="note">Clique em qualquer número para ver de onde ele saiu</span><span class="choices"><button class="pill ghost" data-do="reject">Recusar</button><button class="pill dark" data-do="accept">Aceitar e gerar apresentação</button></span>`
     :last&&S.verdict?`<span class="vd ${S.verdict==="ok"?"ok":"no"}">${S.verdict==="ok"?"✓ Aceito":"Recusado"}</span>`:`<span class="vd no">Versão anterior</span>`}</div></div>`}
function wDeck(){const sl=buildSlides();
  return `<div class="widget"><div class="thumbs">${sl.map((s,i)=>`<button class="thumb ${i===0?"first":""}" data-open="${i}"><span>${String(i+1).padStart(2,"0")}</span>${esc(s.label)}</button>`).join("")}</div>
   <div class="wfoot"><span class="note">${sl.length} slides · setor + comparativo</span><span class="choices"><button class="pill ghost" data-do="pdf">Baixar PDF</button><button class="pill dark" data-open="0">Abrir apresentação</button></span></div></div>`}
const wMini=keys=>`<div class="widget">${kpiTable(keys)}</div>`;

/* ================= RENDER ================= */
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
function countUp(){document.querySelectorAll("[data-count]").forEach(el=>{const to=+el.dataset.count,suf=el.dataset.suf||"";if(RM){el.textContent=to+suf;return}
  const t0=performance.now(),d=1100;const step=t=>{const k=Math.min(1,(t-t0)/d),e=1-Math.pow(1-k,3);el.textContent=Math.round(to*e)+suf;if(k<1)requestAnimationFrame(step)};requestAnimationFrame(step)})}
const DEMO=["ebitda_aj|g|0","ebitda_aj|u|0","receita|g|0"].filter(k=>PROV[k]&&PROV[k].tipo==="verificado");
let demoI=0,demoT=null;
function showDemo(){const key=DEMO[demoI%DEMO.length];if(!key)return;const [k,e]=key.split("|"),s=PROV[key],d=$("demo");
  $("d-doc").textContent=s.fonte;$("d-pag").textContent="pág. "+s.pagina;$("d-hl").textContent=s.trecho;
  $("d-k").textContent=`${MET[k].nome} · ${EMP[e].nome} · ${EMP[e].per[0]}`;$("d-v").textContent=fmt(val(k,e),MET[k].un);$("d-ok").textContent=`✓ Verificado · pág. ${s.pagina}`;
  [...$("d-dots").children].forEach((x,i)=>x.classList.toggle("on",i===demoI%DEMO.length));
  d.classList.remove("run");void d.offsetWidth;d.classList.add("run")}
function startDemo(){if(demoT||!DEMO.length)return;showDemo();if(RM)return;demoT=setInterval(()=>{demoI++;showDemo()},4200)}
function stopDemo(){clearInterval(demoT);demoT=null}
function renderLanding(){
  $("l-stats").innerHTML=[[VERIF.aprovadas,`de ${VERIF.metricas} números do ITR conferidos na página e no trecho exato`],[VERIF.cruzOk,`de ${VERIF.cruz} cruzamentos com reconciliações publicadas pelas empresas`],
    [Object.keys(PROV).length,"números no painel, cada um com um clique até a fonte"],[VERIF.armOk,`de ${VERIF.arm} armadilhas clássicas barradas pelo verificador`]]
    .map(([n,t])=>`<div class="stat"><b data-count="${n}">${n}</b><span>${t}</span></div>`).join("");
  $("l-flow").innerHTML=[["PDF","ITRs do 3T26","Gerdau 80 págs. · Usiminas 110 págs."],["01","Extração declarativa",`${VERIF.metricas} métricas lidas da linha exata`],["02","Verificação independente",`${VERIF.aprovadas}/${VERIF.metricas} aprovadas`],["03","Cruzamentos",`${VERIF.cruzOk}/${VERIF.cruz} com as empresas · ITR × CVM`],["✓","Painel","Só o que passou é publicado"]]
    .map(([i,b,t],k)=>`<div class="fl"><span class="ic">${i}</span><span><b>${b}</b><span>${t}</span></span>${k?`<span class="ok">${ic("check")} OK</span>`:""}</div>`).join("");
  $("l-cov").innerHTML=["g","u","c","f"].map(e=>{const E=EMP[e];return `<div class="covc ${E.ok?"":"off"}">${E.logo?logo(e,"lgx"):`<span class="lg mono lgx">${esc(E.nome)}</span>`}<div><div class="nm">${esc(E.nome)}</div><div class="tk">${E.tk} · ${esc(E.desc)}</div></div>${E.ok?(E.aviso?`<span class="tag">Dados do 2T26</span>`:`<span class="tag ok">3T26 verificado</span>`):`<span class="tag">Em breve</span>`}</div>`}).join("");
  countUp()}
const SUGG=[{t:"Este setor é um bom lugar para investir?",i:"page-search",h:"Tese do setor"},{t:"Compare Gerdau e Usiminas no 3T26",p:["g","u"],i:"stats-up-square",h:"Comparativo"},{t:"Compare Gerdau e CSN",p:["g","c"],i:"stats-up-square",h:"Comparativo"},{t:"Compare Usiminas e CSN",p:["u","c"],i:"stats-up-square",h:"Comparativo"}];
function renderDash(){const h=new Date().getHours(),sd=h<12?"Bom dia":h<18?"Boa tarde":"Boa noite",nm=(ACCT?.nome||"").trim().split(/\s+/)[0];
  $("greet").textContent=`${sd}${nm?", "+nm:""}.`;
  $("greet2").textContent="Qual setor vamos analisar hoje? Comece pela tese de um setor ou peça um comparativo entre duas empresas.";
  $("sugg").innerHTML=SUGG.map((x,i)=>`<button type="button" data-sugg="${i}">${ic(x.i)}<span>${esc(x.t)}</span><small>${x.h}</small></button>`).join("")}
function picksFrom(t){t=t.toLowerCase();const f=[];[["g","gerdau"],["u","usiminas"],["c","csn"],["c","siderúrgica nacional"]].forEach(([k,w])=>{if(t.includes(w)&&!f.includes(k))f.push(k)});return f.slice(0,2)}
async function startWith(picks,q,keep){await startSector("siderurgia",q,keep);if(picks&&picks.length===2){await wait(250);goCos();S.picks=picks;confirmCos()}}
var seenMsgs=0;
function renderThread(){
  const fresh=S.msgs.length>seenMsgs?seenMsgs:Infinity;seenMsgs=S.msgs.length;
  $("thread").innerHTML=S.msgs.map((m,i)=>{const f=i>=fresh?" fade":"";
    if(m.role==="user"){if(editIdx===i)return `<div class="msg user"><div class="editbox"><textarea id="edit-ta">${esc(m.text)}</textarea><div class="macts"><button class="pill sm" data-edit-cancel>Cancelar</button><button class="pill dark sm" data-edit-send>Reenviar</button></div></div></div>`;
      return `<div class="msg user${f}"><div class="ub">${m.typed&&!busy?`<button class="edit" data-edit="${i}" aria-label="Editar mensagem">${ic("edit-pencil")}</button>`:""}<div class="bubble">${esc(m.text)}</div></div></div>`}
    const lc=S.step!=="companies"||S.msgs.findLastIndex(x=>x.w==="companies")!==i, lm=S.step!=="metrics"||S.msgs.findLastIndex(x=>x.w==="metrics")!==i;
    const w=m.w==="sector"?wSector():m.w==="companies"?wCompanies(lc):m.w==="metrics"?wMetrics(lm):m.w==="card"?wCard(i):m.w==="deck"?wDeck():m.w==="mini"?wMini(m.keys):"";
    return `<div class="msg bot${f}"><span class="who"><img src="${BRAND.mark}" alt="">Fiscus</span>${m.thinking?`<div class="bubble thinking">${esc(m.text||"Pensando")}</div>`:(m.text?`<div class="bubble">${esc(m.text)}</div>`:"")}${w}</div>`}).join("");
  const ch=S.step==="rejected"?["Trocar métricas","Gerar outro título","Trocar empresas"]:(S.step==="done"||S.step==="card")?["Quem está mais barata?","Qual tem melhor ROIC?","Como está o endividamento?"]:[];
  $("choices").innerHTML=ch.map(c=>`<button class="pill ghost sm" data-choice="${esc(c)}">${esc(c)}</button>`).join("");
  $("q").placeholder={sector:"Pergunte sobre o setor ou siga para as empresas",companies:"Escolha duas empresas acima",metrics:"Ajuste as métricas acima e confirme"}[S.step]||"Pergunte sobre as métricas";
}
function renderSide(){const L=STORE.list;
  $("hist").innerHTML=L.length?L.map(a=>`<li class="${a.id===S.id&&S.view==="chat"?"cur":""}"><button class="open" data-an="${a.id}"><b>${esc(anTitle(a))}</b><span>Siderurgia · ${when(a.updated)}</span></button><button class="del " data-del="${a.id}" aria-label="Apagar análise">${ic("trash")}</button></li>`).join("")
   :`<li class="hist-empty">Suas análises aparecem aqui. Cada uma guarda a conversa inteira.</li>`;
  $("crumb").textContent=S.view==="dash"?"":`Siderurgia · ${anTitle(S)}`;
  const prontas=L.filter(a=>a.verdict==="ok").length,pares=L.filter(a=>a.picks?.length===2).length;
  if(!ACCT)return;
  $("me").innerHTML=`<div class="r"><span class="avt">${esc(initials(ACCT?.nome))}</span><span class="nm"><b>${esc(ACCT?.nome||"Você")}</b><small>${esc([ACCT?.funcao,ACCT?.inst].filter(Boolean).join(" · ")||"Perfil local")}</small></span><button class="logout" data-logout>Sair</button></div>
   <div class="r stats"><span><b>${L.length}</b> análises</span><span><b>${pares}</b> comparativos</span><span><b>${prontas}</b> prontas</span></div>
   <div class="r stats"><span><i class="dot" style="background:${sample?"var(--green-ios)":"var(--faint)"}"></i>${sample?"Claude conectado":"Modo demonstração"}</span></div>`}
function renderDD(){$("ddmenu").innerHTML=SETORES.map(x=>`<li role="option" data-dd="${x.id}" aria-selected="${x.ativo}" aria-disabled="${!x.ativo}" class="${x.ativo?"act":""}"><span>${x.nome}</span>${x.ativo?ic("check"):`<small>Em breve</small>`}</li>`).join("")}
function closeDD(){if($("ddmenu")){$("ddmenu").hidden=true;$("ddbtn").setAttribute("aria-expanded","false")}}
let boxOk=null;
function confirmBox(t,txt,ok,lbl="Apagar"){$("m-t").textContent=t;$("m-p").textContent=txt;$("m-ok").textContent=lbl;boxOk=ok;$("modal").hidden=false;$("m-ok").focus()}
function closeBox(){$("modal").hidden=true;boxOk=null}
async function resend(i,v){if(i===0){await startWith(picksFrom(v),v,{id:S.id,created:S.created})}else{S.msgs=S.msgs.slice(0,i);render();ask(v)}}
const route=()=>({"#painel":"painel","#entrar":"entrar","#criar-conta":"criar"})[location.hash]||"landing";
let curView=null;
function renderLogin(){$("accts").innerHTML=ACC.list.length?ACC.list.slice().sort((a,b)=>(b.ultimo||b.criado)-(a.ultimo||a.criado)).map(a=>`<li><button type="button" data-login="${a.id}"><span class="avt">${esc(initials(a.nome))}</span><span><b>${esc(a.nome)}</b><small>${esc([a.funcao,a.inst].filter(Boolean).join(" · "))}</small></span><span class="go">${ic("nav-arrow-right")}</span></button></li>`).join("")
  :`<li class="empty">Nenhuma conta neste navegador ainda.</li>`}
function renderSignup(){$("su-roles").innerHTML=ROLES.map(x=>`<button type="button" role="radio" aria-checked="${x===suRole}" data-role="${esc(x)}">${esc(x)}</button>`).join("")}
function renderAfter(){tabAnim=false}
function render(){setTimeout(renderAfter,0);let r=route();if(r==="painel"&&!ACCT)r=ACC.list.length?"entrar":"criar";curView=r;
  const auth=r==="entrar"||r==="criar";$("v-landing").hidden=r!=="landing";$("v-signup").hidden=!auth;$("signup").hidden=r!=="criar";$("login").hidden=r!=="entrar";$("v-app").hidden=r!=="painel";if(ACCT)save();
  if(auth){stopDemo();r==="criar"?renderSignup():renderLogin();hydrate();return}
  if(r==="landing"){if(!renderLanding.done){renderLanding();renderLanding.done=1}startDemo();hydrate();return}
  stopDemo();const dash=S.view==="dash";$("v-dash").hidden=!dash;$("v-chat").hidden=dash;
  if(dash)renderDash();else renderThread();renderSide();hydrate()}
addEventListener("hashchange",()=>{let r=route();if(r==="painel"&&!ACCT)r=ACC.list.length?"entrar":"criar";
  if(r!==curView){vt(()=>{render();scrollTo(0,0)});const h=location.hash.slice(1);if(r==="landing"&&h&&h!=="inicio")setTimeout(()=>document.getElementById(h)?.scrollIntoView(),50)}});
function openSide(){$("side").classList.add("open");$("sidescrim").hidden=false}
function closeSide(){$("side").classList.remove("open");$("sidescrim").hidden=true}
const scrollEnd=()=>requestAnimationFrame(()=>$("thread").lastElementChild?.scrollIntoView({block:"start",behavior:"smooth"}));
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const bot=(text,w,x)=>{const m={role:"bot",text,w,...x};S.msgs.push(m);return m};
const user=(t,typed)=>S.msgs.push({role:"user",text:t,typed:!!typed});

/* ================= FLUXO ================= */
async function startSector(id,q,keep){S=fresh();if(keep){S.id=keep.id;S.created=keep.created}S.view="chat";seenMsgs=0;user(q&&q.trim()?q.trim():SETORES.find(s=>s.id===id).nome,true);
  const m=bot("Lendo os dados do setor: produção, importação, juros, câmbio e os balanços das empresas",null,{thinking:true});render();scrollEnd();
  await wait(700);m.thinking=false;m.text="Minha resposta para \"vale investir?\" está no topo. Abaixo, os drivers medidos e os 8 pontos que sustentam a tese, cada um com a fonte.";m.w="sector";S.step="sector";render();scrollEnd()}
function goCos(){user("Ver as principais empresas");S.step="companies";bot("Estas são as principais siderúrgicas listadas na B3. Escolha duas para comparar.","companies");render();scrollEnd()}
function confirmCos(){user(S.picks.map(k=>co(k).nome).join(" × "));S.metrics=defaultMetrics();S.step="metrics";
  bot(hasCSN()?"Estas são as métricas do setor. Como a CSN só tem EBITDA no critério CVM 156, uso esse critério nas duas empresas para a comparação ser justa. O que não existe para alguma das duas fica desabilitado, com o motivo."
    :"Estas são as métricas do setor. Marquei como \"chave no setor\" as que mais explicam o resultado num negócio cíclico. O que não existe para alguma das duas fica desabilitado, com o motivo.","metrics");render();scrollEnd()}
function catalog(){const [a,b]=S.picks;return S.metrics.map(k=>{const m=MET[k];return `- ${m.nome}: ${co(a).nome} ${fmt(val(k,a),m.un)}${val(k,a,1)!=null?` (ano anterior ${fmt(val(k,a,1),m.un)})`:""}; ${co(b).nome} ${fmt(val(k,b),m.un)}${val(k,b,1)!=null?` (ano anterior ${fmt(val(k,b,1),m.un)})`:""}`}).join("\n")}
function defaultStory(){const [a,b]=S.picks,ks=S.picks.slice().sort().join("");
  if(ks==="gu")return {t:"Gerdau lucra nos EUA; no Brasil, as duas sofrem com o importado",c:["A Gerdau tem margem e retorno maiores, mas quase tudo vem da América do Norte, protegida por tarifa.","No Brasil, as margens das duas são parecidas: o aço importado aperta quem depende só do mercado local.","A Usiminas parece barata e tem caixa líquido, mas o retorno sobre o capital ainda é baixo."]};
  if(ks==="cg")return {t:"Gerdau combina retorno e balanço; a CSN carrega dívida pesada",c:["A Gerdau gera mais caixa por real vendido e quase não depende de dívida.","A CSN tem ativos integrados valiosos, mas a alavancagem alta consome o resultado.","No preço atual, a CSN só faz sentido para quem aposta em desalavancagem."]};
  return {t:"Usiminas tem o balanço; a CSN tem os ativos e a dívida",c:["A Usiminas atravessa o ciclo com caixa líquido.","A CSN tem integração com mineração e logística, mas a dívida pesa no resultado.","Nenhuma das duas remunera o capital acima da Selic hoje."]}}
async function writeStory(){const d=defaultStory();S.title=d.t;S.concl=d.c;S.tab="resumo";
  if(!sample){await wait(600);return}
  const [a,b]=S.picks;
  try{const r=await sample.json(`Você escreve o título e 3 conclusões de um slide para um comitê de investimentos comparando ${co(a).nome} e ${co(b).nome} (siderurgia).
Dados verificados:\n${catalog()}\nContexto: ${co(a).nome}: ${co(a).resumo}\n${co(b).nome}: ${co(b).resumo}\nSelic: ${nf(VERIF.selic,2)}% ao ano.
Regras: português; título até 12 palavras dizendo a conclusão; 3 conclusões de até 22 palavras, com opinião clara; NÃO escreva números.
Responda só JSON: {"titulo": string, "conclusoes": [string,string,string]}`,{modelTier:"quick"});
    const ok=s=>typeof s==="string"&&s.trim()&&!/\d/.test(s);
    if(ok(r?.titulo))S.title=r.titulo.trim().slice(0,120);
    if(Array.isArray(r?.conclusoes)&&r.conclusoes.length>=3&&r.conclusoes.slice(0,3).every(ok))S.concl=r.conclusoes.slice(0,3).map(s=>s.trim().slice(0,200));
  }catch(e){if(e?.code==="not_granted"){sample=null;setStatus()}}}
async function confirmMets(){user(`Confirmo ${S.metrics.length} métricas`);S.step="building";const m=bot("Montando o comparativo: KPIs, modelo de negócio, múltiplos e leitura qualitativa",null,{thinking:true});render();scrollEnd();
  await writeStory();m.thinking=false;m.text="Pronto. Navegue pelas abas e aceite para gerar a apresentação, ou recuse para ajustar.";S.verdict=null;S.step="card";bot("","card");render();scrollEnd()}
function accept(){S.verdict="ok";S.step="done";user("Aceito");bot("Apresentação gerada com a tese do setor e o comparativo aprovado. Abra para apresentar ou baixe em PDF.","deck");render();scrollEnd()}
function reject(){S.verdict="no";S.step="rejected";user("Recusar");bot("Sem problema. O que você quer mudar?");render();scrollEnd()}
async function choice(c){
  if(c==="Trocar métricas"){user(c);S.step="metrics";bot("Ajuste as métricas e confirme de novo.","metrics");render();scrollEnd()}
  else if(c==="Trocar empresas"){user(c);S.picks=[];S.step="companies";bot("Escolha as duas empresas de novo.","companies");render();scrollEnd()}
  else if(c==="Gerar outro título"){user(c);S.step="building";const m=bot("Reescrevendo a mensagem",null,{thinking:true});render();scrollEnd();const old=S.title;await writeStory();
    if(S.title===old)S.title=`${co(leader(mgn())?.e||S.picks[0]).nome} sai na frente, mas o setor ainda não paga o capital`;
    m.thinking=false;m.text="Nova versão do comparativo.";S.verdict=null;S.step="card";bot("","card");render();scrollEnd()}
  else ask(c)}
const KW=[["barat","ev"],["múltipl","ev"],["ev","ev"],["p/l","pl"],["p/vp","pvp"],["roic","roic"],["roe","roe"],["retorno","roic"],["margem","MG"],["ebitda","EB"],["lucro","lucro"],["receita","receita"],["dívida","alav"],["divida","alav"],["endivid","alav"],["alavanc","alav"],["volume","volume"],["tonelada","rpt"]];
const localKeys=q=>{const t=q.toLowerCase(),f=[];for(const [w,k0] of KW){const k=k0==="MG"?mgn():k0==="EB"?(hasCSN()?"ebitda":"ebitda_aj"):k0;if(t.includes(w)&&!f.includes(k)&&avail(k))f.push(k)}return f.slice(0,3)};
async function ask(q){q=q.trim();if(!q||busy)return;
  if(S.step==="companies"||S.step==="metrics"){user(q,true);bot(S.step==="companies"?"Escolha as duas empresas nos cards acima para seguir.":"Confirme as métricas acima para eu montar o comparativo.");render();scrollEnd();return}
  if(S.step==="sector"){user(q,true);bot("Os detalhes estão nos 8 pontos acima, com as fontes. Quando quiser, siga para as empresas.");render();scrollEnd();return}
  if(S.picks.length!==2)return;
  busy=true;user(q,true);const m=bot("Consultando as métricas verificadas",null,{thinking:true});render();scrollEnd();let keys=[];
  const avk=ORDER.filter(avail);
  if(sample){try{const r=await sample(`Responda sobre ${co(S.picks[0]).nome} e ${co(S.picks[1]).nome} usando só estes dados verificados. Para mostrar números, chame mostrar_metricas; nunca escreva números no texto.
Métricas disponíveis: ${avk.map(k=>`${k} (${MET[k].nome})`).join(", ")}.\nDados:\n${catalog()}\nPergunta: ${q}\nDepois, responda em 1 ou 2 frases curtas em português, com opinião, sem números.`,
   {modelTier:"quick",tools:[{name:"mostrar_metricas",description:"Mostra ao usuário uma tabela com as métricas pedidas para as duas empresas. Retorna ok.",inputSchema:{type:"object",properties:{metricas:{type:"array",items:{type:"string",enum:avk},maxItems:3}},required:["metricas"]},
     execute:i=>{keys=(Array.isArray(i.metricas)?i.metricas:[]).map(String).filter(k=>MET[k]&&avail(k)).slice(0,3);return {ok:true}}}],onText:({text})=>{m.text=text;m.thinking=false;renderThread()}});
   m.text=(r.text||"").trim().split(/\n\n+/).pop()}catch(e){if(e?.code==="not_granted"){sample=null;setStatus()}keys=localKeys(q);m.text=keys.length?"Aqui estão os números verificados.":"Ainda não tenho esse dado verificado."}}
  else{await wait(350);keys=localKeys(q);m.text=keys.length?"Aqui estão os números verificados.":"Ainda não tenho esse dado verificado. Posso mostrar receita, EBITDA, margem, ROE, ROIC, alavancagem e múltiplos."}
  m.thinking=false;if(/\d/.test(m.text||""))m.text="Aqui estão os números verificados.";if(keys.length){m.w="mini";m.keys=keys}busy=false;render();scrollEnd()}

/* ================= APRESENTAÇÃO ================= */
function buildSlides(){return [
 {k:"cover",label:"Tese do setor"},{k:"sens",label:"O que move o setor"},{k:"topics",label:"Estrutura, cadeia e regulação"},
 {k:"cmp",label:S.title||"Comparativo"},{k:"kpis",label:"KPIs lado a lado"},{k:"modelo",label:"Modelos de negócio"},{k:"mult",label:"Múltiplos"},{k:"quali",label:"Leitura qualitativa e riscos"},
 {k:"check",label:"Como sabemos que está certo"},{k:"meth",label:"Fontes e metodologia"}]}
function slideHTML(idx){const all=buildSlides(),s=all[idx],[a,b]=S.picks;
  const top=l=>`<div class="top"><span>${l}</span><span>Siderurgia · ${co(a).nome} × ${co(b).nome} · 3T26</span></div>`;
  const foot=`<div class="foot"><span class="bm-foot"><img src="${BRAND.mark}" alt="Fiscus">Fiscus · Fontes: ITRs 3T26, CVM Dados Abertos, B3, BCB, IBGE, Aço Brasil</span><span>Exercício acadêmico · não é recomendação de investimento</span></div>`;
  const V=SETOR.veredito,T=SETOR.topicos;
  if(s.k==="cover")return `<div class="slide dark">${top("Comitê de Investimentos")}<div class="sbody" style="gap:22px"><span class="tag" style="background:var(--yellow);color:var(--ink)">Setor ${V.nivel.toLowerCase()}</span><h1>Siderurgia no 3T26: vale investir?</h1><p class="lead">${esc(V.frase)}</p></div><div class="foot"><span>Empresa para a próxima análise: ${EMP[V.escolha].nome}</span><span>Exercício acadêmico · não é recomendação de investimento</span></div></div>`;
  if(s.k==="sens")return `<div class="slide">${top("Drivers")}<h2>Juros e importação pesam mais que a demanda física</h2><div class="sbody"><div class="sens">${sensRows()}</div><span class="small">Correlação de Pearson, 2019–2026. Correlação não é causalidade.</span></div>${foot}</div>`;
  if(s.k==="topics")return `<div class="slide">${top("Setor")}<h2>Oligopólio maduro, com o preço limitado pelo aço importado</h2><div class="sbody"><ol class="concl">${[T[1],T[2],T[4],T[5]].map(t=>`<li><span><b>${esc(t.t)}.</b> ${esc(t.tese)}</span></li>`).join("")}</ol></div>${foot}</div>`;
  if(s.k==="cmp")return `<div class="slide">${top("Comparativo")}<div class="sbody" style="gap:22px"><div class="logos">${logo(a)}<span class="note">×</span>${logo(b)}</div><h1>${esc(S.title)}</h1></div><ol class="concl">${S.concl.map(c=>`<li>${esc(c)}</li>`).join("")}</ol>${foot}</div>`;
  if(s.k==="kpis")return `<div class="slide">${top("KPIs")}<h2>${esc(S.title)}</h2><div class="sbody">${kpiTable(S.metrics.filter(k=>!MET[k].mult).slice(0,8))}</div>${foot}</div>`;
  if(s.k==="modelo")return `<div class="slide">${top("Modelo de negócio")}<h2>Modelos diferentes respondem a ciclos diferentes</h2><div class="sbody">${tabModelo()}</div>${foot}</div>`;
  if(s.k==="mult")return `<div class="slide">${top("Múltiplos")}<h2>Barato não quer dizer bom: leia EV/EBITDA junto com ROIC</h2><div class="sbody">${tabMult()}</div>${foot}</div>`;
  if(s.k==="quali")return `<div class="slide">${top("Qualitativo")}<h2>O que sustenta, ou ameaça, o resultado do trimestre</h2><div class="sbody">${tabQuali()}</div>${foot}</div>`;
  if(s.k==="check")return `<div class="slide">${top("Verificação")}<h2>Como sabemos que cada número está certo</h2><div class="sbody"><div class="checks">
    <div><b>${VERIF.aprovadas}/${VERIF.metricas}</b><span class="note">números do ITR conferidos na página e no trecho</span></div>
    <div><b>${VERIF.cruzOk}/${VERIF.cruz}</b><span class="note">cruzamentos com reconciliações publicadas pelas empresas</span></div>
    <div><b>${VERIF.armOk}/${VERIF.arm}</b><span class="note">armadilhas barradas: ${VERIF.armadilhas.map(x=>x.caso.toLowerCase()).join("; ")}</span></div></div>
    <span class="small">${esc(VERIF.cvm)}. Teste de controle: o Claude extraiu ${VERIF.ia.completo} números certos lendo os ITRs inteiros; o verificador garante que um erro não chegaria ao comitê.</span></div>${foot}</div>`;
  return `<div class="slide">${top("Metodologia")}<h2>Do PDF ao slide, sem número digitado à mão</h2><div class="sbody"><ol class="concl"><li>ITRs extraídos por página; cada número é lido da linha exata do documento.</li><li>Verificador independente confere página, trecho, unidade e reconciliações.</li><li>CVM Dados Abertos e B3 (preço de ${VERIF.dataPreco.split("-").reverse().join("/")}) para ROE, ROIC e múltiplos; BCB e IBGE para os drivers.</li><li>O assistente escreve as mensagens e escolhe o que mostrar; os números vêm só dos dados verificados.</li></ol></div>${foot}</div>`}
function renderSlide(){const all=buildSlides(),n=all.length;slide=Math.max(0,Math.min(n-1,slide));$("stage").innerHTML=slideHTML(slide);
  $("strip").innerHTML=all.map((x,i)=>`<button data-slide="${i}" aria-current="${i===slide}"><span>${i+1}</span>${esc(x.label)}</button>`).join("");
  $("scount").textContent=`${slide+1} / ${n}`;$("prev").disabled=slide===0;$("next").disabled=slide===n-1}
const openDeck=i=>{slide=i;$("v-deck").hidden=false;renderSlide()}, closeDeck=()=>{$("v-deck").hidden=true};

/* ================= PDF ================= */
let pdfBusy=false;
async function exportPDF(btn){
  if(pdfBusy)return;if(!downloads){toast("O download não está disponível nesta visualização. Abra o artifact no claude.ai.");return}
  if(!window.html2canvas||!window.jspdf){toast("As bibliotecas de PDF não carregaram. Recarregue a página.");return}
  pdfBusy=true;const lbl=btn?.textContent;
  const host=document.createElement("div");host.className="pdfhost";document.body.appendChild(host);
  try{const n=buildSlides().length,{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:"landscape",unit:"px",format:[1600,900],hotfixes:["px_scaling"]});
    await document.fonts.ready;
    for(let i=0;i<n;i++){if(btn)btn.textContent=`Gerando ${i+1}/${n}…`;
      host.innerHTML=`<div class="stage pdfstage">${slideHTML(i)}</div>`;
      let c;try{c=await html2canvas(host.firstElementChild,{scale:1.5,backgroundColor:"#ffffff",useCORS:true,logging:false});c.toDataURL("image/jpeg",.5)}
      catch(err){c=await html2canvas(host.firstElementChild,{scale:1.5,backgroundColor:"#ffffff",logging:false,ignoreElements:el=>el.tagName==="IMG"})}
      if(i)pdf.addPage([1600,900],"landscape");pdf.addImage(c.toDataURL("image/jpeg",0.92),"JPEG",0,0,1600,900)}
    const [a,b]=S.picks;await downloads.save({filename:`Fiscus_Siderurgia_${co(a).nome}_x_${co(b).nome}_3T26.pdf`,data:pdf.output("blob")});toast("PDF pronto.")
  }catch(e){toast(e?.code==="declined"?"Download cancelado.":e?.code==="rate_limited"?"Já existe um download aguardando confirmação.":"Não consegui gerar o PDF. Tente de novo.")}
  finally{host.remove();if(btn)btn.textContent=lbl;pdfBusy=false}}
function toast(t){const el=$("toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,3500)}

/* ================= VER FONTES ================= */
function openD(k,e,i){const m=MET[k],v=val(k,e,+i),s=PROV[`${k}|${e}|${i}`]||{};
  const st={verificado:`<span class="vst">✓ Verificado no PDF</span>`,calculado:`<span class="vst calc">Calculado a partir de números verificados</span>`,cvm:`<span class="vst calc">Base oficial da CVM, cruzada com o ITR</span>`,mercado:`<span class="vst calc">Preço oficial da B3 + contábil da CVM</span>`}[s.tipo]||"";
  let body="";
  if(s.tipo==="verificado")body=`<dl><dt>Documento</dt><dd>${esc(s.fonte)}</dd><dt>Página</dt><dd>${s.pagina}</dd><dt>Como aparece</dt><dd>${esc(s.como)} (${esc(s.unOrig)})</dd><dt>Conversão</dt><dd>${s.unOrig==="R$ mil"?"R$ mil → R$ milhões":"nenhuma"}</dd><dt>Critério</dt><dd>${esc(s.crit)}</dd></dl><blockquote>${esc(s.trecho)}</blockquote>`;
  else if(s.tipo==="calculado")body=`<dl><dt>Fórmula</dt><dd>${esc(s.formula)}</dd>${(s.insumos||[]).map((x,j)=>`<dt>${j?"":"Insumos"}</dt><dd>${esc(x)}</dd>`).join("")}</dl>`;
  else body=`<dl><dt>Fonte</dt><dd>${esc(s.fonte)}</dd>${s.conta?`<dt>Conta</dt><dd>${esc(s.conta)}</dd>`:""}${s.formula?`<dt>Fórmula</dt><dd>${esc(s.formula)}</dd>`:""}<dt>Critério</dt><dd>${esc(s.crit||"")}</dd>${s.periodo?`<dt>Período</dt><dd>${esc(s.periodo)}</dd>`:""}${s.arquivo?`<dt>Arquivo</dt><dd>${esc(s.arquivo)}</dd>`:""}</dl>`;
  $("drawer").innerHTML=`<header><div><div class="eyebrow">${co(e).nome} · ${per(e,+i)}</div><h4>${esc(m.nome)}</h4></div><button class="ib" id="x" aria-label="Fechar">${ic("xmark")}</button></header>
   <div class="dbig">${esc(fmt(v,m.un))}</div>${st}${body}<span class="small">${esc(m.porque)}</span>`;
  $("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");$("scrim").hidden=false;$("x").onclick=closeD;$("x").focus()}
function closeD(){$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true");$("scrim").hidden=true}
function setStatus(){$("status").classList.toggle("on",!!sample);$("status").querySelector("span").textContent=sample?"Claude conectado":"Modo demonstração";if(!$("v-app").hidden)renderSide()}

/* ================= EVENTOS ================= */
document.addEventListener("click",ev=>{const t=ev.target;
  const sec=t.closest("[data-sector]");if(sec){startSector(sec.dataset.sector);return}
  const pk=t.closest("[data-pick]");if(pk){const k=pk.dataset.pick;S.picks=S.picks.includes(k)?S.picks.filter(x=>x!==k):[...S.picks,k].slice(-2);render();return}
  const tb=t.closest("[data-tab]");if(tb){if(S.tab!==tb.dataset.tab){S.tab=tb.dataset.tab;tabAnim=true;render()}return}
  const dz=t.closest("[data-do]");if(dz){if(dz.dataset.do==="pdf"){exportPDF(dz);return}({"go-cos":goCos,"confirm-cos":confirmCos,"confirm-mets":confirmMets,accept,reject})[dz.dataset.do]();return}
  const ch=t.closest("[data-choice]");if(ch){choice(ch.dataset.choice);return}
  const op=t.closest("[data-open]");if(op){openDeck(+op.dataset.open);return}
  const rl=t.closest("[data-role]");if(rl){suRole=rl.dataset.role;renderSignup();return}
  if(t.closest("[data-logout]")){confirmBox("Sair da conta?","Você volta para a página inicial. Sua conta e suas análises continuam salvas neste navegador para quando entrar de novo.",logout,"Sair");return}
  const lg=t.closest("[data-login]");if(lg){const a=ACC.list.find(x=>x.id===lg.dataset.login);if(a){a.ultimo=Date.now();login(a.id)}return}
  const sg=t.closest("[data-sugg]");if(sg){const x=SUGG[+sg.dataset.sugg];startWith(x.p,x.t);return}
  const th=t.closest("[data-slide]");if(th){slide=+th.dataset.slide;renderSlide();return}
  const an=t.closest("[data-an]");if(an){openAnalysis(an.dataset.an);return}
  const dl=t.closest("[data-del]");if(dl){const a=STORE.list.find(x=>x.id===dl.dataset.del);if(a)confirmBox("Apagar esta análise?",`"${anTitle(a)}" e a conversa inteira serão removidas deste navegador. Não dá para desfazer.`,()=>deleteAnalysis(a.id));return}
  const ed=t.closest("[data-edit]");if(ed){editIdx=+ed.dataset.edit;renderThread();setTimeout(()=>{const ta=document.getElementById("edit-ta");if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}},0);return}
  if(t.closest("[data-edit-cancel]")){editIdx=null;renderThread();return}
  if(t.closest("[data-edit-send]")){const v=(document.getElementById("edit-ta")?.value||"").trim();const i=editIdx;editIdx=null;if(v)resend(i,v);else renderThread();return}
  const op2=t.closest("[data-dd]");if(op2){if(op2.getAttribute("aria-disabled")!=="true"){closeDD()}return}
  if(!t.closest("#dd"))closeDD();
  const n=t.closest(".num[data-k]");if(n)openD(n.dataset.k,n.dataset.e,n.dataset.i)});
document.addEventListener("change",ev=>{const c=ev.target.closest("[data-met]");if(!c)return;const k=c.dataset.met;
  S.metrics=c.checked?ORDER.filter(m=>m===k||S.metrics.includes(m)):S.metrics.filter(m=>m!==k);render()});
$("signup").addEventListener("submit",e=>{e.preventDefault();const nome=$("su-nome").value.trim();$("su-err").hidden=!!nome;if(!nome){$("su-nome").focus();return}
  const a={id:uid(),nome:nome.slice(0,60),funcao:suRole,inst:$("su-inst").value.trim().slice(0,60),criado:Date.now(),ultimo:Date.now()};ACC.list.push(a);
  $("su-nome").value="";$("su-inst").value="";login(a.id)});
$("dask").addEventListener("submit",e=>{e.preventDefault();const q=$("dq").value.trim();$("dq").value="";startWith(picksFrom(q),q||"Tese do setor de siderurgia")});
$("dq").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("dask").requestSubmit()}});
$("ask").addEventListener("submit",e=>{e.preventDefault();const q=$("q").value;$("q").value="";ask(q)});
$("new").onclick=()=>{S=fresh();closeSide();vt(render)};
$("sidescrim").onclick=closeSide;
$("ddbtn").onclick=e=>{e.stopPropagation();const open=$("ddmenu").hidden;if(open){renderDD();$("ddmenu").hidden=false;$("ddbtn").setAttribute("aria-expanded","true")}else closeDD()};
$("m-no").onclick=()=>closeBox();$("m-ok").onclick=()=>{const f=boxOk;closeBox();f&&f()};$("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeBox()});
$("close-deck").onclick=closeDeck;
$("pdf2").onclick=e=>exportPDF(e.currentTarget);
$("prev").onclick=()=>{slide--;renderSlide()};$("next").onclick=()=>{slide++;renderSlide()};
$("scrim").onclick=closeD;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("modal").hidden){closeBox();return}closeDD();if(editIdx!==null){editIdx=null;renderThread();return}if($("drawer").classList.contains("open"))closeD();else if(!$("v-deck").hidden)closeDeck();else closeSide()}
  if(!$("v-deck").hidden){if(e.key==="ArrowRight"){slide++;renderSlide()}if(e.key==="ArrowLeft"){slide--;renderSlide()}}});

render();
const use=n=>window.claude?.use?window.claude.use(n).catch(()=>null):Promise.resolve(null);
use("sample").then(s=>{sample=s;setStatus()});
use("downloads").then(d=>{downloads=d;document.querySelectorAll("[data-pdf]").forEach(b=>b.hidden=!d)});
