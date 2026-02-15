const pluginRegistry = [];
const pluginHooks = Object.create(null);

function registerGamePlugin(plugin) {
  if (!plugin || !plugin.name || !plugin.hooks) return;
  if (pluginRegistry.some(p => p.name === plugin.name)) return;
  pluginRegistry.push(plugin);

  Object.entries(plugin.hooks).forEach(([hookName, fn]) => {
    if (typeof fn !== 'function') return;
    if (!pluginHooks[hookName]) pluginHooks[hookName] = [];
    pluginHooks[hookName].push({ name: plugin.name, fn });
  });
}

function runPluginHook(hookName, payload) {
  const hooks = pluginHooks[hookName] || [];
  for (const hook of hooks) {
    try {
      hook.fn(payload);
    } catch (err) {
      console.error(`[Plugin:${hook.name}] hook ${hookName} fallo`, err);
    }
  }
}

function runPluginHookReduce(hookName, initialValue, payload) {
  const hooks = pluginHooks[hookName] || [];
  let acc = initialValue;
  for (const hook of hooks) {
    try {
      const result = hook.fn({ ...payload, value: acc });
      if (result !== undefined) acc = result;
    } catch (err) {
      console.error(`[Plugin:${hook.name}] hook ${hookName} fallo`, err);
    }
  }
  return acc;
}

function runPluginHookUntilHandled(hookName, payload) {
  const hooks = pluginHooks[hookName] || [];
  for (const hook of hooks) {
    try {
      const result = hook.fn(payload);
      if (result && result.handled) return true;
    } catch (err) {
      console.error(`[Plugin:${hook.name}] hook ${hookName} fallo`, err);
    }
  }
  return false;
}

window.registerGamePlugin = registerGamePlugin;
window.getRegisteredPlugins = () => pluginRegistry.map(p => p.name);
window.runPluginHook = runPluginHook;

