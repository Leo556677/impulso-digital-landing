import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/+esm';

const SUPABASE_URL = 'https://xnlzsgulskqyecfgzhwa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s9YdJaMe_ll4QehPkADlKQ_KkuvWt32';
const BUSINESS_SLUG = 'dr-olano';
const PUBLIC_CONFIG_URL = SUPABASE_URL + '/functions/v1/dr-olano-site-config';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

const $ = (id) => document.getElementById(id);
const WEEKDAYS = [
  { value: 1, short: 'Lun', name: 'Lunes' },
  { value: 2, short: 'Mar', name: 'Martes' },
  { value: 3, short: 'Mié', name: 'Miércoles' },
  { value: 4, short: 'Jue', name: 'Jueves' },
  { value: 5, short: 'Vie', name: 'Viernes' },
  { value: 6, short: 'Sáb', name: 'Sábado' },
  { value: 0, short: 'Dom', name: 'Domingo' }
];

const state = {
  user: null,
  business: null,
  membership: null,
  canEdit: false,
  config: null,
  resources: [],
  schedules: [],
  categories: [],
  services: [],
  links: [],
  promotions: [],
  publicConfig: null
};

function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}
function attr(value = '') { return esc(value); }
function numberOrNull(value) {
  const s = String(value ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function intOr(value, fallback = 0) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}
function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
function money(value) {
  if (value == null || value === '') return 'Precio no publicado';
  return new Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN', maximumFractionDigits:2 }).format(Number(value));
}
function dayName(value) {
  return WEEKDAYS.find((d) => d.value === Number(value))?.name || 'Día';
}
function setStatus(message = '', type = 'info') {
  const el = $('globalStatus');
  el.textContent = message;
  el.className = message ? 'status show ' + type : 'status';
}
function setSync(text, ok = null) {
  const el = $('syncPill');
  el.textContent = text;
  el.className = 'pill ' + (ok === true ? '' : ok === false ? 'off' : 'neutral');
}
function showGate(message, login = false) {
  $('gateCopy').textContent = message;
  $('loginLink').hidden = !login;
  $('authGate').hidden = false;
  $('app').hidden = true;
}
function showApp() {
  $('authGate').hidden = true;
  $('app').hidden = false;
}
function safeSvg(svg) {
  const raw = String(svg || '').trim();
  if (!raw) return { ok:true, value:null };
  if (!/^<svg[\s>]/i.test(raw) || !/<\/svg>$/i.test(raw)) return { ok:false, error:'El icono debe ser un SVG completo.' };
  if (/<\s*(script|foreignObject|iframe|object|embed|link|style)\b/i.test(raw)) return { ok:false, error:'El SVG contiene elementos no permitidos.' };
  if (/\son[a-z]+\s*=/i.test(raw) || /javascript\s*:/i.test(raw)) return { ok:false, error:'El SVG contiene código no permitido.' };
  if (/\sstyle\s*=/i.test(raw) || /url\s*\(/i.test(raw)) return { ok:false, error:'El SVG no puede usar estilos embebidos ni recursos URL.' };
  if (/\s(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|\/\/|data:)/i.test(raw)) return { ok:false, error:'El SVG no puede cargar recursos externos.' };
  return { ok:true, value:raw };
}
function svgDataUri(svg) {
  const checked = safeSvg(svg);
  if (!checked.ok || !checked.value) return null;
  const bytes = new TextEncoder().encode(checked.value);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return 'data:image/svg+xml;base64,' + btoa(binary);
}
function toLimaIso(localValue) {
  const v = String(localValue || '').trim();
  if (!v) return null;
  const normalized = v.length === 16 ? v + ':00' : v;
  const d = new Date(normalized + '-05:00');
  if (Number.isNaN(d.getTime())) throw new Error('Fecha u hora inválida.');
  return d.toISOString();
}
function toLimaInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone:'America/Lima', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hour12:false
  }).formatToParts(d);
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}
function uniqueServiceCode(name) {
  const base = slugify(name).slice(0, 60) || 'servicio';
  const used = new Set(state.services.map((s) => String(s.codigo_externo || '').toLowerCase()));
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}
function categoryById(id) { return state.categories.find((c) => c.id === id); }
function resourceById(id) { return state.resources.find((r) => r.id === id); }
function serviceById(id) { return state.services.find((s) => s.id === id); }
function assignedResourceFor(serviceId) {
  const link = state.links.find((l) => l.servicio_id === serviceId);
  return link ? resourceById(link.recurso_id) : null;
}
function canWriteOrThrow() {
  if (!state.canEdit) throw new Error('Tu rol actual es de solo lectura.');
}
function setWriteMode() {
  document.querySelectorAll('.write-control').forEach((el) => { el.disabled = !state.canEdit; });
  $('readOnlyBanner').hidden = state.canEdit;
}

async function loadAll({ publicCheck = false } = {}) {
  if (!state.business) return;
  setSync('Sincronizando…', null);
  const bid = state.business.id;
  const [configQ, resourcesQ, schedulesQ, categoriesQ, servicesQ, linksQ, promotionsQ] = await Promise.all([
    sb.from('configuracion_agenda').select('*').eq('negocio_id', bid).maybeSingle(),
    sb.from('recursos_agenda').select('*').eq('negocio_id', bid).order('created_at'),
    sb.from('horarios_agenda').select('*').eq('negocio_id', bid).order('dia_semana').order('hora_inicio'),
    sb.from('servicio_categorias').select('*').eq('negocio_id', bid).order('orden').order('nombre'),
    sb.from('servicios').select('id,negocio_id,nombre,descripcion,descripcion_web,duracion_min,precio_pen,precio_usd,activo,codigo_web,codigo_externo,dias_semana_disponibles,requiere_consulta_previa,modalidades_consulta,precio_consulta_pen,calendar_color_hex,categoria_id,visible_web,orden_web,precio_desde,created_at,updated_at').eq('negocio_id', bid).order('orden_web').order('nombre'),
    sb.from('servicios_recursos').select('*').eq('negocio_id', bid),
    sb.from('web_promociones').select('*').eq('negocio_id', bid).order('created_at', { ascending:false })
  ]);
  for (const q of [configQ, resourcesQ, schedulesQ, categoriesQ, servicesQ, linksQ, promotionsQ]) {
    if (q.error) throw q.error;
  }
  state.config = configQ.data || null;
  state.resources = resourcesQ.data || [];
  state.schedules = schedulesQ.data || [];
  state.categories = categoriesQ.data || [];
  state.services = servicesQ.data || [];
  state.links = linksQ.data || [];
  state.promotions = promotionsQ.data || [];
  renderAll();
  setSync('Datos sincronizados', true);
  if (publicCheck) await loadPublicConfig();
}

function renderAll() {
  renderAgenda();
  renderResources();
  renderSchedules();
  renderCategories();
  fillCategorySelects();
  fillResourceSelects();
  renderServices();
  renderPromotions();
  setWriteMode();
}

function renderAgenda() {
  const c = state.config;
  $('agendaActiva').checked = c?.activa === true;
  $('intervaloInicio').value = c?.intervalo_inicio_min ?? 20;
  $('anticipacionMin').value = c?.anticipacion_min ?? 0;
  $('horizonteDias').value = c?.horizonte_dias ?? 60;
  $('capacidadHora').value = c?.capacidad_por_hora ?? 1;
  $('agendaStateBadge').textContent = c?.activa ? 'Agenda activa' : 'Agenda pausada';
  $('agendaStateBadge').className = 'pill ' + (c?.activa ? '' : 'off');
}

function renderResources() {
  const box = $('resourceList');
  if (!state.resources.length) {
    box.innerHTML = '<div class="empty-state">Aún no hay personas o recursos configurados.</div>';
    return;
  }
  box.innerHTML = state.resources.map((r) => {
    const hours = state.schedules.filter((h) => h.recurso_id === r.id && h.activo).length;
    return `<div class="list-row">
      <div><strong>${esc(r.nombre)}</strong><small>${esc(r.tipo)} · ${hours} bloque(s) de horario</small></div>
      <div class="row-actions"><span class="pill ${r.activo ? '' : 'off'}">${r.activo ? 'Activo' : 'Inactivo'}</span>
      <button class="button mini write-control" data-resource-edit="${attr(r.id)}" type="button">Editar</button></div>
    </div>`;
  }).join('');
  box.querySelectorAll('[data-resource-edit]').forEach((b) => b.addEventListener('click', () => openResource(b.dataset.resourceEdit)));
}

function renderSchedules() {
  const board = $('scheduleBoard');
  board.innerHTML = WEEKDAYS.map((day) => {
    const rows = state.schedules.filter((h) => Number(h.dia_semana) === day.value)
      .sort((a,b) => String(a.hora_inicio).localeCompare(String(b.hora_inicio)));
    return `<div class="day-col"><h4>${day.name}</h4>${rows.length ? rows.map((h) => {
      const r = resourceById(h.recurso_id);
      return `<button class="slot-chip write-control" type="button" data-schedule-edit="${attr(h.id)}">
        <b>${esc(String(h.hora_inicio).slice(0,5))}–${esc(String(h.hora_fin).slice(0,5))}</b>
        <span>${esc(r?.nombre || 'Recurso')} · ${h.activo ? 'Activo' : 'Inactivo'}</span>
      </button>`;
    }).join('') : '<span class="muted">Sin horario</span>'}</div>`;
  }).join('');
  board.querySelectorAll('[data-schedule-edit]').forEach((b) => b.addEventListener('click', () => openSchedule(b.dataset.scheduleEdit)));
}

function categoryIconHtml(c) {
  const uri = svgDataUri(c.icon_svg);
  return uri ? `<img src="${attr(uri)}" alt="">` : '<span>SVG</span>';
}
function renderCategories() {
  const box = $('categoryList');
  if (!state.categories.length) {
    box.innerHTML = '<div class="empty-state">No hay categorías todavía.</div>';
    return;
  }
  box.innerHTML = state.categories.map((c) => {
    const count = state.services.filter((s) => s.categoria_id === c.id).length;
    return `<article class="item-card category-card">
      <div class="cat-icon">${categoryIconHtml(c)}</div>
      <div><h3>${esc(c.nombre)}</h3><p>${esc(c.descripcion || 'Sin descripción pública')}</p>
        <div class="meta-row"><span class="meta">Orden ${Number(c.orden || 0)}</span><span class="meta">${count} servicio(s)</span>
        ${c.destacada_web ? '<span class="meta">Destacada</span>' : ''}</div>
      </div>
      <div class="row-actions"><span class="pill ${c.activo ? '' : 'off'}">${c.activo ? 'Activa' : 'Inactiva'}</span>
      <button class="button mini write-control" type="button" data-category-edit="${attr(c.id)}">Editar</button></div>
    </article>`;
  }).join('');
  box.querySelectorAll('[data-category-edit]').forEach((b) => b.addEventListener('click', () => openCategory(b.dataset.categoryEdit)));
}

function fillCategorySelects() {
  const active = state.categories.filter((c) => c.activo);
  const opts = active.map((c) => `<option value="${attr(c.id)}">${esc(c.nombre)}</option>`).join('');
  $('serviceCategory').innerHTML = '<option value="">Elige una categoría</option>' + opts;
  $('promotionCategory').innerHTML = '<option value="">Elige una categoría</option>' + opts;
  $('serviceCategoryFilter').innerHTML = '<option value="">Todas las categorías</option>' + state.categories.map((c) => `<option value="${attr(c.id)}">${esc(c.nombre)}</option>`).join('');
}
function fillResourceSelects() {
  const opts = state.resources.map((r) => `<option value="${attr(r.id)}" ${r.activo ? '' : 'disabled'}>${esc(r.nombre)}${r.activo ? '' : ' · inactivo'}</option>`).join('');
  $('scheduleResource').innerHTML = '<option value="">Elige quién/recurso</option>' + opts;
  $('serviceResource').innerHTML = '<option value="">Elige quién/recurso</option>' + opts;
}

function renderServices() {
  const query = $('serviceSearch').value.trim().toLowerCase();
  const filter = $('serviceCategoryFilter').value;
  const rows = state.services.filter((s) => {
    const hay = !query || [s.nombre, s.descripcion_web, s.codigo_externo].some((v) => String(v || '').toLowerCase().includes(query));
    return hay && (!filter || s.categoria_id === filter);
  });
  $('serviceCount').textContent = `${rows.length} servicio(s)`;
  const box = $('serviceList');
  if (!rows.length) {
    box.innerHTML = '<div class="empty-state">No hay servicios que coincidan con el filtro.</div>';
  } else {
    box.innerHTML = rows.map((s) => {
      const c = categoryById(s.categoria_id);
      const r = assignedResourceFor(s.id);
      const days = Array.isArray(s.dias_semana_disponibles) && s.dias_semana_disponibles.length
        ? s.dias_semana_disponibles.map(dayName).join(', ') : 'Todos los días del horario';
      return `<article class="item-card service-card ${s.visible_web ? '' : 'hidden-card'}">
        <div class="item-top"><div><h3>${esc(s.nombre)}</h3><p>${esc(c?.nombre || s.descripcion || 'Sin categoría')}</p></div>
        <span class="pill ${s.activo && s.visible_web ? '' : 'off'}">${s.activo ? (s.visible_web ? 'Visible' : 'Oculto') : 'Inactivo'}</span></div>
        <div class="meta-row">
          <span class="meta price">${s.precio_desde && s.precio_pen != null ? 'Desde ' : ''}${esc(money(s.precio_pen))}</span>
          <span class="meta">${s.duracion_min ? Number(s.duracion_min) + ' min' : 'Duración no publicada'}</span>
          <span class="meta">${esc(r?.nombre || 'Sin recurso asignado')}</span>
        </div>
        <p>${esc(s.descripcion_web || days)}</p>
        <div class="row-actions"><button class="button mini write-control" type="button" data-service-edit="${attr(s.id)}">Editar</button></div>
      </article>`;
    }).join('');
  }
  box.querySelectorAll('[data-service-edit]').forEach((b) => b.addEventListener('click', () => openService(b.dataset.serviceEdit)));
  $('promotionService').innerHTML = '<option value="">Elige un servicio</option>' + state.services.filter((s) => s.activo).map((s) => `<option value="${attr(s.id)}">${esc(s.nombre)}</option>`).join('');
}

function promoApplicableText(p) {
  if (p.alcance === 'category') return categoryById(p.categoria_id)?.nombre || 'Categoría';
  if (p.alcance === 'service') return serviceById(p.servicio_id)?.nombre || 'Servicio';
  return 'Todos los servicios';
}
function renderPromotions() {
  const box = $('promotionList');
  if (!state.promotions.length) {
    box.innerHTML = '<div class="empty-state">No hay promociones configuradas.</div>';
    return;
  }
  box.innerHTML = state.promotions.map((p) => `<article class="item-card">
    <div class="item-top"><div><h3>${esc(p.nombre_interno)}</h3><p>${esc(p.titulo)} · ${esc(promoApplicableText(p))}</p></div>
    <span class="pill ${p.activo ? '' : 'off'}">${p.activo ? 'Activa' : 'Inactiva'}</span></div>
    <div class="meta-row"><span class="meta">${Number(p.descuento_pct || 0)}% desc.</span><span class="meta">${Number(p.duracion_contador_seg || 0)} s</span>
    ${p.inicia_at ? '<span class="meta">Con inicio</span>' : ''}${p.termina_at ? '<span class="meta">Con fin</span>' : ''}</div>
    <div class="row-actions"><button class="button mini write-control" type="button" data-promotion-edit="${attr(p.id)}">Editar</button></div>
  </article>`).join('');
  box.querySelectorAll('[data-promotion-edit]').forEach((b) => b.addEventListener('click', () => openPromotion(b.dataset.promotionEdit)));
}

function resetResourceForm() {
  $('resourceForm').reset(); $('resourceId').value = ''; $('resourceActive').checked = true; $('resourceForm').hidden = true;
}
function openResource(id = '') {
  const r = id ? state.resources.find((x) => x.id === id) : null;
  $('resourceId').value = r?.id || ''; $('resourceName').value = r?.nombre || ''; $('resourceType').value = r?.tipo || 'persona'; $('resourceActive').checked = r ? r.activo === true : true;
  $('resourceForm').hidden = false; $('resourceName').focus();
}
function resetScheduleForm() {
  $('scheduleForm').reset(); $('scheduleId').value=''; $('scheduleActive').checked=true; $('scheduleForm').hidden=true;
}
function openSchedule(id = '') {
  const h = id ? state.schedules.find((x) => x.id === id) : null;
  $('scheduleId').value=h?.id||''; $('scheduleResource').value=h?.recurso_id||''; $('scheduleDay').value=String(h?.dia_semana ?? 1);
  $('scheduleStart').value=h ? String(h.hora_inicio).slice(0,5) : ''; $('scheduleEnd').value=h ? String(h.hora_fin).slice(0,5) : ''; $('scheduleActive').checked=h ? h.activo===true : true;
  $('scheduleForm').hidden=false;
}
let categorySlugTouched = false;
function resetCategoryForm() {
  $('categoryForm').reset(); $('categoryId').value=''; $('categoryActive').checked=true; $('categoryOrder').value=0; categorySlugTouched=false;
  $('categoryForm').hidden=true; $('categoryFormEmpty').hidden=false; updateCategoryPreview();
}
function openCategory(id = '') {
  const c = id ? state.categories.find((x) => x.id === id) : null;
  $('categoryId').value=c?.id||''; $('categoryName').value=c?.nombre||''; $('categorySlug').value=c?.slug||''; $('categoryDescription').value=c?.descripcion||'';
  $('categorySvg').value=c?.icon_svg||''; $('categoryOrder').value=c?.orden??0; $('categoryFeatured').checked=c?.destacada_web===true; $('categoryActive').checked=c ? c.activo===true : true;
  categorySlugTouched=Boolean(c); $('categoryForm').hidden=false; $('categoryFormEmpty').hidden=true; updateCategoryPreview(); $('categoryName').focus();
}
function updateCategoryPreview() {
  const box=$('categoryIconPreview'), uri=svgDataUri($('categorySvg').value);
  box.innerHTML = uri ? `<img src="${attr(uri)}" alt="Vista previa del icono">` : 'SVG';
  box.className = 'icon-preview' + (uri ? '' : ' empty');
}
function renderWeekdayChecks(selected) {
  const set = new Set(Array.isArray(selected) ? selected.map(Number) : WEEKDAYS.map((d)=>d.value));
  $('serviceWeekdays').innerHTML = WEEKDAYS.map((d)=>`<label class="weekday-check"><input type="checkbox" value="${d.value}" ${set.has(d.value)?'checked':''}><span>${d.short}</span></label>`).join('');
}
function resetServiceForm() {
  $('serviceForm').reset(); $('serviceId').value=''; $('serviceVisible').checked=true; $('serviceActive').checked=true; $('serviceOrder').value=0; renderWeekdayChecks(null);
  $('serviceForm').hidden=true; $('serviceFormEmpty').hidden=false;
}
function openService(id = '') {
  const s = id ? state.services.find((x) => x.id === id) : null;
  $('serviceId').value=s?.id||''; $('serviceName').value=s?.nombre||''; $('serviceCategory').value=s?.categoria_id||''; $('serviceDescription').value=s?.descripcion_web||'';
  $('servicePricePen').value=s?.precio_pen??''; $('servicePriceFrom').checked=s?.precio_desde===true; $('serviceDuration').value=s?.duracion_min??''; $('serviceOrder').value=s?.orden_web??0;
  $('serviceVisible').checked=s ? s.visible_web!==false : true; $('serviceActive').checked=s ? s.activo===true : true;
  $('serviceResource').value=s ? (assignedResourceFor(s.id)?.id || '') : '';
  renderWeekdayChecks(s?.dias_semana_disponibles);
  $('serviceForm').hidden=false; $('serviceFormEmpty').hidden=true; $('serviceName').focus();
}
function resetPromotionForm() {
  $('promotionForm').reset(); $('promotionId').value=''; $('promotionInternalName').value='Promoción web'; $('promotionTitle').value='Oferta especial'; $('promotionCta').value='Quiero aprovecharlo';
  $('promotionDiscount').value='10'; $('promotionCountdown').value='300'; $('promotionScope').value='all_services'; $('promotionReferential').checked=true; $('promotionActive').checked=false;
  $('promotionForm').hidden=true; $('promotionFormEmpty').hidden=false; updatePromotionScope(); updatePromotionPreview();
}
function openPromotion(id = '') {
  const p = id ? state.promotions.find((x) => x.id === id) : null;
  $('promotionId').value=p?.id||''; $('promotionInternalName').value=p?.nombre_interno||'Promoción web'; $('promotionTitle').value=p?.titulo||'Oferta especial';
  $('promotionMessage').value=p?.mensaje||''; $('promotionCta').value=p?.cta_text||'Quiero aprovecharlo'; $('promotionDiscount').value=p?.descuento_pct??10;
  $('promotionCountdown').value=p?.duracion_contador_seg??300; $('promotionScope').value=p?.alcance||'all_services'; $('promotionCategory').value=p?.categoria_id||'';
  $('promotionService').value=p?.servicio_id||''; $('promotionStart').value=toLimaInput(p?.inicia_at); $('promotionEnd').value=toLimaInput(p?.termina_at);
  $('promotionImage').value=p?.imagen_url||''; $('promotionLegal').value=p?.nota_legal||''; $('promotionReferential').checked=p ? p.precio_referencial===true : true; $('promotionActive').checked=p?.activo===true;
  $('promotionForm').hidden=false; $('promotionFormEmpty').hidden=true; updatePromotionScope(); updatePromotionPreview(); $('promotionInternalName').focus();
}
function updatePromotionScope() {
  const scope=$('promotionScope').value;
  $('promotionCategoryWrap').hidden=scope!=='category'; $('promotionServiceWrap').hidden=scope!=='service';
}
function updatePromotionPreview() {
  const discount=numberOrNull($('promotionDiscount').value), seconds=numberOrNull($('promotionCountdown').value);
  $('previewPromoTitle').textContent=$('promotionTitle').value.trim()||'Sin promoción seleccionada';
  $('previewPromoMessage').textContent=$('promotionMessage').value.trim()||'El texto que verá el visitante aparecerá aquí.';
  $('previewPromoDiscount').textContent=discount==null?'—':discount+'%';
  $('previewPromoCountdown').textContent=seconds==null?'—':(Math.floor(seconds/60)+' min '+(seconds%60)+' s');
  $('previewPromoCta').textContent=$('promotionCta').value.trim()||'Botón';
}

async function saveAgenda(e) {
  e.preventDefault(); canWriteOrThrow();
  const payload = {
    negocio_id:state.business.id,
    activa:$('agendaActiva').checked,
    intervalo_inicio_min:intOr($('intervaloInicio').value,20),
    anticipacion_min:intOr($('anticipacionMin').value,0),
    horizonte_dias:intOr($('horizonteDias').value,60),
    capacidad_por_hora:intOr($('capacidadHora').value,1)
  };
  if (payload.intervalo_inicio_min < 5 || payload.horizonte_dias < 1 || payload.capacidad_por_hora < 1) throw new Error('Revisa las reglas de agenda.');
  const {error}=await sb.from('configuracion_agenda').upsert(payload,{onConflict:'negocio_id'}); if(error) throw error;
  await afterWrite('Reglas de agenda guardadas.');
}
async function saveResource(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('resourceId').value, payload={negocio_id:state.business.id,nombre:$('resourceName').value.trim(),tipo:$('resourceType').value,activo:$('resourceActive').checked};
  if(payload.nombre.length<2) throw new Error('Escribe un nombre para el recurso.');
  const q=id?sb.from('recursos_agenda').update(payload).eq('id',id).eq('negocio_id',state.business.id):sb.from('recursos_agenda').insert(payload);
  const {error}=await q; if(error) throw error; resetResourceForm(); await afterWrite('Recurso guardado.');
}
async function saveSchedule(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('scheduleId').value, recurso_id=$('scheduleResource').value, dia_semana=Number($('scheduleDay').value), hora_inicio=$('scheduleStart').value, hora_fin=$('scheduleEnd').value;
  if(!recurso_id||!hora_inicio||!hora_fin||hora_fin<=hora_inicio) throw new Error('El horario de fin debe ser posterior al de inicio.');
  const overlaps=state.schedules.some((h)=>h.id!==id&&h.recurso_id===recurso_id&&Number(h.dia_semana)===dia_semana&&h.activo&&$('scheduleActive').checked&&hora_inicio<String(h.hora_fin).slice(0,5)&&hora_fin>String(h.hora_inicio).slice(0,5));
  if(overlaps) throw new Error('Ese bloque se superpone con otro horario activo del mismo recurso.');
  const payload={negocio_id:state.business.id,recurso_id,dia_semana,hora_inicio,hora_fin,activo:$('scheduleActive').checked};
  const q=id?sb.from('horarios_agenda').update(payload).eq('id',id).eq('negocio_id',state.business.id):sb.from('horarios_agenda').insert(payload);
  const {error}=await q; if(error) throw error; resetScheduleForm(); await afterWrite('Horario guardado.');
}
async function saveCategory(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('categoryId').value, checked=safeSvg($('categorySvg').value); if(!checked.ok) throw new Error(checked.error);
  const payload={negocio_id:state.business.id,nombre:$('categoryName').value.trim(),slug:slugify($('categorySlug').value),descripcion:$('categoryDescription').value.trim()||null,icon_svg:checked.value,orden:intOr($('categoryOrder').value,0),destacada_web:$('categoryFeatured').checked,activo:$('categoryActive').checked};
  if(!payload.nombre||!payload.slug) throw new Error('Nombre y slug son obligatorios.');
  const q=id?sb.from('servicio_categorias').update(payload).eq('id',id).eq('negocio_id',state.business.id):sb.from('servicio_categorias').insert(payload);
  const {error}=await q; if(error) throw error; resetCategoryForm(); await afterWrite('Categoría guardada.');
}
async function saveService(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('serviceId').value, nombre=$('serviceName').value.trim(), categoria_id=$('serviceCategory').value, recurso_id=$('serviceResource').value;
  const weekdays=[...$('serviceWeekdays').querySelectorAll('input:checked')].map((x)=>Number(x.value));
  if(!nombre||!categoria_id) throw new Error('Nombre y categoría son obligatorios.');
  if(!recurso_id) throw new Error('Asigna explícitamente quién o qué atiende este servicio.');
  if($('serviceVisible').checked && weekdays.length===0) throw new Error('Elige al menos un día disponible para un servicio visible.');
  const resource=resourceById(recurso_id); if(!resource?.activo) throw new Error('El recurso seleccionado debe estar activo.');
  const payload={
    negocio_id:state.business.id,nombre,categoria_id,descripcion_web:$('serviceDescription').value.trim()||null,
    precio_pen:numberOrNull($('servicePricePen').value),precio_desde:$('servicePriceFrom').checked,duracion_min:numberOrNull($('serviceDuration').value),
    visible_web:$('serviceVisible').checked,activo:$('serviceActive').checked,orden_web:intOr($('serviceOrder').value,0),
    dias_semana_disponibles:weekdays
  };
  let serviceId=id;
  if(id){
    const {error}=await sb.from('servicios').update(payload).eq('id',id).eq('negocio_id',state.business.id); if(error) throw error;
  }else{
    const code=uniqueServiceCode(nombre);
    const {data,error}=await sb.from('servicios').insert({...payload,codigo_web:code,codigo_externo:code,requiere_consulta_previa:false}).select('id').single();
    if(error) throw error; serviceId=data.id;
  }
  const {error:linkErr}=await sb.from('servicios_recursos').upsert(
    {negocio_id:state.business.id,servicio_id:serviceId,recurso_id},
    {onConflict:'negocio_id,servicio_id,recurso_id'}
  ); if(linkErr) throw linkErr;
  const {error:delErr}=await sb.from('servicios_recursos').delete()
    .eq('negocio_id',state.business.id).eq('servicio_id',serviceId).neq('recurso_id',recurso_id);
  if(delErr) throw delErr;
  resetServiceForm(); await afterWrite('Servicio y asignación guardados.');
}
async function savePromotion(e) {
  e.preventDefault(); canWriteOrThrow();
  const id=$('promotionId').value, scope=$('promotionScope').value, active=$('promotionActive').checked;
  const starts=toLimaIso($('promotionStart').value), ends=toLimaIso($('promotionEnd').value);
  if(starts&&ends&&new Date(ends)<=new Date(starts)) throw new Error('La fecha final debe ser posterior al inicio.');
  const payload={
    negocio_id:state.business.id,nombre_interno:$('promotionInternalName').value.trim(),activo:active,titulo:$('promotionTitle').value.trim(),
    mensaje:$('promotionMessage').value.trim(),cta_text:$('promotionCta').value.trim(),descuento_pct:numberOrNull($('promotionDiscount').value)??0,
    duracion_contador_seg:intOr($('promotionCountdown').value,300),alcance:scope,
    categoria_id:scope==='category'?$('promotionCategory').value:null,servicio_id:scope==='service'?$('promotionService').value:null,
    inicia_at:starts,termina_at:ends,imagen_url:$('promotionImage').value.trim()||null,nota_legal:$('promotionLegal').value.trim()||null,
    precio_referencial:$('promotionReferential').checked
  };
  if(!payload.nombre_interno||!payload.titulo||!payload.mensaje||!payload.cta_text) throw new Error('Completa nombre, título, mensaje y botón.');
  if(payload.descuento_pct<0||payload.descuento_pct>100||payload.duracion_contador_seg<30) throw new Error('Revisa descuento y duración del contador.');
  if(scope==='category'&&!payload.categoria_id) throw new Error('Selecciona la categoría de la promoción.');
  if(scope==='service'&&!payload.servicio_id) throw new Error('Selecciona el servicio de la promoción.');
  if(active){
    let q=sb.from('web_promociones').update({activo:false}).eq('negocio_id',state.business.id).eq('activo',true);
    if(id) q=q.neq('id',id);
    const {error}=await q; if(error) throw error;
  }
  const q=id?sb.from('web_promociones').update(payload).eq('id',id).eq('negocio_id',state.business.id):sb.from('web_promociones').insert(payload);
  const {error}=await q; if(error) throw error; resetPromotionForm(); await afterWrite('Promoción guardada.');
}
async function afterWrite(message) {
  setStatus(message,'ok'); await loadAll({publicCheck:true});
}

async function loadPublicConfig() {
  $('publicConfigStatus').className='notice neutral'; $('publicConfigStatus').textContent='Consultando la configuración pública…';
  try{
    const res=await fetch(PUBLIC_CONFIG_URL,{headers:{apikey:SUPABASE_KEY},cache:'no-store'});
    const data=await res.json(); if(!res.ok||data?.ok!==true) throw new Error(data?.code||'No se pudo leer la configuración pública.');
    state.publicConfig=data; $('publicConfigRaw').textContent=JSON.stringify(data,null,2);
    const activeHours=(data.booking?.resources||[]).reduce((n,r)=>n+(r.hours?.length||0),0);
    $('publicSummary').innerHTML=`
      <div class="summary-card"><b>${data.categories?.length||0}</b><span>Categorías públicas activas</span></div>
      <div class="summary-card"><b>${data.services?.length||0}</b><span>Servicios públicos visibles</span></div>
      <div class="summary-card"><b>${activeHours}</b><span>Bloques de horario activos</span></div>
      <div class="summary-card"><b>${data.promotion ? Number(data.promotion.discount_pct||0)+'%' : 'OFF'}</b><span>Promoción pública activa</span></div>`;
    $('publicConfigStatus').className='notice neutral'; $('publicConfigStatus').textContent='✓ Endpoint público sincronizado · '+new Date(data.generated_at).toLocaleString('es-PE');
  }catch(err){
    $('publicConfigStatus').className='notice warning'; $('publicConfigStatus').textContent='No se pudo verificar la lectura pública: '+(err?.message||err);
  }
}

function bindEvents() {
  document.querySelectorAll('.tab').forEach((tab)=>tab.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach((x)=>x.classList.toggle('active',x===tab));
    document.querySelectorAll('.tab-panel').forEach((p)=>p.classList.toggle('active',p.dataset.panel===tab.dataset.tab));
    if(tab.dataset.tab==='vista-publica') loadPublicConfig();
  }));
  $('refreshAll').addEventListener('click',()=>guard(async()=>{await loadAll({publicCheck:true});setStatus('Datos actualizados.','ok');}));
  $('refreshPublicBtn').addEventListener('click',()=>loadPublicConfig());
  $('logoutBtn').addEventListener('click',async()=>{await sb.auth.signOut();location.replace('./cliente-acceso.html');});
  $('agendaForm').addEventListener('submit',(e)=>guard(()=>saveAgenda(e)));
  $('newResourceBtn').addEventListener('click',()=>openResource()); $('cancelResourceBtn').addEventListener('click',resetResourceForm);
  $('resourceForm').addEventListener('submit',(e)=>guard(()=>saveResource(e)));
  $('newScheduleBtn').addEventListener('click',()=>openSchedule()); $('cancelScheduleBtn').addEventListener('click',resetScheduleForm);
  $('scheduleForm').addEventListener('submit',(e)=>guard(()=>saveSchedule(e)));
  $('newCategoryBtn').addEventListener('click',()=>openCategory()); $('cancelCategoryBtn').addEventListener('click',resetCategoryForm);
  $('categoryForm').addEventListener('submit',(e)=>guard(()=>saveCategory(e)));
  $('categoryName').addEventListener('input',()=>{if(!$('categoryId').value&&!categorySlugTouched)$('categorySlug').value=slugify($('categoryName').value);});
  $('categorySlug').addEventListener('input',()=>{categorySlugTouched=true;});
  $('categorySvg').addEventListener('input',updateCategoryPreview);
  $('newServiceBtn').addEventListener('click',()=>openService()); $('cancelServiceBtn').addEventListener('click',resetServiceForm);
  $('serviceForm').addEventListener('submit',(e)=>guard(()=>saveService(e)));
  $('serviceSearch').addEventListener('input',renderServices); $('serviceCategoryFilter').addEventListener('change',renderServices);
  $('newPromotionBtn').addEventListener('click',()=>openPromotion()); $('cancelPromotionBtn').addEventListener('click',resetPromotionForm);
  $('promotionForm').addEventListener('submit',(e)=>guard(()=>savePromotion(e)));
  $('promotionScope').addEventListener('change',()=>{updatePromotionScope();updatePromotionPreview();});
  ['promotionTitle','promotionMessage','promotionCta','promotionDiscount','promotionCountdown'].forEach((id)=>$(id).addEventListener('input',updatePromotionPreview));
}
async function guard(fn) {
  try{setStatus('Guardando…','info');await fn();}catch(err){console.error(err);setStatus(err?.message||String(err),'error');}
}

async function bootstrap() {
  bindEvents();
  showGate('Validando tu sesión y tus permisos para Dr. Olano…', false);
  try{
    const {data:{session},error:sessionErr}=await sb.auth.getSession();
    if(sessionErr) throw sessionErr;
    if(!session?.user){showGate('Necesitas iniciar sesión con una cuenta autorizada para administrar Dr. Olano.',true);return;}
    state.user=session.user;
    const {data:business,error:businessErr}=await sb.from('negocios').select('id,nombre,slug,zona_horaria,activo').eq('slug',BUSINESS_SLUG).maybeSingle();
    if(businessErr) throw businessErr;
    if(!business) throw new Error('Tu sesión no tiene acceso al negocio Dr. Olano.');
    state.business=business;
    const {data:membership,error:memberErr}=await sb.from('usuarios_negocio').select('rol').eq('negocio_id',business.id).eq('user_id',session.user.id).maybeSingle();
    if(memberErr) throw memberErr;
    if(!membership) throw new Error('Tu cuenta no figura como miembro de Dr. Olano.');
    state.membership=membership; state.canEdit=['propietario','admin'].includes(String(membership.rol||'').toLowerCase());
    $('rolePill').textContent='Rol: '+membership.rol; showApp(); setWriteMode();
    await loadAll({publicCheck:true});
  }catch(err){
    console.error(err);showGate(err?.message||'No se pudo abrir el panel.',false);
  }
}
bootstrap();