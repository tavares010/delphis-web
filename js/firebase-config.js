/* ===========================================================
   DELPHIS METHOD — CONFIGURACIÓN DE FIREBASE
   Mismo proyecto que la app móvil (delphis-55733) — ver
   web_export/PROMPT.md §10. Se reutiliza también para el login
   y el progreso de la web (decisión del usuario, 2026-08-29):
   antes solo tenía activa la Realtime Database (accepted_answers,
   compartida con la app móvil); ahora además usa Authentication
   y Firestore para las cuentas de la web. Nada de esto toca lo
   que la app móvil ya usa — son productos de Firebase separados
   dentro del mismo proyecto, con sus propias reglas.
   =========================================================== */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCcY3X19BOPfuNaMoRIgae4j5bvF0OBeBU",
  authDomain: "delphis-55733.firebaseapp.com",
  databaseURL: "https://delphis-55733-default-rtdb.firebaseio.com/",
  projectId: "delphis-55733",
  storageBucket: "delphis-55733.firebasestorage.app",
  messagingSenderId: "747613078864",
  appId: "1:747613078864:web:257c4011463fc98453d855",
};

/*
 * FALTA HACER (verificado el 2026-08-29 — Authentication YA estaba activo en
 * este proyecto, el registro/login/verificación de correo ya funcionan de
 * verdad. Solo falta esto para que el progreso se sincronice en la nube):
 *
 * 1. En console.firebase.google.com, proyecto delphis-55733 → "Compilación"
 *    → "Firestore Database" → "Crear base de datos" (todavía no existe en
 *    este proyecto — es un producto distinto de la Realtime Database que ya
 *    usa `accepted_answers`, no la reemplaza ni la toca). Modo producción
 *    está bien, las reglas van abajo.
 * 2. En Firestore → pestaña "Reglas" → pega las reglas de más abajo.
 *
 * Hasta que hagas esto, el login funciona perfecto pero el progreso se
 * queda solo en el navegador (igual que antes) en vez de sincronizarse.
 */

// Ponlo en `true` solo si estás corriendo `firebase emulators:start` en tu
// máquina para desarrollar sin tocar el proyecto real. Déjalo en `false`
// para producción — esto SÍ es el proyecto real y compartido con la app móvil.
const FIREBASE_USE_EMULATOR = false;

// true solo cuando FIREBASE_CONFIG ya tiene valores reales (no placeholders)
const FIREBASE_READY = !!(FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith('TU_'));

/*
 * REGLAS DE FIRESTORE (nuevo — para el progreso de la web) — pega esto en
 * Firestore Database → Reglas. No tiene relación con las reglas de la
 * Realtime Database de más abajo, que ya están desplegadas y no hay que tocar:
 *
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // Cada usuario solo puede leer/escribir su propio documento de progreso.
 *     match /users/{uid} {
 *       allow read, write: if request.auth != null && request.auth.uid == uid;
 *     }
 *   }
 * }
 *
 * REGLAS DE LA REALTIME DATABASE (ya desplegadas, NO hay que tocar nada —
 * solo para referencia; ver js/accepted-answers.js):
 *
 * {
 *   "rules": {
 *     ".read": false,
 *     ".write": false,
 *     "accepted_answers": { ".read": true, ".write": true }
 *   }
 * }
 */
