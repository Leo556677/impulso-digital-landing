(()=>{
  'use strict';
  const STORE='do_portal_trace_v1';
  const MAX=120;
  let entries=[];
  try{entries=JSON.parse(localStorage.getItem(STORE)||'[]');if(!Array.isArray(entries))entries=[];}catch{entries=[];}
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now=()=>new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date());
  const safe=(value,depth=0)=>{
    if(depth>4)return '[depth]';
    if(value==null||typeof value==='number'||typeof value==='boolean')return value;
    if(typeof value==='string'){
      if(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value))return '[uuid]';
      if(value.length>420)return value.slice(0,420)+'…';
      return value;
    }
    if(Array.isArray(value))return value.slice(0,20).map(x=>safe(x,depth+1));
    if(typeof value==='object'){
      const out={};
      for(const [k,v] of Object.entries(value)){
        if(/token|authorization|apikey|secret|password/i.test(k)){out[k]='[redacted]';continue;}
        out[k]=safe(v,depth+1);
      }
      return out;
    }
    return String(value);
  };
  const serialize=x=>{try{return JSON.stringify(safe(x));}catch{return String(x);}};
  function persist(){try{localStorage.setItem(STORE,JSON.stringify(entries.slice(-MAX)));}catch{}}
  function ensure(){
    let root=document.getElementById('portalTrace');
    if(root)return root;
    root=document.createElement('aside');
    root.id='portalTrace';
    root.className='portal-trace';
    root.innerHTML='<div class="portal-trace-head"><div><b>DIAGNÓSTICO PORTAL · NO CERRAR</b><small id="portalTraceSummary">Esperando eventos…</small></div><button type="button" id="portalTraceCopy">COPIAR TRAZA</button></div><pre id="portalTraceBody"></pre>';
    document.body.appendChild(root);
    document.getElementById('portalTraceCopy').onclick=async()=>{
      const text=plain();
      try{await navigator.clipboard.writeText(text);document.getElementById('portalTraceCopy').textContent='COPIADO';setTimeout(()=>document.getElementById('portalTraceCopy').textContent='COPIAR TRAZA',1600);}
      catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}
    };
    render();
    return root;
  }
  function render(){
    const root=ensure(),body=root.querySelector('#portalTraceBody'),summary=root.querySelector('#portalTraceSummary');
    if(!body||!summary)return;
    const latest=entries.slice(-36);
    body.innerHTML=latest.map(e=>'<span class="trace-line '+(e.level==='error'?'is-error':e.level==='warn'?'is-warn':'')+'"><i>'+esc(e.time)+'</i> <b>'+esc(e.stage)+'</b> '+esc(e.data||'')+'</span>').join('\n');
    const lastErr=[...entries].reverse().find(e=>e.level==='error');
    summary.textContent=lastErr?'ÚLTIMO ERROR: '+lastErr.stage+' · '+lastErr.data:'Sin error capturado todavía · '+entries.length+' eventos';
    body.scrollTop=body.scrollHeight;
  }
  function push(stage,data='',level='info'){
    const text=typeof data==='string'?data:serialize(data);
    entries.push({time:now(),stage:String(stage||'EVENT'),data:text,level});
    entries=entries.slice(-MAX);persist();
    if(document.body)render();else document.addEventListener('DOMContentLoaded',render,{once:true});
  }
  function plain(){
    return entries.slice(-80).map(e=>`[${e.time}] ${e.level.toUpperCase()} ${e.stage} ${e.data}`).join('\n');
  }
  window.PortalTrace={log:(s,d)=>push(s,d,'info'),warn:(s,d)=>push(s,d,'warn'),error:(s,d)=>push(s,d,'error'),plain,show:ensure};
  window.addEventListener('error',e=>push('WINDOW_ERROR',{message:e.message,file:e.filename?.split('/').pop(),line:e.lineno,col:e.colno,stack:e.error?.stack||''},'error'));
  window.addEventListener('unhandledrejection',e=>push('UNHANDLED_REJECTION',{message:e.reason?.message||String(e.reason),stack:e.reason?.stack||''},'error'));
  push('LOAD_START',{href:location.pathname,ua:navigator.userAgent.slice(0,120)});
  document.addEventListener('DOMContentLoaded',()=>{ensure();push('DOM_READY',{readyState:document.readyState});},{once:true});
})();