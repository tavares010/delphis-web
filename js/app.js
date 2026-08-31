/* ===========================================================
   DELPHIS METHOD — UTILIDADES COMPARTIDAS DE LA APP
   Chip de progreso en navbar, toasts, celebraciones, audio TTS,
   normalización de texto para el juego de producción.
   Se carga después de data.js, srs.js y progress.js.
   =========================================================== */

// ---------- Errores del micrófono (dictado por voz) ----------
// En iOS/Safari sobre todo, el reconocimiento de voz falla más seguido
// (permiso, red, silencio) y antes esos fallos no avisaban nada -el
// botón se quedaba en "grabando" para siempre sin explicar por qué.
function mensajeErrorMic(codigo) {
  const mensajes = {
    'not-allowed': 'Necesitas dar permiso de micrófono en los ajustes del navegador.',
    'service-not-allowed': 'Necesitas dar permiso de micrófono en los ajustes del navegador.',
    'no-speech': 'No se oyó nada, inténtalo de nuevo.',
    'audio-capture': 'No se encontró ningún micrófono.',
    'network': 'Problema de conexión con el dictado por voz, inténtalo de nuevo.',
    'aborted': null, // el usuario lo paró a mano, sin mensaje
  };
  return codigo in mensajes ? mensajes[codigo] : 'No se pudo usar el micrófono ahora mismo, prueba a escribir.';
}

// ---------- Chip de progreso (navbar) ----------
function renderProgressChip() {
  const wraps = document.querySelectorAll('[data-progress-chip]');
  if (!wraps.length) return;
  const data = progressLoad();
  const { actual } = getRankInfo(data.puntos);

  const cursoActivo = (typeof getCursoActivo === 'function') ? getCursoActivo() : null;
  const todosLosCursos = (typeof CURSOS !== 'undefined') ? CURSOS : [];

  wraps.forEach(wrap => {
    wrap.innerHTML = `
      ${cursoActivo ? `
        <div class="lang-switcher">
          <button type="button" class="progress-chip__item lang-switcher__trigger" title="Cambiar de idioma" style="font-size:1.1rem;">${cursoActivo.bandera}<svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <div class="lang-switcher__menu">
            <span class="lang-switcher__label">Cambiar de idioma</span>
            ${todosLosCursos.map(c => `
              <button type="button" class="lang-switcher__opt ${c.id === cursoActivo.id ? 'active' : ''}" data-curso="${c.id}" style="--curso-a:${c.colorA}; --curso-b:${c.colorB};">
                <span class="lang-switcher__flag">${c.bandera}</span>
                <span>${c.nombre}</span>
                ${c.id === cursoActivo.id ? '<span class="lang-switcher__check">✓</span>' : ''}
              </button>
            `).join('')}
            <a href="cursos.html" class="lang-switcher__all">Ver todos los cursos →</a>
          </div>
        </div>
      ` : ''}
      <span class="progress-chip__item"><span data-emoji>🔥</span>${data.racha}</span>
      <span class="progress-chip__item"><span data-emoji>${actual.icono}</span>${data.puntos}</span>
      <span class="progress-chip__item"><span data-emoji>🪙</span>${data.monedas}</span>
      <a href="perfil.html" class="progress-chip__avatar" title="Mi perfil">${data.avatar}</a>
    `;

    const sw = wrap.querySelector('.lang-switcher');
    if (sw) {
      const trigger = sw.querySelector('.lang-switcher__trigger');
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.lang-switcher.open').forEach(o => { if (o !== sw) o.classList.remove('open'); });
        sw.classList.toggle('open');
      });
      sw.querySelectorAll('.lang-switcher__opt').forEach(btn => {
        btn.addEventListener('click', () => {
          setCursoActivo(btn.dataset.curso);
          location.href = 'curriculo.html';
        });
      });
    }
  });
}

// Un solo listener para toda la página, sin importar cuántas veces se
// vuelva a pintar el chip (perfil.js lo repinta varias veces).
document.addEventListener('click', () => {
  document.querySelectorAll('.lang-switcher.open').forEach(o => o.classList.remove('open'));
});

// ---------- Toasts ----------
function ensureToastWrap() {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  return wrap;
}

function showToast(message, duration = 2600) {
  const wrap = ensureToastWrap();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, duration);
}

// ---------- Celebración de racha ----------
function celebrate(message) {
  const el = document.createElement('div');
  el.className = 'celebration';
  el.innerHTML = `<span class="celebration__text">${message}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1400);
}

// ---------- Puntos flotantes ----------
function popPoints(x, y, text) {
  const el = document.createElement('div');
  el.className = 'points-popup';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ---------- Texto a voz ----------
// Poner utter.lang NO basta para que suene con el acento correcto -en
// muchos navegadores (sobre todo iOS/Safari) si no se fija además una
// voz de verdad, cae en la voz por defecto del sistema (aquí, español)
// sin importar el idioma pedido. Las voces cargan async y en inglés
// suelen estar listas ya (es la voz por defecto en casi todos los
// dispositivos), pero las de otros idiomas a veces tardan más en
// aparecer -por eso NUNCA se usa una lista guardada de antes: se pide
// getVoices() de nuevo cada vez, y si aún así no hay ninguna que
// encaje, se espera un poco (pueden estar a mitad de cargar) antes de
// hablar con lo que haya.
function vocesTTSAhora() {
  return ('speechSynthesis' in window) ? window.speechSynthesis.getVoices() : [];
}
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices(); // dispara la carga en algunos navegadores
}
function vozParaIdioma(langCode) {
  const voces = vocesTTSAhora();
  const prefijo = langCode.split('-')[0].toLowerCase();
  return voces.find(v => v.lang.toLowerCase() === langCode.toLowerCase())
    || voces.find(v => v.lang.toLowerCase().startsWith(prefijo))
    || null;
}

// callbacks opcional: { onStart, onEnd } -para sincronizar, por ejemplo,
// la animación de un avatar con el inicio/fin real de la narración.
function speakText(text, rate = 1, lang, callbacks) {
  if (!('speechSynthesis' in window)) {
    showToast('Tu navegador no soporta narración por voz.');
    if (callbacks && callbacks.onEnd) callbacks.onEnd();
    return null;
  }
  const targetLang = lang || (typeof getCursoActivo === 'function' ? getCursoActivo().speechLang : 'en-US');

  function decirDeVerdad(reintentos) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = targetLang;
    const voz = vozParaIdioma(targetLang);
    // Si se pide un idioma que no es inglés y todavía no hay ninguna voz
    // que encaje, puede que la lista de voces siga cargando -se reintenta
    // un par de veces con una pequeña espera antes de rendirse y hablar
    // con la voz por defecto (mejor eso que quedarse mudo).
    if (!voz && !targetLang.toLowerCase().startsWith('en') && reintentos > 0) {
      setTimeout(() => decirDeVerdad(reintentos - 1), 250);
      return;
    }
    if (voz) utter.voice = voz;
    utter.rate = rate;
    if (callbacks) {
      if (callbacks.onStart) utter.addEventListener('start', callbacks.onStart);
      if (callbacks.onEnd) { utter.addEventListener('end', callbacks.onEnd); utter.addEventListener('error', callbacks.onEnd); }
    }
    window.speechSynthesis.speak(utter);
  }
  decirDeVerdad(4);
}

// ---------- Normalización para comparar respuestas escritas ----------
function normalizeAnswer(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita acentos
    .replace(/[.,!?¿¡"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------- Racha de aciertos (dentro de una sesión de juego) ----------
function comboMessage(streak) {
  if (streak === 3) return '🔥 ¡Racha de 3!';
  if (streak === 5) return '⚡ ¡Racha de 5!';
  if (streak === 7) return '🚀 ¡Racha de 7!';
  if (streak >= 10 && streak % 5 === 0) return `🏆 ¡Racha de ${streak}!`;
  return null;
}

// ---------- Tema de color (tienda cosmética, catálogo real) ----------
async function applyTheme() {
  const data = progressLoad();
  if (!data.tema || data.tema === 'theme_classic') {
    // Sin tema de tienda equipado: el color por defecto es el del curso
    // activo (ver js/courses.js aplicarTemaCurso), no un morado fijo para
    // todos -así se distingue de un vistazo qué idioma estás estudiando.
    if (typeof aplicarTemaCurso === 'function') aplicarTemaCurso();
    else ['--blue-500', '--blue-400', '--cyan-400', '--cyan-300'].forEach(v => document.documentElement.style.removeProperty(v));
    return;
  }
  try {
    const content = await loadContent();
    const item = content.shopCatalog.find(s => s.id === data.tema);
    if (item && item.colors && item.colors.length >= 2) {
      document.documentElement.style.setProperty('--blue-500', item.colors[0]);
      document.documentElement.style.setProperty('--blue-400', item.colors[0]);
      document.documentElement.style.setProperty('--cyan-400', item.colors[1]);
      document.documentElement.style.setProperty('--cyan-300', item.colors[1]);
    }
  } catch (e) { /* sin red: se queda con el tema por defecto */ }
}
applyTheme();

document.addEventListener('DOMContentLoaded', renderProgressChip);

// ---------- Muro de membresía (simulado -sin pasarela de pago real todavía) ----------
// Lo único gratis de verdad es el verbo "to be" y la introducción del
// libro (ver nodoEsGratis en curriculo-builder.js). Todo lo demás pide
// membresía; como no hay checkout real montado aún, "Suscribirme" activa
// la membresía al instante y avisa que es simulado.
function mostrarMuroPremium(onUnlock) {
  if (document.getElementById('premiumModalOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'premiumModalOverlay';
  overlay.className = 'premium-modal-overlay';
  overlay.innerHTML = `
    <div class="premium-modal">
      <button class="premium-modal__close" id="premiumModalClose" aria-label="Cerrar">✕</button>
      <div class="premium-modal__icon">💎</div>
      <h3>Esto es de la membresía</h3>
      <p>El verbo <strong>"to be"</strong> y la introducción del libro son gratis para siempre.
        El resto del currículo, el libro completo y los paquetes se desbloquean con la membresía.</p>
      <div class="premium-modal__price">Desde $9<span>/mes</span></div>
      <button class="btn btn--primary btn--lg" id="btnFakeSubscribe">Suscribirme</button>
      <a href="index.html#precios" class="premium-modal__link">Ver todos los planes</a>
      <p class="premium-modal__note">El pago real llega pronto — por ahora esto simula la suscripción al instante.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('premiumModalClose').addEventListener('click', close);
  document.getElementById('btnFakeSubscribe').addEventListener('click', () => {
    activarPremiumFalso();
    close();
    showToast('✅ (Simulado) Ya tienes la membresía — contenido desbloqueado.');
    if (onUnlock) onUnlock();
  });
}
