function applyEffect(attacker, defender, move, turnMeta = {}) {
    const effects = [];
    if (Array.isArray(move.effects) && move.effects.length) {
      move.effects.forEach(e => effects.push(e));
    } else if (typeof move.effect === 'string' && move.effect.includes('|')) {
      const options = move.effect.split('|').map(e => e.trim()).filter(Boolean);
      if (options.length) effects.push(options[Math.floor(gameRandom() * options.length)]);
    } else if (move.effect) {
      effects.push(move.effect);
    }

    effects.forEach(effect => applySingleEffect(attacker, defender, effect, turnMeta));
}

function applySingleEffect(attacker, defender, effect, turnMeta = {}) {
    if (!effect) return;

    if (typeof effect === 'object') {
      const target = effect.target === 'self' ? attacker : defender;
      if (effect.type === 'stat' && effect.stat && Number.isFinite(effect.change)) {
        const statNames = { atk: 'Ataque', def: 'Defensa', spa: 'Ataque Esp.', spd: 'Defensa Esp.', spe: 'Velocidad' };
        applyStatChange(target, effect.stat, effect.change, statNames[effect.stat] || effect.stat);
      }
      if (effect.type === 'heal') applyHealEffect(target, effect.pct || 0.5);
      if (effect.type === 'status' && effect.status) applyStatusEffect(target, effect.status);
      return;
    }

    if (effect === 'SPD_DOWN') { applyStatChange(defender, 'spe', -1, 'Velocidad'); return; }
    if (effect === 'ATK_DOWN') { applyStatChange(defender, 'atk', -1, 'Ataque'); return; }
    if (effect === 'DEF_DOWN') { applyStatChange(defender, 'def', -1, 'Defensa'); return; }
    if (effect === 'SPA_DOWN') { applyStatChange(defender, 'spa', -1, 'Ataque Esp.'); return; }
    if (effect === 'SPDEF_DOWN') { applyStatChange(defender, 'spd', -1, 'Defensa Esp.'); return; }
    if (effect === 'ATK_UP') { applyStatChange(attacker, 'atk', 1, 'Ataque'); return; }
    if (effect === 'DEF_UP') { applyStatChange(attacker, 'def', 1, 'Defensa'); return; }
    if (effect === 'SPA_UP') { applyStatChange(attacker, 'spa', 1, 'Ataque Esp.'); return; }
    if (effect === 'SPDEF_UP') { applyStatChange(attacker, 'spd', 1, 'Defensa Esp.'); return; }
    if (effect === 'SPE_UP') { applyStatChange(attacker, 'spe', 1, 'Velocidad'); return; }
    if (effect === 'ACC_DOWN') { applyStatChange(defender, 'acc', -1, 'Precisión'); return; }
    if (effect === 'ACC_UP') { applyStatChange(attacker, 'acc', 1, 'Precisión'); return; }
    if (effect === 'EVA_DOWN') { applyStatChange(defender, 'eva', -1, 'Evasión'); return; }
    if (effect === 'EVA_UP') { applyStatChange(attacker, 'eva', 1, 'Evasión'); return; }
    if (effect === 'ALL_UP') {
      ['atk','def','spa','spd','spe'].forEach(s => attacker.stages[s] = Math.min(6, attacker.stages[s] + 1));
      log(`Todas las estadísticas de ${attacker.name} subieron.`);
      return;
    }
    if (effect === 'CON') {
      if (canInflictConfusion(defender)) {
        defender.confusionTurns = 2 + Math.floor(gameRandom() * 3);
        defender.confusionShieldTurns = 2;
        log(`${defender.name} quedó confundido.`);
      } else {
        log(`${defender.name} resistió la confusión.`);
      }
      return;
    }
    if (effect === 'FLI') {
      if (turnMeta.canFlinchTarget) {
        defender.flinched = true;
        log(`${defender.name} retrocedió.`);
      }
      return;
    }
    if (effect === 'REFLECT') {
      const side = getSideFieldState(!!turnMeta.attackerSide);
      side.reflectTurns = 5;
      log(`Reflejo protege a ${turnMeta.attackerSide ? 'tu lado' : 'el lado rival'} por 5 turnos.`);
      return;
    }
    if (effect === 'LIGHT_SCREEN') {
      const side = getSideFieldState(!!turnMeta.attackerSide);
      side.lightScreenTurns = 5;
      log(`Pantalla Luz protege a ${turnMeta.attackerSide ? 'tu lado' : 'el lado rival'} por 5 turnos.`);
      return;
    }
    if (effect === 'LEECH_SEED') {
      if (defender.types.includes('Planta')) {
        log(`${defender.name} es inmune a Drenadoras.`);
        return;
      }
      if (defender.leechSeedBySide !== null && defender.leechSeedBySide !== undefined) {
        log(`${defender.name} ya está afectado por Drenadoras.`);
        return;
      }
      defender.leechSeedBySide = !!turnMeta.attackerSide;
      log(`${defender.name} fue sembrado con Drenadoras.`);
      return;
    }
    if (effect === 'PERISH_SONG') {
      const alreadyActive = (attacker.perishTurns || 0) > 0 || (defender.perishTurns || 0) > 0;
      if (alreadyActive) {
        log(`Canto Mortal ya está activo.`);
        return;
      }
      attacker.perishTurns = 4;
      defender.perishTurns = 4;
      log(`¡Canto Mortal! Ambos Pokémon caerán en 3 turnos si no cambian.`);
      return;
    }
    if (effect === 'SPIKES') {
      const targetSide = getSideFieldState(!turnMeta.attackerSide);
      if ((targetSide.spikesLayers || 0) >= 3) {
        log(`El lado rival ya tiene Púas al máximo.`);
        return;
      }
      targetSide.spikesLayers = (targetSide.spikesLayers || 0) + 1;
      log(`Púas colocadas en ${turnMeta.attackerSide ? 'el lado rival' : 'tu lado'} (${targetSide.spikesLayers}/3).`);
      return;
    }
    if (effect === 'STEALTH_ROCK') {
      const targetSide = getSideFieldState(!turnMeta.attackerSide);
      if (targetSide.stealthRock) {
        log(`Trampa Rocas ya está activa en ese lado.`);
        return;
      }
      targetSide.stealthRock = true;
      log(`Trampa Rocas colocada en ${turnMeta.attackerSide ? 'el lado rival' : 'tu lado'}.`);
      return;
    }
    if (effect === 'TOXIC_SPIKES') {
      const targetSide = getSideFieldState(!turnMeta.attackerSide);
      if ((targetSide.toxicSpikesLayers || 0) >= 2) {
        log(`Las Púas Tóxicas ya están al máximo.`);
        return;
      }
      targetSide.toxicSpikesLayers = (targetSide.toxicSpikesLayers || 0) + 1;
      log(`Púas Tóxicas colocadas en ${turnMeta.attackerSide ? 'el lado rival' : 'tu lado'} (${targetSide.toxicSpikesLayers}/2).`);
      return;
    }
    if (effect === 'CLEAR_OWN_HAZARDS') {
      const ownSide = getSideFieldState(!!turnMeta.attackerSide);
      const removed = clearSideHazards(ownSide, { clearScreens: false });
      attacker.leechSeedBySide = null;
      const any = removed.spikes > 0 || removed.toxicSpikes > 0 || removed.stealthRock;
      if (any) log(`${attacker.name} despejó hazards de su lado.`);
      else log(`No había hazards que despejar en ese lado.`);
      return;
    }
    if (effect === 'DEFOG') {
      const ownSide = getSideFieldState(!!turnMeta.attackerSide);
      const oppSide = getSideFieldState(!turnMeta.attackerSide);
      const a = clearSideHazards(ownSide, { clearScreens: true });
      const b = clearSideHazards(oppSide, { clearScreens: true });
      const any = (a.spikes + a.toxicSpikes + (a.stealthRock ? 1 : 0) + a.reflect + a.lightScreen +
        b.spikes + b.toxicSpikes + (b.stealthRock ? 1 : 0) + b.reflect + b.lightScreen) > 0;
      if (any) log(`Despejar eliminó hazards/pantallas en el campo.`);
      applyStatChange(defender, 'eva', -1, 'Evasión');
      return;
    }
    if (effect === 'HAZE') {
      if (attacker.stages) attacker.stages = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
      if (defender.stages) defender.stages = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
      log(`Niebla anuló todos los cambios de estadísticas.`);
      return;
    }
    if (effect === 'HEAL_BLOCK') {
      if ((defender.healBlockTurns || 0) > 0) {
        log(`${defender.name} ya está bajo Anticura.`);
        return;
      }
      defender.healBlockTurns = 4;
      log(`${defender.name} no podrá curarse por 4 turnos.`);
      return;
    }
    if (effect === 'DISABLE') {
      if ((defender.disableTurns || 0) > 0 && defender.disabledMoveKey) {
        log(`${defender.name} ya tiene un movimiento anulado.`);
        return;
      }
      const targetMoveKey = defender.lastUsedMoveKey;
      if (!targetMoveKey || !MOVES[targetMoveKey]) {
        log(`Anulación falló: ${defender.name} no tiene movimiento objetivo.`);
        return;
      }
      defender.disabledMoveKey = targetMoveKey;
      defender.disableTurns = 3;
      log(`${defender.name} tiene anulado ${MOVES[targetMoveKey].nombre} por 3 turnos.`);
      return;
    }
    if (effect === 'TAUNT') {
      if ((defender.tauntTurns || 0) > 0) {
        log(`${defender.name} ya está bajo Mofa.`);
        return;
      }
      defender.tauntTurns = 3;
      log(`${defender.name} cayó bajo Mofa por 3 turnos.`);
      return;
    }
    if (effect === 'PROTECT') {
      const streak = Math.max(0, attacker.protectStreak || 0);
      const successChance = streak <= 0 ? 1 : Math.pow(0.5, streak);
      if (gameRandom() > successChance) {
        attacker.protectStreak = 0;
        attacker.protectThisTurn = false;
        log(`¡${attacker.name} falló Protección!`);
        return;
      }
      attacker.protectThisTurn = true;
      attacker.protectStreak = streak + 1;
      log(`${attacker.name} se protegió este turno.`);
      return;
    }
    if (effect === 'BATON_PASS') {
      attacker.pendingSwitch = { reason: 'BATON_PASS', preservePositiveStages: true };
      log(`${attacker.name} se prepara para Relevo.`);
      return;
    }
    if (effect === 'PIVOT_SWITCH') {
      attacker.pendingSwitch = { reason: 'PIVOT_SWITCH', preservePositiveStages: false };
      log(`${attacker.name} volverá tras golpear.`);
      return;
    }
    if (effect === 'RAIN') {
      setWeather('RAIN', 5);
      log(`¡Comenzó la lluvia!`);
      return;
    }
    if (effect === 'SUN') {
      setWeather('SUN', 5);
      log(`¡El sol abrasador aparece!`);
      return;
    }
    if (effect === 'SAND') {
      setWeather('SAND', 5);
      log(`¡Se levantó una tormenta de arena!`);
      return;
    }
    if (effect === 'HAIL') {
      setWeather('HAIL', 5);
      log(`¡Comenzó a granizar!`);
      return;
    }
    if (effect === 'HEAL_50') { applyHealEffect(attacker, 0.5); return; }
    if (effect === 'REST') {
      if ((attacker.healBlockTurns || 0) > 0) {
        log(`${attacker.name} no puede curarse por Anticura.`);
        return;
      }
      attacker.hp = attacker.maxHp;
      attacker.status = 'SLP';
      log(`${attacker.name} descansó y recuperó toda su vida.`);
      renderAll();
      return;
    }

    applyStatusEffect(defender, effect);
}

function applyHealEffect(mon, pct) {
  if ((mon.healBlockTurns || 0) > 0) {
    log(`${mon.name} no puede curarse por Anticura.`);
    return;
  }
  const amount = Math.max(1, Math.floor(mon.maxHp * pct));
  const prevHp = mon.hp;
  mon.hp = Math.min(mon.maxHp, mon.hp + amount);
  if (mon.hp === prevHp) {
    log(`${mon.name} ya está al máximo de PS.`);
  } else {
    log(`${mon.name} recuperó PS.`);
    renderAll();
  }
}

function applyStatusEffect(mon, status) {
  const statuses = ['BRN', 'PSN', 'PAR', 'FRZ', 'SLP'];
  if (!statuses.includes(status)) return;
  if (!canInflictStatus(mon, status)) {
    log(`${mon.name} resistió ${status}.`);
    return;
  }

  if (typeof tryStatus === 'function') {
    const prevStatus = mon.status;
    tryStatus(mon, status, 1.0);
    if (prevStatus !== mon.status) {
      initStatusDuration(mon, status);
      if (['SLP', 'PAR', 'FRZ'].includes(status)) mon.statusShieldTurns = 2;
      renderAll();
    }
    return;
  }

  mon.status = status;
  initStatusDuration(mon, status);
  if (['SLP', 'PAR', 'FRZ'].includes(status)) mon.statusShieldTurns = 2;
  log(`¡${mon.name} sufrió ${status}!`);
  renderAll();
}

function calcConfusionSelfDamage(mon) {
  const atk = mon.getStat('atk');
  const def = mon.getStat('def');
  const base = ((2 * mon.level / 5 + 2) * 40 * (atk / Math.max(1, def))) / 50 + 2;
  return Math.max(1, Math.floor(base * (gameRandom() * 0.15 + 0.85)));
}

function applyStatChange(mon, stat, change, statName) {
    if (!mon.stages) mon.stages = {};
    if (!Number.isFinite(mon.stages[stat])) mon.stages[stat] = 0;
    mon.stages[stat] += change;
    if (mon.stages[stat] > 6) mon.stages[stat] = 6;
    if (mon.stages[stat] < -6) mon.stages[stat] = -6;
    const dir = change > 0 ? 'subió' : 'bajó';
    log(`${mon.name}: Su ${statName} ${dir}.`);
}



