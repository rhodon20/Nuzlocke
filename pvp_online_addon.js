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
    channelOpenTimeoutId: null,
    qrChunks: null,
    qrChunkIndex: 0,
    scanChunkSession: null,
    scanDeviceIds: [],
    scanDeviceLabels: [],
    scanDeviceIdx: 0,
    scanCameraOptions: [],
    scanCameraIdx: 0,
    scanTargetTextareaId: null,
    scanSessionId: 0
  };

  function encodeSignal(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }

  function decodeSignal(text) {
    return JSON.parse(decodeURIComponent(escape(atob((text || '').trim()))));
  }

  function buildQrUrl(text) {
    const payload = encodeURIComponent(text || '');
    return `https://api.qrserver.com/v1/create-qr-code/?size=340x340&ecc=M&margin=12&data=${payload}`;
  }

  function buildSignalChunks(rawText, chunkSize = 280) {
    const text = String(rawText || '');
    if (!text) return [];
    if (text.length <= chunkSize) return [text];
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    const chunks = [];
    let idx = 0;
    for (let i = 0; i < text.length; i += chunkSize) {
      idx += 1;
      chunks.push({ idx, data: text.slice(i, i + chunkSize) });
    }
    const total = chunks.length;
    return chunks.map(c => `PVPSEG:${id}:${c.idx}:${total}:${c.data}`);
  }

  function parseSignalChunk(raw) {
    const text = String(raw || '').trim();
    if (!text.startsWith('PVPSEG:')) return null;
    const parts = text.split(':');
    if (parts.length < 5) return null;
    const id = parts[1];
    const idx = Number(parts[2]);
    const total = Number(parts[3]);
    const data = parts.slice(4).join(':');
    if (!id || !Number.isFinite(idx) || !Number.isFinite(total) || !data) return null;
    return { id, idx, total, data };
  }

  function rebuildChunkedSignal(session) {
    if (!session || !session.id || !Number.isFinite(session.total) || !session.parts) return null;
    for (let i = 1; i <= session.total; i++) {
      if (!session.parts[i]) return null;
    }
    let out = '';
    for (let i = 1; i <= session.total; i++) out += session.parts[i];
    return out;
  }

  function renderQrChunkPreview() {
    if (!onlinePvp.qrChunks || !onlinePvp.qrChunks.length) return;
    const idx = Math.max(0, Math.min(onlinePvp.qrChunkIndex || 0, onlinePvp.qrChunks.length - 1));
    const text = onlinePvp.qrChunks[idx];
    const img = document.getElementById('online-qr-img');
    const label = document.getElementById('online-qr-label');
    if (img) img.src = buildQrUrl(text);
    if (label) label.innerText = `QR ${idx + 1}/${onlinePvp.qrChunks.length}`;
    onlinePvp.qrChunkIndex = idx;
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
    const qrChunks = (showQr ? buildSignalChunks(value) : []);
    onlinePvp.qrChunks = qrChunks;
    onlinePvp.qrChunkIndex = 0;
    const qrControls = qrChunks.length > 1 ? `
      <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:6px; align-items:center; margin-top:4px;">
        <button class="btn-action" onclick="onlinePvPQrPrev()">QR anterior</button>
        <div id="online-qr-label" style="font-size:.75rem; color:#ffd54a; text-align:center;">QR 1/${qrChunks.length}</div>
        <button class="btn-action" onclick="onlinePvPQrNext()">QR siguiente</button>
      </div>
      <div style="font-size:.7rem; color:#9aa3c7;">Este codigo es largo; escanea todos los QR en orden.</div>
    ` : '';

    body.innerHTML = `
      <div style="font-size:.8rem; color:#ffd54a; font-weight:800;">${title}</div>
      <textarea id="${textareaId}" style="width:100%; min-height:120px; resize:vertical; background:#0f1631; color:#e8ecff; border:1px solid rgba(255,255,255,.2); border-radius:8px; padding:8px;">${value || ''}</textarea>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        <button class="btn-action" onclick="copyOnlineSignal('${textareaId}')">Copiar</button>
        <button class="btn-action" onclick="pasteOnlineSignal('${textareaId}')">Pegar</button>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        <button class="btn-action" onclick="shareOnlineSignal('${textareaId}')">Compartir</button>
        <button class="btn-action" onclick="downloadOnlineSignal('${textareaId}')">Descargar TXT</button>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        <button class="btn-action" onclick="uploadOnlineSignal('${textareaId}')">Cargar TXT</button>
        <button class="btn-action" onclick="${actionFnName}()">${actionLabel}</button>
      </div>
      ${scanBtn}
      ${scanWarn}
      ${showQr ? `<div style="display:flex; justify-content:center; margin-top:4px;"><img id="online-qr-img" alt="QR" src="${buildQrUrl(qrChunks[0] || '')}" style="width:260px; height:260px; border-radius:8px; border:1px solid rgba(255,255,255,.25); background:#fff;"></div>` : ''}
      ${showQr ? qrControls : ''}
      <div style="font-size:.72rem; color:#9aa3c7;">Si el QR falla, usa Compartir o Copiar/Pegar.</div>
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
    onlinePvp.scanChunkSession = null;
    onlinePvp.scanTargetTextareaId = null;
    onlinePvp.scanSessionId++;
    if (onlinePvp.scanStream) {
      try { onlinePvp.scanStream.getTracks().forEach(t => t.stop()); } catch {}
    }
    onlinePvp.scanStream = null;
    const box = document.getElementById('online-qr-scan-box');
    if (box) box.remove();
  }

  async function getVideoInputDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter(d => d.kind === 'videoinput');
  }

  function chooseInitialCameraIndex(devices) {
    if (!Array.isArray(devices) || devices.length === 0) return 0;
    const label = d => String(d?.label || '').toLowerCase();
    const isBack = d => /(back|rear|trasera|world)/i.test(label(d));
    const isUltra = d => /(ultra|0\.5|wide|uw)/i.test(label(d));

    const preferred = devices.findIndex(d => isBack(d) && !isUltra(d));
    if (preferred >= 0) return preferred;
    const back = devices.findIndex(d => isBack(d));
    if (back >= 0) return back;
    return 0;
  }

  function buildScanCameraOptions(devices) {
    const out = [];
    out.push({ key: 'rear_ideal', label: 'Trasera (ideal)', constraints: { facingMode: { ideal: 'environment' } } });
    out.push({ key: 'rear_exact', label: 'Trasera (exacta)', constraints: { facingMode: { exact: 'environment' } } });
    out.push({ key: 'front_ideal', label: 'Frontal (ideal)', constraints: { facingMode: { ideal: 'user' } } });

    if (Array.isArray(devices) && devices.length) {
      devices.forEach((d, i) => {
        const name = (d.label || '').trim() || `Camara ${i + 1}`;
        out.push({ key: `dev_${d.deviceId}`, label: `Dispositivo: ${name}`, constraints: { deviceId: { exact: d.deviceId } } });
      });
    }
    return out;
  }

  function chooseInitialCameraOptionIndex(options) {
    if (!Array.isArray(options) || !options.length) return 0;
    const devStart = options.findIndex(o => String(o.key || '').startsWith('dev_'));
    if (devStart < 0) return 0;
    const devOptions = options.slice(devStart);
    const fakeDevices = devOptions.map(o => ({ label: o.label, deviceId: o.key.replace(/^dev_/, '') }));
    const pref = chooseInitialCameraIndex(fakeDevices);
    return Math.max(0, devStart + pref);
  }

  function refreshScanCameraSelector() {
    const select = document.getElementById('online-qr-camera-select');
    if (!select) return;
    select.innerHTML = '';
    (onlinePvp.scanCameraOptions || []).forEach((opt, idx) => {
      const op = document.createElement('option');
      op.value = String(idx);
      op.textContent = opt.label;
      select.appendChild(op);
    });
    const idx = Math.max(0, Math.min(onlinePvp.scanCameraIdx || 0, Math.max(0, (onlinePvp.scanCameraOptions || []).length - 1)));
    select.value = String(idx);
  }

  function getSelectedCameraConstraints() {
    const options = onlinePvp.scanCameraOptions || [];
    if (!options.length) return { facingMode: { ideal: 'environment' } };
    const idx = Math.max(0, Math.min(onlinePvp.scanCameraIdx || 0, options.length - 1));
    const option = options[idx];
    return option?.constraints || { facingMode: { ideal: 'environment' } };
  }

  async function startQrScanInto(textareaId) {
    if (!hasQrScanSupport()) {
      alert('Escaneo QR no disponible: no hay acceso a camara.');
      return;
    }
    if (!onlinePvp.scanActive) stopQrScan();
    onlinePvp.scanTargetTextareaId = textareaId;
    const sessionId = ++onlinePvp.scanSessionId;
    const body = document.getElementById('online-pvp-body');
    if (!body) return;

    let box = document.getElementById('online-qr-scan-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'online-qr-scan-box';
      box.style.display = 'grid';
      box.style.gap = '6px';
      box.innerHTML = `
        <video id="online-qr-video" autoplay playsinline style="width:100%; max-height:220px; border-radius:8px; border:1px solid rgba(255,255,255,.2); background:#000;"></video>
        <div id="online-qr-scan-status" style="font-size:.74rem; color:#9aa3c7;">Apunta al QR. Buscando...</div>
        <div style="display:grid; grid-template-columns:1fr auto; gap:6px;">
          <select id="online-qr-camera-select" style="background:#0f1631; color:#e8ecff; border:1px solid rgba(255,255,255,.2); border-radius:8px; padding:8px;"></select>
          <button class="btn-action" onclick="onlinePvPApplyCameraSelection()">Aplicar</button>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <button class="btn-action" onclick="onlinePvPSwitchCamera()">Siguiente camara</button>
          <button class="btn-action" onclick="onlinePvPStopScan()">Detener escaneo</button>
        </div>
      `;
      body.appendChild(box);
    }

    try {
      const devices = await getVideoInputDevices();
      const prevKey = (onlinePvp.scanCameraOptions[onlinePvp.scanCameraIdx] || {}).key || null;
      onlinePvp.scanCameraOptions = buildScanCameraOptions(devices);
      let nextIdx = onlinePvp.scanCameraOptions.findIndex(o => o.key === prevKey);
      if (nextIdx < 0) nextIdx = chooseInitialCameraOptionIndex(onlinePvp.scanCameraOptions);
      onlinePvp.scanCameraIdx = Math.max(0, nextIdx);
      refreshScanCameraSelector();
      const constraints = { video: getSelectedCameraConstraints(), audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      onlinePvp.scanStream = stream;
      onlinePvp.scanActive = true;
      const video = document.getElementById('online-qr-video');
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      try {
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities ? track.getCapabilities() : null;
        if (caps && Number.isFinite(caps.maxZoom) && caps.maxZoom > 1) {
          const preferredZoom = Math.min(2, caps.maxZoom);
          await track.applyConstraints({ advanced: [{ zoom: preferredZoom }] });
        }
      } catch {}

      let detector = null;
      if (hasBarcodeDetectorSupport()) {
        detector = new BarcodeDetector({ formats: ['qr_code'] });
      }
      await ensureJsQrLoaded().catch(() => false);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const statusEl = document.getElementById('online-qr-scan-status');
      let loops = 0;
      const consumeRaw = rawText => {
        const raw = String(rawText || '').trim();
        if (!raw) return false;
        const parsed = parseSignalChunk(raw);
        const target = document.getElementById(textareaId);
        if (parsed) {
          if (!onlinePvp.scanChunkSession || onlinePvp.scanChunkSession.id !== parsed.id || onlinePvp.scanChunkSession.total !== parsed.total) {
            onlinePvp.scanChunkSession = { id: parsed.id, total: parsed.total, parts: {} };
          }
          onlinePvp.scanChunkSession.parts[parsed.idx] = parsed.data;
          if (statusEl) {
            const count = Object.keys(onlinePvp.scanChunkSession.parts).length;
            statusEl.innerText = `QR capturado ${count}/${onlinePvp.scanChunkSession.total}. Sigue escaneando...`;
          }
          const assembled = rebuildChunkedSignal(onlinePvp.scanChunkSession);
          if (assembled) {
            if (target) target.value = assembled;
            if (statusEl) statusEl.innerText = 'Codigo completo leido.';
            try { if (navigator.vibrate) navigator.vibrate(120); } catch {}
            setTimeout(() => {
              if (sessionId === onlinePvp.scanSessionId) stopQrScan();
            }, 120);
            return true;
          }
          return false;
        }
        if (target) target.value = raw;
        if (statusEl) statusEl.innerText = 'Codigo QR leido.';
        try { if (navigator.vibrate) navigator.vibrate(120); } catch {}
        setTimeout(() => {
          if (sessionId === onlinePvp.scanSessionId) stopQrScan();
        }, 120);
        return true;
      };
      const tick = async () => {
        if (!onlinePvp.scanActive || sessionId !== onlinePvp.scanSessionId) return;
        try {
          loops++;
          if (statusEl && loops % 12 === 0) statusEl.innerText = 'Buscando QR...';

          if (detector) {
            const codes = await detector.detect(video);
            if (Array.isArray(codes) && codes[0]?.rawValue) {
              if (consumeRaw(codes[0].rawValue)) return;
            }
          }

          if (ctx && typeof window.jsQR === 'function' && video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const result = window.jsQR(frame.data, canvas.width, canvas.height, { inversionAttempts: 'attemptBoth' });
            if (result && result.data) {
              if (consumeRaw(result.data)) return;
            }
          }
        } catch {}
        setTimeout(tick, 180);
      };
      tick();
    } catch {
      if (sessionId === onlinePvp.scanSessionId) stopQrScan();
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
    onlinePvp.qrChunks = null;
    onlinePvp.qrChunkIndex = 0;
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

  function ensureSignalFileInput() {
    let input = document.getElementById('online-signal-file');
    if (input) return input;
    input = document.createElement('input');
    input.id = 'online-signal-file';
    input.type = 'file';
    input.accept = '.txt,text/plain';
    input.style.display = 'none';
    document.body.appendChild(input);
    return input;
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

  window.pasteOnlineSignal = async function pasteOnlineSignal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      if (!navigator.clipboard?.readText) throw new Error('clipboard');
      const txt = await navigator.clipboard.readText();
      if (txt) el.value = txt.trim();
    } catch {
      alert('No se pudo pegar desde portapapeles.');
    }
  };

  window.shareOnlineSignal = async function shareOnlineSignal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const txt = (el.value || '').trim();
    if (!txt) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'PvP Online Signal', text: txt });
      } else {
        await window.copyOnlineSignal(id);
        alert('No hay share nativo. Codigo copiado al portapapeles.');
      }
    } catch {}
  };

  window.downloadOnlineSignal = function downloadOnlineSignal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const txt = (el.value || '').trim();
    if (!txt) return;
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pvp-signal.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  window.uploadOnlineSignal = function uploadOnlineSignal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const input = ensureSignalFileInput();
    input.onchange = async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      try {
        const txt = await f.text();
        el.value = String(txt || '').trim();
      } catch {
        alert('No se pudo leer el archivo.');
      } finally {
        input.value = '';
      }
    };
    input.click();
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

  window.onlinePvPSwitchCamera = function onlinePvPSwitchCamera() {
    if (!onlinePvp.scanTargetTextareaId) return;
    if (!Array.isArray(onlinePvp.scanCameraOptions) || onlinePvp.scanCameraOptions.length <= 1) {
      alert('No hay otra camara disponible.');
      return;
    }
    onlinePvp.scanCameraIdx = (onlinePvp.scanCameraIdx + 1) % onlinePvp.scanCameraOptions.length;
    startQrScanInto(onlinePvp.scanTargetTextareaId);
  };

  window.onlinePvPApplyCameraSelection = function onlinePvPApplyCameraSelection() {
    if (!onlinePvp.scanTargetTextareaId) return;
    const select = document.getElementById('online-qr-camera-select');
    if (!select) return;
    const idx = Number(select.value);
    if (!Number.isFinite(idx)) return;
    onlinePvp.scanCameraIdx = Math.max(0, Math.min(idx, Math.max(0, (onlinePvp.scanCameraOptions || []).length - 1)));
    startQrScanInto(onlinePvp.scanTargetTextareaId);
  };

  window.onlinePvPQrNext = function onlinePvPQrNext() {
    if (!onlinePvp.qrChunks || onlinePvp.qrChunks.length <= 1) return;
    onlinePvp.qrChunkIndex = (onlinePvp.qrChunkIndex + 1) % onlinePvp.qrChunks.length;
    renderQrChunkPreview();
  };

  window.onlinePvPQrPrev = function onlinePvPQrPrev() {
    if (!onlinePvp.qrChunks || onlinePvp.qrChunks.length <= 1) return;
    onlinePvp.qrChunkIndex = (onlinePvp.qrChunkIndex - 1 + onlinePvp.qrChunks.length) % onlinePvp.qrChunks.length;
    renderQrChunkPreview();
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
