/* =========================================================
   ADVANCED AI LOGIC
   Description: IA mejorada que calcula daño y prioridades.
========================================================= */

// Sobrescribimos la función doTurn original
// NOTA: Esto solo afecta al modo 1 jugador. El PvP usa su propia lógica.
const originalDoTurnAI = window.doTurn;

window.doTurn = async function(moveKey) {
    // Si estamos en medio de un turno o algo raro, salimos
    if (window.turnLock) return;
    
    // Inyectamos nuestra lógica de selección para el oponente ANTES de llamar a la lógica de turno
    // Pero como doTurn original calcula el movimiento dentro, tenemos que REEMPLAZAR doTurn completamente
    // O... más inteligente: Modificamos el objeto 'opponent' temporalmente para que su "random move" sea el que queremos.
    
    // Al ser una función asíncrona compleja en index.html, lo mejor es copiar la estructura 
    // y cambiar SOLO la línea de elección del rival.
    
    // ... Espera, para evitar copiar 100 líneas de código y desincronizar versiones:
    // Vamos a "trucar" el Math.random solo para el turno del oponente o 
    // forzar la elección del movimiento sobrescribiendo la propiedad 'moves' temporalmente es arriesgado.
    
    // MEJOR OPCIÓN: Reescribir doTurn simplificado invocando funciones auxiliares existentes.
    // Para asegurar compatibilidad total, pegaré la versión mejorada de doTurn aquí.
    
    if(window.turnLock) return;
    window.turnLock = true;
  
    const player = state.team[state.activeIdx];
    const playerMove = MOVES[moveKey];
  
    // --- AI LOGIC START ---
    let oppMoveKey = null;
    if(opponent.moves.length > 0) {
        oppMoveKey = getBestAIMove(opponent, player);
    }
    const oppMove = oppMoveKey ? MOVES[oppMoveKey] : null;
    // --- AI LOGIC END ---

    // El resto es idéntico a la lógica original de index.html
    const pSpeed = player.getStat('spe');
    const oSpeed = opponent.getStat('spe');
  
    let first, second;
    let moveFirst, moveSecond;
    let isPlayerFirst;

    const pPrio = (playerMove.nombre === 'Ataque Rápido' || playerMove.nombre === 'Velocidad Extrema') ? 1 : 0;
    const oPrio = (oppMove && (oppMove.nombre === 'Ataque Rápido' || oppMove.nombre === 'Velocidad Extrema')) ? 1 : 0;

    if (pPrio > oPrio) isPlayerFirst = true;
    else if (oPrio > pPrio) isPlayerFirst = false;
    else {
        if (pSpeed >= oSpeed) isPlayerFirst = (pSpeed === oSpeed) ? Math.random() < 0.5 : true;
        else isPlayerFirst = false;
    }

    if (isPlayerFirst) {
        first = player; moveFirst = playerMove;
        second = opponent; moveSecond = oppMove;
    } else {
        first = opponent; moveFirst = oppMove;
        second = player; moveSecond = playerMove;
    }

    renderAll(); 

    // ACTION 1
    await executeMove(first, second, moveFirst, isPlayerFirst);
    renderAll();

    if (second.hp <= 0) {
        await handleDeath(second, !isPlayerFirst);
        return;
    }

    await wait(500);

    // ACTION 2
    await executeMove(second, first, moveSecond, !isPlayerFirst);
    renderAll();

    if (first.hp <= 0) {
        await handleDeath(first, isPlayerFirst);
        return;
    }

    await runStatusDamage(player, true);
    if (player.hp > 0) await runStatusDamage(opponent, false);
    renderAll();

    if (player.hp <= 0) {
        await handleDeath(player, true);
    } else if (opponent.hp <= 0) {
        await handleDeath(opponent, false);
    } else {
        window.turnLock = false;
        renderAll();
    }
};

// Función cerebro de la IA
function getBestAIMove(aiMon, targetMon) {
    let bestMove = aiMon.moves[0];
    let bestScore = -9999;

    aiMon.moves.forEach(mKey => {
        const m = MOVES[mKey];
        let score = 0;

        // 1. Simular daño
        if (m.poder > 0 || m.nombre === 'Furia Dragón') {
            // Usamos la función calcDamage existente (que ya incluye habilidades gracias a abilities.js)
            const dmgSim = calcDamage(aiMon, targetMon, m);
            score += dmgSim.amount;

            // Bonus si mata
            if (dmgSim.amount >= targetMon.hp) score += 1000;
        }

        // 2. Lógica de Estado
        if (m.effect) {
            // No intentar dormir/paralizar/quemar si ya tiene estado
            if (['SLP', 'PAR', 'BRN', 'PSN', 'FRZ'].includes(m.effect)) {
                if (targetMon.status) score -= 50; // Ya tiene estado, mal movimiento
                else score += 20; // Buen movimiento táctico
            }
            
            // Debuffs: No bajar stats si ya están al mínimo (simple check)
            if (m.effect.includes('_DOWN')) score += 10;
        }

        // 3. Aleatoriedad para no ser 100% predecible
        score += Math.random() * 5;

        if (score > bestScore) {
            bestScore = score;
            bestMove = mKey;
        }
    });

    return bestMove;
}