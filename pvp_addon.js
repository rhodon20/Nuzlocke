/* =========================================================
   PVP ADDON - LOCAL MULTIPLAYER (HOT SEAT)
   Autor: Gemini AI (Updated with Anime.js)
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
        btnPvP.innerHTML = "⚔️ 1 vs 1 (Local)";
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
    document.getElementById('btn-switch').disabled = true; 
    document.getElementById('btn-load').style.display = 'none';
    
    // Resetear contadores visuales
    document.getElementById('balls-val').innerText = "-";
    document.getElementById('pots-val').innerText = "-";
    document.getElementById('streak-val').innerText = "-";
    document.getElementById('badges-val').innerText = "-";

    log("⚔️ ¡Comienza el Duelo! Elige tu movimiento en secreto.");
    
    hijackGameFunctions(); 
    renderPvP();
}

function generateRandomTeam() {
    const team = [];
    const allKeys = Object.keys(POKEMON_SPECIES);
    
    for (let i = 0; i < PVP_CONFIG.TEAM_SIZE; i++) {
        const randomKey = allKeys[Math.floor(Math.random() * allKeys.length)];
        const mon = new Pokemon(randomKey, PVP_CONFIG.LEVEL, true); 
        const allMoves = Object.keys(MOVES);
        mon.moves = [];
        while(mon.moves.length < 4) {
            const rndMove = allMoves[Math.floor(Math.random() * allMoves.length)];
            if (!mon.moves.includes(rndMove)) mon.moves.push(rndMove);
        }
        mon.hp = mon.maxHp;
        team.push(mon);
    }
    return team;
}

/* =========================================================
   HIJACKING & RENDERING (Visual Magic)
========================================================= */

const originalRenderAll = window.renderAll;
const originalDoTurn = window.doTurn;

function hijackGameFunctions() {
    window.renderAll = renderPvP;
    window.doTurn = handlePvPInput;
}

function renderPvP() {
    if (!pvpState.active) {
        if(originalRenderAll) originalRenderAll();
        return;
    }

    const phase = pvpState.turnPhase;
    const isExecution = phase === 2;

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

    renderBoxManual(pMon, 'player-box', true, playerObj.name);
    renderBoxManual(oMon, 'opponent-box', false, opponentObj.name);

    fetchSpriteManual(pMon, 'player-sprite-slot', true);
    fetchSpriteManual(oMon, 'opponent-sprite-slot', false);

    const controlsDiv = document.getElementById('move-controls');
    
    if (isExecution) {
        controlsDiv.innerHTML = `<button class="btn-move" disabled style="width:200%; background:#222;">⚡ Resolviendo turno... ⚡</button>`;
    } else {
        const movesHTML = pMon.moves.map(mKey => {
            const m = MOVES[mKey];
            return `
            <button class="btn-move type-${m.tipo}" onclick="doTurn('${mKey}')">
              ${m.nombre}<br><small>${m.tipo} / ${m.poder}</small>
            </button>
            `;
        }).join('');
        controlsDiv.innerHTML = movesHTML;
        
        // Animación de entrada de botones
        anime({
            targets: '.btn-move',
            translateY: [20, 0],
            opacity: [0, 1],
            delay: anime.stagger(50),
            easing: 'easeOutQuad'
        });
    }
    
    const indicator = document.getElementById('mode-display');
    if (phase === 0) indicator.innerText = "Turno: Jugador 1";
    else if (phase === 1) indicator.innerText = "Turno: Jugador 2";
    else indicator.innerText = "Resolviendo...";
}

// Helpers de renderizado manual adaptados para AnimeJS
function renderBoxManual(mon, id, isPlayer, labelName) {
    const container = document.getElementById(id);
    if (!mon) { container.innerHTML = ""; return; }
    
    const hpPct = (mon.hp / mon.maxHp) * 100;
    const color = hpPct > 50 ? '#4caf50' : hpPct > 20 ? '#ffeb3b' : '#f44336';
    const statusHTML = mon.status ? `<span class="status-tag status-${mon.status}">${mon.status}</span>` : '';

    // Lógica de "Update vs Create" igual que index.html
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
    if(!mon) return;
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
        
        anime({
            targets: slotEl.querySelector('img'),
            opacity: [0, 1],
            translateY: [10, 0],
            easing: 'easeOutQuad'
        });

    } catch(e) {
        slotEl.innerHTML = "❓";
    }
}

/* =========================================================
   TURN LOGIC
========================================================= */

function handlePvPInput(moveKey) {
    if (pvpState.turnPhase === 0) {
        pvpState.p1.pendingMove = moveKey;
        pvpState.turnPhase = 1;
        showInterTurnOverlay("Jugador 2");
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
        <button id="btn-ready-pvp" onclick="document.getElementById('pvp-curtain').remove(); renderPvP();" 
            style="padding:20px; font-size:1.2rem; margin-top:20px; background:#2196f3; color:white; border:none; border-radius:8px; opacity:0;">
            ¡Listo, soy ${nextPlayerName}!
        </button>
    `;
    document.getElementById('game-container').appendChild(overlay);
    
    // AnimeJS entrada suave
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

    const p1Mon = pvpState.p1.team[pvpState.p1.activeIdx];
    const p2Mon = pvpState.p2.team[pvpState.p2.activeIdx];
    const m1 = MOVES[pvpState.p1.pendingMove];
    const m2 = MOVES[pvpState.p2.pendingMove];

    const s1 = p1Mon.getStat('spe');
    const s2 = p2Mon.getStat('spe');
    
    const prio1 = (m1.nombre === 'Ataque Rápido' || m1.nombre === 'Velocidad Extrema') ? 1 : 0;
    const prio2 = (m2.nombre === 'Ataque Rápido' || m2.nombre === 'Velocidad Extrema') ? 1 : 0;

    let first, second, moveFirst, moveSecond, isP1First;

    if (prio1 > prio2) isP1First = true;
    else if (prio2 > prio1) isP1First = false;
    else {
        if (s1 > s2) isP1First = true;
        else if (s2 > s1) isP1First = false;
        else isP1First = Math.random() < 0.5;
    }

    if (isP1First) {
        first = { mon: p1Mon, move: m1, isP1: true };
        second = { mon: p2Mon, move: m2, isP1: false };
    } else {
        first = { mon: p2Mon, move: m2, isP1: false };
        second = { mon: p1Mon, move: m1, isP1: true };
    }

    await executePvPMove(first.mon, second.mon, first.move, first.isP1);
    
    if (second.mon.hp <= 0) {
        await handlePvPFaint(second.isP1);
    } else {
        await wait(500);
        await executePvPMove(second.mon, first.mon, second.move, second.isP1);
        
        if (first.mon.hp <= 0) {
            await handlePvPFaint(first.isP1);
        }
    }

    if (p1Mon.hp > 0 && p2Mon.hp > 0) {
        await runStatusDamage(p1Mon, true); 
        await runStatusDamage(p2Mon, false); 
        
        if (p1Mon.hp <= 0) await handlePvPFaint(true);
        else if (p2Mon.hp <= 0) await handlePvPFaint(false);
    }

    if (p1Mon.hp > 0 && p2Mon.hp > 0) {
        pvpState.turnPhase = 0;
        showInterTurnOverlay("Jugador 1");
    }
}

async function executePvPMove(attacker, defender, move, attackerIsP1) {
    await executeMove(attacker, defender, move, attackerIsP1);
    renderPvP();
}

async function handlePvPFaint(isP1Dead) {
    const deadPlayer = isP1Dead ? pvpState.p1 : pvpState.p2;
    const deadMon = deadPlayer.team[deadPlayer.activeIdx];
    
    log(`☠️ ¡${deadMon.name} de ${deadPlayer.name} cayó!`);
    await wait(1000);

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
        
        pvpState.turnPhase = 0; 
        showInterTurnOverlay("Jugador 1");
    } else {
        endPvPGame(!isP1Dead); 
    }
}

function endPvPGame(p1Wins) {
    const winner = p1Wins ? "JUGADOR 1" : "JUGADOR 2";
    const color = p1Wins ? "#2196f3" : "#f44336";
    
    const container = document.getElementById('game-container');
    container.innerHTML = `
        <div style="text-align:center; padding:20px; opacity:0;" id="end-screen">
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

    anime({
        targets: '#end-screen',
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: 1000,
        easing: 'easeOutElastic(1, .8)'
    });
}