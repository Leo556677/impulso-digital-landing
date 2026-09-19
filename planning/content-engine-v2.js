import {sb,resolveContentContext} from '../content-vault-client.js?v=20260917-vinculos';

const services={S1:'Toxina botulínica',S2:'PRP facial',S3:'Limpieza facial',S4:'Liposucción de papada',S5:'Bichectomía',S6:'Rinoplastia'};
const roleNames={DOLOR_IDENTIFICACION:'Dolor / identificación',VALOR_EDUCACION:'Valor / educación',AUTORIDAD_CONFIANZA:'Autoridad / confianza',OBJECION:'Objeción',VENTA_SUAVE:'Venta suave',HUMANIZACION:'Humanización',COMUNIDAD_RELACION:'Comunidad / relación'};
const briefNames={USE_EXISTING_APPROVED:'Usar guion aprobado',READY_TO_SCRIPT:'Brief listo para guion',WAITING_CAPTURE:'Primero captura real',BLOCKED:'Bloqueado',NOT_REQUIRED:'Sin preparación adicional'};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmtDate=v=>v?new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(`${v}T12:00:00`)):'—';
const root=()=>document.querySelector('#engineApp');

async function mountBusinessSwitcher(ctx){
 const tenant=document.querySelector('.tenant');
 let wrap=document.querySelector('[data-business-switcher]');
 if(!wrap){
   wrap=document.createElement('label');
   wrap.className='business-switcher';
   wrap.dataset.businessSwitcher='';
   wrap.innerHTML='<span>Negocio activo</span><select id="businessSwitcher" aria-label="Elegir negocio"><option value="">Cargando negocios…</option></select>';
   tenant?.insertAdjacentElement('afterend',wrap);
 }
 const select=wrap.querySelector('#businessSwitcher')||wrap.querySelector('select');
 if(!select)return;
 const ids=[...new Set((ctx.memberships||[]).map(x=>x.negocio_id).filter(Boolean))];
 const {data,error}=ids.length
   ? await sb.from('negocios').select('id,nombre,slug').in('id',ids).order('nombre')
   : {data:[],error:null};
 if(error)throw error;
 const businesses=data||[];
 select.innerHTML=businesses.length
   ? businesses.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.nombre)+'</option>').join('')
   : '<option value="'+esc(ctx.negocioId)+'">'+esc(ctx.negocio?.nombre||'Negocio actual')+'</option>';
 select.value=String(ctx.negocioId);
 wrap.hidden=false;
 select.onchange=()=>{
   const id=select.value;
   if(!id||id===String(ctx.negocioId))return;
   localStorage.setItem('impulso_negocio_activo',id);
   const u=new URL(location.href);
   u.searchParams.set('negocio',id);
   u.searchParams.delete('week');
   u.searchParams.delete('tema');
   location.assign(u.toString());
 };
}
const familySort=(a,b)=>String(a.family||'').localeCompare(String(b.family||''),undefined,{numeric:true})||String(a.source_id).localeCompare(String(b.source_id),undefined,{numeric:true});

async function core(){
 const ctx=await resolveContentContext();
 document.querySelectorAll('[data-business]').forEach(el=>el.textContent=ctx.negocio?.nombre||'Negocio');
 await mountBusinessSwitcher(ctx);
 const {data:cal,error:ce}=await sb.from('content_calendarios_publicacion').select('*').eq('negocio_id',ctx.negocioId).eq('status','ACTIVE').order('week_start',{ascending:false}).limit(1).maybeSingle();
 if(ce)throw ce;
 let slots=[],plan=null,trans=[];
 if(cal){
  const [s,p,t]=await Promise.all([
   sb.from('content_calendario_publicacion_slots').select('*').eq('calendario_id',cal.id).order('publish_date'),
   sb.from('content_planes_editoriales').select('id,plan_key,revision,document,updated_at').eq('negocio_id',ctx.negocioId).eq('plan_key',cal.bank_plan_key).maybeSingle(),
   sb.from('content_banco_transversal').select('*').eq('negocio_id',ctx.negocioId)
  ]);
  if(s.error||p.error||t.error)throw s.error||p.error||t.error;
  slots=s.data||[];plan=p.data;trans=t.data||[];
 }
 const {data:contracts,error:coe}=await sb.from('content_orchestration_contracts').select('contract_key,contract_type,version,status,document').eq('negocio_id',ctx.negocioId).order('contract_type').order('version',{ascending:false});
 if(coe)throw coe;
 return {ctx,cal,slots,plan,trans,contracts:contracts||[]};
}

function maps(data){
 const episodes=data.plan?.document?.episodes||[];
 return {ep:new Map(episodes.map(x=>[x.key,x])),tr:new Map(data.trans.map(x=>[x.id,x])),episodes};
}
function itemFor(slot,m){return slot.source_bank==='SERVICE_BANK'?m.ep.get(slot.editorial_key):m.tr.get(slot.transversal_id)}
function matchTag(v){const c=v==='MATCH_FUERTE'?'strong':v==='MATCH_PARCIAL'?'partial':String(v).includes('HUECO')?'gap':'';return `<span class="tag ${c}">${esc(String(v||'').replaceAll('_',' '))}</span>`}
function stateTag(v){return `<span class="tag">${esc(String(v||'').replaceAll('_',' '))}</span>`}
function slotHtml(slot,m){
 const it=itemFor(slot,m)||{};const service=slot.service_key?services[slot.service_key]:'Marca / equipo';
 return `<div class="slot" data-service="${esc(slot.service_key||'MARCA')}"><div class="slot-head"><div><div class="eyebrow">${esc(fmtDate(slot.publish_date))} · ${esc(roleNames[slot.strategic_role]||slot.strategic_role)}</div><h3>${esc(it.title||it.question||'Necesidad editorial')}</h3></div><div class="meta">${matchTag(slot.match_status)}${stateTag(slot.status)}</div></div><p><b>${esc(service)}</b>${slot.editorial_key?` · ${esc(slot.editorial_key)}`:it.editorial_key?` · ${esc(it.editorial_key)}`:''}</p><p>${esc(slot.rationale||'')}</p><div class="meta">${stateTag(briefNames[slot.brief_status]||slot.brief_status)}${slot.expected_signal?`<span class="tag">Señal: ${esc(slot.expected_signal)}</span>`:''}</div></div>`;
}
function activeV2(contracts){return contracts.filter(c=>c.status==='ACTIVE'&&c.version===2)}
function stat(n,label){return `<div class="stat"><b>${esc(n)}</b><span>${esc(label)}</span></div>`}

async function loadOrchestrator(){
 const data=await core(),m=maps(data);
 const [libs,rules,pubs,signals]=await Promise.all([
  sb.from('content_execution_library_items').select('id,library_type,adaptation_status,metadata').eq('negocio_id',data.ctx.negocioId),
  sb.from('content_execution_library_rules').select('id,adaptation_level,active').eq('negocio_id',data.ctx.negocioId).eq('active',true),
  sb.from('content_publicaciones').select('id,estado,published_at').eq('negocio_id',data.ctx.negocioId),
  sb.from('content_strategy_signals').select('id,review_status,signal_type').eq('negocio_id',data.ctx.negocioId)
 ]);
 const err=libs.error||rules.error||pubs.error||signals.error;if(err)throw err;
 const lib=libs.data||[],contracts=activeV2(data.contracts),ss=signals.data||[],publications=pubs.data||[];
 const strong=data.slots.filter(x=>x.match_status==='MATCH_FUERTE').length;
 const gaps=data.slots.filter(x=>String(x.match_status).includes('HUECO')).length;
 root().innerHTML=`
 <div class="notice"><b>Jerarquía V2 activa.</b> La Segunda Capa decide la necesidad real. Las bibliotecas de Hooks/Rehooks/CTA/Formatos ejecutan esa decisión; no la reemplazan.</div>
 <section class="stats">${stat(m.episodes.length,'temas del banco activo')}${stat(data.slots.length,'slots de la Segunda Capa')}${stat(`${strong}/${data.slots.length}`,'matches fuertes')}${stat(gaps,'huecos editoriales abiertos')}</section>
 <div class="grid"><section class="card"><h2>Segunda Capa · semana activa</h2><p class="sub">${data.cal?`${fmtDate(data.cal.week_start)} – ${fmtDate(data.cal.week_end)} · ${data.cal.strategy_name}`:'No hay calendario activo.'}</p><div class="week">${data.slots.map(s=>slotHtml(s,m)).join('')||'<div class="empty">Sin slots.</div>'}</div></section>
 <aside><section class="card"><h2>Arquitectura canónica</h2><p class="sub">La dirección estratégica va de arriba hacia abajo; el aprendizaje vuelve de abajo hacia arriba.</p><div class="flow"><span>Verdad</span><i>→</i><span>Banco</span><i>→</i><span>2ª Capa</span><i>→</i><span>Orquestador</span><i>→</i><span>Chat 00</span><i>→</i><span>Bibliotecas</span><i>→</i><span>Producción</span><i>→</i><span>Publicación</span><i>→</i><span>Métricas</span></div></section>
 <section class="card" style="margin-top:16px"><h2>Motor V2</h2><div class="meta"><span class="pill ok">${contracts.length} contratos V2 activos</span><span class="pill">${lib.length} elementos seed</span><span class="pill">${rules.data?.length||0} reglas adaptadas</span></div><p class="sub" style="margin-top:12px">${lib.filter(x=>x.metadata?.performance_status==='UNMEASURED').length} elementos siguen sin medición propia. Eso es correcto hasta publicar.</p></section>
 <section class="card" style="margin-top:16px"><h2>Aprendizaje</h2><p class="sub">Publicaciones registradas: <b>${publications.length}</b><br>Señales nuevas: <b>${ss.filter(x=>x.review_status==='NEW').length}</b><br>Huecos derivados de audiencia: <b>${ss.filter(x=>x.review_status==='EDITORIAL_GAP').length}</b></p><a class="button alt" href="./aprendizaje-v2.html">Abrir aprendizaje</a></section></aside></div>`;
}

let libraryCache=[];
function renderLibraryList(){
 const type=document.querySelector('#libType')?.value||'HOOK',family=document.querySelector('#libFamily')?.value||'',q=(document.querySelector('#libSearch')?.value||'').toLowerCase();
 const rows=libraryCache.filter(x=>x.library_type===type&&(!family||x.family===family)&&(!q||`${x.source_id} ${x.family} ${x.family_name} ${x.template}`.toLowerCase().includes(q))).sort(familySort);
 document.querySelector('#libraryList').innerHTML=rows.map(x=>`<div class="item"><div class="item-top"><b>${esc(x.library_type)} ${esc(x.source_id)} · ${esc(x.family||'')}</b><span class="pill warn">Seed · sin métricas propias</span></div><p>${esc(x.template)}</p><div class="meta"><code>${esc(x.family_name||'')}</code><span class="tag">${esc(x.source_file)} · v${esc(x.source_version)}</span><span class="tag">${esc(x.adaptation_status)}</span></div></div>`).join('')||'<div class="empty">No hay resultados.</div>';
}
async function loadLibraries(){
 const data=await core();
 const [l,r,p]=await Promise.all([
  sb.from('content_execution_library_items').select('*').eq('negocio_id',data.ctx.negocioId),
  sb.from('content_execution_library_rules').select('*').eq('negocio_id',data.ctx.negocioId).eq('active',true).order('library_type').order('rule_key'),
  sb.from('content_execution_performance').select('id,library_item_id').eq('negocio_id',data.ctx.negocioId)
 ]);if(l.error||r.error||p.error)throw l.error||r.error||p.error;
 libraryCache=l.data||[];const rules=r.data||[],perf=p.data||[];
 const counts=Object.fromEntries(['HOOK','REHOOK','CTA','FORMAT'].map(t=>[t,libraryCache.filter(x=>x.library_type===t).length]));
 root().innerHTML=`<div class="notice"><b>Bibliotecas de ejecución, no estrategia.</b> Estos elementos existen para Chat 00 después de que el production_brief ya definió pregunta, recompensa, límites y función del slot.</div>
 <section class="stats">${stat(counts.HOOK,'hooks seed')}${stat(counts.REHOOK,'rehooks seed')}${stat(counts.CTA,'CTA seed')}${stat(counts.FORMAT,'formatos seed')}</section>
 <div class="grid"><section class="card"><h2>Biblioteca viva</h2><div class="toolbar"><select class="select" id="libType"><option>HOOK</option><option>REHOOK</option><option>CTA</option><option>FORMAT</option></select><select class="select" id="libFamily"><option value="">Todas las familias</option></select><input class="input" id="libSearch" placeholder="Buscar ID, familia o plantilla"></div><div id="libraryList" class="list"></div></section>
 <aside><section class="card"><h2>Reglas de adaptación</h2><p class="sub">Lo heredado fue clasificado según su autoridad en V2.</p>${rules.map(x=>`<div class="rule level-${esc(x.adaptation_level)}"><strong>${esc(x.adaptation_level)} · ${esc(x.title)}</strong><p>${esc(x.rationale||'')}</p></div>`).join('')}</section><section class="card" style="margin-top:16px"><h2>Rendimiento propio</h2><p class="sub">Observaciones vinculadas a publicaciones: <b>${perf.length}</b>. Mientras no existan comparables suficientes, el sistema no afirma que un Hook/Rehook/CTA sea “ganador”.</p></section></aside></div>`;
 const type=document.querySelector('#libType'),family=document.querySelector('#libFamily'),search=document.querySelector('#libSearch');
 const refreshFamilies=()=>{const t=type.value,fs=[...new Set(libraryCache.filter(x=>x.library_type===t).map(x=>x.family).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));family.innerHTML='<option value="">Todas las familias</option>'+fs.map(f=>`<option>${esc(f)}</option>`).join('');renderLibraryList()};
 type.addEventListener('change',refreshFamilies);family.addEventListener('change',renderLibraryList);search.addEventListener('input',renderLibraryList);refreshFamilies();
}

async function loadChat00(){
 const data=await core(),m=maps(data);let selected=0;
 const render=()=>{
  const s=data.slots[selected],it=s?itemFor(s,m)||{}:{};const brief=s?.production_brief||{};
  const packet=s?`CHAT 00 V2 · PEDIDO ESTRATÉGICO\n\nREGLA: no cambies calendario, pregunta, recompensa, audiencia o formato bloqueado. Usa bibliotecas V2 solo para ejecutar este brief.\n\nFECHA: ${s.publish_date}\nROL SEGUNDA CAPA: ${s.strategic_role}\nSERVICIO: ${s.service_key?services[s.service_key]:'MARCA / EQUIPO'}\nCLAVE: ${s.editorial_key||it.editorial_key||'TRANSVERSAL'}\nMATCH: ${s.match_status}\nEXPECTED_SIGNAL: ${s.expected_signal||''}\nBRIEF_STATUS: ${s.brief_status}\n\nPRODUCTION_BRIEF:\n${JSON.stringify(brief,null,2)}\n\nESTADO DE SALIDA: SCRIPT_DRAFT, salvo USE_EXISTING_APPROVED o WAITING_CAPTURE.`:'';
  document.querySelector('#chatDetail').innerHTML=s?`<div class="brief"><div class="eyebrow">${esc(fmtDate(s.publish_date))} · ${esc(roleNames[s.strategic_role]||s.strategic_role)}</div><h2>${esc(it.title||'Pieza transversal')}</h2><div class="meta">${matchTag(s.match_status)}${stateTag(briefNames[s.brief_status]||s.brief_status)}${s.service_key?`<span class="tag">${esc(services[s.service_key])}</span>`:''}</div><p class="sub" style="margin-top:12px">${esc(s.rationale)}</p><pre>${esc(JSON.stringify(brief,null,2))}</pre><button class="button" id="copyBrief">Copiar pedido para Chat 00</button></div>`:'<div class="empty">Sin slot seleccionado.</div>';
  document.querySelector('#copyBrief')?.addEventListener('click',async e=>{await navigator.clipboard.writeText(packet);e.currentTarget.textContent='Copiado ✓';setTimeout(()=>e.currentTarget.textContent='Copiar pedido para Chat 00',1500)});
 };
 root().innerHTML=`<div class="notice"><b>Chat 00 no es el Orquestador.</b> Recibe una pieza ya seleccionada por la Segunda Capa. Si el brief requiere cambiar el tema, devuelve BLOQUEO_ESTRATEGICO.</div><div class="grid"><section class="card"><h2>Cola de la Semana 01</h2><p class="sub">Selecciona un slot. Aprobado existente no se regenera; captura pendiente no se convierte en guion ficticio.</p><div id="chatQueue" class="week">${data.slots.map((s,i)=>{const it=itemFor(s,m)||{};return `<button class="slot" data-service="${esc(s.service_key||'MARCA')}" data-slot="${i}" style="text-align:left;cursor:pointer"><div class="eyebrow">${esc(fmtDate(s.publish_date))} · ${esc(briefNames[s.brief_status]||s.brief_status)}</div><h3>${esc(it.title||it.question||'Transversal')}</h3><div class="meta">${matchTag(s.match_status)}${s.editorial_key?`<span class="tag">${esc(s.editorial_key)}</span>`:''}</div></button>`}).join('')}</div></section><aside id="chatDetail"></aside></div>`;
 document.querySelectorAll('[data-slot]').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.slot);render()}));render();
}

async function loadLearning(){
 const data=await core();
 const [pub,sig,perf]=await Promise.all([
  sb.from('content_publicaciones').select('id,content_id,plataforma,estado,url,published_at,metricas,resultado').eq('negocio_id',data.ctx.negocioId).order('published_at',{ascending:false}),
  sb.from('content_strategy_signals').select('*').eq('negocio_id',data.ctx.negocioId).order('created_at',{ascending:false}),
  sb.from('content_execution_performance').select('id,library_item_id,publication_id,content_id,platform,metrics,qualitative,observed_at').eq('negocio_id',data.ctx.negocioId).order('observed_at',{ascending:false})
 ]);if(pub.error||sig.error||perf.error)throw pub.error||sig.error||perf.error;
 const pubs=pub.data||[],signals=sig.data||[],perfs=perf.data||[];
 root().innerHTML=`<div class="notice"><b>Aprendizaje ≠ causalidad automática.</b> Una publicación puede sugerir hipótesis. Para promover una regla de Hook/Rehook/CTA se necesitan comparables o repetición suficiente.</div><section class="stats">${stat(pubs.length,'publicaciones registradas')}${stat(perfs.length,'observaciones de ejecución')}${stat(signals.filter(x=>x.review_status==='NEW').length,'señales nuevas')}${stat(signals.filter(x=>x.review_status==='EDITORIAL_GAP').length,'huecos desde audiencia')}</section><div class="grid"><section class="card"><h2>Publicaciones y métricas</h2>${pubs.length?`<div class="table-wrap"><table class="table"><thead><tr><th>Fecha</th><th>Plataforma</th><th>Estado</th><th>Métricas</th></tr></thead><tbody>${pubs.map(x=>`<tr><td>${esc(x.published_at?new Date(x.published_at).toLocaleString('es-PE'):'—')}</td><td>${esc(x.plataforma||'—')}</td><td>${esc(x.estado||'—')}</td><td><code>${esc(JSON.stringify(x.metricas||{}))}</code></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Todavía no hay publicaciones registradas. El sistema permanece sin datos propios de rendimiento.</div>'}</section><aside><section class="card"><h2>Señales cualitativas</h2>${signals.length?signals.map(x=>`<div class="signal"><b>${esc(x.signal_type)}</b><p>${esc(x.signal_text)}</p><span class="tag">${esc(x.review_status)}</span></div>`).join(''):'<div class="empty">Aún no hay preguntas, objeciones o deseos extraídos de publicaciones.</div>'}</section><section class="card" style="margin-top:16px"><h2>Bucle de aprendizaje</h2><div class="flow"><span>Publicación</span><i>→</i><span>Métrica</span><i>→</i><span>Señal</span><i>→</i><span>Match</span><i>→</i><span>Hueco si aplica</span><i>→</i><span>2ª Capa</span></div></section></aside></div>`;
}

async function boot(){
 try{const page=document.body.dataset.enginePage;root().innerHTML='<div class="loading">Recuperando el motor vivo…</div>';if(page==='orchestrator')await loadOrchestrator();else if(page==='libraries')await loadLibraries();else if(page==='chat00')await loadChat00();else if(page==='learning')await loadLearning();else root().innerHTML='<div class="error">Vista V2 desconocida.</div>'}catch(e){console.error(e);root().innerHTML=`<div class="error"><b>No se pudo cargar el Motor V2.</b><br>${esc(e?.message||e)}</div>`}}
boot();
