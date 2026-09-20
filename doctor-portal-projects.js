/* Project identity + persistent private access. The rich recording UX stays owned by doctor-portal-ux7.js. */
(()=>{
  'use strict';
  const ACCESS_KEY='do_portal_access_v1';
  try{
    const u=new URL(location.href),incoming=u.searchParams.get('token'),saved=localStorage.getItem(ACCESS_KEY)||'';
    if(!incoming&&saved){u.searchParams.set('token',saved);location.replace(u.toString());return;}
    if(incoming){
      let tries=0;
      const remember=()=>{
        if(typeof P!=='undefined'&&P?.negocio){
          localStorage.setItem(ACCESS_KEY,incoming);
          u.searchParams.delete('token');
          history.replaceState(null,'',u.pathname+(u.searchParams.toString()?`?${u.searchParams}`:'')+u.hash);
          return;
        }
        if(++tries<50)setTimeout(remember,200);
      };
      setTimeout(remember,0);
    }
  }catch{}

  const M=window.RecordingModel;
  const oneStatus=(item)=>{
    const p=item?.pieza||{},recorded=item?.estado==='GRABADO'||p.estado==='RECORDED',ready=p?.production_status?.PRODUCTION_READY===true,inCalendar=Boolean(item?.calendar);
    if(recorded)return{text:'GRABADO',cls:'portal-status-recorded'};
    if(inCalendar&&ready)return{text:'EN CALENDARIO · LISTO PARA GRABAR',cls:'portal-status-ready'};
    if(inCalendar)return{text:'EN CALENDARIO · PREPARACIÓN PENDIENTE',cls:'portal-status-calendar'};
    if(ready)return{text:'FUERA DEL CALENDARIO · LISTO PARA GRABAR',cls:'portal-status-ready'};
    return{text:'FUERA DEL CALENDARIO · PREPARACIÓN PENDIENTE',cls:'portal-status-out'};
  };
  if(typeof renderVideos==='function'){
    const richRenderVideos=renderVideos;
    renderVideos=function(items){
      richRenderVideos(items);
      document.querySelectorAll('#videos .jsV').forEach((el,i)=>{
        const item=items[i],status=oneStatus(item),pill=el.querySelector('.pill'),cta=el.querySelector('.cta');
        if(pill){pill.className='pill portal-one-status '+status.cls;pill.textContent=status.text;}
        const ready=item?.pieza?.production_status?.PRODUCTION_READY===true||item?.pieza?.estado==='RECORDED'||item?.estado==='GRABADO';
        if(cta&&!ready)cta.textContent='Abrir proyecto';
        const label=window.DoctorPortalProjects?.labelFor?.(item)||M?.projectLabel?.(item?.pieza)||'';
        if(label&&!el.querySelector('.project-card-label')){
          const title=el.querySelector('h3'),tag=document.createElement('p');
          tag.className='project-card-label';tag.textContent=label;title?.before(tag);
        }
      });
    };
  }
})();

/* Service-first navigation for the Dr. Olano recording portal.
   Real sessions remain intact; this only changes how pending work is browsed. */
(()=>{
  'use strict';
  if(typeof renderRecord!=='function'||typeof api!=='function')return;

  const serviceOrder=['TOXINA BOTULÍNICA','PRP FACIAL','HYDRAFACIAL / LIMPIEZA CON APARATOLOGÍA','LIPOSUCCIÓN DE PAPADA','BICHECTOMÍA','RINOPLASTIA'];
  const serviceNames={
    'TOXINA BOTULÍNICA':'Toxina botulínica','PRP FACIAL':'PRP facial','HYDRAFACIAL / LIMPIEZA CON APARATOLOGÍA':'Limpieza / aparatología','LIPOSUCCIÓN DE PAPADA':'Liposucción de papada','BICHECTOMÍA':'Bichectomía','RINOPLASTIA':'Rinoplastia'
  };
  const cache={signature:'',all:[],groups:new Map(),loading:null};
  const isRecorded=x=>x?.estado==='GRABADO'||x?.pieza?.estado==='RECORDED';
  const keyOf=v=>String(v||'Sin servicio').trim().replace(/\s+/g,' ').toLocaleUpperCase('es-PE');
  const nameOf=k=>serviceNames[k]||String(k||'Servicio').toLocaleLowerCase('es-PE').replace(/(^|\s|\/\s*)\p{L}/gu,m=>m.toLocaleUpperCase('es-PE'));
  const projectNo=p=>{const visible=Number(p?.metadata?.web_display_number);if(Number.isFinite(visible)&&visible>0)return visible;const identity=Number(p?.metadata?.project_ref_v1?.project_number);return Number.isFinite(identity)&&identity>0?identity:null;};
  let displayIndex={scheduled:new Map(),legacy:new Map(),dates:new Map(),special:new Map(),scheduledRows:[],legacyRows:[]};
  const compactDate=date=>{if(!date)return'';const d=new Date(date+'T12:00:00');const parts=new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short'}).formatToParts(d),day=parts.find(x=>x.type==='day')?.value||'',mon=(parts.find(x=>x.type==='month')?.value||'').replace('.','').toUpperCase();return day&&mon?`${day} ${mon}`:'';};
  function buildDisplayIndex(all=[]){
    const scheduled=(P?.calendar_items||[]).filter(x=>x?.content_id&&x?.publish_date).map(x=>({...x,_kind:'scheduled'}));
    if(typeof captureGuide!=='undefined'&&captureGuide?.iso)scheduled.push({content_id:null,publish_date:captureGuide.iso,_kind:'capture',_special:'capture'});
    scheduled.sort((a,b)=>String(a.publish_date).localeCompare(String(b.publish_date))||String(a._kind).localeCompare(String(b._kind))||String(a.content_id||'').localeCompare(String(b.content_id||'')));
    const scheduledMap=new Map(),dates=new Map(),special=new Map();
    scheduled.forEach((row,i)=>{const code=String(i+1).padStart(3,'0');row._displayCode=code;if(row.content_id){scheduledMap.set(row.content_id,code);dates.set(row.content_id,row.publish_date);}if(row._special)special.set(row._special,code);});
    const scheduledIds=new Set(scheduledMap.keys()),unique=new Map();
    for(const item of all||[]){const id=item?.pieza?.id;if(id&&!scheduledIds.has(id)&&!unique.has(id))unique.set(id,item);}
    const legacyRows=[...unique.values()].sort((a,b)=>{const an=Number(a?.pieza?.metadata?.project_ref_v1?.project_number)||999999,bn=Number(b?.pieza?.metadata?.project_ref_v1?.project_number)||999999;if(an!==bn)return an-bn;return pt(a?.pieza).localeCompare(pt(b?.pieza),'es');});
    const legacy=new Map();legacyRows.forEach((item,i)=>legacy.set(item.pieza.id,`A${i+1}`));
    displayIndex={scheduled:scheduledMap,legacy,dates,special,scheduledRows:scheduled,legacyRows};
    return displayIndex;
  }
  const displayCode=item=>{const id=item?.pieza?.id;return id?(displayIndex.scheduled.get(id)||displayIndex.legacy.get(id)||''):'';};
  const labelFor=item=>{const id=item?.pieza?.id;if(!id)return'';const scheduled=displayIndex.scheduled.get(id);if(scheduled)return`PROYECTO ${scheduled}${displayIndex.dates.get(id)?' · '+compactDate(displayIndex.dates.get(id)):''}`;const legacy=displayIndex.legacy.get(id);if(legacy)return`PROYECTO ${legacy} · SEMANA PREVIA`;return M?.projectLabel?.(item?.pieza)||'';};
  const projectSort=(a,b)=>{const ac=displayCode(a),bc=displayCode(b),rank=c=>/^A\d+$/.test(c)?-1000+Number(c.slice(1)):Number(c)||99999,ar=rank(ac),br=rank(bc);if(ar!==br)return ar-br;const an=projectNo(a?.pieza),bn=projectNo(b?.pieza);if(an&&bn&&an!==bn)return an-bn;return pt(a?.pieza).localeCompare(pt(b?.pieza),'es');};
  const sig=()=>active().map(s=>`${s.id}:${s.recorded||0}:${s.total||0}`).sort().join('|')+'|'+(P?.calendar_items||[]).map(x=>`${x.content_id}:${x.publish_date}:${x.slot_status}`).sort().join('|');
  const invalidate=()=>{cache.signature='';cache.all=[];cache.groups=new Map();cache.loading=null;};

  async function loadItems(force=false){
    const s=sig();
    if(!force&&cache.signature===s&&cache.groups.size)return cache;
    if(!force&&cache.loading)return cache.loading;
    cache.loading=(async()=>{
      const sessions=active();
      if(!sessions.length){cache.signature=s;cache.all=[];cache.groups=new Map();cache.loading=null;return cache;}
      const details=await Promise.all(sessions.map(async session=>{const data=await api('session_get',{session_id:session.id});return{session:data.session,items:data.items||[]};}));
      const calendarMap=new Map((P?.calendar_items||[]).map(x=>[x.content_id,x]));
      const all=details.flatMap(d=>(d.items||[]).map(item=>({...item,calendar:calendarMap.get(item?.pieza?.id)||null,_session:d.session})));
      buildDisplayIndex(all);
      all.sort(projectSort);
      const groups=new Map();
      for(const item of all){const key=keyOf(item?.pieza?.servicio);if(!groups.has(key))groups.set(key,{key,name:nameOf(key),items:[]});groups.get(key).items.push(item);}
      cache.signature=s;cache.all=all;cache.groups=groups;cache.loading=null;return cache;
    })().catch(e=>{cache.loading=null;throw e;});
    return cache.loading;
  }
  function ordered(groups){return[...groups.values()].sort((a,b)=>{const ai=serviceOrder.indexOf(a.key),bi=serviceOrder.indexOf(b.key);if(ai>=0||bi>=0){if(ai<0)return 1;if(bi<0)return-1;if(ai!==bi)return ai-bi;}return a.name.localeCompare(b.name,'es');});}
  const captureGuide={
    projectNumber:6,
    key:'MARCA-01',
    iso:'2026-09-26',
    date:'26 SEP',
    title:'Detrás de cámaras',
    subtitle:'Lo que no se ve antes de recibir a una persona',
    steps:[
      ['1','Llegada / inicio','3–4 s','Entrar, abrir el consultorio o empezar la jornada de forma natural.'],
      ['2','Preparar el ambiente','3–4 s','Ordenar, encender luz o acomodar el espacio SOLO si realmente lo hacen.'],
      ['3','Organizar material','2–4 s','Grabar manos/equipo preparando algo que sí usan antes de atender.'],
      ['4','Revisar agenda','3 s','Desde atrás o de lado. Ningún nombre, teléfono, chat o dato visible.'],
      ['5','Detalle de manos','2–3 s','Una acción real y simple para dar ritmo: acomodar, tomar, ordenar.'],
      ['6','Dr. Olano + equipo','4 s','Coordinar algo real. No actuar una conversación para la cámara.'],
      ['7','Consultorio listo','3 s','Plano limpio del ambiente preparado, sin pacientes identificables.'],
      ['8','Cierre humano','3–4 s','Caminar, sonreír o iniciar la jornada de forma natural.']
    ]
  };
  function captureCard(){
    return `<article class="card service-category capture-special jsCapture" tabindex="0" role="button" aria-label="Abrir guía de humanización"><div class="service-card-top"><div><div class="service-eyebrow">PROYECTO ${String(captureGuide.projectNumber).padStart(3,'0')} · HUMANIZACIÓN · ${captureGuide.key}</div><h3>${captureGuide.title}</h3><p>1 grabación especial pendiente</p></div><span class="service-arrow">${ic('right')}</span></div><div class="capture-special-status"><b>${captureGuide.date}</b><span>GRABAR 6–10 CLIPS</span></div><div class="service-card-foot"><span>Sin texto para memorizar</span><span>Guía paso a paso</span></div></article>`;
  }
  function openCaptureGuide(from='record'){
    backTab=from;
    S={_captureGuide:true,_calendarDirect:from==='calendar',session:{id:null,nombre:'Humanización',fecha:'2026-09-26',lugar:null,notas:null},items:[]};
    tab('record');$('rhome').style.display='none';$('vdetail').style.display='none';$('sdetail').style.display='block';
    $('sbacktxt').textContent='Volver a servicios';
    $('shero').innerHTML=`<div class="card detail capture-hero"><div class="date">PROYECTO ${String(captureGuide.projectNumber).padStart(3,'0')} · ${captureGuide.date} · HUMANIZACIÓN</div><h2>${captureGuide.subtitle}</h2><p class="capture-lead">Hoy no tienen que aprender un guion. Solo graben estas acciones reales, una por una.</p><div class="capture-badge">6–10 clips · vertical 9:16 · 2–4 s cada uno</div></div>`;
    $('setup').innerHTML=`<div class="card setup capture-start"><div class="capture-start-icon">${ic('cam')}</div><div><b>Antes de empezar</b><p><strong>NO HAY TEXTO PARA MEMORIZAR.</strong> Repitan cada toma 2 veces. Cámara quieta, sin zoom. Dejen 1–2 s antes y 2 s después de cada acción.</p></div></div>`;
    $('videos').className='capture-guide';
    $('videos').innerHTML=`<div class="capture-guide-title"><div><span>PASO A PASO</span><h3>Graben estas 8 escenas</h3></div><small>Si una acción no ocurre de verdad, sáltenla.</small></div>`+
      captureGuide.steps.map(s=>`<article class="card capture-step"><div class="capture-num">${s[0]}</div><div class="capture-step-copy"><div class="capture-step-top"><h3>${s[1]}</h3><span>${s[2]}</span></div><p>${s[3]}</p></div></article>`).join('')+
      `<div class="card capture-stop"><b>⛔ NO GRABAR</b><p>Pacientes identificables · nombres · teléfonos · historias clínicas · chats · agenda legible · escenas médicas fingidas.</p></div><div class="card capture-done"><b>✅ TERMINAN CUANDO</b><p>Tengan mínimo 6 clips útiles + una aparición real de Dr. Olano o del equipo + cero datos sensibles.</p><small>Después se revisa el material real y recién se cierra el guion narrativo.</small></div>`;
    scrollTo(0,0);
  }
  function renderServices(groups){
    const host=$('sessions'),list=ordered(groups);host.className='service-grid';
    host.innerHTML=list.length?list.map(g=>{const total=g.items.length,recorded=g.items.filter(isRecorded).length,pending=total-recorded,pc=total?Math.round(recorded/total*100):0;return`<article class="card service-category jsService" data-service="${esc(g.key)}" tabindex="0" role="button" aria-label="Abrir ${esc(g.name)}"><div class="service-card-top"><div><div class="service-eyebrow">SERVICIO</div><h3>${esc(g.name)}</h3><p>${pending} ${pending===1?'proyecto pendiente':'proyectos pendientes'}</p></div><span class="service-arrow">${ic('right')}</span></div><div class="service-card-foot"><span>${recorded}/${total} grabados</span><span>${total} ${total===1?'proyecto':'proyectos'}</span></div><div class="prog"><span style="width:${pc}%"></span></div></article>`;}).join(''):'<div class="card empty"><b>No tienes proyectos pendientes de grabación.</b><br>Cuando exista contenido de producción, aparecerá dentro de su servicio con una etiqueta de estado.</div>';
    host.insertAdjacentHTML('beforeend',captureCard());
    host.querySelectorAll('.jsService').forEach(el=>{const open=()=>openService(el.dataset.service);el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});
    host.querySelectorAll('.jsCapture').forEach(el=>{const open=()=>openCaptureGuide();el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});
  }

  const oldRenderRecord=renderRecord;
  renderRecord=async function(){
    const hero=D.querySelector('#rhome .hero p'),h=D.querySelector('#rhome .sec h2'),p=D.querySelector('#rhome .sec p');
    if(hero)hero.textContent='Elige un servicio y abre cualquier proyecto. Una sola etiqueta indica si está en calendario y qué le falta antes de grabar.';
    if(h)h.textContent='Servicios para grabar';if(p)p.textContent='Entra a un servicio para ver todos los proyectos de producción y su estado real.';
    const pending0=active().reduce((n,s)=>n+Math.max(0,(s.total||0)-(s.recorded||0)),0),recorded0=active().reduce((n,s)=>n+(s.recorded||0),0);
    $('sum').innerHTML=`<div class="metric"><b>${ic('cam')}${pending0}</b><span>videos pendientes</span></div><div class="metric"><b>${ic('check')}${recorded0}</b><span>grabados en sesiones activas</span></div>`;
    $('sessions').className='service-grid';$('sessions').innerHTML='<div class="card empty service-loading">Organizando proyectos por servicio…</div>';
    try{const data=await loadItems(),recorded=data.all.filter(isRecorded).length,pending=data.all.length-recorded;$('sum').innerHTML=`<div class="metric"><b>${ic('cam')}${pending}</b><span>videos pendientes</span></div><div class="metric"><b>${ic('check')}${recorded}</b><span>grabados en sesiones activas</span></div>`;renderServices(data.groups);}catch(e){console.error('No se pudo organizar por servicio',e);$('sessions').className='service-grid';$('sessions').innerHTML=`<div class="card empty service-loading"><b>No se pudieron cargar los proyectos por servicio.</b><br>${esc(e?.message||'Error de carga')}</div>`;}
  };

  async function openService(key){
    try{const data=await loadItems(),g=data.groups.get(key);if(!g||!g.items.length){resetViews();tab('record');return;}backTab='record';S={_serviceKey:key,session:{id:null,nombre:g.name,fecha:null,lugar:null,notas:null},items:g.items};tab('record');$('rhome').style.display='none';$('vdetail').style.display='none';$('sdetail').style.display='block';$('sbacktxt').textContent='Volver a servicios';$('vback').innerHTML=`${ic('left')}Volver al servicio`;const total=g.items.length,recorded=g.items.filter(isRecorded).length,pc=total?Math.round(recorded/total*100):0;$('shero').innerHTML=`<div class="card detail service-detail"><div class="date">SERVICIO</div><h2>${esc(g.name)}</h2><div class="service-detail-copy">Elige el proyecto que vas a grabar.</div><div class="prog"><span style="width:${pc}%"></span></div><small>${recorded} de ${total} videos grabados</small></div>`;$('setup').innerHTML=`<div class="card setup service-setup"><b>Proyectos de ${esc(g.name)}</b><br>Cada tarjeta conserva el proyecto. La etiqueta indica si está en calendario, si sigue en preparación o si ya puede grabarse.</div>`;$('videos').className='vgrid';renderVideos(g.items);scrollTo(0,0);}catch(e){err(e.message)}
  }

  async function calendarItem(contentId){
    const data=await loadItems();
    const found=data.all.find(x=>x?.pieza?.id===contentId);
    if(found)return found;
    const extra=await api('piece_get',{content_id:contentId});
    return extra?.item||null;
  }
  async function openCalendarItem(contentId){
    try{
      const item=await calendarItem(contentId);
      if(!item){err('No se pudo abrir este proyecto.');return false;}
      backTab='calendar';
      S={_calendarDirect:true,session:item._session||{id:null,nombre:'Calendario',fecha:null,lugar:null,notas:null},items:[item]};
      tab('record');
      $('rhome').style.display='none';
      $('sdetail').style.display='none';
      $('vdetail').style.display='block';
      $('vback').innerHTML=`${ic('left')}Volver al calendario`;
      openVideo(0);
      scrollTo(0,0);
      return true;
    }catch(e){err(e?.message||'No se pudo abrir este proyecto.');return false;}
  }
  async function markCalendarRecorded(item){
    if(!item)return{ok:false,message:'Proyecto no disponible.'};
    if(item.estado==='GRABADO'||item?.pieza?.estado==='RECORDED'||item?.pieza?.production_status?.RECORDED===true||item?.pieza?.estado==='PUBLISHED')return{ok:true,already:true};
    if(!item.session_piece_id)return{ok:false,message:'Este proyecto todavía no está vinculado a una sesión de grabación.'};
    try{
      await api('mark_piece',{session_piece_id:item.session_piece_id,estado:'GRABADO'});
      P=await api('portal_get');
      invalidate();
      await loadItems(true);
      return{ok:true};
    }catch(e){return{ok:false,message:e?.message||'No se pudo marcar como grabado.'};}
  }
  function openCalendarSpecial(kind){
    if(kind==='capture'){openCaptureGuide('calendar');return true;}
    return false;
  }

  const oldSBack=$('sback').onclick;$('sback').onclick=()=>{if(S?._captureGuide||S?._serviceKey){const target=S?._calendarDirect?'calendar':'record';S=null;$('videos').className='vgrid';resetViews();tab(target);if(target==='calendar'&&typeof renderCal==='function')renderCal();return;}if(typeof oldSBack==='function')oldSBack();};
  const oldOpenSession=openSession;openSession=async function(id,from='record'){$('vback').innerHTML=`${ic('left')}Volver a la sesión`;return oldOpenSession(id,from);};
  const oldOpenVideo=openVideo;openVideo=function(i){oldOpenVideo(i);const item=Item,legacyRecorded=item?.pieza?.estado==='RECORDED'||item?.pieza?.production_status?.RECORDED===true||item?.pieza?.estado==='PUBLISHED',ready=item?.pieza?.production_status?.PRODUCTION_READY===true||legacyRecorded||item?.estado==='GRABADO',btn=$('recb');if(btn&&!ready){btn.disabled=true;btn.innerHTML='Preparación pendiente';btn.title='Producción todavía no ha dejado esta pieza lista para grabar.';}else if(btn&&legacyRecorded&&item?.estado!=='GRABADO'){btn.innerHTML='Confirmar grabado';btn.title='La pieza ya consta como grabada; este botón sincroniza el estado de la sesión.';}if(S?._calendarDirect){$('vback').innerHTML=`${ic('left')}Volver al calendario`;}};
  const oldToggleRec=toggleRec;toggleRec=async function(x){if(S?._calendarDirect){const result=await markCalendarRecorded(x);if(!result.ok)alert(result.message||'No se pudo marcar como grabado.');else if(typeof renderCal==='function')renderCal();return;}if(!S?._serviceKey)return oldToggleRec(x);const key=S._serviceKey;try{await api('mark_piece',{session_piece_id:x.session_piece_id,estado:x.estado==='GRABADO'?'PENDIENTE':'GRABADO'});P=await api('portal_get');invalidate();renderCal();renderHist();await renderRecord();const data=await loadItems();if(data.groups.has(key))await openService(key);else{S=null;resetViews();tab('record');}}catch(e){alert(e.message)}};

  const oldVBack=$('vback').onclick;
  $('vback').onclick=()=>{if(S?._calendarDirect){S=null;resetViews();tab('calendar');if(typeof renderCal==='function')renderCal();return;}if(typeof oldVBack==='function')oldVBack();};

  window.DoctorPortalProjects={loadItems,index:()=>displayIndex,labelFor,displayCode,buildDisplayIndex,openCalendarItem,markCalendarRecorded,openCalendarSpecial,calendarItem};
  window.DoctorPortalSpecials=[captureGuide];

  const wait=()=>{if(typeof P!=='undefined'&&P){renderRecord();return;}setTimeout(wait,120);};setTimeout(wait,0);
})();
