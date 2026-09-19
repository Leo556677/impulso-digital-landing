import {sb,resolveContentContext} from '../content-vault-client.js?v=20260919-business-switcher-v1';
const PUBLIC_BUSINESS='48182e1a-06d5-4685-9627-7891d7aafacb';
let BUSINESS=PUBLIC_BUSINESS;
let BUSINESS_CTX=null;

const names={S1:'Toxina botulínica',S2:'PRP facial',S3:'Limpieza facial',S4:'Liposucción de papada',S5:'Bichectomía',S6:'Rinoplastia'};
const serviceShort={S1:'TB',S2:'PRP',S3:'LF',S4:'PAP',S5:'BIC',S6:'RIN',MARCA:'EQ'};
const roleNames={DOLOR_IDENTIFICACION:'Identificación',VALOR_EDUCACION:'Valor / educación',AUTORIDAD_CONFIANZA:'Autoridad / confianza',OBJECION:'Objeción',VENTA_SUAVE:'Venta suave',HUMANIZACION:'Humanización',COMUNIDAD_RELACION:'Comunidad / relación'};
const statusNames={PLANNED:'Planificado',NEEDS_CAPTURE:'Requiere captura real',NEEDS_SCRIPT:'Falta guion',SCRIPTED:'Guion listo',APPROVED:'Guion aprobado',RECORDED:'Grabado',READY:'Listo para publicar',PUBLISHED:'Publicado',SKIPPED:'Omitido'};
const briefNames={NOT_REQUIRED:'Sin preparación adicional',USE_EXISTING_APPROVED:'Usar guion aprobado',READY_TO_SCRIPT:'Brief listo para guion',WAITING_CAPTURE:'Primero capturar material real',BLOCKED:'Bloqueado'};
const objectiveNames={ALCANCE:'Alcance',IDENTIFICACIÓN:'Identificación',EDUCACIÓN:'Educación',AUTORIDAD:'Autoridad',CONFIANZA:'Confianza',CONSIDERACIÓN:'Consideración',EVALUACIÓN:'Evaluación',RESERVA:'Reserva'};
const audienceNames={FRÍA:'Fría',TIBIA:'Tibia',CALIENTE:'Caliente'};

const visuals={
 S1:{src:'https://images.pexels.com/photos/7800682/pexels-photo-7800682.jpeg?auto=compress&cs=tinysrgb&w=1200&h=900&fit=crop',href:'https://www.pexels.com/photo/a-syringe-and-vial-medications-7800682/',alt:'Vial y jeringa en entorno médico'},
 S2:{src:'https://images.pexels.com/photos/1138531/pexels-photo-1138531.jpeg?auto=compress&cs=tinysrgb&w=1200&h=900&fit=crop',href:'https://www.pexels.com/photo/close-view-of-womans-face-1138531/',alt:'Primer plano de piel facial'},
 S3:{src:'https://images.pexels.com/photos/37273221/pexels-photo-37273221.jpeg?auto=compress&cs=tinysrgb&w=1200&h=900&fit=crop',href:'https://www.pexels.com/photo/professional-facial-treatment-in-spa-setting-37273221/',alt:'Tratamiento facial profesional'},
 S4:{src:'https://images.pexels.com/photos/7867259/pexels-photo-7867259.jpeg?auto=compress&cs=tinysrgb&w=1200&h=900&fit=crop',href:'https://www.pexels.com/photo/a-close-up-shot-of-a-woman-touching-her-chin-7867259/',alt:'Primer plano de mentón y rostro'},
 S5:{src:'https://images.pexels.com/photos/3985335/pexels-photo-3985335.jpeg?auto=compress&cs=tinysrgb&w=1200&h=900&fit=crop',href:'https://www.pexels.com/photo/woman-taking-a-selfie-3985335/',alt:'Persona tomando una selfie'},
 S6:{src:'https://images.pexels.com/photos/7290081/pexels-photo-7290081.jpeg?auto=compress&cs=tinysrgb&w=1200&h=900&fit=crop',href:'https://www.pexels.com/photo/side-view-of-woman-s-face-in-close-up-photography-7290081/',alt:'Perfil facial y nariz'},
 MARCA:{src:'https://images.pexels.com/photos/31844508/pexels-photo-31844508.jpeg?auto=compress&cs=tinysrgb&w=1200&h=900&fit=crop',href:'https://www.pexels.com/photo/modern-luxury-clinic-reception-interior-design-31844508/',alt:'Recepción moderna de clínica'}
};

const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-PE').trim();
const dval=s=>new Date(String(s)+'T12:00:00');
const fmt=s=>new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short'}).format(dval(s));
const fmtLong=s=>new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(dval(s));
const svgChevron=dir=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${dir==='left'?'m15 5-7 7 7 7':dir==='right'?'m9 5 7 7-7 7':'m5 9 7 7 7-7'}"/></svg>`;
const svgSummary=kind=>kind==='services'
 ?'<svg viewBox="0 0 24 24"><path d="m12 3 8 4-8 4-8-4 8-4Zm-8 9 8 4 8-4M4 17l8 4 8-4"/></svg>'
 :kind==='approved'
 ?'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>'
 :'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></svg>';

let calendars=[],slots=[],planMaps=new Map(),trMap=new Map(),projectMap=new Map(),current=0,openId=null;

async function mountCalendarBusinessSwitcher(ctx){
 const host=document.querySelector('.brandline');
 if(!host||document.querySelector('#calendarBusinessSwitcher'))return;
 const ids=[...new Set((ctx.memberships||[]).map(x=>x.negocio_id).filter(Boolean))];
 if(ids.length<2)return;
 const {data,error}=await sb.from('negocios').select('id,nombre,slug').in('id',ids).order('nombre');
 if(error)throw error;
 const wrap=document.createElement('label');
 wrap.className='calendar-business-switcher';
 wrap.innerHTML='<span>Negocio</span><select id="calendarBusinessSwitcher" aria-label="Elegir negocio">'+(data||[]).map(b=>'<option value="'+esc(b.id)+'">'+esc(b.nombre)+'</option>').join('')+'</select>';
 host.appendChild(wrap);
 const select=wrap.querySelector('select');
 select.value=String(ctx.negocioId);
 select.addEventListener('change',()=>{
   const id=select.value;
   localStorage.setItem('impulso_negocio_activo',id);
   const u=new URL(location.href);
   u.searchParams.set('negocio',id);
   u.searchParams.delete('week');
   location.assign(u.toString());
 });
}

async function resolveBusinessContext(){
 try{
   const {data:{session}}=await sb.auth.getSession();
   if(!session?.user){BUSINESS=PUBLIC_BUSINESS;return}
   const ctx=await resolveContentContext({redirect:false});
   BUSINESS_CTX=ctx;
   BUSINESS=ctx.negocioId;
   await mountCalendarBusinessSwitcher(ctx);
 }catch(_){
   BUSINESS=PUBLIC_BUSINESS;
   BUSINESS_CTX=null;
 }
}

function weekNo(cal,i){const m=String(cal.calendar_key||'').match(/w(\d+)/i);return m?Number(m[1]):i+1}
function weekLabel(cal,i){return `Semana ${String(weekNo(cal,i)).padStart(2,'0')} · ${fmt(cal.week_start)}–${fmt(cal.week_end)} ${dval(cal.week_end).getFullYear()}${cal.status==='CLOSED'?' · histórica':''}`}
function calOfSlot(s){return calendars.find(c=>c.id===s.calendario_id)}
function planFor(s){const cal=calOfSlot(s);return planMaps.get(cal?.bank_plan_key)||null}
function itemFor(s){if(s.source_bank==='TRANSVERSAL_BANK')return trMap.get(s.transversal_id);const plan=planFor(s);return (plan?.episodes||[]).find(x=>x.key===s.editorial_key)}
function serviceName(s){return s.service_key?names[s.service_key]:'Marca / equipo'}
function visualFor(s){return visuals[s.service_key||'MARCA']||visuals.MARCA}
function projectInfo(s){return s?.content_id?projectMap.get(s.content_id)||null:null}
function projectLabel(s){
 const n=Number(projectInfo(s)?.project_display_number);
 return Number.isFinite(n)&&n>0?`PROYECTO ${String(n).padStart(3,'0')}`:'PROYECTO PENDIENTE'
}
function projectClass(s){
 const n=Number(projectInfo(s)?.project_display_number);
 return Number.isFinite(n)&&n>0?'has-project':'pending-project'
}
function searchable(s){const item=itemFor(s);return norm([projectLabel(s),s.editorial_key,item?.editorial_key,item?.title,item?.question,item?.signal,item?.payoff,serviceName(s),roleNames[s.strategic_role]||s.strategic_role,s.rationale,s.expected_signal,s.execution_note,statusNames[s.status]||s.status,briefNames[s.brief_status]||s.brief_status].join(' '))}
function filters(){return{svc:document.querySelector('#strategyService')?.value||'',st:document.querySelector('#strategyStatus')?.value||'',q:norm(document.querySelector('#strategySearch')?.value||'')}}
function matches(s,f=filters()){return(!f.svc||(s.service_key||'MARCA')===f.svc)&&(!f.st||s.status===f.st)&&(!f.q||searchable(s).includes(f.q))}
function slotsFor(cal){return slots.filter(s=>s.calendario_id===cal?.id).sort((a,b)=>a.publish_date.localeCompare(b.publish_date))}
function globalMatches(){const f=filters();return slots.filter(s=>matches(s,f))}
function currentMatches(){return slotsFor(calendars[current]).filter(s=>matches(s))}
function badgeClass(s){return s.status==='APPROVED'?'approved':s.status==='RECORDED'?'recorded':s.status==='PUBLISHED'?'published':s.status==='NEEDS_CAPTURE'?'capture':s.status==='NEEDS_SCRIPT'?'missing':''}
function pretty(v,map={}){return map[v]||String(v||'Por definir').replaceAll('_',' ').toLocaleLowerCase('es-PE').replace(/^./,m=>m.toLocaleUpperCase('es-PE'))}

function chooseInitial(){
 const q=new URLSearchParams(location.search).get('week');
 if(q){const i=calendars.findIndex(c=>c.calendar_key===q);if(i>=0)return i}
 const today=new Date().toISOString().slice(0,10);
 const inside=calendars.findIndex(c=>c.status==='ACTIVE'&&c.week_start<=today&&c.week_end>=today);if(inside>=0)return inside;
 const future=calendars.findIndex(c=>c.status==='ACTIVE'&&c.week_start>=today);if(future>=0)return future;
 for(let i=calendars.length-1;i>=0;i--)if(calendars[i].status==='ACTIVE')return i;
 return Math.max(0,calendars.length-1);
}
function renderWeekNav(){
 const cal=calendars[current],sel=document.querySelector('#weekSelect');
 sel.innerHTML=calendars.map((c,i)=>`<option value="${i}" ${i===current?'selected':''}>${esc(weekLabel(c,i))}</option>`).join('');
 document.querySelector('#prevWeek').disabled=current<=0;
 document.querySelector('#nextWeek').disabled=current>=calendars.length-1;
 document.querySelector('#weekTitle').textContent=`${fmt(cal.week_start)} – ${fmt(cal.week_end)} · ${dval(cal.week_end).getFullYear()}`;
 document.querySelector('#weekSubtitle').textContent=`Semana ${String(weekNo(cal,current)).padStart(2,'0')} · ${fmt(cal.week_start)}–${fmt(cal.week_end)} ${dval(cal.week_end).getFullYear()}`;
 document.querySelector('#strategyName').textContent=cal.strategy_name||'Estrategia semanal';
 document.querySelector('#strategyText').textContent=cal.hypothesis?.principle||'';
 const u=new URL(location.href);u.searchParams.set('week',cal.calendar_key);if(BUSINESS_CTX)u.searchParams.set('negocio',BUSINESS);history.replaceState(null,'',u.pathname+u.search);
}
function renderFilters(){
 const svc=document.querySelector('#strategyService'),st=document.querySelector('#strategyStatus'),keepSvc=svc.value,keepSt=st.value;
 const services=[...new Set(slots.map(s=>s.service_key||'MARCA'))].sort();
 svc.innerHTML='<option value="">Todos</option>'+services.map(k=>`<option value="${esc(k)}">${esc(k==='MARCA'?'Marca / equipo':names[k]||k)}</option>`).join('');
 const statuses=[...new Set(slots.map(s=>s.status))];
 st.innerHTML='<option value="">Todos</option>'+statuses.map(k=>`<option value="${esc(k)}">${esc(statusNames[k]||k)}</option>`).join('');
 svc.value=services.includes(keepSvc)?keepSvc:'';
 st.value=statuses.includes(keepSt)?keepSt:'';
}
function renderStats(weekVisible){
 const serviceCount=new Set(weekVisible.filter(x=>x.service_key).map(x=>x.service_key)).size;
 const approved=weekVisible.filter(x=>['APPROVED','RECORDED','READY','PUBLISHED'].includes(x.status)).length;
 const capture=weekVisible.filter(x=>x.status==='NEEDS_CAPTURE'||x.brief_status==='WAITING_CAPTURE').length;
 document.querySelector('#stats').innerHTML=
 `<div class="summary-item"><span class="summary-icon services">${svgSummary('services')}</span><div><b>${serviceCount}</b><span>servicios</span></div></div>
  <div class="summary-item"><span class="summary-icon approved">${svgSummary('approved')}</span><div><b>${approved}</b><span>guiones aprobados</span></div></div>
  <div class="summary-item"><span class="summary-icon capture">${svgSummary('capture')}</span><div><b>${capture}</b><span>captura pendiente</span></div></div>`;
}
function statusLabel(s){return statusNames[s.status]||s.status||'Por definir'}
function compactCard(s){
 const d=dval(s.publish_date),item=itemFor(s),svc=s.service_key||'MARCA',expanded=openId===s.id;
 const weekday=new Intl.DateTimeFormat('es-PE',{weekday:'short'}).format(d).replace('.','').toUpperCase();
 return `<article class="day" data-service="${svc}" data-open="${expanded?'true':'false'}">
  <button class="day-toggle" type="button" data-slot="${esc(s.id)}" aria-expanded="${expanded}">
    <div class="accent"></div>
    <div class="day-head"><span class="weekday">${weekday}</span><strong>${d.getDate()}</strong></div>
    <div class="project-badge ${projectClass(s)}">${esc(projectLabel(s))}</div>
    <div class="service-mark">${esc(serviceShort[svc]||svc)}</div>
    <div class="service">${esc(serviceName(s).toUpperCase())}</div>
    <h2 class="title">${esc(item?.title||'Necesidad editorial')}</h2>
    <p class="role">${esc(roleNames[s.strategic_role]||s.strategic_role)}</p>
    <div class="status-band ${badgeClass(s)}"><span class="status-dot"></span>${esc(statusLabel(s).toUpperCase())}</div>
  </button>
 </article>`;
}
function addDays(iso,n){const d=dval(iso);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function calendarColumns(cal){
 const byDate=new Map(slotsFor(cal).map(s=>[s.publish_date,s]));
 return Array.from({length:7},(_,i)=>{const date=addDays(cal.week_start,i),slot=byDate.get(date)||null;return{date,slot}})
}
function emptyDay(date,hadSlot=false){
 const d=dval(date),weekday=new Intl.DateTimeFormat('es-PE',{weekday:'short'}).format(d).replace('.','').toUpperCase();
 const copy=hadSlot?'Sin resultado con estos filtros':'Sin publicación programada';
 return `<article class="day day-empty"><div class="day-toggle"><div class="day-head"><span class="weekday">${weekday}</span><strong>${d.getDate()}</strong></div><div class="empty-day-copy">${copy}</div></div></article>`;
}
function renderDetail(){
 const host=document.querySelector('#dayDetail'),s=slots.find(x=>x.id===openId);
 if(!s||s.calendario_id!==calendars[current]?.id||!matches(s)){host.hidden=true;host.innerHTML='';return}
 const item=itemFor(s),svc=s.service_key||'MARCA',visual=visualFor(s),d=s.publish_date;
 host.hidden=false;host.dataset.service=svc;
 host.innerHTML=`
   <div class="detail-visual">
     <div class="detail-date">${esc(fmtLong(d))}</div>
     <div class="detail-project-badge ${projectClass(s)}">${esc(projectLabel(s))}</div>
     <a class="visual-link" href="${esc(visual.href)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir fuente visual externa en Pexels">
       <img src="${esc(visual.src)}" alt="${esc(visual.alt)}" loading="lazy" referrerpolicy="no-referrer">
     </a>
     <div class="visual-meta">
       <b>${esc(serviceName(s).toUpperCase())}</b>
       <span>${esc(roleNames[s.strategic_role]||s.strategic_role)}</span>
     </div>
   </div>
   <div class="detail-dossier">
     <div class="detail-head">
       <div>
         <div class="detail-kicker">${esc(serviceName(s))}</div>
         <div class="detail-project-inline ${projectClass(s)}">${esc(projectLabel(s))}</div>
         <h2>${esc(item?.title||'Necesidad editorial')}</h2>
       </div>
       <button id="closeDetail" class="detail-close" type="button" aria-label="Cerrar detalle">×</button>
     </div>
     <div class="dossier-row">
       <span class="dossier-label">Pregunta que resolverá</span>
       <p>${esc(item?.question||'Por definir')}</p>
     </div>
     <div class="dossier-row">
       <span class="dossier-label">Objetivo</span>
       <p>${esc(pretty(item?.objective,objectiveNames))}</p>
     </div>
     <div class="dossier-row">
       <span class="dossier-label">Audiencia</span>
       <p>${esc(pretty(item?.audience,audienceNames))}</p>
     </div>
     <div class="dossier-row">
       <span class="dossier-label">Razón de publicación</span>
       <p>${esc(s.rationale||'Por definir')}</p>
     </div>
     <div class="dossier-row production">
       <span class="dossier-label">Estado de producción</span>
       <div class="status-band ${badgeClass(s)}"><span class="status-dot"></span>${esc(statusLabel(s).toUpperCase())}</div>
     </div>
   </div>`;
 document.querySelector('#closeDetail')?.addEventListener('click',()=>{openId=null;render()});
 host.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function render(){
 if(!calendars.length)return;
 const global=globalMatches(),week=currentMatches(),root=document.querySelector('#calendarApp'),cal=calendars[current],visibleIds=new Set(week.map(s=>s.id));
 document.querySelector('#strategyResultCount').textContent=`${global.length} resultado${global.length===1?'':'s'} · ${new Set(global.map(x=>x.calendario_id)).size} semana${new Set(global.map(x=>x.calendario_id)).size===1?'':'s'}`;
 renderWeekNav();renderStats(week);
 const cards=calendarColumns(cal).map(({date,slot})=>slot&&visibleIds.has(slot.id)?compactCard(slot):emptyDay(date,Boolean(slot))).join('');
 root.innerHTML=`<div class="calendar-shell"><div class="day-grid">${cards}</div></div>`;
 root.querySelectorAll('[data-slot]').forEach(btn=>btn.addEventListener('click',()=>{openId=openId===btn.dataset.slot?null:btn.dataset.slot;render()}));
 renderDetail();
}
function jumpIfNeeded(){
 const global=globalMatches(),week=currentMatches();
 if(!global.length||week.length)return false;
 const target=global[0],i=calendars.findIndex(c=>c.id===target.calendario_id);
 if(i>=0){current=i;openId=target.id;return true}
 return false;
}
function onFilter(){jumpIfNeeded();render()}
async function load(){
 const root=document.querySelector('#calendarApp');
 try{
  await resolveBusinessContext();
  const {data:cals,error:ce}=await sb.from('content_calendarios_publicacion').select('id,negocio_id,calendar_key,week_start,week_end,strategy_name,strategy_version,bank_plan_key,status,hypothesis').eq('negocio_id',BUSINESS).in('status',['ACTIVE','CLOSED']).order('week_start',{ascending:true});
  if(ce)throw ce;if(!cals?.length)throw new Error('No hay semanas publicadas');
  calendars=cals;
  const ids=calendars.map(c=>c.id),planKeys=[...new Set(calendars.map(c=>c.bank_plan_key))];
  const [{data:ss,error:se},{data:plans,error:pe},{data:trans,error:te},{data:projects,error:pre}]=await Promise.all([
   sb.from('content_calendario_publicacion_slots').select('id,calendario_id,negocio_id,publish_date,strategic_role,service_key,source_bank,editorial_key,transversal_id,content_id,match_status,rationale,expected_signal,execution_note,status,actual_publication_id,brief_status').in('calendario_id',ids).order('publish_date'),
   sb.from('content_planes_editoriales').select('plan_key,document').eq('negocio_id',BUSINESS).in('plan_key',planKeys),
   sb.from('content_banco_transversal').select('id,negocio_id,editorial_key,title,question,strategic_role,objective,audience,motivation,format,status').eq('negocio_id',BUSINESS),
   sb.from('content_public_project_labels').select('content_id,project_display_number,project_created_at').eq('negocio_id',BUSINESS)
  ]);
  if(se||pe||te||pre)throw se||pe||te||pre;
  slots=ss||[];
  planMaps=new Map((plans||[]).map(p=>[p.plan_key,p.document]));
  trMap=new Map((trans||[]).map(x=>[x.id,x]));
  projectMap=new Map((projects||[]).map(x=>[x.content_id,x]));
  current=chooseInitial();
  renderFilters();render();
  document.querySelector('#prevWeek').addEventListener('click',()=>{if(current>0){current--;openId=null;render()}});
  document.querySelector('#nextWeek').addEventListener('click',()=>{if(current<calendars.length-1){current++;openId=null;render()}});
  document.querySelector('#weekSelect').addEventListener('change',e=>{current=Number(e.target.value)||0;openId=null;render()});
  document.querySelector('#strategyService').addEventListener('change',onFilter);
  document.querySelector('#strategyStatus').addEventListener('change',onFilter);
  document.querySelector('#strategySearch').addEventListener('input',onFilter);
  document.querySelector('#strategyReset').addEventListener('click',()=>{document.querySelector('#strategyService').value='';document.querySelector('#strategyStatus').value='';document.querySelector('#strategySearch').value='';openId=null;render()});
 }catch(err){
  root.innerHTML=`<div class="error">No se pudo cargar el calendario estratégico: ${esc(err?.message||err)}</div>`;
 }
}
load();
