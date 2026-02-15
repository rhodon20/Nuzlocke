function getStageMultiplier(stage) {
  if (stage >= 0) return (2 + stage) / 2;
  return 2 / (2 + Math.abs(stage));
}

function getMoveHitChance(attacker, defender, move) {
  if (!move) return 0;
  if (move.alwaysHit) return 1;

  const baseAccuracy = Number.isFinite(move.accuracy) ? move.accuracy : 1;
  const accStage = attacker?.stages?.acc || 0;
  const evaStage = defender?.stages?.eva || 0;
  const stageMult = getStageMultiplier(accStage - evaStage);
  const evt = getRunEvent();
  const eventAccMult = evt?.accMult || 1;
  const total = baseAccuracy * stageMult * eventAccMult;
  return Math.max(0, Math.min(1, total));
}

function getComboDamageMultiplier(mon) {
  const stacks = Math.max(0, Math.min(3, mon?.comboStacks || 0));
  return 1 + (stacks * 0.05);
}

function updateComboOnSuccessfulAction(mon, move) {
  if (!mon || !move) return;
  if (move.cat === 'Est') return;
  const prevType = mon.lastMoveType;
  if (prevType && prevType !== move.tipo) {
    mon.comboStacks = Math.min(3, (mon.comboStacks || 0) + 1);
    if (mon.comboStacks > 0) log(`Combo de ${mon.name}: x${mon.comboStacks}`);
  } else if (!prevType) {
    mon.comboStacks = 1;
  }
  mon.lastMoveType = move.tipo || null;
}

function decayCombo(mon) {
  if (!mon) return;
  mon.comboStacks = Math.max(0, (mon.comboStacks || 0) - 1);
}

function getMoveCooldown(mon, moveKey) {
  if (!mon || !moveKey || !mon.moveCooldowns) return 0;
  return Math.max(0, mon.moveCooldowns[moveKey] || 0);
}

function isMoveDisabled(mon, moveKey) {
  if (!mon || !moveKey) return false;
  if (!Number.isFinite(mon.disableTurns) || mon.disableTurns <= 0) return false;
  return mon.disabledMoveKey === moveKey;
}

function tickMoveCooldowns(mon) {
  if (!mon) return;
  if (!mon.moveCooldowns) mon.moveCooldowns = {};
  Object.keys(mon.moveCooldowns).forEach(key => {
    const next = Math.max(0, (mon.moveCooldowns[key] || 0) - 1);
    mon.moveCooldowns[key] = next;
  });
}

function setMoveCooldown(mon, moveKey, cooldown) {
  if (!mon || !moveKey) return;
  if (!mon.moveCooldowns) mon.moveCooldowns = {};
  const turns = Math.max(0, Number(cooldown) || 0);
  mon.moveCooldowns[moveKey] = turns;
}

function getUsableMoveKeys(mon) {
  if (!mon || !Array.isArray(mon.moves)) return [];
  return mon.moves.filter(mKey => MOVES[mKey] && getMoveCooldown(mon, mKey) <= 0 && !isMoveDisabled(mon, mKey));
}

function chooseRandomUsableMoveKey(mon) {
  const usable = getUsableMoveKeys(mon);
  if (usable.length > 0) return usable[Math.floor(gameRandom() * usable.length)];
  if (Array.isArray(mon?.moves) && mon.moves.length > 0) {
    return mon.moves[Math.floor(gameRandom() * mon.moves.length)];
  }
  return null;
}

function hasTypeStatusImmunity(mon, status) {
  if (!mon || !Array.isArray(mon.types)) return false;
  if (status === 'BRN') return mon.types.includes('Fuego');
  if (status === 'FRZ') return mon.types.includes('Hielo');
  if (status === 'PSN') return mon.types.includes('Veneno') || mon.types.includes('Acero');
  if (status === 'PAR') return mon.types.includes('Eléctrico');
  return false;
}

function canInflictStatus(mon, status, opts = {}) {
  if (!mon || mon.hp <= 0) return false;
  if (mon.status && !opts.ignoreCurrentStatus) return false;
  if (!opts.ignoreTypeImmunity && hasTypeStatusImmunity(mon, status)) return false;
  if (!opts.ignoreShield && ['SLP', 'PAR', 'FRZ'].includes(status) && (mon.statusShieldTurns || 0) > 0) return false;
  return true;
}

function canInflictConfusion(mon, opts = {}) {
  if (!mon || mon.hp <= 0) return false;
  if (!opts.ignoreCurrent && (mon.confusionTurns || 0) > 0) return false;
  if (!opts.ignoreShield && (mon.confusionShieldTurns || 0) > 0) return false;
  return true;
}

function initStatusDuration(mon, status) {
  if (!mon) return;
  if (status === 'SLP') mon.sleepTurns = 2 + Math.floor(gameRandom() * 3); // 2-4 turns
  if (status === 'FRZ') mon.freezeTurns = 1 + Math.floor(gameRandom() * 3); // 1-3 turns
}

function resetBattleField() {
  battleField = {
    player: { reflectTurns: 0, lightScreenTurns: 0, spikesLayers: 0, toxicSpikesLayers: 0, stealthRock: false },
    opponent: { reflectTurns: 0, lightScreenTurns: 0, spikesLayers: 0, toxicSpikesLayers: 0, stealthRock: false },
    weather: { type: null, turns: 0 },
    runEvent: null
  };
}

function getSideFieldState(isPlayerSide) {
  return isPlayerSide ? battleField.player : battleField.opponent;
}

function clearSideHazards(side, opts = {}) {
  if (!side) return { spikes: 0, toxicSpikes: 0, stealthRock: false, reflect: 0, lightScreen: 0 };
  const removed = {
    spikes: side.spikesLayers || 0,
    toxicSpikes: side.toxicSpikesLayers || 0,
    stealthRock: !!side.stealthRock,
    reflect: 0,
    lightScreen: 0
  };
  side.spikesLayers = 0;
  side.toxicSpikesLayers = 0;
  side.stealthRock = false;
  if (opts.clearScreens) {
    removed.reflect = side.reflectTurns || 0;
    removed.lightScreen = side.lightScreenTurns || 0;
    side.reflectTurns = 0;
    side.lightScreenTurns = 0;
  }
  return removed;
}

function getActiveMonBySide(isPlayerSide) {
  if (typeof pvpState !== 'undefined' && pvpState?.active) {
    const side = isPlayerSide ? pvpState.p1 : pvpState.p2;
    return side?.team?.[side.activeIdx] || null;
  }
  if (isPlayerSide) return state.team?.[state.activeIdx] || null;
  return opponent || null;
}

function isPlayerSideMon(mon) {
  return mon === getActiveMonBySide(true);
}

function runLeechSeed(mon, isPlayerSide) {
  if (!mon || mon.hp <= 0) return;
  const sourceSide = mon.leechSeedBySide;
  if (sourceSide === null || sourceSide === undefined) return;

  const drain = Math.max(1, Math.floor(mon.maxHp / 8));
  mon.hp = Math.max(0, mon.hp - drain);
  const healer = getActiveMonBySide(!!sourceSide);
  if (healer && healer.hp > 0) {
    healer.hp = Math.min(healer.maxHp, healer.hp + drain);
  }
  log(`${mon.name} pierde PS por Drenadoras.`);
}

function runPerishCountdown(mon, isPlayerSide) {
  if (!mon || mon.hp <= 0) return;
  if (!Number.isFinite(mon.perishTurns) || mon.perishTurns <= 0) return;

  mon.perishTurns = Math.max(0, mon.perishTurns - 1);
  if (mon.perishTurns > 0) {
    log(`Canto Mortal sobre ${mon.name}: ${mon.perishTurns}.`);
    return;
  }

  mon.hp = 0;
  log(`${mon.name} cayó por Canto Mortal.`);
}

function setWeather(weatherType, turns = 5) {
  battleField.weather = {
    type: weatherType || null,
    turns: Math.max(0, Number(turns) || 0)
  };
}

function getWeather() {
  return battleField.weather || { type: null, turns: 0 };
}

const RUN_EVENT_POOL = [
  { id: 'BLOOD_MOON', label: 'Luna Roja', desc: '+15% daño global.', dmgMult: 1.15 },
  { id: 'MYSTIC_FOG', label: 'Niebla Mística', desc: '-10% precisión global.', accMult: 0.9 },
  { id: 'HEALING_BREEZE', label: 'Brisa Vital', desc: 'Todos recuperan PS al final de turno.', endTurnHealPct: 1 / 16 }
];

function maybeSelectRunEvent() {
  if (gameRandom() >= 0.25) return null;
  const idx = Math.floor(gameRandom() * RUN_EVENT_POOL.length);
  return RUN_EVENT_POOL[idx] || null;
}

function getRunEvent() {
  return battleField.runEvent || null;
}

function runBattleEventEndTurn(mon) {
  if (!mon || mon.hp <= 0) return;
  const evt = getRunEvent();
  if (!evt || !evt.endTurnHealPct) return;
  const heal = Math.max(1, Math.floor(mon.maxHp * evt.endTurnHealPct));
  const prev = mon.hp;
  mon.hp = Math.min(mon.maxHp, mon.hp + heal);
  if (mon.hp > prev) log(`${mon.name} recupera PS por ${evt.label}.`);
}

function runWeatherDamage(mon) {
  if (!mon || mon.hp <= 0) return;
  const weather = getWeather();
  if (!weather.type || weather.turns <= 0) return;

  const types = Array.isArray(mon.types) ? mon.types : [];
  if (weather.type === 'SAND') {
    if (types.includes('Roca') || types.includes('Tierra') || types.includes('Acero')) return;
    const dmg = Math.max(1, Math.floor(mon.maxHp / 16));
    mon.hp = Math.max(0, mon.hp - dmg);
    log(`${mon.name} sufre daño por tormenta de arena.`);
    return;
  }
  if (weather.type === 'HAIL') {
    if (types.includes('Hielo')) return;
    const dmg = Math.max(1, Math.floor(mon.maxHp / 16));
    mon.hp = Math.max(0, mon.hp - dmg);
    log(`${mon.name} sufre daño por granizo.`);
  }
}

function getSpikesDamageFraction(layers) {
  if (layers >= 3) return 0.25;
  if (layers === 2) return 1 / 6;
  if (layers === 1) return 1 / 8;
  return 0;
}

function applyEntryHazards(mon, isPlayerSide) {
  if (!mon || mon.hp <= 0) return;
  const side = getSideFieldState(isPlayerSide);
  const layers = Math.max(0, side.spikesLayers || 0);

  if (layers > 0 && !(Array.isArray(mon.types) && mon.types.includes('Volador'))) {
    const frac = getSpikesDamageFraction(layers);
    if (frac > 0) {
      const dmg = Math.max(1, Math.floor(mon.maxHp * frac));
      mon.hp = Math.max(0, mon.hp - dmg);
      log(`${mon.name} recibió daño por Púas (${layers} capa${layers > 1 ? 's' : ''}).`);
    }
  }

  if (side.stealthRock) {
    let mult = 1;
    if (TYPE_CHART['Roca']) {
      (mon.types || []).forEach(t => {
        if (TYPE_CHART['Roca'][t] !== undefined) mult *= TYPE_CHART['Roca'][t];
      });
    }
    if (mult > 0) {
      const rockFrac = (1 / 8) * mult;
      const rockDmg = Math.max(1, Math.floor(mon.maxHp * rockFrac));
      mon.hp = Math.max(0, mon.hp - rockDmg);
      log(`${mon.name} recibió daño por Trampa Rocas.`);
    }
  }

  const toxicLayers = Math.max(0, side.toxicSpikesLayers || 0);
  if (toxicLayers > 0) {
    const monTypes = Array.isArray(mon.types) ? mon.types : [];
    const isGrounded = !monTypes.includes('Volador');
    if (isGrounded) {
      if (monTypes.includes('Veneno')) {
        side.toxicSpikesLayers = 0;
        log(`${mon.name} absorbió las Púas Tóxicas.`);
      } else {
        const prevStatus = mon.status;
        applyStatusEffect(mon, 'PSN');
        if (prevStatus !== mon.status) {
          log(`${mon.name} fue envenenado por Púas Tóxicas.`);
        }
      }
    }
  }
}

function tickFieldEndTurn() {
  [true, false].forEach(isPlayerSide => {
    const mon = getActiveMonBySide(isPlayerSide);
    if (!mon) return;
    if (mon.protectThisTurn) mon.protectThisTurn = false;
    if ((mon.tauntTurns || 0) > 0) {
      mon.tauntTurns = Math.max(0, mon.tauntTurns - 1);
      if (mon.tauntTurns <= 0) log(`${mon.name} ya no está bajo Mofa.`);
    }
    if ((mon.disableTurns || 0) > 0) {
      mon.disableTurns = Math.max(0, mon.disableTurns - 1);
      if (mon.disableTurns <= 0) {
        mon.disabledMoveKey = null;
        log(`${mon.name} ya no está bajo Anulación.`);
      }
    }
    if ((mon.healBlockTurns || 0) > 0) {
      mon.healBlockTurns = Math.max(0, mon.healBlockTurns - 1);
      if (mon.healBlockTurns <= 0) log(`${mon.name} ya puede curarse de nuevo.`);
    }
  });

  const sides = [true, false];
  sides.forEach(isPlayerSide => {
    const side = getSideFieldState(isPlayerSide);
    if ((side.reflectTurns || 0) > 0) {
      side.reflectTurns--;
      if (side.reflectTurns <= 0) {
        log(`Reflejo de ${isPlayerSide ? 'tu lado' : 'lado rival'} se disipó.`);
      }
    }
    if ((side.lightScreenTurns || 0) > 0) {
      side.lightScreenTurns--;
      if (side.lightScreenTurns <= 0) {
        log(`Pantalla Luz de ${isPlayerSide ? 'tu lado' : 'lado rival'} se disipó.`);
      }
    }
  });

  const weather = getWeather();
  if (weather.type && weather.turns > 0) {
    weather.turns--;
    if (weather.turns <= 0) {
      log(`El clima volvió a la normalidad.`);
      setWeather(null, 0);
    } else {
      battleField.weather = weather;
    }
  }
}



