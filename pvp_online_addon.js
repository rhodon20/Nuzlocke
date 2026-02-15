(function initOnlinePvPAddon() {
  const STUN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
  ];

  const onlinePvp = {
    active: false,
    role: null,
    pc: null,
    dc: null,
    localMove: null,
    remoteMove: null,
    waitingAnswer: false,
    connected: false,
    matchStarted: false,
    scanStream: null,
    scanActive: false,
    channelOpenTimeoutId: null
  };

  function encodeSignal(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }

  function decodeSignal(text) {
    return JSON.parse(decodeURIComponent(escape(atob((text || '').trim()))));
  }

  function buildQrUrl(text) {
    const payload = encodeURIComponent(text || '');
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${payload}`;
  }

  function hasQrScanSupport() {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  function hasBarcodeDetectorSupport() {
    return typeof BarcodeDetector !== 'undefined';
  }

  async function ensureJsQrLoaded() {
    if (typeof window === 'undefined') return false;
    if (typeof window.jsQR === 'function') return true;
    await new Promise((resolve, reject) => {
      const existing = document.getElementById('jsqr-lib');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('jsQR load error')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.id = 'jsqr-lib';
      s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('jsQR load error'));
      document.head.appendChild(s);
    });
    return typeof window.jsQR === 'function';
  }

  function isWebRtcAvailable() {
    return typeof RTCPeerConnection !== 'undefined';
  }

  function ensureOverlay() {
    let overlay = document.getElementById('online-pvp-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'online-pvp-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '1500';
    overlay.style.display = 'none';
    overlay.style.background = 'rgba(11,16,32,0.98)';
    overlay.innerHTML = `
      <h3 class="modal-title">PvP Online (Beta)</h3>
      <div id="online-pvp-body" style="display:grid; gap:8px;"></div>
      <button class="btn-action" onclick="closeOnlinePvPOverlay()">Cerrar</button>
    `;
    const container = document.getElementById('game-container');
    if (container) container.appendChild(overlay);
    return overlay;
  }

  function setLobbyMessage(html) {
    const body = document.getElementById('online-pvp-body');
    if (body) body.innerHTML = html;
  }

  function renderLobbyHome() {
    setLobbyMessage(`
      <button class="btn-action" onclick="onlinePvPHost()">Crear partida (Host)</button>
      <button class="btn-action" onclick="onlinePvPJoinPrompt()">Unirse (Guest)</button>
      <div style="font-size:.75rem; color:#9aa3c7; line-height:1.35;">
        Flujo: Host crea codigo oferta -> Guest responde con codigo respuesta -> Host pega respuesta.
      </div>
    `);
  }

  function showTextStep(title, textareaId, value, actionLabel, actionFnName, extraHtml = '', opts = {}) {
    const body = document.getElementById('online-pvp-body');
    if (!body) return;
    const showQr = !!opts.showQr && !!value;
    const scanBtn = opts.scanActionFn
      ? `<button class="btn-action" onclick="${opts.scanActionFn}()">${opts.scanLabel || 'Escanear QR'}</button>`
      : '';
    const scanWarn = opts.scanActionFn && !hasQrScanSupport()
      ? `<div style="font-size:.72rem; color:#ffb74d;">Escaneo QR no disponible (sin acceso a camara).</div>`
      : '';

    body.innerHTML = `
      <div style="font-size:.8rem; color:#ffd54a; font-weight:800;">${title}</div>
      <textarea id="${textareaId}" style="width:100%; min-height:120px; resize:vertical; background:#0f1631; color:#e8ecff; border:1px solid rgba(255,255,255,.2); border-radius:8px; padding:8px;">${value || ''}</textarea>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        <button class="btn-action" onclick="copyOnlineSignal('${textareaId}')">Copiar</button>
        <button class="btn-action" onclick="${actionFnName}()">${actionLabel}</button>
      </div>
      ${scanBtn}
      ${scanWarn}
      ${showQr ? `<div style="display:flex; justify-content:center; margin-top:4px;"><img alt="QR" src="${buildQrUrl(value)}" style="width:190px; height:190px; border-radius:8px; border:1px solid rgba(255,255,255,.25); background:#fff;"></div>` : ''}
      ${extraHtml}
    `;
  }

  function clearChannelTimeout() {
    if (onlinePvp.channelOpenTimeoutId) {
      clearTimeout(onlinePvp.channelOpenTimeoutId);
      onlinePvp.channelOpenTimeoutId = null;
    }
  }

  function armChannelOpenTimeout(roleLabel) {
    clearChannelTimeout();
    onlinePvp.channelOpenTimeoutId = setTimeout(() => {
      if (onlinePvp.connected) return;
      setLobbyMessage(`
        <div style="font-size:.82rem; color:#ff8a80; font-weight:700;">No se pudo abrir el canal a tiempo.</div>
        <div style="font-size:.74rem; color:#9aa3c7; line-height:1.35;">
          Rol: ${roleLabel}. Repite offer/answer. En redes moviles estrictas puede fallar NAT traversal.
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <button class="btn-action" onclick="onlinePvPRestart()">Reiniciar flujo</button>
          <button class="btn-action" onclick="closeOnlinePvPOverlay()">Cerrar</button>
        </div>
      `);
    }, 90000);
  }

  function setStatusText(text) {
    if (typeof pvpState !== 'undefined' && pvpState?.online) {
      pvpState.online.statusText = text;
      if (typeof renderPvP === 'function') renderPvP();
    }
  }

  function stopQrScan() {
    onlinePvp.scanActive = false;
    if (onlinePvp.scanStream) {
      try { onlinePvp.scanStream.getTracks().forEach(t => t.stop()); } catch {}
    }
    onlinePvp.scanStream = null;
    const box = document.getElementById('online-qr-scan-box');
    if (box) box.remove();
  }

  async function startQrScanInto(textareaId) {
    if (!hasQrScanSupport()) {
      alert('Escaneo QR no disponible: no hay acceso a camara.');
      return;
    }
    stopQrScan();
    const body = document.getElementById('online-pvp-body');
    if (!body) return;

    const box = document.createElement('div');
    box.id = 'online-qr-scan-box';
    box.style.display = 'grid';
    box.style.gap = '6px';
    box.innerHTML = `
      <video id="online-qr-video" autoplay playsinline style="width:100%; max-height:220px; border-radius:8px; border:1px solid rgba(255,255,255,.2); background:#000;"></video>
      <button class="btn-action" onclick="onlinePvPStopScan()">Detener escaneo</button>
    `;
    body.appendChild(box);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      onlinePvp.scanStream = stream;
      onlinePvp.scanActive = true;
      const video = document.getElementById('online-qr-video');
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      let detector = null;
      if (hasBarcodeDetectorSupport()) {
        detector = new BarcodeDetector({ formats: ['qr_code'] });
      } else {
        await ensureJsQrLoaded();
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const tick = async () => {
        if (!onlinePvp.scanActive) return;
        try {
          if (detector) {
            const codes = await detector.detect(video);
            if (Array.isArray(codes) && codes[0]?.rawValue) {
              const raw = String(codes[0].rawValue || '').trim();
              const target = document.getElementById(textareaId);
              if (target) target.value = raw;
              stopQrScan();
              return;
            }
          } else if (ctx && typeof window.jsQR === 'function' && video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = window.jsQR(frame.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
            if (result && result.data) {
              const raw = String(result.data || '').trim();
              const target = document.getElementById(textareaId);
              if (target) target.value = raw;
              stopQrScan();
              return;
            }
          }
        } catch {}
        setTimeout(tick, 220);
      };
      tick();
    } catch {
      stopQrScan();
      alert('No se pudo abrir la camara para escanear.');
    }
  }

  function resetOnlineState() {
    onlinePvp.active = false;
    onlinePvp.role = null;
    onlinePvp.localMove = null;
    onlinePvp.remoteMove = null;
    onlinePvp.waitingAnswer = false;
    onlinePvp.connected = false;
    onlinePvp.matchStarted = false;
    stopQrScan();
    clearChannelTimeout();
    if (onlinePvp.dc) {
      try { onlinePvp.dc.close(); } catch {}
    }
    if (onlinePvp.pc) {
      try { onlinePvp.pc.close(); } catch {}
    }
    onlinePvp.dc = null;
    onlinePvp.pc = null;
  }

  async function waitIceGatheringComplete(pc) {
    if (!pc) return;
    if (pc.iceGatheringState === 'complete') return;
    await new Promise(resolve => {
      const handler = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', handler);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', handler);
      setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', handler);
        resolve();
      }, 12000);
    });
  }

  function bindPeerDiagnostics(pc) {
    if (!pc) return;
    pc.oniceconnectionstatechange = () => {
      const st = pc.iceConnectionState;
      if (st === 'failed') log('ICE fallo en PvP online.');
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'failed' || st === 'disconnected') {
        log('Conexion PvP online interrumpida.');
      }
    };
  }

  function sendOnline(msg) {
    if (!onlinePvp.dc || onlinePvp.dc.readyState !== 'open') return;
    onlinePvp.dc.send(JSON.stringify(msg));
  }

  function randomOnlineTeam() {
    if (typeof generateRandomTeam === 'function') return generateRandomTeam();
    return [];
  }

  function onDataMessage(ev) {
    let msg = null;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (!msg || !msg.type) return;

    if (msg.type === 'INIT_MATCH') {
      if (onlinePvp.role !== 'guest') return;
      const team1 = Array.isArray(msg.team1) ? msg.team1 : [];
      const team2 = Array.isArray(msg.team2) ? msg.team2 : [];
      startPvPMatch(team1, team2, 'ONLINE', { mode: 'online', onlineLocalSide: 2 });
      pvpState.online.awaitingLocalMove = true;
      pvpState.online.statusText = 'Elige tu movimiento.';
      onlinePvp.matchStarted = true;
      onlinePvp.active = true;
      if (typeof renderPvP === 'function') renderPvP();
      return;
    }

    if (msg.type === 'MOVE') {
      if (onlinePvp.role === 'host') {
        onlinePvp.remoteMove = msg.moveKey;
        tryResolveHostRound();
      }
      return;
    }

    if (msg.type === 'ROUND_STATE') {
      if (onlinePvp.role !== 'guest') return;
      if (typeof importPvPSnapshot === 'function') {
        importPvPSnapshot(msg.snapshot);
      }
      pvpState.online.awaitingLocalMove = true;
      pvpState.online.statusText = 'Elige tu movimiento.';
      onlinePvp.localMove = null;
      onlinePvp.remoteMove = null;
      if (typeof renderPvP === 'function') renderPvP();
      return;
    }

    if (msg.type === 'MATCH_END') {
      const p1Wins = !!msg.p1Wins;
      resetOnlineState();
      if (typeof endPvPGame === 'function') endPvPGame(p1Wins);
      return;
    }
  }

  function wireDataChannel(dc) {
    onlinePvp.dc = dc;
    dc.onopen = () => {
      clearChannelTimeout();
      onlinePvp.connected = true;
      setLobbyMessage('<div style="font-size:.8rem; color:#4caf50;">Conexion establecida. Iniciando partida...</div>');
      if (onlinePvp.role === 'host') {
        const t1 = randomOnlineTeam();
        const t2 = randomOnlineTeam();
        startPvPMatch(t1, t2, 'ONLINE', { mode: 'online', onlineLocalSide: 1 });
        pvpState.online.awaitingLocalMove = true;
        pvpState.online.statusText = 'Elige tu movimiento.';
        onlinePvp.matchStarted = true;
        onlinePvp.active = true;
        sendOnline({ type: 'INIT_MATCH', team1: JSON.parse(JSON.stringify(t1)), team2: JSON.parse(JSON.stringify(t2)) });
      }
      const overlay = ensureOverlay();
      overlay.style.display = 'none';
    };
    dc.onmessage = onDataMessage;
    dc.onclose = () => {
      if (onlinePvp.active && onlinePvp.matchStarted) {
        log('Conexion online cerrada.');
      }
    };
    dc.onerror = () => {
      log('Error en canal PvP online.');
    };
  }

  async function createHostFlow() {
    if (!isWebRtcAvailable()) {
      alert('WebRTC no disponible en este navegador.');
      return;
    }
    resetOnlineState();
    onlinePvp.role = 'host';
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    onlinePvp.pc = pc;
    bindPeerDiagnostics(pc);

    const dc = pc.createDataChannel('poke-online', { ordered: true });
    wireDataChannel(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitIceGatheringComplete(pc);

    const payload = encodeSignal({ type: 'offer', sdp: pc.localDescription });
    showTextStep('Codigo oferta (host)', 'online-offer-text', payload, 'Listo, pegar respuesta', 'onlinePvPApplyAnswer', '', {
      showQr: true,
      scanActionFn: 'onlinePvPScanAnswer',
      scanLabel: 'Escanear respuesta'
    });
    onlinePvp.waitingAnswer = true;
  }

  async function applyAnswerFlow() {
    const el = document.getElementById('online-offer-text');
    if (!el || !onlinePvp.pc) return;
    try {
      const data = decodeSignal(el.value);
      if (data.type !== 'answer' || !data.sdp) throw new Error('Respuesta invalida');
      await onlinePvp.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      setLobbyMessage('<div style="font-size:.8rem; color:#ffd54a;">Respuesta aplicada. Esperando canal (puede tardar unos segundos)...</div>');
      armChannelOpenTimeout('Host');
    } catch {
      alert('No se pudo aplicar la respuesta.');
    }
  }

  async function joinPromptFlow() {
    showTextStep('Pega codigo oferta del host', 'online-join-offer', '', 'Crear respuesta', 'onlinePvPCreateAnswer', '', {
      scanActionFn: 'onlinePvPScanOffer',
      scanLabel: 'Escanear oferta'
    });
  }

  async function createAnswerFlow() {
    if (!isWebRtcAvailable()) {
      alert('WebRTC no disponible en este navegador.');
      return;
    }
    const el = document.getElementById('online-join-offer');
    if (!el) return;

    let offerData;
    try {
      offerData = decodeSignal(el.value);
      if (offerData.type !== 'offer' || !offerData.sdp) throw new Error('Oferta invalida');
    } catch {
      alert('Codigo oferta invalido.');
      return;
    }

    resetOnlineState();
    onlinePvp.role = 'guest';
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    onlinePvp.pc = pc;
    bindPeerDiagnostics(pc);
    pc.ondatachannel = ev => wireDataChannel(ev.channel);

    await pc.setRemoteDescription(new RTCSessionDescription(offerData.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitIceGatheringComplete(pc);

    const payload = encodeSignal({ type: 'answer', sdp: pc.localDescription });
    showTextStep('Codigo respuesta (guest)', 'online-answer-text', payload, 'Esperar inicio', 'onlinePvPWaitStart', '<div style="font-size:.75rem; color:#9aa3c7;">Copia este codigo y envialo al host.</div>', {
      showQr: true
    });
    armChannelOpenTimeout('Guest');
  }

  function waitStartFlow() {
    setLobbyMessage('<div style="font-size:.8rem; color:#ffd54a;">Esperando que el host inicie partida...</div>');
    armChannelOpenTimeout('Guest');
  }

  async function tryResolveHostRound() {
    if (!onlinePvp.active || onlinePvp.role !== 'host') return;
    if (!onlinePvp.localMove || !onlinePvp.remoteMove) return;
    if (typeof pvpState === 'undefined' || !pvpState.active) return;

    pvpState.p1.pendingMove = onlinePvp.localMove;
    pvpState.p2.pendingMove = onlinePvp.remoteMove;
    pvpState.online.awaitingLocalMove = false;
    setStatusText('Resolviendo ronda...');

    await resolvePvPRound();
  }

  function onRoundResolvedHost() {
    if (!onlinePvp.active || onlinePvp.role !== 'host') return;

    const p1Alive = Array.isArray(pvpState.p1.team) && pvpState.p1.team.some(p => p.hp > 0);
    const p2Alive = Array.isArray(pvpState.p2.team) && pvpState.p2.team.some(p => p.hp > 0);
    if (!p1Alive || !p2Alive) {
      sendOnline({ type: 'MATCH_END', p1Wins: !!p1Alive });
      resetOnlineState();
      return;
    }

    const snapshot = (typeof exportPvPSnapshot === 'function') ? exportPvPSnapshot() : null;
    sendOnline({ type: 'ROUND_STATE', snapshot });

    onlinePvp.localMove = null;
    onlinePvp.remoteMove = null;
    pvpState.online.awaitingLocalMove = true;
    setStatusText('Elige tu movimiento.');
  }

  function handleLocalMove(moveKey) {
    if (!onlinePvp.active || !onlinePvp.connected || !onlinePvp.matchStarted) return;
    if (!pvpState?.online?.awaitingLocalMove) return;

    const localSide = pvpState.online.localSide === 2 ? pvpState.p2 : pvpState.p1;
    const mon = localSide.team[localSide.activeIdx];
    if (!mon) return;

    if (typeof getMoveCooldown === 'function' && getMoveCooldown(mon, moveKey) > 0) {
      log('Movimiento en cooldown.');
      return;
    }
    if (typeof isMoveDisabled === 'function' && isMoveDisabled(mon, moveKey)) {
      log('Movimiento anulado.');
      return;
    }

    onlinePvp.localMove = moveKey;
    pvpState.online.awaitingLocalMove = false;
    setStatusText('Esperando rival...');

    if (onlinePvp.role === 'guest') {
      sendOnline({ type: 'MOVE', moveKey });
      return;
    }

    tryResolveHostRound();
  }

  function addButton() {
    const host = document.getElementById('start-buttons');
    if (!host || document.getElementById('btn-pvp-online')) return;
    const btn = document.createElement('button');
    btn.id = 'btn-pvp-online';
    btn.innerText = 'PvP Online (Beta)';
    btn.style.background = 'linear-gradient(135deg, #1e88e5, #0d47a1)';
    btn.style.color = '#fff';
    btn.style.padding = '14px';
    btn.style.fontSize = '1.1rem';
    btn.style.border = 'none';
    btn.onclick = () => {
      const ov = ensureOverlay();
      renderLobbyHome();
      ov.style.display = 'flex';
    };
    host.appendChild(btn);
  }

  window.copyOnlineSignal = function copyOnlineSignal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const txt = el.value || '';
    if (!txt) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).catch(() => {});
    }
  };

  window.closeOnlinePvPOverlay = function closeOnlinePvPOverlay() {
    stopQrScan();
    clearChannelTimeout();
    const ov = ensureOverlay();
    ov.style.display = 'none';
  };

  window.onlinePvPHost = function onlinePvPHost() {
    createHostFlow().catch(() => alert('No se pudo crear la oferta.'));
  };

  window.onlinePvPApplyAnswer = function onlinePvPApplyAnswer() {
    applyAnswerFlow().catch(() => alert('Error aplicando respuesta.'));
  };

  window.onlinePvPJoinPrompt = function onlinePvPJoinPrompt() {
    joinPromptFlow();
  };

  window.onlinePvPCreateAnswer = function onlinePvPCreateAnswer() {
    createAnswerFlow().catch(() => alert('No se pudo crear respuesta.'));
  };

  window.onlinePvPWaitStart = function onlinePvPWaitStart() {
    waitStartFlow();
  };

  window.onlinePvPScanOffer = function onlinePvPScanOffer() {
    startQrScanInto('online-join-offer');
  };

  window.onlinePvPScanAnswer = function onlinePvPScanAnswer() {
    startQrScanInto('online-offer-text');
  };

  window.onlinePvPStopScan = function onlinePvPStopScan() {
    stopQrScan();
  };

  window.onlinePvPRestart = function onlinePvPRestart() {
    resetOnlineState();
    renderLobbyHome();
  };

  window.handleOnlinePvPInput = handleLocalMove;
  window.onOnlinePvPRoundResolved = onRoundResolvedHost;
  window.onOnlinePvPEnd = function onOnlinePvPEnd(p1Wins) {
    if (!onlinePvp.active || onlinePvp.role !== 'host') return;
    sendOnline({ type: 'MATCH_END', p1Wins: !!p1Wins });
    resetOnlineState();
  };

  window.addEventListener('load', () => {
    ensureOverlay();
    addButton();
  });
})();
