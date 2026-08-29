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

  wraps.forEach(wrap => {
    wrap.innerHTML = `
      ${cursoActivo ? `<a href="cursos.html" class="progress-chip__item" title="Cambiar de curso" style="font-size:1.1rem;">${cursoActivo.bandera}</a>` : ''}
      <span class="progress-chip__item"><span data-emoji>🔥</span>${data.racha}</span>
      <span class="progress-chip__item"><span data-emoji>${actual.icono}</span>${data.puntos}</span>
      <span class="progress-chip__item"><span data-emoji>🪙</span>${data.monedas}</span>
      <a href="perfil.html" class="progress-chip__avatar" title="Mi perfil">${data.avatar}</a>
    `;
  });
}

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
function speakText(text, rate = 1, lang) {
  if (!('speechSynthesis' in window)) {
    showToast('Tu navegador no soporta narración por voz.');
    return null;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang || (typeof getCursoActivo === 'function' ? getCursoActivo().speechLang : 'en-US');
  utter.rate = rate;
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
    ['--blue-500', '--blue-400', '--cyan-400', '--cyan-300'].forEach(v => document.documentElement.style.removeProperty(v));
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
