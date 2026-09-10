/* ===========================================================
   DELPHIS METHOD — LISTA DE LECCIONES DE TEORÍA (teoria.html)
   ?nivel=N -> lista de las lecciones de "Conceptos esenciales" de ese
   nivel (data/theory_lessons.json), como filas .course-row--teoria.
   =========================================================== */
function qsT(sel, root = document) { return root.querySelector(sel); }

const teoriaParams = new URLSearchParams(location.search);
const NIVEL_TEORIA = parseInt(teoriaParams.get('nivel'), 10) || 1;

function renderListaTeoria(content) {
  const lecciones = (content.theoryLessons && content.theoryLessons[`nivel${NIVEL_TEORIA}`]) || [];
  const wrap = document.getElementById('teoriaWrap');
  document.getElementById('teoriaTitulo').textContent = `Nivel ${NIVEL_TEORIA} · Gramática, explicada`;
  document.getElementById('btnHubBack').href = `curriculo.html?nivel=${NIVEL_TEORIA}`;

  if (!lecciones.length) {
    wrap.innerHTML = `<p style="text-align:center; color:var(--gray-400); padding:3rem 0;">Todavía no hay lecciones de teoría para este nivel.</p>`;
    return;
  }

  wrap.innerHTML = lecciones.map(l => {
    const estado = teoriaEstado(l.id);
    const badge = estado.quizAprobado ? '✓ Completada' : estado.vista ? 'Empezada' : '';
    return `
      <a class="course-row course-row--teoria course-row--lg" href="teoria-leccion.html?id=${l.id}">
        <div class="course-row__icon">${estado.quizAprobado ? '✓' : l.emoji}</div>
        <div class="course-row__info">
          <strong>${l.titulo}</strong>
          <span>${l.secciones.length} secciones · ${l.quiz.length} preguntas${estado.mejorPct ? ` · mejor resultado ${estado.mejorPct}%` : ''}</span>
        </div>
        ${badge ? `<span class="course-row__badge">${badge}</span>` : ''}
      </a>
    `;
  }).join('');

  if (typeof ofrecerTour === 'function') {
    ofrecerTour('teoria', [
      { selector: '.course-row--teoria', titulo: 'Lecciones de gramática', texto: 'Cada una tiene varias secciones (regla + ejemplos) y termina con un quiz de opción múltiple, contrarreloj (18s por pregunta).' },
    ]);
  }
}

async function initTeoria() {
  const content = await loadContent();
  renderListaTeoria(content);
}

initAuthUI({ protect: true, onReady: initTeoria });
