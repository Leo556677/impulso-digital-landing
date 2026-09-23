import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';
const sb=createClient('https://xnlzsgulskqyecfgzhwa.supabase.co','sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=id=>document.getElementById(id);
let negocioId=null,canEdit=false,config=null,resources=[],schedules=[],services=[],links=[],appointments=[],appointmentContacts=new Map(),remindersByAppointment=new Map();
let resourceEditId=null,scheduleEditId=null,linkEditKey=null,pendingConfirm=null,activeReviewTab='rules';
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
function msg(t,ok=false){const e=$('status');e.textContent=t||'';e.className=`status ${t?'show':''} ${ok?'ok':''}`.trim()}
function flashReview(){const e=$('savedReview');e.classList.remove('flash');void e.offsetWidth;e.classList.add('flash');setTimeout(()=>e.classList.remove('flash'),1300)}
function scrollToEl(el){el?.scrollIntoView({behavior:'smooth',block:'start'})}
function table(headers,rows,empty){if(!rows.length)return `<div class="empty-row">${esc(empty)}</div>`;return `<div class="table-wrap"><table class="clean-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function statePill(text,on=true){return `<span class="state ${on?'':'off'}">${esc(text)}</span>`}
function actionButtons(kind,payload){const data=Object.entries(payload).map(([k,v])=>`data-${k}="${esc(v)}"`).join(' ');return `<div class="row-actions"><button class="btn secondary mini js-edit" data-kind="${kind}" ${data}>Editar</button><button class="btn danger mini js-delete" data-kind="${kind}" ${data}>Eliminar</button></div>`}
function resourceName(id){return resources.find(r=>String(r.id)===String(id))?.nombre||'Sin identificar'}
function serviceName(id){return services.find(s=>String(s.id)===String(id))?.nombre||'Sin identificar'}
function parseReminderMinutes(value){
  const raw=String(value??'').trim();
  if(!raw)return [];
  const nums=raw.split(/[;,\\s]+/).filter(Boolean).map(v=>Number(v));
  if(nums.some(v=>!Number.isInteger(v)||v<=0||v>525600))return null;
  return [...new Set(nums)].sort((a,b)=>b-a);
}
function reminderLabel(mins){
  const arr=Array.isArray(mins)?mins:[];
  if(!arr.length)return 'Desactivados';
  return arr.map(v=>v%1440===0?`${v/1440} d`:v%60===0?`${v/60} h`:`${v} min`).join(', ');
}
function resourceTypeLabel(tipo){return tipo==='persona'?'Persona':'Espacio/equipo'}
function resourceOptionLabel(r){return `${r.nombre} · ${resourceTypeLabel(r.tipo)}`}
function selectedScheduleDays(){return [...document.querySelectorAll('input[name="scheduleDay"]:checked')].map(x=>Number(x.value)).filter(x=>Number.isInteger(x))}
function setScheduleDays(values=[]){const set=new Set(values.map(Number));document.querySelectorAll('input[name="scheduleDay"]').forEach(x=>{x.checked=set.has(Number(x.value))})}
function syncLunchFields(){const on=$('hasLunch').checked;$('lunchFields').hidden=!on;if(!on){$('lunchStart').value='';$('lunchEnd').value=''}}
function updateResourceTypeUI(){
  const isPerson=$('resourceType').value==='persona';
  $('resourceNameLabel').textContent=isPerson?'Nombre de la persona':'Nombre del espacio o equipo';
  $('resourceName').placeholder=isPerson?'Ej. María':'Ej. Consultorio 1 / Láser 1';
  $('resourceTypeHelp').textContent=isPerson?'Una persona tiene sus propios horarios y puede atender servicios.':'Un espacio o equipo se reserva para evitar dos citas al mismo tiempo.';
}
function syncReminderPresetState(){
  const current=new Set(parseReminderMinutes($('recordatorios').value)||[]);
  document.querySelectorAll('[data-reminder-minutes]').forEach(b=>b.classList.toggle('active',current.has(Number(b.dataset.reminderMinutes))));
}
function insertReminderVariable(token){
  const ta=$('plantillaRecordatorio'),start=ta.selectionStart??ta.value.length,end=ta.selectionEnd??ta.value.length;
  ta.value=ta.value.slice(0,start)+token+ta.value.slice(end);
  const pos=start+token.length;ta.focus();ta.setSelectionRange(pos,pos);
}
function scheduleGroups(){
  const map=new Map();
  for(const h of schedules){
    const key=`${h.recurso_id}|${h.dia_semana}`;
    if(!map.has(key))map.set(key,{recurso_id:h.recurso_id,dia_semana:Number(h.dia_semana),rows:[]});
    map.get(key).rows.push(h);
  }
  return [...map.values()].map(g=>{
    g.rows.sort((a,b)=>String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
    g.start=String(g.rows[0]?.hora_inicio||'').slice(0,5);
    g.end=String(g.rows[g.rows.length-1]?.hora_fin||'').slice(0,5);
    g.lunchStart=g.rows.length===2?String(g.rows[0].hora_fin).slice(0,5):'';
    g.lunchEnd=g.rows.length===2?String(g.rows[1].hora_inicio).slice(0,5):'';
    g.hasLunch=Boolean(g.lunchStart&&g.lunchEnd&&g.lunchStart<g.lunchEnd);
    return g;
  }).sort((a,b)=>String(a.recurso_id).localeCompare(String(b.recurso_id))||a.dia_semana-b.dia_semana);
}
function scheduleActionButtons(g){return `<div class="row-actions"><button class="btn secondary mini js-edit" data-kind="schedule" data-resource="${esc(g.recurso_id)}" data-day="${esc(g.dia_semana)}">Editar</button><button class="btn danger mini js-delete" data-kind="schedule" data-resource="${esc(g.recurso_id)}" data-day="${esc(g.dia_semana)}">No atiende</button></div>`}
async function callAgendaSchedule(body){
  const {data,error}=await sb.functions.invoke('agenda-horario-semanal',{body:{negocio_id:negocioId,...body}});
  if(error){let d=null;try{if(error.context?.json)d=await error.context.json()}catch{}throw new Error(d?.error||error.message||'No pudimos guardar el horario.')}
  if(data?.ok===false)throw new Error(data.error||'No pudimos guardar el horario.');
  return data;
}
function fmtAppointmentDate(value){
  if(!value)return '—';
  try{return new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return String(value)}
}
function appointmentState(value){
  const map={pendiente:'PENDIENTE',confirmada:'CONFIRMADA',cancelada:'CANCELADA',completada:'COMPLETADA',no_asistio:'NO ASISTIÓ'};
  return map[value]||String(value||'—').toUpperCase();
}
function appointmentActions(a){
  if(!canEdit)return '—';
  const future=new Date(a.inicio).getTime()>Date.now();
  if(!future)return '—';
  const parts=[];
  if(a.estado==='pendiente')parts.push(`<button class="btn secondary mini js-appt-confirm" data-id="${esc(a.id)}">Confirmar</button>`);
  if(['pendiente','confirmada'].includes(a.estado))parts.push(`<button class="btn danger mini js-appt-cancel" data-id="${esc(a.id)}">Cancelar</button>`);
  return parts.length?`<div class="row-actions">${parts.join('')}</div>`:'—';
}
function renderAppointments(){
  const total=appointments.length;
  const future=appointments.filter(a=>new Date(a.inicio).getTime()>Date.now()&&['pendiente','confirmada'].includes(a.estado)).length;
  $('appointmentsCount').textContent=`${total} cita${total===1?'':'s'}`;
  $('appointmentsSummary').textContent=total?`${future} cita(s) futura(s) activa(s). Los recordatorios solo se programan cuando el cliente acepta recibirlos por WhatsApp.`:'Todavía no hay citas registradas.';
  const rows=appointments.map(a=>{
    const contact=appointmentContacts.get(String(a.contacto_id));
    const reminders=remindersByAppointment.get(String(a.id))||[];
    const reminderStatus=a.whatsapp_recordatorios_opt_in===true
      ? `Aceptados · ${reminders.length} programado(s)`
      : (a.whatsapp_recordatorios_opt_in_origen? 'Rechazados':'Sin consentimiento');
    return [
      esc(fmtAppointmentDate(a.inicio)),
      esc(contact?.nombre||contact?.telefono_e164||'Sin identificar'),
      esc(serviceName(a.servicio_id)),
      statePill(appointmentState(a.estado),a.estado==='confirmada'),
      esc(reminderStatus),
      appointmentActions(a)
    ];
  });
  $('appointmentsTable').innerHTML=table(['Fecha','Cliente','Servicio','Estado','Recordatorios','Acciones'],rows,'Todavía no hay citas registradas.');
  document.querySelectorAll('.js-appt-confirm').forEach(b=>b.addEventListener('click',()=>changeAppointmentState(b.dataset.id,'confirmada')));
  document.querySelectorAll('.js-appt-cancel').forEach(b=>b.addEventListener('click',()=>openConfirm('Cancelar cita','La cita dejará de estar activa y sus recordatorios pendientes se cancelarán. ¿Deseas continuar?',()=>changeAppointmentState(b.dataset.id,'cancelada'))));
}
async function changeAppointmentState(id,state){
  if(!canEdit)return;
  const current=appointments.find(a=>String(a.id)===String(id));
  if(!current)return msg('No encontramos esa cita.');
  if(new Date(current.inicio).getTime()<=Date.now())return msg('No se puede cambiar una cita cuyo horario ya pasó.');
  msg(state==='confirmada'?'Confirmando cita…':'Cancelando cita…',true);
  const {error}=await sb.from('citas').update({estado:state}).eq('id',id).eq('negocio_id',negocioId);
  if(error)return msg('No pudimos actualizar la cita.');
  msg(state==='confirmada'?'Cita confirmada.':'Cita cancelada.',true);
  await load();
  scrollToEl($('appointmentsReview'));
}
function resetResourceForm(){resourceEditId=null;$('resourceForm').reset();$('resourceType').value='persona';updateResourceTypeUI();$('saveResource').textContent='Agregar';$('cancelResourceEdit').hidden=true}
function resetScheduleForm(){scheduleEditId=null;$('scheduleForm').reset();setScheduleDays([]);$('hasLunch').checked=false;syncLunchFields();$('saveSchedule').textContent='Aplicar horario';$('copyScheduleBtn').hidden=true;$('cancelScheduleEdit').hidden=true;$('scheduleModeHint').textContent='El mismo horario se aplicará a todos los días seleccionados.'}
function resetAssignForm(){linkEditKey=null;$('assignResource').value='';$('assignService').value='__all__';$('assignBtn').textContent='Guardar';$('cancelAssignEdit').hidden=true}
function openConfirm(title,text,fn){pendingConfirm=fn;$('confirmTitle').textContent=title;$('confirmText').textContent=text;$('confirmModal').classList.add('show');$('confirmModal').setAttribute('aria-hidden','false');document.body.classList.add('modal-open')}
function closeConfirm(){$('confirmModal').classList.remove('show');$('confirmModal').setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');pendingConfirm=null}
$('confirmCancel').addEventListener('click',closeConfirm);
$('confirmAccept').addEventListener('click',async()=>{if(!pendingConfirm)return closeConfirm();const fn=pendingConfirm;closeConfirm();await fn()});
$('confirmModal').addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeConfirm()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('confirmModal').classList.contains('show'))closeConfirm()});

async function resolve(){const{data:{session}}=await sb.auth.getSession();if(!session){location.replace('./cliente-acceso.html');return false}const{data:m,error}=await sb.from('usuarios_negocio').select('negocio_id,rol,created_at').eq('user_id',session.user.id).order('created_at');if(error||!m?.length)throw new Error('No pudimos identificar una empresa autorizada.');const params=new URLSearchParams(location.search),requested=params.get('negocio'),saved=localStorage.getItem('impulso_negocio_activo'),pick=id=>m.find(x=>String(x.negocio_id)===String(id)),membership=pick(requested)||pick(saved)||m[0];negocioId=membership.negocio_id;canEdit=['admin','propietario'].includes(membership.rol);localStorage.setItem('impulso_negocio_activo',String(negocioId));history.replaceState({},'',`${location.pathname}?negocio=${encodeURIComponent(negocioId)}`);return true}
async function load(){const [cfg,res,hrs,srv,lnk,apt,rem]=await Promise.all([
  sb.from('configuracion_agenda').select('*').eq('negocio_id',negocioId).maybeSingle(),
  sb.from('recursos_agenda').select('id,nombre,tipo,activo').eq('negocio_id',negocioId).eq('activo',true).order('created_at'),
  sb.from('horarios_agenda').select('id,recurso_id,dia_semana,hora_inicio,hora_fin,activo').eq('negocio_id',negocioId).eq('activo',true).order('dia_semana').order('hora_inicio'),
  sb.from('servicios').select('id,nombre,activo').eq('negocio_id',negocioId).eq('activo',true).order('created_at'),
  sb.from('servicios_recursos').select('servicio_id,recurso_id').eq('negocio_id',negocioId),
  sb.from('citas').select('id,contacto_id,servicio_id,recurso_id,conversacion_id,inicio,fin,estado,origen,whatsapp_recordatorios_opt_in,whatsapp_recordatorios_opt_in_at,whatsapp_recordatorios_opt_in_origen').eq('negocio_id',negocioId).order('inicio',{ascending:false}).limit(100),
  sb.from('recordatorios_citas').select('id,cita_id,anticipacion_min,programado_at,estado,error').eq('negocio_id',negocioId).order('programado_at',{ascending:true})
]);
for(const q of [cfg,res,hrs,srv,lnk,apt,rem]) if(q.error) throw q.error;
config=cfg.data;resources=res.data||[];schedules=hrs.data||[];services=srv.data||[];links=lnk.data||[];appointments=apt.data||[];
const contactIds=[...new Set(appointments.map(x=>x.contacto_id).filter(Boolean))];
appointmentContacts=new Map();
if(contactIds.length){
  const {data:contacts,error:contactError}=await sb.from('contactos').select('id,nombre,telefono_e164').eq('negocio_id',negocioId).in('id',contactIds);
  if(contactError)throw contactError;
  appointmentContacts=new Map((contacts||[]).map(x=>[String(x.id),x]));
}
remindersByAppointment=new Map();
for(const row of rem.data||[]){
  const key=String(row.cita_id),arr=remindersByAppointment.get(key)||[];
  arr.push(row);remindersByAppointment.set(key,arr);
}
render()}

function render(){
  if(config){
    $('intervalo').value=config.intervalo_inicio_min;
    $('anticipacion').value=config.anticipacion_min;
    $('horizonte').value=config.horizonte_dias;
    $('capacidad').value=config.capacidad_por_hora??1;
    $('cooldown').value=config.cooldown_reserva_min??60;
    $('recordatorios').value=Array.isArray(config.recordatorios_anticipacion_min)?config.recordatorios_anticipacion_min.join(', '):'';
    $('plantillaRecordatorio').value=config.plantilla_recordatorio??'';
    $('activa').checked=Boolean(config.activa);
    $('configSummary').textContent=`Agenda ${config.activa?'activa':'guardada pero inactiva'} · inicio cada ${config.intervalo_inicio_min} min · anticipación ${config.anticipacion_min} min · horizonte ${config.horizonte_dias} días · capacidad ${config.capacidad_por_hora??1}/h · recordatorios: ${reminderLabel(config.recordatorios_anticipacion_min)}.`;
  }else{
    $('configForm').reset();
    $('capacidad').value='1';
    $('cooldown').value='60';
    $('configSummary').textContent='Sin configuración guardada.';
  }
  syncReminderPresetState();
  updateResourceTypeUI();
  const opts=resources.map(r=>`<option value="${esc(r.id)}">${esc(resourceOptionLabel(r))}</option>`).join('');
  $('scheduleResource').innerHTML='<option value="">Selecciona quién atiende</option>'+opts;
  $('assignResource').innerHTML='<option value="">Selecciona</option>'+opts;
  $('assignService').innerHTML='<option value="__all__">Todos los servicios activos</option>'+services.map(s=>`<option value="${esc(s.id)}">${esc(s.nombre)}</option>`).join('');
  $('resourceSummary').textContent=resources.length?`${resources.length} activo(s): ${resources.map(r=>`${r.nombre} · ${resourceTypeLabel(r.tipo)}`).join(', ')}.`:'Aún no agregaste quién atiende.';
  const groups=scheduleGroups();
  $('scheduleSummary').textContent=groups.length?`${groups.length} día(s) configurado(s): ${groups.slice(0,8).map(g=>`${days[g.dia_semana]} ${g.start}–${g.end}${g.hasLunch?` · almuerzo ${g.lunchStart}–${g.lunchEnd}`:''} · ${resourceName(g.recurso_id)}`).join(' · ')}${groups.length>8?'…':''}`:'Aún no hay horarios.';
  const assigned=new Set(links.map(x=>x.servicio_id));
  $('assignSummary').textContent=services.length?`${assigned.size} de ${services.length} servicio(s) activos tienen al menos una asignación registrada.`:'No hay servicios activos. Agrégalos antes de completar la agenda.';
  $('assignBtn').disabled=!canEdit||!resources.length||!services.length;
  if(!services.length){$('notice').hidden=false;$('notice').innerHTML=`Antes de terminar la agenda necesitas al menos un servicio activo. <a href="./cliente-servicios.html?negocio=${encodeURIComponent(negocioId)}" style="color:inherit;font-weight:800">Agregar servicios</a>`} else $('notice').hidden=true;
  renderAppointments();
  renderReview();
}

function reviewData(){
  const rulesRows=config?[[statePill(config.activa?'ACTIVA':'INACTIVA',Boolean(config.activa)),`${esc(config.intervalo_inicio_min)} min`,`${esc(config.anticipacion_min)} min`,`${esc(config.horizonte_dias)} días`,`${esc(config.capacidad_por_hora??1)}/h`,esc(reminderLabel(config.recordatorios_anticipacion_min)),actionButtons('config',{})]]:[];
  const resourceRows=resources.map(r=>[esc(r.nombre),esc(resourceTypeLabel(r.tipo)),statePill(r.activo?'ACTIVO':'INACTIVO',Boolean(r.activo)),actionButtons('resource',{id:r.id})]);
  const groups=scheduleGroups();
  const scheduleRows=groups.map(g=>[
    esc(resourceName(g.recurso_id)),
    esc(days[g.dia_semana]),
    esc(`${g.start}–${g.end}`),
    esc(g.hasLunch?`${g.lunchStart}–${g.lunchEnd}`:'Sin pausa'),
    scheduleActionButtons(g)
  ]);
  const linkRows=links.map(l=>[esc(serviceName(l.servicio_id)),esc(resourceName(l.recurso_id)),statePill('ASIGNADO',true),actionButtons('link',{servicio:l.servicio_id,recurso:l.recurso_id})]);
  return {
    rules:{title:'Reglas de citas',copy:'Reservas y recordatorios.',headers:['Estado','Inicio cada','Anticipación','Horizonte','Capacidad','Recordatorios','Acciones'],rows:rulesRows,empty:'Todavía no guardaste reglas de citas.',count:config?1:0},
    resources:{title:'Quién atiende',copy:'Personas, espacios o equipos activos.',headers:['Nombre','Tipo','Estado','Acciones'],rows:resourceRows,empty:'Aún no agregaste quién atiende.',count:resources.length},
    schedules:{title:'Días y horarios',copy:'Horario de atención y pausa de almuerzo.',headers:['Quién','Día','Atención','Almuerzo','Acciones'],rows:scheduleRows,empty:'Aún no hay días configurados.',count:groups.length},
    links:{title:'Servicios asignados',copy:'Qué servicio puede atender cada persona, espacio o equipo.',headers:['Servicio','Quién','Estado','Acciones'],rows:linkRows,empty:'Todavía no hay servicios asignados.',count:links.length}
  };
}
function renderReview(){
  const data=reviewData();
  if(!data[activeReviewTab])activeReviewTab='rules';
  $('rulesCount').textContent=data.rules.count;
  $('resourcesCount').textContent=data.resources.count;
  $('schedulesCount').textContent=data.schedules.count;
  $('linksCount').textContent=data.links.count;
  document.querySelectorAll('.review-tab').forEach(b=>{const on=b.dataset.reviewTab===activeReviewTab;b.classList.toggle('active',on);b.setAttribute('aria-selected',on?'true':'false')});
  const current=data[activeReviewTab];
  $('reviewCategoryTitle').textContent=current.title;
  $('reviewCategoryCopy').textContent=current.copy;
  $('reviewTable').innerHTML=table(current.headers,current.rows,current.empty);
  document.querySelectorAll('#reviewTable .js-edit').forEach(b=>b.addEventListener('click',handleEdit));
  document.querySelectorAll('#reviewTable .js-delete').forEach(b=>b.addEventListener('click',handleDelete));
}

function handleEdit(e){const b=e.currentTarget,kind=b.dataset.kind;
  if(kind==='config'){scrollToEl($('configForm'));$('intervalo').focus();msg('Edita las reglas y guarda los cambios.',true);return}
  if(kind==='resource'){
    const item=resources.find(x=>String(x.id)===String(b.dataset.id));if(!item)return;
    resourceEditId=item.id;$('resourceName').value=item.nombre||'';$('resourceType').value=item.tipo||'persona';updateResourceTypeUI();
    $('saveResource').textContent='Guardar cambios';$('cancelResourceEdit').hidden=false;scrollToEl($('resourceForm'));$('resourceName').focus();return
  }
  if(kind==='schedule'){
    const resourceId=String(b.dataset.resource||''),day=Number(b.dataset.day);
    const group=scheduleGroups().find(g=>String(g.recurso_id)===resourceId&&Number(g.dia_semana)===day);if(!group)return;
    scheduleEditId={recurso_id:resourceId,dia_semana:day};
    $('scheduleResource').value=resourceId;setScheduleDays([day]);$('start').value=group.start;$('end').value=group.end;
    $('hasLunch').checked=group.hasLunch;syncLunchFields();
    if(group.hasLunch){$('lunchStart').value=group.lunchStart;$('lunchEnd').value=group.lunchEnd}
    $('saveSchedule').textContent='Guardar este día';$('copyScheduleBtn').hidden=false;$('cancelScheduleEdit').hidden=false;
    $('scheduleModeHint').textContent=`Editando ${days[day]}. Al guardar se reemplazará el horario de ese día.`;
    scrollToEl($('scheduleForm'));$('scheduleResource').focus();return
  }
  if(kind==='link'){linkEditKey={servicio_id:b.dataset.servicio,recurso_id:b.dataset.recurso};$('assignResource').value=b.dataset.recurso;$('assignService').value=b.dataset.servicio;$('assignBtn').textContent='Guardar cambios';$('cancelAssignEdit').hidden=false;scrollToEl($('assignResource'));$('assignResource').focus();return}
}

function handleDelete(e){const b=e.currentTarget,kind=b.dataset.kind;
  if(kind==='config') return openConfirm('Eliminar reglas guardadas','Se quitarán las reglas generales de citas. Personas, horarios y servicios asignados se conservarán.',async()=>{msg('Eliminando reglas…',true);const {error}=await sb.from('configuracion_agenda').delete().eq('negocio_id',negocioId);if(error)return msg('No pudimos eliminar las reglas.');msg('Reglas eliminadas.',true);await load();flashReview()});
  if(kind==='resource') return openConfirm('Desactivar','Se desactivará esta persona, espacio o equipo, junto con sus horarios y asignaciones.',async()=>{msg('Desactivando…',true);const id=b.dataset.id;const a=await sb.from('recursos_agenda').update({activo:false}).eq('id',id).eq('negocio_id',negocioId);if(a.error)return msg('No pudimos desactivarlo.');const h=await sb.from('horarios_agenda').update({activo:false}).eq('recurso_id',id).eq('negocio_id',negocioId);if(h.error)return msg('Se desactivó, pero no pudimos pausar sus horarios.');const l=await sb.from('servicios_recursos').delete().eq('recurso_id',id).eq('negocio_id',negocioId);if(l.error)return msg('Se desactivó, pero no pudimos quitar sus servicios.');resetResourceForm();resetScheduleForm();resetAssignForm();msg('Desactivado.',true);await load();flashReview()});
  if(kind==='schedule'){
    const resourceId=String(b.dataset.resource||''),day=Number(b.dataset.day);
    if(!resourceId||!Number.isInteger(day))return;
    return openConfirm(`${days[day]} sin atención`,`Se quitarán los horarios activos de ${days[day]} para ${resourceName(resourceId)}.`,async()=>{
      msg('Actualizando día…',true);
      try{await callAgendaSchedule({recurso_id:resourceId,dias:[day],cerrar:true});resetScheduleForm();msg(`${days[day]} quedó sin atención.`,true);await load();flashReview()}catch(err){msg(err.message||'No pudimos actualizar el día.')}
    });
  }
  if(kind==='link') return openConfirm('Eliminar asignación','Este servicio dejará de estar asignado.',async()=>{msg('Eliminando asignación…',true);const {error}=await sb.from('servicios_recursos').delete().eq('negocio_id',negocioId).eq('servicio_id',b.dataset.servicio).eq('recurso_id',b.dataset.recurso);if(error)return msg('No pudimos eliminar la asignación.');resetAssignForm();msg('Asignación eliminada.',true);await load();flashReview()});
}

$('configForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(!canEdit)return;
  const reminders=parseReminderMinutes($('recordatorios').value);
  if(reminders===null)return msg('Los recordatorios deben ser minutos enteros positivos separados por coma. Ejemplo: 1440, 60.');
  const plantilla=$('plantillaRecordatorio').value.trim();
  if(reminders.length&&!plantilla)return msg('Escribe el mensaje que se enviará en los recordatorios.');
  const payload={
    negocio_id:negocioId,
    intervalo_inicio_min:Number($('intervalo').value),
    anticipacion_min:Number($('anticipacion').value),
    horizonte_dias:Number($('horizonte').value),
    capacidad_por_hora:Number($('capacidad').value),
    cooldown_reserva_min:Number($('cooldown').value),
    recordatorios_anticipacion_min:reminders,
    plantilla_recordatorio:plantilla||null,
    activa:$('activa').checked
  };
  if(!Number.isFinite(payload.intervalo_inicio_min)||payload.intervalo_inicio_min<5||payload.intervalo_inicio_min>240)return msg('Indica un intervalo válido entre 5 y 240 minutos.');
  if(!Number.isFinite(payload.anticipacion_min)||payload.anticipacion_min<0||payload.anticipacion_min>525600)return msg('Indica una anticipación válida.');
  if(!Number.isFinite(payload.horizonte_dias)||payload.horizonte_dias<1||payload.horizonte_dias>365)return msg('Indica un horizonte entre 1 y 365 días.');
  if(!Number.isInteger(payload.capacidad_por_hora)||payload.capacidad_por_hora<1||payload.capacidad_por_hora>100)return msg('Indica una capacidad por hora entre 1 y 100.');
  if(!Number.isInteger(payload.cooldown_reserva_min)||payload.cooldown_reserva_min<0||payload.cooldown_reserva_min>10080)return msg('Indica una espera entre reservas entre 0 y 10080 minutos.');
  msg('Guardando reglas y recordatorios…',true);
  const {error}=await sb.from('configuracion_agenda').upsert(payload,{onConflict:'negocio_id'});
  if(error)return msg('No pudimos guardar las reglas.');
  msg('Reglas y recordatorios guardados.',true);
  await load();
  flashReview();
});
$('resourceForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!canEdit)return;
  const wasEditing=Boolean(resourceEditId),nombre=$('resourceName').value.trim(),tipo=$('resourceType').value;
  if(!nombre)return msg(tipo==='persona'?'Escribe el nombre de la persona.':'Escribe el nombre del espacio o equipo.');
  const payload={negocio_id:negocioId,nombre,tipo,activo:true};
  msg(resourceEditId?'Guardando cambios…':'Agregando…',true);
  const q=resourceEditId
    ?await sb.from('recursos_agenda').update({nombre:payload.nombre,tipo:payload.tipo}).eq('id',resourceEditId).eq('negocio_id',negocioId)
    :await sb.from('recursos_agenda').insert(payload);
  if(q.error)return msg('No pudimos guardar los cambios.');
  resetResourceForm();msg(wasEditing?'Actualizado.':'Agregado.',true);await load();flashReview()
});
$('scheduleForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!canEdit)return;
  const wasEditing=Boolean(scheduleEditId),recurso_id=$('scheduleResource').value,dias=selectedScheduleDays(),start=$('start').value,end=$('end').value,hasLunch=$('hasLunch').checked,lunchStart=$('lunchStart').value,lunchEnd=$('lunchEnd').value;
  if(!recurso_id)return msg('Selecciona la persona, espacio o equipo.');
  if(!dias.length)return msg('Selecciona al menos un día.');
  if(!start||!end)return msg('Completa la hora de apertura y cierre.');
  if(end<=start)return msg('La hora de cierre debe ser posterior a la apertura.');
  if(hasLunch&&(!lunchStart||!lunchEnd))return msg('Completa el inicio y fin del almuerzo.');
  if(hasLunch&&(lunchEnd<=lunchStart||lunchStart<=start||lunchEnd>=end))return msg('El almuerzo debe quedar dentro del horario de atención.');
  msg(wasEditing?'Guardando horario…':'Aplicando horario…',true);
  try{
    const data=await callAgendaSchedule({recurso_id,dias,hora_inicio:start,hora_fin:end,almuerzo:hasLunch,almuerzo_inicio:hasLunch?lunchStart:null,almuerzo_fin:hasLunch?lunchEnd:null,cerrar:false});
    resetScheduleForm();
    msg(`Horario aplicado a ${data.dias_aplicados||dias.length} día(s).`,true);
    await load();flashReview()
  }catch(err){msg(err.message||'No pudimos guardar el horario.')}
});
$('assignBtn').addEventListener('click',async()=>{if(!canEdit)return;const wasEditing=Boolean(linkEditKey),recurso_id=$('assignResource').value,servicioSel=$('assignService').value;if(!recurso_id)return msg('Selecciona la persona, espacio o equipo.');msg(linkEditKey?'Guardando cambios…':'Guardando…',true);if(servicioSel==='__all__' && !linkEditKey){const rows=services.map(s=>({negocio_id:negocioId,servicio_id:s.id,recurso_id}));const {error}=await sb.from('servicios_recursos').upsert(rows,{onConflict:'negocio_id,servicio_id,recurso_id',ignoreDuplicates:true});if(error)return msg('No pudimos asignar los servicios.');resetAssignForm();msg('Servicios asignados.',true);await load();flashReview();return}
  const servicio_id=servicioSel==='__all__'&&linkEditKey?linkEditKey.servicio_id:servicioSel;
  if(!servicio_id)return msg('Elige un servicio.');
  if(linkEditKey && (String(linkEditKey.servicio_id)!==String(servicio_id) || String(linkEditKey.recurso_id)!==String(recurso_id))){const del=await sb.from('servicios_recursos').delete().eq('negocio_id',negocioId).eq('servicio_id',linkEditKey.servicio_id).eq('recurso_id',linkEditKey.recurso_id);if(del.error)return msg('No pudimos preparar la reasignación.');}
  const {error}=await sb.from('servicios_recursos').upsert([{negocio_id:negocioId,servicio_id,recurso_id}],{onConflict:'negocio_id,servicio_id,recurso_id',ignoreDuplicates:true});if(error)return msg('No pudimos guardar la asignación.');resetAssignForm();msg(wasEditing?'Asignación actualizada.':'Asignación guardada.',true);await load();flashReview()});

$('resourceType').addEventListener('change',updateResourceTypeUI);
$('hasLunch').addEventListener('change',syncLunchFields);
$('daysWeekdays').addEventListener('click',()=>setScheduleDays([1,2,3,4,5]));
$('daysMonSat').addEventListener('click',()=>setScheduleDays([1,2,3,4,5,6]));
$('daysAll').addEventListener('click',()=>setScheduleDays([0,1,2,3,4,5,6]));
$('daysClear').addEventListener('click',()=>setScheduleDays([]));

$('copyScheduleBtn').addEventListener('click',()=>{
  if(!scheduleEditId)return;
  scheduleEditId=null;setScheduleDays([]);$('saveSchedule').textContent='Aplicar horario';$('copyScheduleBtn').hidden=true;
  $('scheduleModeHint').textContent='Selecciona los días destino y pulsa Aplicar horario. Se copiarán también la pausa de almuerzo y las horas.';
  msg('Horario listo para copiar. Elige los días destino.',true);
});

$('closeDaysBtn').addEventListener('click',()=>{
  if(!canEdit)return;
  const recurso_id=$('scheduleResource').value,dias=selectedScheduleDays();
  if(!recurso_id)return msg('Selecciona la persona, espacio o equipo.');
  if(!dias.length)return msg('Selecciona los días que no atenderá.');
  const labels=dias.sort((a,b)=>a-b).map(d=>days[d]).join(', ');
  openConfirm('Marcar días sin atención',`Se quitarán los horarios activos de: ${labels}. Las citas existentes no se borrarán.`,async()=>{
    msg('Actualizando días…',true);
    try{await callAgendaSchedule({recurso_id,dias,cerrar:true});resetScheduleForm();msg('Días actualizados.',true);await load();flashReview()}catch(err){msg(err.message||'No pudimos actualizar los días.')}
  });
});

document.querySelectorAll('[data-variable]').forEach(button=>button.addEventListener('click',()=>insertReminderVariable(button.dataset.variable||'')));
document.querySelectorAll('[data-reminder-minutes]').forEach(button=>button.addEventListener('click',()=>{
  const value=Number(button.dataset.reminderMinutes),current=parseReminderMinutes($('recordatorios').value)||[],set=new Set(current);
  if(set.has(value))set.delete(value);else set.add(value);
  $('recordatorios').value=[...set].sort((a,b)=>b-a).join(', ');
  syncReminderPresetState();
}));
$('recordatorios').addEventListener('input',syncReminderPresetState);

$('cancelResourceEdit').addEventListener('click',()=>{resetResourceForm();msg('Edición cancelada.',true)});
$('cancelScheduleEdit').addEventListener('click',()=>{resetScheduleForm();msg('Edición cancelada.',true)});
$('cancelAssignEdit').addEventListener('click',()=>{resetAssignForm();msg('Edición cancelada.',true)});
$('clearConfigEdit').addEventListener('click',()=>scrollToEl($('savedReview')));
document.querySelectorAll('.review-tab').forEach(b=>b.addEventListener('click',()=>{activeReviewTab=b.dataset.reviewTab||'rules';renderReview()}));

try{if(await resolve())await load()}catch(e){msg(e.message||'No pudimos cargar tu agenda.')}
