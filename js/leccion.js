/* ===========================================================
   DELPHIS METHOD — MOTOR DE LECCIÓN (leccion.html), datos reales
   Funciona para Nivel 1 (verbos), Nivel 2 (estructuras), Nivel 3
   (avanzado), paquetes y repasos acumulativos — todo data-driven
   desde js/data.js + js/curriculo-builder.js.
   =========================================================== */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function qs(sel, root = document) { return root.querySelector(sel); }

const params = new URLSearchParams(location.search);
const TIPO = params.get('tipo');
const ID = params.get('id');
const content = document.getElementById('lessonContent');
const stepsWrap = document.getElementById('lessonSteps');

function irACurriculo(msg) {
  if (msg) sessionStorage.setItem('delphis_toast', msg);
  location.href = 'curriculo.html';
}

function flashToastFromSession() {
  const msg = sessionStorage.getItem('delphis_toast');
  if (msg) { sessionStorage.removeItem('delphis_toast'); showToast(msg); }
}

/* ===========================================================
   Localizar el nodo pedido dentro del currículo real
   =========================================================== */
function encontrarNodoLeccionOoRepaso(caminos, tipoBuscado, id) {
  for (const nivel of [1, 2, 3]) {
    const camino = caminos[`nivel${nivel}`];
    const idx = camino.findIndex(n => n.tipo === tipoBuscado && n.id === id);
    if (idx !== -1) return { nodo: camino[idx], camino, nivel, idx };
  }
  return null;
}

/* ===========================================================
   Indicador de pasos
   =========================================================== */
function renderSteps(activeKey, doneKeys) {
  if (!stepsWrap) return;
  const steps = [
    { key: 'study', label: 'Estudiar', icon: '📚' },
    { key: 'quiz', label: 'Quiz', icon: '✅' },
    { key: 'game', label: 'Juego', icon: '🎮' },
  ];
  stepsWrap.innerHTML = steps.map((s, i) => {
    const cls = doneKeys.includes(s.key) ? 'done' : (s.key === activeKey ? 'active' : '');
    const dot = doneKeys.includes(s.key) ? '✓' : (i + 1);
    const sep = i < steps.length - 1 ? '<span class="lesson-step-sep"></span>' : '';
    return `<div class="lesson-step ${cls}"><span class="lesson-step__dot">${dot}</span>${s.label}</div>${sep}`;
  }).join('');
}

/* ===========================================================
   ESTUDIAR — carrusel de frases reales (con audio/imagen si existen)
   =========================================================== */
function renderStudy(ctx) {
  renderSteps('study', []);
  let idx = 0;
  const frases = ctx.frases;
  let audioEl = null;

  function draw() {
    if (audioEl) { audioEl.pause(); audioEl = null; }
    const f = frases[idx];
    content.innerHTML = `
      <div class="lesson-card__head">
        <h1>${ctx.titulo}</h1>
        <p>${ctx.sub}</p>
      </div>
      <div class="study-progress">
        <span>Frase ${idx + 1} de ${frases.length}</span>
        <div class="study-progress__bar"><div class="study-progress__fill" style="width:${((idx + 1) / frases.length) * 100}%"></div></div>
      </div>
      <div class="phrase-card">
        ${f.imagen ? `<img class="phrase-card__img" src="${f.imagen}" alt="" loading="lazy">` : ''}
        ${f.tiempo ? `<span class="phrase-card__tense">${f.tiempo}</span>` : ''}
        <div class="phrase-card__es">${f.es}</div>
        <div class="phrase-card__en">${f.en}</div>
        <div class="phrase-card__audio">
          <button class="audio-btn" id="btnAudioNorm">🔊 Escuchar</button>
          <button class="audio-btn audio-btn--slow" id="btnAudioSlow">🐢 Más lento</button>
        </div>
      </div>
      <div class="lesson-nav">
        <button class="btn btn--outline" id="btnPrev" ${idx === 0 ? 'disabled style="opacity:.4;pointer-events:none;"' : ''}>← Anterior</button>
        <button class="btn btn--primary" id="btnNext">${idx === frases.length - 1 ? 'Ir al quiz →' : 'Siguiente →'}</button>
      </div>
    `;
    function play(rate) {
      if (f.audio) {
        if (!audioEl) audioEl = new Audio(f.audio);
        audioEl.playbackRate = rate;
        audioEl.currentTime = 0;
        audioEl.play().catch(() => speakText(f.en, rate));
      } else {
        speakText(f.en, rate);
      }
    }
    qs('#btnAudioNorm').addEventListener('click', () => play(1));
    qs('#btnAudioSlow').addEventListener('click', () => play(0.65));
    qs('#btnPrev').addEventListener('click', () => { idx = Math.max(0, idx - 1); draw(); });
    qs('#btnNext').addEventListener('click', () => {
      if (idx < frases.length - 1) { idx++; draw(); }
      else { ctx.onStudyDone(); renderQuiz(ctx); }
    });
  }
  draw();
}

/* ===========================================================
   QUIZ — opción múltiple con distractores reales (mismo verbo,
   otro tiempo verbal), 70% para aprobar, reintentos ilimitados
   =========================================================== */
function distractoresDe(f, distractorPool, poolGlobal, content_, nivel) {
  if (nivel === 2) return buildDistractoresParalelo(f, content_, distractorPool, poolGlobal);
  if (nivel === 1) return buildDistractoresConfusion(f, distractorPool, poolGlobal, x => x.tenseRaw, TENSE_CONFUSION);
  if (nivel === 3) return buildDistractoresConfusion(f, distractorPool, poolGlobal, x => x.estructuraRaw, ESTRUCTURA_CONFUSION);
  return buildDistractores(f, distractorPool, poolGlobal);
}

function buildQuizQuestions(frases, distractorPool, poolGlobal, content_, nivel) {
  return frases.map(f => ({
    es: f.es,
    correcta: f.en,
    opciones: shuffle([f.en, ...distractoresDe(f, distractorPool, poolGlobal, content_, nivel)]),
  }));
}

function renderQuiz(ctx) {
  renderSteps('quiz', ['study']);
  let questions = shuffle(buildQuizQuestions(ctx.frases, ctx.distractorPool, ctx.poolGlobal, ctx.content, ctx.nivel));
  let qi = 0;
  let correctCount = 0;
  let answered = false;

  function drawQuestion() {
    const q = questions[qi];
    answered = false;
    content.innerHTML = `
      <div class="lesson-card__head">
        <h1>${ctx.titulo} · Quiz</h1>
        <p>Elige la traducción correcta</p>
      </div>
      <div class="quiz-progress-row">
        <span>Pregunta ${qi + 1} de ${questions.length}</span>
        <span>Necesitas 70% para aprobar</span>
      </div>
      <div class="quiz-question">${q.es}</div>
      <div class="quiz-options" id="quizOptions">
        ${q.opciones.map((op, i) => `<button class="quiz-option" data-op="${i}">${op}</button>`).join('')}
      </div>
      <div class="quiz-feedback" id="quizFeedback"></div>
    `;
    qs('#quizOptions').querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const chosen = btn.textContent;
        const opts = qs('#quizOptions').querySelectorAll('.quiz-option');
        opts.forEach(o => o.classList.add('disabled'));
        if (chosen === q.correcta) {
          btn.classList.add('correct');
          correctCount++;
          qs('#quizFeedback').textContent = '¡Correcto!';
        } else {
          btn.classList.add('incorrect');
          opts.forEach(o => { if (o.textContent === q.correcta) o.classList.add('correct'); });
          qs('#quizFeedback').textContent = `La respuesta correcta era: "${q.correcta}"`;
        }
        setTimeout(() => {
          if (qi < questions.length - 1) { qi++; drawQuestion(); }
          else { drawResult(); }
        }, 1300);
      });
    });
  }

  function drawResult() {
    const pct = Math.round((correctCount / questions.length) * 100);
    const pass = pct >= 70;
    content.innerHTML = `
      <div class="quiz-result">
        <span class="eyebrow">${pass ? 'Aprobado' : 'Casi'}</span>
        <div class="quiz-result__score ${pass ? 'pass' : 'fail'}">${pct}%</div>
        <p style="color:var(--gray-400); margin-bottom:1.6rem;">${correctCount} de ${questions.length} correctas ${pass ? '· desbloqueaste el juego' : '· necesitas 70% para desbloquear el juego'}</p>
        <button class="btn ${pass ? 'btn--primary' : 'btn--outline'} btn--lg" id="btnQuizContinue">${pass ? 'Ir al juego →' : 'Reintentar quiz'}</button>
      </div>
    `;
    qs('#btnQuizContinue').addEventListener('click', () => {
      if (pass) { ctx.onQuizPass(); renderGame(ctx); }
      else { questions = shuffle(buildQuizQuestions(ctx.frases, ctx.distractorPool, ctx.poolGlobal, ctx.content, ctx.nivel)); qi = 0; correctCount = 0; drawQuestion(); }
    });
  }

  drawQuestion();
}

/* ===========================================================
   JUEGO — producción activa, sin pistas, contrarreloj
   Corrección aceptada vía Firebase Realtime Database real y
   compartida con la app móvil (js/accepted-answers.js).
   =========================================================== */
function renderGame(ctx) {
  renderSteps('game', ['study', 'quiz']);
  const frases = shuffle(ctx.frases);
  let idx = 0;
  let streak = 0;
  let startTime = Date.now();

  function draw() {
    startTime = Date.now();
    const f = frases[idx];
    content.innerHTML = `
      <div class="lesson-card__head">
        <h1>${ctx.titulo} · Juego</h1>
        <p>Produce la respuesta tú solo. Sin pistas.</p>
      </div>
      <div class="game-topbar">
        <span style="font-size:.82rem; color:var(--gray-400);">Frase ${idx + 1} de ${frases.length}</span>
        <div class="game-streak">🔥 Racha: ${streak}</div>
      </div>
      <div class="game-prompt">
        <div class="game-prompt__es">${f.es}</div>
        <div class="game-prompt__hint">Di la respuesta en voz alta (o escríbela)</div>
      </div>
      <form class="game-input-row" id="gameForm">
        <button type="button" class="rp-mic-btn" id="gameMic">🎤</button>
        <input type="text" id="gameInput" autocomplete="off" placeholder="Escribe tu respuesta…" autofocus>
        <button class="btn btn--primary" type="submit">Enviar</button>
      </form>
      <div class="game-feedback" id="gameFeedback"></div>
    `;
    qs('#gameForm').addEventListener('submit', (e) => {
      e.preventDefault();
      checkAnswer(f);
    });
    setupGameMic();
  }

  function setupGameMic() {
    const micBtn = qs('#gameMic');
    if (!micBtn) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { micBtn.style.opacity = '.35'; micBtn.title = 'Tu navegador no soporta dictado por voz — usa el texto.'; return; }
    const recognition = new SR();
    recognition.lang = ctx.speechLang || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let recording = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const input = qs('#gameInput');
      if (input) input.value = transcript;
      checkAnswer(frases[idx]);
    };
    recognition.onend = () => { recording = false; micBtn.classList.remove('recording'); };
    micBtn.addEventListener('click', () => {
      if (recording) { recognition.stop(); return; }
      recording = true; micBtn.classList.add('recording');
      recognition.start();
    });
  }

  function checkAnswer(f) {
    const input = qs('#gameInput');
    const value = input.value.trim();
    if (!value) return;
    const elapsed = (Date.now() - startTime) / 1000;
    const isCorrect = normalizeAnswer(value) === normalizeAnswer(f.en) || isAcceptedAlternate(f.en, value);

    input.disabled = true;
    qs('#gameForm').querySelectorAll('button').forEach(b => { b.disabled = true; });

    if (isCorrect) {
      onCorrect(f, elapsed);
    } else {
      streak = 0;
      qs('#gameFeedback').innerHTML = `
        <div class="game-feedback incorrect">La respuesta correcta era: <strong>${f.en}</strong></div>
        <button type="button" class="add-answer-btn" id="btnAddAlt">➕ Añadir "${value}" como respuesta válida</button>
        <div style="text-align:center; margin-top:1rem;"><button class="btn btn--outline" id="btnNextAfterFail">Siguiente →</button></div>
      `;
      qs('#btnAddAlt').addEventListener('click', () => {
        submitAlternate(f.en, value);
        showToast('Guardado. Esa respuesta ahora se acepta para todos.');
        qs('#btnAddAlt').remove();
        onCorrect(f, elapsed, true);
      });
      qs('#btnNextAfterFail').addEventListener('click', () => next());
    }
  }

  function onCorrect(f, elapsed, viaCorreccion) {
    streak++;
    const res = addGamePoints(elapsed);
    touchStreak();
    const combo = comboMessage(streak);
    qs('#gameFeedback').innerHTML = `<div class="game-feedback correct">¡Correcto! +${res.ganados} pts ${viaCorreccion ? '(respuesta añadida)' : ''}</div>`;
    if (f.audio) { const a = new Audio(f.audio); a.play().catch(() => speakText(f.en, 1)); } else { speakText(f.en, 1); }
    if (combo) celebrate(combo);
    if (res.subioDeRango) showToast('🎉 ¡Subiste de rango! +50 pts extra');
    setTimeout(() => next(), viaCorreccion ? 200 : 1400);
  }

  function next() {
    if (idx < frases.length - 1) { idx++; draw(); }
    else { finish(); }
  }

  function finish() {
    ctx.onGameDone();
    if (typeof pushNow === 'function') pushNow();
    content.innerHTML = `
      <div class="quiz-result">
        <span class="eyebrow">Lección completada</span>
        <div style="font-size:3.4rem; margin:1rem 0;">🎉</div>
        <h2 style="margin-bottom:.6rem;">${ctx.titulo} · listo</h2>
        <p style="color:var(--gray-400); margin-bottom:1.8rem;">Sigues avanzando por el camino del curso.</p>
        <a href="curriculo.html" class="btn btn--primary btn--lg">Volver al curso →</a>
      </div>
    `;
  }

  draw();
}

/* ===========================================================
   Resumen si la lección ya se completó del todo (permite repasar)
   =========================================================== */
function renderSummary(ctx) {
  renderSteps('game', ['study', 'quiz', 'game']);
  content.innerHTML = `
    <div class="quiz-result">
      <span class="eyebrow">Ya completado</span>
      <div style="font-size:3rem; margin:1rem 0;">✅</div>
      <h2 style="margin-bottom:.6rem;">${ctx.titulo}</h2>
      <p style="color:var(--gray-400); margin-bottom:1.8rem;">Puedes repasarlo cuando quieras.</p>
      <div class="hero__cta" style="justify-content:center;">
        <button class="btn btn--outline" id="btnReStudy">📚 Repasar estudio</button>
        <button class="btn btn--outline" id="btnReQuiz">✅ Repetir quiz</button>
        <button class="btn btn--primary" id="btnReGame">🎮 Jugar de nuevo</button>
      </div>
    </div>
  `;
  qs('#btnReStudy').addEventListener('click', () => renderStudy(ctx));
  qs('#btnReQuiz').addEventListener('click', () => renderQuiz(ctx));
  qs('#btnReGame').addEventListener('click', () => renderGame(ctx));
}

/* ===========================================================
   REPASO — quiz acumulativo de varias lecciones ya vistas
   =========================================================== */
function initRepaso(content_, caminos, encontrado) {
  const { nodo, camino } = encontrado;

  const leccionesPrevias = camino.filter(n => n.tipo === 'leccion').slice(nodo.desde - 1, nodo.hasta);
  const frasesRepaso = leccionesPrevias.map(ln => {
    const frases = frasesDeLeccion(content_, ln);
    return frases[Math.floor(Math.random() * frases.length)];
  }).filter(Boolean);
  const nivelRepaso = camino === caminos.nivel1 ? 1 : camino === caminos.nivel2 ? 2 : 3;
  const poolGlobal = poolGlobalDeNivel(content_, nivelRepaso);

  if (stepsWrap) stepsWrap.innerHTML = `<div class="lesson-step active"><span class="lesson-step__dot">🔁</span>Repaso acumulativo</div>`;

  let questions = shuffle(buildQuizQuestions(frasesRepaso, frasesRepaso, poolGlobal, content_, nivelRepaso));
  let qi = 0, correctCount = 0, answered = false;

  function drawQuestion() {
    const q = questions[qi];
    answered = false;
    content.innerHTML = `
      <div class="lesson-card__head"><h1>Repaso acumulativo</h1><p>Verbos/estructuras ${nodo.desde} a ${nodo.hasta}</p></div>
      <div class="quiz-progress-row"><span>Pregunta ${qi + 1} de ${questions.length}</span><span>Necesitas 70% para aprobar</span></div>
      <div class="quiz-question">${q.es}</div>
      <div class="quiz-options" id="quizOptions">
        ${q.opciones.map(op => `<button class="quiz-option">${op}</button>`).join('')}
      </div>
      <div class="quiz-feedback" id="quizFeedback"></div>
    `;
    qs('#quizOptions').querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const chosen = btn.textContent;
        const opts = qs('#quizOptions').querySelectorAll('.quiz-option');
        opts.forEach(o => o.classList.add('disabled'));
        if (chosen === q.correcta) { btn.classList.add('correct'); correctCount++; qs('#quizFeedback').textContent = '¡Correcto!'; }
        else {
          btn.classList.add('incorrect');
          opts.forEach(o => { if (o.textContent === q.correcta) o.classList.add('correct'); });
          qs('#quizFeedback').textContent = `La respuesta correcta era: "${q.correcta}"`;
        }
        setTimeout(() => { if (qi < questions.length - 1) { qi++; drawQuestion(); } else drawResult(); }, 1300);
      });
    });
  }

  function drawResult() {
    const pct = Math.round((correctCount / questions.length) * 100);
    const pass = pct >= 70;
    content.innerHTML = `
      <div class="quiz-result">
        <span class="eyebrow">${pass ? 'Repaso superado' : 'Casi'}</span>
        <div class="quiz-result__score ${pass ? 'pass' : 'fail'}">${pct}%</div>
        <p style="color:var(--gray-400); margin-bottom:1.6rem;">${correctCount} de ${questions.length} correctas</p>
        <button class="btn ${pass ? 'btn--primary' : 'btn--outline'} btn--lg" id="btnContinue">${pass ? 'Continuar el camino →' : 'Reintentar'}</button>
      </div>
    `;
    qs('#btnContinue').addEventListener('click', () => {
      if (pass) { marcarRepasoHecho(nodo.id); if (typeof pushNow === 'function') pushNow(); irACurriculo('✅ Repaso superado.'); }
      else { questions = shuffle(buildQuizQuestions(frasesRepaso, frasesRepaso, poolGlobal, content_, nivelRepaso)); qi = 0; correctCount = 0; drawQuestion(); }
    });
  }

  drawQuestion();
}

/* ===========================================================
   INIT
   =========================================================== */
async function initLeccion(content_, caminos) {
  const encontrado = encontrarNodoLeccionOoRepaso(caminos, 'leccion', ID);
  if (!encontrado) { irACurriculo('Lección no encontrada.'); return; }
  const { nodo, camino, nivel } = encontrado;

  if (!nivelDesbloqueado(caminos, nivel)) { irACurriculo(`Termina el Nivel ${nivel - 1} para desbloquear esto.`); return; }
  const estados = estadoCamino(camino);
  const idxEnCamino = camino.indexOf(nodo);
  if (estados[idxEnCamino] === 'bloqueado') { irACurriculo('Esa lección todavía está bloqueada.'); return; }

  const frases = frasesDeLeccion(content_, nodo);
  const distractorPool = distractorPoolDeLeccion(content_, nodo);
  const poolGlobal = poolGlobalDeNivel(content_, nivel);

  const ctx = {
    titulo: nodo.nombre,
    sub: nodo.sub || `Nivel ${nivel}`,
    frases, distractorPool, poolGlobal,
    content: content_, nivel,
    speechLang: content_.curso.speechLang,
    onStudyDone: () => marcarLeccionEstudiada(nodo.id),
    onQuizPass: () => marcarLeccionQuizAprobado(nodo.id),
    onGameDone: () => marcarLeccionJugada(nodo.id),
  };

  const est = leccionEstado(nodo.id);
  if (est.jugado) renderSummary(ctx);
  else if (est.quizAprobado) renderGame(ctx);
  else renderStudy(ctx);
}

async function initPaquete(content_, id) {
  const catalogo = content_.pkgCatalog.find(p => p.id === id);
  const frasesRaw = content_.paquetesConFrases[id];
  if (!catalogo || !frasesRaw || !frasesRaw.length) { irACurriculo('Ese paquete todavía no tiene contenido propio.'); return; }

  const ctx = {
    titulo: catalogo.name,
    sub: 'Paquete temático · acceso libre',
    frases: frasesRaw,
    distractorPool: frasesRaw,
    poolGlobal: frasesRaw.map(f => f.en),
    speechLang: content_.curso.speechLang,
    onStudyDone: () => marcarPaqueteEstudiado(id),
    onQuizPass: () => marcarPaqueteQuizAprobado(id),
    onGameDone: () => marcarPaqueteJugado(id),
  };

  const est = paqueteEstado(id);
  if (est.jugado) renderSummary(ctx);
  else if (est.quizAprobado) renderGame(ctx);
  else renderStudy(ctx);
}

async function init() {
  const content_ = await loadContent();
  const caminos = buildCamino(content_);

  flashToastFromSession();

  if (TIPO === 'leccion' && ID) initLeccion(content_, caminos);
  else if (TIPO === 'repaso' && ID) {
    const encontrado = encontrarNodoLeccionOoRepaso(caminos, 'repaso', ID);
    if (!encontrado) { irACurriculo('Repaso no encontrado.'); return; }
    const { nivel, camino, idx } = encontrado;
    if (!nivelDesbloqueado(caminos, nivel)) { irACurriculo(`Termina el Nivel ${nivel - 1} primero.`); return; }
    if (estadoCamino(camino)[idx] === 'bloqueado') { irACurriculo('Ese repaso todavía está bloqueado.'); return; }
    initRepaso(content_, caminos, encontrado);
  }
  else if (TIPO === 'paquete' && ID) initPaquete(content_, ID);
  else irACurriculo('Lección no encontrada.');
}

initAuthUI({ protect: true, onReady: init });
