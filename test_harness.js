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

  global.MOVES = { Tackle: { nombre: 'Placaje', tipo: 'Normal', poder: 40, cat: 'Fis' } };
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

  console.log('All tests passed (11/11).');
}

try {
  runTests();
} catch (err) {
  console.error(`Test failure: ${err.message}`);
  process.exit(1);
}
