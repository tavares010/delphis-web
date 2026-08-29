# Delphis Method — construir la versión web (prompt completo)

Este documento es autocontenido: pégalo entero como primer mensaje a un
agente de código para que entienda qué hay que construir, qué contenido ya
existe (en esta misma carpeta), y a qué servicios reales hay que conectarse
para que funcione de verdad — no un mockup con datos inventados.

No es un encargo de clonar visualmente la app móvil (hoy en Flutter) — es
un formato distinto, pensado para web. Lo que hay que conservar es el
método, el contenido y las conexiones a los servicios reales descritas
abajo.

---

## 1. Nuestro método (la idea central)

Aprender un idioma no es "ver una palabra una vez" — es repetir en el
momento justo y producir el idioma activamente, no solo reconocerlo. Todo
el diseño se apoya en esto:

- **Repetición espaciada de verdad**: las palabras que el usuario marca
  (al tocar una palabra desconocida mientras lee, o "sé lo que significa")
  entran en un sistema tipo Leitner con 6 niveles (0 a 5). Si se acierta,
  sube de nivel y su próximo repaso se aleja cada vez más: **10 minutos →
  1 hora → 6 horas → 1 día → 3 días → 7 días**. Si se falla, baja de nivel
  y el próximo repaso es mucho más pronto (`5 + nivel×2` minutos). Cada
  palabra guarda: nivel, aciertos, fallos, cuándo se creó, cuándo se
  repasó por última vez, cuándo toca el próximo repaso. Un "quiz de
  repaso" siempre elige primero las palabras con el repaso ya vencido.
- **Recuperación activa, no solo reconocimiento**: progresión deliberada
  — primero *reconocer* la traducción correcta entre varias opciones
  (quiz), y solo al final *producir* la respuesta uno mismo en voz alta
  sin ninguna pista (el juego).
- **Contenido real, no solo frases sueltas**: un libro completo ("La
  Sed") repartido capítulo a capítulo a lo largo del currículo, y
  mini-historias con diálogos reales por temática.
- **Repaso intercalado, no en bloques**: el currículo mezcla verbo nuevo,
  capítulos del libro y repasos acumulativos, nunca "20 verbos seguidos y
  luego un examen".
- **Nunca se pregunta por algo que el usuario no ha visto**: el quiz de
  vocabulario del libro solo pregunta por palabras que el propio usuario
  tocó para traducir mientras leía.

## 2. El currículo: un único camino, bloqueado y ordenado

Un solo camino lineal, 3 niveles, se desbloquea nodo a nodo al aprobar
cada paso — no hay menú libre de "elige qué estudiar".

- **Nivel 1 — 64 verbos básicos**, en 8 bloques temáticos de 8. Cada uno
  con ~15-90 frases repartidas por tiempo verbal → `data/level1_verbs.json`.
- **Nivel 2 — 8 estructuras/parejas de verbos**, cada una en 6 tiempos
  verbales (presente simple, presente continuo, pasado simple, presente
  perfecto, going to, futuro simple), partidas en 2 lecciones cortas de
  ~8 frases → `data/level2_structures.json`.
- **Nivel 3 — 8 estructuras avanzadas**: 5 condicionales + 3 tiempos
  avanzados → `data/level3_structures.json`.
- **El libro** se reparte proporcionalmente entre los 3 niveles (Nivel 1
  se lleva los capítulos más cortos; Niveles 2 y 3 el resto a partes
  iguales) — un capítulo cada cierto número de verbos, nunca todos al
  final.
- **Repasos automáticos**: cada 5 verbos estudiados, un quiz acumulativo
  con todos los vistos hasta ahora; tras ciertos capítulos, un repaso de
  vocabulario del libro (solo palabras tocadas por el usuario).
- **Zonas visuales**: cada 10 nodos consecutivos forman una "zona" con su
  propia paleta (8 paletas en ciclo) — da sensación de cambio de "mundo"
  sin cambiar el contenido.

## 3. El bucle de aprendizaje de cada verbo/estructura

Orden estricto:

1. **Estudiar**: carrusel con TODAS las frases de ese verbo/estructura
   seguidas (nunca divididas por tiempo verbal). Cada frase: prompt en
   español, traducción en inglés, botón de escuchar a velocidad normal y
   otro más lento.
2. **Quiz**: opción múltiple — frase en español, elegir la traducción
   correcta entre 3-4 opciones. Las opciones "trampa" son la MISMA frase
   en otro tiempo verbal o con concordancia sujeto-verbo incorrecta a
   propósito (nunca contenido distinto). 70% para aprobar, sin límite de
   reintentos. Aprobar desbloquea el juego real.
3. **Juego**: sin pistas. Frase en español, el usuario dice la traducción
   en voz alta con el micrófono (reconocimiento de voz del navegador —
   Web Speech API o equivalente). Cronómetro por frase, más puntos cuanto
   más rápido. Al acertar, se escucha la pronunciación correcta antes de
   pasar a la siguiente. Rachas de 3/5/7/10+ aciertos disparan una
   celebración.

## 4. El libro interactivo: "La Sed"

- **Narración con karaoke**: la palabra narrada en ese instante se
  resalta en el texto, velocidad ajustable.
- **Traducción al tocar cualquier palabra** — cada palabra tocada entra
  en la repetición espaciada.
- **Modo lectura sin distracciones** (pantalla completa).
- **Chat con IA sobre el libro** — 1 sesión gratis al día (ver §11).
- **Quiz de vocabulario del libro** con repetición espaciada real, solo
  con palabras que el propio usuario tocó.
- Fuera del currículo, releer libremente cualquier capítulo alcanzado, en
  modo repaso (sin quiz).

## 5. Paquetes temáticos y roleplay con IA

- **8 paquetes**: Hostelería, Deportes, Escuela, Viajes, Negocios, Salud,
  Uber/Taxi, Comercio (`data/package_catalog.json`).
- **Mini-historias** con vídeo/narración por paquete (hostelería, uber,
  viajes, comercio hoy — `data/story_packages.json`).
- **Roleplay en vivo con IA**: la IA interpreta un personaje, el usuario
  el rol profesional. Escena inicial + 5 misiones al azar de un banco de
  ~20 (`data/roleplay_scenarios.json`). El usuario mantiene pulsado el
  micrófono, la IA responde por voz con posible corrección suave. Máximo
  10 turnos de usuario por sesión. Termina al completar las 5 misiones o
  agotar turnos.
- **Todo gratis**, con límite diario anti-abuso de coste de IA: **5
  sesiones de roleplay/día** y **1 sesión de chat del libro/día** — ver
  §11 para el contrato exacto con el backend de IA.

## 6. Gamificación

- **Puntos**: `10 + (rango-1)×2` por acierto en el juego + bonus por
  velocidad + 50 al subir de rango. 6 rangos: Bronce/Plata/Oro/Platino/
  Diamante/Maestro (umbrales: 0/300/800/1600/3000/6000).
- **Monedas** (moneda aparte): se ganan con retos diarios/semanales, se
  gastan en la Tienda — nunca jugando directamente.
- **Tienda** (solo cosmético): marcos, temas de color (`data/shop_catalog.json`,
  colores ya en hex), títulos.
- **Racha diaria**: días seguidos con al menos un acierto.
- **Avatar** personalizable (estilo Bitmoji), aparece en perfil y en las
  burbujas de chat de roleplay/libro.

## 7. Onboarding

- Introducción inicial (una vez) con mascota guía, termina en
  personalización de avatar. Reproducible después.
- Tutorial "enfocado" por pantalla la primera vez que se entra —
  reactivable desde Ajustes.
- "Cómo funciona la app": pantalla de referencia estática, siempre
  accesible desde Ajustes.

## 8. Mapa de pantallas

Inicio · Camino/currículo · Estudiar · Quiz · Juego (uno por nivel) · El
libro · Paquetes · Roleplay · Tienda · Perfil · Ajustes.

---

## 9. Contenido ya exportado — usa esto, no lo inventes

Todo el contenido real (frases, traducciones, quiz, historias, escenarios
de roleplay, catálogo de tienda) ya está exportado en:

- **`data/*.json`** — ver `README.md` en la raíz de esta carpeta para el
  formato exacto de cada archivo.
- **`assets/`** — audio narrado (mp3 + timestamps de karaoke), vídeos de
  mini-historias, el texto completo del libro (`laSed_en.txt`), y los
  diálogos fuente de paquetes.

No hace falta pedir estas frases a ninguna IA ni inventarlas: son las
mismas que usa la app móvil, generadas directamente desde su código
fuente (`tool/export_web_content.dart` en el repo de la app, por si hace
falta regenerarlas tras un cambio de contenido).

---

## 10. Conectarse a la base de datos compartida (Firebase Realtime Database)

Esto **no** es donde vive el contenido (verbos/imágenes/audio, ver §9) —
es una pieza pequeña y específica: la corrección colectiva de
reconocimiento de voz. El motor de voz a veces confunde sistemáticamente
una palabra por otra parecida (p. ej. "phase" oído como "face") — no es
fallo del usuario, es el motor, así que le pasará a cualquiera que diga
esa misma frase. En vez de que cada plataforma arregle esto por su lado,
**la app móvil y la web deben compartir la misma base de datos**, para
que una corrección aceptada en cualquiera de las dos beneficie a todos.

### 10.1 Config de Firebase (proyecto ya existente: `delphis-55733`)

Usa exactamente esta configuración web (ya registrada en el proyecto vía
FlutterFire CLI, en `lib/firebase_options.dart` de la app):

```js
const firebaseConfig = {
  apiKey: "AIzaSyCcY3X19BOPfuNaMoRIgae4j5bvF0OBeBU",
  authDomain: "delphis-55733.firebaseapp.com",
  databaseURL: "https://delphis-55733-default-rtdb.firebaseio.com/",
  projectId: "delphis-55733",
  storageBucket: "delphis-55733.firebasestorage.app",
  messagingSenderId: "747613078864",
  appId: "1:747613078864:web:257c4011463fc98453d855",
};
```

Este `apiKey` de Firebase Web **no es secreto** (identifica el proyecto,
no autentica) — la seguridad la dan las Reglas de la base de datos, no
ocultar la clave. Es seguro incluirlo en el bundle de cliente, igual que
ya va embebido en la app móvil.

Instálalo con el SDK de Firebase para JS (`firebase/app` +
`firebase/database`) o el equivalente de tu framework.

### 10.2 Reglas ya desplegadas en esa base de datos

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "accepted_answers": { ".read": true, ".write": true }
  }
}
```

Todo bloqueado por defecto — **solo** la rama `accepted_answers` es
legible y escribible por cualquier cliente, sin autenticación. No intentes
leer/escribir ninguna otra ruta: está denegada a propósito hasta que
alguien decida ampliar el alcance (ver §12).

### 10.3 Modelo de datos

```
/accepted_answers/{fraseObjetivoNormalizada}/{alternativaOídaNormalizada}: true
```

Un árbol de claves, nunca una lista — así dos usuarios corrigiendo a la
vez nunca se pisan (cada uno escribe solo su propia clave).

**Normalización** (hay que usar EXACTAMENTE este algoritmo — si la web
normaliza distinto que la app móvil, las claves no coincidirán nunca y la
corrección de un lado no beneficiará al otro):

```js
function normalizeForAcceptedAnswers(value) {
  const accentMap = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' };
  let s = value.toLowerCase().trim();
  for (const [accented, plain] of Object.entries(accentMap)) {
    s = s.replaceAll(accented, plain);
  }
  return s
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
```

(Fuente exacta: `lib/core/answer_normalizer.dart` de la app — el
resultado nunca contiene `.`, `#`, `$`, `[` ni `]`, así que siempre es una
clave válida de Realtime Database sin escapado adicional.)

### 10.4 Cómo usarlo (mismo contrato que la app móvil)

**Al arrancar la app** (una vez, en segundo plano, sin bloquear el primer
render — si falla por red o el nodo no existe todavía, la app debe seguir
funcionando igual, solo sin este extra):

```js
import { getDatabase, ref, get, set } from "firebase/database";
const db = getDatabase(firebaseApp, firebaseConfig.databaseURL);

let acceptedAnswers = {}; // { [targetNormalizado]: Set<string> }

async function loadAcceptedAnswers() {
  try {
    const snapshot = await get(ref(db, "accepted_answers"));
    if (snapshot.exists()) {
      const raw = snapshot.val();
      acceptedAnswers = Object.fromEntries(
        Object.entries(raw).map(([target, heardMap]) => [
          target,
          new Set(Object.keys(heardMap).filter((k) => heardMap[k] === true)),
        ])
      );
    }
  } catch (_) {
    // sin red / sin Firebase: seguir con fuzzy-matching normal, sin romper nada
  }
}
```

**Al comprobar una respuesta hablada** (además del fuzzy-matching normal
de tu propio reconocimiento de voz):

```js
function isAcceptedAlternate(target, heard) {
  const t = normalizeForAcceptedAnswers(target);
  const h = normalizeForAcceptedAnswers(heard);
  if (!h) return false;
  return acceptedAnswers[t]?.has(h) ?? false;
}
```

**Al pulsar "➕ Añadir como respuesta válida"** (solo visible cuando el
intento falló pero SÍ se transcribió algo): actualiza el estado en
memoria primero (para que la UI acepte la respuesta al instante, sin
esperar red) y persiste después en segundo plano:

```js
async function submitAlternate(target, heard) {
  const t = normalizeForAcceptedAnswers(target);
  const h = normalizeForAcceptedAnswers(heard);
  if (!h || h === t) return;

  acceptedAnswers[t] = acceptedAnswers[t] ?? new Set();
  acceptedAnswers[t].add(h); // disponible YA en esta sesión, antes del await

  try {
    await set(ref(db, `accepted_answers/${t}/${h}`), true);
  } catch (_) {
    // un fallo de red aquí nunca debe ser visible para el usuario
  }
}
```

También guarda una copia local (localStorage) de las alternativas que
este mismo navegador ha aceptado, para que funcione offline y sin esperar
a `loadAcceptedAnswers` — exactamente como hace `AcceptedAnswersStorage`
en la app (por dispositivo, vía `SharedPreferences` allí; `localStorage`
aquí).

---

## 11. Conectarse al backend de IA (roleplay + chat del libro)

La IA (Claude, de Anthropic) **nunca** se llama directamente desde el
cliente — ni la app móvil ni la web deben tener una API key de Anthropic
en su código. Todo pasa por un proxy propio ya desplegado.

### 11.1 El servidor

Código fuente completo en `server-reference/index.js` (copia exacta del
backend real, `server/index.js` en el repo de la app; `server/package.json`
al lado). Solo hace falta el endpoint `/api/roleplay-turn` (y `/health`
para comprobar que está vivo) — el resto del archivo (Stripe/membresías)
es código muerto que ya no usa la app, se puede ignorar o borrar en una
copia propia.

**URL desplegada ahora mismo (Render, plan gratuito):**

```
https://server-9xj7.onrender.com/api/roleplay-turn
```

CORS está abierto a cualquier origen (`app.use(cors())` sin restricción),
así que un frontend web puede llamarlo directamente sin problema de CORS.

**Decisión que hay que tomar**: esta URL es la que usa hoy la app móvil
en producción. Si la web pega directamente a esta misma URL, comparte
cuota/coste de la API de Anthropic con la app móvil — puede ser lo que se
quiere (un único backend para ambas plataformas) o no (si se prefiere
medir/limitar el gasto de cada plataforma por separado). Si se prefiere
separar, despliega tu propia copia de `server-reference/index.js` (Render,
Railway, Fly.io... cualquiera que permita un proceso Node siempre vivo) con
tu propia `ANTHROPIC_API_KEY`, y apunta la web a esa URL en vez de a la de
arriba.

### 11.2 Contrato de la petición

Un único endpoint sirve tanto el roleplay de paquetes como el chat del
libro — lo que cambia es solo el `systemPrompt` que se manda:

```
POST /api/roleplay-turn
Content-Type: application/json

{
  "systemPrompt": "...", // ver 11.3/11.4 — instruye a la IA qué JSON devolver
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

`messages` es el historial completo de la conversación hasta ahora (no
solo el último turno) — mismo formato que la Messages API de Anthropic
(`role`: `"user"` o `"assistant"`, alternando, empezando por `"user"`). Si
el historial está vacío, manda un primer mensaje "invisible" para que la
IA arranque la conversación:

```js
const openingBootstrapMessage = "(The user has just entered the roleplay. Begin now.)";
// o para el chat del libro:
// "(The user has just opened the chat about the book. Begin now.)"
```

**Timeout recomendado: 60 segundos.** El plan gratuito de Render duerme
el servicio tras ~15 min sin uso — la primera petición tras una pausa
puede tardar bastante en "despertarlo". Distingue en la UI entre "sin
conexión", "error del servidor" y "el servidor está despertando" (mismos
3 casos que ya maneja `RoleplayErrorKind` en la app).

**Respuesta:**

```json
{ "text": "..." }
```

`text` es un string que casi siempre contiene JSON embebido (a veces con
texto alrededor, porque se le pide a la IA "responde solo con JSON" pero
no siempre lo cumple al 100%) — busca el primer `{` y el último `}` del
string, parsea eso como JSON, y si falla usa `text.trim()` tal cual como
mensaje de la IA (fallback de texto plano, sin corrección ni progreso de
misiones) para no romper la conversación.

### 11.3 System prompt del roleplay de paquetes

Reconstruye este system prompt en cada turno (usa el `RoleplayScenario`
correspondiente de `data/roleplay_scenarios.json` y las 5 misiones
elegidas al azar de su `missionPool` al empezar la partida):

```
You are role-playing as {aiRole} in a spoken English practice conversation set in a "{title}" scenario. The user is role-playing as {userRole}.

Context: {openingContext}

The user is trying to accomplish the following 5 objectives during this conversation, in any order:
- ({mission.id}) {mission.enHint}
[... las 5 misiones activas]

{turnStatus}

Rules:
- Speak ONLY in short, natural, conversational spoken English, the way {aiRole} would actually talk out loud. Never write long or formal sentences.
- Never break character and never mention that you are an AI, a prompt, a JSON format, the objectives themselves, or the turn limit.
- Actively steer the conversation — ask questions, raise situations, express needs or problems — so the user has realistic, natural opportunities to accomplish each of the 5 objectives. Don't just passively wait; behave the way {aiRole} genuinely would in this situation.
- The whole scene must be resolvable within at most {maxUserTurns} user turns total. Pace it efficiently: don't waste turns on small talk, and as turns run low, be direct — proactively raise whatever topic is needed for the remaining objectives yourself rather than waiting for the user.
- After each user turn, evaluate what they just said:
  - List the ids of any of the 5 objectives that were clearly accomplished by that turn in "missions_completed" (a natural, correct attempt counts — wording doesn't have to be exact). Only list objectives not already completed earlier in the conversation.
  - If they made a clear English mistake, put ONLY the corrected English sentence in "correction" (no quotes, no explanations). Otherwise "correction" must be null.
- Set "scenario_complete" to true once ALL 5 objectives have been accomplished across the whole conversation so far, otherwise false.
- If the conversation history is empty or only contains the opening system message, this is the very first turn: don't evaluate anything ("correction": null, "missions_completed": []), just say a short opening line as {aiRole} to naturally kick off the scenario.

You MUST reply with STRICT JSON only, no markdown formatting, no extra text before or after, in exactly this shape:
{"npc_reply": "...", "correction": null, "missions_completed": [], "scenario_complete": false}
```

Donde `turnStatus` es `"This is the opening line, before the user has spoken."`
en el primer turno, o `"This is user turn {n} of a maximum of {maxUserTurns} for this scene."`
después. `maxUserTurns` = 10.

Parsea la respuesta como `{ npc_reply, correction, missions_completed[], scenario_complete }`.

### 11.4 System prompt del chat del libro

```
You are a warm, curious English conversation partner chatting with a student about the book they are reading, "{bookTitle}".

Chapters the student has read so far:
{lista de títulos de capítulo, uno por línea con "- "}

The most recent part of the story the student has read, so you know exactly where they are and never spoil anything beyond this point:
"""
{últimos ~6000 caracteres del texto leído hasta ahora}
"""

The student has already practiced these English verbs/tenses in their lessons: {lista separada por comas, o "(none practiced yet — just have a normal conversation)"}

Your job in this chat:
- Talk with the student about the book: what you think is happening, the characters, theories about what comes next, how the student feels about the story so far. Ask genuine, curious questions.
- When it fits naturally, try to phrase your own questions or comments using one of the practiced verbs/tenses above — but never force it or make it feel like a grammar drill. If a different, more natural verb fits better in the moment, just use that instead.
- Keep every message short and conversational (1-3 sentences), like a real chat between friends, never a lecture.
- If the student makes a clear English mistake, put ONLY the corrected sentence in "correction" (no quotes, no explanation). Otherwise "correction" must be null.
- Never break character, and never mention tenses, verbs, JSON, prompts, or that you are an AI.
- This is turn {turnNumber} of a maximum of {maxTurns} for this chat. As turns run low, start wrapping the conversation up naturally; on the very last turn, give a short warm closing message (no new question) and set "finished" to true. Otherwise "finished" must be false.
- If the conversation history is empty, this is the very first turn: greet the student and ask an inviting opening question about the book to kick off the chat. Don't evaluate anything yet ("correction": null).

You MUST reply with STRICT JSON only, no markdown formatting, no extra text before or after, in exactly this shape:
{"ai_message": "...", "correction": null, "finished": false}
```

Parsea la respuesta como `{ ai_message, correction, finished }`. El
contexto de lectura (capítulos leídos + texto reciente) se calcula sobre
`assets/laSed_en.txt` con la misma partición en capítulos que describe
`data/README.md` de esta carpeta.

### 11.5 Límites diarios (anti-abuso de coste, no de negocio — todo es gratis)

- **5 partidas de roleplay al día** por usuario/dispositivo.
- **1 sesión de chat del libro al día** por usuario/dispositivo.
- Hoy esto se aplica solo en el cliente (contador en `localStorage`/
  `SharedPreferences`, se resetea cada día) — el servidor no lo fuerza.
  Si quieres que sea más robusto (alguien podría limpiar `localStorage`
  para saltárselo), hay que añadir el control en el propio servidor
  (por IP, por usuario autenticado, etc.) — no existe todavía ni en la
  app móvil ni en el proxy.

---

## 12. Autenticación y persistencia de progreso (decisión abierta)

La app móvil hoy **no tiene login** — todo el progreso (puntos, monedas,
racha, currículo alcanzado, tienda, avatar, palabras de repetición
espaciada) vive solo en el dispositivo (`SharedPreferences`), sin
sincronizar. La base de datos de §10 está deliberadamente cerrada a todo
lo que no sea `accepted_answers` — no hay hoy ninguna colección de
usuarios/progreso en Firebase que la web pueda simplemente reutilizar.

Para la web probablemente conviene resolver esto con una cuenta (aunque
sea mínima), porque perder el progreso al borrar caché del navegador es
peor experiencia que en una app instalada. Si se decide eso, hay que:

1. Añadir Firebase Authentication (el proyecto ya existe, es solo activar
   el método de login que se quiera — email, Google, etc.).
2. Diseñar una colección (Firestore o Realtime Database) para el
   progreso, con sus propias Reglas — la regla actual (§10.2) NO da
   acceso a nada de esto, haría falta ampliarla explícitamente.
3. Decidir si el progreso de la app móvil y el de la web deben
   compartirse (mismo usuario, mismo progreso en ambas) o si son
   independientes — no está decidido todavía.

Esto queda fuera del alcance de "conectar lo que ya existe" — es diseño
nuevo, a discutir con quien mantiene el proyecto antes de implementarlo.

---

## Resumen de una frase

Un curso de inglés con un único camino guiado (verbos + libro real +
repasos con repetición espaciada de verdad), en 3 pasos por cada cosa que
se aprende (estudiar → quiz → producir en voz alta sin pistas), con
puntos/rango/monedas cosméticos y paquetes temáticos + roleplay por voz
con IA como contenido libre adicional — todo el contenido ya exportado en
`data/`+`assets/`, la corrección colectiva de voz conectada a la Realtime
Database compartida de Firebase (§10), y el roleplay/chat conectados al
proxy de Anthropic ya desplegado (§11) — todo gratis, sin cuentas hoy.
