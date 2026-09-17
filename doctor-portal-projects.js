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
        const label=M?.projectLabel?.(item?.pieza)||'';
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
  const keyOf=v=>String(v||'Sin servicio').trim().replace(/\s+/g,' ').toLocaleUpperCase('es-PE');
  const nameOf=k=>serviceNames[k]||String(k||'Servicio').toLocaleLowerCase('es-PE').replace(/(^|\s|\/\s*)\p{L}/gu,m=>m.toLocaleUpperCase('es-PE'));
  const projectNo=p=>{const n=Number(p?.metadata?.project_ref_v1?.project_number);return Number.isFinite(n)&&n>0?n:null;};
  const projectSort=(a,b)=>{const an=projectNo(a?.pieza),bn=projectNo(b?.pieza);if(an&&bn&&an!==bn)return an-bn;if(an&&!bn)return-1;if(!an&&bn)return 1;return pt(a?.pieza).localeCompare(pt(b?.pieza),'es');};
  const sig=()=>active().map(s=>`${s.id}:${s.recorded||0}:${s.total||0}`).sort().join('|');
  const invalidate=()=>{cache.signature='';cache.all=[];cache.groups=new Map();cache.loading=null;};

  async function loadItems(force=false){
    const s=sig();
    if(!force&&cache.signature===s&&cache.groups.size)return cache;
    if(!force&&cache.loading)return cache.loading;
    cache.loading=(async()=>{
      const sessions=active();
      if(!sessions.length){cache.signature=s;cache.all=[];cache.groups=new Map();cache.loading=null;return cache;}
      const details=await Promise.all(sessions.map(async session=>{const data=await api('session_get',{session_id:session.id});return{session:data.session,items:data.items||[]};}));
      const all=details.flatMap(d=>(d.items||[]).map(item=>({...item,_session:d.session}))).sort(projectSort),groups=new Map();
      for(const item of all){const key=keyOf(item?.pieza?.servicio);if(!groups.has(key))groups.set(key,{key,name:nameOf(key),items:[]});groups.get(key).items.push(item);}
      cache.signature=s;cache.all=all;cache.groups=groups;cache.loading=null;return cache;
    })().catch(e=>{cache.loading=null;throw e;});
    return cache.loading;
  }
  function ordered(groups){return[...groups.values()].sort((a,b)=>{const ai=serviceOrder.indexOf(a.key),bi=serviceOrder.indexOf(b.key);if(ai>=0||bi>=0){if(ai<0)return 1;if(bi<0)return-1;if(ai!==bi)return ai-bi;}return a.name.localeCompare(b.name,'es');});}
  function renderServices(groups){
    const host=$('sessions'),list=ordered(groups);host.className='service-grid';
    host.innerHTML=list.length?list.map(g=>{const total=g.items.length,recorded=g.items.filter(x=>x.estado==='GRABADO').length,pending=total-recorded,pc=total?Math.round(recorded/total*100):0;return`<article class="card service-category jsService" data-service="${esc(g.key)}" tabindex="0" role="button" aria-label="Abrir ${esc(g.name)}"><div class="service-card-top"><div><div class="service-eyebrow">SERVICIO</div><h3>${esc(g.name)}</h3><p>${pending} ${pending===1?'proyecto pendiente':'proyectos pendientes'}</p></div><span class="service-arrow">${ic('right')}</span></div><div class="service-card-foot"><span>${recorded}/${total} grabados</span><span>${total} ${total===1?'proyecto':'proyectos'}</span></div><div class="prog"><span style="width:${pc}%"></span></div></article>`;}).join(''):'<div class="card empty"><b>No tienes proyectos pendientes de grabación.</b><br>Cuando exista contenido de producción, aparecerá dentro de su servicio con una etiqueta de estado.</div>';
    host.querySelectorAll('.jsService').forEach(el=>{const open=()=>openService(el.dataset.service);el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};});
  }

  const oldRenderRecord=renderRecord;
  renderRecord=async function(){
    const hero=D.querySelector('#rhome .hero p'),h=D.querySelector('#rhome .sec h2'),p=D.querySelector('#rhome .sec p');
    if(hero)hero.textContent='Elige un servicio y abre cualquier proyecto. Una sola etiqueta indica si está en calendario y qué le falta antes de grabar.';
    if(h)h.textContent='Servicios para grabar';if(p)p.textContent='Entra a un servicio para ver todos los proyectos de producción y su estado real.';
    const pending0=active().reduce((n,s)=>n+Math.max(0,(s.total||0)-(s.recorded||0)),0),recorded0=active().reduce((n,s)=>n+(s.recorded||0),0);
    $('sum').innerHTML=`<div class="metric"><b>${ic('cam')}${pending0}</b><span>videos pendientes</span></div><div class="metric"><b>${ic('check')}${recorded0}</b><span>grabados en sesiones activas</span></div>`;
    $('sessions').className='service-grid';$('sessions').innerHTML='<div class="card empty service-loading">Organizando proyectos por servicio…</div>';
    try{const data=await loadItems(),pending=data.all.filter(x=>x.estado!=='GRABADO').length,recorded=data.all.filter(x=>x.estado==='GRABADO').length;$('sum').innerHTML=`<div class="metric"><b>${ic('cam')}${pending}</b><span>videos pendientes</span></div><div class="metric"><b>${ic('check')}${recorded}</b><span>grabados en sesiones activas</span></div>`;renderServices(data.groups);}catch(e){console.warn('No se pudo agrupar por servicio',e);$('sessions').className='';oldRenderRecord();}
  };

  async function openService(key){
    try{const data=await loadItems(),g=data.groups.get(key);if(!g||!g.items.length){resetViews();tab('record');return;}backTab='record';S={_serviceKey:key,session:{id:null,nombre:g.name,fecha:null,lugar:null,notas:null},items:g.items};tab('record');$('rhome').style.display='none';$('vdetail').style.display='none';$('sdetail').style.display='block';$('sbacktxt').textContent='Volver a servicios';$('vback').innerHTML=`${ic('left')}Volver al servicio`;const total=g.items.length,recorded=g.items.filter(x=>x.estado==='GRABADO').length,pc=total?Math.round(recorded/total*100):0;$('shero').innerHTML=`<div class="card detail service-detail"><div class="date">SERVICIO</div><h2>${esc(g.name)}</h2><div class="service-detail-copy">Elige el proyecto que vas a grabar.</div><div class="prog"><span style="width:${pc}%"></span></div><small>${recorded} de ${total} videos grabados</small></div>`;$('setup').innerHTML=`<div class="card setup service-setup"><b>Proyectos de ${esc(g.name)}</b><br>Cada tarjeta conserva el proyecto. La etiqueta indica si está en calendario, si sigue en preparación o si ya puede grabarse.</div>`;renderVideos(g.items);scrollTo(0,0);}catch(e){err(e.message)}
  }

  const oldSBack=$('sback').onclick;$('sback').onclick=()=>{if(S?._serviceKey){S=null;resetViews();tab('record');return;}if(typeof oldSBack==='function')oldSBack();};
  const oldOpenSession=openSession;openSession=async function(id,from='record'){$('vback').innerHTML=`${ic('left')}Volver a la sesión`;return oldOpenSession(id,from);};
  const oldOpenVideo=openVideo;openVideo=function(i){oldOpenVideo(i);const item=Item,ready=item?.pieza?.production_status?.PRODUCTION_READY===true||item?.pieza?.estado==='RECORDED'||item?.estado==='GRABADO',btn=$('recb');if(btn&&!ready){btn.disabled=true;btn.innerHTML='Preparación pendiente';btn.title='Producción todavía no ha dejado esta pieza lista para grabar.';}};
  const oldToggleRec=toggleRec;toggleRec=async function(x){if(!S?._serviceKey)return oldToggleRec(x);const key=S._serviceKey;try{await api('mark_piece',{session_piece_id:x.session_piece_id,estado:x.estado==='GRABADO'?'PENDIENTE':'GRABADO'});P=await api('portal_get');invalidate();renderCal();renderHist();await renderRecord();const data=await loadItems();if(data.groups.has(key))await openService(key);else{S=null;resetViews();tab('record');}}catch(e){alert(e.message)}};

  const wait=()=>{if(typeof P!=='undefined'&&P){renderRecord();return;}setTimeout(wait,120);};setTimeout(wait,0);
})();
