/* ===========================================================
   DELPHIS METHOD — REPASO CON REPETICIÓN ESPACIADA (repaso.html)
   =========================================================== */

function qsR(sel, root = document) { return root.querySelector(sel); }

const FALLBACK_DISTRACTORES = ['casa', 'tiempo', 'comida', 'amigo', 'ciudad', 'trabajo', 'familia', 'viaje', 'dinero', 'música', 'puerta', 'camino'];

function relativeTime(ts) {
  const diff = ts - Date.now();
  if (diff <= 0) return 'ahora';
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `en ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `en ${hours} h`;
  const days = Math.round(hours / 24);
  return `en ${days} d`;
}

function renderSummary() {
  const all = srsAllWords();
  const due = srsDueWords();
  const mastered = all.filter(w => w.nivel >= 5).length;
  qsR('#srsSummary').innerHTML = `
    <div class="srs-stat"><span class="srs-stat__icon">📚</span><strong>${all.length}</strong><span>Palabras guardadas</span></div>
    <div class="srs-stat"><span class="srs-stat__icon">⏰</span><strong>${due.length}</strong><span>Por repasar ahora</span></div>
    <div class="srs-stat"><span class="srs-stat__icon">🏆</span><strong>${mastered}</strong><span>Dominadas (nivel 5)</span></div>
    <div class="srs-stat"><span class="srs-stat__icon">✅</span><strong>${progressLoad().statsHoy.aciertos}</strong><span>Aciertos hoy</span></div>
  `;
}

function buildOptions(correct) {
  const all = srsAllWords().map(w => w.es).filter(es => es !== correct);
  const pool = [...new Set([...all, ...FALLBACK_DISTRACTORES])].filter(es => es !== correct);
  const distractores = shuffle(pool).slice(0, 3);
  return shuffle([correct, ...distractores]);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderReviewSession() {
  const area = document.getElementById('srsArea');
  let queue = srsDueWords();

  if (!queue.length) {
    const all = srsAllWords();
    area.innerHTML = `
      <div class="srs-empty">
        <div style="font-size:2.6rem; margin-bottom:1rem;">${all.length ? '✅' : '📖'}</div>
        <h3 style="margin-bottom:.6rem;">${all.length ? 'Nada pendiente por ahora' : 'Todavía no tienes palabras guardadas'}</h3>
        <p style="max-width:420px; margin:0 auto 1.6rem;">
          ${all.length ? 'Vuelve más tarde: tus palabras siguen su propio calendario de repaso.' : 'Ve al libro y toca cualquier palabra que no conozcas para empezar tu lista de repaso.'}
        </p>
        <a href="libro.html" class="btn btn--primary">Ir al libro →</a>
      </div>
    `;
    if (all.length) renderWordList(all);
    return;
  }

  let idx = 0;
  let aciertos = 0;
  const total = queue.length;

  function draw() {
    if (idx >= queue.length) return finish();
    const word = queue[idx];
    const options = buildOptions(word.es);
    let answered = false;

    const LETRAS = ['A', 'B', 'C', 'D', 'E'];
    area.innerHTML = `
      <div class="lesson-card lesson-card--quiz">
        <div class="quiz-progress-row">
          <span class="quiz-progress-row__text">Palabra ${idx + 1}/${total}</span>
          <div class="quiz-progress-row__bar"><div class="quiz-progress-row__fill" style="width:${(idx / total) * 100}%"></div></div>
          <span class="quiz-progress-row__pass">Nivel ${word.nivel}/5</span>
        </div>
        <div class="quiz-question">${word.en}</div>
        <p style="text-align:center; color:var(--gray-500); font-size:.85rem; margin-bottom:1.4rem;">¿Qué significa esta palabra?</p>
        <div class="quiz-options" id="srsOptions">
          ${options.map((op, i) => `<button class="quiz-option" data-op="${i}"><span class="quiz-option__letter">${LETRAS[i]}</span><span class="quiz-option__text">${op}</span></button>`).join('')}
        </div>
        <div class="quiz-feedback" id="srsFeedback"></div>
      </div>
    `;

    qsR('#srsOptions').querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const opts = qsR('#srsOptions').querySelectorAll('.quiz-option');
        opts.forEach(o => o.classList.add('disabled'));
        const correcto = options[+btn.dataset.op] === word.es;
        if (correcto) { btn.classList.add('correct'); aciertos++; }
        else {
          btn.classList.add('incorrect');
          opts.forEach((o, i) => { if (options[i] === word.es) o.classList.add('correct'); });
        }
        const updated = srsReview(word.en, correcto);
        const texto = correcto
          ? `¡Correcto! Subió a nivel ${updated.nivel}/5 — próximo repaso ${relativeTime(updated.proximoRepaso)}.`
          : `Bajó a nivel ${updated.nivel}/5 — volverá pronto (${relativeTime(updated.proximoRepaso)}).`;
        if (correcto) { addGamePoints(4); touchStreak(); }
        // El usuario decide cuándo seguir, para poder releer el
        // resultado las veces que haga falta en vez de que avance solo.
        qsR('#srsFeedback').innerHTML = `<div>${texto}</div><button type="button" class="btn btn--primary" id="btnSrsNext" style="margin-top:1rem;">Siguiente →</button>`;
        qsR('#btnSrsNext').addEventListener('click', () => { idx++; draw(); });
      });
    });
  }

  function finish() {
    if (typeof pushNow === 'function') pushNow();
    const pct = Math.round((aciertos / total) * 100);
    area.innerHTML = `
      <div class="lesson-card">
        <div class="quiz-result">
          <span class="eyebrow">Sesión de repaso completa</span>
          <div class="quiz-result__ring" style="--ring-pct:${pct}; --ring-color:#4ade80;">
            <div class="quiz-result__score pass">${pct}%</div>
          </div>
          <p style="color:var(--gray-400); margin-bottom:1.6rem;">${aciertos} de ${total} correctas</p>
          <button class="btn btn--primary btn--lg" id="btnMore">Ver mi vocabulario</button>
        </div>
      </div>
    `;
    qsR('#btnMore').addEventListener('click', () => { renderSummary(); renderReviewSession(); });
  }

  draw();
}

function renderWordList(words) {
  const area = document.getElementById('srsArea');
  const sorted = [...words].sort((a, b) => a.proximoRepaso - b.proximoRepaso);
  const rows = sorted.map(w => `
    <div class="challenge-item">
      <div class="challenge-item__icon">📌</div>
      <div class="challenge-item__info">
        <strong>${w.en} <span style="color:var(--gray-500); font-weight:500;">— ${w.es}</span></strong>
        <span>Próximo repaso: ${relativeTime(w.proximoRepaso)} · ${w.aciertos} aciertos / ${w.fallos} fallos</span>
        <div class="srs-level-bar">${[0,1,2,3,4].map(i => `<span class="${i < w.nivel ? 'filled' : ''}"></span>`).join('')}</div>
      </div>
    </div>
  `).join('');
  area.insertAdjacentHTML('beforeend', `<div class="challenge-list" style="margin-top:2rem;">${rows}</div>`);
}

initAuthUI({
  protect: true,
  onReady: () => {
    renderSummary();
    renderReviewSession();
  },
});
