import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';
const sb=createClient('https://xnlzsgulskqyecfgzhwa.supabase.co','sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}),$=id=>document.getElementById(id);
const E={tenantSelect:$('tenantSelect'),tenant:$('tenantName'),role:$('tenantRole'),panel:$('panelBtn'),logout:$('logoutBtn'),count:$('count'),search:$('search'),filter:$('filter'),list:$('list'),title:$('threadTitle'),sub:$('threadSub'),state:$('stateSel'),stateBtn:$('stateBtn'),assignLabel:$('assignLabel'),assignBtn:$('assignBtn'),botLabel:$('botLabel'),botBtn:$('botBtn'),messages:$('messages'),contact:$('contact'),brain:$('brain'),takeControl:$('takeControlBtn'),releaseControl:$('releaseControlBtn'),manualComposer:$('manualComposer'),manualText:$('manualText'),manualSend:$('manualSendBtn'),notifyBtn:$('notifyBtn'),notifyBadge:$('notifyBadge'),notifyMenu:$('notifyMenu'),notifyList:$('notifyList'),status:$('status')};
let S={uid:null,bid:null,role:null,session:null,memberships:[],businesses:new Map(),convs:[],contacts:new Map(),msgs:new Map(),brain:new Map(),selected:null},chan=null,timer=null,busy=false,queued=false;
const text=(v,f='—')=>typeof v==='string'&&v.trim()?v.trim():f,fmt=v=>v?new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'—';
function node(t,c,x){const n=document.createElement(t);if(c)n.className=c;if(x!==undefined)n.textContent=x;return n}function toast(m,err=false){E.status.textContent=m;E.status.classList.toggle('error',err);E.status.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>E.status.hidden=true,3800)}
function setTenantUi(mem,b){
  S.bid=mem.negocio_id;S.role=mem.rol;
  localStorage.setItem('impulso_negocio_activo',String(S.bid));
  history.replaceState({},'',`${location.pathname}?negocio=${encodeURIComponent(S.bid)}`);
  E.tenant.textContent=b?.nombre||'Empresa';
  E.role.textContent=`${mem.rol} · ${b?.slug||'negocio'}`;
  E.tenantSelect.value=String(S.bid);
  E.panel.onclick=()=>location.href=`./cliente-panel.html?negocio=${encodeURIComponent(S.bid)}`;
}
async function tenant(){
  const{data:{session}}=await sb.auth.getSession();
  if(!session?.user){location.replace('./crm-login.html');return null}
  S.session=session;S.uid=session.user.id;
  const{data:m,error}=await sb.from('usuarios_negocio').select('negocio_id,rol,created_at').eq('user_id',session.user.id).order('created_at');
  if(error)throw error;
  if(!m?.length)throw new Error('Tu usuario no tiene una empresa autorizada.');
  S.memberships=m;
  const ids=m.map(x=>x.negocio_id);
  const{data:bs,error:be}=await sb.from('negocios').select('id,nombre,slug').in('id',ids).order('nombre');
  if(be)throw be;
  S.businesses=new Map((bs||[]).map(b=>[String(b.id),b]));
  E.tenantSelect.replaceChildren();
  for(const mem of m){
    const b=S.businesses.get(String(mem.negocio_id));
    if(!b)continue;
    const o=document.createElement('option');o.value=String(mem.negocio_id);o.textContent=b.nombre;E.tenantSelect.append(o);
  }
  const p=new URLSearchParams(location.search),req=p.get('negocio'),saved=localStorage.getItem('impulso_negocio_activo'),pick=id=>m.find(x=>String(x.negocio_id)===String(id)),mem=pick(req)||pick(saved)||m[0],b=S.businesses.get(String(mem.negocio_id));
  if(!b)throw new Error('No pudimos resolver la empresa seleccionada.');
  setTenantUi(mem,b);
  return{session,b}
}
async function switchTenant(id){
  const mem=S.memberships.find(x=>String(x.negocio_id)===String(id)),b=S.businesses.get(String(id));
  if(!mem||!b){toast('Esa empresa no está autorizada para tu usuario.',true);E.tenantSelect.value=String(S.bid);return}
  if(String(mem.negocio_id)===String(S.bid))return;
  E.tenantSelect.disabled=true;
  if(chan){await sb.removeChannel(chan);chan=null}
  S.convs=[];S.contacts=new Map();S.msgs=new Map();S.brain=new Map();S.selected=null;
  E.search.value='';E.filter.value='todas';
  setTenantUi(mem,b);
  E.count.textContent='Cargando…';
  E.list.replaceChildren(node('div','empty',`Cargando conversaciones de ${b.nombre}…`));
  clearView(`Cargando conversaciones de ${b.nombre}…`);
  try{
    await load(true);
    await realtime(S.session);
    toast(`Empresa activa: ${b.nombre}`);
  }catch(e){
    console.error(e);
    toast(e.message||'No se pudo cambiar de empresa.',true);
    E.count.textContent='Error al cargar';
  }finally{E.tenantSelect.disabled=false}
}
async function load(first=false){const{data:c,error}=await sb.from('conversaciones').select('id,contacto_id,estado,asignado_a,automatizacion_pausada,handoff_motivo,ultimo_mensaje_at').eq('negocio_id',S.bid).order('ultimo_mensaje_at',{ascending:false,nullsFirst:false});if(error)throw error;S.convs=c||[];S.contacts=new Map;S.msgs=new Map;S.brain=new Map;const cids=[...new Set(S.convs.map(x=>x.contacto_id).filter(Boolean))];if(cids.length){const{data,error}=await sb.from('contactos').select('id,nombre,telefono_e164,email,etiquetas,notas').eq('negocio_id',S.bid).in('id',cids);if(error)throw error;S.contacts=new Map((data||[]).map(x=>[x.id,x]))}const ids=S.convs.map(x=>x.id);if(ids.length){const{data,error}=await sb.from('mensajes').select('id,conversacion_id,direccion,tipo,contenido,estado,fecha_mensaje,created_at').eq('negocio_id',S.bid).in('conversacion_id',ids).order('fecha_mensaje',{ascending:true,nullsFirst:false}).limit(500);if(error)throw error;for(const m of data||[]){if(!S.msgs.has(m.conversacion_id))S.msgs.set(m.conversacion_id,[]);S.msgs.get(m.conversacion_id).push(m)}}if(ids.length){const{data:ctxRows,error:ctxErr}=await sb.from('conversacion_contexto').select('conversacion_id,checkpoint_version,etapa_actual,etapa_recomendada,subetapa_actual,intencion_actual,datos_extraidos,datos_pendientes,resumen_ia,ultimo_evento,accion_recomendada,confianza_ia,requiere_revision_humana,updated_at').eq('negocio_id',S.bid).in('conversacion_id',ids);if(ctxErr)throw ctxErr;S.brain=new Map((ctxRows||[]).map(x=>[x.conversacion_id,x]))}apply(first)}
function latestMessage(c){const ms=S.msgs.get(c.id)||[];return ms.at(-1)||null}
function needsAttention(c){
 const x=S.brain.get(c.id),last=latestMessage(c);
 const review=x?.requiere_revision_humana===true;
 const waitingAssign=c.estado==='abierta'&&c.automatizacion_pausada===true&&!c.asignado_a;
 const waitingMine=c.estado==='abierta'&&c.automatizacion_pausada===true&&c.asignado_a===S.uid&&last?.direccion==='entrante';
 return Boolean(review||waitingAssign||waitingMine)
}
function attentionReason(c){
 const x=S.brain.get(c.id),last=latestMessage(c);
 if(c.automatizacion_pausada===true&&!c.asignado_a)return'Pendiente de asignar y responder';
 if(c.automatizacion_pausada===true&&c.asignado_a===S.uid&&last?.direccion==='entrante')return'Tienes una respuesta pendiente';
 if(x?.requiere_revision_humana===true)return'Requiere revisión humana';
 return'Pendiente'
}
function renderNotifications(){
 const pending=S.convs.filter(needsAttention);
 E.notifyBadge.hidden=!pending.length;E.notifyBadge.textContent=String(Math.min(pending.length,99));
 E.notifyBtn.classList.toggle('has-pending',pending.length>0);
 E.notifyList.replaceChildren();
 if(!pending.length){E.notifyList.append(node('div','notify-empty','No tienes pendientes críticos.'));return}
 for(const c of pending){
  const u=S.contacts.get(c.contacto_id)||{},b=node('button','notify-item');b.type='button';
  b.append(node('b','',text(u.nombre,text(u.telefono_e164,'Contacto'))),node('span','',attentionReason(c)));
  b.onclick=()=>{E.notifyMenu.hidden=true;select(c.id)};E.notifyList.append(b)
 }
}
E.notifyBtn.onclick=e=>{e.stopPropagation();E.notifyMenu.hidden=!E.notifyMenu.hidden};
document.addEventListener('click',e=>{if(!E.notifyMenu.hidden&&!e.target.closest('.notify-wrap'))E.notifyMenu.hidden=true});
function visible(){const q=E.search.value.trim().toLowerCase(),f=E.filter.value;return S.convs.filter(c=>{if(f!=='todas'&&c.estado!==f)return false;if(!q)return true;const u=S.contacts.get(c.contacto_id)||{},ms=S.msgs.get(c.id)||[],last=ms.at(-1);return[u.nombre,u.telefono_e164,u.email,...(Array.isArray(u.etiquetas)?u.etiquetas:[]),last?.contenido,c.handoff_motivo].filter(Boolean).join(' ').toLowerCase().includes(q)})}
function apply(first=false){renderNotifications();const v=visible();renderList(v);if(!S.convs.length)return clearView('Esta empresa todavía no tiene conversaciones. Puedes cambiar de empresa arriba.');if(!v.length)return clearView('No hay conversaciones con estos filtros.');if(first||!v.some(x=>x.id===S.selected))select(v[0].id);else select(S.selected)}
function renderList(v){E.list.replaceChildren();E.count.textContent=`${v.length} de ${S.convs.length} conversación${S.convs.length===1?'':'es'} de esta empresa`;if(!v.length){E.list.append(node('div','empty',S.convs.length?'No hay resultados con estos filtros.':'Esta empresa todavía no tiene conversaciones. Cambia de empresa arriba para ver otra bandeja.'));return}for(const c of v){const u=S.contacts.get(c.contacto_id)||{},ms=S.msgs.get(c.id)||[],last=ms.at(-1),b=node('button','conv');b.type='button';b.dataset.id=c.id;b.classList.toggle('active',c.id===S.selected);b.classList.toggle('needs-attention',needsAttention(c));const top=node('div','row');top.append(node('span','name',text(u.nombre,text(u.telefono_e164,'Contacto'))),node('span','time',fmt(c.ultimo_mensaje_at||last?.fecha_mensaje)));const pills=node('div','pills');pills.append(node('span','pill ok',text(c.estado,'sin estado')));if(c.asignado_a===S.uid)pills.append(node('span','pill','Asignada a mí'));else if(c.asignado_a)pills.append(node('span','pill','Asignada'));pills.append(node('span',`pill ${c.automatizacion_pausada?'warn':'ok'}`,c.automatizacion_pausada?'Bot pausado':'Bot activo'));b.append(top,node('div','preview',text(last?.contenido,last?.tipo?`[${last.tipo}]`:'Sin mensajes')),pills);b.onclick=()=>select(c.id);E.list.append(b)}}
function select(id){S.selected=id;renderList(visible());const c=S.convs.find(x=>x.id===id);if(!c)return;const u=S.contacts.get(c.contacto_id)||{};E.title.textContent=text(u.nombre,text(u.telefono_e164,'Contacto'));E.sub.textContent=[text(u.telefono_e164,'Sin teléfono'),`estado: ${text(c.estado)}`,c.asignado_a===S.uid?'asignada a mí':c.asignado_a?'asignada':'sin asignar',c.automatizacion_pausada?'bot pausado':'bot activo'].join(' · ');E.state.value=c.estado;E.state.disabled=false;E.stateBtn.disabled=false;renderAssign(c);renderBot(c);renderMsgs(S.msgs.get(id)||[]);renderBrain(c);renderContact(u)}
function renderAssign(c){const mine=c.asignado_a===S.uid;E.assignLabel.textContent=mine?'Asignada a mí':c.asignado_a?'Asignada a otro usuario':'Sin asignar';E.assignBtn.textContent=mine?'Quitar asignación':'Asignarme';E.assignBtn.disabled=Boolean(c.asignado_a&&!mine)}function renderBot(c){const paused=!!c.automatizacion_pausada;E.botLabel.textContent=paused?'Bot pausado':'Bot activo';E.botBtn.hidden=!(paused&&!c.asignado_a);E.botBtn.disabled=c.estado!=='abierta'}
function humanText(v,f='—'){const s=String(v??'').trim();return s||f}
function brainInterest(x){const d=x?.datos_extraidos&&typeof x.datos_extraidos==='object'?x.datos_extraidos:{};return humanText(d.procedimiento_interes||d.servicio_interes||d.interes||d.procedimiento,'No identificado')}
function actionText(a){if(!a||typeof a!=='object')return'—';const type=humanText(a.type,'SIN_ACCION').replaceAll('_',' '),reason=humanText(a.reason,'');return reason?type+' · '+reason:type}
function renderBrain(c){
 const x=S.brain.get(c.id);E.brain.replaceChildren();E.brain.className=x?'brain-card':'brain-empty';
 if(!x){E.brain.textContent='Aún no hay análisis estructurado para esta conversación.'}
 else{
  const item=(lab,val)=>{const d=node('div','brain-item'),b=node('b','',lab),s=node('span','',humanText(val));d.append(b,s);E.brain.append(d)};
  item('Interés',brainInterest(x));item('Etapa',x.etapa_actual);item('Intención',x.intencion_actual);item('Último evento',x.ultimo_evento);item('Importante',x.resumen_ia);item('Pendiente',Array.isArray(x.datos_pendientes)&&x.datos_pendientes.length?x.datos_pendientes.join(' · '):'Nada registrado');item('Siguiente acción',actionText(x.accion_recomendada));
  if(x.etapa_recomendada&&x.etapa_recomendada!==x.etapa_actual)item('Etapa sugerida',x.etapa_recomendada);
  if(x.requiere_revision_humana===true)E.brain.append(node('span','brain-flag','REQUIERE REVISIÓN HUMANA'));
 }
 const mine=c.asignado_a===S.uid,paused=!!c.automatizacion_pausada;
 E.takeControl.hidden=mine;E.takeControl.disabled=c.estado!=='abierta'||Boolean(c.asignado_a&&!mine);
 E.takeControl.classList.toggle('needs-attention',!mine&&needsAttention(c)&&!E.takeControl.disabled);
 E.takeControl.textContent=!mine&&needsAttention(c)&&!E.takeControl.disabled?'✋ ATENDER AHORA':'✋ Tomar control';
 const existingStrip=E.brain.parentElement?.querySelector('.pending-strip');if(existingStrip)existingStrip.remove();
 if(!mine&&needsAttention(c)){const strip=node('div','pending-strip',attentionReason(c));E.brain.parentElement?.insertBefore(strip,E.brain.nextSibling)}
 E.releaseControl.hidden=!mine;E.releaseControl.disabled=c.estado!=='abierta';
 E.manualComposer.hidden=!(mine&&paused&&c.estado==='abierta');
}
async function controlConversation(action){
 const c=S.convs.find(x=>x.id===S.selected);if(!c)return;
 const btn=action==='tomar'?E.takeControl:E.releaseControl;btn.disabled=true;
 try{
  const{data,error}=await sb.functions.invoke('handoff-control',{body:{action,conversacion_id:c.id}});if(error)throw error;
  if(!data?.ok||!data?.conversacion)throw new Error(data?.error||'No se pudo cambiar el control.');
  const n={...c,...data.conversacion};S.convs[S.convs.findIndex(x=>x.id===c.id)]=n;apply();toast(action==='tomar'?'Control humano activado.':'Control humano liberado; el bot sigue pausado hasta reactivarlo.');
 }catch(e){toast(e?.message||'No se pudo cambiar el control.',true)}
 finally{const x=S.convs.find(v=>v.id===S.selected);if(x)renderBrain(x)}
}
E.takeControl.onclick=()=>controlConversation('tomar');
E.releaseControl.onclick=()=>controlConversation('liberar');
E.manualSend.onclick=async()=>{
 const c=S.convs.find(x=>x.id===S.selected);if(!c)return;const texto=E.manualText.value.trim();if(!texto)return toast('Escribe una respuesta.',true);
 E.manualSend.disabled=true;const old=E.manualSend.textContent;E.manualSend.textContent='Enviando…';
 try{
  const{data,error}=await sb.functions.invoke('whatsapp-send',{body:{conversacion_id:c.id,texto,modo_manual_humano:true}});if(error)throw error;
  if(!data?.ok)throw new Error(data?.error||'No se pudo enviar.');
  E.manualText.value='';toast('Respuesta enviada por WhatsApp.');schedule();
 }catch(e){toast(e?.message||'No se pudo enviar la respuesta.',true)}
 finally{E.manualSend.disabled=false;E.manualSend.textContent=old}
}
function renderMsgs(ms){E.messages.replaceChildren();if(!ms.length){E.messages.append(node('div','empty','Sin mensajes visibles.'));return}for(const m of ms){const a=node('article',`msg ${m.direccion==='saliente'?'out':''}`);a.append(node('div','body',text(m.contenido,m.tipo?`[${m.tipo}]`:'Mensaje sin texto')),node('div','meta',`${text(m.direccion)} · ${text(m.estado)} · ${fmt(m.fecha_mensaje||m.created_at)}`));E.messages.append(a)}requestAnimationFrame(()=>E.messages.scrollTop=E.messages.scrollHeight)}
function renderContact(u){if(!u?.id){E.contact.className='empty';E.contact.textContent='Contacto no disponible.';return}E.contact.className='form';E.contact.replaceChildren();const field=(lab,val,type='text',cls='')=>{const d=node('div',`field ${cls}`),l=node('label','',lab),i=node(type==='textarea'?'textarea':'input','editor');if(type!=='textarea')i.type=type;i.value=val||'';d.append(l,i);E.contact.append(d);return i},name=field('Nombre',u.nombre),phone=node('div','field'),pl=node('label','','Teléfono WhatsApp'),pv=node('div','readonly',text(u.telefono_e164,'No registrado'));phone.append(pl,pv);E.contact.append(phone);const email=field('Email',u.email,'email'),tags=field('Etiquetas',Array.isArray(u.etiquetas)?u.etiquetas.join(', '):''),notes=field('Notas',u.notas||'','textarea','notes'),wrap=node('div','save-wrap'),save=node('button','btn','Guardar ficha');wrap.append(save);E.contact.append(wrap);save.onclick=async()=>{if(email.value.trim()&&!email.checkValidity())return toast('El email no tiene un formato válido.',true);save.disabled=true;try{const payload={nombre:name.value.trim()||null,email:email.value.trim()||null,etiquetas:[...new Set(tags.value.split(',').map(x=>x.trim()).filter(Boolean))],notas:notes.value.trim()||null},{data,error}=await sb.from('contactos').update(payload).eq('negocio_id',S.bid).eq('id',u.id).select('id,nombre,telefono_e164,email,etiquetas,notas').single();if(error)throw error;S.contacts.set(data.id,data);apply();toast('Ficha actualizada.')}catch(e){toast(e.message||'No se pudo actualizar la ficha.',true)}finally{save.disabled=false}}}
function clearView(msg){S.selected=null;E.title.textContent='Sin resultados';E.sub.textContent=msg;E.messages.replaceChildren(node('div','empty',msg));E.contact.className='empty';E.contact.textContent='No hay contacto seleccionado.';E.brain.className='brain-empty';E.brain.textContent='No hay conversación seleccionada.';E.takeControl.disabled=true;E.releaseControl.hidden=true;E.manualComposer.hidden=true;E.state.disabled=E.stateBtn.disabled=E.assignBtn.disabled=true;E.botBtn.hidden=true;E.assignLabel.textContent='Sin conversación';E.botLabel.textContent='Bot: —'}
E.stateBtn.onclick=async()=>{const c=S.convs.find(x=>x.id===S.selected);if(!c)return;const n=E.state.value;if(!['abierta','cerrada','archivada'].includes(n))return toast('Estado no permitido.',true);E.stateBtn.disabled=true;try{const{data,error}=await sb.from('conversaciones').update({estado:n}).eq('negocio_id',S.bid).eq('id',c.id).select('id,contacto_id,estado,asignado_a,automatizacion_pausada,handoff_motivo,ultimo_mensaje_at').single();if(error)throw error;S.convs[S.convs.findIndex(x=>x.id===data.id)]=data;apply();toast('Estado actualizado.')}catch(e){toast(e.message||'No se pudo actualizar.',true)}finally{E.stateBtn.disabled=false}};
E.assignBtn.onclick=async()=>{const c=S.convs.find(x=>x.id===S.selected);if(!c)return;if(c.asignado_a&&c.asignado_a!==S.uid)return toast('Ya está asignada a otro usuario.',true);const n=c.asignado_a===S.uid?null:S.uid;E.assignBtn.disabled=true;try{const{data,error}=await sb.from('conversaciones').update({asignado_a:n}).eq('negocio_id',S.bid).eq('id',c.id).select('id,contacto_id,estado,asignado_a,automatizacion_pausada,handoff_motivo,ultimo_mensaje_at').single();if(error)throw error;S.convs[S.convs.findIndex(x=>x.id===data.id)]=data;apply();toast(n?'Conversación asignada a ti.':'Asignación removida.')}catch(e){toast(e.message||'No se pudo cambiar la asignación.',true)}finally{const x=S.convs.find(v=>v.id===S.selected);if(x)renderAssign(x)}};
async function functionError(e){try{if(e?.context&&typeof e.context.json==='function'){const b=await e.context.json();return b?.error||b?.message||e.message}}catch{}return e?.message||'No se pudo reactivar el bot.'}E.botBtn.onclick=async()=>{const c=S.convs.find(x=>x.id===S.selected);if(!c)return;if(c.asignado_a)return toast('Primero libera la asignación humana.',true);if(c.estado!=='abierta')return toast('La conversación debe estar abierta.',true);E.botBtn.disabled=true;try{const{data,error}=await sb.functions.invoke('handoff-control',{body:{action:'reactivar',conversacion_id:c.id}});if(error)throw error;if(!data?.ok||!data?.conversacion)throw new Error(data?.error||'Respuesta inválida.');const n={...c,...data.conversacion};S.convs[S.convs.findIndex(x=>x.id===c.id)]=n;apply();toast('Bot reactivado.')}catch(e){toast(await functionError(e),true)}finally{const x=S.convs.find(v=>v.id===S.selected);if(x)renderBot(x)}};
function schedule(){clearTimeout(timer);timer=setTimeout(refresh,180)}async function refresh(){if(busy){queued=true;return}busy=true;try{await load(false)}catch(e){console.error(e);toast('No se pudo sincronizar en tiempo real.',true)}finally{busy=false;if(queued){queued=false;schedule()}}}async function realtime(session){if(chan)await sb.removeChannel(chan);if(session?.access_token)await sb.realtime.setAuth(session.access_token);const f=`negocio_id=eq.${S.bid}`;chan=sb.channel(`crm-${S.bid}`).on('postgres_changes',{event:'*',schema:'public',table:'mensajes',filter:f},schedule).on('postgres_changes',{event:'*',schema:'public',table:'conversaciones',filter:f},schedule).on('postgres_changes',{event:'*',schema:'public',table:'contactos',filter:f},schedule).on('postgres_changes',{event:'*',schema:'public',table:'conversacion_contexto',filter:f},schedule).subscribe(s=>{if(s==='SUBSCRIBED')toast('CRM en tiempo real activo.')})}
E.tenantSelect.onchange=()=>switchTenant(E.tenantSelect.value);E.search.oninput=()=>apply();E.filter.onchange=()=>apply();E.logout.onclick=async()=>{if(chan)await sb.removeChannel(chan);await sb.auth.signOut();localStorage.removeItem('impulso_negocio_activo');location.replace('./crm-login.html')};document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});sb.auth.onAuthStateChange(async(e,s)=>{if(e==='TOKEN_REFRESHED'&&s?.access_token)await sb.realtime.setAuth(s.access_token)});
try{const t=await tenant();if(t){await load(true);await realtime(t.session)}}catch(e){console.error(e);toast(e.message||'No se pudo cargar el CRM.',true);E.count.textContent='Error al cargar'}
