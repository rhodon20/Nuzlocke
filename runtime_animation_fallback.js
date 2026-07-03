(function installAnimationFallback() {
  if (typeof window.anime === 'function') return;

  function resolveTargets(targets) {
    if (!targets) return [];
    if (typeof targets === 'string') return Array.from(document.querySelectorAll(targets));
    if (targets instanceof Element) return [targets];
    return Array.from(targets || []).filter(Boolean);
  }

  function applyFinalStyles(config) {
    const ignored = new Set(['targets', 'duration', 'delay', 'easing', 'complete', 'begin', 'update', 'loop', 'direction', 'autoplay', 'endDelay']);
    resolveTargets(config.targets).forEach(target => {
      Object.keys(config).forEach(key => {
        if (ignored.has(key)) return;
        let value = config[key];
        if (typeof value === 'function') value = value(target);
        if (Array.isArray(value)) value = value[value.length - 1];
        if (key === 'opacity') target.style.opacity = String(value);
        if (key === 'backgroundColor') target.style.backgroundColor = String(value);
        if (key === 'width' || key === 'height') target.style[key] = typeof value === 'number' ? `${value}px` : String(value);
      });
    });
    if (typeof config.begin === 'function') config.begin();
    if (typeof config.complete === 'function') queueMicrotask(config.complete);
  }

  function fallbackAnime(config = {}) {
    applyFinalStyles(config);
    return { pause() {}, play() {}, restart() {}, finished: Promise.resolve() };
  }

  fallbackAnime.random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  fallbackAnime.stagger = () => 0;
  fallbackAnime.timeline = () => {
    const timeline = { add(config) { applyFinalStyles(config || {}); return timeline; }, pause() {}, play() {} };
    return timeline;
  };
  window.anime = fallbackAnime;
  window.__ANIME_FALLBACK_ACTIVE__ = true;
})();
