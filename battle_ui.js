(function initBattleUi() {
  const WEATHER_UI = {
    RAIN: { label: 'Lluvia', className: 'weather-rain' },
    SUN: { label: 'Sol', className: 'weather-sun' },
    SAND: { label: 'Arena', className: 'weather-sand' },
    HAIL: { label: 'Granizo', className: 'weather-hail' }
  };

  function chip(label, className = '') {
    return `<span class="${className}">${label}</span>`;
  }

  function renderSideEffects(side, targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const items = [];
    if ((side?.reflectTurns || 0) > 0) items.push(chip(`Reflejo ${side.reflectTurns}`, 'field-chip screen'));
    if ((side?.lightScreenTurns || 0) > 0) items.push(chip(`Pantalla ${side.lightScreenTurns}`, 'field-chip screen'));
    if ((side?.spikesLayers || 0) > 0) items.push(chip(`Púas ×${side.spikesLayers}`, 'field-chip hazard'));
    if ((side?.toxicSpikesLayers || 0) > 0) items.push(chip(`Púas Tóx. ×${side.toxicSpikesLayers}`, 'field-chip hazard'));
    if (side?.stealthRock) items.push(chip('Trampa Rocas', 'field-chip hazard'));
    target.innerHTML = items.join('');
    target.hidden = items.length === 0;
  }

  function renderBattleEnvironment(options = {}) {
    const scene = document.getElementById('battle-scene');
    if (!scene || typeof battleField === 'undefined') return;
    const weather = battleField.weather || { type: null, turns: 0 };
    Object.values(WEATHER_UI).forEach(item => scene.classList.remove(item.className));
    scene.classList.remove('event-blood-moon', 'event-mystic-fog', 'event-healing-breeze');
    const weatherUi = WEATHER_UI[weather.type];
    if (weatherUi && weather.turns > 0) scene.classList.add(weatherUi.className);

    const context = document.getElementById('battle-context');
    const contextItems = [];
    if (weatherUi && weather.turns > 0) contextItems.push(chip(`${weatherUi.label} · ${weather.turns}`, 'battle-context-chip'));
    if (battleField.runEvent?.label) {
      const eventClass = `event-${String(battleField.runEvent.id || '').toLowerCase().replaceAll('_', '-')}`;
      scene.classList.add(eventClass);
      contextItems.push(`<span class="battle-context-chip ${eventClass}" title="${battleField.runEvent.desc || ''}">${battleField.runEvent.label}</span>`);
    }
    if (context) {
      context.innerHTML = contextItems.join('');
      context.hidden = contextItems.length === 0;
    }

    const localIsP1 = options.localIsP1 !== false;
    renderSideEffects(localIsP1 ? battleField.player : battleField.opponent, 'player-field-effects');
    renderSideEffects(localIsP1 ? battleField.opponent : battleField.player, 'opponent-field-effects');
  }

  function getMonEffectBadges(mon) {
    if (!mon) return '';
    const effects = [];
    if ((mon.confusionTurns || 0) > 0) effects.push(chip(`Confusión ${mon.confusionTurns}`, 'effect-chip control'));
    if ((mon.statusShieldTurns || 0) > 0) effects.push(chip(`Escudo ${mon.statusShieldTurns}`, 'effect-chip'));
    if ((mon.healBlockTurns || 0) > 0) effects.push(chip(`Sin cura ${mon.healBlockTurns}`, 'effect-chip control'));
    if ((mon.disableTurns || 0) > 0) effects.push(chip(`Anulado ${mon.disableTurns}`, 'effect-chip control'));
    if ((mon.tauntTurns || 0) > 0) effects.push(chip(`Mofa ${mon.tauntTurns}`, 'effect-chip control'));
    if ((mon.perishTurns || 0) > 0) effects.push(chip(`Canto ${mon.perishTurns}`, 'effect-chip danger'));
    if (mon.leechSeedBySide !== null && mon.leechSeedBySide !== undefined) effects.push(chip('Drenadoras', 'effect-chip danger'));
    if (mon.protectThisTurn) effects.push(chip('Protección', 'effect-chip'));
    if ((mon.chainMoveStacks || 0) > 1) effects.push(chip(`Cadena ×${mon.chainMoveStacks}`, 'effect-chip'));
    if (mon.chargingMoveKey) effects.push(chip(`Preparando ${MOVES[mon.chargingMoveKey]?.nombre || mon.chargingMoveKey}`, 'effect-chip control'));
    if ((mon.rechargeTurns || 0) > 0) effects.push(chip('Recarga', 'effect-chip control'));
    return effects.join('');
  }

  function getMonStatusBadge(mon) {
    if (!mon?.status) return '';
    let turns = 0;
    if (mon.status === 'SLP') turns = mon.sleepTurns || 0;
    if (mon.status === 'FRZ') turns = mon.freezeTurns || 0;
    const label = turns > 0 ? `${mon.status} ${turns}` : mon.status;
    return chip(label, `status-tag status-${mon.status}`);
  }

  function getEmergencyMoveButton(mon, handler = 'doTurn') {
    if ((mon?.rechargeTurns || 0) > 0) {
      return `<button class="btn-move type-Normal emergency-move" onclick="${handler}('Recharge')">Recargar<br><small>Debe recuperar energía este turno</small></button>`;
    }
    if (typeof shouldUseStruggle !== 'function' || !shouldUseStruggle(mon)) return '';
    return `<button class="btn-move type-Normal emergency-move" onclick="${handler}('Struggle')">
      Combate<br><small>Sin movimientos disponibles · Poder 50</small>
    </button>`;
  }

  function getMoveStrategyLabel(move) {
    if (move?.multiHit) return `Golpes ${move.multiHit.min}-${move.multiHit.max}`;
    if (move?.chainPower) return `Cadena ×${move.chainPower.multiplier}`;
    if (move?.drain) return `Drena ${Math.round(move.drain * 100)}%`;
    if (move?.recoil) return `Retroceso ${Math.round(move.recoil * 100)}%`;
    if (move?.chargeTurns) return 'Carga 1 turno';
    if (move?.rechargeTurns) return 'Recarga 1 turno';
    if (move?.ohko) return 'KO directo';
    if (move?.variablePower) return 'Potencia variable';
    return '';
  }

  window.renderBattleEnvironment = renderBattleEnvironment;
  window.getMonEffectBadges = getMonEffectBadges;
  window.getMonStatusBadge = getMonStatusBadge;
  window.getEmergencyMoveButton = getEmergencyMoveButton;
  window.getMoveStrategyLabel = getMoveStrategyLabel;
})();
