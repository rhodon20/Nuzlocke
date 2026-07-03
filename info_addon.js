/* =========================================================
   INFO ADDON - STATS & ABILITY VIEWER (Advanced Table Layout)
   Description: Muestra stats detallados en 4 columnas.
========================================================= */

(function() {
    // 1. INYECTAR ESTILOS CSS
    const style = document.createElement('style');
    style.innerHTML = `
        #btn-info {
            background: #673ab7; color: white; border: none;
            width: 30px; height: 30px; border-radius: 50%;
            font-weight: bold; cursor: pointer; display: flex;
            align-items: center; justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.5);
            margin-left: 4px;
        }
        #info-modal {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 2000;
            display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        }
        #info-content {
            background: #111938; border: 2px solid #00c6d7;
            width: min(500px, calc(100vw - 20px)); min-width: 0; max-height: 90vh;
            border-radius: 12px; padding: 15px;
            overflow-y: auto; color: #e8ecff;
            box-shadow: 0 0 20px rgba(0,198,215,0.3);
            position: relative;
        }
        .info-header {
            text-align: center; margin-bottom: 10px;
            border-bottom: 1px solid #333; padding-bottom: 5px;
        }
        .info-section {
            background: rgba(0,0,0,0.3); padding: 10px;
            border-radius: 8px; margin-bottom: 15px;
        }
        .info-section h4 { margin: 0 0 5px 0; color: #ffd54a; font-size: 1rem; }
        
        /* GRID SYSTEM */
        .stat-grid {
            display: grid;
            grid-template-columns: minmax(70px,1.2fr) repeat(3,minmax(42px,1fr)); /* Nombres | Base | Hab | Final */
            min-width: 0;
            gap: 5px;
            font-size: 0.8rem;
            margin-top: 10px;
        }
        .grid-head {
            font-weight: bold; color: #00c6d7;
            text-align: center; border-bottom: 1px solid #444;
            padding-bottom: 4px; margin-bottom: 4px;
        }
        .stat-name { text-align: left; font-weight: bold; color: #ccc; padding-left: 5px; }
        .stat-num { text-align: center; font-family: monospace; font-size: 0.95rem; }
        
        /* COLORS */
        .val-plus { color: #4caf50; }
        .val-minus { color: #f44336; }
        .val-neutral { color: #555; }
        .final-stage-pos { color: #81c784; font-weight:bold; }
        .final-stage-neg { color: #e57373; font-weight:bold; }
        
        .ability-desc { font-style: italic; font-size: 0.8rem; color: #aaa; margin-top: 2px; margin-bottom: 8px; }
        .environment-grid { display:grid; gap:7px; margin-top:8px; }
        .environment-item { background:rgba(255,255,255,.045); border-left:3px solid #00c6d7; border-radius:5px; padding:7px 8px; }
        .environment-item strong { display:block; color:#e8ecff; font-size:.84rem; margin-bottom:2px; }
        .environment-item span { color:#b6bfdc; font-size:.76rem; line-height:1.35; }
        .environment-empty { color:#7f89aa; font-size:.78rem; }
        .close-info {
            position: absolute; top: 10px; right: 10px;
            background: transparent; border: none; color: #ff6b6b;
            width:36px; height:36px; padding:0; border-radius:50%;
            font-size: 1.5rem; cursor: pointer;
        }
    `;
    document.head.appendChild(style);

    // 2. INYECTAR BOTÓN
    window.addEventListener('load', () => {
        const teamBar = document.getElementById('team-bar');
        if (teamBar) {
            const btn = document.createElement('button');
            btn.id = 'btn-info';
            btn.innerHTML = 'ℹ️';
            btn.title = 'Ver estadísticas y entorno de combate';
            btn.setAttribute('aria-label', 'Abrir análisis de combate');
            btn.onclick = toggleInfoModal;
            teamBar.appendChild(btn);
        }
        createInfoModal();
    });

    // 3. LOGICA MODAL
    let isInfoOpen = false;
    let previousFocus = null;

    function createInfoModal() {
        const div = document.createElement('div');
        div.id = 'info-modal';
        div.innerHTML = `
            <div id="info-content" role="dialog" aria-modal="true" aria-labelledby="info-title">
                <button class="close-info" onclick="toggleInfoModal()" aria-label="Cerrar análisis">×</button>
                <h2 class="info-header" id="info-title">Análisis de Combate</h2>
                <div id="info-dynamic-data"></div>
            </div>
        `;
        document.body.appendChild(div);
        div.addEventListener('click', event => {
            if (event.target === div) toggleInfoModal();
        });
    }

    window.toggleInfoModal = function() {
        const modal = document.getElementById('info-modal');
        isInfoOpen = !isInfoOpen;
        modal.style.display = isInfoOpen ? 'flex' : 'none';
        if (isInfoOpen) {
            previousFocus = document.activeElement;
            updateInfoData();
            modal.querySelector('.close-info')?.focus();
        } else if (previousFocus && typeof previousFocus.focus === 'function') {
            previousFocus.focus();
        }
    };

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isInfoOpen) toggleInfoModal();
    });

    // 4. ACTUALIZACIÓN DE DATOS
    function updateInfoData() {
        if (!isInfoOpen) return;
        
        let pMon, oMon, localIsP1 = true;
        // Detección de entorno (PvP o Normal)
        if (typeof pvpState !== 'undefined' && pvpState.active) {
            if (pvpState.mode === 'online') {
                const localSide = pvpState.online && pvpState.online.localSide === 2 ? 2 : 1;
                localIsP1 = localSide === 1;
                const local = localSide === 2 ? pvpState.p2 : pvpState.p1;
                const remote = localSide === 2 ? pvpState.p1 : pvpState.p2;
                pMon = local.team[local.activeIdx];
                oMon = remote.team[remote.activeIdx];
            } else {
            const phase = pvpState.turnPhase;
            localIsP1 = phase === 0 || phase === 2;
            if (phase === 0 || phase === 2) { 
                pMon = pvpState.p1.team[pvpState.p1.activeIdx];
                oMon = pvpState.p2.team[pvpState.p2.activeIdx];
            } else { 
                pMon = pvpState.p2.team[pvpState.p2.activeIdx];
                oMon = pvpState.p1.team[pvpState.p1.activeIdx];
            }
            }
        } else {
            if (!state || !state.team || !opponent) return;
            pMon = state.team[state.activeIdx];
            oMon = opponent;
        }

        if (!pMon || !oMon) return;

        const container = document.getElementById('info-dynamic-data');
        container.innerHTML = `
            ${renderEnvironmentSection(localIsP1)}
            ${renderMonTable(oMon, "Rival")}
            <div style="text-align:center; font-size:1.2rem; margin:10px 0; opacity:0.5;">⚔️ VS ⚔️</div>
            ${renderMonTable(pMon, "Tu Pokémon")}
        `;
    }

    function describeSideField(side) {
        const effects = [];
        if ((side?.reflectTurns || 0) > 0) effects.push(`Reflejo (${side.reflectTurns}): reduce un 50% el daño físico recibido.`);
        if ((side?.lightScreenTurns || 0) > 0) effects.push(`Pantalla Luz (${side.lightScreenTurns}): reduce un 50% el daño especial recibido.`);
        if ((side?.spikesLayers || 0) > 0) effects.push(`Púas ×${side.spikesLayers}: dañan al entrar a Pokémon que no sean Volador.`);
        if ((side?.toxicSpikesLayers || 0) > 0) effects.push(`Púas Tóxicas ×${side.toxicSpikesLayers}: envenenan al entrar a Pokémon en tierra.`);
        if (side?.stealthRock) effects.push('Trampa Rocas: causa daño de tipo Roca al entrar.');
        return effects;
    }

    function renderEnvironmentSection(localIsP1) {
        if (typeof battleField === 'undefined') return '';
        const items = [];
        const event = battleField.runEvent;
        if (event) items.push({ title: `Evento · ${event.label}`, desc: event.desc || 'Modificador activo durante este combate.' });

        const weather = battleField.weather || {};
        const weatherDescriptions = {
            RAIN: 'Lluvia: Agua causa ×1,5 de daño y Fuego ×0,5.',
            SUN: 'Sol: Fuego causa ×1,5 de daño y Agua ×0,5.',
            SAND: 'Tormenta de arena: resta 1/16 de PS máximos por turno, salvo a Roca, Tierra y Acero.',
            HAIL: 'Granizo: resta 1/16 de PS máximos por turno, salvo a Pokémon de Hielo.'
        };
        if (weather.type && weather.turns > 0) {
            items.push({ title: `Clima · ${weather.turns} turnos`, desc: weatherDescriptions[weather.type] || weather.type });
        }

        const mySide = localIsP1 ? battleField.player : battleField.opponent;
        const rivalSide = localIsP1 ? battleField.opponent : battleField.player;
        describeSideField(mySide).forEach(desc => items.push({ title: 'Tu campo', desc }));
        describeSideField(rivalSide).forEach(desc => items.push({ title: 'Campo rival', desc }));
        const content = items.length
            ? items.map(item => `<div class="environment-item"><strong>${item.title}</strong><span>${item.desc}</span></div>`).join('')
            : '<div class="environment-empty">No hay modificadores ambientales activos.</div>';
        return `<div class="info-section"><h4>Entorno de combate</h4><div class="environment-grid">${content}</div></div>`;
    }

    function renderMonTable(mon, title) {
        const abilName = mon.ability || "Ninguna";
        let abilDesc = "Sin efecto.";
        if (typeof ABILITIES_DATA !== 'undefined' && mon.ability && ABILITIES_DATA[mon.ability]) {
            abilDesc = ABILITIES_DATA[mon.ability].desc;
        }

        const stats = [
            { id: 'atk', label: 'Ataque' },
            { id: 'def', label: 'Defensa' },
            { id: 'spa', label: 'At. Esp' },
            { id: 'spd', label: 'Def. Esp' },
            { id: 'spe', label: 'Velocid' }
        ];

        let rowsHTML = '';

        stats.forEach(s => {
            // 1. Valor Base (Raw Stat del nivel actual)
            const baseVal = mon[s.id]; 

            // 2. Valor Final (Calculado por abilities.js -> getStat, incluye Todo)
            let finalVal = typeof mon.getStat === 'function' ? mon.getStat(s.id) : null;

            // 3. Calcular influencia de Etapas (Swords Dance, etc)
            const stage = mon.stages?.[s.id] || 0;
            let stageMult = 1;
            if (stage >= 0) stageMult = (2 + stage) / 2;
            else stageMult = 2 / (2 + Math.abs(stage));

            // Calculamos cuánto sería el stat SIN habilidad pero CON etapas
            // Nota: getStat original aplica Stages. Parálisis aplica 0.5 a velocidad en originalGetStat.
            let standardVal = Math.floor(baseVal * stageMult);
            
            // Corrección manual de Parálisis para aislar la habilidad correctamente
            if (s.id === 'spe' && mon.status === 'PAR') {
                standardVal = Math.floor(standardVal * 0.5);
            }
            if (!Number.isFinite(finalVal)) finalVal = standardVal;

            // 4. Valor Añadido por Habilidad (Diferencia)
            const abilityDiff = finalVal - standardVal;

            // Formateo Visual
            let diffStr = "-";
            let diffClass = "val-neutral";
            if (abilityDiff > 0) {
                diffStr = `+${abilityDiff}`;
                diffClass = "val-plus";
            } else if (abilityDiff < 0) {
                diffStr = `${abilityDiff}`;
                diffClass = "val-minus";
            }

            // Indicador de Etapa en el valor final
            let stageIndicator = "";
            let finalClass = "";
            if (stage > 0) {
                stageIndicator = `<sup style="color:#81c784">^+${stage}</sup>`;
                finalClass = "final-stage-pos";
            } else if (stage < 0) {
                stageIndicator = `<sup style="color:#e57373">^${stage}</sup>`;
                finalClass = "final-stage-neg";
            }

            rowsHTML += `
                <div class="stat-name">${s.label}</div>
                <div class="stat-num" style="color:#aaa;">${baseVal}</div>
                <div class="stat-num ${diffClass}">${diffStr}</div>
                <div class="stat-num ${finalClass}">${finalVal}${stageIndicator}</div>
            `;
        });

        return `
            <div class="info-section">
                <h4>${title}: ${mon.name} <span style="font-size:0.8em; color:#999;">(Nv ${mon.level})</span></h4>
                <div>
                    <span style="color:#00c6d7; font-weight:bold;">Hb: ${abilName}</span>
                    <div class="ability-desc">${abilDesc}</div>
                </div>
                
                <div class="stat-grid">
                    <div class="grid-head" style="text-align:left; padding-left:5px;">Stat</div>
                    <div class="grid-head">Base</div>
                    <div class="grid-head">Hab</div>
                    <div class="grid-head">Final</div>
                    
                    ${rowsHTML}
                </div>
            </div>
        `;
    }

    // 5. AUTO-UPDATE VIA PLUGIN HOOK
    if (typeof window.registerGamePlugin === 'function') {
        window.registerGamePlugin({
            name: 'info-overlay',
            hooks: {
                afterRender() {
                    if (isInfoOpen) updateInfoData();
                }
            }
        });
    }

})();
