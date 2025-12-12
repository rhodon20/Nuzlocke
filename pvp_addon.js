/* =========================================================
   PVP ADDON - LOCAL MULTIPLAYER (HOT SEAT)
   Autor: Gemini AI
========================================================= */

const PVP_CONFIG = {
    LEVEL: 70,
    TEAM_SIZE: 6,
    MOVE_COUNT: 4
};

// Estado exclusivo para el modo PVP
let pvpState = {
    active: false,
    p1: { name: 'Jugador 1', team: [], activeIdx: 0, pendingMove: null },
    p2: { name: 'Jugador 2', team: [], activeIdx: 0, pendingMove: null },
    turnPhase: 0, // 0: P1 Select, 1: P2 Select, 2: Execution
    roundCount: 0
};

// 1. INYECCIÓN DEL BOTÓN EN EL MENÚ PRINCIPAL
window.addEventListener('load', () => {
    const btnContainer = document.getElementById('start-buttons');
    if (btnContainer) {
        const btnPvP = document.createElement('button');
        btnPvP.innerHTML = "⚔️ 1 vs 1 (Local - Nuzlocke a ciegas)";
        btnPvP.style.background = "linear-gradient(135deg, #d32f2f, #b71c1c)";
        btnPvP.style.color = "#fff";
        btnPvP.style.padding = "14px";
        btnPvP.style.fontSize = "1.1rem";
        btnPvP.style.border = "none";
        btnPvP.style.marginTop = "10px";
        btnPvP.onclick = startPvPGame;
        btnContainer.appendChild(btnPvP);
    }
});

/* =========================================================
   CORE PVP LOGIC
========================================================= */

function startPvPGame() {
    pvpState.active = true;
    pvpState.turnPhase = 0;
    pvpState.roundCount = 0;
    
    // Generar Equipos Nuzlocke Nivel 70 Ciegos
    pvpState.p1.team = generateRandomTeam();
    pvpState.p2.team = generateRandomTeam();
    
    pvpState.p1.activeIdx = 0;
    pvpState.p2.activeIdx = 0;
    pvpState.p1.pendingMove = null;
    pvpState.p2.pendingMove = null;

    // Configurar UI inicial
    document.getElementById('start-buttons').style.display = 'none';
    document.getElementById('game-title').classList.add('hidden-title');
    document.getElementById('mode-display').innerText = '⚔️ DUELO 1vs1';
    
    // Ocultar elementos irrelevantes en PVP
    document.getElementById('btn-capture').style.display = 'none';
    document.getElementById('btn-potion').style.display = 'none';
    document.getElementById('btn-switch').disabled = true; // No switch allowed
    document.getElementById('btn-load').style.display = 'none';
    
    // Resetear contadores visuales
    document.getElementById('balls-val').innerText = "-";
    document.getElementById('pots-val').innerText = "-";
    document.getElementById('streak-val').innerText = "-";
    document.getElementById('badges-val').innerText = "-";

    log("⚔️ ¡Comienza el Duelo! Elige tu movimiento en secreto.");
    
    hijackGameFunctions(); // Sobrescribir funciones del juego base
    renderPvP();
}

function generateRandomTeam() {
    const team = [];
    const allKeys = Object.keys(POKEMON_SPECIES);
    
    for (let i = 0; i < PVP_CONFIG.TEAM_SIZE; i++) {
        const randomKey = allKeys[Math.floor(Math.random() * allKeys.length)];
        const mon = new Pokemon(randomKey, PVP_CONFIG.LEVEL, true); // true = moveset aleatorio
        // Forzar 4 movimientos aleatorios
        const allMoves = Object.keys(MOVES);
        mon.moves = [];
        while(mon.moves.length < 4) {
            const rndMove = allMoves[Math.floor(Math.random() * allMoves.length)];
            if (!mon.moves.includes(rndMove)) mon.moves.push(rndMove);
        }
        // Stats máximos
        mon.hp = mon.maxHp;
        team.push(mon);
    }
    return team;
}

/* =========================================================
   HIJACKING & RENDERING (Visual Magic)
========================================================= */

// Guardamos las funciones originales por si acaso
const originalRenderAll = window.renderAll;
const originalDoTurn = window.doTurn;

function hijackGameFunctions() {
    // Sobrescribir renderAll para que use la lógica PvP
    window.renderAll = renderPvP;
    
    // Sobrescribir doTurn para encolar movimientos
    window.doTurn = handlePvPInput;
}

function renderPvP() {
    // Si NO estamos en modo PVP, usar render original (seguridad)
    if (!pvpState.active) {
        if(originalRenderAll) originalRenderAll();
        return;
    }

    const phase = pvpState.turnPhase;
    const isExecution = phase === 2;

    // Determinar quién es el "Protagonista" (Abajo/Izquierda) según el turno
    // Si es turno de P1: P1 es Player, P2 es Rival
    // Si es turno de P2: P2 es Player, P1 es Rival (Espejo)
    // En Ejecución: Mostramos perspectiva de P1 por defecto
    
    let playerObj, opponentObj;
    let isP1View = (phase === 0 || phase === 2); 

    if (isP1View) {
        playerObj = pvpState.p1;
        opponentObj = pvpState.p2;
    } else {
        playerObj = pvpState.p2;
        opponentObj = pvpState.p1;
    }

    const pMon = playerObj.team[playerObj.activeIdx];
    const oMon = opponentObj.team[opponentObj.activeIdx];

    // Renderizar Cajas de Stats (Reutilizando funciones del DOM existentes)
    renderBoxManual(pMon, 'player-box', true, playerObj.name);
    renderBoxManual(oMon, 'opponent-box', false, opponentObj.name);

    // Sprites
    fetchSpriteManual(pMon, 'player-sprite-slot', true);
    fetchSpriteManual(oMon, 'opponent-sprite-slot', false);

    // Controles
    const controlsDiv = document.getElementById('move-controls');
    
    if (isExecution) {
        controlsDiv.innerHTML = `<button class="btn-move" disabled style="width:200%; background:#222;">⚡ Resolviendo turno... ⚡</button>`;
    } else {
        // Mostrar movimientos del jugador activo
        const movesHTML = pMon.moves.map(mKey => {
            const m = MOVES[mKey];
            return `
            <button class="btn-move type-${m.tipo}" onclick="doTurn('${mKey}')">
              ${m.nombre}<br><small>${m.tipo} / ${m.poder}</small>
            </button>
            `;
        }).join('');
        controlsDiv.innerHTML = movesHTML;
    }
    
    // Actualizar Log visualmente para indicar de quién es el turno
    const indicator = document.getElementById('mode-display');
    if (phase === 0) indicator.innerText = "Turno: Jugador 1";
    else if (phase === 1) indicator.innerText = "Turno: Jugador 2";
    else indicator.innerText = "Resolviendo...";
}

// Helpers de renderizado manual para no depender del estado global 'state'
function renderBoxManual(mon, id, isPlayer, labelName) {
    if (!mon) { document.getElementById(id).innerHTML = ""; return; }
    const hpPct = (mon.hp / mon.maxHp) * 100;
    const color = hpPct > 50 ? '#4caf50' : hpPct > 20 ? '#ffeb3b' : '#f44336';
    const statusHTML = mon.status ? `<span class="status-tag status-${mon.status}">${mon.status}</span>` : '';
    
    document.getElementById(id).innerHTML = `
      <div class="poke-name">
        <span>${mon.name}</span> 
        <span style="color:#aaa; font-size:0.7em">${labelName}</span>
      </div>
      <div class="hp-container">
        <div class="hp-fill" style="width:${hpPct}%; background:${color}"></div>
      </div>
      <div class="hp-text">${statusHTML} ${mon.hp}/${mon.maxHp}</div>
    `;
}

async function fetchSpriteManual(mon, slot, back) {
    if(!mon) return;
    // Reutiliza la lógica existente o hace un fetch simple
    // Copiamos la lógica básica del index.html original para consistencia
    const slug = SLUG_MAP[mon.name] || mon.name.toLowerCase();
    const uniqueId = `pvp-${mon.name}-${back?'b':'f'}`;
    const slotEl = document.getElementById(slot);
    const currentImg = slotEl.querySelector('img');
    
    if(currentImg && currentImg.dataset.uid === uniqueId) return;

    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${slug}`);
        const data = await res.json();
        const anim = data.sprites.versions['generation-v']['black-white'].animated;
        let src = back ? (anim.back_default || data.sprites.back_default) : (anim.front_default || data.sprites.front_default);
        if(!src) src = back ? data.sprites.back_default : data.sprites.front_default;
        slotEl.innerHTML = `<img src="${src}" class="sprite-img" data-uid="${uniqueId}">`;
    } catch(e) {
        slotEl.innerHTML = "❓";
    }
}

/* =========================================================
   TURN LOGIC
========================================================= */

function handlePvPInput(moveKey) {
    if (pvpState.turnPhase === 0) {
        // P1 Eligió
        pvpState.p1.pendingMove = moveKey;
        pvpState.turnPhase = 1;
        showInterTurnOverlay("Jugador 2");
    } else if (pvpState.turnPhase === 1) {
        // P2 Eligió
        pvpState.p2.pendingMove = moveKey;
        pvpState.turnPhase = 2;
        resolvePvPRound();
    }
}

function showInterTurnOverlay(nextPlayerName) {
    const overlay = document.createElement('div');
    overlay.id = 'pvp-curtain';
    overlay.style.position = 'absolute';
    overlay.style.top = '0'; overlay.style.left = '0';
    overlay.style.width = '100%'; overlay.style.height = '100%';
    overlay.style.background = '#0b1020';
    overlay.style.zIndex = '999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.innerHTML = `
        <h2 style="color:#ffd54a">🛑 ALTO 🛑</h2>
        <p>Pasa el dispositivo a:</p>
        <h1 style="color:#fff">${nextPlayerName}</h1>
        <button onclick="document.getElementById('pvp-curtain').remove(); renderPvP();" 
            style="padding:20px; font-size:1.2rem; margin-top:20px; background:#2196f3; color:white; border:none; border-radius:8px;">
            ¡Listo, soy ${nextPlayerName}!
        </button>
    `;
    document.getElementById('game-container').appendChild(overlay);
}

async function resolvePvPRound() {
    renderPvP(); // Bloquea controles y muestra perspectiva P1

    const p1Mon = pvpState.p1.team[pvpState.p1.activeIdx];
    const p2Mon = pvpState.p2.team[pvpState.p2.activeIdx];
    const m1 = MOVES[pvpState.p1.pendingMove];
    const m2 = MOVES[pvpState.p2.pendingMove];

    // Cálculo de Velocidad
    const s1 = p1Mon.getStat('spe');
    const s2 = p2Mon.getStat('spe');
    
    // Prioridad de movimientos
    const prio1 = (m1.nombre === 'Ataque Rápido' || m1.nombre === 'Velocidad Extrema') ? 1 : 0;
    const prio2 = (m2.nombre === 'Ataque Rápido' || m2.nombre === 'Velocidad Extrema') ? 1 : 0;

    let first, second, moveFirst, moveSecond, isP1First;

    if (prio1 > prio2) isP1First = true;
    else if (prio2 > prio1) isP1First = false;
    else {
        if (s1 > s2) isP1First = true;
        else if (s2 > s1) isP1First = false;
        else isP1First = Math.random() < 0.5; // Speed tie
    }

    if (isP1First) {
        first = { mon: p1Mon, move: m1, isP1: true };
        second = { mon: p2Mon, move: m2, isP1: false };
    } else {
        first = { mon: p2Mon, move: m2, isP1: false };
        second = { mon: p1Mon, move: m1, isP1: true };
    }

    // --- ACCIÓN 1 ---
    await executePvPMove(first.mon, second.mon, first.move, first.isP1);
    
    if (second.mon.hp <= 0) {
        await handlePvPFaint(second.isP1);
    } else {
        // --- ACCIÓN 2 ---
        await wait(500);
        await executePvPMove(second.mon, first.mon, second.move, second.isP1);
        
        if (first.mon.hp <= 0) {
            await handlePvPFaint(first.isP1);
        }
    }

    // Daño de estado (Burn/Poison) al final del turno
    if (p1Mon.hp > 0 && p2Mon.hp > 0) {
        await runStatusDamage(p1Mon, true); // Visualmente P1 es player
        await runStatusDamage(p2Mon, false); // Visualmente P2 es opponent (en la vista default)
        
        // Chequeo post-estado
        if (p1Mon.hp <= 0) await handlePvPFaint(true);
        else if (p2Mon.hp <= 0) await handlePvPFaint(false);
    }

    // Fin de ronda
    if (p1Mon.hp > 0 && p2Mon.hp > 0) {
        pvpState.turnPhase = 0;
        showInterTurnOverlay("Jugador 1");
    }
}

// Wrapper para reusar la función executeMove original
async function executePvPMove(attacker, defender, move, attackerIsP1) {
    // La función original usa `attackerSlot` basándose en "isPlayer".
    // En el render de ejecución (Fase 2), P1 siempre está abajo (Player) y P2 arriba (Opponent).
    // Por tanto, si attacker es P1 -> isPlayer = true.
    await executeMove(attacker, defender, move, attackerIsP1);
    renderPvP();
}

async function handlePvPFaint(isP1Dead) {
    const deadPlayer = isP1Dead ? pvpState.p1 : pvpState.p2;
    const deadMon = deadPlayer.team[deadPlayer.activeIdx];
    
    log(`☠️ ¡${deadMon.name} de ${deadPlayer.name} cayó!`);
    await wait(1000);

    // Buscar siguiente pokemon vivo
    let nextIdx = -1;
    for(let i = deadPlayer.activeIdx + 1; i < deadPlayer.team.length; i++) {
        if (deadPlayer.team[i].hp > 0) {
            nextIdx = i;
            break;
        }
    }

    if (nextIdx !== -1) {
        deadPlayer.activeIdx = nextIdx;
        const newMon = deadPlayer.team[nextIdx];
        log(`🔄 ${deadPlayer.name} envía a <b>${newMon.name}</b>!`);
        
        // Resetear fase para nuevo turno
        pvpState.turnPhase = 0; 
        showInterTurnOverlay("Jugador 1");
    } else {
        endPvPGame(!isP1Dead); // Si murió P1, gana P2 (false -> winner index logic inverted)
    }
}

function endPvPGame(p1Wins) {
    const winner = p1Wins ? "JUGADOR 1" : "JUGADOR 2";
    const color = p1Wins ? "#2196f3" : "#f44336";
    
    document.getElementById('game-container').innerHTML = `
        <div style="text-align:center; padding:20px;">
            <h1 style="color:${color}; font-size:3rem; margin-bottom:10px;">¡${winner} GANA!</h1>
            <p>Fin del combate.</p>
            
            <div style="margin-top:20px; text-align:left;">
                <h3 style="color:#2196f3">Equipo Jugador 1:</h3>
                <div style="font-size:0.8rem; display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                    ${pvpState.p1.team.map(p => `<div>${p.hp<=0?'💀':'❤️'} ${p.name}</div>`).join('')}
                </div>
                
                <h3 style="color:#f44336; margin-top:15px;">Equipo Jugador 2:</h3>
                <div style="font-size:0.8rem; display:grid; grid-template-columns:1fr 1fr; gap:5px;">
                    ${pvpState.p2.team.map(p => `<div>${p.hp<=0?'💀':'❤️'} ${p.name}</div>`).join('')}
                </div>
            </div>

            <button onclick="location.reload()" style="margin-top:30px; padding:15px; width:100%; background:#333; color:white; border:none; border-radius:8px;">
                Volver al Menú
            </button>
        </div>
    `;

}
