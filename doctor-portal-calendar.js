(()=>{
  'use strict';

  const VIEW_KEY='do_portal_calendar_view_v3';
  let planCache=null,planPromise=null,calendarError='';
  let calendarView=localStorage.getItem(VIEW_KEY)==='list'?'list':'week';

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

  function shortDate(iso){
    const p=new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short'}).formatToParts(dateObj(iso));
    const day=p.find(x=>x.type==='day')?.value||'',mon=(p.find(x=>x.type==='month')?.value||'').replace('.','');
    return `${day} ${mon}`;
  }
  function longDate(iso){
    return new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long'}).format(dateObj(iso));
  }
  function weekRange(start){
    const end=addDays(start,6),a=dateObj(start),b=dateObj(end);
    const sameMonth=a.getMonth()===b.getMonth();
    const ma=new Intl.DateTimeFormat('es-PE',{month:'short'}).format(a).replace('.','');
    const mb=new Intl.DateTimeFormat('es-PE',{month:'short'}).format(b).replace('.','');
    return sameMonth?`${a.getDate()}–${b.getDate()} ${mb}. ${b.getFullYear()}`:`${a.getDate()} ${ma}.–${b.getDate()} ${mb}. ${b.getFullYear()}`;
  }
  function weekday(iso){
    return new Intl.DateTimeFormat('es-PE',{weekday:'short'}).format(dateObj(iso)).replace('.','').toUpperCase();
  }
  function serviceCode(service,kind){
    if(kind==='capture')return'EQ';
    const s=String(service||'').toUpperCase();
    if(s.includes('TOX'))return'TB';
    if(s.includes('PRP'))return'PRP';
    if(s.includes('RINOP'))return'RIN';
    if(s.includes('PAPADA'))return'PAP';
    if(s.includes('BICHE'))return'BIC';
    if(s.includes('LIMPIEZA'))return'LF';
    return (s.match(/[A-ZÁÉÍÓÚÑ]/g)||[]).slice(0,3).join('')||'VID';
  }
  function statusMeta(item){
    if(item.kind==='legacy')return{label:'PROYECTO PREVIO',cls:'previous'};
    if(item.kind==='capture')return{label:'REQUIERE CAPTURA REAL',cls:'capture'};
    const s=String(item.slot_status||'').toUpperCase();
    if(s==='APPROVED')return{label:'GUION APROBADO',cls:'approved'};
    if(s==='NEEDS_CAPTURE')return{label:'CAPTURA PENDIENTE',cls:'capture'};
    if(s==='NEEDS_SCRIPT')return{label:'GUION PENDIENTE',cls:'pending'};
    return{label:s?String(s).replaceAll('_',' '):'EN PLAN',cls:'pending'};
  }

  async function buildPlan(force=false){
    let signature=portalSignature();
    if(!signature)signature=await waitForPortal();
    if(!force&&planCache?.signature===signature)return planCache;
    if(!force&&planPromise)return planPromise;
    planPromise=(async()=>{
      const projectApi=window.DoctorPortalProjects;
      if(!projectApi?.loadItems)throw Error('No se pudo organizar la lista de proyectos.');
      const data=await projectApi.loadItems(force);
      const index=projectApi.buildDisplayIndex(data.all||[]);
      const byContent=new Map();
      for(const item of data.all||[]){const id=item?.pieza?.id;if(id&&!byContent.has(id))byContent.set(id,item);}

      const scheduled=(P?.calendar_items||[])
        .filter(x=>x?.content_id&&x?.publish_date)
        .map(x=>{
          const sessionItem=byContent.get(x.content_id),piece=sessionItem?.pieza||{};
          return{
            kind:'scheduled',
            date:x.publish_date,
            code:index.scheduled.get(x.content_id)||'',
            content_id:x.content_id,
            title:piece.titulo||piece.tema||piece.servicio||'Proyecto de contenido',
            service:piece.servicio||'',
            slot_status:x.slot_status||x.status||'APPROVED',
            strategic_role:x.strategic_role||'',
            sessionItem
          };
        });

      const specials=Array.isArray(window.DoctorPortalSpecials)?window.DoctorPortalSpecials:[];
      for(const sp of specials){
        if(!sp?.iso)continue;
        scheduled.push({
          kind:'capture',
          date:sp.iso,
          code:index.special.get('capture')||String(sp.projectNumber||'').padStart(3,'0'),
          content_id:null,
          title:sp.subtitle||sp.title||'Captura especial',
          service:'MARCA / EQUIPO',
          slot_status:'NEEDS_CAPTURE',
          strategic_role:'HUMANIZACION',
          special:sp
        });
      }
      scheduled.sort((a,b)=>a.date.localeCompare(b.date)||String(a.code).localeCompare(String(b.code)));

      const firstScheduled=scheduled[0]?.date||TODAY,firstWeek=mondayOf(firstScheduled);
      const legacyItems=(index.legacyRows||[]).map(item=>({
        kind:'legacy',
        code:index.legacy.get(item.pieza.id)||'',
        content_id:item.pieza.id,
        title:item.pieza.titulo||item.pieza.tema||item.pieza.servicio||'Proyecto previo',
        service:item.pieza.servicio||'',
        slot_status:'PREVIOUS',
        sessionItem:item
      }));
      const priorWeeks=Math.max(1,Math.ceil(legacyItems.length/7));
      const legacyStart=addDays(firstWeek,-7*priorWeeks);
      legacyItems.forEach((x,i)=>x.date=addDays(legacyStart,i));

      const items=[...legacyItems,...scheduled].sort((a,b)=>a.date.localeCompare(b.date)||String(a.code).localeCompare(String(b.code)));
      const starts=[];
      if(items.length){
        let cur=mondayOf(items[0].date),last=mondayOf(items[items.length-1].date);
        while(cur<=last){starts.push(cur);cur=addDays(cur,7);}
      }
      const weeks=starts.map(start=>{
        const rows=items.filter(x=>mondayOf(x.date)===start);
        const offset=Math.round((dateObj(start)-dateObj(firstWeek))/(7*86400000));
        return{
          start,
          end:addDays(start,6),
          rows,
          type:offset<0?'previous':'scheduled',
          number:offset>=0?offset+1:null
        };
      });
      planCache={items,weeks,scheduledCount:scheduled.length,legacyCount:legacyItems.length,firstWeek,signature};
      planPromise=null;
      return planCache;
    })().catch(e=>{planPromise=null;throw e;});
    return planPromise;
  }

  function projectCard(item){
    const st=statusMeta(item),abbr=serviceCode(item.service,item.kind);
    return `<article class="cal-project ${esc(item.kind)}">
      <div class="cal-project-top">
        <span class="cal-project-code">PROYECTO ${esc(item.code||'—')}</span>
        <span class="cal-service-code">${esc(abbr)}</span>
      </div>
      <div class="cal-service-name">${esc(item.service||'Contenido')}</div>
      <h3>${esc(item.title)}</h3>
      <div class="cal-project-status ${st.cls}">${st.cls==='approved'?ic('check'):''}<span>${esc(st.label)}</span></div>
    </article>`;
  }

  function emptyDay(){
    return '<div class="cal-empty-day"><span>Sin proyecto</span></div>';
  }

  function weekBlock(week){
    const dayHtml=Array.from({length:7},(_,i)=>{
      const date=addDays(week.start,i),rows=week.rows.filter(x=>x.date===date);
      return `<div class="cal-week-day ${date===TODAY?'today':''}">
        <div class="cal-date-head"><span>${weekday(date)}</span><b>${dateObj(date).getDate()}</b>${date===TODAY?'<i>HOY</i>':''}</div>
        <div class="cal-day-projects">${rows.length?rows.map(projectCard).join(''):emptyDay()}</div>
      </div>`;
    }).join('');
    const kicker=week.type==='previous'?'SEMANA ANTERIOR · PROYECTOS PREVIOS':`SEMANA ${String(week.number).padStart(2,'0')}`;
    const count=week.rows.length;
    return `<section class="cal-week-block ${week.type==='previous'?'previous-week':''}">
      <header class="cal-week-head">
        <div><span>${kicker}</span><h2>${esc(weekRange(week.start))}</h2></div>
        <small>${count} ${count===1?'proyecto':'proyectos'}</small>
      </header>
      <div class="cal-week-grid">${dayHtml}</div>
    </section>`;
  }

  function listBlock(week){
    const rows=week.rows.slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.code).localeCompare(String(b.code)));
    const kicker=week.type==='previous'?'SEMANA ANTERIOR':`SEMANA ${String(week.number).padStart(2,'0')}`;
    return `<section class="cal-list-week">
      <header class="cal-list-week-head"><div><span>${kicker}</span><b>${esc(weekRange(week.start))}</b></div><small>${rows.length} ${rows.length===1?'proyecto':'proyectos'}</small></header>
      <div class="cal-list-items">${rows.length?rows.map(item=>{
        const st=statusMeta(item),abbr=serviceCode(item.service,item.kind);
        return `<article class="cal-list-row ${esc(item.kind)}">
          <div class="cal-list-date"><span>${weekday(item.date)}</span><b>${dateObj(item.date).getDate()}</b></div>
          <div class="cal-list-main">
            <div class="cal-list-meta"><span class="cal-project-code">PROYECTO ${esc(item.code||'—')}</span><span class="cal-service-code">${esc(abbr)}</span></div>
            <div class="cal-service-name">${esc(item.service||'Contenido')}</div>
            <h3>${esc(item.title)}</h3>
          </div>
          <div class="cal-project-status ${st.cls}">${st.cls==='approved'?ic('check'):''}<span>${esc(st.label)}</span></div>
        </article>`;
      }).join(''):'<div class="cal-list-empty">Sin proyectos en esta semana.</div>'}</div>
    </section>`;
  }

  function toolbar(plan){
    return `<div class="card cal-toolbar">
      <div class="cal-summary">
        <div><b>${plan.scheduledCount}</b><span>proyectos en calendario</span></div>
        <div><b>${plan.legacyCount}</b><span>proyectos previos</span></div>
        <div><b>${plan.weeks.length}</b><span>semanas visibles</span></div>
      </div>
      <div class="cal-view-switch" role="group" aria-label="Cambiar vista del calendario">
        <button type="button" data-cal-view="week" class="${calendarView==='week'?'active':''}" aria-pressed="${calendarView==='week'}"><span class="cal-view-icon">▦</span> Semana</button>
        <button type="button" data-cal-view="list" class="${calendarView==='list'?'active':''}" aria-pressed="${calendarView==='list'}"><span class="cal-view-icon">☷</span> Lista</button>
      </div>
    </div>
    <div class="cal-explain"><b>Orden simple:</b> los proyectos calendarizados empiezan en <strong>001</strong> desde el 21 de septiembre. Los proyectos que estaban fuera del calendario se organizan en la semana anterior como <strong>A1, A2…</strong>. Esta etiqueta es visual y no cambia la identidad interna del proyecto.</div>`;
  }

  function bindViewButtons(){
    document.querySelectorAll('[data-cal-view]').forEach(btn=>btn.onclick=()=>{
      const next=btn.dataset.calView==='list'?'list':'week';
      if(next===calendarView)return;
      calendarView=next;
      localStorage.setItem(VIEW_KEY,calendarView);
      renderCal();
    });
  }

  async function draw(){
    const host=$('calbox');if(!host)return;
    host.innerHTML='<div class="card cal-loading">Organizando semanas y proyectos…</div>';
    try{
      const plan=await buildPlan();
      calendarError='';
      if(!plan.items.length){
        host.innerHTML='<div class="card empty">Todavía no hay proyectos para ordenar en el calendario.</div>';
        return;
      }
      host.innerHTML=toolbar(plan)+`<div class="cal-plan ${calendarView==='list'?'list-mode':'week-mode'}">${plan.weeks.map(w=>calendarView==='list'?listBlock(w):weekBlock(w)).join('')}</div>`;
      bindViewButtons();
    }catch(e){
      calendarError=e?.message||'No se pudo cargar el calendario.';
      host.innerHTML=`<div class="card empty"><b>No pude cargar el calendario.</b><br>${esc(calendarError)}</div>`;
    }
  }

  renderCal=function(){draw();};
  renderPdet=function(){};

  const previousToggle=typeof toggleRec==='function'?toggleRec:null;
  if(previousToggle){
    toggleRec=async function(item){
      await previousToggle(item);
      planCache=null;
      await draw();
    };
  }

  const previousRefresh=typeof refresh==='function'?refresh:null;
  if(previousRefresh){
    refresh=async function(){
      planCache=null;
      await previousRefresh();
    };
  }

  setTimeout(()=>{planCache=null;draw();},0);
})();
