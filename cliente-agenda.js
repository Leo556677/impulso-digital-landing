import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';
const sb=createClient('https://xnlzsgulskqyecfgzhwa.supabase.co','sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
const $=id=>document.getElementById(id);
let negocioId=null,canEdit=false,config=null,resources=[],schedules=[],services=[],links=[];
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
function resetResourceForm(){resourceEditId=null;$('resourceForm').reset();$('resourceType').value='persona';$('saveResource').textContent='Agregar';$('cancelResourceEdit').hidden=true}
function resetScheduleForm(){scheduleEditId=null;$('scheduleForm').reset();$('saveSchedule').textContent='Agregar horario';$('cancelScheduleEdit').hidden=true}
function resetAssignForm(){linkEditKey=null;$('assignResource').value='';$('assignService').value='__all__';$('assignBtn').textContent='Guardar asignación';$('cancelAssignEdit').hidden=true}
function openConfirm(title,text,fn){pendingConfirm=fn;$('confirmTitle').textContent=title;$('confirmText').textContent=text;$('confirmModal').classList.add('show');$('confirmModal').setAttribute('aria-hidden','false');document.body.classList.add('modal-open')}
function closeConfirm(){$('confirmModal').classList.remove('show');$('confirmModal').setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');pendingConfirm=null}
$('confirmCancel').addEventListener('click',closeConfirm);
$('confirmAccept').addEventListener('click',async()=>{if(!pendingConfirm)return closeConfirm();const fn=pendingConfirm;closeConfirm();await fn()});
$('confirmModal').addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))closeConfirm()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('confirmModal').classList.contains('show'))closeConfirm()});

async function resolve(){const{data:{session}}=await sb.auth.getSession();if(!session){location.replace('./cliente-acceso.html');return false}const{data:m,error}=await sb.from('usuarios_negocio').select('negocio_id,rol,created_at').order('created_at');if(error||!m?.length)throw new Error('No pudimos identificar una empresa autorizada.');const params=new URLSearchParams(location.search),requested=params.get('negocio'),saved=localStorage.getItem('impulso_negocio_activo'),pick=id=>m.find(x=>String(x.negocio_id)===String(id)),membership=pick(requested)||pick(saved)||m[0];negocioId=membership.negocio_id;canEdit=['admin','propietario'].includes(membership.rol);localStorage.setItem('impulso_negocio_activo',String(negocioId));history.replaceState({},'',`${location.pathname}?negocio=${encodeURIComponent(negocioId)}`);return true}
async function load(){const [cfg,res,hrs,srv,lnk]=await Promise.all([
  sb.from('configuracion_agenda').select('*').eq('negocio_id',negocioId).maybeSingle(),
  sb.from('recursos_agenda').select('id,nombre,tipo,activo').eq('negocio_id',negocioId).eq('activo',true).order('created_at'),
  sb.from('horarios_agenda').select('id,recurso_id,dia_semana,hora_inicio,hora_fin,activo').eq('negocio_id',negocioId).eq('activo',true).order('dia_semana').order('hora_inicio'),
  sb.from('servicios').select('id,nombre,activo').eq('negocio_id',negocioId).eq('activo',true).order('created_at'),
  sb.from('servicios_recursos').select('servicio_id,recurso_id').eq('negocio_id',negocioId)
]);
for(const q of [cfg,res,hrs,srv,lnk]) if(q.error) throw q.error;
config=cfg.data;resources=res.data||[];schedules=hrs.data||[];services=srv.data||[];links=lnk.data||[];render()}

function render(){
  if(config){$('intervalo').value=config.intervalo_inicio_min;$('anticipacion').value=config.anticipacion_min;$('horizonte').value=config.horizonte_dias;$('activa').checked=Boolean(config.activa);$('configSummary').textContent=`Agenda ${config.activa?'activa':'guardada pero inactiva'} · inicio cada ${config.intervalo_inicio_min} min · anticipación ${config.anticipacion_min} min · horizonte ${config.horizonte_dias} días.`}else{$('configForm').reset();$('configSummary').textContent='Sin configuración guardada.'}
  const opts=resources.map(r=>`<option value="${esc(r.id)}">${esc(r.nombre)}</option>`).join('');
  $('scheduleResource').innerHTML='<option value="">Elige una opción</option>'+opts;
  $('assignResource').innerHTML='<option value="">Elige una opción</option>'+opts;
  $('assignService').innerHTML='<option value="__all__">Todos mis servicios activos</option>'+services.map(s=>`<option value="${esc(s.id)}">${esc(s.nombre)}</option>`).join('');
  $('resourceSummary').textContent=resources.length?`${resources.length} recurso(s) activo(s): ${resources.map(r=>r.nombre).join(', ')}.`:'Aún no hay recursos.';
  $('scheduleSummary').textContent=schedules.length?`${schedules.length} horario(s): ${schedules.slice(0,8).map(h=>`${days[h.dia_semana]} ${String(h.hora_inicio).slice(0,5)}–${String(h.hora_fin).slice(0,5)} · ${resourceName(h.recurso_id)}`).join(' · ')}${schedules.length>8?'…':''}`:'Aún no hay horarios.';
  const assigned=new Set(links.map(x=>x.servicio_id));
  $('assignSummary').textContent=services.length?`${assigned.size} de ${services.length} servicio(s) activos tienen al menos una asignación registrada.`:'No hay servicios activos. Agrégalos antes de completar la agenda.';
  $('assignBtn').disabled=!canEdit||!resources.length||!services.length;
  if(!services.length){$('notice').hidden=false;$('notice').innerHTML=`Antes de terminar la agenda necesitas al menos un servicio activo. <a href="./cliente-servicios.html?negocio=${encodeURIComponent(negocioId)}" style="color:inherit;font-weight:800">Agregar servicios</a>`} else $('notice').hidden=true;
  renderReview();
}

function reviewData(){
  const rulesRows=config?[[statePill(config.activa?'ACTIVA':'INACTIVA',Boolean(config.activa)),`${esc(config.intervalo_inicio_min)} min`,`${esc(config.anticipacion_min)} min`,`${esc(config.horizonte_dias)} días`,actionButtons('config',{})]]:[];
  const resourceRows=resources.map(r=>[esc(r.nombre),esc(r.tipo==='persona'?'Persona':'Recurso'),statePill(r.activo?'ACTIVO':'INACTIVO',Boolean(r.activo)),actionButtons('resource',{id:r.id})]);
  const scheduleRows=schedules.map(h=>[esc(resourceName(h.recurso_id)),esc(days[h.dia_semana]),esc(String(h.hora_inicio).slice(0,5)),esc(String(h.hora_fin).slice(0,5)),actionButtons('schedule',{id:h.id})]);
  const linkRows=links.map(l=>[esc(serviceName(l.servicio_id)),esc(resourceName(l.recurso_id)),statePill('ASIGNADO',true),actionButtons('link',{servicio:l.servicio_id,recurso:l.recurso_id})]);
  return {
    rules:{title:'Reglas de reserva',copy:'Configuración general de disponibilidad.',headers:['Estado','Inicio cada','Anticipación','Horizonte','Acciones'],rows:rulesRows,empty:'Todavía no guardaste reglas de reserva.',count:config?1:0},
    resources:{title:'Quién atiende',copy:'Personas o recursos activos de tu agenda.',headers:['Nombre','Tipo','Estado','Acciones'],rows:resourceRows,empty:'Aún no hay personas o recursos activos.',count:resources.length},
    schedules:{title:'Horarios registrados',copy:'Días y rangos disponibles para cada persona o recurso.',headers:['Quién atiende','Día','Desde','Hasta','Acciones'],rows:scheduleRows,empty:'Aún no hay horarios registrados.',count:schedules.length},
    links:{title:'Servicios asignados',copy:'Qué servicio puede realizar cada persona o recurso.',headers:['Servicio','Quién atiende','Estado','Acciones'],rows:linkRows,empty:'Todavía no hay servicios asignados.',count:links.length}
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
  if(kind==='config'){scrollToEl($('configForm'));$('intervalo').focus();msg('Puedes editar tus reglas arriba y volver a guardarlas.',true);return}
  if(kind==='resource'){const item=resources.find(x=>String(x.id)===String(b.dataset.id));if(!item)return;resourceEditId=item.id;$('resourceName').value=item.nombre||'';$('resourceType').value=item.tipo||'persona';$('saveResource').textContent='Guardar cambios';$('cancelResourceEdit').hidden=false;scrollToEl($('resourceForm'));$('resourceName').focus();msg('Edita el recurso y guarda los cambios.',true);return}
  if(kind==='schedule'){const item=schedules.find(x=>String(x.id)===String(b.dataset.id));if(!item)return;scheduleEditId=item.id;$('scheduleResource').value=item.recurso_id;$('day').value=String(item.dia_semana);$('start').value=String(item.hora_inicio).slice(0,5);$('end').value=String(item.hora_fin).slice(0,5);$('saveSchedule').textContent='Guardar cambios';$('cancelScheduleEdit').hidden=false;scrollToEl($('scheduleForm'));$('scheduleResource').focus();msg('Edita el horario y guarda los cambios.',true);return}
  if(kind==='link'){linkEditKey={servicio_id:b.dataset.servicio,recurso_id:b.dataset.recurso};$('assignResource').value=b.dataset.recurso;$('assignService').value=b.dataset.servicio;$('assignBtn').textContent='Guardar cambios';$('cancelAssignEdit').hidden=false;scrollToEl($('assignResource'));$('assignResource').focus();msg('Edita la asignación y guarda los cambios.',true);return}
}

function handleDelete(e){const b=e.currentTarget,kind=b.dataset.kind;
  if(kind==='config') return openConfirm('Eliminar reglas guardadas','Se quitará la configuración general de agenda de este negocio. Los recursos, horarios y servicios asignados no se borrarán.',async()=>{msg('Eliminando reglas…',true);const {error}=await sb.from('configuracion_agenda').delete().eq('negocio_id',negocioId);if(error)return msg('No pudimos eliminar las reglas.');msg('Reglas eliminadas.',true);await load();flashReview()});
  if(kind==='resource') return openConfirm('Desactivar persona o recurso','Se desactivará la persona o recurso, se pausarán sus horarios activos y se quitarán sus asignaciones de servicios. ¿Deseas continuar?',async()=>{msg('Desactivando recurso…',true);const id=b.dataset.id;const a=await sb.from('recursos_agenda').update({activo:false}).eq('id',id).eq('negocio_id',negocioId);if(a.error)return msg('No pudimos desactivar el recurso.');const h=await sb.from('horarios_agenda').update({activo:false}).eq('recurso_id',id).eq('negocio_id',negocioId);if(h.error)return msg('El recurso se desactivó, pero no pudimos pausar sus horarios.');const l=await sb.from('servicios_recursos').delete().eq('recurso_id',id).eq('negocio_id',negocioId);if(l.error)return msg('El recurso se desactivó, pero no pudimos quitar sus asignaciones.');resetResourceForm();resetScheduleForm();resetAssignForm();msg('Recurso desactivado y relaciones actualizadas.',true);await load();flashReview()});
  if(kind==='schedule') return openConfirm('Eliminar horario','Este horario dejará de estar disponible para reservas futuras. ¿Deseas continuar?',async()=>{msg('Eliminando horario…',true);const {error}=await sb.from('horarios_agenda').update({activo:false}).eq('id',b.dataset.id).eq('negocio_id',negocioId);if(error)return msg('No pudimos eliminar el horario.');resetScheduleForm();msg('Horario eliminado.',true);await load();flashReview()});
  if(kind==='link') return openConfirm('Eliminar asignación','El servicio dejará de estar asignado a esta persona o recurso. ¿Deseas continuar?',async()=>{msg('Eliminando asignación…',true);const {error}=await sb.from('servicios_recursos').delete().eq('negocio_id',negocioId).eq('servicio_id',b.dataset.servicio).eq('recurso_id',b.dataset.recurso);if(error)return msg('No pudimos eliminar la asignación.');resetAssignForm();msg('Asignación eliminada.',true);await load();flashReview()});
}

$('configForm').addEventListener('submit',async e=>{e.preventDefault();if(!canEdit)return;const payload={negocio_id:negocioId,intervalo_inicio_min:Number($('intervalo').value),anticipacion_min:Number($('anticipacion').value),horizonte_dias:Number($('horizonte').value),activa:$('activa').checked};if(!Number.isFinite(payload.intervalo_inicio_min)||payload.intervalo_inicio_min<5)return msg('Indica un intervalo válido.');if(!Number.isFinite(payload.anticipacion_min)||payload.anticipacion_min<0)return msg('Indica una anticipación válida.');if(!Number.isFinite(payload.horizonte_dias)||payload.horizonte_dias<1)return msg('Indica un horizonte válido.');msg('Guardando reglas…',true);const {error}=await sb.from('configuracion_agenda').upsert(payload,{onConflict:'negocio_id'});if(error)return msg('No pudimos guardar las reglas.');msg('Reglas guardadas.',true);await load();flashReview()});
$('resourceForm').addEventListener('submit',async e=>{e.preventDefault();if(!canEdit)return;const wasEditing=Boolean(resourceEditId),nombre=$('resourceName').value.trim();if(!nombre)return msg('Escribe el nombre de la persona o recurso.');const payload={negocio_id:negocioId,nombre,tipo:$('resourceType').value,activo:true};msg(resourceEditId?'Guardando cambios…':'Agregando recurso…',true);let q=resourceEditId?await sb.from('recursos_agenda').update({nombre:payload.nombre,tipo:payload.tipo}).eq('id',resourceEditId).eq('negocio_id',negocioId):await sb.from('recursos_agenda').insert(payload);if(q.error)return msg(resourceEditId?'No pudimos guardar los cambios del recurso.':'No pudimos agregar el recurso.');resetResourceForm();msg(wasEditing?'Recurso actualizado.':'Recurso agregado.',true);await load();flashReview()});
$('scheduleForm').addEventListener('submit',async e=>{e.preventDefault();if(!canEdit)return;const wasEditing=Boolean(scheduleEditId),recurso_id=$('scheduleResource').value,start=$('start').value,end=$('end').value,dayRaw=$('day').value;if(!recurso_id)return msg('Elige quién atenderá este horario.');if(dayRaw==='')return msg('Elige un día válido.');const dia=Number(dayRaw);if(!Number.isFinite(dia))return msg('Elige un día válido.');if(!start||!end)return msg('Completa la hora de inicio y fin.');if(end<=start)return msg('La hora de fin debe ser posterior a la hora de inicio.');const payload={negocio_id:negocioId,recurso_id,dia_semana:dia,hora_inicio:start,hora_fin:end,activo:true};msg(scheduleEditId?'Guardando cambios…':'Agregando horario…',true);let q=scheduleEditId?await sb.from('horarios_agenda').update({recurso_id:payload.recurso_id,dia_semana:payload.dia_semana,hora_inicio:payload.hora_inicio,hora_fin:payload.hora_fin}).eq('id',scheduleEditId).eq('negocio_id',negocioId):await sb.from('horarios_agenda').insert(payload);if(q.error)return msg(scheduleEditId?'No pudimos guardar los cambios del horario.':'No pudimos agregar el horario.');resetScheduleForm();msg(wasEditing?'Horario actualizado.':'Horario agregado.',true);await load();flashReview()});
$('assignBtn').addEventListener('click',async()=>{if(!canEdit)return;const wasEditing=Boolean(linkEditKey),recurso_id=$('assignResource').value,servicioSel=$('assignService').value;if(!recurso_id)return msg('Elige quién atenderá los servicios.');msg(linkEditKey?'Guardando cambios…':'Guardando asignación…',true);if(servicioSel==='__all__' && !linkEditKey){const rows=services.map(s=>({negocio_id:negocioId,servicio_id:s.id,recurso_id}));const {error}=await sb.from('servicios_recursos').upsert(rows,{onConflict:'negocio_id,servicio_id,recurso_id',ignoreDuplicates:true});if(error)return msg('No pudimos asignar los servicios.');resetAssignForm();msg('Servicios asignados.',true);await load();flashReview();return}
  const servicio_id=servicioSel==='__all__'&&linkEditKey?linkEditKey.servicio_id:servicioSel;
  if(!servicio_id)return msg('Elige un servicio.');
  if(linkEditKey && (String(linkEditKey.servicio_id)!==String(servicio_id) || String(linkEditKey.recurso_id)!==String(recurso_id))){const del=await sb.from('servicios_recursos').delete().eq('negocio_id',negocioId).eq('servicio_id',linkEditKey.servicio_id).eq('recurso_id',linkEditKey.recurso_id);if(del.error)return msg('No pudimos preparar la reasignación.');}
  const {error}=await sb.from('servicios_recursos').upsert([{negocio_id:negocioId,servicio_id,recurso_id}],{onConflict:'negocio_id,servicio_id,recurso_id',ignoreDuplicates:true});if(error)return msg('No pudimos guardar la asignación.');resetAssignForm();msg(wasEditing?'Asignación actualizada.':'Asignación guardada.',true);await load();flashReview()});

$('cancelResourceEdit').addEventListener('click',()=>{resetResourceForm();msg('Edición cancelada.',true)});
$('cancelScheduleEdit').addEventListener('click',()=>{resetScheduleForm();msg('Edición cancelada.',true)});
$('cancelAssignEdit').addEventListener('click',()=>{resetAssignForm();msg('Edición cancelada.',true)});
$('clearConfigEdit').addEventListener('click',()=>scrollToEl($('savedReview')));
document.querySelectorAll('.review-tab').forEach(b=>b.addEventListener('click',()=>{activeReviewTab=b.dataset.reviewTab||'rules';renderReview()}));

try{if(await resolve())await load()}catch(e){msg(e.message||'No pudimos cargar tu agenda.')}
