function startGame(mode) {
  const seedInput = $('seed-input');
  if (mode === 'daily') {
    if (!state.dailyChallenge || !state.dailyChallenge.active) {
      state.dailyChallenge = buildDailyChallenge(getTodayDateKey());
    }
    applyRunSeed(state.dailyChallenge.seed);
  } else if (mode === 'roguerun') {
    state.dailyChallenge = null;
    const fresh = autoGenerateSeed();
    applyRunSeed(fresh);
    if (seedInput) seedInput.value = state.runSeed;
  } else {
    state.dailyChallenge = null;
    applyRunSeed(seedInput ? seedInput.value : '');
  }
  if (seedInput) seedInput.value = state.runSeed;

  state.gameMode = mode;
  state.streak = 0;
  state.badges = 0;
  state.inventory.balls = CONSTANTS.START_BALLS;
  state.inventory.pots = CONSTANTS.START_POTS;
  state.activeIdx = 0;
  startRunTracking();
  
  let keys;
  if (mode === 'nuzlocke' || mode === 'daily') {
    keys = Object.keys(POKEMON_SPECIES);
  } else {
    keys = Object.keys(POKEMON_SPECIES).filter(k => POKEMON_SPECIES[k].tier === 1); 
    if (keys.length === 0) keys = Object.keys(POKEMON_SPECIES);
  }
  
  const randomStarter = keys[Math.floor(gameRandom() * keys.length)];
  state.team = [new Pokemon(randomStarter, 5, mode !== 'normal')]; 
  
  $('start-buttons').style.display = 'none';
  $('game-title').classList.add('hidden-title');
  if (mode === 'daily') $('mode-display').innerText = `Diario ${state.dailyChallenge.dateKey}`;
  else if (mode === 'roguerun') $('mode-display').innerText = 'RogueRun';
  else $('mode-display').innerText = mode === 'nuzlocke' ? 'Nuzlocke' : 'Normal';
  if (typeof refreshSeedUiState === 'function') refreshSeedUiState();
  
  $('combat-log').innerHTML = '';
  log(`Seed de run: <b>${state.runSeed}</b>`);
  if (mode === 'daily') {
    log(`Desafío Diario ${state.dailyChallenge.dateKey}`);
    log(`Reglas: ${state.dailyChallenge.labels.join(' | ')}`);
  } else {
    if (mode === 'roguerun') log('Modo RogueRun iniciado.');
    else log(mode === 'nuzlocke' ? "Modo Nuzlocke iniciado." : "Bienvenido a Kanto Rogue.");
  }
  
  closeSwitchMenu(); 
  turnLock = false; 
  if (mode === 'roguerun' && typeof startRogueRunMode === 'function') {
    startRogueRunMode();
    return;
  }
  startBattle();
}

function getTeamAverageLevel() {
  if (state.team.length === 0) return 5;
  const total = state.team.reduce((sum, p) => sum + p.level, 0);
  return Math.floor(total / state.team.length);
}

function startBattle() {
  const rogueCfg = (state.gameMode === 'roguerun' && typeof window !== 'undefined')
    ? (window.__rogueRunBattleConfig || null)
    : null;

  resetBattleField();
  state.team.forEach(p => {
      p.resetStages();
      if(p.hp > 0) p.status = null;
      p.leechSeedBySide = null;
  });

  const bgs = ['bg-forest', 'bg-cave', 'bg-ocean', 'bg-night', 'bg-volcano'];
  const newBg = bgs[Math.floor(gameRandom() * bgs.length)];
  $('battle-scene').className = newBg;

  const avgLevel = getTeamAverageLevel();
  let targetLevel;
  
  if (avgLevel < 15) targetLevel = Math.max(2, avgLevel - 2 + Math.floor(gameRandom() * 4)); 
  else if (avgLevel < 30) targetLevel = avgLevel + Math.floor(gameRandom() * 3); 
  else targetLevel = avgLevel + Math.floor(gameRandom() * 5);
  if (hasDailyModifier('ENEMY_LEVEL')) targetLevel += (state.dailyChallenge.enemyLevelBonus || 0);
  if (rogueCfg && Number.isFinite(rogueCfg.levelBonus)) targetLevel += rogueCfg.levelBonus;

  const currentTier = getTierFromLevel(targetLevel);

  let validKeys = Object.keys(POKEMON_SPECIES).filter(key => {
    const pData = POKEMON_SPECIES[key];
    const pTier = pData.spawnTier || 1; 
    return pTier <= currentTier;
  });

  if (validKeys.length === 0) validKeys = Object.keys(POKEMON_SPECIES);

  const pIdx = Math.floor(gameRandom() * validKeys.length);
  opponent = new Pokemon(validKeys[pIdx], targetLevel, state.gameMode === 'nuzlocke');

  const nextBattleIndex = state.streak + 1;
  const defaultMiniBoss = nextBattleIndex > 0 && (nextBattleIndex % 7 === 0);
  const isMiniBoss = rogueCfg ? !!rogueCfg.forceMiniBoss : defaultMiniBoss;
  if (isMiniBoss) {
    opponent.isMiniBoss = true;
    opponent.level += rogueCfg && Number.isFinite(rogueCfg.miniBossLevelBonus) ? rogueCfg.miniBossLevelBonus : 2;
    opponent.bonusMultiplier = (opponent.bonusMultiplier || 1) * 1.12;
    opponent.recalcStats();
    opponent.hp = opponent.maxHp;
  } else {
    opponent.isMiniBoss = false;
  }

  const evt = maybeSelectRunEvent();
  battleField.runEvent = evt;
  
  const shinyText = opponent.isShiny ? '[Shiny] ' : '';
  const bossText = opponent.isMiniBoss ? ' [MiniBoss]' : '';
  log(`¡Un ${shinyText}<b>${opponent.name}</b> Nvl ${opponent.level} (Tier ${currentTier}) salvaje apareció!${bossText}`);
  if (opponent.isMiniBoss) log(`Mini-jefe de racha: ${opponent.name} llega fortalecido.`);
  if (evt) log(`Evento: <b>${evt.label}</b> — ${evt.desc}`);
  if (rogueCfg?.label) log(`Nodo RogueRun: <b>${rogueCfg.label}</b>.`);
  recordRunEvent('encounter_start', {
    opponent: opponent.name,
    level: opponent.level,
    tier: currentTier,
    shiny: !!opponent.isShiny,
    miniBoss: !!opponent.isMiniBoss,
    runEvent: evt ? evt.id : null
  });
  
  turnLock = false; 
  renderAll();
  runPluginHook('afterStartBattle', { state, opponent });
  if (state.gameMode === 'roguerun' && typeof window !== 'undefined') window.__rogueRunBattleConfig = null;
}
