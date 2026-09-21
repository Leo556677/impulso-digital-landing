const API='https://xnlzsgulskqyecfgzhwa.supabase.co/functions/v1/content-recording-session',
  KEY='sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32',
  q=new URLSearchParams(location.search),
  ACCESS_KEY='do_portal_access_v1',
  initialToken=q.get('token')||localStorage.getItem(ACCESS_KEY)||'',
  deep=q.get('session')||'',
  D=document,
  $=x=>D.getElementById(x),
  ic=id=>`<svg class="ico"><use href="#${id}"/></svg>`,
  esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=initialToken,authJwt='',authClient=null;
let P=null,S=null,Item=null,backTab='record',calCur=new Date(),selDate='',play=false,last=0,raf=0,fs=44,ai=0;
window.__PORTAL_HAS_ACCESS__=token?true:null;
async function api(action,extra={}){window.PortalTrace?.log('API_START',{action,mode:token?'portal-token':authJwt?'user-session':'none'});let r,d;const headers={'Content-Type':'application/json','apikey':KEY};if(authJwt)headers['Authorization']='Bearer '+authJwt;try{r=await fetch(API,{method:'POST',headers,body:JSON.stringify({action,token,business_slug:'dr-olano',...extra})});d=await r.json().catch(()=>({}));window.PortalTrace?.log('API_RESPONSE',{action,http:r.status,http_ok:r.ok,body_ok:d?.ok===true,error:d?.error||'',message:d?.message||''});}catch(e){window.PortalTrace?.error('API_FETCH_ERROR',{action,message:e?.message||String(e),stack:e?.stack||''});throw e}if(!r.ok||!d.ok){const e=new Error(d.message||'No pudimos cargar tu contenido.');window.PortalTrace?.error('API_FAIL',{action,http:r.status,error:d?.error||'',message:e.message,body_keys:Object.keys(d||{})});throw e}return d}async function resolvePortalAccess(){
  if(token){window.__PORTAL_HAS_ACCESS__=true;window.PortalTrace?.log('ACCESS_MODE',{mode:'portal-token'});return true;}
  try{
    const mod=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm');
    authClient=mod.createClient('https://xnlzsgulskqyecfgzhwa.supabase.co',KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    const {data:{session},error}=await authClient.auth.getSession();
    if(error)throw error;
    if(session?.access_token){
      authJwt=session.access_token;
      window.__PORTAL_HAS_ACCESS__=true;
      window.PortalTrace?.log('ACCESS_MODE',{mode:'supabase-session',user:Boolean(session.user)});
      return true;
    }
  }catch(e){window.PortalTrace?.warn('AUTH_SESSION_LOOKUP_FAIL',{message:e?.message||String(e)});}
  window.__PORTAL_HAS_ACCESS__=false;
  window.PortalTrace?.warn('ACCESS_MODE',{mode:'none'});
  return false;
}
function fd(v){return v?new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(String(v).slice(0,10)+'T12:00:00')):'Fecha por definir'}function pt(p){return p?.titulo||p?.tema||p?.servicio||'Video para grabar'}function st(s){return s?.nombre||`Grabación · ${fd(s?.fecha)}`}function tab(t){D.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));D.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));$(t).classList.add('on');scrollTo(0,0)}D.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{resetViews();tab(b.dataset.tab)});function resetViews(){$('rhome').style.display='block';$('sdetail').style.display='none';$('vdetail').style.display='none'}function err(m,login=false){$('err').style.display='block';const next=encodeURIComponent((location.pathname.split('/').pop()||'doctor-portal.html'));$('err').innerHTML=`<b>No pudimos abrir tu portal</b><div style="margin-top:6px;color:var(--m);font-size:11px">${esc(m)}</div><div style="margin-top:10px;display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap">${login?'<a href="./cliente-acceso.html?next='+next+'" style="text-decoration:none;border:0;border-radius:10px;background:var(--g);color:#fff;padding:9px 12px;font:900 10px system-ui">Iniciar sesión</a>':''}<small style="color:#8a93a0">Build ${esc(window.__PORTAL_BUILD__||'sin identificar')}</small></div>`}
function active(){return(P?.sessions||[]).filter(s=>!s.total||s.recorded<s.total)}function done(){return(P?.sessions||[]).filter(s=>s.total>0&&s.recorded>=s.total)}function gv(label='Referencia visual'){return `<div class="visual"><svg viewBox="0 0 640 360"><rect width="640" height="360" fill="#151922"/><circle cx="320" cy="120" r="58" fill="#d7dee8"/><path d="M242 320c8-95 37-137 78-137 47 0 77 43 82 137" fill="#aeb9c9"/><rect x="80" y="70" width="115" height="210" rx="18" fill="#242b37"/></svg><span class="tag">${esc(label)}</span></div>`}function vis(url,label){return url&&/^https?:\/\//i.test(url)?`<div class="visual"><img src="${esc(url)}" alt="${esc(label)}"><span class="tag">${esc(label)}</span></div>`:gv(label)}function firstImg(x){return(x.tomas||[]).find(t=>t.reference_url)?.reference_url||''}
function renderRecord(){const a=active(),tot=a.reduce((n,s)=>n+(s.total||0),0),rec=a.reduce((n,s)=>n+(s.recorded||0),0);$('sum').innerHTML=`<div class="metric"><b>${ic('cam')}${tot}</b><span>videos pendientes</span></div><div class="metric"><b>${ic('check')}${rec}</b><span>grabados en sesiones activas</span></div>`;$('sessions').innerHTML=a.length?a.map(s=>{let pc=s.total?Math.round((s.recorded||0)/s.total*100):0;return `<article class="card session jsS" data-id="${s.id}"><div class="row"><div><div class="date">${esc(fd(s.fecha))}</div><h3>${esc(st(s))}</h3><div class="sub">${ic('pin')}${esc(s.lugar||'Lugar por confirmar')}</div></div><span class="pill">${s.recorded||0}/${s.total||0} grabados</span></div><div class="prog"><span style="width:${pc}%"></span></div></article>`}).join(''):'<div class="card empty"><b>No tienes grabaciones pendientes.</b><br>Cuando haya una nueva sesión aparecerá aquí.</div>';D.querySelectorAll('.jsS').forEach(x=>x.onclick=()=>openSession(x.dataset.id,'record'))}
async function openSession(id,from='record'){try{backTab=from;S=await api('session_get',{session_id:id});S=window.DoctorPortalArea?.filterSessionPayload?.(S)||S;if(!S?.items?.length)throw new Error('Esta sesión no contiene guiones de esta área.');tab('record');$('rhome').style.display='none';$('vdetail').style.display='none';$('sdetail').style.display='block';$('sbacktxt').textContent=from==='history'?'Volver al historial':'Volver a grabaciones';let {session,items}=S,dn=items.filter(x=>x.estado==='GRABADO').length,pc=items.length?Math.round(dn/items.length*100):0;$('shero').innerHTML=`<div class="card detail"><div class="date">${esc(fd(session.fecha))}</div><h2>${esc(st(session))}</h2><div class="sub">${session.lugar?ic('pin')+esc(session.lugar):''}</div><div class="prog"><span style="width:${pc}%"></span></div><small>${dn} de ${items.length} videos grabados</small></div>`;$('setup').innerHTML=session.notas?`<div class="card setup"><b>Antes de empezar</b><br>${esc(session.notas)}</div>`:'';renderVideos(items);scrollTo(0,0)}catch(e){err(e.message)}}$('sback').onclick=()=>{resetViews();tab(backTab==='history'?'history':'record')};
function renderVideos(items){$('videos').innerHTML=items.length?items.map((x,i)=>`<article class="card video jsV" data-i="${i}"><div class="vr"><span class="vn">${i+1}</span><span class="vo">DE ${items.length}</span><span class="pill ${x.estado==='GRABADO'?'ok':''}">${x.estado==='GRABADO'?ic('check'):ic('playi')} ${x.estado==='GRABADO'?'Grabado':'Pendiente'}</span></div>${vis(firstImg(x),'Referencia de grabación')}<div class="vb"><h3>${esc(pt(x.pieza))}</h3><div class="meta"><span>${esc(x.pieza.servicio||'')}</span><span>${ic('clk')} ${x.pieza.duracion_seg?x.pieza.duracion_seg+' s':''}</span></div><button class="cta">${x.estado==='GRABADO'?'Revisar video':'Abrir y grabar'}</button></div></article>`).join(''):'<div class="card empty">Esta sesión todavía no tiene videos.</div>';D.querySelectorAll('.jsV').forEach(x=>x.onclick=()=>openVideo(+x.dataset.i))}
function openVideo(i){Item=S.items[i];let p=Item.pieza,sh=Item.tomas||[];$('sdetail').style.display='none';$('vdetail').style.display='block';$('vhero').innerHTML=`<div class="card detail">${vis(firstImg(Item),'Así debe verse')}<div class="date">VIDEO ${i+1}</div><h2>${esc(pt(p))}</h2><div class="meta"><span>${esc(p.servicio||'')}</span><span>${p.duracion_seg?p.duracion_seg+' s':''}</span></div><div class="actions"><button id="teleb" class="btn primary">${ic('playi')} Abrir teleprompter</button><button id="recb" class="btn ok">${ic('check')} ${Item.estado==='GRABADO'?'Marcar pendiente':'Marcar grabado'}</button></div></div>`;$('shots').innerHTML=sh.length?sh.map((s,n)=>`<article class="card shot"><div class="shothead"><div class="sleft"><span class="sn">${n+1}</span><div><b>${s.tipo==='BROLL'?'Recurso':'Toma'} ${n+1}</b><div class="stime">${esc(s.tiempo||'')}</div></div></div></div>${vis(s.reference_url,s.tipo==='BROLL'?'Referencia del recurso':'Composición de la toma')}<div class="ins">${s.accion||s.mirada_gesto?`<div class="ib"><small>Qué haces</small>${esc([s.accion,s.mirada_gesto].filter(Boolean).join(' · '))}</div>`:''}${s.que_se_ve||s.camara?`<div class="ib"><small>Qué debe verse</small>${esc([s.que_se_ve,s.camara].filter(Boolean).join(' · '))}</div>`:''}</div>${s.que_se_dice?`<div class="say">${esc(s.que_se_dice)}</div>`:''}</article>`).join(''):'<div class="card empty">Las indicaciones todavía no están cargadas.</div>';$('teleb').onclick=()=>openTele(Item);$('recb').onclick=()=>toggleRec(Item);scrollTo(0,0)}$('vback').onclick=()=>{$('vdetail').style.display='none';$('sdetail').style.display='block';scrollTo(0,0)};async function toggleRec(x){try{await api('mark_piece',{session_piece_id:x.session_piece_id,estado:x.estado==='GRABADO'?'PENDIENTE':'GRABADO'});await refresh();await openSession(S.session.id,backTab)}catch(e){alert(e.message)}}
function dk(iso){if(!iso)return'';let a=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso)),g=t=>a.find(x=>x.type===t)?.value;return`${g('year')}-${g('month')}-${g('day')}`}function gp(){let m=new Map;for(let p of P?.publications||[]){let d=dk(p.published_at);if(!d)continue;let k=d+'|'+p.content_id;if(!m.has(k))m.set(k,{date:d,id:p.content_id,title:pt(p.pieza),plats:[]});let x=m.get(k),pl=String(p.plataforma||'').toLowerCase();if(pl&&!x.plats.includes(pl))x.plats.push(pl)}return[...m.values()].sort((a,b)=>b.date.localeCompare(a.date))}function pcl(p){return p==='instagram'?'ig':p==='tiktok'?'tt':'fb'}function pn(p){return p==='instagram'?'Instagram':p==='tiktok'?'TikTok':'Facebook'}function ph(a){return a.map(p=>`<span class="pl">${esc(pn(p))}</span>`).join('')}
function renderCal(){let a=gp();if(!selDate&&a.length){selDate=a[0].date;calCur=new Date(+selDate.slice(0,4),+selDate.slice(5,7)-1,1)}let y=calCur.getFullYear(),m=calCur.getMonth(),f=new Date(y,m,1),l=new Date(y,m+1,0),off=f.getDay(),cells='';for(let i=0;i<off;i++)cells+='<div class="day"></div>';for(let d=1;d<=l.getDate();d++){let k=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,ps=a.filter(x=>x.date===k),pls=[...new Set(ps.flatMap(x=>x.plats))];cells+=`<div class="day ${selDate===k?'sel':''}"><button data-d="${k}"><span class="dn">${d}</span><span class="dots">${pls.map(p=>`<i class="dot ${pcl(p)}"></i>`).join('')}</span></button></div>`}$('calbox').innerHTML=`<div class="card cal"><div class="ctop"><button id="cp">${ic('left')}</button><b>${new Intl.DateTimeFormat('es-PE',{month:'long',year:'numeric'}).format(f)}</b><button id="cn">${ic('right')}</button></div><div class="cg">${['D','L','M','M','J','V','S'].map(x=>`<div class="dow">${x}</div>`).join('')}${cells}</div></div><div id="pdet"></div>`;$('cp').onclick=()=>{calCur=new Date(y,m-1,1);selDate='';renderCal()};$('cn').onclick=()=>{calCur=new Date(y,m+1,1);selDate='';renderCal()};D.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{selDate=b.dataset.d;renderCal()});renderPdet()}function renderPdet(){let a=gp().filter(x=>x.date===selDate);$('pdet').innerHTML=a.length?a.map(x=>`<article class="card pub"><div class="date">${esc(new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'2-digit',month:'long'}).format(new Date(x.date+'T12:00:00')))}</div><h3>${esc(x.title)}</h3><div class="plats">${ph(x.plats)}</div></article>`).join(''):'<div class="card empty" style="margin-top:9px">Toca un día con indicadores.</div>'}
function renderHist(){let a=done();$('hsessions').innerHTML=a.length?a.map(s=>`<article class="card hist"><div class="row"><div><div class="date">${esc(fd(s.fecha))}</div><h3>${esc(st(s))}</h3><div class="sub">${ic('cam')}${s.total} videos grabados</div></div><span class="pill ok">${ic('check')} Completada</span></div><button class="cta hopen" data-id="${s.id}">Ver contenido</button></article>`).join(''):'<div class="card empty">Todavía no hay sesiones completadas.</div>';D.querySelectorAll('.hopen').forEach(b=>b.onclick=()=>openSession(b.dataset.id,'history'));let p=gp().slice(0,8);$('hpubs').innerHTML=p.length?p.map(x=>`<article class="card hist"><div class="date">${esc(fd(x.date))}</div><h3>${esc(x.title)}</h3><div class="plats">${ph(x.plats)}</div></article>`).join(''):'<div class="card empty">Todavía no hay publicaciones registradas.</div>'}
const tele=$('tele'),scr=$('scroll'),lines=$('lines'),sr=$('srange'),fr=$('frange'),telePanel=$('telePanel'),teleDragHandle=$('teleDragHandle');
let highlightMode='word',wordFactor=1,countdownSeconds=3,countdownActive=false,countdownRun=0,activeConfig='';
let teleTokens=[],teleWordIndex=0,teleWordElapsed=0,telePxPerSec=0,teleDragging=false,teleDragStart=null;
try{
  highlightMode=localStorage.getItem('do_tele_highlight')||'word';
  wordFactor=Math.max(.75,Math.min(1.25,Number(localStorage.getItem('do_tele_wordrate')||1)));
  countdownSeconds=Math.max(0,Math.min(5,Number(localStorage.getItem('do_tele_countdown')??3)));
}catch{}
function txt(x){let a=(x.tomas||[]).filter(t=>t.que_se_dice).map(t=>t.que_se_dice);return a.length?a:String(x.pieza?.master_script||'').split(/\n+/).filter(Boolean)}
function rehookPhrases(x){return(Array.isArray(x?.pieza?.rehooks)?x.pieza.rehooks:[]).map(r=>String(r?.frase||r?.phrase||r?.texto||r?.text||'').trim()).filter(Boolean)}
function teleWordKey(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'')}
function teleTextCore(v){return String(v??'').trim().split(/\s+/).filter(Boolean).map(w=>`<span class="tele-token">${esc(w)}</span>`).join(' ')}
function markTeleRehooks(phrases=[]){
  const tokens=[...D.querySelectorAll('.tele-token')],keys=tokens.map(t=>teleWordKey(t.textContent));let matched=0;
  tokens.forEach(t=>{t.classList.remove('tele-rehook','rehook-passed');delete t.dataset.rehook});
  phrases.forEach((phrase,pi)=>{
    const pk=String(phrase||'').trim().split(/\s+/).map(teleWordKey).filter(Boolean);
    if(!pk.length)return;
    for(let i=0;i<keys.length;i++){
      if(keys[i]!==pk[0])continue;
      let j=0,k=i,extra=0;
      while(k<keys.length&&j<pk.length&&extra<=4){
        if(keys[k]===pk[j])j++;
        else extra++;
        k++;
      }
      if(j===pk.length){
        for(let n=i;n<k;n++){tokens[n].classList.add('tele-rehook');tokens[n].dataset.rehook=String(pi)}
        matched++;break
      }
    }
  });
  D.querySelectorAll('.line').forEach(line=>line.classList.toggle('rehook-line',Boolean(line.querySelector('.tele-rehook'))));
  return matched
}
function baseWpm(){return Math.max(60,Math.min(240,Number(sr?.value)||120))}
function effectiveWpm(){return Math.max(45,Math.min(300,baseWpm()*wordFactor))}
function tokenFactor(token){
  const t=String(token?.textContent||'').trim();
  if(/[.!?…]["')\]]*$/.test(t))return 1.85;
  if(/[;:]["')\]]*$/.test(t))return 1.45;
  if(/,["')\]]*$/.test(t))return 1.25;
  return t.length>12?1.12:1;
}
function tokenDuration(token){return (60/effectiveWpm())*tokenFactor(token)}
function refreshTeleVelocity(){
  if(!teleTokens.length||!scr){telePxPerSec=0;return}
  const first=teleTokens[0],lastToken=teleTokens[teleTokens.length-1],box=scr.getBoundingClientRect(),a=first.getBoundingClientRect(),b=lastToken.getBoundingClientRect();
  const firstY=a.top-box.top+scr.scrollTop+a.height/2,lastY=b.top-box.top+scr.scrollTop+b.height/2;
  const travel=Math.max(1,lastY-firstY),seconds=Math.max(1,(teleTokens.length/effectiveWpm())*60);
  telePxPerSec=Math.max(4,travel/seconds)
}
function prepareTeleTrack(reset=true){
  teleTokens=[...D.querySelectorAll('.tele-token')];
  teleTokens.forEach((t,i)=>t.dataset.teleIndex=String(i));
  if(reset){teleWordIndex=0;teleWordElapsed=0}
  else teleWordIndex=Math.max(0,Math.min(teleTokens.length-1,teleWordIndex));
  refreshTeleVelocity();paintCurrentWord();
  requestAnimationFrame(()=>followCurrentWord(0,true))
}
function currentToken(){return teleTokens[Math.max(0,Math.min(teleTokens.length-1,teleWordIndex))]||null}
function focusY(){return innerHeight*.46}
function visualRowTokens(token){
  if(!token)return[];
  const r=token.getBoundingClientRect(),parent=token.parentElement;
  return teleTokens.filter(t=>{if(t.parentElement!==parent)return false;const q=t.getBoundingClientRect();return Math.abs(q.top-r.top)<=2})
}
function paintRehookState(){
  const fy=focusY(),groups=new Map();
  D.querySelectorAll('.tele-rehook').forEach(t=>{const id=t.dataset.rehook||'0';if(!groups.has(id))groups.set(id,[]);groups.get(id).push(t)});
  groups.forEach(tokens=>{
    const last=tokens[tokens.length-1],passed=last.getBoundingClientRect().bottom<fy;
    tokens.forEach(t=>t.classList.toggle('rehook-passed',passed));
  });
  D.querySelectorAll('.line.rehook-line').forEach(line=>{
    const rs=[...line.querySelectorAll('.tele-rehook')];
    line.classList.toggle('rehook-passed',rs.length>0&&rs.every(t=>t.classList.contains('rehook-passed')));
  });
}
function paintCurrentWord(){
  const linesAll=[...D.querySelectorAll('.line')],token=currentToken();
  teleTokens.forEach(t=>t.classList.remove('focused'));
  linesAll.forEach(x=>x.classList.remove('active','near'));
  if(!token){paintRehookState();return}
  const parent=token.closest('.line');
  const idx=linesAll.indexOf(parent);ai=Math.max(0,idx);
  linesAll.forEach((x,i)=>{x.classList.toggle('active',i===idx);x.classList.toggle('near',Math.abs(i-idx)===1)});
  if(highlightMode==='line')visualRowTokens(token).forEach(t=>t.classList.add('focused'));
  else if(highlightMode==='word')token.classList.add('focused');
  paintRehookState()
}
function followCurrentWord(dt=0,snap=false){
  const token=currentToken();if(!token)return;
  const r=token.getBoundingClientRect(),delta=(r.top+r.height/2)-focusY();
  if(Math.abs(delta)<.35)return;
  const gain=snap?1:Math.min(1,Math.max(.08,dt*8));
  scr.scrollTop+=delta*gain
}
function nearestTokenToFocus(){
  if(!teleTokens.length)return 0;
  const fy=focusY();let best=0,bd=Infinity;
  teleTokens.forEach((t,i)=>{const r=t.getBoundingClientRect(),d=Math.abs((r.top+r.bottom)/2-fy);if(d<bd){bd=d;best=i}});
  return best
}
function openTele(x){
  $('ttitle').textContent=pt(x.pieza);
  const rehooks=rehookPhrases(x);
  lines.innerHTML=txt(x).map((t,i)=>`<p class="line" data-i="${i}">${teleTextCore(t)}</p>`).join('');
  const matched=markTeleRehooks(rehooks),hint=D.querySelector('.ttitle small');
  if(hint)hint.textContent=rehooks.length?`${matched}/${rehooks.length} rehooks · verde antes de la línea · rojo después`:'Este guion no tiene rehooks marcados';
  try{
    fs=Number(localStorage.getItem('do_tele_font'))||(innerWidth<600?34:44);
    const savedSpeed=Number(localStorage.getItem('do_tele_speed')||120);sr.value=String(savedSpeed<60?120:savedSpeed)
  }catch{fs=innerWidth<600?34:44;sr.value='120'}
  applyF();speedL();play=false;countdownActive=false;playI();syncTeleSettings();tele.classList.add('on');document.body.style.overflow='hidden';scr.scrollTop=0;
  prepareTeleTrack(true);setTimeout(()=>{prepareTeleTrack(true);focus()},60)
}
function stopCountdown(){countdownRun++;countdownActive=false;const o=$('teleCountdown');if(o)o.hidden=true;playI()}
async function closeTele(){
  play=false;stopCountdown();cancelAnimationFrame(raf);
  try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}
  tele.classList.remove('on');document.body.style.overflow='';resetTelePanelPosition()
}
$('closeb').onclick=()=>closeTele();if($('closeb2'))$('closeb2').onclick=()=>closeTele();
function applyF(){
  fs=Math.max(16,Math.min(80,Number(fs)||36));
  D.querySelectorAll('.line').forEach(x=>x.style.fontSize=fs+'px');
  if($('fval'))$('fval').textContent=fs+' PX';
  if(fr)fr.value=String(fs);
  try{localStorage.setItem('do_tele_font',String(fs))}catch{}
  setTimeout(()=>{prepareTeleTrack(false);followCurrentWord(0,true)},20)
}
if($('fdown'))$('fdown').onclick=()=>{fs=Math.max(16,fs-1);applyF()};
if($('fup'))$('fup').onclick=()=>{fs=Math.min(80,fs+1);applyF()};
if(fr)fr.oninput=e=>{fs=+e.target.value;applyF()};
function speedL(){if($('sval'))$('sval').textContent=Math.round(effectiveWpm())+' ppm';try{localStorage.setItem('do_tele_speed',String(sr.value))}catch{};if(tele?.classList.contains('on'))refreshTeleVelocity()}
sr.oninput=speedL;
if($('speeddown'))$('speeddown').onclick=()=>{sr.value=String(Math.max(+sr.min,+sr.value-1));speedL()};
if($('speedup'))$('speedup').onclick=()=>{sr.value=String(Math.min(+sr.max,+sr.value+1));speedL()};
function playI(){const running=play||countdownActive;$('playb').innerHTML=running?ic('pause'):ic('playi');$('playb').setAttribute('aria-label',running?'Pausar':'Reproducir')}
function pauseAuto(){play=false;last=0;cancelAnimationFrame(raf);playI()}
function startAuto(){countdownActive=false;play=true;last=0;teleWordElapsed=0;teleWordIndex=nearestTokenToFocus();refreshTeleVelocity();playI();raf=requestAnimationFrame(tick)}
function delay(ms){return new Promise(r=>setTimeout(r,ms))}
async function startCountdown(){
  const seconds=Math.max(0,Math.min(5,Number(countdownSeconds)||0));
  if(seconds===0){startAuto();return}
  const run=++countdownRun,o=$('teleCountdown'),v=$('teleCountdownValue');
  countdownActive=true;playI();if(o)o.hidden=false;
  for(let n=seconds;n>=1;n--){if(run!==countdownRun)return;if(v)v.textContent=String(n);await delay(1000)}
  if(run!==countdownRun)return;if(o)o.hidden=true;startAuto()
}
function advanceWord(dt){
  if(!teleTokens.length||!scr)return;
  const step=Math.max(0,telePxPerSec)*dt,max=Math.max(0,scr.scrollHeight-scr.clientHeight);
  scr.scrollTop=Math.min(max,scr.scrollTop+step);
  teleWordIndex=nearestTokenToFocus();teleWordElapsed=0;
}
function tick(t){
  if(!play)return;
  if(!last)last=t;
  const dt=Math.min(.05,Math.max(0,(t-last)/1000));last=t;
  advanceWord(dt);paintCurrentWord();
  const end=teleTokens[teleTokens.length-1];
  if(end&&end.getBoundingClientRect().bottom<=focusY()){pauseAuto();return}
  raf=requestAnimationFrame(tick)
}
$('playb').onclick=()=>{
  if(countdownActive){stopCountdown();return}
  if(play){pauseAuto();return}
  startCountdown()
};
if($('resetb'))$('resetb').onclick=()=>{pauseAuto();stopCountdown();teleWordIndex=0;teleWordElapsed=0;paintCurrentWord();followCurrentWord(0,true)};
function focus(){
  if(!teleTokens.length)prepareTeleTrack(false);
  if(!play){teleWordIndex=nearestTokenToFocus();teleWordElapsed=0}
  paintCurrentWord()
}
scr.addEventListener('scroll',()=>{if(!play)requestAnimationFrame(focus)},{passive:true});
function jump(d){
  const linesAll=[...D.querySelectorAll('.line')];if(!linesAll.length)return;
  let i=Math.max(0,Math.min(linesAll.length-1,ai+d)),line=linesAll[i],token=line.querySelector('.tele-token');
  if(token){teleWordIndex=Math.max(0,Number(token.dataset.teleIndex)||teleTokens.indexOf(token));teleWordElapsed=0;paintCurrentWord();followCurrentWord(0,true)}
}
$('prevb').onclick=()=>jump(-1);$('nextb').onclick=()=>jump(1);$('mirrorb').onclick=()=>tele.classList.toggle('mirror');
$('fullb').onclick=async()=>{try{if(!document.fullscreenElement)await tele.requestFullscreen({navigationUI:'hide'});else await document.exitFullscreen()}catch(e){window.PortalTrace?.warn('FULLSCREEN_FAIL',{message:e?.message||String(e)})}};
function openTeleConfig(name){
  const drawer=$('teleConfigDrawer'),sections=[...D.querySelectorAll('.tele-config-section')],same=activeConfig===name&&!drawer.hidden;
  activeConfig=same?'':name;drawer.hidden=!activeConfig;
  sections.forEach(sec=>sec.hidden=sec.dataset.config!==activeConfig);
  D.querySelectorAll('.tele-toolbar-one button[data-setting]').forEach(b=>b.classList.toggle('active-setting',b.dataset.setting===activeConfig))
}
function syncTeleSettings(){
  const hm=$('highlightMode'),wr=$('wordRate'),cv=$('countdownSeconds');
  if(hm)hm.value=highlightMode;if(wr)wr.value=String(Math.round(wordFactor*100));if($('wordRateVal'))$('wordRateVal').textContent=wordFactor.toFixed(2)+'×';
  if(cv)cv.value=String(countdownSeconds);if($('countdownVal'))$('countdownVal').textContent=countdownSeconds+' s';if($('teleCountdownBtn'))$('teleCountdownBtn').textContent=String(countdownSeconds);
  speedL()
}
[['teleFontBtn','font'],['teleSpeedBtn','speed'],['teleHighlightBtn','highlight'],['teleCountdownBtn','countdown']].forEach(([id,name])=>{const b=$(id);if(b){b.dataset.setting=name;b.onclick=()=>openTeleConfig(name)}});
if($('highlightMode'))$('highlightMode').onchange=e=>{highlightMode=['word','line','flow'].includes(e.target.value)?e.target.value:'word';try{localStorage.setItem('do_tele_highlight',highlightMode)}catch{};paintCurrentWord()};
if($('wordRate'))$('wordRate').oninput=e=>{wordFactor=Math.max(.75,Math.min(1.25,(+e.target.value||100)/100));if($('wordRateVal'))$('wordRateVal').textContent=wordFactor.toFixed(2)+'×';try{localStorage.setItem('do_tele_wordrate',String(wordFactor))}catch{};speedL()};
if($('countdownSeconds'))$('countdownSeconds').oninput=e=>{countdownSeconds=Math.max(0,Math.min(5,+e.target.value||0));if($('countdownVal'))$('countdownVal').textContent=countdownSeconds+' s';if($('teleCountdownBtn'))$('teleCountdownBtn').textContent=String(countdownSeconds);try{localStorage.setItem('do_tele_countdown',String(countdownSeconds))}catch{}};
function dragEnabled(){return Boolean(document.fullscreenElement)&&((matchMedia?.('(pointer:coarse)')?.matches)||innerWidth<=1024)}
function dragBounds(){
  const root=(document.fullscreenElement||tele)?.getBoundingClientRect?.();
  if(root&&root.width>0&&root.height>0)return{left:root.left,top:root.top,right:root.right,bottom:root.bottom,width:root.width,height:root.height};
  const vv=visualViewport;
  const left=Number(vv?.offsetLeft||0),top=Number(vv?.offsetTop||0),width=Number(vv?.width||innerWidth),height=Number(vv?.height||innerHeight);
  return{left,top,right:left+width,bottom:top+height,width,height}
}
function clampPanel(x,y){
  const b=dragBounds(),r=telePanel.getBoundingClientRect(),pad=6;
  const maxX=Math.max(b.left+pad,b.right-r.width-pad),maxY=Math.max(b.top+pad,b.bottom-r.height-pad);
  return{x:Math.max(b.left+pad,Math.min(maxX,x)),y:Math.max(b.top+pad,Math.min(maxY,y))}
}
function setPanelPosition(x,y,save=true){
  if(!telePanel)return;const p=clampPanel(x,y);
  telePanel.style.left=p.x+'px';telePanel.style.top=p.y+'px';telePanel.style.right='auto';telePanel.style.bottom='auto';telePanel.style.transform='none';
  if(save)try{localStorage.setItem('do_tele_panel_pos',JSON.stringify(p))}catch{}
}
function centerTelePanel(save=true){
  if(!telePanel)return;const b=dragBounds(),r=telePanel.getBoundingClientRect();
  setPanelPosition(b.left+(b.width-r.width)/2,b.top+(b.height-r.height)/2,save)
}
function resetTelePanelPosition(){
  if(!telePanel)return;telePanel.classList.remove('tele-panel-draggable');telePanel.style.left='';telePanel.style.top='';telePanel.style.right='';telePanel.style.bottom='';telePanel.style.transform=''
}
function syncTelePanelDrag(){
  if(!telePanel)return;
  if(!dragEnabled()){resetTelePanelPosition();return}
  telePanel.classList.add('tele-panel-draggable');
  requestAnimationFrame(()=>{
    const b=dragBounds(),r=telePanel.getBoundingClientRect();let saved=null;
    try{saved=JSON.parse(localStorage.getItem('do_tele_panel_pos')||'null')}catch{}
    const valid=saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)&&saved.x>=b.left-r.width&&saved.x<=b.right&&saved.y>=b.top-r.height&&saved.y<=b.bottom;
    if(valid)setPanelPosition(saved.x,saved.y,false);
    else setPanelPosition(b.left+(b.width-r.width)/2,b.bottom-r.height-8,false)
  })
}
function beginPanelDrag(e){
  if(!dragEnabled()||!telePanel)return false;
  e.preventDefault();teleDragging=true;
  const owner=teleDragHandle||telePanel;owner.setPointerCapture?.(e.pointerId);
  const r=telePanel.getBoundingClientRect();
  teleDragStart={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top};
  return true
}
function movePanelDrag(e){
  if(!teleDragging||!teleDragStart||e.pointerId!==teleDragStart.id)return;
  e.preventDefault();setPanelPosition(teleDragStart.left+(e.clientX-teleDragStart.x),teleDragStart.top+(e.clientY-teleDragStart.y),false)
}
function endPanelDrag(e){
  if(!teleDragging)return;teleDragging=false;const r=telePanel.getBoundingClientRect();teleDragStart=null;setPanelPosition(r.left,r.top,true);
  try{(teleDragHandle||telePanel).releasePointerCapture?.(e.pointerId)}catch{}
}
if(teleDragHandle){
  teleDragHandle.addEventListener('pointerdown',e=>{if(e.target.closest?.('#teleCenterPanel'))return;beginPanelDrag(e)});
  teleDragHandle.addEventListener('pointermove',movePanelDrag);
  teleDragHandle.addEventListener('pointerup',endPanelDrag);
  teleDragHandle.addEventListener('pointercancel',endPanelDrag)
}
if(telePanel){
  telePanel.addEventListener('pointerdown',e=>{
    if(e.target.closest?.('button,input,select,a,.tele-config-section,.tele-toolbar-one'))return;
    if(e.target.closest?.('#teleDragHandle'))return;
    beginPanelDrag(e)
  });
  telePanel.addEventListener('pointermove',movePanelDrag);
  telePanel.addEventListener('pointerup',endPanelDrag);
  telePanel.addEventListener('pointercancel',endPanelDrag)
}
if($('teleCenterPanel'))$('teleCenterPanel').onclick=e=>{e.preventDefault();e.stopPropagation();centerTelePanel(true)};
document.addEventListener('fullscreenchange',()=>setTimeout(()=>{syncTelePanelDrag();if(dragEnabled())requestAnimationFrame(()=>centerTelePanel(false))},100));
visualViewport?.addEventListener('resize',()=>{if(dragEnabled()){const r=telePanel.getBoundingClientRect();setPanelPosition(r.left,r.top,false)}});
syncTeleSettings();
async function refresh(){window.PortalTrace?.log('REFRESH_START');P=await api('portal_get');P=window.DoctorPortalArea?.filterPortalData?.(P)||P;window.DoctorPortalArea?.decorate?.();window.PortalTrace?.log('REFRESH_DATA',{sessions:P?.sessions?.length||0,production_items:P?.production_items?.length||0,calendar_items:P?.calendar_items?.length||0,publications:P?.publications?.length||0});if(D.querySelector('.tab[data-tab="record"]')){renderRecord();window.PortalTrace?.log('REFRESH_RENDER_RECORD_OK')}else window.PortalTrace?.log('REFRESH_RENDER_RECORD_SKIPPED','Panel Para grabar eliminado');renderCal();window.PortalTrace?.log('REFRESH_RENDER_CAL_CALLED');renderHist();window.PortalTrace?.log('REFRESH_RENDER_HIST_OK')}async function init(){try{if(q.get('token'))localStorage.setItem(ACCESS_KEY,q.get('token'));}catch{}window.PortalTrace?.log('INIT_START',{has_token:Boolean(token),deep:Boolean(deep)});window.__PORTAL_ACCESS_READY__=resolvePortalAccess();const access=await window.__PORTAL_ACCESS_READY__;if(!access){window.PortalTrace?.error('INIT_NO_ACCESS','Este navegador no tiene token ni sesión iniciada.');const cal=$('calendar'),tabs=D.querySelector('.tabs');if(cal)cal.style.display='none';if(tabs)tabs.style.display='none';return err('Inicia sesión en este navegador para acceder al calendario.',true)}try{$('err').style.display='none';await refresh();if(deep)await openSession(deep,'record');window.PortalTrace?.log('INIT_OK')}catch(e){window.PortalTrace?.error('INIT_FAIL',{message:e?.message||String(e),stack:e?.stack||''});if(e?.message?.includes('sesión')||e?.message?.includes('acceso'))err(e.message,true);else err(e.message)}}init();