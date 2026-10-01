(()=>{
  'use strict';

  const tele=document.getElementById('tele');
  if(!tele)return;

  const playBtn=document.getElementById('playb');
  const closeButtons=[document.getElementById('closeb'),document.getElementById('closeb2')].filter(Boolean);
  let stream=null;
  let recorder=null;
  let chunks=[];
  let facing='user';
  let startedAt=0;
  let elapsedTimer=0;
  let wakeLock=null;
  let reviewUrl='';
  let reviewFile=null;
  let closeCameraAfterStop=false;
  let pendingStop=false;

  const ui={};

  function pad(n){return String(n).padStart(2,'0')}
  function elapsed(){
    if(!startedAt)return '00:00';
    const s=Math.max(0,Math.floor((Date.now()-startedAt)/1000));
    return `${pad(Math.floor(s/60))}:${pad(s%60)}`;
  }
  function safeName(v){
    return String(v||'dr-olano').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,52)||'dr-olano';
  }
  function fileStamp(){
    const d=new Date();
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }
  function isRecording(){return Boolean(recorder&&recorder.state!=='inactive')}
  function canUseCamera(){return Boolean(navigator.mediaDevices?.getUserMedia&&window.MediaRecorder)}
  function cameraErrorMessage(err){
    const n=String(err?.name||'');
    if(n==='NotAllowedError'||n==='PermissionDeniedError')return 'Permite cámara y micrófono en el navegador para grabar.';
    if(n==='NotFoundError'||n==='DevicesNotFoundError')return 'No se encontró una cámara o micrófono disponible.';
    if(n==='NotReadableError'||n==='TrackStartError')return 'La cámara está siendo usada por otra aplicación.';
    if(!window.isSecureContext)return 'La cámara requiere abrir esta página por HTTPS.';
    return 'No se pudo abrir la cámara. Revisa los permisos del navegador.';
  }
  function chooseMimeType(){
    if(!window.MediaRecorder?.isTypeSupported)return '';
    const types=[
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm'
    ];
    return types.find(t=>MediaRecorder.isTypeSupported(t))||'';
  }
  function extensionFor(type){
    return String(type||'').toLowerCase().includes('mp4')?'mp4':'webm';
  }
  function setStatus(text,state='idle'){
    if(!ui.status)return;
    ui.status.textContent=text;
    ui.status.dataset.state=state;
  }
  function updateControls(){
    const on=Boolean(stream);
    const recording=isRecording();
    if(ui.cameraBtn){
      ui.cameraBtn.classList.toggle('active',on);
      ui.cameraBtn.setAttribute('aria-pressed',on?'true':'false');
      ui.cameraBtn.innerHTML=on?'<span class="tele-cam-icon">CAM</span><span>Vista</span>':'<span class="tele-cam-icon">CAM</span><span>Cámara</span>';
    }
    if(ui.recordBtn){
      ui.recordBtn.classList.toggle('recording',recording);
      ui.recordBtn.innerHTML=recording?'<span class="tele-rec-dot"></span><span id="teleRecElapsed">00:00</span>':'<span class="tele-rec-dot"></span><span>GRABAR</span>';
      ui.recordBtn.setAttribute('aria-label',recording?'Detener grabación':'Iniciar grabación');
    }
    if(ui.flipBtn)ui.flipBtn.disabled=recording;
    tele.classList.toggle('camera-preview-on',on);
    tele.classList.toggle('camera-recording',recording);
    if(ui.stage)ui.stage.hidden=!on;
    if(ui.preview){
      ui.preview.classList.toggle('front-camera',facing==='user');
      ui.preview.classList.toggle('rear-camera',facing==='environment');
    }
  }
  function tickElapsed(){
    if(!isRecording()){clearInterval(elapsedTimer);elapsedTimer=0;return}
    const x=document.getElementById('teleRecElapsed');
    if(x)x.textContent=elapsed();
  }
  function makeUi(){
    if(document.getElementById('teleRecordDock'))return;

    const stage=document.createElement('div');
    stage.id='teleCameraStage';
    stage.className='tele-camera-stage';
    stage.hidden=true;
    stage.innerHTML='<video id="teleCameraPreview" autoplay muted playsinline></video><div class="tele-camera-vignette" aria-hidden="true"></div>';
    tele.insertBefore(stage,tele.firstChild);

    const dock=document.createElement('div');
    dock.id='teleRecordDock';
    dock.className='tele-record-dock';
    dock.innerHTML=`
      <button id="teleCameraBtn" type="button" aria-label="Activar cámara" aria-pressed="false"><span class="tele-cam-icon">CAM</span><span>Cámara</span></button>
      <button id="teleRecordBtn" type="button" class="tele-record-btn" aria-label="Iniciar grabación"><span class="tele-rec-dot"></span><span>GRABAR</span></button>
      <button id="teleFlipCameraBtn" type="button" aria-label="Cambiar cámara"><span class="tele-flip-icon">↻</span><span>Girar</span></button>
      <span id="teleCameraStatus" class="tele-camera-status" data-state="idle">Cámara apagada</span>
    `;
    tele.appendChild(dock);

    const review=document.createElement('section');
    review.id='teleCameraReview';
    review.className='tele-camera-review';
    review.hidden=true;
    review.innerHTML=`
      <div class="tele-camera-review-card" role="dialog" aria-modal="true" aria-labelledby="teleCameraReviewTitle">
        <div class="tele-camera-review-head">
          <div><small>GRABACIÓN TERMINADA</small><b id="teleCameraReviewTitle">Revisa el video</b></div>
          <button id="teleCameraReviewClose" type="button" aria-label="Cerrar revisión">×</button>
        </div>
        <video id="teleCameraReviewVideo" controls playsinline></video>
        <div class="tele-camera-review-actions">
          <button id="teleCameraRepeat" type="button">Repetir</button>
          <button id="teleCameraSave" type="button" class="primary">Guardar video</button>
        </div>
        <p>El archivo guarda solo cámara y micrófono. El texto del teleprompter no aparece en el video.</p>
      </div>
    `;
    document.body.appendChild(review);

    ui.stage=stage;
    ui.preview=document.getElementById('teleCameraPreview');
    ui.dock=dock;
    ui.cameraBtn=document.getElementById('teleCameraBtn');
    ui.recordBtn=document.getElementById('teleRecordBtn');
    ui.flipBtn=document.getElementById('teleFlipCameraBtn');
    ui.status=document.getElementById('teleCameraStatus');
    ui.review=review;
    ui.reviewVideo=document.getElementById('teleCameraReviewVideo');
    ui.reviewClose=document.getElementById('teleCameraReviewClose');
    ui.repeat=document.getElementById('teleCameraRepeat');
    ui.save=document.getElementById('teleCameraSave');

    ui.cameraBtn.onclick=async()=>{
      if(isRecording())return;
      if(stream)stopCamera();
      else await openCamera();
    };
    ui.recordBtn.onclick=()=>isRecording()?stopRecording():startRecording();
    ui.flipBtn.onclick=switchCamera;
    ui.reviewClose.onclick=()=>hideReview();
    ui.repeat.onclick=()=>hideReview();
    ui.save.onclick=saveRecording;
    review.addEventListener('click',e=>{if(e.target===review)hideReview()});

    if(!canUseCamera()){
      dock.classList.add('unsupported');
      setStatus('Este navegador no permite grabar desde la web.','error');
      ui.cameraBtn.disabled=true;
      ui.recordBtn.disabled=true;
      ui.flipBtn.disabled=true;
    }
    updateControls();
  }
  async function openCamera(){
    if(stream)return stream;
    if(!canUseCamera()){setStatus('Grabación no disponible en este navegador.','error');return null}
    setStatus('Solicitando cámara y micrófono…','busy');
    try{
      stream=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
        video:{
          facingMode:{ideal:facing},
          width:{ideal:1080},
          height:{ideal:1920}
        }
      });
      ui.preview.srcObject=stream;
      await ui.preview.play().catch(()=>{});
      stream.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>{if(!isRecording())stopCamera()}));
      setStatus(facing==='user'?'Cámara frontal lista':'Cámara posterior lista','ready');
      updateControls();
      window.PortalTrace?.log?.('TELE_CAMERA_READY',{facing,video:stream.getVideoTracks()[0]?.getSettings?.()||{}});
      return stream;
    }catch(err){
      stream=null;
      setStatus(cameraErrorMessage(err),'error');
      updateControls();
      window.PortalTrace?.warn?.('TELE_CAMERA_FAIL',{name:err?.name||'',message:err?.message||String(err)});
      return null;
    }
  }
  function stopCamera(){
    if(isRecording()){stopRecording({closeCamera:true});return}
    if(stream){
      stream.getTracks().forEach(t=>{try{t.stop()}catch{}});
      stream=null;
    }
    if(ui.preview)ui.preview.srcObject=null;
    setStatus('Cámara apagada','idle');
    updateControls();
    window.PortalTrace?.log?.('TELE_CAMERA_STOP',{});
  }
  async function switchCamera(){
    if(isRecording())return;
    const old=facing;
    facing=facing==='user'?'environment':'user';
    if(stream){
      stream.getTracks().forEach(t=>{try{t.stop()}catch{}});
      stream=null;
      if(ui.preview)ui.preview.srcObject=null;
    }
    const opened=await openCamera();
    if(opened)return;
    facing=old;
    await openCamera();
  }
  async function lockScreen(){
    try{if('wakeLock' in navigator)wakeLock=await navigator.wakeLock.request('screen')}catch{}
  }
  async function unlockScreen(){
    try{await wakeLock?.release?.()}catch{}
    wakeLock=null;
  }
  async function startRecording(){
    if(isRecording()||pendingStop)return;
    const s=await openCamera();
    if(!s)return;
    chunks=[];
    closeCameraAfterStop=false;
    const mime=chooseMimeType();
    try{
      recorder=new MediaRecorder(s,mime?{mimeType:mime}:undefined);
    }catch(err){
      setStatus('Este navegador abrió la cámara, pero no pudo iniciar el video.','error');
      window.PortalTrace?.warn?.('TELE_RECORD_CONSTRUCTOR_FAIL',{message:err?.message||String(err),mime});
      return;
    }
    recorder.ondataavailable=e=>{if(e.data&&e.data.size>0)chunks.push(e.data)};
    recorder.onerror=e=>{
      setStatus('La grabación se interrumpió.','error');
      window.PortalTrace?.warn?.('TELE_RECORD_ERROR',{message:e?.error?.message||e?.message||'MediaRecorder error'});
    };
    recorder.onstop=finishRecording;
    try{
      recorder.start(1000);
      startedAt=Date.now();
      clearInterval(elapsedTimer);
      elapsedTimer=setInterval(tickElapsed,500);
      updateControls();
      tickElapsed();
      setStatus('Grabando cámara + micrófono','recording');
      await lockScreen();
      window.PortalTrace?.log?.('TELE_RECORD_START',{mime:recorder.mimeType||mime,facing});
      setTimeout(()=>{
        const label=playBtn?.getAttribute('aria-label')||'';
        if(playBtn&&/reproducir/i.test(label))playBtn.click();
      },120);
    }catch(err){
      startedAt=0;
      clearInterval(elapsedTimer);
      elapsedTimer=0;
      recorder=null;
      updateControls();
      setStatus('No se pudo iniciar la grabación.','error');
      await unlockScreen();
      window.PortalTrace?.warn?.('TELE_RECORD_START_FAIL',{message:err?.message||String(err)});
    }
  }
  function stopRecording({closeCamera=false}={}){
    closeCameraAfterStop=closeCameraAfterStop||closeCamera;
    if(!isRecording()){
      if(closeCamera)stopCamera();
      return;
    }
    if(pendingStop)return;
    pendingStop=true;
    const label=playBtn?.getAttribute('aria-label')||'';
    if(playBtn&&/pausar/i.test(label)){
      try{playBtn.click()}catch{}
    }
    setStatus('Finalizando video…','busy');
    try{recorder.stop()}catch{
      pendingStop=false;
      if(closeCameraAfterStop)stopCamera();
    }
  }
  async function finishRecording(){
    clearInterval(elapsedTimer);elapsedTimer=0;pendingStop=false;
    await unlockScreen();
    const type=recorder?.mimeType||chunks.find(x=>x?.type)?.type||'video/webm';
    const blob=new Blob(chunks,{type});
    const duration=startedAt?Math.max(0,Date.now()-startedAt):0;
    startedAt=0;
    const title=document.getElementById('ttitle')?.textContent||'dr-olano';
    const ext=extensionFor(type);
    const name=`dr-olano-${safeName(title)}-${fileStamp()}.${ext}`;
    try{reviewFile=new File([blob],name,{type:blob.type||type,lastModified:Date.now()})}catch{reviewFile=blob;reviewFile.name=name}
    showReview(blob);
    recorder=null;
    chunks=[];
    updateControls();
    if(closeCameraAfterStop){
      closeCameraAfterStop=false;
      stopCamera();
    }else{
      setStatus('Video listo para revisar','ready');
    }
    window.PortalTrace?.log?.('TELE_RECORD_STOP',{bytes:blob.size,type:blob.type,duration_ms:duration,name});
  }
  function showReview(blob){
    if(reviewUrl){URL.revokeObjectURL(reviewUrl);reviewUrl=''}
    reviewUrl=URL.createObjectURL(blob);
    ui.reviewVideo.src=reviewUrl;
    ui.review.hidden=false;
    document.body.classList.add('tele-camera-review-open');
  }
  function hideReview(){
    ui.review.hidden=true;
    try{ui.reviewVideo.pause()}catch{}
    document.body.classList.remove('tele-camera-review-open');
  }
  async function saveRecording(){
    if(!reviewFile||!reviewUrl)return;
    const name=reviewFile.name||`dr-olano-${fileStamp()}.${extensionFor(reviewFile.type)}`;
    try{
      if(reviewFile instanceof File&&navigator.share&&navigator.canShare?.({files:[reviewFile]})){
        await navigator.share({files:[reviewFile],title:'Video Dr. Olano'});
        return;
      }
    }catch(err){
      if(String(err?.name||'')==='AbortError')return;
    }
    const a=document.createElement('a');
    a.href=reviewUrl;
    a.download=name;
    a.rel='noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function stopForTeleClose(){
    if(isRecording())stopRecording({closeCamera:true});
    else stopCamera();
  }

  makeUi();
  closeButtons.forEach(b=>b.addEventListener('click',stopForTeleClose,true));
  window.addEventListener('beforeunload',()=>{
    try{if(isRecording())recorder.stop()}catch{}
    try{stream?.getTracks?.().forEach(t=>t.stop())}catch{}
    if(reviewUrl)URL.revokeObjectURL(reviewUrl);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&isRecording()&&!wakeLock)lockScreen();
  });

  window.DoctorPortalCamera={
    start:startRecording,
    stop:()=>stopRecording(),
    camera:openCamera,
    closeCamera:stopCamera,
    state:()=>({supported:canUseCamera(),camera_on:Boolean(stream),recording:isRecording(),facing})
  };
})();