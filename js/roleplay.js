/* ===========================================================
   DELPHIS METHOD — ROLEPLAY CON IA (roleplay.html)
   Conversación por turnos con un personaje de IA (backend real,
   ver web_export/PROMPT.md §11.3). Voz si el navegador la soporta
   (Web Speech API), con texto como respaldo siempre disponible.
   =========================================================== */

function qsR(sel, root = document) { return root.querySelector(sel); }
function shuffleR(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const rpParams = new URLSearchParams(location.search);
const pkgId = rpParams.get('pkg');
const MAX_USER_TURNS = 10;

const ROLEPLAY_LIMIT_KEY = 'delphis_roleplay_limit_v1';
const ROLEPLAY_DAILY_MAX = 5;

function roleplayLimitState() {
  const today = todayStr();
  let s;
  try { s = JSON.parse(localStorage.getItem(ROLEPLAY_LIMIT_KEY)); } catch (e) { s = null; }
  if (!s || s.fecha !== today) s = { fecha: today, usadas: 0 };
  return s;
}
function roleplayLimitUse() {
  const s = roleplayLimitState(); s.usadas++;
  localStorage.setItem(ROLEPLAY_LIMIT_KEY, JSON.stringify(s));
}

function buildSystemPrompt(scenario, missions, turnNumber) {
  const missionLines = missions.map(m => `- (${m.id}) ${m.enHint}`).join('\n');
  const turnStatus = turnNumber === 0
    ? 'This is the opening line, before the user has spoken.'
    : `This is user turn ${turnNumber} of a maximum of ${MAX_USER_TURNS} for this scene.`;
  return `You are role-playing as ${scenario.aiRole} in a spoken English practice conversation set in a "${scenario.title}" scenario. The user is role-playing as ${scenario.userRole}.

Context: ${scenario.openingContext}

The user is trying to accomplish the following 5 objectives during this conversation, in any order:
${missionLines}

${turnStatus}

Rules:
- Speak ONLY in short, natural, conversational spoken English, the way ${scenario.aiRole} would actually talk out loud. Never write long or formal sentences.
- Never break character and never mention that you are an AI, a prompt, a JSON format, the objectives themselves, or the turn limit.
- Actively steer the conversation — ask questions, raise situations, express needs or problems — so the user has realistic, natural opportunities to accomplish each of the 5 objectives. Don't just passively wait; behave the way ${scenario.aiRole} genuinely would in this situation.
- The whole scene must be resolvable within at most ${MAX_USER_TURNS} user turns total. Pace it efficiently: don't waste turns on small talk, and as turns run low, be direct — proactively raise whatever topic is needed for the remaining objectives yourself rather than waiting for the user.
- After each user turn, evaluate what they just said:
  - List the ids of any of the 5 objectives that were clearly accomplished by that turn in "missions_completed" (a natural, correct attempt counts — wording doesn't have to be exact). Only list objectives not already completed earlier in the conversation.
  - If they made a clear English mistake, put ONLY the corrected English sentence in "correction" (no quotes, no explanations). Otherwise "correction" must be null.
- Set "scenario_complete" to true once ALL 5 objectives have been accomplished across the whole conversation so far, otherwise false.
- If the conversation history is empty or only contains the opening system message, this is the very first turn: don't evaluate anything ("correction": null, "missions_completed": []), just say a short opening line as ${scenario.aiRole} to naturally kick off the scenario.

You MUST reply with STRICT JSON only, no markdown formatting, no extra text before or after, in exactly this shape:
{"npc_reply": "...", "correction": null, "missions_completed": [], "scenario_complete": false}`;
}

function renderPicker(scenarios) {
  const wrap = document.getElementById('roleplayWrap');
  const list = Object.values(scenarios);
  wrap.innerHTML = `
    <div class="rp-picker reveal-up visible">
      <div class="rp-picker__head">
        <span class="eyebrow">Hablar con IA</span>
        <h1 style="font-size:2rem; margin:.5rem 0;">Elige con quién quieres practicar</h1>
        <p style="color:var(--gray-400);">Un personaje distinto para cada escena — habla en voz alta o escribe, y tu avatar te responde en el momento.</p>
      </div>
      <div class="rp-scenario-grid">
        ${list.map(s => `
          <a href="roleplay.html?pkg=${s.packageId}" class="rp-scenario-card">
            <span class="rp-scenario-card__emoji">${s.characterEmoji}</span>
            <strong>${s.title}</strong>
            <small>${s.roleSubtitleEs}</small>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

function renderIntro(scenario) {
  const wrap = document.getElementById('roleplayWrap');
  const state = roleplayLimitState();
  const restantes = ROLEPLAY_DAILY_MAX - state.usadas;
  wrap.innerHTML = `
    <div class="rp-intro reveal-up visible">
      <div class="rp-avatar-stage">
        <div class="rp-avatar">${scenario.characterEmoji}</div>
        <div class="rp-avatar-status">${scenario.characterLabelEs} te está esperando</div>
      </div>
      <span class="eyebrow">Roleplay · ${scenario.title}</span>
      <h1 style="font-size:1.8rem; margin:.6rem 0;">${scenario.roleSubtitleEs}</h1>
      <p style="color:var(--gray-300);">${scenario.openingContext}</p>
      <div class="rp-roles">
        <div class="rp-role-badge"><strong>Tú</strong>${scenario.userRole}</div>
        <div class="rp-role-badge"><strong>${scenario.characterLabelEs}</strong>${scenario.aiRole}</div>
      </div>
      <p style="color:var(--gray-500); font-size:.85rem; margin:1.2rem 0;">Sesiones de hoy: ${state.usadas}/${ROLEPLAY_DAILY_MAX} usadas · máximo ${MAX_USER_TURNS} turnos por partida</p>
      ${restantes > 0
        ? `<button class="btn btn--primary btn--lg" id="btnStartRp">Empezar roleplay</button>`
        : `<p style="color:#f87171;">Ya usaste tus ${ROLEPLAY_DAILY_MAX} sesiones gratis de hoy. Vuelve mañana.</p>`}
      <p style="margin-top:1rem;"><a href="roleplay.html" style="color:var(--gray-500); font-size:.82rem;">← Elegir otro personaje</a></p>
    </div>
  `;
  if (restantes > 0) qsR('#btnStartRp').addEventListener('click', () => startRoleplay(scenario));
}

function renderMissionChecklist(missions, done) {
  return `<div class="rp-missions">${missions.map(m => `
    <div class="rp-mission ${done.has(m.id) ? 'done' : ''}" data-mid="${m.id}">
      <span class="rp-mission__check">${done.has(m.id) ? '✓' : ''}</span>${m.titleEs}
    </div>`).join('')}</div>`;
}

function setupMic(onResult) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.onresult = (e) => onResult(e.results[0][0].transcript);
  return r;
}

function startRoleplay(scenario) {
  if (roleplayLimitState().usadas >= ROLEPLAY_DAILY_MAX) return;
  roleplayLimitUse();
  renderProgressChip();

  const missions = shuffleR(scenario.missionPool).slice(0, 5);
  const done = new Set();
  const messages = [];
  let turn = 0;
  let ended = false;

  const wrap = document.getElementById('roleplayWrap');
  wrap.innerHTML = `
    <div class="rp-chat-wrap">
      <div class="rp-avatar-stage">
        <div class="rp-avatar" id="rpAvatar">${scenario.characterEmoji}</div>
        <div class="rp-avatar-status" id="rpAvatarStatus">${scenario.characterLabelEs} · ${scenario.title}</div>
      </div>
      <div class="rp-topbar">
        <div class="rp-topbar__row">
          <span id="rpTurnCount">Turno 0 / ${MAX_USER_TURNS}</span>
          <span>${done.size}/${missions.length} misiones</span>
        </div>
        <div class="rp-progress-track"><div class="rp-progress-fill" id="rpProgressFill" style="width:0%"></div></div>
      </div>
      <div id="rpMissions">${renderMissionChecklist(missions, done)}</div>
      <div class="rp-chat-messages" id="rpMessages"></div>
      <form class="rp-input-row" id="rpForm">
        <button type="button" class="rp-mic-btn" id="rpMic">🎤</button>
        <input type="text" id="rpInput" placeholder="Escribe (o dicta) tu respuesta en inglés…" autocomplete="off">
        <button class="btn btn--primary" type="submit">Enviar</button>
      </form>
    </div>
  `;

  const avatarEl = qsR('#rpAvatar');
  const statusEl = qsR('#rpAvatarStatus');
  function setAvatarState(state, label) {
    avatarEl.classList.remove('speaking', 'listening', 'thinking');
    if (state) avatarEl.classList.add(state);
    statusEl.innerHTML = label;
  }
  const idleLabel = `${scenario.characterLabelEs} · ${scenario.title}`;

  const recognition = setupMic((transcript) => { qsR('#rpInput').value = transcript; });
  const micBtn = qsR('#rpMic');
  if (!recognition) { micBtn.style.opacity = '.35'; micBtn.title = 'Tu navegador no soporta dictado por voz — usa el texto.'; }
  else {
    let recording = false;
    let micWatchdog = null;
    const onResultOriginal = recognition.onresult; // asignado por setupMic()
    micBtn.addEventListener('click', () => {
      if (recording) { recognition.stop(); recording = false; micBtn.classList.remove('recording'); setAvatarState(null, idleLabel); return; }
      recording = true; micBtn.classList.add('recording');
      setAvatarState('listening', 'Te está escuchando…');
      try {
        recognition.start();
        micWatchdog = vigilarMic(recognition, () => {
          recording = false; micBtn.classList.remove('recording'); setAvatarState(null, idleLabel);
          showToast('No se detectó nada, inténtalo de nuevo.');
        });
      } catch (err) { recording = false; micBtn.classList.remove('recording'); setAvatarState(null, idleLabel); showToast('No se pudo iniciar el micrófono.'); }
    });
    recognition.onresult = (e) => { clearTimeout(micWatchdog); onResultOriginal(e); };
    recognition.onerror = (e) => {
      clearTimeout(micWatchdog);
      const msg = mensajeErrorMic(e.error);
      if (msg) showToast(msg);
      recording = false; micBtn.classList.remove('recording'); setAvatarState(null, idleLabel);
    };
    recognition.onend = () => { clearTimeout(micWatchdog); recording = false; micBtn.classList.remove('recording'); if (avatarEl.classList.contains('listening')) setAvatarState(null, idleLabel); };
  }

  function addBubble(role, text) {
    const row = document.createElement('div');
    row.className = `chat-bubble-row chat-bubble-row--${role === 'assistant' ? 'ai' : 'user'}`;
    if (role === 'assistant') row.innerHTML = `<span class="rp-avatar rp-avatar--sm">${scenario.characterEmoji}</span>`;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble--${role === 'assistant' ? 'ai' : 'user'}`;
    bubble.textContent = text;
    row.appendChild(bubble);
    qsR('#rpMessages').appendChild(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return bubble;
  }

  async function sendTurn(userText) {
    if (userText) { messages.push({ role: 'user', content: userText }); addBubble('user', userText); turn++; }
    qsR('#rpTurnCount').textContent = `Turno ${turn} / ${MAX_USER_TURNS}`;

    setAvatarState('thinking', `Pensando <span class="rp-dots"><span></span><span></span><span></span></span>`);
    const thinking = addBubble('assistant', '…');
    const sys = buildSystemPrompt(scenario, missions, turn);
    const msgsForCall = userText ? messages : [{ role: 'user', content: '(The user has just entered the roleplay. Begin now.)' }];
    const { text, error } = await callAI(sys, msgsForCall);
    thinking.parentElement.remove();

    if (error) {
      setAvatarState(null, idleLabel);
      addBubble('assistant', error === 'timeout' ? '(el servidor está despertando, intenta de nuevo en unos segundos)' : '(sin conexión con el servidor de IA ahora mismo)');
      return;
    }
    const parsed = parseAIJson(text);
    if (!parsed) { setAvatarState(null, idleLabel); addBubble('assistant', (text || '').trim()); return; }

    messages.push({ role: 'assistant', content: text });
    addBubble('assistant', parsed.npc_reply);
    setAvatarState('speaking', 'Hablando…');
    speakText(parsed.npc_reply, 1, null, { onEnd: () => setAvatarState(null, idleLabel) });

    (parsed.missions_completed || []).forEach(id => {
      if (!done.has(id)) { done.add(id); addCoins(10); }
    });
    qsR('#rpMissions').innerHTML = renderMissionChecklist(missions, done);
    qsR('#rpProgressFill').style.width = `${Math.round((done.size / missions.length) * 100)}%`;
    qsR('.rp-topbar__row span:last-child').textContent = `${done.size}/${missions.length} misiones`;
    if (parsed.missions_completed && parsed.missions_completed.length) celebrate('✅ ¡Misión cumplida!');

    if (parsed.scenario_complete || turn >= MAX_USER_TURNS) {
      ended = true;
      finish(parsed.scenario_complete);
    }
  }

  function finish(completo) {
    qsR('#rpForm').style.display = 'none';
    setAvatarState(null, completo ? '¡Escena completada!' : 'Se acabaron los turnos');
    if (completo) { addCoins(30); touchStreak(); }
    if (typeof pushNow === 'function') pushNow();
    const div = document.createElement('div');
    div.className = 'lesson-card';
    div.style.marginTop = '1.6rem';
    div.style.textAlign = 'center';
    div.innerHTML = `
      <span class="eyebrow">${completo ? '¡Escena completada!' : 'Se acabaron los turnos'}</span>
      <div style="font-size:2.6rem; margin:1rem 0;">${completo ? '🎉' : '⏱️'}</div>
      <p style="color:var(--gray-400); margin-bottom:1.6rem;">${done.size} de ${missions.length} misiones cumplidas.</p>
      <div style="display:flex; gap:.8rem; justify-content:center; flex-wrap:wrap;">
        <a href="roleplay.html" class="btn btn--primary">Elegir otro personaje</a>
        <a href="paquetes.html" class="btn btn--outline">Volver a paquetes</a>
      </div>
    `;
    qsR('#rpMessages').after(div);
  }

  qsR('#rpForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (ended) return;
    const input = qsR('#rpInput');
    const val = input.value.trim();
    if (!val) return;
    input.value = '';
    sendTurn(val);
  });

  sendTurn(null);
}

async function init() {
  const content = await loadContent();
  if (content.curso.id !== 'en') {
    document.getElementById('roleplayWrap').innerHTML = `
      <div class="rp-intro">
        <div class="rp-avatar-stage"><div class="rp-avatar">🎭</div></div>
        <h1 style="font-size:1.6rem;">El roleplay todavía solo existe en inglés</h1>
        <p style="color:var(--gray-300);">Los escenarios de roleplay no están traducidos a ${content.curso.nombre.toLowerCase()} todavía.</p>
        <a href="paquetes.html" class="btn btn--primary" style="margin-top:1.2rem;">Volver a paquetes</a>
      </div>`;
    return;
  }
  if (!pkgId) { renderPicker(content.roleplayScenarios); return; }
  const scenario = content.roleplayScenarios[pkgId];
  if (!scenario) { showToast('Escenario no encontrado.'); location.href = 'roleplay.html'; return; }
  renderIntro(scenario);
}

initAuthUI({ protect: true, onReady: init });
