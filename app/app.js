const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);

/* ================= DADOS VERIFICADOS (gerados por pipeline/08_build_app.py) ================= */
const DATA=/*__DATA__*/null;
const {SETOR,EMP,MET,PROV,ND,VERIF,ICONS,BRAND,VAL,HIST,SETX,SERIES,PRICES}=DATA;
const SXORDER=["bancos","energia","petroleo","mineracao","varejo"].filter(k=>SETX&&SETX[k]);
const SXCOLS_STD=[["receita_12m","Receita 12m","mi"],["margem_ebitda_12m","Margem EBITDA","%"],["lucro_controladores_12m","Lucro 12m","mi"],["roe_12m","ROE","%"],["divida_liquida_ebitda","Dív.líq./EBITDA","x"],["p_l","P/L","x"],["p_vp","P/VP","x"],["ev_ebitda","EV/EBITDA","x"]];
const SXCOLS_BANK=[["receita_intermediacao_12m","Receitas de intermediação 12m","mi"],["resultado_bruto_intermediacao_12m","Resultado bruto da intermediação","mi"],["lucro_controladores_12m","Lucro 12m","mi"],["roe_12m","ROE","%"],["margem_liquida_12m","Margem líquida","%"],["pl_controladores","Patrimônio líquido","mi"],["p_l","P/L","x"],["p_vp","P/VP","x"]];
const colsFor=sid=>sid==="bancos"?SXCOLS_BANK:SXCOLS_STD;
let SXCOLS=SXCOLS_STD;
const SXKW=[["banco","bancos"],["itaú","bancos"],["itau","bancos"],["bradesco","bancos"],["btg","bancos"],["santander","bancos"],["energia","energia"],["elétric","energia"],["eletric","energia"],["eletrobras","energia"],["equatorial","energia"],["petróleo","petroleo"],["petroleo","petroleo"],["gás","petroleo"],["petrobras","petroleo"],["prio","petroleo"],["minera","mineracao"],["vale","mineracao"],["varejo","varejo"],["magazine","varejo"],["renner","varejo"],["assaí","varejo"],["assai","varejo"]];
const sxFrom=t=>{t=t.toLowerCase();const h=SXKW.find(([w])=>t.includes(w));return h&&SETX[h[1]]?h[1]:null};
const PLANS={analista:{n:"Analista",p:"R$ 110/mês"},pro:{n:"Research Pro",p:"R$ 150/mês"}};
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
const anTitle=a=>a.kind==="panorama"?(a.sxPicks?.length===2&&SETX[a.sx]?`${SETX[a.sx].empresas[a.sxPicks[0]].tk} × ${SETX[a.sx].empresas[a.sxPicks[1]].tk}`:`Panorama · ${SETX[a.sx]?.nome||""}`):a.step==="sectorpick"?"Nova análise":a.picks?.length===2?`${EMP[a.picks[0]].nome} × ${EMP[a.picks[1]].nome}`:"Tese do setor";
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
let suRole=ROLES[0],suPlan="pro";
const vt=fn=>document.startViewTransition&&!matchMedia("(prefers-reduced-motion: reduce)").matches?document.startViewTransition(fn):fn();
const initials=n=>(n||"V").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();

/* ================= FORMATAÇÃO ================= */
const nf=(v,d=0)=>v.toLocaleString("pt-BR",{minimumFractionDigits:d,maximumFractionDigits:d});
function fmt(v,un){if(v==null)return "n.d.";
  if(un==="R$ mi")return (v<0?"−":"")+"R$ "+nf(Math.abs(v))+" mi"; if(un==="%")return (v<0?"−":"")+nf(Math.abs(v),1)+"%";
  if(un==="x")return (v<0?"−":"")+nf(Math.abs(v),Math.abs(v)<1?2:1)+"x"; if(un==="R$/t")return "R$ "+nf(v)+"/t"; return nf(v)+" "+un}
const val=(k,e,i=0)=>(MET[k].vals[e]||[null,null])[i];
const val0=id=>DATA.ITRX?.[id]??null;
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

/* ================= VALUATION (DCF simples; premissas do usuário) ================= */
const PREMS=[
 {k:"rf",l:"Taxa livre de risco",h:`T-bond de 10 anos dos EUA em ${VAL.rf.data}`,min:2,max:7,st:.05,u:"%",def:()=>VAL.rf.valor,tag:"Dado"},
 {k:"crp",l:"Risco-país Brasil",h:"Prêmio adicional por investir no Brasil",min:0,max:6,st:.25,u:"p.p.",def:()=>2,tag:"Sua premissa"},
 {k:"erp",l:"Prêmio de risco de mercado",h:"Retorno extra exigido da bolsa sobre a renda fixa",min:3,max:9,st:.25,u:"%",def:()=>5,tag:"Sua premissa"},
 {k:"beta",l:"Beta",h:"Sensibilidade da ação ao mercado; siderurgia costuma ficar acima de 1",min:.5,max:2,st:.05,u:"",def:()=>1,tag:"Sua premissa"},
 {k:"dif",l:"Diferencial de inflação Brasil − EUA",h:`Converte o custo de capital para reais · IPCA 12m: ${String(VAL.ipca12m).replace(".",",")}%`,min:0,max:5,st:.25,u:"p.p.",def:()=>1.5,tag:"Sua premissa"},
 {k:"kd",l:"Custo da dívida antes de IR",h:"Referência: Selic de hoje",min:6,max:18,st:.25,u:"%",def:()=>VAL.selic,tag:"Dado"},
 {k:"g5",l:"Crescimento do caixa, anos 1 a 5",h:"Nominal, em reais, ao ano",min:-5,max:12,st:.5,u:"%",def:()=>5,tag:"Sua premissa"},
 {k:"gp",l:"Crescimento na perpetuidade",h:"Nominal; perto da inflação de longo prazo",min:0,max:7,st:.25,u:"%",def:()=>4,tag:"Sua premissa"},
 {k:"cx",l:"Capex de manutenção ÷ D&A",h:"Quanto do D&A precisa ser reinvestido todo ano para manter a operação",min:.5,max:1.6,st:.05,u:"x",def:()=>1,tag:"Sua premissa"}];
const premDefaults=()=>Object.fromEntries(PREMS.map(x=>[x.k,+x.def().toFixed(2)]));
const T=.34;
function dcf(e,P,dw=0,dg=0){const b=VAL.empresas[e];if(!b)return null;
  const keUsd=(P.rf+P.crp+P.beta*P.erp)/100,ke=(1+keUsd)*(1+P.dif/100)-1,kd=P.kd/100*(1-T);
  const E=b.preco*b.acoes/1e6,D=Math.max(b.dl,0),wacc=(E*ke+D*kd)/(E+D)+dw/100,gp=P.gp/100+dg/100,g5=P.g5/100;
  const capex=b.da12m*P.cx,f0=b.ebit12m*(1-T)+b.da12m-capex;
  if(wacc-gp<.005)return {erro:"O custo de capital precisa ficar acima do crescimento na perpetuidade."};
  let pv=0,f=f0;for(let t=1;t<=5;t++){f*=1+g5;pv+=f/Math.pow(1+wacc,t)}
  const tv=f*(1+gp)/(wacc-gp),pvtv=tv/Math.pow(1+wacc,5),ev=pv+pvtv,eq=ev-b.dl-b.minor,price=eq*1e6/b.acoes,up=price/b.preco-1;
  return {ke,wacc,kd,f0,capex,pv,pvtv,ev,eq,price,up,E,D,b}}
const recOf=up=>up>=.15?["Compra","buy"]:up<=-.10?["Venda","sell"]:["Neutro","hold"];
const brl=v=>"R$ "+v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const mi=v=>(v<0?"−":"")+"R$ "+nf(Math.abs(v))+" mi";
const pct=(v,d=1)=>(v<0?"−":"+")+nf(Math.abs(v*100),d)+"%";
const pc=(v,d=1)=>nf(v*100,d)+"%";
function valResults(mode){const V=S.val;if(!V||!V.e)return "";const r=dcf(V.e,V.prem);if(!r)return "";
  if(!r.erro&&r.eq<=0)return `<div class="vres"><div class="vhead"><span class="rec sell">Venda</span><div><span class="k">Preço-alvo 12 meses</span><b>—</b></div></div><p class="note">Com essas premissas, o valor da empresa (${mi(r.ev)}) não cobre a dívida líquida (${mi(r.b.dl)}) mais os não controladores. O acionista ficaria sem valor no DCF. Teste crescimento ou custo de capital diferentes.</p></div>`;if(r.erro)return `<div class="vres"><p class="note">${esc(r.erro)}</p></div>`;
  const [rec,cls]=recOf(r.up),b=r.b;
  const ws=[-2,-1,0,1,2],gs=[-1,-.5,0,.5,1],heat=pr=>{const u=pr/b.preco-1,a=Math.min(1,Math.abs(u)/.5);return u>=0?`background:rgba(17,156,79,${.12+.55*a})`:`background:rgba(224,72,77,${.12+.55*a})`};
  const sens=`<div class="tblwrap"><table class="sens2"><thead><tr><th>WACC \\ g perp.</th>${gs.map(g=>`<th>${nf(V.prem.gp+g,2)}%</th>`).join("")}</tr></thead><tbody>${ws.map(w=>`<tr><td class="m">${pc(r.wacc+w/100)}</td>${gs.map(g=>{const x=dcf(V.e,V.prem,w,g),ok=x&&!x.erro&&x.eq>0;return `<td class="${w===0&&g===0?"hl":""}" style="${ok&&!(w===0&&g===0)?heat(x.price):""}">${ok?brl(x.price):"—"}</td>`}).join("")}</tr>`).join("")}</tbody></table></div>`;
  const g5s=[-4,-2,0,2,4],cxs=[-.2,-.1,0,.1,.2];
  const sens2=`<div class="tblwrap"><table class="sens2"><thead><tr><th>Cresc. 5a \\ Capex/D&A</th>${cxs.map(c=>`<th>${nf(V.prem.cx+c,2)}x</th>`).join("")}</tr></thead><tbody>${g5s.map(gg=>`<tr><td class="m">${nf(V.prem.g5+gg,1)}%</td>${cxs.map(c=>{const x=dcf(V.e,{...V.prem,g5:V.prem.g5+gg,cx:V.prem.cx+c}),ok=x&&!x.erro&&x.eq>0;return `<td class="${gg===0&&c===0?"hl":""}" style="${ok&&!(gg===0&&c===0)?heat(x.price):""}">${ok?brl(x.price):"—"}</td>`}).join("")}</tr>`).join("")}</tbody></table></div>`;
  if(mode==="onlysens")return `<div class="sens-2 big"><div><h6>WACC × crescimento na perpetuidade</h6>${sens}</div><div><h6>Crescimento anos 1–5 × capex de manutenção ÷ D&A</h6>${sens2}</div></div>`;
  if(mode==="mini")return sens;
  return `<div class="vres">
   <div class="vhead"><span class="rec ${cls}">${rec}</span><div><span class="k">Preço-alvo 12 meses</span><b>${brl(r.price)}</b></div><div><span class="k">Preço atual · B3 ${b.dataPreco.split("-").reverse().join("/")}</span><b class="mut">${brl(b.preco)}</b></div><div><span class="k">Potencial</span><b class="${r.up>=0?"pos":"neg"}">${pct(r.up)}</b></div></div>
   <dl class="vcalc"><dt>Custo do capital próprio (Ke)</dt><dd>${pc(r.ke)}</dd><dt>WACC</dt><dd>${pc(r.wacc)}</dd>
    <dt>Fluxo de caixa livre base (12m)</dt><dd>${mi(r.f0)}</dd><dt class="sub">EBIT × (1 − 34%) + D&A − capex</dt><dd class="sub">${mi(b.ebit12m*(1-T))} + ${mi(b.da12m)} − ${mi(r.capex)}</dd>${b.capex12m!=null?`<dt class="sub">Capex total em 12 meses, com expansão (referência)</dt><dd class="sub">${mi(b.capex12m)} · ${nf(b.capex12m/b.da12m,2)}x o D&A</dd>`:""}
    <dt>Valor da empresa</dt><dd>${mi(r.ev)}</dd><dt>(−) Dívida líquida</dt><dd>${mi(b.dl)}</dd><dt>(−) Não controladores</dt><dd>${mi(b.minor)}</dd>
    <dt>Valor do acionista</dt><dd>${mi(r.eq)}</dd><dt>÷ Ações em circulação</dt><dd>${nf(b.acoes/1e6)} mi</dd></dl>
   ${gBridge(r)}
   ${mode==="nosens"?"":`<div class="sec-h"><b>Sensibilidade do preço-alvo</b><span>verde acima do preço atual, vermelho abaixo</span></div>`}<div class="sens-2" ${mode==="nosens"?"hidden":""}><div><span class="small">WACC × crescimento na perpetuidade</span>${sens}</div><div><span class="small">Crescimento anos 1–5 × capex de manutenção</span>${sens2}</div></div>
   <span class="small">Faixas: compra a partir de +15% de potencial, venda abaixo de −10%. EBIT, D&A, dívida, ações e preço são dados verificados (CVM e B3); as premissas marcadas são suas.</span></div>`}
function wVal(i){const V=S.val,last=S.msgs.findLastIndex(x=>x.w==="val")===i,live=last&&S.step==="val";const [a,b]=S.picks;
  const prems=PREMS.filter(x=>!(x.onlyNoCapex&&VAL.empresas[V.e].capex12m!=null));
  return `<div class="widget">
   <div class="cmphead"><div><div class="eyebrow">Tese e preço-alvo</div><h3 class="ctitle">Quanto vale ${co(V.e).nome}?</h3></div>
    <div class="tabs" role="tablist">${[a,b].map(e=>`<button role="tab" aria-selected="${V.e===e}" data-vale="${e}" ${live?"":"disabled"}>${co(e).nome}</button>`).join("")}</div></div>
   <div class="vgrid"><div class="prems">${prems.map(x=>`<label class="prem"><span class="pl"><b>${esc(x.l)}</b><span class="ptag ${x.tag==="Dado"?"d":""}">${x.tag}</span><small>${esc(x.h)}</small></span>
     <span class="pv" id="pv-${x.k}">${nf(V.prem[x.k],x.u==="x"||x.k==="beta"?2:2)}${x.u==="%"?"%":x.u?" "+x.u:""}</span>
     <input type="range" data-prem="${x.k}" min="${x.min}" max="${x.max}" step="${x.st}" value="${V.prem[x.k]}" ${live?"":"disabled"} aria-label="${esc(x.l)}"></label>`).join("")}
     ${live?`<button class="pill sm" data-do="val-reset" style="justify-self:start">Restaurar sugestões</button>`:""}</div>
    <div id="valres">${valResults()}</div></div>
   ${live?`<div class="wfoot"><span class="note">O Claude escreve os argumentos; os números saem do cálculo acima.</span><span class="choices"><button class="pill ghost" data-do="val-skip">Pular</button><button class="pill dark" data-do="val-ok">Confirmar tese e gerar apresentação</button></span></div>`:""}</div>`}
const THESIS={g:{a:["A América do Norte, protegida por tarifa, sustenta margem e geração de caixa.","O balanço leve dá espaço para atravessar o ciclo e remunerar o acionista.","No Brasil, a margem está perto do piso do ciclo e tem espaço para recuperar."],m:"O mercado olha o lucro de doze meses, pesado por um trimestre fraco, e dá pouco valor ao caixa que vem dos EUA.",t:["A tarifa americana sobre aço importado continuar em vigor.","A margem do segmento Brasil voltar a subir.","A empresa manter disciplina de capital e retorno ao acionista."]},
 u:{a:["O caixa líquido dá uma margem de segurança rara no setor.","A margem ajustada está em recuperação contra o ano passado.","A ação negocia bem abaixo do patrimônio."],m:"O mercado trata a pressão do aço plano importado como permanente.",t:["A proteção comercial contra importados ganhar efeito.","O volume de aço voltar a crescer.","O novo controlador gerar ganhos de eficiência."]},
 c:{a:["Os ativos integrados de mineração e logística têm valor estratégico.","A mineração gera caixa ao longo do ciclo.","A desalavancagem pode destravar valor rápido."],m:"O mercado desconta a dívida como se a desalavancagem não fosse acontecer.",t:["A dívida líquida cair de forma consistente.","O minério se manter em preço que sustente o caixa.","O resultado do 3T26 confirmar a tendência."]}};
async function writeThesis(){const V=S.val;if(!V||!V.e)return;const r=dcf(V.e,V.prem),ok0=r&&!r.erro&&r.eq>0,[rec]=ok0?recOf(r.up):["Venda"],d=THESIS[V.e];V.args=d.a.slice();V.mkt=d.m;V.trig=d.t.slice();V.rec=rec;V.price=ok0?r.price:null;V.up=ok0?r.up:null;
  if(!sample){await wait(500);return}
  try{const x=await sample.json(`Você é analista de research. Escreva a tese de investimento de ${co(V.e).nome} para a primeira página de um relatório.
Recomendação definida pelo usuário: ${rec}. Dados verificados:
${catalog()}
Modelo de negócio: ${co(V.e).resumo}
Premissas do usuário: beta ${V.prem.beta}, crescimento ${V.prem.g5}% ao ano, perpetuidade ${V.prem.gp}%.
Regras: português; NÃO escreva números; frases curtas e com opinião. Responda só JSON: {"argumentos":[3 frases de até 20 palavras],"mercado_nao_precifica":"1 frase de até 25 palavras","gatilhos":[3 frases curtas: o que precisa acontecer para a tese se confirmar]}`,{modelTier:"quick"});
    const ok=t=>typeof t==="string"&&t.trim()&&!/\d/.test(t);
    if(Array.isArray(x?.argumentos)&&x.argumentos.slice(0,3).every(ok)&&x.argumentos.length>=3)V.args=x.argumentos.slice(0,3).map(t=>t.trim().slice(0,180));
    if(ok(x?.mercado_nao_precifica))V.mkt=x.mercado_nao_precifica.trim().slice(0,220);
    if(Array.isArray(x?.gatilhos)&&x.gatilhos.slice(0,3).every(ok)&&x.gatilhos.length>=3)V.trig=x.gatilhos.slice(0,3).map(t=>t.trim().slice(0,160));
  }catch(e){if(e?.code==="not_granted"){sample=null;setStatus()}}}
async function confirmVal(){user("Confirmo a tese");S.step="building";const m=bot("Escrevendo a tese a partir dos dados e das suas premissas",null,{thinking:true});render();scrollEnd();
  await writeThesis();S.val.done=true;m.thinking=false;m.text="Tese pronta. A primeira página traz a recomendação, o preço-alvo e os argumentos; a última retoma o que precisa acontecer para a tese se confirmar.";S.step="done";bot("","deck");render();scrollEnd()}
function skipVal(){user("Pular o valuation");S.step="done";bot("Apresentação gerada com a tese do setor e o comparativo. Abra para apresentar ou baixe em PDF.","deck");render();scrollEnd()}

/* ================= ESCOLHA DE SETOR E DE EMPRESAS ================= */
const SECIC={siderurgia:"industry",bancos:"bank",energia:"flash",petroleo:"droplet",mineracao:"hammer",varejo:"shopping-bag"};
function startAsk(q){S=fresh();S.view="chat";S.step="sectorpick";seenMsgs=0;user(q||"Quero analisar um setor",true);bot("Qual setor você quer analisar?","sectorpick");vt(render);scrollEnd()}
function wSectorPick(i){const live=S.step==="sectorpick"&&S.msgs.findLastIndex(x=>x.w==="sectorpick")===i,chosen=S.kind==="panorama"?S.sx:(S.step!=="sectorpick"?"siderurgia":null);
  const opts=[["siderurgia","Siderurgia","Análise completa · 3 empresas"],...SXORDER.map(k=>[k,SETX[k].nome,`Panorama · ${SETX[k].empresas.length} empresas`])];
  return `<div class="widget ${live?"":"locked"}"><div class="secs">${opts.map(([k,n,h])=>`<button class="secc" data-secpick="${k}" aria-pressed="${chosen===k}" ${live?"":"disabled"}><span class="ic">${ic(SECIC[k]||"view-grid")}</span><span><b>${esc(n)}</b><small>${h}</small></span>${chosen===k?`<span class="ck2">${ic("check")}</span>`:""}</button>`).join("")}</div></div>`}
async function pickSector(k){if(k==="siderurgia"){S.picks=[];user("Siderurgia");const m=bot("Lendo os dados do setor: produção, importação, juros, câmbio e os balanços das empresas",null,{thinking:true});S.step="building";render();scrollEnd();await wait(600);
  m.thinking=false;m.text="Minha resposta para \"vale investir?\" está no topo. Abaixo, os drivers medidos e os 8 pontos que sustentam a tese, cada um com a fonte.";m.w="sector";S.step="sector";render();scrollEnd();return}
  S.kind="panorama";S.sx=k;S.sxPicks=[];user(SETX[k].nome);S.step="sxpick";
  bot(`Minha leitura preliminar de ${SETX[k].nome}, a partir dos números de cada empresa:`,"sxverdict");
  bot(`Estas são as ${SETX[k].empresas.length} empresas de ${SETX[k].nome} que temos na base. Escolha duas para comparar, ou veja o panorama do setor inteiro.`,"sxpick");render();scrollEnd()}
const med=a=>{const v=a.filter(x=>x!=null&&isFinite(x)).sort((x,y)=>x-y);if(!v.length)return null;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2};
function sxVerdict(sid){const X=SETX[sid],E=X.empresas,sel=VAL.selic,banco=sid==="bancos";
  const roe=med(E.map(e=>e.v.roe_12m)),mg=med(E.map(e=>e.v.margem_ebitda_12m)),dl=med(E.map(e=>e.v.divida_liquida_ebitda)),pvp=med(E.map(e=>e.v.p_vp)),ev=med(E.map(e=>e.v.ev_ebitda)),pl=med(E.map(e=>e.v.p_l));
  const acima=E.filter(e=>e.v.roe_12m!=null&&e.v.roe_12m>sel).length,comROE=E.filter(e=>e.v.roe_12m!=null).length;
  const nivel=roe!=null&&roe>sel+2?"Atrativo":roe!=null&&(roe>sel-3||acima>=Math.ceil(comROE/3))?"Seletivo":"Pouco atrativo";
  const cand=E.filter(e=>e.v.roe_12m!=null&&e.v.p_vp!=null&&e.v.p_vp>0).map(e=>({e,s:e.v.roe_12m/e.v.p_vp})).sort((a,b)=>b.s-a.s)[0]?.e;
  const f=v=>v==null?"n.d.":nf(v,1);
  const frase={"Atrativo":`O retorno mediano do setor supera o custo do dinheiro no Brasil: vale investir, com preferência por quem combina retorno alto e preço razoável.`,
    "Seletivo":`O setor paga perto do custo de capital, mas não de forma uniforme: vale investir só nas empresas que rendem acima da Selic.`,
    "Pouco atrativo":`O retorno mediano fica abaixo do custo do dinheiro no Brasil: o setor hoje não remunera o capital, salvo exceções pontuais.`}[nivel];
  const porque=cand?`${cand.tk} tem a melhor relação entre retorno e preço do grupo: ROE de ${f(cand.v.roe_12m)}% a ${f(cand.v.p_vp)}x o patrimônio.`:"Sem empresa com ROE e P/VP disponíveis para comparar.";
  const kpis=banco?[[`${f(roe)}%`,"ROE mediano 12m"],[`${acima} de ${comROE}`,"com ROE acima da Selic"],[`${f(pvp)}x`,"P/VP mediano"],[`${f(pl)}x`,"P/L mediano"]]
    :[[`${f(roe)}%`,"ROE mediano 12m"],[`${f(mg)}%`,"Margem EBITDA mediana"],[`${f(dl)}x`,"Dív. líq./EBITDA mediana"],[`${f(ev)}x`,"EV/EBITDA mediano"]];
  return {nivel,frase,porque,cand,kpis,sel}}
function wSXVerdict(){const v=sxVerdict(S.sx),X=SETX[S.sx];
  return `<div class="widget"><div class="verdict"><div class="top"><span>${esc(X.nome)} é um bom lugar para investir?</span><span class="lvl">${v.nivel}</span></div><h3>${esc(v.frase)}</h3>
   <div class="vk">${v.kpis.map(([a,b])=>`<div><b>${a}</b><span>${b}</span></div>`).join("")}<div><b>${nf(v.sel,2)}%</b><span>Selic hoje</span></div></div>
   ${v.cand?`<div class="pick"><span><b>Empresa para a próxima etapa: ${esc(v.cand.tk)}</b><br>${esc(v.porque)}</span></div>`:""}</div>
   <span class="small">Tese preliminar calculada com as medianas de ${X.empresas.length} empresas (CVM Dados Abertos e B3), comparadas com a Selic. A tese completa deste setor, com drivers e os 8 pontos, está em construção.</span></div>`}
function wSXPick(i){const live=S.step==="sxpick"&&S.msgs.findLastIndex(x=>x.w==="sxpick")===i,X=SETX[S.sx],sel=S.sxPicks||[];
  return `<div class="widget ${live?"":"locked"}"><div class="cos sxcos">${X.empresas.map((e,ix)=>`<button class="coc" data-sxpick="${ix}" aria-pressed="${sel.includes(ix)}" ${live?"":"disabled"}><span class="h"><span class="tk2">${esc(e.tk)}</span><span class="ck">${sel.includes(ix)?ic("check"):""}</span></span><span><b>${esc(nomeBonito(e.nome||e.tk))}</b><small>${esc(e.per||e.db||"")}</small></span></button>`).join("")}</div>
   ${live?`<div class="wfoot"><span class="note">${sel.length}/2 escolhidas</span><span class="choices"><button class="pill ghost" data-do="sx-all">Ver o setor inteiro</button><button class="pill dark" data-do="sx-cmp" ${sel.length!==2?"disabled":""}>Comparar estas duas</button></span></div>`:""}</div>`}
function wSXCmp(i){const X=SETX[S.sx],[ia,ib]=S.sxPicks,A=X.empresas[ia],B=X.empresas[ib];SXCOLS=colsFor(S.sx);
  const rows=SXCOLS.map(([k,n,u])=>{const fa=sxFmt(A.v[k],u),fb=sxFmt(B.v[k],u);return `<tr><td class="m">${n}</td><td>${fa==null?`<span class="nd" title="${esc(A.o[k]?.motivo||"Não disponível")}">n.d.</span>`:`<button class="num" data-sxn="${S.sx}" data-i="${ia}" data-m="${k}">${esc(fa)}</button>`}</td><td>${fb==null?`<span class="nd" title="${esc(B.o[k]?.motivo||"Não disponível")}">n.d.</span>`:`<button class="num" data-sxn="${S.sx}" data-i="${ib}" data-m="${k}">${esc(fb)}</button>`}</td></tr>`}).join("");
  const ks=S.sx==="bancos"?[["roe_12m","ROE 12m","%"],["p_vp","P/VP","x"]]:[["margem_ebitda_12m","Margem EBITDA 12m","%"],["ev_ebitda","EV/EBITDA","x"]];
  const ch=ks.map(([k,n,u])=>gHBars(n,[{l:A.tk,v:A.v[k]},{l:B.tk,v:B.v[k]}],u)).join("");
  return `<div class="widget"><div class="cmphead"><div><div class="eyebrow">Comparativo · ${esc(X.nome)}</div><h3 class="ctitle">${esc(A.tk)} × ${esc(B.tk)}</h3></div><span class="tag">Tese em construção</span></div>
   <div class="charts">${ch}</div><div class="tblwrap"><table><thead><tr><th>12 meses</th><th>${esc(A.tk)} · ${esc((A.db||"").slice(0,7))}</th><th>${esc(B.tk)} · ${esc((B.db||"").slice(0,7))}</th></tr></thead><tbody>${rows}</tbody></table></div>
   <span class="small">Fonte: ${esc(X.fonte||"CVM Dados Abertos + B3")}. Consolidado, R$ milhões${S.sx==="bancos"?"; bancos usam o plano de contas de instituição financeira, então EBITDA, dívida líquida e EV não se aplicam":", EBITDA pelo critério CVM 156"}. Base oficial da CVM, sem a verificação página a página feita na siderurgia. Passe o mouse em "n.d." para ver o motivo.</span></div>`}

/* ================= PANORAMA DE OUTROS SETORES ================= */
async function startPanorama(sx,q){S=fresh();S.kind="panorama";S.sx=sx;S.view="chat";S.step="panorama";seenMsgs=0;user(q||`Panorama de ${SETX[sx].nome}`,true);
  const m=bot("Lendo as demonstrações na base da CVM e os preços da B3",null,{thinking:true});vt(render);scrollEnd();await wait(500);
  m.thinking=false;m.text="Este é o panorama financeiro do setor, com as principais empresas listadas. Troque de setor nas abas. A tese completa desses setores está em construção.";m.w="sx";render();scrollEnd()}
const sxFmt=(v,u)=>v==null?null:u==="mi"?(v<0?"−":"")+"R$ "+nf(Math.abs(v)):u==="%"?nf(v,1)+"%":(v<0?"−":"")+nf(Math.abs(v),1)+"x";
function wSX(i){const last=S.msgs.findLastIndex(x=>x.w==="sx")===i,sid=S.sx,X=SETX[sid];if(!X)return "";SXCOLS=colsFor(sid);
  const body=`<div class="tblwrap"><table class="sxt"><thead><tr><th>Empresa</th><th>Base</th>${SXCOLS.map(c=>`<th>${c[1]}</th>`).join("")}</tr></thead><tbody>${X.empresas.map((e,ix)=>`<tr><td class="m"><b>${esc(e.tk)}</b><small>${esc((e.nome||"").slice(0,28))}</small></td><td>${esc(e.per&&/3T26|2026-09/.test(e.db||"")?"3T26":(e.db||"").startsWith("2026-06")?"2T26":(e.db||"—"))}</td>${SXCOLS.map(([k,n,u])=>{const v=e.v[k],f=sxFmt(v,u);return `<td>${f==null?`<span class="nd" title="${esc(e.o[k]?.motivo||"Não se aplica ou não disponível")}">n.d.</span>`:`<button class="num" data-sxn="${sid}" data-i="${ix}" data-m="${k}">${esc(f)}</button>`}</td>`}).join("")}</tr>`).join("")}</tbody></table></div>`;
  const hk=sid==="bancos"?["roe_12m","ROE 12 meses","%"]:["margem_ebitda_12m","Margem EBITDA 12 meses (CVM 156)","%"];
  const hb=gHBars(hk[1],X.empresas.map(e=>({l:e.tk,v:e.v[hk[0]]})).sort((x,y)=>(y.v??-1e9)-(x.v??-1e9)),hk[2]);
  return `<div class="widget"><div class="cmphead"><div><div class="eyebrow">Panorama do setor · ${X.empresas.length} empresas</div><h3 class="ctitle">${esc(X.nome)}</h3></div><span class="tag">Tese em construção</span></div>
   ${last?`<div class="tabs" role="tablist">${SXORDER.map(k=>`<button role="tab" aria-selected="${k===sid}" data-sxtab="${k}">${esc(SETX[k].nome)}</button>`).join("")}</div>`:""}
   <div class="tabbody${tabAnim&&last?" anim":""}">${hb}${body}
   <span class="small">Fonte: ${esc(X.fonte||"CVM Dados Abertos + B3")}. Valores em R$ milhões; 12 meses até a data-base de cada empresa; consolidado; EBITDA pelo critério CVM 156. Números lidos da base oficial da CVM, sem a verificação página a página feita na siderurgia.${sid==="bancos"?" Bancos: EBITDA, dívida líquida e EV não se aplicam.":""}</span></div></div>`}
function openSX(sid,i,k){const e=SETX[sid].empresas[i],c=colsFor(sid).find(x=>x[0]===k),o=e.o[k]||{};
  $("drawer").innerHTML=`<header><div><div class="eyebrow">${esc(e.tk)} · ${esc(e.per||e.db||"")}</div><h4>${esc(c[1])}</h4></div><button class="ib" id="x" aria-label="Fechar">${ic("xmark")}</button></header>
   <div class="dbig">${esc(sxFmt(e.v[k],c[2]))}</div><span class="vst calc">Base oficial da CVM${/p_|ev/.test(k)?" + preço da B3":""}</span>
   <dl><dt>Empresa</dt><dd>${esc(e.nome||e.tk)}</dd><dt>Fonte</dt><dd>${esc(SETX[sid].fonte||"")}</dd>${o.conta?`<dt>Conta</dt><dd>${esc(o.conta)}</dd>`:""}${o.formula?`<dt>Fórmula</dt><dd>${esc(o.formula)}</dd>`:""}<dt>Data-base</dt><dd>${esc(e.db||"")}</dd></dl>
   <span class="small">Sem verificação página a página no ITR; a siderurgia tem esse nível adicional de conferência.</span>`;
  $("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");$("scrim").hidden=false;$("x").onclick=closeD;$("x").focus()}

/* ================= GRÁFICOS (SVG, escala única, cores do tema) ================= */
const CC={g:"var(--c-g)",u:"var(--c-u)",c:"var(--c-c)"};
function gBars(title,k){const [a,b]=S.picks,m=MET[k];const vs=[[a,0],[a,1],[b,0],[b,1]].map(([e,i])=>val(k,e,i));if(vs.some(v=>v==null))return "";
  const w=380,h=180,L=8,B=26,T=26,ih=h-T-B,mx=Math.max(...vs.map(Math.abs))*1.1||1,base=T+ih,bw=46,gap=22,gw=(w-L*2)/2;
  let s=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">`;
  s+=`<line x1="${L}" x2="${w-L}" y1="${base}" y2="${base}" stroke="var(--line)"/>`;
  [a,b].forEach((e,gi)=>{const cx=L+gw*gi+gw/2;[1,0].forEach((i,j2)=>{const v=val(k,e,i),hh=Math.max(1,Math.abs(v)/mx*ih),x=cx-bw-gap/2+j2*(bw+gap),y=v>=0?base-hh:base;
    s+=`<rect x="${x}" y="${y}" width="${bw}" height="${hh}" rx="4" fill="${CC[e]}" opacity="${i?0.35:1}"/><text x="${x+bw/2}" y="${v>=0?y-5:y+hh+12}" text-anchor="middle" class="val">${esc(fmt(v,m.un).replace(" mi","").replace("R$ ",""))}</text>`});
    s+=`<text x="${cx}" y="${h-8}" text-anchor="middle" style="fill:var(--ink);font-size:12px">${esc(co(e).nome)}</text>`});
  return `<div class="chartbox"><span class="t">${esc(title)} · ${per(a,1)} (claro) × ${per(a)} (escuro)</span>${s}</svg></div>`}
function gLine(title,key,unit){const [a,b]=S.picks;const H=[a,b].map(e=>HIST?.[e]||{});const Y=Object.keys(H[0]);if(!Y.length)return "";
  const pts=[a,b].map((e,i)=>Y.map(y=>H[i][y]?.[key]));const all=pts.flat().filter(v=>v!=null);if(!all.length)return "";
  const w=520,h=200,L=40,R=14,T=16,B=26,iw=w-L-R,ih=h-T-B,mn=Math.min(0,...all),mx=Math.max(...all)*1.1,x=i=>L+i*iw/(Y.length-1),y=v=>T+ih-(v-mn)/(mx-mn)*ih;
  let s=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">`;
  [mn,(mn+mx)/2,mx].forEach(t=>{s+=`<line x1="${L}" x2="${w-R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${L-6}" y="${y(t)+4}" text-anchor="end">${nf(t,0)}${unit}</text>`});
  Y.forEach((yy,i)=>{s+=`<text x="${x(i)}" y="${h-8}" text-anchor="middle">${yy}</text>`});
  [a,b].forEach((e,k)=>{const d=pts[k].map((v,i)=>v==null?null:`${x(i)},${y(v)}`).filter(Boolean);s+=`<polyline points="${d.join(" ")}" fill="none" stroke="${CC[e]}" stroke-width="2.5" stroke-linejoin="round"/>`;
    pts[k].forEach((v,i)=>{if(v!=null)s+=`<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${CC[e]}"/>`});const lv=pts[k][pts[k].length-1];if(lv!=null)s+=`<text x="${x(Y.length-1)-6}" y="${y(lv)-8}" text-anchor="end" class="val">${nf(lv,1)}${unit}</text>`});
  return `<div class="chartbox"><span class="t">${esc(title)}</span>${s}</svg><div class="legend">${[a,b].map(e=>`<span><i style="background:${CC[e]}"></i>${esc(co(e).nome)}</span>`).join("")}</div></div>`}
function gHBars(title,rows,unit){const ok=rows.filter(r=>r.v!=null);if(!ok.length)return "";const mx=Math.max(...ok.map(r=>Math.abs(r.v)))||1;
  return `<div class="chartbox"><span class="t">${esc(title)}</span><div class="hbars">${rows.map(r=>`<div><span class="hb-l">${esc(r.l)}</span><span class="hb-t"><i style="width:${r.v==null?0:Math.max(2,Math.abs(r.v)/mx*100)}%;background:${r.v!=null&&r.v<0?"var(--red)":"var(--blue)"}"></i></span><span class="hb-v">${r.v==null?"n.d.":nf(r.v,1)+unit}</span></div>`).join("")}</div></div>`}
function gBridge(r){const it=[["Valor da empresa",r.ev,"var(--ink)"],["(−) Dívida líquida",-r.b.dl,r.b.dl>0?"var(--red)":"var(--green)"],["(−) Não controladores",-r.b.minor,"var(--red)"],["Valor do acionista",r.eq,"var(--blue)"]];
  const w=520,h=190,L=10,T=20,B=30,ih=h-T-B,mx=Math.max(r.ev,r.eq,r.ev-r.b.dl)*1.08||1,y=v=>T+ih-v/mx*ih,bw=(w-L*2)/4-28;let s=`<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Do valor da empresa ao valor do acionista">`,run=0;
  it.forEach(([l,v,c],i)=>{const x=L+i*(w-L*2)/4+14;let y0,y1;if(i===0||i===3){y0=y(Math.max(v,0));y1=y(0);run=v}else{const n=run+v;y0=y(Math.max(run,n));y1=y(Math.min(run,n));run=n}
    s+=`<rect x="${x}" y="${Math.min(y0,y1)}" width="${bw}" height="${Math.max(1,Math.abs(y1-y0))}" rx="4" fill="${c}"/><text x="${x+bw/2}" y="${Math.min(y0,y1)-5}" text-anchor="middle" class="val">${(v<0?"−":"")+nf(Math.abs(v))}</text><text x="${x+bw/2}" y="${h-10}" text-anchor="middle">${l}</text>`});
  return `<div class="chartbox"><span class="t">Do valor da empresa ao valor do acionista · R$ mi</span>${s}</svg></div>`}

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
  return `<div class="widget ${locked?"locked":""}"><div class="cos sxcos">${["g","u","c","f"].map(k=>{const e=EMP[k];return `<button class="coc" data-pick="${k}" aria-pressed="${sel.includes(k)}" ${!e.ok||locked?"disabled":""}>
     <span class="h"><span class="tk2">${e.tk}</span>${e.ok?`<span class="ck">${sel.includes(k)?ic("check"):""}</span>`:`<span class="tag">Sem dados</span>`}</span>
     <span><b>${esc(e.nome)}</b><small>${e.ok?esc(e.per[0]):"ITR não carregado"}</small></span></button>`}).join("")}</div>
   ${locked?"":`<div class="wfoot"><span class="note">${sel.length}/2 escolhidas</span><button class="pill dark" data-do="confirm-cos" ${sel.length!==2?"disabled":""}>Comparar estas duas</button></div>`}</div>`}
function wMetrics(locked){
  return `<div class="widget ${locked?"locked":""}"><div class="mgroups">${GROUPS.map(g=>`<div class="mg"><h4>${g}</h4><div class="mets">${ORDER.filter(k=>MET[k].g===g).map(k=>{const ok=avail(k),why=ok?"":S.picks.map(e=>ND[`${k}|${e}`]).filter(Boolean)[0]||"";
     return `<label class="met ${ok?"":"off"}"><input type="checkbox" data-met="${k}" ${S.metrics.includes(k)?"checked":""} ${locked||!ok?"disabled":""}><span><b>${esc(MET[k].nome)}</b>${MET[k].rel?`<span class="rel">chave no setor</span>`:""}<small>${esc(ok?MET[k].porque:why)}</small></span></label>`}).join("")}</div></div>`).join("")}</div>
   ${locked?"":`<div class="wfoot"><span class="note">${S.metrics.length} selecionadas · mínimo 4</span><button class="pill dark" data-do="confirm-mets" ${S.metrics.length<4?"disabled":""}>Confirmar métricas</button></div>`}</div>`}

const TABS=[["resumo","Resumo"],["kpis","KPIs"],["hist","Histórico"],["modelo","Modelo de negócio"],["mult","Múltiplos"],["quali","Qualitativo"]];
function srcLabel(k,e,i=0){const s=PROV[`${k}|${e}|${i}`];if(!s)return "";
  if(s.tipo==="verificado")return `ITR ${EMP[e].nome} · pág. ${s.pagina}`;
  if(s.tipo==="cvm")return `CVM${s.conta?" · conta "+String(s.conta).split(" ")[0]:""}`;
  if(s.tipo==="mercado")return `B3 ${VERIF.dataPreco.split("-").reverse().join("/")} + CVM`;
  return "Cálculo · "+(s.formula||"").split(" ")[0].replace(/[()]/g,"")}
const FONTES_CMP=()=>`<div class="srcstrip"><b>Fontes</b><span>ITRs 3T26 de ${S.picks.filter(e=>e!=="c").map(e=>EMP[e].nome).join(" e ")||"—"} (CVM)</span><span>CVM Dados Abertos · ITR 2026 e DFP 2021–2025</span><span>B3 · COTAHIST ${VERIF.dataPreco.split("-").reverse().join("/")}</span><span class="hint2">Clique em um número para ver página e trecho</span></div>`;
function kpiTable(keys){const [a,b]=S.picks;let last="";
  return `<div class="tblwrap"><table><thead><tr><th>Métrica</th><th>${dot(a)} ${co(a).nome} · ${per(a)}</th><th>${dot(b)} ${co(b).nome} · ${per(b)}</th><th>Destaque</th></tr></thead><tbody>${keys.map(k=>{const m=MET[k],L=leader(k);
    const g=m.g!==last?`<tr class="grp"><td colspan="4">${m.g}</td></tr>`:"";last=m.g;
    return g+`<tr><td class="m">${esc(m.nome)}</td><td><span class="v">${numB(k,a)}</span>${delta(k,a)}<small class="srcl">${esc(srcLabel(k,a))}</small></td><td><span class="v">${numB(k,b)}</span>${delta(k,b)}<small class="srcl">${esc(srcLabel(k,b))}</small></td><td>${L?`<span class="best">${dot(L.e)}${co(L.e).nome} · ${L.why}</span>`:""}</td></tr>`}).join("")}</tbody></table></div>
   <span class="small">Variações contra o mesmo trimestre do ano anterior. Consolidado. ROE, ROIC e alavancagem em 12 meses; múltiplos com preço de ${VERIF.dataPreco.split("-").reverse().join("/")}.${hasCSN()?" CSN: dados do 2T26 e EBITDA pelo critério CVM 156 nas duas empresas.":""}</span>`}
function tabHist(){const [a,b]=S.picks,M=[["receita","Receita","R$ mi"],["margem_ebitda","Margem EBITDA (CVM 156)","%"],["lucro_consolidado","Lucro líquido","R$ mi"],["fcf","Fluxo de caixa livre","R$ mi"],["roe","ROE","%"],["divida_liquida_ebitda","Dív. líq./EBITDA","x"]];
  const t=e=>{const H=HIST?.[e]||{},Y=Object.keys(H);if(!Y.length)return `<p class="note">Histórico indisponível.</p>`;
    return `<div class="tblwrap"><table class="htbl"><thead><tr><th>${dot(e)} ${co(e).nome}</th>${Y.map(y=>`<th>${y}</th>`).join("")}</tr></thead><tbody>${M.map(([k,n,u])=>`<tr><td class="m">${n}</td>${Y.map(y=>{const v=H[y][k];return `<td>${v==null?"n.d.":u==="R$ mi"?nf(v):u==="%"?nf(v,1)+"%":nf(v,1)+"x"}</td>`}).join("")}</tr>`).join("")}</tbody></table></div>`};
  return `<div class="charts">${gLine("Margem EBITDA (CVM 156), 2021–2025","margem_ebitda","%")}${gLine("ROE, 2021–2025","roe","%")}</div>${t(a)}${t(b)}<span class="small">Fonte: CVM Dados Abertos, DFP de 2021 a 2025, consolidado, em R$ milhões. EBITDA pelo critério CVM 156, sem os ajustes das empresas. Dív. líq./EBITDA fica n.d. quando o EBITDA é negativo.</span>
   <div class="read"><b>O que mudou:</b> o ciclo de 2021 levou margens e retornos ao pico; desde então o aço importado e a normalização de preços comprimiram as margens no Brasil. Compare a trajetória de cada empresa antes de julgar o trimestre.</div>`}
function tabResumo(){const [a,b]=S.picks,keys=[mgn(),"roic","alav","ev"].filter(k=>S.metrics.includes(k)).slice(0,3);
  return `<ol class="concl">${S.concl.map(c=>`<li>${esc(c)}</li>`).join("")}</ol><div class="charts">${gBars(MET[mgn()].nome,mgn())}${gBars("Receita líquida · R$ mi","receita")}</div>
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
  const body0={hist:tabHist,resumo:tabResumo,kpis:()=>kpiTable(S.metrics),modelo:tabModelo,mult:tabMult,quali:tabQuali}[S.tab]();
  const body=FONTES_CMP()+body0;
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
  document.querySelectorAll("[data-proof]").forEach(el=>{el.textContent=el.dataset.proof==="prov"?Object.keys(PROV).length:`${VERIF.aprovadas}/${VERIF.metricas}`});
  countUp()}
const SUGG_SX={t:"Panorama de outros setores: bancos, energia, petróleo, mineração e varejo",i:"view-grid",h:"Panorama",sx:"bancos"};
const SUGG=[{t:"Este setor é um bom lugar para investir?",i:"page-search",h:"Tese do setor"},{t:"Compare Gerdau e Usiminas no 3T26",p:["g","u"],i:"stats-up-square",h:"Comparativo"},{t:"Compare Gerdau e CSN",p:["g","c"],i:"stats-up-square",h:"Comparativo"},{t:"Compare Usiminas e CSN",p:["u","c"],i:"stats-up-square",h:"Comparativo"}];
function renderDash(){const h=new Date().getHours(),sd=h<12?"Bom dia":h<18?"Boa tarde":"Boa noite",nm=(ACCT?.nome||"").trim().split(/\s+/)[0];
  $("greet").textContent=`${sd}${nm?", "+nm:""}.`;

  $("sugg").innerHTML=[...SUGG,...(SXORDER.length?[SUGG_SX]:[])].map((x,i)=>`<button type="button" data-sugg="${i}">${ic(x.i)}<span>${esc(x.t)}</span><small>${x.h}</small></button>`).join("")}
/* menu + do painel */
let DPICK=[],pSec=null;
const PSECS=[["siderurgia","Siderurgia","industry","Análise completa"],...SXORDER.map(k=>[k,SETX[k].nome,{bancos:"bank",energia:"flash",petroleo:"droplet",mineracao:"hammer",varejo:"shopping-bag"}[k]||"view-grid","Panorama"])];
function renderPMenu(){const m=$("pmenu");if(!m)return;
  if(!pSec){m.innerHTML=`<div class="ph">Analisar</div><button type="button" data-pact="tese">${ic("page-search")}<span class="tx">Tese do setor de siderurgia<small>Veredito, drivers e os 8 pontos</small></span></button><div class="sep"></div><div class="ph">Empresas por setor</div>${PSECS.map(([k,n,i,h])=>`<button type="button" data-psec="${k}">${ic(i)}<span class="tx">${esc(n)}<small>${k==="siderurgia"?"Gerdau, Usiminas e CSN":SETX[k].empresas.length+" empresas"}</small></span><span class="rt">${h}${ic("nav-arrow-right")}</span></button>`).join("")}`;return}
  const back=`<button type="button" data-pback>${ic("nav-arrow-left")}<span class="tx">${esc(PSECS.find(x=>x[0]===pSec)[1])}</span></button><div class="sep"></div>`;
  if(pSec==="siderurgia"){m.innerHTML=back+`<div class="ph">Escolha até duas para comparar</div>`+["g","u","c"].map(e=>`<button type="button" class="${DPICK.includes(e)?"on":""}" data-pco="${e}">${logo(e,"sm")}<span class="tx">${esc(EMP[e].nome)}<small>${EMP[e].tk} · ${esc(EMP[e].desc)}</small></span>${DPICK.includes(e)?`<span class="rt">${ic("check")}</span>`:""}</button>`).join("");return}
  m.innerHTML=back+SETX[pSec].empresas.map((e,i)=>`<button type="button" data-pco="${pSec}|${i}"><span class="tk">${esc(e.tk)}</span><span class="tx">${esc(nomeBonito(e.nome||e.tk))}<small>${esc(e.per||e.db||"")}</small></span></button>`).join("")}
const nomeBonito=n=>String(n).replace(/\s+-\s+EM RECUPERA.*$/i,"").toLowerCase().replace(/(^|[\s(&\/-])([a-zà-ú])/g,(m,a,b)=>a+b.toUpperCase()).replace(/\bS\.?a\.?$/i,"S.A.").replace(/\b(De|Da|Do|Dos|Das|E)\b/g,w=>w.toLowerCase());
function renderDChips(){const c=$("dchips");if(c)c.innerHTML=DPICK.map(e=>`<span class="dchip">${esc(EMP[e].nome)}<button type="button" data-unpick="${e}" aria-label="Remover ${esc(EMP[e].nome)}">${ic("xmark")}</button></span>`).join("")}
function togglePMenu(open){const m=$("pmenu");if(!m)return;const o=open??m.hidden;m.hidden=!o;$("plusbtn").setAttribute("aria-expanded",String(o));if(o){pSec=null;renderPMenu()}}
function picksFrom(t){t=t.toLowerCase();const f=[];[["g","gerdau"],["u","usiminas"],["c","csn"],["c","siderúrgica nacional"]].forEach(([k,w])=>{if(t.includes(w)&&!f.includes(k))f.push(k)});return f.slice(0,2)}
async function startWith(picks,q,keep){await startSector("siderurgia",q,keep);if(picks&&picks.length===2){await wait(250);goCos();S.picks=picks;confirmCos()}}
var seenMsgs=0;
function renderThread(){
  const fresh=S.msgs.length>seenMsgs?seenMsgs:Infinity;seenMsgs=S.msgs.length;
  $("thread").innerHTML=S.msgs.map((m,i)=>{const f=i>=fresh?" fade":"";
    if(m.role==="user"){if(editIdx===i)return `<div class="msg user"><div class="editbox"><textarea id="edit-ta">${esc(m.text)}</textarea><div class="macts"><button class="pill sm" data-edit-cancel>Cancelar</button><button class="pill dark sm" data-edit-send>Reenviar</button></div></div></div>`;
      return `<div class="msg user${f}"><div class="ub">${m.typed&&!busy?`<button class="edit" data-edit="${i}" aria-label="Editar mensagem">${ic("edit-pencil")}</button>`:""}<div class="bubble">${esc(m.text)}</div></div></div>`}
    const lc=S.step!=="companies"||S.msgs.findLastIndex(x=>x.w==="companies")!==i, lm=S.step!=="metrics"||S.msgs.findLastIndex(x=>x.w==="metrics")!==i;
    const w=m.w==="sxverdict"?wSXVerdict():m.w==="sectorpick"?wSectorPick(i):m.w==="sxpick"?wSXPick(i):m.w==="sxcmp"?wSXCmp(i):m.w==="sx"?wSX(i):m.w==="val"?wVal(i):m.w==="sector"?wSector():m.w==="companies"?wCompanies(lc):m.w==="metrics"?wMetrics(lm):m.w==="card"?wCard(i):m.w==="deck"?wDeck():m.w==="mini"?wMini(m.keys):"";
    return `<div class="msg bot${f}"><span class="who"><img src="${BRAND.mark}" alt="">Fiscus</span>${m.thinking?`<div class="bubble thinking">${esc(m.text||"Pensando")}</div>`:(m.text?`<div class="bubble">${esc(m.text)}</div>`:"")}${w}</div>`}).join("");
  const ch=S.step==="rejected"?["Trocar métricas","Gerar outro título","Trocar empresas"]:(S.step==="done"||S.step==="card")?["Quem está mais barata?","Qual tem melhor ROIC?","Como está o endividamento?"]:[];
  $("choices").innerHTML=ch.map(c=>`<button class="pill ghost sm" data-choice="${esc(c)}">${esc(c)}</button>`).join("");
  $("q").placeholder={sectorpick:"Escolha um setor acima",sxpick:"Escolha duas empresas acima",val:"Ajuste as premissas acima e confirme",sector:"Pergunte sobre o setor ou siga para as empresas",companies:"Escolha duas empresas acima",metrics:"Ajuste as métricas acima e confirme"}[S.step]||"Pergunte sobre as métricas";
}
function renderSide(){const L=STORE.list;
  $("hist").innerHTML=L.length?L.map(a=>`<li class="${a.id===S.id&&S.view==="chat"?"cur":""}"><button class="open" data-an="${a.id}"><b>${esc(anTitle(a))}</b><span>${a.kind==="panorama"?"Outros setores":"Siderurgia"} · ${when(a.updated)}</span></button><button class="del " data-del="${a.id}" aria-label="Apagar análise">${ic("trash")}</button></li>`).join("")
   :`<li class="hist-empty">Suas análises aparecem aqui. Cada uma guarda a conversa inteira.</li>`;
  $("crumb").textContent=S.view==="dash"?"":S.kind==="panorama"?anTitle(S):`Siderurgia · ${anTitle(S)}`;
  const prontas=L.filter(a=>a.verdict==="ok").length,pares=L.filter(a=>a.picks?.length===2).length;
  if(!ACCT)return;
  const pl=(PLANS[ACCT?.plano]||PLANS.pro);
  $("me").innerHTML=`<button type="button" class="mebtn" id="mebtn" aria-haspopup="menu" aria-expanded="false"><span class="avt2">${esc(initials(ACCT?.nome))}</span><span class="mn"><b>${esc((ACCT?.nome||"Você").split(" ")[0])}</b><span> · ${esc(pl.n)}</span></span>${ic("nav-arrow-down")}</button>
   <div class="mepop" id="mepop" role="menu" hidden>
    <div class="mp-h"><b>${esc(ACCT?.nome||"Você")}</b><small>${esc([ACCT?.funcao,ACCT?.inst].filter(Boolean).join(" · ")||"Perfil local")}</small></div>
    <div class="mp-r"><span>Plano</span><b>${esc(pl.n)} · ${esc(pl.p)}</b></div>
    <div class="mp-r"><span>Análises</span><b>${L.length}</b></div><div class="mp-r"><span>Comparativos</span><b>${pares}</b></div><div class="mp-r"><span>Apresentações prontas</span><b>${prontas}</b></div>
    <div class="mp-r"><span>Assistente</span><b><i class="dot" style="background:${sample?"var(--green-ios)":"var(--faint)"}"></i>${sample?"Claude conectado":"Demonstração"}</b></div>
    <div class="mp-sep"></div><button type="button" class="mp-out" data-logout>Sair</button></div>`}
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
function renderSignup(){$("su-plans").innerHTML=Object.entries(PLANS).map(([k,x])=>`<button type="button" role="radio" aria-checked="${k===suPlan}" data-plan-pick="${k}"><b>${x.n}</b><span>${x.p}</span></button>`).join("");$("su-roles").innerHTML=ROLES.map(x=>`<button type="button" role="radio" aria-checked="${x===suRole}" data-role="${esc(x)}">${esc(x)}</button>`).join("")}
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
function accept(){if(S.picks.length!==2){return}S.verdict="ok";S.step="val";user("Aceito");const pe=S.picks.includes(SETOR.veredito.escolha)?SETOR.veredito.escolha:S.picks[0];
  S.val={e:pe,prem:premDefaults(),done:false};bot("Agora monte a sua tese. Ajuste as premissas: o Fiscus calcula o preço-alvo com os números verificados e as suas escolhas, e mostra a sensibilidade.","val");render();scrollEnd()}
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
  if(S.kind==="panorama"){user(q,true);const sx=sxFrom(q);if(sx&&sx!==S.sx){S.sx=sx;bot(`Mudei para o panorama de ${SETX[sx].nome}.`,"sx")}else bot("Nos outros setores o Fiscus mostra o panorama financeiro verificado na base da CVM. A tese completa e o comparativo guiado estão em construção; por enquanto, só a siderurgia tem essa análise.");render();scrollEnd();return}
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
function buildSlides(){const v=S.val&&S.val.done,base=[
 {k:"cover",label:"Tese do setor"},{k:"sens",label:"O que move o setor"},{k:"topics",label:"Estrutura, cadeia e regulação"},
 {k:"cmp",label:S.title||"Comparativo"},{k:"kpis",label:"KPIs lado a lado"},{k:"modelo",label:"Modelos de negócio"},{k:"mult",label:"Múltiplos"},{k:"quali",label:"Leitura qualitativa e riscos"},
 {k:"check",label:"Como sabemos que está certo"},{k:"meth",label:"Fontes e metodologia"}];
  const gl={k:"glance",label:"Visão geral da empresa"},sn={k:"setnum",label:"O setor em números"},dr={k:"drivers",label:`O que move ${co(focusE()).nome}`};
  base.splice(base.findIndex(x=>x.k==="sens"),0,sn);base.splice(base.findIndex(x=>x.k==="cmp"),0,dr);
  if(!v){base.splice(base.findIndex(x=>x.k==="cmp"),0,gl);return base}
  const i=base.findIndex(x=>x.k==="check");base.splice(i,0,{k:"val",label:"Valuation e sensibilidade"});
  base.splice(base.findIndex(x=>x.k==="val")+1,0,{k:"sensmx",label:"Sensibilidade do preço-alvo"},{k:"ratios",label:"Indicadores 2021A–2030P"});
  return [{k:"rec",label:`${S.val.rec} · ${co(S.val.e).nome}`},{k:"price",label:`${EMP[S.val.e].tk} · preço × alvo`},{k:"pillars",label:"Tese em 3 pilares"},gl,...base,{k:"concl",label:"Conclusão"}]}
/* gráficos dos slides (SVG; escalas únicas; dados de DATA) */
const RC={g:"#00468b",u:"#5a9e1b",c:"#c8102e"};
function sHBarRef(title,rows,ref,refLbl,unit){const w=560,h=40+rows.length*46,L=110,R=60,mx=Math.max(ref,...rows.map(r=>Math.abs(r.v)))*1.15,mn=Math.min(0,...rows.map(r=>r.v))*1.15,sx=v=>L+(v-mn)/(mx-mn)*(w-L-R);
  let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`;
  rows.forEach((r,i)=>{const y=24+i*46,x0=sx(0),x1=sx(r.v);s+=`<text x="${L-10}" y="${y+18}" text-anchor="end" class="cl">${esc(r.l)}</text><rect x="${Math.min(x0,x1)}" y="${y}" width="${Math.max(2,Math.abs(x1-x0))}" height="26" fill="${r.c}"/><text x="${(r.v>=0?x1+6:x1-6)}" y="${y+18}" text-anchor="${r.v>=0?"start":"end"}" class="cv">${nf(r.v,1)}${unit}</text>`});
  const xr=sx(ref);s+=`<line x1="${xr}" x2="${xr}" y1="14" y2="${h-6}" stroke="#d70015" stroke-width="2" stroke-dasharray="5 4"/><text x="${xr+5}" y="12" class="cr">${esc(refLbl)} ${nf(ref,2)}${unit}</text>`;
  return `<div class="cbox"><h6>${esc(title)}</h6>${s}</svg></div>`}
function sLines(title,series,unit,yref){const w=600,h=260,L=44,R=16,T=18,B=28,all=series.flatMap(x=>x.pts.map(p=>p[1])).filter(v=>v!=null);const mn=Math.min(...all,yref??Infinity,0),mx=Math.max(...all)*1.08;const n=series[0].pts.length,x=i=>L+i*(w-L-R)/(n-1),y=v=>T+(h-T-B)*(1-(v-mn)/(mx-mn));
  let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`;[mn,(mn+mx)/2,mx].forEach(t=>{s+=`<line x1="${L}" x2="${w-R}" y1="${y(t)}" y2="${y(t)}" stroke="#e3e6f3"/><text x="${L-6}" y="${y(t)+4}" text-anchor="end" class="ca">${nf(t,0)}${unit}</text>`});
  if(mn<0)s+=`<line x1="${L}" x2="${w-R}" y1="${y(0)}" y2="${y(0)}" stroke="#999" stroke-width="1"/>`;
  const step=Math.max(1,Math.ceil(n/6));series[0].pts.forEach((p,i)=>{if(i%step===0||i===n-1)s+=`<text x="${x(i)}" y="${h-8}" text-anchor="middle" class="ca">${esc(String(p[0]).slice(0,4))}</text>`});
  series.forEach(se=>{const d=se.pts.map((p,i)=>p[1]==null?null:`${x(i)},${y(p[1])}`).filter(Boolean).join(" ");s+=`<polyline points="${d}" fill="none" stroke="${se.c}" stroke-width="2.6" stroke-linejoin="round"/>`;const lp=se.pts[se.pts.length-1];if(lp[1]!=null)s+=`<circle cx="${x(n-1)}" cy="${y(lp[1])}" r="4" fill="${se.c}"/><text x="${x(n-1)-6}" y="${y(lp[1])-8}" text-anchor="end" class="cv">${nf(lp[1],1)}${unit}</text>`});
  return `<div class="cbox"><h6>${esc(title)}</h6>${s}</svg><div class="clg">${series.map(se=>`<span><i style="background:${se.c}"></i>${esc(se.n)}</span>`).join("")}</div></div>`}
function sStack(title,rows){return `<div class="cbox"><h6>${esc(title)}</h6><div class="stk">${rows.map(r=>`<div><span class="sl">${esc(r.l)}</span><span class="sb"><i style="width:${r.v}%;background:var(--rb)"></i><em style="width:${100-r.v}%"></em></span><span class="sv"><b>${nf(r.v,1)}%</b> ${esc(r.a)} · ${nf(100-r.v,1)}% ${esc(r.b)}</span></div>`).join("")}</div></div>`}
const RSNAV=["Visão geral","Setor","Comparativo","Valuation","Riscos","Metodologia"];
const RSSEC={sensmx:3,price:0,ratios:3,setnum:1,drivers:2,pillars:0,glance:0,rec:0,cover:1,sens:1,topics:1,cmp:2,kpis:2,modelo:2,mult:2,quali:4,val:3,check:5,meth:5,concl:0};
const BRANDC={g:"#00468b",u:"#5a9e1b",c:"#1f3b8f"};
const focusE=()=>S.val&&S.val.done?S.val.e:(S.picks.includes(SETOR.veredito.escolha)?SETOR.veredito.escolha:S.picks[0]);
const themeStyle=()=>{const c=BRANDC[focusE()]||"#1f3fd6";return `style="--rb:${c}"`};
function rsFrame(k,idx,n,title,sub,body,src){const [a,b]=S.picks,focus=S.val&&S.val.done?S.val.e:null;
  const lg=focus?logo(focus):`<img class="fz" src="${BRAND.logo}" alt="Fiscus">`;
  return `<div class="slide rs" ${themeStyle()}><div class="ttabs">${RSNAV.map((x,i)=>`<span class="${RSSEC[k]===i?"on":""}">${x}</span>`).join("")}<span class="tlogo">${lg}</span></div>
   <div class="rh"><div class="rt"><h2>${title}</h2><p>${sub}</p></div></div>
   <div class="rbody">${body}</div>
   <div class="rf2"><em>${idx+1}</em><p class="src">Fonte: ${src||"Fiscus, ITRs 3T26, CVM Dados Abertos, B3"}</p><img src="${BRAND.logo}" alt="Fiscus"></div></div>`}
const band=items=>`<div class="band">${items.map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>`;
const dia=items=>`<ul class="dia">${items.map(x=>`<li>${x}</li>`).join("")}</ul>`;
function slideHTML(idx){const all=buildSlides(),s=all[idx],n=all.length,[a,b]=S.picks;const V=SETOR.veredito,T=SETOR.topicos,F=(...x)=>rsFrame(s.k,idx,n,...x);
  const dt=VERIF.dataPreco.split("-").reverse().join("/");
  if(s.k==="rec"){const Vv=S.val,r=dcf(Vv.e,Vv.prem),okp=r&&!r.erro&&r.eq>0,cls=okp?recOf(r.up)[1]:"sell";
    const bc=BRANDC[Vv.e]||"#1f3fd6",tiles=[[bc,8,52],[bc+"cc",34,22],[bc+"66",58,48],["#00b050",34,74],[bc+"33",80,26],[bc,80,72],[bc+"1a",58,4]];
    return `<div class="slide rs cover" style="--rb:${bc}"><div class="cl"><div class="brandrow"><img src="${BRAND.logo}" alt="Fiscus"><i></i><span>Fiscus Research · Siderurgia</span></div>
     <div class="co">${logo(Vv.e)}<span>(${EMP[Vv.e].tk}: B3)</span></div><div class="upd">Última atualização: 06/11/2026 · preço de ${dt}</div>
     <div class="recbox"><div class="r1">Recomendação: <b class="${cls}">${esc(Vv.rec.toUpperCase())}</b></div>
      <div class="r2"><span>Preço-alvo 12m: ${okp?brl(r.price):"—"}</span><span>Potencial: ${okp?pct(r.up):"—"}</span></div></div>
     <div class="team">${esc(ACCT?.nome||"Fiscus")}${ACCT?.inst?" | "+esc(ACCT.inst):""} · Exercício acadêmico, não é recomendação de investimento</div></div>
     <div class="cr">${tiles.map(([c,x,y])=>`<span class="dm" style="background:${c};left:${x-19}%;top:${y-19}%"></span>`).join("")}</div></div>`}
  if(s.k==="price"){const Vv=S.val,r=dcf(Vv.e,Vv.prem),okp=r&&!r.erro&&r.eq>0,P=PRICES?.[Vv.e]||[],tk=EMP[Vv.e].tk;
    const w=1000,h=520,L=50,R=20,T=20,B=40,vs=P.map(x=>x[1]),tg=okp?r.price:null,mx=Math.max(...vs,tg||0)*1.12,mn=0,x=i=>L+i*(w-L-R-90)/(P.length-1),y=v=>T+(h-T-B)*(1-(v-mn)/(mx-mn));
    let s=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">`;const st=mx/4;[0,1,2,3,4].forEach(i=>{const v=st*i;s+=`<line x1="${L}" x2="${w-R}" y1="${y(v)}" y2="${y(v)}" stroke="#333"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" fill="#999" font-size="14">${nf(v,0)}</text>`});
    P.forEach((p,i)=>{if(i%52===0)s+=`<text x="${x(i)}" y="${h-12}" text-anchor="middle" fill="#999" font-size="14">${p[0].slice(0,4)}</text>`});
    s+=`<polyline points="${P.map((p,i)=>`${x(i)},${y(p[1])}`).join(" ")}" fill="none" stroke="#8fb3d9" stroke-width="2.2"/>`;
    const xe=x(P.length-1),ye=y(P[P.length-1][1]);if(tg){const yt=y(tg);s+=`<polygon points="${xe},${ye} ${xe+80},${Math.min(ye,yt)-30} ${xe+80},${Math.max(ye,yt)+30}" fill="#7a7f88" opacity=".55"/><line x1="${xe}" x2="${xe+80}" y1="${yt}" y2="${yt}" stroke="#fff" stroke-dasharray="4 4"/><rect x="${xe+72}" y="${yt-8}" width="16" height="16" transform="rotate(45 ${xe+80} ${yt})" fill="#fff"/>`}
    s+=`<circle cx="${xe}" cy="${ye}" r="5" fill="#fff"/></svg>`;
    return `<div class="slide rs dark2"><div class="rh"><div class="rt light"><h2>${esc(tk)} · <span class="hl2">${esc(Vv.rec.toUpperCase())}</span></h2><p style="color:#ccc">${esc(Vv.mkt)}</p></div></div>
     <div class="pxw"><div class="pxc">${s}</div><div class="pxb"><div class="ibox"><h6>Análise de investimento</h6><div>Preço atual: <b>${brl(r.b.preco)}</b></div><div>Preço-alvo: <b>${okp?brl(r.price):"—"}</b></div><div class="rk">${esc(Vv.rec.toUpperCase())}</div></div>
      <div class="kpi2"><b>DCF: ${okp?pct(r.up):"—"} de potencial</b></div><div class="kpi2"><b>Ke ${pc(r.ke)} · WACC ${pc(r.wacc)}</b><span>Premissas do usuário; T-bond 10a de ${nf(VAL.rf.valor,2)}%</span></div></div></div>
     <div class="rf2"><em>${idx+1}</em><p class="src" style="color:#9aa">Cotação semanal de 5 anos: Yahoo Finance; último ponto: fechamento B3 de ${esc(r.b.dataPreco.split("-").reverse().join("/"))}</p><img src="${BRAND.logoWhite}" alt="Fiscus"></div></div>`}
  if(s.k==="ratios"){const Vv=S.val,e=Vv.e,H=HIST?.[e]||{},Y=Object.keys(H),r=dcf(e,Vv.prem),PY=[2026,2027,2028,2029,2030],g5=Vv.prem.g5/100,rec12=val("receita",e)!=null?null:null;
    const recA=Y.map(y=>H[y].receita),recP=PY.map((_,i)=>H[Y[Y.length-1]].receita*Math.pow(1+g5,i+1)),fcP=PY.map((_,i)=>r.f0*Math.pow(1+g5,i+1));
    const row=(n,a,p,fm)=>`<tr><td class="m">${n}</td>${a.map(v=>`<td>${v==null?"n.d.":fm(v)}</td>`).join("")}${p.map(v=>`<td class="pj">${v==null?"—":fm(v)}</td>`).join("")}</tr>`;
    const f0=v=>nf(v,0),f1=v=>nf(v,1)+"%",fx=v=>nf(v,1)+"x";
    return F(`Indicadores de ${esc(EMP[e].nome)}`,`Histórico <b>2021A–2025A</b> da CVM e projeção <b>2026P–2030P</b> com as suas premissas`,
     `<div class="tblwrap ratios"><table><thead><tr><th>R$ milhões</th>${Y.map(y=>`<th>${y}A</th>`).join("")}${PY.map(y=>`<th class="pj">${y}P</th>`).join("")}</tr></thead><tbody>
      <tr class="grp"><td colspan="${Y.length+PY.length+1}">Crescimento</td></tr>${row("Receita líquida",recA,recP,f0)}
      <tr class="grp"><td colspan="${Y.length+PY.length+1}">Margens e retorno</td></tr>${row("Margem EBITDA (CVM 156)",Y.map(y=>H[y].margem_ebitda),PY.map(()=>null),f1)}${row("ROE",Y.map(y=>H[y].roe),PY.map(()=>null),f1)}
      <tr class="grp"><td colspan="${Y.length+PY.length+1}">Caixa e balanço</td></tr>${row("Fluxo de caixa livre",Y.map(y=>H[y].fcf),fcP,f0)}${row("Dívida líquida / EBITDA",Y.map(y=>H[y].divida_liquida_ebitda),PY.map(()=>null),fx)}</tbody></table></div>
      <span class="small">A: CVM Dados Abertos, DFP consolidada. P: receita e fluxo de caixa livre do DCF, crescendo ${nf(Vv.prem.g5,1)}% ao ano (premissa do usuário); margens e alavancagem não são projetadas.</span>`,"CVM Dados Abertos (DFP 2021–2025), Fiscus DCF")}
  if(s.k==="pillars"){const Vv=S.val,nm=["Posição","Resultado","Valor"];
    return `<div class="slide rs dark2"><div class="rh"><div class="rt light"><h2><span class="hl2">Tese de investimento</span> sustentada por 3 pilares…</h2></div></div>
     <div class="pillars">${Vv.args.map((x,i)=>`<div class="pil" style="margin-left:${i*16}%;opacity:${1-i*.12}"><div class="pt"><b>${nm[i]||"Pilar "+(i+1)}:</b> ${esc(x)}</div><div class="pcol"><i></i><i></i><i></i></div></div>`).join("")}</div>
     <div class="rf2"><em>${idx+1}</em><p class="src" style="color:#9aa">Tese escrita pelo Claude a partir dos dados verificados e das premissas do usuário</p><img src="${BRAND.logoWhite}" alt="Fiscus"></div></div>`}
  if(s.k==="glance"){const e=S.val&&S.val.done?S.val.e:S.picks[0],E=EMP[e],H=HIST?.[e]||{},Y=Object.keys(H);const pal=["#1f3fd6","#7f95ea","#c9d2f8","#9aa0a9"];
    const hb=Y.length?`<div class="mini-bars">${Y.map(y=>{const v=H[y].receita,mx=Math.max(...Y.map(z=>H[z].receita||0));return `<div><b>${nf(v/1000,0)}</b><i style="height:${v/mx*100}%"></i><span>${y.slice(2)}</span></div>`}).join("")}</div>`:"";
    return F(`${esc(E.nome)} em uma página`,`Uma das maiores siderúrgicas listadas, com <b>${esc(E.desc.split("·")[1]||E.desc)}</b>`,
     `<div class="gl3"><div class="glp"><h6>A receita vem de ${E.mix?E.mix.length:"vários"} segmentos…</h6>${E.mix?`<div class="mixv">${E.mix.map((m,i)=>`<div><span>${esc(m[0])}</span><i style="width:${m[1]}%;background:${pal[i]}"></i><b>${m[1]}%</b></div>`).join("")}</div><small>Participação no EBITDA ajustado, ${per(e)}</small>`:`<p>${esc(E.mixFonte)}</p>`}</div>
      <div class="glp"><h6>…com receita que acompanha o ciclo…</h6>${hb}<small>Receita anual, R$ bi · CVM, DFP</small></div>
      <div class="glp"><h6>…e um balanço que decide o ciclo</h6><div class="kv"><span>Dív. líq./EBITDA</span><b>${fmt(val("alav",e),"x")}</b></div><div class="kv"><span>ROIC 12m</span><b>${fmt(val("roic",e),"%")}</b></div><div class="kv"><span>EV/EBITDA</span><b>${fmt(val("ev",e),"x")}</b></div><small>CVM Dados Abertos e B3, ${VERIF.dataPreco.split("-").reverse().join("/")}</small></div></div>`,"ITRs 3T26, CVM Dados Abertos (DFP 2021–2025), B3")}
  if(s.k==="setnum"){const Fx=SETOR.fatos||[],pick=re=>Fx.find(x=>re.test(x.u));
    const it=[[/aço bruto$|^mil t de aço bruto$/,"Mt de aço bruto produzidas em 2025",v=>nf(v>1000?v/1000:v,1)],[/utilização/,"da capacidade em uso",v=>nf(v,1)+"%"],[/CR5/,"da produção em 5 grupos",v=>nf(v,1)+"%"],[/penetração de importados/,"do consumo vem de importados",v=>nf(v,1)+"%"],[/construção civil/,"do aço vai para a construção",v=>nf(v,1)+"%"],[/Section 232/,"de tarifa dos EUA sobre aço importado",v=>nf(v,0)+"%"],[/exportadas pela China/,"Mt exportadas pela China em 2025",v=>nf(v,1)],[/tarifa efetiva/,"de tarifa efetiva no Brasil",v=>nf(v,1)+"%"]].map(([re,l,fm])=>{const x=pick(re);return x?{v:fm(x.v),l,f:x.f}:null}).filter(Boolean);
    const big=it.slice(0,4),small=it.slice(4);
    return F("O setor em números",`Siderurgia brasileira: <b>produção parada, capacidade ociosa e importado em alta</b>`,
     `<div class="setnum"><div class="sn-ic">${ic("industry")}</div><div class="sn-grid">${big.map(x=>`<div class="sn"><b>${x.v}</b><span>${esc(x.l)}</span></div>`).join("")}</div></div>
      ${(()=>{const u=pick(/utilização/),im=pick(/penetração de importados/),co=pick(/construção civil/);return sStack("Onde está a folga do setor",[u?{l:"Capacidade instalada",v:u.v,a:"em uso",b:"ociosa"}:null,im?{l:"Consumo aparente",v:100-im.v,a:"nacional",b:"importado"}:null,co?{l:"Destino do aço",v:co.v,a:"construção civil",b:"demais setores"}:null].filter(Boolean))})()}
      <div class="band">${small.map(x=>`<div><b>${x.v}</b><span>${esc(x.l)}</span></div>`).join("")}</div>`,
     [...new Set(it.map(x=>x.f.split("–")[0].split("(")[0].trim()))].slice(0,3).join("; "))}
  if(s.k==="drivers"){const e=focusE(),E=EMP[e],Q=E.quali,pal=["var(--rb)","#9aa0a9","#cfd3da"];
    const mix=E.mix?`<div class="bmc"><h5>Onde está o resultado</h5>${E.mix.map((m,i)=>`<div class="kv"><span>${esc(m[0])}</span><b>${m[1]}%</b></div>`).join("")}<small class="small">${esc(E.mixFonte)}</small></div>`:"";
    return F(`O que move ${esc(E.nome)}`,`Os fatores que <b>decidem o resultado de ${esc(E.nome)}</b> nos próximos trimestres`,
     `<div class="bm" style="grid-template-columns:1.2fr .8fr"><div class="bmc"><h5>O que acompanhar</h5>${dia(Q.r.map(esc))}<h5 style="margin-top:6px">Forças da empresa</h5>${dia(Q.f.map(esc))}</div>${mix}</div>
      <div class="sens">${SETOR.sens.slice(0,2).map(x=>`<div class="srow"><span>${esc(x.d)}</span><span class="lvlbar">${[1,2,3].map(i=>`<i class="${i<=x.n?"on":""}"></i>`).join("")}</span><span class="dado">${esc(x.dado)}</span></div>`).join("")}</div>`,
     `ITR ${E.nome} ${per(e)}, BCB, IBGE, Aço Brasil`)}
  if(s.k==="cover"){const roe=["g","u","c"].map(e=>({l:EMP[e].nome+(e==="c"?" (2T26)":""),v:val("roe",e),c:RC[e]})).filter(r=>r.v!=null);
    const seg=[{l:"Gerdau · América do Norte",v:val0("g_margem_an_3t26"),c:RC.g},{l:"Gerdau · Brasil",v:val0("g_margem_br_3t26"),c:RC.g+"88"},{l:"Usiminas · Siderurgia",v:val0("u_margem_sid_3t26"),c:RC.u}].filter(r=>r.v!=null);
    const hist=["g","u","c"].filter(e=>HIST?.[e]).map(e=>({n:EMP[e].nome,c:RC[e],pts:Object.keys(HIST[e]).map(y=>[y,HIST[e][y].margem_ebitda])}));
    return F("Tese do setor",`Siderurgia brasileira: <b>${esc(V.nivel.toLowerCase())}</b> para o investidor no 3T26`,
    `<div class="tese"><div class="tl">${band([[esc(V.nivel),"Veredito"],[esc(EMP[V.escolha].nome),"Empresa para a Etapa 2"]])}${dia([esc(V.frase),esc(V.porque)])}</div>
     <div class="tg">${sHBarRef("1. O setor não paga o custo de capital · ROE 12 meses",roe,VAL.selic,"Selic","%")}${sHBarRef("2. A margem está onde há proteção · margem EBITDA ajustada 3T26",seg,0,"","%").replace(/<line[^>]*stroke="#d70015"[^>]*\/><text[^>]*class="cr">[^<]*<\/text>/,"")}</div>
     <div class="tb">${sLines("3. As margens voltaram ao piso do ciclo · margem EBITDA (CVM 156), 2021–2025",hist,"%")}</div></div>`,"CVM Dados Abertos (ITR e DFP), ITRs 3T26 (notas de segmentos), BCB SGS 432")}
  if(s.k==="sens"){const pr=SERIES?.pim_siderurgia_var_12m||[],se=SERIES?.selic_meta||[],m=new Map(se.map(x=>[x[0],x[1]]));const pts=pr.map(x=>[x[0],x[1]]),pts2=pr.map(x=>[x[0],m.get(x[0])??null]);
    return F("O que move o setor",`<b>Juros</b> e <b>importação</b> pesam mais que a demanda física`,`<div class="two2"><div class="sens">${sensRows()}</div>${sLines("Produção siderúrgica (var. 12m, IBGE) × Selic meta (% a.a.)",[{n:"Produção siderúrgica, var. 12 meses",c:"var(--rb)",pts},{n:"Selic meta",c:"#d70015",pts:pts2}],"%")}</div><span class="small">Correlação de Pearson, 2019–2026. Correlação não é causalidade: use como contexto.</span>`,"IBGE PIM-PF (tabela 8885), BCB SGS 432 e 3698, Aço Brasil, Banco Mundial")}
  if(s.k==="topics"){const Fx=SETOR.fatos||[],g=re=>Fx.find(x=>re.test(x.u));
    const reg=[[/imposto de importação acima da cota/,"Imposto acima da cota de importação",v=>nf(v,0)+"%"],[/antidumping/,"Antidumping sobre laminados chineses",v=>"US$ "+nf(v,0)+"/t"],[/Section 232/,"Tarifa dos EUA sobre aço importado",v=>nf(v,0)+"%"],[/tarifa efetiva/,"Tarifa efetiva no Brasil (Aço Brasil)",v=>nf(v,1)+"%"]].map(([re,l,fm])=>{const x=g(re);return x?`<div class="regc"><b>${fm(x.v)}</b><span>${l}</span></div>`:""}).join("");
    return F("Estrutura e regulação",`Oligopólio maduro, com o <b>preço limitado pelo aço importado</b>`,`<div class="two"><div>${dia([T[1],T[2],T[4],T[5]].map(x=>`<b>${esc(x.t)}.</b> ${esc(x.tese)}`))}</div><div class="regs"><h6>A proteção em números</h6>${reg}</div></div>`,"Aço Brasil, worldsteel, MDIC/Gecex, Casa Branca (Section 232), ITRs 3T26")}
  if(s.k==="cmp"){const m=mgn();return F(`${esc(co(a).nome)} × ${esc(co(b).nome)}`,esc(S.title),
    band([[fmt(val(m,a),"%"),`Margem · ${co(a).nome}`],[fmt(val(m,b),"%"),`Margem · ${co(b).nome}`],[fmt(val("roic",a),"%"),`ROIC · ${co(a).nome}`],[fmt(val("roic",b),"%"),`ROIC · ${co(b).nome}`],[fmt(val("ev",a),"x"),`EV/EBITDA · ${co(a).nome}`]])+`<div class="bm"><div>${dia(S.concl.map(esc))}</div>${gBars(MET[m].nome,m)}</div>`)}
  if(s.k==="kpis")return F("KPIs lado a lado",`Resultados do trimestre no <b>mesmo critério contábil</b>`,kpiTable(S.metrics.filter(k=>!MET[k].mult).slice(0,8)));
  if(s.k==="modelo")return F("Modelos de negócio",`Modelos diferentes respondem a <b>ciclos diferentes</b>`,tabModelo(),"ITRs 3T26 (notas de segmentos), Formulários de Referência");
  if(s.k==="mult")return F("Múltiplos",`Barato não quer dizer bom: leia <b>EV/EBITDA junto com ROIC</b>`,tabMult(),`B3 COTAHIST ${dt}, CVM Dados Abertos`);
  if(s.k==="quali")return F("Leitura qualitativa e riscos",`O que <b>sustenta, ou ameaça</b>, o resultado do trimestre`,tabQuali());
  if(s.k==="val"){const Vv=S.val;return F("Valuation",Vv.price!=null?`Preço-alvo de <b>${brl(Vv.price)}</b> para ${esc(co(Vv.e).nome)} com as premissas escolhidas`:`O DCF não deixa valor para o acionista de ${esc(co(Vv.e).nome)}`,valResults("nosens"),`Fiscus, CVM, B3, U.S. Treasury (${esc(VAL.rf.data)}), BCB`)}
  if(s.k==="sensmx"){const Vv=S.val,r=dcf(Vv.e,Vv.prem);return F("Sensibilidade do preço-alvo",`Em quais premissas a recomendação muda: <b>verde</b> acima de ${brl(r.b.preco)}, <b>vermelho</b> abaixo`,valResults("onlysens")+`<span class="small">Célula escura: premissas escolhidas pelo usuário. Preço atual: fechamento B3 de ${r.b.dataPreco.split("-").reverse().join("/")}.</span>`,"Fiscus DCF sobre dados da CVM e da B3")}
  if(s.k==="check")return F("Como sabemos que está certo",`Cada número é <b>conferido no documento de origem</b>`,
    band([[`${VERIF.aprovadas}/${VERIF.metricas}`,"Números conferidos na página"],[`${VERIF.cruzOk}/${VERIF.cruz}`,"Cruzamentos com as empresas"],[`${VERIF.armOk}/${VERIF.arm}`,"Armadilhas barradas"],[VERIF.ia.completo,"Teste de controle do Claude"]])+
    `<div class="two2"><div class="tblwrap"><table><thead><tr><th>Cruzamento</th><th>Calculado</th><th>Publicado</th><th></th></tr></thead><tbody>${(VERIF.cruzDet||[]).map(c=>`<tr><td class="m">${esc(c.c)}</td><td>${nf(c.calc,1)}</td><td>${nf(c.pub,1)}</td><td>${c.ok?"✓":"✗"}</td></tr>`).join("")}</tbody></table></div><div>${dia([esc(VERIF.cvm)+".",...VERIF.armadilhas.map(x=>`<b>${esc(x.caso)}:</b> ${esc(x.exp)}`)])}</div></div>`,"Fiscus, pipeline/03_verificar.py, ITRs 3T26");
  if(s.k==="concl"){const Vv=S.val,r=dcf(Vv.e,Vv.prem),okp=r&&!r.erro&&r.eq>0;return F("Conclusão",`<b>${esc(Vv.rec)}</b> para ${esc(co(Vv.e).nome)}${Vv.price!=null?`, com preço-alvo de <b>${brl(Vv.price)}</b> (${pct(Vv.up)})`:""}`,
    band([[esc(Vv.rec.toUpperCase()),"Recomendação"],[okp?brl(r.price):"—","Preço-alvo 12m"],[brl(r.b.preco),"Preço atual"],[okp?pct(r.up):"—","Potencial"],[pc(r.wacc),"WACC"]])+
    `<div class="concl3"><div class="bmc"><h5>O que precisa acontecer</h5>${dia(Vv.trig.map(esc))}</div><div class="bmc"><h5>O que acompanhar</h5>${dia(["Margem EBITDA ajustada por segmento","Dívida líquida sobre EBITDA","Importações de aço e defesa comercial","Preço do minério e câmbio"])}</div><div class="bmc"><h5>Se as premissas mudarem</h5><span class="small">Preço-alvo por WACC × crescimento na perpetuidade</span>${valResults("mini")}</div></div><div class="read"><b>O que o mercado não está precificando:</b> ${esc(Vv.mkt)}</div>`)}
  if(s.k==="concl_old"){const Vv=S.val;return F("Conclusão","",
    `<div class="bm"><div class="bmc"><h5>O que precisa acontecer</h5>${dia(Vv.trig.map(esc))}</div><div class="bmc"><h5>O que acompanhar</h5>${dia(["Margem EBITDA ajustada por segmento","Dívida líquida sobre EBITDA","Importações de aço e defesa comercial","Preço do minério e câmbio"])}</div></div><div class="read"><b>O que o mercado não está precificando:</b> ${esc(Vv.mkt)}</div>`)}
  const flow=`<div class="flowr">${[["PDF","ITRs 3T26",`${VERIF.metricas} métricas mapeadas`],["01","Extração","linha exata da página"],["02","Verificação",`${VERIF.aprovadas}/${VERIF.metricas} aprovadas`],["03","Cruzamentos",`${VERIF.cruzOk}/${VERIF.cruz} com as empresas`],["✓","Slide","só o que passou"]].map(([a,b2,c])=>`<div class="fs"><i>${a}</i><b>${b2}</b><span>${c}</span></div>`).join(`<span class="arr">›</span>`)}</div>`;
  return F("Fontes e metodologia",`Do PDF ao slide, <b>sem número digitado à mão</b>`,flow+dia(["ITRs extraídos por página; cada número é lido da linha exata do documento.","Verificador independente confere página, trecho, unidade e reconciliações.",`CVM Dados Abertos e B3 (preço de ${dt}) para ROE, ROIC e múltiplos; BCB e IBGE para os drivers.`,"O Claude escreve as mensagens e escolhe o que mostrar; os números vêm só dos dados verificados e das premissas do usuário."]),"Fiscus · docs/metodologia.md")}
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
  const dz=t.closest("[data-do]");if(dz){if(dz.dataset.do==="pdf"){exportPDF(dz);return}({"go-cos":goCos,"confirm-cos":confirmCos,"confirm-mets":confirmMets,accept,reject,"val-ok":confirmVal,"val-skip":skipVal,"val-reset":()=>{S.val.prem=premDefaults();render()},
    "sx-cmp":()=>{const X=SETX[S.sx];user(S.sxPicks.map(ix=>X.empresas[ix].tk).join(" × "));S.step="sxdone";bot("Aqui está o comparativo com os números da base oficial. A tese completa deste setor está em construção.","sxcmp");render();scrollEnd()},
    "sx-all":()=>{user("Ver o setor inteiro");S.step="panorama";bot("Panorama do setor, com todas as empresas.","sx");render();scrollEnd()}})[dz.dataset.do]();return}
  const ve=t.closest("[data-vale]");if(ve){S.val.e=ve.dataset.vale;render();return}
  const ch=t.closest("[data-choice]");if(ch){choice(ch.dataset.choice);return}
  const op=t.closest("[data-open]");if(op){openDeck(+op.dataset.open);return}
  const pp=t.closest("[data-plan-pick]");if(pp){suPlan=pp.dataset.planPick;renderSignup();return}
  const lp=t.closest("[data-plan]");if(lp){suPlan=lp.dataset.plan}
  const rl=t.closest("[data-role]");if(rl){suRole=rl.dataset.role;renderSignup();return}
  if(t.closest("[data-logout]")){confirmBox("Sair da conta?","Você volta para a página inicial. Sua conta e suas análises continuam salvas neste navegador para quando entrar de novo.",logout,"Sair");return}
  const lg=t.closest("[data-login]");if(lg){const a=ACC.list.find(x=>x.id===lg.dataset.login);if(a){a.ultimo=Date.now();login(a.id)}return}
  if(t.closest("#mebtn")){const m=$("mepop"),o=m.hidden;m.hidden=!o;$("mebtn").setAttribute("aria-expanded",String(o));return}
  if($("mepop")&&!$("mepop").hidden&&!t.closest("#mepop")){$("mepop").hidden=true;$("mebtn").setAttribute("aria-expanded","false")}
  const sp=t.closest("[data-secpick]");if(sp&&!sp.disabled){pickSector(sp.dataset.secpick);return}
  const xp=t.closest("[data-sxpick]");if(xp&&!xp.disabled){const ix=+xp.dataset.sxpick;S.sxPicks=S.sxPicks.includes(ix)?S.sxPicks.filter(x=>x!==ix):[...S.sxPicks,ix].slice(-2);render();return}
  if(t.closest("#plusbtn")){togglePMenu();return}
  const ps=t.closest("[data-psec]");if(ps){pSec=ps.dataset.psec;renderPMenu();return}
  if(t.closest("[data-pback]")){pSec=null;renderPMenu();return}
  const pa=t.closest("[data-pact]");if(pa){togglePMenu(false);startAsk("Este setor é um bom lugar para investir?");return}
  const pco=t.closest("[data-pco]");if(pco){const v=pco.dataset.pco;if(v.includes("|")){const [sx,i]=v.split("|"),e=SETX[sx].empresas[+i];togglePMenu(false);startPanorama(sx,`Panorama de ${SETX[sx].nome}: ${e.tk}`);return}
    DPICK=DPICK.includes(v)?DPICK.filter(x=>x!==v):[...DPICK,v].slice(-2);renderDChips();renderPMenu();if(DPICK.length===2)togglePMenu(false);$("dq").focus();return}
  const up=t.closest("[data-unpick]");if(up){DPICK=DPICK.filter(x=>x!==up.dataset.unpick);renderDChips();return}
  if(!t.closest("#pmenu")&&$("pmenu")&&!$("pmenu").hidden)togglePMenu(false);
  const sg=t.closest("[data-sugg]");if(sg){const x=[...SUGG,SUGG_SX][+sg.dataset.sugg];if(x.sx)startPanorama(x.sx,x.t);else if(x.p)startWith(x.p,x.t);else startAsk(x.t);return}
  const sxt=t.closest("[data-sxtab]");if(sxt){S.sx=sxt.dataset.sxtab;tabAnim=true;render();return}
  const sxn=t.closest("[data-sxn]");if(sxn){openSX(sxn.dataset.sxn,+sxn.dataset.i,sxn.dataset.m);return}
  const th=t.closest("[data-slide]");if(th){slide=+th.dataset.slide;renderSlide();return}
  const an=t.closest("[data-an]");if(an){openAnalysis(an.dataset.an);return}
  const dl=t.closest("[data-del]");if(dl){const a=STORE.list.find(x=>x.id===dl.dataset.del);if(a)confirmBox("Apagar esta análise?",`"${anTitle(a)}" e a conversa inteira serão removidas deste navegador. Não dá para desfazer.`,()=>deleteAnalysis(a.id));return}
  const ed=t.closest("[data-edit]");if(ed){editIdx=+ed.dataset.edit;renderThread();setTimeout(()=>{const ta=document.getElementById("edit-ta");if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}},0);return}
  if(t.closest("[data-edit-cancel]")){editIdx=null;renderThread();return}
  if(t.closest("[data-edit-send]")){const v=(document.getElementById("edit-ta")?.value||"").trim();const i=editIdx;editIdx=null;if(v)resend(i,v);else renderThread();return}
  const op2=t.closest("[data-dd]");if(op2){if(op2.getAttribute("aria-disabled")!=="true"){closeDD()}return}
  if(!t.closest("#dd"))closeDD();
  const n=t.closest(".num[data-k]");if(n)openD(n.dataset.k,n.dataset.e,n.dataset.i)});
document.addEventListener("input",ev=>{const r=ev.target.closest("[data-prem]");if(!r||!S.val)return;const k=r.dataset.prem,x=PREMS.find(p=>p.k===k);S.val.prem[k]=+r.value;
  $("pv-"+k).textContent=nf(+r.value,2)+(x.u==="%"?"%":x.u?" "+x.u:"");$("valres").innerHTML=valResults();clearTimeout(save.t);save.t=setTimeout(save,400)});
document.addEventListener("change",ev=>{const c=ev.target.closest("[data-met]");if(!c)return;const k=c.dataset.met;
  S.metrics=c.checked?ORDER.filter(m=>m===k||S.metrics.includes(m)):S.metrics.filter(m=>m!==k);render()});
$("signup").addEventListener("submit",e=>{e.preventDefault();const nome=$("su-nome").value.trim();$("su-err").hidden=!!nome;if(!nome){$("su-nome").focus();return}
  const a={id:uid(),nome:nome.slice(0,60),funcao:suRole,plano:suPlan,inst:$("su-inst").value.trim().slice(0,60),criado:Date.now(),ultimo:Date.now()};ACC.list.push(a);
  $("su-nome").value="";$("su-inst").value="";login(a.id)});
$("dask").addEventListener("submit",e=>{e.preventDefault();const q=$("dq").value.trim();$("dq").value="";
  if(DPICK.length){const pk=DPICK.slice();DPICK=[];renderDChips();if(pk.length===2)startWith(pk,q||`Compare ${EMP[pk[0]].nome} e ${EMP[pk[1]].nome}`);else startWith(null,q||`Tese do setor, com foco em ${EMP[pk[0]].nome}`);return}
  const pf=picksFrom(q),sx=pf.length?null:sxFrom(q);if(sx)startPanorama(sx,q);else if(pf.length===2)startWith(pf,q);else startAsk(q||"Quero analisar um setor")});
$("dq").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("dask").requestSubmit()}});
$("ask").addEventListener("submit",e=>{e.preventDefault();const q=$("q").value;$("q").value="";ask(q)});
$("new").onclick=()=>{S=fresh();closeSide();vt(render)};
$("sidescrim").onclick=closeSide;
if($("ddbtn"))$("ddbtn").onclick=e=>{e.stopPropagation();const open=$("ddmenu").hidden;if(open){renderDD();$("ddmenu").hidden=false;$("ddbtn").setAttribute("aria-expanded","true")}else closeDD()};
$("m-no").onclick=()=>closeBox();$("m-ok").onclick=()=>{const f=boxOk;closeBox();f&&f()};$("modal").addEventListener("click",e=>{if(e.target.id==="modal")closeBox()});
$("close-deck").onclick=closeDeck;
$("pdf2").onclick=e=>exportPDF(e.currentTarget);
$("prev").onclick=()=>{slide--;renderSlide()};$("next").onclick=()=>{slide++;renderSlide()};
$("scrim").onclick=closeD;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!$("modal").hidden){closeBox();return}if($("pmenu")&&!$("pmenu").hidden){togglePMenu(false);return}closeDD();if(editIdx!==null){editIdx=null;renderThread();return}if($("drawer").classList.contains("open"))closeD();else if(!$("v-deck").hidden)closeDeck();else closeSide()}
  if(!$("v-deck").hidden){if(e.key==="ArrowRight"){slide++;renderSlide()}if(e.key==="ArrowLeft"){slide--;renderSlide()}}});

render();
const use=n=>window.claude?.use?window.claude.use(n).catch(()=>null):Promise.resolve(null);
use("sample").then(s=>{sample=s;setStatus()});
use("downloads").then(d=>{downloads=d;document.querySelectorAll("[data-pdf]").forEach(b=>b.hidden=!d)});
