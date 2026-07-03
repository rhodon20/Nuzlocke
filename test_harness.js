const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadScript(relPath) {
  const file = path.join(__dirname, relPath);
  const code = fs.readFileSync(file, 'utf8');
  vm.runInThisContext(code, { filename: relPath });
}

function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(a, b, message) {
  if (a !== b) throw new Error(`${message} (expected ${b}, got ${a})`);
}

function setupTestGlobals() {
  global.window = global;
  global.document = { getElementById: () => null };
  global.$ = id => global.document.getElementById(id);
  global.localStorage = createLocalStorageMock();
  global.alert = () => {};
  global.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });

  global.state = {
    gameMode: 'normal',
    runSeed: '',
    rngState: 0,
    runStartedAt: 0,
    dailyChallenge: null,
    team: [],
    inventory: { balls: 0, pots: 0 },
    runLog: null
  };
  global.battleField = {
    player: { reflectTurns: 0, lightScreenTurns: 0, spikesLayers: 0, toxicSpikesLayers: 0, stealthRock: false },
    opponent: { reflectTurns: 0, lightScreenTurns: 0, spikesLayers: 0, toxicSpikesLayers: 0, stealthRock: false },
    weather: { type: null, turns: 0 },
    runEvent: null
  };

  global.MOVES = {
    Tackle: { nombre: 'Placaje', tipo: 'Normal', poder: 40, cat: 'Fis' },
    Teleport: { nombre: 'Teletransporte', tipo: 'Psíquico', poder: 0, cat: 'Est' },
    Recover: { nombre: 'Recuperación', tipo: 'Normal', poder: 0, cat: 'Est', cooldown: 3 },
    Struggle: { nombre: 'Combate', tipo: 'Normal', poder: 50, cat: 'Fis', emergency: true },
    Recharge: { nombre: 'Recargar', tipo: 'Normal', poder: 0, cat: 'Est', internalAction: true }
  };
  global.Pokemon = class Pokemon {
    constructor(name, level) {
      this.name = name;
      this.level = level || 1;
      this.maxHp = 50 + level;
      this.hp = this.maxHp;
      this.status = null;
      this.stages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 };
      this.moves = ['Tackle'];
      this.moveCooldowns = {};
      this.statusShieldTurns = 0;
      this.confusionShieldTurns = 0;
      this.healBlockTurns = 0;
      this.disableTurns = 0;
      this.disabledMoveKey = null;
      this.lastUsedMoveKey = null;
      this.sleepTurns = 0;
      this.freezeTurns = 0;
      this.leechSeedBySide = null;
      this.perishTurns = 0;
      this.comboStacks = 0;
      this.lastMoveType = null;
    }
    recalcStats() {
      this.maxHp = 50 + this.level;
      if (this.hp > this.maxHp) this.hp = this.maxHp;
    }
    getStat() { return 100; }
  };

  global.getTodayDateKey = () => '2026-02-15';
  global.buildDailyChallenge = dateKey => ({
    active: true,
    dateKey,
    seed: `daily-${dateKey}`,
    modifiers: [],
    enemyLevelBonus: 0,
    labels: []
  });

  global.log = () => {};
  global.renderAll = () => {};
  global.runPluginHook = () => {};
  global.runPluginHookReduce = (_hookName, value) => value;
  global.runPluginHookUntilHandled = () => false;
  global.recordRunEvent = () => {};
  global.recordReplayAction = () => {};
  global.spawnParticles = () => {};
  global.shootProjectile = async () => {};
  global.animateAttack = async () => {};
  global.animateDamage = async () => {};
  global.wait = async () => {};
  global.startBattle = () => {};
  global.handleWin = async () => {};
  global.checkDefeat = () => {};
  global.openSwitchMenu = () => {};
}

function runTests() {
  setupTestGlobals();

  loadScript('runtime_seed.js');
  loadScript('runtime_move_utils.js');
  loadScript('runtime_telemetry.js');
  loadScript('runtime_save_migration.js');
  loadScript('types.js');
  loadScript('battle_helpers.js');
  loadScript('battle_effects.js');
  loadScript('battle_turn.js');

  // 1) Seed determinism sanity check
  applyRunSeed('abc-seed');
  const seqA = [gameRandom(), gameRandom(), gameRandom(), gameRandom(), gameRandom()];
  applyRunSeed('abc-seed');
  const seqB = [gameRandom(), gameRandom(), gameRandom(), gameRandom(), gameRandom()];
  seqA.forEach((v, i) => assertEqual(v, seqB[i], `RNG sequence mismatch at index ${i}`));

  // 2) Save migration sanity check
  const rawSave = {
    state: {
      gameMode: 'normal',
      runSeed: '  test-seed  ',
      team: [
        { name: 'Pikachu', level: 10, hp: 999, stages: {}, moves: ['NoExiste'] }
      ],
      activeIdx: 7,
      inventory: { balls: 3, potions: 2 }
    }
  };
  const migrated = migrateSaveData(rawSave);
  assertEqual(migrated.runSeed, 'test-seed', 'runSeed should be normalized');
  assertEqual(migrated.inventory.pots, 2, 'legacy potions should migrate to pots');
  assertEqual(migrated.activeIdx, 0, 'activeIdx should be clamped to valid range');
  assertEqual(migrated.team[0].moves[0], 'Tackle', 'invalid moves should fallback to Tackle');
  assert(migrated.team[0].hp <= migrated.team[0].maxHp, 'hp should be clamped to maxHp');

  // 3) Status immunity edge case
  const fireMon = { types: ['Fuego'], hp: 30, status: null, statusShieldTurns: 0 };
  assertEqual(hasTypeStatusImmunity(fireMon, 'BRN'), true, 'Fire type should be immune to burn');
  assertEqual(canInflictStatus(fireMon, 'BRN'), false, 'canInflictStatus should block burn on Fire');

  // 4) Accuracy/evasion sanity check
  const attacker = { stages: { acc: 2 } };
  const defender = { stages: { eva: 0 } };
  const chance = getMoveHitChance(attacker, defender, { accuracy: 0.8 });
  assertEqual(chance, 1, 'accuracy with +2 stages should clamp to 1.0');

  // 5) Type immunity damage edge case
  resetBattleField();
  const atkMon = { level: 50, types: ['Eléctrico'], status: null, getStat: () => 100 };
  const defMon = { types: ['Tierra'], status: null, getStat: () => 100 };
  const dmg = calcDamage(atkMon, defMon, { tipo: 'Eléctrico', cat: 'Esp', poder: 90 });
  assertEqual(dmg.mult, 0, 'Electric move should have 0x multiplier vs Ground');
  assertEqual(dmg.amount, 0, 'Damage amount should be 0 when multiplier is 0');

  // 6) Control shield edge case
  const shielded = { types: ['Agua'], hp: 20, status: null, statusShieldTurns: 1 };
  assertEqual(canInflictStatus(shielded, 'SLP'), false, 'status shield should block sleep');
  assertEqual(canInflictStatus(shielded, 'SLP', { ignoreShield: true }), true, 'ignoreShield should bypass status shield');

  // 7) Hazard clear helper
  battleField.player.spikesLayers = 2;
  battleField.player.toxicSpikesLayers = 1;
  battleField.player.stealthRock = true;
  const removed = clearSideHazards(battleField.player, { clearScreens: false });
  assertEqual(removed.spikes, 2, 'clearSideHazards should report removed spikes');
  assertEqual(battleField.player.spikesLayers, 0, 'clearSideHazards should clear spikes');
  assertEqual(battleField.player.toxicSpikesLayers, 0, 'clearSideHazards should clear toxic spikes');
  assertEqual(battleField.player.stealthRock, false, 'clearSideHazards should clear stealth rock');

  // 8) Protect anti-spam success curve sanity
  const user = { protectStreak: 0, protectThisTurn: false, name: 'TestMon', stages: {} };
  const foe = { name: 'TargetMon', stages: {} };
  const oldRandom = global.gameRandom;
  global.gameRandom = () => 0.99; // fail if chance < 0.99
  applySingleEffect(user, foe, 'PROTECT', { attackerSide: true });
  assertEqual(user.protectThisTurn, true, 'first Protect should succeed');
  user.protectThisTurn = false;
  applySingleEffect(user, foe, 'PROTECT', { attackerSide: true });
  assertEqual(user.protectThisTurn, false, 'second Protect should fail with high random roll');
  global.gameRandom = oldRandom;

  // 9) Heal Block should prevent healing effects
  const hbUser = { name: 'User', stages: {}, hp: 40, maxHp: 100 };
  const hbTarget = { name: 'Target', stages: {}, hp: 20, maxHp: 100, healBlockTurns: 2 };
  applySingleEffect(hbUser, hbTarget, 'HEAL_BLOCK', { attackerSide: true });
  assertEqual(hbTarget.healBlockTurns, 2, 'Heal Block should not refresh if already active');
  applyHealEffect(hbTarget, 0.5);
  assertEqual(hbTarget.hp, 20, 'Heal Block should block healing');

  // 10) Haze should reset attacker and defender stages
  const hzA = { name: 'A', stages: { atk: 3, def: 0, spa: -1, spd: 2, spe: 1, acc: 0, eva: 0 } };
  const hzD = { name: 'D', stages: { atk: -2, def: 4, spa: 1, spd: 0, spe: -3, acc: 2, eva: -1 } };
  applySingleEffect(hzA, hzD, 'HAZE', { attackerSide: true });
  assertEqual(hzA.stages.atk, 0, 'Haze should reset attacker stages');
  assertEqual(hzD.stages.def, 0, 'Haze should reset defender stages');

  // 11) Disable should block the target last used move
  const disA = { name: 'A', stages: {} };
  const disD = { name: 'D', stages: {}, moves: ['Tackle'], lastUsedMoveKey: 'Tackle', disableTurns: 0, disabledMoveKey: null };
  applySingleEffect(disA, disD, 'DISABLE', { attackerSide: true });
  assertEqual(disD.disabledMoveKey, 'Tackle', 'Disable should set disabled move key');
  assertEqual(disD.disableTurns, 3, 'Disable should set disable duration');
  assertEqual(isMoveDisabled(disD, 'Tackle'), true, 'isMoveDisabled should report true for disabled move');

  // 12) A species with only status moves must receive a damaging starter move
  const safeSpeciesMoves = buildInitialMoveSet({ moves: ['Teleport'] }, 5, false);
  assert(safeSpeciesMoves.some(isDamagingMoveKey), 'initial species moves should include damage');
  assertEqual(safeSpeciesMoves.includes('Tackle'), true, 'status-only species should receive Tackle');

  // 13) Randomized level-5 starters must always begin with damage
  applyRunSeed('starter-move-safety');
  const randomizedMoves = buildInitialMoveSet({ moves: [] }, 5, true);
  assert(randomizedMoves.some(isDamagingMoveKey), 'randomized starter should include a damaging move');
  assertEqual(randomizedMoves.includes('Struggle'), false, 'Combate must not occupy a normal move slot');

  // 14) No selectable move should fall back to Combate
  const cooldownMon = { moves: ['Recover'], moveCooldowns: { Recover: 2 }, disableTurns: 0 };
  assertEqual(getUsableMoveKeys(cooldownMon).length, 0, 'cooldown move should not be selectable');
  assertEqual(chooseRandomUsableMoveKey(cooldownMon), 'Struggle', 'no selectable moves should use Combate');

  // 15) Non-move actions must advance cooldowns
  advanceActionCooldowns(cooldownMon);
  assertEqual(getMoveCooldown(cooldownMon, 'Recover'), 1, 'item turn should advance cooldown by one');

  // 16) Mystic Fog should reduce global accuracy by 10%
  resetBattleField();
  battleField.runEvent = { id: 'MYSTIC_FOG', accMult: 0.9 };
  const fogChance = getMoveHitChance({ stages: { acc: 0 } }, { stages: { eva: 0 } }, { accuracy: 1 });
  assertEqual(fogChance, 0.9, 'Mystic Fog should apply its accuracy multiplier');

  // 17) Healing Breeze should restore 1/16 max HP
  battleField.runEvent = { id: 'HEALING_BREEZE', label: 'Brisa Vital', endTurnHealPct: 1 / 16 };
  const breezeMon = { name: 'BreezeMon', hp: 100, maxHp: 160 };
  runBattleEventEndTurn(breezeMon);
  assertEqual(breezeMon.hp, 110, 'Healing Breeze should heal 1/16 max HP');

  // 18) Blood Moon should increase regular damage globally
  const oldEventRandom = global.gameRandom;
  global.gameRandom = () => 0.5;
  const bloodAtk = { level: 30, types: ['Normal'], status: null, stages: {}, getStat: () => 80 };
  const bloodDef = { types: ['Normal'], status: null, stages: {}, getStat: () => 80 };
  battleField.runEvent = null;
  const regularDamage = calcDamage(bloodAtk, bloodDef, MOVES.Tackle).amount;
  battleField.runEvent = { id: 'BLOOD_MOON', dmgMult: 1.15 };
  const bloodDamage = calcDamage(bloodAtk, bloodDef, MOVES.Tackle).amount;
  assert(bloodDamage > regularDamage, 'Blood Moon should increase damage');
  global.gameRandom = oldEventRandom;

  // 19) Self-confusion effects must affect the user, not the target
  const selfConUser = { name: 'User', hp: 50, confusionTurns: 0, confusionShieldTurns: 0 };
  const selfConTarget = { name: 'Target', hp: 50, confusionTurns: 0, confusionShieldTurns: 0 };
  applySingleEffect(selfConUser, selfConTarget, 'SELF_CON', { attackerSide: true });
  assert(selfConUser.confusionTurns > 0, 'SELF_CON should confuse the move user');
  assertEqual(selfConTarget.confusionTurns, 0, 'SELF_CON should not confuse the target');

  // 20) Fixed multi-hit moves must always use their configured hit count
  assertEqual(getMultiHitCount({ multiHit: { min: 2, max: 2 } }), 2, 'fixed multi-hit count should be respected');

  // 21) Variable 2-5 hit moves must stay inside their configured range
  const oldMultiRandom = global.gameRandom;
  global.gameRandom = () => 0.99;
  assertEqual(getMultiHitCount({ multiHit: { min: 2, max: 5 } }), 5, 'high roll should produce five hits');
  global.gameRandom = () => 0.1;
  assertEqual(getMultiHitCount({ multiHit: { min: 2, max: 5 } }), 2, 'low roll should produce two hits');
  global.gameRandom = oldMultiRandom;

  // 22) Chained moves must grow and reset on failure/change
  const chainMon = { chainMoveKey: null, chainMoveStacks: 0 };
  const rollout = { poder: 30, chainPower: { multiplier: 2, maxStacks: 5 } };
  assertEqual(getChainedMovePreview(chainMon, rollout, 'Rollout').poder, 30, 'first chain hit should use base power');
  commitMoveChain(chainMon, rollout, 'Rollout', true);
  assertEqual(getChainedMovePreview(chainMon, rollout, 'Rollout').poder, 60, 'second chain hit should double power');
  commitMoveChain(chainMon, rollout, 'Rollout', false);
  assertEqual(chainMon.chainMoveStacks, 0, 'failed chain should reset stacks');

  // 23) Low-HP variable power must scale through its thresholds
  const reversal = { poder: 20, variablePower: 'LOW_HP' };
  assertEqual(getChainedMovePreview({ hp: 100, maxHp: 100 }, reversal, 'Reversal').poder, 20, 'full HP should use minimum variable power');
  assertEqual(getChainedMovePreview({ hp: 5, maxHp: 100 }, reversal, 'Reversal').poder, 150, 'critical HP should strongly increase variable power');

  // 24) OHKO accuracy must reject higher-level targets
  const ohkoMove = { accuracy: 0.3, ohko: true };
  assertEqual(getMoveHitChance({ level: 20, stages: {} }, { level: 21, stages: {} }, ohkoMove), 0, 'OHKO should fail against higher-level targets');
  assertEqual(getMoveHitChance({ level: 20, stages: {} }, { level: 20, stages: {} }, ohkoMove), 0.3, 'equal-level OHKO should use base accuracy');

  // 25) Charge and recharge states must force their corresponding action
  global.MOVES['Sky Attack'] = { nombre: 'Ataque Aéreo', poder: 140, cat: 'Fis', chargeTurns: 1 };
  const forcedMon = { moves: ['Tackle', 'Sky Attack'], moveCooldowns: {}, chargingMoveKey: 'Sky Attack', rechargeTurns: 0 };
  assertEqual(getUsableMoveKeys(forcedMon)[0], 'Sky Attack', 'charging should force the prepared move');
  forcedMon.chargingMoveKey = null;
  forcedMon.rechargeTurns = 1;
  assertEqual(getUsableMoveKeys(forcedMon)[0], 'Recharge', 'recharge should force the recharge action');

  // 26) Transform must copy combat data and restore the original form
  const transformUser = { name:'Ditto', types:['Normal'], atk:10, def:10, spa:10, spd:10, spe:10, moves:['Transform'], ability:null, transformBackup:null };
  const transformTarget = { name:'Target', types:['Agua'], atk:20, def:21, spa:22, spd:23, spe:24, moves:['Tackle'], ability:'TestAbility' };
  applySingleEffect(transformUser, transformTarget, 'TRANSFORM', { attackerSide:true });
  assertEqual(transformUser.types[0], 'Agua', 'Transform should copy target typing');
  assertEqual(transformUser.atk, 20, 'Transform should copy target stats');
  restoreTransformation(transformUser);
  assertEqual(transformUser.types[0], 'Normal', 'Transform restore should recover original typing');

  // 27) Sketch must replace itself with the target last used move
  const sketchUser = { name:'Smeargle', moves:['Sketch'] };
  const sketchTarget = { name:'Target', lastUsedMoveKey:'Tackle' };
  applySingleEffect(sketchUser, sketchTarget, 'SKETCH', { attackerSide:true });
  assertEqual(sketchUser.moves[0], 'Tackle', 'Sketch should copy the target last move');

  // 28) Run telemetry must aggregate turns, accuracy, damage and favorites
  resetRunTelemetry();
  recordTelemetryBattle('start', { player: { name:'Bulbasaur' }, opponent: { name:'Rattata', status:'SLP' } });
  global.opponent = { name:'Rattata', status:'SLP', confusionTurns:0 };
  state.team = [{ name:'Bulbasaur', status:null, confusionTurns:0 }];
  state.activeIdx = 0;
  recordTelemetryTurn('potion');
  recordTelemetryMove('Tackle', true, { resolved:true, damage:12, hits:1 });
  recordTelemetryMove('Tackle', true, { missed:true });
  recordTelemetryBattle('win');
  const telemetrySummary = getTelemetrySummary();
  assertEqual(telemetrySummary.battles, 1, 'telemetry should count battle starts');
  assertEqual(telemetrySummary.wins, 1, 'telemetry should count wins');
  assertEqual(telemetrySummary.turns, 1, 'telemetry should count item turns');
  assertEqual(telemetrySummary.accuracyPct, 50, 'telemetry accuracy should use checked attempts');
  assertEqual(telemetrySummary.damageDealt, 12, 'telemetry should aggregate player damage');
  assertEqual(telemetrySummary.favoriteMove, 'Tackle', 'telemetry should identify favorite move');
  assertEqual(telemetrySummary.averageTurns, 1, 'telemetry should calculate average battle length');
  assertEqual(telemetrySummary.topSpecies.name, 'Bulbasaur', 'telemetry should aggregate player species');
  assertEqual(telemetrySummary.topOpponent.name, 'Rattata', 'telemetry should aggregate opponents');
  assertEqual(telemetrySummary.controlTurns.inflicted.SLP, 1, 'telemetry should sample inflicted control uptime');

  console.log('All tests passed (33/33).');
}

try {
  runTests();
} catch (err) {
  console.error(`Test failure: ${err.message}`);
  process.exit(1);
}
