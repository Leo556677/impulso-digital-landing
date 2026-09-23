(()=>{
  'use strict';
  const labels={
    DR_OLANO:{area:'all',stream:'ALL',title:'Dr. Olano · Contenido',subtitle:'Medicina estética + NOVARE',calendar:'Plan semanal · Dr. Olano',theme:'#E6007E'},
    ESTETICA:{area:'estetica',stream:'ESTETICA',title:'Dr. Olano · Medicina estética',subtitle:'Toxina · PRP · Limpieza / aparatología',calendar:'Plan semanal · Medicina estética',theme:'#A35F36'},
    NOVARE:{area:'novare',stream:'CIRUGIA',title:'Dr. Olano · NOVARE',subtitle:'Rinoplastia · Blefaroplastia · Liposucción de papada',calendar:'Plan semanal · NOVARE',theme:'#28566B'}
  };
  const api={area:'locked',stream:'',layer:'',labels};
  const norm=v=>String(v??'').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  function groupFromServiceKey(key){
    const k=norm(key);
    if(['S1','S2','S3'].includes(k))return'ESTETICA';
    if(['S4','S5','S6'].includes(k))return'CIRUGIA';
    return'GENERAL';
  }
  function groupFromService(service){
    const v=norm(service);
    if(!v)return'GENERAL';
    if(v.includes('RINOPLAST')||v.includes('BLEFAR')||v.includes('PAPADA'))return'CIRUGIA';
    if(v.includes('TOX')||v.includes('PRP')||v.includes('LIMPIEZA')||v.includes('HIDRA')||v.includes('APARATOLOG'))return'ESTETICA';
    return'GENERAL';
  }
  function allowsGroup(group){return api.area==='all'||group===api.stream;}
  function groupForPiece(piece){return groupFromService(piece?.servicio);}
  function allowsPiece(piece){return allowsGroup(groupForPiece(piece));}
  function groupForCalendar(item){
    const declared=norm(item?.content_stream);
    if(['ESTETICA','CIRUGIA','GENERAL'].includes(declared))return declared;
    if(item?.pieza?.servicio)return groupFromService(item.pieza.servicio);
    return groupFromServiceKey(item?.service_key);
  }
  function allowsCalendarItem(item){return allowsGroup(groupForCalendar(item));}
  function filterPortalData(data){
    if(!data||api.area==='all')return data;
    const production_items=(data.production_items||[]).filter(x=>allowsPiece(x?.pieza));
    const counts=new Map();
    for(const item of production_items){
      const id=item?.sesion_id;if(!id)continue;
      const c=counts.get(id)||{total:0,recorded:0};c.total++;
      if(item?.estado==='GRABADO'||item?.pieza?.estado==='RECORDED'||item?.pieza?.estado==='PUBLISHED'||item?.pieza?.production_status?.RECORDED===true)c.recorded++;
      counts.set(id,c);
    }
    const sessions=(data.sessions||[]).map(s=>({...s,...(counts.get(s.id)||{total:0,recorded:0})})).filter(s=>s.total>0);
    const publications=(data.publications||[]).filter(x=>allowsPiece(x?.pieza));
    const calendar_items=(data.calendar_items||[]).filter(allowsCalendarItem);
    return {...data,sessions,production_items,publications,calendar_items};
  }
  function filterSessionPayload(data){
    if(!data||api.area==='all')return data;
    return {...data,items:(data.items||[]).filter(x=>allowsPiece(x?.pieza))};
  }
  function decorate(){
    const cfg=labels[api.layer]||labels.DR_OLANO;
    document.documentElement.dataset.portalArea=cfg.area;
    if(document.body)document.body.dataset.portalArea=cfg.area;
    document.title=cfg.title;
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=cfg.theme;
    const brand=document.querySelector('.brand b');if(brand)brand.textContent=cfg.title;
    const sub=document.querySelector('.brand small');if(sub)sub.textContent=cfg.subtitle;
    const calK=document.querySelector('#calendar .hero .k');
    if(calK)calK.innerHTML=calK.innerHTML.replace(/Plan semanal(?:\s*·[^<]*)?/i,cfg.calendar);
    const recH=document.querySelector('#rhome .hero h1');
    if(recH)recH.textContent=api.area==='all'?'Contenido para grabar':api.area==='estetica'?'Contenido de medicina estética':'Contenido de NOVARE';
    const recP=document.querySelector('#rhome .hero p');
    if(recP)recP.textContent=api.area==='all'?'Todo el contenido de medicina estética y NOVARE, ordenado por área y servicio.':'Este acceso muestra únicamente los guiones y proyectos de esta área.';
    const settings=document.querySelector('a[href="./doctor-negocio-config.html"]');if(settings)settings.style.display=api.area==='all'?'':'none';
  }
  function setLayer(layer){
    const key=labels[layer]?layer:'DR_OLANO',cfg=labels[key];
    api.layer=key;api.area=cfg.area;api.stream=cfg.stream;decorate();return api;
  }
  Object.assign(api,{norm,groupFromServiceKey,groupFromService,groupForPiece,groupForCalendar,allowsPiece,allowsCalendarItem,filterPortalData,filterSessionPayload,decorate,setLayer});
  window.DoctorPortalArea=api;
  window.addEventListener('portal-layer-ready',e=>setLayer(e.detail?.layer||window.DoctorPortalAccess?.layer||'DR_OLANO'));
  if(window.DoctorPortalAccess?.ready)setLayer(window.DoctorPortalAccess.layer);
})();