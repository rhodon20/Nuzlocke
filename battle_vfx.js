function getEffectIcon(type) {
  const icons = {
    'Fuego': 'FUE', 'Agua': 'AGU', 'Planta': 'PLA', 'Eléctrico': 'ELE',
    'Roca': 'ROC', 'Tierra': 'TIE', 'Volador': 'VOL', 'Psíquico': 'PSI',
    'Fantasma': 'FAN', 'Hielo': 'HIE', 'Veneno': 'VEN', 'Lucha': 'LUC',
    'Bicho': 'BIC', 'Dragón': 'DRA', 'Normal': 'NOR'
  };
  return icons[type] || 'TIP';
}

function getProjectileClass(type) {
  const map = {
    'Fuego': 'proj-fire', 'Agua': 'proj-water', 'Planta': 'proj-grass', 
    'Eléctrico': 'proj-electric', 'Roca': 'proj-rock', 'Fantasma': 'proj-ghost'
  };
  return map[type] || 'proj-normal';
}

function shootProjectile(type, fromId, toId) {
  const fromEl = $(fromId);
  const toEl = $(toId);
  const layer = $('vfx-layer');
  if (!fromEl || !toEl) return Promise.resolve();

  const r1 = fromEl.getBoundingClientRect();
  const r2 = toEl.getBoundingClientRect();
  const parent = layer.getBoundingClientRect();

  const startX = r1.left - parent.left + r1.width/2;
  const startY = r1.top - parent.top + r1.height/2;
  const endX = r2.left - parent.left + r2.width/2;
  const endY = r2.top - parent.top + r2.height/2;

  const p = document.createElement('div');
  p.className = `projectile ${getProjectileClass(type)}`;
  // Set initial position centered
  p.style.left = (startX - 16) + 'px';
  p.style.top = (startY - 16) + 'px';
  layer.appendChild(p);

  return anime({
    targets: p,
    left: (endX - 16) + 'px',
    top: (endY - 16) + 'px',
    opacity: [0, 1, 1],
    rotate: '1turn',
    scale: [0.5, 1.2, 1],
    easing: 'easeInQuad',
    duration: 400,
    complete: () => p.remove()
  }).finished;
}

function spawnParticles(type, targetEl) {
  const rect = targetEl.getBoundingClientRect();
  const parent = $('vfx-layer').getBoundingClientRect();
  const centerX = rect.left - parent.left + rect.width / 2;
  const centerY = rect.top - parent.top + rect.height / 2;
  const icon = getEffectIcon(type);

  for(let i=0; i<8; i++) { // More particles
    const p = document.createElement('div');
    p.classList.add('vfx-particle');
    p.textContent = icon;
    p.style.left = centerX + 'px';
    p.style.top = centerY + 'px';
    $('vfx-layer').appendChild(p);

    anime({
      targets: p,
      translateX: () => anime.random(-60, 60),
      translateY: () => anime.random(-60, 60),
      scale: [0, 1.5, 0], // Grow then shrink
      rotate: () => anime.random(-360, 360),
      opacity: [1, 0],
      duration: () => anime.random(600, 1000),
      easing: 'easeOutExpo',
      complete: () => p.remove()
    });
  }
}

function animateAttack(attackerSlotId, type) {
  const el = $(attackerSlotId);
  const img = el.querySelector('img');
  if(!img) return Promise.resolve();
  
  // Player moves right (positive), Opponent moves left (negative)
  const dir = attackerSlotId.includes('player') ? 1 : -1;
  
  // Remove idle anim during attack
  el.classList.remove('anim-idle');

  return anime.timeline({
    targets: img,
    easing: 'easeOutQuad'
  })
  .add({
    translateX: -10 * dir, // Anticipation
    scaleX: 0.9, 
    scaleY: 1.1,
    duration: 150
  })
  .add({
    translateX: 50 * dir, // Lunge
    scaleX: 1.2, 
    scaleY: 0.8,
    duration: 100
  })
  .add({
    translateX: 0, // Return
    scaleX: 1,
    scaleY: 1,
    duration: 400,
    easing: 'easeOutElastic(1, .5)'
  })
  .finished.then(() => el.classList.add('anim-idle'));
}

function animateDamage(victimSlotId) {
  const el = $(victimSlotId);
  const img = el.querySelector('img');
  if(!img) return Promise.resolve();

  // Shake container
  const shake = anime({
    targets: el,
    translateX: [
      { value: -5, duration: 50 },
      { value: 5, duration: 50 },
      { value: -5, duration: 50 },
      { value: 5, duration: 50 },
      { value: 0, duration: 50 }
    ],
    easing: 'linear'
  });

  // Flash Effect
  const flash = anime({
    targets: img,
    filter: [
      { value: 'brightness(3) sepia(1) hue-rotate(-50deg)', duration: 100 },
      { value: 'brightness(1) sepia(0) hue-rotate(0deg)', duration: 200 }
    ],
    opacity: [1, 0.4, 1],
    easing: 'linear'
  });

  return Promise.all([shake.finished, flash.finished]);
}
