function log(msg) {
  const div = document.createElement('div');
  div.innerHTML = msg;
  div.style.marginBottom = '4px';
  div.style.opacity = 0; // Anime in
  $('combat-log').prepend(div);
  anime({ targets: div, opacity: 1, translateX: [-10, 0], duration: 400 });
  if ($('combat-log').children.length > 20) $('combat-log').lastChild.remove();
}


function getTierFromLevel(level) {
  if (level <= 15) return 1;
  if (level <= 30) return 2;
  if (level <= 45) return 3;
  if (level <= 60) return 4;
  return 5;
}
