(() => {
  const STORAGE_KEY = 'odontoellu_requests_v1';
  const DEMO_MODE = true;
  const WHATSAPP = '51969857330';
  const MAP_LINK = 'https://maps.app.goo.gl/hwPfvFTrz3CSK53T8';
  const section = document.querySelector('#solicitar');
  const layout = section?.querySelector('.booking-layout');
  const oldForm = document.querySelector('#booking-form');
  const statusRibbon = document.querySelector('.demo-ribbon');
  const mapLink = document.querySelector('#ubicacion .button-secondary');
  const mobileCta = document.querySelector('.mobile-cta');
  const heroInlineCta = document.querySelector('.hero .button[href="#solicitar"]');
  const successDialog = document.querySelector('#success-dialog');
  const successSummary = document.querySelector('#success-summary');
  const whatsappLink = document.querySelector('#whatsapp-link');
  const privacyDialog = document.querySelector('#privacy-dialog');

  if(statusRibbon) statusRibbon.textContent = 'ENTORNO DE PRUEBAS · VERSIÓN VISUAL 0.3';
  if(mapLink) mapLink.href = MAP_LINK;

  if(!section || !layout || !oldForm) return;

  section.classList.add('booking-wizard-section');
  section.querySelector('.booking-copy')?.remove();
  layout.className = 'section-shell booking-layout booking-layout-v3';

  const wizard = document.createElement('div');
  wizard.className = 'booking-wizard';
  wizard.innerHTML = `
    <div class="service-summary-card sticky-service" id="service-summary-card">
      <div>
        <span class="service-summary-label">Servicio seleccionado</span>
        <strong>Evaluación + Profilaxis dental</strong>
      </div>
      <span class="service-summary-price">Desde S/49</span>
    </div>

    <div class="booking-step" id="step-date">
      <div class="step-head"><span class="step-number">1</span><div><h3>Selecciona una fecha</h3><p>Lunes a sábado · hasta 30 días hacia adelante.</p></div></div>
      <div class="booking-card calendar-card">
        <div class="calendar-toolbar">
          <button type="button" class="calendar-nav" id="calendar-prev" aria-label="Mes anterior">‹</button>
          <strong id="calendar-title">Calendario</strong>
          <button type="button" class="calendar-nav" id="calendar-next" aria-label="Mes siguiente">›</button>
        </div>
        <div class="calendar-weekdays" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
        <div class="calendar-grid" id="calendar-grid" role="grid" aria-label="Selecciona una fecha"></div>
        <input id="date" name="date" type="hidden" required />
        <p class="field-help">Domingos no disponibles · anticipación mínima de 30 minutos.</p>
      </div>
    </div>

    <div class="booking-step step-hidden" id="step-time">
      <div class="step-head"><span class="step-number">2</span><div><h3>Selecciona una hora</h3><p>Las horas aparecen automáticamente después de elegir la fecha.</p></div></div>
      <div class="hour-grid" id="hour-grid" role="listbox" aria-label="Horas disponibles"></div>
      <div class="time-collapsed step-hidden" id="time-collapsed">
        <div><span>Hora elegida</span><strong id="time-collapsed-value">—</strong></div>
        <button type="button" class="change-link" id="change-time">Cambiar hora</button>
      </div>
    </div>

    <div class="booking-step step-hidden" id="step-contact">
      <div class="step-head"><span class="step-number">3</span><div><h3>Ingresa tus datos</h3><p>Nombre y celular para gestionar la solicitud.</p></div></div>
      <form class="booking-form booking-form-v3" id="booking-form" novalidate>
        <div class="form-status" id="form-status" role="status" aria-live="polite"></div>
        <div class="selected-summary" id="selected-summary"></div>
        <label for="name">Nombre</label>
        <input id="name" name="name" type="text" autocomplete="name" maxlength="80" placeholder="Ej. Andrea Pérez" required />
        <label for="phone">Celular</label>
        <input id="phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="15" placeholder="Ej. 987654321" required />
        <label class="consent-row" for="privacy">
          <input id="privacy" name="privacy" type="checkbox" required />
          <span>He leído el aviso de privacidad de este prototipo y autorizo guardar estos datos solo para simular la solicitud.</span>
        </label>
        <button class="button button-primary button-block" type="submit" id="reserve-button" disabled>Solicitar cita</button>
        <p class="microcopy">Modo demo: los datos se guardan únicamente en este navegador. La cita aún no queda confirmada.</p>
      </form>
    </div>`;
  oldForm.replaceWith(wizard);

  const form = document.querySelector('#booking-form');
  const dateInput = document.querySelector('#date');
  const calendarGrid = document.querySelector('#calendar-grid');
  const calendarTitle = document.querySelector('#calendar-title');
  const calendarPrev = document.querySelector('#calendar-prev');
  const calendarNext = document.querySelector('#calendar-next');
  const hourGrid = document.querySelector('#hour-grid');
  const statusBox = document.querySelector('#form-status');
  const selectedSummary = document.querySelector('#selected-summary');
  const reserveButton = document.querySelector('#reserve-button');
  const stepTime = document.querySelector('#step-time');
  const stepContact = document.querySelector('#step-contact');
  const timeCollapsed = document.querySelector('#time-collapsed');
  const timeCollapsedValue = document.querySelector('#time-collapsed-value');
  const changeTime = document.querySelector('#change-time');
  const selected = { date: '', time: '' };

  const today = new Date(); today.setHours(0,0,0,0);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate()+30);
  let viewMonth = new Date(today.getFullYear(),today.getMonth(),1);
  const pad = n => String(n).padStart(2,'0');
  const isoLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fromIso = value => { const [y,m,d]=value.split('-').map(Number); return new Date(y,m-1,d,0,0,0,0); };
  const formatDate = value => fromIso(value).toLocaleDateString('es-PE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const formatTime = hour => new Date(2000,0,1,hour,0).toLocaleTimeString('es-PE',{hour:'numeric',minute:'2-digit'});
  const smoothTo = el => setTimeout(()=>el?.scrollIntoView({behavior:'smooth',block:'start'}),100);
  const clearStatus = () => {statusBox.textContent='';statusBox.className='form-status';};
  const showStatus = (message,type='error') => {statusBox.textContent=message;statusBox.className=`form-status show ${type}`;};

  function validHours(dateValue){
    const chosen=fromIso(dateValue); if(chosen.getDay()===0) return [];
    const now=new Date(); const sameDay=isoLocal(now)===dateValue; const hours=[];
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
    for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.className='calendar-day is-outside';calendarGrid.appendChild(blank);}
    for(let day=1;day<=days;day++){
      const d=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),day);d.setHours(0,0,0,0);const iso=isoLocal(d);
      const disabled=d<today||d>maxDate||d.getDay()===0;
      const btn=document.createElement('button');btn.type='button';btn.className='calendar-day';btn.textContent=day;btn.dataset.date=iso;
      btn.setAttribute('aria-label',d.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'}));
      if(disabled){btn.disabled=true;btn.classList.add('is-disabled');}
      if(iso===isoLocal(new Date()))btn.classList.add('is-today');
      if(iso===selected.date)btn.classList.add('is-selected');
      btn.addEventListener('click',()=>selectDate(iso));calendarGrid.appendChild(btn);
    }
    const minMonth=new Date(today.getFullYear(),today.getMonth(),1);const maxMonth=new Date(maxDate.getFullYear(),maxDate.getMonth(),1);
    calendarPrev.disabled=viewMonth<=minMonth;calendarNext.disabled=viewMonth>=maxMonth;
  }

  function selectDate(iso){
    clearStatus(); selected.date=iso; selected.time=''; dateInput.value=iso; stepContact.classList.add('step-hidden');
    selectedSummary.innerHTML='';reserveButton.disabled=true;timeCollapsed.classList.add('step-hidden');hourGrid.classList.remove('step-hidden');
    renderCalendar();renderHours();
  }
  function renderHours(){
    hourGrid.innerHTML='';const hours=validHours(selected.date);
    if(!hours.length){stepTime.classList.add('step-hidden');showStatus('Para esa fecha ya no quedan horas válidas. Elige otro día.');return;}
    hours.forEach(hour=>{const btn=document.createElement('button');btn.type='button';btn.className='hour-button';btn.textContent=formatTime(hour);btn.dataset.time=`${pad(hour)}:00`;btn.addEventListener('click',()=>selectTime(btn));hourGrid.appendChild(btn);});
    stepTime.classList.remove('step-hidden');smoothTo(stepTime);
  }
  function selectTime(btn){
    selected.time=btn.dataset.time;timeCollapsedValue.textContent=btn.textContent;hourGrid.classList.add('step-hidden');timeCollapsed.classList.remove('step-hidden');
    selectedSummary.innerHTML=`<strong>Servicio:</strong> Evaluación + Profilaxis dental<br><strong>Fecha:</strong> ${formatDate(selected.date)}<br><strong>Hora:</strong> ${selected.time}`;
    stepContact.classList.remove('step-hidden');reserveButton.disabled=false;smoothTo(stepContact);
  }
  changeTime.addEventListener('click',()=>{stepContact.classList.add('step-hidden');timeCollapsed.classList.add('step-hidden');hourGrid.classList.remove('step-hidden');smoothTo(stepTime);});
  calendarPrev.addEventListener('click',()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1);renderCalendar();});
  calendarNext.addEventListener('click',()=>{viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1);renderCalendar();});

  const sanitizePhone=v=>v.replace(/\D+/g,'');
  function readRequests(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return []}}
  function saveRequest(item){const all=readRequests();all.unshift(item);localStorage.setItem(STORAGE_KEY,JSON.stringify(all));}
  function validate(){
    clearStatus();const values=Object.fromEntries(new FormData(form).entries());let ok=true;[...form.querySelectorAll('input')].forEach(el=>el.removeAttribute('aria-invalid'));
    const fail=(el,msg)=>{if(ok)el.focus();el.setAttribute('aria-invalid','true');showStatus(msg);ok=false;};
    if(!selected.date)fail(document.querySelector('#name'),'Elige una fecha.');
    else if(!selected.time)fail(document.querySelector('#name'),'Elige una hora.');
    else if(!values.name||values.name.trim().length<2)fail(document.querySelector('#name'),'Escribe tu nombre.');
    else{const phone=sanitizePhone(values.phone||'');if(phone.length<9||phone.length>12)fail(document.querySelector('#phone'),'Escribe un celular válido.');else if(!document.querySelector('#privacy').checked)fail(document.querySelector('#privacy'),'Debes aceptar el aviso de privacidad para continuar.');}
    return ok?values:null;
  }
  function wa(item){const text=`Hola, soy ${item.name}. Registré una solicitud para evaluación + profilaxis dental el ${formatDate(item.date)} a las ${item.time}. ¿Pueden confirmar disponibilidad?`;return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;}

  form.addEventListener('submit',event=>{
    event.preventDefault();const values=validate();if(!values)return;
    const item={id:crypto.randomUUID?crypto.randomUUID():`demo-${Date.now()}`,createdAt:new Date().toISOString(),date:selected.date,time:selected.time,name:values.name.trim(),phone:sanitizePhone(values.phone),status:'pendiente',source:'prototipo-local'};
    saveRequest(item);
    successSummary.innerHTML=`<dl><dt>Servicio</dt><dd>Evaluación + Profilaxis dental</dd><dt>Fecha</dt><dd>${formatDate(item.date)}</dd><dt>Hora</dt><dd>${item.time}</dd><dt>Nombre</dt><dd>${item.name}</dd><dt>Celular</dt><dd>${item.phone}</dd><dt>Estado</dt><dd>Pendiente</dd></dl>`;
    whatsappLink.href=wa(item);successDialog.showModal();
    form.reset();selected.date='';selected.time='';stepTime.classList.add('step-hidden');stepContact.classList.add('step-hidden');hourGrid.innerHTML='';hourGrid.classList.remove('step-hidden');timeCollapsed.classList.add('step-hidden');selectedSummary.innerHTML='';reserveButton.disabled=true;viewMonth=new Date(today.getFullYear(),today.getMonth(),1);renderCalendar();
    if(!DEMO_MODE)setTimeout(()=>window.location.href=wa(item),1600);
  });

  document.querySelectorAll('a[href="#solicitar"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();section.scrollIntoView({behavior:'smooth',block:'start'});}));
  document.querySelector('[data-close-success]')?.addEventListener('click',()=>successDialog.close());
  document.querySelector('[data-open-privacy]')?.addEventListener('click',()=>privacyDialog.showModal());
  document.querySelector('[data-close-privacy]')?.addEventListener('click',()=>privacyDialog.close());

  document.querySelectorAll('.feature-card').forEach((card,i)=>{card.classList.add('premium-reveal');card.style.setProperty('--delay',`${i*70}ms`);});
  document.querySelectorAll('#ubicacion .location-card,#preguntas details,.brand-card').forEach(el=>el.classList.add('premium-reveal'));
  if('IntersectionObserver' in window){
    const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('in-view',entry.isIntersecting)),{threshold:.2});
    document.querySelectorAll('.premium-reveal').forEach(el=>revealObserver.observe(el));
    let heroVisible=true,bookingVisible=false;
    const syncCta=()=>mobileCta?.classList.toggle('is-hidden',heroVisible||bookingVisible);
    if(heroInlineCta)new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;syncCta();},{threshold:.05}).observe(heroInlineCta);
    new IntersectionObserver(entries=>{bookingVisible=entries[0].isIntersecting;syncCta();},{threshold:.08}).observe(section);
  }

  renderCalendar();
})();
