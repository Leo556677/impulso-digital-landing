from pathlib import Path
import re

index_path = Path('index.html')
script_path = Path('script.js')
css_path = Path('brand-assets.css')

index = index_path.read_text(encoding='utf-8')

old_info = '<div><strong>Información</strong><a href="#preguntas">Preguntas frecuentes</a><a href="./privacidad.html">Privacidad</a><a href="./terminos.html">Términos</a><a href="./libro-reclamaciones.html">Libro de Reclamaciones</a></div>'
new_info = '''<div><strong>Información</strong><a href="#preguntas">Preguntas frecuentes</a><a href="./privacidad.html">Privacidad</a><a href="./terminos.html">Términos</a><button type="button" class="footer-preference-button" id="privacy-preferences">Preferencias de analítica</button><a class="footer-complaints-notice" href="./libro-reclamaciones.html" aria-label="Abrir Libro de Reclamaciones virtual"><svg viewBox="0 0 60 48" aria-hidden="true"><path d="M5 7h19c4 0 6 2 6 6v28c0-4-2-6-6-6H5z"/><path d="M55 7H36c-4 0-6 2-6 6v28c0-4 2-6 6-6h19z"/><path d="M11 15h12M11 21h12M37 15h12M37 21h12"/></svg><span><b>Libro de Reclamaciones</b><small>Registra una queja o reclamo</small></span></a></div>'''
if old_info not in index and 'footer-complaints-notice' not in index:
    raise SystemExit('No se encontró el bloque Información del footer esperado')
index = index.replace(old_info, new_info)

old_consent = '<div class="consent" id="analytics-consent" hidden><div><strong>Analítica del sitio</strong><p>Podemos usar herramientas de medición para entender visitas y clics. No enviamos a los píxeles el texto privado que escribas en WhatsApp.</p></div><div class="consent-actions"><button class="btn btn-secondary btn-small" id="reject-analytics">Solo esenciales</button><button class="btn btn-primary btn-small" id="accept-analytics">Aceptar analítica</button></div></div>'
new_consent = '<div class="consent" id="analytics-consent" hidden><div><strong>Preferencias de analítica</strong><p>Meta Pixel y TikTok Pixel solo se activan si aceptas. Puedes cambiar esta decisión en cualquier momento desde el footer. No enviamos a esos píxeles el texto privado de WhatsApp ni los campos del Libro de Reclamaciones.</p><p class="consent-status" id="analytics-current-status" aria-live="polite"></p></div><div class="consent-actions"><button class="btn btn-secondary btn-small" id="reject-analytics">Solo esenciales</button><button class="btn btn-primary btn-small" id="accept-analytics">Aceptar analítica</button></div></div>'
if old_consent not in index and 'analytics-current-status' not in index:
    raise SystemExit('No se encontró el banner de analítica esperado')
index = index.replace(old_consent, new_consent)

index_path.write_text(index, encoding='utf-8')

js = script_path.read_text(encoding='utf-8')
pattern = re.compile(r'function wireConsent\(\) \{.*?\n\}\n\nfunction trackPackageVisibility\(\)', re.S)
replacement = r'''function clearTrackingCookies() {
  ['_fbp', '_fbc', '_ttp'].forEach(name => {
    const expired = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = expired;
    document.cookie = `${name}=; Max-Age=0; path=/impulso-digital-landing/; SameSite=Lax`;
  });
}

function disableAnalytics({ reload = false } = {}) {
  const wasAccepted = getConsent() === 'accepted' || analyticsEnabled;
  analyticsEnabled = false;
  try { if (window.fbq) window.fbq('consent', 'revoke'); } catch { /* sin acción */ }
  try { if (window.ttq && typeof window.ttq.revokeConsent === 'function') window.ttq.revokeConsent(); } catch { /* sin acción */ }
  clearTrackingCookies();
  saveConsent('rejected');
  if (reload && wasAccepted) window.setTimeout(() => window.location.reload(), 80);
}

function wireConsent() {
  const banner = qs('#analytics-consent');
  const accept = qs('#accept-analytics');
  const reject = qs('#reject-analytics');
  const preferences = qs('#privacy-preferences');
  const status = qs('#analytics-current-status');
  if (!banner) return;

  const updateStatus = () => {
    const consent = getConsent();
    if (!status) return;
    status.textContent = consent === 'accepted'
      ? 'Estado actual: analítica aceptada.'
      : consent === 'rejected'
        ? 'Estado actual: solo funciones esenciales.'
        : 'Estado actual: todavía no has elegido.';
  };

  const openPreferences = () => {
    updateStatus();
    banner.hidden = false;
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  accept?.addEventListener('click', () => {
    saveConsent('accepted');
    banner.hidden = true;
    enableAnalytics();
  });

  reject?.addEventListener('click', () => {
    const shouldReload = getConsent() === 'accepted' || analyticsEnabled;
    disableAnalytics({ reload: shouldReload });
    banner.hidden = true;
  });

  preferences?.addEventListener('click', openPreferences);

  const consent = getConsent();
  if (consent === 'accepted') {
    enableAnalytics();
    updateStatus();
    return;
  }
  if (consent === 'rejected') {
    updateStatus();
    return;
  }
  openPreferences();
}

function trackPackageVisibility()'''
new_js, count = pattern.subn(replacement, js, count=1)
if count != 1 and 'function disableAnalytics' not in js:
    raise SystemExit('No se encontró wireConsent para sustituir')
script_path.write_text(new_js, encoding='utf-8')

css = css_path.read_text(encoding='utf-8')
marker = '/* ---------- LEGAL / PRIVACY CONTROLS 2026-09-02 ---------- */'
if marker not in css:
    css += r'''

/* ---------- LEGAL / PRIVACY CONTROLS 2026-09-02 ---------- */
.footer-preference-button{
  appearance:none;border:0;background:transparent;padding:0;color:#626777;
  font:inherit;font-size:.86rem;line-height:1.55;text-align:left;cursor:pointer;
}
.footer-preference-button:hover,.footer-preference-button:focus{color:#E6007E;text-decoration:underline;outline:none}
.footer-complaints-notice{
  display:flex!important;align-items:center;gap:10px;margin-top:12px;padding:10px 12px!important;
  border:2px solid #1466b8;border-radius:12px;background:#fff;color:#1466b8!important;
  text-decoration:none!important;max-width:265px;line-height:1.15!important;
}
.footer-complaints-notice svg{width:42px;height:34px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.footer-complaints-notice span{display:block}.footer-complaints-notice b{display:block;font-size:.76rem;text-transform:uppercase;letter-spacing:.025em}.footer-complaints-notice small{display:block;margin-top:4px;color:#555861;font-size:.66rem;line-height:1.25}
.footer-complaints-notice:hover,.footer-complaints-notice:focus{box-shadow:0 8px 24px rgba(20,102,184,.12);transform:translateY(-1px);outline:none}
.consent-status{margin:.45rem 0 0!important;font-size:.78rem!important;font-weight:800;color:#E6007E}
@media(max-width:760px){.footer-complaints-notice{max-width:100%}.footer-preference-button{font-size:.86rem}}
'''
css_path.write_text(css, encoding='utf-8')
