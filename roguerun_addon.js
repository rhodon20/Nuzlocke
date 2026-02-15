(function initRogueRunAddon() {
  const ROGUERUN_TOTAL_FLOORS = 12;
  const X_POS = [18, 50, 82];
  const ROGUE_PROFILE_KEY = 'roguerun_profile_v1';

  const NODE_LABELS = {
    BATTLE: 'Combate',
    ELITE: 'Elite',
    SHOP: 'Tienda',
    REST: 'Descanso',
    EVENT: 'Evento'
  };

  const NODE_META = {
    BATTLE: { icon: 'B', desc: 'Combate estandar.' },
    ELITE: { icon: 'E', desc: 'Combate duro, recompensa extra.' },
    SHOP: { icon: 'S', desc: 'Suministros para la ruta.' },
    REST: { icon: 'R', desc: 'Cura parcial y limpieza de estado.' },
    EVENT: { icon: '?', desc: 'Evento ligero de riesgo/recompensa.' }
  };

  function ensureStyles() {
    if (document.getElementById('roguerun-style')) return;
    const style = document.createElement('style');
    style.id = 'roguerun-style';
    style.textContent = `
      #roguerun-overlay {
        font-family: "Trebuchet MS", "Comic Sans MS", system-ui, sans-serif;
        letter-spacing: .2px;
      }
      .rr-header { font-size: .84rem; color: #ffd54a; font-weight: 800; }
      .rr-sub { font-size: .74rem; color: #9aa3c7; }
      .rr-paper {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 15% 10%, rgba(255,255,255,0.06), transparent 38%),
          radial-gradient(circle at 78% 82%, rgba(255,255,255,0.05), transparent 45%),
          repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 6px);
        mix-blend-mode: screen;
      }
      .rr-map-scroll {
        border: 2px dashed rgba(255,255,255,0.2);
        border-radius: 12px;
        overflow-y: auto;
        overflow-x: hidden;
        background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.18));
        -webkit-overflow-scrolling: touch;
      }
      .rr-map-wrap {
        position: relative;
        min-height: 100%;
      }
      .rr-map-node {
        position: absolute;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        color: #fff;
        font-size: .74rem;
        font-weight: 800;
        border: 2px solid rgba(255,255,255,.45);
        background: rgba(255,255,255,.09);
        box-shadow: 0 2px 0 rgba(0,0,0,.25);
      }
      .rr-map-node-current {
        border-color: #00c6d7;
        background: linear-gradient(180deg, rgba(0,198,215,.5), rgba(0,198,215,.22));
        box-shadow: 0 0 0 2px rgba(0,198,215,.22), 0 0 12px rgba(0,198,215,.35);
      }
      .rr-map-node-past {
        border-color: #ffd54a;
        background: linear-gradient(180deg, rgba(255,213,74,.36), rgba(255,213,74,.14));
      }
      .rr-map-node-type-BATTLE { background-color: rgba(239, 83, 80, 0.32); }
      .rr-map-node-type-ELITE { background-color: rgba(255, 202, 40, 0.32); }
      .rr-map-node-type-SHOP { background-color: rgba(102, 187, 106, 0.32); }
      .rr-map-node-type-REST { background-color: rgba(66, 165, 245, 0.32); }
      .rr-map-node-type-EVENT { background-color: rgba(171, 71, 188, 0.32); }
      .rr-card-grid { display: grid; gap: 6px; }
      .rr-card {
        text-align: left;
        padding: 8px;
        border: 2px dashed rgba(255,255,255,.22);
        border-radius: 9px;
        background: rgba(15, 25, 56, 0.6);
      }
      .rr-card-title { font-weight: 800; font-size: .78rem; }
      .rr-card-desc { font-size: .70rem; opacity: .86; margin-top: 3px; line-height: 1.25; }
      .rr-card-block { font-size: .68rem; color: #ff8a80; margin-top: 4px; }
      .rr-foot { font-size: .70rem; opacity: .8; }
      #roguerun-profile {
        margin-top: 4px;
        border: 1px solid rgba(255,213,74,.25);
        border-radius: 8px;
        padding: 6px 8px;
        background: rgba(255,213,74,.08);
        font-size: .74rem;
        color: #ffe58a;
      }
      @media (max-width: 420px) {
        .rr-map-node {
          width: 32px;
          height: 32px;
          font-size: .70rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getRogueProfile() {
    const raw = localStorage.getItem(ROGUE_PROFILE_KEY);
    if (!raw) return { crowns: 0, completions: 0, flawless: 0, lastReward: null };
    try {
      const p = JSON.parse(raw);
      return {
        crowns: Number.isFinite(p.crowns) ? p.crowns : 0,
        completions: Number.isFinite(p.completions) ? p.completions : 0,
        flawless: Number.isFinite(p.flawless) ? p.flawless : 0,
        lastReward: p.lastReward || null
      };
    } catch {
      return { crowns: 0, completions: 0, flawless: 0, lastReward: null };
    }
  }

  function saveRogueProfile(profile) {
    localStorage.setItem(ROGUE_PROFILE_KEY, JSON.stringify(profile));
  }

  function ensureProfilePanel() {
    const host = document.getElementById('start-buttons');
    if (!host) return null;
    let panel = document.getElementById('roguerun-profile');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'roguerun-profile';
      const history = document.getElementById('run-history');
      if (history && history.parentElement === host) host.insertBefore(panel, history);
      else host.appendChild(panel);
    }
    return panel;
  }

  function renderRogueProfilePanel() {
    const panel = ensureProfilePanel();
    if (!panel) return;
    const p = getRogueProfile();
    const last = p.lastReward ? ` | Ultima: +${p.lastReward}` : '';
    panel.innerText = `Rogue crowns x${p.crowns} | Runs ${p.completions} | Flawless ${p.flawless}${last}`;
  }

  function ensureRogueRunButton() {
    const host = document.getElementById('start-buttons');
    if (!host || document.getElementById('btn-roguerun')) return;
    const btn = document.createElement('button');
    btn.id = 'btn-roguerun';
    btn.innerText = 'RogueRun';
    btn.style.background = 'linear-gradient(135deg, #00acc1, #006064)';
    btn.style.color = '#fff';
    btn.style.padding = '14px';
    btn.style.fontSize = '1.1rem';
    btn.style.border = 'none';
    btn.onclick = () => startGame('roguerun');
    const history = document.getElementById('run-history');
    if (history && history.parentElement === host) host.insertBefore(btn, history);
    else host.appendChild(btn);
  }

  function ensureOverlay() {
    let overlay = document.getElementById('roguerun-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'roguerun-overlay';
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.background = 'radial-gradient(circle at 20% 10%, rgba(0,198,215,0.18), rgba(11,16,32,0.96) 60%)';
    overlay.style.zIndex = '1300';
    overlay.style.display = 'none';
    overlay.style.flexDirection = 'column';
    overlay.style.gap = '7px';
    overlay.style.padding = '10px';
    overlay.style.boxSizing = 'border-box';

    const container = document.getElementById('game-container');
    if (container) container.appendChild(overlay);
    return overlay;
  }

  function setBattleUiEnabled(enabled) {
    const controls = document.getElementById('controls-area');
    if (controls) controls.style.display = enabled ? 'flex' : 'none';
    const utility = document.getElementById('utility-controls');
    if (utility) utility.style.display = enabled ? 'grid' : 'none';
  }

  function ensureRogueState() {
    if (!state.rogueRun || typeof state.rogueRun !== 'object') {
      state.rogueRun = {
        active: true,
        totalFloors: ROGUERUN_TOTAL_FLOORS,
        floor: 0,
        nodesByFloor: [],
        linksByFloor: [],
        inBattle: false,
        currentNodeId: null,
        visitedNodeIds: [],
        nonCombatStreak: 0,
        combatsWon: 0
      };
    }
    if (!Array.isArray(state.rogueRun.visitedNodeIds)) state.rogueRun.visitedNodeIds = [];
    if (!Number.isFinite(state.rogueRun.nonCombatStreak)) state.rogueRun.nonCombatStreak = 0;
    if (!Number.isFinite(state.rogueRun.combatsWon)) state.rogueRun.combatsWon = 0;
    if (!Array.isArray(state.rogueRun.linksByFloor)) state.rogueRun.linksByFloor = [];
    return state.rogueRun;
  }

  function getNodeWeights(floorIdx, totalFloors) {
    const progress = totalFloors <= 1 ? 0 : floorIdx / (totalFloors - 1);
    if (progress < 0.35) return { BATTLE: 50, EVENT: 15, SHOP: 15, REST: 15, ELITE: 5 };
    if (progress < 0.75) return { BATTLE: 45, EVENT: 14, SHOP: 14, REST: 12, ELITE: 15 };
    return { BATTLE: 34, EVENT: 10, SHOP: 12, REST: 10, ELITE: 34 };
  }

  function weightedPick(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((acc, [, w]) => acc + Math.max(0, Number(w) || 0), 0);
    if (total <= 0) return 'BATTLE';
    let r = gameRandom() * total;
    for (let i = 0; i < entries.length; i++) {
      const [k, w] = entries[i];
      r -= Math.max(0, Number(w) || 0);
      if (r <= 0) return k;
    }
    return entries[0][0];
  }

  function isForcedCombatFloor(floorIdx, totalFloors) {
    return floorIdx === 0 || floorIdx === totalFloors - 1 || floorIdx % 4 === 0;
  }

  function generateNodeOptions(floorIdx, totalFloors) {
    const options = [];
    const weights = getNodeWeights(floorIdx, totalFloors);

    for (let i = 0; i < 3; i++) {
      const type = weightedPick(weights);
      options.push({
        id: `${floorIdx + 1}-${i}`,
        floor: floorIdx,
        lane: i,
        x: X_POS[i],
        type,
        label: NODE_LABELS[type] || type
      });
    }

    const forced = isForcedCombatFloor(floorIdx, totalFloors);
    if (forced) {
      options[0].type = floorIdx === totalFloors - 1 ? 'ELITE' : 'BATTLE';
      options[0].label = NODE_LABELS[options[0].type];
      options[1].type = 'BATTLE';
      options[1].label = NODE_LABELS.BATTLE;
    } else if (!options.some(n => n.type === 'BATTLE' || n.type === 'ELITE')) {
      options[0].type = 'BATTLE';
      options[0].label = NODE_LABELS.BATTLE;
    }

    if (floorIdx === totalFloors - 1) {
      options[2].type = 'ELITE';
      options[2].label = NODE_LABELS.ELITE;
    }

    return options;
  }

  function buildRogueRunMap(totalFloors) {
    const floors = [];
    const links = [];

    for (let f = 0; f < totalFloors; f++) {
      floors.push(generateNodeOptions(f, totalFloors));
    }

    for (let f = 0; f < totalFloors - 1; f++) {
      const from = floors[f];
      const to = floors[f + 1];
      const layerLinks = [];
      from.forEach(src => {
        const primary = to[Math.floor(gameRandom() * to.length)];
        if (primary) layerLinks.push([src.id, primary.id]);
        if (gameRandom() < 0.45) {
          const secondary = to[Math.floor(gameRandom() * to.length)];
          if (secondary && secondary.id !== primary?.id) layerLinks.push([src.id, secondary.id]);
        }
      });
      links.push(layerLinks);
    }

    return { floors, links };
  }

  function getNodeMeta(node) {
    return NODE_META[node?.type] || { icon: '.', desc: node?.label || 'Nodo' };
  }

  function findNodeById(nodeId) {
    const rr = ensureRogueState();
    for (let f = 0; f < rr.nodesByFloor.length; f++) {
      const row = rr.nodesByFloor[f] || [];
      for (let i = 0; i < row.length; i++) {
        if (row[i].id === nodeId) return row[i];
      }
    }
    return null;
  }

  function getMapViewportPx() {
    const vh = Math.max(320, window.innerHeight || 640);
    return Math.max(220, Math.min(360, Math.floor(vh * 0.42)));
  }

  function getMapRowGapPx() {
    const vw = Math.max(320, window.innerWidth || 420);
    return vw <= 420 ? 56 : 52;
  }

  function renderRogueRunOverlay() {
    const rr = ensureRogueState();
    const overlay = ensureOverlay();
    if (!overlay) return;

    const floor = rr.floor || 0;
    const total = rr.totalFloors || ROGUERUN_TOTAL_FLOORS;
    const currentNodes = Array.isArray(rr.nodesByFloor?.[floor]) ? rr.nodesByFloor[floor] : [];
    const hpLine = (state.team || []).map(p => `${p.name} ${p.hp}/${p.maxHp}`).join(' | ');
    const invLine = `Pokeballs ${state.inventory?.balls || 0} | Pociones ${state.inventory?.pots || 0}`;
    const mustFight = rr.nonCombatStreak >= 1;

    const mapViewport = getMapViewportPx();
    const rowGap = getMapRowGapPx();
    const topPad = 14;
    const mapHeight = (topPad * 2) + (Math.max(1, total - 1) * rowGap);

    const lines = [];
    (rr.linksByFloor || []).forEach(layer => {
      (layer || []).forEach(pair => {
        const from = findNodeById(pair[0]);
        const to = findNodeById(pair[1]);
        if (!from || !to) return;
        const y1 = topPad + (from.floor * rowGap);
        const y2 = topPad + (to.floor * rowGap);
        lines.push(`<line x1="${from.x}%" y1="${y1}" x2="${to.x}%" y2="${y2}" stroke="rgba(255,255,255,0.22)" stroke-width="1.3" stroke-dasharray="5 3" />`);
      });
    });

    const nodeDots = [];
    (rr.nodesByFloor || []).forEach((row, fIdx) => {
      (row || []).forEach(node => {
        const y = topPad + (fIdx * rowGap);
        const isCurrent = fIdx === floor;
        const isPast = fIdx < floor || rr.visitedNodeIds.includes(node.id);
        const meta = getNodeMeta(node);
        const clickable = isCurrent && !rr.inBattle;
        const cls = ['rr-map-node', `rr-map-node-type-${node.type}`];
        if (isCurrent) cls.push('rr-map-node-current');
        if (isPast) cls.push('rr-map-node-past');
        const cursor = clickable ? 'pointer' : 'default';
        const clickAttr = clickable ? `onclick="chooseRogueRunNode('${node.id}')"` : '';
        const sizeHalf = 17;
        const angle = ((node.floor * 7) + (node.lane * 11)) % 10 - 5;
        nodeDots.push(`<button ${clickAttr} title="${node.label}" class="${cls.join(' ')}" style="left:calc(${node.x}% - ${sizeHalf}px); top:${y - sizeHalf}px; cursor:${cursor}; transform: rotate(${angle}deg);">${meta.icon}</button>`);
      });
    });

    const vw = (window.innerWidth || 420);
    const cols = vw <= 420 ? '1fr' : (vw <= 560 ? '1fr 1fr' : '1fr 1fr 1fr');
    const nodeCards = currentNodes.map(node => {
      const meta = getNodeMeta(node);
      const isSupport = node.type === 'SHOP' || node.type === 'REST' || node.type === 'EVENT';
      const blocked = mustFight && isSupport;
      const click = blocked ? '' : `onclick="chooseRogueRunNode('${node.id}')"`;
      const disabled = blocked ? 'disabled' : '';
      const blockTxt = blocked ? '<div class="rr-card-block">Debes combatir antes de otro nodo de apoyo.</div>' : '';
      return `
        <button class="btn-action rr-card" ${click} ${disabled}>
          <div class="rr-card-title">${meta.icon} ${node.label}</div>
          <div class="rr-card-desc">${meta.desc}</div>
          ${blockTxt}
        </button>
      `;
    }).join('');

    overlay.innerHTML = `
      <div class="rr-header">RogueRun | Nodo ${Math.min(floor + 1, total)}/${total} | Combates ${rr.combatsWon}</div>
      <div class="rr-sub">Equipo: ${hpLine || 'Sin equipo'}</div>
      <div class="rr-sub">${invLine}</div>
      <div class="rr-map-scroll" id="rr-map-scroll" style="height:${mapViewport}px;">
        <div class="rr-map-wrap" style="height:${mapHeight}px;">
          <svg viewBox="0 0 100 ${mapHeight}" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%;">${lines.join('')}</svg>
          <div class="rr-paper"></div>
          ${nodeDots.join('')}
        </div>
      </div>
      <div class="rr-card-grid" style="grid-template-columns:${cols};">${nodeCards}</div>
      <div class="rr-foot">Selecciona una ruta en el mapa o en las tarjetas.</div>
    `;

    overlay.style.display = 'flex';
    setBattleUiEnabled(false);
    const mapScroll = document.getElementById('rr-map-scroll');
    if (mapScroll) {
      const center = Math.max(0, (topPad + (floor * rowGap)) - Math.floor(mapViewport * 0.45));
      mapScroll.scrollTop = center;
    }
  }

  function hideRogueRunOverlay() {
    const overlay = ensureOverlay();
    if (!overlay) return;
    overlay.style.display = 'none';
  }

  function getCurrentNodeById(nodeId) {
    const rr = ensureRogueState();
    const floor = rr.floor || 0;
    const nodes = Array.isArray(rr.nodesByFloor?.[floor]) ? rr.nodesByFloor[floor] : [];
    return nodes.find(n => n.id === nodeId) || null;
  }

  function applyShopReward() {
    const ballsGain = 1 + Math.floor(gameRandom() * 3);
    const potsGain = 1 + Math.floor(gameRandom() * 2);
    state.inventory.balls = Math.min(CONSTANTS.MAX_BALLS, state.inventory.balls + ballsGain);
    state.inventory.pots = Math.min(CONSTANTS.MAX_POTS, state.inventory.pots + potsGain);
    log(`Tienda: +${ballsGain} Pokeballs, +${potsGain} Pociones.`);
  }

  function applyRestReward() {
    state.team.forEach(p => {
      if (p.hp > 0) {
        const heal = Math.max(1, Math.floor(p.maxHp * 0.45));
        p.hp = Math.min(p.maxHp, p.hp + heal);
        p.status = null;
      }
    });
    log('Descanso: el equipo recupero PS y limpio estados.');
  }

  function applyEventReward() {
    const roll = gameRandom();
    if (roll < 0.34) {
      state.team.forEach(p => {
        if (p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.floor(p.maxHp * 0.2)));
      });
      log('Evento: brisa amable. El equipo recupero algo de PS.');
      return;
    }
    if (roll < 0.67) {
      state.inventory.balls = Math.min(CONSTANTS.MAX_BALLS, state.inventory.balls + 2);
      log('Evento: encontraste suministros (+2 Pokeballs).');
      return;
    }
    const alive = state.team.filter(p => p.hp > 0);
    if (alive.length > 0) {
      const idx = Math.floor(gameRandom() * alive.length);
      const mon = alive[idx];
      const dmg = Math.max(1, Math.floor(mon.maxHp * 0.12));
      mon.hp = Math.max(1, mon.hp - dmg);
      log(`Evento: trampa ligera. ${mon.name} perdio ${dmg} PS.`);
    }
  }

  function awardRogueCompletion() {
    const profile = getRogueProfile();
    let reward = 1;
    profile.completions += 1;

    const aliveCount = (state.team || []).filter(p => p.hp > 0).length;
    if (aliveCount === (state.team || []).length && aliveCount > 0) {
      reward += 1;
      profile.flawless += 1;
      log('Bonus flawless: +1 Rogue crown.');
    }

    profile.crowns += reward;
    profile.lastReward = reward;
    saveRogueProfile(profile);
    renderRogueProfilePanel();
    log(`Recompensa RogueRun: +${reward} Rogue crown(s). Total ${profile.crowns}.`);
  }

  function endRogueRunVictory() {
    const rr = ensureRogueState();
    rr.active = false;
    rr.inBattle = false;
    rr.currentNodeId = null;
    awardRogueCompletion();
    if (typeof recordRunResult === 'function') recordRunResult('VICTORIA_ROGUERUN');
    log('<b>RogueRun completado.</b>');
    const startButtons = document.getElementById('start-buttons');
    if (startButtons) startButtons.style.display = 'flex';
    if (typeof refreshSeedUiState === 'function') refreshSeedUiState();
    setBattleUiEnabled(false);
    hideRogueRunOverlay();
    turnLock = true;
  }

  function advanceRogueFloor() {
    const rr = ensureRogueState();
    rr.floor = (rr.floor || 0) + 1;
    if (rr.floor >= (rr.totalFloors || ROGUERUN_TOTAL_FLOORS)) {
      endRogueRunVictory();
      return;
    }
    renderRogueRunOverlay();
  }

  function startRogueRunBattle(node) {
    const rr = ensureRogueState();
    rr.inBattle = true;
    rr.currentNodeId = node.id;
    hideRogueRunOverlay();
    setBattleUiEnabled(true);

    const cfg = {
      nodeType: node.type,
      label: node.label,
      levelBonus: node.type === 'ELITE' ? 3 : 0,
      forceMiniBoss: node.type === 'ELITE'
    };
    window.__rogueRunBattleConfig = cfg;
    log(`Ruta elegida: <b>${node.label}</b>.`);
    if (typeof recordRunEvent === 'function') {
      recordRunEvent('roguerun_node_enter', { floor: rr.floor, nodeId: node.id, nodeType: node.type });
    }
    startBattle();
  }

  function resolveNonBattleNode(node) {
    const rr = ensureRogueState();
    if (rr.nonCombatStreak >= 1) {
      log('Debes entrar en combate antes de otro nodo de apoyo.');
      return;
    }

    if (node.type === 'SHOP') applyShopReward();
    else if (node.type === 'REST') applyRestReward();
    else if (node.type === 'EVENT') applyEventReward();

    rr.nonCombatStreak += 1;
    rr.visitedNodeIds.push(node.id);
    rr.inBattle = false;
    rr.currentNodeId = null;

    if (typeof recordRunEvent === 'function') {
      recordRunEvent('roguerun_node_resolve', { floor: rr.floor, nodeId: node.id, nodeType: node.type });
    }
    advanceRogueFloor();
  }

  window.chooseRogueRunNode = function chooseRogueRunNode(nodeId) {
    const rr = ensureRogueState();
    if (!rr.active || rr.inBattle) return;
    const node = getCurrentNodeById(nodeId);
    if (!node) return;

    if (node.type === 'BATTLE' || node.type === 'ELITE') {
      startRogueRunBattle(node);
      return;
    }

    resolveNonBattleNode(node);
  };

  window.startRogueRunMode = function startRogueRunMode() {
    const rr = ensureRogueState();
    const built = buildRogueRunMap(ROGUERUN_TOTAL_FLOORS);

    rr.active = true;
    rr.totalFloors = ROGUERUN_TOTAL_FLOORS;
    rr.floor = 0;
    rr.currentNodeId = null;
    rr.inBattle = false;
    rr.visitedNodeIds = [];
    rr.nonCombatStreak = 0;
    rr.combatsWon = 0;
    rr.nodesByFloor = built.floors;
    rr.linksByFloor = built.links;

    setBattleUiEnabled(false);
    renderRogueRunOverlay();
    recordRunEvent('roguerun_start', { floors: rr.totalFloors });
    log('Modo RogueRun iniciado. Elige ruta en el mapa.');
  };

  window.onRogueRunBattleWon = function onRogueRunBattleWon() {
    const rr = ensureRogueState();
    if (!rr.active) return false;
    const node = getCurrentNodeById(rr.currentNodeId || '');
    if (node && node.type === 'ELITE') {
      state.inventory.balls = Math.min(CONSTANTS.MAX_BALLS, state.inventory.balls + 2);
      state.inventory.pots = Math.min(CONSTANTS.MAX_POTS, state.inventory.pots + 1);
      log('Nodo Elite superado: recompensa extra de objetos.');
    }

    rr.visitedNodeIds.push(rr.currentNodeId);
    rr.combatsWon += 1;
    rr.nonCombatStreak = 0;
    rr.inBattle = false;
    rr.currentNodeId = null;
    advanceRogueFloor();
    return true;
  };

  window.restoreRogueRunAfterLoad = function restoreRogueRunAfterLoad() {
    const rr = ensureRogueState();
    rr.active = true;

    if (!Array.isArray(rr.nodesByFloor) || rr.nodesByFloor.length === 0) {
      const built = buildRogueRunMap(rr.totalFloors || ROGUERUN_TOTAL_FLOORS);
      rr.totalFloors = rr.totalFloors || ROGUERUN_TOTAL_FLOORS;
      rr.nodesByFloor = built.floors;
      rr.linksByFloor = built.links;
    }

    if (rr.inBattle) {
      const node = getCurrentNodeById(rr.currentNodeId || '');
      if (node) {
        window.__rogueRunBattleConfig = {
          nodeType: node.type,
          label: node.label,
          levelBonus: node.type === 'ELITE' ? 3 : 0,
          forceMiniBoss: node.type === 'ELITE'
        };
      }
      setBattleUiEnabled(true);
      startBattle();
      return;
    }

    setBattleUiEnabled(false);
    renderRogueRunOverlay();
    log('RogueRun cargado. Continua tu ruta.');
  };

  window.addEventListener('load', () => {
    ensureStyles();
    ensureRogueRunButton();
    ensureOverlay();
    renderRogueProfilePanel();
  });

  window.addEventListener('resize', () => {
    const rr = ensureRogueState();
    if (rr.active && !rr.inBattle) renderRogueRunOverlay();
  });
})();
