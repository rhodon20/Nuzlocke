/* =========================================================
   ABILITIES SYSTEM (Rogue Randomizer Edition)
   Description: 50 Habilidades aleatorias y sus efectos.
   FIX: Ahora las estadísticas pasivas se reflejan en la UI.
========================================================= */

// --- BASE DE DATOS DE 50 HABILIDADES (Global) ---
const ABILITIES_DATA = {
    // --- BUFFS DE ESTADÍSTICAS (PASIVOS) ---
    'Potencia Bruta': { desc: 'Duplica el Ataque físico.', statMod: { stat: 'atk', mult: 2.0 } },
    'Mente Recia':    { desc: 'Duplica el Ataque Especial.', statMod: { stat: 'spa', mult: 2.0 } },
    'Pelaje Recio':   { desc: 'Duplica la Defensa física.', statMod: { stat: 'def', mult: 2.0 } },
    'Polvo Metálico': { desc: 'Duplica la Def. Especial.', statMod: { stat: 'spd', mult: 2.0 } },
    'Impulso':        { desc: 'Aumenta la Velocidad cada turno.', onTurnEnd: (user) => applyStatChange(user, 'spe', 1, 'Velocidad') },
    'Autoestima':     { desc: 'Sube Ataque al derrotar a un rival.', onKill: (user) => applyStatChange(user, 'atk', 1, 'Ataque') },
    
    // --- BUFFS CONDICIONALES ---
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
    'Cromolente':     { desc: 'Mejora ataques "No muy eficaces".', notEffectiveMod: 2.0 },
    'Puño Férreo':    { desc: 'Potencia ataques de puño.', nameContains: 'Puño', dmgMult: 1.3 },
    'Mandíbula':      { desc: 'Potencia mordiscos.', nameContains: 'Mordisco', dmgMult: 1.5 },
    
    // --- INMUNIDADES Y ABSORCIONES ---
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
    'Insonorizar':    { desc: 'Inmune a ataques de sonido (Rugido/Canto).', moveTag: 'sound', immune: true }, 
    'Robustez':       { desc: 'Evita morir de un golpe (OHKO).', sturdy: true },
    'Foco Interno':   { desc: 'Evita el retroceso.', preventFlinch: true },
    'Muro Mágico':    { desc: 'Inmune a daño indirecto (Veneno/Quemadura).', noIndirectDmg: true },

    // --- AL ENTRAR AL COMBATE ---
    'Intimidación':   { desc: 'Baja el Ataque del rival.', onEntry: (u, t) => applyStatChange(t, 'atk', -1, 'Ataque') },
    'Llovizna':       { desc: 'Invoca lluvia (Potencia Agua).', onEntry: (u) => log(`🌧️ <b>${u.name}</b> invoca lluvia eterna.`), globalType: 'Agua' },
    'Sequía':         { desc: 'Invoca sol (Potencia Fuego).', onEntry: (u) => log(`☀️ <b>${u.name}</b> hace brillar el sol.`), globalType: 'Fuego' },
    'Descarga':       { desc: 'Campo eléctrico (Potencia Elec.).', onEntry: (u) => log(`⚡ <b>${u.name}</b> electrifica el campo.`), globalType: 'Eléctrico' },
    'Rastro':         { desc: 'Copia la habilidad del rival.', onEntry: (u, t) => { if(t.ability){ u.ability = t.ability; log(`🧬 ${u.name} rastreó ${t.ability}!`); } } },
    'Descarga Adren.':{ desc: 'Sube Velocidad al entrar.', onEntry: (u) => applyStatChange(u, 'spe', 1, 'Velocidad') },

    // --- EFECTOS AL CONTACTO ---
    'Piel Tosca':     { desc: 'Daña al rival si hace contacto.', onContact: (attacker) => { damagePercent(attacker, 0.12); log(`🌵 ¡${attacker.name} se hirió con la piel tosca!`); } },
    'Cuerpo Llama':   { desc: 'Quema al contacto (30%).', onContact: (attacker) => tryStatus(attacker, 'BRN', 0.3) },
    'Estática':       { desc: 'Paraliza al contacto (30%).', onContact: (attacker) => tryStatus(attacker, 'PAR', 0.3) },
    'Punto Tóxico':   { desc: 'Envenena al contacto (30%).', onContact: (attacker) => tryStatus(attacker, 'PSN', 0.3) },
    'Cuerpo Maldito': { desc: 'Baja Ataque al contacto (30%).', onContact: (attacker) => { if(Math.random()<0.3) applyStatChange(attacker,'atk',-1,'Ataque'); } },
    
    // --- OFENSIVOS ---
    'Dicha':          { desc: 'Doble probabilidad de efectos secundarios.', effectChanceMult: 2.0 },
    'Puño Invisible': { desc: 'Los ataques nunca fallan.', noMiss: true },
    'Rompemoldes':    { desc: 'Ignora habilidades defensivas del rival.', ignoreDefAbility: true },
    'Vampirismo':     { desc: 'Cura un poco al hacer daño.', drain: 0.2 },
};

function initAbilities() {
    console.log("Iniciando sistema de habilidades...");
    if (typeof Pokemon === 'undefined') return;

    // 1. MODIFICAR CONSTRUCTOR (Asignación)
    const originalPokemonConstAbil = Pokemon;
    Pokemon = class extends originalPokemonConstAbil {
        constructor(name, level, isNuzlocke) {
            super(name, level, isNuzlocke);
            const keys = Object.keys(ABILITIES_DATA);
            this.ability = keys[Math.floor(Math.random() * keys.length)];
        }
    };

    // 2. MODIFICAR GETSTAT (Para que la UI muestre el valor real)
    // Esto hace que "Polvo Metálico" muestre el doble de defensa en la ventana de Info.
    const originalGetStat = Pokemon.prototype.getStat;
    Pokemon.prototype.getStat = function(statName) {
        let val = originalGetStat.call(this, statName);
        const data = ABILITIES_DATA[this.ability] || {};
        
        // Aplicar Stat Mod (Ej: Polvo Metálico, Potencia Bruta)
        if (data.statMod && data.statMod.stat === statName) {
            val = Math.floor(val * data.statMod.mult);
        }
        
        // Aplicar buffs condicionales (Ej: Escama Especial)
        if (statName === 'def' && data.defMult && data.cond && data.cond(this)) {
            val = Math.floor(val * data.defMult);
        }
        
        return val;
    };

    // 3. HOOKS DE ENTRADA
    const originalStartBattleAbil = window.startBattle;
    window.startBattle = function() {
        originalStartBattleAbil();
        setTimeout(() => {
            if(state.team[state.activeIdx]) triggerEntry(state.team[state.activeIdx], opponent);
            if(opponent) triggerEntry(opponent, state.team[state.activeIdx]);
        }, 200);
    };

    const originalDoSwitchAbil = window.doSwitch;
    window.doSwitch = function(idx, forced) {
        originalDoSwitchAbil(idx, forced);
        setTimeout(() => {
            const p = state.team[state.activeIdx];
            if(p && p.hp > 0) triggerEntry(p, opponent);
        }, 1100);
    };

    // 4. CÁLCULO DE DAÑO MODIFICADO (Simplificado gracias al nuevo getStat)
    window.calcDamage = function(atkMon, defMon, move) {
        const atkData = ABILITIES_DATA[atkMon.ability] || {};
        const defData = ABILITIES_DATA[defMon.ability] || {};
        let mult = 1;

        // Inmunidades
        if (!atkData.ignoreDefAbility && defData.immune === move.tipo) {
            log(`🛡️ <b>${defMon.ability}</b> de ${defMon.name} bloqueó el ataque.`);
            if (defData.healOnHit) {
                const heal = Math.floor(defMon.maxHp * 0.25);
                defMon.hp = Math.min(defMon.maxHp, defMon.hp + heal);
                log(`💚 ${defMon.name} recuperó vida.`);
                if(window.renderAll) window.renderAll();
            }
            if (defData.buffOnHit) applyStatChange(defMon, defData.buffOnHit, 1, 'Stats');
            return { amount: 0, mult: 0 };
        }

        // Eficacia Tipos
        if (TYPE_CHART[move.tipo]) {
            defMon.types.forEach(t => {
                let effectiveness = TYPE_CHART[move.tipo][t];
                if (effectiveness < 1 && atkData.notEffectiveMod) effectiveness *= atkData.notEffectiveMod;
                
                // Sebo
                if (!atkData.ignoreDefAbility && (move.tipo === 'Fuego' || move.tipo === 'Hielo') && defMon.ability === 'Sebo') {
                    effectiveness *= 0.5;
                }
                if (effectiveness !== undefined) mult *= effectiveness;
            });
        }
        if (mult === 0) return { amount: 0, mult: 0 };

        // Stats (getStat YA INCLUYE los multiplicadores fijos como Potencia Bruta)
        let aStat, dStat;
        if (move.cat === 'Fis') {
            aStat = atkMon.getStat('atk');
            
            // Agallas (es condicional, NO se aplica en getStat para no romper UI base, se aplica aquí como extra de daño)
            if (atkData.cond && atkData.cond(atkMon) && atkData.dmgMult) aStat *= atkData.dmgMult;
            
            // Quemadura (Ignífugo/Agallas evitan reducción)
            if (atkMon.status === 'BRN' && atkMon.ability !== 'Agallas') aStat = Math.floor(aStat * 0.5);
            
            dStat = defMon.getStat('def');
        } else {
            aStat = atkMon.getStat('spa');
            dStat = defMon.getStat('spd');
        }
        
        if (atkData.globalType === move.tipo) aStat *= 1.5; // Clima

        if (move.nombre === 'Furia Dragón') return { amount: 40, mult: 1 };

        let base = ((2 * atkMon.level / 5 + 2) * move.poder * (aStat / dStat)) / 50 + 2;

        // Modificadores directos
        if (atkData.typeBoost === move.tipo && (atkMon.hp / atkMon.maxHp) <= atkData.hpThreshold) base *= 1.5;
        if (atkData.movePowerThresh && move.poder <= atkData.movePowerThresh) base *= atkData.dmgMult;
        if (atkData.nameContains && move.nombre.includes(atkData.nameContains)) base *= atkData.dmgMult;

        // Crítico
        let critChance = atkData.critChance || 0.0625;
        let critical = (Math.random() < critChance) ? (atkData.critMult || 1.5) : 1;
        if (critical > 1) log('🎯 ¡Golpe Crítico!');

        let stab = atkMon.types.includes(move.tipo) ? (atkData.stabMod || 1.5) : 1;
        let total = Math.floor(base * mult * stab * critical * (Math.random() * 0.15 + 0.85));

        // Robustez
        if (defData.sturdy && defMon.hp === defMon.maxHp && total >= defMon.hp) {
            total = defMon.hp - 1;
            log(`💎 <b>Robustez</b> permitió a ${defMon.name} resistir.`);
        }
        return { amount: total, mult: mult };
    };

    // 5. PARCHEAR EXECUTE MOVE
    const originalExecuteMoveAbil = window.executeMove;
    window.executeMove = async function(attacker, defender, move, isPlayer) {
        if(!attacker || !defender) return;
        const atkData = ABILITIES_DATA[attacker.ability] || {};
        
        if (move && move.effect && atkData.effectChanceMult) {
            move.chance = (move.chance || 0.1) * atkData.effectChanceMult;
        }

        await originalExecuteMoveAbil(attacker, defender, move, isPlayer);
        
        if (move && move.effect && atkData.effectChanceMult) move.chance /= atkData.effectChanceMult; 

        if (!move || defender.hp <= 0) return;

        // Vampirismo
        if (atkData.drain) {
            const drainAmt = Math.floor(attacker.maxHp * 0.1);
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + drainAmt);
            if(window.renderAll) window.renderAll(); 
        }

        // Contacto
        const defData = ABILITIES_DATA[defender.ability] || {};
        if (move.cat === 'Fis' && defData.onContact) {
            defData.onContact(attacker);
            if(window.renderAll) window.renderAll();
        }
        
        // Autoestima
        if (defender.hp <= 0 && atkData.onKill) atkData.onKill(attacker);
    };

    // 6. STATUS DAMAGE
    const originalRunStatusDamageAbil = window.runStatusDamage;
    window.runStatusDamage = async function(mon, isPlayer) {
        if (!mon || mon.hp <= 0) return;
        const data = ABILITIES_DATA[mon.ability] || {};

        if (data.noIndirectDmg && (mon.status === 'BRN' || mon.status === 'PSN')) {
            log(`✨ <b>Muro Mágico</b> protege a ${mon.name} del daño de ${mon.status}.`);
        } else {
            await originalRunStatusDamageAbil(mon, isPlayer);
        }
        if (data.onTurnEnd) data.onTurnEnd(mon);
    };
}

// Helpers locales
function triggerEntry(user, target) {
    if (!user || !user.ability) return;
    const data = ABILITIES_DATA[user.ability];
    if (data.onEntry) data.onEntry(user, target);
}
function damagePercent(mon, pct) {
    const dmg = Math.floor(mon.maxHp * pct);
    mon.hp = Math.max(0, mon.hp - dmg);
}
function tryStatus(mon, status, chance) {
    if (mon.status) return;
    const data = ABILITIES_DATA[mon.ability] || {};
    if (data.statusImmune === status) return;
    if (Math.random() < chance) {
        mon.status = status;
        log(`⚠️ ¡${mon.name} fue afectado por ${status} al contacto!`);
    }
}