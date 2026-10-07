(()=>{
  'use strict';

  const byId=id=>document.getElementById(id);
  const norm=value=>String(value??'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLocaleLowerCase('es-PE')
    .replace(/\s+/g,' ')
    .trim();

  const flattenText=value=>{
    if(value==null)return [];
    if(typeof value==='string'||typeof value==='number')return [String(value)];
    if(Array.isArray(value))return value.flatMap(flattenText);
    if(typeof value==='object')return Object.values(value).flatMap(flattenText);
    return [];
  };

  let index=[];
  let indexSignature='';
  let indexPromise=null;
  let lastScrollY=0;
  let lastMatches=[];

  function payload(){
    try{return typeof P!=='undefined'&&P?P:null}catch{return null}
  }

  function signature(){
    const p=payload();
    if(!p)return '';
    const sessions=(p.sessions||[]).map(x=>x.id).filter(Boolean).sort().join('|');
    const production=(p.production_items||[]).map(x=>x?.pieza?.id).filter(Boolean).sort().join('|');
    const calendar=(p.calendar_items||[]).map(x=>x.content_id).filter(Boolean).sort().join('|');
    const publications=(p.publications||[]).map(x=>x.content_id).filter(Boolean).sort().join('|');
    const layer=window.DoctorPortalAccess?.layer||p.portal_layer||'';
    return [layer,sessions,production,calendar,publications].join('::');
  }

  async function mapLimit(rows,limit,worker){
    const out=new Array(rows.length);
    let cursor=0;
    async function run(){
      while(cursor<rows.length){
        const i=cursor++;
        try{out[i]=await worker(rows[i],i)}catch{out[i]=null}
      }
    }
    await Promise.all(Array.from({length:Math.min(limit,rows.length)},run));
    return out;
  }

  function mergeItem(map,item){
    const id=item?.pieza?.id;
    if(!id)return;
    const prev=map.get(id);
    if(!prev){map.set(id,item);return}
    const shots=(item.tomas||[]).length>(prev.tomas||[]).length?item.tomas:prev.tomas;
    map.set(id,{...prev,...item,pieza:{...(prev.pieza||{}),...(item.pieza||{})},tomas:shots||[]});
  }

  function itemRecord(item){
    const p=item?.pieza||{};
    const rehooks=flattenText(p.rehooks||[]);
    const spoken=[
      p.master_script,
      p.hook_verbal,
      p.hook_texto,
      p.open_loop,
      ...rehooks,
      p.payoff,
      p.cta_master,
      ...(item?.tomas||[]).flatMap(t=>[t?.que_se_dice,t?.texto_pantalla,t?.linea_que_cubre])
    ].filter(Boolean).join(' \n ');
    const meta=[p.titulo,p.tema,p.servicio,p.objetivo,p.publico,p.presentador].filter(Boolean).join(' · ');
    const searchable=[spoken,meta].filter(Boolean).join(' \n ');
    return {
      id:p.id,
      item,
      title:p.titulo||p.tema||p.servicio||'Proyecto',
      service:p.servicio||'',
      script:spoken,
      meta,
      searchable,
      normalized:norm(searchable)
    };
  }

  async function buildIndex(force=false){
    const sig=signature();
    if(!force&&index.length&&sig&&sig===indexSignature)return index;
    if(indexPromise)return indexPromise;

    indexPromise=(async()=>{
      const p=payload();
      if(!p)throw new Error('El portal todavía está cargando.');

      const map=new Map();
      const sessions=(p.sessions||[]).filter(x=>x?.id);
      const sessionPayloads=await mapLimit(sessions,4,async s=>api('session_get',{session_id:s.id}));
      for(const data of sessionPayloads||[])for(const item of data?.items||[])mergeItem(map,item);

      const ids=[
        ...(p.production_items||[]).map(x=>x?.pieza?.id),
        ...(p.calendar_items||[]).map(x=>x?.content_id),
        ...(p.publications||[]).map(x=>x?.content_id)
      ].filter(Boolean);
      const missing=[...new Set(ids)].filter(id=>!map.has(id));
      const extra=await mapLimit(missing,4,async id=>api('piece_get',{content_id:id}));
      for(const data of extra||[])if(data?.item)mergeItem(map,data.item);

      index=[...map.values()].map(itemRecord).filter(x=>x.id&&x.searchable).sort((a,b)=>a.title.localeCompare(b.title,'es'));
      indexSignature=signature()||sig;
      return index;
    })().finally(()=>{indexPromise=null});

    return indexPromise;
  }

  function snippet(record,terms){
    const source=record.script||record.meta||record.searchable||'';
    const ns=norm(source);
    let at=-1;
    for(const term of terms){const hit=ns.indexOf(term);if(hit>=0&&(at<0||hit<at))at=hit}
    if(at<0)at=0;
    const start=Math.max(0,at-72);
    const end=Math.min(source.length,at+190);
    let text=source.slice(start,end).replace(/\s+/g,' ').trim();
    if(start>0)text='…'+text;
    if(end<source.length)text=text+'…';
    return text||record.meta||'Coincidencia encontrada en el proyecto.';
  }

  function rank(record,terms){
    const script=norm(record.script);
    const meta=norm(record.meta);
    let score=0;
    for(const term of terms){
      const si=script.indexOf(term),mi=meta.indexOf(term);
      if(si>=0)score+=1000-Math.min(si,800);
      else if(mi>=0)score+=350-Math.min(mi,250);
    }
    return score;
  }

  function labelFor(record){
    try{return window.DoctorPortalProjects?.labelFor?.(record.item)||''}catch{return ''}
  }

  function ensureUi(){
    if(byId('portalSearch'))return;

    const main=document.querySelector('main');
    if(!main)return;

    const shell=document.createElement('section');
    shell.id='portalSearch';
    shell.className='portal-search-shell';
    shell.setAttribute('aria-label','Buscar en los guiones');

    const card=document.createElement('div');
    card.className='portal-search-card';

    const row=document.createElement('div');
    row.className='portal-search-row';

    const wrap=document.createElement('div');
    wrap.className='portal-search-input-wrap';

    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.setAttribute('class','portal-search-icon');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('aria-hidden','true');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M11 4a7 7 0 1 0 4.9 12l4.1 4 1.4-1.4-4-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z');
    path.setAttribute('fill','currentColor');
    icon.appendChild(path);

    const input=document.createElement('input');
    input.id='portalSearchInput';
    input.className='portal-search-input';
    input.type='search';
    input.placeholder='Buscar palabra en los guiones…';
    input.autocomplete='off';
    input.autocapitalize='none';
    input.spellcheck=false;
    input.setAttribute('aria-controls','portalSearchResults');
    input.setAttribute('aria-expanded','false');

    const clear=document.createElement('button');
    clear.id='portalSearchClear';
    clear.className='portal-search-clear';
    clear.type='button';
    clear.setAttribute('aria-label','Limpiar búsqueda');
    clear.textContent='×';
    clear.hidden=true;

    wrap.append(icon,input,clear);

    const meta=document.createElement('div');
    meta.id='portalSearchMeta';
    meta.className='portal-search-meta';
    meta.textContent='Busca por cualquier palabra';

    row.append(wrap,meta);
    card.appendChild(row);

    const results=document.createElement('div');
    results.id='portalSearchResults';
    results.className='portal-search-results';
    results.hidden=true;

    shell.append(card,results);
    main.insertBefore(shell,main.firstChild);

    let timer=0;
    input.addEventListener('input',()=>{
      clear.hidden=!input.value;
      clearTimeout(timer);
      timer=setTimeout(()=>runSearch(input.value),70);
    });
    input.addEventListener('focus',()=>{
      if(input.value.trim())runSearch(input.value);
    });
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){
        results.hidden=true;
        input.setAttribute('aria-expanded','false');
        input.blur();
      }
    });
    clear.addEventListener('click',()=>{
      input.value='';
      clear.hidden=true;
      meta.textContent='Busca por cualquier palabra';
      results.hidden=true;
      results.replaceChildren();
      input.setAttribute('aria-expanded','false');
      input.focus();
    });
  }

  function renderLoading(){
    const results=byId('portalSearchResults');
    const meta=byId('portalSearchMeta');
    if(!results)return;
    results.hidden=false;
    results.replaceChildren();
    const box=document.createElement('div');
    box.className='portal-search-empty portal-search-loading';
    box.textContent='Preparando todos los guiones para buscar…';
    results.appendChild(box);
    if(meta)meta.textContent='Indexando contenido';
    byId('portalSearchInput')?.setAttribute('aria-expanded','true');
  }

  function renderMatches(matches,query,terms){
    const results=byId('portalSearchResults');
    const meta=byId('portalSearchMeta');
    if(!results)return;

    results.replaceChildren();
    results.hidden=false;
    byId('portalSearchInput')?.setAttribute('aria-expanded','true');

    if(meta)meta.textContent=matches.length===1?'1 resultado':matches.length+' resultados';

    if(!matches.length){
      const empty=document.createElement('div');
      empty.className='portal-search-empty';
      empty.textContent='No encontré “'+query+'” en los guiones cargados para este acceso.';
      results.appendChild(empty);
      return;
    }

    for(const record of matches){
      const button=document.createElement('button');
      button.type='button';
      button.className='portal-search-result';

      const top=document.createElement('div');
      top.className='portal-search-result-top';

      const project=document.createElement('span');
      project.className='portal-search-project';
      project.textContent=labelFor(record)||'PROYECTO';

      const service=document.createElement('span');
      service.className='portal-search-service';
      service.textContent=record.service||'Contenido';

      const title=document.createElement('h3');
      title.textContent=record.title;

      const copy=document.createElement('p');
      copy.className='portal-search-snippet';
      copy.textContent=snippet(record,terms);

      top.append(project,service);
      button.append(top,title,copy);
      button.addEventListener('click',()=>openResult(record));
      results.appendChild(button);
    }
  }

  async function runSearch(raw){
    const query=String(raw||'').trim();
    const results=byId('portalSearchResults');
    const meta=byId('portalSearchMeta');
    if(!query){
      lastMatches=[];
      if(results){results.hidden=true;results.replaceChildren()}
      if(meta)meta.textContent='Busca por cualquier palabra';
      byId('portalSearchInput')?.setAttribute('aria-expanded','false');
      return;
    }

    const terms=norm(query).split(' ').filter(Boolean);
    if(!terms.length)return;

    renderLoading();
    try{
      const rows=await buildIndex();
      if(String(byId('portalSearchInput')?.value||'').trim()!==query)return;
      const matches=rows
        .filter(r=>terms.every(t=>r.normalized.includes(t)))
        .map(r=>({r,score:rank(r,terms)}))
        .sort((a,b)=>b.score-a.score||a.r.title.localeCompare(b.r.title,'es'))
        .slice(0,40)
        .map(x=>x.r);
      lastMatches=matches;
      renderMatches(matches,query,terms);
    }catch(e){
      if(results){
        results.hidden=false;
        results.replaceChildren();
        const empty=document.createElement('div');
        empty.className='portal-search-empty';
        empty.textContent=e?.message||'No se pudo preparar la búsqueda.';
        results.appendChild(empty);
      }
      if(meta)meta.textContent='Búsqueda no disponible';
    }
  }

  async function openResult(record){
    const shell=byId('portalSearch');
    lastScrollY=window.scrollY||0;
    if(shell)shell.hidden=true;
    try{
      const ok=await window.DoctorPortalProjects?.openCalendarItem?.(record.id,labelFor(record),'search');
      if(ok===false)restore();
    }catch{
      restore();
    }
  }

  function restore(){
    const shell=byId('portalSearch');
    const input=byId('portalSearchInput');
    if(shell)shell.hidden=false;
    requestAnimationFrame(()=>{
      if(input){
        input.focus({preventScroll:true});
        if(input.value.trim()){
          const terms=norm(input.value).split(' ').filter(Boolean);
          renderMatches(lastMatches,input.value.trim(),terms);
        }
      }
      window.scrollTo(0,lastScrollY);
    });
  }

  function waitForPortal(){
    ensureUi();
    if(typeof api==='function'&&payload()&&window.DoctorPortalProjects){
      window.DoctorPortalSearch={buildIndex,restore,refresh:()=>buildIndex(true)};
      return;
    }
    setTimeout(waitForPortal,140);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForPortal,{once:true});
  else waitForPortal();
})();
