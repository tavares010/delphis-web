# Export de contenido de Delphis Method para la versión web

**Empieza por `PROMPT.md`** en esta misma carpeta — es el prompt completo
para dar a un agente de código: qué construir (método, currículo,
pantallas), cómo usar el contenido de aquí abajo, y cómo conectarse a la
base de datos compartida (Firebase) y al backend de IA ya desplegado.
Este README solo documenta el detalle de cada archivo de `data/`/`assets/`.

Generado con `dart run tool/export_web_content.dart` (más una copia directa
de los assets binarios) a partir del contenido real de la app Flutter. No
viene de Firebase — Firebase en este proyecto solo se usa para las
correcciones colectivas de reconocimiento de voz (`accepted_answers`), no
para frases/imágenes/audio. Todo esto es contenido estático embebido en la
app.

Para regenerar el JSON tras cambiar el contenido en `lib/data/`, vuelve a
ejecutar `dart run tool/export_web_content.dart` desde la raíz del repo
(los binarios de `assets/` no cambian con ese script — hay que volver a
copiarlos a mano si cambian).

## `data/` — contenido en JSON

- **`level1_verbs.json`** — los 64 verbos de Nivel 1 (frase a frase, sin
  agrupar por verbo: agrúpalas tú por el campo `verb`). Cada frase:
  `index` (posición original, usado para encontrar su audio), `verb`,
  `tense`, `promptEs`, `translationEn`, `imageUrl` (foto de Pexels,
  hotlinkeable), `audioAsset` (ruta relativa dentro de este export, o
  `null` si esa frase no tiene narración grabada).
- **`level2_structures.json`** / **`level3_structures.json`** — mismo
  formato para las 8 estructuras de Nivel 2 (6 tiempos cada una) y las 8 de
  Nivel 3 (condicionales + tiempos avanzados). **`audioAsset` siempre es
  `null` aquí** — Niveles 2 y 3 no tienen narración pre-grabada, la app usa
  el sintetizador de voz del dispositivo (TTS) en tiempo real para esas.
  `imageUrl` sí existe igual que en Nivel 1.
- **`book_quiz_bank.json`** — preguntas de comprensión lectora por
  capítulo del libro (clave = índice de capítulo, mismo orden que produce
  `extractBookChapters()` sobre `assets/laSed_en.txt`: 0 = Introducción,
  1 = "La misión", etc.). Cada pregunta: `question`, `options`,
  `correctIndex`.
- **`book_chapter_audio_indices.json`** — qué capítulos tienen audio
  narrado (y dónde: ver el propio archivo).
- **`package_catalog.json`** — los 8 paquetes temáticos (id, nombre,
  descripción, emoji). Sin icono: elige los tuyos en la web.
- **`package_phrases.json`** — frases de "Estudiar" de paquetes,
  EN (`answerEn`) + ES (`promptEs`) ya emparejadas por índice. **Solo
  `hosteleria` y `uber` tienen contenido propio hoy** — el resto de
  paquetes (`deportes`, `escuela`, `viajes`, `negocios`, `salud`,
  `comercio`) no tienen todavía un banco de frases propio en la app (no es
  un fallo del export, así está también en la app móvil).
- **`story_packages.json`** — las mini-historias narrativas (con vídeo)
  de `hosteleria`, `comercio`, `viajes` y `uber`: título, vocabulario
  clave, frase-reto (`challengeSentence`), y las líneas de diálogo/
  narración (`lines`, cada una EN+ES alineadas, con `speaker` si es una
  réplica de un personaje). `videoAsset`/`videoAssetSub`/`thumbnailAsset`
  apuntan a rutas dentro de este mismo export.
- **`story_line_audio_indices.json`** — qué líneas de qué sección de
  qué paquete tienen audio narrado + timestamps de karaoke.
- **`roleplay_scenarios.json`** — los 8 escenarios de roleplay hablado
  con IA (uno por paquete), con su banco completo de ~20 misiones cada
  uno (`missionPool`) — la app elige 5 al azar por partida.
- **`shop_catalog.json`** — catálogo de la Tienda (marcos, temas,
  títulos), colores ya convertidos a hex (`#RRGGBB`).

## `assets/` — binarios referenciados desde el JSON de arriba

- `laSed_en.txt` — texto completo de la novela "La Sed" en inglés (el que
  lee la app). Los capítulos NO vienen pre-separados: hay que aplicar la
  misma regla de "una línea entera en MAYÚSCULAS, ≤40 caracteres, con
  alguna letra = título de capítulo nuevo" (ver
  `extractBookChapters()` en `lib/book/book_screen.dart`, o la copia en
  `tool/export_web_content.dart`/`tool/fetch_book_chapter_audio.dart` si
  prefieres reimplementarla en el stack de la web).
- `paquetes/*.txt` — texto fuente Q/A de los paquetes en inglés (ya
  parseado y emparejado con el español en `data/package_phrases.json` —
  normalmente no hace falta tocar estos .txt directamente).
- `audio/verbs/level1/<index>.mp3` — narración Nivel 1, indexada igual
  que `data/level1_verbs.json`.
- `audio/book_chapters/chapter_<i>.mp3` + `chapter_<i>_timestamps.json`
  — narración y karaoke por capítulo del libro.
- `audio/<packageId>_stories/<numeroSeccion>/line_<i>.mp3` +
  `line_<i>_timestamps.json` — narración y karaoke de mini-historias.
- `hosteleria_stories/*.mp4` — vídeos reales de las mini-historias de
  hostelería (con y sin subtítulos incrustados, sufijo `sub`).
- `comercio_stories/`, `viajes_stories/`, `uber_stories/` — estos
  paquetes no tienen vídeo real todavía: son ilustraciones de portada
  (`coverN.png`) usadas como `thumbnailAsset`.

## Lo que NO está en este export

- Los tiempos verbales en `verb`/`tense` de Nivel 1 y frases de Nivel 2/3
  no tienen id numérico estable más allá de `index` dentro de su propio
  archivo — si reordenas el JSON, se rompe la relación con el audio.
- La lógica de repetición espaciada, rangos/puntos, currículo (qué nodo
  va en qué orden) y todo lo que no sea contenido en sí: eso está descrito
  en el brief de la versión web, no aquí — este export es solo el
  contenido "de verdad" (frases, imágenes, audio, historias, quiz).
