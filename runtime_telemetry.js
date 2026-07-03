function createRunTelemetry() {
  return {
    version: 1,
    battlesStarted: 0,
    battlesWon: 0,
    battlesLost: 0,
    battleActive: false,
    turns: 0,
    damageDealt: 0,
    damageReceived: 0,
    items: { potions: 0, balls: 0, switches: 0 },
    moves: {}
  };
}

function ensureRunTelemetry() {
  if (!state.telemetry || typeof state.telemetry !== 'object') state.telemetry = createRunTelemetry();
  const telemetry = state.telemetry;
  telemetry.items = { potions: 0, balls: 0, switches: 0, ...(telemetry.items || {}) };
  telemetry.moves = telemetry.moves && typeof telemetry.moves === 'object' ? telemetry.moves : {};
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

function recordTelemetryBattle(result) {
  const telemetry = ensureRunTelemetry();
  if (result === 'start') { telemetry.battlesStarted++; telemetry.battleActive = true; }
  if (result === 'win' && telemetry.battleActive) { telemetry.battlesWon++; telemetry.battleActive = false; }
  if (result === 'loss' && telemetry.battleActive) { telemetry.battlesLost++; telemetry.battleActive = false; }
}

function recordTelemetryTurn(action = 'move') {
  const telemetry = ensureRunTelemetry();
  telemetry.turns++;
  if (action === 'potion') telemetry.items.potions++;
  if (action === 'ball') telemetry.items.balls++;
  if (action === 'switch') telemetry.items.switches++;
}

function recordTelemetryMove(moveKey, isPlayer, outcome = {}) {
  if (typeof pvpState !== 'undefined' && pvpState?.active) return;
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
    items: { potions: 0, balls: 0, switches: 0, ...(telemetry.items || {}) }
  };
}

window.getTelemetrySummary = getTelemetrySummary;
