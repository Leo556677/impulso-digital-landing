(() => {
  const STORAGE_KEY = 'odontoellu_requests_v1';
  const DEMO_MODE = true;
  const WHATSAPP = '51969857330';
  const MAP_LINK = 'https://maps.app.goo.gl/hwPfvFTrz3CSK53T8';

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = './booking-v4.css?v=0.4';
  document.head.appendChild(css);

  const ribbon = document.querySelector('.demo-ribbon');
  if (ribbon) ribbon.textContent = 'ENTORNO DE PRUEBAS · VERSIÓN VISUAL 0.4';

  const mapLink = document.querySelector('#ubicacion .button-secondary');
  if (mapLink) mapLink.href = MAP_LINK;

  const oldBookingSection = document.querySelector('#solicitar');
  if (oldBookingSection) oldBookingSection.classList.add('v4-hidden-booking');

  const oldMobileCta = document.querySelector('.mobile-cta');
  if (oldMobileCta) {
    oldMobileCta.classList.add('v4-mobile-cta');
    const oldLink = oldMobileCta.querySelector('a');
    if (oldLink) {
      oldLink.setAttribute('href', '#');
      oldLink.textContent = 'Solicitar cita';
      oldLink.classList.add('v4-open-booking');
    }
  }

  const whatsappFloat = document.querySelector('.whatsapp-float, .whatsapp-floating, .whatsapp-quick');
  if (whatsappFloat) whatsappFloat.classList.add('v4-whatsapp');

  const heroButton = document.querySelector('.hero a.button-primary[href="#solicitar"]');
  if (heroButton) {
    heroButton.setAttribute('href', '#');
    heroButton.classList.add('v4-open-booking');
  }

  const backdropDialog = document.createElement('dialog');
  backdropDialog.className = 'v4-booking-dialog';
  backdropDialog.id = 'v4-booking-dialog';
  backdropDialog.innerHTML = `
    <div class="v4-modal-shell">
      <header class="v4-modal-header">
        <div>
          <span class="v4-kicker">Odontoellu</span>
          <h2>Solicita tu cita</h2>
        </div>
        <button type="button" class="v4-close" aria-label="Cerrar">×</button>
      </header>

      <div class="v4-modal-body" id="v4-modal-body">
        <section class="v4-step v4-step-appointment" id="v4-step-appointment">
          <div class="v4-service-card">
            <div>
              <span>Servicio seleccionado</span>
              <strong>Evaluación + Profilaxis dental</strong>
            </div>
            <b>Desde S/49</b>
          </div>

          <div class="v4-calendar-card" id="v4-calendar-card">
            <div class="v4-calendar-top">
              <button type="button" id="v4-prev-month" aria-label="Mes anterior">‹</button>
              <strong id="v4-calendar-title">Calendario</strong>
              <button type="button" id="v4-next-month" aria-label="Mes siguiente">›</button>
            </div>
            <div class="v4-weekdays" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
            <div class="v4-calendar-grid" id="v4-calendar-grid" role="grid" aria-label="Selecciona una fecha"></div>
            <div class="v4-date-summary" id="v4-date-summary" hidden>
              <div><span>Fecha elegida</span><strong id="v4-date-summary-text">—</strong></div>
              <button type="button" id="v4-change-date">Cambiar fecha</button>
            </div>
          </div>

          <section class="v4-hours-panel" id="v4-hours-panel" hidden>
            <div class="v4-section-title">
              <span>2</span>
              <div><strong>Elige una hora</strong><small>Inicios cada 1 hora · no se ofrece 12:00 por almuerzo.</small></div>
            </div>
            <div class="v4-hours-grid" id="v4-hours-grid" role="listbox" aria-label="Horas disponibles"></div>
          </section>
        </section>

        <section class="v4-step v4-step-contact" id="v4-step-contact" hidden>
          <div class="v4-selected-card" id="v4-selected-card"></div>
          <div class="v4-contact-card">
            <span class="v4-contact-kicker">Tus datos</span>
            <h3>¿A nombre de quién hacemos la solicitud?</h3>
            <label for="v4-name">Nombre</label>
            <input id="v4-name" type="text" autocomplete="name" maxlength="80" placeholder="Escribe tu nombre" />
            <label for="v4-phone">Celular</label>
            <input id="v4-phone" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="9" autocomplete="tel" placeholder="9 dígitos" />
            <p class="v4-field-note">Solo números, 9 dígitos. La solicitud aún requiere confirmación del centro.</p>
            <p class="v4-privacy-note">Al continuar, aceptas el aviso de privacidad de este prototipo. Los datos se guardan solo en este navegador durante la prueba.</p>
          </div>
        </section>
      </div>

      <footer class="v4-modal-footer">
        <button type="button" class="v4-back" id="v4-back" hidden aria-label="Volver">←</button>
        <button type="button" class="v4-continue" id="v4-continue" disabled>Continuar</button>
        <button type="button" class="v4-submit" id="v4-submit" hidden disabled>Solicitar cita</button>
      </footer>
    </div>`;
  document.body.appendChild(backdropDialog);

  const dialog = backdropDialog;
  const modalBody = dialog.querySelector('#v4-modal-body');
  const appointmentStep = dialog.querySelector('#v4-step-appointment');
  const contactStep = dialog.querySelector('#v4-step-contact');
  const calendarCard = dialog.querySelector('#v4-calendar-card');
  const calendarGrid = dialog.querySelector('#v4-calendar-grid');
  const calendarTitle = dialog.querySelector('#v4-calendar-title');
  const prevMonth = dialog.querySelector('#v4-prev-month');
  const nextMonth = dialog.querySelector('#v4-next-month');
  const dateSummary = dialog.querySelector('#v4-date-summary');
  const dateSummaryText = dialog.querySelector('#v4-date-summary-text');
  const changeDate = dialog.querySelector('#v4-change-date');
  const hoursPanel = dialog.querySelector('#v4-hours-panel');
  const hoursGrid = dialog.querySelector('#v4-hours-grid');
  const continueBtn = dialog.querySelector('#v4-continue');
  const backBtn = dialog.querySelector('#v4-back');
  const submitBtn = dialog.querySelector('#v4-submit');
  const nameInput = dialog.querySelector('#v4-name');
  const phoneInput = dialog.querySelector('#v4-phone');
  const selectedCard = dialog.querySelector('#v4-selected-card');
  const closeBtn = dialog.querySelector('.v4-close');

  const successDialog = document.querySelector('#success-dialog');
  const successSummary = document.querySelector('#success-summary');
  const whatsappLink = document.querySelector('#whatsapp-link');
  const privacyDialog = document.querySelector('#privacy-dialog');

  const state = { date: '', time: '', stage: 'appointment' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 30);
  let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromIso = value => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  };
  const formatDate = value => fromIso(value).toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const formatTime = hour => new Date(2000, 0, 1, hour, 0).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
  const sanitizePhone = value => value.replace(/\D+/g, '').slice(0, 9);

  function readRequests() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  function saveRequest(item) {
    const items = readRequests();
    items.unshift(item);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function validHours(dateValue) {
    if (!dateValue) return [];
    const chosen = fromIso(dateValue);
    if (chosen.getDay() === 0) return [];
    const now = new Date();
    const sameDay = iso(now) === dateValue;
    const result = [];
    for (let hour = 9; hour <= 20; hour++) {
      if (hour === 12) continue;
      const start = new Date(chosen);
      start.setHours(hour, 0, 0, 0);
      if (sameDay && (start.getTime() - now.getTime()) < 30 * 60 * 1000) continue;
      result.push(hour);
    }
    return result;
  }

  function renderCalendar() {
    calendarGrid.innerHTML = '';
    calendarTitle.textContent = viewMonth.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      const blank = document.createElement('span');
      blank.className = 'v4-day v4-day-blank';
      calendarGrid.appendChild(blank);
    }

    for (let day = 1; day <= days; day++) {
      const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
      d.setHours(0, 0, 0, 0);
      const value = iso(d);
      const disabled = d < today || d > maxDate || d.getDay() === 0;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'v4-day';
      btn.textContent = day;
      btn.dataset.date = value;
      btn.setAttribute('aria-label', d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }));
      if (disabled) {
        btn.disabled = true;
        btn.classList.add('is-disabled');
      }
      if (value === iso(today)) btn.classList.add('is-today');
      if (value === state.date) btn.classList.add('is-selected');
      btn.addEventListener('click', () => selectDate(value));
      calendarGrid.appendChild(btn);
    }

    const minMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    prevMonth.disabled = viewMonth <= minMonth;
    nextMonth.disabled = viewMonth >= maxMonth;
  }

  function selectDate(value) {
    state.date = value;
    state.time = '';
    continueBtn.disabled = true;
    calendarGrid.querySelectorAll('.v4-day').forEach(btn => btn.classList.toggle('is-selected', btn.dataset.date === value));
    renderHours();

    dateSummaryText.textContent = formatDate(value);
    calendarCard.classList.add('is-collapsed');
    dateSummary.hidden = false;
    hoursPanel.hidden = false;

    requestAnimationFrame(() => {
      modalBody.scrollTo({ top: Math.max(0, hoursPanel.offsetTop - 8), behavior: 'smooth' });
    });
  }

  function renderHours() {
    hoursGrid.innerHTML = '';
    const hours = validHours(state.date);
    hours.forEach(hour => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'v4-hour';
      btn.textContent = formatTime(hour);
      btn.dataset.time = `${pad(hour)}:00`;
      btn.addEventListener('click', () => {
        state.time = btn.dataset.time;
        hoursGrid.querySelectorAll('.v4-hour').forEach(node => node.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        continueBtn.disabled = false;
      });
      hoursGrid.appendChild(btn);
    });
  }

  function resetBooking() {
    state.date = '';
    state.time = '';
    state.stage = 'appointment';
    viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    calendarCard.classList.remove('is-collapsed');
    dateSummary.hidden = true;
    hoursPanel.hidden = true;
    appointmentStep.hidden = false;
    contactStep.hidden = true;
    backBtn.hidden = true;
    continueBtn.hidden = false;
    continueBtn.disabled = true;
    submitBtn.hidden = true;
    submitBtn.disabled = true;
    nameInput.value = '';
    phoneInput.value = '';
    modalBody.scrollTop = 0;
    renderCalendar();
  }

  function openBooking(event) {
    event?.preventDefault?.();
    resetBooking();
    document.documentElement.classList.add('v4-booking-open');
    dialog.showModal();
  }

  function closeBooking() {
    if (dialog.open) dialog.close();
    document.documentElement.classList.remove('v4-booking-open');
  }

  function showContactStep() {
    if (!state.date || !state.time) return;
    state.stage = 'contact';
    appointmentStep.hidden = true;
    contactStep.hidden = false;
    backBtn.hidden = false;
    continueBtn.hidden = true;
    submitBtn.hidden = false;
    selectedCard.innerHTML = `<span>Tu solicitud</span><strong>Evaluación + Profilaxis dental</strong><small>${formatDate(state.date)} · ${state.time}</small>`;
    updateSubmitState();
    nameInput.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      modalBody.scrollTo({ top: 0, behavior: 'smooth' });
      nameInput.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  function backToAppointment() {
    state.stage = 'appointment';
    contactStep.hidden = true;
    appointmentStep.hidden = false;
    backBtn.hidden = true;
    continueBtn.hidden = false;
    continueBtn.disabled = !state.time;
    submitBtn.hidden = true;
    requestAnimationFrame(() => modalBody.scrollTo({ top: Math.max(0, hoursPanel.offsetTop - 8), behavior: 'smooth' }));
  }

  function updateSubmitState() {
    const nameOk = nameInput.value.trim().length >= 2;
    const phone = sanitizePhone(phoneInput.value);
    if (phone !== phoneInput.value) phoneInput.value = phone;
    const phoneOk = phone.length === 9;
    submitBtn.disabled = !(nameOk && phoneOk);
  }

  function buildWhatsapp(item) {
    const text = `Hola, soy ${item.name}. Registré una solicitud para evaluación + profilaxis dental el ${formatDate(item.date)} a las ${item.time}. ¿Pueden confirmar disponibilidad?`;
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  }

  function submitBooking() {
    updateSubmitState();
    if (submitBtn.disabled) return;
    const item = {
      id: (crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}`),
      createdAt: new Date().toISOString(),
      date: state.date,
      time: state.time,
      name: nameInput.value.trim(),
      phone: sanitizePhone(phoneInput.value),
      status: 'pendiente',
      source: 'prototipo-local-v4'
    };
    saveRequest(item);
    closeBooking();
    if (successSummary) {
      successSummary.innerHTML = `<dl><dt>Servicio</dt><dd>Evaluación + Profilaxis dental</dd><dt>Fecha</dt><dd>${formatDate(item.date)}</dd><dt>Hora</dt><dd>${item.time}</dd><dt>Nombre</dt><dd>${item.name}</dd><dt>Celular</dt><dd>${item.phone}</dd><dt>Estado</dt><dd>Pendiente</dd></dl>`;
    }
    if (whatsappLink) whatsappLink.href = buildWhatsapp(item);
    successDialog?.showModal();
    if (!DEMO_MODE) setTimeout(() => { window.location.href = buildWhatsapp(item); }, 1400);
  }

  document.querySelectorAll('.v4-open-booking').forEach(el => el.addEventListener('click', openBooking));
  closeBtn.addEventListener('click', closeBooking);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeBooking(); });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeBooking();
  });
  prevMonth.addEventListener('click', () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1); renderCalendar(); });
  nextMonth.addEventListener('click', () => { viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1); renderCalendar(); });
  changeDate.addEventListener('click', () => {
    calendarCard.classList.remove('is-collapsed');
    dateSummary.hidden = true;
    hoursPanel.hidden = true;
    state.date = '';
    state.time = '';
    continueBtn.disabled = true;
    modalBody.scrollTo({ top: 0, behavior: 'smooth' });
    renderCalendar();
  });
  continueBtn.addEventListener('click', showContactStep);
  backBtn.addEventListener('click', backToAppointment);
  nameInput.addEventListener('input', updateSubmitState);
  phoneInput.addEventListener('input', updateSubmitState);
  phoneInput.addEventListener('beforeinput', event => {
    if (event.data && /\D/.test(event.data)) event.preventDefault();
  });
  submitBtn.addEventListener('click', submitBooking);

  document.querySelector('[data-close-success]')?.addEventListener('click', () => successDialog.close());
  document.querySelector('[data-open-privacy]')?.addEventListener('click', () => privacyDialog?.showModal());
  document.querySelector('[data-close-privacy]')?.addEventListener('click', () => privacyDialog?.close());

  const animated = [...document.querySelectorAll('.feature-card, .brand-card, .location-card, .faq-wrap details')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('v4-in-view', entry.isIntersecting));
    }, { threshold: 0.18 });
    animated.forEach(el => {
      el.classList.add('v4-reveal');
      observer.observe(el);
    });
  } else {
    animated.forEach(el => el.classList.add('v4-in-view'));
  }

  renderCalendar();
})();
