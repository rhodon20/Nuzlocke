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
            margin-left: 10px;
        }
        #info-modal {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 2000;
            display: none; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        }
        #info-content {
            background: #111938; border: 2px solid #00c6d7;
            width: 95%; max-width: 500px; max-height: 90vh;
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
            grid-template-columns: 1.2fr 1fr 1fr 1fr; /* Nombres | Base | Hab | Final */
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
        .close-info {
            position: absolute; top: 10px; right: 10px;
            background: transparent; border: none; color: #ff6b6b;
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
            btn.onclick = toggleInfoModal;
            teamBar.appendChild(btn);
        }
        createInfoModal();
    });

    // 3. LOGICA MODAL
    let isInfoOpen = false;

    function createInfoModal() {
        const div = document.createElement('div');
        div.id = 'info-modal';
        div.innerHTML = `
            <div id="info-content">
                <button class="close-info" onclick="toggleInfoModal()">×</button>
                <h2 class="info-header">Análisis de Combate</h2>
                <div id="info-dynamic-data"></div>
            </div>
        `;
        document.body.appendChild(div);
    }

    window.toggleInfoModal = function() {
        const modal = document.getElementById('info-modal');
        isInfoOpen = !isInfoOpen;
        modal.style.display = isInfoOpen ? 'flex' : 'none';
        if (isInfoOpen) updateInfoData();
    };

    // 4. ACTUALIZACIÓN DE DATOS
    function updateInfoData() {
        if (!isInfoOpen) return;
        
        let pMon, oMon;
        // Detección de entorno (PvP o Normal)
        if (typeof pvpState !== 'undefined' && pvpState.active) {
            const phase = pvpState.turnPhase;
            if (phase === 0 || phase === 2) { 
                pMon = pvpState.p1.team[pvpState.p1.activeIdx];
                oMon = pvpState.p2.team[pvpState.p2.activeIdx];
            } else { 
                pMon = pvpState.p2.team[pvpState.p2.activeIdx];
                oMon = pvpState.p1.team[pvpState.p1.activeIdx];
            }
        } else {
            if (!state || !state.team || !opponent) return;
            pMon = state.team[state.activeIdx];
            oMon = opponent;
        }

        if (!pMon || !oMon) return;

        const container = document.getElementById('info-dynamic-data');
        container.innerHTML = `
            ${renderMonTable(oMon, "Rival")}
            <div style="text-align:center; font-size:1.2rem; margin:10px 0; opacity:0.5;">⚔️ VS ⚔️</div>
            ${renderMonTable(pMon, "Tu Pokémon")}
        `;
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
            const finalVal = mon.getStat(s.id);

            // 3. Calcular influencia de Etapas (Swords Dance, etc)
            const stage = mon.stages[s.id] || 0;
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

    // 5. AUTO-UPDATE
    const originalRenderAllInfo = window.renderAll;
    window.renderAll = function() {
        if (originalRenderAllInfo) originalRenderAllInfo();
        if (isInfoOpen) updateInfoData();
    };
    
    const originalRenderPvPInfo = window.renderPvP;
    if (originalRenderPvPInfo) {
        window.renderPvP = function() {
            originalRenderPvPInfo();
            if (isInfoOpen) updateInfoData();
        };
    }

})();