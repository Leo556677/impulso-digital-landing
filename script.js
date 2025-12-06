// === CONFIGURACIÓN GENERAL ===

// Año en el footer
document.getElementById("year").textContent = new Date().getFullYear();

// Número de WhatsApp
const phone = "51910838451";
const presetText = encodeURIComponent(
  "Hola, vi tu anuncio del autoresponder de WhatsApp y quiero más información."
);
const waUrl = `https://wa.me/${phone}?text=${presetText}`;

// Enlaces a WhatsApp
const waMainBtn = document.getElementById("whatsapp");
const waOfferBtn = document.getElementById("offer-cta");

if (waMainBtn) waMainBtn.href = waUrl;
if (waOfferBtn) waOfferBtn.href = waUrl;

// Ajustar padding-top del body según la altura real del temporizador en móvil
function adjustBodyPaddingForTimer() {
  const timerBarEl = document.querySelector(".timer-bar");
  if (!timerBarEl) return;

  // Solo aplicamos en pantallas móviles
  if (window.innerWidth <= 768) {
    const h = timerBarEl.offsetHeight || 0;
    document.body.style.paddingTop = h + "px";
  } else {
    document.body.style.paddingTop = "";
  }
}

window.addEventListener("load", adjustBodyPaddingForTimer);
window.addEventListener("resize", adjustBodyPaddingForTimer);


// === LLUVIA DE LOGOS WHATSAPP (FONDO) ===
const whatsappRainContainer = document.getElementById("whatsapp-rain");

if (whatsappRainContainer) {
  const ICON_COUNT = 36;

  for (let i = 0; i < ICON_COUNT; i++) {
    const icon = document.createElement("span");
    icon.classList.add("whatsapp-rain-icon");

    // Tamaño aleatorio (px)
    const size = 18 + Math.random() * 20; // entre 18 y 38 px
    icon.style.width = `${size}px`;
    icon.style.height = `${size}px`;

    // Posición horizontal aleatoria
    const left = Math.random() * 100;
    icon.style.left = `${left}%`;

    // Duración de caída y desfase aleatorios
    const duration = 6 + Math.random() * 4; // 14–24s
    const delay = Math.random() * -duration;  // arranca desfasado
    icon.style.animationDuration = `${duration}s`;
    icon.style.animationDelay = `${delay}s`;

    whatsappRainContainer.appendChild(icon);
  }
}


// === HERO CHAT ANIMADO – 5 NEGOCIOS EN LOOP ===

const heroChat = document.getElementById("hero-chat");
const heroChatLabel = document.getElementById("hero-chat-label");

// Todas las imágenes del chat en formato .webp dentro de /img
const pdfThumbUrl = "./img/pdf-thumb.webp";        // miniatura para PDFs
const menuImageUrl = "./img/menu-dia.webp";        // foto del menú del día

// Estas ya estaban en .webp y se mantienen igual
const catalogImageUrl =
  "./img/pexels-luiz-gustavo-miertschink-925274-1877736.webp";
const nailsImageUrl = "./img/SPA.webp";
const classroomImageUrl = "./img/CURSO-INGLES.webp";
const mapImageUrl = "./img/esp-pd-canyon-lima.webp";


const scenarios = [
  {
    label: "Tienda de ropa online",
    messages: [
      {
        sender: "user",
        type: "text",
        text: "Hola, ¿tienes este conjunto en talla M?",
        delay: 500
      },
      {
        sender: "bot",
        type: "text",
        text:
          "¡Hola! 🙌 Sí, tenemos stock en talla M.\nTe mando el catálogo actualizado y looks recomendados.",
        delay: 1800
      },
      {
        sender: "bot",
        type: "image",
        caption: "Catálogo actualizado y outfits sugeridos 👇",
        image: catalogImageUrl,
        delay: 2000
      },
      {
        sender: "bot",
        type: "text",
        text:
          "Responde con el número del modelo + tu talla (S, M, L, XL) y el bot te confirma stock al toque ✅",
        delay: 2200
      },
      {
        sender: "user",
        type: "text",
        text: "Perfecto, me quedo con el modelo 12 en talla M.",
        delay: 2200
      }
    ]
  },
  {
    label: "Centro de uñas y spa",
    messages: [
      {
        sender: "user",
        type: "text",
        text: "Hola, ¿qué horarios libres tienes para mañana?",
        delay: 500
      },
      {
        sender: "bot",
        type: "text",
        text:
          "Hola ✨ Te ayudo a reservar tu cita.\nIndícame si quieres manicure, pedicure o spa completo.",
        delay: 1600
      },
      {
        sender: "bot",
        type: "image",
        caption: "Estos son algunos diseños que están pidiendo más 💅",
        image: nailsImageUrl,
        delay: 2000
      },
      {
        sender: "bot",
        type: "text",
        text:
          "Responde con *servicio + día + hora aproximada* y el bot te muestra los horarios disponibles.",
        delay: 2200
      }
    ]
  },
  {
    label: "Academia de inglés",
    messages: [
      {
        sender: "user",
        type: "text",
        text: "Hola, quiero info de los cursos para adultos.",
        delay: 500
      },
      {
        sender: "bot",
        type: "text",
        text:
          "¡Bienvenido! 🎓 Te comparto el PDF con niveles, horarios y precios actualizados.",
        delay: 1500
      },
      {
        sender: "bot",
        type: "file",
        fileType: "pdf",
        caption: "Plan de estudios y tarifas 2025",
        image: pdfThumbUrl,
        delay: 2000
      },
      {
        sender: "bot",
        type: "text",
        text:
          "Responde con tu nivel (básico, intermedio, avanzado) y turno (mañana, tarde o noche) y el bot te muestra las mejores opciones.",
        delay: 2200
      }
    ]
  },
  {
    label: "Turismo y full day",
    messages: [
      {
        sender: "user",
        type: "text",
        text: "Hola, quiero info del full day al cañón.",
        delay: 500
      },
      {
        sender: "bot",
        type: "image",
        caption: "Así se ve el full day al cañón 😍",
        image: mapImageUrl,
        delay: 1800
      },
      {
        sender: "bot",
        type: "text",
        text:
          "Te envío el PDF con itinerario, horarios y qué incluye el full day (transporte, guiado, alimentación).",
        delay: 1800
      },
      {
        sender: "bot",
        type: "file",
        fileType: "pdf",
        caption: "Itinerario detallado y condiciones",
        image: pdfThumbUrl,
        delay: 2200
      },
      {
        sender: "bot",
        type: "text",
        text:
          "Responde con la *fecha + cantidad de personas* y el bot calcula el monto y separa tu reserva ✅",
        delay: 2200
      }
    ]
  },
  {
    label: "Restaurante menú del día",
    messages: [
      {
        sender: "user",
        type: "text",
        text: "Buenas, ¿cuál es el menú de hoy?",
        delay: 500
      },
      {
        sender: "bot",
        type: "text",
        text:
          "Hola 🍽️ Te envío el menú del día con sopas, fondos y postres.",
        delay: 1400
      },
      {
        sender: "bot",
        type: "image",
        caption: "Menú del día (incluye sopas y postre) 👇",
        image: menuImageUrl,
        delay: 2000
      },
      {
        sender: "bot",
        type: "audio",
        delay: 1800
      },
      {
        sender: "user",
        type: "text",
        text: "Perfecto, quiero 2 menús para delivery en San Borja.",
        delay: 2200
      },
      {
        sender: "bot",
        type: "text",
        text:
          "Solo dime cantidad y distrito, el bot calcula el envío y te da el link de pago. Cuando lo confirmes, agendamos el despacho hoy mismo ✅",
        delay: 2200
      }
    ]
  }
];



function createTypingBubble() {
  if (!heroChat) return null;

  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", "bot", "chat-typing");

  const label = document.createElement("div");
  label.classList.add("chat-bubble-label");
  const botName = document.createElement("span");
  botName.textContent = "Bot de tu negocio";
  label.appendChild(botName);
  bubble.appendChild(label);

  const dotsWrapper = document.createElement("div");
  dotsWrapper.classList.add("typing-dots");
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.classList.add("typing-dot");
    dotsWrapper.appendChild(dot);
  }
  bubble.appendChild(dotsWrapper);

  return bubble;
}




// Render de mensajes en el hero

function appendMessage(message) {
  if (!heroChat) return;

  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", message.sender);

  const isAttachment = message.type && message.type !== "text";

  // Etiqueta "Bot de tu negocio"
  if (message.sender === "bot") {
    const label = document.createElement("div");
    label.classList.add("chat-bubble-label");
    const botName = document.createElement("span");
    botName.textContent = "Bot de tu negocio";
    label.appendChild(botName);
    bubble.appendChild(label);
  }

  // Texto normal (cuando NO es adjunto)
  if (!isAttachment && message.text) {
    const text = document.createElement("div");
    text.textContent = message.text;
    bubble.appendChild(text);
  }

  // Adjuntos: imagen / PDF / audio
  if (isAttachment) {
    // Sin fondo verde del bubble para que se vea la tarjeta/imagen
    bubble.style.background = "transparent";
    bubble.style.padding = "0";

    // IMAGEN
    if (message.type === "image") {
      const wrapper = document.createElement("div");
      wrapper.classList.add("bubble-image");

      if (message.caption) {
        const captionEl = document.createElement("div");
        captionEl.classList.add("bubble-image-caption");
        captionEl.textContent = message.caption;
        wrapper.appendChild(captionEl);
      }

      const img = document.createElement("img");
      img.classList.add("chat-image");
      img.src = message.image || catalogImageUrl;
      img.alt = message.caption || "Imagen enviada";
      wrapper.appendChild(img);

      bubble.appendChild(wrapper);
    }
    // PDF / archivo
    else if (message.type === "file") {
      const fileCard = document.createElement("div");
      fileCard.classList.add("bubble-file");

      const thumb = document.createElement("img");
      thumb.classList.add("bubble-file-thumb");
      thumb.src = message.image || pdfThumbUrl;
      thumb.alt = message.caption || "Documento PDF";

      const meta = document.createElement("div");
      meta.classList.add("bubble-file-meta");

      const nameEl = document.createElement("div");
      nameEl.classList.add("bubble-file-name");
      nameEl.textContent =
        message.fileName || message.caption || "Documento PDF";

      const tagEl = document.createElement("div");
      tagEl.classList.add("bubble-file-tag");
      tagEl.textContent = message.tag || "PDF • 1.2 MB";

      meta.appendChild(nameEl);
      meta.appendChild(tagEl);

      fileCard.appendChild(thumb);
      fileCard.appendChild(meta);

      bubble.appendChild(fileCard);
    }
    // AUDIO
    else if (message.type === "audio") {
      const audio = document.createElement("div");
      audio.classList.add("bubble-audio");

      const play = document.createElement("div");
      play.classList.add("audio-play");
      play.textContent = "▶";

      const wave = document.createElement("div");
      wave.classList.add("audio-wave");
      for (let i = 0; i < 3; i++) {
        const bar = document.createElement("div");
        bar.classList.add("audio-bar");
        wave.appendChild(bar);
      }

      const label = document.createElement("span");
      label.classList.add("audio-label");
      label.textContent =
        message.caption || "Audio de explicación (0:32)";

      audio.appendChild(play);
      audio.appendChild(wave);
      audio.appendChild(label);

      bubble.appendChild(audio);
    }
  }

  // Hora
  const time = document.createElement("span");
  time.classList.add("chat-bubble-time");
  const now = new Date();
  time.textContent = now.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit"
  });
  bubble.appendChild(time);

  heroChat.appendChild(bubble);
  heroChat.scrollTop = heroChat.scrollHeight;
}






async function playScenario(scenario) {
  if (!heroChat) return;
  heroChat.innerHTML = "";

  if (heroChatLabel) {
    heroChatLabel.textContent = scenario.label;
  }

  for (const message of scenario.messages) {
    // Espera propia del mensaje
    await new Promise((resolve) =>
      setTimeout(resolve, message.delay || 1000)
    );

    // Si es bot, muestra "escribiendo..." antes de enviar
    if (message.sender === "bot") {
      const typing = createTypingBubble();
      if (typing) {
        heroChat.appendChild(typing);
        heroChat.scrollTop = heroChat.scrollHeight;

        await new Promise((resolve) => setTimeout(resolve, 650));

        if (heroChat.contains(typing)) {
          heroChat.removeChild(typing);
        }
      }
    }

    appendMessage(message);
  }
}







async function runHeroChatLoop() {
  if (!heroChat) return;
  let index = 0;
  while (true) {
    const scenario = scenarios[index];
    await playScenario(scenario);
    await new Promise((resolve) => setTimeout(resolve, 2200));
    index = (index + 1) % scenarios.length;
  }
}

runHeroChatLoop();

// === SLIDER TIPOS DE ARCHIVO (IMAGEN / VIDEO / AUDIO / PDF) EN HERO ===
const heroFileIconEl = document.getElementById("hero-file-icon");
const heroFileLabelEl = document.getElementById("hero-file-label");

const heroFileSlides = [
  { icon: "🖼️", label: "Imágenes, catálogos y fotos" },
  { icon: "🎥", label: "Videos cortos y demostraciones" },
  { icon: "🎧", label: "Audios de bienvenida y recordatorios" },
  { icon: "📄", label: "PDFs, menús y listas de precios" }
];

let heroFileIndex = 0;
const HERO_FILE_SLIDE_MS = 2600;

function showHeroFileSlide(index) {
  if (!heroFileIconEl || !heroFileLabelEl) return;
  const item = heroFileSlides[index];
  if (!item) return;

  heroFileIconEl.textContent = item.icon;
  heroFileLabelEl.textContent = item.label;

  const slideEl = heroFileIconEl.closest(".hero-file-slide");
  if (slideEl) {
    slideEl.classList.remove("is-active");
    void slideEl.offsetWidth;
    slideEl.classList.add("is-active");
  }
}

if (heroFileIconEl && heroFileLabelEl && heroFileSlides.length > 0) {
  showHeroFileSlide(heroFileIndex);
  setInterval(() => {
    heroFileIndex = (heroFileIndex + 1) % heroFileSlides.length;
    showHeroFileSlide(heroFileIndex);
  }, HERO_FILE_SLIDE_MS);
}

// === TIMER REGRESIVO HH:MM:SS CON REGALO +1 MINUTO ===

const BASE_SECONDS = 5 * 60;
const BONUS_SECONDS = 60;
let remaining = BASE_SECONDS;
let extended = false;
let effectiveTotal = BASE_SECONDS;
let urgencyActivated = false;

const timerText = document.getElementById("timer-text");
const timerTextTop = document.getElementById("timer-text-top");
const timerCircle = document.getElementById("timer-circle");
const timerBar = document.querySelector(".timer-bar");
const timerBarProgressFill = document.getElementById("timer-bar-progress-fill");

function formatTimeFull(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function updateCircleProgress() {
  const progress = Math.max(remaining, 0) / effectiveTotal;
  const angle = Math.max(progress, 0) * 360;
  const gradient = `conic-gradient(from 0deg, var(--accent-soft) 0deg, var(--accent) ${angle}deg, #8c4bff ${angle}deg)`;
  if (timerCircle) {
    timerCircle.style.background = gradient;
  }
}

function updateBarProgress() {
  const progress = Math.max(remaining, 0) / effectiveTotal;
  if (timerBarProgressFill) {
    timerBarProgressFill.style.transform = `scaleX(${progress})`;
  }
}

function updateTimerTextDisplay() {
  const formatted = formatTimeFull(remaining);
  if (timerText) timerText.textContent = formatted;
  if (timerTextTop) timerTextTop.textContent = formatted;
}

function activateUrgencyState() {
  if (urgencyActivated) return;
  urgencyActivated = true;

  if (timerBar) {
    timerBar.classList.add("is-urgent");
  }
  if (timerTextTop) {
    timerTextTop.classList.add("is-urgent");
  }
}

function startTimer() {
  if (!timerText && !timerTextTop) return;

  updateTimerTextDisplay();
  updateCircleProgress();
  updateBarProgress();

  setInterval(() => {
    remaining--;

    if (remaining <= 0) {
      remaining = 0;
    }

    if (remaining <= 60 && !urgencyActivated) {
      activateUrgencyState();
    }

    // Regalo de 1 minuto
    if (remaining === 1 && !extended) {
      extended = true;
      effectiveTotal = BASE_SECONDS + BONUS_SECONDS;
      window.alert("Te regalamos 1 minuto más para aprovechar la oferta 🤝");
      remaining += BONUS_SECONDS;

      // Aquí mantenemos tu nueva lógica: activar testimonios dorados
      triggerExtensionNotices();
    }

    updateTimerTextDisplay();
    updateCircleProgress();
    updateBarProgress();
  }, 1000);
}

startTimer();


// === MENSAJES DE EXTENSIÓN (+1 MINUTO) ===

const extensionNoticesContainer = document.getElementById("extension-notices");

const extensionMessages = [
  "María acaba de decir: “Qué bueno que me dieron un minuto más, alcancé a separar mi cupo”.",
  "Jorge comentó: “Ese minuto extra fue justo lo que necesitaba para decidirme”.",
  "Lucía: “Me encantó que no cerraran la oferta de golpe, se siente acompañado el proceso”.",
  "Carlos: “Gracias al tiempo extra pude consultar con mi socio y cerrar el trato”."
];

function triggerExtensionNotices() {
  // Al regalar el minuto extra, activamos testimonios dorados en el hero.
  if (typeof activateBonusTestimonials === "function") {
    activateBonusTestimonials();
  }
}

// === TESTIMONIOS / PRUEBA SOCIAL (SLIDER AUTO) ===

const testimonialsData = [
  {
    name: "Carla M.",
    role: "Tienda de ropa online",
    rating: 4.5,
    tag: "Más respuestas en menos tiempo",
    type: "person",
    image:
      "https://i.ibb.co/RpVtTN7S/pexels-luiz-gustavo-miertschink-925274-1877736.jpg",
    text:
      "Antes respondía los mensajes en la noche. Con el bot de Impulso Digital, mis clientas reciben precios y fotos al instante y las ventas no paran."
  },
  {
    name: "TechFix Laptops",
    role: "Servicio técnico",
    rating: 4.8,
    tag: "Menos chats, más orden",
    type: "business",
    image:
      "https://images.pexels.com/photos/2249248/pexels-photo-2249248.jpeg?auto=compress&cs=tinysrgb&w=200",
    text:
      "Antes tenía la bandeja llena de consultas sueltas. Ahora el bot clasifica por tipo de falla y horario, y yo solo atiendo los casos importantes."
  },
  {
    name: "Laura G.",
    role: "Emprendedora de belleza",
    rating: 5.0,
    tag: "Agenda llena sin perseguir clientes",
    type: "person",
    image:
      "https://images.pexels.com/photos/3760852/pexels-photo-3760852.jpeg?auto=compress&cs=tinysrgb&w=200",
    text:
      "El bot recuerda las citas, manda requisitos y opciones de horario. Mis clientas sienten acompañamiento sin que yo esté pegada al celular."
  },
  {
    name: "Academia Bright",
    role: "Academia de inglés",
    rating: 5.0,
    tag: "Seguimiento a interesados",
    type: "business",
    image:
      "https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=200",
    text:
      "Quienes preguntan por el curso reciben PDF, horarios y link de inscripción en segundos. El bot hace el 80% del trabajo de admisión."
  },
  {
    name: "Restaurante El Sabor",
    role: "Restaurante de menú",
    rating: 4.5,
    tag: "Menos llamadas, más pedidos",
    type: "business",
    image:
      "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=200",
    text:
      "El chatbot manda la carta del día, ubicación y métodos de pago. Los clientes llegan al restaurante ya con todo claro, sin tantas llamadas perdidas."
  },
  {
    name: "Envíos Max",
    role: "Agencia de mensajería",
    rating: 4.0,
    tag: "Soporte automático",
    type: "business",
    image:
      "https://images.pexels.com/photos/6169664/pexels-photo-6169664.jpeg?auto=compress&cs=tinysrgb&w=200",
    text:
      "Los clientes reciben estados de envío y tiempos estimados en automático. Nuestro equipo solo atiende casos especiales, el resto es automático."
  },
  {
    name: "Marta G.",
    role: "Productos naturales",
    rating: 4.5,
    tag: "Upselling inteligente",
    type: "person",
    image:
      "https://images.pexels.com/photos/3760851/pexels-photo-3760851.jpeg?auto=compress&cs=tinysrgb&w=200",
    text:
      "Cuando alguien pide un producto, el bot recomienda combos y ofertas relacionadas. El ticket promedio subió y yo solo reviso los pedidos finales."
  },
  {
    name: "Andrea P.",
    role: "Clases particulares",
    rating: 5.0,
    tag: "Captura de leads 24/7",
    type: "person",
    image:
      "https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=200",
    text:
      "Mientras dicto clases, el bot responde dudas frecuentes, envía horarios y deja todo listo para que nuevos alumnos me contacten. Lleno grupos nuevos cada semana sin perseguir chats."
  }
];

const bonusTestimonialsData = [
  {
    name: "María R.",
    role: "Emprendedora de ropa",
    rating: 5.0,
    tag: "+1 minuto decisivo",
    type: "person",
    image:
      "https://i.ibb.co/RpVtTN7S/pexels-luiz-gustavo-miertschink-925274-1877736.jpg",
    text:
      "Ese minuto extra fue justo lo que necesitaba para separar mi cupo sin perder la oferta."
  },
  {
    name: "Jorge V.",
    role: "Servicios técnicos",
    rating: 4.8,
    tag: "Oferta salvada",
    type: "business",
    image:
      "https://images.pexels.com/photos/2249248/pexels-photo-2249248.jpeg?auto=compress&cs=tinysrgb&w=200",
    text:
      "Cuando vi que me regalaron 1 minuto más pude consultar con mi socio y cerrar el trato tranquilo."
  },
  {
    name: "Lucía P.",
    role: "Centro de estética",
    rating: 5.0,
    tag: "Decisión acompañada",
    type: "person",
    image:
      "https://images.pexels.com/photos/3760852/pexels-photo-3760852.jpeg?auto=compress&cs=tinysrgb&w=200",
    text:
      "Me encantó que no cortaran la oferta de golpe, ese tiempo extra hizo la diferencia para decidir."
  },
  {
    name: "Carlos T.",
    role: "Restaurante familiar",
    rating: 4.7,
    tag: "El minuto que faltaba",
    type: "business",
    image:
      "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=200",
    text:
      "Gracias al minuto adicional pude revisar números y tomar acción sin perder el precio promocional."
  }
];

let activeTestimonials = testimonialsData;
let isBonusTestimonialsActive = false;

function buildStars(rating) {
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  let str = "";
  str += "★".repeat(full);
  if (hasHalf) str += "◐";
  str += "☆".repeat(empty);
  return `${str} (${rating.toFixed(1)})`;
}

function buildDateDaysAgo(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

const cardEl = document.getElementById("testimonial-card");
const avatarEl = document.getElementById("testimonial-avatar");
const nameEl = document.getElementById("testimonial-name");
const roleEl = document.getElementById("testimonial-role");
const ratingEl = document.getElementById("testimonial-rating");
const textEl = document.getElementById("testimonial-text");
const dateEl = document.getElementById("testimonial-date");
const tagEl = document.getElementById("testimonial-tag");

let currentIndex = 0;
const SLIDE_DURATION_MS = 6000;

function showTestimonial(index) {
  const dataset = activeTestimonials || testimonialsData;
  const item = dataset[index];
  if (cardEl) {
    cardEl.classList.toggle("is-gold", isBonusTestimonialsActive);
  }
  if (!item || !cardEl) return;

  nameEl.textContent = item.name;
  roleEl.textContent = item.role;
  ratingEl.textContent = buildStars(item.rating);
  textEl.textContent = item.text;

  const daysAgo = index % 7;
  dateEl.textContent = `Publicado el ${buildDateDaysAgo(daysAgo)}`;
  tagEl.textContent = item.tag;

  if (avatarEl) {
    avatarEl.src = item.image;
    avatarEl.alt = item.name;
    avatarEl.classList.remove("is-logo");
    if (item.type === "business") {
      avatarEl.classList.add("is-logo");
    }
  }

  cardEl.classList.remove("is-active");
  void cardEl.offsetWidth;
  cardEl.classList.add("is-active");
}

if (cardEl && activeTestimonials.length > 0) {
  showTestimonial(currentIndex);

  setInterval(() => {
    if (!activeTestimonials || activeTestimonials.length === 0) return;
    currentIndex = (currentIndex + 1) % activeTestimonials.length;
    showTestimonial(currentIndex);
  }, SLIDE_DURATION_MS);
}

function activateBonusTestimonials() {
  if (!cardEl) return;
  activeTestimonials = bonusTestimonialsData;
  isBonusTestimonialsActive = true;
  currentIndex = 0;
  showTestimonial(currentIndex);
}


// === BENEFICIOS – CAROUSEL 1x1 CON ENTRADA Y POLVO INFINITO ===
const benefitsSection = document.getElementById("beneficios");
const benefitCards = Array.from(document.querySelectorAll(".benefit-card"));

let benefitsCarouselStarted = false;

function startBenefitsCarousel() {
  if (benefitsCarouselStarted || benefitCards.length === 0) return;
  benefitsCarouselStarted = true;

  let currentIndex = 0;

  const visibleTime = 2200;  // ms que se queda "normal"
  const dustTime = 1400;     // debe parecerse a la duración de benefitDustOut
  const gapTime = 400;       // pausa entre una tarjeta y la siguiente

  function showNextCard() {
    // Reset total: todas ocultas y sin clases de animación
    benefitCards.forEach((card) => {
      card.style.opacity = 0;
      card.classList.remove("benefit-visible", "benefit-dusting");
    });

    const card = benefitCards[currentIndex];

    // 1) Aparición desde la derecha
    card.classList.add("benefit-visible");

    // 2) Después de un rato, efecto polvo
    setTimeout(() => {
      card.classList.remove("benefit-visible");
      card.classList.add("benefit-dusting");

      // 3) Cuando termina el polvo, pasamos al siguiente beneficio
      setTimeout(() => {
        card.classList.remove("benefit-dusting");
        card.style.opacity = 0;

        currentIndex = (currentIndex + 1) % benefitCards.length;
        setTimeout(showNextCard, gapTime);
      }, dustTime);
    }, visibleTime);
  }

  showNextCard();
}

if (benefitsSection && "IntersectionObserver" in window) {
  const benefitsObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startBenefitsCarousel();
          benefitsObserver.unobserve(benefitsSection);
        }
      });
    },
    { threshold: 0.3 }
  );

  benefitsObserver.observe(benefitsSection);
} else {
  // Fallback: si el navegador no soporta IntersectionObserver, se lanza igual
  startBenefitsCarousel();
}

