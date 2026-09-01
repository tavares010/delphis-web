/* ===========================================================
   DELPHIS METHOD — RECORRIDOS GUIADOS (tutoriales interactivos)
   Resalta partes reales de la pantalla (no capturas ni dibujos) con una
   burbuja explicando qué son. Se muestra solo una vez por página y por
   usuario (localStorage), y se puede volver a abrir en cualquier momento
   con el botón "?" flotante que queda montado en la página.
   =========================================================== */

const TOUR_SEEN_KEY = 'delphis_tours_vistos_v1';

function tourVisto(id) {
  try { return JSON.parse(localStorage.getItem(TOUR_SEEN_KEY) || '{}')[id] === true; } catch (e) { return false; }
}
function tourMarcarVisto(id) {
  try {
    const d = JSON.parse(localStorage.getItem(TOUR_SEEN_KEY) || '{}');
    d[id] = true;
    localStorage.setItem(TOUR_SEEN_KEY, JSON.stringify(d));
  } catch (e) {}
}

function iniciarTour(id, pasosOriginales) {
  // Solo pasos cuyo elemento existe de verdad ahora mismo -si la página
  // está en otro estado (otro paso del juego, otra vista del currículo)
  // y un selector no aparece, se salta ese paso en vez de romper el tour.
  const pasos = pasosOriginales.filter(p => document.querySelector(p.selector));
  if (!pasos.length) return;
  let i = 0;

  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.innerHTML = `
    <div class="tour-spotlight" id="tourSpotlight"></div>
    <div class="tour-bubble" id="tourBubble">
      <div class="tour-bubble__step" id="tourStep"></div>
      <h4 id="tourTitle"></h4>
      <p id="tourText"></p>
      <div class="tour-bubble__actions">
        <button type="button" class="tour-bubble__skip" id="tourSkip">Saltar</button>
        <div class="tour-bubble__nav">
          <button type="button" class="btn btn--outline" id="tourPrev">← Atrás</button>
          <button type="button" class="btn btn--primary" id="tourNext">Siguiente →</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add('tour-activo');

  function cerrar() {
    tourMarcarVisto(id);
    overlay.remove();
    document.body.classList.remove('tour-activo');
    window.removeEventListener('resize', posicionar);
  }

  function posicionar() {
    const paso = pasos[i];
    const el = document.querySelector(paso.selector);
    // El paso pudo haber existido al abrir el tour pero desaparecer luego
    // (la página cambió de estado a mitad del recorrido) -se salta.
    if (!el) {
      if (i < pasos.length - 1) { i++; posicionar(); } else cerrar();
      return;
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      const pad = 8;
      overlay.querySelector('#tourSpotlight').style.cssText =
        `top:${r.top - pad}px; left:${r.left - pad}px; width:${r.width + pad * 2}px; height:${r.height + pad * 2}px;`;

      overlay.querySelector('#tourStep').textContent = `Paso ${i + 1} de ${pasos.length}`;
      overlay.querySelector('#tourTitle').textContent = paso.titulo;
      overlay.querySelector('#tourText').textContent = paso.texto;
      overlay.querySelector('#tourPrev').style.visibility = i === 0 ? 'hidden' : 'visible';
      overlay.querySelector('#tourNext').textContent = i === pasos.length - 1 ? 'Entendido ✓' : 'Siguiente →';

      const bubble = overlay.querySelector('#tourBubble');
      const bubbleW = Math.min(320, window.innerWidth * 0.88);
      const bubbleHEstimado = 220;
      let top = r.bottom + pad + 14;
      if (top + bubbleHEstimado > window.innerHeight) top = Math.max(14, r.top - pad - 14 - bubbleHEstimado);
      let left = Math.min(Math.max(14, r.left), window.innerWidth - bubbleW - 14);
      bubble.style.cssText = `top:${top}px; left:${left}px;`;
    }, 260); // deja terminar el scrollIntoView suave antes de medir posición real
  }

  overlay.querySelector('#tourSkip').addEventListener('click', cerrar);
  overlay.querySelector('#tourNext').addEventListener('click', () => {
    if (i < pasos.length - 1) { i++; posicionar(); } else cerrar();
  });
  overlay.querySelector('#tourPrev').addEventListener('click', () => { if (i > 0) { i--; posicionar(); } });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  window.addEventListener('resize', posicionar);
  posicionar();
}

function montarBotonAyuda(id, pasos) {
  if (document.getElementById('tourHelpBtn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'tourHelpBtn';
  btn.className = 'tour-help-btn';
  btn.title = 'Ver tutorial de esta página';
  btn.setAttribute('aria-label', 'Ver tutorial de esta página');
  btn.textContent = '?';
  btn.addEventListener('click', () => iniciarTour(id, pasos));
  document.body.appendChild(btn);
}

// Punto de entrada de cada página: monta el botón de ayuda siempre, y
// lanza el tour automáticamente solo la primera vez -con un pequeño
// margen (delayMs) para dar tiempo a que el contenido real ya esté
// pintado, ya que los pasos apuntan a elementos que crea JS (loadContent
// es asíncrono en todas estas páginas).
function ofrecerTour(id, pasos, { delayMs = 700 } = {}) {
  montarBotonAyuda(id, pasos);
  if (!tourVisto(id)) setTimeout(() => iniciarTour(id, pasos), delayMs);
}
