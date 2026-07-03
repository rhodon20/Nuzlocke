const combatLogEntries = [];
let combatLogSequence = 0;

function log(msg) {
  const html = String(msg ?? '');
  const div = document.createElement('div');
  div.innerHTML = html;
  div.style.marginBottom = '4px';
  div.style.opacity = 0;
  $('combat-log').prepend(div);
  anime({ targets: div, opacity: 1, translateX: [-10, 0], duration: 400 });
  if ($('combat-log').children.length > 20) $('combat-log').lastChild.remove();
  combatLogEntries.push({ id: ++combatLogSequence, html });
  if (combatLogEntries.length > 100) combatLogEntries.splice(0, combatLogEntries.length - 100);
}

function getCombatLogCursor() {
  return combatLogSequence;
}

function getCombatLogEntriesSince(cursor) {
  const from = Number.isFinite(cursor) ? cursor : 0;
  return combatLogEntries.filter(entry => entry.id > from).map(entry => entry.html);
}

function appendSyncedCombatLogs(entries) {
  if (!Array.isArray(entries)) return;
  entries.forEach(entry => {
    const source = document.createElement('div');
    source.innerHTML = String(entry ?? '');
    const escaped = document.createElement('div');
    escaped.textContent = source.textContent || '';
    log(escaped.innerHTML);
  });
}

window.getCombatLogCursor = getCombatLogCursor;
window.getCombatLogEntriesSince = getCombatLogEntriesSince;
window.appendSyncedCombatLogs = appendSyncedCombatLogs;

function getTierFromLevel(level) {
  if (level <= 15) return 1;
  if (level <= 30) return 2;
  if (level <= 45) return 3;
  if (level <= 60) return 4;
  return 5;
}
