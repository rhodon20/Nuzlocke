/* =========================================================
   PVP ADDON - LOCAL MULTIPLAYER (HOT SEAT + DRAFT)
========================================================= */

const PVP_CONFIG = {
    LEVEL: 70,
    TEAM_SIZE: 6,
    MOVE_COUNT: 4,
    DRAFT_POOL: 16
};

let pvpState = {
    active: false,
    mode: 'local',
    online: {
        active: false,
        localSide: 1,
        awaitingLocalMove: false,
        statusText: ''
    },
    p1: { name: 'Jugador 1', team: [], activeIdx: 0, pendingMove: null },
    p2: { name: 'Jugador 2', team: [], activeIdx: 0, pendingMove: null },
    turnPhase: 0,
    roundCount: 0
};

let draftState = {
    active: false,
    pool: [],
    p1Picks: [],
    p2Picks: [],
    turnPlayer: 1
};

if (typeof window.registerGamePlugin === 'function') {
    window.registerGamePlugin({
        name: 'pvp-local',
        hooks: {
            beforeDoTurn(ctx) {
                if (!pvpState.active) return { handled: false };
                handlePvPInput(ctx.moveKey);
                return { handled: true };
            },
            afterRender(ctx) {
                if (!pvpState.active) return;
                if (ctx.mode !== 'pvp') renderPvP();
            }
        }
    });
}

window.addEventListener('load', () => {
    const btnContainer = document.getElementById('start-buttons');
    if (!btnContainer) return;

    const btnPvP = document.createElement('button');
    btnPvP.innerHTML = '⚔️ 1 vs 1 (Local)';
    btnPvP.style.background = 'linear-gradient(135deg, #d32f2f, #b71c1c)';
    btnPvP.style.color = '#fff';
    btnPvP.style.padding = '14px';
    btnPvP.style.fontSize = '1.1rem';
    btnPvP.style.border = 'none';
    btnPvP.style.marginTop = '10px';
    btnPvP.onclick = startPvPGame;
    btnContainer.appendChild(btnPvP);

    const btnDraft = document.createElement('button');
    btnDraft.innerHTML = '🧪 Draft 1 vs 1';
    btnDraft.style.background = 'linear-gradient(135deg, #00695c, #004d40)';
    btnDraft.style.color = '#fff';
    btnDraft.style.padding = '14px';
    btnDraft.style.fontSize = '1.1rem';
    btnDraft.style.border = 'none';
    btnDraft.onclick = startPvPDraft;
    btnContainer.appendChild(btnDraft);
});

function startPvPGame() {
    startPvPMatch(generateRandomTeam(), generateRandomTeam(), '⚔️ DUELO 1vs1');
}

function startPvPDraft() {
    draftState.active = true;
    draftState.turnPlayer = 1;
    draftState.p1Picks = [];
    draftState.p2Picks = [];

    const allKeys = Object.keys(POKEMON_SPECIES);
    const unique = new Set();
    while (unique.size < Math.min(PVP_CONFIG.DRAFT_POOL, allKeys.length)) {
        const key = allKeys[Math.floor(gameRandom() * allKeys.length)];
        unique.add(key);
    }
    draftState.pool = Array.from(unique);
    renderDraftOverlay();
}

function renderDraftOverlay() {
    let overlay = document.getElementById('pvp-draft-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pvp-draft-overlay';
        overlay.style.position = 'absolute';
        overlay.style.inset = '0';
        overlay.style.zIndex = '1400';
        overlay.style.background = 'rgba(11,16,32,0.98)';
        overlay.style.padding = '10px';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.gap = '8px';
        document.getElementById('game-container').appendChild(overlay);
    }

    const currentName = draftState.turnPlayer === 1 ? 'Jugador 1' : 'Jugador 2';
    const poolButtons = draftState.pool.map(key => {
        return `<button class="btn-action" onclick="pickDraftMon('${key}')" style="padding:8px">${key}</button>`;
    }).join('');

    overlay.innerHTML = `
      <h3 style="margin:0;color:#ffd54a">Draft PvP</h3>
      <div style="font-size:0.85rem">Turno: <b>${currentName}</b></div>
      <div style="font-size:0.8rem">J1 (${draftState.p1Picks.length}/${PVP_CONFIG.TEAM_SIZE}): ${draftState.p1Picks.join(', ') || '-'}</div>
      <div style="font-size:0.8rem">J2 (${draftState.p2Picks.length}/${PVP_CONFIG.TEAM_SIZE}): ${draftState.p2Picks.join(', ') || '-'}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;overflow:auto;max-height:55vh">${poolButtons}</div>
      <button class="btn-action" onclick="cancelDraftPvP()">Cancelar</button>
    `;
}

function pickDraftMon(key) {
    if (!draftState.active) return;
    const idx = draftState.pool.indexOf(key);
    if (idx < 0) return;
    draftState.pool.splice(idx, 1);

    if (draftState.turnPlayer === 1) draftState.p1Picks.push(key);
    else draftState.p2Picks.push(key);

    const full1 = draftState.p1Picks.length >= PVP_CONFIG.TEAM_SIZE;
    const full2 = draftState.p2Picks.length >= PVP_CONFIG.TEAM_SIZE;

    if (full1 && full2) {
        const team1 = buildTeamFromDraftKeys(draftState.p1Picks);
        const team2 = buildTeamFromDraftKeys(draftState.p2Picks);
        closeDraftOverlay();
        startPvPMatch(team1, team2, '🧪 DRAFT 1vs1');
        return;
    }

    if (!full1 && !full2) draftState.turnPlayer = draftState.turnPlayer === 1 ? 2 : 1;
    else draftState.turnPlayer = full1 ? 2 : 1;
    renderDraftOverlay();
}

function cancelDraftPvP() {
    closeDraftOverlay();
}

function closeDraftOverlay() {
    draftState.active = false;
    const overlay = document.getElementById('pvp-draft-overlay');
    if (overlay) overlay.remove();
}

window.pickDraftMon = pickDraftMon;
window.cancelDraftPvP = cancelDraftPvP;

function assignRandomMoves(mon) {
    const allMoves = Object.keys(MOVES);
    mon.moves = [];
    while (mon.moves.length < PVP_CONFIG.MOVE_COUNT) {
        const rndMove = allMoves[Math.floor(gameRandom() * allMoves.length)];
        if (!mon.moves.includes(rndMove)) mon.moves.push(rndMove);
    }
}

function buildTeamFromDraftKeys(keys) {
    return keys.map(key => {
        const mon = new Pokemon(key, PVP_CONFIG.LEVEL, true);
        assignRandomMoves(mon);
        mon.hp = mon.maxHp;
        return mon;
    });
}

function generateRandomTeam() {
    const team = [];
    const allKeys = Object.keys(POKEMON_SPECIES);

    for (let i = 0; i < PVP_CONFIG.TEAM_SIZE; i++) {
        const randomKey = allKeys[Math.floor(gameRandom() * allKeys.length)];
        const mon = new Pokemon(randomKey, PVP_CONFIG.LEVEL, true);
        assignRandomMoves(mon);
        mon.hp = mon.maxHp;
        team.push(mon);
    }
    return team;
}

function startPvPMatch(team1, team2, modeLabel, opts = {}) {
    pvpState.active = true;
    pvpState.mode = opts.mode === 'online' ? 'online' : 'local';
    pvpState.online.active = pvpState.mode === 'online';
    pvpState.online.localSide = (opts.onlineLocalSide === 2) ? 2 : 1;
    pvpState.online.awaitingLocalMove = pvpState.mode === 'online';
    pvpState.online.statusText = pvpState.mode === 'online' ? 'Esperando movimiento local.' : '';
    pvpState.turnPhase = 0;
    pvpState.roundCount = 0;
    pvpState.p1.team = team1;
    pvpState.p2.team = team2;
    pvpState.p1.activeIdx = 0;
    pvpState.p2.activeIdx = 0;
    pvpState.p1.pendingMove = null;
    pvpState.p2.pendingMove = null;
    if (typeof resetBattleField === 'function') resetBattleField();

    document.getElementById('start-buttons').style.display = 'none';
    document.getElementById('game-title').classList.add('hidden-title');
    document.getElementById('mode-display').innerText = modeLabel;
    document.getElementById('btn-capture').style.display = 'none';
    document.getElementById('btn-potion').style.display = 'none';
    document.getElementById('btn-switch').disabled = true;
    document.getElementById('btn-load').style.display = 'none';
    const exportBtn = document.getElementById('btn-export-log');
    if (exportBtn) exportBtn.style.display = 'none';
    const replayBtn = document.getElementById('btn-import-replay');
    if (replayBtn) replayBtn.style.display = 'none';

    document.getElementById('balls-val').innerText = '-';
    document.getElementById('pots-val').innerText = '-';
    document.getElementById('streak-val').innerText = '-';
    document.getElementById('badges-val').innerText = '-';

    if (pvpState.mode === 'online') log('🌐 PvP Online conectado. Esperando sincronizacion.');
    else log('⚔️ ¡Comienza el duelo! Elige tu movimiento en secreto.');
    renderPvP();
}

function renderPvP() {
    if (!pvpState.active) return;

    if (pvpState.mode === 'online') {
        renderPvPOnline();
        return;
    }

    const phase = pvpState.turnPhase;
    const isExecution = phase === 2;

    let playerObj, opponentObj;
    const isP1View = (phase === 0 || phase === 2);

    if (isP1View) {
        playerObj = pvpState.p1;
        opponentObj = pvpState.p2;
    } else {
        playerObj = pvpState.p2;
        opponentObj = pvpState.p1;
    }

    const pMon = playerObj.team[playerObj.activeIdx];
    const oMon = opponentObj.team[opponentObj.activeIdx];

    renderBoxManual(pMon, 'player-box', true, playerObj.name);
    renderBoxManual(oMon, 'opponent-box', false, opponentObj.name);

    fetchSpriteManual(pMon, 'player-sprite-slot', true);
    fetchSpriteManual(oMon, 'opponent-sprite-slot', false);

    const controlsDiv = document.getElementById('move-controls');

    if (isExecution) {
        controlsDiv.innerHTML = '<button class="btn-move" disabled style="width:200%; background:#222;">⏳ Resolviendo turno...</button>';
    } else {
        const movesHTML = pMon.moves.map(mKey => {
            const m = MOVES[mKey];
            const cd = typeof getMoveCooldown === 'function' ? getMoveCooldown(pMon, mKey) : 0;
            const dis = typeof isMoveDisabled === 'function' ? isMoveDisabled(pMon, mKey) : false;
            const disabled = cd > 0 || dis;
            const cdText = cd > 0 ? ` / CD ${cd}` : '';
            const disText = dis ? ' / ANULADO' : '';
            return `
            <button class="btn-move type-${m.tipo}" onclick="doTurn('${mKey}')" ${disabled ? 'disabled' : ''}>
              ${m.nombre}<br><small>${m.tipo} / ${m.poder}${cdText}${disText}</small>
            </button>
            `;
        }).join('');
        controlsDiv.innerHTML = movesHTML;

        anime({
            targets: '.btn-move',
            translateY: [20, 0],
            opacity: [0, 1],
            delay: anime.stagger(50),
            easing: 'easeOutQuad'
        });
    }

    const indicator = document.getElementById('mode-display');
    if (phase === 0) indicator.innerText = 'Turno: Jugador 1';
    else if (phase === 1) indicator.innerText = 'Turno: Jugador 2';
    else indicator.innerText = 'Resolviendo...';

    if (typeof runPluginHook === 'function') {
        runPluginHook('afterRender', { mode: 'pvp', pvpState });
    }
}

function renderPvPOnline() {
    const localIsP1 = pvpState.online.localSide === 1;
    const playerObj = localIsP1 ? pvpState.p1 : pvpState.p2;
    const opponentObj = localIsP1 ? pvpState.p2 : pvpState.p1;
    const pMon = playerObj.team[playerObj.activeIdx];
    const oMon = opponentObj.team[opponentObj.activeIdx];

    renderBoxManual(pMon, 'player-box', true, playerObj.name);
    renderBoxManual(oMon, 'opponent-box', false, opponentObj.name);
    fetchSpriteManual(pMon, 'player-sprite-slot', true);
    fetchSpriteManual(oMon, 'opponent-sprite-slot', false);

    const controlsDiv = document.getElementById('move-controls');
    const canAct = !!pvpState.online.awaitingLocalMove && pMon && pMon.hp > 0;
    const info = pvpState.online.statusText || (canAct ? 'Elige tu movimiento.' : 'Esperando rival...');

    if (!pMon || !Array.isArray(pMon.moves)) {
        controlsDiv.innerHTML = `<button class="btn-move" disabled style="width:200%; background:#222;">${info}</button>`;
    } else if (!canAct) {
        controlsDiv.innerHTML = `<button class="btn-move" disabled style="width:200%; background:#222;">${info}</button>`;
    } else {
        controlsDiv.innerHTML = pMon.moves.map(mKey => {
            const m = MOVES[mKey];
            if (!m) return '';
            const cd = typeof getMoveCooldown === 'function' ? getMoveCooldown(pMon, mKey) : 0;
            const dis = typeof isMoveDisabled === 'function' ? isMoveDisabled(pMon, mKey) : false;
            const disabled = cd > 0 || dis;
            const cdText = cd > 0 ? ` / CD ${cd}` : '';
            const disText = dis ? ' / ANULADO' : '';
            return `
            <button class="btn-move type-${m.tipo}" onclick="doTurn('${mKey}')" ${disabled ? 'disabled' : ''}>
              ${m.nombre}<br><small>${m.tipo} / ${m.poder}${cdText}${disText}</small>
            </button>
            `;
        }).join('');
    }

    const indicator = document.getElementById('mode-display');
    indicator.innerText = `Online ${localIsP1 ? 'P1' : 'P2'} | Ronda ${pvpState.roundCount + 1}`;

    if (typeof runPluginHook === 'function') {
        runPluginHook('afterRender', { mode: 'pvp', pvpState });
    }
}

function renderBoxManual(mon, id, isPlayer, labelName) {
    const container = document.getElementById(id);
    if (!mon) { container.innerHTML = ''; return; }

    const hpPct = (mon.hp / mon.maxHp) * 100;
    const color = hpPct > 50 ? '#4caf50' : hpPct > 20 ? '#ffeb3b' : '#f44336';
    const statusHTML = mon.status ? `<span class="status-tag status-${mon.status}">${mon.status}</span>` : '';

    const currentMonName = container.dataset.monName;

    if (currentMonName !== mon.name) {
        container.innerHTML = `
          <div class="poke-name">
            <span>${mon.name}</span>
            <span style="color:#aaa; font-size:0.7em">${labelName}</span>
          </div>
          <div class="hp-container">
            <div class="hp-fill" style="width:${hpPct}%; background-color:${color}"></div>
          </div>
          <div class="hp-text">${statusHTML} ${mon.hp}/${mon.maxHp}</div>
        `;
        container.dataset.monName = mon.name;
    } else {
        const hpText = container.querySelector('.hp-text');

        anime({
            targets: `#${id} .hp-fill`,
            width: `${hpPct}%`,
            backgroundColor: color,
            easing: 'easeOutElastic(1, .8)',
            duration: 800
        });

        hpText.innerHTML = `${statusHTML} ${mon.hp}/${mon.maxHp}`;
    }
}

async function fetchSpriteManual(mon, slot, back) {
    if (!mon) return;
    const uniqueId = `pvp-${mon.name}-${mon.isShiny ? 'shiny' : 'norm'}-${back ? 'b' : 'f'}`;
    const slotEl = document.getElementById(slot);
    const currentImg = slotEl.querySelector('img');

    if (currentImg && currentImg.dataset.uid === uniqueId) return;

    try {
        const src = (typeof window.getSpriteSource === 'function')
            ? await window.getSpriteSource(mon, back)
            : null;
        if (!src) throw new Error('Sprite no encontrado');

        slotEl.innerHTML = `<img src="${src}" class="sprite-img" data-uid="${uniqueId}">`;

        anime({
            targets: slotEl.querySelector('img'),
            opacity: [0, 1],
            translateY: [10, 0],
            easing: 'easeOutQuad'
        });

    } catch (e) {
        slotEl.innerHTML = '?';
    }
}

function handlePvPInput(moveKey) {
    if (pvpState.mode === 'online') {
        if (typeof window.handleOnlinePvPInput === 'function') {
            window.handleOnlinePvPInput(moveKey);
        }
        return;
    }

    const actingPlayer = pvpState.turnPhase === 0 ? pvpState.p1 : pvpState.p2;
    const actingMon = actingPlayer.team[actingPlayer.activeIdx];
    if (typeof getMoveCooldown === 'function' && getMoveCooldown(actingMon, moveKey) > 0) {
        log(`Movimiento en cooldown para ${actingMon.name}.`);
        renderPvP();
        return;
    }
    if (typeof isMoveDisabled === 'function' && isMoveDisabled(actingMon, moveKey)) {
        log(`Movimiento anulado para ${actingMon.name}.`);
        renderPvP();
        return;
    }

    if (pvpState.turnPhase === 0) {
        pvpState.p1.pendingMove = moveKey;
        pvpState.turnPhase = 1;
        showInterTurnOverlay('Jugador 2');
    } else if (pvpState.turnPhase === 1) {
        pvpState.p2.pendingMove = moveKey;
        pvpState.turnPhase = 2;
        resolvePvPRound();
    }
}

function showInterTurnOverlay(nextPlayerName) {
    const overlay = document.createElement('div');
    overlay.id = 'pvp-curtain';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = '#0b1020';
    overlay.style.zIndex = '999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = `
        <h2 style="color:#ffd54a">⚠️ ALTO ⚠️</h2>
        <p>Pasa el dispositivo a:</p>
        <h1 style="color:#fff">${nextPlayerName}</h1>
        <button id="btn-ready-pvp" onclick="document.getElementById('pvp-curtain').remove(); renderPvP();"
            style="padding:20px; font-size:1.2rem; margin-top:20px; background:#2196f3; color:white; border:none; border-radius:8px; opacity:0;">
            ¡Listo, soy ${nextPlayerName}!
        </button>
    `;
    document.getElementById('game-container').appendChild(overlay);

    anime({
        targets: '#btn-ready-pvp',
        opacity: [0, 1],
        translateY: [20, 0],
        delay: 500,
        easing: 'easeOutQuad'
    });
}

async function resolvePvPRound() {
    renderPvP();
    pvpState.roundCount = (pvpState.roundCount || 0) + 1;

    const p1Mon = pvpState.p1.team[pvpState.p1.activeIdx];
    const p2Mon = pvpState.p2.team[pvpState.p2.activeIdx];
    const m1 = MOVES[pvpState.p1.pendingMove];
    const m2 = MOVES[pvpState.p2.pendingMove];

    const s1 = p1Mon.getStat('spe');
    const s2 = p2Mon.getStat('spe');

    const prio1 = (pvpState.p1.pendingMove === 'Quick Attack' || pvpState.p1.pendingMove === 'Extreme Speed') ? 1 : 0;
    const prio2 = (pvpState.p2.pendingMove === 'Quick Attack' || pvpState.p2.pendingMove === 'Extreme Speed') ? 1 : 0;

    let first, second, isP1First;

    if (prio1 > prio2) isP1First = true;
    else if (prio2 > prio1) isP1First = false;
    else {
        if (s1 > s2) isP1First = true;
        else if (s2 > s1) isP1First = false;
        else isP1First = gameRandom() < 0.5;
    }

    if (isP1First) {
        first = { mon: p1Mon, move: m1, isP1: true };
        second = { mon: p2Mon, move: m2, isP1: false };
    } else {
        first = { mon: p2Mon, move: m2, isP1: false };
        second = { mon: p1Mon, move: m1, isP1: true };
    }

    await executePvPMove(first.mon, second.mon, first.move, first.isP1, {
        canFlinchTarget: true,
        moveKey: first.isP1 ? pvpState.p1.pendingMove : pvpState.p2.pendingMove
    });

    if (second.mon.hp <= 0 || first.mon.hp <= 0) {
        await resolvePendingPvPFaints();
        if (!pvpState.active) return;
    } else {
        await wait(500);
        await executePvPMove(second.mon, first.mon, second.move, second.isP1, {
            canFlinchTarget: false,
            moveKey: second.isP1 ? pvpState.p1.pendingMove : pvpState.p2.pendingMove
        });
        await resolvePendingPvPFaints();
        if (!pvpState.active) return;
    }

    const endP1 = pvpState.p1.team[pvpState.p1.activeIdx];
    const endP2 = pvpState.p2.team[pvpState.p2.activeIdx];
    if (endP1 && endP2 && endP1.hp > 0 && endP2.hp > 0) {
        await runStatusDamage(endP1, true);
        await runStatusDamage(endP2, false);
        if (typeof runLeechSeed === 'function') {
            if (endP1.hp > 0) runLeechSeed(endP1, true);
            if (endP2.hp > 0) runLeechSeed(endP2, false);
        }
        if (typeof runPerishCountdown === 'function') {
            if (endP1.hp > 0) runPerishCountdown(endP1, true);
            if (endP2.hp > 0) runPerishCountdown(endP2, false);
        }
        if (typeof runWeatherDamage === 'function') {
            if (endP1.hp > 0) runWeatherDamage(endP1);
            if (endP2.hp > 0) runWeatherDamage(endP2);
        }
        if (typeof runBattleEventEndTurn === 'function') {
            if (endP1.hp > 0) runBattleEventEndTurn(endP1);
            if (endP2.hp > 0) runBattleEventEndTurn(endP2);
        }
        if (typeof decayCombo === 'function') {
            decayCombo(endP1);
            decayCombo(endP2);
        }
        if (typeof tickFieldEndTurn === 'function') tickFieldEndTurn();
        await resolvePendingPvPFaints();
        if (!pvpState.active) return;
    }

    const curP1 = pvpState.p1.team[pvpState.p1.activeIdx];
    const curP2 = pvpState.p2.team[pvpState.p2.activeIdx];
    const bothSidesCanContinue = !!curP1 && !!curP2 && curP1.hp > 0 && curP2.hp > 0;

    if (bothSidesCanContinue) {
        if (pvpState.mode === 'online') {
            if (typeof window.onOnlinePvPRoundResolved === 'function') {
                window.onOnlinePvPRoundResolved();
            }
        } else {
            pvpState.turnPhase = 0;
            showInterTurnOverlay('Jugador 1');
        }
    }
}

async function resolvePendingPvPFaints() {
    let guard = 0;
    while (guard < 12) {
        guard++;
        if (!pvpState.active) return;

        const p1Mon = pvpState.p1.team[pvpState.p1.activeIdx];
        const p2Mon = pvpState.p2.team[pvpState.p2.activeIdx];
        const p1Dead = !p1Mon || p1Mon.hp <= 0;
        const p2Dead = !p2Mon || p2Mon.hp <= 0;
        if (!p1Dead && !p2Dead) return;

        if (p1Dead) {
            await handlePvPFaint(true);
            if (!pvpState.active) return;
        }
        if (p2Dead) {
            await handlePvPFaint(false);
            if (!pvpState.active) return;
        }
    }
}

async function executePvPMove(attacker, defender, move, attackerIsP1, turnMeta = {}) {
    await executeMove(attacker, defender, move, attackerIsP1, turnMeta);
    renderPvP();
}

async function handlePvPFaint(isP1Dead) {
    const deadPlayer = isP1Dead ? pvpState.p1 : pvpState.p2;
    const deadMon = deadPlayer.team[deadPlayer.activeIdx];
    deadMon.leechSeedBySide = null;
    deadMon.perishTurns = 0;
    deadMon.comboStacks = 0;
    deadMon.lastMoveType = null;

    log(`☠️ ¡${deadMon.name} de ${deadPlayer.name} cayó!`);
    await wait(1000);

    let nextIdx = -1;
    for (let i = deadPlayer.activeIdx + 1; i < deadPlayer.team.length; i++) {
        if (deadPlayer.team[i].hp > 0) {
            nextIdx = i;
            break;
        }
    }

    if (nextIdx !== -1) {
        deadPlayer.activeIdx = nextIdx;
        const newMon = deadPlayer.team[nextIdx];
        if (typeof applyEntryHazards === 'function') {
            applyEntryHazards(newMon, deadPlayer === pvpState.p1);
        }
        if (newMon.hp <= 0) {
            log(`☠️ ${newMon.name} cayó al entrar por Púas.`);
            await wait(500);
            await handlePvPFaint(isP1Dead);
            return;
        }
        log(`🔄 ${deadPlayer.name} envía a <b>${newMon.name}</b>!`);

        if (pvpState.mode === 'online') {
            pvpState.turnPhase = 0;
            renderPvP();
        } else {
            pvpState.turnPhase = 0;
            showInterTurnOverlay('Jugador 1');
        }
    } else {
        endPvPGame(!isP1Dead);
    }
}

function endPvPGame(p1Wins) {
    if (pvpState.mode === 'online' && typeof window.onOnlinePvPEnd === 'function') {
        window.onOnlinePvPEnd(!!p1Wins);
    }
    pvpState.active = false;
    if (pvpState.online) pvpState.online.awaitingLocalMove = false;

    const winner = p1Wins ? 'JUGADOR 1' : 'JUGADOR 2';
    const color = p1Wins ? '#2196f3' : '#f44336';
    const isOnline = pvpState.mode === 'online';
    const onlineActions = isOnline ? `
            <button onclick="onlinePvPRequestImmediateRematch()" style="margin-top:18px; padding:15px; width:100%; background:#00695c; color:white; border:none; border-radius:8px;">
                Revancha inmediata
            </button>
            <button onclick="onlinePvPDisconnect()" style="margin-top:8px; padding:15px; width:100%; background:#37474f; color:white; border:none; border-radius:8px;">
                Cerrar conexion online
            </button>
    ` : '';

    const container = document.getElementById('game-container');
    container.innerHTML = `
        <div style="text-align:center; padding:20px; opacity:0;" id="end-screen">
            <h1 style="color:${color}; font-size:3rem; margin-bottom:10px;">¡${winner} GANA!</h1>
            <p>Fin del combate.</p>

            <div style="margin-top:20px; text-align:left;">
                <h3 style="color:#2196f3">Equipo Jugador 1:</h3>
                <div style="font-size:0.8rem; display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                    ${pvpState.p1.team.map(p => `<div>${p.hp <= 0 ? '💀' : '✅'} ${p.name}</div>`).join('')}
                </div>

                <h3 style="color:#f44336; margin-top:15px;">Equipo Jugador 2:</h3>
                <div style="font-size:0.8rem; display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                    ${pvpState.p2.team.map(p => `<div>${p.hp <= 0 ? '💀' : '✅'} ${p.name}</div>`).join('')}
                </div>
            </div>

            ${onlineActions}
            <button onclick="location.reload()" style="margin-top:30px; padding:15px; width:100%; background:#333; color:white; border:none; border-radius:8px;">
                Volver al Menú
            </button>
        </div>
    `;

    anime({
        targets: '#end-screen',
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: 1000,
        easing: 'easeOutElastic(1, .8)'
    });
}

function exportPvPSnapshot() {
    return {
        roundCount: pvpState.roundCount,
        p1: {
            name: pvpState.p1.name,
            activeIdx: pvpState.p1.activeIdx,
            team: JSON.parse(JSON.stringify(pvpState.p1.team))
        },
        p2: {
            name: pvpState.p2.name,
            activeIdx: pvpState.p2.activeIdx,
            team: JSON.parse(JSON.stringify(pvpState.p2.team))
        }
    };
}

function importPvPSnapshot(snapshot) {
    if (!snapshot || !snapshot.p1 || !snapshot.p2) return;
    pvpState.roundCount = Number.isFinite(snapshot.roundCount) ? snapshot.roundCount : 0;
    pvpState.p1 = {
        name: snapshot.p1.name || 'Jugador 1',
        activeIdx: Number.isFinite(snapshot.p1.activeIdx) ? snapshot.p1.activeIdx : 0,
        pendingMove: null,
        team: Array.isArray(snapshot.p1.team) ? snapshot.p1.team : []
    };
    pvpState.p2 = {
        name: snapshot.p2.name || 'Jugador 2',
        activeIdx: Number.isFinite(snapshot.p2.activeIdx) ? snapshot.p2.activeIdx : 0,
        pendingMove: null,
        team: Array.isArray(snapshot.p2.team) ? snapshot.p2.team : []
    };
}

window.exportPvPSnapshot = exportPvPSnapshot;
window.importPvPSnapshot = importPvPSnapshot;



