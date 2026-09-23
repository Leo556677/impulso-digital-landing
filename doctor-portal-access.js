(()=>{
  'use strict';
  const API='https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/content-recording-session';
  const KEY='sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
  const STORE='do_portal_layer_session_v1';
  const layerMap={
    DR_OLANO:{key:'DR_OLANO',label:'Dr. Olano',subtitle:'Medicina estética + NOVARE',detail:'Acceso completo a los dos equipos.',tone:'all'},
    ESTETICA:{key:'ESTETICA',label:'Medicina estética',subtitle:'Toxina · PRP · Limpieza / aparatología',detail:'Solo contenidos y guiones de medicina estética.',tone:'estetica'},
    NOVARE:{key:'NOVARE',label:'NOVARE',subtitle:'Rinoplastia · Blefaroplastia · Liposucción de papada',detail:'Solo contenidos y guiones de cirugía.',tone:'novare'}
  };
  const access={token:'',layer:'',stream:'',displayName:'',expiresAt:'',ready:false};
  let resolveReady;
  window.__PORTAL_LAYER_READY__=new Promise(r=>{resolveReady=r});
  window.DoctorPortalAccess=access;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  async function call(action,payload={}){
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({action,business_slug:'dr-olano',...payload})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d?.ok!==true){const e=new Error(d?.message||'No se pudo validar el acceso.');e.code=d?.error||'';throw e}
    return d;
  }
  function desiredLayer(){
    const v=String(new URLSearchParams(location.search).get('area')||'').toLowerCase();
    if(v==='estetica')return'ESTETICA';
    if(v==='novare'||v==='cirugia')return'NOVARE';
    if(v==='dr'||v==='olano'||v==='todo')return'DR_OLANO';
    return'';
  }
  function stored(){
    try{const x=JSON.parse(sessionStorage.getItem(STORE)||'null');return x&&x.token&&x.layer?x:null}catch{return null}
  }
  function save(x){try{sessionStorage.setItem(STORE,JSON.stringify(x))}catch{}}
  function clear(){try{sessionStorage.removeItem(STORE)}catch{}}
  function mount(){
    let root=document.getElementById('portalAccessGate');if(root)return root;
    root=document.createElement('div');root.id='portalAccessGate';root.className='portal-access-gate';
    root.innerHTML=`<main class="portal-access-shell">
      <header class="portal-access-brand"><div class="portal-access-logo">DO</div><div><b>Dr. Olano · Contenido</b><span>Elige el acceso de este equipo</span></div></header>
      <section class="portal-access-card">
        <div class="portal-access-kicker">ACCESO OPERATIVO</div>
        <h1>¿Qué contenido necesitas ver?</h1>
        <p>Cada equipo entra únicamente a sus propios guiones. El acceso completo queda reservado para Dr. Olano.</p>
        <div class="portal-access-options">
          ${Object.values(layerMap).map(x=>`<button type="button" class="portal-layer-option" data-layer="${x.key}" data-tone="${x.tone}">
            <span class="portal-layer-dot"></span><span class="portal-layer-copy"><b>${x.label}</b><small>${x.subtitle}</small><em>${x.detail}</em></span><span class="portal-layer-arrow">›</span>
          </button>`).join('')}
        </div>
      </section>
    </main>
    <div class="portal-key-overlay" id="portalKeyOverlay" hidden>
      <form class="portal-key-card" id="portalKeyForm">
        <button class="portal-key-close" type="button" id="portalKeyClose" aria-label="Cerrar">×</button>
        <span class="portal-key-kicker">ACCESO PROTEGIDO</span>
        <h2 id="portalKeyTitle">Ingresar</h2>
        <p id="portalKeyCopy"></p>
        <label><span>Clave</span><input id="portalKeyInput" type="password" autocomplete="current-password" spellcheck="false" required></label>
        <div id="portalKeyError" class="portal-key-error" role="alert"></div>
        <button class="portal-key-submit" id="portalKeySubmit" type="submit">Entrar</button>
      </form>
    </div>`;
    document.body.appendChild(root);
    root.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.layer)));
    root.querySelector('#portalKeyClose').onclick=closeAsk;
    root.querySelector('#portalKeyOverlay').addEventListener('click',e=>{if(e.target.id==='portalKeyOverlay')closeAsk()});
    root.querySelector('#portalKeyForm').addEventListener('submit',submit);
    return root;
  }
  let asking='';
  function ask(layer){
    asking=layerMap[layer]?layer:'';
    if(!asking)return;
    const root=mount(),cfg=layerMap[asking],o=root.querySelector('#portalKeyOverlay');
    root.querySelector('#portalKeyTitle').textContent=cfg.label;
    root.querySelector('#portalKeyCopy').textContent=cfg.subtitle;
    root.querySelector('#portalKeyError').textContent='';
    const input=root.querySelector('#portalKeyInput');input.value='';
    o.hidden=false;requestAnimationFrame(()=>input.focus());
  }
  function closeAsk(){const o=document.getElementById('portalKeyOverlay');if(o)o.hidden=true;asking=''}
  async function submit(e){
    e.preventDefault();if(!asking)return;
    const root=mount(),input=root.querySelector('#portalKeyInput'),btn=root.querySelector('#portalKeySubmit'),err=root.querySelector('#portalKeyError');
    const password=input.value;
    if(!password){err.textContent='Escribe la clave.';return}
    btn.disabled=true;btn.textContent='Validando…';err.textContent='';
    try{
      const d=await call('portal_layer_unlock',{layer:asking,password});
      finish({token:d.layer_token,layer:d.layer_key,stream:d.content_stream,displayName:d.display_name,expiresAt:d.expires_at});
    }catch(ex){err.textContent=ex?.message||'Clave incorrecta.';input.select()}
    finally{btn.disabled=false;btn.textContent='Entrar'}
  }
  function installSwitch(){
    const top=document.querySelector('.topin');if(!top)return;
    let b=document.getElementById('portalAccessSwitch');
    if(!b){b=document.createElement('button');b.id='portalAccessSwitch';b.className='portal-access-switch';b.type='button';top.appendChild(b)}
    const cfg=layerMap[access.layer]||layerMap.DR_OLANO;
    b.innerHTML=`<span>${cfg.label}</span><small>Cambiar acceso</small>`;
    b.onclick=async()=>{try{if(access.token)await call('portal_layer_logout',{layer_token:access.token})}catch{}clear();location.assign(location.pathname+'?gate=1')};
  }
  function finish(x){
    access.token=x.token||access.token;access.layer=x.layer;access.stream=x.stream||'';access.displayName=x.displayName||'';access.expiresAt=x.expiresAt||'';access.ready=true;
    save({token:access.token,layer:access.layer,stream:access.stream,displayName:access.displayName,expiresAt:access.expiresAt});
    document.documentElement.classList.remove('portal-locked');
    const gate=document.getElementById('portalAccessGate');if(gate)gate.remove();
    window.dispatchEvent(new CustomEvent('portal-layer-ready',{detail:{...access}}));
    installSwitch();
    resolveReady?.(true);resolveReady=null;
  }
  access.change=async()=>{try{if(access.token)await call('portal_layer_logout',{layer_token:access.token})}catch{}clear();location.assign(location.pathname+'?gate=1')};
  access.logout=access.change;

  async function boot(){
    mount();
    const force=new URLSearchParams(location.search).get('gate')==='1',desired=desiredLayer(),s=stored();
    if(!force&&s?.token&&(!desired||desired===s.layer)){
      try{
        const d=await call('portal_layer_status',{layer_token:s.token});
        finish({token:s.token,layer:d.layer_key,stream:d.content_stream,displayName:d.display_name,expiresAt:d.expires_at});return;
      }catch{clear()}
    }
    if(desired)setTimeout(()=>ask(desired),0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();