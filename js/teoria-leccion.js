/* ===========================================================
   DELPHIS METHOD — LECCIÓN DE TEORÍA (teoria-leccion.html)
   Máquina de estados de una sola página, como js/leccion.js: TOC ->
   sección (una a la vez, Anterior/Siguiente) -> quiz (contrarreloj,
   18s por pregunta) -> resultado. Sin URL por sub-paso.
   =========================================================== */
function qsTL(sel, root = document) { return root.querySelector(sel); }

const teoriaLeccionParams = new URLSearchParams(location.search);
const TEORIA_LECCION_ID = teoriaLeccionParams.get('id');
const content_el = document.getElementById('teoriaLeccionContent');

const QUIZ_TEORIA_DURACION_S = 18;
const QUIZ_LETRAS = ['A', 'B', 'C', 'D', 'E'];

// Vídeos interactivos de gramática: servidos desde jsDelivr (CDN gratuito
// para repos públicos de GitHub), no desde Firebase Hosting -el repo ya
// los tiene commiteados en web_export/assets/teoria_videos/ (son solo
// ~38MB, a diferencia del audio/vídeo pesado del libro que sí está
// excluido de git). Así no cuentan para la cuota de almacenamiento de
// Hosting, que ya se agota solo con el resto de contenido.
// Fijado a un commit concreto (no a "main") porque jsDelivr cachea las
// referencias a rama durante horas -un commit es inmutable, así que la
// URL nunca sirve una versión vieja ni tarda en reflejar un cambio real
// (un vídeo nuevo simplemente usa un nombre de archivo nuevo).
const TEORIA_VIDEO_BASE = 'https://cdn.jsdelivr.net/gh/tavares010/delphis-web@main/web_export/assets/teoria_videos/';

function buscarLeccionTeoria(theoryLessons, id) {
  for (const nivel of ['nivel1', 'nivel2', 'nivel3']) {
    const lista = (theoryLessons && theoryLessons[nivel]) || [];
    const encontrada = lista.find(l => l.id === id);
    if (encontrada) return { leccion: encontrada, nivel: parseInt(nivel.replace('nivel', ''), 10) };
  }
  return null;
}

function renderToc(ctx) {
  ctx.secIdx = null;
  const estado = teoriaEstado(ctx.leccion.id);
  content_el.innerHTML = `
    <a href="teoria.html?nivel=${ctx.nivel}" class="breadcrumb-back">← Volver a Conceptos esenciales</a>
    <div class="lesson-card__head">
      <h1>${ctx.leccion.emoji} ${ctx.leccion.titulo}</h1>
      <p>${ctx.leccion.secciones.length} secciones · ${ctx.leccion.quiz.length} preguntas${estado.quizAprobado ? ' · ✓ ya superado' : ''}</p>
    </div>
    <div class="teoria-toc" id="teoriaToc">
      ${ctx.leccion.secciones.map((s, i) => `
        <div class="teoria-toc__item ${ctx.vistas.has(i) ? 'teoria-toc__item--visitada' : ''}" data-idx="${i}">
          <div class="teoria-toc__num">${ctx.vistas.has(i) ? '✓' : i + 1}</div>
          <div class="teoria-toc__title">${s.titulo}</div>
        </div>
      `).join('')}
    </div>
    <div class="hero__cta" style="justify-content:center;">
      <button class="btn btn--primary btn--lg" id="btnEmpezar">${ctx.vistas.size ? 'Seguir leyendo →' : 'Empezar →'}</button>
      <button class="btn btn--outline" id="btnIrQuiz">🧠 Ir al quiz</button>
    </div>
  `;
  qsTL('#teoriaToc').querySelectorAll('.teoria-toc__item').forEach(item => {
    item.addEventListener('click', () => renderSeccion(ctx, parseInt(item.dataset.idx, 10)));
  });
  qsTL('#btnEmpezar').addEventListener('click', () => {
    const siguiente = ctx.leccion.secciones.findIndex((_, i) => !ctx.vistas.has(i));
    renderSeccion(ctx, siguiente === -1 ? 0 : siguiente);
  });
  qsTL('#btnIrQuiz').addEventListener('click', () => renderQuiz(ctx));

  if (typeof ofrecerTour === 'function') {
    ofrecerTour('teoria-leccion', [
      { selector: '.teoria-toc', titulo: 'Tabla de contenidos', texto: 'Toca cualquier sección para leerla, en el orden que prefieras.' },
      { selector: '#btnIrQuiz', titulo: 'El quiz siempre está disponible', texto: 'No hace falta leer todas las secciones antes de intentarlo -pero ayuda.' },
    ]);
  }
}

function renderSeccion(ctx, idx) {
  ctx.secIdx = idx;
  ctx.vistas.add(idx);
  marcarTeoriaVista(ctx.leccion.id);
  const s = ctx.leccion.secciones[idx];
  const esUltima = idx >= ctx.leccion.secciones.length - 1;

  const ejemplosHtml = (s.ejemplos || []).map(e => `
    <div class="teoria-seccion-card__example">
      <strong>${typeof resaltarEstructura === 'function' && e.tenseRaw ? resaltarEstructura(e.frase, e.tenseRaw) : e.frase}</strong>
      <span>${e.traduccion}</span>
    </div>
  `).join('');

  const videoHtml = s.video ? `
    <div class="teoria-seccion-card__video">
      <video controls preload="metadata" playsinline src="${TEORIA_VIDEO_BASE}${s.video}"></video>
    </div>
  ` : '';

  const tablaHtml = s.tabla ? `
    <div class="teoria-seccion-card__table-wrap">
      <table class="teoria-seccion-card__table">
        <thead><tr>${s.tabla[0].map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${s.tabla.slice(1).map(fila => `<tr>${fila.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  ` : '';

  content_el.innerHTML = `
    <button type="button" class="breadcrumb-back" id="btnToc">← ${ctx.leccion.titulo}</button>
    <div class="teoria-seccion-card">
      <div class="study-progress">
        <span>Sección ${idx + 1} de ${ctx.leccion.secciones.length}</span>
        <div class="study-progress__bar"><div class="study-progress__fill" style="width:${((idx + 1) / ctx.leccion.secciones.length) * 100}%"></div></div>
      </div>
      <h2 style="margin:1.2rem 0 .8rem;">${s.titulo}</h2>
      <div class="teoria-seccion-card__body">${s.cuerpo}</div>
      ${videoHtml}
      ${tablaHtml}
      <div class="teoria-seccion-card__examples">${ejemplosHtml}</div>
    </div>
    <div class="lesson-nav">
      <button class="btn btn--outline" id="btnSecPrev" ${idx === 0 ? 'disabled style="opacity:.4;pointer-events:none;"' : ''}>← Anterior</button>
      <button class="btn btn--primary" id="btnSecNext">${esUltima ? '🧠 Ir al quiz' : 'Siguiente →'}</button>
    </div>
  `;
  qsTL('#btnToc').addEventListener('click', () => renderToc(ctx));
  qsTL('#btnSecPrev').addEventListener('click', () => renderSeccion(ctx, idx - 1));
  qsTL('#btnSecNext').addEventListener('click', () => {
    if (esUltima) renderQuiz(ctx); else renderSeccion(ctx, idx + 1);
  });
}

/* ---------- Quiz de la lección: contrarreloj, 18s por pregunta ---------- */
function renderQuiz(ctx) {
  if (!ctx.leccion.quiz.length) { renderToc(ctx); return; }
  const preguntas = shuffleArr(ctx.leccion.quiz);
  let qi = 0;
  let aciertos = 0;
  let streak = 0;
  let mejorRacha = 0;
  let resuelta = false;
  let relojId = null;
  let tiempoRestante = QUIZ_TEORIA_DURACION_S;

  function pararReloj() { clearInterval(relojId); relojId = null; }

  function actualizarRelojUI() {
    const fill = qsTL('#tqTimerFill');
    if (!fill) return;
    fill.style.width = `${(tiempoRestante / QUIZ_TEORIA_DURACION_S) * 100}%`;
    fill.className = 'theory-quiz-timer__fill' + (tiempoRestante <= 5 ? ' theory-quiz-timer__fill--rojo' : tiempoRestante <= 12 ? ' theory-quiz-timer__fill--ambar' : '');
  }

  function arrancarReloj() {
    pararReloj();
    tiempoRestante = QUIZ_TEORIA_DURACION_S;
    actualizarRelojUI();
    relojId = setInterval(() => {
      tiempoRestante--;
      actualizarRelojUI();
      if (tiempoRestante <= 0) { pararReloj(); resolver(null); }
    }, 1000);
  }

  function drawPregunta() {
    resuelta = false;
    const p = preguntas[qi];
    const opciones = shuffleArr(p.opciones.map((texto, i) => ({ texto, esCorrecta: i === p.correcta })));
    content_el.innerHTML = `
      <div class="lesson-card__head">
        <h1>${ctx.leccion.titulo} · Quiz</h1>
        <p>Tienes ${QUIZ_TEORIA_DURACION_S}s por pregunta.</p>
      </div>
      <div class="quiz-progress-row">
        <span class="quiz-progress-row__text">Pregunta ${qi + 1}/${preguntas.length}</span>
        <div class="quiz-progress-row__bar"><div class="quiz-progress-row__fill" style="width:${(qi / preguntas.length) * 100}%"></div></div>
        <span class="quiz-progress-row__pass">70% para aprobar</span>
      </div>
      <div class="theory-quiz-timer"><div class="theory-quiz-timer__fill" id="tqTimerFill" style="width:100%;"></div></div>
      <div class="theory-quiz-slide-enter">
        <div class="quiz-question">${p.pregunta}</div>
        <div class="quiz-options" id="tqOptions">
          ${opciones.map((o, i) => `<button class="quiz-option" data-i="${i}"><span class="quiz-option__letter">${QUIZ_LETRAS[i]}</span><span class="quiz-option__text">${o.texto}</span></button>`).join('')}
        </div>
      </div>
      <div class="quiz-feedback" id="tqFeedback"></div>
    `;
    qsTL('#tqOptions').querySelectorAll('.quiz-option').forEach((btn, i) => {
      btn.addEventListener('click', () => resolver(opciones[i].esCorrecta ? btn : null, btn, opciones));
    });
    arrancarReloj();
  }

  function resolver(correctoBtn, clickedBtn, opciones) {
    if (resuelta) return;
    resuelta = true;
    pararReloj();
    const opts = qsTL('#tqOptions') ? qsTL('#tqOptions').querySelectorAll('.quiz-option') : [];
    opts.forEach(o => o.classList.add('disabled'));
    const acerto = !!correctoBtn;

    if (acerto) {
      aciertos++;
      streak++;
      mejorRacha = Math.max(mejorRacha, streak);
      correctoBtn.classList.add('correct');
      const combo = comboMessage(streak);
      if (combo) celebrate(combo);
      qsTL('#tqFeedback').textContent = '¡Correcto!';
    } else {
      streak = 0;
      if (clickedBtn) clickedBtn.classList.add('incorrect', 'quiz-option--shake');
      if (opciones) {
        opts.forEach((o, i) => { if (opciones[i].esCorrecta) o.classList.add('correct'); });
      }
      qsTL('#tqFeedback').textContent = clickedBtn ? 'Casi -mira cuál era la correcta.' : '⏱️ Se acabó el tiempo -mira cuál era la correcta.';
    }

    setTimeout(() => {
      if (qi < preguntas.length - 1) { qi++; drawPregunta(); }
      else drawResultado();
    }, 1500);
  }

  function drawResultado() {
    const pct = Math.round((aciertos / preguntas.length) * 100);
    const pass = pct >= 70;
    marcarTeoriaQuizResultado(ctx.leccion.id, pct, mejorRacha);
    content_el.innerHTML = `
      <div class="quiz-result">
        <span class="eyebrow">${pass ? 'Quiz superado' : 'Casi'}</span>
        <div class="quiz-result__ring" id="tqRing" style="--ring-pct:0; --ring-color:${pass ? '#4ade80' : '#f87171'};">
          <div class="quiz-result__score ${pass ? 'pass' : 'fail'}">${pct}%</div>
        </div>
        <p style="color:var(--gray-400);">${aciertos} de ${preguntas.length} correctas${mejorRacha >= 3 ? ` · 🔥 mejor racha: ${mejorRacha}` : ''}</p>
        <div class="hero__cta" style="justify-content:center; margin-top:1.6rem;">
          <button class="btn btn--primary btn--lg" id="btnQuizRetry">🔁 Reintentar</button>
          <a href="teoria.html?nivel=${ctx.nivel}" class="btn btn--outline">Volver a Conceptos esenciales</a>
        </div>
      </div>
    `;
    // El anillo arranca en 0 y sube al valor real un instante después -si
    // se pinta directo al % final, el navegador no tiene "antes" desde el
    // que transicionar y el anillo aparece ya lleno, sin animación.
    requestAnimationFrame(() => { qsTL('#tqRing').style.setProperty('--ring-pct', pct); });
    qsTL('#btnQuizRetry').addEventListener('click', () => renderQuiz(ctx));
  }

  drawPregunta();
}

async function initTeoriaLeccion() {
  const content = await loadContent();
  const encontrado = buscarLeccionTeoria(content.theoryLessons, TEORIA_LECCION_ID);
  if (!encontrado) {
    content_el.innerHTML = `<p style="text-align:center; color:var(--gray-400); padding:3rem 0;">Lección de teoría no encontrada.</p><div style="text-align:center;"><a href="curriculo.html" class="btn btn--primary">Volver al curso</a></div>`;
    return;
  }
  const ctx = { leccion: encontrado.leccion, nivel: encontrado.nivel, vistas: new Set(), secIdx: null };
  renderToc(ctx);
}

initAuthUI({ protect: true, onReady: initTeoriaLeccion });
