# Project Status - Nuzlocke Web App

## Current Architecture
- Stack: single-page app in `index.html` + data/feature addons in separate JS files.
- Core game loop and UI remain in `index.html`, pero el motor de combate ya está parcialmente modularizado.
- Nuevos módulos de combate:
  - `battle_helpers.js` (field state, hazards, weather, combo, utilidades de precisión/cooldown)
  - `battle_effects.js` (aplicación de efectos, estados, cambios de stats y curación)
  - `battle_turn.js` (ejecución de turnos, resolución de daño y orden de acciones)
- Addons are loaded at the end of `index.html`:
  - `battle_helpers.js`
  - `battle_effects.js`
  - `battle_turn.js`
  - `abilities.js`
  - `ia_logic.js`
  - `pvp_addon.js`
  - `info_addon.js`

## Implemented Recently
- Plugin hook runtime in core (`registerGamePlugin`, `runPluginHook`, reduce/handled variants).
- AI migrated to plugin (`selectOpponentMove` hook).
- Abilities migrated to plugin hooks (damage override, move/status hooks, entry hooks).
- PvP migrated away from hard overrides of `window.doTurn` and `window.renderAll`.
- Info modal auto-refresh migrated to plugin hook (`afterRender`).
- Save system improved:
  - versioned payload (`SAVE_VERSION`)
  - migration path for legacy saves
  - normalized inventory (`pots`)
- Sprite API cache added and reused by normal + PvP renderers.

## Run Seed System
- Deterministic run RNG added:
  - `state.runSeed`
  - `state.rngState`
  - seeded `gameRandom()` generator
- Seed input added in start menu + random seed button.
- Seed and RNG state are persisted in save/load.
- Most gameplay random paths now use `gameRandom()` (core + abilities + AI + PvP).

## Run History (New)
- Persisted run history in localStorage:
  - key: `poke_run_history`
  - max entries: 20
- Start menu panel shows latest runs.
- Each entry includes:
  - result
  - seed
  - streak
  - badges
  - duration
  - team stats snapshot
- Run result currently recorded automatically on defeat (`Game Over`).

## Daily Challenge (Added)
- New start menu mode: `Desafio Diario`.
- Daily seed is deterministic by local date: `daily-YYYY-MM-DD`.
- Daily rules are deterministic for that date and currently select 2 modifiers from:
  - `Sin Pociones`
  - `Sin Capturas`
  - `Rival +N niveles` (N between 2 and 4)
- Daily metadata is stored in save (`state.dailyChallenge`) and restored on load.
- UI/logic enforcement:
  - potion/capture actions blocked when corresponding modifier is active
  - opponent level bonus applied in encounter generation

## Known Technical Debt
- `index.html` sigue siendo grande, aunque ya sin gran parte del motor de combate.
- Text quality improved (mojibake cleaned in core UI/logs), but a full content QA pass in all assets is still pending.
- No automated test suite yet (battle logic, save migrations, deterministic RNG replay).
- PvP flow still has bespoke rendering path and could be further unified under core renderer hooks.

## Structural Refactor - Phase 1 (Completed)
- Extracted battle logic from `index.html` to dedicated files without changing gameplay rules:
  - `battle_helpers.js`
  - `battle_effects.js`
  - `battle_turn.js`
- `index.html` now focuses more on:
  - UI rendering
  - run/session orchestration
  - post-battle/actions menus
- Fixed multiple visible text artifacts (`??`) in UI and combat log strings during refactor.

## Structural Refactor - Next Immediate Step
- Move post-battle and action flow out of `index.html`:
  - `handleWin`, `checkEvolutionAndMoves`, `checkDefeat`
  - action handlers (`usePotion`, `attemptCapture`, `doSwitch`, party/switch modal handlers)
- Objective: leave `index.html` as entrypoint + UI shell, with gameplay systems in dedicated JS modules.

## Structural Refactor - Phase 2 (Completed)
- Extracted post-battle and action flow into `battle_flow.js`:
  - post-battle progression and rewards
  - move-learning/evolution prompts
  - defeat handling
  - potion/capture/switch action handlers
  - party-full and switch menu flow
- `index.html` now keeps save/load and UI/bootstrap responsibilities, while battle gameplay logic is externalized.

## Structural Refactor - Next Immediate Step
- Extract save/load and run/session control from `index.html` to `run_persistence.js` (or similar):
  - `saveGame`, `loadGame`
  - related migration/wiring helpers used only by persistence flow.
- Then keep `index.html` mostly as render shell + boot wiring.

## Structural Refactor - Phase 3 (Completed)
- Extracted persistence handlers to `run_persistence.js`:
  - `saveGame`
  - `loadGame`
- Wired module loading in `index.html` and removed duplicate inline persistence handlers.
- Save/load button behavior remains unchanged (`Guardar`/`Cargar` continue calling global handlers).

## Structural Refactor - Next Immediate Step
- Extract rendering and battle scene presentation helpers from `index.html`:
  - `renderAll`
  - `renderBox`
  - sprite fetching/render animation helper
- Goal: isolate UI rendering from state orchestration and combat systems.

## Structural Refactor - Phase 4 (Completed)
- Extracted render layer to `battle_render.js`:
  - `renderAll`
  - `renderBox`
  - sprite fetch + entrance animation helper inside render flow
- Hooked module in script loading chain (`index.html`) and kept runtime behavior compatible.

## Structural Refactor - Next Immediate Step
- Extract run orchestration/startup flow from `index.html`:
  - `startGame`
  - `startBattle`
  - helper(s) directly tied to encounter setup (e.g. team average level)
- Objective: keep `index.html` as UI shell + generic utilities, with battle/runtime flow in modules.

## Structural Refactor - Phase 5 (Completed)
- Extracted run orchestration to `run_orchestration.js`:
  - `startGame`
  - `getTeamAverageLevel`
  - `startBattle`
- Kept hooks/event wiring unchanged (`afterStartBattle`, run event logs, mini-boss setup).
- `index.html` now delegates startup/battle entry flow to external runtime modules.

## Structural Refactor - Next Immediate Step
- Extract battle visual helpers/effects from `index.html` to a VFX/UI module:
  - `getEffectIcon`
  - projectile/particle helpers
  - attack/damage animation utilities
- Goal: leave core HTML script with only bootstrapping, base state, and generic utility glue.

## Structural Refactor - Phase 6 (Completed)
- Extracted VFX/animation helpers to `battle_vfx.js`:
  - `getEffectIcon`
  - `getProjectileClass`
  - `shootProjectile`
  - `spawnParticles`
  - `animateAttack`
  - `animateDamage`
- Updated script load order so battle execution modules keep using the same global helpers.

## Structural Refactor - Next Immediate Step
- Extract core plugin/runtime utilities from `index.html` to a dedicated runtime module:
  - plugin registry/hook functions
  - shared generic helpers used across modules
- Goal: reduce `index.html` to bootstrap, DOM skeleton glue, and minimal state wiring.

## Structural Refactor - Phase 7 (Completed)
- Extracted plugin runtime to `runtime_plugins.js`:
  - `pluginRegistry` + `pluginHooks`
  - `registerGamePlugin`
  - `runPluginHook`
  - `runPluginHookReduce`
  - `runPluginHookUntilHandled`
- Preserved global plugin contract (`window.registerGamePlugin`, `window.getRegisteredPlugins`, `window.runPluginHook`).

## Structural Refactor - Next Immediate Step
- Final cleanup pass for `index.html` as shell-only script:
  - move remaining generic runtime helpers to dedicated files where it improves cohesion
  - keep in `index.html` only boot glue, state bootstrap, and strictly UI-root utilities.

## Structural Refactor - Phase 8 (Completed)
- Final runtime cleanup pass executed:
  - extracted `log` and `getTierFromLevel` to `runtime_core_utils.js`
  - extracted sprite API helpers to `runtime_sprites.js`
    - `getSpriteData`
    - `getSpriteSourceFromData`
    - `getSpriteSource`
- Updated script load order so orchestration/render modules consume these helpers from dedicated runtime modules.

## Structural Refactor - Remaining Phases
- Mandatory phases in current structural roadmap: `0`.
- Next work should be feature-oriented (or optional deeper cleanup), not required for current refactor milestone.

## Suggested Next Steps
1. Add run details modal (clickable history rows) for richer post-run analytics. [Done]
2. Add "copy/share seed" action and optional seed lock indicator in UI. [Done]
3. Add deterministic replay scaffold (capture action sequence + seed + rng state checkpoints). [Done]
4. Introduce lightweight test harness for: [Done]
   - save migration
   - seeded determinism sanity checks
   - damage/status edge cases.

## Run History Details (Added)
- Start menu run history rows are now clickable.
- Added detail modal (`run-detail-overlay`) with expanded run summary:
  - result, mode, seed
  - end timestamp
  - duration
  - streak and badges
  - team size, alive count, max level
- Empty-history state is now explicitly non-clickable (`run-row-empty`).

## Seed Share & Lock UI (Added)
- Added `Copiar` seed button in start menu seed controls (`btn-seed-copy`).
- Added seed lock indicator (`seed-lock-indicator`) with explicit daily-vs-normal state.
- Daily challenge now shows seed as locked (input and random button disabled).
- Normal/Nuzlocke modes keep seed editable and copyable.
- Seed UI state is refreshed on:
  - app init
  - run start
  - save load

## Deterministic Replay Scaffold (Added)
- `runLog` schema bumped to `2` with deterministic replay fields:
  - `initialRngState`
  - `replay.seed`
  - `replay.initialRngState`
  - `replay.actionSequence`
  - `replay.rngCheckpoints`
- Action sequence capture added for key player inputs:
  - turn selection (`TURN`)
  - potion usage (`POTION`)
  - capture attempt (`CAPTURE_ATTEMPT`)
  - switch action (`SWITCH`)
- RNG checkpoints are now recorded on key events plus periodic interval checkpoints.
- Replay viewer header now displays action/checkpoint counts and event RNG state is shown per event line.

## Lightweight Test Harness (Added)
- Added `test_harness.js` executable with no external dependencies.
- Added modular runtime extraction to support testability:
  - `runtime_seed.js` (seed hashing/normalization + deterministic RNG helpers)
  - `runtime_save_migration.js` (save inventory normalization + migration)
- Covered checks in harness:
  - seeded RNG determinism
  - save migration sanity (legacy fields + clamping)
  - status immunity/control-shield edge cases
  - damage immunity edge case (0x multiplier)
  - accuracy stage clamp sanity
- Run command:
  - `node test_harness.js`

## Run Log Export (Added)
- Added run-log scaffold inside game state (`state.runLog`).
- Log now captures key events:
  - run start/load
  - encounter start
  - move choices
  - potion/capture/switch actions
  - win/loss milestones
- Added `Exportar Run Log` button in battle controls.
- Export behavior:
  - attempts clipboard copy
  - always downloads JSON file (`runlog-<seed>-<timestamp>.json`)
- Added in-app replay viewer:
  - import JSON run log
  - step previous/next events
  - autoplay timeline
  - close viewer

## PvP Draft (Added)
- PvP now supports two modes from start menu:
  - `1 vs 1 (Local)` random teams
  - `Draft 1 vs 1` with alternating picks from shared pool
- Draft flow:
  - shared random pool
  - alternating picks until each player has full team
  - then starts hot-seat PvP with drafted teams

## Attack System - Non-Damage (Phase 1 Added)
- Core battle engine now supports non-damage effects in a more generic way:
  - string effects (`effect`)
  - multi-option effects (`PAR|BRN|FRZ`)
  - structured effects (`effects[]` objects for stat/heal/status)
- New volatile combat states implemented:
  - `flinched` (retroceso)
  - `confusionTurns` (confusion self-hit chance each turn)
- Added utility effects:
  - heal (`HEAL_50`)
  - full rest (`REST`)
  - stat up/down extensions (`ATK_DOWN`, `SPA_UP`, etc.)
- Priority checks moved to move keys (`Quick Attack`, `Extreme Speed`) for robustness.
- PvP round executor now passes flinch context so flinch only applies when attacker moves first.
- AI now scores status/support moves better (heal timing, confusion/status value, self/foe stat shifts).
- `moveset.js` expanded with a first batch of status/support moves used by species data:
  - `Harden`, `Sand Attack`, `Sing`, `Hypnosis`, `Thunder Wave`, `Recover`, `Rest`,
    `Agility`, `Swords Dance`, `Growth`, `Acid Armor`, `Withdraw`, `Reflect`,
    `Charm`, `Confuse Ray`, `Spore`, `Glare`, `Synthesis`, `Moonlight`, `Morning Sun`,
    `Soft-Boiled`, `Milk Drink`, `Teleport`, `Splash`.

## Attack System - Balance Layer (Phase 2 Added)
- Added per-Pokemon move cooldown tracking (`moveCooldowns`) in core battle state.
- Added generic cooldown helpers in battle engine:
  - `getMoveCooldown`
  - `tickMoveCooldowns`
  - `setMoveCooldown`
  - `getUsableMoveKeys`
  - `chooseRandomUsableMoveKey`
- Cooldown is now enforced in:
  - player normal battle move selection
  - opponent AI/random move selection
  - PvP hot-seat move selection and round resolution
  - retaliation actions after potion/capture/switch
- Move buttons now show `CD N` and are disabled while cooling down.
- Initial balancing pass in `moveset.js`:
  - sleep/paralyze/confuse support moves have adjusted `chance`
  - strong support moves now include `cooldown` (e.g., `Recover`, `Rest`, `Spore`, `Thunder Wave`).

## Attack System - Balance Layer (Phase 3 Added)
- Added status immunities by type in core status application:
  - `BRN`: immune for `Fuego`
  - `FRZ`: immune for `Hielo`
  - `PSN`: immune for `Veneno` and `Acero`
  - `PAR`: immune for `Eléctrico`
- Added anti-chain control guards:
  - `statusShieldTurns` prevents immediate re-application loops of major status control (`SLP`, `PAR`, `FRZ`).
  - `confusionShieldTurns` prevents confusion spam loops.
- Control guards are decremented during combat flow and integrated in normal/PvP battle execution.
- `abilities.js` contact-status effects now reuse core status eligibility checks (type immunity + guard checks).
- AI decision scoring now avoids selecting control moves when target is currently protected/immune.

## Attack System - Accuracy/Evasion (Phase 4 Added)
- Added full move hit-check pipeline before effect/damage resolution:
  - `move.accuracy` support (default `1.0`)
  - `move.alwaysHit` support
  - miss result logging and no effect application on miss.
- Added `acc`/`eva` stages to Pokémon stage model and save-migration normalization.
- Added generic accuracy calculation:
  - stage differential from attacker `acc` and defender `eva`
  - stage multiplier integration in hit chance calculation.
- `ACC_DOWN` now has real combat impact (lowers target precision stage) instead of log-only.
- AI move scoring now weights expected damage by hit chance.
- Rebalanced representative moves with explicit accuracy:
  - examples: `Fire Blast`, `Hydro Pump`, `Thunder`, `Blizzard`, `Dynamic Punch`, `Zap Cannon`
  - status-control moves now use `accuracy` for hit-roll semantics (`Sing`, `Hypnosis`, `Thunder Wave`, `Confuse Ray`, `Glare`, `Spore`).

## Attack System - Status Durations (Phase 5 Added)
- Added explicit turn counters for major control statuses:
  - `sleepTurns` for `SLP` (2-4 turns)
  - `freezeTurns` for `FRZ` (1-3 turns)
- Status application now initializes deterministic duration counters.
- Turn resolution now consumes these counters and resolves wake/thaw via counter expiration instead of per-turn random wake/thaw checks.
- Save migration now normalizes these new fields for legacy saves.
- Ability-based contact statuses also initialize status-duration counters via shared helper.

## Attack System - Advanced Support Semantics (Phase 6 Added)
- Added `Reflect` as side-field effect with duration (`reflectTurns`) and physical damage mitigation.
- Added `Leech Seed` (`Drenadoras`) with end-of-turn drain/heal flow:
  - drains seeded target each turn
  - heals seeding side active mon
  - blocked for `Planta` targets
  - cleared on switch/faint/new battle.
- Added shared field-state helpers for side effects and end-turn ticking.
- Integrated end-turn field processing in both PvE and PvP loops.
- Updated AI valuation for `REFLECT` and `LEECH_SEED`.

## Attack System - AI Context Pass (Phase 7 Added)
- AI now pre-checks for reliable KO options and prioritizes damage finishers when available.
- AI now penalizes status/support turns when a likely KO exists.
- AI now gives modest setup value only in healthy board states (both mons with comfortable HP).
- AI avoids overvaluing `Reflect` when its side already has active `reflectTurns`.

## Attack System - Screen Effects (Phase 8 Added)
- Added `Light Screen` (`LIGHT_SCREEN`) as side-field support effect.
- `Reflect` now mitigates physical damage and `Light Screen` mitigates special damage, each with independent duration tracking.
- End-of-turn field ticker now expires and logs both screen effects separately.
- AI now values `LIGHT_SCREEN` similarly to `REFLECT` and avoids re-casting while already active.

## Attack System - Perish Song (Phase 9 Added)
- Added `Perish Song` (`PERISH_SONG`) as advanced status move semantic.
- Added `perishTurns` countdown state on Pokemon and save normalization.
- End-of-turn countdown now resolves `Perish Song` KOs in both PvE and PvP flows.
- `perishTurns` is cleared on switch/faint to avoid stale carryover.
- AI includes basic risk-aware valuation for `PERISH_SONG` and avoids recasting while already active.

## Attack System - Entry Hazards (Phase 10 Added)
- Added `Spikes` (`SPIKES`) as side-field hazard with up to 3 layers.
- Added entry hazard damage on switch-in (PvE and PvP), with layer-based scaling:
  - 1 layer: `1/8` max HP
  - 2 layers: `1/6` max HP
  - 3 layers: `1/4` max HP
- `Volador` types are immune to `Spikes` damage.
- AI now values `SPIKES` placement by current enemy-side layers and avoids overcasting at max stacks.

## Attack System - Weather Layer (Phase 11 Added)
- Added lightweight weather state in battle field with duration tracking:
  - `RAIN`, `SUN`, `SAND`, `HAIL`
- Added weather setup move semantics:
  - `Rain Dance`, `Sunny Day`, `Sandstorm`, `Hail`
- Added weather-based damage modifiers:
  - `RAIN`: boosts `Agua` and weakens `Fuego`
  - `SUN`: boosts `Fuego` and weakens `Agua`
- Added residual end-turn weather damage:
  - `SAND`: damages non `Roca`/`Tierra`/`Acero`
  - `HAIL`: damages non `Hielo`
- Integrated weather processing in both PvE and PvP end-turn flows.
- AI now considers weather setup value and avoids redundant recast of active weather.

## Attack System - Hazard Expansion (Phase 12 Added)
- Added `Stealth Rock` (`STEALTH_ROCK`) as additional entry hazard semantic.
- `Stealth Rock` now applies switch-in damage scaled by `Roca` effectiveness against target typing.
- `Stealth Rock` and `Spikes` coexist and both are processed on entry.
- AI now evaluates `STEALTH_ROCK` setup value and avoids recasting when already active.

## Attack System - Hazard Expansion 2 (Phase 13 Added)
- Added `Toxic Spikes` (`TOXIC_SPIKES`) with up to 2 layers.
- `Toxic Spikes` now applies poison on grounded switch-in targets.
- `Veneno` switch-ins now absorb and clear active `Toxic Spikes` layers.
- Integrated `TOXIC_SPIKES` valuation in AI setup logic (layer-aware, anti-overcast).

## Attack System - Combo Tempo (Phase 14 Added)
- Added lightweight combo/tempo meter on Pokemon (`comboStacks`, cap `x3`).
- Successful non-status damage actions can build combo when sequencing different move types.
- Combo grants controlled damage bonus (`+5%` per stack, capped).
- Combo decays each turn and is cleared on switch/faint to avoid runaway snowball.
- Save migration now normalizes combo fields for legacy saves.

## Run Events & MiniBoss (Phase 15 Added)
- Added battle-scoped run event system with temporary global modifiers.
- Implemented initial event pool:
  - `Luna Roja`: global damage boost
  - `Niebla Mística`: global accuracy reduction
  - `Brisa Vital`: end-turn healing
- Added periodic mini-boss encounters (every 7th battle) with boosted opponent stats.
- Added mini-boss extra rewards on win (`balls`/`pots` bonus).
- Encounter log/run-log now records active event id and mini-boss flag.

## Attack System - Control Utility Expansion (Phase 16 Added)
- Added `TAUNT` (`Mofa`) effect:
  - blocks status moves from target for 3 turns
  - integrated turn countdown/expiration in end-turn processing
  - AI now values `TAUNT` higher vs targets with more status moves
- Added `PROTECT` (`Proteccion`) effect:
  - blocks incoming move resolution for current turn
  - includes anti-spam success decay via streak-based fail chance (`1, 1/2, 1/4...`)
  - AI now uses `PROTECT` situationally (mostly low-HP stalling) and avoids spam
- Added new move entries in `moveset.js`:
  - `Taunt`
  - `Protect`
- Added/reset new volatile state fields in Pokemon runtime:
  - `tauntTurns`
  - `protectThisTurn`
  - `protectStreak`

## Attack System - Field Control Expansion (Phase 17 Added)
- Added hazard/field clearing support:
  - `CLEAR_OWN_HAZARDS` (used by `Rapid Spin`)
  - `DEFOG` (used by `Defog`)
- Added shared helper `clearSideHazards` for deterministic hazard/screen cleanup logic.
- Added new moves in `moveset.js`:
  - `Rapid Spin`
  - `Defog`
- AI now evaluates hazard-clearing context:
  - values clearing when own side burden is high
  - penalizes unnecessary clear when no field pressure exists
- Protect interaction fix:
  - `Protect` now blocks only moves that actually target the defender (or defender-targeted effects)
  - no longer incorrectly blocks pure self-buffs/field-self effects.

## Attack System - Pivot & Baton Utility (Phase 18 Added)
- Added switch-utility effects:
  - `BATON_PASS` (status pivot with positive stage transfer)
  - `PIVOT_SWITCH` (damage + immediate switch, e.g. U-turn style)
- Added move entries in `moveset.js`:
  - `Baton Pass`
  - `U-turn`
  - `Volt Switch`
- Added immediate auto-switch helper for move-driven switching:
  - `doAutoSwitch`
  - deterministic candidate selection when no manual prompt is possible mid-turn
- Battle flow updates:
  - action-2 targeting now refreshes active references after action-1 (to support pivot switch correctness)
  - end-turn effects now resolve over current active combatants after switch events
- Baton Pass behavior:
  - standard switch clears user stages
  - `BATON_PASS` transfers only positive stage boosts to the incoming ally
- AI updates:
  - values `BATON_PASS` based on current boost state and bench availability
  - values `PIVOT_SWITCH` mainly as low-HP tempo tool, with KO-aware penalty.

## Attack System - Utility Denial & Reset (Phase 19 Added)
- Added setup-punisher and recovery-denial semantics:
  - `HAZE`: clears stat stage changes on both active combatants.
  - `HEAL_BLOCK`: prevents target healing for 4 turns.
- Added healing lock integration in core heal paths:
  - blocks `HEAL_50` and `REST` while `healBlockTurns > 0`.
- Added turn ticking for heal lock expiration in end-turn field ticker.
- Added move entries in `moveset.js`:
  - `Haze`
  - `Heal Block`
- AI updates:
  - values `HAZE` when target has meaningful positive setup and penalizes self-wipe scenarios.
  - values `HEAL_BLOCK` more when target likely has healing options / low HP.
- Save/load normalization updated:
  - `healBlockTurns` now migrates safely from legacy saves.
- Added lightweight harness checks for both mechanics.

## Attack System - Move Denial Utility (Phase 20 Added)
- Added `DISABLE` utility effect:
  - targets opponent last used move
  - blocks that move for 3 turns (`disabledMoveKey` + `disableTurns`)
- Added move entry in `moveset.js`:
  - `Disable`
- Move selection integration:
  - disabled moves are now filtered out from `getUsableMoveKeys`
  - player/PvP move buttons show `ANULADO` and are disabled accordingly
  - direct move execution/input checks also block disabled move usage.
- Turn flow integration:
  - `disableTurns` decrements each end turn and auto-clears when it expires.
  - switching clears disable state on the switched-out Pokemon.
- Added runtime state and migration support:
  - `disableTurns`, `disabledMoveKey`, `lastUsedMoveKey`.
- AI updates:
  - avoids status moves while taunted more aggressively.
  - values `DISABLE` based on target last used move impact.
- Added harness checks for disable behavior.

## Exploratory - RogueRun Overworld MVP (Phase 21 Added)
- Added new mode entrypoint: `RogueRun`.
- Added overworld route layer (`roguerun_addon.js`) with deterministic node-path progression:
  - 12 nodes total
  - 3 path choices per node
  - node types: `BATTLE`, `ELITE`, `SHOP`, `REST`, `EVENT`
- Added dedicated RogueRun overlay UI:
  - current node progress
  - team HP snapshot
  - inventory snapshot
  - selectable node cards
- Integrated node-to-battle orchestration:
  - battle nodes start standard combat
  - elite nodes start boosted mini-boss style combat
  - non-battle nodes resolve immediate rewards/effects then advance path
- Integrated post-battle return-to-overworld flow:
  - after win, RogueRun resumes route selection instead of chaining default random battle
  - run completes at final node with `VICTORIA_ROGUERUN` result
- Persistence integration:
  - added `state.rogueRun` persistence/migration support
  - load flow restores RogueRun map state and resumes either map or in-battle node context.

## Exploratory - RogueRun Visual Map & Flow Fixes (Phase 22 Added)
- Reworked RogueRun overlay into a real visual route map:
  - node graph with inter-floor links
  - clickable map nodes and mirrored node cards per floor
  - per-node type markers (`B`, `E`, `S`, `R`, `?`) and progress highlighting
- Fixed progression exploit (shop/event-only clears):
  - support-node chain guard added (`nonCombatStreak`)
  - now requires a combat node before taking another support node
  - combat-heavy checkpoints enforced in route generation (start, periodic checkpoints, final floor)
- Improved run variety on restart:
  - RogueRun now starts with fresh randomized seed on each new start
  - avoids repeated identical opener (same starter/opponent) between quick restarts
- Added extra RogueRun state tracking:
  - `visitedNodeIds`
  - `linksByFloor`
  - `combatsWon`
  - `nonCombatStreak`

## Exploratory - RogueRun Mobile Polish & Rewards (Phase 23 Added)
- Added persistent RogueRun rewards beyond run-history entry:
  - `Rogue crowns` profile stored in localStorage (`roguerun_profile_v1`)
  - +1 crown per completion
  - +1 extra crown on flawless clear (all team members alive at finish)
  - profile panel visible in start menu (`crowns`, `runs`, `flawless`, last reward)
- Refined map UX for mobile-first gameplay:
  - responsive map height by viewport
  - improved node styling and readability
  - adaptive current-floor node card layout (single column on narrow screens)
  - resize-aware rerender for orientation/device width changes
- Kept anti-exploit flow enforcement:
  - support-node chain blocked until a combat node is cleared.

## Exploratory - RogueRun Handmade Map Pass (Phase 24 Added)
- Reworked route board spacing to avoid row overlap:
  - fixed per-floor vertical gap with scrollable map viewport
  - current floor auto-centered in the scroll container
- Added handmade-style visual pass:
  - dashed path lines
  - paper-like texture layer
  - rough/dashed card borders
  - per-node color accents by type and slight node tilt variance
- Mobile readability improvements:
  - larger node tokens
  - adaptive node-card columns (`1`, `2`, or `3` depending on width)

## Exploratory - PvP Online WebRTC MVP (Phase 25 Added)
- Added `pvp_online_addon.js` with browser-native WebRTC DataChannel flow (no backend required).
- Added start-menu entry: `PvP Online (Beta)`.
- Implemented manual signaling handshake (GitHub Pages friendly):
  - host generates `offer` code
  - guest pastes offer and generates `answer` code
  - host pastes answer to complete connection
- Online battle sync model:
  - host-authoritative round resolution
  - guest sends selected move (`MOVE`)
  - host resolves round and sends state snapshot (`ROUND_STATE`)
  - match initialization and completion messages:
    - `INIT_MATCH`
    - `MATCH_END`
- Integrated online mode into existing PvP runtime:
  - `pvpState.mode = online|local`
  - online-aware move input/render flow
  - snapshot export/import helpers for remote state sync.

## Exploratory - PvP Online QR Pairing (Phase 26 Added)
- Added QR-assisted signaling on top of WebRTC manual flow:
  - host offer shown as text + QR
  - guest answer shown as text + QR
- Added camera QR scan actions (when browser supports `BarcodeDetector`):
  - guest can scan host offer
  - host can scan guest answer
- Added graceful fallback UX:
  - if scan is unsupported, flow continues with text copy/paste.

## Exploratory - Mobile Overlay Fix & Online Connectivity Diagnostics (Phase 27 Added)
- Fixed unintended RogueRun overlay popup on mobile scroll/resize:
  - RogueRun state no longer auto-initializes as active
  - resize handler now reads existing state without forcing activation.
- Improved online PvP connection robustness and feedback:
  - expanded ICE server list (multiple STUN + public TURN fallback entries)
  - longer ICE gather window for manual signaling payloads
  - explicit channel-open timeout with retry UI instead of silent waiting states
  - added connection diagnostics logs for failed/disconnected states.

## Pending Roadmap (To Be Added)
### Short Term (Next Steps)
- Expand non-damage move semantics:
  - move-specific behaviors (setup punishers, recovery denial, etc.)
  - support for end-of-turn and side-field effects.
- Improve AI move planning:
  - value setup moves by board state and remaining HP
  - avoid overusing support when a KO is available
  - basic risk model for cooldown + status shields.

### Mid Term
- Introduce a lightweight battle test harness:
  - deterministic seeds for replayable combat scenarios
  - assertions for status immunity/control-shield/cooldown edge cases
  - regression snapshots for damage + turn resolution.
- Rebalance move catalog in data:
  - normalize support move `chance`, `cooldown`, and expected value
  - tiered balancing pass by `spawnTier` and level ranges.
- Add combat telemetry for balancing:
  - winrate by species/move
  - average turns per battle
  - control uptime metrics (`SLP/PAR/CON`) by mode.

### Long Term / Structural
- Refactor battle engine out of `index.html` into modular files:
  - `battle_core`, `effects`, `status`, `ai_eval`, `replay`.
- Unify PvE/PvP turn resolution through one shared orchestrator with mode flags.
- Add visual UX improvements for combat states:
  - clear status/cooldown indicators in UI cards
  - explicit "resisted" and "shielded" combat log tags.

### Gameplay Additions (Post-Core)

### Exploratory Features
- Local PvP by proximity (Bluetooth-like UX):
  - Recommended transport: `WebRTC DataChannel` with nearby QR/short code pairing.
  - Why: broad browser/device support and lower dependency burden than direct Web Bluetooth game sync.
  - Web Bluetooth viability: useful as optional discovery handshake only, not as primary realtime transport.
  - Scope suggestion: deterministic lockstep turn protocol (`seed + inputs`) to minimize bandwidth/desync risk.
- Overworld layer:
  - Minimal viable loop: node-based map with route choices, shops, heal nodes, trainers, random events.
  - Value: gives strategic macro-decisions between battles (risk/reward pathing), improving replayability.
  - Integration: keep current combat core unchanged; overworld only feeds encounter/modifier/state context.


