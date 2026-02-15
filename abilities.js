/* =========================================================
   ABILITIES SYSTEM (Plugin-based)
========================================================= */

const ABILITIES_DATA = {
    'Potencia Bruta': { desc: 'Duplica el Ataque físico.', statMod: { stat: 'atk', mult: 2.0 } },
    'Mente Recia':    { desc: 'Duplica el Ataque Especial.', statMod: { stat: 'spa', mult: 2.0 } },
    'Pelaje Recio':   { desc: 'Duplica la Defensa física.', statMod: { stat: 'def', mult: 2.0 } },
    'Polvo Metálico': { desc: 'Duplica la Def. Especial.', statMod: { stat: 'spd', mult: 2.0 } },
    'Impulso':        { desc: 'Aumenta la Velocidad cada turno.', onTurnEnd: (user) => applyStatChange(user, 'spe', 1, 'Velocidad') },
    'Autoestima':     { desc: 'Sube Ataque al derrotar a un rival.', onKill: (user) => applyStatChange(user, 'atk', 1, 'Ataque') },
    'Agallas':        { desc: 'Sube Ataque x1.5 si sufre estado.', cond: (u) => u.status !== null, dmgMult: 1.5 },
    'Escama Especial':{ desc: 'Sube Defensa x1.5 si sufre estado.', cond: (u) => u.status !== null, defMult: 1.5 },
    'Espesura':       { desc: '+50% a Planta con poca vida.', typeBoost: 'Planta', hpThreshold: 0.33 },
    'Mar Llamas':     { desc: '+50% a Fuego con poca vida.', typeBoost: 'Fuego', hpThreshold: 0.33 },
    'Torrente':       { desc: '+50% a Agua con poca vida.', typeBoost: 'Agua', hpThreshold: 0.33 },
    'Enjambre':       { desc: '+50% a Bicho con poca vida.', typeBoost: 'Bicho', hpThreshold: 0.33 },
    'Experto':        { desc: 'Potencia movimientos débiles (Poder <= 60).', movePowerThresh: 60, dmgMult: 1.5 },
    'Adaptable':      { desc: 'Mejora el bonus por mismo tipo (STAB).', stabMod: 2.0 },
    'Francotirador':  { desc: 'Golpes críticos más fuertes.', critMult: 2.0 },
    'Afortunado':     { desc: 'Probabilidad de crítico alta.', critChance: 0.25 },
    'Cromolente':     { desc: 'Mejora ataques No muy eficaces.', notEffectiveMod: 2.0 },
    'Puño Férreo':    { desc: 'Potencia ataques de puño.', nameContains: 'Puño', dmgMult: 1.3 },
    'Mandíbula':      { desc: 'Potencia mordiscos.', nameContains: 'Mordisco', dmgMult: 1.5 },
    'Levitación':     { desc: 'Inmune a Tierra.', immune: 'Tierra' },
    'Absorbe Agua':   { desc: 'Inmune a Agua y cura vida.', immune: 'Agua', healOnHit: true },
    'Absorbe Fuego':  { desc: 'Inmune a Fuego y sube Ataque.', immune: 'Fuego', buffOnHit: 'atk' },
    'Pararrayos':     { desc: 'Inmune a Eléctrico y sube At. Esp.', immune: 'Eléctrico', buffOnHit: 'spa' },
    'Herbívoro':      { desc: 'Inmune a Planta y sube Ataque.', immune: 'Planta', buffOnHit: 'atk' },
    'Inmunidad':      { desc: 'No puede ser envenenado.', statusImmune: 'PSN' },
    'Flexibilidad':   { desc: 'No puede ser paralizado.', statusImmune: 'PAR' },
    'Insomnio':       { desc: 'No puede ser dormido.', statusImmune: 'SLP' },
    'Manto Níveo':    { desc: 'No puede ser congelado.', statusImmune: 'FRZ' },
    'Ignífugo':       { desc: 'No puede ser quemado.', statusImmune: 'BRN' },
    'Insonorizar':    { desc: 'Inmune a ataques de sonido.', moveTag: 'sound', immune: true },
    'Robustez':       { desc: 'Evita morir de un golpe (OHKO).', sturdy: true },
    'Foco Interno':   { desc: 'Evita el retroceso.', preventFlinch: true },
    'Muro Mágico':    { desc: 'Inmune a daño indirecto.', noIndirectDmg: true },
    'Intimidación':   { desc: 'Baja el Ataque del rival.', onEntry: (u, t) => applyStatChange(t, 'atk', -1, 'Ataque') },
    'Llovizna':       { desc: 'Invoca lluvia.', onEntry: (u) => log(`🌧️ <b>${u.name}</b> invoca lluvia eterna.`), globalType: 'Agua' },
    'Sequía':         { desc: 'Invoca sol.', onEntry: (u) => log(`☀️ <b>${u.name}</b> hace brillar el sol.`), globalType: 'Fuego' },
    'Descarga':       { desc: 'Campo eléctrico.', onEntry: (u) => log(`⚡ <b>${u.name}</b> electrifica el campo.`), globalType: 'Eléctrico' },
    'Rastro':         { desc: 'Copia la habilidad del rival.', onEntry: (u, t) => { if (t.ability) { u.ability = t.ability; log(`🧬 ${u.name} rastreó ${t.ability}!`); } } },
    'Descarga Adren.':{ desc: 'Sube Velocidad al entrar.', onEntry: (u) => applyStatChange(u, 'spe', 1, 'Velocidad') },
    'Piel Tosca':     { desc: 'Daña al rival si hace contacto.', onContact: (a) => { damagePercent(a, 0.12); log(`🌵 ¡${a.name} se hirió con la piel tosca!`); } },
    'Cuerpo Llama':   { desc: 'Quema al contacto (30%).', onContact: (a) => tryStatus(a, 'BRN', 0.3) },
    'Estática':       { desc: 'Paraliza al contacto (30%).', onContact: (a) => tryStatus(a, 'PAR', 0.3) },
    'Punto Tóxico':   { desc: 'Envenena al contacto (30%).', onContact: (a) => tryStatus(a, 'PSN', 0.3) },
    'Cuerpo Maldito': { desc: 'Baja Ataque al contacto (30%).', onContact: (a) => { if (gameRandom() < 0.3) applyStatChange(a, 'atk', -1, 'Ataque'); } },
    'Dicha':          { desc: 'Doble probabilidad de efectos secundarios.', effectChanceMult: 2.0 },
    'Puño Invisible': { desc: 'Los ataques nunca fallan.', noMiss: true },
    'Rompemoldes':    { desc: 'Ignora habilidades defensivas del rival.', ignoreDefAbility: true },
    'Vampirismo':     { desc: 'Cura un poco al hacer daño.', drain: 0.2 }
};

function initAbilities() {
    if (window.__abilitiesPluginReady) return;
    window.__abilitiesPluginReady = true;
    if (typeof Pokemon === 'undefined' || typeof window.registerGamePlugin !== 'function') return;

    const OriginalPokemon = Pokemon;
    Pokemon = class extends OriginalPokemon {
        constructor(name, level, isNuzlocke) {
            super(name, level, isNuzlocke);
            const keys = Object.keys(ABILITIES_DATA);
            this.ability = keys[Math.floor(gameRandom() * keys.length)];
        }
    };

    const originalGetStat = Pokemon.prototype.getStat;
    Pokemon.prototype.getStat = function(statName) {
        let val = originalGetStat.call(this, statName);
        const data = ABILITIES_DATA[this.ability] || {};
        if (data.statMod && data.statMod.stat === statName) val = Math.floor(val * data.statMod.mult);
        if (statName === 'def' && data.defMult && data.cond && data.cond(this)) val = Math.floor(val * data.defMult);
        return val;
    };

    window.registerGamePlugin({
        name: 'abilities-system',
        hooks: {
            afterStartBattle() {
                setTimeout(() => {
                    if (state.team[state.activeIdx]) triggerEntry(state.team[state.activeIdx], opponent);
                    if (opponent) triggerEntry(opponent, state.team[state.activeIdx]);
                }, 200);
            },
            afterSwitch(ctx) {
                const delay = ctx.forced ? 200 : 1100;
                setTimeout(() => {
                    const p = state.team[state.activeIdx];
                    if (p && p.hp > 0) triggerEntry(p, opponent);
                }, delay);
            },
            calcDamageOverride(ctx) {
                return calcDamageWithAbilities(ctx.atkMon, ctx.defMon, ctx.move);
            },
            beforeExecuteMove(ctx) {
                const atkData = ABILITIES_DATA[ctx.attacker?.ability] || {};
                if (ctx.move && ctx.move.effect && atkData.effectChanceMult) {
                    ctx.meta.originalChance = (ctx.move.chance || 0.1);
                    ctx.move.chance = ctx.meta.originalChance * atkData.effectChanceMult;
                }
            },
            afterExecuteMove(ctx) {
                const attacker = ctx.attacker;
                const defender = ctx.defender;
                const move = ctx.move;
                const atkData = ABILITIES_DATA[attacker?.ability] || {};
                const defData = ABILITIES_DATA[defender?.ability] || {};

                if (move && move.effect && ctx.meta.originalChance !== undefined) {
                    move.chance = ctx.meta.originalChance;
                }
                if (!move || !attacker || !defender || defender.hp <= 0) return;

                if (atkData.drain) {
                    const drainAmt = Math.floor(attacker.maxHp * 0.1);
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + drainAmt);
                    if (window.renderAll) window.renderAll();
                }

                if (move.cat === 'Fis' && defData.onContact) {
                    defData.onContact(attacker);
                    if (window.renderAll) window.renderAll();
                }

                if (defender.hp <= 0 && atkData.onKill) atkData.onKill(attacker);
            },
            beforeStatusDamage(ctx) {
                const data = ABILITIES_DATA[ctx.mon?.ability] || {};
                if (data.noIndirectDmg && (ctx.mon.status === 'BRN' || ctx.mon.status === 'PSN')) {
                    log(`✨ <b>Muro Mágico</b> protege a ${ctx.mon.name} del daño de ${ctx.mon.status}.`);
                    ctx.handled = true;
                }
            },
            afterStatusDamage(ctx) {
                const data = ABILITIES_DATA[ctx.mon?.ability] || {};
                if (data.onTurnEnd) data.onTurnEnd(ctx.mon);
            }
        }
    });
}

function calcDamageWithAbilities(atkMon, defMon, move) {
    if (!atkMon || !defMon || !move) return { amount: 0, mult: 0 };

    const atkData = ABILITIES_DATA[atkMon.ability] || {};
    const defData = ABILITIES_DATA[defMon.ability] || {};
    let mult = 1;

    if (!atkData.ignoreDefAbility && defData.immune === move.tipo) {
        log(`🛡️ <b>${defMon.ability}</b> de ${defMon.name} bloqueó el ataque.`);
        if (defData.healOnHit) {
            const heal = Math.floor(defMon.maxHp * 0.25);
            defMon.hp = Math.min(defMon.maxHp, defMon.hp + heal);
            log(`💚 ${defMon.name} recuperó vida.`);
            if (window.renderAll) window.renderAll();
        }
        if (defData.buffOnHit) applyStatChange(defMon, defData.buffOnHit, 1, 'Stats');
        return { amount: 0, mult: 0 };
    }

    if (TYPE_CHART[move.tipo]) {
        defMon.types.forEach(t => {
            let effectiveness = TYPE_CHART[move.tipo][t];
            if (effectiveness < 1 && atkData.notEffectiveMod) effectiveness *= atkData.notEffectiveMod;
            if (!atkData.ignoreDefAbility && (move.tipo === 'Fuego' || move.tipo === 'Hielo') && defMon.ability === 'Sebo') {
                effectiveness *= 0.5;
            }
            if (effectiveness !== undefined) mult *= effectiveness;
        });
    }
    if (mult === 0) return { amount: 0, mult: 0 };

    let aStat;
    let dStat;
    if (move.cat === 'Fis') {
        aStat = atkMon.getStat('atk');
        if (atkData.cond && atkData.cond(atkMon) && atkData.dmgMult) aStat *= atkData.dmgMult;
        if (atkMon.status === 'BRN' && atkMon.ability !== 'Agallas') aStat = Math.floor(aStat * 0.5);
        dStat = defMon.getStat('def');
    } else {
        aStat = atkMon.getStat('spa');
        dStat = defMon.getStat('spd');
    }

    if (atkData.globalType === move.tipo) aStat *= 1.5;
    if (move.nombre === 'Furia Dragón') return { amount: 40, mult: 1 };

    let base = ((2 * atkMon.level / 5 + 2) * move.poder * (aStat / dStat)) / 50 + 2;
    if (atkData.typeBoost === move.tipo && (atkMon.hp / atkMon.maxHp) <= atkData.hpThreshold) base *= 1.5;
    if (atkData.movePowerThresh && move.poder <= atkData.movePowerThresh) base *= atkData.dmgMult;
    if (atkData.nameContains && move.nombre.includes(atkData.nameContains)) base *= atkData.dmgMult;

    const critChance = atkData.critChance || 0.0625;
    const critical = (gameRandom() < critChance) ? (atkData.critMult || 1.5) : 1;
    if (critical > 1) log('🎯 ¡Golpe Crítico!');

    const stab = atkMon.types.includes(move.tipo) ? (atkData.stabMod || 1.5) : 1;
    let total = Math.floor(base * mult * stab * critical * (gameRandom() * 0.15 + 0.85));

    if (defData.sturdy && defMon.hp === defMon.maxHp && total >= defMon.hp) {
        total = defMon.hp - 1;
        log(`💎 <b>Robustez</b> permitió a ${defMon.name} resistir.`);
    }

    return { amount: total, mult };
}

function triggerEntry(user, target) {
    if (!user || !user.ability) return;
    const data = ABILITIES_DATA[user.ability];
    if (data?.onEntry) data.onEntry(user, target);
}

function damagePercent(mon, pct) {
    const dmg = Math.floor(mon.maxHp * pct);
    mon.hp = Math.max(0, mon.hp - dmg);
}

function tryStatus(mon, status, chance) {
    if (typeof canInflictStatus === 'function' && !canInflictStatus(mon, status)) return;
    if (mon.status) return;
    const data = ABILITIES_DATA[mon.ability] || {};
    if (data.statusImmune === status) return;
    if (gameRandom() < chance) {
        mon.status = status;
        if (typeof initStatusDuration === 'function') initStatusDuration(mon, status);
        if (['SLP', 'PAR', 'FRZ'].includes(status)) mon.statusShieldTurns = 2;
        log(`⚠️ ¡${mon.name} fue afectado por ${status} al contacto!`);
    }
}

