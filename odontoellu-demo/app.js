(() => {
  const STORAGE_KEY = 'odontoellu_requests_v1';
  const DEMO_MODE = true;
  const WHATSAPP = '51969857330';
  const form = document.querySelector('#booking-form');
  const dateInput = document.querySelector('#date');
  const timeSelect = document.querySelector('#time');
  const statusBox = document.querySelector('#form-status');
  const successDialog = document.querySelector('#success-dialog');
  const successSummary = document.querySelector('#success-summary');
  const whatsappLink = document.querySelector('#whatsapp-link');
  const privacyDialog = document.querySelector('#privacy-dialog');

  const pad = n => String(n).padStart(2, '0');
  const isoLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const dateFromInput = value => {
    const [y,m,d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };
  const formatDate = value => dateFromInput(value).toLocaleDateString('es-PE', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
  const formatTime = hour => {
    const date = new Date(2000,0,1,hour,0);
    return date.toLocaleTimeString('es-PE',{hour:'numeric',minute:'2-digit'});
  };
  const showStatus = (message, type='error') => {
    statusBox.textContent = message;
    statusBox.className = `form-status show ${type}`;
  };
  const clearStatus = () => { statusBox.textContent = ''; statusBox.className = 'form-status'; };

  function setDateLimits(){
    const now = new Date();
    const max = new Date(now);
    max.setDate(max.getDate() + 30);
    dateInput.min = isoLocal(now);
    dateInput.max = isoLocal(max);
  }

  function validHours(dateValue){
    if(!dateValue) return [];
    const chosen = dateFromInput(dateValue);
    const day = chosen.getDay();
    if(day === 0) return [];
    const now = new Date();
    const sameDay = isoLocal(now) === dateValue;
    const hours = [];
    for(let hour=9; hour<=20; hour++){
      if(hour === 12) continue;
      const start = new Date(chosen);
      start.setHours(hour,0,0,0);
      if(sameDay && (start.getTime() - now.getTime()) < 30*60*1000) continue;
      hours.push(hour);
    }
    return hours;
  }

  function refreshTimes(){
    clearStatus();
    const value = dateInput.value;
    timeSelect.innerHTML = '';
    if(!value){
      timeSelect.disabled = true;
      timeSelect.innerHTML = '<option value="">Primero elige una fecha</option>';
      return;
    }
    const chosen = dateFromInput(value);
    if(chosen.getDay() === 0){
      timeSelect.disabled = true;
      timeSelect.innerHTML = '<option value="">Domingo no disponible</option>';
      showStatus('Los domingos no están disponibles. Elige una fecha de lunes a sábado.');
      return;
    }
    const hours = validHours(value);
    if(hours.length === 0){
      timeSelect.disabled = true;
      timeSelect.innerHTML = '<option value="">Sin horarios válidos</option>';
      showStatus('Para esa fecha ya no quedan horas que cumplan la anticipación mínima de 30 minutos. Prueba con otro día.');
      return;
    }
    timeSelect.disabled = false;
    timeSelect.append(new Option('Selecciona una hora',''));
    hours.forEach(hour => timeSelect.append(new Option(formatTime(hour), `${pad(hour)}:00`)));
  }

  function readRequests(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  function saveRequest(item){
    const all = readRequests();
    all.unshift(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  function sanitizePhone(value){ return value.replace(/\D+/g,''); }
  function validate(){
    clearStatus();
    const values = Object.fromEntries(new FormData(form).entries());
    let ok = true;
    [...form.querySelectorAll('input,select')].forEach(el => el.removeAttribute('aria-invalid'));
    const fail = (el, msg) => { if(ok) el.focus(); el.setAttribute('aria-invalid','true'); showStatus(msg); ok=false; };
    if(!values.date) fail(dateInput,'Elige una fecha.');
    else if(dateFromInput(values.date).getDay() === 0) fail(dateInput,'Los domingos no están disponibles.');
    else if(!values.time) fail(timeSelect,'Elige una hora.');
    else if(!values.name || values.name.trim().length < 2) fail(document.querySelector('#name'),'Escribe tu nombre.');
    else {
      const phone = sanitizePhone(values.phone || '');
      if(phone.length < 9 || phone.length > 12) fail(document.querySelector('#phone'),'Escribe un celular válido.');
      else if(!document.querySelector('#privacy').checked) fail(document.querySelector('#privacy'),'Debes aceptar el aviso de privacidad del prototipo para continuar.');
    }
    return ok ? values : null;
  }

  function buildWhatsapp(item){
    const text = `Hola, soy ${item.name}. Registré una solicitud para evaluación + profilaxis dental el ${formatDate(item.date)} a las ${item.time}. ¿Pueden confirmar disponibilidad?`;
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const values = validate();
    if(!values) return;
    const item = {
      id: (crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}`),
      createdAt: new Date().toISOString(),
      date: values.date,
      time: values.time,
      name: values.name.trim(),
      phone: sanitizePhone(values.phone),
      status: 'pendiente',
      source: 'prototipo-local'
    };
    saveRequest(item);
    successSummary.innerHTML = `<dl><dt>Fecha</dt><dd>${formatDate(item.date)}</dd><dt>Hora</dt><dd>${item.time}</dd><dt>Nombre</dt><dd>${item.name}</dd><dt>Celular</dt><dd>${item.phone}</dd><dt>Estado</dt><dd>Pendiente</dd></dl>`;
    whatsappLink.href = buildWhatsapp(item);
    successDialog.showModal();
    form.reset();
    refreshTimes();
    showStatus('Solicitud guardada localmente en este navegador.', 'info');
    if(!DEMO_MODE){ setTimeout(() => { window.location.href = buildWhatsapp(item); }, 1600); }
  });

  dateInput?.addEventListener('change', refreshTimes);
  document.querySelector('[data-close-success]')?.addEventListener('click', () => successDialog.close());
  document.querySelector('[data-open-privacy]')?.addEventListener('click', () => privacyDialog.showModal());
  document.querySelector('[data-close-privacy]')?.addEventListener('click', () => privacyDialog.close());

  setDateLimits();
  refreshTimes();
})();
