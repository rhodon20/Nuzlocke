let runSeedValue = '';
let runRngState = 0;
let hasSeededRng = false;

function hashSeedToUint32(seedText) {
  let h = 2166136261 >>> 0;
  const text = String(seedText || '');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalizeSeed(seedText) {
  return String(seedText || '').trim().slice(0, 40);
}

function autoGenerateSeed() {
  const t = Date.now().toString(36);
  const noise = Math.floor(gameRandom() * 1e9).toString(36);
  return `${t}-${noise}`.slice(0, 40);
}

function applyRunSeed(seedText, rngStateOverride = null) {
  const seed = normalizeSeed(seedText) || autoGenerateSeed();
  runSeedValue = seed;
  hasSeededRng = true;
  runRngState = Number.isFinite(rngStateOverride) && rngStateOverride > 0
    ? (rngStateOverride >>> 0)
    : hashSeedToUint32(seed);
  if (runRngState === 0) runRngState = 0x9e3779b9;
  state.runSeed = runSeedValue;
  state.rngState = runRngState >>> 0;
}

function gameRandom() {
  if (!hasSeededRng) return Math.random();
  let t = runRngState += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  runRngState = runRngState >>> 0;
  state.rngState = runRngState;
  return value;
}

function randomizeSeed() {
  const input = $('seed-input');
  if (!input) return;
  input.value = autoGenerateSeed();
  refreshSeedUiState();
}

window.gameRandom = gameRandom;
window.randomizeSeed = randomizeSeed;
