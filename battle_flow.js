/* =========================================================
   POST-BATTLE
========================================================= */
async function handleWin() {
  if (typeof recordTelemetryBattle === 'function') recordTelemetryBattle('win');
  log(`Ganaste! ${opponent.name} debilitado.`);
  state.streak++;
  recordRunEvent('battle_win', { opponent: opponent?.name || null, streak: state.streak, badges: state.badges });

  if (opponent?.isMiniBoss) {
      state.inventory.balls = Math.min(CONSTANTS.MAX_BALLS, state.inventory.balls + 2);
      state.inventory.pots = Math.min(CONSTANTS.MAX_POTS, state.inventory.pots + 1);
      log(`Recompensa mini-jefe: +2 Pokéballs, +1 Poción.`);
  }

  if (state.streak % 5 === 0) {
      state.badges++;
      log(`<b>¡Has conseguido una Medalla de Gimnasio!</b> (Total: ${state.badges})`);
  }

  if (state.streak === 40) {
      log(`<b>¡HITO LEGENDARIO!</b> Has conseguido las 8 Medallas.`);
      const rewardMon = state.team[state.activeIdx] || state.team[0];
      if (rewardMon) {
          rewardMon.isShiny = true;
          rewardMon.bonusMultiplier = 1.3; 
          rewardMon.recalcStats();
          rewardMon.hp = rewardMon.maxHp; 
          log(`¡Tu <b>${rewardMon.name}</b> ahora es Shiny y un 30% más fuerte!`);
          await wait(2000);
      }
  }

  if (state.gameMode === 'daily' && state.badges >= 8) {
    recordRunResult('VICTORIA_DIARIA');
    log('Desafío Diario completado.');
    $('start-buttons').style.display = 'flex';
    if (typeof refreshSeedUiState === 'function') refreshSeedUiState();
    turnLock = true;
    renderAll();
    return;
  }
  
  const teamSizeBonus = 1 + (state.team.length * 0.15); 
  const baseXP = ((opponent.level * 40) + 100) * CONSTANTS.XP_MULT * teamSizeBonus; 
  const shareXP = Math.floor(baseXP / state.team.length);
  
  state.team.forEach(p => p.status = null);

  for (let i = 0; i < state.team.length; i++) {
    const member = state.team[i];
    if (member.hp <= 0) continue; 

    let gain = (i === state.activeIdx) ? Math.floor(shareXP * 1.3) : shareXP;
    member.xp += gain;
    
    while (member.xp >= member.xpToNext) {
      member.xp -= member.xpToNext;
      member.level++;
      member.xpToNext = member.level * 60 + 100;
      member.recalcStats(); 
      member.hp = Math.min(member.hp + 5, member.maxHp); 
      log(`¡${member.name} subió al Nvl ${member.level}!`);
      await checkEvolutionAndMoves(member);
      member.hp = member.maxHp;
    }
  }

  if(state.streak % CONSTANTS.HEAL_STREAK === 0) {
    state.team.forEach(p => p.hp = p.maxHp);
    state.inventory.balls = Math.min(CONSTANTS.MAX_BALLS, state.inventory.balls + 5);
    state.inventory.pots = Math.min(CONSTANTS.MAX_POTS, state.inventory.pots + 2);
    log(`<b>Centro Pokémon:</b> ¡Equipo curado y objetos repuestos!`);
  }

  if (state.gameMode === 'roguerun' && typeof onRogueRunBattleWon === 'function') {
    const handled = onRogueRunBattleWon();
    if (handled) return;
  }

  await wait(1500);
  startBattle();
}

async function checkEvolutionAndMoves(player) {
  const evoData = EVOLUTIONS[player.name];
  if(evoData && evoData[player.level]) {
    const result = evoData[player.level];
    if(POKEMON_SPECIES[result]) {
      const oldName = player.name;
      player.name = result;
      player.baseStats = {
          hp: POKEMON_SPECIES[result].hp,
          atk: POKEMON_SPECIES[result].atk,
          def: POKEMON_SPECIES[result].def,
          spa: POKEMON_SPECIES[result].sp_atk,
          spd: POKEMON_SPECIES[result].sp_def,
          spe: POKEMON_SPECIES[result].speed
      };
      player.recalcStats();
      player.hp = player.maxHp;
      log(`¡Tu ${oldName} evolucionó a <b>${player.name}</b>!`);
      
      // Evolution FX
      const slot = 'player-sprite-slot';
      await anime({
          targets: `#${slot} img`,
          filter: ['brightness(1)','brightness(5)', 'brightness(1)'],
          scale: [1, 1.5, 1],
          duration: 1000,
          easing: 'easeInOutQuad'
      }).finished;
    }
  }

  let newMove = null;

  if (state.gameMode === 'nuzlocke') {
    if (player.level % 10 === 0) {
      const allMoves = Object.keys(MOVES).filter(key => key !== 'Struggle' && !MOVES[key]?.internalAction);
      newMove = allMoves[Math.floor(gameRandom() * allMoves.length)];
    }
  } else {
    if(evoData && evoData[player.level] && MOVES[evoData[player.level]]) {
      newMove = evoData[player.level];
    }
  }

  if (newMove && !player.moves.includes(newMove)) {
    if (player.moves.length < 4) {
      player.moves.push(newMove);
      log(`¡${player.name} aprendió <b>${newMove}</b>!`);
    } else {
      await promptForgetMove(player, newMove);
    }
  }
}

function promptForgetMove(player, newMove) {
  return new Promise(resolve => {
    const overlay = $('move-overlay');
    const list = $('move-list');
    const cancelBtn = $('btn-cancel-learn');
    list.innerHTML = '';
    
    const title = document.createElement('div');
    title.innerHTML = `<b>${player.name}</b> quiere aprender <b style="color:yellow">${newMove}</b>.`;
    title.style.marginBottom = '10px';
    title.style.textAlign = 'center';
    list.appendChild(title);

    player.moves.forEach((mKey, idx) => {
      const m = MOVES[mKey];
      const div = document.createElement('div');
      div.className = 'modal-card';
      div.innerHTML = `<span>${m.nombre}</span> <small>${m.tipo}/${m.poder}</small>`;
      div.onclick = () => {
        player.moves[idx] = newMove;
        log(`¡${player.name} olvidó ${m.nombre} y aprendió <b>${MOVES[newMove].nombre}</b>!`);
        overlay.style.display = 'none';
        resolve();
      };
      list.appendChild(div);
    });

    cancelBtn.onclick = () => {
      log(`${player.name} no aprendió ${MOVES[newMove].nombre}.`);
      overlay.style.display = 'none';
      resolve();
    }
    
    overlay.style.display = 'flex';
    
    // Animate Modal In
    anime({
        targets: '#move-overlay',
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 300,
        easing: 'easeOutQuad'
    });
  });
}

function checkDefeat() {
  const alive = state.team.some(p => p.hp > 0);
  if(!alive) {
    if (typeof recordTelemetryBattle === 'function') recordTelemetryBattle('loss');
    recordRunEvent('battle_loss', { streak: state.streak, badges: state.badges });
    recordRunResult('DERROTA');
    log(`Game Over. Racha final: ${state.streak} | Medallas: ${state.badges}`);
    $('start-buttons').style.display = 'flex';
    if (typeof refreshSeedUiState === 'function') refreshSeedUiState();
    $('btn-normal').innerText = 'Reintentar (Normal)';
    $('btn-nuzlocke').innerText = 'Reintentar (Nuzlocke)';
    turnLock = true; 
    renderAll();
  } else {
    openSwitchMenu(true);
  }
}

/* =========================================================
   ACTIONS
========================================================= */
function usePotion() {
  if (hasDailyModifier('NO_POTION')) {
    log('Regla diaria: no puedes usar Pociones.');
    recordRunEvent('action_blocked', { action: 'potion', reason: 'daily_no_potion' });
    return;
  }
  if (turnLock) return;
  const p = state.team[state.activeIdx];
  if(state.inventory.pots > 0 && p.hp < p.maxHp) {
    if (typeof recordTelemetryTurn === 'function') recordTelemetryTurn('potion');
    turnLock = true;
    advanceActionCooldowns(p);
    state.inventory.pots--;
    const healAmount = Math.floor(p.maxHp * 0.60);
    p.hp = Math.min(p.maxHp, p.hp + healAmount);
    recordRunEvent('use_potion', { pokemon: p.name, healAmount, hp: p.hp, maxHp: p.maxHp });
    if (typeof recordReplayAction === 'function') {
      recordReplayAction('POTION', { pokemon: p.name, healAmount, hp: p.hp, maxHp: p.maxHp });
    }
    log(`Usaste Poción. ${p.name} recuperó ${healAmount} PS.`);
    renderAll();
    
    // Heal particles
    spawnParticles('Planta', $('player-sprite-slot'));

    setTimeout(async () => {
      let oppMoveKey = chooseRandomUsableMoveKey(opponent);
      const oppMove = oppMoveKey ? MOVES[oppMoveKey] : null;

      await executeMove(opponent, p, oppMove, false, { canFlinchTarget: false, moveKey: oppMoveKey, attackerSide: false });
      
      await runStatusDamage(p, true);
      if(p.hp > 0) await runStatusDamage(opponent, false);
      if (p.hp > 0) runLeechSeed(p, true);
      if (opponent.hp > 0) runLeechSeed(opponent, false);
      if (p.hp > 0) runPerishCountdown(p, true);
      if (opponent.hp > 0) runPerishCountdown(opponent, false);
      if (p.hp > 0) runWeatherDamage(p);
      if (opponent.hp > 0) runWeatherDamage(opponent);
      if (p.hp > 0) runBattleEventEndTurn(p);
      if (opponent.hp > 0) runBattleEventEndTurn(opponent);
      decayCombo(p);
      decayCombo(opponent);
      tickFieldEndTurn();
      
      renderAll();

      if(p.hp <= 0) {
        await handleDeath(p, true);
      } else {
         turnLock = false;
         renderAll();
      }
    }, 1000);
  }
}

async function attemptCapture() {
  if (hasDailyModifier('NO_CAPTURE')) {
    log('Regla diaria: no puedes capturar.');
    recordRunEvent('action_blocked', { action: 'capture', reason: 'daily_no_capture' });
    return;
  }
  if(turnLock || state.inventory.balls <= 0) return;
  if (typeof recordTelemetryTurn === 'function') recordTelemetryTurn('ball');
  turnLock = true;
  advanceActionCooldowns(state.team[state.activeIdx]);
  state.inventory.balls--;
  renderAll();
  
  log(`¡Lanzaste una Pokéball!`);
  
  const ball = document.createElement('div');
  ball.innerHTML = 'O';
  ball.style.position = 'absolute';
  ball.style.left = '20%'; ball.style.bottom = '20%'; ball.style.fontSize = '30px';
  ball.style.zIndex = 100;
  $('battle-scene').appendChild(ball);
  
  await anime({
      targets: ball,
      left: '70%', top: '20%',
      rotate: '2turn',
      duration: 500,
      easing: 'easeInQuad'
  }).finished;
  
  // Shake effect on capture attempt
  await anime({
      targets: ball,
      translateX: [0, -5, 5, -5, 5, 0],
      duration: 600,
      easing: 'linear'
  }).finished;
  
  ball.remove();
  
  const hpFactor = (opponent.maxHp - opponent.hp) / opponent.maxHp; 
  const statusBonus = opponent.status ? 0.2 : 0;
  const chance = 0.4 + (hpFactor * 0.5) + statusBonus; 
  recordRunEvent('capture_attempt', { opponent: opponent.name, chance });
  if (typeof recordReplayAction === 'function') {
    recordReplayAction('CAPTURE_ATTEMPT', { opponent: opponent.name, chance });
  }
  
  if(gameRandom() < chance) {
    recordRunEvent('capture_result', { result: 'success', opponent: opponent.name });
    log(`¡Capturaste a <b>${opponent.name}</b>!`);
    opponent.xp = 0;
    opponent.xpToNext = opponent.level * 60 + 100;
    opponent.hp = opponent.maxHp; 
    opponent.status = null; 
    opponent.resetStages();

    if (state.team.length < CONSTANTS.MAX_TEAM) {
      state.team.push(opponent);
      await wait(1000);
      startBattle();
    } else {
      openPartyFullMenu(opponent);
    }
  } else {
    recordRunEvent('capture_result', { result: 'fail', opponent: opponent.name });
    log(`¡${opponent.name} se liberó!`);
    
    let oppMoveKey = chooseRandomUsableMoveKey(opponent);
    const oppMove = oppMoveKey ? MOVES[oppMoveKey] : null;

    await executeMove(opponent, state.team[state.activeIdx], oppMove, false, { canFlinchTarget: false, moveKey: oppMoveKey, attackerSide: false });
    
    const p = state.team[state.activeIdx];
    await runStatusDamage(p, true);
    if(p.hp > 0) await runStatusDamage(opponent, false);
    if (p.hp > 0) runLeechSeed(p, true);
    if (opponent.hp > 0) runLeechSeed(opponent, false);
    if (p.hp > 0) runPerishCountdown(p, true);
    if (opponent.hp > 0) runPerishCountdown(opponent, false);
    if (p.hp > 0) runWeatherDamage(p);
    if (opponent.hp > 0) runWeatherDamage(opponent);
    if (p.hp > 0) runBattleEventEndTurn(p);
    if (opponent.hp > 0) runBattleEventEndTurn(opponent);
    decayCombo(p);
    decayCombo(opponent);
    tickFieldEndTurn();

    renderAll();
    
    if(p.hp <= 0) {
        await handleDeath(p, true);
    } else {
        turnLock = false;
        renderAll();
    }
  }
}

function openPartyFullMenu(newMon) {
  const overlay = $('party-full-overlay');
  const list = $('party-full-list');
  list.innerHTML = '';
  
  state.team.forEach((p, idx) => {
    const div = document.createElement('div');
    const shiny = p.isShiny ? '[S] ' : '';
    div.className = 'modal-card';
    div.innerHTML = `<span>${shiny}${p.name} (Nv${p.level})</span> <small>Liberar</small>`;
    div.onclick = async () => {
      log(`Has liberado a ${p.name}. ¡Bienvenido ${newMon.name}!`);
      state.team[idx] = newMon; 
      overlay.style.display = 'none';
      await wait(1000);
      startBattle();
    };
    list.appendChild(div);
  });

  const btnReleaseNew = $('btn-release-new');
  btnReleaseNew.onclick = async () => {
    log(`Liberaste a ${newMon.name}.`);
    overlay.style.display = 'none';
    await wait(1000);
    startBattle();
  };

  overlay.style.display = 'flex';
  
  // Animation
  anime({
     targets: '#party-full-overlay',
     opacity: [0, 1],
     translateY: [20, 0],
     duration: 300,
     easing: 'easeOutQuad'
  });
}

function openSwitchMenu(forced = false) {
  const overlay = $('switch-overlay');
  const list = $('switch-list');
  list.innerHTML = '';
  
  state.team.forEach((p, idx) => {
    const div = document.createElement('div');
    const fainted = p.hp <= 0;
    const shiny = p.isShiny ? '[S] ' : '';
    const active = idx === state.activeIdx;
    
    div.className = `modal-card ${fainted ? 'fainted' : ''} ${active ? 'selected' : ''}`;
    div.innerHTML = `
      <span>${shiny}${p.name} (Nv${p.level})</span>
      <b>${p.hp}/${p.maxHp} HP</b>
    `;
    if(!fainted) {
      div.onclick = () => doSwitch(idx, forced);
    }
    list.appendChild(div);
  });
  
  overlay.style.display = 'flex';
  if(forced) $('switch-overlay').querySelector('button').style.display = 'none'; 
  else $('switch-overlay').querySelector('button').style.display = 'block'; 

  // Stagger animation for list items
  anime({
     targets: '.modal-card',
     translateX: [-20, 0],
     opacity: [0, 1],
     delay: anime.stagger(50),
     duration: 300,
     easing: 'easeOutQuad'
  });
}

function closeSwitchMenu() {
  $('switch-overlay').style.display = 'none';
}

function getAutoSwitchCandidateIndex() {
  for (let i = 0; i < state.team.length; i++) {
    if (i === state.activeIdx) continue;
    if ((state.team[i]?.hp || 0) > 0) return i;
  }
  return -1;
}

function doAutoSwitch(forced = true, opts = {}) {
  const idx = getAutoSwitchCandidateIndex();
  if (idx < 0) return false;
  doSwitch(idx, forced, opts);
  return true;
}

function doSwitch(idx, forced, opts = {}) {
  if(idx === state.activeIdx && state.team[idx].hp > 0) {
    closeSwitchMenu();
    return;
  }
  const oldMon = state.team[state.activeIdx];
  if (!forced && typeof recordTelemetryTurn === 'function') recordTelemetryTurn('switch');
  if (!forced && oldMon) advanceActionCooldowns(oldMon);
  if (oldMon && typeof restoreTransformation === 'function') restoreTransformation(oldMon);
  let passedStages = null;
  if (oldMon) {
    if (opts.preservePositiveStages && oldMon.stages) {
      passedStages = {};
      Object.keys(oldMon.stages).forEach(stat => {
        passedStages[stat] = Math.max(0, Number(oldMon.stages[stat]) || 0);
      });
    }
    oldMon.stages = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
    oldMon.leechSeedBySide = null;
    oldMon.perishTurns = 0;
    oldMon.comboStacks = 0;
    oldMon.lastMoveType = null;
    oldMon.chainMoveKey = null;
    oldMon.chainMoveStacks = 0;
    oldMon.chargingMoveKey = null;
    oldMon.rechargeTurns = 0;
    oldMon.protectThisTurn = false;
    oldMon.protectStreak = 0;
    oldMon.healBlockTurns = 0;
    oldMon.disableTurns = 0;
    oldMon.disabledMoveKey = null;
    oldMon.lastUsedMoveKey = null;
    oldMon.pendingSwitch = null;
  }

  state.activeIdx = idx;
  const incoming = state.team[state.activeIdx];
  if (passedStages && incoming) {
    incoming.stages = incoming.stages || { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
    Object.keys(passedStages).forEach(stat => {
      incoming.stages[stat] = Math.max(-6, Math.min(6, Number(passedStages[stat]) || 0));
    });
    log(`${incoming.name} recibió los aumentos por Relevo.`);
  }
  applyEntryHazards(incoming, true);
  if (incoming.hp <= 0) {
    log(`${incoming.name} cayó al entrar.`);
  }
  recordRunEvent('switch', { idx, forced, pokemon: state.team[idx]?.name || null });
  if (typeof recordReplayAction === 'function') {
    recordReplayAction('SWITCH', { idx, forced, pokemon: state.team[idx]?.name || null });
  }
  log(`¡Adelante <b>${state.team[idx].name}</b>!`);
  closeSwitchMenu();
  renderAll();
  runPluginHook('afterSwitch', { idx, forced, pokemon: state.team[state.activeIdx], opponent });

  if (incoming.hp <= 0) {
    handleDeath(incoming, true);
    return;
  }
  
  if(!forced) {
    turnLock = true;
    renderAll(); 

    setTimeout(async () => {
      try {
        const p = state.team[state.activeIdx];
        
        let oppMoveKey = chooseRandomUsableMoveKey(opponent);
        const oppMove = oppMoveKey ? MOVES[oppMoveKey] : null;
        
        log(`El rival aprovecha el cambio.`);
        await executeMove(opponent, p, oppMove, false, { canFlinchTarget: false, moveKey: oppMoveKey, attackerSide: false });
        
        await runStatusDamage(p, true);
        if (p.hp > 0) runLeechSeed(p, true);
        if (opponent.hp > 0) runLeechSeed(opponent, false);
        if (p.hp > 0) runPerishCountdown(p, true);
        if (opponent.hp > 0) runPerishCountdown(opponent, false);
        if (p.hp > 0) runWeatherDamage(p);
        if (opponent.hp > 0) runWeatherDamage(opponent);
        if (p.hp > 0) runBattleEventEndTurn(p);
        if (opponent.hp > 0) runBattleEventEndTurn(opponent);
        decayCombo(p);
        decayCombo(opponent);
        tickFieldEndTurn();
        renderAll();

        if(p.hp <= 0) {
          await handleDeath(p, true);
        } else {
          turnLock = false; 
        }
      } catch (e) {
        console.error("Error durante el cambio:", e);
        turnLock = false; 
      } finally {
        renderAll();
      }
    }, 1000);
  } else {
    turnLock = false;
    renderAll();
  }
}
