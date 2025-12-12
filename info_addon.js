/* =========================================================
   INFO ADDON - STATS & ABILITY VIEWER
   Description: Muestra stats detallados y explicación de habilidades.
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
            width: 90%; max-width: 400px; max-height: 80vh;
            border-radius: 12px; padding: 15px;
            overflow-y: auto; color: #e8ecff;
            box-shadow: 0 0 20px rgba(0,198,215,0.3);
            position: relative;
        }
        .info-header {
            text-align: center; margin-bottom: 15px;
            border-bottom: 1px solid #333; padding-bottom: 10px;
        }
        .info-section {
            background: rgba(0,0,0,0.3); padding: 10px;
            border-radius: 8px; margin-bottom: 10px;
        }
        .info-section h4 { margin: 0 0 5px 0; color: #ffd54a; font-size: 0.9rem; }
        .stat-row {
            display: flex; justify-content: space-between; font-size: 0.8rem;
            padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .stat-val { font-family: monospace; font-size: 0.9rem; }
        .buff-pos { color: #4caf50; }
        .buff-neg { color: #f44336; }
        .ability-desc { font-style: italic; font-size: 0.8rem; color: #aaa; margin-top: 2px; }
        .close-info {
            position: absolute; top: 10px; right: 10px;
            background: transparent; border: none; color: #ff6b6b;
            font-size: 1.5rem; cursor: pointer;
        }
    `;
    document.head.appendChild(style);

    // 2. INYECTAR BOTÓN EN LA UI
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

    // 3. LOGICA DE LA VENTANA
    let isInfoOpen = false;

    function createInfoModal() {
        const div = document.createElement('div');
        div.id = 'info-modal';
        div.innerHTML = `
            <div id="info-content">
                <button class="close-info" onclick="toggleInfoModal()">×</button>
                <h2 class="info-header">Datos de Combate</h2>
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
        
        // Obtener referencias seguras (Funciona en Single y PvP)
        let pMon, oMon;
        
        // Detección de modo (PvP o Normal)
        if (typeof pvpState !== 'undefined' && pvpState.active) {
            const phase = pvpState.turnPhase;
            // En PvP mostramos según perspectiva del turno
            if (phase === 0 || phase === 2) { // Turno P1 o Ejecución
                pMon = pvpState.p1.team[pvpState.p1.activeIdx];
                oMon = pvpState.p2.team[pvpState.p2.activeIdx];
            } else { // Turno P2
                pMon = pvpState.p2.team[pvpState.p2.activeIdx];
                oMon = pvpState.p1.team[pvpState.p1.activeIdx];
            }
        } else {
            // Modo Normal/Nuzlocke
            if (!state || !state.team || !opponent) return;
            pMon = state.team[state.activeIdx];
            oMon = opponent;
        }

        if (!pMon || !oMon) return;

        const container = document.getElementById('info-dynamic-data');
        container.innerHTML = `
            ${renderMonInfo(oMon, "Rival")}
            <div style="text-align:center; font-size:1.5rem; margin:5px 0;">🆚</div>
            ${renderMonInfo(pMon, "Tu Pokémon")}
        `;
    }

    function renderMonInfo(mon, title) {
        // Datos de Habilidad
        const abilName = mon.ability || "Ninguna";
        let abilDesc = "Sin efecto.";
        if (typeof ABILITIES_DATA !== 'undefined' && mon.ability && ABILITIES_DATA[mon.ability]) {
            abilDesc = ABILITIES_DATA[mon.ability].desc;
        }

        // Datos de Stats (Calculando modificadores)
        const stats = [
            { id: 'atk', name: 'Ataque' },
            { id: 'def', name: 'Defensa' },
            { id: 'spa', name: 'At. Esp' },
            { id: 'spd', name: 'Def. Esp' },
            { id: 'spe', name: 'Velocid' }
        ];

        const statsHTML = stats.map(s => {
            const stage = mon.stages[s.id] || 0;
            const currentVal = mon.getStat(s.id); // Valor final calculado
            
            let stageStr = "";
            let classStr = "";
            
            if (stage > 0) {
                stageStr = `(+${stage})`;
                classStr = "buff-pos";
            } else if (stage < 0) {
                stageStr = `(${stage})`;
                classStr = "buff-neg";
            }

            return `
                <div class="stat-row">
                    <span>${s.name}</span>
                    <span class="stat-val ${classStr}">${currentVal} ${stageStr}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="info-section">
                <h4>${title}: ${mon.name} (Nv ${mon.level})</h4>
                <div style="margin-bottom:8px;">
                    <div style="font-weight:bold; color:#00c6d7;">Hb: ${abilName}</div>
                    <div class="ability-desc">${abilDesc}</div>
                </div>
                <div style="background:rgba(0,0,0,0.2); padding:5px; border-radius:4px;">
                    ${statsHTML}
                </div>
            </div>
        `;
    }

    // 5. MONKEY PATCH - ENGANCHARSE AL RENDER
    // Esto asegura que si la ventana está abierta y cambia algo, se actualiza sola.
    const originalRenderAllInfo = window.renderAll;
    window.renderAll = function() {
        if (originalRenderAllInfo) originalRenderAllInfo(); // Llamar original
        if (isInfoOpen) updateInfoData(); // Actualizar ventana si está abierta
    };
    
    // Enganche extra para modo PvP manual (si usas pvp_addon.js)
    const originalRenderPvPInfo = window.renderPvP;
    if (originalRenderPvPInfo) {
        window.renderPvP = function() {
            originalRenderPvPInfo();
            if (isInfoOpen) updateInfoData();
        };
    }

})();