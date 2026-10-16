/* Dr. Olano · Sección temporal excepcional de grabación · Fuente: Supabase vivo.
   No crea nuevos slots editoriales. No incorpora textos clínicos al repositorio. */
(function(){
  'use strict';
  const PREFIX='ESPECIAL · HIPERHIDROSIS';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isoLima=()=>{
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const n=k=>p.find(x=>x.type===k)?.value||'';
    return n('year')+'-'+n('month')+'-'+n('day');
  };
  const dateRange=iso=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(iso||'')))return null;
    const d=new Date(iso+'T12:00:00Z');
    if(!Number.isFinite(d.getTime()))return null;
    const weekday=(d.getUTCDay()+6)%7;
    d.setUTCDate(d.getUTCDate()-weekday);
    const start=d.toISOString().slice(0,10);
    d.setUTCDate(d.getUTCDate()+6);
    return{start,end:d.toISOString().slice(0,10)};
  };
  function data(){
    try{
      if(typeof P==='undefined'||!P||!Array.isArray(P.sessions))return null;
      const s=P.sessions.find(x=>String(x?.nombre||'').startsWith(PREFIX));
      if(!s)return null;
      const period=dateRange(s.fecha);
      if(!period||isoLima()<period.start||isoLima()>period.end)return null;
      const items=(P.production_items||[]).filter(x=>x.sesion_id===s.id&&x.pieza).sort((a,b)=>(a.orden||0)-(b.orden||0));
      if(!items.length)return null;
      return {session:s,items,period};
    }catch(e){console.warn('ESPECIAL_HIPERHIDROSIS_DATA_ERROR',e);return null;}
  }
  function host(){
    let h=document.getElementById('hyperSpecialRecord');
    if(h)return h;
    const hero=document.querySelector('#calendar > .hero');
    if(!hero)return null;
    h=document.createElement('section');
    h.id='hyperSpecialRecord';
    h.className='hyper-special';
    h.hidden=true;
    h.setAttribute('aria-label','Grabación excepcional de hiperhidrosis');
    hero.insertAdjacentElement('afterend',h);
    h.addEventListener('click',async event=>{
      const btn=event.target.closest('[data-hyper-piece]');
      if(!btn||btn.disabled)return;
      const id=btn.getAttribute('data-hyper-piece');
      if(!id||!window.DoctorPortalProjects?.openCalendarItem)return;
      btn.disabled=true;
      const old=btn.textContent;
      btn.textContent='Abriendo…';
      try{
        const ok=await window.DoctorPortalProjects.openCalendarItem(id,'ESPECIAL · HIPERHIDROSIS','special');
        if(!ok){btn.disabled=false;btn.textContent=old;}
      }catch(e){btn.disabled=false;btn.textContent=old;console.error('No pudo abrirse el guion especial',e);}
    });
    return h;
  }
  function paint(){
    const h=host();if(!h)return;
    const d=data();
    if(!d){h.hidden=true;h.innerHTML='';return;}
    const pending=d.items.filter(x=>x.estado!=='GRABADO'&&x.pieza?.estado!=='RECORDED').length;
    const title='Hiperhidrosis: axilas, manos y evaluación';
    const cards=d.items.map((x,i)=>{
      const done=x.estado==='GRABADO'||x.pieza?.estado==='RECORDED';
      const ready=done||x.pieza?.production_status?.PRODUCTION_READY===true;
      const label=done?'GRABADO':ready?'LISTO PARA GRABAR':'PREPARACIÓN PENDIENTE';
      const title=esc(x.pieza?.titulo||'Guion sin título');
      return '<article class="hyper-special-card">'+
       '<div class="hyper-special-card-head"><span class="hyper-special-number">'+String(i+1).padStart(2,'0')+'</span><span class="hyper-special-state '+(done?'is-done':'')+'">'+label+'</span></div>'+
       '<h3>'+title+'</h3>'+
       '<p>4 escenas · teleprompter y cámara integrados</p>'+
       '<button type="button" class="hyper-special-open" data-hyper-piece="'+esc(x.pieza.id)+'" '+(ready?'':'disabled')+'>'+
        (done?'Revisar guion':'Abrir guion y grabar')+' <span aria-hidden="true">↗</span></button></article>';
    }).join('');
    h.innerHTML='<div class="hyper-special-head">'+
      '<div class="hyper-special-heading"><span class="hyper-special-kicker"><span class="hyper-special-dot"></span> GRABACIÓN EXTRAORDINARIA · ESTA SEMANA</span>'+
      '<h2>'+title+'</h2>'+
      '<p>3 guiones diferentes para grabar. Apartado separado del calendario habitual de Estética y NOVARE.</p></div>'+
      '<div class="hyper-special-counter"><strong>'+pending+'</strong><span>PENDIENTES</span></div></div>'+
      '<div class="hyper-special-grid">'+cards+'</div>'+
      '<div class="hyper-special-foot"><span>12–18 OCT 2026</span><span>Solo grabación interna · No son publicaciones programadas</span></div>';
    h.hidden=false;
  }
  function install(){
    host();paint();
    const calendar=document.getElementById('calbox');
    if(calendar&&!calendar.__hyperSpecialObserver){
      const ob=new MutationObserver(()=>paint());
      ob.observe(calendar,{childList:true,subtree:false});
      calendar.__hyperSpecialObserver=ob;
    }
    let ticks=0;
    const timer=setInterval(()=>{
      paint();ticks++;
      if((typeof P!=='undefined'&&P?.sessions?.length)||ticks>60)clearInterval(timer);
    },300);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)paint();});
    window.addEventListener('pageshow',paint);
    window.DoctorPortalHyperSpecial={refresh:paint};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();