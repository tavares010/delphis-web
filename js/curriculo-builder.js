/* ===========================================================
   DELPHIS METHOD — CONSTRUCTOR DEL CAMINO (currículo real)
   A partir del contenido cargado (js/data.js), arma la secuencia
   plana de cada nivel: lección -> lección -> ... repaso cada 5,
   con capítulos del libro intercalados en puntos fijos.
   =========================================================== */

function chunkFrases(frases, tam = 8) {
  if (!frases.length) return [];
  const partes = Math.max(1, Math.round(frases.length / tam));
  const porParte = Math.ceil(frases.length / partes);
  const out = [];
  for (let i = 0; i < frases.length; i += porParte) out.push(frases.slice(i, i + porParte));
  return out;
}

// Inserta nodos de repaso cada `reviewEvery` lecciones y nodos de libro en los
// puntos indicados (afterIndex = después de completar la N-ésima lección,
// contando solo lecciones, 1-indexado).
function interleave(lessonNodes, { reviewEvery, chapterInsertions, prefix }) {
  const out = [];
  let sinceReview = 0;
  let leccionCount = 0;
  const byIndex = {};
  chapterInsertions.forEach(c => { (byIndex[c.afterIndex] ||= []).push(c.capIndex); });

  lessonNodes.forEach((node) => {
    out.push(node);
    leccionCount++;
    sinceReview++;
    if (sinceReview >= reviewEvery) {
      out.push({ tipo: 'repaso', id: `${prefix}-repaso-${leccionCount}`, desde: leccionCount - reviewEvery + 1, hasta: leccionCount });
      sinceReview = 0;
    }
    if (byIndex[leccionCount]) {
      byIndex[leccionCount].forEach(capIndex => out.push({ tipo: 'libro', id: `libro-cap-${capIndex}`, capIndex }));
    }
  });
  return out;
}

function nivelDesbloqueado(caminos, nivel) {
  if (typeof DEV_MODE !== 'undefined' && DEV_MODE) return true;
  if (nivel === 1) return true;
  if (nivel === 2) return nivelCompleto(caminos.nivel1);
  if (nivel === 3) return nivelCompleto(caminos.nivel2);
  return false;
}

function buildCamino(content) {
  // ---------- NIVEL 1 ----------
  const n1Lessons = content.nivel1.orden.map((verbId, i) => {
    const bloque = content.nivel1.bloques[Math.floor(i / 8)];
    return {
      tipo: 'leccion', nivel: 1, tipoLeccion: 'verbo',
      id: `n1-${verbId}`, verboId: verbId,
      nombre: content.nivel1.porVerbo[verbId].verbo,
      sub: bloque.nombre, bloqueId: bloque.id,
    };
  });
  const nivel1 = interleave(n1Lessons, {
    reviewEvery: 5,
    chapterInsertions: content.libroDisponible
      ? [{ afterIndex: 2, capIndex: 0 }, { afterIndex: 8, capIndex: 1 }, { afterIndex: 24, capIndex: 2 }, { afterIndex: 48, capIndex: 3 }]
      : [],
    prefix: 'n1',
  });

  // ---------- NIVEL 2 ----------
  const n2Lessons = [];
  NIVEL2_PAREJAS.forEach(pareja => {
    const parejaNombre = pareja.verbos.map(v => traducirVerbo(v, content.curso.id)).join(' / ');
    pareja.verbos.forEach(verbo => {
      const verbId = slugify(verbo);
      const verboLocal = traducirVerbo(verbo, content.curso.id);
      Object.keys(TENSE_ES).forEach(tenseRaw => {
        const key = `${verbId}__${tenseRaw}`;
        const frases = content.nivel2.byVerbTense[key] || [];
        if (!frases.length) return;
        const partes = chunkFrases(frases, 8);
        partes.forEach((frasesParte, pi) => {
          n2Lessons.push({
            tipo: 'leccion', nivel: 2, tipoLeccion: 'estructura',
            id: `n2-${verbId}-${slugify(tenseRaw)}-${pi + 1}`,
            verboId: verbId, tenseRaw,
            frases: frasesParte,
            nombre: `${verboLocal} · ${TENSE_ES[tenseRaw]}`,
            sub: partes.length > 1 ? `Parte ${pi + 1} de ${partes.length}` : parejaNombre,
            parejaId: pareja.id,
          });
        });
      });
    });
  });
  const nivel2 = interleave(n2Lessons, {
    reviewEvery: 5,
    chapterInsertions: content.libroDisponible
      ? [4, 5, 6, 7, 8].map((capIndex, i) => ({ afterIndex: Math.round((i + 1) * n2Lessons.length / 6), capIndex }))
      : [],
    prefix: 'n2',
  });

  // ---------- NIVEL 3 ----------
  const n3Lessons = content.nivel3.orden.map(id => ({
    tipo: 'leccion', nivel: 3, tipoLeccion: 'avanzado',
    id: `n3-${id}`, verboId: id,
    nombre: content.nivel3.porEstructura[id].nombre,
    sub: 'Nivel 3 · Avanzado',
  }));
  const nivel3 = interleave(n3Lessons, {
    reviewEvery: 5,
    chapterInsertions: content.libroDisponible
      ? [9, 10, 11, 12].map((capIndex, i) => ({ afterIndex: Math.round((i + 1) * n3Lessons.length / 5), capIndex }))
      : [],
    prefix: 'n3',
  });

  return { nivel1, nivel2, nivel3 };
}

// Devuelve las frases reales de una lección dado su nodo (funciona para los 3 niveles)
function frasesDeLeccion(content, nodo) {
  if (nodo.nivel === 1) return content.nivel1.porVerbo[nodo.verboId].frases;
  if (nodo.nivel === 2) return nodo.frases;
  if (nodo.nivel === 3) return content.nivel3.porEstructura[nodo.verboId].frases;
  return [];
}

// Pool más amplio para sacar distractores (mismo verbo/estructura, cualquier
// tiempo/parte — no solo las frases de esta lección puntual).
function distractorPoolDeLeccion(content, nodo) {
  if (nodo.nivel === 1) return content.nivel1.porVerbo[nodo.verboId].frases;
  if (nodo.nivel === 3) return content.nivel3.porEstructura[nodo.verboId].frases;
  if (nodo.nivel === 2) {
    const pool = [];
    Object.keys(content.nivel2.byVerbTense).forEach(key => {
      if (key.startsWith(`${nodo.verboId}__`)) pool.push(...content.nivel2.byVerbTense[key]);
    });
    return pool;
  }
  return [];
}

function poolGlobalDeNivel(content, nivel) {
  if (nivel === 1) return content.nivel1.poolGlobal;
  if (nivel === 2) return content.nivel2.poolGlobal;
  if (nivel === 3) return content.nivel3.poolGlobal;
  return [];
}
