(()=>{
  'use strict';

  const VIEW_KEY='do_portal_calendar_view_v4';
  const PAGE_KEY='do_portal_calendar_page_v4';
  let planCache=null,planPromise=null;
  let calendarView=localStorage.getItem(VIEW_KEY)==='list'?'list':'week';
  let pageStart=Math.max(0,Number(localStorage.getItem(PAGE_KEY)||0)||0);

  const pad=n=>String(n).padStart(2,'0');
  const dateObj=iso=>new Date(String(iso)+'T12:00:00');
  const isoKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const addDays=(iso,n)=>{const d=dateObj(iso);d.setDate(d.getDate()+n);return isoKey(d);};
  const mondayOf=iso=>{const d=dateObj(iso),delta=(d.getDay()+6)%7;d.setDate(d.getDate()-delta);return isoKey(d);};
  const limaToday=()=>{
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const g=t=>p.find(x=>x.type===t)?.value||'';
    return `${g('year')}-${g('month')}-${g('day')}`;
  };
  const TODAY=limaToday();

  const portalSignature=()=>{
    if(typeof P==='undefined'||!P)return '';
    const sessions=(P.sessions||[]).map(x=>`${x.id}:${x.total||0}:${x.recorded||0}`).sort().join('|');
    const cal=(P.calendar_items||[]).map(x=>`${x.content_id||''}:${x.publish_date||''}:${x.slot_status||''}`).sort().join('|');
    return sessions+'||'+cal;
  };
  const waitForPortal=()=>new Promise((resolve,reject)=>{
    let tries=0;
    const tick=()=>{const sig=portalSignature();if(sig)return resolve(sig);if(++tries>80)return reject(Error('El portal todavía no terminó de cargar sus proyectos.'));setTimeout(tick,75);};
    tick();
  });

  function weekRange(start){
    const end=addDays(start,6),a=dateObj(start),b=dateObj(end);
    const ma=new Intl.DateTimeFormat('es-PE',{month:'short'}).format(a).replace('.','');
    const mb=new Intl.DateTimeFormat('es-PE',{month:'short'}).format(b).replace('.','');
    return a.getMonth()===b.getMonth()
      ?`${a.getDate()}–${b.getDate()} ${mb}. ${b.getFullYear()}`
      :`${a.getDate()} ${ma}.–${b.getDate()} ${mb}. ${b.getFullYear()}`;
  }
  function weekday(iso){return new Intl.DateTimeFormat('es-PE',{weekday:'short'}).format(dateObj(iso)).replace('.','').toUpperCase();}
  function serviceCode(service,kind){
    if(kind==='capture')return'EQ';
    const v=String(service||'').toUpperCase();
    if(v.includes('TOX'))return'TB';if(v.includes('PRP'))return'PRP';if(v.includes('RINOP'))return'RIN';if(v.includes('PAPADA'))return'PAP';if(v.includes('BICHE'))return'BIC';if(v.includes('LIMPIEZA'))return'LF';
    return(v.match(/[A-ZÁÉÍÓÚÑ]/g)||[]).slice(0,3).join('')||'VID';
  }
  function pieceRecorded(piece,item){
    return item?.estado==='GRABADO'||piece?.estado==='RECORDED'||piece?.estado==='PUBLISHED'||piece?.production_status?.RECORDED===true;
  }
  function statusMeta(item){
    if(item.recorded)return{label:'GRABADO',cls:'recorded'};
    if(item.kind==='legacy')return{label:'PROYECTO PREVIO',cls:'previous'};
    if(item.kind==='capture')return{label:'REQUIERE CAPTURA REAL',cls:'capture'};
    const s=String(item.slot_status||'').toUpperCase();
    if(s==='APPROVED')return{label:'GUION APROBADO',cls:'approved'};
    if(s==='NEEDS_CAPTURE')return{label:'CAPTURA PENDIENTE',cls:'capture'};
    if(s==='NEEDS_SCRIPT')return{label:'GUION PENDIENTE',cls:'pending'};
    return{label:s?String(s).replaceAll('_',' '):'EN PLAN',cls:'pending'};
  }

  function distributeLegacy(items,start){
    const n=items.length;if(!n)return;
    const base=Math.floor(n/7),extra=n%7;let cursor=0;
    for(let day=0;day<7;day++){
      const quota=base+(day<extra?1:0);
      for(let j=0;j<quota&&cursor<n;j++)items[cursor++].date=addDays(start,day);
    }
  }

  async function buildPlan(force=false){
    let signature=portalSignature();if(!signature)signature=await waitForPortal();
    if(!force&&planCache?.signature===signature)return planCache;
    if(!force&&planPromise)return planPromise;
    planPromise=(async()=>{
      const projectApi=window.DoctorPortalProjects;
      if(!projectApi?.loadItems)throw Error('No se pudo organizar la lista de proyectos.');
      const data=await projectApi.loadItems(force);
      const index=projectApi.buildDisplayIndex(data.all||[]);
      const byContent=new Map();
      for(const item of data.all||[]){const id=item?.pieza?.id;if(id&&!byContent.has(id))byContent.set(id,item);}

      const scheduled=(P?.calendar_items||[]).filter(x=>x?.content_id&&x?.publish_date).map(x=>{
        const sessionItem=byContent.get(x.content_id),piece=sessionItem?.pieza||x.pieza||{};
        return{
          kind:'scheduled',date:x.publish_date,code:index.scheduled.get(x.content_id)||'',content_id:x.content_id,
          title:piece.titulo||piece.tema||piece.servicio||'Proyecto de contenido',service:piece.servicio||'',
          slot_status:x.slot_status||x.status||'APPROVED',strategic_role:x.strategic_role||'',sessionItem,piece,
          recorded:pieceRecorded(piece,sessionItem)
        };
      });

      const specials=Array.isArray(window.DoctorPortalSpecials)?window.DoctorPortalSpecials:[];
      for(const sp of specials){
        if(!sp?.iso)continue;
        scheduled.push({kind:'capture',date:sp.iso,code:index.special.get('capture')||String(sp.projectNumber||'').padStart(3,'0'),content_id:null,title:sp.subtitle||sp.title||'Captura especial',service:'MARCA / EQUIPO',slot_status:'NEEDS_CAPTURE',strategic_role:'HUMANIZACION',special:sp,recorded:false});
      }
      scheduled.sort((a,b)=>a.date.localeCompare(b.date)||String(a.code).localeCompare(String(b.code)));

      const firstScheduled=scheduled[0]?.date||TODAY,firstWeek=mondayOf(firstScheduled),legacyStart=addDays(firstWeek,-7);
      const legacyItems=(index.legacyRows||[]).map(item=>({
        kind:'legacy',code:index.legacy.get(item.pieza.id)||'',content_id:item.pieza.id,title:item.pieza.titulo||item.pieza.tema||item.pieza.servicio||'Proyecto previo',
        service:item.pieza.servicio||'',slot_status:'PREVIOUS',sessionItem:item,piece:item.pieza,recorded:pieceRecorded(item.pieza,item)
      }));
      distributeLegacy(legacyItems,legacyStart);

      const items=[...legacyItems,...scheduled].sort((a,b)=>a.date.localeCompare(b.date)||String(a.code).localeCompare(String(b.code)));
      const first=legacyStart,last=items.length?mondayOf(items[items.length-1].date):firstScheduled,weeks=[];let cur=first,idx=0;
      while(cur<=last){
        const rows=items.filter(x=>mondayOf(x.date)===cur),offset=Math.round((dateObj(cur)-dateObj(firstWeek))/(7*86400000));
        weeks.push({start:cur,end:addDays(cur,6),rows,type:offset<0?'previous':'scheduled',number:offset>=0?offset+1:null,index:idx++});
        cur=addDays(cur,7);
      }
      pageStart=Math.min(pageStart,Math.max(0,weeks.length-2));
      planCache={items,weeks,scheduledCount:scheduled.length,legacyCount:legacyItems.length,firstWeek,signature};
      planPromise=null;return planCache;
    })().catch(e=>{planPromise=null;throw e;});
    return planPromise;
  }

  function projectCard(item){
    const st=statusMeta(item),abbr=serviceCode(item.service,item.kind),target=item.kind==='capture'?'data-special="capture"':`data-content="${esc(item.content_id||'')}"`;
    return `<article class="cal-project service-card-look ${esc(item.kind)} ${item.recorded?'is-recorded':''}" ${target} tabindex="0" role="button" aria-label="Abrir ${esc(item.title)}">
      ${item.recorded?'<div class="cal-recorded-check" aria-label="Grabado">✓</div>':''}
      <div class="cal-project-top">
        <div>
          <span class="cal-project-code">PROYECTO ${esc(item.code||'—')}</span>
          <div class="cal-service-name">${esc(item.service||'Contenido')}</div>
        </div>
        <span class="cal-card-arrow">${ic('right')}</span>
      </div>
      <div class="cal-project-mid"><span class="cal-service-code">${esc(abbr)}</span><h3>${esc(item.title)}</h3></div>
      <div class="cal-project-status ${st.cls}">${st.cls==='approved'||st.cls==='recorded'?ic('check'):''}<span>${esc(st.label)}</span></div>
    </article>`;
  }
  function emptyDay(){return '<div class="cal-empty-day"><span>Sin proyecto</span></div>';}

  function weekBlock(week){
    const days=Array.from({length:7},(_,i)=>{
      const date=addDays(week.start,i),rows=week.rows.filter(x=>x.date===date);
      return `<div class="cal-week-day ${date===TODAY?'today':''}">
        <div class="cal-date-head"><span>${weekday(date)}</span><b>${dateObj(date).getDate()}</b>${date===TODAY?'<i>HOY</i>':''}</div>
        <div class="cal-day-projects">${rows.length?rows.map(projectCard).join(''):emptyDay()}</div>
      </div>`;
    }).join('');
    const kicker=week.type==='previous'?'SEMANA ANTERIOR · PROYECTOS PREVIOS':`SEMANA ${String(week.number).padStart(2,'0')}`;
    return `<section class="cal-week-block ${week.type==='previous'?'previous-week':''}">
      <header class="cal-week-head"><div><span>${kicker}</span><h2>${esc(weekRange(week.start))}</h2></div><small>${week.rows.length} ${week.rows.length===1?'proyecto':'proyectos'}</small></header>
      <div class="cal-week-grid">${days}</div>
    </section>`;
  }

  function listBlock(week){
    const rows=week.rows.slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.code).localeCompare(String(b.code)));
    const kicker=week.type==='previous'?'SEMANA ANTERIOR':`SEMANA ${String(week.number).padStart(2,'0')}`;
    return `<section class="cal-list-week">
      <header class="cal-list-week-head"><div><span>${kicker}</span><b>${esc(weekRange(week.start))}</b></div><small>${rows.length} ${rows.length===1?'proyecto':'proyectos'}</small></header>
      <div class="cal-list-items">${rows.length?rows.map(item=>{
        const st=statusMeta(item),abbr=serviceCode(item.service,item.kind),target=item.kind==='capture'?'data-special="capture"':`data-content="${esc(item.content_id||'')}"`;
        return `<article class="cal-list-row ${esc(item.kind)} ${item.recorded?'is-recorded':''}" ${target} tabindex="0" role="button">
          ${item.recorded?'<div class="cal-recorded-check list-check">✓</div>':''}
          <div class="cal-list-date"><span>${weekday(item.date)}</span><b>${dateObj(item.date).getDate()}</b></div>
          <div class="cal-list-main"><div class="cal-list-meta"><span class="cal-project-code">PROYECTO ${esc(item.code||'—')}</span><span class="cal-service-code">${esc(abbr)}</span></div><div class="cal-service-name">${esc(item.service||'Contenido')}</div><h3>${esc(item.title)}</h3></div>
          <div class="cal-project-status ${st.cls}">${st.cls==='approved'||st.cls==='recorded'?ic('check'):''}<span>${esc(st.label)}</span></div>
          <span class="cal-card-arrow list-arrow">${ic('right')}</span>
        </article>`;
      }).join(''):'<div class="cal-list-empty">Sin proyectos en esta semana.</div>'}</div>
    </section>`;
  }

  function toolbar(plan){
    const canPrev=pageStart>0,canNext=pageStart+2<plan.weeks.length;
    return `<div class="card cal-toolbar">
      <div class="cal-two-week-nav">
        <button type="button" data-cal-page="-1" ${canPrev?'':'disabled'} aria-label="Ver semanas anteriores">${ic('left')}</button>
        <div><b>2 semanas</b><span>Mostrando ${Math.min(2,plan.weeks.length-pageStart)} de ${plan.weeks.length}</span></div>
        <button type="button" data-cal-page="1" ${canNext?'':'disabled'} aria-label="Ver semanas siguientes">${ic('right')}</button>
      </div>
      <div class="cal-view-switch" role="group" aria-label="Cambiar vista del calendario">
        <button type="button" data-cal-view="week" class="${calendarView==='week'?'active':''}" aria-pressed="${calendarView==='week'}"><span class="cal-view-icon">▦</span> Semana</button>
        <button type="button" data-cal-view="list" class="${calendarView==='list'?'active':''}" aria-pressed="${calendarView==='list'}"><span class="cal-view-icon">☷</span> Lista</button>
      </div>
    </div>
    <div class="cal-explain"><b>Orden visual:</b> los proyectos previos usan <strong>A1, A2…</strong>. La serie calendarizada empieza en <strong>001</strong>. Solo se muestran <strong>2 semanas a la vez</strong>; usa las flechas para avanzar.</div>`;
  }

  function bindCards(){
    document.querySelectorAll('[data-content]').forEach(card=>{
      const open=()=>window.DoctorPortalProjects?.openCalendarItem?.(card.dataset.content);
      card.onclick=open;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
    });
    document.querySelectorAll('[data-special]').forEach(card=>{
      const open=()=>window.DoctorPortalProjects?.openCalendarSpecial?.(card.dataset.special);
      card.onclick=open;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
    });
  }
  function bindToolbar(plan){
    document.querySelectorAll('[data-cal-view]').forEach(btn=>btn.onclick=()=>{
      const next=btn.dataset.calView==='list'?'list':'week';if(next===calendarView)return;
      calendarView=next;localStorage.setItem(VIEW_KEY,calendarView);draw();
    });
    document.querySelectorAll('[data-cal-page]').forEach(btn=>btn.onclick=()=>{
      const d=Number(btn.dataset.calPage)||0;
      pageStart=Math.max(0,Math.min(Math.max(0,plan.weeks.length-2),pageStart+d));
      localStorage.setItem(PAGE_KEY,String(pageStart));draw();
    });
  }

  async function draw(force=false){
    const host=$('calbox');if(!host)return;
    host.innerHTML='<div class="card cal-loading">Organizando 2 semanas de proyectos…</div>';
    try{
      const plan=await buildPlan(force);
      if(!plan.items.length){host.innerHTML='<div class="card empty">Todavía no hay proyectos para ordenar en el calendario.</div>';return;}
      const visible=plan.weeks.slice(pageStart,pageStart+2);
      host.innerHTML=toolbar(plan)+`<div class="cal-plan ${calendarView==='list'?'list-mode':'week-mode'}">${visible.map(w=>calendarView==='list'?listBlock(w):weekBlock(w)).join('')}</div>`;
      bindToolbar(plan);bindCards();
    }catch(e){host.innerHTML=`<div class="card empty"><b>No pude cargar el calendario.</b><br>${esc(e?.message||'No se pudo cargar.')}</div>`;}
  }

  function ensureRecordPrompt(){
    let o=document.getElementById('recordConfirmOverlay');
    if(o)return o;
    o=document.createElement('div');o.id='recordConfirmOverlay';o.className='record-confirm-overlay';o.setAttribute('aria-hidden','true');
    o.innerHTML=`<div class="record-confirm-card" role="dialog" aria-modal="true" aria-labelledby="recordConfirmTitle">
      <div class="record-confirm-icon">${ic('cam')}</div>
      <h2 id="recordConfirmTitle">¿Ya cumpliste con grabar?</h2>
      <p id="recordConfirmCopy">Confirma solo cuando hayas terminado de grabar este proyecto.</p>
      <div id="recordConfirmError" class="record-confirm-error"></div>
      <div class="record-confirm-actions"><button type="button" id="recordNoBtn">No grabé</button><button type="button" id="recordYesBtn" class="yes">${ic('check')} Sí, grabé</button></div>
    </div>`;
    document.body.appendChild(o);
    o.addEventListener('click',e=>{if(e.target===o)hideRecordPrompt();});
    document.getElementById('recordNoBtn').onclick=hideRecordPrompt;
    document.getElementById('recordYesBtn').onclick=confirmRecorded;
    return o;
  }
  function hideRecordPrompt(){const o=document.getElementById('recordConfirmOverlay');if(o){o.classList.remove('on');o.setAttribute('aria-hidden','true');}}
  function showRecordPrompt(item){
    const o=ensureRecordPrompt(),recorded=pieceRecorded(item?.pieza,item);
    document.getElementById('recordConfirmTitle').textContent=recorded?'Este proyecto ya figura como grabado':'¿Ya cumpliste con grabar?';
    document.getElementById('recordConfirmCopy').textContent=recorded?'Puedes continuar usando el teleprompter. La tarjeta del calendario mostrará su check verde.':'Si todavía no terminaste, elige “No grabé” y continúa con el teleprompter.';
    document.getElementById('recordConfirmError').textContent='';
    document.getElementById('recordYesBtn').disabled=false;
    o.classList.add('on');o.setAttribute('aria-hidden','false');
  }
  async function confirmRecorded(){
    const btn=document.getElementById('recordYesBtn'),error=document.getElementById('recordConfirmError');
    btn.disabled=true;error.textContent='Guardando…';
    const result=await window.DoctorPortalProjects?.markCalendarRecorded?.(Item);
    if(!result?.ok){error.textContent=result?.message||'No se pudo marcar como grabado.';btn.disabled=false;return;}
    if(Item)Item.estado='GRABADO';
    error.textContent='Grabación confirmada.';
    hideRecordPrompt();
    if(typeof closeTele==='function')closeTele();
    S=null;resetViews();tab('calendar');planCache=null;await draw(true);
  }

  renderCal=function(){draw();};
  renderPdet=function(){};

  const previousOpenTele=typeof openTele==='function'?openTele:null;
  if(previousOpenTele){
    openTele=function(item){
      previousOpenTele(item);
      if(S?._calendarDirect){
        const label=window.DoctorPortalProjects?.labelFor?.(item)||'';
        if(label&&$('ttitle'))$('ttitle').textContent=[label,pt(item?.pieza)].filter(Boolean).join(' · ');
        setTimeout(()=>showRecordPrompt(item),450);
      }
    };
  }

  setTimeout(()=>{planCache=null;draw();},0);
})();
