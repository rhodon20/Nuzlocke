function isDamagingMoveKey(moveKey) {
  const move = MOVES[moveKey];
  return !!(move && move.cat !== 'Est' && Number(move.poder) > 0);
}

function buildInitialMoveSet(data, level, randomized) {
  const validCatalogMoves = Object.keys(MOVES).filter(key => !MOVES[key]?.internalAction && key !== 'Struggle');
  const damagingMoves = validCatalogMoves.filter(isDamagingMoveKey);
  if (randomized) {
    const targetCount = Math.min(4, Math.max(1, Math.floor(level / 5)));
    const result = [];
    if (damagingMoves.length) result.push(damagingMoves[Math.floor(gameRandom() * damagingMoves.length)]);
    while (result.length < targetCount && result.length < validCatalogMoves.length) {
      const candidate = validCatalogMoves[Math.floor(gameRandom() * validCatalogMoves.length)];
      if (!result.includes(candidate)) result.push(candidate);
    }
    return result.length ? result : ['Tackle'];
  }

  const speciesMoves = (data?.moves || []).filter(key => MOVES[key] && key !== 'Struggle');
  if (!speciesMoves.some(isDamagingMoveKey)) speciesMoves.unshift('Tackle');
  return Array.from(new Set(speciesMoves.length ? speciesMoves : ['Tackle']));
}
