/* ===========================================================
   DELPHIS METHOD — LECTOR DEL LIBRO (libro.html), contenido real
   13 capítulos reales de "La Sed" con audio narrado real y
   karaoke por marcas de tiempo reales (data/book_content.json).
   =========================================================== */

function qsL(sel, root = document) { return root.querySelector(sel); }
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

const bookParams = new URLSearchParams(location.search);
let capId = parseInt(bookParams.get('cap'), 10);
if (isNaN(capId)) capId = 0;

const tocList = document.getElementById('tocList');
const readerPanel = document.getElementById('readerPanel');

let CONTENT = null;
let CAMINOS = null;
let flatWords = [];       // {s,e} en el orden de aparición del capítulo actual
let karaokePointer = 0;
let currentAudio = null;

function capituloInfo(capIndex) {
  // La introducción es gratis para todo el mundo, sin importar en qué
  // punto del currículo caiga normalmente su capítulo -si dependiera del
  // recorrido secuencial nunca se podría llegar a ella sin membresía,
  // porque las lecciones de antes en ese camino sí la piden (ver
  // estadoCamino en progress.js, que corta el recorrido en la primera
  // parada de pago).
  if (capIndex === FREE_BOOK_CHAPTER) return { desbloqueado: true, razon: 'ok' };
  for (const nivel of [1, 2, 3]) {
    const camino = CAMINOS[`nivel${nivel}`];
    const idx = camino.findIndex(n => n.tipo === 'libro' && n.capIndex === capIndex);
    if (idx !== -1) {
      if (!nivelDesbloqueado(CAMINOS, nivel)) return { desbloqueado: false, razon: 'progreso' };
      const estado = estadoCamino(camino)[idx];
      if (estado === 'bloqueado') return { desbloqueado: false, razon: 'progreso' };
      if (estado === 'premium') return { desbloqueado: false, razon: 'premium' };
      return { desbloqueado: true, razon: 'ok' };
    }
  }
  return { desbloqueado: false, razon: 'progreso' };
}

function renderToc() {
  tocList.innerHTML = CONTENT.bookChapters.map(cap => {
    const active = cap.index === capId;
    const { desbloqueado, razon } = capituloInfo(cap.index);
    return `
      <div class="book-toc__item ${active ? 'active' : ''} ${desbloqueado ? '' : 'locked'}" data-cap="${cap.index}" data-locked="${!desbloqueado}" data-locked-reason="${razon}">
        <span class="book-toc__num">${cap.index}</span>
        <span>${cap.titulo} ${desbloqueado ? '' : (razon === 'premium' ? '💎' : '🔒')}</span>
      </div>
    `;
  }).join('');

  tocList.querySelectorAll('.book-toc__item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.locked === 'true') {
        if (item.dataset.lockedReason === 'premium') mostrarMuroPremium(() => { renderToc(); renderChapterContent(); });
        else showToast('Este capítulo se desbloquea avanzando en el curso.');
        return;
      }
      location.href = `libro.html?cap=${item.dataset.cap}`;
    });
  });
}

function buildReaderHTML(chapter) {
  let gidx = 0;
  flatWords = [];
  const html = chapter.paragraphs.map(para => {
    const spans = para.map(w => {
      flatWords.push({ s: w.s, e: w.e });
      const span = `<span class="tap-word" data-gidx="${gidx}" data-word="${escapeHtml(w.w)}">${escapeHtml(w.w)}</span>`;
      gidx++;
      return span;
    }).join(' ');
    return `<p>${spans}</p>`;
  }).join('');
  return html;
}

function renderChapterContent() {
  const { desbloqueado, razon } = capituloInfo(capId);
  const chapter = CONTENT.bookChapters[capId];

  if (!chapter || !desbloqueado) {
    const esPremiumWall = chapter && razon === 'premium';
    readerPanel.innerHTML = `
      <div style="text-align:center; padding:3rem 1rem;">
        <div style="font-size:2.6rem; margin-bottom:1rem;">${esPremiumWall ? '💎' : '🔒'}</div>
        <h2 style="margin-bottom:.6rem;">${esPremiumWall ? 'Este capítulo es de la membresía' : 'Este capítulo aún no está disponible'}</h2>
        <p style="color:var(--gray-400); max-width:420px; margin:0 auto;">${esPremiumWall
          ? 'La introducción es gratis para siempre. El resto del libro se desbloquea con la membresía.'
          : 'Se desbloquea avanzando en el currículo del curso.'}</p>
        ${esPremiumWall
          ? `<button class="btn btn--primary" style="margin-top:1.6rem;" id="btnBookPremium">Suscribirme</button>`
          : `<a href="curriculo.html" class="btn btn--primary" style="margin-top:1.6rem;">Ir al curso</a>`}
      </div>`;
    if (esPremiumWall) qsL('#btnBookPremium').addEventListener('click', () => mostrarMuroPremium(() => { renderToc(); renderChapterContent(); }));
    return;
  }

  const paragraphsHtml = buildReaderHTML(chapter);
  const yaLeido = libroLeido(capId);
  const minLectura = Math.max(1, Math.round(chapter.wordCount / 200));

  readerPanel.innerHTML = `
    <h2>${chapter.titulo}</h2>
    <p class="reader-meta">Capítulo ${chapter.index} · ~${minLectura} min de lectura</p>
    <div class="reader-player">
      <button class="reader-player__play" id="btnPlay">▶️ Escuchar</button>
      <button class="reader-player__icon-btn" id="btnPlaySlow" title="Narración lenta" aria-label="Narración lenta">🐢</button>
      <button class="reader-player__icon-btn" id="btnStop" title="Detener" aria-label="Detener">⏹️</button>
      <span class="reader-player__spacer"></span>
      <button class="reader-player__full" id="btnFullscreen">📖 Lectura sin distracciones</button>
    </div>
    <div class="reader-text" id="readerText" lang="${CONTENT.curso.speechLang.split('-')[0]}">${paragraphsHtml}</div>

    <div style="margin-top:2.2rem; display:flex; gap:1rem; flex-wrap:wrap;">
      <button class="btn btn--primary" id="btnFinishChapter" ${yaLeido ? 'disabled style="opacity:.5;"' : ''}>${yaLeido ? '✅ Ya lo marcaste como leído' : '✅ Marcar capítulo como leído'}</button>
      <a href="repaso.html" class="btn btn--outline">🔁 Repasar mi vocabulario</a>
      ${chapter.quizKey !== null ? '<button class="btn btn--outline" id="btnBookQuiz">🧠 Quiz de comprensión</button>' : ''}
    </div>

    <div id="bookQuizArea"></div>

    <div class="chat-preview" id="chatArea">
      <h4>💬 Habla con la IA sobre este capítulo</h4>
      <p style="color:var(--gray-500); font-size:.82rem; margin-bottom:1.2rem;">1 sesión gratis al día. La IA conoce todo lo que ya leíste y los tiempos verbales que ya practicaste.</p>
      <button class="btn btn--outline" id="btnStartChat">Empezar a chatear</button>
    </div>
  `;

  qsL('#btnPlay').addEventListener('click', () => playChapter(chapter, 1));
  qsL('#btnPlaySlow').addEventListener('click', () => playChapter(chapter, 0.65));
  qsL('#btnStop').addEventListener('click', () => stopChapter());
  qsL('#btnFullscreen').addEventListener('click', () => openFullscreen(paragraphsHtml));
  qsL('#btnFinishChapter').addEventListener('click', () => {
    marcarLibroLeido(capId);
    touchStreak();
    if (typeof pushNow === 'function') pushNow();
    showToast('📖 Capítulo marcado como leído.');
    renderToc();
    renderChapterContent();
  });
  if (chapter.quizKey !== null) {
    qsL('#btnBookQuiz').addEventListener('click', () => renderBookQuiz(chapter));
  }
  qsL('#btnStartChat').addEventListener('click', () => startBookChat(chapter));
}

/* ---------- Audio real + karaoke por marcas de tiempo reales ---------- */
function setPlayerActive(rate) {
  const play = qsL('#btnPlay');
  const slow = qsL('#btnPlaySlow');
  if (play) play.classList.toggle('active', rate === 1);
  if (slow) slow.classList.toggle('active', rate === 0.65);
}

function playChapter(chapter, rate) {
  stopChapter();
  karaokePointer = 0;
  currentAudio = new Audio(chapter.audio);
  currentAudio.playbackRate = rate;
  currentAudio.addEventListener('timeupdate', onTimeUpdate);
  currentAudio.addEventListener('ended', () => { clearHighlights(); autoScrollPaused = false; clearTimeout(autoScrollResumeTimer); hideAutoScrollBadge(); setPlayerActive(null); });
  currentAudio.play().catch(() => showToast('No se pudo reproducir el audio.'));
  setPlayerActive(rate);
}

function onTimeUpdate() {
  if (!currentAudio) return;
  const t = currentAudio.currentTime;
  while (karaokePointer < flatWords.length - 1 && flatWords[karaokePointer + 1].s <= t) karaokePointer++;
  highlightWord(karaokePointer);
}

function stopChapter() {
  if (currentAudio) { currentAudio.pause(); currentAudio.removeEventListener('timeupdate', onTimeUpdate); currentAudio = null; }
  clearHighlights();
  autoScrollPaused = false;
  clearTimeout(autoScrollResumeTimer);
  hideAutoScrollBadge();
  setPlayerActive(null);
}

// El auto-scroll del karaoke antes re-centraba la palabra en CADA cambio,
// así que en cuanto el usuario intentaba desplazarse a mano (para releer
// algo o simplemente llegar al botón de Detener) el siguiente tick lo
// devolvía de golpe -en móvil el lector quedaba literalmente inmanipulable.
// Ahora: (1) solo se auto-desplaza si la palabra realmente sale de una
// franja cómoda de lectura, no en cada palabra, y (2) cualquier scroll
// manual real (rueda/touch) lo pausa unos segundos y muestra un aviso
// para retomarlo cuando el usuario quiera.
let autoScrollPaused = false;
let autoScrollResumeTimer = null;
let autoScrollProgrammatic = false;

function pauseAutoScroll() {
  if (!currentAudio) return; // solo tiene sentido mientras suena el karaoke
  autoScrollPaused = true;
  showAutoScrollBadge();
  clearTimeout(autoScrollResumeTimer);
  autoScrollResumeTimer = setTimeout(() => { autoScrollPaused = false; hideAutoScrollBadge(); }, 4000);
}

['wheel', 'touchmove'].forEach(evt => {
  document.addEventListener(evt, () => { if (!autoScrollProgrammatic) pauseAutoScroll(); }, { passive: true });
});

function showAutoScrollBadge() {
  let badge = document.getElementById('autoScrollBadge');
  if (badge) return;
  badge = document.createElement('button');
  badge.id = 'autoScrollBadge';
  badge.type = 'button';
  badge.className = 'auto-scroll-badge';
  badge.textContent = '⏸ Seguimiento pausado — toca para seguir la lectura';
  badge.addEventListener('click', () => { autoScrollPaused = false; clearTimeout(autoScrollResumeTimer); hideAutoScrollBadge(); });
  document.body.appendChild(badge);
}
function hideAutoScrollBadge() {
  const badge = document.getElementById('autoScrollBadge');
  if (badge) badge.remove();
}

function highlightWord(gidx) {
  clearHighlights();
  document.querySelectorAll(`.tap-word[data-gidx="${gidx}"]`).forEach(el => {
    el.classList.add('speaking');
    if (autoScrollPaused) return;
    const rect = el.getBoundingClientRect();
    const comfortTop = window.innerHeight * 0.25;
    const comfortBottom = window.innerHeight * 0.75;
    if (rect.top >= comfortTop && rect.bottom <= comfortBottom) return; // ya está en zona cómoda, no muevas nada
    autoScrollProgrammatic = true;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => { autoScrollProgrammatic = false; }, 600);
  });
}
function clearHighlights() {
  document.querySelectorAll('.tap-word.speaking').forEach(el => el.classList.remove('speaking'));
}

function openFullscreen(paragraphsHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'reader-mode-full';
  overlay.innerHTML = `<button class="reader-mode-full__close" id="btnCloseFull">✕</button><div class="reader-text" lang="${CONTENT.curso.speechLang.split('-')[0]}">${paragraphsHtml}</div>`;
  document.body.appendChild(overlay);
  qsL('#btnCloseFull', overlay).addEventListener('click', () => overlay.remove());
}

/* ---------- Tooltip de traducción al tocar una palabra (IA real) ---------- */
let activeTooltip = null;
function closeTooltip() { if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; } }

document.addEventListener('click', (e) => {
  const word = e.target.closest('.tap-word');
  if (!word) { if (!e.target.closest('.word-tooltip')) closeTooltip(); return; }
  closeTooltip();

  const clean = word.dataset.word.replace(/[.,!?"“”\-']/g, '');
  if (!clean) return;
  const rect = word.getBoundingClientRect();
  const tip = document.createElement('div');
  tip.className = 'word-tooltip';
  tip.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';
  tip.style.top = (rect.bottom + window.scrollY + 8) + 'px';
  tip.innerHTML = `<div>Traduciendo…</div>`;
  document.body.appendChild(tip);
  activeTooltip = tip;
  const despertando = setTimeout(() => {
    if (activeTooltip === tip) tip.innerHTML = `<div>El servidor se está despertando, puede tardar un poco…</div>`;
  }, 5000);

  translateToSpanish(clean).then(result => {
    clearTimeout(despertando);
    if (activeTooltip !== tip) return; // se cerró mientras tanto
    if (!result || result.error || !result.es) {
      tip.innerHTML = `<div>No se pudo traducir ahora mismo.</div>`;
      return;
    }
    tip.innerHTML = `
      <div><strong>${clean}</strong> → ${result.es}</div>
      <button id="tipSpeak">🔊 Escuchar</button>
      <button id="tipSave">➕ Guardar para repasar</button>
    `;
    qsL('#tipSpeak', tip).addEventListener('click', () => speakText(clean, 1));
    qsL('#tipSave', tip).addEventListener('click', () => {
      srsAddWord(clean, result.es);
      registerWordConsulted();
      word.classList.add('saved');
      showToast(`"${clean}" guardada para repaso.`);
      closeTooltip();
    });
  });
});

/* ---------- Quiz de comprensión lectora (real, book_quiz_bank.json) ---------- */
function renderBookQuiz(chapter) {
  const preguntas = CONTENT.bookQuiz[chapter.quizKey];
  const area = document.getElementById('bookQuizArea');
  let qi = 0, correctCount = 0, answered = false;

  function drawQuestion() {
    const q = preguntas[qi];
    answered = false;
    const LETRAS = ['A', 'B', 'C', 'D', 'E'];
    area.innerHTML = `
      <div class="lesson-card lesson-card--quiz" style="margin-top:1.6rem;">
        <div class="quiz-progress-row">
          <span class="quiz-progress-row__text">Pregunta ${qi + 1}/${preguntas.length}</span>
          <div class="quiz-progress-row__bar"><div class="quiz-progress-row__fill" style="width:${(qi / preguntas.length) * 100}%"></div></div>
          <span class="quiz-progress-row__pass">Comprensión</span>
        </div>
        <div class="quiz-question">${q.question}</div>
        <div class="quiz-options" id="bqOptions">
          ${q.options.map((op, i) => `<button class="quiz-option" data-i="${i}"><span class="quiz-option__letter">${LETRAS[i]}</span><span class="quiz-option__text">${op}</span></button>`).join('')}
        </div>
      </div>
    `;
    qsL('#bqOptions').querySelectorAll('.quiz-option').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const opts = qsL('#bqOptions').querySelectorAll('.quiz-option');
        opts.forEach(o => o.classList.add('disabled'));
        if (i === q.correctIndex) { btn.classList.add('correct'); correctCount++; }
        else { btn.classList.add('incorrect'); opts[q.correctIndex].classList.add('correct'); }
        setTimeout(() => { if (qi < preguntas.length - 1) { qi++; drawQuestion(); } else drawResult(); }, 1200);
      });
    });
  }

  function drawResult() {
    const pct = Math.round((correctCount / preguntas.length) * 100);
    area.innerHTML = `
      <div class="lesson-card" style="margin-top:1.6rem;">
        <div class="quiz-result">
          <span class="eyebrow">Quiz de comprensión</span>
          <div class="quiz-result__ring" style="--ring-pct:${pct}; --ring-color:${pct >= 70 ? '#4ade80' : '#f87171'};">
            <div class="quiz-result__score ${pct >= 70 ? 'pass' : 'fail'}">${pct}%</div>
          </div>
          <p style="color:var(--gray-400);">${correctCount} de ${preguntas.length} correctas</p>
        </div>
      </div>
    `;
    if (pct >= 70) { addGamePoints(4); touchStreak(); }
  }

  drawQuestion();
  area.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ---------- Chat con IA sobre el libro (real, backend desplegado) ---------- */
const CHAT_LIMIT_KEY = 'delphis_book_chat_limit_v1';

function chatLimitState() {
  const today = todayStr();
  let s;
  try { s = JSON.parse(localStorage.getItem(CHAT_LIMIT_KEY)); } catch (e) { s = null; }
  if (!s || s.fecha !== today) s = { fecha: today, usada: false };
  return s;
}
function chatLimitMarkUsed() {
  const s = chatLimitState(); s.usada = true;
  localStorage.setItem(CHAT_LIMIT_KEY, JSON.stringify(s));
}

function verbosPracticados() {
  const data = curriculumLoad();
  const nombres = new Set();
  Object.keys(data.lecciones || {}).forEach(id => {
    if (!data.lecciones[id].quizAprobado) return;
    if (id.startsWith('n1-')) {
      const verbId = id.replace('n1-', '');
      if (CONTENT.nivel1.porVerbo[verbId]) nombres.add(CONTENT.nivel1.porVerbo[verbId].verbo);
    } else if (id.startsWith('n2-')) {
      // ids: n2-<verbo>-<tiempo>-<parte> — nos quedamos solo con el nombre del verbo
      const verbId = id.replace('n2-', '').split('-').slice(0, -2).join('-');
      const match = Object.keys(CONTENT.nivel2.byVerbTense).find(k => k.startsWith(`${verbId}__`));
      if (match) nombres.add(verbId.replace(/-/g, ' '));
    } else if (id.startsWith('n3-')) {
      const structId = id.replace('n3-', '');
      if (CONTENT.nivel3.porEstructura[structId]) nombres.add(CONTENT.nivel3.porEstructura[structId].nombre);
    }
  });
  return [...nombres];
}

function textoLeidoHasta(capIndexMax) {
  let texto = '';
  for (let i = 0; i <= capIndexMax; i++) {
    const cap = CONTENT.bookChapters[i];
    if (!cap) continue;
    texto += cap.paragraphs.map(p => p.map(w => w.w).join(' ')).join('\n\n') + '\n\n';
  }
  return texto.slice(-6000);
}

function startBookChat(chapter) {
  if (chatLimitState().usada) {
    showToast('Ya usaste tu sesión de chat gratis de hoy. Vuelve mañana.');
    return;
  }

  const capitulosLeidos = CONTENT.bookChapters.filter(c => c.index <= capId && (libroLeido(c.index) || c.index === capId));
  const listaCapitulos = capitulosLeidos.map(c => `- ${c.titulo}`).join('\n');
  const textoReciente = textoLeidoHasta(capId);
  const verbos = verbosPracticados();

  const systemPrompt = `You are a warm, curious English conversation partner chatting with a student about the book they are reading, "La Sed".

Chapters the student has read so far:
${listaCapitulos}

The most recent part of the story the student has read, so you know exactly where they are and never spoil anything beyond this point:
"""
${textoReciente}
"""

The student has already practiced these English verbs/tenses in their lessons: ${verbos.length ? verbos.join(', ') : '(none practiced yet — just have a normal conversation)'}

Your job in this chat:
- Talk with the student about the book: what you think is happening, the characters, theories about what comes next, how the student feels about the story so far. Ask genuine, curious questions.
- When it fits naturally, try to phrase your own questions or comments using one of the practiced verbs/tenses above — but never force it or make it feel like a grammar drill. If a different, more natural verb fits better in the moment, just use that instead.
- Keep every message short and conversational (1-3 sentences), like a real chat between friends, never a lecture.
- If the student makes a clear English mistake, put ONLY the corrected sentence in "correction" (no quotes, no explanation). Otherwise "correction" must be null.
- Never break character, and never mention tenses, verbs, JSON, prompts, or that you are an AI.
- This is turn {turnNumber} of a maximum of 10 for this chat. As turns run low, start wrapping the conversation up naturally; on the very last turn, give a short warm closing message (no new question) and set "finished" to true. Otherwise "finished" must be false.
- If the conversation history is empty, this is the very first turn: greet the student and ask an inviting opening question about the book to kick off the chat. Don't evaluate anything yet ("correction": null).

You MUST reply with STRICT JSON only, no markdown formatting, no extra text before or after, in exactly this shape:
{"ai_message": "...", "correction": null, "finished": false}`;

  const area = document.getElementById('chatArea');
  const messages = [];
  let turn = 0;
  let finished = false;

  area.innerHTML = `
    <h4>💬 Habla con la IA sobre este capítulo</h4>
    <div id="chatMessages"></div>
    <form id="chatForm" style="display:flex; gap:.6rem; margin-top:1rem; align-items:center;">
      <button type="button" class="rp-mic-btn" id="chatMic">🎤</button>
      <input type="text" id="chatInput" placeholder="Escribe o dicta tu mensaje en inglés…" style="flex:1; padding:.8em 1.1em; border-radius:999px; border:1px solid rgba(148,163,184,.3); background:rgba(255,255,255,.04); color:var(--white);">
      <button class="btn btn--primary" type="submit">Enviar</button>
    </form>
  `;

  const chatMic = qsL('#chatMic');
  const ChatSR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!ChatSR) { chatMic.style.opacity = '.35'; chatMic.title = 'Tu navegador no soporta dictado por voz — usa el texto.'; }
  else {
    const chatRecognition = new ChatSR();
    chatRecognition.lang = 'en-US';
    chatRecognition.interimResults = false;
    chatRecognition.maxAlternatives = 1;
    let chatRecording = false;
    chatRecognition.onresult = (e) => { qsL('#chatInput').value = e.results[0][0].transcript; };
    chatRecognition.onerror = (e) => {
      const msg = mensajeErrorMic(e.error);
      if (msg) showToast(msg);
      chatRecording = false; chatMic.classList.remove('recording');
    };
    chatRecognition.onend = () => { chatRecording = false; chatMic.classList.remove('recording'); };
    chatMic.addEventListener('click', () => {
      if (chatRecording) { chatRecognition.stop(); return; }
      chatRecording = true; chatMic.classList.add('recording');
      try { chatRecognition.start(); } catch (err) { chatRecording = false; chatMic.classList.remove('recording'); showToast('No se pudo iniciar el micrófono.'); }
    });
  }

  function addBubble(role, text) {
    const div = document.createElement('div');
    div.className = `chat-bubble chat-bubble--${role === 'assistant' ? 'ai' : 'user'}`;
    div.textContent = text;
    qsL('#chatMessages').appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  function addSystemNote(text) {
    const div = document.createElement('div');
    div.style.cssText = 'text-align:center; color:var(--gray-500); font-size:.78rem; margin:.6rem 0;';
    div.textContent = text;
    qsL('#chatMessages').appendChild(div);
  }

  async function sendTurn(userText) {
    if (userText) { messages.push({ role: 'user', content: userText }); addBubble('user', userText); }
    else { messages.push({ role: 'user', content: '(The user has just opened the chat about the book. Begin now.)' }); }

    turn++;
    addSystemNote('La IA está escribiendo… (puede tardar si el servidor estaba dormido)');
    const { text, error } = await callAI(systemPrompt.replace('{turnNumber}', turn), messages);
    qsL('#chatMessages').lastChild.remove();

    if (error) {
      addSystemNote(error === 'timeout' ? 'El servidor está despertando, intenta de nuevo en unos segundos.' : 'Sin conexión con el servidor de IA ahora mismo.');
      return;
    }
    const parsed = parseAIJson(text);
    if (!parsed) { addBubble('assistant', (text || '').trim()); return; }

    messages.push({ role: 'assistant', content: text });
    addBubble('assistant', parsed.ai_message);
    speakText(parsed.ai_message, 1);
    if (parsed.correction) addSystemNote(`💡 Mejor así: "${parsed.correction}"`);
    if (parsed.finished) {
      finished = true;
      chatLimitMarkUsed();
      qsL('#chatForm').style.display = 'none';
      addSystemNote('Sesión de chat terminada por hoy. ¡Vuelve mañana!');
    }
  }

  qsL('#chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (finished) return;
    const input = qsL('#chatInput');
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    sendTurn(val);
  });

  sendTurn(null);
}

/* ---------- Init ---------- */
async function init() {
  CONTENT = await loadContent();
  if (!CONTENT.libroDisponible) {
    document.getElementById('readerPanel').innerHTML = `
      <div style="text-align:center; padding:3rem 1rem;">
        <div style="font-size:2.6rem; margin-bottom:1rem;">📖</div>
        <h2 style="margin-bottom:.6rem;">"La Sed" todavía no está traducido a ${CONTENT.curso.nombre.toLowerCase()}</h2>
        <p style="color:var(--gray-400); max-width:440px; margin:0 auto;">Por ahora el libro solo existe en el curso de inglés. Mientras tanto, sigue practicando el currículo de ${CONTENT.curso.nombre.toLowerCase()}.</p>
        <a href="curriculo.html" class="btn btn--primary" style="margin-top:1.6rem;">Ir al curso →</a>
      </div>`;
    document.getElementById('tocList').innerHTML = `<p style="color:var(--gray-500); font-size:.82rem;">Próximamente en ${CONTENT.curso.nombre.toLowerCase()}.</p>`;
    return;
  }
  CAMINOS = buildCamino(CONTENT);
  renderToc();
  renderChapterContent();
}

initAuthUI({ protect: true, onReady: init });
