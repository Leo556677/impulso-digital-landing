(()=>{
  const shotsEl=document.getElementById('shots');
  const vhero=document.getElementById('vhero');
  const videos=document.getElementById('videos');
  if(!shotsEl||!vhero||!videos)return;

  const svgUse=(id,cls='block-ico')=>`<svg class="${cls}" aria-hidden="true"><use href="#${id}"></use></svg>`;

  function imgBox(url,label,eager=false,extra=''){
    if(!url||!/^https?:\/\//i.test(url))return `<div class="visual compact-ref no-ref ${extra}"><span class="visual-status">Sin referencia</span></div>`;
    return `<div class="visual compact-ref ${extra}"><span class="visual-status">Cargando referencia…</span><img src="${esc(url)}" alt="${esc(label)}" loading="${eager?'eager':'lazy'}" decoding="async" ${eager?'fetchpriority="high"':'fetchpriority="low"'}></div>`;
  }

  function pieceGuide(url,label){
    if(!url||!/^https?:\/\//i.test(url))return '';
    return `<div class="piece-guide-wrap"><div class="piece-guide-title">Guía completa de tomas</div>${imgBox(url,label,true,'piece-guide')}</div>`;
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

  function recordButtonLabel(state,saving=false){
    if(state==='GRABADO')return `${ic('check')} ${saving?'Grabado · guardando…':'Grabado'}`;
    return `${ic('check')} ${saving?'Guardando…':'Marcar grabado'}`;
  }

  function syncVideoCardState(index,state){
    const card=videos.querySelector(`.jsV[data-i="${index}"]`);
    if(!card)return;
    const pill=card.querySelector('.pill');
    const cta=card.querySelector('.cta');
    if(pill){pill.classList.toggle('ok',state==='GRABADO');pill.innerHTML=`${state==='GRABADO'?ic('check'):ic('playi')} ${state==='GRABADO'?'Grabado':'Pendiente'}`;}
    if(cta)cta.textContent=state==='GRABADO'?'Revisar video':'Abrir y grabar';
  }

  function refreshLocalProgress(){
    if(!S?.items||!S?.session)return;
    const done=S.items.filter(x=>x.estado==='GRABADO').length,total=S.items.length,pc=total?Math.round(done/total*100):0;
    const hero=document.getElementById('shero');
    if(hero)hero.innerHTML=`<div class="card detail"><div class="date">${esc(fd(S.session.fecha))}</div><h2>${esc(st(S.session))}</h2><div class="sub">${S.session.lugar?ic('pin')+esc(S.session.lugar):''}</div><div class="prog"><span style="width:${pc}%"></span></div><small>${done} de ${total} videos grabados</small></div>`;
    const summary=P?.sessions?.find(x=>x.id===S.session.id);
    if(summary)summary.recorded=done;
  }

  toggleRec=async function(x){
    const btn=document.getElementById('recb');
    if(!x||!btn||btn.dataset.saving==='1')return;
    const previous=x.estado;
    const next=previous==='GRABADO'?'PENDIENTE':'GRABADO';
    x.estado=next;
    btn.dataset.saving='1';
    btn.classList.toggle('recorded',next==='GRABADO');
    btn.classList.add('saving');
    btn.innerHTML=recordButtonLabel(next,true);
    const idx=Number.isInteger(x.__portalIndex)?x.__portalIndex:S?.items?.indexOf(x);
    if(idx>=0)syncVideoCardState(idx,next);
    refreshLocalProgress();
    try{
      const result=await api('mark_piece',{session_piece_id:x.session_piece_id,estado:next});
      x.estado=result.estado||next;
      btn.classList.toggle('recorded',x.estado==='GRABADO');
      btn.innerHTML=recordButtonLabel(x.estado,false);
      if(idx>=0)syncVideoCardState(idx,x.estado);
      refreshLocalProgress();
    }catch(error){
      x.estado=previous;
      btn.classList.toggle('recorded',previous==='GRABADO');
      btn.innerHTML=recordButtonLabel(previous,false);
      if(idx>=0)syncVideoCardState(idx,previous);
      refreshLocalProgress();
      alert(error?.message||'No se pudo guardar el cambio.');
    }finally{
      btn.dataset.saving='0';
      btn.classList.remove('saving');
    }
  };

  function instructionText(shot,n){
    const action=[shot?.accion,shot?.mirada_gesto].filter(Boolean).join('. ');
    const seen=[shot?.que_se_ve,shot?.camara].filter(Boolean).join('. ');
    const movement=[shot?.movimiento,shot?.continuidad].filter(Boolean).join('. ');
    return [
      `Toma ${n+1}.`,
      action?`Qué haces: ${action}.`:'',
      seen?`Qué debe verse: ${seen}.`:'',
      movement?`Continuidad: ${movement}.`:''
    ].filter(Boolean).join(' ');
  }

  const voice={text:'',scene:'',index:0,offset:0,rate:1,playing:false,paused:false,runId:0,raf:0,startedAt:0,startOffset:0};

  function ensureVoicePlayer(){
    let overlay=document.getElementById('sceneVoiceOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='sceneVoiceOverlay';
    overlay.className='scene-voice-overlay';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`<div class="scene-voice-card" role="dialog" aria-modal="true" aria-labelledby="sceneVoiceTitle">
      <div class="scene-voice-top"><div><small>INDICACIONES DE ESCENA</small><b id="sceneVoiceTitle">Toma</b></div><button id="sceneVoiceClose" class="scene-voice-close" type="button" aria-label="Cerrar">${svgUse('x','voice-ico')}</button></div>
      <div id="sceneVoiceText" class="scene-voice-text"></div>
      <div class="scene-voice-progress"><input id="sceneVoiceProgress" type="range" min="0" max="100" step="1" value="0" aria-label="Progreso"><span id="sceneVoicePct">0%</span></div>
      <div class="scene-voice-controls">
        <button id="sceneVoicePlay" class="voice-control primary" type="button">${svgUse('playi','voice-ico')}<span>Play</span></button>
        <button id="sceneVoicePause" class="voice-control" type="button">${svgUse('pause','voice-ico')}<span>Pausa</span></button>
        <button id="sceneVoiceRestart" class="voice-control icon-only" type="button" aria-label="Reiniciar">${svgUse('reset','voice-ico')}</button>
        <label class="voice-rate"><span>Velocidad</span><select id="sceneVoiceRate"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option></select></label>
      </div>
    </div>`;
    (document.getElementById('tele')||document.body).appendChild(overlay);
    document.getElementById('sceneVoiceClose').onclick=closeVoicePlayer;
    document.getElementById('sceneVoicePlay').onclick=playVoice;
    document.getElementById('sceneVoicePause').onclick=pauseVoice;
    document.getElementById('sceneVoiceRestart').onclick=()=>{voice.offset=0;updateVoiceProgress(0);startVoice(0);};
    document.getElementById('sceneVoiceRate').onchange=e=>{
      voice.rate=Number(e.target.value)||1;
      if(voice.playing){const wasPaused=voice.paused;startVoice(voice.offset);if(wasPaused)pauseVoice();}
    };
    const progress=document.getElementById('sceneVoiceProgress');
    progress.oninput=e=>document.getElementById('sceneVoicePct').textContent=`${Math.round(Number(e.target.value)||0)}%`;
    progress.onchange=e=>{
      const pct=Math.max(0,Math.min(100,Number(e.target.value)||0));
      voice.offset=Math.round(voice.text.length*pct/100);
      updateVoiceProgress(voice.offset);
      if(voice.playing)startVoice(voice.offset);
    };
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeVoicePlayer();});
    return overlay;
  }

  function spanishVoice(){
    const voices=window.speechSynthesis?.getVoices?.()||[];
    return voices.find(v=>String(v.lang||'').toLowerCase().startsWith('es-pe'))||voices.find(v=>String(v.lang||'').toLowerCase().startsWith('es'))||null;
  }

  function updateVoiceProgress(offset){
    voice.offset=Math.max(0,Math.min(voice.text.length,offset||0));
    const pct=voice.text.length?Math.round(voice.offset/voice.text.length*100):0;
    const range=document.getElementById('sceneVoiceProgress'),label=document.getElementById('sceneVoicePct');
    if(range&&!range.matches(':active'))range.value=String(pct);
    if(label)label.textContent=`${pct}%`;
  }

  function stopVoiceTicker(){if(voice.raf)cancelAnimationFrame(voice.raf);voice.raf=0;}
  function voiceTicker(){
    stopVoiceTicker();
    const tick=()=>{
      if(!voice.playing||voice.paused)return;
      const elapsed=(performance.now()-voice.startedAt)/1000;
      const estimated=voice.startOffset+elapsed*(14*voice.rate);
      if(estimated>voice.offset)updateVoiceProgress(Math.min(voice.text.length,estimated));
      voice.raf=requestAnimationFrame(tick);
    };
    voice.raf=requestAnimationFrame(tick);
  }

  function startVoice(offset=0){
    if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance){
      const text=document.getElementById('sceneVoiceText');
      if(text)text.innerHTML='<b>La reproducción por voz no está disponible en este navegador.</b>';
      return;
    }
    voice.runId++;
    const run=voice.runId;
    speechSynthesis.cancel();
    voice.offset=Math.max(0,Math.min(voice.text.length,offset));
    if(voice.offset>=voice.text.length)voice.offset=0;
    const remaining=voice.text.slice(voice.offset);
    const utter=new SpeechSynthesisUtterance(remaining);
    utter.lang='es-PE';
    utter.rate=voice.rate;
    const chosen=spanishVoice();if(chosen)utter.voice=chosen;
    const base=voice.offset;
    utter.onboundary=e=>{if(run!==voice.runId)return;updateVoiceProgress(base+(e.charIndex||0));};
    utter.onend=()=>{if(run!==voice.runId)return;voice.playing=false;voice.paused=false;stopVoiceTicker();updateVoiceProgress(voice.text.length);};
    utter.onerror=()=>{if(run!==voice.runId)return;voice.playing=false;voice.paused=false;stopVoiceTicker();};
    voice.playing=true;voice.paused=false;voice.startedAt=performance.now();voice.startOffset=voice.offset;
    speechSynthesis.speak(utter);
    voiceTicker();
  }

  function playVoice(){
    if(!voice.text)return;
    if(voice.playing&&voice.paused&&speechSynthesis.paused){
      speechSynthesis.resume();voice.paused=false;voice.startedAt=performance.now();voice.startOffset=voice.offset;voiceTicker();return;
    }
    if(!voice.playing||voice.offset>=voice.text.length)startVoice(voice.offset>=voice.text.length?0:voice.offset);
  }

  function pauseVoice(){
    if(!voice.playing||voice.paused)return;
    speechSynthesis.pause();voice.paused=true;stopVoiceTicker();
  }

  function closeVoicePlayer(){
    voice.runId++;voice.playing=false;voice.paused=false;stopVoiceTicker();
    if('speechSynthesis' in window)speechSynthesis.cancel();
    const overlay=document.getElementById('sceneVoiceOverlay');
    if(overlay){overlay.classList.remove('on');overlay.setAttribute('aria-hidden','true');}
  }

  function openVoicePlayer(shot,n){
    if(typeof play!=='undefined'&&play){play=false;cancelAnimationFrame(raf);playI();}
    const overlay=ensureVoicePlayer();
    voice.text=instructionText(shot,n);voice.scene=`Toma ${n+1}`;voice.offset=0;voice.rate=1;voice.playing=false;voice.paused=false;
    document.getElementById('sceneVoiceTitle').textContent=voice.scene;
    document.getElementById('sceneVoiceText').textContent=voice.text;
    document.getElementById('sceneVoiceRate').value='1';
    updateVoiceProgress(0);
    overlay.classList.add('on');overlay.setAttribute('aria-hidden','false');
  }

  function instructionBlock(kind,title,icon,text){
    if(!text)return '';
    return `<div class="ib ${kind}"><div class="ib-title">${svgUse(icon)}<span>${esc(title)}</span></div><div class="ib-copy">${esc(text)}</div></div>`;
  }

  renderVideos=function(items){
    videos.innerHTML=items.length?items.map((x,i)=>{
      const thumb=firstImg(x);
      return `<article class="card video jsV compact-video" data-i="${i}"><div class="vr"><span class="vn">${i+1}</span><span class="vo">DE ${items.length}</span><span class="pill ${x.estado==='GRABADO'?'ok':''}">${x.estado==='GRABADO'?ic('check'):ic('playi')} ${x.estado==='GRABADO'?'Grabado':'Pendiente'}</span></div><div class="video-row">${imgBox(thumb,'Referencia de grabación',true)}<div class="vb"><h3>${esc(pt(x.pieza))}</h3><div class="meta"><span>${esc(x.pieza.servicio||'')}</span><span>${ic('clk')} ${x.pieza.duracion_seg?x.pieza.duracion_seg+' s':''}</span></div><button class="cta">${x.estado==='GRABADO'?'Revisar video':'Abrir y grabar'}</button></div></div></article>`;
    }).join(''):'<div class="card empty">Esta sesión todavía no tiene videos.</div>';
    wireImages(videos);
    document.querySelectorAll('.jsV').forEach(x=>x.onclick=()=>openVideo(+x.dataset.i));
  };

  openVideo=function(i){
    Item=S?.items?.[i];
    if(!Item)return;
    Item.__portalIndex=i;
    const p=Item.pieza||{},sh=Array.isArray(Item.tomas)?Item.tomas:[];
    const refs=sh.map(s=>s.reference_url).filter(u=>u&&/^https?:\/\//i.test(u));
    const uniqueRefs=[...new Set(refs)];
    const oneGuide=sh.length>0&&refs.length===sh.length&&uniqueRefs.length===1?uniqueRefs[0]:'';
    document.getElementById('sdetail').style.display='none';
    document.getElementById('vdetail').style.display='block';

    vhero.innerHTML=`<div class="card detail compact-detail">${oneGuide?pieceGuide(oneGuide,'Guía completa de todas las tomas'):''}<div class="date">VIDEO ${i+1}</div><h2>${esc(pt(p))}</h2><div class="meta"><span>${esc(p.servicio||'')}</span><span>${p.duracion_seg?p.duracion_seg+' s':''}</span></div><div class="actions"><button id="teleb" class="btn primary">${ic('playi')} Abrir teleprompter</button><button id="recb" class="btn ok ${Item.estado==='GRABADO'?'recorded':''}">${recordButtonLabel(Item.estado,false)}</button></div></div>`;

    let hint=document.getElementById('shotsHint');
    if(!hint){hint=document.createElement('div');hint.id='shotsHint';shotsEl.parentNode.insertBefore(hint,shotsEl);}
    hint.style.display=sh.length?'flex':'none';
    hint.innerHTML=sh.length?`<b>${sh.length} tomas</b><span>↓ Sigue en orden</span>`:'';

    shotsEl.innerHTML=sh.length?sh.map((s,n)=>{
      const isB=s.tipo==='BROLL';
      const action=[s.accion,s.mirada_gesto].filter(Boolean).join(' · ');
      const seen=[s.que_se_ve,s.camara].filter(Boolean).join(' · ');
      const ref=oneGuide?'':imgBox(s.reference_url,isB?'Referencia de B-roll':'Composición de la toma',n===0);
      const script=s.que_se_dice?`<div class="say"><div class="say-label">${svgUse('msg')}<span>Lo que dices</span></div><div class="say-copy">${esc(s.que_se_dice)}</div></div>`:'';
      return `<article class="card shot"><div class="shothead"><div class="sleft"><span class="sn">${n+1}</span><div><b>Toma ${n+1}${isB?' · B-roll':''}</b><div class="stime">${esc(s.tiempo||'')}</div></div></div><span class="shotcount">${n+1}/${sh.length}</span></div>${script}${ref}<div class="ins">${instructionBlock('action-block','Qué haces','move',action)}${instructionBlock('visual-block','Qué debe verse','eye',seen)}</div></article>`;
    }).join(''):'<div class="card empty">Las indicaciones todavía no están cargadas.</div>';

    wireImages(vhero);
    wireImages(shotsEl);
    document.getElementById('teleb').onclick=()=>openTele(Item);
    document.getElementById('recb').onclick=()=>toggleRec(Item);
    requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
  };

  openTele=function(x){
    const all=Array.isArray(x?.tomas)?x.tomas:[];
    const scenes=all.map((shot,idx)=>({shot,idx})).filter(v=>v.shot?.que_se_dice);
    $('ttitle').textContent=pt(x.pieza);
    const teleHint=$('ttitle')?.nextElementSibling;if(teleHint)teleHint.textContent='Cada bloque de color marca una nueva toma';
    lines.innerHTML=scenes.length?scenes.map(({shot,idx},sceneIndex)=>`<section class="tele-scene"><div class="tele-scene-head"><div class="tele-scene-id"><span class="tele-scene-num">${idx+1}</span><div><b>Toma ${idx+1}</b><small>${esc(shot.funcion||'Nueva escena')} · DETENTE Y CAMBIA</small></div></div><button class="tele-scene-audio" type="button" data-scene="${sceneIndex}" aria-label="Escuchar indicaciones de la toma ${idx+1}">${svgUse('playi','voice-ico')}<span>Indicaciones</span></button></div><p class="line" data-i="${sceneIndex}">${esc(shot.que_se_dice)}</p></section>`).join(''):String(x.pieza?.master_script||'').split(/\n+/).filter(Boolean).map((t,i)=>`<section class="tele-scene"><div class="tele-scene-head"><div class="tele-scene-id"><span class="tele-scene-num">${i+1}</span><div><b>Escena ${i+1}</b><small>DETENTE Y CAMBIA</small></div></div></div><p class="line" data-i="${i}">${esc(t)}</p></section>`).join('');
    document.querySelectorAll('.tele-scene-audio').forEach(btn=>btn.onclick=()=>{const v=scenes[Number(btn.dataset.scene)];if(v)openVoicePlayer(v.shot,v.idx);});
    fs=44;applyF();sr.value=32;speedL();play=false;playI();tele.classList.add('on');document.body.style.overflow='hidden';scr.scrollTop=0;setTimeout(focus,30);
  };
})();
