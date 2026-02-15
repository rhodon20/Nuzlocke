function normalizeInventory(rawInventory = {}) {
  const balls = Number.isFinite(rawInventory.balls) ? rawInventory.balls : 0;
  const legacyPots = Number.isFinite(rawInventory.potions) ? rawInventory.potions : 0;
  const pots = Number.isFinite(rawInventory.pots) ? rawInventory.pots : legacyPots;
  return { balls: Math.max(0, balls), pots: Math.max(0, pots) };
}

function migrateSaveData(raw) {
  const base = (raw && raw.state) ? raw.state : raw;
  if (!base || !Array.isArray(base.team)) throw new Error('Save corrupto');

  const migrated = {
    ...base,
    gameMode: base.gameMode || 'normal',
    runSeed: normalizeSeed(base.runSeed || ''),
    rngState: Number.isFinite(base.rngState) ? (base.rngState >>> 0) : 0,
    runStartedAt: Number.isFinite(base.runStartedAt) ? base.runStartedAt : 0,
    dailyChallenge: base.dailyChallenge || null,
    rogueRun: (base.rogueRun && typeof base.rogueRun === 'object') ? base.rogueRun : null,
    runLog: base.runLog || null,
    badges: Number.isFinite(base.badges) ? base.badges : 0,
    streak: Number.isFinite(base.streak) ? base.streak : 0,
    activeIdx: Number.isFinite(base.activeIdx) ? base.activeIdx : 0,
    inventory: normalizeInventory(base.inventory),
    team: base.team.map(d => {
      const p = new Pokemon(d.name, d.level, base.gameMode === 'nuzlocke');
      Object.assign(p, d);
      p.stages = {
        atk: Number.isFinite(p.stages?.atk) ? p.stages.atk : 0,
        def: Number.isFinite(p.stages?.def) ? p.stages.def : 0,
        spa: Number.isFinite(p.stages?.spa) ? p.stages.spa : 0,
        spd: Number.isFinite(p.stages?.spd) ? p.stages.spd : 0,
        spe: Number.isFinite(p.stages?.spe) ? p.stages.spe : 0,
        acc: Number.isFinite(p.stages?.acc) ? p.stages.acc : 0,
        eva: Number.isFinite(p.stages?.eva) ? p.stages.eva : 0
      };
      p.moveCooldowns = p.moveCooldowns && typeof p.moveCooldowns === 'object' ? p.moveCooldowns : {};
      p.statusShieldTurns = Number.isFinite(p.statusShieldTurns) ? p.statusShieldTurns : 0;
      p.confusionShieldTurns = Number.isFinite(p.confusionShieldTurns) ? p.confusionShieldTurns : 0;
      p.healBlockTurns = Number.isFinite(p.healBlockTurns) ? p.healBlockTurns : 0;
      p.disableTurns = Number.isFinite(p.disableTurns) ? p.disableTurns : 0;
      p.disabledMoveKey = (typeof p.disabledMoveKey === 'string' && MOVES[p.disabledMoveKey]) ? p.disabledMoveKey : null;
      p.lastUsedMoveKey = (typeof p.lastUsedMoveKey === 'string' && MOVES[p.lastUsedMoveKey]) ? p.lastUsedMoveKey : null;
      p.sleepTurns = Number.isFinite(p.sleepTurns) ? p.sleepTurns : 0;
      p.freezeTurns = Number.isFinite(p.freezeTurns) ? p.freezeTurns : 0;
      p.leechSeedBySide = (p.leechSeedBySide === true || p.leechSeedBySide === false) ? p.leechSeedBySide : null;
      p.perishTurns = Number.isFinite(p.perishTurns) ? p.perishTurns : 0;
      p.comboStacks = Number.isFinite(p.comboStacks) ? p.comboStacks : 0;
      p.lastMoveType = typeof p.lastMoveType === 'string' ? p.lastMoveType : null;
      p.moves = Array.isArray(d.moves) ? d.moves.filter(m => MOVES[m]) : p.moves;
      if (!p.moves.length) p.moves = ['Tackle'];
      p.recalcStats();
      p.hp = Math.min(Math.max(0, p.hp), p.maxHp);
      return p;
    })
  };

  if (!migrated.team.length) throw new Error('Equipo vacio en save');
  if (migrated.activeIdx < 0 || migrated.activeIdx >= migrated.team.length) migrated.activeIdx = 0;
  if (migrated.gameMode === 'daily' && !migrated.dailyChallenge) {
    const dateFromSeed = (migrated.runSeed || '').startsWith('daily-') ? migrated.runSeed.slice(6) : getTodayDateKey();
    migrated.dailyChallenge = buildDailyChallenge(dateFromSeed);
  }
  return migrated;
}
