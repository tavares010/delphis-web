/* ===========================================================
   DELPHIS METHOD — UTILIDADES COMPARTIDAS DE LA APP
   Chip de progreso en navbar, toasts, celebraciones, audio TTS,
   normalización de texto para el juego de producción.
   Se carga después de data.js, srs.js y progress.js.
   =========================================================== */

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
// callbacks opcional: { onStart, onEnd } -para sincronizar, por ejemplo,
// la animación de un avatar con el inicio/fin real de la narración.
function speakText(text, rate = 1, lang, callbacks) {
  if (!('speechSynthesis' in window)) {
    showToast('Tu navegador no soporta narración por voz.');
    if (callbacks && callbacks.onEnd) callbacks.onEnd();
    return null;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang || (typeof getCursoActivo === 'function' ? getCursoActivo().speechLang : 'en-US');
  utter.rate = rate;
  if (callbacks) {
    if (callbacks.onStart) utter.addEventListener('start', callbacks.onStart);
    if (callbacks.onEnd) { utter.addEventListener('end', callbacks.onEnd); utter.addEventListener('error', callbacks.onEnd); }
  }
  window.speechSynthesis.speak(utter);
  return utter;
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
