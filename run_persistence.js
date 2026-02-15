function saveGame() {
  const payload = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  alert('Partida guardada.');
  $('btn-load').disabled = false;
}

function loadGame() {
  const data = localStorage.getItem(SAVE_KEY);
  if(data) {
    try {
      const raw = JSON.parse(data);
      state = migrateSaveData(raw);
      applyRunSeed(state.runSeed, state.rngState);
      if (!state.runStartedAt) state.runStartedAt = Date.now();
      currentRunRecorded = false;
      if (!state.runLog) initRunLog();
      recordRunEvent('run_loaded', { mode: state.gameMode, seed: state.runSeed });
      const seedInput = $('seed-input');
      if (seedInput) seedInput.value = state.runSeed;
      opponent = new Pokemon(opponent ? opponent.name : 'Rattata', 5);

      $('start-buttons').style.display = 'none';
      $('game-title').classList.add('hidden-title');
      if (state.gameMode === 'daily' && state.dailyChallenge?.dateKey) $('mode-display').innerText = `Diario ${state.dailyChallenge.dateKey}`;
      else if (state.gameMode === 'roguerun') $('mode-display').innerText = 'RogueRun';
      else $('mode-display').innerText = state.gameMode === 'nuzlocke' ? 'Nuzlocke' : 'Normal';
      if (typeof refreshSeedUiState === 'function') refreshSeedUiState();

      if (state.gameMode === 'roguerun' && typeof restoreRogueRunAfterLoad === 'function') {
        restoreRogueRunAfterLoad();
      } else {
        startBattle();
      }
    } catch(e) {
      console.error(e);
      alert("Error al cargar partida.");
    }
  }
}
