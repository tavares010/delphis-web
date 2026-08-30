/* ===========================================================
   DELPHIS METHOD — RENDER DEL CURRÍCULO REAL (curriculo.html)
   Navegación en 3 pasos, como un curso de verdad: Curso -> Nivel ->
   Sección -> Lecciones. Nada de mostrar 64+ lecciones de golpe.
   Estado en la URL (?nivel=&seccion=) para que atrás/adelante del
   navegador funcionen y los enlaces se puedan compartir.
   =========================================================== */

const NIVEL_META = {
  1: { titulo: 'Nivel 1 · Verbos básicos', icono: '🔤', resumen: '64 verbos esenciales en 8 bloques de 8.', a: '#2563eb', b: '#38bdf8' },
  2: { titulo: 'Nivel 2 · Estructuras', icono: '🧱', resumen: '8 verbos practicados a fondo en 6 tiempos verbales cada uno.', a: '#7c3aed', b: '#c084fc' },
  3: { titulo: 'Nivel 3 · Avanzado', icono: '🎓', resumen: '5 condicionales + 3 tiempos avanzados.', a: '#d97706', b: '#fbbf24' },
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

function nodoGroupId(nodo, nivel) {
  if (nivel === 1) return nodo.bloqueId;
  if (nivel === 2) return nodo.parejaId;
  if (nivel === 3) return nodo.verboId; // en Nivel 3 cada estructura ES su propia sección
  return null;
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

function renderRow(nodo, estado, content, big) {
  const href = estado === 'bloqueado' ? null : nodoHref(nodo);
  const tag = href ? 'a' : 'div';
  const icono = estado === 'completo' ? '✓' : nodoIcono(nodo);
  const badge = estado === 'completo' ? 'Completado' : estado === 'actual' ? 'Continuar' : '';
  const attrs = href ? ` href="${href}"` : ' data-locked="true"';
  return `<${tag} class="${rowClasses(nodo, estado)} ${big ? 'course-row--lg' : ''}"${attrs}>
    <div class="course-row__icon">${icono}</div>
    <div class="course-row__info"><strong>${nodoNombre(nodo, content)}</strong><span>${nodoSub(nodo)}</span></div>
    ${badge ? `<span class="course-row__badge">${badge}</span>` : ''}
  </${tag}>`;
}

// ---------- Secciones de un nivel (bloques / parejas / estructuras) ----------
function seccionesDeNivel(nivel, content) {
  if (nivel === 1) {
    return content.nivel1.bloques.map((b, i) => ({ id: b.id, num: i + 1, nombre: b.nombre, icono: '🔤' }));
  }
  if (nivel === 2) {
    return NIVEL2_PAREJAS.map((p, i) => ({
      id: p.id, num: i + 1,
      nombre: p.verbos.map(v => traducirVerbo(v, content.curso.id)).join(' / '),
      icono: '🧱',
    }));
  }
  return content.nivel3.orden.map((id, i) => ({
    id, num: i + 1, nombre: content.nivel3.porEstructura[id].nombre, icono: '🎓',
  }));
}

function seccionCard(seccion, nivel, camino, content) {
  const estados = estadoCamino(camino);
  const idxEnCamino = [];
  camino.forEach((n, i) => { if (n.tipo === 'leccion' && nodoGroupId(n, nivel) === seccion.id) idxEnCamino.push(i); });
  const total = idxEnCamino.length;
  const completos = idxEnCamino.filter(i => estados[i] === 'completo').length;
  const pct = total ? Math.round((completos / total) * 100) : 0;
  const bloqueada = total > 0 && idxEnCamino.every(i => estados[i] === 'bloqueado');
  const href = `curriculo.html?nivel=${nivel}&seccion=${seccion.id}`;
  return `
    <a class="seccion-card ${bloqueada ? 'locked' : ''}" href="${bloqueada ? '#' : href}" data-locked="${bloqueada}">
      <div class="seccion-card__top">
        <div class="seccion-card__icon">${seccion.icono}</div>
        <span class="seccion-card__num">${String(seccion.num).padStart(2, '0')}</span>
      </div>
      <h4>${seccion.nombre}</h4>
      <div class="seccion-card__foot">
        <div class="seccion-card__progress-bar"><div class="seccion-card__progress-fill" style="width:${pct}%"></div></div>
        <span>${completos}/${total} lecciones</span>
      </div>
    </a>`;
}

function renderSummaryStrip(caminos, content) {
  const wrap = document.getElementById('courseSummaryStrip');
  if (!wrap) return;
  const totalLecciones = ['nivel1', 'nivel2', 'nivel3'].reduce((acc, k) => acc + caminos[k].filter(n => n.tipo === 'leccion').length, 0);
  const totalRepasos = ['nivel1', 'nivel2', 'nivel3'].reduce((acc, k) => acc + caminos[k].filter(n => n.tipo === 'repaso').length, 0);
  const items = [
    `🎓 3 niveles`,
    `🔤 ${totalLecciones} lecciones`,
    `🔁 ${totalRepasos} repasos acumulativos`,
  ];
  if (content.libroDisponible) items.push(`📖 "La Sed" · ${content.bookChapters.length} capítulos`);
  wrap.innerHTML = items.map(t => `<span>${t}</span>`).join('');
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

function bindLocked(root) {
  root.querySelectorAll('[data-locked="true"]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); showToast('Se desbloquea completando el paso anterior.'); });
  });
}

// ---------- PASO 1: niveles ----------
function renderVistaNiveles(wrap, caminos, content, { n1Completo, n2Completo, dev }) {
  document.getElementById('continueBanner').style.display = '';
  document.getElementById('courseSummaryStrip').style.display = '';
  renderContinueBanner(caminos, content);
  renderSummaryStrip(caminos, content);

  const niveles = [
    { n: 1, camino: caminos.nivel1, locked: false },
    { n: 2, camino: caminos.nivel2, locked: !dev && !n1Completo },
    { n: 3, camino: caminos.nivel3, locked: !dev && !n2Completo },
  ];

  wrap.innerHTML = `<div class="nivel-grid">${niveles.map(({ n, camino, locked }) => {
    const meta = NIVEL_META[n];
    const estados = estadoCamino(camino);
    const completos = estados.filter(e => e === 'completo').length;
    const pct = camino.length ? Math.round((completos / camino.length) * 100) : 0;
    const nLecciones = camino.filter(x => x.tipo === 'leccion').length;
    const nSecciones = seccionesDeNivel(n, content).length;
    return `
      <a class="nivel-card ${locked ? 'locked' : ''}" href="${locked ? '#' : `curriculo.html?nivel=${n}`}" data-locked="${locked}"
         style="--level-a:${meta.a}; --level-b:${meta.b};">
        <div class="nivel-card__icon">${meta.icono}</div>
        <h3>${meta.titulo}</h3>
        <p>${locked ? 'Se desbloquea al terminar el nivel anterior' : meta.resumen}</p>
        <div class="nivel-card__meta">
          <span>📚 ${nSecciones} secciones</span>
          <span>🔤 ${nLecciones} lecciones</span>
        </div>
        <div class="nivel-card__progress-bar"><div class="nivel-card__progress-fill" style="width:${pct}%"></div></div>
        <div class="nivel-card__foot"><span>${completos}/${camino.length} · ${pct}%</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </a>`;
  }).join('')}</div>`;
  bindLocked(wrap);
}

// ---------- PASO 2: secciones de un nivel ----------
function renderVistaSecciones(wrap, nivel, caminos, content) {
  document.getElementById('continueBanner').style.display = 'none';
  document.getElementById('courseSummaryStrip').style.display = 'none';
  const camino = caminos[`nivel${nivel}`];
  const meta = NIVEL_META[nivel];
  const secciones = seccionesDeNivel(nivel, content);

  // Nodos de repaso/libro en su posición real dentro del camino plano -se
  // listan como filas sueltas entre las tarjetas de sección a las que
  // siguen, sin romper el orden pedagógico original.
  const estados = estadoCamino(camino);
  const extras = []; // { afterSeccionIndex, html }
  let seccionesVistas = 0;
  camino.forEach((nodo, i) => {
    if (nodo.tipo === 'leccion') {
      const gid = nodoGroupId(nodo, nivel);
      const idx = secciones.findIndex(s => s.id === gid);
      if (idx + 1 > seccionesVistas) seccionesVistas = idx + 1;
    } else {
      extras.push({ afterSeccion: seccionesVistas, html: renderRow(nodo, estados[i], content) });
    }
  });

  let html = `
    <a href="curriculo.html" class="breadcrumb-back">← El curso</a>
    <div class="seccion-head-row" style="--level-a:${meta.a}; --level-b:${meta.b};">
      <div class="seccion-head-row__icon">${meta.icono}</div>
      <div><h2>${meta.titulo}</h2><p>Elige una sección para ver sus lecciones.</p></div>
    </div>
    <div class="seccion-grid">`;
  secciones.forEach((s, i) => {
    html += seccionCard(s, nivel, camino, content);
    extras.filter(e => e.afterSeccion === i + 1).forEach(e => { html += e.html; });
  });
  html += `</div>`;
  wrap.innerHTML = html;
  bindLocked(wrap);
}

// ---------- PASO 3: lecciones de una sección ----------
function renderVistaLecciones(wrap, nivel, seccionId, caminos, content) {
  document.getElementById('continueBanner').style.display = 'none';
  document.getElementById('courseSummaryStrip').style.display = 'none';
  const camino = caminos[`nivel${nivel}`];
  const meta = NIVEL_META[nivel];
  const secciones = seccionesDeNivel(nivel, content);
  const seccion = secciones.find(s => s.id === seccionId);
  if (!seccion) { wrap.innerHTML = `<p style="text-align:center; color:var(--gray-400); padding:3rem 0;">Sección no encontrada.</p>`; return; }

  const estados = estadoCamino(camino);
  let rows = '';
  camino.forEach((nodo, i) => {
    if (nodo.tipo === 'leccion' && nodoGroupId(nodo, nivel) === seccionId) rows += renderRow(nodo, estados[i], content, true);
  });

  wrap.innerHTML = `
    <a href="curriculo.html?nivel=${nivel}" class="breadcrumb-back">← ${meta.titulo.split('·')[0].trim()}</a>
    <div class="seccion-head-row" style="--level-a:${meta.a}; --level-b:${meta.b};">
      <div class="seccion-head-row__icon">${seccion.icono}</div>
      <div><h2>${seccion.nombre}</h2><p>Sección ${seccion.num} · ${meta.titulo}</p></div>
    </div>
    <div class="level-card__list" style="padding:0;">${rows}</div>
  `;
  bindLocked(wrap);
}

async function initCurriculo() {
  const wrap = document.getElementById('nivelesWrap');
  try {
    const content = await loadContent();
    const caminos = buildCamino(content);

    const eyebrow = document.getElementById('cursoEyebrow');
    if (eyebrow) eyebrow.textContent = `El curso · ${content.curso.bandera} ${content.curso.nombre}`;

    const n1Completo = nivelCompleto(caminos.nivel1);
    const n2Completo = nivelCompleto(caminos.nivel2);
    const dev = typeof DEV_MODE !== 'undefined' && DEV_MODE;

    function render() {
      const params = new URLSearchParams(location.search);
      const nivel = parseInt(params.get('nivel'), 10);
      const seccion = params.get('seccion');

      if (!nivel) { renderVistaNiveles(wrap, caminos, content, { n1Completo, n2Completo, dev }); return; }
      const locked = nivel === 2 ? (!dev && !n1Completo) : nivel === 3 ? (!dev && !n2Completo) : false;
      if (locked) {
        sessionStorage.setItem('delphis_toast', 'Termina el nivel anterior para desbloquear este.');
        history.replaceState(null, '', 'curriculo.html');
        renderVistaNiveles(wrap, caminos, content, { n1Completo, n2Completo, dev });
        return;
      }
      if (seccion) renderVistaLecciones(wrap, nivel, seccion, caminos, content);
      else renderVistaSecciones(wrap, nivel, caminos, content);
      window.scrollTo({ top: 0 });
    }

    render();
    window.addEventListener('popstate', render);
    // Los enlaces de sección/nivel usan href normal (recarga) salvo que
    // en el futuro se quiera SPA-navegar sin recargar -de momento, simple
    // y fiable: cada clic es una navegación real, el estado vive en la URL.

    const pendingToast = sessionStorage.getItem('delphis_toast');
    if (pendingToast) { sessionStorage.removeItem('delphis_toast'); showToast(pendingToast); }
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `<p style="text-align:center; color:#f87171;">No se pudo cargar el currículo (${e.message}).</p>`;
  }
}

initAuthUI({ protect: true, onReady: initCurriculo });
