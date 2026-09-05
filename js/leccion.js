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

// Refuerzo del muro de pago por si alguien llega aquí por URL directa,
// saltándose las tarjetas de curriculo.html (que ya lo bloquean antes).
function mostrarBloqueoPremium(onUnlock) {
  if (stepsWrap) stepsWrap.innerHTML = '';
  content.className = 'lesson-card';
  content.innerHTML = `
    <div style="text-align:center; padding:2rem 1rem;">
      <div style="font-size:2.6rem; margin-bottom:1rem;">💎</div>
      <h2 style="margin-bottom:.6rem;">Esto es de la membresía</h2>
      <p style="color:var(--gray-400); max-width:420px; margin:0 auto 1.6rem;">
        El verbo "to be" es gratis para siempre. El resto del currículo se desbloquea con la membresía.
      </p>
      <div style="display:flex; gap:.8rem; justify-content:center; flex-wrap:wrap;">
        <button class="btn btn--primary btn--lg" id="btnGoPremium">Suscribirme</button>
        <a href="curriculo.html" class="btn btn--outline">Volver al curso</a>
      </div>
    </div>`;
  qs('#btnGoPremium').addEventListener('click', () => mostrarMuroPremium(onUnlock));
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
// onStudyClick: si se pasa, el paso "Estudiar" se vuelve clicable desde
// quiz/juego/resumen -volver a estudiar debe estar disponible siempre,
// no solo cuando la lección ya está completa del todo.
function renderSteps(activeKey, doneKeys, onStudyClick) {
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
    const clicable = s.key === 'study' && activeKey !== 'study' && onStudyClick;
    const tag = clicable ? 'button' : 'div';
    return `<${tag} class="lesson-step ${cls} ${clicable ? 'lesson-step--clickable' : ''}" ${clicable ? 'type="button" data-step-study' : ''}><span class="lesson-step__dot">${dot}</span>${s.label}</${tag}>${sep}`;
  }).join('');
  if (onStudyClick) {
    const btn = stepsWrap.querySelector('[data-step-study]');
    if (btn) btn.addEventListener('click', onStudyClick);
  }
}

/* ===========================================================
   ESTUDIAR — carrusel de frases reales (con audio/imagen si existen)
   =========================================================== */
/* ===========================================================
   ESTRUCTURAS VERBALES RESALTADAS (Estudiar) — Nivel 1/2/3 comparten el
   mismo campo tenseRaw (p.ej. "Present continuous", "First Conditional"),
   con la MISMA etiqueta sin importar el idioma del curso -solo cambia la
   frase (translationEn) y qué patrón hace falta para encontrar la
   estructura dentro de ella. No hay analizador gramatical de verdad, son
   patrones por idioma verificados contra el contenido real de los 3
   niveles (inglés y francés, ambos al 99.8-100% de acierto).
   =========================================================== */
function patronesEstructuraEN(esPregunta) {
  const suj = esPregunta ? '(?:\\s+\\S+)?' : '';
  const adv = '(?:\\s+(?:still|also|probably|definitely|really|always|never|often|already|just|now))?';
  // El pronombre/sujeto también se resalta, no solo el auxiliar+verbo -en
  // preguntas ya se colaba dentro del hueco de ${suj}, pero en
  // afirmaciones el sujeto va ANTES del auxiliar ("You have been..."), así
  // que hace falta añadirlo como prefijo opcional en cada patrón.
  const pron = '(?:\\b(?:I|You|He|She|It|We|They)\\b\\s+)?';
  return {
    'Present continuous': new RegExp(`${pron}(?:\\b(?:am|is|are|aren't|isn't)\\b|'m|'re|'s)(?:\\s+not)?${suj}\\s+\\w+ing\\b`, 'gi'),
    'Present perfect': new RegExp(`${pron}(?:\\b(?:have|has|haven't|hasn't)\\b|'ve|'s)${suj}\\s+\\w+\\b`, 'gi'),
    'Past simple': new RegExp(`${pron}\\b(?:did|didn't)\\b${suj}\\s+\\w+\\b|${pron}\\b(?:was|were|wasn't|weren't|could|couldn't)\\b|${pron}\\w+ed\\b`, 'gi'),
    'Future simple': new RegExp(`${pron}\\b(?:will|won't)\\b${suj}\\s+\\w+\\b`, 'gi'),
    'Going to': new RegExp(`${pron}(?:\\b(?:am|is|are|aren't|isn't)\\b|'m|'re|'s)(?:\\s+not)?${suj}\\s+going to\\s+\\w+\\b`, 'gi'),
    'Present simple': new RegExp(`${pron}\\b(?:do|does|don't|doesn't)\\b${suj}\\s+\\w+\\b|${pron}\\b(?:am|is|are|aren't|isn't|can|can't)\\b`, 'gi'),
    'Zero Conditional': /\bif\b/gi,
    'First Conditional': new RegExp(`${pron}\\b(?:will|won't)\\b\\s+\\w+\\b`, 'gi'),
    'Second Conditional': new RegExp(`${pron}\\b(?:would|wouldn't)\\b\\s+\\w+\\b`, 'gi'),
    'Third Conditional': new RegExp(`${pron}\\bwould(?:n't)?\\s+have\\s+\\w+\\b|${pron}\\bhad\\s+\\w+\\b`, 'gi'),
    'Mixed Conditional': new RegExp(`${pron}\\bwould(?:n't)?\\b${adv}\\s+\\w+\\b|${pron}\\bhad(?:n't)?\\b${adv}\\s+\\w+\\b`, 'gi'),
    'Present Perfect Continuous': new RegExp(`${pron}(?:\\b(?:have|has|haven't|hasn't)\\b|'ve|'s)\\s+been\\s+\\w+ing\\b`, 'gi'),
    'Past Perfect': new RegExp(`${pron}\\bhad(?:n't)?\\b${adv}\\s+\\w+\\b`, 'gi'),
    'Future Continuous': new RegExp(`${pron}\\b(?:will|won't)\\b\\s+be\\s+\\w+ing\\b`, 'gi'),
  };
}

// \w en JS es SOLO [A-Za-z0-9_] -no incluye é/è/à/ç/œ etc.-, así que para
// francés hace falta \p{L} (cualquier letra Unicode) + límites de palabra
// a mano con lookaround (\b también se apoya en \w y no es fiable con
// acentos). Verificado contra las 1115 frases reales de los 3 niveles en
// francés: 1113/1115 (99.8%).
const FR_L = '\\p{L}';
const FR_W = `${FR_L}+`;
function frB(inner) { return `(?<!${FR_L})(?:${inner})(?!${FR_L})`; }

function patronesEstructuraFR(esPregunta) {
  // En preguntas por inversión ("A-t-il été...?", "Ont-ils eu...?") el
  // sujeto va pegado con guion justo después del auxiliar, antes del
  // espacio real que separa el auxiliar del verbo.
  const inv = esPregunta ? `(?:-${FR_L}+)*` : '';
  const skip = `(?:\\s+(?:pas|jamais|plus|encore|déjà|toujours|trop|bien|mal|beaucoup|vraiment|souvent))?`;
  const AUX_PC = 'ai|as|a|avons|avez|ont|suis|es|est|sommes|êtes|sont'; // passé composé
  const PRESENTE = 'suis|es|est|sommes|êtes|sont|sois|soit|soyons|soyez|soient|ai|as|a|avons|avez|ont|peux|peut|pouvons|pouvez|peuvent|sais|sait|savons|savez|savent|connais|connait|connaît|connaissons|connaissez|connaissent|veux|veut|voulons|voulez|veulent|dois|doit|devons|devez|doivent|vais|vas|va|allons|allez|vont|fais|fait|faisons|faites|font';
  const PQP = 'avais|avait|avions|aviez|avaient|étais|était|étions|étiez|étaient'; // plus-que-parfait / imparfait de avoir-être
  const CONDPASSE = 'aurais|aurait|aurions|auriez|auraient|serais|serait|serions|seriez|seraient'; // conditionnel passé
  const ALLER = 'vais|vas|va|allons|allez|vont';
  return {
    'Present continuous': new RegExp(`être en train de\\s+${FR_W}|${frB(PRESENTE)}`, 'giu'),
    'Present perfect': new RegExp(`${frB(AUX_PC)}${inv}${skip}\\s+${FR_W}`, 'giu'),
    'Past simple': new RegExp(`${frB(AUX_PC)}${inv}${skip}\\s+${FR_W}|${FR_W}(?:ais|ait|ions|iez|aient)(?!${FR_L})`, 'giu'),
    // A veces se tradujo con "aller + infinitivo" (futuro próximo) en vez
    // de futuro simple de verdad -se acepta también esa forma como buena.
    'Future simple': new RegExp(`${FR_W}r(?:ai|as|a|ons|ez|ont)(?!${FR_L})|${frB(ALLER)}${inv}${skip}\\s+${FR_W}`, 'giu'),
    'Going to': new RegExp(`${frB(ALLER)}${inv}${skip}\\s+${FR_W}`, 'giu'),
    'Present simple': new RegExp(`${frB(PRESENTE)}`, 'giu'),
    'Zero Conditional': /si\b|s['’]/gi,
    'First Conditional': new RegExp(`${FR_W}r(?:ai|as|a|ons|ez|ont)(?!${FR_L})`, 'giu'),
    'Second Conditional': new RegExp(`${FR_W}r(?:ais|ait|ions|iez|aient)(?!${FR_L})|${FR_W}(?:ais|ait|ions|iez|aient)(?!${FR_L})`, 'giu'),
    'Third Conditional': new RegExp(`${frB(CONDPASSE)}${inv}${skip}\\s+${FR_W}|${frB(PQP)}${inv}${skip}\\s+${FR_W}`, 'giu'),
    'Mixed Conditional': new RegExp(`${frB(CONDPASSE)}${inv}${skip}\\s+${FR_W}|${frB(PQP)}${inv}${skip}\\s+${FR_W}`, 'giu'),
    'Present Perfect Continuous': new RegExp(`${frB(PRESENTE)}(?:\\s+depuis\\s+${FR_W})?|${FR_W}(?:e|es|ons|ez|ent)(?!${FR_L})(?:\\s+depuis\\s+${FR_W})?`, 'giu'),
    'Past Perfect': new RegExp(`${frB(PQP)}${inv}${skip}\\s+${FR_W}`, 'giu'),
    'Future Continuous': new RegExp(`${frB('serai|seras|sera|serons|serez|seront')}${inv}\\s+en train d['’]?\\s*${FR_W}`, 'giu'),
  };
}

// Tiempos donde, si ningún patrón encontró nada (afirmación sin ningún
// auxiliar que la delate, p.ej. "She works at a hospital"/"Il voit un
// thérapeute"), se resaltan sujeto+verbo juntos (las 2 primeras palabras)
// como mejor aproximación posible sin analizar la gramática de verdad.
const TIEMPOS_CON_RESPALDO = {
  en: ['Present simple', 'Past simple'],
  fr: ['Present simple', 'Past simple', 'Present continuous', 'Present Perfect Continuous'],
};

function resaltarEstructura(texto, tenseRaw, idiomaCurso) {
  if (!texto || !tenseRaw) return texto || '';
  // Los paquetes no traen curso -su único contenido con texto es inglés,
  // así que sin curso se asume inglés. Alemán/italiano/portugués SÍ traen
  // curso pero no tienen patrones verificados todavía -antes caían por
  // error a los patrones de inglés (resaltando cosas sin sentido en esos
  // idiomas), ahora se dejan sin resaltar hasta hacer el mismo trabajo de
  // verificación que ya se hizo para inglés y francés.
  const idioma = idiomaCurso || 'en';
  if (idioma !== 'en' && idioma !== 'fr') return texto;
  const esPregunta = texto.trim().endsWith('?');
  const generador = idioma === 'fr' ? patronesEstructuraFR : patronesEstructuraEN;
  const patron = generador(esPregunta)[tenseRaw];
  if (!patron) return texto;

  let out = '';
  let last = 0;
  let huboMatch = false;
  let m;
  patron.lastIndex = 0;
  while ((m = patron.exec(texto))) {
    huboMatch = true;
    out += texto.slice(last, m.index);
    out += `<mark class="estructura-verbal">${m[0]}</mark>`;
    last = m.index + m[0].length;
    if (m[0].length === 0) patron.lastIndex++;
  }
  out += texto.slice(last);

  if (!huboMatch && !esPregunta && TIEMPOS_CON_RESPALDO[idioma].includes(tenseRaw)) {
    const partes = texto.split(/(\s+)/);
    let numPalabra = 0, inicio = -1, fin = -1;
    for (let i = 0; i < partes.length; i++) {
      if (partes[i] && !/^\s+$/.test(partes[i])) {
        numPalabra++;
        if (numPalabra === 1) inicio = i;
        if (numPalabra === 2) { fin = i; break; }
      }
    }
    if (inicio !== -1 && fin !== -1) {
      const marcado = partes.slice(inicio, fin + 1).join('');
      return partes.slice(0, inicio).join('') + `<mark class="estructura-verbal">${marcado}</mark>` + partes.slice(fin + 1).join('');
    }
    return texto;
  }

  return out;
}

function renderStudy(ctx) {
  renderSteps('study', []);
  content.className = 'lesson-card lesson-card--study';
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
        <div class="phrase-card__en">${resaltarEstructura(f.en, f.tenseRaw, ctx.content && ctx.content.curso && ctx.content.curso.id)}</div>
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

  if (typeof ofrecerTour === 'function') {
    ofrecerTour('leccion', [
      { selector: '#lessonSteps', titulo: '3 pasos por lección', texto: 'Estudiar → Quiz → Juego. Ahora estás en Estudiar: lee cada frase antes de pasar al quiz.' },
      { selector: '.phrase-card', titulo: 'Escucha la pronunciación real', texto: 'Toca "Escuchar" para oír la frase, o "Más lento" si necesitas oírla más despacio.' },
      { selector: '.lesson-nav', titulo: 'Avanza frase a frase', texto: 'Cuando termines todas las frases de la lección, pasas directo al quiz.' },
    ]);
  }
}

/* ===========================================================
   QUIZ — opción múltiple con distractores reales (mismo verbo,
   otro tiempo verbal), 70% para aprobar, reintentos ilimitados
   =========================================================== */
function distractoresDe(f, distractorPool, poolGlobal, content_, nivel) {
  if (nivel === 2) return buildDistractoresParalelo(f, content_, distractorPool, poolGlobal);
  if (nivel === 1) return buildDistractoresGenerados(f, distractorPool, poolGlobal);
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

const QUIZ_LETRAS = ['A', 'B', 'C', 'D', 'E'];

function renderQuiz(ctx) {
  renderSteps('quiz', ['study'], () => renderStudy(ctx));
  content.className = 'lesson-card lesson-card--quiz';
  let questions = shuffle(buildQuizQuestions(ctx.frases, ctx.distractorPool, ctx.poolGlobal, ctx.content, ctx.nivel));
  let qi = 0;
  let correctCount = 0;
  let answered = false;

  function drawQuestion() {
    const q = questions[qi];
    answered = false;
    content.innerHTML = `
      <button type="button" class="breadcrumb-back" id="btnQuizBack">← Volver a estudiar</button>
      <div class="lesson-card__head">
        <h1>${ctx.titulo} · Quiz</h1>
        <p>Elige la traducción correcta</p>
      </div>
      <div class="quiz-progress-row">
        <span class="quiz-progress-row__text">Pregunta ${qi + 1}/${questions.length}</span>
        <div class="quiz-progress-row__bar"><div class="quiz-progress-row__fill" style="width:${(qi / questions.length) * 100}%"></div></div>
        <span class="quiz-progress-row__pass">70% para aprobar</span>
      </div>
      <div class="quiz-question">${q.es}</div>
      <div class="quiz-options" id="quizOptions">
        ${q.opciones.map((op, i) => `<button class="quiz-option" data-op="${i}"><span class="quiz-option__letter">${QUIZ_LETRAS[i]}</span><span class="quiz-option__text">${op}</span></button>`).join('')}
      </div>
      <div class="quiz-feedback" id="quizFeedback"></div>
    `;
    qs('#btnQuizBack').addEventListener('click', () => renderStudy(ctx));
    qs('#quizOptions').querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const chosen = q.opciones[+btn.dataset.op];
        const opts = qs('#quizOptions').querySelectorAll('.quiz-option');
        opts.forEach(o => o.classList.add('disabled'));
        let texto;
        if (chosen === q.correcta) {
          btn.classList.add('correct');
          correctCount++;
          texto = '¡Correcto!';
        } else {
          btn.classList.add('incorrect');
          opts.forEach((o, i) => { if (q.opciones[i] === q.correcta) o.classList.add('correct'); });
          texto = `La respuesta correcta era: "${q.correcta}"`;
        }
        const esUltima = qi >= questions.length - 1;
        // El usuario decide cuándo seguir -antes avanzaba solo tras un
        // segundo y medio, sin dar tiempo a releer la respuesta correcta
        // las veces que hiciera falta.
        qs('#quizFeedback').innerHTML = `
          <div>${texto}</div>
          <button type="button" class="btn btn--primary" id="btnQuizNext" style="margin-top:1rem;">${esUltima ? 'Ver resultado →' : 'Siguiente →'}</button>
        `;
        qs('#btnQuizNext').addEventListener('click', () => {
          if (qi < questions.length - 1) { qi++; drawQuestion(); }
          else { drawResult(); }
        });
      });
    });
  }

  function drawResult() {
    const pct = Math.round((correctCount / questions.length) * 100);
    const pass = pct >= 70;
    content.innerHTML = `
      <div class="quiz-result">
        <span class="eyebrow">${pass ? 'Aprobado' : 'Casi'}</span>
        <div class="quiz-result__ring" style="--ring-pct:${pct}; --ring-color:${pass ? '#4ade80' : '#f87171'};">
          <div class="quiz-result__score ${pass ? 'pass' : 'fail'}">${pct}%</div>
        </div>
        <p style="color:var(--gray-400); margin-bottom:1.6rem;">${correctCount} de ${questions.length} correctas ${pass ? '· desbloqueaste el juego' : '· necesitas 70% para desbloquear el juego'}</p>
        <div class="hero__cta" style="justify-content:center;">
          <button class="btn ${pass ? 'btn--primary' : 'btn--outline'} btn--lg" id="btnQuizContinue">${pass ? 'Ir al juego →' : 'Reintentar quiz'}</button>
          <button class="btn btn--outline" id="btnQuizBackStudy">📚 Volver a estudiar</button>
        </div>
      </div>
    `;
    qs('#btnQuizBackStudy').addEventListener('click', () => renderStudy(ctx));
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
const GAME_SR_DISPONIBLE = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Contrarreloj de verdad, pero POR FRASE: cada frase tiene sus propios
// 30s para responder, el reloj se reinicia al pasar a la siguiente.
// Fallar (o que se acabe el tiempo de esa frase) no para nada -solo pasa
// a la siguiente frase con el reloj repuesto- y la ronda termina cuando
// se acaba la lista de frases, no por un reloj global de toda la ronda.
const GAME_DURACION_S = 30;

function renderGame(ctx) {
  renderSteps('game', ['study', 'quiz'], () => renderStudy(ctx));
  content.className = 'lesson-card lesson-card--game';
  const frases = shuffle(ctx.frases);
  let idx = 0;
  let streak = 0;
  let aciertos = 0;
  let intentos = 0;
  // Por si el micrófono "existe" pero no reconoce bien ese idioma en
  // concreto (pasa en algunos móviles con idiomas que no son inglés) —
  // sin esto, quien tuviera ese problema se quedaba atascado sin forma
  // de cambiar a escribir la respuesta.
  let modoTexto = false;
  let startTime = Date.now();
  let terminado = false;
  let resuelta = false; // ya se contestó esta frase (bien, mal o por tiempo) -evita doble conteo
  let relojFraseId = null;
  let tiempoFrase = GAME_DURACION_S;

  function pararRelojFrase() { clearInterval(relojFraseId); relojFraseId = null; }

  function actualizarRelojUI() {
    const timerEl = qs('#gameTimer');
    if (timerEl) {
      timerEl.textContent = `${tiempoFrase}s`;
      timerEl.classList.toggle('game-timer--urgente', tiempoFrase <= 10);
    }
  }

  function arrancarRelojFrase() {
    pararRelojFrase();
    tiempoFrase = GAME_DURACION_S;
    actualizarRelojUI();
    relojFraseId = setInterval(() => {
      tiempoFrase--;
      actualizarRelojUI();
      if (tiempoFrase <= 0) { pararRelojFrase(); tiempoAgotado(); }
    }, 1000);
  }

  function tiempoAgotado() {
    if (terminado || resuelta) return;
    resuelta = true;
    intentos++;
    streak = 0;
    cortarMicActivo(); // por si estaba escuchando cuando se acabó el tiempo de esta frase
    const micBtn = qs('#gameMic'); if (micBtn) micBtn.disabled = true;
    const input = qs('#gameInput'); if (input) input.disabled = true;
    const feedback = qs('#gameFeedback');
    if (feedback) feedback.innerHTML = `<div class="game-feedback incorrect">⏱️ Se acabó el tiempo. La respuesta era: <strong>${frases[idx].en}</strong></div>`;
    setTimeout(() => next(), 1600);
  }

  function draw() {
    if (terminado) return;
    resuelta = false;
    startTime = Date.now();
    const f = frases[idx];
    const usarMic = GAME_SR_DISPONIBLE && !modoTexto;
    content.innerHTML = `
      <button type="button" class="breadcrumb-back" id="btnGameBack">← Volver al quiz</button>
      <div class="lesson-card__head">
        <h1>${ctx.titulo} · Juego</h1>
        <p>Tienes ${GAME_DURACION_S}s para cada frase. Fallar no te saca del juego.</p>
      </div>
      <div class="game-topbar">
        <div class="game-timer" id="gameTimer">${GAME_DURACION_S}s</div>
        <div class="game-streak">🔥 Racha: ${streak}</div>
      </div>
      <div class="game-prompt">
        <div class="game-prompt__es">${f.es}</div>
        <div class="game-prompt__hint">${usarMic ? 'Toca el micrófono y di la respuesta en voz alta' : 'Escribe la respuesta'}</div>
      </div>
      ${usarMic ? `
        <div class="game-mic-main">
          <button type="button" class="game-mic-main__btn" id="gameMic">🎤</button>
          <div class="game-mic-main__status" id="gameMicStatus">Toca para hablar</div>
          <div class="game-mic-main__transcript" id="gameTranscript"></div>
        </div>
      ` : `
        <form class="game-input-row" id="gameForm">
          <input type="text" id="gameInput" autocomplete="off" placeholder="Escribe tu respuesta…" autofocus>
          <button class="btn btn--primary" type="submit">Enviar</button>
        </form>
      `}
      <div class="game-feedback" id="gameFeedback"></div>
      ${GAME_SR_DISPONIBLE ? `<button type="button" class="game-mode-toggle" id="btnModoTexto">${usarMic ? '✍️ El micrófono no me reconoce bien, prefiero escribir' : '🎤 Volver a usar el micrófono'}</button>` : ''}
    `;
    qs('#btnGameBack').addEventListener('click', () => { pararRelojFrase(); terminado = true; cortarMicActivo(); renderQuiz(ctx); });
    const btnModoTexto = qs('#btnModoTexto');
    if (btnModoTexto) btnModoTexto.addEventListener('click', () => { modoTexto = !modoTexto; draw(); });
    if (usarMic) setupGameMic(); else {
      qs('#gameForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = qs('#gameInput');
        checkAnswer(f, input.value.trim(), () => { input.disabled = true; qs('#gameForm button').disabled = true; });
      });
    }
    arrancarRelojFrase();
  }

  function setupGameMic() {
    cortarMicActivo(); // por si la pregunta anterior dejó un reconocimiento colgado sin terminar
    const micBtn = qs('#gameMic');
    const statusEl = qs('#gameMicStatus');
    const transcriptEl = qs('#gameTranscript');
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = ctx.speechLang || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let recording = false;
    let micWatchdog = null;
    recognition.onresult = (e) => {
      clearTimeout(micWatchdog);
      const transcript = e.results[0][0].transcript;
      transcriptEl.textContent = `"${transcript}"`;
      checkAnswer(frases[idx], transcript, () => { micBtn.disabled = true; });
    };
    recognition.onstart = () => { statusEl.textContent = 'Escuchando…'; };
    recognition.onerror = (e) => { clearTimeout(micWatchdog); if (recognitionActiva === recognition) recognitionActiva = null; const msg = mensajeErrorMic(e.error); if (msg) showToast(msg); statusEl.textContent = 'Toca para hablar'; };
    recognition.onend = () => { clearTimeout(micWatchdog); if (recognitionActiva === recognition) recognitionActiva = null; recording = false; micBtn.classList.remove('recording'); if (statusEl.textContent === 'Escuchando…') statusEl.textContent = 'Toca para hablar'; };
    micBtn.addEventListener('click', () => {
      if (recording) { recognition.stop(); return; }
      recording = true; micBtn.classList.add('recording'); transcriptEl.textContent = '';
      try {
        recognition.start();
        registrarMicActivo(recognition);
        micWatchdog = vigilarMic(recognition, () => {
          recording = false; micBtn.classList.remove('recording'); statusEl.textContent = 'Toca para hablar';
          showToast('No se detectó nada, inténtalo de nuevo.');
        });
      } catch (err) { recording = false; micBtn.classList.remove('recording'); showToast('No se pudo iniciar el micrófono.'); }
    });
  }

  function checkAnswer(f, value, onAnswered) {
    if (!value || terminado || resuelta) return;
    resuelta = true;
    pararRelojFrase();
    onAnswered();
    const elapsed = (Date.now() - startTime) / 1000;
    const isCorrect = normalizeAnswer(value) === normalizeAnswer(f.en) || isAcceptedAlternate(f.en, value);

    if (isCorrect) {
      intentos++;
      onCorrect(f, elapsed);
    } else {
      streak = 0;
      qs('#gameFeedback').innerHTML = `
        <div class="game-feedback incorrect">La respuesta correcta era: <strong>${f.en}</strong></div>
        <button type="button" class="add-answer-btn" id="btnAddAlt">➕ Añadir "${value}" como respuesta válida</button>
      `;
      // Fallar no saca del juego -se sigue a la siguiente frase sola tras
      // un momento breve para leer la respuesta correcta, salvo que el
      // usuario la marque como válida antes: entonces cuenta como acierto
      // de verdad.
      const avance = setTimeout(() => { intentos++; next(); }, 1600);
      const btnAlt = qs('#btnAddAlt');
      if (btnAlt) btnAlt.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(avance);
        intentos++;
        submitAlternate(f.en, value);
        showToast('Guardado. Esa respuesta ahora se acepta para todos.');
        onCorrect(f, elapsed, true);
      });
    }
  }

  function onCorrect(f, elapsed, viaCorreccion) {
    streak++;
    aciertos++;
    const res = addGamePoints(elapsed);
    touchStreak();
    const combo = comboMessage(streak);
    qs('#gameFeedback').innerHTML = `<div class="game-feedback correct">¡Correcto! +${res.ganados} pts ${viaCorreccion ? '(respuesta añadida)' : ''}</div>`;
    if (f.audio) { const a = new Audio(f.audio); a.play().catch(() => speakText(f.en, 1)); } else { speakText(f.en, 1); }
    if (combo) celebrate(combo);
    if (res.subioDeRango) showToast('🎉 ¡Subiste de rango! +50 pts extra');
    setTimeout(() => next(), viaCorreccion ? 200 : 900);
  }

  function next() {
    if (terminado) return;
    if (idx < frases.length - 1) { idx++; draw(); }
    else { finish(); }
  }

  function finish() {
    if (terminado) return;
    terminado = true;
    pararRelojFrase();
    cortarMicActivo(); // el reloj de la última frase puede acabar con el micro a mitad de escuchar
    ctx.onGameDone();
    if (typeof pushNow === 'function') pushNow();
    content.innerHTML = `
      <div class="quiz-result">
        <span class="eyebrow">¡Ronda completada!</span>
        <div style="font-size:3.4rem; margin:1rem 0;">🎉</div>
        <h2 style="margin-bottom:.6rem;">${aciertos} de ${intentos}</h2>
        <p style="color:var(--gray-400); margin-bottom:1.8rem;">Sigues avanzando por el camino del curso.</p>
        <div class="hero__cta" style="justify-content:center;">
          <a href="curriculo.html" class="btn btn--primary btn--lg">Volver al curso →</a>
          <button class="btn btn--outline" id="btnFinishBackStudy">📚 Volver a estudiar</button>
        </div>
      </div>
    `;
    qs('#btnFinishBackStudy').addEventListener('click', () => renderStudy(ctx));
  }

  draw();
}

/* ===========================================================
   Resumen si la lección ya se completó del todo (permite repasar)
   =========================================================== */
function renderSummary(ctx) {
  renderSteps('game', ['study', 'quiz', 'game'], () => renderStudy(ctx));
  content.className = 'lesson-card';
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
   REPASO — examen acumulativo de varias lecciones ya vistas
   Producción activa (micrófono, igual que el paso Juego), no quiz de
   opción múltiple -un examen de verdad pone a prueba que lo produzcas
   tú solo, no que reconozcas la respuesta entre 4 opciones.
   =========================================================== */
function initRepaso(content_, caminos, encontrado) {
  const { nodo, camino } = encontrado;

  const leccionesPrevias = camino.filter(n => n.tipo === 'leccion').slice(nodo.desde - 1, nodo.hasta);
  const frases = shuffle(leccionesPrevias.map(ln => {
    const frasesLeccion = frasesDeLeccion(content_, ln);
    return frasesLeccion[Math.floor(Math.random() * frasesLeccion.length)];
  }).filter(Boolean));

  if (stepsWrap) stepsWrap.innerHTML = `<div class="lesson-step active"><span class="lesson-step__dot">🔁</span>Repaso acumulativo</div>`;

  let idx = 0;
  let correctCount = 0;
  let modoTexto = false; // por si el micro "existe" pero no reconoce bien ese idioma

  function draw() {
    const f = frases[idx];
    const usarMic = GAME_SR_DISPONIBLE && !modoTexto;
    content.className = 'lesson-card lesson-card--game';
    content.innerHTML = `
      <div class="lesson-card__head"><h1>Repaso acumulativo</h1><p>Verbos/estructuras ${nodo.desde} a ${nodo.hasta}</p></div>
      <div class="quiz-progress-row">
        <span class="quiz-progress-row__text">Frase ${idx + 1}/${frases.length}</span>
        <div class="quiz-progress-row__bar"><div class="quiz-progress-row__fill" style="width:${(idx / frases.length) * 100}%"></div></div>
        <span class="quiz-progress-row__pass">70% para aprobar</span>
      </div>
      <div class="game-prompt">
        <div class="game-prompt__es">${f.es}</div>
        <div class="game-prompt__hint">${usarMic ? 'Toca el micrófono y di la respuesta en voz alta' : 'Escribe la respuesta'}</div>
      </div>
      ${usarMic ? `
        <div class="game-mic-main">
          <button type="button" class="game-mic-main__btn" id="repasoMic">🎤</button>
          <div class="game-mic-main__status" id="repasoMicStatus">Toca para hablar</div>
          <div class="game-mic-main__transcript" id="repasoTranscript"></div>
        </div>
      ` : `
        <form class="game-input-row" id="repasoForm">
          <input type="text" id="repasoInput" autocomplete="off" placeholder="Escribe tu respuesta…" autofocus>
          <button class="btn btn--primary" type="submit">Enviar</button>
        </form>
      `}
      <div class="game-feedback" id="repasoFeedback"></div>
      ${GAME_SR_DISPONIBLE ? `<button type="button" class="game-mode-toggle" id="btnModoTextoRepaso">${usarMic ? '✍️ El micrófono no me reconoce bien, prefiero escribir' : '🎤 Volver a usar el micrófono'}</button>` : ''}
    `;
    const btnModoTexto = qs('#btnModoTextoRepaso');
    if (btnModoTexto) btnModoTexto.addEventListener('click', () => { modoTexto = !modoTexto; draw(); });
    if (usarMic) setupRepasoMic(); else {
      qs('#repasoForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = qs('#repasoInput');
        checkAnswer(f, input.value.trim(), () => { input.disabled = true; qs('#repasoForm button').disabled = true; });
      });
    }
  }

  function setupRepasoMic() {
    cortarMicActivo(); // por si la frase anterior dejó un reconocimiento colgado sin terminar
    const micBtn = qs('#repasoMic');
    const statusEl = qs('#repasoMicStatus');
    const transcriptEl = qs('#repasoTranscript');
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = content_.curso.speechLang || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let recording = false;
    let micWatchdog = null;
    recognition.onresult = (e) => {
      clearTimeout(micWatchdog);
      const transcript = e.results[0][0].transcript;
      transcriptEl.textContent = `"${transcript}"`;
      checkAnswer(frases[idx], transcript, () => { micBtn.disabled = true; });
    };
    recognition.onstart = () => { statusEl.textContent = 'Escuchando…'; };
    recognition.onerror = (e) => { clearTimeout(micWatchdog); if (recognitionActiva === recognition) recognitionActiva = null; const msg = mensajeErrorMic(e.error); if (msg) showToast(msg); statusEl.textContent = 'Toca para hablar'; };
    recognition.onend = () => { clearTimeout(micWatchdog); if (recognitionActiva === recognition) recognitionActiva = null; recording = false; micBtn.classList.remove('recording'); if (statusEl.textContent === 'Escuchando…') statusEl.textContent = 'Toca para hablar'; };
    micBtn.addEventListener('click', () => {
      if (recording) { recognition.stop(); return; }
      recording = true; micBtn.classList.add('recording'); transcriptEl.textContent = '';
      try {
        recognition.start();
        registrarMicActivo(recognition);
        micWatchdog = vigilarMic(recognition, () => {
          recording = false; micBtn.classList.remove('recording'); statusEl.textContent = 'Toca para hablar';
          showToast('No se detectó nada, inténtalo de nuevo.');
        });
      } catch (err) { recording = false; micBtn.classList.remove('recording'); showToast('No se pudo iniciar el micrófono.'); }
    });
  }

  function checkAnswer(f, value, onAnswered) {
    if (!value) return;
    onAnswered();
    const isCorrect = normalizeAnswer(value) === normalizeAnswer(f.en) || isAcceptedAlternate(f.en, value);
    if (isCorrect) {
      correctCount++;
      qs('#repasoFeedback').innerHTML = `
        <div class="game-feedback correct">¡Correcto!</div>
        <div style="text-align:center; margin-top:1rem;"><button class="btn btn--primary" id="btnNextAfterCorrect">Siguiente →</button></div>
      `;
      if (f.audio) { const a = new Audio(f.audio); a.play().catch(() => speakText(f.en, 1)); } else { speakText(f.en, 1); }
      qs('#btnNextAfterCorrect').addEventListener('click', () => next());
    } else {
      qs('#repasoFeedback').innerHTML = `
        <div class="game-feedback incorrect">La respuesta correcta era: <strong>${f.en}</strong></div>
        <button type="button" class="add-answer-btn" id="btnAddAlt">➕ Añadir "${value}" como respuesta válida</button>
        <div style="text-align:center; margin-top:1rem;"><button class="btn btn--outline" id="btnNextAfterFail">Siguiente →</button></div>
      `;
      qs('#btnAddAlt').addEventListener('click', () => {
        submitAlternate(f.en, value);
        showToast('Guardado. Esa respuesta ahora se acepta para todos.');
        qs('#btnAddAlt').remove();
        correctCount++;
        setTimeout(() => next(), 200);
      });
      qs('#btnNextAfterFail').addEventListener('click', () => next());
    }
  }

  function next() {
    if (idx < frases.length - 1) { idx++; draw(); }
    else drawResult();
  }

  function drawResult() {
    cortarMicActivo();
    const pct = Math.round((correctCount / frases.length) * 100);
    const pass = pct >= 70;
    content.className = 'lesson-card';
    content.innerHTML = `
      <div class="quiz-result">
        <span class="eyebrow">${pass ? 'Repaso superado' : 'Casi'}</span>
        <div class="quiz-result__ring" style="--ring-pct:${pct}; --ring-color:${pass ? '#4ade80' : '#f87171'};">
          <div class="quiz-result__score ${pass ? 'pass' : 'fail'}">${pct}%</div>
        </div>
        <p style="color:var(--gray-400); margin-bottom:1.6rem;">${correctCount} de ${frases.length} correctas</p>
        <button class="btn ${pass ? 'btn--primary' : 'btn--outline'} btn--lg" id="btnContinue">${pass ? 'Continuar el camino →' : 'Reintentar'}</button>
      </div>
    `;
    qs('#btnContinue').addEventListener('click', () => {
      if (pass) { marcarRepasoHecho(nodo.id); if (typeof pushNow === 'function') pushNow(); irACurriculo('✅ Repaso superado.'); }
      else { idx = 0; correctCount = 0; draw(); }
    });
  }

  draw();
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
  if (estados[idxEnCamino] === 'premium') { mostrarBloqueoPremium(() => initLeccion(content_, caminos)); return; }

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
  else if (est.estudiado) renderQuiz(ctx);
  else renderStudy(ctx);
}

async function initPaquete(content_, id) {
  const catalogo = content_.pkgCatalog.find(p => p.id === id);
  const frasesRaw = content_.paquetesConFrases[id];
  if (!catalogo || !frasesRaw || !frasesRaw.length) { irACurriculo('Ese paquete todavía no tiene contenido propio.'); return; }
  if (!esPremium()) { mostrarBloqueoPremium(() => initPaquete(content_, id)); return; }

  const ctx = {
    titulo: catalogo.name,
    sub: 'Paquete temático · membresía',
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
  else if (est.estudiado) renderQuiz(ctx);
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
    const estadoRepaso = estadoCamino(camino)[idx];
    if (estadoRepaso === 'bloqueado') { irACurriculo('Ese repaso todavía está bloqueado.'); return; }
    if (estadoRepaso === 'premium') { mostrarBloqueoPremium(() => init()); return; }
    initRepaso(content_, caminos, encontrado);
  }
  else if (TIPO === 'paquete' && ID) initPaquete(content_, ID);
  else irACurriculo('Lección no encontrada.');
}

initAuthUI({ protect: true, onReady: init });
