(()=>{
  'use strict';
  window.PortalTrace?.log('CAL_SCRIPT_START',{version:'28'});

  const VIEW_KEY='do_portal_calendar_view_v5';
  const TELE_HISTORY_KEY='__olanoTeleExitV24';
  const PORTAL_HISTORY_KEY='__olanoPortalGuardV1';
  const WHATSAPP_GROUP_INVITE_URL='https://chat.whatsapp.com/E2zVHOsEd1qEx2nFG3Wexn';
  let calendarView=localStorage.getItem(VIEW_KEY)==='list'?'list':'week';
  let planCache=null,planPromise=null,selectedWeek=0,weekInitialized=false,showingPending=false,selectedMobileDate='',filterService='ALL',filterStatus='ALL';
  let teleExitBusy=false,telePromptOpen=false,teleHistoryArmed=false,teleIgnoreNextPop=false,teleHistorySeq=0,teleFullscreenManualUntil=0,teleSuppressFullscreenExit=false;
  let portalBackSuppressedUntil=0,portalGuardSeq=0;
  const teleTraceRows=[];
  const baseCloseTele=typeof closeTele==='function'?closeTele:null;
  const baseOpenTele=typeof openTele==='function'?openTele:null;

  const pad=n=>String(n).padStart(2,'0');
  const dateObj=iso=>new Date(String(iso)+'T12:00:00');
  const limaToday=()=>{
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const g=t=>p.find(x=>x.type===t)?.value||'';
    return `${g('year')}-${g('month')}-${g('day')}`;
  };
  const TODAY=limaToday();
  const portalSignature=()=>{
    if(typeof P==='undefined'||!P)return '';
    const sessions=(P.sessions||[]).map(x=>`${x.id}:${x.total||0}:${x.recorded||0}`).sort().join('|');
    const cal=(P.calendar_items||[]).map(x=>`${x.calendario_id||''}:${x.content_id||''}:${x.publish_date||''}:${x.slot_status||''}`).sort().join('|');
    return sessions+'||'+cal;
  };
  const waitForPortal=()=>new Promise((resolve,reject)=>{
    let tries=0;
    const tick=()=>{const sig=portalSignature();if(sig){window.PortalTrace?.log('CAL_WAIT_PORTAL_OK',{tries,hasP:Boolean(P),sessions:P?.sessions?.length||0,production_items:P?.production_items?.length||0,calendar_items:P?.calendar_items?.length||0});return resolve(true)}if(++tries===1||tries===20||tries===60)window.PortalTrace?.warn('CAL_WAIT_PORTAL',{tries,hasP:Boolean(typeof P!=='undefined'&&P)});if(tries>80){const e=Error('El portal todavía no terminó de cargar sus datos.');window.PortalTrace?.error('CAL_WAIT_PORTAL_TIMEOUT',{tries,hasP:Boolean(typeof P!=='undefined'&&P)});return reject(e)}setTimeout(tick,75);};
    tick();
  });

  const THEMES={
    TB:{color:'#2868B8',soft:'#EAF2FF'},
    PRP:{color:'#11877E',soft:'#E5F6F3'},
    LF:{color:'#168CB3',soft:'#E6F6FB'},
    RIN:{color:'#625ED1',soft:'#EFEEFF'},
    PAP:{color:'#7D4BC4',soft:'#F2ECFC'},
    BIC:{color:'#C6427B',soft:'#FBEAF2'},
    EQ:{color:'#F06424',soft:'#FFE8DE'},
    DEF:{color:'#52657A',soft:'#EDF2F7'}
  };
  const SERVICE_LABELS={TB:'Toxina botulínica',PRP:'PRP facial',LF:'Limpieza / aparatología',RIN:'Rinoplastia',PAP:'Liposucción de papada',BIC:'Bichectomía',EQ:'Marca / equipo',DEF:'Otros'};

  function serviceFromKey(key){
    return({S1:'TOXINA BOTULÍNICA',S2:'PRP FACIAL',S3:'LIMPIEZA FACIAL / APARATOLOGÍA',S4:'LIPOSUCCIÓN DE PAPADA',S5:'BICHECTOMÍA',S6:'RINOPLASTIA'})[String(key||'').toUpperCase()]||'CONTENIDO';
  }
  function serviceCode(service,kind){
    if(kind==='capture')return'EQ';
    const v=String(service||'').toUpperCase();
    if(v.includes('TOX'))return'TB';
    if(v.includes('PRP'))return'PRP';
    if(v.includes('RINOP'))return'RIN';
    if(v.includes('PAPADA'))return'PAP';
    if(v.includes('BICHE'))return'BIC';
    if(v.includes('LIMPIEZA')||v.includes('HIDRA')||v.includes('APARATOLOG'))return'LF';
    return'DEF';
  }
  function themeFor(service,kind){
    const code=serviceCode(service,kind);
    return{code:code==='DEF'?'VID':code,...(THEMES[code]||THEMES.DEF)};
  }
  function cssVars(item){
    const t=themeFor(item.service,item.kind);
    return`--svc:${t.color};--svc-soft:${t.soft}`;
  }
  function weekRange(start,end){
    const a=dateObj(start),b=dateObj(end);
    const ma=new Intl.DateTimeFormat('es-PE',{month:'short'}).format(a).replace('.','');
    const mb=new Intl.DateTimeFormat('es-PE',{month:'short'}).format(b).replace('.','');
    return a.getMonth()===b.getMonth()
      ?`${a.getDate()}–${b.getDate()} ${mb}. ${b.getFullYear()}`
      :`${a.getDate()} ${ma}.–${b.getDate()} ${mb}. ${b.getFullYear()}`;
  }
  function weekday(iso){return new Intl.DateTimeFormat('es-PE',{weekday:'short'}).format(dateObj(iso)).replace('.','').toUpperCase();}
  function dayOfMonth(iso){return dateObj(iso).getDate();}
  function compactDate(iso){
    const p=new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short'}).formatToParts(dateObj(iso));
    const d=p.find(x=>x.type==='day')?.value||'',m=(p.find(x=>x.type==='month')?.value||'').replace('.','').toUpperCase();
    return`${d} ${m}`;
  }
  function pieceRecorded(piece,item){
    return item?.estado==='GRABADO'||piece?.estado==='RECORDED'||piece?.estado==='PUBLISHED'||piece?.production_status?.RECORDED===true;
  }
  function canonicalNo(item){
    const p=item?.pieza||item?.piece||{};
    return Number(p?.metadata?.project_ref_v1?.project_number)||999999;
  }
  function currentWeekIndex(weeks){
    if(!weeks.length)return 0;
    const inside=weeks.findIndex(w=>w.start<=TODAY&&TODAY<=w.end);
    if(inside>=0)return inside;
    const future=weeks.findIndex(w=>w.start>TODAY);
    return future>=0?future:weeks.length-1;
  }
  function roleLabel(role){
    const map={
      DOLOR_IDENTIFICACION:'Identificación',VALOR_EDUCACION:'Valor / educación',AUTORIDAD_CONFIANZA:'Autoridad / confianza',
      OBJECION:'Objeción',VENTA_SUAVE:'Venta suave',HUMANIZACION:'Humanización',COMUNIDAD_RELACION:'Comunidad / relación'
    };
    return map[String(role||'').toUpperCase()]||'';
  }

  async function buildPlan(force=false){
    window.PortalTrace?.log('CAL_BUILD_START',{force,cache:Boolean(planCache),promise:Boolean(planPromise)});
    if(!force&&planCache){window.PortalTrace?.log('CAL_BUILD_CACHE_HIT');return planCache;}
    if(!force&&planPromise){window.PortalTrace?.log('CAL_BUILD_PROMISE_REUSE');return planPromise;}
    planPromise=(async()=>{
      await waitForPortal();
      window.PortalTrace?.log('CAL_AFTER_WAIT',{production_items:P?.production_items?.length||0,calendar_items:P?.calendar_items?.length||0});
      const rawCalendar=Array.isArray(P?.calendar_items)?P.calendar_items.slice():[];
      const productionItems=Array.isArray(P?.production_items)?P.production_items.slice():[];
      window.PortalTrace?.log('CAL_RAW_DATA',{rawCalendar:rawCalendar.length,productionItems:productionItems.length,sampleCalendar:rawCalendar.slice(0,2).map(x=>({date:x.publish_date,slot_status:x.slot_status,calendar:x.calendar_key,has_piece:Boolean(x.pieza)}))});
      const weekMap=new Map();
      for(const x of rawCalendar){
        const id=x?.calendario_id||x?.id;
        if(id&&!weekMap.has(id))weekMap.set(id,{id,calendar_key:x.calendar_key||'',status:x.status||'ACTIVE',week_start:x.week_start,week_end:x.week_end});
      }
      const calendarData={slots:rawCalendar,weeks:[...weekMap.values()]};
      window.PortalTrace?.log('CAL_WEEK_MAP',{weeks:calendarData.weeks.length,weekKeys:calendarData.weeks.map(x=>({id:Boolean(x.id),start:x.week_start,end:x.week_end,key:x.calendar_key}))});
      const sessionMap=new Map();
      for(const item of productionItems){const id=item?.pieza?.id;if(id&&!sessionMap.has(id))sessionMap.set(id,item);}

      const rawSlots=Array.isArray(calendarData.slots)?calendarData.slots.slice():[];
      rawSlots.sort((a,b)=>String(a.publish_date).localeCompare(String(b.publish_date))||String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id).localeCompare(String(b.id)));
      const officialIds=new Set();
      const scheduled=rawSlots.map((slot,i)=>{
        const sessionItem=slot.content_id?sessionMap.get(slot.content_id):null,piece=slot.pieza||sessionItem?.pieza||null;
        const isTest=Boolean(piece?.test_id||piece?.metadata?.test_id||piece?.metadata?.portal_test===true);
        const code=isTest?'PRUEBA':String(i+1).padStart(3,'0');
        if(slot.content_id)officialIds.add(slot.content_id);
        const special=(window.DoctorPortalSpecials||[]).find(x=>x?.iso===slot.publish_date);
        const isCapture=!slot.content_id&&String(slot.slot_status||slot.status||'').toUpperCase()==='NEEDS_CAPTURE';
        const kind=slot.content_id?'scheduled':(isCapture?'capture':'placeholder');
        const title=piece?.titulo||piece?.tema||(kind==='capture'?(special?.subtitle||special?.title||'Captura especial'):`Guion pendiente${slot.editorial_key?' · '+slot.editorial_key:''}`);
        const service=piece?.servicio||(kind==='capture'?'MARCA / EQUIPO':serviceFromKey(slot.service_key));
        return{
          kind,code,date:slot.publish_date,calendarId:slot.calendario_id,content_id:slot.content_id||null,title,service,isTest,
          role:isTest?'PRUEBA CONTROLADA':roleLabel(slot.strategic_role),slot_status:slot.slot_status||slot.status||'',piece,sessionItem,special,
          recorded:piece?pieceRecorded(piece,sessionItem):false
        };
      });

      const weeks=(calendarData.weeks||[]).slice().sort((a,b)=>String(a.week_start).localeCompare(String(b.week_start))).map((w,i)=>({
        id:w.id,key:w.calendar_key,start:w.week_start,end:w.week_end,status:w.status,number:i+1,
        rows:scheduled.filter(x=>x.calendarId===w.id)
      }));

      const externalMap=new Map();
      for(const item of productionItems){
        const id=item?.pieza?.id;
        if(id&&!officialIds.has(id)&&!externalMap.has(id))externalMap.set(id,item);
      }
      const external=[...externalMap.values()].sort((a,b)=>canonicalNo(a)-canonicalNo(b)||pt(a?.pieza).localeCompare(pt(b?.pieza),'es')).map((item,i)=>({
        kind:'legacy',code:`A${i+1}`,date:null,content_id:item.pieza.id,title:pt(item.pieza),service:item.pieza.servicio||'',
        role:'Fuera del calendario oficial',piece:item.pieza,sessionItem:item,recorded:pieceRecorded(item.pieza,item)
      }));

      const pending=[
        ...scheduled.filter(x=>x.content_id&&!x.recorded&&!x.isTest),
        ...external.filter(x=>!x.recorded)
      ];

      if(!weekInitialized){
        selectedWeek=currentWeekIndex(weeks);
        weekInitialized=true;
      }else selectedWeek=Math.max(0,Math.min(weeks.length-1,selectedWeek));

      planCache={weeks,scheduled,external,pending,officialIds};
      window.PortalTrace?.log('CAL_PLAN_READY',{weeks:weeks.length,scheduled:scheduled.length,external:external.length,pending:pending.length,selectedWeek});
      planPromise=null;
      return planCache;
    })().catch(e=>{planPromise=null;window.PortalTrace?.error('CAL_BUILD_FAIL',{name:e?.name||'',message:e?.message||String(e),stack:e?.stack||'',p:{sessions:P?.sessions?.length||0,production_items:P?.production_items?.length||0,calendar_items:P?.calendar_items?.length||0}});throw e;});
    return planPromise;
  }

  function matchesFilters(item){
    if(filterService!=='ALL'&&serviceCode(item.service,item.kind)!==filterService)return false;
    if(filterStatus==='RECORDED'&&!item.recorded)return false;
    if(filterStatus==='PENDING'&&item.recorded)return false;
    return true;
  }
  function filteredWeek(week){
    return {...week,rows:(week?.rows||[]).filter(matchesFilters)};
  }
  function renderHeroFilters(plan){
    const mount=$('calendarHeroFilters');if(!mount)return;
    const codes=[...new Set((plan?.scheduled||[]).map(x=>serviceCode(x.service,x.kind)).filter(Boolean))];
    codes.sort((a,b)=>(SERVICE_LABELS[a]||a).localeCompare(SERVICE_LABELS[b]||b,'es'));
    const serviceOptions=['<option value="ALL">Todos los servicios</option>',...codes.map(code=>`<option value="${esc(code)}" ${filterService===code?'selected':''}>${esc(SERVICE_LABELS[code]||code)}</option>`)].join('');
    mount.innerHTML=`<div class="calendar-filter-controls">
      <label><span>Servicio</span><select id="calendarServiceFilter">${serviceOptions}</select></label>
      <label><span>Estado de grabación</span><select id="calendarStatusFilter">
        <option value="ALL" ${filterStatus==='ALL'?'selected':''}>Todos</option>
        <option value="PENDING" ${filterStatus==='PENDING'?'selected':''}>No grabados</option>
        <option value="RECORDED" ${filterStatus==='RECORDED'?'selected':''}>Grabados</option>
      </select></label>
    </div>`;
    const sf=$('calendarServiceFilter'),st=$('calendarStatusFilter');
    if(sf)sf.onchange=()=>{filterService=sf.value||'ALL';selectedMobileDate='';draw();};
    if(st)st.onchange=()=>{filterStatus=st.value||'ALL';selectedMobileDate='';draw();};
  }

  function statusMeta(item){
    if(item.isTest&&item.recorded)return{label:'PRUEBA COMPLETADA',cls:'recorded',icon:'check'};
    if(item.isTest)return{label:'PRUEBA · FALTA GRABAR',cls:'ready',icon:'cam'};
    if(item.recorded)return{label:'YA GRABADO',cls:'recorded',icon:'check'};
    if(item.kind==='capture')return{label:'CAPTURA PENDIENTE',cls:'capture',icon:'cam'};
    if(item.kind==='placeholder')return{label:'GUION PENDIENTE',cls:'pending',icon:'msg'};
    if(item.kind==='legacy')return{label:'FALTA GRABAR',cls:'needs-recording',icon:'cam'};
    if(item.content_id)return{label:'FALTA GRABAR',cls:'needs-recording',icon:'cam'};
    return{label:'PENDIENTE',cls:'pending',icon:'msg'};
  }

  function projectLabel(item){return item?.isTest?`PROYECTO PRUEBA${item.date?' · '+compactDate(item.date):''}`:`PROYECTO ${item.code}${item.date?' · '+compactDate(item.date):''}`;}

  function card(item,list=false){
    const st=statusMeta(item),theme=themeFor(item.service,item.kind);
    const interactive=item.kind==='capture'||Boolean(item.content_id);
    const target=item.kind==='capture'?'data-special="capture"':(item.content_id?`data-content="${esc(item.content_id)}"`:'data-placeholder="true"');
    const affordance=interactive?`tabindex="0" role="button"`:'aria-disabled="true"';
    const arrow=interactive?`<span class="cal-card-arrow">${ic('right')}</span>`:'';
    if(list){
      return`<article class="cal-list-row ${esc(item.kind)} ${item.recorded?'is-recorded':''}" style="${cssVars(item)}" ${target} data-code="${esc(item.code)}" ${affordance}>
        ${item.recorded?'<div class="cal-recorded-check list-check">✓</div>':''}
        <div class="cal-list-date"><span>${item.date?weekday(item.date):'PEND.'}</span><b>${item.date?dayOfMonth(item.date):'!'}</b></div>
        <div class="cal-list-main">
          <div class="cal-list-meta"><span class="cal-project-code">PROYECTO ${esc(item.code)}</span><span class="cal-service-code">${esc(theme.code)}</span></div>
          <div class="cal-service-name">${esc(item.service||'Contenido')}</div>
          <h3>${esc(item.title)}</h3>${item.role?`<p class="cal-role">${esc(item.role)}</p>`:''}
        </div>
        <div class="cal-project-status ${st.cls}">${st.icon?ic(st.icon):''}<span>${esc(st.label)}</span></div>
        <span class="cal-card-arrow list-arrow">${ic('right')}</span>
      </article>`;
    }
    return`<article class="cal-project ${esc(item.kind)} ${item.recorded?'is-recorded':''}" style="${cssVars(item)}" ${target} data-code="${esc(item.code)}" ${affordance} ${interactive?`aria-label="Abrir ${esc(item.title)}"`:''}>
      ${item.recorded?'<div class="cal-recorded-check" aria-label="Grabado">✓</div>':''}
      <div class="cal-project-top"><span class="cal-project-code">PROYECTO ${esc(item.code)}</span>${arrow}</div>
      <div class="cal-service-row"><span class="cal-service-code">${esc(theme.code)}</span><span class="cal-service-name">${esc(item.service||'Contenido')}</span></div>
      <h3>${esc(item.title)}</h3>
      ${item.role?`<p class="cal-role">${esc(item.role)}</p>`:''}
      <div class="cal-project-status ${st.cls}">${st.icon?ic(st.icon):''}<span>${esc(st.label)}</span></div>
    </article>`;
  }

  function weekDates(week){
    return Array.from({length:7},(_,i)=>{const d=new Date(dateObj(week.start));d.setDate(d.getDate()+i);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;});
  }
  function ensureMobileDate(week){
    const dates=weekDates(week);
    if(!dates.includes(selectedMobileDate)){
      if(TODAY>=week.start&&TODAY<=week.end)selectedMobileDate=TODAY;
      else selectedMobileDate=week.rows.find(x=>x.date)?.date||week.start;
    }
    return selectedMobileDate;
  }
  function mobileWeekStrip(week){
    ensureMobileDate(week);
    const days=weekDates(week).map(date=>{
      const rows=week.rows.filter(x=>x.date===date);
      const chips=rows.length?rows.map(x=>`<span class="mobile-project-chip ${x.recorded?'done':'todo'}">P${esc(x.code)}</span>`).join(''):'<span class="mobile-project-chip empty">—</span>';
      return `<button type="button" class="mobile-day ${selectedMobileDate===date?'selected':''} ${date===TODAY?'today':''}" data-mobile-date="${date}"><span>${weekday(date)}</span><b>${dayOfMonth(date)}</b><div>${chips}</div></button>`;
    }).join('');
    return `<div class="cal-mobile-weekstrip" aria-label="Semana rápida">${days}</div>`;
  }
  function mobileSelected(week){
    ensureMobileDate(week);
    const rows=week.rows.filter(x=>x.date===selectedMobileDate);
    return `<div class="cal-mobile-selected" id="calendarSelectedDay">${rows.length?rows.map(x=>card(x)).join(''):'<div class="cal-mobile-empty">No hay proyecto este día.</div>'}</div>`;
  }

  function weekGrid(week){
    const days=[];
    for(let i=0;i<7;i++){
      const d=new Date(dateObj(week.start));d.setDate(d.getDate()+i);
      const date=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,rows=week.rows.filter(x=>x.date===date);
      days.push(`<div class="cal-week-day ${date===TODAY?'today':''}" ${rows.length?`style="${cssVars(rows[0])}"`:''}>
        <div class="cal-date-head"><span>${weekday(date)}</span><b>${dayOfMonth(date)}</b>${date===TODAY?'<i>HOY</i>':''}</div>
        <div class="cal-day-projects">${rows.length?rows.map(x=>card(x)).join(''):'<div class="cal-empty-day"><span>Sin proyecto</span></div>'}</div>
      </div>`);
    }
    return`<section class="cal-week-block">
      <header class="cal-week-head"><div><span>SEMANA ${String(week.number).padStart(2,'0')}</span><h2>${esc(weekRange(week.start,week.end))}</h2></div><small>${week.rows.length} ${week.rows.length===1?'proyecto':'proyectos'}</small></header>
      <div class="cal-week-grid">${days.join('')}</div>
      ${mobileSelected(week)}
    </section>`;
  }

  function weekList(week){
    return`<section class="cal-list-week"><header class="cal-list-week-head"><div><span>SEMANA ${String(week.number).padStart(2,'0')}</span><b>${esc(weekRange(week.start,week.end))}</b></div><small>${week.rows.length} ${week.rows.length===1?'proyecto':'proyectos'}</small></header>
      <div class="cal-list-items">${week.rows.length?week.rows.map(x=>card(x,true)).join(''):'<div class="cal-list-empty">Sin proyectos en esta semana.</div>'}</div>
    </section>`;
  }

  function toolbar(plan){
    const week=plan.weeks[selectedWeek],pending=plan.pending.length;
    return`<div class="card cal-toolbar">
      <div class="cal-week-nav">
        <button type="button" data-week-move="-1" ${selectedWeek<=0?'disabled':''} aria-label="Semana anterior">${ic('left')}</button>
        <div><b>Semana ${String(week?.number||1).padStart(2,'0')}</b><span>${week?esc(weekRange(week.start,week.end)):''}</span></div>
        <button type="button" data-week-move="1" ${selectedWeek>=plan.weeks.length-1?'disabled':''} aria-label="Semana siguiente">${ic('right')}</button>
      </div>
      <div class="cal-toolbar-actions">
        <div class="cal-view-switch" role="group" aria-label="Cambiar vista"><button type="button" data-cal-view="week" class="${calendarView==='week'?'active':''}">▦ <span>Semana</span></button><button type="button" data-cal-view="list" class="${calendarView==='list'?'active':''}">☷ <span>Lista</span></button></div>
      </div>
    </div>`;
  }

  function recordingStatus(plan){
    const pending=(plan?.pending||[]).length;
    if(pending)return `<div class="cal-recording-status"><button type="button" class="record-alert calendar-record-alert" data-show-pending aria-label="${pending} guiones pendientes de grabar"><span class="record-alert-dot">!</span><b>${pending}</b><span>por grabar</span></button></div>`;
    return `<div class="cal-recording-status"><div class="record-alert all-done"><span class="record-alert-dot">✓</span><b>Estás al día</b></div></div>`;
  }

  function pendingPanel(plan){
    return`<div class="pending-recordings">
      <div class="card pending-hero"><div class="pending-alert-icon">!</div><div><span>PENDIENTES DE GRABACIÓN</span><h2>${plan.pending.length} ${plan.pending.length===1?'guion pendiente':'guiones pendientes'}</h2><p>Esta lista reúne únicamente piezas que todavía no han sido reportadas como grabadas. Los códigos A1, A2… se reservan para piezas fuera del calendario oficial.</p></div></div>
      <div class="pending-grid">${plan.pending.length?plan.pending.map(x=>card(x,true)).join(''):'<div class="card pending-empty"><b>Todo grabado.</b><br>No quedan guiones pendientes.</div>'}</div>
    </div>`;
  }

  function bindCards(origin='calendar'){
    document.querySelectorAll('[data-content]').forEach(el=>{
      const open=()=>window.DoctorPortalProjects?.openCalendarItem?.(el.dataset.content,`PROYECTO ${el.dataset.code||''}`,origin);
      el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
    });
    document.querySelectorAll('[data-special]').forEach(el=>{
      const open=()=>window.DoctorPortalProjects?.openCalendarSpecial?.(el.dataset.special);
      el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
    });
  }

  function bindCalendar(plan){
    document.querySelectorAll('[data-week-move]').forEach(btn=>btn.onclick=()=>{
      selectedWeek=Math.max(0,Math.min(plan.weeks.length-1,selectedWeek+(Number(btn.dataset.weekMove)||0)));
      selectedMobileDate='';
      draw();
    });
    document.querySelectorAll('[data-cal-view]').forEach(btn=>btn.onclick=()=>{
      calendarView=btn.dataset.calView==='list'?'list':'week';localStorage.setItem(VIEW_KEY,calendarView);draw();
    });
    document.querySelectorAll('[data-mobile-date]').forEach(btn=>btn.onclick=async()=>{
      selectedMobileDate=btn.dataset.mobileDate||'';
      await draw();
      setTimeout(()=>document.getElementById('calendarSelectedDay')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    });
    document.querySelector('[data-show-pending]')?.addEventListener('click',()=>showPending());
    bindCards('calendar');
  }

  async function draw(force=false){
    showingPending=false;
    const host=$('calbox');if(!host){window.PortalTrace?.error('CAL_NO_HOST','No existe #calbox');return;}
    window.PortalTrace?.log('CAL_DRAW_START',{force});
    host.innerHTML='<div class="card cal-loading">Cargando calendario oficial…</div>';
    try{
      const plan=await buildPlan(force);
      window.PortalTrace?.log('CAL_DRAW_PLAN',{weeks:plan?.weeks?.length||0,selectedWeek});
      if(!plan.weeks.length){host.innerHTML='<div class="card empty">Todavía no hay semanas oficiales en el calendario.</div>';return;}
      const baseWeek=plan.weeks[selectedWeek],week=filteredWeek(baseWeek);
      window.DoctorPortalProjects?.clearBottomBack?.();
      renderHeroFilters(plan);
      ensureMobileDate(week);
      host.innerHTML=mobileWeekStrip(week)+toolbar(plan)+recordingStatus(plan)+(calendarView==='list'?weekList(week):weekGrid(week));
      bindCalendar(plan);
      window.PortalTrace?.log('CAL_DRAW_OK',{week:selectedWeek+1,start:week?.start,end:week?.end,cards:host.querySelectorAll('[data-content],[data-special],[data-placeholder]').length,text:host.innerText.slice(0,180)});
    }catch(e){window.PortalTrace?.error('CAL_DRAW_FAIL',{name:e?.name||'',message:e?.message||String(e),stack:e?.stack||'',selectedWeek,hasP:Boolean(typeof P!=='undefined'&&P)});host.innerHTML=`<div class="card empty"><b>No pude cargar el calendario.</b><br>${esc(e?.message||'No se pudo cargar.')}</div>`;}
  }

  async function showPending(force=false){
    showingPending=true;
    const host=$('calbox');if(!host)return;
    host.innerHTML='<div class="card cal-loading">Buscando guiones pendientes…</div>';
    try{
      const plan=await buildPlan(force);
      renderHeroFilters(plan);
      host.innerHTML=pendingPanel(plan);
      window.DoctorPortalProjects?.showBottomBack?.(()=>{selectedWeek=currentWeekIndex(plan.weeks);selectedMobileDate='';showingPending=false;draw();});
      bindCards('pending');
    }catch(e){host.innerHTML=`<div class="card empty"><b>No pude cargar los pendientes.</b><br>${esc(e?.message||'No se pudo cargar.')}</div>`;}
  }

  function teleExitTrace(event,detail={}){
    window.PortalTrace?.log('TELE_EXIT_'+String(event),detail);
  }
  function armTeleHistory(reason='open'){
    if(teleHistoryArmed)return;
    try{
      teleHistorySeq+=1;
      history.pushState({...history.state,[TELE_HISTORY_KEY]:teleHistorySeq},'',location.href);
      teleHistoryArmed=true;
      teleExitTrace('BACK_ARMED',{reason,seq:teleHistorySeq});
    }catch(e){window.PortalTrace?.warn('TELE_HISTORY_ARM_FAIL',{message:e?.message||String(e)});}
  }
  function releaseTeleHistory(reason='close'){
    if(!teleHistoryArmed)return;
    teleHistoryArmed=false;
    try{
      if(history.state?.[TELE_HISTORY_KEY]){
        teleIgnoreNextPop=true;
        portalBackSuppressedUntil=Date.now()+850;
        history.back();
        setTimeout(()=>{teleIgnoreNextPop=false;},500);
      }
      teleExitTrace('BACK_RELEASED',{reason});
    }catch(e){teleIgnoreNextPop=false;window.PortalTrace?.warn('TELE_HISTORY_RELEASE_FAIL',{message:e?.message||String(e)});}
  }
  function ensureRecordPrompt(){
    let o=document.getElementById('recordConfirmOverlay');if(o)return o;
    o=document.createElement('div');o.id='recordConfirmOverlay';o.className='record-confirm-overlay';o.setAttribute('aria-hidden','true');
    o.innerHTML=`<div class="record-confirm-card" role="dialog" aria-modal="true" aria-labelledby="recordConfirmTitle">
      <div class="record-confirm-icon">${ic('cam')}</div>
      <span class="record-confirm-kicker">ANTES DE SALIR</span>
      <h2 id="recordConfirmTitle">¿Ya cumpliste con grabar?</h2>
      <p id="recordConfirmCopy">Confirma el estado antes de salir del teleprompter.</p>
      <div id="recordConfirmError" class="record-confirm-error"></div>
      <div class="record-confirm-actions"><button type="button" id="recordNoBtn">No grabé</button><button type="button" id="recordYesBtn" class="yes">${ic('check')} Sí, grabé</button></div>
    </div>`;
    document.body.appendChild(o);
    document.getElementById('recordNoBtn').onclick=()=>finishTeleExit(false);
    document.getElementById('recordYesBtn').onclick=()=>finishTeleExit(true);
    return o;
  }
  function showExitPrompt(source='salida'){
    const o=ensureRecordPrompt(),pieceAlready=pieceRecorded(Item?.pieza,Item),sessionAlready=Item?.estado==='GRABADO';
    telePromptOpen=true;
    $('recordConfirmError').textContent='';
    $('recordYesBtn').disabled=false;
    $('recordConfirmCopy').textContent=pieceAlready&&!sessionAlready
      ? 'Este video ya figura grabado o publicado, pero la sesión todavía está pendiente. Confirma para sincronizarla.'
      : 'Si eliges “Sí, grabé”, el estado se actualizará en el calendario y en el control de grabación.';
    o.dataset.source=source;o.classList.add('on');o.setAttribute('aria-hidden','false');
    teleExitTrace('AVISO_VISIBLE',{source,calendarDirect:Boolean(S?._calendarDirect),hasSessionPiece:Boolean(Item?.session_piece_id),pieceAlready,sessionAlready});
  }
  function hideExitPrompt(reason='hide'){
    const o=$('recordConfirmOverlay');telePromptOpen=false;
    if(o){o.classList.remove('on');o.setAttribute('aria-hidden','true');}
    teleExitTrace('AVISO_OCULTO',{reason});
  }
  async function closeTeleAfterDecision(reason='close'){
    teleExitTrace('CERRANDO_TELEPROMPTER',{reason});
    await baseCloseTele?.();
    releaseTeleHistory(reason);

  }
  async function requestTeleExit(e,source='x'){
    if(e){e.preventDefault?.();e.stopPropagation?.();}
    if(!$('tele')?.classList.contains('on'))return;
    if(telePromptOpen){teleExitTrace('SALIDA_IGNORADA_AVISO_ABIERTO',{source});return;}
    if(teleExitBusy){teleExitTrace('SALIDA_DUPLICADA',{source});return;}
    teleExitBusy=true;
    teleExitTrace('SALIDA_SOLICITADA',{source,fullscreen:Boolean(document.fullscreenElement),calendarDirect:Boolean(S?._calendarDirect),itemState:Item?.estado||null,sessionPiece:Item?.session_piece_id||null});
    try{
      if(document.fullscreenElement){
        teleSuppressFullscreenExit=true;
        try{await document.exitFullscreen();teleExitTrace('FULLSCREEN_CERRADO',{source});}catch(err){teleExitTrace('FULLSCREEN_ERROR',{message:err?.message||String(err)});}
        await new Promise(r=>setTimeout(r,80));
        setTimeout(()=>{teleSuppressFullscreenExit=false;},350);
      }
      if(!Item){
        teleExitTrace('SIN_ITEM',{source});
        await closeTeleAfterDecision('sin-item');
        return;
      }
      if(Item?.estado==='GRABADO'){
        teleExitTrace('YA_GRABADO',{source});
        await closeTeleAfterDecision('ya-grabado');
        return;
      }
      showExitPrompt(source);
    }finally{teleExitBusy=false;}
  }
  function reportDateText(raw){
    const iso=String(raw||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return 'Fecha no programada';
    const d=new Date(iso+'T12:00:00');
    const value=new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d);
    return value.charAt(0).toUpperCase()+value.slice(1);
  }
  function recordingReportMeta(item){
    const calendarRow=(P?.calendar_items||[]).find(x=>x?.content_id===item?.pieza?.id)||null;
    const project=(item?.__calendarLabel||window.DoctorPortalProjects?.labelFor?.(item)||'PROYECTO SIN NÚMERO').replace(/\s*·.*$/,'').trim();
    const date=item?.__calendarDate||calendarRow?.publish_date||S?.session?.fecha||TODAY;
    return{project,date,title:pt(item?.pieza),content_id:item?.pieza?.id||null};
  }
  function buildRecordingWhatsAppReport(item){
    const m=recordingReportMeta(item);
    return[
      '📢 *REPORTE DE GRABACIÓN – DR. OLANO*',
      '',
      '✅ *Estado:* VIDEO GRABADO',
      '📅 *Día:* '+reportDateText(m.date),
      '🆔 *Proyecto:* '+m.project,
      '🎬 *Video:* '+m.title,
      '',
      '📎 *Siguiente paso:* En breve se enviará el video en formato de archivo.'
    ].join('\n');
  }
  async function copyRecordingReport(text){
    try{sessionStorage.setItem('do_last_recording_report',text);}catch{}
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(text);
        window.PortalTrace?.log('WHATSAPP_REPORT_COPIED',{method:'clipboard'});
        return true;
      }
    }catch(e){window.PortalTrace?.warn('WHATSAPP_REPORT_COPY_FAIL',{method:'clipboard',message:e?.message||String(e)});}
    try{
      const ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();
      const ok=document.execCommand('copy');
      ta.remove();
      window.PortalTrace?.log('WHATSAPP_REPORT_COPIED',{method:'execCommand',ok});
      return Boolean(ok);
    }catch(e){
      window.PortalTrace?.warn('WHATSAPP_REPORT_COPY_FAIL',{method:'execCommand',message:e?.message||String(e)});
      return false;
    }
  }
  function ensureWhatsAppHandoff(){
    let o=document.getElementById('whatsappHandoffOverlay');
    if(o)return o;
    o=document.createElement('div');
    o.id='whatsappHandoffOverlay';
    o.className='whatsapp-handoff-overlay';
    o.setAttribute('aria-hidden','true');
    o.innerHTML=`<div class="whatsapp-handoff-card" role="dialog" aria-modal="true" aria-labelledby="whatsappHandoffTitle">
      <div class="whatsapp-handoff-icon">✓</div>
      <span class="whatsapp-handoff-kicker">REPORTE LISTO</span>
      <h2 id="whatsappHandoffTitle">Reporte copiado</h2>
      <p>Ahora abriremos directamente el grupo del Dr. Olano.</p>
      <div class="whatsapp-handoff-step"><b>1</b><span>Toca el cuadro <strong>Mensaje</strong> para abrir el teclado.</span></div>
      <div class="whatsapp-handoff-step"><b>2</b><span>Pulsa <strong>PEGAR</strong> y luego envía el reporte.</span></div>
      <div class="whatsapp-handoff-actions">
        <button type="button" id="whatsappHandoffCopyBtn">COPIAR OTRA VEZ</button>
        <button type="button" id="whatsappHandoffOpenBtn" class="open">ABRIR GRUPO DEL DR. OLANO</button>
      </div>
    </div>`;
    document.body.appendChild(o);
    return o;
  }
  async function showRecordingReportHandoff(item){
    const text=buildRecordingWhatsAppReport(item);
    const copied=await copyRecordingReport(text);
    const o=ensureWhatsAppHandoff();
    o.classList.add('on');o.setAttribute('aria-hidden','false');
    const copyBtn=$('whatsappHandoffCopyBtn'),openBtn=$('whatsappHandoffOpenBtn');
    if(copyBtn)copyBtn.onclick=async()=>{
      const ok=await copyRecordingReport(text);
      copyBtn.textContent=ok?'✓ COPIADO':'COPIAR OTRA VEZ';
      setTimeout(()=>{copyBtn.textContent='COPIAR OTRA VEZ';},1600);
    };
    if(openBtn)openBtn.onclick=async()=>{
      openBtn.disabled=true;
      openBtn.textContent='ABRIENDO WHATSAPP…';
      await copyRecordingReport(text);
      window.PortalTrace?.log('WHATSAPP_GROUP_REDIRECT_START',{invite_url:WHATSAPP_GROUP_INVITE_URL,content_id:item?.pieza?.id||null,project:item?.__calendarLabel||null,copied});
      window.location.href=WHATSAPP_GROUP_INVITE_URL;
      setTimeout(()=>{openBtn.disabled=false;openBtn.textContent='ABRIR GRUPO DEL DR. OLANO';},2200);
    };
    window.PortalTrace?.log('WHATSAPP_HANDOFF_VISIBLE',{content_id:item?.pieza?.id||null,copied});
  }
  function armPortalBackGuard(reason='init'){
    try{
      if(history.state?.[PORTAL_HISTORY_KEY])return;
      portalGuardSeq+=1;
      history.pushState({...history.state,[PORTAL_HISTORY_KEY]:portalGuardSeq},'',location.href);
      window.PortalTrace?.log('PORTAL_BACK_GUARD_ARMED',{reason,seq:portalGuardSeq});
    }catch(e){window.PortalTrace?.warn('PORTAL_BACK_GUARD_FAIL',{message:e?.message||String(e)});}
  }
  async function handlePortalBrowserBack(e){
    if(Date.now()<portalBackSuppressedUntil)return;
    if($('tele')?.classList.contains('on'))return;
    window.PortalTrace?.log('PORTAL_BACK_DETECTED',{view:document.querySelector('.view.on')?.id||null,pending:showingPending,week:selectedWeek,state:e?.state||null});
    const vdetail=$('vdetail'),sdetail=$('sdetail');
    let handled=false,action='root-protected';
    if(vdetail&&vdetail.style.display!=='none'){
      handled=true;action='project-detail';$('vback')?.click();
    }else if(sdetail&&sdetail.style.display!=='none'){
      handled=true;action='session-detail';$('sback')?.click();
    }else if(showingPending){
      handled=true;action='pending-to-calendar';showingPending=false;selectedMobileDate='';await draw();
    }else{
      const view=document.querySelector('.view.on')?.id||'calendar';
      if(view==='history'||view==='record'){
        handled=true;action=view+'-to-calendar';resetViews();tab('calendar');await draw();
      }else if(view==='calendar'&&selectedWeek>0){
        handled=true;action='previous-week';selectedWeek-=1;selectedMobileDate='';await draw();
      }
    }
    window.PortalTrace?.log('PORTAL_BACK_HANDLED',{handled,action});
    setTimeout(()=>armPortalBackGuard('after-back'),0);
  }

  async function finishTeleExit(recorded){
    const source=$('recordConfirmOverlay')?.dataset.source||'aviso';
    if(!recorded){
      teleExitTrace('RESPUESTA_NO_GRABE',{source});
      hideExitPrompt('no-grabe');
      await closeTeleAfterDecision('no-grabe');
      return;
    }
    const yes=$('recordYesBtn'),error=$('recordConfirmError');
    yes.disabled=true;error.textContent='Guardando y sincronizando…';
    teleExitTrace('RESPUESTA_SI_GRABE',{source,content_id:Item?.pieza?.id||null,session_piece_id:Item?.session_piece_id||null});
    const origin=S?._calendarOrigin||'calendar',calendarDirect=Boolean(S?._calendarDirect);
    let result=null;
    try{
      result=await window.DoctorPortalProjects?.markCalendarRecorded?.(Item);
      if(!result?.ok&&Item?.session_piece_id){
        await api('mark_piece',{session_piece_id:Item.session_piece_id,estado:'GRABADO'});
        P=await api('portal_get');
        result={ok:true,fallback:true};
      }
    }catch(e){result={ok:false,message:e?.message||String(e)};}
    if(!result?.ok){
      error.textContent=result?.message||'No se pudo marcar como grabado.';
      yes.disabled=false;
      teleExitTrace('GUARDADO_ERROR',{message:error.textContent});
      return;
    }
    if(Item)Item.estado='GRABADO';
    const reportItem=Item;
    teleExitTrace('GUARDADO_OK',{calendarDirect,origin,session_synced:result?.session_synced!==false});
    hideExitPrompt('guardado');
    await closeTeleAfterDecision('grabado');
    planCache=null;planPromise=null;
    if(calendarDirect){
      S=null;resetViews();tab('calendar');
      if(origin==='pending')await showPending(true);else await draw(true);
    }else{
      try{if(typeof renderHist==='function')renderHist();}catch{}
    }
    setTimeout(()=>showRecordingReportHandoff(reportItem),180);
  }

  function installExitHooks(){
    if(baseOpenTele&&baseOpenTele.__olanoExitWrapped!==true){
      const wrapped=function(x){
        const result=baseOpenTele(x);
        armTeleHistory('teleprompter-open');
        teleExitTrace('TELEPROMPTER_ABIERTO',{content_id:x?.pieza?.id||null,title:pt(x?.pieza),calendarDirect:Boolean(S?._calendarDirect),sessionPiece:x?.session_piece_id||null});
        return result;
      };
      wrapped.__olanoExitWrapped=true;
      openTele=wrapped;
    }
    const top=$('closeb'),bottom=$('closeb2');
    if(top){
      top.onclick=e=>requestTeleExit(e,'x-superior');
      top.addEventListener('pointerup',()=>teleExitTrace('X_POINTER',{button:'superior'}),{passive:true});
    }
    if(bottom){
      bottom.onclick=e=>requestTeleExit(e,'x-inferior');
    }
    $('fullb')?.addEventListener('click',()=>{
      teleFullscreenManualUntil=Date.now()+1400;
      teleExitTrace('BOTON_FULLSCREEN',{entering:!document.fullscreenElement});
    },{capture:true});
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&$('tele')?.classList.contains('on')){
        if(document.fullscreenElement)return;
        e.preventDefault();requestTeleExit(e,'escape');
      }
    });
    window.addEventListener('popstate',e=>{
      if(teleIgnoreNextPop){teleIgnoreNextPop=false;window.PortalTrace?.log('TELE_EXIT_POP_IGNORED');return;}
      if(!$('tele')?.classList.contains('on'))return;
      teleHistoryArmed=false;
      teleExitTrace('BACK_CELULAR_DETECTADO',{state:e.state||null});
      armTeleHistory('back-protection');
      requestTeleExit(e,'back-celular');
    });
    window.addEventListener('popstate',e=>{
      if($('tele')?.classList.contains('on'))return;
      handlePortalBrowserBack(e);
    });
    document.addEventListener('fullscreenchange',()=>{
      const isFull=Boolean(document.fullscreenElement);
      teleExitTrace('FULLSCREEN_CHANGE',{isFull,manual:Date.now()<=teleFullscreenManualUntil,suppressed:teleSuppressFullscreenExit});
      if(isFull||!$('tele')?.classList.contains('on')||teleSuppressFullscreenExit)return;
      if(Date.now()<=teleFullscreenManualUntil)return;
      requestTeleExit(null,'back-fullscreen');
    });
  }

  window.renderCal=function(){draw();};
  window.renderPdet=function(){};
  window.DoctorPortalCalendar={showPending,showCalendar:async()=>{const p=await buildPlan();selectedWeek=currentWeekIndex(p.weeks);showingPending=false;draw();},refresh:async()=>{planCache=null;planPromise=null;if(showingPending)showPending(true);else draw(true);}};

  installExitHooks();
  armPortalBackGuard('portal-load');
  setTimeout(async()=>{
    if(window.__PORTAL_ACCESS_READY__){try{await window.__PORTAL_ACCESS_READY__;}catch{}}
    if(window.__PORTAL_HAS_ACCESS__===false){
      window.PortalTrace?.warn('CAL_SKIP_NO_ACCESS','Calendario detenido porque este navegador no tiene token ni sesión iniciada.');
      const h=$('calbox');if(h)h.innerHTML='';
      return;
    }
    const host=$('calbox');
    if(host&&!host.__traceObserver){
      const obs=new MutationObserver(()=>{
        const text=host.innerText||'';
        if(/No pude cargar el calendario|No pudimos cargar tu contenido/i.test(text)){
          window.PortalTrace?.error('CALBOX_ERROR_VISIBLE',{text:text.slice(0,260),html:host.innerHTML.slice(0,420)});
        }
      });
      obs.observe(host,{childList:true,subtree:true,characterData:true});
      host.__traceObserver=obs;
      window.PortalTrace?.log('CALBOX_OBSERVER_READY');
    }
    planCache=null;draw();
    setTimeout(()=>{
      const h=$('calbox');if(h)window.PortalTrace?.log('CAL_POST_RENDER_STATE',{text:(h.innerText||'').slice(0,220),cards:h.querySelectorAll('[data-content],[data-special],[data-placeholder]').length});
    },1800);
  },0);
})();
