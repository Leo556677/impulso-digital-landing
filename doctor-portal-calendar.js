(()=>{
  'use strict';
  const CAL_API='https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/content-recording-calendar';
  let calendarItems=[],calendarError='';

  function limaDateKey(iso){
    if(!iso)return '';
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));
    const get=t=>parts.find(x=>x.type===t)?.value||'';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  function limaTime(iso){
    if(!iso)return '';
    return new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
  }
  function dayLabel(date){
    return new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'2-digit',month:'long'}).format(new Date(date+'T12:00:00'));
  }
  function normalizedItems(){
    return calendarItems.map(x=>({
      ...x,
      date:limaDateKey(x.added_at),
      recorded:x.estado==='GRABADO',
      title:x.pieza?.titulo||x.pieza?.tema||x.pieza?.servicio||'Video',
      service:x.pieza?.servicio||''
    })).filter(x=>x.date);
  }

  renderCal=function(){
    const a=normalizedItems();
    const y=calCur.getFullYear(),m=calCur.getMonth(),f=new Date(y,m,1),l=new Date(y,m+1,0),off=f.getDay();
    let cells='';
    for(let i=0;i<off;i++)cells+='<div class="day"></div>';
    for(let d=1;d<=l.getDate();d++){
      const k=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const items=a.filter(x=>x.date===k);
      const hasPending=items.some(x=>!x.recorded),hasRecorded=items.some(x=>x.recorded);
      const dots=`${hasPending?'<i class="cal-dot pending" title="Pendiente"></i>':''}${hasRecorded?'<i class="cal-dot recorded" title="Grabado"></i>':''}`;
      cells+=`<div class="day ${selDate===k?'sel':''}"><button data-d="${k}" aria-label="${d} de ${new Intl.DateTimeFormat('es-PE',{month:'long'}).format(f)}"><span class="dn">${d}</span><span class="dots">${dots}</span></button></div>`;
    }
    $('calbox').innerHTML=`<div class="card cal"><div class="ctop"><button id="cp">${ic('left')}</button><b>${new Intl.DateTimeFormat('es-PE',{month:'long',year:'numeric'}).format(f)}</b><button id="cn">${ic('right')}</button></div><div class="cal-legend"><span><i class="cal-dot pending"></i>Pendiente</span><span><i class="cal-dot recorded"></i>Grabado</span></div><div class="cg">${['D','L','M','M','J','V','S'].map(x=>`<div class="dow">${x}</div>`).join('')}${cells}</div></div><div id="pdet"></div>`;
    $('cp').onclick=()=>{calCur=new Date(y,m-1,1);selDate='';renderCal();};
    $('cn').onclick=()=>{calCur=new Date(y,m+1,1);selDate='';renderCal();};
    D.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{selDate=b.dataset.d;renderCal();});
    renderPdet();
  };

  renderPdet=function(){
    const box=$('pdet');if(!box)return;
    if(calendarError){box.innerHTML=`<div class="card empty" style="margin-top:9px"><b>No pude cargar el calendario.</b><br>${esc(calendarError)}</div>`;return;}
    if(!selDate){box.innerHTML='<div class="card empty" style="margin-top:9px">Toca cualquier fecha para ver los videos cargados ese día.</div>';return;}
    const a=normalizedItems().filter(x=>x.date===selDate).sort((x,y)=>String(x.added_at).localeCompare(String(y.added_at)));
    if(!a.length){box.innerHTML=`<div class="card empty" style="margin-top:9px"><b>${esc(dayLabel(selDate))}</b><br>No hay videos cargados ese día.</div>`;return;}
    box.innerHTML=`<div class="cal-day-title"><b>${esc(dayLabel(selDate))}</b><span>${a.length} ${a.length===1?'video':'videos'}</span></div>`+a.map(x=>`<article class="card cal-video"><div class="row"><div class="cal-video-copy"><div class="date">Cargado ${esc(limaTime(x.added_at))}</div><h3>${esc(x.title)}</h3>${x.service?`<div class="sub">${esc(x.service)}</div>`:''}</div><span class="pill ${x.recorded?'ok':''}">${x.recorded?ic('check'):ic('playi')} ${x.recorded?'Grabado':'Pendiente'}</span></div></article>`).join('');
  };

  async function loadCalendar(){
    if(typeof token!=='string'||!token)return;
    try{
      const r=await fetch(CAL_API,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({token})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data.ok)throw Error(data.message||'No se pudo cargar la información de grabación.');
      calendarItems=Array.isArray(data.items)?data.items:[];calendarError='';
    }catch(e){calendarItems=[];calendarError=e?.message||'No se pudo cargar el calendario.';}
    renderCal();
  }

  const previousToggle=typeof toggleRec==='function'?toggleRec:null;
  if(previousToggle){
    toggleRec=async function(item){
      await previousToggle(item);
      await loadCalendar();
    };
  }

  loadCalendar();
})();
