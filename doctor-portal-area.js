(()=>{
  'use strict';
  const file=(location.pathname.split('/').pop()||'doctor-portal.html').toLowerCase();
  const area=file.includes('estetica')?'estetica':file.includes('cirugia')?'cirugia':'all';
  const stream=area==='estetica'?'ESTETICA':area==='cirugia'?'CIRUGIA':'ALL';
  const labels={
    all:{title:'Dr. Olano · Contenido',subtitle:'Medicina estética + cirugía',calendar:'Plan semanal · ambas áreas',theme:'#E6007E'},
    estetica:{title:'Dr. Olano · Medicina estética',subtitle:'Toxina · PRP · Limpieza / aparatología',calendar:'Plan semanal · medicina estética',theme:'#A35F36'},
    cirugia:{title:'Dr. Olano · Cirugía',subtitle:'Rinoplastia · Blefaroplastia · Liposucción de papada',calendar:'Plan semanal · cirugía',theme:'#28566B'}
  };
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
  function allowsGroup(group){return area==='all'||group===stream;}
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
    if(!data||area==='all')return data;
    const production_items=(data.production_items||[]).filter(x=>allowsPiece(x?.pieza));
    const counts=new Map();
    for(const item of production_items){
      const id=item?.sesion_id;if(!id)continue;
      const c=counts.get(id)||{total:0,recorded:0};
      c.total++;
      if(item?.estado==='GRABADO'||item?.pieza?.estado==='RECORDED'||item?.pieza?.estado==='PUBLISHED'||item?.pieza?.production_status?.RECORDED===true)c.recorded++;
      counts.set(id,c);
    }
    const sessions=(data.sessions||[]).map(s=>({...s,...(counts.get(s.id)||{total:0,recorded:0})})).filter(s=>s.total>0);
    const publications=(data.publications||[]).filter(x=>allowsPiece(x?.pieza));
    const calendar_items=(data.calendar_items||[]).filter(allowsCalendarItem);
    return {...data,sessions,production_items,publications,calendar_items};
  }
  function filterSessionPayload(data){
    if(!data||area==='all')return data;
    return {...data,items:(data.items||[]).filter(x=>allowsPiece(x?.pieza))};
  }
  function decorate(){
    const cfg=labels[area];
    document.documentElement.dataset.portalArea=area;
    if(document.body)document.body.dataset.portalArea=area;
    document.title=cfg.title;
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=cfg.theme;
    const brand=document.querySelector('.brand b');if(brand)brand.textContent=cfg.title;
    const sub=document.querySelector('.brand small');if(sub)sub.textContent=cfg.subtitle;
    const calK=document.querySelector('#calendar .hero .k');if(calK)calK.innerHTML=calK.innerHTML.replace(/Plan semanal/i,cfg.calendar);
    const recH=document.querySelector('#rhome .hero h1');if(recH&&area!=='all')recH.textContent=area==='estetica'?'Contenido de medicina estética':'Contenido de cirugía';
    const recP=document.querySelector('#rhome .hero p');if(recP&&area!=='all')recP.textContent='Este acceso muestra únicamente los guiones y proyectos de esta área.';
    const settings=document.querySelector('a[href="./doctor-negocio-config.html"]');if(settings&&area!=='all')settings.hidden=true;
  }
  window.DoctorPortalArea={area,stream,labels,groupFromServiceKey,groupFromService,groupForPiece,groupForCalendar,allowsPiece,allowsCalendarItem,filterPortalData,filterSessionPayload,decorate};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
})();