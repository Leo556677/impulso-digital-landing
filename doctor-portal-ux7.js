(()=>{
  const shotsEl=document.getElementById('shots');
  const vhero=document.getElementById('vhero');
  const videos=document.getElementById('videos');
  if(!shotsEl||!vhero||!videos)return;

  const svg=(id,cls='block-ico')=>`<svg class="${cls}" aria-hidden="true"><use href="#${id}"></use></svg>`;
  const list=v=>Array.isArray(v)?v:[v].filter(Boolean);
  const norm=v=>String(v??'').replace(/\s+/g,' ').trim();
  const teleText=v=>String(v??'').trim().split(/\s+/).filter(Boolean).map(w=>`<span class="tele-token">${esc(w)}</span>`).join(' ');
  const GENERIC_DOCTOR_URL='https://commons.wikimedia.org/wiki/Special:Redirect/file/Female%20doctor.jpg?width=720';

  function model(){return window.RecordingModel||null;}
  function approvedView(p){try{return model()?.approvedView?.(p)||null;}catch{return null;}}
  function projectLabel(p){try{return model()?.projectLabel?.(p)||'';}catch{return '';}}
  function sceneText(v,s){try{return model()?.sceneText?.(v,s)||'';}catch{return '';}}

  function humanize(value){
    let s=String(value||'').trim();
    if(!s)return '';
    s=s.replace(/\bP0?(\d+)\b/gi,'Toma $1');
    s=s.replace(/ACTION_BRIDGE|POSITION_RESET|ANGLE_RESET|OBJECT_CALLBACK|PROP_BRIDGE/gi,'');
    s=s.replace(/completamente estable/gi,'quieto');
    s=s.replace(/quedar estable\s*2\s*s/gi,'quédate quieto 2 segundos');
    s=s.replace(/mantener\s*2\s*s/gi,'mantén 2 segundos');
    s=s.replace(/2\s*s\b/gi,'2 segundos');
    s=s.replace(/micro\s*pausa/gi,'pausa breve');
    s=s.replace(/composición frontal estable/gi,'posición de frente a cámara');
    s=s.replace(/posición frontal/gi,'posición de frente');
    s=s.replace(/regreso a frontal/gi,'regreso a posición de frente');
    s=s.replace(/plano medio frontal/gi,'encuadre de frente con torso y manos visibles');
    s=s.replace(/plano medio/gi,'encuadre con torso y manos visibles');
    s=s.replace(/close[- ]?up/gi,'encuadre cercano del rostro');
    s=s.replace(/ligero ángulo lateral/gi,'ligeramente de lado');
    s=s.replace(/gesto semántico descendente/gi,'gesto suave hacia abajo');
    s=s.replace(/gesto descendente/gi,'gesto suave hacia abajo');
    s=s.replace(/reencuadre/gi,'cambio de enfoque');
    s=s.replace(/payoff/gi,'cierre principal');
    s=s.replace(/CTA textual/gi,'texto final en pantalla');
    s=s.replace(/Vertical\s*9:16\s*[·\-]?\s*/gi,'');
    s=s.replace(/cámara fija a altura de ojos/gi,'cámara quieta a la altura de los ojos');
    s=s.replace(/cámara quieta\.\s*cámara quieta/gi,'cámara quieta');
    s=s.replace(/\s*·\s*/g,'. ');
    s=s.replace(/\s*;\s*/g,'. ');
    s=s.replace(/\.{2,}/g,'.');
    s=s.replace(/\s+/g,' ').trim();
    s=s.replace(/^[:.\-\s]+|[:.\-\s]+$/g,'');
    return s;
  }

  function imgBox(url,label,eager=false,extra=''){
    if(!url||!/^https?:\/\//i.test(url))return `<div class="visual compact-ref no-ref ${extra}"><span class="visual-status">Sin referencia</span></div>`;
    return `<div class="visual compact-ref ${extra}"><span class="visual-status">Cargando referencia…</span><img src="${esc(url)}" alt="${esc(label)}" loading="${eager?'eager':'lazy'}" decoding="async" ${eager?'fetchpriority="high"':'fetchpriority="low"'}></div>`;
  }

  function pieceGuide(_url,label='Referencia visual'){
    return `<div class="generic-doctor-wrap project-start-guide"><img class="generic-doctor-img" src="${GENERIC_DOCTOR_URL}" alt="Referencia visual genérica de profesional médico" loading="eager" decoding="async" fetchpriority="high"><small>Referencia visual genérica</small></div>`;
  }

  function wireImages(root){
    root.querySelectorAll('.compact-ref img').forEach(img=>{
      const box=img.closest('.compact-ref'),status=box?.querySelector('.visual-status');
      const ok=()=>{box?.classList.add('loaded');if(status)status.textContent='';};
      const bad=()=>{box?.classList.add('failed');if(status)status.textContent='Referencia no disponible';img.remove();};
      if(img.complete){img.naturalWidth?ok():bad();return;}
      img.addEventListener('load',ok,{once:true});
      img.addEventListener('error',bad,{once:true});
    });
  }

  function block(kind,title,icon,text){
    if(!text)return '';
    return `<div class="ib ${kind}"><div class="ib-title">${svg(icon)}<span>${esc(title)}</span></div><div class="ib-copy">${esc(text)}</div></div>`;
  }

  function projectMeta(p){
    const label=projectLabel(p);
    return `${label?`<div class="project-heading">${esc(label)}</div>`:''}<h2>${esc(pt(p))}</h2><div class="project-details"><p><b>Servicio:</b> ${esc(p.servicio||'Por definir')}</p><p><b>Objetivo:</b> ${esc(p.objetivo||'Por definir')}</p></div>`;
  }

  function humanGuide(scene,n){
    const parts=[`Escena ${n+1}.`];
    if(scene.position)parts.push(`Dónde colocarte: ${scene.position}.`);
    if(scene.gaze)parts.push(`Dónde mirar: ${scene.gaze}.`);
    const actions=list(scene.actions).filter(Boolean);if(actions.length)parts.push(`Qué debes hacer: ${actions.join(' ')}.`);
    if(scene.finish_instruction)parts.push(`Al terminar: ${scene.finish_instruction}.`);
    const camera=list(scene.camera_instructions).filter(Boolean);if(camera.length)parts.push(`Para quien graba: ${camera.join(' ')}.`);
    return norm(parts.join(' '));
  }

  function legacyGuide(shot,n){
    const action=humanize([shot?.accion,shot?.mirada_gesto].filter(Boolean).join('. '));
    const seen=humanize([shot?.que_se_ve,shot?.camara].filter(Boolean).join('. '));
    const movement=humanize([shot?.movimiento,shot?.continuidad].filter(Boolean).join('. '));
    return norm([`Toma ${n+1}.`,action?`Qué haces: ${action}.`:'',seen?`Qué debe verse: ${seen}.`:'',movement?`Continuidad: ${movement}.`:''].filter(Boolean).join(' '));
  }

  const vstate={text:'',offset:0,playing:false,paused:false,rate:.95,run:0,raf:0,started:0,startOffset:0,voiceName:''};

  function voiceScore(v){
    const n=String(v?.name||'').toLowerCase(),l=String(v?.lang||'').toLowerCase();let s=0;
    if(!l.startsWith('es'))return -999;
    if(/natural|neural|premium|enhanced/.test(n))s+=120;
    if(/google/.test(n))s+=95;if(/microsoft/.test(n))s+=75;
    if(/siri|paulina|mónica|monica|helena|sabina|alvaro|álvaro|jorge|luciana/.test(n))s+=65;
    if(l.startsWith('es-pe'))s+=35;else if(l.startsWith('es-mx'))s+=28;else if(l.startsWith('es-us'))s+=24;else if(l.startsWith('es-es'))s+=20;
    if(v.localService===false)s+=8;return s;
  }
  function spanishVoices(){return (speechSynthesis?.getVoices?.()||[]).filter(v=>String(v.lang||'').toLowerCase().startsWith('es')).sort((a,b)=>voiceScore(b)-voiceScore(a));}
  function bestVoice(){const vs=spanishVoices();if(vstate.voiceName){const saved=vs.find(v=>v.name===vstate.voiceName);if(saved)return saved;}return vs[0]||null;}

  function ensurePlayer(){
    let o=document.getElementById('sceneVoiceOverlayV7');if(o)return o;
    o=document.createElement('div');o.id='sceneVoiceOverlayV7';o.className='scene-voice-overlay-v7';o.setAttribute('aria-hidden','true');
    o.innerHTML=`<div class="scene-voice-card-v7" role="dialog" aria-modal="true"><div class="scene-voice-top-v7"><div><small>GUÍA DE ESTA ESCENA</small><b id="sceneVoiceTitleV7">Escena</b></div><button id="sceneVoiceCloseV7" class="scene-voice-close-v7" type="button" aria-label="Cerrar">${svg('x','voice-ico-v7')}</button></div><div id="sceneVoiceTextV7" class="scene-voice-text-v7"></div><div class="scene-voice-progress-v7"><input id="sceneVoiceProgressV7" type="range" min="0" max="100" step="1" value="0"><span id="sceneVoicePctV7">0%</span></div><div class="scene-voice-controls-v7"><button id="sceneVoicePlayV7" class="voice-control-v7 primary" type="button">${svg('playi','voice-ico-v7')} Play</button><button id="sceneVoicePauseV7" class="voice-control-v7" type="button">${svg('pause','voice-ico-v7')} Pausa</button><button id="sceneVoiceRestartV7" class="voice-control-v7" type="button" aria-label="Reiniciar">${svg('reset','voice-ico-v7')}</button></div><div class="voice-settings-v7"><label class="voice-setting-v7"><span>Voz</span><select id="sceneVoiceSelectV7"></select></label><label class="voice-setting-v7"><span>Velocidad</span><select id="sceneVoiceRateV7"><option value="0.8">0.8×</option><option value="0.95" selected>0.95×</option><option value="1.1">1.1×</option><option value="1.25">1.25×</option></select></label></div><div class="voice-quality-note">Puedes cambiar la voz, velocidad, pausar, reiniciar y mover el progreso.</div></div>`;
    document.body.appendChild(o);
    document.getElementById('sceneVoiceCloseV7').onclick=closePlayer;
    document.getElementById('sceneVoicePlayV7').onclick=playVoice;
    document.getElementById('sceneVoicePauseV7').onclick=pauseVoice;
    document.getElementById('sceneVoiceRestartV7').onclick=()=>startVoice(0);
    document.getElementById('sceneVoiceRateV7').onchange=e=>{vstate.rate=Number(e.target.value)||.95;if(vstate.playing)startVoice(vstate.offset);};
    document.getElementById('sceneVoiceSelectV7').onchange=e=>{vstate.voiceName=e.target.value;try{localStorage.setItem('do_voice_name',vstate.voiceName)}catch{}if(vstate.playing)startVoice(vstate.offset);};
    const pr=document.getElementById('sceneVoiceProgressV7');
    pr.oninput=e=>document.getElementById('sceneVoicePctV7').textContent=`${Math.round(Number(e.target.value)||0)}%`;
    pr.onchange=e=>{const pct=Math.max(0,Math.min(100,Number(e.target.value)||0));vstate.offset=Math.round(vstate.text.length*pct/100);updateProgress(vstate.offset);if(vstate.playing)startVoice(vstate.offset);};
    o.addEventListener('click',e=>{if(e.target===o)closePlayer();});
    if('speechSynthesis' in window){try{vstate.voiceName=localStorage.getItem('do_voice_name')||''}catch{};speechSynthesis.addEventListener?.('voiceschanged',populateVoices);}
    return o;
  }
  function populateVoices(){const sel=document.getElementById('sceneVoiceSelectV7');if(!sel)return;const vs=spanishVoices();sel.innerHTML=vs.length?vs.map(v=>`<option value="${esc(v.name)}" ${v.name===(bestVoice()?.name||'')?'selected':''}>${esc(v.name)} · ${esc(v.lang)}</option>`).join(''):'<option value="">Voz del navegador</option>';if(!vstate.voiceName&&vs[0])vstate.voiceName=vs[0].name;if(vstate.voiceName&&vs.some(v=>v.name===vstate.voiceName))sel.value=vstate.voiceName;}
  function updateProgress(offset){vstate.offset=Math.max(0,Math.min(vstate.text.length,Number(offset)||0));const pct=vstate.text.length?Math.round(vstate.offset/vstate.text.length*100):0;const r=document.getElementById('sceneVoiceProgressV7'),p=document.getElementById('sceneVoicePctV7');if(r&&!r.matches(':active'))r.value=String(pct);if(p)p.textContent=`${pct}%`;}
  function stopTicker(){if(vstate.raf)cancelAnimationFrame(vstate.raf);vstate.raf=0;}
  function ticker(){stopTicker();const tick=()=>{if(!vstate.playing||vstate.paused)return;const e=(performance.now()-vstate.started)/1000;updateProgress(Math.min(vstate.text.length,vstate.startOffset+e*(13*vstate.rate)));vstate.raf=requestAnimationFrame(tick);};vstate.raf=requestAnimationFrame(tick);}
  function startVoice(offset=0){if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance)return;vstate.run++;const run=vstate.run;speechSynthesis.cancel();vstate.offset=Math.max(0,Math.min(vstate.text.length,Number(offset)||0));if(vstate.offset>=vstate.text.length)vstate.offset=0;const u=new SpeechSynthesisUtterance(vstate.text.slice(vstate.offset));u.lang='es-PE';u.rate=vstate.rate;u.pitch=1.02;u.volume=1;const chosen=bestVoice();if(chosen){u.voice=chosen;vstate.voiceName=chosen.name;}const base=vstate.offset;u.onboundary=e=>{if(run===vstate.run)updateProgress(base+(e.charIndex||0));};u.onend=()=>{if(run!==vstate.run)return;vstate.playing=false;vstate.paused=false;stopTicker();updateProgress(vstate.text.length);};u.onerror=()=>{if(run!==vstate.run)return;vstate.playing=false;vstate.paused=false;stopTicker();};vstate.playing=true;vstate.paused=false;vstate.started=performance.now();vstate.startOffset=vstate.offset;speechSynthesis.speak(u);ticker();}
  function playVoice(){if(!vstate.text)return;if(vstate.playing&&vstate.paused&&speechSynthesis.paused){speechSynthesis.resume();vstate.paused=false;vstate.started=performance.now();vstate.startOffset=vstate.offset;ticker();return;}if(!vstate.playing||vstate.offset>=vstate.text.length)startVoice(vstate.offset>=vstate.text.length?0:vstate.offset);}
  function pauseVoice(){if(!vstate.playing||vstate.paused)return;speechSynthesis.pause();vstate.paused=true;stopTicker();}
  function closePlayer(){vstate.run++;vstate.playing=false;vstate.paused=false;stopTicker();if('speechSynthesis' in window)speechSynthesis.cancel();const o=document.getElementById('sceneVoiceOverlayV7');if(o){o.classList.remove('on');o.setAttribute('aria-hidden','true');}}
  function openPlayer(title,text){if(typeof play!=='undefined'&&play){play=false;cancelAnimationFrame(raf);playI();}const o=ensurePlayer();vstate.text=norm(text);vstate.offset=0;vstate.rate=.95;vstate.playing=false;vstate.paused=false;document.getElementById('sceneVoiceTitleV7').textContent=title;document.getElementById('sceneVoiceTextV7').textContent=vstate.text;document.getElementById('sceneVoiceRateV7').value='.95';populateVoices();updateProgress(0);o.classList.add('on');o.setAttribute('aria-hidden','false');}

  renderVideos=function(items){
    videos.innerHTML=items.length?items.map((x,i)=>`<article class="card video jsV compact-video" data-i="${i}"><div class="vr"><span class="vn">${i+1}</span><span class="vo">DE ${items.length}</span><span class="pill ${x.estado==='GRABADO'?'ok':''}">${x.estado==='GRABADO'?ic('check'):ic('playi')} ${x.estado==='GRABADO'?'Grabado':'Pendiente'}</span></div><div class="video-row no-script-image"><div class="vb"><h3>${esc(pt(x.pieza))}</h3><div class="meta"><span>${esc(x.pieza.servicio||'')}</span><span>${ic('clk')} ${x.pieza.duracion_seg?x.pieza.duracion_seg+' s':''}</span></div><button class="cta">${x.estado==='GRABADO'?'Revisar video':'Abrir y grabar'}</button></div></div></article>`).join(''):'<div class="card empty">Esta sesión todavía no tiene videos.</div>';
    document.querySelectorAll('.jsV').forEach(x=>x.onclick=()=>openVideo(+x.dataset.i));
  };

  openVideo=function(i){
    Item=S?.items?.[i];if(!Item)return;Item.__portalIndex=i;
    const p=Item.pieza||{},v=approvedView(p),raw=Array.isArray(Item.tomas)?Item.tomas:[];
    const humanScenes=v?.scenes||[];
    const topRef=(humanScenes.find(s=>s.scene_kind==='PRINCIPAL'&&s.reference_url)||humanScenes.find(s=>s.reference_url))?.reference_url||firstImg(Item);
    document.getElementById('sdetail').style.display='none';document.getElementById('vdetail').style.display='block';
    const recorded=Item.estado==='GRABADO',canRecord=recorded||Boolean(v&&p.production_status?.PRODUCTION_READY);
    vhero.innerHTML=`<div class="card detail compact-detail"><div class="project-overview-grid">${pieceGuide(topRef,'Referencia visual')}<div class="project-overview-main">${projectMeta(p)}</div></div><div class="actions project-main-actions"><button id="teleb" class="btn primary">${ic('playi')} Abrir teleprompter</button><button id="recb" class="btn ok ${recorded?'recorded':''}" ${canRecord?'':'disabled'}>${recorded?ic('check')+' Grabado':ic('check')+' Marcar grabado'}</button></div>${v?.preparations?.length?`<div class="ib top-prep"><div class="ib-title">${svg('cam')}<span>Antes de empezar</span></div><div class="ib-copy">${esc(v.preparations.join(' '))}</div></div>`:''}</div>`;

    const cards=humanScenes.length?humanScenes.map((s,n)=>{
      const spoken=s.scene_kind==='PRINCIPAL'?sceneText(v,s):'';
      const closing=(s.spoken_segment_ids||[]).includes(v.closing_segment_id);
      const ref='';
      const script=spoken?`<div class="say"><div class="say-label">${svg('msg')}<span>Guion${closing?' · Cierre incluido':''}</span></div><div class="say-copy">${esc(spoken)}</div></div>`:`<div class="say support-say"><div class="say-label">${svg('cam')}<span>Video de apoyo</span></div><div class="say-copy">No necesitas hablar en esta escena.</div></div>`;
      const actions=list(s.actions).filter(Boolean).join(' '),camera=list(s.camera_instructions).filter(Boolean).join(' ');
      return `<article class="card shot human-scene"><div class="shothead"><div class="sleft"><span class="sn">${n+1}</span><div><b>${esc(s.title||`Escena ${n+1}`)}</b><div class="stime">${s.scene_kind==='PRINCIPAL'?'Escena hablada':'Video de apoyo'}</div></div></div><span class="shotcount">${n+1}/${humanScenes.length}</span></div>${ref}${script}<button class="scene-guide-play" type="button" data-scene-guide="${n}">${svg('playi','voice-ico-v7')}<span>Play guía de esta escena</span></button><div class="ins">${block('action-block','Dónde colocarte','pin',s.position)}${block('visual-block','Dónde mirar','eye',s.gaze)}${block('action-block','Qué debes hacer','move',actions)}${block('visual-block','Al terminar','pause',s.finish_instruction)}${block('visual-block','Para quien graba','cam',camera)}</div></article>`;
    }).join(''):raw.map((s,n)=>{
      const action=humanize([s.accion,s.mirada_gesto].filter(Boolean).join('. ')),seen=humanize([s.que_se_ve,s.camara].filter(Boolean).join('. '));
      const ref='',script=s.que_se_dice?`<div class="say"><div class="say-label">${svg('msg')}<span>Guion</span></div><div class="say-copy">${esc(s.que_se_dice)}</div></div>`:`<div class="say support-say"><div class="say-copy">Video de apoyo: no necesitas hablar.</div></div>`;
      return `<article class="card shot"><div class="shothead"><div class="sleft"><span class="sn">${n+1}</span><div><b>Toma ${n+1}</b><div class="stime">${esc(s.tiempo||'')}</div></div></div><span class="shotcount">${n+1}/${raw.length}</span></div>${ref}${script}<button class="scene-guide-play" type="button" data-legacy-guide="${n}">${svg('playi','voice-ico-v7')}<span>Play guía de esta toma</span></button><div class="ins">${block('action-block','Qué haces','move',action)}${block('visual-block','Qué debe verse','eye',seen)}</div></article>`;
    }).join('');

    let hint=document.getElementById('shotsHint');if(!hint){hint=document.createElement('div');hint.id='shotsHint';shotsEl.parentNode.insertBefore(hint,shotsEl);}const total=humanScenes.length||raw.length;hint.style.display=total?'flex':'none';hint.innerHTML=total?`<b>${total} escenas</b><span>Desliza ← →</span>`:'';
    shotsEl.innerHTML=cards||'<div class="card empty">Las indicaciones todavía no están cargadas.</div>';
    document.querySelectorAll('[data-scene-guide]').forEach(btn=>btn.onclick=()=>{const n=Number(btn.dataset.sceneGuide),s=humanScenes[n];if(s)openPlayer(`Escena ${n+1} · ${s.title||''}`,humanGuide(s,n));});
    document.querySelectorAll('[data-legacy-guide]').forEach(btn=>btn.onclick=()=>{const n=Number(btn.dataset.legacyGuide),s=raw[n];if(s)openPlayer(`Toma ${n+1}`,legacyGuide(s,n));});
    document.getElementById('teleb').onclick=()=>openTele(Item);if(canRecord)document.getElementById('recb').onclick=()=>toggleRec(Item);requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
  };

  openTele=function(x){
    const p=x?.pieza||{},v=approvedView(p),raw=Array.isArray(x?.tomas)?x.tomas:[],emphasis=typeof emphasisPhrases==='function'?emphasisPhrases(x):[];
    $('ttitle').textContent=[projectLabel(p),pt(p)].filter(Boolean).join(' · ');const hint=$('ttitle')?.nextElementSibling;
    let sceneGuides=[];
    if(v){
      const scenes=v.scenes.filter(s=>s.scene_kind==='PRINCIPAL'&&(s.spoken_segment_ids||[]).length);
      sceneGuides=scenes.map((s,n)=>({title:`Escena ${n+1} · ${s.title||''}`,text:humanGuide(s,n)}));
      lines.innerHTML=scenes.map((s,n)=>{const text=sceneText(v,s),closing=(s.spoken_segment_ids||[]).includes(v.closing_segment_id);return `<section class="tele-scene"><div class="tele-scene-head"><div class="tele-scene-id"><span class="tele-scene-num">${n+1}</span><div><b>${esc(s.title||`Escena ${n+1}`)}</b><small>${closing?'CIERRE INCLUIDO · DETENTE AL TERMINAR':'DETENTE · CAMBIA DE ESCENA'}</small></div></div><button class="tele-scene-audio" type="button" data-v7scene="${n}" aria-label="Reproducir guía de la escena ${n+1}">${svg('playi','voice-ico')}<span>Play guía</span></button></div><p class="line" data-i="${n}">${teleText(text)}</p></section>`;}).join('');
    }else{
      const scenes=raw.map((shot,idx)=>({shot,idx})).filter(v=>v.shot?.que_se_dice);
      sceneGuides=scenes.map(({shot,idx})=>({title:`Toma ${idx+1}`,text:legacyGuide(shot,idx)}));
      lines.innerHTML=scenes.length?scenes.map(({shot,idx},si)=>`<section class="tele-scene"><div class="tele-scene-head"><div class="tele-scene-id"><span class="tele-scene-num">${idx+1}</span><div><b>Toma ${idx+1}</b><small>DETENTE · CAMBIA DE TOMA</small></div></div><button class="tele-scene-audio" type="button" data-v7scene="${si}" aria-label="Reproducir guía de la toma ${idx+1}">${svg('playi','voice-ico')}<span>Play guía</span></button></div><p class="line" data-i="${si}">${teleText(shot.que_se_dice)}</p></section>`).join(''):String(p.master_script||'').split(/\n+/).filter(Boolean).map((t,i)=>`<section class="tele-scene"><div class="tele-scene-head"><div class="tele-scene-id"><span class="tele-scene-num">${i+1}</span><div><b>Escena ${i+1}</b><small>DETENTE · CAMBIA DE ESCENA</small></div></div></div><p class="line" data-i="${i}">${teleText(t)}</p></section>`).join('');
    }
    const matched=typeof markTeleRehooks==='function'?markTeleRehooks(emphasis):0;
    if(typeof teleEmphasisSeen!=='undefined')teleEmphasisSeen=new Set();
    if(typeof teleEmphasisHoldUntil!=='undefined')teleEmphasisHoldUntil=0;
    if(hint)hint.textContent=emphasis.length?`${matched}/${emphasis.length} énfasis · verde antes · rojo al llegar · pausa automática`:'Teleprompter por escenas · sin énfasis marcados en este guion';
    document.querySelectorAll('[data-v7scene]').forEach(btn=>btn.onclick=()=>{const g=sceneGuides[Number(btn.dataset.v7scene)];if(g)openPlayer(g.title,g.text);});
    try{fs=Number(localStorage.getItem('do_tele_font'))||(innerWidth<600?34:44);const saved=Number(localStorage.getItem('do_tele_speed')||120);sr.value=String(saved<60?120:saved)}catch{fs=innerWidth<600?34:44;sr.value='120'}
    applyF();speedL();play=false;countdownActive=false;playI();syncTeleSettings();tele.classList.add('on');document.body.style.overflow='hidden';scr.scrollTop=0;
    if(typeof teleScrollTarget!=='undefined')teleScrollTarget=0;
    prepareTeleTrack(true);
    if(typeof teleDiagStart==='function')teleDiagStart();
    if(typeof teleDiagPush==='function')teleDiagPush('UX7_OPEN',{emphasis_total:emphasis.length,emphasis_matched:matched,scenes:sceneGuides.length});
    setTimeout(()=>{prepareTeleTrack(true);if(typeof teleScrollTarget!=='undefined')teleScrollTarget=scr.scrollTop;focus();if(typeof teleDiagPush==='function')teleDiagPush('UX7_READY',typeof teleDiagSnapshot==='function'?teleDiagSnapshot('ux7-ready'):{})},90);
  };
})();
