(()=>{
  'use strict';
  const STORE='do_portal_trace_v3';
  const MAX=160;
  let entries=[];
  try{entries=JSON.parse(localStorage.getItem(STORE)||'[]');if(!Array.isArray(entries))entries=[];}catch{entries=[];}
  const now=()=>new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date());
  const safe=(value,depth=0)=>{
    if(depth>4)return '[depth]';
    if(value==null||typeof value==='number'||typeof value==='boolean')return value;
    if(typeof value==='string'){
      if(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value))return '[uuid]';
      return value.length>420?value.slice(0,420)+'…':value;
    }
    if(Array.isArray(value))return value.slice(0,20).map(x=>safe(x,depth+1));
    if(typeof value==='object'){
      const out={};
      for(const [k,v] of Object.entries(value))out[k]=/token|authorization|apikey|secret|password/i.test(k)?'[redacted]':safe(v,depth+1);
      return out;
    }
    return String(value);
  };
  const serialize=x=>{try{return JSON.stringify(safe(x));}catch{return String(x);}};
  const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify(entries.slice(-MAX)));}catch{}};
  function push(stage,data='',level='info'){
    entries.push({time:now(),stage:String(stage||'EVENT'),data:typeof data==='string'?data:serialize(data),level});
    entries=entries.slice(-MAX);persist();
  }
  function plain(){return entries.slice(-100).map(e=>`[${e.time}] ${e.level.toUpperCase()} ${e.stage} ${e.data}`).join('\n');}
  window.PortalTrace={log:(s,d)=>push(s,d,'info'),warn:(s,d)=>push(s,d,'warn'),error:(s,d)=>push(s,d,'error'),plain,show:()=>null};
  window.addEventListener('error',e=>push('WINDOW_ERROR',{message:e.message,file:e.filename?.split('/').pop(),line:e.lineno,col:e.colno,stack:e.error?.stack||''},'error'));
  window.addEventListener('unhandledrejection',e=>push('UNHANDLED_REJECTION',{message:e.reason?.message||String(e.reason),stack:e.reason?.stack||''},'error'));
  push('LOAD_START',{href:location.pathname,ua:navigator.userAgent.slice(0,120)});
  async function verifyBuild(){
    const local=window.__PORTAL_BUILD__||'unknown';
    try{
      const r=await fetch('./doctor-portal-build.json?ts='+Date.now(),{cache:'no-store'});
      const d=await r.json();
      push('BUILD_CHECK',{local,remote:d?.build||'',calendar:d?.calendar||null,core:d?.core||null});
      if(d?.build&&local!=='unknown'&&d.build!==local){
        const key='portal_build_reload_'+d.build;
        if(sessionStorage.getItem(key)!=='1'){
          sessionStorage.setItem(key,'1');
          const u=new URL(location.href);u.searchParams.set('build',d.build);location.replace(u.toString());return;
        }
        push('BUILD_MISMATCH_PERSIST',{local,remote:d.build},'error');
      }
    }catch(e){push('BUILD_CHECK_FAIL',{message:e?.message||String(e)},'warn');}
  }
  document.addEventListener('DOMContentLoaded',()=>{push('DOM_READY',{readyState:document.readyState});verifyBuild();},{once:true});
})();
