import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';
const URL='https://xnlzsgulskqyecfgzhwa.supabase.co';
const KEY='sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
const BUSINESS='48182e1a-06d5-4685-9627-7891d7aafacb';
const sb=createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const names={S1:'Toxina botulínica',S2:'PRP facial',S3:'Limpieza facial',S4:'Liposucción de papada',S5:'Bichectomía',S6:'Rinoplastia'};
const dayNames=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const roleNames={DOLOR_IDENTIFICACION:'Dolor / identificación',VALOR_EDUCACION:'Valor / educación',AUTORIDAD_CONFIANZA:'Autoridad / confianza',OBJECION:'Objeción',VENTA_SUAVE:'Venta suave',HUMANIZACION:'Humanización',COMUNIDAD_RELACION:'Comunidad / relación'};
const statusNames={PLANNED:'Planificado',NEEDS_CAPTURE:'Requiere captura real',NEEDS_SCRIPT:'Falta guion',SCRIPTED:'Guion listo',APPROVED:'Aprobado',RECORDED:'Grabado',READY:'Listo para publicar',PUBLISHED:'Publicado',SKIPPED:'Omitido'};
const fmt=d=>new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'short'}).format(new Date(`${d}T12:00:00`));
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
async function load(){
 const root=document.querySelector('#calendarApp');
 try{
  const {data:cal,error:ce}=await sb.from('content_calendarios_publicacion').select('*').eq('negocio_id',BUSINESS).eq('status','ACTIVE').order('week_start',{ascending:false}).limit(1).maybeSingle();
  if(ce||!cal)throw ce||new Error('No hay calendario activo');
  const [{data:slots,error:se},{data:plan,error:pe},{data:trans,error:te}]=await Promise.all([
   sb.from('content_calendario_publicacion_slots').select('*').eq('calendario_id',cal.id).order('publish_date'),
   sb.from('content_planes_editoriales').select('document').eq('negocio_id',BUSINESS).eq('plan_key',cal.bank_plan_key).maybeSingle(),
   sb.from('content_banco_transversal').select('*').eq('negocio_id',BUSINESS)
  ]);
  if(se||pe||te)throw se||pe||te;
  const epMap=new Map((plan?.document?.episodes||[]).map(x=>[x.key,x]));
  const trMap=new Map((trans||[]).map(x=>[x.id,x]));
  document.querySelector('#weekTitle').textContent=`${fmt(cal.week_start)} – ${fmt(cal.week_end)} · 2026`;
  document.querySelector('#strategyName').textContent=cal.strategy_name;
  document.querySelector('#strategyText').textContent=cal.hypothesis?.principle||'';
  document.querySelector('#stats').innerHTML=`<div class="stat"><b>${slots.length}</b><span>publicaciones reales</span></div><div class="stat"><b>${new Set(slots.filter(x=>x.service_key).map(x=>x.service_key)).size}/6</b><span>servicios esta semana</span></div><div class="stat"><b>${slots.filter(x=>x.match_status==='MATCH_FUERTE').length}</b><span>match fuerte</span></div><div class="stat"><b>${slots.filter(x=>x.status==='NEEDS_CAPTURE').length}</b><span>captura real pendiente</span></div>`;
  root.innerHTML=slots.map(s=>{
    const d=new Date(`${s.publish_date}T12:00:00`);
    const item=s.source_bank==='SERVICE_BANK'?epMap.get(s.editorial_key):trMap.get(s.transversal_id);
    const service=s.service_key?names[s.service_key]:'Marca / equipo';
    const svc=s.service_key||'MARCA';
    const matchClass=s.match_status==='MATCH_FUERTE'?'strong':s.match_status==='NUEVO_TRANSVERSAL'?'new':'';
    const stClass=s.status==='APPROVED'?'approved':s.status==='NEEDS_CAPTURE'?'capture':'';
    return `<article class="day" data-service="${svc}"><div class="day-head"><div class="dow">${dayNames[d.getDay()]}</div><div class="date">${d.getDate()}</div><span class="role">${esc(roleNames[s.strategic_role]||s.strategic_role)}</span></div><div class="body"><div class="service">${esc(service)}</div><h2 class="title">${esc(item?.title||'Necesidad editorial')}</h2><p class="question">${esc(item?.question||'')}</p><div class="section"><b>Por qué va aquí</b><p>${esc(s.rationale)}</p></div><div class="section"><b>Qué señal esperamos</b><p>${esc(s.expected_signal||'Por definir')}</p></div><div class="section"><b>Ejecución</b><p>${esc(s.execution_note||'')}</p></div><div class="badges"><span class="badge ${matchClass}">${esc(s.match_status.replaceAll('_',' '))}</span><span class="badge ${stClass}">${esc(statusNames[s.status]||s.status)}</span>${s.editorial_key?`<span class="badge">${esc(s.editorial_key)}</span>`:''}${item?.editorial_key?`<span class="badge">${esc(item.editorial_key)}</span>`:''}</div></div></article>`;
  }).join('');
 }catch(err){root.innerHTML=`<div class="error">No se pudo cargar el calendario estratégico: ${esc(err?.message||err)}</div>`}
}
load();
