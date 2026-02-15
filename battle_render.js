function renderAll() {
  const player = state.team[state.activeIdx];
  if(!player && state.team.length > 0 && state.activeIdx >= 0) {
    state.activeIdx = 0;
  }
  const currentP = state.team[state.activeIdx];
  
  if(!currentP) return;

  // Render stats boxes with update logic for AnimeJS
  renderBox(currentP, 'player-box', true);
  renderBox(opponent, 'opponent-box', false);

  const fetchSprite = async (mon, slot, back) => {
    const uniqueId = `${mon.name}-${mon.isShiny ? 'shiny' : 'norm'}-${back?'back':'front'}`;
    const slotEl = $(slot);
    const currentImg = slotEl.querySelector('img');

    if(currentImg && currentImg.dataset.uid === uniqueId) return;

    try {
      const src = await getSpriteSource(mon, back);
      if (!src) throw new Error('Sprite no encontrado');

      slotEl.innerHTML = `<img src="${src}" class="sprite-img" data-uid="${uniqueId}">`;
      
      // Entrance Animation
      anime({
        targets: slotEl.querySelector('img'),
        scale: [0, 1],
        opacity: [0, 1],
        easing: 'easeOutElastic(1, .8)',
        duration: 800
      });

    } catch(e) {
      slotEl.innerHTML = `<div style="font-size:3rem;">?</div>`;
    }
  };

  fetchSprite(currentP, 'player-sprite-slot', true);
  fetchSprite(opponent, 'opponent-sprite-slot', false);

  $('balls-val').innerText = state.inventory.balls;
  $('pots-val').innerText = state.inventory.pots;
  $('streak-val').innerText = state.streak;
  $('badges-val').innerText = state.badges;

  const movesHTML = currentP.moves.map(mKey => {
    const m = MOVES[mKey];
    if(!m) return '';
    const catShort = m.cat === 'Esp' ? 'Esp' : (m.cat === 'Est' ? 'Est' : 'Fis');
    const cd = getMoveCooldown(currentP, mKey);
    const dis = typeof isMoveDisabled === 'function' ? isMoveDisabled(currentP, mKey) : false;
    const disabled = turnLock || cd > 0 || dis;
    const cdText = cd > 0 ? ` / CD ${cd}` : '';
    const disText = dis ? ' / ANULADO' : '';
    return `
    <button class="btn-move type-${m.tipo}" onclick="doTurn('${mKey}')" ${disabled?'disabled':''}>
      ${m.nombre}<br><small>${m.tipo} / ${m.poder} / ${catShort}${cdText}${disText}</small>
    </button>
  `}).join('');
  $('move-controls').innerHTML = movesHTML;
  
  $('btn-capture').disabled = turnLock || state.inventory.balls <= 0 || hasDailyModifier('NO_CAPTURE');
  $('btn-potion').disabled = turnLock || state.inventory.pots <= 0 || currentP.hp >= currentP.maxHp || hasDailyModifier('NO_POTION');
  $('btn-switch').disabled = turnLock || state.team.filter(p=>p.hp>0).length <= 1;
  runPluginHook('afterRender', { mode: 'normal', state, opponent });
}

// UPDATE LOGIC FOR RENDER BOX TO ALLOW ANIME.JS TWEENING
function renderBox(mon, id, isPlayer) {
    const container = $(id);
    const hpPct = (mon.hp / mon.maxHp) * 100;
    const color = hpPct > 50 ? '#4caf50' : hpPct > 20 ? '#ffeb3b' : '#f44336';
    const shinyMark = mon.isShiny ? '<span style="color:gold; text-shadow:0 0 5px orange">[S]</span> ' : '';
    const abilityHTML = mon.ability ? `<div style="font-size:0.7rem; color:#ffd54a; font-weight:bold; margin-top:-2px; margin-bottom:2px;">Hb: ${mon.ability}</div>` : '';
    const statusHTML = mon.status ? `<span class="status-tag status-${mon.status}">${mon.status}</span>` : '';

    // Check if we need to rebuild the entire HTML (new pokemon)
    // We use a data attribute to track current pokemon name
    const currentMonName = container.dataset.monName;
    
    if (currentMonName !== mon.name) {
        // Build Structure
        let xpHTML = '';
        if (isPlayer) {
          const xpPct = (mon.xp / mon.xpToNext) * 100;
          xpHTML = `<div class="xp-container"><div class="xp-fill" style="width:${xpPct}%"></div></div>`;
        }

        container.innerHTML = `
          <div class="poke-name"><span>${shinyMark}${mon.name}</span> <span class="poke-lvl">Nv${mon.level}</span></div>
          ${abilityHTML}
          <div class="hp-container">
            <div class="hp-fill" style="width:${hpPct}%; background-color:${color}"></div>
          </div>
          ${xpHTML}
          <div class="hp-text">${statusHTML}${mon.hp}/${mon.maxHp}</div>
        `;
        container.dataset.monName = mon.name;
    } else {
        // Just update specific parts to allow animation
        container.querySelector('.poke-lvl').innerText = `Nv${mon.level}`;
        const hpText = container.querySelector('.hp-text');
        
        // Animate HP Bar
        anime({
            targets: `#${id} .hp-fill`,
            width: `${hpPct}%`,
            backgroundColor: color,
            easing: 'easeOutElastic(1, .8)',
            duration: 800
        });

        // Update Text (Simple replace, rolling numbers is complex with text mix)
        hpText.innerHTML = `${statusHTML}${mon.hp}/${mon.maxHp}`;
        
        // Update XP if player
        if(isPlayer) {
            const xpPct = (mon.xp / mon.xpToNext) * 100;
            const xpFill = container.querySelector('.xp-fill');
            if(xpFill) xpFill.style.width = `${xpPct}%`;
        }
    }
}
