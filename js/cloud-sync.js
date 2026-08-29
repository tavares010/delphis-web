/* ===========================================================
   DELPHIS METHOD — SINCRONIZACIÓN CON LA NUBE (Firestore)
   Tu progreso sigue viviendo en localStorage (rápido, funciona
   offline) pero se copia a tu cuenta para que te siga entre
   dispositivos. Se sube cada pocos segundos mientras la pestaña
   está abierta, y al cerrarla/ocultarla.
   =========================================================== */

let CLOUD_USER = null;
let cloudPushTimer = null;

function cloudDocRef(uid) {
  return db.collection('users').doc(uid);
}

function readLocalJSON(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}

function timeoutAfter(ms, label) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout: ${label}`)), ms));
}

// Nunca debe bloquear la carga de la página: si Firestore no responde rápido
// (por ejemplo, si todavía no está activado en el proyecto), seguimos con lo
// que ya hay en localStorage y punto — la sincronización es un extra, no un
// requisito para usar el curso.
async function syncFromCloud(user) {
  if (!db) return;
  CLOUD_USER = user;
  try {
    const snap = await Promise.race([cloudDocRef(user.uid).get(), timeoutAfter(6000, 'syncFromCloud')]);
    if (snap.exists) {
      const data = snap.data();
      if (data.progress) localStorage.setItem(PROGRESS_KEY, JSON.stringify(data.progress));
      if (data.curriculum) localStorage.setItem(CURRICULUM_KEY, JSON.stringify(data.curriculum));
      if (data.srs) localStorage.setItem(SRS_KEY, JSON.stringify(data.srs));
    } else {
      // primera vez de este usuario: sube lo que ya haya en este navegador (si algo)
      pushToCloud(user);
    }
  } catch (e) {
    console.warn('No se pudo sincronizar con la nube todavía:', e.message);
  }
  startAutoPush();
}

async function pushToCloud(user) {
  if (!db || !user) return;
  const payload = {
    email: user.email,
    progress: readLocalJSON(PROGRESS_KEY),
    curriculum: readLocalJSON(CURRICULUM_KEY),
    srs: readLocalJSON(SRS_KEY),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  try {
    await cloudDocRef(user.uid).set(payload, { merge: true });
  } catch (e) {
    console.warn('No se pudo guardar el progreso en la nube:', e.message);
  }
}

function startAutoPush() {
  if (cloudPushTimer) return;
  cloudPushTimer = setInterval(() => { if (CLOUD_USER) pushToCloud(CLOUD_USER); }, 4000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && CLOUD_USER) pushToCloud(CLOUD_USER);
  });
  window.addEventListener('pagehide', () => { if (CLOUD_USER) pushToCloud(CLOUD_USER); });
  window.addEventListener('beforeunload', () => { if (CLOUD_USER) pushToCloud(CLOUD_USER); });
}

// Empuja de inmediato en vez de esperar al temporizador — para los momentos
// en los que de verdad importa no perder nada (justo al terminar algo), no
// hay que confiar solo en el intervalo de 4s ni en beforeunload (que el
// navegador no garantiza que termine antes de cerrar la pestaña).
function pushNow() {
  if (CLOUD_USER) pushToCloud(CLOUD_USER);
}

async function deleteCloudProgress() {
  if (!db || !CLOUD_USER) return;
  try { await cloudDocRef(CLOUD_USER.uid).delete(); } catch (e) { /* no bloquea el reinicio local */ }
}
