async function getSpriteData(slug) {
  if (spriteApiCache.has(slug)) return spriteApiCache.get(slug);
  const promise = fetch(`https://pokeapi.co/api/v2/pokemon/${slug}`).then(res => {
    if (!res.ok) throw new Error(`PokeAPI ${res.status}`);
    return res.json();
  });
  spriteApiCache.set(slug, promise);
  return promise;
}

function getSpriteSourceFromData(data, back, isShiny) {
  const anim = data?.sprites?.versions?.['generation-v']?.['black-white']?.animated;
  if (isShiny) {
    return back
      ? (anim?.back_shiny || data?.sprites?.back_shiny || data?.sprites?.back_default)
      : (anim?.front_shiny || data?.sprites?.front_shiny || data?.sprites?.front_default);
  }
  return back
    ? (anim?.back_default || data?.sprites?.back_default)
    : (anim?.front_default || data?.sprites?.front_default);
}

async function getSpriteSource(mon, back) {
  const localSource = getLocalSpriteSource(mon, back);
  if (localSource) return localSource;

  const slug = SLUG_MAP[mon.name] || mon.name.toLowerCase();
  const data = await getSpriteData(slug);
  return getSpriteSourceFromData(data, back, mon.isShiny);
}
window.getSpriteSource = getSpriteSource;

function getLocalSpriteSource(mon, back) {
  const slug = SLUG_MAP[mon.name] || mon.name.toLowerCase();
  const entry = window.LOCAL_SPRITES?.[slug];
  if (!entry) return null;

  if (mon.isShiny) {
    return back
      ? (entry.anim_back_shiny || entry.back_shiny || entry.back_default || null)
      : (entry.anim_front_shiny || entry.front_shiny || entry.front_default || null);
  }

  return back
    ? (entry.anim_back_default || entry.back_default || null)
    : (entry.anim_front_default || entry.front_default || null);
}
