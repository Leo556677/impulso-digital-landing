(()=>{
  const shotsEl=document.getElementById('shots');
  const vhero=document.getElementById('vhero');
  const videos=document.getElementById('videos');
  if(!shotsEl||!vhero||!videos)return;

  function imgBox(url,label,eager=false){
    if(!url||!/^https?:\/\//i.test(url))return `<div class="visual compact-ref no-ref"><span class="visual-status">Sin referencia</span></div>`;
    return `<div class="visual compact-ref"><span class="visual-status">Cargando referencia…</span><img src="${esc(url)}" alt="${esc(label)}" loading="${eager?'eager':'lazy'}" decoding="async" ${eager?'fetchpriority="high"':'fetchpriority="low"'}></div>`;
  }

  function pieceGuide(url,label){
    if(!url||!/^https?:\/\//i.test(url))return '';
    return `<div class="piece-guide-wrap"><div class="piece-guide-title">Guía completa de tomas</div><div class="visual compact-ref piece-guide"><span class="visual-status">Cargando guía…</span><img src="${esc(url)}" alt="${esc(label)}" loading="eager" decoding="async" fetchpriority="high"></div></div>`;
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
    const p=Item.pieza||{},sh=Array.isArray(Item.tomas)?Item.tomas:[];
    const refs=sh.map(s=>s.reference_url).filter(u=>u&&/^https?:\/\//i.test(u));
    const uniqueRefs=[...new Set(refs)];
    const oneGuide=sh.length>0&&refs.length===sh.length&&uniqueRefs.length===1?uniqueRefs[0]:'';
    document.getElementById('sdetail').style.display='none';
    document.getElementById('vdetail').style.display='block';

    vhero.innerHTML=`<div class="card detail compact-detail">${oneGuide?pieceGuide(oneGuide,'Guía completa de todas las tomas'):''}<div class="date">VIDEO ${i+1}</div><h2>${esc(pt(p))}</h2><div class="meta"><span>${esc(p.servicio||'')}</span><span>${p.duracion_seg?p.duracion_seg+' s':''}</span></div><div class="actions"><button id="teleb" class="btn primary">${ic('playi')} Abrir teleprompter</button><button id="recb" class="btn ok">${ic('check')} ${Item.estado==='GRABADO'?'Marcar pendiente':'Marcar grabado'}</button></div></div>`;

    let hint=document.getElementById('shotsHint');
    if(!hint){hint=document.createElement('div');hint.id='shotsHint';shotsEl.parentNode.insertBefore(hint,shotsEl);}
    hint.style.display=sh.length?'flex':'none';
    hint.innerHTML=sh.length?`<b>${sh.length} tomas</b><span>${oneGuide?'Guía completa arriba':'Desliza ← →'}</span>`:'';

    shotsEl.innerHTML=sh.length?sh.map((s,n)=>{
      const isB=s.tipo==='BROLL';
      const action=[s.accion,s.mirada_gesto].filter(Boolean).join(' · ');
      const seen=[s.que_se_ve,s.camara].filter(Boolean).join(' · ');
      const ref=oneGuide?'':imgBox(s.reference_url,isB?'Referencia de B-roll':'Composición de la toma',n===0);
      return `<article class="card shot"><div class="shothead"><div class="sleft"><span class="sn">${n+1}</span><div><b>Toma ${n+1}${isB?' · B-roll':''}</b><div class="stime">${esc(s.tiempo||'')}</div></div></div><span class="shotcount">${n+1}/${sh.length}</span></div>${ref}<div class="ins">${action?`<div class="ib"><small>Qué haces</small>${esc(action)}</div>`:''}${seen?`<div class="ib"><small>Qué debe verse</small>${esc(seen)}</div>`:''}</div>${s.que_se_dice?`<div class="say">${esc(s.que_se_dice)}</div>`:''}</article>`;
    }).join(''):'<div class="card empty">Las indicaciones todavía no están cargadas.</div>';

    wireImages(vhero);
    wireImages(shotsEl);
    document.getElementById('teleb').onclick=()=>openTele(Item);
    document.getElementById('recb').onclick=()=>toggleRec(Item);
    requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
  };
})();
