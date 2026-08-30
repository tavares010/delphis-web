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

// Foto real de portada por sección: la del primer ejemplo real de su primer
// verbo/estructura (ya viene en los datos, la misma que se ve dentro de la
// lección) -así cada tarjeta ilustra contenido real, no un genérico suelto.
function imagenNivel2(verbo, content) {
  const verboId = slugify(verbo);
  const key = Object.keys(content.nivel2.byVerbTense).find(k => k.startsWith(`${verboId}__`));
  const frases = key && content.nivel2.byVerbTense[key];
  return (frases && frases[0] && frases[0].imagen) || null;
}

// ---------- Secciones de un nivel (bloques / parejas / estructuras) ----------
function seccionesDeNivel(nivel, content) {
  if (nivel === 1) {
    return content.nivel1.bloques.map((b, i) => {
      const primerVerbo = b.verbos[0] && content.nivel1.porVerbo[b.verbos[0].id];
      const imagen = primerVerbo && primerVerbo.frases[0] && primerVerbo.frases[0].imagen;
      return { id: b.id, num: i + 1, nombre: b.nombre, icono: '🔤', imagen: imagen || null };
    });
  }
  if (nivel === 2) {
    return NIVEL2_PAREJAS.map((p, i) => ({
      id: p.id, num: i + 1,
      nombre: p.verbos.map(v => traducirVerbo(v, content.curso.id)).join(' / '),
      icono: '🧱',
      imagen: imagenNivel2(p.verbos[0], content),
    }));
  }
  return content.nivel3.orden.map((id, i) => {
    const est = content.nivel3.porEstructura[id];
    return { id, num: i + 1, nombre: est.nombre, icono: '🎓', imagen: (est.frases[0] && est.frases[0].imagen) || null };
  });
}

// Paleta que se cicla por sección -pura variedad visual, como las
// portadas de color de "Popular Courses" en el UI kit de referencia.
const SECCION_COLORES = [
  ['#60a5fa', '#3b82f6'], ['#c084fc', '#8b5cf6'], ['#fbbf24', '#d97706'],
  ['#4ade80', '#059669'], ['#f472b6', '#e11d48'], ['#5eead4', '#0d9488'],
  ['#fb923c', '#ea580c'], ['#a5b4fc', '#6366f1'],
];

// Portada de tarjeta: foto real (con velo de color de marca encima para que
// el icono/badge se lean bien) si hay imagen, o solo el degradado si no.
function coverStyle(imagen, ca, cb) {
  if (imagen) return `background:linear-gradient(160deg, ${ca}c2, ${cb}8c), url('${imagen}') center/cover;`;
  return `background:linear-gradient(135deg, ${ca}, ${cb});`;
}

// Para cada sección, qué nodos de repaso/libro caen justo después de ella
// en el camino plano (antes de que empiece la sección siguiente) -así el
// examen/capítulo vive DENTRO de su sección, no suelto entre tarjetas.
function extrasPorSeccion(camino, nivel, secciones) {
  const porSeccion = {}; // seccionIndex (0-based) -> [nodo, ...]
  let seccionActual = -1;
  camino.forEach(nodo => {
    if (nodo.tipo === 'leccion') {
      const idx = secciones.findIndex(s => s.id === nodoGroupId(nodo, nivel));
      if (idx > seccionActual) seccionActual = idx;
    } else if (seccionActual >= 0) {
      (porSeccion[seccionActual] ||= []).push(nodo);
    }
  });
  return porSeccion;
}

function seccionCard(seccion, nivel, camino, content, extras) {
  const estados = estadoCamino(camino);
  const idxEnCamino = [];
  camino.forEach((n, i) => { if (n.tipo === 'leccion' && nodoGroupId(n, nivel) === seccion.id) idxEnCamino.push(i); });
  const total = idxEnCamino.length;
  const completos = idxEnCamino.filter(i => estados[i] === 'completo').length;
  const pct = total ? Math.round((completos / total) * 100) : 0;
  const bloqueada = total > 0 && idxEnCamino.every(i => estados[i] === 'bloqueado');
  const href = `curriculo.html?nivel=${nivel}&seccion=${seccion.id}`;
  const [ca, cb] = SECCION_COLORES[(seccion.num - 1) % SECCION_COLORES.length];
  const estadoTxt = completos === total && total > 0 ? 'Completa' : completos > 0 ? 'En curso' : 'Por empezar';
  const tieneExamen = (extras || []).some(n => n.tipo === 'repaso');
  const tieneLibro = (extras || []).some(n => n.tipo === 'libro');
  return `
    <a class="seccion-card ${bloqueada ? 'locked' : ''}" href="${bloqueada ? '#' : href}" data-locked="${bloqueada}">
      <div class="seccion-card__cover" style="${coverStyle(seccion.imagen, ca, cb)}">
        <span class="seccion-card__icon-big">${seccion.icono}</span>
        <span class="seccion-card__num-badge">${String(seccion.num).padStart(2, '0')}</span>
        ${tieneExamen ? '<span class="seccion-card__examen-badge">🔁 Examen</span>' : ''}
      </div>
      <div class="seccion-card__body">
        <h4>${seccion.nombre}</h4>
        <div class="seccion-card__meta-row">
          <span>📚 ${total} lecciones</span>
          <span>✅ ${estadoTxt}</span>
        </div>
        <div class="seccion-card__progress-bar"><div class="seccion-card__progress-fill" style="width:${pct}%; background:linear-gradient(90deg, ${ca}, ${cb});"></div></div>
        <span class="seccion-card__pct">${completos}/${total} · ${pct}%${tieneLibro ? ' · 📖 incluye capítulo' : ''}</span>
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
    const secciones = seccionesDeNivel(n, content);
    const nSecciones = secciones.length;
    const imagen = secciones[0] && secciones[0].imagen;
    return `
      <a class="nivel-card ${locked ? 'locked' : ''}" href="${locked ? '#' : `curriculo.html?nivel=${n}`}" data-locked="${locked}"
         style="--level-a:${meta.a}; --level-b:${meta.b};">
        <div class="nivel-card__cover" style="${coverStyle(imagen, meta.a, meta.b)}">
          <span class="nivel-card__icon-big">${meta.icono}</span>
        </div>
        <div class="nivel-card__body">
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
  const extrasPorSec = extrasPorSeccion(camino, nivel, secciones);

  let html = `
    <a href="curriculo.html" class="breadcrumb-back">← El curso</a>
    <div class="seccion-head-row" style="--level-a:${meta.a}; --level-b:${meta.b};">
      <div class="seccion-head-row__icon">${meta.icono}</div>
      <div><h2>${meta.titulo}</h2><p>Elige una sección para ver sus lecciones -el repaso y el capítulo del libro se estudian dentro de la sección a la que siguen.</p></div>
    </div>
    <div class="seccion-grid">`;
  secciones.forEach((s, i) => { html += seccionCard(s, nivel, camino, content, extrasPorSec[i]); });
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
  const indicesPorNodo = new Map(camino.map((n, i) => [n, i]));
  let rows = '';
  camino.forEach((nodo, i) => {
    if (nodo.tipo === 'leccion' && nodoGroupId(nodo, nivel) === seccionId) rows += renderRow(nodo, estados[i], content, true);
  });
  // El repaso acumulativo y el capítulo del libro que caen justo después de
  // esta sección se estudian AQUÍ, al final de su lista de lecciones -no
  // sueltos entre tarjetas de sección.
  const seccionIdx = secciones.findIndex(s => s.id === seccionId);
  const extras = extrasPorSeccion(camino, nivel, secciones)[seccionIdx] || [];
  let extrasHtml = '';
  extras.forEach(nodo => { extrasHtml += renderRow(nodo, estados[indicesPorNodo.get(nodo)], content, true); });

  wrap.innerHTML = `
    <a href="curriculo.html?nivel=${nivel}" class="breadcrumb-back">← ${meta.titulo.split('·')[0].trim()}</a>
    <div class="seccion-head-row" style="--level-a:${meta.a}; --level-b:${meta.b};">
      <div class="seccion-head-row__icon">${seccion.icono}</div>
      <div><h2>${seccion.nombre}</h2><p>Sección ${seccion.num} · ${meta.titulo}</p></div>
    </div>
    <div class="level-card__list" style="padding:0;">${rows}</div>
    ${extrasHtml ? `<div class="seccion-extras"><span class="seccion-extras__label">Al terminar esta sección</span><div class="level-card__list" style="padding:0;">${extrasHtml}</div></div>` : ''}
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
