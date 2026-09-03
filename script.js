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
      copy: 'Si tu negocio todavía no tiene una apariencia consistente, podemos empezar por un logo o una identidad visual más completa.',
      price: 'Desde S/590',
      interest: 'Logo + Identidad'
    },
    social: {
      title: 'Impulso Social',
      copy: 'Si necesitas presentar mejor tu negocio en redes, los packs de creativos pueden ayudarte a mantener una línea visual más coherente.',
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
      copy: 'Si necesitas resolver varias áreas a la vez, revisamos los paquetes que combinan marca, web, creativos y, cuando corresponde, Agenda.',
      price: 'Desde S/2,390',
      interest: 'Paquetes Impulso'
    }
  }
};

const qs = (selector, parent = document) => parent.querySelector(selector);
const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const MOBILE_QUERY = '(max-width: 760px)';

function buildWhatsAppUrl(interest) {
  const detail = interest ? ` Me interesa: ${interest}.` : '';
  return `https://wa.me/${IMPULSO.phone}?text=${encodeURIComponent(`${IMPULSO.whatsappBaseText}${detail}`)}`;
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
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  qsa('a', nav).forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

function makeCarouselButton(direction) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `carousel-arrow ${direction}`;
  const isPrev = direction === 'prev';
  button.setAttribute('aria-label', isPrev ? 'Ver tarjeta anterior' : 'Ver tarjeta siguiente');
  button.innerHTML = isPrev
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  return button;
}

function centerRecommendedInTrack(track, behavior = 'auto') {
  if (!track || !window.matchMedia(MOBILE_QUERY).matches) return;
  const recommended = qs('.recommended', track);
  if (!recommended || recommended.offsetParent === null) return;
  const left = recommended.offsetLeft - (track.clientWidth - recommended.clientWidth) / 2;
  track.scrollTo({ left: Math.max(0, left), behavior });
}

function wireMobileCarousels() {
  const tracks = qsa('.service-grid, .comparison-grid');

  tracks.forEach(track => {
    track.classList.add('carousel-track-mobile');
    if (track.parentElement?.classList.contains('carousel-mobile-wrap')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'carousel-mobile-wrap';
    track.parentNode.insertBefore(wrapper, track);
    wrapper.appendChild(track);

    const prev = makeCarouselButton('prev');
    const next = makeCarouselButton('next');
    wrapper.append(prev, next);

    const getStep = () => Math.max(260, Math.min(track.clientWidth * 0.84, 380));

    const updateArrows = () => {
      if (!window.matchMedia(MOBILE_QUERY).matches || track.offsetParent === null) {
        prev.disabled = true;
        next.disabled = true;
        return;
      }
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      prev.disabled = track.scrollLeft <= 8;
      next.disabled = track.scrollLeft >= maxScroll - 8;
    };

    prev.addEventListener('click', () => {
      track.scrollBy({ left: -getStep(), behavior: 'smooth' });
      trackEvent('carousel_navigation', { direction: 'previous' });
    });
    next.addEventListener('click', () => {
      track.scrollBy({ left: getStep(), behavior: 'smooth' });
      trackEvent('carousel_navigation', { direction: 'next' });
    });

    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateArrows();
        ticking = false;
      });
    }, { passive: true });

    wrapper._refreshCarousel = () => {
      window.setTimeout(() => {
        updateArrows();
      }, 30);
    };

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(updateArrows);
      resizeObserver.observe(track);
    }

    window.addEventListener('resize', updateArrows, { passive: true });
    window.setTimeout(() => {
      if (track.classList.contains('package-comparison')) centerRecommendedInTrack(track, 'auto');
      updateArrows();
    }, 120);
  });
}

function refreshCarouselsWithin(container) {
  if (!container) return;
  qsa('.carousel-mobile-wrap', container).forEach(wrapper => wrapper._refreshCarousel?.());
  qsa('.carousel-track-mobile', container).forEach(track => centerRecommendedInTrack(track, 'smooth'));
}

function wireServiceDetails() {
  qsa('.service-toggle').forEach(button => {
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.target);
      if (!target) return;
      const shouldOpen = target.hidden;

      qsa('.detail-panel').forEach(panel => { panel.hidden = true; });
      qsa('.service-toggle').forEach(item => item.setAttribute('aria-expanded', 'false'));

      if (shouldOpen) {
        target.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        trackEvent('view_service', { service: button.dataset.target.replace('-detail', '') });
        window.setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          refreshCarouselsWithin(target);
        }, 90);
      }
    });
  });
}

function wireSmartFloatingCta() {
  const initialCta = qs('.hero-actions .js-wa');
  const floatingCta = qs('.mobile-cta');
  if (!initialCta || !floatingCta) return;

  floatingCta.classList.add('smart-cta');
  floatingCta.setAttribute('aria-hidden', 'true');

  const sync = () => {
    const rect = initialCta.getBoundingClientRect();
    const hasScrolledPastInitialCta = rect.bottom < 0;
    floatingCta.classList.toggle('is-visible', hasScrolledPastInitialCta);
    floatingCta.setAttribute('aria-hidden', String(!hasScrolledPastInitialCta));
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(sync, { threshold: [0, 0.25, 1] });
    observer.observe(initialCta);
  }

  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      sync();
      scrollQueued = false;
    });
  }, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  sync();
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
  if (!modal || !openButton || !question || !result) return;

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

function wireHeroOrbit() {
  const stage = qs('#hero-orbit');
  if (!stage) return;
  const cards = qsa('[data-orbit-card]', stage);
  if (cards.length !== 4) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame = null;

  const render = time => {
    const rect = stage.getBoundingClientRect();
    const mobile = rect.width < 520;
    const radiusX = mobile ? Math.min(rect.width * 0.37, 145) : Math.min(rect.width * 0.38, 205);
    const radiusY = mobile ? 135 : 190;
    const revolutionMs = 22000;
    const base = reduceMotion ? 0 : (time / revolutionMs) * Math.PI * 2;

    cards.forEach((card, index) => {
      const angle = base + index * (Math.PI * 2 / cards.length) - Math.PI / 2;
      const x = Math.cos(angle) * radiusX;
      const y = Math.sin(angle) * radiusY;
      card.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    });

    if (!reduceMotion) frame = requestAnimationFrame(render);
  };

  frame = requestAnimationFrame(render);
  window.addEventListener('pagehide', () => { if (frame) cancelAnimationFrame(frame); }, { once: true });
}

function setYear() {
  const el = qs('#year');
  if (el) el.textContent = String(new Date().getFullYear());
}

// ---------- Analítica con consentimiento ----------
const ANALYTICS_KEY = 'impulso_analytics_consent_v1';
let analyticsEnabled = false;

function getConsent() {
  try { return localStorage.getItem(ANALYTICS_KEY); } catch { return null; }
}
function saveConsent(value) {
  try { localStorage.setItem(ANALYTICS_KEY, value); } catch { /* sin persistencia */ }
}

function loadMetaPixel() {
  if (window.fbq) return;
  !function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
    t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', IMPULSO.metaPixelId);
  window.fbq('track', 'PageView');
}

function loadTikTokPixel() {
  if (window.ttq) return;
  !function(w,d,t){
    w.TiktokAnalyticsObject=t;
    const ttq=w[t]=w[t]||[];
    ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
    ttq.setAndDefer=function(obj,method){obj[method]=function(){obj.push([method].concat([].slice.call(arguments,0)));};};
    for(let i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
    ttq.load=function(id){const s=d.createElement('script');s.type='text/javascript';s.async=true;s.src=`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${id}&lib=${t}`;const first=d.getElementsByTagName('script')[0];first.parentNode.insertBefore(s,first);};
    ttq.load(IMPULSO.tiktokPixelId);ttq.page();
  }(window,document,'ttq');
}

function enableAnalytics() {
  analyticsEnabled = true;
  loadMetaPixel();
  loadTikTokPixel();
}

function trackEvent(name, params = {}) {
  if (!analyticsEnabled) return;
  const safeParams = { ...params };
  if (window.fbq) {
    if (name === 'click_whatsapp') window.fbq('track', 'Contact', safeParams);
    else window.fbq('trackCustom', name, safeParams);
  }
  if (window.ttq && typeof window.ttq.track === 'function') {
    if (name === 'click_whatsapp') window.ttq.track('Contact', safeParams);
    else window.ttq.track(name, safeParams);
  }
}

function clearTrackingCookies() {
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

  const requestedPreferences = window.location.hash === '#privacy-preferences';
  if (requestedPreferences) window.setTimeout(openPreferences, 0);

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

function trackPackageVisibility() {
  if (!('IntersectionObserver' in window)) return;
  const section = qs('#paquetes');
  if (!section) return;
  let sent = false;
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting) && !sent) {
      sent = true;
      trackEvent('view_package', { section: 'packages' });
      observer.disconnect();
    }
  }, { threshold: 0.3 });
  observer.observe(section);
}

function init() {
  setYear();
  wireConsent();
  wireMenu();
  wireWhatsAppLinks();
  wireMobileCarousels();
  wireServiceDetails();
  wireSmartFloatingCta();
  wireOrientador();
  wireHeroOrbit();
  trackPackageVisibility();
}

document.addEventListener('DOMContentLoaded', init);