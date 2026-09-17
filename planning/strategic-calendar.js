import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';
const URL='https://xnlzsgulskqyecfgzhwa.supabase.co';
const KEY='sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
const BUSINESS='48182e1a-06d5-4685-9627-7891d7aafacb';
const sb=createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const names={S1:'Toxina botulínica',S2:'PRP facial',S3:'Limpieza facial',S4:'Liposucción de papada',S5:'Bichectomía',S6:'Rinoplastia'};
const dayNames=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const roleNames={DOLOR_IDENTIFICACION:'Dolor / identificación',VALOR_EDUCACION:'Valor / educación',AUTORIDAD_CONFIANZA:'Autoridad / confianza',OBJECION:'Objeción',VENTA_SUAVE:'Venta suave',HUMANIZACION:'Humanización',COMUNIDAD_RELACION:'Comunidad / relación'};
const statusNames={PLANNED:'Planificado',NEEDS_CAPTURE:'Requiere captura real',NEEDS_SCRIPT:'Falta guion',SCRIPTED:'Guion listo',APPROVED:'Guion aprobado',RECORDED:'Grabado',READY:'Listo para publicar',PUBLISHED:'Publicado',SKIPPED:'Omitido'};
const briefNames={NOT_REQUIRED:'Sin preparación adicional',USE_EXISTING_APPROVED:'Usar guion aprobado',READY_TO_SCRIPT:'Brief listo para guion',WAITING_CAPTURE:'Primero capturar material real',BLOCKED:'Bloqueado'};
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-PE').trim();
const dval=s=>new Date(String(s)+'T12:00:00');
const fmt=s=>new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short'}).format(dval(s));
const svgChevron=dir=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir==='up'?'m5 15 7-7 7 7':'m5 9 7 7 7-7'}"/></svg>`;
let calendars=[],slots=[],planMaps=new Map(),trMap=new Map(),current=0,openId=null;

function weekNo(cal,i){const m=String(cal.calendar_key||'').match(/w(\d+)/i);return m?Number(m[1]):i+1}
function weekLabel(cal,i){return `Semana ${String(weekNo(cal,i)).padStart(2,'0')} · ${fmt(cal.week_start)}–${fmt(cal.week_end)} ${dval(cal.week_end).getFullYear()}${cal.status==='CLOSED'?' · histórica':''}`}
function calOfSlot(s){return calendars.find(c=>c.id===s.calendario_id)}
function planFor(s){const cal=calOfSlot(s);return planMaps.get(cal?.bank_plan_key)||null}
function itemFor(s){if(s.source_bank==='TRANSVERSAL_BANK')return trMap.get(s.transversal_id);const plan=planFor(s);return (plan?.episodes||[]).find(x=>x.key===s.editorial_key)}
function serviceName(s){return s.service_key?names[s.service_key]:'Marca / equipo'}
function searchable(s){const item=itemFor(s);return norm([s.editorial_key,item?.editorial_key,item?.title,item?.question,item?.signal,item?.payoff,serviceName(s),roleNames[s.strategic_role]||s.strategic_role,s.rationale,s.expected_signal,s.execution_note,statusNames[s.status]||s.status,briefNames[s.brief_status]||s.brief_status].join(' '))}
function filters(){return{svc:document.querySelector('#strategyService')?.value||'',st:document.querySelector('#strategyStatus')?.value||'',q:norm(document.querySelector('#strategySearch')?.value||'')}}
function matches(s,f=filters()){return(!f.svc||(s.service_key||'MARCA')===f.svc)&&(!f.st||s.status===f.st)&&(!f.q||searchable(s).includes(f.q))}
function slotsFor(cal){return slots.filter(s=>s.calendario_id===cal?.id).sort((a,b)=>a.publish_date.localeCompare(b.publish_date))}
function globalMatches(){const f=filters();return slots.filter(s=>matches(s,f))}
function currentMatches(){return slotsFor(calendars[current]).filter(s=>matches(s))}
function badgeClass(s){return s.status==='APPROVED'?'approved':s.status==='RECORDED'?'recorded':s.status==='PUBLISHED'?'published':s.status==='NEEDS_CAPTURE'?'capture':''}
function matchClass(s){return s.match_status==='MATCH_FUERTE'?'strong':s.match_status==='NUEVO_TRANSVERSAL'?'new':''}

function chooseInitial(){
 const q=new URLSearchParams(location.search).get('week');if(q){const i=calendars.findIndex(c=>c.calendar_key===q);if(i>=0)return i}
 const today=new Date().toISOString().slice(0,10),inside=calendars.findIndex(c=>c.status==='ACTIVE'&&c.week_start<=today&&c.week_end>=today);if(inside>=0)return inside;
 const future=calendars.findIndex(c=>c.status==='ACTIVE'&&c.week_start>=today);if(future>=0)return future;
 for(let i=calendars.length-1;i>=0;i--)if(calendars[i].status==='ACTIVE')return i;
 return Math.max(0,calendars.length-1);
}
function renderWeekNav(){
 const cal=calendars[current],sel=document.querySelector('#weekSelect');sel.innerHTML=calendars.map((c,i)=>`<option value="${i}" ${i===current?'selected':''}>${esc(weekLabel(c,i))}</option>`).join('');
 document.querySelector('#prevWeek').disabled=current<=0;document.querySelector('#nextWeek').disabled=current>=calendars.length-1;
 document.querySelector('#weekTitle').textContent=`${fmt(cal.week_start)} – ${fmt(cal.week_end)} · ${dval(cal.week_end).getFullYear()}`;
 document.querySelector('#strategyName').textContent=cal.strategy_name||'Estrategia semanal';
 document.querySelector('#strategyText').textContent=cal.hypothesis?.principle||'';
 history.replaceState(null,'',location.pathname+'?week='+encodeURIComponent(cal.calendar_key));
}
function renderFilters(){
 const svc=document.querySelector('#strategyService'),st=document.querySelector('#strategyStatus'),keepSvc=svc.value,keepSt=st.value;
 const services=[...new Set(slots.map(s=>s.service_key||'MARCA'))].sort();
 svc.innerHTML='<option value="">Todos</option>'+services.map(k=>`<option value="${esc(k)}">${esc(k==='MARCA'?'Marca / equipo':names[k]||k)}</option>`).join('');
 const statuses=[...new Set(slots.map(s=>s.status))];st.innerHTML='<option value="">Todos</option>'+statuses.map(k=>`<option value="${esc(k)}">${esc(statusNames[k]||k)}</option>`).join('');
 svc.value=services.includes(keepSvc)?keepSvc:'';st.value=statuses.includes(keepSt)?keepSt:'';
}
function renderStats(weekVisible,globalVisible){
 document.querySelector('#stats').innerHTML=`<div class="stat"><b>${weekVisible.length}</b><span>contenidos visibles esta semana</span></div><div class="stat"><b>${new Set(weekVisible.filter(x=>x.service_key).map(x=>x.service_key)).size}/6</b><span>servicios visibles</span></div><div class="stat"><b>${weekVisible.filter(x=>x.status==='APPROVED').length}</b><span>guiones aprobados</span></div><div class="stat"><b>${new Set(globalVisible.map(x=>x.calendario_id)).size}</b><span>semanas con resultados</span></div>`;
}
function compactCard(s){
 const d=dval(s.publish_date),item=itemFor(s),svc=s.service_key||'MARCA',expanded=openId===s.id;
 return `<article class="day" data-service="${svc}" data-open="${expanded?'true':'false'}"><button class="day-toggle" type="button" data-slot="${esc(s.id)}" aria-expanded="${expanded}"><div class="day-head"><div class="date">${d.getDate()}</div><span class="chevron">${svgChevron(expanded?'up':'down')}</span></div><span class="role">${esc(roleNames[s.strategic_role]||s.strategic_role)}</span><div class="service">${esc(serviceName(s))}</div><h2 class="title">${esc(item?.title||'Necesidad editorial')}</h2><div class="compact-badges"><span class="badge ${badgeClass(s)}">${esc(statusNames[s.status]||s.status)}</span>${s.editorial_key?`<span class="badge">${esc(s.editorial_key)}</span>`:''}${item?.editorial_key?`<span class="badge">${esc(item.editorial_key)}</span>`:''}</div></button></article>`;
}
function addDays(iso,n){const d=dval(iso);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function calendarColumns(cal){
 const byDate=new Map(slotsFor(cal).map(s=>[s.publish_date,s]));
 return Array.from({length:7},(_,i)=>{const date=addDays(cal.week_start,i),slot=byDate.get(date)||null;return{date,slot}})
}
function emptyDay(date){
 return `<article class="day day-empty"><div class="day-toggle"><div class="day-head"><div class="date">${dval(date).getDate()}</div></div><div class="empty-day-copy">Sin resultado con estos filtros</div></div></article>`;
}
function renderDetail(){
 const host=document.querySelector('#dayDetail'),s=slots.find(x=>x.id===openId);if(!s||s.calendario_id!==calendars[current]?.id||!matches(s)){host.hidden=true;host.innerHTML='';return}
 const item=itemFor(s),svc=s.service_key||'MARCA';
 host.hidden=false;host.dataset.service=svc;host.innerHTML=`<div class="detail-head"><div><div class="detail-kicker">${esc(serviceName(s))} · ${esc(roleNames[s.strategic_role]||s.strategic_role)}</div><h2>${esc(item?.title||'Necesidad editorial')}</h2></div><button id="closeDetail" class="detail-close" type="button" aria-label="Contraer día">${svgChevron('up')}</button></div><div class="question"><b>Pregunta que resolverá</b><span>${esc(item?.question||'')}</span></div><div class="detail-grid"><div class="section"><b>Por qué va aquí</b><p>${esc(s.rationale)}</p></div><div class="section"><b>Qué señal esperamos</b><p>${esc(s.expected_signal||'Por definir')}</p></div><div class="section"><b>Preparación</b><p><strong>${esc(briefNames[s.brief_status]||s.brief_status)}</strong></p></div><div class="section"><b>Ejecución</b><p>${esc(s.execution_note||'')}</p></div></div><div class="badges"><span class="badge ${matchClass(s)}">${esc((s.match_status||'').replaceAll('_',' '))}</span><span class="badge ${badgeClass(s)}">${esc(statusNames[s.status]||s.status)}</span><span class="badge">${esc(briefNames[s.brief_status]||s.brief_status)}</span></div>`;
 document.querySelector('#closeDetail')?.addEventListener('click',()=>{openId=null;render()});
 host.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(){
 if(!calendars.length)return;const global=globalMatches(),week=currentMatches(),root=document.querySelector('#calendarApp'),cal=calendars[current],visibleIds=new Set(week.map(s=>s.id));
 document.querySelector('#strategyResultCount').textContent=`${global.length} resultado${global.length===1?'':'s'} · ${new Set(global.map(x=>x.calendario_id)).size} semana${new Set(global.map(x=>x.calendario_id)).size===1?'':'s'}`;
 renderWeekNav();renderStats(week,global);
 const headers=['LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO','DOMINGO'].map(x=>`<div class="weekday-label">${x}</div>`).join('');
 const cards=calendarColumns(cal).map(({date,slot})=>slot&&visibleIds.has(slot.id)?compactCard(slot):emptyDay(date)).join('');
 root.innerHTML=`<div class="calendar-shell"><div class="weekday-row">${headers}</div><div class="day-grid">${cards}</div></div>`;
 root.querySelectorAll('[data-slot]').forEach(btn=>btn.addEventListener('click',()=>{openId=openId===btn.dataset.slot?null:btn.dataset.slot;render()}));
 renderDetail();
}
function jumpIfNeeded(){
 const global=globalMatches(),week=currentMatches();if(!global.length)return false;if(week.length)return false;
 const target=global[0],i=calendars.findIndex(c=>c.id===target.calendario_id);if(i>=0){current=i;openId=target.id;return true}return false;
}
function onFilter(){jumpIfNeeded();render()}
async function load(){
 const root=document.querySelector('#calendarApp');
 try{
  const {data:cals,error:ce}=await sb.from('content_calendarios_publicacion').select('id,negocio_id,calendar_key,week_start,week_end,strategy_name,strategy_version,bank_plan_key,status,hypothesis').eq('negocio_id',BUSINESS).in('status',['ACTIVE','CLOSED']).order('week_start',{ascending:true});if(ce)throw ce;if(!cals?.length)throw new Error('No hay semanas publicadas');
  calendars=cals;const ids=calendars.map(c=>c.id),planKeys=[...new Set(calendars.map(c=>c.bank_plan_key))];
  const [{data:ss,error:se},{data:plans,error:pe},{data:trans,error:te}]=await Promise.all([
   sb.from('content_calendario_publicacion_slots').select('id,calendario_id,negocio_id,publish_date,strategic_role,service_key,source_bank,editorial_key,transversal_id,content_id,match_status,rationale,expected_signal,execution_note,status,actual_publication_id,brief_status').in('calendario_id',ids).order('publish_date'),
   sb.from('content_planes_editoriales').select('plan_key,document').eq('negocio_id',BUSINESS).in('plan_key',planKeys),
   sb.from('content_banco_transversal').select('id,negocio_id,editorial_key,title,question,strategic_role,objective,audience,motivation,format,status').eq('negocio_id',BUSINESS)
  ]);if(se||pe||te)throw se||pe||te;
  slots=ss||[];planMaps=new Map((plans||[]).map(p=>[p.plan_key,p.document]));trMap=new Map((trans||[]).map(x=>[x.id,x]));current=chooseInitial();renderFilters();render();
  document.querySelector('#prevWeek').addEventListener('click',()=>{if(current>0){current--;openId=null;render()}});
  document.querySelector('#nextWeek').addEventListener('click',()=>{if(current<calendars.length-1){current++;openId=null;render()}});
  document.querySelector('#weekSelect').addEventListener('change',e=>{current=Number(e.target.value)||0;openId=null;render()});
  document.querySelector('#strategyService').addEventListener('change',onFilter);
  document.querySelector('#strategyStatus').addEventListener('change',onFilter);
  document.querySelector('#strategySearch').addEventListener('input',onFilter);
  document.querySelector('#strategyReset').addEventListener('click',()=>{document.querySelector('#strategyService').value='';document.querySelector('#strategyStatus').value='';document.querySelector('#strategySearch').value='';openId=null;render()});
 }catch(err){root.innerHTML=`<div class="error">No se pudo cargar el calendario estratégico: ${esc(err?.message||err)}</div>`}
}
load();
