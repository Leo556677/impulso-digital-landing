(() => {
  const STORAGE_KEY = 'odontoellu_requests_v1';
  const WHATSAPP = '51969857330';
  const DEMO_MODE = true;

  const dialog = document.querySelector('#v5-booking-dialog');
  const modalBody = document.querySelector('#v5-modal-body');
  const appointmentStep = document.querySelector('#v5-step-appointment');
  const contactStep = document.querySelector('#v5-step-contact');
  const calendarCard = document.querySelector('#v5-calendar-card');
  const calendarGrid = document.querySelector('#v5-calendar-grid');
  const calendarTitle = document.querySelector('#v5-calendar-title');
  const prevMonth = document.querySelector('#v5-prev-month');
  const nextMonth = document.querySelector('#v5-next-month');
  const dateSummary = document.querySelector('#v5-date-summary');
  const dateSummaryText = document.querySelector('#v5-date-summary-text');
  const changeDate = document.querySelector('#v5-change-date');
  const hoursPanel = document.querySelector('#v5-hours-panel');
  const hoursGrid = document.querySelector('#v5-hours-grid');
  const continueBtn = document.querySelector('#v5-continue');
  const backBtn = document.querySelector('#v5-back');
  const submitBtn = document.querySelector('#v5-submit');
  const nameInput = document.querySelector('#v5-name');
  const phoneInput = document.querySelector('#v5-phone');
  const selectedCard = document.querySelector('#v5-selected-card');
  const successDialog = document.querySelector('#v5-success-dialog');
  const successSummary = document.querySelector('#v5-success-summary');
  const successWhatsapp = document.querySelector('#v5-success-whatsapp');
  const privacyDialog = document.querySelector('#v5-privacy-dialog');
  const stickyCta = document.querySelector('#v5-sticky-cta');
  const heroCta = document.querySelector('.v5-hero-cta');
  const bodyRoot = document.documentElement;

  const state = { date: '', time: '', stage: 'appointment' };
  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + 30);
  let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fromIso = value => { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d,0,0,0,0); };
  const formatDate = value => fromIso(value).toLocaleDateString('es-PE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const formatTime = hour => new Date(2000,0,1,hour,0).toLocaleTimeString('es-PE',{hour:'numeric',minute:'2-digit'});
  const sanitizePhone = value => value.replace(/\D+/g,'').slice(0,9);

  function readRequests(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]} }
  function saveRequest(item){ const all=readRequests(); all.unshift(item); localStorage.setItem(STORAGE_KEY,JSON.stringify(all)); }

  function validHours(dateValue){
    if(!dateValue) return [];
    const chosen=fromIso(dateValue); if(chosen.getDay()===0) return [];
    const now=new Date(); const sameDay=iso(now)===dateValue; const hours=[];
    for(let hour=9;hour<=20;hour++){
      if(hour===12) continue;
      const start=new Date(chosen); start.setHours(hour,0,0,0);
      if(sameDay && start.getTime()-now.getTime()<30*60*1000) continue;
      hours.push(hour);
    }
    return hours;
  }

  function renderCalendar(){
    calendarGrid.innerHTML='';
    calendarTitle.textContent=viewMonth.toLocaleDateString('es-PE',{month:'long',year:'numeric'});
    const first=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),1);
    const offset=(first.getDay()+6)%7;
    const days=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,0).getDate();
    for(let i=0;i<offset;i++){ const blank=document.createElement('span'); blank.className='v5-day v5-day-blank'; calendarGrid.appendChild(blank); }
    for(let day=1;day<=days;day++){
      const d=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),day); d.setHours(0,0,0,0);
      const value=iso(d); const disabled=d<today||d>maxDate||d.getDay()===0;
      const btn=document.createElement('button'); btn.type='button'; btn.className='v5-day'; btn.textContent=day; btn.dataset.date=value;
      btn.setAttribute('aria-label',d.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'}));
      if(disabled){btn.disabled=true;btn.classList.add('is-disabled')}
      if(value===iso(today)) btn.classList.add('is-today');
      if(value===state.date) btn.classList.add('is-selected');
      btn.addEventListener('click',()=>selectDate(value)); calendarGrid.appendChild(btn);
    }
    const minMonth=new Date(today.getFullYear(),today.getMonth(),1); const maxMonth=new Date(maxDate.getFullYear(),maxDate.getMonth(),1);
    prevMonth.disabled=viewMonth<=minMonth; nextMonth.disabled=viewMonth>=maxMonth;
  }

  function setContinueReady(ready){
    continueBtn.disabled=!ready;
    continueBtn.classList.toggle('is-ready',ready);
  }

  function selectDate(value){
    state.date=value; state.time=''; setContinueReady(false);
    renderCalendar(); renderHours();
    dateSummaryText.textContent=formatDate(value); calendarCard.classList.add('is-collapsed'); dateSummary.hidden=false; hoursPanel.hidden=false;
    requestAnimationFrame(()=>modalBody.scrollTo({top:Math.max(0,hoursPanel.offsetTop-6),behavior:'smooth'}));
  }

  function renderHours(){
    hoursGrid.innerHTML='';
    const hours=validHours(state.date);
    hours.forEach(hour=>{
      const btn=document.createElement('button'); btn.type='button'; btn.className='v5-hour'; btn.textContent=formatTime(hour); btn.dataset.time=`${pad(hour)}:00`;
      btn.addEventListener('click',()=>{
        state.time=btn.dataset.time;
        hoursGrid.querySelectorAll('.v5-hour').forEach(n=>n.classList.remove('is-selected'));
        btn.classList.add('is-selected'); setContinueReady(true);
        continueBtn.scrollIntoView({behavior:'smooth',block:'nearest'});
      });
      hoursGrid.appendChild(btn);
    });
  }

  function resetBooking(){
    state.date=''; state.time=''; state.stage='appointment'; viewMonth=new Date(today.getFullYear(),today.getMonth(),1);
    calendarCard.classList.remove('is-collapsed');
    dateSummary.hidden=true;
    hoursPanel.hidden=true;
    appointmentStep.hidden=false;
    contactStep.hidden=true;
    backBtn.hidden=true; continueBtn.hidden=false; setContinueReady(false); submitBtn.hidden=true; submitBtn.disabled=true; submitBtn.classList.remove('is-ready');
    nameInput.value=''; phoneInput.value=''; modalBody.scrollTop=0; renderCalendar();
  }

  function openBooking(){
    resetBooking(); document.documentElement.classList.add('v5-modal-open'); dialog.showModal();
  }
  function closeBooking(){ if(dialog.open) dialog.close(); document.documentElement.classList.remove('v5-modal-open'); }

  function showContactStep(){
    if(!state.date||!state.time) return;
    state.stage='contact';
    appointmentStep.hidden=true;
    contactStep.hidden=false;
    backBtn.hidden=false;
    continueBtn.hidden=true;
    submitBtn.hidden=false;
    selectedCard.innerHTML=`<span>Tu solicitud</span><strong>Evaluación + Profilaxis dental</strong><small>${formatDate(state.date)} · ${state.time}</small>`;
    updateSubmitState();
    modalBody.scrollTop=0;
    requestAnimationFrame(()=>{
      nameInput.focus({preventScroll:true});
      try{nameInput.setSelectionRange(nameInput.value.length,nameInput.value.length)}catch{}
      nameInput.scrollIntoView({block:'center',behavior:'smooth'});
    });
  }

  function backToAppointment(){
    state.stage='appointment'; contactStep.hidden=true; appointmentStep.hidden=false; backBtn.hidden=true; continueBtn.hidden=false; setContinueReady(Boolean(state.time)); submitBtn.hidden=true;
    requestAnimationFrame(()=>modalBody.scrollTo({top:Math.max(0,hoursPanel.offsetTop-6),behavior:'smooth'}));
  }

  function updateSubmitState(){
    const phone=sanitizePhone(phoneInput.value); if(phone!==phoneInput.value) phoneInput.value=phone;
    const ready=nameInput.value.trim().length>=2 && phone.length===9;
    submitBtn.disabled=!ready; submitBtn.classList.toggle('is-ready',ready);
  }

  function buildWhatsapp(item){
    const lines=[
      '🦷 *ODONTOELLU · SOLICITUD DE CITA*',
      '',
      `Hola, soy *${item.name}* 👋`,
      '',
      '> 🪥 *Servicio:* Evaluación + Profilaxis dental',
      `> 📅 *Fecha:* ${formatDate(item.date)}`,
      `> 🕒 *Hora preferida:* ${item.time}`,
      `> 📱 *Celular:* ${item.phone}`,
      '',
      '_Esta solicitud está pendiente de confirmación._',
      '',
      '¿Podrían confirmarme la disponibilidad, por favor? 🙌'
    ];
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  function submitBooking(){
    updateSubmitState(); if(submitBtn.disabled) return;
    const item={id:(crypto.randomUUID?crypto.randomUUID():`demo-${Date.now()}`),createdAt:new Date().toISOString(),date:state.date,time:state.time,name:nameInput.value.trim(),phone:sanitizePhone(phoneInput.value),status:'pendiente',source:'prototipo-local-v6'};
    saveRequest(item); closeBooking();
    successSummary.innerHTML=`<dl><dt>Servicio</dt><dd>Evaluación + Profilaxis</dd><dt>Fecha</dt><dd>${formatDate(item.date)}</dd><dt>Hora</dt><dd>${item.time}</dd><dt>Nombre</dt><dd>${item.name}</dd><dt>Celular</dt><dd>${item.phone}</dd><dt>Estado</dt><dd>Pendiente</dd></dl>`;
    successWhatsapp.href=buildWhatsapp(item); successDialog.showModal();
    if(!DEMO_MODE) setTimeout(()=>{window.location.href=buildWhatsapp(item)},1400);
  }

  document.querySelectorAll('.v5-open-booking').forEach(el=>el.addEventListener('click',openBooking));
  document.querySelector('#v5-close-booking')?.addEventListener('click',closeBooking);
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeBooking()});
  dialog.addEventListener('click',e=>{if(e.target===dialog)closeBooking()});
  prevMonth.addEventListener('click',()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1);renderCalendar()});
  nextMonth.addEventListener('click',()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1);renderCalendar()});
  changeDate.addEventListener('click',()=>{calendarCard.classList.remove('is-collapsed');dateSummary.hidden=true;hoursPanel.hidden=true;state.date='';state.time='';setContinueReady(false);modalBody.scrollTo({top:0,behavior:'smooth'});renderCalendar()});
  continueBtn.addEventListener('click',showContactStep); backBtn.addEventListener('click',backToAppointment);
  nameInput.addEventListener('input',updateSubmitState); phoneInput.addEventListener('input',updateSubmitState); phoneInput.addEventListener('beforeinput',e=>{if(e.data&&/\D/.test(e.data))e.preventDefault()});
  submitBtn.addEventListener('click',submitBooking);
  document.querySelector('#v5-success-close')?.addEventListener('click',()=>successDialog.close());
  successDialog.addEventListener('cancel',()=>successDialog.close());
  document.querySelector('#v5-open-privacy')?.addEventListener('click',()=>privacyDialog.showModal());
  document.querySelector('#v5-close-privacy')?.addEventListener('click',()=>privacyDialog.close());

  if('IntersectionObserver' in window){
    const heroObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>stickyCta.classList.toggle('is-visible',!entry.isIntersecting))},{threshold:.18});
    if(heroCta) heroObserver.observe(heroCta);
    const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('v5-in-view',entry.isIntersecting)),{threshold:.16});
    document.querySelectorAll('.v5-reveal').forEach(el=>revealObserver.observe(el));
  } else {
    stickyCta.classList.add('is-visible'); document.querySelectorAll('.v5-reveal').forEach(el=>el.classList.add('v5-in-view'));
  }

  renderCalendar();
})();