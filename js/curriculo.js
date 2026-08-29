/* ===========================================================
   DELPHIS METHOD — RENDER DEL CURRÍCULO REAL (curriculo.html)
   Cada nivel es una lista de lecciones (como un curso de verdad),
   no un mapa de nodos — con 64+90+8 lecciones no cabe como un
   camino serpenteante.
   =========================================================== */

const NIVEL_META = {
  1: { titulo: 'Nivel 1 · Verbos básicos', icono: '🔤', resumen: '64 verbos esenciales en 8 bloques de 8.' },
  2: { titulo: 'Nivel 2 · Estructuras', icono: '🧱', resumen: '8 verbos practicados a fondo en 6 tiempos verbales cada uno.' },
  3: { titulo: 'Nivel 3 · Avanzado', icono: '🎓', resumen: '5 condicionales + 3 tiempos avanzados.' },
};

function nodoIcono(nodo) {
  if (nodo.tipo === 'leccion') return '🔤';
  if (nodo.tipo === 'repaso') return '🔁';
  if (nodo.tipo === 'libro') return '📖';
  return '·';
}

function nodoHref(nodo) {
  if (nodo.tipo === 'leccion') return `leccion.html?tipo=leccion&id=${nodo.id}`;
  if (nodo.tipo === 'repaso') return `leccion.html?tipo=repaso&id=${nodo.id}`;
  if (nodo.tipo === 'libro') return `libro.html?cap=${nodo.capIndex}`;
  return null;
}

function nodoNombre(nodo, content) {
  if (nodo.tipo === 'leccion') return nodo.nombre;
  if (nodo.tipo === 'repaso') return `Repaso acumulativo`;
  if (nodo.tipo === 'libro') return content.bookChapters[nodo.capIndex].titulo;
  return '';
}

function nodoSub(nodo) {
  if (nodo.tipo === 'leccion') return nodo.sub || '';
  if (nodo.tipo === 'repaso') return `Lecciones ${nodo.desde}–${nodo.hasta}`;
  if (nodo.tipo === 'libro') return 'Capítulo del libro · lectura + audio';
  return '';
}

function rowClasses(nodo, estado) {
  const cls = ['course-row'];
  if (nodo.tipo === 'leccion') {
    cls.push(`course-row--${estado}`);
  } else {
    cls.push(`course-row--${nodo.tipo}`);
    if (estado === 'completo') cls.push('course-row--completo');
    if (estado === 'bloqueado') cls.push('course-row--bloqueado');
  }
  return cls.join(' ');
}

function renderRow(nodo, estado, content) {
  const href = estado === 'bloqueado' ? null : nodoHref(nodo);
  const tag = href ? 'a' : 'div';
  const icono = estado === 'completo' ? '✓' : nodoIcono(nodo);
  const badge = estado === 'completo' ? 'Completado' : estado === 'actual' ? 'Continuar' : '';
  const attrs = href ? ` href="${href}"` : ' data-locked="true"';
  return `<${tag} class="${rowClasses(nodo, estado)}"${attrs}>
    <div class="course-row__icon">${icono}</div>
    <div class="course-row__info"><strong>${nodoNombre(nodo, content)}</strong><span>${nodoSub(nodo)}</span></div>
    ${badge ? `<span class="course-row__badge">${badge}</span>` : ''}
  </${tag}>`;
}

function renderCaminoRows(camino, content, nivel) {
  const estados = estadoCamino(camino);
  let html = '';
  let lastGroup = null;
  camino.forEach((nodo, i) => {
    const groupKey = nivel === 1 ? nodo.bloqueId : nivel === 2 ? nodo.parejaId : null;
    if (groupKey && groupKey !== lastGroup) {
      let label, num;
      if (nivel === 1) {
        const bi = content.nivel1.bloques.findIndex(b => b.id === groupKey);
        label = content.nivel1.bloques[bi].nombre; num = bi + 1;
        html += `<div class="course-divider"><span>Bloque ${num}</span><strong>${label}</strong></div>`;
      } else {
        const pi = NIVEL2_PAREJAS.findIndex(p => p.id === groupKey);
        label = NIVEL2_PAREJAS[pi].nombre; num = pi + 1;
        html += `<div class="course-divider"><span>Pareja ${num}</span><strong>${label}</strong></div>`;
      }
      lastGroup = groupKey;
    }
    html += renderRow(nodo, estados[i], content);
  });
  return html;
}

function renderLevelCard(nivel, camino, content, { locked, open }) {
  const meta = NIVEL_META[nivel];
  const estados = estadoCamino(camino);
  const completos = estados.filter(e => e === 'completo').length;
  const pct = camino.length ? Math.round((completos / camino.length) * 100) : 0;

  const card = document.createElement('div');
  card.className = `level-card ${locked ? 'locked' : ''} ${open ? 'open' : ''}`;
  card.innerHTML = `
    <div class="level-card__header">
      <div class="level-card__title">
        <div class="level-card__icon">${meta.icono}</div>
        <div><h3>${meta.titulo}</h3><span>${locked ? 'Se desbloquea al terminar el nivel anterior' : meta.resumen}</span></div>
      </div>
      <div class="level-card__right">
        <div class="level-card__progress">
          <div class="level-card__progress-bar"><div class="level-card__progress-fill" style="width:${pct}%"></div></div>
          <span>${completos} / ${camino.length} · ${pct}%</span>
        </div>
        <svg class="level-card__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
    </div>
    <div class="level-card__body"><div class="level-card__list">${locked ? '' : renderCaminoRows(camino, content, nivel)}</div></div>
  `;

  card.querySelector('.level-card__header').addEventListener('click', () => {
    if (locked) { showToast('Termina el nivel anterior para desbloquear este.'); return; }
    card.classList.toggle('open');
  });

  card.querySelectorAll('[data-locked="true"]').forEach(el => {
    el.addEventListener('click', () => showToast('Se desbloquea completando el paso anterior.'));
  });

  return card;
}

function siguienteGlobal(caminos) {
  if (!nivelCompleto(caminos.nivel1)) return { nodo: siguienteNodoDe(caminos.nivel1) };
  if (!nivelCompleto(caminos.nivel2)) return { nodo: siguienteNodoDe(caminos.nivel2) };
  if (!nivelCompleto(caminos.nivel3)) return { nodo: siguienteNodoDe(caminos.nivel3) };
  return null;
}

function renderContinueBanner(caminos, content) {
  const wrap = document.getElementById('continueBanner');
  if (!wrap) return;
  const sig = siguienteGlobal(caminos);
  if (!sig || !sig.nodo) {
    wrap.innerHTML = `<div class="hero__cta" style="justify-content:center; margin-top:2rem;">
      <span class="btn btn--outline btn--lg">🎉 Terminaste todo el contenido publicado</span>
    </div>`;
    return;
  }
  const href = nodoHref(sig.nodo);
  wrap.innerHTML = `<div class="hero__cta" style="justify-content:center; margin-top:2rem;">
    <a href="${href}" class="btn btn--primary btn--lg">
      Continuar: ${nodoNombre(sig.nodo, content)}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>`;
}

async function initCurriculo() {
  const wrap = document.getElementById('nivelesWrap');
  try {
    const content = await loadContent();
    const caminos = buildCamino(content);

    const eyebrow = document.getElementById('cursoEyebrow');
    if (eyebrow) eyebrow.textContent = `El curso · ${content.curso.bandera} ${content.curso.nombre}`;

    renderContinueBanner(caminos, content);

    const n1Completo = nivelCompleto(caminos.nivel1);
    const n2Completo = nivelCompleto(caminos.nivel2);
    const dev = typeof DEV_MODE !== 'undefined' && DEV_MODE;

    wrap.innerHTML = '';
    wrap.appendChild(renderLevelCard(1, caminos.nivel1, content, { locked: false, open: !n1Completo }));
    wrap.appendChild(renderLevelCard(2, caminos.nivel2, content, { locked: !dev && !n1Completo, open: dev || (n1Completo && !n2Completo) }));
    wrap.appendChild(renderLevelCard(3, caminos.nivel3, content, { locked: !dev && !n2Completo, open: dev || (n1Completo && n2Completo) }));

    const pendingToast = sessionStorage.getItem('delphis_toast');
    if (pendingToast) { sessionStorage.removeItem('delphis_toast'); showToast(pendingToast); }
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `<p style="text-align:center; color:#f87171;">No se pudo cargar el currículo (${e.message}).</p>`;
  }
}

initAuthUI({ protect: true, onReady: initCurriculo });
