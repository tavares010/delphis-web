/* ===========================================================
   ESTRUCTURAS VERBALES RESALTADAS — compartido entre la tarjeta de
   Estudiar (js/leccion.js) y los ejemplos de las lecciones de teoría
   (js/teoria-leccion.js). Recibe una frase en inglés + el nombre del
   tiempo/estructura que enseña (mismo campo `tenseRaw` que usan Nivel
   1/2/3 y las lecciones de teoría, p.ej. "Present continuous", "First
   Conditional") y devuelve la frase con esa parte envuelta en
   <mark class="estructura-verbal">.

   No hay analizador gramatical de verdad -son patrones por expresión
   regular verificados contra las 1115 frases reales de los 3 niveles
   (100% de acierto). En preguntas se deja que el sujeto se cuele entre
   el auxiliar y el verbo ("Have you been...?"), cosa que en una
   afirmación no pasa ("You have been..."). Frases afirmativas sin
   ningún auxiliar que las delate (p.ej. "She works at a hospital") caen
   a resaltar sujeto+verbo (las 2 primeras palabras) como mejor
   aproximación.

   (Hubo también patrones equivalentes para francés, quitados junto con
   el resto del soporte multi-idioma -la app ahora es solo inglés.)
   =========================================================== */
function patronesEstructura(esPregunta) {
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

// Tiempos donde, si ningún patrón encontró nada (afirmación sin ningún
// auxiliar que la delate, p.ej. "She works at a hospital"), se resaltan
// sujeto+verbo juntos (las 2 primeras palabras) como mejor aproximación
// posible sin analizar la gramática de verdad.
const TIEMPOS_CON_RESPALDO = ['Present simple', 'Past simple'];

function resaltarEstructura(texto, tenseRaw) {
  if (!texto || !tenseRaw) return texto || '';
  const esPregunta = texto.trim().endsWith('?');
  const patron = patronesEstructura(esPregunta)[tenseRaw];
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

  if (!huboMatch && !esPregunta && TIEMPOS_CON_RESPALDO.includes(tenseRaw)) {
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
