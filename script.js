const IMPULSO = {
  phone: '51910838451',
  metaPixelId: '1202350998538131',
  tiktokPixelId: 'D4PSPVRC77UDLT7UQ0N0',
  whatsappBaseText: 'Hola, vengo desde la web de Impulso Digital y quiero información sobre sus servicios.',
  recommendations: {
    web: {
      title: 'Impulso Web',
      copy: 'Si necesitas una página clara para presentar tu negocio y facilitar el contacto, una landing puede ser un buen punto de partida.',
      price: 'Desde S/790',
      interest: 'Impulso Web'
    },
    brand: {
      title: 'Logo + Identidad',
      copy: 'Si tu negocio todavía no tiene una apariencia consistente, podemos empezar por un logo o por una identidad visual más completa.',
      price: 'Desde S/590',
      interest: 'Logo + Identidad'
    },
    social: {
      title: 'Impulso Social',
      copy: 'Si ya tienes una oferta clara pero necesitas presentarla mejor en redes, los packs de creativos pueden ayudarte a producir piezas visuales con una línea más coherente.',
      price: 'Desde S/420',
      interest: 'Creativos para redes'
    },
    agenda: {
      title: 'Impulso Agenda',
      copy: 'Si organizar citas manualmente ya te quita tiempo o genera desorden, podemos evaluar un sistema orientado a WhatsApp para citas, confirmaciones y recordatorios.',
      price: 'S/790 implementación + S/149/mes',
      interest: 'Impulso Agenda'
    },
    360: {
      title: 'Paquetes Impulso',
      copy: 'Si necesitas resolver varias áreas a la vez, conviene revisar los paquetes para combinar marca, web, creativos y, cuando corresponda, Agenda.',
      price: 'Desde S/2,390',
      interest: 'Paquetes Impulso'
    }
  }
};

const qs = (selector, parent = document) => parent.querySelector(selector);
const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function buildWhatsAppUrl(interest) {
  const detail = interest ? ` Me interesa: ${interest}.` : '';
  const text = encodeURIComponent(`${IMPULSO.whatsappBaseText}${detail}`);
  return `https://wa.me/${IMPULSO.phone}?text=${text}`;
}

function wireWhatsAppLinks() {
  qsa('.js-wa').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      const interest = link.dataset.interest || 'servicios';
      const source = link.dataset.source || 'site';
      trackEvent('click_whatsapp', { source, interest });
      window.open(buildWhatsAppUrl(interest), '_blank', 'noopener');
    });
  });
}

function wireMenu() {
  const toggle = qs('#menu-toggle');
  const nav = qs('#main-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  qsa('a', nav).forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function wireServiceDetails() {
  const toggles = qsa('.service-toggle');
  toggles.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      const target = document.getElementById(targetId);
      if (!target) return;

      const willOpen = target.hidden;
      qsa('.detail-panel').forEach(panel => { panel.hidden = true; });
      qsa('.service-toggle').forEach(item => item.setAttribute('aria-expanded', 'false'));

      if (willOpen) {
        target.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        trackEvent('view_service', { service: targetId.replace('-detail', '') });
        window.setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 70);
      }
    });
  });
}

function wireOrientador() {
  const modal = qs('#orientador-modal');
  const openButton = qs('#open-orientador');
  const question = qs('#wizard-question');
  const result = qs('#wizard-result');
  const title = qs('#recommend-title');
  const copy = qs('#recommend-copy');
  const price = qs('#recommend-price');
  const wa = qs('#recommend-wa');
  const back = qs('#wizard-back');
  if (!modal || !openButton) return;

  const open = () => {
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    question.hidden = false;
    result.hidden = true;
    trackEvent('open_orientation', { source: 'home' });
  };

  const close = () => {
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  };

  openButton.addEventListener('click', open);
  qsa('[data-close-modal]', modal).forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') close();
  });

  qsa('[data-recommend]', modal).forEach(option => {
    option.addEventListener('click', () => {
      const key = option.dataset.recommend;
      const data = IMPULSO.recommendations[key];
      if (!data) return;

      title.textContent = data.title;
      copy.textContent = data.copy;
      price.textContent = data.price;
      wa.href = buildWhatsAppUrl(data.interest);
      wa.target = '_blank';
      wa.rel = 'noopener';
      wa.onclick = () => {
        trackEvent('complete_orientation', { recommendation: key });
        trackEvent('click_whatsapp', { source: `orientador-${key}`, interest: data.interest });
      };
      question.hidden = true;
      result.hidden = false;
      trackEvent('select_service', { recommendation: key });
    });
  });

  back?.addEventListener('click', () => {
    result.hidden = true;
    question.hidden = false;
  });
}

function setYear() {
  const year = qs('#year');
  if (year) year.textContent = String(new Date().getFullYear());
}

// ---------- Analítica con consentimiento ----------
const ANALYTICS_KEY = 'impulso_analytics_consent_v1';
let analyticsEnabled = false;

function getConsent() {
  try { return localStorage.getItem(ANALYTICS_KEY); } catch { return null; }
}

function saveConsent(value) {
  try { localStorage.setItem(ANALYTICS_KEY, value); } catch { /* no-op */ }
}

function loadMetaPixel() {
  if (window.fbq) return;
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod ? n.callMethod.apply(n,arguments) : n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', IMPULSO.metaPixelId);
  window.fbq('track', 'PageView');
}

function loadTikTokPixel() {
  if (window.ttq) return;
  !function (w, d, t) {
    w.TiktokAnalyticsObject=t;
    const ttq=w[t]=w[t]||[];
    ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
    ttq.setAndDefer=function(obj,method){obj[method]=function(){obj.push([method].concat([].slice.call(arguments,0)));};};
    for(let i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
    ttq.load=function(id){
      const script=d.createElement('script');
      script.type='text/javascript';script.async=true;
      script.src=`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${id}&lib=${t}`;
      const first=d.getElementsByTagName('script')[0];first.parentNode.insertBefore(script,first);
    };
    ttq.load(IMPULSO.tiktokPixelId);
    ttq.page();
  }(window, document, 'ttq');
}

function enableAnalytics() {
  analyticsEnabled = true;
  loadMetaPixel();
  loadTikTokPixel();
}

function trackEvent(name, params = {}) {
  if (!analyticsEnabled) return;

  const safeParams = { ...params };
  // No añadir nombres, teléfonos, correos, mensajes privados ni datos sensibles a safeParams.
  if (window.fbq) {
    if (name === 'click_whatsapp') window.fbq('track', 'Contact', safeParams);
    else window.fbq('trackCustom', name, safeParams);
  }
  if (window.ttq && typeof window.ttq.track === 'function') {
    if (name === 'click_whatsapp') window.ttq.track('Contact', safeParams);
    else window.ttq.track(name, safeParams);
  }
}

function wireConsent() {
  const banner = qs('#analytics-consent');
  const accept = qs('#accept-analytics');
  const reject = qs('#reject-analytics');
  if (!banner) return;

  const consent = getConsent();
  if (consent === 'accepted') {
    enableAnalytics();
    return;
  }
  if (consent === 'rejected') return;

  banner.hidden = false;
  accept?.addEventListener('click', () => {
    saveConsent('accepted');
    banner.hidden = true;
    enableAnalytics();
  });
  reject?.addEventListener('click', () => {
    saveConsent('rejected');
    banner.hidden = true;
  });
}

function trackPackageVisibility() {
  if (!('IntersectionObserver' in window)) return;
  const section = qs('#paquetes');
  if (!section) return;
  let tracked = false;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !tracked) {
        tracked = true;
        trackEvent('view_package', { section: 'packages' });
        observer.disconnect();
      }
    });
  }, { threshold: .35 });
  observer.observe(section);
}

function init() {
  setYear();
  wireConsent();
  wireMenu();
  wireWhatsAppLinks();
  wireServiceDetails();
  wireOrientador();
  trackPackageVisibility();
}

document.addEventListener('DOMContentLoaded', init);
