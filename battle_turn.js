async function executeMove(attacker, defender, move, isPlayer, turnMeta = {}) {
  const moveContext = { attacker, defender, move, isPlayer, cancel: false, meta: {} };
  runPluginHook('beforeExecuteMove', moveContext);
  if (moveContext.cancel) return;
  attacker = moveContext.attacker;
  defender = moveContext.defender;
  move = moveContext.move;
  isPlayer = moveContext.isPlayer;
  if (turnMeta.attackerSide === undefined) turnMeta.attackerSide = !!isPlayer;

  if(attacker.hp <= 0) return; 
  let moveKey = turnMeta?.moveKey || null;
  let telemetryRecorded = false;
  tickMoveCooldowns(attacker);
  attacker.statusShieldTurns = Math.max(0, (attacker.statusShieldTurns || 0) - 1);
  attacker.confusionShieldTurns = Math.max(0, (attacker.confusionShieldTurns || 0) - 1);
  if (moveKey && getMoveCooldown(attacker, moveKey) > 0) {
    log(`${attacker.name} no puede usar ese movimiento todavía.`);
    return;
  }
  if (moveKey && typeof isMoveDisabled === 'function' && isMoveDisabled(attacker, moveKey)) {
    const disabledName = MOVES[moveKey]?.nombre || moveKey;
    log(`${attacker.name} no puede usar ${disabledName}: está anulado.`);
    return;
  }
  if ((attacker.rechargeTurns || 0) > 0) {
    attacker.rechargeTurns = Math.max(0, attacker.rechargeTurns - 1);
    log(`${attacker.name} debe recargar energía.`);
    commitMoveChain(attacker, move, moveKey, false);
    return;
  }

  const atkSlot = isPlayer ? 'player-sprite-slot' : 'opponent-sprite-slot';
  const defSlot = isPlayer ? 'opponent-sprite-slot' : 'player-sprite-slot';
  const atkZone = isPlayer ? 'zone-player' : 'zone-opponent';
  const defZone = isPlayer ? 'zone-opponent' : 'zone-player';

  if (attacker.flinched) {
    attacker.flinched = false;
    log(`${attacker.name} retrocedió y no puede actuar.`);
    return;
  }

  if (attacker.status === 'FRZ') {
    attacker.freezeTurns = Number.isFinite(attacker.freezeTurns) ? attacker.freezeTurns : 1;
    log(`${attacker.name} está congelado y no ataca.`);
    attacker.freezeTurns = Math.max(0, attacker.freezeTurns - 1);
    if (attacker.freezeTurns <= 0) {
      attacker.status = null;
      log(`¡${attacker.name} se descongeló!`);
      renderAll();
    }
    return;
  }
  if (attacker.status === 'SLP') {
    attacker.sleepTurns = Number.isFinite(attacker.sleepTurns) ? attacker.sleepTurns : 1;
    log(`${attacker.name} duerme profundamente.`);
    attacker.sleepTurns = Math.max(0, attacker.sleepTurns - 1);
    if (attacker.sleepTurns <= 0) {
      attacker.status = null;
      log(`¡${attacker.name} se despertó!`);
      renderAll();
    }
    return;
  }
  if (attacker.status === 'PAR' && gameRandom() < 0.25) {
    log(`${attacker.name} está paralizado y no puede moverse.`);
    return;
  }

  if (attacker.confusionTurns && attacker.confusionTurns > 0) {
    attacker.confusionTurns--;
    log(`${attacker.name} está confundido.`);
    if (gameRandom() < 0.33) {
      const selfDmg = calcConfusionSelfDamage(attacker);
      await animateDamage(atkSlot);
      attacker.hp = Math.max(0, attacker.hp - selfDmg);
      renderAll();
      log(`${attacker.name} se hirió a sí mismo.`);
      if (attacker.confusionTurns <= 0) log(`${attacker.name} salió de la confusión.`);
      return;
    }
    if (attacker.confusionTurns <= 0) log(`${attacker.name} salió de la confusión.`);
  }

  if(!move) {
     log(`${isPlayer ? 'Jugador:' : 'Rival:'} ${attacker.name} falla su ataque.`);
     return;
  }

  if (!move.chainPower && attacker.chainMoveKey) commitMoveChain(attacker, move, moveKey, false);
  let resolvedMove = getChainedMovePreview(attacker, move, moveKey);

  const weatherType = getWeather()?.type || null;
  const needsCharge = (move.chargeTurns || 0) > 0 && move.skipChargeWeather !== weatherType;
  if (needsCharge && attacker.chargingMoveKey !== moveKey) {
    attacker.chargingMoveKey = moveKey;
    attacker.lastUsedMoveKey = moveKey;
    commitMoveChain(attacker, move, moveKey, false);
    log(`${attacker.name} está preparando <b>${move.nombre}</b>.`);
    if (typeof recordTelemetryMove === 'function') recordTelemetryMove(moveKey, isPlayer, { resolved: true, noAccuracy: true });
    return;
  }
  if (attacker.chargingMoveKey === moveKey) attacker.chargingMoveKey = null;

  const isStatusMove = move.cat === 'Est';
  if ((attacker.tauntTurns || 0) > 0 && isStatusMove) {
    log(`${attacker.name} está bajo Mofa y no puede usar movimientos de estado.`);
    decayCombo(attacker);
    if (moveKey && move.cooldown) setMoveCooldown(attacker, moveKey, move.cooldown);
    return;
  }

  if (move.randomMove) {
    const sourceKey = moveKey;
    const candidates = Object.keys(MOVES).filter(key => {
      const candidate = MOVES[key];
      return candidate && !candidate.internalAction && !candidate.emergency && !candidate.randomMove && !candidate.chargeTurns && !candidate.hpCost;
    });
    if (!candidates.length) return;
    const calledKey = candidates[Math.floor(gameRandom() * candidates.length)];
    if (sourceKey && move.cooldown) setMoveCooldown(attacker, sourceKey, move.cooldown);
    log(`${attacker.name} invocó ${MOVES[calledKey].nombre} con Metrónomo.`);
    moveKey = calledKey;
    move = { ...MOVES[calledKey], cooldown: 0 };
    resolvedMove = getChainedMovePreview(attacker, move, moveKey);
  }

  const moveEffects = [];
  if (Array.isArray(move.effects) && move.effects.length) {
    move.effects.forEach(e => moveEffects.push(e));
  } else if (typeof move.effect === 'string' && move.effect.includes('|')) {
    move.effect.split('|').map(e => e.trim()).filter(Boolean).forEach(e => moveEffects.push(e));
  } else if (move.effect) {
    moveEffects.push(move.effect);
  }
  const isProtectMove = moveEffects.includes('PROTECT');
  if (!isProtectMove) attacker.protectStreak = 0;
  const selfOnlyEffects = new Set([
    'ATK_UP','DEF_UP','SPA_UP','SPDEF_UP','SPE_UP','ACC_UP','EVA_UP','ALL_UP',
    'REFLECT','LIGHT_SCREEN','HEAL_50','REST','RAIN','SUN','SAND','HAIL','PROTECT',
    'CLEAR_OWN_HAZARDS','HAZE'
  ]);
  const sideOnlyEffects = new Set(['SPIKES','STEALTH_ROCK','TOXIC_SPIKES']);
  const targetsDefender = move.cat !== 'Est' || moveEffects.some(e => {
    if (typeof e === 'object') return e.target !== 'self';
    if (selfOnlyEffects.has(e)) return false;
    if (sideOnlyEffects.has(e)) return false;
    return true;
  });

  log(`${isPlayer ? 'Jugador:' : 'Rival:'} ${attacker.name} usa <b>${move.nombre}</b>!`);
  if (moveKey) attacker.lastUsedMoveKey = moveKey;
  await animateAttack(atkSlot, isPlayer);

  const hitChance = getMoveHitChance(attacker, defender, resolvedMove);
  if (gameRandom() > hitChance) {
    log(`${attacker.name} falló ${move.nombre}.`);
    decayCombo(attacker);
    if (moveKey && move.cooldown) {
      setMoveCooldown(attacker, moveKey, move.cooldown);
    }
    if (move.chainPower) commitMoveChain(attacker, move, moveKey, false);
    if (typeof recordTelemetryMove === 'function') recordTelemetryMove(moveKey, isPlayer, { missed: true });
    return;
  }

  if (defender.protectThisTurn && targetsDefender) {
    log(`${defender.name} se protegió del ataque.`);
    decayCombo(attacker);
    if (moveKey && move.cooldown) setMoveCooldown(attacker, moveKey, move.cooldown);
    if (move.chainPower) commitMoveChain(attacker, move, moveKey, false);
    if (typeof recordTelemetryMove === 'function') recordTelemetryMove(moveKey, isPlayer, { resolved: true });
    return;
  }
  
  if (move.cat !== 'Est') {
    await shootProjectile(move.tipo, atkZone, defZone);
    const hitCount = getMultiHitCount(resolvedMove);
    let totalDamage = 0;
    let resolvedHits = 0;
    let dmg = null;
    for (let hit = 0; hit < hitCount; hit++) {
      const hitDamage = calcDamage(attacker, defender, resolvedMove);
      if (resolvedMove.ohko && hitDamage.mult !== 0) hitDamage.amount = defender.hp;
      if (!dmg) dmg = hitDamage;
      if (hitDamage.mult === 0) break;
      totalDamage += hitDamage.amount;
      resolvedHits++;
      if (totalDamage >= defender.hp) break;
    }
    dmg = dmg || { amount: 0, mult: 1 };
    spawnParticles(move.tipo, $(defSlot));

    if (dmg.mult === 0) {
        log(`¡No afecta a ${defender.name}!`);
        decayCombo(attacker);
        if (move.chainPower) commitMoveChain(attacker, move, moveKey, false);
    } else {
        if(dmg.mult > 1) log(`¡Es súper efectivo!`);
        if(dmg.mult < 1) log(`No es muy efectivo...`);
        if (hitCount > 1) log(`Golpeó ${resolvedHits} veces.`);
        if (resolvedMove.chainStack > 1) log(`Cadena de ${move.nombre}: potencia ${resolvedMove.poder}.`);

        await animateDamage(defSlot);
        const actualDamage = Math.min(defender.hp, totalDamage);
        defender.hp = Math.max(0, defender.hp - totalDamage);
        if (move.ohko) log(`¡Ataque fulminante!`);
        if (move.drain && actualDamage > 0 && (attacker.healBlockTurns || 0) <= 0) {
          const healed = Math.max(1, Math.floor(actualDamage * move.drain));
          const previousHp = attacker.hp;
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + healed);
          if (attacker.hp > previousHp) log(`${attacker.name} absorbió ${attacker.hp - previousHp} PS.`);
        }
        if (move.recoil && actualDamage > 0) {
          const recoil = Math.max(1, Math.floor(actualDamage * move.recoil));
          attacker.hp = Math.max(1, attacker.hp - recoil);
          log(`${attacker.name} recibió ${recoil} PS de retroceso.`);
        }
        if (move.hpCost) {
          const cost = Math.max(1, Math.floor(attacker.maxHp * move.hpCost));
          attacker.hp = Math.max(1, attacker.hp - cost);
          log(`${attacker.name} quedó exhausto tras el ataque.`);
        }
        if (move.rechargeTurns) attacker.rechargeTurns = Math.max(attacker.rechargeTurns || 0, move.rechargeTurns);
        if (typeof recordTelemetryMove === 'function') {
          recordTelemetryMove(moveKey, isPlayer, { resolved: true, damage: actualDamage, hits: resolvedHits });
          telemetryRecorded = true;
        }
        updateComboOnSuccessfulAction(attacker, move);
        if (move.chainPower) commitMoveChain(attacker, move, moveKey, true);
        renderAll(); // Trigger HP bar animation
    }
  }

  const canApplyAfterFaint = moveEffects.some(e => [
    'BATON_PASS','PIVOT_SWITCH','PROTECT','HEAL_50','REST',
    'REFLECT','LIGHT_SCREEN','RAIN','SUN','SAND','HAIL',
    'CLEAR_OWN_HAZARDS','DEFOG'
  ].includes(e));
  if ((move.effect || Array.isArray(move.effects)) && (defender.hp > 0 || canApplyAfterFaint)) {
      if (gameRandom() < (move.chance || 1.0)) {
          applyEffect(attacker, defender, move, turnMeta);
      }
  }
  if (!telemetryRecorded && typeof recordTelemetryMove === 'function') {
    recordTelemetryMove(moveKey, isPlayer, { resolved: true });
  }

  if (moveKey && move.cooldown) {
    setMoveCooldown(attacker, moveKey, move.cooldown);
  }

  if (attacker.hp > 0 && attacker.pendingSwitch) {
    const pending = attacker.pendingSwitch;
    attacker.pendingSwitch = null;
    if (isPlayer && typeof doAutoSwitch === 'function') {
      const switched = doAutoSwitch(true, {
        preservePositiveStages: !!pending.preservePositiveStages,
        source: pending.reason || 'MOVE'
      });
      if (!switched) log(`${attacker.name} no pudo cambiar: no hay aliado disponible.`);
    }
  }

  runPluginHook('afterExecuteMove', moveContext);
}

async function runStatusDamage(mon, isPlayer) {
  const statusContext = { mon, isPlayer, handled: false };
  runPluginHook('beforeStatusDamage', statusContext);
  if (statusContext.handled) {
    runPluginHook('afterStatusDamage', statusContext);
    return;
  }

  if (mon.hp <= 0) return;
  if (mon.status === 'BRN' || mon.status === 'PSN') {
    const dmg = Math.floor(mon.maxHp / 8);
    mon.hp = Math.max(0, mon.hp - dmg);
    await animateDamage(isPlayer ? 'player-sprite-slot' : 'opponent-sprite-slot');
    renderAll();
    log(`${mon.status === 'BRN' ? 'Quemadura:' : 'Veneno:'} ${mon.name} sufre daño por ${mon.status}.`);
  }
  runPluginHook('afterStatusDamage', statusContext);
}

async function doTurn(moveKey) {
  if (runPluginHookUntilHandled('beforeDoTurn', { moveKey, state, opponent })) return;
  if(turnLock) return;
  turnLock = true;
  
  const player = state.team[state.activeIdx];
  const playerMove = MOVES[moveKey];
  if (!playerMove) {
    turnLock = false;
    return;
  }
  if (getMoveCooldown(player, moveKey) > 0) {
    log('Ese movimiento está en cooldown.');
    turnLock = false;
    renderAll();
    return;
  }
  if (typeof isMoveDisabled === 'function' && isMoveDisabled(player, moveKey)) {
    log('Ese movimiento está anulado temporalmente.');
    turnLock = false;
    renderAll();
    return;
  }
  if (typeof recordTelemetryTurn === 'function') recordTelemetryTurn('move');
  
  let oppMoveKey = chooseRandomUsableMoveKey(opponent);
  oppMoveKey = runPluginHookReduce('selectOpponentMove', oppMoveKey, {
    moveKey,
    player,
    opponent,
    state
  });
  const oppMove = oppMoveKey ? MOVES[oppMoveKey] : null;
  recordRunEvent('turn_choice', {
    playerMove: moveKey,
    opponentMove: oppMoveKey || null,
    playerHp: player.hp,
    opponentHp: opponent.hp
  });
  if (typeof recordReplayAction === 'function') {
    recordReplayAction('TURN', {
      playerMove: moveKey,
      opponentMove: oppMoveKey || null,
      playerHp: player.hp,
      opponentHp: opponent.hp
    });
  }

  const pSpeed = player.getStat('spe');
  const oSpeed = opponent.getStat('spe');
  
  let first, second;
  let moveFirst, moveSecond;
  let isPlayerFirst;

  const pPrio = (moveKey === 'Quick Attack' || moveKey === 'Extreme Speed') ? 1 : 0;
  const oPrio = (oppMoveKey === 'Quick Attack' || oppMoveKey === 'Extreme Speed') ? 1 : 0;

  if (pPrio > oPrio) {
      isPlayerFirst = true;
  } else if (oPrio > pPrio) {
      isPlayerFirst = false;
  } else {
      if (pSpeed >= oSpeed) {
          if (pSpeed === oSpeed) isPlayerFirst = gameRandom() < 0.5;
          else isPlayerFirst = true;
      } else {
          isPlayerFirst = false;
      }
  }

  if (isPlayerFirst) {
      first = player; moveFirst = playerMove;
      second = opponent; moveSecond = oppMove;
  } else {
      first = opponent; moveFirst = oppMove;
      second = player; moveSecond = playerMove;
  }

  // ACTION 1
  await executeMove(first, second, moveFirst, isPlayerFirst, {
    canFlinchTarget: true,
    moveKey: isPlayerFirst ? moveKey : oppMoveKey,
    attackerSide: isPlayerFirst
  });

  if (second.hp <= 0) {
      await handleDeath(second, !isPlayerFirst);
      return;
  }

  await wait(300);

  // ACTION 2 (refresh active references in case ACTION 1 triggered a switch)
  const livePlayer = state.team[state.activeIdx];
  const liveOpponent = opponent;
  const action2IsPlayer = !isPlayerFirst;
  const action2Attacker = action2IsPlayer ? livePlayer : liveOpponent;
  const action2Defender = action2IsPlayer ? liveOpponent : livePlayer;
  await executeMove(action2Attacker, action2Defender, moveSecond, action2IsPlayer, {
    canFlinchTarget: false,
    moveKey: isPlayerFirst ? oppMoveKey : moveKey,
    attackerSide: action2IsPlayer
  });

  if (action2Defender && action2Defender.hp <= 0) {
      await handleDeath(action2Defender, !action2IsPlayer);
      return;
  }

  // End Turn Effects
  const endPlayer = state.team[state.activeIdx];
  const endOpponent = opponent;
  await runStatusDamage(endPlayer, true);
  if (endPlayer.hp > 0) await runStatusDamage(endOpponent, false);
  if (endPlayer.hp > 0) runLeechSeed(endPlayer, true);
  if (endOpponent.hp > 0) runLeechSeed(endOpponent, false);
  if (endPlayer.hp > 0) runPerishCountdown(endPlayer, true);
  if (endOpponent.hp > 0) runPerishCountdown(endOpponent, false);
  if (endPlayer.hp > 0) runWeatherDamage(endPlayer);
  if (endOpponent.hp > 0) runWeatherDamage(endOpponent);
  if (endPlayer.hp > 0) runBattleEventEndTurn(endPlayer);
  if (endOpponent.hp > 0) runBattleEventEndTurn(endOpponent);
  decayCombo(endPlayer);
  decayCombo(endOpponent);
  tickFieldEndTurn();

  if (endPlayer.hp <= 0) {
      await handleDeath(endPlayer, true);
  } else if (endOpponent.hp <= 0) {
      await handleDeath(endOpponent, false);
  } else {
      turnLock = false;
      renderAll(); // Ensure buttons re-enable
  }
}

async function handleDeath(mon, isPlayer) {
    if (typeof restoreTransformation === 'function') restoreTransformation(mon);
    log(`¡${mon.name} se debilitó!`);
    mon.leechSeedBySide = null;
    mon.perishTurns = 0;
    mon.comboStacks = 0;
    mon.lastMoveType = null;
    mon.chainMoveKey = null;
    mon.chainMoveStacks = 0;
    mon.chargingMoveKey = null;
    mon.rechargeTurns = 0;
    
    // Animate death (fade out and scale down)
    const slot = isPlayer ? 'player-sprite-slot' : 'opponent-sprite-slot';
    await anime({
        targets: `#${slot} img`,
        scale: 0,
        opacity: 0,
        filter: 'grayscale(100%)',
        duration: 800,
        easing: 'easeInBack'
    }).finished;

    if (isPlayer) {
        if (state.gameMode === 'nuzlocke') {
            log(`Nuzlocke: ¡${mon.name} ha muerto para siempre!`);
            state.team.splice(state.activeIdx, 1);
            state.activeIdx = -1;
        }
        checkDefeat();
    } else {
        await handleWin();
        turnLock = false;
        renderAll();
    }
}

function calcDamage(atkMon, defMon, move) {
  const overrideResult = runPluginHookReduce('calcDamageOverride', null, { atkMon, defMon, move });
  if (overrideResult) return overrideResult;

  let mult = 1;
  if (TYPE_CHART[move.tipo]) {
    defMon.types.forEach(t => {
      if (TYPE_CHART[move.tipo][t] !== undefined) mult *= TYPE_CHART[move.tipo][t];
    });
  }
  if (mult === 0) return { amount: 0, mult: 0 }; 

  let aStat, dStat;
  let defenseFieldMult = 1;
  if (move.cat === 'Fis') {
      aStat = atkMon.getStat('atk');
      dStat = defMon.getStat('def');
      if (atkMon.status === 'BRN') aStat = Math.floor(aStat * 0.5);
      const defSide = isPlayerSideMon(defMon) ? battleField.player : battleField.opponent;
      if ((defSide.reflectTurns || 0) > 0) defenseFieldMult = 0.5;
  } else {
      aStat = atkMon.getStat('spa');
      dStat = defMon.getStat('spd');
      const defSide = isPlayerSideMon(defMon) ? battleField.player : battleField.opponent;
      if ((defSide.lightScreenTurns || 0) > 0) defenseFieldMult = 0.5;
  }

  if (Number.isFinite(move.fixedDamage) && move.fixedDamage > 0) {
    return { amount: move.fixedDamage, mult: 1 };
  }

  const base = ((2 * atkMon.level / 5 + 2) * move.poder * (aStat / dStat)) / 50 + 2;
  const weather = getWeather();
  let weatherMult = 1;
  if (weather.type === 'RAIN') {
    if (move.tipo === 'Agua') weatherMult *= 1.5;
    if (move.tipo === 'Fuego') weatherMult *= 0.5;
  } else if (weather.type === 'SUN') {
    if (move.tipo === 'Fuego') weatherMult *= 1.5;
    if (move.tipo === 'Agua') weatherMult *= 0.5;
  }
  
  let critical = 1;
  if (gameRandom() < 0.0625) { critical = 1.5; log('¡Golpe Crítico!'); }

  let stab = atkMon.types.includes(move.tipo) ? 1.5 : 1;
  let comboMult = getComboDamageMultiplier(atkMon);
  const evt = getRunEvent();
  const eventDmgMult = evt?.dmgMult || 1;

  const total = Math.floor(base * mult * stab * critical * defenseFieldMult * weatherMult * comboMult * eventDmgMult * (gameRandom() * 0.15 + 0.85)); 
  const result = { amount: total, mult: mult };
  return runPluginHookReduce('afterCalcDamage', result, { atkMon, defMon, move, result });
}


