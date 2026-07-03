function createRunTelemetry() {
  return {
    version: 2,
    battlesStarted: 0,
    battlesWon: 0,
    battlesLost: 0,
    battleActive: false,
    turns: 0,
    damageDealt: 0,
    damageReceived: 0,
    items: { potions: 0, balls: 0, switches: 0 },
    moves: {},
    species: {},
    opponents: {},
    controlTurns: { inflicted: {}, suffered: {} },
    currentBattle: null
  };
}

function ensureRunTelemetry() {
  if (!state.telemetry || typeof state.telemetry !== 'object') state.telemetry = createRunTelemetry();
  const telemetry = state.telemetry;
  telemetry.items = { potions: 0, balls: 0, switches: 0, ...(telemetry.items || {}) };
  telemetry.moves = telemetry.moves && typeof telemetry.moves === 'object' ? telemetry.moves : {};
  telemetry.species = telemetry.species && typeof telemetry.species === 'object' ? telemetry.species : {};
  telemetry.opponents = telemetry.opponents && typeof telemetry.opponents === 'object' ? telemetry.opponents : {};
  telemetry.controlTurns = telemetry.controlTurns && typeof telemetry.controlTurns === 'object' ? telemetry.controlTurns : {};
  telemetry.controlTurns.inflicted = telemetry.controlTurns.inflicted && typeof telemetry.controlTurns.inflicted === 'object' ? telemetry.controlTurns.inflicted : {};
  telemetry.controlTurns.suffered = telemetry.controlTurns.suffered && typeof telemetry.controlTurns.suffered === 'object' ? telemetry.controlTurns.suffered : {};
  ['battlesStarted','battlesWon','battlesLost','turns','damageDealt','damageReceived'].forEach(key => {
    telemetry[key] = Number.isFinite(telemetry[key]) ? Math.max(0, telemetry[key]) : 0;
  });
  return telemetry;
}

function normalizeRunTelemetry(raw) {
  const normalized = createRunTelemetry();
  if (!raw || typeof raw !== 'object') return normalized;
  ['battlesStarted','battlesWon','battlesLost','turns','damageDealt','damageReceived'].forEach(key => {
    normalized[key] = Number.isFinite(raw[key]) ? Math.max(0, raw[key]) : 0;
  });
  normalized.items = { ...normalized.items, ...(raw.items || {}) };
  normalized.battleActive = !!raw.battleActive;
  ['species', 'opponents'].forEach(group => {
    Object.entries(raw[group] || {}).forEach(([key, value]) => {
      if (!value || typeof value !== 'object') return;
      normalized[group][key] = {
        battles: Math.max(0, Number(value.battles) || 0),
        wins: Math.max(0, Number(value.wins) || 0),
        losses: Math.max(0, Number(value.losses) || 0)
      };
    });
  });
  ['inflicted', 'suffered'].forEach(side => {
    Object.entries(raw.controlTurns?.[side] || {}).forEach(([key, value]) => {
      normalized.controlTurns[side][key] = Math.max(0, Number(value) || 0);
    });
  });
  normalized.currentBattle = raw.currentBattle && typeof raw.currentBattle === 'object' ? raw.currentBattle : null;
  Object.entries(raw.moves || {}).forEach(([key, value]) => {
    if (!MOVES[key] || !value || typeof value !== 'object') return;
    normalized.moves[key] = {
      uses: Math.max(0, Number(value.uses) || 0), attempts: Math.max(0, Number(value.attempts) || 0), hits: Math.max(0, Number(value.hits) || 0),
      misses: Math.max(0, Number(value.misses) || 0), damage: Math.max(0, Number(value.damage) || 0),
      totalHits: Math.max(0, Number(value.totalHits) || 0)
    };
  });
  return normalized;
}

function resetRunTelemetry() {
  state.telemetry = createRunTelemetry();
  return state.telemetry;
}

function isTelemetryEnabled() {
  return !(typeof pvpState !== 'undefined' && pvpState?.active);
}

function telemetrySpeciesName(mon) {
  return String(mon?.speciesKey || mon?.name || 'Desconocido');
}

function incrementTelemetryResult(group, key, result) {
  if (!key) return;
  const entry = group[key] || { battles: 0, wins: 0, losses: 0 };
  if (result === 'start') entry.battles++;
  if (result === 'win') entry.wins++;
  if (result === 'loss') entry.losses++;
  group[key] = entry;
}

function recordTelemetryBattle(result, context = {}) {
  if (!isTelemetryEnabled()) return;
  const telemetry = ensureRunTelemetry();
  if (result === 'start') {
    telemetry.battlesStarted++;
    telemetry.battleActive = true;
    telemetry.currentBattle = {
      player: telemetrySpeciesName(context.player),
      opponent: telemetrySpeciesName(context.opponent)
    };
    incrementTelemetryResult(telemetry.species, telemetry.currentBattle.player, 'start');
    incrementTelemetryResult(telemetry.opponents, telemetry.currentBattle.opponent, 'start');
  }
  if ((result === 'win' || result === 'loss') && telemetry.battleActive) {
    if (result === 'win') telemetry.battlesWon++;
    else telemetry.battlesLost++;
    incrementTelemetryResult(telemetry.species, telemetry.currentBattle?.player, result);
    incrementTelemetryResult(telemetry.opponents, telemetry.currentBattle?.opponent, result);
    telemetry.battleActive = false;
    telemetry.currentBattle = null;
  }
}

function recordTelemetryTurn(action = 'move') {
  if (!isTelemetryEnabled()) return;
  const telemetry = ensureRunTelemetry();
  telemetry.turns++;
  if (action === 'potion') telemetry.items.potions++;
  if (action === 'ball') telemetry.items.balls++;
  if (action === 'switch') telemetry.items.switches++;
  const player = state.team?.[state.activeIdx];
  const samples = [
    [opponent, telemetry.controlTurns.inflicted],
    [player, telemetry.controlTurns.suffered]
  ];
  samples.forEach(([mon, bucket]) => {
    if (!mon) return;
    if (mon.status) bucket[mon.status] = (bucket[mon.status] || 0) + 1;
    if ((mon.confusionTurns || 0) > 0) bucket.CON = (bucket.CON || 0) + 1;
  });
}

function recordTelemetryMove(moveKey, isPlayer, outcome = {}) {
  if (!isTelemetryEnabled()) return;
  if (!moveKey || moveKey === 'Recharge') return;
  const telemetry = ensureRunTelemetry();
  const damage = Math.max(0, Number(outcome.damage) || 0);
  if (isPlayer) telemetry.damageDealt += damage;
  else telemetry.damageReceived += damage;
  if (!isPlayer) return;
  const entry = telemetry.moves[moveKey] || { uses: 0, attempts: 0, hits: 0, misses: 0, damage: 0, totalHits: 0 };
  entry.uses++;
  if (outcome.missed) { entry.attempts++; entry.misses++; }
  else if (outcome.resolved) { if (!outcome.noAccuracy) entry.attempts++; entry.hits++; }
  entry.damage += damage;
  entry.totalHits += Math.max(0, Number(outcome.hits) || 0);
  telemetry.moves[moveKey] = entry;
}

function getTelemetrySummary(telemetry = state.telemetry) {
  if (!telemetry || typeof telemetry !== 'object') return null;
  const moves = Object.entries(telemetry.moves || {});
  const favorite = moves.sort((a, b) => (b[1]?.uses || 0) - (a[1]?.uses || 0))[0] || null;
  const totalAttempts = moves.reduce((sum, [, value]) => sum + (value?.attempts || 0), 0);
  const totalHits = moves.reduce((sum, [, value]) => sum + (value?.hits || 0), 0);
  const bestEntry = group => Object.entries(group || {}).sort((a, b) => (b[1]?.battles || 0) - (a[1]?.battles || 0))[0] || null;
  const topSpecies = bestEntry(telemetry.species);
  const topOpponent = bestEntry(telemetry.opponents);
  return {
    battles: telemetry.battlesStarted || 0,
    wins: telemetry.battlesWon || 0,
    losses: telemetry.battlesLost || 0,
    turns: telemetry.turns || 0,
    damageDealt: telemetry.damageDealt || 0,
    damageReceived: telemetry.damageReceived || 0,
    accuracyPct: totalAttempts > 0 ? Math.round((totalHits / totalAttempts) * 100) : 0,
    favoriteMove: favorite ? favorite[0] : null,
    favoriteUses: favorite ? favorite[1].uses || 0 : 0,
    averageTurns: telemetry.battlesStarted > 0 ? Math.round((telemetry.turns / telemetry.battlesStarted) * 10) / 10 : 0,
    topSpecies: topSpecies ? { name: topSpecies[0], ...topSpecies[1] } : null,
    topOpponent: topOpponent ? { name: topOpponent[0], ...topOpponent[1] } : null,
    controlTurns: {
      inflicted: { ...(telemetry.controlTurns?.inflicted || {}) },
      suffered: { ...(telemetry.controlTurns?.suffered || {}) }
    },
    items: { potions: 0, balls: 0, switches: 0, ...(telemetry.items || {}) }
  };
}

window.getTelemetrySummary = getTelemetrySummary;
