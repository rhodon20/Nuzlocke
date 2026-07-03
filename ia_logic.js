/* =========================================================
   ADVANCED AI LOGIC (Plugin-based)
========================================================= */

(function initAdvancedAI() {
    if (typeof window.registerGamePlugin !== 'function') return;

    window.registerGamePlugin({
        name: 'advanced-ai',
        hooks: {
            selectOpponentMove(ctx) {
                const { value: defaultMove, opponent: aiMon, player: targetMon } = ctx;
                if (!aiMon || !targetMon || !Array.isArray(aiMon.moves) || aiMon.moves.length === 0) {
                    return defaultMove;
                }
                return getBestAIMove(aiMon, targetMon) || defaultMove;
            }
        }
    });
})();

function getBestAIMove(aiMon, targetMon) {
    const forcedMoves = typeof getUsableMoveKeys === 'function' ? getUsableMoveKeys(aiMon) : [];
    if ((aiMon.rechargeTurns || 0) > 0) return 'Recharge';
    if (aiMon.chargingMoveKey && forcedMoves.includes(aiMon.chargingMoveKey)) return aiMon.chargingMoveKey;
    let bestMove = null;
    let bestScore = -9999;
    let hasLikelyKO = false;

    if (Array.isArray(aiMon.moves)) {
        aiMon.moves.forEach(mKey => {
            const m = MOVES[mKey];
            if (!m || m.cat === 'Est' || m.poder <= 0) return;
            if (typeof getMoveCooldown === 'function' && getMoveCooldown(aiMon, mKey) > 0) return;
            const evaluatedMove = typeof getChainedMovePreview === 'function' ? getChainedMovePreview(aiMon, m, mKey) : m;
            const singleHit = calcDamage(aiMon, targetMon, evaluatedMove);
            const averageHits = m.multiHit ? (m.multiHit.min === m.multiHit.max ? m.multiHit.min : 3) : 1;
            const dmgSim = { ...singleHit, amount: singleHit.amount * averageHits };
            const hitChance = (typeof getMoveHitChance === 'function') ? getMoveHitChance(aiMon, targetMon, m) : 1;
            if (dmgSim.amount >= targetMon.hp && hitChance >= 0.7) hasLikelyKO = true;
        });
    }

    aiMon.moves.forEach(mKey => {
        const m = MOVES[mKey];
        if (!m) return;
        if (typeof getMoveCooldown === 'function' && getMoveCooldown(aiMon, mKey) > 0) return;

        let score = 0;
        if (m.randomMove) score += 12;
        const isStatusMove = m.cat === 'Est' || m.poder === 0;
        if (isStatusMove && (aiMon.tauntTurns || 0) > 0) {
            score -= 200;
        }

        if (!isStatusMove || m.nombre === 'Furia Dragon' || m.ohko) {
            const evaluatedMove = typeof getChainedMovePreview === 'function' ? getChainedMovePreview(aiMon, m, mKey) : m;
            const singleHit = calcDamage(aiMon, targetMon, evaluatedMove);
            const averageHits = m.multiHit ? (m.multiHit.min === m.multiHit.max ? m.multiHit.min : 3) : 1;
            const simulatedAmount = m.ohko && singleHit.mult !== 0 ? targetMon.hp : singleHit.amount * averageHits;
            const dmgSim = { ...singleHit, amount: simulatedAmount };
            const hitChance = (typeof getMoveHitChance === 'function') ? getMoveHitChance(aiMon, targetMon, evaluatedMove) : 1;
            const expectedDamage = dmgSim.amount * hitChance;
            score += expectedDamage;
            if (m.drain && aiMon.hp < aiMon.maxHp) score += expectedDamage * m.drain * 0.35;
            if (m.recoil) score -= expectedDamage * m.recoil * (aiMon.hp / Math.max(1, aiMon.maxHp) < 0.35 ? 0.8 : 0.35);
            if (m.hpCost) score -= aiMon.maxHp * m.hpCost * 0.4;
            if (m.chargeTurns && aiMon.chargingMoveKey !== mKey && m.skipChargeWeather !== getWeather()?.type) score *= 0.65;
            if (m.rechargeTurns) score *= 0.78;
            if (dmgSim.amount >= targetMon.hp) score += 1000 * hitChance;
        }

        const effects = [];
        if (Array.isArray(m.effects) && m.effects.length) {
            m.effects.forEach(e => effects.push(e));
        } else if (typeof m.effect === 'string' && m.effect.includes('|')) {
            m.effect.split('|').map(e => e.trim()).filter(Boolean).forEach(e => effects.push(e));
        } else if (m.effect) {
            effects.push(m.effect);
        }

        effects.forEach(e => {
            if (typeof e === 'string' && ['SLP', 'PAR', 'BRN', 'PSN', 'FRZ'].includes(e)) {
                const canApply = (typeof canInflictStatus === 'function') ? canInflictStatus(targetMon, e) : !targetMon.status;
                if (canApply) score += 20;
                else score -= 40;
            }
            if (typeof e === 'string' && e.includes('_DOWN')) score += 10;
            if (typeof e === 'string' && e === 'CON') {
                const canConfuse = (typeof canInflictConfusion === 'function') ? canInflictConfusion(targetMon) : (!targetMon.confusionTurns || targetMon.confusionTurns <= 0);
                if (canConfuse) score += 16;
                else score -= 20;
            }
            if (typeof e === 'string' && e === 'SELF_CON') score -= 18;
            if (typeof e === 'string' && e === 'TRANSFORM') {
                const ownTotal = ['atk','def','spa','spd','spe'].reduce((sum, stat) => sum + (aiMon[stat] || 0), 0);
                const targetTotal = ['atk','def','spa','spd','spe'].reduce((sum, stat) => sum + (targetMon[stat] || 0), 0);
                score += targetTotal > ownTotal ? 30 : 6;
            }
            if (typeof e === 'string' && e === 'SKETCH') score += targetMon.lastUsedMoveKey ? 18 : -25;
            if (typeof e === 'string' && e === 'REFLECT') score += 14;
            if (typeof e === 'string' && e === 'REFLECT') {
                if (typeof getSideFieldState === 'function' && typeof isPlayerSideMon === 'function') {
                    const aiIsPlayerSide = isPlayerSideMon(aiMon);
                    const side = getSideFieldState(aiIsPlayerSide);
                    if ((side?.reflectTurns || 0) > 0) score -= 20;
                }
            }
            if (typeof e === 'string' && e === 'LIGHT_SCREEN') score += 14;
            if (typeof e === 'string' && e === 'LIGHT_SCREEN') {
                if (typeof getSideFieldState === 'function' && typeof isPlayerSideMon === 'function') {
                    const aiIsPlayerSide = isPlayerSideMon(aiMon);
                    const side = getSideFieldState(aiIsPlayerSide);
                    if ((side?.lightScreenTurns || 0) > 0) score -= 20;
                }
            }
            if (typeof e === 'string' && e === 'LEECH_SEED') {
                const alreadySeeded = targetMon.leechSeedBySide === true || targetMon.leechSeedBySide === false;
                if (targetMon.types?.includes('Planta') || alreadySeeded) score -= 20;
                else score += 18;
            }
            if (typeof e === 'string' && e === 'SPIKES') {
                if (typeof getSideFieldState === 'function' && typeof isPlayerSideMon === 'function') {
                    const targetIsPlayerSide = isPlayerSideMon(targetMon);
                    const targetSide = getSideFieldState(targetIsPlayerSide);
                    const layers = targetSide?.spikesLayers || 0;
                    if (layers >= 3) score -= 30;
                    else score += (12 + layers * 6);
                } else {
                    score += 10;
                }
            }
            if (typeof e === 'string' && e === 'STEALTH_ROCK') {
                if (typeof getSideFieldState === 'function' && typeof isPlayerSideMon === 'function') {
                    const targetIsPlayerSide = isPlayerSideMon(targetMon);
                    const targetSide = getSideFieldState(targetIsPlayerSide);
                    if (targetSide?.stealthRock) score -= 30;
                    else score += 18;
                } else {
                    score += 12;
                }
            }
            if (typeof e === 'string' && e === 'TOXIC_SPIKES') {
                if (typeof getSideFieldState === 'function' && typeof isPlayerSideMon === 'function') {
                    const targetIsPlayerSide = isPlayerSideMon(targetMon);
                    const targetSide = getSideFieldState(targetIsPlayerSide);
                    const layers = targetSide?.toxicSpikesLayers || 0;
                    if (layers >= 2) score -= 30;
                    else score += (14 + layers * 6);
                } else {
                    score += 12;
                }
            }
            if (typeof e === 'string' && e === 'PERISH_SONG') {
                const already = (aiMon.perishTurns || 0) > 0 || (targetMon.perishTurns || 0) > 0;
                if (already) score -= 50;
                else {
                    const aiHpRate = aiMon.hp / Math.max(1, aiMon.maxHp);
                    const targetHpRate = targetMon.hp / Math.max(1, targetMon.maxHp);
                    if (targetHpRate > aiHpRate + 0.15) score += 20;
                    else score -= 10;
                }
            }
            if (typeof e === 'string' && e === 'TAUNT') {
                const targetTaunted = (targetMon.tauntTurns || 0) > 0;
                const statusMoveCount = Array.isArray(targetMon.moves)
                    ? targetMon.moves.filter(k => MOVES[k] && MOVES[k].cat === 'Est').length
                    : 0;
                if (targetTaunted) score -= 25;
                else score += 8 + (statusMoveCount * 4);
                if (hasLikelyKO) score -= 18;
            }
            if (typeof e === 'string' && e === 'PROTECT') {
                const hpRate = aiMon.hp / Math.max(1, aiMon.maxHp);
                const streak = Math.max(0, aiMon.protectStreak || 0);
                if (streak > 0) score -= (18 + streak * 10);
                if (hpRate < 0.35) score += 24;
                else if (hpRate < 0.55) score += 8;
                else score -= 10;
                if (hasLikelyKO) score -= 25;
            }
            if (typeof e === 'string' && e === 'CLEAR_OWN_HAZARDS') {
                if (typeof getSideFieldState === 'function' && typeof isPlayerSideMon === 'function') {
                    const aiIsPlayer = isPlayerSideMon(aiMon);
                    const own = getSideFieldState(aiIsPlayer);
                    const burden = (own?.spikesLayers || 0) + (own?.toxicSpikesLayers || 0) + ((own?.stealthRock) ? 1 : 0);
                    if (burden > 0) score += 12 + burden * 8;
                    else score -= 15;
                }
            }
            if (typeof e === 'string' && e === 'DEFOG') {
                if (typeof getSideFieldState === 'function' && typeof isPlayerSideMon === 'function') {
                    const aiIsPlayer = isPlayerSideMon(aiMon);
                    const own = getSideFieldState(aiIsPlayer);
                    const foe = getSideFieldState(!aiIsPlayer);
                    const ownBurden = (own?.spikesLayers || 0) + (own?.toxicSpikesLayers || 0) + ((own?.stealthRock) ? 1 : 0) +
                        (((own?.reflectTurns || 0) > 0) ? 1 : 0) + (((own?.lightScreenTurns || 0) > 0) ? 1 : 0);
                    const foeBurden = (foe?.spikesLayers || 0) + (foe?.toxicSpikesLayers || 0) + ((foe?.stealthRock) ? 1 : 0) +
                        (((foe?.reflectTurns || 0) > 0) ? 1 : 0) + (((foe?.lightScreenTurns || 0) > 0) ? 1 : 0);
                    score += (ownBurden * 7) - (foeBurden * 5);
                    if (ownBurden === 0 && foeBurden === 0) score -= 20;
                }
            }
            if (typeof e === 'string' && e === 'BATON_PASS') {
                const aiIsPlayerSide = (typeof isPlayerSideMon === 'function') ? isPlayerSideMon(aiMon) : false;
                let hasBench = false;
                if (typeof pvpState !== 'undefined' && pvpState?.active) {
                    const side = aiIsPlayerSide ? pvpState.p1 : pvpState.p2;
                    hasBench = Array.isArray(side?.team) && side.team.some((p, idx) => idx !== side.activeIdx && p.hp > 0);
                } else if (aiIsPlayerSide) {
                    hasBench = Array.isArray(state?.team) && state.team.some((p, idx) => idx !== state.activeIdx && p.hp > 0);
                }
                if (!hasBench) score -= 60;
                const boostStats = ['atk','def','spa','spd','spe','acc','eva']
                    .reduce((sum, s) => sum + Math.max(0, Number(aiMon?.stages?.[s]) || 0), 0);
                score += boostStats * 7;
                if (boostStats === 0) score -= 15;
            }
            if (typeof e === 'string' && e === 'PIVOT_SWITCH') {
                const aiIsPlayerSide = (typeof isPlayerSideMon === 'function') ? isPlayerSideMon(aiMon) : false;
                let hasBench = false;
                if (typeof pvpState !== 'undefined' && pvpState?.active) {
                    const side = aiIsPlayerSide ? pvpState.p1 : pvpState.p2;
                    hasBench = Array.isArray(side?.team) && side.team.some((p, idx) => idx !== side.activeIdx && p.hp > 0);
                } else if (aiIsPlayerSide) {
                    hasBench = Array.isArray(state?.team) && state.team.some((p, idx) => idx !== state.activeIdx && p.hp > 0);
                }
                if (!hasBench) score -= 40;
                const hpRate = aiMon.hp / Math.max(1, aiMon.maxHp);
                if (hpRate < 0.45) score += 12;
                if (hasLikelyKO) score -= 8;
            }
            if (typeof e === 'string' && e === 'HAZE') {
                const aiBoost = ['atk','def','spa','spd','spe','acc','eva']
                    .reduce((sum, s) => sum + Math.max(0, Number(aiMon?.stages?.[s]) || 0), 0);
                const foeBoost = ['atk','def','spa','spd','spe','acc','eva']
                    .reduce((sum, s) => sum + Math.max(0, Number(targetMon?.stages?.[s]) || 0), 0);
                score += (foeBoost * 10) - (aiBoost * 8);
                if (foeBoost === 0 && aiBoost === 0) score -= 20;
            }
            if (typeof e === 'string' && e === 'HEAL_BLOCK') {
                const alreadyBlocked = (targetMon.healBlockTurns || 0) > 0;
                if (alreadyBlocked) {
                    score -= 25;
                } else {
                    const targetHpRate = targetMon.hp / Math.max(1, targetMon.maxHp);
                    const hasHealMoves = Array.isArray(targetMon.moves) && targetMon.moves.some(k => {
                        const mv = MOVES[k];
                        if (!mv) return false;
                        if (mv.effect === 'HEAL_50' || mv.effect === 'REST') return true;
                        if (Array.isArray(mv.effects)) {
                            return mv.effects.some(obj => obj && obj.type === 'heal');
                        }
                        return false;
                    });
                    if (hasHealMoves) score += 16;
                    if (targetHpRate <= 0.55) score += 12;
                }
            }
            if (typeof e === 'string' && e === 'DISABLE') {
                const already = (targetMon.disableTurns || 0) > 0;
                const moveKey = targetMon.lastUsedMoveKey;
                if (already) {
                    score -= 25;
                } else if (!moveKey || !MOVES[moveKey]) {
                    score -= 18;
                } else {
                    const targetMove = MOVES[moveKey];
                    const basePower = Number(targetMove.poder) || 0;
                    if (targetMove.cat !== 'Est' && basePower > 0) score += 10 + Math.min(24, Math.floor(basePower / 5));
                    else score += 8;
                }
            }
            if (typeof e === 'string' && ['RAIN', 'SUN', 'SAND', 'HAIL'].includes(e)) {
                let currentWeather = null;
                if (typeof getWeather === 'function') currentWeather = getWeather()?.type || null;
                if (currentWeather === e) {
                    score -= 25;
                } else {
                    if (e === 'RAIN' && aiMon.types?.includes('Agua')) score += 18;
                    else if (e === 'SUN' && aiMon.types?.includes('Fuego')) score += 18;
                    else if (e === 'SAND' && (aiMon.types?.includes('Roca') || aiMon.types?.includes('Tierra') || aiMon.types?.includes('Acero'))) score += 14;
                    else if (e === 'HAIL' && aiMon.types?.includes('Hielo')) score += 14;
                    else score += 8;
                }
            }
            if (typeof e === 'string' && e === 'HEAL_50') {
                const hpRate = aiMon.hp / Math.max(1, aiMon.maxHp);
                if (hpRate < 0.4) score += 60;
                else if (hpRate < 0.65) score += 20;
                else score -= 25;
            }
            if (typeof e === 'string' && e === 'REST') {
                const hpRate = aiMon.hp / Math.max(1, aiMon.maxHp);
                if (!aiMon.status && hpRate > 0.75) score -= 50;
                else score += 35;
            }
            if (typeof e === 'object' && e.type === 'stat' && Number.isFinite(Number(e.change))) {
                if (e.target === 'self' && Number(e.change) > 0) score += 10 * Number(e.change);
                if (e.target !== 'self' && Number(e.change) < 0) score += 10 * Math.abs(Number(e.change));
            }
        });

        // Prefer finishing blow over support when a reliable KO is available.
        if (hasLikelyKO && isStatusMove) score -= 120;

        // Prefer setup when both mons are healthy and no immediate KO is expected.
        if (!hasLikelyKO && isStatusMove) {
            const aiHpRate = aiMon.hp / Math.max(1, aiMon.maxHp);
            const targetHpRate = targetMon.hp / Math.max(1, targetMon.maxHp);
            if (aiHpRate > 0.65 && targetHpRate > 0.55) score += 8;
        }

        if (isStatusMove && effects.length === 0) score -= 20;

        score += gameRandom() * 5;
        if (score > bestScore) {
            bestScore = score;
            bestMove = mKey;
        }
    });

    if (bestMove) return bestMove;
    if (typeof getUsableMoveKeys === 'function') {
        const usable = getUsableMoveKeys(aiMon);
        if (usable.length > 0) return usable[0];
    }
    return aiMon.moves[0] || null;
}


