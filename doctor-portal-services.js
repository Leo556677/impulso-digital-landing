/* Service-first navigation for the Dr. Olano recording portal.
   Keeps real recording sessions intact; this file only changes how pending work is browsed. */
(()=>{
  'use strict';

  const serviceOrder=[
    'TOXINA BOTULÍNICA',
    'PRP FACIAL',
    'HYDRAFACIAL / LIMPIEZA CON APARATOLOGÍA',
    'LIPOSUCCIÓN DE PAPADA',
    'BICHECTOMÍA',
    'RINOPLASTIA'
  ];
  const serviceNames={
    'TOXINA BOTULÍNICA':'Toxina botulínica',
    'PRP FACIAL':'PRP facial',
    'HYDRAFACIAL / LIMPIEZA CON APARATOLOGÍA':'Limpieza / aparatología',
    'LIPOSUCCIÓN DE PAPADA':'Liposucción de papada',
    'BICHECTOMÍA':'Bichectomía',
    'RINOPLASTIA':'Rinoplastia'
  };
  const cache={signature:'',all:[],groups:new Map(),loading:null};

  function serviceKey(value){
    const raw=String(value||'Sin servicio').trim().replace(/\s+/g,' ');
    return raw.toLocaleUpperCase('es-PE');
  }
  function serviceName(key){return serviceNames[key]||String(key||'Servicio').toLocaleLowerCase('es-PE').replace(/(^|\s|\/\s*)\p{L}/gu,m=>m.toLocaleUpperCase('es-PE'));}
  function projectNumber(piece){const n=Number(piece?.metadata?.project_ref_v1?.project_number);return Number.isFinite(n)&&n>0?n:null;}
  function projectSort(a,b){
    const an=projectNumber(a?.pieza),bn=projectNumber(b?.pieza);
    if(an&&bn&&an!==bn)return an-bn;
    if(an&&!bn)return -1;if(!an&&bn)return 1;
    return pt(a?.pieza).localeCompare(pt(b?.pieza),'es');
  }
  function signature(){return active().map(s=>`${s.id}:${s.recorded||0}:${s.total||0}`).sort().join('|');}
  function invalidate(){cache.signature='';cache.all=[];cache.groups=new Map();cache.loading=null;}

  async function loadItems(force=false){
    const sig=signature();
    if(!force&&cache.signature===sig&&cache.groups.size)return cache;
    if(!force&&cache.loading)return cache.loading;
    cache.loading=(async()=>{
      const sessions=active();
      if(!sessions.length){cache.signature=sig;cache.all=[];cache.groups=new Map();cache.loading=null;return cache;}
      const details=await Promise.all(sessions.map(async s=>{
        const data=await api('session_get',{session_id:s.id});
        return {session:data.session,items:data.items||[]};
      }));
      const all=details.flatMap(d=>(d.items||[]).map(item=>({...item,_session:d.session}))).sort(projectSort);
      const groups=new Map();
      for(const item of all){
        const key=serviceKey(item?.pieza?.servicio);
        if(!groups.has(key))groups.set(key,{key,name:serviceName(key),items:[]});
        groups.get(key).items.push(item);
      }
      cache.signature=sig;cache.all=all;cache.groups=groups;cache.loading=null;
      return cache;
    })().catch(e=>{cache.loading=null;throw e;});
    return cache.loading;
  }

  function sortedGroups(groups){
    return [...groups.values()].sort((a,b)=>{
      const ai=serviceOrder.indexOf(a.key),bi=serviceOrder.indexOf(b.key);
      if(ai>=0||bi>=0){if(ai<0)return 1;if(bi<0)return -1;if(ai!==bi)return ai-bi;}
      return a.name.localeCompare(b.name,'es');
    });
  }

  function renderServiceCards(groups){
    const list=sortedGroups(groups);
    const host=$('sessions');
    host.className='service-grid';
    host.innerHTML=list.length?list.map(group=>{
      const total=group.items.length;
      const recorded=group.items.filter(x=>x.estado==='GRABADO').length;
      const pending=total-recorded;
      const pc=total?Math.round(recorded/total*100):0;
      return `<article class="card service-category jsService" data-service="${esc(group.key)}" tabindex="0" role="button" aria-label="Abrir ${esc(group.name)}">
        <div class="service-card-top">
          <div>
            <div class="service-eyebrow">SERVICIO</div>
            <h3>${esc(group.name)}</h3>
            <p>${pending} ${pending===1?'proyecto pendiente':'proyectos pendientes'}</p>
          </div>
          <span class="service-arrow">${ic('right')}</span>
        </div>
        <div class="service-card-foot"><span>${recorded}/${total} grabados</span><span>${total} ${total===1?'guion':'guiones'}</span></div>
        <div class="prog"><span style="width:${pc}%"></span></div>
      </article>`;
    }).join(''):'<div class="card empty"><b>No tienes proyectos pendientes de grabación.</b><br>Cuando haya un guion listo aparecerá dentro de su servicio.</div>';
    host.querySelectorAll('.jsService').forEach(el=>{
      const open=()=>openService(el.dataset.service);
      el.onclick=open;
      el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
    });
  }

  const baseRenderRecord=renderRecord;
  renderRecord=async function(){
    const heroText=D.querySelector('#rhome .hero p');
    const sectionTitle=D.querySelector('#rhome .sec h2');
    const sectionCopy=D.querySelector('#rhome .sec p');
    if(heroText)heroText.textContent='Elige un servicio y luego abre el proyecto que vas a grabar. Guion, imágenes e indicaciones siguen juntos.';
    if(sectionTitle)sectionTitle.textContent='Servicios para grabar';
    if(sectionCopy)sectionCopy.textContent='Entra a un servicio para ver sus proyectos y guiones pendientes.';

    const sessionPending=active().reduce((n,s)=>n+Math.max(0,(s.total||0)-(s.recorded||0)),0);
    const activeRecorded=active().reduce((n,s)=>n+(s.recorded||0),0);
    $('sum').innerHTML=`<div class="metric"><b>${ic('cam')}${sessionPending}</b><span>videos pendientes</span></div><div class="metric"><b>${ic('check')}${activeRecorded}</b><span>grabados en sesiones activas</span></div>`;
    $('sessions').className='service-grid';
    $('sessions').innerHTML='<div class="card empty service-loading">Organizando proyectos por servicio…</div>';
    try{
      const data=await loadItems();
      const pending=data.all.filter(x=>x.estado!=='GRABADO').length;
      const recorded=data.all.filter(x=>x.estado==='GRABADO').length;
      $('sum').innerHTML=`<div class="metric"><b>${ic('cam')}${pending}</b><span>videos pendientes</span></div><div class="metric"><b>${ic('check')}${recorded}</b><span>grabados en sesiones activas</span></div>`;
      renderServiceCards(data.groups);
    }catch(e){
      console.warn('No se pudo agrupar por servicio',e);
      $('sessions').className='';
      baseRenderRecord();
    }
  };

  async function openService(key){
    try{
      const data=await loadItems();
      const group=data.groups.get(key);
      if(!group||!group.items.length){resetViews();tab('record');return;}
      backTab='record';
      S={_serviceKey:key,session:{id:null,nombre:group.name,fecha:null,lugar:null,notas:null},items:group.items};
      tab('record');
      $('rhome').style.display='none';
      $('vdetail').style.display='none';
      $('sdetail').style.display='block';
      $('sbacktxt').textContent='Volver a servicios';
      $('vback').innerHTML=`${ic('left')}Volver al servicio`;
      const total=group.items.length,recorded=group.items.filter(x=>x.estado==='GRABADO').length,pc=total?Math.round(recorded/total*100):0;
      $('shero').innerHTML=`<div class="card detail service-detail"><div class="date">SERVICIO</div><h2>${esc(group.name)}</h2><div class="service-detail-copy">Elige el proyecto que vas a grabar.</div><div class="prog"><span style="width:${pc}%"></span></div><small>${recorded} de ${total} videos grabados</small></div>`;
      $('setup').innerHTML=`<div class="card setup service-setup"><b>Proyectos de ${esc(group.name)}</b><br>Cada tarjeta corresponde a un guion aprobado. Ábrela para ver escenas, imágenes de referencia y teleprompter.</div>`;
      renderVideos(group.items);
      scrollTo(0,0);
    }catch(e){err(e.message)}
  }

  const baseSBack=$('sback').onclick;
  $('sback').onclick=()=>{
    if(S?._serviceKey){S=null;resetViews();tab('record');return;}
    if(typeof baseSBack==='function')baseSBack();
  };

  const baseOpenSession=openSession;
  openSession=async function(id,from='record'){
    $('vback').innerHTML=`${ic('left')}Volver a la sesión`;
    return baseOpenSession(id,from);
  };

  const baseToggleRec=toggleRec;
  toggleRec=async function(x){
    if(!S?._serviceKey)return baseToggleRec(x);
    const key=S._serviceKey;
    try{
      await api('mark_piece',{session_piece_id:x.session_piece_id,estado:x.estado==='GRABADO'?'PENDIENTE':'GRABADO'});
      P=await api('portal_get');
      invalidate();
      renderCal();renderHist();
      await renderRecord();
      const data=await loadItems();
      if(data.groups.has(key))await openService(key);
      else{S=null;resetViews();tab('record');}
    }catch(e){alert(e.message)}
  };

  const waitForData=()=>{
    if(typeof P!=='undefined'&&P){renderRecord();return;}
    setTimeout(waitForData,120);
  };
  setTimeout(waitForData,0);
})();
